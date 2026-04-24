# Changelog

All notable changes to CodeRef Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
