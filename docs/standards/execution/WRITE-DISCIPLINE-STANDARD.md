---
kind: execution
title: Write-Discipline Standard — rehearse, reconcile, commit, independently verify
status: living
updated: 2026-07-31
---

# Write-Discipline Standard — rehearse → reconcile → commit → independently verify

> **Sub-type:** `write-discipline` of the `execution` kind. Authority root: [`README.md`](README.md).
> Governs HOW a write is performed. What may be written is governed by
> [`CONTRACTS-STANDARD.md`](CONTRACTS-STANDARD.md); where, by
> [`TOPOLOGY-STANDARD.md`](TOPOLOGY-STANDARD.md).

## The four-step loop

**1. Rehearse** — produce the write as a *preview*, not an effect.
**2. Reconcile** — compare the preview against its contract and its declared location.
**3. Commit** — perform the write by explicit path.
**4. Independently verify** — a *separate read* proves it landed.

Step 4 is the one that is routinely skipped and the one the loop exists for. The
rule is stated sharply because a softer version does not survive contact with a
deadline: **the step that performs a write may never be the step that confirms it.**
Trust-on-write means believing a claim made by the thing being tested.

## 1. Rehearse — dry-run before apply

| Surface | Rehearsal | Truth source |
|---|---|---|
| Pipeline | `--dry-run` prints the plan and executes nothing; legs report status `dry-run` | [ref](../../../src/cli/coderef-pipeline.ts:72), [ref](../../../src/cli/coderef-pipeline.ts:241) |
| Symbol rename | `rename --apply` is **CLI-only by design**; MCP exposes `rename_preview` — a dry-run plan with **no apply path at all** | [ref](../../../src/cli/coderef-mcp-server.ts:31) |

The rename split is the sub-type's clearest expression: the destructive verb was
not merely *defaulted* off on the agent surface, it was **not exposed**. A
capability an agent cannot invoke cannot be invoked by mistake — a stronger
guarantee than a flag that defaults safe, because defaults are arguments and
absent capabilities are not.

## 2. Reconcile — check the preview against contract and topology

Before committing, confirm the rehearsed output conforms to its declared shape
([`CONTRACTS-STANDARD.md`](CONTRACTS-STANDARD.md)) and is destined for its canonical
location ([`TOPOLOGY-STANDARD.md`](TOPOLOGY-STANDARD.md)).

**Write scope is bounded, not merely intended.** No read tool writes source. Index
writes — `reindex`, `rag_index`, `map` — are confined to `.coderef/`
([ref](../../../src/cli/coderef-mcp-server.ts:31)). A write outside the declared
scope is a violation to stop on, never an outcome to reconcile after the fact.

## 3. Commit — by explicit pathspec, never a blanket add

Commits are made through the guarded runner (`SKILLS/GIT/git-commit/run.mjs` in the
ASSISTANT repo), which is the enforcement point rather than a convenience wrapper.

- **Stage by explicit `--paths`.** A blanket `git add -A` is **refused**, because in
  a shared single checkout it sweeps a concurrent peer's in-progress work into
  someone else's commit. The failure is silent, cross-agent, and discovered later —
  the worst combination.
- **Refusal gates.** The runner refuses gitignored paths, and its pre-staged-sweep
  guard refuses outright if the index already holds anything outside the declared
  `--paths` set. It halts rather than committing an approximation of the intent.
- **One commit never spans two repos.** Core commits and ASSISTANT commits stay
  distinct, so each repo's history stays independently readable and revertible.

## 4. Independently verify — a separate read proves the write

`--done` pushes and then **verifies the commit actually reached origin**, and the
runner reports those as **distinct outcomes**: exit `0` is committed-and-verified,
while exit `4` is *committed OK but push/verify failed*.

That a separate exit code exists for "the write succeeded but the verification did
not" is this sub-type encoded as an interface. A tool that collapsed the two would
report success for a commit sitting only on a local branch.

### Ruling: verify the artifact, not the exit line

Two shipped failure modes make this concrete, and both are reasons the rule is
phrased as *read the artifact*:

- **A concurrent peer push** can cause a non-fast-forward rejection in which the
  runner reports HALT **even though the commit ultimately landed**. The resolution
  is to read the actual state — `git rev-parse HEAD origin/main` — never to trust
  the reported line in either direction.
- **A test runner's startup crash can read as a test failure.** Confirm actual
  pass / fail / skip counts rather than inferring from a summary line.

In both cases the exit line is a *claim about* the outcome and the artifact is the
outcome. Read the artifact.

## Why this loop, specifically

Each step catches a failure the others structurally cannot:

| Step | Catches |
|---|---|
| Rehearse | "I did not intend that change" — before it exists |
| Reconcile | "That shape or location is wrong" — before it is durable |
| Commit by path | "That was not mine to commit" — a peer's concurrent work |
| Independently verify | "It did not actually land" — the failure that otherwise surfaces days later, attributed to the wrong cause |

Skipping step 4 is the cheapest step to skip and the most expensive to have
skipped, because its failures are discovered by someone else, later, with the
context gone.

---

*Conforms to the `execution` kind, sub-type `write-discipline`. Authority root: [`README.md`](README.md).*
