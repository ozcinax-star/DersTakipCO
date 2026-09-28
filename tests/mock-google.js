// Google OAuth + Drive v3 (appDataFolder) sahte sunucusu; gerçek API kurallarını sıkıca denetler.
// Kullanım: node tests/mock-google.js  (ortam değişkenleri için docs/GOOGLE_DRIVE_KURULUM.md)
const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.MOCK_PORT || 47123);
const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const CLIENT_SECRET = 'GOCSPX-test-secret';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

const codes = new Map();      // code -> { challenge, redirectUri }
const refreshTokens = new Set();
const accessTokens = new Set();
const files = new Map();      // id -> { name, parents, content, modifiedTime }
const log = [];
const violations = [];

const b64url = buf => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = p => p + crypto.randomBytes(12).toString('hex');
const readBody = req => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const violate = (res, msg) => { violations.push(msg); json(res, 400, { error: 'invalid_request', error_description: msg }); };

function authed(req, res) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!accessTokens.has(t)) { json(res, 401, { error: { code: 401, message: 'Invalid Credentials' } }); return false; }
  return true;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const body = await readBody(req);
  log.push(`${req.method} ${url.pathname}`);

  // ---- OAuth ----
  if (url.pathname === '/auth') {
    const p = url.searchParams;
    if (p.get('client_id') !== CLIENT_ID) return violate(res, 'auth: yanlış client_id');
    if (p.get('scope') !== SCOPE) return violate(res, `auth: beklenmeyen scope ${p.get('scope')}`);
    if (p.get('code_challenge_method') !== 'S256' || !p.get('code_challenge')) return violate(res, 'auth: PKCE yok');
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(p.get('redirect_uri') || '')) return violate(res, 'auth: redirect_uri loopback değil');
    if (!p.get('state')) return violate(res, 'auth: state yok');
    if (p.get('response_type') !== 'code') return violate(res, 'auth: response_type');
    const code = token('code-');
    codes.set(code, { challenge: p.get('code_challenge'), redirectUri: p.get('redirect_uri') });
    res.writeHead(302, { Location: `${p.get('redirect_uri')}/?code=${code}&state=${encodeURIComponent(p.get('state'))}&scope=${encodeURIComponent(SCOPE)}` });
    return res.end();
  }
  if (url.pathname === '/token' && req.method === 'POST') {
    const p = new URLSearchParams(body.toString());
    if (p.get('client_id') !== CLIENT_ID) return violate(res, 'token: yanlış client_id');
    if (p.get('client_secret') !== CLIENT_SECRET) return json(res, 400, { error: 'invalid_request', error_description: 'client_secret is missing.' });
    if (p.get('grant_type') === 'authorization_code') {
      const entry = codes.get(p.get('code'));
      if (!entry) return json(res, 400, { error: 'invalid_grant' });
      codes.delete(p.get('code'));
      if (entry.redirectUri !== p.get('redirect_uri')) return violate(res, 'token: redirect_uri uyuşmuyor');
      const expected = b64url(crypto.createHash('sha256').update(p.get('code_verifier') || '').digest());
      if (expected !== entry.challenge) return violate(res, 'token: PKCE doğrulaması başarısız');
      const at = token('at-'), rt = token('rt-');
      accessTokens.add(at); refreshTokens.add(rt);
      return json(res, 200, { access_token: at, refresh_token: rt, expires_in: 3599, scope: SCOPE, token_type: 'Bearer' });
    }
    if (p.get('grant_type') === 'refresh_token') {
      if (!refreshTokens.has(p.get('refresh_token'))) return json(res, 400, { error: 'invalid_grant' });
      const at = token('at-'); accessTokens.add(at);
      return json(res, 200, { access_token: at, expires_in: 3599, scope: SCOPE, token_type: 'Bearer' });
    }
    return violate(res, 'token: bilinmeyen grant_type');
  }
  if (url.pathname === '/revoke' && req.method === 'POST') {
    refreshTokens.delete(url.searchParams.get('token'));
    return json(res, 200, {});
  }

  // ---- Drive ----
  if (url.pathname === '/drive/v3/about') {
    if (!authed(req, res)) return;
    return json(res, 200, { user: { emailAddress: 'ogretmen.test@gmail.com', displayName: 'Test Öğretmen' } });
  }
  if (url.pathname === '/drive/v3/files' && req.method === 'GET') {
    if (!authed(req, res)) return;
    if (url.searchParams.get('spaces') !== 'appDataFolder') return violate(res, 'list: spaces=appDataFolder yok');
    const m = /name='([^']+)'/.exec(url.searchParams.get('q') || '');
    const list = [...files.entries()].filter(([, f]) => !m || f.name === m[1])
      .map(([id, f]) => ({ id, modifiedTime: f.modifiedTime, size: String(f.content.length) }));
    return json(res, 200, { files: list });
  }
  if (url.pathname === '/upload/drive/v3/files' && req.method === 'POST') {
    if (!authed(req, res)) return;
    if (url.searchParams.get('uploadType') !== 'multipart') return violate(res, 'create: uploadType multipart değil');
    const boundary = /boundary=([^;]+)/.exec(req.headers['content-type'] || '')?.[1];
    if (!boundary) return violate(res, 'create: boundary yok');
    const parts = body.toString('utf-8').split(`--${boundary}`).slice(1, -1).map(p => p.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''));
    const meta = JSON.parse(parts[0]);
    if (!Array.isArray(meta.parents) || meta.parents[0] !== 'appDataFolder') return violate(res, 'create: appDataFolder dışında dosya');
    const id = token('file-');
    files.set(id, { name: meta.name, parents: meta.parents, content: Buffer.from(parts[1], 'utf-8'), modifiedTime: new Date().toISOString() });
    return json(res, 200, { id });
  }
  let m;
  if ((m = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname)) && req.method === 'PATCH') {
    if (!authed(req, res)) return;
    const f = files.get(m[1]);
    if (!f) return json(res, 404, { error: { code: 404 } });
    f.content = body; f.modifiedTime = new Date().toISOString();
    return json(res, 200, { id: m[1] });
  }
  if ((m = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname)) && req.method === 'GET') {
    if (!authed(req, res)) return;
    const f = files.get(m[1]);
    if (!f) return json(res, 404, { error: { code: 404 } });
    if (url.searchParams.get('alt') !== 'media') return violate(res, 'get: alt=media yok');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(f.content);
  }

  // ---- Test yardımcıları ----
  if (url.pathname === '/__state') {
    return json(res, 200, {
      violations, log, refreshTokens: refreshTokens.size,
      files: [...files.entries()].map(([id, f]) => ({ id, name: f.name, parents: f.parents, modifiedTime: f.modifiedTime, content: f.content.toString('utf-8') })),
    });
  }
  json(res, 404, { error: 'not found' });
}).listen(PORT, '127.0.0.1', () => console.log(`MOCK GOOGLE http://127.0.0.1:${PORT}`));
