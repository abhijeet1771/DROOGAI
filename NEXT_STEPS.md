# Next Implementation Steps

## Current Status

### ✅ Completed
1. **Tree-sitter Parser Code** - Written and ready
2. **CodeExtractor** - Updated with Tree-sitter integration + regex fallback
3. **Fallback Strategy** - Regex works if Tree-sitter unavailable

### ⚠️ Note on Tree-sitter
- Code is written and ready
- Requires native bindings compilation
- Regex fallback works perfectly for now
- Can enhance with Tree-sitter later when needed

## 🚀 Next Features to Implement

### 1. Embeddings Generation (Priority)
**Goal:** Generate embeddings for code symbols to enable similarity search

**Steps:**
- Create embeddings service
- Use Gemini API for embeddings (or alternative)
- Store embeddings with metadata
- Implement similarity search

**Files to Create:**
- `src/embeddings/generator.ts` - Generate embeddings
- `src/embeddings/similarity.ts` - Similarity search

### 2. Storage Implementation
**Goal:** Store embeddings and symbols in database

**Options:**
- ChromaDB (vector database)
- SQLite + pgvector (if PostgreSQL available)
- Simple file-based storage (for MVP)

**Files to Create:**
- `src/storage/vector-db.ts` - Vector database interface
- `src/storage/chromadb.ts` - ChromaDB implementation
- `src/storage/file-storage.ts` - File-based fallback

### 3. Full Indexing Command
**Goal:** Index entire codebase from main branch

**Steps:**
- Fetch all files from main branch
- Parse each file
- Generate embeddings
- Store in database
- Build call graph

**Files to Update:**
- `src/indexer/indexer.ts` - Add full indexing
- `src/cli/index.ts` - Complete index command

### 4. Architecture Rules Engine
**Goal:** Enforce architecture rules

**Steps:**
- Define rule types
- Implement rule checkers
- Generate violations report

**Files to Create:**
- `src/rules/engine.ts` - Rules engine
- `src/rules/import-rules.ts` - Import rules
- `src/rules/naming-rules.ts` - Naming conventions

### 5. Confidence Scores
**Goal:** Add confidence scores to review output

**Steps:**
- Calculate confidence for each issue
- Add to report structure
- Display in output

**Files to Update:**
- `src/llm.ts` - Add confidence calculation
- `src/core/reviewer.ts` - Include in report

## 📋 Implementation Order

1. **Embeddings** (enables better duplicate detection)
2. **Storage** (needed for embeddings)
3. **Full Indexing** (uses embeddings + storage)
4. **Architecture Rules** (independent feature)
5. **Confidence Scores** (enhancement)

## 🔄 Workflow

For each feature:
1. Create backup
2. Implement feature
3. Test feature
4. Integrate into enterprise review
5. Verify end-to-end

---

**Ready to continue!** Starting with embeddings generation.
