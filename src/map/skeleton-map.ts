/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-skeleton-render
 * @exports SkeletonElement, SkeletonMapOptions, SkeletonMapResult, renderSkeletonMap, emitSkeleton
 * @used_by src/cli/coderef-map.ts, src/cli/coderef-mcp-server.ts
 */

/**
 * Skeleton map — token-budgeted, centrality-ranked plaintext repo map
 * (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 1, aider repo-map /
 * repomix --compress pattern).
 *
 * Renders the FILE-level map projection down to a prompt-injectable text
 * artifact: files ranked by dependency centrality, each carrying its top
 * exported symbol signatures, deterministically fitted to a token budget with
 * every truncation declared. PURE renderer over already-projected MapData —
 * no `.coderef/` reads in renderSkeletonMap (emitSkeleton, the CLI/MCP shared
 * wrapper, owns the optional index.json signature enrichment and the
 * skeleton.md write). No Date.now, no Math.random: identical inputs produce
 * byte-identical text.
 *
 * Budget fit is two-pass prefix-then-upgrade: pass 1 includes ranked files at
 * path-only cost (the included set is a rank-prefix, so a larger budget always
 * yields a superset — budget monotonicity); pass 2 spends leftover budget
 * upgrading included files in rank order path-only -> names -> signatures.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MapData } from './project-map-data.js';

/** Element detail consumed for signature rendering (raw index.json shape subset). */
export interface SkeletonElement {
  name: string;
  type: string;
  file: string;
  line: number;
  exported?: boolean;
  parameters?: string[];
  async?: boolean;
}

export interface SkeletonMapOptions {
  /** Token budget the rendered text is fitted to (default 1600). */
  tokenBudget?: number;
  /** Max exported symbols rendered per file (default 8). */
  maxSymbolsPerFile?: number;
  /**
   * Raw index.json elements for parameter/async signature detail. Absent =
   * degrade to the MapData embedded elements (names, no parameters) and
   * declare the degradation.
   */
  indexElements?: SkeletonElement[];
}

export interface SkeletonMapResult {
  text: string;
  /** ceil(chars/4) estimate of the emitted text. */
  estimatedTokens: number;
  tokenBudget: number;
  includedFiles: number;
  omittedFiles: number;
  /** Every truncation/degradation declared (mirrors the ## truncation section). */
  warnings: string[];
}

const TOKEN_BUDGET_DEFAULT = 1600;
const MAX_SYMBOLS_DEFAULT = 8;
/** Reserved from the budget for the trailing ## truncation section (covers its worst case, ~4 lines). */
const TRUNCATION_RESERVE_TOKENS = 90;

/** Deterministic ~4-chars/token estimate (documented heuristic, not a tokenizer). */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function renderSignature(el: SkeletonElement): string {
  const params = Array.isArray(el.parameters) ? el.parameters.join(', ') : '';
  switch (el.type) {
    case 'function':
      return `${el.async ? 'async ' : ''}fn ${el.name}(${params})`;
    case 'method':
      return `${el.async ? 'async ' : ''}method ${el.name}(${params})`;
    case 'component':
      return `component ${el.name}(${params})`;
    case 'class':
      return `class ${el.name}`;
    case 'interface':
      return `interface ${el.name}`;
    case 'type':
      return `type ${el.name}`;
    case 'constant':
      return `const ${el.name}`;
    default:
      return `${el.type} ${el.name}`;
  }
}

interface RankedFile {
  id: string;
  inDeg: number;
  outDeg: number;
  hotspotScore: number;
  /** Exported elements, line-asc, uncapped (capped at render time). */
  symbols: SkeletonElement[];
}

/** Tier costs/lines for one file. Tier 0 = signatures, 1 = names, 2 = path-only. */
interface FileTiers {
  lines: [string[], string[], string[]];
  costs: [number, number, number];
}

function buildTiers(file: RankedFile, maxSymbols: number): { tiers: FileTiers; symbolsTruncated: boolean } {
  const headLine = `${file.id}  (in ${file.inDeg} / out ${file.outDeg})`;
  const shown = file.symbols.slice(0, maxSymbols);
  const symbolsTruncated = file.symbols.length > maxSymbols;

  const sigLines = [headLine, ...shown.map(s => `  ${renderSignature(s)}`)];
  const nameLines = [headLine];
  if (shown.length > 0) {
    const suffix = symbolsTruncated ? `, +${file.symbols.length - maxSymbols} more` : '';
    nameLines.push(`  exports: ${shown.map(s => s.name).join(', ')}${suffix}`);
  }
  const pathLines = [headLine];

  const lines: [string[], string[], string[]] = [sigLines, nameLines, pathLines];
  const costs: [number, number, number] = [
    estimateTokens(sigLines.join('\n') + '\n\n'),
    estimateTokens(nameLines.join('\n') + '\n\n'),
    estimateTokens(pathLines.join('\n') + '\n\n'),
  ];
  return { tiers: { lines, costs }, symbolsTruncated };
}

/**
 * Render the skeleton map text from projected MapData. Pure and deterministic:
 * output depends only on (data.nodes, data.edges, options).
 */
export function renderSkeletonMap(data: MapData, options: SkeletonMapOptions = {}): SkeletonMapResult {
  const tokenBudget = options.tokenBudget ?? TOKEN_BUDGET_DEFAULT;
  const maxSymbols = options.maxSymbolsPerFile ?? MAX_SYMBOLS_DEFAULT;
  const warnings: string[] = [];

  // ---- exported-symbol detail: raw index elements, else MapData fallback ----
  const symbolsByFile = new Map<string, SkeletonElement[]>();
  let signatureDetail = false;
  if (Array.isArray(options.indexElements) && options.indexElements.length > 0) {
    signatureDetail = true;
    for (const el of options.indexElements) {
      if (!el || el.exported !== true || !el.file || !el.name) continue;
      const file = String(el.file).replace(/\\/g, '/');
      let list = symbolsByFile.get(file);
      if (!list) {
        list = [];
        symbolsByFile.set(file, list);
      }
      list.push(el);
    }
  } else {
    for (const n of data.nodes) {
      const exported = n.elements.filter(e => e.exported === true);
      if (exported.length > 0) {
        symbolsByFile.set(
          n.id,
          exported.map(e => ({ name: e.name, type: e.type, file: n.id, line: e.line, exported: true })),
        );
      }
    }
    warnings.push('signature detail unavailable (no index elements); exported names only');
  }
  for (const list of symbolsByFile.values()) {
    list.sort((a, b) => a.line - b.line || (a.name < b.name ? -1 : 1));
  }

  // ---- full centrality ranking (analytics.top lists are capped; recompute) --
  const inNb = new Map<string, Set<string>>();
  const outNb = new Map<string, Set<string>>();
  for (const n of data.nodes) {
    inNb.set(n.id, new Set());
    outNb.set(n.id, new Set());
  }
  for (const e of data.edges) {
    if (!inNb.has(e.target) || !outNb.has(e.source) || e.source === e.target) continue;
    outNb.get(e.source)!.add(e.target);
    inNb.get(e.target)!.add(e.source);
  }
  const ranked: RankedFile[] = data.nodes
    .map(n => ({
      id: n.id,
      inDeg: inNb.get(n.id)!.size,
      outDeg: outNb.get(n.id)!.size,
      hotspotScore: n.hotspotScore,
      symbols: symbolsByFile.get(n.id) || [],
    }))
    .sort(
      (a, b) =>
        b.inDeg - a.inDeg ||
        b.inDeg + b.outDeg - (a.inDeg + a.outDeg) ||
        b.hotspotScore - a.hotspotScore ||
        (a.id < b.id ? -1 : 1),
    );

  // ---- header (always emitted, even over a tiny budget) ----------------------
  const header =
    `# repo map (skeleton): ${data.meta.repoName} — ${data.nodes.length} files, ` +
    `${data.edges.length} edges — budget ~${tokenBudget} tokens\n` +
    `# ranked by dependency centrality (most depended-on first); in/out = distinct dependents/dependencies. ` +
    `surfaces, not verdicts.\n\n`;
  const headerCost = estimateTokens(header);

  if (ranked.length === 0) {
    const text = header + '(empty graph — no files to map)\n';
    return {
      text,
      estimatedTokens: estimateTokens(text),
      tokenBudget,
      includedFiles: 0,
      omittedFiles: 0,
      warnings,
    };
  }

  const fitBudget = tokenBudget - headerCost - TRUNCATION_RESERVE_TOKENS;
  if (fitBudget <= 0) {
    warnings.push(`token budget ${tokenBudget} below fixed overhead (~${headerCost + TRUNCATION_RESERVE_TOKENS}); header only`);
  }

  // ---- pass 1: path-only prefix inclusion (monotone file set) ---------------
  // Breadth is capped at half the fit budget so pass 2 always has depth budget
  // left — otherwise a large repo renders as a pure path list with no
  // signatures. Half of a larger budget is still larger, so the included file
  // set stays budget-monotone.
  const tiersByFile = new Map<string, FileTiers>();
  let symbolTruncatedCount = 0;
  for (const f of ranked) {
    const { tiers, symbolsTruncated } = buildTiers(f, maxSymbols);
    tiersByFile.set(f.id, tiers);
    if (symbolsTruncated) symbolTruncatedCount++;
  }
  const breadthBudget = Math.floor(fitBudget / 2);
  let spent = 0;
  let includedCount = 0;
  for (const f of ranked) {
    const cost = tiersByFile.get(f.id)!.costs[2];
    if (spent + cost > breadthBudget) break;
    spent += cost;
    includedCount++;
  }

  // ---- pass 2: upgrade included files in rank order --------------------------
  // Without index-derived signature detail the signatures tier would render
  // misleading zero-arg forms — cap upgrades at the names tier.
  const tierCandidates = signatureDetail ? [0, 1] : [1];
  const tierChoice: number[] = new Array(includedCount).fill(2);
  for (let i = 0; i < includedCount; i++) {
    const costs = tiersByFile.get(ranked[i].id)!.costs;
    for (const tier of tierCandidates) {
      const upgradeCost = costs[tier] - costs[2];
      if (upgradeCost <= 0 || spent + upgradeCost <= fitBudget) {
        spent += Math.max(0, upgradeCost);
        tierChoice[i] = tier;
        break;
      }
    }
  }

  // ---- assemble ---------------------------------------------------------------
  const body: string[] = [];
  let reducedDetailCount = 0;
  for (let i = 0; i < includedCount; i++) {
    const tiers = tiersByFile.get(ranked[i].id)!;
    const tier = tierChoice[i];
    if (tier > 0 && ranked[i].symbols.length > 0) reducedDetailCount++;
    body.push(tiers.lines[tier].join('\n'));
  }
  const omittedFiles = ranked.length - includedCount;

  const truncationLines: string[] = [];
  if (omittedFiles > 0) {
    truncationLines.push(`- omitted ${omittedFiles} of ${ranked.length} files beyond token budget (raise the budget to include more)`);
  }
  if (reducedDetailCount > 0) {
    truncationLines.push(`- ${reducedDetailCount} included files listed with reduced detail (names or path only)`);
  }
  if (symbolTruncatedCount > 0) {
    truncationLines.push(`- symbol lists capped at ${maxSymbols} exported symbols (${symbolTruncatedCount} files affected)`);
  }
  if (!signatureDetail) {
    truncationLines.push('- signature detail unavailable (no index elements); exported names only');
  }
  warnings.push(
    ...truncationLines
      .filter(l => !l.includes('signature detail')) // already pushed above when applicable
      .map(l => l.replace(/^- /, '')),
  );

  let text = header + body.join('\n\n') + (body.length > 0 ? '\n' : '');
  if (truncationLines.length > 0) {
    text += '\n## truncation\n' + truncationLines.join('\n') + '\n';
  }

  return {
    text,
    estimatedTokens: estimateTokens(text),
    tokenBudget,
    includedFiles: includedCount,
    omittedFiles,
    warnings,
  };
}

export interface EmitSkeletonResult extends SkeletonMapResult {
  /** Path of the written skeleton.md (inside the map out dir). */
  skeletonPath: string;
}

/**
 * Shared CLI/MCP emission wrapper (one write path, parity precedent): loads
 * raw index elements best-effort for signature detail, renders, writes
 * `skeleton.md` into the map out dir (confined to `.coderef/map/` by default).
 */
export function emitSkeleton(
  projectRoot: string,
  data: MapData,
  outDir?: string,
  options: SkeletonMapOptions = {},
): EmitSkeletonResult {
  let indexElements: SkeletonElement[] | undefined;
  const indexPath = path.join(projectRoot, '.coderef', 'index.json');
  if (fs.existsSync(indexPath)) {
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      if (Array.isArray(index.elements)) indexElements = index.elements;
    } catch {
      // degrade silently — renderSkeletonMap declares the missing detail
    }
  }
  const result = renderSkeletonMap(data, {
    ...options,
    ...(indexElements && !options.indexElements ? { indexElements } : {}),
  });
  const out = outDir || path.join(projectRoot, '.coderef', 'map');
  fs.mkdirSync(out, { recursive: true });
  const skeletonPath = path.join(out, 'skeleton.md');
  fs.writeFileSync(skeletonPath, result.text, 'utf-8');
  return { ...result, skeletonPath };
}
