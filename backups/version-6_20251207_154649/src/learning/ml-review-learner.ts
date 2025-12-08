/**
 * ML-based Review Learning System
 * Learns from past reviews to improve suggestions
 */

import { ReviewComment } from '../llm.js';
import { CodeSymbol } from '../parser/types.js';

export interface ReviewPattern {
  issueType: string;
  codePattern: string;
  suggestion: string;
  frequency: number;
  acceptanceRate: number; // How often suggestion was accepted
  effectiveness: number; // 0-1 score
}

export interface LearnedKnowledge {
  patterns: ReviewPattern[];
  commonIssues: Map<string, number>;
  effectiveSuggestions: Map<string, string[]>;
  teamPreferences: Map<string, string>;
}

export class MLReviewLearner {
  private knowledge: LearnedKnowledge;
  private reviewHistory: ReviewComment[] = [];

  constructor() {
    this.knowledge = {
      patterns: [],
      commonIssues: new Map(),
      effectiveSuggestions: new Map(),
      teamPreferences: new Map(),
    };
  }

  /**
   * Learn from review history
   */
  learnFromHistory(reviews: ReviewComment[]): void {
    this.reviewHistory.push(...reviews);
    this.extractPatterns(reviews);
    this.updateKnowledge(reviews);
  }

  /**
   * Get improved suggestions based on learned patterns
   */
  getImprovedSuggestions(symbol: CodeSymbol, issueType: string): string[] {
    const suggestions: string[] = [];

    // Find similar patterns
    const similarPatterns = this.knowledge.patterns.filter(p => 
      p.issueType === issueType && 
      this.symbolMatchesPattern(symbol, p.codePattern)
    );

    // Use most effective suggestions
    for (const pattern of similarPatterns.sort((a, b) => b.effectiveness - a.effectiveness).slice(0, 3)) {
      if (pattern.effectiveness > 0.7) {
        suggestions.push(pattern.suggestion);
      }
    }

    // Add team preferences
    const preference = this.knowledge.teamPreferences.get(issueType);
    if (preference) {
      suggestions.push(`Team preference: ${preference}`);
    }

    return suggestions;
  }

  /**
   * Predict if issue will be accepted
   */
  predictAcceptance(comment: ReviewComment): number {
    // Find similar past reviews
    const similarReviews = this.reviewHistory.filter(r => 
      r.severity === comment.severity &&
      r.message.includes(comment.message.substring(0, 20))
    );

    if (similarReviews.length === 0) return 0.5; // Neutral

    // Calculate acceptance rate (heuristic: assume high severity = more likely accepted)
    const highSeverityCount = similarReviews.filter(r => r.severity === 'high').length;
    return highSeverityCount / similarReviews.length;
  }

  /**
   * Extract patterns from reviews
   */
  private extractPatterns(reviews: ReviewComment[]): void {
    for (const review of reviews) {
      // Extract issue type
      const issueType = this.categorizeIssue(review);
      
      // Extract code pattern
      const codePattern = this.extractCodePattern(review);
      
      // Find or create pattern
      let pattern = this.knowledge.patterns.find(p => 
        p.issueType === issueType && p.codePattern === codePattern
      );

      if (!pattern) {
        pattern = {
          issueType,
          codePattern,
          suggestion: review.suggestion || '',
          frequency: 0,
          acceptanceRate: 0.5,
          effectiveness: 0.5,
        };
        this.knowledge.patterns.push(pattern);
      }

      pattern.frequency++;
    }
  }

  /**
   * Update knowledge base
   */
  private updateKnowledge(reviews: ReviewComment[]): void {
    for (const review of reviews) {
      // Track common issues
      const issueType = this.categorizeIssue(review);
      const currentCount = this.knowledge.commonIssues.get(issueType) || 0;
      this.knowledge.commonIssues.set(issueType, currentCount + 1);

      // Track effective suggestions
      if (review.suggestion) {
        if (!this.knowledge.effectiveSuggestions.has(issueType)) {
          this.knowledge.effectiveSuggestions.set(issueType, []);
        }
        const suggestions = this.knowledge.effectiveSuggestions.get(issueType)!;
        if (!suggestions.includes(review.suggestion)) {
          suggestions.push(review.suggestion);
        }
      }
    }
  }

  /**
   * Categorize issue type
   */
  private categorizeIssue(review: ReviewComment): string {
    const message = review.message.toLowerCase();
    
    if (message.includes('security') || message.includes('vulnerability')) return 'security';
    if (message.includes('performance') || message.includes('slow')) return 'performance';
    if (message.includes('duplicate') || message.includes('similar')) return 'duplication';
    if (message.includes('complexity') || message.includes('complex')) return 'complexity';
    if (message.includes('test') || message.includes('coverage')) return 'testing';
    if (message.includes('naming') || message.includes('convention')) return 'style';
    
    return 'general';
  }

  /**
   * Extract code pattern from review
   */
  private extractCodePattern(review: ReviewComment): string {
    // Extract pattern from suggestion or message
    const text = (review.suggestion || review.message).toLowerCase();
    
    // Common patterns
    if (text.includes('stringbuilder')) return 'string-concatenation';
    if (text.includes('optional')) return 'null-handling';
    if (text.includes('stream')) return 'loop-optimization';
    if (text.includes('preparedstatement')) return 'sql-injection';
    
    return 'general';
  }

  /**
   * Check if symbol matches pattern
   */
  private symbolMatchesPattern(symbol: CodeSymbol, pattern: string): boolean {
    if (!symbol.code) return false;
    
    const code = symbol.code.toLowerCase();
    
    switch (pattern) {
      case 'string-concatenation':
        return code.includes('+=') && code.includes('string');
      case 'null-handling':
        return code.includes('null') && !code.includes('optional');
      case 'loop-optimization':
        return code.includes('for') && !code.includes('stream');
      case 'sql-injection':
        return code.includes('executequery') && code.includes('+');
      default:
        return true;
    }
  }
}

