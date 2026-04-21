/**
 * Chunk Converter
 * P2-T2: Converts GraphNodes to CodeChunks with full context
 *
 * This service bridges the gap between CodeRef's AST analysis and RAG embeddings
 * by enriching graph nodes with source code, documentation, and dependency context.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { DependencyGraph, GraphNode } from '../../analyzer/graph-builder.js';
import type {
  CodeChunk,
  ChunkOptions,
  ChunkGenerationResult,
  ChunkGenerationError,
  ChunkStatistics
} from './code-chunk.js';

/**
 * Converts GraphNodes to CodeChunks for RAG embedding
 */
export class ChunkConverter {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Convert dependency graph to code chunks
   */
  async convertGraph(
    graph: DependencyGraph,
    options?: ChunkOptions
  ): Promise<ChunkGenerationResult> {
    const chunks: CodeChunk[] = [];
    const errors: ChunkGenerationError[] = [];

    const opts: Required<ChunkOptions> = {
      includeSourceCode: options?.includeSourceCode ?? true,
      includeDependencies: options?.includeDependencies ?? true,
      includeDocumentation: options?.includeDocumentation ?? true,
      maxSourceCodeLength: options?.maxSourceCodeLength ?? 2000,
      includeRelatedElements: options?.includeRelatedElements ?? false
    };

    // Group nodes by file for efficient file reading
    const nodesByFile = this.groupNodesByFile(graph);

    // Process each file
    for (const [filePath, nodes] of nodesByFile) {
      let fileContent: string | undefined;

      // Read file once for all nodes in it
      if (opts.includeSourceCode || opts.includeDocumentation) {
        // Check if file exists before attempting to read
        // Skip phantom import targets (e.g., .js files from TypeScript ESM imports)
        const fileExists = await this.fileExists(filePath);
        if (!fileExists) {
          // Silently skip non-existent files (they're phantom import targets)
          continue;
        }

        try {
          fileContent = await this.readFile(filePath);
        } catch (error: any) {
          // File reading failed, record errors for all nodes
          for (const node of nodes) {
            errors.push({
              coderef: node.id,
              message: `Failed to read file: ${error.message}`,
              originalError: error
            });
          }
          continue; // Skip this file
        }
      }

      // Convert each node in the file
      for (const node of nodes) {
        try {
          const chunk = await this.convertNode(
            node,
            graph,
            fileContent,
            opts
          );
          chunks.push(chunk);
        } catch (error: any) {
          errors.push({
            coderef: node.id,
            message: `Failed to convert node: ${error.message}`,
            originalError: error
          });
        }
      }
    }

    return {
      chunks,
      count: chunks.length,
      errors
    };
  }

  /**
   * Convert a single GraphNode to CodeChunk
   */
  private async convertNode(
    node: GraphNode,
    graph: DependencyGraph,
    fileContent: string | undefined,
    options: Required<ChunkOptions>
  ): Promise<CodeChunk> {
    // Extract element name from node.id (format: "file:name")
    const name = this.extractElementName(node.id);

    // Detect language from file extension
    const language = this.detectLanguage(node.file);

    // Extract source code if requested
    let sourceCode: string | undefined;
    let documentation: string | undefined;

    if (fileContent) {
      if (options.includeSourceCode) {
        sourceCode = this.extractSourceCode(
          fileContent,
          node.line ?? 1,
          options.maxSourceCodeLength
        );
      }

      if (options.includeDocumentation) {
        documentation = this.extractDocumentation(
          fileContent,
          node.line ?? 1,
          language
        );
      }
    }

    // Extract dependencies and dependents
    let dependencies: string[] = [];
    let dependents: string[] = [];

    if (options.includeDependencies) {
      dependencies = this.extractDependencies(node.id, graph);
      dependents = this.extractDependents(node.id, graph);
    }

    // Build CodeChunk
    const chunk: CodeChunk = {
      coderef: node.id,
      type: node.type,
      name,
      file: node.file,
      line: node.line ?? 1,
      language,
      exported: node.metadata?.exported as boolean | undefined,
      sourceCode,
      documentation,
      dependencies,
      dependents,
      dependencyCount: dependencies.length,
      dependentCount: dependents.length,
      complexity: node.metadata?.complexity as number | undefined,
      coverage: node.metadata?.coverage as number | undefined
    };

    // Add related elements if requested
    if (options.includeRelatedElements) {
      chunk.relatedElements = this.extractRelatedElements(node.file, node.id, graph);
    }

    return chunk;
  }

  /**
   * Group nodes by file for efficient processing
   */
  private groupNodesByFile(graph: DependencyGraph): Map<string, GraphNode[]> {
    const grouped = new Map<string, GraphNode[]>();

    for (const node of graph.nodes.values()) {
      const nodes = grouped.get(node.file) || [];
      nodes.push(node);
      grouped.set(node.file, nodes);
    }

    return grouped;
  }

  /**
   * Read file content
   */
  private async readFile(filePath: string): Promise<string> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.basePath, filePath);

    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.basePath, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract element name from node ID
   * Node ID format: "file:name" or just "name"
   */
  private extractElementName(nodeId: string): string {
    const parts = nodeId.split(':');
    return parts.length > 1 ? parts[1] : parts[0];
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php'
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Extract source code around a line number
   */
  private extractSourceCode(
    fileContent: string,
    lineNumber: number,
    maxLength: number
  ): string {
    const lines = fileContent.split('\n');

    // Start from the target line
    let startLine = Math.max(0, lineNumber - 1);
    let endLine = startLine;

    // Expand context until we hit maxLength or end of file
    let code = '';
    const contextLines = 5; // Try to get 5 lines of context

    // Try to get a few lines before and after
    startLine = Math.max(0, lineNumber - 1 - contextLines);
    endLine = Math.min(lines.length - 1, lineNumber - 1 + contextLines);

    code = lines.slice(startLine, endLine + 1).join('\n');

    // Truncate if too long
    if (code.length > maxLength) {
      code = code.substring(0, maxLength) + '\n// ... truncated';
    }

    return code;
  }

  /**
   * Extract documentation (JSDoc, docstrings) before a line
   */
  private extractDocumentation(
    fileContent: string,
    lineNumber: number,
    language: string
  ): string | undefined {
    const lines = fileContent.split('\n');
    const targetLine = Math.max(0, lineNumber - 1);

    // Look for documentation in the lines before the target
    const docLines: string[] = [];

    if (language === 'typescript' || language === 'javascript') {
      // Look for JSDoc comment (/** ... */)
      let inJSDoc = false;
      let foundDoc = false;

      for (let i = targetLine - 1; i >= Math.max(0, targetLine - 20); i--) {
        const line = lines[i].trim();

        if (line.startsWith('*/')) {
          inJSDoc = true;
          foundDoc = true;
          continue;
        }

        if (line.startsWith('/**') || line.startsWith('/*')) {
          if (inJSDoc) {
            docLines.unshift(line.replace(/^\/\*\*?\s*/, ''));
            break;
          }
        }

        if (inJSDoc) {
          docLines.unshift(line.replace(/^\s*\*\s?/, ''));
        }

        if (!inJSDoc && line !== '') {
          break; // Stop if we hit non-doc content
        }
      }

      if (foundDoc) {
        return docLines.join('\n').trim();
      }
    } else if (language === 'python') {
      // Look for Python docstring (""" ... """)
      let inDocstring = false;
      let foundDoc = false;

      for (let i = targetLine + 1; i < Math.min(lines.length, targetLine + 20); i++) {
        const line = lines[i].trim();

        if (line.startsWith('"""') || line.startsWith("'''")) {
          if (inDocstring) {
            docLines.push(line.replace(/^['"]{3}\s*/, '').replace(/['"]{3}\s*$/, ''));
            foundDoc = true;
            break;
          } else {
            inDocstring = true;
            docLines.push(line.replace(/^['"]{3}\s*/, ''));
            continue;
          }
        }

        if (inDocstring) {
          docLines.push(line);
        }

        if (!inDocstring && line !== '') {
          break;
        }
      }

      if (foundDoc) {
        return docLines.join('\n').trim();
      }
    }

    return undefined;
  }

  /**
   * Extract dependencies (what this node calls/imports)
   */
  private extractDependencies(nodeId: string, graph: DependencyGraph): string[] {
    const edges = graph.edgesBySource.get(nodeId) || [];
    return edges
      .filter(edge => edge.type === 'calls' || edge.type === 'imports')
      .map(edge => edge.target);
  }

  /**
   * Extract dependents (what calls/imports this node)
   */
  private extractDependents(nodeId: string, graph: DependencyGraph): string[] {
    const edges = graph.edgesByTarget.get(nodeId) || [];
    return edges
      .filter(edge => edge.type === 'calls' || edge.type === 'imports')
      .map(edge => edge.source);
  }

  /**
   * Extract related elements from the same file
   */
  private extractRelatedElements(
    filePath: string,
    excludeNodeId: string,
    graph: DependencyGraph
  ): string[] {
    const related: string[] = [];

    for (const node of graph.nodes.values()) {
      if (node.file === filePath && node.id !== excludeNodeId) {
        related.push(node.id);
      }
    }

    return related.slice(0, 10); // Limit to 10 related elements
  }

  /**
   * Calculate statistics about generated chunks
   */
  calculateStatistics(chunks: CodeChunk[]): ChunkStatistics {
    const byType: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    let withDocumentation = 0;
    let totalDependencies = 0;
    let totalDependents = 0;
    let withCoverage = 0;

    for (const chunk of chunks) {
      // Count by type
      byType[chunk.type] = (byType[chunk.type] || 0) + 1;

      // Count by language
      byLanguage[chunk.language] = (byLanguage[chunk.language] || 0) + 1;

      // Count documentation
      if (chunk.documentation) {
        withDocumentation++;
      }

      // Sum dependencies
      totalDependencies += chunk.dependencyCount;
      totalDependents += chunk.dependentCount;

      // Count coverage
      if (chunk.coverage !== undefined) {
        withCoverage++;
      }
    }

    return {
      total: chunks.length,
      byType,
      byLanguage,
      withDocumentation,
      avgDependencies: chunks.length > 0 ? totalDependencies / chunks.length : 0,
      avgDependents: chunks.length > 0 ? totalDependents / chunks.length : 0,
      withCoverage
    };
  }
}
