# Reusable Workflow Usage Guide

## What Command Gets Run?

The reusable workflow automatically runs:

```bash
node dist/index.js review --repo <calling-repo> --pr <pr-number> --enterprise --post [--auto-fix] [--auto-apply]
```

**Note:** It uses `node dist/index.js` (not `npx tsx src/index.ts`) because DroogAI is built first.

---

## Current Default Command

**Without any flags:**
```bash
node dist/index.js review --repo "${{ github.repository }}" --pr "${PR_NUMBER}" --enterprise --post
```

**With auto-fix enabled:**
```bash
node dist/index.js review --repo "${{ github.repository }}" --pr "${PR_NUMBER}" --enterprise --post --auto-fix
```

**With auto-fix and auto-apply:**
```bash
node dist/index.js review --repo "${{ github.repository }}" --pr "${PR_NUMBER}" --enterprise --post --auto-fix --auto-apply
```

---

## How to Use

### Basic Usage (No Auto-Fix)

```yaml
- name: Run DroogAI Review
  uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master
  with:
    pr_number: "${{ github.event.pull_request.number }}"
    post_comments: true
  secrets:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Command run:**
```bash
node dist/index.js review --repo owner/repo --pr 7 --enterprise --post
```

---

### With Auto-Fix Enabled

```yaml
- name: Run DroogAI Review
  uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master
  with:
    pr_number: "${{ github.event.pull_request.number }}"
    post_comments: true
    auto_fix: true
  secrets:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Command run:**
```bash
node dist/index.js review --repo owner/repo --pr 7 --enterprise --post --auto-fix
```

---

### With Auto-Fix and Auto-Apply

```yaml
- name: Run DroogAI Review
  uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master
  with:
    pr_number: "${{ github.event.pull_request.number }}"
    post_comments: true
    auto_fix: true
    auto_apply: true
  secrets:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Command run:**
```bash
node dist/index.js review --repo owner/repo --pr 7 --enterprise --post --auto-fix --auto-apply
```

---

## Available Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `pr_number` | string | **required** | PR number to review |
| `post_comments` | boolean | `true` | Post comments to PR |
| `auto_fix` | boolean | `false` | Generate auto-fix suggestions |
| `auto_apply` | boolean | `false` | Automatically apply low-risk fixes |

---

## Comparison: Manual vs Reusable Workflow

### Manual Command (Local)
```bash
npx tsx src/index.ts review --repo abhijeet1771/testDroogAI --pr 7 --enterprise --post --auto-fix
```

### Reusable Workflow (GitHub Actions)
```yaml
with:
  pr_number: "7"
  auto_fix: true
```

**Runs:**
```bash
node dist/index.js review --repo abhijeet1771/testDroogAI --pr 7 --enterprise --post --auto-fix
```

**Difference:**
- Manual: `npx tsx src/index.ts` (runs TypeScript directly)
- Workflow: `node dist/index.js` (runs compiled JavaScript - faster)

---

## Example: Full Workflow

```yaml
name: Test and Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run tests
        run: npm test
      
      - name: Run DroogAI Review with Auto-Fix
        uses: abhijeet1771/DROOGAI/.github/workflows/droog-review-reusable.yml@master
        with:
          pr_number: "${{ github.event.pull_request.number }}"
          post_comments: true
          auto_fix: true
          auto_apply: false  # Set to true to auto-apply low-risk fixes
        secrets:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Summary

**Default command (no auto-fix):**
```bash
node dist/index.js review --repo <repo> --pr <number> --enterprise --post
```

**With auto-fix:**
```bash
node dist/index.js review --repo <repo> --pr <number> --enterprise --post --auto-fix
```

**With auto-fix and auto-apply:**
```bash
node dist/index.js review --repo <repo> --pr <number> --enterprise --post --auto-fix --auto-apply
```

The workflow automatically:
1. Builds DroogAI
2. Runs the correct command
3. Posts comments
4. Uploads report

You just need to set the input flags!



