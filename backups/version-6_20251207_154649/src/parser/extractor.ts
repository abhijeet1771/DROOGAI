/**
 * Code symbol extractor using Tree-sitter
 * Extracts functions, classes, methods from code
 */

import { CodeSymbol, ParsedFile, CallRelationship } from './types.js';

export class CodeExtractor {
  private treeSitterParser: any = null;
  private useTreeSitter: boolean = false;
  private treeSitterInitialized: boolean = false;

  constructor() {
    // Tree-sitter will be loaded lazily if available
  }

  /**
   * Try to initialize Tree-sitter (lazy loading)
   */
  private async initializeTreeSitter(): Promise<boolean> {
    if (this.treeSitterInitialized) {
      return this.useTreeSitter;
    }

    this.treeSitterInitialized = true;

    try {
      // Dynamic import to avoid failing at module load time
      const { TreeSitterParser } = await import('./tree-sitter-parser.js');
      this.treeSitterParser = new TreeSitterParser();
      // Initialize tree-sitter (this will load the language)
      await this.treeSitterParser.parseJava('class Test {}', 'test.java');
      this.useTreeSitter = true;
      return true;
    } catch (error) {
      // Tree-sitter not available, use regex fallback
      console.warn('⚠️  Tree-sitter not available, using regex fallback');
      this.useTreeSitter = false;
      return false;
    }
  }

  /**
   * Initialize Tree-sitter synchronously (if possible)
   * This is a best-effort attempt - may not work if tree-sitter needs async init
   */
  private initializeTreeSitterSync(): boolean {
    if (this.treeSitterInitialized) {
      return this.useTreeSitter;
    }

    // For sync initialization, we'll try to import and initialize
    // This may fail, so we catch and fallback
    try {
      // Use dynamic import with immediate await (in a sync context, this won't work)
      // So we'll just mark as not initialized and let async handle it
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract symbols from Java code
   */
  async extractFromJava(code: string, filepath: string): Promise<ParsedFile> {
    // Try to use Tree-sitter if available
    const treeSitterAvailable = await this.initializeTreeSitter();
    
    if (treeSitterAvailable && this.treeSitterParser) {
      try {
        return await this.treeSitterParser.parseJava(code, filepath);
      } catch (error: any) {
        // Fallback to regex on error (silently, don't warn again)
        return this.extractFromJavaRegex(code, filepath);
      }
    }
    
    // Use regex fallback (silently, warning already shown during initialization)
    return this.extractFromJavaRegex(code, filepath);
  }

  /**
   * Synchronous version (for backward compatibility)
   * Tries to use tree-sitter if already initialized, falls back to regex
   */
  extractFromJavaSync(code: string, filepath: string): ParsedFile {
    // Try to use tree-sitter if already initialized
    if (this.useTreeSitter && this.treeSitterParser && this.treeSitterInitialized) {
      try {
        // Use synchronous parse if available
        if (typeof (this.treeSitterParser as any).parseJavaSync === 'function') {
          return (this.treeSitterParser as any).parseJavaSync(code, filepath);
        }
      } catch (error) {
        // Fall through to regex
      }
    }
    
    // Fallback to regex
    return this.extractFromJavaRegex(code, filepath);
  }

  /**
   * Extract symbols using regex (fallback method)
   */
  private extractFromJavaRegex(code: string, filepath: string): ParsedFile {
    const symbols: CodeSymbol[] = [];
    
    // Simple regex-based extraction (will be replaced with Tree-sitter)
    // This is a temporary implementation
    const lines = code.split('\n');
    
    // Extract classes
    const classRegex = /(?:public\s+)?(?:final\s+)?(?:abstract\s+)?class\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      // Find class end (simplified)
      const classBodyMatch = code.substring(match.index).match(/\{[\s\S]*\}/);
      const endLine = classBodyMatch 
        ? startLine + classBodyMatch[0].split('\n').length - 1
        : startLine + 10;
      
      symbols.push({
        name: className,
        type: 'class',
        file: filepath,
        startLine,
        endLine,
        code: code.substring(match.index, match.index + (classBodyMatch?.[0].length || 0)),
      });
    }
    
    // Extract methods
    const methodRegex = /(public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?(\w+)\s+(\w+)\s*\([^)]*\)/g;
    while ((match = methodRegex.exec(code)) !== null) {
      const visibility = match[1] as 'public' | 'private' | 'protected' | undefined;
      const returnType = match[2];
      const methodName = match[3];
      const startLine = code.substring(0, match.index).split('\n').length;
      
      // Extract parameters
      const paramMatch = code.substring(match.index).match(/\(([^)]*)\)/);
      const parameters = paramMatch?.[1]
        ? paramMatch[1].split(',').map(p => {
            const parts = p.trim().split(/\s+/);
            return {
              name: parts[parts.length - 1] || '',
              type: parts[parts.length - 2] || 'unknown',
            };
          })
        : [];
      
      symbols.push({
        name: methodName,
        type: 'method',
        file: filepath,
        startLine,
        endLine: startLine + 20, // Simplified
        signature: `${returnType} ${methodName}(${paramMatch?.[1] || ''})`,
        returnType,
        parameters,
        visibility: visibility || 'package',
        code: code.substring(match.index, match.index + 200), // Simplified
      });
    }
    
    return {
      filepath,
      language: 'java',
      symbols,
    };
  }
  
  /**
   * Extract call relationships from code
   */
  async extractCalls(code: string, symbols: CodeSymbol[]): Promise<CallRelationship[]> {
    // Try to use Tree-sitter if available
    await this.initializeTreeSitter();
    
    if (this.useTreeSitter && this.treeSitterParser) {
      try {
        return await this.treeSitterParser.extractCalls(code, symbols);
      } catch (error) {
        // Fallback to regex on error
        return this.extractCallsRegex(code, symbols);
      }
    }
    
    // Use regex fallback
    return this.extractCallsRegex(code, symbols);
  }

  /**
   * Synchronous version (for backward compatibility)
   * Uses regex only
   */
  extractCallsSync(code: string, symbols: CodeSymbol[]): CallRelationship[] {
    return this.extractCallsRegex(code, symbols);
  }

  /**
   * Extract call relationships using regex (fallback method)
   */
  private extractCallsRegex(code: string, symbols: CodeSymbol[]): CallRelationship[] {
    const calls: CallRelationship[] = [];
    const lines = code.split('\n');
    
    // Simple call detection
    symbols.forEach(symbol => {
      if (symbol.type === 'method' || symbol.type === 'function') {
        const symbolCode = symbol.code || '';
        // Find method calls in this symbol's code
        const methodCallRegex = /(\w+)\s*\(/g;
        let match;
        while ((match = methodCallRegex.exec(symbolCode)) !== null) {
          const calleeName = match[1];
          // Check if it's a known symbol
          const callee = symbols.find(s => s.name === calleeName);
          if (callee && callee.type === 'method') {
            calls.push({
              caller: symbol.name,
              callee: calleeName,
              file: symbol.file,
              line: symbol.startLine + symbolCode.substring(0, match.index).split('\n').length - 1,
            });
          }
        }
      }
    });
    
    return calls;
  }
}

