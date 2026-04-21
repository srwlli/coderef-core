/**
 * CodeRef2 Metadata Index
 *
 * Category-based indexing for metadata attributes
 * Supports standard categories (status, security, performance, etc.)
 * plus custom metadata values
 *
 * Per specification lines 575-621
 */

import { ParsedCodeRef } from '../parser/parser.js';
import { IndexRecord, IndexStorage } from './index-store.js';

/**
 * Supported metadata categories
 */
export type MetadataCategory =
  | 'status'
  | 'significance'
  | 'security'
  | 'performance'
  | 'complexity'
  | 'scope'
  | 'env'
  | 'custom';

/**
 * Valid values for each standard category
 */
export const CATEGORY_VALUES: Record<MetadataCategory, string[]> = {
  status: ['active', 'deprecated', 'experimental', 'legacy', 'stable'],
  significance: ['critical', 'high', 'medium', 'low'],
  security: ['critical', 'high', 'medium', 'low'],
  performance: ['critical', 'high', 'medium', 'low'],
  complexity: ['high', 'medium', 'low'],
  scope: ['internal', 'public', 'private', 'protected'],
  env: ['dev', 'test', 'prod', 'all'],
  custom: [], // Any value allowed
};

/**
 * Metadata index entry
 */
export interface MetadataIndexEntry {
  category: MetadataCategory;
  value: string;
  records: IndexRecord[];
}

/**
 * Metadata Index Manager
 */
export class MetadataIndex {
  private index: Map<string, MetadataIndexEntry>;  // "category:value" → entry
  private categoryIndex: Map<MetadataCategory, Set<string>>;  // category → all values

  constructor() {
    this.index = new Map();
    this.categoryIndex = new Map();
    this.initializeCategories();
  }

  /**
   * Index a reference by its metadata
   */
  public indexReference(record: IndexRecord): void {
    const parsed = record.parsed;

    if (!parsed.metadata) {
      return; // No metadata to index
    }

    // Parse each metadata entry
    for (const [key, value] of Object.entries(parsed.metadata)) {
      const { category, actualKey } = this.parseMetadataKey(key);

      // Handle the metadata value
      if (Array.isArray(value)) {
        // Array of values
        for (const item of value) {
          this.addToIndex(category, String(item), record);
        }
      } else if (value === true) {
        // Boolean true - use key as value
        this.addToIndex(category, actualKey || key, record);
      } else if (value && value !== false && value !== '') {
        // Non-empty value
        this.addToIndex(category, String(value), record);
      }
    }
  }

  /**
   * Index multiple references
   */
  public indexReferences(records: IndexRecord[]): void {
    for (const record of records) {
      this.indexReference(record);
    }
  }

  /**
   * Query by category and value
   */
  public query(category: MetadataCategory, value: string): ParsedCodeRef[] {
    const key = this.makeKey(category, value);
    const entry = this.index.get(key);
    return entry ? entry.records.map(r => r.parsed) : [];
  }

  /**
   * Query multiple values for a category (OR logic)
   */
  public queryMultiple(
    category: MetadataCategory,
    values: string[]
  ): ParsedCodeRef[] {
    const results: ParsedCodeRef[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      const records = this.query(category, value);
      for (const ref of records) {
        const id = this.refId(ref);
        if (!seen.has(id)) {
          seen.add(id);
          results.push(ref);
        }
      }
    }

    return results;
  }

  /**
   * Query all values for a category
   */
  public queryCategory(category: MetadataCategory): {
    value: string;
    count: number;
    records: ParsedCodeRef[];
  }[] {
    const results = [];
    const values = this.categoryIndex.get(category) || new Set();

    for (const value of values) {
      const records = this.query(category, value);
      results.push({
        value,
        count: records.length,
        records,
      });
    }

    return results.sort((a, b) => b.count - a.count); // Sort by count desc
  }

  /**
   * Get all indexed categories
   */
  public getCategories(): MetadataCategory[] {
    return Array.from(this.categoryIndex.keys())
      .filter(cat => (this.categoryIndex.get(cat) || new Set()).size > 0)
      .sort();
  }

  /**
   * Get all values for a category
   */
  public getValues(category: MetadataCategory): string[] {
    const values = this.categoryIndex.get(category) || new Set();
    return Array.from(values).sort();
  }

  /**
   * Count references with category:value
   */
  public count(category: MetadataCategory, value: string): number {
    const key = this.makeKey(category, value);
    return this.index.get(key)?.records.length || 0;
  }

  /**
   * Get statistics
   */
  public getStats(): {
    total_entries: number;
    categories: Record<MetadataCategory, number>;
  } {
    const stats: any = {
      total_entries: this.index.size,
      categories: {},
    };

    for (const category of this.getCategories()) {
      const values = this.categoryIndex.get(category) || new Set();
      stats.categories[category] = values.size;
    }

    return stats;
  }

  /**
   * Clear all indices
   */
  public clear(): void {
    this.index.clear();
    this.categoryIndex.clear();
    this.initializeCategories();
  }

  /**
   * Export for debugging
   */
  public export(): Record<string, { value: string; count: number }> {
    const result: any = {};

    for (const [key, entry] of this.index.entries()) {
      result[key] = {
        value: entry.value,
        count: entry.records.length,
      };
    }

    return result;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Initialize category indices
   */
  private initializeCategories(): void {
    for (const category of Object.keys(CATEGORY_VALUES) as MetadataCategory[]) {
      this.categoryIndex.set(category, new Set());
    }
  }

  /**
   * Parse metadata key to extract category
   */
  private parseMetadataKey(key: string): {
    category: MetadataCategory;
    actualKey: string;
  } {
    // Check for category:key format
    const colonIndex = key.indexOf(':');
    if (colonIndex !== -1) {
      const potentialCategory = key.substring(0, colonIndex);
      if (this.isValidCategory(potentialCategory as MetadataCategory)) {
        return {
          category: potentialCategory as MetadataCategory,
          actualKey: key.substring(colonIndex + 1),
        };
      }
    }

    // Check if key itself is a category
    if (this.isValidCategory(key as MetadataCategory)) {
      return {
        category: key as MetadataCategory,
        actualKey: key,
      };
    }

    // Default to custom
    return {
      category: 'custom',
      actualKey: key,
    };
  }

  /**
   * Check if valid category
   */
  private isValidCategory(cat: MetadataCategory): boolean {
    return Object.keys(CATEGORY_VALUES).includes(cat);
  }

  /**
   * Make index key from category and value
   */
  private makeKey(category: MetadataCategory, value: string): string {
    return `${category}:${value}`;
  }

  /**
   * Generate reference ID for deduplication
   */
  private refId(ref: ParsedCodeRef): string {
    return `${ref.type}:${ref.path}:${ref.element || 'none'}:${ref.line || 'none'}`;
  }

  /**
   * Add to index
   */
  private addToIndex(
    category: MetadataCategory,
    value: string,
    record: IndexRecord
  ): void {
    const key = this.makeKey(category, value);

    // Get or create entry
    let entry = this.index.get(key);
    if (!entry) {
      entry = {
        category,
        value,
        records: [],
      };
      this.index.set(key, entry);
    }

    // Add record if not already present
    const recordId = this.recordId(record);
    if (!entry.records.some(r => this.recordId(r) === recordId)) {
      entry.records.push(record);
    }

    // Update category index
    const values = this.categoryIndex.get(category) || new Set();
    values.add(value);
    this.categoryIndex.set(category, values);
  }

  /**
   * Generate record ID
   */
  private recordId(record: IndexRecord): string {
    return record.id;
  }
}

// Export for public API
export const createMetadataIndex = (): MetadataIndex => {
  return new MetadataIndex();
};
