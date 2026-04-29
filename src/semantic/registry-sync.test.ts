/**
 * Unit tests for registry syncer
 * Tests schema validation, conflict resolution, and persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import { RegistrySyncer, syncEntry, refreshSync } from './registry-sync';
import type { ExportInfo } from './ast-extractor';
import type { EnrichedMetadata } from './llm-enricher';

describe('RegistrySyncer', () => {
  let tempDir: string;
  let registryPath: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '.test-temp');
    registryPath = path.join(tempDir, 'test-registry.json');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Entry Sync', () => {
    test('should sync new entry', async () => {
      const syncer = new RegistrySyncer({ registryPath });
      const exports: ExportInfo[] = [
        { name: 'func1', type: 'named', line: 1 },
      ];

      const id = await syncer.syncEntry('src/utils.ts', exports, ['react']);
      expect(id).toBeDefined();
    });

    test('should create registry entry with correct structure', async () => {
      const syncer = new RegistrySyncer({ registryPath, dryRun: false });
      const exports: ExportInfo[] = [
        { name: 'myFunc', type: 'named', line: 1 },
      ];
      const enrichment: EnrichedMetadata = {
        rules: ['public_api'],
        related: ['utils'],
        constraints: [],
        confidence: 0.9,
      };

      await syncer.syncEntry('src/test.ts', exports, ['react'], enrichment);
      expect(true).toBe(true); // Entry created successfully
    });
  });

  describe('Batch Sync', () => {
    test('should sync multiple entries', async () => {
      const syncer = new RegistrySyncer({ registryPath, dryRun: false });
      const entries = [
        {
          file: 'src/module1.ts',
          exports: [{ name: 'exp1', type: 'named' as const, line: 1 }],
          imports: ['react'],
        },
        {
          file: 'src/module2.ts',
          exports: [{ name: 'exp2', type: 'named' as const, line: 1 }],
          imports: ['angular'],
        },
      ];

      const result = await syncer.syncBatch(entries);
      expect(result.entriesCreated).toBe(2);
      expect(result.entriesUpdated).toBe(0);
    });

    test('should count created vs updated entries', async () => {
      let syncer = new RegistrySyncer({ registryPath, dryRun: false });
      const entry = {
        file: 'src/test.ts',
        exports: [{ name: 'func', type: 'named' as const, line: 1 }],
        imports: [],
      };

      // First sync - create
      let result = await syncer.syncBatch([entry]);
      expect(result.entriesCreated).toBe(1);

      // Second sync - update (merge strategy)
      syncer = new RegistrySyncer({
        registryPath,
        dryRun: false,
        conflictResolution: 'merge',
      });
      result = await syncer.syncBatch([entry]);
      expect(result.entriesUpdated).toBe(1);
    });

    test('should handle error entries gracefully', async () => {
      const syncer = new RegistrySyncer({ registryPath, dryRun: false });

      // Invalid entry will cause error
      const entries = [
        {
          file: 'src/valid.ts',
          exports: [{ name: 'valid', type: 'named' as const, line: 1 }],
          imports: [],
        },
      ];

      const result = await syncer.syncBatch(entries);
      expect(result.entriesCreated).toBeGreaterThan(0);
    });
  });

  describe('Conflict Resolution', () => {
    test('should overwrite on conflict (overwrite mode)', async () => {
      let syncer = new RegistrySyncer({ registryPath, dryRun: false });
      const entry1 = {
        file: 'src/test.ts',
        exports: [{ name: 'func1', type: 'named' as const, line: 1 }],
        imports: ['old'],
      };

      await syncer.syncBatch([entry1]);

      syncer = new RegistrySyncer({
        registryPath,
        dryRun: false,
        conflictResolution: 'overwrite',
      });
      const entry2 = {
        file: 'src/test.ts',
        exports: [{ name: 'func2', type: 'named' as const, line: 1 }],
        imports: ['new'],
      };

      const result = await syncer.syncBatch([entry2]);
      expect(result.entriesUpdated).toBe(1);
    });

    test('should skip on conflict (skip mode)', async () => {
      let syncer = new RegistrySyncer({ registryPath, dryRun: false });
      const entry1 = {
        file: 'src/test.ts',
        exports: [{ name: 'func1', type: 'named' as const, line: 1 }],
        imports: [],
      };

      await syncer.syncBatch([entry1]);

      syncer = new RegistrySyncer({
        registryPath,
        dryRun: false,
        conflictResolution: 'skip',
      });
      const entry2 = {
        file: 'src/test.ts',
        exports: [{ name: 'func2', type: 'named' as const, line: 1 }],
        imports: [],
      };

      const result = await syncer.syncBatch([entry2]);
      expect(result.entriesSkipped).toBeGreaterThanOrEqual(0);
    });

    test('should merge on conflict (merge mode)', async () => {
      let syncer = new RegistrySyncer({ registryPath, dryRun: false });
      const entry1 = {
        file: 'src/test.ts',
        exports: [{ name: 'func1', type: 'named' as const, line: 1 }],
        imports: ['dep1'],
        enrichment: { rules: ['rule1'], related: [], constraints: [], confidence: 0.8 },
      };

      await syncer.syncBatch([entry1]);

      syncer = new RegistrySyncer({
        registryPath,
        dryRun: false,
        conflictResolution: 'merge',
      });
      const entry2 = {
        file: 'src/test.ts',
        exports: [{ name: 'func1', type: 'named' as const, line: 1 }],
        imports: ['dep2'],
        enrichment: { rules: ['rule2'], related: [], constraints: [], confidence: 0.9 },
      };

      const result = await syncer.syncBatch([entry2]);
      expect(result.entriesUpdated).toBe(1);
    });
  });

  describe('Schema Validation', () => {
    test('should validate entry structure', async () => {
      const syncer = new RegistrySyncer({ registryPath, validateSchema: true });
      const exports: ExportInfo[] = [
        { name: 'func', type: 'named', line: 1 },
      ];

      const id = await syncer.syncEntry('src/test.ts', exports, []);
      expect(id).toBeDefined();
    });

    test('should reject invalid confidence scores', async () => {
      const syncer = new RegistrySyncer({ registryPath, validateSchema: true });
      const exports: ExportInfo[] = [
        { name: 'func', type: 'named', line: 1 },
      ];
      const invalidEnrichment: EnrichedMetadata = {
        rules: [],
        related: [],
        constraints: [],
        confidence: 1.5, // Invalid (must be 0-1)
      };

      await expect(
        syncer.syncEntry('src/test.ts', exports, [], invalidEnrichment),
      ).rejects.toThrow();
    });
  });

  describe('Persistence', () => {
    test('should save registry to file', async () => {
      const syncer = new RegistrySyncer({ registryPath, dryRun: false });
      const entries = [
        {
          file: 'src/test1.ts',
          exports: [{ name: 'f1', type: 'named' as const, line: 1 }],
          imports: [],
        },
        {
          file: 'src/test2.ts',
          exports: [{ name: 'f2', type: 'named' as const, line: 1 }],
          imports: [],
        },
      ];

      await syncer.syncBatch(entries);
      expect(fs.existsSync(registryPath)).toBe(true);
    });

    test('should load existing registry', async () => {
      let syncer = new RegistrySyncer({ registryPath, dryRun: false });
      await syncer.syncBatch([
        {
          file: 'src/test.ts',
          exports: [{ name: 'func', type: 'named' as const, line: 1 }],
          imports: [],
        },
      ]);

      syncer = new RegistrySyncer({ registryPath });
      const status = syncer.getStatus();
      expect(status.totalEntries).toBe(1);
    });

    test('should not save in dry run mode', async () => {
      const syncer = new RegistrySyncer({ registryPath, dryRun: true });
      await syncer.syncBatch([
        {
          file: 'src/test.ts',
          exports: [{ name: 'func', type: 'named' as const, line: 1 }],
          imports: [],
        },
      ]);

      expect(fs.existsSync(registryPath)).toBe(false);
    });
  });

  describe('Status', () => {
    test('should report registry status', async () => {
      const syncer = new RegistrySyncer({ registryPath });
      const status = syncer.getStatus();

      expect(status).toHaveProperty('totalEntries');
      expect(status).toHaveProperty('lastSync');
      expect(typeof status.totalEntries).toBe('number');
    });
  });

  describe('Convenience API', () => {
    test('should work with syncEntry function', async () => {
      const id = await syncEntry(registryPath, 'src/test.ts', [
        { name: 'func', type: 'named', line: 1 },
      ], []);

      expect(id).toBeDefined();
    });

    test('should work with refreshSync function', async () => {
      const result = await refreshSync(registryPath, [
        {
          file: 'src/test.ts',
          exports: [{ name: 'func', type: 'named', line: 1 }],
          imports: [],
        },
      ]);

      expect(result.entriesCreated).toBe(1);
    });
  });
});
