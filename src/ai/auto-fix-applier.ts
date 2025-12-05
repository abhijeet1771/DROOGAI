/**
 * Auto-Fix Applier
 * Actually applies fixes to files with risk-based auto-apply and user approval
 */

import { AutoFix } from './auto-fix-generator.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

export interface ApplyResult {
  file: string;
  line: number;
  applied: boolean;
  skipped: boolean;
  error?: string;
}

export interface ApplyReport {
  results: ApplyResult[];
  autoApplied: number;
  userApproved: number;
  skipped: number;
  errors: number;
}

export class AutoFixApplier {
  private repoPath: string;
  private interactive: boolean;

  constructor(repoPath: string = process.cwd(), interactive: boolean = true) {
    this.repoPath = repoPath;
    this.interactive = interactive;
  }

  /**
   * Determine if a fix is low-risk and can be auto-applied
   */
  private isLowRisk(fix: AutoFix): boolean {
    // Low risk criteria:
    // 1. High confidence (>0.9)
    // 2. Simple fixes (null checks, formatting, simple refactors)
    // 3. Not security-related
    // 4. Not breaking changes
    
    if (fix.confidence < 0.9) {
      return false;
    }

    const issue = fix.issue.toLowerCase();
    const explanation = fix.explanation.toLowerCase();

    // Security-related fixes need approval
    if (issue.includes('security') || issue.includes('vulnerability') || 
        issue.includes('injection') || issue.includes('xss') || 
        issue.includes('csrf') || issue.includes('authentication')) {
      return false;
    }

    // Breaking changes need approval
    if (issue.includes('breaking') || issue.includes('api change') || 
        issue.includes('signature change')) {
      return false;
    }

    // Simple fixes that are safe to auto-apply
    const safePatterns = [
      'null check',
      'null pointer',
      'formatting',
      'whitespace',
      'import',
      'unused import',
      'typo',
      'spelling',
      'simple refactor',
      'code style'
    ];

    const isSafe = safePatterns.some(pattern => 
      issue.includes(pattern) || explanation.includes(pattern)
    );

    return isSafe;
  }

  /**
   * Apply fixes with risk-based auto-apply and user approval
   */
  async applyFixes(
    fixes: AutoFix[],
    autoApplyLowRisk: boolean = true
  ): Promise<ApplyReport> {
    const results: ApplyResult[] = [];
    let autoApplied = 0;
    let userApproved = 0;
    let skipped = 0;
    let errors = 0;

    // Separate fixes by risk level
    const lowRiskFixes: AutoFix[] = [];
    const highRiskFixes: AutoFix[] = [];

    for (const fix of fixes) {
      if (this.isLowRisk(fix)) {
        lowRiskFixes.push(fix);
      } else {
        highRiskFixes.push(fix);
      }
    }

    console.log(`\n📋 Auto-Fix Application Summary:`);
    console.log(`   - Low-risk fixes: ${lowRiskFixes.length} (${autoApplyLowRisk ? 'will auto-apply' : 'requires approval'})`);
    console.log(`   - High-risk fixes: ${highRiskFixes.length} (requires approval)\n`);

    // Auto-apply low-risk fixes
    if (autoApplyLowRisk) {
      for (const fix of lowRiskFixes) {
        const result = await this.applyFix(fix);
        results.push(result);
        if (result.applied) {
          autoApplied++;
          console.log(`  ✅ Auto-applied: ${fix.file}:${fix.line} (${fix.issue.substring(0, 50)}...)`);
        } else if (result.skipped) {
          skipped++;
        } else {
          errors++;
        }
      }
    } else {
      // Even low-risk fixes need approval if auto-apply is disabled
      highRiskFixes.push(...lowRiskFixes);
    }

    // Get user approval for high-risk fixes
    if (highRiskFixes.length > 0 && this.interactive) {
      console.log(`\n🔍 Reviewing ${highRiskFixes.length} fix(es) requiring approval:\n`);
      
      for (const fix of highRiskFixes) {
        const approved = await this.promptUserApproval(fix);
        
        if (approved) {
          const result = await this.applyFix(fix);
          results.push(result);
          if (result.applied) {
            userApproved++;
            console.log(`  ✅ Applied: ${fix.file}:${fix.line}`);
          } else if (result.skipped) {
            skipped++;
          } else {
            errors++;
          }
        } else {
          results.push({
            file: fix.file,
            line: fix.line,
            applied: false,
            skipped: true
          });
          skipped++;
          console.log(`  ⏭️  Skipped: ${fix.file}:${fix.line}`);
        }
      }
    } else if (highRiskFixes.length > 0) {
      // Non-interactive mode - skip high-risk fixes
      console.log(`\n⚠️  Non-interactive mode: Skipping ${highRiskFixes.length} high-risk fix(es)`);
      for (const fix of highRiskFixes) {
        results.push({
          file: fix.file,
          line: fix.line,
          applied: false,
          skipped: true
        });
        skipped++;
      }
    }

    return {
      results,
      autoApplied,
      userApproved,
      skipped,
      errors
    };
  }

  /**
   * Apply a single fix to a file
   */
  private async applyFix(fix: AutoFix): Promise<ApplyResult> {
    try {
      // Get full file path
      const filePath = await this.getFilePath(fix.file);
      
      if (!existsSync(filePath)) {
        return {
          file: fix.file,
          line: fix.line,
          applied: false,
          skipped: true,
          error: `File not found: ${filePath}`
        };
      }

      // Read file content
      const fileContent = readFileSync(filePath, 'utf-8');
      
      // Find and replace the code
      const updatedContent = this.replaceCodeBlock(
        fileContent,
        fix.originalCode,
        fix.fixedCode,
        fix.line
      );

      if (updatedContent === fileContent) {
        // No change made - code block not found
        return {
          file: fix.file,
          line: fix.line,
          applied: false,
          skipped: true,
          error: 'Original code block not found in file'
        };
      }

      // Write updated content
      writeFileSync(filePath, updatedContent, 'utf-8');

      return {
        file: fix.file,
        line: fix.line,
        applied: true,
        skipped: false
      };
    } catch (error: any) {
      return {
        file: fix.file,
        line: fix.line,
        applied: false,
        skipped: false,
        error: error.message
      };
    }
  }

  /**
   * Replace code block in file content
   */
  private replaceCodeBlock(
    fileContent: string,
    originalCode: string,
    fixedCode: string,
    lineNumber: number
  ): string {
    const lines = fileContent.split('\n');
    
    // Try to find the original code block
    const originalLines = originalCode.split('\n');
    const originalFirstLine = originalLines[0].trim();
    
    // Search around the line number
    const searchStart = Math.max(0, lineNumber - 20);
    const searchEnd = Math.min(lines.length, lineNumber + 20);
    
    for (let i = searchStart; i < searchEnd; i++) {
      if (lines[i].trim() === originalFirstLine) {
        // Found potential match - check if the block matches
        let match = true;
        for (let j = 0; j < originalLines.length && (i + j) < lines.length; j++) {
          if (lines[i + j].trim() !== originalLines[j].trim()) {
            match = false;
            break;
          }
        }
        
        if (match) {
          // Replace the block
          const before = lines.slice(0, i).join('\n');
          const after = lines.slice(i + originalLines.length).join('\n');
          return before + '\n' + fixedCode + '\n' + after;
        }
      }
    }
    
    // Fallback: try simple string replacement
    if (fileContent.includes(originalCode)) {
      return fileContent.replace(originalCode, fixedCode);
    }
    
    return fileContent; // No change
  }

  /**
   * Get full file path
   */
  private async getFilePath(filename: string): Promise<string> {
    // If it's already an absolute path, return it
    if (filename.startsWith('/') || filename.match(/^[A-Z]:/)) {
      return filename;
    }
    
    // Otherwise, try to find it in the repo
    // For PR files, they might be in a temp directory or the actual repo
    // This is a simplified version - you might need to adjust based on your setup
    const path = await import('path');
    return path.join(this.repoPath, filename);
  }

  /**
   * Prompt user for approval
   */
  private async promptUserApproval(fix: AutoFix): Promise<boolean> {
    if (!this.interactive) {
      return false;
    }

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 Fix: ${fix.file}:${fix.line}`);
      console.log(`🔍 Issue: ${fix.issue}`);
      console.log(`💡 Explanation: ${fix.explanation}`);
      console.log(`📊 Confidence: ${(fix.confidence * 100).toFixed(0)}%`);
      console.log(`\n📄 Original Code:`);
      console.log('─'.repeat(60));
      console.log(fix.originalCode);
      console.log('─'.repeat(60));
      console.log(`\n✨ Fixed Code:`);
      console.log('─'.repeat(60));
      console.log(fix.fixedCode);
      console.log('─'.repeat(60));
      
      rl.question('\n❓ Apply this fix? (y/n/a=apply all remaining/q=quit): ', (answer) => {
        rl.close();
        const lower = answer.toLowerCase().trim();
        if (lower === 'y' || lower === 'yes') {
          resolve(true);
        } else if (lower === 'a' || lower === 'apply all') {
          // Apply all remaining - set flag (simplified, would need state management)
          resolve(true);
        } else if (lower === 'q' || lower === 'quit') {
          process.exit(0);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Create a git commit with applied fixes
   */
  createCommit(message: string = '🤖 Apply auto-fixes from Droog AI'): void {
    try {
      execSync('git add -A', { cwd: this.repoPath, stdio: 'inherit' });
      execSync(`git commit -m "${message}"`, { cwd: this.repoPath, stdio: 'inherit' });
      console.log('\n✅ Changes committed to git');
    } catch (error: any) {
      console.warn('⚠️  Failed to create commit:', error.message);
    }
  }

  /**
   * Check if we're in a git repository
   */
  isGitRepo(): boolean {
    return existsSync(this.repoPath + '/.git');
  }
}

