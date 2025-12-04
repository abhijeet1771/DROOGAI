# DROOG AI Enterprise Upgrade Plan

## Overview
Upgrade from basic code reviewer to enterprise-grade AI Code Reviewer with Google/Meta-level capabilities.

## Architecture

```
src/
├── core/              # Core review engine
│   ├── reviewer.ts   # Main review orchestrator
│   └── analyzer.ts   # Code analysis engine
├── parser/           # Code parsing
│   ├── tree-sitter.ts # Tree-sitter integration
│   └── extractor.ts  # Extract symbols, functions, classes
├── indexer/          # Codebase indexing
│   ├── indexer.ts    # Main indexer
│   ├── embeddings.ts # Embedding generation
│   └── storage.ts    # ChromaDB/SQLite storage
├── analysis/         # Advanced analysis
│   ├── duplicates.ts # Duplicate detection
│   ├── breaking.ts   # Breaking change detection
│   ├── flowgraph.ts  # Flow graph construction
│   └── architecture.ts # Architecture rules
├── output/           # Output generation
│   ├── structured.ts # Structured JSON output
│   ├── patches.ts    # Patch generation
│   └── summary.ts    # PR summary
├── cli/              # CLI commands
│   ├── index.ts      # droog index
│   ├── review.ts     # droog review
│   ├── analyze.ts    # droog analyze
│   └── summarize.ts  # droog summarize
└── server/           # Optional HTTP server
    └── api.ts        # REST API endpoints
```

## Implementation Phases

### Phase 1: Foundation (Current ✅)
- Basic PR review
- Gemini integration
- GitHub API

### Phase 2: Code Parsing (Next)
- Tree-sitter integration
- Extract functions, classes, methods
- Build AST representation

### Phase 3: Indexing & Embeddings
- ChromaDB/SQLite setup
- Generate embeddings
- Store codebase index

### Phase 4: Advanced Features
- Duplicate detection (cross-repo)
- Breaking change detection
- Flow graph construction
- Architecture rules

### Phase 5: Enhanced Output
- Structured JSON with confidence
- Patch generation
- PR summaries

### Phase 6: CLI & Server
- New commands
- HTTP server option

## Dependencies Needed

```json
{
  "tree-sitter": "^0.20.0",
  "tree-sitter-java": "^0.20.0",
  "chromadb": "^1.0.0",
  "better-sqlite3": "^9.0.0",
  "@tiktoken/encoder": "^1.0.0",
  "express": "^4.18.0"
}
```

## Token Optimization Strategy

1. **Chunking**: Split large files into functions/classes
2. **Context Selection**: Only send relevant code slices
3. **Similarity Search**: Find top-N similar functions from index
4. **Compression**: Use concise prompts, compress reasoning
5. **Caching**: Cache embeddings and analysis results

## Backward Compatibility

- Keep existing `--repo --pr` command working
- Add new features as optional flags
- Maintain current output format
- Add enhanced format as `--format structured`

## Next Steps

1. Add Tree-sitter for Java parsing
2. Create code extractor
3. Set up embedding generation
4. Build indexer
5. Add duplicate detection
6. Implement breaking change detection
7. Add new CLI commands
8. Create HTTP server




