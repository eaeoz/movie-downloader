import axios from 'axios';
import * as cheerio from 'cheerio';
import { TorrentResult, SourceScraper } from '../types';
import { DEFAULT_HEADERS, TIMEOUT } from './httpClient';

const AD_KEYWORDS = ['vpn', 'service', 'banner', 'advertisement', 'sponsored', 'aclib', 'zoneid'];

function isAdContent(title: string): boolean {
  const lower = title.toLowerCase();
  return AD_KEYWORDS.some(keyword => lower.includes(keyword));
}

export class TorLockScraper implements SourceScraper {
  name = 'TorLock';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    try {
      const url = `https://www.torlock.com/all/torrents/${encodeURIComponent(query)}.html`;
      const { data } = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: TIMEOUT
      });
      
      const $ = cheerio.load(data);
      const results: TorrentResult[] = [];
      
      $('table tbody tr').each((i, el) => {
        const title = $(el).find('td:nth-child(2) a').text().trim();
        const size = $(el).find('td:nth-child(3)').text().trim();
        const seeds = parseInt($(el).find('td:nth-child(4)').text().trim()) || 0;
        const peers = parseInt($(el).find('td:nth-child(5)').text().trim()) || 0;
        const link = 'https://www.torlock.com' + ($(el).find('td:nth-child(2) a').attr('href') || '');
        
        if (title && !isAdContent(title)) {
          results.push({
            num: results.length + 1,
            name: title,
            size: size || 'Unknown',
            sizeBytes: this.parseSize(size),
            seeds,
            peers,
            source: 'TorLock',
            url: link,
            magnet: ''
          });
        }
      });
      
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`TorLock search error: ${message}`);
      return [];
    }
  }

  async getTorrentUrl(result: TorrentResult): Promise<string> {
    return result.url;
  }

  async getMagnet(result: TorrentResult): Promise<string> {
    try {
      const { data } = await axios.get(result.url, { headers: DEFAULT_HEADERS, timeout: TIMEOUT });
      const $ = cheerio.load(data);
      return $('a[href^="magnet:"]').attr('href') || '';
    } catch {
      return '';
    }
  }

  private parseSize(size: string): number {
    if (!size) return 0;
    const match = size.toString().match(/([\d.]+)\s*(GB|MB|TB|KB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = { 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
    return value * (multipliers[unit] || 1);
  }
}

export default new TorLockScraper();