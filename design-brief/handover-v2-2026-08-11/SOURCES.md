# SOURCES — what this package used to carry, and where it actually lives

**Stripped 2026-08-11.** This package originally bundled 26 files that were **byte-identical
copies** of files already in the repo. They were deleted, not because they were wrong — every
one hashed clean against live — but because a second copy of a true value is the defect
`DESIGN_AUTHORITY.md` §0a names: *"If you find a value in two places, that is a bug. Fix it by
DELETING one, never by keeping both in sync."*

They were correct on the day they were cut and would have gone stale the first time anyone
touched `src/`. §K4 is the standing rule: **never read a `globals.css` out of a design export.**

The complete, unstripped package survives as `../50pick-design-handover-v2.zip` — that is the
sendable artifact. If a round 3 goes out, **regenerate the bundle from live at send time**
rather than reusing a snapshot.

## Where each removed file lives

| was in the package | the one real home |
|---|---|
| `04-design-system/DESIGN_AUTHORITY.md` | `docs/DESIGN_AUTHORITY.md` |
| `04-design-system/motion.css` | `src/app/motion.css` |
| `04-design-system/state-tokens.css` | `src/app/state-tokens.css` |
| `04-design-system/tailwind.config.ts` | `tailwind.config.ts` |
| `04-design-system/tokens-LOCKED.css` | `src/app/globals.css` (it was an extract) |
| `tokens-LOCKED.css` (package root) | `src/app/globals.css` (same extract, duplicated inside the package) |
| `01-approved-design/needle.css` | `src/components/layout/needle.css` |
| `01-approved-design/market-card.tsx` | `src/components/markets/market-card.tsx` |
| `01-approved-design/side-picker.tsx` | `src/components/markets/side-picker.tsx` |
| `05-current-code/landing-page.tsx` | `src/app/page.tsx` |
| `05-current-code/markets-page.tsx` | `src/app/markets/page.tsx` |
| `05-current-code/layout.tsx` | `src/app/layout.tsx` |
| `05-current-code/top-app-bar.tsx` | `src/components/layout/top-app-bar.tsx` |
| `05-current-code/bottom-nav.tsx` | `src/components/layout/bottom-nav.tsx` |
| `05-current-code/live-ticker.tsx` | `src/components/layout/live-ticker.tsx` |
| `05-current-code/public-footer.tsx` | `src/components/layout/public-footer.tsx` |
| `05-current-code/brand.tsx` | `src/components/brand.tsx` |
| `03-brand/mark-color.svg` | `public/brand/mark-color.svg` |
| `03-brand/mark-dark.svg` | `public/brand/mark-dark.svg` |
| `03-brand/mark-white.svg` | `public/brand/mark-white.svg` |
| `03-brand/mark-simplified.svg` | `public/brand/mark-simplified.svg` |
| `03-brand/lockup-horizontal.svg` | `public/brand/lockup-horizontal.svg` |
| `03-brand/lockup-stacked.svg` | `public/brand/lockup-stacked.svg` |
| `03-brand/favicon.svg` | `public/favicon.svg` |
| `03-brand/mpesa.svg` | `public/pay/mpesa.svg` |
| `03-brand/tile-512.png` | `public/icons/tile-512.png` |
| `03-brand/mark-color-512.png` | `public/icons/mark-color-512.png` |

⛔ **Brand assets are generated, never hand-edited** — `public/brand/**` and `public/icons/**`
come from `src/lib/brand-mark.ts` via `scripts/build-brand-assets.mts` (§B1a). Editing a copy is
how the PWA icon and every outbound email once shipped a superseded logo.

## What is left in this package, and why

Only what nothing else in the repo holds — the authored commission itself:

- `README.md`, `BRIEF.md`, `FROZEN.md`, `PROMPT-for-claude-design-v2.md` — the ask
- `06-handover-contract/OUTPUT-SPEC.md` — what the designer must return
- `02-findings/LANDING-AND-FILTERING-FINDINGS.md` — the measured problems
- `01-approved-design/README.md` + `screens/` — the frozen-component reference shots
- `02-current-state/screens/` — the before-picture

⚠️ **The findings document has not been re-verified since it was written.** An audit on
2026-08-11 checked all 21 findings against live source and **7 did not hold** — see the session
report. Do not commission against it until those are corrected.

---

## ⛔ Three defects to fix BEFORE any package is rebuilt

Measured 2026-08-11 against live. These are packaging defects, not drift — the deleted snapshot
was byte-perfect on the day it was cut.

**1. `tokens-LOCKED.css` was not self-contained — 12 tokens resolved to nothing.**
`OUTPUT-SPEC.md:18` tells the designer to link exactly one stylesheet,
`<link rel="stylesheet" href="../tokens-LOCKED.css">`. But 12 of its tokens are `var()`
references to 8 names that live **only in `motion.css`**: `--m-glide`, `--m-settle`, `--m-leave`,
`--m-breathe`, `--t-quick`, `--t-base`, `--t-move`, `--t-stage`. None carries a fallback. In the
app this works because `layout.tsx` imports `globals.css` + `state-tokens.css` + `motion.css`;
in a standalone HTML preview those 12 are dead. **This is the §B8 failure mode** — the one where
1,325 utility classes compiled to nothing and a four-step ink hierarchy rendered as two.
→ Fix: link `motion.css` and `state-tokens.css` from the scaffold too, or inline them.

**2. 28 live `:root` tokens ship nowhere in the package.**
`globals.css:14` does `@import "../styles/chat/chat-tokens.css"`, which defines 28 tokens at
`:root` — document-wide, not scoped to chat. The real hazard is the bare-name collision: a
package that ships `--pearl-50…300` but not bare **`--pearl`** invites a designer to write
`var(--pearl)` as the family root. It renders nothing in their preview and
`oklch(86% 0.040 268)` in production. Same shape for `--gilt-edge`, `--gilt-deep`,
`--claret-hover` — all read as core brand names.

**3. The self-check at `OUTPUT-SPEC.md:107` cannot be passed.**
It demands `grep` for `#`, `rgb(`, `oklch(`, `hsl(` return **zero matches** — but
`needle.css:44`, one of the frozen assets the designer is told to reproduce, contains
`oklch(4% 0.04 268 / 0.85)`. A designer who reproduces the frozen component faithfully **fails
the gate**; one who quietly re-colours it passes. The check rewards the exact behaviour
`FROZEN.md` exists to prevent.
