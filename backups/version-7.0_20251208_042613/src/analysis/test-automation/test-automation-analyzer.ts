/**
 * Test Automation Analyzer
 * Main orchestrator for test automation framework review
 */

import { CodeSymbol } from '../../parser/types.js';
import { FrameworkDetector, TestFramework } from './framework-detector.js';
import { FlowValidator, FlowValidation } from './flow-validator.js';
import { BestPracticesReviewer, BestPracticesReport } from './best-practices.js';
import { DeclarationValidator, DeclarationValidation } from './declaration-validator.js';

export interface TestAutomationReport {
  framework: TestFramework;
  frameworkConfidence: number;
  flowValidation: FlowValidation;
  bestPractices: BestPracticesReport;
  declarations: DeclarationValidation;
  duplicateLocators: Array<{ locator: string; file1: string; file2: string; similarity: number }>;
  duplicateMethods: Array<{ method: string; file1: string; file2: string; similarity: number }>;
  duplicateStepDefs: Array<{ stepDef: string; file1: string; file2: string; similarity: number }>;
  impactAnalysis: {
    locatorChanges: Array<{ locator: string; impactedMethods: string[]; impactedStepDefs: string[] }>;
    methodChanges: Array<{ method: string; impactedStepDefs: string[]; impactedFeatures: string[] }>;
  };
}

export class TestAutomationAnalyzer {
  private frameworkDetector: FrameworkDetector;
  private flowValidator: FlowValidator;
  private bestPracticesReviewer: BestPracticesReviewer;
  private declarationValidator: DeclarationValidator;

  constructor() {
    this.frameworkDetector = new FrameworkDetector();
    this.flowValidator = new FlowValidator();
    this.bestPracticesReviewer = new BestPracticesReviewer();
    this.declarationValidator = new DeclarationValidator();
  }

  /**
   * Analyze test automation code
   */
  analyzeTestAutomation(
    files: Array<{ filename: string; content: string; symbols: CodeSymbol[] }>,
    mainBranchFiles?: Array<{ filename: string; content: string; symbols: CodeSymbol[] }>
  ): TestAutomationReport {
    // 1. Detect framework
    const frameworkDetection = this.frameworkDetector.detectFromFiles(
      files.map(f => ({ filename: f.filename, content: f.content }))
    );

    // 2. Extract locators, methods, step defs, feature steps
    const { locators, methods, stepDefs, featureSteps } = this.extractTestAutomationElements(files);

    // 3. Flow validation
    const flowValidation = this.flowValidator.validateFlow(locators, methods, stepDefs, featureSteps);

    // 4. Best practices review
    const bestPracticesReports: BestPracticesReport[] = [];
    for (const file of files) {
      const bpReport = this.bestPracticesReviewer.reviewBestPractices(
        file.symbols,
        file.content,
        frameworkDetection.framework
      );
      // Set file names
      bpReport.issues.forEach(issue => issue.file = file.filename);
      bestPracticesReports.push(bpReport);
    }
    const allBestPracticesIssues = bestPracticesReports.flatMap(r => r.issues);

    // 5. Declaration validation
    const declarationReports: DeclarationValidation[] = [];
    for (const file of files) {
      const declReport = this.declarationValidator.validateDeclarations(
        file.symbols,
        file.content,
        frameworkDetection.framework,
        stepDefs,
        featureSteps
      );
      // Set file names
      declReport.issues.forEach(issue => issue.file = file.filename);
      declarationReports.push(declReport);
    }
    const allDeclarationIssues = declarationReports.flatMap(r => r.issues);

    // 6. Duplicate detection
    const duplicateLocators = this.findDuplicateLocators(locators, mainBranchFiles);
    const duplicateMethods = this.findDuplicateMethods(methods, mainBranchFiles);
    const duplicateStepDefs = this.findDuplicateStepDefs(stepDefs, mainBranchFiles);

    // 7. Impact analysis
    const impactAnalysis = this.analyzeImpact(locators, methods, stepDefs, featureSteps);

    return {
      framework: frameworkDetection.framework,
      frameworkConfidence: frameworkDetection.confidence,
      flowValidation,
      bestPractices: {
        issues: allBestPracticesIssues,
        locatorIssues: bestPracticesReports.flatMap(r => r.locatorIssues),
        waitStrategyIssues: bestPracticesReports.flatMap(r => r.waitStrategyIssues),
        pomIssues: bestPracticesReports.flatMap(r => r.pomIssues),
        testDataIssues: bestPracticesReports.flatMap(r => r.testDataIssues),
        reportingIssues: bestPracticesReports.flatMap(r => r.reportingIssues),
      },
      declarations: {
        issues: allDeclarationIssues,
        locatorIssues: declarationReports.flatMap(r => r.locatorIssues),
        methodIssues: declarationReports.flatMap(r => r.methodIssues),
        stepDefIssues: declarationReports.flatMap(r => r.stepDefIssues),
        featureIssues: declarationReports.flatMap(r => r.featureIssues),
      },
      duplicateLocators,
      duplicateMethods,
      duplicateStepDefs,
      impactAnalysis,
    };
  }

  /**
   * Extract test automation elements from files
   */
  private extractTestAutomationElements(files: Array<{ filename: string; content: string; symbols: CodeSymbol[] }>): {
    locators: Array<{ name: string; file: string; line?: number }>;
    methods: Array<{ name: string; file: string; locators?: string[] }>;
    stepDefs: Array<{ pattern: string; method: string; file: string }>;
    featureSteps: Array<{ step: string; file: string }>;
  } {
    const locators: Array<{ name: string; file: string; line?: number }> = [];
    const methods: Array<{ name: string; file: string; locators?: string[] }> = [];
    const stepDefs: Array<{ pattern: string; method: string; file: string }> = [];
    const featureSteps: Array<{ step: string; file: string }> = [];

    for (const file of files) {
      // Extract locators
      const locatorMatches = file.content.matchAll(/(@FindBy|By\.|locator\(|getBy|get\s+\w+\s*\(\))/g);
      for (const match of locatorMatches) {
        // Extract locator name (simplified)
        const lineNum = file.content.substring(0, match.index).split('\n').length;
        locators.push({
          name: this.extractLocatorName(match[0], file.content, match.index || 0),
          file: file.filename,
          line: lineNum,
        });
      }

      // Extract methods
      for (const symbol of file.symbols) {
        if (symbol.type === 'method') {
          const usedLocators = this.extractUsedLocators(symbol.code || '', locators);
          methods.push({
            name: symbol.name,
            file: file.filename,
            locators: usedLocators,
          });
        }
      }

      // Extract step definitions
      const stepDefMatches = file.content.matchAll(/@(Given|When|Then|And|But)\(["']([^"']+)["']\)/g);
      for (const match of stepDefMatches) {
        const methodMatch = file.content.substring(match.index || 0).match(/(public|private)\s+\w+\s+(\w+)\s*\(/);
        if (methodMatch) {
          stepDefs.push({
            pattern: match[2],
            method: methodMatch[2],
            file: file.filename,
          });
        }
      }

      // Extract feature steps (if .feature file)
      if (file.filename.endsWith('.feature')) {
        const featureLines = file.content.split('\n');
        for (const line of featureLines) {
          if (/^\s*(Given|When|Then|And|But)\s+/.test(line)) {
            featureSteps.push({
              step: line.trim(),
              file: file.filename,
            });
          }
        }
      }
    }

    return { locators, methods, stepDefs, featureSteps };
  }

  /**
   * Extract locator name from code
   */
  private extractLocatorName(match: string, content: string, index: number): string {
    // Try to find variable name after the locator declaration
    const afterMatch = content.substring(index);
    const varMatch = afterMatch.match(/\s+(\w+)\s*[=;]/);
    return varMatch ? varMatch[1] : 'unknown';
  }

  /**
   * Extract used locators from method code
   */
  private extractUsedLocators(methodCode: string, allLocators: Array<{ name: string }>): string[] {
    return allLocators
      .filter(loc => methodCode.includes(loc.name))
      .map(loc => loc.name);
  }

  /**
   * Find duplicate locators
   */
  private findDuplicateLocators(
    locators: Array<{ name: string; file: string }>,
    mainBranchFiles?: Array<{ filename: string; content: string; symbols: CodeSymbol[] }>
  ): Array<{ locator: string; file1: string; file2: string; similarity: number }> {
    const duplicates: Array<{ locator: string; file1: string; file2: string; similarity: number }> = [];

    // Within PR duplicates
    for (let i = 0; i < locators.length; i++) {
      for (let j = i + 1; j < locators.length; j++) {
        if (locators[i].name === locators[j].name && locators[i].file !== locators[j].file) {
          duplicates.push({
            locator: locators[i].name,
            file1: locators[i].file,
            file2: locators[j].file,
            similarity: 100,
          });
        }
      }
    }

    // Cross-repo duplicates (if main branch provided)
    if (mainBranchFiles) {
      const mainLocators = this.extractTestAutomationElements(mainBranchFiles).locators;
      for (const prLocator of locators) {
        for (const mainLocator of mainLocators) {
          if (prLocator.name === mainLocator.name) {
            duplicates.push({
              locator: prLocator.name,
              file1: prLocator.file,
              file2: `main:${mainLocator.file}`,
              similarity: 100,
            });
          }
        }
      }
    }

    return duplicates;
  }

  /**
   * Find duplicate methods
   */
  private findDuplicateMethods(
    methods: Array<{ name: string; file: string }>,
    mainBranchFiles?: Array<{ filename: string; content: string; symbols: CodeSymbol[] }>
  ): Array<{ method: string; file1: string; file2: string; similarity: number }> {
    const duplicates: Array<{ method: string; file1: string; file2: string; similarity: number }> = [];

    // Within PR duplicates
    for (let i = 0; i < methods.length; i++) {
      for (let j = i + 1; j < methods.length; j++) {
        if (methods[i].name === methods[j].name && methods[i].file !== methods[j].file) {
          duplicates.push({
            method: methods[i].name,
            file1: methods[i].file,
            file2: methods[j].file,
            similarity: 100,
          });
        }
      }
    }

    // Cross-repo duplicates
    if (mainBranchFiles) {
      const mainMethods = this.extractTestAutomationElements(mainBranchFiles).methods;
      for (const prMethod of methods) {
        for (const mainMethod of mainMethods) {
          if (prMethod.name === mainMethod.name) {
            duplicates.push({
              method: prMethod.name,
              file1: prMethod.file,
              file2: `main:${mainMethod.file}`,
              similarity: 100,
            });
          }
        }
      }
    }

    return duplicates;
  }

  /**
   * Find duplicate step definitions
   */
  private findDuplicateStepDefs(
    stepDefs: Array<{ pattern: string; file: string }>,
    mainBranchFiles?: Array<{ filename: string; content: string; symbols: CodeSymbol[] }>
  ): Array<{ stepDef: string; file1: string; file2: string; similarity: number }> {
    const duplicates: Array<{ stepDef: string; file1: string; file2: string; similarity: number }> = [];

    // Within PR duplicates
    for (let i = 0; i < stepDefs.length; i++) {
      for (let j = i + 1; j < stepDefs.length; j++) {
        if (stepDefs[i].pattern === stepDefs[j].pattern && stepDefs[i].file !== stepDefs[j].file) {
          duplicates.push({
            stepDef: stepDefs[i].pattern,
            file1: stepDefs[i].file,
            file2: stepDefs[j].file,
            similarity: 100,
          });
        }
      }
    }

    // Cross-repo duplicates
    if (mainBranchFiles) {
      const mainStepDefs = this.extractTestAutomationElements(mainBranchFiles).stepDefs;
      for (const prStepDef of stepDefs) {
        for (const mainStepDef of mainStepDefs) {
          if (prStepDef.pattern === mainStepDef.pattern) {
            duplicates.push({
              stepDef: prStepDef.pattern,
              file1: prStepDef.file,
              file2: `main:${mainStepDef.file}`,
              similarity: 100,
            });
          }
        }
      }
    }

    return duplicates;
  }

  /**
   * Analyze impact of changes
   */
  private analyzeImpact(
    locators: Array<{ name: string; file: string }>,
    methods: Array<{ name: string; file: string; locators?: string[] }>,
    stepDefs: Array<{ pattern: string; method: string; file: string }>,
    featureSteps: Array<{ step: string; file: string }>
  ): {
    locatorChanges: Array<{ locator: string; impactedMethods: string[]; impactedStepDefs: string[] }>;
    methodChanges: Array<{ method: string; impactedStepDefs: string[]; impactedFeatures: string[] }>;
  } {
    const locatorChanges: Array<{ locator: string; impactedMethods: string[]; impactedStepDefs: string[] }> = [];
    const methodChanges: Array<{ method: string; impactedStepDefs: string[]; impactedFeatures: string[] }> = [];

    // Analyze locator impact
    for (const locator of locators) {
      const impactedMethods = methods
        .filter(m => m.locators?.includes(locator.name))
        .map(m => m.name);
      
      const impactedStepDefs = stepDefs
        .filter(sd => impactedMethods.includes(sd.method))
        .map(sd => sd.pattern);

      if (impactedMethods.length > 0) {
        locatorChanges.push({
          locator: locator.name,
          impactedMethods,
          impactedStepDefs,
        });
      }
    }

    // Analyze method impact
    for (const method of methods) {
      const impactedStepDefs = stepDefs
        .filter(sd => sd.method === method.name)
        .map(sd => sd.pattern);
      
      // Find feature steps that match step defs
      const impactedFeatures = featureSteps
        .filter(fs => impactedStepDefs.some(sd => this.matchesStepPattern(fs.step, sd)))
        .map(fs => fs.step);

      if (impactedStepDefs.length > 0) {
        methodChanges.push({
          method: method.name,
          impactedStepDefs,
          impactedFeatures,
        });
      }
    }

    return { locatorChanges, methodChanges };
  }

  /**
   * Check if feature step matches step definition pattern
   */
  private matchesStepPattern(featureStep: string, stepDefPattern: string): boolean {
    const normalizedFeature = featureStep.toLowerCase().trim();
    const normalizedPattern = stepDefPattern.toLowerCase()
      .replace(/@when\(|@given\(|@then\(|["']/gi, '')
      .replace(/\{[^}]+\}/g, '.*')
      .trim();
    
    const regex = new RegExp('^' + normalizedPattern.replace(/\s+/g, '\\s+') + '$', 'i');
    return regex.test(normalizedFeature);
  }
}







