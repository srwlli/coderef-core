---
kind: static-html-ui
title: Static HTML UI Standard — Six-Bucket Tokens · light-dark() · BEM · Data-Semantic Colors
status: living
updated: 2026-07-18
purpose: Single-file living-standard template for a framework-less static HTML/CSS/JS UI (the SURFACES-HTML token contract)
audience: The domain that owns a hand-rolled static UI asset (a SURFACES-HTML page, a graph viewer, a dashboard, a report)
---
<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/static-html-ui/template/static-html-ui.md.
     This is the PROJECT's standard for the "static-html-ui" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->


# Static HTML UI Standard — Six-Bucket Tokens · light-dark() · BEM · Data-Semantic Colors

> **Kind:** `static-html-ui` · **Registry:** `SKILLS/STANDARDS/kinds/`
> This is the template a project renders its standard FROM (via
> `standards-establish`). The rendered doc lives at the project's
> `docs/standards/static-html-ui.md`. The enforceable twin is `check.mjs`. This
> template is itself a conformant doc — copy its shape.
>
> Agent-facing lifecycle docs (at the kind): `establish-static-html-ui-standards.md`
> (stand it up), `maintain-static-html-ui-standards.md` (keep it healthy),
> `document-static-html-ui-standards.md` (author the `tokens.css` block).
>
> **Not the ui-design bundle.** `ui-design` governs framework COMPONENT LIBRARIES
> (React/Vue/Svelte) — per-component specs, a compliance inventory, a theme-swap
> matrix. This kind is for a **framework-less static asset**: HTML + CSS + vanilla
> JS. If your project declares a UI framework, use `ui-design` instead — the two are
> mutually exclusive by design.
>
> **The reference implementation is real.** The concrete token catalog below is
> `SURFACES-HTML/src/tokens/tokens.css` — the single source of truth this ecosystem's
> static UIs already consume. A project adopting this kind either uses that catalog
> directly or declares its own catalog in the same six-bucket shape.

The `static-html-ui` kind owns **HOW a hand-rolled static UI governs its visual
values**: every visual value a component uses is a CSS variable from the six-bucket
catalog, defined once in a `:root` token block, resolved for light/dark via
`light-dark()`, and consumed via `var()`. The chrome is swappable; the *data*
colors stay meaningful.

---

## The One Rule

**Every visual value a component uses is a CSS variable from the six-bucket
catalog, defined in `:root` and consumed via `var(--token)`. Components MUST NOT
hardcode colors, radii, shadows, spacing, fonts, or transitions.**

```css
/* WRONG — hardcoded values, not swappable, not theme-aware */
.card { background: #FFFFFF; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.05); }

/* RIGHT — every value derives from a catalog token */
.card {
  background: var(--card);
  border-radius: var(--style-radius);
  box-shadow: var(--style-shadow);
}
```

---

## The six token buckets (the catalog)

Pick CSS variables from these buckets **only**. Do not invent new names in a
component; if you need a value not on the catalog, propose adding it to
`src/tokens/tokens.css` as a follow-up. (Full catalog: `FEATURES/THEME-SWITCHER.md`
§2 / `src/tokens/tokens.css`.)

| Bucket | Prefix | What it holds | Representative keys |
|---|---|---|---|
| **colors** | *bare* (no prefix) | every color | `--background` `--foreground` `--card` `--cardForeground` `--popover` `--primary` `--primaryForeground` `--secondary` `--muted` `--mutedForeground` `--accent` `--destructive` `--border` `--input` `--ring` `--heading` `--surface` |
| **styles** | `--style-*` | radii, shadows, borders, weights, transitions | `--style-radius` `--style-radius-sm` `--style-shadow` `--style-shadow-lg` `--style-border-width` `--style-card-padding` `--style-transition` `--style-divider` |
| **typography** | `--typography-*` | fonts, line-heights, sizes | `--typography-font-sans` `--typography-font-mono` `--typography-line-height-body` `--typography-size-base` `--typography-size-heading` |
| **effects** | `--effects-*` | blur, opacity, filters | `--effects-blur-md` `--effects-opacity-muted` `--effects-opacity-disabled` |
| **layout** | `--layout-*` | max-widths, padding, spacing | `--layout-max-width-page` `--layout-container-padding` `--layout-section-spacing` `--layout-gutter` |
| **interactive** | `--interactive-*` | hover/active/focus/disabled behavior | `--interactive-hover-opacity` `--interactive-active-scale` `--interactive-focus-ring` `--interactive-disabled-opacity` |

### `:root` token block shape (grounded in the real `tokens.css`)

```css
:root {
  color-scheme: light dark;

  /* BUCKET 1: colors — bare names, light-dark() values */
  --background: light-dark(#F9FAFB, #0F1115);
  --foreground: light-dark(#111827, #E5E7EB);
  --card:       light-dark(#FFFFFF, #1A1D23);
  --primary:    light-dark(#3B82F6, #60A5FA);
  --muted:      light-dark(#F3F4F6, #1F2937);
  --border:     light-dark(rgba(17,24,39,.10), rgba(229,231,235,.12));
  --heading:    light-dark(#0F172A, #F3F4F6);
  /* ...the full 22-key colors bucket */

  /* BUCKET 2: styles */
  --style-radius: 0.5rem;
  --style-shadow: 0 1px 2px rgba(0,0,0,.05), 0 1px 3px rgba(0,0,0,.06);
  --style-border-width: 1px;
  --style-transition: 200ms ease;

  /* BUCKETS 3-6: typography / effects / layout / interactive (see catalog) */
}
```

---

## Light/dark: `light-dark()` + `[data-mode]`

1. **Every color value uses `light-dark(<light>, <dark>)`.** A bare hex color in a
   token definition (or worse, in a component) is a theme-blind value — it cannot
   respond to the mode switch.
2. **`:root` sets `color-scheme: light dark`** so the browser resolves which side
   of `light-dark()` applies.
3. **The mode switcher writes `[data-mode]` on `:root`** (`:root[data-mode="light"]`
   / `:root[data-mode="dark"]`) to force a mode and narrow `color-scheme` so
   `light-dark()` resolves explicitly.

A component never reads the mode — it only consumes color tokens, which already
carry both sides.

---

## Data / semantic colors (the distinction this standard adds)

**Data / semantic-encoding colors carry MEANING. They are NOT theme chrome, and
they are ALLOWED to stay fixed / named.** A naive "tokenize everything into the
swappable chrome buckets" rule is **wrong** here — forcing a metrics gradient, a
drift-ring color, or a hotspot palette into a `light-dark()` chrome token destroys
the encoding (a chart that recolors with the theme lies about its data).

This is the case a data-viz static UI (e.g. a graph viewer with overlays) hits that
the pure six-bucket chrome catalog does not cover.

- **Allowed fixed.** A data-semantic literal may be a plain, mode-independent color
  — the checker **WARNs, never FAILs** on it.
- **Name them in a `--data-*` block** for legibility (this keeps them out of the
  swappable chrome buckets while still centralizing them):

```css
:root {
  /* data / semantic encodings — fixed by design, meaningful, NOT theme chrome.
     NO light-dark() here: a data hue must read the same in both modes. */
  --data-drift-ring: #ffb300;      /* a layer-drift ring */
  --data-metric-lo:  #1e88e5;      /* a metrics-gradient low stop  */
  --data-metric-hi:  #ffca28;      /* a metrics-gradient high stop */
  /* computed palettes (hotspot / community) may live in JS — declare intent here */
}
```

- **Mark ambiguous literals.** If a fixed color is data-semantic but the checker
  can't tell from context, annotate the line `/* data-semantic */` — it is then
  exempt from the chrome-tokenization FAIL and filed under the advisory WARN.

---

## BEM scoping

Every selector in a component's `{name}.css` starts with `.{name}` and continues
with a terminator/combinator, `__` (element), or `--` (modifier):

- `.my-widget`, `.my-widget__row`, `.my-widget--active`, `.my-widget__row--selected`
- `.my-widget-extra` is **invalid** (a single `-` is a continuation, not a
  separator) — use `.my-widget--extra`.

A component's CSS may not contain selectors that start with another component's
name. To react to a sibling's state, use the **CSS-variable seam**: the sibling
publishes a scoped variable under its modifier class; you consume it with a
`var(--x, fallback)` default.

---

## Accessibility baseline

1. **Semantic HTML first** — `<button>`, `<nav>`, `<ul>`, `<dialog>`, `<article>`,
   `<header>`, `<footer>`, `<aside>`, `<main>`.
2. **Interactive controls carry a name** — an explicit `aria-label` or
   `aria-labelledby` on every interactive control; an icon-only `<button>`/`<a>`
   MUST have one (a screen reader has no other name for it).
3. **Custom interactive elements** (e.g. `<li role="button">`) MUST have
   `tabindex="0"` AND a keydown handler for Enter and Space.
4. **Drawers/popovers** use native `<dialog>` (focus trap, Esc, backdrop).
5. **Focus visibility** uses `:focus-visible`; **respect `prefers-reduced-motion`**.
6. **Color is never the only signal** — a status/overlay/data color is paired with a
   text label, legend strip, or `title`. (An overlay legend strip satisfies this.)

---

## Non-goals (so the standard stays small)

Intentionally lightweight. Does **not** cover, and do not add:

- per-component MARKDOWN specs beyond what the project's own doc-parity test wants
  (that mirror is the project's test harness, not this kind's concern),
- a component compliance-inventory / AUDIT ledger,
- a palette + theme swap MATRIX (the theme adapter owns runtime rewrites),
- a multi-palette testing grid.

Those are `ui-design`-bundle concerns for framework component libraries.

---

## Conformance

- **PASS** — a `:root` token block exists; component values derive from the
  six-bucket catalog via `var()`; color tokens use `light-dark()`; data-semantic
  literals are allowed.
- **WARN** — advisory drift: data-semantic literals surfaced (informational), a
  bare hex color token without `light-dark()`, tokens under-consumed, a BEM or a11y
  heuristic tripped, or the standard not reachable in-tree.
- **FAIL** — no `:root` token block at all, or a material count of un-tokenized
  CHROME literals in component CSS (the discipline is not stood up).
- **not_applicable** — the project has no static html+css, OR it declares a UI
  framework (that surface is `ui-design`'s).

Run the checker:
`node SKILLS/STANDARDS/kinds/static-html-ui/check.mjs --project-root=<ABS> --json`

## Usage

1. Establish this standard for a project:
   `node SKILLS/STANDARDS/standards-establish/run.mjs --project-root=<ABS> --kind=static-html-ui`
   (renders this template into the project's `docs/standards/static-html-ui.md`).
2. Adopt (or declare) the six-bucket `tokens.css` catalog and separate chrome from
   data/semantic colors (the single most important call).
3. Validate:
   `node SKILLS/STANDARDS/kinds/static-html-ui/check.mjs --project-root=<ABS> --json`
   and drive component CSS onto catalog tokens (data-semantic WARNs are advisory).
4. When the template evolves, re-sync:
   `node SKILLS/STANDARDS/standards-update/run.mjs --project-root=<ABS> --kind=static-html-ui --apply`.
