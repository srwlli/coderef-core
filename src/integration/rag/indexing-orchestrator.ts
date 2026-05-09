/**
 * Indexing Orchestrator
 * P3-T1: Orchestrates the complete pipeline from source code to vector DB
 *
 * This is the main entry point for RAG indexing. It coordinates:
 * 1. Graph load from .coderef/graph.json (populate-coderef is the producer)
 * 2. Chunk conversion
 * 3. Embedding generation
 * 4. Vector storage
 * 5. Incremental indexing
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports normalizeChunkFileForGraphJoin, buildGraphFromExportedJson, IndexingProgressCallback, IndexingProgress, ValidationGateInput, IndexingOptions, SkipReason, FailReason, SkipEntry, FailEntry, IndexingStatus, IndexingResult, IndexingStatistics, IndexingError, IndexingOrchestrator, reportProgress
 * @used_by src/cli/rag-index.ts, src/integration/rag/__tests__/integration/indexing-pipeline.test.ts, __tests__/integration/rag/indexing-orchestrator-graph-source.test.ts, __tests__/integration/rag/indexing-orchestrator.test.ts, __tests__/pipeline/indexing-gate-invariant.test.ts
 */

import type {
  DependencyGraph,
  GraphEdge,
  GraphNode,
} from '../../analyzer/graph-builder.js';
import type { LLMProvider } from '../llm/llm-provider.js';
import type { VectorStore } from '../vector/vector-store.js';
import { ChunkConverter } from './chunk-converter.js';
import type { ChunkOptions } from './code-chunk.js';
import {
  EmbeddingService,
  type EmbeddingServiceOptions
} from './embedding-service.js';
import {
  IncrementalIndexer,
  type IncrementalIndexOptions
} from './incremental-indexer.js';
import type { CodeChunk } from './code-chunk.js';
import type { VectorRecord } from '../vector/vector-store.js';
import * as fs from 'fs/promises';
import * as pathMod from 'path';
import { type AbsolutePath, type RelativePath, toAbsolute, toRelative } from './path-types.js';

/**
 * Reduce a chunk-side file path to the relative-POSIX form that
 * .coderef/graph.json node.file keys use, so the facet enrichment
 * join in indexCodebase can succeed regardless of how upstream
 * chunk producers shaped chunk.file (absolute Windows backslash,
 * absolute POSIX, or with a leading 'file:' URI prefix). Pure
 * function — no I/O. Exported for unit testing.
 */
export function normalizeChunkFileForGraphJoin(
  file: string,
  basePath: string,
): string {
  // Peel any 'file:' URI prefix that upstream chunk producers may
  // have left attached.
  let raw = file.startsWith('file:') ? file.slice('file:'.length) : file;
  raw = raw.replace(/\\/g, '/');
  if (pathMod.isAbsolute(raw)) {
    const absBase = pathMod.resolve(basePath).replace(/\\/g, '/');
    return pathMod.relative(absBase, raw).replace(/\\/g, '/');
  }
  return raw;
}

/**
 * Adapt the on-disk .coderef/graph.json shape (flat node/edge arrays)
 * to the in-memory DependencyGraph that ChunkConverter consumes
 * (Map-keyed nodes + edgesBySource/edgesByTarget reverse indexes).
 *
 * graph.json node.id carries the canonical capability-tagged element
 * identifier (e.g., '@Fn/file.ts#name:line'); ChunkConverter joins
 * dependencies/dependents through these ids via the reverse-index
 * Maps. node.metadata (layer/capability/constraints/headerStatus) is
 * preserved unchanged so ChunkConverter.convertNode can propagate
 * facets onto each chunk inline (see chunk-converter.ts L153-201).
 *
 * Pure function — no I/O. Exported for unit testing.
 */
export function buildGraphFromExportedJson(rawJson: unknown): DependencyGraph {
  const j = rawJson as { nodes?: unknown[]; edges?: unknown[] };
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgesBySource = new Map<string, GraphEdge[]>();
  const edgesByTarget = new Map<string, GraphEdge[]>();

  for (const raw of j.nodes ?? []) {
    const n = raw as Partial<GraphNode>;
    if (typeof n.id !== 'string' || typeof n.file !== 'string') continue;
    nodes.set(n.id, {
      id: n.id,
      uuid: typeof n.uuid === 'string' ? n.uuid : undefined,
      name: typeof n.name === 'string' ? n.name : n.id,
      type: typeof n.type === 'string' ? n.type : 'unknown',
      file: n.file,
      line: typeof n.line === 'number' ? n.line : undefined,
      metadata:
        n.metadata && typeof n.metadata === 'object'
          ? (n.metadata as Record<string, unknown>)
          : undefined,
    });
  }

  for (const raw of j.edges ?? []) {
    const e = raw as Partial<GraphEdge>;
    if (typeof e.source !== 'string' || typeof e.target !== 'string' || typeof e.type !== 'string')
      continue;
    const edge: GraphEdge = {
      source: e.source,
      target: e.target,
      type: e.type as GraphEdge['type'],
      weight: typeof e.weight === 'number' ? e.weight : undefined,
      metadata:
        e.metadata && typeof e.metadata === 'object'
          ? (e.metadata as Record<string, unknown>)
          : undefined,
    };
    edges.push(edge);
    const src = edgesBySource.get(edge.source);
    if (src) src.push(edge);
    else edgesBySource.set(edge.source, [edge]);
    const tgt = edgesByTarget.get(edge.target);
    if (tgt) tgt.push(edge);
    else edgesByTarget.set(edge.target, [edge]);
  }

  return { nodes, edges, edgesBySource, edgesByTarget };
}

/**
 * Progress callback for indexing
 */
export type IndexingProgressCallback = (progress: IndexingProgress) => void;

/**
 * Progress information during indexing
 */
export interface IndexingProgress {
  /** Current stage */
  stage: IndexingStage;

  /** Stage description */
  stageDescription: string;

  /** Progress within stage (0-100) */
  stageProgress: number;

  /** Overall progress (0-100) */
  overallProgress: number;

  /** Additional stage-specific data */
  data?: any;
}

/**
 * Indexing stages
 */
export enum IndexingStage {
  ANALYZING = 'analyzing',
  CONVERTING = 'converting',
  EMBEDDING = 'embedding',
  STORING = 'storing',
  COMPLETE = 'complete'
}

/**
 * Caller-injected Phase 6 validation result (DR-PHASE-7-A). The CLI
 * (rag-index) reads `.coderef/validation-report.json` and passes the
 * shape into `indexCodebase`. The orchestrator stays pure (no fs).
 *
 * Programmatic API consumers MUST also pass validation. Calling
 * `indexCodebase` without validation throws an explicit error per
 * task 1.5 — the gate is non-bypassable by accident.
 */
export interface ValidationGateInput {
  /** True iff Phase 6 produced no errors. False blocks indexing. */
  ok: boolean;
  /** Optional path to the validation-report.json that gated the run. */
  reportPath?: string;
}

/**
 * Options for indexing
 */
export interface IndexingOptions {
  /** Source directory to index */
  sourceDir: string;

  /** Languages to scan */
  languages?: string[];

  /** Chunk conversion options */
  chunkOptions?: ChunkOptions;

  /** Embedding service options */
  embeddingOptions?: EmbeddingServiceOptions;

  /** Incremental indexing options */
  incrementalOptions?: IncrementalIndexOptions;

  /** Namespace for vector store */
  namespace?: string;

  /** Progress callback */
  onProgress?: IndexingProgressCallback;

  /** Whether to use the analyzer (AST-based) or regex scanner */
  useAnalyzer?: boolean;

  /**
   * REQUIRED at the call site: Phase 6 validation gate input
   * (DR-PHASE-7-A). The orchestrator throws if undefined — callers
   * must read .coderef/validation-report.json and pass the result.
   *
   * When `validation.ok === false`, `indexCodebase` returns
   * status='failed' with `validationGateRefused: true` and makes NO
   * embedding API calls. This is the chokepoint contract Phase 7
   * inherits from Phase 6.
   *
   * Marked optional in TypeScript only so existing programmatic
   * callers surface the omission as a runtime error with a helpful
   * message — bumping the type to required would break compile for
   * legitimate test fixtures that need to evolve gradually.
   */
  validation?: ValidationGateInput;
}

// Phase 7 task 1.3 — locked classification enums for per-entry skip and
// fail reasons. Keep additive; widening either union is a breaking
// change for downstream consumers that match by reason value.

/**
 * Reason a chunk was skipped during indexing. Each value documents a
 * distinct legitimate cause; an unset reason is the silent-success
 * anti-pattern Phase 7 eliminates (DR-PHASE-7-E).
 */
export type SkipReason =
  | 'unchanged'
  | 'header_status_missing'
  | 'header_status_stale'
  | 'header_status_partial'
  | 'unresolved_relationship';

/**
 * Reason a chunk failed during indexing. Distinct from SkipReason: a
 * fail represents a malfunction (the chunk should have indexed but
 * could not); a skip represents an intentional omission.
 */
export type FailReason = 'embedding_api_error' | 'malformed_chunk';

/**
 * Per-chunk skip detail entry. Phase 7 invariant: every
 * chunksSkippedDetails entry has reason !== undefined.
 */
export interface SkipEntry {
  coderefId: string;
  reason: SkipReason;
  message?: string;
}

/**
 * Per-chunk fail detail entry. Phase 7 invariant: every
 * chunksFailedDetails entry has reason !== undefined.
 */
export interface FailEntry {
  coderefId: string;
  reason: FailReason;
  message?: string;
}

/**
 * Top-level indexing run status (DR-PHASE-7-C).
 */
export type IndexingStatus = 'success' | 'partial' | 'failed';

/**
 * Result from indexing operation.
 *
 * Phase 7 INVARIANT (DR-PHASE-7-B): the shape is strictly additive
 * over the pre-Phase-7 contract. The numeric counts
 * (chunksIndexed/Skipped/Failed) keep their original type; the new
 * fields (status, *Details, validationGateRefused) are additive.
 *
 * WO-RAG-INDEX-SCHEMA-REDUCTION-001 (Option A): filesProcessed and
 * processingTimeMs removed — no invariant tests, no logic consumers.
 */
export interface IndexingResult {
  /** Number of chunks successfully indexed */
  chunksIndexed: number;

  /**
   * Number of chunks skipped (unchanged).
   * @frozen — no invariant test; must not be modified without adding a paired test.
   */
  chunksSkipped: number;

  /**
   * Number of failed chunks.
   * @frozen — no invariant test; must not be modified without adding a paired test.
   */
  chunksFailed: number;

  /**
   * Statistics.
   * @frozen — no invariant test; must not be modified without adding a paired test.
   */
  stats: IndexingStatistics;

  /**
   * Errors encountered.
   * @frozen — no invariant test; must not be modified without adding a paired test.
   */
  errors: IndexingError[];

  // Phase 7 additive fields:

  /** Top-level status — see IndexingStatus thresholds. */
  status: IndexingStatus;

  /** Per-chunk skip details. Length === chunksSkipped (invariant). */
  chunksSkippedDetails: SkipEntry[];

  /**
   * Per-chunk fail details. Length === chunksFailed (invariant).
   * @frozen — no invariant test on content; must not be modified without adding a paired test.
   */
  chunksFailedDetails: FailEntry[];

  /** True when status='failed' because Phase 6 validation gate refused. */
  validationGateRefused?: boolean;

  /** Optional path to the validation-report.json that gated this run. */
  validationReportPath?: string;
}

/**
 * Statistics from indexing.
 * All fields @frozen — no invariant tests; must not be modified without adding paired tests.
 */
export interface IndexingStatistics {
  /** @frozen Total tokens used */
  tokensUsed: number;

  /** @frozen Estimated cost */
  estimatedCost?: number;

  /** @frozen Average embedding time per chunk (ms) */
  avgEmbeddingTimeMs: number;

  /** @frozen Chunks by type */
  byType: Record<string, number>;

  /** @frozen Chunks by language */
  byLanguage: Record<string, number>;
}

/**
 * Error during indexing.
 * All fields @frozen — no invariant tests; must not be modified without adding paired tests.
 */
export interface IndexingError {
  /** @frozen Stage where error occurred */
  stage: IndexingStage;

  /** @frozen Error message */
  message: string;

  /** @frozen Optional context */
  context?: string;

  /** @frozen Original error */
  originalError?: Error;
}

/**
 * Orchestrates the complete RAG indexing pipeline.
 *
 * Reads the persisted graph from `.coderef/graph.json` rather than running a
 * second analyzer slice in-process. populate-coderef owns the single canonical
 * graph build.
 */
export class IndexingOrchestrator {
  private llmProvider: LLMProvider;
  private vectorStore: VectorStore;
  private basePath: AbsolutePath;

  constructor(
    llmProvider: LLMProvider,
    vectorStore: VectorStore,
    basePath: string = process.cwd()
  ) {
    this.llmProvider = llmProvider;
    this.vectorStore = vectorStore;
    this.basePath = toAbsolute(basePath);
  }

  /**
   * Index a codebase
   */
  async indexCodebase(options: IndexingOptions): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: IndexingError[] = [];

    // Phase 7 task 1.5 — validation gate (DR-PHASE-7-A). Caller must
    // inject Phase 6 validation result. Missing validation is a
    // programmer error: throw with a helpful message rather than
    // silently bypassing the gate. ok=false short-circuits with
    // status='failed' and zero embedding API calls.
    if (options.validation === undefined) {
      throw new Error(
        '[indexing-orchestrator] Phase 6 validation result required. ' +
          'Read .coderef/validation-report.json and pass into ' +
          'IndexingOptions.validation. Example: ' +
          '{ ok: report.ok, reportPath: ".coderef/validation-report.json" }.'
      );
    }
    if (options.validation.ok === false) {
      return {
        chunksIndexed: 0,
        chunksSkipped: 0,
        chunksFailed: 0,
        stats: {
          tokensUsed: 0,
          avgEmbeddingTimeMs: 0,
          byType: {},
          byLanguage: {},
        },
        errors: [
          {
            stage: IndexingStage.ANALYZING,
            message:
              'Phase 6 validation failed (validation-report.json ok=false). ' +
              'Indexing refused. Resolve graph-integrity errors before re-running.',
          },
        ],
        status: 'failed',
        chunksSkippedDetails: [],
        chunksFailedDetails: [],
        validationGateRefused: true,
        validationReportPath: options.validation.reportPath,
      };
    }

    const reportProgress = (
      stage: IndexingStage,
      stageDescription: string,
      stageProgress: number,
      overallProgress: number,
      data?: any
    ) => {
      if (options.onProgress) {
        options.onProgress({
          stage,
          stageDescription,
          stageProgress,
          overallProgress,
          data
        });
      }
    };

    try {
      // Stage 1: Analyze codebase (25% of overall progress)
      reportProgress(
        IndexingStage.ANALYZING,
        'Analyzing codebase with AST scanner',
        0,
        0
      );

      let graph: DependencyGraph;
      let chunks: CodeChunk[];

      if (options.useAnalyzer) {
        // WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 — substrate pivot.
        // The chunk source is the canonical .coderef/graph.json written
        // by populate-coderef. There is no second analyzer slice; chunks
        // ARE the nodes of the graph that validation-report counted
        // header_missing from. AC-05a (element-grain identity) and
        // AC-05b (file-grain cross-component identity) hold by
        // construction once the read lands here.
        const graphJsonPath = pathMod.join(this.basePath, '.coderef', 'graph.json');
        let raw: string;
        let graphStat: { mtimeMs: number };
        try {
          [raw, graphStat] = await Promise.all([
            fs.readFile(graphJsonPath, 'utf-8'),
            fs.stat(graphJsonPath),
          ]);
        } catch (err: any) {
          if (err && err.code === 'ENOENT') {
            throw new Error(
              `[indexing-orchestrator] .coderef/graph.json not found at ${graphJsonPath}. ` +
                'Run `coderef populate` before `coderef rag-index` — rag-index reads ' +
                'the canonical graph.json that populate-coderef writes; without it ' +
                'there is no chunk source.',
            );
          }
          throw err;
        }
        graph = buildGraphFromExportedJson(JSON.parse(raw));

        // Stale-graph check (DR-SINGLE-SLICE-D, fail-loud). Sample up to
        // 10 unique source files from the parsed graph and compare each
        // source's mtime to graph.json's mtime. If any source is newer
        // the graph is out of date — refuse rather than embed against
        // stale chunks (the same silent-disagreement failure mode this
        // WO is meant to eliminate).
        const sampleFiles: string[] = [];
        const seen = new Set<string>();
        for (const n of graph.nodes.values()) {
          if (!seen.has(n.file)) {
            seen.add(n.file);
            sampleFiles.push(n.file);
            if (sampleFiles.length >= 10) break;
          }
        }
        for (const rel of sampleFiles.map(toRelative)) {
          // rel is always a graph.json node.file (relative path, GUARD-2).
          // basePath is always absolute. The isAbsolute ternary that was here
          // previously was dead code — removed by WO-RAG-INDEX-BRANDED-PATHS-001.
          const abs: AbsolutePath = toAbsolute(pathMod.join(this.basePath, rel));
          let srcStat: { mtimeMs: number };
          try {
            srcStat = await fs.stat(abs);
          } catch {
            continue; // missing source files are ChunkConverter's concern, not ours
          }
          if (srcStat.mtimeMs > graphStat.mtimeMs) {
            throw new Error(
              `[indexing-orchestrator] .coderef/graph.json is stale — source file ${rel} ` +
                `is newer (source mtime=${new Date(srcStat.mtimeMs).toISOString()}, ` +
                `graph mtime=${new Date(graphStat.mtimeMs).toISOString()}). ` +
                'Re-run `coderef populate` to refresh.',
            );
          }
        }

        reportProgress(
          IndexingStage.ANALYZING,
          'Analysis complete',
          100,
          25,
          {
            nodes: graph.nodes.size,
            edges: graph.edges.length
          }
        );

        // Stage 2: Convert to chunks (25-40% of overall progress)
        reportProgress(
          IndexingStage.CONVERTING,
          'Converting graph nodes to code chunks',
          0,
          25
        );

        const chunkConverter = new ChunkConverter(this.basePath);
        const conversionResult = await chunkConverter.convertGraph(
          graph,
          options.chunkOptions
        );

        chunks = conversionResult.chunks;

        // Record conversion errors
        for (const error of conversionResult.errors) {
          errors.push({
            stage: IndexingStage.CONVERTING,
            message: error.message,
            context: error.coderef,
            originalError: error.originalError
          });
        }

        reportProgress(
          IndexingStage.CONVERTING,
          'Conversion complete',
          100,
          40,
          {
            chunks: chunks.length,
            errors: conversionResult.errors.length
          }
        );
      } else {
        throw new Error('Non-analyzer mode not yet implemented');
      }

      // WO-RAG-INDEX-SINGLE-ANALYZER-SLICE-001 — facet enrichment block
      // deleted. Chunks now come from the same .coderef/graph.json that
      // carries the element-grain facets, so ChunkConverter.convertNode
      // (chunk-converter.ts L153-201) propagates layer/capability/
      // constraints/headerStatus inline at chunk creation time. The
      // separate file-grain aggregation that this block performed was
      // a Phase 7 compensation for the two-slice architecture; with one
      // slice it is redundant.

      // Phase 7 task 1.7 — skip-with-reason classification for chunks
      // whose source ElementData has headerStatus in {missing, stale,
      // partial} (DR-PHASE-7-E). Filter BEFORE the incremental indexer
      // so unchanged-but-skipped never gets re-counted as unchanged.
      const headerStatusSkipDetails: SkipEntry[] = [];
      const chunksAfterHeaderFilter: CodeChunk[] = [];
      for (const chunk of chunks) {
        if (
          chunk.headerStatus === 'missing' ||
          chunk.headerStatus === 'stale' ||
          chunk.headerStatus === 'partial'
        ) {
          headerStatusSkipDetails.push({
            coderefId: chunk.coderef,
            reason: `header_status_${chunk.headerStatus}` as SkipReason,
          });
        } else {
          chunksAfterHeaderFilter.push(chunk);
        }
      }
      chunks = chunksAfterHeaderFilter;

      // Filter for incremental indexing
      const incrementalIndexer = new IncrementalIndexer(
        this.basePath,
        options.incrementalOptions?.stateFile
      );

      const { chunksToIndex, chunksToKeep } =
        await incrementalIndexer.filterChangedChunks(
          chunks,
          options.incrementalOptions
        );

      // Phase 7 task 1.7 — incremental skip details. Each chunk that
      // the incremental indexer kept (vs re-indexing) is a skip with
      // reason='unchanged'. Combined with the header-status skips, the
      // chunksSkippedDetails array is exhaustive.
      const incrementalSkipDetails: SkipEntry[] = chunksToKeep.map(
        (coderefId) => ({
          coderefId,
          reason: 'unchanged' as const,
        }),
      );
      const chunksSkippedDetails: SkipEntry[] = [
        ...headerStatusSkipDetails,
        ...incrementalSkipDetails,
      ];

      reportProgress(
        IndexingStage.EMBEDDING,
        'Preparing embeddings',
        0,
        40,
        {
          toIndex: chunksToIndex.length,
          toSkip: chunksToKeep.length
        }
      );

      // Stage 3: Generate embeddings (40-80% of overall progress)
      const embeddingService = new EmbeddingService(this.llmProvider);

      const embeddingResult = await embeddingService.embedChunks(
        chunksToIndex,
        {
          ...options.embeddingOptions,
          onProgress: (embeddingProgress) => {
            const stageProgress = embeddingProgress.percentage;
            const overallProgress = 40 + (stageProgress / 100) * 40;

            reportProgress(
              IndexingStage.EMBEDDING,
              `Embedding batch ${embeddingProgress.currentBatch}/${embeddingProgress.totalBatches}`,
              stageProgress,
              overallProgress,
              embeddingProgress
            );
          }
        }
      );

      // Record embedding errors + Phase 7 task 1.7 fail-with-reason
      // classification. Embedding-API failures map to
      // reason='embedding_api_error' per FailReason union.
      const chunksFailedDetails: FailEntry[] = [];
      for (const error of embeddingResult.failed) {
        errors.push({
          stage: IndexingStage.EMBEDDING,
          message: error.message,
          context: error.coderef,
          originalError: error.originalError
        });
        chunksFailedDetails.push({
          coderefId: error.coderef,
          reason: 'embedding_api_error',
          message: error.message,
        });
      }

      reportProgress(
        IndexingStage.EMBEDDING,
        'Embeddings complete',
        100,
        80,
        {
          embedded: embeddingResult.embedded.length,
          failed: embeddingResult.failed.length
        }
      );

      // Stage 4: Store in vector DB (80-95% of overall progress)
      reportProgress(
        IndexingStage.STORING,
        'Storing vectors in database',
        0,
        80
      );

      // Convert embedded chunks to vector records. Phase 7 task 1.6:
      // propagate semantic facets (layer/capability/constraints/
      // headerStatus) into vector metadata so the
      // `filter?: Partial<CodeChunkMetadata>` seam at QueryOptions
      // automatically supports filter-by-layer / filter-by-capability
      // queries (AC-06) without new filter machinery.
      const vectorRecords: VectorRecord[] = embeddingResult.embedded.map(
        (item) => ({
          id: item.chunk.coderef,
          values: item.embedding,
          metadata: {
            coderef: item.chunk.coderef,
            type: item.chunk.type,
            name: item.chunk.name,
            file: item.chunk.file,
            line: item.chunk.line,
            language: item.chunk.language,
            exported: item.chunk.exported,
            documentation: item.chunk.documentation,
            dependencyCount: item.chunk.dependencyCount,
            dependentCount: item.chunk.dependentCount,
            complexity: item.chunk.complexity,
            coverage: item.chunk.coverage,
            ...(item.chunk.layer !== undefined && { layer: item.chunk.layer }),
            ...(item.chunk.capability !== undefined && { capability: item.chunk.capability }),
            ...(item.chunk.constraints !== undefined && { constraints: item.chunk.constraints }),
            ...(item.chunk.headerStatus !== undefined && { headerStatus: item.chunk.headerStatus }),
          }
        })
      );

      // Upsert vectors
      await this.vectorStore.upsert(vectorRecords, options.namespace);

      reportProgress(
        IndexingStage.STORING,
        'Vectors stored',
        100,
        95,
        {
          stored: vectorRecords.length
        }
      );

      // Stage 5: Update incremental index state (95-100%)
      reportProgress(
        IndexingStage.COMPLETE,
        'Updating index state',
        50,
        97
      );

      await incrementalIndexer.updateState(chunksToIndex);

      reportProgress(
        IndexingStage.COMPLETE,
        'Indexing complete',
        100,
        100
      );

      // Calculate statistics
      const chunkStats = embeddingResult.stats;
      const byType: Record<string, number> = {};
      const byLanguage: Record<string, number> = {};

      for (const chunk of chunksToIndex) {
        byType[chunk.type] = (byType[chunk.type] || 0) + 1;
        byLanguage[chunk.language] = (byLanguage[chunk.language] || 0) + 1;
      }

      // Phase 7 task 1.8 — canonical status computation (DR-PHASE-7-C).
      // chunksSkipped count is the SUM of header-status skips +
      // incremental "unchanged" skips (per task 1.7). Invariant:
      // chunksSkipped === chunksSkippedDetails.length and
      // chunksFailed === chunksFailedDetails.length.
      const chunksIndexed = embeddingResult.embedded.length;
      const chunksSkipped = chunksSkippedDetails.length;
      const chunksFailed = chunksFailedDetails.length;
      const status: IndexingStatus =
        chunksIndexed === 0
          ? 'failed'
          : chunksFailed > 0 || chunksSkipped > 0
            ? 'partial'
            : 'success';
      return {
        chunksIndexed,
        chunksSkipped,
        chunksFailed,
        stats: {
          tokensUsed: chunkStats.totalTokensUsed,
          estimatedCost: (chunkStats.totalTokensUsed / 1_000_000) * 0.020,
          avgEmbeddingTimeMs: chunkStats.avgBatchTimeMs,
          byType,
          byLanguage
        },
        errors,
        status,
        chunksSkippedDetails,
        chunksFailedDetails,
        validationReportPath: options.validation?.reportPath,
      };
    } catch (error: any) {
      errors.push({
        stage: IndexingStage.ANALYZING,
        message: `Fatal error: ${error.message}`,
        originalError: error
      });

      throw new Error(`Indexing failed: ${error.message}`);
    }
  }

  /**
   * Get statistics about current index
   */
  async getIndexStats(): Promise<{
    vectorStoreStats: any;
    incrementalStats: any;
  }> {
    const vectorStoreStats = await this.vectorStore.stats();

    const incrementalIndexer = new IncrementalIndexer(this.basePath);
    const incrementalStats = await incrementalIndexer.getStatistics();

    return {
      vectorStoreStats,
      incrementalStats
    };
  }

  /**
   * Clear all indexed data
   */
  async clearIndex(namespace?: string): Promise<void> {
    // Clear vector store
    await this.vectorStore.clear(namespace);

    // Clear incremental index state
    const incrementalIndexer = new IncrementalIndexer(this.basePath);
    await incrementalIndexer.clearState();
  }
}
