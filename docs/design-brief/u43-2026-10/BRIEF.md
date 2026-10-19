# U43 · Release B — the build brief and handover (2026-10-19)

> The resume point for whoever builds release B of MOBILE-VISUAL **U43** (Ali's 10/10 request for the Up & Down board,
> its round card and the market card), on any machine and in any tool. Law: `docs/DESIGN_AUTHORITY.md`. Rulings:
> `docs/COMPLIANCE-DECISIONS.md` § "2026-10-19 · Up & Down and the market cards (MOBILE-VISUAL U43)". Unit, scores and
> state: `docs/MOBILE-VISUAL-PLAN.md` §0 (⏳ IN FLIGHT) and §9 U43. Records beside this file: `ROUND0-REGISTER.md` (135
> measured findings, frame by frame) and `PANEL-SYNTHESIS.md` (the read-only design panel's merged proposal, made BEFORE
> Ali's rulings — the rulings win where they differ).

## 1 · Where it stands

- **LIVE:** release A `9393dcb53` (no figure on any card choice in both shells; a one-sided locked round says one refund
  sentence instead of the two "If it closes" rows, and its quote is the stake under both outcomes; the last-30-second
  pulse moved onto the digits' own span) and A.1 `ee76c9489` (the checks release A turned red; a named one-sided rule in
  `updown-board.ts`; the two capture tools registered). Both read back on production (all three origins, `/api/health`,
  `qa:chunks-prod` on www and apex, production `qa:live` 363/0).
- **NOT STARTED:** release B's code. If the read-only spec workflow finished before the handover, its five area specs are
  in `RELEASE-B-SPECS.md` beside this file; otherwise build from this brief, the two records and the code.
- **The goal (done means):** all 24 cells (8 lenses × 3 surfaces) score 10 in two consecutive independent, adversarially
  verified critic reads of fresh tiles at 320/360/390/768/1024/1280/1920 × sw/en/zh × every state; positional claims
  pixel-measured; zero open findings; every statement true and consistent across the board, round page, history, /live,
  the home and the journey cards. Lenses: visual, UI/UX, motion, palette, clarity, the player, overall appeal, logic.
  Round 0 (production, before A): page / round card / market card = visual 5/4/5.5 · UI-UX 3.5/4/6.5 · motion 6/5.5/5 ·
  palette 6/5.5/5.5 · clarity 5.5/3.5/5 · player 4/4/6.5 · appeal 5/4/6.5 · logic 5/4/6.

## 2 · Ali's four rulings (binding; full text in COMPLIANCE-DECISIONS)

1. **Live line in the card.** The round a player can bet on carries a small line of the price since the round opened,
   with the round's price to beat as a dashed line, from the same feed the result is read from, every point timed. The
   board's big chart stays one tap away and is FIXED so it never shows a different price from the card. Accepted: at most
   ~5,800 vendor credits/day for two assets whatever the number of players (one call per asset per 30-second cache); the
   house desk reads that cache (`peekVendorBar`) and will stake on more rounds.
2. **Slim card.** One line per fact: the round's time window, the price to beat once, the time left beside it, the pool,
   players and split, then the stake chips and Up/Down. Removed: the ±$0.02 target tiles, the repeated price, the empty
   clock boxes, the status said three times. The source-and-time line stays, merged into one line. Goal: Up/Down on the
   first phone screen.
3. **Visible chips.** On a phone the assets and the durations are TWO SHORT ROWS of chips, one tap to switch, no sheet;
   the sheet returns only when the choices stop fitting.
4. **No odds on any card choice** — live since release A. Keep it.

## 3 · Fixed points (never break)

Up/Down buttons show the side word + arrow only; the after-lock payout rows stay; never a fabricated price, point, time or
chart history; gold only for EARNED money (§M3); yes/no ink only for the two sides (§B2a); micro charts aqua (§B12.2); the
closed type ladder (§T1); FilterPill 44px (§K6); the motion ladder and its three reduced-motion gates (§B5/§M6); the
countdown is the only manufactured urgency (§C5); settlement proof, refund-reason copy and the result moment untouched;
house bots never named publicly; every player string in en, sw AND zh with ONE word per concept; no text character as an
icon (PHOSPHOR's glyph family, `src/components/ui/glyphs.tsx`); Tailwind spacing is OVERRIDDEN (2 = 12px, 2.5 = 10px —
the half-step trap).

## 4 · Data facts the design rests on (verified in code 2026-10-19)

1. **The settlement price at instant T is the OPEN of the 1-minute vendor bar labelled T**, rounded to the asset's
   decimals — `src/lib/server/updown-feed.ts`, class `TwelveDataBarFeed`, "THE RULE, NAMED RATHER THAN INFERRED".
2. **The big chart's line plots each bar's CLOSE at its label time** — `src/lib/server/updown-board.ts`,
   `getAssetTerminalSeries`: `points.push({ t: inWindow[i].t, price: inWindow[i].c })`. One minute off rule 1 (measured
   gaps $0.01 on BTC, $0.29–$0.87 on gold). Its dashed reference is `livePrice` = the latest CONFIRMED observation. This is
   why Round 0 saw the chart, the tape and the card disagree. **Release B: the card's line and the fixed chart both plot
   OPENS at label time**, so the line's point at the open boundary equals the round's confirmed open and its point at the
   close boundary equals the settlement price whenever those bars exist.
3. Vendor bars: `src/lib/server/updown-terminal-vendor.ts` `vendorBarsFor(asset, range)` — 15M/30M/1H at 1-minute,
   6H/12H at 5-minute, 24H at 15-minute, 7D hourly; one credit per call; a 30-second per-process cache (15 s on failure);
   public through `/api/updown/history?asset=&range=&style=` (10 s CDN cache, ETag). **Budget:** one range per asset for the
   card line (`1H` covers every round length on offer) keeps the line inside the ruling's ~5,800/day for two assets; say
   what the chart lab's other ranges add.
4. Round timing (`src/lib/updown-durations.ts`): span = duration + `resultPhaseMinutes`; bets close
   `selectionCloseLeadSeconds` before the close; one settle closes a round and opens its successor at that boundary.
5. The board shows at most three cards: current (the newest by `boundaryAt` among started unsettled rounds), just closed,
   last settled (`getBoard`). Round 0's top logic finding: at times no card is bettable and nothing says when the next one
   opens; the successor and `chainPaused` are on the board's data, the market calendar knows gold's hours.
6. **Locally** there is no `TWELVEDATA_API_KEY`: the vendor tier returns null and the history route falls back to
   confirmed reads, and the `mock-bars` feed hashes each instant to a price between 1,000 and 5,000 (a ±50% move a
   minute). Plant realistic reads with `/api/dev-test/updown-observe` (open + a chosen move); judge realism on production
   tiles after the release.

## 5 · The work, in five packages (each change with its guard and a red proof)

**B1 · The round card, every state** (`src/components/updown/updown-card.tsx`, `updown-stake-controls.tsx`,
`round-countdown.tsx`, `round-action-panel.tsx`, `round-stake-panel.tsx`, `src/app/updown/[roundId]/page.tsx`,
`src/lib/updown-card-phase.ts`, `src/lib/server/updown-board.ts`, `.ud-*` in `globals.css`, `market.ud*` keys).
Identity row: the asset mark, the asset's name, the round's window "14:30–14:35" (EAT). Clock row: one caption per clock
and the 28px digits; the last 30 seconds says so in words in every motion tier (the reduced-motion urgency cue). The price
to beat ONCE. The live-line slot (B2). Pool · players · split. Stake chips + Up/Down. One helper line, the empty-side note
when a side is empty, one merged source line. Remove the ±$0.02 tiles, the "Open $X" footer, the "LIVE · BTC" line, the
"5 MIN" chip, the clock box, "CONFIRMED PRICE … 0.00% · Exactly at the opening price" while nothing has moved, the fake
"AWAITING RESULT" button, the "STAKE" label, the status said three times. Settled: the viewer's own result (check
`myStakesByMarket` — it takes status from the first settled row and side from the last; keep one result per side).
Confirming: quote `myPayoutIfUp/Down` in confirming too (the pool is frozen). The next-round line (running / market
closed until hh:mm / stopped). The round page says the same words. Targets at 360: ≈329px signed out, ≈381px signed in,
the same height open and locked; Up/Down inside the first screen at 360×740 (≈ y 482–582 with B3's page). Per-state
detail: `PANEL-SYNTHESIS.md` cardSpec and statesSpec (minus anything a ruling overrides).

**B2 · The live line and the chart made to agree** (`updown-terminal-vendor.ts`, `getAssetTerminalSeries`,
`/api/updown/history`, a new `RoundLiveLine` component mounted by B1, `src/components/charts/*`). Data: opens at label
times, from the round's open boundary to min(now, close), rounded to the asset's decimals, gaps kept as gaps. Cadence: 30
seconds, only for the open or locked round (a settled card shows the frozen line while its bars are still in the window,
else nothing). Drawing: the card's width × ~56px, aqua 1.5px, a dashed line at the price to beat, an end dot, the latest
point's "hh:mm EAT" and value, no axes, a minimum y-span so a one-tick wiggle never reads as a crash, static under reduced
motion, a text alternative for screen readers. States: one point only (before the second minute's bar), vendor missing
(hide the line; say "no newer price since the open at hh:mm"), stale feed, market closed. The big chart: its line plots
opens too; the dashed reference and the OHLC header are labelled in words; it is called "Price chart"; it can never
contradict the card. Guards: a unit test of the mapping (first point = the round's open when the bar exists; close point
= the settlement price), a budget test (one range per asset), red mutations (close instead of open; a range per duration).

**B3 · The board and the two chip rows** (`src/app/updown/page.tsx`, `loading.tsx`, `updown-board-tabs.tsx`, the ghost,
`outcome-cubes.tsx`, `board-viz.tsx`, the chat button, `getBoard`). Title row with labelled phone actions ("Rules", "My
bets"); two FilterPill rows (assets; the chosen asset's durations), URL state with `replace` + `scroll:false`, the sheet
only when the rows would not fit; no price tape; no "Rounds | Chart" toggle; the bettable round FIRST in every phase, and
when none is bettable a card that says when the next one opens (a server field if needed); the last-rounds strip under the
cards with one "Price chart" button that opens the fixed chart inline (height reserved, choice remembered per device);
≥1024: the chart beside the current round, no empty third column (`PANEL-SYNTHESIS.md` boardSpec); loading ghosts at the
real card heights; every empty state (running, stopped, gold closed); the floating chat button never over card content;
the 320 title fits.

**B4 · The market card** (`src/components/markets/market-card.tsx`, `src/app/markets/markets-ghost.tsx`, `.mcardp*`).
One statement of where the money is (the big percentage in a neutral ink with the side caption in its own ink — check
§B2/§B2a, and the case where NO leads); the 24h move and the 7-day trend labelled ("7 days" / "siku 7" / "7天"), legible,
with a minimum scale, aqua; ONE word per state for void / resolved / closed; one status chip, ordered (SOON before HOT,
HOT the only rose chip, CLOSED royal); a one-row footer; "Close call" vs "Closest call" made one word; the Watching empty
state's star promise removed; glyphs, not ▲▼↑↓→; every size on the ladder; the press scale token; the skeleton at the
card's radius and height (`PANEL-SYNTHESIS.md` marketCardSpec).

**B5 · System, motion, palette, copy.** The half-step spacing trap in every touched file (named classes on `--sp-*`;
`test:spacing-scale`'s ceiling drops); every off-ladder size onto a rung (`test:type-scale`); one inset recipe; motion per
`PANEL-SYNTHESIS.md` motionSpec (a live dot only on the bettable card, the rollover arrival, the pool needle's travel, every
rule with its three reduced-motion branches); palette per paletteSpec (LIVE once per screen; `--brand-300` only for links
and selection; gold only for earned money); copy: "round" = "raundi" = "回合" everywhere (no "mechi"/"match"), ONE name for
the game in each language (today "Juu na Chini" on /updown and "Juu au Chini" on /live — pick one, use it everywhere),
one pool word, "dakika 5" (numeral after the noun), the receipt's "$2,126.26" grouping and "hh:mm EAT". The stored
Swahili market titles with errors are CONTENT: list them for Ali; never change data.

## 6 · Guards that read these files (re-run; update in the open with a dated comment; never weaken)

`test:journey-updown` §6.1 (pins the five classic Up & Down files to base `c14cb403e`; re-pin in the open or add named
SWAPS), `test:betting-ink` §2a (the pulse's home), `test:labels` §3c/§4 (side words from `sideWord`, ≤11 private maps),
`test:outcome`, `test:updown-hedge-quote` (+red), `test:card-choices` (+red), `test:one-sided` (+red),
`test:contrast` (+`red:contrast-callsite`), `test:house-bot-disclosure` 5.1 (pins `i18n-dict.ts` at a named commit —
re-point it to your release commit whenever the dictionary changes), `test:updown-pricing`, `test:updown-match`,
`test:updown-filter-sheet` (+red), `test:filter-language`, `test:visual-pass-r*`, `test:density-contract`,
`test:type-scale`, `test:spacing-scale`, `test:motion-ladder`, `test:reduce-motion`, `test:ui-consistency`,
`test:design-frozen`, `test:tokens`/`bridge`/`measure`, `test:i18n`, `test:trilingual`, `test:red-anchors`, `test:orphans`,
`test:guards-exist`, `test:predictor-shown`, `test:card-share`, `test:board-discovery`, `qa:card360`,
`qa:updown-card-widths`, `qa:classic-shell-parity`, `qa:live`. Find the rest: grep `scripts/` for every path you change.

## 7 · Tools on main

- `npm run qa:u43-capture` — read-only, any BASE (production too). Env: `BASE`, `TAG`, `OUT`, `LOCALES`, `WIDTHS`,
  `SURFACES` (updown, updown-chart, updown-sheet, markets, home, live), `PARALLEL`, `STORAGE`. Writes frames + `index.json`
  (card boxes, font sizes, radii, row gaps, dollar figures, Up/Down y vs the fold, every side choice's text and name).
- `npm run qa:u43-states` — local dev only, every card state (p1-open … p13-gold-board), signed in once via `/auth/demo`.
  ⚠️ Start the dev server with `UPDOWN_SCHEDULER=false UPDOWN_HEALER=false` (in-memory store, no `DATABASE_URL`), or a
  timer round hides the round under test (release A's run photographed a fresh round in place of the last 30 seconds).
  Records each pulse element's running animation per frame.
- The critics read: eight lens reviewers over the tiles, each claim re-checked on its frame by an adversarial verifier,
  then a completeness critic; score every cell; loop until 10/10 twice in a row.

## 8 · Releasing (AGENTS.md §4, and this machine)

Stage by name; commit with a message FILE (`git commit -F`); rebase on `origin/main` right before the push; `next build`
at the exact commit; local `qa:live`; push with a full refspec (`git push origin <sha>:refs/heads/main`) and verify with
`git ls-remote` (a bare `git push origin <branch>` can print "Everything up-to-date" without pushing); then the read-back:
`?dpl=<sha>` on www, apex and the Railway host, `/api/health`, `npm run qa:chunks-prod -- --origin <url>` on both public
origins, production `qa:live` (`BASE=https://www.50pick.tz`), and the changed pages looked at in a real browser. A money
path change (anything that quotes or moves money) adds `test:all` and `e2e:money`, `e2e:fault`, `e2e:card` on a throwaway
Postgres (`e2e:card` on its OWN database — after the other two its platform total counts their bets). On OMEGA-COMPILE01:
heavy jobs (tsc, build, dev servers, DB suites, red twins, test:all) take a slot `F:/kipindi-locks/mln-slot-N` (U43 5–8,
Maswali 1–4, Phosphor 9–12; free RAM ≥ 5 GB); `KP_SCRATCH_PORT=5491` for U43's scratch Postgres; Git Bash eats
backslashes even in quoted heredocs (write such files with an editor tool); never `rm -rf` a worktree whose
`node_modules` is a junction (rmdir the link first).

## 9 · Three lanes, one main

PHOSPHOR (glyphs; its 1b touches `updown-card.tsx` side arrows at Inter 700 on `.btn-yes/.btn-no`, the locked chip's
lock in Fill, the round page's outcome chips, the board's rules pill glyph — carry those choices into the new markup) and
MASWALI (Millionea; owns `src/app/markets/page.tsx` and `/updown/history`) push `main` too. Before a push: take
`F:/kipindi-locks/main-push.lock` (`mkdir`; write `U43 <time> <sha>` into an `owner` file), push, read back, then remove
your owner file and `rmdir`. If it is held, keep working and retry. Say in your tracker's §0 what you are about to push and
which shared files it touches (`globals.css`, `i18n-dict.ts`, `updown-card.tsx`, `market-card.tsx`); read the other lanes'
§0 (`docs/MASWALI-PLAN.md`, `docs/PHOSPHOR-MIGRATION.md`) before editing a shared file. Keep U43's §0 current and pushed.
