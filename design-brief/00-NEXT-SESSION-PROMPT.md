⛔ **FIRST, ASK ALI WHICH PERMISSION MODE APPLIES.** The previous prompt opened with *"take atomic
permission before anything"*. Ali **superseded that mid-session (2026-08-13)** with *"accept all"*
and *"ur the developer of kipindi do watever"*, and then *"proceed, don't come back until whole dev
complete and perfect and pushed and tested"*. So the last standing instruction was **full autonomy
including pushes to `main`**. That grant was for that session. Ask one question at the start —
*"atomic permission again, or autonomous like last session?"* — and then obey the answer. Do not
assume either.

# NEXT SESSION — BATCH 3: the landing composition · header · rail · and the ONE honesty fix

**Paste this whole file as your opening prompt.**

**Batches 1 and 2 are DONE, LIVE and RE-VALIDATED.** `/markets`, `/results` and the **hero** are
shipped and verified on production. This session builds everything else on the landing page, and
fixes the one remaining place where the product states something that never happened.

---

## ⛔ THE BAR — Ali, 2026-08-13, verbatim

> *"perfectly working, no glitches, 100% functional, no workarounds, clean code"* ·
> *"no half work accepted. only full work"* · *"visually perfect and data perfect and ready for
> live manipulation instinctively"* · *"colours perfect, design complete"* ·
> *"perfect fitting, perfect rendering, perfect everything — technically, visually — every bit,
> every colour, every design"* · *"you should perfectly finish, tested, validated, re-validated
> and re-analysed, then we push"*

**You act as ALL SEVEN engineers on every change and you say what each one found.** A change is not
done until all seven sign off; if one cannot, say so plainly instead of shipping.

| Role | Its question | Its evidence — nothing else counts |
|---|---|---|
| **Visual engineer** | Does the rendered pixel surface read correctly? | Frames at **360 · 768 · 1280 · 1920** × **en · sw · zh**, and you **OPEN AND READ EVERY ONE**. ⭐ **AND AT LEAST ONE WHOLE-PAGE FRAME PER WIDTH** (`FULL=1`) — see trap 1 |
| **UI/UX engineer** | Can a player drive it instinctively, first try? | Every control **opened and pressed**. Active state, hover, focus-visible, a visible cue that a strip scrolls. Nothing truncated mid-word, nothing colliding |
| **Colour / design engineer** | Is every colour the system's own, and legal? | Tokens only. `test:contrast` · `test:bridge` · `test:tokens` · `test:design-frozen` green. ⛔ **GOLD IS MONEY AND NOTHING ELSE**, and only money that was **earned** — `test:gold-is-money` |
| **Responsiveness engineer** | Does it fit, in every language, on the cheapest phone? | `overflowX === 0` at 4 widths × 3 locales. Tap targets **≥ 44px**. **Measure, never eyeball** — Swahili short labels run 1.74× p90 / 2.25× p95 vs English |
| **Routing engineer** | Are URL, history and deep links honest? | Defaults omitted · a filter uses `replace` · a hand-typed URL renders · junk params fall back · no 500 from any input |
| **Manipulation stress engineer** | What happens when it is abused? | `npm run qa:filter-stress` — 12 hostile payload classes × every param, plus **all 288** axis combinations |
| **STRICT compliance engineer** | Would this survive a regulator reading it? | **A-5: real data or nothing.** No fabricated figure, ever. Licence/RG copy untouched. `test:integrity` green |

### The five rules that override convenience

1. **VERIFIED MEANS EXECUTED.** Run it, quote the output. A grep is not a behaviour; a green gate is
   not proof; "it should work" is not a result.
2. **ASK OF EVERY CHECK: would this still pass if the feature were absent?** And its mirror: **would
   it fail even if the product were fine?** Both have happened here, repeatedly.
3. **A DEFECT CAN BE INVISIBLE TO EVERY GATE AND OBVIOUS IN A FRAME.** Batch 2 shipped a hero that
   stated its lead market twice. 30 gates were green over it.
4. **NEVER `git add -A`.** Stage by explicit path. `git branch --show-current` first, `git fetch` and
   look for a second operator's commits before every batch. Every push to `main` is a LIVE deploy.
5. **DOCS TRAVEL WITH THE CODE, IN THE SAME COMMIT.** `PLAN-OF-RECORD.md` §6 batch log + the relevant
   §8 section. No new tracker files.

---

## ▶ START HERE

1. `cd F:\kipindi-main` · `git fetch origin` · `git status` — expect **`main`, clean**.
   ⚠️ One untracked file is **not yours**: `scripts/live/ops/house-money-census.cjs`. Never stage it.
2. `npm install` is **not** normally needed — check first: if `package-lock.json` and
   `node_modules/.package-lock.json` share a timestamp, the tree matches the lockfile.
3. `.env.qa.local` **exists on this machine** (365 B) and holds the five QA operator passwords. It is
   gitignored and does not travel. ⛔ Never `git clean -x` — it takes that file.
4. There is **no `.env`**, and there must not be: with no `DATABASE_URL` the local server boots the
   in-memory store, which is what makes local work zero-risk.

**Boot + seed** (in-memory, wiped on every restart — re-seed freely):

```
$env:SESSION_SECRET='qa_local_session_secret_at_least_32_chars_long'
$env:OTP_PEPPER='qa_local_otp_pepper_16plus'
npx next dev -p 3009
curl -s -X POST http://localhost:3009/api/dev-test/seed-real-markets
curl -s -X POST http://localhost:3009/api/dev-test/seed-markets            # → ~46 live, ALL zero-pool
curl -s -X POST http://localhost:3009/api/dev-test/resolve-seed-markets    # settled rows
```

⭐ **PUT REAL MONEY ON THE BOARD, OR YOU ARE ONLY EVER TESTING THE COLD PATH.** After the two market
seeds every market has an empty pool, so a hero/board/strip that renders prices is never exercised.
Use `stress-bulk-bet` (in-memory only; it REFUSES to run against Postgres, and asserts pool maths):

```
POST /api/dev-test/stress-bulk-bet  { marketId, n, yesRatio, stake, userPrefix }
```
Take ids from `/markets`, then bet a **deliberately varied** spread (e.g. yesRatio .79/.11/.75/.71/
.45/.62). ⭐ Build a fixture that can tell a **real 50%** (8,000/8,000) from a **guessed 50%**
(0/0) — that pair is the only thing that proves the cold-start law rather than asserting it.

## The instruments — run read-only against local OR production

| Command | What it proves |
|---|---|
| `npm run qa:landing-shots -- <dir> <url>` | the landing: per-**band** clips (`[data-band]`), overflow, tap targets and clipping **inside each band**, console errors. Env: `LOCALES=en,sw,zh` · `BANDS=hero,...` (a named band that is ABSENT is a FAILURE, not a skip) · **`FULL=1`** whole-page frames · **`AUTH=demo`** a signed-in session |
| `npm run qa:discovery-probe -- <url>` | every /markets control's promised count == what pressing it delivers, cross-filtered · URL hygiene · sorts reorder · empty-state exits are non-empty |
| `npm run qa:discovery-board -- <url>` | the GRID draws a page of that set, counted in a real browser DOM · the mobile bar height in **real** sw/zh · ⭐ that **every menu actually OPENS** (≥90% of its panel visible at 360) |
| `npm run qa:results-board -- <url>` | /results' rail: promise == delivery per category, with and without a search |
| `npm run qa:filter-stress -- <url>` | 12 hostile payload classes × every param of both boards · **all 288** combinations · idempotency |
| `npm run test:hero-contract` · `npm run red:hero-contract` | the hero's figures, and **7 real defects** it catches — incl. the two the licence turns on |
| `npm run test:discovery-contract` · `red:discovery-contract` | the /markets contract, and 7 defects |
| `npm run test:board-discovery` · `red:board-discovery` | the landing-board invariants, and 6 defects |

⛔ **Screenshots are EVIDENCE: write them under `.qa-design-*/` (gitignored), never into the tree**
(DESIGN_AUTHORITY §0b). The *drivers* travel; the *evidence* is re-derived.

**Three shared modules — read before writing any driver:**

| Module | The rule it owns, once |
|---|---|
| `scripts/qa-locale.mjs` | **`kp-locale` is the ONLY cookie that changes the language.** `assertLang()` reads `<html lang>` back and **throws** on a mismatch |
| `scripts/red-anchor.mjs` | anchors are matched in the FILE's line-ending convention, and an anchor matching twice is refused |
| `src/lib/markets/discovery.ts` | the ONE definition of /markets parsing, defaults, hrefs, status predicates, buckets, sorts, counts — **and `pricedYesPct`**, the one cold-start price rule |

## Read, in order, before touching anything

1. `CLAUDE.md` — mechanics + the ACTIVE-WORK banner.
2. `.claude/skills/50pick-standards/SKILL.md` — the always-on standards.
3. `docs/DESIGN_AUTHORITY.md` §0 (filing law) and its **cold-start item** (now FOUR consumers, and
   corrected — read why).
4. **`design-brief/PLAN-OF-RECORD.md` §8 — THE PLAN.** §8.1/§8.2 the two pinned definitions · §8.4
   the **fourteen** kit contradictions and how each was resolved · §8.7a–c batch 1 · §8.7d /results ·
   **§8.7e batch 2** · **§8.7e-bis the re-validation pass** · §8.8 what is deferred and why.
   **§7b is the implementation dossier for the landing + header** — file:line anchors measured
   2026-08-12; re-verify anything a later commit moved (the hero rows in it are now HISTORY).
5. `docs/design-system/v3-2026-08-11-landing-discovery/ACCEPTANCE.md` — INHERIT/IGNORE per file.
6. The kit: `START-HERE.md` → `README.md` §1b–1i and §2 → `SPEC.md` → `COMPONENTS.md` → `MOTION.md`.
7. `docs/design-brief/handover-2026-08/LAWS.md` — 85 invariants + the **4 licence conditions**.

---

## WHAT IS ALREADY SETTLED — do not re-derive, do not re-open

- **`Open` = LIVE ∧ still taking bets · `All` = the unsettled book (LIVE ∪ CLOSED).** RESOLVED/VOIDED
  live at `/results`.
- **Every count on both boards is cross-filtered** — the number beside a control is what pressing it
  delivers.
- **`pricedYesPct(yesPool, noPool)` returns `null`, never 50.** It is the ONE cold-start price rule,
  with four consumers: the board's `toRow`, the hero's rows, the hero's aggregate, and the card's own
  `noPrice`. ⛔ `impliedYesPct` returns a hardcoded **50** on an empty pool — correct for a payout
  projection, a fabricated number on a display surface. Never use it to DISPLAY.
- **The cold-start rule is TWO questions with TWO gates** (DESIGN_AUTHORITY, corrected 2026-08-13):
  `fresh` = `volume === 0 && predictors === 0` (NEW badge, no spark, no crest) ·
  **`noPrice` = `volume === 0` — the POOL ALONE** (em-dash, dashed bar, no `@ pct%`).
- **`TippingBar` already has `empty` + `emptyLabel`** and its own dashed `--bar-empty-track` rail. It
  is documented in its source as *"A STATE OF THIS BAR, not a second component"*. ⛔ Never build a
  second bar. ⚠️ Its `showLabels` renders **hardcoded English** — do not use it on a localised surface.
- **`MarketCard` already has `featured`.** `src/lib/markets/time-left.ts` is the ONE time-left
  formatter (⚠️ two call sites still hold copies — see §8.8).
- The four `--rh-*` rhythm tokens exist once in `globals.css` with **zero consumers** — batch 3 is
  their first. ⚠️ A section's OBSERVED gap is the sum of the two paddings meeting at it; do not ALSO
  write a margin or you double-count. The tokens' own comment says this.
- **`.kp-hero*` in `globals.css`** is the pattern to follow: values in the stylesheet, the component
  consumes classes. It is why the hero has no `text-[42px]`-style off-ladder sizes.

---

## BATCH 3 — the work, in the order it should be done

### 3a · 🔴 THE TICKER IS FABRICATED. This is the batch's compliance fix and it comes FIRST.

`src/lib/server/ticker-feed.ts` is a **hardcoded twelve-item synthetic array** — "TZS 180K won on YES
on Long rains begin before 15 Apr · 5m ago", a TZS 2,400,000 Bitcoin settlement, "50pick reaches 1,000
predictions this week" — rendered by `app-shell` on **every page** of a licensed real-money platform.
Its own comment admits it: *"realistic synthetic data that matches real platform patterns."* Nothing
on that strip ever happened. Same defect class as the fabricated price history killed in `6b1975b`.

Two further tells, both confirmed on production: in **Chinese** it renders Chinese connectives
wrapping **English** market titles (the titles are English literals — there is nothing to translate),
and its **first item is clipped at the left edge in every locale**.

**The design was fully worked out in the previous session — implement this, do not re-derive it:**

| Decision | Why |
|---|---|
| **Settlements only. NO individual bets, ever.** | "TZS 45K predicted YES on X · 2m ago" publishes one identifiable player's stake on every page. With 73 accounts on production that is not anonymous to anyone who knows them — a **PDPA** problem, not a missing-data problem. Market opens and settlements are already public on `/markets` and `/results` |
| **Read it out of `getPlatformStats`, which already does the query** | `listMarkets({status:"RESOLVED"})` is UNBOUNDED (1,987 rows on prod; `listMarkets` takes no limit) and `getPlatformStats` already runs it once a minute behind a `globalThis` 60s memo **and throws every row away** to keep `.length`. The ticker is in `app-shell`, so its own read would put a second full scan behind every request. **One scan, two consumers** |
| **Order by `settledAt` DESC, and EXCLUDE `settledAt === null`** | Slicing the board-ordered list once pinned three July markets as "recent" on prod (`markets/page.tsx:326-334`). A RESOLVED market with no `settledAt` is still inside its **objection window** — announcing it as settled, with a figure, states an outcome the platform has not finished standing behind |
| **Amount = `poolFee(yesPool, noPool, ratesFor(m), outcome).netPool`** | pool − fee at the poll's **frozen** snapshot. Gold is correct here: money winners were actually paid |
| **Outcome READ from the market, never inferred from the pools** | law 25 / `test:outcome` |
| **A VOID gets its own line and NO amount** | On a void we keep nothing and stakes are refunded, so `netPool` is not what happened. Licence condition 4: a refund is NEUTRAL, never an error treatment |
| **Localise the title with `pickLocalized(locale, ...)`** | the Chinese-connectives defect |
| **ONE `TickerEvent` type** | it is currently declared TWICE (`ticker-feed.ts` and `live-ticker.tsx`), which is how a `timeAgo` field **nothing renders** survived. Drop `timeAgo` — a stale relative time is worse than none |
| **Empty feed → render nothing** | `LiveTicker` already returns `null` on an empty list. On a platform with no settlements the strip simply does not exist. A-5: nothing over a guess |

⚠️ `live-ticker.tsx` is a **client** component and `ticker-feed.ts` reaches the store, so the shared
type must be imported with **`import type`** (erased at compile time) or the server graph lands in a
browser chunk — the failure that broke the build when `audit.ts` pulled `node:async_hooks` in.
⚠️ `app-shell` is already `async`, so awaiting the feed is free. New copy keys need **all three
locales** in the same edit (`Dict = typeof dict.en` makes a miss a compile error).
⭐ **Write `test:ticker-honesty` + `red:ticker-honesty`**: assert the feed contains no row whose
`settledAt` is null, that a void carries no amount, that an empty platform yields an empty array —
each with a **positive control** in the same run.

### 3b · Delete `StatsBand`, and compose the page

`StatsBand` (`page.tsx`, gated `settledCount > 0`) is the two zero-counters the kit replaces; the
hero's proof rail and the settled strip carry the proof role now. Delete the component and its call.

**Section order + rhythm** (kit README §1): hero → how-it-works → pick-a-side → topics (48 internal)
→ Up&Down → trust → settled → RG → footer. Gaps **144 · 96 · 96 · 144**, from **padding pairs**,
compressing to ~122/97/96/123 at ≤1024. Two tinted `--bg-overlay` bands, both at chapter breaks,
edged `--claret-edge`.

🔴 **AND FIX THE REPETITION THE HERO EXPOSED.** The hero's four questions are ALSO the first four
cards of "Pick a side now", because both are closing-soonest over the same book — the same markets
twice within two screens. Give the grid a **different lens** (biggest pool, heading stating the sort,
per §1c's own "the heading states the sort order" rule) or offset it past the hero's five. Your call
as visual engineer; state which and why.

### 3c · How-it-works band + the primer duplication

Heading + lede read **the same dict keys** as the first-visit modal (`t.primer.card1Title` /
`card1Body`) — and **fix `first-visit-primer.tsx` to read the dict too**: it duplicates that copy
inline today (`:164-211`) while the `t.primer.*` keys exist in all three locales and are **dead**.
Three step cards use the kit's §1b copy verbatim → new keys with real SW + ZH.

### 3d · Header (`src/components/layout/top-app-bar.tsx`)

Opaque **`var(--panel)` at every scroll position** (today 92%/78% + blur ≥1024,
`globals.css:2455-2464`) + `--shadow-2` when scrolled, 140ms ease-out. **The see-through bug is
removed, not tuned.** Three nav tiers — destination (no border) / utility (bordered) / action (pill);
active = **`--pill-active` + `--text` + 600, the ONLY active treatment, at every width**. Up & Down is
a destination with a 5px `--gilt` dot (⚠️ verify against `test:gold-is-money`; if it objects the dot
goes brand, not gold). ONE 44×44 `EN ⌄` control at every width opening a `role="listbox"` whose
`role="option"` elements are **DIRECT children**. Skip link → `#main`.
⚠️ Must hold `Jedwali la Washindi` (SW "Top", ×6.33) through the **1024–1279** band, which has
overflowed before. ⚠️ **The dossier's claim that the header has no auth buttons is STALE** — they are
already there at ≥640. Verify against the code.

### 3e · Bottom rail (`src/components/layout/bottom-nav.tsx`)

5 slots `Markets · Up & Down · Live · Results · More`, active = `--pill-active` on the pip +
`--text` label (**kill the aqua literals**), `--panel` + 1px `--border` top + `--shadow-overlay-up` +
safe-area padding. **Auth is NOT in the rail** — it lives in the header at every width. `More` carries
Positions / Wallet / Top / Invite when authed. Keep the `t.nav.*` keys.
🔴 **And fix the collision:** the Needle fidget's badge **overlaps the rail's first slot** at 360 —
visible in the batch-2 baseline frames. The needle's physics is vendored do-not-edit; its **resting
position and z-index are not**. See trap 6.

### 3f · Topics · trust · settled strip · RG line

Topic tiles with **real per-topic count + pool**, folded from the ONE board read (⚠️ they must
reconcile to the header or the page contradicts itself). Trust band: M-Pesa via **`PaymentLogo`** —
marks are trademarked, must sit on a **WHITE** tile, `public/pay/mpesa.svg` is a vertical lockup;
**never inline the SVG**. Settled strip: re-sort by `settledAt` DESC (same rule as the ticker),
amount = pool − fee, `formatTzs`, gold correct (earned). `resolvedOutcome` must be threaded to every
new call site that can render a resolved state (law 25 / `test:outcome` reads call sites). RG line
above the footer, **every string verbatim from `public-footer.tsx`**; footer itself unchanged.

### 3g · Entry motion — LAST, after everything else is right

550ms budget (kit MOTION.md); existing `--t-*`/`--m-*` only; IO reveal (precedent
`pulse-grid.tsx:83`); the script adds the `.js` class so no-JS renders everything; **all THREE**
reduced-motion gates (OS / in-app / low-end throttle) in the same change (`test:reduce-motion`).
⚠️ `motion.css` ATOM A: `animation-delay` IS clamped under reduced motion — a delayed `both`-fill
keyframe blanks content for its whole delay.

---

## BATCH 4 — cleanup + handoff

Cite-check → archive to `F:\50pick-design-archive\2026-08-12-final\` (verified counts + bytes,
quoted) → delete → update `design-brief/CLEANUP-MANIFEST.md`. Close out §8.8: build the density
toggle / search typeahead / **mobile filter sheet**, or carry them forward with the reasons intact.
Update `docs/NEXT-PLAN.md` + the §6 batch log. Replace this file with the next prompt, and verify
`design-brief/` still holds exactly three files with a quoted listing.

## DEFINITION OF DONE

1. The ticker states only things that happened, or nothing at all — with a RED-proven gate.
2. Landing composition + header + rail per the kit; `StatsBand` gone; the hero/grid repetition fixed.
3. Every inherited value through EXISTING tokens; **no second stylesheet** (law 82); new states are
   **props on existing components**.
4. `npm run predeploy` green; laws green; **ratchets not zeroed** — an allowlist may only SHRINK.
   ⚠️ If you clean the last inline literal out of `src/app/page.tsx`, `test:design-frozen` will fail
   until you **remove it from `FROZEN_ALLOWLIST`** in the same commit. That is the ratchet working.
5. All seven roles signed off, each with quoted evidence. Frames at 4 widths × 3 locales **plus a
   whole-page frame per width**, all read. Every push verified live: prod 200, clean boot, and a
   screenshot **you looked at**.
6. §6 batch log complete; §8 updated; this prompt replaced.

---

## 🔴 IF THE RAILWAY BUILD FAILS AND THE CODE LOOKS FINE

A build can die with 18 errors reading `Module not found: Can't resolve
'@vercel/turbopack-next/internal/font/google/font'`. **It is not a code error.** Scroll UP to the
warnings: `Received response with status 404 when requesting https://fonts.gstatic.com/…woff2`.
`next/font/google` fetches font files at build time; when Google's CDN 404s them the build dies. It
hit twice on 2026-08-13, including on a commit that pre-dated all design work, and the same commit
built locally with exit 0. **Retry by re-pushing.** ⛔ Never retry with the Railway MCP `deploy` tool:
it uploads a tarball of the local directory, breaking the git↔deploy link. The permanent fix
(self-hosting the three families) needs Ali's sign-off — `PLAN-OF-RECORD.md` §8.8b.

⚠️ Two harmless pre-existing build **warnings** are not yours: `node:crypto` in the Edge Runtime via
`lock-key.ts:12` / `audit.ts:38`. The build still exits 0 and says "Compiled successfully".

---

## TRAPS — every one has been paid for

1. ⭐ **A DEFECT CAN BE INVISIBLE TO EVERY GATE AND OBVIOUS IN A FRAME — 2026-08-13.** Batch 2 shipped
   a hero whose featured card and question row 1 were the **same market**, same price, 400px apart,
   with a third copy in the grid below. **30 gates were green.** Per-band clips could not show it
   either: both elements are in one band and neither overflows, clips or misses a tap floor. Only a
   **whole-page** frame showed it. `FULL=1` exists for this. **Look at the whole page.**
2. **A CONTROL THAT RENDERS IS NOT A CONTROL THAT WORKS.** The sort and topic menus were **4px of a
   274px panel — 1%** — at 360, because a `<details>` panel is absolutely positioned and sat inside a
   row that scrolls horizontally: **CSS coerces `overflow-y: visible` to `auto` once one axis
   scrolls.** Zero of six sorts and zero of eight topics were reachable, with no overflow, 44px
   targets, and a perfect closed-menu screenshot. **OPEN EVERY CONTROL YOU BUILD.**
3. **A box cannot both scroll on one axis and let a child escape on the other.** No property fixes
   it. Move the child out, or change the presentation.
4. **flex-wrap breaks a line BEFORE it shrinks**, so two controls that "should" share a line land on
   separate ones at half width. A one-column grid stacks in DOM order.
5. **An edge bleed (`-mx-3 px-3`) costs more than it buys** — it ate the gap before the result count
   so a clipped chip and the count read as one broken word (`Mpymasoko 40`). Use `.kp-strip-fade`.
   ⛔ It is a mask, so it also **clips an absolutely-positioned panel** — never put a `<details>` menu
   inside a faded or scrolling strip.
6. ⭐ **FIXED-POSITION CHROME LANDS ON YOUR CONTENT, AND YOUR BAND CLIPS WILL LIE ABOUT IT.** The
   Needle fidget is `position: fixed`, `z-index: 45`, 64×64, and it **roams** — on the authed hero it
   sat half off-screen at x=1248 **on top of a question's price**, and at 360 its badge covers the
   bottom rail's first slot. Its `#hit` is `pointer-events: auto`, so a tap there grabs the fidget
   instead of the market. ⚠️ **And an element-clipped screenshot composites viewport-fixed elements
   into the middle of a tall band**, which reads as a collision that is not there. Check the **fold**
   frame before believing a band clip.
7. ⛔ **AN AUTHED PAGE NEVER REACHES `networkidle` HERE.** With a session `app-shell` mounts
   `LazyEventStream` (SSE) + `LazyNotifyPoller`, so `waitUntil: "networkidle"` times out at 90s.
   Use `load`. The anonymous sweep is unaffected — which is why this hid until the authed hero was
   shot for the very first time, in the re-validation pass.
8. ⛔ **`git checkout --` DURING `next dev` POISONS TAILWIND, AND A RESTART DOES NOT FIX IT.**
   Reverting watched files left Tailwind's content tracker holding a stale `stat`; every page
   importing `globals.css` returned **500** with `ENOENT … stat '…platform-stats.ts'` on a file that
   existed (`Test-Path` → `True`). The state lives in **`.next/dev`** — clear that directory. Confirm
   with production before believing your code broke: it was serving `ok:true` throughout.
9. **PowerShell 5.1 destroys UTF-8 on round-trip** — use the editor tools, never
   `Get-Content`/`Out-File` for content. ⚠️ And **`Measure-Object -Line` skips empty lines**, so its
   counts undercount: `page.tsx` measured 394 against a real 418. Take line numbers from Read/Grep.
10. **A check that cannot fail is not a check.** `EXIT=$?` after a pipe reads the LAST command. Use
    `cmd > log 2>&1; $code=$LASTEXITCODE`.
11. ⭐ **AND A CHECK CAN BE GREEN — OR RED — FOR THE WRONG REASON. Eleven were, across three
    sessions.** Batch 2 added two of its own: a clip check that flagged the hero at **all twelve**
    width×locale combinations because it was catching the brand mark's *deliberate* bleed behind
    `overflow: hidden` (it now only considers nodes holding their **own text**), and a substring probe
    for `50%` that matched `border-radius:50%` and the `150%` inside a gradient. **The instrument was
    wrong twice before the product was wrong once.** Ask what would make this pass with the product
    broken — and what would make it fail with the product fine.
12. ⭐ **EVERY REFUSAL CHECK NEEDS A POSITIVE CONTROL IN THE SAME RUN.** `test:hero-contract` asserts
    an empty pool has NO price — a `pricedYesPct` hardwired to `null` would satisfy that and every
    other cold-start assertion in the file. The control ("a staked market IS priced") is what catches
    it, and `red:hero-contract` case 2 proves the control by breaking it deliberately.
13. **A RED proof for the WRONG reason is not a proof.** `qa:results-board` reds against production
    because production predates its `data-chip` attributes — a correct refusal on an absent premise,
    and no evidence at all about the defect. Assert **which** assertion went red.
14. **Tailwind spacing is OVERRIDDEN: `h-8`=48px, `h-10`=80px, `px-3`=16px, `gap-x-2`=12px.** Use
    `--sp-*` in CSS, or arbitrary values for real constants. `PageContainer` owns page padding.
15. **A utility class can compile to NOTHING.** `border-border-control` did, at two call sites — the
    token existed, the bridge did not. `npm run test:bridge` catches it.
16. **Measure mobile, do not eyeball it.** The batch-1 bar rendered **448px tall at 360 in Swahili**
    (57% of a sticky viewport). It is 220px now.
17. The in-memory dev store is SYNC where Prisma is async — `await Promise.resolve(db.x())`.
18. First cold compile of a new page ~30s (Turbopack) — bump Playwright `goto` timeouts.
19. **A bare `/* */` is valid between JSX ATTRIBUTES but NOT between children** — children need
    `{/* */}`. Getting it wrong reports parse errors on lines you never touched.
20. **Things that look redundant are load-bearing — cite-check before deleting, always.** `heroEst`
    looked safe to leave alone and was silently duplicating "Dar es Salaam" into the eyebrow.
21. ⚠️ Do NOT touch: `.dc.html` previews with sibling `theme/` folders, `.qa-*` scratch dirs, the
    unreferenced 8-key glyph family, or another session's untracked files (there is one right now:
    `scripts/live/ops/house-money-census.cjs`).

---

## STATE AT HANDOFF — 2026-08-13, measured not assumed

| | |
|---|---|
| `main` | **`6f6819d6`**, clean, pushed. Deploy landed and **verified on production at 13:42**. ⚠️ `git log -1` before trusting this — a second operator shares the branch |
| Live data | 40 open markets (45 LIVE, 5 selection-closed) · 1,987 resolved · 73 users · TZS 1.7M in open pools |
| The hero, on prod | 5 **distinct** markets (1 featured card + 4 question rows) · 90% YES weighted · `overflowX` 0 and `clipped` 0 at 360/768/1280/1920 · smallest owned control **56px** |
| ⭐ Cross-surface agreement | the board's `status:open` = **40**; the hero's proof rail reads **40** — measured on the same data at the same instant |
| Gates | **30 run individually with real exit codes, all green** · `red:hero-contract` **7/7** · `red:discovery-contract` 7/7 · `red:board-discovery` 6/6 · tsc 0 · build 0 (13.3s) |
| Against production | `qa:discovery-probe` 0 · `qa:discovery-board` 0 · `qa:filter-stress` 0 (incl. **all 288** combinations) · `qa:landing-shots` 0 at 4 widths |
| Known-open, recorded | the hero/grid market repetition (§3b above) · `a.mcardp-details` is a **17px** tap target on every board (§8.8) · the time-left helper still duplicated at 2 of 4 call sites (§8.8) · "predictions today" needs a `placedAt` index (§8.8) |
| ⛔ Not started | the ticker is still **fabricated** on every page. It is §3a and it is first |
