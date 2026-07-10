---
title: CODEREF-CORE Vision
status: living
updated: 2026-07-10
owner: CODEREF-CORE
---

# CODEREF-CORE Vision

## The destination

**The destination: a useful agentic code-intelligence system that helps developers, spends tokens sparingly, and surfaces code to both humans and agents in a form they can actually understand.**

CODEREF-CORE owns the graph of a codebase — its elements, calls, imports, and impact —
and exposes that graph as **intelligence**, not as another grep. The value is not the
scan; it is what the scan lets a developer or an agent *know* without reading the whole
tree: what calls this, what breaks if I change it, where the leverage is, what the code
actually does. It earns its place by answering those questions **cheaply** (a compact,
graph-shaped answer instead of a token-expensive file dump) and **legibly** (the same
answer serves a person reading a terminal and an agent consuming a tool result).

The measure of success: an agent or a developer reaches for CODEREF-CORE *first* to
understand unfamiliar code — because it returns the right answer in fewer tokens than
reading the files would cost, and in a shape both can trust.

## Why this vision exists

Code intelligence tends to fail in one of three ways, and this vision is defined against
all three:

1. **It competes with grep and loses.** A tool that just finds text is redundant. The
   destination is to *own the graph* — call/import/impact relationships that grep cannot
   see — and expose it natively so the answer is structural, not lexical.

2. **It is expensive to consult.** An intelligence layer that costs more tokens to query
   than to just read the code will not be used. The destination is **token frugality** as
   a first-class property: compact responses, targeted queries, no dumping a subtree when
   a graph edge would answer the question.

3. **It speaks a language only one audience understands.** Output tuned for a UI is opaque
   to an agent; output tuned for an agent is unreadable to a person. The destination is a
   surface that renders **current reality** — builds, routes, topology, drift — legibly
   for **both** humans and agents from the same source of truth.

## The routes toward it

Two active lanes route toward this destination. They share the pattern — own the graph,
expose it natively, keep it cheap and legible — not a subject.

### Route 1 — Native graph intelligence over `.coderef`

The MCP surface and CLI over the scanned graph: `what_calls`, `what_imports`, `impact_of`,
`find_element`, `codebase_summary`, `validation_status`, hotspots, cycles, RAG search.
Local-first (Ollama embeddings, no cloud key required), version-controlled, and compact by
design. This is the `coderef-core-next` lane (RAG-quality active). Frugality and legibility
are the acceptance bar, not afterthoughts.

### Route 2 — Current-reality dashboard (adopted lane)

**A standalone dashboard rendering current ecosystem reality — builds, routes, topology,
drift — with controlled operator actions.** A surface that shows what the ecosystem *is
right now* (not what a stale doc claims), consuming CODEREF-CORE's graph through a
read-only adapter boundary and offering a small set of controlled operator actions. This
is the lane transferred under DISPATCH-2026-07-09-CODEREF-CORE-001; the execution surface
is a separate dashboard estate, CODEREF-CORE is its planner-owner. The data-boundary phase
must absorb the coming `CODEREF_LAYERS_PATH` env-pin migration (standards-single-home
program) rather than duplicate the `loadLayerEnum` → `ASSISTANT/STANDARDS/layers.json`
coupling.

## Completion — how we know we've arrived

- An agent or developer consults CODEREF-CORE to understand unfamiliar code and gets a
  correct, structural answer in **fewer tokens** than reading the files would cost.
- The graph answers relationship questions (calls / imports / impact / leverage) that grep
  cannot, natively over MCP, on a local-first stack with no cloud key required.
- A single source of truth renders current ecosystem reality — builds, routes, topology,
  drift — legibly for both a person and an agent, with a controlled set of operator actions.
- Query responses stay compact by contract; a change that bloats a response is a regression,
  not a feature.

## Standing principle

Own the graph, expose it natively, keep every answer cheap and legible. Token frugality and
dual-audience legibility are acceptance criteria, not polish — an answer that is correct but
expensive, or correct but only one audience can read, has not arrived.
