#!/usr/bin/env python3
"""
Iteration 1: Add Python test pattern detection to isTestFile()

Current bug: isTestFile() only detects JS/TS patterns (.test., .spec., __tests__)
Missing: Python patterns (tests/test_*.py, test_*.py, *_test.py)

Fix: Add Python test pattern detection to isTestFile() method
"""
import sys
from pathlib import Path

def main():
    # Path to coverage-generator.ts
    generator_path = Path(__file__).parent.parent.parent.parent / "src" / "pipeline" / "generators" / "coverage-generator.ts"

    print(f"Modifying {generator_path}", file=sys.stderr)

    # Read the file
    with open(generator_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the isTestFile method
    old_method = """  private isTestFile(filePath: string): boolean {
    return filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__');
  }"""

    new_method = """  private isTestFile(filePath: string): boolean {
    // JavaScript/TypeScript patterns
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
      return true;
    }

    // Python patterns
    const fileName = filePath.split('/').pop() || '';
    if (fileName.startsWith('test_') || fileName.endsWith('_test.py')) {
      return true;
    }
    if (filePath.includes('/tests/') && fileName.endsWith('.py')) {
      return true;
    }

    return false;
  }"""

    if old_method not in content:
        print("ERROR: Could not find old isTestFile method", file=sys.stderr)
        sys.exit(1)

    # Replace the method
    content = content.replace(old_method, new_method)

    # Write back
    with open(generator_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Successfully modified isTestFile() method", file=sys.stderr)
    print("Added Python test pattern detection", file=sys.stderr)

if __name__ == '__main__':
    main()
