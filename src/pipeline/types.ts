/**
 * Pipeline Types
 *
 * Shared state and configuration types for the unified CodeRef pipeline.
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 1
 */

import type { ElementData } from '../types/types.js';
import type { ExportedGraph } from '../export/graph-exporter.js';

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
