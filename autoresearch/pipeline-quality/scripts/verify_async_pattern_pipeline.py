#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * @exports log, count_async_functions, count_workorders_with_async_awareness, calculate_async_recall, calculate_async_awareness, calculate_pipeline_score, main
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports log, count_async_functions, count_workorders_with_async_awareness, calculate_async_recall, calculate_async_awareness, calculate_pipeline_score, main
 */






"""
Verification script for Loop 9: Async Pattern Pipeline Quality

Measures end-to-end pipeline from async detection to workorder awareness.

Metric: async_pipeline_score = async_recall × async_awareness (or weighted)

Components:
- async_recall: How well scanner detects async functions
- async_awareness: How many workorders mention async/concurrency patterns

Output: Single float to stdout (0.0 to 1.0)
"""
import sys
import json
import argparse
from pathlib import Path
from typing import Set, List

def log(message: str) -> None:
    """Log to stderr so stdout stays clean for metric output."""
    print(message, file=sys.stderr)

def count_async_functions(project_path: Path) -> int:
    """
    Count async functions detected by scanner.

    Returns: Number of async functions in index.json
    """
    index_path = project_path / '.coderef' / 'index.json'

    if not index_path.exists():
        log(f"WARNING: index.json not found at {index_path}")
        return 0

    with open(index_path, 'r', encoding='utf-8') as f:
        elements = json.load(f)

    async_funcs = [e for e in elements if e.get('async') == True and e.get('type') == 'function']

    log(f"Detected {len(async_funcs)} async functions from index.json")
    if async_funcs:
        log(f"  Examples: {[f['name'] for f in async_funcs[:5]]}")

    return len(async_funcs)

def count_workorders_with_async_awareness(workorder_dir: Path) -> tuple[int, int]:
    """
    Count how many workorders mention async/concurrency patterns.

    Searches for keywords: async, await, Promise, concurrency, race condition

    Returns: (workorders_with_async, total_workorders)
    """
    workorder_paths = list(workorder_dir.glob('*/plan.json'))

    if not workorder_paths:
        log(f"WARNING: No workorders found in {workorder_dir}")
        return (0, 0)

    async_keywords = ['async', 'await', 'Promise', 'concurrency', 'race condition', 'asynchronous']
    workorders_with_async = 0

    for plan_path in workorder_paths:
        try:
            with open(plan_path, 'r', encoding='utf-8') as f:
                content = f.read().lower()

            if any(keyword.lower() in content for keyword in async_keywords):
                workorders_with_async += 1
        except Exception as e:
            log(f"WARNING: Failed to read {plan_path}: {e}")
            continue

    log(f"Workorders with async awareness: {workorders_with_async}/{len(workorder_paths)}")

    return (workorders_with_async, len(workorder_paths))

def calculate_async_recall(detected_async: int) -> float:
    """
    Calculate async recall.

    Since we don't have ground truth, we'll use a heuristic:
    - Expected ~50-100 async functions in a TypeScript dashboard
    - If detected > 50: recall = min(1.0, detected / 80)
    - If detected < 50: recall = detected / 80

    Returns: Float in range [0.0, 1.0]
    """
    # Heuristic: assume ~80 async functions is reasonable for this codebase
    expected_async_count = 80

    recall = min(1.0, detected_async / expected_async_count)

    log(f"Async recall (heuristic):")
    log(f"  Detected: {detected_async}")
    log(f"  Expected: ~{expected_async_count}")
    log(f"  Recall: {recall:.6f}")

    return recall

def calculate_async_awareness(with_async: int, total: int) -> float:
    """
    Calculate async awareness in workorders.

    Formula: workorders_with_async / total_workorders

    Returns: Float in range [0.0, 1.0]
    """
    if total == 0:
        log("WARNING: No workorders found, returning awareness 0.0")
        return 0.0

    awareness = with_async / total

    log(f"Async awareness:")
    log(f"  Workorders with async mentions: {with_async}")
    log(f"  Total workorders: {total}")
    log(f"  Awareness: {awareness:.6f}")

    return awareness

def calculate_pipeline_score(
    recall: float,
    awareness: float,
    use_weighted: bool = False
) -> float:
    """
    Calculate unified pipeline score.

    Multiplicative: pipeline_score = recall × awareness
    Weighted:       pipeline_score = (recall × 0.5) + (awareness × 0.5)

    Returns: Float in range [0.0, 1.0]
    """
    if use_weighted:
        pipeline_score = (recall * 0.5) + (awareness * 0.5)
        log(f"")
        log(f"Pipeline score calculation (WEIGHTED):")
        log(f"  Async recall (50% weight): {recall:.6f}")
        log(f"  Async awareness (50% weight): {awareness:.6f}")
        log(f"  Weighted pipeline score: {pipeline_score:.6f}")
    else:
        pipeline_score = recall * awareness
        log(f"")
        log(f"Pipeline score calculation (MULTIPLICATIVE):")
        log(f"  Async recall: {recall:.6f}")
        log(f"  Async awareness: {awareness:.6f}")
        log(f"  Pipeline score: {pipeline_score:.6f}")

    return pipeline_score

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Verify async pattern pipeline quality'
    )
    parser.add_argument(
        '--project-path',
        type=str,
        required=True,
        help='Absolute path to project directory'
    )
    parser.add_argument(
        '--workorder-dir',
        type=str,
        default='coderef/workorder',
        help='Path to workorder directory (relative to project root, default: coderef/workorder)'
    )
    parser.add_argument(
        '--weighted',
        action='store_true',
        help='Use weighted formula (recall×0.5 + awareness×0.5) instead of multiplicative (recall×awareness)'
    )

    args = parser.parse_args()

    project_path = Path(args.project_path)
    workorder_dir = project_path / args.workorder_dir

    log("=" * 60)
    log("Loop 9: Async Pattern Pipeline Quality Verification")
    log("=" * 60)
    log(f"Project path: {project_path}")
    log(f"Workorder directory: {workorder_dir}")
    log("")

    # Validate paths
    if not project_path.exists():
        log(f"ERROR: Project path does not exist: {project_path}")
        sys.exit(1)

    # Count async functions
    detected_async = count_async_functions(project_path)

    # Count workorders with async awareness
    with_async, total_workorders = count_workorders_with_async_awareness(workorder_dir)

    # Calculate recall (heuristic)
    recall = calculate_async_recall(detected_async)

    # Calculate awareness
    awareness = calculate_async_awareness(with_async, total_workorders)

    # Calculate pipeline score
    pipeline_score = calculate_pipeline_score(recall, awareness, use_weighted=args.weighted)

    # Print score to stdout (ONLY output to stdout)
    print(f"{pipeline_score:.6f}")

    log("=" * 60)

    # Exit success
    sys.exit(0)

if __name__ == '__main__':
    main()
