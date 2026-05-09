const { app, BrowserWindow, shell, ipcMain, dialog, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = 3555;
const isDev = !app.isPackaged;
const USER_DATA_DIR = app.getPath('userData');
const SETTINGS_FILE = path.join(USER_DATA_DIR, 'settings.json');

let mainWindow = null;
let serverProcess = null;

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (_) {}
  return {};
}

function saveSettings(data) {
  const current = loadSettings();
  const merged = { ...current, ...data };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

function getServerPath() {
  if (isDev) {
    return path.join(__dirname, 'server.js');
  }
  return path.join(process.resourcesPath, 'app.asar', 'server.js');
}

function getTorDlPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'tor-dl');
  }
  const bundled = path.join(process.resourcesPath, 'tor-dl');
  if (fs.existsSync(bundled)) return bundled;
  return path.join(__dirname, '..', 'tor-dl');
}

function startServer() {
  return new Promise((resolve, reject) => {
    const settings = loadSettings();
    const serverPath = getServerPath();
    const torDlPath = getTorDlPath();
    const defaultDl = isDev
      ? path.join(__dirname, 'downloads')
      : path.join(USER_DATA_DIR, 'downloads');

    const env = {
      ...process.env,
      PORT: String(PORT),
      DOWNLOAD_PATH: settings.downloadPath || defaultDl,
      TOR_DL_PATH: torDlPath,
      ELECTRON_RUN_AS_NODE: '1'
    };

    if (!fs.existsSync(env.DOWNLOAD_PATH)) {
      fs.mkdirSync(env.DOWNLOAD_PATH, { recursive: true });
    }

    serverProcess = spawn(process.execPath, [serverPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: isDev ? __dirname : process.resourcesPath
    });

    serverProcess.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
    serverProcess.stderr.on('data', (d) => process.stderr.write(`[server:err] ${d}`));
    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Server exited with code ${code}`);
      }
    });

    let attempts = 0;
    const maxAttempts = 30;
    const check = setInterval(() => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
        clearInterval(check);
        resolve();
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          clearInterval(check);
          reject(new Error('Server failed to start'));
        }
      });
      req.setTimeout(1000, () => { req.destroy(); });
    }, 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'data', 'icon.png'),
    backgroundColor: '#0f0f0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (_event, data) => {
  return saveSettings(data);
});

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

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try {
    await startServer();
    createWindow();
  } catch (e) {
    console.error('Failed to start:', e);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
