# Roadmap — coderef-core-intelligence-leverage

**Owner:** CODEREF-CORE
**Created:** 2026-06-12T11:00:00Z
**Updated:** 2026-06-12T11:00:00Z
**Current phase:** 1
**Status:** active
**Workorder:** WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 (parent stub STUB-DF3PBN)

Origin: honest review of coderef-core (2026-06-12) + leverage plan. Thesis: stop competing
with grep — own the graph; expose it natively via MCP; make the intelligence layer real,
local, and version-controlled.

## Phase 1: Stabilize — tests green, CI live, repo clean

**Status:** not_started
**Gating predicate:** WO Phase 1 executes; suite 1618/0 failures; CI enforcing build-then-test
**Shipped commit:** —
**Hard-stop reason:** Nothing lands on main until the suite is green and CI exists to keep it green

### Items (parallel within phase)

- [not_started] FIX-LOCKED-SCHEMA-TEST: Update 11-field locked validation-report contract to 12 fields (header_coverage_pct) in output-validation-report.test.ts AND noregress comment, same commit
- [not_started] FIX-POPULATE-CLI-TESTS: Rebuild dist first (stale-dist prime suspect), then fix populate-cli Phase 3 output + python auto-detect tests
- [not_started] CI-WORKFLOW: Add .github/workflows/ci.yml (npm ci, build, vitest run) — first CI for this repo
- [not_started] HYGIENE-CLEANUP: Remove root build artifacts, nul, AGENTS.md.backup, pnpm-lock.yaml; .gitignore *.log
- [not_started] DEAD-DEPS: Remove @babel/*, acorn (+protobufjs if unused); add engines/license/repository to package.json

## Phase 2: Local-first RAG — no API key required, headerless repos indexable

**Status:** not_started
**Gating predicate:** Phase 1 complete (suite green + CI live)
**Shipped commit:** —
**Hard-stop reason:** RAG default-path changes ride on a green suite

### Items (parallel within phase)

- [not_started] OLLAMA-DEFAULT: rag-index.ts:93 + rag-search.ts: default provider ollama/nomic-embed-text when no cloud key; cloud opt-in
- [not_started] HEADERLESS-FALLBACK: --include-headerless: embed header_status_missing chunks with header:false provenance instead of skipping
- [not_started] REGISTRY-BLOAT-CHECK: Measure 113MB semantic-registry.json write path; shard v1 or file follow-up stub with design
- [not_started] REINDEX-DOGFOOD: rag-index dogfood on coderef-core with local stack; cures 27-day vector staleness

<!-- depends_on: PHASE-1 -->

## Phase 3: coderef-mcp-server — native MCP surface over .coderef intelligence

**Status:** not_started
**Gating predicate:** Phase 2 complete; @modelcontextprotocol/sdk pinned and stdio smoke test passes
**Shipped commit:** —
**Hard-stop reason:** Server must import writer modules (no second implementation — coderef-context Python server died of schema drift)

### Items (parallel within phase)

- [not_started] MCP-SERVER-BIN: src/cli/coderef-mcp-server.ts: 6 read-only tools (what_calls, what_imports, impact_of, find_element, codebase_summary, validation_status) wrapping QueryExecutor + artifact readers; compact responses
- [not_started] MCP-TESTS: __tests__/mcp-server.test.ts behavioral tests against fixture artifacts; schema drift = build error
- [not_started] MCP-JSON-REGISTRATION: Write CODEREF-CORE/.mcp.json registering server under name coderef-core (absent today, clean create)

<!-- depends_on: PHASE-2 -->

## Phase 4: Integration — skills updated, landed on main, team notified

**Status:** not_started
**Gating predicate:** Phase 3 complete (server builds, tests pass, smoke verified)
**Shipped commit:** —
**Hard-stop reason:** Registration + notification only after the tool actually works

### Items (parallel within phase)

- [not_started] SKILLS-UPDATE: Review 10 CORE skills referencing CORE CLIs; /new-coderef-skill UPDATE for contract-drifted ones (rag-index, rag-search, rag-status, coderef-rag-server most likely)
- [not_started] MAIN-LANDING-PUSH: Land all work to main and git push origin (operator instruction: proper git push)
- [not_started] MCP-DOMAIN-REGISTRATION: ASSISTANT registers the MCP domain as coderef-core; verify tools visible in a fresh Claude Code session
- [not_started] TEAM-NOTIFICATION: Notify team on the new tool (send-chat / Discord status): tool list + how sessions consume them

<!-- depends_on: PHASE-3 -->

## Chronology callouts

- P1-P4-CI-GATE: Phase 4 main landing requires Phase 1's CI to be live and green — true dependency, not pure sequencing (depends_on: PHASE-1)
- P3-P4-REGISTRATION: Phase 4 MCP domain registration requires Phase 3's built server bin and .mcp.json — true dependency (depends_on: PHASE-3)
- P2-P3-INDEPENDENCE: Phase 3 MCP server does not technically require Phase 2 RAG changes (graph/index tools only); sequenced for single-WO discipline, could parallelize if needed
