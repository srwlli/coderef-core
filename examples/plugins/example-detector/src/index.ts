/**
 * Example Plugin - FastAPI Detector
 * WO-PLUGIN-SYSTEM-001
 *
 * Demonstrates the CodeRef plugin API with a FastAPI route detector
 * and a graph hook for adding route relationships.
 */

import { fastapiRouteDetector } from './detectors/fastapi.js';
import { routeRelationshipsHook } from './hooks/route-relationships.js';

/**
 * Plugin exports
 * Detectors and hooks are exported for the plugin loader
 */
export const detectors = {
  'fastapi-routes': fastapiRouteDetector
};

export const hooks = {
  'add-route-relationships': routeRelationshipsHook
};

/**
 * Plugin metadata
 */
export const pluginInfo = {
  name: '@coderef/example-detector',
  version: '1.0.0',
  description: 'Example plugin demonstrating CodeRef plugin API',
  detectors: Object.keys(detectors),
  hooks: Object.keys(hooks)
};

// Default export
export default {
  detectors,
  hooks,
  pluginInfo
};
