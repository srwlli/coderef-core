---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: detect_languages
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/detect-languages.ts
related_files:
  - src/cli/detect-languages.ts
status: draft
---

## Executive Summary

`detect-languages.ts` defines the language keys accepted by CodeRef CLIs, validates explicit selections, and recursively detects supported source extensions while honoring shared ignore rules. Results are deduplicated and returned in canonical supported-language order rather than discovery order [ref](src/cli/detect-languages.ts).

## Audience and Intent

Populate, RAG-index, and CLI maintainers should use this module as the shared accepted-language contract. Adding a language requires coordinating the list, extension mapping, scanner/grammar support, and drift-guard tests elsewhere in the project.

## Architecture / Behavior

Validation trims and lowercases inputs, removes blanks, rejects any unsupported key with the complete allowed list, deduplicates, and canonicalizes order. Detection loads ignore patterns, recursively reads directory entries, skips ignored and non-file/non-directory entries, maps extensions (including C++ aliases), and stops early after all ten canonical languages are found [ref](src/cli/detect-languages.ts).

## Source of Truth

This module is authoritative for CLI language keys, display order, explicit validation, and extension-to-canonical mapping. `pipeline/ignore-rules.ts` is authoritative for ignore-file semantics. Runtime configuration comes from the optional ignore file selector and additional patterns; persistent state: **NONE** [ref](src/cli/detect-languages.ts).

Populate CLI tests back automatic Python detection and explicit/no-language failure behavior. Direct focused tests for every extension alias, canonical ordering, unreadable directories, and ignore variants: **NONE found** [ref](__tests__/populate-cli.test.ts).

## Public API / Contracts

- `SUPPORTED_CLI_LANGUAGES` is the ordered ten-key accepted list [ref](src/cli/detect-languages.ts#SUPPORTED_CLI_LANGUAGES).
- `SupportedCliLanguage` is the union derived from that list [ref](src/cli/detect-languages.ts#SupportedCliLanguage).
- `formatSupportedLanguages` returns the comma-separated canonical list [ref](src/cli/detect-languages.ts#formatSupportedLanguages).
- `validateCliLanguages` returns `undefined` for no explicit selection or a validated/deduplicated canonical-order list [ref](src/cli/detect-languages.ts#validateCliLanguages).
- `detectProjectLanguages` asynchronously scans a project with shared ignore rules and returns canonical-order detected keys [ref](src/cli/detect-languages.ts#detectProjectLanguages).

## Dependencies

- Node `fs/promises` and `path` traverse directories and inspect extensions [ref](src/cli/detect-languages.ts).
- `pipeline/ignore-rules.ts` loads patterns and decides path exclusion [ref](src/cli/detect-languages.ts).
- `utils/path-normalize.ts` stabilizes case/sep handling before extension recognition [ref](src/cli/detect-languages.ts).

## Risks & Edge Cases

- Directory read failures are silently treated as no files, so permission/transient errors are indistinguishable from an unsupported-language repository [ref](src/cli/detect-languages.ts).
- Symbolic links and other non-file/non-directory entries are skipped rather than followed [ref](src/cli/detect-languages.ts).
- `.h` always maps to C even when the header belongs to a C++ project; `.hpp` is not mapped [ref](src/cli/detect-languages.ts).
- Detection looks only at extensions, not file content, manifests, or shebangs [ref](src/cli/detect-languages.ts).
- Canonical ordering is stable but can surprise callers expecting user or discovery order [ref](src/cli/detect-languages.ts).

## Validation Checklist

- [x] Verified all five indexed exports and anchors.
- [x] Traced validation, ignore, recursion, mapping, and early-stop paths.
- [x] Reviewed available populate coverage and named focused gaps.
- [x] Confirmed no persistent state.

