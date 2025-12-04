# PowerShell script to create test PR for Droog AI

$repoOwner = "abhijeet1771"
$repoName = "AI-reviewer"
$branchName = "test-droog-ai-comprehensive"
$prTitle = "Test: Comprehensive Droog AI Feature Testing"
$prBody = @"
# Comprehensive Droog AI Test PR

This PR contains test files designed to test all Droog AI features:

## Test Coverage

### 1. Basic Code Review
- Calculator.java: Bugs, performance issues, missing null checks
- UserService.java: Index out of bounds, inefficient operations  
- SecurityService.java: Security vulnerabilities (SQL injection, hardcoded secrets)

### 2. Duplicate Code Detection
- DataProcessor.java: Contains 3 duplicate methods
- UserService.java: Contains duplicate search methods

### 3. Breaking Changes
- BreakingChanges.java: Method signature changes, return type changes, visibility changes

### 4. Modern Practices
- ModernPractices.java: Should use Stream API, Optional, Records, List.of()

### 5. Architecture Violations
- ArchitectureViolations.java: Circular dependencies, naming violations, magic numbers

## Expected Findings

- High Priority Issues: Security vulnerabilities, potential crashes
- Medium Priority Issues: Performance problems, code smells
- Low Priority Issues: Style issues, suggestions
- Duplicates: Multiple duplicate code patterns
- Breaking Changes: API signature changes
- Architecture Violations: Rule violations

## Testing

Run Droog AI review:
\`\`\`bash
npx tsx src/index.ts review --repo $repoOwner/$repoName --pr <pr_number> --enterprise
\`\`\`
"@

Write-Host "Creating test PR for Droog AI..." -ForegroundColor Cyan
Write-Host ""

# Check if test-pr directory exists
if (-not (Test-Path "test-pr")) {
    Write-Host "Error: test-pr directory not found!" -ForegroundColor Red
    Write-Host "Please create test files first." -ForegroundColor Yellow
    exit 1
}

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not a git repository!" -ForegroundColor Red
    Write-Host "Please run this from the repository root." -ForegroundColor Yellow
    exit 1
}

# Check if branch exists
$branchExists = git branch --list $branchName
if ($branchExists) {
    Write-Host "Branch $branchName already exists. Switching to it..." -ForegroundColor Yellow
    git checkout $branchName
} else {
    Write-Host "Creating new branch: $branchName" -ForegroundColor Green
    git checkout -b $branchName
}

# Copy test files to a location in the repo
# Assuming we want to add them to a test directory
$testDir = "test-files-comprehensive"
if (-not (Test-Path $testDir)) {
    New-Item -ItemType Directory -Path $testDir | Out-Null
}

Write-Host "Copying test files..." -ForegroundColor Green
Copy-Item -Path "test-pr\*" -Destination $testDir -Recurse -Force

# Add files
Write-Host "Adding files to git..." -ForegroundColor Green
git add $testDir

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

# Push
Write-Host "Pushing to remote..." -ForegroundColor Green
git push -u origin $branchName

Write-Host ""
Write-Host "✅ Branch pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to: https://github.com/$repoOwner/$repoName/compare/main...$branchName" -ForegroundColor Yellow
Write-Host "2. Click 'Create Pull Request'" -ForegroundColor Yellow
Write-Host "3. Use title: '$prTitle'" -ForegroundColor Yellow
Write-Host "4. Use body from CREATE_TEST_PR.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or create PR via GitHub CLI:" -ForegroundColor Cyan
Write-Host "gh pr create --title '$prTitle' --body '$prBody' --base main --head $branchName" -ForegroundColor Yellow
