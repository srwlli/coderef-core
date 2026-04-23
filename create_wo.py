import sys
import json
import asyncio
import os
import time
sys.path.append(r"C:\Users\willh\.mcp-servers\coderef-workflow")

from handlers.planning_handlers import handle_gather_context, handle_analyze_project_for_planning, handle_commit_plan, handle_validate_implementation_plan
from mcp.types import TextContent

async def create():
    project_path = r"C:\Users\willh\Desktop\CODEREF\CODEREF-CORE"
    feature_name = "coderef-core-test-alignment"

    try:
        print("Gathering context...")
        ctx_resp = await handle_gather_context({
            "project_path": project_path,
            "feature_name": feature_name,
            "description": "Align coderef-core test suite assertions globally with the new UUID-based Registry footprint.",
            "goal": "Fix 37 broken pipeline regression tests relying on obsolete mock data schemas.",
            "requirements": [
                "Update AST generator mocks to export UUID instead of structured payload graphs",
                "Ensure component and dependency resolution expects unique semantic strings",
                "Fix path-relative assertions in scanner parallelization suites",
                "Adjust duplicate tolerance counts under the strict UUID context resolution engine"
            ],
            "out_of_scope": ["Architectural changes to the code CLI"],
            "constraints": ["Keep monotonic improvement counter stable"]
        })
        ctx_text = ctx_resp[0].text if ctx_resp else ""
        print(f"Context gathered: {len(ctx_text)} bytes")

        print("Analyzing project...")
        an_resp = await handle_analyze_project_for_planning({
            "project_path": project_path,
            "feature_name": feature_name
        })
        an_text = an_resp[0].text if an_resp else ""
        print(f"Analysis complete: {len(an_text)} bytes")

        plan = {
            "title": "UUID Test Alignment",
            "phases": [
                {
                    "name": "Phase 1: Test Footprint Normalization",
                    "description": "Adapt core test definitions to align with updated structural outputs from graph.",
                    "tasks": [
                        {
                            "id": "T1-1",
                            "title": "Update element-extractor assertions",
                            "description": "Port AST expectations strictly to UUIDs matching active code registry.",
                            "status": "pending",
                            "files": ["packages/coderef-core/__tests__/element-extractor.test.ts"]
                        },
                        {
                            "id": "T1-2",
                            "title": "Update relationship-extractor expectations",
                            "description": "Force dependency mapping checks to match scalar string UUID targets.",
                            "status": "pending",
                            "files": ["packages/coderef-core/__tests__/relationship-extractor.test.ts"]
                        }
                    ]
                },
                {
                    "name": "Phase 2: Generator Constraints",
                    "description": "Correct deduplication counters and strict resolver logic in workflow tests.",
                    "tasks": [
                        {
                            "id": "T2-1",
                            "title": "Stabilize root-cause alignment tests",
                            "description": "Refactor length expectations from 20 -> 10 to account for strict valid registry collapse.",
                            "status": "pending",
                            "files": ["packages/coderef-core/__tests__/generators/root-cause-alignment.test.ts"]
                        }
                    ]
                },
                {
                    "name": "Phase 3: Cleanup and Verification",
                    "description": "Fix pathing discrepancies and wrap with holistic validation.",
                    "tasks": [
                        {
                            "id": "T3-1",
                            "title": "Fix parallel processing imports",
                            "description": "Migrate relative imports for scanner.js referencing to absolute local references natively.",
                            "status": "pending",
                            "files": ["packages/coderef-core/src/scanner/__tests__/parallel-processing.test.ts"]
                        },
                        {
                            "id": "T3-2",
                            "title": "Holistic jest run",
                            "description": "Verify comprehensive coverage.",
                            "status": "pending",
                            "files": ["packages/coderef-core/package.json"]
                        }
                    ]
                }
            ],
            "risks_and_mitigations": [
                {"risk": "Tests might miss deep regressions", "mitigation": "Ensure vitest captures global bounds accurately vs legacy formats"}
            ]
        }

        print("Committing plan...")
        com_resp = await handle_commit_plan({
            "project_path": project_path,
            "feature_name": feature_name,
            "plan": plan
        })
        com_text = com_resp[0].text if com_resp else ""
        print(f"Plan committed: {len(com_text)} bytes")

        print("Validating plan...")
        val_resp = await handle_validate_implementation_plan({
            "project_path": project_path,
            "feature_name": feature_name,
            "plan_path": os.path.join(project_path, "coderef", "workorder", feature_name, "plan.json")
        })
        val_text = val_resp[0].text if val_resp else ""
        print(f"Plan validated: {len(val_text)} bytes")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(create())
