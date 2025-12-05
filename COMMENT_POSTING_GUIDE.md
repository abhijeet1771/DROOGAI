# Comment Posting Guide

## ✅ Yes, Comments Will Be Added!

When you use the `--post` flag, Droog AI **will post comments directly to your GitHub PR**.

---

## How Comment Posting Works

### Command
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

### What Gets Posted

#### 1. **High Severity Issues** → Inline Comments
- ✅ Posted as **inline comments** on specific lines
- ✅ Appears directly on the code line
- ✅ Up to **10 high severity comments per file**
- ✅ Format: `**HIGH**: Issue message + **Suggestion**: Full code suggestion`

**Example:**
```
Line 34 in Calculator.java:
**HIGH**: Potential StackOverflowError for negative numbers

**Suggestion**: 
public int factorial(int n) {
    if (n < 0) {
        throw new IllegalArgumentException("Factorial not defined for negative numbers");
    }
    if (n <= 1) {
        return 1;
    }
    int result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}
```

#### 2. **Medium/Low Severity Issues** → Summary Comments
- ✅ Posted as **summary comments** in PR discussion
- ✅ Grouped by file
- ✅ Format: Markdown summary with all issues

**Example:**
```
## Review Summary for `Calculator.java`

### Medium Severity

- **Line 45**: O(n^2) performance - string concatenation in loop
  - *Suggestion*: Use String.join() or StringBuilder

- **Line 50**: Missing null check
  - *Suggestion*: Use Optional for null safety

### Low Severity

- **Line 60**: Magic number detected
  - *Suggestion*: Extract to constant
```

---

## Comment Posting Strategy

### Rate Limiting
- ✅ **1 comment per second** (respects GitHub API limits)
- ✅ Prevents API rate limit errors
- ✅ Ensures all comments are posted successfully

### Comment Limits
- ✅ **Up to 10 high severity comments per file** as inline comments
- ✅ Remaining issues posted as summary comments
- ✅ Prevents comment spam
- ✅ Keeps PR review focused

### Comment Format

**Inline Comments (High Severity):**
```markdown
**HIGH**: Issue description

**Suggestion**: Complete code fix
```

**Summary Comments (Medium/Low):**
```markdown
## Review Summary for `filename.java`

### Medium Severity
- **Line X**: Issue
  - *Suggestion*: Fix

### Low Severity
- **Line Y**: Issue
  - *Suggestion*: Fix
```

---

## What You'll See

### In GitHub PR

1. **Inline Comments** (High Severity)
   - Appear on specific code lines
   - Visible in "Files changed" tab
   - Can be replied to and resolved

2. **Summary Comments** (Medium/Low)
   - Appear in PR conversation
   - Grouped by file
   - Easy to review all issues at once

### In Console Output

```
📤 Posting 25 comment(s) to GitHub...

  ✓ Posted comment on Calculator.java:34
  ✓ Posted comment on SecurityService.java:12
  ✓ Posted comment on UserService.java:20
  ✓ Posted summary for Calculator.java
  ✓ Posted summary for DataProcessor.java

✓ Finished posting comments.
```

---

## Example: Test PR Comments

For the comprehensive test PR, you'll see:

### High Severity Inline Comments
- ✅ SecurityService.java:12 - Hardcoded API key
- ✅ SecurityService.java:18 - SQL injection vulnerability
- ✅ UserService.java:20 - Missing bounds check
- ✅ Calculator.java:34 - StackOverflowError risk
- ✅ And more...

### Summary Comments
- ✅ Calculator.java - Medium/low issues summary
- ✅ DataProcessor.java - Duplicate code summary
- ✅ ModernPractices.java - Modern Java suggestions
- ✅ And more...

---

## Requirements

### For Comment Posting to Work:

1. ✅ **GitHub Token** with write permissions
   ```bash
   export GITHUB_TOKEN=your_token_here
   ```

2. ✅ **Use `--post` flag**
   ```bash
   npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
   ```

3. ✅ **Token Permissions**
   - `repo` scope (for private repos)
   - `public_repo` scope (for public repos)
   - `pull_requests:write` permission

---

## Verification

### Check if Comments Were Posted:

1. **In GitHub PR:**
   - Go to "Files changed" tab
   - Look for inline comments on code lines
   - Check PR conversation for summary comments

2. **In Console:**
   - Look for "✓ Posted comment" messages
   - Check for "✓ Finished posting comments"

3. **Common Issues:**
   - ❌ "Failed to post comment" → Check token permissions
   - ❌ "No comments to post" → No issues found
   - ❌ Rate limit errors → Wait and retry

---

## Comment Posting Flow

```
1. Review PR with Droog AI
   ↓
2. Generate review report
   ↓
3. Filter comments by severity
   ↓
4. Post high severity as inline comments (up to 10 per file)
   ↓
5. Post medium/low as summary comments
   ↓
6. Rate limit: 1 comment/second
   ↓
7. All comments posted to GitHub PR ✅
```

---

## Tips

### Best Practices

1. **Use `--enterprise` flag** for comprehensive review
   ```bash
   npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
   ```

2. **Review before posting** (optional)
   ```bash
   # First, review without posting
   npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
   
   # Check report.json, then post if satisfied
   npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
   ```

3. **Check token permissions**
   - Ensure GitHub token has write access
   - Token must have `repo` or `public_repo` scope

---

## Summary

✅ **Yes, comments WILL be added!**

- **High severity** → Inline comments on code lines
- **Medium/Low severity** → Summary comments in PR
- **Rate limited** → 1 comment/second
- **Respects limits** → Up to 10 inline comments per file
- **All comments** → Posted directly to GitHub PR

**Just use the `--post` flag and comments will appear in your PR!** 🚀




