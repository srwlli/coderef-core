/**
 * NPM Plugin Loader
 * WO-PLUGIN-SYSTEM-001: Plugin system for custom detectors
 *
 * Discovers and loads plugins from @coderef/* npm packages in node_modules.
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports NpmLoaderOptions, LoadResult, discoverNpmPlugins, loadNpmPlugin, loadAllNpmPlugins
 * @used_by src/plugins/loaders/config-loader.ts, src/plugins/loaders/local-loader.ts, src/plugins/plugin-scanner.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Plugin, PluginManifest, CodeDetector, GraphHook } from '../types.js';
import { parseManifest, validateManifest, MANIFEST_FILENAME } from '../manifest-schema.js';
import { PluginError } from '../plugin-registry.js';

/**
 * Options for npm loader
 */
export interface NpmLoaderOptions {
  /** Project root directory (where node_modules is) */
  projectRoot: string;
  /** Scope to search for (default: @coderef) */
  scope?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Result of loading a plugin
 */
export interface LoadResult {
  /** Plugin name */
  name: string;
  /** Success status */
  success: boolean;
  /** Plugin instance (if successful) */
  plugin?: Plugin;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Discover all @coderef/* packages in node_modules
 * @param options - Loader options
 * @returns Array of package paths
 */
export function discoverNpmPlugins(options: NpmLoaderOptions): string[] {
  const scope = options.scope || '@coderef';
  const scopePath = path.join(options.projectRoot, 'node_modules', scope);

  if (!fs.existsSync(scopePath)) {
    if (options.debug) {
      console.log(`[npm-loader] Scope ${scope} not found at ${scopePath}`);
    }
    return [];
  }

  const packages: string[] = [];

  try {
    const entries = fs.readdirSync(scopePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packagePath = path.join(scopePath, entry.name);
        const manifestPath = path.join(packagePath, MANIFEST_FILENAME);

        if (fs.existsSync(manifestPath)) {
          packages.push(packagePath);
          if (options.debug) {
            console.log(`[npm-loader] Found plugin: ${scope}/${entry.name}`);
          }
        }
      }
    }
  } catch (error) {
    if (options.debug) {
      console.error(`[npm-loader] Error reading scope ${scope}:`, error);
    }
  }

  return packages;
}

/**
 * Load a plugin from npm package path
 * @param packagePath - Absolute path to package directory
 * @param options - Loader options
 * @returns Load result
 */
export async function loadNpmPlugin(
  packagePath: string,
  options: NpmLoaderOptions
): Promise<LoadResult> {
  const manifestPath = path.join(packagePath, MANIFEST_FILENAME);

  try {
    // Read and parse manifest
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = parseManifest(manifestContent);

    if (!manifest) {
      return {
        name: path.basename(packagePath),
        success: false,
        error: 'Failed to parse manifest JSON'
      };
    }

    // Validate manifest
    const validation = validateManifest(manifest);
    if (!validation.valid) {
      return {
        name: manifest.name,
        success: false,
        error: `Invalid manifest: ${validation.errors.join(', ')}`
      };
    }

    // Load plugin module
    const mainPath = path.join(packagePath, manifest.main);
    if (!fs.existsSync(mainPath)) {
      return {
        name: manifest.name,
        success: false,
        error: `Main entry not found: ${manifest.main}`
      };
    }

    // Dynamic import of plugin module
    let pluginModule: any;
    try {
      // For ESM/CJS compatibility
      pluginModule = await import(mainPath);
      // Handle both default and named exports
      pluginModule = pluginModule.default || pluginModule;
    } catch (importError) {
      return {
        name: manifest.name,
        success: false,
        error: `Failed to import plugin: ${importError instanceof Error ? importError.message : String(importError)}`
      };
    }

    // Extract detectors
    const detectors: CodeDetector[] = [];
    if (manifest.detectors) {
      for (const detectorDef of manifest.detectors) {
        let detector: CodeDetector | undefined;

        if (detectorDef.entry) {
          // Load from entry point
          const detectorPath = path.join(packagePath, detectorDef.entry);
          try {
            const detectorModule = await import(detectorPath);
            detector = detectorModule.default || detectorModule.detector || detectorModule;
          } catch (error) {
            if (options.debug) {
              console.error(`[npm-loader] Failed to load detector ${detectorDef.name}:`, error);
            }
          }
        }

        // Try to get from main module
        if (!detector && pluginModule.detectors) {
          detector = pluginModule.detectors[detectorDef.name];
        }

        if (detector) {
          // Ensure detector has name and patterns
          if (!detector.name) {
            detector.name = detectorDef.name;
          }
          if (!detector.filePatterns) {
            detector.filePatterns = detectorDef.patterns;
          }
          detectors.push(detector);
        } else {
          if (options.debug) {
            console.log(`[npm-loader] Detector ${detectorDef.name} not found in plugin ${manifest.name}`);
          }
        }
      }
    }

    // Extract hooks
    const hooks: GraphHook[] = [];
    if (manifest.hooks) {
      for (const hookDef of manifest.hooks) {
        let hook: GraphHook | undefined;

        if (hookDef.entry) {
          const hookPath = path.join(packagePath, hookDef.entry);
          try {
            const hookModule = await import(hookPath);
            hook = hookModule.default || hookModule.hook || hookModule;
          } catch (error) {
            if (options.debug) {
              console.error(`[npm-loader] Failed to load hook ${hookDef.name}:`, error);
            }
          }
        }

        if (!hook && pluginModule.hooks) {
          hook = pluginModule.hooks[hookDef.name];
        }

        if (hook) {
          if (!hook.name) {
            hook.name = hookDef.name;
          }
          hooks.push(hook);
        } else {
          if (options.debug) {
            console.log(`[npm-loader] Hook ${hookDef.name} not found in plugin ${manifest.name}`);
          }
        }
      }
    }

    // Create plugin instance
    const plugin: Plugin = {
      manifest,
      path: packagePath,
      detectors,
      hooks,
      isActive: true
    };

    if (options.debug) {
      console.log(`[npm-loader] Successfully loaded plugin: ${manifest.name}`);
      console.log(`  - Detectors: ${detectors.length}`);
      console.log(`  - Hooks: ${hooks.length}`);
    }

    return {
      name: manifest.name,
      success: true,
      plugin
    };

  } catch (error) {
    return {
      name: path.basename(packagePath),
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Load all npm plugins from @coderef/* scope
 * @param options - Loader options
 * @returns Array of load results
 */
export async function loadAllNpmPlugins(
  options: NpmLoaderOptions
): Promise<LoadResult[]> {
  const packagePaths = discoverNpmPlugins(options);
  const results: LoadResult[] = [];

  for (const packagePath of packagePaths) {
    const result = await loadNpmPlugin(packagePath, options);
    results.push(result);
  }

  return results;
}
