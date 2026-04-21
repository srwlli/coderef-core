---
Agent: Claude Sonnet 4.5
Date: 2025-01-27
Task: DOCUMENT
---

# Errors Module — Authoritative Documentation

## Executive Summary

The errors module provides a centralized error handling system for the CodeRef codebase. It defines a base error class (`CodeRefError`) with structured error codes, error cause chains, and context information, plus specialized error classes for common failure scenarios (parsing, file operations, scanning, validation, indexing). All errors extend the base class and provide JSON serialization and user-friendly string formatting for CLI and logging integration.

## Audience & Intent

- **Markdown (this document):** Defines error class hierarchy, error codes, and error handling contracts
- **TypeScript/Code:** Implements error classes with type safety and serialization
- **Error consumers:** CLI, MCP servers, and logging systems use error codes and context

## 1. Architecture Overview

The errors module provides a hierarchical error system:

```
CodeRefError (base)
  ├─ ParseError
  ├─ FileNotFoundError
  ├─ ScanError
  ├─ ValidationError
  ├─ IndexError
  └─ GraphError (from analyzer module, re-exported)
```

**Component Structure:**
- `CodeRefError`: Base class with code, cause, context
- Specialized errors: Domain-specific error classes
- `index.ts`: Centralized exports

**Integration Points:**
- **Used by:** All core modules (parser, validator, analyzer, indexer)
- **Consumed by:** CLI error handlers, MCP servers, logging systems
- **Re-exports:** `GraphError` from analyzer module for consistency

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Error instances | Caller | Domain | Stack trace | Error object at throw site |
| Error codes | Errors module | System | Code constants | `CodeRefError.code` property |
| Error context | Caller | Domain | Error object | `CodeRefError.context` property |
| Error cause chain | Caller | Domain | Error object | `CodeRefError.cause` property |

**Precedence Rules:**
- Error message is authoritative (user-provided)
- Error code is fixed per error class (cannot be overridden)
- Context and cause are optional (provided by caller)

## 3. Data Persistence

No persistent state. Errors are ephemeral objects created at throw time.

## 4. State Lifecycle

1. **Error Creation:** Caller instantiates error with message and optional options
2. **Stack Capture:** V8 engine captures stack trace (if `Error.captureStackTrace` available)
3. **Serialization:** Error can be serialized to JSON via `toJSON()`
4. **Display:** Error can be formatted to string via `toString()`
5. **Propagation:** Error propagates through call stack until caught

## 5. Behaviors (Events & Side Effects)

### User Behaviors
- **Error instantiation:** `new CodeRefError(message, options)` — Creates error
- **JSON serialization:** `error.toJSON()` — Returns serializable object
- **String formatting:** `error.toString()` — Returns user-friendly string

### System Behaviors
- **Stack trace capture:** Automatic on instantiation (V8 engines)
- **Error chaining:** `cause` property links to original error
- **Context attachment:** `context` object provides debugging information

## 6. Event & Callback Contracts

| Event | Trigger | Payload | Side Effects |
|-------|---------|---------|--------------|
| Error instantiation | `new CodeRefError()` | `message: string, options?: CodeRefErrorOptions` | Creates error object |
| JSON serialization | `error.toJSON()` | None | Returns JSON-serializable object |
| String formatting | `error.toString()` | None | Returns formatted string |

**Error Options Contract:**
```typescript
interface CodeRefErrorOptions {
  cause?: Error;                    // Original error that caused this
  context?: Record<string, any>;    // Additional debugging context
}
```

**Specialized Error Classes:**
- `ParseError`: Code `'PARSE_ERROR'`, thrown by parser
- `FileNotFoundError`: Code `'FILE_NOT_FOUND'`, thrown when file missing
- `ScanError`: Code `'SCAN_ERROR'`, thrown by scanner
- `ValidationError`: Code `'VALIDATION_ERROR'`, thrown by validator
- `IndexError`: Code `'INDEX_ERROR'`, thrown by indexer
- `GraphError`: Code from `GraphErrorCode` enum, thrown by analyzer

## 7. Performance Considerations

**Known Limits:**
- Stack trace capture: Negligible overhead (<1ms)
- JSON serialization: O(n) where n = context size
- Error chaining: No performance impact (reference only)

**Bottlenecks:**
- Deep error chains (>10 levels) may slow serialization
- Large context objects (>1MB) may slow JSON serialization

**Optimization Opportunities:**
- Lazy stack trace capture (not implemented)
- Context size limits (not enforced)

**Deferred Optimizations:**
- Error pooling for high-frequency errors
- Async error reporting

## 8. Accessibility

Not applicable (library module, no UI).

## 9. Testing Strategy

**Must-Cover Scenarios:**
- Base error creation with message
- Error with cause chain
- Error with context object
- JSON serialization accuracy
- String formatting accuracy
- Specialized error classes
- Error code correctness
- Stack trace preservation

**Explicitly Not Tested:**
- Error recovery strategies (handled by consumers)
- Error aggregation (not implemented)

## 10. Non-Goals / Out of Scope

- Error recovery mechanisms
- Error aggregation or batching
- Error rate limiting
- Error telemetry collection
- Custom error formatters (use `toString()`)

## 11. Common Pitfalls & Sharp Edges

**Stack Trace Capture:**
- `Error.captureStackTrace` is V8-specific (Node.js, Chrome)
- Other engines may not capture stack traces correctly
- Stack traces are not guaranteed in all environments

**Error Chaining:**
- Deep chains (>10 levels) may cause serialization issues
- Circular references in context will break JSON serialization

**Context Size:**
- Large context objects (>1MB) may cause memory issues
- No size limits enforced (caller responsibility)

**Error Code Immutability:**
- Error codes are fixed per class (cannot be customized)
- Use context for additional error classification

**Re-exported Errors:**
- `GraphError` is defined in analyzer module but re-exported here
- Changes to `GraphError` require coordination with analyzer module

## 12. Diagrams (Optional)

**Error Class Hierarchy:**
```
Error (native)
  └─ CodeRefError
      ├─ ParseError
      ├─ FileNotFoundError
      ├─ ScanError
      ├─ ValidationError
      ├─ IndexError
      └─ GraphError (from analyzer, re-exported)
```

**Error Structure:**
```
CodeRefError {
  name: "CodeRefError"
  code: "CODEREF_ERROR"
  message: "User-provided message"
  stack: "Stack trace..."
  cause?: Error
  context?: { key: value }
}
```

> Diagrams are **illustrative**, not authoritative. Error class definitions in code define truth.

## Conclusion

The errors module provides a robust, hierarchical error handling system with structured error codes, error chaining, and context information. All errors extend `CodeRefError` and provide JSON serialization and user-friendly string formatting. The module centralizes error definitions for consistency across the codebase and enables programmatic error handling via error codes. Maintainers should preserve error code contracts and avoid breaking changes to error class interfaces.

