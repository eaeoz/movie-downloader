import { TorrentResult } from '../types';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CACHE_FILE = join(tmpdir(), 'tor-dl-cache.json');

function saveCache(results: TorrentResult[]): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(results, null, 2));
  } catch (e) { /* ignore */ }
}

function loadCache(): TorrentResult[] {
  try {
    if (existsSync(CACHE_FILE)) {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return [];
}

let cachedResults: TorrentResult[] = [];

export function cacheResults(results: TorrentResult[]): void {
  cachedResults = results;
  saveCache(results);
}

export function getCachedResults(): TorrentResult[] {
  if (cachedResults.length === 0) {
    cachedResults = loadCache();
  }
  return cachedResults;
}