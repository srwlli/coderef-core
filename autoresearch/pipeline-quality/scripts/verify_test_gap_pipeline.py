#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * @exports log, load_ground_truth, load_detected_test_gaps, calculate_precision, check_test_existence, calculate_closure_rate, calculate_pipeline_score, main
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports log, load_ground_truth, load_detected_test_gaps, calculate_precision, check_test_existence, calculate_closure_rate, calculate_pipeline_score, main
 */






"""
Verification script for Loop 8: Test Gap Pipeline Quality

Measures end-to-end pipeline from testGaps detection to actual test creation.

Metric: testgap_pipeline_score = testgap_precision × testgap_closure_rate

Components:
- testgap_precision: How well scanner identifies true test gaps
- testgap_closure_rate: How many test gaps actually get tests created

Output: Single float to stdout (0.0 to 1.0)
"""
import sys
import json
import argparse
from pathlib import Path
from typing import Set, List, Dict

def log(message: str) -> None:
    """Log to stderr so stdout stays clean for metric output."""
    print(message, file=sys.stderr)

def load_ground_truth(ground_truth_path: Path, use_mock: bool = False) -> Set[str]:
    """
    Load manually labeled high-value test gaps.

    Expected format (JSON):
    {
      "high_value_test_gaps": [
        "convertGraphToElements",
        "detectPreset",
        ...
      ]
    }

    Returns: Set of function names
    """
    if use_mock:
        log("Using MOCK ground truth for testing")
        mock_gaps = {
            "convertGraphToElements",
            "detectPreset",
            "loadIgnorePatterns",
            "validateReferences",
            "analyzeCoverage",
            "detectDrift",
            "detectPatterns",
            "generateDiagrams",
            "formatFrontendCallsJson",
            "sortFrontendCalls"
        }
        log(f"Loaded {len(mock_gaps)} MOCK high-value test gaps")
        return mock_gaps

    if not ground_truth_path.exists():
        log(f"ERROR: Ground truth file not found at {ground_truth_path}")
        log("TIP: Use --mock flag for testing without ground truth")
        sys.exit(1)

    with open(ground_truth_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    test_gaps = set(data.get('high_value_test_gaps', []))

    if not test_gaps:
        log("ERROR: No test gaps in ground truth")
        log("TIP: Use --mock flag for testing")
        sys.exit(1)

    log(f"Loaded {len(test_gaps)} ground truth high-value test gaps")
    return test_gaps

def load_detected_test_gaps(project_path: Path) -> Set[str]:
    """
    Load detected testGaps from patterns.json.

    Returns: Set of detected test gap function names
    """
    patterns_path = project_path / '.coderef' / 'reports' / 'patterns.json'

    if not patterns_path.exists():
        log(f"WARNING: patterns.json not found at {patterns_path}")
        log("Using empty detection set (scanner not run)")
        return set()

    with open(patterns_path, 'r', encoding='utf-8') as f:
        patterns = json.load(f)

    test_gaps = patterns.get('testGaps', [])
    detected_names = {gap['name'] for gap in test_gaps}

    log(f"Detected {len(detected_names)} test gaps from patterns.json")
    if detected_names:
        log(f"  Examples: {list(detected_names)[:5]}")

    return detected_names

def calculate_precision(
    ground_truth: Set[str],
    detected: Set[str]
) -> float:
    """
    Calculate testGap precision = TP / (TP + FP)

    Where:
    - TP (true positives) = gaps in both ground_truth AND detected
    - FP (false positives) = gaps in detected but NOT in ground_truth

    Returns: Float in range [0.0, 1.0]
    """
    if not detected:
        log("WARNING: No detected test gaps, returning precision 0.0")
        return 0.0

    true_positives = len(ground_truth & detected)
    false_positives = len(detected - ground_truth)

    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0

    log(f"TestGap precision:")
    log(f"  True positives: {true_positives}")
    log(f"  False positives: {false_positives}")
    log(f"  Precision: {precision:.6f}")

    return precision

def check_test_existence(project_path: Path, function_names: Set[str]) -> Set[str]:
    """
    Check which functions have tests by searching test files.

    Simple heuristic: Search for function name in test files.

    Returns: Set of function names that have tests
    """
    functions_with_tests = set()

    # Find all test files
    test_patterns = ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', '**/*_test.py']
    test_files = []

    for pattern in test_patterns:
        test_files.extend(project_path.glob(pattern))

    log(f"Found {len(test_files)} test files")

    # Search for function names in test files
    for test_file in test_files:
        try:
            content = test_file.read_text(encoding='utf-8')
            for func_name in function_names:
                if func_name in content:
                    functions_with_tests.add(func_name)
        except Exception as e:
            log(f"WARNING: Failed to read {test_file}: {e}")
            continue

    return functions_with_tests

def calculate_closure_rate(
    detected: Set[str],
    project_path: Path
) -> float:
    """
    Calculate test gap closure rate.

    Formula: functions_with_tests / total_detected

    Returns: Float in range [0.0, 1.0]
    """
    if not detected:
        log("WARNING: No detected test gaps, returning closure rate 0.0")
        return 0.0

    functions_with_tests = check_test_existence(project_path, detected)

    closure_rate = len(functions_with_tests) / len(detected)

    log(f"TestGap closure rate:")
    log(f"  Detected gaps: {len(detected)}")
    log(f"  Gaps with tests: {len(functions_with_tests)}")
    log(f"  Closure rate: {closure_rate:.6f}")

    if functions_with_tests:
        log(f"  Examples with tests: {list(functions_with_tests)[:5]}")

    return closure_rate

def calculate_pipeline_score(
    precision: float,
    closure_rate: float,
    use_weighted: bool = False
) -> float:
    """
    Calculate unified pipeline score.

    Multiplicative (original): pipeline_score = precision × closure_rate
    Weighted (revised):        pipeline_score = (precision × 0.6) + (closure_rate × 0.4)

    Returns: Float in range [0.0, 1.0]
    """
    if use_weighted:
        pipeline_score = (precision * 0.6) + (closure_rate * 0.4)
        log(f"")
        log(f"Pipeline score calculation (WEIGHTED):")
        log(f"  TestGap precision (60%% weight): {precision:.6f}")
        log(f"  Test closure rate (40%% weight): {closure_rate:.6f}")
        log(f"  Weighted pipeline score: {pipeline_score:.6f}")
    else:
        pipeline_score = precision * closure_rate
        log(f"")
        log(f"Pipeline score calculation (MULTIPLICATIVE):")
        log(f"  TestGap precision: {precision:.6f}")
        log(f"  Test closure rate: {closure_rate:.6f}")
        log(f"  Pipeline score: {pipeline_score:.6f}")

    return pipeline_score

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Verify test gap pipeline quality'
    )
    parser.add_argument(
        '--project-path',
        type=str,
        required=True,
        help='Absolute path to project directory'
    )
    parser.add_argument(
        '--ground-truth',
        type=str,
        default='autoresearch/pipeline-quality/test-gaps-ground-truth.json',
        help='Path to ground truth file (relative to coderef-core root)'
    )
    parser.add_argument(
        '--mock',
        action='store_true',
        help='Use mock ground truth for testing (no real ground truth needed)'
    )
    parser.add_argument(
        '--weighted',
        action='store_true',
        help='Use weighted formula (precision×0.6 + closure×0.4) instead of multiplicative (precision×closure)'
    )

    args = parser.parse_args()

    project_path = Path(args.project_path)

    # Ground truth is relative to packages/coderef-core
    script_dir = Path(__file__).parent
    coderef_core = script_dir.parent.parent.parent
    ground_truth_path = coderef_core / args.ground_truth

    log("=" * 60)
    log("Loop 8: Test Gap Pipeline Quality Verification")
    log("=" * 60)
    log(f"Project path: {project_path}")
    if not args.mock:
        log(f"Ground truth: {ground_truth_path}")
    log("")

    # Validate paths
    if not project_path.exists():
        log(f"ERROR: Project path does not exist: {project_path}")
        sys.exit(1)

    # Load ground truth (mock or real)
    ground_truth = load_ground_truth(ground_truth_path, use_mock=args.mock)

    # Load detected test gaps
    detected_gaps = load_detected_test_gaps(project_path)

    # Calculate precision
    precision = calculate_precision(ground_truth, detected_gaps)

    # Calculate closure rate
    closure_rate = calculate_closure_rate(detected_gaps, project_path)

    # Calculate unified pipeline score
    pipeline_score = calculate_pipeline_score(precision, closure_rate, use_weighted=args.weighted)

    # Print score to stdout (ONLY output to stdout)
    print(f"{pipeline_score:.6f}")

    log("=" * 60)

    # Exit success
    sys.exit(0)

if __name__ == '__main__':
    main()
