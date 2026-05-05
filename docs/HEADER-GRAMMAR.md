# Semantic Header Grammar (BNF)

> **Mirror notice.** This document is a **MIRROR** of the canonical BNF grammar maintained at `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md` (`§ Reference Schemas → Canonical Header Grammar`). The ASSISTANT-side document is authoritative; this CORE-side mirror exists for self-contained CORE doc builds.
>
> **Sync touchpoint.** Any change to the ASSISTANT BNF MUST update this mirror in the same workorder closeout. New header fields, new layer values, or grammar refinements are decided in the ASSISTANT skill; CORE never forks the grammar.
>
> **Authoritative source path:** `C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\ANALYSIS\analyze-coderef-semantics\SKILL.md`

---

## Purpose

The `@coderef-semantic:1.0.0` block is a structured comment header that declares semantic metadata about a source file: its architectural layer, capability slug, constraints, exports, imports, and generation timestamp. The Phase 2.5 semantic-header parser reads this block, the Phase 1 scanner uses it to enrich `ElementData`, and the Phase 6 validator surfaces drift between header claims and AST reality (SH-1, SH-2, SH-3).

## Canonical BNF

```
header           ::= comment_open semantic_marker semantic_fields comment_close
comment_open     ::= "/**"
semantic_marker  ::= "@coderef-semantic:" version
version          ::= "1.0.0"
semantic_fields  ::= layer_field capability_field constraint_field? export_field import_field generated_field
layer_field      ::= "@layer" ws layer_value
layer_value      ::= "ui_component" | "service" | "utility" | "data_access" | "api" | "integration"
                   | "domain" | "validation" | "parser" | "formatter" | "cli" | "configuration" | "test_support"
capability_field ::= "@capability" ws capability_value
capability_value ::= /[a-z][a-z0-9\-]*/  # free-form kebab-case string
constraint_field ::= "@constraint" ws constraint_array
constraint_array ::= "[" constraint_item ("," constraint_item)* "]"
constraint_item  ::= '"' /[a-z][a-z0-9\-]*/ '"'
export_field     ::= "@exports" ws export_list
export_list      ::= export_item ("," ws export_item)*
export_item      ::= identifier
import_field     ::= "@imports" ws import_list
import_list      ::= "[" import_item ("," ws import_item)* "]"
import_item      ::= '"' module_path ":" symbol '"'
module_path      ::= /[a-z0-9\/\.\-]+/
symbol           ::= identifier
generated_field  ::= "@generated" ws iso8601_timestamp
iso8601_timestamp::= /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/
ws               ::= /\s+/
comment_close    ::= "*/"
identifier       ::= /[a-zA-Z_][a-zA-Z0-9_]*/
```

## Concrete Example

```typescript
/**
 * @coderef-semantic:1.0.0
 * @layer service
 * @capability orchestration
 * @constraint ["transaction-safe", "concurrent-access"]
 * @exports DispatchService, schedule
 * @imports ["orchestrator:Agent", "db:Transaction", "utils:retry"]
 * @generated 2026-04-29T14:22:00Z
 */
export class DispatchService {
  async schedule(task: Task): Promise<void> { ... }
}
```

## Validation Rules

| Field | Required | Type | Validation |
|---|---|---|---|
| `@layer` | YES | Enum (13 values) | Must match one of the 13 canonical layers from `ASSISTANT/STANDARDS/layers.json`. Mismatch surfaces as Phase 6 SH-1 drift. |
| `@capability` | YES | String | Free-form kebab-case (`^[a-z][a-z0-9-]*$`). Phase 6 enforces shape, not vocabulary. |
| `@constraint` | NO | JSON Array | Each item kebab-case; `[]` permitted when present but unused. |
| `@exports` | YES | List | Comma-separated identifiers; values that don't appear as actual exports surface as Phase 6 SH-2 export drift. |
| `@imports` | YES | List | Array of `"module:symbol"` pairs; full qualification required. Phase 3 resolves these into `ImportResolution[]` alongside AST imports. |
| `@generated` | YES | ISO 8601 | Must be a valid ISO timestamp (`YYYY-MM-DDTHH:MM:SSZ`). Used for freshness calculation. |

## Where headers live

**Canonical location:** comment block immediately preceding the primary export (function, class, constant) of the file.

**Language support:**
- **TypeScript / JavaScript:** `/** ... */` block comment
- **Python:** `""" ... """` docstring (preceding function/class definition)
- **Go:** `// ...` line comments (preceding function/struct declaration)

**Parsing strategy (Phase 2.5):**
1. Scan source file for the `@coderef-semantic:1.0.0` marker.
2. Extract the preceding block/docstring as header text.
3. Parse fields using the BNF grammar above.
4. Link to the first export in the file (AST when available; line-based fallback).

### Python example

```python
"""
@coderef-semantic:1.0.0
@layer service
@capability orchestration
@constraint ["transaction-safe"]
@exports dispatch_task
@imports ["orchestrator:Agent"]
@generated 2026-04-29T14:22:00Z
"""
def dispatch_task(task: Task) -> None:
    pass
```

## How CORE consumes the parsed header

| Pipeline phase | Consumer | Use |
|---:|----------|-----|
| 1 | Scanner / `ElementData` | `ElementData.layer`, `.capability`, `.constraints`, `.headerStatus` are populated from the parsed header (file-grain). |
| 2.5 | `src/pipeline/semantic-header-parser.ts` + `header-fact.ts` | Produces `HeaderFact` per file and `HeaderImportFact[]` from `@imports`. |
| 3 | `src/pipeline/import-resolver.ts` | Resolves both AST imports and `HeaderImportFact[]` against the `ExportTable`. Emits `ImportResolution[]` with `kind` ∈ {resolved, unresolved, external, ambiguous, dynamic, typeOnly, **stale**} (the `stale` kind is unique to header-imports — it means the header declared an import that is no longer in the file). |
| 5 | `src/pipeline/graph-builder.ts` | Header-derived edges are emitted with `relationship='header-import'`. The 10-variant `EdgeEvidence` union has dedicated `header-import` and `stale-header-import` variants. |
| 6 | `src/pipeline/output-validator.ts` | Surfaces SH-1 (layer not in enum), SH-2 (export drift), SH-3 (header drift) as warnings by default; promoted to errors with `--strict-headers`. |
| 7 | `src/integration/rag/indexing-orchestrator.ts` | Files with `headerStatus` ∈ {missing, stale, partial} are SKIPPED with the corresponding `SkipReason` (worst-severity-wins file-grain aggregation, Path A). |

## Drift checks (Phase 6 chokepoint)

| Check | Identifier | Default | `--strict-headers` |
|-------|-----------|---------|--------------------|
| Layer in `layers.json` enum | SH-1 | warning | hard error |
| Header `@exports` matches AST exports | SH-2 | warning | hard error |
| Header present but malformed / partial | SH-3 | warning | hard error |

`headerStatus` values that the scanner emits per file:

| Value | Meaning |
|-------|---------|
| `defined` | Header parses cleanly; SH-1/SH-2/SH-3 all clean. |
| `partial` | Header present but missing one or more required fields. |
| `stale` | Header `@exports` no longer matches AST exports. |
| `missing` | No `@coderef-semantic:1.0.0` marker found. (Default in normalized scanner output.) |

## See also

- ASSISTANT canonical: `ASSISTANT/SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md`
- Layer enum: `ASSISTANT/STANDARDS/layers.json`
- Phase 2.5 archive: `coderef/archived/pipeline-semantic-header-parser/ARCHIVED.md`
- Schema cross-reference: [docs/SCHEMA.md](./SCHEMA.md) § 1 (ElementData), § 2 (header-derived facts)
- Phase 6 validation contract: [docs/SCHEMA.md](./SCHEMA.md) § 5 (ValidationReport)
- Phase 7 indexing impact: [docs/SCHEMA.md](./SCHEMA.md) § 6 (IndexingResult — SkipReason enum)
