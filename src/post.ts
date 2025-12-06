import { GitHubClient } from './github.js';
import { ReviewComment } from './llm.js';
import { AutoFix } from './ai/auto-fix-generator.js';

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

    // RISK-FOCUSED: Only post comments related to "what will break"
    // Filter out traditional code review comments (security, maintainability, style)
    const riskFocusedComments = this.filterRiskFocusedComments(comments);
    
    if (riskFocusedComments.length === 0) {
      console.log('\n✓ No risk-focused comments to post (no breaking changes detected).');
      return;
    }

    console.log(`\n📤 Posting ${riskFocusedComments.length} risk-focused comment(s) to GitHub...\n`);

    // Group comments by file to avoid spam
    const commentsByFile = new Map<string, ReviewComment[]>();
    for (const comment of riskFocusedComments) {
      if (!commentsByFile.has(comment.file)) {
        commentsByFile.set(comment.file, []);
      }
      commentsByFile.get(comment.file)!.push(comment);
    }

    // Post ALL risk-focused comments as inline comments (not just high/critical)
    // All comments that passed filterRiskFocusedComments are important enough to post
    for (const [file, fileComments] of commentsByFile) {
      if (fileComments.length > 0) {
        console.log(`  📌 Found ${fileComments.length} risk-focused comment(s) for ${file} - posting as inline comments...`);
        for (const comment of fileComments.slice(0, 20)) { // Limit to 20 per file to avoid spam
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
    }

    console.log('\n✓ Finished posting comments.');
  }

  /**
   * Post consolidated PR-level summary (not per-file)
   */
  async postSummary(summary: string): Promise<void> {
    if (!summary || summary.trim().length === 0) {
      console.log('\n✓ No summary to post.');
      return;
    }

    try {
      console.log('\n📤 Posting consolidated PR summary...');
      await this.github.postComment(this.owner, this.repo, this.prNumber, summary);
      console.log('✓ Posted consolidated PR summary');
    } catch (error: any) {
      console.error('✗ Failed to post summary:', error.message || error);
    }
  }

  /**
   * Post auto-fixes as GitHub suggestions (shows "Apply suggestion" button)
   * This allows users to accept/reject fixes directly in GitHub UI
   */
  async postAutoFixesAsSuggestions(fixes: AutoFix[]): Promise<void> {
    if (fixes.length === 0) {
      console.log('\n✓ No auto-fixes to post as suggestions.');
      return;
    }

    console.log(`\n📤 Posting ${fixes.length} auto-fix(es) as GitHub suggestions...`);
    console.log('   💡 These will show "Apply suggestion" buttons in GitHub PR\n');

    let posted = 0;
    let failed = 0;

    for (const fix of fixes) {
      try {
        await this.github.postReviewCommentWithSuggestion(
          this.owner,
          this.repo,
          this.prNumber,
          this.commitId,
          fix.file,
          fix.line,
          fix.issue,
          fix.originalCode,
          fix.fixedCode,
          fix.explanation
        );
        posted++;
        console.log(`  ✓ Posted suggestion for ${fix.file}:${fix.line}`);
        
        // Rate limit: 1 request per second
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        failed++;
        console.error(`  ✗ Failed to post suggestion for ${fix.file}:${fix.line}`);
        console.error(`     Error: ${error.message || error}`);
      }
    }

    console.log(`\n✓ Posted ${posted} suggestion(s) to GitHub PR`);
    if (failed > 0) {
      console.log(`  ⚠️  ${failed} suggestion(s) failed to post`);
    }
    console.log('\n💡 In GitHub PR, you will see "Apply suggestion" buttons on each fix!');
  }

  private formatComment(comment: ReviewComment): string {
    // Human-like, conversational format with impact-first structure
    return this.formatHumanLikeComment(comment);
  }

  /**
   * Format comment in human-like, conversational style
   * Structure: Impact explanation → Human suggestion → Code example
   */
  private formatHumanLikeComment(comment: ReviewComment): string {
    let message = comment.message || '';
    let suggestion = comment.suggestion || '';
    
    // Fix grammar and formatting in message
    message = this.fixGrammarAndFormatting(message);
    
    // Extract impact information from message
    const impactExplanation = this.extractImpactExplanation(message, comment);
    
    // Build human-like comment
    let formatted = '';
    
    // 1. Impact explanation (what/where/why) - Let LLM's natural message be used
    if (impactExplanation.callSites && impactExplanation.callSites.length > 0) {
      formatted += `This change will break ${impactExplanation.callSites.length} call site(s):\n\n`;
      impactExplanation.callSites.slice(0, 5).forEach((site: string) => {
        formatted += `- ${site} will fail\n`;
      });
      if (impactExplanation.callSites.length > 5) {
        formatted += `- ... and ${impactExplanation.callSites.length - 5} more location(s)\n`;
      }
      formatted += `\n`;
    } else {
      // Use LLM's original message directly (already conversational and natural)
      formatted += `${this.fixGrammarAndFormatting(message)}\n\n`;
    }
    
    // 2. Human suggestion (respectful, soft)
    if (suggestion) {
      formatted += `Here's how I'd approach this:\n\n`;
      // Clean suggestion: remove imports, extract only relevant code
      const cleanedSuggestion = this.cleanCodeSuggestion(suggestion, comment.line);
      formatted += `\`\`\`java\n${cleanedSuggestion}\n\`\`\`\n`;
    }
    
    return formatted;
  }

  /**
   * Fix grammar, capitalization, and formatting issues in text
   */
  private fixGrammarAndFormatting(text: string): string {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // 1. Fix incomplete sentences like "I noticed this." followed by another sentence
    // "I noticed this. I'd recommend..." -> Remove the incomplete part or make it natural
    text = text.replace(/\bi\s+noticed\s+this\.\s+/gi, (match) => {
      // Check if next word starts a new sentence (capital letter)
      const afterMatch = text.substring(text.indexOf(match) + match.length);
      if (afterMatch.trim().length > 0 && /^[A-Z]/.test(afterMatch.trim())) {
        // It's an incomplete sentence - just remove it, let the next sentence stand alone
        return "";
      }
      return "I noticed this. ";
    });

    // 2. Fix capitalization after periods, exclamation, question marks
    text = text.replace(/([.!?])\s+([a-z])/g, (match, punct, letter) => {
      return `${punct} ${letter.toUpperCase()}`;
    });

    // 3. Fix "i " to "I " (but not in words like "this" or "with")
    text = text.replace(/\bi\s+/g, 'I ');

    // 4. Fix "i'd" to "I'd"
    text = text.replace(/\bi'd\b/gi, "I'd");

    // 5. Fix "i've" to "I've"
    text = text.replace(/\bi've\b/gi, "I've");

    // 6. Fix "i'm" to "I'm"
    text = text.replace(/\bi'm\b/gi, "I'm");

    // 7. Fix "i'll" to "I'll"
    text = text.replace(/\bi'll\b/gi, "I'll");

    // 8. Fix method names: "calculatetotal" -> "calculateTotal" (camelCase)
    text = text.replace(/\bcalculatetotal\b/gi, 'calculateTotal');
    text = text.replace(/\bgetuserdata\b/gi, 'getUserData');
    text = text.replace(/\bgetstatus\b/gi, 'getStatus');
    text = text.replace(/\bprocessorders\b/gi, 'processOrders');
    text = text.replace(/\bgetprice\b/gi, 'getPrice');
    text = text.replace(/\bgetquantity\b/gi, 'getQuantity');
    text = text.replace(/\bprocessorder\b/gi, 'processOrder');

    // 9. Fix Big O notation: "o(n²)" -> "O(n²)", "o(n)" -> "O(n)"
    text = text.replace(/\bo\(n²?\)/gi, (match) => {
      return match.charAt(0).toUpperCase() + match.slice(1);
    });
    text = text.replace(/\bo\(n\s*\*\s*n\)/gi, 'O(n²)');
    text = text.replace(/\bo\(n\^2\)/gi, 'O(n²)');

    // 10. Fix common grammar: "this i" -> "this. I"
    text = text.replace(/\bthis\s+i\s+/gi, 'this. I ');

    // 11. Fix "here's" -> "Here's" at start of sentence
    text = text.replace(/(^|[.!?]\s+)here's\b/gi, (match, prefix) => {
      return prefix + "Here's";
    });

    // 12. Fix duplicate "I noticed" patterns (e.g., "I noticed this i noticed this")
    text = text.replace(/\bi\s+noticed\s+this\s+i\s+noticed/gi, 'I noticed');
    text = text.replace(/\bI\s+noticed\s+this\s+I\s+noticed/gi, 'I noticed');
    text = text.replace(/\bI\s+noticed\s+this\s+i\s+noticed/gi, 'I noticed');
    
    // 12.1 Fix "i noticed" -> "I noticed" at start
    text = text.replace(/^i\s+noticed/gi, 'I noticed');

    // 13. Fix double spaces
    text = text.replace(/\s{2,}/g, ' ');

    // 14. Ensure first character is capitalized
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    // 15. Fix common typos
    text = text.replace(/\bthe\s+the\b/gi, 'the');
    text = text.replace(/\ba\s+a\b/gi, 'a');
    text = text.replace(/\bis\s+is\b/gi, 'is');

    // 16. Fix awkward "I noticed this." at the start if it's incomplete
    // If text starts with "I noticed this." and next sentence starts with capital, remove the incomplete part
    if (/^I\s+noticed\s+this\.\s+[A-Z]/.test(text)) {
      text = text.replace(/^I\s+noticed\s+this\.\s+/, '');
    }

    return text.trim();
  }

  /**
   * Clean code suggestion: remove imports, extract only relevant code block
   */
  private cleanCodeSuggestion(suggestion: string, issueLine: number): string {
    if (!suggestion || suggestion.trim().length === 0) {
      return suggestion;
    }

    let cleaned = suggestion;

    // 1. Remove import statements (they belong at file top, not in method body)
    // Match: "import package.name.Class;" or "import static package.name.Class;"
    cleaned = cleaned.replace(/^import\s+(?:static\s+)?[\w.*]+\s*;?\s*$/gm, '');
    
    // 2. Remove any lines that are just imports (handle multi-line)
    const lines = cleaned.split('\n');
    const filteredLines: string[] = [];
    let inImportBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip import statements
      if (line.startsWith('import ') || line.startsWith('import static ')) {
        inImportBlock = true;
        continue;
      }
      
      // If we were in import block and hit empty line, skip it too
      if (inImportBlock && line === '') {
        inImportBlock = false;
        continue;
      }
      
      inImportBlock = false;
      filteredLines.push(lines[i]); // Keep original line (with indentation)
    }
    
    cleaned = filteredLines.join('\n');

    // 3. Remove code fragments that don't belong (like ".orElse(null);" at start)
    // If suggestion starts with a method call or statement fragment, try to find method start
    const trimmed = cleaned.trim();
    if (trimmed.startsWith('.') || trimmed.match(/^[a-z]\w*\s*\(/)) {
      // This looks like a code fragment, try to find the method/block start
      const methodMatch = cleaned.match(/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+\w+\s*\([^)]*\)\s*\{/);
      if (methodMatch) {
        const methodStart = cleaned.indexOf(methodMatch[0]);
        cleaned = cleaned.substring(methodStart);
      }
    }

    // 4. Remove leading/trailing empty lines
    cleaned = cleaned.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');

    return cleaned.trim();
  }

  /**
   * Extract impact information from comment
   */
  private extractImpactExplanation(message: string, comment: ReviewComment): {
    impact?: string;
    callSites?: string[];
  } {
    const lowerMessage = message.toLowerCase();
    
    // Check for breaking change indicators
    if (lowerMessage.includes('breaking change') || 
        lowerMessage.includes('signature changed') ||
        lowerMessage.includes('visibility reduced') ||
        lowerMessage.includes('return type changed')) {
      
      // Try to extract call sites from comment metadata if available
      const callSites: string[] = [];
      if ((comment as any).callSites) {
        callSites.push(...(comment as any).callSites);
      }
      
      return {
        impact: `this is a breaking change that will cause compilation or runtime failures`,
        callSites: callSites.length > 0 ? callSites : undefined,
      };
    }
    
    // Check for test failure indicators
    if (lowerMessage.includes('test will fail') || 
        lowerMessage.includes('test case')) {
      return {
        impact: `this test will fail when the PR is merged`,
      };
    }
    
    // Check for performance indicators
    if (lowerMessage.includes('performance') || 
        lowerMessage.includes('slow') ||
        lowerMessage.includes('regression')) {
      return {
        impact: `this will cause a performance regression`,
      };
    }
    
    return {};
  }

  /**
   * Convert technical message to conversational tone
   */
  private makeConversational(message: string): string {
    let conversational = message.trim();
    
    // Remove existing "I noticed" prefix if LLM already added it
    if (conversational.toLowerCase().startsWith('i noticed')) {
      conversational = conversational.substring(9).trim();
      // Remove duplicate "this" if present
      if (conversational.toLowerCase().startsWith('this')) {
        conversational = conversational.substring(4).trim();
      }
    }
    
    // Replace technical terms with conversational ones
    conversational = conversational.replace(/Issue detected:/gi, '');
    conversational = conversational.replace(/Error found:/gi, '');
    conversational = conversational.replace(/Problem:/gi, '');
    conversational = conversational.replace(/Warning:/gi, '');
    
    // Make it sound more natural
    if (!conversational.toLowerCase().startsWith('this')) {
      conversational = `this ${conversational.toLowerCase()}`;
    }
    
    return conversational.trim();
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

  /**
   * Filter comments to only include risk-focused ones (what will break)
   * Excludes: security, maintainability, style, general code review
   * Includes: breaking changes, test failures, performance regressions, impact issues
   */
  private filterRiskFocusedComments(comments: ReviewComment[]): ReviewComment[] {
    return comments.filter(comment => {
      const message = (comment.message || '').toLowerCase();
      const suggestion = (comment.suggestion || '').toLowerCase();
      const combined = `${message} ${suggestion}`.toLowerCase();
      const sev = (comment.severity || '').toLowerCase();

      // INCLUDE: All high/critical severity comments (they're important enough)
      if (sev === 'high' || sev === 'critical') {
        return true;
      }

      // INCLUDE: Breaking change related (expanded keywords)
      if (combined.includes('breaking change') || 
          combined.includes('signature changed') ||
          combined.includes('visibility reduced') ||
          combined.includes('visibility changed') ||
          combined.includes('return type changed') ||
          combined.includes('return type') ||
          combined.includes('parameter type changed') ||
          combined.includes('method removed') ||
          combined.includes('will break') ||
          combined.includes('will fail') ||
          combined.includes('compilation') ||
          combined.includes('runtime failure') ||
          combined.includes('api change') ||
          combined.includes('backward compatibility')) {
        return true;
      }

      // INCLUDE: Test failure related
      if (combined.includes('test will fail') ||
          combined.includes('test case') ||
          combined.includes('test method') ||
          combined.includes('failing test')) {
        return true;
      }

      // INCLUDE: Performance regression related
      if (combined.includes('performance regression') ||
          combined.includes('will be slower') ||
          combined.includes('n+1 query') ||
          combined.includes('complexity increased') ||
          combined.includes('slowdown')) {
        return true;
      }

      // INCLUDE: Impact analysis related
      if (combined.includes('impacted file') ||
          combined.includes('call site') ||
          combined.includes('affected feature') ||
          combined.includes('will be affected')) {
        return true;
      }

      // EXCLUDE: Traditional code review (security, maintainability, style)
      if (combined.includes('hardcoded credential') ||
          combined.includes('security risk') ||
          combined.includes('maintainability') ||
          combined.includes('code style') ||
          combined.includes('naming convention') ||
          combined.includes('magic number') ||
          combined.includes('code smell') ||
          combined.includes('best practice') ||
          combined.includes('consider using') ||
          combined.includes('should use') ||
          message.includes('suggestion:') && !message.includes('will break')) {
        return false;
      }

      // Default: Include medium severity if it's clearly risk-focused
      // (high/critical already included above)
      if (sev === 'medium') {
        // Check if it's performance regression or impact-related
        if (combined.includes('performance') || 
            combined.includes('regression') ||
            combined.includes('slow') ||
            combined.includes('inefficient') ||
            combined.includes('complexity') ||
            combined.includes('o(n') ||
            combined.includes('n+1')) {
          return true;
        }
      }

      // Exclude low severity unless explicitly risk-focused
      return false;
    });
  }
}



