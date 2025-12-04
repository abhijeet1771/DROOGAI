/**
 * AI-powered recommendation generator
 * Uses Gemini to generate intelligent recommendations based on all analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { EnterpriseReviewReport } from './reviewer.js';

const RECOMMENDATIONS_PROMPT = `You are a Senior Technical Architect providing strategic recommendations for a code review.

Your task is to analyze ALL the review findings and provide intelligent, prioritized, actionable recommendations.

Consider:
1. **All Issues Found**: High/Medium/Low priority issues with their context
2. **Duplicate Code**: Within PR and cross-repository duplicates
3. **Breaking Changes**: API changes and their impact
4. **Architecture Violations**: Design and structure issues
5. **Code Patterns**: Relationships between findings
6. **Index Context**: Similar code in main branch (if available)

**Your Goal:**
Provide strategic, prioritized recommendations that:
- Address the most critical issues first
- Consider relationships between findings
- Suggest refactoring opportunities
- Recommend architectural improvements
- Provide actionable next steps
- Consider technical debt impact

**Output Format:**
Provide recommendations as a structured markdown list, prioritized by:
1. **Critical Actions** (must fix before merge)
2. **High Priority** (should fix soon)
3. **Medium Priority** (improvements)
4. **Low Priority** (nice to have)

For each recommendation:
- Be specific and actionable
- Reference specific findings when relevant
- Suggest concrete steps
- Consider impact and effort

**Example Format:**
\`\`\`markdown
## Critical Actions (Must Fix Before Merge)

1. **Security Vulnerability in SecurityService.java:12**
   - Issue: Hardcoded API key exposed
   - Action: Move to environment variables immediately
   - Impact: High security risk

2. **Breaking Change: calculate() method signature changed**
   - Issue: Method signature changed, impacts 5 call sites
   - Action: Update all call sites or revert change
   - Impact: Will break existing code

## High Priority (Should Fix Soon)

3. **Refactor 5 Duplicate Code Patterns**
   - Issue: DataProcessor has 3 identical methods
   - Action: Extract common logic to utility class
   - Impact: Reduces maintenance burden

...
\`\`\`

**Important:**
- Base recommendations on ALL findings, not just counts
- Consider relationships (e.g., if duplicates + breaking changes, suggest refactoring)
- Prioritize by impact and urgency
- Be specific and actionable
- Reference actual files/methods when relevant
`;

export class RecommendationGenerator {
  private model: any;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: { temperature: 0.3 } // Lower temperature for more focused recommendations
    });
  }

  /**
   * Generate intelligent recommendations based on all analysis
   */
  async generateRecommendations(
    report: EnterpriseReviewReport,
    indexContext?: {
      hasIndex: boolean;
      indexedSymbols?: number;
      similarCodeFound?: number;
    }
  ): Promise<string> {
    // Build comprehensive context for Gemini
    const context = this.buildContext(report, indexContext);

    const prompt = `${RECOMMENDATIONS_PROMPT}

## Review Analysis Results

${context}

Based on ALL the above findings, provide comprehensive, prioritized recommendations.
Consider relationships between findings and provide strategic guidance.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      let recommendations = response.text().trim();

      // Remove markdown code blocks if present
      if (recommendations.startsWith('```')) {
        recommendations = recommendations.replace(/^```(?:markdown)?\n?/i, '').replace(/\n?```$/i, '');
      }

      return recommendations;
    } catch (error: any) {
      console.warn('⚠️  Failed to generate AI recommendations, using fallback:', error.message);
      return this.generateFallbackRecommendations(report);
    }
  }

  /**
   * Build comprehensive context from all analysis
   */
  private buildContext(
    report: EnterpriseReviewReport,
    indexContext?: {
      hasIndex: boolean;
      indexedSymbols?: number;
      similarCodeFound?: number;
    }
  ): string {
    const lines: string[] = [];

    // Overview
    lines.push(`### Overview`);
    lines.push(`- Total Issues: ${report.totalIssues}`);
    lines.push(`  - High Priority: ${report.issuesBySeverity.high}`);
    lines.push(`  - Medium Priority: ${report.issuesBySeverity.medium}`);
    lines.push(`  - Low Priority: ${report.issuesBySeverity.low}`);
    if (report.averageConfidence !== undefined) {
      lines.push(`- Average Confidence: ${(report.averageConfidence * 100).toFixed(1)}%`);
    }
    lines.push('');

    // High Priority Issues (sample)
    if (report.issuesBySeverity.high > 0) {
      lines.push(`### High Priority Issues (${report.issuesBySeverity.high} found)`);
      const highIssues = report.comments
        .filter(c => c.severity === 'high')
        .slice(0, 10);
      highIssues.forEach(issue => {
        lines.push(`- **${issue.file}:${issue.line}**: ${issue.message}`);
        lines.push(`  - Suggestion: ${issue.suggestion.substring(0, 200)}...`);
      });
      lines.push('');
    }

    // Duplicates
    if (report.duplicates) {
      lines.push(`### Duplicate Code Analysis`);
      lines.push(`- Within PR: ${report.duplicates.withinPR} duplicate(s)`);
      if (report.duplicates.crossRepo > 0) {
        lines.push(`- Cross-Repository: ${report.duplicates.crossRepo} duplicate(s) found`);
      }
      if (report.duplicates.details.length > 0) {
        lines.push(`- Details:`);
        report.duplicates.details.slice(0, 5).forEach(dup => {
          lines.push(`  - \`${dup.file1}::${dup.symbol1}\` similar to \`${dup.file2}::${dup.symbol2}\` (${(dup.similarity * 100).toFixed(1)}% similar)`);
          if (dup.reason) {
            lines.push(`    - Reason: ${dup.reason}`);
          }
        });
      }
      lines.push('');
    }

    // Breaking Changes
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      lines.push(`### Breaking Changes (${report.breakingChanges.count} found)`);
      lines.push(`- Impacted Files: ${report.breakingChanges.impactedFiles.length}`);
      if (report.breakingChanges.details.length > 0) {
        lines.push(`- Details:`);
        report.breakingChanges.details.slice(0, 5).forEach(bc => {
          lines.push(`  - \`${bc.file}::${bc.symbol}\`: ${bc.changeType}`);
          lines.push(`    - Message: ${bc.message}`);
          lines.push(`    - Severity: ${bc.severity}`);
          if (bc.callSites > 0) {
            lines.push(`    - Affects ${bc.callSites} call site(s)`);
          }
        });
      }
      lines.push('');
    }

    // Architecture Violations
    if (report.architectureViolations && report.architectureViolations.count > 0) {
      lines.push(`### Architecture Violations (${report.architectureViolations.count} found)`);
      if (report.architectureViolations.details.length > 0) {
        lines.push(`- Details:`);
        report.architectureViolations.details.slice(0, 5).forEach(v => {
          lines.push(`  - \`${v.file}:${v.line}\`: ${v.rule}`);
          lines.push(`    - ${v.message}`);
        });
      }
      lines.push('');
    }

    // Index Context
    if (indexContext?.hasIndex) {
      lines.push(`### Codebase Context`);
      lines.push(`- Main branch indexed: Yes`);
      if (indexContext.indexedSymbols) {
        lines.push(`- Indexed symbols: ${indexContext.indexedSymbols}`);
      }
      if (indexContext.similarCodeFound) {
        lines.push(`- Similar code patterns found: ${indexContext.similarCodeFound}`);
      }
      lines.push('');
    }

    // Medium Priority Issues (summary)
    if (report.issuesBySeverity.medium > 0) {
      lines.push(`### Medium Priority Issues (${report.issuesBySeverity.medium} found)`);
      const mediumIssues = report.comments
        .filter(c => c.severity === 'medium')
        .slice(0, 5);
      mediumIssues.forEach(issue => {
        lines.push(`- **${issue.file}:${issue.line}**: ${issue.message}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Fallback recommendations if AI generation fails
   */
  private generateFallbackRecommendations(report: EnterpriseReviewReport): string {
    const recommendations: string[] = [];
    
    recommendations.push('## 💡 Recommendations\n');
    
    if (report.issuesBySeverity.high > 0) {
      recommendations.push(`### 🔴 Critical Actions (${report.issuesBySeverity.high} high-priority issues)`);
      recommendations.push(`1. Address all high-priority issues before merging`);
      recommendations.push(`2. These may cause bugs, security vulnerabilities, or crashes`);
      recommendations.push('');
    }
    
    if (report.duplicates && report.duplicates.withinPR > 0) {
      recommendations.push(`### 🔄 Refactor Duplicate Code (${report.duplicates.withinPR} patterns)`);
      recommendations.push(`1. Extract common logic to reduce maintenance burden`);
      recommendations.push(`2. Consider creating utility methods or helper classes`);
      recommendations.push('');
    }
    
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      recommendations.push(`### ⚠️ Review Breaking Changes (${report.breakingChanges.count} found)`);
      recommendations.push(`1. Ensure all call sites are updated`);
      recommendations.push(`2. Consider deprecation strategy for public APIs`);
      recommendations.push('');
    }
    
    return recommendations.join('\n');
  }
}



