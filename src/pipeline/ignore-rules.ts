/**
 * @coderef-semantic: 1.0.0
 * @exports loadIgnorePatterns, shouldIgnorePath
 * @used_by src/cli/detect-languages.ts, src/pipeline/orchestrator.ts
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports loadIgnorePatterns, shouldIgnorePath
 * @used_by src/cli/detect-languages.ts, src/pipeline/orchestrator.ts
 */



import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';

export const DEFAULT_PIPELINE_IGNORE_PATTERNS = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'coverage/',
  '__pycache__/',
  '.pytest_cache/',
  '.mypy_cache/',
  '.ruff_cache/',
  '.tox/',
  '.venv/',
  'venv/',
  'env/',
  'target/',
  'out/',
  '.next/',
  '.nuxt/',
  '.cache/',
  '.turbo/',
  '.parcel-cache/',
  '.svelte-kit/',
  // Minified/hashed build artifacts (workbox, webpack chunks, service workers)
  '**/*.min.js',
  '**/workbox-*.js',
  '**/*-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f].js',
] as const;

function normalizePattern(pattern: string): string | null {
  const trimmed = pattern.trim().replace(/\\/g, '/');
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  return trimmed;
}

export async function loadIgnorePatterns(
  projectPath: string,
  ignoreFile: string | false | undefined,
  additionalPatterns: string[] | undefined
): Promise<string[]> {
  const patterns: string[] = [...DEFAULT_PIPELINE_IGNORE_PATTERNS];

  if (ignoreFile !== false) {
    const ignorePath = ignoreFile
      ? path.isAbsolute(ignoreFile)
        ? ignoreFile
        : path.join(projectPath, ignoreFile)
      : path.join(projectPath, '.coderefignore');

    try {
      const raw = await fs.readFile(ignorePath, 'utf-8');
      for (const line of raw.split(/\r?\n/)) {
        const pattern = normalizePattern(line);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    } catch {
      // Missing ignore file is expected; continue with defaults only.
    }
  }

  for (const pattern of additionalPatterns ?? []) {
    const normalized = normalizePattern(pattern);
    if (normalized) {
      patterns.push(normalized);
    }
  }

  return patterns;
}

function buildCandidates(rootPath: string, entryPath: string, entryName: string, isDirectory: boolean): string[] {
  const relativePath = path.relative(rootPath, entryPath).replace(/\\/g, '/');
  const normalizedName = entryName.replace(/\\/g, '/');
  const suffix = isDirectory ? '/' : '';

  return Array.from(new Set([
    relativePath,
    `${relativePath}${suffix}`,
    normalizedName,
    `${normalizedName}${suffix}`,
    `./${relativePath}`,
    `./${relativePath}${suffix}`,
  ]));
}

export function shouldIgnorePath(
  rootPath: string,
  entryPath: string,
  entryName: string,
  isDirectory: boolean,
  patterns: string[]
): boolean {
  const candidates = buildCandidates(rootPath, entryPath, entryName, isDirectory);

  for (const rawPattern of patterns) {
    const pattern = normalizePattern(rawPattern);
    if (!pattern) {
      continue;
    }

    for (const candidate of candidates) {
      if (minimatch(candidate, pattern, { dot: true })) {
        return true;
      }
    }
  }

  return false;
}
