/* wvw — a desktop app that dances on your workspace.
 * aru · anna rebecca unterholzner · 2026
 *
 * main process: decides *when* a body arrives. the renderer decides *how* it moves.
 */
const { app, BrowserWindow, Tray, Menu, globalShortcut, screen, ipcMain, nativeImage, powerMonitor, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const STYLES = ['ink', 'marey', 'ribbon', 'scribble', 'pixel', 'ascii', 'dust', 'cutout', 'sumi', 'smear'];
const MOODS = ['grounded', 'playful', 'upside', 'expansive'];
const SIZES = { small: 0.17, medium: 0.26, large: 0.38, wild: 0.55 }; // fraction of screen height

const DEFAULTS = {
  running: true,
  minMinutes: 8,
  maxMinutes: 35,
  sessionSeconds: 45, // 0 = until ESC
  styles: Object.fromEntries(STYLES.map((s) => [s, true])),
  moods: Object.fromEntries(MOODS.map((m) => [m, true])),
  size: 'medium',
  chorus: true,
  bursts: true,
  rest: { enabled: true, from: 22, to: 7 },
  openAtLogin: false,
  firstRunDone: false,
};

// ---------- settings ----------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = structuredClone(DEFAULTS);

function merge(base, patch) {
  for (const k of Object.keys(patch || {})) {
    if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && base[k] && typeof base[k] === 'object') merge(base[k], patch[k]);
    else if (k in base) base[k] = patch[k];
  }
  return base;
}
function loadSettings() {
  try { settings = merge(structuredClone(DEFAULTS), JSON.parse(fs.readFileSync(settingsFile(), 'utf8'))); }
  catch { settings = structuredClone(DEFAULTS); }
}
function saveSettings() {
  try { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); }
  catch (e) { console.error('wvw: could not save settings', e); }
}

// ---------- state ----------
let tray = null, settingsWin = null, overlay = null, overlayTimer = null;
let nextAt = 0, pausedUntil = 0, quitting = false;

function isResting(d = new Date()) {
  const r = settings.rest; if (!r.enabled || r.from === r.to) return false;
  const h = d.getHours() + d.getMinutes() / 60;
  return r.from > r.to ? h >= r.from || h < r.to : h >= r.from && h < r.to;
}
function status() {
  return { running: settings.running, nextAt, pausedUntil, dancing: !!overlay, resting: isResting(), now: Date.now() };
}
function broadcast() {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('wvw:status', status());
  refreshTray();
}

// ---------- the rhythm of interruptions ----------
function scheduleNext() {
  const lo = Math.max(1, Math.min(settings.minMinutes, settings.maxMinutes));
  const hi = Math.max(lo, settings.maxMinutes);
  // log-uniform: short gaps feel as likely as long ones
  const minutes = Math.exp(Math.log(lo) + Math.random() * (Math.log(hi) - Math.log(lo)));
  nextAt = Date.now() + minutes * 60_000;
  broadcast();
}
function tick() {
  if (!settings.running || overlay) return;
  if (pausedUntil && Date.now() < pausedUntil) return;
  if (pausedUntil && Date.now() >= pausedUntil) { pausedUntil = 0; scheduleNext(); return; }
  if (Date.now() < nextAt) return;
  let locked = false;
  try { locked = powerMonitor.getSystemIdleState(60) === 'locked'; } catch {}
  if (isResting() || locked) { scheduleNext(); return; }
  startSession();
}

function pick(obj, fallback) {
  const on = Object.keys(obj).filter((k) => obj[k]);
  return on.length ? on : fallback;
}

// ---------- the body arrives ----------
function startSession(opts = {}) {
  if (overlay) return;
  const styles = pick(settings.styles, STYLES);
  const style = opts.style && STYLES.includes(opts.style) ? opts.style : styles[Math.floor(Math.random() * styles.length)];
  const roll = Math.random();
  const figures = settings.chorus && !opts.style ? (roll < 0.08 ? 3 : roll < 0.2 ? 2 : 1) : 1;
  const seconds = settings.sessionSeconds > 0 ? settings.sessionSeconds * (0.8 + Math.random() * 0.4) : 0;

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const b = display.bounds;
  overlay = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    transparent: true, backgroundColor: '#00000000', frame: false, hasShadow: false,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, focusable: false, alwaysOnTop: true, show: false, enableLargerThanScreen: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  overlay.setIgnoreMouseEvents(true);
  overlay.setAlwaysOnTop(true, 'screen-saver');
  try { overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true }); } catch {}
  overlay.setBounds(b);
  const cfg = {
    style, figures, seconds,
    size: Math.round(b.height * (SIZES[settings.size] || SIZES.medium)),
    moods: pick(settings.moods, MOODS),
    bursts: settings.bursts,
  };
  overlay.webContents.once('did-finish-load', () => {
    if (!overlay) return;
    overlay.webContents.send('wvw:start', cfg);
    overlay.showInactive();
  });
  overlay.on('closed', () => { overlay = null; });
  overlay.loadFile(path.join(__dirname, 'src', 'overlay.html'));

  try { globalShortcut.register('Escape', stopSession); } catch {}
  // safety net: never let a body outstay its welcome
  if (seconds > 0) overlayTimer = setTimeout(endSession, (seconds + 12) * 1000);
  broadcast();
}
function stopSession() {
  if (!overlay) return;
  overlay.webContents.send('wvw:stop');
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(endSession, 2500);
}
function endSession() {
  clearTimeout(overlayTimer); overlayTimer = null;
  try { globalShortcut.unregister('Escape'); } catch {}
  if (overlay && !overlay.isDestroyed()) overlay.destroy();
  overlay = null;
  scheduleNext();
}

// ---------- settings window ----------
function openSettings(opts = {}) {
  if (settingsWin && !settingsWin.isDestroyed()) {
    if (opts.minimized) return;
    if (settingsWin.isMinimized()) settingsWin.restore();
    settingsWin.show(); settingsWin.focus(); return;
  }
  settingsWin = new BrowserWindow({
    width: 920, height: 820, minWidth: 640, minHeight: 560,
    title: 'wvw', backgroundColor: '#f9f9f5', show: false, autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  settingsWin.loadFile(path.join(__dirname, 'src', 'settings.html'));
  settingsWin.once('ready-to-show', () => { if (opts.minimized) { settingsWin.showInactive(); settingsWin.minimize(); } else settingsWin.show(); });
  settingsWin.on('closed', () => { settingsWin = null; });
  settingsWin.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  // on windows / linux the X keeps wvw visible in the taskbar (minimized) — quit lives in the tray menu
  settingsWin.on('close', (e) => {
    if (quitting || process.platform === 'darwin') return;
    e.preventDefault();
    settingsWin.minimize();
  });
}

// ---------- mac menu bar (top of screen when wvw is the active app) ----------
function appMenu() {
  return Menu.buildFromTemplate([
    { label: 'wvw', submenu: [
      { role: 'about', label: 'about wvw' },
      { type: 'separator' },
      { label: 'dance now', accelerator: 'CmdOrCtrl+D', click: () => startSession() },
      { label: 'settings…', accelerator: 'CmdOrCtrl+,', click: openSettings },
      { type: 'separator' },
      { role: 'hide', label: 'hide wvw' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit', label: 'quit wvw' },
    ] },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ]);
}

// ---------- tray ----------
function fmtIn(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 1 ? 'any moment now' : m < 60 ? `in ~${m} min` : `in ~${Math.floor(m / 60)} h ${m % 60} min`;
}
function statusLine() {
  if (overlay) return 'dancing — press ESC to reclaim your screen';
  if (!settings.running) return 'interruptions off';
  if (pausedUntil > Date.now()) return `paused until ${new Date(pausedUntil).toTimeString().slice(0, 5)}`;
  if (isResting()) return `resting until ${String(settings.rest.to).padStart(2, '0')}:00`;
  return `next body arrives ${fmtIn(nextAt - Date.now())}`;
}
function trayIcon() {
  const dir = path.join(__dirname, 'assets');
  if (process.platform === 'darwin') {
    const img = nativeImage.createFromPath(path.join(dir, 'trayTemplate.png'));
    img.setTemplateImage(true);
    return img;
  }
  return nativeImage.createFromPath(path.join(dir, 'tray.png'));
}
function refreshTray() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'wvw', enabled: false },
    { label: statusLine(), enabled: false },
    { type: 'separator' },
    overlay
      ? { label: 'reclaim my screen', click: stopSession }
      : { label: 'dance now', click: () => startSession() },
    { label: 'dance now as…', enabled: !overlay, submenu: STYLES.map((s, i) => ({ label: `${String(i + 1).padStart(2, '0')}  ${s}`, click: () => startSession({ style: s }) })) },
    { type: 'separator' },
    { label: 'interruptions on', type: 'checkbox', checked: settings.running, click: (it) => { settings.running = it.checked; saveSettings(); if (it.checked) scheduleNext(); broadcast(); } },
    pausedUntil > Date.now()
      ? { label: 'resume now', click: () => { pausedUntil = 0; scheduleNext(); } }
      : { label: 'pause for an hour', click: () => { pausedUntil = Date.now() + 3600_000; broadcast(); } },
    { label: 'settings…', click: openSettings },
    { type: 'separator' },
    { label: 'aarruu.com', click: () => shell.openExternal('https://aarruu.com') },
    { label: 'quit wvw', role: 'quit' },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(`wvw — ${statusLine()}`);
}

// ---------- ipc ----------
ipcMain.handle('wvw:get', () => ({ settings, status: status(), styles: STYLES, version: app.getVersion() }));
ipcMain.handle('wvw:set', (_e, patch) => {
  const before = JSON.stringify([settings.minMinutes, settings.maxMinutes, settings.running]);
  merge(settings, patch);
  saveSettings();
  if ('openAtLogin' in (patch || {})) { try { app.setLoginItemSettings({ openAtLogin: !!settings.openAtLogin }); } catch {} }
  if (JSON.stringify([settings.minMinutes, settings.maxMinutes, settings.running]) !== before && settings.running) scheduleNext();
  broadcast();
  return { settings, status: status() };
});
ipcMain.handle('wvw:dance', (_e, o) => { startSession(o || {}); return status(); });
ipcMain.handle('wvw:pause', (_e, minutes) => { pausedUntil = minutes > 0 ? Date.now() + minutes * 60_000 : 0; if (!pausedUntil) scheduleNext(); broadcast(); return status(); });
ipcMain.handle('wvw:link', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });
ipcMain.on('wvw:done', () => endSession());

// ---------- life ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openSettings());
  app.whenReady().then(() => {
    loadSettings();
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(appMenu());
      if (app.dock) app.dock.setMenu(Menu.buildFromTemplate([
        { label: 'dance now', click: () => startSession() },
        { label: 'pause for an hour', click: () => { pausedUntil = Date.now() + 3600_000; broadcast(); } },
        { label: 'settings…', click: openSettings },
      ]));
    } else {
      Menu.setApplicationMenu(null);
      // windows / linux: keep a window in the taskbar so wvw is visibly running
      openSettings({ minimized: !!app.getLoginItemSettings().wasOpenedAtLogin || settings.firstRunDone });
    }
    if (process.platform === 'win32') app.setAppUserModelId('com.aarruu.wvw');
    tray = new Tray(trayIcon());
    if (process.platform !== 'darwin') tray.on('click', openSettings);
    scheduleNext();
    setInterval(tick, 5000);
    setInterval(refreshTray, 30_000);
    powerMonitor.on('resume', scheduleNext);
    powerMonitor.on('unlock-screen', scheduleNext);
    if (!settings.firstRunDone) {
      settings.firstRunDone = true; saveSettings();
      openSettings();
      // a first, small hello
      setTimeout(() => startSession({ style: 'ink' }), 4000);
    }
    if (process.env.WVW_DANCE_NOW) setTimeout(() => startSession({ style: process.env.WVW_DANCE_NOW }), 800);
  });
  app.on('window-all-closed', () => { /* stay alive: dock (mac) / tray */ });
  const launchedAt = Date.now();
  app.on('activate', () => { // click on the dock icon
    let atLogin = false;
    try { atLogin = app.getLoginItemSettings().wasOpenedAtLogin; } catch {}
    if (atLogin && Date.now() - launchedAt < 4000) return; // started quietly at login
    openSettings();
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
