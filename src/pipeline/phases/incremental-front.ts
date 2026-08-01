/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability pipeline-incremental-front-phases
 * @exports makeStoreKeyFor, incrementalFrontPhases
 * @used_by src/pipeline/orchestrator.ts
 */

/**
 * The incremental (graph-safe delta) front of the pipeline, as phases
 * (WO-DECOUPLE-PIPELINEORCHESTRATOR-VIA-PHASE-MIDDLEWARE-REFACTOR-ORCHESTRATOR-TS-001
 * Phase 3): rescan changed files -> merge into the persisted fact store ->
 * assemble the full universe -> (shared resolve tail) -> re-persist the
 * merged store.
 *
 * The P4 path-keying seam (STUB-QPAAY0) — canonicalFactKey translation to the
 * store's own key form — relocates here VERBATIM as one unit
 * (makeStoreKeyFor). The fact-set read + full-build fallback stays in
 * runIncremental(): it is route selection, not a phase.
 */

import * as path from 'path';
import logger from '../../utils/logger.js';
import { globalRegistry } from '../../registry/entity-registry.js';
import { canonicalFactKey, mergeChangedFacts, writeFactSet, type FileFactBundle, type IncrementalFactSet } from '../symbol-table-cache.js';
import type { PipelinePhase } from './types.js';
import type { ProcessFileResult } from './scan-front.js';

/**
 * P4 keying seam (STUB-QPAAY0): the store's byFile keys carry whatever path
 * form the ORIGINATING full build's projectPath produced (relative for a
 * '.'-invoked populate, absolute for an absolute one), while callers pass
 * absolutized paths. Translate every incoming path to the store's own key
 * form so the merge REPLACES bundles instead of adding the same file under a
 * second key (duplicate elements -> node_id_uniqueness -> fail-closed exit 1).
 * Rescans are labeled with the exact form the originating build used, so
 * rescanned fact internals match the cached universe byte-for-byte
 * (full-rebuild parity).
 */
export function makeStoreKeyFor(projectPath: string, store: IncrementalFactSet): (p: string) => string {
  const keyByCanonical = new Map<string, string>();
  for (const key of Object.keys(store.byFile)) {
    keyByCanonical.set(canonicalFactKey(projectPath, key), key);
  }
  const sampleKey = store.order[0] ?? Object.keys(store.byFile)[0];
  const storeIsAbsolute = sampleKey !== undefined && path.isAbsolute(sampleKey);
  return (p: string): string => {
    const canonical = canonicalFactKey(projectPath, p);
    const existing = keyByCanonical.get(canonical);
    if (existing !== undefined) return existing;
    if (canonical.startsWith('..')) {
      // Outside the project root — keep the absolute form; folding it into
      // a project-relative key would fabricate an in-project identity.
      return path.isAbsolute(p) ? path.normalize(p) : path.resolve(path.resolve(projectPath), p);
    }
    const platformRel = canonical.split('/').join(path.sep);
    return storeIsAbsolute
      ? path.join(path.resolve(projectPath), platformRel)
      : path.join(projectPath, platformRel);
  };
}

export interface IncrementalFrontDeps {
  store: IncrementalFactSet;
  storeKeyFor: (p: string) => string;
  changedFiles: string[];
  deletedFiles: string[];
  languageOf: (filePath: string) => string | null;
  preloadGrammars: (languages: string[]) => Promise<void>;
  processFile: (filePath: string, language: string, verbose: boolean) => Promise<ProcessFileResult>;
}

/**
 * The three incremental-front phases plus the trailing store re-persist,
 * sharing closure state (rescanned bundles, merged set). Compose as:
 * [reset-registry, rescanChanged, mergeFacts, assembleFacts, ...tail,
 * persistMerged].
 */
export function incrementalFrontPhases(deps: IncrementalFrontDeps): {
  rescanChanged: PipelinePhase;
  mergeFacts: PipelinePhase;
  assembleFacts: PipelinePhase;
  persistMerged: PipelinePhase;
} {
  const rescanned = new Map<string, FileFactBundle>();
  let merged: IncrementalFactSet | undefined;

  return {
    /**
     * Re-scan ONLY the changed files. Language is derived from the cached
     * bundle when known, else from the extension. Per-file errors log and
     * continue — identical to the full path's tolerance.
     */
    rescanChanged: {
      name: 'rescan-changed',
      async run(ctx) {
        for (const filePath of deps.changedFiles) {
          const scanPath = deps.storeKeyFor(filePath);
          const language = deps.store.byFile[scanPath]?.language ?? deps.languageOf(scanPath);
          if (!language) continue; // unsupported extension — skip
          try {
            await deps.preloadGrammars([language]);
            const result = await deps.processFile(scanPath, language, ctx.verbose);
            rescanned.set(scanPath, {
              language,
              elements: result.elements,
              imports: result.imports,
              calls: result.calls,
              rawImports: result.rawImports,
              rawCalls: result.rawCalls,
              rawExports: result.rawExports,
              headerFact: result.headerFact,
              headerImportFacts: result.headerImportFacts,
              routes: result.routes,
              frontendCalls: result.frontendCalls,
              content: result.content,
            });
          } catch (error) {
            logger.error(`[PipelineOrchestrator] Incremental rescan error for ${filePath}:`, error);
          }
        }
      },
    },

    /**
     * Merge changed/deleted into the cached full set — the graph-safe step.
     * Deleted paths are translated to the store's own key form too, so an
     * absolutized deletion actually evicts the relative-keyed bundle.
     */
    mergeFacts: {
      name: 'merge-facts',
      run() {
        merged = mergeChangedFacts(deps.store, rescanned, deps.deletedFiles.map(deps.storeKeyFor));
      },
    },

    /**
     * Reassemble the FULL fact arrays in the merged file order and register
     * every element (parity with the full path) — the resolve tail then runs
     * over the complete universe through the exact same shared phases.
     */
    assembleFacts: {
      name: 'assemble-facts',
      run(ctx) {
        const set = merged!;
        for (const filePath of set.order) {
          const bundle = set.byFile[filePath];
          if (!bundle) continue;
          const list = ctx.files.get(bundle.language) ?? [];
          list.push(filePath);
          ctx.files.set(bundle.language, list);
          for (const elem of bundle.elements) globalRegistry.register(elem);
          ctx.elements.push(...bundle.elements);
          ctx.imports.push(...bundle.imports);
          ctx.calls.push(...bundle.calls);
          ctx.heritage.push(...(bundle.heritage ?? [])); // optional pre-v2 cache field
          ctx.rawImports.push(...bundle.rawImports);
          ctx.rawCalls.push(...bundle.rawCalls);
          ctx.rawExports.push(...bundle.rawExports);
          ctx.headerFacts.set(filePath, bundle.headerFact);
          ctx.headerImportFacts.push(...bundle.headerImportFacts);
          if (bundle.headerFact.parseErrors) ctx.headerParseErrors.push(...bundle.headerFact.parseErrors);
          // API-surface facts must survive the incremental path too, or a
          // `--incremental` populate would silently emit an EMPTY routes.json
          // over a correct one.
          ctx.routes.push(...(bundle.routes ?? []));            // optional pre-P1 cache field
          ctx.frontendCalls.push(...(bundle.frontendCalls ?? []));
          ctx.sources.set(filePath, bundle.content);
          ctx.factBundles.set(filePath, bundle);
          ctx.fileOrder.push(filePath);
        }
        ctx.filesScanned = set.order.length;
        ctx.totalFiles = set.order.length;
      },
    },

    /**
     * Re-persist the merged set so the NEXT delta builds on this one.
     * Best-effort, guarded on options.outputDir !== undefined (historical
     * incremental-path guard — distinct from the full path's truthy check).
     */
    persistMerged: {
      name: 'persist-merged-fact-set',
      run(ctx) {
        if (ctx.options.outputDir === undefined) return;
        try {
          writeFactSet(ctx.projectPath, merged!);
        } catch (e) {
          logger.warn(`[PipelineOrchestrator] Failed to re-persist fact set: ${e instanceof Error ? e.message : String(e)}`);
        }
      },
    },
  };
}
