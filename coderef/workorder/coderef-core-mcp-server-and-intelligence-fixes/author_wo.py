#!/usr/bin/env python3
"""One-shot author for WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001.
Follows /create-workorder SKILL.md steps 3.6-7. Run from ASSISTANT root."""
import sys, json, subprocess
from pathlib import Path
from datetime import datetime, timezone

ASSISTANT = Path("C:/Users/willh/Desktop/CODEREF/ASSISTANT")
CORE = Path("C:/Users/willh/Desktop/CODEREF/CODEREF-CORE")
sys.path.insert(0, str(ASSISTANT / "SKILLS" / "WORKFLOW" / "_shared"))

WO_ID = "WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001"
FEATURE = "coderef-core-mcp-server-and-intelligence-fixes"
WODIR = CORE / "coderef" / "workorder" / FEATURE
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
GOAL = ("Fix coderef-core review findings and build coderef-mcp-server: fix failing locked-schema and "
        "populate-cli tests, add CI, repo hygiene cleanup, dead dep removal, ollama/nomic-embed-text default "
        "embeddings, headerless RAG fallback, registry bloat check, build thin TS stdio MCP server over "
        "query-executor and artifact readers wired as new bin, update coderef skills, land to main with push, "
        "register MCP domain 'coderef-core', notify team")
TOUCHES = ["src/cli/rag-index.ts", "src/cli/rag-search.ts", "src/integration/rag/indexing-orchestrator.ts",
           "src/query/query-executor.ts", "src/cli/coderef-intelligence-server.ts", "package.json",
           "__tests__/pipeline/output-validation-report.test.ts", "__tests__/populate-cli.test.ts"]

# ---- Step 3.6: RAG discovery (graceful) ----
discovery_rag = {"hits": [], "lloyd_provenance": None, "fallback_used": True, "error": None, "ms": 0}
try:
    from planner.discovery_rag import enrich_with_rag
    discovery_rag = enrich_with_rag(GOAL, str(CORE), target_root=str(CORE))
except Exception as e:
    discovery_rag["error"] = f"discovery_rag unavailable: {e.__class__.__name__}: {e}"
print("[rag]", discovery_rag.get("fallback_used"), discovery_rag.get("error"))

# ---- Step 4: discovery (strict) ----
from planner.discovery import run_discovery
discovery = run_discovery(str(CORE), GOAL, touches_hint=TOUCHES, plan_type="strict")
print("[discovery] candidates:", len(discovery.get("candidates", [])),
      "blast:", len(discovery.get("blast_radius", [])),
      "api:", len(discovery.get("public_api_hits", [])))

# ---- Step 4.5a: semantic_scan via JS extractor (graceful) ----
semantic_scan = {"layer_distribution": {}, "hotspot_files": [], "pattern_inventory": {},
                 "dependency_cycles": [], "errors": []}
js = ("const p=String.raw`" + str(ASSISTANT / "SKILLS/WORKFLOW/_shared/planner/semantic-scan-extractor.js") + "`;"
      "import('file:///'+p.replace(/\\\\/g,'/')).then(m=>{"
      "const fn=m.extractSemanticScan||m.default;"
      "console.log(JSON.stringify(fn(String.raw`" + str(CORE / ".coderef") + "`)));"
      "}).catch(e=>{console.log(JSON.stringify({errors:[String(e)]}))})")
try:
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True, timeout=120, cwd=str(CORE))
    data = json.loads(out.stdout.strip().splitlines()[-1])
    for k in semantic_scan:
        if k in data: semantic_scan[k] = data[k]
    if "errors" in data and data["errors"]: semantic_scan["errors"] = data["errors"]
except Exception as e:
    semantic_scan["errors"] = [f"extractor failed: {e}"]
print("[semantic_scan] errors:", semantic_scan["errors"][:1])

# ---- Step 4.5: context.json ----
context = {
    "workorder_id": WO_ID, "feature_name": FEATURE, "created": NOW,
    "owner_domain": "CODEREF-CORE", "target_project": "coderef-core",
    "intake": {"trigger": "stub-promotion", "user_request": GOAL},
    "promotion_metadata": {"parent_stub_id": "STUB-DF3PBN", "stub_ulid": "01KTXP10YQ9P50ETS8KD84MARY",
                            "origin": "honest-review session 2026-06-12: full audit report + leverage plan"},
    "classification": {
        "plan_type": "strict",
        "plan_type_rationale": "Stub category 'feature' maps to strict per category-rules.json: clear acceptance criteria, needs discovery + phase planning, .coderef enrichment.",
        "plan_type_decided_by": "create-workorder@2.15.0",
        "discovery_ref": discovery.get("summary_ref"),
        "discovery": discovery,
    },
    "semantic_scan": semantic_scan,
    "discovery_rag": {**discovery_rag, "discovery_rag_timestamp": NOW, "discovery_rag_enabled": True},
    "scope": {
        "in_scope": [
            "Fix 3 failing tests (locked-schema 12-field bump, populate-cli x2)",
            "CI workflow (.github/workflows/ci.yml)",
            "Repo hygiene: root artifacts, nul, backup, dual lockfile, dead deps, package.json metadata",
            "RAG local-first default: ollama + nomic-embed-text when no API key",
            "Headerless RAG fallback (--include-headerless with provenance)",
            "Registry bloat measurement + v1 sharding or follow-up stub",
            "coderef-mcp-server.ts: 6 read-only MCP tools over existing query/reader code",
            ".mcp.json registration as 'coderef-core'",
            "Skills review + /new-coderef-skill UPDATE for drifted skills",
            "Land to main + git push, team notification",
        ],
        "out_of_scope": [
            "Resolving the 20,701 unresolved graph edges (separate WO; classification breakdown only if trivial)",
            "Rewriting the regex scanner or tree-sitter expansion",
            "Pinecone/Chroma live-infrastructure tests",
            "Dashboard/HTTP server changes beyond reuse of readers",
        ],
    },
    "constraints": [
        "MCP server must import the same modules that write .coderef/ artifacts (no second implementation - the coderef-context Python server died of schema drift)",
        "Tool responses must be compact pre-summarized JSON, never raw graph.json dumps",
        "Operator instruction: commit all to main and push (integrator lane)",
        "MCP registration name MUST be 'coderef-core'",
    ],
}

# ---- Step 5: analysis.json ----
analysis = {
    "workorder_id": WO_ID, "feature_name": FEATURE, "analysis_authored_at": NOW,
    "blast_radius": {
        "files_modified": TOUCHES + [".gitignore", "tsconfig.cli.json"],
        "files_created": [".github/workflows/ci.yml", "src/cli/coderef-mcp-server.ts",
                           "__tests__/mcp-server.test.ts", ".mcp.json"],
        "files_deleted": ["scanner.js", "scanner.js.map", "scanner.d.ts.map", "types.js",
                           "types.js.map", "types.d.ts.map", "nul", "AGENTS.md.backup", "pnpm-lock.yaml"],
        "downstream_consumers": ["ASSISTANT skills (rag-index/rag-search/coderef-pipeline wrappers)",
                                  "LLOYD via coderef-rag-server HTTP", "dashboard via intelligence-server HTTP",
                                  "future Claude Code sessions via MCP 'coderef-core'"],
    },
    "risks": [
        {"id": "RISK-001", "title": "validation-report 12-field bump breaks external consumers of the locked schema",
         "likelihood": "low", "impact": "medium",
         "mitigation": "Deliberate contract change: update locked test + CHANGELOG; grep ecosystem for report consumers"},
        {"id": "RISK-002", "title": "@modelcontextprotocol/sdk version/runtime incompatibility on Node 20 Windows",
         "likelihood": "low", "impact": "medium", "mitigation": "Pin SDK version; stdio smoke test in P3-T3 before registration"},
        {"id": "RISK-003", "title": "Headerless fallback floods index with low-quality chunks degrading search precision",
         "likelihood": "medium", "impact": "medium",
         "mitigation": "Opt-in flag + header:false provenance metadata so ranking can prefer annotated chunks"},
        {"id": "RISK-004", "title": "Registry sharding scope-creeps the WO",
         "likelihood": "medium", "impact": "low",
         "mitigation": "P2-T3 is CHECK verb: measure + design; implement only if small, else file follow-up stub"},
        {"id": "RISK-005", "title": "Direct-to-main landing regresses trunk if tests are not green",
         "likelihood": "low", "impact": "high",
         "mitigation": "P1 makes suite green + CI live BEFORE any further landing; push only after full TEST pass"},
        {"id": "RISK-006", "title": "Dead-dep removal breaks an unimported but dynamically-required module",
         "likelihood": "low", "impact": "medium",
         "mitigation": "Grep for dynamic require/import of each dep before removal; full build + suite after"},
    ],
    "candidates": discovery.get("candidates", []),
    "dependencies": ["@modelcontextprotocol/sdk (new)", "ollama + nomic-embed-text (local, present)",
                      "vitest 4", "tree-sitter grammars (unchanged)"],
    "public_api_hits": discovery.get("public_api_hits", []),
    "decision_records": [
        {"id": "DR-A", "decision": "MCP server lives INSIDE coderef-core as a bin, importing the writer modules",
         "rationale": "Schema drift killed the external Python coderef-context server; co-located TS compiles against ExportedGraph types so drift = build error"},
        {"id": "DR-B", "decision": "v1 ships exactly 6 read-only tools",
         "rationale": "Refuse scope creep; write operations stay on skills/CLI surface"},
        {"id": "DR-C", "decision": "MCP registration name is 'coderef-core'", "rationale": "Operator instruction"},
        {"id": "DR-D", "decision": "Cloud embedding providers become opt-in; local ollama default",
         "rationale": "Removes API-key dependency for the default path per operator direction"},
    ],
}

# ---- Step 6: plan.json via planner engine with approved tasks ----
from planner import create_plan
approved = json.loads((WODIR / "approved-tasks.json").read_text(encoding="utf-8"))
overrides = {"approved_tasks": approved}
plan = create_plan(goal=GOAL, plan_type="strict", discovery=discovery, overrides=overrides)
plan["workorder_id"] = WO_ID
plan["feature_name"] = FEATURE
plan["created"] = NOW
plan["plan_type_rationale"] = context["classification"]["plan_type_rationale"]
plan["plan_type_decided_by"] = "create-workorder@2.15.0"

# Step 6.6: inter_phase_hooks (strict: phase 1 pre only)
for ph in plan.get("phases", []):
    if ph.get("phase") == 1 or ph.get("number") == 1:
        ph["inter_phase_hooks"] = {"pre_phase": [f"/discover {FEATURE}@quick"], "post_phase": []}
    else:
        ph["inter_phase_hooks"] = {"pre_phase": [], "post_phase": []}

# Step 6.7: workorder_hooks (strict)
plan["workorder_hooks"] = {
    "post_plan": [f"/discover {FEATURE}@quick --output-dest=stub:{WO_ID}"],
    "post_execute": [f"/discover {FEATURE} post-execute@quick --output-dest=stub:{WO_ID}"],
    "plan_gaps": [],
}

(WODIR / "plan.json").write_text(json.dumps(plan, indent=2), encoding="utf-8")
(WODIR / "context.json").write_text(json.dumps(context, indent=2), encoding="utf-8")
(WODIR / "analysis.json").write_text(json.dumps(analysis, indent=2), encoding="utf-8")

# ---- Step 7: communication.json ----
communication = {
    "workorder_id": WO_ID, "feature_name": FEATURE, "created": NOW,
    "owner_domain": "CODEREF-CORE", "target_project": "coderef-core",
    "originating_dispatches": [], "parent_stub_id": "STUB-DF3PBN", "predecessor_for": None,
    "status": "plan_created", "current_phase": 1, "phase_status": "ready",
    "plan_file": str(WODIR / "plan.json"), "context_file": str(WODIR / "context.json"),
    "analysis_file": str(WODIR / "analysis.json"),
    "handoff": {"from": "create-workorder", "to": "execute-workorder",
                 "reason": "plan authored from STUB-DF3PBN; operator-approved task list injected"},
    "execution_rules": {"plan_type": "strict", "phase_gates": True,
                         "notes": "P4-T3 lands to main + git push per operator instruction; CI must be green first"},
    "hard_constraints": context["constraints"],
    "blockers": [],
    "decisions_log": [
        {"event": "approved_tasks_injected", "count": len(approved),
         "source": str(WODIR / "approved-tasks.json"), "at": NOW},
        {"event": "inter_phase_hooks_populated", "plan_type": "strict",
         "phase_count": len(plan.get("phases", [])), "source": "default", "at": NOW},
        {"event": "workorder_hooks_populated", "plan_type": "strict", "source": "default", "at": NOW},
    ],
    "phase_transitions": [], "plan_adjustments": [],
    "git_branch": f"wo/{FEATURE}",
    "communication_log": [{"at": NOW, "from": "create-workorder",
                            "message": f"Workorder created from STUB-DF3PBN (category=feature, plan_type=strict). {len(approved)} approved tasks across {len(plan.get('phases', []))} phases."}],
    "required_skills": ["/execute-workorder", "/close-workorder", "/log-session"],
}
(WODIR / "communication.json").write_text(json.dumps(communication, indent=2), encoding="utf-8")

# ---- Step 8: verify ----
missing = [f for f in ["context.json", "analysis.json", "plan.json", "communication.json"]
           if not (WODIR / f).exists()]
print("[verify]", "ALL 4 FILES PRESENT" if not missing else f"MISSING: {missing}")
print("[phases]", [(p.get("phase") or p.get("number"), p.get("name", "")) for p in plan.get("phases", [])])
