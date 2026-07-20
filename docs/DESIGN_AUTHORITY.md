STATUS: authoritative — the design invariants of 50pick. Cited by code
(`globals.css`, `theme-provider.tsx`). Last verified against the build 2026-07-20.

# 50pick — Design Authority

This document records the **invariants** the design system must never violate.
It is cited by number in code comments (e.g. `/* DESIGN_AUTHORITY B3 */`). When a
rule lives beside the value it governs, a stale doc elsewhere can no longer mandate
a regression (that was audit finding C9).

**Hierarchy of truth:**
1. **`src/app/globals.css`** — the authoritative *implementation* (tokens, the live palette). Newest artifact; if anything disagrees with it, it wins.
2. **`docs/design-master-brief.md`** — palette *rationale* / ground-truth sRGB. The live tokens match it to ~0.3%.
3. **This file** — the *invariants* (what must stay true).

⚠️ **`50PICK/design_handoff_prediction_market_kit/kit/`** is a **SUPERSEDED snapshot**
(teal 215, dead `[data-theme="light"]`). **The folder no longer exists on disk** — it was
deleted in the 2026-07-15 finalization (archive: `F:/50pick-design-archive/` + git history).
Historical only. **Do NOT build from it** — following it reverts the brand to teal and
resurrects the killed light theme. If a note tells you to "consult the kit first", that note
is stale; consult `globals.css` instead.

---

## B1 — Palette is royal 268

The brand hue is **royal indigo, OKLCH hue 268** — matching `design-master-brief.md`
(`#060A50` → hue 268). It is **not** teal 215. Core tokens, verified against the brief:

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| YES | `#00A24F` | `oklch(62% 0.17 152)` | winning / affirmative money surface |
| NO | `#E6424C` | `oklch(62% 0.20 22)` | losing / negative money surface |
| Gilt | `#D49824` | `oklch(72% 0.14 78)` | needle, hub, accents |
| Canvas royal | `#060A50` | hue 268 (L deepened to ~15% by design) | app background |
| Aqua | `#36BABA` | `oklch(72% 0.110 195)` | finishing accent only (see B4) |
| Claret | `#A4273F` | `oklch(48% 0.160 15)` | editorial weight only (see B4) |

`src/app/globals.css` is authoritative for the exact values. Brand-identity hexes in
`src/components/brand.tsx` (`#1EA362`/`#B03A3E`/`#E3BC66`) are a deliberate byte-identical
port of the delivered logo `mark-a.svg` and are allowed to diverge from theme tokens —
brand identity ≠ theme tokens.

## B2 — YES / NO semantics are untouchable

Green means YES/win; rose means NO/loss. This mapping is load-bearing for a money
product and must never be inverted, re-hued, or reused for a non-money meaning. The
two together form the core betting control; their duality (one light-labelled, one
dark-labelled where contrast requires) must be preserved.

## B3 — Single dark-royal theme. No light mode.

The product has **one theme: dark royal.** Light mode was deliberately killed and
correctly removed. `color-scheme: dark` is forced in `globals.css`. There are:
- 0 light-theme selectors (`[data-theme="light"]`, `.light`, `prefers-color-scheme`)
- 0 `next-themes` imports, 0 theme toggles
- 0 `dark:` variants

**Do not re-introduce a light theme.** Every WCAG contrast ratio the product proves is
computed for this one surface; a resurrected light mode would be an entirely unverified
contrast surface on money screens.

## B4 — Claret editorial-only; aqua ≤ 8% coverage

- **Claret** (`#A4273F`): editorial weight only — Politics chip, Sovereign tier,
  regulator/footer crest. **Never** on YES/NO money surfaces or adjacent to NO-rose.
- **Aqua** (hue 195): finishing pass only, **≤ 8% surface coverage**. Never a chip,
  button label, or anything semantic.

These usage rules are already encoded in the `globals.css` token comments; this is
the canonical statement of them.

---

## Accessibility floor (see audit H10)

Money controls must meet WCAG AA (≥ 4.5:1 for text on button fills, ≥ 3.0:1 for
control borders). Where a token fails, **darken the fill** rather than lighten the
label, to preserve the YES/NO convention. Contrast is re-checked by
`scripts/` contrast tooling on any token change.

## B5 — One definition site per motion token; easings are bare curves

Added 2026-07-20 after motion was found **silently dead across the whole platform**.

`globals.css` defined `--ease-micro: 100ms cubic-bezier(…)` — a shorthand with the duration
baked in. `micro-patterns.css` loads *after* it and redefined the same name as a bare curve.
Last declaration wins, so every rule written as `transition: border-color var(--ease-micro)`
expanded to a transition with **no duration → 0s**. Input focus rings, selects, textareas,
tabs, button shadows, progress bars and the probability-chart crosshair all snapped instantly.
Nothing errored. The same shadowing set `--dur-stage` 820ms → 240ms (countdown ring and chart
draw-in ran 3.4× too fast), killed all four chat easings (the AI panel had **zero** motion),
and let a button drop-glow overwrite the ambient badge `--glow-gold`.

The rules:
1. **A motion/elevation token is defined in exactly ONE file.** `globals.css` owns
   `--ease-*`, `--dur-*`, `--glow-*`, `--shadow-*`. Other stylesheets *consume*, never redeclare.
   A stylesheet needing its own scale must **namespace** it (the chat layer uses `--cm-*`).
2. **Easing tokens are bare curves.** No duration baked in. Ever.
3. **Every `transition`/`animation` states a duration before the easing:**
   `transition: opacity var(--dur-micro) var(--ease-micro);`

Enforced by **`scripts/token-collision.test.mts`** (`npm run test:tokens`, in `test:all` and
`predeploy`). It fails on a cross-file duplicate, a duration-bearing easing token, or a
duration-less transition. It caught a real regression during its own introduction — the chat
`prefers-reduced-motion` block was still overriding the pre-rename token names.

---

## Related

- Palette rationale & history: `docs/design-master-brief.md`
- Superseded snapshot (do not use): `50PICK/design_handoff_prediction_market_kit/`
- Brand identity assets: `public/brand/` (generated from `src/components/brand.tsx`)
