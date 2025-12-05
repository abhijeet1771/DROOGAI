/**
 * Context-Aware Intelligence
 * Detects domain, team patterns, and project structure to provide context-aware suggestions
 */

export interface DomainContext {
  domain: 'payment' | 'test-automation' | 'api' | 'backend' | 'frontend' | 'data' | 'security' | 'unknown';
  confidence: number;
  indicators: string[];
  suggestions: string[];
}

export interface TeamPattern {
  pattern: string;
  file: string;
  frequency: number;
  examples: string[];
}

export interface ContextReport {
  domain: DomainContext;
  teamPatterns: TeamPattern[];
  projectStructure: {
    hasPageObjects: boolean;
    hasStepDefs: boolean;
    hasServices: boolean;
    hasControllers: boolean;
    framework?: string;
  };
  suggestions: string[];
}

export class ContextDetector {
  /**
   * Detect context from codebase
   */
  detectContext(
    prFiles: Map<string, string>,
    prFileNames: string[],
    mainBranchFiles?: string[]
  ): ContextReport {
    const domain = this.detectDomain(prFiles, prFileNames);
    const teamPatterns = this.detectTeamPatterns(prFiles, mainBranchFiles || []);
    const projectStructure = this.detectProjectStructure(mainBranchFiles || []);
    const suggestions = this.generateContextualSuggestions(domain, teamPatterns, projectStructure);

    return {
      domain,
      teamPatterns,
      projectStructure,
      suggestions,
    };
  }

  /**
   * Detect domain from code
   */
  private detectDomain(prFiles: Map<string, string>, prFileNames: string[]): DomainContext {
    const indicators: string[] = [];
    let paymentScore = 0;
    let testAutomationScore = 0;
    let apiScore = 0;
    let backendScore = 0;
    let frontendScore = 0;
    let dataScore = 0;
    let securityScore = 0;

    for (const [filename, content] of prFiles.entries()) {
      const lowerContent = content.toLowerCase();
      const lowerFile = filename.toLowerCase();

      // Payment domain
      if (lowerContent.includes('payment') || 
          lowerContent.includes('billing') ||
          lowerContent.includes('credit card') ||
          lowerContent.includes('transaction') ||
          lowerContent.includes('invoice')) {
        paymentScore += 2;
        indicators.push('payment-related code');
      }

      // Test automation domain
      if (lowerFile.includes('test') || 
          lowerFile.includes('spec') ||
          lowerFile.includes('.feature') ||
          lowerFile.includes('page-object') ||
          lowerFile.includes('step-definition') ||
          lowerContent.includes('@given') ||
          lowerContent.includes('@when') ||
          lowerContent.includes('@then') ||
          lowerContent.includes('getbyrole') ||
          lowerContent.includes('getbytestid')) {
        testAutomationScore += 3;
        indicators.push('test automation code');
      }

      // API domain
      if (lowerContent.includes('@restcontroller') ||
          lowerContent.includes('@controller') ||
          lowerContent.includes('@requestmapping') ||
          lowerContent.includes('@getmapping') ||
          lowerContent.includes('@postmapping') ||
          lowerContent.includes('endpoint') ||
          lowerContent.includes('api')) {
        apiScore += 2;
        indicators.push('API endpoint');
      }

      // Backend domain
      if (lowerContent.includes('@service') ||
          lowerContent.includes('@repository') ||
          lowerContent.includes('@entity') ||
          lowerContent.includes('jpa') ||
          lowerContent.includes('hibernate') ||
          lowerContent.includes('database')) {
        backendScore += 2;
        indicators.push('backend service');
      }

      // Frontend domain
      if (lowerFile.endsWith('.jsx') ||
          lowerFile.endsWith('.tsx') ||
          lowerFile.endsWith('.vue') ||
          lowerContent.includes('react') ||
          lowerContent.includes('vue') ||
          lowerContent.includes('angular')) {
        frontendScore += 2;
        indicators.push('frontend code');
      }

      // Data domain
      if (lowerContent.includes('sql') ||
          lowerContent.includes('query') ||
          lowerContent.includes('database') ||
          lowerContent.includes('repository') ||
          lowerContent.includes('dao')) {
        dataScore += 1;
        indicators.push('data access');
      }

      // Security domain
      if (lowerContent.includes('authentication') ||
          lowerContent.includes('authorization') ||
          lowerContent.includes('jwt') ||
          lowerContent.includes('oauth') ||
          lowerContent.includes('encrypt') ||
          lowerContent.includes('hash')) {
        securityScore += 2;
        indicators.push('security-related code');
      }
    }

    // Determine domain with highest score
    const scores = {
      payment: paymentScore,
      'test-automation': testAutomationScore,
      api: apiScore,
      backend: backendScore,
      frontend: frontendScore,
      data: dataScore,
      security: securityScore,
    };

    const maxScore = Math.max(...Object.values(scores));
    const detectedDomain = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as DomainContext['domain'] || 'unknown';

    // Calculate confidence (0-1)
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0;

    // Generate domain-specific suggestions
    const suggestions = this.getDomainSuggestions(detectedDomain);

    return {
      domain: detectedDomain,
      confidence: Math.min(confidence, 1),
      indicators: [...new Set(indicators)],
      suggestions,
    };
  }

  /**
   * Get domain-specific suggestions
   */
  private getDomainSuggestions(domain: DomainContext['domain']): string[] {
    const suggestions: Record<DomainContext['domain'], string[]> = {
      payment: [
        'Don\'t log credit card numbers or sensitive payment data',
        'Use secure payment gateways and never store raw payment information',
        'Ensure PCI-DSS compliance for payment processing',
        'Add proper error handling for payment failures',
      ],
      'test-automation': [
        'Use Page Object Model pattern for better maintainability',
        'Avoid hardcoded locators - use centralized locator files',
        'Follow Given-When-Then structure in feature files',
        'Keep step definitions focused and reusable',
      ],
      api: [
        'Add rate limiting for public endpoints',
        'Implement proper authentication and authorization',
        'Use versioning for API endpoints (e.g., /api/v1/)',
        'Add request/response validation',
        'Document API endpoints with OpenAPI/Swagger',
      ],
      backend: [
        'Follow service layer pattern - business logic in services, not controllers',
        'Use dependency injection for better testability',
        'Implement proper exception handling',
        'Add logging for debugging and monitoring',
      ],
      frontend: [
        'Use component-based architecture',
        'Implement proper state management',
        'Add error boundaries for better UX',
        'Optimize bundle size and performance',
      ],
      data: [
        'Use parameterized queries to prevent SQL injection',
        'Implement connection pooling for database connections',
        'Add proper transaction management',
        'Use repository pattern for data access',
      ],
      security: [
        'Never hardcode secrets or API keys',
        'Use environment variables or secret management services',
        'Implement proper input validation and sanitization',
        'Follow OWASP security guidelines',
      ],
      unknown: [],
    };

    return suggestions[domain] || [];
  }

  /**
   * Detect team patterns from codebase
   */
  private detectTeamPatterns(
    prFiles: Map<string, string>,
    mainBranchFiles: string[]
  ): TeamPattern[] {
    const patterns: Map<string, TeamPattern> = new Map();

    // Analyze file structure patterns
    const folderPatterns = new Map<string, number>();
    for (const file of mainBranchFiles) {
      const parts = file.split('/');
      if (parts.length > 1) {
        const folder = parts[parts.length - 2];
        folderPatterns.set(folder, (folderPatterns.get(folder) || 0) + 1);
      }
    }

    // Common folder patterns
    for (const [folder, count] of folderPatterns.entries()) {
      if (count >= 3) { // At least 3 files in this folder
        patterns.set(`folder:${folder}`, {
          pattern: `Files are organized in ${folder}/ folder`,
          file: folder,
          frequency: count,
          examples: mainBranchFiles.filter(f => f.includes(`/${folder}/`)).slice(0, 3),
        });
      }
    }

    // Analyze naming patterns
    const namingPatterns = new Map<string, number>();
    for (const file of mainBranchFiles) {
      const filename = file.split('/').pop() || '';
      if (filename.includes('Page') && filename.endsWith('.js')) {
        namingPatterns.set('Page suffix', (namingPatterns.get('Page suffix') || 0) + 1);
      }
      if (filename.includes('Service') && filename.endsWith('.java')) {
        namingPatterns.set('Service suffix', (namingPatterns.get('Service suffix') || 0) + 1);
      }
      if (filename.includes('Controller') && filename.endsWith('.java')) {
        namingPatterns.set('Controller suffix', (namingPatterns.get('Controller suffix') || 0) + 1);
      }
    }

    for (const [pattern, count] of namingPatterns.entries()) {
      if (count >= 2) {
        patterns.set(`naming:${pattern}`, {
          pattern: `Team uses ${pattern} naming convention`,
          file: pattern,
          frequency: count,
          examples: mainBranchFiles.filter(f => {
            if (pattern.includes('Page')) return f.includes('Page') && f.endsWith('.js');
            if (pattern.includes('Service')) return f.includes('Service') && f.endsWith('.java');
            if (pattern.includes('Controller')) return f.includes('Controller') && f.endsWith('.java');
            return false;
          }).slice(0, 3),
        });
      }
    }

    return Array.from(patterns.values());
  }

  /**
   * Detect project structure
   */
  private detectProjectStructure(files: string[]): ContextReport['projectStructure'] {
    const structure = {
      hasPageObjects: false,
      hasStepDefs: false,
      hasServices: false,
      hasControllers: false,
      framework: undefined as string | undefined,
    };

    for (const file of files) {
      const lowerFile = file.toLowerCase();

      if (lowerFile.includes('page-object') || lowerFile.includes('pageobject')) {
        structure.hasPageObjects = true;
      }

      if (lowerFile.includes('step-definition') || lowerFile.includes('stepdef')) {
        structure.hasStepDefs = true;
      }

      if (lowerFile.includes('service') && !lowerFile.includes('test')) {
        structure.hasServices = true;
      }

      if (lowerFile.includes('controller') && !lowerFile.includes('test')) {
        structure.hasControllers = true;
      }

      // Detect framework
      if (lowerFile.includes('playwright')) {
        structure.framework = 'playwright';
      } else if (lowerFile.includes('webdriverio') || lowerFile.includes('wdio')) {
        structure.framework = 'webdriverio';
      } else if (lowerFile.includes('selenium')) {
        structure.framework = 'selenium';
      } else if (lowerFile.includes('spring')) {
        structure.framework = 'spring';
      } else if (lowerFile.includes('react')) {
        structure.framework = 'react';
      }
    }

    return structure;
  }

  /**
   * Generate contextual suggestions based on detected context
   */
  private generateContextualSuggestions(
    domain: DomainContext,
    teamPatterns: TeamPattern[],
    projectStructure: ContextReport['projectStructure']
  ): string[] {
    const suggestions: string[] = [];

    // Domain-specific suggestions
    suggestions.push(...domain.suggestions);

    // Team pattern suggestions
    if (teamPatterns.length > 0) {
      const topPattern = teamPatterns[0];
      if (topPattern.pattern.includes('folder')) {
        suggestions.push(`Your team usually organizes files in ${topPattern.file}/ folder - consider following this pattern`);
      }
      if (topPattern.pattern.includes('naming')) {
        suggestions.push(`Your team uses ${topPattern.file} naming convention - consider following this pattern`);
      }
    }

    // Project structure suggestions
    if (projectStructure.hasPageObjects && projectStructure.framework) {
      suggestions.push(`This project uses ${projectStructure.framework} with Page Object Model - ensure new test code follows this pattern`);
    }

    if (projectStructure.hasServices && projectStructure.hasControllers) {
      suggestions.push('This project follows MVC pattern - business logic should be in services, not controllers');
    }

    return suggestions;
  }
}

