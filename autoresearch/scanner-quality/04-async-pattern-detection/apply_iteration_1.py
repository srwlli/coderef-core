#!/usr/bin/env python3
"""
Iteration 1: Add async field to Python function elements

Root cause identified: element-extractor.ts line 249 calculates isAsync
but never includes it in the element object (lines 251-258).

Fix: Add 'async: isAsync || undefined' to the element being pushed.
"""
import sys
from pathlib import Path

def main():
    # Path to element-extractor.ts
    extractor_path = Path(__file__).parent.parent.parent.parent / "src" / "pipeline" / "extractors" / "element-extractor.ts"

    print(f"Modifying {extractor_path}", file=sys.stderr)

    # Read the file
    with open(extractor_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the Python function element push
    old_code = """          elements.push({
            type: isMethod ? 'method' : 'function',
            name: isMethod ? `${parentScope}.${name}` : name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            parameters,
            exported: !isMethod && !name.startsWith('_'), // Private if starts with _
          });"""

    new_code = """          elements.push({
            type: isMethod ? 'method' : 'function',
            name: isMethod ? `${parentScope}.${name}` : name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            parameters,
            exported: !isMethod && !name.startsWith('_'), // Private if starts with _
            async: isAsync || undefined,
          });"""

    if old_code not in content:
        print("ERROR: Could not find old element.push code", file=sys.stderr)
        sys.exit(1)

    # Replace the code
    content = content.replace(old_code, new_code)

    # Write back
    with open(extractor_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Successfully added async field to Python function elements", file=sys.stderr)

if __name__ == '__main__':
    main()
