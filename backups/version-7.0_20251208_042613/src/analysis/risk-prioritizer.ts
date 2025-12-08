/**
 * Risk Prioritizer (Sprint 3.3)
 * Prioritizes risks based on production traffic, business criticality, and impact
 */

export interface RiskPriority {
  issue: string;
  file: string;
  line?: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number; // 0-100
  factors: {
    productionTraffic?: string; // e.g., "1000 req/min"
    businessCriticality: 'critical' | 'high' | 'medium' | 'low';
    impactScore: number; // 0-100
    userFacing: boolean;
    breakingChange: boolean;
    testFailure: boolean;
    performanceRegression: boolean;
  };
  reasoning: string;
  priority: number; // Lower = higher priority (for sorting)
}

export interface RiskPrioritizationReport {
  risks: RiskPriority[];
  criticalRisks: RiskPriority[];
  highRisks: RiskPriority[];
  summary: string;
}

export class RiskPrioritizer {
  /**
   * Prioritize risks based on multiple factors
   */
  prioritizeRisks(
    breakingChanges: Array<{ symbol: string; file: string; line?: number }>,
    testFailures: Array<{ test: string; file: string; reason: string }>,
    performanceRegressions: Array<{ file: string; issue: string; impact: string }>,
    businessImpacts: Array<{ feature: string; criticality: string; userFacing: boolean }>,
    productionTraffic?: Map<string, string> // file -> traffic estimate
  ): RiskPrioritizationReport {
    const risks: RiskPriority[] = [];

    // Prioritize breaking changes
    for (const bc of breakingChanges) {
      const risk = this.assessBreakingChangeRisk(bc, productionTraffic, businessImpacts);
      risks.push(risk);
    }

    // Prioritize test failures
    for (const tf of testFailures) {
      const risk = this.assessTestFailureRisk(tf, productionTraffic, businessImpacts);
      risks.push(risk);
    }

    // Prioritize performance regressions
    for (const pr of performanceRegressions) {
      const risk = this.assessPerformanceRisk(pr, productionTraffic, businessImpacts);
      risks.push(risk);
    }

    // Sort by priority (lower = higher priority)
    risks.sort((a, b) => a.priority - b.priority);

    return {
      risks,
      criticalRisks: risks.filter(r => r.riskLevel === 'critical'),
      highRisks: risks.filter(r => r.riskLevel === 'high'),
      summary: this.generateSummary(risks),
    };
  }

  /**
   * Assess breaking change risk
   */
  private assessBreakingChangeRisk(
    breakingChange: { symbol: string; file: string; line?: number },
    productionTraffic?: Map<string, string>,
    businessImpacts?: Array<{ feature: string; criticality: string; userFacing: boolean }>
  ): RiskPriority {
    const file = breakingChange.file.toLowerCase();
    const symbol = breakingChange.symbol.toLowerCase();

    // Check business criticality
    const businessImpact = businessImpacts?.find(bi => 
      file.includes(bi.feature.toLowerCase()) || symbol.includes(bi.feature.toLowerCase())
    );
    const businessCriticality = this.mapToCriticality(businessImpact?.criticality || 'medium');

    // Check production traffic
    const traffic = productionTraffic?.get(breakingChange.file) || 'unknown';
    const trafficScore = this.estimateTrafficScore(traffic);

    // Calculate risk score
    const impactScore = businessImpact?.userFacing ? 90 : 60;
    const riskScore = this.calculateRiskScore({
      businessCriticality,
      trafficScore,
      impactScore,
      breakingChange: true,
    });

    const riskLevel = this.scoreToRiskLevel(riskScore);

    return {
      issue: `Breaking change: ${breakingChange.symbol}`,
      file: breakingChange.file,
      line: breakingChange.line,
      riskLevel,
      riskScore,
      factors: {
        productionTraffic: traffic !== 'unknown' ? traffic : undefined,
        businessCriticality,
        impactScore,
        userFacing: businessImpact?.userFacing || false,
        breakingChange: true,
        testFailure: false,
        performanceRegression: false,
      },
      reasoning: this.generateReasoning(riskLevel, businessCriticality, traffic, 'breaking change'),
      priority: this.calculatePriority(riskScore, businessCriticality, true),
    };
  }

  /**
   * Assess test failure risk
   */
  private assessTestFailureRisk(
    testFailure: { test: string; file: string; reason: string },
    productionTraffic?: Map<string, string>,
    businessImpacts?: Array<{ feature: string; criticality: string; userFacing: boolean }>
  ): RiskPriority {
    const file = testFailure.file.toLowerCase();
    const businessImpact = businessImpacts?.find(bi => file.includes(bi.feature.toLowerCase()));
    const businessCriticality = this.mapToCriticality(businessImpact?.criticality || 'medium');
    const traffic = productionTraffic?.get(testFailure.file) || 'unknown';
    const trafficScore = this.estimateTrafficScore(traffic);
    const impactScore = 70; // Test failures are important but not as critical as breaking changes
    const riskScore = this.calculateRiskScore({
      businessCriticality,
      trafficScore,
      impactScore,
      testFailure: true,
    });

    return {
      issue: `Test will fail: ${testFailure.test}`,
      file: testFailure.file,
      riskLevel: this.scoreToRiskLevel(riskScore),
      riskScore,
      factors: {
        productionTraffic: traffic !== 'unknown' ? traffic : undefined,
        businessCriticality,
        impactScore,
        userFacing: businessImpact?.userFacing || false,
        breakingChange: false,
        testFailure: true,
        performanceRegression: false,
      },
      reasoning: this.generateReasoning(this.scoreToRiskLevel(riskScore), businessCriticality, traffic, 'test failure'),
      priority: this.calculatePriority(riskScore, businessCriticality, false),
    };
  }

  /**
   * Assess performance regression risk
   */
  private assessPerformanceRisk(
    perfRegression: { file: string; issue: string; impact: string },
    productionTraffic?: Map<string, string>,
    businessImpacts?: Array<{ feature: string; criticality: string; userFacing: boolean }>
  ): RiskPriority {
    const file = perfRegression.file.toLowerCase();
    const businessImpact = businessImpacts?.find(bi => file.includes(bi.feature.toLowerCase()));
    const businessCriticality = this.mapToCriticality(businessImpact?.criticality || 'medium');
    const traffic = productionTraffic?.get(perfRegression.file) || 'unknown';
    const trafficScore = this.estimateTrafficScore(traffic);
    const impactScore = 50; // Performance regressions are important but less critical
    const riskScore = this.calculateRiskScore({
      businessCriticality,
      trafficScore,
      impactScore,
      performanceRegression: true,
    });

    return {
      issue: `Performance regression: ${perfRegression.issue}`,
      file: perfRegression.file,
      riskLevel: this.scoreToRiskLevel(riskScore),
      riskScore,
      factors: {
        productionTraffic: traffic !== 'unknown' ? traffic : undefined,
        businessCriticality,
        impactScore,
        userFacing: businessImpact?.userFacing || false,
        breakingChange: false,
        testFailure: false,
        performanceRegression: true,
      },
      reasoning: this.generateReasoning(this.scoreToRiskLevel(riskScore), businessCriticality, traffic, 'performance regression'),
      priority: this.calculatePriority(riskScore, businessCriticality, false),
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(factors: {
    businessCriticality: 'critical' | 'high' | 'medium' | 'low';
    trafficScore: number;
    impactScore: number;
    breakingChange?: boolean;
    testFailure?: boolean;
    performanceRegression?: boolean;
  }): number {
    let score = factors.impactScore;

    // Business criticality multiplier
    const criticalityMultiplier = {
      critical: 1.2,
      high: 1.1,
      medium: 1.0,
      low: 0.8,
    };
    score *= criticalityMultiplier[factors.businessCriticality];

    // Traffic multiplier
    score += factors.trafficScore * 0.3;

    // Type multiplier
    if (factors.breakingChange) score += 20;
    if (factors.testFailure) score += 10;
    if (factors.performanceRegression) score += 5;

    return Math.min(100, Math.round(score));
  }

  /**
   * Estimate traffic score from traffic string
   */
  private estimateTrafficScore(traffic: string): number {
    if (traffic === 'unknown') return 50; // Default medium

    const lower = traffic.toLowerCase();
    if (lower.includes('1000') || lower.includes('high')) return 90;
    if (lower.includes('500') || lower.includes('medium')) return 70;
    if (lower.includes('100') || lower.includes('low')) return 50;
    return 50;
  }

  /**
   * Map string to criticality
   */
  private mapToCriticality(criticality: string): 'critical' | 'high' | 'medium' | 'low' {
    const lower = criticality.toLowerCase();
    if (lower.includes('critical')) return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('low')) return 'low';
    return 'medium';
  }

  /**
   * Score to risk level
   */
  private scoreToRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Calculate priority (lower = higher priority)
   */
  private calculatePriority(riskScore: number, businessCriticality: string, isBreaking: boolean): number {
    let priority = 100 - riskScore; // Invert score (higher risk = lower priority number)

    // Breaking changes get higher priority
    if (isBreaking) priority -= 20;

    // Critical business features get higher priority
    if (businessCriticality === 'critical') priority -= 15;
    if (businessCriticality === 'high') priority -= 10;

    return priority;
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(
    riskLevel: string,
    businessCriticality: string,
    traffic: string,
    issueType: string
  ): string {
    const parts: string[] = [];
    
    parts.push(`${riskLevel.toUpperCase()} risk due to ${issueType}`);
    if (businessCriticality !== 'medium') {
      parts.push(`${businessCriticality} business criticality`);
    }
    if (traffic !== 'unknown') {
      parts.push(`production traffic: ${traffic}`);
    }

    return parts.join(', ');
  }

  /**
   * Generate summary
   */
  private generateSummary(risks: RiskPriority[]): string {
    if (risks.length === 0) {
      return '✅ No significant risks detected';
    }

    const critical = risks.filter(r => r.riskLevel === 'critical').length;
    const high = risks.filter(r => r.riskLevel === 'high').length;

    return `⚠️ Risk Assessment: ${critical} critical, ${high} high priority risk(s)`;
  }
}

