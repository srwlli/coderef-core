/**
 * CodeRef2 Relationship Index
 *
 * Graph-based indexing for code relationships and dependencies
 * Supports 10 relationship types per specification
 *
 * Per specification lines 173-186
 */

import { ParsedCodeRef } from '../parser/parser.js';
import { IndexRecord } from './index-store.js';

/**
 * Supported relationship types
 */
export type RelationshipType =
  | 'depends-on'
  | 'used-by'
  | 'calls'
  | 'implements'
  | 'extends'
  | 'imports'
  | 'observes'
  | 'emits'
  | 'listens'
  | 'conflicts-with';

/**
 * All relationship types
 */
export const ALL_RELATIONSHIP_TYPES: RelationshipType[] = [
  'depends-on',
  'used-by',
  'calls',
  'implements',
  'extends',
  'imports',
  'observes',
  'emits',
  'listens',
  'conflicts-with',
];

/**
 * Relationship edge
 */
export interface RelationshipEdge {
  type: RelationshipType;
  from: IndexRecord;           // Source reference
  to: ParsedCodeRef | string;  // Target (can be string ID if not indexed)
  metadata?: Record<string, any>;
}

/**
 * Relationship graph node
 */
export interface GraphNode {
  record: IndexRecord;
  outgoing: RelationshipEdge[];  // Relationships FROM this node
  incoming: RelationshipEdge[];  // Relationships TO this node
}

/**
 * Relationship Index Manager
 */
export class RelationshipIndex {
  private edges: RelationshipEdge[];                    // All relationships
  private graph: Map<string, GraphNode>;               // Record ID → GraphNode
  private typeIndex: Map<RelationshipType, RelationshipEdge[]>;  // Type → edges

  constructor() {
    this.edges = [];
    this.graph = new Map();
    this.typeIndex = new Map();
    this.initializeTypeIndex();
  }

  /**
   * Add a relationship between two references
   */
  public addRelationship(
    fromRecord: IndexRecord,
    type: RelationshipType,
    toReference: ParsedCodeRef | string,
    metadata?: Record<string, any>
  ): void {
    const edge: RelationshipEdge = {
      type,
      from: fromRecord,
      to: toReference,
      metadata,
    };

    // Add to all edges
    this.edges.push(edge);

    // Add to type index
    const typeEdges = this.typeIndex.get(type) || [];
    typeEdges.push(edge);
    this.typeIndex.set(type, typeEdges);

    // Update graph
    const fromId = fromRecord.id;
    let fromNode = this.graph.get(fromId);
    if (!fromNode) {
      fromNode = {
        record: fromRecord,
        outgoing: [],
        incoming: [],
      };
      this.graph.set(fromId, fromNode);
    }
    fromNode.outgoing.push(edge);

    // Add incoming if target is a known reference
    if (toReference instanceof Object && 'type' in toReference) {
      const toId = this.refId(toReference);
      let toNode = this.graph.get(toId);
      if (!toNode) {
        // Create placeholder node for external reference
        toNode = {
          record: this.createPlaceholderRecord(toReference),
          outgoing: [],
          incoming: [],
        };
        this.graph.set(toId, toNode);
      }
      toNode.incoming.push(edge);
    }
  }

  /**
   * Index relationships from a reference's metadata
   */
  public indexRecord(record: IndexRecord): void {
    const parsed = record.parsed;

    if (!parsed.metadata) {
      return;
    }

    // Look for relationship metadata
    for (const [key, value] of Object.entries(parsed.metadata)) {
      const type = this.parseRelationshipType(key);
      if (!type) continue;

      // Parse target references
      if (Array.isArray(value)) {
        for (const target of value) {
          if (typeof target === 'string') {
            this.addRelationship(record, type, target);
          }
        }
      } else if (typeof value === 'string') {
        this.addRelationship(record, type, value);
      }
    }
  }

  /**
   * Batch index multiple records
   */
  public indexRecords(records: IndexRecord[]): void {
    for (const record of records) {
      this.indexRecord(record);
    }
  }

  /**
   * Get outgoing relationships from a record
   */
  public getOutgoing(
    record: IndexRecord,
    type?: RelationshipType
  ): RelationshipEdge[] {
    const node = this.graph.get(record.id);
    if (!node) return [];

    if (type) {
      return node.outgoing.filter(e => e.type === type);
    }
    return node.outgoing;
  }

  /**
   * Get incoming relationships to a record
   */
  public getIncoming(
    record: IndexRecord,
    type?: RelationshipType
  ): RelationshipEdge[] {
    const node = this.graph.get(record.id);
    if (!node) return [];

    if (type) {
      return node.incoming.filter(e => e.type === type);
    }
    return node.incoming;
  }

  /**
   * Get all relationships of a type
   */
  public getByType(type: RelationshipType): RelationshipEdge[] {
    return this.typeIndex.get(type) || [];
  }

  /**
   * Traverse relationships (depth-first)
   */
  public traverse(
    startRecord: IndexRecord,
    type: RelationshipType,
    maxDepth: number = 10
  ): {
    record: IndexRecord;
    depth: number;
  }[] {
    const visited = new Set<string>();
    const results: { record: IndexRecord; depth: number }[] = [];

    const walk = (recordId: string, depth: number) => {
      if (depth > maxDepth || visited.has(recordId)) {
        return;
      }
      visited.add(recordId);

      const node = this.graph.get(recordId);
      if (!node) return;

      results.push({
        record: node.record,
        depth,
      });

      // Follow outgoing edges
      for (const edge of node.outgoing) {
        if (edge.type === type) {
          const targetId = this.getTargetId(edge);
          if (targetId) {
            walk(targetId, depth + 1);
          }
        }
      }
    };

    walk(startRecord.id, 0);
    return results;
  }

  /**
   * Find all transitive dependents (reverse traverse)
   */
  public getTransitiveDependents(record: IndexRecord): IndexRecord[] {
    const visited = new Set<string>();
    const results: IndexRecord[] = [];

    const walk = (recordId: string) => {
      if (visited.has(recordId)) return;
      visited.add(recordId);

      const node = this.graph.get(recordId);
      if (!node) return;

      // Find all nodes that depend on this one
      for (const edge of node.incoming) {
        if (edge.type === 'depends-on' || edge.type === 'used-by') {
          const depId = this.getSourceId(edge);
          if (depId && !visited.has(depId)) {
            const depNode = this.graph.get(depId);
            if (depNode) {
              results.push(depNode.record);
              walk(depId);
            }
          }
        }
      }
    };

    walk(record.id);
    return results;
  }

  /**
   * Detect circular dependencies
   */
  public findCircularDependencies(): {
    nodes: IndexRecord[];
    path: string[];
  }[] {
    const cycles: { nodes: IndexRecord[]; path: string[] }[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const hasCycle = (
      nodeId: string,
      path: string[]
    ): { found: boolean; cycle: string[] } => {
      if (visited.has(nodeId)) {
        return { found: false, cycle: [] };
      }

      if (visiting.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        return {
          found: true,
          cycle: path.slice(cycleStart).concat(nodeId),
        };
      }

      visiting.add(nodeId);
      path.push(nodeId);

      const node = this.graph.get(nodeId);
      if (!node) {
        visiting.delete(nodeId);
        path.pop();
        return { found: false, cycle: [] };
      }

      for (const edge of node.outgoing) {
        if (edge.type === 'depends-on' || edge.type === 'calls') {
          const targetId = this.getTargetId(edge);
          if (targetId) {
            const { found, cycle } = hasCycle(targetId, [...path]);
            if (found) {
              return { found: true, cycle };
            }
          }
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      path.pop();
      return { found: false, cycle: [] };
    };

    for (const nodeId of this.graph.keys()) {
      const { found, cycle } = hasCycle(nodeId, []);
      if (found) {
        const nodes: IndexRecord[] = [];
        for (const id of cycle) {
          const node = this.graph.get(id);
          if (node) nodes.push(node.record);
        }
        cycles.push({ nodes, path: cycle });
      }
    }

    return cycles;
  }

  /**
   * Get statistics
   */
  public getStats(): {
    total_edges: number;
    total_nodes: number;
    by_type: Record<RelationshipType, number>;
  } {
    const stats: any = {
      total_edges: this.edges.length,
      total_nodes: this.graph.size,
      by_type: {},
    };

    for (const type of ALL_RELATIONSHIP_TYPES) {
      stats.by_type[type] = this.typeIndex.get(type)?.length || 0;
    }

    return stats;
  }

  /**
   * Clear all relationships
   */
  public clear(): void {
    this.edges = [];
    this.graph.clear();
    this.typeIndex.clear();
    this.initializeTypeIndex();
  }

  /**
   * Export for debugging
   */
  public export(): {
    edges: Array<{
      from: string;
      to: string;
      type: RelationshipType;
    }>;
    stats: any;
  } {
    return {
      edges: this.edges.map(e => ({
        from: e.from.id,
        to: typeof e.to === 'string' ? e.to : this.refId(e.to),
        type: e.type,
      })),
      stats: this.getStats(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Initialize type index
   */
  private initializeTypeIndex(): void {
    for (const type of ALL_RELATIONSHIP_TYPES) {
      this.typeIndex.set(type, []);
    }
  }

  /**
   * Parse relationship type from metadata key
   */
  private parseRelationshipType(key: string): RelationshipType | null {
    // Check for category:type format
    const colonIndex = key.indexOf(':');
    if (colonIndex !== -1) {
      const potentialType = key.substring(colonIndex + 1);
      if (this.isRelationshipType(potentialType)) {
        return potentialType as RelationshipType;
      }
    }

    // Check if key itself is a type
    if (this.isRelationshipType(key)) {
      return key as RelationshipType;
    }

    return null;
  }

  /**
   * Check if valid relationship type
   */
  private isRelationshipType(type: string): boolean {
    return ALL_RELATIONSHIP_TYPES.includes(type as RelationshipType);
  }

  /**
   * Generate reference ID (must match index-store's generateId format)
   */
  private refId(ref: ParsedCodeRef): string {
    const parts = [
      ref.type,
      ref.path,
      ref.element || 'no-element',
      ref.line || 'no-line',
    ];
    return parts.join(':');
  }

  /**
   * Get target ID from edge
   */
  private getTargetId(edge: RelationshipEdge): string | null {
    if (typeof edge.to === 'string') {
      return edge.to;
    }
    return this.refId(edge.to);
  }

  /**
   * Get source ID from edge
   */
  private getSourceId(edge: RelationshipEdge): string {
    return edge.from.id;
  }

  /**
   * Create placeholder record for external reference
   */
  private createPlaceholderRecord(ref: ParsedCodeRef): IndexRecord {
    return {
      id: this.refId(ref),
      parsed: ref,
      indexed_at: new Date(),
      index_keys: {
        byType: ref.type,
        byPath: ref.path,
        byElement: ref.element,
      },
    };
  }
}

// Export for public API
export const createRelationshipIndex = (): RelationshipIndex => {
  return new RelationshipIndex();
};
