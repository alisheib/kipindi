# S8 WP2 — the pure core: report (helper session, 2026-10-13)

**Branch** `vodacom-s8-wp2`, cut from `origin/vodacom-s8-wp0-draft` `bbbf2cb7`. **One commit:** `4d8acb6a9`
"Vodacom S8 WP2: the bet sheet's pure core - its rules, the refusal matrix, the quote and its key". No PR. Node v24.21.0
(SHA256 checked against SHASUMS256.txt). No server, no browser, no production touched.

**Served bytes for a classic viewer: none.** Nothing is mounted. The two new modules have no importer in `src/`.
`shortfall.ts` reaches the browser through no client file: `/wallet/deposit/page.tsx` is a server page and imports only
`DEPOSIT_QUICK_AMOUNTS`. `estimate.ts` (which `how-to-play-sheet.tsx` imports) changed in a comment only, and the
minifier strips comments.

## Built, file by file

- **`src/lib/journey/sheet-state.ts`** (new, pure, client-safe). Every export, with what it does:
  - `sheetChips`: `quickStakes(min, max)` at the market's own minimum (A24: 500 · 1,000 · 2,500 · 5,000; a market at
    1,000 gives 1,000 · 2,000 · 5,000 · 10,000). In the loss room it drops every chip above the room.
  - `sheetPreset`: the minimum, or the address's allowed stake.
  - `sheetStake`: whole stakes only. A decimal part that is not all zeros is `notWhole`. The breaks are
    empty / notWhole / below / above.
  - `sheetEstimate`: `estimateFor`, narrowed to six fields. A stake it cannot read is −1, never the card's zero.
  - `sheetPlan` (A9): `shortfallPlan` on viewer facts that are loading, failed or read. Without facts it answers only
    the market's half, then `loading` or `unknown`. With an empty stake it keeps only the blocks that hold at any stake,
    else `empty`.
  - `sheetFrame`: the frame for every state, plus the CTA's label, whether it is enabled and what describes it. Its order
    is receipt → placing → in doubt → the settled view → the plan.
  - `quoteAt`.
  - `estimateMoved`: true only for a moved pool under an unchanged stake.
  - `clockOffset` and `closedAt`: the dial's rule on the server-offset clock.
  - `holderLine`.
  - `pendingBand` (A10): under 10 min / 10–30 min / from 30 min, on the server-offset clock.
  - The intent, and how its key is reused:
    - `SheetIntent` has three phases: placing, inDoubt and retry.
    - `nextKey` (A2): a double tap, or any tap in doubt, reuses the key and the FROZEN quote. A BUSY retry reuses the key
      only for the same stake. Anything else mints a new key.
    - `afterSettle`.
    - `isIntentKey`: UUIDs only.
    - `mintIntentKey`: `randomUUID`, else a v4 UUID built from random bytes.
  - `requestFor`: exactly seven fields. It returns null for a side that is not YES or NO, a stake that is not a whole
    positive number, a market id of the wrong shape, or a key that is not a UUID (`hb:` included).
  - The watchdog (A7): `placingStage` and `watchdog`, at 1.5 s and 20 s.
  - The key read (A2): `afterKeyRead` and `keyReadDelay`. `DOUBT_SETTLE_MS` = 10 min, counted from the settle.
  - The marker and the address (A3): `markerKeyFor` and `reopenInDoubt`; `SHEET_PAGES`, `sheetOpensOn`, `withBet` and
    `withoutBet` (cat/q/page/from kept; side stripped on request).
  - `blockFor` and `closedBody`.
  - `openReadRecord` (A4's pure half): which audit row the open's read writes.
- **`src/lib/journey/sheet-refusal.ts`** (new, pure, client-safe):
  - `refusalOutcome`:
    - keyed on `reason`, else on `code`, never on `error`;
    - a reason the matrix has no row for is an unknown shape (row 2), never re-keyed on its code;
    - for a rejected call: `isActionRedirect` first (A6/L3), then the name `UnrecognizedActionError`, then system_error;
    - `ok` with `replayed: true` is row 24, a receipt (one ticket, the marker cleared);
    - `ok` with no `positionId` is an unknown shape.
  - `settleRefusal` (A8): the one step that settles an answer. Rows 10, 12, 15, 19, 20 and 21 are decided from a fresh
    re-read. A2's doubt rules apply here: refusals made before the wallet lock hold the doubt, the key and the marker key.
    Rows 1 and 6 never show their words in doubt; rows 16–22 end the doubt.
  - It exports `CLASSIFIED_REASONS`, `CLASSIFIED_CODES` and `HOUSE_ONLY_REASONS` for the census.
- **`src/lib/journey/shortfall.ts`**:
  - `DepositOption.leftAfter` = spendable + D − stake.
  - A10: `pendingDeposit` gains `createdAt: string | null` (null means its age is unknown, read as the fresh band). The
    `pending` plan carries `createdAt` and `betInstead`, computed as `short` computes it. The step list and every other
    output are unchanged; "bet instead" is now computed before the pending return, with the same value.
- **`src/lib/markets/estimate.ts`**: the over-cap comment only (Correction 20).
- **`scripts/bet-sheet.test.mts`** (new):
  - §1 to §6, 34 checks, with a 55-plant twin.
  - Each check has at least one plant, and the twin asserts that.
  - **package.json:** `test:bet-sheet` (in predeploy, after `test:shortfall`) and `red:bet-sheet`.
- **`scripts/shortfall.test.mts`**:
  - a new §5 (`5.leftAfter`, `5.pending`) with four plants;
  - `4.email`'s exact field set gains `leftAfter`. This is not a loosening: an email field still fails it;
  - the two pending inputs gain `createdAt: null`.
- **`scripts/journey-funnel.test.mts`** (A16): `CALLERS` gains `sheet-state.ts`, and 8.census is re-pinned in the open
  to `betFields.length === 3`, which includes `"sheet"`.
- **`scripts/client-graph-safe.test.mjs`**: pins both new modules.

## Gate verdicts

All gates ran at the tip `4d8acb6a9`, each alone. The last summary line of each is quoted verbatim.

| Gate | Exit | Summary |
|---|---|---|
| test:bet-sheet | 0 | BET-SHEET — all checks passed (34 checks) |
| red:bet-sheet | 0 | RED CONTROL — 55/55 caught |
| test:shortfall | 0 | SHORTFALL — all checks passed |
| red:shortfall | 0 | RED CONTROL — 17/17 caught |
| test:journey-estimate | 0 | JOURNEY ESTIMATE — all checks passed |
| red:journey-estimate | 0 | RED CONTROL — 14/14 caught |
| test:failure-reasons | 0 | failure-reasons (with §8 + §9 + §10): 387 passed, 0 failed |
| test:client-graph-safe | 0 | ALL PASS — client-graph-safe: 6 passed, 0 failed |
| test:rate-copy | 0 | rate-copy: 40 passed, 0 failed |
| test:money-minimums | 0 | money-minimums: 41 passed, 0 failed |
| test:pending-bet / red | 0 / 0 | PENDING BET — all checks passed / RED CONTROL — 19/19 caught |
| test:journey-funnel / red | 0 / 0 | JOURNEY FUNNEL — all checks passed / RED CONTROL — 26/26 caught |
| test:deposit-ceiling / red | 0 / 0 | DEPOSIT CEILING — all checks passed / RED CONTROL — 9/9 caught |
| test:journey-sheet | 0 | JOURNEY SHEET — all checks passed |
| test:journey-home | 0 | JOURNEY HOME — all checks passed |
| visual-pass-r5k (reads shortfall.ts) | 0 | visual-pass-r5k: 55 passed, 0 failed |
| test:contacts-boundary (reads client-graph-safe) | 0 | contacts-boundary: 35 passed, 0 failed |
| test:red-anchors | 0 | red-anchors: 5289 passed, 0 failed |
| test:guards-exist | 0 | (pass) |
| test:docs | 0 | ✅ every reference in docs/ resolves. |
| typecheck (`npx tsc --noEmit`) | 0 | clean |
| **test:orphans** | **1** | 🔴 2 UNDECLARED orphan(s): `scripts/qa/landing-v3/panels/band-panel.js`, `hero-panel.js`. **Not WP2's:** it reproduces identically at the base `bbbf2cb7` in a separate worktree. Left as found. |

**Red twins, by count.**

| Twin | Caught |
|---|---|
| red:bet-sheet | 55/55 |
| red:shortfall | 17/17 |
| red:journey-estimate | 14/14 |
| red:pending-bet | 19/19 |
| red:journey-funnel | 26/26 |
| red:deposit-ceiling | 9/9 |

⚠️ **A procedural slip, recorded.** Two gate batches overlapped once and wrote to one log directory. One
`red:journey-funnel` line read "26/26 caught · 1 FAILED" from that overlap. It was rerun alone at the tip: 26/26, with no
FAILED line. Its 8.census had also been red once before the fix, because two of my comments quoted
`funnelBetFields(fd, "sheet")` verbatim and the census reads raw text. I reworded the comments and left the census alone.

## Calls taken under delegation (each with its overrule)

1. **`nextKey(prior, quote, mint)`, not the plan's `nextKey(prior, outcome)`.** The decision needs the quote: in doubt
   the old quote is returned, and a BUSY retry is reused only for the same stake. The outcome is folded in by
   `afterSettle`. Overrule: the outcome-keyed signature.
2. **BUSY drops the marker's key (`dropKey`).** Admission shed the bet before anything ran. A keyed marker would lock a
   reloaded sheet in doubt for 10 minutes over a bet that never existed. The retry's own tap writes the key again
   (A3 item 4). Overrule: keep the key.
3. **A reason with no matrix row is row 2 (unknown, in doubt), never re-keyed on its code** (Open point 35's rule,
   applied strictly). Overrule: fall back to the code.
4. **`SUSPENDED` with no reason is an unknown shape.** Every player-path site carries a reason, so the census accepts the
   code only as "with a reason". Overrule: a row of its own.
5. **Row 10 in doubt adds no line beside `failSystemError`.** Its shape is ambiguous (the account or the market, A8).
   Rows 12 and 15 add `sheetNotTaking`. Overrule: `sheetBlocked`.
6. **Row 19's re-read with no loss limit set now is the block, not the loss room.** This is the conservative reading of
   A8's "less, or a failed read → the block". Overrule: the edit frame.
7. **An unknown deposit age (`createdAt: null`) is the fresh band**: the live sentence, no "bet instead".
   Overrule: the late band.
8. **Skew detection is by `name === "UnrecognizedActionError"` only.** No message test, because a message test is
   prose. Overrule: also `import-loop.ts`'s message regexes.
9. **`openReadRecord` (A4) lives in sheet-state** as the pure half; WP3's route calls it. The RG census
   (`auditActionWrites`) reads only `audit()` calls, so naming the actions here adds no writer. Overrule: keep it in the
   route.
10. **Keyed-marker parsing (`markerKeyFor`) lives in sheet-state.** It is built on `readMarker`. `pending-bet.ts`
    (WP7b's) is unchanged: today it still drops `k`, so `markerKeyFor` re-reads the raw string. Overrule: WP7b moves it
    into `pending-bet.ts`.

## Where the plan and the code disagree (candidate amendments)

1. **The import list for `sheet-refusal.ts`.** WP2 step 1's list has no `action-redirect.ts`, but A6/A24 require
   `isActionRedirect`. The module also imports `./shortfall` (`lossHeadroomFor`) and `./sheet-state`. §6 allows exactly
   that list.
2. **`DOUBT_SETTLE_MS` ceiling.** Recomputed from the source:
   - admission's clamp, 60 s;
   - 4 attempts × (7 awaited pre-lock reads × 10 s pool wait + 10 s lock wait + 30 s lock run);
   - the backoff, 780 ms.
   That totals **500,780 ms ≈ 8.3 min**, under 10 min. A2 says "about nine minutes"; the difference is the read count.
3. **The pending plan's "bet instead" is never clamped by the loss headroom in practice.** A stake within the room and
   above spendable means spendable is already under the room (and the same holds for the stake maximum). So `min(...)`
   reduces to `floor(spendable)`. A plant for the clamp is unobservable and was replaced by observable ones.
4. **`journey.*` keys.** The modules name 17 journey keys that WP4 adds (listed in `test:bet-sheet`'s `WP4_KEYS`, which
   `6.client-safe` holds to). Every other key they name exists in the dictionary today.
5. **Matrix rows 20/21's `detail.balance` is not shown** (A9 over the body): the plan from the re-read decides.

## Left undone, and why

- **§7–§11 of test:bet-sheet** belong to WP6, WP7 and WP10, per the plan.
- **No dictionary keys** were added: that is WP4.
- **The `pending-bet.ts` marker key field** is WP7b's.
- **The RG census and the route** are WP3's.
- **No `test:red-anchors` anchors file** was added; none was needed.

## Review fixes (commit `38b7e0c47`, on top of `4d8acb6a9`; no rebase)

| Finding | What changed | The check and plant that hold it |
|---|---|---|
| 1 (money): a retry's in-lock refusal ended the doubt while the lost first attempt could still land | `SettleContext.priorSettledAt` (the intent's `settledAt` when this attempt was sent; null for the first attempt's own answer). While in doubt, an in-lock refusal within `DOUBT_SETTLE_MS` of it HOLDS the doubt: `keepKey`, retry `same`, and its own line where it makes no money claim (row 17 `sheetFrozen`, row 19 `failLossLimitDaily`, rows 20–21 `journey.lowTitle`, row 18 none). It ends only once the window has passed. Rows 16 and 22 (`final`) end at once: a key another bet holds stays held, and a closed selection never reopens. The first attempt's own late answer ends it. **Call taken: row 17 (frozen) holds too**, because an officer can lift a freeze (the coordinator allowed it to end). | `3.retry-window`: at now − 5 s every in-lock row holds with `keepKey` and `nextKey` reuses the key; at the window's last millisecond it holds; at now − DOUBT_SETTLE_MS it ends with `dropKey`; 16 and 22 end. Plants: an in-lock refusal of a retry ends at once; the window never closes. `3.doubt-ends` is now the first-attempt case (priorSettledAt null). |
| 2: the money flags were not tied to the source | The census places every site before or after `reach.reached = true` in `buyPositionInner` (every `buyPosition` and `buyPositionAction` site counts as before). It asserts `refusalOutcome(...).inLock === postLock` for every (site, reason), with one named exception: the action's `hb:` `idempotency_key_conflict`. `code: "BUSY"` occurs exactly once, inside `buyPosition`'s `AdmissionBusy` catch. `SUSPENDED` is removed from `CLASSIFIED_CODES`. `3.doubt` now also runs every pre-lock (code, reason) the census reads from the source (≥ 16 of them). | `2.lock`, `2.busy-once`, the widened `3.doubt`. Plants: a pre-lock row flagged in-lock; a pre-lock site emitting `balance_insufficient` (source plant); a second BUSY site after the L2 check (source plant); SUSPENDED classified by code again. |
| 3: the window must run from the LAST same-key settle | Already the behaviour (`afterSettle` sets `settledAt` to now); now pinned. | `3.settle-last`: settled at T0, held again at T0 + 590 s → `settledAt` is T0 + 590 s; a null read at T0 + DOUBT_SETTLE_MS holds, at T0 + 590 s + DOUBT_SETTLE_MS it ends. Plant: keep the first settle. |
| 4: the receipt printed the typed stake | `SettleContext.quote` (the COMMITTED quote) replaces `stake`. `SettledView` receipt, plan, lossRoom and lowNoRead carry it, and `sheetFrame` draws those views at the committed stake, never at the typed box. | `3.receipt`: "bet 2,000 instead" from a 5,000 low frame receipts 2,000 (the ticket, no payout figure); a balance refusal's re-read plan is drawn at 2,000 (shortfall 800, CTA "· 2,000"); a failed re-read is drawn at 2,000 with null figures. Plants: the receipt falls back to the typed stake; the plan is drawn beside the typed box; the figures drawn as zero. |
| Note a | `answerOf(call) → ActionAnswer` exported from sheet-refusal. | `3.answer` (plant: a throw turned into an invented BUSY); golden `{ code: "BUSY", reason: "system_error" }` → row 2, in doubt, `keepKey`. |
| Note b | `nextKey` reuses a key only for the same (market, side) (A2 item 4). | `3.keys` gains the other side and the other market. Plant: reuse for the other side. |
| Note c | `low.shortfall` and `low.spendable` are `number \| null`; `lowNoRead` sets null. | `3.receipt` (plant: zero). |
| Note d | Row 16 `moneyClaim: true`. | Its line is now never shown in doubt; it ends a doubt before any line shows. |
| Note e | `afterKeyRead`'s doc: `readAtMs` is the read's SEND time. | `3.settle` passes a send time one ms inside the window, answered seconds later, and it holds. (The pure function cannot see an arrival time, so no plant is possible here; the host is WP7b's.) |
| Note f | `markerKeyFor` is replaced by `markerIntentFor(raw, {id, side}, now) → {key, stake}`. It matches on (id, side) and reopens in doubt at the MARKER's stake when the address's stake differs or is missing. **A3 item 5 is widened, not kept:** it names the same-stake case, and does not forbid this one. Dropping the key there would let a second key be minted while the first may land. Candidate amendment to A3 item 5. | `3.marker` (9 cases). Plants: another side's key trusted; the key dropped on a differing stake (the old full-bet match). |

**Gates after the fixes,** at the tip `38b7e0c47`, serial, one log directory:

- test:bet-sheet: 40 checks, all passed.
- red:bet-sheet: **68/68 caught**, every check with a plant.
- test:shortfall · red 17/17.
- test:journey-estimate · red 14/14.
- test:failure-reasons: 387/0.
- test:client-graph-safe: 6/0.
- test:rate-copy: 40/0.
- test:money-minimums: 41/0.
- test:pending-bet · red 19/19.
- test:journey-funnel · red 26/26.
- test:deposit-ceiling · red 9/9.
- test:journey-sheet; test:journey-home.
- test:contacts-boundary: 35/0.
- test:red-anchors: 5289/0.
- test:guards-exist; test:docs.
- visual-pass-r5k: 55/0.
- typecheck: clean.
- test:orphans: exit 1, the same two base orphans (`scripts/qa/landing-v3/panels/band-panel.js`, `hero-panel.js`), unchanged.
