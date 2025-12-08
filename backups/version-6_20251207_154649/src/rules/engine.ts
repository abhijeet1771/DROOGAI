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
   * Check architecture rules for parsed files (enhanced with SOLID principles)
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

      // Check SOLID principles
      violations.push(...this.checkSOLIDPrinciples(file));

      // Check layer violations
      violations.push(...this.checkLayerViolations(file));

      // Check dependency direction
      violations.push(...this.checkDependencyDirection(file, parsedFiles));
    }

    return violations;
  }

  /**
   * Check SOLID principles violations
   */
  private checkSOLIDPrinciples(file: ParsedFile): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];
    const code = this.getFileCode(file);

    // Single Responsibility Principle (SRP)
    violations.push(...this.checkSingleResponsibility(file, code));

    // Open/Closed Principle (OCP) - hard to detect statically, but check for switch/if chains
    violations.push(...this.checkOpenClosedPrinciple(file, code));

    // Liskov Substitution Principle (LSP) - check inheritance patterns
    violations.push(...this.checkLiskovSubstitution(file));

    // Interface Segregation Principle (ISP) - check interface usage
    violations.push(...this.checkInterfaceSegregation(file, code));

    // Dependency Inversion Principle (DIP) - check for concrete dependencies
    violations.push(...this.checkDependencyInversion(file, code));

    return violations;
  }

  /**
   * Check Single Responsibility Principle
   */
  private checkSingleResponsibility(file: ParsedFile, code: string): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    // Count responsibilities per class
    for (const symbol of file.symbols) {
      if (symbol.type === 'class' && symbol.code) {
        const responsibilities = this.countResponsibilities(symbol.code);
        
        if (responsibilities > 3) {
          violations.push({
            rule: 'SOLID-SRP',
            severity: 'medium',
            file: symbol.file,
            line: symbol.startLine,
            message: `Class "${symbol.name}" has ${responsibilities} responsibilities - violates Single Responsibility Principle`,
            suggestion: 'Split into multiple classes, each with a single responsibility',
          });
        }
      }
    }

    // Check for God Object (too many methods)
    for (const symbol of file.symbols) {
      if (symbol.type === 'class') {
        const methodsInClass = file.symbols.filter(s => 
          s.type === 'method' && s.file === symbol.file
        ).length;

        if (methodsInClass > 15) {
          violations.push({
            rule: 'SOLID-SRP-GodObject',
            severity: 'high',
            file: symbol.file,
            line: symbol.startLine,
            message: `Class "${symbol.name}" has ${methodsInClass} methods - potential God Object`,
            suggestion: 'Consider splitting into smaller, focused classes',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Count responsibilities in a class
   */
  private countResponsibilities(classCode: string): number {
    let count = 0;
    const responsibilityKeywords = [
      'validate', 'parse', 'format', 'calculate', 'process', 'transform',
      'save', 'load', 'fetch', 'send', 'receive', 'render', 'display',
      'authenticate', 'authorize', 'encrypt', 'decrypt', 'log', 'notify',
    ];

    for (const keyword of responsibilityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\w*`, 'gi');
      if (regex.test(classCode)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check Open/Closed Principle
   */
  private checkOpenClosedPrinciple(file: ParsedFile, code: string): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    // Check for long switch/if-else chains (violates OCP)
    const switchPattern = /switch\s*\([^)]+\)\s*\{[^}]*case[^}]*case[^}]*case[^}]*case/;
    if (switchPattern.test(code)) {
      violations.push({
        rule: 'SOLID-OCP',
        severity: 'medium',
        file: file.filepath,
        line: 1,
        message: 'Long switch/if-else chain detected - violates Open/Closed Principle',
        suggestion: 'Use Strategy pattern or polymorphism to extend behavior without modification',
      });
    }

    return violations;
  }

  /**
   * Check Liskov Substitution Principle
   */
  private checkLiskovSubstitution(file: ParsedFile): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    // Check for classes that override methods with incompatible behavior
    // This is hard to detect statically, but we can flag suspicious patterns
    for (const symbol of file.symbols) {
      if (symbol.type === 'class' && symbol.extends) {
        // If class extends but has many overridden methods, might violate LSP
        const overriddenMethods = file.symbols.filter(s =>
          s.type === 'method' && s.file === symbol.file
        ).length;

        if (overriddenMethods > 5) {
          violations.push({
            rule: 'SOLID-LSP',
            severity: 'low',
            file: symbol.file,
            line: symbol.startLine,
            message: `Class "${symbol.name}" extends "${symbol.extends}" with ${overriddenMethods} methods - verify Liskov Substitution Principle`,
            suggestion: 'Ensure derived class can substitute base class without breaking behavior',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check Interface Segregation Principle
   */
  private checkInterfaceSegregation(file: ParsedFile, code: string): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    // Check for interfaces with too many methods (fat interface)
    for (const symbol of file.symbols) {
      if (symbol.type === 'interface') {
        const methodsInInterface = file.symbols.filter(s =>
          s.type === 'method' && s.file === symbol.file
        ).length;

        if (methodsInInterface > 10) {
          violations.push({
            rule: 'SOLID-ISP',
            severity: 'medium',
            file: symbol.file,
            line: symbol.startLine,
            message: `Interface "${symbol.name}" has ${methodsInInterface} methods - violates Interface Segregation Principle`,
            suggestion: 'Split into smaller, focused interfaces',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check Dependency Inversion Principle
   */
  private checkDependencyInversion(file: ParsedFile, code: string): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    // Check for concrete class dependencies instead of abstractions
    const concreteDependencyPatterns = [
      /new\s+(\w+Service|Repository|Dao|Manager)\s*\(/,
      /new\s+(\w+Controller|Handler)\s*\(/,
    ];

    for (const pattern of concreteDependencyPatterns) {
      const matches = code.matchAll(new RegExp(pattern, 'g'));
      for (const match of matches) {
        const className = match[1];
        // Check if it's a concrete class (not an interface)
        const isInterface = file.symbols.some(s => 
          s.type === 'interface' && s.name === className
        );

        if (!isInterface) {
          violations.push({
            rule: 'SOLID-DIP',
            severity: 'medium',
            file: file.filepath,
            line: this.getLineNumber(code, match.index || 0),
            message: `Direct instantiation of concrete class "${className}" - violates Dependency Inversion Principle`,
            suggestion: `Depend on abstraction (interface) instead. Use dependency injection.`,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check layer violations (Controller → Repository, etc.)
   */
  private checkLayerViolations(file: ParsedFile): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];
    const filepath = file.filepath.toLowerCase();
    const code = this.getFileCode(file);

    // Detect layer from file path
    const isController = filepath.includes('controller') || filepath.includes('resource') || filepath.includes('api');
    const isService = filepath.includes('service');
    const isRepository = filepath.includes('repository') || filepath.includes('dao') || filepath.includes('data');
    const isModel = filepath.includes('model') || filepath.includes('entity') || filepath.includes('dto');

    // Extract imports
    const imports = this.extractImports(code);

    // Controller should not access Repository directly
    if (isController) {
      const hasRepositoryImport = imports.some(imp =>
        imp.toLowerCase().includes('repository') ||
        imp.toLowerCase().includes('dao') ||
        imp.toLowerCase().includes('data')
      );

      if (hasRepositoryImport) {
        violations.push({
          rule: 'layer-violation',
          severity: 'high',
          file: file.filepath,
          line: 1,
          message: 'Controller directly accessing Repository/DAO - violates layered architecture',
          suggestion: 'Use Service layer between Controller and Repository',
        });
      }
    }

    // Service should not access Controller
    if (isService) {
      const hasControllerImport = imports.some(imp =>
        imp.toLowerCase().includes('controller') ||
        imp.toLowerCase().includes('resource')
      );

      if (hasControllerImport) {
        violations.push({
          rule: 'layer-violation',
          severity: 'high',
          file: file.filepath,
          line: 1,
          message: 'Service accessing Controller - wrong dependency direction',
          suggestion: 'Services should not depend on Controllers. Reverse the dependency.',
        });
      }
    }

    // Repository should not access Service
    if (isRepository) {
      const hasServiceImport = imports.some(imp =>
        imp.toLowerCase().includes('service')
      );

      if (hasServiceImport) {
        violations.push({
          rule: 'layer-violation',
          severity: 'high',
          file: file.filepath,
          line: 1,
          message: 'Repository accessing Service - wrong dependency direction',
          suggestion: 'Repository should not depend on Service layer',
        });
      }
    }

    return violations;
  }

  /**
   * Check dependency direction
   */
  private checkDependencyDirection(file: ParsedFile, allFiles: ParsedFile[]): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];
    const filepath = file.filepath.toLowerCase();
    const code = this.getFileCode(file);
    const imports = this.extractImports(code);

    // Check for circular dependencies
    for (const imported of imports) {
      const importedFile = allFiles.find(f => 
        f.filepath.toLowerCase().includes(imported.toLowerCase().split('/').pop() || '')
      );

      if (importedFile) {
        const importedCode = this.getFileCode(importedFile);
        const importedImports = this.extractImports(importedCode);

        // Check if imported file imports back
        if (importedImports.some(imp => 
          filepath.includes(imp.toLowerCase().split('/').pop() || '')
        )) {
          violations.push({
            rule: 'circular-dependency',
            severity: 'high',
            file: file.filepath,
            line: 1,
            message: `Circular dependency detected: ${file.filepath} ↔ ${importedFile.filepath}`,
            suggestion: 'Break circular dependency by introducing an abstraction or refactoring',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Get file code from parsed file
   */
  private getFileCode(file: ParsedFile): string {
    // Try to get code from symbols
    const allCode = file.symbols.map(s => s.code || '').join('\n');
    return allCode || '';
  }

  /**
   * Extract imports from code
   */
  private extractImports(code: string): string[] {
    const imports: string[] = [];
    
    // Java imports
    const javaImports = code.matchAll(/import\s+([\w.]+)/g);
    for (const match of javaImports) {
      imports.push(match[1]);
    }

    // TypeScript/JavaScript imports
    const tsImports = code.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
    for (const match of tsImports) {
      imports.push(match[1]);
    }

    // TypeScript/JavaScript require
    const requireImports = code.matchAll(/require\(['"]([^'"]+)['"]\)/g);
    for (const match of requireImports) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Get line number from code index
   */
  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
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








