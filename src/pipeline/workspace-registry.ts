/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability workspace-registry
 * @exports WorkspaceRegistry, loadWorkspaceRegistry
 * @used_by src/pipeline/import-resolver.ts, src/query/workspace-stitch.ts
 */

/**
 * Cross-repo workspace registry (WO-CROSS-REPO-WORKSPACE-LINKAGE-001,
 * STUB-6PGFZ3 / genre-features P12).
 *
 * A repo-local, OPT-IN mapping from package name to sibling project root at
 * `.coderef/workspace.json`:
 *
 *     {
 *       "version": 1,
 *       "packages": {
 *         "@coderef/core": "../CODEREF-CORE",
 *         "my-sibling-lib": "C:/abs/path/to/sibling"
 *       }
 *     }
 *
 * Relative roots resolve against the registry file's own directory
 * (`<projectRoot>/.coderef/`), so `../..`-style entries read naturally from
 * the repo root. Repo-agnostic by construction (layers.json precedent: core
 * bundles NO environment layout). ABSENT file = empty registry = byte-for-
 * byte identical pipeline output — the feature's no-regress guarantee.
 * A malformed file warns once and degrades to empty (never a gate).
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger.js';

/** Package name -> ABSOLUTE sibling project root. */
export type WorkspaceRegistry = ReadonlyMap<string, string>;

const EMPTY: WorkspaceRegistry = new Map();

/**
 * Load `<projectPath>/.coderef/workspace.json`. Single fs read — call it in
 * pass 1 beside loadExternalSet; resolution pass 2 stays a pure lookup
 * (the P12 pass-purity constraint).
 */
export function loadWorkspaceRegistry(projectPath: string): WorkspaceRegistry {
  const registryPath = path.join(projectPath, '.coderef', 'workspace.json');
  let raw: string;
  try {
    raw = fs.readFileSync(registryPath, 'utf-8');
  } catch {
    return EMPTY; // absent = zero behavior change
  }
  try {
    const parsed = JSON.parse(raw) as { packages?: Record<string, string> };
    const packages = parsed?.packages;
    if (!packages || typeof packages !== 'object') {
      logger.warn(`[workspace-registry] ${registryPath} has no packages{} map — ignoring.`);
      return EMPTY;
    }
    const out = new Map<string, string>();
    const baseDir = path.dirname(registryPath);
    for (const [pkg, root] of Object.entries(packages)) {
      if (typeof root !== 'string' || root.length === 0) continue;
      out.set(pkg, path.isAbsolute(root) ? path.normalize(root) : path.resolve(baseDir, root));
    }
    return out;
  } catch (e) {
    logger.warn(
      `[workspace-registry] Malformed ${registryPath} (${e instanceof Error ? e.message : String(e)}) — ignoring.`,
    );
    return EMPTY;
  }
}
