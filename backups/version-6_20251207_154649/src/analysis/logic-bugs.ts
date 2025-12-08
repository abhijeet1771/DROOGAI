/**
 * Logic Bug Analyzer
 * Detects common logic bugs: null checks, division by zero, off-by-one errors, missing validations
 */

import { CodeSymbol } from '../parser/types.js';

export interface LogicBug {
  type: 'null_check' | 'division_by_zero' | 'off_by_one' | 'missing_validation' | 'array_bounds' | 'type_error' | 'logic_error';
  location: string;
  file: string;
  line: number;
  method?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  codeSnippet?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface LogicBugReport {
  bugs: LogicBug[];
  critical: LogicBug[];
  high: LogicBug[];
  medium: LogicBug[];
  low: LogicBug[];
  summary: string;
}

export class LogicBugAnalyzer {
  /**
   * Analyze code for logic bugs
   */
  analyzeLogicBugs(symbols: CodeSymbol[], codeContent: string, filepath?: string): LogicBugReport {
    const bugs: LogicBug[] = [];
    const language = this.detectLanguage(filepath || '');

    // Analyze each method/function
    for (const symbol of symbols) {
      if ((symbol.type === 'method' || symbol.type === 'function') && symbol.code) {
        const methodCode = symbol.code;
        const methodLines = methodCode.split('\n');

        // 1. Detect missing null checks
        const nullCheckBugs = this.detectMissingNullChecks(symbol, methodCode, methodLines, language);
        bugs.push(...nullCheckBugs);

        // 2. Detect division by zero
        const divisionBugs = this.detectDivisionByZero(symbol, methodCode, methodLines, language);
        bugs.push(...divisionBugs);

        // 3. Detect off-by-one errors
        const offByOneBugs = this.detectOffByOneErrors(symbol, methodCode, methodLines, language);
        bugs.push(...offByOneBugs);

        // 4. Detect missing validations
        const validationBugs = this.detectMissingValidations(symbol, methodCode, methodLines, language);
        bugs.push(...validationBugs);

        // 5. Detect array bounds issues
        const arrayBoundsBugs = this.detectArrayBoundsIssues(symbol, methodCode, methodLines, language);
        bugs.push(...arrayBoundsBugs);

        // 6. Detect type errors (TypeScript/JavaScript)
        if (language === 'typescript' || language === 'javascript') {
          const typeErrorBugs = this.detectTypeErrors(symbol, methodCode, methodLines);
          bugs.push(...typeErrorBugs);
        }
      }
    }

    // Categorize by severity
    const critical = bugs.filter(b => b.severity === 'critical');
    const high = bugs.filter(b => b.severity === 'high');
    const medium = bugs.filter(b => b.severity === 'medium');
    const low = bugs.filter(b => b.severity === 'low');

    const summary = this.generateSummary(bugs, critical, high, medium, low);

    return {
      bugs,
      critical,
      high,
      medium,
      low,
      summary,
    };
  }

  /**
   * Detect language from filepath
   */
  private detectLanguage(filepath: string): 'java' | 'typescript' | 'javascript' | 'python' | 'unknown' {
    if (filepath.endsWith('.java')) return 'java';
    if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) return 'typescript';
    if (filepath.endsWith('.js') || filepath.endsWith('.jsx')) return 'javascript';
    if (filepath.endsWith('.py')) return 'python';
    return 'unknown';
  }

  /**
   * Detect missing null checks
   */
  private detectMissingNullChecks(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[],
    language: string
  ): LogicBug[] {
    const bugs: LogicBug[] = [];
    const methodCodeLower = methodCode.toLowerCase();

    // Pattern: Method parameter used without null check
    for (let i = 0; i < methodLines.length; i++) {
      const line = methodLines[i];
      const lineLower = line.toLowerCase();
      const lineNumber = symbol.startLine + i;

      // Java patterns
      if (language === 'java' || language === 'unknown') {
        // Pattern: Parameter used with .method() without null check
        if (symbol.parameters && symbol.parameters.length > 0) {
          for (const param of symbol.parameters) {
            const paramName = param.name;
            // Check if parameter is used with method call but no null check before
            const paramUsagePattern = new RegExp(`\\b${paramName}\\s*\\.`, 'g');
            if (paramUsagePattern.test(line)) {
              // Check if there's a null check before this line
              const codeBeforeLine = methodLines.slice(0, i).join('\n');
              const nullCheckPattern = new RegExp(
                `(${paramName}\\s*==\\s*null|${paramName}\\s*!=\\s*null|Objects\\.isNull\\(${paramName}\\)|Objects\\.nonNull\\(${paramName}\\))`,
                'i'
              );
              
              if (!nullCheckPattern.test(codeBeforeLine)) {
                bugs.push({
                  type: 'null_check',
                  location: `${symbol.file}:${lineNumber}`,
                  file: symbol.file,
                  line: lineNumber,
                  method: symbol.name,
                  severity: 'high',
                  message: `Parameter '${paramName}' is used without null check - potential NullPointerException`,
                  suggestion: `Add null check: if (${paramName} == null) { throw new IllegalArgumentException("${paramName} cannot be null"); }`,
                  codeSnippet: line.trim(),
                  confidence: 'high',
                });
              }
            }
          }
        }
      }

      // TypeScript/JavaScript patterns
      if (language === 'typescript' || language === 'javascript') {
        // Pattern: Optional chaining not used, parameter accessed directly
        if (symbol.parameters && symbol.parameters.length > 0) {
          for (const param of symbol.parameters) {
            const paramName = param.name;
            // Check if parameter is accessed with .method() or [index] without optional chaining or null check
            const paramUsagePattern = new RegExp(`\\b${paramName}\\s*[\\.\\[]`, 'g');
            if (paramUsagePattern.test(line) && !line.includes(`${paramName}?.`) && !line.includes(`${paramName}?.[`)) {
              // Check if there's a null/undefined check before
              const codeBeforeLine = methodLines.slice(0, i).join('\n');
              const nullCheckPattern = new RegExp(
                `(${paramName}\\s*===\\s*null|${paramName}\\s*===\\s*undefined|${paramName}\\s*!==\\s*null|${paramName}\\s*!==\\s*undefined|!${paramName}|typeof\\s+${paramName})`,
                'i'
              );
              
              if (!nullCheckPattern.test(codeBeforeLine)) {
                bugs.push({
                  type: 'null_check',
                  location: `${symbol.file}:${lineNumber}`,
                  file: symbol.file,
                  line: lineNumber,
                  method: symbol.name,
                  severity: 'high',
                  message: `Parameter '${paramName}' is accessed without null/undefined check - potential TypeError`,
                  suggestion: `Add null check: if (!${paramName}) { throw new Error("${paramName} is required"); } or use optional chaining: ${paramName}?.method()`,
                  codeSnippet: line.trim(),
                  confidence: 'high',
                });
              }
            }
          }
        }

        // Pattern: Function return value used without null check
        const functionCallPattern = /(\w+)\s*\([^)]*\)\s*\./;
        const match = functionCallPattern.exec(line);
        if (match && !line.includes('?.') && !line.includes('||')) {
          const funcName = match[1];
          const codeBeforeLine = methodLines.slice(0, i).join('\n');
          // Check if result is checked for null
          if (!new RegExp(`${funcName}\\([^)]*\\)\\s*[!=]==\\s*(null|undefined)`, 'i').test(codeBeforeLine)) {
            bugs.push({
              type: 'null_check',
              location: `${symbol.file}:${lineNumber}`,
              file: symbol.file,
              line: lineNumber,
              method: symbol.name,
              severity: 'medium',
              message: `Function '${funcName}()' return value used without null check`,
              suggestion: `Check for null: const result = ${funcName}(); if (!result) { ... } or use optional chaining`,
              codeSnippet: line.trim(),
              confidence: 'medium',
            });
          }
        }
      }
    }

    return bugs;
  }

  /**
   * Detect division by zero
   */
  private detectDivisionByZero(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[],
    language: string
  ): LogicBug[] {
    const bugs: LogicBug[] = [];

    for (let i = 0; i < methodLines.length; i++) {
      const line = methodLines[i];
      const lineNumber = symbol.startLine + i;

      // Pattern: Division or modulo without zero check
      const divisionPattern = /\/\s*(\w+)|%\s*(\w+)/g;
      let match;
      
      while ((match = divisionPattern.exec(line)) !== null) {
        const divisor = match[1] || match[2];
        if (divisor && divisor !== '0' && divisor !== '0.0') {
          // Check if there's a zero check before this line
          const codeBeforeLine = methodLines.slice(0, i).join('\n');
          const zeroCheckPattern = new RegExp(
            `(${divisor}\\s*[!=]==\\s*0|${divisor}\\s*[!=]==\\s*0\\.0|Math\\.abs\\(${divisor}\\)\\s*<\\s*0\\.0001)`,
            'i'
          );
          
          if (!zeroCheckPattern.test(codeBeforeLine)) {
            bugs.push({
              type: 'division_by_zero',
              location: `${symbol.file}:${lineNumber}`,
              file: symbol.file,
              line: lineNumber,
              method: symbol.name,
              severity: 'critical',
              message: `Division by '${divisor}' without zero check - potential ArithmeticException/Infinity`,
              suggestion: `Add zero check: if (${divisor} === 0) { throw new Error("Division by zero"); }`,
              codeSnippet: line.trim(),
              confidence: 'high',
            });
          }
        }
      }
    }

    return bugs;
  }

  /**
   * Detect off-by-one errors
   */
  private detectOffByOneErrors(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[],
    language: string
  ): LogicBug[] {
    const bugs: LogicBug[] = [];

    for (let i = 0; i < methodLines.length; i++) {
      const line = methodLines[i];
      const lineNumber = symbol.startLine + i;

      // Pattern: Loop with potential off-by-one
      // for (i = 0; i <= array.length; i++) - should be <
      // for (i = 1; i < array.length; i++) - might be intentional, but flag if accessing array[i-1]
      const loopPattern = /for\s*\([^)]*\)\s*\{/;
      if (loopPattern.test(line)) {
        // Check next few lines for array access
        const nextLines = methodLines.slice(i, Math.min(i + 10, methodLines.length)).join('\n');
        
        // Pattern: <= with length (common off-by-one)
        if (/i\s*<=\s*(\w+)\.length|i\s*<=\s*(\w+)\.size\(\)/.test(line)) {
          bugs.push({
            type: 'off_by_one',
            location: `${symbol.file}:${lineNumber}`,
            file: symbol.file,
            line: lineNumber,
            method: symbol.name,
            severity: 'medium',
            message: 'Loop condition uses <= with length - potential off-by-one error (should use <)',
            suggestion: 'Change <= to < to avoid accessing index out of bounds',
            codeSnippet: line.trim(),
            confidence: 'medium',
          });
        }

        // Pattern: Array access with index that might be out of bounds
        const arrayAccessPattern = /(\w+)\[(\w+)\s*[+\-]\s*\d+\]/;
        const arrayMatch = arrayAccessPattern.exec(nextLines);
        if (arrayMatch) {
          bugs.push({
            type: 'off_by_one',
            location: `${symbol.file}:${lineNumber}`,
            file: symbol.file,
            line: lineNumber,
            method: symbol.name,
            severity: 'low',
            message: `Array access with index calculation - verify bounds: ${arrayMatch[1]}[${arrayMatch[2]}]`,
            suggestion: 'Ensure index is within bounds: if (index >= 0 && index < array.length) { ... }',
            codeSnippet: line.trim(),
            confidence: 'low',
          });
        }
      }
    }

    return bugs;
  }

  /**
   * Detect missing validations
   */
  private detectMissingValidations(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[],
    language: string
  ): LogicBug[] {
    const bugs: LogicBug[] = [];

    // Check if method has parameters but no validation
    if (symbol.parameters && symbol.parameters.length > 0) {
      const hasValidation = methodCode.match(/(if\s*\(|throw|assert|validate|check)/i);
      
      // Check for common validation patterns
      const validationPatterns = [
        /if\s*\([^)]*==\s*null/,
        /if\s*\([^)]*!=\s*null/,
        /if\s*\([^)]*===/,
        /if\s*\([^)]*!==/,
        /throw\s+new/,
        /assert/,
        /validate/,
        /check/,
      ];

      const hasAnyValidation = validationPatterns.some(pattern => pattern.test(methodCode));

      // If method has parameters but no validation, and it's not a simple getter/setter
      if (!hasAnyValidation && !symbol.name.match(/^(get|set|is|has)[A-Z]/)) {
        bugs.push({
          type: 'missing_validation',
          location: `${symbol.file}:${symbol.startLine}`,
          file: symbol.file,
          line: symbol.startLine,
          method: symbol.name,
          severity: 'medium',
          message: `Method '${symbol.name}' has parameters but no input validation`,
          suggestion: `Add parameter validation: if (param == null || param.isEmpty()) { throw new IllegalArgumentException("param is required"); }`,
          codeSnippet: symbol.code?.split('\n')[0] || '',
          confidence: 'low',
        });
      }
    }

    return bugs;
  }

  /**
   * Detect array bounds issues
   */
  private detectArrayBoundsIssues(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[],
    language: string
  ): LogicBug[] {
    const bugs: LogicBug[] = [];

    for (let i = 0; i < methodLines.length; i++) {
      const line = methodLines[i];
      const lineNumber = symbol.startLine + i;

      // Pattern: Array access without bounds check
      const arrayAccessPattern = /(\w+)\[(\w+)\]/g;
      let match;
      
      while ((match = arrayAccessPattern.exec(line)) !== null) {
        const arrayName = match[1];
        const indexName = match[2];
        
        // Skip if it's a string access (e.g., str[0])
        if (indexName.match(/^\d+$/)) {
          continue; // Literal index, probably safe
        }

        // Check if there's a bounds check before
        const codeBeforeLine = methodLines.slice(0, i).join('\n');
        const boundsCheckPattern = new RegExp(
          `(${indexName}\\s*>=\\s*0|${indexName}\\s*<\\s*${arrayName}\\.length|${indexName}\\s*<\\s*${arrayName}\\.size\\(\\))`,
          'i'
        );
        
        if (!boundsCheckPattern.test(codeBeforeLine)) {
          bugs.push({
            type: 'array_bounds',
            location: `${symbol.file}:${lineNumber}`,
            file: symbol.file,
            line: lineNumber,
            method: symbol.name,
            severity: 'high',
            message: `Array '${arrayName}' accessed with '${indexName}' without bounds check - potential IndexOutOfBoundsException`,
            suggestion: `Add bounds check: if (${indexName} >= 0 && ${indexName} < ${arrayName}.length) { ... }`,
            codeSnippet: line.trim(),
            confidence: 'high',
          });
        }
      }
    }

    return bugs;
  }

  /**
   * Detect type errors (TypeScript/JavaScript specific)
   */
  private detectTypeErrors(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): LogicBug[] {
    const bugs: LogicBug[] = [];

    for (let i = 0; i < methodLines.length; i++) {
      const line = methodLines[i];
      const lineNumber = symbol.startLine + i;

      // Pattern: Calling method on potentially non-object
      // e.g., someVar.toString() where someVar might be null/undefined
      const methodCallPattern = /(\w+)\.(\w+)\s*\(/;
      const match = methodCallPattern.exec(line);
      
      if (match) {
        const varName = match[1];
        const methodName = match[2];
        
        // Skip if it's a known safe method or already checked
        if (methodName === 'length' || methodName === 'size') {
          continue;
        }

        // Check if there's a type check before
        const codeBeforeLine = methodLines.slice(0, i).join('\n');
        const typeCheckPattern = new RegExp(
          `(typeof\\s+${varName}|${varName}\\s*instanceof|${varName}\\s*===|${varName}\\s*!==|!${varName}|${varName}\\s*&&)`,
          'i'
        );
        
        if (!typeCheckPattern.test(codeBeforeLine) && !line.includes('?.') && !line.includes('||')) {
          bugs.push({
            type: 'type_error',
            location: `${symbol.file}:${lineNumber}`,
            file: symbol.file,
            line: lineNumber,
            method: symbol.name,
            severity: 'medium',
            message: `Variable '${varName}' used with method '${methodName}()' without type/null check - potential TypeError`,
            suggestion: `Add type check: if (${varName} && typeof ${varName}.${methodName} === 'function') { ... } or use optional chaining: ${varName}?.${methodName}()`,
            codeSnippet: line.trim(),
            confidence: 'medium',
          });
        }
      }
    }

    return bugs;
  }

  /**
   * Generate summary
   */
  private generateSummary(
    bugs: LogicBug[],
    critical: LogicBug[],
    high: LogicBug[],
    medium: LogicBug[],
    low: LogicBug[]
  ): string {
    if (bugs.length === 0) {
      return 'No logic bugs detected.';
    }

    const parts: string[] = [];
    parts.push(`Found ${bugs.length} logic bug(s):`);
    
    if (critical.length > 0) {
      parts.push(`${critical.length} critical (division by zero, etc.)`);
    }
    if (high.length > 0) {
      parts.push(`${high.length} high (null checks, array bounds)`);
    }
    if (medium.length > 0) {
      parts.push(`${medium.length} medium (off-by-one, type errors)`);
    }
    if (low.length > 0) {
      parts.push(`${low.length} low (missing validations)`);
    }

    return parts.join(', ');
  }
}

