import { GitHubClient } from './github.js';
import { ReviewComment } from './llm.js';

export class CommentPoster {
  private github: GitHubClient;
  private owner: string;
  private repo: string;
  private prNumber: number;
  private commitId: string;

  constructor(
    github: GitHubClient,
    owner: string,
    repo: string,
    prNumber: number,
    commitId: string
  ) {
    this.github = github;
    this.owner = owner;
    this.repo = repo;
    this.prNumber = prNumber;
    this.commitId = commitId;
  }

  async postComments(comments: ReviewComment[]): Promise<void> {
    if (comments.length === 0) {
      console.log('\n✓ No comments to post.');
      return;
    }

    // RISK-FOCUSED: Only post comments related to "what will break"
    // Filter out traditional code review comments (security, maintainability, style)
    const riskFocusedComments = this.filterRiskFocusedComments(comments);
    
    if (riskFocusedComments.length === 0) {
      console.log('\n✓ No risk-focused comments to post (no breaking changes detected).');
      return;
    }

    console.log(`\n📤 Posting ${riskFocusedComments.length} risk-focused comment(s) to GitHub...\n`);

    // Group comments by file to avoid spam
    const commentsByFile = new Map<string, ReviewComment[]>();
    for (const comment of riskFocusedComments) {
      if (!commentsByFile.has(comment.file)) {
        commentsByFile.set(comment.file, []);
      }
      commentsByFile.get(comment.file)!.push(comment);
    }

    // Post comments with rate limiting
    // Post high/critical as inline, medium/low as summary
    for (const [file, fileComments] of commentsByFile) {
      // Separate high/critical from medium/low
      const highSeverityComments = fileComments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev === 'high' || sev === 'critical';
      });
      
      const mediumLowComments = fileComments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev !== 'high' && sev !== 'critical';
      });
      
      // Post high/critical as inline comments (up to 20 per file)
      if (highSeverityComments.length > 0) {
        console.log(`  📌 Found ${highSeverityComments.length} high/critical comment(s) for ${file} - posting as inline comments...`);
        for (const comment of highSeverityComments.slice(0, 20)) {
          try {
            console.log(`  📤 Attempting to post inline comment on ${comment.file}:${comment.line}...`);
            await this.github.postReviewComment(
              this.owner,
              this.repo,
              this.prNumber,
              this.commitId,
              comment.file,
              comment.line,
              this.formatComment(comment)
            );
            console.log(`  ✓ Posted comment on ${comment.file}:${comment.line}`);
            
            // Rate limit: 1 request per second
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error: any) {
            console.error(`  ✗ Failed to post comment on ${comment.file}:${comment.line}`);
            console.error(`     Error: ${error.message || error}`);
            if (error.response) {
              console.error(`     Status: ${error.response.status}`);
              console.error(`     Response: ${JSON.stringify(error.response.data)}`);
            }
          }
        }
      }
      
      // Post medium/low as summary comment
      if (mediumLowComments.length > 0) {
        const summary = this.formatSummaryComment(file, mediumLowComments);
        if (summary.trim().length > 0 && summary !== `## Review Summary for \`${file}\`\n\n`) {
          try {
            await this.github.postComment(this.owner, this.repo, this.prNumber, summary);
            console.log(`  ✓ Posted summary for ${file} (${mediumLowComments.length} medium/low issues)`);
          } catch (error) {
            console.error(`  ✗ Failed to post summary for ${file}`, error);
          }
        }
      }
    }

    console.log('\n✓ Finished posting comments.');
  }

  private formatComment(comment: ReviewComment): string {
    // Normalize severity for display
    const sev = (comment.severity || '').toLowerCase();
    const displaySeverity = sev === 'critical' ? 'HIGH' : 
                           sev === 'major' ? 'MEDIUM' :
                           sev === 'minor' ? 'LOW' :
                           comment.severity.toUpperCase();
    return `**${displaySeverity}**: ${comment.message}\n\n**Suggestion**:\n\`\`\`java\n${comment.suggestion}\n\`\`\``;
  }

  private formatSummaryComment(file: string, comments: ReviewComment[]): string {
    let summary = `## Review Summary for \`${file}\`\n\n`;
    
    // Handle both normalized (medium/low) and original (major/minor) severity values
    const bySeverity = {
      medium: comments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev === 'medium' || sev === 'major';
      }),
      low: comments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev === 'low' || sev === 'minor' || sev === 'nitpick';
      }),
    };

    if (bySeverity.medium.length > 0) {
      summary += '### Medium Severity\n\n';
      bySeverity.medium.forEach((c) => {
        summary += `- **Line ${c.line}**: ${c.message}\n  - *Suggestion*: \`\`\`java\n${c.suggestion}\n\`\`\`\n\n`;
      });
    }

    if (bySeverity.low.length > 0) {
      summary += '### Low Severity\n\n';
      bySeverity.low.forEach((c) => {
        summary += `- **Line ${c.line}**: ${c.message}\n  - *Suggestion*: \`\`\`java\n${c.suggestion}\n\`\`\`\n\n`;
      });
    }

    // If no comments matched, return empty string (shouldn't happen, but safety check)
    if (bySeverity.medium.length === 0 && bySeverity.low.length === 0) {
      return '';
    }

    return summary;
  }

  /**
   * Filter comments to only include risk-focused ones (what will break)
   * Excludes: security, maintainability, style, general code review
   * Includes: breaking changes, test failures, performance regressions, impact issues
   */
  private filterRiskFocusedComments(comments: ReviewComment[]): ReviewComment[] {
    return comments.filter(comment => {
      const message = (comment.message || '').toLowerCase();
      const suggestion = (comment.suggestion || '').toLowerCase();
      const combined = `${message} ${suggestion}`.toLowerCase();

      // INCLUDE: Breaking change related
      if (combined.includes('breaking change') || 
          combined.includes('signature changed') ||
          combined.includes('visibility reduced') ||
          combined.includes('return type changed') ||
          combined.includes('parameter type changed') ||
          combined.includes('method removed') ||
          combined.includes('will break') ||
          combined.includes('will fail') ||
          combined.includes('compilation') ||
          combined.includes('runtime failure')) {
        return true;
      }

      // INCLUDE: Test failure related
      if (combined.includes('test will fail') ||
          combined.includes('test case') ||
          combined.includes('test method') ||
          combined.includes('failing test')) {
        return true;
      }

      // INCLUDE: Performance regression related
      if (combined.includes('performance regression') ||
          combined.includes('will be slower') ||
          combined.includes('n+1 query') ||
          combined.includes('complexity increased') ||
          combined.includes('slowdown')) {
        return true;
      }

      // INCLUDE: Impact analysis related
      if (combined.includes('impacted file') ||
          combined.includes('call site') ||
          combined.includes('affected feature') ||
          combined.includes('will be affected')) {
        return true;
      }

      // EXCLUDE: Traditional code review (security, maintainability, style)
      if (combined.includes('hardcoded credential') ||
          combined.includes('security risk') ||
          combined.includes('maintainability') ||
          combined.includes('code style') ||
          combined.includes('naming convention') ||
          combined.includes('magic number') ||
          combined.includes('code smell') ||
          combined.includes('best practice') ||
          combined.includes('consider using') ||
          combined.includes('should use') ||
          message.includes('suggestion:') && !message.includes('will break')) {
        return false;
      }

      // Default: Only include high/critical severity for risk-focused
      const sev = (comment.severity || '').toLowerCase();
      return sev === 'high' || sev === 'critical';
    });
  }
}



