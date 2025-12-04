# Quick Setup Instructions

## Step 1: Install Dependencies

Open PowerShell in this directory and run:

```powershell
npm install
```

**If you get connection errors:**
- Check your internet connection
- Try: `npm install --registry https://registry.npmjs.org/`
- Or use a VPN if behind a firewall

## Step 2: Configure API Keys

1. Open `.env` file (already created for you)
2. Add your GitHub token:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   ```
   Get token from: https://github.com/settings/tokens

3. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_key_here
   ```
   Get key from: https://makersuite.google.com/app/apikey

## Step 3: Build the Project

```powershell
npm run build
```

## Step 4: Run Your First Review

```powershell
npm run review -- --repo owner/repo --pr 123
```

Example:
```powershell
npm run review -- --repo facebook/react --pr 28000
```

## Troubleshooting

### npm install fails
- Check internet connection
- Try: `npm cache clean --force` then `npm install`
- Check if corporate firewall is blocking npm

### Build fails
- Make sure `npm install` completed successfully
- Check that TypeScript is installed: `npx tsc --version`

### Connection errors when running
- Verify `.env` file has correct keys (no extra spaces)
- Test GitHub API: `curl https://api.github.com`
- Test Gemini API access

## Alternative: Use npx (no build needed)

You can also run directly with tsx:

```powershell
npx tsx src/index.ts --repo owner/repo --pr 123
```

This doesn't require building first!





