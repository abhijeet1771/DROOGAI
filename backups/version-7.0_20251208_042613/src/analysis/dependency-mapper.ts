/**
 * Dependency Mapper (Sprint 4.3)
 * Maps cross-file relationships and dependencies
 */

import { CodeSymbol } from '../parser/types.js';
import { CodebaseIndexer } from '../indexer/indexer.js';

export interface Dependency {
  from: string; // File that depends on
  to: string; // File that is depended upon
  type: 'import' | 'extends' | 'implements' | 'calls' | 'uses' | 'references';
  element: string; // Method, class, or symbol name
  line?: number;
  severity: 'high' | 'medium' | 'low';
}

export interface DependencyChain {
  files: string[];
  depth: number;
  critical: boolean;
  description: string;
}

export interface ConstantUsage {
  constant: string;
  value: string;
  files: string[];
  count: number;
  shouldExtract: boolean;
}

export interface DependencyMap {
  dependencies: Dependency[];
  dependencyChains: DependencyChain[];
  constants: ConstantUsage[];
  circularDependencies: DependencyChain[];
  affectedFiles: Map<string, string[]>; // file -> list of files that depend on it
  summary: string;
}

export class DependencyMapper {
  private indexer: CodebaseIndexer;

  constructor(indexer: CodebaseIndexer) {
    this.indexer = indexer;
  }

  /**
   * Map dependencies across files
   */
  mapDependencies(
    prSymbols: CodeSymbol[],
    prFiles: Map<string, string>,
    mainBranchSymbols: CodeSymbol[]
  ): DependencyMap {
    const dependencies: Dependency[] = [];
    const constants: ConstantUsage[] = [];
    const affectedFiles = new Map<string, string[]>();

    // 1. Find import dependencies
    const importDeps = this.findImportDependencies(prFiles);
    dependencies.push(...importDeps);

    // 2. Find inheritance dependencies
    const inheritanceDeps = this.findInheritanceDependencies(prSymbols, mainBranchSymbols);
    dependencies.push(...inheritanceDeps);

    // 3. Find method call dependencies
    const callDeps = this.findCallDependencies(prSymbols, mainBranchSymbols);
    dependencies.push(...callDeps);

    // 4. Find constant usage
    const constantUsage = this.findConstantUsage(prFiles, mainBranchSymbols);
    constants.push(...constantUsage);

    // 5. Build affected files map
    for (const dep of dependencies) {
      if (!affectedFiles.has(dep.to)) {
        affectedFiles.set(dep.to, []);
      }
      affectedFiles.get(dep.to)!.push(dep.from);
    }

    // 6. Find dependency chains
    const dependencyChains = this.findDependencyChains(dependencies);

    // 7. Find circular dependencies
    const circularDeps = this.findCircularDependencies(dependencies);

    return {
      dependencies,
      dependencyChains,
      constants,
      circularDependencies: circularDeps,
      affectedFiles,
      summary: this.generateSummary(dependencies, dependencyChains, circularDeps, constants),
    };
  }

  /**
   * Find import dependencies
   */
  private findImportDependencies(prFiles: Map<string, string>): Dependency[] {
    const deps: Dependency[] = [];

    for (const [file, code] of prFiles.entries()) {
      // Extract imports (Java, TypeScript, etc.)
      const importRegex = /^import\s+(?:static\s+)?([\w.]+)(?:\.[*])?;?/gm;
      const matches = code.matchAll(importRegex);

      for (const match of matches) {
        const importedModule = match[1];
        // Try to find the file that provides this module
        const targetFile = this.findFileForModule(importedModule);
        if (targetFile && targetFile !== file) {
          deps.push({
            from: file,
            to: targetFile,
            type: 'import',
            element: importedModule,
            severity: 'medium',
          });
        }
      }
    }

    return deps;
  }

  /**
   * Find inheritance dependencies
   */
  private findInheritanceDependencies(
    prSymbols: CodeSymbol[],
    mainBranchSymbols: CodeSymbol[]
  ): Dependency[] {
    const deps: Dependency[] = [];

    for (const symbol of prSymbols) {
      if (symbol.type === 'class' && symbol.extends) {
        // Find the parent class
        const parentClass = mainBranchSymbols.find(s =>
          s.type === 'class' && s.name === symbol.extends
        );

        if (parentClass) {
          deps.push({
            from: symbol.file,
            to: parentClass.file,
            type: 'extends',
            element: symbol.extends,
            line: symbol.startLine,
            severity: 'high',
          });
        }
      }

      if (symbol.implements && symbol.implements.length > 0) {
        for (const iface of symbol.implements) {
          const interfaceClass = mainBranchSymbols.find(s =>
            s.type === 'interface' && s.name === iface
          );

          if (interfaceClass) {
            deps.push({
              from: symbol.file,
              to: interfaceClass.file,
              type: 'implements',
              element: iface,
              line: symbol.startLine,
              severity: 'high',
            });
          }
        }
      }
    }

    return deps;
  }

  /**
   * Find method call dependencies
   */
  private findCallDependencies(
    prSymbols: CodeSymbol[],
    mainBranchSymbols: CodeSymbol[]
  ): Dependency[] {
    const deps: Dependency[] = [];

    for (const prSymbol of prSymbols) {
      if (prSymbol.type === 'method' || prSymbol.type === 'function') {
        // Find call sites using indexer
        const callSites = this.indexer.findCallers(prSymbol.name);
        
        for (const callSite of callSites) {
          if (callSite.file !== prSymbol.file) {
            deps.push({
              from: callSite.file,
              to: prSymbol.file,
              type: 'calls',
              element: prSymbol.name,
              line: callSite.line,
              severity: 'high',
            });
          }
        }
      }
    }

    return deps;
  }

  /**
   * Find constant usage across files
   */
  private findConstantUsage(
    prFiles: Map<string, string>,
    mainBranchSymbols: CodeSymbol[]
  ): ConstantUsage[] {
    const constantMap = new Map<string, { value: string; files: string[] }>();

    // Find constants in main branch
    for (const symbol of mainBranchSymbols) {
      if (symbol.type === 'field' && symbol.isStatic && symbol.isConstant) {
        const value = symbol.code?.match(/=\s*([^;]+)/)?.[1] || 'unknown';
        if (!constantMap.has(symbol.name)) {
          constantMap.set(symbol.name, { value, files: [] });
        }
        constantMap.get(symbol.name)!.files.push(symbol.file);
      }
    }

    // Check if constants are used in multiple files
    const constants: ConstantUsage[] = [];
    for (const [constant, data] of constantMap.entries()) {
      if (data.files.length > 1) {
        constants.push({
          constant,
          value: data.value,
          files: [...new Set(data.files)],
          count: data.files.length,
          shouldExtract: data.files.length >= 3, // Extract if used in 3+ files
        });
      }
    }

    return constants;
  }

  /**
   * Find dependency chains
   */
  private findDependencyChains(dependencies: Dependency[]): DependencyChain[] {
    const chains: DependencyChain[] = [];
    const visited = new Set<string>();

    // Build dependency graph
    const graph = new Map<string, string[]>();
    for (const dep of dependencies) {
      if (!graph.has(dep.from)) {
        graph.set(dep.from, []);
      }
      graph.get(dep.from)!.push(dep.to);
    }

    // Find chains (DFS)
    for (const [file, deps] of graph.entries()) {
      if (!visited.has(file)) {
        const chain = this.dfsChain(file, graph, visited, []);
        if (chain.length > 2) {
          chains.push({
            files: chain,
            depth: chain.length,
            critical: chain.length > 5,
            description: `Dependency chain: ${chain.join(' → ')}`,
          });
        }
      }
    }

    return chains;
  }

  /**
   * DFS to find dependency chain
   */
  private dfsChain(
    file: string,
    graph: Map<string, string[]>,
    visited: Set<string>,
    currentChain: string[]
  ): string[] {
    if (visited.has(file) || currentChain.includes(file)) {
      return currentChain;
    }

    visited.add(file);
    currentChain.push(file);

    const deps = graph.get(file) || [];
    for (const dep of deps) {
      const chain = this.dfsChain(dep, graph, visited, [...currentChain]);
      if (chain.length > currentChain.length) {
        return chain;
      }
    }

    return currentChain;
  }

  /**
   * Find circular dependencies
   */
  private findCircularDependencies(dependencies: Dependency[]): DependencyChain[] {
    const circular: DependencyChain[] = [];

    // Build bidirectional graph
    const graph = new Map<string, string[]>();
    for (const dep of dependencies) {
      if (!graph.has(dep.from)) {
        graph.set(dep.from, []);
      }
      graph.get(dep.from)!.push(dep.to);
    }

    // Check for cycles
    for (const [file, deps] of graph.entries()) {
      for (const dep of deps) {
        // Check if dep depends back on file
        const reverseDeps = graph.get(dep) || [];
        if (reverseDeps.includes(file)) {
          circular.push({
            files: [file, dep],
            depth: 2,
            critical: true,
            description: `Circular dependency: ${file} ↔ ${dep}`,
          });
        }
      }
    }

    return circular;
  }

  /**
   * Find file for module (simplified - would need proper module resolution)
   */
  private findFileForModule(module: string): string | null {
    // Simplified: try to match module name to file name
    const parts = module.split('.');
    const className = parts[parts.length - 1];
    return `${className}.java`; // Simplified - would need proper resolution
  }

  /**
   * Generate summary
   */
  private generateSummary(
    dependencies: Dependency[],
    chains: DependencyChain[],
    circular: DependencyChain[],
    constants: ConstantUsage[]
  ): string {
    if (dependencies.length === 0) {
      return '✅ No cross-file dependencies detected';
    }

    const parts: string[] = [];
    parts.push(`${dependencies.length} dependency(ies)`);
    if (chains.length > 0) {
      parts.push(`${chains.length} dependency chain(s)`);
    }
    if (circular.length > 0) {
      parts.push(`${circular.length} circular dependency(ies)`);
    }
    if (constants.length > 0) {
      parts.push(`${constants.length} constant(s) used across files`);
    }

    return `⚠️  Dependency Map: ${parts.join(', ')}`;
  }
}

