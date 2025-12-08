/**
 * Tree-sitter based code parser
 * Provides accurate AST parsing for Java code
 * Uses dynamic imports to avoid errors when tree-sitter is not installed
 */

import { CodeSymbol, ParsedFile } from './types.js';

export class TreeSitterParser {
  private parser: any;
  private javaLanguage: any;
  private typescriptLanguage: any;
  private javascriptLanguage: any;
  private pythonLanguage: any;
  private initialized: boolean = false;

  constructor() {
    // Parser and language will be initialized lazily
  }

  /**
   * Initialize Tree-sitter parser and languages
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
      
      // Create parser instance
      this.parser = new Parser();
      
      // Load languages (optional - may not all be installed)
      try {
        const javaModule = require('tree-sitter-java');
        // Check if it's a valid language object
        if (javaModule && typeof javaModule === 'object') {
          // tree-sitter-java might export the language directly or as .default
          this.javaLanguage = javaModule.default || javaModule;
          // Validate it's a language object
          if (!this.javaLanguage || typeof this.javaLanguage !== 'object') {
            throw new Error('Invalid language object from tree-sitter-java');
          }
        } else {
          throw new Error('tree-sitter-java did not export a valid language object');
        }
      } catch (e: any) {
        // Java parser not available - check if it's a module not found (expected) vs other error
        if (e?.code === 'MODULE_NOT_FOUND') {
          // Module not installed - expected, don't log
        } else if (e?.message?.includes('Invalid language object')) {
          // Version incompatibility - log once
          console.warn(`⚠️  tree-sitter-java version incompatible, using regex fallback for Java files`);
        } else {
          // Other error - log it
          if (process.env.DEBUG) {
            console.warn(`⚠️  Failed to load tree-sitter-java: ${e?.message || e}`);
          }
        }
        this.javaLanguage = null;
      }
      
      try {
        const TypeScript = require('tree-sitter-typescript');
        this.typescriptLanguage = TypeScript.typescript;
      } catch (e: any) {
        // TypeScript parser not available
        if (!e?.code || e.code !== 'MODULE_NOT_FOUND') {
          console.warn(`⚠️  Failed to load tree-sitter-typescript: ${e?.message || e}`);
        }
      }
      
      try {
        this.javascriptLanguage = require('tree-sitter-javascript');
      } catch (e: any) {
        // JavaScript parser not available
        if (!e?.code || e.code !== 'MODULE_NOT_FOUND') {
          console.warn(`⚠️  Failed to load tree-sitter-javascript: ${e?.message || e}`);
        }
      }
      
      try {
        this.pythonLanguage = require('tree-sitter-python');
      } catch (e: any) {
        // Python parser not available
        if (!e?.code || e.code !== 'MODULE_NOT_FOUND') {
          console.warn(`⚠️  Failed to load tree-sitter-python: ${e?.message || e}`);
        }
      }
      
      // Set default language (prefer Java, but use any available)
      if (this.javaLanguage) {
        try {
          this.parser.setLanguage(this.javaLanguage);
        } catch (e: any) {
          // Java language object invalid, clear it
          this.javaLanguage = null;
          if (this.typescriptLanguage) {
            this.parser.setLanguage(this.typescriptLanguage);
          } else if (this.javascriptLanguage) {
            this.parser.setLanguage(this.javascriptLanguage);
          } else if (this.pythonLanguage) {
            this.parser.setLanguage(this.pythonLanguage);
          }
        }
      } else if (this.typescriptLanguage) {
        // Fallback to TypeScript if Java not available
        this.parser.setLanguage(this.typescriptLanguage);
      } else if (this.javascriptLanguage) {
        // Fallback to JavaScript if TypeScript not available
        this.parser.setLanguage(this.javascriptLanguage);
      } else if (this.pythonLanguage) {
        // Fallback to Python if JavaScript not available
        this.parser.setLanguage(this.pythonLanguage);
      }
      
      // Check if at least one language is loaded
      if (!this.javaLanguage && !this.typescriptLanguage && !this.javascriptLanguage && !this.pythonLanguage) {
        throw new Error('No tree-sitter language parsers available. Please install tree-sitter-java, tree-sitter-typescript, tree-sitter-javascript, or tree-sitter-python');
      }
      
      this.initialized = true;
    } catch (error: any) {
      // Log detailed error for debugging
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Cannot find module')) {
        throw new Error(`Tree-sitter module not found. Please run: npm install tree-sitter tree-sitter-java tree-sitter-typescript tree-sitter-javascript tree-sitter-python`);
      }
      throw new Error(`Failed to initialize Tree-sitter: ${errorMsg}`);
    }
  }

  /**
   * Parse Java code and extract symbols
   */
  async parseJava(code: string, filepath: string): Promise<ParsedFile> {
    await this.initialize();
    if (!this.javaLanguage) {
      throw new Error('tree-sitter-java not available or incompatible version');
    }
    return this.parseJavaSync(code, filepath);
  }

  /**
   * Parse TypeScript/JavaScript code and extract symbols
   */
  async parseTypeScript(code: string, filepath: string): Promise<ParsedFile> {
    await this.initialize();
    if (!this.typescriptLanguage) {
      throw new Error('Tree-sitter TypeScript parser not available');
    }
    this.parser.setLanguage(this.typescriptLanguage);
    return this.parseCodeSync(code, filepath, 'typescript');
  }

  /**
   * Parse JavaScript code and extract symbols
   */
  async parseJavaScript(code: string, filepath: string): Promise<ParsedFile> {
    await this.initialize();
    if (!this.javascriptLanguage) {
      throw new Error('Tree-sitter JavaScript parser not available');
    }
    this.parser.setLanguage(this.javascriptLanguage);
    return this.parseCodeSync(code, filepath, 'javascript');
  }

  /**
   * Parse Python code and extract symbols
   */
  async parsePython(code: string, filepath: string): Promise<ParsedFile> {
    await this.initialize();
    if (!this.pythonLanguage) {
      throw new Error('Tree-sitter Python parser not available');
    }
    this.parser.setLanguage(this.pythonLanguage);
    return this.parseCodeSync(code, filepath, 'python');
  }

  /**
   * Synchronous parse (requires initialization first)
   */
  parseJavaSync(code: string, filepath: string): ParsedFile {
    if (!this.initialized) {
      throw new Error('Tree-sitter not initialized. Call parseJava() first or ensure initialize() was called.');
    }
    if (!this.javaLanguage) {
      throw new Error('tree-sitter-java not available or incompatible version');
    }
    // Set language before parsing
    this.parser.setLanguage(this.javaLanguage);
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

  /**
   * Generic parse method (works for Java, TypeScript, JavaScript, Python)
   */
  private parseCodeSync(code: string, filepath: string, language: string): ParsedFile {
    const tree = this.parser.parse(code);
    const symbols: CodeSymbol[] = [];

    // Extract classes/interfaces/structs (language-specific)
    this.extractClassesGeneric(tree.rootNode, code, filepath, symbols, language);
    
    // Extract methods/functions (language-specific)
    this.extractMethodsGeneric(tree.rootNode, code, filepath, symbols, language);

    return {
      filepath,
      language,
      symbols,
    };
  }

  /**
   * Generic class extraction (handles Java, TypeScript, JavaScript, Python)
   */
  private extractClassesGeneric(
    node: any,
    code: string,
    filepath: string,
    symbols: CodeSymbol[],
    language: string
  ): void {
    // Java: class_declaration
    // TypeScript/JavaScript: class_declaration, interface_declaration
    // Python: class_definition
    const classNodeTypes = language === 'python' 
      ? ['class_definition']
      : language === 'typescript' || language === 'javascript'
      ? ['class_declaration', 'interface_declaration', 'type_alias_declaration']
      : ['class_declaration'];

    if (classNodeTypes.includes(node.type)) {
      const className = this.getClassNameGeneric(node, code, language);
      const modifiers = this.getModifiersGeneric(node, code, language);
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
      this.extractClassesGeneric(child, code, filepath, symbols, language);
    }
  }

  /**
   * Generic method extraction
   */
  private extractMethodsGeneric(
    node: any,
    code: string,
    filepath: string,
    symbols: CodeSymbol[],
    language: string
  ): void {
    // Java: method_declaration, constructor_declaration
    // TypeScript/JavaScript: method_definition, function_declaration, arrow_function
    // Python: function_definition
    const methodNodeTypes = language === 'python'
      ? ['function_definition']
      : language === 'typescript' || language === 'javascript'
      ? ['method_definition', 'function_declaration', 'arrow_function']
      : ['method_declaration', 'constructor_declaration'];

    if (methodNodeTypes.includes(node.type)) {
      const methodInfo = this.getMethodInfoGeneric(node, code, language);
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      const methodCode = code.substring(node.startIndex, node.endIndex);

      symbols.push({
        name: methodInfo.name,
        type: methodInfo.isConstructor ? 'constructor' : 'method',
        file: filepath,
        startLine,
        endLine,
        signature: methodInfo.signature,
        returnType: methodInfo.isConstructor ? undefined : methodInfo.returnType,
        parameters: methodInfo.parameters,
        visibility: methodInfo.visibility,
        isStatic: methodInfo.isStatic,
        code: methodCode,
      });
    }

    // Recursively process children
    for (const child of node.children || []) {
      this.extractMethodsGeneric(child, code, filepath, symbols, language);
    }
  }

  /**
   * Get class name (generic for all languages)
   */
  private getClassNameGeneric(node: any, code: string, language: string): string {
    if (language === 'python') {
      const identifier = node.children?.find((child: any) => 
        child.type === 'identifier'
      );
      return identifier ? code.substring(identifier.startIndex, identifier.endIndex) : 'Unknown';
    }
    
    // TypeScript/JavaScript/Java
    const typeIdentifier = node.children?.find((child: any) => 
      child.type === 'type_identifier' || child.type === 'identifier'
    );
    return typeIdentifier ? code.substring(typeIdentifier.startIndex, typeIdentifier.endIndex) : 'Unknown';
  }

  /**
   * Get method info (generic for all languages)
   */
  private getMethodInfoGeneric(node: any, code: string, language: string): {
    name: string;
    signature: string;
    returnType: string;
    parameters: any[];
    visibility: 'public' | 'private' | 'protected' | 'package';
    isStatic: boolean;
    isConstructor: boolean;
  } {
    if (language === 'python') {
      const identifier = node.children?.find((child: any) => 
        child.type === 'identifier'
      );
      const methodName = identifier ? code.substring(identifier.startIndex, identifier.endIndex) : 'unknown';
      const parameters = this.extractPythonParameters(node, code);
      
      return {
        name: methodName,
        signature: `def ${methodName}(${parameters.map(p => p.name).join(', ')})`,
        returnType: 'Any',
        parameters,
        visibility: methodName.startsWith('_') ? 'private' : 'public',
        isStatic: false,
        isConstructor: methodName === '__init__',
      };
    }

    // TypeScript/JavaScript/Java - similar logic
    const identifier = node.children?.find((child: any) => 
      child.type === 'identifier' || child.type === 'property_identifier'
    );
    const methodName = identifier ? code.substring(identifier.startIndex, identifier.endIndex) : 'unknown';
    
    // Get return type
    const returnTypeNode = node.children?.find((child: any) => 
      child.type === 'type' || child.type === 'type_annotation' || child.type === 'void_type'
    );
    const returnType = returnTypeNode 
      ? code.substring(returnTypeNode.startIndex, returnTypeNode.endIndex).trim()
      : 'void';

    // Get parameters
    const formalParameters = node.children?.find((child: any) => 
      child.type === 'formal_parameters' || child.type === 'parameters'
    );
    const parameters = this.extractParametersGeneric(formalParameters, code, language);

    // Get modifiers
    const modifiers = this.getModifiersGeneric(node, code, language);

    // Build signature
    const paramList = parameters.map(p => `${p.type || 'any'} ${p.name}`).join(', ');
    const signature = `${returnType} ${methodName}(${paramList})`;

    return {
      name: methodName,
      signature,
      returnType,
      parameters,
      visibility: modifiers.visibility,
      isStatic: modifiers.isStatic,
      isConstructor: node.type === 'constructor_declaration',
    };
  }

  /**
   * Extract parameters (generic)
   */
  private extractParametersGeneric(formalParameters: any, code: string, language: string): Array<{ name: string; type: string }> {
    if (!formalParameters) return [];

    const parameters: Array<{ name: string; type: string }> = [];
    
    for (const child of formalParameters.children || []) {
      if (child.type === 'formal_parameter' || child.type === 'required_parameter' || child.type === 'parameter') {
        const typeNode = child.children?.find((c: any) => 
          c.type === 'type' || c.type === 'type_annotation'
        );
        const identifier = child.children?.find((c: any) => 
          c.type === 'identifier' || c.type === 'property_identifier'
        );
        
        if (identifier) {
          parameters.push({
            type: typeNode ? code.substring(typeNode.startIndex, typeNode.endIndex).trim() : 'any',
            name: code.substring(identifier.startIndex, identifier.endIndex),
          });
        }
      }
    }

    return parameters;
  }

  /**
   * Extract Python parameters
   */
  private extractPythonParameters(node: any, code: string): Array<{ name: string; type: string }> {
    const parameters: Array<{ name: string; type: string }> = [];
    const parametersNode = node.children?.find((child: any) => 
      child.type === 'parameters'
    );
    
    if (parametersNode) {
      for (const child of parametersNode.children || []) {
        if (child.type === 'identifier') {
          parameters.push({
            name: code.substring(child.startIndex, child.endIndex),
            type: 'Any',
          });
        }
      }
    }
    
    return parameters;
  }

  /**
   * Get modifiers (generic)
   */
  private getModifiersGeneric(node: any, code: string, language: string): {
    visibility: 'public' | 'private' | 'protected' | 'package';
    isStatic: boolean;
  } {
    let visibility: 'public' | 'private' | 'protected' | 'package' = 'public';
    let isStatic = false;

    if (language === 'python') {
      // Python uses naming conventions (_name = private)
      return { visibility: 'public', isStatic: false };
    }

    // TypeScript/JavaScript/Java
    const modifiersNode = node.children?.find((child: any) => 
      child.type === 'modifiers' || child.type === 'accessibility_modifier'
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
}

