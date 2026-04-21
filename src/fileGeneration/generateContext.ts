/**
 * Generate Context - Create AI-readable project context
 *
 * Outputs:
 * - .coderef/context.json (structured data)
 * - .coderef/context.md (human-readable summary)
 *
 * @module fileGeneration/generateContext
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ElementData } from '../types/types.js';

interface ProjectContext {
  version: string;
  generatedAt: string;
  projectPath: string;
  statistics: {
    totalElements: number;
    totalFiles: number;
    elementsByType: Record<string, number>;
    filesByExtension: Record<string, number>;
  };
  topFiles: Array<{ file: string; elementCount: number }>;
}

/**
 * Generate project context files (JSON + Markdown)
 *
 * @param projectPath - Absolute path to project root
 * @param elements - Array of code elements from scan
 * @returns Promise that resolves when files are written
 *
 * @example
 * ```typescript
 * const elements = await scanCurrentElements('./src', ['ts', 'tsx']);
 * await generateContext('./my-project', elements);
 * // Creates: ./my-project/.coderef/context.json
 * //          ./my-project/.coderef/context.md
 * ```
 */
export async function generateContext(
  projectPath: string,
  elements: ElementData[]
): Promise<void> {
  // Analyze elements
  const stats = analyzeElements(elements);

  // Create JSON context
  const context: ProjectContext = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    projectPath,
    statistics: stats,
    topFiles: getTopFiles(elements, 10),
  };

  // Create Markdown summary
  const markdown = formatAsMarkdown(context);

  // Ensure .coderef directory exists
  const coderefDir = path.join(projectPath, '.coderef');
  await fs.mkdir(coderefDir, { recursive: true });

  // Write both files
  const jsonPath = path.join(coderefDir, 'context.json');
  const mdPath = path.join(coderefDir, 'context.md');

  await Promise.all([
    fs.writeFile(jsonPath, JSON.stringify(context, null, 2), 'utf-8'),
    fs.writeFile(mdPath, markdown, 'utf-8'),
  ]);
}

/**
 * Analyze elements to generate statistics
 */
function analyzeElements(elements: ElementData[]) {
  const elementsByType: Record<string, number> = {};
  const filesByExtension: Record<string, number> = {};
  const uniqueFiles = new Set<string>();

  for (const element of elements) {
    // Count by type
    elementsByType[element.type] = (elementsByType[element.type] || 0) + 1;

    // Count unique files
    uniqueFiles.add(element.file);

    // Count by extension
    const ext = path.extname(element.file);
    filesByExtension[ext] = (filesByExtension[ext] || 0) + 1;
  }

  return {
    totalElements: elements.length,
    totalFiles: uniqueFiles.size,
    elementsByType,
    filesByExtension,
  };
}

/**
 * Get top N files by element count
 */
function getTopFiles(elements: ElementData[], limit: number) {
  const fileCounts = new Map<string, number>();

  for (const element of elements) {
    fileCounts.set(element.file, (fileCounts.get(element.file) || 0) + 1);
  }

  return Array.from(fileCounts.entries())
    .map(([file, count]) => ({ file, elementCount: count }))
    .sort((a, b) => b.elementCount - a.elementCount)
    .slice(0, limit);
}

/**
 * Format context as Markdown
 */
function formatAsMarkdown(context: ProjectContext): string {
  const { statistics, topFiles } = context;

  let md = `# CodeRef Project Context\n\n`;
  md += `**Generated:** ${context.generatedAt}\n`;
  md += `**Version:** ${context.version}\n\n`;

  md += `## Project Statistics\n\n`;
  md += `- **Total Elements:** ${statistics.totalElements}\n`;
  md += `- **Total Files:** ${statistics.totalFiles}\n\n`;

  md += `### Elements by Type\n\n`;
  for (const [type, count] of Object.entries(statistics.elementsByType)) {
    md += `- **${type}:** ${count}\n`;
  }

  md += `\n### Files by Extension\n\n`;
  for (const [ext, count] of Object.entries(statistics.filesByExtension)) {
    md += `- **${ext || '(no extension)'}:** ${count}\n`;
  }

  md += `\n## Top Files by Element Count\n\n`;
  for (const { file, elementCount } of topFiles) {
    md += `- \`${file}\` (${elementCount} elements)\n`;
  }

  return md;
}
