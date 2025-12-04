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
   * Analyze code for security issues
   */
  analyzeSecurity(symbols: CodeSymbol[], codeContent: string): SecurityReport {
    const issues: SecurityIssue[] = [];
    const secrets: SecurityIssue[] = [];
    const sqlInjection: SecurityIssue[] = [];
    const xss: SecurityIssue[] = [];
    const idor: SecurityIssue[] = [];

    const allLines = codeContent.split('\n');

    // Analyze entire code content
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const lineLower = line.toLowerCase();

      // 1. Detect hardcoded secrets
      const secretIssues = this.detectSecrets(line, i + 1, codeContent);
      secrets.push(...secretIssues);
      issues.push(...secretIssues);

      // 2. Detect SQL Injection
      const sqlIssues = this.detectSQLInjection(line, lineLower, i + 1);
      sqlInjection.push(...sqlIssues);
      issues.push(...sqlIssues);

      // 3. Detect XSS vulnerabilities
      const xssIssues = this.detectXSS(line, lineLower, i + 1);
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
        file: '', // Will be set by caller
        line: lineNumber,
        severity: 'critical',
        message: 'Hardcoded API key detected',
        suggestion: 'Move to environment variables or secure configuration',
        cwe: 'CWE-798',
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
   * Detect SQL Injection vulnerabilities
   */
  private detectSQLInjection(line: string, lineLower: string, lineNumber: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

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

    return issues;
  }

  /**
   * Detect XSS (Cross-Site Scripting) vulnerabilities
   */
  private detectXSS(line: string, lineLower: string, lineNumber: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

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
      });
    }

    // Pattern: innerHTML with user input
    if (/innerHTML\s*=/.test(lineLower) && /request\.|getParameter|@RequestParam/i.test(line)) {
      issues.push({
        type: 'XSS',
        location: `line ${lineNumber}`,
        file: '',
        line: lineNumber,
        severity: 'high',
        message: 'innerHTML assignment with user input',
        suggestion: 'Use textContent or sanitize HTML before assignment',
        cwe: 'CWE-79',
      });
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
      });
    }

    return issues;
  }
}



