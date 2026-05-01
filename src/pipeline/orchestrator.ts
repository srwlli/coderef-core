/**
 * PipelineOrchestrator - Single-pass codebase analysis pipeline
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 2, Task IMPL-004
 *
 * Features:
 * - File discovery: Finds all source files matching language filters
 * - Single-pass parsing: Each file parsed once with tree-sitter
 * - Element extraction: Functions, classes, components, hooks, etc
 * - Relationship extraction: Imports and call graphs
 * - Graph building: Dependency graph with nodes and edges
 *
 * Performance:
 * - Parallelizable: Process multiple files concurrently
 * - Cached grammars: GrammarRegistry reuses loaded parsers
 * - Memory efficient: Process files in batches if needed
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { GrammarRegistry } from './grammar-registry.js';
import { ElementExtractor } from './extractors/element-extractor.js';
import { RelationshipExtractor } from './extractors/relationship-extractor.js';
import { loadIgnorePatterns, shouldIgnorePath } from './ignore-rules.js';
import { globalRegistry } from '../registry/entity-registry.js';
import { IncrementalCache } from '../cache/incremental-cache.js';
import type {
  PipelineOptions,
  PipelineState,
  ImportRelationship,
  CallRelationship,
} from './types.js';
import type { ElementData } from '../types/types.js';
import type { ExportedGraph } from '../export/graph-exporter.js';
import { createCodeRefId } from '../utils/coderef-id.js';

/**
 * PipelineOrchestrator - Coordinate the entire analysis pipeline
 */
export class PipelineOrchestrator {
  private registry: GrammarRegistry;
  private elementExtractor: ElementExtractor;
  private relationshipExtractor: RelationshipExtractor;

  constructor() {
    this.registry = GrammarRegistry.getInstance();
    this.elementExtractor = new ElementExtractor();
    this.relationshipExtractor = new RelationshipExtractor();
  }

  /**
   * Run the complete pipeline
   *
   * @param projectPath Absolute path to project root
   * @param options Pipeline configuration options
   * @returns Populated pipeline state with all extracted data
   */
  async run(projectPath: string, options: PipelineOptions = {}): Promise<PipelineState> {
    const startTime = Date.now();

    // Apply defaults
    const languages = options.languages || this.getDefaultLanguages();
    const verbose = options.verbose ?? false;

    if (verbose) {
      console.log(`[PipelineOrchestrator] Starting scan of ${projectPath}`);
      console.log(`[PipelineOrchestrator] Languages: ${languages.join(', ')}`);
    }

    // Reset global registry for this run (WO-CODEREF-CORE-REGISTRY-001)
    globalRegistry.clear();

    // Step 1: Discover files
    if (verbose) console.log('[PipelineOrchestrator] Discovering files...');
    const files = await this.discoverFiles(projectPath, languages, options);
    const totalFiles = Array.from(files.values()).reduce((sum, arr) => sum + arr.length, 0);

    if (verbose) {
      console.log(`[PipelineOrchestrator] Found ${totalFiles} files across ${files.size} languages`);
    }

    // IMP-CORE-028: Initialize incremental cache
    const incrementalEnabled = options.incremental ?? false;
    const cache = new IncrementalCache(projectPath, incrementalEnabled);
    let allFilesUnchanged: string[] = [];
    let cacheHitRatio = 0;

    if (incrementalEnabled) {
      await cache.load();

      // Flatten all file paths for cache check
      const allFilePaths: string[] = [];
      for (const filePaths of files.values()) {
        allFilePaths.push(...filePaths);
      }

      // Check which files need re-scanning
      const cacheCheck = await cache.checkFiles(allFilePaths);
      allFilesUnchanged = cacheCheck.filesUnchanged;
      cacheHitRatio = cacheCheck.hitRatio;

      // Filter files map to only include files that need scanning
      const filesToScanSet = new Set(cacheCheck.filesToScan);
      for (const [lang, filePaths] of files.entries()) {
        const filtered = filePaths.filter(fp => filesToScanSet.has(fp));
        files.set(lang, filtered);
      }

      // Remove deleted files from cache
      cache.removeDeletedFiles(cacheCheck.filesDeleted);

      if (verbose) {
        console.log(`[PipelineOrchestrator] Incremental mode: ${cacheCheck.filesToScan.length} to scan, ${cacheCheck.filesUnchanged.length} cached`);
      }
    }

    // Step 2: Preload grammars for detected languages
    const detectedLanguages = Array.from(files.keys());
    await this.registry.preloadGrammars(detectedLanguages);

    // Step 3: Process files in single pass
    if (verbose) console.log('[PipelineOrchestrator] Processing files...');
    const allElements: ElementData[] = [];
    const allImports: ImportRelationship[] = [];
    const allCalls: CallRelationship[] = [];
    const sources = new Map<string, string>();

    let filesScanned = 0;

    for (const [language, filePaths] of files.entries()) {
      for (const filePath of filePaths) {
        try {
          const result = await this.processFile(filePath, language, verbose);
          
          // Register all elements with the global registry (WO-CODEREF-CORE-REGISTRY-001)
          for (const elem of result.elements) {
            globalRegistry.register(elem);
          }

          allElements.push(...result.elements);
          allImports.push(...result.imports);
          allCalls.push(...result.calls);
          sources.set(filePath, result.content);
          filesScanned++;

          if (verbose && filesScanned % 10 === 0) {
            console.log(`[PipelineOrchestrator] Processed ${filesScanned}/${totalFiles} files`);
          }
        } catch (error) {
          console.error(`[PipelineOrchestrator] Error processing ${filePath}:`, error);
          // Continue processing other files
        }
      }
    }

    // Step 4: Build dependency graph
    if (verbose) console.log('[PipelineOrchestrator] Building dependency graph...');
    const graph = this.buildGraph(allElements, allImports, allCalls, projectPath);

    const endTime = Date.now();

    if (verbose) {
      console.log(`[PipelineOrchestrator] Pipeline complete in ${endTime - startTime}ms`);
      console.log(`[PipelineOrchestrator] Elements: ${allElements.length}`);
      console.log(`[PipelineOrchestrator] Imports: ${allImports.length}`);
      console.log(`[PipelineOrchestrator] Calls: ${allCalls.length}`);
      console.log(`[PipelineOrchestrator] Graph nodes: ${graph.nodes.length}`);
      console.log(`[PipelineOrchestrator] Graph edges: ${graph.edges.length}`);
    }

    // Step 5: Update cache with newly scanned files
    if (incrementalEnabled) {
      const scannedFiles: string[] = [];
      for (const filePaths of files.values()) {
        scannedFiles.push(...filePaths);
      }
      await cache.updateCache(scannedFiles);
      await cache.save();
    }

    // Step 6: Return populated state
    const state: PipelineState = {
      projectPath,
      files,
      elements: allElements,
      graph,
      sources,
      options,
      metadata: {
        startTime,
        endTime,
        filesScanned,
        elementsExtracted: allElements.length,
        relationshipsExtracted: allImports.length + allCalls.length,
        incremental: incrementalEnabled ? {
          filesSkipped: allFilesUnchanged.length,
          hitRatio: cacheHitRatio,
          enabled: true,
        } : undefined,
      },
    };

    return state;
  }

  /**
   * Discover source files matching language extensions
   *
   * @param projectPath Project root directory
   * @param languages Language extensions to search for
   * @returns Map of language -> file paths
   */
  private async discoverFiles(
    projectPath: string,
    languages: string[],
    options: PipelineOptions
  ): Promise<Map<string, string[]>> {
    const files = new Map<string, string[]>();
    const ignorePatterns = await loadIgnorePatterns(projectPath, options.ignoreFile, options.exclude);

    for (const lang of languages) {
      files.set(lang, []);
    }

    await this.scanDirectory(projectPath, projectPath, languages, files, ignorePatterns);

    return files;
  }

  /**
   * Recursively scan directory for source files
   *
   * @param rootPath Project root (for relative path calculation)
   * @param currentPath Current directory being scanned
   * @param languages Target language extensions
   * @param files Accumulator map
   */
  private async scanDirectory(
    rootPath: string,
    currentPath: string,
    languages: string[],
    files: Map<string, string[]>,
    ignorePatterns: string[]
  ): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      // Skip unreadable directories
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const shouldIgnore = shouldIgnorePath(
        rootPath,
        fullPath,
        entry.name,
        entry.isDirectory(),
        ignorePatterns
      );

      if (entry.isDirectory()) {
        if (shouldIgnore) continue;

        // Recurse into subdirectories
        await this.scanDirectory(rootPath, fullPath, languages, files, ignorePatterns);
      } else if (entry.isFile()) {
        if (shouldIgnore) continue;

        // Check if file extension matches target languages
        const ext = path.extname(entry.name).slice(1); // Remove leading dot
        if (languages.includes(ext)) {
          const languageFiles = files.get(ext);
          if (languageFiles) {
            languageFiles.push(fullPath);
          }
        }
      }
    }
  }

  /**
   * Process a single file (parse once, extract all data)
   *
   * @param filePath Absolute path to source file
   * @param language File extension (ts, py, go, etc)
   * @param verbose Enable debug logging
   * @returns Extracted elements, imports, calls, and source content
   */
  private async processFile(
    filePath: string,
    language: string,
    verbose: boolean
  ): Promise<{
    elements: ElementData[];
    imports: ImportRelationship[];
    calls: CallRelationship[];
    content: string;
  }> {
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Get parser for this language
    const parser = await this.registry.getParser(language);
    if (!parser) {
      if (verbose) {
        console.warn(`[PipelineOrchestrator] No parser available for ${language}`);
      }
      return { elements: [], imports: [], calls: [], content };
    }

    // Parse file once
    const tree = parser.parse(content);

    // Extract all data from single AST
    const elements = this.elementExtractor.extract(tree.rootNode, filePath, content, language);
    const imports = this.relationshipExtractor.extractImports(tree.rootNode, filePath, content, language);
    const calls = this.relationshipExtractor.extractCalls(tree.rootNode, filePath, content, language);

    return { elements, imports, calls, content };
  }

  /**
   * Build dependency graph from extracted relationships
   *
   * @param elements All extracted code elements
   * @param imports Import relationships
   * @param calls Call relationships
   * @returns Dependency graph with nodes and edges
   */
  private buildGraph(
    elements: ElementData[],
    imports: ImportRelationship[],
    calls: CallRelationship[],
    projectPath: string
  ): ExportedGraph {
    const elementIndexes = this.buildElementIndexes(elements);
    const nodes = elements.map(elem => ({
      id: this.getElementId(elem, projectPath),
      uuid: globalRegistry.lookup({ name: elem.name, file: elem.file, line: elem.line }),
      type: elem.type,
      name: elem.name,
      file: elem.file,
      line: elem.line,
      metadata: {
        codeRefId: createCodeRefId(elem, projectPath, { includeLine: true }),
        codeRefIdNoLine: createCodeRefId(elem, projectPath, { includeLine: false }),
      },
    }));

    const edges: ExportedGraph['edges'] = [];

    // Add import edges
    for (const imp of imports) {
      edges.push({
        source: imp.sourceFile,
        target: imp.target,
        type: 'imports',
        metadata: {
          specifiers: imp.specifiers,
          default: imp.default,
          namespace: imp.namespace,
          dynamic: imp.dynamic,
          line: imp.line,
        },
      });
    }

    // Add call edges
    for (const call of calls) {
      const sourceElementId = this.resolveElementId(call.source, call.file, elementIndexes, projectPath);
      const targetElementId = this.resolveElementId(call.target, call.file, elementIndexes, projectPath);

      edges.push({
        source: call.source,
        target: call.target,
        type: 'calls',
        metadata: {
          file: call.file,
          line: call.line,
          isMethod: call.isMethod,
          sourceElementId,
          targetElementId,
        },
      });
    }

    const edgesByType: Record<string, number> = {};
    for (const edge of edges) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const densityRatio = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      nodes,
      edges,
      statistics: {
        nodeCount,
        edgeCount,
        edgesByType,
        densityRatio,
      },
    };
  }

  /**
   * Generate unique ID for an element
   *
   * @param elem Code element
   * @returns Unique identifier (file:name or file:parentScope#name)
   */
  private getElementId(elem: ElementData, projectPath: string): string {
    if (elem.codeRefId) {
      return elem.codeRefId;
    }

    return createCodeRefId(elem, projectPath, { includeLine: true });
  }

  private buildElementIndexes(elements: ElementData[]): {
    byFileAndName: Map<string, ElementData[]>;
    byName: Map<string, ElementData[]>;
  } {
    const byFileAndName = new Map<string, ElementData[]>();
    const byName = new Map<string, ElementData[]>();

    for (const element of elements) {
      const fileAndNameKey = this.getFileAndNameKey(element.file, element.name);
      const fileMatches = byFileAndName.get(fileAndNameKey);
      if (fileMatches) {
        fileMatches.push(element);
      } else {
        byFileAndName.set(fileAndNameKey, [element]);
      }

      const nameMatches = byName.get(element.name);
      if (nameMatches) {
        nameMatches.push(element);
      } else {
        byName.set(element.name, [element]);
      }
    }

    return { byFileAndName, byName };
  }

  private resolveElementId(
    name: string,
    filePath: string,
    indexes: {
      byFileAndName: Map<string, ElementData[]>;
      byName: Map<string, ElementData[]>;
    },
    projectPath: string
  ): string | undefined {
    const fileMatches = indexes.byFileAndName.get(this.getFileAndNameKey(filePath, name));
    if (fileMatches?.length === 1) {
      return this.getElementId(fileMatches[0], projectPath);
    }

    const nameMatches = indexes.byName.get(name);
    if (nameMatches?.length === 1) {
      return this.getElementId(nameMatches[0], projectPath);
    }

    return undefined;
  }

  private getFileAndNameKey(filePath: string, name: string): string {
    return `${filePath}\u0000${name}`;
  }

  /**
   * Get default languages if not specified
   */
  private getDefaultLanguages(): string[] {
    // Import DEFAULT_LANGUAGES from types or define here
    return ['ts', 'tsx', 'js', 'jsx'];
  }
}
