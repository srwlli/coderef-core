# Foundation Docs Generation Scripts

**Workorder:** WO-FOUNDATION-DOCS-001  
**Purpose:** Auto-generate living documentation from `.coderef` scan data

---

## Overview

These scripts transform static foundation docs into living documentation that automatically populates from `.coderef` scan data, providing:

- **Traceability** - UUID anchors link docs to code
- **Relationship maps** - Dependency visualization  
- **Complexity analysis** - Risk-based maintenance prioritization
- **CI validation** - Ensure docs stay synchronized

---

## Scripts

| Script | Purpose | Output |
|--------|---------|--------|
| `generate-index-md.js` | Master element registry | `INDEX.md` |
| `generate-exports-md.js` | Public API documentation | `EXPORTS.md` |
| `generate-hotspots-md.js` | Complexity & risk analysis | `HOTSPOTS.md` |
| `generate-relationships-md.js` | Dependency visualization | `RELATIONSHIPS.md` |
| `enhance-existing-docs.js` | Add UUID anchors to existing docs | Enhanced `API.md`, `COMPONENTS.md`, etc. |
| `validate-docs.js` | CI gate validation | Exit code 0/1 |

---

## Usage

### Generate all new docs:
```bash
node scripts/doc-gen/generate-index-md.js
node scripts/doc-gen/generate-exports-md.js
node scripts/doc-gen/generate-hotspots-md.js
node scripts/doc-gen/generate-relationships-md.js
```

### Enhance existing docs with UUID anchors:
```bash
node scripts/doc-gen/enhance-existing-docs.js
```

### Validate docs in CI:
```bash
node scripts/doc-gen/validate-docs.js [--strict]
```

---

## Data Sources

| Source | Size | Content |
|--------|------|---------|
| `.coderef/index.json` | ~390 KB | 1,921 elements with UUIDs |
| `.coderef/graph.json` | ~3.4 MB | 9,629 dependency edges |
| `.coderef/context.json` | ~14 KB | Complexity scores, entry points |

---

## Generated Documentation

### New Auto-Generated Docs
- **INDEX.md** - Human-browsable element registry (1,921 elements)
- **EXPORTS.md** - Public API surface (781 exported elements)
- **HOTSPOTS.md** - Complexity analysis & risk indicators
- **RELATIONSHIPS.md** - Dependency graphs (9,629 edges)

### Enhanced Existing Docs
- **API.md** - UUID anchors on function signatures
- **COMPONENTS.md** - Complexity badges, file density metrics
- **ARCHITECTURE.md** - Dependency graph statistics
- **SCHEMA.md** - Element type distribution

---

## CI Integration

Add to your CI pipeline:

```yaml
- name: Validate Foundation Docs
  run: node scripts/doc-gen/validate-docs.js --strict
```

Validation checks:
- All required docs present
- Docs are newer than `.coderef/index.json`
- All UUID anchors reference valid elements
- Auto-generation markers present

---

## Architecture

```
.coderef/index.json ──┬──> generate-index-md.js ──> INDEX.md
                      ├──> generate-exports-md.js ──> EXPORTS.md
                      └──> enhance-existing-docs.js ──> API.md (UUID anchors)

.coderef/context.json ──> generate-hotspots-md.js ──> HOTSPOTS.md

.coderef/graph.json ────> generate-relationships-md.js ──> RELATIONSHIPS.md
```

---

*Part of WO-FOUNDATION-DOCS-001 - Living Documentation Initiative*
