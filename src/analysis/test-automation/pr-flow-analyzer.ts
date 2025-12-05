/**
 * PR Flow Validation Analyzer
 * Validates test automation flow for PR files only:
 * Locator → Method → Step Def → Feature File
 * 
 * SAFE: Wrapped in try-catch, non-blocking, only analyzes PR files
 */

export interface PRFlowIssue {
  type: 'unused_locator' | 'unused_method' | 'missing_step_def' | 'missing_feature_step' | 'broken_flow' | 'cross_file_issue' | 'method_call_mismatch' | 'breaking_flow_change' | 'incomplete_flow';
  severity: 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  element: string; // locator name, method name, step def pattern, etc.
  message: string;
  suggestion: string;
  relatedFiles?: string[]; // Files that should use this element
  crossFileFlow?: {
    locatorFile: string;
    methodFile: string;
    stepDefFile: string;
    featureFile: string;
  }; // Cross-file flow tracking (Batch 2)
  actualCall?: string; // Actual method call found (Batch 2)
  expectedCall?: string; // Expected method call (Batch 2)
  oldValue?: string; // Old value before change (Batch 3)
  newValue?: string; // New value after change (Batch 3)
  completenessScore?: number; // Flow completeness score 0-100 (Batch 3)
}

export interface PRFlowReport {
  issues: PRFlowIssue[];
  unusedLocators: PRFlowIssue[];
  unusedMethods: PRFlowIssue[];
  missingStepDefs: PRFlowIssue[];
  missingFeatureSteps: PRFlowIssue[];
  brokenFlows: PRFlowIssue[];
  crossFileIssues: PRFlowIssue[]; // Batch 2
  methodCallMismatches: PRFlowIssue[]; // Batch 2
  breakingFlowChanges: PRFlowIssue[]; // Batch 3
  incompleteFlows: PRFlowIssue[]; // Batch 3
  flowGraph?: {
    nodes: Array<{ id: string; type: 'locator' | 'method' | 'stepdef' | 'feature'; file: string }>;
    edges: Array<{ from: string; to: string; type: string }>;
  }; // Batch 2: Dependency graph
  overallCompletenessScore?: number; // Batch 3: Overall flow completeness (0-100)
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
    const crossFileIssues: PRFlowIssue[] = []; // Batch 2
    const methodCallMismatches: PRFlowIssue[] = []; // Batch 2
    const breakingFlowChanges: PRFlowIssue[] = []; // Batch 3
    const incompleteFlows: PRFlowIssue[] = []; // Batch 3

    try {
      // Extract all elements from PR files
      const { locators, methods, stepDefs, featureSteps } = this.extractPRElements(prFiles, prFileNames);
      
      // Batch 2: Build cross-file flow graph
      const flowGraph = this.buildFlowGraph(locators, methods, stepDefs, featureSteps);
      
      // Batch 3: Detect breaking flow changes and calculate completeness
      const { breakingChanges, completenessScore } = this.detectBreakingFlowChangesAndCompleteness(
        locators, methods, stepDefs, featureSteps, prFileNames
      );
      breakingFlowChanges.push(...breakingChanges);
      
      // Batch 3: Identify incomplete flows
      const incomplete = this.identifyIncompleteFlows(locators, methods, stepDefs, featureSteps);
      incompleteFlows.push(...incomplete);

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
        // Batch 2: Verify actual method calls (not just name matching)
        const stepDefsUsingMethod = stepDefs.filter(sd => 
          this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file)
        );
        
        // Batch 2: Check actual method calls
        for (const stepDef of stepDefsUsingMethod) {
          const actualCall = this.extractMethodCall(stepDef.code || '', method.name);
          if (actualCall && actualCall !== method.name) {
            const issue: PRFlowIssue = {
              type: 'method_call_mismatch',
              severity: 'high',
              file: stepDef.file,
              line: stepDef.line,
              element: method.name,
              message: `Step definition calls "${actualCall}" but method is named "${method.name}"`,
              suggestion: `Update method call to "${method.name}()" or rename method to match call`,
              actualCall,
              expectedCall: method.name,
              relatedFiles: [method.file],
            };
            methodCallMismatches.push(issue);
            issues.push(issue);
          }
        }
        
        if (stepDefsUsingMethod.length === 0) {
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

      // 5. Check broken flows (locator → method → step def → feature) - Enhanced with cross-file tracking
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
            
            // Batch 2: Track cross-file flow
            const crossFileFlow = {
              locatorFile: locator.file,
              methodFile: method.file,
              stepDefFile: stepDef.file,
              featureFile: featureStep?.file || 'MISSING',
            };
            
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
                crossFileFlow, // Batch 2: Cross-file tracking
              };
              brokenFlows.push(issue);
              issues.push(issue);
            } else {
              // Batch 2: Check if flow spans multiple files (cross-file issue)
              const uniqueFiles = new Set([locator.file, method.file, stepDef.file, featureStep.file]);
              if (uniqueFiles.size > 1) {
                // Cross-file flow detected - verify all files are in PR
                const allFilesInPR = Array.from(uniqueFiles).every(file => prFileNames.includes(file));
                if (!allFilesInPR) {
                  const issue: PRFlowIssue = {
                    type: 'cross_file_issue',
                    severity: 'medium',
                    file: locator.file,
                    line: locator.line,
                    element: `${locator.name} → ${method.name} → ${stepDef.pattern} → ${featureStep.step}`,
                    message: `Flow spans multiple files but some files are not in PR: ${Array.from(uniqueFiles).filter(f => !prFileNames.includes(f)).join(', ')}`,
                    suggestion: `Ensure all related files are included in PR or verify flow is complete`,
                    relatedFiles: Array.from(uniqueFiles),
                    crossFileFlow, // Batch 2: Cross-file tracking
                  };
                  crossFileIssues.push(issue);
                  issues.push(issue);
                }
              }
            }
          }
        }
      }

      // Add Batch 3 issues to main issues array
      issues.push(...breakingFlowChanges);
      issues.push(...incompleteFlows);

      // Generate summary
      const summary = this.generateSummary(issues, unusedLocators, unusedMethods, missingStepDefs, missingFeatureSteps, brokenFlows, crossFileIssues, methodCallMismatches, breakingFlowChanges, incompleteFlows, completenessScore);

      return {
        issues,
        unusedLocators,
        unusedMethods,
        missingStepDefs,
        missingFeatureSteps,
        brokenFlows,
        crossFileIssues, // Batch 2
        methodCallMismatches, // Batch 2
        breakingFlowChanges, // Batch 3
        incompleteFlows, // Batch 3
        flowGraph, // Batch 2
        overallCompletenessScore: completenessScore, // Batch 3
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
        crossFileIssues: [], // Batch 2
        methodCallMismatches: [], // Batch 2
        breakingFlowChanges: [], // Batch 3
        incompleteFlows: [], // Batch 3
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
   * Build cross-file flow graph (Batch 2)
   */
  private buildFlowGraph(
    locators: Array<{ name: string; file: string; line: number; code?: string }>,
    methods: Array<{ name: string; file: string; line: number; code?: string }>,
    stepDefs: Array<{ pattern: string; method: string; file: string; line: number; code?: string }>,
    featureSteps: Array<{ step: string; file: string; line: number }>
  ): {
    nodes: Array<{ id: string; type: 'locator' | 'method' | 'stepdef' | 'feature'; file: string }>;
    edges: Array<{ from: string; to: string; type: string }>;
  } {
    const nodes: Array<{ id: string; type: 'locator' | 'method' | 'stepdef' | 'feature'; file: string }> = [];
    const edges: Array<{ from: string; to: string; type: string }> = [];

    // Add nodes
    locators.forEach(loc => {
      nodes.push({ id: `locator:${loc.name}`, type: 'locator', file: loc.file });
    });
    methods.forEach(method => {
      nodes.push({ id: `method:${method.name}`, type: 'method', file: method.file });
    });
    stepDefs.forEach(sd => {
      nodes.push({ id: `stepdef:${sd.pattern}`, type: 'stepdef', file: sd.file });
    });
    featureSteps.forEach(fs => {
      nodes.push({ id: `feature:${fs.step}`, type: 'feature', file: fs.file });
    });

    // Add edges (locator → method)
    for (const locator of locators) {
      const method = methods.find(m => this.isLocatorUsedInMethod(locator.name, m.code || '', m.file));
      if (method) {
        edges.push({ from: `locator:${locator.name}`, to: `method:${method.name}`, type: 'uses' });
      }
    }

    // Add edges (method → step def)
    for (const method of methods) {
      const stepDef = stepDefs.find(sd => this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file));
      if (stepDef) {
        edges.push({ from: `method:${method.name}`, to: `stepdef:${stepDef.pattern}`, type: 'calls' });
      }
    }

    // Add edges (step def → feature)
    for (const stepDef of stepDefs) {
      const featureStep = featureSteps.find(fs => this.matchesStepPattern(fs.step, stepDef.pattern));
      if (featureStep) {
        edges.push({ from: `stepdef:${stepDef.pattern}`, to: `feature:${featureStep.step}`, type: 'references' });
      }
    }

    return { nodes, edges };
  }

  /**
   * Extract actual method call from code (Batch 2)
   */
  private extractMethodCall(code: string, methodName: string): string | null {
    // Look for method calls: methodName(), this.methodName(), pageObject.methodName()
    const patterns = [
      new RegExp(`\\b${methodName}\\s*\\(`, 'i'),
      new RegExp(`\\.${methodName}\\s*\\(`, 'i'),
      new RegExp(`this\\.${methodName}\\s*\\(`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        // Extract the full call
        const callMatch = code.substring(match.index || 0).match(/(\w+(?:\.\w+)*)\s*\(/);
        if (callMatch) {
          return callMatch[1];
        }
      }
    }

    return null;
  }

  /**
   * Detect breaking flow changes (Batch 3)
   * Detects when flow elements are renamed/removed/changed
   */
  private detectBreakingFlowChangesAndCompleteness(
    locators: Array<{ name: string; file: string; line: number; code?: string }>,
    methods: Array<{ name: string; file: string; line: number; code?: string }>,
    stepDefs: Array<{ pattern: string; method: string; file: string; line: number; code?: string }>,
    featureSteps: Array<{ step: string; file: string; line: number }>,
    prFileNames: string[]
  ): { breakingChanges: PRFlowIssue[]; completenessScore: number } {
    const breakingChanges: PRFlowIssue[] = [];
    
    // Check for renamed methods (method exists but step def calls different name)
    for (const method of methods) {
      const stepDefsUsingMethod = stepDefs.filter(sd => 
        this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file)
      );
      
      for (const stepDef of stepDefsUsingMethod) {
        const actualCall = this.extractMethodCall(stepDef.code || '', method.name);
        if (actualCall && actualCall !== method.name) {
          // Potential rename - check if old name still exists
          const oldMethodExists = methods.some(m => m.name === actualCall);
          if (!oldMethodExists) {
            breakingChanges.push({
              type: 'breaking_flow_change',
              severity: 'high',
              file: stepDef.file,
              line: stepDef.line,
              element: method.name,
              message: `Method renamed from "${actualCall}" to "${method.name}" - step definition still calls old name`,
              suggestion: `Update step definition to call "${method.name}()" instead of "${actualCall}()"`,
              oldValue: actualCall,
              newValue: method.name,
              relatedFiles: [method.file],
            });
          }
        }
      }
    }
    
    // Check for renamed step definitions (pattern changed but feature still uses old pattern)
    for (const stepDef of stepDefs) {
      const matchingFeatures = featureSteps.filter(fs => 
        this.matchesStepPattern(fs.step, stepDef.pattern)
      );
      
      if (matchingFeatures.length === 0) {
        // Step def pattern might have changed - check if similar pattern exists
        const similarPattern = featureSteps.find(fs => 
          fs.step.toLowerCase().includes(stepDef.pattern.toLowerCase().substring(0, 10))
        );
        
        if (similarPattern) {
          breakingChanges.push({
            type: 'breaking_flow_change',
            severity: 'high',
            file: stepDef.file,
            line: stepDef.line,
            element: stepDef.pattern,
            message: `Step definition pattern "${stepDef.pattern}" doesn't match feature step "${similarPattern.step}"`,
            suggestion: `Update step definition pattern to match feature: "${similarPattern.step.replace(/^(Given|When|Then|And|But)\s+/i, '')}"`,
            oldValue: stepDef.pattern,
            newValue: similarPattern.step.replace(/^(Given|When|Then|And|But)\s+/i, ''),
            relatedFiles: [similarPattern.file],
          });
        }
      }
    }
    
    // Calculate completeness score (Batch 3)
    const completenessScore = this.calculateFlowCompleteness(locators, methods, stepDefs, featureSteps);
    
    return { breakingChanges, completenessScore };
  }

  /**
   * Calculate flow completeness score (Batch 3)
   * 0-100 score based on how complete the flow is
   */
  private calculateFlowCompleteness(
    locators: Array<{ name: string; file: string; line: number; code?: string }>,
    methods: Array<{ name: string; file: string; line: number; code?: string }>,
    stepDefs: Array<{ pattern: string; method: string; file: string; line: number; code?: string }>,
    featureSteps: Array<{ step: string; file: string; line: number }>
  ): number {
    if (locators.length === 0 && methods.length === 0 && stepDefs.length === 0 && featureSteps.length === 0) {
      return 100; // No test automation code, consider complete
    }

    let score = 0;
    let maxScore = 0;

    // Check locator → method connections (25 points)
    maxScore += 25;
    if (locators.length > 0) {
      const usedLocators = locators.filter(loc => 
        methods.some(m => this.isLocatorUsedInMethod(loc.name, m.code || '', m.file))
      );
      score += (usedLocators.length / locators.length) * 25;
    } else {
      score += 25; // No locators to check
    }

    // Check method → step def connections (25 points)
    maxScore += 25;
    if (methods.length > 0) {
      const methodsWithStepDefs = methods.filter(method => 
        stepDefs.some(sd => this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file))
      );
      score += (methodsWithStepDefs.length / methods.length) * 25;
    } else {
      score += 25; // No methods to check
    }

    // Check step def → feature connections (25 points)
    maxScore += 25;
    if (stepDefs.length > 0) {
      const stepDefsWithFeatures = stepDefs.filter(sd => 
        featureSteps.some(fs => this.matchesStepPattern(fs.step, sd.pattern))
      );
      score += (stepDefsWithFeatures.length / stepDefs.length) * 25;
    } else {
      score += 25; // No step defs to check
    }

    // Check complete flows (25 points)
    maxScore += 25;
    let completeFlows = 0;
    let totalFlows = 0;
    
    for (const locator of locators) {
      const method = methods.find(m => this.isLocatorUsedInMethod(locator.name, m.code || '', m.file));
      if (method) {
        totalFlows++;
        const stepDef = stepDefs.find(sd => this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file));
        if (stepDef) {
          const featureStep = featureSteps.find(fs => this.matchesStepPattern(fs.step, stepDef.pattern));
          if (featureStep) {
            completeFlows++;
          }
        }
      }
    }
    
    if (totalFlows > 0) {
      score += (completeFlows / totalFlows) * 25;
    } else {
      score += 25; // No flows to check
    }

    return Math.round(score);
  }

  /**
   * Identify incomplete flows (Batch 3)
   */
  private identifyIncompleteFlows(
    locators: Array<{ name: string; file: string; line: number; code?: string }>,
    methods: Array<{ name: string; file: string; line: number; code?: string }>,
    stepDefs: Array<{ pattern: string; method: string; file: string; line: number; code?: string }>,
    featureSteps: Array<{ step: string; file: string; line: number }>
  ): PRFlowIssue[] {
    const incomplete: PRFlowIssue[] = [];

    for (const locator of locators) {
      const method = methods.find(m => this.isLocatorUsedInMethod(locator.name, m.code || '', m.file));
      
      if (method) {
        const stepDef = stepDefs.find(sd => this.isMethodCalledInStepDef(method.name, sd.code || '', sd.file));
        
        if (stepDef) {
          const featureStep = featureSteps.find(fs => this.matchesStepPattern(fs.step, stepDef.pattern));
          
          if (!featureStep) {
            // Flow is incomplete: locator → method → step def → MISSING feature
            incomplete.push({
              type: 'incomplete_flow',
              severity: 'medium',
              file: locator.file,
              line: locator.line,
              element: `${locator.name} → ${method.name} → ${stepDef.pattern} → MISSING`,
              message: `Flow is incomplete: Locator "${locator.name}" → Method "${method.name}" → Step Def "${stepDef.pattern}" → Missing Feature Step`,
              suggestion: `Add feature step: When ${stepDef.pattern}`,
              relatedFiles: [method.file, stepDef.file],
              completenessScore: 75, // 3 out of 4 steps complete
            });
          }
        } else {
          // Flow is incomplete: locator → method → MISSING step def
          incomplete.push({
            type: 'incomplete_flow',
            severity: 'high',
            file: locator.file,
            line: locator.line,
            element: `${locator.name} → ${method.name} → MISSING`,
            message: `Flow is incomplete: Locator "${locator.name}" → Method "${method.name}" → Missing Step Definition`,
            suggestion: `Add step definition for method "${method.name}"`,
            relatedFiles: [method.file],
            completenessScore: 50, // 2 out of 4 steps complete
          });
        }
      } else {
        // Flow is incomplete: locator → MISSING method
        incomplete.push({
          type: 'incomplete_flow',
          severity: 'medium',
          file: locator.file,
          line: locator.line,
          element: `${locator.name} → MISSING`,
          message: `Flow is incomplete: Locator "${locator.name}" → Missing Method`,
          suggestion: `Create method to use locator "${locator.name}"`,
          relatedFiles: [],
          completenessScore: 25, // 1 out of 4 steps complete
        });
      }
    }

    return incomplete;
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
    brokenFlows: PRFlowIssue[],
    crossFileIssues: PRFlowIssue[], // Batch 2
    methodCallMismatches: PRFlowIssue[], // Batch 2
    breakingFlowChanges: PRFlowIssue[], // Batch 3
    incompleteFlows: PRFlowIssue[], // Batch 3
    completenessScore: number // Batch 3
  ): string {
    if (issues.length === 0) {
      return `✅ All PR flow elements are properly connected (Locator → Method → Step Def → Feature File). Flow Completeness: ${completenessScore}%`;
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
    if (crossFileIssues.length > 0) { // Batch 2
      parts.push(`${crossFileIssues.length} cross-file flow issue(s)`);
    }
    if (methodCallMismatches.length > 0) { // Batch 2
      parts.push(`${methodCallMismatches.length} method call mismatch(es)`);
    }
    if (breakingFlowChanges.length > 0) { // Batch 3
      parts.push(`${breakingFlowChanges.length} breaking flow change(s)`);
    }
    if (incompleteFlows.length > 0) { // Batch 3
      parts.push(`${incompleteFlows.length} incomplete flow(s)`);
    }

    return `⚠️ Found ${issues.length} PR flow issue(s): ${parts.join(', ')}. Flow Completeness: ${completenessScore}%`;
  }
}

