/**
 * Codebase Knowledge Engine (Sprint 4.2)
 * Suggests code reuse, existing methods, and patterns from codebase
 */

import { CodeSymbol } from '../parser/types.js';
import { CodebaseIndexer } from '../indexer/indexer.js';

export interface CodebaseSuggestion {
  type: 'reuse_method' | 'reuse_utility' | 'follow_pattern' | 'extract_constant';
  file: string;
  element: string; // method name, class name, etc.
  suggestion: string;
  reason: string;
  existingLocation: string; // Where the existing code is
  similarity?: number; // How similar (0-1)
}

export interface CodebaseKnowledgeReport {
  suggestions: CodebaseSuggestion[];
  reusableMethods: CodebaseSuggestion[];
  reusableUtilities: CodebaseSuggestion[];
  patterns: CodebaseSuggestion[];
  summary: string;
}

export class CodebaseKnowledgeEngine {
  private indexer: CodebaseIndexer;

  constructor(indexer: CodebaseIndexer) {
    this.indexer = indexer;
  }

  /**
   * Analyze PR for code reuse opportunities
   */
  analyzeCodebaseKnowledge(
    prSymbols: CodeSymbol[],
    prFiles: Map<string, string>,
    mainBranchSymbols: CodeSymbol[]
  ): CodebaseKnowledgeReport {
    const suggestions: CodebaseSuggestion[] = [];

    // 1. Find reusable methods
    const reusableMethods = this.findReusableMethods(prSymbols, mainBranchSymbols);
    suggestions.push(...reusableMethods);

    // 2. Find reusable utilities
    const reusableUtilities = this.findReusableUtilities(prSymbols, mainBranchSymbols, prFiles);
    suggestions.push(...reusableUtilities);

    // 3. Find patterns to follow
    const patterns = this.findPatternsToFollow(prSymbols, mainBranchSymbols);
    suggestions.push(...patterns);

    // 4. Find constants to extract
    const constants = this.findConstantsToExtract(prFiles, mainBranchSymbols);
    suggestions.push(...constants);

    return {
      suggestions,
      reusableMethods,
      reusableUtilities,
      patterns,
      summary: this.generateSummary(suggestions),
    };
  }

  /**
   * Find methods that can be reused instead of duplicating
   */
  private findReusableMethods(
    prSymbols: CodeSymbol[],
    mainBranchSymbols: CodeSymbol[]
  ): CodebaseSuggestion[] {
    const suggestions: CodebaseSuggestion[] = [];
    
    // Helper to check if file is a test file
    const isTestFile = (filepath: string): boolean => {
      const lower = filepath.toLowerCase();
      return lower.includes('test') || 
             lower.includes('spec') ||
             lower.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/i) !== null;
    };

    for (const prSymbol of prSymbols) {
      if (prSymbol.type !== 'method' && prSymbol.type !== 'function') {
        continue;
      }
      
      const prMethodName = prSymbol.name || this.extractMethodNameFromSignature(prSymbol.signature || '');
      if (!prMethodName || prMethodName === 'unknown') continue; // Skip "unknown" methods

      // Find similar methods in main branch
      for (const mainSymbol of mainBranchSymbols) {
        if (mainSymbol.type !== 'method' && mainSymbol.type !== 'function') {
          continue;
        }

        // CRITICAL FIX: Skip if same file - don't suggest reusing method from same file!
        if (prSymbol.file === mainSymbol.file) {
          continue;
        }

        // SKIP: Circular suggestions between test files (both are test files)
        if (isTestFile(prSymbol.file) && isTestFile(mainSymbol.file)) {
          continue; // Test files can have duplicate helpers, it's fine!
        }

        const mainMethodName = mainSymbol.name || this.extractMethodNameFromSignature(mainSymbol.signature || '');
        if (!mainMethodName || mainMethodName === 'unknown') continue; // Skip "unknown" methods

        // Check if method names are similar
        const nameSimilarity = this.calculateNameSimilarity(prMethodName, mainMethodName);
        if (nameSimilarity > 0.7) {
          // Check if signatures are similar
          const sigSimilarity = this.calculateSignatureSimilarity(
            prSymbol.signature || '',
            mainSymbol.signature || ''
          );

          if (sigSimilarity > 0.6) {
            // Ensure method name is not empty or undefined
            const prMethodName = prSymbol.name || prSymbol.signature?.match(/(\w+)\s*\(/)?.[1] || 'method';
            const mainMethodName = mainSymbol.name || mainSymbol.signature?.match(/(\w+)\s*\(/)?.[1] || 'method';
            
            suggestions.push({
              type: 'reuse_method',
              file: prSymbol.file,
              element: prMethodName,
              suggestion: `Use existing method \`${mainMethodName}\` from \`${mainSymbol.file}\` instead of duplicating`,
              reason: `Method \`${mainMethodName}\` already exists with ${(sigSimilarity * 100).toFixed(0)}% similar signature`,
              existingLocation: `${mainSymbol.file}::${mainMethodName}`,
              similarity: sigSimilarity,
            });
          }
        }
      }
    }

    return suggestions.slice(0, 10); // Limit to top 10
  }

  /**
   * Find utility classes that can be reused
   */
  private findReusableUtilities(
    prSymbols: CodeSymbol[],
    mainBranchSymbols: CodeSymbol[],
    prFiles: Map<string, string>
  ): CodebaseSuggestion[] {
    const suggestions: CodebaseSuggestion[] = [];

    // Look for utility patterns in PR code
    for (const [file, code] of prFiles.entries()) {
      const lowerCode = code.toLowerCase();

      // Check for common utility patterns
      const utilityPatterns = [
        { pattern: /stringutils|stringutil|stringhelper/i, name: 'StringUtils' },
        { pattern: /dateutils|dateutil|datehelper/i, name: 'DateUtils' },
        { pattern: /validationutils|validationutil|validator/i, name: 'ValidationUtils' },
        { pattern: /collectionutils|collectionutil/i, name: 'CollectionUtils' },
        { pattern: /fileutils|fileutil|filehelper/i, name: 'FileUtils' },
      ];

      for (const { pattern, name } of utilityPatterns) {
        if (pattern.test(code)) {
          // Check if utility class exists in main branch
          const existingUtility = mainBranchSymbols.find(s =>
            s.type === 'class' &&
            (s.name.toLowerCase().includes(name.toLowerCase()) ||
             s.file.toLowerCase().includes(name.toLowerCase()))
          );

          if (existingUtility) {
            suggestions.push({
              type: 'reuse_utility',
              file,
              element: name,
              suggestion: `Use existing utility class \`${existingUtility.name}\` from \`${existingUtility.file}\``,
              reason: `Utility class \`${existingUtility.name}\` already exists in codebase`,
              existingLocation: `${existingUtility.file}::${existingUtility.name}`,
            });
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Find patterns to follow from codebase
   */
  private findPatternsToFollow(
    prSymbols: CodeSymbol[],
    mainBranchSymbols: CodeSymbol[]
  ): CodebaseSuggestion[] {
    const suggestions: CodebaseSuggestion[] = [];

    // Analyze naming patterns
    const mainNamingPatterns = this.extractNamingPatterns(mainBranchSymbols);
    const prNamingPatterns = this.extractNamingPatterns(prSymbols);

    // Find violations
    for (const prSymbol of prSymbols) {
      const mainPattern = mainNamingPatterns.get(prSymbol.type);
      if (mainPattern && !this.matchesPattern(prSymbol.name, mainPattern)) {
        suggestions.push({
          type: 'follow_pattern',
          file: prSymbol.file,
          element: prSymbol.name,
          suggestion: `Follow codebase naming pattern: ${mainPattern.description}`,
          reason: `Codebase uses ${mainPattern.description} for ${prSymbol.type} names`,
          existingLocation: `Pattern found in ${mainPattern.exampleCount} existing ${prSymbol.type}(s)`,
        });
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Find constants that should be extracted
   */
  private findConstantsToExtract(
    prFiles: Map<string, string>,
    mainBranchSymbols: CodeSymbol[]
  ): CodebaseSuggestion[] {
    const suggestions: CodebaseSuggestion[] = [];

    // Look for magic numbers/strings that might already exist as constants
    for (const [file, code] of prFiles.entries()) {
      // Find magic numbers
      const magicNumbers = code.match(/\b\d{2,}\b/g) || [];
      for (const num of magicNumbers) {
        // Check if constant exists in main branch
        const existingConstant = mainBranchSymbols.find(s =>
          s.type === 'field' &&
          s.isStatic === true &&
          (s.code?.includes(num) || s.name.toLowerCase().includes(num))
        );

        if (existingConstant) {
          suggestions.push({
            type: 'extract_constant',
            file,
            element: num,
            suggestion: `Use existing constant \`${existingConstant.name}\` from \`${existingConstant.file}\` instead of magic number`,
            reason: `Constant \`${existingConstant.name}\` already exists for value ${num}`,
            existingLocation: `${existingConstant.file}::${existingConstant.name}`,
          });
        }
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Extract naming patterns from symbols
   */
  private extractNamingPatterns(symbols: CodeSymbol[]): Map<string, { pattern: RegExp; description: string; exampleCount: number }> {
    const patterns = new Map<string, { pattern: RegExp; description: string; exampleCount: number }>();

    // Analyze method names
    const methodNames = symbols.filter(s => s.type === 'method').map(s => s.name);
    if (methodNames.length > 0) {
      const camelCaseCount = methodNames.filter(n => /^[a-z]/.test(n)).length;
      if (camelCaseCount > methodNames.length * 0.8) {
        patterns.set('method', {
          pattern: /^[a-z]/,
          description: 'camelCase (e.g., getUserData)',
          exampleCount: camelCaseCount,
        });
      }
    }

    // Analyze class names
    const classNames = symbols.filter(s => s.type === 'class').map(s => s.name);
    if (classNames.length > 0) {
      const pascalCaseCount = classNames.filter(n => /^[A-Z]/.test(n)).length;
      if (pascalCaseCount > classNames.length * 0.8) {
        patterns.set('class', {
          pattern: /^[A-Z]/,
          description: 'PascalCase (e.g., UserService)',
          exampleCount: pascalCaseCount,
        });
      }
    }

    return patterns;
  }

  /**
   * Check if name matches pattern
   */
  private matchesPattern(name: string, pattern: { pattern: RegExp; description: string }): boolean {
    return pattern.pattern.test(name);
  }

  /**
   * Calculate name similarity (simple)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const lower1 = name1.toLowerCase();
    const lower2 = name2.toLowerCase();

    if (lower1 === lower2) return 1.0;
    if (lower1.includes(lower2) || lower2.includes(lower1)) return 0.8;

    // Levenshtein-like similarity
    const longer = lower1.length > lower2.length ? lower1 : lower2;
    const shorter = lower1.length > lower2.length ? lower2 : lower1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return 1 - editDistance / longer.length;
  }

  /**
   * Calculate signature similarity
   */
  private calculateSignatureSimilarity(sig1: string, sig2: string): number {
    if (!sig1 || !sig2) return 0;

    const params1 = this.extractParameters(sig1);
    const params2 = this.extractParameters(sig2);

    if (params1.length === 0 && params2.length === 0) return 1.0;
    if (params1.length === 0 || params2.length === 0) return 0.3;

    // Check parameter count
    const countMatch = params1.length === params2.length ? 0.5 : 0.2;

    // Check parameter types
    const typeMatches = params1.filter((p1, i) => 
      params2[i] && p1.toLowerCase() === params2[i].toLowerCase()
    ).length;
    const typeMatch = typeMatches / Math.max(params1.length, params2.length) * 0.5;

    return countMatch + typeMatch;
  }

  /**
   * Extract parameters from signature
   */
  private extractParameters(signature: string): string[] {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];

    return match[1]
      .split(',')
      .map(p => p.trim().split(/\s+/)[0]) // Get type only
      .filter(p => p.length > 0);
  }

  /**
   * Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate summary
   */
  private generateSummary(suggestions: CodebaseSuggestion[]): string {
    if (suggestions.length === 0) {
      return '✅ No code reuse opportunities found';
    }

    const reuse = suggestions.filter(s => s.type === 'reuse_method' || s.type === 'reuse_utility').length;
    const patterns = suggestions.filter(s => s.type === 'follow_pattern').length;
    const constants = suggestions.filter(s => s.type === 'extract_constant').length;

    const parts: string[] = [];
    if (reuse > 0) parts.push(`${reuse} reuse opportunity(ies)`);
    if (patterns > 0) parts.push(`${patterns} pattern suggestion(s)`);
    if (constants > 0) parts.push(`${constants} constant extraction(s)`);

    return `💡 Codebase Knowledge: ${parts.join(', ')}`;
  }
}

