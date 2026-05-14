import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { FilterConfig, SearchOptions } from '../types';

function getDataDir(): string {
  return process.env.TOR_DL_DATA_DIR || join(__dirname, '../..');
}

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export function loadFilters(): FilterConfig {
  const filtersPath = join(getDataDir(), 'filters.json');
  if (existsSync(filtersPath)) {
    return JSON.parse(readFileSync(filtersPath, 'utf-8'));
  }
  return {
    category: 'all',
    minSeeds: 0,
    maxSeeds: 0,
    minSize: '0',
    maxSize: '50GB',
    sortBy: 'seeds',
    order: 'desc',
    limit: 50
  };
}

export function createParser(): Command {
  const program = new Command();
  const filters = loadFilters();
  
  const mainHelp = `
Categories: all, movie, tv, anime, music, games, apps
Sources:
  yts - movies | torrentscsv - general | thepiratebay - general | 1337x - general | nyaa - anime | rargb - general | limetorrents - general

Letterboxd Integration:
  setuser <username>  Set your Letterboxd username
  list               List movies from your watchlist
  find <number>      Search and download a movie from list
  filters           Show current search filters
  user              Show current username

Examples:
  tor-dl setuser Sedat85          # Set Letterboxd username
  tor-dl list                    # List watchlist movies
  tor-dl find 1                 # Find first movie (with year)
  tor-dl find 1 --noyear       # Find without year
  tor-dl setfilter -c movie -s 50  # Set filters
  tor-dl filters                 # Show filters
  tor-dl user                   # Show username`;
  
  program
    .name('tor-dl')
    .description('CLI torrent search tool - search, open in browser, copy magnet links' + mainHelp)
    .version(getVersion(), '-v, --version')
    .showHelpAfterError()
    .showSuggestionAfterError();

  program
    .command('search <query>')
    .description('Search for torrents. Use -h after search term for examples: tor-dl search "movie" -h')
    .option('-c, --cat <category>', 'Category (all|movie|tv|anime|music|games|apps)')
    .option('-s, --min-seeds <number>', 'Minimum seeders', parseInt)
    .option('--max-seeds <number>', 'Maximum seeders', parseInt)
    .option('--min-size <size>', 'Min size (e.g. 500MB, 1GB)')
    .option('--max-size <size>', 'Max size (e.g. 5GB)')
    .option('-o, --sort <sortBy>', 'Sort by (seeds|size|date)')
    .option('--order <order>', 'Order (asc|desc)')
    .option('-l, --limit <number>', 'Max results (default: 50)', parseInt)
    .option('-S, --sources <sources>', 'Sources (yts,torrentscsv,thepiratebay,1337x,nyaa,rargb,limetorrents)')
    .option('-h, --help', 'Show help with examples')
    .allowUnknownOption()
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.help || thisCommand.args.includes('-h')) {
        console.log('');
        console.log('Categories: all, movie, tv, anime, music, games, apps');
        console.log('Sources: yts, torrentscsv, thepiratebay, 1337x, nyaa, rargb, limetorrents');
        console.log('  yts          - YTS (Movies)');
        console.log('  torrentscsv  - Torrents.csv (All categories)');
        console.log('  thepiratebay - The Pirate Bay');
        console.log('  1337x        - 1337x (All categories)');
        console.log('  nyaa         - Nyaa.si (Anime)');
        console.log('  rargb        - RARGB.to (All categories)');
        console.log('  limetorrents - LimeTorrents.store (All categories)');
        console.log('');
        console.log('Examples:');
        console.log('  tor-dl search "movie" -c movie -s 100');
        console.log('  tor-dl search "anime" -S nyaa --max-size 2GB');
        console.log('  tor-dl search "linux" --min-size 500MB -l 10');
        process.exit(0);
      }
    })
    .action(async (query: string, options) => {
      
      const searchOptions: SearchOptions = {
        query,
        category: options.cat || filters.category,
        minSeeds: options.minSeeds ?? filters.minSeeds,
        maxSeeds: options.maxSeeds ?? (filters as any).maxSeeds,
        minSize: options.minSize || filters.minSize,
        maxSize: options.maxSize || filters.maxSize,
        sortBy: (options.sort as 'seeds' | 'size' | 'date') || filters.sortBy,
        order: (options.order as 'asc' | 'desc') || filters.order,
        limit: options.limit || filters.limit,
        sources: options.sources ? options.sources.split(/[,\s]+/).map((s: string) => s.trim()).filter((s: string) => s) : (filters as any).sources ? (filters as any).sources.split(/[,\s]+/).map((s: string) => s.trim()).filter((s: string) => s) : undefined
      };

      const { searchCommand } = await import('../commands/search');
      await searchCommand(searchOptions);
    });

  const openCmd = program.command('open <number>', { hidden: true });
  openCmd.description('Open .torrent in browser or copy magnet to clipboard');
  openCmd.action(async (number: string) => {
    const { openInBrowser } = await import('../commands/download');
    await openInBrowser(parseInt(number));
  });

  const oCmd = program.command('o <number>');
  oCmd.description('Open .torrent in browser or copy magnet to clipboard');
  oCmd.action(async (number: string) => {
    const { openInBrowser } = await import('../commands/download');
    await openInBrowser(parseInt(number));
  });

  program
    .command('setuser <username>')
    .description('Set Letterboxd username (e.g., tor-dl setuser Sedat85)')
    .action(async (username: string) => {
      const { setUserCommand } = await import('../commands/user');
      await setUserCommand(username);
    });

  program
    .command('setfilter [filters...]')
    .description('Set search filters (e.g., tor-dl setfilter -c movie -s 100 --min-size 1GB)')
    .option('-c, --cat <category>', 'Category (all|movie|tv|anime|music|games|apps)')
    .option('-s, --min-seeds <number>', 'Minimum seeders', parseInt)
    .option('--max-seeds <number>', 'Maximum seeders', parseInt)
    .option('--min-size <size>', 'Min size (e.g. 500MB, 1GB)')
    .option('--max-size <size>', 'Max size (e.g. 5GB)')
    .option('-o, --sort <sortBy>', 'Sort by (seeds|size|date)')
    .option('--order <order>', 'Order (asc|desc)')
    .option('-l, --limit <number>', 'Max results', parseInt)
    .option('-S, --sources <sources>', 'Sources (yts,torrentscsv,thepiratebay,1337x,nyaa,rargb,limetorrents)')
    .action(async (filters: string[], options) => {
      const { setFilterCommand } = await import('../commands/user');
      await setFilterCommand(options);
    });

  program
    .command('list')
    .description('List movies from Letterboxd watchlist')
    .action(async (options) => {
      const { listCommand } = await import('../commands/user');
      await listCommand(options);
    });

  program
    .command('filters')
    .description('Show current search filters')
    .action(async () => {
      const filters = loadFilters();
      console.log('\n--- Current Filters ---');
      console.log('Category:', filters.category);
      console.log('Min Seeds:', filters.minSeeds);
      console.log('Max Seeds:', filters.maxSeeds || 'unlimited');
      console.log('Min Size:', filters.minSize);
      console.log('Max Size:', filters.maxSize);
      console.log('Sort By:', filters.sortBy);
      console.log('Order:', filters.order);
      console.log('Limit:', filters.limit);
      console.log('Sources:', (filters as any).sources || 'all');
      console.log('----------------------\n');
    });

  program
    .command('user')
    .description('Show current username')
    .action(async () => {
      const { loadUserConfig } = await import('../commands/user');
      const config = loadUserConfig();
      const username = config.letterboxd.username;
      console.log('\n--- User ---');
      console.log('Letterboxd:', username || '(not set)');
      console.log('-----------\n');
    });

  program
    .command('find <number>')
    .description('Download movie by number from list')
    .option('--noyear', 'Search without year')
    .allowUnknownOption()
    .action(async (number: string, options: any) => {
      const { findCommand } = await import('../commands/user');
      await findCommand(parseInt(number), options);
    });

  program.on('command:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args[0]);
    process.exit(1);
  });

  return program;
}