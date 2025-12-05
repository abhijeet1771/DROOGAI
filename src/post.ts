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
    // Post ALL comments as inline comments (not just high/critical)
    for (const [file, fileComments] of commentsByFile) {
      // GitHub API limits: 50 comments per PR review
      // Post all comments as inline comments (up to 50 per file to be safe)
      const commentsToPost = fileComments.slice(0, 50);
      
      if (commentsToPost.length > 0) {
        console.log(`  📌 Found ${commentsToPost.length} comment(s) for ${file} - posting as inline comments...`);
      }
      
      for (const comment of commentsToPost) {
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
}



