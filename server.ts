import express from 'express';
import cors from 'cors';
import { execSync, exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { createReadStream } from 'fs';
import { join, resolve, extname } from 'path';
import { tmpdir } from 'os';
import WebTorrent from 'webtorrent';

const app = express();
const PORT = 3555;
const TOR_DL_DIR = join(__dirname, '..', 'tor-dl');
const DOWNLOADS_DIR = join(__dirname, 'downloads');
const CACHE_FILE = join(tmpdir(), 'tor-dl-cache.json');
const WATCHLIST_CACHE = join(TOR_DL_DIR, '.watchlist-cache.json');
const FILTERS_FILE = join(TOR_DL_DIR, 'filters.json');
const SOURCES_FILE = join(TOR_DL_DIR, 'sources.json');
const USERS_FILE = join(TOR_DL_DIR, 'users.json');

if (!existsSync(DOWNLOADS_DIR)) mkdirSync(DOWNLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public')));
app.use('/downloads', express.static(DOWNLOADS_DIR));

const client = new WebTorrent();
const activeDownloads: Record<string, any> = {};

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
    const filters = loadFilters();
    let args = `search "${query}" -l ${filters.limit || 70}`;
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

function loadFilters(): any {
  if (existsSync(FILTERS_FILE)) {
    return JSON.parse(readFileSync(FILTERS_FILE, 'utf-8'));
  }
  return { category: 'all', minSeeds: 0, maxSeeds: 0, minSize: '0', maxSize: '50GB', sortBy: 'seeds', order: 'desc', limit: 70, sources: '' };
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

app.post('/api/download', (req, res) => {
  const { magnet, name } = req.body;
  if (!magnet) return res.status(400).json({ error: 'Magnet URI required' });
  const movieName = name || `movie-${Date.now()}`;
  const safeName = movieName.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100);
  const savePath = join(DOWNLOADS_DIR, safeName);
  if (!existsSync(savePath)) mkdirSync(savePath, { recursive: true });
  const torrent = client.add(magnet, { path: savePath });
  const info = {
    id: torrent.infoHash, name: safeName, path: savePath,
    progress: 0, downloaded: 0, length: 0, speed: 0,
    timeRemaining: 0, status: 'starting', files: [] as any[], magnet, error: ''
  };
  activeDownloads[torrent.infoHash] = info;
  torrent.on('ready', () => {
    info.status = 'downloading';
    info.length = torrent.length;
    info.files = (torrent.files || []).map((f: any) => ({ name: f.name, path: f.path, length: f.length }));
  });
  torrent.on('download', () => {
    info.progress = torrent.progress;
    info.downloaded = torrent.downloaded;
    info.speed = torrent.downloadSpeed;
    info.timeRemaining = torrent.timeRemaining;
  });
  torrent.on('done', () => { info.status = 'completed'; info.progress = 1; });
  torrent.on('error', (err: Error) => { info.status = 'error'; info.error = err.message; });
  res.json({ id: torrent.infoHash, name: safeName });
});

app.get('/api/downloads', (_req, res) => {
  res.json({ active: Object.values(activeDownloads), completed: getDownloadedFiles() });
});

function getDownloadedFiles(dir = DOWNLOADS_DIR): any[] {
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
    const cmd = process.platform === 'win32' ? `explorer "${DOWNLOADS_DIR}"` :
                process.platform === 'darwin' ? `open "${DOWNLOADS_DIR}"` : `xdg-open "${DOWNLOADS_DIR}"`;
    exec(cmd);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/media/*', (req, res) => {
  const fullPath = resolve(DOWNLOADS_DIR, req.params[0] || '');
  if (!fullPath.startsWith(resolve(DOWNLOADS_DIR))) return res.status(403).json({ error: 'Forbidden' });
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

app.listen(PORT, () => console.log(`Movie Downloader running at http://localhost:${PORT}`));
