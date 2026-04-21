#!/usr/bin/env python3
"""
Verification script for Loop 6: Test Gap Precision

Measures how many testGaps entries are from production code vs test files.

Metric: test_gap_precision = (production_gaps) / (total_gaps)
Target: 1.00 (only production code in testGaps)

Output: Single float to stdout (0.0 to 1.0)
"""
import json
import subprocess
import sys
import argparse
from pathlib import Path

def log(message: str) -> None:
    """Log to stderr so stdout stays clean for metric output."""
    print(message, file=sys.stderr)

def rescan_corpus(corpus_root: Path, scan_dir: Path) -> None:
    """
    Rescan the stl-agent corpus using current scanner code.
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

def is_test_file(file_path: str) -> bool:
    """
    Check if a file path is a test file.

    Patterns:
    - Contains /tests/
    - Starts with tests/
    - Contains /test_
    - Starts with test_
    - Ends with _test.py
    - Contains .test.
    - Contains .spec.
    """
    normalized = file_path.replace('\\', '/')

    return (
        '/tests/' in normalized or
        normalized.startswith('tests/') or
        '/test_' in normalized or
        normalized.startswith('test_') or
        normalized.endswith('_test.py') or
        '.test.' in normalized or
        '.spec.' in normalized
    )

def calculate_score(scan_dir: Path) -> float:
    """
    Calculate test_gap_precision from patterns.json.

    Formula: (production_gaps) / (total_gaps)
    Returns float in range [0.0, 1.0]
    """
    patterns_path = scan_dir / 'reports' / 'patterns.json'

    if not patterns_path.exists():
        log(f"ERROR: patterns.json not found at {patterns_path}")
        sys.exit(1)

    log(f"Loading patterns from: {patterns_path}")

    with open(patterns_path, 'r', encoding='utf-8') as f:
        patterns = json.load(f)

    test_gaps = patterns.get('testGaps', [])
    total_gaps = len(test_gaps)

    log(f"Total testGaps entries: {total_gaps}")

    if total_gaps == 0:
        log("WARNING: No testGaps found, returning score 1.0")
        return 1.0

    # Count entries from test files
    test_file_count = 0
    test_file_examples = []

    for gap in test_gaps:
        file_path = gap.get('file', '')
        if is_test_file(file_path):
            test_file_count += 1
            if len(test_file_examples) < 5:
                test_file_examples.append(f"  - {gap.get('name')} in {file_path}")

    production_gaps = total_gaps - test_file_count

    log(f"Test file gaps: {test_file_count}")
    log(f"Production gaps: {production_gaps}")

    if test_file_examples:
        log(f"Example test file gaps:")
        for example in test_file_examples:
            log(example)

    # Calculate precision
    precision = production_gaps / total_gaps
    precision = max(0.0, min(1.0, precision))

    log(f"test_gap_precision = {production_gaps}/{total_gaps} = {precision:.6f}")

    return precision

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Verify test gap precision for Python scanning'
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

    log(f"Verifying test gap precision")
    log(f"  Corpus root: {corpus_root}")
    log(f"  Scan dir: {scan_dir}")
    log("")

    # Re-scan corpus with current scanner code
    rescan_corpus(corpus_root, scan_dir)

    # Calculate score
    score = calculate_score(scan_dir)

    # Print score to stdout (ONLY output to stdout)
    print(f"{score:.6f}")

    # Exit success
    sys.exit(0)

if __name__ == '__main__':
    main()
