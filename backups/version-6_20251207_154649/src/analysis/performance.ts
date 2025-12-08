/**
 * Performance Analysis
 * Identifies performance bottlenecks, N+1 queries, inefficient loops, memory leaks
 */

import { CodeSymbol } from '../parser/types.js';

export interface PerformanceIssue {
  type: string;
  location: string;
  file: string;
  line?: number;
  method?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface CachingOpportunity {
  method: string;
  file: string;
  reason: string;
  suggestion: string;
}

export interface PerformanceReport {
  issues: PerformanceIssue[];
  cachingOpportunities: CachingOpportunity[];
  nPlusOneQueries: PerformanceIssue[];
  inefficientLoops: PerformanceIssue[];
  memoryLeaks: PerformanceIssue[];
}

export class PerformanceAnalyzer {
  /**
   * Analyze code for performance issues
   */
  analyzePerformance(symbols: CodeSymbol[], codeContent: string, filepath?: string): PerformanceReport {
    const issues: PerformanceIssue[] = [];
    const cachingOpportunities: CachingOpportunity[] = [];
    const nPlusOneQueries: PerformanceIssue[] = [];
    const inefficientLoops: PerformanceIssue[] = [];
    const memoryLeaks: PerformanceIssue[] = [];

    const language = this.detectLanguage(filepath || '');

    // Analyze each symbol
    for (const symbol of symbols) {
      if (symbol.type === 'method' && symbol.code) {
        const methodCode = symbol.code.toLowerCase();
        const methodLines = symbol.code.split('\n');

        // 1. Detect N+1 Query Problems (language-aware)
        const nPlusOneIssues = this.detectNPlusOneQueries(symbol, methodCode, methodLines, language);
        nPlusOneQueries.push(...nPlusOneIssues);
        issues.push(...nPlusOneIssues);

        // 2. Detect Inefficient Loops (language-aware)
        const loopIssues = this.detectInefficientLoops(symbol, methodCode, methodLines, language);
        inefficientLoops.push(...loopIssues);
        issues.push(...loopIssues);

        // 3. Detect Memory Leaks
        const memoryIssues = this.detectMemoryLeaks(symbol, methodCode, methodLines);
        memoryLeaks.push(...memoryIssues);
        issues.push(...memoryIssues);

        // 4. Identify Caching Opportunities
        const caching = this.identifyCachingOpportunities(symbol, methodCode);
        cachingOpportunities.push(...caching);
      }
    }

    return {
      issues,
      cachingOpportunities,
      nPlusOneQueries,
      inefficientLoops,
      memoryLeaks,
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
   * Detect N+1 query problems (language-aware)
   */
  private detectNPlusOneQueries(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[],
    language: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Pattern: Loop with database query inside
    const hasLoop = /for\s*\(|while\s*\(|\.forEach\s*\(|\.stream\(\)\.forEach|\.map\s*\(/.test(methodCode);
    
    // Language-specific query patterns
    let hasQuery = false;
    if (language === 'java' || language === 'unknown') {
      hasQuery = /\.findById|\.findOne|\.getById|\.query\(|\.executeQuery|entitymanager|jparepository/i.test(methodCode);
    } else if (language === 'typescript' || language === 'javascript') {
      // TypeScript/JavaScript patterns: fetch, axios, database clients
      hasQuery = /fetch\s*\(|axios\.(get|post|put|delete)|\.query\(|\.findOne\(|\.findById\(|\.find\(|db\.query|prisma\.|typeorm/i.test(methodCode);
    } else if (language === 'python') {
      hasQuery = /\.get\(|\.filter\(|\.query\(|session\.query|db\.query/i.test(methodCode);
    }

    if (hasLoop && hasQuery) {
      // Check if query is inside loop
      let inLoop = false;
      let loopStartLine = 0;

      for (let i = 0; i < methodLines.length; i++) {
        const line = methodLines[i].toLowerCase();
        
        if (/for\s*\(|while\s*\(|\.forEach\s*\(|\.stream\(\)\.forEach/.test(line)) {
          inLoop = true;
          loopStartLine = i + 1;
        }
        
        // Check for query inside loop (language-specific)
        let queryInLoop = false;
        if (language === 'java' || language === 'unknown') {
          queryInLoop = /\.findById|\.findOne|\.getById|\.query\(|\.executeQuery|entitymanager|jparepository/i.test(line);
        } else if (language === 'typescript' || language === 'javascript') {
          queryInLoop = /fetch\s*\(|axios\.(get|post|put|delete)|\.query\(|\.findOne\(|\.findById\(|\.find\(|await\s+.*\.get\(|await\s+.*\.post\(/i.test(line);
        } else if (language === 'python') {
          queryInLoop = /\.get\(|\.filter\(|\.query\(|session\.query|db\.query/i.test(line);
        }

        if (inLoop && queryInLoop) {
          const suggestion = language === 'typescript' || language === 'javascript'
            ? 'Use Promise.all() to batch queries, or fetch all data before loop'
            : language === 'python'
            ? 'Use bulk queries or fetch all data before loop'
            : 'Use JOIN FETCH, batch loading, or fetch all data before loop';
          
          issues.push({
            type: 'N+1 Query Problem',
            location: `${symbol.file}:${symbol.startLine + i}`,
            file: symbol.file,
            line: symbol.startLine + i,
            method: symbol.name,
            severity: 'high',
            message: 'Database query inside loop - potential N+1 query problem',
            suggestion,
          });
        }
        
        if (/\}/.test(line) && inLoop) {
          inLoop = false;
        }
      }
    }

    return issues;
  }

  /**
   * Detect inefficient loops (language-aware)
   */
  private detectInefficientLoops(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[],
    language: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Pattern 1: Nested loops (O(n²) or worse)
    const nestedLoopPattern = /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{|for\s*\([^)]*\)\s*\{[^}]*\.forEach\s*\([^}]*\.forEach|\.forEach\s*\([^}]*\.forEach/;
    if (nestedLoopPattern.test(methodCode)) {
      const suggestion = language === 'typescript' || language === 'javascript'
        ? 'Consider using Map/Set for lookups, or optimize algorithm to reduce complexity'
        : language === 'python'
        ? 'Consider using dictionary/set for lookups, or optimize algorithm'
        : 'Consider using Stream API, Map/Set for lookups, or optimize algorithm';
      
      issues.push({
        type: 'Inefficient Loop',
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        severity: 'medium',
        message: 'Nested loops detected - O(n²) complexity',
        suggestion,
      });
    }

    // Pattern 2: Manual loops that could use array methods (TypeScript/JavaScript) or Stream API (Java)
    if (language === 'typescript' || language === 'javascript') {
      const manualLoopPattern = /for\s*\([^)]*\)\s*\{[^}]*\.push\(|for\s*\([^)]*\)\s*\{[^}]*array\[/;
      if (manualLoopPattern.test(methodCode) && !/\.map\(|\.filter\(|\.reduce\(/.test(methodCode)) {
        issues.push({
          type: 'Inefficient Loop',
          location: `${symbol.file}:${symbol.startLine}`,
          file: symbol.file,
          line: symbol.startLine,
          method: symbol.name,
          severity: 'low',
          message: 'Manual loop could use array methods for better readability and performance',
          suggestion: 'Use array methods: array.map(), array.filter(), array.reduce()',
        });
      }
    } else if (language === 'java' || language === 'unknown') {
      const manualLoopPattern = /for\s*\([^)]*\)\s*\{[^}]*\.add\(|\.put\(|\.set\(/;
      if (manualLoopPattern.test(methodCode) && !/\.stream\(\)/.test(methodCode)) {
        issues.push({
          type: 'Inefficient Loop',
          location: `${symbol.file}:${symbol.startLine}`,
          file: symbol.file,
          line: symbol.startLine,
          method: symbol.name,
          severity: 'low',
          message: 'Manual loop could use Stream API for better performance',
          suggestion: 'Use Stream API: list.stream().map().collect(Collectors.toList())',
        });
      }
    }

    // Pattern 3: String concatenation in loop (language-aware)
    if (/for\s*\(|while\s*\(|\.forEach\s*\(/.test(methodCode)) {
      let hasStringConcat = false;
      let suggestion = '';
      
      if (language === 'typescript' || language === 'javascript') {
        // TypeScript/JavaScript: += or + in loop
        hasStringConcat = /\+=\s*["']|result\s*\+=\s*|str\s*\+=\s*|\.concat\(/.test(methodCode);
        suggestion = 'Use array.join() or template literals with array methods for better performance';
      } else if (language === 'java' || language === 'unknown') {
        // Java: += with String
        hasStringConcat = /\+=\s*["']|\.concat\(/.test(methodCode);
        suggestion = 'Use StringBuilder or String.join() for better performance';
      } else if (language === 'python') {
        // Python: += in loop
        hasStringConcat = /\+\s*=|\.join\(/.test(methodCode) && !/\.join\(/.test(methodCode);
        suggestion = 'Use str.join() for better performance';
      }
      
      if (hasStringConcat) {
        issues.push({
          type: 'Inefficient Loop',
          location: `${symbol.file}:${symbol.startLine}`,
          file: symbol.file,
          line: symbol.startLine,
          method: symbol.name,
          severity: 'medium',
          message: 'String concatenation in loop - creates many temporary objects (O(n²) complexity)',
          suggestion,
        });
      }
    }

    return issues;
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeaks(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Pattern 1: Unclosed resources
    const resourcePatterns = [
      /new\s+FileInputStream|new\s+FileOutputStream|new\s+BufferedReader|new\s+Scanner/,
      /new\s+Connection|\.getConnection\(/,
      /new\s+Statement|\.createStatement\(/,
    ];

    for (let i = 0; i < methodLines.length; i++) {
      const line = methodLines[i];
      
      for (const pattern of resourcePatterns) {
        if (pattern.test(line.toLowerCase())) {
          // Check if try-with-resources is used
          const hasTryWithResources = /try\s*\(/.test(methodCode);
          
          if (!hasTryWithResources) {
            // Check if resource is closed
            const resourceVar = this.extractVariableName(line);
            const isClosed = resourceVar && new RegExp(`${resourceVar}\\.close\\(|try\\s*\\(.*${resourceVar}`).test(methodCode);
            
            if (!isClosed) {
              issues.push({
                type: 'Memory Leak',
                location: `${symbol.file}:${symbol.startLine + i}`,
                file: symbol.file,
                line: symbol.startLine + i,
                method: symbol.name,
                severity: 'high',
                message: 'Resource may not be closed - potential memory leak',
                suggestion: 'Use try-with-resources: try (Resource r = new Resource()) { ... }',
              });
            }
          }
        }
      }
    }

    // Pattern 2: Static collections that grow
    if (/static\s+(List|Map|Set|Collection)\s+\w+\s*=/.test(methodCode)) {
      issues.push({
        type: 'Memory Leak',
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        severity: 'medium',
        message: 'Static collection may grow unbounded',
        suggestion: 'Add size limits or use WeakReference collections',
      });
    }

    return issues;
  }

  /**
   * Identify caching opportunities
   */
  private identifyCachingOpportunities(
    symbol: CodeSymbol,
    methodCode: string
  ): CachingOpportunity[] {
    const opportunities: CachingOpportunity[] = [];

    // Pattern: Methods that fetch data by ID (good candidates for caching)
    if (/findById|getById|findOne|getOne|findBy.*Id/.test(methodCode)) {
      opportunities.push({
        method: symbol.name,
        file: symbol.file,
        reason: 'Fetches data by ID - frequently called with same parameters',
        suggestion: 'Consider adding caching layer (Spring Cache, Caffeine, etc.)',
      });
    }

    // Pattern: Methods that perform expensive calculations
    if (/calculate|compute|process|generate|build/.test(symbol.name.toLowerCase()) && 
        methodCode.length > 200) {
      opportunities.push({
        method: symbol.name,
        file: symbol.file,
        reason: 'Performs expensive computation',
        suggestion: 'Cache results if inputs are deterministic',
      });
    }

    return opportunities;
  }

  /**
   * Extract variable name from assignment
   */
  private extractVariableName(line: string): string | null {
    const match = line.match(/(\w+)\s*=\s*new\s+/);
    return match ? match[1] : null;
  }
}







