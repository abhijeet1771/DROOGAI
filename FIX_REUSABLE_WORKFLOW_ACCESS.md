# Fix: Reusable Workflow "workflow was not found" Error

## 🔴 Problem

```
Invalid workflow file: .github/workflows/droog-review.yml#L15
error parsing called workflow
".github/workflows/droog-review.yml"
-> "abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master"
: workflow was not found.
```

## ✅ Root Cause

The `DROOGAI` repository needs to **explicitly allow access** to its reusable workflows from other repositories (like `testDroogAI`).

## 🛠️ Solution: Enable Reusable Workflow Access

### Step 1: Go to DROOGAI Repository Settings

1. Navigate to: https://github.com/abhijeet1771/DROOGAI
2. Click **Settings** (top right, gear icon)
3. Click **Actions** in the left sidebar
4. Scroll down to **General** section

### Step 2: Enable Workflow Access

1. Find **"Workflow permissions"** section
2. Check **"Allow access to reusable workflows from other repositories"**
3. Click **Save**

### Step 3: Verify Repository Visibility

If the repository is **private**, also check:
- **Settings → General → Repository visibility**
- Ensure the repository is either:
  - **Public** (recommended for reusable workflows), OR
  - **Private** with proper access granted to `testDroogAI` repository

## 🔍 Alternative: Check Repository is Public

If you want to make it easier, you can make `DROOGAI` repository **public**:

1. Go to **Settings → General**
2. Scroll to **"Danger Zone"**
3. Click **"Change visibility"**
4. Select **"Make public"**

**Note:** Public repositories allow any repository to use their reusable workflows without additional permissions.

## ✅ Verification

After enabling access:

1. Go to `testDroogAI` repository
2. Create a new PR or push to existing PR #8
3. Check **Actions** tab - workflow should run successfully
4. No more "workflow was not found" error

## 📚 Reference

- [GitHub Docs: Reusing Workflows](https://docs.github.com/actions/learn-github-actions/reusing-workflows#access-to-reusable-workflows)
- Error link: https://github.com/abhijeet1771/testDroogAI/actions/runs/19983977678

## 🎯 Quick Checklist

- [ ] DROOGAI repository → Settings → Actions → General
- [ ] Enable "Allow access to reusable workflows from other repositories"
- [ ] Save changes
- [ ] Test by creating/pushing to PR in testDroogAI
- [ ] Verify workflow runs successfully

