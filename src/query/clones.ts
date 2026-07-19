/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability clones
 * @exports CloneElement, CloneMember, CloneGroup, CloneSummary, CloneSurface, CloneInputs, computeCloneSurface, CLONE_SCHEMA_VERSION
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * clones — structural-signature duplication surface
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 10).
 *
 * Answers "which elements share the same STRUCTURAL SHAPE?" by grouping
 * elements on a deterministic signature the index already carries — no source
 * re-read, no AST re-parse. The signature is
 *   (kind, name, arity, sorted param-name shingle, sorted import-source set).
 * Elements that hash to the same signature are candidate clones ("same shape,
 * different location"): renamed copies, boilerplate handlers, parallel test
 * helpers, mechanically-duplicated adapters.
 *
 * WHY signature, not line-hash or AST-subtree: the persisted
 * `.coderef/index.json` element record carries NO body, source span, endLine,
 * or hash — only name/type/file/line/parameters/imports/exports. A true
 * lexical (line-hash) or AST-structural (normalized-subtree) clone pass would
 * require re-reading + re-parsing every file (a new I/O + extractor pass).
 * The structural signature is the honest, deterministic, zero-re-parse clone
 * signal the substrate admits. Richer near-miss detection (persist endLine +
 * a normalized-body hash) is a tracked follow-up, deliberately not gated here.
 *
 * PURE. No I/O, no `Date.now`/`Math.random`, deterministic — identical inputs
 * yield a byte-identical result. The caller loads .coderef/index.json elements
 * and passes them in.
 *
 * SURFACES, NOT VERDICTS. A clone group is CO-LOCATION-of-shape — it is NOT a
 * defect and carries NO "duplication score / grade / verdict". Whether a group
 * is bad (copy-paste rot) or fine (a deliberate interface family) is a human
 * call; this surface only reports WHERE the shape repeats. ABSENCE = NO-DATA:
 * an empty element set returns `{ no_data: true }`, never a false "0 clones".
 * DISCLOSURE (mirrors the docstrings/ast_search not-searched-vs-empty
 * discipline): `signature_basis` names the fields that composed the signature,
 * and `elements_without_signature` counts elements whose param + import signal
 * is empty (signature reduces to kind+name) so a thin-signature element is
 * distinguishable from a genuine singleton.
 */

export const CLONE_SCHEMA_VERSION = '1.0.0';

/** The fields that compose an element's structural signature (disclosure). */
export const SIGNATURE_BASIS: readonly string[] = [
  'kind',
  'name',
  'arity',
  'param-name-shingle',
  'import-source-set',
];

/** Minimal element shape this projection needs (subset of ElementData). */
export interface CloneElement {
  type?: string;
  name: string;
  file: string;
  line?: number;
  codeRefId?: string;
  /** ElementData persists param NAMES as string[]; tolerate the {name} object union too. */
  parameters?: string[] | Array<{ name: string; type?: string }>;
  /** ElementData persists imports as {source, line} objects; tolerate a string[] fallback. */
  imports?: Array<{ source?: string; line?: number }> | string[];
}

/** One member of a clone group. */
export interface CloneMember {
  codeRefId: string | null;
  name: string;
  kind: string;
  file: string;
  line: number | null;
}

/** A set of elements sharing one structural signature (size >= minGroupSize). */
export interface CloneGroup {
  /** Structured signature (the human-readable basis, NOT the raw hash string). */
  signature: {
    kind: string;
    name: string;
    arity: number | null;
    params: string[];
    imports: string[];
  };
  members: CloneMember[];
  size: number;
}

/** Roll-up counts. No score/grade — surfaces-not-verdicts. */
export interface CloneSummary {
  total_elements: number;
  total_groups: number;
  /** Sum of member counts across all emitted groups. */
  clustered_elements: number;
  /** The fields that composed the signature (disclosure — REC-002). */
  signature_basis: readonly string[];
  /**
   * Count of elements whose param + import signal is empty, so the signature
   * reduces to (kind, name) only. Their grouping (or non-grouping) rests on a
   * THIN signature — disclosed so a thin-signature element is distinguishable
   * from a genuine, richly-signatured singleton (not-comparable vs singleton).
   */
  elements_without_signature: number;
}

export interface CloneSurface {
  groups: CloneGroup[];
  summary: CloneSummary;
  no_data: boolean;
  truncated: boolean;
  schema_version: string;
  note: string;
}

export interface CloneInputs {
  elements: CloneElement[];
  /** Optional case-insensitive substring filter over element name. */
  filter?: string;
  /** Minimum members for a signature to count as a clone group (default 2). */
  minGroupSize?: number;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 100;
const DEFAULT_MIN_GROUP_SIZE = 2;

const NOTE =
  'Structural-signature clone surface: a group is elements sharing (kind, name, ' +
  'arity, param-name shingle, import-source set). It is CO-LOCATION-of-shape, ' +
  'NOT a defect — there is deliberately no duplication score/grade/verdict. ' +
  'Signature is computed from the index (no source re-read), so it catches ' +
  'same-shape renamed/boilerplate/parallel elements, NOT byte-level or ' +
  'AST-subtree near-misses (a tracked follow-up needs endLine + a body hash). ' +
  'elements_without_signature discloses thin-signature (kind+name only) elements ' +
  'so a thin candidate is distinguishable from a richly-signatured singleton.';

/** Normalize the parameters union to a sorted array of param-name strings. */
function paramNames(parameters: CloneElement['parameters']): string[] {
  if (!Array.isArray(parameters)) return [];
  const names = parameters.map((p) => (typeof p === 'string' ? p : p?.name ?? ''));
  return names.filter((n) => n.length > 0).sort();
}

/**
 * Normalize the imports union to a sorted array of import SOURCE strings.
 * The `line` field is deliberately EXCLUDED — it is location noise that would
 * defeat cross-location clone matching.
 */
function importSources(imports: CloneElement['imports']): string[] {
  if (!Array.isArray(imports)) return [];
  const sources = imports.map((im) => (typeof im === 'string' ? im : im?.source ?? ''));
  return sources.filter((s) => s.length > 0).sort();
}

/** True when an element's param + import signal is both empty (thin signature). */
function isThinSignature(el: CloneElement): boolean {
  return paramNames(el.parameters).length === 0 && importSources(el.imports).length === 0;
}

/**
 * Project structural-signature clone groups over the element set.
 * Deterministic: groups sorted by (size desc, signature-key asc); members
 * sorted by (file, line, name). The summary is computed over the FILTERED set
 * (before pagination); pagination only bounds the returned groups.
 */
export function computeCloneSurface(inputs: CloneInputs): CloneSurface {
  const {
    elements,
    filter,
    minGroupSize = DEFAULT_MIN_GROUP_SIZE,
    limit = DEFAULT_LIMIT,
    offset = 0,
  } = inputs;

  if (!elements || elements.length === 0) {
    return {
      groups: [],
      summary: {
        total_elements: 0,
        total_groups: 0,
        clustered_elements: 0,
        signature_basis: SIGNATURE_BASIS,
        elements_without_signature: 0,
      },
      no_data: true,
      truncated: false,
      schema_version: CLONE_SCHEMA_VERSION,
      note: NOTE,
    };
  }

  const needle = filter ? filter.toLowerCase() : null;
  const filtered = elements.filter((el) =>
    needle ? el.name.toLowerCase().includes(needle) : true,
  );

  const minSize = minGroupSize >= 2 ? minGroupSize : DEFAULT_MIN_GROUP_SIZE;

  // Bucket elements by their structural signature key.
  const buckets = new Map<string, { sig: CloneGroup['signature']; members: CloneMember[] }>();
  for (const el of filtered) {
    const kind = el.type ?? 'unknown';
    const params = paramNames(el.parameters);
    const imports = importSources(el.imports);
    const arity = Array.isArray(el.parameters) ? el.parameters.length : null;
    const sig = { kind, name: el.name, arity, params, imports };
    const key = JSON.stringify([kind, el.name, arity, params, imports]);

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { sig, members: [] };
      buckets.set(key, bucket);
    }
    bucket.members.push({
      codeRefId: el.codeRefId ?? null,
      name: el.name,
      kind,
      file: el.file,
      line: typeof el.line === 'number' ? el.line : null,
    });
  }

  // Keep only real groups (>= minSize); sort members + groups deterministically.
  const allGroups: Array<{ key: string; group: CloneGroup }> = [];
  for (const [key, bucket] of buckets) {
    if (bucket.members.length < minSize) continue;
    const members = bucket.members.slice().sort(
      (a, b) =>
        a.file.localeCompare(b.file) ||
        (a.line ?? 0) - (b.line ?? 0) ||
        a.name.localeCompare(b.name),
    );
    allGroups.push({ key, group: { signature: bucket.sig, members, size: members.length } });
  }

  allGroups.sort(
    (a, b) => b.group.size - a.group.size || a.key.localeCompare(b.key),
  );

  const totalGroups = allGroups.length;
  const clusteredElements = allGroups.reduce((sum, g) => sum + g.group.size, 0);
  const elementsWithoutSignature = filtered.filter(isThinSignature).length;

  const page = allGroups.slice(offset, offset + limit).map((g) => g.group);
  const truncated = offset + limit < allGroups.length;

  return {
    groups: page,
    summary: {
      total_elements: filtered.length,
      total_groups: totalGroups,
      clustered_elements: clusteredElements,
      signature_basis: SIGNATURE_BASIS,
      elements_without_signature: elementsWithoutSignature,
    },
    no_data: false,
    truncated,
    schema_version: CLONE_SCHEMA_VERSION,
    note: NOTE,
  };
}
