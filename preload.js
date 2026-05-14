const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Folder picker dialog
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Open a file/folder path in Explorer / Finder
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),

  // Settings stored in Electron userData
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),

  // Detection
  isElectron: () => ipcRenderer.invoke('is-electron'),

  // Runtime port (in case it changes in the future)
  getPort: () => ipcRenderer.invoke('get-port'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window-maximized-changed', (_e, maximized) => callback(maximized));
  }
});
