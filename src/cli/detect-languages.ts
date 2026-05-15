/**
 * @coderef-semantic: 1.0.0
 * @exports SupportedCliLanguage, formatSupportedLanguages, validateCliLanguages, detectProjectLanguages
 * @used_by src/cli/detect-languages-cli.ts, src/cli/populate.ts, src/cli/rag-index.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { loadIgnorePatterns, shouldIgnorePath } from '../pipeline/ignore-rules.js';

export const SUPPORTED_CLI_LANGUAGES = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'py',
  'go',
  'rs',
  'java',
  'cpp',
  'c',
] as const;

export type SupportedCliLanguage = (typeof SUPPORTED_CLI_LANGUAGES)[number];

const SUPPORTED_LANGUAGE_SET = new Set<string>(SUPPORTED_CLI_LANGUAGES);

const EXTENSION_TO_CANONICAL_LANGUAGE: Record<string, SupportedCliLanguage> = {
  ts: 'ts',
  tsx: 'tsx',
  js: 'js',
  jsx: 'jsx',
  py: 'py',
  go: 'go',
  rs: 'rs',
  java: 'java',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'c',
  h: 'c',
};

function orderedLanguages(values: Iterable<SupportedCliLanguage>): SupportedCliLanguage[] {
  const found = new Set(values);
  return SUPPORTED_CLI_LANGUAGES.filter(language => found.has(language));
}

export function formatSupportedLanguages(): string {
  return SUPPORTED_CLI_LANGUAGES.join(', ');
}

export function validateCliLanguages(languages?: string[]): SupportedCliLanguage[] | undefined {
  if (!languages || languages.length === 0) {
    return undefined;
  }

  const normalized = languages
    .map(language => language.trim().toLowerCase())
    .filter(Boolean);

  const invalid = normalized.filter(language => !SUPPORTED_LANGUAGE_SET.has(language));
  if (invalid.length > 0) {
    throw new Error(
      `Unsupported language(s): ${invalid.join(', ')}. Supported languages: ${formatSupportedLanguages()}`
    );
  }

  return orderedLanguages(normalized as SupportedCliLanguage[]);
}

function getCanonicalLanguage(fileName: string): SupportedCliLanguage | undefined {
  const normalizedName = fileName.toLowerCase().replace(/\\/g, '/');

  if (normalizedName.endsWith('.c++')) {
    return 'cpp';
  }

  const extension = path.extname(normalizedName).slice(1);
  return EXTENSION_TO_CANONICAL_LANGUAGE[extension];
}

async function scanDirectory(
  rootPath: string,
  currentPath: string,
  ignorePatterns: string[],
  found: Set<SupportedCliLanguage>
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const isDirectory = entry.isDirectory();

    if (shouldIgnorePath(rootPath, fullPath, entry.name, isDirectory, ignorePatterns)) {
      continue;
    }

    if (isDirectory) {
      await scanDirectory(rootPath, fullPath, ignorePatterns, found);
      if (found.size === SUPPORTED_CLI_LANGUAGES.length) {
        return;
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const canonicalLanguage = getCanonicalLanguage(entry.name);
    if (canonicalLanguage) {
      found.add(canonicalLanguage);
      if (found.size === SUPPORTED_CLI_LANGUAGES.length) {
        return;
      }
    }
  }
}

export async function detectProjectLanguages(
  projectPath: string,
  ignoreFile: string | false | undefined = undefined,
  additionalPatterns: string[] | undefined = undefined
): Promise<SupportedCliLanguage[]> {
  const ignorePatterns = await loadIgnorePatterns(projectPath, ignoreFile, additionalPatterns);
  const found = new Set<SupportedCliLanguage>();

  await scanDirectory(projectPath, projectPath, ignorePatterns, found);

  return orderedLanguages(found);
}
