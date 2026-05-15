#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * @exports main
 */


/**
 * @coderef-semantic: 1.0.0
 * @exports: [main]
 */

"""
Iteration 1: Filter test files from critical functions list

Root cause: findCriticalFunctions() includes all functions/methods regardless
of whether they're from test files. This causes test helpers like make_state
to be surfaced as "critical functions".

Fix: Add filter to exclude functions from test files before ranking.
Test file patterns: /tests/, /test_, _test.py, .test.
"""
import sys
from pathlib import Path

def main():
    # Path to context-generator.ts
    generator_path = Path(__file__).parent.parent.parent.parent / "src" / "pipeline" / "generators" / "context-generator.ts"

    print(f"Modifying {generator_path}", file=sys.stderr)

    # Read the file
    with open(generator_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the findCriticalFunctions method
    old_code = """  private findCriticalFunctions(
    elements: ElementData[],
    graph: PipelineState['graph'],
    projectPath: string
  ): ProjectContext['criticalFunctions'] {
    const functions = elements.filter(e => e.type === 'function' || e.type === 'method');
    const dependentCounts = this.buildDependentCounts(elements, graph);"""

    new_code = """  private findCriticalFunctions(
    elements: ElementData[],
    graph: PipelineState['graph'],
    projectPath: string
  ): ProjectContext['criticalFunctions'] {
    // Filter out test files from critical functions list
    const isTestFile = (filePath: string): boolean => {
      return filePath.includes('/tests/') ||
             filePath.includes('/test_') ||
             filePath.endsWith('_test.py') ||
             filePath.includes('.test.') ||
             filePath.includes('.spec.');
    };

    const functions = elements.filter(e =>
      (e.type === 'function' || e.type === 'method') &&
      !isTestFile(e.file)
    );
    const dependentCounts = this.buildDependentCounts(elements, graph);"""

    if old_code not in content:
        print("ERROR: Could not find old findCriticalFunctions method", file=sys.stderr)
        sys.exit(1)

    # Replace the method
    content = content.replace(old_code, new_code)

    # Write back
    with open(generator_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Successfully added test file filter to findCriticalFunctions()", file=sys.stderr)

if __name__ == '__main__':
    main()
