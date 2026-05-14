import { TorrentResult } from '../types';

export function filterByCategory(results: TorrentResult[], category: string): TorrentResult[] {
  if (!category || category === 'all') {
    return results;
  }
  
  return results.filter(r => {
    const name = r.name.toLowerCase();
    const cat = category.toLowerCase();
    
    if (cat === 'movie') {
      return name.includes('movie') || name.includes('720p') || name.includes('1080p') || 
             name.includes('2160p') || name.includes('bluray') || name.includes('brrip') ||
             name.includes('webrip') || name.includes('web-dl') || name.includes('dvdrip');
    }
    
    if (cat === 'tv') {
      return name.includes('s01') || name.includes('s02') || name.includes('episode') ||
             name.includes('season') || name.includes('tv') || name.includes('hdtv') ||
             name.includes('webrip') || name.includes('web-dl');
    }
    
    return true;
  });
}