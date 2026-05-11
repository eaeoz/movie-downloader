# 🎬 Movie Downloader

Modern torrent downloader with **Letterboxd** watchlist integration — Search, download, and stream movies from a beautiful desktop app.

[![Download Setup](https://img.shields.io/badge/Download-Windows%20Setup-blue?style=for-the-badge&logo=windows)](https://github.com/eaeoz/movie-downloader/releases/download/1.0.0/Movie.Downloader.Setup.1.0.0.exe)
[![Download Portable](https://img.shields.io/badge/Download-Portable%20Version-orange?style=for-the-badge&logo=windows)](https://github.com/eaeoz/movie-downloader/releases/download/1.0.0/Movie.Downloader_portable_1.0.0.exe)
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
- ▶️ **Built-in Player** — Stream downloaded movies directly in the app
- 🗂️ **Library Browser** — Browse and play downloaded files organized by folder
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
- Cancel active downloads anytime
- Download status indicators (starting, downloading, completed, error, stalled)
- Persistent download list across app restarts

### 🎮 Built-in Media Player
- Play downloaded video files directly in the app
- Supports common video formats
- Clean player UI with close button

### 🗂️ Library Browser
- Folder tree view of all downloaded files
- Click to play media files instantly
- Organized by download folder structure
- File size display for each item

### 🎨 User Experience
- **Dark/Light Theme** — Toggle with one click, persists across sessions
- **System Tray** — Minimize to tray with Show / Open Folder / Quit
- **Toast Notifications** — Clear feedback for all actions
- **Responsive Layout** — Adapts to window size
- **Modern UI** — Clean design with smooth animations

---

## 📥 Download & Installation

### Option 1: Windows Installer (Recommended)

[![Download Setup](https://img.shields.io/badge/Download-Movie.Downloader.Setup.1.0.0.exe-blue?style=for-the-badge&logo=windows)](https://github.com/eaeoz/movie-downloader/releases/download/1.0.0/Movie.Downloader.Setup.1.0.0.exe)

- Double-click the installer and follow the wizard
- Desktop and Start Menu shortcuts created automatically
- Uninstaller included in Windows Programs & Features

### Option 2: Portable Version

[![Download Portable](https://img.shields.io/badge/Download-Movie.Downloader_portable_1.0.0.exe-orange?style=for-the-badge&logo=windows)](https://github.com/eaeoz/movie-downloader/releases/download/1.0.0/Movie.Downloader_portable_1.0.0.exe)

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
- Click any completed download or library file to play in the built-in media player
- Browse your **Library** tree to find all downloaded files organized by folder
- Click the **Open Folder** button (📂) in the top bar to open the download directory in Explorer

### 6. System Tray

When minimized, the app lives in your system tray:

- **Show** — Restore the application window
- **Open Folder** — Open the downloads directory
- **Quit** — Fully exit the application

### 7. Settings

| Section | Options |
|---------|---------|
| **Letterboxd** | Set your Letterboxd username for watchlist sync |
| **Enabled Sources** | Toggle search sources on/off (YTS, ThePirateBay, RARBG, TorrentsCSV) |
| **Filters** | Min/max size, min/max seeders, sort by, category, result limit, quality filter, search append |
| **Download Location** | Custom download directory via folder picker |

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

## 📄 License

MIT

---

⭐ **Star this repository if you find it helpful!**  
Developed with ❤️ by **Sedat ERGOZ**
