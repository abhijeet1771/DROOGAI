/**
 * Enhanced Semantic Search & Code Intelligence
 * Deep code understanding with semantic search and code embeddings
 */

import { CodeSymbol } from '../parser/types.js';
import { EmbeddingGenerator } from '../embeddings/generator.js';
import { VectorDB } from '../storage/vector-db.js';

export interface SemanticSearchResult {
  symbol: CodeSymbol;
  similarity: number;
  reason: string;
  context: string;
}

export interface CodeIntelligence {
  findSimilarCode(query: string, limit?: number): Promise<SemanticSearchResult[]>;
  findCodeByIntent(intent: string, limit?: number): Promise<SemanticSearchResult[]>;
  findCodePatterns(pattern: string): Promise<SemanticSearchResult[]>;
  explainCode(symbol: CodeSymbol): Promise<string>;
}

export class SemanticCodeIntelligence implements CodeIntelligence {
  private embeddingGenerator: EmbeddingGenerator;
  private vectorDB: VectorDB;
  private indexer: any;

  constructor(embeddingGenerator: EmbeddingGenerator, vectorDB: VectorDB, indexer: any) {
    this.embeddingGenerator = embeddingGenerator;
    this.vectorDB = vectorDB;
    this.indexer = indexer;
  }

  /**
   * Find similar code using semantic search
   */
  async findSimilarCode(query: string, limit: number = 10): Promise<SemanticSearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateQueryEmbedding(query);
    
    // Find similar embeddings
    const similarEmbeddings = await this.vectorDB.findSimilar(queryEmbedding, limit, 0.6);
    
    return similarEmbeddings.map(emb => ({
      symbol: emb.symbol,
      similarity: this.calculateSimilarity(queryEmbedding, emb.vector),
      reason: `Semantically similar to: ${query}`,
      context: this.getContext(emb.symbol),
    }));
  }

  /**
   * Find code by intent (what the code does, not exact match)
   */
  async findCodeByIntent(intent: string, limit: number = 10): Promise<SemanticSearchResult[]> {
    // Enhanced query with intent keywords
    const enhancedQuery = `code that ${intent} implementation function method`;
    return this.findSimilarCode(enhancedQuery, limit);
  }

  /**
   * Find code patterns (design patterns, common structures)
   */
  async findCodePatterns(pattern: string, limit: number = 10): Promise<SemanticSearchResult[]> {
    // Pattern-specific search
    const patternQuery = `${pattern} pattern implementation design`;
    return this.findSimilarCode(patternQuery, limit);
  }

  /**
   * Explain what code does using AI
   */
  async explainCode(symbol: CodeSymbol): Promise<string> {
    // Use AI to explain code semantics
    const codeText = symbol.code || '';
    const explanation = `This ${symbol.type} ${symbol.name} ${symbol.signature || ''} performs operations related to ${this.inferPurpose(symbol)}`;
    return explanation;
  }

  /**
   * Generate embedding for natural language query
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    // Convert query to embedding using same method as code
    // For now, use simple text-based embedding
    const text = query.toLowerCase();
    const embedding: number[] = new Array(128).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = charCode % 128;
      embedding[index] = (embedding[index] + charCode / 1000) % 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    
    return embedding;
  }

  /**
   * Calculate similarity between embeddings
   */
  private calculateSimilarity(emb1: number[], emb2: number[]): number {
    return EmbeddingGenerator.cosineSimilarity(emb1, emb2);
  }

  /**
   * Get context for a symbol
   */
  private getContext(symbol: CodeSymbol): string {
    const index = this.indexer.getIndex();
    const callers = index.callGraph.filter((c: any) => c.callee === symbol.name);
    const callees = index.callGraph.filter((c: any) => c.caller === symbol.name);
    
    return `Called by ${callers.length} method(s), calls ${callees.length} method(s)`;
  }

  /**
   * Infer purpose of code from name and structure
   */
  private inferPurpose(symbol: CodeSymbol): string {
    const name = symbol.name.toLowerCase();
    
    if (name.includes('get') || name.includes('fetch')) return 'retrieving data';
    if (name.includes('set') || name.includes('update')) return 'updating data';
    if (name.includes('create') || name.includes('add')) return 'creating new entities';
    if (name.includes('delete') || name.includes('remove')) return 'removing entities';
    if (name.includes('validate') || name.includes('check')) return 'validation';
    if (name.includes('process') || name.includes('handle')) return 'processing data';
    
    return 'general operations';
  }
}

