/**
 * Documentation Analysis
 * Reviews documentation quality, missing JavaDoc, API documentation
 */

import { CodeSymbol } from '../parser/types.js';

export interface DocumentationIssue {
  file: string;
  method?: string;
  class?: string;
  type: 'missing_javadoc' | 'incomplete_javadoc' | 'missing_param' | 'missing_return' | 'missing_exception' | 'outdated_doc';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface DocumentationReport {
  issues: DocumentationIssue[];
  missingJavaDoc: DocumentationIssue[];
  incompleteJavaDoc: DocumentationIssue[];
  qualityScore: number; // 0-100
  coverage: {
    classes: number; // percentage
    methods: number; // percentage
    publicMethods: number; // percentage
  };
}

export class DocumentationAnalyzer {
  /**
   * Analyze documentation completeness
   */
  analyzeDocumentation(symbols: CodeSymbol[], codeContent: string): DocumentationReport {
    const issues: DocumentationIssue[] = [];
    const missingJavaDoc: DocumentationIssue[] = [];
    const incompleteJavaDoc: DocumentationIssue[] = [];

    let totalClasses = 0;
    let documentedClasses = 0;
    let totalMethods = 0;
    let documentedMethods = 0;
    let totalPublicMethods = 0;
    let documentedPublicMethods = 0;

    for (const symbol of symbols) {
      if (symbol.type === 'class') {
        totalClasses++;
        const hasJavaDoc = this.hasJavaDoc(symbol, codeContent);
        if (hasJavaDoc) {
          documentedClasses++;
        } else {
          missingJavaDoc.push({
            file: symbol.file,
            class: symbol.name,
            type: 'missing_javadoc',
            severity: 'medium',
            message: `Class ${symbol.name} is missing JavaDoc`,
            suggestion: 'Add JavaDoc comment describing the class purpose and usage',
          });
          issues.push({
            file: symbol.file,
            class: symbol.name,
            type: 'missing_javadoc',
            severity: 'medium',
            message: `Class ${symbol.name} is missing JavaDoc`,
            suggestion: 'Add JavaDoc comment describing the class purpose and usage',
          });
        }
      }

      if (symbol.type === 'method') {
        totalMethods++;
        const isPublic = symbol.visibility === 'public' || !symbol.visibility;
        
        if (isPublic) {
          totalPublicMethods++;
        }

        const javaDocInfo = this.analyzeMethodJavaDoc(symbol, codeContent);
        
        if (javaDocInfo.hasJavaDoc) {
          documentedMethods++;
          if (isPublic) {
            documentedPublicMethods++;
          }

          // Check for incomplete JavaDoc
          if (!javaDocInfo.hasDescription || !javaDocInfo.hasParams || !javaDocInfo.hasReturn) {
            incompleteJavaDoc.push({
              file: symbol.file,
              method: symbol.name,
              type: 'incomplete_javadoc',
              severity: 'low',
              message: `Method ${symbol.name} has incomplete JavaDoc`,
              suggestion: 'Add missing @param, @return, or description',
            });
            issues.push({
              file: symbol.file,
              method: symbol.name,
              type: 'incomplete_javadoc',
              severity: 'low',
              message: `Method ${symbol.name} has incomplete JavaDoc`,
              suggestion: 'Add missing @param, @return, or description',
            });
          }

          // Check for missing @param tags
          if (symbol.parameters && symbol.parameters.length > 0 && !javaDocInfo.hasParams) {
            issues.push({
              file: symbol.file,
              method: symbol.name,
              type: 'missing_param',
              severity: 'low',
              message: `Method ${symbol.name} has parameters but missing @param tags`,
              suggestion: `Add @param tags for: ${symbol.parameters.map(p => p.name).join(', ')}`,
            });
          }

          // Check for missing @return tag
          if (symbol.returnType && symbol.returnType !== 'void' && !javaDocInfo.hasReturn) {
            issues.push({
              file: symbol.file,
              method: symbol.name,
              type: 'missing_return',
              severity: 'low',
              message: `Method ${symbol.name} returns ${symbol.returnType} but missing @return tag`,
              suggestion: 'Add @return tag describing the return value',
            });
          }
        } else {
          // Missing JavaDoc for public methods is more critical
          if (isPublic) {
            missingJavaDoc.push({
              file: symbol.file,
              method: symbol.name,
              type: 'missing_javadoc',
              severity: 'medium',
              message: `Public method ${symbol.name} is missing JavaDoc`,
              suggestion: 'Add JavaDoc with description, @param, and @return tags',
            });
            issues.push({
              file: symbol.file,
              method: symbol.name,
              type: 'missing_javadoc',
              severity: 'medium',
              message: `Public method ${symbol.name} is missing JavaDoc`,
              suggestion: 'Add JavaDoc with description, @param, and @return tags',
            });
          } else {
            // Private methods are less critical
            issues.push({
              file: symbol.file,
              method: symbol.name,
              type: 'missing_javadoc',
              severity: 'low',
              message: `Method ${symbol.name} is missing JavaDoc`,
              suggestion: 'Consider adding JavaDoc for complex methods',
            });
          }
        }
      }
    }

    // Calculate coverage percentages
    const classCoverage = totalClasses > 0 ? (documentedClasses / totalClasses) * 100 : 100;
    const methodCoverage = totalMethods > 0 ? (documentedMethods / totalMethods) * 100 : 100;
    const publicMethodCoverage = totalPublicMethods > 0 ? (documentedPublicMethods / totalPublicMethods) * 100 : 100;

    // Calculate quality score (weighted average)
    const qualityScore = (classCoverage * 0.3 + methodCoverage * 0.3 + publicMethodCoverage * 0.4);

    return {
      issues,
      missingJavaDoc,
      incompleteJavaDoc,
      qualityScore: Math.round(qualityScore),
      coverage: {
        classes: Math.round(classCoverage),
        methods: Math.round(methodCoverage),
        publicMethods: Math.round(publicMethodCoverage),
      },
    };
  }

  /**
   * Check if symbol has JavaDoc
   */
  private hasJavaDoc(symbol: CodeSymbol, codeContent: string): boolean {
    // Look for JavaDoc comment before the symbol
    const lines = codeContent.split('\n');
    const symbolLine = symbol.startLine - 1; // Convert to 0-based index
    
    // Check previous lines for JavaDoc (/** ... */)
    for (let i = symbolLine - 1; i >= Math.max(0, symbolLine - 10); i--) {
      const line = lines[i].trim();
      if (line.includes('/**')) {
        return true;
      }
      if (line.includes('*/') || line.includes('*')) {
        continue; // Part of JavaDoc
      }
      if (line && !line.startsWith('*') && !line.startsWith('/')) {
        break; // Not JavaDoc
      }
    }
    
    return false;
  }

  /**
   * Analyze method JavaDoc completeness
   */
  private analyzeMethodJavaDoc(symbol: CodeSymbol, codeContent: string): {
    hasJavaDoc: boolean;
    hasDescription: boolean;
    hasParams: boolean;
    hasReturn: boolean;
  } {
    const hasJavaDoc = this.hasJavaDoc(symbol, codeContent);
    
    if (!hasJavaDoc) {
      return { hasJavaDoc: false, hasDescription: false, hasParams: false, hasReturn: false };
    }

    // Extract JavaDoc content
    const lines = codeContent.split('\n');
    const symbolLine = symbol.startLine - 1;
    let javaDocContent = '';
    let inJavaDoc = false;

    // Search backwards from symbol line for JavaDoc
    for (let i = symbolLine - 1; i >= Math.max(0, symbolLine - 20); i--) {
      const line = lines[i].trim();
      if (line.includes('*/')) {
        // End of JavaDoc found, start collecting
        inJavaDoc = true;
        continue;
      }
      if (inJavaDoc) {
        javaDocContent = line + '\n' + javaDocContent;
        if (line.includes('/**')) {
          // Start of JavaDoc found, stop
          break;
        }
      }
    }
    
    // Also check if JavaDoc is on same line or after
    if (!inJavaDoc && symbolLine >= 0 && symbolLine < lines.length) {
      // Check if there's JavaDoc right before
      for (let i = symbolLine - 1; i >= Math.max(0, symbolLine - 5); i--) {
        const line = lines[i].trim();
        if (line.includes('/**')) {
          // Found JavaDoc start, collect until */
          for (let j = i; j < symbolLine && j < lines.length; j++) {
            javaDocContent += lines[j] + '\n';
            if (lines[j].includes('*/')) break;
          }
          break;
        }
      }
    }

    const hasDescription = javaDocContent.length > 20; // Has meaningful description
    const hasParams = /@param\s+\w+/.test(javaDocContent);
    const hasReturn = /@return/.test(javaDocContent);

    return { hasJavaDoc: true, hasDescription, hasParams, hasReturn };
  }
}




