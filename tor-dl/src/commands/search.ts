import ora from 'ora';
import chalk from 'chalk';
import { SearchOptions, TorrentResult } from '../types';
import { getEnabledSources } from '../sources/registry';
import { filterByCategory, filterBySize, filterBySeeds, sortResults } from '../filters';
import { displayResults } from '../cli/display';
import { cacheResults } from '../download/engine';

async function fetchMagnets(results: TorrentResult[], sources: any[], spinner: any): Promise<void> {
  const magnetsSpinner = ora('Fetching magnet links...').start();
  let fetched = 0;
  const total = results.length;

  const promises = results.map(async (result) => {
    const source = sources.find(s => s.name.toLowerCase() === result.source?.toLowerCase());
    if (source && source.getMagnet && !result.magnet) {
      try {
        const magnet = await source.getMagnet(result);
        if (magnet) {
          result.magnet = magnet;
          fetched++;
          magnetsSpinner.text = `Fetching magnet links... ${fetched}/${total}`;
        }
      } catch { /* ignore */ }
    }
  });

  await Promise.all(promises);
  magnetsSpinner.succeed(`Fetched ${fetched} magnet links.`);
}

function displaySearchInfo(options: SearchOptions, sources: any[]): void {
  console.log(chalk.gray('\n--- Search Parameters ---'));
  
  const sourceNames = sources.map(s => s.name).join(', ');
  console.log(chalk.white('Sources:  ') + chalk.cyan(sourceNames));
  console.log(chalk.white('Query:    ') + chalk.cyan(options.query));
  
  if (options.category) {
    console.log(chalk.white('Category: ') + chalk.cyan(options.category));
  }
  if (options.minSeeds) {
    const seeds = options.maxSeeds ? `${options.minSeeds} - ${options.maxSeeds}` : `${options.minSeeds}+`;
    console.log(chalk.white('Seeds:    ') + chalk.cyan(seeds));
  }
  if (options.minSize) {
    console.log(chalk.white('Min Size: ') + chalk.cyan(options.minSize));
  }
  if (options.maxSize) {
    console.log(chalk.white('Max Size: ') + chalk.cyan(options.maxSize));
  }
  if (options.sortBy) {
    console.log(chalk.white('Sort:     ') + chalk.cyan(`${options.sortBy} (${options.order})`));
  }
  if (options.limit) {
    console.log(chalk.white('Limit:    ') + chalk.cyan(options.limit.toString()));
  }
  
  console.log(chalk.gray('------------------------\n'));
}

export async function searchCommand(options: SearchOptions): Promise<void> {
  const spinner = ora('Searching torrent sources...').start();
  
  let sources = getEnabledSources();
  const validSourceNames = sources.map(s => s.name.toLowerCase());
  
  if (options.sources && options.sources.length > 0) {
    const requested = options.sources.map(s => s.toLowerCase());
    const unknownSources = requested.filter(s => !validSourceNames.includes(s));
    
    if (unknownSources.length > 0) {
      spinner.warn(chalk.yellow(`Unknown sources: ${unknownSources.join(', ')}. Available: ${validSourceNames.join(', ')}`));
    }
    
    sources = sources.filter(s => requested.includes(s.name.toLowerCase()));
    
    if (sources.length === 0) {
      spinner.fail('No valid sources selected. Use --sources with valid names.');
      console.log(chalk.cyan('\nAvailable sources:'), validSourceNames.join(', '));
      process.exit(1);
    }
  }
  
  const allResults: TorrentResult[] = [];
  
  for (const source of sources) {
    try {
      spinner.text = `Searching ${source.name}...`;
      const results = await source.search(options.query, options.category);
      allResults.push(...results);
    } catch (error) {
      spinner.warn(`Failed to search ${source.name}`);
    }
  }
  
  spinner.succeed(`Search complete. Found ${allResults.length} results.`);
  
  let filtered = filterByCategory(allResults, options.category || 'all');
  
  if (options.minSeeds && options.minSeeds > 0) {
    filtered = filterBySeeds(filtered, options.minSeeds, options.maxSeeds);
  }
  
  if (options.minSize || options.maxSize) {
    filtered = filterBySize(filtered, options.minSize, options.maxSize);
  }
  
  filtered = sortResults(filtered, options.sortBy || 'seeds', options.order || 'desc');
  
  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }
  
  filtered = filtered.map((r, i) => ({ ...r, num: i + 1 }));
  
  await fetchMagnets(filtered, sources, spinner);
  
  cacheResults(filtered);
  
  displaySearchInfo(options, sources);
  displayResults(filtered);
}