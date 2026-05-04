import { describe, expect, it } from 'vitest';

describe('Phase 5 graph traversal defaults (AC-06)', () => {
  it('no graph traversal helper currently exists in graph-builder.ts or graph-exporter.ts that would default to non-resolved-edge traversal', async () => {
    // AC-06: graph traversal helpers, if they exist, must only traverse
    // resolved edges by default. If no traversal helper exists, this
    // test documents that absence and prevents accidental introduction.
    const builderModule = await import('../../src/pipeline/graph-builder.js');
    const exporterModule = await import('../../src/export/graph-exporter.js');

    // Forbidden helper names that would imply default-non-resolved traversal:
    const FORBIDDEN_TRAVERSAL_HELPERS = [
      'traverseAll',
      'traverseAllEdges',
      'walkGraph',
      'getAllEdges',
    ];

    for (const name of FORBIDDEN_TRAVERSAL_HELPERS) {
      expect(builderModule).not.toHaveProperty(name);
      expect(exporterModule).not.toHaveProperty(name);
    }

    // If a traverseResolved helper appears later, it must be the
    // default-safe variant. This test does not require its existence;
    // it documents that no non-default-safe traversal helper exists.
  });
});
