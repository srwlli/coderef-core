/**
 * Scanner Worker - Phase 2: Parallel Processing
 *
 * Worker thread for parallel file processing
 * Processes files independently using existing scan logic
 * Communicates with main thread via messages
 */

import { parentPort, workerData } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import { Scanner } from './scanner.js';
import { LANGUAGE_PATTERNS } from './scanner.js';
import { ElementData, ScanOptions } from '../types/types.js';

/**
 * Message protocol for worker communication
 */
interface WorkerMessage {
  type: 'scan' | 'result' | 'error';
  files?: string[];
  lang?: string;
  options?: ScanOptions;
  elements?: ElementData[];
  error?: string;
  stats?: {
    filesProcessed: number;
    elementsFound: number;
    errors: number;
  };
}

/**
 * Main worker logic
 */
if (parentPort) {
  parentPort.on('message', async (message: WorkerMessage) => {
    if (message.type === 'scan') {
      try {
        const { files, lang, options } = message;

        if (!files || !lang) {
          throw new Error('Missing required fields: files and lang');
        }

        const scanner = new Scanner();
        const patterns = LANGUAGE_PATTERNS[lang] || [];
        let filesProcessed = 0;
        let errors = 0;

        // Process each file
        for (const file of files) {
          try {
            const content = fs.readFileSync(file, 'utf-8');
            const includeComments = options?.includeComments || false;

            // IMP-CORE-052: tree-sitter is the default path (useTreeSitter !== false)
            const useTreeSitterMode = options?.useTreeSitter !== false;
            if (useTreeSitterMode && (lang === 'ts' || lang === 'js' || lang === 'go' || lang === 'rs' || lang === 'java' || lang === 'cpp' || lang === 'c' || lang === 'py')) {
              try {
                const { TreeSitterScanner } = await import('./tree-sitter-scanner.js');
                const treeSitterScanner = new TreeSitterScanner();
                const treeSitterElements = await treeSitterScanner.scanFile(file);
                const elementsBefore = scanner.getElements().length;
                for (const element of treeSitterElements) {
                  scanner.addElement(element);
                }
                // Wire JSCallDetector for TS/JS call graph data (IMP-CORE-052)
                if (lang === 'ts' || lang === 'js') {
                  try {
                    const { JSCallDetector } = await import('../analyzer/js-call-detector.js');
                    const detector = new JSCallDetector();
                    const fileImports = detector.detectImports(file);
                    const fileCalls = detector.detectCalls(file);
                    const allElements = scanner.getElements();
                    const fileElements = allElements.slice(elementsBefore);
                    for (const element of fileElements) {
                      const elementCalls = fileCalls
                        .filter(call => call.callerFunction === element.name || call.callerClass === element.name)
                        .map(call => call.calleeFunction);
                      if (fileImports.length > 0) {
                        element.imports = fileImports.map(imp => ({
                          source: imp.source,
                          specifiers: imp.specifiers.filter(s => s !== 'default'),
                          default: imp.isDefault ? imp.specifiers[0] : undefined,
                          dynamic: imp.dynamic || false,
                          line: imp.line
                        }));
                      }
                      if (elementCalls.length > 0) {
                        element.calls = elementCalls;
                      }
                    }
                  } catch {
                    // Non-fatal: structural elements already added; call data is best-effort
                  }
                }
                if (options?.fallbackToRegex === false) {
                  filesProcessed++;
                  continue;
                }
              } catch {
                if (options?.fallbackToRegex === false) {
                  errors++;
                  continue;
                }
                // Fall through to regex
              }
            } else if (options?.useAST && (lang === 'ts' || lang === 'js')) {
              // IMP-CORE-078: useAST path now matches main thread — ASTElementScanner + JSCallDetector
              try {
                let astElements: any[];
                if (lang === 'ts') {
                  const { ASTElementScanner } = await import('../analyzer/ast-element-scanner.js');
                  const astScanner = new ASTElementScanner('.');
                  astElements = astScanner.scanFile(file);
                } else {
                  const { JSCallDetector } = await import('../analyzer/js-call-detector.js');
                  const detector = new JSCallDetector();
                  astElements = detector.detectElements(file);
                }
                const { JSCallDetector } = await import('../analyzer/js-call-detector.js');
                const detector = new JSCallDetector();
                const fileImports = detector.detectImports(file);
                const fileCalls = detector.detectCalls(file);
                for (const element of astElements) {
                  const elementCalls = fileCalls
                    .filter(call => call.callerFunction === element.name || call.callerClass === element.name)
                    .map(call => call.calleeFunction);
                  scanner.addElement({
                    type: element.type as ElementData['type'],
                    name: element.name,
                    file: element.file,
                    line: element.line,
                    exported: element.exported,
                    imports: fileImports.length > 0 ? fileImports.map(imp => ({
                      source: imp.source,
                      specifiers: imp.specifiers.filter(s => s !== 'default'),
                      default: imp.isDefault ? imp.specifiers[0] : undefined,
                      dynamic: imp.dynamic || false,
                      line: imp.line
                    })) : undefined,
                    calls: elementCalls.length > 0 ? elementCalls : undefined
                  });
                }
                if (options.fallbackToRegex === false) {
                  filesProcessed++;
                  continue;
                }
              } catch {
                if (options?.fallbackToRegex === false) {
                  errors++;
                  continue;
                }
              }
            }

            // Regex-based processing
            scanner.processFile(file, content, patterns, includeComments);
            filesProcessed++;
          } catch (fileError) {
            errors++;
            // Continue processing other files
          }
        }

        const elements = scanner.getElements();

        // Send results back to main thread
        const result: WorkerMessage = {
          type: 'result',
          elements,
          stats: {
            filesProcessed,
            elementsFound: elements.length,
            errors
          }
        };

        parentPort!.postMessage(result);
      } catch (error) {
        // Send error back to main thread
        const errorMessage: WorkerMessage = {
          type: 'error',
          error: error instanceof Error ? error.message : String(error)
        };

        parentPort!.postMessage(errorMessage);
      }
    }
  });

  // Signal worker is ready
  parentPort.postMessage({ type: 'ready' });
}

export {};
