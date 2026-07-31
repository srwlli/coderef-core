# scripts/

Maintenance and one-off tooling for `@coderef/core`. These are **not** the
package's shipped surface — that is `src/cli/` (see `docs/CLI.md`) and the `bin`
map in `package.json`. Nothing here is published; nothing here is imported by
`src/`.

## Subdirectories

| Path | What it is |
|---|---|
| `doc-gen/` | Foundation-doc generators + `validate-docs.js`. `coderef/foundation-docs/INDEX.md` is DERIVED — regenerate it here, never hand-edit. The generator/verify pair is declared in the `derived-index` mapping table at `docs/standards/derived-index.md:39`; `validate-docs.js --strict` is its non-mutating check mode. |
| `scan-cli/` | Scan-pipeline entry helper. |
| `setup-coderef-dir/` | Bootstraps a `.coderef/` tree in a target repo. |

## Loose scripts

| Script | Purpose |
|---|---|
| `bench-index-parse.mjs` | Parse-throughput benchmark over `.coderef/index.json`. |
| `check-header-coverage.mjs` | Reports semantic-header coverage across `src/`. |
| `deduplicate-headers.mjs` | Removes duplicate `@coderef-semantic` blocks. |
| `fix-stale-exports.mjs`, `-v2`, `-v3` | Successive generations of the stale-`@exports` repair pass. v3 is current; v1/v2 are kept for provenance on how the rule evolved. |
| `generate-intelligence.js` | Builds the intelligence artifacts consumed by the dashboard. |
| `real-semantic-dryrun.mjs`, `test-semantic-dryrun.mjs` | Rehearsal harnesses for the semantic-header writer — run before any `--apply`. |

## Conventions

- **Rehearse before you write.** Anything that mutates source files ships a
  dry-run path; use it. `--apply` is the exception, not the default.
- **No cloud LLM keys.** This project is local-Ollama-only; do not add a script
  that requires an OpenAI/Anthropic key to run.
- Scripts read the repo from their own location, not from `process.cwd()` — a
  nested-subdirectory invocation must behave identically to a root one.
