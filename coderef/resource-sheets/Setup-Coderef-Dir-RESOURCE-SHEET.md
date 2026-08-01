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
status: approved
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

Verbatim from `DIRECTORY_STRUCTURE` at [ref](../../scripts/setup-coderef-dir/setup_coderef_dirs.py:50).

**`.coderef/` (Hidden, Technical) — 7 entries**
- `config/`
- `diagrams/` - Visual dependency diagrams
- `discovery/`
- `exports/` - Export formats (JSON-LD, DOT, Mermaid)
- `reports/` and `reports/complexity/` - Complexity analysis outputs
- `sessions/`

**`coderef/` (Visible, Workflow) — 8 entries**
- `archived/` - Completed features
- `foundation-docs/`
- `knowledge/`
- `resource-sheets/` - Resource sheets (the canonical home)
- `schemas/`
- `standards/` - Documentation and coding standards
- `working/`
- `workorder/` - Active feature implementations

> **Corrected 2026-08-01.** This list had drifted from the script. It previously named
> `coderef/documents/`, `coderef/reference/`, `coderef/user/` and `coderef/notes/` —
> **none of which the script creates** — while omitting every entry above that it does.
> A bootstrapper following the old list would have expected four directories that never
> appear and been surprised by five that do.

### Placeholder Files

The script also seeds placeholder artifacts (`PLACEHOLDER_FILES`,
[ref](../../scripts/setup-coderef-dir/setup_coderef_dirs.py:72)) carrying `version: 2.0.0`
and empty `elements` / `nodes` / `edges` collections. **An empty placeholder is not a scan
result** — it is a well-formed shell awaiting one, and must never be read as "this project
has zero elements".

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

## Source of Truth

| Question | Authoritative answer lives in |
|---|---|
| Which directories are created | `DIRECTORY_STRUCTURE` — [ref](../../scripts/setup-coderef-dir/setup_coderef_dirs.py:50) |
| Which placeholder files are seeded | `PLACEHOLDER_FILES` — [ref](../../scripts/setup-coderef-dir/setup_coderef_dirs.py:72) |
| The return contract | the status dict assembled at [ref](../../scripts/setup-coderef-dir/setup_coderef_dirs.py:160) |
| What the directories are FOR | [`docs/standards/execution/TOPOLOGY-STANDARD.md`](../../docs/standards/execution/TOPOLOGY-STANDARD.md) |

**The script is the source of record; this sheet is a derived description of it.** When the
two disagree, the script wins and this sheet is stale — which is exactly what had happened
to the directory list above.

## Public API / Contracts

**CLI:** `python setup_coderef_dirs.py [PROJECT_PATH] [--dry-run]`

**Return contract** — the status dict, whose keys are the stable surface:

| Key | Meaning |
|---|---|
| `success` | `False` when any error was recorded |
| `created` / `created_dirs` / `created_files` | absolute paths actually created |
| `skipped` / `skipped_dirs` / `skipped_files` | paths that already existed — skipping is the idempotency guarantee, not a failure |
| `errors` | error strings; non-empty implies `success: False` |

**Idempotency is the contract.** `mkdir(parents=True, exist_ok=True)` means a second run
creates nothing and reports the same structure as `skipped`. An existing directory is
never overwritten and an existing placeholder is never clobbered.

**`--dry-run` writes nothing.** It is the rehearsal step of the write loop in
[`docs/standards/execution/WRITE-DISCIPLINE-STANDARD.md`](../../docs/standards/execution/WRITE-DISCIPLINE-STANDARD.md).

## Dependencies

| Dependency | Notes |
|---|---|
| Python 3.10+ | Declared under Architecture above |
| `pathlib`, `argparse` | Standard library only — **no third-party packages**, deliberately, so bootstrap works before any install step |
| Filesystem write permission at the target path | The only environmental requirement; a permission error is captured into `errors` rather than raised |

**Nothing upstream.** This script runs before analysis exists — that is its purpose. It
consumes no `.coderef/` artifact and must never be made to.

## Risks & Edge Cases

| Risk | Behavior today |
|---|---|
| **Drift between this sheet and the script** | The realized risk: the directory list was wrong until 2026-08-01. Re-verify against `DIRECTORY_STRUCTURE` before trusting it |
| Partial creation | Errors accumulate into `errors` and creation continues, so a run can leave a partial tree with `success: False`. Re-run — it is idempotent |
| Placeholder mistaken for data | An empty `elements`/`nodes`/`edges` placeholder is a shell, **not** a scan result reporting zero |
| Pre-existing directory with different intent | Adopted silently as `skipped`; the script does not verify a directory is *the right* directory, only that the name exists |
| Running against the wrong root | No confirmation prompt. `--dry-run` first is the mitigation |
| Structure changes | Adding a directory here does not migrate existing projects; older trees keep the older shape until re-run |

## Validation Checklist

- [ ] **The script resolves.** `scripts/setup-coderef-dir/setup_coderef_dirs.py` exists.
- [ ] **The documented directory list matches `DIRECTORY_STRUCTURE`** at [ref](../../scripts/setup-coderef-dir/setup_coderef_dirs.py:50) — the check that failed before 2026-08-01.
- [ ] **`--dry-run` creates nothing.** Run it against a temp path and confirm the tree is absent.
- [ ] **Idempotency holds.** Run twice; the second run reports everything as `skipped` and `success: True`.
- [ ] **Tests pass.** `python test_setup_coderef_dirs.py` from `scripts/setup-coderef-dir/`.
- [ ] **Frontmatter is complete and governed.** `agent`, `date`, `subject`, `parent_project` present; `status` lowercase from `draft | review | approved | archived`.
- [ ] **Location is canonical** — under `coderef/resource-sheets/`.

## Related Resources

- [Scripts Resource Sheet](./SCRIPTS-RESOURCE-SHEET.md) - Complete script inventory
- `scan-all.py` - Generates minimal `.coderef/` data
- `populate-coderef.py` - Generates complete `.coderef/` outputs

---

**Last Updated:** 2026-01-04
**Maintained by:** CodeRef Core Team
