/**
 * @coderef-semantic: 1.0.0
 * @exports PluginConfigEntry, ConfigLoaderOptions, loadConfigPlugins
 */





/**
 * Config Plugin Loader
 * WO-PLUGIN-SYSTEM-001: Plugin system for custom detectors
 *
 * Loads plugins from coderef.config.js plugins array.
 * Enables explicit plugin configuration in project config.
 */

import * as path from 'path';
import { Plugin, CodeDetector, GraphHook } from '../types.js';
import { validateManifest, MANIFEST_FILENAME } from '../manifest-schema.js';
import { LoadResult } from './npm-loader.js';

/**
 * Plugin configuration entry
 */
export interface PluginConfigEntry {
  /** Plugin name or path */
  name: string;
  /** Enable/disable plugin (default: true) */
  enabled?: boolean;
  /** Plugin-specific options */
  options?: Record<string, any>;
}

/**
 * Options for config loader
 */
export interface ConfigLoaderOptions {
  /** Project root directory */
  projectRoot: string;
  /** Plugin configurations from coderef.config.js */
  plugins: PluginConfigEntry[];
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Load plugins from config entries
 * @param options - Loader options
 * @returns Array of load results
 */
export async function loadConfigPlugins(
  options: ConfigLoaderOptions
): Promise<LoadResult[]> {
  const results: LoadResult[] = [];

  for (const entry of options.plugins) {
    // Skip disabled plugins
    if (entry.enabled === false) {
      if (options.debug) {
        console.log(`[config-loader] Skipping disabled plugin: ${entry.name}`);
      }
      continue;
    }

    const result = await loadConfigPlugin(entry, options);
    results.push(result);
  }

  return results;
}

/**
 * Load a single plugin from config entry
 * @param entry - Plugin config entry
 * @param options - Loader options
 * @returns Load result
 */
async function loadConfigPlugin(
  entry: PluginConfigEntry,
  options: ConfigLoaderOptions
): Promise<LoadResult> {
  // Try to resolve as npm package first
  const npmResult = await tryLoadNpmPackage(entry.name, options);
  if (npmResult.success) {
    return npmResult;
  }

  // Try to resolve as local path
  const localResult = await tryLoadLocalPath(entry.name, options);
  if (localResult.success) {
    return localResult;
  }

  // Both failed
  return {
    name: entry.name,
    success: false,
    error: `Could not resolve plugin "${entry.name}" as npm package or local path`
  };
}

/**
 * Try to load plugin as npm package
 */
async function tryLoadNpmPackage(
  name: string,
  options: ConfigLoaderOptions
): Promise<LoadResult> {
  try {
    // Try @coderef scope first
    let packagePath = path.join(options.projectRoot, 'node_modules', '@coderef', name);

    // If not in @coderef scope, try as full package name
    if (!await pathExists(packagePath)) {
      packagePath = path.join(options.projectRoot, 'node_modules', name);
    }

    if (!await pathExists(packagePath)) {
      return {
        name,
        success: false,
        error: 'Package not found in node_modules'
      };
    }

    // Check for manifest
    const manifestPath = path.join(packagePath, MANIFEST_FILENAME);
    if (!await pathExists(manifestPath)) {
      return {
        name,
        success: false,
        error: `No ${MANIFEST_FILENAME} found in package`
      };
    }

    // Load using npm-loader logic (simplified here)
    const { loadNpmPlugin } = await import('./npm-loader.js');
    return await loadNpmPlugin(packagePath, {
      projectRoot: options.projectRoot,
      debug: options.debug
    });

  } catch (error) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Try to load plugin from local path
 */
async function tryLoadLocalPath(
  name: string,
  options: ConfigLoaderOptions
): Promise<LoadResult> {
  // Resolve as absolute or relative path
  const pluginPath = path.isAbsolute(name)
    ? name
    : path.join(options.projectRoot, name);

  if (!await pathExists(pluginPath)) {
    return {
      name,
      success: false,
      error: 'Path does not exist'
    };
  }

  // Check for manifest
  const manifestPath = path.join(pluginPath, MANIFEST_FILENAME);
  if (!await pathExists(manifestPath)) {
    return {
      name,
      success: false,
      error: `No ${MANIFEST_FILENAME} found at path`
    };
  }

  // Load using local-loader logic
  const { loadLocalPlugin } = await import('./local-loader.js');
  return await loadLocalPlugin(pluginPath, {
    projectRoot: options.projectRoot,
    debug: options.debug
  });
}

/**
 * Check if path exists
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    const { access } = await import('fs/promises');
    await access(p);
    return true;
  } catch {
    return false;
  }
}
