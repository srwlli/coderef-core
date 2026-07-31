/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-endpoint-identity-test
 */

/**
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 Phase 2 (DR-008).
 *
 * These tests pin the endpoint identity grammar to the STANDARDS it was derived
 * from, not to the implementation. Each block names the clause it enforces, so a
 * future change that breaks one of them fails against a spec rather than against
 * a preference.
 */

import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_ID_PREFIX,
  METHOD_UNSPECIFIED,
  canonicalEndpointPath,
  classifyClientPath,
  endpointIdentity,
  endpointNodeId,
  isEndpointNodeId,
  parseEndpointNodeId,
} from '../../src/pipeline/endpoint-identity.js';
import {
  normalizeRoutePath,
  normalizeSvelteKitRoute,
  normalizeNuxtRoute,
  normalizeRemixRoute,
} from '../../src/validator/route-normalizer.js';

describe('endpoint identity — OpenAPI 3.1 path-templating equality', () => {
  it('erases parameter NAMES: /pets/{petId} and /pets/{name} are ONE endpoint', () => {
    // OpenAPI 3.1.0 Paths Object: "Templated paths with the same hierarchy but
    // different templated names MUST NOT exist as they are identical."
    const a = canonicalEndpointPath('/pets/{petId}', 'fastapi');
    const b = canonicalEndpointPath('/pets/{name}', 'fastapi');
    expect(a).toBe('/pets/{}');
    expect(b).toBe(a);
    expect(endpointNodeId(a, 'GET')).toBe(endpointNodeId(b, 'GET'));
  });

  it('collapses every framework dialect onto the same identity', () => {
    // The same endpoint declared in six dialects must produce ONE node id.
    const ids = new Set([
      endpointNodeId(canonicalEndpointPath('/api/users/:id', 'express'), 'GET'),
      endpointNodeId(canonicalEndpointPath('/api/users/<int:id>', 'flask'), 'GET'),
      endpointNodeId(canonicalEndpointPath('/api/users/{user_id}', 'fastapi'), 'GET'),
      endpointNodeId(canonicalEndpointPath('/api/users/[id]', 'nextjs'), 'GET'),
      endpointNodeId(canonicalEndpointPath('/api/users/[slug]', 'sveltekit'), 'GET'),
      endpointNodeId(canonicalEndpointPath('/api/users/[uid]', 'nuxt'), 'GET'),
    ]);
    expect(ids.size).toBe(1);
    expect([...ids][0]).toBe('@Endpoint/api/users/{}#GET');
  });

  it('a client template literal (always {id}) matches a server {user_id}', () => {
    // frontend-call-parsers HARDCODE {id} for any `${...}` interpolation. Under
    // a name-bearing grammar this call and its handler would never join — the
    // single most important thing this grammar has to get right.
    const client = canonicalEndpointPath('/api/users/{id}');
    const server = canonicalEndpointPath('/api/users/<int:user_id>', 'flask');
    expect(client).toBe(server);
  });

  it('does NOT collapse a catch-all into a single-segment parameter', () => {
    // {*} matches one-or-more segments, {} matches exactly one. Different
    // endpoints; sharing an id would fabricate a match.
    const splat = canonicalEndpointPath('/files/[...path]', 'sveltekit');
    const param = canonicalEndpointPath('/files/[id]', 'sveltekit');
    expect(splat).toBe('/files/{*}');
    expect(param).toBe('/files/{}');
    expect(splat).not.toBe(param);
  });
});

describe('endpoint identity — RFC 9110 method semantics', () => {
  it('method participates in identity (404-shaped vs 405-shaped are distinguishable)', () => {
    const path = canonicalEndpointPath('/api/users', 'express');
    expect(endpointNodeId(path, 'GET')).not.toBe(endpointNodeId(path, 'POST'));
  });

  it('method is uppercased (RFC 9110 s9.1 — case-sensitive, uppercase by convention)', () => {
    const path = canonicalEndpointPath('/api/users', 'express');
    expect(endpointNodeId(path, 'get')).toBe(endpointNodeId(path, 'GET'));
  });

  it('no declared method yields ANY — never an expansion to all verbs', () => {
    const identity = endpointIdentity('/api/users', 'express', undefined);
    expect(identity.method).toBe(METHOD_UNSPECIFIED);
    expect(identity.id).toBe('@Endpoint/api/users#ANY');
  });
});

describe('endpoint identity — RFC 3986 path normalization', () => {
  it('collapses empty segments and drops a trailing slash', () => {
    expect(canonicalEndpointPath('/api//users/')).toBe('/api/users');
  });

  it('strips query and fragment (neither is part of the path)', () => {
    expect(canonicalEndpointPath('/api/users?page=2')).toBe('/api/users');
    expect(canonicalEndpointPath('/api/users#top')).toBe('/api/users');
  });

  it('PRESERVES case — s6.2.2.1 permits case normalization only for scheme/host', () => {
    expect(canonicalEndpointPath('/api/Users')).toBe('/api/Users');
    expect(canonicalEndpointPath('/api/Users')).not.toBe(canonicalEndpointPath('/api/users'));
  });

  it('guarantees a leading slash', () => {
    expect(canonicalEndpointPath('api/users')).toBe('/api/users');
  });

  it('a fragment can never leak into the locator and split the id', () => {
    // Structural, not cosmetic: `#` is the method separator in the node id.
    const id = endpointNodeId(canonicalEndpointPath('/api/x#frag'), 'GET');
    expect(id.split('#').length).toBe(2);
    expect(parseEndpointNodeId(id)).toEqual({ path: '/api/x', method: 'GET' });
  });
});

describe('endpoint node id grammar', () => {
  it('follows @<Designator>/<locator>#<name>, mirroring @File/<path>', () => {
    expect(endpointNodeId('/api/users/{}', 'GET')).toBe('@Endpoint/api/users/{}#GET');
    expect(isEndpointNodeId('@Endpoint/api/users/{}#GET')).toBe(true);
    expect(isEndpointNodeId('@File/src/main.ts')).toBe(false);
    expect(isEndpointNodeId('@Fn/src/main.ts#run:5')).toBe(false);
  });

  it('never emits a double slash after the designator', () => {
    expect(endpointNodeId('/api/users', 'GET').startsWith(`${ENDPOINT_ID_PREFIX}/`)).toBe(false);
  });

  it('round-trips through parseEndpointNodeId', () => {
    for (const [path, method] of [['/api/users/{}', 'GET'], ['/files/{*}', 'POST'], ['/', 'GET']]) {
      const parsed = parseEndpointNodeId(endpointNodeId(path, method));
      expect(parsed?.method).toBe(method);
    }
  });

  it('returns undefined for a non-endpoint id (usable as a guard)', () => {
    expect(parseEndpointNodeId('@Fn/src/main.ts#run:5')).toBeUndefined();
  });
});

describe('client path classification — surfaces, not verdicts', () => {
  it('an absolute URL is EXTERNAL by authority, not a resolution failure', () => {
    const result = classifyClientPath('http://localhost:11434/api/generate', 'POST');
    expect(result.kind).toBe('external');
    expect(result.path).toBe('/api/generate');
    expect(result.kind === 'external' && result.reason).toBe('absolute_url_external_origin');
  });

  it('a protocol-relative reference is also a distinct authority', () => {
    expect(classifyClientPath('//cdn.example.com/api/x', 'GET').kind).toBe('external');
  });

  it('an interpolated origin is UNRESOLVED — we do not guess same-origin', () => {
    // `${this.baseUrl}/api/embeddings` reaches us as `{id}/api/embeddings`.
    // baseUrl could be '' (local) or a vendor host (external). Stripping the
    // placeholder to force a match would fabricate a network hop.
    const result = classifyClientPath('{id}/api/embeddings', 'POST');
    expect(result.kind).toBe('origin-unknown');
    expect(result.kind === 'origin-unknown' && result.reason).toBe('client_path_origin_unresolved');
  });

  it('a plain same-origin path is local and canonical', () => {
    const result = classifyClientPath('/api/users/{id}', 'get');
    expect(result.kind).toBe('local');
    expect(result.path).toBe('/api/users/{}');
    expect(result.method).toBe('GET');
  });
});

describe('route-normalizer — the three arms that fell through default:', () => {
  it('sveltekit brackets now normalize (previously returned UNCHANGED)', () => {
    expect(normalizeRoutePath('/api/users/[id]', 'sveltekit').path).toBe('/api/users/{id}');
    expect(normalizeSvelteKitRoute('/api/files/[...rest]').path).toBe('/api/files/{...rest}');
    expect(normalizeSvelteKitRoute('/[[lang]]/about').path).toBe('/{lang}/about');
  });

  it('sveltekit layout groups contribute no URL segment', () => {
    expect(normalizeSvelteKitRoute('/(admin)/users/[id]').path).toBe('/users/{id}');
  });

  it('nuxt brackets now normalize', () => {
    expect(normalizeRoutePath('/api/users/[id]', 'nuxt').path).toBe('/api/users/{id}');
    expect(normalizeNuxtRoute('/api/[...slug]').path).toBe('/api/{...slug}');
  });

  it('remix $param and bare-$ splat now normalize', () => {
    expect(normalizeRoutePath('/users/$id', 'remix').path).toBe('/users/{id}');
    expect(normalizeRemixRoute('/files/$').path).toBe('/files/{...splat}');
  });

  it('dynamicSegments are populated for the three new arms (they were empty before)', () => {
    expect(normalizeRoutePath('/api/users/[id]', 'sveltekit').dynamicSegments).toEqual(['id']);
    expect(normalizeRoutePath('/api/users/[id]', 'nuxt').dynamicSegments).toEqual(['id']);
    expect(normalizeRoutePath('/users/$id', 'remix').dynamicSegments).toEqual(['id']);
  });

  it('an unknown framework still returns the path unchanged (no silent rewrite)', () => {
    expect(normalizeRoutePath('/api/users/:id', 'rails').path).toBe('/api/users/:id');
  });
});
