# Quick Guide: Kithon Dekhange Logs? (Where to See Logs?)

## 🎯 Tej Answer (Quick Answer)

### Console/Logs Kithon Dekhange?
**GitHub Actions Tab** ch - Repository → **Actions** tab → Workflow run click karo → Full logs dikhange

### Kaise Pata Lagega ki Droog AI Start Ho Gaya?
1. **Actions Tab** ch status dikhega (🟡 Running, ✅ Success)
2. **PR Comments** ch review results dikhenge
3. **Email notification** (agar enable hai)

---

## 📍 Step-by-Step

### Step 1: GitHub Repository Kholo
```
https://github.com/your-org/your-repo
```

### Step 2: Actions Tab Click Karo
```
Repository Menu:
  Code | Issues | Pull requests | Actions ← Yahan click karo
```

### Step 3: Workflow Run Dekho
```
Actions Tab:
  ├── Droog AI Code Review
  │   ├── 🟡 Running (abhi chal raha hai)
  │   ├── ✅ Success (complete ho gaya)
  │   └── ❌ Failed (error aaya)
```

### Step 4: Logs Dekhne Ke Liye
```
Workflow Run Click Karo
  ↓
Job "review" Click Karo
  ↓
Step "Run Droog AI Review" Click Karo
  ↓
Full Console Output Dikhega! 🎉
```

---

## 🔍 Kya Dikhega Logs Mein?

### PR Review Ke Time:
```
🚀 Droog AI Started Automatically!
🔍 Reviewing PR #123...
📦 Repository: owner/repo
🔗 PR URL: https://github.com/owner/repo/pull/123

✅ Index found - using cross-repo analysis
📋 Phase 0: Collecting All Data...
✓ Extracted 45 symbols
📋 Phase 1: AI Review...
✓ Found 8 issues
✅ Droog AI Review Complete!
```

### Index Update Ke Time:
```
🚀 Droog AI Index Update Started Automatically!
📦 Indexing branch: main...
📦 Repository: owner/repo

✓ Found 150 files
✓ Processed 150 files (2500 symbols)
✅ Droog AI Index Update Complete!
```

---

## ✅ Kaise Check Karo ki Start Ho Gaya?

### Method 1: Actions Tab (Best)
1. Repository → **Actions** tab
2. Dekho:
   - 🟡 **Yellow dot** = Abhi chal raha hai
   - ✅ **Green check** = Complete ho gaya
   - ❌ **Red X** = Error aaya

### Method 2: PR Comments
1. PR kholo
2. Comments section check karo
3. "🤖 Droog AI Review Complete" comment dikhega

### Method 3: Email (Agar Enable Hai)
- GitHub automatically email bhejega
- Workflow complete hone par

---

## 🎯 Visual Guide

```
GitHub Repository
  ↓
Actions Tab (Top Menu)
  ↓
Workflow List:
  - Droog AI Code Review ✅ (2 min ago)
  - Droog AI Index Update ✅ (5 min ago)
  ↓
Click on "Droog AI Code Review"
  ↓
See Job: "review"
  ↓
See Steps:
  ✅ Checkout code
  ✅ Setup Node.js
  ✅ Install dependencies
  ✅ Build Droog AI
  ✅ Run Droog AI Review ← Yahan click karo
  ↓
Full Console Output! 🎉
```

---

## 💡 Tips

1. **Bookmark Actions Tab**: Tej access ke liye
2. **Watch Repository**: Notifications ke liye
3. **Check PR Comments**: Fastest way to see results
4. **Use Filters**: Status, branch, workflow filter karo

---

## 📱 Mobile App Mein?

- GitHub Mobile App ch bhi Actions tab hai
- Same way se logs dekh sakte ho
- Notifications bhi aayenge

---

## ❓ FAQ

**Q: Logs kahan save hote hain?**
A: GitHub Actions ch automatically save hote hain. 90 days tak available rehte hain.

**Q: Agar workflow fail ho gaya?**
A: Actions tab ch ❌ red X dikhega. Click karke error dekh sakte ho.

**Q: Real-time logs dekh sakte hain?**
A: Haan! Workflow run ke time live logs dekh sakte ho.

---

**Summary: Actions Tab → Workflow Run → Job → Step → Full Logs! 🚀**







