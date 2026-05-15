#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * @exports log, load_ground_truth, scan_and_get_detected_critical_functions, calculate_detection_accuracy, analyze_workorder_utilization, calculate_pipeline_score, main
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports log, load_ground_truth, scan_and_get_detected_critical_functions, calculate_detection_accuracy, analyze_workorder_utilization, calculate_pipeline_score, main
 */






"""
Verification script for Loop 7: Critical Function Pipeline Quality (Two-Tier)

Measures end-to-end pipeline quality from scanner to workorder consumption.

Two-Tier Metric:
- Tier 1 (Architectural): High-complexity infrastructure detection (30% weight)
- Tier 2 (Usage): Workorder-relevant function detection (70% weight)

Formula: pipeline_score = (usage_detection × 0.7) + (architectural_detection × 0.3)

Components:
- architectural_detection: How well scanner finds complex infrastructure
- usage_detection: How well scanner finds workorder-referenced functions

Output: Single float to stdout (0.0 to 1.0)
"""
import sys
import json
import argparse
from pathlib import Path
from typing import Set, List, Dict, Tuple

def log(message: str) -> None:
    """Log to stderr so stdout stays clean for metric output."""
    print(message, file=sys.stderr)

def load_ground_truth(ground_truth_path: Path, use_mock: bool = False) -> Set[str]:
    """
    Load manually labeled critical functions.

    If use_mock=True, returns mock data for testing.

    Expected format (JSON):
    {
      "critical_functions": [
        "AnalyzerService.analyze",
        "PipelineOrchestrator.execute",
        "scanCurrentElements",
        ...
      ]
    }

    Returns: Set of function names
    """
    # Mock ground truth for testing
    if use_mock:
        log("Using MOCK ground truth for testing")
        # Determine tier from path name
        path_str = str(ground_truth_path).lower()

        if 'architectural' in path_str:
            mock_functions = {
                "scanCurrentElements",
                "ASTElementScanner.visitNode",
                "JSCallDetector.extractExportsFromAST",
                "JSCallDetector.extractElementsFromAST",
                "handleDragEnd",
                "fetchResources",
                "SearchIndex.search",
                "BoardTargetAdapterClass.addToTarget",
                "handleConfirmKill",
                "CodeRefValidator.validateMetadata"
            }
            log(f"Loaded {len(mock_functions)} MOCK architectural functions")
        elif 'usage' in path_str:
            mock_functions = {
                "createErrorResponse",
                "buildDependencyGraph",
                "generateContext",
                "detectPatterns",
                "saveIndex",
                "analyzeCoverage",
                "scanCurrentElements",
                "AnalyzerService.analyze",
                "QueryExecutor.execute",
                "ContextGenerator.generate"
            }
            log(f"Loaded {len(mock_functions)} MOCK usage functions")
        else:
            # Fallback to combined set
            mock_functions = {
                "scanCurrentElements",
                "buildDependencyGraph",
                "generateContext",
                "saveIndex",
                "AnalyzerService.analyze",
                "detectPatterns",
                "analyzeCoverage",
                "QueryExecutor.execute",
                "ContextGenerator.generate",
                "createErrorResponse"
            }
            log(f"Loaded {len(mock_functions)} MOCK critical functions")

        return mock_functions

    if not ground_truth_path.exists():
        log(f"ERROR: Ground truth file not found at {ground_truth_path}")
        log("TIP: Use --mock flag for testing without ground truth")
        sys.exit(1)

    with open(ground_truth_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Filter out TODO placeholders
    all_functions = data.get('critical_functions', [])
    critical_functions = set([f for f in all_functions if not f.startswith('TODO:')])

    if not critical_functions:
        log("ERROR: No valid critical functions in ground truth (only TODOs)")
        log("TIP: Use --mock flag for testing")
        sys.exit(1)

    log(f"Loaded {len(critical_functions)} ground truth critical functions")
    return critical_functions

def scan_and_get_detected_critical_functions(project_path: Path) -> Set[str]:
    """
    Scan project with current scanner and extract detected critical functions.

    Parses .coderef/context.md to extract critical functions from
    the "## Critical Functions" section.

    Returns: Set of detected critical function names
    """
    context_md_path = project_path / '.coderef' / 'context.md'

    if not context_md_path.exists():
        log(f"WARNING: context.md not found at {context_md_path}")
        log("Using empty detection set (scanner not run)")
        return set()

    # Parse context.md for critical functions section
    with open(context_md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    detected_functions = set()
    in_critical_section = False

    for line in content.split('\n'):
        # Find "## Critical Functions" section
        if line.strip() == "## Critical Functions":
            in_critical_section = True
            continue

        # Stop at next section
        if in_critical_section and line.startswith('##'):
            break

        # Extract function names from markdown list items
        # Format: "- **functionName** - Complexity: X, Dependents: Y"
        if in_critical_section and line.strip().startswith('- **'):
            # Extract text between ** markers
            import re
            match = re.search(r'\*\*([^*]+)\*\*', line)
            if match:
                function_name = match.group(1)
                detected_functions.add(function_name)

    log(f"Detected {len(detected_functions)} critical functions from context.md")
    if detected_functions:
        log(f"  Examples: {list(detected_functions)[:5]}")

    return detected_functions

def calculate_detection_accuracy(
    ground_truth: Set[str],
    detected: Set[str]
) -> float:
    """
    Calculate detection accuracy = TP / (TP + FN)

    Where:
    - TP (true positives) = functions in both ground_truth AND detected
    - FN (false negatives) = functions in ground_truth but NOT in detected

    Returns: Float in range [0.0, 1.0]
    """
    if not ground_truth:
        log("WARNING: No ground truth functions, returning accuracy 1.0")
        return 1.0

    true_positives = len(ground_truth & detected)
    false_negatives = len(ground_truth - detected)

    accuracy = true_positives / (true_positives + false_negatives)

    log(f"Detection accuracy:")
    log(f"  True positives: {true_positives}")
    log(f"  False negatives: {false_negatives}")
    log(f"  Accuracy: {accuracy:.6f}")

    return accuracy

def analyze_workorder_utilization(
    workorder_dir: Path,
    detected_functions: Set[str]
) -> float:
    """
    Analyze how many detected critical functions appear in workorders.

    Scans workorder_dir and archived/ for plan.json files and counts
    how many detected critical functions are mentioned.

    Returns: Float in range [0.0, 1.0]
    """
    if not detected_functions:
        log("WARNING: No detected functions, returning utilization 1.0")
        return 1.0

    # Find all plan.json files in workorder and archived directories
    plan_files = []

    # Scan active workorders
    if workorder_dir.exists():
        for item in workorder_dir.iterdir():
            if item.is_dir():
                plan_path = item / 'plan.json'
                if plan_path.exists():
                    plan_files.append(plan_path)

    # Scan archived workorders
    archived_dir = workorder_dir.parent / 'archived'
    if archived_dir.exists():
        for item in archived_dir.iterdir():
            if item.is_dir():
                plan_path = item / 'plan.json'
                if plan_path.exists():
                    plan_files.append(plan_path)

    log(f"Found {len(plan_files)} workorder plan.json files")

    if not plan_files:
        log("WARNING: No workorder files found, returning utilization 0.0")
        return 0.0

    # Track which functions are mentioned
    mentioned_functions = set()

    for plan_path in plan_files:
        try:
            with open(plan_path, 'r', encoding='utf-8') as f:
                plan_content = f.read()

            # Check if any detected function appears in the plan text
            for func in detected_functions:
                if func in plan_content:
                    mentioned_functions.add(func)

        except Exception as e:
            log(f"WARNING: Failed to read {plan_path}: {e}")
            continue

    mentioned_count = len(mentioned_functions)
    total_detected = len(detected_functions)

    utilization = mentioned_count / total_detected if total_detected > 0 else 0.0

    log(f"Workorder utilization:")
    log(f"  Detected functions: {total_detected}")
    log(f"  Mentioned in workorders: {mentioned_count}")
    log(f"  Utilization: {utilization:.6f}")

    if mentioned_functions:
        log(f"  Examples: {list(mentioned_functions)[:5]}")

    return utilization

def calculate_pipeline_score(
    architectural_detection: float,
    usage_detection: float
) -> float:
    """
    Calculate two-tier weighted pipeline score.

    Formula: pipeline_score = (usage_detection × 0.7) + (architectural_detection × 0.3)

    Rationale:
    - Usage detection (70%): Primary goal - does scanner help workorder planning?
    - Architectural detection (30%): Secondary goal - does scanner find complex infrastructure?

    Returns: Float in range [0.0, 1.0]
    """
    pipeline_score = (usage_detection * 0.7) + (architectural_detection * 0.3)

    log(f"")
    log(f"Two-Tier Pipeline Score Calculation:")
    log(f"  Architectural detection (30%%): {architectural_detection:.6f}")
    log(f"  Usage detection (70%%): {usage_detection:.6f}")
    log(f"  Weighted pipeline score: {pipeline_score:.6f}")

    return pipeline_score

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Verify critical function pipeline quality'
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
        required=True,
        help='Path to workorder directory (relative to project root)'
    )
    parser.add_argument(
        '--architectural-truth',
        type=str,
        default='autoresearch/pipeline-quality/architectural-ground-truth.json',
        help='Path to architectural ground truth file (relative to coderef-core root)'
    )
    parser.add_argument(
        '--usage-truth',
        type=str,
        default='autoresearch/pipeline-quality/usage-ground-truth.json',
        help='Path to usage ground truth file (relative to coderef-core root)'
    )
    parser.add_argument(
        '--mock',
        action='store_true',
        help='Use mock ground truth for testing (no real ground truth needed)'
    )

    args = parser.parse_args()

    project_path = Path(args.project_path)
    workorder_dir = project_path / args.workorder_dir

    # Ground truth files are relative to packages/coderef-core
    script_dir = Path(__file__).parent
    coderef_core = script_dir.parent.parent.parent
    architectural_truth_path = coderef_core / args.architectural_truth
    usage_truth_path = coderef_core / args.usage_truth

    log("=" * 60)
    log("Loop 7: Critical Function Pipeline Quality (Two-Tier)")
    log("=" * 60)
    log(f"Project path: {project_path}")
    log(f"Workorder dir: {workorder_dir}")
    if not args.mock:
        log(f"Architectural ground truth: {architectural_truth_path}")
        log(f"Usage ground truth: {usage_truth_path}")
    log("")

    # Validate paths
    if not project_path.exists():
        log(f"ERROR: Project path does not exist: {project_path}")
        sys.exit(1)

    if not workorder_dir.exists():
        log(f"WARNING: Workorder directory does not exist: {workorder_dir}")
        log(f"Creating empty directory for testing")
        workorder_dir.mkdir(parents=True, exist_ok=True)

    # Load both ground truths (mock or real)
    architectural_truth = load_ground_truth(architectural_truth_path, use_mock=args.mock)
    usage_truth = load_ground_truth(usage_truth_path, use_mock=args.mock)

    # Scan and get detected critical functions
    detected_functions = scan_and_get_detected_critical_functions(project_path)

    # Calculate detection accuracy for both tiers
    log("")
    log("TIER 1: ARCHITECTURAL DETECTION")
    log("-" * 60)
    architectural_detection = calculate_detection_accuracy(architectural_truth, detected_functions)

    log("")
    log("TIER 2: USAGE DETECTION")
    log("-" * 60)
    usage_detection = calculate_detection_accuracy(usage_truth, detected_functions)

    # Calculate two-tier weighted pipeline score
    pipeline_score = calculate_pipeline_score(architectural_detection, usage_detection)

    # Print score to stdout (ONLY output to stdout)
    print(f"{pipeline_score:.6f}")

    log("=" * 60)

    # Exit success
    sys.exit(0)

if __name__ == '__main__':
    main()
