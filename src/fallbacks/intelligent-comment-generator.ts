/**
 * Intelligent Fallback Comment Generator
 * Generates human-readable comments using ESLint, Semgrep, and Handlebars templates
 * Used when LLM is unavailable or quota exhausted
 */

import { ReviewComment } from '../llm.js';
import * as Handlebars from 'handlebars';
import { ESLint } from 'eslint';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FallbackFinding {
  type: 'eslint' | 'semgrep' | 'pattern' | 'security' | 'performance' | 'logic';
  file: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  rule?: string;
  suggestion?: string;
  codeSnippet?: string;
}

export class IntelligentCommentGenerator {
  private eslint: ESLint | null = null;
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.initializeTemplates();
    // Initialize ESLint asynchronously (non-blocking)
    this.initializeESLint().catch(() => {
      // Ignore - ESLint not critical
    });
  }

  /**
   * Generate comments using intelligent fallbacks
   */
  async generateComments(
    filepath: string,
    code: string,
    diff: string
  ): Promise<ReviewComment[]> {
    const findings: FallbackFinding[] = [];
    const comments: ReviewComment[] = [];

    // 1. ESLint analysis (for JS/TS files)
    if (this.isJavaScriptOrTypeScript(filepath)) {
      const eslintFindings = await this.analyzeWithESLint(filepath, code);
      findings.push(...eslintFindings);
    }

    // 2. Semgrep analysis (for all languages)
    const semgrepFindings = await this.analyzeWithSemgrep(filepath, code);
    findings.push(...semgrepFindings);

    // 3. Pattern-based analysis (fallback patterns)
    const patternFindings = this.analyzePatterns(filepath, code, diff);
    findings.push(...patternFindings);

    // 4. Convert findings to comments using templates
    for (const finding of findings) {
      const comment = this.findingToComment(finding, code);
      if (comment) {
        comments.push(comment);
      }
    }

    return comments;
  }

  /**
   * Initialize Handlebars templates
   */
  private initializeTemplates(): void {
    // Security issue template
    this.templates.set('security', Handlebars.compile(`
🚨 **Security Alert: {{type}}**

I noticed a potential security issue here: {{message}}

{{#if suggestion}}
**How to fix it:**
\`\`\`{{language}}
{{suggestion}}
\`\`\`
{{/if}}

**Impact:** {{impact}}
    `.trim()));

    // Performance issue template
    this.templates.set('performance', Handlebars.compile(`
⚡ **Performance Insight: {{type}}**

I noticed a performance concern here: {{message}}

{{#if suggestion}}
**How to improve:**
\`\`\`{{language}}
{{suggestion}}
\`\`\`
{{/if}}

**Impact:** {{impact}}
    `.trim()));

    // Logic bug template
    this.templates.set('logic', Handlebars.compile(`
🐛 **Logic Bug: {{type}}**

I spotted a potential logic issue here: {{message}}

{{#if suggestion}}
**How to fix it:**
\`\`\`{{language}}
{{suggestion}}
\`\`\`
{{/if}}

**Impact:** {{impact}}
    `.trim()));

    // Code smell template
    this.templates.set('codesmell', Handlebars.compile(`
👃 **Code Smell: {{type}}**

I noticed a code smell here: {{message}}

{{#if suggestion}}
**How to refactor:**
\`\`\`{{language}}
{{suggestion}}
\`\`\`
{{/if}}
    `.trim()));

    // ESLint rule template
    this.templates.set('eslint', Handlebars.compile(`
📋 **ESLint Rule: {{rule}}**

{{message}}

{{#if suggestion}}
**Fix:**
\`\`\`{{language}}
{{suggestion}}
\`\`\`
{{/if}}
    `.trim()));

    // Semgrep rule template
    this.templates.set('semgrep', Handlebars.compile(`
🔍 **Semgrep Rule: {{rule}}**

{{message}}

{{#if suggestion}}
**Fix:**
\`\`\`{{language}}
{{suggestion}}
\`\`\`
{{/if}}
    `.trim()));
  }

  /**
   * Initialize ESLint (simplified to avoid type issues)
   * Uses basic ESLint config that works with ESLint 9+
   */
  private async initializeESLint(): Promise<void> {
    try {
      // Try to initialize ESLint with basic config
      // If it fails, we'll use pattern-based analysis instead
      this.eslint = new ESLint({
        useEslintrc: false,
        overrideConfig: {
          env: {
            es2022: true,
            node: true,
          },
          parserOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
          },
          rules: {
            // Basic rules that don't require plugins
            'no-console': 'warn',
            'no-debugger': 'error',
            'no-alert': 'warn',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-unused-vars': 'warn',
          },
        },
      });
    } catch (error) {
      // ESLint initialization failed - continue without it
      // Pattern-based analysis will still work
      this.eslint = null;
    }
  }

  /**
   * Analyze code with ESLint
   */
  private async analyzeWithESLint(filepath: string, code: string): Promise<FallbackFinding[]> {
    if (!this.eslint) {
      return [];
    }

    try {
      const results = await this.eslint.lintText(code, { filePath: filepath });
      const findings: FallbackFinding[] = [];

      for (const result of results) {
        for (const message of result.messages) {
          // Skip disabled rules (severity 0) and warnings that are too minor
          if (message.severity === 0) continue;

          findings.push({
            type: 'eslint',
            file: filepath,
            line: message.line || 1,
            severity: message.severity === 2 ? 'high' : 'medium',
            message: message.message,
            rule: message.ruleId || undefined,
            suggestion: message.fix ? this.generateFixFromESLint(code, message) : undefined,
            codeSnippet: this.extractCodeSnippet(code, message.line || 1),
          });
        }
      }

      return findings;
    } catch (error) {
      console.warn(`⚠️  ESLint analysis failed for ${filepath}:`, (error as any).message);
      return [];
    }
  }

  /**
   * Analyze code with Semgrep (using CLI)
   * 
   * Location: src/fallbacks/intelligent-comment-generator.ts:246-285
   * 
   * How it works:
   * 1. Checks if Semgrep CLI is installed (semgrep --version)
   * 2. Writes in-memory code to a temp file
   * 3. Runs: semgrep --json --config=auto <temp-file>
   * 4. Parses JSON results
   * 5. Converts to FallbackFinding[]
   * 6. Cleans up temp file
   * 
   * Note: Semgrep CLI needs to be installed separately:
   *   - pip install semgrep (Python)
   *   - npm install -g @semgrep/cli (Node.js)
   * 
   * If not installed, pattern-based analysis will be used instead.
   */
  private async analyzeWithSemgrep(filepath: string, code: string): Promise<FallbackFinding[]> {
    try {
      // Check if semgrep CLI is available
      try {
        await execAsync('semgrep --version');
      } catch (versionError) {
        // Semgrep CLI not installed - skip silently (pattern matching will be used instead)
        return [];
      }

      // For in-memory code, we need to write it to a temp file
      // Since we're working with PR diffs, we'll use a temp file approach
      const { writeFileSync, unlinkSync } = await import('fs');
      const { join } = await import('path');
      const { tmpdir } = await import('os');
      
      // Create unique temp file name
      const sanitizedFilename = filepath.replace(/[^a-zA-Z0-9]/g, '_');
      const tempFile = join(tmpdir(), `droog-semgrep-${Date.now()}-${sanitizedFilename}`);
      
      try {
        // Write code to temp file
        writeFileSync(tempFile, code, 'utf8');
        
        // Run semgrep on temp file
        // Use --config=auto to automatically detect rules
        const { stdout } = await execAsync(`semgrep --json --config=auto "${tempFile}"`, {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024, // 10MB
          shell: true, // Required for Windows PowerShell
        });

        const results = JSON.parse(stdout);
        const findings: FallbackFinding[] = [];

        // Parse Semgrep results
        for (const result of results.results || []) {
          findings.push({
            type: 'semgrep',
            file: filepath, // Use original filepath, not temp file
            line: result.start?.line || result.line || 1,
            severity: this.mapSemgrepSeverity(result.extra?.severity || 'INFO'),
            message: result.message || result.extra?.message || 'Semgrep finding',
            rule: result.check_id || result.rule_id || undefined,
            suggestion: result.extra?.fix || undefined,
            codeSnippet: result.extra?.lines || undefined,
          });
        }

        return findings;
      } finally {
        // Clean up temp file
        try {
          unlinkSync(tempFile);
        } catch (cleanupError) {
          // Ignore cleanup errors (file might not exist or be locked)
        }
      }
    } catch (error: any) {
      // Semgrep not available or failed - use pattern matching instead
      if (!error.message?.includes('semgrep: command not found') && 
          !error.message?.includes('not recognized') &&
          !error.message?.includes('semgrep: command not found')) {
        console.warn(`⚠️  Semgrep analysis failed for ${filepath}:`, error.message);
      }
      return [];
    }
  }

  /**
   * Pattern-based analysis (fallback when tools unavailable)
   */
  private analyzePatterns(filepath: string, code: string, diff: string): FallbackFinding[] {
    const findings: FallbackFinding[] = [];
    const lines = code.split('\n');
    const language = this.detectLanguage(filepath);

    // Security patterns
    const securityPatterns = [
      {
        pattern: /(api[_-]?key|apikey|secret|password|token)\s*=\s*['"]([^'"]+)['"]/i,
        type: 'security' as const,
        severity: 'high' as const,
        message: 'Hardcoded secret detected - this is a security risk',
        suggestion: `Use environment variables: const ${language === 'typescript' ? 'API_KEY' : 'apiKey'} = process.env.API_KEY || '';`,
      },
      {
        pattern: /eval\s*\(/i,
        type: 'security' as const,
        severity: 'high' as const,
        message: 'Use of eval() is dangerous and can lead to code injection',
        suggestion: 'Avoid eval(). Use JSON.parse() or a safer alternative.',
      },
      {
        pattern: /dangerouslySetInnerHTML/i,
        type: 'security' as const,
        severity: 'high' as const,
        message: 'dangerouslySetInnerHTML can lead to XSS vulnerabilities',
        suggestion: 'Sanitize HTML or use safer alternatives like React\'s built-in escaping.',
      },
    ];

    // Performance patterns
    const performancePatterns = [
      {
        pattern: /for\s*\([^)]*\)\s*\{[^}]*(\w+)\s*\+=\s*["']/,
        type: 'performance' as const,
        severity: 'medium' as const,
        message: 'String concatenation in loop - creates many temporary objects (O(n²) complexity)',
        suggestion: language === 'typescript' || language === 'javascript' 
          ? 'Use array.join() or template literals: const parts = []; for (...) { parts.push(...); } return parts.join("");'
          : 'Use StringBuilder or String.join() for better performance',
      },
      {
        pattern: /\.query\([^)]*\+[^)]*\)/i,
        type: 'performance' as const,
        severity: 'medium' as const,
        message: 'String concatenation in query - consider using parameterized queries',
        suggestion: 'Use parameterized queries or query builders to prevent SQL injection and improve performance.',
      },
    ];

    // Logic bug patterns
    const logicPatterns = [
      {
        pattern: /\/\s*(\w+)(?!\s*[!=]==\s*0)/,
        type: 'logic' as const,
        severity: 'high' as const,
        message: 'Division operation without zero check - potential division by zero',
        suggestion: `if (${language === 'typescript' ? 'divisor' : 'divisor'} === 0) { throw new Error("Cannot divide by zero"); }`,
      },
      {
        pattern: /(\w+)\.(\w+)\s*\(/,
        type: 'logic' as const,
        severity: 'medium' as const,
        message: 'Potential null/undefined access - add null check',
        suggestion: language === 'typescript' || language === 'javascript'
          ? 'Use optional chaining: obj?.method() or add null check: if (obj) { obj.method(); }'
          : 'Add null check: if (obj != null) { obj.method(); }',
      },
    ];

    // Check each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        continue;
      }

      // Check security patterns
      for (const pattern of securityPatterns) {
        if (pattern.pattern.test(line)) {
          findings.push({
            ...pattern,
            file: filepath,
            line: lineNum,
            codeSnippet: line.trim(),
          });
        }
      }

      // Check performance patterns
      for (const pattern of performancePatterns) {
        if (pattern.pattern.test(line)) {
          findings.push({
            ...pattern,
            file: filepath,
            line: lineNum,
            codeSnippet: line.trim(),
          });
        }
      }

      // Check logic patterns
      for (const pattern of logicPatterns) {
        if (pattern.pattern.test(line)) {
          findings.push({
            ...pattern,
            file: filepath,
            line: lineNum,
            codeSnippet: line.trim(),
          });
        }
      }
    }

    return findings;
  }

  /**
   * Convert finding to ReviewComment using templates
   */
  private findingToComment(finding: FallbackFinding, code: string): ReviewComment | null {
    const templateKey = finding.type === 'eslint' ? 'eslint' 
                      : finding.type === 'semgrep' ? 'semgrep'
                      : finding.type === 'security' ? 'security'
                      : finding.type === 'performance' ? 'performance'
                      : finding.type === 'logic' ? 'logic'
                      : 'codesmell';

    const template = this.templates.get(templateKey);
    if (!template) {
      return null;
    }

    const language = this.detectLanguage(finding.file);
    const context = {
      type: finding.rule || finding.type,
      message: finding.message,
      suggestion: finding.suggestion || this.generateSuggestion(finding, code),
      language: language,
      impact: this.getImpactDescription(finding.severity),
      rule: finding.rule,
    };

    const message = template(context);

    return {
      file: finding.file,
      line: finding.line,
      severity: finding.severity,
      message: message,
      suggestion: finding.suggestion || this.generateSuggestion(finding, code),
      confidence: finding.type === 'eslint' || finding.type === 'semgrep' ? 0.9 : 0.7,
    };
  }

  /**
   * Helper methods
   */
  private isJavaScriptOrTypeScript(filepath: string): boolean {
    return filepath.endsWith('.js') || filepath.endsWith('.jsx') || 
           filepath.endsWith('.ts') || filepath.endsWith('.tsx');
  }

  private detectLanguage(filepath: string): string {
    if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) return 'typescript';
    if (filepath.endsWith('.js') || filepath.endsWith('.jsx')) return 'javascript';
    if (filepath.endsWith('.java')) return 'java';
    if (filepath.endsWith('.py')) return 'python';
    return 'text';
  }

  private mapSemgrepSeverity(severity: string): 'high' | 'medium' | 'low' {
    const severityLower = severity.toLowerCase();
    if (severityLower.includes('error') || severityLower.includes('critical')) return 'high';
    if (severityLower.includes('warning') || severityLower.includes('info')) return 'medium';
    return 'low';
  }

  private extractCodeSnippet(code: string, line: number): string {
    const lines = code.split('\n');
    const start = Math.max(0, line - 2);
    const end = Math.min(lines.length, line + 2);
    return lines.slice(start, end).join('\n');
  }

  private generateFixFromESLint(code: string, message: any): string {
    // Basic fix generation - can be enhanced
    if (message.fix) {
      return 'ESLint auto-fix available';
    }
    return this.generateSuggestion({ type: 'eslint', message: message.message } as FallbackFinding, code);
  }

  private generateSuggestion(finding: FallbackFinding, code: string): string {
    // Generate basic suggestion based on finding type
    if (finding.suggestion) {
      return finding.suggestion;
    }

    // Default suggestions
    if (finding.type === 'security') {
      return 'Review and fix security issue';
    }
    if (finding.type === 'performance') {
      return 'Optimize for better performance';
    }
    if (finding.type === 'logic') {
      return 'Add proper validation and error handling';
    }

    return 'Review and refactor';
  }

  private getImpactDescription(severity: 'high' | 'medium' | 'low'): string {
    if (severity === 'high') {
      return 'High impact - should be fixed before merge';
    }
    if (severity === 'medium') {
      return 'Medium impact - should be addressed soon';
    }
    return 'Low impact - nice to have';
  }
}

