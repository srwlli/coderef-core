/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability workspace-stitch
 * @exports WorkspaceStitchResult, stitchWorkspace
 * @used_by src/cli/mcp/graph-tools.ts, src/cli/coderef-query.ts
 */

/**
 * Query-time cross-repo workspace stitching (WO-CROSS-REPO-WORKSPACE-
 * LINKAGE-001). Composes the repo-local workspace registry with sibling
 * `.coderef/graph.json` artifacts to surface package-grain cross-repo
 * dependency links in BOTH directions:
 *
 *   outbound — THIS repo's workspace-tagged external-import edges into each
 *              sibling (what of mine depends on them);
 *   inbound  — each sibling's workspace-tagged edges whose workspaceRoot
 *              resolves back to THIS repo (what of theirs depends on me —
 *              the cross-repo half of impact_of).
 *
 * Deliberately a PROJECTION, never persisted: sibling graphs age
 * independently, so every sibling block carries its own generatedAt and an
 * absent/stale sibling is a DISCLOSED skip, never a fabricated negative.
 * Package-grain, not symbol-grain (v1): links name files and packages, not
 * elements. Surfaces, not verdicts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadWorkspaceRegistry } from '../pipeline/workspace-registry.js';

interface TaggedEdgeLite {
  sourceFile: string | undefined;
  workspacePackage: string;
  workspaceRoot: string | undefined;
}

export interface WorkspaceStitchResult {
  registry_present: boolean;
  packages: number;
  siblings: Array<{
    package: string;
    root: string;
    graph: 'loaded' | 'absent' | 'unreadable';
    graph_generated_at?: string;
    /** THIS repo's files importing the sibling package (workspace-tagged). */
    outbound_files?: string[];
    outbound_edge_count?: number;
    /** Sibling files whose workspace-tagged edges point back at THIS repo. */
    inbound_files?: string[];
    inbound_edge_count?: number;
  }>;
  disclosure: string;
}

function taggedEdges(graphPath: string): { edges: TaggedEdgeLite[]; generatedAt?: string } | null {
  let parsed: {
    exportedAt?: string;
    edges?: Array<{
      sourceLocation?: { file?: string };
      evidence?: { kind?: string; workspacePackage?: string; workspaceRoot?: string };
    }>;
  };
  try {
    parsed = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  } catch {
    return null;
  }
  const out: TaggedEdgeLite[] = [];
  for (const e of parsed.edges ?? []) {
    const ev = e.evidence;
    if (!ev || ev.kind !== 'external-import' || ev.workspacePackage === undefined) continue;
    out.push({
      sourceFile: e.sourceLocation?.file,
      workspacePackage: ev.workspacePackage,
      workspaceRoot: ev.workspaceRoot,
    });
  }
  return { edges: out, generatedAt: parsed.exportedAt };
}

/**
 * Stitch THIS project's workspace registry against sibling graphs. Pure
 * read-side composition — two graph loads per sibling at most, no writes.
 */
export function stitchWorkspace(projectDir: string): WorkspaceStitchResult {
  const registry = loadWorkspaceRegistry(projectDir);
  const result: WorkspaceStitchResult = {
    registry_present: registry.size > 0,
    packages: registry.size,
    siblings: [],
    disclosure:
      'Package-grain projection (v1): links name files and packages, not symbols. ' +
      'Inbound coverage requires the sibling to have re-populated with its own ' +
      'workspace registry; an absent sibling graph is a disclosed skip, not "no dependents".',
  };
  if (registry.size === 0) return result;

  const selfResolved = path.resolve(projectDir);
  const own = taggedEdges(path.join(projectDir, '.coderef', 'graph.json'));

  for (const [pkg, root] of registry) {
    const sib: WorkspaceStitchResult['siblings'][number] = { package: pkg, root, graph: 'absent' };
    // Outbound: my tagged edges naming this package.
    if (own) {
      const mine = own.edges.filter(e => e.workspacePackage === pkg);
      sib.outbound_edge_count = mine.length;
      sib.outbound_files = [...new Set(mine.map(e => e.sourceFile).filter((f): f is string => !!f))].sort().slice(0, 25);
    }
    // Inbound: sibling's tagged edges resolving back to me.
    const sibGraphPath = path.join(root, '.coderef', 'graph.json');
    if (!fs.existsSync(sibGraphPath)) {
      result.siblings.push(sib);
      continue;
    }
    const sibTagged = taggedEdges(sibGraphPath);
    if (!sibTagged) {
      sib.graph = 'unreadable';
      result.siblings.push(sib);
      continue;
    }
    sib.graph = 'loaded';
    sib.graph_generated_at = sibTagged.generatedAt;
    const inbound = sibTagged.edges.filter(
      e => e.workspaceRoot !== undefined && path.resolve(e.workspaceRoot) === selfResolved,
    );
    sib.inbound_edge_count = inbound.length;
    sib.inbound_files = [...new Set(inbound.map(e => e.sourceFile).filter((f): f is string => !!f))].sort().slice(0, 25);
    result.siblings.push(sib);
  }
  return result;
}
