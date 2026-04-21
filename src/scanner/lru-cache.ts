/**
 * LRU Cache - Phase 3: Memory-Capped Caching
 *
 * Least Recently Used cache with size-based eviction
 * Prevents unlimited memory growth from file caching
 */

import { ElementData } from '../types/types.js';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  size: number;      // Estimated size in bytes
  timestamp: number; // Last access time
}

/**
 * LRU Cache with memory cap
 * Thread-safe for single-threaded Node.js environment
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;      // Maximum cache size in bytes
  private currentSize: number;  // Current cache size in bytes

  /**
   * @param maxSizeBytes Maximum cache size in bytes (default: 50MB)
   */
  constructor(maxSizeBytes: number = 50 * 1024 * 1024) {
    this.cache = new Map();
    this.maxSize = maxSizeBytes;
    this.currentSize = 0;
  }

  /**
   * Get value from cache
   * Updates access timestamp (LRU tracking)
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Update timestamp for LRU
    entry.timestamp = Date.now();
    return entry.value;
  }

  /**
   * Set value in cache
   * Evicts LRU items if size limit exceeded
   * @param key Cache key
   * @param value Value to cache
   * @param size Estimated size in bytes (optional, will estimate if not provided)
   */
  set(key: K, value: V, size?: number): void {
    const estimatedSize = size || this.estimateSize(value);

    // Check if item already exists (update case)
    const existing = this.cache.get(key);
    if (existing) {
      // Update existing entry
      this.currentSize -= existing.size;
      this.currentSize += estimatedSize;
      existing.value = value;
      existing.size = estimatedSize;
      existing.timestamp = Date.now();
      return;
    }

    // New entry - check if eviction needed
    while (this.currentSize + estimatedSize > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, {
      value,
      size: estimatedSize,
      timestamp: Date.now()
    });
    this.currentSize += estimatedSize;
  }

  /**
   * Delete entry from cache
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.currentSize -= entry.size;
    return this.cache.delete(key);
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get current cache statistics
   */
  getStats(): {
    entries: number;
    currentSize: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      entries: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      utilizationPercent: (this.currentSize / this.maxSize) * 100
    };
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestTimestamp = Infinity;

    // Find least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.delete(oldestKey);
    }
  }

  /**
   * Estimate size of value in bytes
   * Rough estimation based on type
   */
  private estimateSize(value: V): number {
    // Base object overhead
    let size = 64;

    if (typeof value === 'string') {
      // 2 bytes per character (UTF-16)
      return value.length * 2 + size;
    }

    if (typeof value === 'number') {
      return 8 + size;
    }

    if (typeof value === 'boolean') {
      return 4 + size;
    }

    if (Array.isArray(value)) {
      // Sum of array elements + array overhead
      size += value.length * 8; // Pointer overhead
      for (const item of value) {
        size += this.estimateSize(item as any);
      }
      return size;
    }

    if (typeof value === 'object' && value !== null) {
      // Object property estimation
      for (const [key, val] of Object.entries(value)) {
        size += key.length * 2; // Key size
        size += this.estimateSize(val as any); // Value size
      }
      return size;
    }

    // Default fallback
    return size;
  }
}

/**
 * Specialized cache for scanner results
 * Caches ElementData arrays with file modification time
 */
export interface ScanCacheEntry {
  elements: ElementData[];
  mtime: number;
}

/**
 * Create LRU cache for scanner with default 50MB limit
 */
export function createScannerCache(maxSizeBytes: number = 50 * 1024 * 1024): LRUCache<string, ScanCacheEntry> {
  return new LRUCache<string, ScanCacheEntry>(maxSizeBytes);
}
