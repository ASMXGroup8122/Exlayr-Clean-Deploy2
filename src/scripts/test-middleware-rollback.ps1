# Test script for middleware rollback
$ErrorActionPreference = "Stop"

function Test-FileContent {
    param (
        [string]$File1,
        [string]$File2,
        [string]$Description
    )
    
    if (-not (Test-Path $File1) -or -not (Test-Path $File2)) {
        Write-Host "❌ $Description - One or both files missing" -ForegroundColor Red
        return $false
    }
    
    $hash1 = Get-FileHash $File1
    $hash2 = Get-FileHash $File2
    
    if ($hash1.Hash -eq $hash2.Hash) {
        Write-Host "✅ $Description - Files match" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $Description - Files differ" -ForegroundColor Red
        return $false
    }
}

function Test-DirectoryContent {
    param (
        [string]$Dir1,
        [string]$Dir2,
        [string]$Description
    )
    
    if (-not (Test-Path $Dir1) -or -not (Test-Path $Dir2)) {
        Write-Host "❌ $Description - One or both directories missing" -ForegroundColor Red
        return $false
    }
    
    $files1 = Get-ChildItem $Dir1 -Recurse | Where-Object { -not $_.PSIsContainer }
    $files2 = Get-ChildItem $Dir2 -Recurse | Where-Object { -not $_.PSIsContainer }
    
    if ($files1.Count -ne $files2.Count) {
        Write-Host "❌ $Description - Different number of files" -ForegroundColor Red
        return $false
    }
    
    $allMatch = $true
    foreach ($file1 in $files1) {
        $relativePath = $file1.FullName.Substring($Dir1.Length)
        $file2Path = Join-Path $Dir2 $relativePath
        
        if (-not (Test-Path $file2Path)) {
            Write-Host "❌ $Description - Missing file: $relativePath" -ForegroundColor Red
            $allMatch = $false
            continue
        }
        
        $hash1 = Get-FileHash $file1.FullName
        $hash2 = Get-FileHash $file2Path
        
        if ($hash1.Hash -ne $hash2.Hash) {
            Write-Host "❌ $Description - Files differ: $relativePath" -ForegroundColor Red
            $allMatch = $false
        }
    }
    
    if ($allMatch) {
        Write-Host "✅ $Description - All files match" -ForegroundColor Green
    }
    return $allMatch
}

Write-Host "`nStarting middleware rollback tests...`n" -ForegroundColor Cyan

# Test 1: Check backup exists
Write-Host "Test 1: Verifying backup exists..." -ForegroundColor Yellow
$backupExists = Test-Path "src\middleware-backup-current"
if ($backupExists) {
    Write-Host "✅ Backup directory exists" -ForegroundColor Green
} else {
    Write-Host "❌ Backup directory not found" -ForegroundColor Red
    exit 1
}

# Test 2: Verify backup contents
Write-Host "`nTest 2: Verifying backup contents..." -ForegroundColor Yellow
$backupValid = $true
if (-not (Test-Path "src\middleware-backup-current\middleware.ts")) {
    Write-Host "❌ Missing middleware.ts in backup" -ForegroundColor Red
    $backupValid = $false
}
if (-not (Test-Path "src\middleware-backup-current\middleware")) {
    Write-Host "❌ Missing middleware directory in backup" -ForegroundColor Red
    $backupValid = $false
}
if ($backupValid) {
    Write-Host "✅ Backup contains required files" -ForegroundColor Green
}

# Test 3: Test rollback script
Write-Host "`nTest 3: Testing rollback process..." -ForegroundColor Yellow

# Create test modification
$testFile = "src\middleware\test-modification.ts"
if (-not (Test-Path $testFile)) {
    "// Test modification" | Out-File $testFile
    Write-Host "Created test modification" -ForegroundColor Cyan
}

# Run rollback
Write-Host "Running rollback script..." -ForegroundColor Cyan
$rollbackOutput = & ".\src\scripts\rollback-middleware.ps1" 2>&1
$rollbackSuccess = $LASTEXITCODE -eq 0

if ($rollbackSuccess) {
    Write-Host "✅ Rollback script completed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Rollback script failed" -ForegroundColor Red
    Write-Host "Rollback output:" -ForegroundColor Yellow
    $rollbackOutput
}

# Test 4: Verify file restoration
Write-Host "`nTest 4: Verifying file restoration..." -ForegroundColor Yellow
$restoredCorrectly = $true

# Check middleware.ts
$middlewareMatch = Test-FileContent `
    "src\middleware.ts" `
    "src\middleware-backup-current\middleware.ts" `
    "middleware.ts restoration"
$restoredCorrectly = $restoredCorrectly -and $middlewareMatch

# Check middleware directory
$directoryMatch = Test-DirectoryContent `
    "src\middleware" `
    "src\middleware-backup-current\middleware" `
    "middleware directory restoration"
$restoredCorrectly = $restoredCorrectly -and $directoryMatch

# Test 5: Verify test modification was removed
Write-Host "`nTest 5: Verifying test modification removal..." -ForegroundColor Yellow
if (Test-Path $testFile) {
    Write-Host "❌ Test modification still exists" -ForegroundColor Red
    $restoredCorrectly = $false
} else {
    Write-Host "✅ Test modification was removed" -ForegroundColor Green
}

# Final Results
Write-Host "`nTest Results Summary:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "1. Backup Exists: $([char]8730)" -ForegroundColor $(if ($backupExists) { "Green" } else { "Red" })
Write-Host "2. Backup Valid: $([char]8730)" -ForegroundColor $(if ($backupValid) { "Green" } else { "Red" })
Write-Host "3. Rollback Success: $([char]8730)" -ForegroundColor $(if ($rollbackSuccess) { "Green" } else { "Red" })
Write-Host "4. Files Restored: $([char]8730)" -ForegroundColor $(if ($restoredCorrectly) { "Green" } else { "Red" })

if ($backupExists -and $backupValid -and $rollbackSuccess -and $restoredCorrectly) {
    Write-Host "`n✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Some tests failed!" -ForegroundColor Red
}

Write-Host "`nTest complete.`n" -ForegroundColor Cyan 