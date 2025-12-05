# Rate Limit Solutions

## Problem
Free tier Gemini API has **2 requests per minute** limit. If you run reviewer multiple times, quota gets exhausted quickly.

## Solutions

### Option 1: Wait Before Running (Recommended)
After running reviewer, wait **at least 1 minute** before running again to let quota reset.

```bash
# Run reviewer
npx tsx src/index.ts --repo abhijeet1771/AI-reviewer --pr 3 --post

# Wait 1-2 minutes, then run again
npx tsx src/index.ts --repo abhijeet1771/AI-reviewer --pr 3 --post
```

### Option 2: Process Files One at a Time
✅ **Already implemented!** Files are now processed sequentially (1 at a time) with 35s delay between each.

### Option 3: Use Different API Key
- Create new Google account
- Get new API key from: https://aistudio.google.com/app/apikey
- Update `.env` file with new key
- **Note:** Each account has separate quota

### Option 4: Upgrade to Paid Plan
- Paid Gemini API plans have higher rate limits
- Check: https://ai.google.dev/pricing

### Option 5: Review Smaller PRs
- Review PRs with fewer files (1-3 files)
- Less likely to hit rate limits

## Current Implementation

- ✅ Sequential processing (1 file at a time)
- ✅ 35 second delay between files
- ✅ Automatic retry with exponential backoff
- ✅ Better error messages

## Best Practice

**For free tier:**
1. Review PRs with max 5-6 files at a time
2. Wait 1-2 minutes between runs
3. Use `--post` flag only when needed (saves API calls)

## Check Your Quota

Visit: https://aistudio.google.com/app/apikey
- Check usage/limits
- See when quota resets





