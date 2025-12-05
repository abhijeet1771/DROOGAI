/**
 * Code Organization Analyzer
 * Suggests better file/class locations based on:
 * - Project structure patterns
 * - Separation of concerns
 * - Team conventions
 * - Domain boundaries
 */

export interface OrganizationIssue {
  type: 'wrong_location' | 'missing_separation' | 'violates_convention' | 'domain_boundary';
  severity: 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  element: string; // class name, method name, etc.
  message: string;
  suggestion: string;
  currentLocation: string;
  suggestedLocation: string;
  reason: string; // Why this suggestion
  relatedFiles?: string[];
}

export interface OrganizationReport {
  issues: OrganizationIssue[];
  suggestions: OrganizationIssue[];
  summary: string;
}

export class CodeOrganizationAnalyzer {
  /**
   * Analyze code organization and suggest better locations
   */
  analyzeOrganization(
    prFiles: Map<string, string>,
    prFileNames: string[],
    mainBranchFiles?: string[]
  ): OrganizationReport {
    const issues: OrganizationIssue[] = [];

    try {
      // Detect project structure patterns from main branch
      const projectStructure = this.detectProjectStructure(mainBranchFiles || []);

      // Analyze each PR file
      for (const [filename, content] of prFiles.entries()) {
        // 1. Check if file is in wrong location based on project structure
        const locationIssue = this.checkFileLocation(filename, content, projectStructure);
        if (locationIssue) {
          issues.push(locationIssue);
        }

        // 2. Check for separation of concerns violations
        const separationIssues = this.checkSeparationOfConcerns(filename, content, projectStructure);
        issues.push(...separationIssues);

        // 3. Check for domain boundary violations
        const domainIssues = this.checkDomainBoundaries(filename, content, projectStructure);
        issues.push(...domainIssues);

        // 4. Check for team convention violations
        const conventionIssues = this.checkTeamConventions(filename, content, projectStructure);
        issues.push(...conventionIssues);
      }

      return {
        issues,
        suggestions: issues.filter(i => i.severity !== 'high'),
        summary: this.generateSummary(issues),
      };
    } catch (error: any) {
      return {
        issues: [],
        suggestions: [],
        summary: 'Code organization analysis failed (non-critical)',
      };
    }
  }

  /**
   * Detect project structure patterns from existing files
   */
  private detectProjectStructure(files: string[]): {
    hasPageObjects: boolean;
    hasStepDefs: boolean;
    hasLocators: boolean;
    hasServices: boolean;
    hasControllers: boolean;
    hasModels: boolean;
    hasUtils: boolean;
    pageObjectPattern?: string; // e.g., 'page-objects', 'pages', 'pom'
    stepDefPattern?: string; // e.g., 'step-definitions', 'steps', 'stepdefs'
    locatorPattern?: string; // e.g., 'locators', 'selectors'
    servicePattern?: string; // e.g., 'services', 'service'
    controllerPattern?: string; // e.g., 'controllers', 'controller'
    modelPattern?: string; // e.g., 'models', 'model', 'entities'
    utilPattern?: string; // e.g., 'utils', 'utilities', 'helpers'
  } {
    const structure = {
      hasPageObjects: false,
      hasStepDefs: false,
      hasLocators: false,
      hasServices: false,
      hasControllers: false,
      hasModels: false,
      hasUtils: false,
    } as any;

    for (const file of files) {
      const lowerFile = file.toLowerCase();
      
      // Page Objects
      if (lowerFile.includes('page') && (lowerFile.includes('object') || lowerFile.includes('pom'))) {
        structure.hasPageObjects = true;
        if (lowerFile.includes('page-object')) structure.pageObjectPattern = 'page-objects';
        else if (lowerFile.includes('pages')) structure.pageObjectPattern = 'pages';
        else if (lowerFile.includes('pom')) structure.pageObjectPattern = 'pom';
      }
      
      // Step Definitions
      if (lowerFile.includes('step') && (lowerFile.includes('def') || lowerFile.includes('definition'))) {
        structure.hasStepDefs = true;
        if (lowerFile.includes('step-definition')) structure.stepDefPattern = 'step-definitions';
        else if (lowerFile.includes('stepdef')) structure.stepDefPattern = 'stepdefs';
        else if (lowerFile.includes('steps')) structure.stepDefPattern = 'steps';
      }
      
      // Locators
      if (lowerFile.includes('locator') || lowerFile.includes('selector')) {
        structure.hasLocators = true;
        if (lowerFile.includes('locator')) structure.locatorPattern = 'locators';
        else structure.locatorPattern = 'selectors';
      }
      
      // Services
      if (lowerFile.includes('service') && !lowerFile.includes('test')) {
        structure.hasServices = true;
        if (lowerFile.includes('services')) structure.servicePattern = 'services';
        else structure.servicePattern = 'service';
      }
      
      // Controllers
      if (lowerFile.includes('controller') && !lowerFile.includes('test')) {
        structure.hasControllers = true;
        if (lowerFile.includes('controllers')) structure.controllerPattern = 'controllers';
        else structure.controllerPattern = 'controller';
      }
      
      // Models
      if (lowerFile.includes('model') || lowerFile.includes('entity') || lowerFile.includes('dto')) {
        structure.hasModels = true;
        if (lowerFile.includes('models')) structure.modelPattern = 'models';
        else if (lowerFile.includes('model')) structure.modelPattern = 'model';
        else if (lowerFile.includes('entities')) structure.modelPattern = 'entities';
        else structure.modelPattern = 'dto';
      }
      
      // Utils
      if (lowerFile.includes('util') || lowerFile.includes('helper') || lowerFile.includes('common')) {
        structure.hasUtils = true;
        if (lowerFile.includes('utils')) structure.utilPattern = 'utils';
        else if (lowerFile.includes('utilities')) structure.utilPattern = 'utilities';
        else if (lowerFile.includes('helper')) structure.utilPattern = 'helpers';
        else structure.utilPattern = 'common';
      }
    }

    return structure;
  }

  /**
   * Check if file is in wrong location
   */
  private checkFileLocation(
    filename: string,
    content: string,
    structure: ReturnType<typeof this.detectProjectStructure>
  ): OrganizationIssue | null {
    const lowerFile = filename.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Test automation files
    if (this.isPageObject(content) && !this.isInPageObjectDir(filename, structure)) {
      const suggestedPath = this.suggestPageObjectPath(filename, structure);
      return {
        type: 'wrong_location',
        severity: 'high',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `Page Object file should be in page-objects directory, not in current location`,
        suggestion: `Move to: ${suggestedPath}`,
        currentLocation: filename,
        suggestedLocation: suggestedPath,
        reason: 'Page Objects should be organized in dedicated directory for maintainability',
      };
    }

    if (this.isStepDefinition(content) && !this.isInStepDefDir(filename, structure)) {
      const suggestedPath = this.suggestStepDefPath(filename, structure);
      return {
        type: 'wrong_location',
        severity: 'high',
        file: filename,
        element: this.extractStepDefPattern(content) || filename,
        message: `Step definition file should be in step-definitions directory`,
        suggestion: `Move to: ${suggestedPath}`,
        currentLocation: filename,
        suggestedLocation: suggestedPath,
        reason: 'Step definitions should be organized in dedicated directory',
      };
    }

    if (this.isLocatorFile(content) && !this.isInLocatorDir(filename, structure)) {
      const suggestedPath = this.suggestLocatorPath(filename, structure);
      return {
        type: 'wrong_location',
        severity: 'medium',
        file: filename,
        element: filename,
        message: `Locator file should be in locators directory`,
        suggestion: `Move to: ${suggestedPath}`,
        currentLocation: filename,
        suggestedLocation: suggestedPath,
        reason: 'Locators should be centralized for easier maintenance',
      };
    }

    // Backend files
    if (this.isServiceClass(content) && !this.isInServiceDir(filename, structure)) {
      const suggestedPath = this.suggestServicePath(filename, structure);
      return {
        type: 'wrong_location',
        severity: 'high',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `Service class should be in services directory, not in current location`,
        suggestion: `Move to: ${suggestedPath}`,
        currentLocation: filename,
        suggestedLocation: suggestedPath,
        reason: 'Services should be in service layer for proper separation of concerns',
      };
    }

    if (this.isControllerClass(content) && !this.isInControllerDir(filename, structure)) {
      const suggestedPath = this.suggestControllerPath(filename, structure);
      return {
        type: 'wrong_location',
        severity: 'high',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `Controller class should be in controllers directory`,
        suggestion: `Move to: ${suggestedPath}`,
        currentLocation: filename,
        suggestedLocation: suggestedPath,
        reason: 'Controllers should be in controller layer for proper MVC architecture',
      };
    }

    if (this.isModelClass(content) && !this.isInModelDir(filename, structure)) {
      const suggestedPath = this.suggestModelPath(filename, structure);
      return {
        type: 'wrong_location',
        severity: 'medium',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `Model/Entity class should be in models directory`,
        suggestion: `Move to: ${suggestedPath}`,
        currentLocation: filename,
        suggestedLocation: suggestedPath,
        reason: 'Models should be in model layer for proper data organization',
      };
    }

    if (this.isUtilityClass(content) && !this.isInUtilDir(filename, structure)) {
      const suggestedPath = this.suggestUtilPath(filename, structure);
      return {
        type: 'wrong_location',
        severity: 'low',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `Utility class should be in utils directory`,
        suggestion: `Move to: ${suggestedPath}`,
        currentLocation: filename,
        suggestedLocation: suggestedPath,
        reason: 'Utilities should be in utils directory for better code organization',
      };
    }

    return null;
  }

  /**
   * Check separation of concerns
   */
  private checkSeparationOfConcerns(
    filename: string,
    content: string,
    structure: ReturnType<typeof this.detectProjectStructure>
  ): OrganizationIssue[] {
    const issues: OrganizationIssue[] = [];

    // Business logic in controller
    if (this.isControllerClass(content) && this.hasBusinessLogic(content)) {
      issues.push({
        type: 'missing_separation',
        severity: 'high',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `Controller contains business logic - should be in service layer`,
        suggestion: `Extract business logic to a service class in ${structure.servicePattern || 'services'} directory`,
        currentLocation: filename,
        suggestedLocation: `${structure.servicePattern || 'services'}/${this.extractClassName(content) || 'Service'}.java`,
        reason: 'Controllers should only handle HTTP requests/responses, not business logic',
      });
    }

    // Database logic in service
    if (this.isServiceClass(content) && this.hasDatabaseLogic(content)) {
      issues.push({
        type: 'missing_separation',
        severity: 'medium',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `Service contains direct database access - consider using repository pattern`,
        suggestion: `Extract database logic to a repository class`,
        currentLocation: filename,
        suggestedLocation: `repositories/${this.extractClassName(content) || 'Repository'}.java`,
        reason: 'Services should use repositories for data access, not direct database calls',
      });
    }

    // UI logic in page object
    if (this.isPageObject(content) && this.hasTestLogic(content)) {
      issues.push({
        type: 'missing_separation',
        severity: 'high',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `Page Object contains test logic - should be in step definitions or test files`,
        suggestion: `Move test logic to step definitions or test files`,
        currentLocation: filename,
        suggestedLocation: `${structure.stepDefPattern || 'step-definitions'}/...`,
        reason: 'Page Objects should only contain page interactions, not test logic',
      });
    }

    return issues;
  }

  /**
   * Check domain boundaries
   */
  private checkDomainBoundaries(
    filename: string,
    content: string,
    structure: ReturnType<typeof this.detectProjectStructure>
  ): OrganizationIssue[] {
    const issues: OrganizationIssue[] = [];

    // Cross-domain dependencies
    const domains = this.extractDomains(content);
    if (domains.length > 1) {
      issues.push({
        type: 'domain_boundary',
        severity: 'medium',
        file: filename,
        element: this.extractClassName(content) || filename,
        message: `File contains code from multiple domains: ${domains.join(', ')}`,
        suggestion: `Split into separate files per domain`,
        currentLocation: filename,
        suggestedLocation: `Split into: ${domains.map(d => `${d}/${filename}`).join(', ')}`,
        reason: 'Each file should focus on a single domain for better maintainability',
      });
    }

    return issues;
  }

  /**
   * Check team conventions
   */
  private checkTeamConventions(
    filename: string,
    content: string,
    structure: ReturnType<typeof this.detectProjectStructure>
  ): OrganizationIssue[] {
    const issues: OrganizationIssue[] = [];

    // Naming conventions
    if (this.isPageObject(content) && !filename.match(/Page\.(js|ts|java)$/i)) {
      issues.push({
        type: 'violates_convention',
        severity: 'low',
        file: filename,
        element: filename,
        message: `Page Object file should end with "Page" suffix`,
        suggestion: `Rename to: ${filename.replace(/\.[^.]+$/, '')}Page${filename.match(/\.[^.]+$/)?.[0] || ''}`,
        currentLocation: filename,
        suggestedLocation: filename.replace(/\.[^.]+$/, '') + 'Page' + (filename.match(/\.[^.]+$/)?.[0] || ''),
        reason: 'Team convention: Page Objects should have "Page" suffix',
      });
    }

    return issues;
  }

  // Helper methods
  private isPageObject(content: string): boolean {
    const lower = content.toLowerCase();
    return lower.includes('page object') || 
           lower.includes('pageobject') ||
           lower.includes('getbyrole') ||
           lower.includes('getbytestid') ||
           lower.includes('locator(');
  }

  private isStepDefinition(content: string): boolean {
    return /@(Given|When|Then|And|But)\(/.test(content);
  }

  private isLocatorFile(content: string): boolean {
    const lower = content.toLowerCase();
    return (lower.includes('locator') || lower.includes('selector')) && 
           !this.isPageObject(content) && 
           !this.isStepDefinition(content);
  }

  private isServiceClass(content: string): boolean {
    const lower = content.toLowerCase();
    return (lower.includes('class') && lower.includes('service')) ||
           (lower.includes('@service') || lower.includes('@component'));
  }

  private isControllerClass(content: string): boolean {
    const lower = content.toLowerCase();
    return (lower.includes('class') && lower.includes('controller')) ||
           lower.includes('@controller') ||
           lower.includes('@restcontroller');
  }

  private isModelClass(content: string): boolean {
    const lower = content.toLowerCase();
    return (lower.includes('class') && (lower.includes('model') || lower.includes('entity') || lower.includes('dto'))) ||
           lower.includes('@entity') ||
           lower.includes('@model');
  }

  private isUtilityClass(content: string): boolean {
    const lower = content.toLowerCase();
    return (lower.includes('class') && (lower.includes('util') || lower.includes('helper') || lower.includes('common'))) &&
           !this.isServiceClass(content) &&
           !this.isControllerClass(content);
  }

  private hasBusinessLogic(content: string): boolean {
    const lower = content.toLowerCase();
    return lower.includes('calculate') ||
           lower.includes('process') ||
           lower.includes('validate') ||
           lower.includes('transform');
  }

  private hasDatabaseLogic(content: string): boolean {
    const lower = content.toLowerCase();
    return lower.includes('sql') ||
           lower.includes('query') ||
           lower.includes('jdbc') ||
           lower.includes('entitymanager') ||
           lower.includes('session.createquery');
  }

  private hasTestLogic(content: string): boolean {
    const lower = content.toLowerCase();
    return lower.includes('expect') ||
           lower.includes('assert') ||
           lower.includes('should') ||
           lower.includes('test(') ||
           lower.includes('it(') ||
           lower.includes('describe(');
  }

  private extractClassName(content: string): string | null {
    const match = content.match(/(?:class|export\s+class)\s+(\w+)/);
    return match ? match[1] : null;
  }

  private extractStepDefPattern(content: string): string | null {
    const match = content.match(/@(?:Given|When|Then|And|But)\(["']([^"']+)["']\)/);
    return match ? match[1] : null;
  }

  private extractDomains(content: string): string[] {
    const domains: string[] = [];
    const lower = content.toLowerCase();
    
    if (lower.includes('user') || lower.includes('account')) domains.push('user');
    if (lower.includes('order') || lower.includes('cart')) domains.push('order');
    if (lower.includes('payment') || lower.includes('billing')) domains.push('payment');
    if (lower.includes('product') || lower.includes('catalog')) domains.push('product');
    
    return domains;
  }

  private isInPageObjectDir(filename: string, structure: any): boolean {
    const pattern = structure.pageObjectPattern || 'page-object';
    return filename.toLowerCase().includes(pattern);
  }

  private isInStepDefDir(filename: string, structure: any): boolean {
    const pattern = structure.stepDefPattern || 'step-definition';
    return filename.toLowerCase().includes(pattern);
  }

  private isInLocatorDir(filename: string, structure: any): boolean {
    const pattern = structure.locatorPattern || 'locator';
    return filename.toLowerCase().includes(pattern);
  }

  private isInServiceDir(filename: string, structure: any): boolean {
    const pattern = structure.servicePattern || 'service';
    return filename.toLowerCase().includes(pattern);
  }

  private isInControllerDir(filename: string, structure: any): boolean {
    const pattern = structure.controllerPattern || 'controller';
    return filename.toLowerCase().includes(pattern);
  }

  private isInModelDir(filename: string, structure: any): boolean {
    const pattern = structure.modelPattern || 'model';
    return filename.toLowerCase().includes(pattern);
  }

  private isInUtilDir(filename: string, structure: any): boolean {
    const pattern = structure.utilPattern || 'util';
    return filename.toLowerCase().includes(pattern);
  }

  private suggestPageObjectPath(filename: string, structure: any): string {
    const pattern = structure.pageObjectPattern || 'page-objects';
    const baseName = filename.split('/').pop() || filename;
    return `${pattern}/${baseName}`;
  }

  private suggestStepDefPath(filename: string, structure: any): string {
    const pattern = structure.stepDefPattern || 'step-definitions';
    const baseName = filename.split('/').pop() || filename;
    return `${pattern}/${baseName}`;
  }

  private suggestLocatorPath(filename: string, structure: any): string {
    const pattern = structure.locatorPattern || 'locators';
    const baseName = filename.split('/').pop() || filename;
    return `${pattern}/${baseName}`;
  }

  private suggestServicePath(filename: string, structure: any): string {
    const pattern = structure.servicePattern || 'services';
    const baseName = filename.split('/').pop() || filename;
    return `${pattern}/${baseName}`;
  }

  private suggestControllerPath(filename: string, structure: any): string {
    const pattern = structure.controllerPattern || 'controllers';
    const baseName = filename.split('/').pop() || filename;
    return `${pattern}/${baseName}`;
  }

  private suggestModelPath(filename: string, structure: any): string {
    const pattern = structure.modelPattern || 'models';
    const baseName = filename.split('/').pop() || filename;
    return `${pattern}/${baseName}`;
  }

  private suggestUtilPath(filename: string, structure: any): string {
    const pattern = structure.utilPattern || 'utils';
    const baseName = filename.split('/').pop() || filename;
    return `${pattern}/${baseName}`;
  }

  private generateSummary(issues: OrganizationIssue[]): string {
    if (issues.length === 0) {
      return '✅ Code organization follows best practices';
    }

    const byType = {
      wrong_location: issues.filter(i => i.type === 'wrong_location').length,
      missing_separation: issues.filter(i => i.type === 'missing_separation').length,
      violates_convention: issues.filter(i => i.type === 'violates_convention').length,
      domain_boundary: issues.filter(i => i.type === 'domain_boundary').length,
    };

    const parts: string[] = [];
    if (byType.wrong_location > 0) parts.push(`${byType.wrong_location} file(s) in wrong location`);
    if (byType.missing_separation > 0) parts.push(`${byType.missing_separation} separation of concerns issue(s)`);
    if (byType.domain_boundary > 0) parts.push(`${byType.domain_boundary} domain boundary violation(s)`);
    if (byType.violates_convention > 0) parts.push(`${byType.violates_convention} convention violation(s)`);

    return `⚠️ Found ${issues.length} code organization issue(s): ${parts.join(', ')}`;
  }
}

