/**
 * GrammarRegistry - Lazy tree-sitter grammar loader for unified pipeline
 *
 * WO-UNIFIED-CODEREF-PIPELINE-001 - Phase 1, Task IMPL-001
 *
 * Features:
 * - Lazy loading: Grammars loaded on-demand based on detected file extensions
 * - Caching: Loaded parsers cached in memory for reuse
 * - Error handling: Graceful fallback when grammar unavailable
 * - Support for all 10 languages: ts, tsx, js, jsx, py, go, rs, java, cpp, c
 *
 * Performance:
 * - Grammar loading overhead: ~50-100ms per language (one-time cost)
 * - Subsequent calls return cached parser instantly
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports GrammarRegistry
 * @used_by src/pipeline/orchestrator.ts
 */

import Parser from 'tree-sitter';
import {
  GRAMMAR_PACKAGES,
  EXTENSION_TO_LANGUAGE,
  type LanguageExtension,
} from './types.js';

/**
 * GrammarRegistry singleton for managing tree-sitter parsers
 */
export class GrammarRegistry {
  private static instance: GrammarRegistry;
  private parsers: Map<string, Parser>;
  private grammars: Map<string, any>;
  private loadingPromises: Map<string, Promise<any>>;

  private constructor() {
    this.parsers = new Map();
    this.grammars = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GrammarRegistry {
    if (!GrammarRegistry.instance) {
      GrammarRegistry.instance = new GrammarRegistry();
    }
    return GrammarRegistry.instance;
  }

  /**
   * Get parser for a given file extension
   * Lazily loads grammar on first call, then caches parser
   *
   * @param extension File extension (e.g., 'ts', 'py', 'go')
   * @returns Parser configured with language grammar, or null if unavailable
   */
  async getParser(extension: string): Promise<Parser | null> {
    const language = EXTENSION_TO_LANGUAGE[extension as LanguageExtension];
    if (!language) {
      console.warn(`[GrammarRegistry] No language mapping for extension: ${extension}`);
      return null;
    }

    // Check if parser already cached
    const cacheKey = language;
    if (this.parsers.has(cacheKey)) {
      return this.parsers.get(cacheKey)!;
    }

    // Check if grammar already loaded
    if (this.grammars.has(cacheKey)) {
      const grammar = this.grammars.get(cacheKey);
      if (!grammar) return null; // Cached failure

      const parser = new Parser();
      parser.setLanguage(grammar);
      this.parsers.set(cacheKey, parser);
      return parser;
    }

    // Load grammar asynchronously
    try {
      const grammar = await this.loadGrammar(language, extension);
      if (!grammar) {
        this.grammars.set(cacheKey, null); // Cache failure
        return null;
      }

      const parser = new Parser();
      parser.setLanguage(grammar);
      this.parsers.set(cacheKey, parser);
      return parser;
    } catch (error) {
      console.error(`[GrammarRegistry] Failed to load grammar for ${language}:`, error);
      this.grammars.set(cacheKey, null); // Cache failure
      return null;
    }
  }

  /**
   * Load grammar for a language
   * Handles special cases (TypeScript has tsx/typescript, C/C++ share grammar)
   *
   * @param language Language name (e.g., 'typescript', 'python')
   * @param extension Original extension for TypeScript tsx handling
   * @returns Grammar object or null if unavailable
   */
  private async loadGrammar(language: string, extension: string): Promise<any | null> {
    // Check if already loading to prevent duplicate imports
    if (this.loadingPromises.has(language)) {
      return this.loadingPromises.get(language)!;
    }

    const packageName = GRAMMAR_PACKAGES[language];
    if (!packageName) {
      console.warn(`[GrammarRegistry] No grammar package for language: ${language}`);
      return null;
    }

    const loadingPromise = (async () => {
      try {
        // Special handling for TypeScript (has both typescript and tsx grammars)
        if (packageName === 'tree-sitter-typescript') {
          const tsModule = await import('tree-sitter-typescript');
          const grammar = extension === 'tsx' ? tsModule.tsx : tsModule.typescript;
          this.grammars.set(language, grammar);
          return grammar;
        }

        // Standard import for other languages
        const module = await import(packageName);
        const grammar = module.default || module;
        this.grammars.set(language, grammar);
        return grammar;
      } catch (error) {
        console.error(`[GrammarRegistry] Failed to import ${packageName}:`, error);
        this.grammars.set(language, null);
        return null;
      } finally {
        this.loadingPromises.delete(language);
      }
    })();

    this.loadingPromises.set(language, loadingPromise);
    return loadingPromise;
  }

  /**
   * Check if a file extension is supported
   *
   * @param extension File extension (e.g., 'ts', 'py')
   * @returns True if grammar available for this extension
   */
  isSupported(extension: string): boolean {
    const language = EXTENSION_TO_LANGUAGE[extension as LanguageExtension];
    return language !== undefined && GRAMMAR_PACKAGES[language] !== undefined;
  }

  /**
   * Get all supported extensions
   *
   * @returns Array of supported file extensions
   */
  getSupportedExtensions(): string[] {
    return Object.keys(EXTENSION_TO_LANGUAGE);
  }

  /**
   * Clear all caches (for testing)
   */
  clearCache(): void {
    this.parsers.clear();
    this.grammars.clear();
    this.loadingPromises.clear();
  }

  /**
   * Preload grammars for multiple languages
   * Useful for warming up cache before pipeline run
   *
   * @param extensions Array of file extensions to preload
   * @returns Promise resolving when all grammars loaded
   */
  async preloadGrammars(extensions: string[]): Promise<void> {
    const uniqueLanguages = new Set(
      extensions
        .map(ext => EXTENSION_TO_LANGUAGE[ext as LanguageExtension])
        .filter(Boolean)
    );

    await Promise.all(
      Array.from(uniqueLanguages).map(async language => {
        // Determine extension for TypeScript tsx handling
        const sampleExt = extensions.find(
          ext => EXTENSION_TO_LANGUAGE[ext as LanguageExtension] === language
        ) || 'ts';
        await this.loadGrammar(language, sampleExt);
      })
    );
  }

  /**
   * Get cache statistics (for monitoring/debugging)
   *
   * @returns Object with cache stats
   */
  getCacheStats(): { loadedGrammars: number; cachedParsers: number } {
    return {
      loadedGrammars: Array.from(this.grammars.values()).filter(Boolean).length,
      cachedParsers: this.parsers.size,
    };
  }
}
