# Troubleshooting: Workflow Stuck on "Waiting for Runner"

## 🔍 Problem
Workflow is stuck at "Waiting for a runner to pick up this job..." for more than 2 minutes.

## ✅ Solutions

### Solution 1: Enable GitHub Actions (Most Common)

1. **Go to Repository Settings**
   - Repository → **Settings** tab
   - Scroll to **Actions** → **General**

2. **Check Actions Permissions**
   - Under "Actions permissions":
     - Select: **"Allow all actions and reusable workflows"**
   - Under "Workflow permissions":
     - Select: **"Read and write permissions"**
     - Check: **"Allow GitHub Actions to create and approve pull requests"**

3. **Save Changes**

### Solution 2: Check Repository Type

**For Public Repositories:**
- GitHub Actions is free and unlimited
- Should work automatically

**For Private Repositories:**
- Free tier: 2,000 minutes/month
- Check if you've exceeded the limit
- Go to: Settings → Billing → Actions

### Solution 3: Cancel and Retry

1. **Cancel Current Run**
   - Actions tab → Click on workflow run
   - Click "Cancel workflow"

2. **Re-trigger Workflow**
   - Go to PR
   - Close and reopen PR (triggers workflow again)
   - Or: Actions tab → "Run workflow" → Select branch

### Solution 4: Check Workflow File Syntax

Make sure `.github/workflows/droog-review.yml` has correct YAML syntax:

```yaml
name: Droog AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
```

### Solution 5: Check Repository Settings

1. **Repository → Settings → Actions**
2. **Verify:**
   - ✅ Actions enabled
   - ✅ No restrictions on workflows
   - ✅ Permissions set correctly

### Solution 6: Manual Trigger

If automatic trigger doesn't work:

1. **Actions tab** → **Droog AI Code Review** workflow
2. Click **"Run workflow"**
3. Select branch: `test-droog-ai-integration`
4. Enter PR number: `6`
5. Click **"Run workflow"**

## 🎯 Quick Fix Steps

1. **Repository → Settings → Actions → General**
2. **Enable:**
   - ✅ Allow all actions
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create PRs
3. **Save**
4. **Cancel current run**
5. **Re-trigger workflow**

## 📝 Common Causes

1. **Actions not enabled** (most common)
2. **Insufficient permissions**
3. **Private repo with no Actions minutes left**
4. **Workflow file syntax error**
5. **GitHub Actions service issue** (rare)

## 🔍 How to Verify

After enabling Actions:
1. Create a new commit in PR (triggers workflow)
2. Or manually trigger from Actions tab
3. Should see runner pick up within 10-30 seconds

---

**Most likely fix: Enable GitHub Actions in repository settings!**



