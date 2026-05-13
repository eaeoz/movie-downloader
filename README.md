# 🎬 Movie Downloader

Modern torrent downloader with **Letterboxd** watchlist integration — Search and download movies from a beautiful desktop app.

[![Download Setup](https://img.shields.io/badge/Download-Windows%20Setup-blue?style=for-the-badge&logo=windows)](https://github.com/eaeoz/movie-downloader/releases/download/1.0.5/Movie.Downloader.Setup.1.0.5.exe)
[![Download Portable](https://img.shields.io/badge/Download-Portable%20Version-orange?style=for-the-badge&logo=windows)](https://github.com/eaeoz/movie-downloader/releases/download/1.0.5/Movie.Downloader_portable_1.0.5.exe)
[![GitHub](https://img.shields.io/badge/Source-GitHub-black?style=for-the-badge&logo=github)](https://github.com/eaeoz/movie-downloader)

> **Author:** Sedat ERGOZ — [eaeoz](https://github.com/eaeoz) — sedatergoz@gmail.com

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Download & Installation](#-download--installation)
- [How to Use](#-how-to-use)
- [Build from Source](#-build-from-source)
- [Tech Stack](#-tech-stack)

---

## 🎯 Overview

Movie Downloader bridges your Letterboxd watchlist with torrent search engines to create a seamless movie downloading experience:

- 🎬 **Letterboxd Sync** — Load your personal watchlist with one click
- 🔍 **Multi-Source Search** — Searches YTS, ThePirateBay, RARBG, TorrentsCSV
- 📥 **Smart Downloads** — Auto or Manual mode for finding the best quality
- 🗂️ **Library Browser** — Browse downloaded files organized by folder
- ▶️ **Built-in Video Player** — Play media files directly in the app with range-seeking support
- 🎴 **Movie Info Panel** — Rich metadata display (poster, rating, genres, directors, cast, plot) below the player
- 🌓 **Dark & Light Theme** — Toggle between themes with persistent preference

---

## ✨ Features

### 🔗 Letterboxd Integration
- Sync your personal watchlist by entering your Letterboxd username
- Search and filter movies in the dropdown
- One-click refresh to sync latest additions
- Works with both **Auto** (best quality) and **Manual** (pick from results) modes

### 🔎 Torrent Search
- **Multi-Source** — Aggregates results from YTS, ThePirateBay, RARBG, TorrentsCSV
- **Quality Filtering** — Filter by 720p, 1080p, BluRay, WEB-DL, and more
- **Advanced Filters** — Min/max size, seeders, category, sort by seeds/size/date
- **Search Append** — Append keywords like `BluRay x265` to refine queries

### 📊 Download Management
- Real-time progress bars with speed, ETA, and seeds/peers tracking
- Cancel active downloads anytime (optionally keep incomplete data via setting)
- Download status indicators (starting, downloading, completed, error, stalled)
- **Persistent download list across app restarts** — Incomplete downloads auto-resume
- **Incomplete folder system** — Downloads go to `_incomplete/`, moved to main folder on completion
- **Orphan cleanup** — Stale incomplete folders from crashed sessions cleaned on startup

### ▶️ Built-in Video Player
- Play `.mp4`, `.mkv`, `.webm`, `.avi`, `.mov` files directly in the app
- HTTP range-request support for seeking and scrubbing
- Seamless integration with the Library file tree — click any media file to play

### 🎴 Movie Info Panel
- Displays rich metadata below the video player: poster, title, year, rating, genres, directors, cast, and plot
- **Smart Lookup** — Automatically extracts movie name from filenames and fetches details from Letterboxd
- **Watchlist Matching** — If the file matches a watchlist entry, uses that data for higher accuracy
- **Collapsible** — Toggle the panel open/closed with smooth animation
- **Skeleton Loading** — Shimmer placeholder shown while data is being fetched, no jarring empty states
- Responsive layout adapts on smaller screens

### 🗂️ Library Browser
- Folder tree view of all downloaded files
- Organized by download folder structure

### 🎨 User Experience
- **Dark/Light Theme** — Toggle with one click, persists across sessions
- **System Tray** — Minimize to tray with Show / Open Folder / Quit
- **Toast Notifications** — Clear feedback for all actions
- **Responsive Layout** — Adapts to window size
- **Modern UI** — Clean design with smooth animations

---

## 📥 Download & Installation

### Option 1: Windows Installer (Recommended)

[![Download Setup](https://img.shields.io/badge/Download-Movie.Downloader.Setup.1.0.5.exe-blue?style=for-the-badge&logo=windows)](https://github.com/eaeoz/movie-downloader/releases/download/1.0.5/Movie.Downloader.Setup.1.0.5.exe)

- Double-click the installer and follow the wizard
- Desktop and Start Menu shortcuts created automatically
- Uninstaller included in Windows Programs & Features

### Option 2: Portable Version

[![Download Portable](https://img.shields.io/badge/Download-Movie.Downloader_portable_1.0.5.exe-orange?style=for-the-badge&logo=windows)](https://github.com/eaeoz/movie-downloader/releases/download/1.0.5/Movie.Downloader_portable_1.0.5.exe)

- No installation required — just run the executable
- No admin rights needed
- Perfect for USB drives or temporary use

---

## 🚀 How to Use

### 1. Letterboxd Setup

Install the Letterboxd app on your phone and add movies to your watchlist:

[![Android](https://img.shields.io/badge/Android-3DDC84?style=flat-square&logo=android&logoColor=white)](https://play.google.com/store/apps/details?id=com.letterboxd.letterboxd)
[![iOS](https://img.shields.io/badge/iOS-000000?style=flat-square&logo=apple&logoColor=white)](https://apps.apple.com/us/app/letterboxd/id1054271011)

Then in the app:
1. Click **Settings** (gear icon) in the top bar
2. Enter your **Letterboxd username** and click **Save Settings**
3. Click the **refresh** button (↻) to load your watchlist

Your watchlist URL format: `https://letterboxd.com/yourusername/watchlist/`

### 2. Browse Without Sign-In

No account? Browse popular movies directly:

[![Popular This Week](https://img.shields.io/badge/Letterboxd-Popular%20This%20Week-00e5ff?style=flat-square&logo=letterboxd)](https://letterboxd.com/films/popular/this/week/)

### 3. Select a Movie

- Click the **Letterboxd dropdown** to browse your synced watchlist
- Search movies by typing in the dropdown search box
- Click a movie to trigger search

### 4. Choose Download Mode

Toggle between **Auto** and **Manual** mode in the top bar:

- ⚡ **Auto** — Searches and downloads the best quality result automatically
- 🖐️ **Manual** — Shows search results for you to review and click to download

### 5. Download & Play

- In **Manual mode**, click the download button (↓) next to any result
- Monitor progress in the **Downloads** panel on the right
- Cancel any active download with the cancel button
- Browse your **Library** tree to find all downloaded files organized by folder
- Click any media file (🎬) to play it directly in the built-in video player
- The **Movie Info Panel** below the player automatically shows poster, rating, genres, cast and plot — fetched from Letterboxd
- Click the **Open Folder** button (📂) in the top bar to open the download directory in Explorer

### 6. System Tray

When minimized, the app lives in your system tray:

- **Show** — Restore the application window
- **Open Folder** — Open the downloads directory
- **Quit** — Fully exit the application

### 7. Settings

- **Letterboxd** | Set your Letterboxd username for watchlist sync 
- **Enabled Sources** | Toggle search sources on/off (YTS, ThePirateBay, RARBG, TorrentsCSV) 
- **Filters** | Min/max size, min/max seeders, sort by, category, result limit, quality filter, search append
- **Download Location** | Custom download directory via folder picker
- **Cancel Behavior** | Toggle whether to keep or delete incomplete data when cancelling a download

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

### Desktop
- **Electron** — Cross-platform desktop framework
- **electron-builder** — Packaging and distribution

### Backend
- **Express.js** — HTTP server
- **WebTorrent** — Torrent client
- **TypeScript** — Type-safe server code

### Frontend
- **Vanilla JavaScript** — No framework dependencies
- **CSS Custom Properties** — Dynamic theming
- **Font Awesome 6** — Icon library

---

## 📋 Changelog

### v1.0.5 (2026-05-13)

- **New:** Rich **Movie Info Panel** below the video player — displays poster, title, year, rating, genres, directors, cast, and plot description
- **New:** **Smart Movie Lookup** — Filename parsing automatically extracts movie name/year and fetches metadata from Letterboxd
- **New:** **Watchlist Matching** — If the playing file matches a watchlist entry, uses that data for higher accuracy
- **New:** **Skeleton Loading Animation** — Clean shimmer placeholder while movie data is being fetched, no empty/flashing states
- **New:** **Collapsible Panel** — Toggle the movie info panel open/closed with smooth chevron animation
- **New:** `POST /api/movie-details` server endpoint scrapes Letterboxd film pages for rich metadata
- **New:** **Watchlist Enrichment** — Dropdown shows rating stars, genre pills, and cast for every watchlist entry (batch-fetched 5 at a time)
- **New:** **Poster Thumbnails** in watchlist dropdown — each item shows a small poster image with film icon fallback
- **New:** **Year-Disambiguated Slugs** — when filename includes a year and Letterboxd returns a wrong-year match (e.g. "The Fall Guy" 1921 vs 2024), automatically retries with `slug-year`
- **Fixed:** Movie info now properly refreshes when switching between files (stale data no longer persists)
- **Fixed:** Duplicate director names removed from metadata results
- **Fixed:** Release group remnants (SPARKS, GECKOS, PEACE) no longer leak into cleaned movie names from filename parsing
- **Fixed:** `h264`/`h265` codec tags now properly stripped from filenames
- **Improved:** Unrated watchlist items show `N/A` instead of a blank rating slot
- **Technical:** Fetch-id pattern prevents race conditions when rapidly switching files

### v1.0.4 (2026-05-12)

- **Improved:** Smarter default search filters — max size reduced from 50GB to 4GB, min size raised to 700MB, min seeders set to 5 for more relevant results on first load

### v1.0.3 (2026-05-12)

### v1.0.2 (2026-05-12)

- **Fixed:** High CPU usage during downloads — removed verbose per-chunk progress logging to CLI

### v1.0.1 (2026-05-12)

- **Fixed:** Trailing whitespace in download folder names causing deletion issues on Windows — folder names are now trimmed

### v1.0.0 (2026-05-10)

- Initial release

---

## 📄 License

MIT

---

⭐ **Star this repository if you find it helpful!**  
Developed with ❤️ by **Sedat ERGOZ**
