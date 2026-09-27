# LANDING-TEN — the landing page's acceptance gate

> **What this is.** `/` on www.50pick.tz is the one surface every new player sees. A five-critic
> review scored it 7.2/10. The work to close that gap produced **an instrument, not a list of
> fixes** — `npm run qa:landing-ten`. The fixes were the easy half; the gate is the deliverable,
> because it is what stops the next regression.
>
> **Read this before touching the landing page, and before trusting a green gate.**

## §0 · RESUME AT — the v3 build (reopened 2026-09-26)

**State (2026-09-27):** D0 ✅, D1 ✅ (`54f8199b`), WP14 ✅ (the Wallet, `e9b4056c`), **WP6 ✅** (`31662831` — a
market with money on one side states no price, on every card; V17 0 on production) and **WP14b ✅** (`541a9e76` —
share works on every card in every phase; the WhatsApp preview reads the card's price rule and carries the site's
og tags; `qa:landing-v3:og-prod` CLEAN on 15 production markets). D2 step 0 (the gate's V18 + its own hardening) is
live in the scripts; V18 reads 1,584 on production until WP3/WP4 add the attributes it reads (GATE row).
**Next:** RESUME HERE (handover 2026-09-27, the session that shipped the one-sided state and the share fixes) —
(1) **The Up & Down band (R5, WP12 🔨)** is BUILT from `specs/updown-band-v2.md` and committed on branch `landing-v3`
(pushed to `origin/landing-v3`, NOT to `main` — nothing of it is live). Typecheck clean; `test:updown-match` 86/0 and every
touched suite green (the builder's report is in that commit's message). It has NEVER been rendered. Do, in order: write
`scripts/qa/landing-v3/band-metrics.mjs` + `band-agree.mjs` (spec §15.4/§15.6, each with a RED control); a local drive under
the lock (seed Up & Down rounds in every state the spec's §8 lists; clear `.next` first); look at every frame at
360/768/1280 × sw/en/zh; then the **four-expert frame panel** (UI/UX lead, graphic designer, gambling-industry designer,
accessibility/RG — a workflow of agents that READ the frame PNGs) — fix and re-shoot until every score is 10; check every
new component against the design kit (DESIGN_AUTHORITY, `globals.css` tokens, the type ladder, the chart home); then merge
`origin/main`, push to `main`, confirm `?dpl=`, re-measure on production, tick. Ali's hallway test (spec §15.7) needs the
people he names — ask him.
(2) **The hero (R7, WP2 reopened)** — spec `specs/hero-v3.md`, every question RULED (R7). Build with the locked fonts;
then show Ali real frames and trial the Bricolage Grotesque headline (his call on frames). Its Swahili lines get the
build's own native review pass (R8). ⭐ The claim is "Tanzania's first licensed prediction market" — R9, the owner's
attestation.
(3) **C1 · one price rule everywhere** — spec `specs/c1-one-price-rule.md` (R6 ruled): the detail page, `/live`, `/results`
featured, chart history, the settled share preview, Up & Down (after the band lands), admin; it also fixes two live
false statements — a settled one-sided market's resolution panel states a fee never charged, and a NO or void result is
painted YES-green on every settled card (§10).
(4) **WP3 + WP4** as one deploy (they add V18's `data-market-*` attributes; V18 reads 1,584 on production until then) —
spec `specs/d2-wp3-wp4-wp9-v18-wp14b.md`; (5) **WP9** alone. (6) The small builds R7 queued: retire "Tabiri matukio. Si
bahati." (tab title + primer); the 18+ badge's neutral ink site-wide. Then D3 (WP5 the pick slip + WhatsApp after placing,
V20, the chat bubble under sheets) and D5. The specs are build inputs: delete each when its unit ships.
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

> Continue the 50pick landing v3 build. Read `docs/LANDING-TEN.md` §0 and §1 first, then
> `docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md` (Ali's rulings R1–R4 and laws
> L1–L21), then §2 (how each row is built) and §3 (every delivery item and the row that delivers it).
> Verify with the scripts in `scripts/qa/landing-v3/` (§0 trap 6), always under the heavy-node lock.
> Open the concept (`npx serve docs/design-system/v4-2026-09-26-landing-ten/design`, then
> `50pick Home Concept v3.dc.html`, with `?signedIn=1&balance=1&wallet=1&locale=sw` as needed) at 360,
> 768 and 1280 beside the build. Work the next ⬜ batch of §2.0 in order, in your own worktree off
> `origin/main`. For each row: build it within `globals.css` tokens and existing components, run the
> suites §2.1 names plus `npm run test:landing-ten-plan`, drive it locally at 360/768/1280 in sw/en/zh
> and look at the frames, push to `main`, confirm the deployed sha, re-measure on production, then tick
> the row and rewrite §0 in the same commit. The repo's laws win every conflict with the delivery;
> a conflict nobody has ruled on goes to Ali as a numbered one-line choice, and into the manifest.

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
| WP12 | Up & Down band: R5 — the Match (spec v2) | 🔨 | | built in the landing worktree 2026-09-27, uncommitted: scoreboard + match track + one-line clock, the R5(a) 60-second refresh, the round page's §12 agreement; `test:updown-match` (every check run against a planted wrong copy too) and the extended `test:chart-one-home` / `test:betting-ink` / `test:contrast` green. Next: the local drive (§15.2–15.6), the hallway test and the 10/10 frame panel below, then push. The price-line band it replaces was ✅ `54f8199b` (production 2026-09-26) |
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

**WP2 · Hero order** — `src/components/home/landing-hero.tsx`, `.kp-hero*` in `globals.css`, `src/app/page.tsx`
- One DOM, ordered: eyebrow → `<h1 lang="en">` → sw/zh sub-line (`home.heroHeadlineSub`, shown only when it
  differs from the headline) → lede → **featured card** → trust lines → CTAs. From 1024 the block is two
  columns — copy, trust lines and CTAs on the left, the featured card on the right — by CSS grid areas,
  never a second copy of the DOM. ⚠️ Trust lines BEFORE the CTAs, in the source (L18): the delivery's phone
  order put them after the CTAs, below the first screen its own placement map requires; a CSS `order`
  was tried and removed because keyboard order then disagreed with the screen.
- Headline on the locked ladder — 44 below 1024, 60 from 1024, 72 from 1280 (the delivery's
  `clamp(40px, 6.2vw, 88px)` mapped onto §T1 steps), Sora 800, `text-wrap: balance`. The YES/NO inks come
  from `Inked` over the English words; the sub-line is inked with the reader's own side words
  (`sideWord`), MOBILE-VISUAL ruling 12.
- Trust lines, in this order: 18+ roundel + `footer.licensedByGbt` · `home.trustCell3H` (mobile money) ·
  `footer.stopGambling` + the helpline (`HELPLINE()` / `HELPLINE_TEL()`, a `tel:` link at the tap floor) ·
  `home.trustCell1H` (named sources). Every string is an existing key — no new regulated copy. The licence
  NUMBER stays in the footer on every page (K39), as in the delivery's own hero.
- The lede drops the jargon word the before state used ("Trade questions…" → "Pick a side on questions…").
- The proof rail, the conviction bar and the closing-soonest board move **below** the hero block.
- Remove the faint dial drawing behind the hero (R4(1)).
- Guards at risk: `test:betting-ink` §1 pins the proof-rail figure markup exactly; `test:hero-contract`
  (the featured market is never also a board row); `scripts/qa/landing-ten.mjs` V14 landmarks and the
  V8 text map name `.kp-hero` — keep the class or re-point the gate in the same commit. The hero's entrance
  stagger is keyed to `.kp-hero__inner > *:nth-child(n)`; reordering children re-orders the animation.
- ⚠️ First-screen budget (V15): header 56 + the LIVE strip (back on `/` since 2026-09-26) + the hero must
  leave the featured card's price and YES/NO above 740px at 360 wide, **in sw**, whose sub-line and lede
  are the longest. Measure it; if it does not fit, shorten spacing on the `--rh-*` phone rungs, never the text.

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
- **Shows (sw, 360):** the fixture (`AssetMark`, name, the kit Chip "10 DAKIKA") and ONE clock line "Dau
  linafungwa baada ya 01:52"; the plate — the verdict ("↑ Juu inaongoza", settlement's own
  `decideOutcomeByTargets` on the newest confirmed read), its dated detail ("saa 14:26 · Juu ya ufunguzi kwa
  $18.52") and the Up/Down links IN the plate, solid and equal, never lit; the match track
  (`src/components/charts/updown-match-track.tsx` + the playhead leaf `updown-match-now.tsx`): a stem per confirmed
  read on a fixed open → close domain, the lock post at bets-close, the flag at the deciding price; the rule in two
  sentences ("Bei ya saa 14:32 inaamua. Tofauti ikiwa ndogo kuliko $0.02, kila dau linarudi."); "Raundi zote ›".
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
- **The round page agrees (spec §12):** "Confirmed price" (was "Live price"); while open the quote stamp joins the
  move line; the hero's ink follows the targets (`price-hero.tsx` `tone`, `data-tone`); a level read says the band's
  own "Only $0.20 from the open — not enough to decide". The `/updown` card and terminal follow in F1 (R5(c)).
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
names the defect, is fixed, and the WHOLE panel re-scores. **Record:** *not run yet.*

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
| P8 | Featured market: right after the lede; hero right column on desktop | WP2, WP3 | |
| P9 | Pick slip: bottom sheet below 1024, inline from 1024 | WP5 | R2 |
| P10 | Proof figures: ledger rows on phones, three columns above | WP8 | |
| P11 | Closing-soonest board: stacked · title + bar · one line | WP4 | |
| P12 | Pick-a-side cards: snap rail with a peek · two columns · three | WP9 | |
| P13 | Share: card footer + after placing (WhatsApp) | WP14b, WP5 | |
| P14 | Set limits / Take a break: pick sheet, Wallet, Menu, footer | WP5, WP14 | No Menu (R1); the footer already carries both |
| P15 | Licence · 18+ · helpline: first screen + footer | WP2 | Trust lines (licence + 18+, mobile money, helpline, sources) before the CTAs — L18; the licence number and all three stay in the footer |
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
| K28 | One sentence says what 50pick is, above the fold | WP2 | |
| K29 | Licence, 18+ and mobile money on the first screen | WP2, V15 | |
| K30 | Three steps, including the fee as a number | WP11 | From config, never a literal (L3) |
| K31 | EN / SW / 中文, with the sub-line under the brand headline | WP2 | The language menu stays (R1) |
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
