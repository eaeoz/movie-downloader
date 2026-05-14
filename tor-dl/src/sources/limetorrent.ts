import axios from 'axios';
import * as cheerio from 'cheerio';
import { TorrentResult, SourceScraper } from '../types';
import { DEFAULT_HEADERS, TIMEOUT } from './httpClient';

export class LimetorrentsScraper implements SourceScraper {
  name = 'Limetorrents';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    try {
      const catMap: Record<string, string> = { movie: 'movies', tv: 'tv', music: 'music', games: 'games', apps: 'applications', anime: 'anime', other: 'other' };
      const catParam = category && catMap[category] ? `${catMap[category]}/` : '';
      const url = `https://limetorrent.store/search/?catname=&q=${encodeURIComponent(query)}`;
      
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://limetorrent.store/'
        },
        timeout: TIMEOUT
      });
      
      const $ = cheerio.load(data);
      const results: TorrentResult[] = [];
      
      $('table.table2 tbody.torsearch tr').each((i, el) => {
        const titleEl = $(el).find('div.tt-name a').last();
        const title = titleEl.text().trim();
        const size = $(el).find('td:nth-child(3)').text().trim();
        const seedsText = $(el).find('td:nth-child(4)').text().trim();
        const seeds = parseInt(seedsText) || 0;
        const peers = parseInt($(el).find('td:nth-child(5)').text().trim()) || 0;
        const link = titleEl.attr('href') || '';
        
        if (title && link && !title.includes('Torrent') && !link.includes('#')) {
          results.push({
            num: results.length + 1,
            name: title,
            size: size || 'Unknown',
            sizeBytes: this.parseSize(size),
            seeds,
            peers,
            source: 'Limetorrents',
            url: link.startsWith('http') ? link : `https://limetorrent.store${link}`,
            magnet: ''
          });
        }
      });
      
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Limetorrents search error: ${message}`);
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

export default new LimetorrentsScraper();