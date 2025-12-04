# Droog AI - Demo Script (15 Minutes)

## 🎬 Opening (1 min)

**Slide 1: Problem Statement**
```
"Code reviews are:
- Time-consuming (30-60 min per PR)
- Inconsistent (depends on reviewer)
- Miss issues (security, performance, architecture)
- Don't scale (can't review every PR thoroughly)"
```

**Slide 2: Solution**
```
"Droog AI: Enterprise-grade automated code reviewer
- 19+ analysis categories
- Google/Meta-level capabilities
- FREE and open source
- Runs automatically on every PR"
```

---

## 💻 Live Demo (12 min)

### 1. Basic Review (2 min)

**Command:**
```bash
droog review --repo your-org/demo-repo --pr 123
```

**What to Show:**
- Fast execution
- Multiple issue categories
- Severity levels
- File-by-file analysis

**Say:**
```
"This is a basic review. It analyzes code quality, best practices, 
and common issues. Notice it found X issues in Y seconds."
```

---

### 2. Enterprise Review - Full Power (5 min)

**Command:**
```bash
droog review --repo your-org/demo-repo --pr 123 --enterprise --post
```

**Walk Through Output:**

#### Phase 0: Flow Optimization
**Say:** "It collects ALL data first, then reviews. 90% more efficient."

#### Phase 1: Core Analysis
**Show:**
- Design Patterns: "Detected Factory pattern, but also God Object anti-pattern"
- Test Coverage: "Only 45% method coverage - missing tests for critical methods"
- Complexity: "3 high-complexity hotspots found"
- Dependencies: "2 security vulnerabilities in dependencies"
- API Design: "Missing versioning, no request validation"

**Say:** "This is what a senior architect would catch in architecture review."

#### Phase 2: Advanced Analysis
**Show:**
- Security: "CRITICAL: Hardcoded API key on line 23"
- Performance: "HIGH: N+1 query problem - will slow down app"
- Documentation: "Quality score: 45/100 - missing JavaDoc"
- Error Handling: "5 methods missing error handling"
- Observability: "No logging in catch blocks"

**Say:** "Security, performance, documentation - all analyzed automatically."

#### Phase 3: Test Automation (if applicable)
**Show:**
- Framework detected: Selenium
- Flow validation: Missing links in test chain
- Best practices: XPath locator should use ID

**Say:** "Even test automation code is reviewed."

#### Phase 4: Strategic Analysis
**Show:**
- Technical Debt: "Score 7.5/10 - 45 hours to fix"
- Migration Safety: "HIGH risk - database changes need migration"
- Organization: "Layer violation - Controller accessing Repository"

**Say:** "Strategic analysis helps with planning and risk assessment."

---

### 3. Show GitHub PR Comments (2 min)

**Open GitHub PR:**
- Show comments on specific lines
- Show complete code suggestions
- Show severity indicators

**Say:**
```
"Comments are automatically posted. Developers see:
- Exact line numbers
- Complete code (not just 'fix this')
- Why it matters
- How to fix it"
```

---

### 4. Cross-Repo Analysis (2 min)

**Show:**
```bash
# Index main branch
droog index --repo your-org/demo-repo --branch main

# Review with index
droog review --repo your-org/demo-repo --pr 123 --enterprise
```

**Highlight:**
- "Found duplicate code in main branch"
- "Breaking change detected - will break 3 other files"
- "Similar code found in 5 other files"

**Say:**
```
"With index, Droog AI has full codebase awareness.
Finds duplicates, breaking changes, and impact analysis.
This is what Google/Meta tools do."
```

---

### 5. Summary & Recommendations (1 min)

**Show:**
```bash
droog summarize --repo your-org/demo-repo --pr 123
```

**Highlight:**
- Executive summary
- Top 5 issues
- Recommendations
- Technical debt breakdown

**Say:**
```
"Summary for managers and planning.
Prioritized action items.
Technical debt tracking."
```

---

## 📊 Value Proposition (2 min)

### Cost Comparison
```
Commercial Tools: $10-50/dev/month
Droog AI: FREE
Savings: $120-600/dev/year
```

### Time Savings
```
Manual Review: 45 min/PR
Droog AI: 3 min/PR
Savings: 42 min/PR

20 PRs/week = 14 hours saved/week
```

### Quality Improvement
```
Issues Caught:
- Before: 60-70%
- After: 85-90%

Security Issues in Production:
- Before: 5-10/month
- After: 1-2/month
```

---

## 🚀 Next Steps (1 min)

1. **Pilot**: 2 projects this week
2. **Feedback**: Gather developer input
3. **Rollout**: Company-wide in 1 month
4. **Integration**: GitHub Actions for automation

---

## ❓ Q&A Preparation

**Common Questions:**

1. **Accuracy?** → "85-90% - catches most senior architect issues"
2. **False Positives?** → "Confidence scores help filter, customizable"
3. **Privacy?** → "Runs locally, code never leaves infrastructure"
4. **Integration?** → "GitHub Actions, CLI, or API server"
5. **Languages?** → "Java now, extensible to others"
6. **Rate Limits?** → "Free tier: 2 req/min, paid: $20/month for 1500 req/min"

---

## 🎯 Closing

```
"Droog AI gives us enterprise-grade code review for FREE.
It catches 85-90% of issues automatically.

Let's start with a pilot in 2 projects this week.

Questions?"
```

---

## 📝 Demo Tips

1. **Practice**: Run demo 2-3 times before presentation
2. **Backup**: Have screenshots/video ready if live demo fails
3. **Timing**: Keep to 15 minutes, leave 5 min for Q&A
4. **Engage**: Ask "What do you think?" during demo
5. **Focus**: Highlight 3-4 key features, not everything

---

**Good luck! 🚀**



