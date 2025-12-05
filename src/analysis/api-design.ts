/**
 * API Design Review
 * Reviews REST API design, naming, versioning, and documentation
 */

import { CodeSymbol } from '../parser/types.js';

export interface APIIssue {
  endpoint?: string;
  method?: string;
  file: string;
  line: number;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface BackwardCompatibilityIssue {
  endpoint: string;
  change: string;
  impact: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export class APIDesignReviewer {
  /**
   * Review API design from code symbols
   */
  reviewAPIDesign(symbols: CodeSymbol[], codeContent?: string): {
    issues: APIIssue[];
    backwardCompatibility: BackwardCompatibilityIssue[];
  } {
    const issues: APIIssue[] = [];
    const backwardCompatibility: BackwardCompatibilityIssue[] = [];

    // Find REST controllers and endpoints
    const controllers = symbols.filter(s => 
      s.type === 'class' &&
      (s.name.toLowerCase().includes('controller') || 
       s.name.toLowerCase().includes('resource') ||
       s.name.toLowerCase().includes('api'))
    );

    for (const controller of controllers) {
      // Check for versioning
      const hasVersioning = this.checkVersioning(controller, codeContent);
      if (!hasVersioning) {
        issues.push({
          endpoint: controller.name,
          file: controller.file,
          line: controller.startLine,
          issue: 'Missing API versioning in URL path',
          severity: 'medium',
          suggestion: 'Add version to API path: @RequestMapping("/api/v1/...") or use @GetMapping("/api/v1/...")'
        });
      }

      // Check endpoint methods
      const methods = symbols.filter(s =>
        s.type === 'method' &&
        s.file === controller.file &&
        (s.name.toLowerCase().includes('get') ||
         s.name.toLowerCase().includes('post') ||
         s.name.toLowerCase().includes('put') ||
         s.name.toLowerCase().includes('delete'))
      );

      for (const method of methods) {
        // Check for proper HTTP method annotations
        const httpMethodIssues = this.checkHTTPMethodAnnotations(method, codeContent);
        issues.push(...httpMethodIssues);

        // Check for request validation
        const validationIssues = this.checkRequestValidation(method, codeContent);
        issues.push(...validationIssues);

        // Check for proper response types
        const responseIssues = this.checkResponseTypes(method);
        issues.push(...responseIssues);
      }
    }

    return { issues, backwardCompatibility };
  }

  /**
   * Check if API has versioning
   */
  private checkVersioning(controller: CodeSymbol, codeContent?: string): boolean {
    if (!codeContent) return false;
    
    // Check for version in annotations
    const versionPatterns = [
      /@RequestMapping\s*\(\s*["']\/api\/v\d+/,
      /@GetMapping\s*\(\s*["']\/api\/v\d+/,
      /@PostMapping\s*\(\s*["']\/api\/v\d+/,
      /@PutMapping\s*\(\s*["']\/api\/v\d+/,
      /@DeleteMapping\s*\(\s*["']\/api\/v\d+/,
      /@RequestMapping\s*\(\s*value\s*=\s*["']\/api\/v\d+/,
      /version\s*=\s*["']v\d+/
    ];

    return versionPatterns.some(pattern => pattern.test(codeContent));
  }

  /**
   * Check HTTP method annotations
   */
  private checkHTTPMethodAnnotations(method: CodeSymbol, codeContent?: string): APIIssue[] {
    const issues: APIIssue[] = [];

    if (!codeContent) return issues;

    const methodName = method.name.toLowerCase();
    const hasGet = methodName.includes('get') || methodName.includes('fetch') || methodName.includes('retrieve');
    const hasPost = methodName.includes('post') || methodName.includes('create') || methodName.includes('add');
    const hasPut = methodName.includes('put') || methodName.includes('update') || methodName.includes('modify');
    const hasDelete = methodName.includes('delete') || methodName.includes('remove');

    // Check for appropriate annotations
    if (hasGet && !/@GetMapping|@RequestMapping.*method.*GET/i.test(codeContent)) {
      issues.push({
        endpoint: method.name,
        method: 'GET',
        file: method.file,
        line: method.startLine,
        issue: 'GET method missing @GetMapping annotation',
        severity: 'high',
        suggestion: `Add @GetMapping annotation:\n@GetMapping("/api/v1/${method.name.toLowerCase()}")\npublic ResponseEntity<...> ${method.name}(...) { ... }`
      });
    }

    if (hasPost && !/@PostMapping|@RequestMapping.*method.*POST/i.test(codeContent)) {
      issues.push({
        endpoint: method.name,
        method: 'POST',
        file: method.file,
        line: method.startLine,
        issue: 'POST method missing @PostMapping annotation',
        severity: 'high',
        suggestion: `Add @PostMapping annotation:\n@PostMapping("/api/v1/${method.name.toLowerCase()}")\npublic ResponseEntity<...> ${method.name}(...) { ... }`
      });
    }

    if (hasPut && !/@PutMapping|@RequestMapping.*method.*PUT/i.test(codeContent)) {
      issues.push({
        endpoint: method.name,
        method: 'PUT',
        file: method.file,
        line: method.startLine,
        issue: 'PUT method missing @PutMapping annotation',
        severity: 'high',
        suggestion: `Add @PutMapping annotation:\n@PutMapping("/api/v1/${method.name.toLowerCase()}")\npublic ResponseEntity<...> ${method.name}(...) { ... }`
      });
    }

    if (hasDelete && !/@DeleteMapping|@RequestMapping.*method.*DELETE/i.test(codeContent)) {
      issues.push({
        endpoint: method.name,
        method: 'DELETE',
        file: method.file,
        line: method.startLine,
        issue: 'DELETE method missing @DeleteMapping annotation',
        severity: 'high',
        suggestion: `Add @DeleteMapping annotation:\n@DeleteMapping("/api/v1/${method.name.toLowerCase()}")\npublic ResponseEntity<...> ${method.name}(...) { ... }`
      });
    }

    return issues;
  }

  /**
   * Check for request validation
   */
  private checkRequestValidation(method: CodeSymbol, codeContent?: string): APIIssue[] {
    const issues: APIIssue[] = [];

    if (!codeContent || !method.parameters) return issues;

    // Check if POST/PUT methods have @Valid annotation
    const isModifyingMethod = method.name.toLowerCase().includes('post') ||
                              method.name.toLowerCase().includes('put') ||
                              method.name.toLowerCase().includes('create') ||
                              method.name.toLowerCase().includes('update');

    if (isModifyingMethod) {
      const hasRequestBody = method.parameters.some(p => 
        codeContent.includes(`@RequestBody`) || codeContent.includes(`@ModelAttribute`)
      );

      if (hasRequestBody && !/@Valid|@Validated/.test(codeContent)) {
        issues.push({
          endpoint: method.name,
          file: method.file,
          line: method.startLine,
          issue: 'POST/PUT method missing request validation',
          severity: 'high',
          suggestion: `Add @Valid annotation for request validation:\n@PostMapping("/api/v1/...")\npublic ResponseEntity<...> ${method.name}(@Valid @RequestBody YourDTO dto) { ... }`
        });
      }
    }

    return issues;
  }

  /**
   * Check response types
   */
  private checkResponseTypes(method: CodeSymbol): APIIssue[] {
    const issues: APIIssue[] = [];

    // Check if method returns ResponseEntity or proper response type
    if (method.returnType && 
        method.returnType !== 'ResponseEntity' &&
        !method.returnType.includes('ResponseEntity')) {
      issues.push({
        endpoint: method.name,
        file: method.file,
        line: method.startLine,
        issue: 'API method should return ResponseEntity for proper HTTP status handling',
        severity: 'medium',
        suggestion: `Return ResponseEntity for proper HTTP status codes:\npublic ResponseEntity<YourResponseDTO> ${method.name}(...) {\n    return ResponseEntity.ok(responseData);\n}`
      });
    }

    return issues;
  }

  /**
   * Detect backward compatibility issues
   */
  detectBackwardCompatibilityIssues(
    prSymbols: CodeSymbol[],
    mainBranchSymbols: CodeSymbol[]
  ): BackwardCompatibilityIssue[] {
    const issues: BackwardCompatibilityIssue[] = [];

    // Find changed methods in PR
    for (const prSymbol of prSymbols) {
      if (prSymbol.type === 'method') {
        const mainSymbol = mainBranchSymbols.find(s =>
          s.name === prSymbol.name &&
          s.file === prSymbol.file
        );

        if (mainSymbol) {
          // Check for signature changes
          if (this.hasSignatureChange(prSymbol, mainSymbol)) {
            issues.push({
              endpoint: prSymbol.name,
              change: 'Method signature changed',
              impact: 'High - affects all clients using this endpoint',
              severity: 'high',
              suggestion: 'Maintain backward compatibility by:\n1. Keep old method with @Deprecated\n2. Create new versioned endpoint\n3. Or maintain old format for one release cycle'
            });
          }

          // Check for return type changes
          if (prSymbol.returnType !== mainSymbol.returnType) {
            issues.push({
              endpoint: prSymbol.name,
              change: `Return type changed from ${mainSymbol.returnType} to ${prSymbol.returnType}`,
              impact: 'High - breaks client expectations',
              severity: 'high',
              suggestion: 'Maintain old return format or version the endpoint'
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check if method signature changed
   */
  private hasSignatureChange(prSymbol: CodeSymbol, mainSymbol: CodeSymbol): boolean {
    // Compare parameters
    if (prSymbol.parameters?.length !== mainSymbol.parameters?.length) {
      return true;
    }

    // Compare parameter types
    if (prSymbol.parameters && mainSymbol.parameters) {
      for (let i = 0; i < prSymbol.parameters.length; i++) {
        if (prSymbol.parameters[i].type !== mainSymbol.parameters[i].type) {
          return true;
        }
      }
    }

    return false;
  }
}




