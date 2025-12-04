# Fix DroogAI Installation in Workflows

## Problem
The workflow is trying to clone and install DroogAI every time, which is inefficient and can fail if the repository structure doesn't match.

## Solution Options

### Option 1: Use Reusable Workflow (Recommended)

Instead of installing DroogAI, call it as a reusable workflow:

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
        uses: actions/checkout@v4
        with:
          repository: abhijeet1771/DROOGAI  # or your DroogAI repo
          path: .droog-ai
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
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

### Option 2: Use npx (If Published to npm)

If DroogAI is published to npm:

```yaml
- name: Run DroogAI Review
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    npx droog-ai review --repo "${{ github.repository }}" --pr 1 --enterprise --post
```

### Option 3: Fix Current Installation (Quick Fix)

Fix the current installation step:

```yaml
- name: Install DroogAI from GitHub
  id: install-droog
  run: |
    echo "📦 Installing DroogAI from GitHub..."
    
    # Clone DroogAI repository
    if git clone https://github.com/abhijeet1771/DROOGAI.git /tmp/droog-ai 2>/dev/null; then
      echo "✅ DroogAI repository cloned successfully"
      cd /tmp/droog-ai
      
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
        echo "❌ DroogAI build failed"
      fi
    else
      echo "⚠️  DroogAI repository not found on GitHub"
      echo "available=false" >> $GITHUB_OUTPUT
    fi
  continue-on-error: true
```

### Option 4: Use as GitHub Action (Best for Multiple Repos)

Create a reusable workflow in DroogAI repo and call it:

**In DroogAI repo** (`.github/workflows/droog-review-reusable.yml`):
```yaml
name: Droog AI Review (Reusable)
on:
  workflow_call:
    inputs:
      pr_number:
        required: true
        type: string
    secrets:
      GEMINI_API_KEY:
        required: true
      GITHUB_TOKEN:
        required: true
# ... (already created above)
```

**In your test repo**:
```yaml
- name: Call DroogAI Review
  uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@main
  with:
    pr_number: "1"
  secrets:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Recommended Approach

For your use case, **Option 3 (Quick Fix)** is the fastest solution. The issue is likely:
1. Repository name might be wrong
2. Build step might be failing
3. Package.json might not be in root

Use the fixed version above which:
- ✅ Checks if build succeeded
- ✅ Uses npm ci for faster installs
- ✅ Verifies the build output exists
- ✅ Handles errors gracefully

