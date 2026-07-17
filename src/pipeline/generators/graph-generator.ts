/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability graph-generator
 * @exports GraphGenerator
 * @used_by src/cli/populate.ts, __tests__/generators/root-cause-alignment.test.ts
 */

/**
 * GraphGenerator - Generate graph.json from PipelineState
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 3, Task GEN-002
 *
 * Produces: .coderef/graph.json
 * Format: ExportedGraph with nodes and edges
 * Schema: Matches packages/core/src/export/graph-exporter.ts ExportedGraph interface
 */



import * as fs from 'fs/promises';
import { readFileSync } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import type { PipelineState } from '../types.js';
import type { ExportedGraph } from '../../export/graph-exporter.js';
import { normalizeGraphForOutput } from './graph-output.js';
import { buildManifest, type ManifestSourceFile } from '../staleness-manifest.js';
import logger from '../../utils/logger.js';

/**
 * GraphGenerator - Produce graph.json from dependency graph
 */
export class GraphGenerator {
  /**
   * Generate graph.json from pipeline state
   *
   * @param state Populated pipeline state
   * @param outputDir Output directory (.coderef/)
   */
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const graphPath = path.join(outputDir, 'graph.json');
    const outputGraph = normalizeGraphForOutput(state.graph, state.projectPath);

    // Write to file
    const content = JSON.stringify(outputGraph, null, 2);
    await fs.writeFile(graphPath, content, 'utf-8');

    if (state.options.verbose) {
      logger.debug(
        `[GraphGenerator] Generated graph.json with ${outputGraph.nodes.length} nodes, ${outputGraph.edges.length} edges`
      );
    }

    // WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 8 (staleness-contract):
    // write the authoritative scan-time file-hash manifest alongside graph.json,
    // at the SAME build instant, so a query-time checker can tell whether a source
    // file has changed since the graph was built. ADDITIVE — graph.json is
    // byte-unchanged. Best-effort: a manifest-write failure logs and does NOT fail
    // the build (mirrors the best-effort validation-report write in populate.ts).
    try {
      await this.writeStalenessManifest(outputGraph, state.projectPath, outputDir);
    } catch (e) {
      logger.warn(
        `[GraphGenerator] Failed to write staleness manifest (non-fatal): ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  /**
   * Write `.coderef/manifest.json`: one sha256 per unique source file that fed the
   * graph, keyed by the same project-relative POSIX path graph.json already uses
   * (nodes[].file is normalized by normalizeGraphForOutput). Hashing is synchronous
   * per file via the same createHash('sha256') the IncrementalCache uses — populate
   * already read every file, so the marginal cost is one hash per file. A file that
   * cannot be read at build time is skipped (no entry) rather than failing the run.
   */
  private async writeStalenessManifest(
    outputGraph: ExportedGraph,
    projectPath: string,
    outputDir: string,
  ): Promise<void> {
    // Collect unique source files (project-relative POSIX) with their build-time size.
    const files: ManifestSourceFile[] = [];
    const seen = new Set<string>();
    for (const node of outputGraph.nodes) {
      const rel = node.file;
      if (!rel || seen.has(rel)) continue;
      seen.add(rel);
      let size = 0;
      try {
        size = readFileSync(path.join(projectPath, rel)).length;
      } catch {
        // Unreadable at build time — still record the path so hashOf can decide;
        // hashOf below returns undefined for it and buildManifest skips it.
      }
      files.push({ path: rel, size });
    }

    const hashOf = (rel: string): string | undefined => {
      try {
        return createHash('sha256').update(readFileSync(path.join(projectPath, rel))).digest('hex');
      } catch {
        return undefined; // unreadable -> no manifest entry (no-data, not stale)
      }
    };

    const manifest = buildManifest(files, hashOf, new Date().toISOString());
    const manifestPath = path.join(outputDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    logger.debug(
      `[GraphGenerator] Generated manifest.json with ${Object.keys(manifest.files).length} file hashes`
    );
  }
}
