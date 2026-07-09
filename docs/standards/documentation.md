---
kind: documentation
title: Universal Document Standard (UDS) — Envelope + Doc-Types
status: living
updated: 2026-07-09
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/documentation/template/documentation.md.
     This is the PROJECT's standard for the "documentation" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

# Universal Document Standard (UDS) — Envelope + Doc-Types

> **Kind:** `documentation` · **Registry:** `SKILLS/STANDARDS/kinds/`
> This is the ecosystem TEMPLATE an agent authors a project's documentation
> standard FROM (via `standards-establish`). The authored output lives at the
> project's `docs/standards/documentation.md`. The enforceable twin is
> `check.mjs`. This template is itself a conformant doc — copy its shape.

The documentation kind governs how each doc is **SHAPED** (not whether it must
exist — that is the `structure` kind). It has two layers: the **ENVELOPE** (the
universal rules below every native-typed `.md` obeys) and the **LOCKED DOC-TYPE
TAXONOMY** (14 doc-type FAMILIES: 11 native with variants, 3 recognized
by-reference against their canonical authority — per `DOC-TAXONOMY-LOCK.md`,
ratified 2026-07-09). It is deliberately minimal: enough structure for docs to
be machine-readable and never silently rewritten, without dictating content. A
project MAY extend it (more frontmatter keys, more variants); it MUST NOT drop
the envelope CORE.

## CORE (required of every project doc)

### 1. Frontmatter block

Every doc opens with a YAML frontmatter block. **Required keys:**

```yaml
---
title: <human title, echoes the H1>
status: living | historical | draft | superseded
updated: YYYY-MM-DD
---
```

- `title` — the document's title; the H1 echoes it.
- `status` — the **living-vs-historical marker** (see §4). Governed values only.
- `updated` — ISO date of last meaningful edit.

A project MAY add keys (`owner`, `version`, `tags`, `applies_to`). It MUST carry
these three. **Envelope modulation:** a few variants carry their OWN frontmatter
contract instead (`context` docs: `last_validated`/`project_status`;
`resource-sheet`: the generator's contract; `OUTPUT.md`: exempt) — the taxonomy
table below marks these.

### 2. Exactly one H1

One `# Title` per document, matching the frontmatter `title`. Everything else is
H2+.

### 3. Heading hierarchy

Headings descend without skipping a level (no `# ` directly to `### `). The
document is a tree, not a flat list of decorations.

## §4. The living-vs-historical marker (the load-bearing rule)

Every doc is one of:

- **`living`** — current, maintained, safe to edit and update in place.
- **`historical`** — a dated record of something that happened (a report, an
  incident snapshot, a session log, a completed design, a completed migration).
  **Historical docs are NEVER silently rewritten.** They are corrected only with
  an explicit erratum, never edited to change the record.
- **`draft`** — in progress, not yet authoritative.
- **`superseded`** — replaced by a newer doc; should link its replacement.

This marker is what lets agents and tooling tell "a rule I should keep current"
from "a record I must not touch." It is the single most important field.

## MODULES (apply when the condition holds)

### `.md` + `.html` pairing

If a project renders docs to HTML (a `docs/` site, a published catalog), the
source `.md` and the rendered `.html` travel together: a rendered `foo.html`
implies a source `foo.md`. Generated HTML is never the source of truth; it is
rebuilt from the `.md`. Include this module if the project has a render pipeline;
omit it for source-only doc sets.

### Naming convention

Pick one convention and keep it:
- **UPPER-KEBAB** (`ARCHITECTURE.md`, `API.md`) for top-level standards and named
  records.
- **kebab-case** (`getting-started.md`) for nested/ordinary docs.
- Dated records carry the date in the name or frontmatter (`report-2026-06-16.md`).

## THE LOCKED DOC-TYPE TAXONOMY (v3 — STUB-39WS8K fold)

A **doc-type is a FAMILY**: one type with a `variants[]` array; each variant =
`{match (file/glob), required_sections, meta}`. The checker resolves
doc → type → **MOST-SPECIFIC variant** (glob beats bare filename; exact
root-relative file beats both). The checker validates a variant's schema only
when the file is **present** — EXISTENCE is the `structure` kind's job.

### Native families (11)

| family | match | required sections (beyond the envelope) |
|---|---|---|
| `vision` | `VISION.md` | goals, non-goals |
| `readme` | `README.md` (project) · `scripts/README.md` (scripts) · nested `**/README.md` (package) | project: quickstart · scripts: script index · package: usage |
| `roadmap` | `ROADMAP.md` | phases (each with a gating predicate) |
| `context` | `CONTEXT.md` (canonical) · `CLAUDE.md`/`GEMINI.md`/`AGENTS.md`/`AGY.md` (pointer) | canonical: the 5 CONTEXT-MD sections + `last_validated`/`project_status` frontmatter · pointer: a reference to the canonical CONTEXT.md only |
| `quickstart` | `*-quickstart.md` | prerequisites, steps, key commands, common issues, example output |
| `resource-sheet` | `*-RESOURCE-SHEET.md` | summary, audience, architecture, dependencies, validation (+ its own frontmatter contract) |
| `architecture` | `ARCHITECTURE.md` | topology, module boundaries, stack decisions, data flow |
| `api` | `API.md` | endpoint catalog, request/response, auth, error codes, examples |
| `migration` | `MIGRATION-*.md`, `*-MIGRATION.md` | overview, breaking changes, migration steps, testing, rollback (completed records → `historical`) |
| `guide` | `*-GUIDE.md`, `TUTORIAL-*.md`, `HOW-TO-*.md` | purpose, prerequisites, steps, verification, troubleshooting (+ recommended meta: audience, difficulty, estimated_time) |
| `standards-doc` | `docs/standards/<kind>.md` (one variant PER KIND, **enumerated from the kinds registry at check time** — never hand-listed) · generic `*-standards.md` | kind-emitted: standards-identifying frontmatter (`kind:` + governed `status:`) · generic: overview, standards, validation, enforcement, exceptions (module level) |

### By-reference recognitions (3)

| family | match | canonical authority (stays put) |
|---|---|---|
| `foundation-set` | `INDEX/EXPORTS/HOTSPOTS/RELATIONSHIPS/SCHEMA.md` in `foundation-docs/` dirs | `generate-foundation-docs` (CODEREF-CORE) — recognized + minimally shape-validated; sections never re-authored |
| `components` | `COMPONENTS.md` | `ui-design` kind — only the prose `COMPONENTS.md` is graded here (component tree, props, usage, styling) |
| `output-md` | `SKILLS/**/OUTPUT.md` | `SKILLS/STANDARDS/OUTPUT-MD-STANDARD.md` — the fixed section shape enforced; exempt from the UDS frontmatter envelope |

### One file, one kind (exclusions)

Surfaces governed by another authority are **excluded** from doc-type matching
and grading entirely: skills' `SKILL.md` (governed by `/coderef-skill`),
ui-design bundle files (per-component SPECs, inventory), JSON artifacts
(TRACKING schemas). Declared in `kind.json.exclusions.globs`.

A present `.md` with no matching family is graded by the envelope alone.

## Conformance (what `check.mjs` verifies)

ENVELOPE (every native-typed `.md`): a frontmatter block with
`title`/`status`/`updated`, `status` governed, exactly one H1, headings don't
skip levels; historical docs flagged; rendered HTML has its source `.md`;
consistent naming. DOC-TYPE (each PRESENT typed doc): its resolved variant's
`required_sections` (heading or strong phrase), custom frontmatter contracts,
shape patterns, recommended meta. **Absence is never a failure here** — a
missing required doc is a `structure` FAIL, not a `documentation` FAIL.

---

*Authored from `SKILLS/STANDARDS/kinds/documentation/template.md` v3.0.0.*
