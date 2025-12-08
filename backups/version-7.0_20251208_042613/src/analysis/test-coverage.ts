/**
 * Test Coverage Analysis
 * Analyzes test coverage and identifies missing test cases
 */

import { CodeSymbol } from '../parser/types.js';

export interface CoverageMetrics {
  lineCoverage: number;
  branchCoverage: number;
  methodCoverage: number;
}

export interface MissingTest {
  file: string;
  method: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  reason: string;
  suggestion: string;
}

export interface EdgeCase {
  file: string;
  method: string;
  missing: string;
  suggestion: string;
}

export class TestCoverageAnalyzer {
  /**
   * Analyze test coverage from symbols
   * This is a basic implementation - can be enhanced with JaCoCo integration
   */
  analyzeCoverage(
    sourceSymbols: CodeSymbol[],
    testSymbols: CodeSymbol[]
  ): {
    coverage: CoverageMetrics;
    missingTests: MissingTest[];
    edgeCases: EdgeCase[];
  } {
    // Calculate coverage (simplified - would use JaCoCo report in full implementation)
    const coverage = this.calculateCoverage(sourceSymbols, testSymbols);
    
    // Find missing tests
    const missingTests = this.findMissingTests(sourceSymbols, testSymbols);
    
    // Find missing edge cases
    const edgeCases = this.findMissingEdgeCases(sourceSymbols, testSymbols);

    return {
      coverage,
      missingTests,
      edgeCases
    };
  }

  /**
   * Calculate coverage metrics
   * Simplified version - full implementation would parse JaCoCo XML
   */
  private calculateCoverage(sourceSymbols: CodeSymbol[], testSymbols: CodeSymbol[]): CoverageMetrics {
    // Filter source methods (exclude test files)
    // FIX: Include both 'method' and 'function' types (TypeScript/JavaScript uses 'function')
    const sourceMethods = sourceSymbols.filter(s => 
      (s.type === 'method' || s.type === 'function') && 
      !this.isTestFile(s.file)
    );
    
    // Filter test methods (only test files)
    // FIX: Include both 'method' and 'function' types
    const testMethods = testSymbols.filter(s => 
      (s.type === 'method' || s.type === 'function') && 
      this.isTestFile(s.file)
    );

    if (sourceMethods.length === 0) {
      // No source methods to test
      return {
        lineCoverage: 0,
        branchCoverage: 0,
        methodCoverage: 0
      };
    }

    // Simple heuristic: check if test methods exist for source methods
    let coveredMethods = 0;
    for (const sourceMethod of sourceMethods) {
      const methodName = sourceMethod.name.toLowerCase();
      const hasTest = testMethods.some(testMethod => {
        const testMethodName = testMethod.name.toLowerCase();
        const testCode = (testMethod.code || '').toLowerCase();
        
        // Check various test naming patterns
        // FIX: Also check test description/code for method name (for Playwright/Jest)
        return testMethodName.includes(methodName) ||
               testMethodName.includes('test' + methodName) ||
               testMethodName.includes('test_' + methodName) ||
               testMethodName.includes('should' + methodName.charAt(0).toUpperCase() + methodName.slice(1)) ||
               testCode.includes(methodName) || // NEW: Check if test code mentions method name
               testCode.includes('test(' + methodName) || // NEW: Check test() calls
               testCode.includes('it(' + methodName) || // NEW: Check it() calls
               (testMethodName === 'test' && testCode.includes(methodName)) || // Generic test but mentions method
               (testMethodName.startsWith('it(') && testCode.includes(methodName)) || // Jest/Vitest with method name
               (testMethodName.startsWith('describe(') && testCode.includes(methodName)); // Test suite with method
      });
      if (hasTest) coveredMethods++;
    }

    const methodCoverage = (coveredMethods / sourceMethods.length) * 100;

    // Approximate line and branch coverage (would use JaCoCo in full implementation)
    const lineCoverage = methodCoverage * 0.8; // Approximation
    const branchCoverage = methodCoverage * 0.7; // Approximation

    return {
      lineCoverage: Math.round(lineCoverage * 10) / 10,
      branchCoverage: Math.round(branchCoverage * 10) / 10,
      methodCoverage: Math.round(methodCoverage * 10) / 10
    };
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filepath: string): boolean {
    const testPatterns = [
      /test/i,
      /spec/i,
      /__tests__/i,
      /\.test\./i,
      /\.spec\./i,
      /test-.*\./i,
      /.*-test\./i,
      /.*-spec\./i,
    ];
    
    return testPatterns.some(pattern => pattern.test(filepath));
  }

  /**
   * Find methods without tests
   */
  private findMissingTests(sourceSymbols: CodeSymbol[], testSymbols: CodeSymbol[]): MissingTest[] {
    const missing: MissingTest[] = [];
    // FIX: Include both 'method' and 'function' types
    const sourceMethods = sourceSymbols.filter(s => 
      (s.type === 'method' || s.type === 'function') && 
      !this.isTestFile(s.file)
    );
    // FIX: Include both 'method' and 'function' types, use isTestFile() consistently
    const testMethods = testSymbols.filter(s => 
      (s.type === 'method' || s.type === 'function') && 
      this.isTestFile(s.file)
    );

    for (const sourceMethod of sourceMethods) {
      // Skip private methods (usually tested indirectly)
      if (sourceMethod.visibility === 'private') continue;

      const methodName = sourceMethod.name;
      const hasTest = testMethods.some(testMethod => 
        testMethod.name.toLowerCase().includes(methodName.toLowerCase()) ||
        testMethod.name.toLowerCase().includes('test' + methodName.toLowerCase()) ||
        testMethod.name.toLowerCase().includes(methodName.toLowerCase() + 'test')
      );

      if (!hasTest) {
        // Determine severity
        let severity: 'high' | 'medium' | 'low' = 'medium';
        if (sourceMethod.visibility === 'public') {
          severity = 'high';
        } else if (sourceMethod.name.toLowerCase().includes('critical') ||
                   sourceMethod.name.toLowerCase().includes('important')) {
          severity = 'high';
        }

        missing.push({
          file: sourceMethod.file,
          method: methodName,
          line: sourceMethod.startLine,
          severity,
          reason: `No test found for ${sourceMethod.visibility || 'package'} method ${methodName}`,
          suggestion: `Create test method: @Test\npublic void test${methodName.charAt(0).toUpperCase() + methodName.slice(1)}() {\n    // Test implementation\n}`
        });
      }
    }

    return missing;
  }

  /**
   * Find missing edge cases
   */
  private findMissingEdgeCases(sourceSymbols: CodeSymbol[], testSymbols: CodeSymbol[]): EdgeCase[] {
    const edgeCases: EdgeCase[] = [];

    for (const symbol of sourceSymbols) {
      if (symbol.type === 'method' && symbol.code) {
        // Check for null handling
        if (symbol.parameters && symbol.parameters.length > 0) {
          const hasNullCheck = /if\s*\(\s*\w+\s*==\s*null|if\s*\(\s*null\s*==\s*\w+|Objects\.isNull|Objects\.nonNull/.test(symbol.code);
          if (!hasNullCheck) {
            edgeCases.push({
              file: symbol.file,
              method: symbol.name,
              missing: 'Null input handling',
              suggestion: `Add test for null input:\n@Test(expected = NullPointerException.class)\npublic void test${symbol.name}WithNullInput() {\n    // Test with null parameter\n}`
            });
          }
        }

        // Check for empty collection handling
        if (symbol.code.includes('List') || symbol.code.includes('Collection') || symbol.code.includes('Array')) {
          edgeCases.push({
            file: symbol.file,
            method: symbol.name,
            missing: 'Empty collection handling',
            suggestion: `Add test for empty collection:\n@Test\npublic void test${symbol.name}WithEmptyCollection() {\n    // Test with empty list/collection\n}`
          });
        }

        // Check for boundary conditions
        if (symbol.code.includes('>') || symbol.code.includes('<') || symbol.code.includes('>=') || symbol.code.includes('<=')) {
          edgeCases.push({
            file: symbol.file,
            method: symbol.name,
            missing: 'Boundary condition testing',
            suggestion: `Add test for boundary conditions:\n@Test\npublic void test${symbol.name}BoundaryConditions() {\n    // Test at boundaries (0, -1, max, min)\n}`
          });
        }
      }
    }

    return edgeCases;
  }

  /**
   * Parse JaCoCo XML report (for future integration)
   */
  async parseJacocoReport(xmlPath: string): Promise<CoverageMetrics> {
    // TODO: Implement JaCoCo XML parsing
    // This would parse the JaCoCo XML report and extract actual coverage metrics
    throw new Error('JaCoCo integration not yet implemented. Using basic analysis.');
  }
}







