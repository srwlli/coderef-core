/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability index-storage-compat-shim
 * @exports IndexSchemaVersion, IndexFormat, VerboseIndexFile, CompactElement, CompactIndexFile, LoadedIndex, toCompactElements, fromCompactElements, createVerboseIndexFile, createCompactIndexFile, writeIndexVariants, loadIndexFromCoderefDir
 * @used_by src/fileGeneration/detectDrift.ts, src/fileGeneration/saveIndex.ts
 */

/**
 * Compatibility shim — the canonical index serializer moved to
 * src/artifacts/index-storage.ts (WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001
 * P2-T2). index-storage is SHARED infrastructure (pipeline IndexGenerator writes
 * through it; DriftGenerator reads through it) — it was never a competing legacy
 * writer, so it now lives under the neutral artifacts module. This re-export
 * keeps deep imports of the old path working.
 */
export * from '../artifacts/index-storage.js';
