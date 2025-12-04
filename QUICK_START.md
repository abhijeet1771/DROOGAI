# 🚀 Droog AI - Quick Start Guide

## What Can Droog AI Do?

### 1. 📋 Review Pull Requests

**Basic Review:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123
```
- Detects bugs, security issues, performance problems
- Suggests modern coding practices
- Generates JSON report

**Enterprise Review (Advanced):**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```
- All basic features +
- Duplicate code detection
- Breaking change detection
- Architecture rule violations
- Confidence scores

**Post Comments to GitHub:**
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

---

### 2. 📦 Index Codebase

```bash
npx tsx src/index.ts index --repo owner/repo --branch main
```
- Indexes entire repository
- Extracts symbols (classes, methods)
- Generates embeddings
- Enables cross-repo duplicate detection

---

### 3. 🔍 Analyze Single File

```bash
npx tsx src/index.ts analyze --file path/to/file.java
```
- Extracts symbols
- Shows method signatures
- Finds duplicates (if index available)
- Finds similar code

---

### 4. 📊 Generate PR Summary

```bash
npx tsx src/index.ts summarize --repo owner/repo --pr 123
```
- Creates markdown summary
- Includes all findings
- Provides recommendations
- Saves to `pr-summary.md`

---

## 🎯 Key Features

✅ **AI-Powered Review** - Detects bugs, security issues, performance problems  
✅ **Duplicate Detection** - Finds duplicate code within PR and across repo  
✅ **Breaking Changes** - Detects API changes and impacted call sites  
✅ **Modern Practices** - Suggests Stream API, Optional, Records, etc.  
✅ **Complete Suggestions** - Full method updates (not just hints)  
✅ **Confidence Scores** - Know how confident each finding is  
✅ **GitHub Integration** - Post comments directly to PRs  

---

## 📝 Example Workflow

```bash
# 1. Index your codebase (one-time setup)
npx tsx src/index.ts index --repo owner/repo --branch main

# 2. Review a PR with enterprise features
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise

# 3. Generate summary for documentation
npx tsx src/index.ts summarize --repo owner/repo --pr 123

# 4. Post comments to GitHub (optional)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

---

## 🔧 Requirements

- Node.js (v20+)
- GitHub Token (set `GITHUB_TOKEN` env var)
- Gemini API Key (set `GEMINI_API_KEY` env var)

---

## 📚 More Info

- **Complete Guide**: See `DROOG_AI_CAPABILITIES.md`
- **Roadmap**: See `ROADMAP_VS_IMPLEMENTATION.md`
- **Status**: See `CURRENT_STATUS.md`

---

**Ready to start?** Run your first review:
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```



