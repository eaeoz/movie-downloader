import express from 'express';
import cors from 'cors';
import { execSync, exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, renameSync, rmSync } from 'fs';
import { createReadStream } from 'fs';
import { join, resolve, extname } from 'path';
import { tmpdir } from 'os';
import WebTorrent from 'webtorrent';

const app = express();
const PORT = process.env.PORT || 3555;
const SETTINGS_FILE = process.env.ELECTRON_USERDATA ? join(process.env.ELECTRON_USERDATA, 'settings.json') : join(__dirname, 'settings.json');
const TOR_DL_PROJECT = process.env.TOR_DL_PATH || join(__dirname, '..', 'tor-dl');
const TOR_DL_DIR = process.env.ELECTRON_USERDATA
  ? (() => {
      const d = join(process.env.ELECTRON_USERDATA, 'tor-dl');
      if (!existsSync(d)) mkdirSync(d, { recursive: true });
      return d;
    })()
  : TOR_DL_PROJECT;

function getDownloadsDir(): string {
  const settings = loadSettingsFile();
  return settings.downloadPath || process.env.DOWNLOAD_PATH || join(__dirname, 'downloads');
}

function ensureDownloadsDir(): void {
  const d = getDownloadsDir();
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function getIncompleteDir(): string {
  const d = join(getDownloadsDir(), '_incomplete');
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

function moveToDownloads(info: any): void {
  const dlDir = getDownloadsDir();
  const src = info.path;
  if (!existsSync(src)) return;
  let target = join(dlDir, info.name);
  if (existsSync(target)) {
    target = join(dlDir, `${info.name}_${Date.now()}`);
  }
  try {
    renameSync(src, target);
    info.path = target;
    console.log(`[move] Moved completed download to: ${target}`);
  } catch (e: any) {
    console.error(`[move] Failed to move completed download: ${e.message}`);
  }
}

function loadSettingsFile(): any {
  try {
    if (existsSync(SETTINGS_FILE)) return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch (_) {}
  return {};
}

function saveSettingsFile(data: any): any {
  const current = loadSettingsFile();
  const merged = { ...current, ...data };
  writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

const CONFIG_DIR = process.env.ELECTRON_USERDATA ? join(process.env.ELECTRON_USERDATA, 'config') : TOR_DL_DIR;

if (!existsSync(CONFIG_DIR)) {
  mkdirSync(CONFIG_DIR, { recursive: true });
}

const DOWNLOADS_STATE_FILE = join(CONFIG_DIR, 'downloads-state.json');

function loadDownloadsState(): any[] {
  try {
    if (existsSync(DOWNLOADS_STATE_FILE)) return JSON.parse(readFileSync(DOWNLOADS_STATE_FILE, 'utf-8'));
  } catch (_) {}
  return [];
}

function saveDownloadsState(downloads: any[]): void {
  writeFileSync(DOWNLOADS_STATE_FILE, JSON.stringify(downloads, null, 2));
}

function addToDownloadsState(info: any): void {
  const state = loadDownloadsState();
  const idx = state.findIndex(d => d.id === info.id || (d.path === info.path && !['completed', 'error'].includes(d.status)));
  const entry = { id: info.id, name: info.name, path: info.path, magnet: info.magnet, status: info.status, seeds: info.seeds || 0, peers: info.peers || 0 };
  if (idx >= 0) state[idx] = entry;
  else state.push(entry);
  saveDownloadsState(state);
}

function removeFromDownloadsState(id: string): void {
  saveDownloadsState(loadDownloadsState().filter(d => d.id !== id));
}
function copyDirRecursive(src: string, dst: string): void {
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const dstPath = join(dst, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      writeFileSync(dstPath, readFileSync(srcPath));
    }
  }
}

if (process.env.ELECTRON_USERDATA) {
  console.log('[server] ELECTRON_USERDATA:', process.env.ELECTRON_USERDATA);
  console.log('[server] TOR_DL_PROJECT:', TOR_DL_PROJECT);
  console.log('[server] TOR_DL_DIR:', TOR_DL_DIR);
}

// In Electron mode, migrate config from the original tor-dl project dir
if (process.env.ELECTRON_USERDATA && existsSync(TOR_DL_PROJECT)) {
  try {
    const distSrc = join(TOR_DL_PROJECT, 'dist');
    const distDst = join(TOR_DL_DIR, 'dist');
    const distBinFile = join(TOR_DL_DIR, 'dist', 'bin', 'tor-dl.js');
    if (existsSync(distSrc) && (!existsSync(distDst) || !existsSync(distBinFile))) {
      console.log('[server] Copying dist folder to:', distDst);
      copyDirRecursive(distSrc, distDst);
    }
    console.log('[server] TOR_DL_DIR/dist exists:', existsSync(join(TOR_DL_DIR, 'dist')));
    console.log('[server] TOR_DL_DIR/dist/bin/tor-dl.js exists:', existsSync(distBinFile));
    for (const f of ['users.json', 'filters.json', 'sources.json', '.watchlist-cache.json', 'settings.json']) {
      const src = join(TOR_DL_PROJECT, f);
      if (existsSync(src) && !existsSync(join(TOR_DL_DIR, f))) {
        console.log('[server] Migrating:', f);
        writeFileSync(join(TOR_DL_DIR, f), readFileSync(src));
      }
    }
  } catch (e) {
    console.error('[server] Migration error:', e);
  }
}

const CACHE_FILE = join(tmpdir(), 'tor-dl-cache.json');
const WATCHLIST_CACHE = join(TOR_DL_DIR, '.watchlist-cache.json');
const FILTERS_FILE = join(TOR_DL_DIR, 'filters.json');
const SOURCES_FILE = join(TOR_DL_DIR, 'sources.json');
const USERS_FILE = join(TOR_DL_DIR, 'users.json');

ensureDownloadsDir();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public'), { setHeaders: (res) => { res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); } }));
app.use('/downloads', express.static(getDownloadsDir()));

const client = new WebTorrent({
  dht: {
    bootstrap: [
      'router.bittorrent.com:6881',
      'dht.transmissionbt.com:6881',
      'router.utorrent.com:6881',
      'dht.aelitis.com:6881',
      'dht.libtorrent.org:25401'
    ]
  },
  tracker: true,
  utp: true,
  webSeeds: true,
  maxConns: 55
});
client.on('error', (e: Error) => console.error('[webtorrent] client error:', e.message));
console.log('[server] WebTorrent client created');
const activeDownloads: Record<string, any> = {};
const torrentRefs: Record<string, any> = {};

// Track active HTTP connections so we can force-close them on cleanup
const activeSockets: Set<any> = new Set();

function esc(v: string): string {
  return v.replace(/"/g, '\\"');
}

function torExec(args: string): string {
  const cmd = `node "${join(TOR_DL_PROJECT, 'dist', 'bin', 'tor-dl.js')}" ${args}`;
  console.log('[torExec] script:', join(TOR_DL_PROJECT, 'dist', 'bin', 'tor-dl.js'));
  console.log('[torExec] cwd:', TOR_DL_DIR);
  console.log('[torExec] cmd:', cmd);
  console.log('[torExec] USERS_FILE location:', join(TOR_DL_DIR, 'users.json'));
  console.log('[torExec] USERS_FILE exists:', existsSync(join(TOR_DL_DIR, 'users.json')));
  if (existsSync(join(TOR_DL_DIR, 'users.json'))) {
    try {
      const content = JSON.parse(readFileSync(join(TOR_DL_DIR, 'users.json'), 'utf-8'));
      console.log('[torExec] users.json content:', JSON.stringify(content));
    } catch (e) {
      console.log('[torExec] Failed to read users.json:', e);
    }
  }
  try {
    const output = execSync(cmd, {
      cwd: TOR_DL_DIR,
      env: {
        ...process.env,
        ELECTRON_USERDATA: process.env.ELECTRON_USERDATA || '',
        TOR_DL_PATH: TOR_DL_PROJECT,
        TOR_DL_DATA_DIR: TOR_DL_DIR
      },
      encoding: 'utf-8', timeout: 60000,
      maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('[torExec] output:', output);
    return output;
  } catch (e: any) {
    console.log('[torExec] error:', e.message);
    if (e && e.stdout) {
      console.log('[torExec] error stdout:', e.stdout);
      return e.stdout;
    }
    if (e && e.message) return e.message;
    return '';
  }
}

app.get('/api/watchlist', (_req, res) => {
  try {
    torExec('list');
    if (existsSync(WATCHLIST_CACHE)) {
      return res.json(JSON.parse(readFileSync(WATCHLIST_CACHE, 'utf-8')));
    }
    res.json([]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/watchlist/refresh', (_req, res) => {
  try {
    torExec('list');
    if (existsSync(WATCHLIST_CACHE)) {
      return res.json(JSON.parse(readFileSync(WATCHLIST_CACHE, 'utf-8')));
    }
    res.json([]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/search', (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  try {
    if (existsSync(CACHE_FILE)) {
      try { writeFileSync(CACHE_FILE, JSON.stringify([])); } catch (_) {}
    }
    const filters = loadFilters();
    let args = `search "${esc(query)}" -l ${filters.limit || 70}`;
    if (filters.minSeeds > 0) args += ` -s ${filters.minSeeds}`;
    if (filters.maxSeeds > 0) args += ` --max-seeds ${filters.maxSeeds}`;
    if (filters.minSize && filters.minSize !== '0') args += ` --min-size ${filters.minSize}`;
    if (filters.maxSize) args += ` --max-size ${filters.maxSize}`;
    if (filters.sortBy) args += ` -o ${filters.sortBy}`;
    if (filters.order) args += ` --order ${filters.order}`;
    if (filters.category && filters.category !== 'all') args += ` -c ${filters.category}`;
    if (filters.sources) args += ` -S "${filters.sources}"`;
    torExec(args);
    if (existsSync(CACHE_FILE)) {
      try {
        return res.json(JSON.parse(readFileSync(CACHE_FILE, 'utf-8')));
      } catch (_) {
        console.log('[search] cache parse error, returning empty array');
      }
    }
    res.json([]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sources', (_req, res) => {
  try {
    if (existsSync(SOURCES_FILE)) {
      return res.json(JSON.parse(readFileSync(SOURCES_FILE, 'utf-8')).sources);
    }
    res.json({});
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sources', (req, res) => {
  try {
    const { sources } = req.body;
    if (existsSync(SOURCES_FILE)) {
      const data = JSON.parse(readFileSync(SOURCES_FILE, 'utf-8'));
      for (const [key, val] of Object.entries(sources)) {
        if (data.sources[key]) data.sources[key].enabled = val;
      }
      writeFileSync(SOURCES_FILE, JSON.stringify(data, null, 2));
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/settings', (_req, res) => {
  res.json(loadSettingsFile());
});

app.post('/api/settings', (req, res) => {
  try {
    const { downloadPath, keepIncompleteData } = req.body;
    const toSave: any = {};
    if (downloadPath !== undefined) {
      if (!existsSync(downloadPath)) mkdirSync(downloadPath, { recursive: true });
      toSave.downloadPath = downloadPath;
    }
    if (keepIncompleteData !== undefined) {
      toSave.keepIncompleteData = keepIncompleteData;
    }
    if (Object.keys(toSave).length > 0) {
      saveSettingsFile(toSave);
    }
    res.json({ ok: true, ...toSave });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

function loadFilters(): any {
  if (existsSync(FILTERS_FILE)) {
    return JSON.parse(readFileSync(FILTERS_FILE, 'utf-8'));
  }
  return { category: 'all', minSeeds: 0, maxSeeds: 0, minSize: '0', maxSize: '50GB', sortBy: 'seeds', order: 'desc', limit: 70, sources: '', qualityFilter: '1080p', searchAppend: '' };
}

app.get('/api/filters', (_req, res) => res.json(loadFilters()));

app.post('/api/filters', (req, res) => {
  try {
    const current = loadFilters();
    const merged = { ...current, ...req.body };
    writeFileSync(FILTERS_FILE, JSON.stringify(merged, null, 2));
    res.json(merged);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user', (_req, res) => {
  try {
    if (existsSync(USERS_FILE)) {
      return res.json(JSON.parse(readFileSync(USERS_FILE, 'utf-8')));
    }
    res.json({ letterboxd: { username: '' } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/user', (req, res) => {
  try {
    const { username } = req.body;
    const data = { letterboxd: { username } };
    writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
    try { if (existsSync(WATCHLIST_CACHE)) unlinkSync(WATCHLIST_CACHE); } catch (_) {}
    try { torExec(`setuser "${username}"`); } catch (_) {}
    try { torExec('list'); } catch (_) {}
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.moeking.me:6969/announce',
  'udp://tracker.tryhackx.org:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://tracker1.bt.moack.co.kr:80/announce',
  'udp://p4p.arenabg.com:1337/announce',
  'udp://movies.zsw.ca:6969/announce',
  'udp://uploads.gamecoast.net:6969/announce',
  'https://tracker.nucasis.org:443/announce',
  'http://tracker.opentrackr.org:1337/announce',
  'http://tracker.files.fm:6969/announce',
  'http://tracker.bt4g.com:2095/announce',
  'http://tracker.tritan.gg:8080/announce',
  'http://tracker.monitorit4.me:6969/announce'
];

function ensureTrackers(magnet: string): string {
  // Strip any existing trackers, then add our working list
  const base = magnet.split('&tr=')[0];
  return base + TRACKERS.map(t => '&tr=' + encodeURIComponent(t)).join('');
}

function setupTorrentEvents(torrent: any, info: any, savePath: string, readyTimeout: NodeJS.Timeout): void {
  if (torrent.ready) {
    clearTimeout(readyTimeout);
    info.status = 'downloading';
    info.length = torrent.length;
    info.progress = torrent.progress;
    info.downloaded = torrent.downloaded;
    info.speed = torrent.downloadSpeed;
    info.files = (torrent.files || []).map((f: any) => ({ name: f.name, path: f.path, length: f.length }));
    if (torrent.progress === 1 && torrent.length > 0) {
      const allExist = (torrent.files || []).every((f: any) => existsSync(join(savePath, f.path)));
      if (allExist) info.status = 'completed';
    }
  }

  torrent.on('ready', () => {
    console.log('[download] Event: ready, infoHash:', torrent.infoHash);
    clearTimeout(readyTimeout);
    info.status = 'downloading';
    info.length = torrent.length;
    info.files = (torrent.files || []).map((f: any) => ({ name: f.name, path: f.path, length: f.length }));
    if (torrent.progress === 1 && torrent.length > 0) {
      const allExist = (torrent.files || []).every((f: any) => existsSync(join(savePath, f.path)));
      if (allExist) info.status = 'completed';
    }
    addToDownloadsState(info);
  });

  torrent.on('download', () => {
    if (info.status === 'starting') {
      info.status = 'downloading';
      clearTimeout(readyTimeout);
    }
    info.progress = torrent.progress;
    info.downloaded = torrent.downloaded;
    info.speed = torrent.downloadSpeed;
    info.timeRemaining = torrent.timeRemaining;
  });

  torrent.on('done', () => {
    console.log('[download] Event: done, infoHash:', torrent.infoHash);
    info.status = 'completed'; info.progress = 1; info.length = torrent.length;
    removeFromDownloadsState(info.id);
    moveToDownloads(info);
  });

  torrent.on('error', (err: Error) => {
    console.log('[download] Event: error, infoHash:', torrent.infoHash, 'error:', err.message);
    info.status = 'error'; info.error = err.message; clearTimeout(readyTimeout);
    addToDownloadsState(info);
  });

  torrent.on('warning', (err: Error) => {
    console.log('[download] Event: warning:', err.message);
  });

  torrent.on('infoHash', () => {
    console.log('[download] Event: infoHash:', torrent.infoHash);
  });

  torrent.on('metadata', () => {
    console.log('[download] Event: metadata');
  });
}

app.post('/api/download', (req, res) => {
  const { magnet, name, seeds, peers } = req.body;
  if (!magnet) return res.status(400).json({ error: 'Magnet URI required' });

  const fullMagnet = ensureTrackers(magnet);
  console.log('[download] fullMagnet:', fullMagnet.slice(0, 200) + '...');
  const movieName = name || `movie-${Date.now()}`;
  const safeName = movieName.replace(/[<>:"/\\|?*]/g, '_').trim().slice(0, 100);
  const savePath = join(getIncompleteDir(), safeName);
  if (!existsSync(savePath)) mkdirSync(savePath, { recursive: true });

  // Destroy any existing torrent for this magnet before re-adding
  try {
    const parsed = require('parse-torrent')(fullMagnet);
    if (parsed && parsed.infoHash) {
      const existing = client.torrents.find((t: any) => t.infoHash === parsed.infoHash);
      if (existing) {
        console.log('[download] Removing existing torrent:', parsed.infoHash);
        client.remove(existing);
      }
    }
  } catch (_) {}

  let torrent;
  try {
    torrent = client.add(fullMagnet, { path: savePath, announce: TRACKERS });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
  console.log('[download] Torrent added, infoHash:', torrent.infoHash || 'pending');
  console.log('[download] Torrent ready:', torrent.ready);
  console.log('[download] Torrent trackers:', torrent.announce ? torrent.announce.slice(0, 3) : 'none');

  const id = torrent.infoHash || `dl-${Date.now()}`;
  const info: any = {
    id, name: safeName, path: savePath,
    progress: 0, downloaded: 0, length: 0, speed: 0,
    timeRemaining: 0, status: 'starting', files: [], magnet: fullMagnet,
    error: '', seeds: seeds || 0, peers: peers || 0
  };
  if (activeDownloads[id]) {
    return res.json({ id, name: safeName, exists: true });
  }
  activeDownloads[id] = info;
  torrentRefs[id] = torrent;

  const readyTimeout = setTimeout(() => {
    if (info.status === 'starting') {
      info.status = 'stalled';
      info.error = 'Timed out waiting for torrent metadata';
    }
  }, 180000);

  setupTorrentEvents(torrent, info, savePath, readyTimeout);
  addToDownloadsState(info);

  res.json({ id, name: safeName });
});

app.post('/api/download/cancel', (req, res) => {
  const { id } = req.body;
  if (!id || !activeDownloads[id]) return res.status(404).json({ error: 'Download not found' });
  const info = activeDownloads[id];
  try {
    const torrent = torrentRefs[id];
    if (torrent) {
      client.remove(torrent);
    }
  } catch (_) { /* torrent may already be gone */ }
  // Delete downloaded files from disk (unless keepIncompleteData is set)
  const settings = loadSettingsFile();
  if (!settings.keepIncompleteData) {
    try {
      if (info.path && existsSync(info.path)) {
        deletePath(info.path);
      }
    } catch (_) {}
  }
  delete activeDownloads[id];
  delete torrentRefs[id];
  removeFromDownloadsState(id);
  res.json({ ok: true });
});

function deletePath(targetPath: string): void {
  const stat = statSync(targetPath);
  if (stat.isDirectory()) {
    execSync(`rmdir /s /q "${targetPath}"`, { stdio: 'pipe', timeout: 10000 });
  } else {
    execSync(`del /f /q "${targetPath}"`, { stdio: 'pipe', timeout: 10000 });
  }
}

app.post('/api/library/delete', (req, res) => {
  const { path: targetPath } = req.body;
  if (!targetPath) return res.status(400).json({ error: 'Path required' });
  const fullPath = resolve(targetPath);
  const dlDir = getDownloadsDir();
  if (!fullPath.startsWith(resolve(dlDir))) return res.status(403).json({ error: 'Forbidden' });
  if (!existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });
  try {
    deletePath(fullPath);
    res.json({ ok: true });
  } catch (e: any) {
    // Retry once after a short delay (file handles may still be held)
    try {
      setTimeout(() => {
        try { deletePath(fullPath); } catch (_) {}
      }, 2000);
      res.json({ ok: true, retrying: true });
    } catch (_) {
      res.status(500).json({ error: e.message });
    }
  }
});

app.get('/api/downloads', (_req, res) => {
  res.json({ active: Object.values(activeDownloads), completed: getDownloadedFiles() });
});

function getDownloadedFiles(dir = getDownloadsDir()): any[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter(entry => entry !== '_incomplete').map(entry => {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        return { name: entry, type: 'folder', path: full, size: stat.size, children: getDownloadedFiles(full) };
      }
      const ext = extname(entry).toLowerCase();
      return { name: entry, type: 'file', path: full, size: stat.size, isMedia: ['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext), ext };
    });
  } catch { return []; }
}

app.post('/api/open-download', (_req, res) => {
  try {
    const d = getDownloadsDir();
    const cmd = process.platform === 'win32' ? `explorer "${d}"` :
                process.platform === 'darwin' ? `open "${d}"` : `xdg-open "${d}"`;
    exec(cmd);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/open-magnet', (req, res) => {
  const { magnet } = req.body;
  if (!magnet) return res.status(400).json({ error: 'Magnet required' });
  try {
    const cmd = process.platform === 'win32' ? `start "" "${magnet}"` :
                process.platform === 'darwin' ? `open "${magnet}"` : `xdg-open "${magnet}"`;
    exec(cmd);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/media/*', (req, res) => {
  const dlDir = getDownloadsDir();
  const fullPath = resolve(dlDir, req.params[0] || '');
  if (!fullPath.startsWith(resolve(dlDir))) return res.status(403).json({ error: 'Forbidden' });
  if (!existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });
  const ext = extname(fullPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.webm': 'video/webm',
    '.avi': 'video/x-msvideo', '.mov': 'video/quicktime'
  };
  const contentType = mimeMap[ext] || 'application/octet-stream';
  const stat = statSync(fullPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType
    });
    createReadStream(fullPath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': contentType });
    createReadStream(fullPath).pipe(res);
  }
});

const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));

app.get('/api/version', (_req, res) => {
  res.json({ version: pkg.version });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Movie Downloader running at http://localhost:${PORT}`);
  resumeDownloads();
});
server.on('connection', (socket) => {
  activeSockets.add(socket);
  socket.on('close', () => activeSockets.delete(socket));
});

function resumeDownloads(): void {
  const state = loadDownloadsState();
  if (state.length > 0) {
    console.log(`[resume] Found ${state.length} saved download(s), attempting to resume incomplete ones`);
  }
  // Also scan _incomplete for orphaned folders not in state
  const incompleteDir = getIncompleteDir();
  if (existsSync(incompleteDir)) {
    const orphaned = readdirSync(incompleteDir).filter(e =>
      statSync(join(incompleteDir, e)).isDirectory() && !state.find((s: any) => s.name === e)
    );
    if (orphaned.length > 0) {
      console.log(`[resume] Found ${orphaned.length} orphaned folder(s) in _incomplete, cleaning up`);
      for (const folder of orphaned) {
        try { rmSync(join(incompleteDir, folder), { recursive: true, force: true }); } catch (_) {}
      }
    }
  }
  if (state.length === 0) return;
  for (const entry of state) {
    if (entry.status === 'completed') continue;
    if (!existsSync(entry.path)) {
      console.log(`[resume] Folder missing for "${entry.name}", removing from state`);
      removeFromDownloadsState(entry.id);
      continue;
    }
    try {
      const fullMagnet = ensureTrackers(entry.magnet);
      let parsed: any;
      try { parsed = require('parse-torrent')(fullMagnet); } catch (_) {}
      if (parsed && parsed.infoHash) {
        const existing = client.torrents.find((t: any) => t.infoHash === parsed.infoHash);
        if (existing) client.remove(existing);
      }
      const torrent = client.add(fullMagnet, { path: entry.path, announce: TRACKERS });
      if (!torrent) continue;

      const id = torrent.infoHash || entry.id;
      const info: any = {
        id, name: entry.name, path: entry.path,
        progress: 0, downloaded: 0, length: 0, speed: 0,
        timeRemaining: 0, status: 'starting', files: [], magnet: fullMagnet,
        error: '', seeds: entry.seeds || 0, peers: entry.peers || 0
      };

      if (activeDownloads[id]) continue;
      activeDownloads[id] = info;
      torrentRefs[id] = torrent;

      const readyTimeout = setTimeout(() => {
        if (info.status === 'starting') {
          info.status = 'stalled';
          info.error = 'Timed out waiting for torrent metadata';
        }
      }, 180000);

      setupTorrentEvents(torrent, info, entry.path, readyTimeout);
      console.log(`[resume] Resumed download: "${entry.name}"`);
    } catch (e: any) {
      console.error(`[resume] Failed to resume "${entry.name}":`, e.message);
    }
  }
}

function cleanup(): void {
  // 0. Persist incomplete downloads so they can be resumed on next start
  const incomplete = Object.values(activeDownloads).filter((d: any) => d && d.status !== 'completed');
  if (incomplete.length > 0) {
    for (const d of incomplete) addToDownloadsState(d);
  }

  // 1. Destroy all torrents to release file handles
  const ids = Object.keys(torrentRefs);
  for (const id of ids) {
    try {
      const t = torrentRefs[id];
      if (t && !t.destroyed) t.destroy();
    } catch (_) {}
    delete torrentRefs[id];
    delete activeDownloads[id];
  }

  // 2. Force-close all active HTTP connections (media streams, etc.)
  for (const socket of activeSockets) {
    try { socket.destroy(); } catch (_) {}
  }
  activeSockets.clear();

  // 3. Destroy WebTorrent client (closes DHT, uDP, uTP, tracker connections)
  try {
    if (client && !client.destroyed) client.destroy();
  } catch (_) {}

  // 4. Close Express server
  try { server.close(); } catch (_) {}
}

// On startup, try to clean orphaned node.exe processes from tor-dl
function cleanOrphanedProcesses(): void {
  try {
    const me = process.pid;
    const cmd = `wmic process where "name='node.exe' and processId != ${me}" get processId,commandline /format:csv 2>nul`;
    const out = execSync(cmd, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = out.split('\n').filter(l => l.includes('tor-dl'));
    for (const line of lines) {
      const parts = line.trim().split(',');
      const pid = parseInt(parts[parts.length - 1], 10);
      if (pid && pid !== me) {
        try { execSync(`taskkill /f /pid ${pid}`, { stdio: 'pipe', timeout: 3000 }); } catch (_) {}
      }
    }
  } catch (_) {}
}
cleanOrphanedProcesses();

export { app, server, activeDownloads, torrentRefs, client, cleanup };
