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
}


