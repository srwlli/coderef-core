# @coderef/core Scanner API Contract

**Version:** 2.0.0
**Purpose:** API contract for consuming @coderef/core scanner functions in external applications (e.g., coderef-dashboard)
**Audience:** Dashboard developers, API integrators

---

## Overview

The @coderef/core scanner provides fast, accurate code element discovery for TypeScript, JavaScript, and JSX/TSX codebases. This document specifies the public API contract for consuming scanner functions in Next.js API routes and other server-side environments.

### Key Features

- **Regex-based scanning**: ~85% accuracy, <1 second for 1000 elements
- **Type-safe**: Full TypeScript definitions included
- **Node.js native**: Uses fs, path, glob (Node.js APIs only - not browser-compatible)
- **ES Module**: Packaged as ES module (`type: "module"`)
- **Zero configuration**: Works out of the box with sensible defaults

---

## Installation

### Workspace Dependency (Monorepo)

```json
{
  "dependencies": {
    "@coderef/core": "workspace:*"
  }
}
```

### File Reference (Separate Projects)

```json
{
  "dependencies": {
    "@coderef/core": "file:../coderef-system/packages/core"
  }
}
```

### NPM Registry (When Published)

```json
{
  "dependencies": {
    "@coderef/core": "^2.0.0"
  }
}
```

---

## Core Exports

### Primary Scanner Function

```typescript
import { scanCurrentElements } from '@coderef/core';

function scanCurrentElements(
  dir: string,
  lang?: string | string[],
  options?: ScanOptions
): Promise<ElementData[]>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dir` | `string` | ✅ Yes | **Absolute path** to directory to scan |
| `lang` | `string \| string[]` | ❌ No | File extensions to scan (default: `['ts', 'tsx', 'js', 'jsx']`) |
| `options` | `ScanOptions` | ❌ No | Additional scanning configuration |

**Returns:** `Promise<ElementData[]>` - Array of discovered code elements

**Example:**

```typescript
const elements = await scanCurrentElements(
  'C:\\Users\\user\\project\\src',
  ['ts', 'tsx'],
  { recursive: true, exclude: ['node_modules/**', 'dist/**'] }
);
```

---

## Type Definitions

### ElementData

Represents a discovered code element (function, class, component, etc.)

```typescript
interface ElementData {
  type: 'function' | 'class' | 'component' | 'hook' | 'method' | 'constant' | 'unknown';
  name: string;
  file: string;           // Absolute path to file containing element
  line: number;           // Line number where element is defined
  exported?: boolean;     // Whether element is exported (optional)
  parameters?: string[];  // Function/method parameters (from AST analysis, optional)
  calls?: string[];       // Functions called by this element (from AST analysis, optional)
}
```

**Example:**

```typescript
{
  type: 'function',
  name: 'authenticateUser',
  file: 'C:\\Users\\user\\project\\src\\auth\\login.ts',
  line: 42,
  exported: true,
  parameters: ['username', 'password'],
  calls: ['validateCredentials', 'generateToken']
}
```

### ScanOptions

Configuration options for scanning behavior

```typescript
interface ScanOptions {
  include?: string | string[];   // Glob pattern for file inclusion
  exclude?: string | string[];   // Glob pattern for file exclusion
  recursive?: boolean;            // Scan subdirectories (default: true)
  langs?: string[];               // Languages to scan (default: ['ts', 'tsx', 'js', 'jsx'])
  customPatterns?: Array<{        // Custom element recognition patterns
    type: ElementData['type'];
    pattern: RegExp;
    nameGroup: number;
    lang: string;
  }>;
  includeComments?: boolean;      // Include commented-out code (default: false)
  verbose?: boolean;              // Show verbose output (default: false)
}
```

**Example:**

```typescript
const options: ScanOptions = {
  recursive: true,
  exclude: ['node_modules/**', 'dist/**', '**/*.test.ts'],
  langs: ['ts', 'tsx'],
  verbose: false
};
```

---

## Usage Patterns

### Basic Scan

```typescript
import { scanCurrentElements } from '@coderef/core';

// Scan current directory for TypeScript files
const elements = await scanCurrentElements(process.cwd(), 'ts');

console.log(`Found ${elements.length} elements`);
```

### Filtered Scan with Exclusions

```typescript
import { scanCurrentElements } from '@coderef/core';

const elements = await scanCurrentElements(
  'C:\\projects\\my-app\\src',
  ['ts', 'tsx', 'js', 'jsx'],
  {
    recursive: true,
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.test.ts',
      '**/*.spec.ts'
    ]
  }
);
```

### Next.js API Route Integration

```typescript
// app/api/scan/route.ts
import { scanCurrentElements, type ElementData } from '@coderef/core';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { projectPath, options } = await request.json();

  try {
    // Validate projectPath is absolute
    if (!projectPath || !path.isAbsolute(projectPath)) {
      return NextResponse.json(
        { error: 'projectPath must be an absolute path' },
        { status: 400 }
      );
    }

    // Execute scan
    const elements: ElementData[] = await scanCurrentElements(
      projectPath,
      options?.lang || ['ts', 'tsx', 'js', 'jsx'],
      {
        recursive: options?.recursive ?? true,
        exclude: options?.exclude || ['node_modules/**', 'dist/**']
      }
    );

    // Return results
    return NextResponse.json({
      success: true,
      data: {
        elements,
        summary: {
          total: elements.length,
          byType: elements.reduce((acc, el) => {
            acc[el.type] = (acc[el.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });
  } catch (error) {
    console.error('Scan failed:', error);
    return NextResponse.json(
      { error: 'Scan failed', message: error.message },
      { status: 500 }
    );
  }
}
```

---

## Supporting Exports

### LANGUAGE_PATTERNS

```typescript
export const LANGUAGE_PATTERNS: Record<string, Array<{
  type: ElementData['type'];
  pattern: RegExp;
  nameGroup: number;
}>>;
```

Provides access to built-in regex patterns for element recognition. Useful for understanding what the scanner detects.

### Scanner Class

```typescript
export class Scanner {
  addElement(element: ElementData): void;
  processFile(file: string, content: string, patterns: Array<...>, includeComments: boolean): void;
  getElements(): ElementData[];
}
```

Low-level scanner class for custom scanning workflows. Most users should use `scanCurrentElements()` instead.

### ScannerRegistry

```typescript
export const ScannerRegistry: {
  registerPattern(lang: string, type: ElementData["type"], pattern: RegExp, nameGroup?: number): void;
  getPatterns(lang: string): Array<...>;
  isLanguageSupported(lang: string): boolean;
  getSupportedLanguages(): string[];
};
```

Registry for custom element pattern registration. Allows extending the scanner with custom element types.

---

## Path Resolution Requirements

⚠️ **CRITICAL:** The scanner **requires absolute paths** for the `dir` parameter.

### Why Absolute Paths?

The dashboard runs in a different directory than the projects it scans. Relative paths would resolve incorrectly.

**Example:**

```typescript
// ❌ WRONG - relative path
await scanCurrentElements('./src');  // Resolves relative to dashboard directory

// ✅ CORRECT - absolute path
await scanCurrentElements('C:\\Users\\user\\project\\src');
```

### Resolving Paths in Dashboard

```typescript
import path from 'path';

// Convert project-relative path to absolute
const absolutePath = path.resolve(projectRoot, relativePath);

// Pass absolute path to scanner
const elements = await scanCurrentElements(absolutePath, langs, options);
```

---

## Error Handling

### Common Error Scenarios

The scanner can throw errors in the following scenarios:

#### 1. Directory Not Found

```typescript
// Error: ENOENT: no such file or directory
try {
  await scanCurrentElements('/invalid/path');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Directory does not exist:', error.path);
  }
}
```

#### 2. Permission Denied

```typescript
// Error: EACCES: permission denied
try {
  await scanCurrentElements('/restricted/path');
} catch (error) {
  if (error.code === 'EACCES') {
    console.error('Permission denied:', error.path);
  }
}
```

#### 3. Invalid Language Extension

```typescript
// Silently filters unsupported extensions
// No error thrown, just returns empty array for unsupported langs
const elements = await scanCurrentElements('/path', 'xyz');
// elements = []
```

#### 4. File Read Errors

```typescript
// Error: EISDIR: illegal operation on a directory, read
// Thrown when scan encounters unreadable files
try {
  await scanCurrentElements('/path');
} catch (error) {
  console.error('File read error:', error.message);
}
```

### Error Handling Best Practices

```typescript
async function safeScan(projectPath: string): Promise<ElementData[]> {
  try {
    // Validate path exists before scanning
    const fs = await import('fs/promises');
    await fs.access(projectPath);

    // Execute scan
    const elements = await scanCurrentElements(projectPath);
    return elements;

  } catch (error) {
    // Log error with context
    console.error('Scan failed:', {
      projectPath,
      error: error.message,
      code: error.code
    });

    // Map to user-friendly error
    if (error.code === 'ENOENT') {
      throw new Error(`Project directory not found: ${projectPath}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Permission denied accessing: ${projectPath}`);
    } else {
      throw new Error(`Scan failed: ${error.message}`);
    }
  }
}
```

### Dashboard Error Boundaries

```typescript
// Next.js API Route Error Handling
export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json();

    // Validate input
    if (!projectPath) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'projectPath is required' },
        { status: 400 }
      );
    }

    if (!path.isAbsolute(projectPath)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'projectPath must be absolute' },
        { status: 400 }
      );
    }

    // Execute scan
    const elements = await scanCurrentElements(projectPath);

    return NextResponse.json({ success: true, data: { elements } });

  } catch (error) {
    // Map error codes to HTTP status codes
    const statusCode = error.code === 'ENOENT' ? 404 :
                       error.code === 'EACCES' ? 403 :
                       500;

    return NextResponse.json(
      {
        error: 'SCAN_FAILED',
        message: error.message,
        code: error.code
      },
      { status: statusCode }
    );
  }
}
```

---

## Performance Characteristics

### Scan Times

| Project Size | Element Count | Scan Time |
|--------------|---------------|-----------|
| Small (10-50 files) | 100-500 elements | <200ms |
| Medium (100-500 files) | 1,000-5,000 elements | 500ms-1s |
| Large (1,000+ files) | 10,000+ elements | 1-3s |

### Memory Usage

- **Typical project (100 files):** ~50MB peak memory
- **Large project (1,000 files):** ~200MB peak memory
- **No memory leaks:** Memory released after scan completes

### Caching

The scanner includes built-in caching:

```typescript
import { clearScanCache, getScanCacheStats } from '@coderef/core';

// Clear cache (useful for testing)
clearScanCache();

// Get cache statistics
const stats = getScanCacheStats();
console.log(`Cache size: ${stats.size}, Entries: ${stats.entries}`);
```

**Cache behavior:**
- Cache is per-process (not persisted to disk)
- Cache key: file path + modification time
- Cache invalidation: automatic on file change detection

---

## Next.js Compatibility

### Verified Compatible Versions

- ✅ Next.js 14.x
- ✅ Next.js 15.x (tested)

### ES Module Support

@coderef/core is packaged as ES module (`"type": "module"`). Next.js 14+ supports ESM dependencies out of the box.

**Next.js Config (no changes needed):**

```javascript
// next.config.js - default config works
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

### Server-Side Only

⚠️ **IMPORTANT:** Scanner functions use Node.js APIs (fs, path, glob) and **ONLY work in server-side contexts**:

- ✅ API Routes (`app/api/**/route.ts`)
- ✅ Server Components (with `use server` directive)
- ✅ Server Actions
- ❌ Client Components (browser environment - will fail)

**Example: Ensuring Server-Side Execution:**

```typescript
// app/api/scan/route.ts - Server-side only
import { scanCurrentElements } from '@coderef/core';  // ✅ OK

// app/components/ScanButton.tsx - Client component
'use client';
// import { scanCurrentElements } from '@coderef/core';  // ❌ ERROR!
// Instead, call API route:
async function handleScan() {
  const response = await fetch('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ projectPath: '/path/to/project' })
  });
  const data = await response.json();
}
```

---

## Type Safety Checklist

When integrating @coderef/core in TypeScript projects:

- ✅ Import types from `@coderef/core`:
  ```typescript
  import { type ElementData, type ScanOptions } from '@coderef/core';
  ```

- ✅ Enable strict mode in `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "strict": true
    }
  }
  ```

- ✅ Use type guards for runtime validation:
  ```typescript
  function isValidElementData(data: any): data is ElementData {
    return (
      typeof data.name === 'string' &&
      typeof data.file === 'string' &&
      typeof data.line === 'number' &&
      ['function', 'class', 'component', 'hook', 'method', 'constant', 'unknown'].includes(data.type)
    );
  }
  ```

---

## Migration from CLI Subprocess

### Before (Python Subprocess)

```typescript
import { spawn } from 'child_process';

const scan = spawn('python', ['scan-all.py', projectPath]);

scan.stdout.on('data', (data) => {
  console.log(data.toString());
});

scan.on('close', (code) => {
  console.log(`Scan exited with code ${code}`);
});
```

### After (@coderef/core Direct Call)

```typescript
import { scanCurrentElements } from '@coderef/core';

const elements = await scanCurrentElements(projectPath);
console.log(`Found ${elements.length} elements`);
```

### Benefits

| Metric | Before (Subprocess) | After (Direct Call) |
|--------|---------------------|---------------------|
| Latency | 2-5 seconds | 200ms-1s |
| Type Safety | None | Full TypeScript |
| Error Handling | stderr parsing | Native try/catch |
| Memory Overhead | ~100MB (Python process) | ~50MB (in-process) |
| Dependencies | Python + pip packages | None (Node.js native) |

---

## Additional Resources

- **Source Code:** `packages/core/src/scanner.ts`
- **Type Definitions:** `packages/core/dist/scanner.d.ts`, `packages/core/dist/types.d.ts`
- **Examples:** See [Next.js Integration Example](examples/nextjs-api-route.ts)
- **Tests:** `packages/core/__tests__/scanner-standalone.test.ts`

---

## Support & Contact

For issues, questions, or feature requests:

- GitHub Issues: [coderef-system/issues](https://github.com/anthropics/coderef-system/issues)
- Documentation: `packages/core/RESOURCE-SHEET.md`

---

**Last Updated:** 2026-01-04
**Contract Version:** 1.0.0
**Package Version:** @coderef/core v2.0.0
