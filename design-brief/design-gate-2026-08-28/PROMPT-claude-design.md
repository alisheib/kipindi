# Commission — the console’s dense language (DESIGN-GATE-2026-08-28)

> OUTBOUND commission per DESIGN_AUTHORITY §0b. This folder is tracked only while the round is
> under review and is DELETED after it is sent + the delivery is filed. It LINKS to live files —
> it bundles nothing.

> 🔴 **NEVER SENT — CONFIRMED BY ALI, 2026-08-31. ⛔ DO NOT DELETE THIS FOLDER.**
> The Design Gate's closing ceremony says to delete this directory and its `.gitignore`
> exception "once the round is sent". It was asked and the answer was that the round never went
> out, so **this file is the only copy of the request** and deleting it would destroy the
> commission rather than tidy up after it. The five decisions below are therefore still OPEN and
> still unasked — they are not "unanswered", which is a different state and would license a
> session to decide them by taste. ⚠️ A future session that reaches the ceremony must re-ask
> before removing anything here.

## Who you are designing for
50pick — a licensed Tanzanian real-money prediction platform. Single dark royal theme. The
PLAYER surface has a finished, accepted design language (do not touch it; it is your reference:
`src/app/globals.css`, `docs/DESIGN_AUTHORITY.md`, the live site). The ADMIN console grew page
by page and was just measured end-to-end: the findings register is
`docs/DESIGN-GATE-ADMIN-2026-08-28.md`. The engineering fixes are already commissioned; what we
need from you is the **taste layer** the measurements cannot decide.

## The rules you inherit (non-negotiable)
- Read `docs/DESIGN_AUTHORITY.md` — especially §T (type is a closed ladder, numerals mono),
  §S (radius/space semantics), §A (contrast/tap floors), §B11 (status colours), §M (material).
- Tokens only; every value you propose must land as a `--token` change or a component recipe.
  No new hex literals, no second definition sites, no light theme.
- The console is **mouse-first and dense** — `--h-control-xs` = 32px is its documented rung;
  44px stays the floor for anything touch-reachable.

## The five decisions we want designed (with the measured status quo)
1. **The dense rail.** One filter row for 20+ list pages: today it mixes 32 / 36.8 / 40 / 44 /
   55.5px in one row. Design the ONE row: search + selects + primary + refresh at 32px density —
   proportions, gap, radius, focus, and how it degrades at 390 (sheet? wrap?).
2. **The KPI tile.** Today: 9.5px label / 20–22px mono value / 10.5px gloss / 14px padding /
   a false “▲” badge. Design the tile: label ramp, value scale (money up to “TZS 16,688,890”
   must fit at 390), the delta grammar (when ▲/▼/· and which tints), the unavailable state.
3. **The micro-label ramp.** 70+ uppercase recipes exist; we will keep exactly three roles:
   eyebrow / field label / table header. Set their size, weight, tracking, colour — and the rule
   for when small-caps mono is allowed at all.
4. **Row actions in tables.** Today five recipes (40px buttons, 23.8px text verbs, 10px `→`
   links, pills, switches). Design the one vocabulary for: navigate, mutate, destroy — at 44px
   table density.
5. **The admin overlay family.** Listbox (41px options today), the help popover, the mobile nav
   drawer — one panel recipe (radius, shadow rung `--elev-*`, item height, hover) consistent
   with the player’s menus.

## What you get
- Live console screenshots + measurements: regenerate any time with
  `node scripts/design-gate/measure.mjs` (output `.qa-design-gate/`), or ask the session to
  export a fresh set. The register (`docs/DESIGN-GATE-ADMIN-2026-08-28.md` §2) lists every
  deviation with file:line.
- The kit source: `src/components/ui/`, `src/components/admin/admin-shell.tsx`, `globals.css`.

## Delivery contract
Same as every round: files land raw under `docs/design-system/v4-<date>-admin-dense/` with an
ACCEPTANCE.md judged against the laws above; values arrive as token diffs + component redlines,
never as a parallel CSS. Fenced CSS in specs is treated as a sketch, not a source.
