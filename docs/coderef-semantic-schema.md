# CodeRef Semantic Schema

**Version:** 1.0.0  
**Status:** Phase 1 (WO-CODEREF-SEMANTIC-INTEGRATION-001)  
**Date:** 2026-04-28

## Overview

CodeRef Semantic Layer extends `.coderef/index.json` with four new fields to enable unified semantic understanding of code:

1. **exports** — What a file provides (functions, classes, modules)
2. **used_by** — Which files depend on this file
3. **related** — Semantically connected files (not direct imports)
4. **rules** — Constraints and patterns this file enforces

These fields are **optional** for backward compatibility. Files without these fields continue to work unchanged.

---

## Schema Fields

### `exports` (optional)

**Type:** `Array<{name, type?, target?}>`

**Description:** Modules, functions, classes, or constants exported by this file.

**Example:**
```json
{
  "file": "src/hooks/useAuth.ts",
  "name": "useAuth",
  "type": "function",
  "exported": true,
  "exports": [
    {
      "name": "useAuth",
      "type": "named",
      "target": "src/hooks/useAuth.ts"
    },
    {
      "name": "AuthProvider",
      "type": "named"
    }
  ]
}
```

**Fields:**
- `name` (required): Export name as it appears in imports (e.g., `useState`, `UserService`)
- `type` (optional): `"default"` or `"named"` — distinguishes `export default X` from `export { X }`
- `target` (optional): What the export points to (for re-exports, e.g., `src/hooks/useState.ts`)

**Usage:** Agents use exports to understand what a file provides without parsing the source.

---

### `usedBy` (optional)

**Type:** `Array<{file, imports?, line?}>`

**Description:** Files that import or depend on this file (reverse relationship).

**Example:**
```json
{
  "file": "src/utils/auth.ts",
  "usedBy": [
    {
      "file": "src/middleware/authMiddleware.ts",
      "imports": ["validateToken", "refreshToken"],
      "line": 5
    },
    {
      "file": "src/routes/admin.ts",
      "imports": ["requireAuth"],
      "line": 12
    }
  ]
}
```

**Fields:**
- `file` (required): Path to file that imports this file
- `imports` (optional): Names of specific exports imported (e.g., `["validateToken"]`)
- `line` (optional): Line number of the import statement in the importing file

**Usage:** Agents use `used_by` to identify impact: changing this file affects all listed files.

---

### `related` (optional)

**Type:** `Array<{file, reason?, confidence?}>`

**Description:** Files with semantic relationship but no direct import. Auto-detected by Lloyd semantic layer.

**Example:**
```json
{
  "file": "src/models/user.ts",
  "related": [
    {
      "file": "src/validators/user-validator.ts",
      "reason": "validates User model",
      "confidence": 0.92
    },
    {
      "file": "src/services/user-service.ts",
      "reason": "orchestrates User model operations",
      "confidence": 0.87
    }
  ]
}
```

**Fields:**
- `file` (required): Path to related file
- `reason` (optional): Why files are related (e.g., "validates this model")
- `confidence` (optional): Confidence score 0-1 from semantic search (higher = stronger relationship)

**Usage:** Agents use `related` to find files affecting the same domain without parsing all imports.

---

### `rules` (optional)

**Type:** `Array<{rule, description?, severity?}>`

**Description:** Constraints and patterns this file must enforce. Validated by rules engine.

**Example:**
```json
{
  "file": "src/api/auth.ts",
  "rules": [
    {
      "rule": "must-export-as-default",
      "description": "Only one default export allowed",
      "severity": "error"
    },
    {
      "rule": "requires-auth-middleware",
      "description": "All routes must apply authMiddleware",
      "severity": "error"
    },
    {
      "rule": "input-validation-required",
      "description": "Validate user input before DB operations",
      "severity": "error"
    },
    {
      "rule": "no-circular-dependencies",
      "severity": "warning"
    }
  ]
}
```

**Fields:**
- `rule` (required): Rule identifier (kebab-case, machine-readable)
- `description` (optional): Human-readable explanation
- `severity` (optional): `"error"` (block), `"warning"` (alert), `"info"` (log) — default: `"error"`

**Usage:** Rules validator checks compliance at `/execute-workorder` time. Violations are reported to agents.

---

## Complete Example

```json
{
  "type": "function",
  "name": "createUser",
  "file": "src/api/users.ts",
  "line": 42,
  "exported": true,
  "parameters": ["userData"],
  "returnType": "Promise<User>",
  "async": true,
  "docstring": "Create a new user with validation",
  
  "exports": [
    {
      "name": "createUser",
      "type": "named"
    },
    {
      "name": "deleteUser",
      "type": "named"
    },
    {
      "name": "UserController",
      "type": "default"
    }
  ],
  
  "usedBy": [
    {
      "file": "src/routes/users.ts",
      "imports": ["createUser"],
      "line": 15
    },
    {
      "file": "src/tests/users.test.ts",
      "imports": ["createUser"],
      "line": 8
    }
  ],
  
  "related": [
    {
      "file": "src/models/user.ts",
      "reason": "defines User model",
      "confidence": 0.95
    },
    {
      "file": "src/validators/user-validator.ts",
      "reason": "validates user input",
      "confidence": 0.89
    }
  ],
  
  "rules": [
    {
      "rule": "requires-input-validation",
      "description": "Must validate userData before DB operation",
      "severity": "error"
    },
    {
      "rule": "requires-error-handling",
      "description": "Must handle database errors",
      "severity": "error"
    },
    {
      "rule": "requires-auth-check",
      "description": "Must check user permissions",
      "severity": "warning"
    }
  ]
}
```

---

## Field Requirements

All four semantic fields are **required** but can be **empty arrays**:

- `exports: []` — No exports (file is not re-exported)
- `usedBy: []` — Not imported by anything yet
- `related: []` — No semantic relationships detected (Phase 3 populates this)
- `rules: []` — No constraints defined

This ensures **consistent schema** across all elements while allowing empty relationships.

---

## Usage Patterns

### Pattern 1: Impact Analysis
```typescript
// Agent loads a file and checks impact
const file = index.find(e => e.file === 'src/auth.ts');
const impacts = file.usedBy?.map(u => u.file) || [];
// "If I change auth.ts, these files may break"
```

### Pattern 2: Domain Discovery
```typescript
// Agent finds all related files in a domain
const userModel = index.find(e => e.file === 'src/models/user.ts');
const domain = [
  userModel,
  ...(userModel.related?.map(r => index.find(e => e.file === r.file)) || [])
];
// "Here are all files related to User"
```

### Pattern 3: Rule Validation
```typescript
// Agent checks compliance before modifying a file
const file = index.find(e => e.file === 'src/api/auth.ts');
const violations = checkRules(file, file.rules || []);
// "This file requires X, Y, Z before you proceed"
```

### Pattern 4: Dependency Chain
```typescript
// Agent traces dependency chain
function getFullDependencyChain(file) {
  const chain = new Set([file.file]);
  const queue = file.usedBy || [];
  while (queue.length > 0) {
    const next = queue.shift();
    chain.add(next.file);
    const nextFile = index.find(e => e.file === next.file);
    queue.push(...(nextFile?.usedBy || []));
  }
  return Array.from(chain);
}
```

---

## Implementation Timeline

- **Phase 1** (CURRENT): Schema definition + coderef-scan wiring ✓
- **Phase 2**: TRACKING file-annotation registry type
- **Phase 3**: Lloyd semantic layer for auto-related detection
- **Phase 4**: Agent query patterns for TRACKING
- **Phase 5**: Rules validator engine
- **Phase 6**: Session.json agent messages
- **Phase 7**: /log-session-event integration
- **Phase 8**: Agent message querying
- **Phase 9**: Hourly audit validation

---

## Related Documents

- `TRACKING/CODEREF-SEMANTIC-INTEGRATION.md` — Full 9-phase implementation plan
- `src/types/types.ts` — ElementData TypeScript interface
- `src/pipeline/generators/index-generator.ts` — Index generation logic
