/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Save Frontend Calls Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  saveFrontendCalls,
  generateFrontendCallsOutput,
  countFrontendCalls,
  formatFrontendCallsOutput
} from './saveFrontendCalls.js';
import type { FrontendCall } from '../analyzer/frontend-call-parsers.js';

const TEST_DIR = path.join(process.cwd(), 'test-temp-frontend-calls');

beforeEach(async () => {
  // Create test directory
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  // Clean up test directory
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe('formatFrontendCallsOutput', () => {
  it('should format calls with type grouping', () => {
    const calls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      },
      {
        path: '/api/posts',
        method: 'POST',
        file: 'app.tsx',
        line: 20,
        callType: 'axios',
        confidence: 100
      }
    ];

    const output = formatFrontendCallsOutput(calls, '/project');

    expect(output.totalCalls).toBe(2);
    expect(output.byType.fetch).toHaveLength(1);
    expect(output.byType.axios).toHaveLength(1);
    expect(output.calls).toHaveLength(2);
    expect(output.metadata.projectPath).toBe('/project');
  });

  it('should sort calls by path within each type', () => {
    const calls: FrontendCall[] = [
      {
        path: '/api/posts',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      },
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 20,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const output = formatFrontendCallsOutput(calls, '/project');

    expect(output.byType.fetch![0].path).toBe('/api/posts');
    expect(output.byType.fetch![1].path).toBe('/api/users');
  });

  it('should remove empty type groups', () => {
    const calls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const output = formatFrontendCallsOutput(calls, '/project');

    expect(output.byType.fetch).toBeDefined();
    expect(output.byType.axios).toBeUndefined();
    expect(output.byType.reactQuery).toBeUndefined();
    expect(output.byType.custom).toBeUndefined();
  });

  it('should include all calls in flat array', () => {
    const calls: FrontendCall[] = [
      {
        path: '/api/users',
        method: 'GET',
        file: 'app.tsx',
        line: 10,
        callType: 'fetch',
        confidence: 100
      },
      {
        path: '/api/posts',
        method: 'POST',
        file: 'app.tsx',
        line: 20,
        callType: 'axios',
        confidence: 100
      }
    ];

    const output = formatFrontendCallsOutput(calls, '/project');

    expect(output.calls).toHaveLength(2);
    expect(output.calls[0].path).toBe('/api/posts'); // Sorted
    expect(output.calls[1].path).toBe('/api/users');
  });

  it('should include generation metadata', () => {
    const calls: FrontendCall[] = [];

    const output = formatFrontendCallsOutput(calls, '/my-project');

    expect(output.metadata.generatedAt).toBeDefined();
    expect(output.metadata.projectPath).toBe('/my-project');
    expect(output.metadata.scanVersion).toBe('1.0.0');
  });
});

describe('saveFrontendCalls', () => {
  it('should create .coderef directory if it does not exist', async () => {
    const projectDir = path.join(TEST_DIR, 'test-project');
    await fs.mkdir(projectDir, { recursive: true });

    // Create a simple test file
    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'app.tsx'),
      `fetch('/api/users')`,
      'utf-8'
    );

    await saveFrontendCalls(projectDir);

    const coderefDir = path.join(projectDir, '.coderef');
    const stats = await fs.stat(coderefDir);
    expect(stats.isDirectory()).toBe(true);
  });

  it('should save frontend-calls.json to default location', async () => {
    const projectDir = path.join(TEST_DIR, 'test-project');
    await fs.mkdir(projectDir, { recursive: true });

    // Create test file
    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'app.tsx'),
      `fetch('/api/users')`,
      'utf-8'
    );

    const outputPath = await saveFrontendCalls(projectDir);

    expect(outputPath).toBe(path.join(projectDir, '.coderef', 'frontend-calls.json'));

    const content = await fs.readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);
    expect(data.totalCalls).toBeGreaterThan(0);
  });

  it('should save to custom output path', async () => {
    const projectDir = path.join(TEST_DIR, 'test-project');
    const customOutput = path.join(TEST_DIR, 'custom', 'calls.json');

    await fs.mkdir(projectDir, { recursive: true });

    // Create test file
    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'app.tsx'),
      `fetch('/api/users')`,
      'utf-8'
    );

    const outputPath = await saveFrontendCalls(projectDir, customOutput);

    expect(outputPath).toBe(customOutput);

    const content = await fs.readFile(customOutput, 'utf-8');
    const data = JSON.parse(content);
    expect(data).toBeDefined();
  });

  it('should respect custom extensions', async () => {
    const projectDir = path.join(TEST_DIR, 'test-project');
    await fs.mkdir(projectDir, { recursive: true });

    // Create .ts file
    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'api.ts'),
      `fetch('/api/users')`,
      'utf-8'
    );

    // Create .js file (should be ignored with .ts extension filter)
    await fs.writeFile(
      path.join(srcDir, 'ignored.js'),
      `fetch('/api/ignored')`,
      'utf-8'
    );

    const outputPath = await saveFrontendCalls(projectDir, undefined, ['.ts']);

    const content = await fs.readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);

    // Should only find the .ts file
    expect(data.totalCalls).toBeGreaterThan(0);
    const hasTsFile = data.calls.some((call: any) => call.file.endsWith('.ts'));
    expect(hasTsFile).toBe(true);
  });

  it('should generate valid JSON structure', async () => {
    const projectDir = path.join(TEST_DIR, 'test-project');
    await fs.mkdir(projectDir, { recursive: true });

    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'app.tsx'),
      `
        fetch('/api/users');
        axios.get('/api/posts');
      `,
      'utf-8'
    );

    const outputPath = await saveFrontendCalls(projectDir);

    const content = await fs.readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data).toHaveProperty('totalCalls');
    expect(data).toHaveProperty('byType');
    expect(data).toHaveProperty('calls');
    expect(data).toHaveProperty('metadata');
    expect(data.metadata).toHaveProperty('generatedAt');
    expect(data.metadata).toHaveProperty('projectPath');
    expect(data.metadata).toHaveProperty('scanVersion');
  });
});

describe('generateFrontendCallsOutput', () => {
  it('should return output without saving to file', async () => {
    const projectDir = path.join(TEST_DIR, 'test-project');
    await fs.mkdir(projectDir, { recursive: true });

    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'app.tsx'),
      `fetch('/api/users')`,
      'utf-8'
    );

    const output = await generateFrontendCallsOutput(projectDir);

    expect(output.totalCalls).toBeGreaterThan(0);
    expect(output.metadata.projectPath).toBe(projectDir);

    // Verify file was NOT created
    const defaultPath = path.join(projectDir, '.coderef', 'frontend-calls.json');
    await expect(fs.access(defaultPath)).rejects.toThrow();
  });
});

describe('countFrontendCalls', () => {
  it('should return count without full processing', async () => {
    const projectDir = path.join(TEST_DIR, 'test-project');
    await fs.mkdir(projectDir, { recursive: true });

    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'app.tsx'),
      `
        fetch('/api/users');
        fetch('/api/posts');
      `,
      'utf-8'
    );

    const count = await countFrontendCalls(projectDir);

    expect(count).toBeGreaterThan(0);
  });

  it('should return 0 for empty project', async () => {
    const projectDir = path.join(TEST_DIR, 'empty-project');
    await fs.mkdir(projectDir, { recursive: true });

    const count = await countFrontendCalls(projectDir);

    expect(count).toBe(0);
  });
});

describe('Integration scenarios', () => {
  it('should handle project with multiple API call types', async () => {
    const projectDir = path.join(TEST_DIR, 'multi-type-project');
    await fs.mkdir(projectDir, { recursive: true });

    const srcDir = path.join(projectDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'app.tsx'),
      `
        // Fetch calls
        fetch('/api/users');

        // Axios calls
        axios.get('/api/posts');

        // React Query
        useQuery({ queryKey: ['/api/comments'] });

        // Custom API client
        apiClient.get('/api/settings');
      `,
      'utf-8'
    );

    const output = await generateFrontendCallsOutput(projectDir);

    expect(output.totalCalls).toBeGreaterThan(3);
    expect(output.byType.fetch).toBeDefined();
    expect(output.byType.axios).toBeDefined();
    expect(output.byType.reactQuery).toBeDefined();
    expect(output.byType.custom).toBeDefined();
  });

  it('should handle empty project gracefully', async () => {
    const projectDir = path.join(TEST_DIR, 'empty-project');
    await fs.mkdir(projectDir, { recursive: true });

    const outputPath = await saveFrontendCalls(projectDir);

    const content = await fs.readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.totalCalls).toBe(0);
    expect(data.calls).toEqual([]);
    expect(Object.keys(data.byType)).toHaveLength(0);
  });
});
