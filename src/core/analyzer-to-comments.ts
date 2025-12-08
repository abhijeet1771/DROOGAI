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
  private prFiles: Array<{ filename: string; patch?: string }> = [];
  private geminiKey?: string;
  private llmModel?: any;

  /**
   * Set PR files for line number mapping
   */
  setPRFiles(prFiles: Array<{ filename: string; patch?: string }>): void {
    this.prFiles = prFiles;
  }

  /**
   * Set Gemini API key for LLM-based comment merging
   */
  async setGeminiKey(geminiKey?: string): Promise<void> {
    this.geminiKey = geminiKey;
    if (geminiKey) {
      await this.initializeLLM(geminiKey);
    }
  }

  /**
   * Initialize LLM model for comment merging
   */
  private async initializeLLM(apiKey: string): Promise<void> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      this.llmModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    } catch (error) {
      console.warn('⚠️  Failed to initialize LLM for comment merging:', (error as any).message);
      this.llmModel = null;
    }
  }

  /**
   * Convert logic bugs to review comments
   */
  convertLogicBugs(bugs: LogicBug[]): ReviewComment[] {
    const comments: ReviewComment[] = [];
    
    for (const bug of bugs) {
      // Map full file line to PR diff line
      const prLine = this.mapFileLineToPRLine(bug.file, bug.line);
      if (prLine === null) {
        // Line not in PR diff, skip inline comment (will be in summary)
        continue;
      }
      
      comments.push({
        file: bug.file,
        line: prLine, // Use PR line number
        severity: this.mapSeverity(bug.severity),
        message: this.formatLogicBugMessage(bug),
        suggestion: bug.suggestion,
        confidence: this.mapConfidence(bug.confidence),
      });
    }
    
    return comments;
  }

  /**
   * Convert security issues to review comments
   */
  convertSecurityIssues(issues: SecurityIssue[]): ReviewComment[] {
    const comments: ReviewComment[] = [];
    
    for (const issue of issues) {
      if (issue.line !== undefined && issue.line !== null) {
        // Map full file line to PR diff line
        const prLine = this.mapFileLineToPRLine(issue.file, issue.line);
        if (prLine === null) {
          // Line not in PR diff, skip inline comment (will be in summary)
          continue;
        }
        
        comments.push({
          file: issue.file,
          line: prLine, // Use PR line number
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
    const comments: ReviewComment[] = [];
    
    for (const violation of violations) {
      // Map full file line to PR diff line
      const prLine = this.mapFileLineToPRLine(violation.file, violation.line);
      if (prLine === null) {
        // Line not in PR diff, skip inline comment (will be in summary)
        continue;
      }
      
      comments.push({
        file: violation.file,
        line: prLine, // Use PR line number
        severity: violation.severity,
        message: this.formatArchitectureMessage(violation),
        suggestion: violation.suggestion || 'Review architecture guidelines',
        confidence: 0.85,
      });
    }
    
    return comments;
  }

  /**
   * Format architecture violation message - Human language, non-technical
   */
  private formatArchitectureMessage(violation: ArchitectureViolation): string {
    // Convert technical architecture messages to human language
    let humanMessage = violation.message;
    
    if (violation.rule.startsWith('SOLID-')) {
      const principle = violation.rule.split('-')[1];
      const principleName = this.getSOLIDPrincipleName(principle);
      
      // Convert SOLID violations to human language
      if (principle === 'DIP') {
        humanMessage = `You're creating ${violation.message.toLowerCase().includes('authservice') ? 'AuthService' : 'a class'} directly in your code. This makes it hard to test and change later. Instead, use dependency injection - pass it as a parameter or use an interface.`;
      } else if (principle === 'SRP') {
        humanMessage = `This class or method is doing too many things at once. It's better to split it into smaller, focused pieces that each do one thing well.`;
      } else if (principle === 'OCP') {
        humanMessage = `This code will need to be modified every time you want to add a new feature. It's better to design it so you can extend it without changing the existing code.`;
      } else {
        humanMessage = `I noticed an architecture issue related to ${principleName}: ${violation.message}`;
      }
    } else {
      humanMessage = `I noticed an architecture issue: ${violation.message}`;
    }
    
    let message = `🏗️ **Architecture Issue**\n\n${humanMessage}`;
    
    if (violation.rule.startsWith('SOLID-')) {
      const principle = violation.rule.split('-')[1];
      message += `\n\n*This relates to the ${this.getSOLIDPrincipleName(principle)} principle.*`;
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
    const comments: ReviewComment[] = [];
    
    for (const suggestion of suggestions) {
      // Map full file line to PR diff line
      const prLine = this.mapFileLineToPRLine(suggestion.file, suggestion.line);
      if (prLine === null) {
        // Line not in PR diff, skip inline comment (will be in summary)
        continue;
      }
      
      comments.push({
        file: suggestion.file,
        line: prLine, // Use PR line number
        severity: this.mapPriorityToSeverity(suggestion.priority),
        message: this.formatLocatorMessage(suggestion),
        suggestion: this.formatLocatorSuggestion(suggestion),
        confidence: 0.9, // High confidence for locator suggestions
      });
    }
    
    return comments;
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
        // Map full file line to PR diff line
        const prLine = this.mapFileLineToPRLine(issue.file, issue.line);
        if (prLine === null) {
          // Line not in PR diff, skip inline comment (will be in summary)
          continue;
        }
        
        comments.push({
          file: issue.file,
          line: prLine, // Use PR line number
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
   * Format logic bug message - Human language, conversational
   */
  private formatLogicBugMessage(bug: LogicBug): string {
    // Use the bug's message directly if it's already in human language
    // Otherwise convert technical message to human language
    let humanMessage = bug.message;
    
    // Convert technical messages to human language
    if (bug.message.includes('potential NullPointerException') || bug.message.includes('potential TypeError')) {
      humanMessage = bug.message
        .replace(/Parameter '(\w+)' is used without null check - potential NullPointerException/i, 
          `I noticed you're using '$1' without checking if it's null first. If it's null, your app will crash.`)
        .replace(/Parameter '(\w+)' is accessed without null\/undefined check - potential TypeError/i,
          `I noticed you're accessing '$1' without checking if it's null or undefined. This will throw an error if it's empty.`);
    }
    
    if (bug.message.includes('Division by') && bug.message.includes('without zero check')) {
      humanMessage = bug.message
        .replace(/Division by '(\w+)' without zero check - potential ArithmeticException\/Infinity/i,
          `I noticed you're dividing by '$1' without checking if it's zero first. If it's 0, your app will crash or return Infinity.`);
    }
    
    if (bug.message.includes('Function') && bug.message.includes('return value used without null check')) {
      humanMessage = bug.message
        .replace(/Function '(\w+)\(\)' return value used without null check/i,
          `I noticed you're using the result of '$1()' without checking if it's null. It might return null and crash your app.`);
    }
    
    // If message is already human-like, use it directly
    if (humanMessage.includes('I noticed') || humanMessage.includes('This could') || humanMessage.includes('If it')) {
      return humanMessage;
    }
    
    // Otherwise, wrap in human language
    const typeMessages: Record<LogicBug['type'], string> = {
      null_check: `I noticed a potential issue: ${humanMessage}`,
      division_by_zero: `I spotted a problem: ${humanMessage}`,
      off_by_one: `I noticed this might be off by one: ${humanMessage}`,
      missing_validation: `I noticed missing validation: ${humanMessage}`,
      array_bounds: `I spotted a potential crash: ${humanMessage}`,
      type_error: `I noticed a type issue: ${humanMessage}`,
      logic_error: `I spotted a logic problem: ${humanMessage}`,
    };

    let message = typeMessages[bug.type] || `I noticed: ${humanMessage}`;
    
    if (bug.codeSnippet) {
      message += `\n\n**Code:**\n\`\`\`\n${bug.codeSnippet}\n\`\`\``;
    }

    return message;
  }

  /**
   * Format security message - Human language, clear and actionable
   */
  private formatSecurityMessage(issue: SecurityIssue): string {
    // Convert technical security messages to human language
    let humanMessage = issue.message;
    
    if (issue.type === 'Hardcoded Secret' || issue.type === 'Hardcoded Password' || issue.type === 'Hardcoded API Key') {
      humanMessage = `I found a hardcoded ${issue.type.toLowerCase()} in your code. This is a security risk because anyone who sees your code can use it. Use environment variables or a secure vault instead.`;
    } else if (issue.type === 'SQL Injection') {
      humanMessage = `I noticed a potential SQL injection risk. User input is being used directly in a database query, which could allow attackers to run malicious SQL. Use parameterized queries instead.`;
    } else if (issue.type === 'XSS') {
      humanMessage = `I spotted a potential XSS (Cross-Site Scripting) vulnerability. User input is being displayed without sanitization, which could allow attackers to inject malicious scripts. Sanitize or escape the input before displaying it.`;
    } else {
      humanMessage = `I noticed a security issue: ${issue.message}`;
    }
    
    let message = `🚨 **${issue.type}**\n\n${humanMessage}`;
    
    // Add technical details in a less prominent way
    if (issue.cwe || issue.owaspCategory || issue.cvssScore) {
      message += `\n\n*Technical details: `;
      const details: string[] = [];
      if (issue.cwe) details.push(`CWE: ${issue.cwe}`);
      if (issue.owaspCategory) details.push(`OWASP: ${issue.owaspCategory}`);
      if (issue.cvssScore) details.push(`Severity: ${issue.cvssScore.toFixed(1)}/10`);
      message += details.join(', ') + `*`;
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
   * Improved: Merges multiple comments at same location using LLM
   * Also filters out annoying/useless comments based on context
   */
  async deduplicateComments(comments: ReviewComment[]): Promise<ReviewComment[]> {
    // First: Filter out annoying/useless comments
    const filtered = this.filterAnnoyingComments(comments);
    
    // Then: Group by file:line (same location)
    const grouped = new Map<string, ReviewComment[]>();
    for (const comment of filtered) {
      const key = `${comment.file}:${comment.line}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(comment);
    }
    
    // For each group, merge multiple comments using LLM
    const result: ReviewComment[] = [];
    let mergedCount = 0;
    for (const [key, group] of grouped) {
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Multiple comments at same location - merge them using LLM (with intelligent fallback)
        const [file, line] = key.split(':');
        
        // Try LLM merge first (if available)
        let merged: ReviewComment | null = null;
        if (this.llmModel && this.geminiKey) {
          console.log(`  🔀 Merging ${group.length} comments at ${file}:${line} using LLM...`);
          try {
            merged = await this.mergeCommentsWithLLM(group);
            if (merged) {
              result.push(merged);
              mergedCount++;
              console.log(`  ✓ Merged ${group.length} comments into 1 comprehensive comment (LLM)`);
            }
          } catch (error) {
            console.warn(`  ⚠️  LLM merge failed, using intelligent fallback:`, (error as any).message);
          }
        }
        
        // Fallback: Intelligent merge without LLM
        if (!merged) {
          merged = this.mergeCommentsIntelligently(group);
          result.push(merged);
          console.log(`  ✓ Merged ${group.length} comments into 1 comprehensive comment (fallback)`);
        }
      }
    }
    
    if (mergedCount > 0) {
      console.log(`  ✓ Successfully merged ${mergedCount} group(s) of comments`);
    }
    
    return result;
  }

  /**
   * Merge multiple comments at same location into one comprehensive comment using LLM
   */
  private async mergeCommentsWithLLM(comments: ReviewComment[]): Promise<ReviewComment | null> {
    // If no LLM available, return null (will use fallback)
    if (!this.llmModel || !this.geminiKey) {
      return null;
    }

    try {
      // Prepare comments data for LLM
      const commentsData = comments.map(c => ({
        severity: c.severity,
        message: c.message,
        suggestion: c.suggestion,
        confidence: c.confidence || 0.7,
      }));

      // Determine highest severity
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const highestSeverity = comments.reduce((max, c) => {
        const current = severityOrder[c.severity] || 0;
        const maxVal = severityOrder[max.severity] || 0;
        return current > maxVal ? c : max;
      }, comments[0]);

      // Create prompt for merging
      const mergePrompt = `You are a Senior Staff Software Engineer reviewing code. Multiple issues were found at the same code location (line ${comments[0].line} in file ${comments[0].file}).

Here are the ${comments.length} issues found at this location:

${commentsData.map((c, i) => `
Issue ${i + 1}:
- Severity: ${c.severity}
- Message: ${c.message}
- Suggestion: ${c.suggestion}
- Confidence: ${(c.confidence * 100).toFixed(0)}%
`).join('\n')}

**Task:** Merge these issues into ONE comprehensive, well-structured comment that:
1. Combines all issues naturally (don't just list them)
2. Explains the relationship between issues if they're related
3. Provides a unified code suggestion that addresses ALL issues
4. Maintains the highest severity level (${highestSeverity.severity})
5. Uses natural, conversational language (like explaining to a teammate)
6. Is concise but complete

**Response Format (JSON only, no markdown):**
{
  "message": "Merged message explaining all issues naturally",
  "suggestion": "Complete code suggestion addressing all issues",
  "severity": "${highestSeverity.severity}"
}

Return ONLY the JSON object, no other text.`;

      // Call LLM
      const response = await this.llmModel.generateContent(mergePrompt);
      const responseText = response.response.text();
      
      // Parse JSON response
      let mergedData: any;
      try {
        // Try to extract JSON from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          mergedData = JSON.parse(jsonMatch[0]);
        } else {
          mergedData = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.warn('⚠️  Failed to parse LLM merge response, using fallback');
        return null;
      }

      // Create merged comment
      const mergedComment: ReviewComment = {
        file: comments[0].file,
        line: comments[0].line,
        severity: (mergedData.severity || highestSeverity.severity) as 'high' | 'medium' | 'low',
        message: mergedData.message || this.createFallbackMergedMessage(comments),
        suggestion: mergedData.suggestion || this.createFallbackMergedSuggestion(comments),
        confidence: Math.max(...comments.map(c => c.confidence || 0.7)), // Highest confidence
      };

      return mergedComment;
    } catch (error) {
      console.warn(`⚠️  LLM merge failed for ${comments.length} comments at ${comments[0].file}:${comments[0].line}:`, (error as any).message);
      return null; // Fallback to selectBestComment
    }
  }

  /**
   * Intelligent fallback: Merge comments without LLM
   * Uses pattern-based merging to combine issues naturally
   */
  private mergeCommentsIntelligently(comments: ReviewComment[]): ReviewComment {
    // Determine highest severity
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const highestSeverity = comments.reduce((max, c) => {
      const current = severityOrder[c.severity] || 0;
      const maxVal = severityOrder[max.severity] || 0;
      return current > maxVal ? c : max;
    }, comments[0]);

    // Categorize issues
    const securityIssues = comments.filter(c => 
      (c.message || '').toLowerCase().includes('security') ||
      (c.message || '').toLowerCase().includes('secret') ||
      (c.message || '').toLowerCase().includes('credential')
    );
    const logicBugs = comments.filter(c =>
      (c.message || '').toLowerCase().includes('null') ||
      (c.message || '').toLowerCase().includes('exception') ||
      (c.message || '').toLowerCase().includes('crash') ||
      (c.message || '').toLowerCase().includes('bug')
    );
    const codeSmells = comments.filter(c =>
      (c.message || '').toLowerCase().includes('duplicate') ||
      (c.message || '').toLowerCase().includes('code smell') ||
      (c.message || '').toLowerCase().includes('refactor')
    );
    const otherIssues = comments.filter(c =>
      !securityIssues.includes(c) &&
      !logicBugs.includes(c) &&
      !codeSmells.includes(c)
    );

    // Build merged message intelligently
    let mergedMessage = '';
    const parts: string[] = [];

    if (securityIssues.length > 0) {
      if (securityIssues.length === 1) {
        parts.push(securityIssues[0].message);
      } else {
        parts.push(`Found ${securityIssues.length} security issues: ${securityIssues.map(s => s.message.split('.')[0]).join(', ')}`);
      }
    }

    if (logicBugs.length > 0) {
      if (logicBugs.length === 1) {
        parts.push(logicBugs[0].message);
      } else {
        parts.push(`Found ${logicBugs.length} logic issues: ${logicBugs.map(l => l.message.split('.')[0]).join(', ')}`);
      }
    }

    if (codeSmells.length > 0) {
      if (codeSmells.length === 1) {
        parts.push(codeSmells[0].message);
      } else {
        parts.push(`Found ${codeSmells.length} code quality issues: ${codeSmells.map(c => c.message.split('.')[0]).join(', ')}`);
      }
    }

    if (otherIssues.length > 0) {
      parts.push(...otherIssues.map(o => o.message));
    }

    // Combine parts naturally
    if (parts.length === 1) {
      mergedMessage = parts[0];
    } else if (parts.length === 2) {
      mergedMessage = `${parts[0]} Additionally, ${parts[1].toLowerCase()}`;
    } else {
      mergedMessage = `Multiple issues found at this location:\n\n${parts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nPlease review and address all of them.`;
    }

    // Merge suggestions - combine all unique suggestions
    const suggestions = new Set<string>();
    comments.forEach(c => {
      if (c.suggestion && c.suggestion.trim()) {
        suggestions.add(c.suggestion);
      }
    });
    
    let mergedSuggestion = '';
    if (suggestions.size === 1) {
      mergedSuggestion = Array.from(suggestions)[0];
    } else if (suggestions.size > 1) {
      // Use highest severity suggestion as base, mention others
      mergedSuggestion = `${highestSeverity.suggestion}\n\n**Note:** There are ${suggestions.size - 1} additional suggestion(s) to consider. Please review all issues above.`;
    } else {
      mergedSuggestion = highestSeverity.suggestion || '';
    }

    return {
      file: comments[0].file,
      line: comments[0].line,
      severity: highestSeverity.severity,
      message: mergedMessage,
      suggestion: mergedSuggestion,
      confidence: Math.max(...comments.map(c => c.confidence || 0.7)),
    };
  }

  /**
   * Fallback: Create merged message when LLM fails (legacy, now using mergeCommentsIntelligently)
   */
  private createFallbackMergedMessage(comments: ReviewComment[]): string {
    const issues = comments.map(c => `- ${c.message}`).join('\n');
    return `Multiple issues found at this location:\n\n${issues}\n\nPlease review and address all of them.`;
  }

  /**
   * Fallback: Create merged suggestion when LLM fails (legacy, now using mergeCommentsIntelligently)
   */
  private createFallbackMergedSuggestion(comments: ReviewComment[]): string {
    // Use the suggestion from highest severity comment
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const best = comments.reduce((max, c) => {
      const current = severityOrder[c.severity] || 0;
      const maxVal = severityOrder[max.severity] || 0;
      return current > maxVal ? c : max;
    }, comments[0]);
    return best.suggestion || '';
  }

  /**
   * Filter out annoying/useless comments based on context
   * Reduces noise by ~70% while keeping valuable comments
   */
  private filterAnnoyingComments(comments: ReviewComment[]): ReviewComment[] {
    return comments.filter(comment => {
      const filepath = comment.file.toLowerCase();
      const isTestFile = filepath.includes('test') || 
                         filepath.includes('spec') ||
                         filepath.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/i);
      const severity = (comment.severity || 'medium').toLowerCase();
      const message = (comment.message || '').toLowerCase();
      
      // ALWAYS KEEP: Security and critical logic bugs (regardless of file type)
      if (severity === 'critical' || severity === 'high') {
        if (message.includes('security') || 
            message.includes('secret') || 
            message.includes('credential') ||
            message.includes('null') ||
            message.includes('exception') ||
            message.includes('crash')) {
          return true; // Keep critical/high security and logic bugs
        }
      }
      
      // FOR TEST FILES: Only keep security and critical logic bugs
      if (isTestFile) {
        // Skip for test files:
        // - Documentation suggestions
        // - Observability/logging suggestions
        // - Code smells (duplicates are OK in tests)
        // - Low/medium priority issues
        if (message.includes('documentation') ||
            message.includes('jsdoc') ||
            message.includes('logging') ||
            message.includes('observability') ||
            message.includes('metrics') ||
            message.includes('code smell') ||
            message.includes('duplicate code') ||
            message.includes('reuse') ||
            severity === 'low') {
          return false; // Skip annoying comments in test files
        }
        
        // Keep only high/critical in test files
        if (severity !== 'high' && severity !== 'critical') {
          return false;
        }
      }
      
      // FOR PRODUCTION FILES: Keep all high/critical, filter medium/low
      if (!isTestFile) {
        // Skip low priority in production too (move to summary)
        if (severity === 'low') {
          return false;
        }
      }
      
      // Skip circular duplicate suggestions (A → B, B → A)
      if (message.includes('reuse') && message.includes('unknown')) {
        return false; // Skip "unknown" method reuse suggestions
      }
      
      return true; // Keep everything else
    });
  }

  /**
   * Select best comment from a group (same file:line)
   * Priority: 1. Severity (high > medium > low), 2. Confidence, 3. Better suggestion
   */
  private selectBestComment(comments: ReviewComment[]): ReviewComment {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    
    // Sort by severity (desc), then confidence (desc), then suggestion length (more detailed)
    return comments.sort((a, b) => {
      // First: Severity
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      
      // Second: Confidence
      const confidenceDiff = (b.confidence || 0) - (a.confidence || 0);
      if (confidenceDiff !== 0) return confidenceDiff;
      
      // Third: Suggestion quality (longer = more detailed)
      return (b.suggestion?.length || 0) - (a.suggestion?.length || 0);
    })[0];
  }

  /**
   * Map full file line number to PR diff line number (line number in NEW file after changes)
   * Returns null if line is not in the PR diff
   * 
   * GitHub PR inline comments use the line number in the NEW file (after changes), not diff line number
   */
  private mapFileLineToPRLine(filepath: string, fileLine: number): number | null {
    const prFile = this.prFiles.find(f => f.filename === filepath);
    if (!prFile || !prFile.patch) {
      // File not in PR or no patch, can't map
      return null;
    }
    
    const patch = prFile.patch;
    const lines = patch.split('\n');
    let newFileLineNumber = 0; // Line number in NEW file (this is what GitHub API needs)
    
    for (const line of lines) {
      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      // Example: @@ -10,5 +15,5 @@ means:
      //   - Old file: lines 10-14 (5 lines)
      //   - New file: lines 15-19 (5 lines)
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          // match[2] is newStart - where new file lines start in this hunk
          newFileLineNumber = parseInt(match[2], 10) - 1; // -1 because we'll increment on next line
        }
        continue;
      }
      
      // Skip deleted lines (they're not in new file, so don't increment counter)
      if (line.startsWith('-')) {
        continue;
      }
      
      // Added lines (start with +) are in new file
      if (line.startsWith('+')) {
        newFileLineNumber++;
        if (newFileLineNumber === fileLine) {
          // Found the line! Return the line number in NEW file
          return newFileLineNumber;
        }
        continue;
      }
      
      // Context lines (start with space) are also in new file (unchanged lines shown for context)
      if (line.startsWith(' ')) {
        newFileLineNumber++;
        if (newFileLineNumber === fileLine) {
          // Found the line! Return the line number in NEW file
          return newFileLineNumber;
        }
        continue;
      }
    }
    
    // Line not found in PR diff (not in any hunk, or line was deleted)
    return null;
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


