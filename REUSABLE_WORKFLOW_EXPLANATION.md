# Reusable Workflow: What It Does & Benefits

## What is a Reusable Workflow?

A **reusable workflow** is a GitHub Actions workflow that can be called from other workflows. Instead of copying the same workflow code to multiple repositories, you define it once in the DroogAI repository and call it from anywhere.

## What Does `droog-review-reusable.yml` Do?

When you call this workflow, it:

### 1. **Checks Out Your Repository Code**
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```
- Checks out the repository that **called** the workflow (not DroogAI)
- Gets all the PR files and changes

### 2. **Sets Up Node.js Environment**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```
- Installs Node.js 20
- Sets up npm cache for faster installs

### 3. **Installs DroogAI Dependencies**
```yaml
- name: Install dependencies
  run: |
    if [ -f "package-lock.json" ]; then
      npm ci
    else
      npm install
    fi
```
- Installs all DroogAI dependencies (TypeScript, Gemini SDK, etc.)
- Uses `npm ci` for faster, reliable installs

### 4. **Builds DroogAI**
```yaml
- name: Build Droog AI
  run: npm run build
```
- Compiles TypeScript to JavaScript
- Creates `dist/index.js` executable

### 5. **Loads Index (If Available)**
```yaml
- name: Load index if exists
  run: |
    if [ -f ".droog-embeddings.json" ]; then
      echo "index_exists=true" >> $GITHUB_OUTPUT
    fi
```
- Checks if codebase index exists
- Enables cross-repo duplicate detection if available

### 6. **Runs DroogAI Review**
```yaml
- name: Run Droog AI Review
  run: |
    node dist/index.js review --repo "${{ github.repository }}" --pr "${PR_NUMBER}" --enterprise --post
```
- Runs enterprise review on your PR
- Posts comments directly to your PR
- Generates comprehensive review report

### 7. **Uploads Review Report**
```yaml
- name: Upload review report
  uses: actions/upload-artifact@v4
  with:
    name: review-report
    path: report.json
```
- Saves review report as downloadable artifact
- Available for 7 days

---

## How to Use It

### In Your Repository's Workflow

Add this to your `.github/workflows/test.yml` (or any workflow):

```yaml
name: Run Tests

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      # ... your other test steps ...
      
      # Call DroogAI Review
      - name: Run DroogAI Review
        uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master
        with:
          pr_number: "${{ github.event.pull_request.number }}"
          post_comments: true
        secrets:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Required Secrets

In your repository, add these secrets:
1. **GEMINI_API_KEY** - Your Gemini API key
2. **GITHUB_TOKEN** - Usually auto-provided, but can be custom

---

## Benefits

### ✅ 1. **No Installation Needed**
- **Before:** You had to clone DroogAI, install dependencies, build it
- **After:** Just call the workflow - it handles everything
- **Saves:** 5-10 minutes per workflow run

### ✅ 2. **Always Up-to-Date**
- **Before:** If DroogAI updates, you need to update your workflow
- **After:** Always uses the latest version from `@master` branch
- **Benefit:** Get new features automatically

### ✅ 3. **Simpler Workflow Files**
- **Before:** 50+ lines of installation code in every workflow
- **After:** Just 8 lines to call the workflow
- **Benefit:** Easier to maintain, less error-prone

### ✅ 4. **Consistent Behavior**
- **Before:** Each repo might install/build differently
- **After:** Same installation process everywhere
- **Benefit:** Predictable, reliable results

### ✅ 5. **No Repository URL Issues**
- **Before:** Hardcoded URLs can break (like `AI-reviewer` vs `DROOGAI`)
- **After:** URL is managed in DroogAI repo only
- **Benefit:** No more "installation failed" errors

### ✅ 6. **Centralized Updates**
- **Before:** Fix bugs in 10 different workflow files
- **After:** Fix once in DroogAI, all repos benefit
- **Benefit:** Faster bug fixes, easier maintenance

### ✅ 7. **Better Error Handling**
- **Before:** Each workflow handles errors differently
- **After:** Consistent error handling in reusable workflow
- **Benefit:** Better debugging, clearer error messages

### ✅ 8. **Automatic Index Loading**
- **Before:** Manual steps to load codebase index
- **After:** Automatically detects and loads index if available
- **Benefit:** Better duplicate detection without extra steps

---

## Comparison: Before vs After

### Before (Manual Installation)
```yaml
- name: Install DroogAI
  run: |
    git clone https://github.com/abhijeet1771/DROOGAI.git /tmp/droog-ai
    cd /tmp/droog-ai
    npm install
    npm run build
    # ... 20+ more lines ...
    
- name: Run Review
  run: |
    cd /tmp/droog-ai
    node dist/index.js review --repo "${{ github.repository }}" --pr 1
```
**Problems:**
- ❌ 30+ lines of code
- ❌ Can fail if URL changes
- ❌ Need to update in every repo
- ❌ No error handling
- ❌ Takes 5-10 minutes

### After (Reusable Workflow)
```yaml
- name: Run DroogAI Review
  uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master
  with:
    pr_number: "${{ github.event.pull_request.number }}"
  secrets:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
**Benefits:**
- ✅ 8 lines of code
- ✅ Always works (URL managed centrally)
- ✅ Auto-updates when DroogAI updates
- ✅ Built-in error handling
- ✅ Faster execution

---

## Real-World Example

### Scenario: You have 5 repositories that need code reviews

**Without Reusable Workflow:**
- 5 workflow files × 30 lines = 150 lines of code
- If DroogAI updates, update 5 files
- If installation fails, debug 5 different places
- Total maintenance: High

**With Reusable Workflow:**
- 5 workflow files × 8 lines = 40 lines of code
- If DroogAI updates, no changes needed
- If installation fails, fix once in DroogAI
- Total maintenance: Low

---

## When to Use Reusable Workflow

### ✅ Use Reusable Workflow When:
- You have multiple repositories
- You want automatic updates
- You want simpler workflow files
- You want consistent behavior

### ❌ Don't Use When:
- You need to customize the installation process
- You need a specific old version of DroogAI
- You're testing DroogAI development changes

---

## Summary

**Reusable workflow = One workflow, many benefits:**
1. ✅ No installation code needed
2. ✅ Always up-to-date
3. ✅ Simpler workflow files
4. ✅ Consistent behavior
5. ✅ Centralized updates
6. ✅ Better error handling
7. ✅ Automatic index loading
8. ✅ No URL issues

**Bottom line:** Instead of copying 30+ lines of installation code to every repository, just call the reusable workflow with 8 lines. It's simpler, faster, and more reliable.



