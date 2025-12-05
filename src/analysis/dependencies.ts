/**
 * Dependency Analysis
 * Analyzes dependencies for security vulnerabilities, unused deps, and conflicts
 */

export interface DependencyVulnerability {
  dependency: string;
  cve?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  fixVersion?: string;
  suggestion: string;
}

export interface UnusedDependency {
  dependency: string;
  reason: string;
  suggestion: string;
}

export interface VersionConflict {
  dependency: string;
  conflicts: string[];
  suggestion: string;
}

export class DependencyAnalyzer {
  /**
   * Analyze dependencies from pom.xml or build.gradle
   * Basic implementation - can be enhanced with OWASP Dependency-Check
   */
  async analyzeDependencies(
    buildFileContent: string,
    sourceFiles: string[]
  ): Promise<{
    vulnerabilities: DependencyVulnerability[];
    unused: UnusedDependency[];
    conflicts: VersionConflict[];
  }> {
    const vulnerabilities: DependencyVulnerability[] = [];
    const unused: UnusedDependency[] = [];
    const conflicts: VersionConflict[] = [];

    // Extract dependencies from build file
    const dependencies = this.extractDependencies(buildFileContent);
    
    // Check for unused dependencies
    for (const dep of dependencies) {
      const isUsed = this.isDependencyUsed(dep, sourceFiles);
      if (!isUsed) {
        unused.push({
          dependency: dep,
          reason: 'No imports or usage found in source code',
          suggestion: `Remove unused dependency: ${dep}`
        });
      }
    }

    // Check for version conflicts (simplified)
    const versionConflicts = this.detectVersionConflicts(buildFileContent);
    conflicts.push(...versionConflicts);

    return {
      vulnerabilities, // Would be populated by OWASP Dependency-Check
      unused,
      conflicts
    };
  }

  /**
   * Extract dependencies from build file
   */
  private extractDependencies(buildFileContent: string): string[] {
    const dependencies: string[] = [];

    // Maven pom.xml pattern
    const mavenPattern = /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<\/dependency>/g;
    let match;
    while ((match = mavenPattern.exec(buildFileContent)) !== null) {
      const groupId = match[1].trim();
      const artifactId = match[2].trim();
      dependencies.push(`${groupId}:${artifactId}`);
    }

    // Gradle build.gradle pattern
    const gradlePattern = /(?:implementation|compile|api|testImplementation)\s+['"]([^'"]+)['"]/g;
    while ((match = gradlePattern.exec(buildFileContent)) !== null) {
      dependencies.push(match[1].trim());
    }

    return dependencies;
  }

  /**
   * Check if dependency is used in source files
   */
  private isDependencyUsed(dependency: string, sourceFiles: string[]): boolean {
    // Extract package/group from dependency
    const parts = dependency.split(':');
    if (parts.length < 2) return true; // Assume used if can't parse

    const groupId = parts[0];
    const artifactId = parts[1];

    // Check if any source file imports from this dependency
    const packagePattern = groupId.replace(/\./g, '\\.');
    const importPattern = new RegExp(`import\\s+${packagePattern}[^;]+;`, 'i');

    for (const sourceFile of sourceFiles) {
      if (importPattern.test(sourceFile)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect version conflicts
   */
  private detectVersionConflicts(buildFileContent: string): VersionConflict[] {
    const conflicts: VersionConflict[] = [];

    // Check for same dependency with different versions
    const dependencyMap = new Map<string, string[]>();

    // Maven: extract all dependencies with versions
    const mavenPattern = /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?(?:<version>([^<]+)<\/version>)?[\s\S]*?<\/dependency>/g;
    let match;
    while ((match = mavenPattern.exec(buildFileContent)) !== null) {
      const groupId = match[1].trim();
      const artifactId = match[2].trim();
      const version = match[3]?.trim() || 'unknown';
      const key = `${groupId}:${artifactId}`;
      
      if (!dependencyMap.has(key)) {
        dependencyMap.set(key, []);
      }
      dependencyMap.get(key)!.push(version);
    }

    // Check for conflicts
    for (const [dep, versions] of dependencyMap.entries()) {
      const uniqueVersions = [...new Set(versions)];
      if (uniqueVersions.length > 1 && !uniqueVersions.includes('unknown')) {
        conflicts.push({
          dependency: dep,
          conflicts: uniqueVersions,
          suggestion: `Multiple versions found: ${uniqueVersions.join(', ')}. Align to single version.`
        });
      }
    }

    return conflicts;
  }

  /**
   * Run OWASP Dependency-Check (for future integration)
   */
  async runOWASPDependencyCheck(projectPath: string): Promise<DependencyVulnerability[]> {
    // TODO: Integrate with OWASP Dependency-Check
    // This would run: dependency-check.sh --project "My Project" --scan projectPath
    // And parse the JSON/XML report
    throw new Error('OWASP Dependency-Check integration not yet implemented. Using basic analysis.');
  }
}




