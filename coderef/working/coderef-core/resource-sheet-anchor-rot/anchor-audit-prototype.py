"""SUPERSEDED — do not use as an instrument.

check-sheet-drift.mjs (SKILLS/DOCUMENTATION/generate-resource-sheet/) is the
canonical anchor checker and existed before this script was written. This
prototype UNDERCOUNTS: it resolves symbols against top-level source
declarations, while the canonical checker resolves against INDEXED elements.
Measured delta on the same corpus: 43 stale (this) vs 68 stale (canonical).
Retained only as evidence that an ad-hoc instrument can look authoritative
and still be wrong. See discovery.md section 0.
"""

"""Mechanical anchor audit: does every `symbol` [ref](path:N) still point at
that symbol's declaration line? Generalizes the ad-hoc check run on the
mcp_shared sheet."""
import json, pathlib, re, sys, collections

ROOT = pathlib.Path(r"C:\Users\willh\Desktop\CODEREF\CODEREF-CORE")
DECL = re.compile(r'^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?'
                  r'(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)')
# `symbol` ... [ref](path:N)  — N may be a comma list
REF = re.compile(r'`([A-Za-z_$][\w$]*)`[^\n\[]{0,180}?\[ref\]\(([^):]+):(\d+(?:,\d+)*)\)')

decl_cache = {}
def decls(rel):
    if rel not in decl_cache:
        f = ROOT / rel
        d = {}
        if f.is_file():
            for i, line in enumerate(f.read_text(encoding="utf-8", errors="replace").split("\n"), 1):
                m = DECL.match(line)
                if m and m.group(1) not in d:
                    d[m.group(1)] = i
        decl_cache[rel] = d
    return decl_cache[rel]

rows, totals = [], collections.Counter()
for sheet in sorted((ROOT / "coderef" / "resource-sheets").glob("*.md")):
    text = sheet.read_text(encoding="utf-8", errors="replace")
    checked = stale = unverifiable = 0
    worst = []
    for sym, path, nums in REF.findall(text):
        d = decls(path)
        if sym not in d:
            unverifiable += 1
            continue
        checked += 1
        if d[sym] not in [int(n) for n in nums.split(",")]:
            stale += 1
            worst.append((sym, nums, d[sym]))
    totals["anchors_checked"] += checked
    totals["anchors_stale"] += stale
    totals["anchors_unverifiable"] += unverifiable
    if checked or unverifiable:
        rows.append({"sheet": sheet.name, "checked": checked, "stale": stale,
                     "unverifiable": unverifiable, "examples": worst[:3]})
        totals["sheets_with_anchors"] += 1
        if stale: totals["sheets_stale"] += 1

rows.sort(key=lambda r: -r["stale"])
print(json.dumps({"totals": dict(totals), "worst_sheets": rows[:12]}, indent=2))
json.dump({"totals": dict(totals), "sheets": rows}, open(sys.argv[1], "w", encoding="utf-8"), indent=2)
