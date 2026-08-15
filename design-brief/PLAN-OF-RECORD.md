# PLAN OF RECORD — inherit the round-2 design kit, apply it, clean up

**Living document — updated after every batch.** Started 2026-08-12 (session: FINAL inherit-apply-cleanup).
Operator authorization: Ali, 2026-08-12 evening — full autonomy, commits + pushes approved
("apply all changes in the new design kit literally · don't touch market cards and progress bars ·
just the things we agreed on · organize the design files first").

**STATUS: implementation session RUNNING (started 2026-08-13).** The organization session
(2026-08-12, `78b7f000`→`fd66292b`) filed the kit, wired the gates and wrote §1–§7. This session
builds it. Ali's instruction 2026-08-13: *"walk through the design inheritance step by step,
detail by detail, side by side, every filter every bar every detail, every logic implemented,
every flow — take as much time as needed"* + *"when done don't ask, just push cleanly, all docs
updated"*. Full autonomy on commits and pushes; push per batch, verified live.

**§8 below is THE EXECUTION PLAN** — written before any code was touched, per Ali's plan-first
instruction. It pins the two open definitions on measured evidence and resolves every internal
contradiction found in the kit.

| Phase | State |
|---|---|
| 0 · Locate kit, acceptance record | ✅ done — kit filed at `docs/design-system/v3-2026-08-11-landing-discovery/` + `ACCEPTANCE.md` (commit `78b7f000`) |
| 1a · Organize design files | ✅ done — commit `78b7f000`, pushed. Everything removed archived at `F:\50pick-design-archive\2026-08-12-final\` |
| 1b · Wire 22 design gates into predeploy | ✅ done — all 22 wired; 2 ghost steps removed; **baseline: all 22 gates GREEN** on `78b7f000` (each run individually, exit 0, 2026-08-12) — no pre-existing red to carry |
| 1c · Old-doc cleanup (stale glyph archive, old-version sweep) | ✅ done — see CLEANUP-MANIFEST |
| 1d · Re-verify the baseline on `5bfd95fa` | ✅ **2026-08-13: 22/22 GREEN re-run individually with real exit codes; `npx tsc --noEmit` exit 0, zero output.** Nothing red inherited |
| 2 · Write the execution plan (§8) | ✅ 2026-08-13 — §8, definitions pinned |
| 2a · /markets data contract | ✅ batch 1 |
| 2b · /markets UI (filter bar replaces rail) | ✅ batch 1 |
| 2c · Hero replacement (photo out, same commit) | ✅ batch 2 |
| 2d · Landing composition + header + rail | ✅ **batch 3 — this session** |
| 3 · Post-implementation cleanup remainder | ⬜ batch 4 |

---

## 1 · The strategy (final — supersedes the total-replacement plan)

The existing system stays: tokens, primitives, laws, the ~200 incident-bought decisions.
From the returned round-2 kit we inherit **three surfaces only** — the hero/banner, the
`/markets` discovery layer (filter + sort + data contract), the landing composition (incl.
header) — expressed **entirely through existing tokens**. The kit's own token file is a proven
byte-identical copy of ours (0/323 value mismatches — verified 2026-08-12); the only new tokens
are the four rhythm-scale derivations the kit documents (`--rh-tight/close/section/chapter`,
all `calc()` of `--sp-*`), which will be defined once in `globals.css` in the existing grammar.

**Frozen and untouched:** `market-card.tsx`, `side-picker.tsx`, the conviction bar/needle,
`needle.css`, the palette, the type scale, the footer, all licence/RG/legal copy. (Kit contract
+ Ali's instruction, 2026-08-12.)

Kit acceptance record (file-by-file INHERIT/IGNORE + reconciliations): see `ACCEPTANCE.md`
beside the filed kit.

## 2 · Design-file organization (Phase 1a)

Ali emptied `design-brief/` on 2026-08-12 18:58–18:59 (Explorer delete) and dropped in the
returned kit zip. Everything deleted was recovered from the Recycle Bin to
`F:\50pick-design-archive\2026-08-12-final\recovered-from-recycle-bin\` (verified: v3 = 267
files, matching its documented count). Filing, per DESIGN_AUTHORITY §0b:

| Thing | Goes to | Why |
|---|---|---|
| The returned kit (raw, complete, incl. its LOCKED token copy + brand copies + the rejected 07 hero) | `docs/design-system/v3-2026-08-11-landing-discovery/` + `ACCEPTANCE.md` | §0b: incoming commission, raw and untouched, with an acceptance record |
| `LAWS.md` · `INVENTORY.md` · `LANGUAGE-AND-CONTENT.md` · `integration-notes/` (the four live references that were only inside the deleted v3 package) | `docs/design-brief/handover-2026-08/` | §0c: `docs/design-brief/` is the commission record. A package links to the rulebook; it never bundles the only copy |
| `design-brief/` (repo root) | ends holding ONLY: `PLAN-OF-RECORD.md` (this file), `CLEANUP-MANIFEST.md`, `00-NEXT-SESSION-PROMPT.md` — all tracked | the brief's end state |
| Kit zip, stale root `NEXT-SESSION-PROMPT.md` (Aug 10), `scripts/build-design-handover.mts` | archive, then delete from tree | superseded / one-shot generator for the dead strategy (untracked, non-npm, undeclared `sharp` dep — `test:orphans` would flag it) |
| `design-brief/handover-v2-2026-08-11/` tracked files (Ali-deleted, ` D` in git) | commit the deletion | round sent + kit returned; §0b banner says delete on send; archived copy kept |
| Citers to fix in the same commit | `docs/DESIGN_AUTHORITY.md:85` (stale "under review" banner) · `docs/README.md:55` (stale v2 row) | cite-check 2026-08-12: these are the only two doc citers |

## 3 · The 22 design gates (Phase 1b)

`predeploy` currently runs 4 of 22 static design gates — and is **broken**: it names
`test:sentinel-timer` and `test:sentinel-pause`, which do not exist, so the chain dies at step
44 and `build`/`qa:live` never run. Fix: remove the two ghost entries (coverage lives in
`test:sentinel-guards`, already in the chain), then wire in the 18 missing gates.

Roster (all static, no server needed — verified):

In predeploy already: `test:tokens` · `test:design-frozen` · `test:outcome` · `test:history`
To add (18): `test:bridge` · `test:design-one-door` · `test:measure` · `test:contrast` ·
`test:ui-consistency` · `test:motion-ladder` · `test:glyph-motion` · `test:reduce-motion` ·
`test:keyframes` · `test:m1-light` · `test:gold-is-money` · `test:crest-legibility` ·
`test:chip-contract` · `test:shell-boundary` · `test:admin-clip` · `test:search-adoption` ·
`test:integrity` · `test:overdue-format`

Note: the "22" count is not written anywhere in the repo — this roster is the derivation that
matches the handover's premise exactly (4 in predeploy, 22 total). Recording it here makes this
file the missing citation.

⛔ The five ratchet allowlists are **NOT regenerated at zero** (that order belonged to the dead
strategy): `design-frozen` FROZEN_ALLOWLIST (41) · `motion-ladder` ALLOWLIST (0) · `measure`
RAW_WIDTH_ALLOWLIST (58) · `m1-light` PENDING (0) · `reduce-motion` KEPT (4). Entries move only
when a change in this plan legitimately moves a measured value.

**Gate baseline (2026-08-12, tree `78b7f000`): all 22 gates GREEN** — run individually,
`test:tokens … test:overdue-format -> EXIT=0` for every one. The two ghost predeploy steps
(`test:sentinel-timer`, `test:sentinel-pause` — scripts that never existed) are removed, so the
chain no longer dies at step 44 before `build`; all 72 remaining steps resolve to real scripts
(verified by parsing `package.json`).

## 4 · The /markets data contract (Phase 2a) — concrete values, from the kit

State model (kit README §"State management", adopted verbatim):

```
status:   'open' | 'today' | 'new' | 'watch' | 'all'    default 'open'  ← default view excludes CLOSED
sort:     'closing' | 'pool' | 'people' | 'close' | 'move' | 'new'      default 'closing'
sortDir:  'asc' | 'desc' | null (null = the sort's natural direction)
odds:     'any' | 'call' (40–60%) | 'cont' (25–75%) | 'long' (<15%)     numeric boundaries fixed
pool:     'any' | '10k' (≥ TZS 10,000) | '50k' (≥ TZS 50,000)
topics:   string[] (multi-select; [] = all)
query:    string
density:  'grid' | 'list'   persisted (localStorage 50pick.discovery.v1)
watch:    string[]          persisted (same key)
shown:    paging cursor — page size 12 (2–3 col grid) / 6 (1 col); resets on any change
```

URL contract: `/markets?status=…&sort=…&odds=…&pool=…&topic=a,b&q=…` — defaults omitted
(clean board = clean URL); server-renderable; controls write `replaceState`, only `q` uses
`pushState` (debounced 300ms). Sort options + hints: Closing soonest (default) · Biggest pool ·
Most predictors · Closest call · Biggest move (absent `move24h` sorts LAST, not zero) · Newest
first. Result count in the sticky bar **is** the pager total — same value, same source.
Empty states per cause: filter-miss (computed relaxations with real counts) ≠ search-miss
(catalogue gap: search-all-including-closed + suggest). `New` follows `market-card.tsx`'s
`isNew` definition. Definitions to pin during 2a implementation: does "live" include
`selectionClosed`; what `All` includes — record the answers here when pinned.

_Open items to pin in 2a (recorded when implemented): the exact status→MarketStatus mapping,
topic taxonomy source of truth, whether search is server-side._

## 5 · Decisions log (reconciliations — decided calls beat the kit)

1. **Hero = kit's `01` recommendation** (question board + brand-mark backdrop + live
   `<MarketCard/>` in the hero foot). Headline **"The wisdom of YES & NO."** verbatim.
   `public/hero/hero-bg.webp` + its `page.tsx:80` reference removed in the SAME commit the new
   hero lands. The `07` alternative hero: not chosen, filed as provenance only.
2. **Cold start:** hero becomes the FOURTH consumer of the existing cold-start rule — concrete
   behaviour to be pinned here before batch 2c (awaiting codebase map).
3. **Measured widths beat the kit's +25% stress assumption:** short labels sized to SW
   1.74× p90 / 2.25× p95 (source: `docs/design-brief/handover-2026-08/LANGUAGE-AND-CONTENT.md`).
   Mobile verification at **360px**, not the kit's 390.
4. **Gold discipline Q5 narrows the kit's palette rule:** gold stays on pool figures + settled
   payouts (real money); NO gold on sort (kit's final agrees), watch star, result count,
   question-board YES-% — unless stripping it guts the hero, in which case it goes to Ali as a
   named question, not decided silently.
5. **First-visit modal copy:** how-it-works band and the modal read the SAME i18n keys.
6. **RG line above footer + public source attributions:** built as designed in batch 3, shipped
   live. Flagged for sign-off in the batch-3 report; the flag never became a closed conversation,
   so batch 4's own next-session prompt re-raised it as two open questions. **Ali, 2026-08-13:
   delegated the call — "you take the right visual decision... proceed."** Resolved on that
   delegation, with the reasoning written down because this is a regulatory-adjacent call an
   agent is making without actual legal or compliance authority, and that limit stays true
   whatever is decided:
   - **RG line: KEPT.** The conservative direction on RG messaging is MORE visibility, not less —
     the LCCP-class concern with placement is normally about a message being buried, not about
     it appearing too prominently. Every string is verbatim from `public-footer.tsx` (no new
     copy), so the change is placement only. Erring toward more duty-of-care surface on a
     licensed real-money platform is the safer of the two directions to guess wrong in.
   - **Source attributions: KEPT, text-only.** `NBC.CO.TZ` / `EIA.GOV` / `METEO.GO.TZ` /
     `COINGECKO.COM` are cited as plain text (no logos, no marks), which is standard, low-risk
     practice for factual data-source attribution — the same pattern most products use citing a
     price or weather source. Two of the four are government sources, where public citation is
     ordinary. Never rendered as a clickable partner endorsement, never with a mark.
   - ⚠️ **NEITHER of these is a substitute for an actual compliance/legal review before the real
     licensing audit.** This is the most defensible default available without that review, not a
     certification that either is cleared. If formal review ever says otherwise, the reversal is
     one deletion each (`<RgLine />` in `page.tsx`; `.kp-settled__src` in `trust-band.tsx`) —
     unchanged from the batch-3 prompt's own note.
7. **Frozen-card tap targets + type-nano/label raise:** NOT touched (kit's own contract +
   Ali's instruction). Recorded as open items for a later Phase-3-token decision.
   ⚠️ **Partially superseded, batch 4 (2026-08-13) — and §11's numbers were STALE.** Re-measured:
   `.mcardp-info` is **46px** and `.mcardp-actions .btn` **40px** (`--tap-min`), so ACCEPTANCE §11's
   "38px YES/NO, 34px info" describes a tree that no longer exists — two of the three were already
   raised piecemeal, leaving `.mcardp-details` at **17px** as the lone outlier. It now reaches
   **40px** through an absolutely-positioned `::after`, which changes **no pixel of appearance** and
   is therefore not the "redesign" §11 forbids: card heights, row offsets and document height are
   byte-identical before/after, so `MARKET_CARD_H` — the actual substance of the deferral — is
   untouched. **Still NOT touched:** the `--h-control-*` token raise and the `--type-nano`/
   `--type-label` raise. Those remain Ali's Phase-3 decision. §8.7g has the proof.
8. ~~**The filtering scope is CLOSED at three surfaces.**~~ 🔴 **SUPERSEDED 2026-08-14 — the premise
   was WRONG.** On 2026-08-13 this was recorded as "not commissioned" because batch 4 put the
   question to Ali as *"extending the discovery bar to four more surfaces has no design source"*.
   **It has one.** `/markets`' pill language IS the source and was already law
   ([[50pick-one-filter-language]]: *every filter control matches `/markets`' pill design*), so
   applying it is not a new commission — it is an existing rule not being enforced. Ali, reading the
   live platform 2026-08-14: *"markets has different filter design than up and down... this is not
   acceptable in a consistent professional platform. Revise all filtering systems."* **That is
   batch 5.**
   ⚠️ **What survives of the old entry, and is still true:** the four surfaces it named are not
   where the divergence lives. `/leaderboard` and `/fairness` are **pagination-only** (`?page=`,
   already on the shared `Pagination`) and `/live` + `/watchlist` have **no `searchParams` at all** —
   so there is no filtering on them to unify, and ADDING it would be a new feature, not a
   consistency fix. The real divergence is on `/updown`, `/results`, `/proposals`, `/positions` and
   `/updown/history` — surfaces batch 4 never surveyed, because the question asked was the wrong one.
   ⭐ **The lesson:** a question framed on a false premise gets a correct answer to the wrong
   question, and the answer then hardens into a recorded decision. Before asking Ali to close a
   scope, check whether a law already governs it.

## 6 · Batch log (updated after each push)

| Batch | Commit(s) | Gates | Verified | Notes |
|---|---|---|---|---|
| 1a organize | `78b7f000` | docs · one-door · integrity · orphans · tsc — all green | pushed, prod 200 | kit filed + acceptance; references refiled; v2 deletion committed |
| 1b gates | `c7cb34ec` | all 22 design gates green individually; 72 predeploy steps resolve | pushed, prod 200 | 2 ghost steps removed |
| 1c glyph cleanup | `fd66292b` | docs · one-door · integrity green | pushed | 03-glyphs archived (41 files / 22,866 B verified) + 4 citers annotated |
| 2a contract · step 1 (pure module + gate) | `(this session)` | `test:discovery-contract` 78 assertions green; `red:discovery-contract` **7/7 real defects caught**, tree restored byte-identical; tsc 0 | local | `src/lib/markets/discovery.ts` — parsing, defaults, ONE href builder, status predicates, odds/pool buckets, sorts + explicit tie-breakers, cross-filtered counts, relaxations. Pure: no server imports, lifecycle facts stay in `market-service.ts` |
| 2a+2b · `/markets` rebuilt on the contract | `(this session)` | 32 gates green incl. the 22 + `board-discovery` + `product-line` + `discovery-contract` + `i18n`/`trilingual`; tsc 0; `npm run build` ✓ 43s; both RED harnesses 6/6 and 7/7 | 12 shots at 360+1280 × en/sw/zh, **overflowX=0 on all 12**; HTTP driver green | 13-pill rail DELETED · sticky 2-row bar · 5 status segments · 6 sorts + direction · odds/pool chips · topic menu · cross-filtered counts · per-cause empty states with real-count exits · `PageContainer tier="board"` (2 raw-width ratchet entries removed) · `ProposePromo` gone · categories derive from `MARKET_CATEGORIES` · both skeletons on ONE height definition |
| 1v · batch-1 VALIDATION pass (2026-08-13, later) | `(this session)` | 22 gates green individually incl. both RED harnesses (7/7 and 6/6); tsc 0; `npm run build` ✓ | 48 shots at 360/768/1280/1920 × en/sw/zh **read**, overflowX 0 / minTap 44px / 0 clipped on all 48; new menu guard proven RED against production and GREEN against the fix | 🔴 **The sort and topic menus were 1% usable on a phone** — fixed. Plus 3 instrument defects that had been reporting green for the wrong reason. Full account in §8.7c |
| 2c hero | `(this commit)` | **29 gates green individually, real exit codes, no pipes** — the 22 design gates + `hero-contract` (29 assertions) + `discovery-contract` + `board-discovery` + `product-line` + `i18n`/`trilingual` + `integrity`/`outcome`/`history`/`docs`; **3 RED harnesses**: `red:hero-contract` **6/6**, `red:discovery-contract` 7/7, `red:board-discovery` 6/6; `tsc` exit 0 / 0 lines; `npm run build` exit 0, "Compiled successfully in 14.9s" (the 2 warnings are the known pre-existing `node:crypto`-in-Edge pair at `lock-key.ts:12` / `audit.ts:38`) | **40 frames read** at 360/768/1280/1920 × en/sw/zh across **two data states** — a populated book (Σ TZS 185,500, 52% YES) and a genuinely cold platform (users 0 · markets 46 · resolved 0). `overflowX=0` and `clipped=0` on every frame; **my** smallest control **56px** at every width | Photographic hero **DELETED** (`hero-bg.webp` 193 KB + its `:80` ref, cite-checked repo-wide) → the kit's question board: mark backdrop (geometry/opacity only) · headline from a dict key, **no gold on "wisdom"** · 3-figure proof rail · aggregate conviction via `TippingBar`'s existing `empty` state · 4 real markets closing soonest · one live featured `<MarketCard/>`. ⭐ **Cold start is now ONE rule with FOUR consumers** (`pricedYesPct`) and `DESIGN_AUTHORITY` was **corrected** — it had been stating the rule as the `&& predictors === 0` conjunction the card fixed as a bug. New instrument `qa:landing-shots`. Full account + 5 unpredicted findings in §8.7e |
| 2c-bis hero RE-VALIDATION | `(this commit)` | tsc 0 · **30 gates green individually**, real exit codes · `red:hero-contract` **7/7** (was 6/6 — a seventh case reintroduces the duplication defect) · build exit 0, 13.3s · against **PRODUCTION**: `qa:discovery-probe` 0, `qa:discovery-board` 0, `qa:filter-stress` 0 incl. all 288 combinations | authed hero shot for the FIRST time (4 widths); whole-page frames read at 4 widths; hero `40 OPEN MARKETS` **measured** equal to the board's `status:open` 40 on prod | 🔴 **Found a defect I had already shipped**: the hero stated its lead market twice (featured card == board row 1). Fixed — the card is the soonest, the board opens at the second. Plus: the authed branch had never been rendered (now `AUTH=demo`), an authed page can never reach `networkidle` (SSE), and `git checkout --` during `next dev` 500s every CSS page until `.next/dev` is cleared. Full account in §8.7e-bis |
| 2d landing + header + rail | `(this session, batch 3)` | **33 gates green individually incl. `landing-contract` and `ticker-honesty` (new)** + `hero-contract`/`discovery-contract`/`board-discovery`/`product-line` + `i18n`/`trilingual`; **4 RED harnesses**: `red:ticker-honesty` **13/13**, `red:landing-contract` **5/5**, `red:hero-contract` 7/7, `red:discovery-contract` 7/7, `red:board-discovery` 6/6; `tsc` exit 0 / 0 lines; `npm run build` exit 0, 11.5s | **96 frames** at 360/768/1280/1920 × en/sw/zh, `FULL=1`, all 6 required bands present, **0 failures**; 0 console errors (a real hydration mismatch was found and fixed — see below); every control OPENED (language menu, rail `More`, skip link) at 9 width×locale combinations, 0 failures; header/rail cross-checked on `/markets` + `/results` (the OTHER two pages this batch's global shell components render on) — 0 failures; cold-start pair proven directly: an 8,000/8,000 control card renders a REAL 50%, a genuinely empty market renders an em-dash + "No bets yet", never both as 50% | 🔴 **§3a compliance fix, done first: the ticker was FABRICATED** — a hardcoded 12-item synthetic array on every page. Rebuilt on ONE `getPlatformStats` scan (no second unbounded query), settlements only (no individual bets — PDPA), ordered by `settledAt` DESC, a VOID carries no figure, outcome read never inferred, localised before render. `StatsBand` deleted. Landing composed on the `--rh-*` rhythm tokens (their first consumer). **The hero/grid repetition batch 2 left open is fixed**: `lib/markets/landing.ts` excludes the hero's own ids from the grid by construction and picks a lens the eyebrow states (`pool` when the book has money, `new` when it doesn't — average-of-zeros would have ordered the grid identically to the hero on a cold book). Topic tiles reconcile to the hero by construction (folds over the same open set), asserted by `landingTopicsReconcile`. Header: opaque at every scroll position (was 78%+blur), 3 nav tiers, ONE 44×44 language menu at every width (was a 3-pill capsule absent below 640 AND across 1024–1279, with a duplicate picker in the avatar menu to cover the second gap — both gone). Rail: 5 slots, `--pill-active` (aqua literals gone), `data-needle-keepout` wired to an existing-but-unused obstacle mechanism. Settled strip + RG line + trust band (M-Pesa via `PaymentLogo`, never inlined). Entry motion at 550ms on the EXISTING `kp-rise` keyframe (a second definition would have silently retuned two other consumers — caught by `test:keyframes`). Primer copy: the dict's `card3Body` was STALE against the capped-fee model (Swahili line described a fee-free split) and was corrected BEFORE the component was pointed at it, not after. Two-officer resolution copy corrected to match `requireTwoOfficer` actually being optional, not default. Full account, every defect found and how each was caught, in §8.7f below |
| 5 ONE filter language | `(this session, batch 5)` | **`test:filter-language` (NEW, 66 assertions incl. a vacuity control) wired into `predeploy`**; `red:filter-language` **8/8, each defect on its own assertion** — the 8th being the INSTRUMENT's own failure mode (an empty subject set); `test:design-frozen` · `ui-consistency` · `i18n` · `bridge` · `tokens` · `measure` · `design-one-door` · `chip-contract` · `discovery-contract` · `board-discovery` · `updown-digest` · `gold-is-money` · `trilingual` · `position-permalink` · `orphans` all green; `red:discovery-contract` / `red:board-discovery` / `red:time-left` green; `tsc --noEmit` exit 0; `npm run build` exit 0 | **516 controls measured in a browser at 360/768/1280/1920 × en/sw/zh** — 999px, ≥44px, 0 inline styles, 0 unselected outlines on every one; **120 frames read**, every `<details>` menu OPENED; all four board probes green (`qa:discovery-probe` · `qa:discovery-board` · `qa:results-board` · `qa:filter-stress`); `qa:tap-hit` green; the day rail proven promise == delivery | ONE primitive (`ui/filter-pill.tsx`) for **eight** rails — the brief said six. 🔴 The reference broke its own law-82 and the extraction FIXED it (`.kp-fchip[data-on]` in globals.css) rather than copying it; `test:design-frozen` was green over all six inline styles because `var(--` exempts the line. 🔴 A filter control was wearing the money ink (`.pchart-range.is-active` = `--gilt`), outside `test:gold-is-money`'s deliberate two-file scope. 🔴 Batch 4's `::after` hit-area trick **measured 36px, not 40** — paint order — now `min-height`. 🔴 `/updown/history` had a filter with NO control; it has a derived day rail with honest counts and zero extra I/O. Three corrections to §8.7h's own scan: 8 surfaces not 6, `/positions` is 48px not 32, `/markets` had 5 inline-styled controls not 2. Full account in §8.7h |
| 4 cleanup + the deferred trio | `(this session, batch 4)` | **40 gates green individually, real exit codes, no pipes** — the 22 design gates + `hero-contract`/`discovery-contract`/`board-discovery`/`landing-contract`/`ticker-honesty`/`product-line`/`i18n`/`trilingual`/`docs`/`orphans`/`orphan-actions`/`markets`/`selection-closed`/`grid-paging`/`needle` + **`test:time-left` (NEW, 34 assertions incl. a vacuity control)**; `red:time-left` **5/5**, each defect on its own assertion, tree restored byte-identical; `tsc --noEmit` exit 0. ⚠️ `test:responsive`/`test:motion` are server-dependent (default `:3000`, not in PLAN §3's 22) — `test:motion` exit 0 at `BASE=:3009`, 43 passed | 12 seam frames **before AND after** at 360/768/1280/1920 × en/sw/zh · 12 time-left frames · 3 minute-branch frames · **32 card hit tests**; 0 overflow, 0 console errors anywhere; card geometry diff **IDENTICAL** before/after | 🔴 **The live RG regression Ali reported, fixed first**: each of the three RG destinations appeared **twice on one page** (1 RG line, 1 footer) at all 12 combinations — counted by href, not localised text — and the void was **320px, not the 192px the finding estimated** (`.kp-rg`'s own margin-top+padding-top added 96, and **`mt-12` computes to 128px on this repo's CUSTOM scale**, `tailwind.config.ts:176`). Links deleted, dead CSS deleted in the same commit, the double-count margin removed → 96 above / 128 below, both single tokens, landing on the rhythm block's own drawing. 🔴 **§4d found a THIRD time-left copy the plan did not name** — `markets/page.tsx:271`, with the defective `Math.floor`, on the busiest board; all five callers now delegate and a gate + RED proof now guard it. 🔴 **§4e shipped** — Details hit area 17→40px with **zero** layout movement, proven by hit test because no bounding-box instrument can see it. §4a cite-check: **clean, nothing archived, no empty dated folder created**. §4b: all three carried forward (Ali). §4c: filter UI for four more surfaces **NOT commissioned** (Ali). Plus **three of this batch's own instruments were wrong before the product was** — full account in §8.7g |

| 6 the phone filter sheet + the chart's 44px | `(this session, batch 6)` | **`test:filter-language` 91 assertions** (66 → 91: §5 is new, §4 gained the 44px pair); `red:filter-language` **17/17, each defect on its own assertion** (8 → 17, seven of them this batch's); `tsc --noEmit` exit 0 / 0 lines | `qa:discovery-board` green incl. **the sheet OPENED at 360 in sw and zh** — docks to the window bottom (780/780), nothing above the top, 100% inside the viewport, scrim covers the window, Escape closes, focus returns; `qa:filter-scan` measured the sheet's controls **with the sheet open**; `qa:tap-hit` extended to the chart rail at 4 widths | Odds · pool · topic move behind ONE `Filters` button below `lg`: sticky bar **214px → 116px** at 360 in **both** sw and zh. ⭐ Sort and status stay in the bar at every width, per COMPONENTS §21 — see §8.7i for why the first build got that wrong. 🔴 **`position: fixed` was not viewport-fixed**: `.route-enter`'s `both`-filled animation retains a transform for ever and became the containing block, putting the panel at `top: -32px` with its bottom 172px clear of the window and a scrim covering neither. 🔴 **Three instruments were wrong before the product was.** `.pchart-range` 40 → **44px** (Ali, 2026-08-14). Full account in §8.7i |

## 7 · IMPLEMENTATION DOSSIER — measured facts for the next session (2026-08-12)

Three read-only investigations mapped the live code. Everything below is verified with
file:line; re-verify only what a later commit may have moved.

### 7a · /markets today (what batches 2a/2b replace)

- `src/app/markets/page.tsx` (692 lines) — **pure server component**, `force-dynamic`;
  `FilterBar` / `SearchAwareGrid` / `LiveEmptyState` / `GridSkeleton` are async server
  functions inside the same file. Client islands: `RefreshPoller` (30s), `SearchBox`,
  `MarketCard`, `EmptyState`.
- Board read: `getLiveBoard = cache(() => listMarkets({status:"LIVE"}).filter(m => !isClosedByTime(m)))`
  (`page.tsx:65-67`) — ONE read per request (B-17); enrichments (`traderSeedsByMarket`,
  `getCardCharts`, `countCommentsByMarkets`) degrade with `.catch(() => new Map())` (B-1);
  the board read itself must keep throwing to `error.tsx`.
- URL params today: `cat` / `when` / `q` / `page` — `DEFAULT_WHEN = "all"` has **four readers**
  (`page.tsx:50-54`) and there are **three independent href builders** (`page.tsx:161`, `:302`,
  `:415`) plus `Pagination.href` (`pagination.tsx:56-60`). Any new param (sort/odds/pool/topic)
  must thread through ALL of them or links silently drop it.
- ⚠️ `when=today` as default once rendered a 0-card board on production while the header said
  "40 live" (`page.tsx:34-54`) — the kit's status counts avoid this class; keep counts honest.
- The rail to delete: 5 `WHEN_OPTIONS` + 8 `CATEGORIES` pills (`page.tsx:135-221`).
  ⚠️ **`h-8` = 48px here** — `tailwind.config.ts:156-171` overrides the spacing scale
  (`h-10` = 80px, `px-3` = 16px). Burn records: `pagination.tsx:74-84`, `loading.tsx:10`.
- No sort UI exists; the pattern to copy is `/results` (`src/app/results/page.tsx:33-223`:
  `SortField`, parse, `SORT_OPTIONS`, apply, `buildHref`, a third `<nav>` rail group).
- **Both skeletons hard-code `height: 349`**: `loading.tsx:70` (route transition) and
  `page.tsx:666` (`GridSkeleton`, the Suspense fallback a visitor actually sees). Move the
  measured card height through ONE shared definition in the same commit as any change.
  Licence condition 1: skeleton blocks must not read as numbers.
- Paging: `PLAYER_PER_PAGE = 12` (`pagination.tsx:16`); kit contract: `Load N more`,
  N = min(pageSize, remaining); 12 at 2–3 cols / 6 at 1 col; pager total == filter-bar count.
- Watchlist: `watchlist-service.ts` + `WatchStar` (`src/components/markets/watch-star.tsx`)
  exist — star renders ONLY on the detail page today; `/watchlist` route exists with no
  `/markets` entry point. Kit: 44×44 star on every market, `Watching` status filter.
  ⚠️ Kit persists watch to localStorage; the CODEBASE already persists server-side — the
  server wins (decided): `Watching` filter reads the service, not localStorage.
- Search: `SearchBox` debounced-URL 250ms + grammar (`src/lib/search/fields.ts:47-58`,
  fields title/category/criterion/id/status). Typeahead is greenfield (kit §3g).
- Density toggle: does not exist anywhere — greenfield (kit compact list §3e,
  `role="table"` semantics).
- `move24h`: derived, `getCardCharts` (`market-history.ts:293-338`), `undefined` without a
  24h baseline (A-5). Today fetched only for rendered ids — the `Biggest move` sort needs a
  board-wide fetch; **absent sorts LAST, never as 0**.
- `isNew`: the card derives `fresh = volume===0 && predictors===0`, `noPrice = volume===0`
  (`market-card.tsx:237-238`); the board's "new markets" rule matches (`page.tsx:385`).
  The kit's `New` status filter follows the card. `predictorCount` counts PEOPLE and is never
  decremented on cash-out.
- "Open" vs closed: inclusion gate `isClosedByTime` (`market-service.ts:340-343`); a
  selection-closed market STAYS on the board awaiting results (`isSelectionClosed`,
  `:348-352`) — the kit's `Open` segment = today's default board; `All` = decide whether it
  adds RESOLVED/VOIDED (kit invented `All 58` incl. closed — pin this in 2a and record here).
- Categories: 7 + all — **Politics is licence-excluded** (`market-service.ts:65-76`); the
  8-item list is re-declared in ≥5 places (`markets/page.tsx:142`, `results/page.tsx:84`,
  `app/page.tsx:47`, `admin/markets/page.tsx:27`, `admin/markets/new/wizard.tsx:18`) —
  derive from `MARKET_CATEGORIES` while touching this. `categoryGlyph()` exists
  (`glyphs.tsx:334-343`).
- Topic aggregate (count + pool per topic): **does not exist** — fold it from the one cached
  board read in JS (~40 rows), never a second query; per-topic counts must reconcile to the
  header count (kit's own requirement).
- Measure: `/markets` page + loading are on the RAW_WIDTH ratchet allowlist
  (`measure-system.test.mts:50`) — migrating them to `<PageContainer tier="board">` SHRINKS
  the list (the one legitimate ratchet move; identical emitted classes).
- Sticky geometry is a coupled triple today: `top-[56px]` / `lg:top-[122px]` /
  `min-h-[17px]` echo row (`page.tsx:104`, `:122`, `search-box.tsx:171-180`). The kit's
  sticky filter bar (top 56, z 20, condense-on-scroll via `grid-template-rows: 1fr→0fr`,
  never max-height) replaces this — re-derive the offsets once, keep them in one place.
- `ProposePromo` renders at `page.tsx:98` — kit: **remove from /markets entirely** (footer
  link keeps the flag).
- i18n: ONE dict (`src/lib/i18n-dict.ts`, en≈1 / sw≈1637 / zh≈3083). `common.sort`
  ("Panga"/"排序") exists unused; `results.sortNewest/sortHighest` are the sort-label
  precedent. ⛔ **CORRECTED 2026-08-13 — this line used to say "`Dict = typeof dict.en` so
  missing keys are compile errors". THAT IS FALSE and it is the dangerous direction to be
  wrong in.** `Dict` is derived from `en` ALONE, there is no `satisfies Record<Locale, Dict>`
  anywhere in the file, and both consumers erase the drift with a cast
  (`i18n-server.ts:20`, `i18n.tsx:98` — `dict[locale] as Dict`). A key added to `en` and
  forgotten in `sw`/`zh` **typechecks clean and ships**. `npm run test:i18n` is the only real
  parity check — the gate's own header says so. The group is `market` (singular, 334 keys);
  there is no `markets.*`.

### 7b · Landing + header today (what batches 2c/2d replace)

- `src/app/page.tsx` order today: full-bleed hero (`:72-212`; `<img src="/hero/hero-bg.webp">`
  at `:80`, inline oklch gradient literals `:99-113`) → Up&Down band (`:217-246`) → live grid
  of 8 (`:248-286`) → topic tiles (`:288-311`, static `TOPICS`, no counts) → trust strip
  (`:313-353`) → `StatsBand` (`:355-366`, gated `settledCount > 0`).
- ⚠️ The hero H1 is **hardcoded English JSX with no i18n key** (`:134-152`). Decision: the
  headline words stay verbatim in ALL locales ("The wisdom of YES & NO." — YES/NO are product
  terms and the words are the decided call); move it to dict keys anyway so the string has one
  home, with identical en/sw/zh values unless Ali says otherwise. Eyebrow/lede stay translated
  (`t.home.*`).
- **Cold start**: `docs/DESIGN_AUTHORITY.md:494-498` — ONE rule (`volume===0 && predictors===0`
  on a live open market), THREE consumers (`markets/page.tsx:385`, `market-card.tsx:237-238`,
  `markets/[id]/page.tsx:209-224`; the card/detail split it into `fresh`/`noPrice` — read
  their comments). The new hero is the FOURTH consumer: the aggregate-conviction bar gates on
  `Σ pool > 0` (below it: the dashed-rail vocabulary `--bar-empty-track`, never a 50% claim —
  `impliedYesPct` returns a hardcoded 50 on an empty pool, `market-service.ts:232-236`);
  the question board gates on `live.length > 0`. **Update DESIGN_AUTHORITY's three-consumer
  paragraph to four in the same commit.**
- **Aggregate conviction** is net-new: `Σ yesPool / Σ (yesPool+noPool)` over live markets,
  computed once server-side — never an average of per-market percentages.
- **The ticker is global and its data is FABRICATED** (`src/lib/server/ticker-feed.ts` — a
  hardcoded 12-item synthetic array, on every page of a licensed real-money product). The kit
  keeps a ticker as the one permitted perpetual loop; the batch that touches the landing must
  wire it to REAL events (recent settled markets keyed off `settledAt` + recent market opens)
  or render nothing — A-5: nothing over a guess. This is the plan's one product-honesty fix.
- **Settled strip** (new): `listMarkets({status:"RESOLVED"})` then **re-sort by
  `settledAt ?? resolutionStage2At` DESC** — never slice the board-ordered list (that pinned
  3 July markets as "recent" on prod once, `markets/page.tsx:326-334`); a RESOLVED market with
  `settledAt: null` is still inside the objection window — key off `settledAt`. Source label:
  the market's `sourceUrl` host or the settlement source name; amount = pool − fee via
  `payout.ts` + the frozen `feeSnapshot`, formatted by `formatTzs` — gold is correct here
  (earned money). `resolvedOutcome` must be threaded to every new call site that can render a
  resolved state (law 25 / `test:outcome` reads call sites).
- **Header** (`src/components/layout/top-app-bar.tsx`): today translucent
  (92%/78% + blur ≥1024, `globals.css:2455-2464`) → kit: **opaque `var(--panel)` at every
  scroll position**, `--shadow-2` when scrolled (140ms ease-out). Today NO auth buttons in the
  header (auth lives in avatar menu + hero + bottom rail) → kit: `Sign in` (ghost) + `Sign up`
  (pill) in the header at every width. Language toggle today is a 3-pill capsule hidden <640
  AND 1024–1279 (the overflow band, `top-app-bar.tsx:137-142`) → kit: ONE 44×44 `EN ⌄`
  trigger at every width opening a `role="listbox"` (options must be DIRECT children).
  Nav tiers: destination (no border) / utility (bordered) / action (pill); active =
  `--pill-active` + `--text` + 600 — the ONLY active treatment. Up & Down is a destination
  with a 5px `--gilt` dot + `--brand-300` ink (⚠️ verify the gilt dot against
  `test:gold-is-money` before shipping; if the gate objects, the dot goes brand, not gold).
  ⚠️ The nav must hold `Jedwali la Washindi` (SW for "Top", 19 chars, ×6.33) through the
  1024–1279 band — the band that already overflowed once.
- **Bottom rail** (`src/components/layout/bottom-nav.tsx`): today 5 slots authed / 4 guest,
  aqua-literal active pill → kit: 5 slots `Markets · Up & Down · Live · Results · More`,
  active = `--pill-active` on the pip + `--text` label (same language as desktop), auth NOT
  in the rail (it moves to the header), `--panel` + 1px `--border` top +
  `--shadow-overlay-up` + safe-area padding. Keep `t.nav.*` keys; More carries Positions /
  Wallet / Top / Invite for authed users (wallet stays one tap via the header pill).
- **How it works** (new section): heading + lede read the SAME dict keys as the first-visit
  primer (`t.primer.card1Title` = "Predict events. Not chance." + `card1Body`) — and fix
  `first-visit-primer.tsx` to read the dict too (today it duplicates the copy inline,
  `:164-211`; the `t.primer.*` keys exist in all three locales and are dead). The three step
  cards are the kit's new copy (README §1b verbatim) → new dict keys with SW+ZH.
- **Trust band**: use `PaymentLogo` (`src/components/wallet/payment-logo.tsx`) for the M-Pesa
  cell — marks are trademarked, must sit on a WHITE tile, `public/pay/mpesa.svg` is a vertical
  lockup (`:20-39` constraints). Never inline the SVG.
- **Stats band replacement**: the two-counter `StatsBand` goes; the proof rail (hero) and the
  settled strip carry the proof role. Real figures only: live count, `Σ` open pools,
  predictions today (count since 00:00 EAT — new cheap query), closing today (`≤24h`).
- **Entry motion**: budget 550ms (kit MOTION.md); use existing `--t-*`/`--m-*` +
  `.m-in`-family utilities; IO precedent is `pulse-grid.tsx:83`; ⚠️ `motion.css` ATOM A
  (`:173-188`): `animation-delay` IS clamped under reduced motion — a delayed `both`-fill
  keyframe blanks content for its whole delay. Reveal marks everything visible without the
  observer under reduced motion; script adds the `.js` class so no-JS renders everything.
  THREE motion gates (OS / in-app / low-end throttle) — every new loop needs its calm branch
  in the same change (`test:reduce-motion`).
- Rhythm tokens: define `--rh-tight/close/section/chapter` ONCE in `globals.css` as `calc()`
  of `--sp-*` with the placement rule as the comment beside them (kit README §1 has the rule:
  144 · 96 · 96 · 144, compressing to ~122/97/96/123 at ≤1024).
- `app-shell.tsx:145`: `<main>` carries `pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0`
  for the floating rail — any new fixed element must respect it. `.market-grid` is SHARED by
  landing and /markets (`globals.css:2640-2702`) — a change hits both.
- OG/social + reports also carry "Predict events. Not chance." (`layout.tsx:43,68,75`) — the
  how-it-works promotion does not touch those.

### 7c · Verification protocol (every batch)

1. `npx tsc --noEmit` · `npm run build` · `npm run predeploy`-relevant gates (at minimum the
   22 design gates + `test:measure` + `test:markets` + `test:i18n` + `test:trilingual`).
2. Boot local in-memory server → screenshot every changed surface at **360 and 1280** in
   **en, sw, zh** — and READ the screenshots (ellipsis notes, clipping inside cards).
3. Commit by explicit path (`git add <paths>`), `git branch --show-current` first, push
   `origin HEAD:main`, then verify: prod 200 + `railway logs -s 50pick` clean boot + live
   screenshot. Quote outputs in the batch log (§6).
4. ⚠️ A second operator shares `main` — `git fetch` + check for new commits before every
   batch; never `git add -A` (another session's in-flight files were once swept into a
   broken deploy).

---

# 8 · THE EXECUTION PLAN (written 2026-08-13, before any code was touched)

## 8.0 · How this session works

One step at a time: **make the change → verify it → record it → next**. Never two batches in
flight. If a step's outcome contradicts this plan, the plan is updated *before* proceeding, not
after. Four batches, each ending in: gates green → screenshots at 360 and 1280 in en/sw/zh →
commit by explicit path → push → verify live → batch log updated in §6.

**Session baseline, measured 2026-08-13 on `5bfd95fa` (not inherited from the previous session's
claim):** `npx tsc --noEmit` → exit 0, zero output lines. All 22 design gates run individually
with real exit codes → **22 green / 0 red**. ⚠️ The exit code was captured *without* a pipe:
`npm run test:x > log 2>&1; code=$?`. Trap 4 (`EXIT=$?` after a pipe reads the last command) was
hit once during this session's first typecheck and the reading was discarded.

## 8.1 · PINNED DEFINITION 1 — what `Open` means

> **`Open` = status `LIVE` **and** `isSelectionClosed(m) === false`.**
> A market a player can actually place a bet on at this instant.

This closes the kit's open question 5 (`README.md:416`, `OPEN-QUESTIONS.md §6.1`), which the kit
deliberately left unanswered and which `ACCEPTANCE.md`'s twelve reconciliations do not resolve.

**Why this direction, and why it is safe — measured on production 2026-08-13:**

| Whole live board, all 4 pages of `https://50pick.tz/markets` | |
|---|---|
| Bettable cards (`chip-live`) | **40** |
| Selection-closed cards (`chip-pending`) | **1** |
| Total | **41** — exactly the header's own "41 live" |
| Share an `Open` segment removes from the default view | **2.4 %** |

⛔ **This is the number that had to be checked before pinning, and it is why the answer is not
obvious.** `createMarket` forces a category selection-lead onto essentially every poll, and the
table runs to **2,880 minutes = 48 hours** for macro/infrastructure
(`ai-poll-config.ts:23-32`) — so a macro poll is betting-closed but still `LIVE` on the board for
up to two days. On a differently-shaped book this definition could hide a large slice. It hides
**one card today**, which is nowhere near the class of the 2026-08-10 incident (a 24-hour window
over long-horizon inventory rendered **0 cards** at nine of nine viewport×locale combinations
under a header reading "40 live"). ⚠️ **Re-measure this ratio before assuming it still holds.**

**The supporting argument (the measurement alone does not decide it):**
- The card already contradicts the word. A selection-closed card wears `chip-pending` labelled
  **"Closed"**, loses the live dot, and its YES/NO row is replaced by a `pointer-events-none`
  ghost (`market-card.tsx:213`, `:289-297`, `:373-390`). Calling that card "Open" is a promise
  the server itself refuses — `buyPosition` returns `SELECTION_CLOSED` (`market-service.ts:678`).
- The kit's stated purpose for the segment is exactly this: *"`Open` being the default is the
  entire mechanism that removes closed markets from the default view"* (`COMPONENTS.md:122-124`).
- It makes every count truthful: the number beside `Open` is the number of markets you can bet on.

⛔ **What does NOT change:** `isClosedByTime` stays the board-INCLUSION gate
(`markets/page.tsx:65-67`, `:260-262`). A selection-closed market is still fetched, still on the
board, still reachable — it simply lives under `All` rather than `Open`. The ⛔ comment at
`page.tsx:260-262` remains true and must not be deleted.

## 8.2 · PINNED DEFINITION 2 — what `All` means

> **`All` = the UNSETTLED book of the poll product line: status `LIVE` ∪ status `CLOSED`.**
> `RESOLVED` and `VOIDED` are **not** included — they live at `/results`.

This **departs from the kit's literal text**, and the departure is deliberate and recorded.

**What the kit actually says, and why it is not authority here:**
- The kit's own documents flag `All` as **invented and unconfirmed**, twice, in identical words:
  *"`All` includes closed and resolved; confirm that is what a user expects `All` to mean"*
  (`OPEN-QUESTIONS.md:59`, `README.md:398`).
- **The executable spec is silent.** In the prototype, `open` and `all` carry the *byte-identical*
  predicate `test:()=>true`, and the 18-market fixture has no status, resolved or outcome field
  at all (`prototype/…dc.html:446-452`, `:383-402`). At runtime the prototype's `All` and `Open`
  return the same set and the same count. There is nothing to inherit.
- The kit's drawn `All 58` vs `Open 41` is a delta of 17 that is never itemised anywhere.

**Why LIVE ∪ CLOSED is the right answer:**
1. **It does not duplicate a whole nav destination.** `/results` already covers the entire settled
   archive — `RESOLVED` + `VOIDED`, category filter, two sorts, an outcome-donut KPI, a notable
   carousel, search on the shared grammar and pagination at 12/page
   (`results/page.tsx:111-148`) — and it is in the primary nav for both authed and anonymous
   users (`top-app-bar.tsx:71`, `:79`).
2. **It fills the one genuine hole.** `CLOSED` appears on **no player discovery surface today**:
   `/markets` queries LIVE (`:66`), `/live` queries LIVE (`live/page.tsx:41`), `/results` queries
   RESOLVED+VOIDED (`:111-112`), `/fairness` queries RESOLVED (`:74`). Only the detail page and
   `/watchlist` render one.
3. **It makes `Open` ⊂ `All` a real, non-empty difference** — `All − Open` = selection-closed
   markets ∪ CLOSED markets — which is what a segment control is *for*. The kit's version could
   not distinguish them.
4. **The card needs no new state.** `MarketCard` already renders CLOSED with its own chip and
   copy (`market-card.tsx:24`, `:288-298`), and `/watchlist` is the live precedent for a player
   board passing every status through one grid (`watchlist/page.tsx:76-80`).

⛔ **`All` NEVER means "both product lines".** `test:product-line` lists
`src/app/markets/page.tsx` as `MUST_STAY_DEFAULT`; any `listMarkets` call there carrying
`productLine:"ALL"` fails the gate, because Up & Down rounds (~300k/yr) would flood the board
(`scripts/product-line.test.mts:100-114`).

⚠️ **Adding `VOIDED` would be a new unbounded query** — `/markets` reads LIVE and RESOLVED today
and never reads VOIDED. Another reason the line is drawn at CLOSED.

## 8.3 · Count honesty — the rule this session adds

The 2026-08-10 incident's real lesson is recorded at `board-discovery.test.mts:15-19`: the
number "40 live" was **factually true** and the board was still a lie, because the count described
the census while the grid described a filtered subset. The kit puts a count on **every** segment
and binds the pager total to the filter-bar count (`README.md:227`). So:

> **Every count rendered on `/markets` names the exact set the board would show if you pressed it.**

Concretely:
- Each status segment's count = markets matching **that status AND every other active filter**
  (odds/pool/topic/q) — the prototype's cross-filtered `countWith` behaviour
  (`prototype:731`, `:589`), **not** the drawn layouts', which show `Open 41` while odds+pool are
  pressed and the result reads 9 (`04-markets-discovery-desktop.html:362`). The layouts are wrong
  on this and the prototype is right.
- Topic counts use the same cross-filtered mechanism (`prototype:784`).
- The pager total **is** the filter-bar count — same value, same variable, never recomputed.
- The page header's census figure is relabelled to name the set it actually counts, so the header
  and the segments can never state two different totals for the same word.

## 8.4 · The kit contradicts itself in eleven places — every one resolved here

Found by reading `README.md`, `SPEC.md`, `COMPONENTS.md`, `DISCOVERY-RATIONALE.md`,
`OPEN-QUESTIONS.md`, the three layouts and the working prototype against each other.

| # | The contradiction | Resolution (and why) |
|---|---|---|
| 1 | **`topic` is specified three incompatible ways** — SPEC/URL says single value (`:565`); README says comma-joined array (`:321`, `:308`); DISCOVERY-RATIONALE explicitly rejects multi-select by name (`:37-40`) | **Single-select.** Two of three sources agree and the third *argues* the case ("multi-select doubles the state space"). URL carries `topic=<slug>`, default `all` omitted |
| 2 | **Topic control shape flipped twice inside the kit** — round 2.1 made it chips on desktop (`SPEC.md:457-458`); round 2.6, the LAST round, replaced eight pills with one menu (`SPEC.md:734`). Layouts follow 2.6; the prototype still renders chips | **One menu control**, same shape as sort. The last correction round wins — that is what "round 2 final" means |
| 3 | **Status segment count: 5 in the docs, 4 in every drawn layout** — `Watching` appears in README/COMPONENTS but in none of 04/05/06 | **Five.** `Watching` is specified behaviour with a server-side service already built; the layouts simply predate it |
| 4 | **Sort count: 6 in the docs, 5 in every drawn menu** — `Biggest move` is absent from all three layouts | **Six.** README/SPEC/COMPONENTS/prototype all carry it; SPEC calls it out as a new sort (`:460`) |
| 5 | **`Biggest move` absent-value handling** — written rule and `ACCEPTANCE.md:111` say *sort last*; the prototype coerces absent→0 (`:432`), which puts them last only in the natural direction and **first** once the user flips it | **Last in BOTH directions.** Implemented as a partition, not a coerced value. `ACCEPTANCE` already adopted this; the prototype is the defect |
| 6 | **Segment counts cross-filtered (prototype) vs not (layouts)** | **Cross-filtered** — see §8.3. A count that says 41 and yields 9 is the incident's own failure shape |
| 7 | **`Clear all` clears to a different status than `Clear every filter`** — bar resets `status:'open'` (`:795`), empty-state fallback resets `status:'all'` (`:813`) | **`Clear all` → `open`** (the default), and the empty-state's last-resort exit is relabelled **"Include everything"** → `all`, which is what it actually does. They are two different actions and will read as two different actions |
| 8 | **Page size 6 at one column is specified but not implemented** — the responsive `page` (6 when <720) is used for `Load N more` but the initial cursor and every reset use the constant 12 (`:499`, `:572`, vs `:627`) | **Implement the contract**: initial page and every reset use the responsive size. Whole rows, never an orphan |
| 9 | **`shown` resets "on any change" — except density and watch, which bypass `redeal()`** (`:774`, `:670` vs `README.md:312`) | **Density and watch do NOT reset paging** — they change presentation and membership-of-a-set, not the query. The README's blanket sentence is the imprecise one |
| 10 | **End-of-set copy differs** — spec/layouts: *"…that is every market matching these filters"* (`COMPONENTS.md:232`); prototype: *"…that is the whole board"* (`:352`) | **The spec's wording.** It is true under every filter combination; the prototype's is only true with no filters applied |
| 11 | **Search-miss exits exist only in the drawn layout**, never in the prototype (`06-states.html:384` vs `:813-814`) | **Build the layout's version** — search-miss and filter-miss are genuinely different causes and the plan already requires per-cause empty states |

| 12 | **The hero headline has two different sizes at the same width** — §1a says `--type-display-2` (44px) "at 390"; §Responsive says `--type-h1` (32px) at "≤560". 390 is inside ≤560, so both cannot hold (found while building batch 2) | **`--type-h1` at ≤560, `--type-display-2` from 561, `--type-display-1` from 1024.** The width-specific table wins — it is the responsive authority, and 44px on a 328px content column is the reading that breaks. Encoded in `globals.css` `.kp-hero__headline`, not in the component |
| 13 | **The hero's second CTA is specified as `.btn-quiet`, a class that does not exist** — 0 occurrences anywhere in `src` | **`.btn-ghost`**, the system's existing quiet variant and the one the old hero already used for its secondary action. ⛔ Not a new class: law 82 says a class must name a key that exists |
| 14 | **The aggregate conviction bar is specified as a "New component"** | **It is not new.** `TippingBar` already carries `empty` + `emptyLabel`, documented in its own source as *"A STATE OF THIS BAR, not a second component — DESIGN_AUTHORITY B9"*, and its needle already tilts on the ±14° signature axis. Building a second bar would have cloned the cold-start rule as well as the component |

**Two further absences (nothing to resolve — recorded so nobody re-hunts them):**
- **Tie-breaking is unspecified across the entire kit.** The prototype relies on JS sort
  stability. → This session defines one explicit secondary key per sort and records it in §8.5.
- **`status=watch`, `sortDir` and `density` have no URL representation** (`SPEC.md:561`), yet ship
  as state. → `sortDir`/`density` stay client-persisted (`50pick.discovery.v1`) and out of the
  URL, per the kit. `Watching` **does** get a URL value, because a status segment that cannot be
  linked to is the only one that breaks the back button.

## 8.5 · The pinned data contract (what Batch 1 implements)

**URL params** — every default omitted, server-renderable, `replaceState` on every control except
`q` which uses `pushState` debounced 300 ms so Back clears a search:

| Param | Values | Default |
|---|---|---|
| `status` | `open` · `today` · `new` · `watch` · `all` | `open` |
| `sort` | `closing` · `pool` · `people` · `close` · `move` · `new` | `closing` |
| `dir` | `asc` · `desc` | *(absent = the sort's natural direction)* |
| `odds` | `any` · `call` · `cont` · `long` | `any` |
| `pool` | `any` · `10k` · `50k` | `any` |
| `topic` | `all` + the 7 category slugs | `all` |
| `q` | free text, trimmed | *(empty)* |

**Status predicates** (all against the ONE cached board read):
`open` = LIVE ∧ ¬selectionClosed · `today` = open ∧ closes ≤ 24 h · `new` = **follows
`market-card.tsx`'s rule** (`volume === 0 && predictors === 0`, `:237-238`) not the kit's
"added in 4 days" — per `ACCEPTANCE.md:109-110` · `watch` = server-side watchlist membership
(the service wins over the kit's localStorage) · `all` = §8.2.

**Sort keys, natural direction, and the tie-breaker this session defines:**

| Key | Label | Expression | Natural | Tie-break |
|---|---|---|---|---|
| `closing` | Closing soonest | `bettableUntil(m)` | asc | `createdAt` desc |
| `pool` | Biggest pool | `yesPool + noPool` | desc | `bettableUntil` asc |
| `people` | Most predictors | `predictorCount` | desc | pool desc |
| `close` | Closest call | `abs(50 − yesPct)` | asc | pool desc |
| `move` | Biggest move | `abs(move24h)` | desc | pool desc |
| `new` | Newest first | `createdAt` | desc | `bettableUntil` asc |

⛔ `move`: markets with **no** `move24h` are partitioned OUT and appended last **in both
directions** — never coerced to 0 (contradiction 5). `move24h` is `undefined` without a 24 h
baseline (`market-history.ts:293-338`) and A-5 forbids inventing one.
⚠️ `closing` must sort by **`selectionClosedAt ?? resolutionAt`** — the clock the card *shows* —
not `resolutionAt`. The existing `bettableUntil` helper (`page.tsx:263-264`) already encodes this
and the comment above it records why (a board that contradicted its own cards).

**Odds buckets** (single-select, inclusive unless stated): `call` = 40 ≤ pct ≤ 60 ·
`cont` = 25 ≤ pct ≤ 75 · `long` = pct < 15 (strictly under). `call` ⊂ `cont` by design.
⚠️ `impliedYesPct` returns a hardcoded **50** on an empty pool (`market-service.ts:232-236`), so
a cold-start market would land in `call` and `cont` on a number nobody staked. **Markets with
`pool === 0` are excluded from every odds bucket** — licence condition 1 (never render a guessed
number) applied to filtering, not just display.

**Pool buckets**: `10k` = pool ≥ 10,000 · `50k` = pool ≥ 50,000 (TZS, inclusive, no upper bound).

**Paging**: 12 at 2–3 columns, 6 at one column, always whole rows. `Load N more` where
N = min(pageSize, remaining). Under one page → no pager. Reset to page 1 on any status/sort/
odds/pool/topic/q change (not on density/watch). Count line `aria-live="polite"`; the grid is not.
Infinite scroll is prohibited (`DISCOVERY-RATIONALE`).

**Empty states — three causes, never one generic**: filter-miss (offer computed relaxations with
real counts, priority-ordered, only those yielding > 0, capped at 3, first primary) · search-miss
(search-everything-including-closed + suggest + Try chips) · watching-empty.

## 8.6 · Gate risk register (checked before writing code)

| Gate | Risk from this work | Action |
|---|---|---|
| **`test:board-discovery`** | 🔴 **Will break by design.** It is a *structural* guard pinned byte-close to the current implementation: `DEFAULT_WHEN` as a named constant, the `WHEN_CUTOFFS` table, ≥5 `DEFAULT_WHEN` usages, ≥2 `sp.when` readers, the `resolvedAll` descending re-sort, `inWindow = new Set(...)` (`board-discovery.test.mts:64-141`). Replacing the when-rail removes every anchor it greps for | **Rewrite the gate onto the new structure in the SAME commit**, preserving its *property* — "a player who has chosen nothing is never shown a subset of the live book chosen by a clock" (`:26-29`). ⛔ Do not delete it, do not weaken it. Its RED harness (`board-discovery-red.mjs:45-60`) mutates `page.tsx` by exact string anchors and must be re-anchored too |
| **`test:product-line`** | `/markets` must never opt into `productLine:"ALL"` | `All` = LIVE ∪ CLOSED on the MARKET line only. Gate stays green untouched |
| **`test:outcome`** | If the grid can render a RESOLVED card, law 25 forces `resolvedOutcome` onto that call site. ⚠️ The gate's detection is **regex-shallow** — `status={statusFor(m)}` would EVADE it (`outcome-display.test.mts:92-95`) | `All` excludes RESOLVED, so the main grid never renders one. The existing resolved teaser keeps its literal `status="RESOLVED"` + `resolvedOutcome` |
| **`test:measure`** | `/markets` page + loading are on the `RAW_WIDTH_ALLOWLIST` (`measure-system.test.mts:50`) | Migrating both to `<PageContainer tier="board">` **removes** two entries — the one legitimate ratchet move (shrinking, never zeroing) |
| **`test:gold-is-money`** | Watch star and any gilt nav dot are challengeable | Verify both against the gate before shipping; default to non-gold. Sort carries no gold (the kit's own final round withdrew it) |
| **`test:i18n` / `test:trilingual`** | Every new key needs real SW + ZH; `Dict = typeof dict.en` makes a missing key a **compile error** | Add all three locales in the same edit |
| **`test:chip-contract`, `test:ui-consistency`, `test:contrast`, `test:shell-boundary`** | New chips, new controls, new sticky bar | Run after every step, not once at the end |

⚠️ `test:board-discovery` and `test:product-line` are **NOT in `predeploy`** — they can rot
silently. Both are run explicitly in this session's per-step verification.

## 8.7 · Batch order and per-step verification

Unchanged from the brief: **1** `/markets` contract + UI · **2** hero · **3** landing + header +
rail · **4** cleanup + handoff. Every step, without exception:

1. `npx tsc --noEmit` — real exit code, no pipe.
2. The gates that step can plausibly break, plus `test:board-discovery` + `test:product-line`.
3. Local drive at **360** and **1280** in **en · sw · zh** against a seeded in-memory server, and
   the screenshots are **read**, not just captured (ellipsis, clipping inside cards).
4. Commit by explicit path. `git branch --show-current` first. `git fetch` and check for a second
   operator's commits before every batch.
5. Push, then verify: prod 200 + clean boot + a live screenshot.
6. Update §6's batch log **in the same commit** as the code.

## 8.7a · Batch 1 — VERIFIED ON PRODUCTION 2026-08-13

Driven against `https://50pick.tz` after the deploy, not merely deployed:

| Measured on production | |
|---|---|
| `Open` | **40** — markets a player can bet on right now |
| `All` | **42** — the unsettled book. **The 2-market difference is the definition doing real work**: markets in the book that are not bettable, including a `CLOSED` one that appears on no other player surface |
| Header census | `40 live · TZS 1,653k in play` — the OPEN set, matching the segment |
| Promise == delivery | **every control**, incl. cross-filtered (with `pool=10k` pressed: `odds=cont` promises 1 and delivers 1; `status=all` promises 20 and delivers 20) |
| Grid vs promise | 12 drawn of 40 promised · `pool=50k` → 11 of 11 · `odds=cont` → 2 of 2 · page 2 → 12. **Counted in a real browser DOM** |
| Sticky bar at 360 / Swahili | **116px** (was 448px when rows wrapped) |
| Recently resolved | 11 Aug · 3 Aug — genuinely recent, so the descending re-sort holds |

⚠️ **Three probe bugs were found before any product bug, and each was green for the wrong
reason first.** They are worth more than the passes:
1. Counting every rendered question also counted the 3-card resolved strip → "15 of 40". It had
   passed LOCALLY only because the in-memory store holds **zero** resolved markets — green for
   the absence of the thing it should have excluded.
2. Taking the first `.market-grid` picked up a streamed Suspense **skeleton** (production HTML
   carries four such blocks; three are fallbacks).
3. Slicing between `data-board="grid"` and the next grid read 6, because **React streams
   Suspense content — the byte order of the response is not the DOM order**. Of 15 questions on
   the page, 6 bytes-land before the resolved strip and 9 after.
   ⛔ **A regex over a streamed response cannot answer "what does the grid render."** Card
   counting moved to a real browser (`.qa-design-round2/count-cards.mjs`); the HTTP driver keeps
   only attribute reads, which are position-independent.
4. `sort=closing` vs `sort=pool` "produces a different lead card" passed only while the fixture
   had varied pools. On a fresh seed every pool is 0, `pool` ties everywhere and falls to its
   documented tie-break (`bettableUntil` asc) — which IS the closing order. Identical leads,
   arithmetically correct. The assertion now states its own precondition.

## 8.7b · What batch 1 found that the plan did not predict

Three things, all caught by measuring rather than by reading:

1. 🔴 **The bar was 448px tall at 360 in Swahili and Chinese** — eleven controls wrapped into six
   rows, sticky, eating **57% of a 780px phone viewport** before one card was visible. Built by
   wrapping, which reads fine at 1280 and is unusable on the device most of the audience holds.
   Measured with `document.querySelector(".kp-discovery-bar").getBoundingClientRect().height`,
   not eyeballed. Fixed by scrolling each row horizontally below `lg` (the codebase's existing
   answer — the old rail scrolled its groups the same way) → **116px**, desktop unchanged at 168.
   ⚠️ The kit's own answer is a mobile filter SHEET (`05-markets-discovery-mobile.html`); the
   scroll strip was chosen because it needs no JavaScript. If the sheet is ever built, this is
   the note that says why it was not.

2. 🔴 **`border-border-control` compiled to NOTHING** at two call sites. `--border-control` exists
   in `globals.css:316` — it is the WCAG 1.4.11 token for a border that is a control's ONLY
   boundary (3.45:1, where the decorative `--border` is 36% L and does not qualify) — but it had
   no Tailwind bridge key. Caught by `test:bridge`, which is exactly the gate born from the
   1,325-classes-emitting-no-CSS finding. Fixed by adding the bridge, not by changing the call
   site: the token was the correct one.

3. ⚠️ **`PageContainer` forbids padding on the call site.** `<PageContainer tier="board"
   className="py-6">` fails `test:measure` — the container owns page padding, and a `py-6` there
   is a second definition of it. The migration is a pure swap; do not carry the old page's
   padding across with it.

## 8.7c · THE VALIDATION PASS — one product defect, three instruments that lied

Ali asked for batch 1 to be re-validated before batch 2 was built on top of it: *"make sure it's
100% functional visually and technically"*. It was not. **The board's data was flawless and its
mobile controls were not usable.**

### 🔴 The product defect: the sort and topic menus were 1% visible on a phone

| Measured on production, 360px | |
|---|---|
| Sort menu panel | 274px tall · **4px visible · 1%** · 0 of 6 options reachable |
| Topic menu panel | 362px tall · **4px visible · 1%** · 0 of 8 topics reachable |
| At 1280px | 100% visible — desktop was always fine |

**Cause.** Both menus are `<details>` whose listbox is absolutely positioned. They sat inside the
row that scrolls horizontally below `lg`, and **CSS coerces `overflow-y: visible` to `auto` the
moment one axis scrolls** — so a 62px strip clipped a 362px panel. A box cannot both scroll on one
axis and let a child escape on the other; there is no property that fixes it in place.

⛔ **Nothing caught it, and the reason is the lesson.** The page had zero horizontal overflow,
every tap target measured 44px, no element overflowed its own box, and a screenshot of a *closed*
menu looks perfect. Two of the six controls the batch shipped were dead, and every green check was
honestly green. **The defect only exists once the control is opened, so the check has to open it.**

**Fix.** The chips keep the scrolling strip — that is what took the bar from 448px to 116px in
Swahili — and the menus moved out of it. Mobile row 2 is a one-column grid, so the four groups
stack in the kit's own sort → odds → pool → topic order with no reordering. Two alternatives were
measured and rejected: sort and topic sharing a line fits in 168px but truncates the Swahili sort
value mid-word and squeezes the fused direction button to nothing (flex-wrap breaks a line *before*
it shrinks), and keeping the old `-mx-3` edge bleed made the row overflow its own container by 16px.

`.kp-strip-fade` replaces the edge bleed: a 24px trailing fade on each scrolling strip. It costs no
colour — a mask reveals whatever the bar is painted on — and it fixes a second, quieter defect. The
status strip's clipped chip used to land hard against the result count, so at 360 in Swahili
**"Mpya" and "masoko 40" rendered as one broken word, "Mpymasoko 40"**. The strip also hides 660 of
its 1,020px of chips in Swahili; a hard cut reads as a finished row, a fade reads as "more here".

**Cost of the fix, stated:** the mobile bar goes 116px → **220px** (28% of a 780px viewport), and
stays 220px whether or not filters are active — Topic and Clear share a grid cell so pressing a
filter cannot grow the bar to 272px. Desktop is unchanged: 168px, and 116px in Chinese, whose
labels are compact enough to fit one row fewer.

**The guard that would have caught it** now lives in `qa:discovery-board`: at 360 in Swahili it
opens every `details.kp-menu`, counts its options and asserts ≥90% of the panel is visible; it also
refuses to pass if it cannot find exactly two menu controls, so a rotted selector reads as a
failure rather than a pass. Proven both ways in one sitting — **RED against production** (1%,
2 failures) and **GREEN against the fix** (100%).

### The three instruments that were green for the wrong reason

1. 🔴 **`qa:discovery-shots` and `qa:discovery-board` set the wrong locale cookie.** They set
   `locale` and `NEXT_LOCALE`; the product reads **`kp-locale`** and nothing else
   (`src/lib/i18n-server.ts:18`, `i18n.tsx:39`, `layout.tsx:97`). Proven, not argued: with the old
   cookies the live site returns `<html lang="en">`. So the twelve frames batch 1 captured as
   en/sw/zh were **eight English frames read as trilingual evidence**, and the guard asserting the
   bar height *"in Swahili"* was measuring **English — the easy case**, on the very regression that
   batch 1 existed to fix. This is E-106 recurring four sessions later, so the cookie name now
   lives once in `scripts/qa-locale.mjs`, and `assertLang` reads `<html lang>` back after every
   navigation and **throws** on a mismatch. The real Swahili and Chinese numbers turned out fine
   (116px both), which is luck, not evidence.
2. 🔴 **`red:discovery-contract` could not prove 2 of its 7 defects on a normal Windows clone.**
   The two failing anchors were **the only two that spanned a line break**: `core.autocrlf=true`
   and there is no `.gitattributes`, so the working tree is CRLF while the anchors were written
   with `\n`. The harness's verdict depended on how the tree had been checked out. Both defect
   classes it could not reach — cold-start markets entering the odds buckets on `impliedYesPct`'s
   hardcoded 50, and ties left to JS sort stability — **are** caught by the gate once the anchor
   matches. The gate was sound; the instrument was broken. Anchor resolution now lives once in
   `scripts/red-anchor.mjs`, shared with `red:board-discovery` so the same trap cannot be
   copy-pasted forward, and it refuses an anchor that matches twice.
3. ⚠️ **`test:trilingual` failed ~7.5% of runs with nothing wrong** — measured 9 of 120. The mock
   AI provider rolls a weighted scenario, and `empty`/`malformed`/`error`/`timeout` return no
   title, so part C's *"a generated poll carries all three titles"* lost a coin flip. It is in
   `predeploy`, so a clean tree went red about one run in thirteen. Pinnable now via
   `AI_MOCK_SCENARIO` (validated against the known list, throwing on a typo rather than silently
   falling back to the roll). ⛔ **And one of its assertions was vacuous**:
   `typeof poll.titleZh === "string"` passes on `""` — exactly what a titleless response produces.
   It now asserts the value CARRIES something: non-empty, different from the English, and
   containing CJK. Positive control kept in the file — `RED_MOCK_SCENARIO=empty` makes all four
   title assertions fail on demand, and it was run.

⚠️ **A note for whoever reads the old claim.** The batch-1 log said 12 shots at 360+1280 × en/sw/zh
with overflowX 0 on all 12. The overflow figure was true; the languages were not. It is corrected
here rather than deleted, because the failure mode — *evidence that looks like evidence* — is worth
more than the tidy version.

## 8.7d · THE OTHER FILTERING BOARD — /results was never guarded, and it was lying

Ali, 2026-08-13: *"make sure the filtering logic and new design is applied anywhere old filtering
existed — perfectly working, no glitches, 100% functional, no workarounds, clean code."* The
inventory of every player surface that filters:

| Surface | State |
|---|---|
| `/markets` | the round-2 bar (batch 1 + §8.7c) |
| **`/results`** | 🔴 old sidebar rail · own category list · own sort · own href builder · **no counts** · **no guard of any kind** — addressed below |
| `/positions` | a `tab` pill rail (**3** states — all/open/settled, no categories/sort) — shares the vestigial-bleed fix below |
| `/proposals` | one `f` param, no rail |
| `/updown/history` | one real param (`?day=`), driving a chip and a validated empty state — a genuine single-axis filter, correctly named here rather than folded into the "no filtering" row below |
| `/live` · `/watchlist` · `/leaderboard` · `/fairness` | no category or sort filtering at all |
| admin lists | a different design language (admin kit); the round-2 kit is player surfaces only. ⚠️ Five admin files still spell their own `CATEGORIES` — recorded, not touched |

⚠️ **RE-VERIFIED IN BATCH 3 (2026-08-13), and two things above were corrected on that pass** —
`/positions` has 3 tabs, not 4 (the `["open","settled","all"] as const` union, checked against the
tab array itself), and `/updown/history` was miscategorised alongside the truly unfiltered pages
when it in fact carries a real, working day-window filter. Read the code, not a table, when the
two disagree — this is exactly the class of drift §0a exists to catch.

⛔ **Extending the round-2 discovery bar to `/live`, `/watchlist`, `/leaderboard` or `/fairness` is
NOT in scope for batches 1–3, and re-verifying that they are unfiltered is not the same decision as
building filtering for them.** The round-2 kit commission covers exactly three surfaces (hero,
`/markets` discovery, the landing composition + header) — there is no delivered design for a
leaderboard/fairness/live filter bar, and inventing one now would be a second, uncommissioned
design decision, not an application of the existing one. If a future session is asked to add
filtering to these pages, that is new scope needing its own design source (per §0b: a new design
fact goes in `DESIGN_AUTHORITY.md`, never invented ad hoc at the call site) — named here so it is a
decision for Ali, not a silent expansion.

### 🔴 `/results` dropped the category whenever a search was active

Measured on production before the fix — three different categories, one query, identical boards:

| URL | Cards |
|---|---|
| `/results?cat=crypto` | 2 |
| `/results?cat=sports` | 22 |
| `/results?q=bitcoin&cat=crypto` | **4** |
| `/results?q=bitcoin&cat=sports` | **4** |
| `/results?q=bitcoin&cat=weather` | **4** |

`effectiveCat` was `searching ? undefined : …`, so a search wiped the category out of the read while
the rail went on painting it as selected. A control that says it is applied and is not — the
2026-08-10 failure shape, on the surface nobody had checked. **Search and category now compose**,
the archive is read **once** and filtered in JS (the /markets discipline), and that is what lets
every category carry a **cross-filtered count**: the number beside it is what pressing it delivers
under the active search. An empty filtered search now gets a per-cause exit carrying the real
all-category count, offered only when it leads somewhere non-empty.

Also fixed here: the hand-written eight-item category list is gone — ids come from
`MARKET_CATEGORIES` (**seven**; politics is licence-excluded) and labels from the new
`src/lib/markets/category-label.ts`, which also replaced the private `CATEGORY_LABEL` that had been
sitting inside `markets/page.tsx`. And the filter links now carry `replace`: a filter is not a
navigation, so pressing five of them no longer leaves five history entries for Back to walk through.

### The guards, and why the obvious red proof was NOT one

`qa:results-board` is new: promise == delivery per category, with and without a search; a search may
only ever **narrow** a category; a query matching nothing zeroes **every** count and empties the
board; and a zero-count category offers a real way out.

⛔ Running it against production makes it go red — **for the wrong reason.** Production predates the
`data-chip` attributes, so it cannot read a single promise and correctly refuses on an absent
premise. A red light caused by a missing selector is not evidence that a guard catches a defect.
`red:results-filter` is the real proof: it reintroduces the exact production line, waits for the
recompile, and asserts the guard fails **on the promise-vs-delivery assertions specifically** —
`q="a" cat=sports promised 0, delivered 2` — then restores the file.

### ⚠️ Three defects in this session's own new instruments, before any product defect

1. The `/results` counter counted `h3.mcardp-q` — the **grid** card's heading. /results lifts its
   top markets out of the grid into a featured carousel whose card is an `<h2>`, so the guard
   reported *"promised 2, delivered 1"* against a page rendering both. Counting unique
   `a[href^="/markets/"]` sees the whole set.
2. It asserted *"the counts changed when the search was applied"*. On a fixture where every title
   contains the query the counts are correctly identical, so **a correct product failed** — the
   unconditional-presence trap (`50pick-standards` §5b rule 9). Replaced with invariants that are
   true for every query: monotonicity, and a no-match query zeroing everything.
3. `qa:filter-stress` counted market links page-wide and picked up **/markets' "recently resolved"
   strip** — *"promised 0, delivered 2"* on a correct board. This is batch 1's own "15 of 40" trap
   recurring in a new driver; the count is scoped to `[data-board="grid"]` now, as batch 1's guard
   already was.

⚠️ And the visual sweep **measured nothing on /results for twelve frames while printing a result**:
it looked only for `.kp-discovery-bar`, found no rail, and reported `controls=0 minTap=-1` beside
real readings. The rail carries `data-filter-rail` now, the sweep accepts either surface, and
`controls === 0` on a route flagged `rail: true` is a **failure** rather than a pass. With it
actually measuring, it immediately found a 4px overflow inside the /results rail at 360 and 768 in
all three languages — `-mx-1 px-1 overflow-x-auto` on a `flex-wrap` row, where a horizontal
scroller can never engage, so the bleed bought nothing and pushed the wrapper past its container.
The identical pair on `/positions` was removed with it.

### Manipulation stress — `qa:filter-stress`

| Checked | Result |
|---|---|
| 12 hostile payload classes × every param of both boards (XSS script/attr, SQL-ish, traversal, null byte, 4 KB string, bidi override, duplicated params, negative/huge/NaN/float page) | **no 500s, no payload executed** — XSS is judged by whether the page set a flag, never by finding the payload text, which would flag correctly-escaped output |
| **All 288** `status × sort × odds × pool` combinations of /markets | every one renders and delivers its promise |
| The same URL requested twice | identical board (idempotent) |

## 8.8 · Deliberately DEFERRED — named, with the reason (not silently dropped)

Two pieces of the kit's `/markets` spec are **not** in batch 1. Both are recorded here rather
than half-built, because a control that carries a promise it does not keep is the one thing this
codebase does not ship.

| Deferred | Why | What it needs |
|---|---|---|
| **Density toggle / compact list** (kit §3e, COMPONENTS §5) | The label is "Compact list view" and the spec is a genuinely different DOM: `role="table"`, `role="row"`, `role="cell"`, seven columns with individual hide points (watch star 44 never hides · market flex:1 · trend 96 hidden <1024 · YES 56 · pool 104 hidden <720 · closes 78 hidden <720 · YES/NO 144 hidden <1024). A toggle bearing that label while only restyling the existing cards would be a false promise | A `MarketListRow` component + its own responsive column table. The toggle's persistence (`50pick.discovery.v1`) and its 44×44 geometry are already specified |
| ~~**The mobile filter SHEET**~~ | ✅ **DONE, batch 6 (2026-08-15).** Sticky bar **214px → 116px** at 360 in sw and zh. ⚠️ AND THIS ROW WAS WRONG ABOUT SORT: it said "the sort and topic options must render as flat lists inside it", which the first build read as *sort belongs in the sheet*. The kit says the opposite in four places — **sort and status stay in the bar at every width**, COMPONENTS §21 — and this row's real concern was only that neither may become a NESTED `<details>`. The sheet holds odds, pool and topic. Full account in §8.7i | — |
| **Search typeahead** (kit §3g) | `SearchBox` already delivers debounced-URL search on the shared grammar (quoted phrase, `-exclude`, `field:`), so the board searches correctly today. The typeahead is an ENHANCEMENT — combobox + listbox, `/` focus shortcut, topic/source/market suggestion kinds — not a gap in behaviour | A client combobox over the existing parser; suggestion kinds are specified in COMPONENTS §8 |

| **"Predictions today" as the hero's third figure** (kit §1a, §7b) | It needs `COUNT(Position WHERE placedAt >= 00:00 EAT)`. `Position` is a never-pruned financial-record table already ~20× the poll rows on production, `placedAt` is unindexed, and the landing is the highest-traffic public page — so this is an unindexed count on the hottest surface, plus a migration inside a design batch. The hero ships **Σ `predictorCount` over the open book**, captioned "Open predictions": free (already in the board read), equally real, and it names the set it counts | A `@@index([placedAt])` migration + a DB-side count folded into `getPlatformStats`'s existing 60s memo (never a per-render query) |
| ~~**`a.mcardp-details` at 17px**~~ | ✅ **DONE, batch 4 (2026-08-13).** Hit area 17 → **40px** (`--tap-min`) via an absolutely-positioned `::after`; painted height still 17px, card heights / row offsets / document height byte-identical, info button not swallowed on 32/32 cards. ACCEPTANCE §11's figures were **stale** — `.mcardp-info` is already 46px and `.mcardp-actions .btn` 40px, so this was the lone outlier, and a hit-area extension is not the "redesign" §11 forbids. Full account in §8.7g | — |
| ~~**The time-left formatter's remaining call sites**~~ | ✅ **DONE, batch 4.** ⚠️ There were **THREE**, not the two recorded here — `app/markets/page.tsx:271` also held one, with the defective `Math.floor`, on the busiest board. All five callers now delegate to `src/lib/markets/time-left.ts`; `test:time-left` (34 assertions, incl. a vacuity control) + `red:time-left` 5/5 now guard it; the minute branch was driven in the live product in all three locales. §8.7g | — |

### The three above, re-decided in batch 4 — CARRIED FORWARD, Ali's call 2026-08-13

Asked explicitly rather than assumed. The reasons are unchanged and are restated here so the
deferral stays a decision rather than a silence:

| Deferred | Restated reason | Still needs |
|---|---|---|
| **Density toggle / compact list** | The label is "Compact list view" and the spec is a genuinely different DOM. A toggle bearing that label while only restyling the existing cards is a false promise — and it is a NEW component, not a restyle, so it is not a cleanup-batch item | `MarketListRow` + its own 7-column responsive table with individual hide points |
| ~~**The mobile filter SHEET**~~ | ✅ **SHIPPED, batch 6 (2026-08-15)** — see §8.7i. The carry's own warning proved exact: *"the verification surface is larger than it looks"*. The focus trap / focus return / Escape were checked against the shared `<Modal>`'s ACTUAL contract and reproduce its `[open]`-only dependency — the one that once dragged focus onto a money dialog's confirm button once a second. **Three of the batch's own instruments were wrong before the product was**, and `position: fixed` turned out not to be viewport-fixed inside page content at all | — |
| **Search typeahead** | `SearchBox` already delivers correct debounced search on the shared grammar, so the board searches correctly today. This is a pure ENHANCEMENT, not a gap in behaviour | A client combobox over the existing parser; suggestion kinds per COMPONENTS §8 |

### ⚖️ ALI'S RULINGS — 2026-08-14, asked explicitly and answered

Put to him as four plain-English choices at the close of batch 5, with the trade stated in each.
⛔ These are DECISIONS. Do not re-open them, and do not re-ask.

| Question | Ali's answer | What it means |
|---|---|---|
| The three carried-forward kit pieces | ▶ **The mobile filter SHEET — build it.** ⬜ Compact list and search typeahead **stay deferred** | The sheet is BATCH 6's subject. The other two keep their §8.8 reasons unchanged |
| The three small consistency items | ▶ **Chart buttons to 44px — do it.** ⬜ The `/markets` screen-reader wording and the `rounded-pill` literal **stay deferred** | `.pchart-range` joins the rails at 44. The other two stay named in §8.8 |
| Admin filter rails · `/wallet`'s section tabs | ⛔ **Leave both as they are** | The exclusions are now RULED, not merely defensible. ⛔ Do not propose them again |
| The stale QA credentials | ▶ **Re-mint from the office PC** | Done — 6/6, and all eight rails then verified on production |

### Found by batch 6, NOT batch 6's — filed rather than fixed (2026-08-15)

| Finding | Measured | Why it is not fixed here |
|---|---|---|
| 🔴 **The language menu's panel hangs off the LEFT edge of the screen at ≤390px** | `responsive-audit` against **production**: `/markets@xs button[KiswahiliSW] l-71 r123 > vw320`, `@sm l-63 r131 > vw360`, `@md l-33 r161 > vw390`. Identical on `/admin/markets`, so it is the shared top bar, on every page. `a[Sign up]` is clipped at `xs` too (`l239 r337 > vw320`) | `ui/language-menu.tsx` is a cross-cutting shell component on **every** surface, and a second session is working this clone. Changing it inside a filter batch that has already shipped and been verified would put an unverified edit on every page. It needs its own pass at the four widths × three locales, which is what it will get |
| ⚠️ **The board does not render at all with JavaScript disabled** | `.kp-discovery-bar` 0px inside a `display: none` holder, 19 streamed `<template>`s, on production. See §8.7i | A page-architecture change (the Suspense boundary and streaming strategy), not a filter one, and not commissioned. `qa:discovery-board` prints it on every run so it cannot go quiet |
| ⚠️ **`a[Details]` is 17px painted at all ten widths** | `responsive-audit` soft-warns 6 per board | ⛔ NOT a defect — batch 4 grew the HIT AREA to 40px with an `::after` while deliberately keeping the paint at 17px, and `qa:tap-hit` proves it by walking `elementFromPoint`. A bounding-box audit cannot see that, which is why the warning is a warning |

### Batch 5's own deferrals — named, with the reason (2026-08-14)

| Deferred | Why | What it needs |
|---|---|---|
| **`/markets`' chips announce `aria-pressed`, on an `<a>`** | `aria-pressed` is only valid on `role="button"`; on a link it is a role mismatch a screen reader may ignore or misreport. Every other rail is `aria-current="page"`, which is the accurate reading for a link that reflects current state. But it is the shipped semantics of the REFERENCE surface, changing it is an a11y behaviour change the batch was not asked for, and it deserves its own verification rather than a side effect of a shape batch. The primitive already supports both, so the change is one prop | A screen-reader pass on `/markets` at 360/1280, then flip `semantics="toggle"` → `"tab"` in `discovery-bar.tsx`'s local `Chip` wrapper |
| ~~**`.pchart-range` sits at 40px, not the rails' 44px**~~ | ✅ **DONE, batch 6 (2026-08-15).** `min-height: 44px` — a LITERAL, because `--tap-min` is 40 and would silently revert the ruling, and `--h-input: 44px` is named for inputs. `test:filter-language` §4.3 asserts 44, §4.4 asserts it is not reached through `--tap-min`, and `red` case 15 reintroduces exactly that reversal. `qa:tap-hit` now opens the chart's collapsed panel and walks `elementFromPoint` across the rail at 4 widths | — |
| **`rounded-pill` is a hard-typed `"999px"` in `tailwind.config.ts:199`** | Two homes for one truth (`--r-pill: 999px` is the other), and B10 rule 4 names `rounded-chip` — which reads `var(--r-pill)` — as the canonical semantic key for new design. ⛔ NOT changed here on purpose: switching one call site to `rounded-chip` while ~40 others say `rounded-pill` creates TWO names for one value, which is worse than the single duplication it fixes. §0a says delete one, not add a third | A platform-wide `rounded-pill` → `rounded-chip` sweep, its own change |
| ~~**`red:updown-digest`'s `ungate-refunds` anchor is stale**~~ | ✅ **DONE, same session (2026-08-14), `b70b5a82`** — Ali: *"fix anything found as u go."* Re-anchored against the current `notifyRefund` call and **proven: 7/7, the case failing EXACTLY 1 assertion — §5's own "notifyRefund: every round call site is gated"** — with `market-service.ts` restored byte-identical. ⛔ The repair had to **move** the call, not negate the gate: §5 is a SOURCE assertion that looks back 400 chars for `!perEventNotificationsSuppressed(`, so `if (true \|\| !pred(m))` would leave the text in place and the suite would stay GREEN over a genuinely ungated refund. ⭐ It had been printing 6/7 for four days, which reads as "known red" rather than as a case that had stopped testing its defect — see [[an-instrument-reports-its-own-staleness]]'s fifth shape | — |
| **Admin filter rails are untouched** | `/admin/**` has its own density rules and a different audience, and `DateTimeRangeFilter` is a genuinely different control (a range, not a set of options) already shared across 7 admin routes. Ali's instruction named the player platform | A separate decision about whether admin should share the player pill |
| **`/wallet`'s `<Tabs variant="line">`** | Section navigation, not row filtering — the code says so at its own call site. Excluded deliberately. ⚠️ But it IS a horizontal tab rail on a player surface at `h-10` (**80px**) with an inline-styled active underline, and a reader comparing it side by side with `/positions`' rail will see two languages for what looks like one idea | A ruling on whether a section tab and a filter tab may look different |

🔴 **CORRECTED 2026-08-14 — see §5.8.** The line that used to sit here said filter UI for `/live`,
`/watchlist`, `/leaderboard`, `/fairness` was "not commissioned". The premise was wrong: `/markets`'
pill language is already the law for every filter control, so applying it is enforcement, not a new
commission. **Batch 5 unifies the five surfaces that actually diverge** — `/updown`, `/results`,
`/proposals`, `/positions`, `/updown/history` — and the four named above stay out for a *different*
and still-valid reason: two are pagination-only and two have no filtering at all.

Also **not** adopted, deliberately: the kit's `Load N more` pager. The shared `Pagination`
component is used instead — it is already built, already tested, and shared with `/results` and
`/positions`, so replacing it is a platform-wide change, not a `/markets` one. The parts of the
kit's paging contract that carry meaning ARE honoured: the pager total **is** the filter-bar
count (same variable), and any filter change resets to page 1.

## 8.7e · BATCH 2 — the hero, and what building it found

**Shipped:** the photographic hero is gone. `public/hero/hero-bg.webp` (193 KB) and its
`page.tsx:80` reference were deleted in the same commit the replacement landed, after a
repo-wide cite-check found no remaining code reference. The new hero is
`src/components/home/landing-hero.tsx` + the `.kp-hero*` block in `globals.css`, fed by the
pure `src/lib/markets/hero.ts`.

**The one rule this batch existed to protect, and how it is now provable.** The kit puts a
`--gilt` YES price on *every* question-board row. On the local cold-start book **43 of 44
markets have an empty pool**, so that specification renders four fabricated `50%`s in gold —
breaking licence condition 1 and gold-is-money in one element. §7b anticipated this for the
aggregate bar and for `live.length > 0`; it did **not** anticipate it per row. Both are now
gated on the pool:

| Surface | Empty-pool behaviour | Proven by |
|---|---|---|
| Aggregate conviction bar | `TippingBar empty` → the dashed `--bar-empty-track` rail + "Nothing staked yet — there is no crowd price to show". ⛔ Never 50% | `test:hero-contract` §2 + a rendered cold-start sweep |
| Each question row | em-dash + a labelled state, and **no lean rule drawn** (a 50%-wide bar is the same lie in graphics) | `test:hero-contract` §2 + `% YES` = 0 occurrences in the cold HTML |
| The featured card | the card's own `noPrice` gate (`volume === 0`) already did this correctly | rendered: "No pool yet", buttons with no `@ pct%` |

Measured on a genuinely cold platform (users 0 · markets 46 · resolved 0): `tipbar-empty` × 8,
`No bets yet` × 29, `kp-qrow__lean` × **0**, `% YES` × **0**.

**⭐ `pricedYesPct` is now the ONE cold-start price rule, with four consumers** — the board's
`toRow`, the hero's rows, the hero's aggregate, and (via its own `noPrice`) the card.
`DESIGN_AUTHORITY.md` §"cold start" was updated from three consumers to four **and corrected**:
it had been stating the rule as `volume === 0 && predictors === 0`, which is the conjunction the
card fixed in the freeze pass and documents as a bug (`market-card.tsx:218-238`). The rulebook was
mandating the defect. There are two states with two gates, and **the price gate is the pool alone**.

### What building it found that the plan did not predict

1. 🔴 **The eyebrow said Dar es Salaam twice.** `heroLocation` ("Tanzania · Dar es Salaam") and
   `heroEst` ("Est. 2026 · Dar es Salaam") both carried the city, and the kit composes them:
   `TANZANIA · DAR ES SALAAM · EST. 2026 · DAR ES SALAAM`. `heroEst` is now the year phrase only.
   Nothing else read that key. **Only looking at the rendered frame catches this** — every gate was
   green over it.
2. 🔴 **The time-left formatter existed FIVE times** (`page.tsx:58`, `markets/page.tsx:264`,
   `live/page.tsx:44`, `markets/[id]/page.tsx:800`) and the copies had **drifted**: three floor the
   minute branch with a plain `Math.floor`, so a market with forty seconds of betting left rendered
   **"0m left"** while the detail page rendered "1m left" for the same market at the same instant.
   Extracted to `src/lib/markets/time-left.ts`, which keeps the `Math.max(1, …)` behaviour — "0m
   left" says the door is shut when it is open. ⚠️ **Migrated at two of the four call sites only**
   (`page.tsx`, `markets/page.tsx` — the files this batch already owns). `live/page.tsx` and
   `markets/[id]/page.tsx` still hold their copies; they are money/detail surfaces not in this
   batch's visual sweep, and changing displayed text on a page nobody is shooting is how a
   "cleanup" ships a regression. **Named follow-up, not silently dropped.**
3. 🔴 **`a.mcardp-details` is a 17px tap target** — the frozen card's "Details" link, on every
   board (`/markets`, `/live`, `/watchlist`), at every width. ⚠️ **ACCEPTANCE.md §11 records the
   frozen card's sub-44 targets as "38px YES/NO, 34px info" — this is a THIRD one it does not
   name, and it is less than half the floor.** No existing instrument could see it:
   `qa:discovery-shots` measures controls inside the *filter bar* only, never inside a card.
   ⛔ Not fixed here: `globals.css:3194` makes that row a constant one-line height *so the card
   never changes height between boards*, and `MARKET_CARD_H` depends on it — raising it re-derives
   the card's geometry platform-wide. `qa:landing-shots` **reports it on every line** rather than
   exempting it silently. ⭐ The fix that does not move layout is a `::after` hit-area extension
   (negative margins, `min-height: 44px` on the pseudo-element), which satisfies the floor without
   touching card height. Recommended for the frozen-card pass.
4. ⚠️ **Two of my own checks were wrong before the product was.** `qa:landing-shots` first reported
   "1 clipped node" in the hero at **all twelve** width×locale combinations — it was flagging the
   brand mark, a 1100px decorative backdrop that *deliberately* bleeds off both edges behind
   `overflow: hidden`, exactly as the kit specifies. The clip check now only considers nodes holding
   their **own text**, which is the defect class it is for. And its band clips composite
   viewport-fixed elements (the bottom rail, the chat FAB) into the middle of a tall band, which
   read as collisions until checked against the fold frames. **The instrument was wrong twice
   before the product was wrong once.**
5. **The third proof figure is "open predictions", not "predictions today".** §7b asked for a count
   since 00:00 EAT. That needs a new `COUNT` over `Position` — a never-pruned, financial-record
   table already ~20× the poll rows — on the highest-traffic public page, plus an index migration
   shipped inside a design batch. Σ `predictorCount` over the open book is free (it comes from the
   board read the hero already does), is exactly as real, and is captioned as what it counts.
   Deferred with the reason; see §8.8.

### 8.7e-bis · THE RE-VALIDATION PASS — one real product defect I had shipped, and three instrument gaps

Batch 2 was pushed and live before this pass. It was then re-analysed by going back over every claim
made about it and asking what had been *asserted* rather than *measured*. Seven such claims existed;
one of them was a live defect.

🔴 **THE HERO STATED ITS LEAD MARKET TWICE — shipped in `1de3b38d`, fixed in the follow-up.**
The featured card and question-board row 1 were the same market: same title, same price, ~400px
apart, plus a third appearance in the "Pick a side now" grid below. **Every gate was green over it.**
The per-band clips could not show it either — both elements are inside the one band, and neither
overflows, clips, nor drops below a tap floor. It was found by capturing a **whole-page** frame and
reading it, which is why `qa:landing-shots` now has a `FULL=1` mode: section rhythm and cross-band
repetition are invisible to per-band clips *by construction*.
Fix: the card is the soonest-closing market and the board opens at the **second** — consecutive
slices of ONE ordering, so "the same query" still holds and a pinned favourite is still impossible.
Guarded by two new assertions (`the featured market is NEVER also a board row`, `the card still
comes from the same ordering as the board`) and a seventh RED case that reintroduces the exact
shipped defect. `red:hero-contract` is now **7/7**.

⚠️ **THE AUTHED HERO HAD NEVER BEEN RENDERED ONCE.** The component branches on `isAuthed` — a
signed-in player gets "Browse markets" + "My positions" instead of "Create account" + "Browse all N
markets" — and the entire batch was verified anonymous. A branch no instrument can reach is a branch
that ships unlooked-at, so `qa:landing-shots` now takes `AUTH=demo`, which mints a local session via
`/auth/demo` and **refuses to continue if no session cookie is set** (otherwise it would shoot the
anonymous page and file it as authed evidence). Verified: correct CTAs, `minTap` 56px, `overflowX` 0.

⛔ **AND AN AUTHED PAGE NEVER REACHES `networkidle` ON THIS PLATFORM.** With a session, `app-shell`
mounts `LazyEventStream` (server-sent events) and `LazyNotifyPoller`, so a request is always open and
every `page.goto(..., { waitUntil: "networkidle" })` times out at 90s. The anonymous sweep is
unaffected, which is exactly why nothing found this until the authed branch was shot for the first
time. **Any future authed driver must use `load`.**

⚠️ **`git checkout --` DURING `next dev` POISONS TAILWIND, AND A RESTART DOES NOT FIX IT.** Reverting
three watched files left Tailwind's content tracker holding a stale `stat`, and every page importing
`globals.css` returned **500** with `ENOENT: no such file or directory, stat '…platform-stats.ts'`
— on a file that demonstrably existed (`Test-Path` → `True`). It survived a full server restart
because the tracker state lives in **`.next/dev`**; clearing that directory fixed it on the first
request. ⛔ Do not read this as a code defect: production was serving the same commit with
`ok:true` throughout. Three retries confirmed it was persistent rather than transient before
anything was cleared.

⚠️ **The Needle fidget can sit on top of a hero question's price.** When authed it rendered as a
64×64 fixed element at x=1248 in a 1280 viewport — half off-screen, `z-index: 45`, over row 1's
`86 % YES`. It is the vendored do-not-edit physics toy (`needle.css:28`) and it roams, so this is
**pre-existing and not a batch-2 regression** — the baseline frames show it overlapping the bottom
rail's first slot as well. Recorded because its `#hit` area is `pointer-events: auto`, so a tap
there grabs the fidget instead of opening the market. Belongs to a needle/z-index pass.

**Re-verified against PRODUCTION after the change, not just locally:**

| Check | Result |
|---|---|
| `qa:discovery-probe` | exit 0 — every control's promise == delivery, cross-filtered |
| `qa:discovery-board` | exit 0 — grid draws its page; sticky bar 220px in real sw AND zh; both menus open 100% at 360 |
| `qa:filter-stress` | exit 0 — **all 288** status×sort×odds×pool combinations, 12 hostile payload classes on both boards, idempotent |
| ⭐ hero vs board agreement | the board reports `status:open` = **40**; the hero's proof rail reads **40 OPEN MARKETS**. Same data, same instant — **measured**, where before it was only argued from shared code |

**Still open, and deliberately batch 3's:** the hero's four questions are also the first four cards of
the "Pick a side now" grid below it, because both are closing-soonest over the same book. The hero no
longer repeats itself; the PAGE still repeats. Fixing it is a landing-composition decision (give the
grid a different lens — biggest pool — or offset it past the hero's five), which is §1c's work.

## 8.7f · BATCH 3 — the landing composition, header and rail

**Shipped:** the ticker honesty fix (§3a of the next-session prompt, done first because it is the
batch's compliance item) · `StatsBand` deleted · the page composed on the `--rh-*` rhythm tokens ·
the hero/grid repetition batch 2 left open, fixed · how-it-works band reading the first-visit
modal's own keys · real per-topic tiles · the header rebuilt on three nav tiers with one language
control · the bottom rail rebuilt on five destinations · the RG line + trust band + settled strip ·
entry motion at 550ms with all three reduced-motion gates.

### 🔴 §3a — the ticker was fabricated, and this is the batch's compliance fix, done first

`src/lib/server/ticker-feed.ts` was a hardcoded twelve-item synthetic array — "TZS 180K won on YES
on Long rains begin before 15 Apr · 5m ago" — rendered by `app-shell` on **every page** of a
licensed real-money platform. Its own header comment admitted it: *"realistic synthetic data that
matches real platform patterns."* Same defect class as the fabricated price history killed in
`6b1975b`.

Rebuilt on five rules, each with a positive control in `test:ticker-honesty` (59 assertions) and
each caught on its own assertion by `red:ticker-honesty` (13/13):

1. **Settlements only, never a bet.** "TZS 45K predicted YES on X" publishes one identifiable
   player's stake on every page — with 73 accounts on production that is not anonymous to anyone
   who knows them (PDPA), not a missing-data problem.
2. **A row with `settledAt: null` is not an event.** `status: RESOLVED` is the verdict;
   `settledAt` is when the money moved. A RESOLVED market with no `settledAt` is still inside its
   objection window.
3. **Ordered by `settledAt` DESC**, never the board's order — slicing a board-ordered list once
   pinned three July markets as "recent" on production (`markets/page.tsx:326-334`).
4. **A VOID carries no amount.** We kept nothing and every stake was refunded, so `netPool` does
   not describe what happened; a void is stated NEUTRALLY, never as an error (§C4).
5. **The outcome is read, never inferred** (law 25); an unrecorded outcome is dropped.

⭐ **One scan, two consumers.** `getPlatformStats` already ran an unbounded
`listMarkets({status:"RESOLVED"})` once a minute behind a 60s memo **and threw every row away to
keep a `.length`**. The ticker, rendered on every page, would otherwise have put a second full scan
behind every request on the site; it now reads the rows that scan already produced
(`platform-stats.ts`'s `recentSettlements`). `paidOutTzs` — `StatsBand`'s only reader — was removed
in the same pass once `StatsBand` was deleted, rather than left as a query kept warm for nobody.

⚠️ Two further tells confirmed on production and fixed structurally: Chinese connectives wrapping
English titles (fixed by handing the feed an already-localised title, so the shape is
unrepresentable) and a left-edge clip (real, but caused by `animation-play-state: paused` freezing
the marquee wherever it happened to be under `prefers-reduced-motion` rather than returning it to
rest — the reduced-motion OS gate for the ticker had never actually been exercised).

### The hero/grid repetition, closed by construction

Batch 2's re-validation pass recorded that the hero no longer repeated itself but the PAGE still
did: the hero's four board questions were also the first four cards of "Pick a side now" — both
closing-soonest over the same book. `src/lib/markets/landing.ts`:

- `landingGrid(rows, nowMs, { lens, excludeIds })` subtracts the hero's own drawn ids from the set
  it orders — the repeat is impossible by construction, not by remembering to offset a slice.
- `gridLensFor(openPoolTzs)` picks `pool` when the book has real money and `new` when it does not.
  **Not a fallback** — on a cold book every pool is 0, `pool` ties everywhere and falls to its
  documented tie-break (`bettableUntil` asc), which **is** closing order: a grid headed "Biggest
  pools" would order identically to the hero on the exact data state batch 1 shipped with. The
  eyebrow states whichever lens is active, so the grid is a claim, not a decoration.
- `landingTopics` + `landingTopicsReconcile` make the kit's own requirement — "per-topic counts and
  pools must reconcile to the header or the page contradicts itself" — an assertion rather than an
  argument: both figures are folds over the identical `open` set.

Proven by `test:landing-contract` (23 assertions) + `red:landing-contract` (5/5, incl. the
regression itself: excluding nothing lets the biggest pool lead the grid exactly as it leads the
hero) and directly on the rendered board: the exact-50 control card and a genuinely cold card were
read from the live DOM and shown to differ (`— · No bets yet · No pool yet` vs `50% · YES @ 50% ·
NO @ 50%`) — proving the cold-start law rather than asserting it.

### The header — three tiers, one language control, and what was found building it

Opaque `var(--panel)` at every scroll position (was 92% inline, mixed to 78% + 12px blur ≥1024 —
the see-through bug removed, not tuned). Three nav tiers, one meaning each. ONE 44×44 `EN ⌄`
control at every width via `LanguageMenu`, replacing a 3-pill capsule that was hidden below 640
**and** hidden again across 1024–1279 — the avatar menu carried a duplicate picker to cover the
second gap, and that duplicate is now deleted (one control, never two, per the kit's own rule).

🔴 **Found only by reading a rendered frame, invisible to every gate:**

1. **The guest header rendered TWO `Sign in`/`Sign up` pairs** — `TopAppBar`'s own action tier plus
   `AvatarMenu`'s pre-existing guest fallback, both in the same right-hand cluster. `overflowX` was
   0, no band clipped, no control under the tap floor, no console error — the exact shape of
   batch 2's hero-stated-twice defect. `AvatarMenu` now returns `null` when signed out; the header
   owns auth at every width, `btn-lg` (46px) rather than the removed pair's `btn-sm` (30px, under
   the floor on the two controls a new visitor reaches for first).
2. **The language menu's flyout ran 64px off the left edge at 360 in a guest session** (67% visible
   in English, 79% in Swahili) — the exact §8.7c defect shape recurring in new work. Root cause:
   the panel self-aligned to the trigger's own right edge (`right:0` relative to itself), and at
   360 the trigger is not the rightmost thing in its cluster — `Sign up` sits after it. Fixed by
   measuring on open and flipping to left-anchored whenever right-anchoring would run off-screen,
   rather than guessing a breakpoint that the next thing added to the cluster would re-break.
3. **The step numeral in "How it works" rendered below its rule, not notched into it.** A negative
   `margin-top` on an inline-block did not lift it — the parent's line box still laid out after
   `padding-top`, and baseline alignment absorbed the shift. Fixed with absolute positioning
   (`top: 0; transform: translateY(-50%)`), which is deterministic at any type size.
4. **The brand lockup link was 136×33** — under the 44px floor on the control that returns a
   reader to the board from anywhere in the product. The kit had already specified the fix
   (`min-height: 44px`); it had simply never been applied.

All four found by opening a control or reading a frame; none were visible to `overflowX`,
`test:measure`, or any static gate. `qa:landing-shots` measured 0 clipped / 0 sub-44px controls
throughout — the pattern §8.7c named: a screenshot of a *closed* menu, or a page with no overflow,
looks perfect regardless.

### The rail, the Needle, and a real hydration mismatch

Five destinations (`Markets · Up & Down · Live · Results · More`), `--pill-active` on the pip
(the aqua-literal active pill and 78%-mix backdrop-blur capsule are gone), auth out of the rail
entirely. The Needle/rail collision from the batch-2 baseline frames is fixed at
`[data-needle-keepout]` — an obstacle mechanism `needle.tsx` already read and nothing had ever
supplied; one attribute on `<nav class="kp-rail">`, zero lines of the vendored physics touched.

🔴 **The section-reveal effect produced a real hydration mismatch on 9 of 12 width×locale
combinations.** Its first version was a single shell-level effect that found every `[data-reveal]`
node and set `data-revealed` on it directly — including a `requestAnimationFrame` pass for bands
already in view on load. Both mutations land on nodes the page's streamed bands had not finished
hydrating, and every affected frame logged *"a tree hydrated but some attributes of the server
rendered HTML didn't match the client properties"*, naming `data-revealed` as the extra attribute.
Fixed by moving the reveal into a `<Reveal>` client wrapper that renders the attribute **from
React state**, so the mismatch is unrepresentable rather than merely less likely — the same reason
the header's scroll cast writes a `data-scrolled` flag to `<html>` instead of a class onto the
header element `TopAppBar` owns. Re-verified after the fix: 0 console messages on the same 12
combinations that had failed.

### Three more things a rendered frame settled, that a plausible-looking artifact did not

1. A tall single-element screenshot of the settled strip and of the topic band appeared to show a
   small black "N" badge overlapping a settled row and, separately, the bottom rail's first slot.
   Both are the documented §8.7e-bis artifact: Chromium paints `position:fixed` chrome (the chat
   FAB) at a fixed VIEWPORT-relative offset when a beyond-viewport capture spans more than one
   viewport height, so it appears to repeat "mid-band". Confirmed twice independently — once via
   `elementsFromPoint` at the real scroll position (the settled row's own chip paints on top; the
   FAB is nowhere in that stack) and once via exact rect overlap against the rail (0px² on every
   one of the five slots) — before it was dismissed rather than "fixed".
2. A green underline on a `TZS 0` topic tile looked, at reduced screenshot scale, like the
   cold-start lean-bar rule had been violated. The DOM proved otherwise: `leanPresent: false` on
   both zero-pool tiles (Sports, Culture), `true` with real widths (51%/54%/51%) on the three with
   money. The visual read was wrong; the code was already correct.
3. The two-officer resolution copy in `t.home.howStep2B` was corrected to state the mechanism as it
   actually runs. `requireTwoOfficer` is a config flag and single-admin resolution seals in one
   call — the platform default in every money mode (`market-service.ts:2115` + the recorded
   operator decision). The kit's own wording — *"Two people verify the result… Two officers sign it
   off"* — is a persuasive claim the product does not make by default; the source list (named
   agency, league table, BoT mid-rate) is kept because it is the good and true part of the rewrite,
   and the signature line now reads "An officer signs it off — two, when two-officer authorization
   is enabled."

### The dict's own primer copy was stale before it had its first reader

`first-visit-primer.tsx` never read `t.primer.*` — it carried its own inline `L10n` copy objects,
so the dict's matching keys sat unread and drifted against the capped-fee model. `card3Body`
still said "minus a small margin", and **its Swahili line described a fee-free split with no
commission mentioned at all** — a false statement about money, in the one language most likely to
be read by the audience it targets, one render away from shipping the moment anything pointed at
it. The how-it-works band needed exactly this copy (kit Open Q7: the band and the modal read one
definition). So the dict was corrected to the component's own accurate text FIRST, and only then
was the component — and the new band — wired to read it (§0a: delete the wrong copy, never sync
two). Two more hardcoded trilingual literal blocks in the same file (`Back`/`Next`/`Got it`, the
skip label, the dial's `drag to commit` caption rendering English inside an SVG to every locale)
were pointed at the dict in the same pass, and the private `readLang()` cookie parser — a second
reader of `kp-locale` beside `I18nProvider`'s own — was deleted.

### Re-verified — the OTHER two pages these global components render on

`TopAppBar` and `BottomNav` are shell components; `/markets` (batch 1) and `/results` (batch 1's
§8.7d work) render the rebuilt versions on every load too. Cross-checked directly rather than
assumed: on both routes, at 360 and 1280, in en and sw — `overflowX` 0, exactly one active nav
item (localised correctly: `Masoko`/`Matokeo` in Swahili, not the English word a naive check would
have looked for), exactly 2 auth controls, the discovery/filter rail present, rail visibility
correct for the width, exactly one active rail slot. `test:hero-contract`, `test:discovery-contract`
`test:board-discovery`, `test:product-line` and their three pre-existing RED harnesses (7/7, 7/7,
6/6) are unchanged and green after this batch.

### Gates and verification, in full

33 gates green individually (the 22 design gates + `hero-contract` + `discovery-contract` +
`board-discovery` + `product-line` + `i18n`/`trilingual` + `docs`/`orphans`/`needle` + the two new
gates this batch adds: `ticker-honesty` 59 assertions, `landing-contract` 23 assertions). Five RED
harnesses, all real-defect-per-assertion: `red:ticker-honesty` 13/13, `red:landing-contract` 5/5,
`red:hero-contract` 7/7, `red:discovery-contract` 7/7, `red:board-discovery` 6/6. `tsc` exit 0 / 0
lines. `npm run build` exit 0, 11.5s, the same two pre-existing `node:crypto`-in-Edge warnings.
96 frames read at 360/768/1280/1920 × en/sw/zh with `FULL=1`, 0 failures, 0 console errors. Every
control opened at 9 width×locale combinations (language menu ≥90% visible + direct-child options
+ Escape-closes, rail `More` ≥90% visible, skip link first-Tab), 0 failures. `qa:discovery-probe`,
`qa:discovery-board`, `qa:results-board`, `qa:filter-stress` all exit 0 against the local server
with the new header/rail in place.

## 8.7g · BATCH 4 — the cleanup batch, and the three things it found that were not on its list

**Shipped:** the live RG regression Ali reported, the time-left consolidation, the frozen card's
Details tap target, and §4a's cite-check recorded rather than assumed. The round-2 kit inheritance
is CLOSED: all three commissioned surfaces (hero · `/markets` · landing+header+rail) are applied,
and what remains deferred is enhancement with no commission behind it.

### 🔴 §0 — the RG line duplicated the footer, and the void was 320px, not 192px

Ali, reading the live page: *"this section now feels redundant, find a way to make it better."*
Both halves of that were real, and the batch-4 prompt's own arithmetic understated the second:

- **Duplication, measured:** each of the three RG destinations (`/profile/responsible-gambling`,
  `/legal/responsible-gambling`, `tel:` helpline) appeared **exactly twice on one page — 1 in the
  RG line, 1 in the footer's PLAY SAFE column — at all 12 width×locale combinations.** Counted by
  HREF, not by localised text, because the href is the stable identity across en/sw/zh. Both copies
  were visible in a single 1280 frame.
- **The spacing was worse than the finding said.** The finding named 96 + 48 + 48 = 192px. Measured:
  **144px above the rule and 176px below it — 320px of blank around a 93px strip.** Two sources it
  never counted: `.kp-rg`'s own `margin-top` (48) AND `padding-top` (48), and — the real surprise —
  **`mt-12` on the footer computes to 128px, not 48px.** This project has a CUSTOM spacing scale
  (`tailwind.config.ts:176` → `"12": "128px"`), so reading a Tailwind class as its default-scale
  value is wrong here. ⛔ Do not reason about a spacing class in this repo from the Tailwind docs.

**Fixed:** the three links deleted from `RgLine` (badge + motto stay, so the duty-of-care message
keeps the visibility §5.6 decided on without restating the footer's navigation); `.kp-rg__links` and
`.kp-rg__link` deleted from `globals.css` in the SAME commit, verified beforehand to have exactly one
citer; `.kp-rg`'s `margin-top` removed — the double-count the `--rh-*` comment forbids — and the RG
wrapper's own `paddingBottom`. **After: 96px above the rule, 128px below, both single tokens.**
That lands on the rhythm block's own drawing (`why trusted pad 48 / 96` … `footer → continuous with
the trust surface`), not on an invented number.

⭐ `kp-band--closes` was NOT touched, though it looked like the cleaner fix: `page.tsx:218` (Up &
Down) shares it, so changing it would have silently retuned another band's closing.

⚠️ The residual 216px gap at 360/768 is **correct and not ours**: `<main>` carries
`pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0` so the page cannot end beneath the fixed
`kp-rail` (65px + safe area). 128 (footer) + 88 (rail keepout) = 216. Do not "fix" it.

### 🔴 §4d — there were THREE copies of the time-left formatter, and the plan said two

§8.8 and batch 4's own prompt both recorded two survivors (`/live`, the detail page).
**`app/markets/page.tsx:271` held a third, with the defective plain `Math.floor` — on the busiest
board on the platform.** It went unnamed because `time-left.ts`'s own header listed it among the
four originals, and a reader takes "listed here" for "already dealt with". A doc that names a file
is not evidence the file was changed.

All five callers now delegate. `/live`'s copy was also defective; the detail page's was already
correct, which is precisely why the drift was ever visible — one page disagreed with three.

**A gate now exists, because nothing was watching and that is why three copies drifted:**
`test:time-left` — 34 assertions, 5 consumers checked — asserts BOTH halves, since either alone is
satisfiable by a broken tree: §1 the minute branch never renders zero while open; §2 no file outside
the helper re-expresses the label. §2 carries its own **positive control (2.0)**: a rule shaped
"every file that does X must also do Y" passes vacuously once the set of X becomes empty, and an
i18n key rename would have done exactly that. `red:time-left` **5/5**, each defect on its own
assertion, and case 5 proves 2.0 itself goes red rather than reporting a clean sweep of nothing.

### 🔴 §4e — the Details tap target was fixed, and ACCEPTANCE §11's numbers are stale

Deferred twice on the reading that it belongs to a coordinated frozen-card pass. **Re-measured
today, that reading no longer holds:** `.mcardp-info` is **46px** (already above the floor) and
`.mcardp-actions .btn` is **40px** (at `--tap-min`), so ACCEPTANCE §11's "38px YES/NO, 34px info"
describes a tree that no longer exists — two of the three have already been raised piecemeal, and
`.mcardp-details` at **17px** was the lone outlier at under half the floor.

§11 forbids *redesign*. A hit-area extension changes **no pixel of appearance**, so it is not one:
an absolutely-positioned `::after` grows the target and not the box. `top:-9px; bottom:-14px` →
9 + 17 + 14 = **40px = `--tap-min`**.

⛔ **The upward reach is capped by a NEIGHBOUR, not by taste.** `.mcardp-info` sits 10px above and
opens an explainer rather than the market; swallowing its clicks would have traded one defect for
another. 9px leaves 1px clear.

Proven, not asserted — and this needed a hit test, because **a bounding-box measurement cannot see
this fix at all**: every driver still reports the row at 17px, before AND after, so no existing
instrument could distinguish the fix from its absence.
- `details-hit-test.mjs`: **32 cards** across `/markets` + the landing × 360/768/1280/1920 —
  hit area **40px** on every one, painted height still **17px** on every one, and the info button
  still owned its own centre on **32/32**.
- `card-geometry.mjs` before/after: **IDENTICAL** — card heights `[312,349,356]`, every card's row
  offset, and the document height unchanged at 360/1280/1920 on both boards. `MARKET_CARD_H = 349`
  is safe, which was the whole reason for the deferral.

### What this batch's own instruments got wrong first (three of them)

Same shape as every prior batch: the instruments were wrong before the product was.

1. **A clip that framed the wrong thing.** `boundingBox()` and a non-fullPage `clip` are BOTH
   viewport-relative, and this seam sits above the final scroll position at 360 — so the frame
   captured the sticky header and still looked plausible. Only the 1280 frame was accidentally
   right. Fixed to document coordinates + `fullPage`.
2. **A zero that was correct.** The time-left shoot reported "1 label renders a ZERO count" in
   Swahili. It was `00 SIKU` from the zero-padded **countdown clock**, where padding is the intended
   format. It would have condemned correct code. Worse, the inverse: Swahili renders the label as
   `dakika {n} zimebaki` — **the number in the middle** — so a `(\d+)(unit)` pattern could never
   match the sw label at all. The probe was measuring the countdown in every locale and the label in
   none. Rebuilt on the product's own i18n templates, with a control asserting all 9 templates still
   exist verbatim in `i18n-dict.ts`.
3. **A hit test that probed nothing.** 5 of 8 combinations had no card in the viewport, so it
   measured zero cards — and correctly refused to report a pass. The answer was to scroll each card
   into view, not to shrink the claim.

Plus two in the local harness itself: `stress-bulk-bet`'s `userPrefix` is **truncated to two
characters**, so `b4s0`…`b4s11` all collapse to one pool of synthetic users who then run out of
wallet and have later bets **rejected** — and `poolMath: "PASS"` stays green through that, because it
only proves the delta matches the bets that WERE accepted. `accepted === n` is the assertion that
catches it. And `yesRatio` is **probabilistic** (`Math.random() < yesRatio`), so 0.5 does not split
8 bets 4/4 — it gave 6000/10000. Only the extremes are deterministic, so the 8,000/8,000 control is
built as two one-sided passes.

⚠️ **`resolve-seed-markets` reports `resolved: N` for ATTEMPTS.** It said `resolved: 6` while only
**2 of 6** markets reached `complete` (2 stopped at `bets`, 2 at `stage1`). Assert on the per-market
`state`, never on that number. `objectionWindowHours` must be `0` first, set through the real
`/admin/config` form — and `/admin/*` client-redirects to `/admin/2fa/setup` without
`DISABLE_ADMIN_TOTP=true` at boot, which a `domcontentloaded` read reports as a clean 200 on
`/admin/config` because the redirect has not fired yet.

### §4a · the cite-check: clean, and therefore nothing was archived

Full quoted output in `CLEANUP-MANIFEST.md`'s round-3 section. Two `v3-2026-08-11` references exist
outside `docs/` + `design-brief/` and both are prose (`discovery.ts:4`, `.gitignore:164`); zero
files are tracked under any `.qa-design*` dir; every kit file is under the one filed path (32 files
/ 862,392 bytes). **`F:\50pick-design-archive\2026-08-13-final\` was deliberately NOT created** — an
empty dated archive folder reads to the next session as "a cleanup happened here".

### §4b / §4c · the decisions, taken explicitly

**§4b — all three carried forward, Ali's call on 2026-08-13** (the batch's own guidance: a rushed
build verified at half rigor is a worse outcome than an honest deferral). Reasons restated in §8.8.

**§4c — the filtering boundary: NOT commissioned. Ali's call.** Extending the discovery bar to
`/live`, `/watchlist`, `/leaderboard` or `/fairness` has **no design source** — the kit commissioned
exactly three surfaces. §8.7d's inventory of which surfaces filter stays accurate and stays a
record; it is **not** a licence to close the gaps it names. If this is ever wanted it is its own
commission, or at minimum its own written plan (pin the definitions, resolve the contradictions,
THEN build) — never a paragraph inside a cleanup batch.

### Gates and verification, in full

⭐ **AND SIX CONTRACT GATES WERE NOT IN `predeploy` AT ALL — INCLUDING FIVE FROM BATCHES 2 AND 3.**
`test:discovery-contract`, `test:hero-contract`, `test:board-discovery`, `test:landing-contract`,
`test:ticker-honesty` were written, proven with RED harnesses, recorded in §6 as "green" — and then
nothing in the deploy chain ever ran them. Batch 4's `test:time-left` would have been the sixth.
A gate nothing runs is not a guard; it is a file. All six are verified static (no `localhost`, no
`BASE`, no browser) and are now wired in after `test:chip-contract`: **predeploy 72 → 78 steps, all
78 resolving to a real script** (parsed, the same check PLAN §3 used to find the two ghost steps).
⛔ When you add a contract gate, add it to `predeploy` in the SAME commit.

**40 gates green individually, real exit codes, no pipes** (a piped gate reports `tail`'s status):
the 22 design gates + `hero-contract` · `discovery-contract` · `board-discovery` ·
`landing-contract` · `ticker-honesty` · `product-line` · `i18n` · `trilingual` · `docs` ·
`orphans` · `orphan-actions` · `markets` · `selection-closed` · `grid-paging` · `needle` +
**`time-left` (new)**. RED: `red:time-left` **5/5**. `tsc --noEmit` exit 0.
⚠️ `test:responsive` and `test:motion` are **server-dependent, not static** — they default to
`localhost:3000` and fail with `ECONNREFUSED` on a 3009 harness. `BASE=http://localhost:3009`
→ `test:motion` exit 0 (43 passed). They are not part of PLAN §3's 22.

#### `test:responsive` is RED, and it is PRE-EXISTING — proven against production, not argued

3714 passed · 81 failed · 469 warnings. The 81 are 27 routes × 3 widths of the SAME global-chrome
findings, so they appear on `/` and `/markets` too, and none is on a code path this batch touched.
⭐ **Established by running the identical audit against `https://www.50pick.tz`** — batch-3 code,
without batch 4's changes — which reproduces them exactly. Classified rather than guessed:

| Finding | Verdict |
|---|---|
| `button[KiswahiliSW]` / `button[中文ZH]` at `l-71 r123>vw320` on every route | **INSTRUMENT ARTIFACT.** The language listbox is in the DOM on load and positioned `left:-137px` under a closed trigger; the audit measures its option boxes. `display:flex`/`visible`/`opacity:1` and nothing hides it, so the audit's own test cannot tell — but `elementFromPoint` at each centre returns TICKER elements, i.e. it is painted under, and **a 320px frame shows no dropdown at all**. Batch 3 separately proved the OPEN panel ≥90% visible at 9 width×locale combinations. Not a user-visible defect |
| `a[Sign up] l239 r337>vw320` | **REAL, and visible in the frame** — the anonymous header's Sign up button is cut off. ⚠️ But only at **320px**, and PLAN §5.3 pins mobile verification at **360**, where it does NOT reproduce. Below the supported floor |
| `button[Account menu] l1003 r1043>vw1024` at tabletL | **REAL, signed-in only** (absent anonymously on prod, which is why prod reported 2 failures and local 3). This is the known top-bar 1024–1279px constraint — keep the right cluster minimal |

⛔ None of the three is fixed here: all are GLOBAL HEADER, none is batch 4's, and the header is
exactly the surface that should not be edited as a side effect of a cleanup batch. Recorded so the
next session inherits a classified list instead of a red gate with 81 unexplained lines.

Frames: 12 seam frames read before AND after at 360/768/1280/1920 × en/sw/zh; 12 time-left frames;
3 minute-branch frames; 32 card hit tests. 0 overflow, 0 console errors anywhere.
⚠️ A `fullPage` frame renders the **sticky header at its scroll position, mid-page** — an artifact,
confirmed by a viewport shot plus `elementFromPoint` returning `main` in the gap. Not a defect.

**The minute branch was driven in the real product**, not just unit-tested: a market pulled to 40
seconds from close renders `1m left` / `dakika 1 zimebaki` / `1分钟后` — never `0m left`.

## 8.7h · BATCH 5 — ONE filter language. SHIPPED 2026-08-14, and the scan below was wrong in three places

**What shipped:** one primitive (`src/components/ui/filter-pill.tsx`), consumed by **eight**
player filter rails. Measured after, in a browser, at 4 widths × 3 locales: **516 controls, all
999px, all ≥44px, zero inline styles, zero unselected outlines.**

### 🔴 The scan in this section was measured, and it was still wrong in three places

Every correction came from re-running it rather than reading it — which is the whole argument for
re-measuring before acting on a table someone else wrote, even when that someone was this project.

1. **It listed SIX surfaces. There are EIGHT.** `/profile/activity` and `/profile/account` carry
   filter rails built from the *byte-identical* class string as `/positions`, `/proposals` and
   `/results` — `/profile/activity`'s own comment even reads *"positions idiom"*. They were not a
   variant of the divergence, they **were** the divergence, and a scan that enumerated surfaces by
   walking the routes the brief already suspected could not see them. ⭐ The lesson is the same one
   §5.8 records one level up: a search shaped by the answer you expect returns that answer.
2. **`/positions` does NOT render 32px. It renders 48px.** The table said 32. In source it is
   `h-8`, and on this repo's overridden scale `h-8` is **48px**; in a browser it measured 48 at
   360 and 1280. The only genuinely sub-floor control in the product was `/updown`'s duration rail
   at **40px**. Filing "/positions breaks the tap floor" would have been a defect report about
   nothing.
3. **`/markets` had FIVE inline-styled controls, not 2.** Three pressed chips plus the two
   selected menu OPTIONS, which the table did not count as controls at all.

### What the eight rails looked like, before and after

| | before | after |
|---|---|---|
| control heights | **40 / 44 / 48 / 64px** | 44px |
| radii | 8px on five rails, 999px on one | 999px |
| inline `style` at the call site | every diverging rail — **and `/markets` itself** | none |
| unselected controls outlined | all of them, on five rails | none |
| rails announcing no state to a screen reader | `/results`, `/proposals` | none |

⚠️ **`h-9` is 64px here.** `/updown`'s asset tabs were the worst divergence in the product and
nobody typed "64" — they typed `h-9`, which reads like 36. That is the overridden-scale trap
doing real damage, and it is why the primitive keeps `min-h-[44px]` as an arbitrary value.

### Three things the batch found that were not on its list

- 🔴 **A filter control was wearing the money ink.** `.pchart-range.is-active` — the market-detail
  chart's time-range — painted `var(--gilt)` on `var(--gold-fg)`. Gold is money (Q5); a chart
  window is view state, and `discovery-bar.tsx` had already made this exact call in as many words.
  ⛔ **`test:gold-is-money` could not see it** and was right not to: it is scoped to two IDENTITY
  surfaces on purpose, because money surfaces MUST use those tokens. *A law with a scope is not a
  law with a gate everywhere.*
- 🔴 **The `::after` hit-area technique does not always work, and it lies quietly when it fails.**
  `.pchart-range` painted 24.5px. Batch 4's proven trick — an absolutely-positioned pseudo-element
  that grows the target without moving layout — **measured 36px, not 40**: `up 16 / down 19`,
  stopped above by `div.pt-3` and below by `div.pchart`. A pseudo-element painted outside its
  parent is still subject to **paint order**, and the chart wrapper following it in the DOM took
  the pixels back. It is `min-height: var(--tap-min)` now. ⭐ Nothing but walking real pixels could
  have told a working overlay from a broken one — a bounding box shows neither.
- 🔴 **`/updown/history` had a filter with no control.** `?day=` was reachable only from the daily
  digest's deep link; the page could report the active day and clear it, but never *choose* one. It
  now has a day rail derived from the player's own rounds (`eatDayKey` over rows already in hand,
  **zero extra I/O**), each day carrying a round count proven promise-vs-delivery.

### ✅ ALL EIGHT RAILS VERIFIED ON PRODUCTION — the login gap is CLOSED

**`8 of 8 surfaces reached` on `https://50pick.tz`**, every rail 999px / ≥44px / **0** inline styles
/ **0** unselected outlines — including the four behind a login. The `/updown/history` day rail was
proven promise-vs-delivery on REAL production data (`?day=2026-08-05` promises **6**, delivers
**6**; `?day=lol` falls back to unfiltered with "All days" selected, so the dead end is closed
there too). Plus the earlier public-surface sweep at 4 widths × 3 locales and all four board probes.

⚠️ **It took a credential fix to get here, and the interim state is worth keeping** — for four
hours this batch could only say *"verified on localhost against the identical committed code"* for
`/positions`, `/profile/activity`, `/profile/account` and `/updown/history`. **That is what an
honest report of a blocked verification looks like; it is not the same as verified.** The block and
its diagnosis are below.

🔴 **The reason is not this batch's, and it blocks every live authed driver in the repo.** The QA
player personas will not sign in on production: `login(page, "alpha")` and `"echo"` both land back
on the signed-out shell — the harness's own *"looks exactly like a wrong password"* branch, and its
PhoneInput sync assertion did NOT fire, so the identifier reached the server and was rejected.
⭐ **Confirmed against an instrument that is not mine**: `scripts/live-updown-digest.mjs`, unmodified
and predating this session, fails identically on its first attempt. So this is the credentials or
the accounts, not the filter work and not a new probe.

⛔ **Stopped at three attempts on purpose** (alpha ×2, echo ×1). Login locks an account for 30
minutes after five failures and these are live accounts on a board shared with another operator;
brute-forcing a fourth and fifth would have cost more than it proved.

✅ **DIAGNOSED READ-ONLY INSTEAD, from the live DB — no further attempts spent.** Both personas are
`status ACTIVE` with a `passwordHash`, `lockedUntil NULL`, and `failedLoginCount` **3 and 1 — exactly
this session's own attempts**. `lastLoginAt` is `2026-08-10 23:40` for both, four days before.
So it is **not** a lockout, **not** a suspension, and **not** a missing account: **this laptop's
`.env.qa.local` is stale.** That is the two-laptop credential trap `docs/LIVE-QA-CAMPAIGN.md` §1
already documents, recurring — the full query and table are recorded there.
✅ **RESOLVED THE SAME DAY — Ali authorised a re-mint and it is done.** He was on the OFFICE PC and
the working file was on the HOME laptop, so copying it was not available to him; asked which route
he wanted, he chose *"mint new accounts · u have ful access"*. `ops-remint-qa-passwords.mts` ran
**6/6 re-minted and verified** (read-your-write against the stored hash), it **refused nothing** and
**could not** touch his own console login — `777777777` is absent from its list and it re-reads
`role` off the row and refuses any `ADMIN`. `QA_ADMIN_PASSWORD` and `ADMIN_LOGIN_*` were preserved
byte-for-byte in `.env.qa.local`; the run's stdout was redirected to a scratch file, merged by
key-name only and **deleted**, so no secret reached a transcript or a tracked file.
⚠️ **The cost Ali accepted: the HOME laptop's `.env.qa.local` no longer works** until he copies the
new one across. Recorded in `docs/LIVE-QA-CAMPAIGN.md` §1 with the instant, because the other
machine has no way to detect it except by failing to log in.

`npm run qa:filter-scan -- https://50pick.tz --as=alpha` is the command that closes this the moment
the credentials work; it **exits non-zero** when a requested sign-in fails, so a future run cannot
report "every rail speaks one language" over the four surfaces it never loaded.

### The guards

`test:filter-language` — **66 assertions**, wired into `predeploy`. `red:filter-language` —
**8/8, each defect on its own assertion**, tree restored byte-identical.

⭐ **The eighth RED case is not a product defect.** `vacuity` renames the rail hook so the gate's
subject set goes EMPTY, and proves §0's positive control refuses that. A rule of the form *"every
filter surface must do X"* passes over an empty set, and that is precisely how a third copy of the
time-left formatter lived through two batches under a green gate. If `vacuity` ever returns GREEN,
every case above it proved nothing.

⚠️ **A pre-existing RED harness failure, NOT this batch's and not fixed by it.**
`red:updown-digest` reports 6/7: its `ungate-refunds` anchor names a line in
`src/lib/server/market-service.ts` that stopped existing at **`354bc307` (2026-08-10)**, when
`positionId: p.id` joined the `notifyRefund` call — four days before this session. Proven by
`git show HEAD:…`, and the file is untouched here. Both of *this* batch's anchors in that same
harness (`dead-link`, `raw-param-filter`) went ✓ RED, which is what proves the `/updown/history`
edits kept the guard's contract. ⛔ It is a money-NOTIFICATION proof; repairing its anchor inside a
design batch would be a remedy written in the wrong session, so it is filed rather than patched.

## 8.7i · BATCH 6 — the phone filter sheet, and the chart rail at 44. SHIPPED 2026-08-15

Commissioned by Ali on 2026-08-14 from the deferred register (§8.8): **the mobile filter sheet**
and **the chart's time-range buttons raised 40 → 44px**. Both are done.

### What shipped

| | |
|---|---|
| The sticky bar at 360×780 | **214px → 116px**, measured in **both** Swahili and Chinese. History: 448 wrapped → 214 stacked → 116 behind one button |
| The sheet | `<details>`-driven, so it opens and operates with **no JavaScript** — the property batch 1 protected for a mid-range Android and the one thing this batch was forbidden from regressing |
| Its contents | Odds · Pool · Topic, all `FilterPill` chips, topic on the kit's `1fr 1fr` grid |
| The chart rail | `.pchart-range` `min-height: 44px`, a literal (see below) |
| Guards | `test:filter-language` **66 → 91 assertions**; `red:filter-language` **8/8 → 17/17** |

### 🔴 The first build put SORT in the sheet, and the kit says four times that it must not

The brief and §8.8 both read *"sort and topic render as flat lists inside it"*, so that is what was
built. The design system disagrees in four separate documents — COMPONENTS §21, SPEC's responsive
table, README §discovery and DISCOVERY-RATIONALE — and states a reason:

> **Sort and status stay outside the sheet, in the bar, at every width.** They answer the first two
> questions a punter has and must never cost a tap.

Reading §8.8 precisely, its concern was that sort and topic must not become **nested `<details>`**
inside a scrolling sheet — §8.7c's 4px listbox — *not* that sort should leave the bar. The kit is
followed, and **§8.8 is corrected below rather than left to disagree with it**. `test:filter-language`
§5.20–5.22 now assert the sheet holds exactly odds, pool and topic, and `red:filter-language` case
17 (`sort-in-the-sheet`) reintroduces the drift and is caught. ⭐ Nothing else would have noticed:
the sort-in-the-sheet build passed every gate, every probe and every screenshot.

### 🔴 `position: fixed` was not fixed to the viewport — and no gate could have said so

Measured on the first build at 360×780: the panel reported **`top: -32px`, `bottom: 608px`**. The
grab handle and part of the heading sat above the top of the screen; the sheet floated **172px
clear of the bottom**; and the scrim — `position: fixed; inset: 0` — covered neither end, so a
dialog claiming `aria-modal="true"` left the top bar and the area under the wrapper live and
tappable.

The cause is one line in §1.8: `.route-enter { animation: m-settle-in … both; }`. A `both` fill
**retains the final keyframe's transform for ever**, and a transformed element is the containing
block for every fixed-position descendant. So on **every route**, `bottom: 0` means "the bottom of
the page-transition wrapper".

⭐ **This is why the shared `<Modal>` portals to `document.body`**, and why nothing else in the
product has ever hit it: the sheet is the first fixed element that must live inside page content,
because it must open without JavaScript and a portal cannot.
⛔ **`transform: none` does not fix it** — an animation's applied value beats a normal author
declaration in the cascade. Only dropping the animation returns the base value. That is the fix
that *looks* right and does nothing, so it is `red:filter-language` case 13 (`sheet-captured`).
The rule is scoped to "while a sheet is open": the retained matrix is the IDENTITY by the time a
player can press the trigger, so dropping it is visually a no-op, and neutralising it
unconditionally would delete the entrance every page has.

### 🔴 Three of this batch's own instruments were wrong before the product was

1. **A ratio passed over a visibly broken sheet.** The first assertion was "≥90% of the panel
   visible" and it read **95%** on the layout described above. ⭐ A ratio is not the requirement:
   it now asserts the panel **docks to the window bottom** and that **none of it is above the top**,
   and reports the ratio as detail. *Assert the thing you mean, not a number it can satisfy.*
2. **A flat 300ms timeout reported a keyframe as a layout.** The same 95% first appeared because
   the panel was still mid-`m-sheet-in`. It would have been filed as a 5% clipping defect in the
   product. The driver now awaits `panel.getAnimations()`.
3. **A rect is not visibility, and a closed `<details>` proves it.** A chip inside the CLOSED sheet
   reports `display: flex`, `visibility: visible`, `content-visibility: visible` and a real
   **81×44 box at y=765** — Chrome hides disclosure content through the `::details-content` slot,
   which appears in none of those properties and does not zero the rect. Every bounding-box test
   calls it visible. `qa:filter-scan` uses `checkVisibility()` now, **reports how many controls it
   skipped**, and fails if a rail's controls are *all* hidden.

### 🔴 A CLOSED disclosure keeps a real box — shipped, caught by the audit, fixed in the hour

`test:responsive` (scoped to `/markets`) reported **`button[Close filters] l363 r427 > vw390`** and
the same for `Show N markets`, at **six widths**. The sheet was SHUT in every one of them.

Chrome hides `<details>` content through the `::details-content` slot, so the descendants keep
layout — the same fact that made a bounding-box visibility test lie (instrument 3 above). While
the sheet is shut the `.route-enter` neutralisation does **not** apply, so the panel's
`left: 0; right: 0` resolved against the page wrapper rather than the window, and the phantom
panel hung past the right edge of the viewport. Invisible to the eye; a real horizontal-overflow
finding on the audit that exists to catch exactly that.
`.kp-fsheet:not([open]) > …{ display: none }` now makes a shut sheet lay out nothing.
Guarded at §5.23, `red` case `closed-sheet-lays-out`.

⚠️ **And fixing it broke a guard's locator, which the RED harness caught immediately.** §5.15 read
`/\.kp-fsheet-panel\s*\{/`; the new rule's selector *ends* with that class, so the gate began
inspecting `display: none` instead of the panel definition and the `panel-scrolls` mutation walked
straight past it — 16/17. The locator is anchored to the start of a line now. ⭐ This is §5b rule 7
in miniature: **a check and its own proof agreeing with each other about the wrong subject**, and
the only reason it surfaced in minutes is that every assertion has a mutation that must fail on it.

Plus a fourth, found because seeding six markets locally made it fire for the first time:
`qa:discovery-board`'s `?page=2` case expected an **empty** grid, while `markets/page.tsx:233`
deliberately clamps (`safePage = Math.min(pageNum, totalPages)`), the same "a hand-edited URL still
renders a board" contract `qa:discovery-probe` asserts for junk params. It had been green only for
as long as production held more than one page.

### Two judgements this batch made, stated rather than left silent

1. **The sheet appears below `lg` (1024), not only at phone width.** The kit's responsive table
   says *"768 | both rows wrap to 3–4 lines | no sheet"*. This surface has used `lg` as its one
   breakpoint since batch 1 (the strips, the `lg:contents` dissolves), and the 768 wrap was never
   built — it would be the same 3-row sticky bar the batch exists to remove. The sheet is a strict
   improvement at 768 and keeps the surface on ONE breakpoint instead of two.
2. 🔴 **And reading the 768 frame is what caught the cost of it.** The topic grid was a literal
   `grid-cols-2`, which at 768 meant two ~380px cells — a pill stretched to fill one stops looking
   like a pill and reads as a button bar. It is
   `grid-cols-[repeat(auto-fill,minmax(148px,1fr))]` now, which is the kit's `1fr 1fr` at the
   390px it was drawn for and four columns at 768, with the pills sized to their labels
   (`justify-self-start`) rather than to the cell. ⛔ No gate saw this: every control was 44px,
   999px, un-outlined and inside its box. **It was obvious in a frame and invisible to all of them.**

### 🔴 "The board works with no JavaScript" was false, and it was the reason for batch 1's trade

`discovery-bar.tsx` and `menu-shell.tsx` have both said since batch 1 that the board works with
JavaScript disabled, and §8.8 records that as the reason the scrolling strips were chosen **over**
this very sheet. Nobody had measured it.

Measured 2026-08-15 with scripts disabled, **on production as well as locally**: `/markets`
streams its board through a Suspense boundary, and React only relocates streamed content out of
its hidden holder with an inline `<script>`. With scripts off that never runs, so
`.kp-discovery-bar` measures **0px tall inside a `display: none` `div#S:3`**, with the cards
sitting in `<template>` elements. **Nothing on the board is reachable** — the strips no more than
the sheet.

⭐ So the sheet costs nothing that was not already gone, and batch 1's trade rested on a premise
that does not hold. The native markup is still the right build — it is what would make the page
recoverable if the streaming ever changed — but it is a different claim from "it works", and all
three files now say the measured thing instead. `qa:discovery-board` asserts the MARKUP is native
(a real `<details>`, every control a real `<a href>`) and **prints** what a scripts-off browser
actually sees, so this cannot go quiet again.

⬜ **Not fixed here, deliberately.** Making the board render without scripts is a page-architecture
change (the Suspense boundary and the streaming strategy), not a filter change, and it was not
commissioned. It is recorded rather than half-attempted.

### The chart rail at 44

`min-height: 44px` as a **literal**, deliberately: `--tap-min` is 40 and would silently undo the
ruling, and there is no `--h-control-*` rung at 44 (`--h-input: 44px` is named for inputs, and
borrowing it for a chart button would be a second meaning for one name). `test:filter-language`
§4.3 asserts 44 and §4.4 asserts it is **not** reached through `--tap-min`; `red` case 15
reintroduces exactly that reversal.

⚠️ **Verified on production after the deploy, not before it.** The chart is behind a collapsed
disclosure and only renders when the market has price history, which a locally seeded board does
not have — so `qa:tap-hit` was extended to open the panel and walk `elementFromPoint`, and it
**failed against production at 40/41px before the deploy**, which is the proof it can tell 40 from
44 at all.

## 8.7h-bis · The original scan, as written 2026-08-14 (kept for the corrections above)

**Ali, reading the live platform:** *"filtering is not designed properly, markets has a different
filter design than up and down. This is not acceptable in a consistent professional platform...
put all efforts, make them consistent and perfect and aesthetic, based on our newest design
patterns."* ⛔ A6 / admin 2FA is **PARKED** at his instruction, not dropped.

**Six player surfaces filter; `/markets` is the reference by law; five diverge.** Measured against
production with `borderRadius` / height / font-size / presence of an inline `style` on the real
rendered control:

| Surface | Control | Shape | Height | Inline style |
|---|---|---|---|---|
| `/markets` | status · sort · odds · pool · topic · search | **pill `999px`** | **44px** | 2 controls |
| `/results` | category rail | `8px` | 48px | yes |
| `/updown` | asset tabs | `8px` | 44 / 64px | **all** |
| `/updown` | duration tabs | `8px` | **40px** | **all** |
| `/positions` | 3 tabs | `8px` | **32px** | yes |
| `/proposals` | hot · new · listed · mine | `8px` | 48px | yes |
| `/updown/history` | day indicator + "All days" | `chip` + `btn-sm` | — | — |

⭐ **Out of scope, and for a reason that survives scrutiny:** `/leaderboard` + `/fairness` are
**pagination-only** and already share `Pagination`; `/live` + `/watchlist` have **no `searchParams`
at all**. There is no filtering on them to make consistent, and adding some would be a new feature.

**Three defects, in increasing order of importance:**
1. **Shape** — five surfaces use `rounded-md` (8px) against the pill (999px).
2. **Tap floor** — `/positions` renders **32px**, `/updown` durations **40px**; `/markets` holds 44.
3. **Inline styles** — every diverging surface writes `style={{ background, border, color }}` at the
   call site (B9/B10 law 82). ⚠️ **`/markets` breaks this too** — its pressed chip carries an inline
   `background` + `boxShadow` — so extracting the primitive must fix the reference, not copy it.

🔴 **And the one that is not cosmetic.** `discovery-bar.tsx` §COMPONENTS 3: *only the SELECTED chip
carries an outline; an unselected chip is text on transparent* — because *"fifteen outlined capsules
in one bar was the single biggest source of the 'chunky' criticism the round-2 brief was
answering."* **Every diverging surface outlines EVERY control.** They do not merely look different;
they contradict the reasoning the current design exists to embody.

**The plan** is in `00-NEXT-SESSION-PROMPT.md`: extract ONE `FilterPill` primitive (fixing
`/markets`' own law-82 breach in the process), convert the five, guard it with
`test:filter-language` + a RED proof carrying a vacuity control, and prove the **counts did not
move** — `qa:discovery-probe` / `qa:results-board` / `qa:filter-stress` stay green against
production, because promise == delivery is money-adjacent and this batch is cosmetic.
⚠️ `/updown`'s tabs are a `startTransition` filter that deliberately keeps the live board on screen
while it streams; plain `<Link>`s used to blank a live board mid-countdown. Preserve that.

## 8.8b · 🔴 THE BUILD CAN FAIL ON RAILWAY FOR A REASON THAT IS NOT IN THE CODE

**Twice on 2026-08-13, and once BEFORE this session's first commit.** A Railway build can die
with 18 errors that all read:

```
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [next]/internal/font/google/jetbrains_mono_65a12ad3.module.css
```

⛔ **That is NOT a code error, and chasing it in `src/` wastes the session.** Scroll UP in the
build log to the warnings above it:

```
Received response with status 404 when requesting
https://fonts.gstatic.com/s/jetbrainsmono/v24/…woff2
```

`next/font/google` fetches the actual font files from **`fonts.gstatic.com` at build time**.
When Google's CDN 404s them, Turbopack cannot materialise the generated font CSS module and the
build fails. It is a transient external dependency.

**The evidence it is environmental, not ours:**

| Deployment | Commit | Font that 404'd | |
|---|---|---|---|
| `118f32ec` 2026-08-12 19:44 | `5bfd95fa` — **before this session touched anything** | **Inter** | FAILED |
| `bab41877` 2026-08-13 00:15 | `4ebad091` | — | SUCCESS |
| `00c6eaa5` 2026-08-13 05:43 | `628565ec` — docs + QA scripts only | **JetBrains Mono** | FAILED |

The same commit that failed on Railway built **locally, exit 0, "Compiled successfully"**.

**What to do:** re-push (any commit re-triggers the git build) — it is transient and usually
passes on the next attempt. ⛔ Do **not** use the Railway MCP `deploy` tool to retry: it uploads
a tarball of the local directory, which breaks the git↔deploy linkage and can ship gitignored
files.

⭐ **THE REAL FIX, NOT YET DONE — it needs Ali's sign-off because it touches every page's
type.** Self-host the three families with `next/font/local` instead of `next/font/google`
(`src/app/layout.tsx` loads Sora, Inter and JetBrains Mono). That removes Google's CDN from the
build path entirely. It is a typography-wide change on a licensed live product, so it is
recorded here rather than slipped into a design batch. Until then, expect this to recur.

## 8.9 · The instruments this work leaves behind (tracked, so they travel)

⚠️ They were written in `.qa-design-round2/`, which is **gitignored** — so they would have died
with the machine. They are real QA instruments, they run read-only against **local or
production**, and they are now registered npm scripts:

| Command | What it proves |
|---|---|
| `npm run qa:discovery-probe -- https://50pick.tz` | every control's promised count equals what pressing it delivers, incl. cross-filtering · URL hygiene · sorting reorders · empty-state exits are non-empty |
| `npm run qa:discovery-board -- https://50pick.tz` | the GRID draws a page of that set — counted in a real browser DOM, because response byte order ≠ DOM order under streaming · the mobile bar height in **real** sw and zh · and ⭐ that **every menu actually OPENS** (≥90% of its panel visible at 360), the check §8.7c's defect proved was missing |
| `npm run qa:filter-scan -- https://50pick.tz` | ⭐ batch 5. Every player filter rail, measured in a real browser: computed radius, painted height, font-size, the presence of an inline `style`, and whether an UNSELECTED control is outlined — per surface, per width, per locale. Colours go through a 1×1 canvas, never a regex (this system's tokens are `oklch()`). Rails are addressed by the `data-filter-rail` hook, never by shape — the first version reached for `nav[aria-label] a[href^="/positions"]` and measured a **bottom-nav link**. `--shots=<dir>` captures a frame per rail and OPENS every `<details>` menu. Ends with the `/updown/history` day rail's promise-vs-delivery, which SKIPS loudly (never passes) when no authed Up & Down history exists |
| `npm run qa:results-board -- https://50pick.tz` | /results' category rail: promise == delivery per category, with and without a search; a search may only narrow; a no-match query zeroes every count; a zero-count category offers a real exit. Its RED proof is `red:results-filter` — ⛔ running it against production reds for the WRONG reason (no `data-chip` there yet) |
| `npm run qa:filter-stress -- https://50pick.tz` | 12 hostile payload classes × every param of both boards (no 500, nothing executes) · **all 288** status×sort×odds×pool combinations keep promise == delivery · the same URL twice gives the same board |
| `LOCALES=en,sw,zh npm run qa:discovery-shots -- .qa-design-round2/after` | 360 + 1280 × en/sw/zh, failing on any horizontal overflow. ⚠️ Shots are EVIDENCE — write them under `.qa-design-*/`, never into the tree (§0b) |

**Batch 4 added four more, promoted out of the gitignored scratch for the same reason** — they were
written in `.qa-design-round4/` and would have died with the machine:

| Command | What it proves |
|---|---|
| `LOCALES=en,sw,zh npm run qa:landing-seam -- <dir> [url]` | The RG↔footer seam: that each of the three RG destinations appears **exactly once** on the page (counted by HREF, so it survives translation), and the real geometry of the four spacing sources that meet there. This is the guard against batch 4's own regression returning |
| `npm run qa:tap-hit -- [url]` | ⭐ **The only instrument here that can see a hit area.** `.mcardp-details` measures 17px before AND after its `::after` extension, so every bounding-box driver reports it unchanged. This probes real coordinates with `elementFromPoint`, asserts the target reaches `--tap-min`, that the PAINTED height has not moved, and that the neighbouring info button still owns its own centre |
| `npm run qa:card-geometry -- <before\|after> [url]` | Card heights, every card's row offset and the document height at 360/1280/1920 on `/markets` + the landing, written to JSON and **diffed against its counterpart**. Run it either side of any card change to prove `MARKET_CARD_H` did not move |
| `npm run qa:board-bootstrap` | Local only. The whole in-memory harness in one reproducible sequence: seed → `objectionWindowHours=0` through the REAL admin form → a varied funded spread with a cold tail preserved → a control market at **exactly 8,000/8,000** → settle. Every step reads its result BACK; it took three restarts to get right, and its comments carry the four harness traps that caused them |

⛔ Screenshots stay gitignored. The *drivers* travel; the *evidence* is re-derived.

**Two shared modules the drivers now depend on — read them before writing another driver:**

| Module | The rule it owns, once |
|---|---|
| `scripts/qa-locale.mjs` | `kp-locale` is the ONLY cookie that changes the product's language, and `assertLang` reads `<html lang>` back and throws on a mismatch. Two drivers set a cookie the product never read and produced English frames labelled sw/zh (§8.7c) |
| `scripts/red-anchor.mjs` | A RED harness's string anchors are matched in the FILE's line-ending convention, and an anchor that matches twice is refused. A `\n` anchor cannot match a CRLF checkout, which made a harness call the product unprovable (§8.7c) |

**Local harness scratch** (`.qa-design-round2/`, gitignored under `.qa-design-*/`):
in-memory dev server on `:3009` (no `DATABASE_URL` exists on this machine — verified — so a local
boot cannot reach production), seeded via `/api/dev-test/seed-real-markets` +
`/api/dev-test/seed-markets` → **46 live markets**, enough for 4 pages at 12/page.
⚠️ A dev server booted while `prisma generate` was running served **404 on every `/api/*` route**
while rendering pages normally; a clean restart fixed it. Not a product defect — do not chase it.
