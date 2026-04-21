/**
 * Virtual Environment Exclusion Test
 *
 * Purpose: Verify that scanner excludes virtual environment directories by default
 * Context: Prevents scanning thousands of third-party library files
 *
 * This test validates that:
 * 1. .venv directories are excluded by default
 * 2. venv directories are excluded by default
 * 3. __pycache__ directories are excluded
 * 4. Users can override exclusions if needed
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scanCurrentElements, DEFAULT_EXCLUDE_PATTERNS } from '../src/scanner/scanner.js';
import type { ScanOptions } from '../src/types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Virtual Environment Exclusion', () => {
  const testDir = join(__dirname, '.test-venv-fixtures');
  const srcDir = join(testDir, 'src');
  const venvDir = join(testDir, '.venv');
  const venvLibDir = join(venvDir, 'lib');
  const pycacheDir = join(testDir, '__pycache__');

  beforeAll(async () => {
    // Create test structure
    await mkdir(srcDir, { recursive: true });
    await mkdir(venvLibDir, { recursive: true });
    await mkdir(pycacheDir, { recursive: true });

    // Create actual source file (should be scanned)
    await writeFile(join(srcDir, 'app.py'), `
# Real application code
def main():
    print("Hello, world!")

class Application:
    def run(self):
        main()
    `.trim());

    // Create virtual environment files (should be excluded)
    await writeFile(join(venvLibDir, 'requests.py'), `
# Third-party library - should NOT be scanned
def get(url):
    return HTTPResponse()

class HTTPResponse:
    def json(self):
        return {}
    `.trim());

    // Create __pycache__ file (should be excluded)
    await writeFile(join(pycacheDir, 'app.cpython-39.pyc'), 'binary data here');

    // Create another venv variant
    const venvDir2 = join(testDir, 'venv');
    await mkdir(join(venvDir2, 'lib'), { recursive: true });
    await writeFile(join(venvDir2, 'lib', 'django.py'), `
def wsgi():
    pass
    `.trim());
  });

  afterAll(async () => {
    // Clean up test fixtures
    await rm(testDir, { recursive: true, force: true });
  });

  it('should exclude .venv directories by default', async () => {
    const elements = await scanCurrentElements(testDir, 'py', {
      verbose: false // Enable to debug
    });

    // Debug: log all file paths
    // console.log('All elements found:', elements.map(e => e.file));

    // Should find elements in src/app.py
    const appElements = elements.filter(e => e.file.includes('src'));
    expect(appElements.length).toBeGreaterThan(0);

    // Should NOT find elements in .venv
    const venvElements = elements.filter(e => e.file.includes('.venv'));
    expect(venvElements.length).toBe(0);

    // Should NOT find elements in venv (but not .venv)
    // Use path separators to match directory names correctly
    const venvElements2 = elements.filter(e =>
      (e.file.includes('/venv/') || e.file.includes('\\venv\\')) &&
      !e.file.includes('.venv')
    );
    expect(venvElements2.length).toBe(0);
  });

  it('should have DEFAULT_EXCLUDE_PATTERNS constant', () => {
    expect(DEFAULT_EXCLUDE_PATTERNS).toBeDefined();
    expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/.venv/**');
    expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/venv/**');
    expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/__pycache__/**');
    expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/node_modules/**');
    expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/.git/**');
  });

  it('should exclude multiple virtual environment directories', async () => {
    const elements = await scanCurrentElements(testDir, 'py');

    // Count elements in actual source files
    const sourceElements = elements.filter(e => e.file.includes('src'));

    // Count elements in any virtual environment
    const venvElements = elements.filter(e =>
      e.file.includes('.venv') ||
      e.file.includes('/venv/') ||
      e.file.includes('\\venv\\') ||
      e.file.includes('__pycache__')
    );

    expect(sourceElements.length).toBeGreaterThan(0);
    expect(venvElements.length).toBe(0);
  });

  it('should allow users to override exclusions', async () => {
    // Explicitly include .venv by passing empty exclude list
    const elements = await scanCurrentElements(testDir, 'py', {
      exclude: [] // Override default exclusions
    });

    // Now .venv should be scanned
    const venvElements = elements.filter(e => e.file.includes('.venv'));
    expect(venvElements.length).toBeGreaterThan(0);
  });

  it('should exclude build outputs (.next, .nuxt)', async () => {
    // Create .next directory
    const nextDir = join(testDir, '.next');
    await mkdir(join(nextDir, 'server'), { recursive: true });
    await writeFile(join(nextDir, 'server', 'pages.js'), `
export default function Page() {}
    `.trim());

    const elements = await scanCurrentElements(testDir, 'js');

    const nextElements = elements.filter(e => e.file.includes('.next'));
    expect(nextElements.length).toBe(0);

    // Clean up
    await rm(nextDir, { recursive: true, force: true });
  });

  it('should report accurate element count from real source only', async () => {
    const elements = await scanCurrentElements(testDir, 'py');

    // Should find 2 functions + 1 class from src/app.py
    expect(elements.length).toBe(3);

    // Verify element names
    const elementNames = elements.map(e => e.name);
    expect(elementNames).toContain('main');
    expect(elementNames).toContain('Application');
    expect(elementNames).toContain('run');

    // Should NOT contain third-party library names
    expect(elementNames).not.toContain('get');
    expect(elementNames).not.toContain('HTTPResponse');
    expect(elementNames).not.toContain('wsgi');
  });
});
