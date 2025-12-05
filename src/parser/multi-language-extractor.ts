/**
 * Multi-Language Code Extractor
 * Supports Java, Python, TypeScript, Go, and more
 */

import { CodeSymbol, ParsedFile, CallRelationship } from './types.js';
import { CodeExtractor } from './extractor.js';

export class MultiLanguageExtractor {
  private extractor: CodeExtractor;

  constructor() {
    this.extractor = new CodeExtractor();
  }

  /**
   * Extract symbols from code (auto-detect language)
   */
  async extractFromCode(code: string, filepath: string): Promise<ParsedFile> {
    const language = this.detectLanguage(filepath, code);
    
    switch (language) {
      case 'java':
        return await this.extractor.extractFromJava(code, filepath);
      case 'python':
        return await this.extractFromPython(code, filepath);
      case 'typescript':
      case 'javascript':
        return await this.extractFromJavaScript(code, filepath);
      case 'go':
        return await this.extractFromGo(code, filepath);
      case 'rust':
        return await this.extractFromRust(code, filepath);
      default:
        // Fallback to Java extractor (most mature)
        return await this.extractor.extractFromJava(code, filepath);
    }
  }

  /**
   * Detect language from file extension and code
   */
  private detectLanguage(filepath: string, code: string): string {
    const ext = filepath.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      'java': 'java',
      'py': 'python',
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'cpp',
      'cs': 'csharp',
      'kt': 'kotlin',
      'swift': 'swift',
      'rb': 'ruby',
      'php': 'php',
      'scala': 'scala',
    };

    return languageMap[ext] || 'java';
  }

  /**
   * Extract from Python code
   */
  private async extractFromPython(code: string, filepath: string): Promise<ParsedFile> {
    const symbols: CodeSymbol[] = [];
    
    // Extract classes
    const classRegex = /^class\s+(\w+)(?:\([^)]+\))?:/gm;
    let match;
    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      const endLine = this.findBlockEnd(code, match.index);
      
      symbols.push({
        name: className,
        type: 'class',
        file: filepath,
        startLine,
        endLine,
        visibility: 'public',
        code: code.substring(match.index, endLine),
      });
    }

    // Extract functions
    const functionRegex = /^def\s+(\w+)\s*\([^)]*\)\s*:/gm;
    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      const endLine = this.findBlockEnd(code, match.index);
      
      symbols.push({
        name: functionName,
        type: 'function',
        file: filepath,
        startLine,
        endLine,
        visibility: 'public',
        code: code.substring(match.index, endLine),
      });
    }

    return {
      filepath,
      language: 'python',
      symbols,
    };
  }

  /**
   * Extract from JavaScript/TypeScript
   */
  private async extractFromJavaScript(code: string, filepath: string): Promise<ParsedFile> {
    const symbols: CodeSymbol[] = [];
    
    // Extract classes
    const classRegex = /(?:export\s+)?(?:class|interface)\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      
      symbols.push({
        name: className,
        type: 'class',
        file: filepath,
        startLine,
        endLine: startLine + 10, // Estimate
        visibility: 'public',
      });
    }

    // Extract functions
    const functionRegex = /(?:export\s+)?(?:function|const)\s+(\w+)\s*[=:]\s*(?:async\s*)?\(/g;
    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      
      symbols.push({
        name: functionName,
        type: 'function',
        file: filepath,
        startLine,
        endLine: startLine + 10, // Estimate
        visibility: 'public',
      });
    }

    return {
      filepath,
      language: filepath.endsWith('.ts') ? 'typescript' : 'javascript',
      symbols,
    };
  }

  /**
   * Extract from Go code
   */
  private async extractFromGo(code: string, filepath: string): Promise<ParsedFile> {
    const symbols: CodeSymbol[] = [];
    
    // Extract functions
    const functionRegex = /^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\([^)]*\)/gm;
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      
      symbols.push({
        name: functionName,
        type: 'function',
        file: filepath,
        startLine,
        endLine: startLine + 10,
        visibility: this.getGoVisibility(functionName),
      });
    }

    // Extract types/structs
    const typeRegex = /^type\s+(\w+)\s+(?:struct|interface)/gm;
    while ((match = typeRegex.exec(code)) !== null) {
      const typeName = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      
      symbols.push({
        name: typeName,
        type: 'class',
        file: filepath,
        startLine,
        endLine: startLine + 10,
        visibility: 'public',
      });
    }

    return {
      filepath,
      language: 'go',
      symbols,
    };
  }

  /**
   * Extract from Rust code
   */
  private async extractFromRust(code: string, filepath: string): Promise<ParsedFile> {
    const symbols: CodeSymbol[] = [];
    
    // Extract functions
    const functionRegex = /^(?:pub\s+)?fn\s+(\w+)\s*\([^)]*\)/gm;
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      
      symbols.push({
        name: functionName,
        type: 'function',
        file: filepath,
        startLine,
        endLine: startLine + 10,
        visibility: match[0].includes('pub') ? 'public' : 'private',
      });
    }

    // Extract structs
    const structRegex = /^(?:pub\s+)?struct\s+(\w+)/gm;
    while ((match = structRegex.exec(code)) !== null) {
      const structName = match[1];
      const startLine = code.substring(0, match.index).split('\n').length;
      
      symbols.push({
        name: structName,
        type: 'class',
        file: filepath,
        startLine,
        endLine: startLine + 10,
        visibility: match[0].includes('pub') ? 'public' : 'private',
      });
    }

    return {
      filepath,
      language: 'rust',
      symbols,
    };
  }

  /**
   * Get Go visibility (capitalized = public)
   */
  private getGoVisibility(name: string): 'public' | 'private' {
    return name[0] === name[0].toUpperCase() ? 'public' : 'private';
  }

  /**
   * Find end of code block (simple heuristic)
   */
  private findBlockEnd(code: string, startIndex: number): number {
    const lines = code.split('\n');
    const startLine = code.substring(0, startIndex).split('\n').length;
    let indentLevel = 0;
    const startIndent = (lines[startLine - 1]?.match(/^\s*/)?.[0] || '').length;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const indent = (line.match(/^\s*/)?.[0] || '').length;
      
      if (line.trim() && indent <= startIndent && i > startLine) {
        return startLine + i;
      }
    }

    return startLine + 50; // Fallback
  }
}

