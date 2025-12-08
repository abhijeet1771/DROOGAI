/**
 * Advanced Test Failure Prediction
 * Uses sophisticated static analysis to predict test failures with high accuracy
 */

import { CodeSymbol, CallRelationship } from '../parser/types.js';
import { CodebaseIndexer } from '../indexer/indexer.js';

export interface AdvancedTestPrediction {
  testFile: string;
  testMethod: string;
  probability: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  reason: string;
  affectedCode: string[];
  suggestion: string;
  failureType: 'compilation' | 'runtime' | 'assertion' | 'exception' | 'type_error';
  evidence: string[]; // Supporting evidence for prediction
}

export interface PredictionRule {
  name: string;
  check: (symbol: CodeSymbol, oldSymbol: CodeSymbol | null, test: { file: string; method: string }) => boolean;
  failureType: AdvancedTestPrediction['failureType'];
  probability: 'high' | 'medium' | 'low';
  reason: (symbol: CodeSymbol, oldSymbol: CodeSymbol | null) => string;
}

export class AdvancedTestPredictor {
  private indexer: CodebaseIndexer;
  private rules: PredictionRule[] = [];

  constructor(indexer: CodebaseIndexer) {
    this.indexer = indexer;
    this.initializeRules();
  }

  /**
   * Initialize prediction rules
   */
  private initializeRules(): void {
    this.rules = [
      // Rule 1: Parameter count changed
      {
        name: 'parameter_count_change',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          const oldParams = this.extractParameterCount(oldSymbol.signature || '');
          const newParams = this.extractParameterCount(symbol.signature || '');
          return oldParams !== newParams;
        },
        failureType: 'compilation',
        probability: 'high',
        reason: (symbol, oldSymbol) => 
          `Parameter count changed: ${this.extractParameterCount(oldSymbol?.signature || '')} → ${this.extractParameterCount(symbol.signature || '')} parameters`
      },

      // Rule 2: Parameter type changed
      {
        name: 'parameter_type_change',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          const oldTypes = this.extractParameterTypes(oldSymbol.signature || '');
          const newTypes = this.extractParameterTypes(symbol.signature || '');
          return JSON.stringify(oldTypes) !== JSON.stringify(newTypes);
        },
        failureType: 'type_error',
        probability: 'high',
        reason: (symbol, oldSymbol) => 
          `Parameter types changed: ${this.extractParameterTypes(oldSymbol?.signature || '').join(', ')} → ${this.extractParameterTypes(symbol.signature || '').join(', ')}`
      },

      // Rule 3: Return type changed (incompatible)
      {
        name: 'return_type_incompatible',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol || !symbol.returnType || !oldSymbol.returnType) return false;
          return this.isIncompatibleReturnType(oldSymbol.returnType, symbol.returnType);
        },
        failureType: 'type_error',
        probability: 'high',
        reason: (symbol, oldSymbol) => 
          `Return type changed from ${oldSymbol?.returnType} to ${symbol.returnType} - incompatible types`
      },

      // Rule 4: Method now throws checked exception
      {
        name: 'new_checked_exception',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          const oldExceptions = this.extractExceptions(oldSymbol.code || '');
          const newExceptions = this.extractExceptions(symbol.code || '');
          const newCheckedExceptions = newExceptions.filter(e => !oldExceptions.includes(e) && this.isCheckedException(e));
          return newCheckedExceptions.length > 0;
        },
        failureType: 'compilation',
        probability: 'high',
        reason: (symbol, oldSymbol) => {
          const oldExceptions = this.extractExceptions(oldSymbol?.code || '');
          const newExceptions = this.extractExceptions(symbol.code || '');
          const newChecked = newExceptions.filter(e => !oldExceptions.includes(e) && this.isCheckedException(e));
          return `Method now throws checked exception(s): ${newChecked.join(', ')}`
        }
      },

      // Rule 5: Nullability changed (nullable → non-nullable or vice versa)
      {
        name: 'nullability_change',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          const oldNullable = this.isNullable(oldSymbol.returnType || '');
          const newNullable = this.isNullable(symbol.returnType || '');
          return oldNullable !== newNullable;
        },
        failureType: 'runtime',
        probability: 'medium',
        reason: (symbol, oldSymbol) => {
          const oldNullable = this.isNullable(oldSymbol?.returnType || '');
          const newNullable = this.isNullable(symbol.returnType || '');
          if (oldNullable && !newNullable) {
            return 'Return type changed from nullable to non-nullable - null checks may fail';
          }
          return 'Return type nullability changed - may cause NullPointerException';
        }
      },

      // Rule 6: Generic type parameters changed
      {
        name: 'generic_type_change',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          const oldGenerics = this.extractGenerics(oldSymbol.signature || '');
          const newGenerics = this.extractGenerics(symbol.signature || '');
          return JSON.stringify(oldGenerics) !== JSON.stringify(newGenerics);
        },
        failureType: 'type_error',
        probability: 'high',
        reason: (symbol, oldSymbol) => 
          `Generic type parameters changed: ${this.extractGenerics(oldSymbol?.signature || '').join(', ')} → ${this.extractGenerics(symbol.signature || '').join(', ')}`
      },

      // Rule 7: Method removed (deleted)
      {
        name: 'method_removed',
        check: (symbol, oldSymbol) => {
          // If oldSymbol exists in index but not in PR, it was removed
          const index = this.indexer.getIndex();
          const existsInIndex = index.symbolMap.has(symbol.name);
          return existsInIndex && !symbol.code;
        },
        failureType: 'compilation',
        probability: 'high',
        reason: () => 'Method was removed - all callers will fail to compile'
      },

      // Rule 8: Static method changed to instance (or vice versa)
      {
        name: 'static_modifier_change',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          const oldStatic = this.isStatic(oldSymbol.code || '');
          const newStatic = this.isStatic(symbol.code || '');
          return oldStatic !== newStatic;
        },
        failureType: 'compilation',
        probability: 'high',
        reason: (symbol, oldSymbol) => {
          const oldStatic = this.isStatic(oldSymbol?.code || '');
          const newStatic = this.isStatic(symbol.code || '');
          if (oldStatic && !newStatic) {
            return 'Method changed from static to instance - requires object instantiation';
          }
          return 'Method changed from instance to static - cannot be called on instance';
        }
      },

      // Rule 9: Method behavior changed (detected via code pattern analysis)
      {
        name: 'behavior_change',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol || !symbol.code || !oldSymbol.code) return false;
          // Check for significant code changes
          const oldComplexity = this.calculateComplexity(oldSymbol.code);
          const newComplexity = this.calculateComplexity(symbol.code);
          const complexityChange = Math.abs(newComplexity - oldComplexity);
          
          // Check for control flow changes
          const oldBranches = this.countBranches(oldSymbol.code);
          const newBranches = this.countBranches(symbol.code);
          
          return complexityChange > 5 || Math.abs(newBranches - oldBranches) > 2;
        },
        failureType: 'assertion',
        probability: 'medium',
        reason: () => 'Method behavior significantly changed - assertions may fail'
      },

      // Rule 10: Dependency injection changes
      {
        name: 'dependency_change',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          const oldDeps = this.extractDependencies(oldSymbol.code || '');
          const newDeps = this.extractDependencies(symbol.code || '');
          const removedDeps = oldDeps.filter(d => !newDeps.includes(d));
          return removedDeps.length > 0;
        },
        failureType: 'runtime',
        probability: 'medium',
        reason: (symbol, oldSymbol) => {
          const oldDeps = this.extractDependencies(oldSymbol?.code || '');
          const newDeps = this.extractDependencies(symbol.code || '');
          const removed = oldDeps.filter(d => !newDeps.includes(d));
          return `Dependencies removed: ${removed.join(', ')} - may cause runtime errors`
        }
      },

      // Rule 11: Async/sync change (Promise/async added or removed)
      {
        name: 'async_change',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          const oldAsync = this.isAsync(oldSymbol.code || '');
          const newAsync = this.isAsync(symbol.code || '');
          return oldAsync !== newAsync;
        },
        failureType: 'runtime',
        probability: 'high',
        reason: (symbol, oldSymbol) => {
          const oldAsync = this.isAsync(oldSymbol?.code || '');
          const newAsync = this.isAsync(symbol.code || '');
          if (!oldAsync && newAsync) {
            return 'Method changed to async - callers must use await';
          }
          return 'Method changed from async to sync - await calls will fail';
        }
      },

      // Rule 12: Visibility reduced (already covered but enhanced)
      {
        name: 'visibility_reduced',
        check: (symbol, oldSymbol) => {
          if (!oldSymbol) return false;
          return this.isVisibilityReduced(oldSymbol.visibility || '', symbol.visibility || '');
        },
        failureType: 'compilation',
        probability: 'high',
        reason: (symbol, oldSymbol) => 
          `Visibility reduced: ${oldSymbol?.visibility} → ${symbol.visibility} - external callers cannot access`
      }
    ];
  }

  /**
   * Predict test failures with advanced analysis
   */
  predictAdvanced(changedSymbols: CodeSymbol[], testFiles: string[]): AdvancedTestPrediction[] {
    const predictions: AdvancedTestPrediction[] = [];
    const index = this.indexer.getIndex();

    for (const symbol of changedSymbols) {
      // Get old version from index
      const oldSymbol = index.symbolMap.get(symbol.name) || null;

      // Find tests that use this symbol
      const relatedTests = this.findTestsForSymbol(symbol, testFiles, index);

      for (const test of relatedTests) {
        // Apply all rules
        const matchedRules = this.rules.filter(rule => rule.check(symbol, oldSymbol, test));

        if (matchedRules.length > 0) {
          // Calculate confidence based on number of matching rules
          const confidence = Math.min(0.95, 0.6 + (matchedRules.length * 0.1));
          
          // Get highest probability
          const probabilities = matchedRules.map(r => r.probability);
          const probability = probabilities.includes('high') ? 'high' : 
                             probabilities.includes('medium') ? 'medium' : 'low';

          // Get primary failure type
          const failureType = matchedRules[0].failureType;

          // Collect all reasons
          const reasons = matchedRules.map(r => r.reason(symbol, oldSymbol));
          const evidence = matchedRules.map(r => r.name);

          predictions.push({
            testFile: test.file,
            testMethod: test.method,
            probability,
            confidence,
            reason: reasons.join('; '),
            affectedCode: [symbol.name],
            suggestion: this.generateSuggestion(symbol, oldSymbol, matchedRules[0]),
            failureType,
            evidence
          });
        }
      }
    }

    return predictions;
  }

  /**
   * Find tests that use a symbol (enhanced)
   */
  private findTestsForSymbol(
    symbol: CodeSymbol,
    testFiles: string[],
    index: any
  ): Array<{ file: string; method: string }> {
    const tests: Array<{ file: string; method: string }> = [];

    // Method 1: Call graph analysis
    const callGraph = index.callGraph || [];
    for (const call of callGraph) {
      if (call.callee === symbol.name) {
        const callerFile = call.file;
        if (this.isTestFile(callerFile)) {
          tests.push({
            file: callerFile,
            method: call.caller
          });
        }
      }
    }

    // Method 2: Name-based matching (enhanced)
    const symbolName = symbol.name.toLowerCase();
    for (const testFile of testFiles) {
      if (this.isTestFile(testFile)) {
        // Check if test file name matches symbol
        const testFileName = testFile.toLowerCase();
        if (testFileName.includes(symbolName.replace('service', '').replace('manager', '').replace('handler', ''))) {
          // Extract test methods from file
          const testMethods = this.extractTestMethods(testFile, index);
          tests.push(...testMethods.map(m => ({ file: testFile, method: m })));
        }
      }
    }

    // Method 3: Pattern-based matching
    // Look for common test patterns: testMethodName, shouldMethodName, it_should_method_name
    const testPatterns = [
      `test${symbol.name}`,
      `test_${symbol.name}`,
      `should${symbol.name}`,
      `it_should_${symbol.name.toLowerCase()}`,
      `describe_${symbol.name}`
    ];

    for (const testFile of testFiles) {
      if (this.isTestFile(testFile)) {
        const fileContent = this.getFileContent(testFile, index);
        for (const pattern of testPatterns) {
          if (fileContent.toLowerCase().includes(pattern.toLowerCase())) {
            const testMethods = this.extractTestMethods(testFile, index);
            tests.push(...testMethods.map(m => ({ file: testFile, method: m })));
            break;
          }
        }
      }
    }

    // Deduplicate
    const unique = new Map<string, { file: string; method: string }>();
    for (const test of tests) {
      const key = `${test.file}::${test.method}`;
      if (!unique.has(key)) {
        unique.set(key, test);
      }
    }

    return Array.from(unique.values());
  }

  // Helper methods
  private extractParameterCount(signature: string): number {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return 0;
    const params = match[1].trim();
    return params ? params.split(',').length : 0;
  }

  private extractParameterTypes(signature: string): string[] {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];
    const params = match[1].trim();
    if (!params) return [];
    return params.split(',').map(p => {
      const typeMatch = p.trim().match(/^(\w+)/);
      return typeMatch ? typeMatch[1] : '';
    }).filter(t => t);
  }

  private extractGenerics(signature: string): string[] {
    const matches = signature.match(/<([^>]+)>/g);
    if (!matches) return [];
    return matches.map(m => m.replace(/[<>]/g, ''));
  }

  private extractExceptions(code: string): string[] {
    const exceptions: string[] = [];
    // Java: throws Exception1, Exception2
    const javaThrows = code.match(/throws\s+([^\{]+)/);
    if (javaThrows) {
      exceptions.push(...javaThrows[1].split(',').map(e => e.trim()));
    }
    // TypeScript: : Promise<Error>
    const tsPromise = code.match(/:\s*Promise<(\w+)>/);
    if (tsPromise) {
      exceptions.push(tsPromise[1]);
    }
    return exceptions;
  }

  private isCheckedException(exception: string): boolean {
    // In Java, checked exceptions are: Exception, IOException, SQLException, etc.
    // (not RuntimeException or Error)
    const unchecked = ['runtimeexception', 'error', 'nullpointerexception', 'illegalargumentexception'];
    return !unchecked.includes(exception.toLowerCase());
  }

  private isNullable(type: string): boolean {
    return type.includes('?') || type.includes('null') || type.includes('undefined') || 
           type.includes('Optional') || type.includes('Maybe');
  }

  private isStatic(code: string): boolean {
    return /static\s+(async\s+)?(function|method|def)/i.test(code) || 
           /^\s*static\s+/m.test(code);
  }

  private isAsync(code: string): boolean {
    return /async\s+(function|def)/i.test(code) || 
           /:\s*Promise</.test(code) ||
           /async\s+\(/.test(code);
  }

  private calculateComplexity(code: string): number {
    let complexity = 1; // Base complexity
    complexity += (code.match(/\bif\s*\(/gi) || []).length;
    complexity += (code.match(/\bfor\s*\(/gi) || []).length;
    complexity += (code.match(/\bwhile\s*\(/gi) || []).length;
    complexity += (code.match(/\bswitch\s*\(/gi) || []).length;
    complexity += (code.match(/\bcatch\s*\(/gi) || []).length;
    return complexity;
  }

  private countBranches(code: string): number {
    return (code.match(/\b(if|else if|case|catch)\b/gi) || []).length;
  }

  private extractDependencies(code: string): string[] {
    const deps: string[] = [];
    // Constructor injection: constructor(private service: Service)
    const constructorDeps = code.match(/constructor\s*\([^)]*(\w+):\s*(\w+)/g);
    if (constructorDeps) {
      constructorDeps.forEach(dep => {
        const match = dep.match(/(\w+):\s*(\w+)/);
        if (match) deps.push(match[2]);
      });
    }
    // Method parameters
    const methodParams = code.match(/(\w+)\s*:\s*(\w+)/g);
    if (methodParams) {
      methodParams.forEach(param => {
        const match = param.match(/(\w+)\s*:\s*(\w+)/);
        if (match && !['string', 'number', 'boolean', 'void'].includes(match[2].toLowerCase())) {
          deps.push(match[2]);
        }
      });
    }
    return [...new Set(deps)];
  }

  private isVisibilityReduced(oldVis: string, newVis: string): boolean {
    const levels: Record<string, number> = { 'public': 3, 'protected': 2, 'private': 1 };
    return (levels[oldVis.toLowerCase()] || 0) > (levels[newVis.toLowerCase()] || 0);
  }

  private isIncompatibleReturnType(oldType: string, newType: string): boolean {
    // Primitive to object or vice versa
    const primitives = ['int', 'number', 'string', 'boolean', 'void'];
    const oldPrimitive = primitives.includes(oldType.toLowerCase());
    const newPrimitive = primitives.includes(newType.toLowerCase());
    if (oldPrimitive !== newPrimitive) return true;

    // Different object types
    if (!oldPrimitive && !newPrimitive && oldType !== newType) {
      // Check if they're compatible (e.g., parent-child)
      // For now, assume incompatible if different
      return oldType !== newType;
    }

    return false;
  }

  private isTestFile(filepath: string): boolean {
    return filepath.includes('test') ||
           filepath.includes('spec') ||
           filepath.endsWith('Test.java') ||
           filepath.endsWith('Tests.java') ||
           !!filepath.match(/\.(test|spec)\.(js|ts|py)$/);
  }

  private extractTestMethods(filepath: string, index: any): string[] {
    // Try to get from index
    const fileSymbols = index.symbols?.filter((s: CodeSymbol) => s.file === filepath) || [];
    return fileSymbols
      .filter((s: CodeSymbol) => s.type === 'method' && 
        (s.name.startsWith('test') || s.name.startsWith('it') || s.name.startsWith('should')))
      .map((s: CodeSymbol) => s.name);
  }

  private getFileContent(filepath: string, index: any): string {
    const fileSymbols = index.symbols?.filter((s: CodeSymbol) => s.file === filepath) || [];
    return fileSymbols.map((s: CodeSymbol) => s.code || '').join('\n');
  }

  private generateSuggestion(symbol: CodeSymbol, oldSymbol: CodeSymbol | null, rule: PredictionRule): string {
    switch (rule.name) {
      case 'parameter_count_change':
        return `Update test to match new parameter count: ${this.extractParameterCount(symbol.signature || '')} parameters`;
      case 'parameter_type_change':
        return `Update test to use new parameter types: ${this.extractParameterTypes(symbol.signature || '').join(', ')}`;
      case 'return_type_incompatible':
        return `Update test assertions to expect new return type: ${symbol.returnType}`;
      case 'new_checked_exception':
        return `Add exception handling in test or update method signature`;
      case 'method_removed':
        return `Remove test or update to use replacement method`;
      case 'static_modifier_change':
        return `Update test to match new method type (static/instance)`;
      case 'async_change':
        return `Update test to handle async/sync change - add/remove await`;
      default:
        return `Review and update test to match new implementation`;
    }
  }
}


