import { TorrentResult } from '../types';

export function parseSize(size: string): number {
  if (!size || size === 'Unknown' || size === 'N/A') return 0;
  
  const match = size.toString().match(/([\d.]+)\s*(GB|MB|TB|KB|B)/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 ** 2,
    'GB': 1024 ** 3,
    'TB': 1024 ** 4
  };
  
  return value * (multipliers[unit] || 1);
}

export function filterBySize(
  results: TorrentResult[],
  minSize?: string,
  maxSize?: string
): TorrentResult[] {
  if (!minSize && !maxSize) {
    return results;
  }
  
  const minBytes = minSize ? parseSize(minSize) : 0;
  const maxBytes = maxSize && maxSize !== '0' ? parseSize(maxSize) : Number.MAX_SAFE_INTEGER;
  
  return results.filter(r => {
    const sizeBytes = r.sizeBytes;
    if (typeof sizeBytes !== 'number' || isNaN(sizeBytes)) {
      return true;
    }
    return sizeBytes >= minBytes && sizeBytes <= maxBytes;
  });
}