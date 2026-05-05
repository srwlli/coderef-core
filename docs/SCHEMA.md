# CodeRef Core Schema Reference

**Last updated:** 2026-05-05 (Phase 8 — pipeline rebuild close)
**Status:** post-rebuild canonical reference (Phases 0–7 archived)

This document is the canonical schema reference for `@coderef/core` after the 9-phase pipeline rebuild. It covers the four schema families produced by the pipeline:

1. **Scanner schema** — `ElementData` (per-element record after raw scanning + Phase 1 + Phase 2.5 enrichment)
2. **Relationship schema** — raw fact types (Phase 2) and resolved relationships (Phase 3 + Phase 4)
3. **Resolution statuses** — `ImportResolutionKind`, `CallResolutionKind`, `EdgeResolutionStatus`
4. **Graph schema** — `GraphEdgeV2` (8-field edge), `EdgeEvidence` (10-variant union), `GraphNode` shape (with Phase 7 facet propagation), `ExportedGraph`

Header grammar (`@coderef-semantic:1.0.0` block) is canonical in the ASSISTANT repo and mirrored at [docs/HEADER-GRAMMAR.md](./HEADER-GRAMMAR.md). Public API contract is at [docs/API.md](./API.md). Agent usage contract is at [/AGENTS.md](../AGENTS.md).

---

## 1. Scanner Schema

### ElementData

Truth source: `src/types/types.ts` (interface `ElementData`, lines 304–412).

```typescript
interface ElementData {
  // Core identity (Phase 0)
  type: 'function' | 'class' | 'component' | 'hook' | 'method'
      | 'constant' | 'interface' | 'type' | 'decorator' | 'property' | 'unknown';
  name: string;
  file: string;
  line: number;

  // Canonical CodeRef IDs (Phase 1: scanner identity & taxonomy)
  /** Canonical CodeRef ID, line-anchored: @Fn/src/file.ts#name:12 */
  codeRefId?: string;
  /** Stable CodeRef ID without line anchoring: @Fn/src/file.ts#name */
  codeRefIdNoLine?: string;

  // Phase 1 / Phase 2.5 semantic facets (file-grain)
  /** File-grain semantic layer; values from ASSISTANT/STANDARDS/layers.json. */
  layer?: LayerEnum;
  /** File-grain semantic capability slug; kebab-case. */
  capability?: string;
  /** File-grain semantic constraints; each entry kebab-case. */
  constraints?: string[];
  /** Semantic header parser status. Normalized scanner output defaults this to "missing". */
  headerStatus?: 'defined' | 'missing' | 'stale' | 'partial';

  // Phase 2.5: parsed semantic header reference
  /** Reference to the parsed @coderef-semantic block for this element's source file.
   *  All elements in the same file share the same HeaderFact reference. Undefined when
   *  no header was detected. */
  headerFact?: HeaderFact;

  // Phase 4 relationship tracking (legacy — Phase 2/3/4 raw + resolved arrays
  // on PipelineState are now canonical for downstream consumers)
  exported?: boolean;
  parameters?: string[] | Array<{ name: string; type?: string }>;
  calls?: string[];
  imports?: Array<{
    source: string;
    specifiers?: string[];
    default?: string;
    namespace?: string;
    dynamic?: boolean;
    line: number;
  }>;
  dependencies?: string[];
  calledBy?: string[];

  // Optional enrichment (tree-sitter, route detection, frontend calls)
  route?: RouteMetadata;
  frontendCall?: FrontendCall;
  returnType?: string;
  async?: boolean;
  decorators?: string[];
  docstring?: string;
  parentScope?: string;
  complexity?: { cyclomatic: number; nestingDepth: number };
  metadata?: Record<string, any>;

  // WO-CODEREF-SEMANTIC-INTEGRATION-001 (Phase 1 semantic fields)
  exports?: Array<{ name: string; type?: 'default' | 'named'; target?: string }>;
  usedBy?: Array<{ file: string; imports?: string[]; line?: number }>;
  related?: Array<{ file: string; reason?: string; confidence?: number }>;
  rules?: Array<{ rule: string; description?: string; severity?: 'error' | 'warning' | 'info' }>;
}
```

**LayerEnum** — 13 canonical layer values, sourced from `ASSISTANT/STANDARDS/layers.json` (CORE never forks the enum):

```
ui_component | service | utility | data_access | api | integration | domain
| validation | parser | formatter | cli | configuration | test_support
```

**Validation rules (enforced by Phase 6 chokepoint):**

- `name`, `file`, `line`, `type` are required.
- `layer` (when present) must be in the LayerEnum above.
- `capability`, individual `constraints` items must match `^[a-z][a-z0-9-]*$` (kebab-case).
- `headerStatus` defaults to `'missing'` for files without a parsed header.

### PipelineState

Truth source: `src/pipeline/types.ts` (interface `PipelineState`, lines 94–163).

`PipelineState` is **internal pipeline plumbing**, not a downstream consumer surface. Agents should NOT read it. Downstream consumers read the exported artifacts (`ExportedGraph`, `ValidationResult`, `IndexingResult`) instead.

`PipelineState` fields produced by each phase:

| Phase | Fields |
|------:|--------|
| 0 | `projectPath`, `files`, `sources`, `options`, `metadata` |
| 1 | `elements: ElementData[]` (with codeRefId / codeRefIdNoLine) |
| 2 | `rawImports: RawImportFact[]`, `rawCalls: RawCallFact[]`, `rawExports: RawExportFact[]` |
| 2.5 | `headerFacts: Map<file, HeaderFact>`, `headerImportFacts: HeaderImportFact[]`, `headerParseErrors: HeaderParseError[]` |
| 3 | `importResolutions: ImportResolution[]` |
| 4 | `callResolutions: CallResolution[]` |
| 5 | `graph: ExportedGraph` |

The legacy `imports: ImportRelationship[]` and `calls: CallRelationship[]` fields are kept additive during the transition; new code reads `rawImports` / `rawCalls` instead.

---

## 2. Relationship Schema

### Raw facts (Phase 2)

Truth source: `src/pipeline/types.ts` (lines 274–352) and `src/pipeline/extractors/relationship-extractor.ts`.

Raw facts are **unresolved** by design. Endpoints are NEVER graph node IDs. Resolution into edges happens in Phase 3 (imports) and Phase 4 (calls).

#### `RawImportFact`

One per import statement. Captures every binding produced (named, default, namespace, dynamic) without resolving the module specifier or the imported symbols.

```typescript
interface RawImportFact {
  sourceElementId: string | null;   // codeRefId of enclosing element if scoped
  sourceFile: string;
  moduleSpecifier: string;          // verbatim, e.g. './utils', 'react'
  specifiers: RawImportSpecifier[]; // named-import bindings (with `as` aliases)
  defaultImport: string | null;
  namespaceImport: string | null;   // `import * as ns`
  typeOnly: boolean;                // TS `import type`
  dynamic: boolean;                 // `import('module')` call
  line: number;
}

interface RawImportSpecifier {
  imported: string;  // exported name in source module
  local: string;     // local binding (= imported when no `as`)
}
```

#### `RawCallFact`

One per call expression. Method calls keep the receiver — `obj.save()` is `{ receiverText: 'obj', calleeName: 'save' }`, never bare `'save'`.

```typescript
interface RawCallFact {
  sourceElementCandidate: string | null; // codeRefId of enclosing element when bindable
  sourceFile: string;
  callExpressionText: string;            // full source slice
  calleeName: string;                    // trailing identifier
  receiverText: string | null;           // `obj` in `obj.method()`, or null
  scopePath: string[];                   // e.g. ['MyClass', 'myMethod']
  line: number;
  language: string;                      // 'ts' | 'js' | 'py' | ...
}
```

#### `RawExportFact`

Single canonical record of a name being exported from a file. Replaces duplicated export tracking that previously lived on `ElementData.exported` and the legacy projection seam.

```typescript
type RawExportKind = 'named' | 'default' | 'reexport' | 'namespace';

interface RawExportFact {
  sourceFile: string;
  exportedName: string;          // as seen by importers (after `as`)
  localName: string;             // local binding in source file
  kind: RawExportKind;
  line: number;
  viaModule?: string;            // for kind='reexport' or 'namespace'
}
```

#### Header-derived facts (Phase 2.5)

Truth source: `src/pipeline/header-fact.ts`.

`HeaderFact` records the parsed `@coderef-semantic:1.0.0` block (if present) for a source file. `HeaderImportFact[]` is the canonical structured list of header-declared imports — distinct from the AST-derived `RawImportFact[]` because headers can declare imports the AST doesn't see. Phase 3 resolves both into `ImportResolution[]`.

### Resolved relationships (Phase 3 + Phase 4)

Truth sources: `src/pipeline/import-resolver.ts`, `src/pipeline/call-resolver.ts`.

Resolved relationships are the per-binding / per-call records produced by the resolvers. Every `RawImportFact` specifier produces ONE `ImportResolution`; every `RawCallFact` produces ONE `CallResolution`. Arity is exact — duplicates are not introduced and bindings are not silently dropped.

#### `ImportResolution`

```typescript
interface ImportResolution {
  sourceFile: string;
  importerCodeRefId: string | null;
  localName: string;
  originSpecifier: string;
  kind: ImportResolutionKind;        // see § 3
  resolvedTargetCodeRefId?: string;   // present iff kind='resolved' (and default imports)
  // ... additional reason / candidates fields per kind
}
```

`ExportTable` is the per-module index of `ExportTableEntry` records that the import resolver builds during pass 1, then consumes during pass 2:

```typescript
interface ExportTableEntry {
  exportedName: string;
  originCodeRefId: string;
  kind: 'named' | 'default' | 'namespace' | 'reExport';
  viaModule?: string;
}
type ExportTable = Map<string, Map<string, ExportTableEntry>>;
```

#### `CallResolution`

```typescript
interface CallResolution {
  sourceFile: string;
  callerCodeRefId: string | null;
  calleeName: string;
  receiverText: string | null;
  scopePath: string[];
  line: number;
  kind: CallResolutionKind;          // see § 3
  resolvedTargetCodeRefId?: string;  // present iff kind='resolved'
  // ... candidates / reason fields per kind
}
```

`SymbolTable` is the lookup index Phase 4 builds from `state.elements` plus Phase 3's resolved imports:

```typescript
interface SymbolTableEntry {
  codeRefId: string;
  name: string;
  sourceFile: string;
  scope: 'file' | 'function' | 'class' | 'method' | 'imported';
  // ... enclosing-scope ref
}
type SymbolTable = Map<string, SymbolTableEntry[]>;
```

`BUILTIN_RECEIVERS` is the allowlist of receiver identifiers that classify as `kind='builtin'` (and produce NO project graph edge). Truth source: `src/pipeline/call-resolver.ts` lines 183–199. The list at this writing: `Array, Object, Promise, Map, Set, String, Number, Boolean, RegExp, Date, Error, JSON, Math, Reflect, Symbol`.

### Distinctions surfaced by the schema

The schema makes the following 7 distinctions explicit (per the rebuild's Final DoD):

| Distinction | Where it surfaces |
|-------------|-------------------|
| (a) raw extracted facts | `RawImportFact`, `RawCallFact`, `RawExportFact`, `HeaderImportFact` |
| (b) resolved relationships | `ImportResolution.kind='resolved'`, `CallResolution.kind='resolved'`, edges with `resolutionStatus='resolved'` |
| (c) unresolved relationships | `kind='unresolved'`, edges with `resolutionStatus='unresolved'` |
| (d) graph edges | `GraphEdgeV2` (8-field schema, § 4) |
| (e) header-derived edges vs AST-derived edges | `relationship='header-import'` (header-derived) vs `relationship='import'` (AST-derived) |
| (f) external dependencies | `kind='external'`, edges with `resolutionStatus='external'` |
| (g) built-ins | `kind='builtin'` (calls only), edges with `resolutionStatus='builtin'` |

---

## 3. Resolution Statuses

### `ImportResolutionKind` (7 values)

Truth source: `src/pipeline/import-resolver.ts` lines 68–75.

| Value | Meaning |
|-------|---------|
| `resolved` | Specifier matched a project export. `resolvedTargetCodeRefId` is set. Drives Phase 5 `relationship='import'` edges with `resolutionStatus='resolved'`. |
| `unresolved` | Specifier did not match anything (project, external, or built-in). Reason carried on `ImportResolution.reason`. |
| `external` | Module resolves to a known external package (e.g., `react`, `lodash`). Not chased into node_modules. |
| `ambiguous` | Multiple candidates matched; resolver could not pick one. `candidates` carries ≥2 codeRefIds. |
| `dynamic` | `import('module')` call — module specifier may be a runtime expression. Not resolved at static-analysis time. |
| `typeOnly` | TypeScript `import type` — type-level only, no runtime edge. |
| `stale` | Header-import declares a binding that the file no longer actually imports (header drift SH-2). |

### `CallResolutionKind` (5 values)

Truth source: `src/pipeline/call-resolver.ts` lines 73–78.

| Value | Meaning |
|-------|---------|
| `resolved` | Call site matched exactly one symbol in scope. `resolvedTargetCodeRefId` is set. Drives Phase 5 `relationship='call'` edges with `resolutionStatus='resolved'`. |
| `unresolved` | No symbol matched. Could be a typo, a call into untyped code, or a method on an unknown receiver. |
| `ambiguous` | Multiple matches; resolver could not pick one (per DR-PHASE-4-B). `candidates` carries ≥2 codeRefIds. |
| `external` | Receiver / callee resolves into an external package (e.g., a method on an imported library type). |
| `builtin` | Receiver is in `BUILTIN_RECEIVERS`. No project graph edge emitted. |

### `EdgeResolutionStatus` (8 values)

Truth source: `src/pipeline/graph-builder.ts` lines 77–85, mirrored on `ExportedGraph` at `src/export/graph-exporter.ts` lines 32–40.

| Value | Source |
|-------|--------|
| `resolved` | from `ImportResolutionKind='resolved'` or `CallResolutionKind='resolved'` |
| `unresolved` | from `kind='unresolved'` (also covers `kind='dynamic'` / `'typeOnly'` per DR — see EdgeEvidence reason strings) |
| `ambiguous` | from `kind='ambiguous'` |
| `external` | from `kind='external'` |
| `builtin` | from call `kind='builtin'` |
| `dynamic` | reserved; currently mapped to `unresolved` with `reason='dynamic'` |
| `typeOnly` | reserved; currently mapped to `unresolved` with `reason='typeOnly'` |
| `stale` | from header-import `kind='stale'` (SH-2 header drift) |

---

## 4. Graph Schema

### `GraphEdgeV2` (8-field canonical edge — DR-PHASE-5-D)

Truth source: `src/pipeline/graph-builder.ts` lines 127–162.

```typescript
interface GraphEdgeV2 {
  /** Required. Deterministic 16-hex hash; unique within graph. */
  id: string;
  /** Required. Canonical codeRefId of source element. */
  sourceId: string;
  /** Conditional. Canonical codeRefId of target. Present only when resolutionStatus='resolved' (DR-PHASE-5-A: omitted, not synthetic, for non-resolved). */
  targetId?: string;
  /** Required. import | call | export | header-import. */
  relationship: EdgeRelationship;
  /** Required. resolved | unresolved | ambiguous | external | builtin | dynamic | typeOnly | stale. */
  resolutionStatus: EdgeResolutionStatus;
  /** Conditional. Discriminated-union evidence (10 variants). */
  evidence?: EdgeEvidence;
  /** Conditional. {file, line} of the import/call statement. */
  sourceLocation?: { file: string; line: number };
  /** Conditional. ≥2 codeRefIds; present only when resolutionStatus='ambiguous'. */
  candidates?: string[];
  /** Reason string for non-resolved kinds. Mirrors ImportResolution / CallResolution reason. */
  reason?: string;
  // Legacy compat surface (matches ExportedGraph['edges'][number]) — populated additively
  // during the transition window. Future cleanup workorder removes these.
  source: string;
  target: string;
  type: string;
  metadata?: Record<string, unknown>;
}

type EdgeRelationship = 'import' | 'call' | 'export' | 'header-import';

type EdgeResolutionStatus =
  | 'resolved' | 'unresolved' | 'ambiguous' | 'external'
  | 'builtin' | 'dynamic' | 'typeOnly' | 'stale';
```

### `EdgeEvidence` (10-variant discriminated union)

Truth source: `src/pipeline/graph-builder.ts` lines 104–114.

```typescript
type EdgeEvidence =
  | { kind: 'resolved-import';     resolvedModuleFile: string; originSpecifier: string; localName: string }
  | { kind: 'unresolved-import';   originSpecifier: string;    reason: string }
  | { kind: 'ambiguous-import';    originSpecifier: string;    candidates: string[] }
  | { kind: 'external-import';     originSpecifier: string;    packageName?: string }
  | { kind: 'resolved-call';       calleeName: string; receiverText: string; scopePath: string }
  | { kind: 'unresolved-call';     calleeName: string; receiverText: string; reason: string }
  | { kind: 'ambiguous-call';      calleeName: string; receiverText: string; candidates: string[] }
  | { kind: 'builtin-call';        calleeName: string; receiverText: string }
  | { kind: 'header-import';       module: string; symbol: string; resolvedModuleFile?: string }
  | { kind: 'stale-header-import'; module: string; symbol: string; reason: string };
```

Phase 6's validator reads `edge.evidence.{field}` for invariant checks; the discriminator lets TypeScript enforce the shape per `(relationship, resolutionStatus)` combination at the validator boundary.

`dynamic` / `typeOnly` / `stale` (non-header) imports use the `unresolved-import` variant with appropriate `reason` strings (Phase 5 maps them to that variant rather than introducing more variants).

### `GraphNode` shape (Phase 7 facet propagation)

Truth source: `src/pipeline/graph-builder.ts` lines 233–260 (`buildNodes`).

Each `state.elements` item becomes a graph node with `id = canonical codeRefId` (AC-01). Phase 7 added facet propagation onto `metadata`:

```typescript
{
  id: string;                  // canonical codeRefId
  uuid?: string;
  type: string;
  name?: string;
  file?: string;
  line?: number;
  metadata?: {
    codeRefId: string;
    codeRefIdNoLine?: string;
    layer?: LayerEnum;         // copied from ElementData.layer iff defined
    capability?: string;       // copied from ElementData.capability iff defined
    constraints?: string[];    // copied from ElementData.constraints iff defined
    headerStatus?: 'defined' | 'missing' | 'stale' | 'partial'; // copied from ElementData.headerStatus iff defined
    [k: string]: unknown;
  };
}
```

The Phase 7 `IndexingOrchestrator` reads these `metadata.{layer, capability, constraints, headerStatus}` fields to surface semantic facets on `CodeChunk` records (file-grain worst-severity aggregation for `headerStatus`; conflict-suppression for `layer`/`capability`; union for `constraints`).

### `ExportedGraph`

Truth source: `src/export/graph-exporter.ts` lines 53+.

```typescript
interface ExportedGraph {
  version: string;
  exportedAt: number;
  nodes: GraphNode[];   // (shape per § 4 above)
  edges: GraphEdgeV2[]; // (8-field schema)
}
```

`ExportedGraph` is the canonical Phase 5 graph artifact. The legacy `DependencyGraph` projection lives behind `src/semantic/projections.ts` and is `@legacy` — new consumers read `ExportedGraph` directly.

---

## 5. Validation Report (Phase 6 contract)

Truth source: `src/pipeline/output-validator.ts` lines 110–151.

The 11-field locked `ValidationReport` is a public artifact contract — field names are LOCKED additive-only (no rename, no drop, without explicit ORCHESTRATOR sign-off). All fields are required numbers (use 0 for empty categories, never undefined / null / string).

```typescript
interface ValidationReport {
  valid_edge_count: number;            // edges with resolutionStatus='resolved' that pass GI-2 + GI-3
  unresolved_count: number;
  ambiguous_count: number;
  external_count: number;
  builtin_count: number;
  header_defined_count: number;        // unique files (R-PHASE-6-F file-grain)
  header_missing_count: number;
  header_stale_count: number;
  header_partial_count: number;
  header_layer_mismatch_count: number; // SH-1
  header_export_mismatch_count: number; // SH-2 export drift
}

interface ValidationResult {
  ok: boolean;                         // true iff errors.length === 0
  errors: ValidationError[];           // graph-integrity (always fail-hard) + strict-promoted header drift
  warnings: ValidationWarning[];       // header drift in default mode (SH-1/SH-2/SH-3)
  report: ValidationReport;            // always populated, even on ok=false
}
```

`validatePipelineState(state, graph, options)` is **pure**: no fs, no `process.exit`, no console. The CLI plumbs `ValidatePipelineStateOptions.layerEnum` (loaded from `ASSISTANT/STANDARDS/layers.json`) and `strictHeaders` directly per DR-PHASE-6-D.

Real-world post-Phase-7 baseline (from coderef-core's own scan, committed at `.coderef/validation-report.json`):

| Field | Value |
|-------|------:|
| `valid_edge_count` | 3464 |
| `header_missing_count` | 262 |
| `header_defined_count` | 0 |
| `header_stale_count` | 0 |
| `header_partial_count` | 0 |
| (other counts) | 0 |
| (inferred `ok`) | true |

---

## 6. Indexing Result (Phase 7 contract)

Truth source: `src/integration/rag/indexing-orchestrator.ts` lines 138–224 and `src/integration/rag/code-chunk.ts` lines 17–143.

The Phase 7 `IndexingResult` shape is **strictly additive** over the pre-Phase-7 contract (DR-PHASE-7-B): numeric counts keep their original types; the new fields (`status`, `*Details`, `validationGateRefused`, `validationReportPath`) are additive.

```typescript
type IndexingStatus = 'success' | 'partial' | 'failed';

type SkipReason =
  | 'unchanged'
  | 'header_status_missing'
  | 'header_status_stale'
  | 'header_status_partial'
  | 'unresolved_relationship';

type FailReason = 'embedding_api_error' | 'malformed_chunk';

interface SkipEntry {  coderefId: string; reason: SkipReason;  message?: string }
interface FailEntry {  coderefId: string; reason: FailReason;  message?: string }

interface IndexingResult {
  // Pre-Phase-7 numeric counts (unchanged)
  chunksIndexed: number;
  chunksSkipped: number;
  chunksFailed: number;
  filesProcessed: number;
  processingTimeMs: number;
  stats: IndexingStatistics;
  errors: IndexingError[];

  // Phase 7 additive fields:
  status: IndexingStatus;                   // see threshold table below
  chunksSkippedDetails: SkipEntry[];        // length === chunksSkipped (invariant)
  chunksFailedDetails: FailEntry[];         // length === chunksFailed (invariant)
  validationGateRefused?: boolean;          // true when status='failed' due to refused validation gate
  validationReportPath?: string;            // path to the validation-report.json that gated this run
}
```

**Status thresholds (DR-PHASE-7-C):**

| `status` | Condition |
|---------|-----------|
| `success` | `chunksIndexed > 0` AND `chunksSkipped === 0` AND `chunksFailed === 0` |
| `partial` | `chunksIndexed > 0` AND (`chunksSkipped > 0` OR `chunksFailed > 0`) |
| `failed`  | `chunksIndexed === 0` OR `validationGateRefused === true` |

The orchestrator **refuses to run** when the gating `ValidationResult.ok === false` (DR-PHASE-7-A): `IndexingResult` is returned with `status='failed'` and `validationGateRefused=true`. This eliminates the pre-Phase-7 `chunksIndexed=0` silent-success anti-pattern.

### `CodeChunk` (Phase 7 facets)

`CodeChunk` carries optional semantic facets propagated from `ElementData` via `GraphNode.metadata`:

```typescript
interface CodeChunk {
  // Existing fields (coderef, type, name, file, line, language, sourceCode, ...)
  // ...

  // Phase 7 facets (file-grain, optional, undefined-passthrough when source lacks)
  layer?: string;
  capability?: string;
  constraints?: string[];
  headerStatus?: 'defined' | 'missing' | 'stale' | 'partial';
}
```

These facets are filterable via `rag-search --layer <value>` and `rag-search --capability <value>` (Phase 7 CLI surface).

---

## Cross-references

- Header grammar (BNF): [docs/HEADER-GRAMMAR.md](./HEADER-GRAMMAR.md) — mirror of `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`
- Public API contract: [docs/API.md](./API.md)
- Agent usage contract: [/AGENTS.md](../AGENTS.md)
- CLI reference: [docs/CLI.md](./CLI.md)
- Architecture overview: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- Phase archives (per-phase ARCHIVED.md): `coderef/archived/pipeline-*/`
