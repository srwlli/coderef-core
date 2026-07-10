/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability context-packer
 * @exports PackManifestEntry, PackManifest, PackResult, packContext
 * @used_by src/cli/coderef-pack.ts
 */

/**
 * context-packer — dependency-closure context packing over the canonical
 * `.coderef/graph.json`.
 *
 * COMPOSES existing pieces: resolves a focus element on the canonical graph
 * (src/query/canonical-graph.ts), walks its transitive outbound dependency
 * closure (dependenciesOf, returned closest-first), reads each element's
 * source as a bounded line-window (mirroring the MCP source_of reader —
 * index/graph carry a start line only, no end), and packs them into one
 * text bundle. The focus block is placed FIRST and UNCOMPRESSED; each
 * dependency is compressed with the shared structure-preserving primitive
 * (src/context/token-compress.ts) and admitted only while a running token
 * total stays under budget. Everything not admitted is recorded in
 * `manifest.dropped` — nothing is silently omitted.
 *
 * Read-only: reads source files, writes NOTHING to disk. Local only — no
 * LLM, no network.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadCanonicalGraph } from '../query/canonical-graph.js';
import type { CanonicalNode } from '../query/canonical-graph.js';
import { estimateTokens, compressStructurePreserving } from './token-compress.js';

export interface PackManifestEntry {
  id: string;
  name?: string;
  file?: string;
  estTokens: number;
  compressed: boolean;
}

export interface PackManifest {
  focus: string;
  included: PackManifestEntry[];
  dropped: PackManifestEntry[];
  estTokens: number;
  budget: number;
  /**
   * Bundle est-tokens divided by the est-tokens of the same INCLUDED elements
   * read uncompressed (focus + every admitted dependency at full window). A
   * ratio < 1 means compression shed tokens; 1 means no compression happened
   * (e.g. a trivially small pack whose deps all fit uncompressed). Defined over
   * included-only so it is not skewed by dropped deps that never entered the
   * bundle. Falls back to 1 when the uncompressed baseline is 0.
   */
  compressionRatio: number;
}

export interface PackResult {
  bundle: string;
  manifest: PackManifest;
}

/**
 * Read a bounded line-window of an element's source, mirroring the MCP
 * source_of reader: absolutize the (possibly project-relative posix) path,
 * readFileSync, slice `window` lines from the element's start line. On any
 * read error the element's source is treated as an unreadable stub so a single
 * bad file never crashes the whole pack.
 */
function readWindow(
  projectDir: string,
  node: CanonicalNode,
  window: number,
): string {
  if (typeof node.file !== 'string' || node.file.length === 0) {
    return '// <no source: element has no file>';
  }
  // The graph stores project-relative posix paths for most nodes and an
  // absolute path for some; normalize to an on-disk path.
  const absFile = path.isAbsolute(node.file)
    ? node.file
    : path.resolve(projectDir, node.file);
  let content: string;
  try {
    content = fs.readFileSync(absFile, 'utf8');
  } catch {
    return '// <unreadable>';
  }
  const lines = content.split('\n');
  const startLine = node.line ?? 1;
  const lo = Math.max(0, startLine - 1);
  const hi = Math.min(lines.length, lo + Math.max(1, window));
  return lines.slice(lo, hi).join('\n');
}

/** Render one element's bundle header (readable, machine-parseable). */
function header(node: CanonicalNode, role: 'focus' | 'dependency', compressed: boolean): string {
  const loc = `${node.file ?? '<no-file>'}:${node.line ?? '?'}`;
  const tags = compressed ? `${role}, compressed` : role;
  return `// ==== ${node.id} (${loc}) [${tags}] ====`;
}

/**
 * Pack the dependency closure of `focus` into a single text bundle under a
 * token budget.
 *
 * - `tokenBudget` default 8000; `window` (source lines per element) default 40.
 * - The focus element is always included (uncompressed, first) even if it alone
 *   exceeds the budget — noted in the manifest via `manifest.estTokens`.
 * - Dependencies are admitted closest-first while the running token total plus
 *   the next compressed dep stays within budget; the first dep that would
 *   overflow and every dep after it are recorded in `manifest.dropped`.
 *
 * Throws `Error('focus not found: ' + focus)` when the focus resolves to zero
 * nodes.
 */
export function packContext(
  projectDir: string,
  focus: string,
  opts?: { tokenBudget?: number; window?: number; compressDeps?: boolean },
): PackResult {
  const tokenBudget = opts?.tokenBudget ?? 8000;
  const window = opts?.window ?? 40;
  // Dependencies are compressed to their signature skeleton BY DEFAULT (operator
  // ruling 2026-07-10): the whole point of packing is to spend the budget on the
  // focus + the SHAPE of its deps, not their full bodies. --full-deps
  // (compressDeps=false) opts back into full dependency windows.
  const compressDeps = opts?.compressDeps ?? true;

  const q = loadCanonicalGraph(projectDir);
  const res = q.resolve(focus);
  if (res.nodes.length === 0) {
    throw new Error('focus not found: ' + focus);
  }

  // Focus node = first resolved node.
  const focusNode = res.nodes[0];
  const focusSummary: CanonicalNode = {
    id: focusNode.id,
    name: focusNode.name,
    type: focusNode.type,
    file: focusNode.file,
    line: focusNode.line,
  };

  const blocks: string[] = [];
  const included: PackManifestEntry[] = [];
  const dropped: PackManifestEntry[] = [];

  // Running total of the bundle's est-tokens (headers + rendered source).
  let runningTokens = 0;
  // Uncompressed baseline over the SAME included elements, for compressionRatio.
  let uncompressedIncludedTokens = 0;

  // --- Focus block: UNCOMPRESSED, FIRST, always included. ---
  const focusSource = readWindow(projectDir, focusSummary, window);
  const focusBlock = `${header(focusSummary, 'focus', false)}\n${focusSource}`;
  blocks.push(focusBlock);
  const focusBlockTokens = estimateTokens(focusBlock);
  runningTokens += focusBlockTokens;
  uncompressedIncludedTokens += focusBlockTokens;
  included.push({
    id: focusSummary.id,
    name: focusSummary.name,
    file: focusSummary.file,
    estTokens: focusBlockTokens,
    compressed: false,
  });

  // --- Dependencies: closest-first (dependenciesOf returns BFS-ish order). ---
  const deps = q.dependenciesOf(res);
  let budgetExhausted = false;
  for (const dep of deps) {
    // Skip the focus node itself and any node without a file.
    if (dep.id === focusSummary.id) continue;
    if (typeof dep.file !== 'string' || dep.file.length === 0) continue;

    const depSource = readWindow(projectDir, dep, window);
    const remainingBudget = Math.max(0, tokenBudget - runningTokens);
    // force: compress deps to their skeleton even when they'd fit the remaining
    // budget uncompressed (compressDeps default true). --full-deps flips this off.
    const { text: compressedSource, truncated } = compressStructurePreserving(
      depSource,
      remainingBudget,
      { force: compressDeps },
    );
    // A dep is "compressed" if its body was shed (compressDeps on and the source
    // actually shrank) OR it was hard-truncated to fit. Body-shed with no size
    // change (e.g. an all-signature dep) reports uncompressed — honest.
    const depCompressed = truncated || (compressDeps && compressedSource.length < depSource.length);
    const depBlock = `${header(dep, 'dependency', depCompressed)}\n${compressedSource}`;
    const depTokens = estimateTokens(depBlock);

    // BUDGET TRIM: if admitting this dep would exceed the budget, STOP — record
    // this dep and all remaining deps as dropped (never silently omit).
    if (budgetExhausted || runningTokens + depTokens > tokenBudget) {
      budgetExhausted = true;
      dropped.push({
        id: dep.id,
        name: dep.name,
        file: dep.file,
        estTokens: depTokens,
        compressed: depCompressed,
      });
      continue;
    }

    blocks.push(depBlock);
    runningTokens += depTokens;
    // Baseline for ratio: the same dep read uncompressed (full window block).
    const uncompressedDepBlock = `${header(dep, 'dependency', false)}\n${depSource}`;
    uncompressedIncludedTokens += estimateTokens(uncompressedDepBlock);
    included.push({
      id: dep.id,
      name: dep.name,
      file: dep.file,
      estTokens: depTokens,
      compressed: depCompressed,
    });
  }

  const bundle = blocks.join('\n\n');
  const bundleTokens = estimateTokens(bundle);
  const compressionRatio =
    uncompressedIncludedTokens > 0 ? bundleTokens / uncompressedIncludedTokens : 1;

  return {
    bundle,
    manifest: {
      focus,
      included,
      dropped,
      estTokens: bundleTokens,
      budget: tokenBudget,
      compressionRatio,
    },
  };
}
