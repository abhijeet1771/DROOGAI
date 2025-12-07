# DROOG AI - Complete User Guide (Step by Step)

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Basic Usage](#basic-usage)
5. [Enterprise Features](#enterprise-features)
6. [Advanced Features](#advanced-features)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure API Keys
Create `.env` file:
```env
GITHUB_TOKEN=your_github_token_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Review Your First PR
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123
```

**That's it!** You're ready to use DROOG AI.

---

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- GitHub Personal Access Token
- Google Gemini API Key

### Step-by-Step Installation

#### Step 1: Clone or Download Project
```bash
# If using git
git clone https://github.com/abhijeet1771/DROOGAI.git
cd DROOGAI

# Or download and extract ZIP file
```

#### Step 2: Install Node Dependencies
```bash
npm install
```

**Expected Output:**
```
added 150 packages in 30s
```

#### Step 3: Verify Installation
```bash
npm run build
```

**Expected Output:**
```
> droog-ai@1.0.0 build
> tsc
```

If no errors, installation is successful!

---

## ⚙️ Configuration

### Step 1: Get GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read org and team membership)
4. Click "Generate token"
5. **Copy the token immediately** (you won't see it again)

### Step 2: Get Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the API key

### Step 3: Create .env File

Create a file named `.env` in project root:

```env
GITHUB_TOKEN=ghp_your_github_token_here
GEMINI_API_KEY=AIzaSy_your_gemini_key_here
```

**Important:** Never commit `.env` file to git!

### Step 4: Verify Configuration

Test your setup:
```bash
npx tsx src/index.ts review --repo facebook/react --pr 28000
```

If it works, configuration is complete!

---

## 📝 Basic Usage

### Command 1: Review a Pull Request

#### Basic Review (Simple)
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123
```

**What it does:**
- Fetches PR from GitHub
- Analyzes all changed files
- Detects bugs, security issues, performance problems
- Generates `report.json` with findings

**Example:**
```bash
npx tsx src/index.ts review --repo abhijeet1771/AI-reviewer --pr 3
```

**Output:**
```
🚀 Starting AI Code Review...

📦 Repository: abhijeet1771/AI-reviewer
🔢 PR #3

📥 Fetching PR data...
✓ Found PR: "Add new feature"
✓ Changed files: 5
✓ Base: main ← Head: feature-branch

🤖 Running AI analysis...
  ✓ Reviewing src/UserService.java...
  ✓ Reviewing src/DataProcessor.java...

============================================================
📊 REVIEW RESULTS
============================================================

Found 12 issue(s):
  - 3 high
  - 5 medium
  - 4 low

💾 Report saved to report.json
```

#### Enterprise Review (Advanced)
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**Additional Features:**
- Duplicate code detection
- Breaking change detection
- Architecture rule violations
- Cross-repository duplicate detection
- Confidence scores

**Example:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**Output:**
```
🚀 Starting Enterprise Code Review...

📋 Phase 0: Collecting All Data & Building Context...
✓ Loaded 500 symbols from main branch index
✓ Extracted 25 symbols from 5 PR files

📋 Phase 1: AI-Powered Review with Full Context...
  ✓ Processing batch 1/1 (5 files)...

📋 Phase 2: Duplicate Detection...
  ✓ Found 3 duplicates within PR
  ✓ Found 2 cross-repo duplicates

📋 Phase 3: Breaking Change Detection...
  ✓ Found 1 breaking change

============================================================
📊 ENTERPRISE REVIEW RESULTS
============================================================

Found 15 issue(s):
  - 4 high
  - 6 medium
  - 5 low

🔄 Duplicates: 3 within PR, 2 cross-repo
⚠️  Breaking Changes: 1
```

#### Post Comments to GitHub
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

**What it does:**
- Reviews PR
- Posts high-severity issues as inline comments
- Posts medium/low issues as summary comments
- Comments appear directly on PR lines

**Example:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

**Output:**
```
...
💬 Posting comments to GitHub...
  ✓ Posted 5 inline comments
  ✓ Posted 1 summary comment
✅ Review complete!
```

---

### Command 2: Index Codebase

**Purpose:** Index your codebase for advanced features (cross-repo duplicate detection, breaking change detection)

#### Step 1: Index Main Branch
```bash
npx tsx src/index.ts index --repo owner/repo --branch main
```

**What it does:**
- Fetches all files from main branch
- Extracts symbols (classes, methods, functions)
- Generates embeddings for similarity search
- Builds call graph (method dependencies)
- Stores in local index (`.droog-embeddings.json`)

**Example:**
```bash
npx tsx src/index.ts index --repo abhijeet1771/AI-reviewer --branch main
```

**Output:**
```
📦 Indexing codebase...

📥 Fetching repository tree...
✓ Found 150 files

📋 Processing files...
  ✓ Processing src/UserService.java...
  ✓ Processing src/DataProcessor.java...
  ...

📊 INDEXING SUMMARY
============================================================
Total files: 150
Processed: 150
Symbols indexed: 500
Embeddings generated: 500

✅ Indexing complete!
```

**Time:** Usually 2-5 minutes for medium-sized repos

#### Step 2: Use Index for Reviews
After indexing, enterprise reviews automatically use the index:
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**Benefits:**
- Cross-repo duplicate detection
- Breaking change detection
- Impact analysis

---

### Command 3: Analyze Single File

**Purpose:** Analyze a specific file for issues and patterns

```bash
npx tsx src/index.ts analyze --file path/to/file.java
```

**Example:**
```bash
npx tsx src/index.ts analyze --file src/UserService.java
```

**Output:**
```
🚀 Analyzing file...

📄 File: src/UserService.java

📋 Extracting symbols...
✓ Found 6 symbols:
   - class: UserService (public)
   - method: getUserById (public)
     Parameters: (id: String)
     Returns: User
   - method: createUser (public)
     Parameters: (user: User)
     Returns: User
   ...

📋 Checking for duplicates...
⚠️  Found 1 potential duplicate:
   - Similar to: src/UserService.java::getUserById (95.2% similar)

✅ Analysis complete!
```

**With Repository Context:**
```bash
npx tsx src/index.ts analyze --file src/UserService.java --repo owner/repo
```

This enables duplicate detection against the entire codebase.

---

### Command 4: Generate PR Summary

**Purpose:** Generate a markdown summary of PR review

```bash
npx tsx src/index.ts summarize --repo owner/repo --pr 123
```

**What it does:**
- Uses existing `report.json` if available (fast)
- Or runs new review if `--force` flag used
- Generates markdown summary
- Saves to `pr-summary.md`

**Example:**
```bash
npx tsx src/index.ts summarize --repo owner/repo --pr 123
```

**Output:**
```
🚀 Generating PR Summary...

📦 Repository: owner/repo
🔢 PR #123

📄 Found existing report.json, using it for summary...

📝 Generating summary...

============================================================
📊 PR SUMMARY
============================================================
# PR Summary: Add new feature

**PR #123** | Base: `main` ← Head: `feature-branch`

---

## 📊 Overview

- **Total Issues:** 12
  - 🔴 High: 3
  - 🟡 Medium: 5
  - 🟢 Low: 4
- **Changed Files:** 5

## 🔄 Duplicate Code Detection

- **Within PR:** 3 duplicate(s) found
- **Cross-Repository:** 2 duplicate(s) found

...

💾 Summary saved to pr-summary.md

✅ Summary generation complete!
```

**Force New Review:**
```bash
npx tsx src/index.ts summarize --repo owner/repo --pr 123 --force
```

---

## 🏢 Enterprise Features

### Feature 1: Duplicate Detection

#### Within PR
Automatically detects duplicate code within the PR:
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**Output includes:**
```json
{
  "duplicates": {
    "withinPR": 3,
    "details": [
      {
        "symbol1": "UserService.java::getUserById",
        "symbol2": "ProductService.java::getProductById",
        "similarity": 0.92,
        "type": "similar"
      }
    ]
  }
}
```

#### Cross-Repository
Requires indexing first:
```bash
# Step 1: Index codebase
npx tsx src/index.ts index --repo owner/repo --branch main

# Step 2: Review PR (automatically uses index)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**Output includes:**
```json
{
  "duplicates": {
    "crossRepo": 2,
    "details": [
      {
        "symbol1": "PR: UserService.java::getUserById",
        "symbol2": "main: src/services/UserService.java::getUserById",
        "similarity": 0.95,
        "type": "exact"
      }
    ]
  }
}
```

---

### Feature 2: Breaking Change Detection

Automatically detects API changes that break existing code:

**Example:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**Output:**
```
⚠️  Breaking Changes: 1
   Impacted files: 3

Details:
- UserService.java::getUserById: Signature changed
  Old: getUserById(String id)
  New: getUserById(String id, boolean includeDeleted)
  Affects 3 call site(s)
```

**Report includes:**
```json
{
  "breakingChanges": {
    "count": 1,
    "impactedFiles": ["Service1.java", "Service2.java", "Service3.java"],
    "details": [
      {
        "symbol": "UserService.java::getUserById",
        "changeType": "signature",
        "oldSignature": "getUserById(String id)",
        "newSignature": "getUserById(String id, boolean includeDeleted)",
        "callSites": 3,
        "severity": "high"
      }
    ]
  }
}
```

---

### Feature 3: Auto-Fix Generation

Generate automatic code fixes:

```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --auto-fix
```

**What it does:**
- Reviews code
- Generates fixed code for issues
- Includes fixes in report

**Report includes:**
```json
{
  "autoFixes": {
    "fixes": [
      {
        "file": "UserService.java",
        "line": 45,
        "issue": "Missing null check",
        "originalCode": "return user.getName();",
        "fixedCode": "return user != null ? user.getName() : null;",
        "risk": "low"
      }
    ]
  }
}
```

**Auto-Apply Fixes:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --auto-fix --auto-apply
```

**What it does:**
- Generates fixes
- Auto-applies low-risk fixes
- Prompts for high-risk fixes

---

## 🔧 Advanced Features

### Test Automation Framework Review

Specialized review for Selenium, Playwright, WebdriverIO:

```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**Automatically detects:**
- Test automation frameworks
- Validates flow: Locator → Method → Step Def → Feature File
- Checks best practices
- Finds duplicate locators/methods

**Report includes:**
```json
{
  "testAutomation": {
    "framework": "selenium",
    "flowIssues": [
      {
        "type": "context_mismatch",
        "locator": "rightSidebarButton",
        "method": "clickButton()",
        "step_def": "@When(\"I click on button\")",
        "issue": "Step definition doesn't mention 'right sidebar' context",
        "severity": "high"
      }
    ]
  }
}
```

---

## 🐛 Troubleshooting

### Issue 1: "GitHub token required"

**Problem:**
```
❌ GitHub token required. Use --token or set GITHUB_TOKEN env var.
```

**Solution:**
1. Check `.env` file exists
2. Verify `GITHUB_TOKEN` is set
3. Or use `--token` flag:
   ```bash
   npx tsx src/index.ts review --repo owner/repo --pr 123 --token ghp_xxx
   ```

---

### Issue 2: "Gemini API key required"

**Problem:**
```
❌ Gemini API key required. Use --gemini-key or set GEMINI_API_KEY env var.
```

**Solution:**
1. Check `.env` file exists
2. Verify `GEMINI_API_KEY` is set
3. Or use `--gemini-key` flag:
   ```bash
   npx tsx src/index.ts review --repo owner/repo --pr 123 --gemini-key AIzaSy_xxx
   ```

---

### Issue 3: Rate Limit Errors

**Problem:**
```
⚠️  Rate limit hit. Retrying in 15s...
```

**Solution:**
- **Free Tier:** 2 requests/minute
- Tool automatically retries with exponential backoff
- Wait for retry, or upgrade Gemini API plan

---

### Issue 4: "PR not found"

**Problem:**
```
❌ PR #123 not found in owner/repo
```

**Solution:**
1. Verify repository name is correct: `owner/repo`
2. Verify PR number exists
3. Check GitHub token has access to repository

---

### Issue 5: Build Errors

**Problem:**
```
error TS2307: Cannot find module 'xyz'
```

**Solution:**
```bash
# Reinstall dependencies
npm install

# Rebuild
npm run build
```

---

## 📊 Output Files

### report.json
Complete review findings in JSON format:
- All issues with details
- Duplicate detection results
- Breaking change analysis
- Confidence scores

### pr-summary.md
Human-readable markdown summary:
- Overview of findings
- Top issues highlighted
- Recommendations
- Ready to share with team

---

## 💡 Tips & Best Practices

### Tip 1: Index Before First Review
For best results, index your codebase first:
```bash
npx tsx src/index.ts index --repo owner/repo --branch main
```

### Tip 2: Use Enterprise Mode
Always use `--enterprise` flag for comprehensive analysis:
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

### Tip 3: Post Comments for Team
Share findings directly on PR:
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

### Tip 4: Generate Summary for Documentation
Create markdown summary for reports:
```bash
npx tsx src/index.ts summarize --repo owner/repo --pr 123
```

---

## 🎯 Common Use Cases

### Use Case 1: Pre-Commit Review
Review changes before pushing:
```bash
# Create PR locally or use existing PR
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

### Use Case 2: Find Duplicate Code
```bash
# Index codebase
npx tsx src/index.ts index --repo owner/repo --branch main

# Review PR (finds duplicates)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

### Use Case 3: Check for Breaking Changes
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
# Breaking changes automatically detected
```

### Use Case 4: Quick File Check
```bash
npx tsx src/index.ts analyze --file src/UserService.java
```

---

## ✅ Success Checklist

Before using DROOG AI, ensure:
- ✅ Node.js 18+ installed
- ✅ `npm install` completed
- ✅ `.env` file created with API keys
- ✅ GitHub token has `repo` scope
- ✅ Gemini API key is valid
- ✅ `npm run build` succeeds

---

**Ready to use DROOG AI!** 🚀

For more help, see:
- `README.md` - Quick overview
- `TROUBLESHOOTING.md` - Common issues
- `DROOG_AI_CAPABILITIES.md` - Feature details


