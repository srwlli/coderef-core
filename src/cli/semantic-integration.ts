/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability semantic-integration-semantic-integration-options
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

/**
 * The live `fs` module object — NOT the imported namespace view.
 *
 * `import * as fs` compiles to a TypeScript `__importStar` copy, whose members
 * are GETTER-ONLY bindings created by `__createBinding`. Assigning to them is a
 * no-op and `Object.defineProperty(fs, 'writeFileSync', ...)` throws
 * `TypeError: Cannot redefine property: writeFileSync` — so every `--dry-run`
 * crashed before doing any work (FU-TXEN-HEADERS).
 *
 * The object behind `require('fs')` carries ordinary configurable+writable data
 * properties AND is the exact object those namespace getters read through, so
 * patching it here is what actually intercepts writes made by
 * `src/semantic/orchestrator.ts` (which imports the namespace the same way).
 *
 * `createRequire(import.meta.url)` is NOT usable: this file is emitted as
 * CommonJS (tsconfig `module: commonjs`), where `import.meta` is a hard
 * compile error (TS1343). `eval('require')` reaches the genuine CJS `require`
 * at runtime without TypeScript rewriting it into the ESM interop shim.
 */
const fsLive: typeof fs = (() => {
  try {
    // eslint-disable-next-line no-eval
    const req = eval('typeof require === "function" ? require : null') as NodeRequire | null;
    const mod = req ? (req('fs') as typeof fs) : null;
    // Only trust it if it is genuinely patchable; otherwise fall back.
    if (mod && Object.getOwnPropertyDescriptor(mod, 'writeFileSync')?.writable) return mod;
  } catch {
    /* fall through */
  }
  return fs;
})();
import type { SemanticPipelineOptions, PipelineResult } from '../semantic/orchestrator.js';

export interface SemanticIntegrationOptions {
  projectDir: string;
  outputDir: string;
  registryPath: string;
  dryRun: boolean;
  generateHeaders: boolean;
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
  /** Per-target originals: [object, key, priorValue]. Each object is restored
   *  to the value IT held, so a mocked namespace never gets the real fs
   *  function written over it (and vice versa). */
  private _priorValues: Array<[any, string, unknown]> = [];

  constructor(orchestrator: SemanticOrchestrator, dryRun: boolean) {
    this.originalOrchestrator = orchestrator;
    this.dryRun = dryRun;

    if (this.dryRun) {
      this.interceptFileWrites();
    }
  }

  /**
   * Swap one property on a live module object.
   *
   * Plain assignment first: `require('fs')` exposes ordinary writable data
   * properties, so this is the path that actually runs. `defineProperty` is the
   * fallback for hosts that froze the descriptor. Both are attempted before
   * giving up, and a genuine failure is reported rather than swallowed — a
   * dry-run that cannot intercept writes must NOT proceed to touch source.
   */
  private static swap(target: any, key: string, value: unknown): boolean {
    try {
      target[key] = value;
      if (target[key] === value) return true;
    } catch {
      // fall through to defineProperty
    }
    try {
      Object.defineProperty(target, key, { configurable: true, writable: true, value });
      return true;
    } catch {
      // Non-configurable namespace view (ESM exotic object / __importStar copy).
      // Not fatal on its own: the live module object below is the binding that
      // downstream writes actually resolve through.
      return false;
    }
  }

  /**
   * Patch every distinct object that could carry the write function.
   *
   * `fsLive` is the real module and is what production code mutates through.
   * `fs` (the namespace) is normally a view onto it, but a test double —
   * `vi.mock('fs')` returns a plain object literal — makes them two different
   * objects, and callers importing the namespace would bypass a live-only
   * patch. Patching both keeps the guard honest under mocks and in production.
   * At least one target must succeed, or the caller treats it as a failure.
   */
  private static swapAll(
    targets: any[],
    key: string,
    value: unknown,
    record?: Array<[any, string, unknown]>,
  ): boolean {
    const seen = new Set<any>();
    let any = false;
    for (const t of targets) {
      if (!t || seen.has(t)) continue;
      seen.add(t);
      const prior = t[key];
      if (DryRunSemanticOrchestrator.swap(t, key, value)) {
        any = true;
        record?.push([t, key, prior]);
      }
    }
    return any;
  }

  private interceptFileWrites(): void {
    const originalWrite = fsLive.writeFileSync;
    const originalWriteFile = fsLive.promises.writeFile;
    this._originalWriteFileSync = originalWrite;
    this._originalWriteFile = originalWriteFile;
    this._restored = false;

    this._priorValues = [];

    const okSync = DryRunSemanticOrchestrator.swapAll([fsLive, fs], 'writeFileSync',
      (filePath: string, data: string | Buffer, ...args: any[]) => {
        if (this.shouldCapture(filePath)) {
          this.capturedWrites.set(filePath, typeof data === 'string' ? data : data.toString());
          return undefined;
        }
        return (originalWrite as any).call(fsLive, filePath, data, ...args);
      }, this._priorValues);

    const okAsync = DryRunSemanticOrchestrator.swapAll([fsLive.promises, fs.promises], 'writeFile',
      async (filePath: string, data: string | Buffer, ...args: any[]) => {
        if (this.shouldCapture(filePath)) {
          this.capturedWrites.set(filePath, typeof data === 'string' ? data : data.toString());
          return;
        }
        return (originalWriteFile as any).call(fsLive.promises, filePath, data, ...args);
      }, this._priorValues);

    if (!okSync || !okAsync) {
      // Leave nothing half-patched: a partial intercept is the dangerous state.
      this.restore();
      throw new Error(
        'dry-run guard could not intercept fs writes (no writable target for ' +
        `${!okSync ? 'writeFileSync' : 'promises.writeFile'}). ` +
        'Refusing to continue: --dry-run must not fall through to real writes.',
      );
    }
  }

  restore(): void {
    if (this._restored) return;
    // Restore each patched object to the value it personally held.
    for (const [target, key, prior] of this._priorValues) {
      DryRunSemanticOrchestrator.swap(target, key, prior);
    }
    this._priorValues = [];
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
