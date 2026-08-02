---
agent: LLOYD
date: 2026-07-20
subject: lru-cache
parent_project: lloyd
category: module
version: 1.0.0
documents: src/scanner/lru-cache.ts
related_files:
  - src/scanner/lru-cache.ts
status: approved
---

# lru-cache Resource Sheet

## Executive Summary

The `src/scanner/lru-cache.ts` module provides an implementation of a Least Recently Used (LRU) cache with memory-based eviction for caching data in Node.js applications. This is particularly useful for managing file caches where unlimited growth can lead to performance degradation or resource exhaustion. The LRU cache ensures that the most recently used items are retained, while less frequently accessed items are evicted based on a size limit. It includes methods for getting, setting, deleting, and checking the existence of keys, as well as retrieving current cache statistics. The module is designed to be thread-safe in a single-threaded environment and supports various data types, including arrays and objects.

[inference] The above characterizes `src/scanner/lru-cache.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Audience and Intent

This CodeRef resource sheet is primarily aimed at developers working on the `src/scanner` module or those who need to understand how caching mechanisms are implemented in a Node.js application. The intent of this document is to provide detailed information on the Least Recently Used (LRU) cache, specifically focusing on the implementation details and usage patterns within the `lru-cache.ts` file.

The audience would likely include:

1. **Developers working on the scanner module**: To gain insights into how caching is managed for scanner results.
2. **System administrators and performance analysts**: To understand the implications of using an LRU cache in a memory-capped environment, especially in terms of resource utilization and potential bottlenecks.
3. **Software engineers involved in code reviews or audits**: To ensure that the implementation meets performance requirements and adheres to best practices for caching mechanisms.
4. **New developers on the team**: To grasp the underlying logic and design considerations when implementing a cache system, which could be beneficial for future development of similar systems.

The sheet is structured to provide comprehensive coverage of the module's functionality, from its purpose to specific implementation details, ensuring that readers can effectively use the LRU cache in their projects while also understanding how it operates under different scenarios.

[inference] The above characterizes `src/scanner/lru-cache.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Architecture / Behavior

The `src/scanner/lru-cache.ts` module implements a Least Recently Used (LRU) cache with memory-based eviction. This ensures that the cache does not grow indefinitely and prevents excessive memory usage by removing least recently accessed items when the maximum capacity is reached.

#### Key Components

1. **CacheEntry Interface**: Represents an entry in the LRU cache, containing:
   - `value`: The cached data.
   - `size`: An estimated size of the value in bytes.
   - `timestamp`: The last access time of the entry.

2. **LRUCache Class**: Implements the main functionality of the cache:
   - **Constructor**: Initializes the cache with a specified maximum size and sets initial state.
   - **get Method**: Retrieves an item from the cache, updating its access timestamp to maintain LRU order.
   - **set Method**: Adds or updates an item in the cache. If adding results in exceeding the maximum size, it evicts items using the least recently used policy.
   - **delete Method**: Removes an item by key.
   - **has Method**: Checks if an item exists in the cache.
   - **clear Method**: Clears all items from the cache.
   - **getStats Method**: Returns various statistics about the cache, including current size and utilization percentage.

3. **estimateSize Method**: Provides a rough estimate of the size of an object in bytes based on its type and structure.

4. **createScannerCache Function**: A factory function to create a specialized LRU cache specifically for storing `ScanCacheEntry` objects, which are arrays of `ElementData` with a modification time (`mtime`).

#### Usage

- **LRUCache Class**: Used directly in the `src/scanner/scanner.ts` module for caching scanner results.
- **createScannerCache Function**: Factory function used to create instances of `LRUCache` tailored to specific use cases, such as file scanning.

### Notable Decisions and Trade-offs

- **Memory Limitation**: The cache has a fixed maximum size, which is set in bytes. This prevents the cache from growing without bound, which is beneficial for managing memory usage.
- **LRU Policy**: The cache implements an LRU policy to ensure that recently accessed items are retained, while less frequently used ones are evicted to maintain the cache size within limits.
- **Thread Safety**: The implementation assumes a single-threaded environment. If multi-threading is required, additional synchronization mechanisms would be needed.

### Flow of Execution

1. **Initialization**:
   - `LRUCache` is initialized with a specified maximum size in bytes.

2. **Get Operation**:
   - When an item is accessed (using the `get` method), its access timestamp is updated.
   - If the cache reaches its maximum size, it checks for items to evict.

3. **Set Operation**:
   - A new item is added or an existing item's value is updated.
   - The cache size is updated accordingly and any excess memory is freed by evicting old items if necessary.

4. **Eviction Policy**:
   - Items are evicted based on their last access time, ensuring that least recently used items are removed first to free up space.

5. **Statistics Retrieval**:
   - The `getStats` method provides insights into the current state of the cache, useful for monitoring and debugging purposes.

This architecture ensures efficient memory management in scenarios where caching is necessary but memory usage must be controlled.

[inference] The above characterizes `src/scanner/lru-cache.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Source of Truth

**Exported API:**
- `LRUCache`: Class representing the Least Recently Used cache with memory capping.
- `ScanCacheEntry`: Interface for specialized cache entries used by the scanner.
- `createScannerCache`: Factory function to create an instance of `LRUCache` specifically for scanner results.

**Dependencies:**
- `../types/types.js`: Module containing type definitions used throughout the codebase.

**Semantic Header:**
- Layer: utility
- Capability: lru-cache-cache-entry

**Ownership:**
The ownership and maintenance of this section are handled by the `scanner` module team. This ensures that any changes or updates to these critical components are thoroughly reviewed, tested, and managed by the relevant stakeholders.

**What is Authoritative?**

1. **Exported API:** The exported classes and interfaces (`LRUCache`, `ScanCacheEntry`) and functions (`createScannerCache`) are authoritative. These are exposed to other modules in the system and must be trusted for their correctness and reliability. Changes to these definitions require careful consideration of the impact on the overall functionality.

2. **Dependencies:** The dependency on `../types/types.js` is also authoritative. This module defines critical types used across the codebase, ensuring consistent data structures and avoiding potential type-related errors.

3. **Hardcoded vs. Config-Driven Values:**
   - **Max Size (in bytes):** 50MB for the default maximum cache size is hardcoded. The default value can be changed in the `createScannerCache` function call if needed.
   - **Estimate Size Function:** The logic used to estimate the size of values in bytes is also hardcoded and should not be altered without careful consideration.

4. **Tests, Configs, or Fixtures:**
   - While there are tests for `lru-cache.test.ts`, they do not serve as the single source of truth for this behavior. This is because manual verification through code review and testing ensures the correctness of the implementation.
   - No configuration files or fixtures exist to verify the authoritative nature of these components.

By explicitly stating these points, we establish that the code in `src/scanner/lru-cache.ts` is the single source of truth for its functionality within the application. Any changes or updates must be carefully reviewed and tested against this file to maintain consistency and reliability throughout the system.

[inference] The above characterizes `src/scanner/lru-cache.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Public API / Contracts

- `LRUCache` (class) [ref](src/scanner/lru-cache.ts#LRUCache)
- `ScanCacheEntry` (interface) [ref](src/scanner/lru-cache.ts#ScanCacheEntry)
- `createScannerCache` (function) [ref](src/scanner/lru-cache.ts#createScannerCache)

## Dependencies

- `../types/types.js` [ref](src/scanner/lru-cache.ts)

_Semantic header (projected): layer `utility` · capability `lru-cache-cache-entry` · version `1.0.0`_

## Risks & Edge Cases

#### **Risk: Out-of-Bounds Access**

**Condition:** The `LRUCache` class does not handle out-of-bounds access to the cache map. This could lead to unexpected behavior or runtime errors if an attempt is made to access a non-existent key.

**Current Handling:** The `get` method checks if an entry exists before attempting to update its timestamp and return value, but it does not check if the key exists before returning `undefined`.

**Mitigation:** Add a check at the beginning of the `get` method to ensure the cache contains the specified key before accessing it.

#### **Risk: Cache Size Calculation Errors**

**Condition:** The `estimateSize` function calculates size estimates based on type and object properties, but does not account for nested arrays or complex objects. This could lead to incorrect size calculations if values are deeply nested.

**Current Handling:** The `estimateSize` function is designed to be simple and does not handle deep nesting or complex data structures. It uses a base overhead of 64 bytes for each entry.

**Mitigation:** Implement more sophisticated size estimation logic, possibly using recursive functions or libraries that can accurately measure object sizes.

#### **Risk: Lack of Thread Safety**

**Condition:** The `LRUCache` class is not designed to be thread-safe. In a multithreaded environment, concurrent access to the cache could lead to race conditions and data corruption.

**Current Handling:** The class uses a `Map`, which provides basic thread safety in Node.js environments where single-threading is assumed. However, this does not prevent other threads from mutating the cache outside of method calls.

**Mitigation:** Use synchronization mechanisms like locks or atomic operations to ensure that only one thread can access the cache at any time. This would require significant changes to the implementation and might be unnecessary given the current use case.

#### **Risk: Invalid Size Estimation**

**Condition:** The `estimateSize` function uses rough approximations for sizes, which may not accurately reflect actual memory usage. This could lead to cache misses or poor utilization of memory.

**Current Handling:** The size estimation is based on type and basic object overheads, but it does not account for actual memory usage, which can vary significantly depending on the JavaScript engine's internal optimizations.

**Mitigation:** Improve the `estimateSize` function by using more precise methods to calculate sizes, such as analyzing the heap memory used by JavaScript objects. This could involve integrating with V8 or other low-level tools to gather detailed memory statistics.

#### **Risk: Edge Cases for Array Elements**

**Condition:** The `estimateSize` function does not handle arrays of mixed types or null/undefined values within an array. This could lead to incorrect size calculations for complex data structures.

**Current Handling:** The `estimateSize` function assumes each element in an array is a primitive type or a string, and it uses a fixed overhead of 8 bytes per array item. It does not account for additional memory usage by object references or other complex types.

**Mitigation:** Enhance the `estimateSize` function to handle arrays with mixed types and null/undefined values, possibly by recursively calculating sizes for each element in the array.

#### **Risk: Potential Memory Leaks**

**Condition:** The `LRUCache` class does not have a mechanism to remove entries when they are no longer needed or exceed their reference count. This could lead to memory leaks if unused cache entries are held onto indefinitely.

**Current Handling:** The `LRUCache` uses a `Map` and updates its size as elements are added and removed. However, it does not automatically clean up old entries that are no longer referenced by the application.

**Mitigation:** Implement garbage collection or reference counting to remove cache entries when they are no longer needed. This could involve adding additional methods to track references and evict unused entries when necessary.

#### **Risk: Insufficient Logging**

**Condition:** The `LRUCache` class does not provide adequate logging for debugging or monitoring purposes. This could make it difficult to diagnose issues or understand cache behavior.

**Current Handling:** While the code includes basic methods like `getStats`, these do not provide detailed insights into cache performance or errors. There is no structured logging mechanism in place.

**Mitigation:** Introduce more robust logging that captures details about cache operations, such as hits, misses, evictions, and reference counts. This could help in diagnosing performance bottlenecks or memory issues.

#### **Risk: Poor Cache Utilization**

**Condition:** The `LRUCache` class does not provide mechanisms to optimize cache usage based on access patterns. This could lead to inefficient use of memory and poor performance as the cache fills up.

**Current Handling:** The `LRUCache` uses a simple LRU eviction strategy based on access timestamps, but it does not account for other factors that might influence usage patterns, such as item sizes or frequency of access.

**Mitigation:** Implement more sophisticated cache management strategies, such as tiered caching or time-based eviction policies, to optimize cache utilization and performance. This could involve additional data structures or configuration options to control cache behavior.

#### **Risk: Lack of Unit Testing**

**Condition:** The `LRUCache` class is not fully tested with a variety of inputs and scenarios. This could lead to bugs that are difficult to identify during production use.

**Current Handling:** While the code includes some unit tests in `src/scanner/__tests__/lru-cache.test.ts`, these are limited and may not cover edge cases or all possible usage patterns.

**Mitigation:** Expand the test suite with more comprehensive tests that simulate different cache scenarios, including edge cases and performance benchmarks. This could involve using frameworks like Jest to write isolated unit tests for each method of the `LRUCache` class.

[inference] The above characterizes `src/scanner/lru-cache.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.

## Validation Checklist

#### 1. Basic Functionality Check

- [ref](src/scanner/lru-cache.ts): Verify that the `LRUCache` class correctly initializes with a specified maximum size.
- [ref](src/scanner/lru-cache.ts): Confirm that the `get` method retrieves values from the cache by key and updates their access timestamp.
- [ref](src/scanner/lru-cache.ts): Ensure that the `set` method correctly adds new entries to the cache, evicting LRU items if necessary to maintain size limits.
- [ref](src/scanner/lru-cache.ts): Validate that the `delete` method removes an entry from the cache by key and returns a boolean indicating success.

#### 2. Edge Case Testing

- [ref](src/scanner/lru-cache.ts): Test the behavior of the `get` method when the requested key does not exist.
- [ref](src/scanner/lru-cache.ts): Verify that the `delete` method returns `false` if the specified key is not found in the cache.

#### 3. Utility Functionality Check

- [ref](src/scanner/lru-cache.ts): Confirm that the `has` method correctly checks for the existence of a key in the cache.
- [ref](src/scanner/lru-cache.ts): Ensure that the `clear` method removes all entries from the cache and resets the size to zero.

#### 4. Statistics Retrieval

- [ref](src/scanner/lru-cache.ts): Verify that the `getStats` method returns an object with accurate counts of entries, current size, maximum size, and utilization percentage.

#### 5. Size Estimation

- [ref](src/scanner/lru-cache.ts): Test the `estimateSize` method for various data types (string, number, boolean, array, object) to ensure it provides reasonable estimates of memory usage.

#### 6. Error Handling

- [ref](src/scanner/lru-cache.ts): Ensure that the exported `LRUCache`, `ScanCacheEntry`, and `createScannerCache` functions are properly documented with type annotations.
- [ref](src/scanner/lru-cache.ts): Confirm that the `estimateSize` method handles potential errors or exceptions gracefully, although this is more of a design consideration rather than a runtime check.

#### 7. Thread Safety

- Although the code is written for a single-threaded Node.js environment, consider testing in a multi-threaded context to ensure thread safety, especially if the implementation changes or optimizations are made.
- [ref](src/scanner/lru-cache.ts): Verify that the `LRUCache` class does not rely on any shared state or mutable global variables that could lead to race conditions.

#### 8. Dependency Verification

- Ensure that the `LRUCache` class correctly imports the necessary types from the `types/types.js` file and that the import statement is correct in the source code.
- [ref](src/scanner/lru-cache.ts): Confirm that the module's semantic header (layer, capability) matches the expected values (`utility` and `lru-cache-cache-entry`) as specified in the export statements.

[inference] The above characterizes `src/scanner/lru-cache.ts` from a local-model reading of the source; the verified API and dependency facts are in the projected Public API / Dependencies sections.
