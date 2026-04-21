#!/usr/bin/env python3
"""
Loop 3 Verification: Test Discovery and Coverage Linkage

Measures test_link_accuracy for Python test discovery.
Checks that production files with corresponding test files are marked as tested.

Score calculation:
- 1.0 = Perfect (all known test links detected)
- 0.0 = Worst (no test links detected)
- Formula: detected_links / total_known_links

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
    This ensures we measure the effect of scanner modifications.
    """
    log(f"Re-scanning corpus with current scanner code...")

    # Find the coderef-core populate CLI
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

    # Run the scanner
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


def load_coverage(scan_dir: Path) -> Dict:
    """Load coverage.json from scan directory"""
    coverage_path = scan_dir / 'reports' / 'coverage.json'

    if not coverage_path.exists():
        log(f"ERROR: coverage.json not found at {coverage_path}")
        sys.exit(1)

    try:
        with open(coverage_path, 'r', encoding='utf-8') as f:
            coverage = json.load(f)
        log(f"Loaded coverage.json")
        return coverage
    except json.JSONDecodeError as e:
        log(f"ERROR: Failed to parse coverage.json: {e}")
        sys.exit(1)
    except Exception as e:
        log(f"ERROR: Failed to read coverage.json: {e}")
        sys.exit(1)


def build_known_test_links() -> Dict[str, str]:
    """
    Build ground truth of test → production file links.

    Returns dict: {production_file: test_file}
    """
    # Known test links in stl-agent corpus
    # Format: production file → test file
    known_links = {
        'src/agents/result_builder.py': 'tests/test_result_builder.py',
        'tools/mesh_frame/mesh_frame_generator.py': 'tests/test_mesh_frame_generator.py',
        'tools/paper_label/job.py': 'tests/test_paper_label_job.py',
    }

    # Note: test_router.py and test_integration.py are harder to map to single files
    # but we can check if at least the obvious ones work

    return known_links


def check_test_linkage(coverage: Dict, known_links: Dict[str, str]) -> tuple[int, int]:
    """
    Check if known test links are detected.

    Returns (detected_links, total_links)
    """
    detected = 0
    total = len(known_links)

    # Build map of file → tested status
    file_status = {}
    for file_info in coverage.get('files', []):
        file_status[file_info['file']] = file_info.get('tested', False)

    log(f"Checking {total} known test links:")

    for prod_file, test_file in known_links.items():
        is_tested = file_status.get(prod_file, False)

        if is_tested:
            detected += 1
            log(f"  ✓ {prod_file} marked as tested (test: {test_file})")
        else:
            log(f"  ✗ {prod_file} NOT marked as tested (test: {test_file})")

    return detected, total


def check_coverage_summary(coverage: Dict) -> None:
    """Log coverage summary for diagnostic purposes"""
    summary = coverage.get('summary', {})

    log(f"")
    log(f"Coverage summary:")
    log(f"  Total files: {summary.get('totalFiles', 0)}")
    log(f"  Tested files: {summary.get('testedFiles', 0)}")
    log(f"  Coverage percentage: {summary.get('coveragePercentage', 0)}%")


def calculate_score(detected: int, total: int) -> float:
    """
    Calculate test_link_accuracy.

    Formula: detected / total

    Returns float in range [0.0, 1.0]
    """
    if total == 0:
        log("WARNING: No known test links, returning score 1.0")
        return 1.0

    score = detected / total
    score = max(0.0, min(1.0, score))

    log(f"")
    log(f"Score calculation:")
    log(f"  Detected links: {detected}")
    log(f"  Total known links: {total}")
    log(f"  Accuracy: {score:.6f}")

    return score


def main():
    parser = argparse.ArgumentParser(
        description='Verify test discovery and coverage linkage for Python scanning'
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

    log(f"Verifying test discovery and coverage linkage")
    log(f"  Corpus root: {corpus_root}")
    log(f"  Scan dir: {scan_dir}")
    log("")

    # Re-scan corpus with current scanner code
    rescan_corpus(corpus_root, scan_dir)

    # Load coverage.json
    coverage = load_coverage(scan_dir)

    # Check coverage summary
    check_coverage_summary(coverage)

    # Build known test links
    known_links = build_known_test_links()

    # Check test linkage
    detected, total = check_test_linkage(coverage, known_links)

    # Calculate score
    score = calculate_score(detected, total)

    # Print score to stdout (ONLY output to stdout)
    print(f"{score:.6f}")

    # Exit success
    sys.exit(0)


if __name__ == '__main__':
    main()
