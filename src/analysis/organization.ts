/**
 * Code Organization Analysis
 * Validates package/module structure, layer boundaries, separation of concerns
 */

import { CodeSymbol } from '../parser/types.js';

export interface OrganizationIssue {
  type: 'layer_violation' | 'package_structure' | 'separation_of_concerns' | 'module_isolation' | 'circular_dependency';
  location: string;
  file: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface OrganizationReport {
  issues: OrganizationIssue[];
  layerViolations: OrganizationIssue[];
  packageStructureIssues: OrganizationIssue[];
  socIssues: OrganizationIssue[];
  moduleIsolationIssues: OrganizationIssue[];
  circularDependencies: OrganizationIssue[];
}

export class OrganizationAnalyzer {
  /**
   * Analyze code organization
   */
  analyzeOrganization(symbols: CodeSymbol[], codeContent: string): OrganizationReport {
    const issues: OrganizationIssue[] = [];
    const layerViolations: OrganizationIssue[] = [];
    const packageStructureIssues: OrganizationIssue[] = [];
    const socIssues: OrganizationIssue[] = [];
    const moduleIsolationIssues: OrganizationIssue[] = [];
    const circularDependencies: OrganizationIssue[] = [];

    // Group symbols by file
    const symbolsByFile = new Map<string, CodeSymbol[]>();
    for (const symbol of symbols) {
      if (!symbolsByFile.has(symbol.file)) {
        symbolsByFile.set(symbol.file, []);
      }
      symbolsByFile.get(symbol.file)!.push(symbol);
    }

    // Analyze each file
    for (const [file, fileSymbols] of symbolsByFile.entries()) {
      // 1. Check layer violations
      const layerIssues = this.checkLayerViolations(file, fileSymbols, codeContent);
      layerViolations.push(...layerIssues);
      issues.push(...layerIssues);

      // 2. Check package structure
      const packageIssues = this.checkPackageStructure(file, fileSymbols);
      packageStructureIssues.push(...packageIssues);
      issues.push(...packageIssues);

      // 3. Check separation of concerns
      const socIssuesForFile = this.checkSeparationOfConcerns(file, fileSymbols, codeContent);
      socIssues.push(...socIssuesForFile);
      issues.push(...socIssuesForFile);

      // 4. Check module isolation
      const moduleIssues = this.checkModuleIsolation(file, fileSymbols, codeContent);
      moduleIsolationIssues.push(...moduleIssues);
      issues.push(...moduleIssues);
    }

    // 5. Check circular dependencies (across files)
    const circularDeps = this.checkCircularDependencies(symbols);
    circularDependencies.push(...circularDeps);
    issues.push(...circularDeps);

    return {
      issues,
      layerViolations,
      packageStructureIssues,
      socIssues,
      moduleIsolationIssues,
      circularDependencies,
    };
  }

  /**
   * Check layer violations (e.g., Controller → Repository)
   */
  private checkLayerViolations(
    file: string,
    symbols: CodeSymbol[],
    codeContent: string
  ): OrganizationIssue[] {
    const issues: OrganizationIssue[] = [];

    const fileLower = file.toLowerCase();
    const isController = fileLower.includes('controller') || fileLower.includes('resource');
    const isService = fileLower.includes('service');
    const isRepository = fileLower.includes('repository') || fileLower.includes('dao');

    // Check imports to detect layer violations
    const imports = this.extractImports(codeContent);

    if (isController) {
      // Controller should not directly access Repository
      const hasRepositoryImport = imports.some(imp => 
        imp.toLowerCase().includes('repository') || 
        imp.toLowerCase().includes('dao')
      );

      if (hasRepositoryImport) {
        issues.push({
          type: 'layer_violation',
          location: file,
          file: file,
          severity: 'high',
          message: 'Controller directly accessing repository - violates layered architecture',
          suggestion: 'Use service layer between controller and repository',
        });
      }

      // Controller should not contain business logic
      const hasBusinessLogic = /if\s*\(.*\)\s*\{|for\s*\(|while\s*\(|calculate|process|validate|transform/.test(codeContent);
      if (hasBusinessLogic && !isService) {
        issues.push({
          type: 'layer_violation',
          location: file,
          file: file,
          severity: 'medium',
          message: 'Controller contains business logic',
          suggestion: 'Move business logic to service layer',
        });
      }
    }

    if (isService) {
      // Service should not directly access database (should use repository)
      const hasDirectDbAccess = /entitymanager|sessionfactory|datasource|jdbctemplate/i.test(codeContent);
      if (hasDirectDbAccess) {
        issues.push({
          type: 'layer_violation',
          location: file,
          file: file,
          severity: 'high',
          message: 'Service directly accessing database - should use repository layer',
          suggestion: 'Use repository pattern for database access',
        });
      }
    }

    return issues;
  }

  /**
   * Check package structure
   */
  private checkPackageStructure(
    file: string,
    symbols: CodeSymbol[]
  ): OrganizationIssue[] {
    const issues: OrganizationIssue[] = [];

    // Extract package name
    const packageMatch = file.match(/(?:src\/main\/java\/|src\/)([^\/]+(?:\/[^\/]+)*)/);
    if (!packageMatch) {
      return issues;
    }

    const packagePath = packageMatch[1];
    const packageParts = packagePath.split('/');

    // Check if file is in appropriate package
    for (const symbol of symbols) {
      if (symbol.type === 'class') {
        const className = symbol.name;
        const fileLower = file.toLowerCase();

        // Controller should be in controller package
        if (className.includes('Controller') || className.includes('Resource')) {
          if (!packageParts.some(p => p.toLowerCase().includes('controller') || 
                                      p.toLowerCase().includes('api') ||
                                      p.toLowerCase().includes('rest'))) {
            issues.push({
              type: 'package_structure',
              location: `${file}:${symbol.startLine}`,
              file: file,
              severity: 'medium',
              message: `Controller class "${className}" not in controller package`,
              suggestion: `Move to package: ${packageParts[0]}.controller or ${packageParts[0]}.api`,
            });
          }
        }

        // Service should be in service package
        if (className.includes('Service') && !className.includes('Test')) {
          if (!packageParts.some(p => p.toLowerCase().includes('service'))) {
            issues.push({
              type: 'package_structure',
              location: `${file}:${symbol.startLine}`,
              file: file,
              severity: 'low',
              message: `Service class "${className}" not in service package`,
              suggestion: `Move to package: ${packageParts[0]}.service`,
            });
          }
        }

        // Repository should be in repository package
        if (className.includes('Repository') || className.includes('DAO')) {
          if (!packageParts.some(p => p.toLowerCase().includes('repository') || 
                                      p.toLowerCase().includes('dao'))) {
            issues.push({
              type: 'package_structure',
              location: `${file}:${symbol.startLine}`,
              file: file,
              severity: 'medium',
              message: `Repository class "${className}" not in repository package`,
              suggestion: `Move to package: ${packageParts[0]}.repository or ${packageParts[0]}.dao`,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check separation of concerns
   */
  private checkSeparationOfConcerns(
    file: string,
    symbols: CodeSymbol[],
    codeContent: string
  ): OrganizationIssue[] {
    const issues: OrganizationIssue[] = [];

    // Check if class has too many responsibilities
    for (const symbol of symbols) {
      if (symbol.type === 'class') {
        const classMethods = symbols.filter(s => 
          s.type === 'method' && 
          s.file === symbol.file &&
          s.name !== symbol.name
        );

        // God Object detection (too many methods)
        if (classMethods.length > 20) {
          issues.push({
            type: 'separation_of_concerns',
            location: `${file}:${symbol.startLine}`,
            file: file,
            severity: 'medium',
            message: `Class "${symbol.name}" has ${classMethods.length} methods - potential God Object`,
            suggestion: 'Split into smaller, focused classes with single responsibility',
          });
        }

        // Check for mixed concerns in class
        const hasDataAccess = /repository|dao|entitymanager|jdbc/i.test(codeContent);
        const hasBusinessLogic = /calculate|process|validate|transform|compute/i.test(codeContent);
        const hasPresentation = /controller|resource|@requestmapping|@getmapping/i.test(codeContent);

        const concernCount = [hasDataAccess, hasBusinessLogic, hasPresentation].filter(Boolean).length;
        if (concernCount > 1) {
          issues.push({
            type: 'separation_of_concerns',
            location: `${file}:${symbol.startLine}`,
            file: file,
            severity: 'high',
            message: `Class "${symbol.name}" mixes multiple concerns (data access, business logic, presentation)`,
            suggestion: 'Separate concerns into different classes/layers',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check module isolation
   */
  private checkModuleIsolation(
    file: string,
    symbols: CodeSymbol[],
    codeContent: string
  ): OrganizationIssue[] {
    const issues: OrganizationIssue[] = [];

    // Extract package/module
    const packageMatch = file.match(/(?:src\/main\/java\/|src\/)([^\/]+(?:\/[^\/]+)*)/);
    if (!packageMatch) {
      return issues;
    }

    const packagePath = packageMatch[1];
    const packageParts = packagePath.split('/');
    const moduleName = packageParts[0]; // First package level

    // Check for cross-module dependencies
    const imports = this.extractImports(codeContent);
    const crossModuleImports = imports.filter(imp => {
      const importPackage = imp.split('.').slice(0, -1).join('.');
      const importModule = importPackage.split('.')[0];
      return importModule !== moduleName && !this.isStandardLibrary(importPackage);
    });

    // Too many cross-module dependencies may indicate tight coupling
    if (crossModuleImports.length > 10) {
      issues.push({
        type: 'module_isolation',
        location: file,
        file: file,
        severity: 'medium',
        message: `File has ${crossModuleImports.length} cross-module dependencies - potential tight coupling`,
        suggestion: 'Review dependencies and consider refactoring to reduce coupling',
      });
    }

    return issues;
  }

  /**
   * Check circular dependencies
   */
  private checkCircularDependencies(symbols: CodeSymbol[]): OrganizationIssue[] {
    const issues: OrganizationIssue[] = [];

    // Simplified circular dependency detection
    // In a full implementation, would build a dependency graph and detect cycles
    // For now, we'll check for obvious patterns

    const files = [...new Set(symbols.map(s => s.file))];
    
    // Check for bidirectional dependencies between files
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const file1 = files[i];
        const file2 = files[j];

        // Check if file1 imports from file2 and file2 imports from file1
        // (This is a simplified check - full implementation would parse imports)
        // For now, we'll skip this as it requires more sophisticated analysis
      }
    }

    return issues;
  }

  /**
   * Extract imports from code
   */
  private extractImports(codeContent: string): string[] {
    const imports: string[] = [];
    const importPattern = /^import\s+(?:static\s+)?([^;]+);/gm;
    let match;

    while ((match = importPattern.exec(codeContent)) !== null) {
      imports.push(match[1].trim());
    }

    return imports;
  }

  /**
   * Check if import is from standard library
   */
  private isStandardLibrary(packageName: string): boolean {
    const standardPackages = [
      'java.', 'javax.', 'org.springframework.', 'org.junit.', 
      'junit.', 'org.mockito.', 'org.hamcrest.'
    ];
    return standardPackages.some(std => packageName.startsWith(std));
  }
}



