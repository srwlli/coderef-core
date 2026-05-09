/**
 * @coderef-semantic: 1.0.0
 * @exports RegistryEntry, RegistrySyncOptions, SyncResult, RegistrySyncer, syncEntry, refreshSync
 * @used_by src/semantic/orchestrator.ts
 */

/**
 * Registry sync module for unified-registry.json synchronization
 *
 * Syncs extracted semantic data and enriched metadata into the unified registry
 * with schema validation and conflict resolution.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ExportInfo } from './ast-extractor.js';
import type { EnrichedMetadata } from './llm-enricher.js';

export interface RegistryEntry {
  id: string;
  file: string;
  exports: string[];
  exports_detailed: ExportInfo[];
  imports: string[];
  rules: string[];
  related: string[];
  constraints: string[];
  enrichment_confidence: number;
  last_synced: string;
  sync_metadata: {
    ast_version: string;
    enrichment_version: string;
  };
}

export interface RegistrySyncOptions {
  registryPath: string;
  validateSchema?: boolean;
  conflictResolution?: 'overwrite' | 'merge' | 'skip';
  dryRun?: boolean;
}

export interface SyncResult {
  entriesCreated: number;
  entriesUpdated: number;
  entriesSkipped: number;
  conflicts: Array<{ id: string; reason: string }>;
  errors: Array<{ entry: string; error: string }>;
}

/**
 * Registry synchronizer
 */
export class RegistrySyncer {
  private options: RegistrySyncOptions;
  private registry: Map<string, RegistryEntry>;

  constructor(options: RegistrySyncOptions) {
    this.options = {
      validateSchema: true,
      conflictResolution: 'merge',
      dryRun: false,
      ...options,
    };
    this.registry = new Map();
    this.loadRegistry();
  }

  /**
   * Load existing registry from file
   */
  private loadRegistry(): void {
    try {
      if (fs.existsSync(this.options.registryPath)) {
        const content = fs.readFileSync(this.options.registryPath, 'utf-8');
        const data = JSON.parse(content);

        if (Array.isArray(data.entries)) {
          for (const entry of data.entries) {
            this.registry.set(entry.id, entry);
          }
        }
      }
    } catch (error) {
      console.error(`Error loading registry: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Sync semantic entry into registry
   */
  async syncEntry(
    file: string,
    exports: ExportInfo[],
    imports: string[],
    enrichment?: EnrichedMetadata,
  ): Promise<string> {
    const id = this.generateId(file);

    const newEntry: RegistryEntry = {
      id,
      file,
      exports: exports.map((e) => e.name),
      exports_detailed: exports,
      imports,
      rules: enrichment?.rules || [],
      related: enrichment?.related || [],
      constraints: enrichment?.constraints || [],
      enrichment_confidence: enrichment?.confidence || 0,
      last_synced: new Date().toISOString(),
      sync_metadata: {
        ast_version: '1.0',
        enrichment_version: '1.0',
      },
    };

    // Validate before sync
    if (this.options.validateSchema) {
      const validation = this.validateEntry(newEntry);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Handle existing entry
    const existingEntry = this.registry.get(id);
    if (existingEntry) {
      switch (this.options.conflictResolution) {
        case 'overwrite':
          this.registry.set(id, newEntry);
          break;
        case 'merge':
          this.registry.set(id, this.mergeEntries(existingEntry, newEntry));
          break;
        case 'skip':
          return id; // Skip update
      }
    } else {
      this.registry.set(id, newEntry);
    }

    return id;
  }

  /**
   * Sync multiple entries and save
   */
  async syncBatch(
    entries: Array<{
      file: string;
      exports: ExportInfo[];
      imports: string[];
      enrichment?: EnrichedMetadata;
    }>,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      entriesCreated: 0,
      entriesUpdated: 0,
      entriesSkipped: 0,
      conflicts: [],
      errors: [],
    };

    for (const entry of entries) {
      try {
        const id = this.generateId(entry.file);
        const isNew = !this.registry.has(id);

        await this.syncEntry(entry.file, entry.exports, entry.imports, entry.enrichment);

        if (isNew) {
          result.entriesCreated++;
        } else {
          result.entriesUpdated++;
        }
      } catch (error) {
        result.errors.push({
          entry: entry.file,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Save registry if not dry run
    if (!this.options.dryRun) {
      this.saveRegistry();
    }

    return result;
  }

  /**
   * Validate entry against schema
   */
  private validateEntry(entry: RegistryEntry): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.id) errors.push('Missing id');
    if (!entry.file) errors.push('Missing file');
    if (!Array.isArray(entry.exports)) errors.push('exports must be array');
    if (!Array.isArray(entry.imports)) errors.push('imports must be array');
    if (typeof entry.enrichment_confidence !== 'number' || entry.enrichment_confidence < 0 || entry.enrichment_confidence > 1) {
      errors.push('enrichment_confidence must be 0-1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Merge existing and new entries
   */
  private mergeEntries(existing: RegistryEntry, newEntry: RegistryEntry): RegistryEntry {
    return {
      ...newEntry,
      rules: Array.from(new Set([...existing.rules, ...newEntry.rules])),
      related: Array.from(new Set([...existing.related, ...newEntry.related])),
      constraints: Array.from(new Set([...existing.constraints, ...newEntry.constraints])),
      imports: Array.from(new Set([...existing.imports, ...newEntry.imports])),
    };
  }

  /**
   * Generate ID from file path
   */
  private generateId(file: string): string {
    return file.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * Save registry to file
   */
  private saveRegistry(): void {
    try {
      const entries = Array.from(this.registry.values());
      const data = {
        version: '1.0',
        updated: new Date().toISOString(),
        entries,
      };

      // Ensure directory exists
      const dir = path.dirname(this.options.registryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.options.registryPath,
        JSON.stringify(data, null, 2),
        'utf-8',
      );

      console.log(`[registry-sync] Saved ${entries.length} entries to ${this.options.registryPath}`);
    } catch (error) {
      throw new Error(`Failed to save registry: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get sync status
   */
  getStatus(): { totalEntries: number; lastSync: string } {
    const entries = Array.from(this.registry.values());
    const lastSync = entries.length > 0
      ? entries.reduce((max, e) => (e.last_synced > max ? e.last_synced : max), '')
      : 'never';

    return {
      totalEntries: entries.length,
      lastSync,
    };
  }
}

/**
 * Convenience function for syncing a single entry
 */
export async function syncEntry(
  registryPath: string,
  file: string,
  exports: ExportInfo[],
  imports: string[],
  enrichment?: EnrichedMetadata,
): Promise<string> {
  const syncer = new RegistrySyncer({ registryPath });
  return syncer.syncEntry(file, exports, imports, enrichment);
}

/**
 * Refresh sync from extracted data
 */
export async function refreshSync(
  registryPath: string,
  entries: Array<{
    file: string;
    exports: ExportInfo[];
    imports: string[];
    enrichment?: EnrichedMetadata;
  }>,
): Promise<SyncResult> {
  const syncer = new RegistrySyncer({ registryPath });
  return syncer.syncBatch(entries);
}
