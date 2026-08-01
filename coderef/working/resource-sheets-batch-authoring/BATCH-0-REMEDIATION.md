# Batch 0 — remediation, not re-authoring

The five sheets landed with correct structure and genuinely good analysis, but **four of
five fail the acceptance gate** and every one fails the line-anchor gate. Fix the existing
files in place; do not rewrite them. The prose is worth keeping.

Two of the failures are on me — my original spec was wrong about anchors and it withheld
the checker. Both corrections are below.

---

## Correction 1 — you may and MUST run the checker

My original prompt said not to run repo tooling. That was wrong: it withheld the tool that
defines acceptance. Run this on each sheet until it exits clean:

```bash
node "C:/Users/willh/Desktop/CODEREF/ASSISTANT/SKILLS/DOCUMENTATION/generate-resource-sheet/check-sheet-drift.mjs" \
  --sheet="C:/Users/willh/Desktop/CODEREF/CODEREF-CORE/coderef/resource-sheets/<name>-RESOURCE-SHEET.md" \
  --project-root="C:/Users/willh/Desktop/CODEREF/CODEREF-CORE"
```

It is read-only. It reports two checks — `drift.api-complete` and `drift.line-anchors` —
and it is the oracle. Everything else in this document is just an explanation of what it
will tell you.

Still off-limits: editing source, editing `INDEX.md`, writing to `.coderef/`, running
`populate` or any indexer.

## Correction 2 — what a line anchor must point at

I said "real line number" and you reasonably read that as "a line that exists in the file."
The checker means something stricter: **an anchor must land exactly on the declaration line
of an element in `.coderef/index.json`.** Citing line 202 because that is where the
interesting statement sits fails, even though the function starts at 200 and 202 is a real
line.

So there are exactly two legal forms:

- `[ref](path:LINE)` where `LINE` is one of the element lines listed below — nothing else
- `[ref](path)` bare, with no anchor, for everything else

A bare ref is **not** a defect. The house doctrine is that model-authored line numbers are
untrusted and prose refs land bare while the authoritative anchors live in the Public API
section. Prefer a bare ref over a near-miss every time.

Anchors pointing into a *different* file (e.g. `src/pipeline/types.ts`) are not checked and
may stay as they are.

---

## Per-sheet fixes

Element lines below are from the live index, which is fresh (newer than every source file).

### `mcp_response_format` — worst gap

`src/cli/mcp-response-format.ts` exports **13** symbols. Your Public API section lists 4.

```
DEFAULT_LIMIT:42   MAX_LIMIT:43   clampLimit:50   clampOffset:56   Page:61
paginate:87        ResponseFormat:101   ConciseIdentity:104   resolveResponseFormat:117
isConcise:122      conciseItem:132      projectConcise:159     shapeResponse:183
```

Missing: `clampLimit`, `clampOffset`, `Page`, `paginate`, `resolveResponseFormat`,
`isConcise`, `conciseItem`, `projectConcise`, `shapeResponse`. The file is 189 lines — every
export is visible in one read.

Bad anchors: 188, 163, 92. Legal lines are exactly the 13 above.

### `graph_builder` — omissions plus phantoms

Exports (13): `EdgeRelationship:104  EdgeResolutionStatus:121  EdgeEvidence:148
GraphEdgeV2:222  constructGraph:271  buildNodes:328  EndpointRecord:530  collectEndpoints:564
fileGrainNodeId:625  buildEdges:668  isTestOriginFile:1286  computeEdgeId:1357
isHeaderDerived:1388`

Missing from your sheet: `constructGraph`, `buildNodes`, `collectEndpoints`,
`fileGrainNodeId`, `buildEdges`, `isTestOriginFile`, `computeEdgeId`, `isHeaderDerived` —
including `constructGraph`, the module's primary entry point.

**Phantoms to remove:** `CallResolution` and `ElementData`. These are imported types, not
exports of this file. Listing them makes the sheet claim a contract the module does not have.

Legal anchor lines: `104, 121, 148, 222, 271, 328, 530, 564, 625, 668, 991, 1286, 1290, 1357, 1388`.
Your 305, 367, 424, 451, 491, 683, 723, 858, 885, 967 are all mid-body — drop to bare refs.

### `verify_tools`

Exports (2): `VerifyTools:52`, `buildVerifyTools:58`. You listed one of two.
Legal anchor lines: `52, 58, 256, 261, 267, 418`.

### `route_parsers`

Your Public API section lists **no symbol names at all**, so there is nothing for the checker
to match against 9 real exports:

```
parseFlaskRoute:26  parseFastAPIRoute:63  parseExpressRoute:95  parseNextJsRoute:200
parseNextJsPagesRoute:235  parseSvelteKitRoute:292  parseNuxtRoute:354  parseRemixRoute:416
extractRouteMetadata:469
```

Legal anchor lines: `26, 63, 95, 106, 121, 200, 235, 292, 354, 416, 469`.

**One finding is wrong and must be retracted.** You wrote that Remix parameter conversion
"removes all `$` characters before checking whether one remains," yielding `/users/[id`
with no closing bracket. Re-read line 427:

```js
routePath = routePath.replace(/\.\$/g, '/[').replace(/\$/g, '[') + (routePath.includes('$') ? ']' : '');
```

The assignment to `routePath` does not happen until the entire right-hand side is evaluated,
so `routePath.includes('$')` still sees the original `users.$id` and returns true. The output
is `users/[id]` — correct. Remove the bullet.

It was honestly marked `[inference]`, which is the right instinct. But an inference about
control flow is checkable by reading, and a sheet that names working code as broken is worse
than a sheet that stays quiet.

### `grammar_registry` — passes

`drift.api-complete` PASS. Only the anchors need fixing.
Legal anchor lines: `38, 53, 67, 118, 164, 174, 181, 194, 217`. Your 39, 91, 130, 134 are
near-misses; 39 should be 38.

Your TS/TSX finding is **correct and is the best thing in this batch** — `const cacheKey =
language` at line 75 does key the parser cache by language rather than extension, so
whichever of `ts`/`tsx` loads first does fix the shared entry. Keep it exactly as written,
inference marker included.

---

## Definition of done

All five sheets exit clean from `check-sheet-drift.mjs` — `drift.api-complete` PASS and
`drift.line-anchors` PASS on every one. Report the five checker outputs verbatim rather than
a summary of them.

Batch 1 is held until this passes.
