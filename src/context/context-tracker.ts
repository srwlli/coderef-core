/**
 * Context Tracker - Maintains conversation state across multiple queries
 * Phase 5, Task P5-T2: Context Tracking (setContext, getContext)
 *
 * Provides:
 * - Context storage and retrieval
 * - History management with size limits
 * - TTL-based context expiration
 * - Context persistence and merging
 */

/**
 * Represents a stored context entry with metadata
 */
export interface ContextEntry {
  id: string;
  key: string;
  value: any;
  timestamp: number;
  ttl?: number; // Time-to-live in milliseconds
  metadata?: Record<string, any>;
}

/**
 * Represents the complete conversation history
 */
export interface ContextHistory {
  conversationId: string;
  entries: ContextEntry[];
  createdAt: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

export class ContextTracker {
  private contexts: Map<string, ContextEntry> = new Map();
  private history: ContextEntry[] = [];
  private conversationId: string;
  private maxHistorySize: number = 100;
  private defaultTTL: number = 3600000; // 1 hour in milliseconds
  private cleanupInterval?: NodeJS.Timeout;

  constructor(conversationId: string = this.generateId(), maxHistorySize: number = 100) {
    this.conversationId = conversationId;
    this.maxHistorySize = maxHistorySize;
    this.startCleanupTimer();
  }

  /**
   * Set context value with optional TTL
   */
  setContext(key: string, value: any, ttl?: number): string {
    const id = this.generateId();
    const entry: ContextEntry = {
      id,
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      metadata: {
        conversationId: this.conversationId,
      },
    };

    this.contexts.set(key, entry);
    this.addToHistory(entry);

    return id;
  }

  /**
   * Get context value by key
   */
  getContext(key: string): any | null {
    const entry = this.contexts.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.contexts.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Get context entry with metadata
   */
  getContextEntry(key: string): ContextEntry | null {
    const entry = this.contexts.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.contexts.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Check if context key exists
   */
  hasContext(key: string): boolean {
    return this.getContext(key) !== null;
  }

  /**
   * List all active context keys
   */
  getContextKeys(): string[] {
    const keys: string[] = [];

    for (const [key, entry] of this.contexts.entries()) {
      // Skip expired entries
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.contexts.delete(key);
        continue;
      }
      keys.push(key);
    }

    return keys;
  }

  /**
   * Get all active context entries
   */
  getAllContext(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, entry] of this.contexts.entries()) {
      // Skip expired entries
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.contexts.delete(key);
        continue;
      }
      result[key] = entry.value;
    }

    return result;
  }

  /**
   * Delete specific context
   */
  deleteContext(key: string): boolean {
    return this.contexts.delete(key);
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.contexts.clear();
  }

  /**
   * Merge multiple context values
   */
  mergeContext(source: Record<string, any>, mergeStrategy: 'overwrite' | 'preserve' | 'concat' = 'overwrite'): void {
    for (const [key, value] of Object.entries(source)) {
      if (mergeStrategy === 'overwrite') {
        this.setContext(key, value);
      } else if (mergeStrategy === 'preserve') {
        if (!this.hasContext(key)) {
          this.setContext(key, value);
        }
      } else if (mergeStrategy === 'concat') {
        const existing = this.getContext(key);
        if (Array.isArray(existing) && Array.isArray(value)) {
          this.setContext(key, [...existing, ...value]);
        } else if (typeof existing === 'object' && typeof value === 'object') {
          this.setContext(key, { ...existing, ...value });
        } else {
          this.setContext(key, value);
        }
      }
    }
  }

  /**
   * Get complete conversation history
   */
  getHistory(): ContextHistory {
    return {
      conversationId: this.conversationId,
      entries: [...this.history],
      createdAt: this.history[0]?.timestamp || Date.now(),
      lastAccessed: Date.now(),
    };
  }

  /**
   * Get history entries for specific key
   */
  getKeyHistory(key: string): ContextEntry[] {
    return this.history.filter((entry) => entry.key === key);
  }

  /**
   * Get history of last N entries
   */
  getRecentHistory(count: number): ContextEntry[] {
    return this.history.slice(Math.max(0, this.history.length - count));
  }

  /**
   * Get conversation ID
   */
  getConversationId(): string {
    return this.conversationId;
  }

  /**
   * Export context to JSON
   */
  exportToJSON(): string {
    const data = {
      conversationId: this.conversationId,
      contexts: Array.from(this.contexts.entries()).map(([key, entry]) => ({
        key,
        ...entry,
      })),
      history: this.history,
      exportedAt: Date.now(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import context from JSON
   */
  importFromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      this.conversationId = data.conversationId;

      this.contexts.clear();
      for (const entry of data.contexts) {
        const { key, ...contextEntry } = entry;
        this.contexts.set(key, contextEntry);
      }

      this.history = data.history;
    } catch (error) {
      throw new Error(`Failed to import context from JSON: ${(error as Error).message}`);
    }
  }

  /**
   * Get context statistics
   */
  getStatistics(): Record<string, any> {
    return {
      conversationId: this.conversationId,
      contextCount: this.contexts.size,
      historySize: this.history.length,
      maxHistorySize: this.maxHistorySize,
      activeKeys: this.getContextKeys().length,
      memory: {
        contextSize: JSON.stringify(Array.from(this.contexts.values())).length,
        historySize: JSON.stringify(this.history).length,
      },
    };
  }

  /**
   * Clean up expired contexts
   */
  private cleanupExpiredContexts(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.contexts.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.contexts.delete(key);
    }
  }

  /**
   * Add entry to history
   */
  private addToHistory(entry: ContextEntry): void {
    this.history.push(entry);

    // Enforce history size limit
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(Math.max(0, this.history.length - this.maxHistorySize));
    }
  }

  /**
   * Start periodic cleanup of expired contexts
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredContexts();
    }, 60000); // Run every minute
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Destroy tracker and clean up resources
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clearContext();
    this.history = [];
  }
}

export default ContextTracker;
