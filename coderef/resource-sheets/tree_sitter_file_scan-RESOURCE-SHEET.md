---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: tree_sitter_file_scan
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/scanner/tree-sitter-file-scan.ts
related_files:
  - src/scanner/tree-sitter-file-scan.ts
status: draft
---

## Executive Summary

`tree-sitter-file-scan.ts` is the shared caller-content scan adapter that selects a grammar, parses a file, extracts canonical pipeline elements, normalizes method names for scanner compatibility, and best-effort attaches imports/calls [ref](src/scanner/tree-sitter-file-scan.ts).

## Audience and Intent

Scanner and worker maintainers use this function to avoid disk rereads and to align standalone scan element recall with pipeline extraction. Unsupported grammars throw deliberately so callers can take their configured regex fallback.

## Architecture / Behavior

The file extension selects a grammar from the singleton registry. One tree-sitter parse feeds the shared element extractor and, for TypeScript/TSX, the shared relationship extractor. Qualified method names are reduced to their final segment to preserve the standalone scanner's historical result shape [ref](src/scanner/tree-sitter-file-scan.ts).

For JavaScript/JSX, the same element tree is retained while `JSCallDetector` parses the supplied in-memory content with Acorn to preserve CommonJS import/call behavior. File imports are attached to every element; calls are filtered to the element's source identity. Relationship failures are non-fatal and structural elements still return [ref](src/scanner/tree-sitter-file-scan.ts).

## Source of Truth

This module is authoritative for standalone scanner grammar selection, shared-tree element extraction, scanner-shape method normalization, and per-language relationship attachment. Grammar/extractor/detector modules own parsing and fact extraction; callers own fallback policy [ref](src/scanner/tree-sitter-file-scan.ts).

Runtime inputs are absolute file identity and caller-supplied content; persistent configuration/state: **NONE**. Scanner relationship tests cover real TypeScript imports/calls and the JavaScript Acorn path, while AST-mode integration covers default tree-sitter element recall and explicit fallback modes [ref](src/scanner/__tests__/ts-relationship-extraction.test.ts) [ref](src/scanner/__tests__/ast-mode.test.ts).

## Public API / Contracts

- `scanFileWithTreeSitter` returns extracted elements with best-effort relationships or throws for an unsupported grammar [ref](src/scanner/tree-sitter-file-scan.ts).

## Dependencies

- Node path selects the raw extension [ref](src/scanner/tree-sitter-file-scan.ts).
- Grammar registry and canonical element/relationship extractors provide tree-sitter parsing/facts [ref](src/scanner/tree-sitter-file-scan.ts).
- `JSCallDetector` preserves JavaScript/JSX Acorn and CommonJS relationship behavior [ref](src/scanner/tree-sitter-file-scan.ts).
- Shared element types define the returned scanner shape [ref](src/scanner/tree-sitter-file-scan.ts).

## Risks & Edge Cases

- Extension matching is not lowercased, so uppercase/mixed-case suffixes may miss a registered grammar [ref](src/scanner/tree-sitter-file-scan.ts).
- Removing class qualification makes same-named methods from different classes ambiguous and can attach calls to multiple elements [ref](src/scanner/tree-sitter-file-scan.ts).
- Every file import is copied onto every element, which expresses file-level availability rather than element-specific use [ref](src/scanner/tree-sitter-file-scan.ts).
- Relationship extraction exceptions are swallowed without diagnostics, leaving structurally valid elements with silently incomplete calls/imports [ref](src/scanner/tree-sitter-file-scan.ts).
- JavaScript/JSX performs both a tree-sitter element parse and an Acorn relationship parse; the one-tree reuse optimization applies fully to TypeScript, not to the JS relationship path [ref](src/scanner/tree-sitter-file-scan.ts).
- TypeScript calls are deduplicated while JavaScript calls are not, so result multiplicity differs by language [ref](src/scanner/tree-sitter-file-scan.ts).

## Validation Checklist

- [x] Verified the single indexed export and declaration anchor.
- [x] Traced grammar failure, shared extraction, method normalization, and both relationship paths.
- [x] Reviewed TypeScript relationship, JavaScript preservation, element-recall, and fallback coverage.
- [x] Documented extension, name-collision, file-import, silent-failure, parse-count, and deduplication behavior.

