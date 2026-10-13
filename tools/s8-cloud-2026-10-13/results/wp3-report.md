# S8 WP3 — the server reads: the viewer's facts with no write, the pending deposit, the card's seed

Helper session, 2026-10-13. Base: `origin/vodacom-s8-wp0-draft` `bbbf2cb7`. Node v24.21.0 (SHA256 checked against
SHASUMS256.txt). Built as S8-PLAN WP3 with A1, A2, A4, A8, A9, A10, A11, A16 and A24 applied.

## Branch and commits

`vodacom-s8-wp3` (pushed), tip **`545930db`**:

- `e197d6fb` Vodacom S8 WP3: the server reads - the viewer's facts with no write, the pending deposit, the card's seed
- `545930db` Vodacom S8 WP3: test:failure-reasons 8c.loss-limit names the sheet's open read as a caller that refuses no player

## Served bytes for a classic viewer

**None.** Every change is server code (`journey-sheet.ts`, `responsible-gambling.ts`, the two stores, the route,
`catalogue.ts`'s comment) or scripts. No client module imports `journey-sheet.ts`, and `test:client-graph-safe`
passes. `journey-card.tsx`, a server component, already imports `cardFigures` from it, so the sheet module's new imports
add to the server graph only. No page reads the route. Nothing is mounted.

## What was built, file by file

- **`src/lib/server/responsible-gambling.ts`**
  - `sessionStandingOf(row, playStartedAt, now)`: pure. It is `checkSessionTimeLimit`'s arithmetic moved unchanged, and
    it returns the verdict plus the clock fields the gate's write needs.
  - `checkSessionTimeLimit` calls `sessionStandingOf`, then writes exactly as before (same condition, same values).
    Output and write are unchanged.
  - `readSessionStanding(userId, playStartedAt, now)`: the same verdict, read through the gate's own `getRgSettings`. It
    never touches `playStartedAt` or `playLastSeenAt`.
  - `SessionStanding` type exported.
- **`src/lib/server/store.ts` and `src/lib/server/prisma-dal.ts`**: `txn.newestProcessingDeposit(userId)` →
  `{ amount, txnId, createdAt } | null`.
  - It returns the user's newest DEPOSIT in PROCESSING; a tie on `createdAt` breaks by `id` descending.
  - Memory: a filter over the user's rows.
  - Prisma: one `findFirst` with `where { userId, type: "DEPOSIT", status: "PROCESSING" }` and
    `orderBy [createdAt desc, id desc]`.
- **`src/lib/server/journey-sheet.ts`**
  - `sheetPublicFrom(m, bounds, nowMs)`: pure assembly. `sheetPublic` hands it the row after the stake-bounds await, and
    its output is identical to before (§7.unchanged).
  - `sheetSeedFor(m, nowMs)`: `{ v: 1, …sheetPublicFrom without estimates }`. It is null where `sheetPublic` is null.
  - `viewerFacts(userId, playStartedAt)`: one `Promise.all` over the gates' own reads, null if any read fails or the
    account is missing. The reads:
    - `isMaintenanceMode`;
    - `isLockedOut` (self-exclusion first);
    - `readSessionStanding`;
    - the user's status and `isLockedOut`'s cooling-off end;
    - `db.wallet.findByUserId`;
    - `getRgSettings` and `getLimitUsage` (loss and deposit windows, PROCESSING counted);
    - `newestProcessingDeposit`;
    - `db.sourceOfFunds.get` with `reviewStatus === "ACCEPTED"`, and `SOF_*` imported from `wallet-service.ts`;
    - `getKillSwitches` over `MOBILE_MONEY_METHODS`, giving `railNames` in chooser order and `railsOpen`.
  - `sheetForUser(marketId, userId, { playStartedAt, side, key, open })`:
    - it adds `facts`, `bonusWager` and `keyPosition`, and drops `bonusWarning` (Open point 21);
    - `bonusWager` is the market page's B2 rule: the other side held, and an active grant with wagering left;
    - `keyPosition` answers only the session user's own non-house position, and does no lookup for a key that is not a
      UUID.
  - The open's record (A4) runs only when `open` is passed. It takes `shortfallPlan` at the market's minimum stake from
    the facts, in the bet path's order, and acts on three blocks:
    - `session_limit`: runs `checkSessionTimeLimit` (which holds the sitting), then writes `rg.session_limit.enforced`
      `{ limitMin, playedMin, at: "sheet" }`;
    - `account_blocked`: writes `bet.account_blocked` `{ status, at: "sheet" }`;
    - `loss_limit`: calls `checkLossLimit(min)`, and on its refusal writes `bet.loss_limit_blocked`
      `{ stake: min, reason, at: "sheet" }`.

    Maintenance, a break, a closed market and a held wallet write nothing. Unknown facts record nothing.
- **`src/app/api/markets/[id]/sheet/route.ts`**
  - `?me=1` passes `session.playStartedAt` and `side` (YES or NO only), `key`, and `open` (the public half, only when
    `open=1`).
  - `me` stays `private, no-store`, 401 without a session; the public half stays `s-maxage=5` and names no viewer.
  - The header now states the one write (A4 item 4).
- **`src/lib/server/reports/catalogue.ts`**: the "Writers, measured" note names the sheet route (A4 item 3). No action
  name is new.
- **`scripts/journey-sheet.test.mts`**
  - §3 swaps the bonus warning for B2.
  - §5.one-source is re-pinned in the open: there is ONE `cardFigures` call, in `sheetPublicFrom`, and `sheetPublic`
    reaches it after the await.
  - New §6: the facts, each equal to its gate, and the open read's records.
  - New §7: `sheetPublic` equals the pre-extraction assembly, rebuilt in the test from the same primitives, and the seed
    equals the public half.
  - New §8: the route's parameters and anonymity, and `keyPosition`.
  - Each run uses fresh players, so the red loop is independent.
- **`scripts/deposit-ceiling.test.mts`**
  - Inputs now come from `viewerFacts` instead of a hand-built copy.
  - New fixture 1.7: a declaration under review does not lift the threshold.
  - Three new plants on the facts.
- **`scripts/rg-doors.test.mts`** §3b:
  - 3.6/3.7: `readSessionStanding` equals the gate on six session cases, with the settings row byte-identical after the
    read.
  - 3.8: control, the gate still writes.
  - 3.9–3.11: the sign-out case through the sheet, with the process clock moved:
    - first bet at 0;
    - opens at 35 (first cookie), then 45 and 55 after a fresh sign-in at 40;
    - a bet at 62 is refused `session_limit_reached`;
    - the same afternoon without the open read is accepted. This is the control that shows the hazard is real.
- **`scripts/anchors/rg-doors.anchors.mjs`**
  - `the-session-limit-stops-having-an-opinion` is re-anchored to the moved return in `sessionStandingOf`. It is the
    same defect, now silencing both readers.
  - New `the-sheet-open-read-stops-holding-the-sitting`: the open read's gate call becomes `readSessionStanding`. It is
    caught by 3.10.
- **`scripts/dal-parity.test.mts`** §32 (both twins' shape, six controls) and **`scripts/anchors/dal-parity.anchors.mjs`**
  (two cases: the Prisma twin ignores status; the memory twin reads every player).
- **`scripts/live/sheet-facts-pg-probe.mts`** and package.json **`db:probe-sheet-facts`** (A11), in the `db:probe-*`
  pattern.
- **`scripts/failure-reasons.test.mts`**: 8c.loss-limit's `READ_ONLY_CALLERS` names `journey-sheet.ts`, with its reason.
  The open read refuses no player; a tap still meets `buyPosition`'s check. This is the census A16 says a new part trips.

## Gates (exit codes and summary lines, verbatim)

| Gate | Exit | Summary |
|---|---|---|
| typecheck | 0 | — |
| test:journey-sheet | 0 | `JOURNEY SHEET — all checks passed` |
| red:journey-sheet | 0 | `RED CONTROL — 37/37 caught` (16 before WP3, 21 added) |
| test:deposit-ceiling | 0 | `DEPOSIT CEILING — all checks passed` |
| red:deposit-ceiling | 0 | `RED CONTROL — 12/12 caught` |
| test:rg-doors | 0 | `rg-doors: 129 passed, 0 failed` |
| red:rg-doors | 0 | `red:rg-doors: 27/27 defects caught` · "the tree is clean"; `git status` empty after |
| test:dal-parity | 0 | `dal-parity: 2324 passed, 0 failed` |
| red:dal-parity | 1 | `280/285 caught · working tree untouched · green after: true` — see below |
| db:probe-sheet-facts | 0 | `sheet-facts-pg-probe: 11 passed, 0 failed` (PostgreSQL 16.15 scratch, `VERIFY_DATABASE_URL`, migrated by pg-probe-run) |
| test:failure-reasons | 0 | `failure-reasons (with §8 + §9 + §10): 387 passed, 0 failed` |
| red:failure-reasons | 0 | `tree restored · 20/20 defects caught`; `git status` empty after |
| test:client-graph-safe | 0 | — |
| test:cert-d3 | 0 | — |
| test:guards-exist | 0 | — |
| test:docs | 0 | — |
| test:orphans | 1 | 2 undeclared orphans, `scripts/qa/landing-v3/panels/{band,hero}-panel.js` — **identical at the base** (measured in a worktree at `bbbf2cb7`); not WP3's |
| test:red-anchors | 0 | — |
| test:money-invariants | 0 | — |
| test:withdrawal | 0 | — |
| test:journey-home | 0 | — |
| test:journey-funnel | 0 | — |
| test:house-bot-reports | 0 | `ALL PASS — test:house-bot-reports: 3 passed, 0 failed` (embedded-postgres installed `--no-save`) |
| test:shortfall, test:loss-limit, test:wallet-freeze, test:bet-landed-key, test:wallet-receipts | 0 | — |

**red:dal-parity.** My two new cases are caught:
- 284 `prisma-dal.ts — newestProcessingDeposit ignores the status` → `32.prisma`;
- 285 `store.ts — the memory newestProcessingDeposit reads every player's rows` → `32.memory`.

The five misses are `WRONG REASON` in §25, §27, §29 and §31 (cases 101, 191, 246, 253, 269). None touches a file or
section WP3 changed. A run at the base `bbbf2cb7` also missed, on different cases: `281/283 caught`, cases 232 and 249.
That matches the flake class the brief names. Recorded, not hidden.

**db:probe-sheet-facts, mutation proof.** I dropped `status: "PROCESSING"` from the Prisma twin by hand and ran the probe
on a fresh database. It printed `10 passed, 1 failed` (check 1). The file was restored, and `git diff` showed only WP3's
addition.

`test:all` was not run. I ran the gates the brief lists, every suite that reads a changed file as text or exercises the
changed reads, and the twins. Suites that only import `store.ts`, `prisma-dal.ts` or `responsible-gambling.ts` (about 100)
were not each run. The changes there are additive: a new store method and an extracted pure function with an unchanged
gate.

## Calls taken under delegation (each with its overrule)

1. **`readSessionStanding` reads through `getRgSettings`.** That function lazily creates a default row and applies a
   due limit change, as every RG read does (A4 item 5). Using it makes the verdict exactly the gate's: a raw read
   without the effectivize step would disagree with the gate while a deferred change is due. It never writes the play
   clock, and 3.7 proves the existing row byte-identical after the read. *Overrule:* a raw `db.responsible.get` plus a
   second copy of the due-limit rule, which could drift from the gate.
2. **The open's records follow the bet path's order** (`shortfallPlan` at the minimum stake). With maintenance on or a
   break running, a past-limit open read writes nothing, exactly as a refused tap would. A4 item 2 read alone says
   "past the limit → run the gate"; A4's title says "records what a refused tap records", and I took the title.
   *Overrule:* record the session limit whenever the standing is exceeded, whatever comes first.
3. **A failed key lookup is not `null`: it throws, and the route answers 503.** A `null` read after `DOUBT_SETTLE_MS`
   ends a doubt (A2 item 3), so a swallowed error could end a doubt on a read that never happened and allow a new key.
   *Overrule:* swallow it as null.
4. **`facts` leaves out `nowMs`.** The plan reads "every `ShortfallInput` field but the stake, the market and its
   bounds". WP2's `sheetPlan(facts, seed, stake, nowMs)` brings the sheet's server-offset clock, and a second server
   clock inside the facts would be a second definition. *Overrule:* include the read time as `facts.nowMs`.
5. **A missing wallet row is `wallet: null`**, which is unknown, with the facts otherwise read. A missing account makes
   `facts` null. *Overrule:* make the whole of `facts` null for a missing wallet too.
6. **`keyPosition` is always present in `me`**: null with no key, so the shape is fixed.

## Where the plan and the code disagree (candidate amendments)

1. **The key read 404s once the market is no longer LIVE.** `?me=1&key=` lives on the market route, which answers 404
   for any non-LIVE market before `me` is read. A bet in doubt on a market that then closes, voids or resolves can never
   be settled by the key read; it stays in doubt (safe: no new key). Its receipt can arrive only through a same-key
   retry, which is then refused (row 12/22) with the doubt kept. Candidate: answer `me.keyPosition` (or a key-only
   response) for a 404 market when `?key=` is given, or settle doubts through a key read that is not market-scoped.
   WP7b should decide. WP3 left the route's 404 unchanged, as the plan says.
2. **`heldSides` counts a house bot's OPEN leg on the viewer's account.** It reads `listForUserAndMarket` with no
   `houseBotId` filter, as the market page's `myPositions` does. The bet path's anti-hedge rule excludes house legs
   (`p.houseBotId == null`). So B2's bonus line, and the holder line WP6 will draw, can name a side only the house
   holds. This is pre-existing and unchanged here; the §8 fixture keeps its house row CASHED_OUT so as not to depend on
   it. Candidate: filter `houseBotId == null` in `heldSides`, on the sheet and on the page, together.
3. **WP2's `pendingDeposit.createdAt` is `string | null`** (WP2 report, A10). WP3's facts always carry a string. They
   assign cleanly, so there is no conflict at merge.
4. **The plan says `test:dal-parity` "holds the twins equal".** It holds their shape (A11 says so); the behaviour proof
   is `db:probe-sheet-facts` plus `test:journey-sheet` §6.
5. **The probe's tie-break on `id`** uses Postgres collation. JS `>` compares by code point. They agree for the
   lower-case ASCII ids the platform mints; ids with mixed case could order differently on an exact-millisecond tie.
   Noted, not changed.

## Left undone, and why

- `test:all`: not run (see above).
- `db:probe-sheet-facts` was run directly through `pg-probe-run.mts` against the VM's PostgreSQL 16 on 127.0.0.1:55432,
  not through `db-scratch` (which boots embedded 18.3). The package key is in the `db:probe-*` pattern for WP12's
  battery.
- No VODACOM-PLAN or S8-PLAN edit (the coordinator writes §0k). §0k should record two things:
  - the RG report counts a sheet's enforcement (`at: "sheet"`, A4 item 6);
  - `db:probe-sheet-facts`' first run: 11/11, PostgreSQL 16.15, at `e197d6fb`.

## Review round (2026-10-13) — `51cd122c`

The coordinator's full `test:all` on the integration tip found a red that WP3 causes:
- `test:house-bot-holder-lifecycle`, "14 passed, 2 failed";
- 2.1: the probe did not carry the L2-sweep declaration;
- 2.2: 38 found, ceiling 36.

My run missed it because I did not run `test:all`.

**Fix** (`51cd122c`, one commit on `545930db`, no rebase). Both new members were read before they were admitted:
- `scripts/journey-sheet.test.mts`: its §6 writes `db.responsible.upsert` rows and one `db.user.update` status, in the
  memory store, only to fixture accounts it creates. Declared by the `.test.mts` rule.
- `scripts/live/sheet-facts-pg-probe.mts`: four accounts it creates, on a loopback scratch Postgres, no house bot. It now
  carries `// house-bot: covered by L2 sweep`, with its reason.
- `SCRIPT_CEILING` 36 → 38, with both members named in writing beside it, as the file asks.

**Re-run on `51cd122c`.**
- `test:house-bot-holder-lifecycle`: exit 0, `ALL PASS — house-bot-holder-lifecycle: 16 passed, 0 failed`. §4's planted
  fixtures still fail as designed (4.1 an unhooked writer found, 4.3 an undeclared raw-SQL script caught).
- typecheck, test:journey-sheet, test:deposit-ceiling, test:rg-doors, test:dal-parity, test:failure-reasons,
  test:client-graph-safe, test:cert-d3, test:guards-exist, test:docs, test:red-anchors, test:money-invariants and
  test:withdrawal: all exit 0.
- red:journey-sheet `RED CONTROL — 37/37 caught`; red:deposit-ceiling `RED CONTROL — 12/12 caught`.
- test:orphans: exit 1, the same two pre-existing base orphans.
