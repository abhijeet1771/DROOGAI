# Manual PR Setup Instructions

Since the current directory is not a git repository, here are manual steps to create the test PR.

## Option 1: Copy Files to Repository (Recommended)

### Step 1: Navigate to Your Repository
```powershell
cd C:\path\to\AI-reviewer  # Or wherever your repository is
```

### Step 2: Run Setup Script
```powershell
# From the AI-reviewer repository directory
.\SETUP_TEST_PR.ps1
```

Or if you're in Droog AI directory:
```powershell
.\SETUP_TEST_PR.ps1 -RepoPath "C:\path\to\AI-reviewer"
```

### Step 3: Create PR on GitHub
Go to: https://github.com/abhijeet1771/AI-reviewer/compare/main...test-droog-ai-comprehensive

---

## Option 2: Manual Git Commands

### Step 1: Navigate to Repository
```powershell
cd C:\path\to\AI-reviewer
```

### Step 2: Create Branch
```powershell
git checkout -b test-droog-ai-comprehensive
```

### Step 3: Copy Test Files
```powershell
# Copy from Droog AI project
Copy-Item -Path "D:\DROOG AI\test-pr\*" -Destination "test-files-comprehensive" -Recurse
```

### Step 4: Add and Commit
```powershell
git add test-files-comprehensive
git commit -m "Test: Add comprehensive Droog AI test files"
```

### Step 5: Push
```powershell
git push -u origin test-droog-ai-comprehensive
```

### Step 6: Create PR
Go to: https://github.com/abhijeet1771/AI-reviewer/compare/main...test-droog-ai-comprehensive

---

## Option 3: Use GitHub Web Interface

1. **Upload Files via GitHub:**
   - Go to your repository on GitHub
   - Click "Add file" → "Create new file"
   - Create folder: `test-files-comprehensive/`
   - Upload each test file one by one

2. **Create PR:**
   - After committing, create a new branch
   - Create PR from that branch

---

## Quick Copy Script

If you want to quickly copy files, run this from the **AI-reviewer repository**:

```powershell
# From AI-reviewer repository directory
$sourcePath = "D:\DROOG AI\test-pr"
$destPath = "test-files-comprehensive"

New-Item -ItemType Directory -Path $destPath -Force | Out-Null
Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force

Write-Host "Files copied! Now run:" -ForegroundColor Green
Write-Host "  git add test-files-comprehensive" -ForegroundColor Yellow
Write-Host "  git commit -m 'Test: Add comprehensive Droog AI test files'" -ForegroundColor Yellow
Write-Host "  git push -u origin test-droog-ai-comprehensive" -ForegroundColor Yellow
```

---

## Test Files Location

Test files are located at:
```
D:\DROOG AI\test-pr\
```

Files included:
- Calculator.java
- UserService.java
- SecurityService.java
- DataProcessor.java
- BreakingChanges.java
- ModernPractices.java
- ArchitectureViolations.java
- README.md

---

## After PR is Created

Test Droog AI:
```bash
npx tsx src/index.ts review --repo abhijeet1771/AI-reviewer --pr <pr_number> --enterprise --post
```

---

**Need help?** Check `SETUP_TEST_PR.ps1` for automated setup.




