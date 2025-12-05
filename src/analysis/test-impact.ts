/**
 * Test Impact Analysis
 * Predicts which tests will fail and analyzes test coverage impact
 */

import { CodeSymbol, CallRelationship } from '../parser/types.js';
import { CodebaseIndexer } from '../indexer/indexer.js';

export interface TestImpact {
  testFile: string;
  testMethod: string;
  probability: 'high' | 'medium' | 'low';
  reason: string;
  affectedCode: string[];
  suggestion: string;
}

export interface TestCoverageImpact {
  affectedTests: TestImpact[];
  coverageChange: number; // Percentage change
  newCoverage: number;
  missingCoverage: string[]; // Files/methods without tests
}

export class TestImpactAnalyzer {
  private indexer: CodebaseIndexer;

  constructor(indexer: CodebaseIndexer) {
    this.indexer = indexer;
  }

  /**
   * Analyze test impact for PR changes
   */
  analyzeTestImpact(
    changedSymbols: CodeSymbol[],
    testFiles: string[]
  ): TestCoverageImpact {
    const affectedTests: TestImpact[] = [];
    const missingCoverage: string[] = [];

    // Find tests that might be affected
    for (const symbol of changedSymbols) {
      // Find tests that test this symbol
      const relatedTests = this.findRelatedTests(symbol, testFiles);
      
      for (const test of relatedTests) {
        affectedTests.push({
          testFile: test.file,
          testMethod: test.method,
          probability: this.calculateFailureProbability(symbol, test),
          reason: this.getFailureReason(symbol, test),
          affectedCode: [symbol.name],
          suggestion: this.getTestUpdateSuggestion(symbol, test),
        });
      }

      // Check if symbol has tests
      if (relatedTests.length === 0 && this.shouldHaveTests(symbol)) {
        missingCoverage.push(`${symbol.file}::${symbol.name}`);
      }
    }

    // Calculate coverage change
    const coverageChange = this.calculateCoverageChange(changedSymbols, affectedTests);
    const newCoverage = this.calculateNewCoverage(changedSymbols, testFiles);

    return {
      affectedTests,
      coverageChange,
      newCoverage,
      missingCoverage,
    };
  }

  /**
   * Predict which tests will fail
   */
  predictFailingTests(changedSymbols: CodeSymbol[]): TestImpact[] {
    const predictions: TestImpact[] = [];
    const index = this.indexer.getIndex();

    for (const symbol of changedSymbols) {
      // Find all tests that might call this symbol
      const potentialTests = this.findPotentialTests(symbol, index);

      for (const test of potentialTests) {
        // Check if test will fail based on changes
        if (this.willTestFail(symbol, test)) {
          predictions.push({
            testFile: test.file,
            testMethod: test.method,
            probability: 'high',
            reason: `Test calls ${symbol.name} which has been modified`,
            affectedCode: [symbol.name],
            suggestion: `Update test to match new ${symbol.signature || 'signature'}`,
          });
        }
      }
    }

    return predictions;
  }

  /**
   * Find tests related to a symbol
   */
  private findRelatedTests(symbol: CodeSymbol, testFiles: string[]): Array<{ file: string; method: string }> {
    const related: Array<{ file: string; method: string }> = [];
    const symbolName = symbol.name.toLowerCase();

    for (const testFile of testFiles) {
      // Simple heuristic: test files often contain symbol name
      if (testFile.toLowerCase().includes(symbolName.replace('service', '').replace('manager', ''))) {
        related.push({
          file: testFile,
          method: `test${symbol.name}`, // Common test naming
        });
      }
    }

    return related;
  }

  /**
   * Find potential tests using call graph
   */
  private findPotentialTests(symbol: CodeSymbol, index: any): Array<{ file: string; method: string }> {
    const tests: Array<{ file: string; method: string }> = [];
    const callGraph = index.callGraph || [];

    // Find callers that might be tests
    for (const call of callGraph) {
      if (call.callee === symbol.name) {
        const callerFile = call.file;
        if (this.isTestFile(callerFile)) {
          tests.push({
            file: callerFile,
            method: call.caller,
          });
        }
      }
    }

    return tests;
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filepath: string): boolean {
    return filepath.includes('test') ||
           filepath.includes('spec') ||
           filepath.endsWith('Test.java') ||
           filepath.endsWith('Tests.java') ||
           !!filepath.match(/\.test\.(js|ts|py)$/);
  }

  /**
   * Calculate failure probability
   */
  private calculateFailureProbability(symbol: CodeSymbol, test: { file: string; method: string }): 'high' | 'medium' | 'low' {
    // High: signature changed, visibility reduced
    if (symbol.signature && symbol.visibility === 'private') {
      return 'high';
    }
    
    // Medium: return type changed
    if (symbol.returnType) {
      return 'medium';
    }
    
    // Low: internal changes only
    return 'low';
  }

  /**
   * Get failure reason
   */
  private getFailureReason(symbol: CodeSymbol, test: { file: string; method: string }): string {
    if (symbol.signature) {
      return `Method signature changed, test ${test.method} may fail`;
    }
    if (symbol.visibility === 'private') {
      return `Method visibility reduced, test ${test.method} cannot access it`;
    }
    return `Code changes may affect test ${test.method}`;
  }

  /**
   * Get test update suggestion
   */
  private getTestUpdateSuggestion(symbol: CodeSymbol, test: { file: string; method: string }): string {
    if (symbol.signature) {
      return `Update ${test.method} to match new signature: ${symbol.signature}`;
    }
    return `Review and update ${test.method} to ensure it still tests the modified code correctly`;
  }

  /**
   * Check if test will fail
   */
  private willTestFail(symbol: CodeSymbol, test: { file: string; method: string }): boolean {
    // High probability of failure if:
    // 1. Signature changed
    // 2. Visibility reduced
    // 3. Return type changed
    return !!symbol.signature || symbol.visibility === 'private' || !!symbol.returnType;
  }

  /**
   * Check if symbol should have tests
   */
  private shouldHaveTests(symbol: CodeSymbol): boolean {
    // Public methods should have tests
    if (symbol.visibility === 'public') {
      return true;
    }
    
    // Methods with "Service", "Manager", "Handler" in name
    const name = symbol.name.toLowerCase();
    return name.includes('service') || name.includes('manager') || name.includes('handler');
  }

  /**
   * Calculate coverage change
   */
  private calculateCoverageChange(changedSymbols: CodeSymbol[], affectedTests: TestImpact[]): number {
    // Simple calculation: affected tests / total changed symbols
    if (changedSymbols.length === 0) return 0;
    return (affectedTests.length / changedSymbols.length) * 100;
  }

  /**
   * Calculate new coverage
   */
  private calculateNewCoverage(changedSymbols: CodeSymbol[], testFiles: string[]): number {
    // Estimate coverage based on test files found
    const symbolsWithTests = changedSymbols.filter(s => {
      const relatedTests = this.findRelatedTests(s, testFiles);
      return relatedTests.length > 0;
    });

    if (changedSymbols.length === 0) return 100;
    return (symbolsWithTests.length / changedSymbols.length) * 100;
  }
}

