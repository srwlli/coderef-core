---
Agent: Claude Sonnet 4.5
Date: 2025-01-27
Task: DOCUMENT
---

# Validator Module — Authoritative Documentation

## Executive Summary

The validator module performs semantic validation of parsed CodeRef references, checking type designators, path formats, element formats, line references, and metadata against specification rules. It provides detailed error messages, warnings, and suggestions for typos or misspellings. The validator works with `ParsedCodeRef` objects from the parser and ensures references meet CodeRef2 specification requirements (canonical format rules, lines 464-471).

## Audience & Intent

- **Markdown (this document):** Defines validation rules, error categories, and suggestion algorithms
- **TypeScript/Code:** Implements validation logic with comprehensive checks
- **Parser integration:** Validates parser output for semantic correctness

## 1. Architecture Overview

The validator module provides semantic validation of parsed references:

```
ParsedCodeRef → CodeRefValidator.validate() → ValidationResult
```

**Component Structure:**
- `CodeRefValidator`: Main validator class
- `validate()`: Primary validation method
- `isValidTypeDesignator()`: Type validation
- `isValidPath()`: Path validation
- `isValidElement()`: Element validation
- `validateMetadata()`: Metadata validation
- `getSimilarTypes()`: Typo suggestion algorithm
- `calculateSimilarity()`: Levenshtein distance calculation
- `validator`: Singleton instance
- `validateCodeRef()`: Convenience function
- `validateCodeRefs()`: Batch validation function

**Integration Points:**
- **Input:** `ParsedCodeRef` from parser module
- **Output:** `ValidationResult` with errors, warnings, suggestions
- **Dependencies:** `parser/parser.ts` for `ParsedCodeRef` interface

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Parsed reference | Caller | Domain | Function parameter | `ParsedCodeRef` input |
| Validation result | Validator | Domain | Return value | `ValidationResult` object |
| Valid types | Validator | System | Code constants | `validTypes` Set |
| Valid categories | Validator | System | Code constants | `validCategories` Set |
| Valid status values | Validator | System | Code constants | `validStatusValues` Set |

**Precedence Rules:**
- Parser errors are included in validation result
- Validator adds semantic validation errors
- Warnings are non-fatal (don't prevent validation)
- Suggestions are informational (typo detection)

## 3. Data Persistence

No persistent state. Validation is stateless and idempotent.

## 4. State Lifecycle

1. **Parser Error Inclusion:** Include parser errors if `parsed.isValid === false`
2. **Type Validation:** Check type designator against valid types
3. **Path Validation:** Validate path format and non-empty requirement
4. **Element Validation:** Validate element format if present
5. **Line Validation:** Validate line numbers (positive integers, valid ranges)
6. **Block Validation:** Validate block types and identifiers
7. **Metadata Validation:** Validate metadata keys, values, categories
8. **Suggestion Generation:** Generate typo suggestions if enabled
9. **Output:** Return `ValidationResult` with errors, warnings, suggestions

## 5. Behaviors (Events & Side Effects)

### User Behaviors
- **Validate single:** `validator.validate(parsed)` — Validates one reference
- **Validate batch:** `validateCodeRefs(parsedArray)` — Validates multiple references
- **Convenience:** `validateCodeRef(parsed, options)` — Wrapper function

### System Behaviors
- **Error collection:** Collects all validation errors
- **Warning collection:** Collects non-fatal warnings
- **Suggestion generation:** Generates typo suggestions using Levenshtein distance
- **Metadata validation:** Validates categories, status values, scope values, timestamps

## 6. Event & Callback Contracts

| Event | Trigger | Payload | Side Effects |
|-------|---------|---------|--------------|
| `validate()` | Method call | `parsed: ParsedCodeRef` | Returns `ValidationResult` |
| `validateCodeRef()` | Function call | `parsed: ParsedCodeRef, options?: ValidatorOptions` | Returns `ValidationResult` |
| `validateCodeRefs()` | Function call | `parsed: ParsedCodeRef[], options?: ValidatorOptions` | Returns `ValidationResult[]` |

**Validator Options Contract:**
```typescript
interface ValidatorOptions {
  strict?: boolean;              // Default: true (strict validation)
  checkMetadata?: boolean;       // Default: true (validate metadata)
  generateSuggestions?: boolean; // Default: true (generate typo suggestions)
}
```

**ValidationResult Contract:**
```typescript
interface ValidationResult {
  isValid: boolean;              // Overall validation status
  errors: string[];              // Fatal errors
  warnings: string[];            // Non-fatal warnings
  suggestions: string[];         // Typo suggestions
}
```

## 7. Performance Considerations

**Known Limits:**
- Linear time complexity: O(n) where n = reference components
- Metadata validation: O(k) where k = metadata entries
- Levenshtein distance: O(m*n) where m,n = string lengths

**Bottlenecks:**
- Typo suggestion algorithm (Levenshtein) may be slow for large type sets
- Large metadata objects (>100 keys) may take 5-10ms
- Deep metadata nesting may slow validation

**Optimization Opportunities:**
- Cache validation results (not implemented)
- Optimize Levenshtein calculation (not implemented)
- Lazy suggestion generation (not implemented)

**Deferred Optimizations:**
- Parallel batch validation
- Streaming validation for large batches

## 8. Accessibility

Not applicable (library module, no UI).

## 9. Testing Strategy

**Must-Cover Scenarios:**
- Valid reference validation
- Invalid type designator
- Invalid path format
- Invalid element format
- Invalid line numbers
- Invalid line ranges
- Invalid block references
- Invalid metadata keys
- Invalid metadata values
- Invalid metadata categories
- Invalid status values
- Invalid scope values
- Invalid timestamp formats
- Typo suggestion generation
- Parser error inclusion
- Warning vs error distinction
- Batch validation

**Explicitly Not Tested:**
- Parser integration (tested separately)
- Formatter integration (tested separately)

## 10. Non-Goals / Out of Scope

- Reference parsing (parser responsibility)
- Reference formatting (formatter responsibility)
- Reference resolution (not implemented)
- Custom validation rules (follows specification)
- Validation rule customization (not implemented)

## 11. Common Pitfalls & Sharp Edges

**Type Validation:**
- Types are case-sensitive (e.g., `Fn` not `fn`)
- Extended types (ML, DB, SEC) allowed
- Unknown types generate errors (not warnings)

**Path Validation:**
- Path must not be empty
- Path format validated against regex pattern
- Escaped characters supported

**Element Validation:**
- Element format validated (name, dots, parameters)
- `'default'` keyword is valid
- Invalid element format generates warnings (not errors)

**Line Validation:**
- Line numbers must be positive integers
- Line ranges: start must be <= end
- Invalid line numbers generate errors

**Block Validation:**
- Block types must be valid: `function`, `if`, `else`, `try`, `catch`, `for`, `while`, `switch`, `case`, `block`
- Block identifier must not be empty
- Invalid block types generate errors

**Metadata Validation:**
- Category prefixes validated (e.g., `status:active`)
- Unknown categories generate warnings (not errors)
- Status values validated: `active`, `deprecated`, `experimental`, `legacy`, `stable`
- Scope values validated: `internal`, `public`, `private`, `protected`
- Timestamp formats validated (ISO8601)
- Relationship arrays validated (must contain strings or CodeRefs)

**Typo Suggestions:**
- Uses Levenshtein distance algorithm
- Similarity threshold: 0.6 (60% similar)
- Sorted by similarity score
- Only generated if `generateSuggestions: true`

**Error vs Warning:**
- Errors: Fatal issues (invalid type, empty path, invalid line)
- Warnings: Non-fatal issues (unknown category, unknown status value)
- Suggestions: Informational (typo detection)

**Parser Error Inclusion:**
- Parser errors automatically included in validation result
- Validator adds semantic errors on top of parser errors
- Both error sources combined in final result

## 12. Diagrams (Optional)

**Validation Pipeline:**
```
ParsedCodeRef {
  type: "Fn",
  path: "utils/logger",
  element: "logInfo",
  line: "42",
  metadata: { status: "active" },
  isValid: true,
  errors: []
}

        ↓ validate()

ValidationResult {
  isValid: true,
  errors: [],
  warnings: [],
  suggestions: []
}
```

**Error Categories:**
```
ValidationResult
  ├─ errors: Fatal issues (prevent validation)
  │   ├─ Invalid type designator
  │   ├─ Empty path
  │   ├─ Invalid line number
  │   └─ Invalid block reference
  ├─ warnings: Non-fatal issues (don't prevent validation)
  │   ├─ Unknown metadata category
  │   ├─ Unknown status value
  │   └─ Invalid timestamp format
  └─ suggestions: Informational (typo detection)
      └─ Similar type designators
```

> Diagrams are **illustrative**, not authoritative. Validation logic in code defines truth.

## Conclusion

The validator module provides comprehensive semantic validation of parsed CodeRef references, ensuring they meet CodeRef2 specification requirements. It validates types, paths, elements, line references, and metadata, providing detailed error messages, warnings, and typo suggestions. The validator is stateless, idempotent, and works seamlessly with parser output. Maintainers must preserve validation rules and error reporting behavior to ensure reference correctness across the codebase.

