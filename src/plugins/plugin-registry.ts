/**
 * @coderef-semantic: 1.0.0
 * @exports PluginError, PluginRegistry, pluginRegistry
 * @used_by src/plugins/loaders/npm-loader.ts, src/plugins/plugin-graph.ts, src/plugins/plugin-scanner.ts
 */

/**
 * Plugin Registry
 * WO-PLUGIN-SYSTEM-001: Plugin system for custom detectors
 *
 * Central registry for loading, managing, and executing plugins.
 * Provides plugin discovery, lifecycle management, and integration hooks.
 */

import { Plugin, PluginRegistration, CodeDetector, GraphHook, PluginSource } from './types.js';

/**
 * Error thrown by plugin operations
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly pluginName?: string,
    public readonly code: 'LOAD_FAILED' | 'NOT_FOUND' | 'INVALID_MANIFEST' | 'VERSION_MISMATCH' | 'CIRCULAR_DEPENDENCY' = 'LOAD_FAILED'
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

/**
 * Plugin registry - manages plugin lifecycle and access
 */
export class PluginRegistry {
  private plugins: Map<string, PluginRegistration> = new Map();
  private detectors: Map<string, CodeDetector> = new Map();
  private hooks: Map<string, GraphHook> = new Map();

  /**
   * Register a plugin
   * @param plugin - Loaded plugin instance
   * @param source - How the plugin was loaded
   */
  register(plugin: Plugin, source: PluginSource): void {
    const registration: PluginRegistration = {
      plugin,
      source,
      loadedAt: new Date(),
      errors: []
    };

    // Validate plugin before registration
    const validationErrors = this.validatePlugin(plugin);
    if (validationErrors.length > 0) {
      registration.errors = validationErrors;
      throw new PluginError(
        `Plugin validation failed: ${validationErrors.join(', ')}`,
        plugin.manifest.name,
        'INVALID_MANIFEST'
      );
    }

    this.plugins.set(plugin.manifest.name, registration);

    // Register detectors
    for (const detector of plugin.detectors) {
      const detectorKey = `${plugin.manifest.name}/${detector.name}`;
      this.detectors.set(detectorKey, detector);
    }

    // Register hooks
    for (const hook of plugin.hooks) {
      const hookKey = `${plugin.manifest.name}/${hook.name}`;
      this.hooks.set(hookKey, hook);
    }

    plugin.isActive = true;
  }

  /**
   * Unregister a plugin
   * @param name - Plugin name
   */
  unregister(name: string): boolean {
    const registration = this.plugins.get(name);
    if (!registration) {
      return false;
    }

    // Unregister detectors
    for (const detector of registration.plugin.detectors) {
      const detectorKey = `${name}/${detector.name}`;
      this.detectors.delete(detectorKey);
    }

    // Unregister hooks
    for (const hook of registration.plugin.hooks) {
      const hookKey = `${name}/${hook.name}`;
      this.hooks.delete(hookKey);
    }

    registration.plugin.isActive = false;
    this.plugins.delete(name);
    return true;
  }

  /**
   * Get a registered plugin
   * @param name - Plugin name
   * @returns Plugin registration or undefined
   */
  get(name: string): PluginRegistration | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if a plugin is registered
   * @param name - Plugin name
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get all registered plugins
   */
  getAll(): PluginRegistration[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all active plugins
   */
  getActivePlugins(): Plugin[] {
    return this.getAll()
      .filter(r => r.plugin.isActive)
      .map(r => r.plugin);
  }

  /**
   * Get all registered detectors
   */
  getAllDetectors(): CodeDetector[] {
    return Array.from(this.detectors.values());
  }

  /**
   * Get detectors from a specific plugin
   * @param pluginName - Plugin name
   */
  getPluginDetectors(pluginName: string): CodeDetector[] {
    const registration = this.plugins.get(pluginName);
    if (!registration) {
      return [];
    }
    return registration.plugin.detectors;
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): GraphHook[] {
    return Array.from(this.hooks.values());
  }

  /**
   * Get hooks from a specific plugin
   * @param pluginName - Plugin name
   */
  getPluginHooks(pluginName: string): GraphHook[] {
    const registration = this.plugins.get(pluginName);
    if (!registration) {
      return [];
    }
    return registration.plugin.hooks;
  }

  /**
   * Enable a plugin
   * @param name - Plugin name
   */
  enable(name: string): boolean {
    const registration = this.plugins.get(name);
    if (!registration) {
      return false;
    }

    registration.plugin.isActive = true;

    // Re-register detectors and hooks
    for (const detector of registration.plugin.detectors) {
      const detectorKey = `${name}/${detector.name}`;
      this.detectors.set(detectorKey, detector);
    }

    for (const hook of registration.plugin.hooks) {
      const hookKey = `${name}/${hook.name}`;
      this.hooks.set(hookKey, hook);
    }

    return true;
  }

  /**
   * Disable a plugin (without unregistering)
   * @param name - Plugin name
   */
  disable(name: string): boolean {
    const registration = this.plugins.get(name);
    if (!registration) {
      return false;
    }

    registration.plugin.isActive = false;

    // Unregister detectors and hooks
    for (const detector of registration.plugin.detectors) {
      const detectorKey = `${name}/${detector.name}`;
      this.detectors.delete(detectorKey);
    }

    for (const hook of registration.plugin.hooks) {
      const hookKey = `${name}/${hook.name}`;
      this.hooks.delete(hookKey);
    }

    return true;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.detectors.clear();
    this.hooks.clear();
  }

  /**
   * Get plugin count
   */
  size(): number {
    return this.plugins.size;
  }

  /**
   * Get detector count
   */
  detectorCount(): number {
    return this.detectors.size;
  }

  /**
   * Get hook count
   */
  hookCount(): number {
    return this.hooks.size;
  }

  /**
   * Validate a plugin before registration
   * @param plugin - Plugin to validate
   * @returns Array of validation errors (empty if valid)
   */
  private validatePlugin(plugin: Plugin): string[] {
    const errors: string[] = [];
    const manifest = plugin.manifest;

    // Required fields
    if (!manifest.name) {
      errors.push('Missing required field: name');
    }
    if (!manifest.version) {
      errors.push('Missing required field: version');
    }
    if (!manifest.coderefVersion) {
      errors.push('Missing required field: coderefVersion');
    }

    // Version format check (basic semver)
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Invalid version format - expected semver (e.g., 1.0.0)');
    }

    // Check for duplicate name
    if (this.plugins.has(manifest.name)) {
      errors.push(`Plugin '${manifest.name}' is already registered`);
    }

    // Validate detectors
    if (manifest.detectors) {
      const detectorNames = new Set<string>();
      for (const detector of manifest.detectors) {
        if (!detector.name) {
          errors.push('Detector missing required field: name');
        }
        if (detectorNames.has(detector.name)) {
          errors.push(`Duplicate detector name: ${detector.name}`);
        }
        detectorNames.add(detector.name);

        if (!detector.patterns || detector.patterns.length === 0) {
          errors.push(`Detector '${detector.name}' missing required field: patterns`);
        }
      }
    }

    // Validate hooks
    if (manifest.hooks) {
      const hookNames = new Set<string>();
      for (const hook of manifest.hooks) {
        if (!hook.name) {
          errors.push('Hook missing required field: name');
        }
        if (hookNames.has(hook.name)) {
          errors.push(`Duplicate hook name: ${hook.name}`);
        }
        hookNames.add(hook.name);

        const validTypes = ['pre-scan', 'post-scan', 'pre-graph', 'post-graph', 'custom-edge'];
        if (hook.type && !validTypes.includes(hook.type)) {
          errors.push(`Hook '${hook.name}' has invalid type: ${hook.type}`);
        }
      }
    }

    return errors;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    plugins: number;
    detectors: number;
    hooks: number;
    sources: Record<PluginSource, number>;
  } {
    const sources: Record<PluginSource, number> = { npm: 0, local: 0, config: 0 };

    for (const registration of this.plugins.values()) {
      sources[registration.source]++;
    }

    return {
      plugins: this.plugins.size,
      detectors: this.detectors.size,
      hooks: this.hooks.size,
      sources
    };
  }
}

// Global registry instance
export const pluginRegistry = new PluginRegistry();

// Default export for convenience
export default pluginRegistry;
