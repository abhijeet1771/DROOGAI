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
  summary: string; // Human-readable summary
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
          // Skip if call site is in PR files (already being reviewed)
          if (prFiles.includes(callSite.file)) {
            continue;
          }

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

    // Generate human-readable summary
    const summary = this.generateHumanReadableSummary(
      changedSymbols,
      impactedFilesSet,
      impactedFeatures,
      breakagePredictions
    );

    return {
      changedSymbols,
      impactedFiles: Array.from(impactedFilesSet),
      impactedFeatures,
      callSites: impactedAreas,
      breakagePredictions,
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
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
   * Generate human-readable summary
   */
  private generateHumanReadableSummary(
    changedSymbols: CodeSymbol[],
    impactedFiles: Set<string>,
    features: ImpactedFeature[],
    predictions: BreakagePrediction[]
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

