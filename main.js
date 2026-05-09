const { app, BrowserWindow, shell, ipcMain, dialog, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

const PORT = 3555;

function getAppPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }
  return __dirname;
}

function startServer(appPath) {
  const serverPath = path.join(appPath, 'server.js');
  const settings = loadSettings();
  const defaultDl = app.isPackaged
    ? path.join(app.getPath('userData'), 'downloads')
    : path.join(appPath, 'downloads');

  const torDlPath = (() => {
    if (!app.isPackaged) return path.join(appPath, '..', 'tor-dl');
    const bundled = path.join(process.resourcesPath, 'tor-dl');
    if (fs.existsSync(bundled)) return bundled;
    return path.join(appPath, '..', 'tor-dl');
  })();

  if (!fs.existsSync(settings.downloadPath || defaultDl)) {
    fs.mkdirSync(settings.downloadPath || defaultDl, { recursive: true });
  }

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: appPath,
    env: {
      ...process.env,
      PORT: String(PORT),
      DOWNLOAD_PATH: settings.downloadPath || defaultDl,
      TOR_DL_PATH: torDlPath,
      ELECTRON_RUN_AS_NODE: '1',
      ELECTRON_USERDATA: app.getPath('userData')
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (d) => console.log('[server]', d.toString().trim()));
  serverProcess.stderr.on('data', (d) => console.error('[server:err]', d.toString().trim()));
  serverProcess.on('error', (err) => console.error('Failed to start server:', err));
  serverProcess.on('exit', (code) => console.log('Server exited with code:', code));
}

function loadWithRetry(win, url, maxAttempts = 30, interval = 500) {
  let attempts = 0;
  const tryLoad = () => {
    attempts++;
    win.loadURL(url).catch(() => {
      if (attempts < maxAttempts) {
        setTimeout(tryLoad, interval);
      }
    });
  };
  setTimeout(tryLoad, interval);
}

function createWindow() {
  Menu.setApplicationMenu(null);
  const appPath = getAppPath();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(appPath, 'data', 'icon.png'),
    backgroundColor: '#0f0f0f',
    show: false,
    webPreferences: {
      preload: path.join(appPath, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  startServer(appPath);
  loadWithRetry(mainWindow, `http://127.0.0.1:${PORT}`);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    if (serverProcess && !serverProcess.killed) serverProcess.kill();
    mainWindow = null;
  });
}

function loadSettings() {
  try {
    const f = path.join(app.isPackaged ? app.getPath('userData') : __dirname, 'settings.json');
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch (_) {}
  return {};
}

function saveSettings(data) {
  const f = path.join(app.isPackaged ? app.getPath('userData') : __dirname, 'settings.json');
  const current = loadSettings();
  const merged = { ...current, ...data };
  fs.writeFileSync(f, JSON.stringify(merged, null, 2));
  return merged;
}

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-settings', (_e, data) => saveSettings(data));
ipcMain.handle('is-electron', () => true);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
