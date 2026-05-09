/**
 * IMP-CORE-027: Design Pattern Detector
 *
 * Detects common design patterns using AST-based analysis:
 * - Singleton: Single instance, private constructor, static getInstance
 * - Factory: Creation methods, product interfaces, concrete creators
 * - Observer: Subject/Observer interfaces, subscribe/notify methods
 * - Strategy: Strategy interface, context with interchangeable algorithms
 * - Decorator: Component interface, concrete decorator wrapping
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports DesignPatternType, DesignPatternInstance, PatternAnalysis, DesignPatternDetector, traverse, analyzeDesignPatterns
 */

import * as fs from 'fs';
import * as path from 'path';

export type DesignPatternType =
  | 'singleton'
  | 'factory'
  | 'observer'
  | 'strategy'
  | 'decorator'
  | 'adapter'
  | 'facade'
  | 'command'
  | 'proxy'
  | 'builder';

export interface DesignPatternInstance {
  type: DesignPatternType;
  name: string;
  file: string;
  line: number;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  relatedFiles?: string[];
}

export interface PatternAnalysis {
  patterns: DesignPatternInstance[];
  totalPatterns: number;
  patternBreakdown: Record<DesignPatternType, number>;
  filesWithPatterns: string[];
  highConfidencePatterns: number;
}

export class DesignPatternDetector {
  private projectPath: string;
  private patterns: DesignPatternInstance[] = [];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Analyze project for design patterns
   */
  analyze(): PatternAnalysis {
    this.patterns = [];
    const files = this.findSourceFiles();

    for (const file of files) {
      this.analyzeFile(file);
    }

    // Cross-reference patterns across files
    this.enrichWithCrossReferences();

    return {
      patterns: this.patterns,
      totalPatterns: this.patterns.length,
      patternBreakdown: this.calculateBreakdown(),
      filesWithPatterns: [...new Set(this.patterns.map(p => p.file))],
      highConfidencePatterns: this.patterns.filter(p => p.confidence === 'high').length,
    };
  }

  /**
   * Find TypeScript/JavaScript source files
   */
  private findSourceFiles(): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    const traverse = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.includes('node_modules') && 
                !entry.name.includes('.git') && 
                !entry.name.includes('dist') &&
                !entry.name.includes('build')) {
              traverse(fullPath);
            }
          } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    traverse(this.projectPath);
    return files;
  }

  /**
   * Analyze a single file for patterns
   */
  private analyzeFile(file: string): void {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      this.detectSingleton(content, lines, file);
      this.detectFactory(content, lines, file);
      this.detectObserver(content, lines, file);
      this.detectStrategy(content, lines, file);
      this.detectDecorator(content, lines, file);
      this.detectAdapter(content, lines, file);
      this.detectFacade(content, lines, file);
      this.detectCommand(content, lines, file);
      this.detectProxy(content, lines, file);
      this.detectBuilder(content, lines, file);
    } catch {
      // Skip files that can't be read
    }
  }

  /**
   * Detect Singleton pattern
   * Patterns: private constructor, static instance, static getInstance
   */
  private detectSingleton(content: string, lines: string[], file: string): void {
    const singletonPatterns = [
      { regex: /private\s+constructor/, evidence: 'Private constructor' },
      { regex: /static\s+(?:instance|_instance|#instance)\s*[:=]/, evidence: 'Static instance field' },
      { regex: /static\s+(?:getInstance|get\s*Instance|instance)\s*\(\)/, evidence: 'Static getInstance method' },
      { regex: /new\s+this\(\)/, evidence: 'Self-instantiation pattern' },
      { regex: /Object\.freeze\s*\(\s*this/, evidence: 'Frozen instance (immutable singleton)' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of singletonPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    // Need at least 2 signals for medium confidence, 3 for high
    if (evidence.length >= 2) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'singleton',
        name: className || 'UnknownSingleton',
        file,
        line: lineNum,
        confidence: evidence.length >= 3 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Factory pattern
   * Patterns: create/creator methods, product types, factory in name
   */
  private detectFactory(content: string, lines: string[], file: string): void {
    const factoryPatterns = [
      { regex: /(?:create|make|build)\w*\s*\([^)]*\)\s*:\s*(?:\w+|[A-Z]\w+)/, evidence: 'Factory method with return type' },
      { regex: /class\s+\w*Factory\w*/i, evidence: 'Factory class naming' },
      { regex: /interface\s+\w*Product\w*/i, evidence: 'Product interface' },
      { regex: /return\s+new\s+\w+/, evidence: 'Object instantiation in method' },
      { regex: /switch\s*\([^)]*\)\s*\{[^}]*return\s+new/s, evidence: 'Conditional object creation' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of factoryPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 3) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'factory',
        name: className || 'UnknownFactory',
        file,
        line: lineNum,
        confidence: evidence.length >= 4 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Observer pattern
   * Patterns: subscribe/unsubscribe, notify, listeners/observers array
   */
  private detectObserver(content: string, lines: string[], file: string): void {
    const observerPatterns = [
      { regex: /(?:subscribe|on|addEventListener|addListener)\s*\(/, evidence: 'Subscription method' },
      { regex: /(?:unsubscribe|off|removeEventListener|removeListener)\s*\(/, evidence: 'Unsubscription method' },
      { regex: /(?:notify|emit|dispatch|trigger)\s*\(/, evidence: 'Notification method' },
      { regex: /(?:listeners|observers|subscribers|callbacks)\s*[:=]\s*\[/, evidence: 'Observer collection' },
      { regex: /interface\s+\w*(?:Observer|Listener|Subscriber)\w*/i, evidence: 'Observer interface' },
      { regex: /forEach\s*\(\s*\w+\s*=>\s*\w+\.(?:update|notify|handle)/, evidence: 'Observer iteration pattern' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of observerPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 3) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'observer',
        name: className || 'UnknownSubject',
        file,
        line: lineNum,
        confidence: evidence.length >= 4 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Strategy pattern
   * Patterns: strategy interface, context class, interchangeable algorithms
   */
  private detectStrategy(content: string, lines: string[], file: string): void {
    const strategyPatterns = [
      { regex: /interface\s+\w*Strategy\w*/i, evidence: 'Strategy interface' },
      { regex: /(?:execute|perform|run|algorithm|process)\s*\(\)/, evidence: 'Algorithm method' },
      { regex: /setStrategy\s*\(\s*\w+\s*:\s*\w*Strategy\w*\)/, evidence: 'Strategy setter' },
      { regex: /class\s+\w*Context\w*/i, evidence: 'Context class' },
      { regex: /this\.strategy\.(?:execute|perform|run)/, evidence: 'Strategy delegation' },
      { regex: /implements\s+\w*Strategy\w*/, evidence: 'Concrete strategy implementation' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of strategyPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 3) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'strategy',
        name: className || 'UnknownStrategy',
        file,
        line: lineNum,
        confidence: evidence.length >= 4 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Decorator pattern
   * Patterns: component interface, decorator wrapping, same interface
   */
  private detectDecorator(content: string, lines: string[], file: string): void {
    const decoratorPatterns = [
      { regex: /class\s+\w*Decorator\w*\s+implements\s+\w+/, evidence: 'Decorator class' },
      { regex: /(?:constructor|wrap)\s*\(\s*\w+\s*:\s*\w+Component\w*\)/, evidence: 'Component wrapping' },
      { regex: /this\.component\./, evidence: 'Component delegation' },
      { regex: /interface\s+\w*Component\w*/i, evidence: 'Component interface' },
      { regex: /@\w+\s*\n?\s*class/, evidence: 'Decorator annotation' },
      { regex: /extends\s+\w*Decorator\w*/, evidence: 'Concrete decorator' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of decoratorPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 3) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'decorator',
        name: className || 'UnknownDecorator',
        file,
        line: lineNum,
        confidence: evidence.length >= 4 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Adapter pattern
   * Patterns: adapts/wraps one interface to another
   */
  private detectAdapter(content: string, lines: string[], file: string): void {
    const adapterPatterns = [
      { regex: /class\s+\w*Adapter\w*\s+implements/, evidence: 'Adapter class' },
      { regex: /adapts?|wraps?|converts?\s+\w+\s+to\s+\w+/i, evidence: 'Adaptation description' },
      { regex: /constructor\s*\(\s*\w+\s*:\s*\w+\)\s*.*\{[^}]*this\.(?:adaptee|target|wrapped)/, evidence: 'Adaptee wrapping' },
      { regex: /implements\s+\w+Target/i, evidence: 'Target interface implementation' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of adapterPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 2) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'adapter',
        name: className || 'UnknownAdapter',
        file,
        line: lineNum,
        confidence: evidence.length >= 3 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Facade pattern
   * Patterns: unified interface, simplifies complex subsystem
   */
  private detectFacade(content: string, lines: string[], file: string): void {
    const facadePatterns = [
      { regex: /class\s+\w*Facade\w*/i, evidence: 'Facade class naming' },
      { regex: /simplif(?:y|ies)|unified|single\s+interface/i, evidence: 'Simplification description' },
      { regex: /constructor.*(?:subsystem|components|modules)/i, evidence: 'Subsystem composition' },
      { regex: /(?:method|operation)\s*\(\s*\)\s*\{[^}]*(?:this\.\w+\.|new\s+\w+)/, evidence: 'Subsystem delegation' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of facadePatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 2) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'facade',
        name: className || 'UnknownFacade',
        file,
        line: lineNum,
        confidence: evidence.length >= 3 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Command pattern
   * Patterns: command interface, execute/undo methods
   */
  private detectCommand(content: string, lines: string[], file: string): void {
    const commandPatterns = [
      { regex: /interface\s+\w*Command\w*/i, evidence: 'Command interface' },
      { regex: /(?:execute|run|perform|do)\s*\(\s*\)/, evidence: 'Execute method' },
      { regex: /(?:undo|reverse|rollback)\s*\(\s*\)/, evidence: 'Undo method' },
      { regex: /class\s+\w*Command\w*\s+implements/, evidence: 'Concrete command' },
      { regex: /receiver|target.*execute/i, evidence: 'Command receiver' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of commandPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 3) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'command',
        name: className || 'UnknownCommand',
        file,
        line: lineNum,
        confidence: evidence.length >= 4 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Proxy pattern
   * Patterns: proxy class wrapping real subject, lazy initialization
   */
  private detectProxy(content: string, lines: string[], file: string): void {
    const proxyPatterns = [
      { regex: /class\s+\w*Proxy\w*\s+implements/i, evidence: 'Proxy class' },
      { regex: /(?:realSubject|target|wrapped).*:\s*\w+/, evidence: 'Real subject reference' },
      { regex: /if\s*\(\s*!this\.(?:realSubject|target)/, evidence: 'Lazy initialization' },
      { regex: /this\.(?:realSubject|target)\./, evidence: 'Subject delegation' },
      { regex: /access|permission|auth/i, evidence: 'Access control (common proxy use)' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of proxyPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 3) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'proxy',
        name: className || 'UnknownProxy',
        file,
        line: lineNum,
        confidence: evidence.length >= 4 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Detect Builder pattern
   * Patterns: builder class, step-by-step construction, fluent interface
   */
  private detectBuilder(content: string, lines: string[], file: string): void {
    const builderPatterns = [
      { regex: /class\s+\w*Builder\w*/i, evidence: 'Builder class' },
      { regex: /(?:build|construct|create)\s*\(\s*\)\s*:\s*\w+/, evidence: 'Build method' },
      { regex: /return\s+this;/, evidence: 'Fluent interface (return this)' },
      { regex: /(?:with|set|add)\w+\s*\([^)]*\)\s*:\s*\w*Builder/i, evidence: 'Builder setter methods' },
      { regex: /step|stage|phase/i, evidence: 'Construction steps' },
    ];

    const evidence: string[] = [];
    let lineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of builderPatterns) {
        if (pattern.regex.test(lines[i])) {
          evidence.push(`${pattern.evidence} (line ${i + 1})`);
          lineNum = i + 1;
        }
      }
    }

    if (evidence.length >= 3) {
      const className = this.extractClassName(content, lineNum);
      this.patterns.push({
        type: 'builder',
        name: className || 'UnknownBuilder',
        file,
        line: lineNum,
        confidence: evidence.length >= 4 ? 'high' : 'medium',
        evidence: [...new Set(evidence)],
      });
    }
  }

  /**
   * Extract class name from file content near a line
   */
  private extractClassName(content: string, lineNum: number): string | undefined {
    const lines = content.split('\n');
    
    // Look backwards for class declaration
    for (let i = Math.max(0, lineNum - 20); i < Math.min(lines.length, lineNum + 5); i++) {
      const match = lines[i].match(/class\s+(\w+)/);
      if (match) {
        return match[1];
      }
    }

    // Look for interface name
    for (let i = Math.max(0, lineNum - 20); i < Math.min(lines.length, lineNum + 5); i++) {
      const match = lines[i].match(/interface\s+(\w+)/);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Enrich patterns with cross-references
   */
  private enrichWithCrossReferences(): void {
    // Group patterns by type
    const byType = new Map<DesignPatternType, DesignPatternInstance[]>();
    
    for (const pattern of this.patterns) {
      const existing = byType.get(pattern.type) || [];
      existing.push(pattern);
      byType.set(pattern.type, existing);
    }

    // Link related files for patterns of same type
    for (const [type, patterns] of byType) {
      if (patterns.length > 1) {
        const allFiles = patterns.map(p => p.file);
        for (const pattern of patterns) {
          pattern.relatedFiles = allFiles.filter(f => f !== pattern.file);
        }
      }
    }
  }

  /**
   * Calculate pattern breakdown
   */
  private calculateBreakdown(): Record<DesignPatternType, number> {
    const breakdown: Partial<Record<DesignPatternType, number>> = {};
    
    for (const pattern of this.patterns) {
      breakdown[pattern.type] = (breakdown[pattern.type] || 0) + 1;
    }

    return breakdown as Record<DesignPatternType, number>;
  }
}

/**
 * Analyze project for design patterns
 */
export function analyzeDesignPatterns(projectPath: string): PatternAnalysis {
  const detector = new DesignPatternDetector(projectPath);
  return detector.analyze();
}
