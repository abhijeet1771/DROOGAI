# Droog AI Installation Guide

## Installation Options

### Option 1: Install from Local Directory (Recommended for Development)

If you have Droog AI on your local system and want to use it in other projects:

#### Step 1: Build Droog AI
```bash
cd "D:\DROOG AI"
npm install
npm run build
```

#### Step 2: Create npm link
```bash
npm link
```

#### Step 3: Use in your project
```bash
cd "D:\your-project"
npm link droog-ai
```

Now you can use Droog AI:
```bash
droog review --repo owner/repo --pr 123
# or
droog-ai review --repo owner/repo --pr 123
```

---

### Option 2: Install from Git Repository

If Droog AI is in a Git repository (GitHub, GitLab, etc.):

```bash
npm install --save-dev git+https://github.com/yourusername/droog-ai.git
```

Then use:
```bash
npx droog-ai review --repo owner/repo --pr 123
```

---

### Option 3: Install from npm (When Published)

```bash
npm install -g droog-ai
# or locally
npm install --save-dev droog-ai
```

Then use:
```bash
droog review --repo owner/repo --pr 123
```

---

### Option 4: Direct Clone and Use

```bash
# Clone the repository
git clone https://github.com/yourusername/droog-ai.git
cd droog-ai

# Install dependencies
npm install

# Build
npm run build

# Use directly
npx tsx src/index.ts review --repo owner/repo --pr 123

# Or link globally
npm link
droog review --repo owner/repo --pr 123
```

---

## Setup Requirements

### 1. Environment Variables

Create a `.env` file in your project or set environment variables:

```bash
GEMINI_API_KEY=your_gemini_api_key
GITHUB_TOKEN=your_github_token
```

### 2. First-Time Setup

#### Index Main Branch (Optional but Recommended)
```bash
droog index --repo owner/repo --branch main
```

This creates `.droog-embeddings.json` for cross-repo duplicate detection.

---

## Usage Examples

### Basic Review
```bash
droog review --repo owner/repo --pr 123
```

### Enterprise Review (All Features)
```bash
droog review --repo owner/repo --pr 123 --enterprise
```

### Review and Post Comments
```bash
droog review --repo owner/repo --pr 123 --enterprise --post
```

### Analyze Single File
```bash
droog analyze path/to/file.java
```

### Generate PR Summary
```bash
droog summarize --repo owner/repo --pr 123
```

---

## Troubleshooting

### Command Not Found
If `droog` command is not found:
1. Make sure you ran `npm link` in Droog AI directory
2. Make sure you ran `npm link droog-ai` in your project
3. Try using `npx droog-ai` instead

### Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Permission Errors (Linux/Mac)
```bash
chmod +x dist/index.js
```

---

## Uninstall

### Remove npm link
```bash
# In your project
npm unlink droog-ai

# In Droog AI directory (optional)
npm unlink
```

---

## Next Steps

- See [README.md](./README.md) for full documentation
- See [SENIOR_ARCHITECT_IMPLEMENTATION_PLAN.md](./SENIOR_ARCHITECT_IMPLEMENTATION_PLAN.md) for feature list
- Check [.github/workflows/](./.github/workflows/) for GitHub Actions integration







