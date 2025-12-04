/**
 * Flow Validation for Test Automation
 * Validates flow: Locator → Method → Step Def → Feature File
 */

import { CodeSymbol } from '../../parser/types.js';

export interface FlowIssue {
  type: 'missing_link' | 'context_mismatch' | 'naming_inconsistency' | 'unused_locator' | 'unused_method';
  locator?: string;
  method?: string;
  stepDef?: string;
  featureStep?: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface FlowValidation {
  issues: FlowIssue[];
  missingLinks: FlowIssue[];
  contextMismatches: FlowIssue[];
  namingInconsistencies: FlowIssue[];
  unusedLocators: FlowIssue[];
  unusedMethods: FlowIssue[];
}

export class FlowValidator {
  /**
   * Validate flow: Locator → Method → Step Def → Feature File
   */
  validateFlow(
    locators: Array<{ name: string; file: string; line?: number }>,
    methods: Array<{ name: string; file: string; locators?: string[] }>,
    stepDefs: Array<{ pattern: string; method: string; file: string }>,
    featureSteps: Array<{ step: string; file: string }>
  ): FlowValidation {
    const issues: FlowIssue[] = [];
    const missingLinks: FlowIssue[] = [];
    const contextMismatches: FlowIssue[] = [];
    const namingInconsistencies: FlowIssue[] = [];
    const unusedLocators: FlowIssue[] = [];
    const unusedMethods: FlowIssue[] = [];

    // 1. Check locator → method links
    for (const locator of locators) {
      const usedInMethod = methods.some(m => 
        m.locators?.includes(locator.name) || 
        m.name.toLowerCase().includes(locator.name.toLowerCase())
      );
      
      if (!usedInMethod) {
        const issue: FlowIssue = {
          type: 'unused_locator',
          locator: locator.name,
          severity: 'medium',
          message: `Locator "${locator.name}" is defined but not used in any method`,
          suggestion: `Create a method to use this locator or remove unused locator`,
        };
        unusedLocators.push(issue);
        issues.push(issue);
      }
    }

    // 2. Check method → step def links
    for (const method of methods) {
      const hasStepDef = stepDefs.some(sd => 
        sd.method === method.name || 
        sd.method.toLowerCase() === method.name.toLowerCase()
      );
      
      if (!hasStepDef) {
        const issue: FlowIssue = {
          type: 'missing_link',
          method: method.name,
          severity: 'high',
          message: `Method "${method.name}" has no corresponding step definition`,
          suggestion: `Add step definition for method "${method.name}"`,
        };
        missingLinks.push(issue);
        issues.push(issue);
      }
    }

    // 3. Check step def → feature file links
    for (const stepDef of stepDefs) {
      const hasFeatureStep = featureSteps.some(fs => 
        this.matchesStepPattern(fs.step, stepDef.pattern)
      );
      
      if (!hasFeatureStep) {
        const issue: FlowIssue = {
          type: 'missing_link',
          stepDef: stepDef.pattern,
          method: stepDef.method,
          severity: 'medium',
          message: `Step definition "${stepDef.pattern}" has no matching feature file step`,
          suggestion: `Add feature file step matching "${stepDef.pattern}" or update step definition`,
        };
        missingLinks.push(issue);
        issues.push(issue);
      }
    }

    // 4. Check naming consistency
    for (const method of methods) {
      const stepDef = stepDefs.find(sd => 
        sd.method === method.name || 
        sd.method.toLowerCase() === method.name.toLowerCase()
      );
      
      if (stepDef) {
        // Check if method name matches step def pattern
        const methodWords = this.extractWords(method.name);
        const stepWords = this.extractWords(stepDef.pattern);
        
        if (!this.hasCommonWords(methodWords, stepWords)) {
          const issue: FlowIssue = {
            type: 'naming_inconsistency',
            method: method.name,
            stepDef: stepDef.pattern,
            severity: 'low',
            message: `Method name "${method.name}" doesn't match step definition pattern "${stepDef.pattern}"`,
            suggestion: `Rename method to match step def or update step def to match method name`,
          };
          namingInconsistencies.push(issue);
          issues.push(issue);
        }
      }
    }

    // 5. Check context consistency (e.g., "right sidebar" mentioned throughout)
    for (const locator of locators) {
      const method = methods.find(m => 
        m.locators?.includes(locator.name) || 
        m.name.toLowerCase().includes(locator.name.toLowerCase())
      );
      
      if (method) {
        const stepDef = stepDefs.find(sd => 
          sd.method === method.name || 
          sd.method.toLowerCase() === method.name.toLowerCase()
        );
        
        if (stepDef) {
          // Extract context from locator (e.g., "rightSidebarButton" → "right sidebar")
          const locatorContext = this.extractContext(locator.name);
          const methodContext = this.extractContext(method.name);
          const stepDefContext = this.extractContext(stepDef.pattern);
          
          if (locatorContext && !stepDefContext.includes(locatorContext)) {
            const issue: FlowIssue = {
              type: 'context_mismatch',
              locator: locator.name,
              method: method.name,
              stepDef: stepDef.pattern,
              severity: 'high',
              message: `Context "${locatorContext}" in locator/method not mentioned in step definition`,
              suggestion: `Update step definition to include context: "${stepDef.pattern.replace(/button/, `${locatorContext} button`)}"`,
            };
            contextMismatches.push(issue);
            issues.push(issue);
          }
        }
      }
    }

    // 6. Check for unused methods
    for (const method of methods) {
      const hasStepDef = stepDefs.some(sd => 
        sd.method === method.name || 
        sd.method.toLowerCase() === method.name.toLowerCase()
      );
      
      if (!hasStepDef) {
        const issue: FlowIssue = {
          type: 'unused_method',
          method: method.name,
          severity: 'medium',
          message: `Method "${method.name}" is not linked to any step definition`,
          suggestion: `Add step definition for this method or remove unused method`,
        };
        unusedMethods.push(issue);
        issues.push(issue);
      }
    }

    return {
      issues,
      missingLinks,
      contextMismatches,
      namingInconsistencies,
      unusedLocators,
      unusedMethods,
    };
  }

  /**
   * Check if feature step matches step definition pattern
   */
  private matchesStepPattern(featureStep: string, stepDefPattern: string): boolean {
    // Simple pattern matching (can be enhanced)
    const normalizedFeature = featureStep.toLowerCase().trim();
    const normalizedPattern = stepDefPattern.toLowerCase()
      .replace(/@when\(|@given\(|@then\(|["']/gi, '')
      .replace(/\{[^}]+\}/g, '.*')
      .trim();
    
    const regex = new RegExp('^' + normalizedPattern.replace(/\s+/g, '\\s+') + '$', 'i');
    return regex.test(normalizedFeature);
  }

  /**
   * Extract words from string
   */
  private extractWords(str: string): string[] {
    return str
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w.toLowerCase());
  }

  /**
   * Check if two word arrays have common words
   */
  private hasCommonWords(words1: string[], words2: string[]): boolean {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    for (const word of set1) {
      if (set2.has(word) && word.length > 2) { // Ignore short words
        return true;
      }
    }
    return false;
  }

  /**
   * Extract context from name (e.g., "rightSidebarButton" → "right sidebar")
   */
  private extractContext(name: string): string {
    // Extract descriptive words (skip common words like "button", "click", etc.)
    const commonWords = new Set(['button', 'click', 'input', 'field', 'link', 'text', 'element', 'get', 'set', 'is', 'has']);
    const words = this.extractWords(name);
    const contextWords = words.filter(w => !commonWords.has(w) && w.length > 2);
    return contextWords.join(' ');
  }
}



