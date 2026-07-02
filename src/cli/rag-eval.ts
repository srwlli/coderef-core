#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-rag-eval
 */

/**
 * rag-eval — golden-query eval harness for the RAG index
 * (roadmap PHASE-5.EVAL-HARNESS, WO-RAG-EVAL-HARNESS-001, STUB-4M3KQ9).
 *
 * Runs eval/golden-queries.json through the SAME search modules rag-search
 * uses (SemanticSearchService; provider/store read from rag-index.json
 * metadata) and scores hit@1 / hit@5 / MRR per query plus aggregate. The
 * committed eval/baseline.json is the comparison point for every future
 * ranking change (chunk enrichment, provenance ranking) — measured, not
 * vibed (Phase 5 gating rule).
 *
 * Scoring is FILE-level: a query hits when any expected file appears among
 * the result files at rank <= k. File grain keeps the metric stable across
 * chunk-grain changes.
 *
 * Usage:
 *   rag-eval [--project-dir <path>] [--golden <path>] [--top-k 10]
 *            [--json] [--min-mrr <0-1>]
 *
 * Exit codes: 0 = ran (measurement, not a gate); 1 = --min-mrr floor
 * breached; 2 = setup error (no golden file / no index).
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeSlashes } from '../utils/path-normalize.js';

export interface GoldenQuery {
  id: string;
  query: string;
  expected_files: string[];
}

export interface QueryScore {
  id: string;
  query: string;
  /** 1-based rank of the first expected-file hit, or null when missed. */
  rank: number | null;
  hit1: boolean;
  hit5: boolean;
  /** Reciprocal rank (0 when missed). */
  rr: number;
  top_files: string[];
}

export interface EvalAggregate {
  queries: number;
  hit_at_1: number;
  hit_at_5: number;
  mrr: number;
}

const norm = (f: string | undefined): string => normalizeSlashes((f ?? ''));

/**
 * Rank (1-based) of the first result whose file matches any expected file.
 * Match rule: normalized result file ends with the normalized expected path
 * (tolerates absolute-vs-relative result paths). Duplicate files in the
 * result list collapse to their first occurrence.
 */
export function rankOfFirstHit(resultFiles: Array<string | undefined>, expected: string[]): number | null {
  const exp = expected.map(norm);
  const seen = new Set<string>();
  let rank = 0;
  for (const rf of resultFiles) {
    const f = norm(rf);
    if (!f || seen.has(f)) continue;
    seen.add(f);
    rank++;
    if (exp.some(e => f === e || f.endsWith('/' + e) || f.endsWith(e))) return rank;
  }
  return null;
}

/** Aggregate hit@1 / hit@5 / MRR over per-query ranks. */
export function computeMetrics(ranks: Array<number | null>): EvalAggregate {
  const n = ranks.length;
  if (n === 0) return { queries: 0, hit_at_1: 0, hit_at_5: 0, mrr: 0 };
  let h1 = 0;
  let h5 = 0;
  let rrSum = 0;
  for (const r of ranks) {
    if (r === null) continue;
    if (r <= 1) h1++;
    if (r <= 5) h5++;
    rrSum += 1 / r;
  }
  const round = (x: number) => Math.round(x * 1000) / 1000;
  return {
    queries: n,
    hit_at_1: round(h1 / n),
    hit_at_5: round(h5 / n),
    mrr: round(rrSum / n),
  };
}

interface CliArgs {
  projectDir: string;
  golden: string;
  topK: number;
  json: boolean;
  minMrr?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectDir: process.cwd(),
    golden: '',
    topK: 10,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project-dir' || a === '-p') args.projectDir = argv[++i];
    else if (a === '--golden') args.golden = argv[++i];
    else if (a === '--top-k') args.topK = parseInt(argv[++i], 10);
    else if (a === '--json') args.json = true;
    else if (a === '--min-mrr') args.minMrr = parseFloat(argv[++i]);
  }
  args.projectDir = path.resolve(args.projectDir);
  if (!args.golden) args.golden = path.join(args.projectDir, 'eval', 'golden-queries.json');
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  let golden: { queries: GoldenQuery[] };
  try {
    golden = JSON.parse(fs.readFileSync(args.golden, 'utf8'));
  } catch (e: any) {
    console.error(`[rag-eval] golden file unreadable: ${args.golden} (${e?.message})`);
    process.exit(2);
  }

  const indexMetaPath = path.join(args.projectDir, '.coderef', 'rag-index.json');
  let meta: { provider?: string; store?: string };
  try {
    meta = JSON.parse(fs.readFileSync(indexMetaPath, 'utf8'));
  } catch {
    console.error(`[rag-eval] no RAG index at ${indexMetaPath} — run rag-index first.`);
    process.exit(2);
  }
  const provider = meta.provider ?? 'ollama';

  // Shared factory (P1-10) — same construction path as rag-search, no
  // parallel implementation. Ollama local-only defaults.
  const { createLLMProvider, createVectorStore } = await import('../integration/llm/provider-factory.js');
  let llmProvider: any;
  try {
    llmProvider = await createLLMProvider(provider === 'openai' ? 'openai' : 'ollama');
  } catch (keyErr) {
    console.error(`[rag-eval] index built with ${provider} but its provider could not start: ${keyErr instanceof Error ? keyErr.message : String(keyErr)}`);
    process.exit(2);
  }
  const vectorStore = await createVectorStore(meta.store ?? 'sqlite', args.projectDir, llmProvider, { warnTag: 'rag-eval' });
  await vectorStore.initialize();
  const { SemanticSearchService } = await import('../integration/rag/semantic-search.js');
  const searchService = new SemanticSearchService(llmProvider, vectorStore);

  const scores: QueryScore[] = [];
  for (const q of golden.queries) {
    const response = await searchService.search(q.query, { topK: args.topK });
    const results = (response?.results ?? response ?? []) as any[];
    const files = results.map((r: any) => r.metadata?.file as string | undefined);
    const rank = rankOfFirstHit(files, q.expected_files);
    scores.push({
      id: q.id,
      query: q.query,
      rank,
      hit1: rank !== null && rank <= 1,
      hit5: rank !== null && rank <= 5,
      rr: rank === null ? 0 : Math.round((1 / rank) * 1000) / 1000,
      top_files: [...new Set(files.map(norm))].slice(0, 3),
    });
  }

  const aggregate = computeMetrics(scores.map(s => s.rank));
  const payload = {
    generated_with: { provider, top_k: args.topK, golden: path.basename(args.golden) },
    aggregate,
    per_query: scores,
  };

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`rag-eval — ${golden.queries.length} golden queries (provider: ${provider}, top-k: ${args.topK})\n`);
    for (const s of scores) {
      const mark = s.hit1 ? 'hit@1' : s.hit5 ? `hit@5 (rank ${s.rank})` : s.rank !== null ? `rank ${s.rank}` : 'MISS';
      console.log(`  ${s.id}  ${mark.padEnd(14)} ${s.query}`);
    }
    console.log(`\n  aggregate: hit@1 ${aggregate.hit_at_1}  hit@5 ${aggregate.hit_at_5}  MRR ${aggregate.mrr}`);
  }

  if (args.minMrr !== undefined && aggregate.mrr < args.minMrr) {
    console.error(`[rag-eval] MRR ${aggregate.mrr} below floor ${args.minMrr}`);
    process.exit(1);
  }
}

// Bin-only start (tests import the scoring functions without running main).
if (require.main === module) {
  main().catch(e => {
    console.error('[rag-eval] Fatal:', e);
    process.exit(2);
  });
}
