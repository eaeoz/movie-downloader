import axios from 'axios';
import * as cheerio from 'cheerio';
import { TorrentResult, SourceScraper } from '../types';
import { DEFAULT_HEADERS, TIMEOUT } from './httpClient';

export class NyaaScraper implements SourceScraper {
  name = 'Nyaa';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    try {
      const catMap: Record<string, string> = {
        movie: '0_0',
        tv: '0_0',
        anime: '1_2',
        music: '2_0',
        games: '3_0',
        apps: '4_0'
      };
      const cat = category && catMap[category] ? catMap[category] : '0_0';
      const url = `https://nyaa.si/?q=${encodeURIComponent(query)}&c=${cat}`;
      
      const { data } = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: TIMEOUT
      });
      
      const $ = cheerio.load(data);
      const results: TorrentResult[] = [];
      
      $('table tbody tr').each((i, el) => {
        const titleEl = $(el).find('td:nth-child(2) a');
        const title = titleEl.text().trim();
        const link = 'https://nyaa.si' + (titleEl.attr('href') || '');
        const size = $(el).find('td:nth-child(4)').text().trim();
        const seeds = parseInt($(el).find('td:nth-child(6)').text().trim()) || 0;
        const peers = parseInt($(el).find('td:nth-child(7)').text().trim()) || 0;
        
        if (title && title.length > 3) {
          const idMatch = link.match(/\/view\/(\d+)/);
          const torrentUrl = idMatch ? `https://nyaa.si/download/${idMatch[1]}.torrent` : '';
          results.push({
            num: results.length + 1,
            name: title,
            size: size || 'Unknown',
            sizeBytes: this.parseSize(size),
            seeds,
            peers,
            source: 'Nyaa',
            url: link,
            torrentUrl,
            magnet: ''
          });
        }
      });
      
      return results.slice(0, 50);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Nyaa search error: ${message}`);
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
    const match = size.toString().match(/([\d.]+)\s*(GB|MB|TB|KB|GiB|MiB|TiB|KiB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase().replace('I', '');
    const multipliers: Record<string, number> = { 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
    return value * (multipliers[unit] || 1);
  }
}

export default new NyaaScraper();