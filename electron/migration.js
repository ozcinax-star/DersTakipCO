// Eski DersTakipCO (Microsoft Store v2.x) verilerini bulur ve okur.
//
// Eski uygulama verilerini Chromium localStorage'ında (LevelDB) tutuyordu.
// Klasörü geçici bir yere kopyalayıp o kopyayı ayrı bir Electron oturumunda
// açıyoruz; böylece LevelDB formatını Chromium'un kendisi okuyor ve eski
// uygulamanın dosyalarına hiç yazılmıyor.
const { BrowserWindow, session } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const STORE_PACKAGE_PREFIX = 'TEGAY.DersTakipCO_';
const OLD_APP_DIR_NAMES = ['DersTakipCO', 'derstakipco'];
const DATA_KEY_PREFIX = 'derstakipco_';

function listLevelDbCandidates() {
  const candidates = [];
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const roamingAppData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');

  // 1) Mağaza (MSIX) sürümü: AppData yazımları paket klasörüne yönlendirilir
  const packagesDir = path.join(localAppData, 'Packages');
  try {
    for (const entry of fs.readdirSync(packagesDir)) {
      if (!entry.startsWith(STORE_PACKAGE_PREFIX)) continue;
      for (const name of OLD_APP_DIR_NAMES) {
        candidates.push({
          source: `Microsoft Store sürümü (${entry})`,
          dir: path.join(packagesDir, entry, 'LocalCache', 'Roaming', name, 'Local Storage', 'leveldb'),
        });
      }
    }
  } catch {
    // Packages klasörü okunamazsa diğer konumlara bakmaya devam et
  }

  // 2) Klasör önceden varsa MSIX gerçek AppData'ya yazar; ayrıca eski .exe kurulumları
  for (const name of OLD_APP_DIR_NAMES) {
    candidates.push({
      source: 'Eski masaüstü sürümü',
      dir: path.join(roamingAppData, name, 'Local Storage', 'leveldb'),
    });
  }

  const seen = new Set();
  return candidates.filter(c => {
    const key = c.dir.toLowerCase();
    if (seen.has(key) || !fs.existsSync(c.dir)) return false;
    seen.add(key);
    return true;
  });
}

function copyLevelDb(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  let newest = 0;
  for (const file of fs.readdirSync(srcDir)) {
    // LOCK dosyası eski uygulama açıkken kilitlidir ve içerik taşımaz
    if (file === 'LOCK') continue;
    const src = path.join(srcDir, file);
    const stat = fs.statSync(src);
    if (!stat.isFile()) continue;
    fs.copyFileSync(src, path.join(destDir, file));
    newest = Math.max(newest, stat.mtimeMs);
  }
  return newest;
}

async function readLocalStorageFromCopy(partitionDir) {
  const ses = session.fromPath(partitionDir);
  const pagePath = path.join(partitionDir, 'okuyucu.html');
  fs.writeFileSync(pagePath, '<!DOCTYPE html><html><body></body></html>');

  const win = new BrowserWindow({
    show: false,
    webPreferences: { session: ses, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    // Eski uygulama da file:// kaynağından çalıştığı için aynı localStorage alanını görürüz
    await win.loadFile(pagePath);
    return await win.webContents.executeJavaScript(`(() => {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(${JSON.stringify(DATA_KEY_PREFIX)})) out[k] = localStorage.getItem(k);
      }
      return out;
    })()`);
  } finally {
    win.destroy();
    await ses.flushStorageData?.();
  }
}

function summarize(raw) {
  const count = key => {
    try {
      const v = JSON.parse(raw[key] || '[]');
      return Array.isArray(v) ? v.length : 0;
    } catch {
      return 0;
    }
  };
  return {
    teachers: count('derstakipco_teachers'),
    students: count('derstakipco_students'),
    lessons: count('derstakipco_lessons'),
    groups: count('derstakipco_groups'),
  };
}

async function scanOldAppData(tempRoot) {
  const results = [];
  const candidates = listLevelDbCandidates();
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const partitionDir = path.join(tempRoot, `eski-veri-${Date.now()}-${i}`);
    try {
      const lastModified = copyLevelDb(c.dir, path.join(partitionDir, 'Local Storage', 'leveldb'));
      const raw = await readLocalStorageFromCopy(partitionDir);
      const counts = summarize(raw);
      if (counts.teachers > 0 || counts.students > 0 || counts.lessons > 0) {
        results.push({ source: c.source, path: c.dir, lastModified, counts, data: raw });
      }
    } catch (err) {
      results.push({ source: c.source, path: c.dir, error: String(err && err.message || err) });
    }
  }
  // En çok dersi olan, eşitlikte en yeni olan kaynak önce gelir
  results.sort((a, b) =>
    ((b.counts?.lessons || 0) - (a.counts?.lessons || 0)) || ((b.lastModified || 0) - (a.lastModified || 0)));
  return results;
}

module.exports = { scanOldAppData, listLevelDbCandidates };
