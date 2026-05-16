#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * */

"""
Loop 5 Verification: Context Summary Signal Quality

Measures context_summary_precision by checking if test file functions
are incorrectly surfaced as "critical functions" in context.md.

Score calculation:
- 1.0 = Perfect (no test functions in critical list)
- 0.0 = Worst (all critical functions are from tests)
- Formula: (total_critical - test_critical) / total_critical

Contract (per VERIFY-CONTRACTS.md):
- Print exactly ONE numeric value to stdout (float in range 0.0-1.0)
- All diagnostic logs go to stderr only
- Exit 0 on success, non-zero on error
- Deterministic output (no timestamps, no randomness)
"""

import sys
import re
import subprocess
import argparse
from pathlib import Path

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


def load_context_md(scan_dir: Path) -> str:
    """Load context.md from scan directory"""
    context_path = scan_dir / 'context.md'

    if not context_path.exists():
        log(f"ERROR: context.md not found at {context_path}")
        sys.exit(1)

    try:
        with open(context_path, 'r', encoding='utf-8') as f:
            content = f.read()
        log(f"Loaded context.md")
        return content
    except Exception as e:
        log(f"ERROR: Failed to read context.md: {e}")
        sys.exit(1)


def extract_critical_functions(context_md: str) -> list[tuple[str, str]]:
    """
    Extract critical functions from context.md.

    Returns list of (function_name, file_path) tuples.
    """
    critical_functions = []

    # Find "## Critical Functions" section
    lines = context_md.split('\n')
    in_critical_section = False

    for i, line in enumerate(lines):
        if line.strip() == "## Critical Functions":
            in_critical_section = True
            continue

        if in_critical_section:
            # Stop at next section
            if line.startswith('## '):
                break

            # Parse function line: - **function_name** - Complexity: X, Dependents: Y
            if line.startswith('- **'):
                func_match = re.match(r'- \*\*([^*]+)\*\*', line)
                if func_match:
                    func_name = func_match.group(1)

                    # Next line should have file path: - File: path/to/file.py
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        file_match = re.match(r'\s+- File: (.+)', next_line)
                        if file_match:
                            file_path = file_match.group(1)
                            critical_functions.append((func_name, file_path))

    return critical_functions


def check_test_contamination(critical_functions: list[tuple[str, str]]) -> tuple[int, int]:
    """
    Check how many critical functions are from test files.

    Returns (test_count, total_count)
    """
    test_patterns = [
        '/test_',
        '/tests/',
        '_test.py',
        '.test.',
    ]

    test_count = 0
    total_count = len(critical_functions)

    log(f"")
    log(f"Checking {total_count} critical functions for test contamination:")

    for func_name, file_path in critical_functions:
        is_test = any(pattern in file_path for pattern in test_patterns)

        if is_test:
            test_count += 1
            log(f"  ✗ TEST FILE: {func_name} in {file_path}")
        else:
            log(f"  ✓ Production: {func_name} in {file_path}")

    return test_count, total_count


def calculate_score(test_count: int, total_count: int) -> float:
    """
    Calculate context_summary_precision.

    Formula: (total - test_count) / total

    Returns float in range [0.0, 1.0]
    """
    if total_count == 0:
        log("WARNING: No critical functions found, returning score 1.0")
        return 1.0

    production_count = total_count - test_count
    precision = production_count / total_count
    precision = max(0.0, min(1.0, precision))

    log(f"")
    log(f"Score calculation:")
    log(f"  Total critical functions: {total_count}")
    log(f"  Test file functions: {test_count}")
    log(f"  Production functions: {production_count}")
    log(f"  Precision: {precision:.6f}")

    return precision


def main():
    parser = argparse.ArgumentParser(
        description='Verify context summary signal quality for Python scanning'
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

    log(f"Verifying context summary signal quality")
    log(f"  Corpus root: {corpus_root}")
    log(f"  Scan dir: {scan_dir}")
    log("")

    # Re-scan corpus with current scanner code
    rescan_corpus(corpus_root, scan_dir)

    # Load context.md
    context_md = load_context_md(scan_dir)

    # Extract critical functions
    critical_functions = extract_critical_functions(context_md)

    # Check test contamination
    test_count, total_count = check_test_contamination(critical_functions)

    # Calculate score
    score = calculate_score(test_count, total_count)

    # Print score to stdout (ONLY output to stdout)
    print(f"{score:.6f}")

    # Exit success
    sys.exit(0)


if __name__ == '__main__':
    main()
