import { displayError, displaySuccess, displayInfo } from '../cli/display';
import { getCachedResults } from '../download/engine';
import { exec, execSync } from 'child_process';
import chalk from 'chalk';

export async function openInBrowser(number: number): Promise<void> {
  const results = getCachedResults();
  
  if (results.length === 0) {
    displayError('No search results found. Run "tor-dl search <query>" first.');
    process.exit(1);
  }
  
  if (number < 1 || number > results.length) {
    displayError(`Invalid selection. Choose a number between 1 and ${results.length}.`);
    process.exit(1);
  }
  
  const result = results[number - 1];
  
  if (!result.torrentUrl && !result.magnet) {
    displayError('No .torrent URL or magnet available for this result.');
    process.exit(1);
  }
  
  const url = result.torrentUrl || result.magnet || '';
  
  if (url.startsWith('magnet:')) {
    try {
      if (process.platform === 'win32') {
        execSync(`echo ${url} | clip`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execSync(`echo "${url}" | pbcopy`, { stdio: 'ignore' });
      } else {
        execSync(`echo "${url}" | xclip -selection clipboard`, { stdio: 'ignore' });
      }
      displaySuccess('Magnet link copied to clipboard!');
      console.log(chalk.gray(url));
    } catch {
      displayInfo('Magnet link:');
      console.log(chalk.cyan(url));
    }
  } else {
    displayInfo('Opening: ' + url);
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : 
                process.platform === 'darwin' ? `open "${url}"` : 
                `xdg-open "${url}"`;
    
    exec(cmd, (err) => {
      if (err) {
        try {
          if (process.platform === 'win32') {
            execSync(`echo ${url} | clip`, { stdio: 'ignore' });
          } else if (process.platform === 'darwin') {
            execSync(`echo "${url}" | pbcopy`, { stdio: 'ignore' });
          } else {
            execSync(`echo "${url}" | xclip -selection clipboard`, { stdio: 'ignore' });
          }
          displaySuccess('URL copied to clipboard!');
        } catch {
          displayError('Failed to open. Copy this URL manually:');
          console.log(chalk.cyan(url));
        }
      } else {
        displaySuccess('Opened in browser');
      }
    });
  }
}