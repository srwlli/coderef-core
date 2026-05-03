/**
 * Phase 3 Import Resolver
 *
 * WO-PIPELINE-IMPORT-RESOLUTION-001
 *
 * Two-pass resolver:
 *   Pass 1 (buildExportTables) — group RawExportFact[] by module file into a
 *     Map<moduleFile, Map<exportedName, ExportTableEntry>>. Reads tsconfig.json
 *     and package.json ONCE at the start; no further file IO occurs after the
 *     export tables exist.
 *   Pass 2 (resolveAstImports + resolveHeaderImports) — for every
 *     RawImportFact and HeaderImportFact in PipelineState, resolve the module
 *     specifier (relative / extensionless / index / path-alias / node_modules)
 *     and look up the imported symbol in the resolved module's export table.
 *     Emits exactly one ImportResolution per imported binding, classified into
 *     one of {resolved, unresolved, external, ambiguous, dynamic, typeOnly,
 *     stale}. Pass 2 performs ZERO file IO — every existence check is against
 *     state.files.
 *
 * Phase 3 invariants (enforced by tests):
 *   AC-01: every RawImportFact + HeaderImportFact produces exactly one
 *     ImportResolution; no import is silently dropped.
 *   AC-11: resolver is pure over PipelineState (no mutation; idempotent across
 *     runs on identical input).
 *   AC-12: pass 1 completes for ALL files before pass 2 begins for ANY file.
 *   AC-13: export-table builder consumes RawExportFact[] without filtering or
 *     normalization beyond what Phase 2 already applied — Phase 2.5's @exports
 *     cross-check and Phase 3's stale-import check therefore see the SAME
 *     export set.
 *   AC-14: NO call resolution work in Phase 3 (Phase 4 boundary).
 */

import type { PipelineState, RawImportFact, RawExportFact, HeaderImportFact } from './types.js';

/**
 * Classification of a single resolved import binding. Every RawImportFact
 * specifier and every HeaderImportFact yields exactly one record carrying one
 * of these kinds.
 *
 *   resolved   — module resolved to a project file AND the imported symbol
 *                exists in that file's export table.
 *   unresolved — bare specifier not in package.json AND not under
 *                node_modules (drift between code and manifest), OR a relative
 *                specifier that points to a file the resolver could not match,
 *                OR a re-export cycle.
 *   external   — bare specifier present in package.json deps OR resolvable
 *                under node_modules.
 *   ambiguous  — currently reserved; emitted when two or more candidate
 *                origins tie. Phase 3 does not produce this kind by default
 *                (the kind exists so AC-01's enumeration stays exhaustive).
 *   dynamic    — RawImportFact.dynamic === true (`import('./x')`); the
 *                module/symbol pair is recorded but not bound to a graph edge.
 *   typeOnly   — RawImportFact.typeOnly === true (`import type {...}`); a
 *                resolution is computed but no graph edge is emitted.
 *   stale      — HeaderImportFact only: module resolved but the symbol is NOT
 *                in that module's export table. Indicates the @imports header
 *                is out of sync with the actual exports.
 */
export type ImportResolutionKind =
  | 'resolved'
  | 'unresolved'
  | 'external'
  | 'ambiguous'
  | 'dynamic'
  | 'typeOnly'
  | 'stale';

/**
 * Per-binding resolution record. Every `import { foo as bar } from './x'`
 * specifier produces ONE ImportResolution; every HeaderImportFact produces
 * ONE ImportResolution. The arity is exact — duplicates are not introduced
 * and bindings are not silently dropped.
 */
export interface ImportResolution {
  /** Source file containing the import statement (or @imports header). */
  sourceFile: string;
  /**
   * codeRefId of the importer element when the binding lives inside a typed
   * element scope, otherwise null. Phase 3 emits graph edges using this as
   * the source endpoint when kind === 'resolved'.
   */
  importerCodeRefId: string | null;
  /**
   * Local binding name (after `as` alias if any). For namespace imports this
   * is the namespace name; for default imports it is the local default name.
   * For HeaderImportFact this equals the symbol name.
   */
  localName: string;
  /**
   * Verbatim module specifier as it appears in source. `'./utils'`, `'react'`,
   * `'@app/foo'`, etc. For HeaderImportFact this equals the module portion
   * of `<module>:<symbol>`.
   */
  originSpecifier: string;
  /** Classification. */
  kind: ImportResolutionKind;
  /**
   * codeRefId of the resolved target element when kind === 'resolved' (and
   * for default imports). Always undefined for kinds {unresolved, external,
   * ambiguous, dynamic, typeOnly, stale}, EXCEPT a namespace import emits
   * resolvedModuleFile without a single resolvedTargetCodeRefId.
   */
  resolvedTargetCodeRefId?: string;
  /**
   * Resolved target file (relative or absolute, as carried in state.files).
   * Set for {resolved, stale, typeOnly} when the module was identifiable;
   * also set for namespace imports binding the entire module.
   */
  resolvedModuleFile?: string;
  /**
   * Candidate codeRefIds when kind === 'ambiguous'. Reserved field; Phase 3
   * emits ambiguous resolutions only when two valid origins tie.
   */
  candidates?: string[];
  /**
   * Structured reason for non-resolved kinds. Examples:
   *   'not_in_manifest_or_node_modules'   (unresolved bare)
   *   'relative_target_not_in_project'    (unresolved relative)
   *   'reexport_cycle'                    (unresolved reexport chain)
   *   'symbol_not_in_module_exports'      (stale header)
   *   'dynamic_import'                    (dynamic kind)
   *   'type_only_import'                  (typeOnly kind)
   */
  reason?: string;
}

/**
 * One row of an export table. `kind` distinguishes how the symbol was
 * exported; `originCodeRefId` is the canonical codeRefId of the underlying
 * element. For re-exports, `originCodeRefId` is filled by chain-following in
 * pass 1 (resolveTransitiveReExport) and points at the upstream origin, NOT
 * the re-exporter.
 */
export interface ExportTableEntry {
  exportedName: string;
  /** codeRefId of the underlying source element. */
  originCodeRefId: string;
  kind: 'named' | 'default' | 'namespace' | 'reExport';
  /** For kind === 'reExport': the source module the symbol came from. */
  viaModule?: string;
}

/** Per-module export table. Outer key = module file; inner key = exported name. */
export type ExportTable = Map<string, Map<string, ExportTableEntry>>;

/**
 * Entry point. Drives pass 1 then pass 2 and returns every ImportResolution
 * the file set produced. Caller is responsible for writing the result onto
 * state.importResolutions and emitting graph edges for kind === 'resolved'.
 *
 * AC-12: pass 1 completes fully before pass 2 begins. The implementation
 * MUST NOT interleave the two passes.
 */
export function resolveImports(_state: PipelineState): ImportResolution[] {
  // Implementation lands in tasks 1.6 (pass 1) and 1.7 (pass 2).
  return [];
}

/**
 * Pass 1 — group RawExportFact[] by sourceFile into a Map<file, Map<name,
 * ExportTableEntry>>. Re-exports get their viaModule resolved and their
 * originCodeRefId backfilled by chain-following (resolveTransitiveReExport).
 *
 * AC-13: this builder consumes RawExportFact[] verbatim — no filtering or
 * normalization beyond what Phase 2 already applied.
 *
 * Public for testability of the cross-phase consistency invariant (test
 * 1.22 calls it directly).
 */
export function buildExportTables(_state: PipelineState): ExportTable {
  // Implementation lands in task 1.6.
  return new Map();
}

/**
 * Pass 2 (AST imports) — for every RawImportFact, resolve module specifier,
 * iterate specifiers + defaultImport + namespaceImport, emit one
 * ImportResolution per binding. Skips file IO entirely; every existence
 * check is against state.files.
 *
 * Public for testability of the two-pass ordering invariant (test 1.21
 * instruments addEntry vs lookupExport call ordering across both passes).
 */
export function resolveAstImports(
  _state: PipelineState,
  _exportTables: ExportTable,
): ImportResolution[] {
  // Implementation lands in task 1.7.
  return [];
}

/**
 * Pass 2 (header imports) — for every HeaderImportFact, resolve module the
 * SAME way as resolveAstImports does (AC-10) and look up symbol in the
 * resolved module's export table. Missing symbol → kind === 'stale'.
 */
export function resolveHeaderImports(
  _state: PipelineState,
  _exportTables: ExportTable,
): ImportResolution[] {
  // Implementation lands in task 1.7.
  return [];
}

/**
 * Classify a bare specifier (no leading `./` or `../`) as either external or
 * unresolved. Per DR-PHASE-3-A: present in package.json deps/devDeps/
 * peerDeps/optionalDeps OR resolvable under node_modules → external; neither
 * → unresolved (surfaces drift between code and manifest, AC-04).
 *
 * Implementation reads package.json ONCE at start of buildExportTables and
 * caches; this function is pure over the cached lookup set.
 */
export function classifyBareSpecifier(
  _specifier: string,
  _externalSet: ReadonlySet<string>,
): ImportResolutionKind {
  // Implementation lands in task 1.8.
  return 'unresolved';
}

/**
 * Resolve an `export { foo } from './bar'` or `export * from './bar'` chain
 * to the underlying origin codeRefId in the upstream module. Maintains a
 * visited set across the chain; cycles return undefined (caller produces
 * kind='unresolved' with reason='reexport_cycle').
 */
export function resolveTransitiveReExport(
  _exportTables: ExportTable,
  _startModule: string,
  _exportedName: string,
  _visited?: Set<string>,
): ExportTableEntry | undefined {
  // Implementation lands in task 1.9.
  return undefined;
}

/**
 * Resolve a module specifier against the set of project files. Order of
 * precedence (AC-05, DR-PHASE-3-B):
 *   1. tsconfig.json compilerOptions.paths match (when paths field exists)
 *   2. relative-path match (`./x`, `../y`) with extensionless and index
 *      probing (`.ts`, `.tsx`, `.js`, `.jsx`, `/index.{ts,tsx,...}`)
 *   3. bare specifier → classifyBareSpecifier (external vs unresolved)
 *
 * Returns the resolved file path on success, or undefined when the specifier
 * is bare (caller handles via classifyBareSpecifier) or unresolvable.
 */
export function resolveModuleSpecifier(
  _specifier: string,
  _importerFile: string,
  _projectFiles: ReadonlySet<string>,
  _pathsMap: ReadonlyMap<string, string[]>,
): string | undefined {
  // Implementation lands in task 1.7.
  return undefined;
}
