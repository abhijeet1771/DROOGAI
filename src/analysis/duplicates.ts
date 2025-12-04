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
    
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const similarity = await this.calculateSimilarity(symbols[i], symbols[j]);
        
        if (similarity > 0.8) {
          duplicates.push({
            symbol1: symbols[i],
            symbol2: symbols[j],
            similarity,
            type: similarity > 0.95 ? 'exact' : 'similar',
            reason: this.getDuplicateReason(symbols[i], symbols[j]),
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
    
    // Use vector DB if available for faster similarity search
    if (this.vectorDB && this.embeddingGenerator) {
      for (const symbol of symbols) {
        try {
          const similarEmbeddings = await this.vectorDB.findSimilarToSymbol(symbol, 10, 0.7);
          
          for (const embedding of similarEmbeddings) {
            // Skip if same file
            if (symbol.file === embedding.symbol.file) continue;
            
            duplicates.push({
              symbol1: symbol,
              symbol2: embedding.symbol,
              similarity: 0.7, // Approximate from threshold
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
    for (const symbol of symbols) {
      for (const indexedSymbol of index.symbols) {
        // Skip if same file
        if (symbol.file === indexedSymbol.file) continue;
        
        const similarity = await this.calculateSimilarity(symbol, indexedSymbol);
        
        if (similarity > 0.7) {
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
}

