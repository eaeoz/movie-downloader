import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import chalk from 'chalk';
import ora from 'ora';
import { FilterConfig, SearchOptions } from '../types';
import { loadFilters } from '../cli/parser';

interface UserConfig {
  letterboxd: {
    username: string;
  };
}

function getDataDir(): string {
  return process.env.TOR_DL_DATA_DIR || join(__dirname, '../..');
}

function getUsersPath(): string {
  return join(getDataDir(), 'users.json');
}

function loadUsers(): UserConfig {
  const usersPath = getUsersPath();
  if (existsSync(usersPath)) {
    return JSON.parse(readFileSync(usersPath, 'utf-8'));
  }
  return { letterboxd: { username: '' } };
}

export { loadUsers as loadUserConfig };

function saveUsers(config: UserConfig): void {
  writeFileSync(getUsersPath(), JSON.stringify(config, null, 2));
}

export async function setUserCommand(username: string): Promise<void> {
  const config = loadUsers();
  config.letterboxd.username = username;
  saveUsers(config);
  console.log(chalk.green(`Username set to: ${username}`));
}

export async function setFilterCommand(options: any): Promise<void> {
  const filters = loadFilters();
  
  if (options.cat) filters.category = options.cat;
  if (options.minSeeds !== undefined) filters.minSeeds = options.minSeeds;
  if (options.maxSeeds) filters.maxSeeds = options.maxSeeds;
  if (options.minSize) filters.minSize = options.minSize;
  if (options.maxSize) filters.maxSize = options.maxSize;
  if (options.sort) filters.sortBy = options.sort;
  if (options.order) filters.order = options.order;
  if (options.limit) filters.limit = options.limit;
  if (options.sources) {
    const srcArr = options.sources.split ? options.sources.split(/[,\s]+/) : options.sources;
    const cleaned = Array.isArray(srcArr) ? srcArr.map((s: string) => s.trim()).filter((s: string) => s) : srcArr;
    filters.sources = Array.isArray(cleaned) ? cleaned.join(',') : cleaned;
  }
  
  const filtersPath = join(getDataDir(), 'filters.json');
  writeFileSync(filtersPath, JSON.stringify(filters, null, 2));
  console.log(chalk.green('Filters updated:'));
  console.log(JSON.stringify(filters, null, 2));
}

interface WatchlistMovie {
  num: number;
  name: string;
  year: string;
  rating: string;
  url: string;
}

function getWatchlistCachePath(): string {
  return join(getDataDir(), '.watchlist-cache.json');
}

function loadWatchlistCache(): WatchlistMovie[] {
  const path = getWatchlistCachePath();
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveWatchlistCache(movies: WatchlistMovie[]): void {
  writeFileSync(getWatchlistCachePath(), JSON.stringify(movies, null, 2));
}

let watchlistCache: WatchlistMovie[] = [];

export async function listCommand(_options: unknown): Promise<void> {
  const config = loadUsers();
  const username = config.letterboxd.username;
  
  if (!username) {
    console.log(chalk.red('No username set. Use: tor-dl setuser <username>'));
    return;
  }
  
  const spinner = ora(`Fetching watchlist for ${username}...`).start();
  
  try {
    let movies: WatchlistMovie[] = [];
    
    const profileUrl = `https://letterboxd.com/${username}/`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };
    
const response = await axios.get(profileUrl, { headers, timeout: 30000, validateStatus: () => true });
    
    if (response.status === 403) {
      spinner.warn('Letterboxd blocking requests. Try using: tor-dl search "movie name" directly');
      return;
    }
    
    if (!response.data) {
      spinner.warn('Empty response from Letterboxd');
      return;
    }
    
    const $ = cheerio.load(response.data);
    
    $('[data-item-name]').each((_i, elem) => {
      
      const el = $(elem);
      const fullName = el.attr('data-item-name') || '';
      const href = el.attr('data-item-link') || '';
      
      if (fullName && href && href.includes('/film/')) {
        const nameLower = fullName.toLowerCase();
        const exists = movies.some(m => m.name.toLowerCase() === nameLower);
        if (!exists) {
          const yearMatch = fullName.match(/\((\d{4})\)$/);
          const movieName = yearMatch ? fullName.replace(/\s*\(\d{4}\)\s*$/, '').trim() : fullName;
          movies.push({
            num: movies.length + 1,
            name: movieName,
            year: yearMatch ? yearMatch[1] : '',
            rating: '',
            url: 'https://letterboxd.com' + href
          });
        }
      }
    });
    
    if (movies.length === 0) {
      $('a[href*="/film/"][title]').each((_i, elem) => {
        
        const el = $(elem);
        const name = el.attr('title') || '';
        const href = el.attr('href') || '';
        
        if (name && name.length > 1 && name.length < 200 && href.includes('/film/')) {
          const exists = movies.some(m => m.name === name);
          if (!exists) {
            const yearMatch = name.match(/\((\d{4})\)$/);
            movies.push({
              num: movies.length + 1,
              name: name,
              year: yearMatch ? yearMatch[1] : '',
              rating: '',
              url: 'https://letterboxd.com' + href
            });
          }
        }
      });
    }
    
    if (movies.length === 0) {
      $('a[href*="/film/"]').each((_i, elem) => {
        
        const el = $(elem);
        const href = el.attr('href') || '';
        let name = el.text().trim();
        name = name.replace(/\s+/g, ' ').replace(/^\d+\.\s*/, '').trim();
        
        if (name && name.length > 1 && name.length < 200 && href.includes('/film/')) {
          const exists = movies.some(m => m.name === name);
          if (!exists) {
            const yearMatch = name.match(/\((\d{4})\)$/);
            let movieYear = yearMatch ? yearMatch[1] : '';
            if (!movieYear) {
              const urlYearMatch = href.match(/-(\d{4})\/?$/);
              if (urlYearMatch) movieYear = urlYearMatch[1];
            }
            movies.push({
              num: movies.length + 1,
              name: yearMatch ? name.replace(/\s*\(\d{4}\)\s*$/, '').trim() : name,
              year: movieYear,
              rating: '',
              url: 'https://letterboxd.com' + href
            });
          }
        }
      });
    }
    
    const watchlistUrl = `https://letterboxd.com/${username}/watchlist/`;
    const watchlistResponse = await axios.get(watchlistUrl, { headers, timeout: 30000, validateStatus: () => true });
    
    if (watchlistResponse.status !== 403 && watchlistResponse.data) {
      const cleanHtml = watchlistResponse.data.replace(/<script\b[^<]*(?:<[^<]*)<\/?script>/gi, '');
      const $wl = cheerio.load(cleanHtml);
      
      $wl('[data-item-name]').each((_i, elem) => {
        const el = $wl(elem);
        const fullName = el.attr('data-item-name') || '';
        const href = el.attr('data-item-link') || '';
        
        if (fullName && href && href.includes('/film/')) {
          const nameLower = fullName.toLowerCase();
          const exists = movies.some(m => m.name.toLowerCase().includes(nameLower) || nameLower.includes(m.name.toLowerCase()));
          if (!exists) {
            const yearMatch = fullName.match(/\((\d{4})\)$/);
            const movieName = yearMatch ? fullName.replace(/\s*\(\d{4}\)\s*$/, '').trim() : fullName;
            movies.push({
              num: movies.length + 1,
              name: movieName,
              year: yearMatch ? yearMatch[1] : '',
              rating: '',
              url: 'https://letterboxd.com' + href
            });
          }
        }
      });
      
      if (movies.length <= 5) {
        $wl('a[href*="/film/"]').each((_i, elem) => {
          const el = $wl(elem);
          const href = el.attr('href') || '';
          let name = el.text().trim().replace(/\s*\(\d{4}\)\s*$/, '').replace(/\s+/g, ' ').trim();
          
          if (href.includes('/film/') && name && name.length > 1 && name.length < 200) {
            const nameLower = name.toLowerCase();
            const exists = movies.some(m => m.name.toLowerCase().includes(nameLower) || nameLower.includes(m.name.toLowerCase()));
            if (!exists) {
              const yearMatch = name.match(/\((\d{4})\)$/);
              movies.push({
                num: movies.length + 1,
                name: yearMatch ? name.replace(/\s*\(\d{4}\)\s*$/, '').trim() : name,
                year: yearMatch ? yearMatch[1] : '',
                rating: '',
                url: 'https://letterboxd.com' + href
              });
            }
          }
        });
      }
    }
    
    watchlistCache = movies;
    saveWatchlistCache(movies);
    spinner.succeed(`Found ${movies.length} movies`);
    
    console.log(chalk.gray('\n--- Watchlist ---'));
    movies.forEach(m => {
        const ratingStr = m.rating ? ` ${m.rating}` : '';
        const yearStr = m.year ? `(${m.year})` : '';
        console.log(chalk.cyan(`${m.num}. `) + chalk.white(m.name) + chalk.gray(` ${yearStr}${ratingStr}`));
      });
      console.log(chalk.gray('----------------\n'));
      console.log(chalk.gray('Use: tor-dl find <number> to search and download'));
    
  } catch (error: any) {
    spinner.fail(`Failed to fetch watchlist: ${error.message}`);
  }
}

export async function findCommand(number: number, options: any = {}): Promise<void> {
  let movie = watchlistCache.find(m => m.num === number);
  
  if (!movie) {
    watchlistCache = loadWatchlistCache();
    movie = watchlistCache.find(m => m.num === number);
  }
  
  if (!movie) {
    console.log(chalk.red(`Movie #${number} not found. Run 'tor-dl list' first.`));
    return;
  }
  
  let searchQuery = movie.name;
  if (!options.noyear && movie.year) {
    searchQuery = `${movie.name} ${movie.year}`;
  }
  
  console.log(chalk.green(`Searching for: ${searchQuery}`));
  
  const filters = loadFilters();
  const searchOptions: SearchOptions = {
    query: searchQuery,
    category: filters.category,
    minSeeds: filters.minSeeds,
    maxSeeds: (filters as any).maxSeeds,
    minSize: filters.minSize,
    maxSize: filters.maxSize,
    sortBy: filters.sortBy,
    order: filters.order,
    limit: filters.limit,
    sources: (filters as any).sources ? (filters as any).sources.split(',') : undefined
  };
  
  const { searchCommand } = await import('./search');
  await searchCommand(searchOptions);
}