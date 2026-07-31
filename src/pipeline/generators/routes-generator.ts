/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability routes-generator
 * @exports RoutesGenerator
 * @used_by src/cli/populate.ts
 */

/**
 * RoutesGenerator - emit .coderef/routes.json + .coderef/frontend-calls.json
 *
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 - Phase 1 (REC-001)
 *
 * Produces: .coderef/routes.json, .coderef/frontend-calls.json
 *
 * This generator is the missing PRODUCER. Both artifacts have had a well-tested
 * emission path since WO-API-ROUTE-DETECTION-001 — `saveRoutesToFile` and
 * `saveFrontendCallsToFile` in generator/generateRoutes.ts — but the only caller was
 * `saveIndex()`, which lost its production call site when PipelineOrchestrator
 * replaced the legacy scan. Nothing here reimplements grouping, sorting, or
 * formatting: those exported functions are invoked verbatim.
 *
 * The one piece of glue is materialising carrier ElementData objects. The generators
 * filter on `element.route` / `element.frontendCall`, but the pipeline deliberately
 * keeps API-surface facts OFF `state.elements` (stamping carriers into the element
 * inventory would shift index.json counts and every coverage/complexity denominator
 * derived from it). Carriers are therefore built LOCALLY here, live only for the
 * duration of the write, and never enter pipeline state.
 */

import * as path from 'path';
import type { PipelineState } from '../types.js';
import type { ElementData } from '../../types/types.js';
import {
  saveRoutesToFile,
  saveFrontendCallsToFile,
} from '../../generator/generateRoutes.js';
import logger from '../../utils/logger.js';

export class RoutesGenerator {
  async generate(state: PipelineState, outputDir: string): Promise<void> {
    const routes = state.routes ?? [];
    const frontendCalls = state.frontendCalls ?? [];

    // Carrier elements exist only to satisfy the generators' ElementData contract.
    // `type: 'function'` matches what the legacy scanner recorded for route handlers.
    const routeCarriers: ElementData[] = routes.map(fact => ({
      type: 'function',
      name: fact.name,
      file: fact.file,
      line: fact.line,
      route: fact.route,
    }));

    const callCarriers: ElementData[] = frontendCalls.map(call => ({
      type: 'function',
      name: call.callType,
      file: call.file,
      line: call.line,
      frontendCall: call,
    }));

    // projectPath is recorded ABSOLUTE, deliberately. state.projectPath carries the raw
    // CLI argument, so `populate-coderef .` would otherwise stamp the literal "." — a
    // value that identifies no project at all. This is the exact field whose staleness
    // caused the defect this phase repairs: the replaced artifact pointed at a different
    // checkout entirely, which let a validate-routes run assert against a foreign,
    // five-month-old inventory. A reader must be able to tell from the artifact alone
    // which project it describes.
    const projectPath = path.resolve(state.projectPath);

    await saveRoutesToFile(
      routeCarriers,
      path.join(outputDir, 'routes.json'),
      projectPath,
    );

    await saveFrontendCallsToFile(
      callCarriers,
      path.join(outputDir, 'frontend-calls.json'),
      projectPath,
    );

    if (state.options.verbose) {
      const frameworks = Array.from(new Set(routes.map(r => r.route.framework)));
      logger.info(
        `[RoutesGenerator] ${routes.length} route(s)` +
          (frameworks.length ? ` across ${frameworks.join(', ')}` : '') +
          `, ${frontendCalls.length} frontend call(s)`,
      );
    }
  }
}

export default RoutesGenerator;
