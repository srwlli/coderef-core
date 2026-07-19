/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability scip-schema-tests
 */

/**
 * SCIP decoder round-trip tests (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P11).
 *
 * The synthetic .scip fixture is built by ENCODING the vendored descriptor with
 * protobufjs, then asserting decodeScipIndex round-trips it. This proves the
 * decode path against real protobuf wire bytes without needing an external
 * scip-typescript run (that genuine-index proof is the deferred resolver-wire
 * follow-up). No I/O — the buffer is built in-memory.
 */

import { describe, it, expect } from 'vitest';
import protobuf from 'protobufjs';
import {
  decodeScipIndex,
  ScipDecodeError,
  SCIP_SYMBOL_ROLE_DEFINITION,
} from '../../src/integration/scip/scip-schema.js';

// Build an encoder Root from the SAME descriptor the decoder uses, so the
// fixture is wire-faithful. (Mirrors the module's internal descriptor.)
const ENCODER = protobuf.Root.fromJSON({
  nested: {
    scip: {
      nested: {
        Index: { fields: { documents: { rule: 'repeated', type: 'Document', id: 2 } } },
        Document: {
          fields: {
            relative_path: { type: 'string', id: 1 },
            occurrences: { rule: 'repeated', type: 'Occurrence', id: 2 },
            symbols: { rule: 'repeated', type: 'SymbolInformation', id: 3 },
          },
        },
        Occurrence: {
          fields: {
            range: { rule: 'repeated', type: 'int32', id: 1 },
            symbol: { type: 'string', id: 2 },
            symbol_roles: { type: 'int32', id: 3 },
          },
        },
        SymbolInformation: {
          fields: {
            symbol: { type: 'string', id: 1 },
            documentation: { rule: 'repeated', type: 'string', id: 3 },
          },
        },
      },
    },
  },
});

function encodeIndex(obj: unknown): Uint8Array {
  const Index = ENCODER.lookupType('scip.Index');
  const err = Index.verify(obj as Record<string, unknown>);
  if (err) throw new Error(`fixture invalid: ${err}`);
  const msg = Index.create(obj as Record<string, unknown>);
  return Index.encode(msg).finish();
}

describe('decodeScipIndex', () => {
  it('round-trips an encoded SCIP index (1 doc, a definition + a reference)', () => {
    const bytes = encodeIndex({
      documents: [
        {
          relative_path: 'src/a.ts',
          occurrences: [
            { range: [9, 0, 9, 3], symbol: 'scip:ts . add().', symbol_roles: SCIP_SYMBOL_ROLE_DEFINITION },
            { range: [19, 2, 19, 5], symbol: 'scip:ts . add().', symbol_roles: 0 },
          ],
          symbols: [{ symbol: 'scip:ts . add().', documentation: ['Adds two numbers'] }],
        },
      ],
    });

    const idx = decodeScipIndex(bytes);
    expect(idx.documents).toHaveLength(1);
    const doc = idx.documents[0];
    expect(doc.relativePath).toBe('src/a.ts');
    expect(doc.occurrences).toHaveLength(2);

    const def = doc.occurrences[0];
    expect(def.symbol).toBe('scip:ts . add().');
    expect(def.isDefinition).toBe(true);
    expect(def.range).toEqual([9, 0, 9, 3]);

    const ref = doc.occurrences[1];
    expect(ref.isDefinition).toBe(false);
    expect(ref.range[0]).toBe(19);

    expect(doc.symbols[0].documentation).toEqual(['Adds two numbers']);
  });

  it('throws ScipDecodeError on an empty buffer', () => {
    expect(() => decodeScipIndex(new Uint8Array(0))).toThrow(ScipDecodeError);
  });

  it('throws ScipDecodeError on a malformed buffer (length prefix overruns)', () => {
    // A field tag for `documents` (field 2, wire type 2 = 0x12) followed by a
    // length prefix (0x7f = 127) with no payload -> protobuf overruns -> throws.
    const garbage = new Uint8Array([0x12, 0x7f, 0x01]);
    expect(() => decodeScipIndex(garbage)).toThrow(ScipDecodeError);
  });

  it('treats a 0-byte buffer as no-data (ScipDecodeError -> caller degrades)', () => {
    // A valid index with zero documents encodes to 0 bytes (protobuf omits empty
    // repeated fields), which is indistinguishable at the wire level from an
    // empty/absent .scip. Both are correctly surfaced as no-data via the error;
    // the caller (CLI/MCP) degrades to no_data:true rather than a false empty index.
    expect(() => decodeScipIndex(new Uint8Array(0))).toThrow(ScipDecodeError);
  });
});
