---
agent: LLOYD
date: 2026-08-01
task: STUB-CC9094
subject: parser
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/parser/parser.ts
related_files:
  - src/parser/parser.ts
status: approved
---

# parser Resource Sheet

## Executive Summary

The `src/parser/parser.ts` module implements a CodeRef2 EBNF parser that transforms reference strings into structured objects according to the grammar specified in `coderef2-specification.md`. It exports two interfaces (`ParsedCodeRef`, `ParserOptions`), one class (`CodeRefParser`), and two convenience functions (`parseCodeRef`, `parseCodeRefs`). The core functionality is encapsulated within the `CodeRefParser` class, which includes a method `parse` for breaking down CodeRef strings into their constituent parts, such as type, path, element, line references, and metadata. This parser ensures that all components adhere to a strict format, providing validation errors if they do not meet the criteria specified in the grammar.

[inference] The above characterizes `src/parser/parser.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

This document is intended for developers who need to understand how to parse CodeRef strings into structured objects. It provides detailed information on the `CodeRefParser` class, which implements a parser for CodeRef2 syntax as defined in the [coderef2-specification.md](src/parser/coderef2-specification.md). The primary audience includes:

1. **Developers working on components that require parsing of CodeRef strings** - This includes tools like formatters, indexers, validators, and integration tests.

2. **Team members responsible for maintaining the parser library** - It helps them understand its implementation details and ensure compatibility with existing systems.

3. **New contributors or maintainers joining the project** - Providing a clear understanding of the parser's purpose and structure simplifies their onboarding process.

The intent is to equip these developers with the necessary knowledge to integrate, use, or modify the `CodeRefParser` effectively within their projects, ensuring accurate and reliable parsing of CodeRef strings.

[inference] The above characterizes `src/parser/parser.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `CodeRefParser` class in the `src/parser/parser.ts` module is a central component for parsing CodeRef strings into structured objects. This parser adheres to an EBNF grammar defined in `coderef2-specification.md`, which outlines the format of valid CodeRef strings.

### Control/Data Flow

1. **Constructor (`CodeRefParser`)**:
   - Initializes the parser with options such as strict mode and allowing unknown types.
   - Sets up a predefined set of valid type designators for TypeDesignator validation.

2. **Parsing Method (`parse(reference: string): ParsedCodeRef`)**:
   - The primary method that takes a CodeRef string as input and returns a `ParsedCodeRef` object.
   - It first trims the input string to remove any leading or trailing whitespace.
   - Validates if the string starts with the '@' symbol, which is mandatory for a valid CodeRef. If not, it records an error.
   - Parses the TypeDesignator by matching against the predefined set of valid types and validates its format.
   - Extracts the Path component from the remaining string and validates its format according to the defined rules.
   - Optionally parses an Element, LineReference, or Metadata block if present. Each of these components has its own validation logic.
   - After parsing all components, it checks for any trailing content that would be invalid.
   - If there are no errors during parsing, sets `isValid` to true; otherwise, records the errors.

### Key Methods and Dependencies

- **Parsing Logic**:
  - `parse(reference: string)`: Main method for parsing CodeRef strings.
  - `isValidPath(path: string)`: Validates the format of a path segment according to the EBNF grammar.
  - `isValidElement(element: string)`: Validates the format of an element according to the EBNF grammar.
  - `parseMetadata(metadataStr: string)`: Parses a metadata section into a key-value object.

- **Helper Functions**:
  - `splitMetadataEntries(str: string)`: Splits metadata entries by comma, respecting quoted strings and brackets.

### State Held

The parser maintains several pieces of state to manage the parsing process:

- **Strict Mode**: A boolean flag indicating whether the parser should enforce strict mode during validation.
- **Allow Unknown Types**: A boolean flag indicating whether the parser should allow types that are not in the predefined set.
- **Valid Type Designators**: A `Set` containing all valid type designators for quick lookup.

### Notable Decisions/Tradeoffs

- **Strict Mode**: The strict mode provides a balance between accepting more lenient input and ensuring that only strictly formatted CodeRef strings pass validation. This is configured via the `strict` option in the constructor.
- **Error Handling**: The parser records all parsing errors in the `errors` array of the returned `ParsedCodeRef`. This allows for detailed feedback on what went wrong during parsing, making it easier to debug and improve input formats.

This architecture ensures that CodeRef strings are parsed accurately and consistently according to the specified grammar, with robust error handling to provide clear insights into any issues encountered during parsing.

[inference] The above characterizes `src/parser/parser.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

### 1. Single Source of Truth
The single source of truth for the behavior in this module is `src/parser/parser.ts`. This file defines all exported entities and contains the core implementation logic.

### 2. Tests, Configs, or Fixtures
[Inference] No specific tests, configurations, or fixtures are explicitly mentioned as authoritative within the provided code snippet. It's possible that these exist outside of this module, but they are not referenced here.

### 3. Hardcoded vs. Config-Driven Values
The following values are hardcoded:
- `validTypes`: A set containing valid type designators.
- Default values for `ParserOptions` in the constructor if not provided by the user.

All other logic and parsing rules are based on the EBNF grammar defined within the module and the validation methods like `isValidPath` and `isValidElement`.

### 4. Ownership
The domain/module that owns changes to this code is likely the "Code Reference" or "Indexer" domain, given its use by several other modules such as `src/formatter/formatter.ts`, `src/indexer/index-store.ts`, etc.

Trust in the correctness of this module should be based on its internal logic and adherence to the defined EBNF grammar. The constructor options (`strict` and `allowUnknownTypes`) allow for some flexibility but are generally controlled through configuration rather than direct code edits.

## Public API / Contracts

- `ParsedCodeRef` (interface) [ref](src/parser/parser.ts#ParsedCodeRef)
- `ParserOptions` (interface) [ref](src/parser/parser.ts#ParserOptions)
- `CodeRefParser` (class) [ref](src/parser/parser.ts#CodeRefParser)
- `parseCodeRef` (function) [ref](src/parser/parser.ts#parseCodeRef)
- `parseCodeRefs` (function) [ref](src/parser/parser.ts#parseCodeRefs)

## Dependencies

_No imports recorded in the index for this module._

_Semantic header (projected): layer `parser` · capability `parser-parsed-code-ref` · version `1.0.0`_

## Risks & Edge Cases

1. **Invalid Type Designator**: The parser checks for valid type designators against a predefined set [ref](src/parser/parser.ts). If the type is not recognized and `allowUnknownTypes` is `false`, the parsing fails immediately with an error [ref](src/parser/parser.ts). However, this does not handle cases where the type designator could be valid but not yet supported in the current implementation.

2. **Empty Path**: The parser ensures that the path component is not empty after removing the @ symbol and type designator [ref](src/parser/parser.ts). If an empty path is encountered, it results in a validation error [ref](src/parser/parser.ts).

3. **Unescaped Characters in Paths**: The parser allows for escaped characters in paths, but if not properly formatted (e.g., `\\#` instead of `\#`), the validation fails [ref](src/parser/parser.ts). This could be confusing for users unfamiliar with the escaping rules.

4. **Invalid Line Reference Format**: The parser supports both line numbers and ranges (`line-number-line-end`). However, if a range is not in the correct format (e.g., `1-`), it will result in an error [ref](src/parser/parser.ts). This could be improved by adding more robust validation for ranges.

5. **Unclosed Metadata Block**: If the metadata block `{}` is unclosed, the parser will not recognize any subsequent elements or line references and will flag this as a parse error [ref](src/parser/parser.ts).

6. **Trailing Content**: Any content after the expected end of the CodeRef string will result in an error indicating unexpected trailing content [ref](src/parser/parser.ts). This ensures that only well-formed strings are accepted, but it might be too strict for certain valid formats.

7. **Complex Metadata Entries**: The parser supports metadata entries with optional categories and values (e.g., `category:key=value`). However, if the value is not properly formatted (e.g., missing quotes around a string), it will throw an error [ref](src/parser/parser.ts). This complexity could be simplified by supporting only a subset of possible formats.

8. **Strict vs Non-Strict Mode**: The parser operates in strict mode by default, which means it rejects any unrecognized type designators unless `allowUnknownTypes` is set to `true`. This might lead to issues if users expect support for types that are not currently defined.

[inference] The above characterizes `src/parser/parser.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Validation Checklist

### Intent Verification
- [ ] **Validate strict parsing**: Test the `CodeRefParser` with a string that starts with an unknown type designator and ensure it returns an error if `strict: true`. [ref](src/parser/parser.ts#CodeRefParser)
- [ ] **Test allowUnknownTypes option**: Ensure that when `allowUnknownTypes` is set to `true`, the parser does not return an error for an unknown type designator. [ref](src/parser/parser.ts#CodeRefParser)

### ParsedCodeRef Structure Verification
- [ ] **Check default values**: Verify that the `ParsedCodeRef` object has default values for all properties when no values are provided in the input string. [ref](src/parser/parser.ts#ParsedCodeRef)
- [ ] **Validate isValid property**: Ensure that the `isValid` property is set to `false` when any error occurs during parsing and that it remains `true` only if there are no errors. [ref](src/parser/parser.ts#ParsedCodeRef)

### Error Handling
- [ ] **Check for unexpected trailing content**: Verify that the parser correctly identifies and returns an error for unexpected characters at the end of the input string. [ref](src/parser/parser.ts)
- [ ] **Test JSON metadata parsing**: Ensure that the `parseMetadata` function correctly parses metadata in a JSON-like format when present in the input string. [ref](src/parser/parser.ts)

### Path and Element Validation
- [ ] **Check path validation**: Verify that the parser correctly validates paths according to the specified grammar rules, including handling of escaped characters. [ref](src/parser/parser.ts)
- [ ] **Validate element format**: Ensure that the `isValidElement` function correctly identifies valid elements with dots and parameters, as well as the 'default' keyword. [ref](src/parser/parser.ts)

### Metadata Parsing
- [ ] **Check metadata entry splitting**: Verify that the `splitMetadataEntries` function splits metadata entries by commas while respecting quoted strings. [ref](src/parser/parser.ts)
- [ ] **Test metadata value parsing**: Ensure that `parseMetadataValue` correctly parses both string and boolean values in metadata entries. [ref](src/parser/parser.ts)

### Integration Verification
- [ ] **Validate parser usage in formatter**: Check the integration of `CodeRefParser` with the `Formatter` class to ensure it is used correctly for formatting parsed code references. [ref](src/formatter/formatter.ts)
- [ ] **Test indexer usage**: Verify that the `CodeRefParser` is correctly integrated into the indexer components, such as the `IndexerService`, and that it parses code references accurately. [ref](src/indexer/indexer-service.ts)

[inference] The above characterizes `src/parser/parser.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.


