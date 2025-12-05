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

    console.log(`\n📤 Posting ${comments.length} comment(s) to GitHub...\n`);

    // Group comments by file to avoid spam
    const commentsByFile = new Map<string, ReviewComment[]>();
    for (const comment of comments) {
      if (!commentsByFile.has(comment.file)) {
        commentsByFile.set(comment.file, []);
      }
      commentsByFile.get(comment.file)!.push(comment);
    }

    // Post comments with rate limiting
    for (const [file, fileComments] of commentsByFile) {
      // For each file, post a summary comment or individual comments
      // GitHub API limits: 50 comments per PR review
      // We'll post high severity issues as individual comments
      // Handle both normalized (high) and original (critical) severity values
      const highSeverityComments = fileComments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev === 'high' || sev === 'critical';
      });
      
      if (highSeverityComments.length > 0) {
        console.log(`  📌 Found ${highSeverityComments.length} high/critical severity comment(s) for ${file} - posting as inline comments...`);
      }
      
      for (const comment of highSeverityComments.slice(0, 10)) {
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

      // Post remaining comments as a summary in PR comment
      // Exclude high/critical severity (already posted as inline)
      const remainingComments = fileComments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev !== 'high' && sev !== 'critical';
      });
      if (remainingComments.length > 0) {
        const summary = this.formatSummaryComment(file, remainingComments);
        try {
          await this.github.postComment(this.owner, this.repo, this.prNumber, summary);
          console.log(`  ✓ Posted summary for ${file}`);
        } catch (error) {
          console.error(`  ✗ Failed to post summary for ${file}`, error);
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
    
    const bySeverity = {
      medium: comments.filter((c) => c.severity === 'medium'),
      low: comments.filter((c) => c.severity === 'low'),
    };

    if (bySeverity.medium.length > 0) {
      summary += '### Medium Severity\n\n';
      bySeverity.medium.forEach((c) => {
        summary += `- **Line ${c.line}**: ${c.message}\n  - *Suggestion*: ${c.suggestion}\n\n`;
      });
    }

    if (bySeverity.low.length > 0) {
      summary += '### Low Severity\n\n';
      bySeverity.low.forEach((c) => {
        summary += `- **Line ${c.line}**: ${c.message}\n  - *Suggestion*: ${c.suggestion}\n\n`;
      });
    }

    return summary;
  }
}



