import { TorrentResult } from '../types';

export function filterBySeeds(results: TorrentResult[], minSeeds: number = 0, maxSeeds?: number): TorrentResult[] {
  if (maxSeeds) {
    return results.filter(r => r.seeds >= minSeeds && r.seeds <= maxSeeds);
  }
  return results.filter(r => r.seeds >= minSeeds);
}