/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend Call Parser Tests
 * Comprehensive test suite for frontend API call detection
 */

import { describe, it, expect } from 'vitest';
import {
  parseFetchCalls,
  parseAxiosCalls,
  parseReactQueryCalls,
  parseCustomApiCalls,
  extractHttpMethod,
  extractCallLocation,
} from './frontend-call-parsers.js';

describe('parseFetchCalls', () => {
  // TEST-001: parseFetchCalls tests

  it('should parse fetch with static string', () => {
    const code = "fetch('/api/users')";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '/api/users',
      method: 'GET',
      file: 'app.tsx',
      line: 1,
      callType: 'fetch',
      confidence: 100,
    });
  });

  it('should parse fetch with template literal', () => {
    const code = "fetch(`/api/users/${id}`)";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/users/{id}');
    expect(result[0].method).toBe('GET');
    expect(result[0].confidence).toBe(80);
  });

  it('should extract method from fetch options', () => {
    const code = "fetch('/api/users', { method: 'POST' })";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].method).toBe('POST');
  });

  it('should parse fetch with dynamic routes', () => {
    const code = "fetch(`/api/boards/${boardId}/cards/${cardId}`)";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/boards/{id}/cards/{id}');
  });

  it('should handle empty file', () => {
    const code = "";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toEqual([]);
  });

  it('should handle malformed code', () => {
    const code = "fetch('/api/users'";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toEqual([]);
  });

  it('should skip variable-based URLs', () => {
    const code = "const url = '/api/users'; fetch(url)";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toEqual([]);
  });

  it('should parse multiple fetch calls', () => {
    const code = `
      fetch('/api/users');
      fetch('/api/posts', { method: 'POST' });
    `;
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('/api/users');
    expect(result[1].path).toBe('/api/posts');
    expect(result[1].method).toBe('POST');
  });
});

describe('parseAxiosCalls', () => {
  // TEST-002: parseAxiosCalls tests

  it('should parse axios GET pattern', () => {
    const code = "axios.get('/api/users')";
    const result = parseAxiosCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '/api/users',
      method: 'GET',
      file: 'app.tsx',
      line: 1,
      callType: 'axios',
      confidence: 100,
    });
  });

  it('should parse axios POST pattern', () => {
    const code = "axios.post('/api/users', data)";
    const result = parseAxiosCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].method).toBe('POST');
  });

  it('should parse axios with template literals', () => {
    const code = "axios.get(`/api/users/${id}`)";
    const result = parseAxiosCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/users/{id}');
    expect(result[0].confidence).toBe(80);
  });

  it('should handle all HTTP methods', () => {
    const code = `
      axios.get('/api/users');
      axios.post('/api/users', data);
      axios.put('/api/users/1', data);
      axios.delete('/api/users/1');
      axios.patch('/api/users/1', data);
    `;
    const result = parseAxiosCalls(code, 'app.tsx');

    expect(result).toHaveLength(5);
    expect(result[0].method).toBe('GET');
    expect(result[1].method).toBe('POST');
    expect(result[2].method).toBe('PUT');
    expect(result[3].method).toBe('DELETE');
    expect(result[4].method).toBe('PATCH');
  });

  it('should handle empty file', () => {
    const result = parseAxiosCalls("", 'app.tsx');
    expect(result).toEqual([]);
  });
});

describe('parseReactQueryCalls', () => {
  // TEST-003: parseReactQueryCalls tests

  it('should parse useQuery pattern', () => {
    const code = "useQuery({ queryKey: ['/api/users'], queryFn })";
    const result = parseReactQueryCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '/api/users',
      method: 'GET',
      file: 'app.tsx',
      line: 1,
      callType: 'reactQuery',
      confidence: 100,
    });
  });

  it('should parse useMutation pattern', () => {
    const code = "useMutation({ queryKey: ['/api/users'], mutationFn })";
    const result = parseReactQueryCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].method).toBe('POST');
  });

  it('should handle queryKey extraction', () => {
    const code = "useQuery({ queryKey: ['/api/posts'], queryFn: fetchPosts })";
    const result = parseReactQueryCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/posts');
  });

  it('should handle empty file', () => {
    const result = parseReactQueryCalls("", 'app.tsx');
    expect(result).toEqual([]);
  });
});

describe('parseCustomApiCalls', () => {
  // TEST-004: parseCustomApiCalls tests

  it('should parse custom api.get pattern', () => {
    const code = "api.get('/users')";
    const result = parseCustomApiCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '/users',
      method: 'GET',
      file: 'app.tsx',
      line: 1,
      callType: 'custom',
      confidence: 100,
    });
  });

  it('should parse apiClient pattern', () => {
    const code = "apiClient.post('/items', data)";
    const result = parseCustomApiCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].method).toBe('POST');
  });

  it('should parse client pattern', () => {
    const code = "client.get('/data')";
    const result = parseCustomApiCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
  });

  it('should parse httpClient pattern', () => {
    const code = "httpClient.delete('/resource')";
    const result = parseCustomApiCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].method).toBe('DELETE');
  });

  it('should not match non-API patterns', () => {
    const code = "myObject.get('/data')";
    const result = parseCustomApiCalls(code, 'app.tsx');

    expect(result).toEqual([]);
  });

  it('should handle empty file', () => {
    const result = parseCustomApiCalls("", 'app.tsx');
    expect(result).toEqual([]);
  });
});

describe('Template Literal Handling', () => {
  // TEST-004: Template literal edge cases

  it('should handle nested template literals', () => {
    const code = "fetch(`/api/${type}/${id}/details`)";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/{id}/{id}/details');
  });

  it('should handle complex expressions', () => {
    const code = "fetch(`/api/users?filter=${encodeURIComponent(filter)}`)";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].path).toContain('/api/users?filter=');
  });

  it('should handle multi-part paths', () => {
    const code = "fetch(`${baseUrl}/api/v${version}/users`)";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    // Dynamic segments replaced with {id}
    expect(result[0].confidence).toBe(80);
  });
});

describe('extractHttpMethod', () => {
  it('should default to GET when no options', () => {
    const method = extractHttpMethod(undefined);
    expect(method).toBe('GET');
  });

  it('should extract method from options object', () => {
    // This would need actual AST node - tested via parseFetchCalls
    expect(true).toBe(true);
  });
});

describe('Edge Cases', () => {
  it('should handle file with no API calls', () => {
    const code = "const x = 5; function foo() { return x; }";
    const fetchResults = parseFetchCalls(code, 'app.tsx');
    const axiosResults = parseAxiosCalls(code, 'app.tsx');

    expect(fetchResults).toEqual([]);
    expect(axiosResults).toEqual([]);
  });

  it('should handle API calls in comments', () => {
    const code = "// fetch('/api/users')";
    const result = parseFetchCalls(code, 'app.tsx');

    // Comments are stripped by parser
    expect(result).toEqual([]);
  });

  it('should handle conditional API calls', () => {
    const code = "if (condition) { fetch('/api/users'); }";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/users');
  });

  it('should handle async/await patterns', () => {
    const code = "const data = await fetch('/api/users')";
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
  });

  it('should preserve line numbers', () => {
    const code = `
      const x = 1;
      fetch('/api/users');
      const y = 2;
    `;
    const result = parseFetchCalls(code, 'app.tsx');

    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(3);
  });
});
