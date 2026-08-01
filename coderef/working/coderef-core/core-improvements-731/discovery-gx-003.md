# /discover report — GX-003 symbol-level rename refactor write tool gap (rename-planner rename-applier coderef-rename rename_preview MCP write scope)

**Generated:** 2026-08-01T07:54:27Z
**Depth:** medium
**Output dest:** working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-gx-003.md
**Dispatch:** none

## 1. Scope

What was asked: `GX-003 symbol-level rename refactor write tool gap (rename-planner rename-applier coderef-rename rename_preview MCP write scope)`.
What was bounded: the existing rename surface (src/refactor/, src/cli/coderef-rename.ts, MCP rename_preview) plus the design constraints for closing the gap.

**Operator design inputs (2026-08-01, recorded at discovery time):**
1. **Mirrored surfaces** — whatever ships must exist as CLI + MCP parity (the ecosystem norm locked by the genre-feature-extraction program P6: 5 tools shipped CLI/MCP-mirrored).
2. **First write capability** — this would be the FIRST MCP tool that writes SOURCE files. Every current MCP write is confined to `.coderef/` (reindex, rag_index, map, metrics snapshot). Crossing that line is the actual design problem; the rename mechanics already exist.

## 2. Surfaces audited

- [tool: skeleton-map]          present (cached), 30 lines
- [tool: rg]                    queries=1, hits=0
- [tool: rag-search]            top-k=10, ms=898, lane=hybrid, fallback_used=false
- [tool: element-lookup]        source=symbol-table (rag-search --lexical), candidates=10, elements_indexed=3190
- [tool: header-index]          defined=366, missing=5, stale=1, coverage=98.12% (validation-report.json)
- [tool: foundation-docs]       sections_matched=8
- [tool: codebase_summary]      elements=3190, top types: function=1092, method=965, interface=611, generated=2026-08-01T07:13:03.585Z
- [tool: validation_status]     resolution_rate=22.41%, unresolved=18249, ambiguous=1722, header_coverage=98.12%
- *Agent-added:* contract reads of src/refactor/rename-planner.ts, src/refactor/rename-applier.ts, src/cli/coderef-rename.ts headers + usage; MCP tool location grep; GX-002 close-commit evidence (653b9db).
- WARNING: RAG leg returned 4/10 hits as unlabeled `? @ line ?` placeholders (observability defect in hit rendering; kaizen-logged).

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| src/cli/coderef-rename.ts | Write path ALREADY EXISTS as CLI: dry-run default, `--apply` atomic writes, `--force-ambiguous`, `--min-confidence`, `--project-dir` | info | "DRY RUN is the default ... --apply performs atomic writes" |
| src/refactor/rename-planner.ts:73 | `planRename` resolves declaration + reference sites from canonical graph.json; sites carry confidence tier (exact/heuristic) | info | `planRename`, `RenamePlan`, `RenameSite` (element-lookup top-5) |
| src/refactor/rename-applier.ts | SHADOW GUARD: graph is line-grained (NO columns) → word-boundary regex re-tokenization; over-attributed lines skipped as ambiguous | warning | "rewriting it could corrupt an unrelated symbol ... flagged AMBIGUOUS and left UNCHANGED" |
| src/cli/mcp/context-tools.ts | MCP `rename_preview` lives here (read-only); server contract states "no tool here writes source files; rename --apply is CLI-only by design" | info | standing design ruling — reversing it needs an operator ruling recorded as supersession |
| .coderef/validation-report.json | Rename RECALL is bounded by graph resolution: 22.41% resolved, 18,249 unresolved — sites the graph did not resolve silently survive a rename | **critical** | validation_status line above |
| GX-002 close (653b9db) | The scope-stack binding pass shipped but moved resolution only 22.11% → 22.24% (+14 scope_binding wins) — the 10,691-edge receiver class did NOT collapse; GX-002 P1 was a first slice, FU-1..4 follow-ups in its analysis.json | **critical** | close-commit message, 2026-08-01 |
| src/refactor/ (whole module) | Rename is the ONLY refactor verb — no extract-function/extract-variable/inline/move; those need real AST manipulation, a different machinery class than the line rewriter | warning | module inventory |
| Precedent: genre-extraction P6 | CLI/MCP parity pattern + `.coderef-write` scope confinement already established — the template for how a gated write scope is declared | info | WO-GENRE-FEATURE-EXTRACTION-PROGRAM-001, closed 2026-07-10 |

## 4. Type/contract divergences

Not applicable for depth=medium.

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | high | OPERATOR RULING FIRST: record a supersession of the "MCP never writes source" ruling, scoped to exactly one tool (`rename_apply`), before any build. The ruling text should name the safety envelope (REC-002) as its condition. | CODEREF-CORE (operator) |
| REC-002 | high | Design the safety envelope for the first source-write MCP tool, mirroring the CLI's affordances: `apply:false` default (pure preview, byte-identical to rename_preview), explicit `apply:true` opt-in, `project_root` required (repo-agnostic norm), ambiguous lines NEVER rewritten over MCP (no force-ambiguous mirror — CLI-only escape hatch), response returns per-file rewrite counts + skipped-ambiguity list, writes atomic (existing writeTextAtomic). | CODEREF-CORE |
| REC-003 | high | Ship as MIRRORED surfaces in one WO: MCP `rename_apply` + CLI unchanged (already exists) — parity means the MCP tool delegates to the same planRename/applyRename modules, zero forked logic. Both adjacency-index gotchas do not apply (no new edge kind), but MCP tool count + docs/CLI.md + SKILL surfaces must all update together. | CODEREF-CORE |
| REC-004 | medium | Precision leg (sequenceable before or with REC-003): column-precise spans via tree-sitter for attributed lines, to shrink the shadow-guard skip rate before agents drive writes at scale. Line-grained + regex is acceptable for v1 ONLY because ambiguous lines are skipped, never guessed. | CODEREF-CORE |
| REC-005 | medium | Recall dependency: a rename is only as complete as the graph. Continue GX-002 follow-up slices (FU-1..4 in its analysis.json) — at 22.41% resolution a project-wide rename misses most unresolved reference sites; surface this bound in the tool's response (`unresolved_edges` count) so callers see the blind spot. | CODEREF-CORE |
| REC-006 | low | Additional refactor verbs (extract-function, inline, move-symbol) are OUT of GX-003 scope — separate stubs later; they need AST rewriting machinery the current line rewriter cannot provide. | CODEREF-CORE |

## 6. Reuse template note

This report follows the canonical `/discover` 6-section shape. Downstream tooling can grep for `## N.` markers to extract sections.

To reproduce this exact audit: `/discover "GX-003 symbol-level rename refactor write tool gap (rename-planner rename-applier coderef-rename rename_preview MCP write scope)" --depth=medium --output-dest=working:C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/working/coderef-core/core-improvements-731/discovery-gx-003.md`.
