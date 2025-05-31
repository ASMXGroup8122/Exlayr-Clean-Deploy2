# Restart Development Server Script
# This script helps resolve ChunkLoadError and other webpack issues

Write-Host "🔄 Restarting development server..." -ForegroundColor Green

# Stop any running Next.js processes
Write-Host "⏹️  Stopping any running processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Remove .next directory
Write-Host "🗑️  Removing .next cache directory..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ .next directory removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .next directory not found" -ForegroundColor Cyan
}

# Clean npm cache (optional)
Write-Host "🧹 Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Reinstall dependencies
Write-Host "📦 Reinstalling dependencies..." -ForegroundColor Yellow
npm install

# Start development server
Write-Host "🚀 Starting development server..." -ForegroundColor Green
npm run dev 