/**
 * PR Flow Validation Analyzer
 * Validates test automation flow for PR files only:
 * Locator → Method → Step Def → Feature File
 * 
 * SAFE: Wrapped in try-catch, non-blocking, only analyzes PR files
 */

export interface PRFlowIssue {
  type: 'unused_locator' | 'unused_method' | 'missing_step_def' | 'missing_feature_step' | 'broken_flow';
  severity: 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  element: string; // locator name, method name, step def pattern, etc.
  message: string;
  suggestion: string;
  relatedFiles?: string[]; // Files that should use this element
}

export interface PRFlowReport {
  issues: PRFlowIssue[];
  unusedLocators: PRFlowIssue[];
  unusedMethods: PRFlowIssue[];
  missingStepDefs: PRFlowIssue[];
  missingFeatureSteps: PRFlowIssue[];
  brokenFlows: PRFlowIssue[];
  summary: string;
}

export class PRFlowAnalyzer {
  /**
   * Analyze PR flow: Locator → Method → Step Def → Feature File
   * Only analyzes PR files (fast, safe)
   */
  analyzePRFlow(prFiles: Map<string, string>, prFileNames: string[]): PRFlowReport {
    const issues: PRFlowIssue[] = [];
    const unusedLocators: PRFlowIssue[] = [];
    const unusedMethods: PRFlowIssue[] = [];
    const missingStepDefs: PRFlowIssue[] = [];
    const missingFeatureSteps: PRFlowIssue[] = [];
    const brokenFlows: PRFlowIssue[] = [];

    try {
      // Extract all elements from PR files
      const { locators, methods, stepDefs, featureSteps } = this.extractPRElements(prFiles, prFileNames);

      // 1. Check unused locators in PR
      for (const locator of locators) {
        const usedInPR = methods.some(m => 
          this.isLocatorUsedInMethod(locator.name, m.code || '', m.file)
        );
        
        if (!usedInPR) {
          const issue: PRFlowIssue = {
            type: 'unused_locator',
            severity: 'medium',
            file: locator.file,
            line: locator.line,
            element: locator.name,
            message: `Locator "${locator.name}" is defined in PR but not used in any PR method`,
            suggestion: `Use this locator in a method or remove it if not needed`,
            relatedFiles: methods.map(m => m.file),
          };
          unusedLocators.push(issue);
          issues.push(issue);
        }
      }

      // 2. Check unused methods in PR
      for (const method of methods) {
        const usedInStepDef = stepDefs.some(sd => 
          this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file)
        );
        
        if (!usedInStepDef) {
          const issue: PRFlowIssue = {
            type: 'unused_method',
            severity: 'high',
            file: method.file,
            line: method.line,
            element: method.name,
            message: `Method "${method.name}" is defined in PR but not called in any PR step definition`,
            suggestion: `Add step definition that calls this method or remove unused method`,
            relatedFiles: stepDefs.map(sd => sd.file),
          };
          unusedMethods.push(issue);
          issues.push(issue);
        }
      }

      // 3. Check missing step definitions for methods
      for (const method of methods) {
        const hasStepDef = stepDefs.some(sd => 
          this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file)
        );
        
        if (!hasStepDef) {
          const issue: PRFlowIssue = {
            type: 'missing_step_def',
            severity: 'high',
            file: method.file,
            line: method.line,
            element: method.name,
            message: `Method "${method.name}" has no corresponding step definition in PR`,
            suggestion: `Add step definition: @When("user clicks ${method.name}") public void step${method.name}() { ${method.name}(); }`,
            relatedFiles: stepDefs.map(sd => sd.file),
          };
          missingStepDefs.push(issue);
          issues.push(issue);
        }
      }

      // 4. Check missing feature steps for step definitions
      for (const stepDef of stepDefs) {
        const hasFeatureStep = featureSteps.some(fs => 
          this.matchesStepPattern(fs.step, stepDef.pattern)
        );
        
        if (!hasFeatureStep) {
          const issue: PRFlowIssue = {
            type: 'missing_feature_step',
            severity: 'medium',
            file: stepDef.file,
            line: stepDef.line,
            element: stepDef.pattern,
            message: `Step definition "${stepDef.pattern}" has no matching feature file step in PR`,
            suggestion: `Add feature step: When ${stepDef.pattern}`,
            relatedFiles: featureSteps.map(fs => fs.file),
          };
          missingFeatureSteps.push(issue);
          issues.push(issue);
        }
      }

      // 5. Check broken flows (locator → method → step def → feature)
      for (const locator of locators) {
        const method = methods.find(m => 
          this.isLocatorUsedInMethod(locator.name, m.code || '', m.file)
        );
        
        if (method) {
          const stepDef = stepDefs.find(sd => 
            this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file)
          );
          
          if (stepDef) {
            const featureStep = featureSteps.find(fs => 
              this.matchesStepPattern(fs.step, stepDef.pattern)
            );
            
            if (!featureStep) {
              const issue: PRFlowIssue = {
                type: 'broken_flow',
                severity: 'high',
                file: locator.file,
                line: locator.line,
                element: `${locator.name} → ${method.name} → ${stepDef.pattern}`,
                message: `Flow is broken: Locator "${locator.name}" → Method "${method.name}" → Step Def "${stepDef.pattern}" → Missing Feature Step`,
                suggestion: `Complete the flow by adding feature step: When ${stepDef.pattern}`,
                relatedFiles: [method.file, stepDef.file],
              };
              brokenFlows.push(issue);
              issues.push(issue);
            }
          }
        }
      }

      // Generate summary
      const summary = this.generateSummary(issues, unusedLocators, unusedMethods, missingStepDefs, missingFeatureSteps, brokenFlows);

      return {
        issues,
        unusedLocators,
        unusedMethods,
        missingStepDefs,
        missingFeatureSteps,
        brokenFlows,
        summary,
      };
    } catch (error: any) {
      // Return empty report on error (non-blocking)
      return {
        issues: [],
        unusedLocators: [],
        unusedMethods: [],
        missingStepDefs: [],
        missingFeatureSteps: [],
        brokenFlows: [],
        summary: 'PR flow validation failed (non-critical)',
      };
    }
  }

  /**
   * Extract all test automation elements from PR files
   */
  private extractPRElements(prFiles: Map<string, string>, prFileNames: string[]): {
    locators: Array<{ name: string; file: string; line: number; code?: string }>;
    methods: Array<{ name: string; file: string; line: number; code?: string }>;
    stepDefs: Array<{ pattern: string; method: string; file: string; line: number; code?: string }>;
    featureSteps: Array<{ step: string; file: string; line: number }>;
  } {
    const locators: Array<{ name: string; file: string; line: number; code?: string }> = [];
    const methods: Array<{ name: string; file: string; line: number; code?: string }> = [];
    const stepDefs: Array<{ pattern: string; method: string; file: string; line: number; code?: string }> = [];
    const featureSteps: Array<{ step: string; file: string; line: number }> = [];

    for (const [filename, content] of prFiles.entries()) {
      const lines = content.split('\n');

      // Extract locators (Playwright, WebDriverIO, Selenium)
      lines.forEach((line, index) => {
        // Playwright
        if (line.includes('locator(') || line.includes('getByRole') || line.includes('getByTestId') || line.includes('getByText')) {
          const locatorName = this.extractLocatorName(line, filename);
          if (locatorName) {
            locators.push({ name: locatorName, file: filename, line: index + 1, code: line });
          }
        }
        
        // WebDriverIO
        if (line.includes('$(') || line.includes('$$(') || line.includes('browser.$')) {
          const locatorName = this.extractLocatorName(line, filename);
          if (locatorName) {
            locators.push({ name: locatorName, file: filename, line: index + 1, code: line });
          }
        }
        
        // Selenium
        if (line.includes('By.') || line.includes('@FindBy') || line.includes('findElement')) {
          const locatorName = this.extractLocatorName(line, filename);
          if (locatorName) {
            locators.push({ name: locatorName, file: filename, line: index + 1, code: line });
          }
        }
      });

      // Extract methods (look for method definitions)
      const methodRegex = /(public|private|protected)?\s*(async\s+)?(function\s+)?(\w+)\s*\(/g;
      let match;
      while ((match = methodRegex.exec(content)) !== null) {
        const methodName = match[4];
        const lineNum = content.substring(0, match.index).split('\n').length;
        
        // Skip constructors and common methods
        if (methodName !== 'constructor' && methodName !== 'toString' && methodName !== 'equals') {
          methods.push({ 
            name: methodName, 
            file: filename, 
            line: lineNum,
            code: content.substring(match.index, content.indexOf('}', match.index) + 1),
          });
        }
      }

      // Extract step definitions (Cucumber, Gherkin)
      const stepDefRegex = /@(Given|When|Then|And|But)\(["']([^"']+)["']\)/g;
      while ((match = stepDefRegex.exec(content)) !== null) {
        const pattern = match[2];
        const lineNum = content.substring(0, match.index).split('\n').length;
        
        // Find method name after step definition
        const afterMatch = content.substring(match.index);
        const methodMatch = afterMatch.match(/(public|private)\s+\w+\s+(\w+)\s*\(/);
        const methodName = methodMatch ? methodMatch[2] : 'unknown';
        
        stepDefs.push({
          pattern,
          method: methodName,
          file: filename,
          line: lineNum,
          code: afterMatch.substring(0, afterMatch.indexOf('}') + 1),
        });
      }

      // Extract feature steps (Gherkin feature files)
      if (filename.endsWith('.feature')) {
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (/^(Given|When|Then|And|But)\s+/.test(trimmed)) {
            featureSteps.push({
              step: trimmed,
              file: filename,
              line: index + 1,
            });
          }
        });
      }
    }

    return { locators, methods, stepDefs, featureSteps };
  }

  /**
   * Extract locator name from code line
   */
  private extractLocatorName(line: string, filename: string): string | null {
    // Playwright: const button = page.getByRole('button')
    const playwrightMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*page\.(?:getBy|locator)/);
    if (playwrightMatch) return playwrightMatch[1];
    
    // WebDriverIO: const button = $('button')
    const wdioMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*\$\(/);
    if (wdioMatch) return wdioMatch[1];
    
    // Selenium: @FindBy(id = "button")
    const seleniumMatch = line.match(/@FindBy.*?(\w+)\s*[=;]/);
    if (seleniumMatch) return seleniumMatch[1];
    
    return null;
  }

  /**
   * Check if locator is used in method code
   */
  private isLocatorUsedInMethod(locatorName: string, methodCode: string, methodFile: string): boolean {
    // Check if locator name appears in method code
    return methodCode.includes(locatorName) || 
           methodCode.toLowerCase().includes(locatorName.toLowerCase());
  }

  /**
   * Check if method is called in step definition code
   */
  private isMethodCalledInStepDef(methodName: string, stepDefCode: string, stepDefFile: string): boolean {
    // Check if method is called in step def
    // Pattern: methodName() or this.methodName() or pageObject.methodName()
    const patterns = [
      new RegExp(`\\b${methodName}\\s*\\(`, 'i'),
      new RegExp(`\\.${methodName}\\s*\\(`, 'i'),
      new RegExp(`this\\.${methodName}\\s*\\(`, 'i'),
    ];
    
    return patterns.some(pattern => pattern.test(stepDefCode));
  }

  /**
   * Check if feature step matches step definition pattern
   */
  private matchesStepPattern(featureStep: string, stepDefPattern: string): boolean {
    // Remove Gherkin keyword (Given/When/Then/And/But)
    const stepText = featureStep.replace(/^(Given|When|Then|And|But)\s+/i, '').trim();
    
    // Simple pattern matching (can be enhanced)
    // Replace placeholders in step def pattern
    const patternRegex = stepDefPattern
      .replace(/\{string\}/g, '.*')
      .replace(/\{int\}/g, '\\d+')
      .replace(/\{word\}/g, '\\w+');
    
    try {
      const regex = new RegExp(`^${patternRegex}$`, 'i');
      return regex.test(stepText);
    } catch {
      // Fallback to simple includes check
      return stepText.toLowerCase().includes(stepDefPattern.toLowerCase()) ||
             stepDefPattern.toLowerCase().includes(stepText.toLowerCase());
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    issues: PRFlowIssue[],
    unusedLocators: PRFlowIssue[],
    unusedMethods: PRFlowIssue[],
    missingStepDefs: PRFlowIssue[],
    missingFeatureSteps: PRFlowIssue[],
    brokenFlows: PRFlowIssue[]
  ): string {
    if (issues.length === 0) {
      return '✅ All PR flow elements are properly connected (Locator → Method → Step Def → Feature File)';
    }

    const parts: string[] = [];
    
    if (unusedLocators.length > 0) {
      parts.push(`${unusedLocators.length} unused locator(s) in PR`);
    }
    if (unusedMethods.length > 0) {
      parts.push(`${unusedMethods.length} unused method(s) in PR`);
    }
    if (missingStepDefs.length > 0) {
      parts.push(`${missingStepDefs.length} method(s) missing step definitions`);
    }
    if (missingFeatureSteps.length > 0) {
      parts.push(`${missingFeatureSteps.length} step definition(s) missing feature steps`);
    }
    if (brokenFlows.length > 0) {
      parts.push(`${brokenFlows.length} broken flow(s) detected`);
    }

    return `⚠️ Found ${issues.length} PR flow issue(s): ${parts.join(', ')}`;
  }
}

