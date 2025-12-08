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
        
        // Skip if one is test file and other is production file (different contexts)
        if (this.isTestFile(sourceSymbols[i].file) !== this.isTestFile(sourceSymbols[j].file)) {
          continue;
        }
        
        // Skip if comparing different method types (e.g., service method vs test method)
        if (this.isDifferentMethodContext(sourceSymbols[i], sourceSymbols[j])) {
          continue;
        }
        
        const similarity = await this.calculateSimilarity(sourceSymbols[i], sourceSymbols[j]);
        
        // Additional check: If signatures match but logic is different, don't mark as 100% duplicate
        if (similarity > 0.95 && this.hasDifferentLogic(sourceSymbols[i], sourceSymbols[j])) {
          // Still report but as 'similar' not 'exact'
          duplicates.push({
            symbol1: sourceSymbols[i],
            symbol2: sourceSymbols[j],
            similarity: Math.min(similarity, 0.94), // Cap at 94% if logic differs
            type: 'similar',
            reason: `Similar signature but different logic: ${this.getDuplicateReason(sourceSymbols[i], sourceSymbols[j])}`,
          });
          continue;
        }
        
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
            
            // Skip if one is test file and other is production file
            if (this.isTestFile(symbol.file) !== this.isTestFile(embedding.symbol.file)) {
              continue;
            }
            
            // Skip if different method contexts
            if (this.isDifferentMethodContext(symbol, embedding.symbol)) {
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
        
        // Skip if one is test file and other is production file
        if (this.isTestFile(symbol.file) !== this.isTestFile(indexedSymbol.file)) {
          continue;
        }
        
        // Skip if different method contexts
        if (this.isDifferentMethodContext(symbol, indexedSymbol)) {
          continue;
        }
        
        const similarity = await this.calculateSimilarity(symbol, indexedSymbol);
        
        // Check if logic differs even with high similarity
        if (similarity > 0.95 && this.hasDifferentLogic(symbol, indexedSymbol)) {
          // Still report but with reduced similarity
          duplicates.push({
            symbol1: symbol,
            symbol2: indexedSymbol,
            similarity: Math.min(similarity, 0.94),
            type: 'similar',
            reason: `Similar signature but different logic: Similar to existing ${indexedSymbol.type} in ${indexedSymbol.file}`,
          });
          continue;
        }
        
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
   * Check if file is a test file
   */
  private isTestFile(filepath: string): boolean {
    const testPatterns = [
      /test/i,
      /spec/i,
      /__tests__/i,
      /\.test\./i,
      /\.spec\./i,
      /test-.*\./i,
      /.*-test\./i,
      /.*-spec\./i,
    ];
    
    return testPatterns.some(pattern => pattern.test(filepath));
  }

  /**
   * Check if two methods are in different contexts (e.g., service method vs test method)
   */
  private isDifferentMethodContext(symbol1: CodeSymbol, symbol2: CodeSymbol): boolean {
    const file1 = symbol1.file.toLowerCase();
    const file2 = symbol2.file.toLowerCase();
    
    // If both are test files, allow comparison (test methods can be compared)
    if (this.isTestFile(symbol1.file) && this.isTestFile(symbol2.file)) {
      return false;
    }
    
    // If both are production files, allow comparison (production methods can be compared)
    if (!this.isTestFile(symbol1.file) && !this.isTestFile(symbol2.file)) {
      return false;
    }
    
    // Different contexts: one test, one production - DON'T compare
    // Also check for service vs test, controller vs test, etc.
    const isService1 = file1.includes('service') || file1.includes('service/');
    const isService2 = file2.includes('service') || file2.includes('service/');
    const isController1 = file1.includes('controller') || file1.includes('controller/');
    const isController2 = file2.includes('controller') || file2.includes('controller/');
    
    // If one is service/controller and other is test, different contexts
    if ((isService1 || isController1) && this.isTestFile(symbol2.file)) {
      return true;
    }
    if ((isService2 || isController2) && this.isTestFile(symbol1.file)) {
      return true;
    }
    
    // Different contexts: one test, one production
    return true;
  }

  /**
   * Check if two methods have different logic despite similar signatures
   */
  private hasDifferentLogic(symbol1: CodeSymbol, symbol2: CodeSymbol): boolean {
    if (!symbol1.code || !symbol2.code) {
      return false; // Can't determine without code
    }
    
    // Extract method bodies (remove signature)
    const body1 = this.extractMethodBody(symbol1.code);
    const body2 = this.extractMethodBody(symbol2.code);
    
    if (!body1 || !body2) {
      return false;
    }
    
    // Normalize whitespace
    const normalized1 = body1.replace(/\s+/g, ' ').trim();
    const normalized2 = body2.replace(/\s+/g, ' ').trim();
    
    // If bodies are very different, they have different logic
    // Check for key differences:
    // 1. Different method calls
    // 2. Different return values
    // 3. Different transformations (toUpperCase vs toLowerCase)
    
    // Check for opposite operations
    const oppositeOps = [
      { op1: 'toUpperCase', op2: 'toLowerCase' },
      { op1: 'toLowerCase', op2: 'toUpperCase' },
      { op1: 'add', op2: 'subtract' },
      { op1: 'push', op2: 'pop' },
    ];
    
    for (const { op1, op2 } of oppositeOps) {
      if ((normalized1.includes(op1) && normalized2.includes(op2)) ||
          (normalized1.includes(op2) && normalized2.includes(op1))) {
        return true;
      }
    }
    
    // Check if method bodies are significantly different (more than 30% difference)
    const similarity = this.calculateStringSimilarity(normalized1, normalized2);
    return similarity < 0.7; // Less than 70% similar = different logic
  }

  /**
   * Extract method body (remove signature and braces)
   */
  private extractMethodBody(code: string): string | null {
    // Find first opening brace
    const openBrace = code.indexOf('{');
    if (openBrace === -1) {
      return null;
    }
    
    // Find matching closing brace
    let depth = 0;
    let closeBrace = -1;
    for (let i = openBrace; i < code.length; i++) {
      if (code[i] === '{') depth++;
      if (code[i] === '}') depth--;
      if (depth === 0) {
        closeBrace = i;
        break;
      }
    }
    
    if (closeBrace === -1) {
      return null;
    }
    
    return code.substring(openBrace + 1, closeBrace).trim();
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    // Simple similarity: count common words
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
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

