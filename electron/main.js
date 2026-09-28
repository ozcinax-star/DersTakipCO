const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      devTools: process.env.NODE_ENV === 'development'
    },
    backgroundColor: '#ffffff',
    show: false,
    title: 'DersTakipCO'
  });

  // Production'da dist klasöründen, development'ta dev server'dan yükle
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Menüyü kaldır (opsiyonel, basit görünüm için)
  // Menu.setApplicationMenu(null);

  // Özel menü oluştur
  const menuTemplate = [
    {
      label: 'Dosya',
      submenu: [
        {
          label: 'Çıkış',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'reload', label: 'Yenile' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
        { type: 'separator' },
        { role: 'zoomin', label: 'Yakınlaştır' },
        { role: 'zoomout', label: 'Uzaklaştır' },
        { role: 'resetzoom', label: 'Zoom Sıfırla' }
      ]
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'Hakkında',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'DersTakipCO Hakkında',
              message: 'DersTakipCO v2.1.0',
              detail: 'Özel ders takip uygulaması\n\n© 2025 Çınar Öz\nTüm hakları saklıdır.',
              buttons: ['Tamam']
            });
          }
        }
      ]
    }
  ];

  // Sadece development modunda DevTools menüsü ekle
  if (process.env.NODE_ENV === 'development') {
    menuTemplate.push({
      label: 'Geliştirici',
      submenu: [
        { role: 'toggledevtools', label: 'Geliştirici Araçları' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Uygulama hazır olduğunda pencereyi oluştur
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Tüm pencereler kapatıldığında uygulamayı kapat (macOS hariç)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Tek örnek kontrolü (opsiyonel)
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
}
