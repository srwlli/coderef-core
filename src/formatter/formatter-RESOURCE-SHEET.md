---
Agent: Claude Sonnet 4.5
Date: 2025-01-27
Task: DOCUMENT
---

# Formatter Module — Authoritative Documentation

## Executive Summary

The formatter module normalizes CodeRef reference strings to canonical format per the CodeRef2 specification. It converts parsed `ParsedCodeRef` objects back into standardized string representations with consistent whitespace, path normalization, metadata key sorting, and value formatting. The formatter ensures all references follow the canonical format rules (specification lines 464-471), enabling consistent reference comparison and storage.

## Audience & Intent

- **Markdown (this document):** Defines canonical format rules, normalization behavior, and formatting contracts
- **TypeScript/Code:** Implements formatting logic with strict validation
- **Parser integration:** Works with parser output to produce canonical strings

## 1. Architecture Overview

The formatter module provides canonical string generation from parsed references:

```
ParsedCodeRef → CodeRefFormatter.format() → Canonical String
```

**Component Structure:**
- `CodeRefFormatter`: Main formatting class
- `format()`: Primary formatting method
- `normalizePath()`: Path normalization logic
- `formatMetadata()`: Metadata formatting logic
- `formatter`: Singleton instance
- `formatCodeRef()`: Convenience function
- `formatCodeRefs()`: Batch formatting function

**Integration Points:**
- **Input:** `ParsedCodeRef` from parser module
- **Output:** Canonical CodeRef string
- **Dependencies:** `parser/parser.ts` for `ParsedCodeRef` interface

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Parsed reference | Caller | Domain | Function parameter | `ParsedCodeRef` input |
| Canonical string | Formatter | Domain | Return value | `format()` output |
| Path segments | Formatter | Domain | Ephemeral | `normalizePath()` internal |
| Metadata entries | Formatter | Domain | Ephemeral | `formatMetadata()` internal |

**Precedence Rules:**
- Parsed reference is authoritative input
- Formatter applies deterministic normalization rules
- Invalid parsed references throw errors (cannot format invalid input)

## 3. Data Persistence

No persistent state. Formatting is stateless and idempotent.

## 4. State Lifecycle

1. **Input Validation:** Verify `parsed.isValid === true` and no errors
2. **Type & Path:** Format `@Type/path` segment
3. **Element:** Append `#element` if present
4. **Line Reference:** Append `:line` or `:blockType{identifier}` if present
5. **Metadata:** Append `{metadata}` with sorted keys and normalized values
6. **Output:** Return canonical string

## 5. Behaviors (Events & Side Effects)

### User Behaviors
- **Format single:** `formatter.format(parsed)` — Formats one reference
- **Format batch:** `formatCodeRefs(parsedArray)` — Formats multiple references
- **Convenience:** `formatCodeRef(parsed)` — Wrapper function

### System Behaviors
- **Validation:** Throws error if `parsed.isValid === false`
- **Path normalization:** Removes redundant segments (`.`, `..`)
- **Metadata sorting:** Alphabetically sorts metadata keys
- **Value normalization:** Formats booleans, numbers, strings, arrays, objects

## 6. Event & Callback Contracts

| Event | Trigger | Payload | Side Effects |
|-------|---------|---------|--------------|
| `format()` | Method call | `parsed: ParsedCodeRef` | Returns canonical string |
| `formatCodeRef()` | Function call | `parsed: ParsedCodeRef` | Returns canonical string |
| `formatCodeRefs()` | Function call | `parsed: ParsedCodeRef[]` | Returns string array |

**Formatting Rules (Canonical Format):**
- No extraneous whitespace
- Paths normalized (redundant segments removed)
- Metadata keys alphabetically sorted
- Boolean values lowercase (`true`, `false`)
- Consistent quoting in metadata strings
- Special characters in strings quoted with `"`

## 7. Performance Considerations

**Known Limits:**
- Linear time complexity: O(n) where n = reference components
- Metadata sorting: O(k log k) where k = metadata keys
- Path normalization: O(p) where p = path segments

**Bottlenecks:**
- Large metadata objects (>100 keys) may take 1-2ms
- Deeply nested metadata objects may slow JSON serialization

**Optimization Opportunities:**
- Cache formatted strings (not implemented)
- Lazy metadata sorting (not implemented)

**Deferred Optimizations:**
- Streaming formatting for large batches
- Parallel batch processing

## 8. Accessibility

Not applicable (library module, no UI).

## 9. Testing Strategy

**Must-Cover Scenarios:**
- Basic reference formatting (type, path, element, line)
- Path normalization (`.`, `..`, redundant segments)
- Metadata formatting (all value types)
- Metadata key sorting
- Boolean value normalization
- String quoting rules
- Array and object formatting
- Block reference formatting
- Invalid input rejection
- Batch formatting

**Explicitly Not Tested:**
- Parser integration (tested separately)
- Reference validation (validator responsibility)

## 10. Non-Goals / Out of Scope

- Reference parsing (parser responsibility)
- Reference validation (validator responsibility)
- Custom formatting rules (follows specification)
- Format migration (not implemented)
- Format versioning (not implemented)

## 11. Common Pitfalls & Sharp Edges

**Invalid Input:**
- Formatter throws error if `parsed.isValid === false`
- Must validate before formatting (use validator)

**Path Normalization:**
- Removes `.` (current directory) segments
- Resolves `..` (parent directory) segments
- Does not validate path existence (assumes valid)

**Metadata Sorting:**
- Keys sorted alphabetically (case-sensitive)
- Category-prefixed keys (e.g., `status:active`) sorted by full key

**Boolean Values:**
- `true` formatted as key only (no `=true`)
- `false` formatted as key only (no `=false`)
- Empty strings treated as `false` (omitted)

**String Quoting:**
- Strings with special characters (`[,={}#:\[\]]`) are quoted
- Empty strings are quoted
- Unquoted strings must not contain special characters

**Array Formatting:**
- Arrays formatted as `[item1,item2,item3]`
- Items with special characters are quoted
- Nested arrays not supported (serialized as JSON)

**Object Formatting:**
- Objects serialized as JSON strings
- No custom object formatting (uses `JSON.stringify`)

## 12. Diagrams (Optional)

**Formatting Pipeline:**
```
ParsedCodeRef {
  type: "Fn"
  path: "./utils/../logger.ts"
  element: "logInfo"
  line: "42"
  metadata: { status: "active", scope: "public" }
}

        ↓ format()

"@Fn/utils/logger.ts#logInfo:42{scope=public,status=active}"
```

**Path Normalization:**
```
"./utils/../logger.ts"
  ↓ normalizePath()
"utils/logger.ts"

"../../src/auth.ts"
  ↓ normalizePath()
"src/auth.ts"
```

> Diagrams are **illustrative**, not authoritative. Formatting logic in code defines truth.

## Conclusion

The formatter module provides canonical string generation from parsed CodeRef references, ensuring consistent format across the codebase. It applies deterministic normalization rules for paths, metadata keys, and values, following the CodeRef2 specification. The formatter is stateless, idempotent, and throws errors for invalid input. Maintainers must preserve canonical format rules to ensure reference consistency and comparability.

