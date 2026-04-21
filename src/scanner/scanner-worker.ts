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

            // Check if we should use AST mode
            if (options?.useAST && (lang === 'ts' || lang === 'js')) {
              try {
                // Dynamic import to avoid circular dependencies
                const { JSCallDetector } = await import('../analyzer/js-call-detector.js');
                const detector = new JSCallDetector();
                const astElements = detector.detectElements(file);

                // Add AST-detected elements
                for (const element of astElements) {
                  scanner.addElement({
                    type: element.type as ElementData['type'],
                    name: element.name,
                    file: element.file,
                    line: element.line,
                    exported: element.exported
                  });
                }

                // Skip regex if fallback disabled
                if (options.fallbackToRegex === false) {
                  filesProcessed++;
                  continue;
                }
              } catch (astError) {
                // AST failed, continue to regex if fallback enabled
                if (options.fallbackToRegex === false) {
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
