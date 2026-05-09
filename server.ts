import express from 'express';
import cors from 'cors';
import { execSync, exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { createReadStream } from 'fs';
import { join, resolve, extname } from 'path';
import { tmpdir } from 'os';
import WebTorrent from 'webtorrent';

const app = express();
const PORT = process.env.PORT || 3555;
const SETTINGS_FILE = process.env.ELECTRON_USERDATA ? join(process.env.ELECTRON_USERDATA, 'settings.json') : join(__dirname, 'settings.json');
const TOR_DL_DIR = process.env.TOR_DL_PATH || join(__dirname, '..', 'tor-dl');

function getDownloadsDir(): string {
  const settings = loadSettingsFile();
  return settings.downloadPath || process.env.DOWNLOAD_PATH || join(__dirname, 'downloads');
}

function ensureDownloadsDir(): void {
  const d = getDownloadsDir();
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
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

const CACHE_FILE = join(tmpdir(), 'tor-dl-cache.json');
const WATCHLIST_CACHE = join(TOR_DL_DIR, '.watchlist-cache.json');
const FILTERS_FILE = join(TOR_DL_DIR, 'filters.json');
const SOURCES_FILE = join(TOR_DL_DIR, 'sources.json');
const USERS_FILE = join(TOR_DL_DIR, 'users.json');

ensureDownloadsDir();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public')));
app.use('/downloads', express.static(getDownloadsDir()));

const client = new WebTorrent();
const activeDownloads: Record<string, any> = {};
const torrentRefs: Record<string, any> = {};

function esc(v: string): string {
  return v.replace(/"/g, '\\"');
}

function torExec(args: string): string {
  const cmd = `node "${join(TOR_DL_DIR, 'dist', 'bin', 'tor-dl.js')}" ${args}`;
  try {
    return execSync(cmd, {
      cwd: TOR_DL_DIR, encoding: 'utf-8', timeout: 60000,
      maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e: any) {
    if (e && e.stdout) return e.stdout;
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
      return res.json(JSON.parse(readFileSync(CACHE_FILE, 'utf-8')));
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
    const { downloadPath } = req.body;
    if (downloadPath) {
      if (!existsSync(downloadPath)) mkdirSync(downloadPath, { recursive: true });
      saveSettingsFile({ downloadPath });
      const downloadsDir = getDownloadsDir();
      res.json({ ok: true, downloadPath });
    } else {
      res.status(400).json({ error: 'downloadPath required' });
    }
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
    writeFileSync(USERS_FILE, JSON.stringify({ letterboxd: { username } }, null, 2));
    torExec(`setuser "${username}"`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const TRACKERS = [
  'udp://tracker.coppersurfer.tk:6969',
  'udp://tracker.leechers-paradise.org:6969',
  'udp://tracker.opentrackr.org:1337',
  'udp://tracker.open-internet.nl:6969',
  'udp://tracker.internetwarriors.net:1337',
  'udp://tracker.cyberia.is:6969',
  'udp://explodie.org:6969',
  'udp://tracker.tiny-vps.com:6969',
  'udp://tracker.moeking.me:6969',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.io'
];

function ensureTrackers(magnet: string): string {
  if (magnet.includes('&tr=')) return magnet;
  return magnet + TRACKERS.map(t => '&tr=' + encodeURIComponent(t)).join('');
}

app.post('/api/download', (req, res) => {
  const { magnet, name, seeds, peers } = req.body;
  if (!magnet) return res.status(400).json({ error: 'Magnet URI required' });

  const fullMagnet = ensureTrackers(magnet);
  const movieName = name || `movie-${Date.now()}`;
  const safeName = movieName.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100);
  const savePath = join(getDownloadsDir(), safeName);
  if (!existsSync(savePath)) mkdirSync(savePath, { recursive: true });

  let torrent;
  try {
    torrent = client.add(fullMagnet, { path: savePath });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }

  const id = torrent.infoHash || `dl-${Date.now()}`;
  const info: any = {
    id, name: safeName, path: savePath,
    progress: 0, downloaded: 0, length: 0, speed: 0,
    timeRemaining: 0, status: 'starting', files: [], magnet: fullMagnet,
    error: '', seeds: seeds || 0, peers: peers || 0
  };
  activeDownloads[id] = info;
  torrentRefs[id] = torrent;

  const readyTimeout = setTimeout(() => {
    if (info.status === 'starting') {
      info.status = 'stalled';
      info.error = 'Timed out waiting for torrent metadata';
    }
  }, 180000);

  torrent.on('ready', () => {
    clearTimeout(readyTimeout);
    info.status = 'downloading';
    info.length = torrent.length;
    info.files = (torrent.files || []).map((f: any) => ({ name: f.name, path: f.path, length: f.length }));
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

  torrent.on('done', () => { info.status = 'completed'; info.progress = 1; info.length = torrent.length; });
  torrent.on('error', (err: Error) => { info.status = 'error'; info.error = err.message; clearTimeout(readyTimeout); });

  res.json({ id, name: safeName });
});

app.post('/api/download/cancel', (req, res) => {
  const { id } = req.body;
  if (!id || !activeDownloads[id]) return res.status(404).json({ error: 'Download not found' });
  try {
    client.remove(torrentRefs[id] || id);
  } catch (_) { /* torrent may already be gone */ }
  delete activeDownloads[id];
  delete torrentRefs[id];
  res.json({ ok: true });
});

app.post('/api/library/delete', (req, res) => {
  const { path: targetPath } = req.body;
  if (!targetPath) return res.status(400).json({ error: 'Path required' });
  const fullPath = resolve(targetPath);
  const dlDir = getDownloadsDir();
  if (!fullPath.startsWith(resolve(dlDir))) return res.status(403).json({ error: 'Forbidden' });
  if (!existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });
  try {
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      execSync(`rmdir /s /q "${fullPath}"`, { stdio: 'pipe' });
    } else {
      execSync(`del /f /q "${fullPath}"`, { stdio: 'pipe' });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/downloads', (_req, res) => {
  res.json({ active: Object.values(activeDownloads), completed: getDownloadedFiles() });
});

function getDownloadedFiles(dir = getDownloadsDir()): any[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).map(entry => {
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

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`Movie Downloader running at http://localhost:${PORT}`));
