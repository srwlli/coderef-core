// coderef-core/scanner.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { Worker } from 'worker_threads';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { ElementData, ScanOptions, RouteMetadata } from '../types/types.js';
import { createScannerCache, type ScanCacheEntry } from './lru-cache.js';
import { IncrementalCache } from '../cache/incremental-cache.js';
import {
  extractRouteMetadata,
  parseExpressRoute,
  parseNextJsRoute,
  parseNextJsPagesRoute,
  parseSvelteKitRoute,
  parseNuxtRoute,
  parseRemixRoute,
  parseFlaskRoute,
  parseFastAPIRoute
} from '../analyzer/route-parsers.js';
import { parseFetchCalls, parseAxiosCalls, parseReactQueryCalls, parseCustomApiCalls } from '../analyzer/frontend-call-parsers.js';
import { frameworkRegistry, type FrameworkDetectionResult } from './framework-registry.js';
import './register-frameworks.js'; // Auto-register default frameworks

/**
 * Pattern configuration with optional route metadata extraction
 * WO-API-ROUTE-DETECTION-001: Added extractMetadata callback
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Added extractFrontendCall callback
 */
export interface PatternConfig {
  type: ElementData['type'];
  pattern: RegExp;
  nameGroup: number;
  /** Optional callback to extract route metadata from matched code */
  extractMetadata?: (match: RegExpExecArray, content: string, line: number, file: string, fileContent: string) => RouteMetadata | null;
  /** Optional callback to extract frontend API call metadata from matched code */
  extractFrontendCall?: (match: RegExpExecArray, content: string, line: number, file: string, fileContent: string) => import('../analyzer/frontend-call-parsers.js').FrontendCall | null;
}

/**
 * IMP-CORE-002: Base patterns for TypeScript/JavaScript variants
 * Shared pattern definitions for ts, js, tsx, jsx to prevent code duplication
 * and ensure pattern consistency across all JS-family languages.
 */
const BASE_JS_PATTERNS: PatternConfig[] = [
  // Function declarations
  { type: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
  // Arrow functions (const/let/var)
  { type: 'function', pattern: /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g, nameGroup: 1 },
  // Class declarations
  { type: 'class', pattern: /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
  // Constants (ALL_CAPS identifiers) - MUST come before component pattern
  { type: 'constant', pattern: /(?:export\s+)?(?:const|let|var)\s+([A-Z][A-Z0-9_]*)\s*=/g, nameGroup: 1 },
  // React components (function style)
  { type: 'component', pattern: /(?:export\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9_$]*)\s*(?:=|\()/g, nameGroup: 1 },
  // React hooks
  { type: 'hook', pattern: /(?:export\s+)?(?:function|const)\s+(use[A-Z][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
  // Class methods
  { type: 'method', pattern: /(?:public|private|protected|async)?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g, nameGroup: 1 },
  // WO-API-ROUTE-DETECTION-001: Express route patterns
  {
    type: 'function',
    pattern: /(\w+)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g,
    nameGroup: 1,
    extractMetadata: (match, content, line, file, fileContent) => {
      return parseExpressRoute(content, line, fileContent);
    }
  },
  // WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend API call patterns
  // fetch() API calls
  {
    type: 'function',
    pattern: /fetch\s*\(/g,
    nameGroup: 0,
    extractFrontendCall: (match, content, line, file, fileContent) => {
      const calls = parseFetchCalls(fileContent, file);
      return calls.find(c => c.line === line) || null;
    }
  },
  // axios API calls
  {
    type: 'function',
    pattern: /axios\.(get|post|put|delete|patch)\s*\(/g,
    nameGroup: 1,
    extractFrontendCall: (match, content, line, file, fileContent) => {
      const calls = parseAxiosCalls(fileContent, file);
      return calls.find(c => c.line === line) || null;
    }
  },
  // React Query hooks
  {
    type: 'hook',
    pattern: /(useQuery|useMutation)\s*\(/g,
    nameGroup: 1,
    extractFrontendCall: (match, content, line, file, fileContent) => {
      const calls = parseReactQueryCalls(fileContent, file);
      return calls.find(c => c.line === line) || null;
    }
  },
  // Custom API clients (api.*, apiClient.*, client.*, httpClient.*)
  {
    type: 'function',
    pattern: /(api|apiClient|client|httpClient)\.(get|post|put|delete|patch)\s*\(/g,
    nameGroup: 1,
    extractFrontendCall: (match, content, line, file, fileContent) => {
      const calls = parseCustomApiCalls(fileContent, file);
      return calls.find(c => c.line === line) || null;
    }
  }
];

/**
 * Pattern configurations by language
 * IMP-CORE-002: TS/JS/TSX/JSX now reference BASE_JS_PATTERNS to eliminate duplication
 */
export const LANGUAGE_PATTERNS: Record<string, Array<PatternConfig>> = {
  // TypeScript/JavaScript patterns (shared base)
  ts: BASE_JS_PATTERNS,
  js: BASE_JS_PATTERNS,
  tsx: BASE_JS_PATTERNS,
  jsx: BASE_JS_PATTERNS,
  // IMP-CORE-006: Svelte patterns (.svelte files)
  svelte: [
    // Svelte component script exports
    { type: 'component', pattern: /export\s+(?:default\s+)?(?:function|const|let|var)?\s*([A-Z][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
    // Svelte reactive declarations ($:)
    { type: 'function', pattern: /\$:\s*(\w+)\s*=/g, nameGroup: 1 },
    // Svelte lifecycle functions (onMount, beforeUpdate, afterUpdate, onDestroy)
    { type: 'function', pattern: /onMount\s*\(|beforeUpdate\s*\(|afterUpdate\s*\(|onDestroy\s*\(/g, nameGroup: 0 },
    // Svelte reactive statements with function calls
    { type: 'function', pattern: /\$:\s*\{[^}]*\}/g, nameGroup: 0 },
    // Svelte store subscriptions ($store)
    { type: 'function', pattern: /\$([a-zA-Z_][a-zA-Z0-9_$]*)\s*[:=]/g, nameGroup: 1 },
    // Svelte props (export let propName)
    { type: 'function', pattern: /export\s+let\s+([a-zA-Z_][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
    // Svelte action functions (use:action)
    { type: 'function', pattern: /function\s+([a-zA-Z_][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{[^}]*(?:update|destroy)/g, nameGroup: 1 },
    // Svelte transition functions
    { type: 'function', pattern: /(?:transition|in|out):\s*([a-zA-Z_][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
  ],
  // IMP-CORE-006: Vue patterns (.vue files - script section)
  vue: [
    // Vue 3 Composition API - setup function
    { type: 'function', pattern: /setup\s*\([^)]*\)\s*\{/g, nameGroup: 0 },
    // Vue composables (useXxx functions)
    { type: 'hook', pattern: /(?:const|let|var)\s+(use[A-Z][a-zA-Z0-9_$]*)\s*=/g, nameGroup: 1 },
    // Vue ref/reactive declarations
    { type: 'function', pattern: /(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_$]*)\s*=\s*(?:ref|reactive|computed)\s*\(/g, nameGroup: 1 },
    // Vue methods/computed in Options API
    { type: 'method', pattern: /(?:methods|computed):\s*\{[^}]*(?:[a-zA-Z_][a-zA-Z0-9_$]*):/g, nameGroup: 0 },
    // Vue lifecycle hooks (onMounted, onUpdated, etc.)
    { type: 'hook', pattern: /(onMounted|onUpdated|onUnmounted|onBeforeMount|onBeforeUpdate|onErrorCaptured|onRenderTracked|onRenderTriggered)\s*\(/g, nameGroup: 1 },
    // Vue component imports (import Xxx from './Xxx.vue')
    { type: 'component', pattern: /import\s+([A-Z][a-zA-Z0-9_$]*)\s+from\s+['"][^'"]*\.vue['"]/g, nameGroup: 1 },
    // Vue defineProps/defineEmits (Vue 3)
    { type: 'function', pattern: /(defineProps|defineEmits|defineExpose|defineOptions|defineSlots)\s*\(/g, nameGroup: 1 },
    // Vue provide/inject
    { type: 'function', pattern: /(provide|inject)\s*\(/g, nameGroup: 1 },
    // Vue watch/watchEffect
    { type: 'function', pattern: /(watch|watchEffect)\s*\(/g, nameGroup: 1 },
  ],
  // Python patterns (expanded for +30% coverage)
  py: [
    // Regular functions
    { type: 'function', pattern: /def\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    // Async functions
    { type: 'function', pattern: /async\s+def\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    // Classes
    { type: 'class', pattern: /class\s+([a-zA-Z0-9_]+)\s*(?:\(|:)/g, nameGroup: 1 },
    // Instance methods
    { type: 'method', pattern: /\s+def\s+([a-zA-Z0-9_]+)\s*\(self/g, nameGroup: 1 },
    // Class methods
    { type: 'method', pattern: /@classmethod\s+def\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Static methods
    { type: 'method', pattern: /@staticmethod\s+def\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Properties
    { type: 'method', pattern: /@property\s+def\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Decorators (NEW)
    { type: 'function', pattern: /@([a-zA-Z0-9_]+)(?:\(|$)/gm, nameGroup: 1 },
    // Type hints - function signatures (NEW)
    { type: 'function', pattern: /def\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*->\s*[a-zA-Z0-9_\[\]]+:/g, nameGroup: 1 },
    // Async context managers (NEW)
    { type: 'method', pattern: /async\s+def\s+__(aenter|aexit)__/g, nameGroup: 1 },

    // WO-API-ROUTE-DETECTION-001: Flask route patterns
    // Flask: @app.route('/path', methods=['GET']) or @bp.route('/path')
    {
      type: 'function',
      pattern: /@(\w+)\.route\(/g,
      nameGroup: 1,
      extractMetadata: (match, content, line, file) => {
        return parseFlaskRoute(content, line);
      }
    },

    // WO-API-ROUTE-DETECTION-001: FastAPI route patterns
    // FastAPI: @app.get('/path'), @app.post('/path'), etc.
    {
      type: 'function',
      pattern: /@app\.(get|post|put|delete|patch)\(/g,
      nameGroup: 1,
      extractMetadata: (match, content, line, file) => {
        return parseFastAPIRoute(content, line);
      }
    }
  ],
  // Go patterns
  go: [
    // Function declarations: func FunctionName(...) {...}
    { type: 'function', pattern: /func\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    // Method declarations: func (receiver) MethodName(...) {...}
    { type: 'method', pattern: /func\s+\([^)]+\)\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    // Struct declarations: type StructName struct {...}
    { type: 'class', pattern: /type\s+([a-zA-Z0-9_]+)\s+struct\s*{/g, nameGroup: 1 },
    // Interface declarations: type InterfaceName interface {...}
    { type: 'class', pattern: /type\s+([a-zA-Z0-9_]+)\s+interface\s*{/g, nameGroup: 1 },
    // Constants: const ConstName = ...
    { type: 'constant', pattern: /const\s+([A-Z][a-zA-Z0-9_]*)\s*=/g, nameGroup: 1 }
  ],
  // Rust patterns
  rs: [
    // Function declarations: fn function_name(...) {...} or pub fn function_name(...)
    { type: 'function', pattern: /(?:pub\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]*>)?\s*\(/g, nameGroup: 1 },
    // Struct declarations: struct StructName {...} or pub struct StructName
    { type: 'class', pattern: /(?:pub\s+)?struct\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Enum declarations: enum EnumName {...} or pub enum EnumName
    { type: 'class', pattern: /(?:pub\s+)?enum\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Trait declarations: trait TraitName {...} or pub trait TraitName
    { type: 'class', pattern: /(?:pub\s+)?trait\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Impl blocks: impl StructName {...}
    { type: 'method', pattern: /impl\s+(?:[a-zA-Z0-9_]+\s+for\s+)?([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Constants: const CONST_NAME: Type = ...
    { type: 'constant', pattern: /const\s+([A-Z][A-Z0-9_]*)\s*:/g, nameGroup: 1 }
  ],
  // Java patterns
  java: [
    // Class declarations: public class ClassName, class ClassName
    { type: 'class', pattern: /(?:public\s+|private\s+|protected\s+)?class\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Interface declarations
    { type: 'class', pattern: /(?:public\s+)?interface\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Enum declarations
    { type: 'class', pattern: /(?:public\s+)?enum\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    // Method declarations (simplified - catches most methods)
    { type: 'method', pattern: /(?:public|private|protected)\s+(?:static\s+)?(?:\w+)\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    // Constants: public static final TYPE CONSTANT_NAME
    { type: 'constant', pattern: /(?:public\s+)?static\s+final\s+\w+\s+([A-Z][A-Z0-9_]*)\s*=/g, nameGroup: 1 }
  ],
  // C++ patterns
  cpp: [
    // Class declarations: class ClassName
    { type: 'class', pattern: /class\s+([a-zA-Z0-9_]+)\s*(?:[:{]|$)/g, nameGroup: 1 },
    // Struct declarations: struct StructName
    { type: 'class', pattern: /struct\s+([a-zA-Z0-9_]+)\s*(?:[:{]|$)/g, nameGroup: 1 },
    // Function declarations: ReturnType functionName(...)
    { type: 'function', pattern: /(?:^|\s)(?:inline\s+|static\s+|virtual\s+)*\w+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const\s*)?[{;]/g, nameGroup: 1 },
    // Method declarations (within class - simplified)
    { type: 'method', pattern: /^\s+(?:virtual\s+|static\s+|inline\s+)*\w+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)/gm, nameGroup: 1 },
    // Constants: const Type CONSTANT_NAME or #define CONSTANT_NAME
    { type: 'constant', pattern: /#define\s+([A-Z][A-Z0-9_]*)/g, nameGroup: 1 },
    { type: 'constant', pattern: /const\s+\w+\s+([A-Z][A-Z0-9_]*)\s*=/g, nameGroup: 1 }
  ],
  // C patterns (similar to C++)
  c: [
    // Struct declarations
    { type: 'class', pattern: /struct\s+([a-zA-Z0-9_]+)\s*(?:[{]|$)/g, nameGroup: 1 },
    // Function declarations
    { type: 'function', pattern: /(?:^|\s)(?:static\s+|inline\s+)*\w+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*[{;]/g, nameGroup: 1 },
    // Constants: #define CONSTANT_NAME
    { type: 'constant', pattern: /#define\s+([A-Z][A-Z0-9_]*)/g, nameGroup: 1 }
  ]
};

// Default supported languages
// IMP-CORE-006: Added svelte, vue for component framework detection
const DEFAULT_SUPPORTED_LANGS = ['ts', 'js', 'tsx', 'jsx', 'svelte', 'vue', 'py', 'go', 'rs', 'java', 'cpp', 'c'];

/**
 * Default exclusion patterns to prevent scanning:
 * - Dependencies: node_modules
 * - Build outputs: dist, build, .next, .nuxt
 * - Python virtual environments: .venv, venv, env, __pycache__
 * - Version control: .git
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.venv/**',
  '**/venv/**',
  '**/env/**',
  '**/__pycache__/**',
  '**/.git/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/archived/**',
  '**/tmp/**',
  '**/temp/**',
  '**/backup/**'
] as const;

/**
 * PHASE 3: LRU Cache with Memory Cap
 * Global cache for scan results with 50MB memory limit
 * Automatically evicts least recently used entries when full
 */
const SCAN_CACHE = createScannerCache(50 * 1024 * 1024);

/**
 * Scanner class to manage state and context
 */
class Scanner {
  private elements: ElementData[] = [];
  private currentFile: string | null = null;
  private currentLine: number | null = null;
  private currentPattern: RegExp | null = null;

  constructor() {
    // Initialize empty scanner
  }

  public addElement(element: ElementData): void {
    this.elements.push(element);
  }

  private processLine(
    line: string,
    lineNumber: number,
    file: string,
    pattern: RegExp,
    type: ElementData['type'],
    nameGroup: number,
    fileContent: string,
    extractMetadata?: (match: RegExpExecArray, content: string, line: number, file: string, fileContent: string) => RouteMetadata | null,
    extractFrontendCall?: (match: RegExpExecArray, content: string, line: number, file: string, fileContent: string) => import('../analyzer/frontend-call-parsers.js').FrontendCall | null
  ): void {
    this.currentLine = lineNumber;
    this.currentPattern = pattern;

    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const name = match[nameGroup];
      if (name) {
        // Detect if the element is exported
        const exported = /(?:^|\s)export\s+/.test(match[0]) || /(?:^|\s)export\s+default\s+/.test(line);

        // WO-API-ROUTE-DETECTION-001: Extract route metadata if callback provided
        const element: ElementData = {
          type,
          name,
          file,
          line: lineNumber,
          exported
        };

        // Call extractMetadata if provided
        if (extractMetadata) {
          const routeMetadata = extractMetadata(match, line, lineNumber, file, fileContent);
          if (routeMetadata) {
            element.route = routeMetadata;
          }
        }

        // WO-ROUTE-VALIDATION-ENHANCEMENT-001: Extract frontend call metadata if callback provided
        if (extractFrontendCall) {
          const frontendCallMetadata = extractFrontendCall(match, line, lineNumber, file, fileContent);
          if (frontendCallMetadata) {
            element.frontendCall = frontendCallMetadata;
          }
        }

        this.addElement(element);
      }
    }
  }

  /**
   * WO-API-ROUTE-DETECTION-001: Detect Next.js API routes (file-based routing)
   * Checks if file is a Next.js route file and extracts HTTP method exports
   */
  private processNextJsRoute(file: string, content: string): void {
    // Check if file matches Next.js route pattern: app/api/*/route.(ts|js|tsx|jsx)
    if (!file.includes('/app/api/') || !file.match(/\/route\.(ts|js|tsx|jsx)$/)) {
      return;
    }

    // Extract exported HTTP method functions (GET, POST, PUT, DELETE, PATCH)
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const exports: string[] = [];

    for (const method of httpMethods) {
      // Match: export async function GET or export function POST or export const PUT
      const exportPattern = new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${method}\\b`, 'g');
      if (exportPattern.test(content)) {
        exports.push(method);
      }
    }

    // If we found HTTP method exports, parse as Next.js route
    if (exports.length > 0) {
      const routeMetadata = parseNextJsRoute(file, exports);

      if (routeMetadata) {
        // Create element for the route file
        const element: ElementData = {
          type: 'function',
          name: `route`, // Next.js route files are conventionally named 'route'
          file,
          line: 1, // Route definition is file-level
          exported: true,
          route: routeMetadata
        };

        this.addElement(element);
      }
    }
  }

  public processFile(file: string, content: string, patterns: PatternConfig[], includeComments: boolean): void {
    this.currentFile = file;
    const lines = content.split('\n');

    for (const { type, pattern, nameGroup, extractMetadata, extractFrontendCall } of patterns) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // P1.2: Pass line index and all lines for context-aware comment detection
        if (!includeComments && isLineCommented(line, i, lines)) {
          continue;
        }
        // WO-API-ROUTE-DETECTION-001: Pass extractMetadata callback and full file content
        // WO-ROUTE-VALIDATION-ENHANCEMENT-001: Pass extractFrontendCall callback
        this.processLine(line, i + 1, file, pattern, type, nameGroup, content, extractMetadata, extractFrontendCall);
      }
    }

    // IMP-CORE-038: Framework detection via registry pattern
    // Use framework registry for all framework route detection
    const frameworkResults = frameworkRegistry.detectAll(file, content);
    for (const result of frameworkResults) {
      const element: ElementData = {
        type: result.elementType as ElementData['type'],
        name: result.elementName,
        file,
        line: 1,
        exported: true,
        route: result.route
      };
      this.addElement(element);
    }
  }

  /**
   * @deprecated Use frameworkRegistry instead. Kept for backward compatibility.
   */
  private processNextJsPagesRoute(file: string, content: string): void {
    const routeMetadata = parseNextJsPagesRoute(file, content);

    if (routeMetadata) {
      const element: ElementData = {
        type: 'function',
        name: 'handler',
        file,
        line: 1,
        exported: true,
        route: routeMetadata
      };

      this.addElement(element);
    }
  }

  /**
   * IMP-CORE-004: Detect SvelteKit server routes (file-based routing)
   * Checks for +server.ts or +page.server.ts files
   */
  private processSvelteKitRoute(file: string, content: string): void {
    // Extract exports from content
    const exports: string[] = [];
    const exportPatterns = [
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|load|actions)\b/g,
      /export\s+const\s+(GET|POST|PUT|DELETE|PATCH|load|actions)\b/g
    ];

    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }

    const routeMetadata = parseSvelteKitRoute(file, exports);

    if (routeMetadata) {
      const element: ElementData = {
        type: 'function',
        name: routeMetadata.path.includes('/api/') ? 'API' : 'load',
        file,
        line: 1,
        exported: true,
        route: routeMetadata
      };

      this.addElement(element);
    }
  }

  /**
   * IMP-CORE-004: Detect Nuxt server API routes (file-based routing)
   * Checks for server/api/*.ts files with .get.ts, .post.ts suffixes
   */
  private processNuxtRoute(file: string, content: string): void {
    const routeMetadata = parseNuxtRoute(file, content);

    if (routeMetadata) {
      const element: ElementData = {
        type: 'function',
        name: 'handler',
        file,
        line: 1,
        exported: true,
        route: routeMetadata
      };

      this.addElement(element);
    }
  }

  /**
   * IMP-CORE-004: Detect Remix routes (file-based routing)
   * Checks for app/routes/*.tsx files with loader/action exports
   */
  private processRemixRoute(file: string, content: string): void {
    // Extract exports from content
    const exports: string[] = [];
    const exportPatterns = [
      /export\s+(?:async\s+)?function\s+(loader|action)\b/g,
      /export\s+const\s+(loader|action)\b/g
    ];

    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }

    const routeMetadata = parseRemixRoute(file, exports);

    if (routeMetadata) {
      const element: ElementData = {
        type: 'function',
        name: 'route',
        file,
        line: 1,
        exported: true,
        route: routeMetadata
      };

      this.addElement(element);
    }
  }

  public getElements(): ElementData[] {
    return this.elements;
  }
}

// Export the Scanner class
export { Scanner };

/**
 * Type priority for deduplication (higher priority = more specific type)
 * When the same element is detected with multiple types, keep the highest priority
 *
 * PERFORMANCE NOTE: Patterns are automatically sorted by this priority to enable
 * short-circuit matching. Most specific patterns execute first, reducing redundant
 * regex operations by ~15% on average.
 *
 * PHASE 1: AST Integration - Added priorities for interface, type, decorator, property
 */
const TYPE_PRIORITY: Record<ElementData['type'], number> = {
  'decorator': 8,   // Most specific - Decorators (@Component, @Injectable)
  'interface': 7,   // TypeScript interfaces
  'type': 7,        // TypeScript type aliases (same priority as interface)
  'constant': 6,    // ALL_CAPS constants
  'property': 5,    // Class properties (same priority as component)
  'component': 5,   // React components (PascalCase functions)
  'hook': 4,        // React hooks (use* functions)
  'class': 3,       // Class declarations
  'function': 2,    // Generic functions (higher than method to preserve AST accuracy)
  'method': 1,      // Class methods (lower priority - regex pattern is too broad)
  'unknown': 0      // Fallback
};

/**
 * Sorts patterns by TYPE_PRIORITY (highest to lowest) for optimal performance.
 * Most specific patterns execute first, enabling better short-circuit behavior.
 *
 * @param patterns Array of pattern configurations
 * @returns Sorted array with highest priority patterns first
 */
function sortPatternsByPriority(
  patterns: Array<{ type: ElementData['type'], pattern: RegExp, nameGroup: number }>
): Array<{ type: ElementData['type'], pattern: RegExp, nameGroup: number }> {
  return [...patterns].sort((a, b) => {
    const priorityA = TYPE_PRIORITY[a.type] || 0;
    const priorityB = TYPE_PRIORITY[b.type] || 0;
    return priorityB - priorityA; // Descending order (highest priority first)
  });
}

/**
 * Deduplicates elements by keeping only the highest priority type for each unique (name, line, file) tuple
 * @param elements Array of elements to deduplicate
 * @returns Deduplicated array with single entry per unique element
 */
function deduplicateElements(elements: ElementData[]): ElementData[] {
  const elementMap = new Map<string, ElementData>();

  for (const element of elements) {
    // Create unique key from name, line, and file
    const key = `${element.file}:${element.line}:${element.name}`;
    const existing = elementMap.get(key);

    if (!existing) {
      // First time seeing this element
      elementMap.set(key, element);
    } else {
      // Element already exists - keep the one with higher priority
      const existingPriority = TYPE_PRIORITY[existing.type] || 0;
      const newPriority = TYPE_PRIORITY[element.type] || 0;

      if (newPriority > existingPriority) {
        elementMap.set(key, element);
      }
    }
  }

  return Array.from(elementMap.values());
}

/**
 * Checks if a path should be excluded based on glob patterns
 * @param filePath The path to check (normalized with forward slashes)
 * @param excludePatterns Array of glob patterns
 * @returns true if path should be excluded
 */
function shouldExcludePath(filePath: string, excludePatterns: string[]): boolean {
  // Normalize path to forward slashes for consistent matching
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const pattern of excludePatterns) {
    // Match against the full path and also the relative portions
    if (minimatch(normalizedPath, pattern, { dot: true })) {
      return true;
    }

    // Also check if any part of the path matches the pattern
    // This handles cases like '**/node_modules/**' matching any node_modules directory
    const pathParts = normalizedPath.split('/');
    for (let i = 0; i < pathParts.length; i++) {
      const partialPath = pathParts.slice(i).join('/');
      if (minimatch(partialPath, pattern, { dot: true })) {
        return true;
      }
    }
  }

  return false;
}

/**
 * PHASE 2: Parallel Processing
 * Helper function to scan files in parallel using worker threads
 * @param files Array of file paths to scan
 * @param lang Language extension (ts, js, py, etc.)
 * @param options Scan options
 * @returns Array of elements from all workers
 */
async function scanFilesInParallel(
  files: string[],
  lang: string,
  options: ScanOptions
): Promise<ElementData[]> {
  // Determine worker count
  const workerCount = typeof options.parallel === 'object' && options.parallel.workers
    ? options.parallel.workers
    : options.workerPoolSize || Math.max(1, os.cpus().length - 1);

  if (workerCount <= 1 || files.length < workerCount * 2) {
    // Not worth parallelizing for small file counts
    // Fall back to sequential processing
    return [];
  }

  // Split files into chunks for each worker
  const chunks: string[][] = Array.from({ length: workerCount }, () => []);
  files.forEach((file, index) => {
    chunks[index % workerCount].push(file);
  });

  // Create workers and process chunks in parallel
  const workerPromises = chunks
    .filter(chunk => chunk.length > 0)
    .map((chunk, index) => {
      return new Promise<ElementData[]>((resolve, reject) => {
        // Try multiple paths for worker file (compiled vs source)
        let workerPath = path.join(__dirname, 'scanner-worker.js');
        if (!fs.existsSync(workerPath)) {
          // Fallback for test environment (TypeScript source)
          workerPath = path.join(__dirname, 'scanner-worker.ts');
        }
        if (!fs.existsSync(workerPath)) {
          // Reject if worker file not found
          reject(new Error('Worker file not found: ' + workerPath));
          return;
        }

        const worker = new Worker(workerPath, {
          execArgv: process.execArgv
        });

        let hasResult = false;

        worker.on('message', (message: any) => {
          if (message.type === 'result') {
            hasResult = true;
            worker.terminate();
            resolve(message.elements || []);
          } else if (message.type === 'error') {
            hasResult = true;
            worker.terminate();
            reject(new Error(message.error));
          }
        });

        worker.on('error', (error) => {
          if (!hasResult) {
            worker.terminate();
            reject(error);
          }
        });

        worker.on('exit', (code) => {
          if (!hasResult && code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });

        // Send scan task to worker
        worker.postMessage({
          type: 'scan',
          files: chunk,
          lang,
          options
        });
      });
    });

  try {
    // Wait for all workers to complete
    const results = await Promise.all(workerPromises);

    // Flatten and return all elements
    return results.flat();
  } catch (error) {
    // If parallel processing fails, return empty array
    // Caller will fall back to sequential mode
    console.error('Parallel processing failed:', error);
    return [];
  }
}

/**
 * IMP-CORE-076: Collect all files recursively from a directory tree
 * Helper function to gather all eligible files before incremental filtering
 * @param dir Directory to scan
 * @param allLangs Array of language extensions to include
 * @param exclude Array of exclusion patterns
 * @param recursive Whether to recurse into subdirectories
 * @param verbose Enable verbose logging
 * @returns Array of normalized file paths
 */
async function collectFiles(
  dir: string,
  allLangs: string[],
  exclude: string[],
  recursive: boolean,
  verbose: boolean
): Promise<string[]> {
  const files: string[] = [];
  const resolvedDir = path.resolve(dir);

  try {
    const allEntries = fs.readdirSync(resolvedDir, { withFileTypes: true });

    for (const entry of allEntries) {
      const fullPath = path.join(resolvedDir, entry.name);

      if (entry.isDirectory()) {
        // Check if directory should be excluded
        if (shouldExcludePath(fullPath, exclude)) {
          if (verbose) {
            console.log(`Excluding directory: ${fullPath}`);
          }
          continue;
        }

        if (recursive) {
          if (verbose) {
            console.log(`Recursively collecting from directory: ${fullPath}`);
          }
          // Recursively collect files from subdirectory
          const subFiles = await collectFiles(fullPath, allLangs, exclude, recursive, verbose);
          files.push(...subFiles);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).substring(1);

      // Handle special cases for TypeScript/JavaScript
      let currentLang = ext;
      if (ext === 'tsx' && allLangs.includes('ts')) {
        currentLang = 'ts';
      } else if (ext === 'jsx' && allLangs.includes('js')) {
        currentLang = 'js';
      }

      const shouldInclude = allLangs.includes(currentLang);

      if (shouldInclude) {
        // Normalize to forward slashes for consistency
        const normalizedPath = fullPath.replace(/\\/g, '/');

        // Check if file should be excluded
        if (shouldExcludePath(normalizedPath, exclude)) {
          if (verbose) {
            console.log(`Excluding file: ${normalizedPath}`);
          }
          continue;
        }

        files.push(normalizedPath);
        if (verbose) {
          console.log(`Including file: ${normalizedPath} (mapped to language: ${currentLang})`);
        }
      }
    }
  } catch (error) {
    if (verbose) {
      console.error(`Error collecting files from ${dir}:`, error);
    }
  }

  return files;
}

/**
 * Scans the current codebase for code elements (functions, classes, components, hooks)
 * @param dir Directory to scan
 * @param lang File extension to scan (or array of extensions) - defaults to all 10 supported languages
 * @param options Additional scanning options
 * @returns Array of code elements with their type, name, file and line number
 */
export async function scanCurrentElements(
  dir: string,
  lang: string | string[] = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c'],
  options: ScanOptions = {}
): Promise<ElementData[]> {
  const scanner = new Scanner();
  const langs = Array.isArray(lang) ? lang : [lang];
  
  // IMP-CORE-057: Declare at function level for cache update access
  let filesToScan: string[] = [];
  
  // Default options
  const {
    include = undefined,
    exclude: excludeOption = DEFAULT_EXCLUDE_PATTERNS as readonly string[] as string[],
    recursive = true,
    langs: optionLangs = [],
    customPatterns = [],
    includeComments = false,
    verbose = false,
    cache = undefined
  } = options;

  // Normalize exclude to always be an array
  const exclude = Array.isArray(excludeOption) ? excludeOption : [excludeOption];
  
  // Combine langs from args and options
  const allLangs = [...new Set([...langs, ...optionLangs])];
  
  if (verbose) {
    console.log('Scanner config:', {
      dir,
      langs: allLangs,
      include,
      exclude,
      recursive
    });
  }
  
  // Resolve the directory path and keep Windows format for fs operations
  const resolvedDir = path.resolve(dir);
  
  if (verbose) {
    console.log(`Resolved directory: ${resolvedDir}`);
  }
  
  // Validate languages
  for (const currentLang of allLangs) {
    if (!LANGUAGE_PATTERNS[currentLang] && !DEFAULT_SUPPORTED_LANGS.includes(currentLang)) {
      console.warn(`Warning: Language '${currentLang}' is not officially supported. Using generic patterns.`);
      LANGUAGE_PATTERNS[currentLang] = [
        { type: 'function', pattern: /function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        { type: 'class', pattern: /class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 }
      ];
    }
  }
  
  // Add custom patterns
  for (const customPattern of customPatterns) {
    if (!LANGUAGE_PATTERNS[customPattern.lang]) {
      LANGUAGE_PATTERNS[customPattern.lang] = [];
    }
    LANGUAGE_PATTERNS[customPattern.lang].push({
      type: customPattern.type,
      pattern: customPattern.pattern,
      nameGroup: customPattern.nameGroup
    });
  }
  
  try {
    // IMP-CORE-076: Collect all files from the full subtree first
    if (verbose) {
      console.log(`Collecting files from: ${resolvedDir} (recursive=${recursive})`);
    }
    
    const files = await collectFiles(resolvedDir, allLangs, exclude, recursive, verbose);
    
    if (verbose) {
      console.log(`Found ${files.length} files to process:`, files);
    }

    // IMP-CORE-076: Incremental scanning with IncrementalCache - now runs on full recursive file set
    // Check which files need to be re-scanned based on file hashes
    filesToScan = files;
    let filesSkipped = 0;
    
    if (cache && cache.isEnabled()) {
      const cacheCheck = await cache.checkFiles(files);
      filesToScan = cacheCheck.filesToScan;
      filesSkipped = cacheCheck.filesUnchanged.length;
      
      if (verbose) {
        console.log(`[IncrementalCache] ${filesToScan.length} files to scan, ${filesSkipped} files skipped (hit ratio: ${(cacheCheck.hitRatio * 100).toFixed(1)}%)`);
      }
      
      // Remove deleted files from cache
      if (cacheCheck.filesDeleted.length > 0) {
        cache.removeDeletedFiles(cacheCheck.filesDeleted);
        if (verbose) {
          console.log(`[IncrementalCache] Removed ${cacheCheck.filesDeleted.length} deleted files from cache`);
        }
      }
      
      // IMP-CORE-077: Load cached elements for unchanged files from SCAN_CACHE
      for (const unchangedFile of cacheCheck.filesUnchanged) {
        const cached = SCAN_CACHE.get(unchangedFile);
        if (cached) {
          for (const element of cached.elements) {
            scanner.addElement(element);
          }
          if (verbose) {
            console.log(`[IncrementalCache] Loaded ${cached.elements.length} cached elements from SCAN_CACHE for: ${unchangedFile}`);
          }
        }
      }
    }
        // PHASE 2: Parallel Processing - Try parallel mode if enabled
    let parallelSucceeded = false;

    if (options.parallel && allLangs.length === 1) {
      // Only use parallel mode for single-language scans to simplify worker logic
      const currentLang = allLangs[0];

      if (verbose) {
        console.log(`Attempting parallel processing for ${filesToScan.length} ${currentLang} files`);
      }

      try {
        const parallelElements = await scanFilesInParallel(filesToScan, currentLang, options);

        if (parallelElements.length > 0) {
          // Parallel processing succeeded
          if (verbose) {
            console.log(`Parallel processing completed: ${parallelElements.length} elements found`);
          }

          // Add all elements from parallel scan
          for (const element of parallelElements) {
            scanner.addElement(element);
          }

          // IMP-CORE-077: Populate SCAN_CACHE so sequential caching works on next run
          for (const file of filesToScan) {
            const fileElements = parallelElements.filter(e => e.file === file);
            if (fileElements.length > 0) {
              try {
                const stats = fs.statSync(file);
                SCAN_CACHE.set(file, {
                  mtime: stats.mtimeMs,
                  elements: fileElements
                });
              } catch (error) {
                // Ignore stat errors for cache population
              }
            }
          }

          // IMP-CORE-077: Set flag to skip sequential loop, but continue to shared cleanup
          parallelSucceeded = true;
        } else if (verbose) {
          console.log('Parallel processing returned no results, falling back to sequential mode');
        }
      } catch (error) {
        if (verbose) {
          console.log('Parallel processing failed, falling back to sequential mode:', error);
        }
        // Fall through to sequential processing
      }
    }

    // PHASE 5: Initialize progress tracking
    let filesProcessed = 0;
    const totalFiles = filesToScan.length;
    const onProgress = options.onProgress;

    // IMP-CORE-077: Process files (sequential mode or fallback from parallel)
    // Skip sequential processing if parallel mode succeeded
    if (!parallelSucceeded) {
      for (const file of filesToScan) {
        try {
          // Check cache first
          const stats = fs.statSync(file);
          const currentMtime = stats.mtimeMs;
          const cached = SCAN_CACHE.get(file);

          if (cached && cached.mtime === currentMtime) {
            // File hasn't changed, use cached results
            if (verbose) {
              console.log(`Using cached results for: ${file}`);
            }
            for (const element of cached.elements) {
              scanner.addElement(element);
            }

            // PHASE 5: Report progress for cached files
            filesProcessed++;
            if (onProgress) {
              const elementsFound = scanner.getElements().length;
              const percentComplete = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
              onProgress({
                currentFile: file,
                filesProcessed,
                totalFiles,
                elementsFound,
                percentComplete
              });
            }
            continue;
          }

          // File is new or has been modified, scan it
          if (verbose && cached) {
            console.log(`Cache miss (file modified): ${file}`);
          } else if (verbose) {
            console.log(`Cache miss (new file): ${file}`);
          }

          const content = fs.readFileSync(file, 'utf-8');
          let currentLang = path.extname(file).substring(1);

          // Map .tsx to .ts patterns
          if (currentLang === 'tsx') {
            currentLang = 'ts';
          }

          if (verbose) {
            console.log(`Processing file: ${file} with language: ${currentLang}`);
          }

          // Track elements before processing this file
          const elementsBefore = scanner.getElements().length;

          // WO-TREE-SITTER-SCANNER-001: Tree-sitter Integration
          const useTreeSitterMode = options.useTreeSitter;
          const fallbackEnabled = options.fallbackToRegex !== false; // Default true

          if (useTreeSitterMode) {
            try {
              if (verbose) {
                console.log(`Using tree-sitter mode for: ${file}`);
              }

              // Import TreeSitterScanner
              const { TreeSitterScanner } = await import('./tree-sitter-scanner.js');
              const treeSitterScanner = new TreeSitterScanner();

              // Scan file with tree-sitter
              const treeSitterElements = await treeSitterScanner.scanFile(file);

              // Add tree-sitter elements to scanner
              for (const element of treeSitterElements) {
                scanner.addElement(element);
              }

              if (verbose) {
                console.log(`Tree-sitter mode detected ${treeSitterElements.length} elements in: ${file}`);
              }

              // If tree-sitter succeeded and we only want tree-sitter results, skip regex
              if (!fallbackEnabled) {
                // Get elements added for this file
                const allElements = scanner.getElements();
                const fileElements = allElements.slice(elementsBefore);

                // Store in cache
                SCAN_CACHE.set(file, {
                  mtime: currentMtime,
                  elements: fileElements
                });

                if (verbose) {
                  console.log(`Cached ${fileElements.length} tree-sitter elements for: ${file}`);
                }

                // PHASE 5: Report progress
                filesProcessed++;
                if (onProgress) {
                  const elementsFound = scanner.getElements().length;
                  const percentComplete = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
                  onProgress({
                    currentFile: file,
                    filesProcessed,
                    totalFiles,
                    elementsFound,
                    percentComplete
                  });
                }
                continue;
              }
            } catch (treeSitterError) {
              if (verbose) {
                console.warn(`Tree-sitter parsing failed for ${file}, falling back to regex:`, treeSitterError);
              }

              if (!fallbackEnabled) {
                // Tree-sitter failed and no fallback - skip file
                if (verbose) {
                  console.error(`Skipping file ${file} - tree-sitter failed and fallback disabled`);
                }

                // PHASE 5: Report progress even on error
                filesProcessed++;
                if (onProgress) {
                  const elementsFound = scanner.getElements().length;
                  const percentComplete = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
                  onProgress({
                    currentFile: file,
                    filesProcessed,
                    totalFiles,
                    elementsFound,
                    percentComplete
                  });
                }
                continue;
              }
              // Otherwise continue to AST or regex processing below
            }
          }

          // PHASE 1: AST Integration - Use AST mode for TypeScript/JavaScript if enabled
          const useASTMode = options.useAST && (currentLang === 'ts' || currentLang === 'js');

          if (useASTMode) {
            try {
              if (verbose) {
                console.log(`Using AST mode for: ${file}`);
              }

              // FIX-AST: Use TypeScript parser for .ts/.tsx files, Acorn for .js files
              let astElements: any[];

              if (currentLang === 'ts') {
                // Use ASTElementScanner (TypeScript compiler API) for TypeScript files
                const { ASTElementScanner } = await import('../analyzer/ast-element-scanner.js');
                const astScanner = new ASTElementScanner(dir);
                astElements = astScanner.scanFile(file);
              } else {
                // Use JSCallDetector (Acorn parser) for JavaScript files
                const { JSCallDetector } = await import('../analyzer/js-call-detector.js');
                const detector = new JSCallDetector();
                astElements = detector.detectElements(file);
              }

              // Import JSCallDetector for imports/calls detection (works for both TS and JS)
              const { JSCallDetector } = await import('../analyzer/js-call-detector.js');
              const detector = new JSCallDetector();

              // PHASE 4: Extract imports and calls from file
              const fileImports = detector.detectImports(file);
              const fileCalls = detector.detectCalls(file);

              // Add AST-detected elements to scanner with imports and calls
              for (const element of astElements) {
                // Find calls made by this element
                const elementCalls = fileCalls
                  .filter(call => call.callerFunction === element.name || call.callerClass === element.name)
                  .map(call => call.calleeFunction);

                scanner.addElement({
                  type: element.type as ElementData['type'],
                  name: element.name,
                  file: element.file,
                  line: element.line,
                  exported: element.exported,
                  // PHASE 4: Add imports to element
                  imports: fileImports.length > 0 ? fileImports.map(imp => ({
                    source: imp.source,
                    specifiers: imp.specifiers.filter(s => s !== 'default'),
                    default: imp.isDefault ? imp.specifiers[0] : undefined,
                    dynamic: imp.dynamic || false, // PHASE 5: Use dynamic flag from ModuleImport
                    line: imp.line
                  })) : undefined,
                  // PHASE 4: Add calls made by this element
                  calls: elementCalls.length > 0 ? elementCalls : undefined
                });
              }

              if (verbose) {
                console.log(`AST mode detected ${astElements.length} elements, ${fileImports.length} imports, and ${fileCalls.length} calls in: ${file}`);
              }

              // If AST succeeded and we only want AST results, skip regex
              if (!fallbackEnabled) {
                // Get elements added for this file
                const allElements = scanner.getElements();
                const fileElements = allElements.slice(elementsBefore);

                // Store in cache
                SCAN_CACHE.set(file, {
                  mtime: currentMtime,
                  elements: fileElements
                });

                if (verbose) {
                  console.log(`Cached ${fileElements.length} AST elements for: ${file}`);
                }
                continue;
              }
            } catch (astError) {
              if (verbose) {
                console.warn(`AST parsing failed for ${file}, falling back to regex:`, astError);
              }

              if (!fallbackEnabled) {
                // AST failed and no fallback - skip file
                if (verbose) {
                  console.error(`Skipping file ${file} - AST failed and fallback disabled`);
                }
                continue;
              }
              // Otherwise continue to regex processing below
            }
          }

          // Regex-based processing (always runs if AST disabled, or as fallback)
          const patterns = sortPatternsByPriority(LANGUAGE_PATTERNS[currentLang] || []);

          if (patterns.length === 0) {
            if (verbose) {
              console.log(`No patterns found for language: ${currentLang}`);
            }
            continue;
          }

          if (!includeComments && isEntirelyCommented(content)) {
            if (verbose) {
              console.log(`Skipping entirely commented file: ${file}`);
            }
            continue;
          }

          scanner.processFile(file, content, patterns, includeComments);

          // Get elements added for this file
          const allElements = scanner.getElements();
          const fileElements = allElements.slice(elementsBefore);

          // Store in cache
          SCAN_CACHE.set(file, {
            mtime: currentMtime,
            elements: fileElements
          });

          if (verbose) {
            console.log(`Cached ${fileElements.length} elements for: ${file}`);
          }

          // PHASE 5: Report progress after successful file processing
          filesProcessed++;
          if (onProgress) {
            const elementsFound = scanner.getElements().length;
            const percentComplete = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
            onProgress({
              currentFile: file,
              filesProcessed,
              totalFiles,
              elementsFound,
              percentComplete
            });
          }
        } catch (error) {
          if (verbose) {
            console.error(`Error processing file ${file}:`, error);
          }
          // PHASE 5: Report progress even on error
          filesProcessed++;
          if (onProgress) {
            const elementsFound = scanner.getElements().length;
            const percentComplete = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
            onProgress({
              currentFile: file,
              filesProcessed,
              totalFiles,
              elementsFound,
              percentComplete
            });
          }
        }
      }
    } // IMP-CORE-077: Close if (!parallelSucceeded) block

    // IMP-CORE-057: Update IncrementalCache after scanning
    if (cache && cache.isEnabled()) {
      try {
        await cache.updateCache(filesToScan);
        await cache.save();
        if (verbose) {
          console.log(`[IncrementalCache] Updated cache with ${filesToScan.length} scanned files`);
        }
      } catch (error) {
        console.error(`Error updating cache:`, error);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }

  // Deduplicate elements before returning
  const elements = scanner.getElements();
  const deduplicated = deduplicateElements(elements);

  if (verbose) {
    console.log(`Deduplication: ${elements.length} elements → ${deduplicated.length} unique elements`);
  }

  return deduplicated;
}

/**
 * Clears the scan cache
 * Useful for testing or when you want to force a full rescan
 */
export function clearScanCache(): void {
  SCAN_CACHE.clear();
}

/**
 * Gets cache statistics
 * PHASE 3: Enhanced with LRU cache metrics
 * @returns Object with cache size, entries, and memory utilization
 */
export function getScanCacheStats(): {
  size: number;
  entries: number;
  currentSize: number;
  maxSize: number;
  utilizationPercent: number;
} {
  const stats = SCAN_CACHE.getStats();
  return {
    size: stats.entries, // Legacy field for backward compatibility
    entries: stats.entries,
    currentSize: stats.currentSize,
    maxSize: stats.maxSize,
    utilizationPercent: stats.utilizationPercent
  };
}

/**
 * Context-aware comment detection
 * P1.2: Improved to handle JSDoc, template strings, and regex literals
 *
 * @param line - The line to check
 * @param lineIndex - The line number (0-indexed)
 * @param allLines - All lines in the file (for multi-line comment detection)
 * @returns true if the line is a comment and should be skipped
 */
export function isLineCommented(line: string, lineIndex?: number, allLines?: string[]): boolean {
  // Remove leading whitespace
  const trimmed = line.trim();

  // Empty lines are not comments
  if (trimmed.length === 0) {
    return false;
  }

  // Check if we're inside a template string first (before checking comment syntax)
  if (lineIndex !== undefined && allLines !== undefined) {
    if (isInsideTemplateString(lineIndex, allLines)) {
      return false; // Inside template string - not a comment
    }
  }

  // Single-line comments
  if (trimmed.startsWith('//')) {
    return true;
  }

  // JSDoc and multi-line comments
  if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) {
    // If we have context, check if we're inside a multi-line comment block
    if (lineIndex !== undefined && allLines !== undefined) {
      return isInsideMultiLineComment(lineIndex, allLines);
    }
    // Without context, assume it's a comment
    return true;
  }

  // Check for code that looks like it might be in a template string or regex
  // Template strings: `...${code}...`
  // Regex literals: /pattern/flags
  // These should NOT be filtered even if they contain comment-like syntax
  if (containsCodeContext(trimmed)) {
    return false;
  }

  return false;
}

/**
 * Checks if a line is inside a multi-line comment block
 * Handles multi-line and JSDoc comment blocks
 */
function isInsideMultiLineComment(lineIndex: number, allLines: string[]): boolean {
  let inComment = false;

  for (let i = 0; i <= lineIndex; i++) {
    const line = allLines[i];

    // Check for comment start
    if (line.includes('/*')) {
      inComment = true;
    }

    // Check for comment end on the same line or after
    if (inComment && line.includes('*/')) {
      // If comment starts and ends on same line, check if current line is after the end
      const startIdx = line.indexOf('/*');
      const endIdx = line.indexOf('*/');

      if (i === lineIndex) {
        // Current line - check if we're between /* and */
        const trimmed = line.trim();
        if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) {
          return true;
        }
      }

      // Comment ends on this line
      if (i < lineIndex || (i === lineIndex && endIdx < startIdx)) {
        inComment = false;
      }
    }
  }

  return inComment;
}

/**
 * Checks if a line is inside a multi-line template string
 * Handles template strings that span multiple lines: `...${code}...`
 */
function isInsideTemplateString(lineIndex: number, allLines: string[]): boolean {
  let inTemplate = false;
  let templateChar = '';

  for (let i = 0; i <= lineIndex; i++) {
    const line = allLines[i];

    // Count backticks (template strings)
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : '';

      // Check for unescaped backtick
      if (char === '`' && prevChar !== '\\') {
        if (!inTemplate) {
          inTemplate = true;
          templateChar = '`';
        } else if (templateChar === '`') {
          inTemplate = false;
          templateChar = '';
        }
      }
    }
  }

  return inTemplate;
}

/**
 * Checks if the line contains code context (template strings, regex literals)
 * These should NOT be filtered as comments even if they contain //, /*, etc.
 */
function containsCodeContext(trimmed: string): boolean {
  // Template string detection: contains backticks or ${
  if (trimmed.includes('`') || trimmed.includes('${')) {
    return true;
  }

  // Regex literal detection: /pattern/flags format
  // Must have balanced slashes and be a valid regex context
  const regexPattern = /\/[^\/\n]+\/[gimsuvy]*/;
  if (regexPattern.test(trimmed)) {
    // Make sure it's not a division operator (e.g., "a / b")
    // Regex literals typically appear after =, (, [, {, :, or at start of expression
    const beforeSlash = trimmed.substring(0, trimmed.indexOf('/'));
    if (beforeSlash.trim().length === 0 ||
        /[=(\[{:,]$/.test(beforeSlash.trim()) ||
        /^(const|let|var|return|if|while)\s/.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a file appears to be entirely comments or typings
 */
function isEntirelyCommented(content: string): boolean {
  // Check for .d.ts-like files
  if (content.includes('declare module') || content.includes('declare namespace')) {
    return true;
  }
  
  const nonEmptyLines = content.split('\n').filter(line => line.trim().length > 0);
  const commentedLines = nonEmptyLines.filter(isLineCommented);
  
  // Consider a file all comments if >90% of non-empty lines are comments
  return commentedLines.length > nonEmptyLines.length * 0.9;
}

/**
 * Registry to register custom element pattern recognizers
 */
export const ScannerRegistry = {
  /**
   * Register a custom pattern for recognizing elements
   */
  registerPattern(
    lang: string, 
    type: ElementData['type'], 
    pattern: RegExp, 
    nameGroup: number = 1
  ): void {
    if (!LANGUAGE_PATTERNS[lang]) {
      LANGUAGE_PATTERNS[lang] = [];
    }
    
    LANGUAGE_PATTERNS[lang].push({
      type,
      pattern,
      nameGroup
    });
  },
  
  /**
   * Get all registered patterns for a language
   */
  getPatterns(lang: string): PatternConfig[] {
    return LANGUAGE_PATTERNS[lang] || [];
  },
  
  /**
   * Check if a language is supported
   */
  isLanguageSupported(lang: string): boolean {
    return Boolean(LANGUAGE_PATTERNS[lang]) || DEFAULT_SUPPORTED_LANGS.includes(lang);
  },
  
  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return [...Object.keys(LANGUAGE_PATTERNS), ...DEFAULT_SUPPORTED_LANGS];
  }
};