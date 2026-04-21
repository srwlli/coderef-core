/**
 * Code Chunk Interface
 * P2-T1: Represents a code element enriched with context for RAG embedding
 *
 * A CodeChunk combines the structural information from GraphNode with
 * additional context like source code, documentation, and dependencies
 * to create rich embeddings for semantic search.
 */

/**
 * A code chunk ready for embedding
 *
 * This interface bridges the gap between CodeRef's AST analysis and
 * RAG vector embeddings. Each chunk represents a single code element
 * (function, class, method, etc.) with all necessary context.
 */
export interface CodeChunk {
  /**
   * CodeRef tag for unique identification
   * @example "@Fn/auth/login#authenticate:24"
   */
  coderef: string;

  /**
   * Element type (function, class, method, etc.)
   * Maps to GraphNode.elementType
   */
  type: string;

  /**
   * Element name
   * Maps to GraphNode.name
   */
  name: string;

  /**
   * File path relative to project root
   * Maps to GraphNode.file
   */
  file: string;

  /**
   * Line number in file
   * Maps to GraphNode.line
   */
  line: number;

  /**
   * Programming language
   * @example "typescript", "python", "javascript"
   */
  language: string;

  /**
   * Whether the element is exported
   * Maps to GraphNode.exported
   */
  exported?: boolean;

  /**
   * Source code of the element
   * Extracted from the actual file for embedding context
   */
  sourceCode?: string;

  /**
   * JSDoc, docstring, or other documentation
   * Parsed from comments above/within the element
   */
  documentation?: string;

  /**
   * Dependencies (what this element calls/imports)
   * Array of CodeRef tags
   * @example ["@Fn/utils/hash#hashPassword:12", "@Fn/db/users#findUser:45"]
   */
  dependencies: string[];

  /**
   * Dependents (what calls/imports this element)
   * Array of CodeRef tags
   * @example ["@Fn/api/auth#loginHandler:8", "@T/auth#testAuth:15"]
   */
  dependents: string[];

  /**
   * Number of dependencies
   * Used for graph-aware ranking
   */
  dependencyCount: number;

  /**
   * Number of dependents
   * Used for graph-aware ranking (higher = more important)
   */
  dependentCount: number;

  /**
   * Cyclomatic complexity (if available)
   * Used for code quality assessment
   */
  complexity?: number;

  /**
   * Test coverage percentage (0-100)
   * Used for confidence scoring
   */
  coverage?: number;

  /**
   * Related elements from the same file
   * Array of CodeRef tags for context
   */
  relatedElements?: string[];

  /**
   * Package or module this element belongs to
   * @example "@coderef/core", "django.contrib.auth"
   */
  package?: string;

  /**
   * Additional metadata for custom use cases
   */
  metadata?: Record<string, any>;
}

/**
 * Options for chunk generation
 */
export interface ChunkOptions {
  /**
   * Whether to include source code in chunks
   * Set to false to reduce embedding size (default: true)
   */
  includeSourceCode?: boolean;

  /**
   * Whether to include dependencies and dependents
   * Set to false for faster processing (default: true)
   */
  includeDependencies?: boolean;

  /**
   * Whether to parse and include documentation
   * Set to false for faster processing (default: true)
   */
  includeDocumentation?: boolean;

  /**
   * Maximum source code length (characters)
   * Truncate longer code to manage token limits (default: 2000)
   */
  maxSourceCodeLength?: number;

  /**
   * Whether to include related elements from the same file
   * Provides additional context (default: false)
   */
  includeRelatedElements?: boolean;
}

/**
 * Result from chunk generation
 */
export interface ChunkGenerationResult {
  /**
   * Successfully generated chunks
   */
  chunks: CodeChunk[];

  /**
   * Number of chunks generated
   */
  count: number;

  /**
   * Elements that failed to convert to chunks
   */
  errors: ChunkGenerationError[];
}

/**
 * Error during chunk generation
 */
export interface ChunkGenerationError {
  /**
   * CodeRef of the element that failed
   */
  coderef: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Original error (if available)
   */
  originalError?: Error;
}

/**
 * Statistics about generated chunks
 */
export interface ChunkStatistics {
  /**
   * Total number of chunks
   */
  total: number;

  /**
   * Chunks by type
   * @example { "function": 245, "class": 67, "method": 189 }
   */
  byType: Record<string, number>;

  /**
   * Chunks by language
   * @example { "typescript": 501, "javascript": 0 }
   */
  byLanguage: Record<string, number>;

  /**
   * Chunks with documentation
   */
  withDocumentation: number;

  /**
   * Average dependency count
   */
  avgDependencies: number;

  /**
   * Average dependent count
   */
  avgDependents: number;

  /**
   * Chunks with test coverage data
   */
  withCoverage: number;
}
