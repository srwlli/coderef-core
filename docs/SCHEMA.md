# Coderef Core Schema Reference

**Date:** 2025-09-17
**Schema Version:** 2.0.0
**Maintainer:** Coderef Development Team

## Overview

This document provides comprehensive schema documentation for the Coderef Core library, including all data models, type definitions, validation rules, and relationships. The schema supports semantic code reference management through structured data types that enable parsing, scanning, and drift detection capabilities.

## Core Data Models

### ElementData Interface

The fundamental data structure representing discovered code elements in the codebase.

```typescript
interface ElementData {
  // Core fields
  type: 'function' | 'class' | 'component' | 'hook' | 'method' | 'constant' | 'interface' | 'type' | 'decorator' | 'property' | 'unknown';
  name: string;        // Element identifier (alphanumeric + underscore)
  file: string;        // Normalized file path (forward slashes)
  line: number;        // 1-based line number (positive integer)

  // Optional metadata (Phase 1: AST Integration)
  exported?: boolean;              // Whether element is exported
  parameters?: string[];           // Function/method parameters from AST

  // Phase 4: Relationship Tracking
  calls?: string[];                // Functions/methods called by this element
  imports?: Array<{                // Import statements in this file
    source: string;                // Module path (e.g., './utils', 'react')
    specifiers?: string[];         // Named imports (e.g., ['useState', 'useEffect'])
    default?: string;              // Default import name
    namespace?: string;            // Namespace import (e.g., import * as React)
    dynamic?: boolean;             // True for dynamic import() calls (Phase 5)
    line: number;                  // Line number of import
  }>;
  dependencies?: string[];         // Resolved module/file paths
  calledBy?: string[];            // Elements that call this element (reverse relationship)
}
```

**Validation Rules:**
- `type`: Must be one of the enumerated values
- `name`: Required, non-empty string matching `[a-zA-Z0-9_$]+`
- `file`: Required, normalized path without extensions
- `line`: Required, positive integer ≥ 1
- `parameters`: Optional array of parameter names
- `calls`: Optional array of function names called by this element
- `imports`: Optional array of import statements (populated when `useAST: true`)
- `dependencies`: Optional array of resolved dependency paths
- `calledBy`: Optional array of caller element names

**JSON Schema:**
```json
{
  "type": "object",
  "required": ["type", "name", "file", "line"],
  "properties": {
    "type": {
      "type": "string",
      "enum": ["function", "class", "component", "hook", "method", "unknown"]
    },
    "name": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_$]+$",
      "minLength": 1
    },
    "file": {
      "type": "string",
      "minLength": 1
    },
    "line": {
      "type": "integer",
      "minimum": 1
    }
  }
}
```

### ParsedCodeRef Interface

Structured representation of Coderef2 tags after parsing.

```typescript
interface ParsedCodeRef {
  type: string;              // Tag type (@Fn, @Cl, @C, etc.)
  path: string;             // File path without extension
  element: string | null;   // Element name (optional)
  line: number | null;      // Line number (optional)
  metadata?: Record<string, any>; // Optional key-value pairs
}
```

**Validation Rules:**
- `type`: Required, must start with uppercase letter `[A-Z][A-Za-z0-9]*`
- `path`: Required, file path without `#:{}` characters
- `element`: Optional element name without `#:{}` characters
- `line`: Optional positive integer
- `metadata`: Optional object with string keys

**JSON Schema:**
```json
{
  "type": "object",
  "required": ["type", "path"],
  "properties": {
    "type": {
      "type": "string",
      "pattern": "^[A-Z][A-Za-z0-9]*$"
    },
    "path": {
      "type": "string",
      "pattern": "^[^#:{}]+$"
    },
    "element": {
      "oneOf": [
        {"type": "null"},
        {"type": "string", "pattern": "^[^#:{}]+$"}
      ]
    },
    "line": {
      "oneOf": [
        {"type": "null"},
        {"type": "integer", "minimum": 1}
      ]
    },
    "metadata": {
      "type": "object",
      "additionalProperties": true
    }
  }
}
```

### IndexedCoderef Type

Enhanced tracking structure for indexed code references.

```typescript
type IndexedCoderef = {
  // Core tag components
  type: string;              // Tag type
  path: string;             // Target file path
  element: string | null;   // Target element name
  line: number | null;      // Target line number
  metadata?: Record<string, any>; // Optional metadata

  // Index-specific tracking
  file: string;           // Source file containing the tag
  indexLine: number;      // Line number where tag appears
  originalTag: string;    // Complete original tag string
}
```

**Relationships:**
- Extends `ParsedCodeRef` with tracking information
- `file` ≠ `path` (source vs target distinction)
- `indexLine` ≠ `line` (tag location vs target location)

## Enumerated Types

### DriftStatus Enum

Represents the status of code reference drift analysis.

```typescript
type DriftStatus =
  | 'unchanged'  // Perfect match - element exists at specified location
  | 'moved'      // Element exists but line number changed
  | 'renamed'    // Similar element exists (fuzzy name match)
  | 'missing'    // Element no longer exists in codebase
  | 'unknown';   // Unable to determine status (analysis error)
```

**State Transitions:**
```
unchanged → moved      (line number change)
unchanged → renamed    (element renamed)
unchanged → missing    (element deleted)
moved → missing        (element deleted after move)
renamed → missing      (element deleted after rename)
unknown → *           (retry analysis)
```

### ElementType Enum

Supported code element types for scanning.

```typescript
type ElementType =
  | 'function'   // Function declarations and expressions
  | 'class'      // Class declarations
  | 'component'  // React components (PascalCase functions)
  | 'hook'       // React hooks (functions starting with 'use')
  | 'method'     // Class methods
  | 'unknown';   // Unrecognized elements
```

**Detection Patterns:**
- `function`: `function name()` or `const name = () =>`
- `class`: `class Name {}`
- `component`: `function ComponentName()` (PascalCase)
- `hook`: `function useHookName()` (starts with 'use')
- `method`: Functions within class declarations

## Configuration Schemas

### ScanOptions Interface

Configuration options for code scanning operations.

```typescript
interface ScanOptions {
  // Basic options
  include?: string | string[];    // Glob patterns for inclusion
  exclude?: string | string[];    // Glob patterns for exclusion
  recursive?: boolean;            // Scan subdirectories
  langs?: string[];              // File extensions to scan
  customPatterns?: Array<{       // Custom element patterns
    type: ElementData['type'],
    pattern: RegExp,
    nameGroup: number,
    lang: string
  }>;
  includeComments?: boolean;      // Scan commented code
  verbose?: boolean;             // Enable debug output

  // Phase 1: AST Integration
  useAST?: boolean;              // Use AST-based parsing (95%+ accuracy) vs regex (85%)
  fallbackToRegex?: boolean;     // Fallback to regex if AST parsing fails (default: true)

  // Phase 2: Parallel Processing
  parallel?: boolean | {         // Enable parallel file processing
    workers?: number;            // Number of worker threads (default: CPU cores - 1)
  };
  workerPoolSize?: number;       // Deprecated: use parallel.workers instead

  // Phase 5: Progress Reporting
  onProgress?: (progress: {      // Callback for progress updates during scanning
    currentFile: string;
    filesProcessed: number;
    totalFiles: number;
    elementsFound: number;
    percentComplete: number;     // 0-100
  }) => void;
}
```

**Default Values:**
```typescript
const defaultOptions: ScanOptions = {
  exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  recursive: true,
  langs: ['ts', 'js', 'tsx', 'jsx'],
  includeComments: false,
  verbose: false
}
```

### DriftDetectionOptions Type

Configuration for drift detection analysis.

```typescript
type DriftDetectionOptions = {
  lang?: string | string[];      // Languages to analyze
  fixThreshold?: number;         // Similarity threshold (0-1)
  verbose?: boolean;            // Debug output
  scanOptions?: ScanOptions;    // Nested scan configuration
}
```

**Validation Constraints:**
- `fixThreshold`: Must be between 0.0 and 1.0 (inclusive)
- `lang`: Must be supported language extensions
- `scanOptions`: Must be valid ScanOptions object

## Report Schemas

### DriftReport Type

Individual drift analysis report structure.

```typescript
type DriftReport = {
  coderef: string;           // Original tag string
  status: DriftStatus;       // Analysis result
  originalFile: string;      // Source file path
  originalLine: number;      // Source line number
  currentFile?: string;      // Current target file (if found)
  currentLine?: number;      // Current target line (if found)
  suggestedFix?: string;     // Recommended correction
  confidence: number;        // Confidence score (0-1)
}
```

**Conditional Fields:**
- `currentFile`: Present when `status` is 'unchanged', 'moved', or 'renamed'
- `currentLine`: Present when `currentFile` is present
- `suggestedFix`: Present when `status` is 'moved' or 'renamed'

## Validation Rules

### Tag Format Validation

Coderef2 tags must follow the strict format: `@Type/path#element:line{metadata}`

**Regex Pattern:**
```regex
/@([A-Z][A-Za-z0-9]*)\/([^#:{}]+)(?:#([^:{}]+))?(?::(\d+))?(?:{(.+)})?/
```

**Component Breakdown:**
1. `@([A-Z][A-Za-z0-9]*)` - Type (uppercase start)
2. `\/([^#:{}]+)` - Path (no special chars)
3. `(?:#([^:{}]+))?` - Optional element
4. `(?::(\d+))?` - Optional line number
5. `(?:{(.+)})?` - Optional metadata

**Validation Errors:**
```json
{
  "invalidFormat": "Tag does not match required pattern",
  "missingType": "Tag type is required and must start with uppercase",
  "missingPath": "File path is required",
  "invalidLine": "Line number must be positive integer",
  "invalidMetadata": "Metadata must be valid JSON or key=value pairs"
}
```

### File Path Validation

File paths are normalized using specific rules:

```typescript
function normalizeCoderefPath(filePath: string): string {
  return filePath
    .replace(/^(?:src|app|lib)[\\/]/, '')           // Remove common prefixes
    .replace(/\\/g, '/')                            // Windows → POSIX slashes
    .replace(/\.(ts|js|tsx|jsx|py|java)$/, '');     // Remove extensions
}
```

**Examples:**
- `src/auth/login.ts` → `auth/login`
- `app\\components\\Button.tsx` → `components/Button`
- `lib/utils/math.js` → `utils/math`

## Relationships and Constraints

### Entity Relationships

```
ElementData 1:N ScanOptions
ParsedCodeRef 1:1 IndexedCoderef
IndexedCoderef 1:1 DriftReport
DriftReport N:1 DriftStatus
```

### Referential Integrity

1. **Element-File Relationship:**
   - `ElementData.file` must be valid file path
   - `ElementData.line` must exist in the file
   - `ElementData.name` must be found at specified line

2. **Tag-Element Relationship:**
   - `ParsedCodeRef.path` should resolve to existing file
   - `ParsedCodeRef.element` should exist in target file
   - `ParsedCodeRef.line` should match element location

3. **Index-Source Relationship:**
   - `IndexedCoderef.file` must be valid source file
   - `IndexedCoderef.indexLine` must contain the tag
   - `IndexedCoderef.originalTag` must be parseable

### Consistency Constraints

1. **Path Consistency:**
   ```typescript
   // All paths must be normalized
   assert(path.includes('\\') === false);
   assert(path.endsWith('.ts') === false);
   ```

2. **Line Number Consistency:**
   ```typescript
   // Line numbers must be positive
   assert(line >= 1);
   assert(Number.isInteger(line));
   ```

3. **Type Consistency:**
   ```typescript
   // Element types must be supported
   const validTypes = ['function', 'class', 'component', 'hook', 'method', 'unknown'];
   assert(validTypes.includes(elementType));
   ```

## Examples and Usage Patterns

### Complete Element Example

```typescript
const element: ElementData = {
  type: 'function',
  name: 'authenticateUser',
  file: 'auth/login',
  line: 42
};

// Validation check
function validateElement(element: ElementData): string[] {
  const errors: string[] = [];

  if (!/^[a-zA-Z0-9_$]+$/.test(element.name)) {
    errors.push('Invalid element name format');
  }

  if (element.line < 1) {
    errors.push('Line number must be positive');
  }

  if (element.file.includes('\\')) {
    errors.push('File path must use forward slashes');
  }

  return errors;
}
```

### Tag Parsing Example

```typescript
// Input tag
const tagString = '@Fn/auth/login#authenticateUser:42{status:"active",version:2}';

// Parsed result
const parsed: ParsedCodeRef = {
  type: 'Fn',
  path: 'auth/login',
  element: 'authenticateUser',
  line: 42,
  metadata: {
    status: 'active',
    version: 2
  }
};

// Validation errors
const validationErrors = [
  {
    "field": "metadata.status",
    "message": "String values should be unquoted in metadata",
    "suggestion": 'Use status=active instead of status:"active"'
  }
];
```

### Drift Report Example

```typescript
const driftReport: DriftReport = {
  coderef: '@Fn/auth/login#authenticateUser:42',
  status: 'moved',
  originalFile: 'docs/api.md',
  originalLine: 15,
  currentFile: 'src/auth/login.ts',
  currentLine: 45,
  suggestedFix: '@Fn/auth/login#authenticateUser:45',
  confidence: 0.95
};
```

## Migration and Versioning

### Schema Evolution

Version 2.0.0 introduces breaking changes from 1.x:

1. **Enhanced Element Types:**
   - Added `interface`, `enum`, `type` to ElementData
   - Deprecated generic `unknown` type where possible

2. **Improved Drift Detection:**
   - Added `ambiguous` and `error` to DriftStatus
   - Enhanced confidence scoring

3. **Metadata Validation:**
   - Stricter JSON parsing rules
   - Better error messages for malformed metadata

### Backward Compatibility

```typescript
// Legacy v1.x element (still supported)
interface LegacyElementData {
  type: 'function' | 'class' | 'unknown';
  name: string;
  file: string;
  line: number;
}

// Migration function
function migrateLegacyElement(legacy: LegacyElementData): ElementData {
  return {
    ...legacy,
    type: legacy.type === 'unknown' ? 'function' : legacy.type
  };
}
```

---

**Schema Documentation Generated by:** AI Code Analysis System
**Last Updated:** 2025-09-17T12:00:00Z
**Generated with:** [Claude Code](https://claude.ai/code)

*This schema reference provides complete type definitions, validation rules, and usage examples for the Coderef Core library. All schemas are designed for programmatic validation and seamless integration with TypeScript-based development workflows.*