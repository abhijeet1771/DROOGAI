# Indexing Guide - How Main Branch Indexing Works

## 📦 What is Indexing?

Indexing the main branch means:
- ✅ Fetching all code files from the main branch
- ✅ Extracting symbols (classes, methods, functions)
- ✅ Generating embeddings for similarity search
- ✅ Building a call graph (method dependencies)
- ✅ Storing everything locally for fast queries

## 📍 Where is the Index Stored?

The index is stored in **two places**:

### 1. **In-Memory Index** (Symbols & Call Graph)
- Stored in `CodebaseIndexer` class
- Contains: symbols, call relationships, file mappings
- **Temporary** - lost when program exits
- Used for: breaking change detection, call-site analysis

### 2. **File-Based Index** (Embeddings)
- Stored in: **`.droog-embeddings.json`** (in Droog AI project directory)
- Contains: embeddings for similarity search
- **Persistent** - saved to disk
- Used for: duplicate detection, similarity search

## 🚀 When Does Indexing Happen?

### **Manual Process** - You Need to Run It!

Indexing **does NOT happen automatically**. You need to run:

```bash
npx tsx src/index.ts index --repo owner/repo --branch main
```

### When to Index:

1. **First Time Setup**
   - Index the main branch once
   - Creates `.droog-embeddings.json` file
   - Takes a few minutes depending on repo size

2. **After Major Changes**
   - Re-index when main branch has significant changes
   - Updates the embeddings file
   - Ensures duplicate detection is accurate

3. **Before PR Review** (Optional)
   - Index main branch before reviewing PRs
   - Enables cross-repo duplicate detection
   - Better breaking change detection

## 📋 How to Index Main Branch

### Step 1: Run Index Command

```bash
# From Droog AI directory
cd "D:\DROOG AI"

# Index main branch
npx tsx src/index.ts index --repo abhijeet1771/AI-reviewer --branch main
```

### Step 2: What Happens

```
📦 Indexing repository: abhijeet1771/AI-reviewer (branch: main)

📥 Fetching repository tree...
✓ Found 150 files to index

📄 Filtered to 45 code files

Progress: 10/45 files (120 symbols)
Progress: 20/45 files (250 symbols)
Progress: 30/45 files (380 symbols)
Progress: 40/45 files (500 symbols)
Progress: 45/45 files (620 symbols)

✅ Indexing complete!
   Files processed: 45
   Symbols indexed: 620
   Embeddings generated: 620
```

### Step 3: Index is Stored

- **Embeddings**: Saved to `.droog-embeddings.json`
- **Symbols**: In-memory (for current session)
- **Location**: `D:\DROOG AI\.droog-embeddings.json`

## 🔍 How Index is Used

### 1. **Cross-Repo Duplicate Detection**

When reviewing a PR with `--enterprise` flag:

```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**If index exists:**
- ✅ Compares PR code with indexed main branch
- ✅ Finds duplicates across entire repository
- ✅ Shows: "Similar to main:src/UserService.java::findUser()"

**If index doesn't exist:**
- ⚠️ Only finds duplicates within PR
- ⚠️ No cross-repo duplicate detection

### 2. **Breaking Change Detection**

- ✅ Compares PR symbols with indexed symbols
- ✅ Detects signature changes, visibility changes
- ✅ Finds impacted call sites in main branch

### 3. **Similarity Search**

- ✅ Finds similar code patterns
- ✅ Uses embeddings for accurate matching
- ✅ Helps identify code reuse opportunities

## 📊 Current Status

### Check if Index Exists:

```bash
# Check for index file
ls .droog-embeddings.json

# Or in PowerShell
Test-Path ".droog-embeddings.json"
```

### If Index Doesn't Exist:

You'll see this message:
```
⚠️  No index found. Run `droog index` first for duplicate detection.
```

## 🎯 Recommended Workflow

### Option 1: Index Before Each Review (Best Accuracy)

```bash
# 1. Index main branch
npx tsx src/index.ts index --repo owner/repo --branch main

# 2. Review PR (will use index)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

### Option 2: Index Once, Use Many Times (Faster)

```bash
# 1. Index main branch once
npx tsx src/index.ts index --repo owner/repo --branch main

# 2. Review multiple PRs (index persists)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
npx tsx src/index.ts review --repo owner/repo --pr 124 --enterprise
npx tsx src/index.ts review --repo owner/repo --pr 125 --enterprise
```

### Option 3: Review Without Index (Still Works!)

```bash
# Review without indexing (faster, but limited features)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**What works without index:**
- ✅ Basic code review
- ✅ Duplicate detection within PR
- ✅ Breaking change detection (basic)
- ✅ Architecture rules

**What needs index:**
- ⚠️ Cross-repo duplicate detection
- ⚠️ Enhanced breaking change detection
- ⚠️ Similarity search across codebase

## 🔄 Updating the Index

### When to Re-Index:

1. **After merging PRs to main**
   - Main branch has new code
   - Re-index to include new symbols

2. **Periodically**
   - Weekly or monthly
   - Keeps index up-to-date

3. **When Index is Stale**
   - If duplicate detection seems off
   - Re-index to refresh

### How to Re-Index:

```bash
# Just run index command again
npx tsx src/index.ts index --repo owner/repo --branch main
```

**Note:** This will **overwrite** the existing `.droog-embeddings.json` file.

## 📝 Summary

### Index Location:
- **File**: `.droog-embeddings.json` (in Droog AI directory)
- **In-Memory**: Symbols and call graph (temporary)

### When Indexing Happens:
- **Manual**: Run `droog index` command
- **Not Automatic**: You need to run it yourself
- **One-Time or Periodic**: Index once, use many times

### Benefits of Indexing:
- ✅ Cross-repo duplicate detection
- ✅ Better breaking change detection
- ✅ Similarity search across codebase
- ✅ More accurate analysis

### Without Index:
- ✅ Still works for basic review
- ✅ Duplicate detection within PR
- ⚠️ No cross-repo duplicate detection

---

## 🚀 Quick Start

**To index your main branch right now:**

```bash
cd "D:\DROOG AI"
npx tsx src/index.ts index --repo abhijeet1771/AI-reviewer --branch main
```

**Then review PRs with full features:**

```bash
npx tsx src/index.ts review --repo abhijeet1771/AI-reviewer --pr <number> --enterprise
```

---

**Index is ready when `.droog-embeddings.json` file exists!** 📦




