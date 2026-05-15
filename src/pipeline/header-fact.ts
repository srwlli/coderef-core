/**
 * @coderef-semantic: 1.0.0
 * @exports HeaderImportFact, HeaderParseError, HeaderFact
 * @used_by src/pipeline/extractors/relationship-extractor.ts, src/pipeline/semantic-header-parser.ts
 */

/**
 * Phase 2.5 semantic header types
 *
 * WO-PIPELINE-SEMANTIC-HEADER-PARSER-001
 *
 * Canonical types produced by the semantic header parser. The parser owns
 * shape; consumers (orchestrator, projections, registry) read these
 * structures without re-parsing.
 *
 * Header grammar lives at
 * `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md` (BNF).
 */

import type { HeaderStatus, LayerEnum } from './element-taxonomy.js';

export type { HeaderStatus, LayerEnum };

/**
 * One structured `module:symbol` entry from a header `@imports` array. This
 * REPLACES `RawHeaderImportFact` (Phase 2 placeholder). Phase 2 emitted only
 * `rawString`; Phase 2.5 produces structured `module` + `symbol` fields.
 */
export interface HeaderImportFact {
  /** File whose header was parsed. */
  sourceFile: string;
  /** Module path before the colon (e.g. `./alpha`, `react`). */
  module: string;
  /** Symbol after the colon (e.g. `doAlpha`, `useState`). */
  symbol: string;
  /** Line in the source file where the `@imports` array literal sat. */
  line: number;
}

/**
 * One structured parse-error record. The parser collects these into
 * `HeaderFact.parseErrors` and contributes the file's `headerStatus` to
 * `partial` when present.
 */
export interface HeaderParseError {
  /**
   * Tag the error pertains to. Examples:
   *   - `'@layer'` for unknown layer values
   *   - `'@capability'` for non-kebab-case strings
   *   - `'@constraint'` for malformed JSON or non-kebab items
   *   - `'@generated'` for non-ISO-8601 timestamps
   *   - `'@imports'` for malformed `module:symbol` literals
   *   - `'@coderef-semantic'` for missing or wrong-version markers
   *   - `'header'` for structural issues (e.g. block detected but no
   *     parsable content)
   */
  tag: string;
  /** Short human-readable explanation. Stable enough for dashboards. */
  message: string;
  /** Line in the source file where the offending tag/value appeared. */
  line: number;
  /** Optional column offset within the line. */
  column?: number;
}

/**
 * The parsed semantic header for a single file. Every walked file yields a
 * `HeaderFact` (possibly empty when no header was detected — the parser
 * does not return undefined). Tag fields are optional because a header may
 * omit any of them; `parseErrors` records what was wrong with the present
 * tags.
 */
export interface HeaderFact {
  /** File whose header was parsed. */
  sourceFile: string;
  /** Validated `@layer` value, or undefined when missing/invalid. */
  layer?: LayerEnum;
  /** Validated `@capability` slug, or undefined when missing/invalid. */
  capability?: string;
  /** Validated `@constraint` items, or undefined when missing/invalid. */
  constraints?: string[];
  /**
   * `@exports` identifier list as written in the header. Cross-check vs
   * `RawExportFact[]` happens in the orchestrator, not in the parser, so
   * this field reflects the raw header content rather than the AST.
   */
  exports?: string[];
  /** Structured `@imports` records. Empty when the header has none. */
  imports?: HeaderImportFact[];
  /** Validated `@generated` ISO 8601 timestamp, or undefined. */
  generated?: string;
  /** `@coderef-semantic:` version literal as written. */
  version?: string;
  /** All parse / validation errors detected for this file's header. */
  parseErrors?: HeaderParseError[];
}
