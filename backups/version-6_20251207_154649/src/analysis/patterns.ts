/**
 * Design Pattern Detection & Analysis
 * Detects common design patterns and anti-patterns in code
 */

import { CodeSymbol } from '../parser/types.js';

export interface PatternDetection {
  pattern: string;
  location: string;
  file: string;
  line: number;
  confidence: number;
  suggestion?: string;
}

export interface AntiPattern {
  type: string;
  location: string;
  file: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export class PatternDetector {
  /**
   * Detect design patterns using AST analysis
   */
  detectPatterns(symbols: CodeSymbol[]): PatternDetection[] {
    const patterns: PatternDetection[] = [];

    // Factory Pattern Detection
    const factoryPatterns = this.detectFactoryPattern(symbols);
    patterns.push(...factoryPatterns);

    // Singleton Pattern Detection
    const singletonPatterns = this.detectSingletonPattern(symbols);
    patterns.push(...singletonPatterns);

    // Builder Pattern Detection
    const builderPatterns = this.detectBuilderPattern(symbols);
    patterns.push(...builderPatterns);

    // Strategy Pattern Detection
    const strategyPatterns = this.detectStrategyPattern(symbols);
    patterns.push(...strategyPatterns);

    // Observer Pattern Detection
    const observerPatterns = this.detectObserverPattern(symbols);
    patterns.push(...observerPatterns);

    return patterns;
  }

  /**
   * Detect anti-patterns
   */
  detectAntiPatterns(symbols: CodeSymbol[]): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];

    // God Object Detection
    const godObjects = this.detectGodObject(symbols);
    antiPatterns.push(...godObjects);

    // Long Method Detection
    const longMethods = this.detectLongMethod(symbols);
    antiPatterns.push(...longMethods);

    // Feature Envy Detection
    const featureEnvy = this.detectFeatureEnvy(symbols);
    antiPatterns.push(...featureEnvy);

    // Primitive Obsession Detection
    const primitiveObsession = this.detectPrimitiveObsession(symbols);
    antiPatterns.push(...primitiveObsession);

    return antiPatterns;
  }

  /**
   * Factory Pattern: Class with methods that return instances of other classes
   */
  private detectFactoryPattern(symbols: CodeSymbol[]): PatternDetection[] {
    const patterns: PatternDetection[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'class') {
        // Check if class has methods that return instances
        const methods = symbols.filter(s => 
          s.type === 'method' && 
          s.file === symbol.file &&
          s.returnType &&
          s.returnType !== 'void' &&
          s.returnType !== 'String' &&
          s.returnType !== 'int' &&
          s.returnType !== 'boolean'
        );

        if (methods.length >= 2) {
          // Check if class name suggests factory
          const className = symbol.name.toLowerCase();
          if (className.includes('factory') || className.includes('creator') || className.includes('builder')) {
            patterns.push({
              pattern: 'Factory',
              location: `${symbol.name}`,
              file: symbol.file,
              line: symbol.startLine,
              confidence: 0.8,
              suggestion: 'Consider using Factory pattern for object creation. Ensure factory methods follow consistent naming.'
            });
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Singleton Pattern: Class with private constructor and static getInstance method
   */
  private detectSingletonPattern(symbols: CodeSymbol[]): PatternDetection[] {
    const patterns: PatternDetection[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'class') {
        const classMethods = symbols.filter(s => 
          s.type === 'method' && 
          s.file === symbol.file &&
          s.visibility === 'private' &&
          s.name === symbol.name // Constructor
        );

        const getInstanceMethods = symbols.filter(s =>
          s.type === 'method' &&
          s.file === symbol.file &&
          (s.name.toLowerCase().includes('getinstance') || s.name.toLowerCase().includes('get')) &&
          s.isStatic === true
        );

        if (classMethods.length > 0 && getInstanceMethods.length > 0) {
          patterns.push({
            pattern: 'Singleton',
            location: `${symbol.name}`,
            file: symbol.file,
            line: symbol.startLine,
            confidence: 0.9,
            suggestion: 'Singleton pattern detected. Consider if this is necessary - singletons can make testing difficult. Consider dependency injection instead.'
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Builder Pattern: Class with fluent methods returning 'this'
   */
  private detectBuilderPattern(symbols: CodeSymbol[]): PatternDetection[] {
    const patterns: PatternDetection[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'class') {
        const className = symbol.name.toLowerCase();
        if (className.includes('builder')) {
          const methods = symbols.filter(s =>
            s.type === 'method' &&
            s.file === symbol.file &&
            s.returnType === symbol.name // Methods return builder instance
          );

          if (methods.length >= 3) {
            patterns.push({
              pattern: 'Builder',
              location: `${symbol.name}`,
              file: symbol.file,
              line: symbol.startLine,
              confidence: 0.85,
              suggestion: 'Builder pattern detected. Ensure build() method returns the final object and all setter methods return this for method chaining.'
            });
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Strategy Pattern: Interface with multiple implementations
   */
  private detectStrategyPattern(symbols: CodeSymbol[]): PatternDetection[] {
    const patterns: PatternDetection[] = [];

    // Find interfaces
    const interfaces = symbols.filter(s => 
      s.type === 'class' && 
      (s.name.toLowerCase().includes('strategy') || 
       s.name.toLowerCase().includes('handler') ||
       s.name.toLowerCase().includes('processor'))
    );

    for (const iface of interfaces) {
      // Find implementations
      const implementations = symbols.filter(s =>
        s.type === 'class' &&
        s.name.toLowerCase().includes(iface.name.toLowerCase().replace('interface', '').replace('strategy', ''))
      );

      if (implementations.length >= 2) {
        patterns.push({
          pattern: 'Strategy',
          location: `${iface.name}`,
          file: iface.file,
          line: iface.startLine,
          confidence: 0.75,
          suggestion: 'Strategy pattern detected. Ensure all implementations follow the same interface contract.'
        });
      }
    }

    return patterns;
  }

  /**
   * Observer Pattern: Classes with add/remove listener methods
   */
  private detectObserverPattern(symbols: CodeSymbol[]): PatternDetection[] {
    const patterns: PatternDetection[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'class') {
        const addMethods = symbols.filter(s =>
          s.type === 'method' &&
          s.file === symbol.file &&
          (s.name.toLowerCase().includes('add') || s.name.toLowerCase().includes('register')) &&
          (s.name.toLowerCase().includes('listener') || s.name.toLowerCase().includes('observer'))
        );

        const removeMethods = symbols.filter(s =>
          s.type === 'method' &&
          s.file === symbol.file &&
          (s.name.toLowerCase().includes('remove') || s.name.toLowerCase().includes('unregister')) &&
          (s.name.toLowerCase().includes('listener') || s.name.toLowerCase().includes('observer'))
        );

        if (addMethods.length > 0 && removeMethods.length > 0) {
          patterns.push({
            pattern: 'Observer',
            location: `${symbol.name}`,
            file: symbol.file,
            line: symbol.startLine,
            confidence: 0.8,
            suggestion: 'Observer pattern detected. Ensure proper cleanup of observers to prevent memory leaks.'
          });
        }
      }
    }

    return patterns;
  }

  /**
   * God Object: Class with too many methods/fields
   */
  private detectGodObject(symbols: CodeSymbol[]): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'class') {
        const classMethods = symbols.filter(s =>
          s.type === 'method' &&
          s.file === symbol.file
        );

        const classFields = symbols.filter(s =>
          (s.type === 'variable' || s.type === 'method') &&
          s.file === symbol.file
        );

        // Threshold: More than 20 methods or 15 fields
        if (classMethods.length > 20 || classFields.length > 15) {
          antiPatterns.push({
            type: 'God Object',
            location: `${symbol.name}`,
            file: symbol.file,
            severity: 'high',
            suggestion: `Class has ${classMethods.length} methods and ${classFields.length} fields. Consider splitting into smaller, focused classes following Single Responsibility Principle.`
          });
        }
      }
    }

    return antiPatterns;
  }

  /**
   * Long Method: Method with too many lines
   */
  private detectLongMethod(symbols: CodeSymbol[]): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'method') {
        const lines = symbol.endLine - symbol.startLine;
        
        // Threshold: More than 50 lines
        if (lines > 50) {
          antiPatterns.push({
            type: 'Long Method',
            location: `${symbol.name}()`,
            file: symbol.file,
            severity: lines > 100 ? 'high' : 'medium',
            suggestion: `Method has ${lines} lines. Consider extracting smaller methods. Methods should ideally be under 20-30 lines.`
          });
        }
      }
    }

    return antiPatterns;
  }

  /**
   * Feature Envy: Method uses more features of another class than its own
   */
  private detectFeatureEnvy(symbols: CodeSymbol[]): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];

    // This is a simplified detection - full implementation would need call graph analysis
    for (const symbol of symbols) {
      if (symbol.type === 'method' && symbol.code) {
        // Check if method has many calls to other classes
        const externalCalls = (symbol.code.match(/\.\w+\(/g) || []).length;
        const internalCalls = (symbol.code.match(/this\.\w+\(/g) || []).length;

        if (externalCalls > internalCalls * 2 && externalCalls > 5) {
          antiPatterns.push({
            type: 'Feature Envy',
            location: `${symbol.name}()`,
            file: symbol.file,
            severity: 'medium',
            suggestion: 'Method seems to be more interested in another class. Consider moving this method to the class it uses most.'
          });
        }
      }
    }

    return antiPatterns;
  }

  /**
   * Primitive Obsession: Overuse of primitives instead of value objects
   */
  private detectPrimitiveObsession(symbols: CodeSymbol[]): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];

    for (const symbol of symbols) {
      if (symbol.type === 'method') {
        // Check for many primitive parameters
        const primitiveParams = symbol.parameters?.filter(p =>
          ['String', 'int', 'long', 'double', 'float', 'boolean'].includes(p.type || '')
        ) || [];

        if (primitiveParams.length > 5) {
          antiPatterns.push({
            type: 'Primitive Obsession',
            location: `${symbol.name}()`,
            file: symbol.file,
            severity: 'low',
            suggestion: `Method has ${primitiveParams.length} primitive parameters. Consider creating a value object to group related parameters.`
          });
        }
      }
    }

    return antiPatterns;
  }
}




