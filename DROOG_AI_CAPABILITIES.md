# 🚀 Droog AI - Complete Capabilities Guide

## What is Droog AI?

**Droog AI** is an enterprise-grade AI Code Reviewer that provides Google/Meta-level code review capabilities. It analyzes pull requests, detects issues, finds duplicates, identifies breaking changes, and provides actionable suggestions.

---

## 🎯 What Can You Do With Droog AI?

### 1. 📋 **Review Pull Requests** (`droog review`)

Review any GitHub PR with AI-powered analysis.

#### Basic Review
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123
```

**What it does:**
- ✅ Analyzes all changed files in the PR
- ✅ Detects bugs, security issues, performance problems
- ✅ Suggests modern coding practices (Java Stream API, Optional, Records, etc.)
- ✅ Identifies code smells and style issues
- ✅ Provides complete method updates (not just suggestions)
- ✅ Generates JSON report with all findings

#### Enterprise Review (Advanced)
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

**Additional features:**
- ✅ Duplicate code detection (within PR)
- ✅ Breaking change detection
- ✅ Architecture rule violations
- ✅ Cross-repository duplicate detection (if index available)
- ✅ Confidence scores for each issue
- ✅ Comprehensive analysis report

#### Post Comments to GitHub
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

**What it does:**
- ✅ Posts high-severity issues as inline comments
- ✅ Posts medium/low issues as summary comments
- ✅ Comments appear directly on PR lines
- ✅ Respects GitHub API rate limits

---

### 2. 📦 **Index Codebase** (`droog index`)

Index your entire codebase for advanced analysis.

```bash
npx tsx src/index.ts index --repo owner/repo --branch main
```

**What it does:**
- ✅ Fetches all files from specified branch
- ✅ Extracts symbols (classes, methods, functions)
- ✅ Generates embeddings for similarity search
- ✅ Builds call graph (method dependencies)
- ✅ Stores in local index for fast queries
- ✅ Enables cross-repo duplicate detection

**Use cases:**
- Find duplicate code across entire repository
- Detect breaking changes before they break
- Analyze codebase architecture
- Track code dependencies

---

### 3. 🔍 **Analyze Single File** (`droog analyze`)

Analyze a specific file for issues and patterns.

```bash
# Basic analysis
npx tsx src/index.ts analyze --file path/to/file.java

# With repository context (for duplicate detection)
npx tsx src/index.ts analyze --file file.java --repo owner/repo
```

**What it does:**
- ✅ Extracts all symbols (classes, methods, functions)
- ✅ Shows symbol details (parameters, return types, visibility)
- ✅ Finds duplicate code (if index available)
- ✅ Generates embeddings (if Gemini key set)
- ✅ Finds similar code using vector search
- ✅ Identifies potential issues

**Use cases:**
- Quick file analysis before committing
- Check for duplicates in new code
- Understand file structure
- Find similar code patterns

---

### 4. 📊 **Generate PR Summary** (`droog summarize`)

Generate comprehensive markdown summary of PR review.

```bash
# Fast (uses existing report.json if available)
npx tsx src/index.ts summarize --repo owner/repo --pr 123

# Force new review
npx tsx src/index.ts summarize --repo owner/repo --pr 123 --force
```

**What it generates:**
- ✅ Overview (total issues, severity breakdown)
- ✅ Duplicate code findings
- ✅ Breaking changes detected
- ✅ Architecture violations
- ✅ Top issues (high/medium priority)
- ✅ Actionable recommendations
- ✅ Saves to `pr-summary.md`

**Use cases:**
- Share review summary with team
- Document PR review findings
- Quick overview of PR status
- Generate reports for stakeholders

---

## 🎨 Key Features

### 🔴 **Issue Detection**

Droog AI detects:

1. **Bugs & Logic Errors**
   - Off-by-one errors
   - Edge case failures
   - Null pointer exceptions
   - Index out of bounds

2. **Security Issues**
   - OWASP Top 10 vulnerabilities
   - SQL injection risks
   - XSS vulnerabilities
   - Hardcoded secrets
   - PII handling issues

3. **Performance Problems**
   - O(n²) or worse algorithms
   - Memory leaks
   - Unclosed resources
   - N+1 query problems
   - String concatenation in loops

4. **Code Quality**
   - Code smells
   - Dead code
   - Magic numbers
   - Poor naming conventions
   - Violations of SOLID principles

5. **Modern Practices**
   - Suggests Java Stream API
   - Recommends Optional instead of null checks
   - Suggests Records for data carriers
   - Modern Java features (pattern matching, switch expressions)
   - Immutable collections

---

### 🔄 **Duplicate Detection**

**Within PR:**
- Finds duplicate code patterns within the PR
- Identifies similar methods/classes
- Calculates similarity scores
- Shows duplicate locations

**Cross-Repository:**
- Compares PR code with entire codebase
- Uses embeddings for accurate similarity
- Finds existing similar code
- Helps prevent code duplication

---

### ⚠️ **Breaking Change Detection**

Detects:
- **Signature Changes**: Method parameter changes
- **Visibility Changes**: Public → Private, etc.
- **Return Type Changes**: Different return types
- **Call-Site Impact**: Finds all affected call sites
- **Impacted Files**: Lists files that need updates

**Use cases:**
- Prevent accidental API breaks
- Identify refactoring impact
- Track API evolution
- Ensure backward compatibility

---

### 🏗️ **Architecture Rules**

Enforces:
- **Import Rules**: Prevent circular dependencies
- **Module Isolation**: Enforce layer boundaries
- **Naming Conventions**: Validate naming patterns
- **Custom Rules**: Configurable rule engine

---

### 📈 **Confidence Scores**

Each issue includes:
- **Confidence Score**: 0.0 to 1.0
- **Severity Level**: High, Medium, Low
- **Detailed Message**: Clear explanation
- **Complete Suggestions**: Full method updates

---

## 💡 Real-World Use Cases

### 1. **Pre-Commit Review**
```bash
# Review your changes before pushing
npx tsx src/index.ts review --repo owner/repo --pr 123
```

### 2. **Find Duplicate Code**
```bash
# Index codebase first
npx tsx src/index.ts index --repo owner/repo

# Then review PR (will detect cross-repo duplicates)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

### 3. **Check for Breaking Changes**
```bash
# Enterprise review automatically detects breaking changes
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```

### 4. **Quick File Check**
```bash
# Analyze a file before committing
npx tsx src/index.ts analyze --file src/UserService.java
```

### 5. **Generate Review Report**
```bash
# Generate markdown summary for documentation
npx tsx src/index.ts summarize --repo owner/repo --pr 123
```

### 6. **Automated PR Comments**
```bash
# Post review comments directly to GitHub PR
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post
```

---

## 📊 Output Formats

### 1. **JSON Report** (`report.json`)
- Complete review findings
- All issues with details
- Duplicate detection results
- Breaking change analysis
- Confidence scores

### 2. **Markdown Summary** (`pr-summary.md`)
- Human-readable summary
- Overview of all findings
- Top issues highlighted
- Recommendations
- Ready to share

### 3. **GitHub Comments**
- Inline comments on specific lines
- Summary comments for overview
- Directly visible in PR
- Actionable suggestions

---

## 🚀 Advanced Features

### **Enterprise Review Mode**

When using `--enterprise` flag:

1. **Phase 1**: Basic AI Review
   - Standard code review
   - Issue detection
   - Modern practice suggestions

2. **Phase 2**: Symbol Extraction
   - Parse all PR files
   - Extract classes, methods, functions
   - Build symbol index

3. **Phase 3**: Duplicate Detection
   - Find duplicates within PR
   - Cross-repo duplicate detection (if indexed)

4. **Phase 4**: Breaking Change Detection
   - Analyze API changes
   - Find impacted call sites
   - Assess impact

5. **Phase 5**: Architecture Rules
   - Check import rules
   - Validate module isolation
   - Enforce naming conventions

6. **Phase 6**: Confidence Calculation
   - Calculate confidence scores
   - Average confidence

7. **Phase 7**: Summary Generation
   - Generate comprehensive summary
   - Include all findings

---

## 🛠️ Technical Capabilities

### **Code Parsing**
- ✅ Tree-sitter integration (accurate AST parsing)
- ✅ Regex fallback (works without Tree-sitter)
- ✅ Symbol extraction (classes, methods, functions)
- ✅ Call graph construction
- ✅ Signature parsing (parameters, return types, visibility)

### **Similarity Search**
- ✅ Embeddings generation (128-dimensional vectors)
- ✅ Cosine similarity calculation
- ✅ Fast vector search
- ✅ Similar code detection

### **Storage**
- ✅ File-based vector database (FileVectorDB)
- ✅ Local index storage
- ✅ Fast retrieval
- ✅ No external dependencies

### **API Integration**
- ✅ GitHub API (PR fetching, comment posting)
- ✅ Gemini API (AI-powered review)
- ✅ Rate limit management
- ✅ Retry logic with exponential backoff

---

## 📋 Command Reference

### Basic Commands

```bash
# Review PR (basic)
npx tsx src/index.ts review --repo owner/repo --pr 123

# Review PR (enterprise)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise

# Review PR (with comments)
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise --post

# Index codebase
npx tsx src/index.ts index --repo owner/repo --branch main

# Analyze file
npx tsx src/index.ts analyze --file path/to/file.java

# Generate summary
npx tsx src/index.ts summarize --repo owner/repo --pr 123
```

### Legacy Format (Still Works)

```bash
# Old format (backward compatible)
npx tsx src/index.ts --repo owner/repo --pr 123
npx tsx src/index.ts --repo owner/repo --pr 123 --post
npx tsx src/index.ts --repo owner/repo --pr 123 --enterprise
```

---

## 🎯 What Makes Droog AI Special?

1. **Complete Method Suggestions**
   - Not just "add null check"
   - Provides full updated method
   - Copy-paste ready code

2. **Modern Practice Focus**
   - Suggests Stream API, Optional, Records
   - Focuses on storage efficiency
   - High-standard approaches

3. **Enterprise-Grade Analysis**
   - Duplicate detection
   - Breaking change detection
   - Architecture rules
   - Confidence scores

4. **Fast & Efficient**
   - Uses existing reports when available
   - Optimized for rate limits
   - Local indexing for speed

5. **Production Ready**
   - Error handling
   - Graceful degradation
   - Backward compatible
   - Well-tested

---

## 📚 Examples

### Example 1: Review a PR
```bash
npx tsx src/index.ts review --repo abhijeet1771/AI-reviewer --pr 3 --enterprise
```

**Output:**
- Analyzes 15 changed files
- Finds 56 issues (10 high, 23 medium, 23 low)
- Detects 10 duplicates within PR
- Identifies 7 breaking changes
- Generates comprehensive report

### Example 2: Index Codebase
```bash
npx tsx src/index.ts index --repo owner/repo --branch main
```

**Output:**
- Fetches repository tree
- Processes 100+ files
- Extracts 500+ symbols
- Generates embeddings
- Builds index for fast queries

### Example 3: Analyze File
```bash
npx tsx src/index.ts analyze --file src/UserService.java
```

**Output:**
- Extracts 6 symbols
- Shows method signatures
- Finds similar code
- Generates embeddings

---

## 🎉 Summary

**Droog AI can:**
- ✅ Review PRs with AI-powered analysis
- ✅ Detect bugs, security issues, performance problems
- ✅ Find duplicate code (within PR + cross-repo)
- ✅ Detect breaking changes
- ✅ Enforce architecture rules
- ✅ Index entire codebase
- ✅ Analyze single files
- ✅ Generate PR summaries
- ✅ Post comments to GitHub
- ✅ Provide complete code suggestions

**All in one tool!** 🚀

---

**Ready to use?** Start with:
```bash
npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise
```



