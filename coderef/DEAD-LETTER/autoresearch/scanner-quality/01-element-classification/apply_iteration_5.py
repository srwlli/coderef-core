#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * */


"""
Iteration 5: Fix AST extractor to prevent double traversal of class bodies

The bug: After handling class_definition and traversing its body with parentScope,
the code ALSO recursively traverses all children without scope, causing duplicates.

Fix: Return early after handling class_definition to avoid double traversal.
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

    # Find the Python extraction section
    # We need to add a return statement after traversing class body
    old_code = """      // Class definitions: class Foo:
      if (node.type === 'class_definition') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          elements.push({
            type: 'class',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            exported: !name.startsWith('_'),
          });

          // Traverse class body for methods
          const body = node.childForFieldName('body');
          if (body) {
            traverse(body, name);
          }
        }
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child, parentScope);
      }"""

    new_code = """      // Class definitions: class Foo:
      if (node.type === 'class_definition') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          elements.push({
            type: 'class',
            name,
            file: filePath,
            line: nameNode.startPosition.row + 1,
            exported: !name.startsWith('_'),
          });

          // Traverse class body for methods
          const body = node.childForFieldName('body');
          if (body) {
            traverse(body, name);
          }
        }
        return; // Don't double-traverse class children
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child, parentScope);
      }"""

    if old_code not in content:
        print("ERROR: Could not find Python class extraction code", file=sys.stderr)
        sys.exit(1)

    # Replace the code
    content = content.replace(old_code, new_code)

    # Write back
    with open(extractor_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Successfully modified extractPythonElements", file=sys.stderr)
    print("Added return statement after class body traversal", file=sys.stderr)

if __name__ == '__main__':
    main()
