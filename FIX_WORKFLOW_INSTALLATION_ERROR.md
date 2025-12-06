# Fix "DroogAI Installation Failed" Error

## Problem

The workflow is failing with:
```
❌ DroogAI installation failed
💡 Solutions:
1. Ensure DroogAI is pushed to GitHub at: https://github.com/abhijeet1771/AI-reviewer
2. Or publish DroogAI to npm and install via npm
3. Or use a different installation method
Error: Process completed with exit code 1.
```

## Root Cause

The workflow is using the **wrong repository URL**:
- ❌ **Wrong:** `https://github.com/abhijeet1771/AI-reviewer`
- ✅ **Correct:** `https://github.com/abhijeet1771/DROOGAI`

## Solution

### Option 1: Fix the Installation Step (Quick Fix)

Find the workflow file (usually `.github/workflows/test.yml` or similar) and update the installation step:

**Before (WRONG):**
```yaml
- name: Install DroogAI from GitHub
  id: install-droog
  run: |
    if git clone https://github.com/abhijeet1771/AI-reviewer.git /tmp/droog-ai 2>/dev/null; then
      # ... rest of installation
    else
      echo "❌ DroogAI installation failed"
      echo "💡 Solutions:"
      echo "1. Ensure DroogAI is pushed to GitHub at: https://github.com/abhijeet1771/AI-reviewer"
      exit 1
    fi
```

**After (CORRECT):**
```yaml
- name: Install DroogAI from GitHub
  id: install-droog
  run: |
    echo "📦 Installing DroogAI from GitHub..."
    
    # Clone DroogAI repository (CORRECT URL)
    if git clone https://github.com/abhijeet1771/DROOGAI.git /tmp/droog-ai 2>/dev/null; then
      echo "✅ DroogAI repository cloned successfully"
      cd /tmp/droog-ai
      
      # Verify package.json exists
      if [ ! -f "package.json" ]; then
        echo "❌ package.json not found in cloned repository"
        echo "Current directory: $(pwd)"
        echo "Files in root:"
        ls -la
        echo "available=false" >> $GITHUB_OUTPUT
        exit 1
      fi
      
      echo "✅ package.json found"
      
      # Install dependencies
      if [ -f "package-lock.json" ]; then
        npm ci
      else
        npm install
      fi
      
      # Build
      npm run build
      
      # Verify build
      if [ -f "dist/index.js" ]; then
        echo "available=true" >> $GITHUB_OUTPUT
        echo "✅ DroogAI installed and built successfully"
      else
        echo "available=false" >> $GITHUB_OUTPUT
        echo "❌ DroogAI build failed - dist/index.js not found"
        exit 1
      fi
    else
      echo "❌ DroogAI installation failed"
      echo "💡 Solutions:"
      echo "1. Ensure DroogAI is pushed to GitHub at: https://github.com/abhijeet1771/DROOGAI"
      echo "2. Or publish DroogAI to npm and install via npm"
      echo "3. Or use a different installation method"
      echo "available=false" >> $GITHUB_OUTPUT
      exit 1
    fi
  continue-on-error: true
```

### Option 2: Use Reusable Workflow (Recommended)

Instead of installing DroogAI, use the reusable workflow:

```yaml
name: Run Tests

on:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      # ... your other test steps ...
      
      - name: Run DroogAI Review
        uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master
        with:
          pr_number: "1"
          post_comments: true
        secrets:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Option 3: Use checkout action (Alternative)

```yaml
- name: Checkout DroogAI
  uses: actions/checkout@v4
  with:
    repository: abhijeet1771/DROOGAI
    path: .droog-ai
    
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    
- name: Install and Build DroogAI
  working-directory: .droog-ai
  run: |
    npm ci
    npm run build
    
- name: Run Review
  working-directory: .droog-ai
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    node dist/index.js review --repo "${{ github.repository }}" --pr 1 --enterprise --post
```

## Key Changes

1. ✅ **Updated URL:** `DROOGAI` instead of `AI-reviewer`
2. ✅ **Added verification:** Check if `package.json` exists
3. ✅ **Added debugging:** List files if `package.json` missing
4. ✅ **Better error messages:** Show correct repository URL
5. ✅ **Build verification:** Check if `dist/index.js` exists after build

## Verify Fix

After updating the workflow:
1. Push the changes to your repository
2. Run the workflow again
3. Check the workflow logs - should show:
   - ✅ DroogAI repository cloned successfully
   - ✅ package.json found
   - ✅ DroogAI installed and built successfully

## Where to Find the Workflow

The error is likely in:
- `.github/workflows/test.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/review.yml`
- Or any workflow file that tries to install DroogAI

Search for:
- `AI-reviewer` (wrong)
- `DroogAI installation failed` (error message)
- `git clone.*droog` (installation step)

## Still Having Issues?

If the error persists:
1. Check that `https://github.com/abhijeet1771/DROOGAI` is accessible
2. Verify `package.json` exists in the root of DROOGAI repository
3. Check GitHub Actions logs for more details
4. Ensure the workflow has proper permissions

