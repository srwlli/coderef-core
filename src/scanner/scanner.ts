// coderef-core/scanner.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { Worker } from 'worker_threads';
import { ElementData, ScanOptions, RouteMetadata } from '../types/types.js';
import { createScannerCache, type ScanCacheEntry } from './lru-cache.js';
import { IncrementalCache } from '../cache/incremental-cache.js';
import {
  extractRouteMetadata,
  parseNextJsRoute,
  parseNextJsPagesRoute,
  parseSvelteKitRoute,
  parseNuxtRoute,
  parseRemixRoute,
} from '../analyzer/route-parsers.js';
import { frameworkRegistry, type FrameworkDetectionResult } from './framework-registry.js';
import './register-frameworks.js'; // Auto-register default frameworks
import {
  PatternConfig,
  LANGUAGE_PATTERNS,
  DEFAULT_SUPPORTED_LANGS,
  DEFAULT_EXCLUDE_PATTERNS,
  TYPE_PRIORITY,
  sortPatternsByPriority,
} from './scanner-patterns.js';
import { deduplicateElements } from './scanner-dedupe.js';
import {
  isLineCommented,
  isEntirelyCommented,
} from './scanner-comments.js';
import {
  shouldExcludePath,
  collectFiles,
} from './scanner-file-discovery.js';

// Keep isLineCommented exported on scanner.ts for callers that imported it
// from here historically.
export { isLineCommented };

// Re-export patterns module so existing callers (e.g. scanner-worker,
// __tests__/venv-exclusion, dashboard packages) keep working through scanner.ts.
export {
  PatternConfig,
  LANGUAGE_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
};


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