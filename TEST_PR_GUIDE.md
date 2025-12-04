# Comprehensive Test PR Guide

## Overview

This test PR is designed to comprehensively test **all** Droog AI features. It contains 7 Java files with various issues that Droog AI should detect.

---

## Test Files & Expected Findings

### 1. **Calculator.java** - Basic Issues

**Issues to Detect:**
- ✅ **StackOverflowError**: Recursive factorial without negative check
- ✅ **Performance**: O(n²) string concatenation in loop
- ✅ **Null Safety**: Missing null check in sum() method
- ✅ **Overflow**: No overflow check in power() method
- ✅ **Dead Code**: Unused method
- ✅ **Magic Numbers**: Hardcoded values

**Expected Suggestions:**
- Use iterative approach for factorial
- Use `String.join()` or `StringBuilder` for concatenation
- Use `Optional` for null safety
- Add overflow checks

---

### 2. **UserService.java** - Bounds & Duplicates

**Issues to Detect:**
- ✅ **IndexOutOfBoundsException**: Missing bounds check in getUserById()
- ✅ **Null Safety**: Missing null checks
- ✅ **Performance**: O(n) count when O(1) available (use size())
- ✅ **Duplicate Code**: findUserByName() and findUserByEmail() are similar

**Expected Suggestions:**
- Add bounds checking
- Use `Optional` instead of null
- Use `size()` instead of manual count
- Refactor duplicate search methods

---

### 3. **SecurityService.java** - Security Vulnerabilities

**Issues to Detect:**
- ✅ **Hardcoded Secrets**: API key and password in code
- ✅ **SQL Injection**: Vulnerable query construction
- ✅ **XSS Risk**: No input sanitization
- ✅ **Resource Leak**: Connection not closed
- ✅ **Exception Swallowing**: Caught exception not handled

**Expected Severity:** HIGH

**Expected Suggestions:**
- Use environment variables for secrets
- Use parameterized queries
- Sanitize input
- Use try-with-resources
- Proper error handling

---

### 4. **DataProcessor.java** - Duplicate Code

**Issues to Detect:**
- ✅ **Duplicate Code**: processData1(), processData2(), processData3() are identical
- ✅ **Performance**: O(n²) nested loops in findDuplicates()

**Expected Findings:**
- 3 duplicate methods detected
- Similarity: 100%
- Suggestion: Extract common logic

---

### 5. **BreakingChanges.java** - API Breaking Changes

**Issues to Detect:**
- ✅ **Signature Change**: calculate() method signature changed (added parameter)
- ✅ **Return Type Change**: getName() return type changed (String → int)
- ✅ **Visibility Change**: process() visibility changed (public → private)

**Expected Findings:**
- 3+ breaking changes detected
- Impacted call sites identified
- Severity: HIGH

---

### 6. **ModernPractices.java** - Modern Java Suggestions

**Issues to Detect:**
- ✅ **Stream API**: Should use Stream instead of manual loop
- ✅ **Optional**: Should return Optional instead of null
- ✅ **Records**: Person class should be a Record
- ✅ **Immutable Collections**: Should use List.of()
- ✅ **String Methods**: Should use isBlank() instead of manual check

**Expected Suggestions:**
- Use Stream API for filtering
- Return `Optional<String>` instead of null
- Convert Person to Record
- Use `List.of()` for immutable collections
- Use `isBlank()` for string validation

---

### 7. **ArchitectureViolations.java** - Architecture Rules

**Issues to Detect:**
- ✅ **Circular Dependency**: Importing from multiple layers
- ✅ **Single Responsibility**: Class does too many things
- ✅ **Naming Convention**: GetUserData() should be getUserData()
- ✅ **Magic Numbers**: Hardcoded 200

**Expected Findings:**
- Architecture rule violations
- Naming convention violations
- Design pattern violations

---

## Expected Review Results

When running `droog review --enterprise`, you should see:

### Issue Count (Estimated)
- **High Priority**: 10-15 issues
  - Security vulnerabilities
  - Potential crashes (IndexOutOfBoundsException)
  - Breaking changes
  
- **Medium Priority**: 15-20 issues
  - Performance problems
  - Code smells
  - Duplicate code
  
- **Low Priority**: 10-15 issues
  - Style issues
  - Modern practice suggestions
  - Magic numbers

### Duplicate Detection
- **Within PR**: 5+ duplicate patterns
  - DataProcessor: 3 duplicate methods
  - UserService: 2 duplicate search methods
  - Other similar patterns

### Breaking Changes
- **Count**: 3+ breaking changes
  - Signature changes
  - Return type changes
  - Visibility changes

### Architecture Violations
- **Count**: 3+ violations
  - Circular dependencies
  - Naming conventions
  - Design patterns

---

## Testing Commands

### 1. Basic Review
```bash
npx tsx src/index.ts review --repo abhijeet1771/AI-reviewer --pr <pr_number>
```

**Expected:**
- Basic issue detection
- Security issues flagged
- Performance issues identified

### 2. Enterprise Review
```bash
npx tsx src/index.ts review --repo abhijeet1771/AI-reviewer --pr <pr_number> --enterprise
```

**Expected:**
- All basic features +
- Duplicate detection (5+ duplicates)
- Breaking change detection (3+ changes)
- Architecture violations (3+ violations)
- Confidence scores

### 3. Generate Summary
```bash
npx tsx src/index.ts summarize --repo abhijeet1771/AI-reviewer --pr <pr_number>
```

**Expected:**
- Comprehensive markdown summary
- All findings listed
- Recommendations provided

### 4. Post Comments
```bash
npx tsx src/index.ts review --repo abhijeet1771/AI-reviewer --pr <pr_number> --enterprise --post
```

**Expected:**
- High-priority issues posted as inline comments
- Medium/low issues as summary comments
- Comments appear on correct lines

---

## Verification Checklist

After running the review, verify:

- [ ] **Basic Review Works**
  - [ ] Issues detected in Calculator.java
  - [ ] Security issues in SecurityService.java
  - [ ] Performance issues identified

- [ ] **Duplicate Detection Works**
  - [ ] DataProcessor duplicates detected
  - [ ] UserService duplicates detected
  - [ ] Similarity scores calculated

- [ ] **Breaking Changes Detected**
  - [ ] Signature changes identified
  - [ ] Return type changes identified
  - [ ] Visibility changes identified
  - [ ] Impacted files listed

- [ ] **Modern Practices Suggested**
  - [ ] Stream API suggestions
  - [ ] Optional suggestions
  - [ ] Records suggestions

- [ ] **Architecture Rules Enforced**
  - [ ] Violations detected
  - [ ] Naming issues flagged

- [ ] **Output Formats**
  - [ ] JSON report generated
  - [ ] Markdown summary generated
  - [ ] Comments posted (if --post used)

---

## Creating the PR

### Option 1: Using PowerShell Script
```powershell
.\CREATE_TEST_PR.ps1
```

### Option 2: Manual Steps
1. Create new branch: `test-droog-ai-comprehensive`
2. Copy test files to repository
3. Commit and push
4. Create PR on GitHub

### PR Details
- **Title**: "Test: Comprehensive Droog AI Feature Testing"
- **Description**: See CREATE_TEST_PR.ps1 for PR body
- **Base Branch**: main
- **Head Branch**: test-droog-ai-comprehensive

---

## Success Criteria

✅ **Test is successful if:**
- All issue types are detected
- Duplicate code is found
- Breaking changes are identified
- Modern practice suggestions are provided
- Architecture violations are flagged
- Summary is generated correctly
- Comments are posted correctly (if --post used)

---

## Notes

- This test PR is intentionally designed with issues
- All issues are real and should be fixed in production code
- The test validates that Droog AI can detect all these issues
- Use this PR to verify Droog AI is working correctly

---

**Ready to test?** Create the PR and run Droog AI review! 🚀



