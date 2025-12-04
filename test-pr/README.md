# Droog AI Test PR

This PR contains test files designed to comprehensively test all Droog AI features.

## Test Coverage

### 1. Basic Code Review
- **Calculator.java**: Bugs, performance issues, missing null checks
- **UserService.java**: Index out of bounds, inefficient operations
- **SecurityService.java**: Security vulnerabilities (SQL injection, hardcoded secrets)

### 2. Duplicate Code Detection
- **DataProcessor.java**: Contains 3 duplicate methods (processData1, processData2, processData3)
- **UserService.java**: Contains duplicate search methods (findUserByName, findUserByEmail)

### 3. Breaking Changes
- **BreakingChanges.java**: Method signature changes, return type changes, visibility changes

### 4. Modern Practices
- **ModernPractices.java**: Should use Stream API, Optional, Records, List.of()

### 5. Architecture Violations
- **ArchitectureViolations.java**: Circular dependencies, naming violations, magic numbers

## Expected Findings

When reviewed with `droog review --enterprise`, this PR should detect:

- **High Priority Issues**: Security vulnerabilities, potential crashes
- **Medium Priority Issues**: Performance problems, code smells
- **Low Priority Issues**: Style issues, suggestions
- **Duplicates**: Multiple duplicate code patterns
- **Breaking Changes**: API signature changes
- **Architecture Violations**: Rule violations

## Testing Commands

```bash
# Basic review
npx tsx src/index.ts review --repo owner/repo --pr <pr_number>

# Enterprise review
npx tsx src/index.ts review --repo owner/repo --pr <pr_number> --enterprise

# Generate summary
npx tsx src/index.ts summarize --repo owner/repo --pr <pr_number>
```



