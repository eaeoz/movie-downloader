export interface TorrentResult {
  num: number;
  name: string;
  size: string;
  sizeBytes: number;
  seeds: number;
  peers: number;
  source: string;
  url: string;
  magnet?: string;
  hash?: string;
  category?: string;
  date?: string;
  torrentUrl?: string;
}

export interface SourceConfig {
  enabled: boolean;
  name: string;
  baseUrl: string;
  searchUrl: string;
  categories: string[];
  searchParam: string;
  hasMagnet: boolean;
}

export interface SourcesJSON {
  updateUrl: string;
  version: string;
  sources: Record<string, SourceConfig>;
}

export interface FilterConfig {
  category: string;
  sources?: string;
  minSeeds: number;
  maxSeeds?: number;
  minSize: string;
  maxSize: string;
  sortBy: 'seeds' | 'size' | 'date';
  order: 'asc' | 'desc';
  limit: number;
}

export interface SearchOptions {
  query: string;
  category?: string;
  minSeeds?: number;
  maxSeeds?: number;
  minSize?: string;
  maxSize?: string;
  sortBy?: 'seeds' | 'size' | 'date';
  order?: 'asc' | 'desc';
  limit?: number;
  sources?: string[];
}

export interface DownloadOptions {
  torrentUrl?: string;
  magnet?: string;
  savePath?: string;
}

export interface SourceScraper {
  name: string;
  search(query: string, category?: string): Promise<TorrentResult[]>;
  getTorrentUrl(result: TorrentResult): Promise<string>;
  getMagnet(result: TorrentResult): Promise<string>;
}