import { TorrentResult } from '../types';

export type SortField = 'seeds' | 'size' | 'date';
export type SortOrder = 'asc' | 'desc';

export function sortResults(
  results: TorrentResult[],
  sortBy: SortField = 'seeds',
  order: SortOrder = 'desc'
): TorrentResult[] {
  const sorted = [...results];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'seeds':
        comparison = a.seeds - b.seeds;
        break;
      case 'size':
        comparison = (a.sizeBytes || 0) - (b.sizeBytes || 0);
        break;
      case 'date':
        comparison = (a.date || '').localeCompare(b.date || '');
        break;
      default:
        comparison = a.seeds - b.seeds;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}