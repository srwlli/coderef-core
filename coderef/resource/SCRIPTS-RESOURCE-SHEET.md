# CodeRef System — Scripts Resource Sheet

**Last Updated:** 2026-01-03  
**Status:** Authoritative Script Inventory  
**Total Scripts:** 65+ across 10 categories

---

## 1. Structure Creators
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `create-coderef-structure.py` | Create `coderef/` directory structure (workorder, archived, etc.) | Orchestrator | `...\assistant\scripts\` |
| `scan-all.py` | Generate minimal `.coderef/` structure (index.json, context.md) | System | `...\coderef-system\scripts\` |
| `populate-coderef.py` | Generate complete `.coderef/` structure (reports, diagrams, exports) | System | `...\coderef-system\scripts\` |

## 2. Documentation Generators
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `generate_docs.py` | Generate foundation docs from `.coderef/` data | System | `...\coderef-system\.coderef\` |
| `foundation_generator.py` | Generate foundation docs (traditional source-reading approach) | Workflow/Docs | `...\coderef-workflow\generators\` |
| `coderef_foundation_generator.py` | Generate foundation docs (hybrid approach - preferred) | Workflow/Docs | `...\coderef-workflow\generators\` |
| `enhance-standards.py` | Generate UI/behavior/UX standards using `.coderef/` data | System | `...\coderef-system\scripts\` |
| `standards_generator.py` | Generate standards via MCP tool integration | Workflow | `...\coderef-workflow\generators\` |
| `diagram-generator.py` | Generate visual diagrams (Mermaid/DOT) | System | `...\coderef-system\scripts\` |
| `mermaid_formatter.py` | Format Mermaid diagrams | Workflow | `...\coderef-workflow\generators\` |

## 3. Data Processing
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `parse_coderef_data.py` | Preprocess large index files for optimization | System | `...\coderef-system\packages\` |
| `extract-context.py` | Extract context from files for analysis | System | `...\coderef-system\scripts\` |
| `extractors.py` | Extract data from existing documentation | Docs | `...\coderef-docs\` |
| `export_processor.py` | Export data to JSON/JSON-LD/Mermaid formats | Context | `...\coderef-context\processors\` |

## 4. Validation & Quality
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `validate-docs.py` | Validate documentation (completeness, links, diagrams) | System | `...\coderef-system\scripts\` |
| `validate-stubs.py` | Validate stub.json files against schema | Orchestrator | `...\assistant\` |
| `plan_validator.py` | Validate implementation plans (0-100 scoring) | Workflow | `...\coderef-workflow\generators\` |
| `plan_format_validator.py` | Validate plan JSON structure | Workflow | `...\coderef-workflow\helpers\` |
| `schema_validator.py` | Validate JSON schemas and UDS enforcement | Workflow | `...\coderef-workflow\helpers\` |
| `validation.py` | General cross-cutting validation helpers | Workflow | `...\coderef-workflow\helpers\` |

## 5. Planning & Workflow
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `planning_analyzer.py` | Analyze project for planning (foundation/standards discovery) | Workflow | `...\coderef-workflow\generators\` |
| `planning_generator.py` | Generate 10-section implementation plans | Workflow | `...\coderef-workflow\generators\` |
| `quick_plan_generator.py` | Rapid plan creation for todo lists | Personas | `...\coderef-personas\src\generators\` |
| `interactive_plan_executor.py` | Execute plans step-by-step interactively | Personas | `...\coderef-personas\src\executors\` |
| `plan_execution_tracker.py` | Track plan execution progress and status | Personas | `...\coderef-personas\src\trackers\` |
| `changelog_generator.py` | Auto-detect git changes for changelog entries | Workflow | `...\coderef-workflow\generators\` |
| `quickref_generator.py` | Interactive guide generation (interview-based) | Workflow | `...\coderef-workflow\generators\` |
| `handoff_generator.py` | Generate agent handoff context (claude.md) | Workflow | `...\coderef-workflow\generators\` |
| `risk_generator.py` | Risk assessment across 5 dimensions | Workflow | `...\coderef-workflow\generators\` |
| `audit_generator.py` | Audit plans in workorder/ directory | Workflow | `...\coderef-workflow\generators\` |
| `consistency_checker.py` | Check code against established standards | Workflow | `...\coderef-workflow\generators\` |
| `review_formatter.py` | Generate plan review reports | Workflow | `...\coderef-workflow\generators\` |
| `features_inventory_generator.py` | Generate feature inventory from workorder/archived | Workflow | `...\coderef-workflow\generators\` |
| `todo_list_generator.py` | Generate TodoWrite task lists from plans | Personas | `...\coderef-personas\src\generators\` |

## 6. Personas & Agents
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `persona_manager.py` | Persona activation and management | Personas | `...\coderef-personas\src\` |
| `persona_generator.py` | Create custom personas with guided workflow | Personas | `...\coderef-personas\src\` |

## 7. Testing
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `test_runner.py` | Run tests and analyze results | Testing | `...\coderef-testing\src\` |
| `framework_detector.py` | Detect testing framework (pytest/jest/vitest/etc) | Testing | `...\coderef-testing\src\` |
| `result_analyzer.py` | Parse test results and coverage data | Testing | `...\coderef-testing\src\` |
| `proof_generator.py` | Generate completion proof and deliverables | Testing | `...\coderef-testing\src\` |
| `test_scan_all.py` | Regression testing for scan-all.py | System | `...\coderef-system\scripts\` |

## 8. Build & Utilities
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `build-exe.py` | Build standalone executable via PyInstaller | System | `...\coderef-system\scripts\` |
| `update_lloyd.py` | Update Lloyd persona definitions | Personas | `...\coderef-personas\build_scripts\` |
| `build_phase2.py` / `phase3` | Persona build pipeline phases | Personas | `...\coderef-personas\build_scripts\` |
| `create_research_scout.py` | Create research scout persona (STUB-024) | Personas | `...\coderef-personas\build_scripts\` |
| `scan-emojis.py` | Scan for emoji usage in codebase | System | `...\coderef-system\scripts\` |
| `remove-emojis.py` | Remove emoji characters from documentation | Orchestrator | `...\assistant\scripts\` |
| `scan-gui.py` | Desktop UI wrapper for scan-all.py | System | `...\coderef-system\scripts\` |
| `scan-all-fixed.py` | Improved/Bugfix version of scan-all.py | System | `...\coderef-system\scripts\` |
| `cli_utils.py` | CLI helper utilities for documentation tools | Docs | `...\coderef-docs\` |

## 9. MCP Server Core
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `server.py (context)` | Code Intelligence MCP server (13 tools) | Context | `...\coderef-context\` |
| `server.py (workflow)`| Planning & Orchestration MCP server (28 tools) | Workflow | `...\coderef-workflow\` |
| `server.py (docs)` | Documentation MCP server (12 tools) | Docs | `...\coderef-docs\` |
| `server.py (personas)`| Expert Agents MCP server (8 tools) | Personas | `...\coderef-personas\` |
| `server.py (testing)` | Test Automation MCP server (4 tools) | Testing | `...\coderef-testing\` |
| `tool_handlers.py` | Core implementations for workflow MCP tools | Workflow | `...\coderef-workflow\` |

## 10. Helpers & Support
| Script | Description | Component | Location |
|:-------|:------------|:----------|:---------|
| `base_generator.py` | Base class for all generator scripts | Workflow | `...\coderef-workflow\generators\` |
| `handler_helpers.py` | MCP tool handler helper functions | Workflow | `...\coderef-workflow\helpers\` |
| `handler_decorators.py` | Error handling/logging decorators | Workflow | `...\coderef-workflow\helpers\` |
| `uds_helpers.py` | Universal Documentation Standards (UDS) helpers | Workflow | `...\coderef-workflow\helpers\` |
| `logger_config.py` | Centralized logging configuration | Workflow | `...\coderef-workflow\helpers\` |
| `error_responses.py` | Standardized error response handling | Workflow | `...\coderef-workflow\helpers\` |
| `constants.py` | Shared constants and configuration enums | Workflow | `...\coderef-workflow\helpers\` |

---
**Note:** All paths are relative to the user's home or project root as indicated in the source reference.
