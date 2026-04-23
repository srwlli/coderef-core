# Create CodeRef Directory Structure

Run this script from your project directory to create the canonical CodeRef folder structure.

---

## Usage

**1. Navigate to your project:**
```bash
cd C:\path\to\your\project
```

**2. Run the script (use current directory):**
```bash
py C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\scripts\setup-coderef-dir\setup_coderef_dirs.py .
```

**Or specify full path:**
```bash
py C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\scripts\setup-coderef-dir\setup_coderef_dirs.py "C:\path\to\your\project"
```

**Preview first (dry run):**
```bash
py C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\scripts\setup-coderef-dir\setup_coderef_dirs.py . --dry-run
```

---

## What Gets Created

### `.coderef/` (Hidden, Technical)
- `config/` - Tool and integration configuration
- `diagrams/` - Generated Mermaid and Graphviz diagrams
- `discovery/` - Project discovery snapshots and analysis
- `exports/` - Exported graph data (JSON, JSON-LD)
- `reports/` - Analysis reports
- `reports/complexity/` - Complexity analysis outputs
- `sessions/` - Session logs
- `index.json` - Placeholder code element index if missing
- `graph.json` - Placeholder dependency graph if missing

### `.coderefignore` (Project Root)
- Starter scanner ignore file for repo-specific exclusions
- Layered on top of the pipeline's built-in default excludes
- Safe to edit for project-specific generated/vendor folders

### `coderef/` (Visible, Workflow)
- `archived/` - Completed workorders moved here
- `foundation-docs/` - Generated docs (README, API, ARCHITECTURE, SCHEMA, COMPONENTS)
- `knowledge/` - Project-specific knowledge base
- `resources-sheets/` - Resource sheet documents
- `schemas/` - JSON schemas for validation
- `standards/` - Project standards documents
- `working/` - Active stubs and working notes
- `workorder/` - Active workorders

---

## Notes

- Safe to run multiple times (idempotent)
- Existing directories and placeholder files are skipped, never overwritten
- Existing `.coderefignore` files are skipped, never overwritten
- No dependencies (Python standard library only)
- Cross-platform (Windows, macOS, Linux)
- This is the script the dashboard directory phase uses when the user selects directory setup
