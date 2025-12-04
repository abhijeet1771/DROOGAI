# Phase 1 Testing Guide

## ✅ Test Files Created

Branch: `test-phase1-features`  
Repository: `abhijeet1771/AI-reviewer`

### Files Created:

1. **`src/main/java/com/test/patterns/FactoryPattern.java`**
   - Factory pattern implementation
   - Should be detected by Pattern Detector

2. **`src/main/java/com/test/patterns/SingletonPattern.java`**
   - Singleton pattern with private constructor and getInstance()
   - Should be detected by Pattern Detector

3. **`src/main/java/com/test/complexity/ComplexMethod.java`**
   - High cyclomatic complexity method (`processComplexData`)
   - Long method (51 lines) - should trigger anti-pattern detection
   - Should be flagged as complexity hotspot

4. **`src/main/java/com/test/api/UserController.java`**
   - REST Controller missing versioning (`/api/users` instead of `/api/v1/users`)
   - Missing `@Valid` annotations on POST/PUT
   - Methods not returning `ResponseEntity`
   - Should trigger API Design Review issues

5. **`src/main/java/com/test/service/UserService.java`**
   - Public methods without tests
   - `deleteUser()` - critical method with no test (high priority)
   - Missing null checks
   - Should trigger Test Coverage Analysis

6. **`src/main/java/com/test/antipatterns/GodObject.java`**
   - 16 fields + 25 methods = God Object anti-pattern
   - Should be detected by Pattern Detector

7. **`pom.xml`**
   - Dependencies for dependency analysis
   - Spring Boot, Guava, Commons Lang3

---

## 🧪 How to Test

### Step 1: Create PR on GitHub

1. Go to: https://github.com/abhijeet1771/AI-reviewer/pull/new/test-phase1-features
2. Or manually:
   - Go to repository
   - Click "Pull requests"
   - Click "New pull request"
   - Base: `main` ← Compare: `test-phase1-features`
   - Title: "Test: Phase 1 Features (Patterns, Complexity, API, Tests, Dependencies)"
   - Create pull request

### Step 2: Run Droog AI Review

```bash
cd "D:\DROOG AI"

# Make sure you have environment variables set
# Or use command line options

# Run enterprise review (includes all Phase 1 features)
npx tsx src/index.ts --repo abhijeet1771/AI-reviewer --pr <PR_NUMBER> --enterprise
```

Replace `<PR_NUMBER>` with the actual PR number from Step 1.

---

## 📊 Expected Results

### Phase 5: Design Pattern Detection
- ✅ **Factory Pattern** detected in `FactoryPattern.java`
- ✅ **Singleton Pattern** detected in `SingletonPattern.java`
- ✅ **God Object** anti-pattern detected in `GodObject.java`
- ✅ **Long Method** anti-pattern detected in `ComplexMethod.java`

### Phase 5.5: API Design Review
- ✅ **Missing versioning** in `UserController.java`
- ✅ **Missing @Valid** on POST/PUT methods
- ✅ **Missing ResponseEntity** return types

### Phase 5.6: Code Complexity Analysis
- ✅ **Complexity hotspot** in `ComplexMethod.processComplexData()`
- ✅ **Long method** detected in `ComplexMethod.longMethod()`
- ✅ Average complexity metrics calculated

### Phase 5.7: Test Coverage Analysis
- ✅ **Missing tests** for `UserService` methods
- ✅ **High priority** missing test for `deleteUser()`
- ✅ **Edge cases** identified (null handling, empty collections)

### Phase 5.8: Dependency Analysis
- ✅ **Dependencies** extracted from `pom.xml`
- ✅ **Unused dependencies** detected (if any)
- ✅ **Version conflicts** detected (if any)

---

## 📋 What to Check in Output

### Console Output Should Show:

```
📋 Phase 5: Design Pattern Detection...
✓ Detected 2 design patterns
✓ Found 2 anti-patterns

📋 Phase 5.5: API Design Review...
✓ Found X API design issues
✓ Found X backward compatibility issues

📋 Phase 5.6: Code Complexity Analysis...
✓ Found X complexity hotspots
✓ Average cyclomatic complexity: X.XX

📋 Phase 5.7: Test Coverage Analysis...
✓ Coverage: Line XX%, Branch XX%, Method XX%
✓ Missing tests: X
✓ Missing edge cases: X

📋 Phase 5.8: Dependency Analysis...
✓ Vulnerabilities: X
✓ Unused dependencies: X
✓ Version conflicts: X
```

### Report.json Should Contain:

```json
{
  "designPatterns": {
    "detected": [...],
    "antiPatterns": [...]
  },
  "apiDesign": {
    "issues": [...],
    "backwardCompatibility": [...]
  },
  "complexity": {
    "hotspots": [...],
    "averageMetrics": {...}
  },
  "testCoverage": {
    "coverage": {...},
    "missingTests": [...],
    "edgeCases": [...]
  },
  "dependencies": {
    "vulnerabilities": [...],
    "unused": [...],
    "conflicts": [...]
  }
}
```

---

## ✅ Success Criteria

- [ ] Design patterns detected (Factory, Singleton)
- [ ] Anti-patterns detected (God Object, Long Method)
- [ ] API design issues found (versioning, validation)
- [ ] Complexity hotspots identified
- [ ] Missing tests detected
- [ ] Dependency analysis completed
- [ ] All findings included in summary
- [ ] Report.json contains all Phase 1 data

---

## 🐛 Troubleshooting

### If patterns not detected:
- Check if files are being parsed correctly
- Verify symbol extraction is working

### If API issues not found:
- Ensure `UserController.java` is in the PR
- Check if file contains `Controller` or `Api` in name

### If complexity not calculated:
- Verify `ComplexMethod.java` is parsed
- Check if method has enough complexity (nested ifs, loops)

### If test coverage shows 0%:
- Ensure test files are separated from source files
- Check if test files have "test" or "spec" in name

---

## 📝 Notes

- Basic implementations work without external tools
- JaCoCo, PMD, OWASP integrations are placeholders for future enhancement
- All analyzers use AST-based analysis + Gemini prompts
- Results may vary based on Gemini API responses

---

**Ready to test! Create PR and run the review command.** 🚀



