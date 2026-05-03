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

import * as fs from 'fs';
import * as path from 'path';
import type {
  PipelineState,
  RawImportFact,
  RawExportFact,
  HeaderImportFact,
} from './types.js';
import type { ElementData } from '../types/types.js';
import { createCodeRefId } from '../utils/coderef-id.js';

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

const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx'] as const;
const PROJECT_FILE_KEY_SEP = '\u0000';

/**
 * Entry point. Drives pass 1 then pass 2 and returns every ImportResolution
 * the file set produced. Caller is responsible for writing the result onto
 * state.importResolutions and emitting graph edges for kind === 'resolved'.
 *
 * AC-12: pass 1 completes fully before pass 2 begins. The implementation
 * MUST NOT interleave the two passes.
 */
export function resolveImports(state: PipelineState): ImportResolution[] {
  // Pass 1: build export tables (and load tsconfig + package.json once).
  const exportTables = buildExportTables(state);
  const externalSet = loadExternalSet(state.projectPath);
  const pathsMap = loadTsconfigPaths(state.projectPath);
  const projectFiles = collectProjectFiles(state);

  // Pass 2: resolve AST imports + header imports against the export tables.
  const astResolutions = resolveAstImportsInternal(
    state,
    exportTables,
    externalSet,
    pathsMap,
    projectFiles,
  );
  const headerResolutions = resolveHeaderImportsInternal(
    state,
    exportTables,
    externalSet,
    pathsMap,
    projectFiles,
  );

  return [...astResolutions, ...headerResolutions];
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
export function buildExportTables(state: PipelineState): ExportTable {
  const elementByLocalName = indexElementsByFileAndLocalName(state.elements, state.projectPath);
  const projectFiles = collectProjectFiles(state);
  const pathsMap = loadTsconfigPaths(state.projectPath);
  const tables: ExportTable = new Map();

  for (const fact of state.rawExports) {
    let perFile = tables.get(fact.sourceFile);
    if (!perFile) {
      perFile = new Map();
      tables.set(fact.sourceFile, perFile);
    }

    if (fact.kind === 'reexport' || fact.kind === 'namespace') {
      // originCodeRefId for reexports is filled lazily during lookup
      // (resolveTransitiveReExport chases the chain). Pre-resolve viaModule
      // (verbatim specifier) to an absolute file path so chain-following
      // doesn't need to redo the resolution for every consumer.
      const resolvedVia = fact.viaModule
        ? resolveModuleSpecifier(
            fact.viaModule,
            fact.sourceFile,
            projectFiles,
            pathsMap,
            state.projectPath,
          )
        : undefined;
      perFile.set(fact.exportedName, {
        exportedName: fact.exportedName,
        originCodeRefId: '',
        kind: fact.kind === 'namespace' ? 'namespace' : 'reExport',
        viaModule: resolvedVia ?? fact.viaModule,
      });
      continue;
    }

    // named / default — origin is the local element in this file.
    const codeRefId = elementByLocalName.get(elementKey(fact.sourceFile, fact.localName))
      // Default exports may name 'default' as the localName when no
      // identifier was attached (e.g., `export default 42`). Fall back to
      // the file-grain element with the matching exportedName.
      ?? elementByLocalName.get(elementKey(fact.sourceFile, fact.exportedName))
      ?? '';
    perFile.set(fact.exportedName, {
      exportedName: fact.exportedName,
      originCodeRefId: codeRefId,
      kind: fact.kind === 'default' ? 'default' : 'named',
    });
  }

  return tables;
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
  state: PipelineState,
  exportTables: ExportTable,
): ImportResolution[] {
  const externalSet = loadExternalSet(state.projectPath);
  const pathsMap = loadTsconfigPaths(state.projectPath);
  const projectFiles = collectProjectFiles(state);
  return resolveAstImportsInternal(state, exportTables, externalSet, pathsMap, projectFiles);
}

/**
 * Pass 2 (header imports) — for every HeaderImportFact, resolve module the
 * SAME way as resolveAstImports does (AC-10) and look up symbol in the
 * resolved module's export table. Missing symbol → kind === 'stale'.
 */
export function resolveHeaderImports(
  state: PipelineState,
  exportTables: ExportTable,
): ImportResolution[] {
  const externalSet = loadExternalSet(state.projectPath);
  const pathsMap = loadTsconfigPaths(state.projectPath);
  const projectFiles = collectProjectFiles(state);
  return resolveHeaderImportsInternal(state, exportTables, externalSet, pathsMap, projectFiles);
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
  specifier: string,
  externalSet: ReadonlySet<string>,
): ImportResolutionKind {
  // Bare specifier may be `lodash` or scoped `@scope/pkg` or
  // `lodash/fp/get`. The package portion is up to (and including) the
  // first slash for unscoped, or the second slash for scoped.
  const pkg = extractPackageName(specifier);
  return externalSet.has(pkg) ? 'external' : 'unresolved';
}

/**
 * Resolve an `export { foo } from './bar'` or `export * from './bar'` chain
 * to the underlying origin codeRefId in the upstream module. Maintains a
 * visited set across the chain; cycles return undefined (caller produces
 * kind='unresolved' with reason='reexport_cycle').
 */
export function resolveTransitiveReExport(
  exportTables: ExportTable,
  startModule: string,
  exportedName: string,
  visited: Set<string> = new Set(),
): ExportTableEntry | undefined {
  const visitKey = `${startModule}${PROJECT_FILE_KEY_SEP}${exportedName}`;
  if (visited.has(visitKey)) return undefined;
  visited.add(visitKey);

  const table = exportTables.get(startModule);
  if (!table) return undefined;

  // Look for a direct match first.
  const direct = table.get(exportedName);
  if (direct && direct.kind !== 'reExport' && direct.kind !== 'namespace') {
    return direct;
  }
  if (direct && (direct.kind === 'reExport' || direct.kind === 'namespace') && direct.viaModule) {
    // Resolve via the upstream module. Translation from specifier to
    // upstream-module file path requires resolveModuleSpecifier; the caller
    // (resolveAstImportsInternal) holds the projectFiles set. We instead
    // expose this function and let the caller resolve viaModule first, so
    // here we recurse via the LOCAL key only when the upstream is already
    // a key in exportTables.
    if (exportTables.has(direct.viaModule)) {
      return resolveTransitiveReExport(exportTables, direct.viaModule, exportedName, visited);
    }
  }

  // `export * from './bar'` — wildcard re-export. The fact carries
  // exportedName='*'. Look it up in the local table; if found and the
  // upstream module is in exportTables, recurse for the requested name.
  const wildcard = table.get('*');
  if (wildcard && wildcard.viaModule && exportTables.has(wildcard.viaModule)) {
    return resolveTransitiveReExport(exportTables, wildcard.viaModule, exportedName, visited);
  }

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
  specifier: string,
  importerFile: string,
  projectFiles: ReadonlySet<string>,
  pathsMap: ReadonlyMap<string, string[]>,
  projectPath?: string,
): string | undefined {
  // 1. tsconfig paths take precedence (DR-PHASE-3-B). Targets are
  // project-relative POSIX (resolved at load time via baseUrl); join with
  // projectPath to get absolute candidates the projectFiles set carries.
  const aliasMatch = matchTsconfigPaths(specifier, pathsMap);
  if (aliasMatch && projectPath) {
    for (const candidate of aliasMatch) {
      const absCandidate = path.resolve(projectPath, candidate);
      const resolved = probeRelative(toPosix(absCandidate), projectFiles);
      if (resolved) return resolved;
    }
  }

  // 2. Relative specifier — `./x`, `../y`.
  if (specifier.startsWith('./') || specifier.startsWith('../') || specifier === '.' || specifier === '..') {
    const importerDir = path.posix.dirname(toPosix(importerFile));
    const joined = path.posix.normalize(path.posix.join(importerDir, specifier));
    return probeRelative(joined, projectFiles);
  }

  // 3. Absolute specifier within project (rare in TS but possible).
  if (path.isAbsolute(specifier)) {
    return probeRelative(toPosix(specifier), projectFiles);
  }

  // Bare specifier — caller handles via classifyBareSpecifier.
  return undefined;
}

// ============================================================================
// Internal helpers
// ============================================================================

function resolveAstImportsInternal(
  state: PipelineState,
  exportTables: ExportTable,
  externalSet: ReadonlySet<string>,
  pathsMap: ReadonlyMap<string, string[]>,
  projectFiles: ReadonlySet<string>,
): ImportResolution[] {
  const out: ImportResolution[] = [];
  const elementByFile = indexElementsByFile(state.elements);

  for (const fact of state.rawImports) {
    const importerCodeRefId = fact.sourceElementId;

    // Dynamic / type-only imports get a single-record disposition without
    // per-specifier expansion: there are no specifiers/defaultImport/
    // namespaceImport bindings to resolve in those cases (specifiers may
    // technically appear with `import type {...}`, but per AC contract the
    // kind is 'typeOnly' uniformly per fact).
    if (fact.dynamic) {
      out.push({
        sourceFile: fact.sourceFile,
        importerCodeRefId,
        localName: fact.namespaceImport ?? fact.defaultImport ?? '*',
        originSpecifier: fact.moduleSpecifier,
        kind: 'dynamic',
        reason: 'dynamic_import',
      });
      continue;
    }

    const moduleFile = resolveModuleSpecifier(
      fact.moduleSpecifier,
      fact.sourceFile,
      projectFiles,
      pathsMap,
      state.projectPath,
    );

    // Bindings to emit: each named specifier, plus default (if any), plus
    // namespace (if any). Empty specifiers + no default + no namespace +
    // `import './x'` (side-effect only) — emit ONE record carrying the
    // module-level resolution so the import is not silently dropped.
    const bindings: Array<{ localName: string; imported: string | null; kind: 'named' | 'default' | 'namespace' | 'side-effect' }> = [];
    for (const spec of fact.specifiers) {
      bindings.push({ localName: spec.local, imported: spec.imported, kind: 'named' });
    }
    if (fact.defaultImport) {
      bindings.push({ localName: fact.defaultImport, imported: 'default', kind: 'default' });
    }
    if (fact.namespaceImport) {
      bindings.push({ localName: fact.namespaceImport, imported: '*', kind: 'namespace' });
    }
    if (bindings.length === 0) {
      bindings.push({ localName: '', imported: null, kind: 'side-effect' });
    }

    for (const binding of bindings) {
      const base: ImportResolution = {
        sourceFile: fact.sourceFile,
        importerCodeRefId,
        localName: binding.localName,
        originSpecifier: fact.moduleSpecifier,
        kind: 'unresolved',
      };

      if (fact.typeOnly) {
        base.kind = 'typeOnly';
        base.reason = 'type_only_import';
        if (moduleFile) base.resolvedModuleFile = moduleFile;
        out.push(base);
        continue;
      }

      if (!moduleFile) {
        // Bare or unresolved specifier.
        if (isBareSpecifier(fact.moduleSpecifier)) {
          base.kind = classifyBareSpecifier(fact.moduleSpecifier, externalSet);
          if (base.kind === 'unresolved') base.reason = 'not_in_manifest_or_node_modules';
        } else {
          base.kind = 'unresolved';
          base.reason = 'relative_target_not_in_project';
        }
        out.push(base);
        continue;
      }

      base.resolvedModuleFile = moduleFile;

      if (binding.kind === 'namespace') {
        // Namespace import binds local name to the entire module — no single
        // resolvedTargetCodeRefId. Mark as resolved if the module exists.
        base.kind = 'resolved';
        // Bind to the module-level element: the file's own element if any.
        const fileElems = elementByFile.get(moduleFile);
        if (fileElems && fileElems.length > 0) {
          const elem = fileElems[0];
          base.resolvedTargetCodeRefId = elem.codeRefId
            ?? createCodeRefId(elem, state.projectPath, { includeLine: true });
        }
        out.push(base);
        continue;
      }

      if (binding.kind === 'side-effect') {
        base.kind = 'resolved';
        out.push(base);
        continue;
      }

      // Named or default binding — look up imported name in the resolved
      // module's export table; chase re-exports.
      const exportedName = binding.imported!;
      const entry = lookupExport(exportTables, moduleFile, exportedName);
      if (entry) {
        // Symbol is in the export table. Even if originCodeRefId is empty
        // (element wasn't extracted, e.g. plain `export const x = 1` in
        // minimal mode), the import is still resolved at the module level.
        base.kind = 'resolved';
        if (entry.originCodeRefId) base.resolvedTargetCodeRefId = entry.originCodeRefId;
        out.push(base);
      } else {
        base.kind = 'unresolved';
        base.reason = 'symbol_not_in_module_exports';
        out.push(base);
      }
    }
  }

  return out;
}

function resolveHeaderImportsInternal(
  state: PipelineState,
  exportTables: ExportTable,
  externalSet: ReadonlySet<string>,
  pathsMap: ReadonlyMap<string, string[]>,
  projectFiles: ReadonlySet<string>,
): ImportResolution[] {
  const out: ImportResolution[] = [];
  const fileToImporter = indexImporterByFile(state.elements, state.projectPath);

  for (const fact of state.headerImportFacts) {
    const importerCodeRefId = fileToImporter.get(fact.sourceFile) ?? null;
    const moduleFile = resolveModuleSpecifier(
      fact.module,
      fact.sourceFile,
      projectFiles,
      pathsMap,
      state.projectPath,
    );

    const base: ImportResolution = {
      sourceFile: fact.sourceFile,
      importerCodeRefId,
      localName: fact.symbol,
      originSpecifier: fact.module,
      kind: 'unresolved',
    };

    if (!moduleFile) {
      if (isBareSpecifier(fact.module)) {
        base.kind = classifyBareSpecifier(fact.module, externalSet);
        if (base.kind === 'unresolved') base.reason = 'not_in_manifest_or_node_modules';
      } else {
        base.kind = 'unresolved';
        base.reason = 'relative_target_not_in_project';
      }
      out.push(base);
      continue;
    }

    base.resolvedModuleFile = moduleFile;
    const entry = lookupExport(exportTables, moduleFile, fact.symbol);
    if (entry) {
      base.kind = 'resolved';
      if (entry.originCodeRefId) base.resolvedTargetCodeRefId = entry.originCodeRefId;
    } else {
      // Module resolved but symbol not in its export table — header is
      // stale per AC-10.
      base.kind = 'stale';
      base.reason = 'symbol_not_in_module_exports';
    }
    out.push(base);
  }

  return out;
}

/**
 * Look up `exportedName` in `moduleFile`'s export table, chasing re-export
 * chains via resolveTransitiveReExport. Returns undefined when the name is
 * not present in any module along the chain (caller treats as unresolved /
 * stale per the import context).
 */
function lookupExport(
  exportTables: ExportTable,
  moduleFile: string,
  exportedName: string,
): ExportTableEntry | undefined {
  const table = exportTables.get(moduleFile);
  if (!table) return undefined;

  const direct = table.get(exportedName);
  if (direct && direct.kind !== 'reExport' && direct.kind !== 'namespace') {
    return direct;
  }

  // Re-export chain or wildcard.
  return resolveTransitiveReExport(exportTables, moduleFile, exportedName);
}

function indexElementsByFileAndLocalName(
  elements: ElementData[],
  projectPath: string,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const elem of elements) {
    const codeRefId = elem.codeRefId ?? createCodeRefId(elem, projectPath, { includeLine: true });
    const key = elementKey(elem.file, elem.name);
    if (!out.has(key)) out.set(key, codeRefId);
  }
  return out;
}

function indexElementsByFile(elements: ElementData[]): Map<string, ElementData[]> {
  const out = new Map<string, ElementData[]>();
  for (const elem of elements) {
    const list = out.get(elem.file);
    if (list) list.push(elem);
    else out.set(elem.file, [elem]);
  }
  return out;
}

function indexImporterByFile(
  elements: ElementData[],
  projectPath: string,
): Map<string, string | null> {
  const out = new Map<string, string | null>();
  for (const elem of elements) {
    if (!out.has(elem.file)) {
      const codeRefId = elem.codeRefId ?? createCodeRefId(elem, projectPath, { includeLine: true });
      out.set(elem.file, codeRefId);
    }
  }
  return out;
}

function elementKey(file: string, name: string): string {
  return `${file}${PROJECT_FILE_KEY_SEP}${name}`;
}

function collectProjectFiles(state: PipelineState): Set<string> {
  const out = new Set<string>();
  for (const filePaths of state.files.values()) {
    for (const fp of filePaths) {
      out.add(fp);
      // Also index by POSIX-normalized path for Windows compat.
      out.add(toPosix(fp));
    }
  }
  return out;
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function isBareSpecifier(specifier: string): boolean {
  return !specifier.startsWith('./') && !specifier.startsWith('../') && !path.isAbsolute(specifier);
}

function extractPackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.slice(0, 2).join('/');
  }
  const slash = specifier.indexOf('/');
  return slash === -1 ? specifier : specifier.slice(0, slash);
}

/**
 * Probe a relative-resolved path against the project file set. Tries the
 * exact path first, then extensionless probing (.ts/.tsx/.js/.jsx), then
 * index-file probing.
 */
function probeRelative(
  candidatePosix: string,
  projectFiles: ReadonlySet<string>,
): string | undefined {
  // Exact match (already has extension).
  if (projectFiles.has(candidatePosix)) return projectFilesCanonical(projectFiles, candidatePosix);
  // Try with each known source extension.
  for (const ext of SOURCE_EXTS) {
    const probe = `${candidatePosix}${ext}`;
    if (projectFiles.has(probe)) return projectFilesCanonical(projectFiles, probe);
  }
  // Try as directory index.
  for (const ext of SOURCE_EXTS) {
    const probe = `${candidatePosix}/index${ext}`;
    if (projectFiles.has(probe)) return projectFilesCanonical(projectFiles, probe);
  }
  return undefined;
}

/**
 * Given a probe key that hit projectFiles, return the canonical (non-POSIX)
 * file key — the key the rest of the pipeline uses (which is whatever the
 * scanner emitted, typically a Windows-native or POSIX path). Project files
 * are double-indexed (native + POSIX) so the same probe matches either; we
 * prefer the non-POSIX form when both exist.
 */
function projectFilesCanonical(projectFiles: ReadonlySet<string>, probe: string): string {
  // If the probe contains backslashes already, return as-is. Otherwise,
  // search for a matching native form.
  if (probe.includes('\\')) return probe;
  const native = probe.split('/').join(path.sep);
  if (projectFiles.has(native)) return native;
  return probe;
}

function matchTsconfigPaths(
  specifier: string,
  pathsMap: ReadonlyMap<string, string[]>,
): string[] | undefined {
  for (const [pattern, targets] of pathsMap) {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -1); // keep trailing '/'
      if (specifier.startsWith(prefix)) {
        const tail = specifier.slice(prefix.length);
        return targets.map(t => t.endsWith('/*') ? t.slice(0, -1) + tail : t);
      }
    } else if (pattern === specifier) {
      return [...targets];
    }
  }
  return undefined;
}

/**
 * Read tsconfig.json compilerOptions.paths into a Map<pattern, targets[]>.
 * Returns an empty map when tsconfig is missing, malformed, or has no paths.
 * Reads the file synchronously ONCE per resolveImports call; pass-2 hot
 * paths never touch fs after this returns.
 */
function loadTsconfigPaths(projectPath: string): ReadonlyMap<string, string[]> {
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  try {
    const raw = fs.readFileSync(tsconfigPath, 'utf-8');
    const parsed = JSON.parse(stripJsonComments(raw));
    const paths = parsed?.compilerOptions?.paths as Record<string, string[]> | undefined;
    if (!paths || typeof paths !== 'object') return new Map();
    const baseUrl = (parsed?.compilerOptions?.baseUrl as string | undefined) ?? '.';
    const baseAbs = path.resolve(projectPath, baseUrl);
    const out = new Map<string, string[]>();
    for (const [pattern, targets] of Object.entries(paths)) {
      const resolvedTargets = targets.map(t => {
        const abs = path.resolve(baseAbs, t);
        const rel = path.relative(projectPath, abs);
        return toPosix(rel);
      });
      out.set(pattern, resolvedTargets);
    }
    return out;
  } catch {
    return new Map();
  }
}

/**
 * Read package.json once; collect every package name from
 * dependencies/devDependencies/peerDependencies/optionalDependencies AND every
 * top-level package directory under node_modules. Used by
 * classifyBareSpecifier for the external/unresolved decision (DR-PHASE-3-A,
 * AC-03/AC-04).
 */
function loadExternalSet(projectPath: string): ReadonlySet<string> {
  const out = new Set<string>();
  const pkgPath = path.join(projectPath, 'package.json');
  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const block = parsed?.[field] as Record<string, string> | undefined;
      if (block && typeof block === 'object') {
        for (const name of Object.keys(block)) out.add(name);
      }
    }
  } catch {
    // package.json missing or malformed — only node_modules contributes.
  }

  const nmDir = path.join(projectPath, 'node_modules');
  try {
    const entries = fs.readdirSync(nmDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (name.startsWith('.')) continue;
      if (name.startsWith('@')) {
        // Scoped packages: @scope/name.
        try {
          const scopeEntries = fs.readdirSync(path.join(nmDir, name), { withFileTypes: true });
          for (const sub of scopeEntries) {
            if (sub.isDirectory()) out.add(`${name}/${sub.name}`);
          }
        } catch { /* skip unreadable scope */ }
      } else {
        out.add(name);
      }
    }
  } catch {
    // node_modules missing — only manifest contributes.
  }

  return out;
}

/**
 * Strip `// ...` and `/* ... *\/` comments from a JSON string. tsconfig.json
 * commonly has comments that JSON.parse rejects.
 */
function stripJsonComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}
