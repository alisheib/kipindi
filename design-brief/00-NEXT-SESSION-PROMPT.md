# NEXT SESSION — BATCH 4: cleanup, the deferred trio, and handoff

**Paste this whole file as your opening prompt.**

**Batches 1, 2 and 3 are DONE, LIVE and VERIFIED on production** at commit `6f97911e`
(2026-08-13). `/markets`, `/results`, the hero and the full landing composition + header + rail
are shipped. This session closes out the round-2 kit inheritance: cite-check the delivery,
archive what is no longer needed on disk, decide the three deliberately-deferred kit pieces
(§8.8), and hand the design-brief folder back to its steady state (three tracked files).

---

## ⛔ THE BAR — Ali, verbatim, unchanged

> *"perfectly working, no glitches, 100% functional, no workarounds, clean code"* ·
> *"no half work accepted. only full work"* · *"visually perfect and data perfect and ready for
> live manipulation instinctively"* · *"you should perfectly finish, tested, validated,
> re-validated and re-analysed, then we push"*

**You act as ALL SEVEN engineers on every change** (architect/visual/UI-UX/colour-design/
responsiveness/routing/manipulation-stress/STRICT-compliance — the table is in the batch-3
prompt's history if you need the full wording; the short form is `.claude/skills/50pick-standards/
SKILL.md` §1). A change is not done until all seven sign off.

### The five rules that override convenience (unchanged, re-earned every batch)

1. **VERIFIED MEANS EXECUTED.** Run it, quote the output.
2. **ASK OF EVERY CHECK: would this still pass if the feature were absent? Would it fail even if
   the product were fine?** Batch 3 found and fixed a real hydration mismatch, a duplicate
   auth pair, and a language-menu panel running 64px off-screen — all invisible to `overflowX`,
   all found by opening a control or reading a frame.
3. **A DEFECT CAN BE INVISIBLE TO EVERY GATE AND OBVIOUS IN A FRAME.** Read every screenshot.
4. **NEVER `git add -A`.** Stage by explicit path. `git branch --show-current` first, `git fetch`
   before every batch. Every push to `main` is a LIVE deploy.
5. **DOCS TRAVEL WITH THE CODE, IN THE SAME COMMIT.** `PLAN-OF-RECORD.md` §6 batch log + §8
   section. No new tracker files — this is a cleanup batch, it should shrink the file count.

---

## ▶ START HERE

1. `cd F:\kipindi-main` · `git fetch origin` · `git status` — expect **`main`, clean** at or
   past `6f97911e`.
   ⚠️ One untracked file is **not yours**: `scripts/live/ops/house-money-census.cjs`. Never stage
   it — three sessions in a row have now independently confirmed this.
2. `npm install` is **not** normally needed — check first: if `package-lock.json` and
   `node_modules/.package-lock.json` share a timestamp, the tree matches the lockfile.
3. `.env.qa.local` **exists on this machine** and holds the five QA operator passwords. Gitignored,
   does not travel. ⛔ Never `git clean -x` — it takes that file.
4. There is **no `.env`**, and there must not be: no `DATABASE_URL` → in-memory store, zero-risk
   local work.

**Boot + seed** (in-memory, wiped on every restart):

```
$env:SESSION_SECRET='qa_local_session_secret_at_least_32_chars_long'
$env:OTP_PEPPER='qa_local_otp_pepper_16plus'
npx next dev -p 3009
curl -s -X POST http://localhost:3009/api/dev-test/seed-real-markets
curl -s -X POST http://localhost:3009/api/dev-test/seed-markets
curl -s -X POST http://localhost:3009/api/dev-test/resolve-seed-markets
```

⭐ **The store starts with EVERY market at pool 0.** Batch 3's own session had to fund the board
with a deliberately varied spread (`stress-bulk-bet`, in-memory only) before the hero/board/ticker/
settled-strip were exercised on anything but the cold path — and separately built ONE market at
**exactly** 8,000/8,000 (a REAL 50%) to prove it renders distinctly from a genuinely empty market
(an em-dash + "No bets yet"), never both as "50%". Repeat that discipline; it is the only thing
that proves the cold-start law rather than asserting it. `objectionWindowHours` must be set to `0`
via `/admin/config` (real form, `seed-admin` first) before `resolve-seed-markets` will produce
genuinely **settled** rows (not merely adjudicated ones) — the settlement timer needs a window of
zero to fire immediately.

## The instruments — run read-only against local OR production

| Command | What it proves |
|---|---|
| `npm run qa:landing-shots -- <dir> <url>` | the landing: per-band clips, overflow, tap targets, clipping. `LOCALES=en,sw,zh` · `BANDS=hero,how,board,updown,trust,rg` · `FULL=1` whole-page · `AUTH=demo` signed-in |
| `npm run qa:discovery-probe -- <url>` · `qa:discovery-board -- <url>` · `qa:results-board -- <url>` · `qa:filter-stress -- <url>` | `/markets` + `/results` — unchanged by batch 3, re-verified green against the new header/rail in the same session |
| `npm run test:hero-contract` / `red:hero-contract` · `test:discovery-contract` / `red:discovery-contract` · `test:board-discovery` / `red:board-discovery` | 7/7, 7/7, 6/6 — unchanged |
| `npm run test:ticker-honesty` / `red:ticker-honesty` | **NEW, batch 3.** 59 assertions, 13/13 real-defect-per-assertion RED proof. The ticker is REAL settlements only — read `src/lib/markets/ticker.ts`'s header before touching it |
| `npm run test:landing-contract` / `red:landing-contract` | **NEW, batch 3.** 23 assertions, 5/5 RED proof. Proves the grid excludes the hero's own ids (the batch-2 repetition, now impossible by construction) and that topic tiles reconcile to the hero |

⛔ **Screenshots are EVIDENCE: write them under `.qa-design-*/` (gitignored), never into the tree.**

**Shared modules — read before writing any driver:** `scripts/qa-locale.mjs` (the `kp-locale`
cookie + `assertLang`; also now forwards `reducedMotion` to the Playwright context — it used to
silently drop it, which made a ticker probe measure a running marquee and misreport a clip that
did not exist at rest) · `scripts/red-anchor.mjs` (CRLF-safe anchor matching) ·
`src/lib/markets/discovery.ts` (the ONE `/markets` contract) · `src/lib/markets/landing.ts` (the
landing's own grid-lens + topic-reconciliation logic) · `src/lib/markets/ticker.ts` (the ticker's
five honesty rules, pure).

## Read, in order, before touching anything

1. `CLAUDE.md` — mechanics + the ACTIVE-WORK banner.
2. `.claude/skills/50pick-standards/SKILL.md` — the always-on standards.
3. `docs/DESIGN_AUTHORITY.md` §0 (filing law) and the cold-start item — **now FIVE consumers**
   (batch 3 added the topic-tile lean underline; read why before adding a sixth).
4. **`design-brief/PLAN-OF-RECORD.md` §8 — THE PLAN.** §8.7f is batch 3's full account: every
   defect found, how each was caught, and why. Read it before assuming anything about the
   header/rail/landing is still exactly as the kit drew it — four real defects were found and
   fixed only by opening a control or reading a frame, and the fixes are recorded there with the
   reasoning, not just the diff.
5. `docs/design-system/v3-2026-08-11-landing-discovery/ACCEPTANCE.md` — INHERIT/IGNORE per file.
6. `docs/design-brief/handover-2026-08/LAWS.md` — 85 invariants + the 4 licence conditions.

---

## WHAT IS ALREADY SETTLED — do not re-derive, do not re-open

Everything in the batch-3 prompt's equivalent section still holds (`Open`/`All` definitions,
`pricedYesPct` as the one cold-start rule, `TippingBar`'s `empty` state, `MarketCard`'s `featured`,
the `--rh-*` rhythm tokens, `.kp-hero*` pattern). Additions from batch 3:

- **The ticker is REAL settlements, and the rule set is closed.** Settlements only (never a
  bet — PDPA), a row needs `settledAt` (not merely `RESOLVED`), ordered `settledAt` DESC, a VOID
  carries no figure, the outcome is read never inferred. `getPlatformStats` runs the ONE unbounded
  resolved-market scan behind a 60s memo; the ticker consumes its `recentSettlements`, never its
  own query. Do not give the ticker a second data source.
- **The landing grid is disjoint from the hero by construction**, not by an offset you have to
  remember. `landingGrid(rows, nowMs, { lens, excludeIds })` — if you add a new consumer of the
  board that also draws from the open set, pass the hero's ids through the same parameter rather
  than re-deriving the exclusion.
- **The header has exactly ONE language control and ONE auth pair, at every width, always.**
  `AvatarMenu` returns `null` when signed out — the header owns auth. If a future change needs
  auth reachable from a menu again, that is a NEW decision, not a revert; the duplicate that
  existed for about an hour of batch 3 was found by reading a rendered frame, not by any gate.
- **The bottom rail carries `data-needle-keepout`.** The obstacle mechanism was already read by
  `needle.tsx` and had zero consumers before batch 3. If a new fixed element is added to global
  chrome (another FAB, another docked panel), give it the same attribute rather than discovering
  the collision in a screenshot again.
- **Section reveal is a `<Reveal>` client component that renders `data-revealed` from React
  state.** A shell-level effect that mutates that attribute directly on `[data-reveal]` nodes
  WILL produce a hydration mismatch on streamed bands — this was measured, not theorised, on 9 of
  12 width×locale combinations in this session's own first attempt.
- **`test:keyframes` rule 1.1 is not decorative.** A second `@keyframes kp-rise` was written
  during batch 3 with a different offset than the existing one at `globals.css:2792`, and the
  gate caught it before it could silently retune the leaderboard podium and the `/live` pulse
  grid, which both already consume `.kp-rise`. Reuse an existing keyframe; do not assume a
  new name is safe just because you invented it for a different call site.

---

## BATCH 4 — the work, in the order it should be done

### 4a · Cite-check → archive → delete the round-2 kit's working copies

The kit at `docs/design-system/v3-2026-08-11-landing-discovery/` has now been fully applied
(hero, `/markets`, landing + header + rail — all three commissioned surfaces). Confirm nothing in
`src/` still needs to reference the kit's own files (`layouts/*.html`, the prototype, the LOCKED
token copy) — a repo-wide grep for `v3-2026-08-11` outside `docs/` and `design-brief/` should
return nothing. If clean, this is the point where DESIGN_AUTHORITY §0b's own rule applies: the
kit stays filed at `docs/design-system/v3-.../` as the delivered record (never deleted — it is
provenance, not scratch), but any duplicate or working copy that accumulated OUTSIDE that one
filed location during the three batches (check `.qa-design-round2/`, `.qa-design-round3/` for
anything that was accidentally written into a tracked path instead of the gitignored scratch
directory) gets archived to `F:\50pick-design-archive\2026-08-13-final\` with **verified counts
and bytes, quoted** — the same standard §1a's archive used — then deleted from the tree.

### 4b · The three deliberately-deferred kit pieces (§8.8) — decide, don't leave floating

| Deferred | What it needs | The decision this session makes |
|---|---|---|
| **Density toggle / compact list** (kit §3e) | A `MarketListRow` component + its own responsive column table (`role="table"`/`row`/`cell`, 7 columns, individual hide points) | Build it, or carry it forward with the reason unchanged. If building: it is a NEW component, not a restyle of `MarketCard` — a toggle that only restyles the existing cards is a false promise the label makes |
| **The mobile filter sheet** (kit `05-markets-discovery-mobile.html`) | A `<details>`-driven bottom sheet with a scrim, sort/topic as FLAT LISTS inside it (never nested `<details>` menus — that would clip exactly like §8.7c's defect) | Build it, or carry forward. The scrolling-strip alternative chosen in batch 1 is documented as "the right trade for a defect fix, the wrong end state" — this is where that debt gets paid or explicitly re-carried |
| **Search typeahead** (kit §3g) | A client combobox over the existing parser; suggestion kinds per COMPONENTS §8 | Build it, or carry forward. `SearchBox` already delivers correct debounced search without it — this is a pure enhancement, not a gap |

Each of the three needs an explicit call in this batch: built-and-verified, or carried forward with
the reason restated (not silently dropped — that is the standard every other deferred item in this
plan has met).

### 4c · The filtering-inventory boundary, named for Ali — not this session's to decide alone

Batch 3 re-verified `PLAN-OF-RECORD.md` §8.7d's inventory of every player surface that filters and
corrected two inaccuracies (`/positions` has 3 tabs not 4; `/updown/history` has a real day-window
filter). It also drew an explicit line: extending the round-2 discovery bar to `/live`,
`/watchlist`, `/leaderboard` or `/fairness` has **no design source** — the kit commission covers
exactly three surfaces, and building filter UI for four more pages with no delivered spec would be
a new, uncommissioned design decision made ad hoc at the call site, which is precisely what
DESIGN_AUTHORITY §0b exists to prevent. **Ask Ali before starting any of this** — do not treat "the
inventory is accurate now" as license to also close the gaps it names. If he wants it, it is its
own commission or at minimum its own written plan (§8's own process: pin the definitions, resolve
the contradictions, THEN build), not a paragraph inside a cleanup batch.

### 4d · The time-left formatter's two remaining copies (named since batch 2, still open)

`live/page.tsx:44` and `markets/[id]/page.tsx:800` still hold their own copies of the time-left
logic; `src/lib/markets/time-left.ts` is the shared, correct version (`Math.max(1, …)` — "0m left"
says the door is shut when it is open). Point both at the shared helper and shoot `/live` + a
market detail page at 360/1280 × en/sw/zh in the same batch — changing displayed text on a page
nobody is screenshooting is how a cleanup ships a regression, so the shoot is not optional.

### 4e · `a.mcardp-details` at 17px (named since batch 2, still open)

The frozen card's "Details" link is a 17px tap target on every board. Not fixed in batches 2/3
because `globals.css:3194` makes that row a constant one-line height so the card never changes
height between boards, and `MARKET_CARD_H` depends on it. The `::after` hit-area extension
(negative margins + `min-height: 44px` on the pseudo-element) reaches the floor without moving
layout — implement it, or carry forward again with the reason restated.

### 4f · Final documentation pass

Update `docs/NEXT-PLAN.md` + `PLAN-OF-RECORD.md` §6's batch log with batch 4's outcome. Update
`design-brief/CLEANUP-MANIFEST.md` with whatever 4a archived. Replace this file with whatever
comes next — if the round-2 kit inheritance is genuinely complete and nothing is deferred, that
next file is `docs/NEXT-PLAN.md`'s own "PICK UP HERE", not a new numbered prompt; **verify
`design-brief/` holds exactly the files it should, with a quoted listing**, same as every prior
batch's closing step.

## DEFINITION OF DONE

- Every one of §4a–4e's items has an explicit outcome recorded (built + verified, or carried
  forward with its reason intact) — none silently dropped.
- `git fetch` shows no surprise commits; `git branch --show-current` is `main`; every push
  verified live (HTTP 200, clean `railway logs`, a live screenshot actually read).
- All gates from batch 3 (33 + the 2 new ones) still green; any NEW gate this batch adds has its
  own RED proof, each defect caught on its own assertion, same discipline as `ticker-honesty` and
  `landing-contract`.
- Docs updated in the SAME commit as the code they describe.
