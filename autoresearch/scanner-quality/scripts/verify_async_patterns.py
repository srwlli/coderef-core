#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * @exports log, rescan_corpus, load_patterns, build_known_async_functions, check_async_detection, calculate_score, main
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports log, rescan_corpus, load_patterns, build_known_async_functions, check_async_detection, calculate_score, main
 */






"""
Loop 4 Verification: Async Pattern Detection

Measures async_pattern_recall for Python async function detection.
Checks that known async functions are detected and included in asyncPatterns.

Score calculation:
- 1.0 = Perfect (all known async functions detected)
- 0.0 = Worst (no async functions detected)
- Formula: detected_async / total_known_async

Contract (per VERIFY-CONTRACTS.md):
- Print exactly ONE numeric value to stdout (float in range 0.0-1.0)
- All diagnostic logs go to stderr only
- Exit 0 on success, non-zero on error
- Deterministic output (no timestamps, no randomness)
"""

import sys
import json
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Set


def log(message: str) -> None:
    """Write diagnostic messages to stderr only"""
    print(message, file=sys.stderr)


def rescan_corpus(corpus_root: Path, scan_dir: Path) -> None:
    """
    Re-scan the corpus using the current scanner code from coderef-core.
    """
    log(f"Re-scanning corpus with current scanner code...")

    script_dir = Path(__file__).parent
    coderef_core = script_dir.parent.parent.parent
    populate_cli = coderef_core / "dist" / "src" / "cli" / "populate.js"

    if not populate_cli.exists():
        log(f"Building coderef-core (populate CLI not found)...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        build_result = subprocess.run(
            [npm_cmd, "run", "build"],
            cwd=coderef_core,
            capture_output=True,
            text=True,
            shell=True
        )
        if build_result.returncode != 0:
            log(f"ERROR: Failed to build coderef-core: {build_result.stderr}")
            sys.exit(1)

    log(f"Running: node {populate_cli} --lang py {corpus_root}")
    result = subprocess.run(
        ["node", str(populate_cli), "--lang", "py", str(corpus_root)],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        log(f"ERROR: Scanner failed: {result.stderr}")
        sys.exit(1)

    log(f"Re-scan complete. Output written to {scan_dir}")


def load_patterns(scan_dir: Path) -> Dict:
    """Load patterns.json from scan directory"""
    patterns_path = scan_dir / 'reports' / 'patterns.json'

    if not patterns_path.exists():
        log(f"ERROR: patterns.json not found at {patterns_path}")
        sys.exit(1)

    try:
        with open(patterns_path, 'r', encoding='utf-8') as f:
            patterns = json.load(f)
        log(f"Loaded patterns.json")
        return patterns
    except json.JSONDecodeError as e:
        log(f"ERROR: Failed to parse patterns.json: {e}")
        sys.exit(1)
    except Exception as e:
        log(f"ERROR: Failed to read patterns.json: {e}")
        sys.exit(1)


def build_known_async_functions() -> Set[str]:
    """
    Build ground truth set of async functions in stl-agent corpus.

    Returns set of "file:function_name" strings
    """
    known_async = {
        'cli.py:main',
        'src/agents/cloud_agent.py:run_cloud_agent',
        'src/agents/code_agent.py:run_code_agent',
        'src/agents/result_builder.py:build_result',
        'src/tools/meshy_tool.py:MeshyTool.text_to_3d',
        'src/tools/meshy_tool.py:MeshyTool.image_to_3d',
        'src/tools/meshy_tool.py:MeshyTool.multi_image_to_3d',
        'src/api.py:health',
        'src/api.py:submit_job',
        'src/api.py:get_job',
        'src/api.py:generate_sync',
    }

    return known_async


def check_async_detection(patterns: Dict, known_async: Set[str]) -> tuple[int, int]:
    """
    Check if known async functions are detected in asyncPatterns.

    Returns (detected_count, total_count)
    """
    async_patterns = patterns.get('asyncPatterns', [])

    log(f"asyncPatterns in patterns.json: {len(async_patterns)}")

    # Build set of detected async functions
    detected = set()
    for pattern in async_patterns:
        file = pattern.get('file', '')
        name = pattern.get('name', '')
        key = f"{file}:{name}"
        detected.add(key)

    # Check against known async functions
    detected_count = 0
    total_count = len(known_async)

    log(f"")
    log(f"Checking {total_count} known async functions:")

    for key in sorted(known_async):
        if key in detected:
            detected_count += 1
            log(f"  ✓ Detected: {key}")
        else:
            log(f"  ✗ Missing: {key}")

    return detected_count, total_count


def calculate_score(detected: int, total: int) -> float:
    """
    Calculate async_pattern_recall.

    Formula: detected / total

    Returns float in range [0.0, 1.0]
    """
    if total == 0:
        log("WARNING: No known async functions, returning score 1.0")
        return 1.0

    score = detected / total
    score = max(0.0, min(1.0, score))

    log(f"")
    log(f"Score calculation:")
    log(f"  Detected async functions: {detected}")
    log(f"  Total known async functions: {total}")
    log(f"  Recall: {score:.6f}")

    return score


def main():
    parser = argparse.ArgumentParser(
        description='Verify async pattern detection for Python scanning'
    )
    parser.add_argument(
        '--corpus-root',
        type=str,
        required=True,
        help='Path to stl-agent corpus root directory'
    )
    parser.add_argument(
        '--scan-dir',
        type=str,
        required=True,
        help='Path to .coderef directory'
    )

    args = parser.parse_args()

    corpus_root = Path(args.corpus_root)
    scan_dir = Path(args.scan_dir)

    # Validate paths
    if not corpus_root.exists():
        log(f"ERROR: Corpus root does not exist: {corpus_root}")
        sys.exit(1)

    if not scan_dir.exists():
        log(f"ERROR: Scan directory does not exist: {scan_dir}")
        sys.exit(1)

    log(f"Verifying async pattern detection")
    log(f"  Corpus root: {corpus_root}")
    log(f"  Scan dir: {scan_dir}")
    log("")

    # Re-scan corpus with current scanner code
    rescan_corpus(corpus_root, scan_dir)

    # Load patterns.json
    patterns = load_patterns(scan_dir)

    # Build known async functions
    known_async = build_known_async_functions()

    # Check async detection
    detected, total = check_async_detection(patterns, known_async)

    # Calculate score
    score = calculate_score(detected, total)

    # Print score to stdout (ONLY output to stdout)
    print(f"{score:.6f}")

    # Exit success
    sys.exit(0)


if __name__ == '__main__':
    main()
