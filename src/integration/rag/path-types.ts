import * as path from 'path';

/**
 * Branded string type representing an absolute filesystem path.
 * Callers are responsible for ensuring the string is absolute before casting
 * via toAbsolute(). Inside src/integration/rag/, all basePath values are
 * absolute by construction (process.cwd() default or CLI-supplied projectDir).
 */
export type AbsolutePath = string & { readonly __brand: 'AbsolutePath' };

/**
 * Branded string type representing a project-relative path.
 * Callers are responsible for ensuring the string is relative before casting
 * via toRelative(). Inside src/integration/rag/, all node.file values from
 * graph.json are relative by the graph.json contract.
 */
export type RelativePath = string & { readonly __brand: 'RelativePath' };

/**
 * Cast a string to AbsolutePath. The caller asserts the string is absolute.
 * Zero runtime overhead — this is a compile-time tag only.
 */
export function toAbsolute(p: string): AbsolutePath {
  return p as AbsolutePath;
}

/**
 * Cast a string to RelativePath. The caller asserts the string is relative.
 * Zero runtime overhead — this is a compile-time tag only.
 */
export function toRelative(p: string): RelativePath {
  return p as RelativePath;
}

/**
 * Runtime type guard for AbsolutePath. Use at system boundaries where an
 * external string has unknown absolute/relative provenance. Inside
 * src/integration/rag/ production code, prefer toAbsolute() or toRelative()
 * casts at the one known boundary (constructor, graph load) over repeated
 * runtime checks at every internal call site.
 */
export function isAbsolutePath(p: string): p is AbsolutePath {
  return path.isAbsolute(p);
}
