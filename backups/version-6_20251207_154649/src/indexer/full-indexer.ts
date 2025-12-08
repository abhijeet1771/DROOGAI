/**
 * Full codebase indexer
 * Fetches and indexes entire codebase from GitHub
 */

import { GitHubClient } from '../github.js';
import { CodebaseIndexer } from './indexer.js';
import { EmbeddingGenerator } from '../embeddings/generator.js';
import { VectorDB, FileVectorDB } from '../storage/vector-db.js';
import { CodeExtractor } from '../parser/extractor.js';

export interface IndexingProgress {
  totalFiles: number;
  processedFiles: number;
  indexedSymbols: number;
  generatedEmbeddings: number;
  errors: number;
}

export class FullCodebaseIndexer {
  private github: GitHubClient;
  private indexer: CodebaseIndexer;
  private extractor: CodeExtractor;
  private embeddingGenerator?: EmbeddingGenerator;
  private vectorDB?: VectorDB;

  constructor(githubToken: string, geminiKey?: string) {
    this.github = new GitHubClient(githubToken);
    this.indexer = new CodebaseIndexer();
    this.extractor = new CodeExtractor();
    
    if (geminiKey) {
      this.embeddingGenerator = new EmbeddingGenerator(geminiKey);
      this.vectorDB = new FileVectorDB();
    }
  }

  /**
   * Index entire codebase from a branch
   */
  async indexRepository(owner: string, repo: string, branch: string = 'main'): Promise<IndexingProgress> {
    console.log(`📦 Indexing repository: ${owner}/${repo} (branch: ${branch})\n`);

    const progress: IndexingProgress = {
      totalFiles: 0,
      processedFiles: 0,
      indexedSymbols: 0,
      generatedEmbeddings: 0,
      errors: 0,
    };

    try {
      // Get repository tree
      console.log('📥 Fetching repository tree...');
      const tree = await this.github.getRepositoryTree(owner, repo, branch);
      progress.totalFiles = tree.length;
      console.log(`✓ Found ${tree.length} files to index\n`);

      // Filter for code files
      const codeFiles = tree.filter(file => this.isCodeFile(file.path));
      console.log(`📄 Filtered to ${codeFiles.length} code files\n`);

      // Process files in batches
      const batchSize = 10;
      for (let i = 0; i < codeFiles.length; i += batchSize) {
        const batch = codeFiles.slice(i, i + batchSize);
        await this.processBatch(batch, owner, repo, branch, progress);
        
        console.log(`Progress: ${progress.processedFiles}/${codeFiles.length} files (${progress.indexedSymbols} symbols)`);
      }

      console.log('\n✅ Indexing complete!');
      console.log(`   Files processed: ${progress.processedFiles}`);
      console.log(`   Symbols indexed: ${progress.indexedSymbols}`);
      if (this.embeddingGenerator) {
        console.log(`   Embeddings generated: ${progress.generatedEmbeddings}`);
      }

      return progress;
    } catch (error: any) {
      console.error('❌ Indexing failed:', error.message);
      throw error;
    }
  }

  /**
   * Process a batch of files
   */
  private async processBatch(
    files: Array<{ path: string; sha: string }>,
    owner: string,
    repo: string,
    branch: string,
    progress: IndexingProgress
  ): Promise<void> {
    const promises = files.map(file => this.processFile(file, owner, repo, progress));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single file
   */
  private async processFile(
    file: { path: string; sha: string },
    owner: string,
    repo: string,
    progress: IndexingProgress
  ): Promise<void> {
    try {
      // Fetch file content
      const content = await this.github.getFileContent(owner, repo, file.path);
      
      if (!content) {
        return;
      }

      // Parse file
      // Use multi-language extractor for sync extraction
      const { MultiLanguageExtractor } = await import('../parser/multi-language-extractor.js');
      const multiLangExtractor = new MultiLanguageExtractor();
      const parsed = multiLangExtractor.extractFromCodeSync(content, file.path);
      
      if (parsed.symbols.length === 0) {
        return;
      }

      // Index symbols (async to use tree-sitter)
      await this.indexer.indexFile(file.path, content);
      progress.indexedSymbols += parsed.symbols.length;

      // Generate embeddings if available
      if (this.embeddingGenerator && this.vectorDB) {
        try {
          const embeddings = await this.embeddingGenerator.generateEmbeddings(parsed.symbols);
          await this.vectorDB.storeBatch(embeddings);
          progress.generatedEmbeddings += embeddings.length;
        } catch (error) {
          // Embedding generation failed, continue without it
          console.warn(`⚠️  Failed to generate embeddings for ${file.path}`);
        }
      }

      progress.processedFiles++;
    } catch (error) {
      progress.errors++;
      console.warn(`⚠️  Failed to process ${file.path}:`, error);
    }
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(filepath: string): boolean {
    const codeExtensions = ['.java', '.js', '.ts', '.py', '.go', '.rs', '.cpp', '.c', '.cs'];
    const skipPatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /target/,
      /\.min\./,
      /\.lock$/,
    ];

    // Check skip patterns
    if (skipPatterns.some(pattern => pattern.test(filepath))) {
      return false;
    }

    // Check extension
    return codeExtensions.some(ext => filepath.endsWith(ext));
  }

  /**
   * Get indexer instance
   */
  getIndexer(): CodebaseIndexer {
    return this.indexer;
  }

  /**
   * Get vector DB instance
   */
  getVectorDB(): VectorDB | undefined {
    return this.vectorDB;
  }
}

