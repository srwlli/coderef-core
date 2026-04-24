/**
 * Scanner File Discovery — extracted from scanner.ts (P2-001)
 *
 * Owns recursive directory walking, extension-based language filtering,
 * tsx→ts / jsx→js remapping, and minimatch-based exclude handling.
 * Pure async module: reads from fs, returns normalized forward-slash
 * file paths.
 *
 * Workorder: WO-SCANNER-MODULE-EXTRACTION-001
 */

import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

export function shouldExcludePath(filePath: string, excludePatterns: string[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const pattern of excludePatterns) {
    if (minimatch(normalizedPath, pattern, { dot: true })) {
      return true;
    }

    const pathParts = normalizedPath.split('/');
    for (let i = 0; i < pathParts.length; i++) {
      const partialPath = pathParts.slice(i).join('/');
      if (minimatch(partialPath, pattern, { dot: true })) {
        return true;
      }
    }
  }

  return false;
}

export async function collectFiles(
  dir: string,
  allLangs: string[],
  exclude: string[],
  recursive: boolean,
  verbose: boolean
): Promise<string[]> {
  const files: string[] = [];
  const resolvedDir = path.resolve(dir);

  try {
    const allEntries = fs.readdirSync(resolvedDir, { withFileTypes: true });

    for (const entry of allEntries) {
      const fullPath = path.join(resolvedDir, entry.name);

      if (entry.isDirectory()) {
        if (shouldExcludePath(fullPath, exclude)) {
          if (verbose) {
            console.log(`Excluding directory: ${fullPath}`);
          }
          continue;
        }

        if (recursive) {
          if (verbose) {
            console.log(`Recursively collecting from directory: ${fullPath}`);
          }
          const subFiles = await collectFiles(fullPath, allLangs, exclude, recursive, verbose);
          files.push(...subFiles);
        }
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).substring(1);

      // tsx/jsx → ts/js language remap
      let currentLang = ext;
      if (ext === 'tsx' && allLangs.includes('ts')) {
        currentLang = 'ts';
      } else if (ext === 'jsx' && allLangs.includes('js')) {
        currentLang = 'js';
      }

      if (!allLangs.includes(currentLang)) continue;

      const normalizedPath = fullPath.replace(/\\/g, '/');

      if (shouldExcludePath(normalizedPath, exclude)) {
        if (verbose) {
          console.log(`Excluding file: ${normalizedPath}`);
        }
        continue;
      }

      files.push(normalizedPath);
      if (verbose) {
        console.log(`Including file: ${normalizedPath} (mapped to language: ${currentLang})`);
      }
    }
  } catch (error) {
    if (verbose) {
      console.error(`Error collecting files from ${dir}:`, error);
    }
  }

  return files;
}
