/**
 * @coderef-semantic: 1.0.0
 * @exports SemanticPipelineOptions, PipelineResult, SemanticOrchestrator, traverse, runSemanticPipeline
 * @used_by src/cli/semantic-integration.test.ts, src/cli/semantic-integration.ts, __tests__/pipeline/single-scanner.test.ts
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports SemanticPipelineOptions, PipelineResult, SemanticOrchestrator, traverse, runSemanticPipeline
 * @used_by src/cli/semantic-integration.test.ts, src/cli/semantic-integration.ts, __tests__/pipeline/single-scanner.test.ts
 */



/**
 * Semantic orchestrator - coordinates full workflow
 *
 * Orchestrates AST extraction, header generation, LLM enrichment,
 * and registry synchronization for complete semantic processing pipeline.
 */

import * as fs from 'fs';
import * as path from 'path';
import { HeaderGenerator } from './header-generator.js';
import { LLMEnricher } from './llm-enricher.js';
import { RegistrySyncer } from './registry-sync.js';
import { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import { buildSemanticElementsFromState } from '../pipeline/semantic-elements.js';
import type { PipelineState } from '../pipeline/types.js';
import type { ExportInfo, ImportInfo, SemanticExtractionResult } from './ast-extractor.js';

export interface SemanticPipelineOptions {
  projectDir: string;
  outputDir: string;
  registryPath: string;
  generateHeaders?: boolean;
  enrichLLM?: boolean;
  syncRegistry?: boolean;
  validateOnly?: boolean;
  pipelineState?: PipelineState;
}

export interface PipelineResult {
  filesProcessed: number;
  headersGenerated: number;
  entriesEnriched: number;
  registryUpdated: number;
  errors: Array<{ file: string; error: string }>;
  executionTime: number;
}

/**
 * Semantic processing orchestrator
 */
export class SemanticOrchestrator {
  private options: SemanticPipelineOptions;
  private headerGenerator: HeaderGenerator;
  private llmEnricher: LLMEnricher;
  private registrySyncer: RegistrySyncer;

  constructor(options: SemanticPipelineOptions) {
    this.options = {
      generateHeaders: true,
      enrichLLM: false,
      syncRegistry: true,
      validateOnly: false,
      ...options,
    };

    this.headerGenerator = new HeaderGenerator();
    this.llmEnricher = new LLMEnricher();
    this.registrySyncer = new RegistrySyncer({
      registryPath: this.options.registryPath,
      dryRun: this.options.validateOnly,
    });
  }

  /**
   * Process entire project directory
   */
  async processProject(): Promise<PipelineResult> {
    const startTime = Date.now();
    const result: PipelineResult = {
      filesProcessed: 0,
      headersGenerated: 0,
      entriesEnriched: 0,
      registryUpdated: 0,
      errors: [],
      executionTime: 0,
    };

    try {
      const state = this.options.pipelineState || await new PipelineOrchestrator().run(
        this.options.projectDir,
        { outputDir: this.options.outputDir },
      );
      result.filesProcessed = state.metadata.filesScanned;

      const extractions = this.createExtractionsFromState(state);

      const registryEntries = [];

      // Process each extraction
      for (const extraction of extractions) {
        try {
          // Skip .coderef and node_modules
          if (extraction.file.includes('.coderef') || extraction.file.includes('node_modules')) {
            continue;
          }

          // Generate headers if enabled
          if (this.options.generateHeaders) {
            await this.headerGenerator.insertHeaders(
              extraction.file,
              this.headerGenerator.generateHeaders(
                extraction.exports,
                extraction.imports,
                extraction.internalDependencies,
                extraction.externalDependencies,
              ),
            );
            result.headersGenerated++;
          }

          // Enrich with LLM if enabled
          let enrichment = undefined;
          if (this.options.enrichLLM && this.llmEnricher.isAvailable()) {
            enrichment = await this.llmEnricher.enrich({
              file: extraction.file,
              exports: extraction.exports.map((e) => e.name),
              imports: extraction.imports.map((i) => i.name),
              internalDeps: extraction.internalDependencies,
              externalDeps: extraction.externalDependencies,
            });
            result.entriesEnriched++;
          }

          // Prepare for registry sync
          registryEntries.push({
            file: extraction.file,
            exports: extraction.exports,
            imports: extraction.imports.map((item) => item.name || item.from),
            enrichment,
          });
        } catch (error) {
          result.errors.push({
            file: extraction.file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Sync registry if enabled
      if (this.options.syncRegistry && registryEntries.length > 0) {
        const syncResult = await this.registrySyncer.syncBatch(registryEntries);
        result.registryUpdated = syncResult.entriesCreated + syncResult.entriesUpdated;

        if (syncResult.errors.length > 0) {
          result.errors.push(...syncResult.errors.map(item => ({
            file: item.entry,
            error: item.error,
          })));
        }
      }

      console.log(`[orchestrator] Processed ${result.filesProcessed} files`);
      console.log(`[orchestrator] Generated ${result.headersGenerated} headers`);
      console.log(`[orchestrator] Enriched ${result.entriesEnriched} entries`);
      console.log(`[orchestrator] Updated ${result.registryUpdated} registry entries`);

      if (result.errors.length > 0) {
        console.warn(`[orchestrator] ${result.errors.length} errors encountered`);
      }
    } catch (error) {
      console.error(`[orchestrator] Fatal error: ${error instanceof Error ? error.message : error}`);
      result.errors.push({
        file: 'project-level',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Process single file
   */
  async processFile(filePath: string): Promise<void> {
    try {
      const state = this.options.pipelineState || await new PipelineOrchestrator().run(
        this.options.projectDir,
        { outputDir: this.options.outputDir },
      );
      const extraction = this.createExtractionsFromState(state)
        .find(item => path.resolve(item.file) === path.resolve(filePath));

      if (!extraction) {
        throw new Error(`No pipeline extraction found for ${filePath}`);
      }

      if (this.options.generateHeaders) {
        await this.headerGenerator.insertHeaders(
          filePath,
          this.headerGenerator.generateHeaders(
            extraction.exports,
            extraction.imports,
            extraction.internalDependencies,
            extraction.externalDependencies,
          ),
        );
      }

      if (this.options.syncRegistry) {
        let enrichment = undefined;
        if (this.options.enrichLLM && this.llmEnricher.isAvailable()) {
          enrichment = await this.llmEnricher.enrich({
            file: filePath,
            exports: extraction.exports.map((e) => e.name),
            imports: extraction.imports.map((i) => i.name),
            internalDeps: extraction.internalDependencies,
            externalDeps: extraction.externalDependencies,
          });
        }

        await this.registrySyncer.syncEntry(
          filePath,
          extraction.exports,
          extraction.imports.map((item) => item.name || item.from),
          enrichment,
        );
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Find all source files in directory
   */
  private findSourceFiles(dir: string): string[] {
    const files: string[] = [];
    const ext = /\.(ts|tsx|js|jsx)$/;

    const traverse = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and .coderef
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            traverse(fullPath);
          }
        } else if (ext.test(entry)) {
          files.push(fullPath);
        }
      }
    };

    traverse(dir);
    return files;
  }

  private createExtractionsFromState(state: PipelineState): SemanticExtractionResult[] {
    const semanticElements = buildSemanticElementsFromState(state);
    const byFile = new Map<string, typeof semanticElements>();

    for (const element of semanticElements) {
      const existing = byFile.get(element.file) || [];
      existing.push(element);
      byFile.set(element.file, existing);
    }

    return Array.from(byFile.entries()).map(([file, elements]) => {
      const exports: ExportInfo[] = elements
        .filter(element => element.exported)
        .map(element => ({
          name: element.name,
          type: 'named',
          line: element.line,
          declaration: element.type,
        }));

      const imports: ImportInfo[] = [];
      const internalDependencies = new Set<string>();
      const externalDependencies = new Set<string>();

      for (const element of elements) {
        for (const item of element.imports || []) {
          const source = item.source;
          if (!source) continue;
          if (source.startsWith('.')) {
            internalDependencies.add(source);
          } else {
            externalDependencies.add(source);
          }
          for (const specifier of item.specifiers || []) {
            imports.push({
              name: specifier,
              from: source,
              type: 'named',
              line: item.line,
            });
          }
          if (item.default) {
            imports.push({ name: item.default, from: source, type: 'default', line: item.line });
          }
          if (item.namespace) {
            imports.push({ name: item.namespace, from: source, type: 'namespace', line: item.line });
          }
        }
      }

      return {
        file,
        exports,
        imports,
        internalDependencies: Array.from(internalDependencies),
        externalDependencies: Array.from(externalDependencies),
        executionTime: 0,
      };
    });
  }
}

/**
 * Convenience function to run full pipeline
 */
export async function runSemanticPipeline(options: SemanticPipelineOptions): Promise<PipelineResult> {
  const orchestrator = new SemanticOrchestrator(options);
  return orchestrator.processProject();
}
