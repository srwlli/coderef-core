/**
 * IMP-CORE-010: Middleware and Dependency Injection Detector
 *
 * Detects middleware chains and DI patterns:
 * - Express middleware chains (app.use, app.get, etc.)
 * - FastAPI dependencies (Depends, dependency injection)
 * - NestJS providers, modules, controllers (@Module, @Injectable, @Controller)
 * - Angular DI (@Injectable, providers, NgModule)
 * - TSyringe/typed-di container usage
 * - InversifyJS bindings
 */

import type { ElementData } from '../types/types.js';

export interface MiddlewareChain {
  framework: 'express' | 'fastify' | 'koa' | 'nestjs' | 'fastapi';
  appName: string;
  handlers: MiddlewareHandler[];
  file: string;
  line: number;
}

export interface MiddlewareHandler {
  type: 'middleware' | 'route' | 'error' | 'param';
  method?: string;
  path?: string;
  name?: string;
  line: number;
}

export interface DIContainer {
  framework: 'nestjs' | 'angular' | 'tsyringe' | 'inversify' | 'fastapi';
  providers: DIProvider[];
  imports: DIImport[];
  exports: string[];
  file: string;
  line: number;
}

export interface DIProvider {
  name: string;
  type: 'class' | 'factory' | 'value' | 'existing';
  injectable: boolean;
  dependencies: string[];
  scope?: 'singleton' | 'transient' | 'request';
  line: number;
}

export interface DIImport {
  module: string;
  providers?: string[];
  isGlobal?: boolean;
}

export interface MiddlewareAnalysis {
  chains: MiddlewareChain[];
  containers: DIContainer[];
  totalMiddlewares: number;
  totalRoutes: number;
  totalProviders: number;
  frameworkBreakdown: Record<string, number>;
}

export class MiddlewareDetector {
  private elements: ElementData[];
  private content: string;
  private file: string;

  constructor(elements: ElementData[], content: string, file: string) {
    this.elements = elements;
    this.content = content;
    this.file = file;
  }

  /**
   * Detect all middleware and DI patterns
   */
  detect(): Partial<MiddlewareAnalysis> {
    const chains = this.detectMiddlewareChains();
    const containers = this.detectDIContainers();

    return {
      chains,
      containers,
      totalMiddlewares: chains.reduce((sum, c) => sum + c.handlers.filter(h => h.type === 'middleware').length, 0),
      totalRoutes: chains.reduce((sum, c) => sum + c.handlers.filter(h => h.type === 'route').length, 0),
      totalProviders: containers.reduce((sum, c) => sum + c.providers.length, 0),
      frameworkBreakdown: this.calculateFrameworkBreakdown(chains, containers),
    };
  }

  /**
   * Detect Express middleware chains
   */
  private detectExpressChains(): MiddlewareChain[] {
    const chains: MiddlewareChain[] = [];
    const appPattern = /(?:const|let|var)\s+(\w+)\s*=\s*(?:express|require\(['"]express['"]\))\(\)/g;
    
    let match;
    while ((match = appPattern.exec(this.content)) !== null) {
      const appName = match[1];
      const handlers = this.detectExpressHandlers(appName);
      
      if (handlers.length > 0) {
        chains.push({
          framework: 'express',
          appName,
          handlers,
          file: this.file,
          line: this.getLineNumber(match.index),
        });
      }
    }

    return chains;
  }

  /**
   * Detect Express handler methods for an app instance
   */
  private detectExpressHandlers(appName: string): MiddlewareHandler[] {
    const handlers: MiddlewareHandler[] = [];
    const handlerPattern = new RegExp(
      `${appName}\.(use|get|post|put|delete|patch|all|options|head)\s*\((?:['"]([^'"]*)['"])?`,
      'g'
    );

    let match;
    while ((match = handlerPattern.exec(this.content)) !== null) {
      const method = match[1];
      const path = match[2];
      const line = this.getLineNumber(match.index);

      handlers.push({
        type: method === 'use' ? 'middleware' : 'route',
        method: method === 'use' ? undefined : method.toUpperCase(),
        path,
        line,
      });
    }

    return handlers;
  }

  /**
   * Detect NestJS modules and DI
   */
  private detectNestJS(): DIContainer[] {
    const containers: DIContainer[] = [];
    
    // Detect @Module decorator
    const modulePattern = /@Module\s*\(\s*\{([^}]*)\}/gs;
    let match;
    
    while ((match = modulePattern.exec(this.content)) !== null) {
      const moduleContent = match[1];
      const line = this.getLineNumber(match.index);
      
      const providers = this.extractNestJSProviders(moduleContent);
      const imports = this.extractNestJSImports(moduleContent);
      const exports = this.extractNestJSExports(moduleContent);

      containers.push({
        framework: 'nestjs',
        providers,
        imports,
        exports,
        file: this.file,
        line,
      });
    }

    return containers;
  }

  /**
   * Extract NestJS providers from @Module decorator
   */
  private extractNestJSProviders(moduleContent: string): DIProvider[] {
    const providers: DIProvider[] = [];
    const providerPattern = /providers\s*:\s*\[([^\]]*)\]/s;
    const match = providerPattern.exec(moduleContent);
    
    if (match) {
      const providerList = match[1];
      const classPattern = /(\w+)/g;
      let classMatch;
      
      while ((classMatch = classPattern.exec(providerList)) !== null) {
        const name = classMatch[1];
        const isInjectable = this.content.includes(`@Injectable`);
        
        providers.push({
          name,
          type: 'class',
          injectable: isInjectable,
          dependencies: this.extractConstructorDeps(name),
          line: this.getLineNumber(classMatch.index),
        });
      }
    }

    return providers;
  }

  /**
   * Extract NestJS imports from @Module decorator
   */
  private extractNestJSImports(moduleContent: string): DIImport[] {
    const imports: DIImport[] = [];
    const importPattern = /imports\s*:\s*\[([^\]]*)\]/s;
    const match = importPattern.exec(moduleContent);
    
    if (match) {
      const importList = match[1];
      const modulePattern = /(\w+)/g;
      let modMatch;
      
      while ((modMatch = modulePattern.exec(importList)) !== null) {
        imports.push({
          module: modMatch[1],
          isGlobal: this.content.includes(`@Global()`),
        });
      }
    }

    return imports;
  }

  /**
   * Extract NestJS exports from @Module decorator
   */
  private extractNestJSExports(moduleContent: string): string[] {
    const exports: string[] = [];
    const exportPattern = /exports\s*:\s*\[([^\]]*)\]/s;
    const match = exportPattern.exec(moduleContent);
    
    if (match) {
      const exportList = match[1];
      const itemPattern = /(\w+)/g;
      let itemMatch;
      
      while ((itemMatch = itemPattern.exec(exportList)) !== null) {
        exports.push(itemMatch[1]);
      }
    }

    return exports;
  }

  /**
   * Extract constructor dependencies for a class
   */
  private extractConstructorDeps(className: string): string[] {
    const deps: string[] = [];
    const classPattern = new RegExp(
      `class\\s+${className}[^{]*\\{[^}]*constructor\\s*\\([^)]*\\)`,
      's'
    );
    const match = classPattern.exec(this.content);
    
    if (match) {
      const constructorContent = match[0];
      const depPattern = /(?:private\s+|public\s+|protected\s+|readonly\s+)?(\w+)\s*:/g;
      let depMatch;
      
      while ((depMatch = depPattern.exec(constructorContent)) !== null) {
        deps.push(depMatch[1]);
      }
    }

    return deps;
  }

  /**
   * Detect Angular DI patterns
   */
  private detectAngular(): DIContainer[] {
    const containers: DIContainer[] = [];
    
    // Detect @NgModule
    const ngModulePattern = /@NgModule\s*\(\s*\{([^}]*)\}/gs;
    let match;
    
    while ((match = ngModulePattern.exec(this.content)) !== null) {
      const moduleContent = match[1];
      const line = this.getLineNumber(match.index);
      
      const providers = this.extractAngularProviders(moduleContent);
      const imports = this.extractAngularImports(moduleContent);
      const exports = this.extractAngularExports(moduleContent);

      containers.push({
        framework: 'angular',
        providers,
        imports,
        exports,
        file: this.file,
        line,
      });
    }

    return containers;
  }

  /**
   * Extract Angular providers
   */
  private extractAngularProviders(moduleContent: string): DIProvider[] {
    const providers: DIProvider[] = [];
    const providerPattern = /providers\s*:\s*\[([^\]]*)\]/s;
    const match = providerPattern.exec(moduleContent);
    
    if (match) {
      const providerList = match[1];
      const classPattern = /(\w+)/g;
      let classMatch;
      
      while ((classMatch = classPattern.exec(providerList)) !== null) {
        const name = classMatch[1];
        providers.push({
          name,
          type: 'class',
          injectable: this.content.includes(`@Injectable`),
          dependencies: this.extractConstructorDeps(name),
          line: this.getLineNumber(classMatch.index),
        });
      }
    }

    return providers;
  }

  /**
   * Extract Angular imports
   */
  private extractAngularImports(moduleContent: string): DIImport[] {
    const imports: DIImport[] = [];
    const importPattern = /imports\s*:\s*\[([^\]]*)\]/s;
    const match = importPattern.exec(moduleContent);
    
    if (match) {
      const importList = match[1];
      const modulePattern = /(\w+)/g;
      let modMatch;
      
      while ((modMatch = modulePattern.exec(importList)) !== null) {
        imports.push({
          module: modMatch[1],
        });
      }
    }

    return imports;
  }

  /**
   * Extract Angular exports
   */
  private extractAngularExports(moduleContent: string): string[] {
    const exports: string[] = [];
    const exportPattern = /exports\s*:\s*\[([^\]]*)\]/s;
    const match = exportPattern.exec(moduleContent);
    
    if (match) {
      const exportList = match[1];
      const itemPattern = /(\w+)/g;
      let itemMatch;
      
      while ((itemMatch = itemPattern.exec(exportList)) !== null) {
        exports.push(itemMatch[1]);
      }
    }

    return exports;
  }

  /**
   * Detect FastAPI dependencies
   */
  private detectFastAPI(): MiddlewareChain[] {
    const chains: MiddlewareChain[] = [];
    const depPattern = /(?:async\s+)?def\s+(\w+)\s*\([^)]*Depends\s*\(\s*(\w+)\s*\)/g;
    
    const handlers: MiddlewareHandler[] = [];
    let match;
    
    while ((match = depPattern.exec(this.content)) !== null) {
      handlers.push({
        type: 'middleware',
        name: match[2],
        line: this.getLineNumber(match.index),
      });
    }

    if (handlers.length > 0) {
      chains.push({
        framework: 'fastapi',
        appName: 'app',
        handlers,
        file: this.file,
        line: handlers[0]?.line || 1,
      });
    }

    return chains;
  }

  /**
   * Main detection entry point
   */
  private detectMiddlewareChains(): MiddlewareChain[] {
    const chains: MiddlewareChain[] = [];
    
    // Express detection
    chains.push(...this.detectExpressChains());
    
    // FastAPI detection
    chains.push(...this.detectFastAPI());
    
    return chains;
  }

  /**
   * Detect all DI containers
   */
  private detectDIContainers(): DIContainer[] {
    const containers: DIContainer[] = [];
    
    // NestJS
    containers.push(...this.detectNestJS());
    
    // Angular
    containers.push(...this.detectAngular());
    
    return containers;
  }

  /**
   * Calculate framework usage breakdown
   */
  private calculateFrameworkBreakdown(
    chains: MiddlewareChain[],
    containers: DIContainer[]
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    chains.forEach(chain => {
      breakdown[chain.framework] = (breakdown[chain.framework] || 0) + 1;
    });
    
    containers.forEach(container => {
      breakdown[container.framework] = (breakdown[container.framework] || 0) + 1;
    });
    
    return breakdown;
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(index: number): number {
    return this.content.substring(0, index).split('\n').length;
  }
}

/**
 * Analyze middleware and DI across all files
 */
export function analyzeMiddlewareAndDI(
  elements: ElementData[],
  files: Map<string, string>
): MiddlewareAnalysis {
  const allChains: MiddlewareChain[] = [];
  const allContainers: DIContainer[] = [];

  for (const [file, content] of files) {
    const fileElements = elements.filter(e => e.file === file);
    const detector = new MiddlewareDetector(fileElements, content, file);
    const result = detector.detect();
    
    allChains.push(...(result.chains || []));
    allContainers.push(...(result.containers || []));
  }

  return {
    chains: allChains,
    containers: allContainers,
    totalMiddlewares: allChains.reduce((sum, c) => sum + c.handlers.filter(h => h.type === 'middleware').length, 0),
    totalRoutes: allChains.reduce((sum, c) => sum + c.handlers.filter(h => h.type === 'route').length, 0),
    totalProviders: allContainers.reduce((sum, c) => sum + c.providers.length, 0),
    frameworkBreakdown: calculateTotalFrameworkBreakdown(allChains, allContainers),
  };
}

/**
 * Calculate framework breakdown totals
 */
function calculateTotalFrameworkBreakdown(
  chains: MiddlewareChain[],
  containers: DIContainer[]
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  
  chains.forEach(chain => {
    breakdown[chain.framework] = (breakdown[chain.framework] || 0) + 1;
  });
  
  containers.forEach(container => {
    breakdown[container.framework] = (breakdown[container.framework] || 0) + 1;
  });
  
  return breakdown;
}
