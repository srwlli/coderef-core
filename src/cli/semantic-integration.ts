/**
 * @coderef-semantic: 1.0.0
 * @exports SemanticIntegrationOptions, DryRunSemanticOrchestrator, runSemanticIntegration, validateIdempotency
 */

/**
 * Semantic CLI integration wrapper
 * Coordinates SemanticOrchestrator invocation with dry-run mode and safety guards
 */

import * as fs from 'fs';
import * as path from 'path';
import { SemanticOrchestrator } from '../semantic/orchestrator.js';
import type { SemanticPipelineOptions, PipelineResult } from '../semantic/orchestrator.js';

export interface SemanticIntegrationOptions {
  projectDir: string;
  outputDir: string;
  registryPath: string;
  dryRun: boolean;
  generateHeaders: boolean;
  enrichLLM: boolean;
  syncRegistry: boolean;
  singleFile?: string;
}

/**
 * Dry-run wrapper that prevents file writes
 */
export class DryRunSemanticOrchestrator {
  private originalOrchestrator: SemanticOrchestrator;
  private dryRun: boolean;
  private capturedWrites: Map<string, string> = new Map();

  constructor(orchestrator: SemanticOrchestrator, dryRun: boolean) {
    this.originalOrchestrator = orchestrator;
    this.dryRun = dryRun;

    if (this.dryRun) {
      this.interceptFileWrites();
    }
  }

  private interceptFileWrites(): void {
    const originalWrite = fs.writeFileSync;
    const originalWriteFile = fs.promises.writeFile;
    const mutableFs = fs as unknown as {
      writeFileSync: typeof fs.writeFileSync;
      promises: { writeFile: typeof fs.promises.writeFile };
    };

    mutableFs.writeFileSync = ((path: string, data: string | Buffer, ...args: any[]) => {
      if (this.shouldCapture(path)) {
        this.capturedWrites.set(path, typeof data === 'string' ? data : data.toString());
        return undefined as any;
      }
      return originalWrite.call(fs, path, data, ...args);
    }) as any;

    mutableFs.promises.writeFile = (async (path: string, data: string | Buffer, ...args: any[]) => {
      if (this.shouldCapture(path)) {
        this.capturedWrites.set(path, typeof data === 'string' ? data : data.toString());
        return;
      }
      return originalWriteFile.call(fs.promises, path, data, ...args);
    }) as any;
  }

  private shouldCapture(filePath: string): boolean {
    return filePath.endsWith('.ts') ||
           filePath.endsWith('.js') ||
           filePath.includes('registry') ||
           filePath.includes('.coderef');
  }

  async processProject(): Promise<PipelineResult> {
    return this.originalOrchestrator.processProject();
  }

  async processFile(filePath: string): Promise<void> {
    return this.originalOrchestrator.processFile(filePath);
  }

  getCapturedWrites(): Map<string, string> {
    return this.capturedWrites;
  }

  getWriteSummary(): { totalFiles: number; totalBytes: number; files: string[] } {
    return {
      totalFiles: this.capturedWrites.size,
      totalBytes: Array.from(this.capturedWrites.values()).reduce((sum, content) => sum + content.length, 0),
      files: Array.from(this.capturedWrites.keys()),
    };
  }
}

/**
 * Semantic integration entry point
 */
export async function runSemanticIntegration(options: SemanticIntegrationOptions): Promise<{
  success: boolean;
  result?: PipelineResult;
  writeSummary?: ReturnType<DryRunSemanticOrchestrator['getWriteSummary']>;
  error?: string;
}> {
  try {
    const orchestratorOptions: SemanticPipelineOptions = {
      projectDir: options.projectDir,
      outputDir: options.outputDir,
      registryPath: options.registryPath,
      generateHeaders: options.generateHeaders,
      enrichLLM: options.enrichLLM,
      syncRegistry: options.syncRegistry && !options.dryRun,
      validateOnly: options.dryRun,
    };

    const orchestrator = new SemanticOrchestrator(orchestratorOptions);
    const dryRunWrapper = new DryRunSemanticOrchestrator(orchestrator, options.dryRun);

    let result: PipelineResult;
    if (options.singleFile) {
      await dryRunWrapper.processFile(options.singleFile);
      result = {
        filesProcessed: 1,
        headersGenerated: 0,
        entriesEnriched: 0,
        registryUpdated: 0,
        errors: [],
        executionTime: 0,
      };
    } else {
      result = await dryRunWrapper.processProject();
    }

    if (options.dryRun) {
      const writeSummary = dryRunWrapper.getWriteSummary();
      return {
        success: true,
        result,
        writeSummary,
      };
    }

    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate idempotency by running twice and comparing results
 */
export async function validateIdempotency(options: SemanticIntegrationOptions): Promise<{
  isIdempotent: boolean;
  firstRun?: PipelineResult;
  secondRun?: PipelineResult;
  error?: string;
}> {
  try {
    const dryRunOptions = { ...options, dryRun: true };

    const firstResult = await runSemanticIntegration(dryRunOptions);
    if (!firstResult.success) {
      return { isIdempotent: false, error: `First run failed: ${firstResult.error}` };
    }

    const secondResult = await runSemanticIntegration(dryRunOptions);
    if (!secondResult.success) {
      return { isIdempotent: false, error: `Second run failed: ${secondResult.error}` };
    }

    const isIdempotent =
      firstResult.result?.filesProcessed === secondResult.result?.filesProcessed &&
      firstResult.result?.headersGenerated === secondResult.result?.headersGenerated &&
      firstResult.result?.entriesEnriched === secondResult.result?.entriesEnriched;

    return {
      isIdempotent,
      firstRun: firstResult.result,
      secondRun: secondResult.result,
    };
  } catch (error) {
    return {
      isIdempotent: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
