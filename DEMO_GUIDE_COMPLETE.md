# DROOG AI - Complete Demo Guide

## 🎯 Demo Overview

**Duration:** 15-20 minutes  
**Audience:** Developers, Tech Leads, Architects  
**Goal:** Showcase DROOG AI's enterprise-grade code review capabilities

---

## 📋 Pre-Demo Checklist

### Before Starting Demo:
- ✅ Project installed (`npm install`)
- ✅ `.env` file configured with API keys
- ✅ Test repository ready (or use public repo)
- ✅ Test PR created (or use existing PR)
- ✅ Terminal/Command prompt open
- ✅ Browser open to GitHub PR

---

## 🎬 Demo Script

### Part 1: Introduction (2 minutes)

**What to Say:**
> "Today I'll demonstrate DROOG AI - an enterprise-grade AI code reviewer that provides Google/Meta-level code review capabilities. It analyzes pull requests, detects issues, finds duplicates, identifies breaking changes, and provides actionable suggestions."

**Key Points to Mention:**
- 85-90% of senior architect capabilities
- 31 specialized analysis modules
- Supports multiple languages (Java, Python, JavaScript, etc.)
- Integrates with GitHub
- Auto-fix generation

---

### Part 2: Basic Review (3 minutes)

**What to Do:**
1. Open terminal
2. Navigate to project directory
3. Run basic review command

**Command:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123
```

**What to Say:**
> "Let's start with a basic review. I'll review this PR that adds a new feature. DROOG AI will analyze all changed files and detect bugs, security issues, and performance problems."

**What Happens:**
- Fetches PR data
- Analyzes files
- Shows progress
- Generates report

**What to Highlight:**
- "Notice how it processes files one by one"
- "It's using Gemini 2.5 Pro for intelligent analysis"
- "The review is comprehensive - checking correctness, security, performance, and code quality"

**Expected Output:**
```
🚀 Starting AI Code Review...
📦 Repository: owner/repo
🔢 PR #123
📥 Fetching PR data...
✓ Found PR: "Add new feature"
✓ Changed files: 5
🤖 Running AI analysis...
  ✓ Reviewing src/UserService.java...
  ✓ Reviewing src/DataProcessor.java...
📊 REVIEW RESULTS
Found 12 issue(s):
  - 3 high
  - 5 medium
  - 4 low
💾 Report saved to report.json
```

**What to Say:**
> "Great! We found 12 issues. Let me show you the report."

**Show report.json:**
- Open `report.json` in editor
- Highlight high-severity issues
- Show detailed suggestions

**Key Points:**
- "Each issue has severity, message, and complete code suggestion"
- "Not just 'add null check' - it provides the full updated method"
- "Issues are prioritized by severity"

---

### Part 3: Enterprise Review (5 minutes)

**What to Do:**
1. Run enterprise review command

**Command:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**What to Say:**
> "Now let's use enterprise mode. This adds advanced features like duplicate detection, breaking change detection, and architecture rule violations."

**What Happens:**
- Phase 0: Data collection
- Phase 1: AI review with context
- Phase 2-7: Advanced analysis

**What to Highlight:**
- "Notice the optimized flow - it collects all data first, then reviews with full context"
- "This reduces API calls by 90-95%"
- "Much faster and smarter review"

**Expected Output:**
```
🚀 Starting Enterprise Code Review...
📋 Phase 0: Collecting All Data & Building Context...
✓ Loaded 500 symbols from main branch index
✓ Extracted 25 symbols from 5 PR files
📋 Phase 1: AI-Powered Review with Full Context...
  ✓ Processing batch 1/1 (5 files)...
📋 Phase 2: Duplicate Detection...
  ✓ Found 3 duplicates within PR
📋 Phase 3: Breaking Change Detection...
  ✓ Found 1 breaking change
📊 ENTERPRISE REVIEW RESULTS
Found 15 issue(s):
🔄 Duplicates: 3 within PR
⚠️  Breaking Changes: 1
```

**What to Say:**
> "Excellent! Enterprise mode found additional issues: 3 duplicates and 1 breaking change. Let me show you the details."

**Show Duplicate Detection:**
- Open report.json
- Navigate to duplicates section
- Show similarity scores
- Explain impact

**Show Breaking Change:**
- Navigate to breakingChanges section
- Show old vs new signature
- Show impacted files
- Explain why it's breaking

**Key Points:**
- "Duplicate detection helps prevent code duplication"
- "Breaking change detection prevents accidental API breaks"
- "Impact analysis shows which files need updates"

---

### Part 4: Codebase Indexing (3 minutes)

**What to Do:**
1. Show indexing command

**Command:**
```bash
npx tsx src/index.ts index --repo owner/repo --branch main
```

**What to Say:**
> "For cross-repository duplicate detection, we need to index the codebase first. This indexes the main branch and builds a searchable index."

**What Happens:**
- Fetches repository tree
- Processes files
- Extracts symbols
- Generates embeddings
- Builds index

**Expected Output:**
```
📦 Indexing codebase...
📥 Fetching repository tree...
✓ Found 150 files
📋 Processing files...
  ✓ Processing src/UserService.java...
  ...
📊 INDEXING SUMMARY
Total files: 150
Processed: 150
Symbols indexed: 500
Embeddings generated: 500
✅ Indexing complete!
```

**What to Say:**
> "Indexing complete! Now when we review PRs, it can detect duplicates across the entire codebase, not just within the PR."

**Run Review Again:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**What to Highlight:**
- "Now it shows cross-repo duplicates"
- "It compares PR code with entire codebase"
- "Helps maintain code consistency"

**Key Points:**
- "Indexing is one-time setup"
- "Index is stored locally"
- "Fast similarity search using embeddings"

---

### Part 5: Post Comments to GitHub (2 minutes)

**What to Do:**
1. Show comment posting feature

**Command:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

**What to Say:**
> "DROOG AI can post comments directly to GitHub PRs. High-severity issues appear as inline comments, and medium/low issues appear as summary comments."

**What Happens:**
- Reviews PR
- Posts comments to GitHub
- Shows progress

**Expected Output:**
```
...
💬 Posting comments to GitHub...
  ✓ Posted 5 inline comments
  ✓ Posted 1 summary comment
✅ Review complete!
```

**What to Do:**
1. Open GitHub PR in browser
2. Show inline comments
3. Show summary comment

**What to Highlight:**
- "Comments appear directly on code lines"
- "Team can see issues immediately"
- "No need to check report.json separately"

**Key Points:**
- "Respects GitHub API rate limits"
- "Smart comment posting (high priority first)"
- "Can post auto-fixes as GitHub suggestions"

---

### Part 6: Auto-Fix Generation (2 minutes)

**What to Do:**
1. Show auto-fix feature

**Command:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --auto-fix
```

**What to Say:**
> "DROOG AI can generate automatic code fixes. It doesn't just suggest - it provides complete fixed code."

**Show Auto-Fixes in Report:**
- Open report.json
- Navigate to autoFixes section
- Show original code vs fixed code
- Explain the fix

**What to Say:**
> "For low-risk fixes, we can even auto-apply them."

**Command:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --auto-fix --auto-apply
```

**What to Highlight:**
- "Auto-fixes are risk-assessed"
- "Low-risk fixes can be auto-applied"
- "High-risk fixes require approval"

**Key Points:**
- "Saves developer time"
- "Consistent fixes across codebase"
- "Can post as GitHub suggestions"

---

### Part 7: Advanced Features (2 minutes)

**What to Show:**
1. Test Automation Framework Review
2. Design Pattern Detection
3. Complexity Analysis
4. Security Scanning

**What to Say:**
> "DROOG AI has 31 specialized analysis modules. Let me show you a few:"

**Test Automation:**
- "Automatically detects Selenium, Playwright, WebdriverIO"
- "Validates complete flow: Locator → Method → Step Def → Feature"
- "Finds context mismatches and broken flows"

**Design Patterns:**
- "Detects design patterns (Factory, Strategy, Builder, etc.)"
- "Suggests appropriate patterns"
- "Detects anti-patterns (God Object, Long Method, etc.)"

**Complexity:**
- "Calculates cyclomatic complexity"
- "Identifies complexity hotspots"
- "Suggests refactoring"

**Security:**
- "OWASP Top 10 vulnerability detection"
- "SQL injection, XSS, IDOR detection"
- "Hardcoded secrets detection"

---

### Part 8: Summary & Q&A (2 minutes)

**What to Say:**
> "To summarize, DROOG AI provides:"
- Comprehensive code review (bugs, security, performance)
- Duplicate detection (within PR + cross-repo)
- Breaking change detection
- 31 specialized analysis modules
- Auto-fix generation
- GitHub integration
- Test automation framework review

**What to Say:**
> "It's production-ready and can be integrated into your CI/CD pipeline. Any questions?"

---

## 🎯 Key Demo Points to Emphasize

### 1. **Comprehensive Analysis**
- Not just syntax checking
- Real architectural insights
- Context-aware suggestions

### 2. **Performance Optimized**
- 90-95% reduction in API calls
- Fast processing
- Batch review with context

### 3. **Production Ready**
- Error handling
- Retry logic
- Graceful degradation

### 4. **Enterprise Features**
- Duplicate detection
- Breaking change detection
- Impact analysis
- Cross-repository analysis

### 5. **Developer Friendly**
- Complete code suggestions (not just hints)
- Auto-fix generation
- GitHub integration
- Easy to use CLI

---

## 💡 Demo Tips

### Tip 1: Prepare Test PR
- Create a PR with known issues
- Include duplicate code
- Include breaking changes
- Include security issues

### Tip 2: Show Real Examples
- Use actual code from your project
- Show real issues found
- Demonstrate real fixes

### Tip 3: Be Interactive
- Ask audience what they want to see
- Show specific features on demand
- Answer questions as they come

### Tip 4: Show Report.json
- Open in editor
- Navigate through sections
- Show detailed findings
- Explain severity levels

### Tip 5: Show GitHub Integration
- Open PR in browser
- Show inline comments
- Show summary comment
- Demonstrate "Apply suggestion" button

---

## 🚨 Common Demo Issues & Solutions

### Issue 1: API Rate Limit
**Problem:** Rate limit hit during demo

**Solution:**
- "This is expected with free tier (2 req/min)"
- "Tool automatically retries"
- "Production use would have higher limits"

### Issue 2: Slow Processing
**Problem:** Review takes too long

**Solution:**
- "First review indexes codebase"
- "Subsequent reviews are faster"
- "Enterprise mode optimizes API calls"

### Issue 3: No Issues Found
**Problem:** PR has no issues

**Solution:**
- "Great! The code is clean"
- "Let me show you what it checks"
- "Try with a PR that has known issues"

### Issue 4: Build Errors
**Problem:** TypeScript compilation errors

**Solution:**
- Run `npm install` before demo
- Run `npm run build` to verify
- Have backup plan ready

---

## 📊 Demo Metrics to Share

### Performance
- **API Calls:** 1-2 (vs 30+ without optimization)
- **Processing Time:** 2-5 minutes (vs 15+ minutes)
- **Review Quality:** Context-aware (vs file-by-file)

### Coverage
- **Analysis Modules:** 31
- **Issue Categories:** 15+
- **Supported Languages:** Java, Python, JavaScript, TypeScript, etc.

### Accuracy
- **Confidence Scores:** 0.6-1.0
- **False Positive Rate:** Low (context-aware)
- **Coverage:** 85-90% senior architect level

---

## ✅ Post-Demo Checklist

### After Demo:
- ✅ Answer questions
- ✅ Share documentation links
- ✅ Provide setup instructions
- ✅ Offer trial/demo access
- ✅ Collect feedback

---

## 🎬 Closing Statement

**What to Say:**
> "DROOG AI brings enterprise-grade code review capabilities to your team. It's like having a senior architect review every PR, 24/7. It catches issues early, prevents bugs, and helps maintain code quality at scale."

**Next Steps:**
- "I can help you set it up"
- "We can integrate it into your CI/CD"
- "Let's schedule a trial"

---

**Good luck with your demo!** 🚀

Remember: Be confident, show real examples, and emphasize the value it brings to the team.


