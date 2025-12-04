/**
 * Embeddings generator for code symbols
 * Generates vector embeddings for similarity search
 */

import { CodeSymbol } from '../parser/types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Embedding {
  symbol: CodeSymbol;
  vector: number[];
  metadata: {
    file: string;
    symbolType: string;
    timestamp: Date;
  };
}

export class EmbeddingGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use embedding model (or text model for now)
    // Note: Gemini doesn't have dedicated embedding model, using text-embedding-004 or similar
    // For now, we'll use a workaround with the generative model
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: { temperature: 0 }
    });
  }

  /**
   * Generate embedding for a code symbol
   * Creates a text representation and generates embedding
   */
  async generateEmbedding(symbol: CodeSymbol): Promise<number[]> {
    // Create text representation of symbol for embedding
    const text = this.symbolToText(symbol);
    
    // For Gemini, we'll use a workaround since there's no direct embedding API
    // We can use the model to generate a representation, or use a simple hash-based approach
    // For now, using a text-based embedding approach
    
    // Simple approach: Use text similarity via model
    // In production, you'd use a dedicated embedding model
    const embedding = await this.textToEmbedding(text);
    
    return embedding;
  }

  /**
   * Generate embeddings for multiple symbols
   */
  async generateEmbeddings(symbols: CodeSymbol[]): Promise<Embedding[]> {
    const embeddings: Embedding[] = [];
    
    for (const symbol of symbols) {
      try {
        const vector = await this.generateEmbedding(symbol);
        embeddings.push({
          symbol,
          vector,
          metadata: {
            file: symbol.file,
            symbolType: symbol.type,
            timestamp: new Date(),
          },
        });
      } catch (error) {
        console.warn(`Failed to generate embedding for ${symbol.name}:`, error);
      }
    }
    
    return embeddings;
  }

  /**
   * Convert symbol to text representation for embedding
   */
  private symbolToText(symbol: CodeSymbol): string {
    let text = `${symbol.type} ${symbol.name}`;
    
    if (symbol.signature) {
      text += ` ${symbol.signature}`;
    }
    
    if (symbol.returnType) {
      text += ` returns ${symbol.returnType}`;
    }
    
    if (symbol.parameters && symbol.parameters.length > 0) {
      const params = symbol.parameters.map(p => `${p.type} ${p.name}`).join(', ');
      text += ` parameters: ${params}`;
    }
    
    // Include code snippet (first 200 chars for context)
    if (symbol.code) {
      const codeSnippet = symbol.code.substring(0, 200).replace(/\s+/g, ' ').trim();
      text += ` code: ${codeSnippet}`;
    }
    
    return text;
  }

  /**
   * Convert text to embedding vector
   * Using a simple hash-based approach for now
   * In production, use a proper embedding model
   */
  private async textToEmbedding(text: string): Promise<number[]> {
    // Simple hash-based embedding (128 dimensions)
    // This is a placeholder - in production, use a real embedding model
    const embedding: number[] = new Array(128).fill(0);
    
    // Simple hash-based approach
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
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }
}




