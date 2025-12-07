/**
 * Duplicate code detection
 * Detects duplicates within PR and across codebase
 */

import { CodeSymbol, CodeIndex } from '../parser/types.js';
import { CodebaseIndexer } from '../indexer/indexer.js';
import { EmbeddingGenerator } from '../embeddings/generator.js';
import { VectorDB } from '../storage/vector-db.js';

export interface DuplicateMatch {
  symbol1: CodeSymbol;
  symbol2: CodeSymbol;
  similarity: number; // 0-1
  type: 'exact' | 'similar' | 'pattern';
  reason: string;
}

export class DuplicateDetector {
  private indexer: CodebaseIndexer;
  private embeddingGenerator?: EmbeddingGenerator;
  private vectorDB?: VectorDB;
  
  constructor(indexer: CodebaseIndexer, embeddingGenerator?: EmbeddingGenerator, vectorDB?: VectorDB) {
    this.indexer = indexer;
    this.embeddingGenerator = embeddingGenerator;
    this.vectorDB = vectorDB;
  }
  
  /**
   * Detect duplicates within PR files
   */
  async detectWithinPR(symbols: CodeSymbol[]): Promise<DuplicateMatch[]> {
    const duplicates: DuplicateMatch[] = [];
    
    // Filter out non-source files and same-language only comparisons
    const sourceSymbols = symbols.filter(s => this.isSourceFile(s.file));
    
    for (let i = 0; i < sourceSymbols.length; i++) {
      for (let j = i + 1; j < sourceSymbols.length; j++) {
        // Skip if same file AND same method name AND same signature - don't compare exact same method within the same file
        // But still compare:
        //   - Different files (cross-file comparison is allowed)
        //   - Same file but different signatures (method overloading - testLogin() vs testLogin(String param))
        if (sourceSymbols[i].file === sourceSymbols[j].file && 
            sourceSymbols[i].name === sourceSymbols[j].name &&
            sourceSymbols[i].signature === sourceSymbols[j].signature) {
          continue;
        }
        
        // Skip if different file types (e.g., .java vs .js vs .ps1)
        if (!this.isSameLanguage(sourceSymbols[i].file, sourceSymbols[j].file)) {
          continue;
        }
        
        // Skip if same type is required for meaningful comparison
        if (sourceSymbols[i].type !== sourceSymbols[j].type) {
          continue;
        }
        
        const similarity = await this.calculateSimilarity(sourceSymbols[i], sourceSymbols[j]);
        
        // Only report if similarity is high enough and both are source code
        if (similarity > 0.8) {
          duplicates.push({
            symbol1: sourceSymbols[i],
            symbol2: sourceSymbols[j],
            similarity,
            type: similarity > 0.95 ? 'exact' : 'similar',
            reason: this.getDuplicateReason(sourceSymbols[i], sourceSymbols[j]),
          });
        }
      }
    }
    
    return duplicates;
  }
  
  /**
   * Detect duplicates against indexed codebase
   */
  async detectCrossRepo(symbols: CodeSymbol[]): Promise<DuplicateMatch[]> {
    const duplicates: DuplicateMatch[] = [];
    
    // Filter to only source code files
    const sourceSymbols = symbols.filter(s => this.isSourceFile(s.file));
    
    // Use vector DB if available for faster similarity search
    if (this.vectorDB && this.embeddingGenerator) {
      for (const symbol of sourceSymbols) {
        try {
          const similarEmbeddings = await this.vectorDB.findSimilarToSymbol(symbol, 10, 0.75); // Increased threshold
          
          for (const embedding of similarEmbeddings) {
            // Skip if same file
            if (symbol.file === embedding.symbol.file) continue;
            
            // Skip if different languages
            if (!this.isSameLanguage(symbol.file, embedding.symbol.file)) {
              continue;
            }
            
            // Skip if different types
            if (symbol.type !== embedding.symbol.type) {
              continue;
            }
            
            duplicates.push({
              symbol1: symbol,
              symbol2: embedding.symbol,
              similarity: 0.75, // Approximate from threshold
              type: 'similar',
              reason: `Similar to existing ${embedding.symbol.type} in ${embedding.symbol.file}`,
            });
          }
        } catch (error) {
          console.warn('Vector DB search failed, using fallback:', error);
        }
      }
    }
    
    // Fallback to index-based search
    const index = this.indexer.getIndex();
    for (const symbol of sourceSymbols) {
      for (const indexedSymbol of index.symbols) {
        // Skip if same file
        if (symbol.file === indexedSymbol.file) continue;
        
        // Skip if different languages (prevents PowerShell vs Java false positives)
        if (!this.isSameLanguage(symbol.file, indexedSymbol.file)) {
          continue;
        }
        
        // Skip if different types
        if (symbol.type !== indexedSymbol.type) {
          continue;
        }
        
        const similarity = await this.calculateSimilarity(symbol, indexedSymbol);
        
        // Increased threshold to reduce false positives
        if (similarity > 0.75) {
          duplicates.push({
            symbol1: symbol,
            symbol2: indexedSymbol,
            similarity,
            type: 'similar',
            reason: `Similar to existing ${indexedSymbol.type} in ${indexedSymbol.file}`,
          });
        }
      }
    }
    
    return duplicates;
  }
  
  /**
   * Calculate similarity between two symbols
   * Uses embeddings if available, otherwise falls back to simple comparison
   */
  private async calculateSimilarity(s1: CodeSymbol, s2: CodeSymbol): Promise<number> {
    // Use embeddings if available
    if (this.embeddingGenerator && this.vectorDB) {
      try {
        const embedding1 = await this.embeddingGenerator.generateEmbedding(s1);
        const embedding2 = await this.embeddingGenerator.generateEmbedding(s2);
        return EmbeddingGenerator.cosineSimilarity(embedding1, embedding2);
      } catch (error) {
        // Fallback to simple comparison
        console.warn('Embedding similarity failed, using fallback:', error);
      }
    }
    
    // Fallback to simple comparison
    return this.calculateSimilaritySimple(s1, s2);
  }

  /**
   * Simple similarity calculation (fallback)
   */
  private calculateSimilaritySimple(s1: CodeSymbol, s2: CodeSymbol): number {
    // Check if same type
    if (s1.type !== s2.type) return 0;
    
    // Check signature similarity
    if (s1.signature && s2.signature) {
      if (s1.signature === s2.signature) return 1.0;
      
      // Simple similarity based on parameter count and return type
      const sig1 = this.normalizeSignature(s1.signature);
      const sig2 = this.normalizeSignature(s2.signature);
      if (sig1 === sig2) return 0.9;
    }
    
    // Check code similarity (simplified)
    if (s1.code && s2.code) {
      const code1 = this.normalizeCode(s1.code);
      const code2 = this.normalizeCode(s2.code);
      
      // Simple line-by-line comparison
      const lines1 = code1.split('\n').filter(l => l.trim());
      const lines2 = code2.split('\n').filter(l => l.trim());
      
      if (lines1.length === 0 || lines2.length === 0) return 0;
      
      const commonLines = lines1.filter(l => lines2.includes(l)).length;
      return commonLines / Math.max(lines1.length, lines2.length);
    }
    
    return 0;
  }
  
  private normalizeSignature(sig: string): string {
    // Remove whitespace and normalize
    return sig.replace(/\s+/g, ' ').trim().toLowerCase();
  }
  
  private normalizeCode(code: string): string {
    // Remove comments, whitespace, normalize
    return code
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private getDuplicateReason(s1: CodeSymbol, s2: CodeSymbol): string {
    if (s1.signature === s2.signature) {
      return `Exact duplicate: ${s1.type} with same signature`;
    }
    if (s1.name === s2.name && s1.type === s2.type) {
      return `Duplicate ${s1.type} name: ${s1.name}`;
    }
    return `Similar ${s1.type} pattern`;
  }

  /**
   * Check if file is a source code file (not config, docs, scripts)
   */
  private isSourceFile(filepath: string): boolean {
    const sourceExtensions = [
      '.java', '.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.cpp', '.c', '.cs',
      '.kt', '.swift', '.rb', '.php', '.scala', '.clj', '.hs', '.ml', '.fs'
    ];
    
    const nonSourcePatterns = [
      /\.md$/i,           // Markdown
      /\.txt$/i,          // Text files
      /\.json$/i,         // Config files
      /\.yml$/i, /\.yaml$/i, // Config files
      /\.xml$/i,          // Config files
      /\.properties$/i,   // Config files
      /\.ps1$/i,          // PowerShell scripts
      /\.sh$/i,           // Shell scripts
      /\.bat$/i, /\.cmd$/i, // Batch files
      /\.lock$/i,         // Lock files
      /package-lock\.json$/i,
      /yarn\.lock$/i,
      /\.min\.(js|css)$/i, // Minified files
    ];
    
    // Check if it's a non-source file
    if (nonSourcePatterns.some(pattern => pattern.test(filepath))) {
      return false;
    }
    
    // Check if it has a source extension
    return sourceExtensions.some(ext => filepath.toLowerCase().endsWith(ext));
  }

  /**
   * Check if two files are the same language
   */
  private isSameLanguage(file1: string, file2: string): boolean {
    const getLanguage = (filepath: string): string | null => {
      if (filepath.endsWith('.java')) return 'java';
      if (filepath.endsWith('.js') || filepath.endsWith('.jsx')) return 'javascript';
      if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) return 'typescript';
      if (filepath.endsWith('.py')) return 'python';
      if (filepath.endsWith('.go')) return 'go';
      if (filepath.endsWith('.rs')) return 'rust';
      if (filepath.endsWith('.cpp') || filepath.endsWith('.c')) return 'cpp';
      if (filepath.endsWith('.cs')) return 'csharp';
      if (filepath.endsWith('.kt')) return 'kotlin';
      if (filepath.endsWith('.swift')) return 'swift';
      if (filepath.endsWith('.rb')) return 'ruby';
      if (filepath.endsWith('.php')) return 'php';
      if (filepath.endsWith('.ps1')) return 'powershell';
      if (filepath.endsWith('.sh')) return 'shell';
      return null;
    };
    
    const lang1 = getLanguage(file1);
    const lang2 = getLanguage(file2);
    
    // If we can't determine language, allow comparison (fallback)
    if (!lang1 || !lang2) {
      return true;
    }
    
    return lang1 === lang2;
  }
}

