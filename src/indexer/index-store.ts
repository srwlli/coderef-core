/**
 * CodeRef2 Index Storage Layer
 *
 * Primary indices for efficient reference lookup:
 * - byType: Index by type designator (F, M, Fn, C, etc.)
 * - byPath: Index by file/directory path
 * - byElement: Index by element name
 *
 * Provides centralized multi-index storage with synchronization
 * Supports Phase 1 parser output (ParsedCodeRef objects)
 */

import { ParsedCodeRef } from '../parser/parser.js';

/**
 * Index record wraps a parsed reference with metadata
 */
export interface IndexRecord {
  id: string;                         // Unique identifier (type:path:element:hash)
  parsed: ParsedCodeRef;              // Original parsed reference
  indexed_at: Date;                   // When this record was indexed
  index_keys: {
    byType: string;                   // Key for type index
    byPath: string;                   // Key for path index
    byElement: string | undefined;    // Key for element index (may be undefined)
  };
}

/**
 * Storage for all index types
 */
export interface IndexStorage {
  // Primary indices
  byType: Map<string, IndexRecord[]>;           // type → references
  byPath: Map<string, IndexRecord[]>;           // path → references
  byElement: Map<string, IndexRecord[]>;        // element → references

  // Secondary indices (populated in later phases)
  byMetadata?: Map<string, IndexRecord[]>;      // metadata → references
  byRelationship?: Map<string, IndexRecord[]>;  // relationship → references

  // All records for iteration
  all: IndexRecord[];

  // Statistics
  stats: IndexStats;
}

/**
 * Index statistics
 */
export interface IndexStats {
  total_records: number;
  indexed_at: Date;
  by_type_count: number;
  by_path_count: number;
  by_element_count: number;
}

/**
 * Index Store Manager
 * Central management of all indices with synchronization
 */
export class IndexStore {
  private storage: IndexStorage;
  private recordMap: Map<string, IndexRecord>;  // id → record for quick lookup

  constructor() {
    this.storage = {
      byType: new Map(),
      byPath: new Map(),
      byElement: new Map(),
      all: [],
      stats: {
        total_records: 0,
        indexed_at: new Date(),
        by_type_count: 0,
        by_path_count: 0,
        by_element_count: 0,
      },
    };
    this.recordMap = new Map();
  }

  /**
   * Add a parsed reference to all indices
   * Maintains synchronization across all index types
   */
  public addReference(parsed: ParsedCodeRef): IndexRecord {
    // Create index record
    const id = this.generateId(parsed);
    const record: IndexRecord = {
      id,
      parsed,
      indexed_at: new Date(),
      index_keys: {
        byType: parsed.type,
        byPath: parsed.path,
        byElement: parsed.element,
      },
    };

    // Check if already indexed
    if (this.recordMap.has(id)) {
      console.warn(`Reference already indexed: ${id}`);
      return this.recordMap.get(id)!;
    }

    // Add to all records
    this.storage.all.push(record);
    this.recordMap.set(id, record);

    // Add to byType index
    const typeKey = parsed.type;
    if (!this.storage.byType.has(typeKey)) {
      this.storage.byType.set(typeKey, []);
    }
    this.storage.byType.get(typeKey)!.push(record);

    // Add to byPath index
    const pathKey = parsed.path;
    if (!this.storage.byPath.has(pathKey)) {
      this.storage.byPath.set(pathKey, []);
    }
    this.storage.byPath.get(pathKey)!.push(record);

    // Add to byElement index (if element exists)
    if (parsed.element) {
      const elementKey = parsed.element;
      if (!this.storage.byElement.has(elementKey)) {
        this.storage.byElement.set(elementKey, []);
      }
      this.storage.byElement.get(elementKey)!.push(record);
    }

    // Update statistics
    this.updateStats();

    return record;
  }

  /**
   * Add multiple references (batch operation)
   */
  public addReferences(parsed: ParsedCodeRef[]): IndexRecord[] {
    const records: IndexRecord[] = [];
    for (const ref of parsed) {
      records.push(this.addReference(ref));
    }
    return records;
  }

  /**
   * Query by type
   */
  public queryByType(type: string): ParsedCodeRef[] {
    const records = this.storage.byType.get(type) || [];
    return records.map(r => r.parsed);
  }

  /**
   * Query by path
   */
  public queryByPath(path: string): ParsedCodeRef[] {
    const records = this.storage.byPath.get(path) || [];
    return records.map(r => r.parsed);
  }

  /**
   * Query by element name
   */
  public queryByElement(element: string): ParsedCodeRef[] {
    const records = this.storage.byElement.get(element) || [];
    return records.map(r => r.parsed);
  }

  /**
   * Query by path prefix (for hierarchical lookups)
   * E.g., queryByPathPrefix("utils") returns all from utils/*
   */
  public queryByPathPrefix(pathPrefix: string): ParsedCodeRef[] {
    const results: ParsedCodeRef[] = [];
    for (const [path, records] of this.storage.byPath.entries()) {
      if (path.startsWith(pathPrefix)) {
        results.push(...records.map(r => r.parsed));
      }
    }
    return results;
  }

  /**
   * Get all indexed references
   */
  public getAll(): ParsedCodeRef[] {
    return this.storage.all.map(r => r.parsed);
  }

  /**
   * Get all index records (internal use)
   */
  public getAllRecords(): IndexRecord[] {
    return this.storage.all;
  }

  /**
   * Get storage (for secondary indices and queries)
   */
  public getStorage(): IndexStorage {
    return this.storage;
  }

  /**
   * Clear all indices
   */
  public clear(): void {
    this.storage.byType.clear();
    this.storage.byPath.clear();
    this.storage.byElement.clear();
    this.storage.all = [];
    this.recordMap.clear();
    this.updateStats();
  }

  /**
   * Get statistics
   */
  public getStats(): IndexStats {
    return this.storage.stats;
  }

  /**
   * Check if reference is indexed
   */
  public isIndexed(parsed: ParsedCodeRef): boolean {
    const id = this.generateId(parsed);
    return this.recordMap.has(id);
  }

  /**
   * Get index record by ID
   */
  public getRecord(id: string): IndexRecord | undefined {
    return this.recordMap.get(id);
  }

  /**
   * Get total count of indexed references
   */
  public count(): number {
    return this.storage.all.length;
  }

  /**
   * Get count by type
   */
  public countByType(type: string): number {
    return this.storage.byType.get(type)?.length || 0;
  }

  /**
   * Get count by path
   */
  public countByPath(path: string): number {
    return this.storage.byPath.get(path)?.length || 0;
  }

  /**
   * Get count by element
   */
  public countByElement(element: string): number {
    return this.storage.byElement.get(element)?.length || 0;
  }

  /**
   * Get all types in index
   */
  public getAllTypes(): string[] {
    return Array.from(this.storage.byType.keys()).sort();
  }

  /**
   * Get all paths in index
   */
  public getAllPaths(): string[] {
    return Array.from(this.storage.byPath.keys()).sort();
  }

  /**
   * Get all elements in index
   */
  public getAllElements(): string[] {
    return Array.from(this.storage.byElement.keys()).sort();
  }

  /**
   * Export index as JSON (for debugging/persistence)
   */
  public export(): {
    records: IndexRecord[];
    stats: IndexStats;
  } {
    return {
      records: this.storage.all,
      stats: this.storage.stats,
    };
  }

  /**
   * Import from JSON
   */
  public import(data: { records: IndexRecord[] }): void {
    this.clear();
    for (const record of data.records) {
      // Reconstruct index
      const parsed = record.parsed;
      const id = record.id;

      this.storage.all.push(record);
      this.recordMap.set(id, record);

      // Rebuild byType
      const typeKey = parsed.type;
      if (!this.storage.byType.has(typeKey)) {
        this.storage.byType.set(typeKey, []);
      }
      this.storage.byType.get(typeKey)!.push(record);

      // Rebuild byPath
      const pathKey = parsed.path;
      if (!this.storage.byPath.has(pathKey)) {
        this.storage.byPath.set(pathKey, []);
      }
      this.storage.byPath.get(pathKey)!.push(record);

      // Rebuild byElement
      if (parsed.element) {
        const elementKey = parsed.element;
        if (!this.storage.byElement.has(elementKey)) {
          this.storage.byElement.set(elementKey, []);
        }
        this.storage.byElement.get(elementKey)!.push(record);
      }
    }
    this.updateStats();
  }

  /**
   * Private: Generate unique ID for a reference
   */
  private generateId(parsed: ParsedCodeRef): string {
    const parts = [
      parsed.type,
      parsed.path,
      parsed.element || 'no-element',
      parsed.line || 'no-line',
    ];
    return parts.join(':');
  }

  /**
   * Private: Update statistics
   */
  private updateStats(): void {
    this.storage.stats = {
      total_records: this.storage.all.length,
      indexed_at: new Date(),
      by_type_count: this.storage.byType.size,
      by_path_count: this.storage.byPath.size,
      by_element_count: this.storage.byElement.size,
    };
  }
}

// Export for public API
export const createIndexStore = (): IndexStore => {
  return new IndexStore();
};

/**
 * Convenience function to create and populate index
 */
export function indexReferences(parsed: ParsedCodeRef[]): IndexStore {
  const store = new IndexStore();
  store.addReferences(parsed);
  return store;
}
