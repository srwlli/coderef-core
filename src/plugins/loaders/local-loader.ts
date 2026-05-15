/**
 * @coderef-semantic: 1.0.0
 * @exports LocalLoaderOptions, discoverLocalPlugins, loadLocalPlugin, loadAllLocalPlugins
 * @used_by src/plugins/loaders/config-loader.ts, src/plugins/plugin-scanner.ts
 */





/**
 * Local Plugin Loader
 * WO-PLUGIN-SYSTEM-001: Plugin system for custom detectors
 *
 * Discovers and loads plugins from local .coderef/plugins/ directory.
 * Useful for in-development plugins or project-specific extensions.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Plugin, PluginManifest, CodeDetector, GraphHook } from '../types.js';
import { parseManifest, validateManifest, MANIFEST_FILENAME } from '../manifest-schema.js';
import { LoadResult, NpmLoaderOptions } from './npm-loader.js';

/**
 * Options for local loader
 */
export interface LocalLoaderOptions {
  /** Project root directory */
  projectRoot: string;
  /** Plugins directory name (default: .coderef/plugins) */
  pluginsDir?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Discover all plugins in local plugins directory
 * @param options - Loader options
 * @returns Array of plugin directory paths
 */
export function discoverLocalPlugins(options: LocalLoaderOptions): string[] {
  const pluginsDir = options.pluginsDir || '.coderef/plugins';
  const pluginsPath = path.join(options.projectRoot, pluginsDir);

  if (!fs.existsSync(pluginsPath)) {
    if (options.debug) {
      console.log(`[local-loader] Plugins directory not found: ${pluginsPath}`);
    }
    return [];
  }

  const plugins: string[] = [];

  try {
    const entries = fs.readdirSync(pluginsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(pluginsPath, entry.name);
        const manifestPath = path.join(pluginPath, MANIFEST_FILENAME);

        if (fs.existsSync(manifestPath)) {
          plugins.push(pluginPath);
          if (options.debug) {
            console.log(`[local-loader] Found plugin: ${entry.name}`);
          }
        } else {
          if (options.debug) {
            console.log(`[local-loader] Skipping ${entry.name} - no ${MANIFEST_FILENAME}`);
          }
        }
      }
    }
  } catch (error) {
    if (options.debug) {
      console.error(`[local-loader] Error reading plugins directory:`, error);
    }
  }

  return plugins;
}

/**
 * Load a plugin from local directory path
 * @param pluginPath - Absolute path to plugin directory
 * @param options - Loader options
 * @returns Load result
 */
export async function loadLocalPlugin(
  pluginPath: string,
  options: LocalLoaderOptions
): Promise<LoadResult> {
  const manifestPath = path.join(pluginPath, MANIFEST_FILENAME);

  try {
    // Read and parse manifest
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = parseManifest(manifestContent);

    if (!manifest) {
      return {
        name: path.basename(pluginPath),
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
    const mainPath = path.join(pluginPath, manifest.main);
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
      pluginModule = await import(mainPath);
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
          const detectorPath = path.join(pluginPath, detectorDef.entry);
          try {
            const detectorModule = await import(detectorPath);
            detector = detectorModule.default || detectorModule.detector || detectorModule;
          } catch (error) {
            if (options.debug) {
              console.error(`[local-loader] Failed to load detector ${detectorDef.name}:`, error);
            }
          }
        }

        if (!detector && pluginModule.detectors) {
          detector = pluginModule.detectors[detectorDef.name];
        }

        if (detector) {
          if (!detector.name) {
            detector.name = detectorDef.name;
          }
          if (!detector.filePatterns) {
            detector.filePatterns = detectorDef.patterns;
          }
          detectors.push(detector);
        } else if (options.debug) {
          console.log(`[local-loader] Detector ${detectorDef.name} not found in plugin ${manifest.name}`);
        }
      }
    }

    // Extract hooks
    const hooks: GraphHook[] = [];
    if (manifest.hooks) {
      for (const hookDef of manifest.hooks) {
        let hook: GraphHook | undefined;

        if (hookDef.entry) {
          const hookPath = path.join(pluginPath, hookDef.entry);
          try {
            const hookModule = await import(hookPath);
            hook = hookModule.default || hookModule.hook || hookModule;
          } catch (error) {
            if (options.debug) {
              console.error(`[local-loader] Failed to load hook ${hookDef.name}:`, error);
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
        } else if (options.debug) {
          console.log(`[local-loader] Hook ${hookDef.name} not found in plugin ${manifest.name}`);
        }
      }
    }

    const plugin: Plugin = {
      manifest,
      path: pluginPath,
      detectors,
      hooks,
      isActive: true
    };

    if (options.debug) {
      console.log(`[local-loader] Successfully loaded plugin: ${manifest.name}`);
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
      name: path.basename(pluginPath),
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Load all local plugins from .coderef/plugins/
 * @param options - Loader options
 * @returns Array of load results
 */
export async function loadAllLocalPlugins(
  options: LocalLoaderOptions
): Promise<LoadResult[]> {
  const pluginPaths = discoverLocalPlugins(options);
  const results: LoadResult[] = [];

  for (const pluginPath of pluginPaths) {
    const result = await loadLocalPlugin(pluginPath, options);
    results.push(result);
  }

  return results;
}
