/**
 * @coderef-semantic: 1.0.0
 * @exports PluginScanOptions, scanWithPlugins, getPluginScannerStats, initializePluginScanning
 */

/**
 * Plugin Scanner Integration
 * WO-PLUGIN-SYSTEM-001: Plugin system for custom detectors
 *
 * Integrates plugin detectors into the CodeRef scanning process.
 * Runs plugin detectors alongside built-in patterns for extensible code analysis.
 */

import { minimatch } from 'minimatch';
import { ElementData, ScanOptions } from '../types/types.js';
import { pluginRegistry } from './plugin-registry.js';
import { CodeDetector, DetectionResult } from './types.js';
import { DEFAULT_HEADER_STATUS } from '../pipeline/element-taxonomy.js';

/**
 * Options for plugin scanning
 */
export interface PluginScanOptions {
  /** Enable plugin detection (default: true) */
  enabled?: boolean;
  /** Specific plugins to use (default: all active) */
  plugins?: string[];
  /** Specific detectors to use (default: all) */
  detectors?: string[];
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Scan a file using all active plugin detectors
 * @param filePath - Absolute file path
 * @param content - File content
 * @param options - Scan options
 * @returns Elements detected by plugins
 */
export async function scanWithPlugins(
  filePath: string,
  content: string,
  options: PluginScanOptions = {}
): Promise<ElementData[]> {
  if (options.enabled === false) {
    return [];
  }

  const elements: ElementData[] = [];
  const detectors = getRelevantDetectors(filePath, options);

  if (detectors.length === 0) {
    return [];
  }

  if (options.debug) {
    console.log(`[plugin-scanner] Scanning ${filePath} with ${detectors.length} detectors`);
  }

  for (const detector of detectors) {
    try {
      const results = await runDetector(detector, filePath, content, options.debug);

      for (const result of results) {
        const element = detectionResultToElement(result, filePath, detector.name);
        elements.push(element);
      }

      if (options.debug && results.length > 0) {
        console.log(`[plugin-scanner] Detector ${detector.name} found ${results.length} elements`);
      }
    } catch (error) {
      if (options.debug) {
        console.error(`[plugin-scanner] Detector ${detector.name} failed:`, error);
      }
    }
  }

  return elements;
}

/**
 * Get detectors relevant to a file
 */
function getRelevantDetectors(
  filePath: string,
  options: PluginScanOptions
): CodeDetector[] {
  let detectors = pluginRegistry.getAllDetectors();

  // Filter by specific plugins if requested
  if (options.plugins && options.plugins.length > 0) {
    detectors = detectors.filter(d => {
      // Check if detector belongs to one of the specified plugins
      const pluginName = getDetectorPluginName(d);
      return options.plugins!.includes(pluginName);
    });
  }

  // Filter by specific detectors if requested
  if (options.detectors && options.detectors.length > 0) {
    detectors = detectors.filter(d => options.detectors!.includes(d.name));
  }

  // Filter by file pattern matching
  detectors = detectors.filter(d => {
    if (!d.filePatterns || d.filePatterns.length === 0) {
      return true; // No patterns = applies to all files
    }
    return d.filePatterns.some(pattern => minimatch(filePath, pattern));
  });

  // Sort by priority (higher first)
  detectors.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return detectors;
}

/**
 * Run a single detector on a file
 */
async function runDetector(
  detector: CodeDetector,
  filePath: string,
  content: string,
  debug?: boolean
): Promise<DetectionResult[]> {
  try {
    const result = detector.detect(filePath, content);

    if (!result) {
      return [];
    }

    // Handle both single result and array
    if (Array.isArray(result)) {
      return result;
    }

    return [result];
  } catch (error) {
    if (debug) {
      console.error(`[plugin-scanner] Detector ${detector.name} error:`, error);
    }
    return [];
  }
}

/**
 * Convert detection result to ElementData
 */
function detectionResultToElement(
  result: DetectionResult,
  filePath: string,
  detectorName: string
): ElementData {
  const allowedTypes = new Set<ElementData['type']>([
    'function',
    'class',
    'component',
    'hook',
    'method',
    'constant',
    'interface',
    'type',
    'decorator',
    'property',
    'unknown',
  ]);
  const detectedType = result.type || result.elementType || 'function';

  return {
    type: allowedTypes.has(detectedType as ElementData['type'])
      ? detectedType as ElementData['type']
      : 'unknown',
    name: result.name || result.elementName || 'unknown',
    file: filePath,
    line: result.line || 1,
    headerStatus: DEFAULT_HEADER_STATUS,
    exported: result.exported ?? false,
    async: result.async ?? false,
    parameters: result.parameters || [],
    // Add plugin metadata
    metadata: {
      ...result.metadata,
      pluginSource: result.pluginSource || detectorName,
      confidence: result.confidence || 1.0
    }
  };
}

/**
 * Get plugin name from detector
 */
function getDetectorPluginName(detector: CodeDetector): string {
  // Try to extract plugin name from detector properties
  if (detector.name && detector.name.includes('/')) {
    return detector.name.split('/')[0];
  }
  return 'unknown';
}

/**
 * Get scanner statistics
 */
export function getPluginScannerStats(): {
  totalDetectors: number;
  activePlugins: number;
  detectorsByPlugin: Record<string, number>;
} {
  const detectors = pluginRegistry.getAllDetectors();
  const plugins = pluginRegistry.getActivePlugins();

  const detectorsByPlugin: Record<string, number> = {};
  for (const detector of detectors) {
    const pluginName = getDetectorPluginName(detector);
    detectorsByPlugin[pluginName] = (detectorsByPlugin[pluginName] || 0) + 1;
  }

  return {
    totalDetectors: detectors.length,
    activePlugins: plugins.length,
    detectorsByPlugin
  };
}

/**
 * Initialize plugin scanning for a project
 * @param projectRoot - Project root directory
 * @param options - Initialization options
 */
export async function initializePluginScanning(
  projectRoot: string,
  options: {
    loadNpm?: boolean;
    loadLocal?: boolean;
    loadConfig?: boolean;
    debug?: boolean;
  } = {}
): Promise<{
  loaded: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    loaded: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Load npm plugins
  if (options.loadNpm !== false) {
    try {
      const { loadAllNpmPlugins } = await import('./loaders/npm-loader.js');
      const npmResults = await loadAllNpmPlugins({
        projectRoot,
        debug: options.debug
      });

      for (const result of npmResults) {
        if (result.success && result.plugin) {
          pluginRegistry.register(result.plugin, 'npm');
          results.loaded++;
        } else {
          results.failed++;
          if (result.error) {
            results.errors.push(`[npm] ${result.name}: ${result.error}`);
          }
        }
      }
    } catch (error) {
      results.errors.push(`[npm] Loader failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Load local plugins
  if (options.loadLocal !== false) {
    try {
      const { loadAllLocalPlugins } = await import('./loaders/local-loader.js');
      const localResults = await loadAllLocalPlugins({
        projectRoot,
        debug: options.debug
      });

      for (const result of localResults) {
        if (result.success && result.plugin) {
          pluginRegistry.register(result.plugin, 'local');
          results.loaded++;
        } else {
          results.failed++;
          if (result.error) {
            results.errors.push(`[local] ${result.name}: ${result.error}`);
          }
        }
      }
    } catch (error) {
      results.errors.push(`[local] Loader failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (options.debug) {
    console.log(`[plugin-scanner] Initialized: ${results.loaded} plugins loaded, ${results.failed} failed`);
    if (results.errors.length > 0) {
      console.log('[plugin-scanner] Errors:', results.errors);
    }
  }

  return results;
}
