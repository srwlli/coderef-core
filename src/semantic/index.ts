/**
 * CodeRef-Semantics module exports
 */

export { ASTExtractor, astExtractor, extractBatch } from './ast-extractor.js';
export type { ExportInfo, ImportInfo, SemanticExtractionResult, ASTExtractorOptions } from './ast-extractor.js';

export { HeaderGenerator, generateHeaders } from './header-generator.js';
export type { SemanticHeader, HeaderGenerationOptions } from './header-generator.js';
