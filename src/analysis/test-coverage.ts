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
    // Find test files
    const testFiles = testSymbols.filter(s => 
      s.file.toLowerCase().includes('test') || 
      s.file.toLowerCase().includes('spec')
    );

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
    const sourceMethods = sourceSymbols.filter(s => s.type === 'method');
    const testMethods = testSymbols.filter(s => 
      s.type === 'method' && 
      (s.file.toLowerCase().includes('test') || s.file.toLowerCase().includes('spec'))
    );

    // Simple heuristic: check if test methods exist for source methods
    let coveredMethods = 0;
    for (const sourceMethod of sourceMethods) {
      const methodName = sourceMethod.name;
      const hasTest = testMethods.some(testMethod => 
        testMethod.name.toLowerCase().includes(methodName.toLowerCase()) ||
        testMethod.name.toLowerCase().includes('test' + methodName.toLowerCase())
      );
      if (hasTest) coveredMethods++;
    }

    const methodCoverage = sourceMethods.length > 0 
      ? (coveredMethods / sourceMethods.length) * 100 
      : 0;

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
   * Find methods without tests
   */
  private findMissingTests(sourceSymbols: CodeSymbol[], testSymbols: CodeSymbol[]): MissingTest[] {
    const missing: MissingTest[] = [];
    const sourceMethods = sourceSymbols.filter(s => s.type === 'method');
    const testMethods = testSymbols.filter(s => 
      s.type === 'method' && 
      (s.file.toLowerCase().includes('test') || s.file.toLowerCase().includes('spec'))
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




