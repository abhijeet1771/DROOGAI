/**
 * Vector database interface for storing embeddings
 * Supports multiple backends (ChromaDB, SQLite, file-based)
 */

import { Embedding } from '../embeddings/generator.js';
import { CodeSymbol } from '../parser/types.js';

export interface VectorDB {
  /**
   * Store an embedding
   */
  store(embedding: Embedding): Promise<void>;
  
  /**
   * Store multiple embeddings
   */
  storeBatch(embeddings: Embedding[]): Promise<void>;
  
  /**
   * Find similar symbols by embedding
   */
  findSimilar(queryEmbedding: number[], limit?: number, threshold?: number): Promise<Embedding[]>;
  
  /**
   * Find similar to a symbol
   */
  findSimilarToSymbol(symbol: CodeSymbol, limit?: number, threshold?: number): Promise<Embedding[]>;
  
  /**
   * Get all embeddings for a file
   */
  getByFile(filepath: string): Promise<Embedding[]>;
  
  /**
   * Clear all data
   */
  clear(): Promise<void>;
}

/**
 * Simple file-based vector storage (for MVP)
 */
export class FileVectorDB implements VectorDB {
  private storagePath: string;
  private embeddings: Map<string, Embedding> = new Map();

  constructor(storagePath: string = './.droog-embeddings.json') {
    this.storagePath = storagePath;
    this.load();
  }

  async store(embedding: Embedding): Promise<void> {
    const key = `${embedding.symbol.file}:${embedding.symbol.name}:${embedding.symbol.type}`;
    this.embeddings.set(key, embedding);
    await this.save();
  }

  async storeBatch(embeddings: Embedding[]): Promise<void> {
    for (const embedding of embeddings) {
      const key = `${embedding.symbol.file}:${embedding.symbol.name}:${embedding.symbol.type}`;
      this.embeddings.set(key, embedding);
    }
    await this.save();
  }

  async findSimilar(queryEmbedding: number[], limit: number = 10, threshold: number = 0.7): Promise<Embedding[]> {
    const similarities: Array<{ embedding: Embedding; similarity: number }> = [];
    
    for (const embedding of this.embeddings.values()) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding.vector);
      if (similarity >= threshold) {
        similarities.push({ embedding, similarity });
      }
    }
    
    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, limit).map(item => item.embedding);
  }

  async findSimilarToSymbol(symbol: CodeSymbol, limit: number = 10, threshold: number = 0.7): Promise<Embedding[]> {
    // Find the embedding for this symbol
    const key = `${symbol.file}:${symbol.name}:${symbol.type}`;
    const symbolEmbedding = this.embeddings.get(key);
    
    if (!symbolEmbedding) {
      return [];
    }
    
    return this.findSimilar(symbolEmbedding.vector, limit, threshold);
  }

  async getByFile(filepath: string): Promise<Embedding[]> {
    const results: Embedding[] = [];
    for (const embedding of this.embeddings.values()) {
      if (embedding.symbol.file === filepath) {
        results.push(embedding);
      }
    }
    return results;
  }

  async clear(): Promise<void> {
    this.embeddings.clear();
    await this.save();
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  private async load(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Check if file exists
      try {
        await fs.access(this.storagePath);
        const data = await fs.readFile(this.storagePath, 'utf-8');
        const stored = JSON.parse(data) as Array<[string, Embedding]>;
        
        // Reconstruct embeddings map
        this.embeddings = new Map(stored);
      } catch {
        // File doesn't exist - start fresh
      }
    } catch (error) {
      // Error reading - start fresh
      console.warn('Failed to load embeddings, starting fresh:', error);
    }
  }

  private async save(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure directory exists
      const dir = path.dirname(this.storagePath);
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch {
        // Directory might already exist
      }
      
      // Serialize embeddings (convert Map to Array for JSON)
      const data = JSON.stringify(Array.from(this.embeddings.entries()), null, 2);
      await fs.writeFile(this.storagePath, data, 'utf-8');
    } catch (error) {
      console.warn('Failed to save embeddings:', error);
    }
  }
}

