/**
 * @coderef-semantic: 1.0.0
 * @layer integration
 * @capability embedding-cache-content-addressed-chunk-vectors
 * @exports EmbeddingCacheEntry, EmbeddingCache, embeddingCacheKey
 * @used_by src/integration/rag/indexing-orchestrator.ts
 */

/**
 * Chunk-grain embedding cache (Cursor Merkle-tree incremental-sync pattern).
 *
 * The existing incremental layer (incremental-indexer.ts) is FILE-grain: it
 * hashes whole files and drops UNCHANGED FILES from the work set, but a
 * one-function edit still re-embeds EVERY chunk in that file. This cache is
 * additive OVER that layer — it rescues byte-identical CHUNKS inside changed
 * files, the ~90% re-embed reduction.
 *
 * CONTENT-ADDRESSED KEY (the substitutability proof): the key is
 *   sha256(EmbeddingTextGenerator.generate(chunk, textOptions)) + ':' + modelId
 * i.e. the SHA-256 of the exact text that would be embedded, qualified by the
 * embedding model id. Identical embedded text + identical model ⇒ identical
 * vector, so a cache hit is provably substitutable for a live embed call. The
 * embedded TEXT is hashed (not the CodeChunk struct) because CodeChunk carries
 * no content hash and EmbeddingTextGenerator.generate() is fully deterministic.
 * The model id is in the key so a model swap (nomic-embed-text -> other)
 * invalidates automatically (different key ⇒ miss ⇒ re-embed at the new model).
 *
 * Persisted as a JSON sidecar (default `.coderef-embed-cache.json`), a SIBLING
 * of the incremental state `.coderef-rag-index.json`: load-on-start into an
 * in-memory Map, write-back after a run. Deterministic — no Date.now/Math.random
 * anywhere in the key or the stored value.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { CodeChunk } from './code-chunk.js';
import type { EmbeddedChunk } from './embedding-service.js';
import {
  EmbeddingTextGenerator,
  type TextGenerationOptions,
} from './embedding-text-generator.js';

/**
 * One persisted cache entry: the content-addressed key and its vector.
 */
export interface EmbeddingCacheEntry {
  /** sha256(embedText) + ':' + modelId */
  key: string;
  /** The embedding vector cached under that key. */
  vector: number[];
}

/**
 * On-disk sidecar shape. `version` guards future format changes; `model` is
 * advisory provenance (the authoritative model discriminator is baked into
 * each entry key). Entries are an array for stable JSON serialization.
 */
interface EmbeddingCacheFile {
  version: string;
  model?: string;
  entries: EmbeddingCacheEntry[];
}

const CACHE_VERSION = '1.0';
const DEFAULT_CACHE_FILENAME = '.coderef-embed-cache.json';

/**
 * Compute the content-addressed cache key for an already-generated embedding
 * text under a given model id. Pure. Exported so tests and the partition
 * helper share ONE key definition (no drift between write and read sides).
 */
export function embeddingCacheKey(embedText: string, modelId: string): string {
  const hash = crypto.createHash('sha256').update(embedText, 'utf8').digest('hex');
  return `${hash}:${modelId}`;
}

/**
 * Content-addressed chunk-grain embedding cache.
 *
 * Lifecycle: `new EmbeddingCache(basePath)` -> `await load()` (best-effort;
 * absent/corrupt sidecar starts empty) -> `partition(...)` to split work into
 * cache-hits and misses -> embed the misses -> `set(key, vector)` each new
 * vector -> `await persist()` to write the sidecar back.
 */
export class EmbeddingCache {
  private readonly cacheFile: string;
  private readonly modelId: string;
  private store = new Map<string, number[]>();
  private loaded = false;

  /**
   * @param basePath project root; the sidecar lives at basePath/<filename>.
   * @param modelId embedding model id mixed into every key (a model swap
   *        invalidates the cache). Falls back to 'unknown' if the provider
   *        cannot report its embedding model.
   * @param cacheFileName override the sidecar filename (tests use a temp file).
   */
  constructor(
    basePath: string,
    modelId: string | undefined,
    cacheFileName: string = DEFAULT_CACHE_FILENAME,
  ) {
    this.cacheFile = path.isAbsolute(cacheFileName)
      ? cacheFileName
      : path.join(basePath, cacheFileName);
    this.modelId = modelId && modelId.length > 0 ? modelId : 'unknown';
  }

  /** The model id used to qualify keys (for diagnostics/summary). */
  getModelId(): string {
    return this.modelId;
  }

  /** Number of vectors currently held in memory. */
  size(): number {
    return this.store.size;
  }

  /**
   * Load the sidecar into memory (best-effort). A missing file is normal
   * (first run). A corrupt/unreadable file is tolerated: log to stderr and
   * start empty rather than aborting an index run over a bad cache. Never
   * writes.
   */
  async load(): Promise<void> {
    this.loaded = true;
    try {
      const raw = await fs.readFile(this.cacheFile, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<EmbeddingCacheFile>;
      if (parsed && Array.isArray(parsed.entries)) {
        for (const entry of parsed.entries) {
          if (
            entry &&
            typeof entry.key === 'string' &&
            Array.isArray(entry.vector)
          ) {
            this.store.set(entry.key, entry.vector);
          }
        }
      }
    } catch (error: any) {
      if (error && error.code === 'ENOENT') {
        return; // first run — no sidecar yet
      }
      // Corrupt or unreadable cache is non-fatal: start empty.
      console.warn(
        `[embedding-cache] Ignoring unreadable cache at ${this.cacheFile}: ${error?.message ?? error}`,
      );
    }
  }

  /** Look up a cached vector by content-addressed key. */
  get(key: string): number[] | undefined {
    return this.store.get(key);
  }

  /** Store a freshly-computed vector under its content-addressed key. */
  set(key: string, vector: number[]): void {
    this.store.set(key, vector);
  }

  /**
   * Compute the content-addressed key for a chunk under this cache's model id
   * and the given text-generation options. The text generator MUST be the same
   * one (and options the same) the embedding path uses, or keys will not line
   * up. Deterministic.
   */
  keyForChunk(
    chunk: CodeChunk,
    textGenerator: EmbeddingTextGenerator,
    textOptions?: TextGenerationOptions,
  ): string {
    const text = textGenerator.generate(chunk, textOptions);
    return embeddingCacheKey(text, this.modelId);
  }

  /**
   * Partition a chunk list into cache HITS (already have a vector — no embed
   * call needed) and MISSES (must be embedded). A hit is materialized as a
   * full EmbeddedChunk so the orchestrator can merge it straight into the
   * embedding result and treat it identically to a freshly-embedded chunk
   * (INDEXED, present in the upsert — never counted as skipped). The hit's
   * `timestamp` is 0 (deterministic; timestamp is metadata only, never part
   * of the vector or the key). Order within each bucket follows input order.
   */
  partition(
    chunks: CodeChunk[],
    textGenerator: EmbeddingTextGenerator,
    textOptions?: TextGenerationOptions,
  ): { hits: EmbeddedChunk[]; misses: CodeChunk[] } {
    const hits: EmbeddedChunk[] = [];
    const misses: CodeChunk[] = [];
    for (const chunk of chunks) {
      const text = textGenerator.generate(chunk, textOptions);
      const key = embeddingCacheKey(text, this.modelId);
      const vector = this.store.get(key);
      if (vector !== undefined) {
        hits.push({ chunk, embedding: vector, text, timestamp: 0 });
      } else {
        misses.push(chunk);
      }
    }
    return { hits, misses };
  }

  /**
   * Persist the in-memory store to the sidecar (atomic temp+rename). Entries
   * are key-sorted so identical cache contents serialize byte-identically
   * (deterministic snapshot, friendly to any downstream diffing). Best-effort
   * at the call site: a write failure is surfaced by the caller, never
   * silently swallowed here beyond the temp cleanup.
   */
  async persist(): Promise<void> {
    const entries: EmbeddingCacheEntry[] = Array.from(this.store.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([key, vector]) => ({ key, vector }));

    const fileData: EmbeddingCacheFile = {
      version: CACHE_VERSION,
      model: this.modelId,
      entries,
    };

    const tmp = `${this.cacheFile}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(fileData, null, 2), 'utf-8');
    await fs.rename(tmp, this.cacheFile);
  }

  /** Whether load() has been called (guards double-load). */
  isLoaded(): boolean {
    return this.loaded;
  }
}
