import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ReviewComment {
  file: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  confidence?: number; // 0-1 confidence score
}

const SYSTEM_PROMPT = `You are a Senior Staff Software Engineer and Technical Architect reviewing code changes.
Your goal is to ensure code meets high-performance, enterprise-grade standards, focusing on correctness, scalability, and maintainability.

Analyze the code diffs based on these comprehensive criteria:

1.  **Correctness & Logic:**
    * Identify logic bugs, off-by-one errors, and edge case failures.
    * Check for correct data handling and sanitization.

2.  **Security & Privacy:**
    * Detect vulnerabilities (OWASP Top 10, SQLi, XSS, IDOR).
    * Identify hardcoded secrets (API keys, passwords).
    * Ensure PII (Personal Identifiable Information) is handled correctly.

3.  **Performance & Scalability (Big O):**
    * Analyze Time & Space Complexity. Warn about O(n²) or worse operations in critical paths.
    * Identify memory leaks, unnecessary object creation, or unclosed resources.
    * Spot N+1 query problems or inefficient database interactions.

4.  **Architecture & Design Principles:**
    * **SOLID Principles:** Enforce Single Responsibility, Open/Closed, etc.
    * **Design Patterns:** Detect and suggest appropriate patterns (Factory, Strategy, Builder, Singleton, Observer) where they reduce complexity.
    * **Anti-Patterns:** Identify God Objects, Long Methods, Feature Envy, Primitive Obsession, and suggest refactoring.
    * **Testability:** Ensure code is testable (avoid tight coupling/static dependency). Suggest Dependency Injection.

5.  **Concurrency & Thread Safety:**
    * Identify race conditions, deadlocks, or unsafe usage of shared resources in multi-threaded contexts.

6.  **Observability & Error Handling:**
    * Ensure proper logging (structured logging preferred) for debugging.
    * Check that exceptions are not swallowed and error messages are actionable.

7.  **Modern Java Best Practices & Syntax:**
    * **Streams API:** Suggest Stream API instead of manual loops for readability and functional style.
    * **Optional:** Suggest Optional instead of null checks for safety.
    * **Records:** Suggest Records for data carriers (immutable, less boilerplate).
    * **Modern Features:** Suggest Pattern matching, Switch expressions, and 'var' for local variables.
    * **Immutable Collections:** Suggest List.of(), Set.of(), Map.of().
    * **String Handling:** Suggest isBlank(), lines(), strip(), text blocks.
    * **File I/O:** Suggest Files.readString(), Files.writeString().

8.  **Code Hygiene:**
    * Identify Dead Code, Duplicate Code, and "Magic Numbers".
    * Suggest better naming conventions that reveal intent.
9. Logic bugs
10. Security problems
11. Performance issues
12. Code smells
13. Style problems
14. Dead code
15. Better coding practices - suggest improvements like using const/let appropriately, avoiding magic numbers, proper error handling
16. Better available method or approach - suggest modern APIs, built-in functions, or more efficient alternatives:
   - Java: Stream API instead of manual loops (more compact, functional style)
   - Java: Optional instead of null checks (safer, more expressive)
   - Java: Records instead of verbose classes (less boilerplate, immutable)
   - Java: Pattern matching, switch expressions (modern Java features)
   - Java: var for local variables (when type is obvious)
   - Java: List.of(), Set.of(), Map.of() for immutable collections (compact, efficient)
   - Java: String methods like isBlank(), lines(), strip() (modern, efficient)
   - Java: Files.readString(), Files.writeString() (simpler file I/O)
   - Focus on storage efficiency: suggest compact data structures, avoid unnecessary object creation
   - Suggest high-standard, impressive approaches that developers often miss but are industry best practices
17. Duplicate code - identify code patterns that are repeated within the diff or similar to common patterns that should be refactored


**Response Format:**
Return ONLY a valid JSON array. Do not wrap in markdown code blocks.

IMPORTANT - Suggestion Format:
- Provide COMPLETE updated method/code block in suggestions, not just instructions
- If issue is in a method, show the ENTIRE method with fix applied (from method start to end)
- Include full method signature, body, and closing brace
- Show complete code so developer can copy-paste directly
- Example: Instead of "add null check on line 10", show the complete method with null check added
- For multi-line fixes, show the complete updated code block

[
  {
    "file": "relative/path/to/file",
    "line": 42,
    "severity": "critical|major|minor|nitpick",
    "message": "Concise explanation of the issue (e.g., 'Potential O(n^2) performance bottleneck' or 'Use Java Records here')",
    "suggestion": "Complete updated method/code block with fix applied - show full method from start to end with all code"
  }
]

If no issues found, return empty array: [].`;

export class LLMReviewer {
  private model: any;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  }

  async reviewDiff(filepath: string, diff: string, retryCount = 0): Promise<ReviewComment[]> {
    if (!diff || diff.trim().length === 0) {
      return [];
    }

    // Skip autogenerated files
    if (this.shouldSkipFile(filepath)) {
      return [];
    }

    const prompt = `${SYSTEM_PROMPT}

File: ${filepath}
Diff:
\`\`\`
${diff}
\`\`\`

Analyze this diff and return JSON array of issues.`;

    const maxRetries = 5; // Increased from 3 to 5
    const baseDelay = 15000; // Increased from 8s to 15s base delay

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      }
      
      // Find JSON array
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`No JSON found in LLM response for ${filepath}`);
        return [];
      }

      const comments: ReviewComment[] = JSON.parse(jsonMatch[0]);
      
      // Validate and filter comments
      return comments.filter((comment) => {
        // Map severity values: critical/major/minor/nitpick -> high/medium/low
        const severityMap: Record<string, string> = {
          'critical': 'high',
          'major': 'medium',
          'minor': 'low',
          'nitpick': 'low',
          'high': 'high',
          'medium': 'medium',
          'low': 'low',
        };
        
        const normalizedSeverity = severityMap[comment.severity?.toLowerCase() || ''] || comment.severity;
        
        return (
          comment.file &&
          typeof comment.line === 'number' &&
          (['high', 'medium', 'low', 'critical', 'major', 'minor', 'nitpick'].includes(comment.severity?.toLowerCase() || '')) &&
          comment.message &&
          comment.suggestion
        );
      }).map((comment) => {
        // Normalize severity to standard values
        const severityMap: Record<string, string> = {
          'critical': 'high',
          'major': 'medium',
          'minor': 'low',
          'nitpick': 'low',
        };
        const normalizedSeverity = severityMap[comment.severity?.toLowerCase() || ''] || comment.severity;
        
        // Calculate confidence score based on severity and message quality
        const confidence = this.calculateConfidence(comment, normalizedSeverity);
        
        return {
          ...comment,
          severity: normalizedSeverity as 'high' | 'medium' | 'low',
          confidence,
        };
      });
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      
      // Rate limit error (429) - retry with exponential backoff
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
        if (retryCount < maxRetries) {
          // Extract retry delay from error if available, otherwise use exponential backoff
          let delay = baseDelay;
          const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
          if (retryMatch) {
            delay = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000; // Add 1s buffer
          } else {
            delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          }
          
          console.warn(`   ⏳ Rate limit hit for ${filepath}. Retrying in ${Math.ceil(delay / 1000)}s... (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.reviewDiff(filepath, diff, retryCount + 1);
        } else {
          console.error(`Error reviewing ${filepath}: Rate limit exceeded after ${maxRetries} retries`);
          console.error('   ⚠️  Free tier limit: 2 requests/minute per model. Please wait or upgrade your plan.');
          return [];
        }
      }
      
      // Connection error handling
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        console.error(`Error reviewing ${filepath}:`, errorMessage);
        console.error('   ⚠️  Connection issue with Gemini API. Check internet/VPN.');
      } else {
        console.error(`Error reviewing ${filepath}:`, errorMessage);
      }
      
      return [];
    }
  }

  /**
   * Calculate confidence score for a review comment
   */
  private calculateConfidence(comment: any, severity: string): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for high severity issues (more likely to be real)
    const sev = severity.toLowerCase();
    if (sev === 'high' || sev === 'critical') {
      confidence = 0.9;
    } else if (sev === 'medium' || sev === 'major') {
      confidence = 0.75;
    } else {
      confidence = 0.6;
    }

    // Boost confidence if suggestion is detailed
    if (comment.suggestion && comment.suggestion.length > 100) {
      confidence += 0.1;
    }

    // Boost confidence if message mentions specific patterns
    const highConfidenceKeywords = [
      'security', 'vulnerability', 'bug', 'error', 'exception',
      'null pointer', 'memory leak', 'race condition', 'deadlock'
    ];
    if (highConfidenceKeywords.some(keyword => 
      comment.message?.toLowerCase().includes(keyword)
    )) {
      confidence += 0.05;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
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

  /**
   * Review batch of files with full context (OPTIMIZED)
   * Uses chunked batching to avoid token limits and quota issues
   */
  async reviewBatchWithContext(
    files: Array<{ file: string; diff: string }>,
    contextSummary: string
  ): Promise<ReviewComment[]> {
    if (files.length === 0) {
      return [];
    }

    // OPTIMIZATION: Split into smaller chunks (5 files per batch) to avoid:
    // 1. Token limit issues (very large prompts)
    // 2. Quota issues (if one batch fails, others can still work)
    // 3. Better error recovery
    const CHUNK_SIZE = 5;
    const chunks: Array<Array<{ file: string; diff: string }>> = [];
    
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      chunks.push(files.slice(i, i + CHUNK_SIZE));
    }

    console.log(`  📦 Splitting into ${chunks.length} batch(es) of ${CHUNK_SIZE} files each...`);
    
    const allComments: ReviewComment[] = [];
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      // Build comprehensive prompt with chunk files and context
      let prompt = `${SYSTEM_PROMPT}\n\n`;
      prompt += `${contextSummary}\n\n`;
      prompt += `## Code Changes to Review (Batch ${chunkIndex + 1}/${chunks.length})\n\n`;
      
      for (const file of chunk) {
        prompt += `### File: ${file.file}\n`;
        prompt += `\`\`\`diff\n${file.diff}\n\`\`\`\n\n`;
      }
      
      prompt += `\nReview ALL the above files considering the context provided. `;
      prompt += `Pay special attention to duplicates, patterns, and breaking changes mentioned in the context.`;
      prompt += `\n\nReturn JSON array with issues found across all files.`;

      try {
        console.log(`  ✓ Processing batch ${chunkIndex + 1}/${chunks.length} (${chunk.length} files)...`);
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        // Parse JSON response
        let jsonText = text;
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\n?/i, '').replace(/\n?```$/i, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\n?/i, '').replace(/\n?```$/i, '');
        }

        const comments = JSON.parse(jsonText) as ReviewComment[];
        
        // Ensure file paths are set correctly and calculate confidence scores
        const mappedComments = comments.map(comment => {
          // Normalize severity for confidence calculation
          const sev = (comment.severity || '').toLowerCase();
          const normalizedSeverity = sev === 'critical' ? 'high' : 
                                   sev === 'major' ? 'medium' :
                                   sev === 'minor' || sev === 'nitpick' ? 'low' :
                                   sev;
          
          // Calculate confidence score
          const confidence = this.calculateConfidence(comment, normalizedSeverity);
          
          return {
            ...comment,
            file: comment.file || chunk[0]?.file || 'unknown',
            severity: normalizedSeverity as 'high' | 'medium' | 'low',
            confidence,
          };
        });
        
        allComments.push(...mappedComments);
        console.log(`  ✓ Batch ${chunkIndex + 1} complete: ${mappedComments.length} issues found`);
        
        // Wait between batches to respect rate limits (2 req/min)
        if (chunkIndex < chunks.length - 1) {
          console.log(`  ⏳ Waiting 35s before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, 35000));
        }
      } catch (error: any) {
        console.warn(`⚠️  Batch ${chunkIndex + 1} failed, falling back to individual reviews: ${error.message}`);
        // Fallback: Review files in this chunk individually with rate limiting
        for (let i = 0; i < chunk.length; i++) {
          const file = chunk[i];
          const comments = await this.reviewDiff(file.file, file.diff);
          allComments.push(...comments);
          
          // Wait 35 seconds between files to respect rate limit
          if (i < chunk.length - 1) {
            console.log(`  ⏳ Waiting 35s to respect rate limits (2 req/min)...`);
            await new Promise((resolve) => setTimeout(resolve, 35000));
          }
        }
      }
    }
    
    return allComments;
  }
}

