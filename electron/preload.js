const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('derstakip', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  scanOldAppData: () => ipcRenderer.invoke('migration:scan'),
  autoBackup: json => ipcRenderer.invoke('backup:auto', json),
  saveBackup: (json, suggestedName) => ipcRenderer.invoke('backup:save', json, suggestedName),
  snapshotBackup: (json, label) => ipcRenderer.invoke('backup:snapshot', json, label),
  drive: {
    status: () => ipcRenderer.invoke('drive:status'),
    connect: () => ipcRenderer.invoke('drive:connect'),
    cancel: () => ipcRenderer.invoke('drive:cancel'),
    disconnect: () => ipcRenderer.invoke('drive:disconnect'),
    upload: json => ipcRenderer.invoke('drive:upload', json),
    download: () => ipcRenderer.invoke('drive:download'),
    markDownloaded: summary => ipcRenderer.invoke('drive:markDownloaded', summary),
  },
});
