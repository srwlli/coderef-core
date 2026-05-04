import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { SQLiteVectorStore } from '../../../src/integration/vector/sqlite-store.js';
import type { VectorRecord } from '../../../src/integration/vector/vector-store.js';

// Phase 7 task 1.15 — backend filter capability integration test for
// the new layer/capability semantic facets (AC-06). Indexes 3 records
// with distinct layer values into the sqlite vector store, then queries
// with filter={layer: 'service'} and asserts only the matching record
// returns. Sqlite is the default backend per .coderef/rag-index.json;
// chroma + pinecone are skipped in the local test matrix because they
// require external servers / API keys.

const created: string[] = [];
afterEach(async () => {
  await Promise.all(
    created.splice(0).map((p) =>
      fs.rm(p, { recursive: true, force: true }).catch(() => {}),
    ),
  );
});

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-p7-facet-'));
  created.push(dir);
  const storagePath = path.join(dir, 'vectors.json');
  const store = new SQLiteVectorStore({ storagePath, dimension: 4 });
  await store.initialize();
  return { store, dir };
}

describe('Phase 7 AC-06 — sqlite filter-by-layer + filter-by-capability', () => {
  it('filter={layer: "service"} returns only the service record', async () => {
    const { store } = await makeStore();
    const records: VectorRecord[] = [
      {
        id: '@Fn/auth.ts#login:1',
        values: [1, 0, 0, 0],
        metadata: {
          coderef: '@Fn/auth.ts#login:1',
          type: 'function',
          name: 'login',
          file: 'auth.ts',
          line: 1,
          language: 'typescript',
          layer: 'service',
        },
      },
      {
        id: '@Fn/cli.ts#main:1',
        values: [0, 1, 0, 0],
        metadata: {
          coderef: '@Fn/cli.ts#main:1',
          type: 'function',
          name: 'main',
          file: 'cli.ts',
          line: 1,
          language: 'typescript',
          layer: 'cli',
        },
      },
      {
        id: '@Fn/util.ts#hash:1',
        values: [0, 0, 1, 0],
        metadata: {
          coderef: '@Fn/util.ts#hash:1',
          type: 'function',
          name: 'hash',
          file: 'util.ts',
          line: 1,
          language: 'typescript',
          layer: 'utility',
        },
      },
    ];
    await store.upsert(records);

    const result = await store.query([1, 0, 0, 0], {
      topK: 10,
      filter: { layer: 'service' },
    });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].id).toBe('@Fn/auth.ts#login:1');
    expect((result.matches[0].metadata as any)?.layer).toBe('service');
  });

  it('filter={capability: "auth-flow"} returns only the auth-flow record', async () => {
    const { store } = await makeStore();
    const records: VectorRecord[] = [
      {
        id: '@Fn/a.ts#x:1',
        values: [1, 0, 0, 0],
        metadata: {
          coderef: '@Fn/a.ts#x:1',
          type: 'function',
          name: 'x',
          file: 'a.ts',
          line: 1,
          language: 'typescript',
          capability: 'auth-flow',
        },
      },
      {
        id: '@Fn/b.ts#y:1',
        values: [0, 1, 0, 0],
        metadata: {
          coderef: '@Fn/b.ts#y:1',
          type: 'function',
          name: 'y',
          file: 'b.ts',
          line: 1,
          language: 'typescript',
          capability: 'data-access',
        },
      },
    ];
    await store.upsert(records);

    const result = await store.query([1, 0, 0, 0], {
      topK: 10,
      filter: { capability: 'auth-flow' },
    });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].id).toBe('@Fn/a.ts#x:1');
  });

  it('absence of facet filter returns all records (pre-Phase-7 behavior preserved)', async () => {
    const { store } = await makeStore();
    const records: VectorRecord[] = [
      {
        id: '@Fn/a.ts#x:1',
        values: [1, 0, 0, 0],
        metadata: {
          coderef: '@Fn/a.ts#x:1',
          type: 'function',
          name: 'x',
          file: 'a.ts',
          line: 1,
          language: 'typescript',
          layer: 'service',
        },
      },
      {
        id: '@Fn/b.ts#y:1',
        values: [0, 1, 0, 0],
        metadata: {
          coderef: '@Fn/b.ts#y:1',
          type: 'function',
          name: 'y',
          file: 'b.ts',
          line: 1,
          language: 'typescript',
          layer: 'cli',
        },
      },
    ];
    await store.upsert(records);

    const result = await store.query([1, 0, 0, 0], { topK: 10 });
    expect(result.matches.length).toBe(2);
  });
});
