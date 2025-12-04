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
      const highSeverityComments = fileComments.filter((c) => c.severity === 'high');
      
      for (const comment of highSeverityComments.slice(0, 10)) {
        try {
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
        } catch (error) {
          console.error(`  ✗ Failed to post comment on ${comment.file}:${comment.line}`, error);
        }
      }

      // Post remaining comments as a summary in PR comment
      const remainingComments = fileComments.filter((c) => c.severity !== 'high');
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
    return `**${comment.severity.toUpperCase()}**: ${comment.message}\n\n**Suggestion**: ${comment.suggestion}`;
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



