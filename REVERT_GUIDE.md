# Revert Guide: How to Rollback if Reusable Workflow Fails

## 🛡️ Backup Created

**Backup Tag:** `v3.1-backup-before-reusable-workflow`

This tag contains the exact state before implementing reusable workflow changes. You can safely revert to this point if anything goes wrong.

---

## 🔄 How to Revert

### Option 1: Revert to Backup Tag (Recommended)

```bash
# View the backup tag
git tag -l "v3.1-backup-before-reusable-workflow"

# Revert to backup tag
git checkout v3.1-backup-before-reusable-workflow

# Create a new branch from backup (if you want to keep current work)
git checkout -b revert-to-backup

# Or force reset to backup (destructive - loses current changes)
git reset --hard v3.1-backup-before-reusable-workflow
git push --force origin master
```

### Option 2: Revert Specific Files

If only the workflow file has issues:

```bash
# Revert just the workflow file
git checkout v3.1-backup-before-reusable-workflow -- .github/workflows/droog-review-reusable.yml

# Commit the revert
git commit -m "revert: restore reusable workflow to backup version"
git push
```

### Option 3: Undo Last Commit

If you just pushed and want to undo:

```bash
# Undo last commit (keeps changes)
git reset --soft HEAD~1

# Or undo and discard changes
git reset --hard HEAD~1

# Force push (if already pushed)
git push --force origin master
```

---

## ✅ Verify Backup

Before reverting, verify the backup exists:

```bash
# List all tags
git tag -l

# View backup tag details
git show v3.1-backup-before-reusable-workflow

# Check what files are in backup
git ls-tree -r v3.1-backup-before-reusable-workflow --name-only
```

---

## 🚨 If Workflow Fails

### Common Issues & Quick Fixes

1. **"dist/index.js not found"**
   - Build step failed
   - Check Node.js version (should be 20)
   - Check if `npm run build` succeeds

2. **"Repository not found"**
   - Check repository name: `abhijeet1771/DROOGAI`
   - Verify repository is public or has proper access

3. **"Permission denied"**
   - Check workflow permissions
   - Verify secrets are set correctly

4. **"npm ci failed"**
   - Check if `package-lock.json` exists
   - Try `npm install` instead

### Quick Test

Test the workflow locally first:

```bash
# Clone DroogAI
git clone https://github.com/abhijeet1771/DROOGAI.git /tmp/droog-ai
cd /tmp/droog-ai

# Install and build
npm ci
npm run build

# Verify build
ls -la dist/index.js

# Test run
node dist/index.js review --repo owner/repo --pr 1 --enterprise
```

---

## 📋 Revert Checklist

Before reverting:
- [ ] Identify the specific issue
- [ ] Check if it's a workflow issue or code issue
- [ ] Try quick fixes first
- [ ] Document the issue
- [ ] Create a new branch for revert
- [ ] Test after revert

After reverting:
- [ ] Verify workflow works
- [ ] Test a PR review
- [ ] Document what went wrong
- [ ] Plan fix for next attempt

---

## 🔗 Backup Tag Details

**Tag:** `v3.1-backup-before-reusable-workflow`  
**Created:** Before implementing reusable workflow improvements  
**Contains:** All code, workflows, and configurations in working state  
**Location:** Remote repository (pushed to origin)

---

## 💡 Best Practice

Always test workflow changes in a test repository first before using in production. Create a test PR and verify the workflow runs successfully.

