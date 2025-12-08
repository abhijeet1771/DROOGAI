/**
 * Declaration Validation for Test Automation
 * Validates locator declarations, method declarations, step definition declarations
 */

import { CodeSymbol } from '../../parser/types.js';
import { TestFramework } from './framework-detector.js';

export interface DeclarationIssue {
  type: 'locator_declaration' | 'method_declaration' | 'step_def_declaration' | 'feature_declaration';
  framework: TestFramework;
  location: string;
  file: string;
  line?: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface DeclarationValidation {
  issues: DeclarationIssue[];
  locatorIssues: DeclarationIssue[];
  methodIssues: DeclarationIssue[];
  stepDefIssues: DeclarationIssue[];
  featureIssues: DeclarationIssue[];
}

export class DeclarationValidator {
  /**
   * Validate declarations
   */
  validateDeclarations(
    symbols: CodeSymbol[],
    codeContent: string,
    framework: TestFramework,
    stepDefs?: Array<{ pattern: string; file: string }>,
    featureSteps?: Array<{ step: string; file: string }>
  ): DeclarationValidation {
    const issues: DeclarationIssue[] = [];
    const locatorIssues: DeclarationIssue[] = [];
    const methodIssues: DeclarationIssue[] = [];
    const stepDefIssues: DeclarationIssue[] = [];
    const featureIssues: DeclarationIssue[] = [];

    const lines = codeContent.split('\n');

    // Validate locator declarations
    this.validateLocatorDeclarations(symbols, codeContent, lines, framework, issues, locatorIssues);

    // Validate method declarations
    this.validateMethodDeclarations(symbols, codeContent, lines, framework, issues, methodIssues);

    // Validate step definition declarations
    if (stepDefs) {
      this.validateStepDefDeclarations(stepDefs, codeContent, issues, stepDefIssues);
    }

    // Validate feature file declarations
    if (featureSteps) {
      this.validateFeatureDeclarations(featureSteps, issues, featureIssues);
    }

    return {
      issues,
      locatorIssues,
      methodIssues,
      stepDefIssues,
      featureIssues,
    };
  }

  /**
   * Validate locator declarations
   */
  private validateLocatorDeclarations(
    symbols: CodeSymbol[],
    codeContent: string,
    lines: string[],
    framework: TestFramework,
    issues: DeclarationIssue[],
    locatorIssues: DeclarationIssue[]
  ): void {
    switch (framework) {
      case 'selenium':
        this.validateSeleniumLocators(symbols, codeContent, lines, issues, locatorIssues);
        break;
      case 'playwright':
        this.validatePlaywrightLocators(symbols, codeContent, lines, issues, locatorIssues);
        break;
      case 'webdriverio':
        this.validateWebdriverIOLocators(symbols, codeContent, lines, issues, locatorIssues);
        break;
    }
  }

  /**
   * Validate Selenium locators
   */
  private validateSeleniumLocators(
    symbols: CodeSymbol[],
    codeContent: string,
    lines: string[],
    issues: DeclarationIssue[],
    locatorIssues: DeclarationIssue[]
  ): void {
    // Check for @FindBy annotations without initialization
    for (const symbol of symbols) {
      if (symbol.type === 'class' && symbol.code) {
        const findByMatches = symbol.code.matchAll(/@FindBy\([^)]+\)\s+private\s+(\w+)\s+(\w+);/g);
        for (const match of findByMatches) {
          const locatorName = match[2];
          // Check if locator is used
          const isUsed = symbol.code.includes(locatorName + '.') || 
                         symbol.code.includes(locatorName + '(');
          
          if (!isUsed) {
            const issue: DeclarationIssue = {
              type: 'locator_declaration',
              framework: 'selenium',
              location: `${symbol.file}:${symbol.startLine}`,
              file: symbol.file,
              line: symbol.startLine,
              severity: 'low',
              message: `Locator "${locatorName}" declared but not used`,
              suggestion: `Use locator in methods or remove unused declaration`,
            };
            locatorIssues.push(issue);
            issues.push(issue);
          }
        }
      }
    }
  }

  /**
   * Validate Playwright locators
   */
  private validatePlaywrightLocators(
    symbols: CodeSymbol[],
    codeContent: string,
    lines: string[],
    issues: DeclarationIssue[],
    locatorIssues: DeclarationIssue[]
  ): void {
    // Check for locator declarations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for locator variable declarations
      if (/const\s+\w+\s*=\s*page\.(locator|getBy)/.test(line)) {
        const match = line.match(/const\s+(\w+)\s*=/);
        if (match) {
          const locatorName = match[1];
          // Check if used
          const isUsed = codeContent.includes(locatorName + '.') || 
                         codeContent.includes(locatorName + '(');
          
          if (!isUsed) {
            const issue: DeclarationIssue = {
              type: 'locator_declaration',
              framework: 'playwright',
              location: `line ${i + 1}`,
              file: '',
              line: i + 1,
              severity: 'low',
              message: `Locator "${locatorName}" declared but not used`,
              suggestion: `Use locator in test or remove unused declaration`,
            };
            locatorIssues.push(issue);
            issues.push(issue);
          }
        }
      }
    }
  }

  /**
   * Validate WebdriverIO locators
   */
  private validateWebdriverIOLocators(
    symbols: CodeSymbol[],
    codeContent: string,
    lines: string[],
    issues: DeclarationIssue[],
    locatorIssues: DeclarationIssue[]
  ): void {
    // Check for getter locators
    for (const symbol of symbols) {
      if (symbol.type === 'method' && symbol.code) {
        const getterPattern = /get\s+(\w+)\s*\(\)\s*\{[\s\n]*return\s+\$\(/;
        if (getterPattern.test(symbol.code)) {
          const match = symbol.code.match(getterPattern);
          if (match) {
            const locatorName = match[1];
            // Check if getter is used
            const isUsed = codeContent.includes('.' + locatorName + '()') ||
                           codeContent.includes('this.' + locatorName);
            
            if (!isUsed) {
              const issue: DeclarationIssue = {
                type: 'locator_declaration',
                framework: 'webdriverio',
                location: `${symbol.file}:${symbol.startLine}`,
                file: symbol.file,
                line: symbol.startLine,
                severity: 'low',
                message: `Locator getter "${locatorName}()" declared but not used`,
                suggestion: `Use getter in tests or remove unused declaration`,
              };
              locatorIssues.push(issue);
              issues.push(issue);
            }
          }
        }
      }
    }
  }

  /**
   * Validate method declarations
   */
  private validateMethodDeclarations(
    symbols: CodeSymbol[],
    codeContent: string,
    lines: string[],
    framework: TestFramework,
    issues: DeclarationIssue[],
    methodIssues: DeclarationIssue[]
  ): void {
    for (const symbol of symbols) {
      if (symbol.type === 'method') {
        // Check for missing return type (if applicable)
        if (framework === 'selenium' && !symbol.returnType) {
          // Selenium methods should have return types
          if (symbol.code && /WebElement|List<WebElement>/.test(codeContent)) {
            methodIssues.push({
              type: 'method_declaration',
              framework: 'selenium',
              location: `${symbol.file}:${symbol.startLine}`,
              file: symbol.file,
              line: symbol.startLine,
              severity: 'low',
              message: `Method "${symbol.name}" should have explicit return type`,
              suggestion: `Add return type: public WebElement ${symbol.name}() { ... }`,
            });
            issues.push(methodIssues[methodIssues.length - 1]);
          }
        }

        // Check for missing parameters in method signature
        if (symbol.parameters && symbol.parameters.length === 0 && 
            symbol.code && /@RequestParam|@PathVariable/.test(symbol.code)) {
          methodIssues.push({
            type: 'method_declaration',
            framework: framework,
            location: `${symbol.file}:${symbol.startLine}`,
            file: symbol.file,
            line: symbol.startLine,
            severity: 'medium',
            message: `Method "${symbol.name}" has annotations but no parameters`,
            suggestion: `Add parameters matching the annotations`,
          });
          issues.push(methodIssues[methodIssues.length - 1]);
        }
      }
    }
  }

  /**
   * Validate step definition declarations
   */
  private validateStepDefDeclarations(
    stepDefs: Array<{ pattern: string; file: string }>,
    codeContent: string,
    issues: DeclarationIssue[],
    stepDefIssues: DeclarationIssue[]
  ): void {
    for (const stepDef of stepDefs) {
      // Check for proper annotation
      if (!/@Given|@When|@Then|@And|@But/.test(stepDef.pattern)) {
        stepDefIssues.push({
          type: 'step_def_declaration',
          framework: 'unknown',
          location: stepDef.file,
          file: stepDef.file,
          severity: 'high',
          message: `Step definition missing annotation (@Given, @When, @Then)`,
          suggestion: `Add annotation: @When("${stepDef.pattern}")`,
        });
        issues.push(stepDefIssues[stepDefIssues.length - 1]);
      }

      // Check for parameter placeholders
      if (stepDef.pattern.includes('{') && !stepDef.pattern.includes('}')) {
        stepDefIssues.push({
          type: 'step_def_declaration',
          framework: 'unknown',
          location: stepDef.file,
          file: stepDef.file,
          severity: 'medium',
          message: `Step definition has incomplete parameter placeholder`,
          suggestion: `Complete parameter placeholder: "{string}" or "{int}"`,
        });
        issues.push(stepDefIssues[stepDefIssues.length - 1]);
      }
    }
  }

  /**
   * Validate feature file declarations
   */
  private validateFeatureDeclarations(
    featureSteps: Array<{ step: string; file: string }>,
    issues: DeclarationIssue[],
    featureIssues: DeclarationIssue[]
  ): void {
    for (const featureStep of featureSteps) {
      // Check for proper Gherkin keywords
      if (!/^(Given|When|Then|And|But)\s+/.test(featureStep.step.trim())) {
        featureIssues.push({
          type: 'feature_declaration',
          framework: 'unknown',
          location: featureStep.file,
          file: featureStep.file,
          severity: 'high',
          message: `Feature step missing Gherkin keyword (Given, When, Then)`,
          suggestion: `Start step with keyword: Given/When/Then "${featureStep.step}"`,
        });
        issues.push(featureIssues[featureIssues.length - 1]);
      }
    }
  }
}







