import { PRData, PRFile } from './github.js';
import { LLMReviewer, ReviewComment } from './llm.js';

export interface ReviewReport {
  prNumber: number;
  prTitle: string;
  totalIssues: number;
  issuesBySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  comments: ReviewComment[];
}

export class ReviewProcessor {
  private llmReviewer: LLMReviewer;

  constructor(apiKey: string) {
    this.llmReviewer = new LLMReviewer(apiKey);
  }

  async processPR(prData: PRData, context?: any): Promise<ReviewReport> {
    const comments: ReviewComment[] = [];

    // OPTIMIZATION: If context provided, use batch review with full context
    if (context) {
      console.log(`\n📝 Analyzing ${prData.files.length} changed file(s) with full context...\n`);
      console.log(`  ✓ Context includes: duplicates, patterns, breaking changes, complexity\n`);
      
      // Batch review: Single API call with all files and context
      const batchComments = await this.processBatchWithContext(prData, context);
      comments.push(...batchComments);
    } else {
      // Legacy: Process files sequentially (backward compatibility)
      console.log(`\n📝 Analyzing ${prData.files.length} changed file(s)...\n`);

      // Process files sequentially (1 at a time) to respect rate limits (free tier: 2 req/min)
      // The LLMReviewer will handle retries automatically for rate limit errors
      // Sequential processing is safer than batching for free tier limits
      for (let i = 0; i < prData.files.length; i++) {
        const file = prData.files[i];
        const fileComments = await this.processFile(file);
        comments.push(...fileComments);
        
        // Wait 35 seconds between files to respect rate limit (2 req/min = 30s + buffer)
        if (i < prData.files.length - 1) {
          console.log(`  ⏳ Waiting 35s to respect rate limits (2 req/min)...\n`);
          await new Promise((resolve) => setTimeout(resolve, 35000));
        }
      }
    }

    // Count severities - handle both normalized (high/medium/low) and original (critical/major/minor) formats
    const issuesBySeverity = {
      high: comments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev === 'high' || sev === 'critical';
      }).length,
      medium: comments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev === 'medium' || sev === 'major';
      }).length,
      low: comments.filter((c) => {
        const sev = (c.severity || '').toLowerCase();
        return sev === 'low' || sev === 'minor' || sev === 'nitpick';
      }).length,
    };

    return {
      prNumber: prData.number,
      prTitle: prData.title,
      totalIssues: comments.length,
      issuesBySeverity,
      comments,
    };
  }

  private async processFile(file: PRFile): Promise<ReviewComment[]> {
    if (!file.patch) {
      return [];
    }

    // Skip markdown and other non-code files
    if (this.shouldSkipFile(file.filename)) {
      return [];
    }

    // Only analyze modified hunks (not entire file)
    const { diff, lineMapping } = this.extractRelevantDiffWithLineNumbers(file.patch);
    
    if (!diff || diff.trim().length === 0) {
      return [];
    }

    console.log(`  ✓ Reviewing ${file.filename}...`);
    
    const comments = await this.llmReviewer.reviewDiff(file.filename, diff);
    
    // Ensure file path is set correctly and map line numbers
    return comments.map((comment) => {
      // Map the line number from diff to actual file line number
      const actualLine = this.mapDiffLineToFileLine(comment.line, lineMapping);
      return {
        ...comment,
        file: file.filename,
        line: actualLine || comment.line, // Fallback to original if mapping fails
      };
    });
  }

  /**
   * Process batch review with full context (OPTIMIZED)
   * Single API call with all files and context
   */
  private async processBatchWithContext(prData: PRData, context: any): Promise<ReviewComment[]> {
    const comments: ReviewComment[] = [];
    
    // Build comprehensive prompt with all context
    const contextSummary = this.buildContextSummary(context);
    
    // Process all files in a single batch request
    const allDiffs: Array<{ file: string; diff: string; lineMapping: Map<number, number> }> = [];
    
    for (const file of prData.files) {
      if (!file.patch || this.shouldSkipFile(file.filename)) {
        continue;
      }
      
      const { diff, lineMapping } = this.extractRelevantDiffWithLineNumbers(file.patch);
      if (diff && diff.trim().length > 0) {
        allDiffs.push({ file: file.filename, diff, lineMapping });
      }
    }
    
    if (allDiffs.length === 0) {
      return [];
    }
    
    console.log(`  ✓ Preparing batch review for ${allDiffs.length} files...`);
    
    // Single batch API call with all files and context
    const batchComments = await this.llmReviewer.reviewBatchWithContext(allDiffs, contextSummary);
    
    // Map line numbers for each file
    for (const comment of batchComments) {
      const fileDiff = allDiffs.find(d => d.file === comment.file);
      if (fileDiff) {
        // Try to map the line number from diff to actual file line
        const actualLine = this.mapDiffLineToFileLine(comment.line, fileDiff.lineMapping);
        if (actualLine) {
          comments.push({
            ...comment,
            line: actualLine,
          });
        } else {
          // If mapping fails, try to find the line in the actual file content
          // by searching for the method/class name around the reported line
          const mappedLine = this.findLineInFile(comment, fileDiff);
          comments.push({
            ...comment,
            line: mappedLine || comment.line,
          });
        }
      } else {
        comments.push(comment);
      }
    }
    
    return comments;
  }

  /**
   * Build context summary for AI prompt
   */
  private buildContextSummary(context: any): string {
    const lines: string[] = [];
    
    lines.push('## Review Context');
    lines.push('');
    
    if (context.duplicates) {
      lines.push(`### Duplicates Found`);
      lines.push(`- Within PR: ${context.duplicates.withinPR.length}`);
      lines.push(`- Cross-Repo: ${context.duplicates.crossRepo.length}`);
      if (context.duplicates.withinPR.length > 0) {
        lines.push(`\nWithin-PR Duplicates:`);
        context.duplicates.withinPR.slice(0, 5).forEach((d: any) => {
          lines.push(`- ${d.symbol1.name} in ${d.symbol1.file} similar to ${d.symbol2.name} in ${d.symbol2.file} (${d.similarity.toFixed(1)}%)`);
        });
      }
      lines.push('');
    }
    
    if (context.breakingChanges && context.breakingChanges.length > 0) {
      lines.push(`### Breaking Changes: ${context.breakingChanges.length}`);
      context.breakingChanges.slice(0, 3).forEach((bc: any) => {
        lines.push(`- ${bc.symbol.name} in ${bc.symbol.file}: ${bc.message}`);
      });
      lines.push('');
    }
    
    if (context.patterns && context.patterns.length > 0) {
      lines.push(`### Design Patterns Detected: ${context.patterns.length}`);
      context.patterns.slice(0, 3).forEach((p: any) => {
        lines.push(`- ${p.pattern} in ${p.location}`);
      });
      lines.push('');
    }
    
    if (context.antiPatterns && context.antiPatterns.length > 0) {
      lines.push(`### Anti-Patterns Found: ${context.antiPatterns.length}`);
      context.antiPatterns.slice(0, 3).forEach((ap: any) => {
        lines.push(`- ${ap.type} in ${ap.location} (${ap.severity})`);
      });
      lines.push('');
    }
    
    if (context.complexityHotspots && context.complexityHotspots.length > 0) {
      lines.push(`### Complexity Hotspots: ${context.complexityHotspots.length}`);
      context.complexityHotspots.slice(0, 3).forEach((h: any) => {
        lines.push(`- ${h.method} in ${h.file} (complexity: ${h.complexity})`);
      });
      lines.push('');
    }
    
    if (context.apiIssues && context.apiIssues.length > 0) {
      lines.push(`### API Design Issues: ${context.apiIssues.length}`);
      context.apiIssues.slice(0, 3).forEach((issue: any) => {
        lines.push(`- ${issue.issue} in ${issue.endpoint || issue.file}`);
      });
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Maps a diff line number to actual file line number
   * If exact match not found, finds the closest mapped line
   */
  private mapDiffLineToFileLine(diffLine: number, mapping: Map<number, number>): number | null {
    // Try exact match first
    if (mapping.has(diffLine)) {
      return mapping.get(diffLine)!;
    }
    
    // Find closest mapped line (within 10 lines for better accuracy)
    for (let offset = 1; offset <= 10; offset++) {
      if (mapping.has(diffLine + offset)) {
        return mapping.get(diffLine + offset)!;
      }
      if (mapping.has(diffLine - offset)) {
        return mapping.get(diffLine - offset)!;
      }
    }
    
    return null;
  }

  /**
   * Find line number in file by searching for method/class name
   * Fallback when diff line mapping fails
   */
  private findLineInFile(comment: any, fileDiff: { file: string; diff: string; lineMapping: Map<number, number> }): number | null {
    // Extract method/class name from comment message or suggestion
    const methodMatch = comment.suggestion?.match(/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/);
    if (methodMatch) {
      const methodName = methodMatch[1];
      // Search in diff for the method name
      const diffLines = fileDiff.diff.split('\n');
      for (let i = 0; i < diffLines.length; i++) {
        if (diffLines[i].includes(methodName) && diffLines[i].includes('(')) {
          // Map this diff line to file line
          return this.mapDiffLineToFileLine(i + 1, fileDiff.lineMapping);
        }
      }
    }
    return null;
  }

  private extractRelevantDiff(patch: string): string {
    const result = this.extractRelevantDiffWithLineNumbers(patch);
    return result.diff;
  }
  
  private extractRelevantDiffWithLineNumbers(patch: string): { diff: string; lineMapping: Map<number, number> } {
    // Extract only the changed hunks (lines starting with + or -)
    // Limit to ~500 lines to avoid token explosion
    const lines = patch.split('\n');
    const relevantLines: string[] = [];
    const lineMapping = new Map<number, number>();
    let lineCount = 0;
    let diffLineNumber = 0;
    let fileLineNumber = 0;
    const maxLines = 500;

    for (const line of lines) {
      diffLineNumber++;
      
      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          fileLineNumber = parseInt(match[2], 10) - 1; // -1 because we'll increment on next line
        }
        relevantLines.push(line);
        lineCount++;
        if (lineCount >= maxLines) {
          break;
        }
        continue;
      }
      
      if (line.startsWith('\\')) {
        // Skip no newline markers
        continue;
      }
      
      // Map line numbers for added lines (these are in the new file)
      if (line.startsWith('+')) {
        fileLineNumber++;
        lineMapping.set(diffLineNumber, fileLineNumber);
        relevantLines.push(line);
        lineCount++;
        if (lineCount >= maxLines) {
          break;
        }
        continue;
      }
      
      // Map line numbers for context lines (also in new file)
      if (line.startsWith(' ')) {
        fileLineNumber++;
        lineMapping.set(diffLineNumber, fileLineNumber);
        if (relevantLines.length > 0) {
          // Include context lines (but limit them)
          if (lineCount < maxLines) {
            relevantLines.push(line);
            lineCount++;
          }
        }
        continue;
      }
      
      // Deleted lines (start with -) - not in new file, but include in diff for context
      if (line.startsWith('-')) {
        relevantLines.push(line);
        lineCount++;
        if (lineCount >= maxLines) {
          break;
        }
        continue;
      }
    }

    return {
      diff: relevantLines.join('\n'),
      lineMapping,
    };
  }
  
  private shouldSkipFile(filepath: string): boolean {
    const skipPatterns = [
      // Build and dependency files
      /\.min\.(js|css)$/,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /\.map$/,
      /\.generated\./,
      /dist\//,
      /build\//,
      /node_modules\//,
      /\.git\//,
      
      // Documentation and config files
      /\.md$/, // Markdown files
      /\.txt$/,
      /\.json$/, // JSON config files (but keep code files)
      /\.yml$/,
      /\.yaml$/,
      /\.toml$/,
      /\.ini$/,
      /\.cfg$/,
      /\.conf$/,
      /\.config$/,
      
      // Scripts and automation
      /\.ps1$/, // PowerShell scripts
      /\.sh$/, // Shell scripts
      /\.bat$/, // Batch files
      /\.cmd$/, // Command files
      
      // Git and version control
      /\.gitignore$/,
      /\.gitattributes$/,
      /\.gitkeep$/,
      
      // IDE and editor files
      /\.idea\//,
      /\.vscode\//,
      /\.settings\//,
      /\.project$/,
      /\.classpath$/,
      
      // Logs and temp files
      /\.log$/,
      /\.tmp$/,
      /\.temp$/,
      
      // Images and media
      /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
      /\.(mp4|avi|mov|wmv)$/,
      
      // Archives
      /\.(zip|tar|gz|rar|7z)$/,
    ];

    // Don't skip if it's a code file (Java, Python, JS, TS, etc.)
    const codeExtensions = /\.(java|py|js|ts|jsx|tsx|cpp|c|h|hpp|cs|go|rs|rb|php|swift|kt|scala|clj|sh|sql|xml|html|css|scss|less)$/;
    if (codeExtensions.test(filepath)) {
      return false; // Always review code files
    }

    return skipPatterns.some((pattern) => pattern.test(filepath));
  }
}



