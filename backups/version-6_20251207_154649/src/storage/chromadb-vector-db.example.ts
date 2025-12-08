/**
 * EXAMPLE: ChromaDB Adapter (Not Currently Used)
 * 
 * This file shows how easy it is to add ChromaDB support later.
 * Just implement the VectorDB interface - no other code changes needed!
 * 
 * To use:
 * 1. Install: npm install chromadb --legacy-peer-deps
 * 2. Rename this file to chromadb-vector-db.ts
 * 3. Update full-indexer.ts to use ChromaDBVectorDB instead of FileVectorDB
 * 4. Done! ✅
 */

import { VectorDB } from './vector-db.js';
import { Embedding } from '../embeddings/generator.js';
import { CodeSymbol } from '../parser/types.js';

// Uncomment when ChromaDB is installed:
// import { ChromaClient } from 'chromadb';

export class ChromaDBVectorDB implements VectorDB {
  // private client: ChromaClient;
  // private collection: any;

  constructor(collectionName: string = 'droog-embeddings') {
    // Initialize ChromaDB client
    // this.client = new ChromaClient();
    // this.collection = await this.client.getOrCreateCollection({
    //   name: collectionName,
    //   metadata: { description: 'Droog AI code embeddings' }
    // });
  }

  async store(embedding: Embedding): Promise<void> {
    // const id = `${embedding.symbol.file}:${embedding.symbol.name}:${embedding.symbol.type}`;
    // await this.collection.add({
    //   ids: [id],
    //   embeddings: [embedding.vector],
    //   metadatas: [{
    //     file: embedding.symbol.file,
    //     name: embedding.symbol.name,
    //     type: embedding.symbol.type,
    //     language: embedding.symbol.language || 'java'
    //   }]
    // });
  }

  async storeBatch(embeddings: Embedding[]): Promise<void> {
    // const ids = embeddings.map(e => 
    //   `${e.symbol.file}:${e.symbol.name}:${e.symbol.type}`
    // );
    // const vectors = embeddings.map(e => e.vector);
    // const metadatas = embeddings.map(e => ({
    //   file: e.symbol.file,
    //   name: e.symbol.name,
    //   type: e.symbol.type,
    //   language: e.symbol.language || 'java'
    // }));
    // 
    // await this.collection.add({ ids, embeddings: vectors, metadatas });
  }

  async findSimilar(
    queryEmbedding: number[], 
    limit: number = 10, 
    threshold: number = 0.7
  ): Promise<Embedding[]> {
    // const results = await this.collection.query({
    //   queryEmbeddings: [queryEmbedding],
    //   nResults: limit
    // });
    // 
    // // Filter by threshold and convert to Embedding[]
    // const embeddings: Embedding[] = [];
    // for (let i = 0; i < results.ids[0].length; i++) {
    //   const distance = results.distances[0][i];
    //   const similarity = 1 - distance; // Convert distance to similarity
    //   
    //   if (similarity >= threshold) {
    //     embeddings.push({
    //       symbol: {
    //         file: results.metadatas[0][i].file,
    //         name: results.metadatas[0][i].name,
    //         type: results.metadatas[0][i].type as 'class' | 'method' | 'function',
    //         language: results.metadatas[0][i].language || 'java'
    //       },
    //       vector: results.embeddings[0][i]
    //     });
    //   }
    // }
    // 
    // return embeddings;
    return [];
  }

  async findSimilarToSymbol(
    symbol: CodeSymbol, 
    limit: number = 10, 
    threshold: number = 0.7
  ): Promise<Embedding[]> {
    // First find the symbol's embedding
    // const id = `${symbol.file}:${symbol.name}:${symbol.type}`;
    // const results = await this.collection.get({ ids: [id] });
    // 
    // if (results.embeddings.length === 0) {
    //   return [];
    // }
    // 
    // // Then find similar
    // return this.findSimilar(results.embeddings[0], limit, threshold);
    return [];
  }

  async getByFile(filepath: string): Promise<Embedding[]> {
    // const results = await this.collection.get({
    //   where: { file: filepath }
    // });
    // 
    // return results.embeddings.map((vector, i) => ({
    //   symbol: {
    //     file: results.metadatas[i].file,
    //     name: results.metadatas[i].name,
    //     type: results.metadatas[i].type as 'class' | 'method' | 'function',
    //     language: results.metadatas[i].language || 'java'
    //   },
    //   vector
    // }));
    return [];
  }

  async clear(): Promise<void> {
    // await this.collection.delete();
  }
}

/**
 * USAGE EXAMPLE:
 * 
 * // In src/indexer/full-indexer.ts:
 * 
 * import { FileVectorDB } from '../storage/vector-db.js';
 * import { ChromaDBVectorDB } from '../storage/chromadb-vector-db.js';
 * 
 * const vectorDB = process.env.USE_CHROMADB === 'true'
 *   ? new ChromaDBVectorDB()
 *   : new FileVectorDB();
 * 
 * // That's it! Everything else stays the same.
 */







