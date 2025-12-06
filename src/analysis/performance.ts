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
  analyzePerformance(symbols: CodeSymbol[], codeContent: string): PerformanceReport {
    const issues: PerformanceIssue[] = [];
    const cachingOpportunities: CachingOpportunity[] = [];
    const nPlusOneQueries: PerformanceIssue[] = [];
    const inefficientLoops: PerformanceIssue[] = [];
    const memoryLeaks: PerformanceIssue[] = [];

    // Analyze each symbol
    for (const symbol of symbols) {
      if (symbol.type === 'method' && symbol.code) {
        const methodCode = symbol.code.toLowerCase();
        const methodLines = symbol.code.split('\n');

        // 1. Detect N+1 Query Problems
        const nPlusOneIssues = this.detectNPlusOneQueries(symbol, methodCode, methodLines);
        nPlusOneQueries.push(...nPlusOneIssues);
        issues.push(...nPlusOneIssues);

        // 2. Detect Inefficient Loops
        const loopIssues = this.detectInefficientLoops(symbol, methodCode, methodLines);
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
   * Detect N+1 query problems
   */
  private detectNPlusOneQueries(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Pattern: Loop with database query inside
    const hasLoop = /for\s*\(|while\s*\(|\.forEach\s*\(|\.stream\(\)\.forEach/.test(methodCode);
    const hasQuery = /\.findById|\.findOne|\.getById|\.query\(|\.executeQuery|entitymanager|jparepository/i.test(methodCode);

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
        
        if (inLoop && /\.findById|\.findOne|\.getById|\.query\(|\.executeQuery|entitymanager|jparepository/i.test(line)) {
          issues.push({
            type: 'N+1 Query Problem',
            location: `${symbol.file}:${symbol.startLine + i}`,
            file: symbol.file,
            line: symbol.startLine + i,
            method: symbol.name,
            severity: 'high',
            message: 'Database query inside loop - potential N+1 query problem',
            suggestion: 'Use JOIN FETCH, batch loading, or fetch all data before loop',
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
   * Detect inefficient loops
   */
  private detectInefficientLoops(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Pattern 1: Nested loops (O(n²) or worse)
    const nestedLoopPattern = /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{/;
    if (nestedLoopPattern.test(methodCode)) {
      issues.push({
        type: 'Inefficient Loop',
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        severity: 'medium',
        message: 'Nested loops detected - O(n²) complexity',
        suggestion: 'Consider using Stream API, Map/Set for lookups, or optimize algorithm',
      });
    }

    // Pattern 2: Manual loops that could use Stream API
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

    // Pattern 3: String concatenation in loop
    if (/for\s*\(|while\s*\(/.test(methodCode) && /\+=\s*["']|\.concat\(/.test(methodCode)) {
      issues.push({
        type: 'Inefficient Loop',
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        severity: 'medium',
        message: 'String concatenation in loop - creates many temporary objects',
        suggestion: 'Use StringBuilder or String.join() for better performance',
      });
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







