const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { scanOldAppData } = require('./migration');
const drive = require('./googleDrive');

const isDev = process.env.NODE_ENV === 'development';

// Mağaza sürümü %APPDATA%\DersTakipCO klasörünü kullanıyordu. Bağımsız (.exe)
// sürüm aynı klasörü paylaşmamak için kendi klasöründe çalışır. Bu kod ileride
// Mağaza paketi olarak yayınlanırsa mevcut Mağaza verisini kullanmaya devam eder.
// DERSTAKIP_USER_DATA / DERSTAKIP_BACKUP_DIR yalnızca otomatik testler içindir; testlerin
// kurulu uygulamanın verisine, tek örnek kilidine ve Belgeler klasörüne dokunmamasını sağlar.
if (process.env.DERSTAKIP_USER_DATA) {
  app.setPath('userData', process.env.DERSTAKIP_USER_DATA);
} else if (!process.windowsStore) {
  app.setPath('userData', path.join(app.getPath('appData'), 'DersTakipCO-Masaustu'));
}

const MIGRATION_TEMP = path.join(app.getPath('temp'), 'DersTakipCO-aktarim');
const AUTO_BACKUP_DIR = process.env.DERSTAKIP_BACKUP_DIR || path.join(app.getPath('documents'), 'DersTakipCO Yedekler');
const AUTO_BACKUP_KEEP = 30;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: isDev,
    },
    backgroundColor: '#f8fafc',
    show: false,
    title: 'DersTakipCO',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Uygulama içinden dış bağlantı açılırsa varsayılan tarayıcıya yönlendir
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost:3000')) event.preventDefault();
  });

  const menuTemplate = [
    {
      label: 'Dosya',
      submenu: [
        {
          label: 'Yedek Klasörünü Aç',
          click: () => {
            fs.mkdirSync(AUTO_BACKUP_DIR, { recursive: true });
            shell.openPath(AUTO_BACKUP_DIR);
          },
        },
        { type: 'separator' },
        { label: 'Çıkış', accelerator: 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'reload', label: 'Yenile' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
        { type: 'separator' },
        { role: 'zoomin', label: 'Yakınlaştır' },
        { role: 'zoomout', label: 'Uzaklaştır' },
        { role: 'resetzoom', label: 'Yakınlaştırmayı Sıfırla' },
      ],
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'Hakkında',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'DersTakipCO Hakkında',
              message: `DersTakipCO v${app.getVersion()}`,
              detail: 'Özel ders takip uygulaması\n\n© 2025-2026 Çınar Öz\nTüm hakları saklıdır.\n\nDestek: oz.cinar@hotmail.com',
              buttons: ['Tamam'],
            });
          },
        },
      ],
    },
  ];

  if (isDev) {
    menuTemplate.push({
      label: 'Geliştirici',
      submenu: [{ role: 'toggledevtools', label: 'Geliştirici Araçları' }],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============ IPC ============

ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('migration:scan', async () => {
  fs.mkdirSync(MIGRATION_TEMP, { recursive: true });
  return scanOldAppData(MIGRATION_TEMP);
});

ipcMain.handle('backup:auto', async (_event, json) => {
  if (typeof json !== 'string' || json.length === 0) return false;
  fs.mkdirSync(AUTO_BACKUP_DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(AUTO_BACKUP_DIR, `otomatik-yedek-${day}.json`), json, 'utf-8');

  const autoFiles = fs.readdirSync(AUTO_BACKUP_DIR)
    .filter(f => /^otomatik-yedek-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  for (const old of autoFiles.slice(0, Math.max(0, autoFiles.length - AUTO_BACKUP_KEEP))) {
    fs.rmSync(path.join(AUTO_BACKUP_DIR, old), { force: true });
  }
  return true;
});

// Drive'dan çekmeden önce mevcut verinin kopyası (otomatik yedek dönüşümüne girmez)
ipcMain.handle('backup:snapshot', async (_event, json, label) => {
  if (typeof json !== 'string' || json.length === 0) return null;
  fs.mkdirSync(AUTO_BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeLabel = String(label || 'onceki-veriler').replace(/[^a-z0-9-]/gi, '');
  const filePath = path.join(AUTO_BACKUP_DIR, `${safeLabel}-${stamp}.json`);
  fs.writeFileSync(filePath, json, 'utf-8');
  return filePath;
});

ipcMain.handle('drive:status', () => drive.status());
ipcMain.handle('drive:connect', () => drive.connect());
ipcMain.handle('drive:cancel', () => drive.cancelConnect());
ipcMain.handle('drive:disconnect', () => drive.disconnect());
ipcMain.handle('drive:upload', (_event, json) => drive.upload(json));
ipcMain.handle('drive:download', () => drive.download());
ipcMain.handle('drive:markDownloaded', (_event, summary) => drive.markDownloaded(summary));

ipcMain.handle('backup:save', async (_event, json, suggestedName) => {
  // Yalnızca otomatik testler: kaydetme penceresi açmadan verilen yola yaz
  if (process.env.DERSTAKIP_TEST_SAVE_PATH) {
    fs.writeFileSync(process.env.DERSTAKIP_TEST_SAVE_PATH, json, 'utf-8');
    return process.env.DERSTAKIP_TEST_SAVE_PATH;
  }
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Yedeği Kaydet',
    defaultPath: path.join(app.getPath('documents'), suggestedName || 'DersTakipCO-yedek.json'),
    filters: [{ name: 'DersTakipCO Yedek', extensions: ['json'] }],
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, json, 'utf-8');
  return filePath;
});

// ============ UYGULAMA YAŞAM DÖNGÜSÜ ============

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Önceki aktarımlardan kalan geçici kopyaları temizle
    fs.rmSync(MIGRATION_TEMP, { recursive: true, force: true });
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
