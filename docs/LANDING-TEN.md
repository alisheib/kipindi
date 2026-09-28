# LANDING-TEN — the landing page's acceptance gate

> **What this is.** `/` on www.50pick.tz is the one surface every new player sees. A five-critic
> review scored it 7.2/10. The work to close that gap produced **an instrument, not a list of
> fixes** — `npm run qa:landing-ten`. The fixes were the easy half; the gate is the deliverable,
> because it is what stops the next regression.
>
> **Read this before touching the landing page, and before trusting a green gate.**

## §0 · RESUME AT — the v3 build (reopened 2026-09-26)

**State (2026-09-28):** D0 ✅, D1 ✅ (`54f8199b`), WP14 ✅ (the Wallet, `e9b4056c`), WP6 ✅ (`31662831`), WP14b ✅
(`541a9e76`), and **WP12 — the Up & Down band, R5 "the Match" — 🔵 LIVE since 2026-09-27 22:26 UTC (`5ba4f727`;
production then served `6d915723`, a house-bots merge on top of it)**, pushed on the owner's word ("push live what you
have now") after five rounds of the four-expert frame panel on eight local drives (45 of 52 frames at 10 in round 5;
round 5's four small fixes shipped without a local re-drive). **Measured on production 2026-09-27:** `band-metrics`
CLEAN on all 11 cells (the band showed Down leads on BTC: 360 sw card 587px ≤ 600, clock→pick 166px ≤ 170, rule on
2 lines; 1280 card 357px ≤ 380); `band-agree` 3 compared, 0 disagree (sw/en/zh — the band's "saa 01:39 · Chini ya
ufunguzi kwa $43.17" = the round page's stamp and ink); the 360 sw frame looked at. **Not yet run on production: the
landing gate** (`verify-prod.sh` waited for the exact sha while production served `6d915723`). D2 step 0 (V18 + the
gate's hardening) is live in the scripts; V18 reads 1,584 on production until WP3/WP4 add the attributes it reads.
**Next:** RESUME HERE (handover 2026-09-28 — the build moves to ANOTHER PC; nothing below needs the old laptop: every
branch is on `origin`, but the frames in `.qa-shots/` are not, so every drive is re-run on the new machine).
(0) **Set up.** Fetch; check out branch `landing-v3` in your own checkout — it is the live band + **the hero merged, NOT
live, NOT yet verified** + docs — `npm ci`, and merge `origin/main` (house bots moved it: `6d915723` and later). Heavy
Node one job at a time (the old laptop used `~/heavy-node-lock.sh`; use the new machine's equivalent or none). The
four-expert panel scripts and how a round works: `scripts/qa/landing-v3/panels/` (README).
(1) **Finish WP12.** `bash scripts/qa/landing-v3/verify-prod.sh band-prod2 <the live sha>` with `FIRST_EXPECTED=0` while
the hero is not live; read the gate + REDs; tick WP12 ✅; delete `specs/updown-band-v2.md` with a one-line pointer in
§2.1 WP12 ("read it at `5ba4f727`" — 23 code comments cite it as provenance). A sixth panel round on production frames
of round 5's four fixes is optional.
(2) **The hero (R7 + R9)** — merged into `landing-v3` (`bc852744`; branch `landing-v3-hero` is the same tip). On the
merged tree: tsc clean, `test:hero-copy` 14/0, `red:hero-copy` 20 caught / 0 missed, the band's 95/0. First local drive
(`verify-hero.sh hero1`, 2026-09-27): **served HTML CLEAN** in sw/en/zh (the h1's spaces, the "first licensed" claim,
one `lang="en"`, a `tel:` link, four wallets, no "official"); all 47 frames captured (320, 360×780, 360×740, 768,
1024×768, 1280×800 × sw/en/zh; signed in with zero and funded balance; 130% text without overflow; focus visible on the
helpline and both CTAs) — the 360×740 sw YES/NO row sits above the rail. **Not done:** the gate + REDs V15–V17/V21/V22
(the session ended mid-gate — `ONLY_GATE=1 bash scripts/qa/landing-v3/verify-hero.sh <label>` reruns just that) and the
frame panel (`panels/hero-panel.js`; round 1 never completed). Then ship: merge `origin/main`, push, confirm `?dpl=`,
the production gate with `FIRST_EXPECTED=1`.
(3) **C1 · one price rule everywhere** — branch `landing-v3-c1`, tip `cc6fc5bd` (10 commits + the branch review's four
fixes; its guards green, run serially; ⚠️ its typecheck NOT yet run after the fix commit). Drive `verify-c1.sh` — RED
baseline first, then the branch drive (its build report's steps, incl. the production `PROD-S1-FEE` count to report
to Ali). At merge, one adjacent-line conflict in `i18n-dict.ts` (sw `udPool` "Dimbwi" → "Bwawa" beside the band's
`udLevelBy`).
(4) **WP3 + WP4** — branch `landing-v3-wp34`, tip `3312082f` (built ON C1; tsc clean; `test:featured-card` 72/0,
`red:featured-card` 9/9; one neutral 24h move platform-wide, "Hakuna dau bado", "5 位预测者"; L24–L29 in its
manifest). Drive `verify-wp34.sh` (P1–P3); re-run its first-screen budget with the hero merged (the trust rows sit
above the featured card).
(5) **F1 (R5(c))** — branch `landing-v3-f1`, tip `a8ad92a0` (built ON C1): the `/updown` card and terminal say
"Confirmed price" and take the band's targets-based ink; the card's 9.5px trust footer and its truncating "HIGHER OR
LOWER THAN $…" heading reach the 13px floor / never clip. ⚠️ Its build report never arrived (the session ended): run
its typecheck and guards before rendering.
(6) **WP9** alone. (7) The small R7 build: retire "Tabiri matukio. Si bahati." on all FIVE surfaces it reaches (the
English-only tab title, the primer, the landing's How-it-works heading, the auth rail + register preview, the yes/no
rules subtitle). Then D3 (WP5 the pick slip, V20, the chat bubble under sheets) and D5.
**⭐ Ali, 2026-09-27: "make sure everything in the plan is applied, every decision, every design component perfectly made,
new components built all consistent with our theme design kit."** Every unit is checked against R1–R7, L1–L23 and the kit
before it ships — frames looked at, never only a green gate.
**⭐ R8 (Ali, 2026-09-27): the build takes every remaining decision and IS the Tanzanian native Swahili reviewer** — no
human reviewer or hallway test is waited for; "licensed" is substantiated by the Board's licence-fee acknowledgement
(2026-09-05, Sec. 51(2)); "first licensed" ships on the owner's attestation (R9); the Follow panel stays; the share preview speaks Swahili (a WP14b
follow-up for this batch); the hero names only wallets whose payout path is live. "Full perfection, end to end,
sealed — visual and logical."
**⭐ STANDING (Ali, 2026-09-27): platform-wide consistency, mobile-first, whatever the session count.** When a
landing row shows the same rule broken on another surface, fix it there too — do not park it with another lane.
First such batch, **C1 · one price rule everywhere**: the detail page's bar, side picker and JSON-LD, and its
one-sided callout ("One-sided win" / "before resolution" → the card's words and rules §7's "at closing");
`/live`'s pulse grid and featured contest; `/results`' featured result — all onto `price-state.ts`.

Ali, 2026-09-26, handing over the v3 concept: *"proceed perfecting it … we can't come back until
pushed live and validated visually and logically."* The delivery is filed raw at
[`docs/design-system/v4-2026-09-26-landing-ten/`](design-system/v4-2026-09-26-landing-ten/). Its
[`INHERIT-MANIFEST.md`](design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md) holds **Ali's four
rulings (R1–R4)** and **every place our laws beat the delivery (L1–L21)**. Read it before building a
row; this section does not repeat it.

**How a session works this programme**
- Find your checkout with `hostname && git rev-parse --show-toplevel && git worktree list`; never
  copy a path from a doc. Work in your **own worktree off `origin/main`** (branch `landing-v3` is the
  resume point), never in a tree another session holds. Stage files by name.
- Heavy Node (dev server, build, tsc, Playwright) through `bash ~/heavy-node-lock.sh run landing <cmd>`
  on ALI-BLADE15. Dev on `localhost` (never `127.0.0.1`), seeded with `POST /api/dev-test/seed-markets`
  and `POST /api/dev-test/updown-seed`; sign in with `/auth/demo?deposit=0|1`.
- Ship: `git fetch`, **merge** `origin/main` (never rebase, never force), `git push origin HEAD:main`,
  then confirm production serves your sha (`?dpl=<sha>` on the asset URLs) before a row turns ✅.
- A row turns 🔵 when its commit is live and ✅ only after it is **measured on production** at 360,
  768 and 1280 in sw, en and zh — the frames looked at, not only the gate read.

**Traps already met on this programme**
1. `C:\kipindi-main` was 1,092 commits behind `origin/main` when the delivery landed in it. Never
   build there.
2. The delivery states numbers the platform does not: minimum stake TZS 100 (config says otherwise),
   a hard-coded 13%, and a licence number starting with the digit **zero** (ours starts with the
   letter **O**). Read every number from config or `support-config.ts` (L3).
3. `pricedYesPct` rounds a lopsided two-sided pool (25,000 vs 100) to 100% — V17's defect in a
   market that is not one-sided (L14).
4. The concept re-renders the whole page every second and fakes a bet every 6s (`sim()`). Neither is
   ported (L12).
5. The gate's landmark selectors (V14's `.kp-hero`, `.kp-qrow`, `.kp-topic`, `.kp-settled__row`, the
   V8 text map, the RED targets) are tied to class names. A rebuild re-points them in the same commit.
6. `.qa-shots/` is gitignored, so the verification scripts live in **`scripts/qa/landing-v3/`**:
   `verify-local.sh <label>` (boot, seed, capture, gate, RED V15–V17), `verify-prod.sh <label> <sha>`
   (waits for the sha, captures production, gate, RED V3/V14–V17), `verify-wallet.sh <label>` (tsc, boot,
   the Wallet drive `wallet.mjs`, signed-in captures) and `capture.mjs` (viewport tiles; `MODE=concept`
   captures the delivery beside the build). Each runs under the lock:
   `bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-local.sh d2a`. Frames and
   reports land in `.qa-shots/landing-v3/<label>/`.
7. Git Bash eats backslashes in heredocs, `node -e` and `sed` replacements (a regex became an
   alternation; `\r\n` became a raw newline). Write patch scripts with the Write tool. Working-tree files
   are CRLF on this machine (autocrlf), so a patch script normalises `\r\n` and restores it.
8. The heavy-node lock is shared by every session: never `rm -rf` it on an earlier reading. Re-read the
   owner immediately before and remove it only if it still names you.
9. V14 is red on a LOCAL run: the in-memory seed produces no settled row the strip will show, so the
   results strip (WP13) and V14 are measured on production only.
10. The gate's V3 treats the top of the bottom rail as the fold (V15's rule, fixed in `54f8199b`): a
    control under the rail at the fold is below the screen, not occluded. What V3 still reports on
    production is the chat bubble — Ali's open call ("Landing page to a 10").
11. V4 on production reports `.ticker-pause` at 40×31 on every cell. It is the LIVE strip's pause, sized
    to the strip on purpose by that lane (`globals.css`, the note above `.ticker-pause`: the whole running
    strip is the finger target). Not this programme's to change; it stays named on the GATE row.

## §0a · The paste-in prompt for the next session

> Continue the 50pick landing v3 build, end to end, sealed — visual and logical. Work in `C:\kipindi-landing-v3`
> (branch `landing-v3`). Read `docs/LANDING-TEN.md` §0 first — its **Next:** paragraph is the exact resume point and
> names the branch each built unit waits on. Then `docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md`
> (rulings R1–R9, laws L1–L29, and the R8 decisions the build already took) and the unit's spec in that folder's
> `specs/`. Every recorded decision is final; take any new decision yourself (R8), record it in the manifest, and act
> as the Tanzanian native Swahili reviewer for every sw line. For each unit: merge its branch into `landing-v3`, run
> its `scripts/qa/landing-v3/verify-*.sh` drive under `~/heavy-node-lock.sh` (detached; never `timeout`), look at every
> frame, run the four-expert frame panel (UI/UX lead, graphic designer, gambling-industry designer, accessibility/RG —
> agents that READ the PNGs; brief each round with what changed and what was declined, with the recorded reason) and
> fix until every score is 10; then merge `origin/main`, push to `main`, confirm the deployed sha (`?dpl=`), re-measure
> on production, tick the row and rewrite §0 in the same commit. Fix the same defect platform-wide, mobile first.

## §1 · Status board — the v3 build

⬜ not started · 🔨 building · 🔵 live, production not yet re-measured · ✅ measured on production ·
⛔ not built, by ruling · ⏳ waits on Ali. Guarded by `npm run test:landing-ten-plan`.

| ID | Unit | Status | Commit | Evidence / note |
|---|---|---|---|---|
| D0 | File the delivery, its acceptance record, this tracker; delete the dropped folder | ✅ | 1173dc2b | live 2026-09-26; the dropped folder deleted, `C:\kipindi-main` fast-forwarded |
| WP1 | Header collapse below 1100, Menu button, segmented language | ⛔ | | R1 kept the header; L4 |
| WP2 | Hero order, trust lines, headline clamp, backdrop drawing removed | ✅ | 54f8199b | measured on production 2026-09-26 (360/768/1280 × sw/en/zh frames looked at); R4(1), L18 |
| WP3 | Featured card: full question, meta + source, time top-right, 24h mark and delta | ⬜ | | |
| WP4 | Question board rows: title link + YES@/NO@ buttons + time left | ⬜ | | |
| WP5 | Pick slip: sheet below 1024, inline from 1024, after-placing share | ⬜ | | R2 |
| WP6 | One-sided state on every card + the grid's degeneracy floor | ✅ | 31662831 | measured on production 2026-09-27: V17 0 in 33/33 cells (was 66), RED V17 PROVED; `/`, `/markets`, `/results` at 360/768/1280 × sw/en/zh, frames looked at — no card reads 0% or 100%, one-sided cards read "One side only" + the rule in all three. The one-sided FEATURED card measured locally (production's featured is contested). L14, L22, L23; delivers MOBILE-VISUAL ruling 13 on the card |
| WP7 | Estimate line on cards | ⛔ | | R3 |
| WP8 | Proof rail: phone ledger rows, conviction reading as the bar's label | ✅ | 54f8199b | measured on production 2026-09-26 (360/768/1280 × sw/en/zh frames looked at) |
| WP9 | Pick-a-side grid: phone snap rail with a peek, 2 and 3 columns | ⬜ | | |
| WP10 | Topics: six tiles, Other last, "All topics" as the section link | ✅ | 54f8199b | measured on production 2026-09-26 (360/768/1280 × sw/en/zh frames looked at) |
| WP11 | How it works: "A named source", the fee from config, h3 steps | ✅ | 54f8199b | measured on production 2026-09-26 (360/768/1280 × sw/en/zh frames looked at); the fee reads 13% through `ratesFrom`; L3 |
| WP12 | Up & Down band: R5 — the Match (spec v2) | 🔵 | 2acefc9d | live 2026-09-28: the scoreboard, the match track and the one-line clock, the 60-second refresh (R5(a)), the round page agreeing (§12); eight local drives (`verify-band.sh`: 19 checks incl. the agreement drive, the RED-controlled numeric gate, the #stake landing, one pick position across states) and five rounds of the four-expert frame panel (45/52 at 10 in round 5; record in §2.1 WP12). Production 2026-09-27: `band-metrics` CLEAN on 11 cells, `band-agree` 3 compared / 0 disagree, the 360 sw frame looked at; the landing gate on production still to run (§0 (1)). The price-line band it replaces was ✅ `54f8199b` |
| WP13 | Results: date, the market's own sign-off, source link, paid | ✅ | e9b4056c | measured on production 2026-09-27: date, the market's own sign-off (a reversed market reads "Corrected on objection"), source, paid; below 640 the amount and the source each take a line, so the host reads whole. L2 |
| WP14 | Wallet: chip opens sheet/panel, equal Deposit/Withdraw, gold Deposit at zero, signed-in hero | ✅ | e9b4056c | measured on production 2026-09-27 with `mobile01` (zero balance, no picks: header Deposit, hero empty-balance line + Deposit, no Withdraw, Set limits; pages render at 360/1280 sw/en). Funded Wallet + hero measured locally (Wallet 17 cells, hero 15 cells; 360–1280 × sw/en/zh). `test:wallet-reach` 48/48, `test:landing-mine` 22/22, both mutation-proved. R1, L19–L21 |
| WP14b | Share on every card footer, in every phase; the WhatsApp preview card (og tags spread from `ROOT_OPEN_GRAPH`, no 0/100 in the preview) | ✅ | 541a9e76 | measured on production 2026-09-27: `qa:landing-v3:og-prod` CLEAN on 15 markets (og:type/site_name/locale present, one-sided markets preview "One side only.", images 1200×630 PNG) — its baseline before the push failed on all 15; `/results` captured 360/768/1280 × sw/en/zh, settled cards one `<article>`, looked at; the share drive (26/26: Copy, WhatsApp, Esc, backdrop stay on `/results`) ran locally. "Share on WhatsApp" after placing is WP5's; K50 closes with both |
| WP15 | Motion and performance | ⬜ | | L12 |
| WP16 | i18n: every new key in en, sw and zh | 🔨 | 54f8199b | D1's keys in all three (`test:i18n`); sw/zh drafts carry the native-review marker (rows SW, ZH) |
| WP17 | Accessibility: heading order, no nested controls, dialog semantics | 🔨 | 54f8199b | heading order and split row links live; dialog semantics arrive with the Wallet (WP14) and the slip (WP5) |
| RG | Drop the RG line above the footer; chat bubble hides under a sheet | 🔨 | 54f8199b | RG line dropped, live 2026-09-26 (R4(5)); the chat bubble under a sheet ships with D3 (R4(7)) |
| V15 | Gate: first screen at 360 × 740 | ✅ | 54f8199b | production 2026-09-26: 0 findings; RED PROVED on production |
| V16 | Gate: no promised winnings | ✅ | 54f8199b | production 2026-09-26: 0 findings; RED PROVED on production |
| V17 | Gate: no 0% or 100% price | ✅ | 54f8199b | production 2026-09-26: RED PROVED; its findings were WP6's — 0 on production 2026-09-27 after `31662831` |
| V18 | Gate: every market shows price or state, time, pool, source | 🔨 | | the gate block, `REDS.V18` (one RED run per part, `RED_PART`) and the gate's own hardening are built (D2 step 0, `--compile` clean); the `data-market-surface` / `data-market-part` attributes it reads land with WP3 + WP4, which bring it to 0 |
| V19 | Gate: Withdraw as reachable and as large as Deposit | ⬜ | | |
| V20 | Gate: sheets trap focus, close on Esc, respect the safe area | ⬜ | | |
| V21 | Gate: the placement map, by bounding box | ⬜ | | |
| GATE | `qa:landing-ten` V1–V14 clean on production (V3, V14 open by R4); `npm run test:all` + typecheck green | ⬜ | | Production 2026-09-27 after `541a9e76` (33 of 33 cells measured): V1, V2, V5–V17 clean. Still reported, each with its owner: V3 ×12 (the chat bubble, Ali's call), V4 ×33 (`.ticker-pause` 40×31, the LIVE-strip lane's, §0 trap 11), V18 ×1,584 (48 per cell: every surface unmarked until WP3 + WP4 add `data-market-*`; its RED runs are INCONCLUSIVE until then — correct). `test:all` is red on OTHER lanes' ratchets (type-scale, stacking, tap-target, decomment, eyebrow-roles, two red-anchors §3 anchors) — each red on clean `origin/main` too. R4 |
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

**WP3 · Featured card** — `src/components/markets/market-card.tsx` (`featured` variant only), `TippingBar` in `src/components/brand.tsx`
- Full question with no clamp (`.mcardp--featured .mcardp-q`).
- Meta line: close date · "Settles on {source}". The source name comes from `listSources()`
  (`src/lib/server/source-registry.ts`) matched on the market's `sourceUrl` host, falling back to the host.
  `sourceUrl` is already passed to the card and currently unused.
- Time left in the top-right corner, in `--text`, through `timeLeftLabel` (`src/lib/markets/time-left.ts`).
- The 24h mark: a tick at `yesPct − move24h` on the bar plus "▲n · 24h ago" / "▼n · 24h ago". `move24h`
  comes from `getCardCharts` (`src/lib/server/market-history.ts`), already fetched for the featured card;
  **no mark when it is undefined**.
- The bar gets `role="img"` and the full reading ("31% YES, 69% NO") as its label.
- The landing's **grid cards** name their source too (V18: every market shows its source before the pick),
  through a landing-only prop so `/markets` card geometry is untouched.
- SOON (L17): `getSignalBadge` tests the English label `/^\d+m left$/`, so it never fires in sw or zh. Test the
  milliseconds left instead.
- Guards at risk: `MARKET_CARD_H` / `--mcard-h` size the `/markets` skeletons; keep these changes on the
  featured variant or re-derive the height (`qa:card-geometry`).
- ⚠️ **2026-09-27 — what hero v3 leaves WP3 (spec §7, a model to be measured):** ≈65px between the featured
  card's YES/NO row and the bottom rail at 360 × 740 in Swahili. So below 640 the featured question clamps at
  **3 lines or fewer in every language** (≈ +22px over today's 2), and the "Settles on {source}" line goes
  **below** the YES/NO row — about 632, 43px clear. This amends "no clamp" above for phones only.

**WP4 · Question board rows** — `QuestionRow` in `landing-hero.tsx`, `.kp-qrow` in `globals.css`
- The row stops being one `<Link>`: the title is its own link; the time left, the bar and the YES@/NO@
  buttons are siblings (no interactive element inside another). Buttons at least 44px (`--h-control-md`).
- Phone: title → meta → full-width bar row → full-width YES/NO pair. Tablet: title and bar side by side,
  buttons wrap. Desktop: one line. The title keeps its 44ch measure.
- Before D3 the buttons open `/markets/{id}?side=`; from D3 they open the pick slip.
- An unpriced row shows no price (`pricedYesPct` returns null), never a 50.
- Meta line: close date · "Settles on {source}" · pool · predictors (depth on every market, V18).

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
- The hero board row reads the same helper: "— One side only", no lean rule; its refund note and dashed
  rail arrive with WP4's rebuilt row.
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

**WP9 · Pick-a-side grid** — the grid band in `src/app/page.tsx`, `.market-grid` scoped to the landing
- Below 640: `grid-auto-flow: column; grid-auto-columns: 86%; overflow-x: auto;
  scroll-snap-type: x mandatory`, cards `scroll-snap-align: start`; the page itself never scrolls sideways
  (V1). 640–1023: two columns. From 1024: three.
- Every card keeps the same slots so bars line up across a row (V6).
- Guard at risk: `test:needle-rest` §4 sweeps `/` at 360 and 768 for the parked Needle resting on a control.

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
- At zero: no capsule, no Withdraw — a labelled gold Deposit at every width. Never "TZS 0". The bar decides
  with the LIVE balance (`useLiveBalance`), so an SSE deposit brings the capsule back without a navigation.
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
  predictors · order). `source` and `order` can only PROVE once WP3 draws a source.
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
| P6 | Deposit: header (gold), Wallet, hero | WP14 | R1, including the gold Deposit that replaces the capsule at zero |
| P7 | Withdraw: Wallet + hero, same size as Deposit; hidden at zero | WP14, V19 | R1 |
| P8 | Featured market: right after the lede; hero right column on desktop | WP2, WP3 | Hero v3 (R7, 2026-09-27): the card follows the trust ROWS — claim → h1 → lede → trust rows → card — so 18+, the licence and the helpline reach a phone's first screen; right column from 1024 |
| P9 | Pick slip: bottom sheet below 1024, inline from 1024 | WP5 | R2 |
| P10 | Proof figures: ledger rows on phones, three columns above | WP8 | |
| P11 | Closing-soonest board: stacked · title + bar · one line | WP4 | |
| P12 | Pick-a-side cards: snap rail with a peek · two columns · three | WP9 | |
| P13 | Share: card footer + after placing (WhatsApp) | WP14b, WP5 | |
| P14 | Set limits / Take a break: pick sheet, Wallet, Menu, footer | WP5, WP14 | No Menu (R1); the footer already carries both |
| P15 | Licence · 18+ · helpline: first screen + footer | WP2 | ~~Trust lines before the CTAs — L18~~ ⚠️ 2026-09-27, hero v3 (R7(2)): one quiet row — 18+ · the licence line · the helpline `tel:` — plus the payout-live wallets, in the intro ABOVE the card (V21 measures them on the first screen); the RG sentence, the licence number and the helpline stay in the footer |
| K1 | Every placement row verified at 360, 768, 1280 in sw, en, zh | V21, PANEL | |
| K2 | 4a: phone, balance — chip + gold Deposit in the header; hero balance with equal Deposit/Withdraw | WP14 | The phone fit is measured (§2.1 WP14) |
| K3 | 4b: chip opens the Wallet sheet — balance, withdrawable, equal pair, Set limits; Esc and backdrop close | WP14, V20 | |
| K4 | 4c: zero — no chip, no Withdraw, header Deposit, empty-balance prompt, never "TZS 0" | WP14 | |
| K5 | 4d: desktop Wallet panel under the chip | WP14 | |
| K6 | Order: what it is → a live market → how it works → more markets → proof | WP2 | |
| K7 | Every market shows price (or labelled state), time left, pool, source | WP3, WP4, WP6, V18 | |
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
| K18 | 24h mark and delta on the featured card | WP3 | |
| K19 | Up & Down: match scoreboard from the last confirmed price, dated, with the Up/Down buttons in it; open→finish match track (a stem per confirmed read, lock at bets close, flag at the deciding price, playhead); one-line countdown | WP12 | R5 |
| K20 | At most two loops | WP15 | R5 |
| K21 | Reduced motion and Save-Data honoured | WP15 | |
| K22 | Every bar and chart has a text description | WP3, WP8, WP12, WP17 | |
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
| K36 | The fee is a number; the source is named before the pick | WP11, WP3, WP4, WP5 | |
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
| K47 | Line movement shown (24h mark and delta) | WP3 | |
| K48 | Depth (pool and predictors) on every market | WP3, WP4, V18 | |
| K49 | Closing time next to every price | WP3, WP4, WP9 | |
| K50 | Share on cards; WhatsApp after placing; the WhatsApp preview card works | WP14b, WP5 | Card share + the preview card: WP14b (D2), each market's og tags and og:image read on production by `qa:landing-v3:og-prod`; after placing: WP5 (D3); ticks when both are ✅ |
| K51 | Visitor → sign-up → first-pick funnel measured before and after | FUNNEL | |
| K52 | `qa:landing-ten` V1–V21 clean at every cell (except Ali's open decisions) | GATE, V15, V16, V17, V18, V19, V20, V21 | |
| K53 | Every new check (V15–V21) has a RED control reporting PROVED | V15, V16, V17, V18, V19, V20, V21 | |
| K54 | `npm run test:all` + typecheck pass | GATE | |
| K55 | Real devices | DEV | |
| K56 | Native Swahili sign-off; native zh review | SW, ZH | |
| K57 | The eight-reviewer scores recorded here | PANEL | |

## Running it

```
npm run qa:landing-ten                        # the whole matrix, against production
node scripts/qa/landing-ten.mjs --cell=<id>   # one cell
RED=V7 node scripts/qa/landing-ten.mjs --red --cell=base-1280-sw   # prove a class can fail
RED_PART=time RED=V18 node scripts/qa/landing-ten.mjs --red --cell=base-360-sw   # V18: one part per run
node scripts/qa/landing-ten.mjs --compile                     # every check and plant compiles; no browser
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
| V18 | Market completeness (v3) | per market surface on `/` — the featured card, each grid card, each closing-soonest board row (`[data-market-surface]`; `.mcardp[data-row-id]` and `.kp-qrow` widen the population so an unmarked surface is named, never skipped): a visible price holding a digit, or a labelled state holding words (the em-dash alone fails), the time left, the pool, the predictor count and the named source, each a `[data-market-part]` centred inside its own surface; the source and the price or state before the pick (`[data-market-part="pick"]`) in the DOM and on the screen. Read per surface, never off the page — the trust lines, the settled strip and the proof rail carry every part too. No surface at all is a finding. RED removes one part (`RED_PART` = source · price · time · pool · predictors · order) |

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
