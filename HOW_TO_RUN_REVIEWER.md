# DROOG AI Code Reviewer Kaise Chalayein

## Step 1: PR Create Karo (Agar nahi kiya)

### GitHub pe jao:
1. https://github.com/abhijeet1771/AI-reviewer pe jao
2. "Pull requests" tab click karo
3. "New pull request" button click karo
4. Base: `main` ← Compare: `apni-branch-name` select karo
5. Title aur description likho
6. "Create pull request" click karo

**PR number note karo** (e.g., #1, #2, etc.)

---

## Step 2: Dependencies Install Karo (Pehli baar)

```bash
cd "D:\DROOG AI"
npm install
```

**Agar npm install fail ho:**
- Internet connection check karo
- VPN check karo
- Ya skip karo aur `npx` use karo (next step)

---

## Step 3: AI Reviewer Run Karo

### Option A: Build karke run (Recommended)

```bash
cd "D:\DROOG AI"

# Build karo
npm run build

# Review run karo
npm run review -- --repo abhijeet1771/AI-reviewer --pr 1
```

**Replace `--pr 1` with apna actual PR number**

### Option B: Direct run (Build ki zarurat nahi)

```bash
cd "D:\DROOG AI"
npx tsx src/index.ts --repo abhijeet1771/AI-reviewer --pr 1
```

---

## Step 4: Output Dekho

Aapko dikhega:

```
🚀 Starting AI Code Review...

📦 Repository: abhijeet1771/AI-reviewer
🔢 PR #1

📥 Fetching PR data...
✓ Found PR: "Your PR title"
✓ Changed files: 3
✓ Base: main ← Head: your-branch

🤖 Running AI analysis...
📝 Analyzing 3 changed file(s)...
  ✓ Reviewing Calculator.java...
  ✓ Reviewing UserService.java...
  ✓ Reviewing HelloWorld.java...

============================================================
📊 REVIEW RESULTS
============================================================

Found 5 issue(s):
  - 2 high
  - 2 medium
  - 1 low

Issues by file:

📄 Calculator.java
  🔴 Line 15 [HIGH]
     Potential division by zero
     💡 Add check: if (b == 0) throw exception

  🟡 Line 10 [MEDIUM]
     No overflow check
     💡 Check for integer overflow

📄 UserService.java
  🔴 Line 12 [HIGH]
     No null check before get()
     💡 Add bounds check: if (index < 0 || index >= users.size())

💾 Report saved to report.json

✅ Review complete!
```

---

## Step 5: Report Check Karo

```bash
cd "D:\DROOG AI"
type report.json
```

Ya VS Code se `report.json` file kholo.

---

## Troubleshooting

### Error: "GitHub token required"
- `.env` file check karo
- Token sahi hai ya nahi

### Error: "Gemini API key required"
- `.env` file mein `GEMINI_API_KEY` check karo

### Error: "PR not found"
- PR number sahi hai?
- Repository name sahi hai?
- PR open hai ya closed?

### Error: "Connection failed"
- Internet check karo
- VPN check karo
- `TROUBLESHOOTING.md` dekho

---

## Example Commands

```bash
# PR #1 review karo
npm run review -- --repo abhijeet1771/AI-reviewer --pr 1

# PR #2 review karo
npm run review -- --repo abhijeet1771/AI-reviewer --pr 2

# Comments GitHub pe post karo
npm run review -- --repo abhijeet1771/AI-reviewer --pr 1 --post
```

---

## Quick Test

Agar PR nahi hai, to pehle:
1. Feature branch mein kuch changes karo
2. Commit karo
3. Push karo
4. PR create karo
5. Phir reviewer run karo

**Happy Reviewing! 🚀**






