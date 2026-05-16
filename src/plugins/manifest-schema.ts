/**
 * @coderef-semantic: 1.0.0
 * @exports ExampleManifest, MANIFEST_FILENAME, ManifestSchema, getManifestPath, parseManifest, validateManifest
 * @used_by src/plugins/loaders/config-loader.ts, src/plugins/loaders/local-loader.ts, src/plugins/loaders/npm-loader.ts
 */

/**
 * Plugin Manifest Schema
 * WO-PLUGIN-SYSTEM-001: Plugin system for custom detectors
 *
 * JSON Schema and validation for coderef-plugin.json manifest files.
 * Plugins must include this file in their root directory.
 */

import { PluginManifest, DetectorDefinition, HookDefinition } from './types.js';

/**
 * JSON Schema for coderef-plugin.json
 * Can be used for validation with ajv or similar
 */
export const ManifestSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['name', 'version', 'main', 'coderefVersion'],
  properties: {
    name: {
      type: 'string',
      description: 'Plugin name - must match npm package name for published plugins',
      pattern: '^(@[a-z0-9-]+/)?[a-z0-9-]+$'
    },
    version: {
      type: 'string',
      description: 'Semantic version',
      pattern: '^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.-]+)?$'
    },
    description: {
      type: 'string',
      description: 'Human-readable description'
    },
    author: {
      type: 'string',
      description: 'Plugin author'
    },
    main: {
      type: 'string',
      description: 'Plugin entry point - relative path from plugin root'
    },
    coderefVersion: {
      type: 'string',
      description: 'Required CodeRef core version range (e.g., ">=0.5.0")'
    },
    detectors: {
      type: 'array',
      description: 'Detectors provided by this plugin',
      items: {
        type: 'object',
        required: ['name', 'patterns'],
        properties: {
          name: {
            type: 'string',
            description: 'Detector name - unique within plugin'
          },
          description: {
            type: 'string',
            description: 'Human-readable description'
          },
          patterns: {
            type: 'array',
            description: 'File patterns this detector handles',
            items: { type: 'string' },
            minItems: 1
          },
          entry: {
            type: 'string',
            description: 'Entry point for this detector - exports the detector implementation'
          }
        }
      }
    },
    hooks: {
      type: 'array',
      description: 'Graph hook definitions',
      items: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: {
            type: 'string',
            description: 'Hook name'
          },
          type: {
            type: 'string',
            description: 'Hook type - when it executes',
            enum: ['pre-scan', 'post-scan', 'pre-graph', 'post-graph', 'custom-edge']
          },
          description: {
            type: 'string',
            description: 'Human-readable description'
          },
          entry: {
            type: 'string',
            description: 'Entry point for this hook'
          }
        }
      }
    },
    dependencies: {
      type: 'array',
      description: 'Plugin dependencies',
      items: { type: 'string' }
    }
  }
};

/**
 * Validate a manifest against the schema
 * @param manifest - Manifest object to validate
 * @returns Validation result with errors if any
 */
export function validateManifest(manifest: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'] };
  }

  const m = manifest as PluginManifest;

  // Check required fields
  if (!m.name) {
    errors.push('Missing required field: name');
  } else if (!/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/.test(m.name)) {
    errors.push('Invalid name format - expected npm package name format');
  }

  if (!m.version) {
    errors.push('Missing required field: version');
  } else if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(m.version)) {
    errors.push('Invalid version format - expected semver (e.g., 1.0.0)');
  }

  if (!m.main) {
    errors.push('Missing required field: main');
  }

  if (!m.coderefVersion) {
    errors.push('Missing required field: coderefVersion');
  }

  // Validate detectors
  if (m.detectors) {
    if (!Array.isArray(m.detectors)) {
      errors.push('Field "detectors" must be an array');
    } else {
      const detectorNames = new Set<string>();

      for (let i = 0; i < m.detectors.length; i++) {
        const detector = m.detectors[i];

        if (!detector.name) {
          errors.push(`Detector[${i}]: Missing required field: name`);
        } else {
          if (detectorNames.has(detector.name)) {
            errors.push(`Detector[${i}]: Duplicate detector name: ${detector.name}`);
          }
          detectorNames.add(detector.name);
        }

        if (!detector.patterns || !Array.isArray(detector.patterns) || detector.patterns.length === 0) {
          errors.push(`Detector[${i}]: Missing or empty field: patterns`);
        } else {
          for (let j = 0; j < detector.patterns.length; j++) {
            if (typeof detector.patterns[j] !== 'string') {
              errors.push(`Detector[${i}].patterns[${j}]: Must be a string`);
            }
          }
        }
      }
    }
  }

  // Validate hooks
  if (m.hooks) {
    if (!Array.isArray(m.hooks)) {
      errors.push('Field "hooks" must be an array');
    } else {
      const hookNames = new Set<string>();
      const validTypes = ['pre-scan', 'post-scan', 'pre-graph', 'post-graph', 'custom-edge'];

      for (let i = 0; i < m.hooks.length; i++) {
        const hook = m.hooks[i];

        if (!hook.name) {
          errors.push(`Hook[${i}]: Missing required field: name`);
        } else {
          if (hookNames.has(hook.name)) {
            errors.push(`Hook[${i}]: Duplicate hook name: ${hook.name}`);
          }
          hookNames.add(hook.name);
        }

        if (!hook.type) {
          errors.push(`Hook[${i}]: Missing required field: type`);
        } else if (!validTypes.includes(hook.type)) {
          errors.push(`Hook[${i}]: Invalid type "${hook.type}" - must be one of: ${validTypes.join(', ')}`);
        }
      }
    }
  }

  // Validate dependencies
  if (m.dependencies) {
    if (!Array.isArray(m.dependencies)) {
      errors.push('Field "dependencies" must be an array');
    } else {
      for (let i = 0; i < m.dependencies.length; i++) {
        if (typeof m.dependencies[i] !== 'string') {
          errors.push(`dependencies[${i}]: Must be a string`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parse a manifest from JSON string
 * @param json - JSON string
 * @returns Parsed manifest or null if invalid JSON
 */
export function parseManifest(json: string): PluginManifest | null {
  try {
    return JSON.parse(json) as PluginManifest;
  } catch {
    return null;
  }
}

/**
 * Default manifest file name
 */
export const MANIFEST_FILENAME = 'coderef-plugin.json';

/**
 * Example manifest for documentation
 */
export const ExampleManifest: PluginManifest = {
  name: '@coderef/example-detector',
  version: '1.0.0',
  description: 'Example plugin demonstrating CodeRef plugin API',
  author: 'CodeRef Team',
  main: 'dist/index.js',
  coderefVersion: '>=0.5.0',
  detectors: [
    {
      name: 'fastapi-routes',
      description: 'Detect FastAPI route definitions',
      patterns: ['**/*.py'],
      entry: 'dist/detectors/fastapi.js'
    },
    {
      name: 'django-views',
      description: 'Detect Django view classes and functions',
      patterns: ['**/views.py', '**/views/*.py'],
      entry: 'dist/detectors/django.js'
    }
  ],
  hooks: [
    {
      name: 'add-orm-relationships',
      description: 'Add edges between models and their ORM relationships',
      type: 'post-graph',
      entry: 'dist/hooks/orm-relationships.js'
    }
  ],
  dependencies: []
};

/**
 * Get manifest file path for a plugin directory
 * @param pluginPath - Absolute path to plugin directory
 * @returns Path to manifest file
 */
export function getManifestPath(pluginPath: string): string {
  return `${pluginPath}/${MANIFEST_FILENAME}`;
}
