# E-166 · THE UP & DOWN HANDOVER — what shipped, and what the next session should know

**Session 45 · 2026-08-19 · laptop A (`F:\kipindi-main`).**
Status: **SHIPPED to `main`.** Register row: `docs/LIVE-QA-CAMPAIGN.md` → **E-166**.

> ⚠️ **Read this file for the reasoning; read the code comments for the rules.** Every decision
> below is also recorded at its own definition site, which is where it will stay true. This
> document is a **record, not a rule** — if it ever disagrees with the code, the code wins and
> this file should be corrected or deleted.

---

## 1 · What the brief asked for, and the one thing measurement changed

Ali, 2026-08-19: *"every ending round confirmed ⇒ the next one is already armed and takes the
screen"* — with a countdown pod reading **"NEXT MATCH IN 0:47"**.

⭐ **That countdown is the 1.3% case, and finding that out changed the design.** Before writing
any UI, `scripts/live/ops/handover-gap-census.cjs` (new, read-only) was run against production
over **every settled round in 24 hours, n = 1,203**:

| Measurement | Value |
|---|---|
| successor **already open** when the result landed | **1,186 / 1,203 — 98.6%** |
| median `successor.opensAt − predecessor.resolvedAt` | **−91.5s** (p10 −121s, min −306s) |
| median `successor.createdAt − predecessor.resolvedAt` | **0.1s** |
| successor still in the FUTURE | 16 / 1,203 — **1.3%** |
| successions opening exactly where the predecessor closed | **2,337 / 2,357 (99.15%)** over 48h |
| the 20 that do not | gap by **11 to 83 minutes** |

The cause is structural: **`advanceChain` closes round N and opens round N+1 inside ONE call**,
both gated on the same confirmed observation, and the dated bar that confirms it publishes ~91s
after the boundary. So `successorOpensAt − now` is **negative** almost every time, and the
briefed countdown would have rendered a dead or negative clock on 98.6% of settles.

⛔ **So `live` — the common phase — counts nothing at all**, and that was decided by a
screenshot, not by reasoning. The first build ran the digits to the successor's bets-close; the
board then showed **two identical `02:50`** 300px apart, because the successor is the card
immediately to the left. The next match's clock belongs to the next match.

---

## 2 · The six defects this closed (all read off production the same morning)

1. **`/updown/[roundId]` froze for ever on a settle** — `refreshCadence({settled:true})` returns
   `{enabled:false}`. Only a manual reload escaped.
2. **A dead `00:00`** on both surfaces — E-99's rule 3 broken in the one branch it never covered
   (`spent` requires `inResult`; a settled round never enters it).
3. **"Closed" as a result** — the settled card read *"Closed · BTC"* beside its own *"Up wins"*,
   and a **locked** round, still running, said "Closed" too.
4. 🔴 **The front door was a dead chain.** `/updown` defaulted its duration to `durations[0]` —
   simply the shortest — and BTC's shortest is the **STOPPED** 3-minute chain. The board served
   **one card: a round settled 25 hours earlier**, while 5m/10m/15m were live one tab away.
5. **The card's clock stopped at the close** — `nowMs` came from `useCountdown`, which clamps at
   zero. `resultClock.counting` stayed true for ever (a dead `0:00` through every overrun) and
   the handover pinned in `hold`.
6. **A hold anchored to `resolvedAt` is no hold** — the poll is up to 5s (round page) or 20s
   (board) late. Measured: the redirect fired **155ms** after the result rendered.

⚠️ **Four of the six were found by the E2E and the screenshots, not by any suite.**

---

## 3 · Where it lives

| File | What it owns |
|---|---|
| `src/lib/updown-card-phase.ts` | `handoverClock()` — the pure rule, beside `roundPhase`/`resultClock` |
| `src/lib/feedback-timing.ts` | `DWELL_HANDOVER_HOLD_MS` (2.5s) — with the other dwells, because it must be read against the 7s celebration |
| `src/lib/refresh-cadence.ts` | the bounded third arm + `handoverPollUntil()` |
| `src/lib/server/updown-board.ts` | `RoundSuccessor`, `successorFor()`, `withSuccessors()`, the board default fix |
| `src/components/updown/round-countdown.tsx` | the pod's handover branch, `useHoldAnchor`, `useServerNow`'s `visibilitychange` |
| `src/components/updown/updown-handover.tsx` | the bar **and** the auto-advance, with its five gates |
| `src/components/updown/updown-card.tsx` | the board card's pod, header word, handover line |
| `src/app/api/dev-test/updown-handover/route.ts` | the deterministic E2E harness (404 in prod) |

**Proof:** `test:updown-handover` (116) · `red:updown-handover` (19/19) · `test:refresh-cadence`
(34) · `red:refresh-cadence` (8/8) · `qa:updown-handover` (29, a real settle twice deferred and
twice resumed) · `qa:updown-handover-widths` (198, 5 widths × 3 locales, every pod **63px**).

---

## 4 · The decisions most likely to be second-guessed — and why they are what they are

- **`live` shows `—:—`.** Not laziness. See §1. A settled card's job is *result → what next → a
  way there*, and the next match's clock is already on screen one card away.
- **The hold is 2.5s and is the SHORTEST dwell in `feedback-timing.ts`.** The successor is
  already ~91s old; a generous hold is betting time taken from the player.
- **The hold is stamped DURING RENDER, not in an effect.** An effect runs after the commit, so on
  the render where `settled` first flips true the stamp does not exist yet and the rule falls back
  to a stale `resolvedAt`. That is defect ⑥ above, and it is the single subtlest thing here.
- **`ready` requires a successor ROW, never "the open instant has passed".** A boundary can arrive
  minutes before the round that starts there exists. `red:updown-handover` mutation 4 is that.
- **The successor is matched on `opensAt === closesAt`, never `roundNumber + 1`.** 20 successions
  in 48h skip a boundary; the numbers stay adjacent while the clock does not.
- **`router.replace`, never `push`.** A chain emits for ever; `push` would make Back walk the
  player backwards through dead rounds one at a time.

---

## 5 · ⛔ THE COUPLING THAT IS LOAD-BEARING AND EASY TO BREAK

The win celebration dwells **7 seconds** (`DWELL_CELEBRATION_MS`); the handover moves the player
at **2.5 seconds**. On the numbers the handover would navigate a winner off their own seal.

**It does not, and the reason is structural, not numeric:** the celebration is a kit `<Modal>`,
`<Modal>` calls `useModalLock`, `useModalLock` sets `body.style.overflow = "hidden"`, and the
auto-advance defers to exactly that lock.

⛔ **If a celebration ever renders outside the kit modal, a winner loses their moment at 2.5s.**
Guarded at `test:updown-handover` §8.11–8.11c, and stated at the top of `DWELL_HANDOVER_HOLD_MS`
so the person changing the timing sees it.

---

## 6 · What is OPEN, and what I deliberately did not touch

| Item | Why it is left |
|---|---|
| 🔴 **The other session's live incident (`50c3a282`): two chains fail `fire` every tick with *"Cannot create a market with a past or invalid resolution date"*.** | **Not mine to fix mid-merge, but I hit the identical guard building the E2E harness and can name the mechanism:** `openRound` computes `closeIso = openBoundary + span`; when a chain's `nextBoundaryAt` is far enough in the past that `closeIso` is ALSO in the past, `createMarket` rightly refuses, `advanceChain` throws, and the scheduler's `finally` re-arms — for ever. ⭐ **The fix belongs in the scheduler/`advanceChain`, not in `createMarket`:** a boundary whose close is already behind us must be ABANDONED (the branch already exists, `abandonAfterSeconds`) rather than retried. ⚠️ Confirm on production before assuming it is still live. |
| `test:design-one-door` — README claims 57 docs, disk has 61 | Not mine. 59 are TRACKED (the other 2 are untracked PDFs sitting in `docs/`), so the real drift is 59-vs-57 from the incoming merge. Touching a shared doc index while another session is active is the §8b collision. |
| Upstream **E-161** — `tsc` does not typecheck `.mts` | Their filed item; a `tsconfig` change affects the whole repo. ⭐ **But mine were checked manually against a temporary config and one real implicit-`any` was found and fixed.** |
| `/updown` is absent from `scripts/responsive-audit.mjs`'s route list | Only the ADMIN updown routes are swept there. `qa:updown-handover-widths` covers the player routes more strictly (trilingual, per-element), so the gap is covered but not by that tool. |
| The `counting` phase has no screenshot | It is genuinely unreachable on demand: it needs a settle whose successor could not open, which only market-hours closure produces (a gold weekend). Covered exhaustively at the rule level (§4 of the node suite, exact target values + slip + anti-constant) and by RED mutation 2. |

---

## 7 · Two traps this session paid for, that the next one will meet

1. ⛔ **RE-GREP THE `E-` IDS AT THE MOMENT YOU FILE.** This work was numbered **E-119**, then
   **E-161**, before landing on **E-166** — twice colliding with ids taken while the session ran
   (once historically, once by 53 commits that arrived on `origin/main` mid-session). Standards
   §8b says this in one line and it is worth more than it looks.
2. ⛔ **A HARNESS CAN BE WRONG ABOUT A PRODUCT THAT IS RIGHT — three of mine were.** A URL check
   that matched the round id inside its own `?from=`; a stopped-state check that matched the
   settlement proof's `13:47:22 EAT` **and passed vacuously in SW and ZH**; and a
   `visibilitychange` guard asserting a word that survives in the `removeEventListener` beside
   it. `red:refresh-cadence` also lost **3 of 5 anchors** to this change and printed
   *"ANCHOR NOT FOUND … proves NOTHING"* rather than a false green — E-108's lesson holding.

---

## 8 · Running the proof yourself

```bash
SESSION_SECRET=e2e-handover-secret-key-0123456789abcdef OTP_PEPPER=e2e-pepper-0123456789 UPDOWN_SCHEDULER=false LIFECYCLE_TICKER=false npx next dev -p 3011
```

⚠️ **`LIFECYCLE_TICKER=false` matters** — the healer settles overdue rounds on a 60s cadence, and
a round settling mid-sweep changes what is on screen between one width and the next. That is not
hypothetical: it produced a perfect set of Swahili screenshots of the WRONG state, which is why
both drivers now ASSERT the phase they photographed.

```bash
LIVE_BASE=http://localhost:3011 npm run qa:updown-handover
```

```bash
LIVE_BASE=http://localhost:3011 npm run qa:updown-handover-widths
```
