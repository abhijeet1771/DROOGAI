/**
 * Gherkin/Feature File Improvements
 * Suggests better English and best practices for feature files and step definitions
 */

export interface GherkinSuggestion {
  file: string;
  line: number;
  currentText: string;
  suggestedText: string;
  reason: string;
  type: 'feature' | 'scenario' | 'step' | 'step-definition';
  priority: 'high' | 'medium' | 'low';
}

export interface GherkinAnalysis {
  suggestions: GherkinSuggestion[];
  totalIssues: number;
  readabilityScore: number;
  bestPractices: string[];
}

export class GherkinImprovementAnalyzer {
  /**
   * Analyze Gherkin files and suggest improvements
   */
  analyzeGherkin(code: string, filepath: string): GherkinAnalysis {
    const suggestions: GherkinSuggestion[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Feature title improvements
      if (trimmed.startsWith('Feature:')) {
        const suggestion = this.analyzeFeatureTitle(line);
        if (suggestion) {
          suggestions.push({ ...suggestion, file: filepath, line: lineNum });
        }
      }

      // Scenario title improvements
      if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:')) {
        const suggestion = this.analyzeScenarioTitle(line);
        if (suggestion) {
          suggestions.push({ ...suggestion, file: filepath, line: lineNum });
        }
      }

      // Step improvements
      if (trimmed.startsWith('Given ') || trimmed.startsWith('When ') || 
          trimmed.startsWith('Then ') || trimmed.startsWith('And ') || 
          trimmed.startsWith('But ')) {
        const suggestion = this.analyzeStep(line);
        if (suggestion) {
          suggestions.push({ ...suggestion, file: filepath, line: lineNum });
        }
      }
    });

    // Analyze step definitions if it's a step definition file
    if (filepath.includes('step') || filepath.includes('steps')) {
      const stepDefSuggestions = this.analyzeStepDefinitions(code, filepath);
      suggestions.push(...stepDefSuggestions);
    }

    const readabilityScore = this.calculateReadabilityScore(code, suggestions.length);

    return {
      suggestions,
      totalIssues: suggestions.length,
      readabilityScore,
      bestPractices: this.getBestPractices(),
    };
  }

  /**
   * Analyze feature title
   */
  private analyzeFeatureTitle(line: string): GherkinSuggestion | null {
    const title = line.replace('Feature:', '').trim();
    
    // Check for vague titles
    if (title.toLowerCase().includes('test') || title.toLowerCase().includes('check')) {
      return {
        file: '',
        line: 0,
        currentText: title,
        suggestedText: title.replace(/test|check/gi, '').trim() || 'User functionality',
        reason: 'Feature titles should describe business value, not testing actions.',
        type: 'feature',
        priority: 'high',
      };
    }

    // Check for missing business context
    if (title.length < 10) {
      return {
        file: '',
        line: 0,
        currentText: title,
        suggestedText: `As a user, I want to ${title.toLowerCase()}`,
        reason: 'Feature titles should include user perspective and business value.',
        type: 'feature',
        priority: 'medium',
      };
    }

    return null;
  }

  /**
   * Analyze scenario title
   */
  private analyzeScenarioTitle(line: string): GherkinSuggestion | null {
    const title = line.replace(/Scenario:|Scenario Outline:/, '').trim();
    
    // Check for vague titles
    if (title.toLowerCase().includes('test') || title.toLowerCase().includes('verify')) {
      return {
        file: '',
        line: 0,
        currentText: title,
        suggestedText: title.replace(/test|verify/gi, '').trim() || 'User action',
        reason: 'Scenario titles should describe user behavior, not testing actions.',
        type: 'scenario',
        priority: 'high',
      };
    }

    // Check for missing "should" or outcome
    if (!title.toLowerCase().includes('should') && !title.toLowerCase().includes('can')) {
      return {
        file: '',
        line: 0,
        currentText: title,
        suggestedText: `${title} should work correctly`,
        reason: 'Scenario titles should clearly state expected outcome.',
        type: 'scenario',
        priority: 'low',
      };
    }

    return null;
  }

  /**
   * Analyze step
   */
  private analyzeStep(line: string): GherkinSuggestion | null {
    const step = line.trim();
    
    // Check for implementation details
    if (step.includes('click') || step.includes('type') || step.includes('fill')) {
      return {
        file: '',
        line: 0,
        currentText: step,
        suggestedText: this.improveStepLanguage(step),
        reason: 'Steps should describe user actions, not implementation details.',
        type: 'step',
        priority: 'high',
      };
    }

    // Check for vague language
    if (step.includes('something') || step.includes('stuff') || step.includes('thing')) {
      return {
        file: '',
        line: 0,
        currentText: step,
        suggestedText: step.replace(/something|stuff|thing/gi, 'the required information'),
        reason: 'Use specific language instead of vague terms.',
        type: 'step',
        priority: 'medium',
      };
    }

    // Check for proper Given/When/Then usage
    if (step.startsWith('Given ') && (step.includes('should') || step.includes('will'))) {
      return {
        file: '',
        line: 0,
        currentText: step,
        suggestedText: step.replace('Given ', 'When '),
        reason: 'Given steps should set up state, not describe actions. Use When for actions.',
        type: 'step',
        priority: 'medium',
      };
    }

    // Check for better English
    const improved = this.improveStepEnglish(step);
    if (improved !== step) {
      return {
        file: '',
        line: 0,
        currentText: step,
        suggestedText: improved,
        reason: 'Improved English for better readability.',
        type: 'step',
        priority: 'low',
      };
    }

    return null;
  }

  /**
   * Improve step language (remove implementation details)
   */
  private improveStepLanguage(step: string): string {
    let improved = step;

    // Replace implementation actions with user actions
    improved = improved.replace(/I click (?:on )?/gi, 'I select ');
    improved = improved.replace(/I type (?:in )?/gi, 'I enter ');
    improved = improved.replace(/I fill (?:in )?/gi, 'I enter ');
    improved = improved.replace(/I navigate to/gi, 'I go to');
    improved = improved.replace(/I wait for/gi, 'the system should display');

    return improved;
  }

  /**
   * Improve step English
   */
  private improveStepEnglish(step: string): string {
    let improved = step;

    // Fix common grammar issues
    improved = improved.replace(/I am on/gi, 'I am on the');
    improved = improved.replace(/I see (?!the|a|an)/gi, 'I see the ');
    improved = improved.replace(/I should see (?!the|a|an)/gi, 'I should see the ');

    // Improve clarity
    improved = improved.replace(/login/gi, 'log in');
    improved = improved.replace(/logout/gi, 'log out');
    improved = improved.replace(/signup/gi, 'sign up');

    return improved;
  }

  /**
   * Analyze step definitions
   */
  private analyzeStepDefinitions(code: string, filepath: string): GherkinSuggestion[] {
    const suggestions: GherkinSuggestion[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for regex in step definitions (should use Cucumber expressions)
      if (line.includes('@Given') || line.includes('@When') || line.includes('@Then')) {
        if (line.includes('/^') || line.includes('/.*/')) {
          suggestions.push({
            file: filepath,
            line: lineNum,
            currentText: line,
            suggestedText: line.replace(/\/\^.*\/\$/g, '"{string}" or "{int}"'),
            reason: 'Use Cucumber expressions instead of regex for better readability.',
            type: 'step-definition',
            priority: 'medium',
          });
        }
      }

      // Check for hardcoded values
      if (line.includes('@Given') || line.includes('@When') || line.includes('@Then')) {
        const hardcodedMatch = line.match(/(?:email|password|username)['"]\s*:\s*['"][^'"]+['"]/);
        if (hardcodedMatch) {
          suggestions.push({
            file: filepath,
            line: lineNum,
            currentText: line,
            suggestedText: line.replace(/['"][^'"]+['"]/g, '{string}'),
            reason: 'Use parameterized step definitions instead of hardcoded values.',
            type: 'step-definition',
            priority: 'high',
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Calculate readability score
   */
  private calculateReadabilityScore(code: string, issueCount: number): number {
    const lines = code.split('\n').filter(l => l.trim());
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    
    let score = 100;
    
    // Penalize for issues
    score -= issueCount * 5;
    
    // Penalize for very long lines
    if (avgLineLength > 100) {
      score -= 10;
    }
    
    // Penalize for vague language
    const vagueWords = (code.match(/\b(something|stuff|thing|etc)\b/gi) || []).length;
    score -= vagueWords * 3;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get best practices
   */
  private getBestPractices(): string[] {
    return [
      'Feature titles should describe business value, not testing actions',
      'Scenario titles should describe user behavior and expected outcome',
      'Use Given-When-Then structure: Given (setup), When (action), Then (verification)',
      'Steps should describe user actions, not implementation details',
      'Avoid vague terms like "something", "stuff", "thing"',
      'Use specific, clear language',
      'Use Cucumber expressions instead of regex in step definitions',
      'Parameterize step definitions instead of hardcoding values',
      'Keep scenarios focused on one behavior',
      'Use Background for common setup steps',
    ];
  }
}

