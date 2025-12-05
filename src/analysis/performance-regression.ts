/**
 * Performance Regression Detection
 * Detects performance regressions before merge
 */

import { CodeSymbol } from '../parser/types.js';

export interface PerformanceRegression {
  file: string;
  method: string;
  line: number;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  impact: string;
  beforeComplexity: number;
  afterComplexity: number;
  estimatedSlowdown: string;
  suggestion: string;
}

export interface PerformanceAnalysis {
  regressions: PerformanceRegression[];
  improvements: PerformanceRegression[];
  overallImpact: 'improved' | 'degraded' | 'neutral';
  estimatedImpact: string;
}

export class PerformanceRegressionDetector {
  /**
   * Detect performance regressions in PR
   */
  detectRegressions(changedSymbols: CodeSymbol[]): PerformanceAnalysis {
    const regressions: PerformanceRegression[] = [];
    const improvements: PerformanceRegression[] = [];

    for (const symbol of changedSymbols) {
      if (symbol.type === 'method' || symbol.type === 'function') {
        // Analyze complexity changes
        const complexity = this.calculateComplexity(symbol);
        const previousComplexity = this.estimatePreviousComplexity(symbol);

        if (complexity > previousComplexity * 1.5) {
          // Significant complexity increase
          regressions.push({
            file: symbol.file,
            method: symbol.name,
            line: symbol.startLine,
            issue: 'Complexity increased significantly',
            severity: complexity > previousComplexity * 2 ? 'high' : 'medium',
            impact: `Complexity increased from ~${previousComplexity} to ${complexity}`,
            beforeComplexity: previousComplexity,
            afterComplexity: complexity,
            estimatedSlowdown: this.estimateSlowdown(complexity, previousComplexity),
            suggestion: 'Consider refactoring to reduce complexity',
          });
        } else if (complexity < previousComplexity * 0.7) {
          // Complexity decreased (improvement)
          improvements.push({
            file: symbol.file,
            method: symbol.name,
            line: symbol.startLine,
            issue: 'Complexity decreased',
            severity: 'low',
            impact: `Complexity reduced from ~${previousComplexity} to ${complexity}`,
            beforeComplexity: previousComplexity,
            afterComplexity: complexity,
            estimatedSlowdown: 'Performance improved',
            suggestion: 'Good optimization',
          });
        }

        // Check for common performance issues
        const performanceIssues = this.detectPerformanceIssues(symbol);
        regressions.push(...performanceIssues);
      }
    }

    // Determine overall impact
    const overallImpact = this.determineOverallImpact(regressions, improvements);
    const estimatedImpact = this.estimateOverallImpact(regressions, improvements);

    return {
      regressions,
      improvements,
      overallImpact,
      estimatedImpact,
    };
  }

  /**
   * Calculate complexity of a method
   */
  private calculateComplexity(symbol: CodeSymbol): number {
    if (!symbol.code) return 1;

    let complexity = 1; // Base complexity

    // Count decision points
    const decisionPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcatch\s*\(/g,
    ];

    for (const pattern of decisionPatterns) {
      const matches = symbol.code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    // Count nested structures
    const nesting = (symbol.code.match(/\{/g) || []).length;
    complexity += Math.max(0, nesting - 1);

    return complexity;
  }

  /**
   * Estimate previous complexity (heuristic)
   */
  private estimatePreviousComplexity(symbol: CodeSymbol): number {
    // Assume previous complexity was lower (conservative estimate)
    const current = this.calculateComplexity(symbol);
    return Math.max(1, current * 0.8); // Assume 20% increase
  }

  /**
   * Estimate performance slowdown
   */
  private estimateSlowdown(newComplexity: number, oldComplexity: number): string {
    const ratio = newComplexity / oldComplexity;
    
    if (ratio > 3) return 'Significant slowdown expected (3x+)';
    if (ratio > 2) return 'Moderate slowdown expected (2x+)';
    if (ratio > 1.5) return 'Minor slowdown expected (1.5x+)';
    return 'Minimal impact';
  }

  /**
   * Detect common performance issues
   */
  private detectPerformanceIssues(symbol: CodeSymbol): PerformanceRegression[] {
    const issues: PerformanceRegression[] = [];

    if (!symbol.code) return issues;

    // N+1 query pattern
    if (symbol.code.includes('for') && symbol.code.includes('findById') || symbol.code.includes('getById')) {
      issues.push({
        file: symbol.file,
        method: symbol.name,
        line: symbol.startLine,
        issue: 'Potential N+1 query problem',
        severity: 'high',
        impact: 'May cause significant database load',
        beforeComplexity: 0,
        afterComplexity: 0,
        estimatedSlowdown: 'High - database queries in loop',
        suggestion: 'Use batch queries or eager loading',
      });
    }

    // String concatenation in loop
    if (symbol.code.includes('for') && symbol.code.includes('+=') && symbol.code.includes('String')) {
      issues.push({
        file: symbol.file,
        method: symbol.name,
        line: symbol.startLine,
        issue: 'String concatenation in loop',
        severity: 'medium',
        impact: 'O(n²) string operations',
        beforeComplexity: 0,
        afterComplexity: 0,
        estimatedSlowdown: 'Moderate - use StringBuilder',
        suggestion: 'Use StringBuilder for string concatenation in loops',
      });
    }

    // Unnecessary object creation
    if ((symbol.code.match(/new\s+\w+\(/g) || []).length > 5) {
      issues.push({
        file: symbol.file,
        method: symbol.name,
        line: symbol.startLine,
        issue: 'Excessive object creation',
        severity: 'medium',
        impact: 'Increased memory allocation',
        beforeComplexity: 0,
        afterComplexity: 0,
        estimatedSlowdown: 'Moderate - consider object pooling',
        suggestion: 'Consider reusing objects or using object pools',
      });
    }

    return issues;
  }

  /**
   * Determine overall impact
   */
  private determineOverallImpact(
    regressions: PerformanceRegression[],
    improvements: PerformanceRegression[]
  ): 'improved' | 'degraded' | 'neutral' {
    const highRegressions = regressions.filter(r => r.severity === 'high').length;
    const highImprovements = improvements.filter(i => i.severity === 'high').length;

    if (highRegressions > highImprovements) return 'degraded';
    if (highImprovements > highRegressions) return 'improved';
    return 'neutral';
  }

  /**
   * Estimate overall impact
   */
  private estimateOverallImpact(
    regressions: PerformanceRegression[],
    improvements: PerformanceRegression[]
  ): string {
    const totalRegressions = regressions.length;
    const totalImprovements = improvements.length;

    if (totalRegressions === 0 && totalImprovements === 0) {
      return 'No significant performance impact detected';
    }

    if (totalRegressions > totalImprovements * 2) {
      return `⚠️ Performance degradation likely: ${totalRegressions} regression(s) found`;
    }

    if (totalImprovements > totalRegressions * 2) {
      return `✅ Performance improvement: ${totalImprovements} optimization(s) found`;
    }

    return `Mixed impact: ${totalRegressions} regression(s), ${totalImprovements} improvement(s)`;
  }
}

