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
  codeSmells?: {
    smells: any[];
    byCategory: any;
    byType: Record<string, any[]>;
    total: number;
  };
  impactAnalysis?: {
    changedSymbols: any[];
    impactedFiles: string[];
    impactedFeatures: any[];
    callSites: any[];
    breakagePredictions: any[];
    summary: string;
  };
  testImpact?: {
    affectedTests: any[];
    coverageChange: number;
    newCoverage: number;
    missingCoverage: string[];
    failingTests: any[];
  };
  performanceRegression?: {
    regressions: any[];
    improvements: any[];
    overallImpact: string;
    estimatedImpact: string;
  };
  reviewerSuggestions?: any[];
  locatorSuggestions?: {
    suggestions: any[];
    framework: string;
    totalIssues: number;
  };
  gherkinSuggestions?: {
    suggestions: any[];
    totalIssues: number;
    readabilityScore: number;
  };
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
  // New features
  private patternLearner?: any;
  private mlLearner?: any;
  private reviewerSuggester?: any;
  
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
  async reviewPR(prData: PRData, useIndex: boolean = false, geminiKey?: string, owner?: string, repo?: string): Promise<EnterpriseReviewReport> {
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
    
    // Pre-merge Impact Analysis
    console.log('\n📋 Phase 0.15: Pre-Merge Impact Analysis...');
    const { ImpactAnalyzer } = await import('../analysis/impact.js');
    const impactAnalyzer = new ImpactAnalyzer(this.indexer, (this as any).geminiKey);
    const prFileNames = Array.from(prFileContents.keys());
    const impactAnalysis = await impactAnalyzer.analyzeImpact(prSymbols, prFileNames);
    console.log(`✓ Found ${impactAnalysis.impactedFiles.length} impacted file(s), ${impactAnalysis.impactedFeatures.length} feature(s) at risk`);
    if (impactAnalysis.breakagePredictions.length > 0) {
      console.log(`  ⚠️  ${impactAnalysis.breakagePredictions.length} potential breakage scenario(s) predicted`);
    }
    
    // Test Impact Analysis
    console.log('\n📋 Phase 0.16: Test Impact Analysis...');
    const { TestImpactAnalyzer } = await import('../analysis/test-impact.js');
    const testImpactAnalyzer = new TestImpactAnalyzer(this.indexer);
    const testFiles = prFileNames.filter(f => f.includes('test') || f.includes('spec') || f.endsWith('Test.java'));
    const testImpact = testImpactAnalyzer.analyzeTestImpact(prSymbols, testFiles);
    const failingTests = testImpactAnalyzer.predictFailingTests(prSymbols);
    console.log(`✓ Found ${testImpact.affectedTests.length} affected test(s), ${failingTests.length} likely to fail`);
    if (testImpact.missingCoverage.length > 0) {
      console.log(`  ⚠️  ${testImpact.missingCoverage.length} method(s) without test coverage`);
    }
    
    // Performance Regression Detection
    console.log('\n📋 Phase 0.17: Performance Regression Detection...');
    const { PerformanceRegressionDetector } = await import('../analysis/performance-regression.js');
    const perfRegressionDetector = new PerformanceRegressionDetector();
    const perfAnalysis = perfRegressionDetector.detectRegressions(prSymbols);
    console.log(`✓ Found ${perfAnalysis.regressions.length} performance regression(s), ${perfAnalysis.improvements.length} improvement(s)`);
    if (perfAnalysis.overallImpact === 'degraded') {
      console.log(`  ⚠️  Performance degradation detected: ${perfAnalysis.estimatedImpact}`);
    }
    
    // Pattern Learning & Team Style
    console.log('\n📋 Phase 0.18: Learning from Codebase Patterns...');
    const { PatternLearner } = await import('../learning/pattern-learner.js');
    this.patternLearner = new PatternLearner();
    // Learn from previous reviews (if available)
    const teamPatterns = this.patternLearner.checkTeamPatterns(prSymbols);
    console.log(`✓ Found ${teamPatterns.matches.length} pattern match(es), ${teamPatterns.violations.length} violation(s)`);
    
    // Reviewer Suggestions
    console.log('\n📋 Phase 0.19: Reviewer Suggestions...');
    const { ReviewerSuggester } = await import('../ownership/reviewer-suggester.js');
    this.reviewerSuggester = new ReviewerSuggester(this.github);
    let reviewerSuggestions: any[] = [];
    if (owner && repo) {
      try {
        reviewerSuggestions = await this.reviewerSuggester.suggestReviewers(prFileNames, owner, repo);
        console.log(`✓ Suggested ${reviewerSuggestions.length} reviewer(s) based on code ownership`);
      } catch (error) {
        console.warn('⚠️  Reviewer suggestion failed:', (error as any).message);
      }
    } else {
      console.log('⚠️  Owner/repo not provided - skipping reviewer suggestions');
    }
    
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
    
    // Locator & Gherkin Improvements Analysis
    console.log('📋 Phase 0.20: Locator & Gherkin Improvements...');
    const { LocatorSuggestionAnalyzer } = await import('../analysis/locator-suggestions.js');
    const { GherkinImprovementAnalyzer } = await import('../analysis/gherkin-improvements.js');
    const locatorAnalyzer = new LocatorSuggestionAnalyzer();
    const gherkinAnalyzer = new GherkinImprovementAnalyzer();
    
    let locatorSuggestions: any[] = [];
    let gherkinSuggestions: any[] = [];
    
    for (const [filepath, code] of prFileContents.entries()) {
      // Check if it's a test file
      if (filepath.includes('test') || filepath.includes('spec') || filepath.includes('.feature')) {
        // Analyze locators
        const locatorAnalysis = locatorAnalyzer.analyzeLocators(code, filepath);
        if (locatorAnalysis.suggestions.length > 0) {
          locatorSuggestions.push(...locatorAnalysis.suggestions);
        }
        
        // Analyze Gherkin/feature files
        if (filepath.endsWith('.feature') || filepath.includes('feature') || filepath.includes('step')) {
          const gherkinAnalysis = gherkinAnalyzer.analyzeGherkin(code, filepath);
          if (gherkinAnalysis.suggestions.length > 0) {
            gherkinSuggestions.push(...gherkinAnalysis.suggestions);
          }
        }
      }
    }
    
    console.log(`✓ Found ${locatorSuggestions.length} locator improvement(s), ${gherkinSuggestions.length} Gherkin improvement(s)`);
    
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
      impactAnalysis: {
        changedSymbols: impactAnalysis.changedSymbols,
        impactedFiles: impactAnalysis.impactedFiles,
        impactedFeatures: impactAnalysis.impactedFeatures,
        callSites: impactAnalysis.callSites,
        breakagePredictions: impactAnalysis.breakagePredictions,
        summary: impactAnalysis.summary,
      },
      testImpact: {
        affectedTests: testImpact.affectedTests,
        coverageChange: testImpact.coverageChange,
        newCoverage: testImpact.newCoverage,
        missingCoverage: testImpact.missingCoverage,
        failingTests: failingTests,
      },
      performanceRegression: {
        regressions: perfAnalysis.regressions,
        improvements: perfAnalysis.improvements,
        overallImpact: perfAnalysis.overallImpact,
        estimatedImpact: perfAnalysis.estimatedImpact,
      },
      reviewerSuggestions: reviewerSuggestions,
      locatorSuggestions: locatorSuggestions.length > 0 ? {
        suggestions: locatorSuggestions,
        framework: locatorSuggestions[0].framework,
        totalIssues: locatorSuggestions.length,
      } : undefined,
      gherkinSuggestions: gherkinSuggestions.length > 0 ? {
        suggestions: gherkinSuggestions,
        totalIssues: gherkinSuggestions.length,
        readabilityScore: gherkinAnalyzer.analyzeGherkin(Array.from(prFileContents.values()).join('\n'), 'combined').readabilityScore,
      } : undefined,
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
    
    // Phase 6.5: Categorize code smells
    console.log('\n📋 Phase 6.5: Categorizing Code Smells...');
    const { CodeSmellCategorizer } = await import('../analysis/code-smells.js');
    const codeSmellCategorizer = new CodeSmellCategorizer();
    const codeSmellReport = codeSmellCategorizer.categorizeCodeSmells(
      enterpriseReport.comments.map(c => ({
        file: c.file,
        line: c.line,
        message: c.message || '',
        severity: c.severity || 'medium',
      })),
      prSymbols,
      enterpriseReport.designPatterns?.antiPatterns || []
    );
    enterpriseReport.codeSmells = {
      smells: codeSmellReport.smells,
      byCategory: codeSmellReport.byCategory,
      byType: codeSmellReport.byType,
      total: codeSmellReport.total,
    };
    console.log(`✓ Categorized ${codeSmellReport.total} code smell(s)`);
    
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
    // Consolidated PR-level summary (not per-file)
    let summary = `# ⚠️ PR Impact Assessment\n\n`;
    
    // Calculate merge risk
    const riskLevel = this.calculateMergeRisk(report);
    summary += `**Merge Risk**: ${riskLevel}\n\n`;
    
    // Impact on main branch
    summary += `**If merged, main branch will experience:**\n\n`;
    
    // Build impact list FIRST (right after header)
    const impacts: string[] = [];
    if (report.impactAnalysis && report.impactAnalysis.impactedFeatures.length > 0) {
      impacts.push(`**${report.impactAnalysis.impactedFeatures.length} feature(s)** will break`);
    }
    if (report.testImpact && report.testImpact.failingTests.length > 0) {
      impacts.push(`**${report.testImpact.failingTests.length} test(s)** will fail (CI blocked)`);
    }
    if (report.performanceRegression && report.performanceRegression.regressions.length > 0) {
      impacts.push(`**${report.performanceRegression.regressions.length} performance regression(s)** detected`);
    }
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      // Count total impacted files from all breaking changes (including call sites)
      const totalImpactedFiles = new Set<string>();
      let totalCallSites = 0;
      report.breakingChanges.details.forEach((bc: any) => {
        if (bc.impactedFiles) {
          bc.impactedFiles.forEach((file: string) => totalImpactedFiles.add(file));
        }
        if (bc.callSites) {
          // Handle both array and object formats
          if (Array.isArray(bc.callSites)) {
            totalCallSites += bc.callSites.length;
            bc.callSites.forEach((cs: any) => totalImpactedFiles.add(cs.file));
          } else if (bc.callSites.details && Array.isArray(bc.callSites.details)) {
            totalCallSites += bc.callSites.count || bc.callSites.details.length;
            bc.callSites.details.forEach((cs: any) => totalImpactedFiles.add(cs.file));
          } else if (bc.callSites.count) {
            totalCallSites += bc.callSites.count;
          }
        }
      });
      
      impacts.push(`**${report.breakingChanges.count} breaking change(s)** affecting ${totalImpactedFiles.size} file(s) (${totalCallSites} call site(s))`);
    }
    
    if (impacts.length > 0) {
      impacts.forEach(impact => {
        summary += `- ${impact}\n`;
      });
    } else {
      summary += `- ✅ No major breakage detected\n`;
    }
    
    summary += `\n`;
    
    // RISK-FOCUSED SUMMARY: What will break?
    
    // 1. Impact Analysis - What will break?
    if (report.impactAnalysis && report.impactAnalysis.impactedFiles.length > 0) {
      summary += `## 🚨 What Will Break?\n\n`;
      summary += `**This PR will impact ${report.impactAnalysis.impactedFiles.length} file(s) in the codebase.**\n\n`;
      
      if (report.impactAnalysis.impactedFeatures.length > 0) {
        summary += `### Affected Features (Will Break/Fail)\n\n`;
        report.impactAnalysis.impactedFeatures.forEach((feature: any) => {
          summary += `#### ${feature.name} Feature - ${feature.riskLevel.toUpperCase()} RISK\n`;
          summary += `**Status:** ⚠️ **WILL BREAK**\n\n`;
          summary += `**Files that will fail:**\n`;
          feature.files.forEach((file: string) => {
            summary += `- \`${file}\` - **WILL FAIL**\n`;
          });
          summary += `\n`;
          
          summary += `**Why it will break:**\n`;
          summary += `${feature.description}\n\n`;
          
          if (feature.impactedAreas.length > 0) {
            summary += `**Exact locations where it's being called (will fail here):**\n`;
            feature.impactedAreas.slice(0, 10).forEach((area: any) => {
              summary += `- \`${area.file}:${area.line}\` - \`${area.method}()\` calls modified code\n`;
            });
            if (feature.impactedAreas.length > 10) {
              summary += `- ... and ${feature.impactedAreas.length - 10} more locations\n`;
            }
            summary += `\n`;
          }
        });
      }
      
      if (report.impactAnalysis.breakagePredictions.length > 0) {
        summary += `### 🔥 Predicted Breakage Scenarios\n\n`;
        report.impactAnalysis.breakagePredictions.forEach((pred: any) => {
          summary += `**${pred.scenario}** (${pred.probability.toUpperCase()} chance of breaking)\n`;
          summary += `- **What will break:** ${pred.impact}\n`;
          summary += `- **Files that will fail:** ${pred.affectedFiles.join(', ')}\n`;
          summary += `- **How to prevent:** ${pred.mitigation}\n\n`;
        });
      }
    }

    // 2. Test Cases That Will Fail
    if (report.testImpact && report.testImpact.failingTests.length > 0) {
      summary += `## 🧪 Test Cases That WILL FAIL\n\n`;
      summary += `**${report.testImpact.failingTests.length} test case(s) will fail** if this PR is merged.\n\n`;
      
      summary += `### Tests That Will Break:\n\n`;
      report.testImpact.failingTests.forEach((test: any, index: number) => {
        summary += `${index + 1}. **\`${test.testFile}::${test.testMethod}\`** - ${test.probability.toUpperCase()} chance of failure\n`;
        summary += `   - **Why it will fail:** ${test.reason}\n`;
        summary += `   - **What to fix:** ${test.suggestion}\n\n`;
      });
      
      if (report.testImpact.affectedTests.length > 0) {
        summary += `### Other Tests That May Be Affected:\n\n`;
        report.testImpact.affectedTests.slice(0, 5).forEach((test: any) => {
          summary += `- \`${test.testFile}::${test.testMethod}\` - ${test.probability} probability\n`;
        });
        summary += `\n`;
      }
    } else if (report.testImpact && report.testImpact.affectedTests.length > 0) {
      summary += `## 🧪 Test Impact\n\n`;
      summary += `**${report.testImpact.affectedTests.length} test(s) may be affected** by this PR.\n\n`;
      summary += `**Note:** No tests are predicted to fail, but review these tests:\n`;
      report.testImpact.affectedTests.slice(0, 5).forEach((test: any) => {
        summary += `- \`${test.testFile}::${test.testMethod}\`\n`;
      });
      summary += `\n`;
    }

    // 3. Performance Regressions (What will slow down?)
    if (report.performanceRegression && report.performanceRegression.regressions.length > 0) {
      summary += `## ⚡ Performance Regressions (What Will Slow Down?)\n\n`;
      summary += `**${report.performanceRegression.regressions.length} performance regression(s) detected** - your code will be slower.\n\n`;
      summary += `${report.performanceRegression.estimatedImpact}\n\n`;
      
      summary += `### Code That Will Be Slower:\n\n`;
      report.performanceRegression.regressions.forEach((reg: any, index: number) => {
        summary += `${index + 1}. **\`${reg.file}::${reg.method}\`** (${reg.severity.toUpperCase()} severity)\n`;
        summary += `   - **What will slow down:** ${reg.issue}\n`;
        summary += `   - **Impact:** ${reg.impact}\n`;
        summary += `   - **Estimated slowdown:** ${reg.estimatedSlowdown}\n`;
        summary += `   - **How to fix:** ${reg.suggestion}\n\n`;
      });
    }

    // Must fix before merge (priority list)
    const mustFix: Array<{ priority: string; issue: string; impact: string }> = [];
    
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      const topBreakingChange = report.breakingChanges.details[0];
      // Count total call sites across all breaking changes
      const totalCallSites = report.breakingChanges.details.reduce((sum: number, bc: any) => {
        if (!bc.callSites) return sum;
        // Handle both array and object formats
        if (Array.isArray(bc.callSites)) {
          return sum + bc.callSites.length;
        } else if (bc.callSites.count) {
          return sum + bc.callSites.count;
        } else if (bc.callSites.details && Array.isArray(bc.callSites.details)) {
          return sum + bc.callSites.details.length;
        }
        return sum;
      }, 0);
      const totalImpactedFiles = new Set<string>();
      report.breakingChanges.details.forEach((bc: any) => {
        if (bc.impactedFiles) {
          bc.impactedFiles.forEach((file: string) => totalImpactedFiles.add(file));
        }
        if (bc.callSites) {
          // Handle both array and object formats
          if (Array.isArray(bc.callSites)) {
            bc.callSites.forEach((cs: any) => totalImpactedFiles.add(cs.file));
          } else if (bc.callSites.details && Array.isArray(bc.callSites.details)) {
            bc.callSites.details.forEach((cs: any) => totalImpactedFiles.add(cs.file));
          }
        }
      });
      
      mustFix.push({
        priority: '🔴 HIGH',
        issue: `Breaking change in ${topBreakingChange.file}::${topBreakingChange.symbol}`,
        impact: `${totalImpactedFiles.size} file(s) will break (${totalCallSites} call site(s))`
      });
    }
    
    if (report.testImpact && report.testImpact.failingTests.length > 0) {
      mustFix.push({
        priority: '🔴 HIGH',
        issue: `Update ${report.testImpact.failingTests.length} failing test(s)`,
        impact: 'CI pipeline will fail'
      });
    }
    
    if (report.performanceRegression && report.performanceRegression.regressions.length > 0) {
      const topRegression = report.performanceRegression.regressions[0];
      mustFix.push({
        priority: '🟡 MEDIUM',
        issue: `Performance regression in ${topRegression.file}::${topRegression.method}`,
        impact: topRegression.estimatedSlowdown
      });
    }
    
    if (report.impactAnalysis && report.impactAnalysis.impactedFeatures.length > 0) {
      const topFeature = report.impactAnalysis.impactedFeatures[0];
      mustFix.push({
        priority: '🔴 HIGH',
        issue: `Fix ${topFeature.name} feature`,
        impact: `${topFeature.files.length} file(s) affected`
      });
    }
    
    if (mustFix.length > 0) {
      summary += `## Must Fix Before Merge (Priority Order):\n\n`;
      mustFix.slice(0, 5).forEach((item, index) => {
        summary += `${index + 1}. ${item.priority} **${item.issue}**\n`;
        summary += `   - ${item.impact}\n\n`;
      });
    }
    
    // Quick stats
    summary += `## Quick Stats:\n\n`;
    summary += `- **Total Issues**: ${report.totalIssues}\n`;
    summary += `- **High Priority**: ${report.issuesBySeverity.high}\n`;
    summary += `- **Medium Priority**: ${report.issuesBySeverity.medium}\n`;
    summary += `- **Low Priority**: ${report.issuesBySeverity.low}\n\n`;
    
    // Additional context (only if critical)
    if (report.locatorSuggestions && report.locatorSuggestions.totalIssues > 10) {
      summary += `\n**Note:** ${report.locatorSuggestions.totalIssues} test automation improvements suggested (see inline comments)\n\n`;
    }
    
    if (report.gherkinSuggestions && report.gherkinSuggestions.totalIssues > 10) {
      summary += `**Note:** ${report.gherkinSuggestions.totalIssues} Gherkin improvements suggested (see inline comments)\n\n`;
    }
    
    // Reviewer Suggestions (keep this - helpful for PR)
    if (report.reviewerSuggestions && report.reviewerSuggestions.length > 0) {
      summary += `## 👥 Suggested Reviewers\n\n`;
      report.reviewerSuggestions.slice(0, 3).forEach((suggestion: any) => {
        summary += `- **@${suggestion.reviewer}** (${(suggestion.confidence * 100).toFixed(0)}% confidence) - ${suggestion.expertise[0] || 'General'}\n`;
      });
      summary += `\n`;
    }
    
    // Skip traditional code review sections - focus only on what will break
    // (Architecture violations, API design, complexity are less critical for risk assessment)
    
    // Add Breaking Changes section (4)
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      summary += `## 💥 Breaking Changes (Code Will Break)\n\n`;
      summary += `**${report.breakingChanges.count} breaking change(s)** - existing code will fail to compile or run.\n\n`;
      
      report.breakingChanges.details.forEach((bc: any, index: number) => {
        summary += `### ${index + 1}. \`${bc.file}::${bc.symbol}\` - ${bc.changeType.toUpperCase()}\n`;
        summary += `**Status:** 🔴 **WILL BREAK**\n\n`;
        
        if (bc.oldSignature || bc.newSignature) {
          summary += `**What changed:**\n`;
          summary += `- **Before:** \`${bc.oldSignature || 'N/A'}\`\n`;
          summary += `- **After:** \`${bc.newSignature || 'N/A'}\`\n\n`;
        }
        
        if (bc.impactScore !== undefined) {
          summary += `**Impact Score:** ${bc.impactScore}/100 (${bc.impactScore >= 70 ? 'HIGH' : bc.impactScore >= 40 ? 'MEDIUM' : 'LOW'} impact)\n\n`;
        }
        
        if (bc.callSites && bc.callSites.count > 0) {
          summary += `**Files that will break (${bc.callSites.count} locations):**\n`;
          bc.callSites.details.slice(0, 10).forEach((cs: any) => {
            summary += `- \`${cs.file}:${cs.line}\` - \`${cs.caller}()\` calls this method - **WILL FAIL**\n`;
          });
          if (bc.callSites.details.length > 10) {
            summary += `- ... and ${bc.callSites.details.length - 10} more files will break\n`;
          }
          summary += `\n`;
        } else {
          summary += `**Note:** No call sites found in indexed codebase (may be external API or new code)\n\n`;
        }
      });
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

    // Add code smells section
    if (report.codeSmells && report.codeSmells.total > 0) {
      summary += `\n## Code Smells\n\n`;
      summary += `**Total:** ${report.codeSmells.total} code smell(s) detected\n\n`;
      
      if (report.codeSmells.byCategory.structural.length > 0) {
        summary += `**Structural Smells:** ${report.codeSmells.byCategory.structural.length}\n`;
        report.codeSmells.byCategory.structural.slice(0, 5).forEach((smell: any) => {
          summary += `- ${smell.type.replace(/_/g, ' ')} in ${smell.location} (${smell.file}) - ${smell.severity}\n`;
          summary += `  → Refactoring: ${smell.refactoring}\n`;
        });
        summary += `\n`;
      }
      
      if (report.codeSmells.byCategory.behavioral.length > 0) {
        summary += `**Behavioral Smells:** ${report.codeSmells.byCategory.behavioral.length}\n`;
        report.codeSmells.byCategory.behavioral.slice(0, 5).forEach((smell: any) => {
          summary += `- ${smell.type.replace(/_/g, ' ')} in ${smell.location} (${smell.file}) - ${smell.severity}\n`;
          summary += `  → Refactoring: ${smell.refactoring}\n`;
        });
        summary += `\n`;
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
    
    // 4. Breaking Changes (What will break compilation/runtime?)
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      summary += `## 💥 Breaking Changes (Code Will Break)\n\n`;
      summary += `**${report.breakingChanges.count} breaking change(s)** - existing code will fail to compile or run.\n\n`;
      
      report.breakingChanges.details.forEach((bc: any, index: number) => {
        summary += `### ${index + 1}. \`${bc.file}::${bc.symbol}\` - ${bc.changeType.toUpperCase()}\n`;
        summary += `**Status:** 🔴 **WILL BREAK**\n\n`;
        
        if (bc.oldSignature || bc.newSignature) {
          summary += `**What changed:**\n`;
          summary += `- **Before:** \`${bc.oldSignature || 'N/A'}\`\n`;
          summary += `- **After:** \`${bc.newSignature || 'N/A'}\`\n\n`;
        }
        
        if (bc.impactScore !== undefined) {
          summary += `**Impact Score:** ${bc.impactScore}/100 (${bc.impactScore >= 70 ? 'HIGH' : bc.impactScore >= 40 ? 'MEDIUM' : 'LOW'} impact)\n\n`;
        }
        
        if (bc.callSites && bc.callSites.count > 0) {
          summary += `**Files that will break (${bc.callSites.count} locations):**\n`;
          bc.callSites.details.slice(0, 10).forEach((cs: any) => {
            summary += `- \`${cs.file}:${cs.line}\` - \`${cs.caller}()\` calls this method - **WILL FAIL**\n`;
          });
          if (bc.callSites.details.length > 10) {
            summary += `- ... and ${bc.callSites.details.length - 10} more files will break\n`;
          }
          summary += `\n`;
        } else {
          summary += `**Note:** No call sites found in indexed codebase (may be external API or new code)\n\n`;
        }
      });
    }
    
    return summary;
  }

  /**
   * Calculate merge risk level
   */
  private calculateMergeRisk(report: EnterpriseReviewReport): string {
    let riskScore = 0;
    
    // Breaking changes = high risk
    if (report.breakingChanges && report.breakingChanges.count > 0) {
      riskScore += report.breakingChanges.count * 30;
    }
    
    // Failing tests = high risk
    if (report.testImpact && report.testImpact.failingTests.length > 0) {
      riskScore += report.testImpact.failingTests.length * 20;
    }
    
    // Impacted features = high risk
    if (report.impactAnalysis && report.impactAnalysis.impactedFeatures.length > 0) {
      riskScore += report.impactAnalysis.impactedFeatures.length * 25;
    }
    
    // Performance regressions = medium risk
    if (report.performanceRegression && report.performanceRegression.regressions.length > 0) {
      riskScore += report.performanceRegression.regressions.length * 10;
    }
    
    // High severity issues = medium risk
    riskScore += report.issuesBySeverity.high * 15;
    
    if (riskScore >= 100) return '🔴 HIGH ⚠️';
    if (riskScore >= 50) return '🟡 MEDIUM ⚠️';
    if (riskScore >= 20) return '🟢 LOW';
    return '✅ SAFE';
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

