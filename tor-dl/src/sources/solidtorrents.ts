import axios from 'axios';
import * as cheerio from 'cheerio';
import { TorrentResult, SourceScraper } from '../types';
import { DEFAULT_HEADERS, TIMEOUT } from './httpClient';

export class SolidTorrentsScraper implements SourceScraper {
  name = 'SolidTorrents';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    try {
      const url = `https://solidtorrents.to/search?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: TIMEOUT
      });
      
      const $ = cheerio.load(data);
      const results: TorrentResult[] = [];
      
      $('div[data-href^="/torrent/"]').each((i, el) => {
        const title = $(el).find('a.torrent-title').text().trim();
        const size = $(el).find('span[data-size]').attr('data-size') || 'Unknown';
        const seeds = parseInt($(el).find('span.seed-count').text().trim()) || 0;
        const peers = parseInt($(el).find('span.leech-count').text().trim()) || 0;
        const link = 'https://solidtorrents.to' + $(el).find('a.torrent-title').attr('href');
        const magnet = $(el).find('a[href^="magnet:"]').attr('href');
        
        if (title) {
          results.push({
            num: results.length + 1,
            name: title,
            size,
            sizeBytes: this.parseSize(size),
            seeds,
            peers,
            source: 'SolidTorrents',
            url: link,
            magnet
          });
        }
      });
      
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`SolidTorrents search error: ${message}`);
      return [];
    }
  }

  async getTorrentUrl(result: TorrentResult): Promise<string> {
    return result.url;
  }

  async getMagnet(result: TorrentResult): Promise<string> {
    return result.magnet || '';
  }

  private parseSize(size: string): number {
    if (!size || size === 'Unknown') return 0;
    const match = size.toString().match(/([\d.]+)\s*(GB|MB|TB|KB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = { 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
    return value * (multipliers[unit] || 1);
  }
}

export default new SolidTorrentsScraper();