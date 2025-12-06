# Create timestamped backup of the project
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "D:\DROOG_AI_BACKUP_$timestamp"
$sourceDir = "D:\DROOG AI"

Write-Host "📦 Creating backup..." -ForegroundColor Cyan
Write-Host "   Source: $sourceDir" -ForegroundColor Gray
Write-Host "   Destination: $backupDir" -ForegroundColor Gray
Write-Host ""

# Create backup directory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Copy files (exclude node_modules, .git, backups)
$excludeDirs = @('node_modules', '.git', 'DROOG_AI_BACKUP_*', '*.backup')
$files = Get-ChildItem -Path $sourceDir -Recurse -File | Where-Object {
    $exclude = $false
    foreach ($pattern in $excludeDirs) {
        if ($_.FullName -like "*\$pattern\*") {
            $exclude = $true
            break
        }
    }
    return -not $exclude
}

$totalFiles = $files.Count
$copied = 0

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($sourceDir.Length + 1)
    $destPath = Join-Path $backupDir $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $file.FullName $destPath -Force
    $copied++
    
    if ($copied % 50 -eq 0) {
        Write-Progress -Activity "Backing up files" -Status "$copied / $totalFiles" -PercentComplete (($copied / $totalFiles) * 100)
    }
}

Write-Progress -Activity "Backing up files" -Completed

$size = (Get-ChildItem -Path $backupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "✅ BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "📦 Location: $backupDir" -ForegroundColor Cyan
Write-Host "💾 Size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan
Write-Host "📄 Files: $copied" -ForegroundColor Cyan
Write-Host ""








