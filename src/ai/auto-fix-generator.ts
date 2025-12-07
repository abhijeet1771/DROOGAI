/**
 * Auto-Fix Code Generator (Top Priority Feature)
 * Generates complete fix code that can be applied directly
 * This is what makes DroogAI leading - we don't just suggest, we generate fixes!
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ReviewComment } from '../llm.js';

export interface AutoFix {
  file: string;
  line: number;
  issue: string;
  originalCode: string;
  fixedCode: string;
  confidence: number; // 0-1
  canAutoApply: boolean; // Can this be auto-applied safely?
  explanation: string;
}

export interface AutoFixReport {
  fixes: AutoFix[];
  canAutoApplyCount: number;
  estimatedTimeSaved: string; // e.g., "2 hours"
  summary: string;
}

const AUTO_FIX_PROMPT = `You are an expert code fix generator. Your task is to generate COMPLETE, PRODUCTION-READY fix code.

**CRITICAL REQUIREMENTS:**
1. Generate COMPLETE code blocks (entire method/function), not partial fixes
2. Code must be syntactically correct and ready to use
3. Preserve existing functionality while fixing the issue
4. Follow the codebase's existing patterns and style
5. Include proper error handling
6. Add necessary imports if needed

**Context:**
- File: {file}
- Issue: {issue}
- Original Code:
\`\`\`
{originalCode}
\`\`\`

**Your Task:**
Generate the COMPLETE fixed code block. Show the entire method/function with the fix applied.

Return ONLY a valid JSON object:
{
  "fixedCode": "Complete fixed code block (entire method/function)",
  "explanation": "Brief explanation of what was fixed",
  "canAutoApply": true/false,
  "confidence": 0.0-1.0
}

If the fix cannot be safely auto-applied, set canAutoApply to false.`;

export class AutoFixGenerator {
  private model: any;
  private geminiKey: string;

  constructor(geminiKey: string) {
    this.geminiKey = geminiKey;
    const genAI = new GoogleGenerativeAI(geminiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Generate auto-fixes for review comments
   */
  async generateAutoFixes(
    comments: ReviewComment[],
    fileContents: Map<string, string>
  ): Promise<AutoFixReport> {
    const fixes: AutoFix[] = [];

    // Include ALL priorities (high, medium, low) - let user decide what to apply
    const fixableComments = comments.filter(c => {
      const sev = (c.severity || '').toLowerCase();
      // Include all severities: high, medium, low, critical, major, minor, nitpick
      return (sev === 'high' || sev === 'medium' || sev === 'low' || 
              sev === 'critical' || sev === 'major' || sev === 'minor' || sev === 'nitpick') 
              && c.suggestion && c.suggestion.length > 0;
    });

    for (const comment of fixableComments.slice(0, 10)) { // Limit to 10 to avoid rate limits
      try {
        const fileContent = fileContents.get(comment.file) || '';
        const originalCode = this.extractCodeBlock(fileContent, comment.line);

        if (!originalCode) {
          continue;
        }

        const fix = await this.generateFix(comment, originalCode, fileContent);
        if (fix) {
          fixes.push(fix);
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn(`Failed to generate fix for ${comment.file}:${comment.line}:`, error);
      }
    }

    const canAutoApplyCount = fixes.filter(f => f.canAutoApply).length;
    const estimatedTimeSaved = this.estimateTimeSaved(fixes);

    return {
      fixes,
      canAutoApplyCount,
      estimatedTimeSaved,
      summary: this.generateSummary(fixes, canAutoApplyCount, estimatedTimeSaved),
    };
  }

  /**
   * Generate fix for a single comment
   */
  private async generateFix(
    comment: ReviewComment,
    originalCode: string,
    fullFileContent: string
  ): Promise<AutoFix | null> {
    try {
      const prompt = AUTO_FIX_PROMPT
        .replace('{file}', comment.file)
        .replace('{issue}', comment.message || '')
        .replace('{originalCode}', originalCode);

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON
      let jsonText = text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      }

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const fixData = JSON.parse(jsonMatch[0]);

      return {
        file: comment.file,
        line: comment.line,
        issue: comment.message || '',
        originalCode,
        fixedCode: fixData.fixedCode || '',
        confidence: fixData.confidence || 0.7,
        canAutoApply: fixData.canAutoApply === true && fixData.confidence > 0.8,
        explanation: fixData.explanation || 'Fix generated automatically',
      };
    } catch (error) {
      console.warn('Auto-fix generation failed:', error);
      return null;
    }
  }

  /**
   * Extract code block around line number
   */
  private extractCodeBlock(fileContent: string, line: number): string {
    const lines = fileContent.split('\n');
    const startLine = Math.max(0, line - 10);
    const endLine = Math.min(lines.length, line + 20);

    // Try to find method/function boundaries
    let methodStart = startLine;
    let methodEnd = endLine;

    // Find method start (look for opening brace or method signature)
    for (let i = line; i >= 0; i--) {
      if (lines[i].match(/\{\s*$/) || lines[i].match(/^\s*(public|private|protected|static).*\{/)) {
        methodStart = i;
        break;
      }
    }

    // Find method end (look for closing brace)
    let braceCount = 0;
    for (let i = methodStart; i < lines.length; i++) {
      const openBraces = (lines[i].match(/\{/g) || []).length;
      const closeBraces = (lines[i].match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;

      if (braceCount === 0 && i > methodStart) {
        methodEnd = i + 1;
        break;
      }
    }

    return lines.slice(methodStart, methodEnd).join('\n');
  }

  /**
   * Estimate time saved
   */
  private estimateTimeSaved(fixes: AutoFix[]): string {
    const canAutoApply = fixes.filter(f => f.canAutoApply).length;
    // Estimate: 15 minutes per fix on average
    const minutes = canAutoApply * 15;
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hour(s)`;
  }

  /**
   * Generate summary
   */
  private generateSummary(fixes: AutoFix[], canAutoApplyCount: number, timeSaved: string): string {
    if (fixes.length === 0) {
      return '✅ No auto-fixes generated';
    }

    return `💡 Auto-Fix: ${canAutoApplyCount} fix(es) can be applied automatically, saving ~${timeSaved}`;
  }
}

