/**
 * Pattern Learning System
 * Learns team patterns and codebase style from past reviews
 */

import { CodeSymbol } from '../parser/types.js';
import { ReviewComment } from '../llm.js';

export interface CodePattern {
  pattern: string;
  context: string;
  frequency: number;
  examples: string[];
  teamPreference: 'preferred' | 'discouraged' | 'neutral';
  confidence: number;
}

export interface TeamStyle {
  namingConventions: Map<string, string[]>;
  commonPatterns: CodePattern[];
  antiPatterns: CodePattern[];
  preferredPractices: string[];
}

export class PatternLearner {
  private reviewHistory: ReviewComment[] = [];
  private patterns: Map<string, CodePattern> = new Map();
  private teamStyle: TeamStyle;

  constructor() {
    this.teamStyle = {
      namingConventions: new Map(),
      commonPatterns: [],
      antiPatterns: [],
      preferredPractices: [],
    };
  }

  /**
   * Learn from past review comments
   */
  learnFromReviews(reviews: ReviewComment[]): void {
    this.reviewHistory.push(...reviews);
    this.extractPatterns(reviews);
    this.updateTeamStyle(reviews);
  }

  /**
   * Get team style preferences
   */
  getTeamStyle(): TeamStyle {
    return this.teamStyle;
  }

  /**
   * Check if code follows team patterns
   */
  checkTeamPatterns(symbols: CodeSymbol[]): {
    matches: CodePattern[];
    violations: CodePattern[];
  } {
    const matches: CodePattern[] = [];
    const violations: CodePattern[] = [];

    for (const symbol of symbols) {
      // Check naming conventions
      const namingPattern = this.checkNamingConvention(symbol);
      if (namingPattern) {
        if (namingPattern.teamPreference === 'preferred') {
          matches.push(namingPattern);
        } else if (namingPattern.teamPreference === 'discouraged') {
          violations.push(namingPattern);
        }
      }

      // Check common patterns
      const commonPattern = this.findCommonPattern(symbol);
      if (commonPattern) {
        matches.push(commonPattern);
      }
    }

    return { matches, violations };
  }

  /**
   * Suggest based on codebase style
   */
  suggestBasedOnStyle(symbol: CodeSymbol): string[] {
    const suggestions: string[] = [];
    const style = this.teamStyle;

    // Check naming
    const naming = this.checkNamingConvention(symbol);
    if (naming && naming.teamPreference === 'discouraged') {
      const preferred = style.namingConventions.get(symbol.type || 'method');
      if (preferred && preferred.length > 0) {
        suggestions.push(`Consider using ${preferred[0]} naming pattern (team preference)`);
      }
    }

    // Check patterns
    const similarPatterns = style.commonPatterns.filter(p => 
      this.symbolMatchesPattern(symbol, p)
    );
    if (similarPatterns.length > 0) {
      suggestions.push(`Similar pattern found in codebase: ${similarPatterns[0].pattern}`);
    }

    return suggestions;
  }

  /**
   * Extract patterns from reviews
   */
  private extractPatterns(reviews: ReviewComment[]): void {
    for (const review of reviews) {
      // Extract patterns from suggestions
      if (review.suggestion) {
        const pattern = this.parsePatternFromSuggestion(review.suggestion);
        if (pattern) {
          this.addPattern(pattern);
        }
      }
    }
  }

  /**
   * Update team style from reviews
   */
  private updateTeamStyle(reviews: ReviewComment[]): void {
    for (const review of reviews) {
      // Extract naming conventions
      if (review.message.includes('naming') || review.message.includes('convention')) {
        this.extractNamingConvention(review);
      }

      // Extract preferred practices
      if (review.severity === 'low' && review.message.includes('consider')) {
        this.teamStyle.preferredPractices.push(review.suggestion || review.message);
      }
    }
  }

  /**
   * Check naming convention
   */
  private checkNamingConvention(symbol: CodeSymbol): CodePattern | null {
    const type = symbol.type || 'method';
    const conventions = this.teamStyle.namingConventions.get(type);
    
    if (!conventions || conventions.length === 0) {
      return null;
    }

    // Check if symbol name follows convention
    const matches = conventions.some(conv => {
      const pattern = new RegExp(conv);
      return pattern.test(symbol.name);
    });

    return {
      pattern: `naming-${type}`,
      context: `${type} naming convention`,
      frequency: conventions.length,
      examples: conventions,
      teamPreference: matches ? 'preferred' : 'discouraged',
      confidence: 0.7,
    };
  }

  /**
   * Find common pattern
   */
  private findCommonPattern(symbol: CodeSymbol): CodePattern | null {
    for (const pattern of this.teamStyle.commonPatterns) {
      if (this.symbolMatchesPattern(symbol, pattern)) {
        return pattern;
      }
    }
    return null;
  }

  /**
   * Check if symbol matches pattern
   */
  private symbolMatchesPattern(symbol: CodeSymbol, pattern: CodePattern): boolean {
    // Simple pattern matching based on name and structure
    return symbol.name.toLowerCase().includes(pattern.pattern.toLowerCase()) ||
           (symbol.code && symbol.code.includes(pattern.pattern));
  }

  /**
   * Parse pattern from suggestion
   */
  private parsePatternFromSuggestion(suggestion: string): CodePattern | null {
    // Extract pattern keywords
    const patternKeywords = ['factory', 'singleton', 'builder', 'strategy', 'observer'];
    for (const keyword of patternKeywords) {
      if (suggestion.toLowerCase().includes(keyword)) {
        return {
          pattern: keyword,
          context: suggestion,
          frequency: 1,
          examples: [suggestion],
          teamPreference: 'preferred',
          confidence: 0.6,
        };
      }
    }
    return null;
  }

  /**
   * Extract naming convention from review
   */
  private extractNamingConvention(review: ReviewComment): void {
    // Extract naming patterns from review messages
    const namingMatch = review.message.match(/(?:use|follow|consider)\s+(\w+Case)/i);
    if (namingMatch) {
      const convention = namingMatch[1].toLowerCase();
      const type = 'method'; // Default, could be extracted from context
      if (!this.teamStyle.namingConventions.has(type)) {
        this.teamStyle.namingConventions.set(type, []);
      }
      this.teamStyle.namingConventions.get(type)!.push(convention);
    }
  }

  /**
   * Add pattern to collection
   */
  private addPattern(pattern: CodePattern): void {
    const key = pattern.pattern;
    if (this.patterns.has(key)) {
      const existing = this.patterns.get(key)!;
      existing.frequency++;
      existing.examples.push(...pattern.examples);
    } else {
      this.patterns.set(key, pattern);
    }
  }
}

