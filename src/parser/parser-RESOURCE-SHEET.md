---
Agent: Claude Sonnet 4.5
Date: 2025-01-27
Task: DOCUMENT
---

# Parser Module — Authoritative Documentation

## Executive Summary

The parser module implements the CodeRef2 EBNF grammar parser, converting reference strings (e.g., `@Fn/utils/logger#logInfo:42{status=active}`) into structured `ParsedCodeRef` objects. It validates syntax, extracts components (type, path, element, line, metadata), and provides detailed error reporting. The parser follows the specification grammar (lines 422-451) and supports all 21 core type designators plus extended types (ML, DB, SEC).

## Audience & Intent

- **Markdown (this document):** Defines parsing grammar, validation rules, and error handling contracts
- **TypeScript/Code:** Implements EBNF grammar parser with strict validation
- **Validator integration:** Parser output feeds into validator for semantic validation

## 1. Architecture Overview

The parser module provides EBNF-based parsing of CodeRef reference strings:

```
CodeRef String → CodeRefParser.parse() → ParsedCodeRef
```

**Component Structure:**
- `CodeRefParser`: Main parser class
- `parse()`: Primary parsing method
- `isValidPath()`: Path validation
- `isValidElement()`: Element validation
- `parseMetadata()`: Metadata parsing
- `parser`: Singleton instance
- `parseCodeRef()`: Convenience function
- `parseCodeRefs()`: Batch parsing function

**Integration Points:**
- **Input:** CodeRef string (e.g., `"@Fn/utils/logger#logInfo:42"`)
- **Output:** `ParsedCodeRef` object
- **Dependencies:** None (standalone parser)

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Reference string | Caller | Domain | Function parameter | Input string |
| Parsed result | Parser | Domain | Return value | `ParsedCodeRef` object |
| Validation errors | Parser | Domain | `ParsedCodeRef.errors` | Error array in result |
| Type designators | Parser | System | Code constants | `validTypes` Set |

**Precedence Rules:**
- Input string is authoritative source
- Parser applies deterministic grammar rules
- Invalid syntax results in `isValid: false` with error messages
- Unknown types allowed if `allowUnknownTypes: true`

## 3. Data Persistence

No persistent state. Parsing is stateless and idempotent.

## 4. State Lifecycle

1. **Input Validation:** Verify string starts with `@`
2. **Type Parsing:** Extract type designator (must match valid types)
3. **Path Parsing:** Extract path segment (until `#`, `:`, `{`, or end)
4. **Element Parsing:** Extract element if `#` present
5. **Line Parsing:** Extract line reference if `:` present (number or block)
6. **Metadata Parsing:** Extract metadata if `{` present
7. **Trailing Content Check:** Verify no unexpected characters
8. **Output:** Return `ParsedCodeRef` with validation status

## 5. Behaviors (Events & Side Effects)

### User Behaviors
- **Parse single:** `parser.parse(reference)` — Parses one reference
- **Parse batch:** `parseCodeRefs(references)` — Parses multiple references
- **Convenience:** `parseCodeRef(reference, options)` — Wrapper function

### System Behaviors
- **Type validation:** Checks against valid types set
- **Path validation:** Validates path segment format
- **Element validation:** Validates element format
- **Metadata parsing:** Parses key-value pairs or JSON
- **Error collection:** Collects all errors, continues parsing when possible

## 6. Event & Callback Contracts

| Event | Trigger | Payload | Side Effects |
|-------|---------|---------|--------------|
| `parse()` | Method call | `reference: string` | Returns `ParsedCodeRef` |
| `parseCodeRef()` | Function call | `reference: string, options?: ParserOptions` | Returns `ParsedCodeRef` |
| `parseCodeRefs()` | Function call | `references: string[], options?: ParserOptions` | Returns `ParsedCodeRef[]` |

**Parser Options Contract:**
```typescript
interface ParserOptions {
  strict?: boolean;              // Default: true (reject unknown types)
  allowUnknownTypes?: boolean;    // Default: false (allow unknown types)
}
```

**ParsedCodeRef Contract:**
```typescript
interface ParsedCodeRef {
  type: string;                  // Type designator
  path: string;                  // Path segment
  element?: string;              // Element name (if # present)
  line?: string;                 // Line number (if : present)
  lineEnd?: string;              // Line range end (if - present)
  blockType?: string;            // Block type (if block reference)
  blockIdentifier?: string;      // Block identifier (if block reference)
  metadata?: Record<string, any>; // Metadata object (if { present)
  isValid: boolean;              // Validation status
  errors: string[];              // Error messages
}
```

## 7. Performance Considerations

**Known Limits:**
- Linear time complexity: O(n) where n = reference string length
- Metadata parsing: O(k) where k = metadata entries
- Regex matching: O(m) where m = pattern length

**Bottlenecks:**
- Complex metadata with nested structures may take 1-2ms
- Large metadata blocks (>1KB) may slow parsing

**Optimization Opportunities:**
- Cache parsed results (not implemented)
- Lazy metadata parsing (not implemented)

**Deferred Optimizations:**
- Streaming parser for large batches
- Parallel batch processing

## 8. Accessibility

Not applicable (library module, no UI).

## 9. Testing Strategy

**Must-Cover Scenarios:**
- Basic reference parsing (type, path, element, line)
- Type validation (valid and invalid types)
- Path validation (valid and invalid paths)
- Element validation (valid and invalid elements)
- Line reference parsing (number, range, block)
- Metadata parsing (key-value, JSON, arrays, objects)
- Error collection and reporting
- Unknown type handling
- Strict vs non-strict mode
- Trailing content detection
- Batch parsing

**Explicitly Not Tested:**
- Semantic validation (validator responsibility)
- Reference formatting (formatter responsibility)

## 10. Non-Goals / Out of Scope

- Semantic validation (validator responsibility)
- Reference formatting (formatter responsibility)
- Reference resolution (not implemented)
- Custom grammar extensions (follows specification)
- Incremental parsing (not implemented)

## 11. Common Pitfalls & Sharp Edges

**Type Validation:**
- Types are case-sensitive (e.g., `Fn` not `fn`)
- Unknown types rejected in strict mode
- Extended types (ML, DB, SEC) allowed if configured

**Path Parsing:**
- Path must not be empty
- Path segments validated against pattern: `[A-Za-z0-9_\-\.~%]+` or escaped chars
- Escaped characters: `\[#:\/{}]`

**Element Parsing:**
- Element can be `'default'` keyword
- Element can have parameters: `name(params)`
- Element can have dots: `name.subElement`
- Element validated against pattern

**Line Reference:**
- Line numbers must be positive integers
- Line ranges: `start-end` where start <= end
- Block references: `blockType{identifier}`

**Metadata Parsing:**
- Metadata can be JSON object or key-value pairs
- Key-value format: `key=value` or `category:key=value`
- Values can be strings, numbers, booleans, arrays, objects
- Arrays formatted as `[item1,item2]`
- Strings with special chars must be quoted

**Error Handling:**
- Parser collects all errors, doesn't stop on first error
- Invalid references return `isValid: false` with error array
- Partial parsing may succeed even with errors

**Windows Path Handling:**
- Paths with colons (e.g., `C:/path`) handled correctly
- Escaped colons in paths supported

## 12. Diagrams (Optional)

**Parsing Pipeline:**
```
"@Fn/utils/logger#logInfo:42{status=active}"
  ↓ parse()
  {
    type: "Fn",
    path: "utils/logger",
    element: "logInfo",
    line: "42",
    metadata: { status: "active" },
    isValid: true,
    errors: []
  }
```

**Grammar Structure:**
```
CodeRef ::= '@' TypeDesignator '/' Path ('#' Element)? (':' LineReference)? ('{' Metadata '}')?
TypeDesignator ::= [A-Z][A-Za-z0-9]*
Path ::= PathSegment ('/' PathSegment)*
Element ::= ElementName ('.' SubElement)* | ElementWithParams | 'default'
LineReference ::= LineNumber ('-' LineNumber)? | BlockReference
Metadata ::= MetadataEntry (',' MetadataEntry)*
```

> Diagrams are **illustrative**, not authoritative. Parser implementation in code defines truth.

## Conclusion

The parser module provides robust EBNF-based parsing of CodeRef reference strings, converting them into structured `ParsedCodeRef` objects with comprehensive error reporting. It follows the CodeRef2 specification grammar and supports all core and extended type designators. The parser is stateless, idempotent, and provides detailed error messages for invalid input. Maintainers must preserve grammar contracts and error reporting behavior to ensure compatibility with validators and formatters.

