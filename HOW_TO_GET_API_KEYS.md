# API Keys Kaise Lein (How to Get API Keys)

## 1. GitHub Personal Access Token

### Step 1: GitHub pe jao
1. Browser mein jao: https://github.com
2. Login karo apne account se

### Step 2: Settings mein jao
1. Top right corner pe apna profile picture click karo
2. **Settings** click karo

### Step 3: Developer Settings
1. Left sidebar mein neeche scroll karo
2. **Developer settings** click karo
3. **Personal access tokens** click karo
4. **Tokens (classic)** click karo

### Step 4: New Token banao
1. **Generate new token** button click karo
2. **Generate new token (classic)** select karo
3. Note mein likho: "AI Code Reviewer"
4. Expiration select karo (90 days ya 1 year)
5. **Scopes** mein select karo:
   - ✅ `repo` (for private repos)
   - ✅ `public_repo` (for public repos)
6. Neeche scroll karke **Generate token** click karo

### Step 5: Token copy karo
⚠️ **IMPORTANT**: Token sirf ek baar dikhega! Copy kar lo immediately.

Token aisa dikhega: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 2. Google Gemini Pro API Key

### Step 1: Google AI Studio mein jao
1. Browser mein jao: https://makersuite.google.com/app/apikey
   Ya: https://aistudio.google.com/app/apikey
2. Google account se login karo

### Step 2: API Key banao
1. **Create API Key** button click karo
2. Agar project select karna ho to select karo (ya skip karo)
3. **Create API Key in new project** click karo

### Step 3: API Key copy karo
⚠️ **IMPORTANT**: API key copy kar lo!

Key aisa dikhega: `AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 3. API Keys ko .env file mein add karo

### Step 1: .env file kholo
1. `D:\DROOG AI` folder mein jao
2. `.env` file kholo (Notepad ya VS Code se)

### Step 2: Keys add karo
File mein yeh likho (apne keys se replace karo):

```
GITHUB_TOKEN=ghp_apna_github_token_yahan
GEMINI_API_KEY=AIzaSy_apna_gemini_key_yahan
```

**Example:**
```
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
GEMINI_API_KEY=AIzaSy1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 3: Save karo
- File save karo (Ctrl+S)
- Make sure koi extra spaces na ho

---

## 4. Test karo

```bash
cd D:\DROOG AI

# Check if .env file has keys
type .env
```

Agar sab sahi hai, to ab aap AI code reviewer use kar sakte ho!

---

## Troubleshooting

### GitHub Token kaam nahi kar raha?
- Check karo token expire to nahi hua
- Check karo `repo` scope selected hai
- Token ko refresh karo agar zarurat ho

### Gemini API Key kaam nahi kar raha?
- Check karo key correctly copy hui hai
- Google AI Studio mein check karo key active hai
- Free tier limits check karo

### Connection errors?
- Internet connection check karo
- VPN check karo (agar use kar rahe ho)
- Firewall settings check karo

---

## Quick Links

- **GitHub Tokens**: https://github.com/settings/tokens
- **Gemini API Keys**: https://makersuite.google.com/app/apikey
- **Google AI Studio**: https://aistudio.google.com/

---

## Safety Tips

⚠️ **Never share your API keys publicly!**
- `.env` file ko git mein commit mat karo
- Keys ko kisi ko share mat karo
- Agar key leak ho jaye to immediately revoke karo aur naya banao






