# LANDING-TEN — the landing page's acceptance gate

> **What this is.** `/` on www.50pick.tz is the one surface every new player sees. A five-critic
> review scored it 7.2/10. The work to close that gap produced **an instrument, not a list of
> fixes** — `npm run qa:landing-ten`. The fixes were the easy half; the gate is the deliverable,
> because it is what stops the next regression.
>
> **Read this before touching the landing page, and before trusting a green gate.**

## §−0 · ⚠️ A SECOND LANE SHIPPED THE DEPOSIT CHANGE, AND THE BRIEF HAS BEEN REVISED (2026-09-28)

**A v4 revision of the handover is now installed**, over the v3 one that was in
[`design-system/v4-2026-09-26-landing-ten/`](design-system/v4-2026-09-26-landing-ten/README.md).
Read its **`UPDATE-2026-09-28.md` first** — it supersedes any line it conflicts with, including in
`HANDOVER-LANDING-10.md`, which is itself a longer revision now (15k → 24k). `SPEC-VALUES.md` and
`ACCEPTANCE.md` were revised too. The v3 concept and `INHERIT-MANIFEST.md` are untouched; the v4
concept is self-contained in `design/v4/` because the two need different runtimes.

**§1–§3 of that update are BUILT AND LIVE** (`37bde8a5`), with gates V22 and V25 (`ccfa54f0`):
the header's gold pill yields below 1024, the rail carries a centre **Deposit coin**, and Results
moved into `More` (it stays in the desktop header). **One Deposit per screen** is now a gate, not a
convention.

⛔ **THE TWO LANES COLLIDE, AND IT IS NOT HYPOTHETICAL.** That work merged origin/main mid-build and
hit three conflicts — `top-app-bar.tsx`, `bottom-nav.tsx` and this lane's own
`header-fit.anchors.mjs`. R1 landing first is what made §1's zero-balance label rule correct: it
added `funded` and made the capsule give way at zero, which is the premise §1 spends.
⚠️ **Most of UPDATE §4's remaining items overlap this lane's work packages** (one board, the shared
`ConvictionBar`, the closed-market state, "▲ You", analytics, skeletons). **Reconcile before
starting any of them**, or both lanes will build the same thing twice in the same files.

## §0 · RESUME AT — the v3 build (rewritten 2026-09-28)

**⚠️ THE MACHINE CHANGED.** The session that ran this programme worked on **ALI-BLADE15**, with worktrees
at `C:\kipindi-hero`, `C:\kipindi-c1`, `C:\kipindi-wp34`, `C:\kipindi-f1` and a `~/heavy-node-lock.sh`.
That session ended. This one is **OMEGA-COMPILE01**, checkout `F:\kipindi-main` — those paths and that
lock do not exist here. **Find your own checkout** (`hostname && git rev-parse --show-toplevel &&
git worktree list`) and never copy a path from this document. ⭐ All four of that session's built
branches were PUSHED before it ended, so nothing was lost: `landing-v3`, `landing-v3-c1`,
`landing-v3-wp34`, `landing-v3-f1` are on origin, and **all four are now merged into `main`.**

**State (2026-09-28):** everything in this line is LIVE — D0 ✅ · WP2 ✅ · WP6 ✅ · WP8 ✅ · WP10 ✅ · WP11 ✅ ·
WP13 ✅ · WP14 ✅ · WP14b ✅ · **WP1b ✅** (the rail's centre Deposit coin) · WP12 🔵 · **WP3 🔵 · WP4 🔵**
(live and gate-measured; their production frame review is what stands between them and ✅) · the hero
(R7/R9) and C1 (one price rule) live inside those rows · gates **V15, V16, V17, V18, V22, V25 ✅**.

**Production, 33 of 33 base cells: 20 of 22 classes clean.** V18 went **1,584 → 0** when WP3+WP4 landed
its `data-market-*` attributes. Only V3 (×12, the chat bubble — Ali's call) and V4 (×36,
`.ticker-pause` — the LIVE strip lane's, §0 trap 11) remain, neither this programme's to fix.

**⚠️ ONE PRODUCT QUESTION THE FRAME REVIEW RAISED, AND IT IS ALI'S.** WP3's depth floor withholds the
predictor count below 10. The book is thin enough today that it is withheld on very nearly every market
— the featured card measured `predictors=2` against `floor=10` — so nearly every card shows the footer
shape that floor leaves: the pool figure alone on one line, the info button opposite it, and air between
them. Nothing is broken and no gate objects; the floor is doing exactly what R7 asked. The question is
whether a floor of 10 is right for a book this size, or whether the card should close the space when it
withholds. Not a defect to fix quietly — a number to rule on.

**Next:** WP9, then the small R7 build. In order:
1. ~~The production frame review for WP3, WP4 and WP12~~ — **DONE 2026-09-28**; all three rows ✅.
2. **WP9** — one board: delete the `.market-grid` and `TopicTiles` from `/`, add the Closing soon /
   Biggest pools toggle (the lens is server-chosen and non-interactive today), the topic chips and
   the search. Reuse `discovery-bar.tsx`'s `FilterPill` and `ui/search-box.tsx`; do not write new
   controls. It also delivers K64 (one `ConvictionBar`) — bar markup is triplicated on `/` today:
   `TippingBar`, `.kp-qrow__lean` and `.kp-topic__lean`.
3. **The small R7 build** — retire "Tabiri matukio. Si bahati." on all five surfaces it reaches.
4. **D3** — WP5 the pick slip, V20, the chat bubble under sheets. Then WP15/V23, WP19, WP20/V24, D5.

**✅ THE THREE CONTRADICTIONS ARE ANSWERED — Ali, 2026-09-28: *"take all decisions yourself based on what
suits the architecture more and makes the platform more perfect."* Recorded as R11–R14 in the manifest:**
1. **R11 · the 7-day line: D49 STANDS**, the delivery is overruled. The band is TRIMMED below 640, never
   removed. The delivery's clause protects the first-screen budget, and V15 measures that budget directly —
   0 on 33 production cells with the band present. V24 asserts the trim, not the absence. **WP20/V24 unblocked.**
2. **R12 · V23 forbids animating LAYOUT; `filter` is allowed.** Read literally the delivery's rule convicts
   the platform's own money control (`.gilt-metal:hover` animates `filter: brightness`, the coin's fill).
   The reason behind "transform and opacity" is that neither invalidates layout, and `filter` satisfies it.
   **V23 unblocked**, written against the reason rather than the wording.
3. **R13 · the repo's 12.5px RATCHET is the enforcement**, not the delivery's "12 with no exceptions" — which
   would be either unenforced prose or a 744-site change. The binding rule is that **no NEW sub-floor site may
   be added**; the ratchet may only shrink.
4. **R14 · the depth floor stays at 10; the SKELETON is what is wrong.** `.mcardp-traders` is not rendered
   when the count is withheld, but `--mcard-h` still sums `--mcard-traders-h: 24px` into every card — so the
   `/markets` skeleton over-reserves 24px on nearly every market. **WP19 owns it**, with its CLS-0 requirement.

**⭐ R10 (Ali, 2026-09-28) reversed R1's zero clause** — the header shows the balance at EVERY value,
"TZS 0" included, because *"user should know he's 0"*. It travels with a second half: the Deposit
label yields at lg–xl in every balance state, because the capsule is beside it again (E-190).

**⭐ Ali, 2026-09-28, standing:** *"nothing could be created or fixed outside our set of consistency
and responsiveness rules"* and *"any new components should align with our theme UI kit"*. And:
**push progress as you go, so another session on another PC can continue** — several sessions run at
once, on different things.

**Traps already met on this programme**
1. Never build in a checkout that is behind `origin/main`; fetch and check before you start.
2. The delivery states numbers the platform does not: minimum stake TZS 100, a hard-coded 13%, and a
   licence number starting with the digit **zero** (ours starts with the letter **O**). Read every
   number from config or `support-config.ts` (L3).
3. `pricedYesPct` rounds a lopsided two-sided pool (25,000 vs 100) to 100% — V17's defect in a market
   that is not one-sided (L14).
4. The concept re-renders the whole page every second and fakes a bet every 6s (`sim()`). Neither is
   ported (L12).
5. The gate's landmark selectors are tied to class names. A rebuild re-points them in the same commit.
6. The verification scripts live in `scripts/qa/landing-v3/`; `.qa-shots/` is gitignored. On a host
   with no shared lock, run them directly. Seed a local host with `POST /api/dev-test/seed-markets`
   and `POST /api/dev-test/updown-seed`, and sign in with **`/auth/demo?deposit=0|1`** — that is how
   the funded and zero-balance header states are driven without touching production.
7. **Git Bash eats backslashes in heredocs, `node -e` and `sed`.** Write patch scripts with the Write
   tool. Working-tree files are CRLF (autocrlf), so a patch script normalises `\r\n` and restores it.
8. **`scripts/qa/landing-ten.mjs`'s `CHECKS` is itself a TEMPLATE LITERAL.** A raw backtick in a
   comment you add ENDS it, and `node --check` then reports "Invalid left-hand side expression in
   postfix operation" hundreds of lines away. Escape them, as the file already does.
9. V14 is red on a LOCAL run: the in-memory seed produces no settled row, so WP13 and V14 are measured
   on production only.
10. The gate's V3 treats the top of the bottom rail as the fold. What it still reports on production is
    the chat bubble — Ali's open call.
11. V4 on production reports `.ticker-pause` at 40×31 on every cell. The LIVE strip lane's, on purpose.
13. 🔴 **A COMPONENT BELOW THE FOLD PHOTOGRAPHS BLANK.** The first production frame review captured the
    Up & Down band as a solid dark rectangle at every width and locale, and a blank frame reads as an
    empty component rather than as a broken photograph. The page reveals sections on first intersection
    (`.js [data-reveal]:not([data-revealed]) { opacity: 0 }`), so a camera that never scrolls shoots a
    component that has not been told to appear. Measured both ways: before scrolling `opacity=0`,
    `data-revealed` absent; after `scrollIntoView({block:"center"})` and 1.8s, `opacity=1` and revealed,
    in 9 of 9 cells. ⚠️ Scroll the element into view and WAIT before any capture below the fold.
12. **`red:landing-ten-plan` had three controls proving nothing**, all for the same reason: they pinned
    a value that later became true. Two hard-coded "56 K rows" / "58 checkboxes" and went blind the day
    the delivery grew to 86; one planted **R9**, which the hero unit MADE REAL. A control pinned to
    today's count cannot survive the event it exists to catch. All three derive or use an impossible
    value now (16/16 proved).

## §0a · The paste-in prompt for the next session

> Continue the 50pick **landing** build. You are one of several sessions working this repo at once,
> on different things, so **push to `main` as you finish each piece** — another PC picks up from there.
>
> **⭐ ALI'S STANDING INSTRUCTION, 2026-09-28: TAKE THE DECISIONS YOURSELF.** *"Take all decisions
> yourself based on what suits the architecture more and makes the platform more perfect."* When the
> delivery and this repo disagree, or a spec is silent, **decide it on architectural grounds, record it
> as the next R-number in `INHERIT-MANIFEST.md`, and say in the ruling what it unblocks.** Do not park a
> row waiting for an answer. Ask Ali only for things code cannot settle: money moving, production data,
> a new account, or a brand/commercial call. ⛔ And when a ruling overturns an older one, DELETE or
> strike the old line where it lives — a stale rule beside the code it contradicts is read under
> pressure and believed.
>
> **Also standing (Ali, 2026-09-28):** *"nothing could be created or fixed outside our set of
> consistency and responsiveness rules"* and *"any new components should align with our theme UI kit"*.
> Build from `globals.css` tokens and existing components; if no token fits, stop and ask.
>
> **START HERE**
> 1. `hostname && git rev-parse --show-toplevel && git worktree list` — find your OWN checkout. Never
>    copy a path from a document; the sessions before you were on different machines.
> 2. `git fetch && git merge origin/main`. Read `docs/LANDING-TEN.md` §−0, §0 and §1, then
>    `docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md` (rulings **R1–R15**, laws L1–L29),
>    then §2 (how each row is built) and §3 (every delivery item and the row that delivers it).
> 3. `UPDATE-2026-09-28.md` in that folder **supersedes** the handover where they conflict — but its §0
>    ("what the repo has now") is a TARGET STATE, not an inventory. Read §0 as spec.
>
> **WHAT IS ALREADY DECIDED — do not re-open these**
> · **R10** the header shows the balance at EVERY value, "TZS 0" included; the Deposit label yields at
>   lg–xl in every balance state (E-190 travels with it).
> · **R11** the 7-day line: Ali's D49 stands over the delivery — TRIMMED below 640, never removed.
> · **R12** V23 forbids animating LAYOUT; `filter` is allowed (the delivery's wording convicts the coin).
> · **R13** the repo's 12.5px ratchet is the enforcement, not "12 with no exceptions"; no NEW sub-floor site.
> · **R14** the depth floor stays at 10; the `--mcard-h` skeleton over-reserves 24px — WP19 owns it.
> · **R15** WP9 deletes the grid and KEEPS the topic tiles; the board grows 4 → 7; the toggle is
>   SERVER-computed.
>
> **▶ NEXT: WP9 · ONE BOARD.** §2.1's WP9 row is the full spec and R15 is its scope. It names the five
> guards that move with it. Then the small R7 build (retire "Tabiri matukio. Si bahati." on five
> surfaces), then D3 (WP5 the pick slip, V20, the chat bubble under sheets), then WP15/V23, WP19,
> WP20/V24, D5.
>
> **HOW TO WORK A ROW**
> · Build it with existing tokens and components. Run the suites §2.1 names, plus
>   `npm run test:landing-ten-plan` and `npm run red:landing-ten-plan`.
> · Drive it on a LOCAL host: `PORT=3031 npm run dev`, seed with `POST /api/dev-test/seed-markets` and
>   `POST /api/dev-test/updown-seed`, sign in with **`/auth/demo?deposit=0|1`** (that is how the funded
>   and zero-balance header states are driven without touching production).
> · **Look at the frames** at 360/768/1280 × sw/en/zh — a green gate is not a 10. ⚠️ Anything below the
>   fold must be `scrollIntoView`n and given ~1.8s first, or it photographs BLANK (§0 trap 13).
> · `git fetch`, **merge** `origin/main` (never rebase, never force), `git push origin HEAD:main`, then
>   confirm production serves your sha (`?dpl=<sha>` on the asset URLs).
> · Re-measure on production with `node scripts/qa/landing-ten.mjs --pass=base`, then tick the row and
>   rewrite §0 **in the same commit**. A row is ✅ only when it is measured on production AND its frames
>   have been looked at.
>
> **The repo's laws win every conflict with the delivery.** Report the conflict in the ruling you write;
> never resolve one silently.

## §1 · Status board — the v3 build

⬜ not started · 🔨 building · 🔵 live, production not yet re-measured · ✅ measured on production ·
⛔ not built, by ruling · ⏳ waits on Ali. Guarded by `npm run test:landing-ten-plan`.

| ID | Unit | Status | Commit | Evidence / note |
|---|---|---|---|---|
| D0 | File the delivery, its acceptance record, this tracker; delete the dropped folder | ✅ | 1173dc2b | live 2026-09-26; the dropped folder deleted, `C:\kipindi-main` fast-forwarded |
| WP1 | Header collapse below 1100, Menu button, segmented language | ⛔ | | R1 kept the header; L4 |
| WP2 | Hero order, trust lines, headline clamp, backdrop drawing removed | ✅ | 54f8199b | measured on production 2026-09-26 (360/768/1280 × sw/en/zh frames looked at); R4(1), L18 |
| WP3 | Featured card: full question, meta + source, time top-right, 24h mark and delta | ✅ | ec28dd4e | **Production frame review done 2026-09-28** (`03cf7df9`): 27 element captures, 3 components × 360/768/1280 × sw/en/zh, measured for clipping and overflow AND looked at as contact sheets (three locales stacked per component and width). No clipping, nothing past the right edge, every `data-market-part` present in all 27. The card reads right in all three languages: time top-right, the question clamped to 3 lines below 640 and WHOLE from 640, the source under the YES/NO row below 640 and above it from 640, the 24h mark and its delta on the bar. ⚠️ The footer is airy, and it is the DEPTH FLOOR doing its job — the card carries `data-market-predictors=2` against `data-market-depth-floor=10`, so the count is withheld and V18's exception (1) allows it. Measured: no gap ≥20px between leaves, so this is the floor's shape, not a layout defect. ⚠️ BUT see §0: with the book as thin as it is, the floor withholds the count on nearly every market, so nearly every card shows that shape. Ali's to rule on |
| WP4 | Question board rows: title link + YES@/NO@ buttons + time left | ✅ | ec28dd4e | **Production frame review done 2026-09-28** (`03cf7df9`): 27 element captures, 3 components × 360/768/1280 × sw/en/zh, measured for clipping and overflow AND looked at as contact sheets (three locales stacked per component and width). No clipping, nothing past the right edge, every `data-market-part` present in all 27. Rows carry close date · source · pool · predictors in every locale, at 360 (stacked, meta wrapping to two lines) and at 1280 (one line per row, three columns). The source is before the pick in reading order at every width — V18 0 on 33 production cells |
| WP5 | Pick slip: sheet below 1024, inline from 1024, after-placing share | ⬜ | | R2 |
| WP6 | One-sided state on every card + the grid's degeneracy floor | ✅ | 31662831 | measured on production 2026-09-27: V17 0 in 33/33 cells (was 66), RED V17 PROVED; `/`, `/markets`, `/results` at 360/768/1280 × sw/en/zh, frames looked at — no card reads 0% or 100%, one-sided cards read "One side only" + the rule in all three. The one-sided FEATURED card measured locally (production's featured is contested). L14, L22, L23; delivers MOBILE-VISUAL ruling 13 on the card |
| WP7 | Estimate line on cards | ⛔ | | R3 |
| WP8 | Proof rail: phone ledger rows, conviction reading as the bar's label | ✅ | 54f8199b | measured on production 2026-09-26 (360/768/1280 × sw/en/zh frames looked at) |
| WP9 | ONE BOARD: the `.market-grid` band leaves `/`, the board grows 4 → 7 rows and takes the grid's header and its Closing soon / Biggest pools toggle | ⬜ |  | ⭐ **Scope is R15**, which keeps the topic tiles the delivery would have deleted with the grid: they list TOPICS, not markets, so the delivery's own reason ("three lists of one thing") does not reach them. The 8-market budget is preserved exactly — 1 featured + 7 rows. ⚠️ This row carried the v3 "Pick-a-side grid" spec until 2026-09-28; §2.1 is rewritten |
| WP10 | Topics: six tiles, Other last, "All topics" as the section link | ✅ | 54f8199b | measured on production 2026-09-26 (360/768/1280 × sw/en/zh frames looked at) ·· ⭐ **KEPT, 2026-09-28 (R15).** The v4 delivery would have deleted the tiles with the grid; they list TOPICS and repeat no market, so the reason it gives does not reach them. They also carry V14's `.kp-topic` landmark |
| WP11 | How it works: "A named source", the fee from config, h3 steps | ✅ | 54f8199b | measured on production 2026-09-26 (360/768/1280 × sw/en/zh frames looked at); the fee reads 13% through `ratesFrom`; L3 |
| WP12 | Up & Down band: R5 — the Match (spec v2) | ✅ | ec28dd4e | **Production frame review done 2026-09-28** (`03cf7df9`): 27 element captures, 3 components × 360/768/1280 × sw/en/zh, measured for clipping and overflow AND looked at as contact sheets (three locales stacked per component and width). No clipping, nothing past the right edge, every `data-market-part` present in all 27. The Match reads right at 1280 (two columns: the copy left, the scoreboard and timeline right) and reflows at 360 to heading → asset → countdown → scoreboard with the Up/Down pair below it → timeline → rule → All rounds. The Swahili rule line holds its two lines at 360, as R5's panel required. 🔴 AND THE FIRST PASS PHOTOGRAPHED IT BLANK IN ALL NINE CELLS — see §0 trap 13 |
| WP13 | Results: date, the market's own sign-off, source link, paid | ✅ | e9b4056c | measured on production 2026-09-27: date, the market's own sign-off (a reversed market reads "Corrected on objection"), source, paid; below 640 the amount and the source each take a line, so the host reads whole. L2 |
| WP14 | Wallet: chip opens sheet/panel, equal Deposit/Withdraw, gold Deposit at zero, signed-in hero | ✅ | e9b4056c | measured on production 2026-09-27 with `mobile01` (zero balance, no picks: header Deposit, hero empty-balance line + Deposit, no Withdraw, Set limits; pages render at 360/1280 sw/en). Funded Wallet + hero measured locally (Wallet 17 cells, hero 15 cells; 360–1280 × sw/en/zh). `test:wallet-reach` 48/48, `test:landing-mine` 22/22, both mutation-proved. R1, L19–L21 |
| WP14b | Share on every card footer, in every phase; the WhatsApp preview card (og tags spread from `ROOT_OPEN_GRAPH`, no 0/100 in the preview) | ✅ | 541a9e76 | measured on production 2026-09-27: `qa:landing-v3:og-prod` CLEAN on 15 markets (og:type/site_name/locale present, one-sided markets preview "One side only.", images 1200×630 PNG) — its baseline before the push failed on all 15; `/results` captured 360/768/1280 × sw/en/zh, settled cards one `<article>`, looked at; the share drive (26/26: Copy, WhatsApp, Esc, backdrop stay on `/results`) ran locally. "Share on WhatsApp" after placing is WP5's; K50 closes with both |
| WP1b | Bottom rail with a centre Deposit: Markets · Up & Down · **Deposit** · Live · More; Results into More; the coin is the mark as a control | ✅ | 37bde8a5 | production 2026-09-28: rise 14.0px, rail 65px unchanged, five slots at 64, off-centre ≤ 0.02px, coin's rect inside a keep-out, 57px reserve clearance, frames looked at at 360/414 × sw/en/zh. Ali's override of "the rail is destinations only" is recorded in the component's header comment — the centre is a ROUTE. Gates V22 + V25 |
| WP15 | Motion and performance | ⬜ | | L12 |
| WP16 | i18n: every new key in en, sw and zh | 🔨 | 54f8199b | D1's keys in all three (`test:i18n`); sw/zh drafts carry the native-review marker (rows SW, ZH) |
| WP17 | Accessibility: heading order, no nested controls, dialog semantics | 🔨 | 54f8199b | heading order and split row links live; dialog semantics arrive with the Wallet (WP14) and the slip (WP5) |
| WP19 | Platform: analytics events with their `source`, empty states, static skeletons, landing flags | ⬜ | | ⛔ No client event emitter exists: the only events in `src/` are a `page_view` and the `/api/pv` beacon, and `gtag` is not exported. Any `deposit_tap` must respect `gaExcluded` and consent |
| WP20 | World-benchmark: board search (16px so iOS does not zoom), the 7-day line at 640+, loading skeletons at final heights | ⬜ |  | ✅ **R11 UNBLOCKS THIS**: the 7-day line is TRIMMED below 640, not removed (D49 stands over the delivery). Still to build: the board search (16px so iOS does not zoom) and its empty state, and the loading skeletons at final heights — which is also where **R14's 24px skeleton over-reserve** is fixed |
| RG | Drop the RG line above the footer; chat bubble hides under a sheet | 🔨 | 54f8199b | RG line dropped, live 2026-09-26 (R4(5)); the chat bubble under a sheet ships with D3 (R4(7)) |
| V15 | Gate: first screen at 360 × 740 | ✅ | 54f8199b | production 2026-09-26: 0 findings; RED PROVED on production |
| V16 | Gate: no promised winnings | ✅ | 54f8199b | production 2026-09-26: 0 findings; RED PROVED on production |
| V17 | Gate: no 0% or 100% price | ✅ | 54f8199b | production 2026-09-26: RED PROVED; its findings were WP6's — 0 on production 2026-09-27 after `31662831` |
| V18 | Gate: every market shows price or state, time, pool, source | ✅ | 03cf7df9 | **0 on production** 2026-09-28 across 33 base cells, from 1,584 the day before — WP3 + WP4 landed the `data-market-*` attributes it reads. **RED PROVED on production** (`RED=V18 RED_PART=order --cell=base-1280-sw`: the plant moved the source after the pick, V18 0→1, no collateral). ⚠️ Its `before()` was RELAXED the same day and the product was right: it demanded the two rects OVERLAP vertically before accepting "on its line and left of it", which is 3px too strict on a three-column row with a tall left column. Measured at 1280: source y 1277–1293 x 24–685, pick y 1230–1274 x 979–1256 — three pixels of vertical miss, three hundred of horizontal clearance, and the frame looked at. Teeth unchanged: later in the DOM still caught, and BELOW the pick while horizontally overlapping it still caught (the phone layout, the defect it was built for) |
| V19 | Gate: Withdraw as reachable and as large as Deposit | ⬜ | | |
| V20 | Gate: sheets trap focus, close on Esc, respect the safe area | ⬜ | | |
| V21 | Gate: the placement map, by bounding box | ⬜ | | |
| V22 | Gate: the bottom rail and its centre coin — centred ±1px, a 14px rise, the coin's rect inside a needle keep-out, the rail's row height unchanged, the footer's reserve still clearing it, no English rail label ellipsised | ✅ | 37bde8a5 | production 2026-09-28: 0 findings; **RED PROVED** on production (`RED=V22 --cell=base-360-sw`, plant moved the coin 154→174, V22 0→1, no collateral). ⚠️ Asserts the RISE rather than the CSS value: the concept's rail has 56px slots and ours has 64px, and `margin-top:-14px` — the obvious reading — measured a **7px** rise. ⚠️ Not applicable at ≥1024 (`lg:hidden`) and says so rather than passing. ⚠️ "/results marks More as current" is NOT in it — a different route, and More's items are not in the DOM until it opens; it belongs with `test:section-rail` |
| V23 | Gate: motion audit — transform/opacity only, no per-second page re-render, timers pause when hidden | ⬜ |  | ✅ **R12 UNBLOCKS THIS**: it forbids animating anything that triggers LAYOUT — width, height, top, left, margin, padding — and allows transform, opacity and `filter`. Written against the reason behind the delivery's wording, because the wording as written convicts `.gilt-metal:hover`, the coin's own fill |
| V24 | Gate: board search filters within one frame; the empty state renders; the 7-day chart's presence follows its width rule | ⬜ |  | ✅ **R11 UNBLOCKS THIS**: it asserts the 7-day line is TRIMMED below 640 and full from 640, not that it is absent. Still behind WP20's search |
| V25 | Gate: one Deposit per screen (UPDATE-2026-09-28 §5) — below 1024 none in the header, exactly one in the rail, none in the hero below 640; at 1024 and up no rail, at most one header pill, none for a visitor | ✅ | 37bde8a5 | production 2026-09-28: 0 findings; **RED PROVED** on production (`RED=V25 --cell=base-768-sw`, plant injected a second header Deposit, V25 0→1, no collateral). ⛔ Population is scoped by REGION, never page-wide — `cashback-promo.tsx` is a legitimate second `/wallet/deposit` CTA. ⛔ Counts what is RENDERED, not the DOM. ⚠️ The signed-in FLOOR at ≥1024 is not asserted: "exactly one" cannot tell a held wallet (correctly none) from a missing pill, because the rail that reveals held is gone at that width. Measured on a local seeded host instead (Ali's ruling, 2026-09-28) |
| GATE | `qa:landing-ten` V1–V14 clean on production (V3, V14 open by R4); `npm run test:all` + typecheck green | ⬜ |  | **Production 2026-09-28 after `03cf7df9`, 33 of 33 base cells measured — 20 of 22 classes CLEAN**: V1, V2, V5–V18, V21, V22, V25 and V8 all 0. **V12 0** (it read 36 for one day — see below) and **V18 0** (it read 1,584). Two classes remain, each with a named owner that is not this programme's: **V3 ×12** the chat bubble over a price on phones — Ali's open call; **V4 ×36** `.ticker-pause` at 40×31, the LIVE strip's own control, sized to the strip on purpose by that lane (§0 trap 11). ⭐ V12's 36 were the gate being WRONG and the product being right: C1 made a one-sided settlement report "refunded", which is true — every stake goes back at zero fee when one pool is empty — and V12's rule predated that state. The strip now emits `data-settled-reason` and V12 is narrowed to the dishonesty it was born for (a decided market NOBODY STAKED), with a missing reason still treated as the finding. `test:all` is red on OTHER lanes' ratchets (type-scale, stacking, tap-target, decomment, eyebrow-roles, two red-anchors §3 anchors) — each red on clean `origin/main` too. R4 |

> **Instrument defect found and fixed, 2026-09-28 (with V22/V25).** `--red` returned BEFORE the sign-in
> block, so **no `signedin` cell could ever be red-tested**. V25's own control is specified as "restore the
> old wrapper and catch it at 768", and the pill it restores renders only for a signed-in player — so the
> control for the class could not reach the state the class is about. Sign-in now runs first and both runs
> take the session; a signedin cell with no session exits **INCONCLUSIVE with its reason**, never a verdict.
> Proven on production the same day: `RED=V25 --cell=state-signedin-768` reached the attempt and reported
> INCONCLUSIVE (`mobile01` sign-in is failing there), where before it would have silently measured a
> signed-out page and called the answer PROVED or BLIND.

| PANEL | The eight-reviewer re-score, recorded below | ⬜ | | |
| FUNNEL | Visitors → sign-ups → first pick, measured before and after launch | ⬜ | | |
| SW | Native Swahili sign-off of every new sw string | ⏳ | | Ali |
| ZH | Native Chinese review of every new zh string | ⏳ | | Ali |
| DEV | Real devices: low-end Android on 3G, iPhone SE Safari, Android at 130% text | ⏳ | | Ali's handsets |

## §2 · The build plan — how each row is built

Written 2026-09-26 from a read of the code at `4015e3b5`, every function below checked to exist by
name. ⛔ **It cites functions and files, never line numbers** — lines rot within a day on this repo.
If a name here no longer resolves, fix this section in the same commit as the code.

### §2.0 · Order, and why it differs from the delivery's

The delivery asks for WP1 → WP17 in number order, one PR each. This repo pushes to `main` (live), so
a "PR" is a commit, and rows ship in **deploy batches**, each verified on production before the next:

| Batch | Rows | Why here |
|---|---|---|
| D0 | D0 | The filing and this tracker, so any machine can resume |
| D1 | WP2 · WP8 · WP10 · WP11 · WP12 · WP13 · WP17 · RG | Server-rendered landing sections: `/` only, no money path, no shared chrome |
| D2 | WP3 · WP6 · WP4 · WP9 · WP14b · V16 · V17 · V18 | Market surfaces. `market-card.tsx` is shared with `/markets`, `/results`, `/watchlist` and the detail page, so every change here is **sitewide** and those pages are re-shot too |
| D3 | WP5 · V20 · RG (bubble) | The pick slip: a new way to reach the bet path. Full `npm run test:all` before this push |
| D4 | WP14 · V19 | The Wallet is global chrome, on every page; it goes last so the parallel ticker lane's `app-shell.tsx`/`globals.css` edits are merged first |
| D5 | WP15 · V15 · V21 · PANEL · FUNNEL | The whole-page checks, once the layout is final; the production gate; the eight-reviewer re-score |

A gate class is built **with** the row it certifies and its RED plant must PROVE against the built
feature (a plant against a feature that does not exist yet cannot prove anything).

### §2.1 · The rows

**WP2 · Hero** — `src/components/home/landing-hero.tsx`, `.kp-hero*` in `globals.css`, `src/app/page.tsx`,
`src/lib/server/payout-rails.ts`, `src/lib/rail-list.ts`, `FIRST_LICENSED_EVIDENCE()` in `src/lib/support-config.ts`
- ⭐ **HERO v3 — rebuilt 2026-09-27 from `specs/hero-v3.md` under R7, R8 and R9** (branch `landing-v3-hero`; not
  live until it is merged, rendered and measured). This note describes the v3 hero. The first build (`54f8199b`,
  measured on production 2026-09-26) had an English `<h1 lang="en">` over a sw/zh sub-line and its trust lines
  after the card; both are gone.
- **One DOM, source order = screen order: claim → h1 → lede → trust rows → featured card → CTAs → sign-off.**
  From 1024 the intro (claim, h1, lede, trust rows) and the act (CTAs, sign-off) share the left column and the
  card takes the right, by grid areas — never a second DOM, never a CSS `order` (keyboard order = screen order).
- **Claim** — `p.kp-hero__claim`, a class of its own (the shared eyebrow also dresses the section labels):
  `FiftyWordmark` 15 + a 1px `--border-strong` rule below 1280, then the text in JetBrains Mono 600, 13px,
  capitals by CSS, `--text`, 0.14em (the shared list). State P — *"Tanzania’s first licensed prediction
  market"* / *"Soko la kwanza la utabiri lenye leseni Tanzania"* / *"坦桑尼亚首家持牌预测市场"* — renders only while
  `FIRST_LICENSED_EVIDENCE()` is set (R9, 2026-09-27); `null` returns every language to state N, *"Licensed
  prediction market · Tanzania"*. "Licensed" is in both.
- **h1** — `home.heroAsk` filled by `sideWord(t, …, "MARKET")`: *"NDIO au HAPANA?"* / *"YES or NO?"* /
  *"是还是否？"*, with NO `lang` (R7(3)). Side words Sora 800 in the buttons' inks (`--hero-yes/no-accent`,
  re-pointed 300 → 400), the connective Sora 400 `--text-muted`, "?" `--hero-text-strong`; 44 · **60 from 640**
  · 72 from 1280; line-height 1.0; tracking −0.030 / −0.038 / −0.045em (zh 0 at 1.1). "NDIO au" and "HAPANA?"
  never break inside. Claim + h1 are one `hgroup.kp-hero__lockup`.
- **Lede** — two designed lines: `home.heroLedeAct` (Inter 500, `--text`) and `home.heroLedePay` (Inter 400,
  muted); 17 below 561, 20 above.
- **Trust rows** — `ul.kp-hero__trust` (class kept: V8, V21, capture.mjs), in the intro, the same for a visitor
  and a player: row 1 = `.kp-rg__18` + `footer.licensedByGbt` + the helpline `tel:` (`footer.helpline` +
  `HELPLINE()`, Inter 400 tabular, 1px underline, ±13px reach); row 2 = `I.mobileMoney` + `home.heroRails`,
  whose `{rails}` is `railListParts(locale, heroRailNames(killSwitches))` — `Intl.ListFormat` disjunction over
  the rails whose payout path is live (catalogue ∩ `WithdrawSchema` ∩ `DepositSchema` ∩ a wallet-cashin code,
  less any paused rail; R8(6)). Today: M-Pesa, Airtel Money, HaloPesa, Mixx by Yas. No rails → no row.
  ⛔ Not in the hero any more: the RG sentence (R7(2) — the footer keeps it on every page) and "named sources"
  (the card names its own source).
- **Act** — visitor: `home.heroStart` + arrow · `home.heroBrowseAll`, then the sign-off `p.kp-hero__signoff`
  (`FiftyMark` 20 simplified, aria-hidden, + `home.heroHeadline` inked, `lang="en"` — the hero's only `lang`).
  Player: `SignedInAct`, unchanged.
- **Keys:** NEW `home.heroClaim`, `heroClaimFirst`, `heroAsk`, `heroLedeAct`, `heroLedePay`, `heroRails`,
  `heroStart`. DELETED `home.heroLocation`, `heroEst`, `heroHeadlineSub`, `heroBody` (the hero was their only
  reader). `home.heroHeadline` keeps its value and becomes the sign-off. sw `footer.licensedByGbt` and
  `footer.stopGambling` corrected (COMPLIANCE-DECISIONS 2026-09-27).
- The 18+ roundel takes a neutral ink site-wide (R7(5)). Phone spacing: padding `--sp-5 --sp-4 --sp-8`, grid gap
  20, lockup 8, intro 12, +4 above the rows (8 / 12 / 16 / 20); from 768 lockup 12, intro 16.
- The proof rail, the conviction bar and the closing-soonest board stay **below** the hero (`LandingProof`).
  The faint dial drawing stays removed (R4(1)). The entrance stagger (`.kp-hero__inner > *`) is untouched.
- **Guards:** `test:hero-copy` + `red:hero-copy` (NEW — the "first" gate, the question, the wallets, no warning
  sentence / one `lang`, no over-claim; 18 plants, MISSED 0); `test:landing-mine` §3 re-pointed at the intro;
  `test:i18n`; `test:contrast` (hero pairs on `--bg-overlay`). Live gate: 360 × 740 cells, **V21** (trust rows
  and `tel:` above the rail below 640), **V22** ("first" only with its evidence), `.kp-hero__claim-text` in the
  V8 text map and V8b; capture.mjs records claim / h1 / lede / rows / `tel:` / sign-off rects.
- ⚠️ First-screen budget: spec §7 MODELS the sw 360 × 740 YES/NO bottom at ≈610 against a rail at ≈675 (65px
  clear). A model, not a render — V15 and V21 on the 360 × 740 cells decide.

**WP3 · Featured card** — BUILT on branch `landing-v3-wp34` (2026-09-27, not live). `market-card.tsx` (the `featured`
variant; landing-only `sourceName` / `closesOn`; sitewide `msLeft`), `TippingBar` `mark` (`brand.tsx`),
`lib/markets/featured.ts`, `lib/markets/source-host.ts`, `price-state.ts` (`dayAgoYesPct`), `time-left.ts`
(`closesWithinTheHour`, `HOUR_MS`), `eat-day.ts` (`formatEatDate`), `source-registry.ts` (`sourceNameFor`),
`market-history.ts` (`cardChartFrom`), `hero.ts` (`HeroRow.sourceName`), `page.tsx`, `landing-hero.tsx`
- Time left top-right (`.mcardp-closes`: the meta row's rung, `--text` — time is not a side); the meta row keeps
  only the info button there.
- The question is whole from 640 (h4, h3 from 1024) and **clamps at 3 lines below 640 in every language** — the
  hero v3 unit leaves WP3 about 65px at 360 × 740 in Swahili (`specs/hero-v3.md` §7). L25.
- The meta line "Closes 27 Sep · Settles on {source}" (`market.closesOn` over `formatEatDate`; `market.settlesOn`)
  is a sentence at the reading floor in body type (L24). The NAME is `sourceNameFor`: the registry's label
  through the ONE host rule (`sourceMatchesAny` — `evilkitco.com` never borrows "Kitco"), the most specific
  registered domain first, a disabled or re-categorised source still named, else the bare host (`sourceHost`,
  moved out of `trust-band.tsx`); resolved on the server, the registry read once per page (a failed read falls
  back to the host). Text, never a link (L27). From 640 it sits under the question; **below 640 it is SHOWN under
  the YES/NO row** (CSS `order`, the V15 budget) and stays before the pick in the reading order (K36, L28).
- The landing's grid cards name their source too, in the question column (`sourceName` — landing only, so the
  `/markets` card and its skeleton do not move; `test:featured-card` §3.1).
- The 24h mark: `TippingBar mark={dayAgo}`, a still 2px `--text` hairline (≥ 3:1 on both fills' worst stops,
  `test:contrast`) at `dayAgoYesPct` = the printed price − `move24h` on the needle's 6–94 scale, and "▲n · 24h ago"
  (`market.h24Ago`, led by a key in the mark's shape) on the move-line row the card always had — no new row.
  Featured, live and priced only. `move24h` is measured between two PRICES (C1) and, since WP3, two READINGS
  (L26) — sitewide, so `/markets`' 24h move and its "move" sort follow.
- The featured bar is `role="img"` named by the whole split (`market.barReading`, "62% YES, 38% NO" in the card's
  own side words); every other card keeps its `progressbar`.
- SOON (L17): `closesWithinTheHour(msLeft)` — the milliseconds of betting left, from the label's own deadline
  and clock, passed by every live call site (`/` featured and grid, `/markets`, the detail page's similar cards,
  `/watchlist`). It now fires in sw and zh.
- The predictor floor (R7): `FEATURED_PREDICTOR_FLOOR` = 10. Below it the featured card withholds its count and
  its crest row — the pool still states depth — and says so to the gate (`data-market-predictors` below
  `data-market-depth-floor`). Every other surface states its count (K48). L29.
- V18's instrumentation (`data-market-surface`, `data-market-part`) on the card, and the defect V18 named: a live
  card whose only bettor cashed out now reads "No pool yet" under its rail (the D29 word, never "No bets yet").
- Not adopted, to keep the first screen (V15): the concept's 21–26px question below 640, the 10px bar, the 20px
  "24h ago" row under the bar, the separate YES | delta | NO price row.
- Guards: `test:featured-card` (predeploy, after `test:one-sided`) + `red:featured-card` (9 cases, declared in
  `scripts/anchors/featured-card.anchors.mjs`); `test:contrast` (the mark on both fills); `test:betting-ink`
  (`.mcardp-closes`); `test:one-sided` 3.6 and `test:outcome` D29 amended for the attributes. Local drive:
  `scripts/qa/landing-v3/verify-wp34.sh` (+ `featured-budget.mjs`, `wp34-seed.mjs`; the dev-only
  `/api/dev-test/backdate-history` and `fast-forward-market`'s `selectionSeconds` exist for it).

**WP4 · Question board rows** — BUILT on branch `landing-v3-wp34` (2026-09-27, not live). `QuestionRow` and
`LandingProof` (now given `nowMs`) in `landing-hero.tsx`, `.kp-qboard` / `.kp-qrow*` in `globals.css`
- The row is an `<li>` (the board a `<ul role="list">`) of three SIBLING zones, never one link (WP17): the head
  link (question + meta, at least `--h-control-md` tall), the reading (price or state · time left · a 6px
  `TippingBar`, `aria-hidden` beside the line that says it), and the pick — YES@ / NO@ as two `btn-md` links to
  `/markets/{id}?side=YES|NO` (`prefetch={false}`). Until D3 one href serves both: a player lands with the side
  locked, a visitor keeps it through sign-up (`next=`); from D3 they open the pick slip.
- Phone: title → meta → reading → the full-width pair; from 640 the title and the reading side by side and the
  pair below at its own width; from 1024 one line. Written mobile-first — the old 821 / 560.98 blocks, the hover
  indent (D25) and the lean rule are deleted. The title keeps its 44ch measure (now in CSS) and its 3-line phone
  bound (U6).
- The price state from the pools (`priceState`, WP6), with ONE label for the slot and the rail: one side → "One
  side only", the dashed rail, bare YES/NO and the refund note (`.kp-qrow__note` shares the card note's rule);
  empty → "No bets yet" only where nobody ever bet, else "No pool yet" (the D29 rule — a cash-out never
  decrements `predictorCount`). The price reads `--yes-300` (it names the YES side, §B2a), never gilt; the time
  left `--text` (`test:betting-ink`).
- Meta line: `market.closesOn` ("Closes 27 Sep", `formatEatDate`) · `market.settlesOn` (the SAME `sourceNameFor`
  name the cards print — one resolver, carried on `HeroRow.sourceName`) · `common.pool` + the pool · the predictor
  count; body type, the money and the count mono (L24). The close date stands in for the concept's competition
  (no such field; SPEC-VALUES §6). The category glyph is gone (the concept has none). No 24h mark on a row, no
  share (WP14b).
- Guards: `test:one-sided` 4.3 amended (the D29 label) and 4.6–4.9 added, each with a control; `red:one-sided`
  +2 cases (the rail, the gated "@ n%"); `test:betting-ink` (`.kp-qrow__left`); `test:featured-card` §6 (every
  V18 part on the row). Local drive: `scripts/qa/landing-v3/rows.mjs` (+ its RED); the gate's V8 text map reads
  `.kp-qrow__meta` / `.kp-qrow__note`; `scripts/live/mobile-visual-drive.mjs` reads `.kp-qboard > .kp-qrow`.

**WP5 · Pick slip** (R2) — new `src/components/markets/pick-slip.tsx` (client)
- Below 1024: `Modal` from `src/components/ui/modal.tsx` with `sheet` — which today docks only below 640,
  so it gains a way to dock below 1024 — plus a drag handle and `env(safe-area-inset-bottom)` padding.
  From 1024: the same content inline in the card or row. New portals are banned (`test:design-frozen`),
  so the sheet goes through `Modal`.
- Contents: time left · question · "Your pick: SIDE" · four chips from `quickStakes(min, max)`
  (`src/components/updown/stake-math.ts`; at a 1,000 minimum these are 1,000/2,000/5,000/10,000), with
  `min`/`max` from `stakeBoundsForMarket` (`src/lib/server/market-service.ts`) — never a literal ·
  Confirm in the side's colour, 54px, full width · the minimum stake and the rule line (the fee from the
  market's rates via `ratesFor` + `describeFeeModel`, never a literal: `test:rate-copy`) · Set limits ·
  Take a break · Cancel.
- Confirm posts `marketId`, `side`, `stake` and an `idempotencyKey` to `buyPositionAction`
  (`src/app/markets/actions.ts`) — the same action the dial uses, so every limit, break, wallet and KYC
  check is the server's. **No payout figure and no estimate** anywhere in the slip (law 40, R3).
- A visitor never opens the slip: YES/NO sends them to `/auth/register?next=/markets/{id}?side=SIDE`.
- After placing: "Placed. You're with {share}% of the money on {side}" — that side's pool share after the
  stake, not a payout — and "Share on WhatsApp", built by `ShareButton`'s own link builder
  (`card-share` allows only `share-button.tsx` to build a market share link). New key `common.shareWhatsApp`.
- Chat bubble (R4(7)): `.cm-fab` hides while a modal sheet is open, read from the DOM the way
  `isModalDialogOpen()` (`src/lib/modal-open.ts`) does. `test:stacking` pins the bubble's
  `bottom`/`zIndex` lines; leave them.
- Verification: place a real bet on the local in-memory store through the slip at 360 and 1280; check
  the wallet debit and the position; Esc, backdrop and Cancel all close without betting; focus stays
  trapped; the confirm cannot double-submit.

**WP6 · One-sided markets** — BUILT. `src/lib/markets/price-state.ts`, `market-card.tsx`, the seven `<MarketCard>` call sites, `landing-hero.tsx` (`QuestionRow`), `hero.ts`, `landing.ts`
- ONE pure helper, `priceState(yesPool, noPool)` (no imports, no "use client" — the card and the server
  pages both call it): nothing staked → `none`; money on one side only → `oneSided` + the empty side;
  both sides → `priced`, shown within **1–99** (L14; the NO figure is always 100 − YES). `priceTier` is
  the same answer as 0/1/2 for the orderings. ⛔ Never inferred from a rounded 0/100, and `pricedYesPct`
  is unchanged (the conviction bar, the topic lean and the odds filters read it; `test:hero-contract` §1).
- The card takes **`yesPool` and `noPool` as required props** in place of `yesPct`/`volume`, at all seven
  call sites (`markets/page.tsx` ×2, `markets/[id]/page.tsx` ×1, `page.tsx`, `results/page.tsx`,
  `watchlist/page.tsx`, `landing-hero.tsx`) — the `impliedYesPct(m)` and `yesPct ?? 0` feeds are gone.
- One-sided card: the em-dash in the price slot; "One side only" on the move-line row right above the
  rail (the price caption's micro-label, in every phase); the dashed `--bar-empty-track` rail named "One
  side only" (never "No bets yet" — money is on it); no 24h sparkline; the YES/NO buttons stay (taking
  the empty side is what prices the market) with no "@ n%" on screen or in their names; no TIPPING badge.
- The note, a sentence at `--type-small` (L6) capped at a 60ch measure: "No stake on {side} yet. If betting
  closes one-sided, every stake is refunded in full." — ONE conditional sentence in every unsettled phase
  (the delivery's "No one has picked" is false after a cash-out empties a side somebody picked, L22);
  settled or void — none (the card cannot see what was paid). ⛔ A closed-phase "will be refunded" variant
  was built and withdrawn before shipping: a sentinel-CLOSED market can be put back to LIVE by
  `adminReopenMarket`, and one stake on the empty side ends the refund. Its truth is pinned:
  `test:one-sided` §6 reads `settleMarket`'s one-sided branch and rules §7. sw is rules §7's own sentence;
  zh names the state with the rules' 单边.
- The hero board row reads the same helper: "— One side only", no lean rule — and since WP4's rebuilt row, the
  dashed rail, bare YES/NO links and the refund note too.
- Orderings: the hero's floor tiers by `priceTier` (pools). `landingGrid` gives the seats to priced markets
  first and then SHOWS the seated cards in the lens order its heading states ("Biggest pools first") — a
  partition, never a filter (`test:landing-contract` §4, L23).
- Guards: `test:one-sided` + `red:one-sided` 8/8 (incl. the settlement branch); `test:outcome` D29 pin
  amended; `hero-contract` §5d; `landing-contract` §4; the three harnesses' anchors declared in
  `scripts/anchors/`. Drive: `npm run qa:landing-v3:wp6` (`verify-wp6.sh` + `seed-onesided.mjs`).
- One rule for every row: `shownYesPct` (the printable price, null on an empty OR one-sided pool) is the
  `yesPct` of the `/markets` rows and the hero rows, so the odds filters and "closest call" no longer file
  a NO-only market under long shots at 0%; and the detail page prints a two-sided price as the card does
  (a 200,000-vs-1,000 market reads 99 on both, B6).
- ⚠️ NOT this row's, left with MOBILE-VISUAL U32 (ruling 13's other surfaces), each still printing 0/100
  on a ONE-SIDED market: the detail page's bar, side picker and JSON-LD (and its callout still says "One-sided
  win" and "before resolution" where the rules say "at closing"); `/live`'s pulse grid and featured contest;
  `/results`' featured result. (The detail page's metadata and `/api/og/market` moved to WP14b and read the rule.)
- Accepted, recorded: a closed or settled one-sided card gains the label row (one gap + 4px); on the
  landing grid one card with a note stretches its row (`grid-auto-rows: 1fr`) — WP9 gives every grid card
  the same slots.

**WP7 · Estimate line** — ⛔ not built (R3).

**WP8 · Proof rail and conviction** — `landing-hero.tsx`, `.kp-proof*`
- Below 640: three ledger rows, label left and figure right. From 640: three columns.
- The conviction bar's accessible label is the full `home.heroConvRead` reading, not "YES probability".
- The live pip stays on the open-markets figure only. `test:betting-ink` §1 pins that markup.

**WP9 · ONE BOARD** — `src/app/page.tsx` (the grid band), `src/components/home/landing-hero.tsx`
(`LandingProof`), `src/lib/markets/hero.ts`, `src/lib/markets/landing.ts`
⚠️ **THIS ROW WAS THE v3 SPEC ("Pick-a-side grid" — a phone snap rail) UNTIL 2026-09-28.** The v4
delivery replaces it: the grid and the hero's board are the same open book in two shapes, and one of
them goes. Scope is **R15**, which departs from the delivery in one place — read it first.
- **Delete the `.market-grid` band from `/`.** The CLASS stays: `/markets`, `/results`, `/watchlist`
  and `/live` use it too. Only the landing's use goes.
- **Keep the topic tiles (WP10, ✅ and measured).** They list TOPICS, not markets, and repeat nothing.
  R15 explains why the delivery's own reason does not reach them.
- **The board grows 4 → 7 rows** (`QUESTION_BOARD_SIZE`), which is exactly the 3 the grid gave up. The
  page still shows 8 markets — `landing.ts`'s header records that 8 was chosen deliberately.
- **The board takes the grid band's header**: the eyebrow that NAMES the ordering, the h2, and
  "All N markets →". A heading that states the sort order is what makes the list a claim rather than
  a sample — `landing.ts` says so, and it is the one part of that band worth keeping.
- **The toggle (Closing soon | Biggest pools)** switches between orderings COMPUTED ON THE SERVER from
  the one board read. ⛔ Never re-sorted in the browser: `landingGrid` picks by price tier and displays
  by lens with a degeneracy floor, and a client-side re-sort would be a second, quietly different
  implementation of a rule about money. `role="tablist"`, 40px, no new query.
- **Guards that move with it** — each is a real edit, not a rename: `landing-contract.test.mts` §4 ("the
  grid is never short"), `count-truth.anchors.mjs`, `betting-ink.test.mts`, and the two drives
  `c1-drive.mjs` and `mobile-visual-drive.mjs`. `test:needle-rest` §4 sweeps `/` at 360 and 768 for the
  parked Needle resting on a control, so the new row heights are its business too.
- **V14's landmarks are SAFE** because the tiles stay (`.kp-topic`). Had they gone, §0 trap 5 applies:
  the gate's landmark selectors are class names and a rebuild re-points them in the SAME commit.

**WP10 · Topics** — `src/components/home/topic-tiles.tsx`, `.kp-topics`
- "All topics" becomes the section header link. Six tiles, ordered by live count, **Other last**; two
  columns on phones, three from 1024. Slice to six **at render only** — slicing `comp.topics` breaks
  `landingTopicsReconcile`, which the gate runs.

**WP11 · How it works** — `src/components/home/how-it-works.tsx`
- Step 2's title becomes "A named source" (all three locales). Step 3 states the fee as a number read from
  config (`getEffectiveConfig` → `describeFeeModel`), passed in as a prop; the string carries `{pct}`.
- The step-2 body keeps the dictionary's two-officer clause verbatim (MOBILE-VISUAL ruling 15).

**WP12 · Up & Down band — R5, "the Match"** — spec
[`specs/updown-band-v2.md`](design-system/v4-2026-09-26-landing-ten/specs/updown-band-v2.md) (the design, its
states, sketches and verification; this row is its summary). The price-line chart and countdown ring (✅
`54f8199b`) were replaced by ruling R5 (Ali, 2026-09-27: the chart was not understood).
- **Data, zero new queries.** `getRoundDetail` reads the asset's confirmed reads ONCE (`roundReadWindow`) for
  the round-page hero (`seriesFromReads`, unchanged) and the band (`roundReads`, `readCadenceMs`); a store error
  is `null`, never "no reads". The picker (`src/lib/server/updown-band-round.ts`): ≥ 2 min of betting left ·
  seasoned (≥ 3 min old) first · the shortest duration · the most time left · three candidates; the first with a
  confirmed read after its open wins, a kick-off round is the fallback, and the walk stops at the first young
  candidate — usually one `getRoundDetail`, never more than three. `toUpdownBandRound` reduces it to the band's
  type (`src/lib/updown-match.ts`), which carries NO money field (law 40).
- **Shows (sw, 360):** the fixture (`AssetMark`, name, the kit Chip "15 DAKIKA") and ONE clock line "Dau linafungwa
  baada ya 07:42" (baseline-aligned, a fixed 20px row open and closed); the plate — the verdict ("↑ Juu inaongoza",
  settlement's own `decideOutcomeByTargets` on the newest confirmed read), its dated detail as two no-break clauses
  ("saa 14:26" · "Juu ya ufunguzi kwa $18.52"; below 360 they stack and the "·" hides) and the Up/Down links IN the
  plate, solid and equal, never lit. The words block has ONE height in every state (verdict + two lines; below 360
  sized for kick-off's two verdict lines), words centred, so no refresh, aging or first read moves the picks (the drive
  checks it per width). The match track: a stem per confirmed read on a fixed open → close domain, the lock post at
  bets-close, the flag at the deciding price; three layers (neutral time → playhead → marks); beside a fresh read the
  playhead line is not drawn and "now" is the bright end of the played stretch; just past the lock it parks on the post;
  the void band only in the level state. The rule in two sentences ("Bei ya saa 14:32 inaamua. Tofauti na ufunguzi
  isipofika $0.40, kila dau linarudi." — the margin held to its phrase by a no-break space in all three languages);
  "Raundi zote ›". Level: "Hakuna anayeongoza · saa 14:26 · Tofauti na ufunguzi $0.20 tu" + "Ikifunga hapa, kila dau
  linarudi." (the "— haitoshi kuamua" tail restates the verdict and is not shown on the band). Aged (betting open):
  "Juu iliongoza" muted + "Bado hakuna bei mpya.", the newest stem and bead at the 70% ink. Closed: "Dau limefungwa"
  + "Tazama raundi hii" (focus moves there from a pick, and to "Cheza raundi ijayo" from "Raundi zote"), padlocked sides,
  "Cheza raundi ijayo ›". Past the deciding instant: the headline "Inasubiri matokeo" (never the last lead), the rule
  in the past ("iliamua"). The picks link to `/updown/<id>?side=UP#stake`: the round page's stake panel scrolls itself
  into view (after the router's own scroll) with the side Chip, the countdown and the confirmed price above it.
- **Honesty.** Every verdict is dated and turns past tense ("Juu iliongoza") when its read goes stale by the
  terminal's own rule (`src/lib/updown-quote-age.ts`, shared) or at the deciding instant — on the server and on the
  client wrapper's `data-aged` (no `:has()`). No absolute price, no pool, no "live" beside a number. Level lines
  never name a side. At bets-close: "Dau limefungwa" + "Tazama raundi hii ›" in the clock row, padlocked inert
  sides in the picks' box, "Cheza raundi ijayo ›" as the primary; focus moves off a pick.
- **R5(a) · the 60-second refresh**, built in: while the tab is visible the band's wrapper
  (`updown-match-state.tsx`) re-reads the asset's newest CONFIRMED read from the public
  `GET /api/updown/history?asset=…&range=15M` (no new route) and folds it in with `mergeConfirmedRead` — the same
  round type, stale rule and target comparison (pinned equal to settlement's); a failed read changes nothing; it
  stops at the deciding instant. A read that landed while the tab was hidden and was superseded is not drawn (the
  verdict always reads the newest).
- **The round page (spec §12 and the panel's continuity fixes):** "Confirmed price"; the band's dated move line under
  the price at 13px ("Juu ya ufunguzi kwa $18.52" · "imenukuliwa 18:55:02 EAT", stacking below 400); the stats stack
  left below 400; the title wraps with the game's name whole; a signed-out player who tapped a side sees it in the
  stake panel (the band's arrow in the kit Chip).
- **The round page agrees (spec §12):** "Confirmed price" (was "Live price"); while open the quote stamp joins the
  move line; the hero's ink follows the targets (`price-hero.tsx` `tone`, `data-tone`); a level read says the band's
  own "Only $0.20 from the open — not enough to decide". The `/updown` card and terminal follow in F1 (R5(c)).
- **F1 · the `/updown` card and terminal agree (R5(c), branch `landing-v3-f1`, 2026-09-27):** the card names its figure
  "Confirmed price" / "Close" on its own row and inks it by the targets (`valueTone`), muted with the band's level
  words between them; the terminal's live line wears the in-play round's side (`liveLineToken`, gilt with none) and is
  named under the pane; the card's trust line, win-target heading and quick-bet sentences reach 13px. Guard:
  `test:updown-match` §11b (a planted by-the-open ink must fail) · `test:contrast` F1 pairs.
- **Platform-wide, found by this unit:** the solid buttons' hover lift only where a pointer hovers (touch :hover lit
  the tapped side after Back — a lit leader); "tokeo" → "matokeo" (6 keys); "juu au chini" / "higher or lower" never
  split.
- **Motion:** the digits (1/s) and the playhead (on quarter-percent moves) ride the page's one shared second; no
  pulse on the band (the page keeps one loop, the live dot); the verdict's ink fades on the tense swap only.
- With no readable round: today's band, unchanged (S8). Full width (R4(6)).
- **Guards:** `test:updown-match` (in predeploy) · `test:chart-one-home` D5 + members · `test:betting-ink` §4 ·
  `test:contrast` R5 pairs · `red:chart-one-home`.
- **The local drive** (`scripts/qa/landing-v3/verify-band.sh` → `band-drive.mjs`, under the lock): one BTC chain of
  15-minute rounds with ±$0.40 targets; S8 → S4 → S3 → S2 → S1 with a confirmed read planted every two minutes
  through the dev-only `/api/dev-test/updown-observe` (the confirmed grid's own spacing); S5 and S7 by Playwright's
  clock; frames as viewport tiles. It runs the numeric frame gate `band-metrics.mjs` (spec §15.4; its RED control
  must report a wrapped caption AND a long band) and the agreement drive `band-agree.mjs` (§15.6) in S3, S2 and S1 ×
  sw/en/zh, plus: served-HTML spacing, the click-through, Back re-anchoring the clock, the focus move at close, the
  playhead parking on the flag, the void band drawn, and the R5(a) refresh bringing a newer read in without a reload.
- ⚠️ **S6 ("Awaiting price") is not producible by the engine** (found by the drive, 2026-09-27): E-83 — `advanceChain`
  never opens a round without its open price, so a refused open creates NO round and the band stays S8. The spec's
  "S6 before the open confirms" (§15.3) cannot happen; S6 appears only when the store read fails (`reads: null`) and
  is pinned by `test:updown-match` §8, not by a fault hook in a money store.
- ⚠️ **V18:** the band shows no pool and no source by ruling (R5(b)) and is outside V18's population (the
  featured card, the grid cards, the board rows). If Ali reverses R5(b), the band joins V18 with
  `data-market-part` tags.

**WP12 · Hallway test** (spec §15.7 — a ship gate). 8–10 adult Swahili speakers who follow football and do not
work in crypto; one mid-range Android at 360, default brightness; frames A (S1 sw), B (S4 sw), C (S1 sw without
the track) for 3 seconds each; Q1–Q4 asked in Swahili, answers verbatim. Pass: ≥ 80% on Q1, Q2, Q4 for A and on
Q2, Q4 for B; Q3 under 60% forces a rewrite of the refund sentence. Native review: one sw and one zh reviewer
(the strings the spec lists). **Replaced by R8 (Ali, 2026-09-27):** the build performs the native Swahili (and zh)
review and no human hallway test is waited for. **Record:** every band string passed the Tanzanian-usage review
2026-09-27 and lost its "drafted" marker (sw + zh); one change — the tagline "…saa itakapoisha?" (reads as "when the
hour ends") became the idiom "…muda ukiisha?". Checked on purpose: "saa 14:26" with 24-hour digits reads as clock
time (Swahili time never passes 12); "ndogo kuliko" (not "chini ya", which would collide with the side name Chini).

**WP12 · Frame rating** (spec §15.8 — every score 10 before shipping). Real local viewport tiles
(`scripts/qa/landing-v3/capture.mjs`): S1 at 360/768/1280 × sw/en/zh, S2–S7 at 360 sw and 1280 en, S3 and S4
at 360 zh, and the band → round-page click-through pair at 360 sw; four reviewers (UI/UX lead, graphic
designer, gambling-industry designer, accessibility + RG); a frame's score is its lowest; any score under 10
names the defect, is fixed, and the WHOLE panel re-scores. **Record (2026-09-27):** four reviewers as a workflow of agents that READ the real PNGs (UI/UX lead, graphic designer,
gambling-industry designer, accessibility + RG), 52 frames a round — S1 at 360/768/1280 × sw/en/zh + 320 sw + 1024 en;
S2–S5, S7 and S7 after the deciding instant at 360 sw, 320 sw, 768 en and 1280 en; S3/S4 at 360 zh; S8; the
click-through pair; Back; the R5(a) refresh. A frame's score is its lowest; each round was briefed with what changed and
what was declined (with the recorded reason), and the whole panel re-scored every frame.
- Round 1 (drive 2): 1 frame at 10, lowest 6 — the playhead painted over the newest stem, the detail broke
  mid-phrase, the plate jumped between states, the past-the-deciding-instant band read as a result, touch :hover lit
  the tapped side after Back (fixed platform-wide), the round page truncated its title and printed the band's answer
  at 9.5px.
- Round 2 (drive 3): most frames 8–9 — the playhead still fused with a fresh read, a dangling "·" at 320, the sw rule
  did not name the open, the timer's spoken name could be heard as a clock time.
- Round 3 (drive 4): 11 frames at 10, most 9, PAIR-2-b 4 — the #stake landing did not scroll, the level tail leaked
  back at 320, the picks moved between states at 320, "tokeo" → "matokeo" (native review, platform-wide).
- Round 4 (drive 7): 18 at 10, 34 at 9 — beside a fresh read any part of the playhead still read as a data mark,
  the landing hid the countdown and price, the Watch link's focus ring overran the Chip and plate.
- Round 5 (drive 8): 45 at 10, 7 at 8–9 — the landed slip still had no clock (the pool card sat between), the ring
  left the Watch link's chevron outside, "near" was only ~5.5px at 320.
- Shipped 2026-09-28 on the owner's word ("push live what you have now") with round 5's four fixes in (`2acefc9d`):
  they were not re-driven locally — the production re-measure (`verify-band-prod.sh`) is their check, and any
  finding it or a sixth round raises is the next band commit.
Declined, each with its recorded reason: stretching the picks to the plate's height (48px centred ±1px, §15.4);
moving the playhead out of the plot ("the playhead drawn as a line", §0); spending the section link's tap box (C13 —
the drive measured S7 +32px); dropping the S3 refund note (I-2); a content-length container query (not expressible).
The drive's own checks (`band-drive.mjs`, 19 of them) and the gate's RED control ran on every drive; the RED control
went blind once (drive 5: the fixed-height clock row hid a wrapped caption) and was fixed to count the caption.

**WP13 · Results strip** — `src/components/home/trust-band.tsx`, `toSettlementRow` in `src/lib/server/platform-stats.ts`
- Each row: outcome pill · question (a link) · settled date · **the market's own sign-off** · source (its own
  link) · amount paid in gold. The sign-off is derived inside `toSettlementRow` from the distinct values of
  `resolutionStage1By` / `resolutionStage2By`: two officers, one officer, or `AUTO_RESOLVER_ACTOR`
  (automatic) — no new query (L2).
- The trust band's claim becomes the section's `<h2>` (today its `<h3>`s sit under the Up & Down `<h2>`).
- A silent row keeps its grid tracks. Guards at risk: `test:ticker-honesty` §9 and `test:outcome`/
  `outcome-display` §4 regexes over `platform-stats.ts` and `trust-band.tsx`.

**WP14 · Wallet** (R1) — `wallet-balance-pill.tsx`, `wallet-sheet.tsx`, `ui/modal.tsx`, `top-app-bar.tsx`, `landing-hero.tsx`, `lib/server/landing-picks.ts`
- BUILT (part 1): the capsule's number is a `<button aria-haspopup="dialog" aria-expanded>` that opens the
  Wallet — `<Modal sheet sheetUntil="lg" anchorRef>`: a bottom sheet below 1024 (56px pair, grab handle,
  safe-area padding), a panel under the capsule from 1024 (right edges aligned, transparent scrim). The eye
  stays a sibling inside the capsule; the Wallet carries its own eye.
- The Wallet: the balance in gold labelled "Available" (the withdraw page's word — the whole balance is
  withdrawable since the bonus wallet went; "can be withdrawn now" is not always true, L19) · Deposit and
  Withdraw side by side at the same size, each with its own channel under it ("Mobile money or card" /
  "Mobile money", L19) · Set limits · Open wallet · Close. A frozen wallet says so and gets no money buttons.
- At zero: **the capsule stays and reads TZS 0** (R10, Ali 2026-09-28 — *"user should know he's 0"*), no
  Withdraw. ⛔ This REVERSES R1's "a gold Deposit takes the chip's place instead of TZS 0", which was live
  2026-09-26 → 09-28; the old line is struck in the manifest rather than deleted, because the pair is the
  record. The Deposit LABEL yields at lg–xl in every balance state now, for the same reason it always did
  — the capsule is beside it again (E-190). The bar decides with the LIVE balance (`useLiveBalance`), so an
  SSE deposit moves the figure without a navigation.
- Phone header with a balance (scenario 4a) — MEASURED, L20: the chip drops "TZS" below 640 (its aria-label
  keeps it) and the right cluster is 251 of its 278px at 360; a Deposit beside it needs ~48px, so the header
  Deposit keeps its yield below 640 and the pair is one tap away in the Wallet (and in the signed-in hero).
- Part 2 — the signed-in hero: Your picks (open · awaiting result · paid this week, read exactly as
  `/positions` reads them, L21), then the same Deposit/Withdraw pair, or the empty-balance prompt with
  Deposit and My positions; Set limits. The trust lines stay above it (R4(5)). A player with no picks gets
  one sentence, never three zeros; a failed read shows nothing. On phones the block follows the featured card,
  so it cannot push the card below the first screen.
- Guards: `test:wallet-reach` (amended to R1, §7 the Wallet; `red:wallet-reach` 6/6) and
  `test:landing-mine` (the rule driven, the EAT week, the hero's contract). Drives:
  `scripts/qa/landing-v3/wallet.mjs`, `hero-mine.mjs` (local), `wallet-prod.mjs` (production, mobile01).

**WP14b · Share** — BUILT. Card footers already carried `ShareButton compact` left of Details (`test:card-share`
pins it). What D2 adds:
- **The card share works on EVERY card.** A closed, resolved or void card used to BE a `<Link>` wrapping its body,
  share button included: the dialog's clicks bubbled to that Link and navigated, so on `/results` and
  `/watchlist` WhatsApp and Copy never happened and closing the dialog left the page (MOBILE-VISUAL S07-results-01,
  and the nested half of S07-results-26). Every phase is now one `<article>` with the stretched `.mcardp-open`
  link and Details a real link (`test:card-share` §7, `red:card-share` 11/11; drive `share-drive.mjs`).
- **The WhatsApp preview is true.** `src/lib/markets/share-preview.ts` applies the card's price rule to the
  og:image (`/api/og/market/[id]`) and og:description: "One side only." / "No bets yet." / "No pool yet." where
  there is no price, 1–99 where there is — never "YES 100%" or an invented 50/50. The market page's `openGraph`
  spreads `ROOT_OPEN_GRAPH` (it was a bare object: no og:type, og:site_name or og:locale on the page every share
  links to). `test:share-preview` (+ `red:share-preview` 5/5); production check `qa:landing-v3:og-prod` (fetch
  only, read with WhatsApp's user agent — Next serves bots a different document; baseline on 2026-09-27 failed as
  it should: 15 of 15 market pages without og:type/site_name/locale).
- "Share on WhatsApp" after placing is WP5's (D3), built into `PositionShare`, not a new component.
- ⚠️ An unknown market page answers HTTP 200 with Next's streamed not-found fallback (the loading skeleton opens the
  stream first — V14's cause, R4(8)); the preview check asserts no preview is minted for it, not the status.

**WP15 · Motion and performance** — needles move only when a pool changes (`TippingBar` already starts at
its target); per-second work only inside the countdowns and the Up & Down playhead (server-anchored, no
transition); the Up & Down band's confirmed price refreshes once a minute while the tab is visible (R5(a)) and
nothing about a price animates; reduced motion and Save-Data (mapped to `data-motion="reduced"`) are honoured.
At most two loops (R5 amended K20: the band has no final-30s pulse, so the page keeps one, the live dot).

**WP16 · i18n** — every new key in en, sw and zh in `src/lib/i18n-dict.ts`; `npm run test:i18n` forbids
an sw or zh value equal to its en value unless listed in `IDENTICAL_OK`. New sw/zh strings carry the
dictionary's "drafted, marked for native review" comment until rows SW and ZH close.

**WP17 · Accessibility** — headings h1 → h2 → h3 with no gap; buttons are buttons and links are links, none
nested; the global focus ring on every new control; dialog semantics from `Modal`.

**V15–V21 · The new gate classes** — `scripts/qa/landing-ten.mjs`: each is a block inside `CHECKS` (a
template string: escape backslashes, no backticks), a `REDS.Vn` plant, a row in the class table below.
- V15 measures against a fixed **740px** line: the 360 cells are 780 tall.
- V19 and the balance half of V20 need a **funded** session. `mobile01` on production is unfunded, so
  those cells run locally through `/auth/demo?deposit=1`; production covers the zero-balance state.
- V20's safe-area check needs an inset the headless browser does not have: emulate it or read the
  computed padding, and say which in the class table.
- V18 reads PER SURFACE through the instrumentation contract — `data-market-surface` (featured · card ·
  board) on each market's root and `data-market-part` (price · state · time · pool · predictors · source ·
  pick) on each part; the part table is the V18 block's own comment. `.mcardp[data-row-id]` and `.kp-qrow`
  widen the population, so a surface that loses its attribute is reported "unmarked", never skipped. Each
  part is its own RED run: `RED_PART=<part> RED=V18 … --red --cell=…` (source · price · time · pool ·
  predictors · order). Since WP3 + WP4 every surface on `/` draws every part. TWO RULED EXCEPTIONS, the featured
  card only, each read off the page: a count withheld below the floor the card states (R7, L29), and below 640
  the source SHOWN under the pick while it stays before it in the DOM (L28) — `RED_PART=order` plants against
  the DOM half, so it still proves at 360. `test:featured-card` §7 pins both as narrow as ruled.
- The gate itself (D2 step 0, 2026-09-27): a `--cell`/`--pass` that matches nothing exits 2 ("nothing was
  measured"), never GATE GREEN; a bare `--cell` (no "=") is refused; `--red` needs exactly one cell; a
  chromium that does not launch is retried once, then exit 2 — an instrument failure, not a red gate.
  `node scripts/qa/landing-ten.mjs --compile` checks every check and plant compiles, with no browser.

**PANEL · the eight reviewers** — the Review Board §3e checklists, run by eight independent agents against
production frames, each told to refute; the scores and any instrument defects go below this section.

**FUNNEL** — visitors → sign-ups → first pick for the seven days before the first v3 deploy and after the
last, read-only from production.

## §3 · Crosswalk — every item in the delivery's ACCEPTANCE, and the row that delivers it

Ali, 2026-09-26: *"every bit from the handover should be perfectly applied with what we have."* Every
placement-map row (P) and every checkbox (K) in the delivery's `ACCEPTANCE.md`, in its order, names the §1
row(s) that deliver it — or the ruling that replaced it. `npm run test:landing-ten-plan` fails if the counts
drift from that file or a row names an id §1 does not have. An item is done when its rows are ✅.

| ID | Delivery item | §1 rows | How it is met here |
|---|---|---|---|
| P1 | Logo: top left; mark only when signed in (phone) | WP1 | R1 keeps the header: the mark below 1280 and the lockup from 1280, signed in or not |
| P2 | Navigation: Menu button below 1100, inline above | WP1 | R1, L4: the bottom rail below 1024, inline nav with More from 1024 |
| P3 | Language: inside the Menu, header on desktop | WP1 | R1, L4: the header's language menu at every width |
| P4 | Join / Create account: header + after the featured card; hero left column on desktop | WP2 | The hero CTAs follow the featured card below 1024 and sit in the left column from 1024; the header keeps Sign in + Sign up (R1) |
| P5 | Balance chip → Wallet: sheet below 1024, panel from 1024 | WP14 | R1 |
| P6 | Bottom rail (`bottom-nav.tsx`): Markets · Up & Down · **centre Deposit** · Live · More; none at ≥ 1024 | WP1b | ⭐ NEW IN v4 (UPDATE-2026-09-28 §2). Live `37bde8a5`; V22 measures the coin's geometry |
| P7 | Deposit: header (gold), Wallet, hero | WP14 | R1 — but **not** its zero clause: R10 (2026-09-28) keeps the capsule at zero, so the header carries BOTH the figure and the Deposit there. Below 1024 the Deposit is the rail's centre coin (UPDATE-2026-09-28 §1) |
| P8 | Results: inside More on phones and tablets, header nav on desktop | WP1b | ⭐ NEW IN v4. §3 of the update corrects the earlier plan: Results STAYS in `CORE_ITEMS`. ⚠️ "/results marks More as current" is not in V22 — a different route; `test:section-rail` owns it |
| P9 | Positions, Wallet, Leaderboard, Invite, Propose: inside More (player), header / avatar menu on desktop | WP1b | ⭐ NEW IN v4. Wallet leaves More exactly when the centre slot becomes it, so the destination is reachable once and never marked twice |
| P10 | Withdraw: Wallet + hero, same size as Deposit; hidden at zero | WP14, V19 | R1 |
| P11 | Featured market: right after the lede; hero right column on desktop | WP2, WP3 | Hero v3 (R7, 2026-09-27): the card follows the trust ROWS — claim → h1 → lede → trust rows → card — so 18+, the licence and the helpline reach a phone's first screen; right column from 1024 |
| P12 | Pick slip: bottom sheet below 1024, inline from 1024 | WP5 | R2 |
| P13 | Proof figures: ledger rows on phones, three columns above | WP8 | |
| P14 | Board (ONE list): toggle + topic chips + stacked rows; one line per row at ≥ 1024 | WP9 | ⚠️ v4 MERGES the v3 map's two rows ("Closing-soonest board" and "Pick-a-side cards") into one — WP9 deletes the grid and the tiles from `/`. The two old rows' notes are kept here rather than dropped: WP4 | ·· WP9 | |
| P15 | Share: card footer + after placing (WhatsApp) | WP14b, WP5 | |
| P16 | Set limits / Take a break: pick sheet, Wallet, Menu, footer | WP5, WP14 | No Menu (R1); the footer already carries both |
| P17 | Licence · 18+ · helpline: first screen + footer | WP2 | ~~Trust lines before the CTAs — L18~~ ⚠️ 2026-09-27, hero v3 (R7(2)): one quiet row — 18+ · the licence line · the helpline `tel:` — plus the payout-live wallets, in the intro ABOVE the card (V21 measures them on the first screen); the RG sentence, the licence number and the helpline stay in the footer |
| K1 | Every placement row verified at 360, 768, 1280 in sw, en, zh | V21, PANEL | |
| K2 | 4a: phone, balance — chip + gold Deposit in the header; hero balance with equal Deposit/Withdraw | WP14 | The phone fit is measured (§2.1 WP14) |
| K3 | 4b: chip opens the Wallet sheet — balance, withdrawable, equal pair, Set limits; Esc and backdrop close | WP14, V20 | |
| K4 | 4c: zero — no chip, no Withdraw, header Deposit, empty-balance prompt, never "TZS 0" | WP14 | ⛔ **The delivery is overruled on half of this row.** R10 (Ali, 2026-09-28): the chip STAYS at zero and reads "TZS 0" — *"user should know he's 0"*. No Withdraw and the header Deposit still hold |
| K5 | 4d: desktop Wallet panel under the chip | WP14 | |
| K6 | Order: what it is → a live market → how it works → more markets → proof | WP2 | |
| K7 | Every market shows price (or labelled state), time left, pool, source | WP3, WP4, WP6, V18 | WP3/WP4 (branch): every market on `/` names its source (`sourceNameFor`); V18 reads each part |
| K8 | A confirm step before any money moves | WP5 | |
| K9 | Headings h1 → h2 → h3; no interactive element inside another | WP17 | |
| K10 | Visible focus on every control; Esc closes every sheet and panel | WP17, V20 | |
| K11 | No clipped or overflowing labels (V2) | GATE | |
| K12 | One colour per meaning | GATE | `test:gold-is-money`, `test:contrast` |
| K13 | Only the locked fonts, plus the CJK fallback | GATE | No new font; `--font-*` only |
| K14 | Only locked tokens; the real brand mark | GATE | `test:design-frozen`, `test:tokens`; L5, L7 |
| K15 | Equal card slots; bars align across a row (V6) | WP9, GATE | |
| K16 | No decorative gradients or illustrations | WP2 | R4(1), L16 |
| K17 | Needles move only on real pool changes | WP15 | |
| K18 | 24h mark and delta on the featured card | WP3 | `TippingBar mark` + "▲n · 24h ago"; featured, live and priced only; a move only between two prices and two readings (L26) |
| K19 | Up & Down: match scoreboard from the last confirmed price, dated, with the Up/Down buttons in it; open→finish match track (a stem per confirmed read, lock at bets close, flag at the deciding price, playhead); one-line countdown | WP12 | R5 |
| K20 | At most two loops | WP15 | R5 |
| K21 | Reduced motion and Save-Data honoured | WP15 | |
| K22 | Every bar and chart has a text description | WP3, WP8, WP12, WP17 | WP3: the featured bar is an image named by the whole split (`market.barReading`); a board row's bar is `aria-hidden` beside the reading it repeats (WP4) |
| K23 | Pick from the home page: two taps plus confirm | WP5 | R2 |
| K24 | Stake chips, the minimum stake and the rule line in the slip | WP5 | Minimum and fee from config (L3) |
| K25 | After placing: "You're with X% of the money on {side}" | WP5 | |
| K26 | Settled rows show source, date, sign-off, amount paid | WP13 | The market's own sign-off (L2) |
| K27 | Deposit and Withdraw are where section A says | WP14 | |
| K28 | One sentence says what 50pick is, above the fold | WP2 | Hero v3: the claim, "Tanzania’s first licensed prediction market" (R9), gated by `FIRST_LICENSED_EVIDENCE()` (`test:hero-copy` §1, V22) |
| K29 | Licence, 18+ and mobile money on the first screen | WP2, V15, V21 | Hero v3 (2026-09-27): the trust rows sit above the card; V21 measures rows 1–2 and the helpline `tel:` above the bottom rail below 640, on 360 × 740 cells |
| K30 | Three steps, including the fee as a number | WP11 | From config, never a literal (L3) |
| K31 | EN / SW / 中文, with the sub-line under the brand headline | WP2 | The language menu stays (R1). ⚠️ 2026-09-27 (R7(3)): no sub-line — the h1 IS the reader's language ("NDIO au HAPANA?" / "YES or NO?" / "是还是否？"), and the English brand line is the hero's sign-off |
| K32 | No jargon | WP16 | |
| K33 | No promised returns; the estimate is marked and qualified (V16) | V16, WP7 | No estimate on cards (R3) |
| K34 | The only urgency is a real countdown | WP15 | L17 |
| K35 | One-sided refund rule shown; no 0% / 100% price (V17) | WP6, V17 | L14 |
| K36 | The fee is a number; the source is named before the pick | WP11, WP3, WP4, WP5, V18 | V18's order rule. The featured card below 640 SHOWS its source under the pick and names it first in the reading order (L28) |
| K37 | Set limits and Take a break one tap from any stake | WP5 | |
| K38 | Withdraw as easy to find as Deposit (V19) | WP14, V19 | |
| K39 | Licence number and helpline on the page | WP2 | |
| K40 | At 360 × 740 the first screen shows the pitch and a live market with price and YES/NO (V15) | V15, WP2 | |
| K41 | Slip and Wallet are thumb-reach bottom sheets respecting the safe area (V20) | WP5, WP14, V20 | |
| K42 | Every tap target at least 40px | GATE | V4 |
| K43 | The header fits at 360 in every state and locale | WP14, GATE | |
| K44 | Snap rail with a peek; topics in two columns | WP9, WP10 | |
| K45 | No text under 12px; ledger rows for the proof figures | WP8, GATE | L6 |
| K46 | The price reads as a line ("YES @ 31%"), with "est. ×" where allowed | WP4, WP7 | No estimate on cards (R3) |
| K47 | Line movement shown (24h mark and delta) | WP3 | As K18; the board rows draw none (the concept's rows have none) |
| K48 | Depth (pool and predictors) on every market | WP3, WP4, V18 | Every market except the featured card below `FEATURED_PREDICTOR_FLOOR` (R7, L29) — it states its pool, and tells the gate why the count is withheld |
| K49 | Closing time next to every price | WP3, WP4, WP9 | WP3: time left top-right of the featured card, and its close date on the meta line; WP4: time left on the row's price line and the close date in its meta |
| K50 | Share on cards; WhatsApp after placing; the WhatsApp preview card works | WP14b, WP5 | Card share + the preview card: WP14b (D2), each market's og tags and og:image read on production by `qa:landing-v3:og-prod`; after placing: WP5 (D3); ticks when both are ✅ |
| K51 | The predictor count is on every row | WP4 | ⭐ NEW IN v4 |
| K52 | Visitor → sign-up → first-pick funnel measured before and after | FUNNEL | |
| K53 | Sheets animate in and out; Esc, backdrop and Cancel use the exit | WP5 | ⭐ NEW IN v4 |
| K54 | Closed markets show "Betting closed · awaiting result", with no tappable YES/NO | WP15 | ⭐ NEW IN v4 |
| K55 | The coin is the 50pick mark as a control | WP1b | ⭐ NEW IN v4 · C2 |
| K56 | The "▲ You" mark shows where the player joined the split | WP15 | ⭐ NEW IN v4 |
| K57 | Every row of the SPEC §5 motion table is implemented | WP15 | ⭐ NEW IN v4 |
| K58 | The price line slides continuously; the ring drains smoothly | WP12 | ⭐ NEW IN v4 |
| K59 | Every press gives feedback | WP15 | ⭐ NEW IN v4 |
| K60 | V23: transform/opacity only, no per-second re-render, timers pause when hidden | V23 | ⭐ NEW IN v4 |
| K61 | The INP, long-task and CLS budgets are met | WP15 | ⭐ NEW IN v4 |
| K62 | One gold; the contrast table in §5b re-verified on the real tokens | WP15 | ⭐ NEW IN v4 |
| K63 | The closed and disabled states use the muted palette | WP15 | ⭐ NEW IN v4 |
| K64 | One `MarketRow` and one `ConvictionBar`; no other bar markup exists | WP9 | ⭐ NEW IN v4 |
| K65 | The rail is `bottom-nav.tsx`, with no second nav component | WP1b | ⭐ NEW IN v4 |
| K66 | The wordmark matches `lockup-horizontal.svg` | WP2 | ⭐ NEW IN v4 |
| K67 | The mark's split, orientation, needle and hub are respected in the coin | WP1b | ⭐ NEW IN v4 |
| K68 | The one verb "pick" is used throughout | WP16 | ⭐ NEW IN v4 |
| K69 | Every needle carries the mark's hub | WP9 | ⭐ NEW IN v4 |
| K70 | UI/UX specialist: the whole centre slot is tappable | WP1b, V22 | ⭐ NEW IN v4 |
| K71 | Size & dimensions engineer: only the SPEC §8 values | WP15 | ⭐ NEW IN v4 |
| K72 | Gamer: a 12ms haptic on Confirm; press feedback; Up & Down one tap away | WP5 | ⭐ NEW IN v4 |
| K73 | Platform manager: WP19 events fire with the right `source`; empty states; flags | WP19 | ⭐ NEW IN v4 · C3 |
| K74 | Player, creativity, palette, software motion, branding: C2/C still green | PANEL | ⭐ NEW IN v4 |
| K75 | Search on the board (16px text), with its empty state | WP20 | ⭐ NEW IN v4 |
| K76 | The 7-day line at 640px and wider; the bar only on phones | WP20 | ⭐ NEW IN v4 |
| K77 | Static loading skeletons at the final heights, CLS 0 | WP19 | ⭐ NEW IN v4 |
| K78 | V25: one Deposit per screen, in every state (guest, funded, zero, held) | V25 | ⭐ NEW IN v4 · C5 (the 2026-09-28 update) |
| K79 | A held wallet: the centre slot is Wallet (/wallet), with no "+" | WP1b, V25 | ⭐ NEW IN v4 |
| K80 | Results is in More on phones and stays in the desktop header | WP1b | ⭐ NEW IN v4 |
| K81 | `qa:landing-ten` V1–V21 clean at every cell (except Ali's open decisions) | GATE, V15, V16, V17, V18, V19, V20, V21 | |
| K82 | Every new check (V15–V21) has a RED control reporting PROVED | V15, V16, V17, V18, V19, V20, V21 | |
| K83 | `npm run test:all` + typecheck pass | GATE | |
| K84 | Real devices | DEV | |
| K85 | Native Swahili sign-off; native zh review | SW, ZH | |
| K86 | The eight-reviewer scores recorded here | PANEL | |

## Running it

```
npm run qa:landing-ten                        # the whole matrix, against production
node scripts/qa/landing-ten.mjs --cell=<id>   # one cell
RED=V7 node scripts/qa/landing-ten.mjs --red --cell=base-1280-sw   # prove a class can fail
RED_PART=time RED=V18 node scripts/qa/landing-ten.mjs --red --cell=base-360-sw   # V18: one part per run
node scripts/qa/landing-ten.mjs --compile                     # every check and plant compiles; no browser
bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-wp34.sh <label>   # WP3 + WP4 local drive (3 phases)
```

It measures **production**, deliberately. The local tree has no settlements, no resolved markets
and short handles, so several of these defects cannot reproduce there — and a claim about what a
page *shows* is a claim about its **content**. Frames land in `.qa-shots/landing-ten/`
(gitignored); `gate.json` beside them carries per-class examples, which the console summary does
not print for counted violations.

Signed-in cells need `.env.qa.local` (gitignored) with `QA_MOBILE01_PASSWORD`. ⚠️ **One session
per account** — a second login revokes the first, so nobody else may be signed in as `mobile01`
while the sweep runs.

## The matrix

61 cells: 11 widths × 3 locales, plus 4 widths × 6 states (first visit · compact · reduced motion
· no-JS · client hop · signed in), plus 2 landscape and 2 zoom cells.

`clienthop` exists because a hard `goto` **never paints `loading.tsx`** — Next's route-level
skeletons render only on a client-side navigation, so a harness that always navigates straight to
a URL certifies a page it has never seen in its loading state.

## ⛔ Rules the gate itself must obey

This codebase has been burned by every one of these:

- **A red control must measure a DELTA**, clean vs planted, and report three verdicts —
  PROVED / BLIND / INCONCLUSIVE. "It went red" is not enough: while one section fails for another
  reason, a control appears to work whether or not it does.
- **A failed read is not a zero.** An errored cell is reported *unmeasured*, never clean.
- **Look at the frames.** The topic-tile defect was invisible to every box measurement and obvious
  in a picture. So was the notice bar that V7 wrongly condemned.
- **Measure animated things with motion alive** — the card sparkline is a draw-on and reads as
  undrawn when frozen.
- **Order of checks is part of the instrument.** V9 focuses every interactive element, which starts
  each one's focus transition; V10 ran afterwards and reported those transitions as the page's
  fault — 3 per cell, in 49 cells.
- **Never hold a bar nobody sets.** Inventing a 44px tap floor against the platform's documented
  `--tap-min: 40` produced 784 false violations.

## What the classes are

| | Class | Measured as |
|---|---|---|
| V1 | Horizontal overflow | `max(documentElement, body).scrollWidth > innerWidth + 1`, naming which box saw it |
| V2 | Clipped text | `scrollWidth > clientWidth` on a text-bearing element |
| V3 | Occlusion | a fixed overlay covering a price, CTA or figure, sampled across the row |
| V4 | Tap reach | reach under the page's own `--tap-min`, including `::after` extensions |
| V5 | Contrast | below AA, via a 1×1 canvas so oklch/color-mix survive, self-tested at 21:1 first |
| V6 | Ragged grid | row-mates differing in height; orphan tiles |
| V7 | Measure | over 75 characters per line **and** a line longer than any reading column |
| V8/V8b | Untranslated / lone-glyph line | a string identical across locales; a heading's last line a single token |
| V9 | Focus | no visible ring, or a ring clipped by an ancestor |
| V10 | Motion | frozen mid-animation, invisible after settle, or re-rising after being readable |
| V11 | Dead states | `TZS 0`; a 0%/100% price leading the page |
| V12 | Settled honesty | a refund word over a market that was decided and simply had no pool |
| V14 | Renders without JS | the page paints with scripting disabled |
| V15 | First screen (v3) | on phone cells 360–639 wide, the featured card's price and YES/NO end by a FIXED 740px of document, measured at the top of the page — not the viewport, which is 780 on the 360 cells — or by the top of the fixed bottom rail when that is higher (a control under the rail is not on the screen) |
| V16 | No promised winnings (v3) | visible text naming "win TZS", "utashinda", "赢得 TZS", or a stake times a multiplier |
| V17 | No degenerate price (v3) | a 0% or 100% read inside any card or board row — the conviction bar's aggregate is not a price and is not read |
| V18 | Market completeness (v3) | per market surface on `/` — the featured card, each grid card, each closing-soonest board row (`[data-market-surface]`; `.mcardp[data-row-id]` and `.kp-qrow` widen the population so an unmarked surface is named, never skipped): a visible price holding a digit, or a labelled state holding words (the em-dash alone fails), the time left, the pool, the predictor count and the named source, each a `[data-market-part]` centred inside its own surface; the source and the price or state before the pick (`[data-market-part="pick"]`) in the DOM and on the screen. Read per surface, never off the page — the trust lines, the settled strip and the proof rail carry every part too. No surface at all is a finding. RED removes one part (`RED_PART` = source · price · time · pool · predictors · order). Two ruled exceptions, featured card only: a predictor count withheld below the floor the card states (`data-market-predictors` < `data-market-depth-floor`, R7), and below 640 the source SHOWN under the pick while it stays before it in the DOM (L28) |

## Known gaps — stated, not implied

- **Android text scaling is uncovered by any driver on this machine.** Shrinking the CSS viewport
  models browser *zoom*; Android leaves the viewport at 360 and scales the text. The two zoom cells
  are honestly labelled as zoom. `zoom-200` (180 CSS px) is **informational, not gated** — WCAG
  1.4.10 Reflow sets **320**, which this matrix covers in all three locales and which is clean.
- The gate sees the first-visit primer's **first card only**; the card-3 defect was found by hand.
- **V6 is structurally blind to single-column grids** (`if (maxPerRow < 2) continue;`). ~~The gate reads no
  price~~ — true until landing v3: the hero's degeneracy defect was caught by eye, and V17 (no 0/100 on any
  card or row) and V18 (every market's price or state, time, pool, predictors and source) now read them.

## ⛔ NOT ENGINEERING WORK — owner decisions

The gate does not reach zero, and the remainder is not code:

- **V3 — the chat bubble over live prices.** Re-measured across four routes: the landing hero is
  the *least* important instance. On `/markets` it covers 100% of a card's outcome cap and 16% of a
  `HAPANA @ 12%` bet button at 414. Every remedy is a visible product trade — a right gutter moves
  every price off the right edge on every phone; auto-hiding buries the support entry point; moving
  it collides elsewhere, because a viewport-fixed 44px square over a scrolling board can sit on any
  row.
- **V14 — the page does not render without JavaScript.** With JS disabled the landing paints only
  header, placeholder card, rail and footer — **2,108px against 7,361px**. The content is in the
  HTML but sits behind a streaming Suspense boundary created by `loading.tsx` whose swap script
  never runs. Removing `loading.tsx` would fix it and would cost the client-side navigation
  skeletons.

⚠️ The hero **rotates markets**, so any percentage pinned to a specific hero row is a snapshot.

## The live strip is back on `/` — lobby only (2026-09-26)

~~After the ticker was removed by owner instruction, the `.ticker-viewport` / `.ticker-copy-dup` CSS
and the `liveTickerLabel` keys in all three locales are **dormant**. … A future session must not
"repair" a strip nobody renders.~~ **No longer true.** On 2026-09-26 Ali asked for the strip back,
and it now paints above this page's content on `/` — and on `/markets`, `/live`, `/results`, nowhere
else (`TICKER_ROUTES` in `src/lib/markets/ticker.ts`). It is live code: a defect in it is a real
landing defect. It can be stopped (a control at its end, or a tap on the run), and a stopped or calm
strip is a still, swipeable list. Guarded by `test:ticker-honesty` §11; record in
`docs/MOBILE-VISUAL-PLAN.md` D32.

## Instrument defects found so far, and how

**None was found by re-reading my own code.** Four came from building the RED controls before the
fixes, three from a peer measuring my claims, two from a critic fetching served HTML, one from
running the same cell three times:

`documentElement.scrollWidth` pinned at 360 while `body` went to 720 · a RED criterion that counted
instead of differencing · plants that missed silently · checks skipping every element with a child
element · the skip link scored as clipped text · a 44px tap floor invented against a documented 40
· V6 comparing against a container median · lines counted by height ÷ line-height · a focus ring
read mid-transition · contrast blind to gradients · V7 condemning a notice bar of the right shape ·
**the clienthop cell answering differently on the same commit.**

That last one is the one to internalise: run three times on one commit it gave clean, clean, then
V5:2 + V9:17 — seventeen findings about `/markets` chrome, because it waited a blind 700ms for a
route change instead of waiting for the route to commit. **Its two clean readings were luck.** A
gate that answers differently on identical input certifies nothing, so a cell that cannot establish
what it is looking at must throw and be counted unmeasured.

## Two regressions shipped here whose diffs read as improvements

- `openGraph: { url: "/" }` **deleted the landing page's share card.** Next merges `metadata` per
  FIELD, not deeply, so a partial `openGraph` replaces the parent object whole. The same shape was
  live on four more routes (`/results`, `/leaderboard`, `/proposals`, `/auth/register`), each
  emitting og:image and og:title — because each sets them itself — and **no** og:locale,
  og:site_name or og:type. ⛔ Never write a bare `openGraph` object in a route; spread
  `ROOT_OPEN_GRAPH`.
- Rendering `null` for a silent settled row **removed the grid item and collapsed the row.** The
  repair (a non-breaking space) fixed the row's HEIGHT and not its WIDTH: every settled row is its
  own grid, so the silent row's money track stayed at 7.81px against 148px and slid the settling
  source 140px out of column.

## The hero's price-quality floor

The hero board was showing a 0% market and two unpriced rows to a licensed real-money audience
while the open book held nine contested markets. The lens ordered only the *closing-today* group by
contestedness; only two markets close today, so three of the five seats came from a fallback tail
sorted by closing time with no price filter at all.

The fix is a **floor, not a wider window**: `hero.ts` partitions by price tier (0 two-sided,
1 one-sided, 2 unpriced — `priceTier`, read from the pools since WP6; it used to read a rounded
0%/100%, which filed a two-sided 199-vs-1 market with the one-sided ones) **before** position, so a
degenerate row takes a seat only once every priced market is already on screen — and the board is
never short, because degenerate rows are still shown, just last. The landing grid applies the same
tiers to its seats (WP6).

⚠️ `hero-contract` §5b's fixture was **the one shape that cannot fail**: its tail defaulted to
10k/10k, i.e. contested, so it could not tell a floor from its absence. It now has an unpriced tail,
and §5c carries a CONTROL asserting the soonest-closing three are *not* the first three. Removing
the floor fails three of §5c's four assertions.
