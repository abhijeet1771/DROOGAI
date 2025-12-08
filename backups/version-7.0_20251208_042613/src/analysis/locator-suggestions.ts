/**
 * Locator Suggestions for Test Automation
 * Provides framework-specific best practice suggestions for Playwright, WebDriverIO, Selenium
 */

export interface LocatorSuggestion {
  file: string;
  line: number;
  currentLocator: string;
  suggestedLocator: string;
  alternativeLocator?: string; // Second option
  framework: 'playwright' | 'webdriverio' | 'selenium';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  example: string;
  stabilityScore?: number; // 1-10 for primary suggestion
  alternativeStabilityScore?: number; // 1-10 for alternative
}

export interface LocatorAnalysis {
  suggestions: LocatorSuggestion[];
  framework: string;
  totalIssues: number;
  bestPractices: string[];
}

export class LocatorSuggestionAnalyzer {
  private geminiKey?: string;

  constructor(geminiKey?: string) {
    this.geminiKey = geminiKey;
  }

  /**
   * Analyze locators and suggest improvements (with AI-powered suggestions)
   */
  async analyzeLocators(code: string, filepath: string): Promise<LocatorAnalysis> {
    const framework = this.detectFramework(code, filepath);
    const suggestions: LocatorSuggestion[] = [];

    // Get base suggestions
    let baseSuggestions: LocatorSuggestion[] = [];
    if (framework === 'playwright') {
      baseSuggestions = this.analyzePlaywrightLocators(code, filepath);
    } else if (framework === 'webdriverio') {
      baseSuggestions = this.analyzeWebDriverIOLocators(code, filepath);
    } else if (framework === 'selenium') {
      baseSuggestions = this.analyzeSeleniumLocators(code, filepath);
    }

    // Enhance with AI-powered suggestions (2 options per locator)
    if (this.geminiKey && baseSuggestions.length > 0) {
      for (const suggestion of baseSuggestions) {
        const enhanced = await this.enhanceWithAISuggestions(suggestion, code, framework);
        if (enhanced) {
          suggestions.push(enhanced);
        } else {
          // Fallback: Add stability scores to existing suggestions
          suggestions.push(this.addStabilityScores(suggestion, framework));
        }
      }
    } else {
      // No AI, just add stability scores
      suggestions.push(...baseSuggestions.map(s => this.addStabilityScores(s, framework)));
    }

    return {
      suggestions,
      framework,
      totalIssues: suggestions.length,
      bestPractices: this.getBestPractices(framework),
    };
  }

  /**
   * Detect test automation framework
   */
  private detectFramework(code: string, filepath: string): 'playwright' | 'webdriverio' | 'selenium' {
    if (code.includes('playwright') || code.includes('page.') || code.includes('getByRole') || code.includes('getByTestId')) {
      return 'playwright';
    }
    if (code.includes('webdriverio') || code.includes('browser.') || code.includes('$(') || code.includes('$$(')) {
      return 'webdriverio';
    }
    if (code.includes('selenium') || code.includes('driver.findElement') || code.includes('By.')) {
      return 'selenium';
    }
    
    // Detect by file extension/imports
    if (filepath.includes('playwright') || filepath.includes('spec.ts')) {
      return 'playwright';
    }
    if (filepath.includes('webdriverio') || filepath.includes('wdio')) {
      return 'webdriverio';
    }
    
    return 'selenium'; // Default
  }

  /**
   * Analyze Playwright locators
   */
  private analyzePlaywrightLocators(code: string, filepath: string): LocatorSuggestion[] {
    const suggestions: LocatorSuggestion[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      
      // Skip comments
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        return;
      }

      // XPath usage (not recommended in Playwright)
      if ((line.includes('locator(') || line.includes('page.locator(')) && (line.includes('xpath=') || line.includes('xpath:') || /\/\/[^'"]*\[/.test(line))) {
        suggestions.push({
          file: filepath,
          line: lineNum,
          currentLocator: this.extractLocator(line),
          suggestedLocator: 'page.getByRole() or page.getByTestId()',
          framework: 'playwright',
          reason: 'XPath is brittle and not recommended in Playwright. Use semantic locators instead.',
          priority: 'high',
          example: `// Instead of: page.locator('xpath=//button[@id="submit"]')
// Use: page.getByRole('button', { name: 'Submit' })
// Or: page.getByTestId('submit-button')`,
        });
      }

      // CSS selector for buttons/links (should use getByRole)
      // Match: page.locator('button'), locator('button'), await page.locator('button')
      if ((line.includes('locator(') || line.includes('page.locator(')) && (line.includes('button') || line.includes('a[') || line.includes('a.'))) {
        const match = line.match(/(?:page\.)?locator\(['"]([^'"]+)['"]\)/);
        if (match && (match[1].includes('button') || match[1].includes('a') || match[1].startsWith('button') || match[1].startsWith('a'))) {
          suggestions.push({
            file: filepath,
            line: lineNum,
            currentLocator: match[1],
            suggestedLocator: 'page.getByRole()',
            framework: 'playwright',
            reason: 'Use getByRole() for buttons and links - more accessible and stable.',
            priority: 'medium',
            example: `// Instead of: page.locator('button.submit')
// Use: page.getByRole('button', { name: 'Submit' })`,
          });
        }
      }

      // ID selector (should use getByTestId if it's a test ID)
      // Match: page.locator('#id'), locator('#id'), await page.locator('#id')
      if (line.includes('locator(\'#') || line.includes('locator("#') || line.includes('locator(`#')) {
        const match = line.match(/(?:page\.)?locator\(['"`]#([^'"`]+)['"`]\)/);
        if (match) {
          suggestions.push({
            file: filepath,
            line: lineNum,
            currentLocator: `#${match[1]}`,
            suggestedLocator: `page.getByTestId('${match[1]}')`,
            framework: 'playwright',
            reason: 'If this is a test ID, use getByTestId() for better semantics.',
            priority: 'low',
            example: `// Instead of: page.locator('#submit-btn')
// Use: page.getByTestId('submit-btn')`,
          });
        }
      }

      // Text-based locators (should use getByText or getByLabel)
      // Match: page.locator('text=...'), locator('text=...')
      if (line.includes('locator(\'text=') || line.includes('locator("text=') || line.includes('locator(`text=')) {
        suggestions.push({
          file: filepath,
          line: lineNum,
          currentLocator: this.extractLocator(line),
          suggestedLocator: 'page.getByText() or page.getByLabel()',
          framework: 'playwright',
          reason: 'Use getByText() or getByLabel() for text-based queries - more semantic.',
          priority: 'medium',
          example: `// Instead of: page.locator('text=Submit')
// Use: page.getByText('Submit')
// Or for form fields: page.getByLabel('Email')`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Analyze WebDriverIO locators
   */
  private analyzeWebDriverIOLocators(code: string, filepath: string): LocatorSuggestion[] {
    const suggestions: LocatorSuggestion[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // XPath usage
      if (line.includes('$(') && line.includes('//')) {
        suggestions.push({
          file: filepath,
          line: lineNum,
          currentLocator: this.extractLocator(line),
          suggestedLocator: 'data-testid or CSS selector',
          framework: 'webdriverio',
          reason: 'XPath is brittle. Use data-testid attributes or CSS selectors instead.',
          priority: 'high',
          example: `// Instead of: $('//button[@id="submit"]')
// Use: $('[data-testid="submit-button"]')
// Or: $('button[type="submit"]')`,
        });
      }

      // ID selector (should use data-testid)
      if (line.includes('$(\'#') || line.includes('$("#')) {
        const match = line.match(/\$\(['"]#([^'"]+)['"]\)/);
        if (match) {
          suggestions.push({
            file: filepath,
            line: lineNum,
            currentLocator: `#${match[1]}`,
            suggestedLocator: `$('[data-testid="${match[1]}"]')`,
            framework: 'webdriverio',
            reason: 'Use data-testid for test selectors - more maintainable.',
            priority: 'medium',
            example: `// Instead of: $('#submit-btn')
// Use: $('[data-testid="submit-btn"]')`,
          });
        }
      }

      // getText() on button (should use getText() with better selector)
      if (line.includes('getText()') && line.includes('button')) {
        suggestions.push({
          file: filepath,
          line: lineNum,
          currentLocator: this.extractLocator(line),
          suggestedLocator: 'Use data-testid or role-based selector',
          framework: 'webdriverio',
          reason: 'Use semantic selectors for buttons to avoid brittle text matching.',
          priority: 'low',
          example: `// Instead of: $('button').getText()
// Use: $('[data-testid="submit-button"]').getText()`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Analyze Selenium locators
   */
  private analyzeSeleniumLocators(code: string, filepath: string): LocatorSuggestion[] {
    const suggestions: LocatorSuggestion[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // XPath usage
      if (line.includes('By.xpath')) {
        suggestions.push({
          file: filepath,
          line: lineNum,
          currentLocator: this.extractLocator(line),
          suggestedLocator: 'By.id, By.cssSelector, or By.dataTestId',
          framework: 'selenium',
          reason: 'XPath is brittle and slow. Use ID, CSS, or data-testid selectors when possible.',
          priority: 'high',
          example: `// Instead of: driver.findElement(By.xpath("//button[@id='submit']"))
// Use: driver.findElement(By.id("submit"))
// Or: driver.findElement(By.cssSelector("[data-testid='submit-button']"))`,
        });
      }

      // CSS selector for IDs (should use By.id)
      if (line.includes('By.cssSelector') && line.includes('#')) {
        const match = line.match(/By\.cssSelector\(['"]#([^'"]+)['"]\)/);
        if (match) {
          suggestions.push({
            file: filepath,
            line: lineNum,
            currentLocator: `#${match[1]}`,
            suggestedLocator: `By.id("${match[1]}")`,
            framework: 'selenium',
            reason: 'Use By.id() for ID selectors - more readable and faster.',
            priority: 'medium',
            example: `// Instead of: By.cssSelector("#submit-btn")
// Use: By.id("submit-btn")`,
          });
        }
      }

      // Class name selector (should use CSS selector)
      if (line.includes('By.className')) {
        suggestions.push({
          file: filepath,
          line: lineNum,
          currentLocator: this.extractLocator(line),
          suggestedLocator: 'By.cssSelector with data-testid',
          framework: 'selenium',
          reason: 'ClassName selectors are brittle. Use data-testid or more specific CSS selectors.',
          priority: 'medium',
          example: `// Instead of: By.className("submit-button")
// Use: By.cssSelector("[data-testid='submit-button']")`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Extract locator from line
   */
  private extractLocator(line: string): string {
    const match = line.match(/locator\(['"]([^'"]+)['"]\)|$\(['"]([^'"]+)['"]\)|By\.\w+\(['"]([^'"]+)['"]\)/);
    return match ? (match[1] || match[2] || match[3]) : 'unknown';
  }

  /**
   * Enhance suggestion with AI-powered alternatives (2 options)
   */
  private async enhanceWithAISuggestions(
    suggestion: LocatorSuggestion,
    code: string,
    framework: string
  ): Promise<LocatorSuggestion | null> {
    if (!this.geminiKey) return null;

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `You are a test automation expert. For the following locator, suggest 2 better alternatives with stability scores (1-10).

Current locator: ${suggestion.currentLocator}
Framework: ${framework}
Context: ${suggestion.reason}

Provide exactly 2 alternative locators with:
1. The locator code
2. Stability score (1-10, where 10 is most stable)
3. Brief reason (1 sentence)

Return ONLY valid JSON:
{
  "option1": {
    "locator": "exact locator code",
    "stability": 9,
    "reason": "brief reason"
  },
  "option2": {
    "locator": "exact locator code",
    "stability": 8,
    "reason": "brief reason"
  }
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiSuggestions = JSON.parse(jsonMatch[0]);
        
        // Use option1 as primary (higher stability)
        const primary = aiSuggestions.option1.stability >= aiSuggestions.option2.stability 
          ? aiSuggestions.option1 
          : aiSuggestions.option2;
        const alternative = aiSuggestions.option1.stability >= aiSuggestions.option2.stability 
          ? aiSuggestions.option2 
          : aiSuggestions.option1;

        return {
          ...suggestion,
          suggestedLocator: primary.locator,
          alternativeLocator: alternative.locator,
          stabilityScore: primary.stability,
          alternativeStabilityScore: alternative.stability,
          reason: `${suggestion.reason} ${primary.reason}`,
          example: `// Option 1 (Stability: ${primary.stability}/10):\n${primary.locator}\n\n// Option 2 (Stability: ${alternative.stability}/10):\n${alternative.locator}`,
        };
      }
    } catch (error) {
      console.warn('AI locator enhancement failed, using fallback:', error);
    }

    return null;
  }

  /**
   * Add stability scores to suggestions (fallback when AI not available)
   */
  private addStabilityScores(suggestion: LocatorSuggestion, framework: string): LocatorSuggestion {
    // Calculate stability based on locator type
    let stability = 5;
    let alternativeStability = 4;

    if (framework === 'playwright') {
      if (suggestion.suggestedLocator.includes('getByRole')) {
        stability = 9;
        alternativeStability = 8;
      } else if (suggestion.suggestedLocator.includes('getByTestId')) {
        stability = 10;
        alternativeStability = 9;
      } else if (suggestion.suggestedLocator.includes('getByLabel')) {
        stability = 8;
        alternativeStability = 7;
      }
    } else if (framework === 'webdriverio' || framework === 'selenium') {
      if (suggestion.suggestedLocator.includes('data-testid')) {
        stability = 10;
        alternativeStability = 9;
      } else if (suggestion.suggestedLocator.includes('By.id') || suggestion.suggestedLocator.includes('#id')) {
        stability = 9;
        alternativeStability = 8;
      } else if (suggestion.suggestedLocator.includes('By.cssSelector') || suggestion.suggestedLocator.includes('css')) {
        stability = 7;
        alternativeStability = 6;
      }
    }

    // Generate alternative if not provided
    let alternative = suggestion.alternativeLocator;
    if (!alternative) {
      if (framework === 'playwright') {
        alternative = suggestion.suggestedLocator.includes('getByRole') 
          ? suggestion.suggestedLocator.replace('getByRole', 'getByTestId')
          : suggestion.suggestedLocator.replace('getByTestId', 'getByRole');
      } else {
        alternative = suggestion.suggestedLocator.replace('data-testid', 'id').replace('By.id', 'By.cssSelector');
      }
    }

    return {
      ...suggestion,
      alternativeLocator: alternative,
      stabilityScore: stability,
      alternativeStabilityScore: alternativeStability,
    };
  }

  /**
   * Get best practices for framework
   */
  private getBestPractices(framework: string): string[] {
    if (framework === 'playwright') {
      return [
        'Use getByRole() for buttons, links, and form elements',
        'Use getByTestId() for test-specific selectors',
        'Use getByLabel() for form fields',
        'Use getByText() for text content',
        'Avoid XPath - use semantic locators instead',
        'Prefer data-testid attributes over IDs',
      ];
    } else if (framework === 'webdriverio') {
      return [
        'Use data-testid attributes for test selectors',
        'Use CSS selectors over XPath',
        'Use $() for single elements, $$() for multiple',
        'Avoid brittle selectors like text content',
        'Use chained selectors for complex queries',
      ];
    } else {
      return [
        'Use By.id() for ID selectors',
        'Use By.cssSelector() with data-testid',
        'Avoid XPath when possible',
        'Prefer stable selectors over dynamic ones',
        'Use explicit waits instead of implicit waits',
      ];
    }
  }
}

