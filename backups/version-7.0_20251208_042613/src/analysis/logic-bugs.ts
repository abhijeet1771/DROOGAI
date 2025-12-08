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
              // Check if there's a null check BEFORE this line OR ON THE SAME LINE
              const codeBeforeLine = methodLines.slice(0, i).join('\n');
              const codeUpToLine = methodLines.slice(0, i + 1).join('\n'); // Include current line
              const nullCheckPattern = new RegExp(
                `(${paramName}\\s*==\\s*null|${paramName}\\s*!=\\s*null|Objects\\.isNull\\(${paramName}\\)|Objects\\.nonNull\\(${paramName}\\)|${paramName}\\s*!=\\s*null\\s*&&|${paramName}\\s*==\\s*null\\s*\\?|${paramName}\\s*\\?\\?|${paramName}\\s*\\|\\s*\\w+)`,
                'i'
              );
              
              // Check both before line AND same line (for inline null checks)
              if (!nullCheckPattern.test(codeUpToLine)) {
                bugs.push({
                  type: 'null_check',
                  location: `${symbol.file}:${lineNumber}`,
                  file: symbol.file,
                  line: lineNumber,
                  method: symbol.name,
                  severity: 'high',
                  message: `I noticed you're using '${paramName}' without checking if it's null first. If it's null, your app will crash with a NullPointerException.`,
                  suggestion: `if (${paramName} == null) {\n  throw new IllegalArgumentException("${paramName} cannot be null");\n}\n// Then use ${paramName} here`,
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
              // Check if there's a null/undefined check BEFORE this line OR ON THE SAME LINE
              const codeBeforeLine = methodLines.slice(0, i).join('\n');
              const codeUpToLine = methodLines.slice(0, i + 1).join('\n'); // Include current line
              const nullCheckPattern = new RegExp(
                `(${paramName}\\s*===\\s*null|${paramName}\\s*===\\s*undefined|${paramName}\\s*!==\\s*null|${paramName}\\s*!==\\s*undefined|!${paramName}|typeof\\s+${paramName}|${paramName}\\s*!==\\s*null\\s*&&|${paramName}\\s*===\\s*null\\s*\\?|${paramName}\\s*\\?\\?|${paramName}\\s*\\|\\s*\\w+)`,
                'i'
              );
              
              // Check both before line AND same line (for inline null checks like "token !== null && token.length")
              if (!nullCheckPattern.test(codeUpToLine)) {
                bugs.push({
                  type: 'null_check',
                  location: `${symbol.file}:${lineNumber}`,
                  file: symbol.file,
                  line: lineNumber,
                  method: symbol.name,
                  severity: 'high',
                  message: `I noticed you're accessing '${paramName}' without checking if it's null or undefined. This will throw a TypeError if it's empty.`,
                  suggestion: `if (!${paramName}) {\n  throw new Error("${paramName} is required");\n}\n// Or use optional chaining:\n// ${paramName}?.method()`,
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
      const trimmedLine = line.trim();

      // Skip comments (single-line and multi-line) - more robust check
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*') || 
          line.includes('//') && line.indexOf('//') < line.indexOf('/')) {
        continue;
      }

      // Skip string literals - check if line contains strings
      if (this.isStringLiteral(trimmedLine)) {
        continue;
      }

      // Pattern: Division or modulo - improved to exclude comments and strings
      // Match actual division operations: variable / variable or variable / constant
      // IMPORTANT: Don't match if `/` is part of `//` or `/*` comment
      const divisionPattern = /\/(\s*)(\w+|\d+\.?\d*)|%(\s*)(\w+|\d+\.?\d*)/g;
      let match;
      
      while ((match = divisionPattern.exec(line)) !== null) {
        const matchIndex = match.index || 0;
        const divisor = match[2] || match[4]; // Get the divisor (variable or constant)
        if (!divisor) {
          continue;
        }

        // CRITICAL: Check if this `/` is part of a comment (`//` or `/*`)
        // Check the character immediately before the `/`
        const charBefore = matchIndex > 0 ? line[matchIndex - 1] : '';
        if (charBefore === '/' || charBefore === '*') {
          // This `/` is part of `//` or `/*` comment, skip it
          continue;
        }
        
        // Also check if there's an active comment before this position
        const beforeMatch = line.substring(0, matchIndex);
        const lastSingleLineComment = beforeMatch.lastIndexOf('//');
        const lastMultiLineCommentStart = beforeMatch.lastIndexOf('/*');
        const lastMultiLineCommentEnd = beforeMatch.lastIndexOf('*/');
        
        // Check for single-line comment
        if (lastSingleLineComment >= 0) {
          // Everything after `//` is a comment
          continue;
        }
        
        // Check for multi-line comment
        if (lastMultiLineCommentStart >= 0) {
          // If there's no closing `*/` after the start, or the closing is before the start, comment is active
          if (lastMultiLineCommentEnd < lastMultiLineCommentStart) {
            // Comment is still active (not closed), skip
            continue;
          }
        }

        // Check if this is inside a string literal
        if (this.isInStringLiteral(line, matchIndex)) {
          continue;
        }

        // Skip if divisor is zero (already handled)
        if (divisor === '0' || divisor === '0.0' || divisor === '0.00') {
          continue;
        }

        // Check if divisor is a numeric constant (not zero) - skip these
        if (/^\d+\.?\d*$/.test(divisor)) {
          // It's a numeric constant like 100, 2, 3.14, etc. - not zero, so skip
          continue;
        }

        // Skip if divisor looks like a comment word (e.g., "Generic" from "// Generic catch")
        // Check if the division operator is actually part of code, not a comment
        const afterMatch = line.substring(matchIndex);
        if (afterMatch.trim().startsWith('//') || afterMatch.trim().startsWith('/*')) {
          continue;
        }

        // Check if divisor is in a string literal
        if (this.isInStringLiteral(line, match.index || 0)) {
          continue;
        }

        // Check if there's a zero check before this line OR on the same line
        const codeBeforeLine = methodLines.slice(0, i).join('\n');
        const codeUpToLine = methodLines.slice(0, i + 1).join('\n');
        const zeroCheckPattern = new RegExp(
          `(${divisor}\\s*[!=]==\\s*0|${divisor}\\s*[!=]==\\s*0\\.0|Math\\.abs\\(${divisor}\\)\\s*<\\s*0\\.0001|${divisor}\\s*!==\\s*0|${divisor}\\s*===\\s*0)`,
          'i'
        );
        
        // Check both before line and same line
        if (!zeroCheckPattern.test(codeUpToLine)) {
          // Only report if divisor is actually a variable (not a constant, not a comment word)
          // Additional validation: divisor should be a valid identifier
          if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(divisor)) {
            bugs.push({
              type: 'division_by_zero',
              location: `${symbol.file}:${lineNumber}`,
              file: symbol.file,
              line: lineNumber,
              method: symbol.name,
              severity: 'critical',
              message: `Dividing by '${divisor}' without checking if it's zero first. This could crash your app if ${divisor} is 0.`,
              suggestion: `if (${divisor} === 0) {\n  throw new Error("Cannot divide by zero");\n}\n// Then your division code here`,
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
   * Check if line is a string literal
   */
  private isStringLiteral(line: string): boolean {
    // Check if entire line is a string (starts and ends with quotes)
    const stringPattern = /^['"`].*['"`]\s*;?\s*$/;
    return stringPattern.test(line.trim());
  }

  /**
   * Check if position in line is inside a string literal
   */
  private isInStringLiteral(line: string, position: number): boolean {
    // Simple check: count quotes before position
    const beforePosition = line.substring(0, position);
    const singleQuotes = (beforePosition.match(/'/g) || []).length;
    const doubleQuotes = (beforePosition.match(/"/g) || []).length;
    const backticks = (beforePosition.match(/`/g) || []).length;
    
    // If odd number of quotes, we're inside a string
    return (singleQuotes % 2 !== 0) || (doubleQuotes % 2 !== 0) || (backticks % 2 !== 0);
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

