/**
 * Test Automation Best Practices Review
 * Framework-specific best practices for Selenium, Playwright, WebdriverIO
 */

import { CodeSymbol } from '../../parser/types.js';
import { TestFramework } from './framework-detector.js';

export interface BestPracticeIssue {
  type: 'locator_strategy' | 'wait_strategy' | 'pom_structure' | 'test_data' | 'reporting';
  framework: TestFramework;
  location: string;
  file: string;
  line?: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface BestPracticesReport {
  issues: BestPracticeIssue[];
  locatorIssues: BestPracticeIssue[];
  waitStrategyIssues: BestPracticeIssue[];
  pomIssues: BestPracticeIssue[];
  testDataIssues: BestPracticeIssue[];
  reportingIssues: BestPracticeIssue[];
}

export class BestPracticesReviewer {
  /**
   * Review best practices for test automation
   */
  reviewBestPractices(
    symbols: CodeSymbol[],
    codeContent: string,
    framework: TestFramework
  ): BestPracticesReport {
    const issues: BestPracticeIssue[] = [];
    const locatorIssues: BestPracticeIssue[] = [];
    const waitStrategyIssues: BestPracticeIssue[] = [];
    const pomIssues: BestPracticeIssue[] = [];
    const testDataIssues: BestPracticeIssue[] = [];
    const reportingIssues: BestPracticeIssue[] = [];

    const lines = codeContent.split('\n');

    // Framework-specific reviews
    switch (framework) {
      case 'selenium':
        this.reviewSeleniumBestPractices(symbols, codeContent, lines, issues, locatorIssues, waitStrategyIssues, pomIssues);
        break;
      case 'playwright':
        this.reviewPlaywrightBestPractices(symbols, codeContent, lines, issues, locatorIssues, waitStrategyIssues, pomIssues);
        break;
      case 'webdriverio':
        this.reviewWebdriverIOBestPractices(symbols, codeContent, lines, issues, locatorIssues, waitStrategyIssues, pomIssues);
        break;
    }

    // Common reviews
    this.reviewTestDataManagement(codeContent, lines, issues, testDataIssues);
    this.reviewReporting(codeContent, lines, issues, reportingIssues);

    return {
      issues,
      locatorIssues,
      waitStrategyIssues,
      pomIssues,
      testDataIssues,
      reportingIssues,
    };
  }

  /**
   * Review Selenium best practices
   */
  private reviewSeleniumBestPractices(
    symbols: CodeSymbol[],
    codeContent: string,
    lines: string[],
    issues: BestPracticeIssue[],
    locatorIssues: BestPracticeIssue[],
    waitStrategyIssues: BestPracticeIssue[],
    pomIssues: BestPracticeIssue[]
  ): void {
    // Locator strategy: ID > CSS > XPath
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for fragile XPath
      if (/By\.xpath\(["']\/\//.test(line) && !/By\.(id|name|className|cssSelector)\(/.test(line)) {
        const issue: BestPracticeIssue = {
          type: 'locator_strategy',
          framework: 'selenium',
          location: `line ${i + 1}`,
          file: '', // Will be set by caller
          line: i + 1,
          severity: 'high',
          message: 'XPath locator is fragile, prefer ID or CSS selector',
          suggestion: 'Use By.id("element-id") or By.cssSelector("#element-id") for more stable locators',
        };
        locatorIssues.push(issue);
        issues.push(issue);
      }

      // Check for missing explicit waits
      if (/\.click\(|\.sendKeys\(|\.getText\(/.test(line) && 
          !/WebDriverWait|ExpectedConditions|wait\.until/.test(codeContent.substring(Math.max(0, i - 10), i + 1))) {
        const issue: BestPracticeIssue = {
          type: 'wait_strategy',
          framework: 'selenium',
          location: `line ${i + 1}`,
          file: '',
          line: i + 1,
          severity: 'medium',
          message: 'No explicit wait before interaction - may cause flaky tests',
          suggestion: 'Add WebDriverWait: WebDriverWait wait = new WebDriverWait(driver, 10); wait.until(ExpectedConditions.elementToBeClickable(element)).click();',
        };
        waitStrategyIssues.push(issue);
        issues.push(issue);
      }
    }

    // POM structure check
    for (const symbol of symbols) {
      if (symbol.type === 'class' && symbol.code) {
        const hasLocators = /@FindBy|By\./.test(symbol.code);
        const hasBusinessLogic = /if\s*\(|for\s*\(|while\s*\(|calculate|process|validate/.test(symbol.code);
        
        if (hasLocators && hasBusinessLogic) {
          const issue: BestPracticeIssue = {
            type: 'pom_structure',
            framework: 'selenium',
            location: `${symbol.file}:${symbol.startLine}`,
            file: symbol.file,
            line: symbol.startLine,
            severity: 'medium',
            message: 'Page Object contains business logic - should only contain element interactions',
            suggestion: 'Move business logic to separate service/helper class',
          };
          pomIssues.push(issue);
          issues.push(issue);
        }
      }
    }
  }

  /**
   * Review Playwright best practices
   */
  private reviewPlaywrightBestPractices(
    symbols: CodeSymbol[],
    codeContent: string,
    lines: string[],
    issues: BestPracticeIssue[],
    locatorIssues: BestPracticeIssue[],
    waitStrategyIssues: BestPracticeIssue[],
    pomIssues: BestPracticeIssue[]
  ): void {
    // Locator strategy: data-testid > role > text
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for text-based locators (less stable)
      if (/getByText\(["'][^"']{20,}["']/.test(line) && !/getByTestId|getByRole/.test(line)) {
        const issue: BestPracticeIssue = {
          type: 'locator_strategy',
          framework: 'playwright',
          location: `line ${i + 1}`,
          file: '',
          line: i + 1,
          severity: 'medium',
          message: 'Text-based locator is less stable - prefer data-testid or role',
          suggestion: 'Use page.getByTestId("element-id") or page.getByRole("button", { name: "text" })',
        };
        locatorIssues.push(issue);
        issues.push(issue);
      }

      // Playwright has auto-waiting, but check for unnecessary waits
      if (/page\.waitForTimeout\(/.test(line)) {
        const issue: BestPracticeIssue = {
          type: 'wait_strategy',
          framework: 'playwright',
          location: `line ${i + 1}`,
          file: '',
          line: i + 1,
          severity: 'low',
          message: 'Unnecessary waitForTimeout - Playwright has auto-waiting',
          suggestion: 'Remove waitForTimeout, use page.waitForSelector() or rely on auto-waiting',
        };
        waitStrategyIssues.push(issue);
        issues.push(issue);
      }
    }
  }

  /**
   * Review WebdriverIO best practices
   */
  private reviewWebdriverIOBestPractices(
    symbols: CodeSymbol[],
    codeContent: string,
    lines: string[],
    issues: BestPracticeIssue[],
    locatorIssues: BestPracticeIssue[],
    waitStrategyIssues: BestPracticeIssue[],
    pomIssues: BestPracticeIssue[]
  ): void {
    // Locator strategy: $ > $$
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for XPath usage
      if (/xpath\(|$x\(/.test(line) && !/\$\(|browser\.\$/.test(line)) {
        const issue: BestPracticeIssue = {
          type: 'locator_strategy',
          framework: 'webdriverio',
          location: `line ${i + 1}`,
          file: '',
          line: i + 1,
          severity: 'medium',
          message: 'XPath locator - prefer CSS selector or data attributes',
          suggestion: 'Use $("css-selector") or $("[data-testid=element-id]")',
        };
        locatorIssues.push(issue);
        issues.push(issue);
      }

      // Check for missing waits
      if (/\.click\(|\.setValue\(/.test(line) && 
          !/\.waitFor|\.waitUntil|\.waitForClickable/.test(codeContent.substring(Math.max(0, i - 5), i + 1))) {
        const issue: BestPracticeIssue = {
          type: 'wait_strategy',
          framework: 'webdriverio',
          location: `line ${i + 1}`,
          file: '',
          line: i + 1,
          severity: 'low',
          message: 'Consider adding explicit wait for element',
          suggestion: 'Use element.waitForClickable() or element.waitForDisplayed() before interaction',
        };
        waitStrategyIssues.push(issue);
        issues.push(issue);
      }
    }
  }

  /**
   * Review test data management
   */
  private reviewTestDataManagement(
    codeContent: string,
    lines: string[],
    issues: BestPracticeIssue[],
    testDataIssues: BestPracticeIssue[]
  ): void {
    // Check for hardcoded test data
    const hasHardcodedData = /"test@example\.com"|"password123"|"John Doe"/.test(codeContent);
    
    if (hasHardcodedData) {
      testDataIssues.push({
        type: 'test_data',
        framework: 'unknown',
        location: 'multiple',
        file: '',
        severity: 'medium',
        message: 'Hardcoded test data found in code',
        suggestion: 'Move test data to external files (JSON, CSV) or use test data builders',
      });
      issues.push(testDataIssues[testDataIssues.length - 1]);
    }
  }

  /**
   * Review reporting integration
   */
  private reviewReporting(
    codeContent: string,
    lines: string[],
    issues: BestPracticeIssue[],
    reportingIssues: BestPracticeIssue[]
  ): void {
    // Check for logging/reporting
    const hasLogging = /logger\.|console\.log|report|allure|extent/.test(codeContent.toLowerCase());
    
    if (!hasLogging) {
      reportingIssues.push({
        type: 'reporting',
        framework: 'unknown',
        location: 'file',
        file: '',
        severity: 'low',
        message: 'No logging or reporting found',
        suggestion: 'Add logging for test steps and use reporting framework (Allure, Extent, etc.)',
      });
      issues.push(reportingIssues[reportingIssues.length - 1]);
    }
  }
}







