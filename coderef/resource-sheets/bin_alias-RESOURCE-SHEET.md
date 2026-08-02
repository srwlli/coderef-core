---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: bin_alias
parent_project: coderef-core
category: CLI
version: 1.0.0
documents: src/cli/bin-alias.ts
related_files:
  - src/cli/bin-alias.ts
status: draft
---

## Executive Summary

`bin-alias.ts` implements the package's legacy-bin deprecation notice. It derives the invoked bin key from `argv[1]`, strips a supported executable/script suffix, and writes one stable warning to stderr only when that name exactly matches the configured legacy alias [ref](src/cli/bin-alias.ts).

## Audience and Intent

CLI maintainers should call this helper near startup for bins whose legacy and canonical package keys share one entry file. The helper intentionally does not rename or wrap binaries, and `populate-coderef` remains outside this mechanism's current scope.

## Architecture / Behavior

`invokedBinName` treats missing/empty argv entries as unknown and otherwise uses `path.basename` plus one case-insensitive suffix removal. `warnIfLegacyBinName` performs an exact name comparison, writes through an injectable callback defaulting to `process.stderr.write`, returns whether it warned, and never touches stdout [ref](src/cli/bin-alias.ts).

## Source of Truth

This module is authoritative for invocation-name derivation and warning text/conditions. `package.json` is authoritative for which legacy/canonical keys point at the same dist entry. Persistent state/config file: **NONE** beyond the alias argument and argv [ref](src/cli/bin-alias.ts).

`cli/bin-alias.test.ts` backs Windows/POSIX paths, supported suffixes, absent argv, canonical/legacy behavior, stderr injection, package bin mappings, populate exclusion, and help-contract documentation [ref](__tests__/cli/bin-alias.test.ts).

## Public API / Contracts

- `BinAlias` pairs the deprecated package bin key with its canonical replacement [ref](src/cli/bin-alias.ts#BinAlias).
- `invokedBinName` returns a suffix-stripped argv entry basename or `undefined` [ref](src/cli/bin-alias.ts#invokedBinName).
- `warnIfLegacyBinName` writes the deprecation line and returns true only for an exact legacy invocation [ref](src/cli/bin-alias.ts#warnIfLegacyBinName).

## Dependencies

- Node `path` supplies cross-platform basename extraction [ref](src/cli/bin-alias.ts).
- `process.argv` and `process.stderr` are defaults that can be replaced in tests/callers [ref](src/cli/bin-alias.ts).

## Risks & Edge Cases

- The basename cannot distinguish an npm/npx shim from a direct execution of the same legacy-named dist file; both warn by design [ref](src/cli/bin-alias.ts).
- Only one terminal suffix is stripped. Unusual chained suffixes or extensionless wrapper names are compared as-is after basename [ref](src/cli/bin-alias.ts).
- Comparison is case-sensitive even though suffix removal is case-insensitive [ref](src/cli/bin-alias.ts).
- Warning removal timing is not stored here; package/release maintainers must coordinate alias deletion separately [ref](src/cli/bin-alias.ts).

## Validation Checklist

- [x] Verified all three indexed exports and anchors.
- [x] Traced unknown, canonical, legacy, suffix, and injected-writer paths.
- [x] Reviewed the direct alias/package contract suite.
- [x] Confirmed stdout remains untouched.

