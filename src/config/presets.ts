// coderef-core/config/presets.ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration preset for scanning specific framework/project types
 */
export interface ScanPreset {
  /** Human-readable name */
  name: string;
  /** Description of what this preset is for */
  description: string;
  /** Glob patterns to exclude from scanning */
  exclude: string[];
  /** Languages to scan */
  langs: string[];
}

/**
 * Predefined configuration presets for common project types.
 * Enables 30-second setup instead of manual pattern configuration.
 *
 * Usage:
 * ```typescript
 * import { loadPreset } from '@coderef-dashboard/core';
 * const config = loadPreset('react');
 * await scanCurrentElements(dir, config.langs, { exclude: config.exclude });
 * ```
 */
export const SCAN_PRESETS: Record<string, ScanPreset> = {
  react: {
    name: 'React',
    description: 'React projects (CRA, Vite, custom builds)',
    exclude: [
      '**/build/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.cache/**',
      '**/coverage/**'
    ],
    langs: ['ts', 'tsx', 'js', 'jsx']
  },

  nextjs: {
    name: 'Next.js',
    description: 'Next.js applications',
    exclude: [
      '**/.next/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/out/**',
      '**/dist/**',
      '**/coverage/**'
    ],
    langs: ['ts', 'tsx', 'js', 'jsx']
  },

  vue: {
    name: 'Vue',
    description: 'Vue.js applications',
    exclude: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/coverage/**'
    ],
    langs: ['ts', 'tsx', 'js', 'jsx'] // Note: .vue SFC support would need separate parser
  },

  node: {
    name: 'Node.js',
    description: 'Node.js backend applications',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.cache/**'
    ],
    langs: ['ts', 'js']
  },

  python: {
    name: 'Python',
    description: 'Python projects (Django, Flask, FastAPI, etc.)',
    exclude: [
      '**/.venv/**',
      '**/venv/**',
      '**/env/**',
      '**/__pycache__/**',
      '**/.pytest_cache/**',
      '**/dist/**',
      '**/*.egg-info/**',
      '**/build/**',
      '**/.tox/**'
    ],
    langs: ['py']
  },

  go: {
    name: 'Go',
    description: 'Go projects',
    exclude: [
      '**/vendor/**',
      '**/bin/**',
      '**/.go/**',
      '**/dist/**'
    ],
    langs: ['go']
  },

  rust: {
    name: 'Rust',
    description: 'Rust projects',
    exclude: [
      '**/target/**',
      '**/Cargo.lock',
      '**/dist/**'
    ],
    langs: ['rs']
  },

  java: {
    name: 'Java',
    description: 'Java projects (Maven, Gradle)',
    exclude: [
      '**/target/**',
      '**/build/**',
      '**/.gradle/**',
      '**/bin/**',
      '**/out/**',
      '**/.idea/**'
    ],
    langs: ['java']
  },

  monorepo: {
    name: 'Monorepo',
    description: 'Monorepo projects (Nx, Turborepo, Lerna)',
    exclude: [
      '**/packages/*/node_modules/**',
      '**/packages/*/dist/**',
      '**/apps/*/node_modules/**',
      '**/apps/*/.next/**',
      '**/apps/*/dist/**',
      '**/.turbo/**',
      '**/coverage/**'
    ],
    langs: ['ts', 'tsx', 'js', 'jsx']
  }
};

/**
 * Loads a configuration preset by name.
 *
 * @param presetName Name of the preset (e.g., 'react', 'nextjs', 'python')
 * @returns The preset configuration
 * @throws Error if preset name is invalid
 *
 * @example
 * ```typescript
 * const preset = loadPreset('react');
 * console.log(preset.exclude);
 * ```
 */
export function loadPreset(presetName: string): ScanPreset {
  const preset = SCAN_PRESETS[presetName];

  if (!preset) {
    const availablePresets = Object.keys(SCAN_PRESETS).join(', ');
    throw new Error(
      `Unknown preset: "${presetName}". Available presets: ${availablePresets}`
    );
  }

  return preset;
}

/**
 * Auto-detects the appropriate preset(s) based on project files.
 * Checks for framework-specific config files like package.json, pyproject.toml, etc.
 *
 * @param projectDir Absolute path to project directory
 * @returns Array of detected preset names (can be multiple for monorepos)
 *
 * @example
 * ```typescript
 * const presets = detectPreset('/path/to/project');
 * // Returns: ['nextjs', 'monorepo'] for a Next.js monorepo
 * ```
 */
export function detectPreset(projectDir: string): string[] {
  const detectedPresets: string[] = [];

  try {
    // Check for specific framework config files
    const files = fs.readdirSync(projectDir);

    // Next.js
    if (files.some(f => f === 'next.config.js' || f === 'next.config.mjs' || f === 'next.config.ts')) {
      detectedPresets.push('nextjs');
    }

    // Python
    if (files.some(f => f === 'pyproject.toml' || f === 'setup.py' || f === 'requirements.txt')) {
      detectedPresets.push('python');
    }

    // Rust
    if (files.includes('Cargo.toml')) {
      detectedPresets.push('rust');
    }

    // Go
    if (files.includes('go.mod')) {
      detectedPresets.push('go');
    }

    // Java
    if (files.includes('pom.xml') || files.includes('build.gradle')) {
      detectedPresets.push('java');
    }

    // Monorepo
    if (files.some(f => f === 'lerna.json' || f === 'nx.json' || f === 'turbo.json' || f === 'pnpm-workspace.yaml')) {
      detectedPresets.push('monorepo');
    }

    // Vue
    if (files.includes('vue.config.js') || files.includes('nuxt.config.js') || files.includes('nuxt.config.ts')) {
      detectedPresets.push('vue');
    }

    // Fallback: React if package.json exists with React dependency
    if (detectedPresets.length === 0 && files.includes('package.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps.react || deps['@types/react']) {
          detectedPresets.push('react');
        } else {
          // Generic Node.js project
          detectedPresets.push('node');
        }
      } catch {
        // If package.json is malformed, assume Node.js
        detectedPresets.push('node');
      }
    }

    // Ultimate fallback
    if (detectedPresets.length === 0) {
      detectedPresets.push('react'); // Most common default
    }

  } catch (error) {
    // If directory doesn't exist or can't be read, return default
    console.warn(`Could not detect preset for ${projectDir}:`, error);
    detectedPresets.push('react');
  }

  return detectedPresets;
}

/**
 * Merges multiple presets into a single configuration.
 * Combines exclude patterns (deduplicated) and languages.
 *
 * @param presetNames Array of preset names to merge
 * @returns Merged preset configuration
 *
 * @example
 * ```typescript
 * const merged = mergePresets(['react', 'monorepo']);
 * // Result: Combined exclude patterns from both presets
 * ```
 */
export function mergePresets(presetNames: string[]): ScanPreset {
  const presets = presetNames.map(name => loadPreset(name));

  const merged: ScanPreset = {
    name: presetNames.join(' + '),
    description: presets.map(p => p.description).join(', '),
    exclude: [],
    langs: []
  };

  // Deduplicate exclude patterns
  const excludeSet = new Set<string>();
  for (const preset of presets) {
    preset.exclude.forEach(pattern => excludeSet.add(pattern));
  }
  merged.exclude = Array.from(excludeSet);

  // Deduplicate languages
  const langSet = new Set<string>();
  for (const preset of presets) {
    preset.langs.forEach(lang => langSet.add(lang));
  }
  merged.langs = Array.from(langSet);

  return merged;
}

/**
 * Applies a preset to scan options, extending existing exclude patterns.
 *
 * @param presetName Name of the preset to apply
 * @param customExclude Optional additional exclude patterns to merge
 * @returns Scan configuration with preset applied
 *
 * @example
 * ```typescript
 * const config = applyPreset('nextjs', ['custom/**']);
 * // Result: Next.js excludes + 'custom/**'
 * ```
 */
export function applyPreset(presetName: string, customExclude: string[] = []): ScanPreset {
  const preset = loadPreset(presetName);

  return {
    ...preset,
    exclude: [...new Set([...preset.exclude, ...customExclude])]
  };
}
