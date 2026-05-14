import axios from 'axios';
import * as cheerio from 'cheerio';
import { TorrentResult, SourceScraper } from '../types';
import { DEFAULT_HEADERS, TIMEOUT } from './httpClient';

export class EZTvScraper implements SourceScraper {
  name = 'EZTV';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    try {
      const url = `https://eztv.io/search/${encodeURIComponent(query)}`;
      const { data } = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: TIMEOUT
      });
      
      const $ = cheerio.load(data);
      const results: TorrentResult[] = [];
      
      $('tr.forum_topic_border, tr.forum_topic').each((i, el) => {
        const title = $(el).find('td.forum_topic_header a').text().trim() || 
                      $(el).find('td:nth-child(2) a').text().trim();
        const size = $(el).find('td:nth-child(4)').text().trim();
        const seeds = parseInt($(el).find('td:nth-child(5)').text().trim()) || 0;
        const peers = parseInt($(el).find('td:nth-child(6)').text().trim()) || 0;
        const url = 'https://eztv.io' + ($(el).find('td:nth-child(2) a').attr('href') || '');
        const magnet = $(el).find('a[href^="magnet:"]').attr('href');
        
        if (title) {
          results.push({
            num: results.length + 1,
            name: title,
            size: size || 'Unknown',
            sizeBytes: this.parseSize(size),
            seeds,
            peers,
            source: 'EZTV',
            url,
            magnet
          });
        }
      });
      
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`EZTV search error: ${message}`);
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
    const match = size.match(/([\d.]+)\s*(GB|MB|TB|KB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = { 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
    return value * (multipliers[unit] || 1);
  }
}

export default new EZTvScraper();