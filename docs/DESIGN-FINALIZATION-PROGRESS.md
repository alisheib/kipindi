STATUS: live tracker — the design finalization pass (Steps 0–7).
Branch `design-final`, off `main` @ `56f1298`. **Nothing here is pushed.** Ali reviews and pushes.
Started 2026-07-29.

# 50pick — design finalization pass · progress

Source of the work: `Kipindi GO LIVE PACK/1-SHARE-NOW-design/DESIGN-PROMPT-share-now.md`,
under the law delivered as `DESIGN-SYSTEM-MERGE-RULES.md` (installed in Step 0).

**If you are a future session: read this file first.** It records what is done, what is
deliberately NOT done, the traps found, and the exact gate results — so you neither redo
finished work nor assume unfinished work is finished.

---

## Where we are

| Step | State | Commit |
|---|---|---|
| Baseline gates | ✅ green before any edit | — |
| 0 · Merge-discipline law installed | ✅ done | `d691cc6` |
| 1 · Canonicalize & FREEZE primitives | ✅ done | `c46e221` `fcab6ed` +1 |
| 2 · Cold-start / low-liquidity states | ⬜ not started | — |
| 3 · Board stays full | ⬜ not started | — |
| 4 · Desktop right rail | ⬜ not started | — |
| 5 · Depth (tokens only) | ⬜ not started | — |
| 6 · Popup consistency | ⬜ not started | — |
| 7 · Polish sweep + hero overlay | ⬜ not started | — |
| Final `test:all` + screenshots | ⬜ not started | — |

---

## Baseline (before any edit, `design-final` @ branch point)

Proved green so later red is provably *ours*, not inherited:

```
npx tsc --noEmit      exit 0
npm run build         exit 0
npm run test:tokens   ALL PASS — 6 css files, 43 guarded tokens
npm run test:bridge   PASS — 415 tsx files, 58 colour families
npm run test:measure  ALL PASS — 415 tsx files
npm run test:contrast 0 gate failures (faint ramp 4.87 / 4.74 / 4.81, floor 4.5)
npm run test:i18n     ALL PASS — en=1575 sw=1575 zh=1575 keys
```

---

## Decisions Ali made, 2026-07-29 (these bound the work)

1. **Radius — semantic keys only.** `tailwind.config.ts` `borderRadius` xs–2xl stays
   byte-identical (zero visual change); add `card`/`control`/`chip`/`modal` bridged to
   `var(--r-*)`. The numeric drift is recorded as an open gap, **not** silently fixed.
2. **Sweep — player surfaces first + ratchet.** Player surfaces, all popups, `market-card`
   and `brand.tsx` this pass; the rest (mostly admin) sit behind `test:design-frozen` with
   an allowlist that **may only shrink**.
3. **Right rail — move, never duplicate.** No new "recent activity" feed; publishing other
   players' betting behaviour is Ali's product call, deferred.
4. **Hero — do the interim overlay now,** token-only. The editorial Tanzania album is Ali's call.

### ⚠️ The open gap Ali chose to leave open (do not "fix" this casually)

`globals.css` `--r-*` = 4/8/12/16/24px. `tailwind.config.ts` `borderRadius` = 2/4/8/12/16/24px.
So **`rounded-md` renders 8px while `--r-md` is 12px** — same name, two values, platform-wide.
Fully bridging them shifts every `rounded-*` corner in the product up one step. That is a real
visual change and it was consciously deferred, not missed. The semantic keys added in Step 1
are the canonical path for new design; the numeric scale is legacy.

---

## Step 0 — Install the merge-discipline law · ✅ done

Gates: `tsc` 0 · `test:tokens` PASS · `test:measure` PASS · `test:i18n` PASS
(docs-only step — `build`/`bridge`/`contrast` cannot be affected by it and were green at baseline).

- `docs/design-system/v2-2026-07-27/06-patterns-and-rules/MERGE-DISCIPLINE.md` — the delivered
  law, installed. Its "put this in the repo" preamble was replaced with a repo-convention
  `STATUS:` header (the instruction had been carried out; leaving it would read as pending).
- `docs/DESIGN_AUTHORITY.md` — **B9** (one design system; new design merges in) and **B10**
  (the system is complete and frozen) added after B8, in the existing invariant voice, each
  pointing at the full law.
- `06-patterns-and-rules/RULES.md` — **law 15** and **law 16** added after law 14, in the
  existing rule → reason → broken-looks-like voice.

---

## Step 1 — Canonicalize & FREEZE the primitives · ✅ done

Three commits: `c46e221` (elevation vocabulary + popups), `fcab6ed` (TippingBar), and the
freeze guard + kit docs.

**What was actually wrong** (each of these was a *second home for a design truth*):

1. **Seven floating surfaces, seven drop-shadows.** Modal · avatar-menu ·
   notifications-panel · needle-drawer · date-select · nav-more · market-card popover.
   Several used neutral `rgba(0,0,0,…)`, which on an indigo canvas reads grey — the
   reason they never matched. → `--shadow-modal` / `--shadow-overlay` /
   `--shadow-overlay-up`, all hue-268.
2. **`--shadow-card` / `--shadow-royal` were never bridged** into Tailwind, so
   `shadow-card` was a dead class (a live B8 trap) and callers wrote
   `shadow-[var(--shadow-card)]` to get it at all.
3. **The TippingBar ignored its own tokens.** `--bar-track`, `--bar-track-border`,
   `--bar-needle` existed in `globals.css` *for this component* and `brand.tsx` used none
   of them — it re-typed the identical values inline. **Editing those tokens changed
   nothing on screen.** This is the most dangerous drift shape: the system looks
   canonical while the component quietly owns the values.
4. **`.is-interactive` / `.spark-draw` / `.btn-spin` had zero consumers** anywhere — not
   TSX, not CSS, not a spec. POLISH-BACKLOG §1.3 suspected duplicates of the deleted
   `micro-patterns.css`; the truth was worse. `.is-interactive` was also a *third* motion
   vocabulary beside `--m-*`/`--t-*`. Deleted, with their reduced-motion overrides and the
   orphaned `--spin-duration`.

**New guard — `npm run test:design-frozen`** (added to `predeploy`). Ratchet of 45 files /
244 lines, and it may only shrink. It also fails on a *stale* exemption, so cleaning a file
forces the list to tighten rather than silently carrying a dead pass. Verified to fail on a
reintroduced violation and pass on the fix.

**`test:bridge` was fixed, not worked around.** It resolved `shadow-*` against the *colour*
map; Tailwind resolves it against `boxShadow`. So `shadow-overlay` passed only by colliding
with a key in the `bg` family, while correctly-bridged rungs were reported dead. It now
checks the right map, and its family parser no longer mistakes nested keys for top-level
families (that phantom inflated the count to 58; the real number is 20). Verified: the
tightened parser surfaces **zero** new dead classes — it closes a false-pass rather than
papering over one.

### ⚠️ One visible behaviour change for Ali to eyeball

The market-card **"how it works"** popup now presents as the product's standard centred
dialog instead of a card-anchored bubble. Copy unchanged. It was the last hand-rolled popup
in a player surface and, being hand-rolled, had **no focus trap, no focus return and no
Android scroll/zoom lock**. Routing it through `Modal` is what gives it those.

---

## Findings that make parts of the prompt stale (verified in-repo, not assumed)

The design prompt was written against an earlier `main`. Four of its instructions describe work
that is **already done**. Recorded so nobody re-does them or reports them as new:

| Prompt instruction | Actual state |
|---|---|
| Step 1.3 — delete `src/app/micro-patterns.css` + its `layout.tsx` import | **Already deleted** in `d331cb2b` (2026-07-28). Zero references remain. Only the `state-tokens.css` `.is-interactive`/`.spark-draw`/`.btn-spin` audit is outstanding. |
| Step 4 — "make Pick your side a sticky right rail" | **Already sticky** — `markets/[id]/page.tsx:489` carries `lg:sticky lg:top-6`. The real gap is the empty column *beneath* it. |
| Step 6 — "starting with `wallet/wallet-result-modal.tsx`" | **Already routes through `OperationResultModal`.** The bespoke result popups are elsewhere. |
| Step 2 patch 2 — add `market.newBadge` ×3 locales | `common.newBadge` already exists in all three with identical text. Reusing it (law 15, "search before you add") — so 3 new keys, not 4. |

---

## Deliberately NOT done (scope discipline)

- **POLISH-BACKLOG §1 items 10–13** are outside the prompt's Step 7 list. Not touched.
- **"Recent activity" on market detail** — deferred to Ali (see decision 3).
- **Full numeric radius bridge** — deferred to Ali (see the open gap above).

## Flagged for Ali — action outside the code

- **Set `TZ=Africa/Dar_es_Salaam` on Railway.** Step 7 item 2 (selection-close time is 3h wrong)
  is only fully correct once that is set.
- **The hero photo.** The interim overlay lands in this pass; the authentic editorial Tanzania
  album is a commissioning decision.
