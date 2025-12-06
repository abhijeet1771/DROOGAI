# Script to create PR for testing modern coding practices

Write-Host "🚀 Creating PR for modern coding practices testing..." -ForegroundColor Cyan
Write-Host ""

$repoPath = "D:\test-java-project"
$testFilesSource = "D:\DROOG AI\test-files-modern"

# Navigate to repository
if (Test-Path $repoPath) {
    Set-Location $repoPath
} else {
    Write-Host "❌ Repository not found at: $repoPath" -ForegroundColor Red
    exit 1
}

# Create new branch
$branchName = "test-modern-practices"
Write-Host "Creating branch: $branchName" -ForegroundColor Yellow
git checkout -b $branchName 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Branch exists, switching to it..." -ForegroundColor Yellow
    git checkout $branchName
}

# Copy test files
Write-Host ""
Write-Host "📝 Copying test files..." -ForegroundColor Cyan
if (-not (Test-Path "test-files-modern")) {
    New-Item -ItemType Directory -Path "test-files-modern" | Out-Null
}
Copy-Item "$testFilesSource\*" -Destination "test-files-modern\" -Recurse -Force

# Add test files
Write-Host "📝 Adding test files to git..." -ForegroundColor Cyan
git add test-files-modern/

# Commit
$msg = "Add test files for modern coding practices`n`n- DataProcessor.java: Manual loops instead of Stream API`n- CollectionUtils.java: Manual collection operations`n- StringProcessor.java: Manual string operations`n`nThese files test:`n- Stream API usage (compact, functional style)`n- Modern Java features (Records, Optional, etc.)`n- Storage efficiency and best practices"
git commit -m $msg

Write-Host ""
Write-Host "✅ Files committed!" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Pushing to remote..." -ForegroundColor Cyan
git push -u origin $branchName

Write-Host ""
Write-Host "✅ PR ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Create PR on GitHub:" -ForegroundColor Cyan
Write-Host "https://github.com/abhijeet1771/AI-reviewer/pull/new/$branchName" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then test with:" -ForegroundColor Cyan
Write-Host "npx tsx src/index.ts --repo abhijeet1771/AI-reviewer --pr <PR_NUMBER> --post" -ForegroundColor Yellow








