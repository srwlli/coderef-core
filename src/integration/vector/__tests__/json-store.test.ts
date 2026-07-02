/**
 * @coderef-semantic: 1.0.0
 * @layer integration
 * @capability json-vector-store-atomic-write-and-alias-tests
 * @constraint no network, no external services; filesystem in temp dir only
 * @exports none
 * @imports vector/json-store:JsonVectorStore, llm/provider-factory:createVectorStore
 * @generated 2026-07-02T00:00:00Z
 */

/**
 * WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3 (P2-16, operator ruling A):
 * the store formerly named "sqlite" is a JSON file store. These tests pin
 * (a) crash-safe temp+rename saves leaving no residue and a parseable index,
 * (b) the deprecated 'sqlite' name still resolving to the JSON store with a
 * deprecation warning, and (c) the back-compat SQLiteVectorStore alias.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JsonVectorStore, SQLiteVectorStore } from '../json-store.js';
import { createVectorStore } from '../../llm/provider-factory.js';

const DIM = 4;

function record(id: string) {
  return {
    id,
    values: [0.1, 0.2, 0.3, 0.4],
    metadata: { coderef: id, type: 'function', file: 'a.ts', language: 'ts' } as any,
  };
}

describe('JsonVectorStore (P2-16)', () => {
  let tempDir: string;
  let storagePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-store-test-'));
    storagePath = path.join(tempDir, 'vectors.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('saves atomically: valid JSON on disk and no .tmp residue', async () => {
    const store = new JsonVectorStore({ storagePath, dimension: DIM } as any);
    await store.initialize();
    await store.upsert([record('@Fn/a#one:1'), record('@Fn/a#two:2')]);

    expect(fs.existsSync(storagePath)).toBe(true);
    expect(fs.existsSync(`${storagePath}.tmp`)).toBe(false);
    const parsed = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    expect(Object.keys(parsed.records)).toHaveLength(2);
  });

  it('keeps the previous index intact when a save fails mid-write', async () => {
    const store = new JsonVectorStore({ storagePath, dimension: DIM } as any);
    await store.initialize();
    await store.upsert([record('@Fn/a#one:1')]);
    const before = fs.readFileSync(storagePath, 'utf-8');

    // Simulate a failed save: a directory squatting on the temp path makes
    // the temp write throw. Under the old direct-overwrite save, this crash
    // point could leave the LIVE index truncated; with temp+rename the live
    // file must be untouched.
    fs.mkdirSync(`${storagePath}.tmp`);
    await expect(store.upsert([record('@Fn/a#two:2')])).rejects.toThrow();
    fs.rmdirSync(`${storagePath}.tmp`);

    // The live index file is untouched
    expect(fs.readFileSync(storagePath, 'utf-8')).toBe(before);
  });

  it('exports the deprecated SQLiteVectorStore alias for back-compat', () => {
    expect(SQLiteVectorStore).toBe(JsonVectorStore);
  });
});

describe('createVectorStore store-name resolution (P2-16)', () => {
  const fakeProvider = { getEmbeddingDimensions: () => DIM };
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-store-factory-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("resolves canonical 'json' to JsonVectorStore without warning", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = await createVectorStore('json', tempDir, fakeProvider);
    expect(store).toBeInstanceOf(JsonVectorStore);
    expect(warn.mock.calls.filter(c => String(c[0]).includes('deprecated'))).toHaveLength(0);
    warn.mockRestore();
  });

  it("resolves deprecated 'sqlite' to JsonVectorStore with a deprecation warning", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = await createVectorStore('sqlite', tempDir, fakeProvider);
    expect(store).toBeInstanceOf(JsonVectorStore);
    expect(warn.mock.calls.some(c => String(c[0]).includes('deprecated'))).toBe(true);
    warn.mockRestore();
  });
});
