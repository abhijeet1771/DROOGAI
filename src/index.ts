#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
import { GitHubClient } from './github.js';
import { ReviewProcessor } from './review.js';
import { CommentPoster } from './post.js';
import { ReviewReport } from './review.js';
import { EnterpriseReviewer } from './core/reviewer.js';
import { CodebaseIndexer } from './indexer/indexer.js';

dotenv.config();

const program = new Command();

// Check if using legacy format (--repo --pr without subcommand)
const isLegacyFormat = process.argv.some(arg => arg === '--repo') && 
                       process.argv.some(arg => arg === '--pr') &&
                       !process.argv[2]?.match(/^(review|index|analyze|summarize)$/);

if (isLegacyFormat) {
  // Legacy format: --repo --pr (backward compatibility)
  program
    .name('ai-code-reviewer')
    .description('AI-based code reviewer for GitHub pull requests')
    .version('2.0.0')
    .requiredOption('--repo <owner/repo>', 'GitHub repository (e.g., owner/repo)')
    .requiredOption('--pr <number>', 'Pull request number')
    .option('--token <token>', 'GitHub token (or use GITHUB_TOKEN env var)')
    .option('--gemini-key <key>', 'Gemini API key (or use GEMINI_API_KEY env var)')
    .option('--post', 'Post comments back to GitHub PR')
    .option('--enterprise', 'Use enterprise-grade review (with advanced features)')
    .option('--auto-fix', 'Enable auto code fix generation')
    .action(async (options) => {
      await runLegacyReview(options);
    });
  
  program.parse();
} else {
  // New command format
  program
    .name('droog')
    .description('DROOG AI - Enterprise-grade AI Code Reviewer')
    .version('2.0.0');
  
  program
    .command('review')
    .description('Review a GitHub PR')
    .requiredOption('--repo <owner/repo>', 'GitHub repository')
    .requiredOption('--pr <number>', 'Pull request number')
    .option('--token <token>', 'GitHub token')
    .option('--gemini-key <key>', 'Gemini API key')
    .option('--post', 'Post comments to GitHub')
    .option('--enterprise', 'Use enterprise-grade review')
    .option('--auto-fix', 'Enable auto code fix generation')
    .action(async (options) => {
      await runReview(options);
    });
  
  program
    .command('index')
    .description('Index codebase for advanced analysis')
    .requiredOption('--repo <owner/repo>', 'GitHub repository')
    .option('--branch <branch>', 'Branch to index', 'main')
    .option('--token <token>', 'GitHub token')
    .action(async (options) => {
      await runIndex(options);
    });
  
  program
    .command('analyze')
    .description('Analyze a specific file')
    .requiredOption('--file <path>', 'File path to analyze')
    .option('--repo <owner/repo>', 'GitHub repository (for context)')
    .action(async (options) => {
      await runAnalyze(options);
    });
  
  program
    .command('summarize')
    .description('Generate PR summary')
    .requiredOption('--repo <owner/repo>', 'GitHub repository')
    .requiredOption('--pr <number>', 'Pull request number')
    .option('--token <token>', 'GitHub token')
    .option('--gemini-key <key>', 'Gemini API key (required if no existing report)')
    .option('--force', 'Force new review even if report.json exists')
    .action(async (options) => {
      await runSummarize(options);
    });
  
  program
    .command('setup-github')
    .description('Setup GitHub Actions workflows for automatic PR review and index updates')
    .action(async () => {
      try {
        const { setupGitHubIntegration } = await import('./integration/setup-github.js');
        setupGitHubIntegration();
      } catch (error: any) {
        console.error('❌ Failed to setup GitHub integration:', error.message);
        process.exit(1);
      }
    });
  
  program.parse();
}

// Legacy review function (backward compatibility)
async function runLegacyReview(options: any) {
  const [owner, repo] = options.repo.split('/');
  if (!owner || !repo) {
    console.error('❌ Invalid repo format. Use: owner/repo');
    process.exit(1);
  }

  const prNumber = parseInt(options.pr, 10);
  if (isNaN(prNumber)) {
    console.error('❌ Invalid PR number');
    process.exit(1);
  }

  const githubToken = options.token || process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('❌ GitHub token required. Use --token or set GITHUB_TOKEN env var.');
    process.exit(1);
  }

  const geminiKey = options.geminiKey || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('❌ Gemini API key required. Use --gemini-key or set GEMINI_API_KEY env var.');
    process.exit(1);
  }

  if (options.enterprise) {
    await runEnterpriseReview(owner, repo, prNumber, githubToken, geminiKey, options.post, options.autoFix);
  } else {
    await runBasicReview(owner, repo, prNumber, githubToken, geminiKey, options.post);
  }
}

// Basic review (existing functionality)
async function runBasicReview(owner: string, repo: string, prNumber: number, githubToken: string, geminiKey: string, post: boolean) {
  try {
    console.log('🚀 Starting AI Code Review...\n');
    console.log(`📦 Repository: ${owner}/${repo}`);
    console.log(`🔢 PR #${prNumber}\n`);

    const github = new GitHubClient(githubToken);
    const processor = new ReviewProcessor(geminiKey);

    console.log('📥 Fetching PR data...');
    const prData = await github.fetchPR(owner, repo, prNumber);
    console.log(`✓ Found PR: "${prData.title}"`);
    console.log(`✓ Changed files: ${prData.files.length}`);
    console.log(`✓ Base: ${prData.base.ref} ← Head: ${prData.head.ref}\n`);

    console.log('🤖 Running AI analysis...');
    const report = await processor.processPR(prData);

    console.log('\n' + '='.repeat(60));
    console.log('📊 REVIEW RESULTS');
    console.log('='.repeat(60));
    console.log(`\nFound ${report.totalIssues} issue(s):`);
    console.log(`  - ${report.issuesBySeverity.high} high`);
    console.log(`  - ${report.issuesBySeverity.medium} medium`);
    console.log(`  - ${report.issuesBySeverity.low} low\n`);

    if (report.comments.length > 0) {
      console.log('Issues by file:\n');
      const byFile = new Map<string, typeof report.comments>();
      for (const comment of report.comments) {
        if (!byFile.has(comment.file)) {
          byFile.set(comment.file, []);
        }
        byFile.get(comment.file)!.push(comment);
      }

      for (const [file, comments] of byFile) {
        console.log(`📄 ${file}`);
        for (const comment of comments) {
          const emoji = comment.severity === 'high' ? '🔴' : comment.severity === 'medium' ? '🟡' : '🟢';
          console.log(`  ${emoji} Line ${comment.line} [${comment.severity.toUpperCase()}]`);
          console.log(`     ${comment.message}`);
          console.log(`     💡 ${comment.suggestion}\n`);
        }
      }
    } else {
      console.log('✨ No issues found! Great job!\n');
    }

    const reportJson = JSON.stringify(report, null, 2);
    writeFileSync('report.json', reportJson, 'utf-8');
    console.log('💾 Report saved to report.json\n');

    if (post) {
      const poster = new CommentPoster(github, owner, repo, prNumber, prData.head.sha);
      await poster.postComments(report.comments);
    }

    console.log('✅ Review complete!\n');
  } catch (error: any) {
    handleError(error, { owner, repo, prNumber });
  }
}

// Enterprise review (new functionality)
async function runEnterpriseReview(owner: string, repo: string, prNumber: number, githubToken: string, geminiKey: string, post: boolean, autoFix: boolean = false) {
  try {
    const github = new GitHubClient(githubToken);
    const reviewer = new EnterpriseReviewer(geminiKey, githubToken);

    console.log('📥 Fetching PR data...');
    const prData = await github.fetchPR(owner, repo, prNumber);
    
    // Check if index exists and enable it
    const { existsSync } = await import('fs');
    let indexExists = existsSync('.droog-embeddings.json');
    let useIndex = indexExists;
    
    // Auto-index if index doesn't exist
    if (!indexExists) {
      console.log('📦 No index found - auto-indexing base branch...\n');
      try {
        const baseBranch = prData.base.ref || 'main';
        console.log(`🔄 Indexing ${baseBranch} branch for impact analysis...`);
        
        const { FullCodebaseIndexer } = await import('./indexer/full-indexer.js');
        const indexer = new FullCodebaseIndexer(githubToken, geminiKey);
        
        const progress = await indexer.indexRepository(owner, repo, baseBranch);
        console.log(`✓ Indexed ${progress.processedFiles} files, ${progress.indexedSymbols} symbols\n`);
        
        // Check again if index was created
        indexExists = existsSync('.droog-embeddings.json');
        useIndex = indexExists;
      } catch (indexError: any) {
        console.warn(`⚠️  Auto-indexing failed: ${indexError.message}`);
        console.warn('   Continuing without index - cross-repo features disabled\n');
        useIndex = false;
      }
    }
    
    if (useIndex) {
      console.log('📦 Index found - enabling cross-repo duplicate detection and impact analysis\n');
    } else {
      console.log('⚠️  No index available - cross-repo features disabled\n');
    }
    
    const report = await reviewer.reviewPR(prData, useIndex, geminiKey, owner, repo, autoFix);

    console.log('\n' + '='.repeat(60));
    console.log('📊 ENTERPRISE REVIEW RESULTS');
    console.log('='.repeat(60));
    console.log(`\nFound ${report.totalIssues} issue(s):`);
    console.log(`  - ${report.issuesBySeverity.high} high`);
    console.log(`  - ${report.issuesBySeverity.medium} medium`);
    console.log(`  - ${report.issuesBySeverity.low} low`);

    if (report.duplicates && report.duplicates.withinPR > 0) {
      console.log(`\n🔄 Duplicates: ${report.duplicates.withinPR} within PR`);
    }

    if (report.breakingChanges && report.breakingChanges.count > 0) {
      console.log(`\n⚠️  Breaking Changes: ${report.breakingChanges.count}`);
      console.log(`   Impacted files: ${report.breakingChanges.impactedFiles.length}`);
    }

    // Display recommendations
    if (report.recommendations) {
      console.log('\n' + '='.repeat(60));
      console.log('💡 RECOMMENDATIONS');
      console.log('='.repeat(60));
      console.log(report.recommendations);
      console.log('='.repeat(60));
    }

    const reportJson = JSON.stringify(report, null, 2);
    writeFileSync('report.json', reportJson, 'utf-8');
    console.log('\n💾 Report saved to report.json\n');

    if (post) {
      const poster = new CommentPoster(github, owner, repo, prNumber, prData.head.sha);
      await poster.postComments(report.comments);
      
      // Post consolidated PR-level summary (not per-file)
      if (report.summary) {
        await poster.postSummary(report.summary);
      }
    }

    console.log('✅ Enterprise review complete!\n');
  } catch (error: any) {
    handleError(error, { owner, repo, prNumber });
  }
}

// New review command
async function runReview(options: any) {
  const [owner, repo] = options.repo.split('/');
  const prNumber = parseInt(options.pr, 10);
  const githubToken = options.token || process.env.GITHUB_TOKEN;
  const geminiKey = options.geminiKey || process.env.GEMINI_API_KEY;
  
  if (!githubToken || !geminiKey) {
    console.error('❌ GitHub token and Gemini API key required');
    process.exit(1);
  }
  
  if (options.enterprise) {
    await runEnterpriseReview(owner, repo, prNumber, githubToken, geminiKey, options.post, options.autoFix);
  } else {
    await runBasicReview(owner, repo, prNumber, githubToken, geminiKey, options.post);
  }
}

// Index command
async function runIndex(options: any) {
  try {
    const [owner, repo] = options.repo.split('/');
    if (!owner || !repo) {
      console.error('❌ Invalid repo format. Use: owner/repo');
      process.exit(1);
    }

    const token = options.token || process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('❌ GitHub token required');
      process.exit(1);
    }

    const geminiKey = process.env.GEMINI_API_KEY; // Optional for embeddings
    
    const { FullCodebaseIndexer } = await import('./indexer/full-indexer.js');
    const indexer = new FullCodebaseIndexer(token, geminiKey);
    
    const progress = await indexer.indexRepository(owner, repo, options.branch);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 INDEXING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files: ${progress.totalFiles}`);
    console.log(`Processed: ${progress.processedFiles}`);
    console.log(`Symbols indexed: ${progress.indexedSymbols}`);
    if (progress.generatedEmbeddings > 0) {
      console.log(`Embeddings generated: ${progress.generatedEmbeddings}`);
    }
    if (progress.errors > 0) {
      console.log(`Errors: ${progress.errors}`);
    }
    console.log('\n✅ Indexing complete!');
  } catch (error: any) {
    handleError(error);
  }
}

// Analyze command
async function runAnalyze(options: any) {
  try {
    console.log('🚀 Analyzing file...\n');
    console.log(`📄 File: ${options.file}\n`);

    const { readFileSync } = await import('fs');
    const { CodeExtractor } = await import('./parser/extractor.js');
    const { CodebaseIndexer } = await import('./indexer/indexer.js');
    const { DuplicateDetector } = await import('./analysis/duplicates.js');
    const { EmbeddingGenerator } = await import('./embeddings/generator.js');
    const { FileVectorDB } = await import('./storage/vector-db.js');

    // Read file
    let fileContent: string;
    try {
      fileContent = readFileSync(options.file, 'utf-8');
    } catch (error: any) {
      console.error(`❌ Failed to read file: ${error.message}`);
      process.exit(1);
    }

    // Extract symbols
    console.log('📋 Extracting symbols...');
    const extractor = new CodeExtractor();
    const parsed = await extractor.extractFromJava(fileContent, options.file);
    console.log(`✓ Found ${parsed.symbols.length} symbols:`);
    parsed.symbols.forEach(symbol => {
      console.log(`   - ${symbol.type}: ${symbol.name} (${symbol.visibility || 'default'})`);
      if (symbol.parameters) {
        const params = symbol.parameters.map(p => `${p.name}: ${p.type || 'unknown'}`).join(', ');
        console.log(`     Parameters: (${params})`);
      }
      if (symbol.returnType) {
        console.log(`     Returns: ${symbol.returnType}`);
      }
    });

    // Check for duplicates if repo context provided
    if (options.repo) {
      console.log('\n📋 Checking for duplicates...');
      const [owner, repo] = options.repo.split('/');
      const token = process.env.GITHUB_TOKEN;
      
      if (token) {
        const indexer = new CodebaseIndexer();
        const duplicateDetector = new DuplicateDetector(indexer);
        
        // Try to load existing index
        const index = indexer.getIndex();
        if (index.symbols.length > 0) {
          const duplicates = await duplicateDetector.detectCrossRepo(parsed.symbols);
          if (duplicates.length > 0) {
            console.log(`⚠️  Found ${duplicates.length} potential duplicates:`);
            duplicates.forEach(dup => {
              console.log(`   - Similar to: ${dup.symbol2.file}::${dup.symbol2.name} (${(dup.similarity * 100).toFixed(1)}% similar)`);
            });
          } else {
            console.log('✓ No duplicates found');
          }
        } else {
          console.log('⚠️  No index found. Run `droog index` first for duplicate detection.');
        }
      }
    }

    // Generate embeddings if available
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      console.log('\n📋 Generating embeddings...');
      const embeddingGenerator = new EmbeddingGenerator(geminiKey);
      const vectorDB = new FileVectorDB();
      
      try {
        const embeddings = await embeddingGenerator.generateEmbeddings(parsed.symbols);
        await vectorDB.storeBatch(embeddings);
        console.log(`✓ Generated ${embeddings.length} embeddings`);
        
        // Find similar code
        if (parsed.symbols.length > 0) {
          console.log('\n📋 Finding similar code...');
          const similar = await vectorDB.findSimilarToSymbol(parsed.symbols[0], 5, 0.7);
          if (similar.length > 0) {
            console.log(`✓ Found ${similar.length} similar symbols:`);
            similar.forEach(sim => {
              console.log(`   - ${sim.symbol.file}::${sim.symbol.name}`);
            });
          }
        }
      } catch (error: any) {
        console.warn(`⚠️  Embedding generation failed: ${error.message}`);
      }
    }

    console.log('\n✅ Analysis complete!\n');
  } catch (error: any) {
    handleError(error);
  }
}

// Summarize command
async function runSummarize(options: any) {
  try {
    const [owner, repo] = options.repo.split('/');
    const prNumber = parseInt(options.pr, 10);
    const token = options.token || process.env.GITHUB_TOKEN;
    const geminiKey = options.geminiKey || process.env.GEMINI_API_KEY;
    
    if (!token) {
      console.error('❌ GitHub token required');
      process.exit(1);
    }

    console.log('🚀 Generating PR Summary...\n');
    console.log(`📦 Repository: ${owner}/${repo}`);
    console.log(`🔢 PR #${prNumber}\n`);

    // Check if report.json exists (from previous review)
    const { readFileSync, existsSync } = await import('fs');
    let report: any;
    let prData: any;

    if (existsSync('report.json') && !options.force) {
      try {
        console.log('📄 Found existing report.json, using it for summary...\n');
        const reportData = JSON.parse(readFileSync('report.json', 'utf-8'));
        
        // Verify it's for the same PR
        if (reportData.prNumber === prNumber) {
          report = reportData;
          console.log('✓ Using existing report (use --force to regenerate)\n');
          
          // Still need PR data for summary
          const github = new GitHubClient(token);
          prData = await github.fetchPR(owner, repo, prNumber);
        } else {
          console.log('⚠️  Existing report is for different PR, running new review...\n');
          report = null;
        }
      } catch (error) {
        console.log('⚠️  Could not read existing report, running new review...\n');
        report = null;
      }
    }

    // If no existing report or force flag, run full review
    if (!report) {
      if (!geminiKey) {
        console.error('❌ Gemini API key required for review');
        process.exit(1);
      }

      const github = new GitHubClient(token);
      const { EnterpriseReviewer } = await import('./core/reviewer.js');

      console.log('📥 Fetching PR data...');
      prData = await github.fetchPR(owner, repo, prNumber);
      console.log(`✓ Found PR: "${prData.title}"`);
      console.log(`✓ Changed files: ${prData.files.length}`);
      console.log(`✓ Base: ${prData.base.ref} ← Head: ${prData.head.ref}\n`);

      console.log('🤖 Running enterprise review...');
      const reviewer = new EnterpriseReviewer(geminiKey, token);
      
      // Check if index exists and enable it
      const { existsSync } = await import('fs');
      const indexExists = existsSync('.droog-embeddings.json');
      const useIndex = indexExists;
      
      if (useIndex) {
        console.log('📦 Index found - enabling cross-repo features\n');
      }
      
      report = await reviewer.reviewPR(prData, useIndex, geminiKey);
    } else {
      // Still fetch PR data for summary
      const github = new GitHubClient(token);
      prData = await github.fetchPR(owner, repo, prNumber);
    }

    console.log('\n📝 Generating summary...\n');

    // Generate markdown summary
    const summary = generatePRSummary(report, prData);

    console.log('='.repeat(60));
    console.log('📊 PR SUMMARY');
    console.log('='.repeat(60));
    console.log(summary);
    console.log('='.repeat(60));

    // Save to file
    const { writeFileSync } = await import('fs');
    writeFileSync('pr-summary.md', summary, 'utf-8');
    console.log('\n💾 Summary saved to pr-summary.md\n');

    console.log('✅ Summary generation complete!\n');
  } catch (error: any) {
    handleError(error);
  }
}

// Generate markdown summary from review report
function generatePRSummary(report: any, prData: any): string {
  const lines: string[] = [];

  lines.push(`# PR Summary: ${prData.title}`);
  lines.push('');
  lines.push(`**PR #${prData.number}** | Base: \`${prData.base.ref}\` ← Head: \`${prData.head.ref}\``);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Overview
  lines.push('## 📊 Overview');
  lines.push('');
  lines.push(`- **Total Issues:** ${report.totalIssues}`);
  lines.push(`  - 🔴 High: ${report.issuesBySeverity.high}`);
  lines.push(`  - 🟡 Medium: ${report.issuesBySeverity.medium}`);
  lines.push(`  - 🟢 Low: ${report.issuesBySeverity.low}`);
  lines.push(`- **Changed Files:** ${prData.files.length}`);
  if (report.averageConfidence) {
    lines.push(`- **Average Confidence:** ${(report.averageConfidence * 100).toFixed(1)}%`);
  }
  lines.push('');

  // Duplicates
  if (report.duplicates && (report.duplicates.withinPR > 0 || report.duplicates.crossRepo > 0)) {
    lines.push('## 🔄 Duplicate Code Detection');
    lines.push('');
    if (report.duplicates.withinPR > 0) {
      lines.push(`- **Within PR:** ${report.duplicates.withinPR} duplicate(s) found`);
    }
    if (report.duplicates.crossRepo > 0) {
      lines.push(`- **Cross-Repository:** ${report.duplicates.crossRepo} duplicate(s) found`);
    }
    if (report.duplicates.details.length > 0) {
      lines.push('');
      lines.push('**Details:**');
      report.duplicates.details.slice(0, 5).forEach((dup: any) => {
        lines.push(`- \`${dup.file1}::${dup.symbol1}\` similar to \`${dup.file2}::${dup.symbol2}\` (${(dup.similarity * 100).toFixed(1)}%)`);
      });
    }
    lines.push('');
  }

  // Breaking Changes
  if (report.breakingChanges && report.breakingChanges.count > 0) {
    lines.push('## ⚠️ Breaking Changes');
    lines.push('');
    lines.push(`**Total:** ${report.breakingChanges.count} breaking change(s) detected`);
    lines.push(`**Impacted Files:** ${report.breakingChanges.impactedFiles.length}`);
    lines.push('');
    if (report.breakingChanges.details.length > 0) {
      lines.push('**Details:**');
      report.breakingChanges.details.slice(0, 5).forEach((bc: any) => {
        lines.push(`- \`${bc.file}::${bc.symbol}\`: ${bc.changeType} - ${bc.message}`);
        if (bc.callSites > 0) {
          lines.push(`  - Affects ${bc.callSites} call site(s)`);
        }
      });
    }
    lines.push('');
  }

  // Architecture Violations
  if (report.architectureViolations && report.architectureViolations.count > 0) {
    lines.push('## 🏗️ Architecture Violations');
    lines.push('');
    lines.push(`**Total:** ${report.architectureViolations.count} violation(s)`);
    if (report.architectureViolations.details.length > 0) {
      lines.push('');
      lines.push('**Details:**');
      report.architectureViolations.details.slice(0, 5).forEach((violation: any) => {
        lines.push(`- \`${violation.file}\`: ${violation.rule} - ${violation.message}`);
      });
    }
    lines.push('');
  }

  // Top Issues
  if (report.comments && report.comments.length > 0) {
    lines.push('## 🔍 Top Issues');
    lines.push('');
    const highPriority = report.comments.filter((c: any) => c.severity === 'high').slice(0, 5);
    if (highPriority.length > 0) {
      lines.push('### 🔴 High Priority');
      lines.push('');
      highPriority.forEach((comment: any) => {
        lines.push(`- **\`${comment.file}\`** (line ${comment.line}): ${comment.message}`);
      });
      lines.push('');
    }

    const mediumPriority = report.comments.filter((c: any) => c.severity === 'medium').slice(0, 5);
    if (mediumPriority.length > 0) {
      lines.push('### 🟡 Medium Priority');
      lines.push('');
      mediumPriority.forEach((comment: any) => {
        lines.push(`- **\`${comment.file}\`** (line ${comment.line}): ${comment.message}`);
      });
      lines.push('');
    }
  }

  // Recommendations
  lines.push('## 💡 Recommendations');
  lines.push('');
    if (report.recommendations) {
      // Use detailed recommendations from report
      const recLines = report.recommendations.split('\n');
      recLines.forEach((line: string) => {
        if (line.trim()) {
          lines.push(line);
        }
      });
  } else {
    // Fallback to basic recommendations
    if (report.totalIssues === 0) {
      lines.push('✅ **No issues found!** Great job!');
    } else {
      if (report.issuesBySeverity.high > 0) {
        lines.push('1. 🔴 **Address high-priority issues first** - These may cause bugs or security vulnerabilities');
      }
      if (report.duplicates && report.duplicates.withinPR > 0) {
        lines.push('2. 🔄 **Refactor duplicate code** - Extract common logic to reduce maintenance burden');
      }
      if (report.breakingChanges && report.breakingChanges.count > 0) {
        lines.push('3. ⚠️ **Review breaking changes** - Ensure all call sites are updated');
      }
      if (report.issuesBySeverity.medium > 0) {
        lines.push('4. 🟡 **Consider medium-priority improvements** - These enhance code quality and maintainability');
      }
    }
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`*Generated by Droog AI Code Reviewer*`);

  return lines.join('\n');
}

function handleError(error: any, context?: { owner?: string; repo?: string; prNumber?: number }) {
  console.error('\n❌ Error:', error.message);
  
  if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
    console.error('\n🔌 Connection Error Detected:');
    console.error('   - Check your internet connection');
    console.error('   - Verify VPN is working (if using one)');
    console.error('   - Check if GitHub API is accessible: https://api.github.com');
    console.error('   - Check if Gemini API is accessible');
  }
  
  if (error.status === 401) {
    console.error('\n🔑 Authentication Error:');
    console.error('   - GitHub token may be invalid or expired');
    console.error('   - Gemini API key may be invalid');
  }
  
  if (error.status === 404) {
    console.error('\n📦 Not Found Error:');
    console.error('   - Repository or PR number may be incorrect');
    console.error('   - Check repository access permissions');
  }
  
  if (error.status) {
    console.error(`   HTTP Status: ${error.status}`);
  }
  
  if (error.response?.data) {
    console.error(`   Details: ${JSON.stringify(error.response.data)}`);
  }
  
  // Create error report to ensure report.json always exists
  if (context) {
    try {
      const errorReport = {
        success: false,
        error: error.message,
        errorType: error.status ? `HTTP_${error.status}` : 'UNKNOWN_ERROR',
        owner: context.owner,
        repo: context.repo,
        prNumber: context.prNumber,
        totalIssues: 0,
        issuesBySeverity: {
          high: 0,
          medium: 0,
          low: 0
        },
        comments: [],
        timestamp: new Date().toISOString()
      };
      
      const reportJson = JSON.stringify(errorReport, null, 2);
      writeFileSync('report.json', reportJson, 'utf-8');
      console.error('\n💾 Error report saved to report.json\n');
    } catch (writeError) {
      console.error('\n⚠️  Failed to write error report:', writeError);
    }
  }
  
  process.exit(1);
}
