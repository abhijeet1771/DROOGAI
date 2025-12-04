/**
 * Code Complexity Metrics
 * Calculates cyclomatic complexity, cognitive complexity, and maintainability index
 */

import { CodeSymbol } from '../parser/types.js';

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  linesOfCode: number;
}

export interface ComplexityHotspot {
  file: string;
  method: string;
  line: number;
  complexity: number;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export class ComplexityAnalyzer {
  /**
   * Calculate complexity metrics for a method
   */
  calculateComplexity(symbol: CodeSymbol): ComplexityMetrics {
    if (!symbol.code) {
      return {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        maintainabilityIndex: 100,
        linesOfCode: 0
      };
    }

    const linesOfCode = symbol.endLine - symbol.startLine;
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(symbol.code);
    const cognitiveComplexity = this.calculateCognitiveComplexity(symbol.code);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode
    );

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      maintainabilityIndex,
      linesOfCode
    };
  }

  /**
   * Find complexity hotspots
   */
  findHotspots(symbols: CodeSymbol[]): ComplexityHotspot[] {
    const hotspots: ComplexityHotspot[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'method') {
        const metrics = this.calculateComplexity(symbol);
        
        // High complexity threshold
        if (metrics.cyclomaticComplexity > 15 || metrics.cognitiveComplexity > 20) {
          hotspots.push({
            file: symbol.file,
            method: symbol.name,
            line: symbol.startLine,
            complexity: Math.max(metrics.cyclomaticComplexity, metrics.cognitiveComplexity),
            severity: metrics.cyclomaticComplexity > 25 || metrics.cognitiveComplexity > 30 ? 'high' : 'medium',
            suggestion: `Method has high complexity (Cyclomatic: ${metrics.cyclomaticComplexity}, Cognitive: ${metrics.cognitiveComplexity}). Consider refactoring into smaller methods.`
          });
        }
      }
    }

    return hotspots.sort((a, b) => b.complexity - a.complexity);
  }

  /**
   * Calculate cyclomatic complexity
   * Complexity = 1 + number of decision points
   */
  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1; // Base complexity

    // Decision points increase complexity
    const decisionPatterns = [
      /\bif\s*\(/g,           // if statements
      /\belse\s+if\s*\(/g,    // else if
      /\bwhile\s*\(/g,        // while loops
      /\bfor\s*\(/g,          // for loops
      /\bswitch\s*\(/g,       // switch statements
      /\bcatch\s*\(/g,        // catch blocks
      /\bcase\s+/g,           // case statements (each adds 1)
      /\?\s*[^:]+:/g,         // ternary operators
      /\|\||&&/g,             // logical operators (each adds 1)
    ];

    for (const pattern of decisionPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Calculate cognitive complexity
   * Similar to cyclomatic but penalizes nesting
   */
  private calculateCognitiveComplexity(code: string): number {
    let complexity = 0;
    let nestingLevel = 0;

    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Increase nesting for control structures
      if (/\bif\s*\(|else\s*\{|while\s*\(|for\s*\(|switch\s*\(|catch\s*\(/.test(trimmed)) {
        complexity += 1 + nestingLevel;
        nestingLevel++;
      }
      
      // Decrease nesting for closing braces
      if (trimmed === '}' || trimmed.startsWith('}')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      // Logical operators add complexity
      if (/\|\||&&/.test(trimmed)) {
        complexity += 1;
      }
    }

    return complexity;
  }

  /**
   * Calculate maintainability index
   * MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
   * Simplified version
   */
  private calculateMaintainabilityIndex(
    cyclomaticComplexity: number,
    cognitiveComplexity: number,
    linesOfCode: number
  ): number {
    if (linesOfCode === 0) return 100;

    // Simplified formula
    const halsteadVolume = linesOfCode * 10; // Approximation
    const mi = 171 
      - 5.2 * Math.log(halsteadVolume) 
      - 0.23 * cyclomaticComplexity 
      - 16.2 * Math.log(linesOfCode);

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, mi));
  }

  /**
   * Get average complexity for a file
   */
  getFileComplexity(symbols: CodeSymbol[], file: string): ComplexityMetrics {
    const fileSymbols = symbols.filter(s => s.file === file && s.type === 'method');
    
    if (fileSymbols.length === 0) {
      return {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        maintainabilityIndex: 100,
        linesOfCode: 0
      };
    }

    let totalCyclomatic = 0;
    let totalCognitive = 0;
    let totalLines = 0;

    for (const symbol of fileSymbols) {
      const metrics = this.calculateComplexity(symbol);
      totalCyclomatic += metrics.cyclomaticComplexity;
      totalCognitive += metrics.cognitiveComplexity;
      totalLines += metrics.linesOfCode;
    }

    const avgCyclomatic = totalCyclomatic / fileSymbols.length;
    const avgCognitive = totalCognitive / fileSymbols.length;
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      avgCyclomatic,
      avgCognitive,
      totalLines / fileSymbols.length
    );

    return {
      cyclomaticComplexity: avgCyclomatic,
      cognitiveComplexity: avgCognitive,
      maintainabilityIndex,
      linesOfCode: totalLines
    };
  }
}



