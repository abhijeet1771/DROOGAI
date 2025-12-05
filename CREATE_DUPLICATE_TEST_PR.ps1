# Script to create PR for testing duplicate code detection

Write-Host "🚀 Creating PR to test duplicate code detection..." -ForegroundColor Cyan
Write-Host ""

$repoPath = "D:\test-java-project"
$testFilesSource = "D:\DROOG AI\test-files-duplicate"

# Navigate to repository
if (Test-Path $repoPath) {
    Set-Location $repoPath
} else {
    Write-Host "❌ Repository not found at: $repoPath" -ForegroundColor Red
    exit 1
}

# Create new branch
$branchName = "test-duplicate-code-detection"
Write-Host "Creating branch: $branchName" -ForegroundColor Yellow
git checkout -b $branchName 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Branch exists, switching to it..." -ForegroundColor Yellow
    git checkout $branchName
}

# Copy test files
Write-Host ""
Write-Host "📝 Copying test files with duplicate code..." -ForegroundColor Cyan
if (-not (Test-Path "test-files-duplicate")) {
    New-Item -ItemType Directory -Path "test-files-duplicate" | Out-Null
}
Copy-Item "$testFilesSource\*" -Destination "test-files-duplicate\" -Recurse -Force

# Add test files
Write-Host "📝 Adding test files to git..." -ForegroundColor Cyan
git add test-files-duplicate/

# Commit
$msg = "Add test files for duplicate code detection`n`n- ValidationUtils.java: Contains duplicate validation methods`n- DataProcessor.java: Contains duplicate find-by-id patterns`n- CalculatorService.java: Contains duplicate calculation and string building patterns`n`nThese files test Feature 9: Duplicate code detection"
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





