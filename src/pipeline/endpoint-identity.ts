/**
 * @coderef-semantic: 1.0.0
 * @layer utility
 * @capability endpoint-identity
 * @exports ENDPOINT_DESIGNATOR, ENDPOINT_ID_PREFIX, METHOD_UNSPECIFIED, PARAM_PLACEHOLDER, SPLAT_PLACEHOLDER, EndpointIdentity, ClientPathClassification, canonicalEndpointPath, endpointNodeId, endpointIdentity, isEndpointNodeId, parseEndpointNodeId, classifyClientPath
 * @used_by src/pipeline/graph-builder.ts
 */

/**
 * endpoint-identity — the canonical identity grammar for an HTTP endpoint node.
 *
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 - Phase 2 (REC-002),
 * operator ruling DR-008 at the P2-T2 hard stop.
 *
 * This module is PURE: no I/O, no filesystem, no clock, no randomness. Given the
 * same (path, framework) it always yields the same id, which is what makes the
 * graph deterministic (AC-08) and the edge hashes stable (DR-PHASE-5-D).
 *
 * ---------------------------------------------------------------------------
 * WHY THE PARAMETER NAME IS NOT PART OF THE IDENTITY
 * ---------------------------------------------------------------------------
 * This is the load-bearing decision, and it is not ours — it is the OpenAPI
 * Specification's. OpenAPI 3.1.0, Paths Object:
 *
 *     "Templated paths with the same hierarchy but different templated names
 *      MUST NOT exist as they are identical."
 *
 *          /pets/{petId}
 *          /pets/{name}     <- identical to the above; invalid to declare both
 *
 * So `/users/{id}` and `/users/{userId}` are ONE endpoint, not two. Encoding the
 * parameter name into the node id would violate that and, worse, would silently
 * break the very thing this phase exists to build: a client call written as
 *
 *     fetch(`/api/users/${currentUser.id}`)
 *
 * is collapsed by frontend-call-parsers to the literal placeholder `{id}` — that
 * name is HARDCODED by the parser, not read from the source. A Flask handler
 * declaring `/api/users/<int:user_id>` normalizes to `{user_id}`. Under a
 * name-bearing grammar those two produce different node ids and the edge that
 * crosses the network boundary — the entire point of REC-002 — never forms.
 *
 * The repo's own matcher already agrees: route-matcher.dynamicMatch (line 96-100)
 * treats any two `{...}` segments as equal REGARDLESS of the name inside them.
 * A name-bearing identity would have contradicted the matcher that consumes it.
 *
 * Erasing the name to a bare `{}` therefore does something better than preserve
 * the status quo: it turns matching from an O(routes x calls) scan into a Map
 * lookup on the canonical path, because canonical-string equality now IS
 * dynamicMatch. Same semantics, one hash probe.
 *
 * A CATCH-ALL is deliberately NOT collapsed into the same placeholder. `{*}`
 * matches one-or-more segments while `{}` matches exactly one, so
 * `/files/[...path]` and `/files/[id]` are genuinely different endpoints and
 * must not share an id.
 *
 * ---------------------------------------------------------------------------
 * WHY THE METHOD IS PART OF THE IDENTITY
 * ---------------------------------------------------------------------------
 * RFC 9110 (HTTP Semantics) makes the request method a separate dimension from
 * the target URI: 404 (target unknown) and 405 (target known, method not
 * allowed) are distinct outcomes precisely because "does this path exist" and
 * "does this path answer this verb" are distinct questions. A path-only identity
 * would make a method mismatch unrepresentable. Method names are case-sensitive
 * and by convention uppercase (RFC 9110 section 9.1), so we uppercase and compare
 * exactly.
 *
 * When a detector reports NO methods, we mint the single method token
 * `METHOD_UNSPECIFIED` rather than expanding to all verbs. Absence of a declared
 * method is NO-DATA about which verbs are served — never a claim that all of
 * them are.
 *
 * ---------------------------------------------------------------------------
 * PATH CANONICALIZATION
 * ---------------------------------------------------------------------------
 * Follows RFC 3986 section 6.2.2 (syntax-based normalization), restricted to the
 * parts that are safe without knowing the scheme:
 *   - the path is CASE-SENSITIVE and is never lowercased (section 6.2.2.1 limits
 *     case normalization to scheme and host);
 *   - query and fragment are not part of the path (section 3) and are stripped;
 *   - empty path segments are collapsed and a trailing slash is removed, so
 *     `/api//users/` and `/api/users` are one endpoint.
 * Percent-encoding normalization (section 6.2.2.2) is NOT applied: route
 * declarations in source are authored decoded, and re-encoding them would
 * manufacture identities that no detector emits.
 *
 * ---------------------------------------------------------------------------
 * ID SHAPE
 * ---------------------------------------------------------------------------
 * The existing codeRef grammar is `@<Designator>/<locator>#<name>`; file-grain
 * pseudo-nodes already use a readable designator (`@File/<path>`) rather than a
 * two-letter code, and an endpoint is a pseudo-node of the same kind — it names
 * a thing that exists in the system but not at a source location. So:
 *
 *     @Endpoint/<canonical-path-without-leading-slash>#<METHOD>
 *
 *     @Endpoint/api/users/{}#GET
 *     @Endpoint/api/health#GET
 *     @Endpoint/files/{*}#POST
 *
 * The leading slash is dropped exactly as a file locator drops its leading
 * `./`, which keeps the `@Endpoint/` prefix from ever producing `//`. The root
 * path `/` yields the empty locator, `@Endpoint/#GET`; rare, but total and
 * unambiguous, since `#` cannot appear in a canonical path (it is stripped as a
 * fragment delimiter above).
 */

import { normalizeRoutePath } from '../validator/route-normalizer.js';

/** Designator segment of an endpoint node id. Mirrors `File` in `@File/<path>`. */
export const ENDPOINT_DESIGNATOR = 'Endpoint';

/** Prefix every endpoint node id starts with. Cheap `isEndpointNodeId` test. */
export const ENDPOINT_ID_PREFIX = `@${ENDPOINT_DESIGNATOR}/`;

/**
 * Method token used when a detector reported a route but declared no HTTP
 * methods. Means "the producer did not say" — NOT "every method".
 */
export const METHOD_UNSPECIFIED = 'ANY';

/** Canonical single-segment dynamic parameter. Name-erased per OpenAPI 3.1. */
export const PARAM_PLACEHOLDER = '{}';

/** Canonical catch-all/splat segment. Matches one-or-more segments. */
export const SPLAT_PLACEHOLDER = '{*}';

/** A canonical endpoint identity: what the node id is built from. */
export interface EndpointIdentity {
  /** Canonical path, leading slash retained (e.g. `/api/users/{}`). */
  path: string;
  /** Uppercase HTTP method, or METHOD_UNSPECIFIED. */
  method: string;
  /** The node id: `@Endpoint/<path-sans-leading-slash>#<METHOD>`. */
  id: string;
}

/**
 * How a client-side call path relates to the project's own endpoint surface.
 *
 * SURFACES, NOT VERDICTS. Every classification other than `local` still produces
 * an edge — an unmatched client call is recorded as unresolved, never dropped.
 * The `reason` is the resolver-taxonomy string stamped onto that edge.
 */
export type ClientPathClassification =
  /** A same-origin project path; `path` is canonical and matchable. */
  | { kind: 'local'; path: string; method: string }
  /**
   * An absolute URL with a scheme and authority (or a protocol-relative `//host`
   * form). A different origin by RFC 3986 section 3.2 — out of this project's
   * surface by construction, so the edge is `external`, not a failure.
   */
  | { kind: 'external'; path: string; method: string; reason: string }
  /**
   * The first segment is a placeholder, which happens when the call was written
   * as `` fetch(`${baseUrl}/api/x`) `` and the parser collapsed the interpolation.
   * The ORIGIN is unknown: `baseUrl` may be `''` (same origin) or
   * `https://vendor.example` (external). Both readings are defensible, so we
   * commit to neither and emit an unresolved edge. Stripping the leading
   * placeholder to force a match would fabricate a network hop that may not
   * exist.
   */
  | { kind: 'origin-unknown'; path: string; method: string; reason: string };

/** Scheme + `://`, per RFC 3986 section 3.1 (`ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )`). */
const ABSOLUTE_URL_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

/** Protocol-relative reference (`//host/path`) — also a distinct authority. */
const PROTOCOL_RELATIVE_RE = /^\/\//;

/**
 * Canonicalize a framework-native route path into the identity form.
 *
 * @param rawPath   Path as the detector reported it (framework-native dialect).
 * @param framework Framework name; drives dialect translation. Omit or pass an
 *                  unknown value for a path already in `{param}` form (which is
 *                  what the frontend-call parsers emit).
 */
export function canonicalEndpointPath(rawPath: string, framework?: string): string {
  // Step 1 — dialect to `{param}` form. normalizeRoutePath covers all seven
  // supported frameworks (the sveltekit/nuxt/remix arms were added by this same
  // phase; before that they fell through a `default:` that returned the path
  // UNCHANGED, so three of seven dialects were never actually collapsed).
  let p = framework ? normalizeRoutePath(rawPath, framework).path : rawPath;

  // Step 2 — drop query and fragment. Neither is part of the path (RFC 3986
  // section 3). The fragment strip is also structural for us: `#` is our
  // method separator, so it must not survive into the locator.
  p = p.split('#')[0].split('?')[0];

  // Step 3 — erase parameter NAMES (OpenAPI 3.1 path-identity rule). Catch-alls
  // first, so `{...slug}` is not mistaken for a single-segment `{slug}`.
  p = p.replace(/\{\.\.\.[^}]*\}/g, SPLAT_PLACEHOLDER);
  // A bare `*` segment is Express's splat; `{*}` is already canonical.
  p = p.replace(/(^|\/)\*(?=\/|$)/g, `$1${SPLAT_PLACEHOLDER}`);
  p = p.replace(/\{[^}]*\}/g, m => (m === SPLAT_PLACEHOLDER ? m : PARAM_PLACEHOLDER));

  // Step 4 — structural normalization (RFC 3986 section 6.2.2.3). Collapse empty
  // segments, guarantee a leading slash, drop a trailing slash. Case is
  // PRESERVED: section 6.2.2.1 permits case normalization only for scheme and
  // host, never for the path.
  p = p.replace(/\/{2,}/g, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

  return p;
}

/**
 * Build the endpoint node id for one (path, method) pair.
 *
 * @param canonicalPath Output of canonicalEndpointPath (leading slash included).
 * @param method        HTTP method; uppercased. Empty/absent becomes
 *                      METHOD_UNSPECIFIED.
 */
export function endpointNodeId(canonicalPath: string, method: string | undefined): string {
  const verb = (method ?? '').trim().toUpperCase() || METHOD_UNSPECIFIED;
  const locator = canonicalPath.replace(/^\//, '');
  return `${ENDPOINT_ID_PREFIX}${locator}#${verb}`;
}

/** Full identity record for a (rawPath, framework, method) triple. */
export function endpointIdentity(
  rawPath: string,
  framework: string | undefined,
  method: string | undefined,
): EndpointIdentity {
  const path = canonicalEndpointPath(rawPath, framework);
  const verb = (method ?? '').trim().toUpperCase() || METHOD_UNSPECIFIED;
  return { path, method: verb, id: endpointNodeId(path, verb) };
}

/** Is this graph node id an endpoint pseudo-node? */
export function isEndpointNodeId(id: string): boolean {
  return id.startsWith(ENDPOINT_ID_PREFIX);
}

/**
 * Inverse of endpointNodeId. Returns undefined for an id that is not an endpoint
 * node, so callers can use it as a type guard without a second check.
 */
export function parseEndpointNodeId(
  id: string,
): { path: string; method: string } | undefined {
  if (!isEndpointNodeId(id)) return undefined;
  const rest = id.slice(ENDPOINT_ID_PREFIX.length);
  const hash = rest.lastIndexOf('#');
  if (hash < 0) return undefined;
  return { path: `/${rest.slice(0, hash)}`, method: rest.slice(hash + 1) };
}

/**
 * Classify a client-side call path against this project's endpoint surface.
 *
 * Does NOT decide whether a matching endpoint exists — that is a graph lookup the
 * caller performs on the returned canonical `path`. This answers the prior
 * question: is the path even a candidate for a local match?
 */
export function classifyClientPath(
  rawPath: string,
  method: string | undefined,
): ClientPathClassification {
  const verb = (method ?? '').trim().toUpperCase() || METHOD_UNSPECIFIED;

  if (ABSOLUTE_URL_RE.test(rawPath) || PROTOCOL_RELATIVE_RE.test(rawPath)) {
    // Keep only the path component so the surfaced value is still readable;
    // the authority is what makes it external and is recorded in the reason.
    const afterScheme = rawPath.replace(ABSOLUTE_URL_RE, '').replace(PROTOCOL_RELATIVE_RE, '');
    const slash = afterScheme.indexOf('/');
    const pathPart = slash >= 0 ? afterScheme.slice(slash) : '/';
    return {
      kind: 'external',
      path: canonicalEndpointPath(pathPart),
      method: verb,
      reason: 'absolute_url_external_origin',
    };
  }

  const path = canonicalEndpointPath(rawPath);
  const firstSegment = path.split('/')[1] ?? '';
  if (firstSegment === PARAM_PLACEHOLDER || firstSegment === SPLAT_PLACEHOLDER) {
    return {
      kind: 'origin-unknown',
      path,
      method: verb,
      reason: 'client_path_origin_unresolved',
    };
  }

  return { kind: 'local', path, method: verb };
}
