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
| 1 · Canonicalize & FREEZE primitives | ✅ done | `c46e221` `fcab6ed` `a1b73c8` |
| 2 · Cold-start / low-liquidity states | ✅ done | `477dd63` + `57f19b4` (detail page) |
| 3 · Board stays full | ✅ done | `47365b4` `9b785b6` |
| 4 · Desktop right rail | ✅ done | `f93ca5a` |
| 5 · Depth + contrast gate fixed | ✅ done | `90b6799` |
| 6 · Popup consistency | ✅ done | `0a500ef` |
| 7 · Polish sweep + hero overlay | ✅ done | `6dc66d9` |
| Final `test:all` + screenshots | ✅ done | 102/104 — see below |

## 🟢 LIVE on `main` @ `300a17b` (merge commit), 2026-07-29

Ali merged and pushed; Railway deployed in ~2 minutes. **Verified live at
`https://www.50pick.tz`, not assumed** — because a green build plus a 200 response does
not prove your commit is serving.

**The fingerprint method.** Before the merge, the live CSS was fetched and confirmed to
*not* contain `tipbar-empty` / `chip-new` / `mcardp-info` — classes that exist only in
this branch. After the deploy they are present. That A/B is what makes "live" a fact.

**Token values, A/B'd against the captured pre-deploy stylesheet** (the build serves
hex + `lab()`, never the `oklch()` we author — asserting on `oklch` checks a format the
browser never receives):

| token | pre-deploy | live now | |
|---|---|---|---|
| `--text-faint` | `#697eb6` | `#6f84bd` | **the AA fix** — exactly `oklch(62% .09 268)` |
| `--bg` | `#03003a` | `#02002f` | deeper canvas |
| `--border` | `#1c2f7a` | `#213480` | crisper edge |

**Live behaviour**, EN/SW/ZH × 360/768/1280/1920: `/`, `/markets`, `/live`, `/results`
all 200 · no fabricated 50% · no `@ 50%` buttons · no bare `TZS 0` · card buttons measure
**40px** · zero horizontal overflow · zero console/page errors. **ALL PASS.**

The new states are correctly *dormant* on the live board: featuring is suppressed above 4
cards (the board has 15), and no zero-activity market exists right now, so no NEW badge or
cold-start rail renders. They are honest states, not decoration — they appear only when
they are true.

Verification script: `scratchpad/verify-live.mjs` (kept out of the repo deliberately;
`BASE=https://www.50pick.tz node verify-live.mjs` from the repo root, which has playwright).

### Final gate run

`npm run test:all` → **102/104 green**. The two reds are `test:responsive` and
`test:motion`, and both are **environmental, not regressions**:

- Both drive a browser against `http://localhost:3000` — the long-running dev server in
  the main worktree, which is in a stale Turbopack state (a 1210-second compile, serving
  the pages-router `/_error` fallback, its cache still holding chunks for
  `micro-patterns.css`, a file deleted on 2026-07-28). Every navigation times out.
- **Proven rather than asserted:** re-run against a clean server built from this exact
  commit, `test:motion` returns **43/43 ALL PASS**.
- The fresh production build compiles and generates all 55 pages.

To reproduce a clean run: `BASE=http://localhost:3011 node scripts/motion-adoption-verify.mjs`
against a dev server started in a separate worktree (Next 16 refuses a second dev server in
the same directory, which is why the stale one cannot simply be restarted alongside).

### `test:responsive` — 5016 passed · 24 failed, and the 24 are pre-existing

Run as `SURFACE=player LOCALES=en,sw,zh` against a clean server built from this branch
(the full-surface run crashes in the admin `overlaySweep` on the Playwright
"Execution context was destroyed" race that POLISH-BACKLOG §4 already documents as a
flake, not a defect).

All 24 hard failures are **one** issue, repeated across pages and widths:

```
button[Menyu ya akaunti]  l1275 r1315 > vw1280      (laptop width, SW only)
```

The account-menu button clips off the right edge at the 1280 band in Swahili, whose
nav labels are longer than English. **Proven pre-existing, not assumed:** checking out
`main` at the branch point (`56f1298`), rebuilding, and running the same check
reproduces the identical failure on `/help`, `/fairness` and `/legal/terms`. It is the
header-overflow band already known at 1024–1279px. Nothing in this pass touches the top
bar or the nav labels.

### Verified in a real browser, not just in tests

Driven at 360 / 768 / 1280 / 1920 × EN / SW / ZH against a seeded board:

- A zero-activity market shows **NEW**, an em-dash, a neutral dashed rail, "Be the first
  to predict", "No pool yet" — and **no** TIPPING, **no** `@ 50%`, **no** fake 50%
  headline, **no** `TZS 0`. Asserted against the rendered DOM *and* computed styles, so a
  class that resolved to nothing could not pass.
- Category chips read `Crypto` / `Kripto` / `加密货币`.
- Zero horizontal overflow at every width in every locale (including 320px); zero
  console/page errors.
- **Measured, not inferred, in computed styles:** the YES/NO card buttons render at
  exactly **40px** (the tap floor they were 4px under); `.mcardp` composes three real
  shadow layers including the inset top-highlight; the card popover is a genuine
  `aria-modal` dialog at `rounded-modal` (16px) carrying `--shadow-modal`; and
  `--shadow-modal` / `--shadow-overlay` / `--shadow-overlay-up` / `--shadow-card-top` /
  `--glow-selected` / `--bar-empty-track` / `--tap-min` all resolve to real values at
  runtime. Class presence was never accepted as proof — a class that resolves to nothing
  is exactly the B8 defect.

### How to reproduce this verification

Next 16 refuses a second `next dev` in the same directory, and the long-running dev
server in the main worktree is in a stale Turbopack state. So verification runs in a
separate worktree:

```bash
git worktree add --detach F:/kipindi-verify <sha>
cd F:/kipindi-verify && npm install          # a junctioned node_modules is rejected by Turbopack
NODE_ENV=development npx next dev -p 3011
curl -X POST http://localhost:3011/api/dev-test/seed-markets
BASE=http://localhost:3011 SURFACE=player LOCALES=en,sw,zh node scripts/responsive-audit.mjs
BASE=http://localhost:3011 node scripts/motion-adoption-verify.mjs
```

⚠️ Do **not** `git checkout` inside that worktree while its dev server is running —
Turbopack's module graph corrupts and routes start returning 404 that build fine. Kill
the server, `rm -rf .next/dev`, checkout, restart. A 404 from that state is an artifact,
not a regression; the production build is the arbiter.

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

## Step 6 — popup consistency · ✅ done

**The routing was already correct**, and the audit says so rather than inventing work:

- `wallet/wallet-result-modal.tsx` — the prompt's named starting point — **already**
  routes through `OperationResultModal`. Verified, not "fixed".
- `test:design-frozen` proves the general case: **no hand-rolled `createPortal`
  outside the shared primitives.** The last offender was market-card's popover,
  closed in Step 1. Slide-overs, dropdowns and the calendar are a documented
  *different* pattern (see `modal.tsx`'s header) and are named in the guard's
  exemption list so the exemption is deliberate rather than accidental.
- `win-celebration.tsx` renders through the shared `Modal` and consumes gold
  tokens. It is left as-is: gold is *correct* there (a settled win is earned
  money), it already has the focus trap and scroll lock, and rebuilding the win
  moment on top of `OperationResultModal` would be a redesign — which the brief
  forbids.

**`stripTone` audit — the gold rule holds, and now says so.** Every success result
opts *into* gold; nothing inherits it. `TONE.success.primaryBtn` was `btn-gold`,
which is unreachable for the success variant today (`effectiveBtn` overrides it
from `stripTone`, default `brand`) — but a dead default that contradicts the law
is a trap for whoever next edits that line. It now reads `btn-primary` and states
the rule. Deposits, KYC approvals and submitted proposals are all "success" and
none of them is money the player has won.

## Found in passing — ✅ both FIXED in the follow-up pass (2026-07-29)

- **The gold "Submit proposal" button — FIXED.** `proposals/new/create-form.tsx`
  `variant="gold"` → `variant="primary"`. Law 3 permits gold on wins, payouts, settled
  profit and the final **money-commit** button; submitting a proposal commits no money
  and may be declined. Gold there spends the one colour that must mean "real money you
  have earned" on an action that has earned nothing — the exact dilution the law exists
  to prevent. The "Propose Markets & Get Paid" framing is about the eventual reward, not
  about that tap.

- **`23masaa yaliyobaki` — FIXED.** The time-left strings were bare suffixes
  concatenated as `${h}${t.market.hLeft}` at **12 call sites across 4 files**. That join
  is right for English, where "h" is a unit *symbol* ("23h left"), and wrong for Swahili,
  where the value is a whole *word*. Chinese correctly wants no space at all — which is
  precisely why the join cannot live in the template.
  `dLeft`/`hLeft`/`mLeft` are replaced by `timeLeftD`/`timeLeftH`/`timeLeftM`, which
  carry `{n}` **inside** the string, so each locale owns its own spacing *and* word order
  (`"{n}h left"` · `"masaa {n} yaliyobaki"` · `"{n}小时后"`). All 12 sites migrated to
  `fill()`, and the old keys are **deleted** — so the broken shape cannot be brought back
  by copy-paste.

### Known, and deliberately NOT changed

`timeLeftStr()` is duplicated across four route files with small behavioural differences
(one clamps to a 1-minute floor, another returns a "closed" label). The **defect** — the
locale join — is fixed at all 12 sites. Unifying the four copies is a refactor with real
behavioural risk and no user-visible gain, so it is recorded here rather than done.

## Flagged for Ali — action outside the code

- **Set `TZ=Africa/Dar_es_Salaam` on Railway.** ⚠️ Note the nuance found while fixing Step 7
  item 2: the app does **not** depend on the OS `TZ` for display. Every helper in
  `lib/utils.ts` passes `timeZone: tz()`, which reads `getPlatformTimezone()` — admin-
  configurable, defaulting to `Africa/Dar_es_Salaam`. The real bug was three surfaces
  bypassing those helpers with inline `toLocaleDateString` calls, now fixed. Setting `TZ`
  on Railway is still worth doing for logs and anything server-side that formats without
  the helper, but it is **belt-and-braces, not the fix** — which is the opposite of what
  POLISH-BACKLOG §1.2 implies.
- **The hero photo.** The interim overlay lands in this pass (the photo recedes so the type
  carries the hero); the authentic editorial Tanzania album is a commissioning decision.
- **The gold "Submit proposal" button** — see "Found in passing" above.
- **The numeric radius scale** — the open gap you chose to leave open.

---

## What a future session must not undo

1. **`test:design-frozen`'s allowlist may only SHRINK.** Adding a file to it re-opens the
   hole. If you need a new design value, put it in `globals.css`.
2. **The numeric `borderRadius` scale in `tailwind.config.ts` is frozen as legacy** — do not
   renumber it to match `--r-*` without Ali's sign-off and a full visual pass.
3. **`--text-faint` must stay ≥ 62%** unless `test:contrast` is re-run and proves the floor.
   It sits at 4.88 against 4.5 on elevated cards.
4. **`contrast-audit.mts` parses `globals.css` — do not "simplify" it back to hardcoded
   values.** That is precisely how a real AA failure hid behind a green gate.
5. **`--dur-stage` stays 820ms** (pre-existing, documented in the CHANGELOG) — it drives a
   1-second-tick progress arc, not a transition.
6. **One `fresh` rule.** The board, the card and the detail page each derive cold-start from
   `volume === 0 && predictors === 0` on a live, open market. If that rule changes, change
   all three — a disagreement between card and detail about someone's money is exactly the
   defect B6 was written after.
