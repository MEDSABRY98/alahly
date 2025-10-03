const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Google Sheets API
  sheetsRead: (args) => ipcRenderer.invoke('sheets:read', args),
  sheetsWrite: (args) => ipcRenderer.invoke('sheets:write', args),
  sheetsAppend: (args) => ipcRenderer.invoke('sheets:append', args),
  
  // PKS specific API
  pksRead: (args) => ipcRenderer.invoke('pks:read', args),
  
  // Utility functions
  isElectron: true,
  platform: process.platform
});

// Also expose a simple check for web environment
if (!window.electronAPI) {
  window.electronAPI = {
    isElectron: false,
    platform: 'web'
  };
}

// Add some debugging
console.log('🔧 Preload script loaded');
console.log('🔧 Platform:', process.platform);
console.log('🔧 Node version:', process.versions.node);
console.log('🔧 Chrome version:', process.versions.chrome);
console.log('🔧 Electron version:', process.versions.electron);
