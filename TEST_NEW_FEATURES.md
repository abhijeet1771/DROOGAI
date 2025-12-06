# Testing New Review Features

## New Review Points Added

1. **Better coding practices** - Suggests improvements like using const/let appropriately, avoiding magic numbers, proper error handling
2. **Better available method or approach** - Suggests modern APIs, built-in functions, or more efficient alternatives
3. **Duplicate code** - Identifies code patterns that are repeated within the diff

## Test Files Created

Three test Java files have been created in `test-files/` directory:

### 1. UserService.java
**Issues to test:**
- ✅ Magic numbers (1000, etc.)
- ✅ Old-style for loops (should use streams)
- ✅ Duplicate code patterns (getUserNames, getUserIds have same structure)
- ✅ Duplicate validation logic (validateUser, isValidUser)
- ✅ Not using Optional for nullable returns

### 2. ProductService.java
**Issues to test:**
- ✅ Old-style iteration (should use streams)
- ✅ Not using Optional
- ✅ Magic numbers (0.1 discount rate)
- ✅ Duplicate code (findById same as UserService.getUserById)
- ✅ Bad string comparison (using == instead of .equals())

### 3. OrderProcessor.java
**Issues to test:**
- ✅ Using old Date API (should use java.time)
- ✅ Magic numbers (100, 1000)
- ✅ Duplicate validation (canProcess, isValid)
- ✅ Not using streams for filtering
- ✅ Mutable static variable

## How to Test

### Option 1: Using PowerShell Script (Windows)

```powershell
cd "D:\DROOG AI"
.\CREATE_TEST_PR.ps1
git push origin test-new-review-features
```

Then create PR on GitHub and run:
```bash
npx tsx src/index.ts --repo abhijeet1771/AI-reviewer --pr <PR_NUMBER>
```

### Option 2: Manual Steps

1. **Create a new branch:**
   ```bash
   git checkout -b test-new-review-features
   ```

2. **Add and commit test files:**
   ```bash
   git add test-files/
   git commit -m "Add test files for new review features"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin test-new-review-features
   ```

4. **Create PR on GitHub:**
   - Go to: https://github.com/abhijeet1771/AI-reviewer
   - Click "New Pull Request"
   - Base: `main` ← Compare: `test-new-review-features`
   - Create PR

5. **Run the reviewer:**
   ```bash
   npx tsx src/index.ts --repo abhijeet1771/AI-reviewer --pr <PR_NUMBER>
   ```

## Expected Review Findings

The AI reviewer should identify:

### Better Coding Practices:
- Magic numbers should be constants
- Use proper variable declarations (avoid var where type is unclear)
- Use modern Java time API instead of Date

### Better Available Methods:
- Use `Optional<T>` instead of returning null
- Use Java Streams API instead of manual loops
- Use `.equals()` instead of `==` for string comparison
- Use `List.stream().map()` instead of manual loops

### Duplicate Code:
- `getUserNames()` and `getUserIds()` have duplicate loop structure
- `validateUser()` and `isValidUser()` are identical
- `canProcess()` and `isValid()` are identical
- `findById()` in ProductService duplicates `getUserById()` pattern from UserService

## Verification

After running the review, check:
1. ✅ Are magic numbers flagged?
2. ✅ Are old-style loops suggested to use streams?
3. ✅ Are duplicate code patterns identified?
4. ✅ Are better Java APIs suggested (Optional, java.time)?
5. ✅ Are string comparison issues caught?








