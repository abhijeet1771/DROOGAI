# Tree-sitter Import Fix

## Problem
Tree-sitter package not installed, causing import errors at module load time.

## Solution
Made Tree-sitter import **optional and lazy**:

1. **Dynamic Import** - Tree-sitter is now loaded at runtime using `import()` instead of static import
2. **Graceful Fallback** - If Tree-sitter is not available, automatically uses regex-based extraction
3. **Backward Compatibility** - Added sync methods (`extractFromJavaSync`, `extractCallsSync`) for existing code

## Changes Made

### `src/parser/extractor.ts`
- Removed static import of TreeSitterParser
- Added lazy initialization with dynamic import
- Added sync methods for backward compatibility
- Async methods try Tree-sitter first, fallback to regex

### Updated Call Sites
- `src/indexer/indexer.ts` - Uses sync methods
- `src/core/reviewer.ts` - Uses sync methods

## Result
- ✅ Code works without tree-sitter installed
- ✅ Automatically uses regex fallback
- ✅ Can upgrade to Tree-sitter later when installed
- ✅ No breaking changes to existing code

## Status
**Fixed** - Code now works with or without tree-sitter package installed.








