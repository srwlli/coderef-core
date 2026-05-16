# CodeRef Intelligence Data API

Read-only HTTP API serving `.coderef/` artifacts in normalized JSON formats for the dashboard Intelligence tab.

**Server:** `coderef-intelligence-server`  
**Default port:** `52850`  
**Env override:** `CODEREF_INTELLIGENCE_HTTP_PORT`

## Start

```bash
coderef-intelligence-server --dir /path/to/project [--port 52850]
```

The server loads `index.json`, `graph.json`, and `reports/complexity/summary.json` at startup and serves them from an in-memory cache.

## Endpoints

### GET /api/health

Liveness check.

```bash
curl http://localhost:52850/api/health
```

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "api_version": 1,
  "uptime_s": 42,
  "cache": {
    "loaded_at": "2026-05-16T09:00:00Z",
    "elements": 2431,
    "nodes": 2795,
    "edges": 30256
  }
}
```

### GET /readyz

Readiness probe. Returns `200 OK` plain text.

### GET /api/intelligence/summary

Element type distribution, header coverage percentage, and complexity histogram.

```bash
curl http://localhost:52850/api/intelligence/summary
```

```json
{
  "total_elements": 2431,
  "type_distribution": {
    "function": 761,
    "method": 1072,
    "class": 120,
    "interface": 400,
    "type": 60,
    "constant": 16,
    "component": 2
  },
  "header_coverage": {
    "pct": 52.3,
    "defined": 1271,
    "total": 2431,
    "by_status": {
      "defined": 1271,
      "stale": 797,
      "missing": 343,
      "partial": 20
    }
  },
  "complexity_histogram": {
    "0-10": 1561,
    "11-20": 195,
    "21-30": 46,
    "31+": 31
  },
  "complexity_summary": {
    "total_analyzed": 1833,
    "average": 5.7,
    "high_count": 272
  },
  "cache_generated_at": "2026-05-16T06:28:31Z",
  "served_at": "2026-05-16T09:00:05Z"
}
```

### GET /api/intelligence/elements

Paginated element list. Supports filtering.

**Query parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `offset` | `0` | Skip N elements |
| `limit` | `100` | Return up to N elements (max 500) |
| `type` | — | Filter by element type (`function`, `class`, `method`, `interface`, `type`, `constant`, `component`) |
| `headerStatus` | — | Filter by header status (`defined`, `stale`, `missing`, `partial`) |
| `file` | — | Filter by file path substring |

```bash
curl "http://localhost:52850/api/intelligence/elements?type=class&limit=5"
```

```json
{
  "total": 120,
  "offset": 0,
  "limit": 5,
  "items": [
    {
      "id": "@Cl/src/analyzer/analyzer-service.ts#AnalyzerService:69",
      "uuid": "2649acce-f10b-5260-9be7-9e8f08f82c74",
      "name": "AnalyzerService",
      "type": "class",
      "file": "src/analyzer/analyzer-service.ts",
      "line": 69,
      "exported": true,
      "headerStatus": "defined"
    }
  ]
}
```

### GET /api/intelligence/edges

Full edge list from `graph.json` (import, export, call relationships).

```bash
curl http://localhost:52850/api/intelligence/edges
```

```json
{
  "total": 30256,
  "edges": [
    {
      "source": "@File/src/cli/rag-search.ts",
      "target": "@File/src/integration/rag/semantic-search.ts",
      "type": "import"
    }
  ]
}
```

Edge types: `import`, `export`, `call`.

### GET /api/intelligence/hotspots

Top 20 elements by in-degree (number of call/import edges pointing to them).

```bash
curl http://localhost:52850/api/intelligence/hotspots
```

```json
{
  "total": 20,
  "items": [
    {
      "id": "@Fn/src/utils/coderef-id.ts#createCodeRefId:66",
      "name": "createCodeRefId",
      "file": "src/utils/coderef-id.ts",
      "type": "function",
      "in_degree": 31
    }
  ]
}
```

### GET /api/intelligence/coverage-gaps

Elements with missing or stale `@coderef-semantic` headers, sorted by complexity descending. Highest-complexity undocumented elements appear first.

```bash
curl http://localhost:52850/api/intelligence/coverage-gaps
```

```json
{
  "total": 1160,
  "items": [
    {
      "id": "@Fn/src/scanner/scanner.ts#scanCurrentElements:904",
      "name": "scanCurrentElements",
      "file": "src/scanner/scanner.ts",
      "type": "function",
      "headerStatus": "stale",
      "complexity": 109
    }
  ]
}
```

## CORS

All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Notes

- **Layer/capability fields** are not yet in `index.json` — they are sourced from `@coderef-semantic` headers but not yet parsed into the index. The summary endpoint reports header coverage status instead.
- **Complexity** is cross-referenced from `reports/complexity/summary.json` on the `coverage-gaps` endpoint; elements without a complexity entry show `complexity: 0`.
- **Hot reload** is not supported — restart the server to pick up updated `.coderef/` artifacts.
