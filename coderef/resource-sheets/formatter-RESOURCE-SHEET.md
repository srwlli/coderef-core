---
agent: LLOYD
date: 2026-08-01
task: STUB-CC9094
subject: formatter
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/formatter/formatter.ts
related_files:
  - src/formatter/formatter.ts
status: approved
---

# formatter Resource Sheet

## Executive Summary

The `src/formatter/formatter.ts` module implements a CodeRef2 Reference Formatter that converts parsed CodeRef objects into standardized, canonical strings according to specified rules. This process includes normalizing paths, sorting metadata keys alphabetically, standardizing boolean values, and ensuring consistent quoting of string metadata. The module is structured around the `CodeRefFormatter` class, which provides methods for formatting a single reference (`format`) and batch formatting multiple references (`formatCodeRefs`). Additionally, it exposes a convenience function `formatCodeRef` to format individual parsed CodeRefs directly.

[inference] The above characterizes `src/formatter/formatter.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

This module is designed for developers working with CodeRef references in their codebases. The audience includes anyone who needs to normalize and format CodeRef references according to a specific set of rules. This could be developers building IDE features, tools that manipulate or analyze code, or anyone involved in the documentation and version control of code references.

The intent here is to provide a standardized way to handle CodeRef references across different parts of an application. By using this module, developers can ensure that their references are consistently formatted, reducing potential errors and inconsistencies that could arise from manual formatting.

[inference] The above characterizes `src/formatter/formatter.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `src/formatter/formatter.ts` module implements a CodeRef2 Reference Formatter, responsible for formatting and normalizing CodeRef references into their canonical form as specified in the reference documentation (lines 466-471).

At its core, the formatter operates through a class named `CodeRefFormatter`, which encapsulates the logic for formatting individual CodeRef references. The primary method within this class is `format(parsed: ParsedCodeRef): string`, which takes a parsed CodeRef object and returns a formatted string representation of it.

The formatting process involves several key steps:
1. **Validation**: Before proceeding, the formatter checks if the parsed CodeRef is valid. If not, it throws an error detailing the validation issues [ref](src/formatter/formatter.ts).
2. **Normalization**: The path segment of the CodeRef is normalized by removing redundant segments such as `.` (current directory) and `..` (parent directory) [ref](src/formatter/formatter.ts).
3. **Metadata Formatting**: If metadata exists, it is formatted to ensure that keys are sorted alphabetically and values adhere to specific formatting rules. This includes converting boolean values to lowercase and quoting strings with special characters or empty strings [ref](src/formatter/formatter.ts).

Additionally, the module provides utility functions for convenience:
- `formatCodeRef(parsed: ParsedCodeRef): string`: A function that uses a singleton instance of `CodeRefFormatter` to format a single parsed CodeRef.
- `formatCodeRefs(parsed: ParsedCodeRef[]): string[]`: A batch formatting function that applies the formatter to an array of parsed CodeRef objects and returns an array of formatted strings.

This design ensures that the module is modular, with clear separation between the core formatting logic within `CodeRefFormatter` and the utility functions for easy integration and usage.

[inference] The above characterizes `src/formatter/formatter.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

This section addresses what the source of truth is for the `formatter.ts` module, including where authoritative information can be found and how changes should be managed.

1. **Source Files**: The single source of truth for this behavior is the file itself, `src/formatter/formatter.ts`. This file contains the `CodeRefFormatter` class and the exported constants and functions (`formatter`, `formatCodeRef`, `formatCodeRefs`) and their implementations, ensuring that any modifications to these behaviors must occur within this file.

2. **Tests**: Tests exist and are authoritative for validating the correctness of the code. The integration tests located in `__tests__/integration.test.ts` provide concrete examples and scenarios that the formatter implementation must pass. This ensures that changes are made with confidence in their accuracy.

3. **Hardcoded vs. Configurable Values**:
   - **Hardcoded**: There are no hardcoded values or thresholds in this file. All configurations, such as path normalization rules and metadata formatting, are hard-coded within the logic.
   - **Configurable**: The configuration is driven by the input data (`ParsedCodeRef`) rather than being set through external means.

4. **Ownership**: Changes to this module should be managed by the domain or module that owns `formatter.ts`. This typically includes developers who specialize in code reference formatting and parsing. They are responsible for maintaining and evolving the formatter logic based on business requirements and technical advancements.

[inference] The above characterizes `src/formatter/formatter.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

- `CodeRefFormatter` (class) [ref](src/formatter/formatter.ts#CodeRefFormatter)
- `formatCodeRef` (function) [ref](src/formatter/formatter.ts#formatCodeRef)
- `formatCodeRefs` (function) [ref](src/formatter/formatter.ts#formatCodeRefs)

## Dependencies

- `../parser/parser.js` [ref](src/formatter/formatter.ts)

_Semantic header (projected): layer `formatter` · capability `formatter-code-ref-formatter` · version `1.0.0`_

## Risks & Edge Cases

1. **Invalid CodeRefs**: If a `ParsedCodeRef` is invalid or contains errors, the `format` method will throw an error [ref](src/formatter/formatter.ts). This could cause issues in client code if not handled properly.

2. **Empty Metadata Values**: Boolean values are correctly formatted to lowercase (`true`, `false`). However, metadata entries with empty strings or `null/undefined` values are omitted from the output. This might be unexpected behavior for clients expecting these values to be present [ref](src/formatter/formatter.ts).

3. **Special Characters in Metadata Strings**: The `formatMetadataValue` method quotes strings that contain special characters (`,={},#:\[\]`) or are empty [ref](src/formatter/formatter.ts). This ensures correctness but may not be desired for all use cases, especially if the output needs to be compatible with certain systems.

4. **Array Formatting**: Arrays in metadata are formatted as JSON strings, which might not always be desirable. For example, `[true, false]` is formatted as `"[true,false]"`. This could lead to issues when parsing back into a structured format [ref](src/formatter/formatter.ts).

5. **Boolean Values in Metadata**: Boolean values are directly used as keys when the corresponding value is `true`, and omitted otherwise. This might not be intuitive for clients expecting a consistent representation of boolean metadata.

6. **Empty Paths**: The `normalizePath` method removes redundant segments from paths, including `.`, but does not handle empty paths gracefully. If an empty path is provided, it will result in an invalid output [ref](src/formatter/formatter.ts).

7. **Block Type and Identifier Consistency**: When `parsed.line` is set AND both `blockType` and `blockIdentifier` are present, they are formatted as `:${blockType}{${blockIdentifier}}`. If `parsed.line` is set but only a line number (not a block reference) is present, it will be formatted as `:${parsed.line}` (with optional `-${parsed.lineEnd}`). If `parsed.line` is not set, neither block references nor line ranges are emitted, which could lead to unexpected output for CodeRefs that only carry block information without a line value [ref](src/formatter/formatter.ts).

8. **Performance with Large Metadata**: The current implementation sorts metadata keys alphabetically and formats each entry individually. For very large objects or arrays in metadata, this could result in performance issues [inference].

## Validation Checklist

1. **Verify that `formatCodeRef` and `formatCodeRefs` correctly utilize the `CodeRefFormatter` class**:
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)

2. **Confirm that an invalid `ParsedCodeRef` throws an error when passed to `formatCodeRef` or `formatCodeRefs`**:
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)

3. **Check that paths are normalized by removing redundant segments and handling `..` and `.` correctly**:
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)

4. **Ensure that metadata keys are alphabetically sorted**:
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)

5. **Validate that boolean values are formatted as lowercase (`true` and `false`)**:
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)

6. **Check that metadata strings are quoted if they contain special characters or are empty**:
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)

7. **Ensure arrays in metadata are formatted correctly, quoting string items with special characters**:
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)

8. **Verify that the `formatter` instance is correctly exported for public use and is utilized by both `formatCodeRef` and `formatCodeRefs`**:
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)
   - [ref](src/formatter/formatter.ts)

[inference] The above characterizes `src/formatter/formatter.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.


