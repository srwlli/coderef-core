# Coderef Core Components Library

**Framework:** TypeScript/Node.js
**Version:** 2.0.0

## Overview

This document provides a comprehensive inventory of all reusable components, utilities, and modules within the Coderef Core library. Each component is designed for modular integration and follows consistent patterns for semantic code reference management.

### Reference Documentation

- **README.md**: Installation and usage examples
- **ARCHITECTURE.md**: System design and module boundaries
- **API.md**: Complete function reference and endpoints
- **SCHEMA.md**: Data models and validation rules

## Core Components Inventory

### 1. Parser Components

#### parseCodeRef Function

**Purpose:** Converts Coderef2 tag strings into structured data objects

**Props/Parameters:**
```typescript
interface ParseParams {
  tag: string;  // Required: Tag string in format @Type/path#element:line{metadata}
}

interface ParseResult {
  type: string;              // Tag type (e.g., "Fn", "Cl")
  path: string;             // File path without extension
  element: string | null;   // Element name (optional)
  line: number | null;      // Line number (optional)
  metadata?: Record<string, any>; // Optional key-value pairs
}
```

**Usage Rules:**
- Tag must start with uppercase letter after @
- Path cannot contain #:{}` characters
- Line numbers must be positive integers
- Metadata supports JSON or key=value format

**Copy-Paste Example:**
```typescript
import { parseCodeRef } from 'coderef-core';

// Basic usage
const result = parseCodeRef('@Fn/auth/login#authenticateUser:42');
console.log(result);
// Output: { type: "Fn", path: "auth/login", element: "authenticateUser", line: 42 }

// With metadata
const withMeta = parseCodeRef('@Fn/utils/math#calculate:25{version:2,stable:true}');
console.log(withMeta.metadata);
// Output: { version: 2, stable: true }

// Error handling
try {
  const invalid = parseCodeRef('@invalid-format');
} catch (error) {
  console.error('Parse failed:', error.message);
}
```

#### generateCodeRef Function

**Purpose:** Creates formatted tag strings from structured data

**Props/Parameters:**
```typescript
interface GenerateParams {
  type: string;              // Required: Tag type
  path: string;             // Required: File path
  element?: string | null;  // Optional: Element name
  line?: number | null;     // Optional: Line number
  metadata?: Record<string, any>; // Optional: Metadata object
}
```

**Copy-Paste Example:**
```typescript
import { generateCodeRef } from 'coderef-core';

// Minimal tag
const basic = generateCodeRef({
  type: 'Fn',
  path: 'auth/login'
});
// Result: "@Fn/auth/login"

// Complete tag with all components
const complete = generateCodeRef({
  type: 'Cl',
  path: 'models/User',
  element: 'validateCredentials',
  line: 15,
  metadata: { async: true, version: '2.0' }
});
// Result: "@Cl/models/User#validateCredentials:15{\"async\":true,\"version\":\"2.0\"}"
```

#### extractCodeRefs Function

**Purpose:** Finds and parses all tags within text content

**Props/Parameters:**
```typescript
interface ExtractParams {
  content: string;  // Text content to search
}

type ExtractResult = ParsedCodeRef[];  // Array of parsed tags
```

**Copy-Paste Example:**
```typescript
import { extractCodeRefs } from 'coderef-core';

const documentContent = `
# API Documentation

## Authentication
The main auth function: @Fn/auth/login#authenticateUser:42

## User Management
User model definition: @Cl/models/User#constructor:8{version:2}
`;

const foundTags = extractCodeRefs(documentContent);
console.log(`Found ${foundTags.length} tags:`, foundTags);
// Output: Found 2 tags: [{ type: "Fn", path: "auth/login", ... }, { type: "Cl", path: "models/User", ... }]
```

### 2. Scanner Components

#### scanCurrentElements Function

**Purpose:** Discovers code elements (functions, classes, components) in source files

**Props/Parameters:**
```typescript
interface ScanParams {
  dir: string;                    // Directory to scan
  lang?: string | string[];       // File extensions (default: 'ts')
  options?: ScanOptions;          // Configuration options
}

interface ScanOptions {
  include?: string | string[];    // Glob patterns for inclusion
  exclude?: string | string[];    // Glob patterns for exclusion
  recursive?: boolean;            // Scan subdirectories (default: true)
  langs?: string[];              // Additional languages
  customPatterns?: CustomPattern[]; // Custom element patterns
  includeComments?: boolean;      // Scan commented code (default: false)
  verbose?: boolean;             // Debug output (default: false)
}

interface CustomPattern {
  type: ElementType;             // Element type to assign
  pattern: RegExp;              // Regex pattern for matching
  nameGroup: number;            // Capture group for element name
  lang: string;                 // Target language
}
```

**Copy-Paste Example:**
```typescript
import { scanCurrentElements } from 'coderef-core';

// Basic scanning
const elements = await scanCurrentElements('./src', 'ts');
console.log(`Found ${elements.length} elements`);

// Advanced configuration
const advancedScan = await scanCurrentElements('./src', ['ts', 'tsx'], {
  recursive: true,
  exclude: ['**/*.test.*', '**/node_modules/**'],
  verbose: true,
  customPatterns: [
    {
      type: 'hook',
      pattern: /export const (use[A-Z]\w+)/g,
      nameGroup: 1,
      lang: 'ts'
    }
  ]
});

// Process results
advancedScan.forEach(element => {
  console.log(`${element.type}: ${element.name} at ${element.file}:${element.line}`);
});
```

#### Scanner Class

**Purpose:** Stateful scanner instance for custom processing workflows

**Props/Parameters:**
```typescript
class Scanner {
  constructor();
  addElement(element: ElementData): void;
  processFile(file: string, content: string, patterns: Pattern[], includeComments: boolean): void;
  getElements(): ElementData[];
}
```

**Copy-Paste Example:**
```typescript
import { Scanner } from 'coderef-core';
import * as fs from 'fs';

// Custom scanning workflow
const scanner = new Scanner();

// Process individual files
const files = ['src/auth.ts', 'src/user.ts'];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const patterns = [
    { type: 'function', pattern: /function\s+(\w+)/g, nameGroup: 1 }
  ];

  scanner.processFile(file, content, patterns, false);
}

// Get accumulated results
const elements = scanner.getElements();
console.log('Discovered elements:', elements);
```

#### ScannerRegistry Component

**Purpose:** Manages language patterns and custom element detection rules

**Props/Parameters:**
```typescript
interface RegistryMethods {
  registerPattern(lang: string, type: ElementType, pattern: RegExp, nameGroup?: number): void;
  getPatterns(lang: string): Pattern[];
  isLanguageSupported(lang: string): boolean;
  getSupportedLanguages(): string[];
}
```

**Copy-Paste Example:**
```typescript
import { ScannerRegistry } from 'coderef-core';

// Register custom pattern for Go language
ScannerRegistry.registerPattern(
  'go',
  'function',
  /func\s+(\w+)\s*\(/g,
  1
);

// Register React Hook pattern
ScannerRegistry.registerPattern(
  'tsx',
  'hook',
  /export\s+const\s+(use[A-Z]\w+)/g,
  1
);

// Check language support
if (ScannerRegistry.isLanguageSupported('go')) {
  console.log('Go patterns available');
}

// List all supported languages
console.log('Supported languages:', ScannerRegistry.getSupportedLanguages());
```

### 3. File System Utilities

#### normalizeCoderefPath Function

**Purpose:** Standardizes file paths for consistent tag generation

**Props/Parameters:**
```typescript
interface NormalizeParams {
  filePath: string;  // File path to normalize
}

type NormalizeResult = string;  // Normalized path
```

**Copy-Paste Example:**
```typescript
import { normalizeCoderefPath } from 'coderef-core/utils/fs';

// Windows path normalization
const windowsPath = normalizeCoderefPath('src\\auth\\login.ts');
console.log(windowsPath); // Output: "auth/login"

// Remove common prefixes
const withPrefix = normalizeCoderefPath('lib/utils/math.js');
console.log(withPrefix); // Output: "utils/math"

// Handle various extensions
const typescriptFile = normalizeCoderefPath('app/components/Button.tsx');
console.log(typescriptFile); // Output: "components/Button"
```

#### collectFiles Function

**Purpose:** Recursively gathers files with specified extensions

**Props/Parameters:**
```typescript
interface CollectParams {
  root: string;                    // Root directory
  ext?: string | string[];         // Extensions to include (default: 'ts')
  exclude?: string[];             // Patterns to exclude
}

type CollectResult = string[];     // Array of file paths
```

**Copy-Paste Example:**
```typescript
import { collectFiles } from 'coderef-core/utils/fs';

// Collect TypeScript files
const tsFiles = collectFiles('./src', 'ts');
console.log('TypeScript files:', tsFiles);

// Collect multiple extensions
const webFiles = collectFiles('./src', ['ts', 'tsx', 'js', 'jsx']);
console.log('Web files:', webFiles);

// With exclusion patterns
const prodFiles = collectFiles('./src', 'ts', [
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/node_modules/**'
]);
console.log('Production files:', prodFiles);
```

#### loadJsonFile and saveJsonFile Functions

**Purpose:** Safe JSON file operations with error handling

**Props/Parameters:**
```typescript
interface JsonParams<T> {
  filePath: string;
  defaultValue: T;     // For loadJsonFile
  data?: any;         // For saveJsonFile
}
```

**Copy-Paste Example:**
```typescript
import { loadJsonFile, saveJsonFile } from 'coderef-core/utils/fs';

// Load configuration with fallback
const config = loadJsonFile('./coderef.json', {
  version: '1.0.0',
  languages: ['ts', 'js'],
  exclude: ['node_modules']
});

// Modify and save
config.lastUpdated = new Date().toISOString();
const success = saveJsonFile('./coderef.json', config);

if (success) {
  console.log('Configuration saved successfully');
} else {
  console.error('Failed to save configuration');
}
```

### 4. State Management Patterns

#### Element Data Management

**Pattern:** Immutable data structures for element tracking

**Copy-Paste Example:**
```typescript
import { ElementData } from 'coderef-core';

// Element state management
class ElementManager {
  private elements: ElementData[] = [];

  addElement(element: ElementData): void {
    // Immutable addition
    this.elements = [...this.elements, element];
  }

  updateElement(index: number, updates: Partial<ElementData>): void {
    // Immutable update
    this.elements = this.elements.map((el, i) =>
      i === index ? { ...el, ...updates } : el
    );
  }

  removeElement(index: number): void {
    // Immutable removal
    this.elements = this.elements.filter((_, i) => i !== index);
  }

  getElementsByType(type: ElementData['type']): ElementData[] {
    return this.elements.filter(el => el.type === type);
  }

  getElementsByFile(file: string): ElementData[] {
    return this.elements.filter(el => el.file === file);
  }
}

// Usage
const manager = new ElementManager();
manager.addElement({
  type: 'function',
  name: 'authenticate',
  file: 'auth/login',
  line: 42
});
```

#### Tag State Management

**Pattern:** Tagged union types for tag processing states

**Copy-Paste Example:**
```typescript
import { ParsedCodeRef } from 'coderef-core';

// Tag processing state machine
type TagState =
  | { status: 'pending'; tag: string }
  | { status: 'parsed'; tag: string; result: ParsedCodeRef }
  | { status: 'error'; tag: string; error: string };

class TagProcessor {
  private states: Map<string, TagState> = new Map();

  processTag(tag: string): void {
    // Set initial state
    this.states.set(tag, { status: 'pending', tag });

    try {
      const result = parseCodeRef(tag);
      this.states.set(tag, { status: 'parsed', tag, result });
    } catch (error) {
      this.states.set(tag, { status: 'error', tag, error: error.message });
    }
  }

  getTagState(tag: string): TagState | undefined {
    return this.states.get(tag);
  }

  getSuccessfulTags(): ParsedCodeRef[] {
    return Array.from(this.states.values())
      .filter((state): state is { status: 'parsed'; tag: string; result: ParsedCodeRef } =>
        state.status === 'parsed'
      )
      .map(state => state.result);
  }
}
```

### 5. Validation Components

#### Tag Validation

**Purpose:** Comprehensive tag format and content validation

**Copy-Paste Example:**
```typescript
import { isValidCoderefTag, parseCodeRef } from 'coderef-core';

// Validation utility class
class TagValidator {
  static validateTag(tag: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Format validation
    if (!isValidCoderefTag(tag)) {
      errors.push('Invalid tag format');
      return { valid: false, errors };
    }

    try {
      const parsed = parseCodeRef(tag);

      // Type validation
      if (!/^[A-Z][A-Za-z0-9]*$/.test(parsed.type)) {
        errors.push('Type must start with uppercase letter');
      }

      // Path validation
      if (parsed.path.includes('..')) {
        errors.push('Path cannot contain relative navigation');
      }

      // Line validation
      if (parsed.line !== null && parsed.line < 1) {
        errors.push('Line number must be positive');
      }

      // Metadata validation
      if (parsed.metadata) {
        for (const [key, value] of Object.entries(parsed.metadata)) {
          if (typeof key !== 'string' || key.length === 0) {
            errors.push('Metadata keys must be non-empty strings');
          }
        }
      }

    } catch (error) {
      errors.push(`Parse error: ${error.message}`);
    }

    return { valid: errors.length === 0, errors };
  }

  static validateBatch(tags: string[]): { tag: string; valid: boolean; errors: string[] }[] {
    return tags.map(tag => ({
      tag,
      ...TagValidator.validateTag(tag)
    }));
  }
}

// Usage
const validation = TagValidator.validateTag('@Fn/auth/login#authenticateUser:42');
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### 6. Performance Optimization Components

#### Batch Processing

**Pattern:** Efficient bulk operations for large datasets

**Copy-Paste Example:**
```typescript
import { scanCurrentElements, parseCodeRef } from 'coderef-core';

// Batch processor for large codebases
class BatchProcessor {
  private readonly batchSize: number;

  constructor(batchSize: number = 100) {
    this.batchSize = batchSize;
  }

  async processBatches<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);

      // Optional progress reporting
      console.log(`Processed ${Math.min(i + this.batchSize, items.length)}/${items.length} items`);
    }

    return results;
  }

  async scanDirectoriesBatch(directories: string[]): Promise<ElementData[]> {
    return this.processBatches(directories, async (dirs) => {
      const promises = dirs.map(dir => scanCurrentElements(dir, 'ts', { verbose: false }));
      const results = await Promise.all(promises);
      return results.flat();
    });
  }

  parsTagsBatch(tags: string[]): ParsedCodeRef[] {
    const results: ParsedCodeRef[] = [];

    for (let i = 0; i < tags.length; i += this.batchSize) {
      const batch = tags.slice(i, i + this.batchSize);

      for (const tag of batch) {
        try {
          results.push(parseCodeRef(tag));
        } catch (error) {
          console.warn(`Skipping invalid tag: ${tag}`);
        }
      }
    }

    return results;
  }
}

// Usage
const processor = new BatchProcessor(50);
const elements = await processor.scanDirectoriesBatch(['./src', './lib', './components']);
```

#### Caching Components

**Pattern:** Intelligent caching for repeated operations

**Copy-Paste Example:**
```typescript
// Cache manager for expensive operations
class CacheManager {
  private parseCache = new Map<string, ParsedCodeRef>();
  private scanCache = new Map<string, ElementData[]>();
  private pathCache = new Map<string, string>();

  parseWithCache(tag: string): ParsedCodeRef {
    if (this.parseCache.has(tag)) {
      return this.parseCache.get(tag)!;
    }

    const result = parseCodeRef(tag);
    this.parseCache.set(tag, result);
    return result;
  }

  async scanWithCache(dir: string, lang: string): Promise<ElementData[]> {
    const key = `${dir}:${lang}`;

    if (this.scanCache.has(key)) {
      return this.scanCache.get(key)!;
    }

    const result = await scanCurrentElements(dir, lang);
    this.scanCache.set(key, result);
    return result;
  }

  normalizeWithCache(filePath: string): string {
    if (this.pathCache.has(filePath)) {
      return this.pathCache.get(filePath)!;
    }

    const result = normalizeCoderefPath(filePath);
    this.pathCache.set(filePath, result);
    return result;
  }

  clearCache(): void {
    this.parseCache.clear();
    this.scanCache.clear();
    this.pathCache.clear();
  }

  getCacheStats(): { parse: number; scan: number; path: number } {
    return {
      parse: this.parseCache.size,
      scan: this.scanCache.size,
      path: this.pathCache.size
    };
  }
}

// Global cache instance
export const globalCache = new CacheManager();
```

## Integration Patterns

### React Hook Pattern (Hypothetical)

```typescript
// Custom React hook for Coderef management
import { useState, useEffect } from 'react';
import { scanCurrentElements, ElementData } from 'coderef-core';

function useCodeElements(directory: string, language: string) {
  const [elements, setElements] = useState<ElementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const scanElements = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await scanCurrentElements(directory, language, {
          recursive: true,
          verbose: false
        });

        if (!cancelled) {
          setElements(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Scan failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    scanElements();

    return () => {
      cancelled = true;
    };
  }, [directory, language]);

  return { elements, loading, error };
}
```

### CLI Integration Pattern

```typescript
// Command-line interface wrapper
import { Command } from 'commander';
import { scanCurrentElements, parseCodeRef, generateCodeRef } from 'coderef-core';

const program = new Command();

program
  .command('scan <directory>')
  .option('-l, --lang <language>', 'Language to scan', 'ts')
  .option('-r, --recursive', 'Scan recursively', true)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (directory, options) => {
    try {
      const elements = await scanCurrentElements(directory, options.lang, {
        recursive: options.recursive,
        verbose: options.verbose
      });

      console.log(JSON.stringify(elements, null, 2));
    } catch (error) {
      console.error('Scan failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('parse <tag>')
  .action((tag) => {
    try {
      const result = parseCodeRef(tag);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Parse failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

---

**🤖 Generated with [Claude Code](https://claude.ai/code)**

**Co-Authored-By:** Claude <noreply@anthropic.com>

*This component library reference provides reusable building blocks for semantic code reference management. All components follow modular design principles and include copy-paste ready examples for immediate integration into development workflows.*