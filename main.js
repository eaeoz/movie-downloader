const { app, BrowserWindow, shell, ipcMain, dialog, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let serverInstance = null;
let serverReadyResolve = null;
const serverReady = new Promise(resolve => { serverReadyResolve = resolve; });

const PORT = 3555;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAppPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : __dirname;
}

function getUserDataPath() {
  return app.getPath('userData');
}

// ── Settings ──────────────────────────────────────────────────────────────────

function settingsFile() {
  return path.join(getUserDataPath(), 'settings.json');
}

function loadSettings() {
  try {
    const f = settingsFile();
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch (_) {}
  return {};
}

function saveSettings(data) {
  const f = settingsFile();
  const current = loadSettings();
  const merged = { ...current, ...data };
  fs.writeFileSync(f, JSON.stringify(merged, null, 2));
  return merged;
}

// ── Loading / Error UI ────────────────────────────────────────────────────────

const loadingHTML = `data:text/html;charset=utf-8,<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Starting...</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f0f0f;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:20px;padding:24px}
.logo{font-size:22px;font-weight:700;background:linear-gradient(135deg,#6c5ce7,#00cec9);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.spinner{width:40px;height:40px;border:3px solid #2a2a4a;border-top-color:#6c5ce7;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.status{font-size:14px;color:#a0a0b0;text-align:center}
.error{color:#e17055;font-weight:500}
.retry-btn{margin-top:8px;padding:8px 20px;border-radius:8px;border:1px solid #6c5ce7;background:transparent;color:#6c5ce7;cursor:pointer;font-size:13px}
.retry-btn:hover{background:#6c5ce7;color:#fff}
</style></head>
<body>
<div class="logo">&#127916; Movie DL</div>
<div class="spinner" id="spinner"></div>
<div class="status" id="status">Starting server...</div>
</body>
</html>`;

function showLoading(msg) {
  if (!mainWindow) return;
  const html = loadingHTML.replace(
    '<div class="status" id="status">Starting server...</div>',
    `<div class="status" id="status">${msg || 'Starting server...'}</div>`
  );
  mainWindow.loadURL(html).catch(() => {});
}

function showError(msg) {
  if (!mainWindow) return;
  const html = loadingHTML
    .replace(
      '<div class="spinner" id="spinner"></div>',
      '<div class="spinner" id="spinner" style="display:none"></div>'
    )
    .replace(
      '<div class="status" id="status">Starting server...</div>',
      `<div class="status"><span class="error">${msg}</span><br><br><button class="retry-btn" onclick="location.reload()">Retry</button></div>`
    );
  mainWindow.loadURL(html).catch(() => {});
}

// ── Backend (in-process Express server) ──────────────────────────────────────

function startBackend() {
  const appPath = getAppPath();
  const settings = loadSettings();
  const defaultDl = app.isPackaged
    ? path.join(getUserDataPath(), 'downloads')
    : path.join(appPath, 'downloads');

  const torDlPath = (() => {
    if (!app.isPackaged) return path.join(appPath, '..', 'tor-dl');
    const bundled = path.join(process.resourcesPath, 'tor-dl');
    if (fs.existsSync(bundled)) return bundled;
    return path.join(appPath, '..', 'tor-dl');
  })();

  const dlPath = settings.downloadPath || defaultDl;
  if (!fs.existsSync(dlPath)) fs.mkdirSync(dlPath, { recursive: true });

  // Set env vars so server.js picks them up
  process.env.PORT = String(PORT);
  process.env.DOWNLOAD_PATH = dlPath;
  process.env.TOR_DL_PATH = torDlPath;
  process.env.ELECTRON_USERDATA = getUserDataPath();

  try {
    const mod = require('./server');
    serverInstance = mod.server;

    mod.server.on('listening', () => {
      console.log('[main] Server is listening on port', PORT);
      serverReadyResolve();
    });

    mod.server.on('error', (err) => {
      console.error('[main] Server error:', err.message);
      showError('Server error: ' + (err.message || err));
    });

    // If already listening (sync callback case)
    if (mod.server.listening) {
      serverReadyResolve();
    }
  } catch (e) {
    console.error('[main] Failed to start server:', e);
    showError('Failed to start server: ' + (e.message || e));
  }
}

function killServer() {
  if (serverInstance) {
    try {
      serverInstance.close();
      // Also destroy WebTorrent client to release UDP ports
      const { client } = require('./server');
      if (client && client.destroy) client.destroy(() => {});
    } catch (_) {}
    serverInstance = null;
  }
}

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
  Menu.setApplicationMenu(null);
  const appPath = getAppPath();

  const iconPath = path.join(appPath, 'data', 'icon.png');
  const iconExists = fs.existsSync(iconPath);

  mainWindow = new BrowserWindow({
    width:           1400,
    height:          900,
    minWidth:        900,
    minHeight:       600,
    icon:            iconExists ? iconPath : undefined,
    backgroundColor: '#0f0f0f',
    show:            true,
    frame:           true,
    webPreferences: {
      preload:          path.join(appPath, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true
    }
  });

  // Show loading screen immediately
  showLoading('Starting server...');

  // Start server in-process
  startBackend();

  // Wait for server, then load the real app
  serverReady.then(() => {
    if (!mainWindow) return;
    console.log('[main] Loading app URL');
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`).catch(err => {
      console.error('[main] loadURL error:', err.message);
      showError('Failed to connect: ' + err.message);
    });
  });

  // Open external links in the OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('close', e => {
    // On Windows/Linux, minimize to tray instead of quitting
    if (tray && process.platform !== 'darwin') {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Tray ──────────────────────────────────────────────────────────────────────

function createTray(appPath) {
  const iconPath = path.join(appPath, 'data', 'icon.png');
  let trayIcon;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Movie Downloader');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show', click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
        else createWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit', click: () => {
        tray.destroy();
        killServer();
        app.exit(0);
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) mainWindow.focus();
      else mainWindow.show();
    }
  });
}

// ── IPC ───────────────────────────────────────────────────────────────────────

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-path', async (_e, targetPath) => {
  try {
    if (targetPath && fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        shell.openPath(targetPath);
      } else {
        shell.showItemInFolder(targetPath);
      }
    } else if (targetPath) {
      shell.openPath(path.dirname(targetPath));
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('get-settings', () => loadSettings());

ipcMain.handle('save-settings', (_e, data) => {
  const merged = saveSettings(data);
  return merged;
});

ipcMain.handle('is-electron', () => true);

ipcMain.handle('get-port', () => PORT);

// ── App lifecycle ─────────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray(getAppPath());
  });

  app.on('window-all-closed', () => {
    if (process.platform === 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    killServer();
  });

  app.on('activate', () => {
    if (!mainWindow) createWindow();
    else mainWindow.show();
  });
}
