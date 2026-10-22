const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vvw', {
  get: () => ipcRenderer.invoke('vvw:get'),
  set: (patch) => ipcRenderer.invoke('vvw:set', patch),
  dance: (opts) => ipcRenderer.invoke('vvw:dance', opts),
  pause: (minutes) => ipcRenderer.invoke('vvw:pause', minutes),
  link: (url) => ipcRenderer.invoke('vvw:link', url),
  onStatus: (cb) => ipcRenderer.on('vvw:status', (_e, s) => cb(s)),
  onStart: (cb) => ipcRenderer.on('vvw:start', (_e, cfg) => cb(cfg)),
  onStop: (cb) => ipcRenderer.on('vvw:stop', () => cb()),
  done: () => ipcRenderer.send('vvw:done'),
});
