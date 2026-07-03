# /discover report — gaps in WO-AGENT-NATIVE-CAPABILITY-GAPS-001

**Generated:** 2026-07-03T09:20:00Z
**Depth:** thorough
**Output dest:** workorder:WO-AGENT-NATIVE-CAPABILITY-GAPS-001
**Dispatch:** none

## 1. Scope

What was asked: "gaps in WO-AGENT-NATIVE-CAPABILITY-GAPS-001 — surface any missing coverage, unverified premises, phase-plan holes, or risks the plan does not yet address, before /execute-workorder".

What was bounded: bounded to a **pre-execution gap audit of the WO's own plan/analysis/context** against ground truth in CODEREF-CORE source. This is NOT a re-run of the original capability-gap analysis (that produced the WO) — it audits whether the WO as written is executable without surprises. Method: read the target files each phase cites and confirm the premise + line citations hold (per feedback_scan_surfaces_not_verdicts — a count is a place to look, not a proven fact).

## 2. Surfaces audited

Provenance of every source consulted:

- [tool: rg]            queries=3, hits=11 (canonical-graph refs in MCP server=0; go/rust cases; orchestrator all* accumulators)
- [tool: rag-search]    top-k=0, ms=0, fallback_used=false  (skipped — this is a code-ground-truth audit, not a semantic-surface lookup; RAG would add noise)
- [tool: .coderef/index.json]   elements_scanned=0  (audit reads source directly, not the index catalog)
- [tool: .coderef/headers]      headers_consulted=0
- [tool: coderef-query]         depth-of-walk=0  (divergence pass done by direct read, not the CLI walk)
- [tool: foundation-docs]       sections_matched=0
- [tool: direct-read]  files_read=5 (canonical-graph.ts:200-399, graph-builder.ts:540-689, relationship-extractor.ts:1-60/160-228/go-cases, orchestrator.ts:100-179/255-304, coderef-mcp-server.ts via grep)
- WARNING: plan.json line citations carry minor drift vs current source (see §3 F-05) — not blocking, but T1 reads should re-anchor.

## 3. Findings table

| Surface | Observation | Severity | Evidence |
|---|---|---|---|
| canonical-graph.ts:222-249, 287-380 | P1 premise CONFIRMED — calleesOf/importsOf/dependenciesOf/shortestPath/allPaths all exist exactly as cited and are already bounded (allPaths caps at maxPaths=50). | info | `calleesOf(resolution): CanonicalNode[]` :223; `allPaths(...maxPaths=50)` :344 |
| coderef-mcp-server.ts (whole file) | P1 absence CONFIRMED & LARGER than "pure wiring" — server has ZERO references to CanonicalGraph/calleesOf/shortestPath; it never constructs a CanonicalGraph, it hand-rolls its own inbound-only map. P1 must INTRODUCE the CanonicalGraph class into the server, not just call an unused method. | warning | grep for `calleesOf\|CanonicalGraph\|shortestPath` → No matches found |
| canonical-graph.ts:218 (idSetOf/NodeResolution) | PLAN HOLE — the outbound/path functions take a `NodeResolution` object, not a raw codeRefId string. P1-T2/T3 need a resolve-codeRefId→NodeResolution step the plan does not name. Small, but it's real wiring the task list omits. | warning | `calleesOf(resolution: NodeResolution)` — input is resolved node, not id |
| graph-builder.ts:554-580, 650-676 | P2 data source CONFIRMED — ambiguous-import carries candidates[] (:554-559), ambiguous-call carries candidates[] (:650-654), unresolved-call carries reason (:655-659); edge records persist candidates/reason/calleeName/receiverText/scopePath/originSpecifier. The 18,837 non-resolved edges are genuinely enumerable from graph.json. | info | `evidence = { kind: 'ambiguous-call', ...candidates }` :651 |
| relationship-extractor.ts:167-207, 216-228 | P6 Go default-break CONFIRMED exactly — extractRawImports default-breaks (:179), extractRawCalls default-breaks (:203), extractRawExports is TS/JS-only (:222-225). Go emits ZERO raw facts today. | info | `default: break;` at :180/:204; exports switch has no go case |
| orchestrator.ts:263-290 | P6 DOUBLE-EDGE RISK RESOLVED (in P6's favor) — persisted graph.json comes from constructGraph(state) (:281) reading importResolutions/callResolutions (the raw-fact→resolver chain), NOT the legacy buildGraph() output which is explicitly "superseded" (:271-273). Legacy extractGoImports (:934) feeds allImports → superseded path only → dropped at the atomic swap (:284). So P6 will NOT double-emit — PROVIDED the resolver chain consumes the new Go raw facts. | warning | `const v2Graph = constructGraph(preGraphState)` :281; legacy output "is superseded" :271 |
| orchestrator.ts:125-130 | P5 corruption trap CONFIRMED exactly — the incremental element-filter (`files.set(lang, filtered)` :129) shrinks the file map to changed-only BEFORE buildSymbolTable runs, which is precisely the cross-file blinding RISK-02 names. The plan's mitigation (persist full symbol table, re-resolve against it) targets the correct seam. | info | `const filtered = filePaths.filter(fp => filesToScanSet.has(fp)); files.set(lang, filtered)` :128-129 |
| plan.json P2-T1 vs source | Minor line-citation drift — plan cites graph-builder emit sites at "554-580, 650-676"; actual ambiguous-call is 650-654, unresolved-call 655-659, ambiguous-import 554-559. The BLOCKS are right; sub-line numbers moved. Each phase's T1 re-read absorbs this — not blocking. | info | plan.json:40 vs graph-builder.ts:650-659 |
| plan.json P6 dependency chain | UNSTATED DEPENDENCY — P6 assumes "the resolver is largely language-agnostic once raw facts exist" (context.json:36) but the plan never verifies the import-resolver/call-resolver actually route Go raw facts to resolution. If the resolver has its own language guard that excludes Go, P6-T2's emitters produce facts that resolve to nothing. P6-T1 must read import-resolver.ts + call-resolver.ts language handling, not just relationship-extractor.ts. | warning | context.json:36 claim is untested against resolver code |
| plan.json (whole) — eval coverage | NO REGRESSION-DETECTION GAP for P1-P4 — every phase asserts "reality anchor 2411/257" + suite green, but the anchor is a NODE/FILE count; it will NOT catch a semantically-wrong new tool (e.g. outbound returning inbound). P1-T4/P2-T4/P3-T5 behavioral tests are the only guard. Acceptable, but the anchor gives false confidence if a test is weak — call it out so review scrutinizes the new tests, not the anchor. | info | AC-7 leans on 2411/257 which is unaffected by new-tool correctness |
| context.json out_of_scope + plan.json:120-124 | 3 deferred follow-up stubs (engine-rigor cross-repo, scored graph-eval, rust/java/cpp) are DOCUMENTED but NOT FILED. If P6 lands and the WO closes, these evaporate unless filed as stubs first. Pre-existing known item from WO creation. | warning | plan.json:120 "STUB (to file)" ×3 — none filed yet |

## 4. Type/contract divergences

| Caller | Callee | Field | Observed shape | Notes |
|---|---|---|---|---|
| P1-T2 MCP tool (planned) | canonical-graph.calleesOf | input arg | plan implies `codeRefId: string` | actual signature wants `NodeResolution` — resolve step missing (F-03) |
| coderef-mcp-server loadGraph | graph.json edges | resolutionStatus filter | server keeps only `=== 'resolved'` (:140) | P2 must read the SAME graph.json but NOT apply that filter — confirm P2 reads edges pre-filter, not via the existing cache.inbound map |
| P6 walkRawGo* (planned) | import-resolver / call-resolver | language guard | plan assumes language-agnostic | UNVERIFIED — resolver may guard by language-family; P6-T1 must confirm (F-08) |
| legacy extractGoImports (:934) | constructGraph edges | reaches graph.json? | NO — superseded path (orchestrator :271) | resolves the double-edge worry; but proves nothing about whether the RAW path admits Go |

## 5. Recommendations with priority

| Rec ID | Priority | Action | Owner |
|---|---|---|---|
| REC-001 | high | Amend P1 task list: add an explicit resolve-codeRefId→NodeResolution step (P1-T2 prereq) AND note that P1 INTRODUCES CanonicalGraph into the MCP server for the first time (not a call to an existing import). Re-scope P1 from "pure wiring" to "wire-in + adapter". | coderef-core |
| REC-002 | high | Amend P6-T1 to ALSO read import-resolver.ts + call-resolver.ts language handling — verify the resolver admits Go raw facts before P6-T2 authors emitters. Add an explicit early check: "if resolver has a language-family guard excluding Go, that guard is part of P6's scope." | coderef-core |
| REC-003 | medium | Add a P2-T1 sub-check: confirm the enumeration reads graph.json edges BEFORE the resolved-only filter (coderef-mcp-server.ts:140) — the existing cache.inbound map has already discarded every non-resolved edge, so P2 cannot reuse it; it needs a separate raw-edge read. | coderef-core |
| REC-004 | medium | File the 3 deferred stubs (engine-rigor, scored graph-eval, rust/java/cpp) NOW via /stub with parent lineage to this WO, so they survive WO close. | TRACKING |
| REC-005 | low | Re-anchor plan.json T1 line citations to current source (P2 emit sites 650-659 not 650-676) at execution time — each phase's T1 read already does this; no pre-edit needed. | coderef-core |
| REC-006 | low | In review of P1-P4, scrutinize the new behavioral TESTS (not the 2411/257 anchor) for correctness — the anchor is node-count-invariant to a semantically-wrong tool. | coderef-core |

## 6. Reuse template note

This report shape is the canonical `/discover` output. To consume it programmatically: the table headers in §3 and §5 are fixed; section ordering is fixed. Downstream skills (create-workorder, stub, dispatch-session-request) can grep for the `## N.` markers to extract sections.

**Audit verdict:** The WO is fundamentally SOUND — every core premise (P1 functions exist + MCP-absent; P2's 18,837 edges are real + enumerable; P5 corruption trap is at the exact cited seam; P6 Go is genuinely graph-dead) is CONFIRMED against source. No premise was found false. The gaps are two under-scoped tasks (REC-001 P1 resolve-step + class introduction; REC-002 P6 resolver-admits-Go verification) and one hygiene item (REC-004 file the deferred stubs). None are blockers; all are addressable by tightening the affected phase's T1 read scope before that phase executes. Recommend proceeding to /execute-workorder --phase=1 after folding REC-001 into the P1 task list.
