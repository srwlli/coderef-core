/**
 * @coderef-semantic: 1.0.0
 * @exports saveIndex
 */



/**
 * Save Index - Save scan results to disk
 *
 * Outputs: .coderef/index.json, .coderef/routes.json (WO-API-ROUTE-DETECTION-001)
 *
 * @module fileGeneration/saveIndex
 */

import * as path from 'path';
import type { ElementData } from '../types/types.js';
import { saveRoutesToFile } from '../generator/generateRoutes.js';
import { writeIndexVariants } from './index-storage.js';

/**
 * Save scan results to .coderef/index.json
 *
 * @param projectPath - Absolute path to project root
 * @param elements - Array of code elements from scan
 * @returns Promise that resolves when file is written
 *
 * @example
 * ```typescript
 * const elements = await scanCurrentElements('./src', ['ts', 'tsx']);
 * await saveIndex('./my-project', elements);
 * // Creates: ./my-project/.coderef/index.json
 * ```
 */
export async function saveIndex(
  projectPath: string,
  elements: ElementData[]
): Promise<void> {
  const coderefDir = path.join(projectPath, '.coderef');
  await writeIndexVariants(coderefDir, elements, { projectPath });

  // WO-API-ROUTE-DETECTION-001: Generate routes.json
  const routesPath = path.join(projectPath, '.coderef', 'routes.json');
  await saveRoutesToFile(elements, routesPath, projectPath);
}
