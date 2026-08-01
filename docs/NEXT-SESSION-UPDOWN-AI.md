# Up & Down + AI polls — where we are now (2026-07-30)

> **This file is the state of play, not a plan.** It replaces the incoming plan of the same
> name, which is now history: everything it asked for is built, and the session found and fixed
> a live money crisis on the way. It owns *where the AI work stands and what is next*, and
> nothing else — the architecture, the product rules and the margin model live in
> [`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md), [`UPDOWN-SPEC.md`](UPDOWN-SPEC.md) and
> [`UPDOWN-PRICING.md`](UPDOWN-PRICING.md).

**Branch:** `feat/updown-source-pinning-and-proposals` — **pushed to `origin`**, so any machine
can `git fetch && git checkout feat/updown-source-pinning-and-proposals`. **`main` is untouched**
(every push to it is a live deploy); merging is Ali's call.

**Already merged UP TO DATE with `main`** (0 behind, 22 ahead) — `main` gained 10 commits from a
concurrent session while this work was in flight (backups toolchain, ops visibility, payout docs,
withdrawal cleanup). Merged here rather than left for later; git auto-merged the two overlapping
files (`package.json`, `src/lib/server/lifecycle.ts`) with no conflicts and both sides survived.

> ⚠️ **That merge created one coupling neither side could see alone.** Their change made a slow
> lifecycle pass *visible* (skip counter + a `lifecycle.ticker_overrun` compliance alert after 5
> swallowed ticks). Mine put `resolveOverdueRounds()` **inside** that pass — and it is the slowest
> chore there, costing `maxObservations` (8) network price reads. With the **feed** reader (~1s
> each) that fits the 60s tick; with the **AI** reader (tens of seconds each) it can exceed it and
> fire their alert. Not a bug in either change. If you meet that alert: lower `maxObservations`,
> don't widen the tick — a slow heal is acceptable, a stalled payment reconcile is not. Documented
> at the call site.

> ⚠️ The two new migrations **have already been applied to the live database** (Ali's explicit
> decision — it is their pre-launch DB and they start fresh at go-live). Both are purely
> additive — two nullable columns and one new table — so `main`'s code keeps working unchanged
> against it, and re-running them after a merge is a no-op (idempotent guards).

**The original goal, in Ali's words:** the AI proposes the Up & Down round *with the link it
used*, so when it resolves it goes back to that same source — *"if Claude knows where he got the
info from, he knows where to get it again and resolve."* Both AI systems on one pattern, every
control in the right place. That is done.

---

## 🔴 READ THIS FIRST — Up & Down had never once worked in production

The session opened by verifying the claim "a round captures its source at generation and
resolves against that link". It did not. What the audit found was worse, and it was live:

| | |
|---|---|
| Rounds opened on production | **1,398** |
| Rounds ever resolved | **0** |
| Real money stranded | **96,250 TZS** across 35 positions on 13 rounds |
| Code path able to return it | **none existed** |

**Three defects, stacked:**

1. **The pages cannot be read.** Every approved source renders its price in client-side
   JavaScript, which neither `web_search` nor `web_fetch` executes. Not one observation ever
   reached CONFIRMED.
2. **The retry ladder was never walked.** `advanceChain` observes only `chain.nextBoundaryAt`
   and then moves the boundary forward, so nothing ever revisited a boundary that refused.
   Every observation sat PENDING at **1 attempt**; `maxObservationAttempts` was unreachable;
   `FAILED` never occurred; `retryBackoffSeconds` was read by **nothing**; and the promise
   repeated on **five** surfaces — *"a boundary that never confirms voids its rounds and refunds
   every stake in full"* — was unimplemented.
3. **No escape hatch.** `voidRoundByOperator` had **zero callers**, and UPDOWN rounds are
   filtered out of `/admin/markets`. There was no button, anywhere, to return the money.

**Resolution — done, and verified against production:**

```
holding real money        0
TZS staked, unsettled     0
positions, unsettled      0
settled                   1,394
```

Both live chains paused through `setChainState`, the sweep + operator void + bulk ops tool
built, 1,271 rounds voided with **59,250 TZS** refunded in that batch, 0 failures. Every stake
is back in a player's wallet.

> ⚠️ **The lesson worth carrying:** five surfaces described a refund guarantee, a suite was
> green, and the guarantee existed in no code path. *A green gate is evidence, not proof.* Two
> of the three defects were code that **never ran**, which no passing test can reveal — only
> reading the production data did.

---

## What changed, in logic terms

### 1 · A round now resolves against the page it was sold on

**Before:** `UpDownRound` had no source column. `closeRound` read `asset.priceSourceUrl` *at
boundary time*, so an operator editing the asset silently re-bound every open round — while
four surfaces, including the player-facing `resolutionCriterion`, asserted the opposite.

**Now:** `openRound` copies the link and domain into `capturedSourceUrl` /
`capturedSourceDomain`, and every downstream write comes from those same two locals (market
`sourceUrl`, player criterion, round row, audit payload), so the round, the money row and the
sentence the player read cannot disagree. `closeRound` verifies each bounding reading against
**the round's pin** before the arithmetic; a genuine contradiction → `VOID` /
`source-mismatch` → full refund. Legacy (no capture, or a reading that cited nothing) **skips**
— a round we cannot check is not a round we may void on suspicion.

Both columns are **write-once** by being absent from `ROUND_PATCHABLE`. ⚠️ The in-memory store
had **no allowlist at all** — a fake more permissive than production, which is exactly how a
suite passes on a path production refuses. Fixed; both stores now throw.

**And the source cannot move underneath a live round:** `updateAsset` refuses a source change
while any round on the asset is unresolved, naming the count, the money at risk and the way out.

### 2 · The reading method is now honest about what it can do

`readPrice()` — one contract, two implementations, operator-switchable at `/admin/updown` →
*Price reading method*:

- **`feed`** (default) — a market-data API returning a quote **with its own timestamp**.
- **`ai`** — Claude + `web_fetch` pinned by `allowed_domains` to the asset's domain.

**Why the feed is the default is measured, not assumed.** Three probes through the real
`observePrice` prompt and gates, over 7 gold/index pages: no timestamp at all, or quotes 9–12
hours stale — one **7.3 days** old. With `maxStalenessSeconds: 90`, every 5- and 15-minute round
refuses forever. The AI reader is kept only for an asset no feed carries.

Both face the **same** gates. `MockPriceFeed` refuses in production; a missing
`TWELVEDATA_API_KEY` refuses **by name** rather than falling back to invented prices; and the
key never reaches a stored field.

### 3 · The refund promise is real

`resolveOverdueRounds()` on the lifecycle ticker re-attempts every overdue unresolved round,
groups by (asset, boundary) to preserve one-reading-per-boundary, and is **independent of chain
state** — pausing a chain must not strand money already staked. Plus an operator void at
`/admin/updown/rounds` (CONFIG/`accounting` tier, because a void moves money).

⛔ An **operator** mistake no longer spends a round's retry budget: `no-api-key` and `ai-paused`
do not call `recordAttempt`, or pausing AI for ~4 boundaries would FAIL live rounds and void
real bets. A genuine source failure still burns an attempt — that is the point of the ladder.

### 4 · The AI proposes the chain, an officer decides

`/admin/updown/proposals` — the officer queue, in the shape of `/admin/ai-polls`.

One proposal = an **already-registered** asset, one grid duration, a margin, a framing, and
**the exact page the AI verified it can read a timestamped price from**. `observedPrice` /
`observedQuotedAt` are **required and nullable**, and the prompt's loudest instruction is that
null is the correct answer when the page gives nothing — because that is the common case. A
proposal with no evidence **cannot be approved**. The mock provider reports null too, so a
developer meets the refusal path by default rather than a fabricated success.

⛔ Nothing arms without an officer. `armProposal` is the only writer of `armedChainId`, refuses
any state but `APPROVED`, and is unreachable from any generation path. **Every write in the arm
path goes through the existing service functions** — which is what makes the source lock apply
to arming, proven in the suite against a round holding real money.

### 5 · The polls half, sealed

- **Pause-switch bypass closed.** `isPollGenEnabled()` was checked only in
  `admin/ai-polls/actions.ts`, so `generateFromEventAction` generated polls with the operator's
  switch OFF. Now enforced inside `generateAIPoll`, before the budget gate. One switch, both
  generators, no second key.
- **Sentinel source gate.** The resolution AI's cited URL had **no** host check and no
  `isSourceTrusted` — and with `resolutionMode: "auto"` no officer is in the path at all. Now:
  AUTO fails closed into the two-officer ceremony; HUMAN gets a visible chip and never a
  suppression, because the officer is about to open that link themselves. Detail in
  [`AI-POLL-SOURCES.md`](AI-POLL-SOURCES.md).

---

## The gates

| Suite | Guards |
|---|---|
| `test:updown-heal` (60) | The refund promise is real · ops states don't burn attempts, a source failure does · capture / write-once / mismatch-void / legacy-skip · the source lock · conservation |
| `test:updown-feed` (25) | No simulated price settles real money · no silent fallback to the mock · the key never leaks · a quote with no timestamp is refused |
| `test:updown-source` (79) | **Structural**: no path recomputes a live round's line, moves its link, resolves against the asset row, or **arms a chain without an officer** |
| `test:updown-proposal` (80) | The officer gate · an approval dies on an edit · evidence doesn't follow a changed link · closed reject set · **the source lock holds through the arm path** |
| `test:scheduler` §7.10–7.17 | The sentinel's citation is a condition on the auto path |
| `test:ai-controls` §6 | `generateAIPoll` itself refuses while paused |

**Every guard above was mutation-checked** — deliberately broken and confirmed red. ⚠️ That
check found a defect **in the suite itself**: four assertions were
`hay.indexOf(a) < hay.indexOf(b)`, and deleting `a` makes `indexOf` return `-1`, which is less
than everything — so removing the APPROVED gate, and removing the AI pause switch, each left
their assertion **green**. A `before()` helper now requires both needles.

`npm run test:all` → **111/111**. `npx tsc --noEmit` clean. `npm run build` clean, with
`/admin/updown/proposals` compiling as a route (also the gate that catches a `const` export in a
`"use server"` file — `tsc` does not).

### Verified against the real database

`prisma migrate deploy` applied **both** new migrations cleanly on top of the existing 51. The
captured columns, the `UpDownProposal` table and the `UpDownProposalState` enum all exist, and
the backfill touched **exactly the 4 unsettled rounds and no settled ones** — the scoping the
migration header promises. The console then rendered live data end to end: the propose form
reads *"The AI may only read goldprice.org — the domain you approved for GOLD"*, straight from
the asset row, with the real 0.50% margin and 90s window.

### Visual audit — done, and it found two things

The whole Up & Down console **was never in the responsive sweep**: three routes, unaudited at
every width since the product line was built. Added to `ADMIN` in `responsive-audit.mjs`.
Now **120 passed, 0 failed** across all ten widths, no horizontal overflow.

⚠️ **The first run passed for the wrong reason** — 120 green assertions against the *admin
sign-in page*. The audit posts to `/api/dev-test/seed-admin` for a session, and that route 404s
outside development, because **`NODE_ENV` is inlined at build time**: passing
`NODE_ENV=development` to `next start` does nothing, the bundle still says production. It must
be `next dev`. Caught by opening the screenshot, not by reading the number.

⚠️ **And looking at 360px found a real defect the suite was right to pass:** three KPI `delta`
strings were clipped mid-word. `AdminKpi` renders delta `whitespace-nowrap` with no truncate, so
a long string is cut off *inside* the card — not a page overflow. Fixed in the strings, not in
the shared frozen component. **Keep any new `delta` under ~12 characters.**

> Note: this worktree now has its own real `node_modules` (~869 MB) instead of the junction to
> `F:\kipindi-main`. **Turbopack refuses a junction pointing outside the project root**, so a
> worktree cannot build against a shared install, and `--webpack` is not a fallback (this
> codebase's `node:crypto` imports break under it). Remove such a junction with cmd `rmdir` —
> the link only; `rm -rf` would delete the other checkout's install while it is in use.

### Where everything lives in the admin nav

Asked in-session, so recorded here — the two AI pipelines are in **different sidebar groups**
because they are different games, and that is easy to trip over:

| Sidebar group | Item | Route | For |
|---|---|---|---|
| **MARKETS** | **AI poll generation** | `/admin/ai-polls` | long-form **polls** |
| | AI candidates · Player proposals · Curation queue · Resolver queue | | polls pipeline |
| **UP & DOWN · JUU NA CHINI** | Overview | `/admin/updown` | assets · chains · **reading method** · thresholds |
| | **AI proposals** | `/admin/updown/proposals` | **propose → review → approve → arm a chain** |
| | Rounds | `/admin/updown/rounds` | round explorer + **operator void** |

The **AI on/off switch for BOTH** is the *AI toolkit* dropdown in the **top bar** — not in either
section. `/admin/updown` renders it read-only via `controlled-elsewhere.tsx`; one control, one
place. ⚠️ That toolkit chip reads **"off" when there is no `ANTHROPIC_API_KEY`**, which is a
different thing from the generation switch being off — do not read one as the other.

### ⚠️ Two suites are FLAKY under a full run — know this before chasing a ghost

A full `npm run test:all` came back **111/113**, failing `test:trilingual` and `test:responsive`.
Both pass on their own; neither is a regression. Do not spend an hour on them:

- **`test:trilingual`** — 36/36 alone. Its generation section uses `MockClaudeProvider`, whose
  `pickScenario()` is **weighted-random** (2% `error`, 1% `malformed`, …). A bad draw fails the
  suite. Flaky by construction, pre-existing.
- **`test:responsive`** — 120/0 alone on the Up & Down routes, twice; 3,788 passed in the full
  sweep with 2 failures, one being
  `/admin/updown/proposals@desktop — Execution context was destroyed, most likely because of a
  navigation`. That is a **dev-server recompile race**, not a page defect.

> 🎯 **The underlying tension, unresolved and worth fixing properly one day:** this sweep *needs*
> `next dev`, because its admin session comes from `/api/dev-test/seed-admin`, which 404s outside
> development — and `NODE_ENV` is inlined at build time, so `next start` cannot enable it. But
> `next dev` compiles pages on demand, so a 60-route sweep reloads pages mid-assertion. The
> honest fix is a build-time flag that exposes the seed route in a *production* build for test
> hosts, so the audit can run against `next start`. Until then: **re-run a failing route on its
> own before believing it.**

### Running the console locally

```
DATABASE_URL=<railway DATABASE_PUBLIC_URL> USE_PRISMA_DAL=true \
  NODE_ENV=development DISABLE_ADMIN_TOTP=true npx next dev -p 3100
curl -X POST http://localhost:3100/api/dev-test/seed-admin
BASE=http://localhost:3100 SURFACE=admin \
  ONLY=/admin/updown,/admin/updown/proposals,/admin/updown/rounds npm run test:responsive
```
`next dev`, not `next start` (see above). A different port if another session holds :3000.

---

## ▶ Where to pick up

1. **Ali's call: merge.** The branch is complete and gated but **unpushed** — every push to
   `main` is a live deploy. Nothing here is half-done; the order below is preference, not
   dependency.
2. **`TWELVEDATA_API_KEY` must be obtained and set** in the Railway service variables before
   Up & Down can trade again. Until then the selected provider refuses by name and rounds void
   and refund in full — safe, but not a product. **This is the only external blocker.**
3. **Then, in order:** unpause the two chains (`/admin/updown`) → confirm the first observation
   reaches CONFIRMED → confirm a round resolves → confirm `capturedSourceUrl` is populated on
   it → generate a proposal end-to-end and arm it.
4. **Re-run the audit once the migration has deployed:**
   `npx tsx scripts/audit-updown-source-drift.mts` (read-only; writes nothing, ever).
5. **Deferred deliberately:** the AI-layer modernisation (`claude-sonnet-5`,
   `web_search_20260209`, `output_config.effort`). Its own session — it touches the provider
   file the whole polls pipeline shares. One variable at a time; re-baseline token cost after
   the tokenizer change rather than reacting to the first number.

### Ops tools this session added (all dry-run by default)

| Script | Use |
|---|---|
| `scripts/audit-updown-source-drift.mts` | Fleet state, plus: does any unsettled round's reading cite a host the asset no longer points at? Read-only. |
| `scripts/ops-updown-pause-chains.mts` | Containment. Goes through `setChainState`; `--actor` and `--reason` required. |
| `scripts/ops-updown-void-stuck-rounds.mts` | Bulk-void an unreadable backlog with full refunds. |

---

## Standing rules (unchanged, and they earned their keep)

- **Money paths are gated.** Anything touching a price reader, resolution or the ledger needs
  the money suite green (`test:money-invariants`, `test:settlement-gate`, `test:concurrency`,
  the Up & Down suites) **plus a stated reason it is safe**.
- **Do not reopen design** — frozen behind `test:design-frozen`.
- **Every push to `main` is a LIVE deploy.** Work on a branch, run the gates, stop for Ali.
- **The same change updates code AND docs** — the doc that already owns the subject, no new
  tracker files.
- `npm run test:all` before claiming done, **and drive the real product, not just the suite.**

## Traps that cost time this session

- **A Railway deploy can FAIL after a clean build** — check `railway deployment list`. A 200 is
  not proof your commit is live.
- **`prisma generate` can EPERM** on the locked engine DLL when two sessions share
  `node_modules` through a junction. The types still regenerate; confirm with `tsc`.
- **This repo checks out CRLF.** A pattern anchored on `"\n"` matches nothing, and `indexOf`
  then returns `-1`, which `slice()` reads as an offset from the END. Use bounded
  `[\s\S]{0,N}` windows. This bit twice in one session.
- **`"use server"` files export async functions only** — a `const` export fails at
  `next build`, not at `tsc`.
- **A query with a wildcard `include` breaks against a database the migration hasn't reached.**
  The drift-audit tool died with P2022 on exactly the state it exists to diagnose. Name columns
  explicitly in any tool meant to run pre-migration.
- **Read the kit primitive, don't recall it.** In one session: `ScrollX` requires an accessible
  `label`; `Modal` takes `maxWidth`/`labelledBy`, not `title`/`size`; `Select` takes `options` +
  `onChange(value)`; the typed-confirm gate already existed as `ConfirmModal` `tier="hard"` +
  `typedWord`; and a native `<input type=checkbox>` is an error-level lint with a kit
  `<Checkbox>` sitting right there.
- **Batch your queries against production.** Two ops scripts timed out doing ~1,400 and ~2,800
  round-trips over the public proxy; both became 2–4 queries.
