# Index Command Examples

## ❌ Wrong (Placeholder)

```bash
npx tsx src/index.ts index --repo owner/repo --branch main
```

**Error:** `Not Found` - because "owner/repo" is not a real repository!

---

## ✅ Correct Examples

### Example 1: Index AI-reviewer Repository

```bash
npx tsx src/index.ts index --repo abhijeet1771/AI-reviewer --branch main
```

### Example 2: Index Any Repository

```bash
# Replace with your actual repository
npx tsx src/index.ts index --repo YOUR_USERNAME/YOUR_REPO --branch main
```

### Example 3: Index Different Branch

```bash
npx tsx src/index.ts index --repo abhijeet1771/AI-reviewer --branch develop
```

---

## 📋 Command Format

```bash
npx tsx src/index.ts index --repo <owner>/<repo> --branch <branch>
```

**Parameters:**
- `--repo`: GitHub repository in format `owner/repo` (e.g., `abhijeet1771/AI-reviewer`)
- `--branch`: Branch name to index (default: `main`)

---

## 🔑 Requirements

1. **GitHub Token** (required)
   ```bash
   # Set environment variable
   $env:GITHUB_TOKEN = "your_token_here"
   
   # Or use --token flag
   npx tsx src/index.ts index --repo owner/repo --token your_token
   ```

2. **Gemini API Key** (optional, for embeddings)
   ```bash
   # Set environment variable
   $env:GEMINI_API_KEY = "your_key_here"
   ```

---

## ✅ Quick Start

**For your repository:**

```bash
cd "D:\DROOG AI"
npx tsx src/index.ts index --repo abhijeet1771/AI-reviewer --branch main
```

**What happens:**
1. Fetches all files from main branch
2. Extracts symbols (classes, methods)
3. Generates embeddings
4. Saves to `.droog-embeddings.json`

---

## 🐛 Common Errors

### Error: "Not Found"
**Cause:** Repository name is incorrect or doesn't exist
**Fix:** Use correct repository format: `owner/repo`

### Error: "GitHub token required"
**Cause:** No GitHub token set
**Fix:** Set `GITHUB_TOKEN` environment variable or use `--token` flag

### Error: "Repository access denied"
**Cause:** Token doesn't have access to repository
**Fix:** Check token permissions (needs `repo` scope for private repos)

---

## 📊 After Indexing

Once indexing completes, you'll see:

```
✅ Indexing complete!
   Files processed: 45
   Symbols indexed: 620
   Embeddings generated: 620
```

The index is saved to: `.droog-embeddings.json`

---

## 🎯 Next Steps

After indexing, review PRs with cross-repo duplicate detection:

```bash
npx tsx src/index.ts review --repo abhijeet1771/AI-reviewer --pr 123 --enterprise
```

This will use the index for:
- ✅ Cross-repo duplicate detection
- ✅ Enhanced breaking change detection
- ✅ Similarity search







