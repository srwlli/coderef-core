/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability symbol-context-card
 * @exports SymbolHeader, SymbolReferences, SymbolTestLinkage, SymbolStaleness, SymbolContext, SymbolContextInputs, SymbolContextOptions, assembleSymbolContext
 */

/**
 * symbol-context — the consolidated "one card per symbol" assembler
 * (Anthropic consolidation + Serena symbol-overview pattern,
 * WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 7).
 *
 * The dominant agent workflow — understand-before-edit — costs ~5 MCP
 * round-trips today: find_element (identity/header) + source_of
 * (signature/body) + what_calls (callers) + what_this_calls (callees) +
 * what_imports (importers). Every one of those facets is ALREADY computed and
 * already exposed. This module JOINS them into a single SymbolContext card.
 *
 * A JOIN, NOT NEW ANALYSIS. It does no resolution, no adjacency, no
 * ref-collection, no test-detection, no staleness computation of its own —
 * the caller loads the pieces (the resolved node, the matched index element, a
 * CanonicalGraphQuery, the inbound resolved edges, the two mtimes) and this
 * function shapes them. That keeps it PURE: no I/O, no `Date.now`/`Math.random`
 * (the only clock touch is the caller's mtime read, passed in as numbers), and
 * deterministic — identical inputs yield a byte-identical card.
 *
 * SURFACES, NOT VERDICTS. Every facet reports what the graph/index KNOWS:
 *   - `header.status: 'missing'` is no-data (no semantic header authored), NOT
 *     an error and NOT a quality judgement.
 *   - `neighborhood.resolved: false` (or an empty direction) means "no resolved
 *     edges recorded", NOT "unused". Absence is no-data.
 *   - `test_linkage.test_ref_count: 0` means "no inbound ref from a test file
 *     was recorded", NOT "untested".
 *   - `staleness.basis` is the MTIME heuristic label — the element's file is
 *     newer than graph.json, so the card MAY predate a recent edit. This is a
 *     cheap freshness hint, deliberately NOT the scan-time hash manifest (that
 *     authoritative freshness contract is Phase 8, the staleness-contract).
 */

import { type CanonicalGraphQuery } from './canonical-graph.js';
import { type EgoGraph, egoGraphOf } from './ego-graph.js';
import type { ExportedGraph } from '../export/graph-exporter.js';

type ExportedNode = ExportedGraph['nodes'][number];
type ExportedEdge = ExportedGraph['edges'][number];

/** Default per-direction / per-facet cap, mirroring the ego-graph default. */
const DEFAULT_CAP = 25;

/** The identity 5-tuple — same grade as nodeSummary / find_element. */
export interface SymbolIdentity {
  id: string;
  name?: string;
  type: string;
  file?: string;
  line?: number;
}

/**
 * Semantic-header PRESENCE (not the header body). Sourced from the index
 * element record — the same fields find_element surfaces.
 */
export interface SymbolHeader {
  /** headerStatus from index.json; 'missing' when no header was authored. */
  status: string;
  exported: boolean;
  layer?: string;
  capability?: string;
}

/** One reference site: the caller/importer summary + where the edge sits. */
export interface SymbolRefSite extends SymbolIdentity {
  /** `file:line` of the reference site (the edge's sourceLocation). */
  at?: string;
}

/**
 * Reference COUNTS (+ a bounded sample) — the find_all_references grade,
 * reported as counts so the card stays a card. Drill to find_all_references
 * for the full site list.
 */
export interface SymbolReferences {
  call_site_count: number;
  import_site_count: number;
  total: number;
  /** First `cap` inbound call+import sites, deterministically ordered. */
  sample: SymbolRefSite[];
  /** True when more sites exist beyond the sample. */
  truncated: boolean;
}

/**
 * Who-tests-this: the subset of inbound refs whose source file is a test file.
 * A count, never a coverage verdict — 0 is "no test-file ref recorded".
 */
export interface SymbolTestLinkage {
  test_ref_count: number;
  sample: SymbolRefSite[];
  truncated: boolean;
}

/**
 * The MTIME freshness heuristic (Phase-8 boundary: NOT the hash manifest).
 * `stale: true` ⇒ the element's file is newer than graph.json, so this card
 * MAY predate a recent edit — reindex if you need certainty.
 */
export interface SymbolStaleness {
  stale: boolean;
  basis: 'element-file-mtime-vs-graph';
  note?: string;
}

/** The consolidated card: one symbol, every facet, one shot. */
export interface SymbolContext {
  identity: SymbolIdentity;
  header: SymbolHeader;
  /** 1-hop neighborhood (callers/callees/imports/importedBy) — the ego-graph. */
  neighborhood: EgoGraph;
  references: SymbolReferences;
  test_linkage: SymbolTestLinkage;
  staleness: SymbolStaleness;
}

/**
 * The already-loaded inputs the caller supplies. The assembler does NO I/O —
 * the caller performs loadGraph/loadIndex/loadCanonical/fs.statSync and passes
 * the results here, exactly like every sibling READ tool loads before it maps.
 */
export interface SymbolContextInputs {
  /** The resolved graph node (the card's subject). */
  node: ExportedNode;
  /**
   * The matched index.json element (header/layer/capability/exported live
   * here), or undefined when the node has no index element (header ⇒ missing).
   */
  indexElement?: {
    headerStatus?: string;
    exported?: boolean;
    layer?: string;
    capability?: string;
  };
  /** The query engine, for the ego-graph 1-hop expansion (loaded once). */
  query: CanonicalGraphQuery;
  /**
   * Inbound RESOLVED edges targeting this node (call + import), already
   * collected by the caller from its reverse-adjacency cache. Used for the
   * references + test-linkage facets. Order is the caller's; the assembler
   * sorts deterministically before sampling.
   */
  inboundEdges: ExportedEdge[];
  /** Resolve a sourceId to its node summary (the caller's nodeById.get). */
  resolveSource: (sourceId: string) => SymbolIdentity | undefined;
  /** True when a file path is a test-origin file (the caller's isTestFile). */
  isTestFile: (file: string | undefined) => boolean;
  /** mtime (ms) of the element's own source file, or null if unavailable. */
  elementFileMtimeMs: number | null;
  /** mtime (ms) of graph.json — the freshness baseline. */
  graphMtimeMs: number;
}

export interface SymbolContextOptions {
  /**
   * Per-facet cap (ego-graph directions, ref sample, test sample). Default 25.
   * A cap <= 0 means "no cap" (return everything, never truncated).
   */
  cap?: number;
  /**
   * Annotate ego-graph neighbors with their Phase-3 confidence tier.
   * Default true. Set false for a smaller payload.
   */
  withConfidence?: boolean;
}

/** Stable ordering for reference sites — by `at`, then id (no wall-clock). */
function sortSites(sites: SymbolRefSite[]): SymbolRefSite[] {
  return [...sites].sort((a, b) => {
    const aKey = a.at ?? '';
    const bKey = b.at ?? '';
    if (aKey !== bKey) return aKey < bKey ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Assemble the SymbolContext card from already-loaded inputs. PURE +
 * deterministic: no I/O, no `Date.now`/`Math.random`. Identical inputs ⇒
 * byte-identical card.
 */
export function assembleSymbolContext(
  inputs: SymbolContextInputs,
  opts?: SymbolContextOptions,
): SymbolContext {
  const cap = opts?.cap ?? DEFAULT_CAP;
  const withConfidence = opts?.withConfidence ?? true;
  const sampleLimit = cap > 0 ? cap : Number.POSITIVE_INFINITY;

  const { node, indexElement } = inputs;

  // ---- identity (nodeSummary grade) ----------------------------------------
  const identity: SymbolIdentity = {
    id: node.id,
    name: node.name,
    type: node.type,
    file: node.file,
    line: node.line,
  };

  // ---- header PRESENCE (from the index element; 'missing' = no-data) -------
  const header: SymbolHeader = {
    status: indexElement?.headerStatus ?? 'missing',
    exported: indexElement?.exported ?? false,
    ...(indexElement?.layer !== undefined && { layer: indexElement.layer }),
    ...(indexElement?.capability !== undefined && { capability: indexElement.capability }),
  };

  // ---- neighborhood (the Phase-4 ego-graph, one composed call) -------------
  // resolve() re-derives the NodeResolution for THIS node so egoGraphOf walks
  // the exact subject. A single-node resolution — never a byFile aggregate.
  const resolution = inputs.query.resolve(node.id);
  const neighborhood = egoGraphOf(inputs.query, resolution, { cap, withConfidence });

  // ---- references + test-linkage (one pass over the inbound resolved edges)-
  const callSites: SymbolRefSite[] = [];
  const importSites: SymbolRefSite[] = [];
  const testSites: SymbolRefSite[] = [];
  for (const edge of inputs.inboundEdges) {
    if (edge.relationship !== 'call' && edge.relationship !== 'import') continue;
    const src = edge.sourceId ? inputs.resolveSource(edge.sourceId) : undefined;
    const site: SymbolRefSite = {
      ...(src ?? { id: edge.sourceId ?? '(unknown)', type: 'unknown' }),
      at: edge.sourceLocation ? `${edge.sourceLocation.file}:${edge.sourceLocation.line}` : undefined,
    };
    if (edge.relationship === 'call') callSites.push(site);
    else importSites.push(site);
    // Test-linkage: a ref whose SOURCE file is a test file. Prefer the resolved
    // source node's file; fall back to the edge's sourceLocation file.
    const srcFile = src?.file ?? edge.sourceLocation?.file;
    if (inputs.isTestFile(srcFile)) testSites.push(site);
  }

  const refTotal = callSites.length + importSites.length;
  const orderedRefs = sortSites([...callSites, ...importSites]);
  const references: SymbolReferences = {
    call_site_count: callSites.length,
    import_site_count: importSites.length,
    total: refTotal,
    sample: orderedRefs.slice(0, sampleLimit),
    truncated: orderedRefs.length > sampleLimit,
  };

  const orderedTests = sortSites(testSites);
  const test_linkage: SymbolTestLinkage = {
    test_ref_count: testSites.length,
    sample: orderedTests.slice(0, sampleLimit),
    truncated: orderedTests.length > sampleLimit,
  };

  // ---- staleness (MTIME heuristic — NOT the Phase-8 hash manifest) ---------
  const mtime = inputs.elementFileMtimeMs;
  const stale = mtime !== null && mtime > inputs.graphMtimeMs;
  const staleness: SymbolStaleness = {
    stale,
    basis: 'element-file-mtime-vs-graph',
    ...(mtime === null
      ? { note: 'element file mtime unavailable — freshness unknown; treated as not-stale' }
      : stale
        ? { note: 'element file is newer than graph.json — this card may predate a recent edit; reindex for certainty (mtime heuristic, not a hash-manifest check)' }
        : {}),
  };

  return { identity, header, neighborhood, references, test_linkage, staleness };
}
