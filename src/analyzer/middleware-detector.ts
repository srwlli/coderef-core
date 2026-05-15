/**
 * @coderef-semantic: 1.0.0
 * @exports MiddlewareMapping, MiddlewareChain, MiddlewareHandler, DIContainer, DIProvider, DIImport, MiddlewareAnalysis, MiddlewareDetector, analyzeMiddlewareAndDI
 * @used_by src/cli/coderef-analyze.ts
 */



/**
 * IMP-CORE-010, IMP-CORE-043: Middleware and Dependency Injection Detector
 *
 * Detects middleware chains and DI patterns:
 * - Express middleware chains (app.use, app.get, etc.)
 * - FastAPI dependencies (Depends, dependency injection)
 * - NestJS providers, modules, controllers (@Module, @Injectable, @Controller)
 * - Angular DI (@Injectable, providers, NgModule)
 * - Flask decorators (@require_auth, @login_required)
 * - Django decorators (@login_required, @permission_required)
 * - Middleware pattern mapping for framework migrations
 */

import type { ElementData } from '../types/types.js';

/**
 * Middleware pattern mapping for framework migrations
 * Matches migration-config-schema.json middlewareMappings structure
 */
export interface MiddlewareMapping {
  name: string;
  category: 'authentication' | 'authorization' | 'rate_limiting' | 'logging' | 'cors' | 'validation' | 'compression' | 'error_handling' | 'security';
  source: {
    framework: 'flask' | 'express' | 'django' | 'fastapi' | 'nestjs';
    pattern: string;
    patternType: 'decorator' | 'function' | 'middleware_chain' | 'guard' | 'interceptor';
    importPath?: string;
    arguments?: string[];
  };
  target: {
    framework: 'fastapi' | 'nestjs' | 'express' | 'flask';
    pattern: string;
    patternType: 'decorator' | 'function' | 'middleware_chain' | 'guard' | 'interceptor' | 'dependency';
    importPath?: string;
    dependencyFunction?: string;
    arguments?: string[];
  };
  conversionNotes?: string;
  autoConvertible: boolean;
}

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
  mappings: MiddlewareMapping[];
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
    const mappings = this.detectMiddlewareMappings();

    return {
      chains,
      containers,
      mappings,
      totalMiddlewares: chains.reduce((sum, c) => sum + c.handlers.filter(h => h.type === 'middleware').length, 0),
      totalRoutes: chains.reduce((sum, c) => sum + c.handlers.filter(h => h.type === 'route').length, 0),
      totalProviders: containers.reduce((sum, c) => sum + c.providers.length, 0),
      frameworkBreakdown: this.calculateFrameworkBreakdown(chains, containers, mappings),
    };
  }

  /**
   * IMP-CORE-043: Detect middleware patterns for framework migration mapping
   * Detects Flask/Django decorators and maps to target framework equivalents
   */
  private detectMiddlewareMappings(): MiddlewareMapping[] {
    const mappings: MiddlewareMapping[] = [];

    // Flask decorator detection
    mappings.push(...this.detectFlaskMiddlewareMappings());

    // Django decorator detection
    mappings.push(...this.detectDjangoMiddlewareMappings());

    // Express middleware chain detection
    mappings.push(...this.detectExpressMiddlewareMappings());

    return mappings;
  }

  /**
   * Detect Flask middleware decorators and create migration mappings
   */
  private detectFlaskMiddlewareMappings(): MiddlewareMapping[] {
    const mappings: MiddlewareMapping[] = [];

    // Pattern: Flask authentication decorators
    const flaskAuthPattern = /@(\w+)\.(login_required|require_auth)\s*(?:\([^)]*\))?/g;
    let match;

    while ((match = flaskAuthPattern.exec(this.content)) !== null) {
      const decoratorName = match[2];
      const line = this.getLineNumber(match.index);

      if (decoratorName === 'login_required') {
        mappings.push({
          name: 'login_required',
          category: 'authentication',
          source: {
            framework: 'flask',
            pattern: '@login_required',
            patternType: 'decorator',
            importPath: 'flask_login'
          },
          target: {
            framework: 'fastapi',
            pattern: 'Depends(require_active_user)',
            patternType: 'dependency',
            importPath: 'fastapi',
            dependencyFunction: 'require_active_user'
          },
          conversionNotes: 'Requires creating require_active_user() dependency function. Consider using OAuth2PasswordBearer for token-based auth.',
          autoConvertible: false
        });
      } else if (decoratorName === 'require_auth') {
        mappings.push({
          name: 'require_auth',
          category: 'authentication',
          source: {
            framework: 'flask',
            pattern: '@require_auth',
            patternType: 'decorator',
            importPath: 'flask_login'
          },
          target: {
            framework: 'fastapi',
            pattern: 'Depends(get_current_user)',
            patternType: 'dependency',
            importPath: 'fastapi',
            dependencyFunction: 'get_current_user'
          },
          conversionNotes: 'Requires creating get_current_user() dependency function that validates JWT/API tokens.',
          autoConvertible: false
        });
      }
    }

    // Flask rate limiting
    const rateLimitPattern = /@limiter\.limit\s*\(['"]([^'"]+)['"]/g;
    while ((match = rateLimitPattern.exec(this.content)) !== null) {
      mappings.push({
        name: 'rate_limit',
        category: 'rate_limiting',
        source: {
          framework: 'flask',
          pattern: `@limiter.limit('${match[1]}')`,
          patternType: 'decorator',
          importPath: 'flask_limiter'
        },
        target: {
          framework: 'fastapi',
          pattern: 'Depends(rate_limit)',
          patternType: 'dependency',
          importPath: 'slowapi'
        },
        conversionNotes: 'Install slowapi for FastAPI rate limiting. Create custom dependency or use slowapi.Limiter.',
        autoConvertible: true
      });
    }

    // Flask CORS
    const corsPattern = /@cross_origin\s*(?:\([^)]*\))?/g;
    while ((match = corsPattern.exec(this.content)) !== null) {
      mappings.push({
        name: 'cors',
        category: 'cors',
        source: {
          framework: 'flask',
          pattern: '@cross_origin()',
          patternType: 'decorator',
          importPath: 'flask_cors'
        },
        target: {
          framework: 'fastapi',
          pattern: 'CORSMiddleware',
          patternType: 'middleware_chain',
          importPath: 'fastapi.middleware.cors'
        },
        conversionNotes: 'Move CORS to app-level middleware in FastAPI: app.add_middleware(CORSMiddleware, ...)',
        autoConvertible: true
      });
    }

    return mappings;
  }

  /**
   * Detect Django middleware decorators and create migration mappings
   */
  private detectDjangoMiddlewareMappings(): MiddlewareMapping[] {
    const mappings: MiddlewareMapping[] = [];

    // Django authentication decorators
    const djangoAuthPattern = /@(login_required|permission_required|user_passes_test)\s*(?:\([^)]*\))?/g;
    let match;

    while ((match = djangoAuthPattern.exec(this.content)) !== null) {
      const decoratorName = match[1];

      if (decoratorName === 'login_required') {
        mappings.push({
          name: 'login_required',
          category: 'authentication',
          source: {
            framework: 'django',
            pattern: '@login_required',
            patternType: 'decorator'
          },
          target: {
            framework: 'fastapi',
            pattern: 'Depends(require_active_user)',
            patternType: 'dependency',
            importPath: 'fastapi'
          },
          conversionNotes: 'Django session auth → FastAPI token auth. Replace session-based with JWT/OAuth2.',
          autoConvertible: false
        });
      } else if (decoratorName === 'permission_required') {
        mappings.push({
          name: 'permission_required',
          category: 'authorization',
          source: {
            framework: 'django',
            pattern: '@permission_required("...")',
            patternType: 'decorator'
          },
          target: {
            framework: 'fastapi',
            pattern: '@require_permissions',
            patternType: 'decorator'
          },
          conversionNotes: 'Django permissions → custom FastAPI dependency or RBAC system.',
          autoConvertible: false
        });
      }
    }

    // Django CSRF protection (not applicable in FastAPI)
    const csrfPattern = /@csrf_protect|@csrf_exempt/g;
    while ((match = csrfPattern.exec(this.content)) !== null) {
      mappings.push({
        name: 'csrf_handling',
        category: 'security',
        source: {
          framework: 'django',
          pattern: match[0],
          patternType: 'decorator'
        },
        target: {
          framework: 'fastapi',
          pattern: 'N/A (stateless API)',
          patternType: 'decorator'
        },
        conversionNotes: 'CSRF not needed for stateless FastAPI with token auth. Remove decorator.',
        autoConvertible: true
      });
    }

    return mappings;
  }

  /**
   * Detect Express middleware patterns for migration
   */
  private detectExpressMiddlewareMappings(): MiddlewareMapping[] {
    const mappings: MiddlewareMapping[] = [];

    // Express auth middleware
    const expressAuthPattern = /app\.use\s*\(\s*(?:require\s*\(\s*['"]\.\/middleware\/auth['"]\s*\)|auth|authenticate|ensureAuthenticated)/g;
    let match;

    while ((match = expressAuthPattern.exec(this.content)) !== null) {
      mappings.push({
        name: 'auth_middleware',
        category: 'authentication',
        source: {
          framework: 'express',
          pattern: 'app.use(auth)',
          patternType: 'middleware_chain',
          importPath: './middleware/auth'
        },
        target: {
          framework: 'nestjs',
          pattern: '@UseGuards(AuthGuard)',
          patternType: 'guard',
          importPath: '@nestjs/common'
        },
        conversionNotes: 'Express middleware → NestJS Guard. Implement CanActivate interface.',
        autoConvertible: false
      });
    }

    // Express rate limiting
    const expressRateLimitPattern = /app\.use\s*\(\s*rateLimit\s*\(/g;
    while ((match = expressRateLimitPattern.exec(this.content)) !== null) {
      mappings.push({
        name: 'express_rate_limit',
        category: 'rate_limiting',
        source: {
          framework: 'express',
          pattern: 'app.use(rateLimit({...}))',
          patternType: 'middleware_chain',
          importPath: 'express-rate-limit'
        },
        target: {
          framework: 'nestjs',
          pattern: '@UseInterceptors(RateLimitInterceptor)',
          patternType: 'interceptor',
          importPath: '@nestjs/throttler'
        },
        conversionNotes: 'Use @nestjs/throttler or implement custom RateLimitInterceptor.',
        autoConvertible: true
      });
    }

    return mappings;
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
    containers: DIContainer[],
    mappings: MiddlewareMapping[]
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    chains.forEach(chain => {
      breakdown[chain.framework] = (breakdown[chain.framework] || 0) + 1;
    });
    
    containers.forEach(container => {
      breakdown[container.framework] = (breakdown[container.framework] || 0) + 1;
    });
    
    mappings.forEach(mapping => {
      breakdown[mapping.source.framework] = (breakdown[mapping.source.framework] || 0) + 1;
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
  const allMappings: MiddlewareMapping[] = [];

  for (const [file, content] of files) {
    const fileElements = elements.filter(e => e.file === file);
    const detector = new MiddlewareDetector(fileElements, content, file);
    const result = detector.detect();
    
    allChains.push(...(result.chains || []));
    allContainers.push(...(result.containers || []));
    allMappings.push(...(result.mappings || []));
  }

  return {
    chains: allChains,
    containers: allContainers,
    mappings: allMappings,
    totalMiddlewares: allChains.reduce((sum, c) => sum + c.handlers.filter(h => h.type === 'middleware').length, 0),
    totalRoutes: allChains.reduce((sum, c) => sum + c.handlers.filter(h => h.type === 'route').length, 0),
    totalProviders: allContainers.reduce((sum, c) => sum + c.providers.length, 0),
    frameworkBreakdown: calculateTotalFrameworkBreakdown(allChains, allContainers, allMappings),
  };
}

/**
 * Calculate framework breakdown totals
 */
function calculateTotalFrameworkBreakdown(
  chains: MiddlewareChain[],
  containers: DIContainer[],
  mappings: MiddlewareMapping[]
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  
  chains.forEach(chain => {
    breakdown[chain.framework] = (breakdown[chain.framework] || 0) + 1;
  });
  
  containers.forEach(container => {
    breakdown[container.framework] = (breakdown[container.framework] || 0) + 1;
  });
  
  mappings.forEach(mapping => {
    breakdown[mapping.source.framework] = (breakdown[mapping.source.framework] || 0) + 1;
  });
  
  return breakdown;
}
