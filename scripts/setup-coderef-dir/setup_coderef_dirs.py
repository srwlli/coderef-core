#!/usr/bin/env python3
/**
 * @coderef-semantic: 1.0.0
 * @exports create_structure
 */


/**
 * @coderef-semantic: 1.0.0
 * @exports: [create_structure]
 */

"""
---
resource_sheet: coderef/reference/Setup-Coderef-Dir-RESOURCE-SHEET.md
related_test: scripts/setup-coderef-dir/test_setup_coderef_dirs.py
---

setup-coderef-dirs.py - Directory Structure Initializer

Purpose:
    Creates the canonical CodeRef directory structure.
    Separates structural setup from data generation and analysis.

Directories Created:
    1. .coderef/ (Hidden, Technical)
       - config/
       - diagrams/
       - discovery/
       - exports/
       - reports/
       - reports/complexity/
       - sessions/
       - index.json
       - graph.json
       - .coderefignore

    2. coderef/ (Visible, Workflow)
       - archived/
       - foundation-docs/
       - knowledge/
       - resources-sheets/
       - schemas/
       - standards/
       - working/
       - workorder/

Usage:
    python setup-coderef-dirs.py [project_path] [--dry-run]
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

DIRECTORY_STRUCTURE = {
    '.coderef': [
        'config',
        'diagrams',
        'discovery',
        'exports',
        'reports',
        'reports/complexity',
        'sessions',
    ],
    'coderef': [
        'archived',
        'foundation-docs',
        'knowledge',
        'resources-sheets',
        'schemas',
        'standards',
        'working',
        'workorder',
    ],
}

PLACEHOLDER_FILES = {
    '.coderef/index.json': {
        'version': '2.0.0',
        'generated': '',
        'project': '',
        'elements': [],
    },
    '.coderef/graph.json': {
        'version': '2.0.0',
        'generated': '',
        'nodes': [],
        'edges': [],
    },
    '.coderefignore': (
        '# CodeRef project-specific ignore patterns\n'
        '# Default exclusions already cover common vendor/build directories such as:\n'
        '# node_modules/, .git/, .venv/, venv/, env/, __pycache__/, build/, dist/, .next/, .nuxt/, coverage/\n'
        '#\n'
        '# Add one repo-specific path or glob per line, for example:\n'
        '# generated/\n'
        '# vendor/\n'
        '# third_party/\n'
        '# docs/_build/\n'
        '# *.generated.ts\n'
    ),
}


def _create_dir(target: Path, display_path: str, dry_run: bool, status: dict) -> None:
    if dry_run:
        print(f"[DRY-RUN] Would create directory: {target}")
        return

    try:
        if target.exists():
            status['skipped'].append(str(target))
            status['skipped_dirs'].append(str(target))
            print(f"[SKIP-DIR] {display_path}/")
        else:
            target.mkdir(parents=True, exist_ok=True)
            status['created'].append(str(target))
            status['created_dirs'].append(str(target))
            print(f"[CREATE-DIR] {display_path}/")
    except Exception as error:
        status['errors'].append(str(error))
        status['success'] = False
        print(f"[ERROR] Could not create directory {target}: {error}")


def _serialize_placeholder(payload: Any) -> str:
    if isinstance(payload, dict):
        return json.dumps(payload, indent=2) + '\n'
    return str(payload)


def _create_placeholder_file(target: Path, payload: Any, display_path: str, dry_run: bool, status: dict) -> None:
    if dry_run:
        print(f"[DRY-RUN] Would create file: {target}")
        return

    try:
        if target.exists():
            status['skipped'].append(str(target))
            status['skipped_files'].append(str(target))
            print(f"[SKIP-FILE] {display_path}")
            return

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(_serialize_placeholder(payload), encoding='utf-8')
        status['created'].append(str(target))
        status['created_files'].append(str(target))
        print(f"[CREATE-FILE] {display_path}")
    except Exception as error:
        status['errors'].append(str(error))
        status['success'] = False
        print(f"[ERROR] Could not create file {target}: {error}")


def create_structure(project_path: str, dry_run: bool = False) -> dict:
    """
    Creates the canonical CodeRef directory structure.
    Returns a status dict of created and skipped files/directories.
    """
    project = Path(project_path).resolve()

    if not project.exists() and not dry_run:
        print(f"[ERROR] Project path does not exist: {project}")
        return {
            'success': False,
            'created': [],
            'created_dirs': [],
            'created_files': [],
            'skipped': [],
            'skipped_dirs': [],
            'skipped_files': [],
            'errors': ['Path not found'],
        }

    status = {
        'success': True,
        'created': [],
        'created_dirs': [],
        'created_files': [],
        'skipped': [],
        'skipped_dirs': [],
        'skipped_files': [],
        'errors': [],
    }

    print(f"\nSetting up Coderef structure in: {project}")
    if dry_run:
        print("[DRY-RUN] No directories or files will be created.\n")

    for parent, subdirs in DIRECTORY_STRUCTURE.items():
        parent_dir = project / parent
        _create_dir(parent_dir, parent, dry_run, status)

        for subdir in subdirs:
            target = parent_dir / subdir
            _create_dir(target, f"{parent}/{subdir}", dry_run, status)

    for relative_path, payload in PLACEHOLDER_FILES.items():
        target = project / relative_path
        _create_placeholder_file(target, payload, relative_path, dry_run, status)

    return status


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Initialize canonical CodeRef directory structure')
    parser.add_argument('project_path', nargs='?', default='.', help='Project root directory')
    parser.add_argument('--dry-run', action='store_true', help='Simulate without creating directories')

    args = parser.parse_args()

    result = create_structure(args.project_path, args.dry_run)

    if not result['success']:
        sys.exit(1)
