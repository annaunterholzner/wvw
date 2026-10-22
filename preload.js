const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wvw', {
  get: () => ipcRenderer.invoke('wvw:get'),
  set: (patch) => ipcRenderer.invoke('wvw:set', patch),
  dance: (opts) => ipcRenderer.invoke('wvw:dance', opts),
  pause: (minutes) => ipcRenderer.invoke('wvw:pause', minutes),
  link: (url) => ipcRenderer.invoke('wvw:link', url),
  onStatus: (cb) => ipcRenderer.on('wvw:status', (_e, s) => cb(s)),
  onStart: (cb) => ipcRenderer.on('wvw:start', (_e, cfg) => cb(cfg)),
  onStop: (cb) => ipcRenderer.on('wvw:stop', () => cb()),
  done: () => ipcRenderer.send('wvw:done'),
});
