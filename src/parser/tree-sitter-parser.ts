/**
 * Tree-sitter based code parser
 * Provides accurate AST parsing for Java code
 * Uses dynamic imports to avoid errors when tree-sitter is not installed
 */

import { CodeSymbol, ParsedFile } from './types.js';

export class TreeSitterParser {
  private parser: any;
  private javaLanguage: any;
  private initialized: boolean = false;

  constructor() {
    // Parser and language will be initialized lazily
  }

  /**
   * Initialize Tree-sitter parser and Java language
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamic imports - tree-sitter uses CommonJS
      // In ES modules, we need to use createRequire or handle CommonJS properly
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      
      // Require tree-sitter (CommonJS module)
      const Parser = require('tree-sitter');
      const Java = require('tree-sitter-java');
      
      // Create parser instance - Parser is the constructor itself
      this.parser = new Parser();
      this.javaLanguage = Java;
      this.parser.setLanguage(this.javaLanguage);
      this.initialized = true;
    } catch (error: any) {
      throw new Error(`Failed to initialize Tree-sitter: ${error?.message || error}`);
    }
  }

  /**
   * Parse Java code and extract symbols
   */
  async parseJava(code: string, filepath: string): Promise<ParsedFile> {
    await this.initialize();
    return this.parseJavaSync(code, filepath);
  }

  /**
   * Synchronous parse (requires initialization first)
   */
  parseJavaSync(code: string, filepath: string): ParsedFile {
    if (!this.initialized) {
      throw new Error('Tree-sitter not initialized. Call parseJava() first or ensure initialize() was called.');
    }
    const tree = this.parser.parse(code);
    const symbols: CodeSymbol[] = [];

    // Extract classes
    this.extractClasses(tree.rootNode, code, filepath, symbols);
    
    // Extract methods
    this.extractMethods(tree.rootNode, code, filepath, symbols);

    return {
      filepath,
      language: 'java',
      symbols,
    };
  }

  /**
   * Extract class declarations
   */
  private extractClasses(
    node: any,
    code: string,
    filepath: string,
    symbols: CodeSymbol[]
  ): void {
    if (node.type === 'class_declaration') {
      const className = this.getClassName(node, code);
      const modifiers = this.getModifiers(node, code);
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      const classCode = code.substring(node.startIndex, node.endIndex);

      symbols.push({
        name: className,
        type: 'class',
        file: filepath,
        startLine,
        endLine,
        visibility: modifiers.visibility,
        isStatic: modifiers.isStatic,
        code: classCode,
      });
    }

    // Recursively process children
    for (const child of node.children || []) {
      this.extractClasses(child, code, filepath, symbols);
    }
  }

  /**
   * Extract method declarations
   */
  private extractMethods(
    node: any,
    code: string,
    filepath: string,
    symbols: CodeSymbol[]
  ): void {
    // Check for constructor (has same name as class) or method
    if (node.type === 'method_declaration' || node.type === 'constructor_declaration') {
      const methodInfo = this.getMethodInfo(node, code);
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      const methodCode = code.substring(node.startIndex, node.endIndex);

      // Check if it's a constructor (no return type or return type is class name)
      const isConstructor = node.type === 'constructor_declaration' || 
                           (!methodInfo.returnType || methodInfo.returnType === methodInfo.name);

      symbols.push({
        name: methodInfo.name,
        type: isConstructor ? 'constructor' : 'method',
        file: filepath,
        startLine,
        endLine,
        signature: methodInfo.signature,
        returnType: isConstructor ? undefined : methodInfo.returnType,
        parameters: methodInfo.parameters,
        visibility: methodInfo.visibility,
        isStatic: methodInfo.isStatic,
        code: methodCode,
      });
    }

    // Recursively process children
    for (const child of node.children || []) {
      this.extractMethods(child, code, filepath, symbols);
    }
  }

  /**
   * Get class name from class declaration node
   */
  private getClassName(node: any, code: string): string {
    const typeIdentifier = node.children?.find((child: any) => 
      child.type === 'type_identifier'
    );
    return typeIdentifier ? code.substring(typeIdentifier.startIndex, typeIdentifier.endIndex) : 'Unknown';
  }

  /**
   * Get method information from method declaration node
   */
  private getMethodInfo(node: any, code: string): {
    name: string;
    signature: string;
    returnType: string;
    parameters: any[];
    visibility: 'public' | 'private' | 'protected' | 'package';
    isStatic: boolean;
  } {
    // Get method name
    const identifier = node.children?.find((child: any) => 
      child.type === 'identifier'
    );
    const methodName = identifier ? code.substring(identifier.startIndex, identifier.endIndex) : 'unknown';

    // Get return type
    const returnTypeNode = node.children?.find((child: any) => 
      child.type === 'type' || child.type === 'void_type'
    );
    const returnType = returnTypeNode 
      ? code.substring(returnTypeNode.startIndex, returnTypeNode.endIndex).trim()
      : 'void';

    // Get parameters
    const formalParameters = node.children?.find((child: any) => 
      child.type === 'formal_parameters'
    );
    const parameters = this.extractParameters(formalParameters, code);

    // Get modifiers
    const modifiers = this.getModifiers(node, code);

    // Build signature
    const paramList = parameters.map(p => `${p.type} ${p.name}`).join(', ');
    const signature = `${returnType} ${methodName}(${paramList})`;

    return {
      name: methodName,
      signature,
      returnType,
      parameters,
      visibility: modifiers.visibility,
      isStatic: modifiers.isStatic,
    };
  }

  /**
   * Extract parameters from formal_parameters node
   */
  private extractParameters(formalParameters: any, code: string): Array<{ name: string; type: string }> {
    if (!formalParameters) return [];

    const parameters: Array<{ name: string; type: string }> = [];
    
    for (const child of formalParameters.children || []) {
      if (child.type === 'formal_parameter') {
        const typeNode = child.children?.find((c: any) => c.type === 'type');
        const identifier = child.children?.find((c: any) => c.type === 'identifier');
        
        if (typeNode && identifier) {
          parameters.push({
            type: code.substring(typeNode.startIndex, typeNode.endIndex).trim(),
            name: code.substring(identifier.startIndex, identifier.endIndex),
          });
        }
      }
    }

    return parameters;
  }

  /**
   * Get modifiers (visibility, static, etc.) from node
   */
  private getModifiers(node: any, code: string): {
    visibility: 'public' | 'private' | 'protected' | 'package';
    isStatic: boolean;
  } {
    let visibility: 'public' | 'private' | 'protected' | 'package' = 'package';
    let isStatic = false;

    // Check parent modifiers node or direct children
    const modifiersNode = node.children?.find((child: any) => 
      child.type === 'modifiers'
    ) || node;

    for (const child of modifiersNode.children || []) {
      const text = code.substring(child.startIndex, child.endIndex);
      if (text === 'public') visibility = 'public';
      else if (text === 'private') visibility = 'private';
      else if (text === 'protected') visibility = 'protected';
      else if (text === 'static') isStatic = true;
    }

    return { visibility, isStatic };
  }

  /**
   * Extract call relationships from code
   */
  async extractCalls(code: string, symbols: CodeSymbol[]): Promise<Array<{ caller: string; callee: string; file: string; line: number }>> {
    await this.initialize();
    return this.extractCallsSync(code, symbols);
  }

  /**
   * Synchronous extract calls (requires initialization first)
   */
  extractCallsSync(code: string, symbols: CodeSymbol[]): Array<{ caller: string; callee: string; file: string; line: number }> {
    if (!this.initialized) {
      throw new Error('Tree-sitter not initialized.');
    }
    const tree = this.parser.parse(code);
    const calls: Array<{ caller: string; callee: string; file: string; line: number }> = [];
    const methodMap = new Map<string, CodeSymbol>();

    // Build method map (only methods, not constructors)
    symbols.forEach(s => {
      if (s.type === 'method' || s.type === 'constructor') {
        methodMap.set(s.name, s);
      }
    });

    // Find method invocations
    this.findMethodCalls(tree.rootNode, code, calls, methodMap, symbols[0]?.file || '');

    return calls;
  }

  /**
   * Find method call expressions
   */
  private findMethodCalls(
    node: any,
    code: string,
    calls: Array<{ caller: string; callee: string; file: string; line: number }>,
    methodMap: Map<string, CodeSymbol>,
    filepath: string
  ): void {
    // Only process method invocations, not constructor calls
    if (node.type === 'method_invocation') {
      const identifier = node.children?.find((child: any) => 
        child.type === 'identifier'
      );
      
      if (identifier) {
        const calleeName = code.substring(identifier.startIndex, identifier.endIndex);
        const line = node.startPosition.row + 1;

        // Find the containing method (caller)
        let caller = 'unknown';
        let parent = node.parent;
        while (parent) {
          if (parent.type === 'method_declaration' || parent.type === 'constructor_declaration') {
            const callerId = parent.children?.find((c: any) => c.type === 'identifier');
            if (callerId) {
              caller = code.substring(callerId.startIndex, callerId.endIndex);
              break;
            }
          }
          parent = parent.parent;
        }

        // Skip self-calls (method calling itself)
        if (caller === calleeName) {
          return;
        }

        // Check if callee is a known method (not constructor)
        const calleeSymbol = methodMap.get(calleeName);
        if (calleeSymbol && calleeSymbol.type === 'method') {
          calls.push({
            caller,
            callee: calleeName,
            file: filepath,
            line,
          });
        }
      }
    }

    // Recursively process children
    for (const child of node.children || []) {
      this.findMethodCalls(child, code, calls, methodMap, filepath);
    }
  }
}

