/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability mcp-server-build-if-missing-test
 */

/**
 * coderef-mcp-server build-if-missing tests
 * (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P4).
 *
 * Unlike mcp-server.test.ts (which pre-writes a fixture .coderef/), these drive
 * buildToolHandlers against a REAL temp repo with NO .coderef/ — proving the
 * server builds the index on demand by spawning the populate CLI in-process
 * (ADJ-02), then rebuilds when a source file goes stale, and returns a clear
 * hint (never a hang) when it cannot/should not auto-build.
 *
 * These spawn the real dist/ populate bin, so they are slower than the fixture
 * suite and live in their own file. They require `npm run build` to have run.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildToolHandlers } from '../src/cli/coderef-mcp-server.js';

const created: string[] = [];

function makeRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-mcp-bim-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  }
  return dir;
}

afterEach(() => {
  while (created.length) {
    const d = created.pop()!;
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

describe('build-if-missing', () => {
  it('builds .coderef/ on the first tool call when it is absent', () => {
    const dir = makeRepo({
      'src/a.ts': 'export function foo() { return bar(); }\nexport function bar() { return 1; }\n',
    });
    expect(fs.existsSync(path.join(dir, '.coderef', 'graph.json'))).toBe(false);

    const handlers = buildToolHandlers(dir);
    // First call against an absent index → triggers the in-process build.
    const summary = handlers.codebase_summary() as any;

    // The artifacts now exist and the tool answered from them.
    expect(fs.existsSync(path.join(dir, '.coderef', 'graph.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '.coderef', 'index.json'))).toBe(true);
    expect(summary.error).toBeUndefined();
    expect(summary.total_elements).toBeGreaterThanOrEqual(2); // foo + bar
  }, 60_000);

  it('answers a real query (find_element) after an on-demand build', () => {
    const dir = makeRepo({
      'src/widget.ts': 'export function makeWidget() { return 42; }\n',
    });
    const handlers = buildToolHandlers(dir);
    const r = handlers.find_element({ query: 'makeWidget' }) as any;
    expect(r.error).toBeUndefined();
    expect(r.total).toBeGreaterThanOrEqual(1);
    expect(r.elements.some((e: any) => e.name === 'makeWidget')).toBe(true);
  }, 60_000);

  it('rebuilds when a source file becomes newer than graph.json (staleness)', () => {
    const dir = makeRepo({
      'src/a.ts': 'export function only() { return 1; }\n',
    });
    const handlers = buildToolHandlers(dir);
    // Build once.
    const first = handlers.find_element({ query: 'only' }) as any;
    expect(first.elements.some((e: any) => e.name === 'only')).toBe(true);
    expect(handlers.find_element({ query: 'secondFn' }) as any).toBeTruthy();
    const before = (handlers.find_element({ query: 'secondFn' }) as any).total;
    expect(before).toBe(0); // secondFn does not exist yet

    // Add a new symbol and make the file newer than graph.json.
    const graphMtime = fs.statSync(path.join(dir, '.coderef', 'graph.json')).mtimeMs;
    fs.writeFileSync(
      path.join(dir, 'src', 'a.ts'),
      'export function only() { return 1; }\nexport function secondFn() { return 2; }\n',
    );
    // Force mtime strictly newer than graph.json (fs resolution can tie).
    const future = new Date(graphMtime + 5000);
    fs.utimesSync(path.join(dir, 'src', 'a.ts'), future, future);

    // Next call detects staleness and rebuilds; secondFn now resolves.
    const after = handlers.find_element({ query: 'secondFn' }) as any;
    expect(after.total).toBeGreaterThanOrEqual(1);
    expect(after.elements.some((e: any) => e.name === 'secondFn')).toBe(true);
  }, 90_000);

  it('serves a pre-built index without rebuilding when fresh', () => {
    const dir = makeRepo({
      'src/a.ts': 'export function alreadyHere() { return 1; }\n',
    });
    const handlers = buildToolHandlers(dir);
    handlers.find_element({ query: 'alreadyHere' }); // build once
    const graphMtime1 = fs.statSync(path.join(dir, '.coderef', 'graph.json')).mtimeMs;
    // A second call with no source change must NOT rebuild (mtime unchanged).
    handlers.find_element({ query: 'alreadyHere' });
    const graphMtime2 = fs.statSync(path.join(dir, '.coderef', 'graph.json')).mtimeMs;
    expect(graphMtime2).toBe(graphMtime1);
  }, 60_000);
});
