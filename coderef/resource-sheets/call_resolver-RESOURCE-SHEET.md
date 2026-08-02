---
agent: LLOYD
date: 2026-08-01
task: STUB-CC9094
subject: call_resolver
parent_project: coderef-core
category: module
version: 1.0.0
documents: src/pipeline/call-resolver.ts
related_files:
  - src/pipeline/call-resolver.ts
status: approved
---

# call_resolver Resource Sheet

## Executive Summary

The `call-resolver.ts` module is a core component of the Phase 4 Call Resolver, which performs two-pass resolution of method calls within project files. The primary responsibility is to classify each call into one of five categories: resolved, unresolved, ambiguous, external, or builtin, based on receiver text, scope path, and symbol table lookups. This ensures that every raw call fact is processed exactly once, maintaining deterministic and pure results over `PipelineState`.

[inference] The above characterizes `src/pipeline/call-resolver.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

This document is intended for developers and engineers involved in the Phase 4 Call Resolver component of a software project. The primary audience includes those who are tasked with understanding, modifying, or extending the functionality of this module.

The intent of this documentation sheet is to provide a comprehensive guide to help stakeholders make informed decisions about interacting with and integrating the Call Resolver into their workflows. It details the specific APIs, dependencies, and invariants that the Call Resolver adheres to, ensuring clarity on how the component operates within the broader system architecture.

[inference] The above characterizes `src/pipeline/call-resolver.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `CallResolver` module [ref](src/pipeline/call-resolver.ts) is designed to perform a two-pass resolution of calls within a project. The primary goal is to classify each call as either resolved, unresolved, ambiguous, external, or builtin, ensuring that the resolution process is deterministic and does not alter the state of the pipeline.

### Architecture / Behavior

The `CallResolver` operates in two distinct phases: **Pass 1 (buildSymbolTable)** and **Pass 2 (resolveCallsAgainstTable)**. Each phase serves a specific purpose and is executed in sequence to achieve the desired outcomes.

#### Pass 1: buildSymbolTable [ref](src/pipeline/call-resolver.ts)

- **Purpose**: The first pass constructs a project-wide symbol table that indexes every element (function, class, constant) and imported binding across all files. This table is crucial for resolving calls in the second phase.

- **Process**:
  - The `buildSymbolTable` function iterates over each file in the pipeline state.
  - It collects symbols from `PipelineState.element`, `RawCallFact.sourceElementCandidate`, and `ImportResolution.localName`.
  - Each symbol is added to a `Map<string, SymbolTableEntry[]>`, where the key is the symbol's name. This allows for multi-valued entries due to potential duplicates across files.
  - The symbol table includes details such as `codeRefId`, `name`, `sourceFile`, and `scope`.

- **Invariants**:
  - All elements must be indexed by their unique names [AC-01].
  - Duplicate symbols are handled gracefully, leading to ambiguous resolutions.

#### Pass 2: resolveCallsAgainstTable [ref](src/pipeline/call-resolver.ts)

- **Purpose**: The second pass uses the constructed symbol table to classify each call fact (`RawCallFact`) into one of five categories: resolved, unresolved, ambiguous, external, or builtin.

- **Process**:
  - For each `RawCallFact`, the `resolveCallsAgainstTable` function classifies it based on the receiver text, scope path, and the symbol table.
  - Built-in receivers are identified using a whitelist (`BUILTIN_RECEIVERS`) and classified as 'builtin'.
  - Calls to imported symbols are resolved through `ImportResolution.localName`.
  - The resolution process does not mutate the pipeline state, ensuring that it remains pure and deterministic.

- **Invariants**:
  - Every call fact must produce exactly one classification [AC-01].
  - Unresolvable calls (unresolved or ambiguous) are handled explicitly.
  - Built-in receivers do not produce project graph edges [AC-02].

### Key Methods and Their Interactions

- **buildSymbolTable**: This method constructs the symbol table by iterating over all relevant elements in the pipeline state. It uses a `Map` to index symbols by their names, handling duplicates gracefully.

- **resolveCallsAgainstTable**: This function takes each call fact and classifies it using the symbol table. It checks against built-in receiver lists and imported symbols, ensuring that all calls are correctly resolved.

### External Dependencies

The module relies on several external dependencies:
- `BUILTIN_RECEIVERS`: A set of JavaScript/Node.js global functions that classify as 'builtin'.
- `JS_GLOBAL_CALLEES`: A set of Python global functions that also classify as 'builtin'.
- `PYTHON_BUILTIN_CALLEES`: A set of Python builtin functions.

These sets ensure that calls to these specific functions are correctly classified, regardless of the project's current state.

### Summary

The `CallResolver` module is designed to efficiently and accurately resolve calls within a project. It achieves this through two distinct phases: symbol table construction and resolution against that table. Each phase ensures deterministic behavior and handles edge cases appropriately, such as resolving built-in functions and handling ambiguous symbols. The module's design ensures that it remains robust and reliable for various project sizes and structures.

[inference] The above characterizes `src/pipeline/call-resolver.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

The primary source file for this behavior is `src/pipeline/call-resolver.ts`. The following are verified facts based on the code index:

1. **Single Source of Truth**: The source file itself (`src/pipeline/call-resolver.ts`) contains all necessary declarations and implementations for the call resolution process. It includes types, interfaces, constants, and functions that define how calls are classified and resolved.

2. **Tests Exist and Are Authoritative**: There are multiple test files in the `__tests__/pipeline` directory that cover different aspects of the call resolution logic. These tests (`call-resolution-determinism.test.ts`, `call-resolution-pre-phase3-assertion.test.ts`, `call-resolution-two-pass-ordering.test.ts`, `call-resolver-current-scope-coderef-id.test.ts`) are authoritative and ensure that the implementation behaves as expected.

3. **Hardcoded Values vs. Config-driven Values**: The built-in receiver allowlist (`BUILTIN_RECEIVERS`), JS global callees (`JS_GLOBAL_CALLEES`), and Python builtin callees (`PYTHON_BUILTIN_CALLEES`) are hardcoded constants within the source file. These values are intended to be immutable and are used to classify calls based on specific criteria.

4. **Ownership**: The changes and updates to this module should be made by the domain/module responsible for call resolution in the pipeline. This ensures that any modifications align with the broader architecture and follow established patterns and invariants.

[inference] The above characterizes `src/pipeline/call-resolver.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

- `CallResolutionKind` (type) [ref](src/pipeline/call-resolver.ts)
- `CallResolution` (interface) [ref](src/pipeline/call-resolver.ts)
- `SymbolTableEntry` (interface) [ref](src/pipeline/call-resolver.ts)
- `SymbolTable` (type) [ref](src/pipeline/call-resolver.ts)
- `BUILTIN_RECEIVERS` (constant) [ref](src/pipeline/call-resolver.ts)
- `JS_GLOBAL_CALLEES` (constant) [ref](src/pipeline/call-resolver.ts)
- `PYTHON_BUILTIN_CALLEES` (constant) [ref](src/pipeline/call-resolver.ts)
- `JS_PROTOTYPE_METHODS` (constant) [ref](src/pipeline/call-resolver.ts)
- `resolveCalls` (function) [ref](src/pipeline/call-resolver.ts)
- `buildSymbolTable` (function) [ref](src/pipeline/call-resolver.ts)
- `resolveCallsAgainstTable` (function) [ref](src/pipeline/call-resolver.ts)
- `isBuiltinReceiver` (function) [ref](src/pipeline/call-resolver.ts)
- `classifyMethodCall` (function) [ref](src/pipeline/call-resolver.ts)
- `deriveCallerCodeRefId` (function) [ref](src/pipeline/call-resolver.ts)

## Dependencies

- `./types.js` [ref](src/pipeline/call-resolver.ts)
- `../types/types.js` [ref](src/pipeline/call-resolver.ts)
- `../utils/coderef-id.js` [ref](src/pipeline/call-resolver.ts)
- `./field-index.js` [ref](src/pipeline/call-resolver.ts)
- `./scope-binding.js` [ref](src/pipeline/call-resolver.ts)

_Semantic header (projected): layer `service` · capability `call-resolver-call-resolution-kind` · version `1.0.0`_

## Risks & Edge Cases

1. **Ambiguous Function Names** [ref](src/pipeline/call-resolver.ts):
   - **Failure Mode**: Calls to functions with the same name across different files are classified as ambiguous.
   - **Current Handling**: The `candidates` array is populated with all matching codeRefIds, and the kind is set to 'ambiguous'.

2. **Unknown Receivers** [ref](src/pipeline/call-resolver.ts):
   - **Failure Mode**: Calls with a receiver not present in the symbol table are classified as unresolved.
   - **Current Handling**: The callee is checked against `BUILTIN_RECEIVERS` and `JS_GLOBAL_CALLEES`. If not found, it falls through to unresolved.

3. **Nested Function/Class Method Resolution** [ref](src/pipeline/call-resolver.ts):
   - **Failure Mode**: Calls within nested functions or class methods may lose the qualifying scope path.
   - **Current Handling**: The `scopePath` is preserved during resolution, ensuring correct scope information.

4. **Imported Symbols via Phase 3** [ref](src/pipeline/call-resolver.ts):
   - **Failure Mode**: Calls to symbols imported in Phase 3 are resolved using the local alias.
   - **Current Handling**: The symbol table is built against `state.importResolutions`, ensuring correct resolution of imported bindings.

5. **Deterministic and Pure Resolution** [ref](src/pipeline/call-resolver.ts):
   - **Failure Mode**: The resolution process should be deterministic and not mutate the state.
   - **Current Handling**: Pass 2 reads-only from `state.importResolutions` and does not modify `state.calls`, `state.rawCalls`, or `state.elements`.

6. **Builtin Receiver Classification** [ref](src/pipeline/call-resolver.ts):
   - **Failure Mode**: Calls to built-in receivers should classify as 'builtin' without creating project graph edges.
   - **Current Handling**: The receiver is checked against `BUILTIN_RECEIVERS` and classified accordingly.

7. **Unknown Receiver in Python** [ref](src/pipeline/call-resolver.ts):
   - **Failure Mode**: Calls to unknown receivers in Python source files are classified as unresolved.
   - **Current Handling**: The callee is checked against `PYTHON_BUILTIN_CALLEES`. If not found, it falls through to unresolved.

8. **Single-Candidate Unknown Receiver** [ref](src/pipeline/call-resolver.ts):
   - **Failure Mode**: Calls with a single candidate in the same language family but unknown receiver are classified as provisional.
   - **Current Handling**: The `confidence` is set to 'provisional', labeling the edge for filtering by trust tier.

[inference] The above characterizes `src/pipeline/call-resolver.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Validation Checklist

- **Verify Exported API**: Ensure that all exported types and functions match the documented list [ref](src/pipeline/call-resolver.ts).
- **Check Two-Pass Process**:
  - **Pass 1 (`buildSymbolTable`)**: Confirm that every PipelineState.element and resolved Phase 3 ImportResolution.localName binding is indexed into a `Map<name, SymbolTableEntry[]>` [ref](src/pipeline/call-resolver.ts).
    - Ensure the map allows for multi-valued entries due to duplicate names across files [ref](src/pipeline/call-resolver.ts).
  - **Pass 2 (`resolveCallsAgainstTable`)**: Verify that for every RawCallFact, it is classified into one of five kinds (`resolved`, `unresolved`, `ambiguous`, `external`, `builtin`) using receiver text, scope path, and the symbol table [ref](src/pipeline/call-resolver.ts).
    - Confirm that Pass 2 performs no file I/O and does not mutate state.
- **Validate Invariants**:
  - **AC-01**: Ensure every RawCallFact produces exactly one CallResolution with a valid kind (`resolved`, `unresolved`, `ambiguous`, `external`, `builtin`) [ref](src/pipeline/call-resolver.ts).
    - Check for no silent drops of calls.
  - **AC-02**: Verify that built-in receivers (e.g., Array, Object) are classified as 'builtin' and produce no project graph edges [ref](src/pipeline/call-resolver.ts).
    - Ensure these receivers fall through to the ambiguous-vs-unresolved branch for other cases.
  - **AC-03**: Confirm that `this.method()` resolves within the enclosing class scope.
  - **AC-04**: Check that `obj.method()` with unknown receiver type is classified as 'ambiguous' or 'unresolved'.
  - **AC-05**: Ensure duplicate function names across files yield kind='ambiguous' and populate the candidates array [ref](src/pipeline/call-resolver.ts).
  - **AC-06**: Verify that nested-function and class-method calls preserve their qualifying scope path during resolution.
  - **AC-07**: Confirm that calls to imported symbols resolve via Phase 3's ImportResolution.localName binding (cross-phase seam).
    - Ensure the phase enforces read-only consumption of state.importResolutions [ref](src/pipeline/call-resolver.ts).
  - **AC-08**: Check that resolution is deterministic and pure over PipelineState.
  - **AC-09**: Verify that Phase 1 completes for all files before Pass 2 begins for any file [ref](src/pipeline/call-resolver.ts).
  - **AC-10**: Ensure that the project graph edges are correctly labeled, particularly for provisional edges (e.g., `confidence` set to 'provisional').
- **Builtin Receiver Check**:
  - Confirm all built-in receivers in `BUILTIN_RECEIVERS` are included and tested according to DR-PHASE-4-A.
    - Check that unknown receivers fall through to the ambiguous-vs-unresolved branch.
- **Global JS Functions**:
  - Verify that calls to functions in `JS_GLOBAL_CALLEES` classify as 'builtin' with the appropriate reason (`js_global_callee`) for bare calls without project symbol shadowing.
- **Python Builtin Functions**:
  - Check that calls to functions in `PYTHON_BUILTIN_CALLEES` from Python source files classify as 'builtin' with the appropriate reason (`python_builtin_callee`) [ref](src/pipeline/call-resolver.ts).
    - Ensure these classifications are language-guarded at the call site.

[inference] The above characterizes `src/pipeline/call-resolver.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

