/**
 * Enterprise-grade review orchestrator
 * Coordinates all analysis phases
 */

import { PRData } from '../github.js';
import { ReviewProcessor } from '../review.js';
import { CodebaseIndexer } from '../indexer/indexer.js';
import { CodeExtractor } from '../parser/extractor.js';
import { GitHubClient } from '../github.js';
import { DuplicateDetector } from '../analysis/duplicates.js';
import { BreakingChangeDetector } from '../analysis/breaking.js';
import { PatternDetector, PatternDetection, AntiPattern } from '../analysis/patterns.js';
import { APIDesignReviewer, APIIssue, BackwardCompatibilityIssue } from '../analysis/api-design.js';
import { ComplexityAnalyzer, ComplexityMetrics, ComplexityHotspot } from '../analysis/complexity.js';
import { TestCoverageAnalyzer, CoverageMetrics, MissingTest, EdgeCase } from '../analysis/test-coverage.js';
import { DependencyAnalyzer, DependencyVulnerability, UnusedDependency, VersionConflict } from '../analysis/dependencies.js';
import { PerformanceAnalyzer, PerformanceReport, PerformanceIssue, CachingOpportunity } from '../analysis/performance.js';
import { SecurityAnalyzer, SecurityReport, SecurityIssue } from '../analysis/security.js';
import { DocumentationAnalyzer, DocumentationReport, DocumentationIssue } from '../analysis/documentation.js';
import { ErrorHandlingAnalyzer, ErrorHandlingReport, ErrorHandlingIssue } from '../analysis/error-handling.js';
import { ObservabilityAnalyzer, ObservabilityReport, ObservabilityIssue } from '../analysis/observability.js';
import { TestAutomationAnalyzer, TestAutomationReport } from '../analysis/test-automation/test-automation-analyzer.js';
import { TechnicalDebtAnalyzer, TechnicalDebtReport } from '../analysis/technical-debt.js';
import { MigrationSafetyAnalyzer, MigrationSafetyReport } from '../analysis/migration-safety.js';
import { OrganizationAnalyzer, OrganizationReport } from '../analysis/organization.js';

export interface EnterpriseReviewReport {
  prNumber: number;
  prTitle: string;
  totalIssues: number;
  issuesBySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  comments: any[];
  // Enterprise features
  duplicates?: {
    withinPR: number;
    crossRepo: number;
    details: any[];
  };
  breakingChanges?: {
    count: number;
    impactedFiles: string[];
    details: any[];
  };
  architectureViolations?: {
    count: number;
    details: any[];
  };
  designPatterns?: {
    detected: PatternDetection[];
    antiPatterns: AntiPattern[];
  };
  apiDesign?: {
    issues: APIIssue[];
    backwardCompatibility: BackwardCompatibilityIssue[];
  };
  complexity?: {
    hotspots: ComplexityHotspot[];
    averageMetrics: ComplexityMetrics;
  };
  testCoverage?: {
    coverage: CoverageMetrics;
    missingTests: MissingTest[];
    edgeCases: EdgeCase[];
  };
  dependencies?: {
    vulnerabilities: DependencyVulnerability[];
    unused: UnusedDependency[];
    conflicts: VersionConflict[];
  };
  performance?: {
    issues: PerformanceIssue[];
    cachingOpportunities: CachingOpportunity[];
    nPlusOneQueries: PerformanceIssue[];
    inefficientLoops: PerformanceIssue[];
    memoryLeaks: PerformanceIssue[];
  };
  security?: {
    issues: SecurityIssue[];
    critical: SecurityIssue[];
    high: SecurityIssue[];
    secrets: SecurityIssue[];
    sqlInjection: SecurityIssue[];
    xss: SecurityIssue[];
    idor: SecurityIssue[];
  };
  documentation?: {
    issues: DocumentationIssue[];
    qualityScore: number;
    coverage: {
      classes: number;
      methods: number;
      publicMethods: number;
    };
  };
  errorHandling?: {
    issues: ErrorHandlingIssue[];
    swallowedExceptions: ErrorHandlingIssue[];
    genericCatches: ErrorHandlingIssue[];
    missingErrorHandling: ErrorHandlingIssue[];
  };
  observability?: {
    issues: ObservabilityIssue[];
    loggingIssues: ObservabilityIssue[];
    metricsIssues: ObservabilityIssue[];
    missingErrorLogging: ObservabilityIssue[];
  };
  testAutomation?: TestAutomationReport;
  technicalDebt?: TechnicalDebtReport;
  migrationSafety?: MigrationSafetyReport;
  organization?: OrganizationReport;
  summary?: string;
  recommendations?: string;
  averageConfidence?: number;
}

export class EnterpriseReviewer {
  private reviewProcessor: ReviewProcessor;
  private indexer: CodebaseIndexer;
  private extractor: CodeExtractor;
  private duplicateDetector: DuplicateDetector;
  private breakingChangeDetector: BreakingChangeDetector;
  private patternDetector: PatternDetector;
  private apiDesignReviewer: APIDesignReviewer;
  private complexityAnalyzer: ComplexityAnalyzer;
  private testCoverageAnalyzer: TestCoverageAnalyzer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private securityAnalyzer: SecurityAnalyzer;
  private documentationAnalyzer: DocumentationAnalyzer;
  private errorHandlingAnalyzer: ErrorHandlingAnalyzer;
  private observabilityAnalyzer: ObservabilityAnalyzer;
  private testAutomationAnalyzer: TestAutomationAnalyzer;
  private technicalDebtAnalyzer: TechnicalDebtAnalyzer;
  private migrationSafetyAnalyzer: MigrationSafetyAnalyzer;
  private organizationAnalyzer: OrganizationAnalyzer;
  private github: GitHubClient;
  private vectorDB?: any;
  private embeddingGenerator?: any;
  private geminiKey: string;
  
  constructor(geminiKey: string, githubToken: string) {
    this.geminiKey = geminiKey;
    this.reviewProcessor = new ReviewProcessor(geminiKey);
    this.indexer = new CodebaseIndexer();
    this.extractor = new CodeExtractor();
    this.github = new GitHubClient(githubToken);
    
    // Initialize duplicate detector without embeddings first
    this.duplicateDetector = new DuplicateDetector(this.indexer);
    this.breakingChangeDetector = new BreakingChangeDetector(this.indexer);
    this.patternDetector = new PatternDetector();
    this.apiDesignReviewer = new APIDesignReviewer();
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.testCoverageAnalyzer = new TestCoverageAnalyzer();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.documentationAnalyzer = new DocumentationAnalyzer();
    this.errorHandlingAnalyzer = new ErrorHandlingAnalyzer();
    this.observabilityAnalyzer = new ObservabilityAnalyzer();
    this.testAutomationAnalyzer = new TestAutomationAnalyzer();
    this.technicalDebtAnalyzer = new TechnicalDebtAnalyzer();
    this.migrationSafetyAnalyzer = new MigrationSafetyAnalyzer();
    this.organizationAnalyzer = new OrganizationAnalyzer();
  }
  
  /**
   * Initialize embeddings and vector DB if index exists
   */
  async initializeIndex(geminiKey: string): Promise<void> {
    const { existsSync } = await import('fs');
    if (existsSync('.droog-embeddings.json')) {
      const { EmbeddingGenerator } = await import('../embeddings/generator.js');
      const { FileVectorDB } = await import('../storage/vector-db.js');
      this.embeddingGenerator = new EmbeddingGenerator(geminiKey);
      this.vectorDB = new FileVectorDB();
      
      // Re-initialize duplicate detector with embeddings
      this.duplicateDetector = new DuplicateDetector(this.indexer, this.embeddingGenerator, this.vectorDB);
    }
  }
  
  /**
   * Full enterprise review with all phases
   * OPTIMIZED: Collects all data first, then reviews with full context
   */
  async reviewPR(prData: PRData, useIndex: boolean = false, geminiKey?: string): Promise<EnterpriseReviewReport> {
    console.log('🚀 Starting Enterprise Code Review...\n');
    
    // Initialize index if requested
    if (useIndex && geminiKey) {
      await this.initializeIndex(geminiKey);
    }
    
    // OPTIMIZATION: Phase 0 - Parse and collect all data FIRST
    console.log('📋 Phase 0: Collecting All Data & Building Context...');
    
    // Parse all PR files first
    const prSymbols: any[] = [];
    const prFileContents: Map<string, string> = new Map();
    
    for (const file of prData.files) {
      if (file.patch) {
        const code = this.extractCodeFromPatch(file.patch);
        if (code) {
          prFileContents.set(file.filename, code);
          const parsed = await this.extractor.extractFromJava(code, file.filename);
          prSymbols.push(...parsed.symbols);
          await this.indexer.indexFile(file.filename, code);
        }
      }
    }
    console.log(`✓ Extracted ${prSymbols.length} symbols from ${prFileContents.size} PR files`);
    
    // Get main branch symbols if index available
    let mainBranchSymbols: any[] = [];
    if (useIndex) {
      const index = this.indexer.getIndex();
      mainBranchSymbols = index.symbols || [];
      console.log(`✓ Loaded ${mainBranchSymbols.length} symbols from main branch index`);
    }
    
    // Build context: Run all analysis phases to gather context
    console.log('\n📋 Phase 0.1: Building Analysis Context...');
    
    // Duplicate detection
    const withinPRDuplicates = await this.duplicateDetector.detectWithinPR(prSymbols);
    let crossRepoDuplicates: any[] = [];
    if (useIndex) {
      crossRepoDuplicates = await this.duplicateDetector.detectCrossRepo(prSymbols);
    }
    console.log(`✓ Found ${withinPRDuplicates.length} within-PR duplicates, ${crossRepoDuplicates.length} cross-repo duplicates`);
    
    // Breaking changes
    const breakingChanges = this.breakingChangeDetector.detectBreakingChanges(prSymbols);
    console.log(`✓ Found ${breakingChanges.length} breaking changes`);
    
    // Design patterns
    const patterns = this.patternDetector.detectPatterns(prSymbols);
    const antiPatterns = this.patternDetector.detectAntiPatterns(prSymbols);
    console.log(`✓ Detected ${patterns.length} patterns, ${antiPatterns.length} anti-patterns`);
    
    // Complexity
    const complexityHotspots = this.complexityAnalyzer.findHotspots(prSymbols);
    console.log(`✓ Found ${complexityHotspots.length} complexity hotspots`);
    
    // API Design
    const apiIssues: any[] = [];
    const apiBackwardCompatibility: any[] = [];
    for (const [filename, code] of prFileContents.entries()) {
      if (filename.includes('Controller') || filename.includes('Resource') || filename.includes('Api')) {
        const fileSymbols = prSymbols.filter(s => s.file === filename);
        const review = this.apiDesignReviewer.reviewAPIDesign(fileSymbols, code);
        apiIssues.push(...review.issues);
        apiBackwardCompatibility.push(...review.backwardCompatibility);
      }
    }
    if (useIndex) {
      const bcIssues = this.apiDesignReviewer.detectBackwardCompatibilityIssues(prSymbols, mainBranchSymbols);
      apiBackwardCompatibility.push(...bcIssues);
    }
    console.log(`✓ Found ${apiIssues.length} API design issues`);
    
    // Test Coverage
    const sourceSymbols = prSymbols.filter(s => !s.file.toLowerCase().includes('test') && !s.file.toLowerCase().includes('spec'));
    const testSymbols = prSymbols.filter(s => s.file.toLowerCase().includes('test') || s.file.toLowerCase().includes('spec'));
    const coverageAnalysis = this.testCoverageAnalyzer.analyzeCoverage(sourceSymbols, testSymbols);
    console.log(`✓ Coverage: ${coverageAnalysis.coverage.methodCoverage.toFixed(1)}% method coverage`);
    
    // Dependencies
    const buildFilesForDep = prData.files.filter(f => f.filename.includes('pom.xml') || f.filename.includes('build.gradle') || f.filename.includes('package.json'));
    let depAnalysis: { vulnerabilities: DependencyVulnerability[]; unused: UnusedDependency[]; conflicts: VersionConflict[] } = { 
      vulnerabilities: [], 
      unused: [], 
      conflicts: [] 
    };
    if (buildFilesForDep.length > 0) {
      const buildFile = buildFilesForDep[0];
      if (buildFile.patch) {
        const buildContent = this.extractCodeFromPatch(buildFile.patch || '');
        if (buildContent) {
          const sourceContent = Array.from(prFileContents.values()).join('\n');
          const depResult = await this.dependencyAnalyzer.analyzeDependencies(buildContent, [sourceContent]);
          depAnalysis = {
            vulnerabilities: depResult.vulnerabilities || [],
            unused: depResult.unused || [],
            conflicts: depResult.conflicts || []
          };
        }
      }
    }
    console.log(`✓ Dependency analysis complete`);
    
    // Phase 2: Advanced Analysis (Performance, Security, Documentation, Error Handling, Observability)
    console.log('\n📋 Phase 0.2: Advanced Analysis...');
    
    // 2.1 Performance Analysis
    console.log('  📋 Performance Analysis...');
    const performanceReports: PerformanceReport[] = [];
    for (const [filename, code] of prFileContents.entries()) {
      const fileSymbols = prSymbols.filter(s => s.file === filename);
      const perfReport = this.performanceAnalyzer.analyzePerformance(fileSymbols, code);
      performanceReports.push(perfReport);
    }
    const allPerformanceIssues = performanceReports.flatMap(r => r.issues);
    const allCachingOpportunities = performanceReports.flatMap(r => r.cachingOpportunities);
    const allNPlusOneQueries = performanceReports.flatMap(r => r.nPlusOneQueries);
    const allInefficientLoops = performanceReports.flatMap(r => r.inefficientLoops);
    const allMemoryLeaks = performanceReports.flatMap(r => r.memoryLeaks);
    console.log(`  ✓ Found ${allPerformanceIssues.length} performance issues`);
    
    // 2.2 Security Analysis
    console.log('  📋 Security Analysis...');
    const securityReports: SecurityReport[] = [];
    for (const [filename, code] of prFileContents.entries()) {
      const fileSymbols = prSymbols.filter(s => s.file === filename);
      const secReport = this.securityAnalyzer.analyzeSecurity(fileSymbols, code);
      // Set file names
      secReport.issues.forEach(issue => issue.file = filename);
      secReport.secrets.forEach(issue => issue.file = filename);
      secReport.sqlInjection.forEach(issue => issue.file = filename);
      secReport.xss.forEach(issue => issue.file = filename);
      secReport.idor.forEach(issue => issue.file = filename);
      securityReports.push(secReport);
    }
    const allSecurityIssues = securityReports.flatMap(r => r.issues);
    const allCriticalSecurity = securityReports.flatMap(r => r.critical);
    const allHighSecurity = securityReports.flatMap(r => r.high);
    const allSecrets = securityReports.flatMap(r => r.secrets);
    const allSQLInjection = securityReports.flatMap(r => r.sqlInjection);
    const allXSS = securityReports.flatMap(r => r.xss);
    const allIDOR = securityReports.flatMap(r => r.idor);
    console.log(`  ✓ Found ${allSecurityIssues.length} security issues (${allCriticalSecurity.length} critical)`);
    
    // 2.3 Documentation Analysis
    console.log('  📋 Documentation Analysis...');
    const docReport = this.documentationAnalyzer.analyzeDocumentation(prSymbols, Array.from(prFileContents.values()).join('\n'));
    console.log(`  ✓ Documentation quality: ${docReport.qualityScore}/100`);
    
    // 2.4 Error Handling Analysis
    console.log('  📋 Error Handling Analysis...');
    const errorHandlingReport = this.errorHandlingAnalyzer.analyzeErrorHandling(prSymbols, Array.from(prFileContents.values()).join('\n'));
    console.log(`  ✓ Found ${errorHandlingReport.issues.length} error handling issues`);
    
    // 2.5 Observability Analysis
    console.log('  📋 Observability Analysis...');
    const observabilityReport = this.observabilityAnalyzer.analyzeObservability(prSymbols, Array.from(prFileContents.values()).join('\n'));
    console.log(`  ✓ Found ${observabilityReport.issues.length} observability issues`);
    
    // Build comprehensive context object
    const reviewContext = {
      prSymbols,
      mainBranchSymbols,
      prFileContents: Object.fromEntries(prFileContents),
      duplicates: {
        withinPR: withinPRDuplicates,
        crossRepo: crossRepoDuplicates
      },
      breakingChanges,
      patterns,
      antiPatterns,
      complexityHotspots,
      apiIssues,
      apiBackwardCompatibility,
      coverageAnalysis,
      dependencies: depAnalysis,
      performance: {
        issues: allPerformanceIssues,
        cachingOpportunities: allCachingOpportunities,
        nPlusOneQueries: allNPlusOneQueries,
        inefficientLoops: allInefficientLoops,
        memoryLeaks: allMemoryLeaks,
      },
      security: {
        issues: allSecurityIssues,
        critical: allCriticalSecurity,
        high: allHighSecurity,
        secrets: allSecrets,
        sqlInjection: allSQLInjection,
        xss: allXSS,
        idor: allIDOR,
      },
      documentation: {
        issues: docReport.issues,
        qualityScore: docReport.qualityScore,
        coverage: docReport.coverage,
      },
      errorHandling: {
        issues: errorHandlingReport.issues,
        swallowedExceptions: errorHandlingReport.swallowedExceptions,
        genericCatches: errorHandlingReport.genericCatches,
        missingErrorHandling: errorHandlingReport.missingErrorHandling,
      },
      observability: {
        issues: observabilityReport.issues,
        loggingIssues: observabilityReport.loggingIssues,
        metricsIssues: observabilityReport.metricsIssues,
        missingErrorLogging: observabilityReport.missingErrorLogging,
      },
    };
    
    console.log('\n✓ Context built! Starting AI review with full context...\n');
    
    // Phase 1: Basic review with FULL CONTEXT
    console.log('📋 Phase 1: AI Review (with Full Context)...');
    const basicReport = await this.reviewProcessor.processPR(prData, reviewContext);
    
    const enterpriseReport: EnterpriseReviewReport = {
      ...basicReport,
      duplicates: { 
        withinPR: withinPRDuplicates.length, 
        crossRepo: crossRepoDuplicates.length, 
        details: [...withinPRDuplicates.map(d => ({
          file1: d.symbol1.file,
          file2: d.symbol2.file,
          symbol1: d.symbol1.name,
          symbol2: d.symbol2.name,
          similarity: d.similarity,
          type: d.type,
          reason: d.reason,
        })), ...crossRepoDuplicates.map(d => ({
          file1: d.symbol1.file,
          file2: d.symbol2.file,
          symbol1: d.symbol1.name,
          symbol2: d.symbol2.name,
          similarity: d.similarity,
          type: d.type,
          reason: d.reason,
        }))]
      },
      breakingChanges: { 
        count: breakingChanges.length, 
        impactedFiles: [...new Set(breakingChanges.flatMap(bc => bc.impactedFiles))], 
        details: breakingChanges.map(bc => {
          // Calculate impact score based on call sites
          const impactScore = this.calculateImpactScore(bc.callSites.length, bc.impactedFiles.length, bc.severity);
          
          // Format call sites with file and line information
          const callSiteDetails = bc.callSites.map(cs => ({
            file: cs.file,
            line: cs.line,
            caller: cs.caller,
          }));
          
          return {
            symbol: bc.symbol.name,
            file: bc.symbol.file,
            line: bc.symbol.startLine,
            changeType: bc.changeType,
            message: bc.message,
            severity: bc.severity,
            oldSignature: bc.oldSignature,
            newSignature: bc.newSignature,
            impactedFiles: bc.impactedFiles,
            callSites: {
              count: bc.callSites.length,
              details: callSiteDetails,
            },
            impactScore,
          };
        })
      },
      architectureViolations: { count: 0, details: [] },
      designPatterns: { detected: patterns, antiPatterns: antiPatterns },
      apiDesign: { issues: apiIssues, backwardCompatibility: apiBackwardCompatibility },
      complexity: { 
        hotspots: complexityHotspots, 
        averageMetrics: this.calculateAverageComplexity(prSymbols)
      },
      testCoverage: coverageAnalysis,
      dependencies: depAnalysis,
      performance: {
        issues: allPerformanceIssues,
        cachingOpportunities: allCachingOpportunities,
        nPlusOneQueries: allNPlusOneQueries,
        inefficientLoops: allInefficientLoops,
        memoryLeaks: allMemoryLeaks,
      },
      security: {
        issues: allSecurityIssues,
        critical: allCriticalSecurity,
        high: allHighSecurity,
        secrets: allSecrets,
        sqlInjection: allSQLInjection,
        xss: allXSS,
        idor: allIDOR,
      },
      documentation: {
        issues: docReport.issues,
        qualityScore: docReport.qualityScore,
        coverage: docReport.coverage,
      },
      errorHandling: {
        issues: errorHandlingReport.issues,
        swallowedExceptions: errorHandlingReport.swallowedExceptions,
        genericCatches: errorHandlingReport.genericCatches,
        missingErrorHandling: errorHandlingReport.missingErrorHandling,
      },
      observability: {
        issues: observabilityReport.issues,
        loggingIssues: observabilityReport.loggingIssues,
        metricsIssues: observabilityReport.metricsIssues,
        missingErrorLogging: observabilityReport.missingErrorLogging,
      },
    };
    
    // All analysis already done in Phase 0, now just run architecture rules
    // Phase 2: Architecture rules
    console.log('\n📋 Phase 6: Architecture Rules...');
    const { ArchitectureRulesEngine } = await import('../rules/engine.js');
    const rulesEngine = new ArchitectureRulesEngine();
    
    // Collect all parsed files
    const parsedFiles: any[] = [];
    for (const file of prData.files) {
      if (file.patch) {
        const code = this.extractCodeFromPatch(file.patch);
        if (code) {
          // Use async method to enable tree-sitter
          const parsed = await this.extractor.extractFromJava(code, file.filename);
          parsedFiles.push(parsed);
        }
      }
    }
    
    const violations = rulesEngine.checkRules(parsedFiles);
    if (enterpriseReport.architectureViolations) {
      enterpriseReport.architectureViolations.count = violations.length;
      enterpriseReport.architectureViolations.details = violations.map(v => ({
      rule: v.rule,
      severity: v.severity,
      file: v.file,
      line: v.line,
      message: v.message,
      suggestion: v.suggestion,
    }));
    }
    console.log(`✓ Found ${violations.length} architecture violations`);
    
    // Phase 7: Calculate confidence scores
    console.log('\n📋 Phase 7: Calculating Confidence Scores...');
    const confidences = enterpriseReport.comments
      .map(c => (c as any).confidence)
      .filter((c): c is number => typeof c === 'number');
    
    if (confidences.length > 0) {
      enterpriseReport.averageConfidence = 
        confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    }
    const avgConfidence = enterpriseReport.averageConfidence || 0;
    console.log(`✓ Average confidence: ${(avgConfidence * 100).toFixed(2)}%`);

    // Phase 8: Generate summary
    console.log('\n📋 Phase 8: Generating Summary...');
    enterpriseReport.summary = this.generateSummary(enterpriseReport);
    
    // Phase 9: Generate AI-powered recommendations
    console.log('\n📋 Phase 9: Generating AI-Powered Recommendations...');
    
    // Get index context
    const indexContext = {
      hasIndex: useIndex,
      indexedSymbols: useIndex ? this.indexer.getIndex().symbols.length : undefined,
      similarCodeFound: useIndex && enterpriseReport.duplicates ? enterpriseReport.duplicates.crossRepo : undefined,
    };
    
    // Generate intelligent recommendations using AI
    try {
      const { RecommendationGenerator } = await import('./recommendations.js');
      const recommendationGenerator = new RecommendationGenerator(this.geminiKey);
      enterpriseReport.recommendations = await recommendationGenerator.generateRecommendations(
        enterpriseReport,
        indexContext
      );
      console.log('✓ AI-powered recommendations generated');
    } catch (error: any) {
      console.warn('⚠️  AI recommendation generation failed, using fallback:', error.message);
      enterpriseReport.recommendations = this.generateRecommendations(enterpriseReport);
    }
    
    return enterpriseReport;
  }
  
  /**
   * Calculate average complexity metrics
   */
  private calculateAverageComplexity(symbols: any[]): ComplexityMetrics {
    let totalCyclomatic = 0;
    let totalCognitive = 0;
    let totalLines = 0;
    let methodCount = 0;
    
    for (const symbol of symbols) {
      if (symbol.type === 'method') {
        const metrics = this.complexityAnalyzer.calculateComplexity(symbol);
        totalCyclomatic += metrics.cyclomaticComplexity;
        totalCognitive += metrics.cognitiveComplexity;
        totalLines += metrics.linesOfCode;
        methodCount++;
      }
    }
    
    return {
      cyclomaticComplexity: methodCount > 0 ? totalCyclomatic / methodCount : 0,
      cognitiveComplexity: methodCount > 0 ? totalCognitive / methodCount : 0,
      maintainabilityIndex: methodCount > 0 ? 
        this.complexityAnalyzer.calculateComplexity(symbols[0] || {}).maintainabilityIndex : 100,
      linesOfCode: methodCount > 0 ? totalLines / methodCount : 0
    };
  }

  private extractCodeFromPatch(patch: string): string | null {
    // Extract added lines from patch
    const lines = patch.split('\n');
    const codeLines: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        codeLines.push(line.substring(1));
      }
    }
    
    return codeLines.length > 0 ? codeLines.join('\n') : null;
  }
  
  private generateSummary(report: EnterpriseReviewReport): string {
    let summary = `# PR Review Summary\n\n`;
    summary += `**Total Issues:** ${report.totalIssues}\n`;
    summary += `- High: ${report.issuesBySeverity.high}\n`;
    summary += `- Medium: ${report.issuesBySeverity.medium}\n`;
    
    // Add design patterns section
    if (report.designPatterns && (report.designPatterns.detected.length > 0 || report.designPatterns.antiPatterns.length > 0)) {
      summary += `\n## Design Patterns\n\n`;
      if (report.designPatterns.detected.length > 0) {
        summary += `**Detected Patterns:** ${report.designPatterns.detected.length}\n`;
        report.designPatterns.detected.forEach(p => {
          summary += `- ${p.pattern} in ${p.location} (${p.file})\n`;
        });
      }
      if (report.designPatterns.antiPatterns.length > 0) {
        summary += `\n**Anti-Patterns:** ${report.designPatterns.antiPatterns.length}\n`;
        report.designPatterns.antiPatterns.forEach(ap => {
          summary += `- ${ap.type} in ${ap.location} (${ap.file}) - ${ap.severity}\n`;
        });
      }
    }
    summary += `- Low: ${report.issuesBySeverity.low}\n\n`;
    
    if (report.duplicates && report.duplicates.withinPR > 0) {
      summary += `**Duplicates Found:** ${report.duplicates.withinPR} within PR\n`;
      if (report.duplicates.crossRepo > 0) {
        summary += `**Cross-Repo Duplicates:** ${report.duplicates.crossRepo} found\n`;
      }
    }
    
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      summary += `\n## Breaking Changes\n\n`;
      summary += `**Total:** ${report.breakingChanges.count} breaking change(s) detected\n\n`;
      
      report.breakingChanges.details.forEach((bc: any) => {
        summary += `### ${bc.symbol} (${bc.changeType})\n`;
        summary += `- **File:** ${bc.file}:${bc.line}\n`;
        summary += `- **Change:** ${bc.oldSignature || 'N/A'} → ${bc.newSignature || 'N/A'}\n`;
        summary += `- **Severity:** ${bc.severity}\n`;
        summary += `- **Impact Score:** ${bc.impactScore}/100\n`;
        
        if (bc.callSites && bc.callSites.count > 0) {
          summary += `- **Call Sites:** ${bc.callSites.count} found\n`;
          summary += `- **Impacted Files:** ${bc.impactedFiles.length}\n\n`;
          
          if (bc.callSites.details && bc.callSites.details.length > 0) {
            summary += `**Affected Areas in Main Branch:**\n`;
            bc.callSites.details.slice(0, 10).forEach((cs: any) => {
              summary += `  - ${cs.file}:${cs.line} (called from ${cs.caller})\n`;
            });
            if (bc.callSites.details.length > 10) {
              summary += `  ... and ${bc.callSites.details.length - 10} more\n`;
            }
            summary += `\n`;
          }
        } else {
          summary += `- **Call Sites:** None found (may be external API or new code)\n\n`;
        }
      });
    }

    if (report.architectureViolations && report.architectureViolations.count > 0) {
      summary += `**Architecture Violations:** ${report.architectureViolations.count} found\n`;
    }

    if (report.apiDesign && (report.apiDesign.issues.length > 0 || report.apiDesign.backwardCompatibility.length > 0)) {
      summary += `\n## API Design\n\n`;
      if (report.apiDesign.issues.length > 0) {
        summary += `**API Issues:** ${report.apiDesign.issues.length}\n`;
        report.apiDesign.issues.forEach(issue => {
          summary += `- ${issue.issue} in ${issue.endpoint || 'unknown'} (${issue.file}:${issue.line}) - ${issue.severity}\n`;
        });
      }
      if (report.apiDesign.backwardCompatibility.length > 0) {
        summary += `\n**Backward Compatibility Issues:** ${report.apiDesign.backwardCompatibility.length}\n`;
        report.apiDesign.backwardCompatibility.forEach(bc => {
          summary += `- ${bc.change} in ${bc.endpoint} - ${bc.impact}\n`;
        });
      }
    }

    if (report.complexity && report.complexity.hotspots.length > 0) {
      summary += `\n## Code Complexity\n\n`;
      summary += `**Complexity Hotspots:** ${report.complexity.hotspots.length}\n`;
      summary += `**Average Cyclomatic Complexity:** ${report.complexity.averageMetrics.cyclomaticComplexity.toFixed(2)}\n`;
      summary += `**Average Cognitive Complexity:** ${report.complexity.averageMetrics.cognitiveComplexity.toFixed(2)}\n`;
      summary += `**Maintainability Index:** ${report.complexity.averageMetrics.maintainabilityIndex.toFixed(1)}\n`;
      if (report.complexity.hotspots.length > 0) {
        summary += `\n**Top Hotspots:**\n`;
        report.complexity.hotspots.slice(0, 5).forEach(h => {
          summary += `- ${h.method} in ${h.file} (complexity: ${h.complexity}) - ${h.severity}\n`;
        });
      }
    }

    if (report.testCoverage) {
      summary += `\n## Test Coverage\n\n`;
      summary += `**Line Coverage:** ${report.testCoverage.coverage.lineCoverage}%\n`;
      summary += `**Branch Coverage:** ${report.testCoverage.coverage.branchCoverage}%\n`;
      summary += `**Method Coverage:** ${report.testCoverage.coverage.methodCoverage}%\n`;
      if (report.testCoverage.missingTests.length > 0) {
        summary += `\n**Missing Tests:** ${report.testCoverage.missingTests.length}\n`;
        report.testCoverage.missingTests.slice(0, 5).forEach(mt => {
          summary += `- ${mt.method} in ${mt.file} - ${mt.severity}\n`;
        });
      }
      if (report.testCoverage.edgeCases.length > 0) {
        summary += `\n**Missing Edge Cases:** ${report.testCoverage.edgeCases.length}\n`;
      }
    }

    if (report.dependencies && (report.dependencies.vulnerabilities.length > 0 || report.dependencies.unused.length > 0 || report.dependencies.conflicts.length > 0)) {
      summary += `\n## Dependencies\n\n`;
      if (report.dependencies.vulnerabilities.length > 0) {
        summary += `**Vulnerabilities:** ${report.dependencies.vulnerabilities.length}\n`;
      }
      if (report.dependencies.unused.length > 0) {
        summary += `**Unused Dependencies:** ${report.dependencies.unused.length}\n`;
        report.dependencies.unused.slice(0, 5).forEach(ud => {
          summary += `- ${ud.dependency}\n`;
        });
      }
      if (report.dependencies.conflicts.length > 0) {
        summary += `**Version Conflicts:** ${report.dependencies.conflicts.length}\n`;
      }
    }

    if (report.performance && report.performance.issues.length > 0) {
      summary += `\n## Performance\n\n`;
      summary += `**Performance Issues:** ${report.performance.issues.length}\n`;
      if (report.performance.nPlusOneQueries.length > 0) {
        summary += `- N+1 Query Problems: ${report.performance.nPlusOneQueries.length}\n`;
      }
      if (report.performance.inefficientLoops.length > 0) {
        summary += `- Inefficient Loops: ${report.performance.inefficientLoops.length}\n`;
      }
      if (report.performance.memoryLeaks.length > 0) {
        summary += `- Memory Leaks: ${report.performance.memoryLeaks.length}\n`;
      }
      if (report.performance.cachingOpportunities.length > 0) {
        summary += `- Caching Opportunities: ${report.performance.cachingOpportunities.length}\n`;
      }
    }

    if (report.security && report.security.issues.length > 0) {
      summary += `\n## Security\n\n`;
      summary += `**Security Issues:** ${report.security.issues.length}\n`;
      if (report.security.critical.length > 0) {
        summary += `- Critical: ${report.security.critical.length}\n`;
        report.security.critical.slice(0, 3).forEach(issue => {
          summary += `  - ${issue.type} in ${issue.location}\n`;
        });
      }
      if (report.security.high.length > 0) {
        summary += `- High: ${report.security.high.length}\n`;
      }
      if (report.security.secrets.length > 0) {
        summary += `- Hardcoded Secrets: ${report.security.secrets.length}\n`;
      }
      if (report.security.sqlInjection.length > 0) {
        summary += `- SQL Injection: ${report.security.sqlInjection.length}\n`;
      }
      if (report.security.xss.length > 0) {
        summary += `- XSS Vulnerabilities: ${report.security.xss.length}\n`;
      }
    }

    if (report.documentation) {
      summary += `\n## Documentation\n\n`;
      summary += `**Quality Score:** ${report.documentation.qualityScore}/100\n`;
      summary += `**Coverage:** Classes ${report.documentation.coverage.classes}%, Methods ${report.documentation.coverage.methods}%, Public Methods ${report.documentation.coverage.publicMethods}%\n`;
      if (report.documentation.issues.length > 0) {
        summary += `**Issues:** ${report.documentation.issues.length}\n`;
      }
    }

    if (report.errorHandling && report.errorHandling.issues.length > 0) {
      summary += `\n## Error Handling\n\n`;
      summary += `**Error Handling Issues:** ${report.errorHandling.issues.length}\n`;
      if (report.errorHandling.swallowedExceptions.length > 0) {
        summary += `- Swallowed Exceptions: ${report.errorHandling.swallowedExceptions.length}\n`;
      }
      if (report.errorHandling.genericCatches.length > 0) {
        summary += `- Generic Exception Catches: ${report.errorHandling.genericCatches.length}\n`;
      }
      if (report.errorHandling.missingErrorHandling.length > 0) {
        summary += `- Missing Error Handling: ${report.errorHandling.missingErrorHandling.length}\n`;
      }
    }

    if (report.observability && report.observability.issues.length > 0) {
      summary += `\n## Observability\n\n`;
      summary += `**Observability Issues:** ${report.observability.issues.length}\n`;
      if (report.observability.missingErrorLogging.length > 0) {
        summary += `- Missing Error Logging: ${report.observability.missingErrorLogging.length}\n`;
      }
      if (report.observability.loggingIssues.length > 0) {
        summary += `- Logging Issues: ${report.observability.loggingIssues.length}\n`;
      }
      if (report.observability.metricsIssues.length > 0) {
        summary += `- Missing Metrics: ${report.observability.metricsIssues.length}\n`;
      }
    }

    if (report.testAutomation) {
      summary += `\n## Test Automation Framework Review\n\n`;
      summary += `**Framework:** ${report.testAutomation.framework} (${(report.testAutomation.frameworkConfidence * 100).toFixed(0)}% confidence)\n`;
      
      if (report.testAutomation.flowValidation.issues.length > 0) {
        summary += `\n**Flow Validation Issues:** ${report.testAutomation.flowValidation.issues.length}\n`;
        if (report.testAutomation.flowValidation.missingLinks.length > 0) {
          summary += `- Missing Links: ${report.testAutomation.flowValidation.missingLinks.length}\n`;
        }
        if (report.testAutomation.flowValidation.contextMismatches.length > 0) {
          summary += `- Context Mismatches: ${report.testAutomation.flowValidation.contextMismatches.length}\n`;
        }
      }
      
      if (report.testAutomation.bestPractices.issues.length > 0) {
        summary += `\n**Best Practices Issues:** ${report.testAutomation.bestPractices.issues.length}\n`;
        if (report.testAutomation.bestPractices.locatorIssues.length > 0) {
          summary += `- Locator Strategy: ${report.testAutomation.bestPractices.locatorIssues.length}\n`;
        }
        if (report.testAutomation.bestPractices.waitStrategyIssues.length > 0) {
          summary += `- Wait Strategy: ${report.testAutomation.bestPractices.waitStrategyIssues.length}\n`;
        }
      }
      
      if (report.testAutomation.duplicateLocators.length > 0 || 
          report.testAutomation.duplicateMethods.length > 0) {
        summary += `\n**Duplicates:**\n`;
        summary += `- Duplicate Locators: ${report.testAutomation.duplicateLocators.length}\n`;
        summary += `- Duplicate Methods: ${report.testAutomation.duplicateMethods.length}\n`;
        summary += `- Duplicate Step Definitions: ${report.testAutomation.duplicateStepDefs.length}\n`;
      }
    }

    if (report.technicalDebt) {
      summary += `\n## Technical Debt\n\n`;
      summary += `**Debt Score:** ${report.technicalDebt.score.total}/10 (${report.technicalDebt.score.priority} priority)\n`;
      summary += `**Estimated Debt Hours:** ${report.technicalDebt.score.debtHours}h\n`;
      summary += `\n**Breakdown:**\n`;
      summary += `- Code Smells: ${report.technicalDebt.score.breakdown.codeSmells.toFixed(1)}/10\n`;
      summary += `- Complexity: ${report.technicalDebt.score.breakdown.complexity.toFixed(1)}/10\n`;
      summary += `- Duplication: ${report.technicalDebt.score.breakdown.duplication.toFixed(1)}/10\n`;
      summary += `- Test Coverage: ${report.technicalDebt.score.breakdown.testCoverage.toFixed(1)}/10\n`;
      summary += `- Security: ${report.technicalDebt.score.breakdown.security.toFixed(1)}/10\n`;
      summary += `- Documentation: ${report.technicalDebt.score.breakdown.documentation.toFixed(1)}/10\n`;
      
      if (report.technicalDebt.reductionStrategy.length > 0) {
        summary += `\n**Top Reduction Strategies:**\n`;
        report.technicalDebt.reductionStrategy.slice(0, 3).forEach(strategy => {
          summary += `- [${strategy.priority.toUpperCase()}] ${strategy.description} (${strategy.estimatedHours}h) - ${strategy.impact}\n`;
        });
      }
    }

    if (report.migrationSafety) {
      summary += `\n## Migration Safety\n\n`;
      summary += `**Risk Level:** ${report.migrationSafety.riskLevel.toUpperCase()}\n`;
      summary += `**Rollback Feasible:** ${report.migrationSafety.rollbackSafety.feasible ? 'Yes' : 'No'} (${report.migrationSafety.rollbackSafety.estimatedTime})\n`;
      
      if (report.migrationSafety.risks.length > 0) {
        summary += `\n**Risks:**\n`;
        report.migrationSafety.risks.slice(0, 3).forEach(risk => {
          summary += `- [${risk.level.toUpperCase()}] ${risk.category}: ${risk.description}\n`;
        });
      }
      
      if (report.migrationSafety.recommendations.length > 0) {
        summary += `\n**Recommendations:**\n`;
        report.migrationSafety.recommendations.slice(0, 5).forEach(rec => {
          summary += `- ${rec}\n`;
        });
      }
    }

    if (report.organization && report.organization.issues.length > 0) {
      summary += `\n## Code Organization\n\n`;
      summary += `**Organization Issues:** ${report.organization.issues.length}\n`;
      if (report.organization.layerViolations.length > 0) {
        summary += `- Layer Violations: ${report.organization.layerViolations.length}\n`;
      }
      if (report.organization.packageStructureIssues.length > 0) {
        summary += `- Package Structure Issues: ${report.organization.packageStructureIssues.length}\n`;
      }
      if (report.organization.socIssues.length > 0) {
        summary += `- Separation of Concerns Issues: ${report.organization.socIssues.length}\n`;
      }
    }

    if (report.averageConfidence !== undefined) {
      summary += `\n**Average Confidence:** ${(report.averageConfidence * 100).toFixed(1)}%\n`;
    }
    
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      summary += `\n## Breaking Changes\n\n`;
      summary += `**Total:** ${report.breakingChanges.count} breaking change(s) detected\n\n`;
      
      report.breakingChanges.details.forEach((bc: any) => {
        summary += `### ${bc.symbol} (${bc.changeType})\n`;
        summary += `- **File:** ${bc.file}:${bc.line || 'N/A'}\n`;
        if (bc.oldSignature || bc.newSignature) {
          summary += `- **Change:** ${bc.oldSignature || 'N/A'} → ${bc.newSignature || 'N/A'}\n`;
        }
        summary += `- **Severity:** ${bc.severity}\n`;
        if (bc.impactScore !== undefined) {
          summary += `- **Impact Score:** ${bc.impactScore}/100\n`;
        }
        
        if (bc.callSites && bc.callSites.count > 0) {
          summary += `- **Call Sites:** ${bc.callSites.count} found\n`;
          summary += `- **Impacted Files:** ${bc.impactedFiles?.length || 0}\n\n`;
          
          if (bc.callSites.details && bc.callSites.details.length > 0) {
            summary += `**Affected Areas in Main Branch:**\n`;
            bc.callSites.details.slice(0, 10).forEach((cs: any) => {
              summary += `  - ${cs.file}:${cs.line} (called from ${cs.caller})\n`;
            });
            if (bc.callSites.details.length > 10) {
              summary += `  ... and ${bc.callSites.details.length - 10} more\n`;
            }
            summary += `\n`;
          }
        } else {
          summary += `- **Call Sites:** None found (may be external API or new code)\n\n`;
        }
      });
    }
    
    return summary;
  }

  /**
   * Calculate impact score for breaking changes
   */
  private calculateImpactScore(callSiteCount: number, impactedFileCount: number, severity: string): number {
    // Base score from call sites (0-50 points)
    const callSiteScore = Math.min(callSiteCount * 5, 50);
    
    // File impact score (0-30 points)
    const fileScore = Math.min(impactedFileCount * 10, 30);
    
    // Severity multiplier (0-20 points)
    const severityMultiplier = severity === 'high' ? 20 : severity === 'medium' ? 10 : 5;
    
    // Total impact score (0-100)
    return Math.min(callSiteScore + fileScore + severityMultiplier, 100);
  }
  
  private generateRecommendations(report: EnterpriseReviewReport): string {
    const recommendations: string[] = [];
    
    // High priority issues
    if (report.issuesBySeverity.high > 0) {
      recommendations.push(`🔴 **Address ${report.issuesBySeverity.high} high-priority issue(s) first**`);
      recommendations.push(`   - These may cause bugs, security vulnerabilities, or crashes`);
      recommendations.push(`   - Review each high-priority issue carefully`);
      recommendations.push(`   - Fix critical issues before merging`);
    }
    
    // Duplicates
    if (report.duplicates) {
      if (report.duplicates.withinPR > 0) {
        recommendations.push(`🔄 **Refactor ${report.duplicates.withinPR} duplicate code pattern(s)**`);
        recommendations.push(`   - Extract common logic to reduce maintenance burden`);
        recommendations.push(`   - Consider creating utility methods or helper classes`);
        recommendations.push(`   - Duplicate code increases technical debt`);
      }
      if (report.duplicates.crossRepo > 0) {
        recommendations.push(`🔄 **Review ${report.duplicates.crossRepo} cross-repo duplicate(s)**`);
        recommendations.push(`   - Similar code exists in main branch`);
        recommendations.push(`   - Consider reusing existing code instead of duplicating`);
        recommendations.push(`   - Check if existing implementation can be extended`);
      }
    }
    
    // Breaking changes
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      recommendations.push(`⚠️  **Review ${report.breakingChanges.count} breaking change(s)**`);
      recommendations.push(`   - Ensure all call sites are updated`);
      recommendations.push(`   - Consider deprecation strategy for public APIs`);
      recommendations.push(`   - Update documentation if API contracts changed`);
      if (report.breakingChanges.impactedFiles.length > 0) {
        recommendations.push(`   - ${report.breakingChanges.impactedFiles.length} file(s) may be impacted`);
      }
    }
    
    // Architecture violations
    if (report.architectureViolations && report.architectureViolations.count > 0) {
      recommendations.push(`🏗️  **Fix ${report.architectureViolations.count} architecture violation(s)**`);
      recommendations.push(`   - Ensure code follows architectural guidelines`);
      recommendations.push(`   - Review import rules and module boundaries`);
      recommendations.push(`   - Maintain clean architecture principles`);
    }
    
    // Medium priority
    if (report.issuesBySeverity.medium > 0) {
      recommendations.push(`🟡 **Consider ${report.issuesBySeverity.medium} medium-priority improvement(s)**`);
      recommendations.push(`   - These enhance code quality and maintainability`);
      recommendations.push(`   - Address after high-priority issues are fixed`);
      recommendations.push(`   - Improve code quality incrementally`);
    }
    
    // Low priority
    if (report.issuesBySeverity.low > 0) {
      recommendations.push(`🟢 **Optional: Review ${report.issuesBySeverity.low} low-priority suggestion(s)**`);
      recommendations.push(`   - Style improvements and best practices`);
      recommendations.push(`   - Can be addressed in follow-up PRs`);
      recommendations.push(`   - Focus on high/medium issues first`);
    }
    
    // General recommendations
    if (report.totalIssues === 0) {
      recommendations.push(`✅ **Excellent work! No issues found.**`);
      recommendations.push(`   - Code quality is high`);
      recommendations.push(`   - Ready to merge`);
    } else {
      recommendations.push(`📋 **Review Process:**`);
      recommendations.push(`   1. Fix high-priority issues first`);
      recommendations.push(`   2. Address breaking changes`);
      recommendations.push(`   3. Refactor duplicate code`);
      recommendations.push(`   4. Fix architecture violations`);
      recommendations.push(`   5. Consider medium/low priority improvements`);
    }
    
    return recommendations.join('\n');
  }
}

