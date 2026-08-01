# Ecosystem Issues

> **Single flat log of ecosystem issues. HAND-EDITED — no runner, no registry, no DB.**
>
> **FREEZE IN EFFECT (2026-08-01, operator directive):** `/kaizen-log` and `/ticket` are
> FROZEN. Do NOT log kaizen entries. Do NOT file tickets. Append here instead.
> The kaizen/ticket system is being refactored; this file is the interim capture surface.
>
> Existing kaizen sidecars and ticket rows are left in place — the freeze stops NEW
> writes, it does not migrate or delete history.

## How to use this file

1. **APPEND** a new entry to the bottom of `## Issues` using the template below.
2. **ASSIGN** the next sequential id: `ECO-001`, `ECO-002`, …
3. **DO NOT** hand-edit or renumber existing entries. Correct an entry by appending a
   new one that supersedes it and setting the old entry's status to `superseded`.
4. **KEEP IT ONE ENTRY PER ISSUE.** A bundle of five findings is five entries.

**Fields**

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `ECO-NNN`, sequential, never reused |
| `date` | yes | `YYYY-MM-DD` |
| `domain` | yes | Owning agent domain (`ASSISTANT`, `STANDARDS`, …) |
| `surface` | yes | Skill / script / file the issue lives in |
| `category` | yes | `correctness` \| `ergonomics` \| `observability` \| `performance` \| `scope-creep` \| `docs` |
| `severity` | yes | `critical` \| `warning` \| `info` |
| `status` | yes | `open` \| `fixed` \| `wontfix` \| `superseded` |
| `summary` | yes | One line: what is wrong |
| `evidence` | yes | How it was OBSERVED — path:line, command output, measured count. Not a guess. |
| `impact` | yes | What breaks, for whom, when |
| `fix` | no | Proposed or landed remedy; include the commit SHA when fixed |

**Evidence is not optional.** An entry without an observation is a hunch. Cite the
`path:line`, the command and its output, or the measured count.

---

## Template

```markdown
### ECO-NNN — <one-line title>

- **date:** YYYY-MM-DD
- **domain:** DOMAIN
- **surface:** path/to/thing
- **category:** correctness | ergonomics | observability | performance | scope-creep | docs
- **severity:** critical | warning | info
- **status:** open | fixed | wontfix | superseded
- **summary:** What is wrong, in one sentence.
- **evidence:** How it was observed — path:line, command + output, or measured count.
- **impact:** What breaks, for whom, and when it surfaces.
- **fix:** Proposed or landed remedy. Include commit SHA if fixed.
```

---

## Issues
