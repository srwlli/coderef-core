/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability json-vector-store-durability-contract
 */

/**
 * Durability contract for WO-ELEMENTEXTRACTOR-REVISITS-RUST-IMPL-AND-JAVA-OR-C-001
 * phase 4 (TKT-2ZSHSZ / STUB-X6ZVGC).
 *
 * JsonVectorStore mutated `this.data` and THEN called save(). When save() threw,
 * the running instance kept records the valid on-disk file did not have — and
 * nothing said so. The store went on answering queries from a state no reload
 * could ever reproduce. Measured at HEAD, all three shapes:
 *
 *   upsert + failed save                  memory {a,b}   disk {a}
 *   delete + failed save                  memory {b}     disk {a,b}
 *   upsert, bad dimension mid-batch       memory {good}  disk {}
 *
 * The third is the one worth staring at: it needs NO injected failure. The
 * dimension check throws partway through the loop, after earlier records are
 * already in memory and before anything reaches disk. One bad vector in a batch
 * was enough to desynchronise the store.
 *
 * FAILURE INJECTION IS REAL, NOT MOCKED. vitest cannot spy on ESM `fs` exports
 * ("Module namespace is not configurable in ESM"), and mocking the filesystem
 * would only prove the test's own fiction anyway. Instead these tests create a
 * DIRECTORY at the `<storagePath>.tmp` path that save() writes to, so the real
 * writeFileSync fails with a real EISDIR while the real store file keeps its
 * real prior contents. That is a genuine failed save.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonVectorStore } from '../../../src/integration/vector/json-store.js';

const created: string[] = [];
afterEach(() => {
  for (const d of created.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

async function makeStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-p4-'));
  created.push(dir);
  const file = path.join(dir, 'vectors.json');
  const store = new JsonVectorStore({ provider: 'json', dimension: 3, storagePath: file } as never);
  await store.initialize();
  return { store, file };
}

/** Block save() by occupying its temp path with a directory. Returns an undo. */
function breakSaves(file: string): () => void {
  fs.mkdirSync(`${file}.tmp`);
  return () => fs.rmSync(`${file}.tmp`, { recursive: true, force: true });
}

function diskIds(file: string): string[] {
  return Object.keys(JSON.parse(fs.readFileSync(file, 'utf-8')).records).sort();
}

async function memoryIds(store: JsonVectorStore): Promise<string[]> {
  return (await store.listAll()).map(r => r.id).sort();
}

describe('JsonVectorStore durability (TKT-2ZSHSZ)', () => {
  it('a failed upsert save leaves memory and disk IDENTICAL', async () => {
    const { store, file } = await makeStore();
    await store.upsert([{ id: 'a', values: [1, 0, 0] }]);

    const repair = breakSaves(file);
    await expect(store.upsert([{ id: 'b', values: [0, 1, 0] }])).rejects.toThrow();
    repair();

    // At HEAD: memory {a,b} vs disk {a}.
    expect(await memoryIds(store)).toEqual(['a']);
    expect(diskIds(file)).toEqual(['a']);
  });

  it('a failed delete save does NOT lose a record that is still on disk', async () => {
    const { store, file } = await makeStore();
    await store.upsert([{ id: 'a', values: [1, 0, 0] }, { id: 'b', values: [0, 1, 0] }]);

    const repair = breakSaves(file);
    await expect(store.delete(['a'])).rejects.toThrow();
    repair();

    // At HEAD: memory {b} vs disk {a,b} — the store had forgotten a record it
    // would get back on the next reload.
    expect(await memoryIds(store)).toEqual(['a', 'b']);
    expect(diskIds(file)).toEqual(['a', 'b']);
  });

  it('a failed clear save does NOT wipe memory while disk is intact', async () => {
    const { store, file } = await makeStore();
    await store.upsert([{ id: 'a', values: [1, 0, 0] }, { id: 'b', values: [0, 1, 0] }]);

    const repair = breakSaves(file);
    await expect(store.clear()).rejects.toThrow();
    repair();

    expect(await memoryIds(store)).toEqual(['a', 'b']);
    expect(diskIds(file)).toEqual(['a', 'b']);
  });

  it('a bad dimension MID-BATCH rolls back the records before it — no injected failure', async () => {
    const { store, file } = await makeStore();

    await expect(store.upsert([
      { id: 'good', values: [1, 0, 0] },
      { id: 'bad', values: [1, 0] },
    ])).rejects.toThrow(/Invalid vector dimension/);

    // At HEAD: memory {good} vs disk {}. Nothing failed on the filesystem —
    // the caller simply passed one wrong-length vector.
    expect(await memoryIds(store)).toEqual([]);
    expect(diskIds(file)).toEqual([]);
  });

  it('the store stays USABLE after a rolled-back failure', async () => {
    // Rollback beats marking the instance unusable precisely because of this:
    // a caller that handles the error can retry and succeed.
    const { store, file } = await makeStore();
    await store.upsert([{ id: 'a', values: [1, 0, 0] }]);

    const repair = breakSaves(file);
    await expect(store.upsert([{ id: 'b', values: [0, 1, 0] }])).rejects.toThrow();
    repair();

    await store.upsert([{ id: 'b', values: [0, 1, 0] }]);
    expect(await memoryIds(store)).toEqual(['a', 'b']);
    expect(diskIds(file)).toEqual(['a', 'b']);
  });

  it('a successful mutation still persists — the guard is not a no-op', async () => {
    const { store, file } = await makeStore();
    await store.upsert([{ id: 'a', values: [1, 0, 0] }, { id: 'b', values: [0, 1, 0] }]);
    expect(diskIds(file)).toEqual(['a', 'b']);

    await store.delete(['a']);
    expect(await memoryIds(store)).toEqual(['b']);
    expect(diskIds(file)).toEqual(['b']);

    await store.clear();
    expect(await memoryIds(store)).toEqual([]);
    expect(diskIds(file)).toEqual([]);
  });
});
