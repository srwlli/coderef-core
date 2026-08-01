/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability pipeline-scan-front-phases
 * @exports ProcessFileResult, resetRegistryPhase, discoverFilesPhase, cacheFilterPhases, preloadGrammarsPhase, scanFilesPhase, persistFactSetPhase
 * @used_by src/pipeline/orchestrator.ts
 */

/**
 * The scan front of the full pipeline, as phases
 * (WO-DECOUPLE-PIPELINEORCHESTRATOR-VIA-PHASE-MIDDLEWARE-REFACTOR-ORCHESTRATOR-TS-001
 * Phase 2): registry reset -> file discovery -> incremental-cache filter ->
 * grammar preload -> per-file scan loop -> cache/fact-set persistence.
 *
 * Same accumulation logic run() carried inline — the loop body, error
 * handling, verbose logging cadence and the IMP-CORE-028 cache semantics move
 * VERBATIM. File IO stays where it was; the phases only own sequencing.
 */

import logger from '../../utils/logger.js';
import { globalRegistry } from '../../registry/entity-registry.js';
import type { IncrementalCache } from '../../cache/incremental-cache.js';
import type { GrammarRegistry } from '../grammar-registry.js';
import type {
  PipelineOptions,
  ImportRelationship,
  CallRelationship,
  HeritageRelationship,
  RawImportFact,
  RawCallFact,
  RawExportFact,
  HeaderFact,
  HeaderImportFact,
} from '../types.js';
import type { RouteFact, FrontendCallFact } from '../extractors/route-extractor.js';
import { buildFactSet, writeFactSet } from '../symbol-table-cache.js';
import type { HeaderStatus } from '../element-taxonomy.js';
import type { ElementData } from '../../types/types.js';
import type { PipelinePhase } from './types.js';

/** Return shape of the orchestrator's per-file processFile pass. */
export interface ProcessFileResult {
  elements: ElementData[];
  imports: ImportRelationship[];
  calls: CallRelationship[];
  heritage: HeritageRelationship[];
  rawImports: RawImportFact[];
  rawCalls: RawCallFact[];
  rawExports: RawExportFact[];
  headerFact: HeaderFact;
  headerStatus: HeaderStatus;
  headerImportFacts: HeaderImportFact[];
  routes: RouteFact[];
  frontendCalls: FrontendCallFact[];
  content: string;
}

/** Reset the global entity registry for this run (WO-CODEREF-CORE-REGISTRY-001). */
export function resetRegistryPhase(): PipelinePhase {
  return {
    name: 'reset-registry',
    run() {
      globalRegistry.clear();
    },
  };
}

/** Step 1: discover source files per language filter. */
export function discoverFilesPhase(
  discover: (projectPath: string, languages: string[], options: PipelineOptions) => Promise<Map<string, string[]>>,
  languages: string[],
): PipelinePhase {
  return {
    name: 'discover-files',
    async run(ctx) {
      if (ctx.verbose) logger.info('[PipelineOrchestrator] Discovering files...');
      ctx.files = await discover(ctx.projectPath, languages, ctx.options);
      ctx.totalFiles = Array.from(ctx.files.values()).reduce((sum, arr) => sum + arr.length, 0);
      if (ctx.verbose) {
        logger.info(`[PipelineOrchestrator] Found ${ctx.totalFiles} files across ${ctx.files.size} languages`);
      }
    },
  };
}

/**
 * Step 1b + Step 5 (IMP-CORE-028): the incremental mtime-cache filter and its
 * post-scan persistence, created as a PAIR sharing the cache instance and the
 * hit stats. `stats` is read by run() for state.metadata.incremental.
 */
export function cacheFilterPhases(cache: IncrementalCache, incrementalEnabled: boolean): {
  filter: PipelinePhase;
  persist: PipelinePhase;
  stats: { filesUnchanged: string[]; hitRatio: number };
} {
  const stats = { filesUnchanged: [] as string[], hitRatio: 0 };
  return {
    stats,
    filter: {
      name: 'cache-filter',
      async run(ctx) {
        if (!incrementalEnabled) return;
        await cache.load();

        const allFilePaths: string[] = [];
        for (const filePaths of ctx.files.values()) {
          allFilePaths.push(...filePaths);
        }

        const cacheCheck = await cache.checkFiles(allFilePaths);
        stats.filesUnchanged = cacheCheck.filesUnchanged;
        stats.hitRatio = cacheCheck.hitRatio;

        const filesToScanSet = new Set(cacheCheck.filesToScan);
        for (const [lang, filePaths] of ctx.files.entries()) {
          const filtered = filePaths.filter(fp => filesToScanSet.has(fp));
          ctx.files.set(lang, filtered);
        }

        cache.removeDeletedFiles(cacheCheck.filesDeleted);

        if (ctx.verbose) {
          logger.info(`[PipelineOrchestrator] Incremental mode: ${cacheCheck.filesToScan.length} to scan, ${cacheCheck.filesUnchanged.length} cached`);
        }
      },
    },
    persist: {
      name: 'persist-cache',
      async run(ctx) {
        if (!incrementalEnabled) return;
        const scannedFiles: string[] = [];
        for (const filePaths of ctx.files.values()) {
          scannedFiles.push(...filePaths);
        }
        await cache.updateCache(scannedFiles);
        await cache.save();
      },
    },
  };
}

/** Step 2: preload tree-sitter grammars for the detected languages. */
export function preloadGrammarsPhase(registry: GrammarRegistry): PipelinePhase {
  return {
    name: 'preload-grammars',
    async run(ctx) {
      const detectedLanguages = Array.from(ctx.files.keys());
      await registry.preloadGrammars(detectedLanguages);
    },
  };
}

/**
 * Step 3: the single-pass per-file scan loop — accumulate the fact arrays,
 * register elements, capture per-file bundles + file order (P5, ADJ-03).
 * Error handling is per-file: a failed file logs and the loop continues.
 */
export function scanFilesPhase(
  processFile: (filePath: string, language: string, verbose: boolean) => Promise<ProcessFileResult>,
): PipelinePhase {
  return {
    name: 'scan-files',
    async run(ctx) {
      if (ctx.verbose) logger.info('[PipelineOrchestrator] Processing files...');
      for (const [language, filePaths] of ctx.files.entries()) {
        for (const filePath of filePaths) {
          try {
            const result = await processFile(filePath, language, ctx.verbose);

            // Register all elements with the global registry (WO-CODEREF-CORE-REGISTRY-001)
            for (const elem of result.elements) {
              globalRegistry.register(elem);
            }

            ctx.elements.push(...result.elements);
            ctx.imports.push(...result.imports);
            ctx.calls.push(...result.calls);
            ctx.heritage.push(...result.heritage);
            ctx.rawImports.push(...result.rawImports);
            ctx.rawCalls.push(...result.rawCalls);
            ctx.rawExports.push(...result.rawExports);
            ctx.headerFacts.set(filePath, result.headerFact);
            ctx.headerImportFacts.push(...result.headerImportFacts);
            if (result.headerFact.parseErrors) {
              ctx.headerParseErrors.push(...result.headerFact.parseErrors);
            }
            ctx.routes.push(...result.routes);
            ctx.frontendCalls.push(...result.frontendCalls);
            ctx.sources.set(filePath, result.content);
            ctx.fileOrder.push(filePath);
            ctx.factBundles.set(filePath, {
              language,
              elements: result.elements,
              imports: result.imports,
              calls: result.calls,
              heritage: result.heritage,
              rawImports: result.rawImports,
              rawCalls: result.rawCalls,
              rawExports: result.rawExports,
              headerFact: result.headerFact,
              headerImportFacts: result.headerImportFacts,
              routes: result.routes,
              frontendCalls: result.frontendCalls,
              content: result.content,
            });
            ctx.filesScanned++;

            if (ctx.verbose && ctx.filesScanned % 10 === 0) {
              logger.info(`[PipelineOrchestrator] Processed ${ctx.filesScanned}/${ctx.totalFiles} files`);
            }
          } catch (error) {
            logger.error(`[PipelineOrchestrator] Error processing ${filePath}:`, error);
            // Continue processing other files
          }
        }
      }
    },
  };
}

/**
 * Step 5.5 (P5, ADJ-03): persist the full-project fact set after a FULL,
 * NON-incremental build — the input a later graph-safe incremental pass
 * merges into. Guarded on !incremental so the persisted set always reflects
 * a COMPLETE universe. Best-effort: a write failure must not fail the build.
 */
export function persistFactSetPhase(incrementalEnabled: boolean): PipelinePhase {
  return {
    name: 'persist-fact-set',
    run(ctx) {
      if (incrementalEnabled || !ctx.options.outputDir) return;
      try {
        const factSet = buildFactSet(ctx.projectPath, ctx.fileOrder, ctx.factBundles);
        writeFactSet(ctx.projectPath, factSet);
        if (ctx.verbose) logger.info(`[PipelineOrchestrator] Persisted incremental fact set (${ctx.fileOrder.length} files).`);
      } catch (e) {
        logger.warn(`[PipelineOrchestrator] Failed to persist incremental fact set: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}
