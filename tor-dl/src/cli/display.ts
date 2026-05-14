import chalk from 'chalk';
import { TorrentResult } from '../types';

(chalk as any).level = 1;

function isWideChar(code: number): boolean {
  if (code > 0xFFFF) return true;
  if (code > 255) return true;
  if (code >= 0x1100 && code <= 0x115F) return true;
  if (code >= 0x2329 && code <= 0x232A) return true;
  if (code >= 0x2E80 && code <= 0x303E) return true;
  if (code >= 0x3040 && code <= 0xA4CF) return true;
  if (code >= 0xAC00 && code <= 0xD7A3) return true;
  if (code >= 0xF900 && code <= 0xFAFF) return true;
  if (code >= 0xFE10 && code <= 0xFE19) return true;
  if (code >= 0xFE30 && code <= 0xFE6F) return true;
  if (code >= 0xFF00 && code <= 0xFF60) return true;
  if (code >= 0xFFE0 && code <= 0xFFE6) return true;
  return false;
}

function displayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const cp = char.codePointAt(0)!;
    width += isWideChar(cp) ? 2 : 1;
  }
  return width;
}

function truncateWide(str: string, maxWidth: number): string {
  let width = 0;
  let result = '';
  for (const char of str) {
    const cp = char.codePointAt(0)!;
    const charWidth = isWideChar(cp) ? 2 : 1;
    if (width + charWidth > maxWidth - 3) break;
    result += char;
    width += charWidth;
  }
  return result + '...';
}

function padEndWide(str: string, targetWidth: number): string {
  const currentWidth = displayWidth(str);
  const padding = targetWidth - currentWidth;
  if (padding <= 0) return str;
  return str + ' '.repeat(padding);
}

function padEndWideExtra(str: string, targetWidth: number): string {
  const currentWidth = displayWidth(str);
  const padding = targetWidth - currentWidth;
  if (padding < 0) {
    if ([...str].some(c => c.codePointAt(0)! > 255)) {
      return str + '     ';
    }
    return str;
  }
  return str + ' '.repeat(padding);
}

function makeClickable(url: string, text: string): string {
  return `\u001b]8;;${url}\u0007${text}\u001b]8;;\u0007`;
}

export function displayResults(results: TorrentResult[]): void {
  if (results.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  const out = (s: string) => process.stdout.write(s + '\n');

  out('\n' + [
    '┌─────┬───┬──────────────────────────────────────────────────────────────────────────────────┬────────┬───────┬───────┬────────┐',
    '│ Num │ L │ Name                                                                             │ Size   │ Seeds │ Leech │ Source │',
    '├─────┼───┼──────────────────────────────────────────────────────────────────────────────────┼────────┼───────┼───────┼────────┤'
  ].join('\n'));

  for (const r of results) {
    const name = displayWidth(r.name) > 80 ? truncateWide(r.name, 80) : r.name;
    const size = r.size ? r.size.slice(0, 6).padEnd(6) : 'N/A   ';
    const seeds = r.seeds > 100 ? chalk.green(r.seeds.toString().padStart(5)) : r.seeds > 50 ? chalk.yellow(r.seeds.toString().padStart(5)) : r.seeds.toString().padStart(5);
    const peers = r.peers > 50 ? chalk.cyan(r.peers.toString().padStart(5)) : r.peers.toString().padStart(5);
    const source = (r.source || 'unknown').slice(0, 6).padEnd(6);
    const num = chalk.cyan(r.num.toString().padStart(3));
    
    const clickableUrl = r.torrentUrl || r.magnet || r.url || '';
    const pageUrl = r.url || '';
    
    const clickableName = clickableUrl ? makeClickable(clickableUrl, padEndWideExtra(name, 80)) : padEndWideExtra(name, 80);
    const clickableLink = pageUrl ? makeClickable(pageUrl, chalk.green('✓')) : chalk.gray(' ');

    out(`│ ${num} │ ${clickableLink} │ ${clickableName} │ ${size} │ ${seeds} │ ${peers} │ ${source} │`);
  }

  out('├─────┼───┼──────────────────────────────────────────────────────────────────────────────────┼────────┼───────┼───────┼────────┤');
  out('└─────┴───┴──────────────────────────────────────────────────────────────────────────────────┴────────┴───────┴───────┴────────┘');
  out('');
  out(chalk.gray('Click name = open magnet/torrent (or page if no magnet) | Click ✓ = open source page'));
}

export function displayResultDetails(result: TorrentResult): void {
  console.log(chalk.bold('\n--- Torrent Details ---'));
  console.log(chalk.white('Name:    ') + result.name);
  console.log(chalk.white('Size:    ') + result.size);
  console.log(chalk.white('Seeds:   ') + chalk.green(result.seeds.toString()));
  console.log(chalk.white('Peers:   ') + result.peers.toString());
  console.log(chalk.white('Source:  ') + result.source);
  console.log(chalk.white('URL:     ') + result.url);
  if (result.magnet) {
    console.log(chalk.white('Magnet:  ') + chalk.cyan(result.magnet.substring(0, 60) + '...'));
  }
  console.log(chalk.bold('----------------------\n'));
}

export function displayError(message: string): void {
  console.error(chalk.red('Error: ') + message);
}

export function displaySuccess(message: string): void {
  console.log(chalk.green('✓ ') + message);
}

export function displayInfo(message: string): void {
  console.log(chalk.blue('ℹ ') + message);
}