"""LLOYD-side smoke test: Python reader for the coderef-watch heartbeat.

WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001 phase 4 task LLOYD-T3.

Spawns `coderef-watch --once --no-pipeline` against a temp workspace, reads
the heartbeat exactly the way LLOYD does in docs/LLOYD-INTEGRATION.md, and
asserts:
  - heartbeat file exists, parses cleanly
  - schema_version == 1
  - doc_age_seconds < 60 (we just wrote it)
  - daemon_alive_seconds < 60
  - status in {pass, skipped} (we ran with --no-pipeline so skipped)
  - trigger.kind == 'once'

Exits 0 on PASS, 1 on FAIL. No third-party dependencies (stdlib only).

Run: python __tests__/coderef-watch-lloyd-read.test.py
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WATCH_BIN = REPO_ROOT / "dist" / "src" / "cli" / "coderef-watch.js"

if not WATCH_BIN.exists():
    print(f"FAIL: {WATCH_BIN} missing -- run npm run build:cli first", file=sys.stderr)
    sys.exit(1)

tmp_root = Path(tempfile.mkdtemp(prefix="coderef-watch-lloyd-"))
(tmp_root / "seed.ts").write_text("export const x = 1;\n", encoding="utf-8")

try:
    result = subprocess.run(
        [
            "node",
            str(WATCH_BIN),
            "--project-dir", str(tmp_root),
            "--once",
            "--no-pipeline",
            "--json",
        ],
        capture_output=True, text=True, timeout=15,
    )
    if result.returncode != 0:
        print(f"FAIL: --once exit={result.returncode}", file=sys.stderr)
        print("stdout:", result.stdout, file=sys.stderr)
        print("stderr:", result.stderr, file=sys.stderr)
        sys.exit(1)

    hb_path = tmp_root / ".coderef" / "last-scan.json"
    if not hb_path.exists():
        print(f"FAIL: heartbeat missing at {hb_path}", file=sys.stderr)
        sys.exit(1)

    # The exact LLOYD read pattern from docs/LLOYD-INTEGRATION.md
    try:
        hb = json.loads(hb_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        print(f"FAIL: heartbeat not valid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    failures = []

    if hb.get("schema_version") != 1:
        failures.append(f"schema_version: expected 1, got {hb.get('schema_version')}")

    last_scan = datetime.fromisoformat(hb["last_scan_at"].replace("Z", "+00:00"))
    alive_at  = datetime.fromisoformat(hb["alive_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)

    doc_age_seconds = (now - last_scan).total_seconds()
    daemon_alive_seconds = (now - alive_at).total_seconds()

    if doc_age_seconds >= 60:
        failures.append(f"doc_age_seconds: expected < 60 (just wrote it), got {doc_age_seconds:.1f}")
    if daemon_alive_seconds >= 60:
        failures.append(f"daemon_alive_seconds: expected < 60, got {daemon_alive_seconds:.1f}")
    if hb.get("status") not in ("pass", "skipped"):
        failures.append(f"status: expected pass|skipped, got {hb.get('status')}")
    if hb.get("trigger", {}).get("kind") != "once":
        failures.append(f"trigger.kind: expected 'once', got {hb.get('trigger', {}).get('kind')!r}")
    if not isinstance(hb.get("pid"), int) or hb["pid"] < 1:
        failures.append(f"pid: expected int >= 1, got {hb.get('pid')!r}")

    if failures:
        print("FAIL:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        print("---heartbeat---", file=sys.stderr)
        print(json.dumps(hb, indent=2), file=sys.stderr)
        sys.exit(1)

    print(
        f"PASS: LLOYD-style read OK; doc_age_seconds={doc_age_seconds:.2f}, "
        f"daemon_alive_seconds={daemon_alive_seconds:.2f}, status={hb['status']}"
    )
    sys.exit(0)
finally:
    try:
        shutil.rmtree(tmp_root, ignore_errors=True)
    except OSError:
        pass
