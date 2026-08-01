/**
 * Boundary contract tests — WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001 (P1-T4).
 *
 * Encodes the INTENDED migration boundary as executable contracts:
 *   A. Canonical .coderef artifact paths have ONE schema owner (pipeline
 *      generators); legacy writers cannot silently clobber a pipeline-owned
 *      .coderef dir (keyed on .coderef/manifest.json, written only by populate).
 *   B. The public ContextGenerator identity is the same class through every
 *      supported entrypoint (root barrel === src barrel), with both concrete
 *      classes exported under unambiguous names.
 *   C. The default pipeline/full-watch execution performs ONE canonical parse —
 *      no implicit coderef-scan leg before populate.
 *   D. Shared serializers (index-storage) live under a neutral artifacts module;
 *      pipeline generators do not import from the legacy fileGeneration dir.
 *   E. The ambiguous barrel exports of competing legacy writers are quarantined
 *      behind the explicit legacy compatibility module.
 *
 * Ratchet discipline: contracts not yet enforced are `it.fails` (expected-fail).
 * When a phase lands its enforcement, vitest will REPORT the it.fails as a
 * failure-because-it-passed — flip that test to plain `it` in the same commit.
 * Flip schedule: A/D/E → Phase 2, B → Phase 3, C → Phase 4.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const LEGACY_WRITER_NAMES = [
  'saveIndex',
  'generateContext',
  'buildDependencyGraph',
  'detectPatterns',
  'analyzeCoverage',
  'validateReferences',
  'detectDrift',
  'generateDiagrams',
] as const;

async function importRootBarrel(): Promise<Record<string, unknown>> {
  return (await import(/* @vite-ignore */ '../../index.js')) as Record<string, unknown>;
}

async function importSrcBarrel(): Promise<Record<string, unknown>> {
  return (await import(/* @vite-ignore */ '../../src/index.js')) as Record<string, unknown>;
}

function makePipelineOwnedCoderefDir(): string {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-boundary-'));
  const coderefDir = path.join(projectDir, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  // manifest.json is written exclusively by the pipeline GraphGenerator —
  // its presence marks the dir as pipeline-owned.
  fs.writeFileSync(
    path.join(coderefDir, 'manifest.json'),
    JSON.stringify({ version: 1, files: {} }),
  );
  fs.writeFileSync(
    path.join(coderefDir, 'graph.json'),
    JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), nodes: [], edges: [], statistics: {} }),
  );
  return projectDir;
}

describe('Contract A — legacy writers cannot clobber a pipeline-owned .coderef', () => {
  // Enforced since Phase 2 (guard ships with the legacy compatibility module).
  it('legacy buildDependencyGraph refuses to overwrite canonical graph.json', async () => {
    const projectDir = makePipelineOwnedCoderefDir();
    const legacy = (await import(/* @vite-ignore */ '../../src/legacy/file-generation.js')) as {
      buildDependencyGraph: (p: string, e: unknown[]) => Promise<unknown>;
    };
    const before = fs.readFileSync(path.join(projectDir, '.coderef', 'graph.json'), 'utf-8');
    await expect(legacy.buildDependencyGraph(projectDir, [])).rejects.toThrow(/pipeline-owned|canonical/i);
    const after = fs.readFileSync(path.join(projectDir, '.coderef', 'graph.json'), 'utf-8');
    expect(after).toBe(before);
  });

  // Enforced since Phase 2.
  it('legacy saveIndex refuses to overwrite a pipeline-owned index', async () => {
    const projectDir = makePipelineOwnedCoderefDir();
    const legacy = (await import(/* @vite-ignore */ '../../src/legacy/file-generation.js')) as {
      saveIndex: (p: string, e: unknown[]) => Promise<unknown>;
    };
    await expect(legacy.saveIndex(projectDir, [])).rejects.toThrow(/pipeline-owned|canonical/i);
  });

  // Enforced since Phase 2. On an unpopulated dir (no manifest.json) the
  // legacy compatibility path still works — semver compatibility preserved.
  it('legacy writers still work against a non-pipeline directory', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-boundary-free-'));
    const legacy = (await import(/* @vite-ignore */ '../../src/legacy/file-generation.js')) as {
      saveIndex: (p: string, e: unknown[]) => Promise<unknown>;
    };
    await legacy.saveIndex(projectDir, []);
    expect(fs.existsSync(path.join(projectDir, '.coderef', 'index.json'))).toBe(true);
  });
});

describe('Contract B — one public ContextGenerator identity across entrypoints', () => {
  // Enforced since Phase 3 (entrypoint unification).
  it('root barrel and src barrel expose the SAME ContextGenerator class', async () => {
    const root = await importRootBarrel();
    const src = await importSrcBarrel();
    expect(root.ContextGenerator).toBeDefined();
    expect(root.ContextGenerator).toBe(src.ContextGenerator);
  });

  // Enforced since Phase 3.
  it('both concrete classes are exported under unambiguous names', async () => {
    const src = await importSrcBarrel();
    expect(src.PipelineContextGenerator).toBeDefined();
    expect(src.CodebaseContextService).toBeDefined();
    expect(src.PipelineContextGenerator).not.toBe(src.CodebaseContextService);
    // The canonical short name stays on the pipeline artifact generator.
    expect(src.ContextGenerator).toBe(src.PipelineContextGenerator);
  });

  // Enforced since Phase 3 (root barrel gains the pipeline surface).
  it('root barrel exposes the pipeline surface (PipelineOrchestrator)', async () => {
    const root = await importRootBarrel();
    expect(root.PipelineOrchestrator).toBeDefined();
  });
});

describe('Contract C — default pipeline performs one canonical parse', () => {
  const pipelineSrc = () =>
    fs.readFileSync(path.join(REPO_ROOT, 'src', 'cli', 'coderef-pipeline.ts'), 'utf-8');
  const watchSrc = () =>
    fs.readFileSync(path.join(REPO_ROOT, 'src', 'cli', 'coderef-watch.ts'), 'utf-8');

  // FLIP TO `it` IN PHASE 4 (scan leg removed from default execution).
  it.fails('coderef-pipeline default leg set excludes the scan leg', () => {
    // Post-P4 the CLI declares DEFAULT_LEG_NAMES without 'scan' (scan stays
    // available explicitly via --only=scan / --with-scan).
    expect(pipelineSrc()).toMatch(/DEFAULT_LEG_NAMES[^;]*=\s*\[\s*'populate'/);
  });

  // FLIP TO `it` IN PHASE 4 (full-watch flush no longer double-parses).
  it.fails('coderef-watch full flush does not chain the scan leg', () => {
    expect(watchSrc()).not.toMatch(/'scan,populate/);
  });

  it('coderef-scan remains available as an explicit standalone diagnostic', () => {
    // scanCurrentElements stays the lightweight API of the scan CLI — this is
    // a retained surface, true before and after the boundary work.
    expect(fs.readFileSync(path.join(REPO_ROOT, 'src', 'cli', 'scan.ts'), 'utf-8')).toMatch(
      /scanCurrentElements/,
    );
  });
});

describe('Contract D — shared serializers live behind a neutral module', () => {
  // Enforced since Phase 2 (index-storage re-homed to src/artifacts/).
  it('index-storage is importable from the neutral artifacts module', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'src', 'artifacts', 'index-storage.ts'))).toBe(true);
  });

  // Enforced since Phase 2.
  it('pipeline generators do not import from the legacy fileGeneration dir', () => {
    const generatorsDir = path.join(REPO_ROOT, 'src', 'pipeline', 'generators');
    const offenders = fs
      .readdirSync(generatorsDir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) =>
        /from\s+'[^']*fileGeneration\//.test(
          fs.readFileSync(path.join(generatorsDir, f), 'utf-8'),
        ),
      );
    expect(offenders).toEqual([]);
  });
});

describe('Contract E — competing legacy writers are quarantined off the barrels', () => {
  // Enforced since Phase 2 (ambiguous root exports removed).
  it('src barrel no longer exports the competing legacy writers', async () => {
    const src = await importSrcBarrel();
    for (const name of LEGACY_WRITER_NAMES) {
      expect(src[name], `src barrel still exports ${name}`).toBeUndefined();
    }
  });

  // Enforced since Phase 2.
  it('root barrel no longer exports the competing legacy writers', async () => {
    const root = await importRootBarrel();
    for (const name of LEGACY_WRITER_NAMES) {
      expect(root[name], `root barrel still exports ${name}`).toBeUndefined();
    }
  });

  // Enforced since Phase 2 (documented compatibility path).
  it('the explicit legacy module exposes every quarantined writer', async () => {
    const legacy = (await import(/* @vite-ignore */ '../../src/legacy/file-generation.js')) as Record<
      string,
      unknown
    >;
    for (const name of LEGACY_WRITER_NAMES) {
      expect(legacy[name], `legacy module missing ${name}`).toBeTypeOf('function');
    }
  });

  it('the retained lightweight scanner API stays exported from both barrels', async () => {
    const root = await importRootBarrel();
    const src = await importSrcBarrel();
    expect(root.scanCurrentElements).toBeTypeOf('function');
    expect(src.scanCurrentElements).toBeTypeOf('function');
    expect(root.scanCurrentElements).toBe(src.scanCurrentElements);
  });
});
