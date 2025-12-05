/**
 * Locator Suggestions for Test Automation
 * Provides framework-specific best practice suggestions for Playwright, WebDriverIO, Selenium
 */

export interface LocatorSuggestion {
  file: string;
  line: number;
  currentLocator: string;
  suggestedLocator: string;
  framework: 'playwright' | 'webdriverio' | 'selenium';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  example: string;
}

export interface LocatorAnalysis {
  suggestions: LocatorSuggestion[];
  framework: string;
  totalIssues: number;
  bestPractices: string[];
}

export class LocatorSuggestionAnalyzer {
  /**
   * Analyze locators and suggest improvements
   */
  analyzeLocators(code: string, filepath: string): LocatorAnalysis {
    const framework = this.detectFramework(code, filepath);
    const suggestions: LocatorSuggestion[] = [];

    if (framework === 'playwright') {
      suggestions.push(...this.analyzePlaywrightLocators(code, filepath));
    } else if (framework === 'webdriverio') {
      suggestions.push(...this.analyzeWebDriverIOLocators(code, filepath));
    } else if (framework === 'selenium') {
      suggestions.push(...this.analyzeSeleniumLocators(code, filepath));
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

      // XPath usage (not recommended in Playwright)
      if (line.includes('locator(') && line.includes('xpath=')) {
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
      if (line.includes('locator(') && (line.includes('button') || line.includes('a['))) {
        const match = line.match(/locator\(['"]([^'"]+)['"]\)/);
        if (match && (match[1].includes('button') || match[1].includes('a'))) {
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
      if (line.includes('locator(\'#') || line.includes('locator("#')) {
        const match = line.match(/locator\(['"]#([^'"]+)['"]\)/);
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
      if (line.includes('locator(\'text=') || line.includes('locator("text=')) {
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

