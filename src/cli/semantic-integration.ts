/**
 * @coderef-semantic: 1.0.0
 * @exports SemanticIntegrationOptions, DryRunSemanticOrchestrator, runSemanticIntegration, validateIdempotency
 * @used_by src/cli/semantic-integration-cli.ts, src/cli/semantic-integration.test.ts
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports SemanticIntegrationOptions, DryRunSemanticOrchestrator, runSemanticIntegration, validateIdempotency
 * @used_by src/cli/semantic-integration-cli.ts, src/cli/semantic-integration.test.ts
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
  private _originalWriteFileSync: typeof fs.writeFileSync | null = null;
  private _originalWriteFile: typeof fs.promises.writeFile | null = null;
  private _restored: boolean = false;

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
    this._originalWriteFileSync = originalWrite;
    this._originalWriteFile = originalWriteFile;
    this._restored = false;

    Object.defineProperty(fs, 'writeFileSync', {
      configurable: true,
      writable: true,
      value: (filePath: string, data: string | Buffer, ...args: any[]) => {
        if (this.shouldCapture(filePath)) {
          this.capturedWrites.set(filePath, typeof data === 'string' ? data : data.toString());
          return undefined;
        }
        return originalWrite.call(fs, filePath, data, ...args);
      },
    });

    Object.defineProperty(fs.promises, 'writeFile', {
      configurable: true,
      writable: true,
      value: async (filePath: string, data: string | Buffer, ...args: any[]) => {
        if (this.shouldCapture(filePath)) {
          this.capturedWrites.set(filePath, typeof data === 'string' ? data : data.toString());
          return;
        }
        return originalWriteFile.call(fs.promises, filePath, data, ...args);
      },
    });
  }

  restore(): void {
    if (this._restored) return;
    if (this._originalWriteFileSync !== null) {
      Object.defineProperty(fs, 'writeFileSync', {
        configurable: true,
        writable: true,
        value: this._originalWriteFileSync,
      });
    }
    if (this._originalWriteFile !== null) {
      Object.defineProperty(fs.promises, 'writeFile', {
        configurable: true,
        writable: true,
        value: this._originalWriteFile,
      });
    }
    this._restored = true;
  }

  private shouldCapture(filePath: string): boolean {
    return filePath.endsWith('.ts') ||
           filePath.endsWith('.js') ||
           filePath.includes('registry') ||
           filePath.includes('.coderef');
  }

  async processProject(): Promise<PipelineResult> {
    try {
      return await this.originalOrchestrator.processProject();
    } finally {
      this.restore();
    }
  }

  async processFile(filePath: string): Promise<void> {
    try {
      return await this.originalOrchestrator.processFile(filePath);
    } finally {
      this.restore();
    }
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
