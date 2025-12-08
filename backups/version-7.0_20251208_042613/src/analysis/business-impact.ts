/**
 * Business Impact Mapper (Sprint 3.2)
 * Maps technical changes to user-facing business impact
 */

export interface BusinessImpact {
  userFacingImpact: string;
  affectedUserFlows: string[];
  businessCriticality: 'critical' | 'high' | 'medium' | 'low';
  estimatedUsersAffected?: string; // e.g., "1000 users/day"
  revenueImpact?: string; // e.g., "Checkout flow - high revenue impact"
  description: string;
}

export interface BusinessImpactReport {
  impacts: BusinessImpact[];
  criticalFlows: string[]; // User flows that will break
  summary: string;
}

export class BusinessImpactMapper {
  /**
   * Map technical changes to business impact
   */
  mapBusinessImpact(
    changedFiles: string[],
    impactedFeatures: Array<{ name: string; files: string[] }>,
    breakingChanges: Array<{ symbol: string; file: string }>
  ): BusinessImpactReport {
    const impacts: BusinessImpact[] = [];

    // Analyze each impacted feature
    for (const feature of impactedFeatures) {
      const impact = this.analyzeFeatureImpact(feature, breakingChanges);
      if (impact) {
        impacts.push(impact);
      }
    }

    // Analyze breaking changes for user-facing impact
    for (const breakingChange of breakingChanges) {
      const impact = this.analyzeBreakingChangeImpact(breakingChange);
      if (impact) {
        impacts.push(impact);
      }
    }

    // Extract critical flows
    const criticalFlows = impacts
      .filter(i => i.businessCriticality === 'critical' || i.businessCriticality === 'high')
      .flatMap(i => i.affectedUserFlows);

    return {
      impacts,
      criticalFlows: [...new Set(criticalFlows)],
      summary: this.generateSummary(impacts, criticalFlows),
    };
  }

  /**
   * Analyze feature impact
   */
  private analyzeFeatureImpact(
    feature: { name: string; files: string[] },
    breakingChanges: Array<{ symbol: string; file: string }>
  ): BusinessImpact | null {
    const featureName = feature.name.toLowerCase();
    const files = feature.files.map(f => f.toLowerCase());

    // Map feature names to user flows
    const userFlowMap: Record<string, string[]> = {
      'payment': ['Checkout', 'Payment Processing', 'Order Completion'],
      'order': ['Order Placement', 'Order Tracking', 'Order Management'],
      'user': ['User Login', 'User Registration', 'Profile Management'],
      'product': ['Product Search', 'Product Details', 'Product Catalog'],
      'cart': ['Add to Cart', 'Cart Management', 'Checkout'],
      'authentication': ['User Login', 'User Registration', 'Password Reset'],
      'checkout': ['Checkout Flow', 'Payment Processing', 'Order Confirmation'],
    };

    // Find matching user flows
    const affectedFlows: string[] = [];
    for (const [key, flows] of Object.entries(userFlowMap)) {
      if (featureName.includes(key) || files.some(f => f.includes(key))) {
        affectedFlows.push(...flows);
      }
    }

    if (affectedFlows.length === 0) {
      return null;
    }

    // Determine business criticality
    const criticality = this.determineCriticality(featureName, affectedFlows);

    // Generate user-facing description
    const description = this.generateUserFacingDescription(featureName, affectedFlows, breakingChanges);

    return {
      userFacingImpact: `${affectedFlows[0]} will be affected`,
      affectedUserFlows: affectedFlows,
      businessCriticality: criticality,
      revenueImpact: this.estimateRevenueImpact(featureName, affectedFlows),
      description,
    };
  }

  /**
   * Analyze breaking change impact
   */
  private analyzeBreakingChangeImpact(
    breakingChange: { symbol: string; file: string }
  ): BusinessImpact | null {
    const symbol = breakingChange.symbol.toLowerCase();
    const file = breakingChange.file.toLowerCase();

    // Detect user-facing methods
    const userFacingPatterns = [
      { pattern: /login|authenticate|signin/i, flow: 'User Login' },
      { pattern: /checkout|payment|processorder/i, flow: 'Checkout Flow' },
      { pattern: /register|signup/i, flow: 'User Registration' },
      { pattern: /search|find|query/i, flow: 'Product Search' },
      { pattern: /addtocart|cart/i, flow: 'Add to Cart' },
    ];

    const affectedFlows: string[] = [];
    for (const { pattern, flow } of userFacingPatterns) {
      if (pattern.test(symbol) || pattern.test(file)) {
        affectedFlows.push(flow);
      }
    }

    if (affectedFlows.length === 0) {
      return null;
    }

    const criticality = this.determineCriticality(symbol, affectedFlows);

    return {
      userFacingImpact: `${affectedFlows[0]} will break`,
      affectedUserFlows: affectedFlows,
      businessCriticality: criticality,
      description: `Breaking change in ${breakingChange.symbol} will cause ${affectedFlows[0]} to fail`,
    };
  }

  /**
   * Determine business criticality
   */
  private determineCriticality(featureName: string, flows: string[]): BusinessImpact['businessCriticality'] {
    const criticalFlows = ['Checkout', 'Payment', 'User Login', 'Order Placement'];
    const highFlows = ['Order Tracking', 'Product Search', 'Cart Management'];

    if (flows.some(flow => criticalFlows.some(cf => flow.includes(cf)))) {
      return 'critical';
    }

    if (flows.some(flow => highFlows.some(hf => flow.includes(hf)))) {
      return 'high';
    }

    if (featureName.includes('payment') || featureName.includes('checkout')) {
      return 'critical';
    }

    if (featureName.includes('order') || featureName.includes('user')) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Generate user-facing description
   */
  private generateUserFacingDescription(
    featureName: string,
    flows: string[],
    breakingChanges: Array<{ symbol: string; file: string }>
  ): string {
    if (breakingChanges.length > 0) {
      return `Users won't be able to ${flows[0].toLowerCase()} due to breaking changes in ${featureName}`;
    }
    return `Users may experience issues with ${flows.join(', ')} due to changes in ${featureName}`;
  }

  /**
   * Estimate revenue impact
   */
  private estimateRevenueImpact(featureName: string, flows: string[]): string | undefined {
    if (flows.some(flow => flow.includes('Checkout') || flow.includes('Payment'))) {
      return 'Checkout flow - high revenue impact';
    }
    if (flows.some(flow => flow.includes('Order'))) {
      return 'Order processing - medium revenue impact';
    }
    return undefined;
  }

  /**
   * Generate summary
   */
  private generateSummary(impacts: BusinessImpact[], criticalFlows: string[]): string {
    if (impacts.length === 0) {
      return '✅ No significant business impact detected';
    }

    const critical = impacts.filter(i => i.businessCriticality === 'critical').length;
    const high = impacts.filter(i => i.businessCriticality === 'high').length;

    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} critical impact(s)`);
    if (high > 0) parts.push(`${high} high impact(s)`);
    if (criticalFlows.length > 0) parts.push(`${criticalFlows.length} critical user flow(s) affected`);

    return `⚠️ Business Impact: ${parts.join(', ')}`;
  }
}

