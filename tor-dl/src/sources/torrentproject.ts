import axios from 'axios';
import * as cheerio from 'cheerio';
import { TorrentResult, SourceScraper } from '../types';
import { DEFAULT_HEADERS, TIMEOUT } from './httpClient';

export class TorrentProjectScraper implements SourceScraper {
  name = 'TorrentProject';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    try {
      const url = `https://torrentproject.site/?s=${encodeURIComponent(query)}&p=1`;
      const { data } = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: TIMEOUT
      });
      
      const $ = cheerio.load(data);
      const results: TorrentResult[] = [];
      
      $('div.torrent_row, div.torrents__torrent').each((i, el) => {
        const title = $(el).find('a.title').text().trim() || $(el).find('a').first().text().trim();
        const size = $(el).find('span.size, div.size').text().trim();
        const seeds = parseInt($(el).find('span.seeders, div.seeds').text().trim()) || 0;
        const peers = parseInt($(el).find('span.leechers, div.leechs').text().trim()) || 0;
        const link = $(el).find('a.title').attr('href') || $(el).find('a').first().attr('href') || '';
        const magnet = $(el).find('a[href^="magnet:"]').attr('href');
        
        if (title && link) {
          results.push({
            num: results.length + 1,
            name: title,
            size: size || 'Unknown',
            sizeBytes: this.parseSize(size),
            seeds,
            peers,
            source: 'TorrentProject',
            url: link.startsWith('http') ? link : `https://torrentproject.site${link}`,
            magnet
          });
        }
      });
      
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`TorrentProject search error: ${message}`);
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
    if (!size) return 0;
    const match = size.toString().match(/([\d.]+)\s*(GB|MB|TB|KB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = { 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
    return value * (multipliers[unit] || 1);
  }
}

export default new TorrentProjectScraper();