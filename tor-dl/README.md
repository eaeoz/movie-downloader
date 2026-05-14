# tor-dl

A CLI torrent search tool. Search across multiple sources, open .torrent in browser, or copy magnet links to clipboard.

## Quick Start

```bash
# Run without installation (requires Node.js)
npx tor-dl search "movie title"

# Install globally for easy use
npm install -g tor-dl
tor-dl search "movie title"

# Copy magnet link to clipboard
tor-dl o 3

# Show version
tor-dl --version
```

## Commands

### search <query>
Search for torrents across multiple sources.

```bash
tor-dl search <query> [options]
```

**Options:**

| Flag | Description | Example |
|------|-------------|---------|
| `-c, --cat <category>` | Category to filter results | `all`, `movie`, `tv`, `anime`, `music`, `games`, `apps` |
| `-s, --min-seeds <number>` | Minimum number of seeders | `100` |
| `--max-seeds <number>` | Maximum number of seeders | `1000` |
| `--min-size <size>` | Minimum file size | `500MB`, `1GB`, `2GB` |
| `--max-size <size>` | Maximum file size | `5GB`, `10GB` |
| `-o, --sort <field>` | Sort results by field | `seeds`, `size`, `date` |
| `--order <order>` | Sort order | `asc` (low to high), `desc` (high to low) |
| `-l, --limit <number>` | Maximum results to return | `10`, `50`, `100` |
| `-S, --sources <sources>` | Sources to search (comma-separated) | `yts,torrentscsv,thepiratebay,1337x,nyaa,rargb,limetorrents` |

**Available Categories:**
- `all` - Search all categories
- `movie` - Movies
- `tv` - TV shows
- `anime` - Anime (mainly Nyaa)
- `music` - Music
- `games` - Games
- `apps` - Applications

## Supported Sources

| Source | Categories | Description |
|--------|------------|-------------|
| yts | movie | Movie torrents with direct .torrent download |
| torrentscsv | all | General torrent search |
| thepiratebay | all | General torrent search |
| 1337x | all | General torrent search |
| nyaa | anime, tv | Anime and Japanese media |
| rargb | all | RARBG proxy - movies, TV, games, music, anime, apps, doc, other, xxx |
| limetorrents | all | LimeTorrents.store - movies, TV, games, music, anime, apps, other |

**Examples:**

```bash
# Basic search
tor-dl search "Blade Runner 2049"

# Search movies with minimum seeds
tor-dl search "movie" --cat movie --min-seeds 100

# Search with size limits
tor-dl search "linux" --min-size 500MB --max-size 2GB

# Search specific sources only
tor-dl search "game" -S yts,thepiratebay

# Sort by size (smallest first)
tor-dl search "documentary" --sort size --order asc

# Limit results to top 10
tor-dl search "podcast" -l 10
```

### o <number>
Copy .torrent URL or magnet link to clipboard for the selected result number.

```bash
tor-dl o <number>
```

After running a search, enter the result number to copy the link to your clipboard.

**Example:**
```bash
tor-dl search "python tutorial"
# Results displayed...
tor-dl o 5
# Magnet link copied to clipboard!
```

### open <number>
Same as `o` command - opens .torrent in browser or copies magnet link.

```bash
tor-dl open <number>
```

---

## Letterboxd Integration

tor-dl can fetch movies from your Letterboxd watchlist and search for torrents directly.

### Setup Your Username

```bash
tor-dl setuser Sedat85
```

Replace `Sedat85` with your actual Letterboxd username.

### List Your Watchlist

```bash
tor-dl list
```

This fetches movies from your Letterboxd watchlist and displays them with numbers.

**Example output:**

```
--- Watchlist ---
1. Children of Men (2006)
2. The Drama (2026)
3. Forbidden Fruits (2026)
----------------
Use: tor-dl find <number> to search and download
```

### Find and Download

After listing your watchlist, use the movie number to search and download:

```bash
tor-dl find 1                 # Search with year (default)
tor-dl find 1 --noyear       # Search without year
```

- Default: searches "Movie Title 2026" (includes year for accuracy)
- `--noyear`: searches "Movie Title" only (more results)

### Configure Search Filters

Set default filters for all searches:

```bash
tor-dl setfilter -c movie           # Category: movie
tor-dl setfilter -s 50            # Minimum 50 seeds
tor-dl setfilter --min-size 1GB    # Minimum 1GB
tor-dl setfilter --max-size 5GB    # Maximum 5GB
tor-dl setfilter -o seeds         # Sort by seeds
tor-dl setfilter --order desc      # Order: descending
tor-dl setfilter -l 30            # Limit 30 results
tor-dl setfilter -S yts,torrentscsv  # Sources: YTS & torrentscsv
```

### View Current Settings

```bash
tor-dl filters    # Show current search filters
tor-dl user     # Show current username
```

**Filters output:**

```
--- Current Filters ---
Category: movie
Min Seeds: 0
Max Seeds: unlimited
Min Size: 0
Max Size: 50GB
Sort By: seeds
Order: desc
Limit: 60
Sources: yts,thepiratebay,nyaa,torrentscsv,1337x,rargb,limetorrents
----------------------
```

**User output:**

```
--- User ---
Letterboxd: Sedat85
-----------
```

### Complete Workflow

```bash
# 1. Set your Letterboxd username
tor-dl setuser Sedat85

# 2. Set preferred filters (optional)
tor-dl setfilter -c movie -s 50 --min-size 1GB

# 3. List your watchlist
tor-dl list

# 4. Find and download movie #1
tor-dl find 1
# OR without year for more results
tor-dl find 1 --noyear
```

---

### Options

| Flag | Description |
|------|-------------|
| `-v, --version` | Show version number |
| `-h, --help` | Show help information |

## Size Format

Size can be specified in various formats:
- `KB` - Kilobytes
- `MB` - Megabytes
- `GB` - Gigabytes
- `TB` - Terabytes

Examples: `500MB`, `1.5GB`, `2GB`

## Requirements

- Node.js >= 18.0.0
- npm
- Transmission (optional, for Windows)

## Local Installation

```bash
git clone https://github.com/eaeoz/tor-dl.git
cd tor-dl
npm install
npm run build
```

## Using with Windows Command Prompt

On Windows, if you add the tor-dl installation directory to your PATH environment variable, you can use it directly from the command line without needing to specify the full path each time.

### Adding to PATH on Windows

1. Press `Win + R`, type `sysdm.cpl`, and press Enter
2. Go to **Advanced** tab → **Environment Variables**
3. Under "User variables" or "System variables", find **Path** and click **Edit**
4. Add the folder where `tor-dl` is installed (e.g., `C:\Users\YourName\AppData\Roaming\npm`)
5. Click **OK** and restart your command prompt

### Quick Search Batch Script

Create a batch file (e.g., `search.bat`) in your PATH to quickly search for movies:

```batch
@echo off

if "%*"=="" (
    echo Please provide a movie name.
    exit /b
)

tor-dl search "%*" --min-size 700MB --max-size 3GB -s 5
```

**Usage:**
```bash
search scream 7
```

## Install Transmission (Windows)

For Windows users, you can install Transmission client using winget:

```bash
winget install Transmission.Transmission
```

Or download directly from the official website:

- **Windows**: [https://transmissionbt.com/download](https://transmissionbt.com/download)

After installation, you can open magnet links directly in Transmission.

## Transfer to Mobile/Tablet/Apple TV

After your download completes in Transmission, you can transfer the file directly to VLC on your mobile device, tablet, or Apple TV using WiFi transfer. 

- If devices in different subnets: To connect to devices on different networks, port forwarding or routing must be configured on the network device which placed between them

### Prerequisites

1. **Set a Static IP** on your mobile device/tablet/Apple TV to ensure the IP address doesn't change
2. Enable WiFi transfer on your device (VLC for iOS/Android has built-in WiFi transfer feature)

### Setting Static IP

- **Mobile/Tablet**: Settings → WiFi → Long press your network → Modify Network → Set static IP
- **Apple TV**: Settings → Network → Configure IP manually (or use DHCP with reserved IP on your router)

### Upload Script

Place `upload.bat` in the same folder where you added to your search script mentioned above PATH (or any folder in your PATH):

```batch
@echo off
if "%~1"=="" (
  echo Usage: upload.bat "full\path\to\file.mp4"
  echo Drag and drop a file onto the script also works.
  exit /b 1
)

set "FILE=%~1"
set "REMOTE=http://192.168.1.232/upload.json"

if not exist "%FILE%" (
  echo Error: File not found: "%FILE%"
  exit /b 1
)

echo Uploading: %~nx1
curl --progress-bar -F "file=@%FILE%" "%REMOTE%" -o NUL

if %errorlevel%==0 (
  echo Upload complete.
) else (
  echo Upload failed. Check connection or server.
)
```

**Note:** Replace `192.168.1.222` with your device's actual IP address.

### Usage

- Open the folder in File Explorer, then right-click and select **"Open in Terminal"** (or "Open PowerShell window here").

If you are already inside the folder where the file is located, you can use:

```
upload movie.mp4
```
or

```bash
upload "C:\Users\YourName\Downloads\movie.mp4"
```

- You can autocomplete file names using the TAB key.

#### Example:

```
upload scr
```

Press `TAB` → it will expand to:

```
upload "Scream 7.mp4"
```

If multiple files match, press `TAB` repeatedly to cycle through options:

```
Scream 7.mp4
Scream 6.mp4
script.txt
```

---

### Example Workflow

```
cd C:\Users\YourName\Downloads
upload scr
```

Press `TAB`:

```
upload "Scream 7.mp4"
```


## Author

Sedat ERGOZ [@eaeoz](https://github.com/eaeoz)

## License

MIT License

## Disclaimer

This tool is for educational purposes. Always respect copyright laws and the terms of service of torrent sites.