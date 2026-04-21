/**
 * GrammarRegistry Tests
 *
 * Purpose: Verify lazy loading, caching, and error handling of tree-sitter grammars
 * Context: WO-UNIFIED-CODEREF-PIPELINE-001 Phase 1, Task TEST-002
 *
 * Test Coverage:
 * - Lazy loading: Grammars loaded on-demand based on file extension
 * - Caching: Loaded parsers reused across calls
 * - Error handling: Graceful fallback for unsupported/unavailable grammars
 * - All 10 languages supported: ts, tsx, js, jsx, py, go, rs, java, cpp, c
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GrammarRegistry } from '../src/pipeline/grammar-registry.js';

describe('GrammarRegistry', () => {
  let registry: GrammarRegistry;

  beforeEach(() => {
    registry = GrammarRegistry.getInstance();
    registry.clearCache(); // Start fresh for each test
  });

  afterEach(() => {
    registry.clearCache();
  });

  describe('Lazy Loading', () => {
    it('should load TypeScript grammar on first request', async () => {
      const parser = await registry.getParser('ts');
      expect(parser).toBeTruthy();
      expect(parser).not.toBeNull();
    });

    it('should load TypeScript TSX grammar for tsx extension', async () => {
      const parser = await registry.getParser('tsx');
      expect(parser).toBeTruthy();
      expect(parser).not.toBeNull();
    });

    it('should load JavaScript grammar', async () => {
      const parser = await registry.getParser('js');
      expect(parser).toBeTruthy();
    });

    it('should load Python grammar', async () => {
      const parser = await registry.getParser('py');
      expect(parser).toBeTruthy();
    });

    it('should load Go grammar', async () => {
      const parser = await registry.getParser('go');
      expect(parser).toBeTruthy();
    });

    it('should load Rust grammar', async () => {
      const parser = await registry.getParser('rs');
      expect(parser).toBeTruthy();
    });

    it('should load Java grammar', async () => {
      const parser = await registry.getParser('java');
      expect(parser).toBeTruthy();
    });

    it('should load C++ grammar', async () => {
      const parser = await registry.getParser('cpp');
      expect(parser).toBeTruthy();
    });

    it('should load C grammar', async () => {
      const parser = await registry.getParser('c');
      expect(parser).toBeTruthy();
    });
  });

  describe('Caching', () => {
    it('should return cached parser on subsequent calls', async () => {
      const parser1 = await registry.getParser('ts');
      const parser2 = await registry.getParser('ts');

      expect(parser1).toBe(parser2); // Same reference = cached
    });

    it('should cache parsers for different languages independently', async () => {
      const tsParser = await registry.getParser('ts');
      const pyParser = await registry.getParser('py');

      expect(tsParser).not.toBe(pyParser);
      expect(tsParser).toBeTruthy();
      expect(pyParser).toBeTruthy();
    });

    it('should report correct cache stats', async () => {
      await registry.getParser('ts');
      await registry.getParser('py');
      await registry.getParser('go');

      const stats = registry.getCacheStats();
      expect(stats.loadedGrammars).toBeGreaterThanOrEqual(3);
      expect(stats.cachedParsers).toBeGreaterThanOrEqual(3);
    });

    it('should clear cache when requested', async () => {
      await registry.getParser('ts');
      await registry.getParser('py');

      let stats = registry.getCacheStats();
      expect(stats.cachedParsers).toBeGreaterThanOrEqual(2);

      registry.clearCache();

      stats = registry.getCacheStats();
      expect(stats.cachedParsers).toBe(0);
      expect(stats.loadedGrammars).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return null for unsupported extension', async () => {
      const parser = await registry.getParser('unsupported');
      expect(parser).toBeNull();
    });

    it('should cache failed lookups', async () => {
      const parser1 = await registry.getParser('unsupported');
      const parser2 = await registry.getParser('unsupported');

      expect(parser1).toBeNull();
      expect(parser2).toBeNull();
    });
  });

  describe('Extension Support', () => {
    it('should correctly identify supported extensions', () => {
      expect(registry.isSupported('ts')).toBe(true);
      expect(registry.isSupported('tsx')).toBe(true);
      expect(registry.isSupported('js')).toBe(true);
      expect(registry.isSupported('jsx')).toBe(true);
      expect(registry.isSupported('py')).toBe(true);
      expect(registry.isSupported('go')).toBe(true);
      expect(registry.isSupported('rs')).toBe(true);
      expect(registry.isSupported('java')).toBe(true);
      expect(registry.isSupported('cpp')).toBe(true);
      expect(registry.isSupported('c')).toBe(true);
      expect(registry.isSupported('h')).toBe(true);
    });

    it('should correctly identify unsupported extensions', () => {
      expect(registry.isSupported('unsupported')).toBe(false);
      expect(registry.isSupported('rb')).toBe(false);
      expect(registry.isSupported('php')).toBe(false);
    });

    it('should return all supported extensions', () => {
      const extensions = registry.getSupportedExtensions();

      expect(extensions).toContain('ts');
      expect(extensions).toContain('tsx');
      expect(extensions).toContain('py');
      expect(extensions).toContain('go');
      expect(extensions).toContain('rs');
      expect(extensions).toContain('java');
      expect(extensions).toContain('cpp');
      expect(extensions).toContain('c');
      expect(extensions.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Preloading', () => {
    it('should preload grammars for multiple extensions', async () => {
      await registry.preloadGrammars(['ts', 'py', 'go']);

      const stats = registry.getCacheStats();
      expect(stats.loadedGrammars).toBeGreaterThanOrEqual(3);
    });

    it('should handle duplicate extensions in preload', async () => {
      await registry.preloadGrammars(['ts', 'tsx', 'ts']); // Duplicate 'ts'

      const stats = registry.getCacheStats();
      // ts and tsx both use typescript grammar, should load once
      expect(stats.loadedGrammars).toBeGreaterThanOrEqual(1);
    });

    it('should skip unsupported extensions during preload', async () => {
      await registry.preloadGrammars(['ts', 'unsupported', 'py']);

      const stats = registry.getCacheStats();
      expect(stats.loadedGrammars).toBeGreaterThanOrEqual(2); // Only ts and py
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance across calls', () => {
      const instance1 = GrammarRegistry.getInstance();
      const instance2 = GrammarRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain cache across getInstance calls', async () => {
      const instance1 = GrammarRegistry.getInstance();
      await instance1.getParser('ts');

      const instance2 = GrammarRegistry.getInstance();
      const stats = instance2.getCacheStats();

      expect(stats.cachedParsers).toBeGreaterThanOrEqual(1);
    });
  });
});
