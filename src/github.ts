import { Octokit } from '@octokit/rest';

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PRData {
  number: number;
  title: string;
  body: string | null;
  state: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  files: PRFile[];
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async fetchPR(owner: string, repo: string, prNumber: number): Promise<PRData> {
    try {
      const [prResponse, filesResponse] = await Promise.all([
        this.octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: prNumber,
        }),
        this.octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: prNumber,
        }),
      ]);

      const pr = prResponse.data;
      const files = filesResponse.data;

      return {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha,
        },
        files: files.map((file) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch || undefined,
        })),
      };
    } catch (error: any) {
      // Re-throw with better context
      if (error.status === 401) {
        throw new Error('GitHub authentication failed. Check your token.');
      }
      if (error.status === 404) {
        throw new Error(`PR #${prNumber} not found in ${owner}/${repo}`);
      }
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        throw new Error(`Connection failed: ${error.message}. Check internet/VPN.`);
      }
      throw error;
    }
  }

  async postComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }

  /**
   * Get file commit history
   */
  async getFileCommits(owner: string, repo: string, filepath: string): Promise<Array<{ author: string; date: string }>> {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        path: filepath,
        per_page: 50, // Get last 50 commits
      });

      return response.data.map(commit => ({
        author: commit.author?.login || commit.commit.author?.name || 'unknown',
        date: commit.commit.author?.date || new Date().toISOString(),
      }));
    } catch (error) {
      // Return empty array on error
      return [];
    }
  }

  async postReviewComment(
    owner: string,
    repo: string,
    prNumber: number,
    commitId: string,
    path: string,
    line: number,
    body: string
  ): Promise<void> {
    await this.octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitId,
      path,
      line,
      body,
    });
  }

  /**
   * Post review comment with suggestion (shows "Apply suggestion" button in GitHub)
   * GitHub suggestions use special format: ```suggestion code blocks
   */
  async postReviewCommentWithSuggestion(
    owner: string,
    repo: string,
    prNumber: number,
    commitId: string,
    path: string,
    line: number,
    issue: string,
    originalCode: string,
    suggestedCode: string,
    explanation?: string
  ): Promise<void> {
    // GitHub suggestion format: wrap code in ```suggestion block
    let body = `${issue}\n\n`;
    
    if (explanation) {
      body += `${explanation}\n\n`;
    }
    
    body += `\`\`\`suggestion\n${suggestedCode}\n\`\`\``;
    
    await this.octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitId,
      path,
      line,
      body,
    });
  }

  /**
   * Get repository tree (all files) from a branch
   */
  async getRepositoryTree(owner: string, repo: string, branch: string): Promise<Array<{ path: string; sha: string }>> {
    try {
      // Get branch reference
      const refResponse = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });

      const commitSha = refResponse.data.object.sha;

      // Get commit
      const commitResponse = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: commitSha,
      });

      const treeSha = commitResponse.data.tree.sha;

      // Get tree recursively
      const treeResponse = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: treeSha,
        recursive: '1',
      });

      // Filter for blobs (files) only
      return (treeResponse.data.tree || [])
        .filter((item: any) => item.type === 'blob')
        .map((item: any) => ({
          path: item.path,
          sha: item.sha,
        }));
    } catch (error: any) {
      console.error(`Failed to get repository tree: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(response.data)) {
        return null; // Directory, not a file
      }

      if (response.data.type !== 'file') {
        return null;
      }

      // Decode base64 content
      if ('content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return content;
      }

      return null;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // File not found
      }
      console.warn(`Failed to get file content for ${path}: ${error.message}`);
      return null;
    }
  }

  /**
   * List all review comments (inline comments) on a PR
   * Uses pagination to get ALL comments (not just first 30)
   */
  async listReviewComments(owner: string, repo: string, prNumber: number): Promise<Array<{ id: number; path: string; line: number }>> {
    try {
      // Use paginate to get ALL comments across all pages
      const comments = await this.octokit.paginate(
        this.octokit.rest.pulls.listReviewComments,
        {
          owner,
          repo,
          pull_number: prNumber,
          per_page: 100, // Max per page (GitHub limit)
        }
      );

      return comments.map(comment => ({
        id: comment.id,
        path: comment.path || '',
        line: comment.line || 0,
      }));
    } catch (error: any) {
      console.error(`Failed to list review comments: ${error.message}`);
      return [];
    }
  }

  /**
   * Delete a review comment (inline comment) by ID
   */
  async deleteReviewComment(owner: string, repo: string, commentId: number): Promise<void> {
    try {
      await this.octokit.rest.pulls.deleteReviewComment({
        owner,
        repo,
        comment_id: commentId,
      });
    } catch (error: any) {
      if (error.status === 404) {
        console.warn(`Review comment ${commentId} not found (may have been already deleted)`);
        return;
      }
      throw new Error(`Failed to delete review comment ${commentId}: ${error.message}`);
    }
  }

  /**
   * List all issue comments (PR conversation comments) on a PR
   * Uses pagination to get ALL comments (not just first 30)
   */
  async listIssueComments(owner: string, repo: string, prNumber: number): Promise<Array<{ id: number; body: string }>> {
    try {
      // Use paginate to get ALL comments across all pages
      const comments = await this.octokit.paginate(
        this.octokit.rest.issues.listComments,
        {
          owner,
          repo,
          issue_number: prNumber,
          per_page: 100, // Max per page (GitHub limit)
        }
      );

      return comments.map(comment => ({
        id: comment.id,
        body: comment.body || '',
      }));
    } catch (error: any) {
      console.error(`Failed to list issue comments: ${error.message}`);
      return [];
    }
  }

  /**
   * Delete an issue comment (PR conversation comment) by ID
   */
  async deleteIssueComment(owner: string, repo: string, commentId: number): Promise<void> {
    try {
      await this.octokit.rest.issues.deleteComment({
        owner,
        repo,
        comment_id: commentId,
      });
    } catch (error: any) {
      if (error.status === 404) {
        console.warn(`Issue comment ${commentId} not found (may have been already deleted)`);
        return;
      }
      throw new Error(`Failed to delete issue comment ${commentId}: ${error.message}`);
    }
  }

  /**
   * Delete all comments on a PR (both review comments and issue comments)
   * Optimized: Deletes in parallel batches for faster execution
   */
  async deleteAllPRComments(owner: string, repo: string, prNumber: number): Promise<{ reviewComments: number; issueComments: number }> {
    console.log(`\n🗑️  Deleting all comments on PR #${prNumber}...\n`);

    // Get all review comments (inline comments)
    const reviewComments = await this.listReviewComments(owner, repo, prNumber);
    console.log(`  Found ${reviewComments.length} review comment(s) (inline comments)`);

    // Get all issue comments (PR conversation comments)
    const issueComments = await this.listIssueComments(owner, repo, prNumber);
    console.log(`  Found ${issueComments.length} issue comment(s) (PR conversation comments)\n`);

    if (reviewComments.length === 0 && issueComments.length === 0) {
      console.log('  ✓ No comments to delete.\n');
      return { reviewComments: 0, issueComments: 0 };
    }

    // Delete in parallel batches (10 at a time to respect rate limits)
    const BATCH_SIZE = 10;
    let deletedReview = 0;
    let deletedIssue = 0;
    let failedReview = 0;
    let failedIssue = 0;

    // Delete review comments in batches
    if (reviewComments.length > 0) {
      console.log(`  🗑️  Deleting ${reviewComments.length} review comment(s)...`);
      for (let i = 0; i < reviewComments.length; i += BATCH_SIZE) {
        const batch = reviewComments.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(comment => this.deleteReviewComment(owner, repo, comment.id))
        );
        
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            deletedReview++;
            const comment = batch[idx];
            console.log(`  ✓ Deleted review comment #${comment.id} (${comment.path}:${comment.line})`);
          } else {
            failedReview++;
            const comment = batch[idx];
            console.error(`  ✗ Failed to delete review comment #${comment.id}: ${result.reason?.message || 'Unknown error'}`);
          }
        });

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < reviewComments.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    // Delete issue comments in batches
    if (issueComments.length > 0) {
      console.log(`\n  🗑️  Deleting ${issueComments.length} issue comment(s)...`);
      for (let i = 0; i < issueComments.length; i += BATCH_SIZE) {
        const batch = issueComments.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(comment => this.deleteIssueComment(owner, repo, comment.id))
        );
        
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            deletedIssue++;
            const comment = batch[idx];
            console.log(`  ✓ Deleted issue comment #${comment.id}`);
          } else {
            failedIssue++;
            const comment = batch[idx];
            console.error(`  ✗ Failed to delete issue comment #${comment.id}: ${result.reason?.message || 'Unknown error'}`);
          }
        });

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < issueComments.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    console.log(`\n✅ Deleted ${deletedReview} review comment(s) and ${deletedIssue} issue comment(s)`);
    if (failedReview > 0 || failedIssue > 0) {
      console.log(`  ⚠️  Failed to delete ${failedReview} review comment(s) and ${failedIssue} issue comment(s)`);
    }
    console.log('');

    return { reviewComments: deletedReview, issueComments: deletedIssue };
  }
}


