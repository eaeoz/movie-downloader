import axios from 'axios';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { displaySuccess, displayError, displayInfo } from '../cli/display';
import { getUpdateUrl } from '../sources/registry';

export async function updateCommand(): Promise<void> {
  const updateUrl = getUpdateUrl();
  
  if (!updateUrl) {
    displayError('No update URL configured. Update sources.json with an updateUrl first.');
    return;
  }
  
  displayInfo(`Fetching latest sources from: ${updateUrl}`);
  
  try {
    const { data } = await axios.get(updateUrl, { timeout: 15000 });
    
    const localPath = join(process.cwd(), 'sources.json');
    writeFileSync(localPath, JSON.stringify(data, null, 2));
    
    displaySuccess('Sources updated successfully!');
    displayInfo(`Updated to version: ${data.version || 'unknown'}`);
    displayInfo(`Sources: ${Object.keys(data.sources || {}).join(', ')}`);
  } catch (error: any) {
    displayError(`Failed to update sources: ${error.message}`);
    displayInfo('Check your internet connection and the update URL.');
  }
}