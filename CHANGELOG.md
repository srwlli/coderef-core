# Changelog

All notable changes to CodeRef Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2026-05-05] — Phase 8: Documentation Update

### Documentation
- Rewrote `docs/SCHEMA.md` as the canonical schema reference with sibling sections for Scanner Schema (`ElementData`), Relationship Schema (raw facts + resolved relationships), Resolution Statuses (`ImportResolutionKind` 7 values, `CallResolutionKind` 5 values, `EdgeResolutionStatus` 8 values), Graph Schema (8-field `GraphEdgeV2`, 10-variant `EdgeEvidence`, `GraphNode` with Phase 7 facet propagation, `ExportedGraph`), Validation Report (11-field locked Phase 6 contract), and Indexing Result (Phase 7 additive shape with `IndexingStatus` thresholds, `SkipReason`, `FailReason`).
- Created `docs/HEADER-GRAMMAR.md` as a citation-mirror of the canonical BNF at `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`. CORE never forks the grammar.
- Rewrote `docs/API.md` to cover the post-rebuild public surface, stability commitments, Phase 6 validation gate, Phase 7 indexing contract, and the explicit `What NOT to import` boundary.
- Rewrote `AGENTS.md` as the canonical CORE-side agent usage contract: validation-report.json gate, IndexingResult.status semantics, rag-index exit codes, what-not-to-read, version compatibility commitments, with footer pointer to `ASSISTANT/PROJECT-CONTEXT/coderef-core/CONTEXT.md` for general project rules. `CLAUDE.md` and `GEMINI.md` remain unchanged 5-line pointer stubs (Path C ruling, 2026-05-05).
- Updated `docs/CLI.md` to document `--strict-headers` (Phase 6) on `populate-coderef`, the validation-gate behavior + `IndexingResult.status` exit codes on `rag-index`, and `--layer` / `--capability` filter flags (Phase 7) on `rag-search`.
- Updated `docs/rag-http-api.md` with Phase 7 reality: `IndexingResult.status` field on responses, `validationGateRefused` semantics, per-entry `SkipReason` / `FailReason` enum, `--layer` / `--capability` query passthrough.
- Rewrote `docs/ARCHITECTURE.md` as a phase-ordering overview (Phases 0–7) with `ExportedGraph` canonical and `DependencyGraph` marked `@legacy`.
- Archived 4 audit-style root markdown to `docs/archive/<file>-2026-05-05.md` with dated banners (DR-PHASE-8-A): `EXECUTIVE-SUMMARY`, `CODEREF-ANALYSIS-REPORT`, `DUPLICATE-FILES-AUDIT`, `GENERATE_FOUNDATION_DOCS_ALIGNMENT_PLAN`. Archived `docs/coderef-semantic-schema.md` (predates Phase 1+2.5; superseded by `docs/SCHEMA.md`).

### Pipeline Rebuild Complete (Phase 0..7)

The 9-phase pipeline rebuild is complete. Per-phase archives are at `coderef/archived/pipeline-*/ARCHIVED.md`:

| Phase | Slug | Outcome |
|------:|------|---------|
| 0 | `pipeline-graph-ground-truth-tests` | 6 ground-truth assertions PASS |
| 1 | `pipeline-scanner-identity-taxonomy` | canonical `codeRefId`, `ElementData.layer/capability/constraints/headerStatus` |
| 2 | `pipeline-relationship-raw-facts` | `RawImportFact` / `RawCallFact` / `RawExportFact` (endpoints never node IDs) |
| 2.5 | `pipeline-semantic-header-parser` | `@coderef-semantic:1.0.0` parser; `HeaderFact` per file |
| 3 | `pipeline-import-resolution` | `ImportResolution[]` with 7-value `ImportResolutionKind` |
| 4 | `pipeline-call-resolution` | `CallResolution[]` with 5-value `CallResolutionKind` |
| 5 | `pipeline-graph-construction` | 8-field `GraphEdgeV2`, 10-variant `EdgeEvidence`, `ExportedGraph` canonical |
| 6 | `pipeline-output-validation` | `validatePipelineState` chokepoint, 11-field `ValidationReport`, `--strict-headers` |
| 7 | `pipeline-indexing-rag` | `IndexingResult.status`, refuse-on-`ok=false`, `SkipReason` / `FailReason`, `--layer` / `--capability` filters, file-grain worst-severity facet aggregation |

Final post-Phase-7 baseline: `valid_edge_count=3464`, `header_missing_count=262`, all other validation counts `0`, ground-truth 6/6 PASS. Phase 8 archives the rebuild as a documentation pass with zero source code changes.

---

## [Unreleased]

### Added
- Parallel scanning support for single-language scans
- Incremental cache with mtime-based invalidation
- SCAN_CACHE in-memory LRU for repeated scans
- Comprehensive CLI documentation (CLI.md)
- New CLI commands: coderef-rag-index, coderef-rag-search, coderef-rag-status
- New CLI commands: scan-frontend-calls, validate-routes, detect-languages
- Frontend call detection for React/Vue/Svelte
- Route validation for Express/FastAPI/Next.js
- RAG integration with ChromaDB and Ollama

### Changed
- Scanner now deduplicates elements in both parallel and sequential modes
- Improved AST parsing with tree-sitter fallback
- Updated architecture documentation
- Refactored cache system for better performance

### Fixed
- IMP-CORE-076: Recursive incremental scans for nested files
- IMP-CORE-077: Parallel path early return issue (now preserves dedup/cache)
- Path normalization in IncrementalCache checkFiles
- Mtime precision handling for git checkout scenarios

### Deprecated
- `workerPoolSize` option (not implemented, use `parallel` instead)

### Removed
- N/A

### Security
- N/A

---

## [2.0.0] - 2025-09-17

### Added
- Initial release of CodeRef Core v2.0
- Multi-language scanner (TypeScript, JavaScript, Python, Go, Rust, Java, C/C++)
- Regex-based and AST-based analysis engines
- Tag parsing and generation
- Code drift detection
- Dependency graph building
- CLI interface with scan and populate commands
- Plugin system for custom detectors
- Support for framework-specific route detection
- Export to JSON, Mermaid, Graphviz formats

### Changed
- Complete rewrite from v1.x with new architecture
- Modular design with separate analyzer, scanner, and parser layers

---

## [1.x.x] - 2024 (Legacy)

Legacy version series. See git history for details.

---

## Versioning Guide

- **MAJOR**: Breaking changes to public API
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

---

## Contributing to Changelog

When making changes:

1. Add entry under `[Unreleased]` section
2. Use categories: Added, Changed, Deprecated, Removed, Fixed, Security
3. Reference issue/PR numbers when applicable
4. Keep entries concise but descriptive

Example:
```markdown
### Added
- New feature description (#123)
```

---

## Release Process

1. Update version in `package.json`
2. Update version in `docs/ARCHITECTURE.md`
3. Move `[Unreleased]` entries to new version section
4. Add release date
5. Create git tag: `git tag -a v2.1.0 -m "Release v2.1.0"`
6. Push tag: `git push origin v2.1.0`

---

## Links

- Full changelog: `git log --oneline`
- Compare versions: [GitHub compare](https://github.com/srwlli/coderef-core/compare)
- Releases: [GitHub releases](https://github.com/srwlli/coderef-core/releases)
