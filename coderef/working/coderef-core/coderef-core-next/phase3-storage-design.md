# Phase 3 Storage Design — for operator ruling

**Author:** CODEREF-CORE · 2026-06-13 · tracker: STUB-JAH69F · roadmap: PHASE-3
**Deliverable:** this 1-pager + one (A)/(B) ruling. No code ships until ruled.

## Problem

`semantic-registry.json` duplicates file-grain `rawFacts` onto **every element
of the file**. On Primary-Sources this measured **209MB** (98% of bytes are
duplicated rawFacts). Only ONE consumer reads the field: `src/semantic/projections.ts`.

Sibling annoyance (bundled here): the JSON-backed vector store writes to paths
named `sqlite` (`rag-vectors.sqlite` historically, store name `sqlite` for a
JSON file) — honest-naming fix, mechanical, no design tension.

## Options

**(A) File-keyed rawFactsByFile — registry 2.0.0** *(the roadmap's sketch)*
- `registry.rawFactsByFile[file]` stores facts ONCE; elements carry only their file key.
- Version bump to `2.0.0`; `projections.ts` (sole consumer) updated in the same commit.
- Drop pretty-print when serialized size > 10MB (PS: ~5-10x size cut from dedup, more from compaction).
- Risk: any unknown out-of-tree reader of `1.x` registries breaks. Mitigation: version field + a one-release reader that accepts both shapes.
- Effort: 1 rolling WO, ~2 phases (format+writer+reader, then PS re-ground + measurement evidence).

**(B) Compress-only — keep 1.x shape, gzip large registries**
- No format change; write `semantic-registry.json.gz` above 10MB.
- Zero consumer risk, but the duplication stays (CPU + memory cost on every load), and PS-scale repos keep paying it.
- Effort: trivial — but it papers over the structural duplication the audit named.

## Recommendation

**(A).** The duplication is structural, the consumer surface is exactly one
file in-tree, and the version field + dual-shape reader covers the migration.
(B) treats the symptom. Pre-work either way: re-ground the 209MB measurement
against PS's fresh artifacts (896 commits of churn since it was taken).

**Ruling requested:** (A) restructure to 2.0.0, or (B) compress-only?
On (A): STUB-JAH69F converts to the implementation stub and a rolling WO follows.
