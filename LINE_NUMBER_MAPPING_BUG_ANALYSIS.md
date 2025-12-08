# 🐛 Line Number Mapping Bug Analysis

## Problem
Comments are appearing at wrong locations in GitHub PR. User reported that comments are not at the correct lines.

## Root Cause Analysis

### 1. **How Line Numbers Flow Through the System**

```
Analyzer finds issue
  ↓
Uses: symbol.startLine + i (FULL FILE line number, e.g., line 50)
  ↓
mapFileLineToPRLine(filepath, 50) called
  ↓
Tries to map line 50 to PR diff line
  ↓
Posts comment with mapped line number
```

### 2. **The Bug in `mapFileLineToPRLine()`**

**Current Logic:**
```typescript
// When hunk header found: @@ -10,5 +15,5 @@
prLineNumber = parseInt(match[2], 10) - 1; // = 14
fileLineCount = parseInt(match[2], 10) - 1; // = 14

// For each line in patch:
if (line.startsWith('+')) {
  fileLineCount++; // Counts lines in NEW file
  prLineNumber++;  // Also increments (WRONG!)
  if (fileLineCount === fileLine) {
    return prLineNumber; // Returns wrong number!
  }
}
```

**Problems:**
1. **`prLineNumber` is being incremented incorrectly** - It should track the line number in the NEW file, not a separate counter
2. **Multiple hunks not handled correctly** - Each hunk resets counters, but if line is in second hunk, first hunk's counting affects it
3. **Context lines confusion** - Context lines (` `) are counted, but they might not be in the actual diff

### 3. **GitHub API Requirements**

GitHub PR comments need:
- **Line number in the NEW file** (after changes)
- **NOT the diff line number**
- **NOT the old file line number**

Example:
```
File has 100 lines
PR changes lines 20-30
Comment on line 25 should use line number 25 (in new file)
```

### 4. **Why It's Hard to Comment at Right Place**

1. **Full File vs PR Diff**: Analyzers work on full file, but PR only shows diff
2. **Multiple Hunks**: One file can have multiple change sections
3. **Context Lines**: Diff includes context lines that aren't actually changed
4. **Deleted Lines**: Need to skip deleted lines when counting
5. **Line Number Mismatch**: Full file line 50 might be PR diff line 15

## The Fix

### Correct Mapping Logic:

```typescript
private mapFileLineToPRLine(filepath: string, fileLine: number): number | null {
  const prFile = this.prFiles.find(f => f.filename === filepath);
  if (!prFile || !prFile.patch) {
    return null;
  }
  
  const patch = prFile.patch;
  const lines = patch.split('\n');
  let newFileLineNumber = 0; // Line number in NEW file (after changes)
  
  for (const line of lines) {
    // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        // newStart is where new file lines start in this hunk
        newFileLineNumber = parseInt(match[2], 10) - 1; // -1 because we'll increment
        continue;
      }
    }
    
    // Skip deleted lines (they're not in new file)
    if (line.startsWith('-')) {
      continue; // Don't increment newFileLineNumber
    }
    
    // Added lines (start with +) are in new file
    if (line.startsWith('+')) {
      newFileLineNumber++;
      if (newFileLineNumber === fileLine) {
        return newFileLineNumber; // This is the line number in NEW file
      }
      continue;
    }
    
    // Context lines (start with space) are also in new file
    if (line.startsWith(' ')) {
      newFileLineNumber++;
      if (newFileLineNumber === fileLine) {
        return newFileLineNumber; // This is the line number in NEW file
      }
      continue;
    }
  }
  
  // Line not found in PR diff (not in any hunk)
  return null;
}
```

### Key Changes:
1. **Single counter**: Use `newFileLineNumber` only (not separate `prLineNumber`)
2. **Correct initialization**: Start from hunk's `newStart` value
3. **Skip deleted lines**: Don't increment counter for `-` lines
4. **Return new file line number**: GitHub API needs this, not diff line number

## Why This Became Hard

1. **Complexity**: Multiple systems (analyzers, mappers, GitHub API) with different line number systems
2. **Edge Cases**: Multiple hunks, deleted lines, context lines
3. **Misunderstanding**: Thought we needed "diff line number" but actually need "new file line number"
4. **No Verification**: No way to verify if mapping is correct before posting

## Solution

1. **Fix mapping logic** (as shown above)
2. **Add verification**: After posting, check if comment is at correct line
3. **Add logging**: Log mapping attempts for debugging
4. **Handle edge cases**: Multiple hunks, large files, etc.


