import axios from 'axios';
import { TorrentResult, SourceScraper } from '../types';
import { DEFAULT_HEADERS, TIMEOUT } from './httpClient';

const API_URL = 'https://apibay.org/q.php';

const CAT_MAP: Record<string, string> = { movie: '201', tv: '205', music: '102', games: '400', apps: '300' };

export class ThePirateBayScraper implements SourceScraper {
  name = 'ThePirateBay';

  async search(query: string, category?: string): Promise<TorrentResult[]> {
    try {
      const cat = category && CAT_MAP[category] ? CAT_MAP[category] : '0';
      const url = `${API_URL}?q=${encodeURIComponent(query)}&cat=${cat}&limit=100`;
      
      const { data } = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: TIMEOUT
      });
      
      if (!Array.isArray(data)) return [];
      
      const results: TorrentResult[] = data.slice(0, 50).map((item: any) => ({
        num: 0,
        name: item.name,
        size: this.formatSize(parseInt(item.size)),
        sizeBytes: parseInt(item.size),
        seeds: parseInt(item.seeders) || 0,
        peers: parseInt(item.leechers) || 0,
        source: 'ThePirateBay',
        url: `https://thepiratebay.org/torrent/${item.id}`,
        torrentUrl: `magnet:?xt=urn:btih:${item.info_hash}`,
        magnet: `magnet:?xt=urn:btih:${item.info_hash}`,
        hash: item.info_hash
      }));
      
      results.forEach((r, i) => r.num = i + 1);
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`ThePirateBay search error: ${message}`);
      return [];
    }
  }

  async getTorrentUrl(result: TorrentResult): Promise<string> {
    return result.url;
  }

  async getMagnet(result: TorrentResult): Promise<string> {
    return result.magnet || '';
  }

  private formatSize(bytes: number): string {
    const gb = bytes / (1024**3);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024**2);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} B`;
  }
}

export default new ThePirateBayScraper();