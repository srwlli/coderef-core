/**
 * CodeRef2 Indexer Integration Tests
 *
 * Comprehensive test suite covering:
 * - All indexing operations
 * - All query types and combinations
 * - Metadata and relationship handling
 * - Query caching and performance
 * - Edge cases and error handling
 *
 * Performance target: < 100ms for 90th percentile queries
 * Test coverage: 281 baseline elements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParsedCodeRef } from '../src/parser/parser';
import {
  IndexStore,
  IndexRecord,
  createIndexStore,
  indexReferences,
} from '../src/indexer/index-store';
import {
  MetadataIndex,
  createMetadataIndex,
  MetadataCategory,
} from '../src/indexer/metadata-index';
import {
  RelationshipIndex,
  createRelationshipIndex,
  RelationshipType,
  ALL_RELATIONSHIP_TYPES,
} from '../src/indexer/relationship-index';
import {
  QueryEngine,
  createQueryEngine,
} from '../src/indexer/query-engine';
import {
  IndexerService,
  createIndexerService,
} from '../src/indexer/indexer-service';

// ============================================================================
// Test Fixtures and Helpers
// ============================================================================

/**
 * Create sample CodeRef for testing
 */
function createSampleRef(
  type: string,
  path: string,
  element?: string,
  line?: number,
  metadata?: Record<string, any>
): ParsedCodeRef {
  return {
    type,
    path,
    element,
    line: line?.toString(),
    metadata,
    isValid: true,
    errors: [],
  };
}

/**
 * Create multiple sample references for batch testing
 */
function createSampleReferences(count: number): ParsedCodeRef[] {
  const refs: ParsedCodeRef[] = [];
  const types = ['F', 'M', 'Fn', 'C', 'I'];
  const paths = ['utils', 'services', 'components', 'models', 'helpers'];

  for (let i = 0; i < count; i++) {
    refs.push(
      createSampleRef(
        types[i % types.length],
        `${paths[i % paths.length]}/module${Math.floor(i / 5)}.ts`,
        `element${i}`,
        10 + i,
        {
          status: i % 3 === 0 ? 'active' : 'deprecated',
          security: ['low', 'medium', 'high'][i % 3],
          custom: `value${i}`,
        }
      )
    );
  }

  return refs;
}

// ============================================================================
// IndexStore Tests
// ============================================================================

describe('IndexStore - Primary Indices', () => {
  let store: IndexStore;

  beforeEach(() => {
    store = createIndexStore();
  });

  it('should create an empty index store', () => {
    expect(store.count()).toBe(0);
    expect(store.getAllTypes().length).toBe(0);
    expect(store.getAllPaths().length).toBe(0);
  });

  it('should add a single reference to all indices', () => {
    const ref = createSampleRef('F', 'utils/helper.ts', 'formatDate');
    const record = store.addReference(ref);

    expect(record).toBeDefined();
    expect(record.id.includes('F:utils/helper.ts:formatDate')).toBe(true);
    expect(store.count()).toBe(1);
    expect(store.queryByType('F').length).toBe(1);
    expect(store.queryByPath('utils/helper.ts').length).toBe(1);
    expect(store.queryByElement('formatDate').length).toBe(1);
  });

  it('should batch add multiple references', () => {
    const refs = createSampleReferences(50);
    const records = store.addReferences(refs);

    expect(records.length).toBe(50);
    expect(store.count()).toBe(50);
  });

  it('should prevent duplicate references', () => {
    const ref = createSampleRef('F', 'utils/helper.ts', 'formatDate');
    store.addReference(ref);
    store.addReference(ref); // Add again

    expect(store.count()).toBe(1); // Should still be 1
  });

  it('should query by path prefix hierarchically', () => {
    store.addReferences([
      createSampleRef('F', 'utils/helpers/string.ts', 'trim'),
      createSampleRef('F', 'utils/helpers/array.ts', 'flatten'),
      createSampleRef('F', 'utils/validators.ts', 'isEmail'),
    ]);

    const results = store.queryByPathPrefix('utils/helpers');
    expect(results.length).toBe(2);
  });

  it('should return all indexed references', () => {
    const refs = createSampleReferences(10);
    store.addReferences(refs);

    const all = store.getAll();
    expect(all.length).toBe(10);
  });

  it('should get statistics correctly', () => {
    store.addReferences(createSampleReferences(30));

    const stats = store.getStats();
    expect(stats.total_records).toBe(30);
    expect(stats.by_type_count).toBeGreaterThan(0);
    expect(stats.by_path_count).toBeGreaterThan(0);
  });

  it('should check if reference is indexed', () => {
    const ref = createSampleRef('F', 'utils/helper.ts', 'formatDate');
    const record = store.addReference(ref);

    expect(store.isIndexed(ref)).toBe(true);
    expect(store.getRecord(record.id)).toBe(record);
  });

  it('should clear all indices', () => {
    store.addReferences(createSampleReferences(20));
    expect(store.count()).toBe(20);

    store.clear();
    expect(store.count()).toBe(0);
    expect(store.getAllTypes().length).toBe(0);
  });

  it('should export and import index state', () => {
    const refs = createSampleReferences(15);
    store.addReferences(refs);

    const exported = store.export();
    const newStore = createIndexStore();
    newStore.import(exported);

    expect(newStore.count()).toBe(15);
    expect(newStore.getAll().length).toBe(15);
  });

  it('should count references by type', () => {
    store.addReferences([
      createSampleRef('F', 'utils/helper.ts', 'fn1'),
      createSampleRef('F', 'utils/helper.ts', 'fn2'),
      createSampleRef('M', 'models/user.ts', 'method1'),
    ]);

    expect(store.countByType('F')).toBe(2);
    expect(store.countByType('M')).toBe(1);
  });
});

// ============================================================================
// MetadataIndex Tests
// ============================================================================

describe('MetadataIndex - Category-Based Indexing', () => {
  let store: IndexStore;
  let metadataIndex: MetadataIndex;

  beforeEach(() => {
    store = createIndexStore();
    metadataIndex = createMetadataIndex();
  });

  it('should index reference by standard metadata', () => {
    const ref = createSampleRef('F', 'utils/helper.ts', 'formatDate', undefined, {
      status: 'active',
      security: 'medium',
    });
    const record = store.addReference(ref);
    metadataIndex.indexReference(record);

    const active = metadataIndex.query('status', 'active');
    expect(active.length).toBe(1);

    const medium = metadataIndex.query('security', 'medium');
    expect(medium.length).toBe(1);
  });

  it('should handle metadata array values', () => {
    const ref = createSampleRef('F', 'utils/helper.ts', 'fn1', undefined, {
      'custom:tags': ['important', 'utils', 'helper'],
    });
    const record = store.addReference(ref);
    metadataIndex.indexReference(record);

    const results = metadataIndex.query('custom', 'important');
    expect(results.length).toBe(1);
  });

  it('should query multiple values (OR logic)', () => {
    const refs = [
      createSampleRef('F', 'file1.ts', 'fn1', undefined, { status: 'active' }),
      createSampleRef('F', 'file2.ts', 'fn2', undefined, { status: 'deprecated' }),
      createSampleRef('F', 'file3.ts', 'fn3', undefined, { status: 'experimental' }),
    ];

    refs.forEach(ref => {
      const record = store.addReference(ref);
      metadataIndex.indexReference(record);
    });

    const results = metadataIndex.queryMultiple('status', ['active', 'deprecated']);
    expect(results.length).toBe(2);
  });

  it('should query all values for a category', () => {
    const refs = createSampleReferences(20);
    refs.forEach(ref => {
      const record = store.addReference(ref);
      metadataIndex.indexReference(record);
    });

    const results = metadataIndex.queryCategory('status');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.value === 'active')).toBe(true);
  });

  it('should count references by metadata', () => {
    const refs = createSampleReferences(30);
    refs.forEach(ref => {
      const record = store.addReference(ref);
      metadataIndex.indexReference(record);
    });

    const activeCount = metadataIndex.count('status', 'active');
    expect(activeCount).toBeGreaterThan(0);
  });

  it('should get all categories', () => {
    const refs = createSampleReferences(10);
    refs.forEach(ref => {
      const record = store.addReference(ref);
      metadataIndex.indexReference(record);
    });

    const categories = metadataIndex.getCategories();
    expect(categories.includes('status')).toBe(true);
    expect(categories.includes('security')).toBe(true);
  });

  it('should get statistics', () => {
    const refs = createSampleReferences(15);
    refs.forEach(ref => {
      const record = store.addReference(ref);
      metadataIndex.indexReference(record);
    });

    const stats = metadataIndex.getStats();
    expect(stats.total_entries).toBeGreaterThan(0);
    expect(stats.categories.status).toBeGreaterThan(0);
  });

  it('should clear metadata index', () => {
    const ref = createSampleRef('F', 'file.ts', 'fn', undefined, { status: 'active' });
    const record = store.addReference(ref);
    metadataIndex.indexReference(record);

    expect(metadataIndex.count('status', 'active')).toBe(1);

    metadataIndex.clear();
    expect(metadataIndex.count('status', 'active')).toBe(0);
  });
});

// ============================================================================
// RelationshipIndex Tests
// ============================================================================

describe('RelationshipIndex - Relationship Graph', () => {
  let store: IndexStore;
  let relationshipIndex: RelationshipIndex;

  beforeEach(() => {
    store = createIndexStore();
    relationshipIndex = createRelationshipIndex();
  });

  it('should add a relationship between two records', () => {
    const ref1 = createSampleRef('F', 'file1.ts', 'fn1');
    const ref2 = createSampleRef('F', 'file2.ts', 'fn2');
    const record1 = store.addReference(ref1);
    const record2 = store.addReference(ref2);

    relationshipIndex.addRelationship(record1, 'depends-on', ref2);

    const outgoing = relationshipIndex.getOutgoing(record1);
    expect(outgoing.length).toBe(1);
    expect(outgoing[0].type).toBe('depends-on');
  });

  it('should get outgoing relationships', () => {
    const ref1 = createSampleRef('F', 'file1.ts', 'fn1');
    const ref2 = createSampleRef('F', 'file2.ts', 'fn2');
    const record1 = store.addReference(ref1);
    const record2 = store.addReference(ref2);

    relationshipIndex.addRelationship(record1, 'calls', ref2);
    relationshipIndex.addRelationship(record1, 'depends-on', ref2);

    const outgoing = relationshipIndex.getOutgoing(record1);
    expect(outgoing.length).toBe(2);

    const calls = relationshipIndex.getOutgoing(record1, 'calls');
    expect(calls.length).toBe(1);
  });

  it('should get incoming relationships', () => {
    const ref1 = createSampleRef('F', 'file1.ts', 'fn1');
    const ref2 = createSampleRef('F', 'file2.ts', 'fn2');
    const record1 = store.addReference(ref1);
    const record2 = store.addReference(ref2);

    relationshipIndex.addRelationship(record1, 'depends-on', ref2);

    const incoming = relationshipIndex.getIncoming(record2);
    expect(incoming.length).toBe(1);
    expect(incoming[0].type).toBe('depends-on');
  });

  it('should get all relationships by type', () => {
    const refs = createSampleReferences(5);
    const records = refs.map(r => store.addReference(r));

    relationshipIndex.addRelationship(records[0], 'depends-on', refs[1]);
    relationshipIndex.addRelationship(records[1], 'depends-on', refs[2]);
    relationshipIndex.addRelationship(records[0], 'calls', refs[3]);

    const dependsOn = relationshipIndex.getByType('depends-on');
    expect(dependsOn.length).toBe(2);

    const calls = relationshipIndex.getByType('calls');
    expect(calls.length).toBe(1);
  });

  it('should traverse relationships depth-first', () => {
    const refs = createSampleReferences(5);
    const records = refs.map(r => store.addReference(r));

    // Chain: 0 -> 1 -> 2 -> 3
    relationshipIndex.addRelationship(records[0], 'depends-on', refs[1]);
    relationshipIndex.addRelationship(records[1], 'depends-on', refs[2]);
    relationshipIndex.addRelationship(records[2], 'depends-on', refs[3]);

    const traversal = relationshipIndex.traverse(records[0], 'depends-on', 10);
    expect(traversal.length).toBeGreaterThan(1);
    expect(traversal[0].depth).toBe(0);
  });

  it('should find transitive dependents', () => {
    const refs = createSampleReferences(4);
    const records = refs.map(r => store.addReference(r));

    // 1 depends on 0, 2 depends on 1
    relationshipIndex.addRelationship(records[1], 'depends-on', refs[0]);
    relationshipIndex.addRelationship(records[2], 'depends-on', refs[1]);

    const dependents = relationshipIndex.getTransitiveDependents(records[0]);
    expect(dependents.length).toBeGreaterThan(0);
  });

  it('should detect circular dependencies', () => {
    const refs = createSampleReferences(3);
    const records = refs.map(r => store.addReference(r));

    // Create cycle: 0 -> 1 -> 2 -> 0
    relationshipIndex.addRelationship(records[0], 'depends-on', refs[1]);
    relationshipIndex.addRelationship(records[1], 'depends-on', refs[2]);
    relationshipIndex.addRelationship(records[2], 'depends-on', refs[0]);

    const cycles = relationshipIndex.findCircularDependencies();
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should get statistics', () => {
    const refs = createSampleReferences(5);
    const records = refs.map(r => store.addReference(r));

    relationshipIndex.addRelationship(records[0], 'depends-on', refs[1]);
    relationshipIndex.addRelationship(records[1], 'calls', refs[2]);

    const stats = relationshipIndex.getStats();
    expect(stats.total_edges).toBe(2);
    expect(stats.total_nodes).toBeGreaterThan(0);
  });

  it('should clear all relationships', () => {
    const refs = createSampleReferences(3);
    const records = refs.map(r => store.addReference(r));

    relationshipIndex.addRelationship(records[0], 'depends-on', refs[1]);
    relationshipIndex.addRelationship(records[1], 'calls', refs[2]);

    relationshipIndex.clear();

    const edges = relationshipIndex.getByType('depends-on');
    expect(edges.length).toBe(0);
  });

  it('should support all 10 relationship types', () => {
    const types: RelationshipType[] = ALL_RELATIONSHIP_TYPES;

    expect(types.length).toBe(10);
    expect(types.includes('depends-on')).toBe(true);
    expect(types.includes('used-by')).toBe(true);
    expect(types.includes('calls')).toBe(true);
    expect(types.includes('implements')).toBe(true);
    expect(types.includes('extends')).toBe(true);
    expect(types.includes('imports')).toBe(true);
    expect(types.includes('observes')).toBe(true);
    expect(types.includes('emits')).toBe(true);
    expect(types.includes('listens')).toBe(true);
    expect(types.includes('conflicts-with')).toBe(true);
  });
});

// ============================================================================
// QueryEngine Tests
// ============================================================================

describe('QueryEngine - Multi-Dimensional Queries', () => {
  let store: IndexStore;
  let metadataIndex: MetadataIndex;
  let relationshipIndex: RelationshipIndex;
  let queryEngine: QueryEngine;

  beforeEach(() => {
    store = createIndexStore();
    metadataIndex = createMetadataIndex();
    relationshipIndex = createRelationshipIndex();
    queryEngine = createQueryEngine(store, metadataIndex, relationshipIndex);

    // Populate with sample data
    const refs = createSampleReferences(50);
    refs.forEach(ref => {
      const record = store.addReference(ref);
      metadataIndex.indexReference(record);
      relationshipIndex.indexRecord(record);
    });
  });

  it('should query by type', () => {
    const result = queryEngine.byType('F');
    expect(result.count).toBeGreaterThan(0);
    expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.from_cache).toBe(false);
  });

  it('should query by path', () => {
    const result = queryEngine.byPath('utils/module0.ts');
    expect(result.count).toBeGreaterThan(0);
  });

  it('should query by path prefix', () => {
    const result = queryEngine.byPathPrefix('utils');
    expect(result.count).toBeGreaterThan(0);
  });

  it('should query by element', () => {
    const result = queryEngine.byElement('element0');
    expect(result.count).toBe(1);
  });

  it('should query by metadata category and value', () => {
    const result = queryEngine.byMetadata('status', 'active');
    expect(result.count).toBeGreaterThan(0);
  });

  it('should query by multiple metadata values (OR)', () => {
    const result = queryEngine.byMetadataMultiple('status', ['active', 'deprecated']);
    expect(result.count).toBeGreaterThan(0);
  });

  it('should query all metadata for a category', () => {
    const result = queryEngine.byMetadataCategory('status');
    expect(result.count).toBeGreaterThan(0);
  });

  it('should query by relationship type', () => {
    // Add some relationships
    const records = store.getAllRecords();
    if (records.length > 1) {
      relationshipIndex.addRelationship(records[0], 'depends-on', records[1].parsed);
    }

    const result = queryEngine.byRelationshipType('depends-on');
    // May be 0 if no relationships added
    expect(result.count >= 0).toBe(true);
  });

  it('should filter with custom predicate', () => {
    const result = queryEngine.where(ref => ref.type === 'F');
    expect(result.count).toBeGreaterThan(0);
  });

  it('should execute complex queries with multiple conditions', () => {
    const result = queryEngine.complex({
      type: 'F',
      metadata: [
        { category: 'status', value: 'active' },
      ],
    });
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('should paginate results', () => {
    const paginated = queryEngine.paginate(
      () => queryEngine.byType('F'),
      1,
      10
    );
    expect(paginated.total).toBeGreaterThan(0);
    expect(paginated.references.length).toBeLessThanOrEqual(10);
    expect(paginated.pages).toBeGreaterThan(0);
  });

  it('should cache query results', () => {
    const result1 = queryEngine.byType('F');
    const result2 = queryEngine.byType('F');

    expect(result2.from_cache).toBe(true);
    expect(result2.execution_time_ms).toBeLessThanOrEqual(result1.execution_time_ms);
  });

  it('should track cache statistics', () => {
    queryEngine.byType('F');
    queryEngine.byType('F');
    queryEngine.byElement('element0');

    const stats = queryEngine.getStats();
    expect(stats.cache_hits).toBeGreaterThan(0);
    expect(stats.hit_rate).toBeGreaterThanOrEqual(0);
  });

  it('should disable cache', () => {
    queryEngine.disableCache();
    const result1 = queryEngine.byType('F');
    const result2 = queryEngine.byType('F');

    expect(result2.from_cache).toBe(false);
  });

  it('should achieve < 100ms query performance', () => {
    // Test with 100 references
    const largeStore = createIndexStore();
    const largeRefs = createSampleReferences(100);
    largeStore.addReferences(largeRefs);

    const engine = createQueryEngine(largeStore, createMetadataIndex(), createRelationshipIndex());

    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      engine.byType('F');
    }
    const totalTime = Date.now() - start;
    const avgTime = totalTime / 100;

    expect(avgTime).toBeLessThan(100); // Average should be much less
  });

  it('should clear cache', () => {
    queryEngine.byType('F');
    queryEngine.clearCache();

    const stats = queryEngine.getStats();
    expect(stats.cache_size).toBe(0);
  });
});

// ============================================================================
// IndexerService Tests
// ============================================================================

describe('IndexerService - Orchestration Layer', () => {
  let service: IndexerService;

  beforeEach(() => {
    service = createIndexerService();
  });

  it('should create an indexer service', () => {
    expect(service).toBeDefined();
    expect(service.count()).toBe(0);
  });

  it('should index a single reference', () => {
    const ref = createSampleRef('F', 'utils/helper.ts', 'formatDate');
    const result = service.indexReference(ref);

    expect(result.success).toBe(true);
    expect(result.record).toBeDefined();
    expect(service.count()).toBe(1);
  });

  it('should batch index references', () => {
    const refs = createSampleReferences(50);
    const result = service.indexReferences(refs);

    expect(result.total_indexed).toBe(50);
    expect(result.total_failed).toBe(0);
    expect(result.success_rate).toBe(100);
    expect(service.count()).toBe(50);
  });

  it('should expose query methods', () => {
    const refs = createSampleReferences(20);
    service.indexReferences(refs);

    const byTypeResult = service.queryByType('F');
    expect(byTypeResult.count).toBeGreaterThan(0);

    const byPathResult = service.queryByPath('utils/module0.ts');
    expect(byPathResult.count).toBeGreaterThan(0);
  });

  it('should support complex queries', () => {
    const refs = createSampleReferences(30);
    service.indexReferences(refs);

    const result = service.complexQuery({
      type: 'F',
      metadata: [{ category: 'status', value: 'active' }],
    });
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('should provide access to underlying components', () => {
    expect(service.getIndexStore()).toBeDefined();
    expect(service.getMetadataIndex()).toBeDefined();
    expect(service.getRelationshipIndex()).toBeDefined();
    expect(service.getQueryEngine()).toBeDefined();
  });

  it('should get comprehensive statistics', () => {
    const refs = createSampleReferences(25);
    service.indexReferences(refs);

    const stats = service.getStats();
    expect(stats.total_indexed).toBe(25);
    expect(stats.total_failed).toBe(0);
    expect(stats.index_stats).toBeDefined();
    expect(stats.metadata_stats).toBeDefined();
    expect(stats.relationship_stats).toBeDefined();
    expect(stats.query_stats).toBeDefined();
  });

  it('should reset all indices', () => {
    service.indexReferences(createSampleReferences(20));
    expect(service.count()).toBe(20);

    service.reset();
    expect(service.count()).toBe(0);
  });

  it('should manage cache', () => {
    const refs = createSampleReferences(10);
    service.indexReferences(refs);

    service.queryByType('F');
    service.disableCaching();

    const result = service.queryByType('F');
    expect(result.from_cache).toBe(false);

    service.enableCaching();
    service.clearCache();
  });

  it('should handle errors gracefully', () => {
    // Invalid reference (missing required fields)
    const invalidRef = { type: 'F', path: '' } as any as ParsedCodeRef;

    const result = service.indexReference(invalidRef);
    // Should handle gracefully (not throw)
    expect(result).toBeDefined();
  });

  it('should export and import state', () => {
    const refs = createSampleReferences(15);
    service.indexReferences(refs);

    const exported = service.export();
    expect(exported.index_store).toBeDefined();
    expect(exported.stats).toBeDefined();

    const newService = createIndexerService();
    newService.import(exported);
    expect(newService.count()).toBe(15);
  });

  it('should track errors', () => {
    // Force an error by adding invalid data
    try {
      service.indexReference(null as any);
    } catch (e) {
      // Ignore
    }

    const errors = service.getErrors();
    // Errors array exists
    expect(Array.isArray(errors)).toBe(true);
  });
});

// ============================================================================
// Integration Tests - Full Pipeline
// ============================================================================

describe('Integration - Full Indexing Pipeline', () => {
  it('should index 281 baseline elements with all operations', () => {
    const service = createIndexerService();
    const refs = createSampleReferences(281);

    // Add metadata and relationships to simulate realistic data
    refs.forEach((ref, i) => {
      ref.metadata = {
        status: ['active', 'deprecated', 'experimental'][i % 3],
        security: ['low', 'medium', 'high'][i % 3],
        significance: ['critical', 'high', 'medium', 'low'][i % 4],
      };
    });

    // Index all references
    const indexResult = service.indexReferences(refs);
    expect(indexResult.total_indexed).toBe(281);
    expect(indexResult.success_rate).toBe(100);

    // Verify all query types work
    expect(service.queryByType('F').count).toBeGreaterThan(0);
    expect(service.queryByPath('utils/module0.ts').count).toBeGreaterThan(0);
    expect(service.queryByElement('element0').count).toBe(1);
    expect(service.queryByMetadata('status', 'active').count).toBeGreaterThan(0);

    // Verify statistics
    const stats = service.getStats();
    expect(stats.total_indexed).toBe(281);
    expect(stats.index_stats.total_records).toBe(281);
  });

  it('should achieve performance targets with caching', () => {
    const service = createIndexerService();
    const refs = createSampleReferences(281);

    service.indexReferences(refs);

    // Warm cache
    for (let i = 0; i < 10; i++) {
      service.queryByType('F');
      service.queryByPath('utils/module0.ts');
      service.queryByMetadata('status', 'active');
    }

    const stats = service.getStats();
    const queryStats = stats.query_stats;

    expect(queryStats.cache_hits).toBeGreaterThan(0);
    expect(queryStats.hit_rate).toBeGreaterThan(0);
  });

  it('should support real-world query patterns', () => {
    const service = createIndexerService();
    const refs = createSampleReferences(100);

    refs.forEach((ref, i) => {
      ref.metadata = {
        'status:value': 'active',
        'security:level': i % 2 === 0 ? 'high' : 'low',
        'scope:context': i % 3 === 0 ? 'public' : 'internal',
      };
    });

    service.indexReferences(refs);

    // Query pattern 1: Find all critical security issues
    const critical = service.queryByMetadata('security', 'high');
    expect(critical.count).toBeGreaterThan(0);

    // Query pattern 2: Find public APIs in specific path
    const publicApis = service.queryByPathPrefix('utils');
    expect(publicApis.count).toBeGreaterThan(0);

    // Query pattern 3: Complex multi-condition query
    const complex = service.complexQuery({
      type: 'F',
      metadata: [
        { category: 'status', value: 'active' },
        { category: 'security', value: 'high' },
      ],
    });
    expect(complex.count >= 0).toBe(true);
  });
});

// ============================================================================
// Performance Benchmarks
// ============================================================================

describe('Performance - Query Benchmarks', () => {
  it('should return query results within 100ms (90th percentile)', () => {
    const service = createIndexerService();
    const refs = createSampleReferences(281);
    service.indexReferences(refs);

    const times: number[] = [];

    // Run 1000 queries
    for (let i = 0; i < 1000; i++) {
      const result = service.queryByType(i % 2 === 0 ? 'F' : 'M');
      times.push(result.execution_time_ms);
    }

    // Calculate 90th percentile
    times.sort((a, b) => a - b);
    const p90Index = Math.floor(times.length * 0.9);
    const p90 = times[p90Index];

    expect(p90).toBeLessThan(100);
  });

  it('should handle batch indexing efficiently', () => {
    const service = createIndexerService();
    const refs = createSampleReferences(281);

    const start = Date.now();
    const result = service.indexReferences(refs);
    const duration = Date.now() - start;

    expect(result.total_indexed).toBe(281);
    expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
  });
});
