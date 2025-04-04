# Rollback script for middleware changes
$ErrorActionPreference = "Stop"

Write-Host "Starting middleware rollback process..." -ForegroundColor Yellow

# Check if backup exists
if (-not (Test-Path "src\middleware-backup-current")) {
    Write-Host "Error: Backup directory not found at src\middleware-backup-current" -ForegroundColor Red
    exit 1
}

try {
    # Create temporary backup of current state (in case rollback fails)
    Write-Host "Creating temporary backup of current state..." -ForegroundColor Cyan
    $tempBackupDir = "src\middleware-temp-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $tempBackupDir | Out-Null
    if (Test-Path "src\middleware.ts") {
        Copy-Item "src\middleware.ts" -Destination $tempBackupDir
    }
    if (Test-Path "src\middleware") {
        Copy-Item "src\middleware" -Destination $tempBackupDir -Recurse
    }

    # Remove current middleware files
    Write-Host "Removing current middleware files..." -ForegroundColor Cyan
    if (Test-Path "src\middleware.ts") {
        Remove-Item "src\middleware.ts" -Force
    }
    if (Test-Path "src\middleware") {
        Remove-Item "src\middleware" -Recurse -Force
    }

    # Restore from backup
    Write-Host "Restoring from backup..." -ForegroundColor Cyan
    Copy-Item "src\middleware-backup-current\middleware.ts" -Destination "src\"
    Copy-Item "src\middleware-backup-current\middleware" -Destination "src\" -Recurse

    Write-Host "Rollback completed successfully!" -ForegroundColor Green
    Write-Host "A temporary backup of the rolled-back state was created at: $tempBackupDir" -ForegroundColor Yellow
    Write-Host "You can delete it once you verify everything is working correctly." -ForegroundColor Yellow

} catch {
    Write-Host "Error during rollback: $_" -ForegroundColor Red
    Write-Host "Attempting to restore from temporary backup..." -ForegroundColor Yellow
    
    if (Test-Path $tempBackupDir) {
        # Remove any partially restored files
        if (Test-Path "src\middleware.ts") {
            Remove-Item "src\middleware.ts" -Force
        }
        if (Test-Path "src\middleware") {
            Remove-Item "src\middleware" -Recurse -Force
        }

        # Restore from temporary backup
        Copy-Item "$tempBackupDir\middleware.ts" -Destination "src\" -ErrorAction SilentlyContinue
        Copy-Item "$tempBackupDir\middleware" -Destination "src\" -Recurse -ErrorAction SilentlyContinue
        
        Write-Host "Restored to state before rollback attempt." -ForegroundColor Yellow
    } else {
        Write-Host "Critical error: Could not find temporary backup to restore from." -ForegroundColor Red
    }
    exit 1
} 