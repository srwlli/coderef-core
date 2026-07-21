/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability clones
 * @exports CloneElement, CloneMember, CloneGroup, LexicalCloneGroup, NearMissPair, CloneSummary, CloneSurface, CloneInputs, ClonePass, computeCloneSurface, CLONE_SCHEMA_VERSION, SIGNATURE_BASIS
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * clones — duplication surface with three passes
 * (P10 structural + WO-EXTEND-THE-CLONE-SURFACE-P10-SRC-QUERY-CLONES-001 P1).
 *
 * PASSES (selected via `pass`, default 'structural' — back-compat unchanged):
 *
 * - `structural` (P10): groups elements sharing the deterministic signature
 *   (kind, name, arity, sorted param-name shingle, sorted import-source set)
 *   the index has always carried. Catches same-shape renamed/boilerplate/
 *   parallel elements; zero body data required.
 *
 * - `lexical` (CCFinder-style identity): groups elements whose persisted
 *   `normalizedBodyHash` (comment-stripped, whitespace-collapsed body, hashed
 *   at extract time) is IDENTICAL. Catches byte-level copy-paste across files
 *   and same-body-different-name clones the structural signature cannot see.
 *
 * - `near_miss` (Deckard/NiCad-style, OPT-IN with a similarity threshold):
 *   pairs elements whose persisted `astFingerprint` (sparse named-node-type
 *   counts over the element subtree) are similar under normalized-L1 distance
 *   (1 = identical vectors). Candidates are bucketed by (kind, file-extension
 *   family) — raw grammar type names only compare meaningfully within one
 *   grammar family — and pairs with IDENTICAL body hashes are excluded (those
 *   are exact clones, the lexical pass's territory).
 *
 * SUBSTRATE. The body passes consume fields persisted by the live extractor
 * (src/pipeline/extractors/clone-substrate.ts): endLine, normalizedBodyHash,
 * normalizedBodyLength, astFingerprint. Indexes populated before that shipped
 * (or via the regex-fallback scanner) LACK them — the passes disclose the gap
 * (`elements_without_body_data`) and return `no_data: true` when NO element
 * carries the needed field, never a fake "0 clones". Repopulate to refresh.
 *
 * PURE. No I/O, no `Date.now`/`Math.random`, deterministic — identical inputs
 * yield a byte-identical result. The caller loads .coderef/index.json elements
 * and passes them in.
 *
 * SURFACES, NOT VERDICTS. A clone group / near-miss pair is CO-LOCATION of
 * shape or text — it is NOT a defect and carries NO duplication grade. The
 * near-miss `similarity` is a measured vector distance (provenance), not a
 * quality score. Whether a group is copy-paste rot or a deliberate family is
 * a human call; this surface only reports WHERE to look.
 */

export const CLONE_SCHEMA_VERSION = '1.1.0';

/** The fields that compose an element's structural signature (disclosure). */
export const SIGNATURE_BASIS: readonly string[] = [
  'kind',
  'name',
  'arity',
  'param-name-shingle',
  'import-source-set',
];

export type ClonePass = 'structural' | 'lexical' | 'near_miss';

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
  // Clone substrate (absent on old/fallback-scanned indexes = no-body-data).
  endLine?: number;
  normalizedBodyHash?: string;
  normalizedBodyLength?: number;
  astFingerprint?: Record<string, number>;
}

/** One member of a clone group / near-miss pair. */
export interface CloneMember {
  codeRefId: string | null;
  name: string;
  kind: string;
  file: string;
  line: number | null;
  /** Element source-span end (persisted by the live extractor; null on old indexes). */
  endLine: number | null;
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

/** A set of elements with an IDENTICAL normalized body (size >= minGroupSize). */
export interface LexicalCloneGroup {
  /** The shared normalizedBodyHash (32 hex chars). */
  bodyHash: string;
  /** Length of the shared normalized body text. */
  normalizedLength: number;
  members: CloneMember[];
  size: number;
}

/** Two elements whose AST fingerprints are similar but NOT lexically identical. */
export interface NearMissPair {
  a: CloneMember;
  b: CloneMember;
  /**
   * Normalized-L1 fingerprint similarity in [0, 1]; 1 = identical vectors.
   * Measured provenance, NOT a duplication grade.
   */
  similarity: number;
}

/** Roll-up counts. No score/grade — surfaces-not-verdicts. */
export interface CloneSummary {
  total_elements: number;
  total_groups: number;
  /** Sum of member counts across all emitted groups (pairs count 2 each for near_miss). */
  clustered_elements: number;
  /** The fields that composed the structural signature (disclosure — REC-002). */
  signature_basis: readonly string[];
  /**
   * Count of elements whose param + import signal is empty, so the structural
   * signature reduces to (kind, name) only. Disclosed so a thin-signature
   * element is distinguishable from a richly-signatured singleton.
   */
  elements_without_signature: number;
  /** Body passes: elements carrying the pass's required substrate field. */
  elements_with_body_data?: number;
  /** Body passes: elements LACKING it (old index / fallback scanner) — disclosure, not zero. */
  elements_without_body_data?: number;
  /** Body passes: elements excluded by minBodyLength (disclosed, never silent). */
  elements_below_min_body_length?: number;
  /** near_miss only: the effective (clamped) similarity threshold applied. */
  similarity_threshold?: number;
}

export interface CloneSurface {
  /** Which pass produced this surface (default 'structural'). */
  pass: ClonePass;
  /** Structural-signature groups (structural pass; empty for body passes). */
  groups: CloneGroup[];
  /** Identical-normalized-body groups (lexical pass only). */
  lexical_groups?: LexicalCloneGroup[];
  /** Similar-fingerprint pairs (near_miss pass only). */
  near_miss_pairs?: NearMissPair[];
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
  /** Minimum members for a signature/body-hash group (default 2). */
  minGroupSize?: number;
  /** Pass selection (default 'structural' — the P10 behavior, unchanged). */
  pass?: ClonePass;
  /**
   * near_miss only: minimum fingerprint similarity in [0, 1] for a pair to be
   * emitted (default 0.9; out-of-range values clamp).
   */
  similarityThreshold?: number;
  /**
   * Body passes: elements with a normalized body shorter than this are
   * excluded from grouping/pairing (counted in elements_below_min_body_length).
   * Default 0 — no silent gate.
   */
  minBodyLength?: number;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 100;
const DEFAULT_MIN_GROUP_SIZE = 2;
const DEFAULT_SIMILARITY_THRESHOLD = 0.9;

const STRUCTURAL_NOTE =
  'Structural-signature clone surface: a group is elements sharing (kind, name, ' +
  'arity, param-name shingle, import-source set). It is CO-LOCATION-of-shape, ' +
  'NOT a defect — there is deliberately no duplication score/grade/verdict. ' +
  'Signature is computed from the index (no source re-read), so it catches ' +
  'same-shape renamed/boilerplate/parallel elements. For byte-level copy-paste ' +
  "use pass='lexical'; for AST near-misses use pass='near_miss' (both consume " +
  'the persisted body substrate). elements_without_signature discloses ' +
  'thin-signature (kind+name only) elements so a thin candidate is ' +
  'distinguishable from a richly-signatured singleton.';

const LEXICAL_NOTE =
  'Lexical clone surface (CCFinder-style identity): a group is elements whose ' +
  'persisted normalizedBodyHash — the comment-stripped, whitespace-collapsed ' +
  'BODY hashed at extract time (name/signature excluded, so renamed copies ' +
  'match) — is IDENTICAL. Co-location of TEXT, not a ' +
  'defect: no duplication score/grade/verdict. elements_without_body_data ' +
  'counts elements the index carries NO body hash for (populated before the ' +
  'substrate shipped, or via the regex-fallback scanner) — repopulate to ' +
  'refresh; when NO element carries body data the surface is no_data, never ' +
  'a fake "0 clones".';

const NEAR_MISS_NOTE =
  'AST near-miss clone surface (Deckard/NiCad-style, opt-in): a pair is two ' +
  'elements whose persisted astFingerprint vectors (named-node-type counts) ' +
  'meet the similarity threshold under normalized-L1 distance. similarity is ' +
  'measured provenance, NOT a quality grade. Candidates are bucketed by ' +
  '(kind, file-extension family); pairs with IDENTICAL body hashes are ' +
  "excluded — those are exact clones, pass='lexical' territory. Fingerprints " +
  'are persisted for function-like kinds only; elements_without_body_data ' +
  'counts elements lacking one. No fingerprints at all -> no_data.';

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

function toMember(el: CloneElement): CloneMember {
  return {
    codeRefId: el.codeRefId ?? null,
    name: el.name,
    kind: el.type ?? 'unknown',
    file: el.file,
    line: typeof el.line === 'number' ? el.line : null,
    endLine: typeof el.endLine === 'number' ? el.endLine : null,
  };
}

function compareMembers(a: CloneMember, b: CloneMember): number {
  return (
    a.file.localeCompare(b.file) ||
    (a.line ?? 0) - (b.line ?? 0) ||
    a.name.localeCompare(b.name)
  );
}

/**
 * File-extension family for fingerprint comparability: ts/tsx/js/jsx share one
 * grammar family; each other language stands alone.
 */
const EXT_FAMILY: Record<string, string> = {
  ts: 'js', tsx: 'js', js: 'js', jsx: 'js', mjs: 'js', cjs: 'js',
  py: 'py', go: 'go', rs: 'rs', java: 'java',
  c: 'c', h: 'c', cc: 'c', cpp: 'c', cxx: 'c', hpp: 'c',
};

function extFamily(file: string): string {
  const dot = file.lastIndexOf('.');
  if (dot < 0 || dot === file.length - 1) return '';
  const ext = file.slice(dot + 1).toLowerCase();
  return EXT_FAMILY[ext] ?? ext;
}

function fingerprintTotal(fp: Record<string, number>): number {
  let total = 0;
  for (const key of Object.keys(fp)) total += fp[key];
  return total;
}

/** Normalized-L1 similarity in [0,1]: 1 - sum|a-b| / (totalA + totalB). */
function fingerprintSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
  totalA: number,
  totalB: number
): number {
  let diff = 0;
  for (const key of Object.keys(a)) diff += Math.abs(a[key] - (b[key] ?? 0));
  for (const key of Object.keys(b)) if (!(key in a)) diff += b[key];
  return 1 - diff / (totalA + totalB);
}

/**
 * Project the clone surface over the element set. Deterministic across all
 * passes: identical inputs yield byte-identical output. The summary is
 * computed over the FILTERED set (before pagination); pagination only bounds
 * the returned groups/pairs.
 */
export function computeCloneSurface(inputs: CloneInputs): CloneSurface {
  const {
    elements,
    filter,
    minGroupSize = DEFAULT_MIN_GROUP_SIZE,
    pass = 'structural',
    similarityThreshold,
    minBodyLength,
    limit = DEFAULT_LIMIT,
    offset = 0,
  } = inputs;

  const baseSummary = (filtered: CloneElement[]): CloneSummary => ({
    total_elements: filtered.length,
    total_groups: 0,
    clustered_elements: 0,
    signature_basis: SIGNATURE_BASIS,
    elements_without_signature: filtered.filter(isThinSignature).length,
  });

  const emptySurface = (note: string): CloneSurface => ({
    pass,
    groups: [],
    ...(pass === 'lexical' ? { lexical_groups: [] } : {}),
    ...(pass === 'near_miss' ? { near_miss_pairs: [] } : {}),
    summary: baseSummary([]),
    no_data: true,
    truncated: false,
    schema_version: CLONE_SCHEMA_VERSION,
    note,
  });

  const noteFor: Record<ClonePass, string> = {
    structural: STRUCTURAL_NOTE,
    lexical: LEXICAL_NOTE,
    near_miss: NEAR_MISS_NOTE,
  };

  if (!elements || elements.length === 0) {
    return emptySurface(noteFor[pass]);
  }

  const needle = filter ? filter.toLowerCase() : null;
  const filtered = elements.filter((el) =>
    needle ? el.name.toLowerCase().includes(needle) : true,
  );

  const minSize = minGroupSize >= 2 ? minGroupSize : DEFAULT_MIN_GROUP_SIZE;
  const bodyFloor =
    typeof minBodyLength === 'number' && Number.isFinite(minBodyLength) && minBodyLength > 0
      ? Math.floor(minBodyLength)
      : 0;

  if (pass === 'lexical') {
    return computeLexicalPass(filtered, { minSize, bodyFloor, limit, offset }, baseSummary);
  }
  if (pass === 'near_miss') {
    const threshold =
      typeof similarityThreshold === 'number' && Number.isFinite(similarityThreshold)
        ? Math.min(1, Math.max(0, similarityThreshold))
        : DEFAULT_SIMILARITY_THRESHOLD;
    return computeNearMissPass(filtered, { threshold, bodyFloor, limit, offset }, baseSummary);
  }

  // ---- structural pass (P10 behavior, unchanged) -------------------------------

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
    bucket.members.push(toMember(el));
  }

  // Keep only real groups (>= minSize); sort members + groups deterministically.
  const allGroups: Array<{ key: string; group: CloneGroup }> = [];
  for (const [key, bucket] of buckets) {
    if (bucket.members.length < minSize) continue;
    const members = bucket.members.slice().sort(compareMembers);
    allGroups.push({ key, group: { signature: bucket.sig, members, size: members.length } });
  }

  allGroups.sort(
    (a, b) => b.group.size - a.group.size || a.key.localeCompare(b.key),
  );

  const totalGroups = allGroups.length;
  const clusteredElements = allGroups.reduce((sum, g) => sum + g.group.size, 0);

  const page = allGroups.slice(offset, offset + limit).map((g) => g.group);
  const truncated = offset + limit < allGroups.length;

  return {
    pass: 'structural',
    groups: page,
    summary: {
      ...baseSummary(filtered),
      total_groups: totalGroups,
      clustered_elements: clusteredElements,
    },
    no_data: false,
    truncated,
    schema_version: CLONE_SCHEMA_VERSION,
    note: STRUCTURAL_NOTE,
  };
}

// ---- lexical pass ----------------------------------------------------------------

function computeLexicalPass(
  filtered: CloneElement[],
  opts: { minSize: number; bodyFloor: number; limit: number; offset: number },
  baseSummary: (filtered: CloneElement[]) => CloneSummary
): CloneSurface {
  const withBody = filtered.filter(
    (el) => typeof el.normalizedBodyHash === 'string' && el.normalizedBodyHash.length > 0,
  );
  const withoutBody = filtered.length - withBody.length;

  if (withBody.length === 0) {
    return {
      pass: 'lexical',
      groups: [],
      lexical_groups: [],
      summary: {
        ...baseSummary(filtered),
        elements_with_body_data: 0,
        elements_without_body_data: withoutBody,
        elements_below_min_body_length: 0,
      },
      no_data: true,
      truncated: false,
      schema_version: CLONE_SCHEMA_VERSION,
      note: LEXICAL_NOTE,
    };
  }

  const gated = withBody.filter((el) => (el.normalizedBodyLength ?? 0) >= opts.bodyFloor);
  const belowMin = withBody.length - gated.length;

  const buckets = new Map<string, { normalizedLength: number; members: CloneMember[] }>();
  for (const el of gated) {
    const hash = el.normalizedBodyHash as string;
    let bucket = buckets.get(hash);
    if (!bucket) {
      bucket = { normalizedLength: el.normalizedBodyLength ?? 0, members: [] };
      buckets.set(hash, bucket);
    }
    bucket.members.push(toMember(el));
  }

  const allGroups: LexicalCloneGroup[] = [];
  for (const [hash, bucket] of buckets) {
    if (bucket.members.length < opts.minSize) continue;
    allGroups.push({
      bodyHash: hash,
      normalizedLength: bucket.normalizedLength,
      members: bucket.members.slice().sort(compareMembers),
      size: bucket.members.length,
    });
  }

  allGroups.sort((a, b) => b.size - a.size || a.bodyHash.localeCompare(b.bodyHash));

  const clusteredElements = allGroups.reduce((sum, g) => sum + g.size, 0);
  const page = allGroups.slice(opts.offset, opts.offset + opts.limit);
  const truncated = opts.offset + opts.limit < allGroups.length;

  return {
    pass: 'lexical',
    groups: [],
    lexical_groups: page,
    summary: {
      ...baseSummary(filtered),
      total_groups: allGroups.length,
      clustered_elements: clusteredElements,
      elements_with_body_data: withBody.length,
      elements_without_body_data: withoutBody,
      elements_below_min_body_length: belowMin,
    },
    no_data: false,
    truncated,
    schema_version: CLONE_SCHEMA_VERSION,
    note: LEXICAL_NOTE,
  };
}

// ---- near-miss pass --------------------------------------------------------------

function computeNearMissPass(
  filtered: CloneElement[],
  opts: { threshold: number; bodyFloor: number; limit: number; offset: number },
  baseSummary: (filtered: CloneElement[]) => CloneSummary
): CloneSurface {
  const withFp = filtered.filter(
    (el) =>
      el.astFingerprint &&
      typeof el.astFingerprint === 'object' &&
      Object.keys(el.astFingerprint).length > 0,
  );
  const withoutFp = filtered.length - withFp.length;

  if (withFp.length === 0) {
    return {
      pass: 'near_miss',
      groups: [],
      near_miss_pairs: [],
      summary: {
        ...baseSummary(filtered),
        elements_with_body_data: 0,
        elements_without_body_data: withoutFp,
        elements_below_min_body_length: 0,
        similarity_threshold: opts.threshold,
      },
      no_data: true,
      truncated: false,
      schema_version: CLONE_SCHEMA_VERSION,
      note: NEAR_MISS_NOTE,
    };
  }

  const gated = withFp.filter((el) => (el.normalizedBodyLength ?? 0) >= opts.bodyFloor);
  const belowMin = withFp.length - gated.length;

  // Bucket by (kind, extension family) — fingerprints only compare within one
  // grammar family, and cross-kind pairs are not near-misses.
  const buckets = new Map<string, CloneElement[]>();
  for (const el of gated) {
    const key = `${el.type ?? 'unknown'}::${extFamily(el.file)}`;
    const list = buckets.get(key);
    if (list) list.push(el);
    else buckets.set(key, [el]);
  }

  const pairs: NearMissPair[] = [];
  for (const list of buckets.values()) {
    const sorted = list
      .map((el) => ({
        el,
        member: toMember(el),
        fp: el.astFingerprint as Record<string, number>,
        total: fingerprintTotal(el.astFingerprint as Record<string, number>),
      }))
      .sort((a, b) => compareMembers(a.member, b.member));

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        // Identical normalized bodies are EXACT clones — lexical territory.
        if (
          a.el.normalizedBodyHash &&
          b.el.normalizedBodyHash &&
          a.el.normalizedBodyHash === b.el.normalizedBodyHash
        ) {
          continue;
        }
        const combined = a.total + b.total;
        if (combined === 0) continue;
        // similarity >= t requires |totalA - totalB| <= (1-t)(totalA+totalB).
        if (Math.abs(a.total - b.total) > (1 - opts.threshold) * combined) continue;
        const similarity = fingerprintSimilarity(a.fp, b.fp, a.total, b.total);
        if (similarity >= opts.threshold) {
          pairs.push({
            a: a.member,
            b: b.member,
            similarity: Math.round(similarity * 1e6) / 1e6,
          });
        }
      }
    }
  }

  pairs.sort(
    (x, y) =>
      y.similarity - x.similarity ||
      compareMembers(x.a, y.a) ||
      compareMembers(x.b, y.b),
  );

  const clustered = new Set<string>();
  for (const p of pairs) {
    clustered.add(`${p.a.file}::${p.a.line ?? 0}::${p.a.name}`);
    clustered.add(`${p.b.file}::${p.b.line ?? 0}::${p.b.name}`);
  }

  const page = pairs.slice(opts.offset, opts.offset + opts.limit);
  const truncated = opts.offset + opts.limit < pairs.length;

  return {
    pass: 'near_miss',
    groups: [],
    near_miss_pairs: page,
    summary: {
      ...baseSummary(filtered),
      total_groups: pairs.length,
      clustered_elements: clustered.size,
      elements_with_body_data: withFp.length,
      elements_without_body_data: withoutFp,
      elements_below_min_body_length: belowMin,
      similarity_threshold: opts.threshold,
    },
    no_data: false,
    truncated,
    schema_version: CLONE_SCHEMA_VERSION,
    note: NEAR_MISS_NOTE,
  };
}
