/**
 * Security Analysis
 * Detects security vulnerabilities, hardcoded secrets, OWASP Top 10 issues
 */

import { CodeSymbol } from '../parser/types.js';

export interface SecurityIssue {
  type: string;
  location: string;
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  cwe?: string; // Common Weakness Enumeration
  owaspCategory?: string; // OWASP Top 10 category
  cvssScore?: number; // CVSS score (0-10)
}

export interface SecurityReport {
  issues: SecurityIssue[];
  critical: SecurityIssue[];
  high: SecurityIssue[];
  medium: SecurityIssue[];
  low: SecurityIssue[];
  secrets: SecurityIssue[];
  sqlInjection: SecurityIssue[];
  xss: SecurityIssue[];
  idor: SecurityIssue[];
}

export class SecurityAnalyzer {
  /**
   * Detect language from filepath
   */
  private detectLanguage(filepath: string): 'java' | 'typescript' | 'javascript' | 'python' | 'unknown' {
    if (filepath.endsWith('.java')) return 'java';
    if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) return 'typescript';
    if (filepath.endsWith('.js') || filepath.endsWith('.jsx')) return 'javascript';
    if (filepath.endsWith('.py')) return 'python';
    return 'unknown';
  }

  /**
   * Analyze code for security issues
   */
  analyzeSecurity(symbols: CodeSymbol[], codeContent: string, filepath?: string): SecurityReport {
    const issues: SecurityIssue[] = [];
    const secrets: SecurityIssue[] = [];
    const sqlInjection: SecurityIssue[] = [];
    const xss: SecurityIssue[] = [];
    const idor: SecurityIssue[] = [];

    const allLines = codeContent.split('\n');
    const language = this.detectLanguage(filepath || '');

    // Analyze entire code content
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const lineLower = line.toLowerCase();

      // 1. Detect hardcoded secrets
      const secretIssues = this.detectSecrets(line, i + 1, codeContent);
      secrets.push(...secretIssues);
      issues.push(...secretIssues);

      // 2. Detect SQL Injection (language-aware)
      const sqlIssues = this.detectSQLInjection(line, lineLower, i + 1, language);
      sqlInjection.push(...sqlIssues);
      issues.push(...sqlIssues);

      // 3. Detect XSS vulnerabilities (language-aware)
      const xssIssues = this.detectXSS(line, lineLower, i + 1, language);
      xss.push(...xssIssues);
      issues.push(...xssIssues);

      // 4. Detect IDOR (Insecure Direct Object Reference)
      const idorIssues = this.detectIDOR(line, lineLower, i + 1);
      idor.push(...idorIssues);
      issues.push(...idorIssues);
    }

    // Categorize by severity
    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    const medium = issues.filter(i => i.severity === 'medium');
    const low = issues.filter(i => i.severity === 'low');

    return {
      issues,
      critical,
      high,
      medium,
      low,
      secrets,
      sqlInjection,
      xss,
      idor,
    };
  }

  /**
   * Detect hardcoded secrets
   */
  private detectSecrets(line: string, lineNumber: number, fullCode: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // API Keys
    const apiKeyPattern = /(api[_-]?key|apikey)\s*[=:]\s*["']([a-zA-Z0-9_\-]{20,})["']/i;
    if (apiKeyPattern.test(line)) {
      issues.push({
        type: 'Hardcoded Secret',
        location: `line ${lineNumber}`,
        owaspCategory: 'A07:2021 – Identification and Authentication Failures',
        cvssScore: 7.5, // High severity
        cwe: 'CWE-798',
        file: '', // Will be set by caller
        line: lineNumber,
        severity: 'critical',
        message: 'Hardcoded API key detected',
        suggestion: 'Move to environment variables or secure configuration',
      });
    }

    // Passwords
    const passwordPattern = /(password|pwd|pass)\s*[=:]\s*["']([^"']{6,})["']/i;
    if (passwordPattern.test(line)) {
      issues.push({
        type: 'Hardcoded Secret',
        location: `line ${lineNumber}`,
        file: '',
        line: lineNumber,
        severity: 'critical',
        message: 'Hardcoded password detected',
        suggestion: 'Use environment variables or secure vault',
        cwe: 'CWE-798',
        owaspCategory: 'A07:2021 – Identification and Authentication Failures',
        cvssScore: 9.1, // Critical for passwords
      });
    }

    // AWS/Azure/GCP credentials
    const cloudCredPattern = /(aws[_-]?access[_-]?key|aws[_-]?secret|azure[_-]?key|gcp[_-]?key)\s*[=:]\s*["']([^"']{10,})["']/i;
    if (cloudCredPattern.test(line)) {
      issues.push({
        type: 'Hardcoded Secret',
        location: `line ${lineNumber}`,
        file: '',
        line: lineNumber,
        severity: 'critical',
        message: 'Cloud service credentials detected',
        suggestion: 'Use IAM roles or secure credential management',
        cwe: 'CWE-798',
      });
    }

    // JWT secrets
    const jwtPattern = /(jwt[_-]?secret|secret[_-]?key)\s*[=:]\s*["']([^"']{16,})["']/i;
    if (jwtPattern.test(line)) {
      issues.push({
        type: 'Hardcoded Secret',
        location: `line ${lineNumber}`,
        file: '',
        line: lineNumber,
        severity: 'high',
        message: 'JWT secret key detected',
        suggestion: 'Store in secure configuration or environment variables',
        cwe: 'CWE-798',
      });
    }

    return issues;
  }

  /**
   * Detect SQL Injection vulnerabilities (language-aware)
   */
  private detectSQLInjection(line: string, lineLower: string, lineNumber: number, language: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Java patterns
    if (language === 'java' || language === 'unknown') {
      // Pattern: String concatenation in SQL query
      const sqlConcatPattern = /(executeQuery|executeUpdate|createStatement|prepareStatement|query)\s*\([^)]*\+[^)]*\)/i;
      if (sqlConcatPattern.test(line)) {
        issues.push({
          type: 'SQL Injection',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'critical',
          message: 'SQL query uses string concatenation - vulnerable to SQL injection',
          suggestion: 'Use parameterized queries (PreparedStatement) or ORM with parameter binding',
          cwe: 'CWE-89',
          owaspCategory: 'A03:2021 – Injection',
          cvssScore: 9.8,
        });
      }

      // Pattern: Direct SQL with user input
      if (/executeQuery|executeUpdate|createStatement/i.test(line) && 
          /request\.|getParameter|@RequestParam|@PathVariable/i.test(line)) {
        issues.push({
          type: 'SQL Injection',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'high',
          message: 'SQL query may contain user input without sanitization',
          suggestion: 'Validate and sanitize all user inputs, use parameterized queries',
          cwe: 'CWE-89',
        });
      }
    }

    // TypeScript/JavaScript patterns
    if (language === 'typescript' || language === 'javascript') {
      // Pattern: Template literal with user input in SQL query
      if (/SELECT|INSERT|UPDATE|DELETE|CREATE|DROP/i.test(line) && 
          /\$\{.*\}/.test(line) && 
          !/prepared|parameter|bind|query\(.*\?/.test(line)) {
        issues.push({
          type: 'SQL Injection',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'critical',
          message: 'SQL query uses template literal with user input - vulnerable to SQL injection',
          suggestion: 'Use parameterized queries (e.g., Prisma, TypeORM, or database client with parameter binding)',
          cwe: 'CWE-89',
          owaspCategory: 'A03:2021 – Injection',
          cvssScore: 9.8,
        });
      }

      // Pattern: String concatenation in fetch/axios query
      if (/(fetch|axios\.(get|post|put|delete)|\.query\(|\.execute\(|db\.query)/i.test(line) && 
          /\+.*userId|\+.*id|\+.*input|\+.*param/.test(line)) {
        issues.push({
          type: 'SQL Injection',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'high',
          message: 'Database query uses string concatenation with user input',
          suggestion: 'Use parameterized queries or query builders (Prisma, TypeORM, Knex)',
          cwe: 'CWE-89',
        });
      }

      // Pattern: SQL query construction with user input
      if (/buildQuery|createQuery|executeQuery/i.test(line) && 
          /SELECT|INSERT|UPDATE|DELETE/i.test(line) && 
          /\$\{|`.*\$\{|".*\+|'.*\+/.test(line)) {
        issues.push({
          type: 'SQL Injection',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'critical',
          message: 'SQL query construction with user input - vulnerable to injection',
          suggestion: 'Use parameterized queries or ORM with proper escaping',
          cwe: 'CWE-89',
          owaspCategory: 'A03:2021 – Injection',
          cvssScore: 9.8,
        });
      }
    }

    return issues;
  }

  /**
   * Detect XSS (Cross-Site Scripting) vulnerabilities (language-aware)
   */
  private detectXSS(line: string, lineLower: string, lineNumber: number, language: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Java patterns
    if (language === 'java' || language === 'unknown') {
      // Pattern: User input directly rendered in HTML
      if (/response\.getWriter\(\)|out\.print|response\.write/i.test(line) &&
          /request\.|getParameter|@RequestParam|@PathVariable/i.test(line)) {
        issues.push({
          type: 'XSS',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'high',
          message: 'User input directly rendered without sanitization',
          suggestion: 'Escape HTML entities or use templating engine with auto-escaping',
          cwe: 'CWE-79',
          owaspCategory: 'A03:2021 – Injection',
          cvssScore: 7.2,
        });
      }
    }

    // TypeScript/JavaScript patterns
    if (language === 'typescript' || language === 'javascript') {
      // Pattern: innerHTML with user input
      if (/innerHTML\s*=/.test(lineLower) && 
          (/\$\{|`.*\$\{|".*\+|'.*\+|input|userInput|param|query/.test(line))) {
        issues.push({
          type: 'XSS',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'high',
          message: 'innerHTML assignment with user input - vulnerable to XSS',
          suggestion: 'Use textContent, innerText, or sanitize HTML with DOMPurify before assignment',
          cwe: 'CWE-79',
          owaspCategory: 'A03:2021 – Injection',
          cvssScore: 7.2,
        });
      }

      // Pattern: dangerouslySetInnerHTML (React)
      if (/dangerouslySetInnerHTML/.test(line) && 
          (/\$\{|`.*\$\{|input|userInput|param/.test(line))) {
        issues.push({
          type: 'XSS',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'critical',
          message: 'dangerouslySetInnerHTML with user input - critical XSS vulnerability',
          suggestion: 'Sanitize HTML with DOMPurify or use safe alternatives like textContent',
          cwe: 'CWE-79',
          owaspCategory: 'A03:2021 – Injection',
          cvssScore: 8.5,
        });
      }

      // Pattern: Template literal in HTML/DOM manipulation
      if (/(innerHTML|outerHTML|insertAdjacentHTML|document\.write)\s*=/.test(lineLower) && 
          /\$\{|`.*\$\{/.test(line)) {
        issues.push({
          type: 'XSS',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'high',
          message: 'HTML manipulation with template literal - potential XSS',
          suggestion: 'Escape HTML entities or use textContent/innerText for safe text insertion',
          cwe: 'CWE-79',
        });
      }

      // Pattern: User input in HTML string construction
      if (/<div>|<span>|<p>|<h[1-6]>/.test(line) && 
          /\$\{|`.*\$\{|".*\+|'.*\+/.test(line) && 
          !/escape|sanitize|DOMPurify/.test(line)) {
        issues.push({
          type: 'XSS',
          location: `line ${lineNumber}`,
          file: '',
          line: lineNumber,
          severity: 'medium',
          message: 'HTML string construction with user input - potential XSS',
          suggestion: 'Escape HTML entities or use templating library with auto-escaping',
          cwe: 'CWE-79',
        });
      }
    }

    return issues;
  }

  /**
   * Detect IDOR (Insecure Direct Object Reference)
   */
  private detectIDOR(line: string, lineLower: string, lineNumber: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Pattern: Direct object access without authorization check
    if (/findById|getById|findOne|getOne/i.test(line) &&
        /@PathVariable|@RequestParam/i.test(line) &&
        !/hasPermission|isAuthorized|checkAccess|@PreAuthorize|@Secured/i.test(line)) {
      issues.push({
        type: 'IDOR',
        location: `line ${lineNumber}`,
        file: '',
        line: lineNumber,
        severity: 'high',
        message: 'Direct object access without authorization check',
        suggestion: 'Add authorization check before accessing resources',
        cwe: 'CWE-639',
        owaspCategory: 'A01:2021 – Broken Access Control',
        cvssScore: 7.5, // High - IDOR
      });
    }

    return issues;
  }
}




