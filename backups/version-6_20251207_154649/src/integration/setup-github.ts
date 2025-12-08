#!/usr/bin/env node
/**
 * GitHub Integration Setup
 * Creates GitHub Actions workflows for automatic PR review and index updates
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';

// Use current working directory (where command is run)
const WORKFLOWS_DIR = join(cwd(), '.github/workflows');

const DROOG_REVIEW_WORKFLOW = `name: Droog AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to review'
        required: true
        type: string

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
    
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
        continue-on-error: true
      
      - name: Install dependencies
        run: |
          if [ -f "package-lock.json" ]; then
            npm ci
          else
            npm install
          fi
      
      - name: Build Droog AI
        run: npm run build
      
      - name: Load index if exists
        id: load-index
        run: |
          if [ -f ".droog-embeddings.json" ]; then
            echo "index_exists=true" >> $GITHUB_OUTPUT
          else
            echo "index_exists=false" >> $GITHUB_OUTPUT
          fi
        continue-on-error: true
      
      - name: Run Droog AI Review
        env:
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          PR_NUMBER="\${{ github.event.pull_request.number }}"
          if [ "\${{ github.event_name }}" = "workflow_dispatch" ]; then
            PR_NUMBER="\${{ github.event.inputs.pr_number }}"
          fi
          
          node dist/index.js review --repo "\${{ github.repository }}" --pr "\${PR_NUMBER}" --enterprise --post
      
      - name: Upload review report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: review-report
          path: report.json
          retention-days: 7
`;

const DROOG_INDEX_WORKFLOW = `name: Droog AI Index Update

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:
    inputs:
      branch:
        description: 'Branch to index'
        required: false
        default: 'main'
        type: string

jobs:
  update-index:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
        continue-on-error: true
      
      - name: Install dependencies
        run: |
          if [ -f "package-lock.json" ]; then
            npm ci
          else
            npm install
          fi
      
      - name: Build Droog AI
        run: npm run build
      
      - name: Update Index
        env:
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          BRANCH="\${{ github.ref_name }}"
          if [ "\${{ github.event_name }}" = "workflow_dispatch" ]; then
            BRANCH="\${{ github.event.inputs.branch }}"
          fi
          
          node dist/index.js index --repo "\${{ github.repository }}" --branch "\${BRANCH}"
      
      - name: Commit and push index
        if: success()
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          
          if [ -f ".droog-embeddings.json" ]; then
            git add .droog-embeddings.json
            git commit -m "🤖 Update Droog AI index [skip ci]" || echo "No changes to commit"
            git push || echo "Nothing to push"
          fi
        continue-on-error: true
`;

function setupGitHubIntegration() {
  console.log('🚀 Setting up GitHub Integration for Droog AI...\n');

  // Create .github/workflows directory
  if (!existsSync(WORKFLOWS_DIR)) {
    mkdirSync(WORKFLOWS_DIR, { recursive: true });
    console.log(`✅ Created ${WORKFLOWS_DIR} directory`);
  }

  // Create PR review workflow
  const reviewWorkflowPath = join(WORKFLOWS_DIR, 'droog-review.yml');
  writeFileSync(reviewWorkflowPath, DROOG_REVIEW_WORKFLOW);
  console.log(`✅ Created ${reviewWorkflowPath}`);

  // Create index update workflow
  const indexWorkflowPath = join(WORKFLOWS_DIR, 'droog-index.yml');
  writeFileSync(indexWorkflowPath, DROOG_INDEX_WORKFLOW);
  console.log(`✅ Created ${indexWorkflowPath}`);

  console.log('\n📝 Next Steps:');
  console.log('1. Add secrets to your GitHub repository:');
  console.log('   - GEMINI_API_KEY: Your Gemini API key');
  console.log('   - GITHUB_TOKEN: Auto-generated (or create PAT with repo permissions)');
  console.log('\n2. To add secrets:');
  console.log('   - Go to: Settings → Secrets and variables → Actions');
  console.log('   - Click "New repository secret"');
  console.log('   - Add GEMINI_API_KEY with your API key');
  console.log('\n3. The workflows will automatically:');
  console.log('   - Review PRs when opened/updated');
  console.log('   - Update index when code is merged to main');
  console.log('\n✅ GitHub integration setup complete!');
}

// Check if running directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('setup-github.ts') ||
                     process.argv[1]?.endsWith('setup-github.js');

if (isMainModule || process.argv.includes('setup-github')) {
  setupGitHubIntegration();
}

export { setupGitHubIntegration };

