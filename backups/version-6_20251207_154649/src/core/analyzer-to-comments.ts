/**
 * Direct Analyzer-to-Comment Converter
 * Converts analyzer results directly to review comments without relying only on LLM
 */

import { LogicBug } from '../analysis/logic-bugs.js';
import { SecurityIssue } from '../analysis/security.js';
import { PerformanceIssue } from '../analysis/performance.js';
import { LocatorSuggestion } from '../analysis/locator-suggestions.js';
import { ArchitectureViolation } from '../rules/engine.js';
import { ReviewComment } from '../llm.js';

export class AnalyzerToCommentConverter {
  /**
   * Convert logic bugs to review comments
   */
  convertLogicBugs(bugs: LogicBug[]): ReviewComment[] {
    return bugs.map(bug => ({
      file: bug.file,
      line: bug.line,
      severity: this.mapSeverity(bug.severity),
      message: this.formatLogicBugMessage(bug),
      suggestion: bug.suggestion,
      confidence: this.mapConfidence(bug.confidence),
    }));
  }

  /**
   * Convert security issues to review comments
   */
  convertSecurityIssues(issues: SecurityIssue[]): ReviewComment[] {
    const comments: ReviewComment[] = [];
    
    for (const issue of issues) {
      if (issue.line !== undefined && issue.line !== null) {
        comments.push({
          file: issue.file,
          line: issue.line,
          severity: this.mapSeverity(issue.severity),
          message: this.formatSecurityMessage(issue),
          suggestion: issue.suggestion,
          confidence: issue.cvssScore ? issue.cvssScore / 10 : 0.8,
        });
      }
    }
    
    return comments;
  }

  /**
   * Convert architecture violations to review comments
   */
  convertArchitectureViolations(violations: ArchitectureViolation[]): ReviewComment[] {
    return violations.map(violation => ({
      file: violation.file,
      line: violation.line,
      severity: violation.severity,
      message: this.formatArchitectureMessage(violation),
      suggestion: violation.suggestion || 'Review architecture guidelines',
      confidence: 0.85,
    }));
  }

  /**
   * Format architecture violation message
   */
  private formatArchitectureMessage(violation: ArchitectureViolation): string {
    let message = `🏗️ **Architecture Violation: ${violation.rule}**\n\n`;
    message += `${violation.message}\n\n`;
    
    if (violation.rule.startsWith('SOLID-')) {
      const principle = violation.rule.split('-')[1];
      message += `**SOLID Principle:** ${this.getSOLIDPrincipleName(principle)}\n\n`;
    }

    return message;
  }

  /**
   * Get SOLID principle name
   */
  private getSOLIDPrincipleName(abbrev: string): string {
    const names: Record<string, string> = {
      'SRP': 'Single Responsibility Principle',
      'OCP': 'Open/Closed Principle',
      'LSP': 'Liskov Substitution Principle',
      'ISP': 'Interface Segregation Principle',
      'DIP': 'Dependency Inversion Principle',
    };
    return names[abbrev] || abbrev;
  }

  /**
   * Convert locator suggestions to review comments (inline)
   */
  convertLocatorSuggestions(suggestions: LocatorSuggestion[]): ReviewComment[] {
    return suggestions.map(suggestion => ({
      file: suggestion.file,
      line: suggestion.line,
      severity: this.mapPriorityToSeverity(suggestion.priority),
      message: this.formatLocatorMessage(suggestion),
      suggestion: this.formatLocatorSuggestion(suggestion),
      confidence: 0.9, // High confidence for locator suggestions
    }));
  }

  /**
   * Format locator suggestion message
   */
  private formatLocatorMessage(suggestion: LocatorSuggestion): string {
    let message = `🎯 **Better Locator Suggestion**\n\n`;
    message += `**Current:** \`${suggestion.currentLocator}\`\n\n`;
    message += `**Reason:** ${suggestion.reason}\n\n`;
    
    if (suggestion.stabilityScore) {
      message += `**Stability Score:** ${suggestion.stabilityScore}/10 ⭐\n\n`;
    }

    return message;
  }

  /**
   * Format locator suggestion with 2 options
   */
  private formatLocatorSuggestion(suggestion: LocatorSuggestion): string {
    let suggestionText = `**Option 1 (Recommended):**\n\`\`\`\n${suggestion.suggestedLocator}\n\`\`\`\n`;
    
    if (suggestion.stabilityScore) {
      suggestionText += `*Stability: ${suggestion.stabilityScore}/10*\n\n`;
    }

    if (suggestion.alternativeLocator) {
      suggestionText += `**Option 2:**\n\`\`\`\n${suggestion.alternativeLocator}\n\`\`\`\n`;
      
      if (suggestion.alternativeStabilityScore) {
        suggestionText += `*Stability: ${suggestion.alternativeStabilityScore}/10*\n\n`;
      }
    }

    if (suggestion.example) {
      suggestionText += `\n**Example:**\n\`\`\`\n${suggestion.example}\n\`\`\``;
    }

    return suggestionText;
  }

  /**
   * Map priority to severity
   */
  private mapPriorityToSeverity(priority: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
    return priority;
  }

  /**
   * Convert performance issues to review comments
   */
  convertPerformanceIssues(issues: PerformanceIssue[]): ReviewComment[] {
    const comments: ReviewComment[] = [];
    
    for (const issue of issues) {
      if (issue.line !== undefined && issue.line !== null) {
        comments.push({
          file: issue.file,
          line: issue.line,
          severity: this.mapSeverity(issue.severity),
          message: this.formatPerformanceMessage(issue),
          suggestion: issue.suggestion,
          confidence: 0.85, // High confidence for performance issues
        });
      }
    }
    
    return comments;
  }

  /**
   * Format logic bug message
   */
  private formatLogicBugMessage(bug: LogicBug): string {
    const typeMessages: Record<LogicBug['type'], string> = {
      null_check: `⚠️ **Missing Null Check**\n\n${bug.message}`,
      division_by_zero: `🚨 **Division by Zero Risk**\n\n${bug.message}`,
      off_by_one: `⚠️ **Potential Off-by-One Error**\n\n${bug.message}`,
      missing_validation: `⚠️ **Missing Input Validation**\n\n${bug.message}`,
      array_bounds: `🚨 **Array Bounds Issue**\n\n${bug.message}`,
      type_error: `⚠️ **Type Error Risk**\n\n${bug.message}`,
      logic_error: `⚠️ **Logic Error**\n\n${bug.message}`,
    };

    let message = typeMessages[bug.type] || bug.message;
    
    if (bug.codeSnippet) {
      message += `\n\n**Code:**\n\`\`\`\n${bug.codeSnippet}\n\`\`\``;
    }

    return message;
  }

  /**
   * Format security message
   */
  private formatSecurityMessage(issue: SecurityIssue): string {
    let message = `🚨 **${issue.type}**\n\n${issue.message}`;
    
    if (issue.cwe) {
      message += `\n\n**CWE:** ${issue.cwe}`;
    }
    
    if (issue.owaspCategory) {
      message += `\n**OWASP:** ${issue.owaspCategory}`;
    }
    
    if (issue.cvssScore) {
      message += `\n**CVSS Score:** ${issue.cvssScore.toFixed(1)}/10`;
    }

    return message;
  }

  /**
   * Format performance message
   */
  private formatPerformanceMessage(issue: PerformanceIssue): string {
    let message = `⚡ **${issue.type}**\n\n${issue.message}`;
    
    if (issue.method) {
      message += `\n\n**Method:** \`${issue.method}\``;
    }

    return message;
  }

  /**
   * Map analyzer severity to review comment severity
   */
  private mapSeverity(severity: 'critical' | 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'critical':
        return 'high';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Map confidence level to number
   */
  private mapConfidence(confidence: 'high' | 'medium' | 'low'): number {
    switch (confidence) {
      case 'high':
        return 0.9;
      case 'medium':
        return 0.7;
      case 'low':
        return 0.5;
      default:
        return 0.7;
    }
  }

  /**
   * Combine and deduplicate comments
   * Removes duplicates based on file, line, and message similarity
   */
  deduplicateComments(comments: ReviewComment[]): ReviewComment[] {
    const seen = new Map<string, ReviewComment>();
    
    for (const comment of comments) {
      const key = `${comment.file}:${comment.line}:${comment.message.substring(0, 50)}`;
      
      if (!seen.has(key)) {
        seen.set(key, comment);
      } else {
        // If duplicate found, keep the one with higher confidence
        const existing = seen.get(key)!;
        if ((comment.confidence || 0) > (existing.confidence || 0)) {
          seen.set(key, comment);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Sort comments by priority (high severity first, then by line number)
   */
  sortByPriority(comments: ReviewComment[]): ReviewComment[] {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    
    return comments.sort((a, b) => {
      // First by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      
      // Then by file
      if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }
      
      // Finally by line number
      return a.line - b.line;
    });
  }
}


