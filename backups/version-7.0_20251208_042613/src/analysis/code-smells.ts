/**
 * Code Smell Categorization
 * Categorizes code smells and provides specific refactoring suggestions
 */

import { CodeSymbol } from '../parser/types.js';

export interface CodeSmell {
  type: 'god_object' | 'long_method' | 'feature_envy' | 'primitive_obsession' | 
        'data_clumps' | 'large_class' | 'long_parameter_list' | 'switch_statement' |
        'speculative_generality' | 'dead_code' | 'duplicate_code' | 'magic_number';
  category: 'structural' | 'behavioral' | 'data' | 'general';
  location: string;
  file: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  refactoring: string; // Specific refactoring technique
  relatedSmells?: string[]; // Related code smells
}

export interface CodeSmellReport {
  smells: CodeSmell[];
  byCategory: {
    structural: CodeSmell[];
    behavioral: CodeSmell[];
    data: CodeSmell[];
    general: CodeSmell[];
  };
  byType: Record<string, CodeSmell[]>;
  total: number;
}

export class CodeSmellCategorizer {
  /**
   * Categorize code smells from review comments and analysis
   */
  categorizeCodeSmells(
    comments: Array<{ file: string; line: number; message: string; severity: string }>,
    symbols: CodeSymbol[],
    antiPatterns: Array<{ type: string; file: string; location: string; severity: string }>
  ): CodeSmellReport {
    const smells: CodeSmell[] = [];

    // Extract smells from anti-patterns
    for (const ap of antiPatterns) {
      const smell = this.mapAntiPatternToSmell(ap, symbols);
      if (smell) {
        smells.push(smell);
      }
    }

    // Extract smells from comments
    for (const comment of comments) {
      const detectedSmells = this.detectSmellsFromComment(comment, symbols);
      smells.push(...detectedSmells);
    }

    // Detect additional smells from code structure
    const structuralSmells = this.detectStructuralSmells(symbols);
    smells.push(...structuralSmells);

    // Categorize
    const byCategory = {
      structural: smells.filter(s => s.category === 'structural'),
      behavioral: smells.filter(s => s.category === 'behavioral'),
      data: smells.filter(s => s.category === 'data'),
      general: smells.filter(s => s.category === 'general'),
    };

    const byType: Record<string, CodeSmell[]> = {};
    for (const smell of smells) {
      if (!byType[smell.type]) {
        byType[smell.type] = [];
      }
      byType[smell.type].push(smell);
    }

    return {
      smells,
      byCategory,
      byType,
      total: smells.length,
    };
  }

  /**
   * Map anti-pattern to code smell
   */
  private mapAntiPatternToSmell(
    antiPattern: { type: string; file: string; location: string; severity: string },
    symbols: CodeSymbol[]
  ): CodeSmell | null {
    const typeMap: Record<string, CodeSmell['type']> = {
      'God Object': 'god_object',
      'Long Method': 'long_method',
      'Feature Envy': 'feature_envy',
      'Primitive Obsession': 'primitive_obsession',
    };

    const smellType = typeMap[antiPattern.type];
    if (!smellType) return null;

    const symbol = symbols.find(s => s.file === antiPattern.file && s.name === antiPattern.location);
    
    return {
      type: smellType,
      category: this.getCategoryForType(smellType),
      location: antiPattern.location,
      file: antiPattern.file,
      line: symbol?.startLine || 0,
      severity: antiPattern.severity as 'high' | 'medium' | 'low',
      message: `${antiPattern.type} detected`,
      suggestion: this.getSuggestionForType(smellType),
      refactoring: this.getRefactoringForType(smellType),
      relatedSmells: this.getRelatedSmells(smellType),
    };
  }

  /**
   * Detect smells from review comments
   */
  private detectSmellsFromComment(
    comment: { file: string; line: number; message: string; severity: string },
    symbols: CodeSymbol[]
  ): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const message = comment.message.toLowerCase();

    // Magic Number
    if (message.includes('magic number') || message.includes('magic numbers')) {
      smells.push({
        type: 'magic_number',
        category: 'data',
        location: `line ${comment.line}`,
        file: comment.file,
        line: comment.line,
        severity: this.normalizeSeverity(comment.severity),
        message: 'Magic number detected',
        suggestion: 'Extract magic numbers to named constants',
        refactoring: 'Extract Constant',
        relatedSmells: ['primitive_obsession'],
      });
    }

    // Dead Code
    if (message.includes('dead code') || message.includes('unused')) {
      smells.push({
        type: 'dead_code',
        category: 'general',
        location: `line ${comment.line}`,
        file: comment.file,
        line: comment.line,
        severity: this.normalizeSeverity(comment.severity),
        message: 'Dead code detected',
        suggestion: 'Remove unused code',
        refactoring: 'Remove Dead Code',
      });
    }

    // Duplicate Code
    if (message.includes('duplicate') || message.includes('similar')) {
      smells.push({
        type: 'duplicate_code',
        category: 'structural',
        location: `line ${comment.line}`,
        file: comment.file,
        line: comment.line,
        severity: this.normalizeSeverity(comment.severity),
        message: 'Duplicate code detected',
        suggestion: 'Extract common code into shared method or class',
        refactoring: 'Extract Method',
        relatedSmells: ['long_method'],
      });
    }

    return smells;
  }

  /**
   * Detect structural smells from code analysis
   */
  private detectStructuralSmells(symbols: CodeSymbol[]): CodeSmell[] {
    const smells: CodeSmell[] = [];

    for (const symbol of symbols) {
      // Long Parameter List
      if (symbol.type === 'method' && symbol.parameters && symbol.parameters.length > 5) {
        smells.push({
          type: 'long_parameter_list',
          category: 'behavioral',
          location: symbol.name,
          file: symbol.file,
          line: symbol.startLine,
          severity: symbol.parameters.length > 7 ? 'high' : 'medium',
          message: `Method has ${symbol.parameters.length} parameters`,
          suggestion: 'Introduce Parameter Object or use Builder pattern',
          refactoring: 'Introduce Parameter Object',
          relatedSmells: ['primitive_obsession'],
        });
      }

      // Large Class
      if (symbol.type === 'class') {
        const classMethods = symbols.filter(s => s.type === 'method' && s.file === symbol.file);
        if (classMethods.length > 20) {
          smells.push({
            type: 'large_class',
            category: 'structural',
            location: symbol.name,
            file: symbol.file,
            line: symbol.startLine,
            severity: classMethods.length > 30 ? 'high' : 'medium',
            message: `Class has ${classMethods.length} methods`,
            suggestion: 'Split class into smaller, focused classes',
            refactoring: 'Extract Class',
            relatedSmells: ['god_object'],
          });
        }
      }
    }

    return smells;
  }

  /**
   * Get category for smell type
   */
  private getCategoryForType(type: CodeSmell['type']): CodeSmell['category'] {
    const structural = ['god_object', 'large_class', 'duplicate_code'];
    const behavioral = ['long_method', 'feature_envy', 'long_parameter_list', 'switch_statement'];
    const data = ['primitive_obsession', 'data_clumps', 'magic_number'];
    
    if (structural.includes(type)) return 'structural';
    if (behavioral.includes(type)) return 'behavioral';
    if (data.includes(type)) return 'data';
    return 'general';
  }

  /**
   * Get suggestion for smell type
   */
  private getSuggestionForType(type: CodeSmell['type']): string {
    const suggestions: Record<CodeSmell['type'], string> = {
      god_object: 'Split into smaller classes with single responsibility',
      long_method: 'Extract methods to improve readability and testability',
      feature_envy: 'Move method to class it accesses most',
      primitive_obsession: 'Replace primitives with value objects',
      data_clumps: 'Extract data clump into object',
      large_class: 'Split class following Single Responsibility Principle',
      long_parameter_list: 'Introduce Parameter Object or Builder',
      switch_statement: 'Replace with polymorphism or Strategy pattern',
      speculative_generality: 'Remove unused abstractions',
      dead_code: 'Remove unused code',
      duplicate_code: 'Extract common code into shared method',
      magic_number: 'Extract to named constant',
    };
    return suggestions[type] || 'Refactor to improve code quality';
  }

  /**
   * Get refactoring technique for smell type
   */
  private getRefactoringForType(type: CodeSmell['type']): string {
    const refactorings: Record<CodeSmell['type'], string> = {
      god_object: 'Extract Class',
      long_method: 'Extract Method',
      feature_envy: 'Move Method',
      primitive_obsession: 'Replace Primitive with Object',
      data_clumps: 'Introduce Parameter Object',
      large_class: 'Extract Class',
      long_parameter_list: 'Introduce Parameter Object',
      switch_statement: 'Replace Conditional with Polymorphism',
      speculative_generality: 'Remove Dead Code',
      dead_code: 'Remove Dead Code',
      duplicate_code: 'Extract Method',
      magic_number: 'Extract Constant',
    };
    return refactorings[type] || 'Refactor';
  }

  /**
   * Get related smells
   */
  private getRelatedSmells(type: CodeSmell['type']): string[] {
    const relations: Record<CodeSmell['type'], string[]> = {
      god_object: ['large_class', 'feature_envy'],
      long_method: ['duplicate_code', 'switch_statement'],
      feature_envy: ['god_object', 'data_clumps'],
      primitive_obsession: ['data_clumps', 'long_parameter_list'],
      data_clumps: ['primitive_obsession', 'long_parameter_list'],
      large_class: ['god_object', 'feature_envy'],
      long_parameter_list: ['primitive_obsession', 'data_clumps'],
      switch_statement: ['long_method', 'duplicate_code'],
      duplicate_code: ['long_method'],
      magic_number: ['primitive_obsession'],
      dead_code: [],
      speculative_generality: [],
    };
    return relations[type] || [];
  }

  /**
   * Normalize severity
   */
  private normalizeSeverity(severity: string): 'high' | 'medium' | 'low' {
    const sev = severity.toLowerCase();
    if (sev === 'critical' || sev === 'high') return 'high';
    if (sev === 'major' || sev === 'medium') return 'medium';
    return 'low';
  }
}

