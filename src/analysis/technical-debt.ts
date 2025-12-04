/**
 * Technical Debt Analysis
 * Calculates technical debt score and provides reduction strategy
 */

import { CodeSymbol } from '../parser/types.js';
import { EnterpriseReviewReport } from '../core/reviewer.js';

export interface TechnicalDebtScore {
  total: number; // 0-10 scale
  breakdown: {
    codeSmells: number;
    complexity: number;
    duplication: number;
    testCoverage: number;
    security: number;
    documentation: number;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  debtHours: number; // Estimated hours to fix
}

export interface DebtReductionStrategy {
  priority: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  estimatedHours: number;
  impact: string;
}

export interface TechnicalDebtReport {
  score: TechnicalDebtScore;
  reductionStrategy: DebtReductionStrategy[];
  topIssues: Array<{
    category: string;
    count: number;
    severity: string;
  }>;
}

export class TechnicalDebtAnalyzer {
  /**
   * Calculate technical debt score
   */
  calculateDebtScore(report: EnterpriseReviewReport): TechnicalDebtScore {
    // Calculate debt components (0-10 scale each)
    const codeSmells = this.calculateCodeSmellsDebt(report);
    const complexity = this.calculateComplexityDebt(report);
    const duplication = this.calculateDuplicationDebt(report);
    const testCoverage = this.calculateTestCoverageDebt(report);
    const security = this.calculateSecurityDebt(report);
    const documentation = this.calculateDocumentationDebt(report);

    // Weighted average
    const total = (
      codeSmells * 0.2 +
      complexity * 0.2 +
      duplication * 0.15 +
      testCoverage * 0.15 +
      security * 0.2 +
      documentation * 0.1
    );

    // Determine priority
    let priority: 'low' | 'medium' | 'high' | 'critical';
    if (total >= 8) {
      priority = 'critical';
    } else if (total >= 6) {
      priority = 'high';
    } else if (total >= 4) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Estimate debt hours (rough calculation)
    const debtHours = this.estimateDebtHours(report, total);

    return {
      total: Math.round(total * 10) / 10,
      breakdown: {
        codeSmells,
        complexity,
        duplication,
        testCoverage,
        security,
        documentation,
      },
      priority,
      debtHours,
    };
  }

  /**
   * Calculate code smells debt
   */
  private calculateCodeSmellsDebt(report: EnterpriseReviewReport): number {
    let debt = 0;

    // Anti-patterns
    if (report.designPatterns?.antiPatterns) {
      const antiPatterns = report.designPatterns.antiPatterns;
      debt += antiPatterns.filter(ap => ap.severity === 'high').length * 1.5;
      debt += antiPatterns.filter(ap => ap.severity === 'medium').length * 1.0;
      debt += antiPatterns.filter(ap => ap.severity === 'low').length * 0.5;
    }

    // Error handling issues
    if (report.errorHandling?.issues) {
      debt += report.errorHandling.issues.length * 0.3;
    }

    // Architecture violations
    if (report.architectureViolations?.count) {
      debt += report.architectureViolations.count * 0.5;
    }

    // Cap at 10
    return Math.min(debt, 10);
  }

  /**
   * Calculate complexity debt
   */
  private calculateComplexityDebt(report: EnterpriseReviewReport): number {
    if (!report.complexity) {
      return 0;
    }

    let debt = 0;

    // Complexity hotspots
    const hotspots = report.complexity.hotspots || [];
    debt += hotspots.filter(h => h.severity === 'high').length * 1.0;
    debt += hotspots.filter(h => h.severity === 'medium').length * 0.5;

    // Average complexity metrics
    const avgMetrics = report.complexity.averageMetrics;
    if (avgMetrics.cyclomaticComplexity > 15) {
      debt += 2.0;
    } else if (avgMetrics.cyclomaticComplexity > 10) {
      debt += 1.0;
    }

    if (avgMetrics.maintainabilityIndex < 50) {
      debt += 2.0;
    } else if (avgMetrics.maintainabilityIndex < 70) {
      debt += 1.0;
    }

    return Math.min(debt, 10);
  }

  /**
   * Calculate duplication debt
   */
  private calculateDuplicationDebt(report: EnterpriseReviewReport): number {
    if (!report.duplicates) {
      return 0;
    }

    const withinPR = report.duplicates.withinPR || 0;
    const crossRepo = report.duplicates.crossRepo || 0;

    // Duplication is a significant debt indicator
    let debt = (withinPR * 0.2) + (crossRepo * 0.1);
    
    return Math.min(debt, 10);
  }

  /**
   * Calculate test coverage debt
   */
  private calculateTestCoverageDebt(report: EnterpriseReviewReport): number {
    if (!report.testCoverage) {
      return 5.0; // Unknown coverage = medium debt
    }

    const coverage = report.testCoverage.coverage;
    const methodCoverage = coverage.methodCoverage || 0;
    const lineCoverage = coverage.lineCoverage || 0;
    const branchCoverage = coverage.branchCoverage || 0;

    let debt = 0;

    // Low coverage = high debt
    if (methodCoverage < 50) {
      debt += 3.0;
    } else if (methodCoverage < 70) {
      debt += 1.5;
    }

    if (lineCoverage < 50) {
      debt += 2.0;
    } else if (lineCoverage < 70) {
      debt += 1.0;
    }

    if (branchCoverage < 50) {
      debt += 2.0;
    } else if (branchCoverage < 70) {
      debt += 1.0;
    }

    // Missing tests
    if (report.testCoverage.missingTests) {
      debt += report.testCoverage.missingTests.length * 0.2;
    }

    return Math.min(debt, 10);
  }

  /**
   * Calculate security debt
   */
  private calculateSecurityDebt(report: EnterpriseReviewReport): number {
    if (!report.security) {
      return 0;
    }

    let debt = 0;

    // Critical security issues = very high debt
    if (report.security.critical) {
      debt += report.security.critical.length * 3.0;
    }

    // High severity issues
    if (report.security.high) {
      debt += report.security.high.length * 1.5;
    }

    // Other security issues
    const otherIssues = (report.security.issues?.length || 0) - 
                       (report.security.critical?.length || 0) - 
                       (report.security.high?.length || 0);
    debt += otherIssues * 0.5;

    return Math.min(debt, 10);
  }

  /**
   * Calculate documentation debt
   */
  private calculateDocumentationDebt(report: EnterpriseReviewReport): number {
    if (!report.documentation) {
      return 2.0; // Unknown = low-medium debt
    }

    const qualityScore = report.documentation.qualityScore || 0;
    const issues = report.documentation.issues?.length || 0;

    let debt = 0;

    // Low quality score = higher debt
    if (qualityScore < 50) {
      debt += 3.0;
    } else if (qualityScore < 70) {
      debt += 1.5;
    }

    // Documentation issues
    debt += issues * 0.1;

    return Math.min(debt, 10);
  }

  /**
   * Estimate debt hours
   */
  private estimateDebtHours(report: EnterpriseReviewReport, debtScore: number): number {
    let hours = 0;

    // Base hours from debt score
    hours += debtScore * 2;

    // Add hours for specific issues
    if (report.complexity?.hotspots) {
      hours += report.complexity.hotspots.length * 2; // 2 hours per hotspot
    }

    if (report.duplicates?.withinPR) {
      hours += report.duplicates.withinPR * 0.5; // 30 min per duplicate
    }

    if (report.testCoverage?.missingTests) {
      hours += report.testCoverage.missingTests.length * 1; // 1 hour per missing test
    }

    if (report.security?.critical) {
      hours += report.security.critical.length * 4; // 4 hours per critical security issue
    }

    if (report.documentation?.issues) {
      hours += report.documentation.issues.length * 0.2; // 12 min per doc issue
    }

    return Math.round(hours);
  }

  /**
   * Generate debt reduction strategy
   */
  generateReductionStrategy(report: EnterpriseReviewReport, debtScore: TechnicalDebtScore): DebtReductionStrategy[] {
    const strategies: DebtReductionStrategy[] = [];

    // High priority: Security issues
    if (report.security?.critical && report.security.critical.length > 0) {
      strategies.push({
        priority: 'high',
        category: 'Security',
        description: `Fix ${report.security.critical.length} critical security vulnerabilities`,
        estimatedHours: report.security.critical.length * 4,
        impact: 'High - Prevents security breaches',
      });
    }

    // High priority: Complexity hotspots
    if (report.complexity?.hotspots) {
      const highComplexity = report.complexity.hotspots.filter(h => h.severity === 'high');
      if (highComplexity.length > 0) {
        strategies.push({
          priority: 'high',
          category: 'Complexity',
          description: `Refactor ${highComplexity.length} high-complexity methods`,
          estimatedHours: highComplexity.length * 2,
          impact: 'High - Improves maintainability and reduces bugs',
        });
      }
    }

    // Medium priority: Test coverage
    if (report.testCoverage && report.testCoverage.coverage.methodCoverage < 70) {
      strategies.push({
        priority: 'medium',
        category: 'Test Coverage',
        description: `Improve test coverage from ${report.testCoverage.coverage.methodCoverage.toFixed(1)}% to 70%+`,
        estimatedHours: Math.round((70 - report.testCoverage.coverage.methodCoverage) * 0.5),
        impact: 'Medium - Reduces regression risk',
      });
    }

    // Medium priority: Duplication
    if (report.duplicates && (report.duplicates.withinPR > 0 || report.duplicates.crossRepo > 0)) {
      strategies.push({
        priority: 'medium',
        category: 'Duplication',
        description: `Eliminate ${report.duplicates.withinPR + report.duplicates.crossRepo} duplicate code blocks`,
        estimatedHours: Math.round((report.duplicates.withinPR + report.duplicates.crossRepo) * 0.5),
        impact: 'Medium - Reduces maintenance burden',
      });
    }

    // Low priority: Documentation
    if (report.documentation && report.documentation.qualityScore < 70) {
      strategies.push({
        priority: 'low',
        category: 'Documentation',
        description: `Improve documentation quality from ${report.documentation.qualityScore}/100 to 70+`,
        estimatedHours: Math.round((70 - report.documentation.qualityScore) * 0.1),
        impact: 'Low - Improves developer experience',
      });
    }

    // Low priority: Anti-patterns
    if (report.designPatterns?.antiPatterns && report.designPatterns.antiPatterns.length > 0) {
      strategies.push({
        priority: 'low',
        category: 'Code Smells',
        description: `Refactor ${report.designPatterns.antiPatterns.length} anti-patterns`,
        estimatedHours: report.designPatterns.antiPatterns.length * 1,
        impact: 'Low - Improves code quality',
      });
    }

    return strategies.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate technical debt report
   */
  generateReport(report: EnterpriseReviewReport): TechnicalDebtReport {
    const score = this.calculateDebtScore(report);
    const reductionStrategy = this.generateReductionStrategy(report, score);

    // Top issues summary
    const topIssues: Array<{ category: string; count: number; severity: string }> = [];

    if (report.security?.critical && report.security.critical.length > 0) {
      topIssues.push({ category: 'Security (Critical)', count: report.security.critical.length, severity: 'critical' });
    }

    if (report.complexity?.hotspots) {
      const highComplexity = report.complexity.hotspots.filter(h => h.severity === 'high').length;
      if (highComplexity > 0) {
        topIssues.push({ category: 'Complexity (High)', count: highComplexity, severity: 'high' });
      }
    }

    if (report.duplicates && (report.duplicates.withinPR > 0 || report.duplicates.crossRepo > 0)) {
      topIssues.push({ 
        category: 'Duplication', 
        count: report.duplicates.withinPR + report.duplicates.crossRepo, 
        severity: 'medium' 
      });
    }

    if (report.testCoverage && report.testCoverage.coverage.methodCoverage < 70) {
      topIssues.push({ 
        category: 'Test Coverage', 
        count: Math.round(100 - report.testCoverage.coverage.methodCoverage), 
        severity: 'medium' 
      });
    }

    return {
      score,
      reductionStrategy,
      topIssues: topIssues.slice(0, 5), // Top 5 issues
    };
  }
}



