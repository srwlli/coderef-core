---
Agent: Claude Sonnet 4.5
Date: 2025-01-27
Task: DOCUMENT
---

# Adapter Module — Authoritative Documentation

## Executive Summary

The adapter module provides a transformation layer between the AST-based dependency graph format (`DependencyGraph`) and the flat element array format (`ElementData[]`). This enables backward compatibility with generators and tools designed for regex scanner output while leveraging the enhanced AST analysis capabilities. The module performs lossy conversion, extracting key relationships and metadata from the graph structure into a simplified element representation.

## Audience & Intent

- **Markdown (this document):** Defines conversion contracts, data mapping rules, and filtering behavior
- **TypeScript/Code:** Implements conversion logic with type safety and error handling
- **ElementData interface:** Target format contract (defined in parent types package)

## 1. Architecture Overview

The adapter module sits between the analyzer (which produces `DependencyGraph`) and downstream consumers expecting `ElementData[]` format.

```
AnalyzerService → DependencyGraph → convertGraphToElements() → ElementData[]
```

**Component Structure:**
- `convertGraphToElements()`: Main conversion function
- `getConversionStats()`: Statistics utility
- `ConversionOptions`: Configuration interface

**Integration Points:**
- **Input:** `DependencyGraph` from `analyzer/graph-builder.ts`
- **Output:** `ElementData[]` compatible with scanner-based generators
- **Dependencies:** `types.ts` for `ElementData` interface

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Graph nodes | AnalyzerService | System | Memory (cached) | `DependencyGraph.nodes` Map |
| Graph edges | AnalyzerService | System | Memory (cached) | `DependencyGraph.edges` Array |
| Element array | Adapter | Domain | None (ephemeral) | Return value of `convertGraphToElements()` |
| Conversion stats | Adapter | Domain | None (ephemeral) | Return value of `getConversionStats()` |

**Precedence Rules:**
- Graph structure is authoritative; adapter does not modify source graph
- Element extraction follows deterministic rules (documented in conversion logic)
- Node ID format: `"file:name"` (split on last `:` to handle Windows paths)

## 3. Data Persistence

No persistent state. Conversion is stateless and idempotent.

## 4. State Lifecycle

1. **Input Validation:** Verify graph structure and options
2. **Node Iteration:** Process each node in `graph.nodes` Map
3. **Filtering:** Apply type filter and isolation filter if specified
4. **Edge Extraction:** Extract call relationships from `edgesBySource` Map
5. **Element Construction:** Create `ElementData` from node properties
6. **Metadata Enrichment:** Add parameters and calls from node metadata
7. **Output:** Return array of `ElementData` objects

## 5. Behaviors (Events & Side Effects)

### User Behaviors
- **Function call:** `convertGraphToElements(graph, options)` — Performs conversion
- **Statistics:** `getConversionStats(elements)` — Calculates metrics

### System Behaviors
- **Verbose logging:** When `options.verbose === true`, logs conversion progress to console
- **Type filtering:** Skips nodes not matching `typeFilter` array
- **Isolation filtering:** Excludes nodes with no edges when `includeIsolated === false`

## 6. Event & Callback Contracts

| Event | Trigger | Payload | Side Effects |
|-------|---------|---------|--------------|
| `convertGraphToElements()` | Function call | `graph: DependencyGraph, options?: ConversionOptions` | Returns `ElementData[]` |
| `getConversionStats()` | Function call | `elements: ElementData[]` | Returns statistics object |

**Conversion Options Contract:**
```typescript
interface ConversionOptions {
  includeFileNodes?: boolean;    // Not currently implemented
  includeOrphans?: boolean;       // Not currently implemented
  includeIsolated?: boolean;      // Default: true
  typeFilter?: string[];          // Default: [] (no filter)
  verbose?: boolean;              // Default: false
}
```

## 7. Performance Considerations

**Known Limits:**
- Linear time complexity: O(n + e) where n = nodes, e = edges
- Memory: Creates new array, does not modify source graph
- Edge lookup: Uses `edgesBySource` Map for O(1) access

**Bottlenecks:**
- Large graphs (>10,000 nodes) may take 1-2 seconds
- Edge iteration for call extraction is O(e) per node

**Optimization Opportunities:**
- Batch processing for very large graphs
- Lazy evaluation for filtered results

**Deferred Optimizations:**
- Streaming conversion for memory-constrained environments
- Parallel node processing (not implemented due to complexity)

## 8. Accessibility

Not applicable (library module, no UI).

## 9. Testing Strategy

**Must-Cover Scenarios:**
- Empty graph conversion
- Graph with isolated nodes
- Graph with call relationships
- Type filtering behavior
- Isolation filtering behavior
- Windows path handling (colons in paths)
- Metadata extraction (parameters, calls)
- Statistics calculation accuracy

**Explicitly Not Tested:**
- Graph modification (adapter is read-only)
- Error recovery (assumes valid graph input)

## 10. Non-Goals / Out of Scope

- Graph modification or mutation
- Bidirectional conversion (ElementData[] → DependencyGraph)
- Incremental conversion (always processes full graph)
- Custom element transformation hooks
- Graph validation (assumes valid input)

## 11. Common Pitfalls & Sharp Edges

**Windows Path Handling:**
- Node IDs use format `"file:name"` but Windows paths contain `:` (e.g., `C:/path`)
- Solution: Split on **last** `:` character, not first
- Example: `"C:/src/auth.ts:authenticate"` → name = `"authenticate"`

**Missing Metadata:**
- Not all nodes have `metadata.parameters` or call edges
- Adapter gracefully handles missing properties (no errors thrown)

**Type Filtering:**
- Filter is case-sensitive and exact match
- Unknown types are preserved (not validated)

**Isolated Nodes:**
- Nodes with no edges are included by default (`includeIsolated: true`)
- Set `includeIsolated: false` to exclude them

**Edge Type Assumptions:**
- Only `'calls'` edge type is extracted for `element.calls` array
- Other edge types (`'imports'`, `'depends-on'`, etc.) are ignored

## 12. Diagrams (Optional)

**Conversion Flow:**
```
DependencyGraph
  ├─ nodes: Map<id, GraphNode>
  │   ├─ id: "file:name"
  │   ├─ type: "function"
  │   ├─ file: "/path/to/file.ts"
  │   ├─ line: 42
  │   └─ metadata: { parameters: [...] }
  └─ edgesBySource: Map<id, GraphEdge[]>
      └─ [ { type: "calls", target: "..." } ]

                    ↓ convertGraphToElements()

ElementData[]
  └─ [
      {
        type: "function",
        name: "name",
        file: "/path/to/file.ts",
        line: 42,
        parameters: [...],
        calls: [...]
      }
    ]
```

> Diagrams are **illustrative**, not authoritative. Conversion logic in code defines truth.

## Conclusion

The adapter module provides a critical compatibility layer enabling AST-based analysis to work with existing scanner-based tooling. It performs deterministic, lossy conversion from graph structure to flat element array, preserving essential relationships (calls) and metadata (parameters) while discarding graph topology. The conversion is stateless, idempotent, and handles edge cases like Windows paths and missing metadata gracefully. Maintainers should preserve the conversion contracts documented here to ensure backward compatibility with downstream consumers.

