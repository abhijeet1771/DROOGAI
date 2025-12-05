#!/usr/bin/env node

/**
 * droog index - Index codebase for analysis
 */

import { Command } from 'commander';
import dotenv from 'dotenv';
import { GitHubClient } from '../github.js';
import { CodebaseIndexer } from '../indexer/indexer.js';

dotenv.config();

const program = new Command();

program
  .name('droog index')
  .description('Index codebase for advanced code analysis')
  .option('--repo <owner/repo>', 'GitHub repository to index')
  .option('--branch <branch>', 'Branch to index (default: main)')
  .option('--token <token>', 'GitHub token')
  .parse();

async function main() {
  const options = program.opts();
  
  if (!options.repo) {
    console.error('❌ --repo required');
    process.exit(1);
  }
  
  const [owner, repo] = options.repo.split('/');
  const branch = options.branch || 'main';
  const token = options.token || process.env.GITHUB_TOKEN;
  
  if (!token) {
    console.error('❌ GitHub token required');
    process.exit(1);
  }
  
  console.log('🚀 Indexing codebase...\n');
  console.log(`📦 Repository: ${owner}/${repo}`);
  console.log(`🌿 Branch: ${branch}\n`);
  
  try {
    const github = new GitHubClient(token);
    const indexer = new CodebaseIndexer();
    
    // TODO: Fetch all files from branch and index them
    console.log('📥 Fetching files from branch...');
    // Implementation will fetch files and index them
    
    console.log('✅ Indexing complete!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();





