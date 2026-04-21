# DISPATCH-2026-04-20-005 — index.json storage optimization implementation log

## Summary
Implemented the first two phases from the index size analysis roadmap:

- **Option A (minify + gzip)**: publish `.coderef/index.json` as **minified JSON** and publish `.coderef/index.json.gz`.
- **Option B (compact schema)**: publish a **versioned compact schema** alongside verbose output (`.coderef/index.compact.json` + `.gz`) and update consumers to load **both verbose + compact** formats, including **.gz** variants.

## What changed

### Writers (producing files under `.coderef/`)
- **`saveIndex()`** now writes **four** files (all minified):
  - `index.json` (verbose, versioned header)
  - `index.json.gz`
  - `index.compact.json` (compact schema, versioned header)
  - `index.compact.json.gz`
- **Pipeline `IndexGenerator`** now writes the same variants via the shared writer.

### Readers (backward-compatible loading)
- Added a shared loader that prefers compact+gz but falls back through:
  1. `index.compact.json.gz`
  2. `index.compact.json`
  3. `index.json.gz`
  4. `index.json`
- Loader also supports legacy formats:
  - `index.json` as a raw JSON array of elements
  - legacy metadata object with `elements: [...]`

### Consumers updated
- **Drift detection** (`detectDrift`, `DriftGenerator`) now loads previous index via the shared loader so it can read `.json.gz` / compact / legacy formats.
- **Dashboard** context discovery API now loads index using the same candidate set and converts compact elements to verbose element objects for downstream logic.

## Schema/versioning (Option B requirement)
- `index.json` now includes a header with:
  - `schemaVersion: "3.0.0"`
  - `format: "verbose"`
- `index.compact.json` includes a header with:
  - `schemaVersion: "3.0.0"`
  - `format: "compact"`
- Compact elements use the agreed compact keys: `t,n,f,l,p,e,a,u`.

## Metrics (sizes + parse-time benchmarks)
Benchmarked using `scripts/bench-index-parse.mjs` against `packages/coderef-core/.coderef/` on this machine.

### File sizes (bytes)
- `index.json`: **401,475 B** (~392 KB)
- `index.json.gz`: **73,296 B** (~71.6 KB) ✅ within **40–100 KB** estimate range
- `index.compact.json`: **336,412 B** (~328 KB)
- `index.compact.json.gz`: **72,533 B** (~70.8 KB)

### Parse benchmarks (avg ms over 30 iterations)
These timings include file read + (optional) gunzip + JSON.parse.

- `index.json`: **~1.62 ms**
- `index.json.gz`: **~2.43 ms**
- `index.compact.json`: **~1.48 ms**
- `index.compact.json.gz`: **~2.12 ms**

**Notes / trade-offs**
- `.gz` is **much smaller** on disk/over-wire, but adds **CPU decompression overhead** if you always read from local disk.
- The primary value of `.gz` is **transfer + cold IO** (and enabling “prefer gz” for remote fetches); compact schema mainly reduces **uncompressed size** and can reduce parse/memory overhead for very large repos.

## Follow-ups (not implemented in this dispatch)
- **Option C (chunking)** and **Option D (SQLite)** remain as next-phase work if/when index size grows into multi‑MB territory and time-to-first-query becomes the main bottleneck.

