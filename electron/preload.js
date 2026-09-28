const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('derstakip', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  scanOldAppData: () => ipcRenderer.invoke('migration:scan'),
  autoBackup: json => ipcRenderer.invoke('backup:auto', json),
  saveBackup: (json, suggestedName) => ipcRenderer.invoke('backup:save', json, suggestedName),
});
