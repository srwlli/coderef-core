# /discover report — line-anchor rot in resource sheets, and the fix

**Generated:** 2026-08-01T18:05:00Z
**AMENDED:** 2026-08-01T19:20:00Z and 2026-08-01T20:05:00Z — see §0. The original REC-001 was WRONG, the original evidence UNDERCOUNTED, and the second amendment's "7 unbindable/ERR sheets" turned out to be a CHECKER DEFECT, not sheet defects (TKT-017SAB).
**Depth:** medium
**Output dest:** working:coderef/working/coderef-core/resource-sheet-anchor-rot/discovery.md
**Dispatch:** none

## 0. Amendment notice (read this first)

The first draft of this report proposed **building** a mechanical anchor check. That was wrong: **`check-sheet-drift.mjs` already exists**, already validates line anchors, and catches every case this report describes. It ships inside `SKILLS/DOCUMENTATION/generate-resource-sheet/` and runs at **authoring time** only — nothing re-runs it once a sheet lands. The fix is **wiring an existing detector into the recurring gate**, not writing a new one.

Three further corrections:

1. **The evidence undercounted.** My ad-hoc audit resolved symbols against *top-level source declarations*; the canonical checker resolves against *indexed elements* and is stricter. Re-running the canonical checker over all 74 sheets found **13 failing sheets / 68 stale citation lines**, against my prototype's 7 / 43. Every number in §3 is now the checker's.
2. **Ownership was too coarse.** Of CORE's 74 sheets, **53 were authored by Codex, 14 by LLOYD, 5 by Claude models**. Of the failing sheets, the split is mixed. The rot originates in the shared model-free projector (`project-spine.mjs`), so it is **authoring-path-agnostic** — not a LLOYD problem and not a local-model quality problem.
3. **The strictness bit me.** Repairing the `mcp_shared` sheet by hand, I anchored `ensureArtifacts` to its source declaration line. The checker rejected it: a citation must resolve to an **INDEXED element**, and that function is module-private. Correct form is a bare path ref. Fixed in `da07589`.

### Amendment 2 (2026-08-01T20:05Z) — the 7 "bad sheets" were 0 bad sheets

Diagnosing the leftovers dissolved both groups:

4. **The "3 ERR sheets" were WARN, not errors** — my sweep script only grepped for `PASS|FAIL|SKIP`, so `WARN` fell through to `ERR`. They are CLI entrypoints (`index.ts`, `coderef-analyze.ts`, `validate-routes.ts`) that export nothing, so "no Public API to validate" is honest no-data. `coderef_analyze` in fact PASSES anchors 33/33. **Instrument error, mine.**
5. **The 4 `module-resolvable` failures are a CHECKER BUG, not missing frontmatter.** All four DO carry valid `documents:` frontmatter. The frontmatter matcher in `documentedModule()` (check-sheet-drift.mjs:46) accepts a bare LF before and after the `---` fence only, so on a CRLF file the block never matches and `documents:` is invisible. 6 of 74 sheets are CRLF. Sheets carrying `[ref]` citations bind through the fallback and mask it (`mcp_shared` is CRLF and PASSES); only citation-less sheets surface it. A second latent bug sits in the same function: the `documents:` key matcher is **scalar-only**, so a list-form `documents:` also reads as absent. Filed **`TKT-017SAB`** (ecosystem, routed DEBUG).

The corrected corpus verdict: **58 PASS · 9 genuinely-failing on stale anchors · 4 blocked by TKT-017SAB · 3 WARN/no-data**. Not one of the 74 sheets is defective in the way the first two drafts implied.

**Ordering consequence:** `TKT-017SAB` now BLOCKS `STUB-34YBWR`. Wiring a CRLF-blind checker into the recurring gate would propagate a false "author didn't write frontmatter" verdict fleet-wide.

**Stubs/tickets filed:** `STUB-34YBWR` (STANDARDS — wire the gate) · `STUB-XCBFHY` (LLOYD — frontier authoring path) · `TKT-017SAB` (DEBUG — CRLF/scalar frontmatter parsing).

## 1. Scope

What was asked: line-anchored `[ref](path:LINE)` citations rot on every insertion above them; 74 sheets carry them. Is this systemic, and what is the fix?

What was bounded: the resource-sheet corpus in CODEREF-CORE, the STANDARDS-owned kind checker, and the authoring/remediation runners. Not bounded: foundation docs and skill docs, which share the citation form and were never measured.

## 2. Surfaces audited

- [tool: check-sheet-drift.mjs] **the canonical instrument**, run across all 74 sheets — **58 PASS / 13 FAIL / 3 WARN** (9 of the 13 fail on genuinely stale anchors; the other 4 are TKT-017SAB)
- [tool: ad-hoc anchor audit] `anchor-audit-prototype.py` — superseded by the above; retained only to show the undercount
- [tool: rg + read] `kinds/resource-sheet/check.mjs` (8 checks), `author-sheet.mjs`, `project-spine.mjs`, `remediate-sheet.mjs`, `kind.json` v1.2.0
- [tool: registry] `TRACKING/stubs.json` (9 resource-sheet stubs), `agent-domains.json` (LLOYD definition)
- [tool: frontmatter scan] `agent:` field across all 74 sheets — authorship distribution
- [tool: line-ending correlation] CRLF vs the checker's LF-only frontmatter regex across all 74 sheets — the decisive test for the `module-resolvable` failures
- RESOLVED: the 3 sheets first reported as ERR are WARN (no exports to validate); the error was in my sweep's verdict parsing, not the sheets.

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| 74-sheet corpus | **13 sheets FAIL the canonical drift checker; 68 stale citation lines** — one day after the corpus was authored | critical | checker sweep |
| `call_resolver` / `graph_builder` / `coderef_mcp_server` | 14 / 12 / 12 stale citations each; drift up to 121 lines | critical | checker output |
| `SCRIPTS`, `import_resolver`, `orchestrator`, `Setup-Coderef-Dir`, `canonical_graph`, `graph_tools` | 10 / 9 / 5 / 3 / 2 / 1 stale | warning | checker output |
| 4 sheets (`Pattern-Detection-System`, `File-Generation-System`, `Dependency-Graph-Builder`, `Context-Generator`) | FAIL `drift.module-resolvable` — **NOT a sheet defect**. All four carry valid `documents:` frontmatter; the checker's frontmatter regex is LF-only and cannot see it on a CRLF file. TKT-017SAB | critical | check-sheet-drift.mjs:46 |
| 6 of 74 sheets are CRLF | `[ref]`-bearing CRLF sheets bind via the citation fallback and MASK the bug (`mcp_shared` is CRLF and PASSES); only citation-less ones expose it | warning | line-ending correlation |
| 3 sheets reported "ERR" | **Instrument error, mine** — they are WARN (no exports to validate: CLI entrypoints). My sweep grepped only PASS/FAIL/SKIP | info | re-run |
| `SKILLS/STANDARDS/kinds/resource-sheet/check.mjs` | `sheet.claims-grounded` verifies a citation **EXISTS**, never that the line is **CORRECT**. Reports PASS 6/0/0 over a corpus with 68 false citations | critical | check.mjs:317-320 |
| `check-sheet-drift.mjs` | **The detector already exists** and catches all of it — but is invoked only by `author-sheet.mjs` / `remediate-sheet.mjs` at authoring time. Nothing re-runs it after a sheet ships | critical | SKILL.md:112-114 |
| `project-spine.mjs` | Anchors are **projected model-free** from `.coderef/index.json` (`ref: [ref](${relPath}:${e.line})`). They are a frozen snapshot of a moving index — line-accurate when written, stale on the next insertion | critical | project-spine.mjs:68 |
| Authorship | 53 Codex / 14 LLOYD / 5 Claude. Rot is authoring-path-agnostic | info | frontmatter scan |
| Citation contract | A citation must resolve to an INDEXED element. Module-private symbols take bare path refs — never a hand-guessed line | info | drift-checker rejection of `ensureArtifacts:250` |
| `author-sheet.mjs` | Single prose backend (Lloyd → Ollama fallback, both local). No `--spine-only` / `--prose=none`. On a host with no local model, no usable sheet can be produced — although policy has permitted frontier authoring since 2026-07-18 and every other stage (spine projection, both graders) is already model-free | warning | arg parser; SKILL.md:85-88 |
| Pattern | Third instrument this session that measured something adjacent to its claim (frozen-tree A/B vs query semantics; `claims-grounded` vs citation truth; this report's own REC-001 vs an existing tool) | info | session record |

## 4. Type/contract divergences

Not applicable for depth=medium.

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 **(REVISED)** | **high** | **Wire, do not build.** Add `sheet.anchors-resolve` to the resource-sheet kind checker, delegating per sheet to the existing `check-sheet-drift.mjs`. WARN-first — the corpus starts at 13 offenders and a FAIL gate would block every close on day one. Report stale / correct / unverifiable as three counts. → `STUB-34YBWR` | STANDARDS |
| REC-002 | **high** | `--fix` mode that re-projects anchors through the existing model-free `project-spine.mjs`. Without auto-repair, 68 stale lines become 68 hand-edits and the gate gets ignored. Folded into `STUB-34YBWR` | STANDARDS |
| REC-003 | medium | **Remove the failure mode rather than police it**: migrate to symbol anchors — `[ref](path#symbol)` — which cannot rot on insertion. Touches RESOURCE-SHEET-RULES.md, `project-spine.mjs`, both checkers, and a one-time migration. REC-001/002 are the bridge; this is the destination | STANDARDS + owner of generate-resource-sheet |
| REC-004 | **high** | **Frontier authoring path without LLOYD**: add `--prose=local\|frontier\|none` to `author-sheet.mjs`. Policy already allows it; only the flag is missing, and every other stage is model-free. → `STUB-XCBFHY` | LLOYD (current host of the runner) |
| REC-005 **(DONE)** | — | Diagnosed. 3 "ERR" were WARN/no-data (my sweep's parsing); the 4 `module-resolvable` failures are the CRLF checker bug → `TKT-017SAB`, which now **blocks** REC-001 | — |
| REC-006 | low | Run the canonical checker against foundation docs and skill docs — same citation form, same rot mechanism, never measured | STANDARDS |
| REC-007 | low | Record why `STUB-4PS8DJ` ("live doc-code drift-validation artifact", LLOYD, CLOSED) closed with the detector built but never wired, so the next such stub does not close on the same gap | LLOYD |

## 6. Reuse template note

This report shape is the canonical `/discover` output; §3 and §5 table headers and section ordering are fixed. **Use `check-sheet-drift.mjs` as the instrument** — `anchor-audit-prototype.py` in this folder is superseded and undercounts (43 vs 68) because it resolves against source declarations rather than indexed elements. Its only remaining value is as a demonstration that an ad-hoc instrument can look authoritative and still be wrong.
