/**
 * Migration Safety Analysis
 * Analyzes migration safety, breaking changes, rollback feasibility
 */

import { CodeSymbol } from '../parser/types.js';
import { EnterpriseReviewReport } from '../core/reviewer.js';

export interface MigrationRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  impact: string;
}

export interface MigrationConcern {
  type: 'database' | 'api' | 'dependency' | 'configuration' | 'data';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface RollbackSafety {
  feasible: boolean;
  concerns: string[];
  estimatedTime: string;
}

export interface MigrationSafetyReport {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: MigrationRisk[];
  concerns: MigrationConcern[];
  rollbackSafety: RollbackSafety;
  recommendations: string[];
}

export class MigrationSafetyAnalyzer {
  /**
   * Analyze migration safety
   */
  analyzeMigrationSafety(report: EnterpriseReviewReport): MigrationSafetyReport {
    const risks: MigrationRisk[] = [];
    const concerns: MigrationConcern[] = [];

    // 1. Analyze breaking changes
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      const breakingChanges = report.breakingChanges.details || [];
      
      // API breaking changes
      const apiBreakingChanges = breakingChanges.filter(bc => 
        bc.file?.toLowerCase().includes('controller') || 
        bc.file?.toLowerCase().includes('api') ||
        bc.file?.toLowerCase().includes('resource')
      );

      if (apiBreakingChanges.length > 0) {
        risks.push({
          level: 'high',
          category: 'API Breaking Changes',
          description: `${apiBreakingChanges.length} API breaking changes detected`,
          impact: 'May break existing clients and integrations',
        });

        concerns.push({
          type: 'api',
          description: `API changes may break existing clients: ${apiBreakingChanges.map(bc => bc.symbol).join(', ')}`,
          severity: 'high',
          recommendation: 'Maintain backward compatibility for at least 1 release cycle or version the API',
        });
      }

      // Database breaking changes
      const dbBreakingChanges = breakingChanges.filter(bc =>
        bc.changeType?.toLowerCase().includes('database') ||
        bc.file?.toLowerCase().includes('entity') ||
        bc.file?.toLowerCase().includes('model') ||
        bc.file?.toLowerCase().includes('schema')
      );

      if (dbBreakingChanges.length > 0) {
        risks.push({
          level: 'critical',
          category: 'Database Schema Changes',
          description: `${dbBreakingChanges.length} database schema changes detected`,
          impact: 'Requires migration script and may cause data loss',
        });

        concerns.push({
          type: 'database',
          description: `Database schema changes require migration script: ${dbBreakingChanges.map(bc => bc.symbol).join(', ')}`,
          severity: 'critical',
          recommendation: 'Create and test migration script before deployment. Ensure rollback script is available.',
        });
      }
    }

    // 2. Analyze dependency changes
    if (report.dependencies) {
      const versionConflicts = report.dependencies.conflicts || [];
      const vulnerabilities = report.dependencies.vulnerabilities || [];

      if (versionConflicts.length > 0) {
        risks.push({
          level: 'medium',
          category: 'Dependency Conflicts',
          description: `${versionConflicts.length} dependency version conflicts`,
          impact: 'May cause runtime errors or unexpected behavior',
        });

        concerns.push({
          type: 'dependency',
          description: `Version conflicts detected: ${versionConflicts.map(c => c.dependency).join(', ')}`,
          severity: 'medium',
          recommendation: 'Resolve version conflicts before deployment. Test thoroughly with new versions.',
        });
      }

      if (vulnerabilities.length > 0) {
        const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high');
        if (criticalVulns.length > 0) {
          risks.push({
            level: 'high',
            category: 'Security Vulnerabilities',
            description: `${criticalVulns.length} critical/high security vulnerabilities in dependencies`,
            impact: 'Security risk - may be exploited in production',
          });

          concerns.push({
            type: 'dependency',
            description: `Security vulnerabilities in dependencies: ${criticalVulns.length} critical/high`,
            severity: 'high',
            recommendation: 'Update vulnerable dependencies before deployment. Review changelogs for breaking changes.',
          });
        }
      }
    }

    // 3. Analyze API backward compatibility
    if (report.apiDesign?.backwardCompatibility) {
      const bcIssues = report.apiDesign.backwardCompatibility.filter(bc => 
        bc.impact === 'high' || bc.impact === 'critical'
      );

      if (bcIssues.length > 0) {
        risks.push({
          level: 'high',
          category: 'API Backward Compatibility',
          description: `${bcIssues.length} high-impact backward compatibility issues`,
          impact: 'May break existing API consumers',
        });

        concerns.push({
          type: 'api',
          description: `Backward compatibility issues: ${bcIssues.map(bc => bc.endpoint || bc.change).join(', ')}`,
          severity: 'high',
          recommendation: 'Version the API or maintain backward compatibility. Notify API consumers in advance.',
        });
      }
    }

    // 4. Analyze configuration changes
    // (Would need to detect config file changes - simplified for now)
    const configChanges = report.comments?.filter(c => 
      c.file?.toLowerCase().includes('config') ||
      c.file?.toLowerCase().includes('application.properties') ||
      c.file?.toLowerCase().includes('application.yml')
    ) || [];

    if (configChanges.length > 0) {
      concerns.push({
        type: 'configuration',
        description: 'Configuration file changes detected',
        severity: 'medium',
        recommendation: 'Review configuration changes. Ensure all environments are updated consistently.',
      });
    }

    // 5. Determine overall risk level
    const riskLevel = this.determineRiskLevel(risks, concerns);

    // 6. Analyze rollback safety
    const rollbackSafety = this.analyzeRollbackSafety(risks, concerns);

    // 7. Generate recommendations
    const recommendations = this.generateRecommendations(risks, concerns, rollbackSafety);

    return {
      riskLevel,
      risks,
      concerns,
      rollbackSafety,
      recommendations,
    };
  }

  /**
   * Determine overall risk level
   */
  private determineRiskLevel(
    risks: MigrationRisk[],
    concerns: MigrationConcern[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Check for critical risks
    if (risks.some(r => r.level === 'critical') || 
        concerns.some(c => c.severity === 'critical')) {
      return 'critical';
    }

    // Check for high risks
    if (risks.some(r => r.level === 'high') || 
        concerns.some(c => c.severity === 'high')) {
      return 'high';
    }

    // Check for medium risks
    if (risks.some(r => r.level === 'medium') || 
        concerns.some(c => c.severity === 'medium')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Analyze rollback safety
   */
  private analyzeRollbackSafety(
    risks: MigrationRisk[],
    concerns: MigrationConcern[]
  ): RollbackSafety {
    const rollbackConcerns: string[] = [];

    // Database changes make rollback difficult
    const dbConcerns = concerns.filter(c => c.type === 'database');
    if (dbConcerns.length > 0) {
      rollbackConcerns.push('Database schema changes require rollback migration script');
    }

    // Data migration makes rollback difficult
    const dataConcerns = concerns.filter(c => c.type === 'data');
    if (dataConcerns.length > 0) {
      rollbackConcerns.push('Data migration may not be reversible');
    }

    // API breaking changes may break clients
    const apiConcerns = concerns.filter(c => c.type === 'api' && c.severity === 'high');
    if (apiConcerns.length > 0) {
      rollbackConcerns.push('API changes may have already been consumed by clients');
    }

    // Determine feasibility
    const feasible = rollbackConcerns.length === 0 || 
                     (rollbackConcerns.length <= 1 && !dbConcerns.length);

    // Estimate rollback time
    let estimatedTime = '5-15 minutes';
    if (dbConcerns.length > 0) {
      estimatedTime = '30-60 minutes';
    } else if (apiConcerns.length > 0) {
      estimatedTime = '15-30 minutes';
    }

    return {
      feasible,
      concerns: rollbackConcerns,
      estimatedTime,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    risks: MigrationRisk[],
    concerns: MigrationConcern[],
    rollbackSafety: RollbackSafety
  ): string[] {
    const recommendations: string[] = [];

    // Database migration recommendations
    const dbConcerns = concerns.filter(c => c.type === 'database');
    if (dbConcerns.length > 0) {
      recommendations.push('Create and test database migration script before deployment');
      recommendations.push('Ensure rollback migration script is available and tested');
      recommendations.push('Backup database before applying migrations');
    }

    // API recommendations
    const apiConcerns = concerns.filter(c => c.type === 'api');
    if (apiConcerns.length > 0) {
      recommendations.push('Maintain backward compatibility for at least 1 release cycle');
      recommendations.push('Version the API if breaking changes are necessary');
      recommendations.push('Notify API consumers in advance of breaking changes');
    }

    // Dependency recommendations
    const depConcerns = concerns.filter(c => c.type === 'dependency');
    if (depConcerns.length > 0) {
      recommendations.push('Test thoroughly with new dependency versions');
      recommendations.push('Review dependency changelogs for breaking changes');
    }

    // Rollback recommendations
    if (!rollbackSafety.feasible) {
      recommendations.push('Plan for extended rollback time due to database/data changes');
      recommendations.push('Have rollback procedure documented and tested');
    }

    // General recommendations
    if (risks.length > 0) {
      recommendations.push('Deploy to staging environment first and test thoroughly');
      recommendations.push('Monitor application closely after deployment');
      recommendations.push('Have rollback plan ready and team on standby');
    }

    return recommendations;
  }
}



