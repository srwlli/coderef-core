---
agent: LLOYD
date: 2026-08-01
task: STUB-CC9094
subject: coderef_analyze
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/cli/coderef-analyze.ts
related_files:
  - src/cli/coderef-analyze.ts
status: approved
---

# coderef_analyze Resource Sheet

## Executive Summary

The `src/cli/coderef-analyze.ts` module serves as the command-line interface for performing various analyses on a project using CodeRef's capabilities. It provides a single entry point to run different types of analyses, such as detecting project configurations, identifying API contracts, analyzing database patterns, managing npm dependencies, identifying design patterns, assessing documentation quality, detecting middleware chains and dependency injection containers, visualizing the canonical dependency graph, scoring element complexity, determining the impact of changes, traversing multi-hop relationships, generating type hierarchies, diffing API surfaces to detect breaking changes, selecting tests based on code changes, searching for structural AST patterns, enforcing dependency rules as a CI gate, identifying code clones across different passes, and composing a change dossier that summarizes potential issues with proposed changes. The module leverages various analyzers and utilities from the `src/analyzer` directory to perform these tasks, ensuring comprehensive coverage of common software development concerns.

[inference] The above characterizes `src/cli/coderef-analyze.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

The `src/cli/coderef-analyze.ts` module is a command-line tool designed for analyzing code projects. It provides various functionalities to detect and understand different aspects of the codebase, such as configuration, dependencies, design patterns, documentation, and more. This sheet aims to help developers understand how to use the tool effectively by outlining its intended audience, the reasons they would open this sheet, and what specific information or guidance they can find within it.

This module is primarily used by developers and project managers who need to assess the health, complexity, and maintainability of their codebases. They might be seeking insights into issues like unused dependencies, complex design patterns, or potential breaking changes in the API. The sheet serves as a user guide that walks through how to invoke the tool with specific parameters to achieve these goals.

By following the instructions provided in this sheet, developers can perform targeted analyses on their projects and receive detailed reports about various aspects of their code. This information is invaluable for making informed decisions about refactoring, optimizing performance, or preparing for future changes.

[inference] The above characterizes `src/cli/coderef-analyze.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `coderef-analyze` module provides a command-line interface (CLI) tool to perform various types of code analysis on a given project. The tool is designed to integrate with the broader CodeRef ecosystem, leveraging multiple analyzers and utility functions to provide comprehensive insights into different aspects of a codebase.

### Key Components and Flow

1. **Initialization and Setup**:
   - The script starts by importing necessary modules and defining constants such as `TYPES` which list all supported analysis types.
   - It defines the `printHelp` function, which outputs usage instructions for the CLI tool.

2. **File Collection**:
   - The `collectTsFiles` function asynchronously collects all TypeScript files (`*.ts`, `*.tsx`) from a specified project directory.

3. **Loading and Parsing the Canonical Graph**:
   - The `loadEngineOrExit` function attempts to load the canonical graph for the project using `loadCanonicalGraph`. If the graph is absent, it prints an error message and exits with a hint to run the `populate` pipeline.

4. **Element Data Preparation**:
   - The `canonicalElements` function projects nodes from the canonical graph into an array of `ElementData` objects. These objects are tailored for further analysis by tools like `ComplexityScorer` and `analyzeMiddlewareAndDI`.

5. **Main Functionality**:
   - The `main` function orchestrates the entire analysis process:
     - It parses command-line arguments using `parseArgs`.
     - Depending on the specified analysis type (`--type`), it calls specific functions to perform the requested analysis.
     - For example, if `--type=impact`, it computes the blast radius for a changed element identified by `--element`.

### Analysis Types and Their Handlers

The module supports multiple types of analyses, each implemented as a separate function:
- **config**: Detects project configuration files (e.g., `tsconfig.json`, `package.json`).
- **contract**: Analyzes API contracts using tools like OpenAPI or GraphQL.
- **db**: Identifies database patterns and ORM usage.
- **dependency**: Evaluates the health of npm dependencies.
- **pattern**: Detects design patterns in the codebase.
- **docs**: Assesses documentation coverage and quality.
- **middleware**: Identifies middleware chains and dependency injection containers.
- **graph**: Prints statistics about the canonical dependency graph.
- **complexity**: Scores the complexity of individual elements.
- **impact**: Computes the blast radius for a changed element.
- **multi-hop**: Traverses relationships in the codebase up to a specified depth.
- **type-hierarchy**: Generates class/interface hierarchies.
- **breaking-changes**: Compares API surfaces between snapshots.
- **tests-for-change**: Maps git diffs to relevant test files.
- **ast-search**: Searches for AST patterns using tree-sitter queries.
- **dependency-rules**: Checks adherence to architecture rules.
- **clones**: Identifies code clones based on structural and lexical similarity.
- **change-dossier**: Prepares a comprehensive pre-flight envelope for proposed changes.

### Error Handling and Exit Codes

The script includes basic error handling, printing messages to the console when an analysis fails or an unexpected condition occurs. For certain types of analyses (e.g., `dependency-rules` with the `--gate` option), it uses non-zero exit codes to indicate failures that may be relevant for continuous integration processes.

### Example Usage

The script provides a usage example at the top, demonstrating how to run different analysis types and specify various options. This helps users understand how to interact with the tool effectively.

Overall, the `coderef-analyze` module is designed as a flexible, extensible CLI tool that can be easily integrated into development workflows, providing deep insights into code quality, dependencies, and architecture adherence through various specialized analyses.

[inference] The above characterizes `src/cli/coderef-analyze.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

This module is the single source of truth for the `coderef-analyze` command-line interface (CLI) tool. It provides a mechanism to run specific analysis passes on a project, such as detecting project configuration, API contracts, database patterns, dependency health, design patterns, documentation coverage, middleware chains, dependency rules, and more.

The module imports 33 dependencies, including various analyzers and helper functions from other modules within the CodeRef ecosystem. These dependencies are crucial for performing the specific types of analysis required by the `coderef-analyze` command.

The source code contains hardcoded values such as the list of supported analysis types (`TYPES`). These types define the capabilities of the tool and dictate which analysis passes can be executed.

Ownership of changes to this module is held by the `cli` domain/module, ensuring that any modifications or additions to the analysis logic are made in a consistent and cohesive manner with the rest of the CLI tools in the CodeRef ecosystem. The primary interface for interacting with this module is through its command-line options, which allow users to specify the project path, analysis type, and other parameters as needed.

Testing is handled by a combination of unit tests and integration tests. There are no specific fixtures or external configuration files that govern the behavior of this module beyond the hardcoded values and dependencies it imports. The tests ensure that the various analyzers and helper functions work correctly in isolation and together when invoked by the `main` function.

[inference] The above characterizes `src/cli/coderef-analyze.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

_No exported elements in the index for this module._

## Dependencies

- `node:util` [ref](src/cli/coderef-analyze.ts)
- `../analyzer/config-analyzer.js` [ref](src/cli/coderef-analyze.ts)
- `../analyzer/contract-detector.js` [ref](src/cli/coderef-analyze.ts)
- `../analyzer/database-detector.js` [ref](src/cli/coderef-analyze.ts)
- `../analyzer/dependency-analyzer.js` [ref](src/cli/coderef-analyze.ts)
- `../analyzer/design-pattern-detector.js` [ref](src/cli/coderef-analyze.ts)
- `../analyzer/docs-analyzer.js` [ref](src/cli/coderef-analyze.ts)
- `../analyzer/middleware-detector.js` [ref](src/cli/coderef-analyze.ts)
- `../context/complexity-scorer.js` [ref](src/cli/coderef-analyze.ts)
- `../query/canonical-graph.js` [ref](src/cli/coderef-analyze.ts)
- `../types/types.js` [ref](src/cli/coderef-analyze.ts)
- `../pipeline/element-taxonomy.js` [ref](src/cli/coderef-analyze.ts)
- `node:fs/promises` [ref](src/cli/coderef-analyze.ts)
- `node:path` [ref](src/cli/coderef-analyze.ts)
- `node:child_process` [ref](src/cli/coderef-analyze.ts)
- `../query/tests-for-change.js` [ref](src/cli/coderef-analyze.ts)
- `../query/change-dossier.js` [ref](src/cli/coderef-analyze.ts)
- `../query/changed-elements.js` [ref](src/cli/coderef-analyze.ts)
- `../map/graph-analytics.js` [ref](src/cli/coderef-analyze.ts)
- `../search/ast-search.js` [ref](src/cli/coderef-analyze.ts)
- `../search/language-files.js` [ref](src/cli/coderef-analyze.ts)
- `../query/type-hierarchy.js` [ref](src/cli/coderef-analyze.ts)
- `node:url` [ref](src/cli/coderef-analyze.ts)
- `node:fs` [ref](src/cli/coderef-analyze.ts)
- `../query/api-diff.js` [ref](src/cli/coderef-analyze.ts)
- `../query/dependency-rules.js` [ref](src/cli/coderef-analyze.ts)
- `../query/docstrings.js` [ref](src/cli/coderef-analyze.ts)
- `../query/clones.js` [ref](src/cli/coderef-analyze.ts)
- `../integration/scip/scip-schema.js` [ref](src/cli/coderef-analyze.ts)
- `../query/scip-resolution-delta.js` [ref](src/cli/coderef-analyze.ts)
- `node:fs` [ref](src/cli/coderef-analyze.ts)
- `node:fs` [ref](src/cli/coderef-analyze.ts)
- `node:fs` [ref](src/cli/coderef-analyze.ts)

_Semantic header (projected): layer `cli` · capability `cli-coderef-analyze` · version `1.0.0`_

## Risks & Edge Cases

### Missing or Corrupted Configuration
- **Failure Mode:** The module assumes the presence of a `canonical-graph.json` file. If this file is missing, the script will exit with an error message instructing to run `populate` first [ref](src/cli/coderef-analyze.ts).
- **Handling:** The script catches and logs errors related to loading the canonical graph, then exits with a non-zero status.

### Invalid or Malformed Input
- **Failure Mode:** If the input parameters are invalid (e.g., unknown analysis types, malformed file paths), the script may fail or produce incorrect results.
- **Handling:** No specific handling for invalid input is evident. The script relies on the `parseArgs` function to handle validation, but this is not explicitly documented.

### Missing Dependencies
- **Failure Mode:** The script depends on various modules and libraries (e.g., `node:util`, custom analyzers). If any of these dependencies are missing or incompatible, the script will fail.
- **Handling:** No specific handling for missing dependencies is evident. The script assumes all dependencies are available without checking.

### File System Errors
- **Failure Mode:** The script reads files and directories from the file system. Errors such as permission issues, non-existent paths, or read failures can occur.
- **Handling:** The script uses `node:fs/promises` for asynchronous file operations, which can throw errors. However, there is no explicit error handling to manage these cases gracefully.

### Performance Issues
- **Failure Mode:** For large projects with many files and complex dependency graphs, the script may encounter performance issues, especially during the analysis phases.
- **Handling:** No specific optimizations or batching strategies are evident to mitigate performance bottlenecks.

### Environment-Specific Issues
- **Failure Mode:** The script uses environment-specific utilities like `node:child_process` for subprocess execution. Issues related to the environment (e.g., missing tools, incompatible system libraries) can cause failures.
- **Handling:** No specific error handling or fallback mechanisms are evident for these cases.

### Data Integrity Issues
- **Failure Mode:** If the data in `canonical-graph.json` is corrupted or inconsistent, the script may produce incorrect results.
- **Handling:** The script assumes the integrity of the input data without validation. Any inconsistencies can lead to unexpected behavior or errors during analysis.

### Dependency Rule Violations
- **Failure Mode:** If dependency rules are violated (e.g., forbidden layer pairs), the script will exit with a non-zero status when `--gate` is used.
- **Handling:** The script provides feedback on dependency rule violations, but it does not handle them in a way that allows for graceful recovery or alternative processing.

[inference] The above characterizes `src/cli/coderef-analyze.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Validation Checklist

1. **Project Path is Required**: Ensure the `--project` option points to an existing directory [ref](src/cli/coderef-analyze.ts).

2. **Analysis Type is Required**: Verify that the `--type` option specifies a valid analysis type (e.g., `config`, `contract`, etc.) [ref](src/cli/coderef-analyze.ts).

3. **Output Format Option**: Confirm that the `--output` option can be set to either `json` or `text`, with `text` being the default [ref](src/cli/coderef-analyze.ts).

4. **Element ID for Impact Analysis**: When the analysis type is `impact`, validate that the `--element` option specifies a valid element ID [ref](src/cli/coderef-analyze.ts).

5. **Depth Option for Multi-hop Analysis**: Ensure that the `--depth` option can accept a numeric value, with a default of 5 if not specified [ref](src/cli/coderef-analyze.ts).

6. **Baseline Snapshot Label or Path**: For the `breaking-changes` analysis type, verify that the `--from` option correctly specifies a baseline manifest snapshot label or path [ref](src/cli/coderef-analyze.ts).

7. **Snapshot Current Exports for Breaking Changes**: Check that when using the `--to` option with the `breaking-changes` analysis type, the current exports are correctly snapshotted and used for comparison [ref](src/cli/coderef-analyze.ts).

8. **Git Ref for Tests for Change**: Confirm that the `--ref` option can accept a Git ref to diff against, defaulting to `HEAD` if not specified [ref](src/cli/coderef-analyze.ts).

9. **Source Language Extension**: When using the `ast-search` analysis type, validate that the `--lang` option specifies a valid source language extension (e.g., `ts`, `js`, etc.) [ref](src/cli/coderef-analyze.ts:47].

10. **Tree-sitter Query for AST Search**: Ensure that the `--query` option is required when using the `ast-search` analysis type, and validate that it correctly parses as a tree-sitter S-expression query [ref](src/cli/coderef-analyze.ts).

11. **Max Results for AST Search**: Confirm that the `--limit` option can accept a numeric value, with a default of 100 if not specified, and does not affect results beyond this limit [ref](src/cli/coderef-analyze.ts).

12. **Dependency Rule Violation Gate**: When using the `dependency-rules` analysis type with the `--gate` option, verify that the script exits with code 2 on any dependency rule violation [ref](src/cli/coderef-analyze.ts).

13. **Clone Detection Pass**: For the `clones` analysis type, validate that the `--pass` option can accept one of three values (`structural`, `lexical`, or `near_miss`) with `structural` being the default [ref](src/cli/coderef-analyze.ts).

14. **Minimum Group Size for Clones**: Ensure that the `--min-group-size` option can accept a numeric value, with a default of 2 if not specified, and does not affect results below this threshold [ref](src/cli/coderef-analyze.ts).

15. **Similarity Threshold for Clones**: Confirm that the `--similarity-threshold` option can accept a float value in the range [0,1], with a default of 0.9 if not specified [ref](src/cli/coderef-analyze.ts).

16. **Minimum Body Length for Lexical/Near Miss Clones**: Ensure that the `--min-body-length` option can accept a numeric value, with a default of 0 if not specified [ref](src/cli/coderef-analyze.ts).

17. **LSP Type Search Option**: Verify that the script handles invalid queries gracefully by returning a reason of "invalid_query" when a malformed query is used with the `ast-search` analysis type [ref](src/cli/coderef-analyze.ts).

[inference] The above characterizes `src/cli/coderef-analyze.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

