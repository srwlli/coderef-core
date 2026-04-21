/**
 * Generate Diagrams - Create visual dependency diagrams
 *
 * Outputs:
 * - .coderef/diagrams/dependencies.mmd (Mermaid format)
 * - .coderef/diagrams/dependencies.dot (Graphviz DOT format)
 * - .coderef/diagrams/calls.mmd (Mermaid format)
 * - .coderef/diagrams/imports.mmd (Mermaid format)
 *
 * @module fileGeneration/generateDiagrams
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData } from '../types/types.js';

/**
 * Generate diagram files in Mermaid and Graphviz formats
 *
 * @param projectPath - Absolute path to project root
 * @param elements - Array of code elements from scan
 * @returns Promise that resolves when files are written
 */
export async function generateDiagrams(
  projectPath: string,
  elements: ElementData[]
): Promise<void> {
  // Build file-level dependency map
  const fileDeps = buildFileDependencies(elements);

  // Build function call map
  const callDeps = buildCallDependencies(elements);

  // Generate all diagram formats
  const dependenciesMmd = generateDependenciesMermaid(fileDeps);
  const dependenciesDot = generateDependenciesDot(fileDeps);
  const callsMmd = generateCallsMermaid(callDeps);
  const importsMmd = generateImportsMermaid(fileDeps);

  // Ensure diagrams directory exists
  const diagramsDir = path.join(projectPath, '.coderef', 'diagrams');
  await fs.mkdir(diagramsDir, { recursive: true });

  // Write all diagrams
  await Promise.all([
    fs.writeFile(path.join(diagramsDir, 'dependencies.mmd'), dependenciesMmd, 'utf-8'),
    fs.writeFile(path.join(diagramsDir, 'dependencies.dot'), dependenciesDot, 'utf-8'),
    fs.writeFile(path.join(diagramsDir, 'calls.mmd'), callsMmd, 'utf-8'),
    fs.writeFile(path.join(diagramsDir, 'imports.mmd'), importsMmd, 'utf-8'),
  ]);
}

/**
 * Build file-level dependency map (which files import which)
 */
function buildFileDependencies(elements: ElementData[]): Map<string, Set<string>> {
  const deps = new Map<string, Set<string>>();

  // Get unique files
  const files = new Set(elements.map(el => el.file));

  // Initialize all files
  for (const file of files) {
    if (!deps.has(file)) {
      deps.set(file, new Set());
    }
  }

  // Note: We don't have actual import data from the scanner yet,
  // so we'll use file co-occurrence as a proxy for dependencies
  // In a real implementation, you'd parse import statements

  return deps;
}

/**
 * Build function call dependency map
 */
function buildCallDependencies(elements: ElementData[]): Map<string, Set<string>> {
  const deps = new Map<string, Set<string>>();

  for (const element of elements) {
    if (element.calls && element.calls.length > 0) {
      const key = `${element.file}:${element.name}`;
      if (!deps.has(key)) {
        deps.set(key, new Set());
      }

      for (const calledFunc of element.calls) {
        deps.get(key)!.add(calledFunc);
      }
    }
  }

  return deps;
}

/**
 * Generate Mermaid dependency diagram
 */
function generateDependenciesMermaid(deps: Map<string, Set<string>>): string {
  let mermaid = 'graph TD\n';

  // Add file nodes and edges
  let nodeId = 0;
  const fileToId = new Map<string, string>();

  // Create nodes
  for (const file of deps.keys()) {
    const id = `F${nodeId++}`;
    fileToId.set(file, id);
    const label = path.basename(file);
    mermaid += `  ${id}["${label}"]\n`;
  }

  // Create edges
  for (const [file, dependencies] of deps.entries()) {
    const sourceId = fileToId.get(file);
    for (const dep of dependencies) {
      const targetId = fileToId.get(dep);
      if (sourceId && targetId) {
        mermaid += `  ${sourceId} --> ${targetId}\n`;
      }
    }
  }

  return mermaid;
}

/**
 * Generate Graphviz DOT dependency diagram
 */
function generateDependenciesDot(deps: Map<string, Set<string>>): string {
  let dot = 'digraph Dependencies {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box, style=rounded];\n\n';

  // Add file nodes
  let nodeId = 0;
  const fileToId = new Map<string, string>();

  for (const file of deps.keys()) {
    const id = `n${nodeId++}`;
    fileToId.set(file, id);
    const label = path.basename(file);
    dot += `  ${id} [label="${label}"];\n`;
  }

  dot += '\n';

  // Add edges
  for (const [file, dependencies] of deps.entries()) {
    const sourceId = fileToId.get(file);
    for (const dep of dependencies) {
      const targetId = fileToId.get(dep);
      if (sourceId && targetId) {
        dot += `  ${sourceId} -> ${targetId};\n`;
      }
    }
  }

  dot += '}\n';
  return dot;
}

/**
 * Generate Mermaid function call diagram
 */
function generateCallsMermaid(calls: Map<string, Set<string>>): string {
  let mermaid = 'graph TD\n';

  let nodeId = 0;
  const funcToId = new Map<string, string>();

  // Limit to first 50 functions to avoid huge diagrams
  const entries = Array.from(calls.entries()).slice(0, 50);

  // Create nodes
  for (const [func] of entries) {
    const id = `C${nodeId++}`;
    funcToId.set(func, id);
    const [, name] = func.split(':');
    mermaid += `  ${id}["${name}"]\n`;
  }

  // Create edges
  for (const [func, calledFuncs] of entries) {
    const sourceId = funcToId.get(func);
    for (const called of calledFuncs) {
      // Try to find matching function in our limited set
      for (const [existingFunc] of entries) {
        if (existingFunc.includes(called)) {
          const targetId = funcToId.get(existingFunc);
          if (sourceId && targetId && sourceId !== targetId) {
            mermaid += `  ${sourceId} --> ${targetId}\n`;
          }
          break;
        }
      }
    }
  }

  return mermaid;
}

/**
 * Generate Mermaid import diagram (same as dependencies for now)
 */
function generateImportsMermaid(deps: Map<string, Set<string>>): string {
  let mermaid = 'graph LR\n';

  let nodeId = 0;
  const fileToId = new Map<string, string>();

  // Create nodes (limit to avoid huge diagrams)
  const files = Array.from(deps.keys()).slice(0, 30);

  for (const file of files) {
    const id = `I${nodeId++}`;
    fileToId.set(file, id);
    const label = path.basename(file);
    mermaid += `  ${id}["${label}"]\n`;
  }

  // Create edges
  for (const file of files) {
    const dependencies = deps.get(file);
    if (!dependencies) continue;

    const sourceId = fileToId.get(file);
    for (const dep of dependencies) {
      const targetId = fileToId.get(dep);
      if (sourceId && targetId) {
        mermaid += `  ${sourceId} -.->|imports| ${targetId}\n`;
      }
    }
  }

  return mermaid;
}
