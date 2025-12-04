# Script to set up and push test files to AI-reviewer repository

Write-Host "🚀 Setting up test files for AI-reviewer repository..." -ForegroundColor Cyan
Write-Host ""

$repoPath = "D:\test-java-project"
$testFilesSource = "D:\DROOG AI\test-files"

# Check if test-java-project repo exists
if (Test-Path $repoPath) {
    Write-Host "✅ Found test-java-project repository at: $repoPath" -ForegroundColor Green
    Set-Location $repoPath
} else {
    Write-Host "❌ Repository not found at: $repoPath" -ForegroundColor Red
    Write-Host "Please ensure the repository exists or update the path in the script." -ForegroundColor Yellow
    exit 1
}

# Check current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Yellow

# Create new branch for test PR
$branchName = "test-new-review-features"
Write-Host "Creating branch: $branchName" -ForegroundColor Yellow
git checkout -b $branchName 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Branch exists, switching to it..." -ForegroundColor Yellow
    git checkout $branchName
}

# Copy test files
Write-Host ""
Write-Host "📝 Copying test files..." -ForegroundColor Cyan
if (-not (Test-Path "test-files")) {
    New-Item -ItemType Directory -Path "test-files" | Out-Null
}
Copy-Item "$testFilesSource\*" -Destination "test-files\" -Recurse -Force

# Add test files
Write-Host "📝 Adding test files to git..." -ForegroundColor Cyan
git add test-files/

# Check if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "💾 Committing changes..." -ForegroundColor Cyan
    $commitMessage = @"
Add test files for new review features

- UserService.java: Contains magic numbers, old-style loops, duplicate code
- ProductService.java: Contains duplicate patterns, bad string comparison
- OrderProcessor.java: Contains duplicate validation, old Date API usage

These files test:
7. Better coding practices
8. Better available method or approach  
9. Duplicate code detection
"@
    git commit -m $commitMessage
    
    Write-Host ""
    Write-Host "✅ Files committed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📤 Next step: Push the branch" -ForegroundColor Cyan
    Write-Host "Run: git push origin $branchName" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Then create PR on GitHub:" -ForegroundColor Cyan
    Write-Host "https://github.com/abhijeet1771/AI-reviewer/compare/main...$branchName" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  No changes to commit. Files may already be committed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Gray

