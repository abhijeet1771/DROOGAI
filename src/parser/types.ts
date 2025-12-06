/**
 * Type definitions for code parsing and analysis
 */

export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'method' | 'constructor' | 'variable' | 'interface' | 'enum' | 'field';
  file: string;
  startLine: number;
  endLine: number;
  signature?: string; // Method/function signature
  parameters?: Parameter[];
  returnType?: string;
  visibility?: 'public' | 'private' | 'protected' | 'package';
  isStatic?: boolean;
  isConstant?: boolean;
  extends?: string; // Parent class name
  implements?: string[]; // Interfaces implemented
  code?: string; // Full code of the symbol
}

export interface Parameter {
  name: string;
  type: string;
  isOptional?: boolean;
}

export interface CallRelationship {
  caller: string; // Symbol name
  callee: string; // Called symbol name
  file: string;
  line: number;
}

export interface CodeIndex {
  symbols: CodeSymbol[];
  callGraph: CallRelationship[];
  fileMap: Map<string, CodeSymbol[]>; // file -> symbols
  symbolMap: Map<string, CodeSymbol>; // symbol name -> symbol
}

export interface ParsedFile {
  filepath: string;
  language: string;
  symbols: CodeSymbol[];
  ast?: any; // Tree-sitter AST
}



