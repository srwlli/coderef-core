/**
 * RegistryGenerator - Persist the entity registry to disk
 *
 * WO-CODEREF-CORE-REGISTRY-001 - Phase 1, Task T1-5
 *
 * Produces: .coderef/registry/entities.json
 * Format: RegistryState with entities and stats
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PipelineState } from '../types.js';
import { globalRegistry } from '../../registry/entity-registry.js';
import { buildSemanticElementsFromState } from '../semantic-elements.js';
import { createSemanticRegistryProjection } from '../../semantic/projections.js';

/**
 * RegistryGenerator - Produce entities.json from the global registry
 */
export class RegistryGenerator {
  /**
   * Generate entities.json from the global registry
   * 
   * @param state Pipeline state (registry is already populated during extraction)
   * @param outputDir Output directory (.coderef/)
   */
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const registryDir = path.join(outputDir, 'registry');
    const registryPath = path.join(registryDir, 'entities.json');
    const semanticRegistryPath = path.join(outputDir, 'semantic-registry.json');

    // Ensure registry directory exists
    await fs.mkdir(registryDir, { recursive: true });

    // Get the final state from the singleton
    const registryState = globalRegistry.getState();

    // Write to file
    const content = JSON.stringify(registryState, null, 2);
    await fs.writeFile(registryPath, content, 'utf-8');

    const semanticElements = buildSemanticElementsFromState(state);

    await fs.writeFile(
      semanticRegistryPath,
      JSON.stringify(
        createSemanticRegistryProjection(semanticElements, state.projectPath, {
          rawImports: state.rawImports,
          rawCalls: state.rawCalls,
          rawExports: state.rawExports,
          headerImportFacts: state.headerImportFacts,
        }),
        null,
        2,
      ),
      'utf-8',
    );

    if (state.options.verbose) {
      console.log(
        `[RegistryGenerator] Generated entities.json with ${registryState.stats.totalEntities} entities across ${registryState.stats.distinctFiles} files`
      );
      console.log(`[RegistryGenerator] Generated semantic-registry.json as an index projection`);
    }
  }
}
