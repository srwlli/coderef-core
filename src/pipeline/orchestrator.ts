/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability pipeline-orchestrator
 * @exports PipelineOrchestrator
 * @used_by src/cli/populate.ts, src/semantic/orchestrator.ts, __tests__/pipeline/graph-ground-truth.test.ts, __tests__/pipeline/header-exports-cross-check.test.ts, __tests__/pipeline/header-fact-shape.test.ts, __tests__/pipeline/header-import-facts-cardinality.test.ts, __tests__/pipeline/import-resolution-relative.test.ts, __tests__/pipeline/no-graph-edge-claim.test.ts, __tests__/pipeline/no-import-resolution.test.ts, __tests__/pipeline/raw-call-facts.test.ts, __tests__/pipeline/raw-export-facts.test.ts, __tests__/pipeline/raw-import-facts.test.ts, __tests__/pipeline-integration.test.ts
 */

/**
 * PipelineOrchestrator - Single-pass codebase analysis pipeline
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 2, Task IMPL-004
 *
 * Features:
 * - File discovery: Finds all source files matching language filters
 * - Single-pass parsing: Each file parsed once with tree-sitter
 * - Element extraction: Functions, classes, components, hooks, etc
 * - Relationship extraction: Imports and call graphs
 * - Graph building: Dependency graph with nodes and edges
 *
 * Performance:
 * - Parallelizable: Process multiple files concurrently
 * - Cached grammars: GrammarRegistry reuses loaded parsers
 * - Memory efficient: Process files in batches if needed
 */



import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../utils/logger.js';
import { GrammarRegistry } from './grammar-registry.js';
import { ElementExtractor } from './extractors/element-extractor.js';
import { RelationshipExtractor } from './extractors/relationship-extractor.js';
import { RouteExtractor, type RouteFact, type FrontendCallFact } from './extractors/route-extractor.js';
import { loadIgnorePatterns, shouldIgnorePath } from './ignore-rules.js';
import { globalRegistry } from '../registry/entity-registry.js';
import { IncrementalCache } from '../cache/incremental-cache.js';
import type {
  PipelineOptions,
  PipelineState,
  ImportRelationship,
  CallRelationship,
  HeritageRelationship,
  RawImportFact,
  RawCallFact,
  RawExportFact,
  HeaderFact,
  HeaderImportFact,
  HeaderParseError,
  ImportResolution,
  CallResolution,
} from './types.js';
import { runPhases, pipelineStateOf, type PipelineContext } from './phases/types.js';
import { resolveTailPhases } from './phases/resolve-tail.js';
import {
  resetRegistryPhase,
  discoverFilesPhase,
  cacheFilterPhases,
  preloadGrammarsPhase,
  scanFilesPhase,
  persistFactSetPhase,
} from './phases/scan-front.js';
import { makeStoreKeyFor, incrementalFrontPhases } from './phases/incremental-front.js';
import { dedupeFactSet, readFactSet } from './symbol-table-cache.js';
import type { HeaderStatus } from './element-taxonomy.js';
import type { ElementData } from '../types/types.js';
import type { ExportedGraph } from '../export/graph-exporter.js';
import { createCodeRefId } from '../utils/coderef-id.js';

/**
 * PipelineOrchestrator - Coordinate the entire analysis pipeline
 */
export class PipelineOrchestrator {
  private registry: GrammarRegistry;
  private elementExtractor: ElementExtractor;
  private relationshipExtractor: RelationshipExtractor;
  private routeExtractor: RouteExtractor;

  constructor() {
    this.registry = GrammarRegistry.getInstance();
    this.elementExtractor = new ElementExtractor();
    this.relationshipExtractor = new RelationshipExtractor();
    this.routeExtractor = new RouteExtractor();
  }

  /**
   * Run the complete pipeline
   *
   * @param projectPath Absolute path to project root
   * @param options Pipeline configuration options
   * @returns Populated pipeline state with all extracted data
   */
  async run(projectPath: string, options: PipelineOptions = {}): Promise<PipelineState> {
    const startTime = Date.now();

    // Apply defaults
    const languages = options.languages || this.getDefaultLanguages();
    const verbose = options.verbose ?? false;

    if (verbose) {
      logger.info(`[PipelineOrchestrator] Starting scan of ${projectPath}`);
      logger.info(`[PipelineOrchestrator] Languages: ${languages.join(', ')}`);
    }

    // The full pipeline is a phase-list literal over the shared executor
    // (WO-DECOUPLE-PIPELINEORCHESTRATOR-VIA-PHASE-MIDDLEWARE-REFACTOR-
    // ORCHESTRATOR-TS-001 Phase 2): scan front (registry reset -> Step 1
    // discovery -> Step 1b IMP-CORE-028 cache filter -> Step 2 grammar
    // preload -> Step 3 single-pass scan) feeding the shared resolve tail
    // (Steps 4-4.8, Phase 1). The persistence phases (Step 5 cache update,
    // Step 5.5 fact-set write) run after the completion logs below,
    // preserving the historical step order exactly.
    const incrementalEnabled = options.incremental ?? false;
    const cache = new IncrementalCache(projectPath, incrementalEnabled);
    const cachePair = cacheFilterPhases(cache, incrementalEnabled);

    const ctx: PipelineContext = {
      projectPath,
      options,
      verbose,
      chainLogs: true,
      startTime,
      files: new Map(),
      totalFiles: 0,
      elements: [],
      imports: [],
      calls: [],
      heritage: [],
      rawImports: [],
      rawCalls: [],
      rawExports: [],
      headerFacts: new Map(),
      headerImportFacts: [],
      headerParseErrors: [],
      routes: [],
      frontendCalls: [],
      sources: new Map(),
      factBundles: new Map(),
      fileOrder: [],
      docs: [],
      // Seeded by the legacy-graph phase (first in the tail list).
      graph: undefined as unknown as ExportedGraph,
      importResolutions: [],
      callResolutions: [],
      filesScanned: 0,
    };

    await runPhases(
      [
        resetRegistryPhase(),
        discoverFilesPhase((p, l, o) => this.discoverFiles(p, l, o), languages),
        cachePair.filter,
        preloadGrammarsPhase(this.registry),
        scanFilesPhase((f, l, v) => this.processFile(f, l, v)),
        ...resolveTailPhases(
          (e, i, c, h, p) => this.buildGraph(e, i, c, h, p),
          { includeScipOverlay: true },
        ),
      ],
      ctx,
    );
    const graph = ctx.graph;
    const importResolutions: ImportResolution[] = ctx.importResolutions;
    const callResolutions: CallResolution[] = ctx.callResolutions;

    const endTime = Date.now();

    if (verbose) {
      logger.info(`[PipelineOrchestrator] Pipeline complete in ${endTime - startTime}ms`);
      logger.info(`[PipelineOrchestrator] Elements: ${ctx.elements.length}`);
      logger.info(`[PipelineOrchestrator] Imports: ${ctx.imports.length}`);
      logger.info(`[PipelineOrchestrator] Calls: ${ctx.calls.length}`);
      logger.info(`[PipelineOrchestrator] Import resolutions: ${importResolutions.length}`);
      logger.info(`[PipelineOrchestrator] Call resolutions: ${callResolutions.length}`);
      logger.info(`[PipelineOrchestrator] Graph nodes: ${graph.nodes.length}`);
      logger.info(`[PipelineOrchestrator] Graph edges: ${graph.edges.length}`);
    }

    // Step 5 (cache update) + Step 5.5 (fact-set persistence) as phases —
    // after the completion logs, exactly where they always ran.
    await runPhases([cachePair.persist, persistFactSetPhase(incrementalEnabled)], ctx);

    // Step 6: Return populated state
    const state: PipelineState = {
      ...pipelineStateOf(ctx),
      metadata: {
        startTime,
        endTime,
        filesScanned: ctx.filesScanned,
        elementsExtracted: ctx.elements.length,
        relationshipsExtracted: ctx.imports.length + ctx.calls.length,
        incremental: incrementalEnabled ? {
          filesSkipped: cachePair.stats.filesUnchanged.length,
          hitRatio: cachePair.stats.hitRatio,
          enabled: true,
        } : undefined,
      },
    };

    return state;
  }

  /**
   * Graph-safe incremental populate (P5, ADJ-03). Re-scan ONLY `changedFiles`,
   * SWAP their fact bundles into the persisted full fact set, then run the SAME
   * pure resolveImports/resolveCalls/constructGraph over the MERGED full
   * universe. The resolved-edge set is byte-identical to a full rebuild because
   * the inputs are identical (fresh facts for changed files + cached facts for
   * every unchanged file) and the resolve/construct functions are pure.
   *
   * Falls back to a FULL run() when no valid persisted fact set exists (first
   * run, stale schema, or a corrupt cache) — never resolves against a partial
   * universe (that is the corruption trap this phase closes).
   *
   * @param changedFiles absolute paths added or modified since the cached build
   * @param deletedFiles absolute paths removed since the cached build
   */
  async runIncremental(
    projectPath: string,
    changedFiles: string[],
    options: PipelineOptions = {},
    deletedFiles: string[] = [],
  ): Promise<PipelineState> {
    const startTime = Date.now();
    const verbose = options.verbose ?? false;

    const cached = readFactSet(projectPath);
    if (!cached) {
      if (verbose) logger.info('[PipelineOrchestrator] No valid fact set — falling back to a full build.');
      return this.run(projectPath, options);
    }

    // The incremental path is its own phase-list literal over the same
    // executor (WO-DECOUPLE-...-001 Phase 3): registry reset -> rescan
    // changed (P4 keying seam relocated verbatim to phases/incremental-
    // front.ts) -> merge into the store -> assemble the full universe ->
    // the SAME shared resolve tail run() uses (chainLogs and the SCIP leg
    // stay off — historical behavior of this path) -> re-persist the merged
    // store. The old assembleAndResolve() helper is gone; parity is by
    // shared code.
    const store = dedupeFactSet(cached, projectPath);
    const storeKeyFor = makeStoreKeyFor(projectPath, store);
    const front = incrementalFrontPhases({
      store,
      storeKeyFor,
      changedFiles,
      deletedFiles,
      languageOf: (p) => this.languageOf(p),
      preloadGrammars: (langs) => this.registry.preloadGrammars(langs),
      processFile: (f, l, v) => this.processFile(f, l, v),
    });

    const ctx: PipelineContext = {
      projectPath,
      options,
      verbose,
      chainLogs: false,
      startTime,
      files: new Map(),
      totalFiles: 0,
      elements: [],
      imports: [],
      calls: [],
      heritage: [],
      rawImports: [],
      rawCalls: [],
      rawExports: [],
      headerFacts: new Map(),
      headerImportFacts: [],
      headerParseErrors: [],
      routes: [],
      frontendCalls: [],
      sources: new Map(),
      factBundles: new Map(),
      fileOrder: [],
      docs: [],
      // Seeded by the legacy-graph phase (first in the tail list).
      graph: undefined as unknown as ExportedGraph,
      importResolutions: [],
      callResolutions: [],
      filesScanned: 0,
    };

    await runPhases(
      [
        resetRegistryPhase(),
        front.rescanChanged,
        front.mergeFacts,
        front.assembleFacts,
        ...resolveTailPhases(
          (e, i, c, h, p) => this.buildGraph(e, i, c, h, p),
          { includeScipOverlay: false },
        ),
        front.persistMerged,
      ],
      ctx,
    );

    return {
      ...pipelineStateOf(ctx),
      metadata: {
        startTime, endTime: Date.now(), filesScanned: ctx.filesScanned,
        elementsExtracted: ctx.elements.length,
        relationshipsExtracted: ctx.imports.length + ctx.calls.length,
        incremental: { filesSkipped: 0, hitRatio: 0, enabled: true },
      },
    };
  }

  /** Map a file path to its pipeline language key by extension, or null. */
  private languageOf(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.ts': 'ts', '.tsx': 'ts', '.js': 'js', '.jsx': 'js', '.mjs': 'js', '.cjs': 'js',
      '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java',
    };
    return map[ext] ?? null;
  }

  /**
   * Discover source files matching language extensions
   *
   * @param projectPath Project root directory
   * @param languages Language extensions to search for
   * @returns Map of language -> file paths
   */
  private async discoverFiles(
    projectPath: string,
    languages: string[],
    options: PipelineOptions
  ): Promise<Map<string, string[]>> {
    const files = new Map<string, string[]>();
    const ignorePatterns = await loadIgnorePatterns(projectPath, options.ignoreFile, options.exclude);

    for (const lang of languages) {
      files.set(lang, []);
    }

    await this.scanDirectory(projectPath, projectPath, languages, files, ignorePatterns);

    return files;
  }

  /**
   * Recursively scan directory for source files
   *
   * @param rootPath Project root (for relative path calculation)
   * @param currentPath Current directory being scanned
   * @param languages Target language extensions
   * @param files Accumulator map
   */
  private async scanDirectory(
    rootPath: string,
    currentPath: string,
    languages: string[],
    files: Map<string, string[]>,
    ignorePatterns: string[]
  ): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      // Skip unreadable directories
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const shouldIgnore = shouldIgnorePath(
        rootPath,
        fullPath,
        entry.name,
        entry.isDirectory(),
        ignorePatterns
      );

      if (entry.isDirectory()) {
        if (shouldIgnore) continue;

        // Recurse into subdirectories
        await this.scanDirectory(rootPath, fullPath, languages, files, ignorePatterns);
      } else if (entry.isFile()) {
        if (shouldIgnore) continue;

        // Check if file extension matches target languages
        const ext = path.extname(entry.name).slice(1); // Remove leading dot
        if (languages.includes(ext)) {
          const languageFiles = files.get(ext);
          if (languageFiles) {
            languageFiles.push(fullPath);
          }
        }
      }
    }
  }

  /**
   * Process a single file (parse once, extract all data)
   *
   * @param filePath Absolute path to source file
   * @param language File extension (ts, py, go, etc)
   * @param verbose Enable debug logging
   * @returns Extracted elements, imports, calls, and source content
   */
  private async processFile(
    filePath: string,
    language: string,
    verbose: boolean
  ): Promise<{
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
  }> {
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // API-surface facts ride this same pass (WO-API-SURFACE-MAPPING-...-001 P1).
    // Extracted BEFORE the parser check on purpose: route + frontend-call detection is
    // regex/Babel-based and does not depend on a tree-sitter grammar being available,
    // so a file whose language has no loaded grammar can still contribute route facts.
    const apiSurface = this.routeExtractor.extract(filePath, content);

    // Get parser for this language
    const parser = await this.registry.getParser(language);
    if (!parser) {
      if (verbose) {
        logger.warn(`[PipelineOrchestrator] No parser available for ${language}`);
      }
      return {
        elements: [],
        imports: [],
        calls: [],
        heritage: [],
        rawImports: [],
        rawCalls: [],
        rawExports: [],
        headerFact: { sourceFile: filePath },
        headerStatus: 'missing',
        headerImportFacts: [],
        routes: apiSurface.routes,
        frontendCalls: apiSurface.frontendCalls,
        content,
      };
    }

    // Parse file once
    const tree = parser.parse(content);

    // Extract all data from single AST
    const elements = this.elementExtractor.extract(tree.rootNode, filePath, content, language);
    const imports = this.relationshipExtractor.extractImports(tree.rootNode, filePath, content, language);
    const calls = this.relationshipExtractor.extractCalls(tree.rootNode, filePath, content, language);
    const heritage = this.relationshipExtractor.extractHeritage(tree.rootNode, filePath, content, language);
    const rawImports = this.relationshipExtractor.extractRawImports(tree.rootNode, filePath, content, language);
    const rawCalls = this.relationshipExtractor.extractRawCalls(tree.rootNode, filePath, content, language);
    const rawExports = this.relationshipExtractor.extractRawExports(tree.rootNode, filePath, content, language);

    // Phase 2.5: parse semantic header and cross-check @exports vs AST.
    const parsed = this.relationshipExtractor.extractHeaderFact(tree.rootNode, filePath, content, language);
    const headerFact: HeaderFact = parsed.headerFact;
    const headerImportFacts: HeaderImportFact[] = parsed.importFacts;
    let headerStatus: HeaderStatus = parsed.headerStatus;

    if (headerStatus === 'defined' && headerFact.exports !== undefined) {
      const headerSet = new Set(headerFact.exports);
      // Use exported-element names (same derivation as header-generator's buildExportsForFile) instead
      // of rawExports (a separate tree-sitter pass). rawExports captures export enum, re-exports, and
      // 'default' which the element extractor does not track, causing false-stale positives when a
      // correct @exports header omits those symbols. Filtering elements by .exported matches exactly
      // what would appear in the generated header.
      const astSet = new Set(elements.filter(e => e.exported).map(e => e.name));
      let mismatch = false;
      for (const name of headerSet) if (!astSet.has(name)) { mismatch = true; break; }
      if (!mismatch) for (const name of astSet) if (!headerSet.has(name)) { mismatch = true; break; }
      if (mismatch) headerStatus = 'stale';
    }

    // Stamp headerStatus + headerFact reference onto every element of this file.
    // Also propagate capability and layer so graph-builder / projections can read them.
    for (const elem of elements) {
      elem.headerStatus = headerStatus;
      elem.headerFact = headerFact;
      if (headerFact.capability !== undefined) elem.capability = headerFact.capability;
      if (headerFact.layer !== undefined) elem.layer = headerFact.layer;
    }

    return {
      elements,
      imports,
      calls,
      heritage,
      rawImports,
      rawCalls,
      rawExports,
      headerFact,
      headerStatus,
      headerImportFacts,
      routes: apiSurface.routes,
      frontendCalls: apiSurface.frontendCalls,
      content,
    };
  }

  /**
   * Build dependency graph from extracted relationships
   *
   * @param elements All extracted code elements
   * @param imports Import relationships
   * @param calls Call relationships
   * @returns Dependency graph with nodes and edges
   */
  private buildGraph(
    elements: ElementData[],
    imports: ImportRelationship[],
    calls: CallRelationship[],
    heritage: HeritageRelationship[],
    projectPath: string
  ): ExportedGraph {
    const elementIndexes = this.buildElementIndexes(elements);
    const nodes = elements.map(elem => ({
      id: this.getElementId(elem, projectPath),
      uuid: globalRegistry.lookup({ name: elem.name, file: elem.file, line: elem.line }),
      type: elem.type,
      name: elem.name,
      file: elem.file,
      line: elem.line,
      metadata: {
        codeRefId: createCodeRefId(elem, projectPath, { includeLine: true }),
        codeRefIdNoLine: createCodeRefId(elem, projectPath, { includeLine: false }),
      },
    }));

    const edges: ExportedGraph['edges'] = [];

    // Add import edges
    for (const imp of imports) {
      edges.push({
        source: imp.sourceFile,
        target: imp.target,
        type: 'imports',
        metadata: {
          specifiers: imp.specifiers,
          default: imp.default,
          namespace: imp.namespace,
          dynamic: imp.dynamic,
          line: imp.line,
        },
      });
    }

    // Add call edges
    for (const call of calls) {
      const sourceElementId = this.resolveElementId(call.source, call.file, elementIndexes, projectPath);
      const targetElementId = this.resolveElementId(call.target, call.file, elementIndexes, projectPath);

      edges.push({
        source: call.source,
        target: call.target,
        type: 'calls',
        metadata: {
          file: call.file,
          line: call.line,
          isMethod: call.isMethod,
          sourceElementId,
          targetElementId,
        },
      });
    }

    // Add heritage edges (WO-...-GENRE-FEATURES-PROGRAM-001 P5, type_hierarchy).
    // `subtype extends|implements supertype` — populating edge types that were
    // previously declared but never emitted. Endpoints resolve to codeRefIds the
    // same way calls do; an unresolved supertype keeps its string name (no-data).
    for (const h of heritage) {
      const sourceElementId = this.resolveElementId(h.subtype, h.sourceFile, elementIndexes, projectPath);
      const targetElementId = this.resolveElementId(h.supertype, h.sourceFile, elementIndexes, projectPath);

      edges.push({
        source: h.subtype,
        target: h.supertype,
        type: h.kind, // 'extends' | 'implements'
        metadata: {
          file: h.sourceFile,
          line: h.line,
          sourceElementId,
          targetElementId,
        },
      });
    }

    const edgesByType: Record<string, number> = {};
    for (const edge of edges) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const densityRatio = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      nodes,
      edges,
      statistics: {
        nodeCount,
        edgeCount,
        edgesByType,
        densityRatio,
      },
    };
  }

  /**
   * Generate unique ID for an element
   *
   * @param elem Code element
   * @returns Unique identifier (file:name or file:parentScope#name)
   */
  private getElementId(elem: ElementData, projectPath: string): string {
    if (elem.codeRefId) {
      return elem.codeRefId;
    }

    return createCodeRefId(elem, projectPath, { includeLine: true });
  }

  private buildElementIndexes(elements: ElementData[]): {
    byFileAndName: Map<string, ElementData[]>;
    byName: Map<string, ElementData[]>;
  } {
    const byFileAndName = new Map<string, ElementData[]>();
    const byName = new Map<string, ElementData[]>();

    for (const element of elements) {
      const fileAndNameKey = this.getFileAndNameKey(element.file, element.name);
      const fileMatches = byFileAndName.get(fileAndNameKey);
      if (fileMatches) {
        fileMatches.push(element);
      } else {
        byFileAndName.set(fileAndNameKey, [element]);
      }

      const nameMatches = byName.get(element.name);
      if (nameMatches) {
        nameMatches.push(element);
      } else {
        byName.set(element.name, [element]);
      }
    }

    return { byFileAndName, byName };
  }

  private resolveElementId(
    name: string,
    filePath: string,
    indexes: {
      byFileAndName: Map<string, ElementData[]>;
      byName: Map<string, ElementData[]>;
    },
    projectPath: string
  ): string | undefined {
    const fileMatches = indexes.byFileAndName.get(this.getFileAndNameKey(filePath, name));
    if (fileMatches?.length === 1) {
      return this.getElementId(fileMatches[0], projectPath);
    }

    const nameMatches = indexes.byName.get(name);
    if (nameMatches?.length === 1) {
      return this.getElementId(nameMatches[0], projectPath);
    }

    return undefined;
  }

  private getFileAndNameKey(filePath: string, name: string): string {
    return `${filePath}\u0000${name}`;
  }

  /**
   * Get default languages if not specified
   */
  private getDefaultLanguages(): string[] {
    // Import DEFAULT_LANGUAGES from types or define here
    return ['ts', 'tsx', 'js', 'jsx'];
  }
}
