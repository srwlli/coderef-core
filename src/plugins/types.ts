/**
 * Plugin System Types
 * WO-PLUGIN-SYSTEM-001: Plugin system for custom detectors
 *
 * Defines interfaces for the plugin architecture enabling third-party extensions,
 * custom pattern definitions, and domain-specific analysis without modifying core code.
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports PluginManifest, DetectorDefinition, HookDefinition, CodeDetector, DetectionResult, GraphHook, CustomEdge, GraphBuilderContext, Plugin, PluginSource, PluginRegistration
 * @used_by src/plugins/loaders/config-loader.ts, src/plugins/loaders/local-loader.ts, src/plugins/loaders/npm-loader.ts, src/plugins/manifest-schema.ts, src/plugins/plugin-graph.ts, src/plugins/plugin-registry.ts, src/plugins/plugin-scanner.ts
 */

import { FrameworkDetectionResult } from '../scanner/framework-registry.js';
import { CodeElement } from '../types/types.js';

/**
 * Plugin manifest format (coderef-plugin.json)
 */
export interface PluginManifest {
  /** Plugin name - must match npm package name for published plugins */
  name: string;
  /** Semantic version */
  version: string;
  /** Human-readable description */
  description?: string;
  /** Plugin author */
  author?: string;
  /** Plugin entry point - relative path from plugin root */
  main: string;
  /** Required CodeRef core version range (e.g., ">=0.5.0") */
  coderefVersion: string;
  /** Detectors provided by this plugin */
  detectors?: DetectorDefinition[];
  /** Graph hook definitions */
  hooks?: HookDefinition[];
  /** Plugin dependencies */
  dependencies?: string[];
}

/**
 * Detector definition in manifest
 */
export interface DetectorDefinition {
  /** Detector name - unique within plugin */
  name: string;
  /** Human-readable description */
  description?: string;
  /** File glob patterns this detector handles (for example, all .routes.ts files). */
  patterns: string[];
  /** Entry point for this detector - exports the detector implementation */
  entry?: string;
}

/**
 * Hook definition in manifest
 */
export interface HookDefinition {
  /** Hook name */
  name: string;
  /** Hook type - when it executes */
  type: 'pre-scan' | 'post-scan' | 'pre-graph' | 'post-graph' | 'custom-edge';
  /** Human-readable description */
  description?: string;
  /** Entry point for this hook */
  entry?: string;
}

/**
 * Extended detector interface for general code detection
 * Builds on FrameworkDetector from IMP-CORE-038
 */
export interface CodeDetector {
  /** Detector name */
  name: string;
  /** Detector version */
  version?: string;
  /** File glob patterns this detector applies to */
  filePatterns?: string[];
  /** Priority - higher runs first (default: 0) */
  priority?: number;
  /**
   * Extended detect method with AST support
   * @param file - Absolute file path
   * @param content - File content
   * @param ast - Optional AST if parser available
   * @returns Detection results or null
   */
  detect(file: string, content: string, ast?: any): DetectionResult[] | DetectionResult | FrameworkDetectionResult | null;
}

/**
 * General detection result (extends FrameworkDetectionResult)
 */
export interface DetectionResult extends FrameworkDetectionResult {
  /** Element type (overrides elementType for consistency) */
  type?: 'function' | 'class' | 'interface' | 'type' | 'method' | 'component' | 'constant' | string;
  /** Element name (alias for elementName) */
  name?: string;
  /** Line number in file */
  line?: number;
  /** Whether element is exported */
  exported?: boolean;
  /** Whether function is async */
  async?: boolean;
  /** Function parameters */
  parameters?: string[];
  /** Additional metadata from detection */
  metadata?: Record<string, any>;
  /** Confidence score 0-1 */
  confidence?: number;
  /** Source plugin name */
  pluginSource?: string;
}

/**
 * Graph hook for custom relationship detection
 */
export interface GraphHook {
  /** Hook name */
  name: string;
  /**
   * Execute hook to add custom edges
   * @param elements - All discovered code elements
   * @param graph - Current graph builder
   * @returns Custom edges to add
   */
  execute(elements: CodeElement[], graph: GraphBuilderContext): CustomEdge[];
}

/**
 * Custom edge definition from plugin
 */
export interface CustomEdge {
  /** Source element UUID */
  from: string;
  /** Target element UUID */
  to: string;
  /** Relationship type */
  type: string;
  /** Edge metadata */
  metadata?: Record<string, any>;
}

/**
 * Context passed to graph hooks
 */
export interface GraphBuilderContext {
  /** Find element by UUID */
  findElement(uuid: string): CodeElement | undefined;
  /** Find elements by type */
  findByType(type: string): CodeElement[];
  /** Find elements by file */
  findByFile(file: string): CodeElement[];
  /** Check if edge exists */
  hasEdge(from: string, to: string, type?: string): boolean;
}

/**
 * Loaded plugin instance
 */
export interface Plugin {
  /** Plugin manifest */
  manifest: PluginManifest;
  /** Absolute path to plugin */
  path: string;
  /** Loaded detectors */
  detectors: CodeDetector[];
  /** Loaded hooks */
  hooks: GraphHook[];
  /** Plugin is active */
  isActive: boolean;
}

/**
 * Plugin load source
 */
export type PluginSource = 'npm' | 'local' | 'config';

/**
 * Plugin registration info
 */
export interface PluginRegistration {
  /** Plugin instance */
  plugin: Plugin;
  /** How it was loaded */
  source: PluginSource;
  /** Load timestamp */
  loadedAt: Date;
  /** Any load errors */
  errors?: string[];
}
