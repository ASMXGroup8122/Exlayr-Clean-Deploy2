# Performance monitoring script for Next.js development
Write-Host "🚀 Next.js Performance Monitor" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Check if development server is running
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "✅ Development server is running (PID: $($nodeProcesses.Id -join ', '))" -ForegroundColor Green
} else {
    Write-Host "❌ No development server found" -ForegroundColor Red
    exit 1
}

# Check port status
$port3000 = netstat -ano | findstr ":3000.*LISTENING"
$port3001 = netstat -ano | findstr ":3001.*LISTENING"

if ($port3000) {
    Write-Host "🌐 Server running on http://localhost:3000" -ForegroundColor Cyan
} elseif ($port3001) {
    Write-Host "🌐 Server running on http://localhost:3001" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  No listening port found" -ForegroundColor Yellow
}

# Performance tips
Write-Host ""
Write-Host "🔥 Performance Tips:" -ForegroundColor Yellow
Write-Host "- Use 'npm run dev:fast' for Turbopack mode" -ForegroundColor White
Write-Host "- Clear cache if experiencing issues: Remove-Item -Recurse -Force .next" -ForegroundColor White
Write-Host "- Monitor module count in terminal output" -ForegroundColor White
Write-Host "- Target: Under 300 modules per page, under 1s compile time" -ForegroundColor White

# Show current cache size
if (Test-Path ".next") {
    $cacheSize = (Get-ChildItem -Path ".next" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "📁 Current cache size: $([math]::Round($cacheSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "📁 No cache directory found" -ForegroundColor Gray
} 