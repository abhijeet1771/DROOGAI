/**
 * Pre-Merge Impact Analysis
 * Detects impacted areas, features, and files before merge
 * Predicts potential breakage using AI
 */

import { CodeSymbol, CallRelationship } from '../parser/types.js';
import { CodebaseIndexer } from '../indexer/indexer.js';

export interface ImpactedArea {
  file: string;
  line: number;
  method: string;
  feature?: string; // Inferred feature name
  callSite: CallRelationship;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ImpactedFeature {
  name: string;
  files: string[];
  impactedAreas: ImpactedArea[];
  riskLevel: 'high' | 'medium' | 'low';
  description: string;
}

export interface BreakagePrediction {
  scenario: string;
  probability: 'high' | 'medium' | 'low';
  impact: string;
  affectedFiles: string[];
  mitigation: string;
}

export interface ImpactAnalysis {
  changedSymbols: CodeSymbol[];
  impactedFiles: string[];
  impactedFeatures: ImpactedFeature[];
  callSites: ImpactedArea[];
  breakagePredictions: BreakagePrediction[];
  cascadeFailures?: CascadeFailure[]; // Sprint 3.1: Cascade failure analysis
  dependencyChains?: DependencyChain[]; // Sprint 3.1: Dependency chain analysis
  summary: string; // Human-readable summary
}

export interface CascadeFailure {
  trigger: string; // The change that triggers the cascade
  affectedFeatures: string[]; // Features that will break
  affectedServices: string[]; // Services/microservices that will fail
  chainLength: number; // How many levels deep the cascade goes
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface DependencyChain {
  rootChange: string; // The initial change
  chain: Array<{
    level: number;
    file: string;
    symbol: string;
    reason: string;
  }>;
  totalAffected: number; // Total files affected in the chain
  criticalPath: boolean; // Is this a critical path?
}

export class ImpactAnalyzer {
  private indexer: CodebaseIndexer;
  private geminiKey?: string;
  
  constructor(indexer: CodebaseIndexer, geminiKey?: string) {
    this.indexer = indexer;
    this.geminiKey = geminiKey;
  }

  /**
   * Analyze impact of PR changes before merge
   */
  async analyzeImpact(prSymbols: CodeSymbol[], prFiles: string[]): Promise<ImpactAnalysis> {
    const index = this.indexer.getIndex();
    const impactedAreas: ImpactedArea[] = [];
    const impactedFilesSet = new Set<string>();
    const changedSymbols: CodeSymbol[] = [];

    // Find all changed methods/classes
    for (const prSymbol of prSymbols) {
      if (prSymbol.type === 'method' || prSymbol.type === 'function' || prSymbol.type === 'class') {
        changedSymbols.push(prSymbol);
        
        // Find all call sites for this symbol
        const callSites = this.indexer.findCallers(prSymbol.name);
        
        for (const callSite of callSites) {
          // Include call sites even in PR files - they still break!
          // Mark them as in-PR but still show impact
          impactedFilesSet.add(callSite.file);
          
          // Determine risk level
          const riskLevel = this.calculateRiskLevel(prSymbol, callSite);
          
          // Infer feature name from file path
          const feature = this.inferFeatureName(callSite.file);
          
          impactedAreas.push({
            file: callSite.file,
            line: callSite.line,
            method: callSite.caller,
            feature,
            callSite,
            riskLevel,
            reason: this.getRiskReason(prSymbol, callSite),
          });
        }
      }
    }

    // Group by features
    const featureMap = new Map<string, ImpactedFeature>();
    for (const area of impactedAreas) {
      const featureName = area.feature || 'Unknown Feature';
      if (!featureMap.has(featureName)) {
        featureMap.set(featureName, {
          name: featureName,
          files: [],
          impactedAreas: [],
          riskLevel: 'low',
          description: this.generateFeatureDescription(featureName, area.file),
        });
      }
      
      const feature = featureMap.get(featureName)!;
      feature.impactedAreas.push(area);
      if (!feature.files.includes(area.file)) {
        feature.files.push(area.file);
      }
      
      // Update feature risk level (highest risk wins)
      if (area.riskLevel === 'high' || (area.riskLevel === 'medium' && feature.riskLevel === 'low')) {
        feature.riskLevel = area.riskLevel;
      }
    }

    const impactedFeatures = Array.from(featureMap.values());

    // Generate breakage predictions using AI
    const breakagePredictions = await this.predictBreakage(
      changedSymbols,
      impactedAreas,
      impactedFeatures
    );

    // Sprint 3.1: Analyze cascade failures
    const cascadeFailures = this.analyzeCascadeFailures(changedSymbols, impactedAreas, impactedFeatures);
    
    // Sprint 3.1: Analyze dependency chains
    const dependencyChains = this.analyzeDependencyChains(changedSymbols, impactedAreas, Array.from(impactedFilesSet));

    // Generate human-readable summary
    const summary = this.generateHumanReadableSummary(
      changedSymbols,
      impactedFilesSet,
      impactedFeatures,
      breakagePredictions,
      cascadeFailures,
      dependencyChains
    );

    return {
      changedSymbols,
      impactedFiles: Array.from(impactedFilesSet),
      impactedFeatures,
      callSites: impactedAreas,
      breakagePredictions,
      cascadeFailures,
      dependencyChains,
      summary,
    };
  }

  /**
   * Calculate risk level for an impacted area
   */
  private calculateRiskLevel(prSymbol: CodeSymbol, callSite: CallRelationship): 'high' | 'medium' | 'low' {
    // High risk: public methods, frequently called methods
    if (prSymbol.visibility === 'public') {
      return 'high';
    }
    
    // Medium risk: protected methods
    if (prSymbol.visibility === 'protected') {
      return 'medium';
    }
    
    // Low risk: private methods (shouldn't have external call sites, but check anyway)
    return 'low';
  }

  /**
   * Get human-readable risk reason
   */
  private getRiskReason(prSymbol: CodeSymbol, callSite: CallRelationship): string {
    if (prSymbol.visibility === 'public') {
      return `Public method ${prSymbol.name} is called from ${callSite.caller}() in ${callSite.file}`;
    }
    if (prSymbol.visibility === 'protected') {
      return `Protected method ${prSymbol.name} is called from ${callSite.caller}() in ${callSite.file}`;
    }
    return `Method ${prSymbol.name} is referenced in ${callSite.file}`;
  }

  /**
   * Infer feature name from file path
   */
  private inferFeatureName(filepath: string): string {
    // Extract feature name from path patterns
    // e.g., "src/features/payment/PaymentService.java" -> "Payment"
    // e.g., "com/company/user/UserService.java" -> "User"
    
    const pathParts = filepath.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    // Remove extension
    const nameWithoutExt = filename.replace(/\.(java|js|ts|py|go)$/, '');
    
    // Try to extract meaningful name
    if (nameWithoutExt.includes('Service')) {
      return nameWithoutExt.replace('Service', '').trim() || 'Service';
    }
    if (nameWithoutExt.includes('Controller')) {
      return nameWithoutExt.replace('Controller', '').trim() || 'Controller';
    }
    if (nameWithoutExt.includes('Manager')) {
      return nameWithoutExt.replace('Manager', '').trim() || 'Manager';
    }
    if (nameWithoutExt.includes('Handler')) {
      return nameWithoutExt.replace('Handler', '').trim() || 'Handler';
    }
    
    // Check parent directory
    if (pathParts.length > 1) {
      const parentDir = pathParts[pathParts.length - 2];
      if (parentDir && parentDir !== 'src' && parentDir !== 'com' && parentDir !== 'org') {
        return parentDir.charAt(0).toUpperCase() + parentDir.slice(1);
      }
    }
    
    return nameWithoutExt || 'Unknown';
  }

  /**
   * Generate feature description
   */
  private generateFeatureDescription(featureName: string, filepath: string): string {
    return `The ${featureName} feature uses code that is being modified in this PR. Changes may affect functionality in ${filepath}.`;
  }

  /**
   * Predict potential breakage scenarios using AI
   */
  private async predictBreakage(
    changedSymbols: CodeSymbol[],
    impactedAreas: ImpactedArea[],
    features: ImpactedFeature[]
  ): Promise<BreakagePrediction[]> {
    if (!this.geminiKey || changedSymbols.length === 0) {
      // Fallback predictions without AI
      return this.generateFallbackPredictions(changedSymbols, impactedAreas);
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.geminiKey);
      // Use gemini-2.5-flash-live to match other parts of codebase
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-live' });

      const prompt = `You are a Senior Software Architect analyzing a Pull Request for potential breakage.

**Changed Symbols:**
${changedSymbols.map(s => `- ${s.name} (${s.type}) in ${s.file}:${s.startLine} - ${s.signature || 'N/A'}`).join('\n')}

**Impacted Areas:**
${impactedAreas.slice(0, 20).map(a => `- ${a.method}() in ${a.file}:${a.line} calls ${a.callSite.callee}`).join('\n')}

**Impacted Features:**
${features.map(f => `- ${f.name}: ${f.files.length} file(s), ${f.impactedAreas.length} call site(s)`).join('\n')}

Analyze and predict potential breakage scenarios. For each scenario, provide:
1. Scenario description (what could break)
2. Probability (high/medium/low)
3. Impact description
4. Affected files
5. Mitigation steps

Return ONLY a valid JSON array in this format:
[
  {
    "scenario": "Brief description of what could break",
    "probability": "high|medium|low",
    "impact": "Detailed impact description",
    "affectedFiles": ["file1.java", "file2.java"],
    "mitigation": "Steps to prevent or fix this issue"
  }
]

If no significant breakage is predicted, return an empty array: []`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      let jsonText = text;
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      }

      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as BreakagePrediction[];
      }

      return this.generateFallbackPredictions(changedSymbols, impactedAreas);
    } catch (error) {
      console.warn('⚠️  AI breakage prediction failed, using fallback:', error);
      return this.generateFallbackPredictions(changedSymbols, impactedAreas);
    }
  }

  /**
   * Generate fallback predictions without AI
   */
  private generateFallbackPredictions(
    changedSymbols: CodeSymbol[],
    impactedAreas: ImpactedArea[]
  ): BreakagePrediction[] {
    const predictions: BreakagePrediction[] = [];

    // Check for signature changes
    const signatureChanges = changedSymbols.filter(s => s.type === 'method');
    if (signatureChanges.length > 0 && impactedAreas.length > 0) {
      predictions.push({
        scenario: 'Method signature changes may cause compilation errors in calling code',
        probability: 'high',
        impact: `${signatureChanges.length} method(s) have been modified. ${impactedAreas.length} call site(s) may need updates to match new signatures.`,
        affectedFiles: [...new Set(impactedAreas.map(a => a.file))],
        mitigation: 'Review all call sites and update method calls to match new signatures. Run full test suite to catch compilation errors.',
      });
    }

    // Check for visibility changes
    const visibilityChanges = changedSymbols.filter(s => 
      s.visibility && (s.visibility === 'private' || s.visibility === 'protected')
    );
    if (visibilityChanges.length > 0 && impactedAreas.length > 0) {
      predictions.push({
        scenario: 'Visibility changes may break external access to methods',
        probability: 'medium',
        impact: `Methods may no longer be accessible from external classes, causing runtime errors.`,
        affectedFiles: [...new Set(impactedAreas.map(a => a.file))],
        mitigation: 'Verify all call sites are in allowed scopes. Consider making methods public or using appropriate access modifiers.',
      });
    }

    return predictions;
  }

  /**
   * Analyze cascade failures (Sprint 3.1)
   * Predicts chain reactions when one change breaks multiple features/services
   */
  private analyzeCascadeFailures(
    changedSymbols: CodeSymbol[],
    impactedAreas: ImpactedArea[],
    impactedFeatures: ImpactedFeature[]
  ): CascadeFailure[] {
    const cascades: CascadeFailure[] = [];

    // Group call sites by feature/service
    const featureCallSites = new Map<string, ImpactedArea[]>();
    for (const area of impactedAreas) {
      const feature = area.feature || 'unknown';
      if (!featureCallSites.has(feature)) {
        featureCallSites.set(feature, []);
      }
      featureCallSites.get(feature)!.push(area);
    }

    // Detect cascades: if one change affects multiple features/services
    for (const changedSymbol of changedSymbols) {
      const affectedFeatures = Array.from(featureCallSites.keys());
      const affectedServices = this.extractServicesFromCallSites(impactedAreas);

      if (affectedFeatures.length > 1 || affectedServices.length > 1) {
        const chainLength = this.calculateChainLength(changedSymbol, impactedAreas);
        
        cascades.push({
          trigger: `${changedSymbol.file}::${changedSymbol.name}`,
          affectedFeatures,
          affectedServices,
          chainLength,
          severity: chainLength > 3 ? 'high' : chainLength > 2 ? 'medium' : 'low',
          description: `Change in ${changedSymbol.name} will cascade to ${affectedFeatures.length} feature(s) and ${affectedServices.length} service(s)`,
        });
      }
    }

    return cascades;
  }

  /**
   * Analyze dependency chains (Sprint 3.1)
   * Maps how changes propagate through the dependency graph
   */
  private analyzeDependencyChains(
    changedSymbols: CodeSymbol[],
    impactedAreas: ImpactedArea[],
    impactedFiles: string[]
  ): DependencyChain[] {
    const chains: DependencyChain[] = [];

    for (const changedSymbol of changedSymbols) {
      // Build dependency chain
      const chain: DependencyChain['chain'] = [];
      
      // Direct call sites (level 1)
      const directCallSites = impactedAreas.filter(area => 
        area.file === changedSymbol.file || area.method.includes(changedSymbol.name)
      );
      
      for (const area of directCallSites) {
        chain.push({
          level: 1,
          file: area.file,
          symbol: area.method,
          reason: `Directly calls ${changedSymbol.name}`,
        });
      }

      // Indirect impacts (level 2+)
      const indirectFiles = impactedFiles.filter(f => 
        !directCallSites.some(area => area.file === f)
      );
      
      for (const file of indirectFiles) {
        chain.push({
          level: 2,
          file,
          symbol: 'unknown',
          reason: `Depends on files that use ${changedSymbol.name}`,
        });
      }

      if (chain.length > 0) {
        chains.push({
          rootChange: `${changedSymbol.file}::${changedSymbol.name}`,
          chain,
          totalAffected: chain.length,
          criticalPath: chain.length > 5 || changedSymbol.name.toLowerCase().includes('service') || changedSymbol.name.toLowerCase().includes('api'),
        });
      }
    }

    return chains;
  }

  /**
   * Extract service names from call sites
   */
  private extractServicesFromCallSites(impactedAreas: ImpactedArea[]): string[] {
    const services = new Set<string>();
    
    for (const area of impactedAreas) {
      // Look for service patterns in file path
      if (area.file.includes('Service') || area.file.includes('service')) {
        const serviceName = area.file.split('/').pop()?.replace(/\.(java|js|ts)$/, '') || '';
        if (serviceName) {
          services.add(serviceName);
        }
      }
    }
    
    return Array.from(services);
  }

  /**
   * Calculate cascade chain length
   */
  private calculateChainLength(changedSymbol: CodeSymbol, impactedAreas: ImpactedArea[]): number {
    // Count how many levels of dependencies are affected
    const direct = impactedAreas.filter(area => area.file === changedSymbol.file).length;
    const indirect = impactedAreas.length - direct;
    
    // Chain length = direct (1) + indirect levels (estimated)
    return 1 + Math.ceil(indirect / 3); // Rough estimate: every 3 indirect calls = 1 level
  }

  /**
   * Generate human-readable summary
   */
  private generateHumanReadableSummary(
    changedSymbols: CodeSymbol[],
    impactedFiles: Set<string>,
    features: ImpactedFeature[],
    predictions: BreakagePrediction[],
    cascadeFailures?: CascadeFailure[],
    dependencyChains?: DependencyChain[]
  ): string {
    let summary = `# Pre-Merge Impact Analysis\n\n`;
    
    summary += `## Overview\n\n`;
    summary += `This PR modifies **${changedSymbols.length} symbol(s)** (methods/classes) that are used by **${impactedFiles.size} file(s)** in the codebase.\n\n`;
    
    if (features.length > 0) {
      summary += `## Impacted Features\n\n`;
      for (const feature of features) {
        summary += `### ${feature.name}\n`;
        summary += `- **Risk Level:** ${feature.riskLevel.toUpperCase()}\n`;
        summary += `- **Affected Files:** ${feature.files.length}\n`;
        summary += `- **Call Sites:** ${feature.impactedAreas.length}\n`;
        summary += `- **Description:** ${feature.description}\n\n`;
        
        if (feature.impactedAreas.length > 0) {
          summary += `**Where it's being called:**\n`;
          feature.impactedAreas.slice(0, 10).forEach(area => {
            summary += `  - \`${area.method}()\` in \`${area.file}:${area.line}\`\n`;
          });
          if (feature.impactedAreas.length > 10) {
            summary += `  ... and ${feature.impactedAreas.length - 10} more call site(s)\n`;
          }
          summary += `\n`;
        }
      }
    }

    // Sprint 3.1: Add cascade failure info
    if (cascadeFailures && cascadeFailures.length > 0) {
      summary += `## Cascade Failures\n\n`;
      summary += `**${cascadeFailures.length} cascade failure(s)** detected - one change will break multiple features/services.\n\n`;
      for (const cascade of cascadeFailures.slice(0, 3)) {
        summary += `### ${cascade.trigger}\n`;
        summary += `- **Affected Features:** ${cascade.affectedFeatures.join(', ') || 'None'}\n`;
        summary += `- **Affected Services:** ${cascade.affectedServices.join(', ') || 'None'}\n`;
        summary += `- **Chain Length:** ${cascade.chainLength} level(s)\n`;
        summary += `- **Severity:** ${cascade.severity.toUpperCase()}\n`;
        summary += `- **Description:** ${cascade.description}\n\n`;
      }
    }

    // Sprint 3.1: Add dependency chain info
    if (dependencyChains && dependencyChains.length > 0) {
      const criticalChains = dependencyChains.filter(chain => chain.criticalPath);
      if (criticalChains.length > 0) {
        summary += `## Critical Dependency Chains\n\n`;
        summary += `**${criticalChains.length} critical dependency chain(s)** detected.\n\n`;
        for (const chain of criticalChains.slice(0, 2)) {
          summary += `### ${chain.rootChange}\n`;
          summary += `- **Total Affected:** ${chain.totalAffected} file(s)\n`;
          summary += `- **Chain:**\n`;
          chain.chain.slice(0, 5).forEach(link => {
            summary += `  - Level ${link.level}: \`${link.file}\` - ${link.reason}\n`;
          });
          if (chain.chain.length > 5) {
            summary += `  - ... and ${chain.chain.length - 5} more file(s)\n`;
          }
          summary += `\n`;
        }
      }
    }
    
    if (predictions.length > 0) {
      summary += `## Potential Breakage Scenarios\n\n`;
      for (const prediction of predictions) {
        summary += `### ${prediction.scenario}\n`;
        summary += `- **Probability:** ${prediction.probability.toUpperCase()}\n`;
        summary += `- **Impact:** ${prediction.impact}\n`;
        summary += `- **Affected Files:** ${prediction.affectedFiles.length}\n`;
        summary += `- **Mitigation:** ${prediction.mitigation}\n\n`;
      }
    }
    
    summary += `## Recommendations\n\n`;
    summary += `1. **Review all call sites** listed above before merging\n`;
    summary += `2. **Run full test suite** to catch any breakage\n`;
    summary += `3. **Update calling code** if method signatures have changed\n`;
    summary += `4. **Consider deprecation** for public APIs instead of breaking changes\n`;
    
    return summary;
  }
}

