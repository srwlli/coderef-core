#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * */


"""
Iteration 1: Filter test files from testGaps detection

Root cause: pattern-generator.ts detectTestGaps() processes all elements
without filtering out functions that are themselves from test files.

Fix: Add isTestFile() helper and filter elements before processing,
similar to Loop 5's context-generator.ts fix.
"""
import sys
from pathlib import Path

def main():
    # Path to pattern-generator.ts
    # From: autoresearch/scanner-quality/06-test-gap-precision/apply_iteration_1.py
    # To: src/pipeline/generators/pattern-generator.ts
    # Up 4 levels to coderef-core root
    generator_path = Path(__file__).parent.parent.parent.parent / "src" / "pipeline" / "generators" / "pattern-generator.ts"

    print(f"Modifying {generator_path}", file=sys.stderr)

    # Read the file
    with open(generator_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the detectTestGaps method
    old_code = """  /**
   * Detect test coverage gaps
   */
  private detectTestGaps(
    elements: ElementData[],
    files: Map<string, string[]>,
    projectPath: string
  ): PatternReport['testGaps'] {
    const testFiles = new Set<string>();

    // Collect all test files
    for (const filePaths of files.values()) {
      filePaths.forEach(filePath => {
        if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
          testFiles.add(filePath);
        }
      });
    }

    // Find functions without corresponding tests
    return elements
      .filter(elem => elem.type === 'function' && elem.exported === true)
      .filter(elem => {
        const fileName = path.basename(elem.file, path.extname(elem.file));
        const hasTest = Array.from(testFiles).some(testFile => testFile.includes(fileName));
        return !hasTest;
      })
      .map(elem => ({
        name: elem.name,
        file: path.relative(projectPath, elem.file).replace(/\\/g, '/'),
        reason: 'No corresponding test file found',
      }));
  }"""

    new_code = """  /**
   * Detect test coverage gaps
   */
  private detectTestGaps(
    elements: ElementData[],
    files: Map<string, string[]>,
    projectPath: string
  ): PatternReport['testGaps'] {
    // Helper to check if a file is a test file
    const isTestFile = (filePath: string): boolean => {
      const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
      return relativePath.includes('/tests/') ||
             relativePath.startsWith('tests/') ||
             relativePath.includes('/test_') ||
             relativePath.startsWith('test_') ||
             relativePath.endsWith('_test.py') ||
             relativePath.includes('.test.') ||
             relativePath.includes('.spec.') ||
             relativePath.includes('__tests__');
    };

    const testFiles = new Set<string>();

    // Collect all test files
    for (const filePaths of files.values()) {
      filePaths.forEach(filePath => {
        if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
          testFiles.add(filePath);
        }
      });
    }

    // Find functions without corresponding tests
    // Filter out test files themselves to avoid false positives
    return elements
      .filter(elem => elem.type === 'function' && elem.exported === true)
      .filter(elem => !isTestFile(elem.file))  // Exclude test files
      .filter(elem => {
        const fileName = path.basename(elem.file, path.extname(elem.file));
        const hasTest = Array.from(testFiles).some(testFile => testFile.includes(fileName));
        return !hasTest;
      })
      .map(elem => ({
        name: elem.name,
        file: path.relative(projectPath, elem.file).replace(/\\/g, '/'),
        reason: 'No corresponding test file found',
      }));
  }"""

    if old_code not in content:
        print("ERROR: Could not find old detectTestGaps code", file=sys.stderr)
        sys.exit(1)

    # Replace the code
    content = content.replace(old_code, new_code)

    # Write back
    with open(generator_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Successfully added test file filtering to detectTestGaps()", file=sys.stderr)

if __name__ == '__main__':
    main()
