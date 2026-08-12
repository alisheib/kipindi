# Handover 2026-08 — the living reference from the August commission round

**STATUS: RECORD + MEASURED REFERENCE, NOT RULE.** The rulebook is
[`docs/DESIGN_AUTHORITY.md`](../../DESIGN_AUTHORITY.md) — nothing here overrides it.

## What this folder is

Four documents that were authored for the August 2026 design commission round and remain
**live reference** after it. They lived only inside the outbound package
`design-brief/handover-v3-total-2026-08-11/` (never tracked); when that package was retired on
2026-08-12 they were refiled here — a package links to the rulebook, it never bundles the only
copy. The raw package itself is archived at
`F:\50pick-design-archive\2026-08-12-final\` (off-repo, with the whole commission history).

| File | What it is | Read it when |
|---|---|---|
| [`LAWS.md`](LAWS.md) | **The redesign contract**: 85 invariants (§A) + 8 "our values" checks (§B) + the 4 licence conditions — each written as a testable property, almost every one bought with an incident | before changing anything visual on a shipped surface |
| [`LANGUAGE-AND-CONTENT.md`](LANGUAGE-AND-CONTENT.md) | **The measured trilingual corpus** (computed from the real 1,706-key dictionary): SW expansion median 1.083 but **1.74× p90 on short labels / 2.25× p95 on button-sized**; ZH is 62% shorter in characters but **as wide as EN at p90** — never shrink a container for ZH; real market questions to design against | sizing any control, chip, nav item or card that carries a label |
| [`INVENTORY.md`](INVENTORY.md) | The measured system: 385 tokens · 38 families · 23 scales · 59 primitives · 178 glyphs · 46 player routes · the real breakpoint ladder (lg:1024 dominates; the 1024–1279 header band is the degraded one) | before assuming what exists or which breakpoint matters |
| [`integration-notes/INTEGRATION-REALITY.md`](integration-notes/INTEGRATION-REALITY.md) | What a design decision costs in this codebase (the −14° axis's seven consumers, the 349px skeleton literal, the tap-floor migration ≈ 148 call sites, 4-of-22 gates in predeploy at the time of writing) | scoping any inherited design change |

⚠️ Where a figure here disagrees with the live code or `globals.css`, **the live repo wins** —
these are measurements of 2026-08-11, correct on the day they were cut.

## How the design system evolved (for a developer who wasn't here)

1. **Original dark-glass kit** (June 2026) → rebuilt the whole UI; superseded teal snapshot
   deleted (do not resurrect).
2. **July 2026 delivery** → `docs/design-system/v2-2026-07-27/` (frozen archive) — components,
   redlines, provenance.
3. **Material system** (2026-08-06/07) → merged; codified as `DESIGN_AUTHORITY.md` §M.
4. **August commission round** (2026-08-11/12): a total-replacement commission was assembled and
   then **abandoned as strategy** — the system stays. Its measured artifacts live on in this
   folder. The **round-2 negotiated kit** (landing + `/markets` discovery only) came back and was
   accepted: `docs/design-system/v3-2026-08-11-landing-discovery/` (see its `ACCEPTANCE.md`).
5. **Inheritance work** (2026-08-12 →): the accepted kit is being applied through existing
   tokens. The living plan is `design-brief/PLAN-OF-RECORD.md`.
