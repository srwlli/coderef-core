/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability api-surface-diff
 * @exports ExportSignature, ExportsManifest, ApiChange, ApiChangeType, ApiDiff, extractExportsManifest, diffApiSurface, API_MANIFEST_SCHEMA_VERSION
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * api-diff — a PURE before/after diff over a project's EXPORTED API surface
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 6, breaking-changes/api_diff).
 *
 * The prior --type=breaking-changes was a hard NOT-IMPLEMENTED gate: its call-site
 * path (src/context/breaking-change-detector/) depends on git-diff + signature
 * extractors that throw, so any report would be a silent false negative. This module
 * replaces that with the metrics-delta.ts diff-shape precedent (WO-AGENTIC-CODING-
 * INTELLIGENCE-PROGRAM-001 P11, the CodeScene verified-refactor loop): a snapshot the
 * caller takes BEFORE a change, diffed against the current surface AFTER — never a
 * git-ref re-parse. The pure core here diffs two already-materialized manifests; the
 * caller owns snapshotting (a .coderef-confined sidecar), exactly as map_metrics_delta
 * takes two MapMetrics snapshots and the caller owns the sidecar.
 *
 * PURE. No I/O, no git, no Date.now / Math.random. extractExportsManifest projects
 * a manifest from the canonical elements the caller already loaded; diffApiSurface
 * joins two manifests. Deterministic — identical inputs yield a byte-identical diff.
 *
 * SURFACES, NOT VERDICTS. A removed export is a CHANGE fact, NOT automatically a
 * "breaking change" — the operator decides whether that direction is a break. The
 * per-change `changeType`/`direction` is PROVENANCE (what happened to the export),
 * never a quality verdict. There is deliberately NO composite "breaking count" score:
 * the caller reads the added/removed/changed sets and decides.
 *
 * ABSENCE = NO-DATA. If a manifest is absent (no baseline snapshot yet), the diff is
 * marked { noData: true } with a warning — NEVER "every export was added/removed",
 * which would be a fabricated false diff. The honest declaration is that it could not
 * be computed, mirroring metrics-delta's noDataFamily.
 */

/** Bump when the manifest sidecar shape changes so a stale snapshot is caught, not mis-diffed. */
export const API_MANIFEST_SCHEMA_VERSION = '1.0.0';

/** Minimal element shape the manifest needs (a subset of the index/graph element). */
export interface ManifestElement {
  name?: string;
  type?: string;
  file?: string;
  line?: number;
  exported?: boolean;
  /** Present on the index element; its length is the exported symbol's arity. */
  parameters?: unknown[];
  codeRefId?: string;
  codeRefIdNoLine?: string;
}

/** One exported symbol's stable signature. */
export interface ExportSignature {
  name: string;
  /** Element kind (function/class/interface/const/...). */
  kind: string;
  file: string;
  /** Parameter count, or null when the element carries no parameter list (e.g. a const/type). */
  paramArity: number | null;
  /** codeRefId when available — lets a consumer pivot into what_calls / impact_of. */
  codeRefId?: string;
}

/** The exported API surface at one point in time, keyed by a stable export identity. */
export interface ExportsManifest {
  schemaVersion: string;
  /** exportKey -> signature. Key is codeRefIdNoLine when present, else `${file}␟${name}`. */
  exports: Record<string, ExportSignature>;
}

export type ApiChangeType = 'added' | 'removed' | 'changed';

/** One change to the exported surface. changeType/direction is PROVENANCE, not a verdict. */
export interface ApiChange {
  name: string;
  kind: string;
  file: string;
  changeType: ApiChangeType;
  /** PROVENANCE label mirroring changeType (what happened), never "break"/"safe". */
  direction: ApiChangeType;
  /** Present for removed + changed. */
  before?: { paramArity: number | null };
  /** Present for added + changed. */
  after?: { paramArity: number | null };
  /** codeRefId of the after side (added/changed) or before side (removed), when known. */
  codeRefId?: string;
}

export interface ApiDiff {
  schemaVersion: { before: string; after: string; match: boolean };
  /** True when a manifest was absent — no diff computed (never a fabricated all-added/all-removed). */
  noData: boolean;
  /** Exports present in AFTER only, sorted by (file, name). */
  added: ApiChange[];
  /** Exports present in BEFORE only, sorted by (file, name). */
  removed: ApiChange[];
  /** Exports in BOTH whose signature (param arity) changed, sorted by (file, name). */
  changed: ApiChange[];
  /** Count of exports present + identical on both sides (no change) — provenance, not a score. */
  unchangedCount: number;
  warnings: string[];
  note: string;
}

const API_DIFF_NOTE =
  'api-diff is SURFACES, NOT VERDICTS: added/removed/signature-changed exports are CHANGE facts. ' +
  'A removed or changed export is NOT automatically a "breaking change" — the operator decides. ' +
  'There is deliberately NO composite breaking-count score, and an absent manifest is no-data ' +
  '(the diff could not be computed), never a fabricated all-added/all-removed report.';

/** ASCII unit-separator — a printable, collision-safe key delimiter (NOT a NUL byte). */
const SEP = '␟';

/** Normalize path separators to forward slashes for cross-platform key stability. */
function normSlashes(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Project an exports manifest from the canonical elements the caller loaded. Only
 * elements with `exported === true` participate. Pure + deterministic: the returned
 * Record is built by iterating elements, and diffApiSurface sorts on read, so key
 * insertion order does not affect the diff.
 */
export function extractExportsManifest(elements: ManifestElement[]): ExportsManifest {
  const exports: Record<string, ExportSignature> = {};
  for (const el of elements) {
    if (el.exported !== true) continue;
    if (el.name === undefined) continue;
    const file = normSlashes(el.file ?? '');
    const key = el.codeRefIdNoLine ?? `${file}${SEP}${el.name}`;
    // First writer wins for a duplicate key (deterministic given a stable element order).
    if (exports[key] !== undefined) continue;
    exports[key] = {
      name: el.name,
      kind: el.type ?? 'unknown',
      file,
      paramArity: Array.isArray(el.parameters) ? el.parameters.length : null,
      ...(el.codeRefId !== undefined ? { codeRefId: el.codeRefId } : {}),
    };
  }
  return { schemaVersion: API_MANIFEST_SCHEMA_VERSION, exports };
}

/** Build an ApiChange from a signature for the added/removed cases. */
function changeFrom(sig: ExportSignature, changeType: 'added' | 'removed'): ApiChange {
  return {
    name: sig.name,
    kind: sig.kind,
    file: sig.file,
    changeType,
    direction: changeType,
    ...(changeType === 'added' ? { after: { paramArity: sig.paramArity } } : { before: { paramArity: sig.paramArity } }),
    ...(sig.codeRefId !== undefined ? { codeRefId: sig.codeRefId } : {}),
  };
}

/** Deterministic (file, name) order for a change list. */
function sortChanges(list: ApiChange[]): ApiChange[] {
  return list.sort(
    (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
}

/**
 * Diff two exports manifests into a decomposed change vector. Pure; no I/O, no git,
 * no clock. An absent (undefined) before OR after manifest marks the whole diff
 * no-data with a warning rather than fabricating an all-added/all-removed report.
 */
export function diffApiSurface(inputs: { before: ExportsManifest | undefined; after: ExportsManifest | undefined }): ApiDiff {
  const warnings: string[] = [];
  const beforeVer = inputs.before?.schemaVersion ?? '(absent)';
  const afterVer = inputs.after?.schemaVersion ?? '(absent)';

  // No-data: a side is missing entirely (no baseline snapshot taken). Honest empty,
  // NEVER "every export added/removed".
  if (inputs.before === undefined || inputs.after === undefined) {
    if (inputs.before === undefined) warnings.push('api-diff: BEFORE manifest absent — no baseline to diff against (marked no-data)');
    if (inputs.after === undefined) warnings.push('api-diff: AFTER manifest absent — nothing to diff (marked no-data)');
    return {
      schemaVersion: { before: beforeVer, after: afterVer, match: false },
      noData: true,
      added: [],
      removed: [],
      changed: [],
      unchangedCount: 0,
      warnings,
      note: API_DIFF_NOTE,
    };
  }

  const match = beforeVer === afterVer;
  if (!match) {
    warnings.push(
      `api-diff: manifest schemaVersion mismatch (before=${beforeVer}, after=${afterVer}) — ` +
        'diffed by export identity where both present; interpret with care',
    );
  }

  const before = inputs.before.exports;
  const after = inputs.after.exports;
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);

  const added: ApiChange[] = [];
  const removed: ApiChange[] = [];
  const changed: ApiChange[] = [];
  let unchangedCount = 0;

  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    if (b === undefined && a !== undefined) {
      added.push(changeFrom(a, 'added'));
    } else if (b !== undefined && a === undefined) {
      removed.push(changeFrom(b, 'removed'));
    } else if (b !== undefined && a !== undefined) {
      // Present on both: a signature change is a param-arity change (kind/name are
      // part of the identity for codeRefId-keyed exports).
      if (b.paramArity !== a.paramArity) {
        changed.push({
          name: a.name,
          kind: a.kind,
          file: a.file,
          changeType: 'changed',
          direction: 'changed',
          before: { paramArity: b.paramArity },
          after: { paramArity: a.paramArity },
          ...(a.codeRefId !== undefined ? { codeRefId: a.codeRefId } : {}),
        });
      } else {
        unchangedCount++;
      }
    }
  }

  return {
    schemaVersion: { before: beforeVer, after: afterVer, match },
    noData: false,
    added: sortChanges(added),
    removed: sortChanges(removed),
    changed: sortChanges(changed),
    unchangedCount,
    warnings,
    note: API_DIFF_NOTE,
  };
}
