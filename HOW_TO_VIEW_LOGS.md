# How to View Droog AI Logs & Check if It's Running

## 📍 Where to See Console/Logs

### Option 1: GitHub Actions Tab (Main Way)

1. **Go to your repository on GitHub**
2. **Click "Actions" tab** (top menu)
3. **You'll see:**
   - List of all workflow runs
   - Status (✅ Success, ❌ Failed, 🟡 In Progress)
   - When it ran
   - Which PR triggered it

4. **Click on a workflow run** to see:
   - Full console output
   - Each step's logs
   - Errors (if any)
   - Review results

### Example View:
```
Actions Tab
  ├── Droog AI Code Review (Latest)
  │   ├── ✅ Success (2 min ago)
  │   ├── Click to see logs →
  │   └── PR #123 triggered
  │
  └── Droog AI Index Update
      ├── ✅ Success (5 min ago)
      └── main branch updated
```

---

## 🔍 How to Check if Droog AI Started Automatically

### Method 1: Check Actions Tab

1. Open your repository
2. Go to **Actions** tab
3. Look for:
   - **"Droog AI Code Review"** workflow
   - Status should show:
     - 🟡 **Yellow dot** = Running
     - ✅ **Green check** = Completed
     - ❌ **Red X** = Failed

### Method 2: Check PR Comments

1. Open the PR
2. Look for:
   - **Comments from "github-actions"** bot
   - Comment saying "🤖 Droog AI Review Complete"
   - Individual line comments with issues

### Method 3: Check Workflow File

1. Go to **Actions** tab
2. Click **"Droog AI Code Review"** workflow
3. Click **"Run workflow"** dropdown
4. You'll see:
   - Last run time
   - Status
   - Can manually trigger

---

## 📊 What You'll See in Logs

### When PR Review Runs:

```
🔍 Reviewing PR #123...
📋 Phase 0: Collecting All Data & Building Context...
✓ Extracted 45 symbols from 12 PR files
✓ Loaded 1200 symbols from main branch index
📋 Phase 1: AI Review (with Full Context)...
✓ Found 8 issues (2 high, 4 medium, 2 low)
📋 Phase 2: Advanced Analysis...
✓ Found 3 security issues
✓ Found 2 performance issues
✅ Review complete! Comments posted to PR.
```

### When Index Update Runs:

```
📦 Indexing branch: main...
📥 Fetching repository tree...
✓ Found 150 files to index
✓ Processed 150 files (2500 symbols)
✅ Indexing complete!
🤖 Committed index to repository
```

---

## 🔔 How to Get Notifications

### Option 1: GitHub Notifications

1. Go to **Settings** → **Notifications**
2. Enable:
   - ✅ Workflow runs
   - ✅ Pull request comments
   - ✅ Actions

### Option 2: Email Notifications

1. GitHub automatically emails on:
   - Workflow failures
   - PR comments
   - Workflow completion

### Option 3: Slack/Teams Integration (Advanced)

Can add webhook to notify team when review completes.

---

## 🐛 Troubleshooting: Not Seeing Logs?

### Problem: Workflow not showing in Actions tab

**Solution:**
1. Check if workflows are in `.github/workflows/` folder
2. Check if files are committed and pushed
3. Check if workflow YAML syntax is correct

### Problem: Workflow not triggering

**Check:**
1. PR is from same repository (not fork)
2. Workflow file is in `.github/workflows/`
3. File name ends with `.yml` or `.yaml`
4. YAML syntax is valid

### Problem: Can't see console output

**Solution:**
1. Click on workflow run
2. Click on job (e.g., "review")
3. Click on step (e.g., "Run Droog AI Review")
4. Full logs will be visible

---

## 📸 Visual Guide

### Step 1: Go to Actions Tab
```
Repository
  ├── Code
  ├── Issues
  ├── Pull requests
  ├── Actions  ← Click here
  └── Settings
```

### Step 2: See Workflow Runs
```
Actions Tab
  ├── All workflows
  │   ├── Droog AI Code Review
  │   │   ├── ✅ Latest run (2 min ago)
  │   │   ├── ✅ Run #5 (1 hour ago)
  │   │   └── ❌ Run #4 (2 hours ago) - Click to see error
  │   │
  │   └── Droog AI Index Update
  │       └── ✅ Latest run (5 min ago)
```

### Step 3: View Logs
```
Click on workflow run
  ↓
See job: "review"
  ↓
See steps:
  ├── Checkout code ✅
  ├── Setup Node.js ✅
  ├── Install dependencies ✅
  ├── Build Droog AI ✅
  └── Run Droog AI Review ✅
      ↓
      Click to see full console output
```

---

## 🎯 Quick Check Commands

### Check if workflows exist:
```bash
# In your project
ls .github/workflows/
# Should show:
# - droog-review.yml
# - droog-index.yml
```

### Check last workflow run:
```bash
# Via GitHub CLI (if installed)
gh run list --workflow="Droog AI Code Review"
```

---

## 💡 Pro Tips

1. **Bookmark Actions Tab**: Quick access to see all runs
2. **Watch Repository**: Get notifications for all workflow runs
3. **Check PR Comments**: Fastest way to see if review completed
4. **Use Filters**: Filter by workflow, status, branch in Actions tab

---

## 📝 Summary

**To see console/logs:**
- Go to **Actions** tab in GitHub
- Click on workflow run
- Click on job → step
- See full console output

**To check if it's running:**
- **Actions** tab shows status (🟡 Running, ✅ Success, ❌ Failed)
- **PR comments** show review results
- **Email notifications** (if enabled)

**Quick check:**
1. Open PR
2. Look for comments from "github-actions"
3. Or go to Actions tab → See latest run

---

**That's it! All logs are in GitHub Actions tab! 🚀**







