/**
 * Pipeline Types
 *
 * Shared state and configuration types for the unified CodeRef pipeline.
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 1
 */

import type { ElementData } from '../types/types.js';
import type { ExportedGraph } from '../export/graph-exporter.js';
import type { HeaderStatus, LayerEnum } from './element-taxonomy.js';
import type {
  HeaderFact,
  HeaderImportFact,
  HeaderParseError,
} from './header-fact.js';
import type {
  ExportTable,
  ImportResolution,
  ImportResolutionKind,
} from './import-resolver.js';

export type { HeaderStatus, LayerEnum };
export type { HeaderFact, HeaderImportFact, HeaderParseError };
export type { ExportTable, ImportResolution, ImportResolutionKind };

/**
 * Pipeline options for configuring scan behavior
 */
export interface PipelineOptions {
  /** Languages to scan (e.g., ['ts', 'tsx', 'js', 'jsx', 'py']) */
  languages?: string[];
  /** Additional ignore patterns to exclude during discovery */
  exclude?: string[];
  /** Optional ignore file path (defaults to .coderefignore in project root, false disables) */
  ignoreFile?: string | false;
  /** Custom output directory (default: .coderef) */
  outputDir?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Output progress as JSON */
  json?: boolean;
  /** Target scanning mode (full, minimal, context) (default: full) */
  mode?: 'full' | 'minimal' | 'context';
  /** Select specific generators to run (overrides mode) */
  select?: string[];
  /** Skip specific generators (e.g., ['patterns', 'coverage']) */
  skip?: string[];
  /** Enable parallel output generation */
  parallel?: boolean;
  /** Maximum depth for dependency traversal */
  maxDepth?: number;
  /** Enable incremental scanning (only re-scan changed files) */
  incremental?: boolean;
  /** Include line numbers in canonical CodeRef IDs (default: true) */
  codeRefIncludeLine?: boolean;
}

/**
 * Shared pipeline state holding all extracted data from single-pass traversal
 */
export interface PipelineState {
  /** Project root path */
  projectPath: string;
  /** All discovered files grouped by language */
  files: Map<string, string[]>;
  /** All extracted code elements (functions, classes, components, etc) */
  elements: ElementData[];
  /** All extracted import relationships from the single-pass scan */
  imports: ImportRelationship[];
  /** All extracted call relationships from the single-pass scan */
  calls: CallRelationship[];
  /**
   * Phase 2 raw-fact arrays. These are unresolved facts — endpoints are NEVER
   * graph node IDs. Resolution into edges happens in Phase 3 (imports) /
   * Phase 4 (calls). The legacy imports/calls arrays above are kept additive
   * during the transition.
   */
  rawImports: RawImportFact[];
  rawCalls: RawCallFact[];
  rawExports: RawExportFact[];
  /**
   * Phase 2.5 header-parser outputs. One HeaderFact per scanned source file
   * (possibly empty when no semantic header was detected). The map is keyed
   * by source file path. headerImportFacts is the canonical structured
   * record produced by the semantic header parser. headerParseErrors is the
   * union of every file's parse errors.
   */
  headerFacts: Map<string, HeaderFact>;
  headerImportFacts: HeaderImportFact[];
  headerParseErrors: HeaderParseError[];
  /**
   * Phase 3 import-resolver output. One ImportResolution per RawImportFact
   * specifier and per HeaderImportFact, classified into one of the 7
   * ImportResolutionKind values. Resolved entries also drive graph-edge
   * emission in the orchestrator.
   */
  importResolutions: ImportResolution[];
  /** Dependency graph with nodes and edges */
  graph: ExportedGraph;
  /** Source code content indexed by file path */
  sources: Map<string, string>;
  /** Pipeline configuration options */
  options: PipelineOptions;
  /** Metadata about the pipeline run */
  metadata: {
    startTime: number;
    endTime?: number;
    filesScanned: number;
    elementsExtracted: number;
    relationshipsExtracted: number;
    /** Incremental scan statistics (IMP-CORE-028) */
    incremental?: {
      /** Number of files skipped (unchanged) */
      filesSkipped: number;
      /** Cache hit ratio (0-1) */
      hitRatio: number;
      /** Whether incremental mode was enabled */
      enabled: boolean;
    };
  };
}

/**
 * Language extension to grammar package mapping
 */
export type LanguageExtension =
  | 'ts' | 'tsx'
  | 'js' | 'jsx'
  | 'py'
  | 'go'
  | 'rs'
  | 'java'
  | 'cpp' | 'cc' | 'cxx' | 'c++'
  | 'c' | 'h';

/**
 * Grammar package names for each language
 */
export const GRAMMAR_PACKAGES: Record<string, string> = {
  'typescript': 'tree-sitter-typescript',
  'javascript': 'tree-sitter-javascript',
  'python': 'tree-sitter-python',
  'go': 'tree-sitter-go',
  'rust': 'tree-sitter-rust',
  'java': 'tree-sitter-java',
  'cpp': 'tree-sitter-cpp',
  'c': 'tree-sitter-cpp', // C and C++ use the same grammar package
};

/**
 * Extension to language mapping
 */
export const EXTENSION_TO_LANGUAGE: Record<LanguageExtension, string> = {
  'ts': 'typescript',
  'tsx': 'typescript',
  'js': 'javascript',
  'jsx': 'javascript',
  'py': 'python',
  'go': 'go',
  'rs': 'rust',
  'java': 'java',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'c++': 'cpp',
  'c': 'c',
  'h': 'c',
};

/**
 * Default languages to scan if not specified
 */
export const DEFAULT_LANGUAGES: LanguageExtension[] = ['ts', 'tsx', 'js', 'jsx'];

/**
 * Import relationship extracted from AST
 */
export interface ImportRelationship {
  /** Source file containing the import */
  sourceFile: string;
  /** Target module being imported */
  target: string;
  /** Named imports (e.g., ['useState', 'useEffect']) */
  specifiers?: string[];
  /** Default import name */
  default?: string;
  /** Namespace import (e.g., import * as React) */
  namespace?: string;
  /** True for dynamic imports */
  dynamic?: boolean;
  /** Line number of import statement */
  line: number;
}

/**
 * Call relationship extracted from AST
 */
export interface CallRelationship {
  /** Source element making the call */
  source: string;
  /** Target element being called */
  target: string;
  /** File containing the call */
  file: string;
  /** Line number of call */
  line: number;
  /** True if this is a method call (object.method()) */
  isMethod?: boolean;
}

// ============================================================================
// Phase 2 raw-fact types (WO-PIPELINE-RELATIONSHIP-RAW-FACTS-001)
//
// Raw facts carry every detail downstream resolvers need but commit to NO
// graph node IDs as endpoints. Phase 3 (imports) and Phase 4 (calls) resolve
// these into typed edges.
// ============================================================================

/** One specifier from a named-import clause: `import { imported as local }`. */
export interface RawImportSpecifier {
  /** The exported name as it appears in the source module. */
  imported: string;
  /** The local binding (equal to `imported` when no `as` alias is used). */
  local: string;
}

/**
 * Raw import fact. Captures every binding produced by a single import
 * statement (named, default, namespace, dynamic) without resolving the
 * module specifier or the imported symbols to graph nodes.
 */
export interface RawImportFact {
  /** Optional codeRefId of the enclosing element if scope binds to one. */
  sourceElementId: string | null;
  /** Source file containing the import statement. */
  sourceFile: string;
  /** Verbatim module specifier from the import (e.g. `'./utils'`, `'react'`). */
  moduleSpecifier: string;
  /** Named-import specifiers with alias bindings preserved. */
  specifiers: RawImportSpecifier[];
  /** Default-import binding name, or null. */
  defaultImport: string | null;
  /** Namespace-import binding name (`import * as ns`), or null. */
  namespaceImport: string | null;
  /** True when the statement is `import type` (TS-only). */
  typeOnly: boolean;
  /** True when this came from a dynamic `import('module')` call. */
  dynamic: boolean;
  /** Line number of the import statement (1-indexed). */
  line: number;
}

/**
 * Raw call fact. Preserves every detail Phase 4 needs to resolve the call
 * back to a graph node (or mark it unresolved/ambiguous): receiver text,
 * scope path, full call expression text. Method calls keep the receiver —
 * `obj.save()` is `{ receiverText: 'obj', calleeName: 'save' }`, never bare
 * `'save'`.
 */
export interface RawCallFact {
  /**
   * codeRefId of the enclosing element when the call site can be bound to
   * one, otherwise null. Phase 4 uses this to anchor the call edge source.
   */
  sourceElementCandidate: string | null;
  /** Source file containing the call. */
  sourceFile: string;
  /** Full source slice of the call expression, e.g. `obj.method(arg)`. */
  callExpressionText: string;
  /** Trailing identifier that names the called function/method. */
  calleeName: string;
  /** Receiver text for member-access calls (`obj` in `obj.method()`), or null for bare calls. */
  receiverText: string | null;
  /** Enclosing scope path, e.g. `['MyClass', 'myMethod']` or `['outer', 'inner']`. */
  scopePath: string[];
  /** Line number of the call expression. */
  line: number;
  /** Language extension of the source file (`'ts'`, `'js'`, `'py'`, ...). */
  language: string;
}

/** Kind of export. `reexport` covers `export { x } from './y'`. */
export type RawExportKind = 'named' | 'default' | 'reexport' | 'namespace';

/**
 * Raw export fact. Single canonical record of a name being exported from a
 * file. Replaces the duplicated export tracking that previously lived on
 * `ElementData.exported` and the legacy projection seam.
 */
export interface RawExportFact {
  /** Source file emitting the export. */
  sourceFile: string;
  /** Exported name as seen by importers (after `as` for re-exports). */
  exportedName: string;
  /** Local binding name in the source file (equal to `exportedName` for named/default with no rename). */
  localName: string;
  /** Kind of export. */
  kind: RawExportKind;
  /** Line number of the export statement. */
  line: number;
}

// RawHeaderImportFact was removed in Phase 3
// (WO-PIPELINE-IMPORT-RESOLUTION-001). HeaderImportFact owns the structured
// header-import shape; resolution classification (resolved / stale / etc.)
// lives in ImportResolution.
