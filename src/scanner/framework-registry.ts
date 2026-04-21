/**
 * Framework Registry - Configurable framework detection for API routes
 * IMP-CORE-038: Extract scanner framework detection to configurable registry
 *
 * Provides:
 * - Plugin-based framework detection architecture
 * - Registration of framework-specific route detectors
 * - Open/closed principle for adding new frameworks
 */

import { RouteMetadata } from '../types/types.js';

/**
 * Result from framework detection
 */
export interface FrameworkDetectionResult {
  framework: string;
  route: RouteMetadata;
  elementName: string;
  elementType: 'function' | 'handler' | 'route';
}

/**
 * Interface for framework-specific route detectors
 */
export interface FrameworkDetector {
  name: string;
  /**
   * Detect if file belongs to this framework and extract route metadata
   * @returns Detection result or null if not applicable
   */
  detect(file: string, content: string): FrameworkDetectionResult | null;
}

/**
 * Registry for framework detectors
 */
class FrameworkRegistry {
  private detectors: Map<string, FrameworkDetector> = new Map();

  /**
   * Register a framework detector
   */
  register(detector: FrameworkDetector): void {
    this.detectors.set(detector.name, detector);
  }

  /**
   * Unregister a framework detector
   */
  unregister(name: string): void {
    this.detectors.delete(name);
  }

  /**
   * Detect framework for a file using all registered detectors
   * @returns First matching detection result or null
   */
  detect(file: string, content: string): FrameworkDetectionResult | null {
    for (const detector of Array.from(this.detectors.values())) {
      const result = detector.detect(file, content);
      if (result) {
        return result;
      }
    }
    return null;
  }

  /**
   * Detect all matching frameworks for a file
   * @returns Array of all matching detection results
   */
  detectAll(file: string, content: string): FrameworkDetectionResult[] {
    const results: FrameworkDetectionResult[] = [];
    for (const detector of Array.from(this.detectors.values())) {
      const result = detector.detect(file, content);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  /**
   * Get all registered framework names
   */
  getRegisteredFrameworks(): string[] {
    return Array.from(this.detectors.keys());
  }

  /**
   * Check if a framework is registered
   */
  isFrameworkRegistered(name: string): boolean {
    return this.detectors.has(name);
  }

  /**
   * Clear all registered detectors
   */
  clear(): void {
    this.detectors.clear();
  }
}

// Global registry instance
export const frameworkRegistry = new FrameworkRegistry();

// Default export for convenience
export default frameworkRegistry;
