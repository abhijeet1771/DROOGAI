# Fix DroogAI Installation Error

## Problem
The workflow is failing with: "package.json not found in DroogAI repository"

## Root Cause
The workflow that's trying to install DroogAI is either:
1. Using the wrong repository URL (AI-reviewer instead of DROOGAI)
2. Looking in the wrong directory after cloning
3. The clone is failing silently

## Solution

### If this is in testDroogAI workflow:

Update `d:/testDroogAI/.github/workflows/test.yml`:

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
      fi
    else
      echo "⚠️  DroogAI repository not found on GitHub"
      echo "available=false" >> $GITHUB_OUTPUT
    fi
  continue-on-error: true
```

### Key Changes:
1. ✅ Updated URL: `DROOGAI` instead of `AI-reviewer`
2. ✅ Added verification: Check if package.json exists
3. ✅ Added debugging: List files if package.json missing
4. ✅ Better error messages

## Verify on GitHub

Check that package.json is in the root:
- Go to: https://github.com/abhijeet1771/DROOGAI
- You should see `package.json` in the file list
- Click on it to verify it's there

## Alternative: Use Reusable Workflow

Instead of installing, use the reusable workflow:

```yaml
- name: Call DroogAI Review
  uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master
  with:
    pr_number: "1"
  secrets:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```


