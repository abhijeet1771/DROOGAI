# Quick PR Setup - Run this from your AI-reviewer repository directory

Write-Host "Quick Test PR Setup" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Check if in git repo
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: Not in a git repository!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please navigate to your AI-reviewer repository first:" -ForegroundColor Yellow
    Write-Host "  cd C:\path\to\AI-reviewer" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Source and destination
$sourcePath = "D:\DROOG AI\test-pr"
$branchName = "test-droog-ai-comprehensive"
$testDir = "test-files-comprehensive"

# Check if source exists
if (-not (Test-Path $sourcePath)) {
    Write-Host "❌ Error: Test files not found at $sourcePath" -ForegroundColor Red
    Write-Host "Please ensure Droog AI test files exist." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Found test files at: $sourcePath" -ForegroundColor Green
Write-Host ""

# Create/switch branch
$branchExists = git branch --list $branchName
if ($branchExists) {
    Write-Host "Branch exists. Switching..." -ForegroundColor Yellow
    git checkout $branchName
} else {
    Write-Host "Creating branch: $branchName" -ForegroundColor Green
    git checkout -b $branchName
}

# Remove existing test dir if exists
if (Test-Path $testDir) {
    Write-Host "Removing existing $testDir..." -ForegroundColor Yellow
    Remove-Item -Path $testDir -Recurse -Force
}

# Create and copy
Write-Host "Copying test files..." -ForegroundColor Green
New-Item -ItemType Directory -Path $testDir | Out-Null
Copy-Item -Path "$sourcePath\*" -Destination $testDir -Recurse -Force

Write-Host "✓ Files copied:" -ForegroundColor Green
Get-ChildItem -Path $testDir -File | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Gray
}

# Git operations
Write-Host ""
Write-Host "Adding to git..." -ForegroundColor Green
git add $testDir

Write-Host "Committing..." -ForegroundColor Green
git commit -m "Test: Add comprehensive Droog AI test files" 2>&1 | Out-Null

Write-Host "Pushing..." -ForegroundColor Green
git push -u origin $branchName 2>&1 | Out-Null

Write-Host ""
Write-Host "✅ Done! Branch created and pushed." -ForegroundColor Green
Write-Host ""
Write-Host "Create PR at:" -ForegroundColor Cyan
Write-Host "  https://github.com/abhijeet1771/AI-reviewer/compare/main...$branchName" -ForegroundColor Yellow
Write-Host ""







