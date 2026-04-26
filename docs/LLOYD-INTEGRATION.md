# LLOYD ↔ coderef-watch Integration

How LLOYD (Python pre-prompt assembler) consumes the heartbeat written by `coderef-watch` (Node daemon). WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001.

---

## TL;DR

`coderef-watch` runs as a workspace-local daemon. On every debounce flush it writes `{project_dir}/.coderef/last-scan.json` atomically. LLOYD reads the file on every pre-prompt assembly and computes `doc_age_seconds = now − last_scan_at`. Cost: one small JSON read + one timestamp subtraction (~50 µs warm cache). LLOYD owns the staleness policy; CORE just publishes the timestamp.

---

## 1. Process boundary (LLOYD constraint #1)

`coderef-watch` runs in the **consumer workspace**, NOT in the LLOYD process. Each consumer machine is responsible for starting one daemon per active workspace. This is the explicit cross-runtime boundary:

```
┌─────────────────────────────────────┐    ┌──────────────────────────────────┐
│ Consumer workspace (Node)           │    │ LLOYD service (Python)           │
│                                     │    │                                  │
│   coderef-watch daemon              │    │   pre-prompt assembler           │
│   ├─ chokidar(**/*.{ts,py,...})     │    │   ├─ open(.coderef/last-scan.json)│
│   ├─ 30s debounce                   │    │   ├─ JSON.parse                  │
│   └─ flush -> coderef-pipeline      │    │   └─ doc_age = now - last_scan_at│
│        └─ atomic write              │    │                                  │
│           .coderef/last-scan.json ──┼────┼──> read on every request         │
└─────────────────────────────────────┘    └──────────────────────────────────┘
```

LLOYD does NOT spawn `coderef-watch`. LLOYD does NOT own its lifecycle. The daemon is a **workspace-local service** documented in [DEPLOY-CODEREF-WATCH.md](DEPLOY-CODEREF-WATCH.md).

---

## 2. Heartbeat contract

**Path:** `{project_dir}/.coderef/last-scan.json`
**Schema:** [`src/cli/coderef-watch-heartbeat.schema.json`](../src/cli/coderef-watch-heartbeat.schema.json) (v1).
**Atomicity:** temp + rename. POSIX rename is atomic on the same filesystem; Node `fs.renameSync` is atomic on Windows for same-volume targets. Readers will never see a partial write.

Example payload:

```json
{
  "schema_version": 1,
  "last_scan_at": "2026-04-26T01:30:00Z",
  "paths_changed": ["src/cli/foo.ts", "src/scanner/bar.ts"],
  "status": "pass",
  "exit_reason": "pipeline_ok",
  "exit_code": 0,
  "duration_ms": 4823,
  "pid": 18432,
  "alive_at": "2026-04-26T01:30:00Z",
  "trigger": { "kind": "debounce", "cwd": "/abs/path/to/project" }
}
```

### Field semantics for LLOYD

| Field | What LLOYD does with it |
|---|---|
| `schema_version` | Pin to `1`. On mismatch, log a warning and degrade to "freshness unknown." |
| `last_scan_at` | The single canonical timestamp. Compute `doc_age_seconds = now − last_scan_at`. |
| `paths_changed` | Optional. Use to skip foundation-doc slices unaffected by recent edits. |
| `status` | `pass` = trust freshness. `fail` = the pipeline crashed; treat as stale-or-broken. `skipped` = `--no-pipeline` debug mode; no fresh scan happened. |
| `exit_reason` | Diagnostic only. Surface in LLOYD logs when degrading. |
| `pid` + `alive_at` | Stale-daemon detection. If `alive_at` is older than ~5 min, treat as stale even if `last_scan_at` is recent (daemon may have crashed mid-run). |
| `trigger.kind` | `debounce` = real activity. `once` = manual one-shot run. Treat the same for freshness purposes. |

---

## 3. LLOYD-side read pattern (Python)

```python
import json
import os
from datetime import datetime, timezone
from pathlib import Path

def read_doc_freshness(project_dir: str | os.PathLike) -> dict | None:
    """Return heartbeat payload + computed age, or None if missing/corrupt.

    Cost: ~50 us warm cache. Safe to call on every pre-prompt assembly.
    """
    hb_path = Path(project_dir) / ".coderef" / "last-scan.json"
    try:
        hb = json.loads(hb_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    if hb.get("schema_version") != 1:
        # Newer schema; degrade gracefully rather than crash
        return None

    last_scan = datetime.fromisoformat(hb["last_scan_at"].replace("Z", "+00:00"))
    alive_at  = datetime.fromisoformat(hb["alive_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)

    return {
        **hb,
        "doc_age_seconds": int((now - last_scan).total_seconds()),
        "daemon_alive_seconds": int((now - alive_at).total_seconds()),
    }
```

### Caching

LLOYD MAY cache the heartbeat for ~5–30s if request rate is high. Invalidate via `os.path.getmtime` check:

```python
class HeartbeatCache:
    def __init__(self, project_dir: str | os.PathLike):
        self._path = Path(project_dir) / ".coderef" / "last-scan.json"
        self._loaded_mtime = 0.0
        self._cached: dict | None = None

    def get(self) -> dict | None:
        try:
            mtime = self._path.stat().st_mtime
        except OSError:
            return None
        if mtime > self._loaded_mtime:
            self._cached = read_doc_freshness(self._path.parent.parent)
            self._loaded_mtime = mtime
        return self._cached
```

### Stale-daemon detection

```python
fresh = read_doc_freshness(project_dir)
if fresh is None:
    confidence = "no_freshness_signal"
elif fresh["status"] != "pass":
    confidence = "stale_pipeline_failure"
elif fresh["daemon_alive_seconds"] > 300:
    # daemon hasn't checked in for >5 min; treat as dead
    confidence = "stale_daemon_unreachable"
elif fresh["doc_age_seconds"] > 86400:
    confidence = "stale_24h"
else:
    confidence = "fresh"
```

LLOYD attaches `confidence` (or its policy equivalent) to the pre-prompt slice metadata so downstream models can hedge.

---

## 4. Per-task-type policy (LLOYD owns it)

CORE publishes the timestamp. LLOYD decides what to do with it. Suggested per-task-type thresholds (these are LLOYD config, not CORE config):

| Task type | `doc_age_seconds` threshold | Action when exceeded |
|---|---|---|
| `simple_lookup` | none | Always include foundation-doc slice |
| `code_change_planning` | 3600 (1 h) | Include with inline `<!-- age: Xh -->` warning |
| `architecture_review` | 1800 (30 min) | Include with stronger warning; suggest re-run of pipeline |
| `audit / deep_context` | 600 (10 min) | Escalate to frontier model with explicit staleness flag |

These thresholds are illustrative; LLOYD owns the policy table.

---

## 5. Per-debounce session events (LOGS/SESSIONS forwarding)

When `coderef-watch` runs inside an active CodeRef daily-agent-session AND `CODEREF_SESSION_ID` is set in its environment, every flush also emits a session event via `scripts/log-session-event.mjs`:

```bash
CODEREF_SESSION_ID=daily-agent-session-2026-04-26 \
CODEREF_AGENT_DOMAIN=CODEREF-CORE \
coderef-watch --project-dir /abs/path
```

Forwarded event:
- `type: coderef_watch_flush`
- `source: coderef-watch`
- `summary: coderef-watch flush: <status> (<N> paths)`
- `payload: full heartbeat + project_dir`

Events land at `LOGS/SESSIONS/{sid}/{domain}/events.jsonl` per [WO-SESSIONS-EVENT-EMISSION-PROTOCOL-001](../coderef/workorder/sessions-event-emission-protocol/). Failure of the event writer is silent (best-effort) and never blocks the daemon.

---

## 6. Local audit log

Every flush also appends one JSONL line to `{project_dir}/.coderef/watch-events.jsonl` regardless of session-event forwarding state. This is the local-only audit trail; rotate/truncate as needed (CORE does not rotate it for you).

---

## 7. Failure modes LLOYD must handle

| Failure | LLOYD-side behavior |
|---|---|
| Heartbeat file missing | Treat as "freshness unknown"; do not block pre-prompt assembly |
| JSON parse error (mid-write race or disk corruption) | Same as missing — return `None`, do not raise |
| `schema_version > 1` | Log a warning; treat as missing until LLOYD upgrades its reader |
| `status = fail` | Trust the timestamp but flag the pipeline failure for the operator |
| `alive_at` very old (>5 min) | Daemon likely crashed; flag operator; treat as stale |
| `paths_changed` very large (>1000) | Likely a bulk rebase / branch switch; informational only |

LLOYD MUST NOT raise on any of the above. Pre-prompt assembly continues with degraded freshness signal rather than failing the request.
