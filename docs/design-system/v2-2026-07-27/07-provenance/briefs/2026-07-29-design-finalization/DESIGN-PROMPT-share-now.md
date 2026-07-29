# 50pick — DESIGN (share this now) · everything else later

## What to share, and when

**NOW — design.** Paste the single block below (everything between
`=== BEGIN DESIGN PROMPT ===` and `=== END DESIGN PROMPT ===`) into Claude Code in
the `kipindi-main` repo. It is self-contained. Alongside it, drop these delivered
files into the repo so Claude Code can use them instead of re-deriving:
- `50pick-design-coldstart.zip` — finished cold-start code (Step 2 uses it).
- `DESIGN-SYSTEM-MERGE-RULES.md` — the single-source-of-truth law (Step 0 installs it).
- `50pick-design-target.html` — open it yourself as the visual target (Claude Code
  works from the written spec; you use the picture to judge the result).

**LATER — a couple of days, once design is merged & stable.** Share the **second**
prompt: `LAUNCH-HARDENING-PLAN.md` (backups, error tracking, scale, go-live
switches) together with `50pick-backup-feature.zip`. Do **not** run it at the same
time as design — one concern at a time, each behind its own green test gate.

---

=== BEGIN DESIGN PROMPT ===

You are working in the **50pick** repo (`kipindi-main`), a licensed real-money
prediction-market platform going live in weeks. This is the **design finalization**
pass. Two goals, in this order of importance:

1. **Make the design system the single, complete, FINAL source of truth** — every
   edge, shadow, radius, popup, motion and colour decided once, in the system, with
   every component only *consuming* it. After this pass, design changes are a token
   or spec edit in one place — never a component tweak. We do not want to "come back
   and touch design" again.
2. **Make the product look full and alive on launch day** — fix the "it looks empty"
   feeling (fake 50%/TIPPING on new markets, sparse desktop) without redesigning.

The platform is already well-built — do not redesign it. Extend and consolidate.

## GUARDRAILS — read and obey before any edit

1. **Read first:** `docs/DESIGN_AUTHORITY.md` (invariants B1–B8), the design-system
   `RULES.md` (14 laws), and `src/app/globals.css` (authoritative tokens). Then read
   the merge-discipline law you install in Step 0.
2. **Single source of truth (the core rule of this whole task):**
   - A **value** (colour/edge/shadow/radius/motion) is defined **once** in
     `globals.css` and **bridged** in `tailwind.config.ts`. Never a hex in a
     component, never a second `.css` file, never a duplicate token.
   - A **utility class** must name a key that exists in `tailwind.config.ts` (B8) —
     no class that resolves to nothing, no inline `style` that reproduces a token.
   - A **new state/variant** is a **prop on the existing component** — never a
     near-duplicate component.
   - A **popup** (modal, confirm, result, toast, tooltip, popover) goes through the
     shared primitive (`Modal`/`ConfirmModal`/`OperationResultModal`/`Toast`/
     `Tooltip`) and consumes the edge/shadow/radius tokens — never a hand-rolled
     `createPortal` scrim or a bespoke `box-shadow`.
   - **Search before you add.** Grep the system for an existing token/class/component
     first; extend it. Only add when genuinely absent, and add it in the canonical
     home.
   - **Same change updates code AND kit.** Update the matching
     `02-components/<name>/spec.md` (+ `preview.html`) and append `07-provenance/
     CHANGELOG.md`. The kit must always describe the shipped look.
3. **Design laws unchanged:** one dark royal theme (no light mode) · gold = earned
   money only · YES=green(152)/NO=rose(22) only in betting actions, always with a
   word/arrow · **real data or nothing** (never a fabricated number; unknown →
   em-dash + labelled state) · no emojis · no manufactured urgency · the measure
   (`<PageContainer tier>`, widths only in `globals.css`).
4. **Every push is a LIVE production deploy.** Work on a branch
   (`git checkout -b design-final`). Commit per step. **Do not push to `main`** —
   stop at each checkpoint; Ali reviews the live/staged result and pushes.
5. **After every step run the gates:** `npx tsc --noEmit` · `npm run build` ·
   `npm run test:tokens` (one definition site per token) · `npm run test:bridge`
   (every class resolves) · `npm run test:measure` · `npm run test:contrast` ·
   `npm run test:i18n` · `npm run qa:live`. Then drive the changed pages at
   **360/768/1280/1920 in EN, SW, ZH** and screenshot for Ali. No red gate proceeds.
6. If a change would break a law, **stop and flag it** — do not work around it.

---

## STEP 0 — Install the merge-discipline law, then freeze intent

- Add the delivered `DESIGN-SYSTEM-MERGE-RULES.md` to the repo at
  `docs/design-system/v2-2026-07-27/06-patterns-and-rules/MERGE-DISCIPLINE.md`.
- Add a one-line pointer to it from `DESIGN_AUTHORITY.md` as invariant **B9/B10**
  and from `RULES.md` as **law 15/16**.
- This law governs every step below. From here on, "done" includes "landed in its
  canonical home + documented in the kit."

## STEP 1 — Canonicalize & FREEZE the system (edges, shadows, popups, radii, motion)

This is the step that makes design final so you never touch it again.

1. **Inventory the primitives** and confirm each is a single token in `globals.css`,
   bridged in `tailwind.config.ts`:
   - Edges/borders: `--border`, `--border-strong`, `--border-royal`, `--border-gold`.
   - Elevation/shadows: one ladder + the modal drop-shadow + the card top-highlight.
     If the modal shadow currently lives inline in `Modal`, promote it to a
     `--shadow-modal` token and consume it.
   - Radii: card/control/chip/modal radius tokens — one scale.
   - Motion/focus: one definition site per easing/duration (B5); the one focus ring.
2. **Sweep the components** for design decided *outside* the system and pull it in:
   - `grep` for inline `style={{ … border/boxShadow/borderRadius/background:oklch/# … }}`
     and raw hex in `src/components/**` and `src/app/**`; replace each with the token
     or a class. (Keep genuinely dynamic values — e.g. a computed bar width — inline;
     move every *static design value* into the system.)
   - Route any hand-rolled popup/scrim through the shared `Modal`/portal primitive.
3. **Delete the dead shadow systems** so nothing can be copied from them by accident:
   remove `src/app/micro-patterns.css` and its import in `src/app/layout.tsx`
   (176 lines, zero references — confirm with grep first); audit the duplicate
   `.is-interactive` / `.spark-draw` / `.btn-spin` noted in `state-tokens.css`.
4. **Document** the frozen primitives in `01-foundations/*` and the popup/edge/shadow
   specs in `02-components/*`; append `CHANGELOG.md` "design system frozen — v2 final."
- **Done when:** `test:tokens` + `test:bridge` green; a grep shows no static hex or
  bespoke shadow/border/radius in components; every popup uses the shared primitive.

## STEP 2 — Cold-start / low-liquidity states (the biggest "empty" fix)

Apply the delivered `50pick-design-coldstart.zip` (it's finished code): new/empty
markets show a **NEW** badge, an honest **—** (not a fake 50%), a neutral
"awaiting first bet" bar, and **"Be the first to predict · Kuwa wa kwanza"**; the
"TIPPING" badge no longer appears on empty markets; the category chip is localised
(SW/ZH). **Then canonicalize it per Step 1:** promote the two inline `style` bits in
the delivered `market-card.tsx` (the "no bets yet" caption and the em-dash prob) into
`.mcardp-*` classes in `globals.css`, keep the `TippingBar empty` prop and the
`.chip-new` token, and add the cold-start state to
`02-components/market-card/spec.md` + `tipping-bar-and-dials/spec.md`. Verify with
`test:i18n`, `test:bridge`, `test:contrast`.

## STEP 3 — Board stays full (featured + new sections)

In `src/app/markets/page.tsx`: never render a lonely 2–3 cards on a wide board. Add
a **Featured** treatment for the top market and a **"New markets"** section, so the
board reads composed top-to-bottom. Keep the `board` measure tier. If the live set is
truly empty, use the existing `EmptyState` component — never raw whitespace. Real
data or a labelled empty only.

## STEP 4 — Desktop right rail on market detail

In `src/app/markets/[id]/page.tsx`: at `lg:` and up, make "Pick your side" a sticky
right rail and fill the column beneath it with real content that already exists — the
resolution **source & criterion**, market **facts**, **recent activity**, and a
**"Related markets"** list (same category, LIVE). Mobile stacks as today (no mobile
change). Respect the existing measure tier; don't widen it. Empty sub-sections show a
calm labelled empty, never a fake feed.

## STEP 5 — Depth (tokens only)

In `globals.css` only: widen the elevation ladder slightly so cards sit above the
canvas (marginally lighter `--bg-elevated`, crisper `--border`, the shared card
top-highlight), and a whisper of the existing royal radial on hero/LIVE cards
(reuse `--bg-royal-soft`/`--hero-grad-*` — no new glow vocabulary). Re-run
`test:contrast`; keep every text ramp ≥ AA (faint stays > 4.5).

## STEP 6 — Popup consistency

Route every "this happened" surface through `OperationResultModal` (crest + eyebrow +
bilingual subtitle + CTA), starting with `src/app/wallet/wallet-result-modal.tsx` and
any other bespoke result popup. `grep` must find no `createPortal` result dialog
outside the shared primitive. `stripTone` correct (gold = earned money only).

## STEP 7 — Polish sweep (docs/POLISH-BACKLOG.md §1 — verify line numbers first)

Do these together, one screenshot pass: selection-close time timezone+i18n (and set
`TZ=Africa/Dar_es_Salaam` on Railway — flag to Ali); YES/NO card buttons 36→40px
(touch floor); inverted hierarchy in `live/featured-contest.tsx` &
`results/notable-carousel.tsx` → `text-text-faint`; OG card number grouping; hardcoded
English page titles → `generateMetadata()`+`getServerT()`; English relative timestamps
in the notification bell; missing `loading.tsx` for `wallet/receipt/[id]` &
`wallet/deposit/return`; slim the persistent "Add email" band (collapsible once seen,
keep the gate). (The untranslated category chip is already fixed in Step 2.)

## HERO (flag to Ali — decision, not code)

The confetti/celebration hero photo leans "casino win", against Rule 7. Interim,
code-only: strengthen the royal overlay on `hero-bg.webp` so the type carries the
hero and the photo recedes. Real fix = an authentic, editorial Tanzania album — Ali's
call.

## DEFINITION OF DONE (design is final after this)

- The merge-discipline law is in the repo; the system is **frozen** — no static hex,
  bespoke shadow/border/radius, or hand-rolled popup remains in any component
  (`grep`-clean); `test:tokens` + `test:bridge` green.
- New/empty markets read **inviting**; the board is **full**; desktop detail has **no
  dead space**; popups are **one consistent beat**.
- Every change is documented in `02-components/*/spec.md` + `CHANGELOG.md`, so the kit
  is the final design of record.
- `test:all` + `qa:live` green; 360/768/1280/1920 × EN/SW/ZH screenshots delivered.
- Ali reviews live and **pushes** — not you.
- From now on, a design change is a **token or spec edit in the system**, and every
  component updates with it. You do not reach into a component for a border, a shadow,
  or a popup again.

=== END DESIGN PROMPT ===
