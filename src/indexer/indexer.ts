/**
 * Codebase indexer
 * Indexes codebase and builds searchable index
 */

import { CodeSymbol, CodeIndex, CallRelationship } from '../parser/types.js';
import { CodeExtractor } from '../parser/extractor.js';

export class CodebaseIndexer {
  private index: CodeIndex;
  private extractor: CodeExtractor;
  
  constructor() {
    this.index = {
      symbols: [],
      callGraph: [],
      fileMap: new Map(),
      symbolMap: new Map(),
    };
    this.extractor = new CodeExtractor();
  }
  
  /**
   * Index a file
   */
  async indexFile(filepath: string, code: string): Promise<void> {
    // Try async first to use tree-sitter if available
    let parsed;
    let calls;
    
    try {
      parsed = await this.extractor.extractFromJava(code, filepath);
      calls = await this.extractor.extractCalls(code, parsed.symbols);
    } catch (error) {
      // Fallback to sync methods
      parsed = this.extractor.extractFromJavaSync(code, filepath);
      calls = this.extractor.extractCallsSync(code, parsed.symbols);
    }
    
    // Add symbols to index
    parsed.symbols.forEach(symbol => {
      this.index.symbols.push(symbol);
      this.index.symbolMap.set(symbol.name, symbol);
      
      if (!this.index.fileMap.has(filepath)) {
        this.index.fileMap.set(filepath, []);
      }
      this.index.fileMap.get(filepath)!.push(symbol);
    });
    
    // Add call relationships
    this.index.callGraph.push(...calls);
  }
  
  /**
   * Get index
   */
  getIndex(): CodeIndex {
    return this.index;
  }
  
  /**
   * Find symbol by name
   */
  findSymbol(name: string): CodeSymbol | undefined {
    return this.index.symbolMap.get(name);
  }
  
  /**
   * Get symbols in file
   */
  getFileSymbols(filepath: string): CodeSymbol[] {
    return this.index.fileMap.get(filepath) || [];
  }
  
  /**
   * Find callers of a symbol
   */
  findCallers(symbolName: string): CallRelationship[] {
    return this.index.callGraph.filter(call => call.callee === symbolName);
  }
  
  /**
   * Find callees of a symbol
   */
  findCallees(symbolName: string): CallRelationship[] {
    return this.index.callGraph.filter(call => call.caller === symbolName);
  }
  
  /**
   * Clear index
   */
  clear(): void {
    this.index = {
      symbols: [],
      callGraph: [],
      fileMap: new Map(),
      symbolMap: new Map(),
    };
  }
}

