import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SourcesJSON, SourceConfig, SourceScraper } from '../types';

import thepiratebay from './thepiratebay';
import torrentscsv from './torrentscsv';
import yts from './yts';
import nyaa from './nyaa';
import _1337x from './1337x';
import rargb from './rargb';
import limetorrents from './limetorrent';

const scrapers: Record<string, SourceScraper> = {
  yts,
  thepiratebay,
  nyaa,
  torrentscsv,
  '1337x': _1337x,
  rargb,
  limetorrents
};

function getDataDir(): string {
  return process.env.TOR_DL_DATA_DIR || join(__dirname, '../..');
}

export function loadSourcesConfig(): SourcesJSON {
  const sourcesPath = join(getDataDir(), 'sources.json');
  if (existsSync(sourcesPath)) {
    return JSON.parse(readFileSync(sourcesPath, 'utf-8'));
  }
  return { updateUrl: '', version: '1.0.0', sources: {} };
}

export function getEnabledSources(): SourceScraper[] {
  const config = loadSourcesConfig();
  const enabled: SourceScraper[] = [];
  
  for (const [key, sourceConfig] of Object.entries(config.sources)) {
    if (sourceConfig.enabled && scrapers[key]) {
      enabled.push(scrapers[key]);
    }
  }
  
  if (enabled.length === 0) {
    return Object.values(scrapers);
  }
  
  return enabled;
}

export function getSourceConfig(name: string): SourceConfig | undefined {
  const config = loadSourcesConfig();
  return config.sources[name];
}

export function getUpdateUrl(): string {
  const config = loadSourcesConfig();
  return config.updateUrl;
}

export function getAllScrapers(): Record<string, SourceScraper> {
  return scrapers;
}

export { scrapers };