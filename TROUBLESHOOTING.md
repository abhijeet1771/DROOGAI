# Troubleshooting Connection Issues

## Common Connection Errors

### "Connection failed" Error

This error usually means the tool cannot reach external APIs (GitHub or Gemini). Here's how to fix it:

#### 1. Check Internet Connection
```bash
# Test GitHub API
curl https://api.github.com

# Test Google API
curl https://generativelanguage.googleapis.com
```

#### 2. VPN Issues
- If using VPN, ensure it's connected and working
- Try disconnecting VPN temporarily to test
- Some corporate VPNs block API access

#### 3. Firewall/Proxy
- Check if your firewall is blocking Node.js
- If behind corporate proxy, configure npm:
  ```bash
  npm config set proxy http://proxy.company.com:8080
  npm config set https-proxy http://proxy.company.com:8080
  ```

#### 4. API Keys
- Verify GitHub token is valid: https://github.com/settings/tokens
- Verify Gemini API key is valid: https://makersuite.google.com/app/apikey
- Check `.env` file has correct values (no extra spaces/quotes)

#### 5. Network Timeout
- Try again after a few seconds
- Check if GitHub API status is up: https://www.githubstatus.com/

## Quick Fixes

### Test GitHub Connection
```bash
# Using curl
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Using PowerShell
Invoke-WebRequest -Uri "https://api.github.com" -Headers @{"Authorization"="token YOUR_TOKEN"}
```

### Test Gemini Connection
```bash
# Check if API key works
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro?key=YOUR_KEY"
```

### Reinstall Dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Project
```bash
# Make sure TypeScript is compiled
npm run build
```

## Still Having Issues?

1. **Check error details**: The tool now shows specific error messages
2. **Verify credentials**: Double-check `.env` file
3. **Test manually**: Try accessing APIs directly with curl/PowerShell
4. **Check logs**: Look for specific HTTP status codes (401, 404, 500, etc.)

## Error Codes

- **401**: Authentication failed (invalid token/key)
- **404**: Resource not found (wrong repo/PR number)
- **403**: Access denied (token doesn't have permissions)
- **500**: Server error (try again later)
- **ECONNREFUSED**: Cannot connect (network/VPN issue)






