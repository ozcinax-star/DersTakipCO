// Google Drive ile isteğe bağlı veri aktarımı (yükle / çek).
//
// - Giriş: sistem tarayıcısı + 127.0.0.1 geri dönüş adresi + PKCE (Google'ın masaüstü önerisi)
// - İzin: drive.appdata — yalnızca bu uygulamaya ait gizli klasör; kullanıcının diğer dosyalarına erişim yok
// - Anahtarlar: Windows DPAPI (safeStorage) ile şifrelenerek userData'da saklanır
// - Tüm ağ trafiği ana süreçte; arayüz yalnızca IPC ile konuşur
const { app, safeStorage, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'derstakipco-veriler.json';
const MAX_SIMPLE_UPLOAD = 5 * 1024 * 1024;
const CONNECT_TIMEOUT_MS = 5 * 60 * 1000;

// Testlerde sahte sunucuya yönlendirilebilsin diye adresler ortam değişkeniyle değiştirilebilir
const ENDPOINTS = {
  auth: process.env.DERSTAKIP_GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth',
  token: process.env.DERSTAKIP_GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
  revoke: process.env.DERSTAKIP_GOOGLE_REVOKE_URL || 'https://oauth2.googleapis.com/revoke',
  api: process.env.DERSTAKIP_DRIVE_API_URL || 'https://www.googleapis.com/drive/v3',
  upload: process.env.DERSTAKIP_DRIVE_UPLOAD_URL || 'https://www.googleapis.com/upload/drive/v3',
};

class DriveError extends Error {}

const tokenFile = () => path.join(app.getPath('userData'), 'google-drive-token.bin');
const stateFile = () => path.join(app.getPath('userData'), 'google-drive-durum.json');

let memoryToken = null; // Şifreleme yoksa anahtar yalnızca bellekte tutulur
let cachedAccess = null; // { token, expiresAt }
let pendingConnect = null;

function loadConfig() {
  if (process.env.DERSTAKIP_GOOGLE_CLIENT_ID) {
    return { clientId: process.env.DERSTAKIP_GOOGLE_CLIENT_ID, clientSecret: process.env.DERSTAKIP_GOOGLE_CLIENT_SECRET || '' };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'google-oauth.json'), 'utf-8'));
    const c = raw.installed || raw;
    if (c.client_id) return { clientId: c.client_id, clientSecret: c.client_secret || '' };
  } catch {
    // Yapılandırma yoksa özellik kapalıdır
  }
  return null;
}

// ============ ANAHTAR SAKLAMA ============

function saveRefreshToken(refreshToken) {
  memoryToken = refreshToken;
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(tokenFile(), safeStorage.encryptString(refreshToken));
  }
}

function readRefreshToken() {
  if (memoryToken) return memoryToken;
  try {
    if (safeStorage.isEncryptionAvailable() && fs.existsSync(tokenFile())) {
      memoryToken = safeStorage.decryptString(fs.readFileSync(tokenFile()));
      return memoryToken;
    }
  } catch {
    // Başka bir Windows kullanıcısında şifre çözülemez; bağlantı yeniden kurulmalı
  }
  return null;
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf-8'));
  } catch {
    return {};
  }
}

function writeState(patch) {
  const next = { ...readState(), ...patch };
  fs.writeFileSync(stateFile(), JSON.stringify(next, null, 2));
  return next;
}

function clearLocalCredentials() {
  memoryToken = null;
  cachedAccess = null;
  fs.rmSync(tokenFile(), { force: true });
  fs.rmSync(stateFile(), { force: true });
}

// ============ HTTP YARDIMCILARI ============

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new DriveError('Google Drive\'a ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  }
  return res;
}

async function tokenRequest(params) {
  const config = loadConfig();
  const body = new URLSearchParams({ client_id: config.clientId, ...params });
  // Masaüstü istemcilerinde Google PKCE'ye rağmen client_secret bekleyebilir
  if (config.clientSecret) body.set('client_secret', config.clientSecret);
  const res = await request(ENDPOINTS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (json.error === 'invalid_grant') {
      clearLocalCredentials();
      throw new DriveError('Google Drive bağlantısının süresi dolmuş veya iptal edilmiş. Lütfen yeniden bağlanın.');
    }
    throw new DriveError(`Google oturumu açılamadı (${json.error_description || json.error || res.status}).`);
  }
  return json;
}

async function getAccessToken() {
  if (cachedAccess && cachedAccess.expiresAt > Date.now() + 60_000) return cachedAccess.token;
  const refreshToken = readRefreshToken();
  if (!refreshToken) throw new DriveError('Google Drive bağlı değil.');
  const json = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
  cachedAccess = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return cachedAccess.token;
}

async function driveFetch(url, options = {}) {
  const token = await getAccessToken();
  const res = await request(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    cachedAccess = null;
    throw new DriveError('Google Drive oturumu geçersiz. Lütfen bağlantıyı kesip yeniden bağlanın.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DriveError(`Google Drive isteği başarısız oldu (${res.status}). ${text.slice(0, 200)}`);
  }
  return res;
}

// ============ BAĞLANMA (OAuth) ============

const base64url = buf => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const RESULT_PAGE = (title, message) => `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Segoe UI,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
div{background:#fff;padding:32px 40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);text-align:center;max-width:420px}
h1{color:#ea580c;font-size:22px;margin:0 0 8px}p{color:#475569}</style></head>
<body><div><h1>${title}</h1><p>${message}</p></div></body></html>`;

async function connect() {
  const config = loadConfig();
  if (!config) throw new DriveError('Bu sürümde Google Drive yapılandırılmamış.');
  if (pendingConnect) pendingConnect.cancel('Yeni bir bağlantı denemesi başlatıldı.');

  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const { code, redirectUri } = await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      setTimeout(() => server.close(), 500);
      pendingConnect = null;
      fn(value);
    };

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/') {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (error || url.searchParams.get('state') !== state || !url.searchParams.get('code')) {
        res.end(RESULT_PAGE('Bağlantı kurulamadı', 'Google Drive bağlantısı tamamlanamadı. DersTakipCO\'ya dönüp tekrar deneyebilirsiniz.'));
        finish(reject, new DriveError(error === 'access_denied' ? 'Google Drive izni verilmedi.' : 'Google Drive bağlantısı tamamlanamadı.'));
        return;
      }
      res.end(RESULT_PAGE('DersTakipCO bağlandı', 'Google Drive bağlantısı tamamlandı. Bu pencereyi kapatıp uygulamaya dönebilirsiniz.'));
      finish(resolve, { code: url.searchParams.get('code'), redirectUri });
    });

    const timer = setTimeout(() => finish(reject, new DriveError('Google girişi zaman aşımına uğradı. Lütfen tekrar deneyin.')), CONNECT_TIMEOUT_MS);
    pendingConnect = { cancel: msg => finish(reject, new DriveError(msg || 'Bağlantı iptal edildi.')) };

    let redirectUri;
    server.listen(0, '127.0.0.1', async () => {
      redirectUri = `http://127.0.0.1:${server.address().port}`;
      const authUrl = `${ENDPOINTS.auth}?${new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        access_type: 'offline',
        prompt: 'consent',
      })}`;
      try {
        if (process.env.DERSTAKIP_OAUTH_OPEN === 'fetch') {
          // Yalnızca otomatik testler: tarayıcı yerine yönlendirmeyi doğrudan takip et
          await fetch(authUrl);
        } else {
          await shell.openExternal(authUrl);
        }
      } catch {
        finish(reject, new DriveError('Tarayıcı açılamadı.'));
      }
    });
  });

  const json = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier });
  if (!json.refresh_token) throw new DriveError('Google kalıcı erişim izni vermedi. Lütfen tekrar deneyin.');
  saveRefreshToken(json.refresh_token);
  cachedAccess = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };

  let email = null;
  try {
    const about = await (await driveFetch(`${ENDPOINTS.api}/about?fields=user(emailAddress,displayName)`)).json();
    email = about.user?.emailAddress || null;
  } catch {
    // Hesap adresi gösterilemese de bağlantı çalışır
  }
  writeState({ email, connectedAt: new Date().toISOString() });
  return status();
}

function cancelConnect() {
  if (pendingConnect) pendingConnect.cancel('Bağlantı iptal edildi.');
  return true;
}

async function disconnect() {
  const refreshToken = readRefreshToken();
  clearLocalCredentials();
  if (refreshToken) {
    // İzni Google tarafında da geri al; internet yoksa yerel kayıt yine de silinmiş olur
    await request(`${ENDPOINTS.revoke}?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' }).catch(() => undefined);
  }
  return status();
}

function status() {
  const state = readState();
  return {
    configured: !!loadConfig(),
    connected: !!readRefreshToken(),
    persistent: safeStorage.isEncryptionAvailable(),
    email: state.email || null,
    lastUpload: state.lastUpload || null,
    lastDownload: state.lastDownload || null,
  };
}

// ============ YÜKLE / ÇEK ============

async function findRemoteFile() {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const res = await driveFetch(`${ENDPOINTS.api}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=10`);
  const { files = [] } = await res.json();
  return files[0] || null;
}

// json: dbService.exportAll() çıktısı (metin)
async function upload(json) {
  const payload = JSON.parse(json);
  payload.uploadedAt = new Date().toISOString();
  payload.device = os.hostname();
  const body = JSON.stringify(payload);
  if (Buffer.byteLength(body) > MAX_SIMPLE_UPLOAD) {
    throw new DriveError('Verileriniz 5 MB sınırını aşıyor. Lütfen Ayarlar\'dan dosya yedeği alın.');
  }

  const existing = await findRemoteFile();
  if (existing) {
    await driveFetch(`${ENDPOINTS.upload}/files/${existing.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
    });
  } else {
    const boundary = `derstakip${crypto.randomBytes(8).toString('hex')}`;
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' }) +
      `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${body}\r\n--${boundary}--`;
    await driveFetch(`${ENDPOINTS.upload}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
  }

  const summary = {
    uploadedAt: payload.uploadedAt,
    device: payload.device,
    teachers: payload.teachers?.length || 0,
    students: payload.students?.length || 0,
    lessons: payload.lessons?.length || 0,
  };
  writeState({ lastUpload: summary });
  return summary;
}

// Drive'daki kopyayı indirir; yerel veriye yazmak arayüzün işidir (onaydan sonra)
async function download() {
  const file = await findRemoteFile();
  if (!file) return null;
  const res = await driveFetch(`${ENDPOINTS.api}/files/${file.id}?alt=media`);
  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new DriveError('Google Drive\'daki veri dosyası bozuk.');
  }
  if (!Array.isArray(payload.teachers) || !Array.isArray(payload.students) || !Array.isArray(payload.lessons)) {
    throw new DriveError('Google Drive\'daki dosya geçerli bir DersTakipCO verisi değil.');
  }
  return {
    json: text,
    uploadedAt: payload.uploadedAt || file.modifiedTime,
    device: payload.device || null,
    teachers: payload.teachers.length,
    students: payload.students.length,
    lessons: payload.lessons.length,
  };
}

function markDownloaded(summary) {
  writeState({ lastDownload: { ...summary, downloadedAt: new Date().toISOString() } });
  return true;
}

// IPC için: hataları çökme yerine kullanıcıya gösterilecek mesaja çevir
const safe = fn => async (...args) => {
  try {
    return { ok: true, result: await fn(...args) };
  } catch (err) {
    return { ok: false, error: err instanceof DriveError ? err.message : `Beklenmeyen hata: ${err && err.message}` };
  }
};

module.exports = {
  status: safe(async () => status()),
  connect: safe(connect),
  cancelConnect: safe(async () => cancelConnect()),
  disconnect: safe(disconnect),
  upload: safe(upload),
  download: safe(download),
  markDownloaded: safe(async s => markDownloaded(s)),
};
