#!/usr/bin/env python3
"""
Loop 2 Verification: Export and Relationship Accuracy

Measures export_relationship_precision for Python code scanning.
Checks that methods and properties are never marked as exported.

Score calculation:
- 1.0 = Perfect (no methods/properties exported)
- 0.0 = Worst (all exports are wrong)
- Formula: (total_exports - bad_exports) / total_exports

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
from typing import Dict, List


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

    log(f"Re-scan complete. Output written to {scan_dir}/index.json")


def load_index(scan_dir: Path) -> List[Dict]:
    """Load index.json from scan directory"""
    index_path = scan_dir / 'index.json'

    if not index_path.exists():
        log(f"ERROR: index.json not found at {index_path}")
        sys.exit(1)

    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            elements = json.load(f)
        log(f"Loaded {len(elements)} elements from index.json")
        return elements
    except json.JSONDecodeError as e:
        log(f"ERROR: Failed to parse index.json: {e}")
        sys.exit(1)
    except Exception as e:
        log(f"ERROR: Failed to read index.json: {e}")
        sys.exit(1)


def check_export_precision(elements: List[Dict]) -> float:
    """
    Check that methods and properties are never marked as exported.

    Returns precision score (1.0 = perfect, 0.0 = all wrong)
    """
    exports_by_type = {}

    for elem in elements:
        if elem.get('exported'):
            elem_type = elem.get('type')
            exports_by_type[elem_type] = exports_by_type.get(elem_type, 0) + 1

            # Log bad exports
            if elem_type in ('method', 'property'):
                name = elem.get('name', '')
                file = elem.get('file', '')
                log(f"  ✗ BAD EXPORT: {name} ({elem_type}) in {file}")

    log(f"Exported elements by type:")
    for elem_type, count in sorted(exports_by_type.items()):
        log(f"  {elem_type}: {count}")

    # Calculate bad exports (methods/properties should NEVER be exported)
    bad_exports = exports_by_type.get('method', 0) + exports_by_type.get('property', 0)
    total_exports = sum(exports_by_type.values())

    if total_exports == 0:
        log("WARNING: No exports found")
        return 1.0  # No exports = no errors

    precision = (total_exports - bad_exports) / total_exports

    log(f"Score calculation:")
    log(f"  Total exports: {total_exports}")
    log(f"  Bad exports (methods/properties): {bad_exports}")
    log(f"  Precision: {precision:.6f}")

    return precision


def main():
    parser = argparse.ArgumentParser(
        description='Verify export and relationship accuracy for Python scanning'
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
        help='Path to .coderef directory where index.json will be written'
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

    log(f"Verifying export and relationship accuracy")
    log(f"  Corpus root: {corpus_root}")
    log(f"  Scan dir: {scan_dir}")
    log("")

    # Re-scan corpus with current scanner code
    rescan_corpus(corpus_root, scan_dir)

    # Load newly generated index
    elements = load_index(scan_dir)

    # Check export precision
    score = check_export_precision(elements)

    # Print score to stdout (ONLY output to stdout)
    print(f"{score:.6f}")

    # Exit success
    sys.exit(0)


if __name__ == '__main__':
    main()
