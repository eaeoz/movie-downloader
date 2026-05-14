import axios from 'axios';
import * as cheerio from 'cheerio';
import { TorrentResult, SourceScraper } from '../types';
import { DEFAULT_HEADERS, TIMEOUT } from './httpClient';

export class RarBGScraper implements SourceScraper {
  name = 'RarBG';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    try {
      const catMap: Record<string, string> = { movie: '4', tv: '14' };
      const catParam = category && catMap[category] ? `&category=${catMap[category]}` : '';
      const url = `https://rarbg.to/torrents.php?search=${encodeURIComponent(query)}${catParam}`;
      
      const { data } = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: TIMEOUT
      });
      
      const $ = cheerio.load(data);
      const results: TorrentResult[] = [];
      
      $('table.lista2 tr').each((i, el) => {
        const titleEl = $(el).find('td:nth-child(2) a');
        const title = titleEl.text().trim();
        const size = $(el).find('td:nth-child(4)').text().trim();
        const seeds = parseInt($(el).find('td:nth-child(5)').text().trim()) || 0;
        const peers = parseInt($(el).find('td:nth-child(6)').text().trim()) || 0;
        const link = 'https://rarbg.to' + (titleEl.attr('href') || '');
        
        if (title && !title.includes('imdb') && !title.includes('tvcache')) {
          results.push({
            num: results.length + 1,
            name: title,
            size: size || 'Unknown',
            sizeBytes: this.parseSize(size),
            seeds,
            peers,
            source: 'RarBG',
            url: link,
            magnet: ''
          });
        }
      });
      
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`RarBG search error: ${message}`);
      return [];
    }
  }

  async getTorrentUrl(result: TorrentResult): Promise<string> {
    try {
      const { data } = await axios.get(result.url, { headers: DEFAULT_HEADERS, timeout: TIMEOUT });
      const $ = cheerio.load(data);
      const torrentUrl = $('a[href$=".torrent"]').attr('href');
      return torrentUrl || '';
    } catch {
      return '';
    }
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

export default new RarBGScraper();