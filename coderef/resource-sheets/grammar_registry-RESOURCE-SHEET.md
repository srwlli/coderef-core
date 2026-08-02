---
agent: Codex
date: 2026-08-01
task: STUB-CC9094
subject: grammar_registry
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/grammar-registry.ts
related_files:
  - src/pipeline/grammar-registry.ts
status: draft
---

## Executive Summary

`grammar-registry.ts` provides the pipeline's singleton, lazy-loading access to configured tree-sitter grammars and parsers. It converts a supported file extension into a parser, shares successful loads across callers, and turns unsupported or failed loads into `null` rather than propagating import errors [ref](src/pipeline/grammar-registry.ts#GrammarRegistry).

## Audience and Intent

Scanner and analyzer maintainers should consult this sheet before adding a language, changing grammar loading, or relying on parser reuse. Test authors should use it to understand cache scope, failure behavior, and the difference between loading a grammar and constructing a parser.

## Architecture / Behavior

The private constructor initializes three process-local maps: parsers, loaded grammar objects, and in-flight load promises [ref](src/pipeline/grammar-registry.ts). `getInstance` retains one registry instance for the process [ref](src/pipeline/grammar-registry.ts).

`getParser` first maps the requested extension to a language. Unknown extensions log a warning and return `null`. A parser cached by language is returned directly; a cached grammar is used to construct and cache a parser; otherwise the grammar is loaded and the parser is created [ref](src/pipeline/grammar-registry.ts). Both thrown load errors and `null` loads are cached as grammar failures and returned as `null` [ref](src/pipeline/grammar-registry.ts).

`loadGrammar` deduplicates concurrent dynamic imports by language [ref](src/pipeline/grammar-registry.ts). TypeScript uses the package's `typescript` or `tsx` member according to the original extension; other packages use `module.default || module`. The in-flight entry is removed in `finally`, while the successful grammar or `null` failure remains cached [ref](src/pipeline/grammar-registry.ts).

Preloading deduplicates requested extensions by mapped language and invokes the grammar loader concurrently. It warms the grammar cache only; parsers are not constructed until `getParser` is called [ref](src/pipeline/grammar-registry.ts).

## Source of Truth

This class owns the live singleton and all in-memory grammar/parser cache state. The authoritative extension and package tables are not local: `EXTENSION_TO_LANGUAGE` and `GRAMMAR_PACKAGES` come from `pipeline/types.ts` [ref](src/pipeline/grammar-registry.ts). Runtime configuration file: **NONE**; supported languages are hardcoded in those imported tables [ref](src/pipeline/types.ts:255) [ref](src/pipeline/types.ts:269).

The direct test suite covers supported-language loading, parser reuse, cache clearing, null returns, preloading, and singleton identity [ref](__tests__/grammar-registry.test.ts:29) [ref](__tests__/grammar-registry.test.ts:78) [ref](__tests__/grammar-registry.test.ts:171) [ref](__tests__/grammar-registry.test.ts:195).

## Public API / Contracts

- `GrammarRegistry` is the sole export [ref](src/pipeline/grammar-registry.ts#GrammarRegistry).
  - `GrammarRegistry.getInstance()` returns the process singleton [ref](src/pipeline/grammar-registry.ts).
  - `getParser(extension)` resolves to a configured `Parser` or `null`; grammar import and parser-setup failures are swallowed after logging [ref](src/pipeline/grammar-registry.ts).
  - `isSupported(extension)` returns true only when both the extension mapping and a package mapping exist [ref](src/pipeline/grammar-registry.ts).
  - `getSupportedExtensions()` returns the keys of the extension table [ref](src/pipeline/grammar-registry.ts).
  - `clearCache()` empties parser, grammar, and in-flight-promise maps [ref](src/pipeline/grammar-registry.ts).
  - `preloadGrammars(extensions)` resolves after attempting each distinct mapped language; unsupported extensions are filtered out [ref](src/pipeline/grammar-registry.ts).
  - `getCacheStats()` returns counts of truthy cached grammars and constructed parsers [ref](src/pipeline/grammar-registry.ts).

## Dependencies

- `tree-sitter` supplies the `Parser` constructor used for every returned parser [ref](src/pipeline/grammar-registry.ts).
- Grammar packages are selected by the imported mapping and loaded with dynamic `import()`; TypeScript is handled as a named-grammar package [ref](src/pipeline/grammar-registry.ts) [ref](src/pipeline/grammar-registry.ts).
- `pipeline/types.ts` defines supported extensions and maps them to language names and package names [ref](src/pipeline/grammar-registry.ts).
- `utils/logger.ts` receives warnings for missing mappings and errors for failed dynamic imports or parser setup [ref](src/pipeline/grammar-registry.ts).

## Risks & Edge Cases

- Failed grammar loads are negatively cached as `null`; installing or repairing a package during the same process has no effect until `clearCache` runs [ref](src/pipeline/grammar-registry.ts).
- TypeScript and TSX map to the same language key [ref](src/pipeline/types.ts:269). Because parser, grammar, and in-flight caches are keyed only by that language, **[inference]** whichever extension loads first fixes the shared cache entry; a later request for the other extension can receive a parser configured with the wrong TypeScript grammar [ref](src/pipeline/grammar-registry.ts) [ref](src/pipeline/grammar-registry.ts).
- For the same reason, **[inference]** `preloadGrammars(['ts', 'tsx'])` deduplicates to one language and selects only the first matching extension as its sample [ref](src/pipeline/grammar-registry.ts) [ref](src/pipeline/grammar-registry.ts).
- Preloading increases `loadedGrammars` but not `cachedParsers`; callers expecting parser construction during warm-up will still pay that smaller setup step later [ref](src/pipeline/grammar-registry.ts) [ref](src/pipeline/grammar-registry.ts).
- Unsupported extensions return before any negative cache entry is written, so repeated unsupported requests repeat the warning [ref](src/pipeline/grammar-registry.ts).

## Validation Checklist

- [x] Verified the single class export and every public method.
- [x] Traced parser, grammar, and in-flight cache lifecycles.
- [x] Confirmed dynamic-import failure behavior and negative caching.
- [x] Checked extension/package authority in `pipeline/types.ts`.
- [x] Reviewed the complete direct GrammarRegistry test suite.
- [x] Marked cross-extension cache conclusions as inference.
