# AGENTS.md - tor-dl

## Project Type
Node.js CLI tool for torrent search and download using TypeScript.

## Quick Start
```bash
npm install
npm run build
node dist/bin/tor-dl.js --help
```

## Build Commands
- `npm run build` - Compile TypeScript to `dist/`
- `npm run start` or `node dist/bin/tor-dl.js` - Run CLI

## Common Commands
```bash
node dist/bin/tor-dl.js search "movie title"
node dist/bin/tor-dl.js 1              # Download result #1
node dist/bin/tor-dl.js -u               # Update sources
node dist/bin/tor-dl.js -v               # Version
```

## Critical Fixes (Do Not Remove)

### 1. WebTorrent ESM Issue
- **Problem**: WebTorrent v2 is ESM-only, breaks with CommonJS require()
- **Fix**: Use webtorrent@1.9.7 (CommonJS compatible)
- **Command**: `npm install webtorrent@1.9.7`

### 2. YTS Size Parsing Bug
- **Problem**: YTS API returns size as string ("1.05 GB"), not bytes
- **Fix**: Must use custom `parseSizeStr()` function - do NOT use `parseInt()` or `Number()`
- **Location**: `src/sources/yts.ts`

## Key Files
- `sources.json` - Enable/disable torrent sources, contains updateUrl
- `filters.json` - Default search filters (category, minSeeds, minSize, maxSize, sortBy, order)
- `src/sources/` - Individual scraper implementations
- `src/download/engine.ts` - WebTorrent download engine

## Architecture
- TypeScript compiled to CommonJS (`module: "commonjs"` in tsconfig.json)
- CLI built with Commander.js
- Scraper results cached in memory for download by number
- Multiple source scrapers (YTS, torrents-csv, EZTV, etc.)

## Important Quirks
- Torrent sites frequently change HTML structure - scrapers may break
- Many sites block scrapers (403, Cloudflare, rate limiting)
- Only YTS and torrents-csv currently work reliably (API-based sources)
- Download shows magnet link but actual torrent download requires WebTorrent working