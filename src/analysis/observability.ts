/**
 * Observability & Logging Analysis
 * Reviews logging strategy, metrics collection, distributed tracing
 */

import { CodeSymbol } from '../parser/types.js';

export interface ObservabilityIssue {
  location: string;
  file: string;
  line?: number;
  method?: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface ObservabilityReport {
  issues: ObservabilityIssue[];
  loggingIssues: ObservabilityIssue[];
  metricsIssues: ObservabilityIssue[];
  tracingIssues: ObservabilityIssue[];
  missingErrorLogging: ObservabilityIssue[];
  missingInfoLogging: ObservabilityIssue[];
}

export class ObservabilityAnalyzer {
  /**
   * Analyze observability and logging
   */
  analyzeObservability(symbols: CodeSymbol[], codeContent: string): ObservabilityReport {
    const issues: ObservabilityIssue[] = [];
    const loggingIssues: ObservabilityIssue[] = [];
    const metricsIssues: ObservabilityIssue[] = [];
    const tracingIssues: ObservabilityIssue[] = [];
    const missingErrorLogging: ObservabilityIssue[] = [];
    const missingInfoLogging: ObservabilityIssue[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'method' && symbol.code) {
        const methodCode = symbol.code.toLowerCase();
        const methodLines = symbol.code.split('\n');

        // 1. Check for missing error logging
        const errorLogging = this.checkErrorLogging(symbol, methodCode, methodLines);
        missingErrorLogging.push(...errorLogging);
        loggingIssues.push(...errorLogging);
        issues.push(...errorLogging);

        // 2. Check for missing info logging in critical methods
        const infoLogging = this.checkInfoLogging(symbol, methodCode, methodLines);
        missingInfoLogging.push(...infoLogging);
        loggingIssues.push(...infoLogging);
        issues.push(...infoLogging);

        // 3. Check for metrics collection
        const metrics = this.checkMetrics(symbol, methodCode, methodLines);
        metricsIssues.push(...metrics);
        issues.push(...metrics);

        // 4. Check for distributed tracing
        const tracing = this.checkTracing(symbol, methodCode, methodLines);
        tracingIssues.push(...tracing);
        issues.push(...tracing);
      }
    }

    return {
      issues,
      loggingIssues,
      metricsIssues,
      tracingIssues,
      missingErrorLogging,
      missingInfoLogging,
    };
  }

  /**
   * Check for error logging in catch blocks
   */
  private checkErrorLogging(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): ObservabilityIssue[] {
    const issues: ObservabilityIssue[] = [];

    // Check if method has catch blocks
    if (/catch\s*\(/.test(methodCode)) {
      // Check if catch blocks have logging
      const hasLogging = /logger\.(error|warn|debug)|log\.(error|warn|debug)|Log\.(error|warn|debug)/.test(methodCode);
      
      if (!hasLogging) {
        issues.push({
          location: `${symbol.file}:${symbol.startLine}`,
          file: symbol.file,
          line: symbol.startLine,
          method: symbol.name,
          issue: 'Catch block missing error logging',
          severity: 'high',
          suggestion: 'Add error logging in catch block with exception details and context',
        });
      }
    }

    // Check for error conditions without logging
    if (/throw\s+new\s+\w*Exception/.test(methodCode) && 
        !/logger\.(error|warn)|log\.(error|warn)/.test(methodCode)) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'Exception thrown without logging',
        severity: 'medium',
        suggestion: 'Log error before throwing exception for better observability',
      });
    }

    return issues;
  }

  /**
   * Check for info logging in critical methods
   */
  private checkInfoLogging(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): ObservabilityIssue[] {
    const issues: ObservabilityIssue[] = [];

    // Critical methods that should have logging
    const isCriticalMethod = /delete|remove|update|create|save|process|execute/.test(symbol.name.toLowerCase());
    const isPublic = symbol.visibility === 'public' || !symbol.visibility;

    if (isCriticalMethod && isPublic) {
      const hasLogging = /logger\.(info|debug|trace)|log\.(info|debug|trace)/.test(methodCode);
      
      if (!hasLogging) {
        issues.push({
          location: `${symbol.file}:${symbol.startLine}`,
          file: symbol.file,
          line: symbol.startLine,
          method: symbol.name,
          issue: 'Critical method missing info logging',
          severity: 'medium',
          suggestion: 'Add info logging at method entry/exit for important operations',
        });
      }
    }

    return issues;
  }

  /**
   * Check for metrics collection
   */
  private checkMetrics(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): ObservabilityIssue[] {
    const issues: ObservabilityIssue[] = [];

    // Check for metrics libraries
    const hasMetrics = /counter\.|gauge\.|timer\.|meter\.|micrometer|prometheus|metrics\./.test(methodCode);
    
    // For performance-critical methods, suggest metrics
    const isPerformanceCritical = /process|calculate|compute|generate|build|transform/.test(symbol.name.toLowerCase());
    const isPublic = symbol.visibility === 'public' || !symbol.visibility;

    if (isPerformanceCritical && isPublic && !hasMetrics) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'Performance-critical method missing metrics',
        severity: 'low',
        suggestion: 'Consider adding performance metrics (execution time, call count)',
      });
    }

    return issues;
  }

  /**
   * Check for distributed tracing
   */
  private checkTracing(
    symbol: CodeSymbol,
    methodCode: string,
    methodLines: string[]
  ): ObservabilityIssue[] {
    const issues: ObservabilityIssue[] = [];

    // Check for tracing libraries
    const hasTracing = /@Trace|@Span|tracer\.|span\.|opentelemetry|zipkin|jaeger/.test(methodCode);
    
    // For service methods, suggest tracing
    const isServiceMethod = symbol.file.toLowerCase().includes('service') || 
                            symbol.file.toLowerCase().includes('controller');
    const isPublic = symbol.visibility === 'public' || !symbol.visibility;

    if (isServiceMethod && isPublic && !hasTracing) {
      issues.push({
        location: `${symbol.file}:${symbol.startLine}`,
        file: symbol.file,
        line: symbol.startLine,
        method: symbol.name,
        issue: 'Service method missing distributed tracing',
        severity: 'low',
        suggestion: 'Consider adding distributed tracing for microservices observability',
      });
    }

    return issues;
  }
}




