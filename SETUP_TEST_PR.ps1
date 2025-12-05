# Script to set up test PR in the actual repository
# Run this from the AI-reviewer repository directory

param(
    [string]$RepoPath = ""
)

$repoOwner = "abhijeet1771"
$repoName = "AI-reviewer"
$branchName = "test-droog-ai-comprehensive"
$prTitle = "Test: Comprehensive Droog AI Feature Testing"

Write-Host "Setting up test PR for Droog AI..." -ForegroundColor Cyan
Write-Host ""

# Determine repository path
if ($RepoPath -eq "") {
    # Try to find the repository
    $currentDir = Get-Location
    if (Test-Path ".git") {
        $RepoPath = $currentDir.Path
        Write-Host "Using current directory as repository: $RepoPath" -ForegroundColor Green
    } else {
        Write-Host "Error: Not in a git repository!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please either:" -ForegroundColor Yellow
        Write-Host "1. Navigate to the AI-reviewer repository directory" -ForegroundColor White
        Write-Host "2. Or run: .\SETUP_TEST_PR.ps1 -RepoPath 'C:\path\to\AI-reviewer'" -ForegroundColor White
        exit 1
    }
}

# Check if test-pr directory exists (from Droog AI project)
$droogAIPath = "D:\DROOG AI"
$testPrPath = Join-Path $droogAIPath "test-pr"

if (-not (Test-Path $testPrPath)) {
    Write-Host "Error: test-pr directory not found at $testPrPath" -ForegroundColor Red
    Write-Host "Please ensure test files exist in Droog AI project." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found test files at: $testPrPath" -ForegroundColor Green
Write-Host "Repository path: $RepoPath" -ForegroundColor Green
Write-Host ""

# Navigate to repository
Set-Location $RepoPath

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not a git repository at $RepoPath" -ForegroundColor Red
    exit 1
}

# Check current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan

# Check if branch exists
$branchExists = git branch --list $branchName
if ($branchExists) {
    Write-Host "Branch $branchName already exists. Switching to it..." -ForegroundColor Yellow
    git checkout $branchName
    git pull origin $branchName 2>$null
} else {
    Write-Host "Creating new branch: $branchName" -ForegroundColor Green
    git checkout -b $branchName
}

# Create test directory in repository
$testDir = "test-files-comprehensive"
if (Test-Path $testDir) {
    Write-Host "Removing existing $testDir directory..." -ForegroundColor Yellow
    Remove-Item -Path $testDir -Recurse -Force
}

New-Item -ItemType Directory -Path $testDir | Out-Null
Write-Host "Created directory: $testDir" -ForegroundColor Green

# Copy test files
Write-Host "Copying test files from Droog AI project..." -ForegroundColor Green
Copy-Item -Path "$testPrPath\*" -Destination $testDir -Recurse -Force

# Show copied files
Write-Host ""
Write-Host "Copied files:" -ForegroundColor Cyan
Get-ChildItem -Path $testDir -File | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Yellow
}

# Add files to git
Write-Host ""
Write-Host "Adding files to git..." -ForegroundColor Green
git add $testDir

# Check if there are changes to commit
$status = git status --porcelain
if ($status -eq "") {
    Write-Host "No changes to commit. Files may already be committed." -ForegroundColor Yellow
} else {
    # Commit
    Write-Host "Committing changes..." -ForegroundColor Green
    $commitMessage = "Test: Add comprehensive Droog AI test files

- Calculator.java: Bugs, performance issues
- UserService.java: Index bounds, duplicates
- SecurityService.java: Security vulnerabilities
- DataProcessor.java: Duplicate code patterns
- BreakingChanges.java: API breaking changes
- ModernPractices.java: Modern Java suggestions
- ArchitectureViolations.java: Architecture rule violations"

    git commit -m $commitMessage
    Write-Host "✓ Committed changes" -ForegroundColor Green
}

# Push
Write-Host ""
Write-Host "Pushing to remote..." -ForegroundColor Green
try {
    git push -u origin $branchName
    Write-Host "✓ Pushed to remote" -ForegroundColor Green
} catch {
    Write-Host "Error pushing to remote. You may need to push manually:" -ForegroundColor Red
    Write-Host "  git push -u origin $branchName" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Branch setup complete!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create PR on GitHub:" -ForegroundColor Cyan
Write-Host "   https://github.com/$repoOwner/$repoName/compare/main...$branchName" -ForegroundColor White
Write-Host ""
Write-Host "2. PR Title:" -ForegroundColor Cyan
Write-Host "   $prTitle" -ForegroundColor White
Write-Host ""
Write-Host "3. PR Body (copy from TEST_PR_GUIDE.md or use):" -ForegroundColor Cyan
Write-Host "   See test-pr/README.md for PR description" -ForegroundColor White
Write-Host ""
Write-Host "4. Or use GitHub CLI:" -ForegroundColor Cyan
Write-Host "   gh pr create --title '$prTitle' --body 'See test-files-comprehensive/README.md' --base main --head $branchName" -ForegroundColor White
Write-Host ""




