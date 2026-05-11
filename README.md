# 🎬 Movie Downloader

Modern torrent downloader with **Letterboxd** watchlist integration. Built with Electron, Express, and WebTorrent.

> **Author:** Sedat ERGOZ — [eaeoz](https://github.com/eaeoz) — sedatergoz@gmail.com

---

## 📥 Download

**Setup Installer** — Windows x64 — [Movie.Downloader.Setup.1.0.0.exe](https://github.com/eaeoz/movie-downloader/releases/download/1.0.0/Movie.Downloader.Setup.1.0.0.exe)
**Portable** — Windows x64 — [Movie.Downloader_portable_1.0.0.exe](https://github.com/eaeoz/movie-downloader/releases/download/1.0.0/Movie.Downloader_portable_1.0.0.exe)

> No installation required for portable — just unzip and run. The setup installer provides start menu shortcuts and uninstall support.

---

## ✨ Features

- **Letterboxd Watchlist Sync** — Load your personal watchlist by entering your Letterboxd username
- **Auto & Manual Mode** — Toggle between auto-download best quality or manual result selection
- **Multi-Source Search** — Searches across YTS, ThePirateBay, TorrentsCSV, and RARBG
- **Download Management** — Real-time progress, speed, ETA, seeds/peers tracking
- **Built-in Media Player** — Stream downloaded movies directly in the app
- **Library Browser** — Browse and play downloaded files with folder hierarchy
- **Filters & Sorting** — Filter by size, seeders, quality, category; sort by seeds/size/date
- **Dark & Light Theme** — Toggle between themes with persistent preference
- **System Tray** — Minimize to tray with Show / Open Folder / Quit menu
- **Cancel Downloads** — Cancel active downloads from the downloads panel
- **Open Download Folder** — Quick access to downloaded files via top bar button
- **Settings** — Configurable Letterboxd username, enabled sources, filters, download path

---

## 🚀 How to Use

### 1. Letterboxd Setup

Install the Letterboxd app on your phone and add movies to your watchlist:

- **Android** — [Play Store](https://play.google.com/store/apps/details?id=com.letterboxd.letterboxd)
- **iOS** — [App Store](https://apps.apple.com/us/app/letterboxd/id1054271011)

Then in the app:
1. Click **Settings** (gear icon) in the top bar
2. Enter your **Letterboxd username** and click **Save Settings**
3. Click the **refresh** button (↻) to load your watchlist

Your watchlist URL format: `https://letterboxd.com/yourusername/watchlist/`

### 2. Browse Without Sign-In

No account? Browse popular movies directly:

- [Popular This Week](https://letterboxd.com/films/popular/this/week/)

### 3. Select a Movie

- Click the **Letterboxd dropdown** to browse your synced watchlist
- Search movies by typing in the dropdown search box
- Click a movie to trigger search

### 4. Choose Download Mode

Toggle between **Auto** and **Manual** mode in the top bar:

- **Auto** — Searches and downloads the best quality result automatically
- **Manual** — Shows search results for you to review and click to download

### 5. Download

- In **Manual mode**, click the download button (↓) next to any result
- Monitor progress in the **Downloads** panel on the right
- Cancel any active download with the cancel button

### 6. Play & Browse

- Click any completed download or library file to play in the built-in media player
- Browse your **Library** tree to find all downloaded files organized by folder
- Click the **Open Folder** button in the top bar to open the download directory in Explorer

### 7. System Tray

When minimized, the app lives in your system tray:

- **Show** — Restore the application window
- **Open Folder** — Open the downloads directory
- **Quit** — Fully exit the application

### 8. Settings

- **Letterboxd** — Set your Letterboxd username for watchlist sync
- **Enabled Sources** — Toggle search sources on/off (YTS, ThePirateBay, RARBG, TorrentsCSV)
- **Filters** — Min/max size, min/max seeders, sort by, category, result limit, quality filter, search append
- **Download Location** — Custom download directory via folder picker

---

## 🛠 Build from Source

```bash
# Install dependencies
npm install

# Generate icons
npm run build:icon

# Build portable executable
npm run build:portable

# Build setup installer
npm run build:setup

# Build both
npm run build:all
```

Outputs are placed in the `dist/` directory.

---

## 🧱 Tech Stack

- **Frontend** — Vanilla JS, CSS custom properties, Font Awesome 6
- **Backend** — Express.js, WebTorrent
- **Desktop** — Electron, electron-builder
- **Languages** — TypeScript, JavaScript

---

## 📄 License

MIT
