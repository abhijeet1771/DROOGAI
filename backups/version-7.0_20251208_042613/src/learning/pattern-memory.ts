/**
 * Pattern Memory System (Sprint 4.1)
 * Learns from past reviews and codebase patterns to provide historical context
 */

export interface HistoricalBug {
  pattern: string;
  file: string;
  line?: number;
  date: string;
  description: string;
  fix: string;
  similarTo?: string; // Similar pattern found in current PR
}

export interface HistoricalReview {
  prNumber: number;
  date: string;
  similarChanges: string[];
  issues: string[];
  outcome: 'merged' | 'rejected' | 'fixed';
}

export interface PatternMemory {
  bugs: HistoricalBug[];
  reviews: HistoricalReview[];
  rejectedPatterns: string[]; // Patterns that were rejected in past reviews
  preferredPatterns: string[]; // Patterns that were approved
}

export interface PatternMemoryReport {
  similarBugs: HistoricalBug[];
  similarReviews: HistoricalReview[];
  rejectedPatterns: string[];
  preferredPatterns: string[];
  suggestions: string[];
  summary: string;
}

export class PatternMemorySystem {
  private memory: PatternMemory;
  private memoryFile: string = '.droog-pattern-memory.json';

  constructor() {
    this.memory = {
      bugs: [],
      reviews: [],
      rejectedPatterns: [],
      preferredPatterns: [],
    };
    this.loadMemory();
  }

  /**
   * Load pattern memory from file
   */
  private loadMemory(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.memoryFile)) {
        const data = fs.readFileSync(this.memoryFile, 'utf-8');
        this.memory = JSON.parse(data);
      }
    } catch (error) {
      // Memory file doesn't exist or is invalid - start fresh
      this.memory = {
        bugs: [],
        reviews: [],
        rejectedPatterns: [],
        preferredPatterns: [],
      };
    }
  }

  /**
   * Save pattern memory to file
   */
  private saveMemory(): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.memoryFile, JSON.stringify(this.memory, null, 2));
    } catch (error) {
      console.warn('⚠️  Failed to save pattern memory:', error);
    }
  }

  /**
   * Analyze current PR against historical patterns
   */
  analyzePatterns(
    prFiles: Map<string, string>,
    prFileNames: string[],
    detectedIssues: Array<{ file: string; line?: number; message: string; type: string }>
  ): PatternMemoryReport {
    const similarBugs: HistoricalBug[] = [];
    const similarReviews: HistoricalReview[] = [];
    const suggestions: string[] = [];

    // Check for similar bugs
    for (const issue of detectedIssues) {
      const similar = this.findSimilarBugs(issue);
      if (similar.length > 0) {
        similarBugs.push(...similar);
        suggestions.push(
          `Similar bug pattern found in ${similar[0].file} (${similar[0].date}). This was fixed by: ${similar[0].fix}`
        );
      }
    }

    // Check for similar reviews
    const similar = this.findSimilarReviews(prFileNames, detectedIssues);
    if (similar.length > 0) {
      similarReviews.push(...similar);
      similar.forEach(review => {
        if (review.outcome === 'rejected') {
          suggestions.push(
            `Similar change was rejected in PR #${review.prNumber} (${review.date}). Issues: ${review.issues.join(', ')}`
          );
        } else if (review.outcome === 'fixed') {
          suggestions.push(
            `Similar change required fixes in PR #${review.prNumber} (${review.date}). Issues: ${review.issues.join(', ')}`
          );
        }
      });
    }

    // Check for rejected patterns
    const rejected = this.checkRejectedPatterns(prFiles, detectedIssues);
    if (rejected.length > 0) {
      suggestions.push(
        `⚠️  This pattern was rejected in past reviews: ${rejected.join(', ')}`
      );
    }

    // Check for preferred patterns
    const preferred = this.checkPreferredPatterns(prFiles);
    if (preferred.length > 0) {
      suggestions.push(
        `✓  Your team prefers these patterns: ${preferred.join(', ')}`
      );
    }

    return {
      similarBugs,
      similarReviews,
      rejectedPatterns: rejected,
      preferredPatterns: preferred,
      suggestions,
      summary: this.generateSummary(similarBugs, similarReviews, rejected, preferred),
    };
  }

  /**
   * Find similar bugs from history
   */
  private findSimilarBugs(issue: { file: string; line?: number; message: string; type: string }): HistoricalBug[] {
    const similar: HistoricalBug[] = [];
    const issueLower = issue.message.toLowerCase();
    const issueType = issue.type.toLowerCase();

    for (const bug of this.memory.bugs) {
      const bugLower = bug.description.toLowerCase();
      const patternLower = bug.pattern.toLowerCase();

      // Check for similar message or pattern
      if (
        bugLower.includes(issueType) ||
        issueLower.includes(bug.pattern.toLowerCase()) ||
        this.calculateSimilarity(issueLower, bugLower) > 0.6
      ) {
        similar.push({
          ...bug,
          similarTo: issue.message,
        });
      }
    }

    return similar.slice(0, 3); // Return top 3 matches
  }

  /**
   * Find similar reviews from history
   */
  private findSimilarReviews(
    prFileNames: string[],
    detectedIssues: Array<{ file: string; message: string }>
  ): HistoricalReview[] {
    const similar: HistoricalReview[] = [];

    for (const review of this.memory.reviews) {
      // Check if similar files were changed
      const fileMatches = prFileNames.some(file => 
        review.similarChanges.some(change => file.includes(change) || change.includes(file))
      );

      // Check if similar issues were detected
      const issueMatches = detectedIssues.some(issue =>
        review.issues.some(reviewIssue => 
          issue.message.toLowerCase().includes(reviewIssue.toLowerCase()) ||
          reviewIssue.toLowerCase().includes(issue.message.toLowerCase())
        )
      );

      if (fileMatches || issueMatches) {
        similar.push(review);
      }
    }

    return similar.slice(0, 3); // Return top 3 matches
  }

  /**
   * Check if current code matches rejected patterns
   */
  private checkRejectedPatterns(
    prFiles: Map<string, string>,
    detectedIssues: Array<{ message: string }>
  ): string[] {
    const rejected: string[] = [];

    for (const pattern of this.memory.rejectedPatterns) {
      const patternLower = pattern.toLowerCase();
      
      // Check if any issue message matches rejected pattern
      for (const issue of detectedIssues) {
        if (issue.message.toLowerCase().includes(patternLower)) {
          rejected.push(pattern);
          break;
        }
      }

      // Check if code contains rejected pattern
      for (const [file, code] of prFiles.entries()) {
        if (code.toLowerCase().includes(patternLower)) {
          rejected.push(pattern);
          break;
        }
      }
    }

    return [...new Set(rejected)];
  }

  /**
   * Check if current code matches preferred patterns
   */
  private checkPreferredPatterns(prFiles: Map<string, string>): string[] {
    const preferred: string[] = [];

    for (const pattern of this.memory.preferredPatterns) {
      const patternLower = pattern.toLowerCase();
      
      // Check if code contains preferred pattern
      for (const [file, code] of prFiles.entries()) {
        if (code.toLowerCase().includes(patternLower)) {
          preferred.push(pattern);
          break;
        }
      }
    }

    return [...new Set(preferred)];
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate summary
   */
  private generateSummary(
    similarBugs: HistoricalBug[],
    similarReviews: HistoricalReview[],
    rejected: string[],
    preferred: string[]
  ): string {
    if (similarBugs.length === 0 && similarReviews.length === 0 && rejected.length === 0 && preferred.length === 0) {
      return '✅ No similar patterns found in historical reviews';
    }

    const parts: string[] = [];
    if (similarBugs.length > 0) {
      parts.push(`${similarBugs.length} similar bug(s) found`);
    }
    if (similarReviews.length > 0) {
      parts.push(`${similarReviews.length} similar review(s) found`);
    }
    if (rejected.length > 0) {
      parts.push(`${rejected.length} rejected pattern(s) detected`);
    }
    if (preferred.length > 0) {
      parts.push(`${preferred.length} preferred pattern(s) detected`);
    }

    return `⚠️  Pattern Memory: ${parts.join(', ')}`;
  }

  /**
   * Record a bug pattern (called after review)
   */
  recordBug(bug: Omit<HistoricalBug, 'date'>): void {
    this.memory.bugs.push({
      ...bug,
      date: new Date().toISOString(),
    });
    this.saveMemory();
  }

  /**
   * Record a review outcome (called after review)
   */
  recordReview(review: Omit<HistoricalReview, 'date'>): void {
    this.memory.reviews.push({
      ...review,
      date: new Date().toISOString(),
    });
    this.saveMemory();
  }

  /**
   * Record a rejected pattern
   */
  recordRejectedPattern(pattern: string): void {
    if (!this.memory.rejectedPatterns.includes(pattern)) {
      this.memory.rejectedPatterns.push(pattern);
      this.saveMemory();
    }
  }

  /**
   * Record a preferred pattern
   */
  recordPreferredPattern(pattern: string): void {
    if (!this.memory.preferredPatterns.includes(pattern)) {
      this.memory.preferredPatterns.push(pattern);
      this.saveMemory();
    }
  }
}

