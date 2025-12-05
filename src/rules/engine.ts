/**
 * Architecture rules engine
 * Enforces coding standards and architecture rules
 */

import { CodeSymbol, ParsedFile } from '../parser/types.js';

export interface ArchitectureViolation {
  rule: string;
  severity: 'high' | 'medium' | 'low';
  file: string;
  line: number;
  message: string;
  suggestion?: string;
}

export interface RuleConfig {
  enforceImportRules: boolean;
  enforceNamingConventions: boolean;
  enforceModuleIsolation: boolean;
  allowedImports?: string[];
  forbiddenImports?: string[];
  namingPatterns?: {
    class?: RegExp;
    method?: RegExp;
    variable?: RegExp;
  };
}

export class ArchitectureRulesEngine {
  private config: RuleConfig;

  constructor(config: Partial<RuleConfig> = {}) {
    this.config = {
      enforceImportRules: config.enforceImportRules ?? true,
      enforceNamingConventions: config.enforceNamingConventions ?? true,
      enforceModuleIsolation: config.enforceModuleIsolation ?? false,
      allowedImports: config.allowedImports,
      forbiddenImports: config.forbiddenImports,
      namingPatterns: config.namingPatterns,
    };
  }

  /**
   * Check architecture rules for parsed files
   */
  checkRules(parsedFiles: ParsedFile[]): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    for (const file of parsedFiles) {
      // Check naming conventions
      if (this.config.enforceNamingConventions) {
        violations.push(...this.checkNamingConventions(file));
      }

      // Check import rules
      if (this.config.enforceImportRules) {
        violations.push(...this.checkImportRules(file));
      }

      // Check module isolation
      if (this.config.enforceModuleIsolation) {
        violations.push(...this.checkModuleIsolation(file));
      }
    }

    return violations;
  }

  /**
   * Check naming conventions
   */
  private checkNamingConventions(file: ParsedFile): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    for (const symbol of file.symbols) {
      // Check class naming (PascalCase)
      if (symbol.type === 'class') {
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(symbol.name)) {
          violations.push({
            rule: 'naming-class',
            severity: 'medium',
            file: symbol.file,
            line: symbol.startLine,
            message: `Class name "${symbol.name}" should be in PascalCase`,
            suggestion: `Rename to ${this.toPascalCase(symbol.name)}`,
          });
        }
      }

      // Check method naming (camelCase)
      if (symbol.type === 'method') {
        if (!/^[a-z][a-zA-Z0-9]*$/.test(symbol.name)) {
          violations.push({
            rule: 'naming-method',
            severity: 'low',
            file: symbol.file,
            line: symbol.startLine,
            message: `Method name "${symbol.name}" should be in camelCase`,
            suggestion: `Rename to ${this.toCamelCase(symbol.name)}`,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check import rules
   */
  private checkImportRules(file: ParsedFile): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    // Extract imports from file code (simplified)
    // In production, parse imports properly
    const code = file.symbols[0]?.code || '';
    const importLines = code.split('\n').filter(line => 
      line.trim().startsWith('import ') || line.trim().startsWith('package ')
    );

    for (const importLine of importLines) {
      // Check forbidden imports
      if (this.config.forbiddenImports) {
        for (const forbidden of this.config.forbiddenImports) {
          if (importLine.includes(forbidden)) {
            violations.push({
              rule: 'import-forbidden',
              severity: 'high',
              file: file.filepath,
              line: 1, // Approximate
              message: `Forbidden import detected: ${forbidden}`,
              suggestion: `Remove import of ${forbidden}`,
            });
          }
        }
      }

      // Check allowed imports (if specified)
      if (this.config.allowedImports && this.config.allowedImports.length > 0) {
        const importMatch = importLine.match(/import\s+([^;]+)/);
        if (importMatch) {
          const importPath = importMatch[1].trim();
          const isAllowed = this.config.allowedImports.some(allowed => 
            importPath.startsWith(allowed)
          );
          
          if (!isAllowed) {
            violations.push({
              rule: 'import-not-allowed',
              severity: 'medium',
              file: file.filepath,
              line: 1,
              message: `Import not in allowed list: ${importPath}`,
              suggestion: `Use allowed imports or add ${importPath} to allowed list`,
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check module isolation
   */
  private checkModuleIsolation(file: ParsedFile): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    // Extract package/namespace
    const code = file.symbols[0]?.code || '';
    const packageMatch = code.match(/package\s+([^;]+)/);
    
    if (packageMatch) {
      const packageName = packageMatch[1].trim();
      const packageParts = packageName.split('.');

      // Check if file is accessing packages outside its module
      // This is a simplified check - in production, analyze actual imports
      for (const symbol of file.symbols) {
        if (symbol.code) {
          // Look for cross-module references
          // This would need proper AST analysis in production
        }
      }
    }

    return violations;
  }

  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/[-_]/g, '');
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).replace(/[-_]/g, '');
  }
}





