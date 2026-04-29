/**
 * Semantic orchestrator - coordinates full workflow
 *
 * Orchestrates AST extraction, header generation, LLM enrichment,
 * and registry synchronization for complete semantic processing pipeline.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ASTExtractor, extractBatch } from './ast-extractor.js';
import { HeaderGenerator } from './header-generator.js';
import { LLMEnricher } from './llm-enricher.js';
import { RegistrySyncer } from './registry-sync.js';
import type { ExportInfo, ImportInfo, SemanticExtractionResult } from './ast-extractor.js';

export interface SemanticPipelineOptions {
  projectDir: string;
  outputDir: string;
  registryPath: string;
  generateHeaders?: boolean;
  enrichLLM?: boolean;
  syncRegistry?: boolean;
  validateOnly?: boolean;
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
  private astExtractor: ASTExtractor;
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

    this.astExtractor = new ASTExtractor();
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
      // Find all TypeScript/JavaScript files
      const files = this.findSourceFiles(this.options.projectDir);
      result.filesProcessed = files.length;

      // Extract semantic information from all files
      const extractions = await this.astExtractor.extractDirectory(
        this.options.projectDir,
      );

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
            imports: extraction.imports,
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
          result.errors.push(...syncResult.errors);
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
      const extraction = await this.astExtractor.extractFile(filePath);

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

        await this.registrySyncer.syncEntry(filePath, extraction.exports, extraction.imports, enrichment);
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
}

/**
 * Convenience function to run full pipeline
 */
export async function runSemanticPipeline(options: SemanticPipelineOptions): Promise<PipelineResult> {
  const orchestrator = new SemanticOrchestrator(options);
  return orchestrator.processProject();
}
