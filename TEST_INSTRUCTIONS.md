# Testing Instructions

## ✅ Quick Test

Run the basic component test:
```bash
npx tsx test-basic.js
```

This verifies:
- Code Extractor works
- Codebase Indexer works
- Duplicate Detector works
- Breaking Change Detector works

## 🧪 Test with Real PR

### Legacy Format (Backward Compatible)
```bash
npx tsx src/index.ts --repo owner/repo --pr 123
```

### New Format
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123
```

### Enterprise Mode
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

### Post Comments to GitHub
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --post
```

## 📋 Required Environment Variables

Make sure you have these set:
```bash
# Windows PowerShell
$env:GITHUB_TOKEN = "your_github_token"
$env:GEMINI_API_KEY = "your_gemini_key"

# Or use command line options
npx tsx src/index.ts review --repo owner/repo --pr 123 --token YOUR_TOKEN --gemini-key YOUR_KEY
```

## 🔍 What to Test

1. **Basic Review** - Should work as before
2. **Enterprise Review** - Should show:
   - Basic review results
   - Duplicate detection (within PR)
   - Breaking change detection
   - Summary generation

3. **New CLI Commands**:
   - `index` - Index codebase (under development)
   - `analyze` - Analyze file (under development)
   - `summarize` - Generate PR summary (under development)

## 📊 Expected Output

### Basic Review
- Standard review with issues by severity
- Report saved to `report.json`

### Enterprise Review
- All basic review features
- Plus:
  - Duplicate count and details
  - Breaking change count and details
  - Enhanced summary

## 🐛 Troubleshooting

1. **Module not found errors**: Run `npm install` first
2. **TypeScript errors**: Run `npx tsc --noEmit` to check
3. **API errors**: Check your tokens are valid
4. **Rate limits**: Wait 35 seconds between requests (free tier)

## ✅ Success Criteria

- ✅ Basic review works (legacy format)
- ✅ New CLI commands work
- ✅ Enterprise mode runs without errors
- ✅ Duplicate detection finds matches
- ✅ Breaking change detection works
- ✅ Report is generated correctly




