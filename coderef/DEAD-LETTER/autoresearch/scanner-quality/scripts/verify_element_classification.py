#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * */

"""
Loop 1 Verification: Element Classification Quality

Measures element_classification_score for Python code scanning.
Detects duplicate emissions where class methods/properties also appear as top-level functions.

CRITICAL: This script RE-SCANS the corpus with the current scanner code before checking.
This ensures we measure the effect of scanner modifications, not frozen baseline data.

Score calculation:
- 1.0 = Perfect (no duplicates, all class members correctly classified)
- 0.0 = Worst (every class member duplicated as top-level function)
- Formula: 1.0 - (duplicate_pairs / total_elements)

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
from typing import Dict, List, Tuple


def log(message: str) -> None:
    """Write diagnostic messages to stderr only"""
    print(message, file=sys.stderr)


def rescan_corpus(corpus_root: Path, scan_dir: Path) -> None:
    """
    Re-scan the corpus using the current scanner code from coderef-core.
    This is the KEY step that makes the loop work - we test the MODIFIED scanner.
    """
    log(f"Re-scanning corpus with current scanner code...")

    # Find the coderef-core populate CLI
    # We're in: packages/coderef-core/autoresearch/scanner-quality/scripts/
    # We need: packages/coderef-core/dist/src/cli/populate.js
    script_dir = Path(__file__).parent
    coderef_core = script_dir.parent.parent.parent  # Go up to packages/coderef-core
    populate_cli = coderef_core / "dist" / "src" / "cli" / "populate.js"

    if not populate_cli.exists():
        # Try building first
        log(f"Building coderef-core (populate CLI not found)...")
        # Use npm.cmd on Windows
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

    if not populate_cli.exists():
        log(f"ERROR: populate CLI not found at {populate_cli}")
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


def detect_duplicate_pairs(elements: List[Dict]) -> List[Tuple[Dict, Dict]]:
    """
    Detect duplicate pairs where class members also appear as top-level functions.

    Pattern:
    - Member: type='method'|'property', name='ClassName.memberName', exported=False
    - Duplicate: type='function', name='memberName', exported=True, same file+line

    Returns list of (member_element, duplicate_function_element) tuples
    """
    duplicates = []

    # Index elements by file and name for quick lookup
    by_file_and_name = {}
    for elem in elements:
        file = elem.get('file', '')
        name = elem.get('name', '')
        key = f"{file}:{name}"

        if key not in by_file_and_name:
            by_file_and_name[key] = []
        by_file_and_name[key].append(elem)

    # Find class members (methods/properties)
    class_members = [e for e in elements if e.get('type') in ('method', 'property')]

    log(f"Found {len(class_members)} class members (methods/properties)")

    # For each class member, check if duplicate top-level function exists
    for member in class_members:
        member_name = member.get('name', '')

        # Extract unqualified name (e.g., "Settings.scad_dir" -> "scad_dir")
        if '.' in member_name:
            unqualified_name = member_name.split('.')[-1]
        else:
            unqualified_name = member_name

        file = member.get('file', '')
        line = member.get('line', -1)

        # Look for top-level function with same unqualified name, file, and line
        lookup_key = f"{file}:{unqualified_name}"
        candidates = by_file_and_name.get(lookup_key, [])

        for candidate in candidates:
            # Check if this is a top-level exported function
            if (candidate.get('type') == 'function' and
                candidate.get('exported') == True and
                candidate.get('line') == line):
                # Found duplicate pair
                duplicates.append((member, candidate))
                log(f"  Duplicate: {member_name} ({member.get('type')}) + "
                    f"{candidate.get('name')} (function) at {file}:{line}")

    return duplicates


def calculate_score(elements: List[Dict], duplicate_pairs: List[Tuple[Dict, Dict]]) -> float:
    """
    Calculate element_classification_score.

    Formula: 1.0 - (duplicate_count / total_elements)

    Returns float in range [0.0, 1.0]:
    - 1.0 = perfect (no duplicates)
    - 0.0 = worst (every element duplicated)
    """
    if not elements:
        log("WARNING: No elements found, returning score 0.0")
        return 0.0

    duplicate_count = len(duplicate_pairs)
    total_elements = len(elements)

    # Score formula
    score = 1.0 - (duplicate_count / total_elements)

    # Clamp to [0.0, 1.0] range
    score = max(0.0, min(1.0, score))

    log(f"Score calculation:")
    log(f"  Total elements: {total_elements}")
    log(f"  Duplicate pairs: {duplicate_count}")
    log(f"  Score: {score:.6f}")

    return score


def main():
    parser = argparse.ArgumentParser(
        description='Verify element classification quality for Python scanning'
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

    log(f"Verifying element classification")
    log(f"  Corpus root: {corpus_root}")
    log(f"  Scan dir: {scan_dir}")
    log("")

    # CRITICAL: Re-scan corpus with current scanner code
    rescan_corpus(corpus_root, scan_dir)

    # Load newly generated index
    elements = load_index(scan_dir)

    # Detect duplicate pairs
    duplicate_pairs = detect_duplicate_pairs(elements)

    # Calculate score
    score = calculate_score(elements, duplicate_pairs)

    # Print score to stdout (ONLY output to stdout)
    print(f"{score:.6f}")

    # Exit success
    sys.exit(0)


if __name__ == '__main__':
    main()
