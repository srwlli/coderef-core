# DISPATCH-2026-04-20-004 — index.json size & storage options

## Scope
This report analyzes the size footprint of `.coderef/index.json` in `coderef-core`, identifies primary contributors to growth, and proposes alternative storage approaches (chunking/compression/alternative formats) with rough size/performance estimates.

## Current measurements (coderef-core)
- **File**: `.coderef/index.json`
- **Pretty-printed size**: **521,868 bytes** (~510 KB)
- **Records**: **1,977** (avg **264 B/record** pretty)

### Baseline “easy wins” (no semantic changes)
Using the same data:
- **Minified JSON size**: **401,158 bytes** (~392 KB)  
  - Savings vs pretty: **~120,710 bytes** (~23%)
- **Minified + compact keys** (e.g., `type→t`, `name→n`, `file→f`, etc.): **338,356 bytes** (~330 KB)  
  - Savings vs minified: **~62,802 bytes** (~16%)
  - Savings vs pretty: **~183,512 bytes** (~35%)

## Structure summary
`index.json` is a single JSON array of symbol records with fields like:
`type`, `name`, `file`, `line`, `parameters`, `exported`, `async`, `uuid`.

Type distribution (records):
- `method`: 1,071
- `function`: 435
- `interface`: 279
- `class`: 148
- `type`: 36
- `constant`: 6
- `component`: 2

## Top 5 contributors to size growth (in practice)
These are the main drivers as repos and symbol counts grow:
1. **Record count scales with symbol count** (especially `method` entries). Methods are the majority here (54%).
2. **Pretty-printing overhead** (indentation + newlines) adds ~23% in this sample.
3. **Verbose, repeated key names** across every record. Compact keys saved ~63 KB on this sample even after minifying.
4. **Per-record UUIDs** add substantial fixed overhead. In this sample, UUID string content alone totals **71,172 chars** (plus JSON overhead).
5. **Repeated `file` paths** (and other repeated strings like `type`) appear in every record. Here, file path content totals **69,329 chars** (plus JSON overhead).

## Proposed storage approaches

### Option A — Keep JSON, but ship it efficiently (minify + gzip/brotli)
**What**: Write `index.json` in minified form and optionally publish `index.json.gz` (or `.br`) alongside it.

- **Pros**
  - Minimal code changes; simplest migration path.
  - Best “bytes-on-disk / bytes-over-wire” ratio for structured text.
  - Keeps diffability if you still keep an uncompressed pretty version for humans (optional).
- **Cons**
  - Still one monolithic blob to parse.
  - Still repeats keys/strings internally (compression helps, but parse cost remains).
- **Estimates (based on this sample)**
  - Minified: ~392 KB.
  - Gzip/Brotli: typically **4–10× smaller** for repetitive JSON → **~40–100 KB** likely.
  - Parse time: improves marginally from smaller input (but still full JSON parse).

### Option B — Schema compaction + minify (+ optional compression)
**What**: Store the same records but with shorter keys and more positional encoding.

Example shape (illustrative):
- `[{t,n,f,l,p,e,a,u}, ...]` (compact keys)
or
- `[tId, name, fileId, line, params?, flags, uuid?]` (positional arrays)
plus a small dictionary section for repeated strings (file paths, types).

- **Pros**
  - Cuts size even without compression.
  - Faster JSON parse than huge object keys (especially with positional arrays).
  - Straightforward to implement with a versioned “index format” and a converter.
- **Cons**
  - Harder to inspect manually.
  - Requires consumers to understand the versioned schema.
- **Estimates (based on this sample)**
  - Compact keys, minified: ~330 KB (measured).
  - Add file-path dictionary + fileId ints: additional savings likely **5–15%** depending on path repetition.
  - With gzip/brotli: likely similar to Option A over-the-wire, but may reduce parse overhead and memory usage due to fewer key strings.

### Option C — Chunked index (by file, by type, or both) + on-demand loading
**What**: Replace single `index.json` with:
- a small **manifest** (counts, version, shard list), and
- multiple shards like `index/by-file/<hash>.json` or `index/by-type/method.json`, etc.

- **Pros**
  - Avoids loading/parsing the entire index for queries that only need a slice.
  - Enables incremental updates (rewrite only impacted shards).
  - Keeps JSON as interchange but fixes the “monolith” problem.
- **Cons**
  - More filesystem entries; may impact IO on some platforms.
  - Requires manifest + shard resolution logic.
- **Estimates**
  - Total bytes similar to Option A/B (especially if minified), but **time-to-first-query** can improve significantly because you can load only relevant shards.
  - For large repos, this is often the best perceived-performance improvement even if total bytes don’t drop dramatically.

### Option D — Binary format or embedded DB (MessagePack/CBOR or SQLite)
**What**:
- **Binary serialization**: MessagePack/CBOR with optional compression, or
- **SQLite**: table(s) for symbols with indices on `type`, `file`, `name`, etc.

- **Pros**
  - Better size and parse performance than JSON for large datasets.
  - SQLite enables indexed queries without loading everything into memory.
  - Natural fit if you already need incremental updates and ad-hoc querying.
- **Cons**
  - More complex tooling and migration story.
  - Harder to diff and inspect; cross-platform file locking concerns (SQLite) if multiple writers.
- **Estimates**
  - Binary formats often land around **60–90%** of minified JSON before compression, with faster decode.
  - SQLite size depends heavily on indices; can be larger on disk than compressed JSON, but enables sub-linear query time without full scans.

## Recommendation (pragmatic)
1. **Immediate**: write **minified JSON + gzip/brotli** (Option A). This is the quickest win and likely eliminates “massive over-the-wire” concerns.
2. **Next**: introduce a **versioned compact schema** (Option B) to reduce parse/memory overhead and shrink uncompressed size.
3. **For large repos / interactive UIs**: add **chunking + manifest** (Option C) to avoid loading everything.
4. **If query complexity grows**: consider **SQLite** (Option D) for indexed lookups and incremental updates.

## Appendix — Raw metrics captured
- Total characters (string payload only, not JSON overhead):
  - `uuidChars`: 71,172
  - `fileChars`: 69,329
  - `nameChars`: 47,006
  - `typeChars`: 13,367
  - `paramChars`: 14,490 (across 2,014 params)

