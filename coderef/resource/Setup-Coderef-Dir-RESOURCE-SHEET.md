---
agent: Claude Sonnet 4.5
date: 2026-01-04
task: CREATE
subject: Setup-Coderef-Dir
parent_project: coderef-core
category: utility
version: 1.0.0
related_files:
  - scripts/setup-coderef-dir/setup_coderef_dirs.py
  - scripts/setup-coderef-dir/test_setup_coderef_dirs.py
status: APPROVED
---

# Setup-Coderef-Dir Resource Sheet

## Executive Summary

The setup-coderef-dir utility creates standardized directory structures for CodeRef projects. It initializes both the hidden `.coderef/` technical directory (for analysis outputs) and the visible `coderef/` workflow directory (for workorders, standards, and documentation). This tool separates structural setup from data generation, ensuring consistent project organization across the CodeRef ecosystem.

## Audience & Intent

**Audience:** CodeRef developers, project bootstrappers, automation scripts
**Intent:** Quick reference for initializing CodeRef directory structures in new or existing projects
**When to use:** Before running analysis tools, when setting up a new CodeRef-enabled project, or when directory structure needs to be recreated

## Quick Reference

### Basic Usage

```bash
# Create structure in current directory
python setup_coderef_dirs.py

# Create structure in specific project
python setup_coderef_dirs.py /path/to/project

# Dry-run (preview without creating)
python setup_coderef_dirs.py /path/to/project --dry-run
```

### Directories Created

**`.coderef/` (Hidden, Technical)**
- `reports/complexity/` - Complexity analysis outputs
- `diagrams/` - Visual dependency diagrams
- `exports/` - Export formats (JSON-LD, DOT, Mermaid)

**`coderef/` (Visible, Workflow)**
- `workorder/` - Active feature implementations
- `archived/` - Completed features
- `standards/` - Documentation and coding standards
- `documents/` - Generated documentation
- `reference/` - Resource sheets and references
- `user/` - User-specific notes
- `notes/` - Project notes

### Return Value

```python
{
    'success': True,
    'created': ['/path/to/.coderef', '/path/to/coderef/workorder', ...],
    'skipped': [],  # Existing directories
    'errors': []    # Error messages if any
}
```

## Architecture

**Language:** Python 3.10+
**Dependencies:** Standard library only (pathlib, argparse)
**Design:** Idempotent - safe to run multiple times

**Separation of Concerns:**
- This script: Directory structure only
- `scan-all.py`: Generates `.coderef/index.json` and `context.md`
- `populate-coderef.py`: Generates complete `.coderef/` outputs (reports, diagrams, exports)

## Testing

**Test File:** `test_setup_coderef_dirs.py`

**Test Coverage:**
- ✅ All directories created successfully
- ✅ Dry-run mode doesn't create directories
- ✅ Idempotency (running twice doesn't fail)
- ✅ Temporary directory isolation

**Run Tests:**
```bash
cd packages/coderef-core/scripts/setup-coderef-dir
python test_setup_coderef_dirs.py
```

## Integration Points

**Called by:**
- Bootstrap scripts when setting up new CodeRef projects
- CI/CD pipelines for project initialization
- Developer setup workflows

**Calls:**
- Standard library filesystem operations only

## Related Resources

- [Scripts Resource Sheet](./SCRIPTS-RESOURCE-SHEET.md) - Complete script inventory
- `scan-all.py` - Generates minimal `.coderef/` data
- `populate-coderef.py` - Generates complete `.coderef/` outputs

---

**Last Updated:** 2026-01-04
**Maintained by:** CodeRef Core Team
