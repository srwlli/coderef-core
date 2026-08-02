---
agent: LLOYD
date: 2026-08-01
task: STUB-CC9094
subject: validator
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/validator/validator.ts
related_files:
  - src/validator/validator.ts
status: approved
---

# validator Resource Sheet

## Executive Summary

The `src/validator/validator.ts` module is a critical component responsible for validating parsed CodeRef objects against predefined specification rules. It ensures the accuracy and integrity of CodeRefs by checking type designators, paths, elements, metadata, and generating suggestions for potential typos or misconfigurations. This module uses a combination of strict validation rules and optional checks to provide comprehensive feedback on the validity of CodeRefs.

[inference] The above characterizes `src/validator/validator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

This module is intended for developers and tools that need to validate CodeRef objects according to a set of predefined rules. The primary audience includes:

1. **Internal Developers**: Engineers working on the CodeRef system or related components who need to ensure that CodeRef data conforms to specified standards.
2. **Automated Systems**: Integration tests, code analysis tools, and continuous integration pipelines that require validation of CodeRefs before processing.

The intent is to provide a robust and flexible way to validate CodeRef objects, enabling developers to catch and address issues early in the development cycle. This ensures that all CodeRef instances meet the necessary criteria for correctness and completeness, improving the reliability and maintainability of the system.

[inference] The above characterizes `src/validator/validator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `validator.ts` module provides a robust system for validating `ParsedCodeRef` objects against specified rules. The primary components include the `ValidationResult` interface, `ValidatorOptions`, `CodeRefValidator` class, and utility functions `validateCodeRef` and `validateCodeRefs`.

### Key Methods and Control Flow

The `CodeRefValidator` class contains several key methods that handle different validation aspects:

1. **Constructor**: Initializes the validator with options such as strictness, metadata checking, and suggestion generation.
2. **Validate Method**: The main method that performs all validations on a single `ParsedCodeRef`. It checks type designator, path, element, line reference, block reference, and metadata.

### Internal Mechanisms

- **Type Validation**: Checks if the provided type is one of the valid types or extended types. If not, it generates suggestions.
- **Path Validation**: Ensures that the path is non-empty and follows a specific format using a regular expression.
- **Element Validation**: Validates the element format, allowing for special cases like 'default' and elements with parameters.
- **Line Reference Validation**: Checks if the line number is positive integers and handles line ranges correctly.
- **Block Reference Validation**: Ensures that block types are within a predefined list and that block identifiers are non-empty.
- **Metadata Validation**: Iterates over metadata keys, validating categories, specific known keys like 'status' and 'scope', timestamps, and relationship arrays.

### Suggestions for Improvements

The validator uses the Levenshtein distance algorithm to suggest similar type designators when an invalid type is detected. However, this could be further optimized or enhanced based on the frequency of common typos in real-world data.

### Tradeoffs

- **Strictness Option**: The ability to toggle strict validation adds flexibility but may increase false negatives in environments with lenient coding practices.
- **Metadata Checking**: While metadata is optional, enabling it can provide valuable insights into code references' contexts and relationships. Disabling it allows for faster processing in environments where metadata consistency is not a concern.

This architecture ensures comprehensive yet flexible validation, providing detailed feedback on both errors and warnings while offering options to tailor the validation process to specific needs.

[inference] The above characterizes `src/validator/validator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

The source file that is the single source of truth for this behavior is `src/validator/validator.ts`. Tests exist and are authoritative, located in `__tests__/integration.test.ts` [ref](src/validator/validator.ts). The values such as the list of valid type designators, metadata categories, status values, and scope values are hardcoded. These include:

- 21 core type designators
- Extended types (`ML`, `DB`, `SEC`)
- Metadata categories (`status`, `significance`, etc.)
- Valid status values (`active`, `deprecated`, etc.)
- Valid scope values (`internal`, `public`, etc.)

Ownership of changes here falls to the validation domain/module. A reader must trust and edit the hardcoded values, configuration options, and logic within this file.

[inference] The above characterizes `src/validator/validator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

- `ValidationResult` (interface) [ref](src/validator/validator.ts#ValidationResult)
- `ValidatorOptions` (interface) [ref](src/validator/validator.ts#ValidatorOptions)
- `CodeRefValidator` (class) [ref](src/validator/validator.ts#CodeRefValidator)
- `validateCodeRef` (function) [ref](src/validator/validator.ts#validateCodeRef)
- `validateCodeRefs` (function) [ref](src/validator/validator.ts#validateCodeRefs)

## Dependencies

- `../parser/parser.js` [ref](src/validator/validator.ts)

_Semantic header (projected): layer `validation` · capability `validator-validation-result` · version `1.0.0`_

## Risks & Edge Cases

1. **Empty or Invalid Type Designator**:
   - If the `type` field in a `ParsedCodeRef` is empty or not found, the validator will throw an error [ref](src/validator/validator.ts). This can occur if the parser fails to correctly identify the type.

2. **Invalid Path Format**:
   - The path validation uses a regex pattern to ensure the path format adheres to certain rules [ref](src/validator/validator.ts). Paths containing invalid characters or sequences may fail this check, leading to validation errors.

3. **Element Validation Failure**:
   - If an element contains special formats like parameters (`name(params)`) or nested elements (`.subElement`), the validator checks these against a specific pattern [ref](src/validator/validator.ts). Mismatches will result in warnings, which might be ignored if `generateSuggestions` is disabled.

4. **Invalid Line or Block References**:
   - If line numbers are not positive integers or block types are unrecognized, validation errors will occur [ref](src/validator/validator.ts) and [ref](src/validator/validator.ts). This can happen with malformed input from the parser.

5. **Metadata Validation Errors**:
   - The validator checks metadata for valid categories, status values, and scope values [ref](src/validator/validator.ts). Unknown or invalid values will result in warnings. Timestamps must be in ISO8601 format, failing which a warning is generated.

6. **Relationship Arrays**:
   - If relationship arrays contain items that are not strings or valid CodeRef identifiers (starting with `@`), the validator will issue warnings [ref](src/validator/validator.ts). This could occur with malformed metadata input.

7. **Similarity Calculations for Suggestions**:
   - The similarity calculations used to suggest valid types may fail if there is no clear match, even if the type is close but not exact. This can happen with typos in type designators [ref](src/validator/validator.ts).

8. **Invalid Options Parameters**:
   - If `validateCodeRef` or `validateCodeRefs` are called with invalid options (e.g., non-boolean values for `strict`, `checkMetadata`, or `generateSuggestions`), the function will use default values, which might lead to unexpected behavior [ref](src/validator/validator.ts).

[inference] The above characterizes `src/validator/validator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Validation Checklist

1. **Constructor Options**:
   - Verify the default values for `strict`, `checkMetadata`, and `generateSuggestions` are set correctly.
     ```typescript
     // ref: src/validator/validator.ts:72
     constructor(options: ValidatorOptions = {}) {
       this.strict = options.strict ?? true;
       this.checkMetadata = options.checkMetadata ?? true;
       this.generateSuggestions = options.generateSuggestions ?? true;
     }
     ```

2. **Validation of Type Designator**:
   - Check if the type designator is valid by comparing it against predefined sets.
     ```typescript
     // ref: src/validator/validator.ts:164
     private isValidTypeDesignator(type: string): boolean {
       return this.validTypes.has(type) || this.extendedTypes.has(type);
     }
     ```

3. **Validation of Path**:
   - Ensure the path format adheres to the specified regular expression.
     ```typescript
     // ref: src/validator/validator.ts:172
     private isValidPath(path: string): boolean {
       return /^(?:[A-Za-z0-9_\-\.~%]|\\[#:\\/{}])+(?:\/(?:[A-Za-z0-9_\-\.~%]|\\[#:\\/{}])+)*$/.test(path);
     }
     ```

4. **Validation of Element**:
   - Verify the element format is either a simple name or a structured parameterized name.
     ```typescript
     // ref: src/validator/validator.ts:187
     private isValidElement(element: string): boolean {
       return /^[A-Za-z0-9_\-]+\([^)]*\)$/.test(element);
     }
     ```

5. **Validation of Line Reference**:
   - Ensure line numbers are positive integers and that if a line end is provided, it is also a positive integer.
     ```typescript
     // ref: src/validator/validator.ts:126
     if (lineNum > endNum) {
       errors.push(`Line range is invalid: ${parsed.line}-${parsed.lineEnd}. Start must be <= end`);
     }
     ```

6. **Validation of Block Reference**:
   - Confirm the block type is one of the allowed values and that a block identifier is provided.
     ```typescript
     // ref: src/validator/validator.ts:134
     if (!validBlockTypes.includes(parsed.blockType)) {
       errors.push(`Invalid block type: ${parsed.blockType}`);
     }
     ```

7. **Validation of Metadata**:
   - Ensure metadata keys adhere to the specified categories and values, including handling timestamps and relationship arrays.
     ```typescript
     // ref: src/validator/validator.ts:244
     if (key.includes('temporal') || key.includes('introduced') || key.includes('modified')) {
       if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(value)) {
         warnings.push(`Invalid timestamp format for ${key}: ${value}. Expected ISO8601`);
       }
     }
     ```

8. **Suggestion Generation**:
   - Verify that suggestions are generated when an invalid type designator is encountered.
     ```typescript
     // ref: src/validator/validator.ts:92
     if (!this.isValidTypeDesignator(parsed.type)) {
       errors.push(`Invalid type designator: ${parsed.type}`);
       if (this.generateSuggestions) {
         suggestions.push(
           `Valid types: ${Array.from(this.validTypes).join(', ')}`,
           `Extended types: ${Array.from(this.extendedTypes).join(', ')}`
         );
       }
     }
     ```

[inference] The above characterizes `src/validator/validator.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.


