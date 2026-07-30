/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability dependency-rules-dogfood-tests
 */

/**
 * Dogfood self-check (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P3,
 * STUB-1ZP537): coderef-core commits its OWN .coderef/rules.json and gates CI
 * on it. This suite pins the committed file itself — a future edit that typos
 * a layer name, breaks the schema, or empties the rule set fails HERE (vitest),
 * not just as a red CI gate three steps later.
 *
 * The vocabulary check joins against the repo's own populated graph (the same
 * artifact the gate reads). Absence = no-data: an unpopulated checkout skips
 * that assertion rather than fabricating a verdict — the always-on assertions
 * (parse-clean, non-empty, well-formed pairs) need only the committed file.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseRulesSpec } from '../../src/query/dependency-rules.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RULES_PATH = path.join(REPO_ROOT, '.coderef', 'rules.json');
const GRAPH_PATH = path.join(REPO_ROOT, '.coderef', 'graph.json');

describe('dependency-rules dogfood — the committed .coderef/rules.json', () => {
  it('exists (it is the ONE committed file under .coderef/)', () => {
    expect(fs.existsSync(RULES_PATH)).toBe(true);
  });

  it('parses via parseRulesSpec with ZERO warnings and a non-empty forbid set', () => {
    const raw = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
    const spec = parseRulesSpec(raw);
    expect(spec.warnings).toEqual([]);
    expect(spec.forbid.length).toBeGreaterThan(0);
    // v1 is deliberately forbid-only: an allow-list flips every unlisted pair
    // to a violation (strict mode) — adding one is a deliberate future step.
    expect(spec.allow).toEqual([]);
  });

  it('every rule pair is well-formed (non-empty layers, from !== to, no duplicates)', () => {
    const spec = parseRulesSpec(JSON.parse(fs.readFileSync(RULES_PATH, 'utf8')));
    const seen = new Set<string>();
    for (const r of spec.forbid) {
      expect(r.from.length).toBeGreaterThan(0);
      expect(r.to.length).toBeGreaterThan(0);
      expect(r.from).not.toBe(r.to);
      const key = `${r.from}->${r.to}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('every referenced layer exists in the repo\'s own observed @layer vocabulary (skips when unpopulated — absence=no-data)', () => {
    if (!fs.existsSync(GRAPH_PATH)) {
      console.warn('[dogfood] .coderef/graph.json absent (unpopulated checkout) — vocabulary check skipped, no-data');
      return;
    }
    const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8')) as {
      nodes: Array<{ metadata?: { layer?: string } }>;
    };
    const observed = new Set<string>();
    for (const n of graph.nodes) if (n.metadata?.layer) observed.add(n.metadata.layer);
    expect(observed.size).toBeGreaterThan(0);
    const spec = parseRulesSpec(JSON.parse(fs.readFileSync(RULES_PATH, 'utf8')));
    for (const r of spec.forbid) {
      expect(observed, `rule references unknown source layer "${r.from}"`).toContain(r.from);
      expect(observed, `rule references unknown target layer "${r.to}"`).toContain(r.to);
    }
  });
});
