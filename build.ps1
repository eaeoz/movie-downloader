$ErrorActionPreference = "Stop"

Write-Host "=== Movie Downloader Build Script ===" -ForegroundColor Cyan

# Step 1: Generate icon
Write-Host "[1/4] Generating icon..." -ForegroundColor Yellow
node create-icon.js
if (-not $?) { throw "Icon generation failed" }

# Step 2: TypeScript compile
Write-Host "[2/4] Compiling TypeScript..." -ForegroundColor Yellow
npx tsc
if (-not $?) { throw "TypeScript compilation failed" }

# Step 3: Build portable
Write-Host "[3/4] Building portable executable..." -ForegroundColor Yellow
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win portable --x64 --publish never
if (-not $?) { throw "Portable build failed" }

# Step 4: Build setup installer
Write-Host "[4/4] Building setup installer..." -ForegroundColor Yellow
npx electron-builder --win nsis --x64 --publish never
if (-not $?) { throw "Setup build failed" }

Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host "Output files in dist/" -ForegroundColor Green
Get-ChildItem -LiteralPath "dist" -Filter "*.exe" | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
