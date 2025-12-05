/**
 * Code Ownership & Expertise-based Reviewer Suggestion
 * Suggests reviewers based on code ownership and expertise
 */

import { CodeSymbol } from '../parser/types.js';
import { GitHubClient } from '../github.js';

export interface CodeOwner {
  file: string;
  author: string;
  contributions: number;
  lastModified: Date;
  expertise: number; // 0-1 score
}

export interface ReviewerSuggestion {
  reviewer: string;
  reason: string;
  confidence: number;
  expertise: string[];
  recentActivity: number; // Days since last commit
}

export class ReviewerSuggester {
  private github: GitHubClient;
  private ownershipCache: Map<string, CodeOwner[]> = new Map();

  constructor(github: GitHubClient) {
    this.github = github;
  }

  /**
   * Suggest reviewers for PR based on code ownership
   */
  async suggestReviewers(
    changedFiles: string[],
    owner: string,
    repo: string
  ): Promise<ReviewerSuggestion[]> {
    const suggestions: Map<string, ReviewerSuggestion> = new Map();

    for (const file of changedFiles) {
      const owners = await this.getFileOwners(file, owner, repo);
      
      for (const codeOwner of owners) {
        if (!suggestions.has(codeOwner.author)) {
          suggestions.set(codeOwner.author, {
            reviewer: codeOwner.author,
            reason: `Primary owner of ${file}`,
            confidence: codeOwner.expertise,
            expertise: [this.inferExpertise(file)],
            recentActivity: this.daysSince(codeOwner.lastModified),
          });
        } else {
          const existing = suggestions.get(codeOwner.author)!;
          existing.confidence = Math.max(existing.confidence, codeOwner.expertise);
          existing.expertise.push(this.inferExpertise(file));
          existing.reason += `, ${file}`;
        }
      }
    }

    // Sort by confidence and recent activity
    return Array.from(suggestions.values())
      .sort((a, b) => {
        // Prioritize high confidence and recent activity
        const scoreA = a.confidence * (1 / (a.recentActivity + 1));
        const scoreB = b.confidence * (1 / (b.recentActivity + 1));
        return scoreB - scoreA;
      })
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Get file owners (who has modified this file most)
   */
  private async getFileOwners(filepath: string, owner: string, repo: string): Promise<CodeOwner[]> {
    // Check cache first
    if (this.ownershipCache.has(filepath)) {
      return this.ownershipCache.get(filepath)!;
    }

    try {
      // Get file commit history
      const commits = await this.github.getFileCommits(owner, repo, filepath);
      
      // Count contributions per author
      const authorContributions = new Map<string, { count: number; lastDate: Date }>();
      
      for (const commit of commits) {
        const author = commit.author || 'unknown';
        if (!authorContributions.has(author)) {
          authorContributions.set(author, { count: 0, lastDate: new Date(0) });
        }
        
        const data = authorContributions.get(author)!;
        data.count++;
        const commitDate = new Date(commit.date || 0);
        if (commitDate > data.lastDate) {
          data.lastDate = commitDate;
        }
      }

      // Convert to CodeOwner array
      const owners: CodeOwner[] = [];
      const totalCommits = commits.length;

      for (const [author, data] of authorContributions.entries()) {
        const contributionRatio = data.count / totalCommits;
        owners.push({
          file: filepath,
          author,
          contributions: data.count,
          lastModified: data.lastDate,
          expertise: contributionRatio, // Expertise = contribution ratio
        });
      }

      // Sort by contributions
      owners.sort((a, b) => b.contributions - a.contributions);
      
      // Cache result
      this.ownershipCache.set(filepath, owners);
      
      return owners.slice(0, 3); // Top 3 owners
    } catch (error) {
      // Fallback: infer from file path
      return this.inferOwnersFromPath(filepath);
    }
  }

  /**
   * Infer owners from file path (fallback)
   */
  private inferOwnersFromPath(filepath: string): CodeOwner[] {
    // Simple heuristic: extract team/feature from path
    const pathParts = filepath.split('/');
    const feature = pathParts[pathParts.length - 2] || 'general';
    
    return [{
      file: filepath,
      author: `team-${feature}`,
      contributions: 1,
      lastModified: new Date(),
      expertise: 0.5,
    }];
  }

  /**
   * Infer expertise from file
   */
  private inferExpertise(filepath: string): string {
    if (filepath.includes('service')) return 'Service Layer';
    if (filepath.includes('controller')) return 'API Layer';
    if (filepath.includes('repository') || filepath.includes('dao')) return 'Data Access';
    if (filepath.includes('model') || filepath.includes('entity')) return 'Domain Model';
    if (filepath.includes('util') || filepath.includes('helper')) return 'Utilities';
    return 'General';
  }

  /**
   * Calculate days since date
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

