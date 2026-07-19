/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability scip-decode
 * @exports ScipIndex, ScipDocument, ScipOccurrence, ScipSymbolInformation, ScipDecodeError, SCIP_SYMBOL_ROLE_DEFINITION, decodeScipIndex
 * @used_by src/query/scip-resolution-delta.ts
 */

/**
 * scip-schema — minimal runtime decoder for the SCIP protobuf wire format
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 11, scope-A).
 *
 * SCIP (SCIP Code Intelligence Protocol, Sourcegraph) is a protobuf index a
 * user emits with an external indexer (scip-typescript, scip-python, …). This
 * module decodes the .scip BYTES into a plain typed object — it does NOT run
 * any indexer and does NOT depend on the `scip` npm package.
 *
 * WHY a vendored JSON descriptor, not scip.proto: protobufjs (already a repo
 * dependency) builds a message Root from a plain JSON descriptor via
 * `Root.fromJSON` — no `.proto` compile step, no codegen, no new dependency.
 * We vendor ONLY the subset scope-A needs (Index → Document → Occurrence →
 * SymbolInformation). Fields absent from the descriptor are ignored on decode,
 * which is the correct forward-compatible behavior for a growing schema.
 *
 * PURE: bytes in, object out. No I/O — the caller reads the .scip file and
 * passes the buffer. A malformed/empty buffer throws a typed ScipDecodeError so
 * the caller degrades to no_data rather than crashing.
 */

import protobuf from 'protobufjs';

/** SCIP `symbol_roles` is a bitfield; Definition is the low bit (0x1). */
export const SCIP_SYMBOL_ROLE_DEFINITION = 0x1;

/** A single symbol occurrence within a document (a def or a reference). */
export interface ScipOccurrence {
  /**
   * SCIP range: [startLine, startChar, endLine, endChar] (4-tuple), or
   * [startLine, startChar, endChar] (3-tuple, single-line). ALL 0-INDEXED.
   */
  range: number[];
  /** The scheme-qualified SCIP symbol moniker this occurrence refers to. */
  symbol: string;
  /** The raw symbol_roles bitfield. */
  symbolRoles: number;
  /** Derived: true when symbolRoles has the Definition bit set. */
  isDefinition: boolean;
}

/** Extra info about a symbol (documentation, etc.) — subset. */
export interface ScipSymbolInformation {
  symbol: string;
  documentation: string[];
}

/** One source document in the index. */
export interface ScipDocument {
  /** Repo-relative path (forward-slash), matching CodeRef index.json file keys. */
  relativePath: string;
  occurrences: ScipOccurrence[];
  symbols: ScipSymbolInformation[];
}

/** The decoded SCIP index. */
export interface ScipIndex {
  documents: ScipDocument[];
}

/** Thrown on a malformed/undecodable .scip buffer (caller degrades to no_data). */
export class ScipDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScipDecodeError';
  }
}

/**
 * The minimal SCIP message descriptor (protobufjs JSON form). Field numbers
 * are the canonical SCIP wire tags — they MUST match the SCIP spec or the
 * decode reads garbage. Only the scope-A subset is declared.
 */
const SCIP_DESCRIPTOR = {
  nested: {
    scip: {
      nested: {
        Index: {
          fields: {
            // metadata = 1 (not decoded in scope-A)
            documents: { rule: 'repeated', type: 'Document', id: 2 },
          },
        },
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
};

let cachedRoot: protobuf.Root | null = null;
function scipRoot(): protobuf.Root {
  if (!cachedRoot) cachedRoot = protobuf.Root.fromJSON(SCIP_DESCRIPTOR as protobuf.INamespace);
  return cachedRoot;
}

/**
 * Decode a .scip protobuf buffer into a plain typed ScipIndex.
 * Throws ScipDecodeError on an empty or malformed buffer.
 */
export function decodeScipIndex(bytes: Uint8Array): ScipIndex {
  if (!bytes || bytes.length === 0) {
    throw new ScipDecodeError('empty .scip buffer');
  }
  let raw: Record<string, unknown>;
  try {
    const Index = scipRoot().lookupType('scip.Index');
    const message = Index.decode(bytes);
    raw = Index.toObject(message, { defaults: true, arrays: true }) as Record<string, unknown>;
  } catch (err) {
    throw new ScipDecodeError(
      `failed to decode .scip: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const rawDocs = Array.isArray(raw.documents) ? (raw.documents as Record<string, unknown>[]) : [];
  const documents: ScipDocument[] = rawDocs.map((d) => {
    const rawOccs = Array.isArray(d.occurrences) ? (d.occurrences as Record<string, unknown>[]) : [];
    const occurrences: ScipOccurrence[] = rawOccs.map((o) => {
      const roles = typeof o.symbol_roles === 'number' ? o.symbol_roles : 0;
      return {
        range: Array.isArray(o.range) ? (o.range as number[]) : [],
        symbol: typeof o.symbol === 'string' ? o.symbol : '',
        symbolRoles: roles,
        isDefinition: (roles & SCIP_SYMBOL_ROLE_DEFINITION) !== 0,
      };
    });
    const rawSyms = Array.isArray(d.symbols) ? (d.symbols as Record<string, unknown>[]) : [];
    const symbols: ScipSymbolInformation[] = rawSyms.map((s) => ({
      symbol: typeof s.symbol === 'string' ? s.symbol : '',
      documentation: Array.isArray(s.documentation) ? (s.documentation as string[]) : [],
    }));
    return {
      relativePath: typeof d.relative_path === 'string' ? d.relative_path : '',
      occurrences,
      symbols,
    };
  });

  return { documents };
}
