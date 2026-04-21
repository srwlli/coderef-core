/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Route Normalization Tests
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeFlaskRoute,
  normalizeFastAPIRoute,
  normalizeExpressRoute,
  normalizeNextJsRoute,
  extractDynamicSegments,
  normalizeRoutePath
} from './route-normalizer.js';

describe('normalizeFlaskRoute', () => {
  it('should convert Flask <int:id> to {id}', () => {
    const result = normalizeFlaskRoute('/users/<int:id>');

    expect(result.path).toBe('/users/{id}');
    expect(result.dynamicSegments).toEqual(['id']);
    expect(result.framework).toBe('flask');
  });

  it('should handle multiple dynamic segments', () => {
    const result = normalizeFlaskRoute('/users/<int:user_id>/posts/<int:post_id>');

    expect(result.path).toBe('/users/{user_id}/posts/{post_id}');
    expect(result.dynamicSegments).toEqual(['user_id', 'post_id']);
  });

  it('should handle different Flask types (string, path, uuid)', () => {
    const result1 = normalizeFlaskRoute('/files/<path:filepath>');
    expect(result1.path).toBe('/files/{filepath}');

    const result2 = normalizeFlaskRoute('/items/<uuid:item_id>');
    expect(result2.path).toBe('/items/{item_id}');

    const result3 = normalizeFlaskRoute('/users/<string:username>');
    expect(result3.path).toBe('/users/{username}');
  });

  it('should handle routes with no dynamic segments', () => {
    const result = normalizeFlaskRoute('/api/users');

    expect(result.path).toBe('/api/users');
    expect(result.dynamicSegments).toEqual([]);
  });

  it('should handle mixed static and dynamic segments', () => {
    const result = normalizeFlaskRoute('/api/v1/users/<int:id>/profile');

    expect(result.path).toBe('/api/v1/users/{id}/profile');
    expect(result.dynamicSegments).toEqual(['id']);
  });
});

describe('normalizeFastAPIRoute', () => {
  it('should preserve FastAPI {id} format', () => {
    const result = normalizeFastAPIRoute('/users/{user_id}');

    expect(result.path).toBe('/users/{user_id}');
    expect(result.dynamicSegments).toEqual(['user_id']);
    expect(result.framework).toBe('fastapi');
  });

  it('should handle multiple dynamic segments', () => {
    const result = normalizeFastAPIRoute('/users/{user_id}/posts/{post_id}');

    expect(result.path).toBe('/users/{user_id}/posts/{post_id}');
    expect(result.dynamicSegments).toEqual(['user_id', 'post_id']);
  });

  it('should handle routes with no dynamic segments', () => {
    const result = normalizeFastAPIRoute('/api/users');

    expect(result.path).toBe('/api/users');
    expect(result.dynamicSegments).toEqual([]);
  });
});

describe('normalizeExpressRoute', () => {
  it('should convert Express :id to {id}', () => {
    const result = normalizeExpressRoute('/users/:id');

    expect(result.path).toBe('/users/{id}');
    expect(result.dynamicSegments).toEqual(['id']);
    expect(result.framework).toBe('express');
  });

  it('should handle multiple dynamic segments', () => {
    const result = normalizeExpressRoute('/users/:userId/posts/:postId');

    expect(result.path).toBe('/users/{userId}/posts/{postId}');
    expect(result.dynamicSegments).toEqual(['userId', 'postId']);
  });

  it('should handle routes with no dynamic segments', () => {
    const result = normalizeExpressRoute('/api/users');

    expect(result.path).toBe('/api/users');
    expect(result.dynamicSegments).toEqual([]);
  });

  it('should handle camelCase and snake_case params', () => {
    const result1 = normalizeExpressRoute('/users/:userId');
    expect(result1.path).toBe('/users/{userId}');

    const result2 = normalizeExpressRoute('/users/:user_id');
    expect(result2.path).toBe('/users/{user_id}');
  });
});

describe('normalizeNextJsRoute', () => {
  it('should convert Next.js [id] to {id}', () => {
    const result = normalizeNextJsRoute('/api/users/[id]/route.ts');

    expect(result.path).toBe('/api/users/{id}');
    expect(result.dynamicSegments).toEqual(['id']);
    expect(result.framework).toBe('nextjs');
  });

  it('should remove /route.ts suffix', () => {
    const result = normalizeNextJsRoute('/api/boards/[id]/route.ts');

    expect(result.path).toBe('/api/boards/{id}');
  });

  it('should remove /page.tsx suffix', () => {
    const result = normalizeNextJsRoute('/dashboard/[slug]/page.tsx');

    expect(result.path).toBe('/dashboard/{slug}');
  });

  it('should handle multiple dynamic segments', () => {
    const result = normalizeNextJsRoute('/api/users/[userId]/posts/[postId]/route.ts');

    expect(result.path).toBe('/api/users/{userId}/posts/{postId}');
    expect(result.dynamicSegments).toEqual(['userId', 'postId']);
  });

  it('should handle routes with no dynamic segments', () => {
    const result = normalizeNextJsRoute('/api/users/route.ts');

    expect(result.path).toBe('/api/users');
    expect(result.dynamicSegments).toEqual([]);
  });

  it('should handle different file extensions', () => {
    const result1 = normalizeNextJsRoute('/api/boards/route.js');
    expect(result1.path).toBe('/api/boards');

    const result2 = normalizeNextJsRoute('/api/boards/route.tsx');
    expect(result2.path).toBe('/api/boards');

    const result3 = normalizeNextJsRoute('/api/boards/route.jsx');
    expect(result3.path).toBe('/api/boards');
  });
});

describe('extractDynamicSegments', () => {
  it('should extract single dynamic segment', () => {
    const segments = extractDynamicSegments('/api/users/{id}');
    expect(segments).toEqual(['id']);
  });

  it('should extract multiple dynamic segments', () => {
    const segments = extractDynamicSegments('/api/users/{userId}/posts/{postId}');
    expect(segments).toEqual(['userId', 'postId']);
  });

  it('should return empty array for static paths', () => {
    const segments = extractDynamicSegments('/api/users');
    expect(segments).toEqual([]);
  });

  it('should handle mixed static and dynamic segments', () => {
    const segments = extractDynamicSegments('/api/v1/users/{id}/profile');
    expect(segments).toEqual(['id']);
  });

  it('should handle underscore and camelCase params', () => {
    const segments = extractDynamicSegments('/api/{user_id}/{postId}');
    expect(segments).toEqual(['user_id', 'postId']);
  });
});

describe('normalizeRoutePath (dispatcher)', () => {
  it('should dispatch to Flask normalizer', () => {
    const result = normalizeRoutePath('/users/<int:id>', 'flask');

    expect(result.path).toBe('/users/{id}');
    expect(result.framework).toBe('flask');
  });

  it('should dispatch to FastAPI normalizer', () => {
    const result = normalizeRoutePath('/users/{user_id}', 'fastapi');

    expect(result.path).toBe('/users/{user_id}');
    expect(result.framework).toBe('fastapi');
  });

  it('should dispatch to Express normalizer', () => {
    const result = normalizeRoutePath('/users/:id', 'express');

    expect(result.path).toBe('/users/{id}');
    expect(result.framework).toBe('express');
  });

  it('should dispatch to Next.js normalizer', () => {
    const result = normalizeRoutePath('/api/users/[id]/route.ts', 'nextjs');

    expect(result.path).toBe('/api/users/{id}');
    expect(result.framework).toBe('nextjs');
  });

  it('should handle all frameworks consistently', () => {
    const flask = normalizeRoutePath('/users/<int:id>', 'flask');
    const fastapi = normalizeRoutePath('/users/{id}', 'fastapi');
    const express = normalizeRoutePath('/users/:id', 'express');
    const nextjs = normalizeRoutePath('/api/users/[id]/route.ts', 'nextjs');

    // All should normalize to same format (except Next.js has /api prefix)
    expect(flask.path).toBe('/users/{id}');
    expect(fastapi.path).toBe('/users/{id}');
    expect(express.path).toBe('/users/{id}');
    expect(nextjs.path).toBe('/api/users/{id}');

    // All should have same dynamic segments
    expect(flask.dynamicSegments).toEqual(['id']);
    expect(fastapi.dynamicSegments).toEqual(['id']);
    expect(express.dynamicSegments).toEqual(['id']);
    expect(nextjs.dynamicSegments).toEqual(['id']);
  });
});
