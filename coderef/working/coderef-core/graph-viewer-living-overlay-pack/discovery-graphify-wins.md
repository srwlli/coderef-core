# /discover report — Where Graphify beats coderef-core, and why

**Generated:** 2026-07-21 · **Depth:** thorough · **Output dest:** working:coderef/working/coderef-core/graph-viewer-living-overlay-pack/discovery-graphify-wins.md · **Dispatch:** none

## 1. Scope

What was asked: `/discover` the categories where Graphify (github.com/safishamsi/graphify, MIT,
YC-S26, read-only clone at $TEMP/graphify-compare, HEAD abff1b1) was BETTER than coderef-core in the
earlier point-by-point comparison, and WHY — then hand the findings to the graph improvement plan,
**separated into function/capability wins (priority) vs visual/experience wins (secondary).**

Bounded to the 5 categories Graphify won in the comparison: (1) language coverage, (2) input modality,
(3) import/reference resolution machinery, (4) visualization/export, (5) external validation. Plus the
one actionable takeaway the operator flagged: `extractors/resolution.py` as STUB-6PGFZ3 prior art.

## 2. Surfaces audited

- [tool: file-read] graphify/extractors/resolution.py (2585 lines; read the resolution CORE lines
  1-1000: tsconfig-alias walk, workspace-manifest resolution, package `exports` map, ESM `.js`->`.ts`,
  index fallback, id-collision disambiguation)
- [tool: grep] graphify/serve.py (trigram index + IDF lexical retrieval + 2000-token subgraph render),
  graphify/analyze.py (god_nodes, surprising_connections, suggest_questions, graph_diff,
  find_import_cycles), graphify/affected.py (DEFAULT_AFFECTED_RELATIONS, BFS blast radius)
- [tool: prior-probe] the delivered comparison table (language breadth, modality, exports, benchmarks)
- WARNING: did NOT read the remaining 1585 lines of resolution.py (per-language collectors) — the
  resolution machinery relevant to coderef sits in the first 1000 lines; noted so the plan's
  READ task re-reads the full file before any port.

## 3. Findings table — the wins, classified

Classification key: **[FN]** = function/capability (priority per operator), **[VX]** = visual/experience.

| # | Category | Graphify win | Why it wins (evidence) | Class | coderef gap |
|---|---|---|---|---|---|
| G-1 | Cross-package resolution | Workspace-manifest resolver: pnpm-workspace.yaml + package.json `workspaces` globs -> package-name map -> `exports`-map/`main`/`module`/`svelte` entry resolution, contained-in-package escape guard | resolution.py `_load_workspace_packages` / `_resolve_workspace_import` / `_package_entry_candidates` (lines 248-427). This is EXACTLY STUB-6PGFZ3's cross-repo/workspace gap, working + MIT-licensed | **[FN]** | coderef has NO workspace/monorepo package resolution; STUB-6PGFZ3 open |
| G-2 | tsconfig path aliases | Recursive tsconfig alias reader: follows `extends` chains (string OR array, TS5), honors `baseUrl`, parses JSONC (comments+trailing commas), longest-prefix wildcard match, tries ALL declared targets in order | resolution.py `_read_tsconfig_aliases`/`_resolve_tsconfig_alias` (86-246). Real projects (SvelteKit/NestJS/Nuxt) rely on this; coderef's resolver misses alias imports entirely | **[FN]** | coderef resolver does not consult tsconfig `paths` — a source of unresolved import edges |
| G-3 | ESM/extension resolution | `.js`->`.ts`, `.jsx`->`.tsx` ESM-convention remap + extensionless + index-file fallback + `.svelte`/`.vue` handling | resolution.py `_resolve_js_import_path` (28-58), `_JS_RESOLVE_EXTS` | **[FN]** | partial in coderef; the `.js`-spelled-`.ts`-source case is a known unresolved class |
| G-4 | Language coverage | ~30 tree-sitter extractors incl. SQL, Terraform, PowerShell, Verilog, Zig, Fortran, Pascal, Apex, Elixir | pyproject.toml grammar deps; earlier probe | **[FN]** | coderef first-classes 3 (ts/js, python, go). Breadth is a genuine gap but LOW leverage for THIS repo |
| G-5 | Input modality | Code + docs + PDF + images + video into one graph (code pass LLM-free; media pass uses the assistant model) | README multi-modal; llm.py/semantic_cleanup.py | **[VX]** | coderef is code+docstrings only. Out of scope for a code-intelligence engine; parked |
| G-6 | Lexical retrieval | Embedding-free retrieval: char-trigram inverted index + IDF scoring + NUL-guarded fields + 2000-token budgeted subgraph render for `query_graph` | serve.py `_get_trigram_index`/`_trigram_candidates`/`_subgraph_to_text` (218-396, 796) | **[FN]** | coderef RAG needs Ollama embeddings; a zero-dependency lexical fallback would make `orient`/`pack_context` work with no embed backend |
| G-7 | "Surprising connections" | Cross-community / cross-language edge surfacer + `suggest_questions` heuristic exploration prompts | analyze.py `surprising_connections`/`suggest_questions` (125-547) | **[FN]** | coderef has hotspots/cycles but no "unexpected coupling" surfacer — genuinely novel, cheap over the existing graph |
| G-8 | Visualization/export | vis.js interactive graph.html, SVG, Obsidian vault, Mermaid call-flow, Neo4j/FalkorDB exporters | README; earlier probe | **[VX]** | coderef viewer is vanilla-canvas with deeper measured overlays but fewer export targets. This is the overlay-pack's existing lane |
| G-9 | External validation | Published cross-system benchmarks (LOCOMO/LongMemEval) + blind dual-judge harness | BENCHMARKS.md | **[FN]** (methodology) | coderef has 2134 tests + no-regress gates but zero external accuracy eval. A resolution-accuracy benchmark harness is the honest gap |

## 4. Type/contract divergences

- Graphify graph is UNDIRECTED `nx.Graph` by default; coderef is directed with typed edges +
  per-edge resolutionStatus/evidence/confidence. coderef's model is STRICTLY richer — no import needed.
  The wins above are all ADDITIVE capabilities, not model changes.
- Graphify confidence = EXTRACTED/INFERRED/AMBIGUOUS (3-value); coderef = 8-value resolutionStatus +
  4-tier confidence. coderef wins on honesty; nothing to port.

## 5. Recommendations with priority

Split into the two buckets the operator asked for. **FUNCTIONS TAKE PRIORITY.**

### Bucket A — FUNCTION/CAPABILITY improvements (priority; port real resolution/analysis power)

| Rec | Priority | Action | Prior art |
|---|---|---|---|
| FN-01 | **high** | Workspace-manifest cross-package resolver (pnpm/npm workspaces -> package map -> exports-map entry) = STUB-6PGFZ3. Port the ALGORITHM (not code) into coderef's import-resolver as a new candidate source | resolution.py 248-427 |
| FN-02 | **high** | tsconfig `paths` alias resolution (extends-chain + baseUrl + JSONC + longest-prefix wildcard) as an import-resolver candidate source | resolution.py 86-246 |
| FN-03 | medium | ESM `.js`->`.ts` + extensionless + index-file resolution completeness in the JS/TS resolver | resolution.py 28-58 |
| FN-04 | medium | Embedding-free lexical retrieval fallback (trigram+IDF) so orient/pack_context degrade gracefully with NO Ollama backend (Ollama-local-only invariant makes this valuable) | serve.py 218-396 |
| FN-05 | medium | `surprising_connections` surface: cross-community/cross-language unexpected-coupling detector over the existing directed graph (surfaces-not-verdicts) | analyze.py 125-269 |
| FN-06 | low | Resolution-accuracy benchmark harness (use the P2 SCIP index as ground truth: measure coderef resolved vs SCIP-resolved at co-located sites) — turns the P2 delta into a repeatable eval | BENCHMARKS.md methodology |
| FN-07 | low | Language-breadth expansion (SQL/Terraform/PowerShell grammars) — real but LOW leverage for the current estate; sequence last | pyproject.toml |

### Bucket B — VISUAL / EXPERIENCE additions (secondary; the existing overlay-pack lane)

| Rec | Priority | Action | Prior art |
|---|---|---|---|
| VX-01 | medium | Export targets: Mermaid call-flow + Obsidian vault + Neo4j/FalkorDB emitters from the coderef graph | README exporters |
| VX-02 | low | vis.js-style interactive HTML as an alternative viewer render | README graph.html |
| VX-03 | low | `suggest_questions`-style exploration prompts in the viewer detail panel | analyze.py 420-547 |

> These slot UNDER the existing STUB-FYR4J9 living-overlay visual items (BFS pulse, lens presets,
> highway edges, community hulls) — same bucket, same priority tier.

## 6. Reuse template note

Canonical /discover output; §3/§5 tables are the machine-readable handoff to PLAN.md. FN-* are the
priority function bucket; VX-* the secondary visual bucket. STUB-6PGFZ3 == FN-01+FN-02+FN-03 (the
resolution triad) — this discovery is its prior-art read.
