import axios from 'axios';
import * as cheerio from 'cheerio';
import { TorrentResult, SourceScraper } from '../types';
import { getHeaders, TIMEOUT } from './httpClient';

export class YtsScraper implements SourceScraper {
  name = 'YTS';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    if (category && category.toLowerCase() === 'tv') {
      return [];
    }

    try {
      const url = `https://yts.lt/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=50`;
      const { data } = await axios.get(url, {
        headers: getHeaders(),
        timeout: TIMEOUT
      });

      const results: TorrentResult[] = [];

      if (data.data && data.data.movies) {
        for (const movie of data.data.movies) {
          const quality = movie.torrents?.[0]?.quality || 'Unknown';
          const sizeStr = movie.torrents?.[0]?.size || '0';
          const sizeBytes = this.parseSizeStr(sizeStr);
          results.push({
            num: results.length + 1,
            name: `${movie.title} (${movie.year}) ${quality}`,
            size: this.formatSize(sizeBytes),
            sizeBytes: sizeBytes,
            seeds: movie.torrents?.[0]?.seeds || 0,
            peers: movie.torrents?.[0]?.peers || 0,
            source: 'YTS',
            url: movie.url || '',
            torrentUrl: movie.torrents?.[0]?.url || '',
            magnet: movie.torrents?.[0]?.hash ? `magnet:?xt=urn:btih:${movie.torrents[0].hash}` : '',
            hash: movie.torrents?.[0]?.hash
          });
        }
      }

      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`YTS search error: ${message}`);
      return [];
    }
  }

  async getTorrentUrl(result: TorrentResult): Promise<string> {
    return result.url;
  }

  async getMagnet(result: TorrentResult): Promise<string> {
    return result.magnet || '';
  }

  private parseSizeStr(sizeStr: string): number {
    if (!sizeStr || typeof sizeStr !== 'string') return 0;
    const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|TB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = {
      'KB': 1024,
      'MB': 1024 ** 2,
      'GB': 1024 ** 3,
      'TB': 1024 ** 4
    };
    return value * (multipliers[unit] || 0);
  }

  private formatSize(bytes: number): string {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes === 0) {
      return 'Unknown';
    }
    if (bytes < 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

export default new YtsScraper();