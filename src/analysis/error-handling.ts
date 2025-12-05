/**
 * Error Handling Analysis
 * Reviews error handling patterns, exception handling, recovery mechanisms
 */

import { CodeSymbol } from '../parser/types.js';

export interface ErrorHandlingIssue {
  location: string;
  file: string;
  line?: number;
  method?: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface ErrorHandlingReport {
  issues: ErrorHandlingIssue[];
  swallowedExceptions: ErrorHandlingIssue[];
  genericCatches: ErrorHandlingIssue[];
  missingErrorHandling: ErrorHandlingIssue[];
  inconsistentErrorHandling: ErrorHandlingIssue[];
}

export class ErrorHandlingAnalyzer {
  /**
   * Analyze error handling patterns
   */
  analyzeErrorHandling(symbols: CodeSymbol[], codeContent: string): ErrorHandlingReport {
    const issues: ErrorHandlingIssue[] = [];
    const swallowedExceptions: ErrorHandlingIssue[] = [];
    const genericCatches: ErrorHandlingIssue[] = [];
    const missingErrorHandling: ErrorHandlingIssue[] = [];
    const inconsistentErrorHandling: ErrorHandlingIssue[] = [];

    const lines = codeContent.split('\n');

    for (const symbol of symbols) {
      if (symbol.type === 'method' && symbol.code) {
        const methodCode = symbol.code;
        const methodLines = methodCode.split('\n');

        // 1. Detect swallowed exceptions
        const swallowed = this.detectSwallowedExceptions(symbol, methodCode, methodLines);
        swallowedExceptions.push(...swallowed);
        issues.push(...swallowed);

        // 2. Detect generic Exception catches
        const generic = this.detectGenericCatches(symbol, methodCode, methodLines);
        genericCatches.push(...generic);
        issues.push(...generic);

        // 3. Detect missing error handling
        const missing = this.detectMissingErrorHandling(symbol, methodCode, methodLines);
        missingErrorHandling.push(...missing);
        issues.push(...missing);
      }
    }

    // 4. Check for inconsistent error handling patterns
    const inconsistent = this.detectInconsistentErrorHandling(symbols, codeContent);
    inconsistentErrorHandling.push(...inconsistent);
    issues.push(...inconsistent);

    return {
      issues,
      swallowedExceptions,
      genericCatches,
      missingErrorHandling,
      inconsistentErrorHandling,
    };
  }

  /**
   * Detect swallowed exceptions (empty catch blocks)
   */
  private detectSwallowedExceptions(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): ErrorHandlingIssue[] {
    const issues: ErrorHandlingIssue[] = [];

    // Pattern: catch block with only comments or empty
    const catchPattern = /catch\s*\([^)]+\)\s*\{[\s\n]*\}/;
    if (catchPattern.test(methodCode)) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'Swallowed exception - empty catch block',
        severity: 'high',
        suggestion: 'Log the exception or rethrow it. Empty catch blocks hide errors.',
      });
    }

    // Pattern: catch block that only prints to console
    const consoleCatchPattern = /catch\s*\([^)]+\)\s*\{[^}]*System\.out\.print|System\.err\.print/;
    if (consoleCatchPattern.test(methodCode) && !/logger\.|log\.|Log\./.test(methodCode)) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'Exception only printed to console - not logged',
        severity: 'medium',
        suggestion: 'Use proper logging framework instead of System.out.println',
      });
    }

    return issues;
  }

  /**
   * Detect generic Exception catches
   */
  private detectGenericCatches(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): ErrorHandlingIssue[] {
    const issues: ErrorHandlingIssue[] = [];

    // Pattern: catch (Exception e) or catch (Throwable e)
    const genericCatchPattern = /catch\s*\(\s*(Exception|Throwable|RuntimeException)\s+\w+\s*\)/;
    if (genericCatchPattern.test(methodCode)) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'Generic exception catch - catches too broad',
        severity: 'medium',
        suggestion: 'Catch specific exceptions (IOException, SQLException, etc.) for better error handling',
      });
    }

    return issues;
  }

  /**
   * Detect missing error handling
   */
  private detectMissingErrorHandling(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): ErrorHandlingIssue[] {
    const issues: ErrorHandlingIssue[] = [];

    // Pattern: File I/O without try-catch
    const fileIOPattern = /new\s+FileInputStream|new\s+FileOutputStream|Files\.(read|write)/;
    if (fileIOPattern.test(methodCode) && !/try\s*\{/.test(methodCode)) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'File I/O operations without error handling',
        severity: 'high',
        suggestion: 'Wrap file operations in try-catch or use try-with-resources',
      });
    }

    // Pattern: Database operations without error handling
    const dbPattern = /executeQuery|executeUpdate|\.save\(|\.delete\(|\.findById/;
    if (dbPattern.test(methodCode) && !/try\s*\{/.test(methodCode)) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'Database operations without error handling',
        severity: 'high',
        suggestion: 'Add try-catch for database exceptions (SQLException, DataAccessException)',
      });
    }

    // Pattern: Network operations without error handling
    const networkPattern = /HttpClient|URLConnection|\.get\(|\.post\(/;
    if (networkPattern.test(methodCode) && !/try\s*\{/.test(methodCode)) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'Network operations without error handling',
        severity: 'high',
        suggestion: 'Add try-catch for network exceptions (IOException, HttpException)',
      });
    }

    return issues;
  }

  /**
   * Detect inconsistent error handling patterns
   */
  private detectInconsistentErrorHandling(
    symbols: CodeSymbol[],
    codeContent: string
  ): ErrorHandlingIssue[] {
    const issues: ErrorHandlingIssue[] = [];

    // Check if some methods use try-catch and others don't for similar operations
    const methodsWithErrorHandling: string[] = [];
    const methodsWithoutErrorHandling: string[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'method' && symbol.code) {
        const hasTryCatch = /try\s*\{/.test(symbol.code);
        const hasFileIO = /new\s+FileInputStream|new\s+FileOutputStream|Files\.(read|write)/.test(symbol.code);
        
        if (hasFileIO) {
          if (hasTryCatch) {
            methodsWithErrorHandling.push(symbol.name);
          } else {
            methodsWithoutErrorHandling.push(symbol.name);
          }
        }
      }
    }

    if (methodsWithErrorHandling.length > 0 && methodsWithoutErrorHandling.length > 0) {
      issues.push({
        location: 'Multiple methods',
        file: symbols[0]?.file || 'unknown',
        issue: 'Inconsistent error handling - some methods handle errors, others don\'t',
        severity: 'medium',
        suggestion: 'Standardize error handling approach across similar operations',
      });
    }

    return issues;
  }
}




