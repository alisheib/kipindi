# Poll lane — the open findings, written down

**Created 2026-08-11 (session 42). Status: LIVING — tick a row when it ships.**

## Why this file exists

Session 41 certified the poll product line (`productLine: "MARKET"`) end to end and shipped 15
commits. It closed with **14 confirmed findings outstanding, all `medium`, zero critical, zero
high** — and it recorded them like this:

> *"The full verdict set with evidence and proposed fixes is in the session transcript"*

⛔ **A transcript is not a record.** Session 42 opened on a different machine; there is no
`~/.claude/projects/*kipindi*` on it, so **eight of the fourteen findings no longer exist
anywhere** — not their name, not their evidence, not their proposed fix. Only the six the
handoff happened to name in prose survived, and they survived by luck.

⭐ **The rule this file is the fix for: a finding you do not intend to fix today must be written
to a tracked file in the SAME commit that discovers it.** Not to a handoff paragraph, not to a
tracker's prose, and never to a transcript. The handoff is a pointer with a short half-life; a
row in a table is the record. This is the same lesson as [`design-system/README.md`](design-system/README.md)
having one home and `campaign-handoff.mjs` having one locator — *one definition, in a place
something else can read.*

**Guarded by `npm run test:docs`** (link/path resolution) like every file in here.

---

## The six that survived — all re-confirmed against real code on 2026-08-11

Each row was re-derived from the source on session 42, not copied from the handoff's summary.
The line references are what a fix should start from.

| # | slug | sev | confirmed | where |
|---|---|---|---|---|
| F1 | `sell-offered-on-bonus-funded-position` | medium | 🟢 **SHIPPED 2026-08-11** | guard: `test:cashout-lock` §7 |
| F2 | `one-sided-loser-share-phantom-fee` | medium | ⚠️ **narrowed, line NOT pinned** | [`payout.ts:344-362`](../src/lib/payout.ts#L344-L362) |
| F3 | `per-market-rate-overrides-are-inert` | medium | ✅ re-confirmed | [`config-form.tsx:337-365`](../src/app/admin/config/config-form.tsx#L337-L365) |
| F4 | `wizard-resolution-time-parsed-in-browser-timezone` | medium | 🟢 **SHIPPED 2026-08-11** | guard: `test:zoned-time` |
| F5 | `regex-advertised-never-executed` | medium | 🟢 **SHIPPED 2026-08-11** | guard: `test:search-adoption` §5 |
| F6 | `resolution-criterion-english-only` | medium | ✅ by inspection | `prisma/schema.prisma` — `resolutionCriterion` is one column |

### F1 · `sell-offered-on-bonus-funded-position` — 🟢 SHIPPED 2026-08-11

A **priced Sell button** is rendered on positions the server refuses outright.

`cashOutPosition` refuses any position with `bonusStakeTzs > 0` — correctly, because cash-out
pays into the REAL wallet and would convert non-withdrawable bonus into withdrawable cash
([`market-service.ts`](../src/lib/server/market-service.ts), the `INVALID` branch: *"Bonus-funded
bets can't be cashed out"*).

But `cashOutValue` — which computes `sellable` and the price the button shows — takes
`Pick<StoredPosition, "side" | "stake" | "placedAt">`. **`bonusStakeTzs` is not in the Pick**, so
the quote function cannot see the one fact that decides the answer. Any bonus-funded position
inside its exit window gets `sellable: true` and a real, formatted sell price.

⭐ The shape: *the refusal and the offer were written against different inputs.* The docstring at
`:1790` already states the contract — *"`sellable` — false means … the UI must show 'rides to
settlement', not a sell price"* — so the code disagrees with its own stated rule.

**SHIPPED.** `bonusStakeTzs` added to the Pick and to `sellable`, with `reason: "BONUS_FUNDED"`
ordered first (a bonus bet with no runway would otherwise be explained as "closing too soon" —
true, but not why). Both page call sites now pass the field; the UI already rendered "rides to
settlement" for `sellable: false`, so no component changed.

**Guarded by [`test:cashout-lock` §7](../scripts/cashout-lockout.test.mts), which asserts the
AGREEMENT rather than the symptom:** for one position, the quote and the server must reach the
same verdict. `sellable === false` on its own would pass for a position whose window merely
happens to be shut.

⭐ **The section carries a CONTROL, and the control is what makes it evidence.** An ordinary
position on the same market, in the same window, is asserted sellable at a real price (7,200)
*before* the bonus case runs — so a failure can never be the window. RED-proven by reverting the
one-clause fix: controls PASS, the three bonus assertions FAIL, exit 1, file restored
byte-identical (`cmp`).

⚠️ **`no money moved` PASSED even in the RED run**, and that is the defect's exact shape: the
server always refused, so nothing was ever stolen — only the *offer* lied. A guard that watched
the wallet would have stayed green through the whole bug.

⛔ **`bonusStakeTzs` is optional on `StoredPosition`, so omitting it at a call site still
COMPILES.** `tsc` gave no protection here and cannot; that is why this is a runtime guard.

### F7 · `portfolio-live-value-discounts-an-uncharged-fee` — ⚪ NEW, found 2026-08-11, NOT fixed

Found while fixing F1, and written down here rather than carried in a head — which is the whole
point of this file.

`/positions` sums `openLiveValue` from `cashOutValue(...).value`. That value is
`gross × (1 − cashOutFeeRate)` outside the grace window — it prices the position as if it were
being **sold**. For a bonus-funded position that sale can never happen, so the portfolio total
subtracts a fee the player will never be charged and **understates their holding**.

⚠️ Small, and it moves a *displayed* figure rather than money — but it is a money figure shown to
a player, so it is not cosmetic. **Not fixed today**: the right answer is a judgement about what
"live value" should mean for a position that can only ride to settlement (stake? projected
payout? the sale price it cannot get?), and that is a product decision, not a bug fix. Flagged in
the code at the call site.

### F2 · `one-sided-loser-share-phantom-fee` — ⚠️ NOT YET PINNED

Session 41 described this as *"a fee printed to the player and booked in the accountant's readout
that was never charged — narrowed on verification to one-sided loser-share polls only."*

**What session 42 confirmed:** [`poolFee`](../src/lib/payout.ts#L336) returns, for
`feeModel: "loser-share"`, a `commission: loserRate * pool` field explicitly commented
*"notional whole-pool figure — informational only"*, while the real `fee` is
`loserRate × losingPool`. On a one-sided win `losingPool` is 0, so **`fee` is 0 while `commission`
is 13% of the whole pool**. The two numbers disagree by design, and one of them is a fiction.

**What session 42 could NOT confirm — and this is recorded as an open question, not a defect:**
the three consumers of `.commission` all appear to be correctly gated.

- [`admin/markets/[id]/page.tsx:263`](../src/app/admin/markets/[id]/page.tsx#L263) sits in the
  `else` of an `isLoserShare` branch — it cannot render on a loser-share poll.
- [`resolution-panel.tsx:235`](../src/components/markets/resolution-panel.tsx#L235) is gated on
  `fee.capped`, which `poolFee` hardcodes to `false` for loser-share — it cannot fire either.
- `admin/config/fee-simulator.tsx:141` is a labelled what-if simulator, not a booked figure.

⛔ **So either the finding names a surface not yet located, or it was about the pre-bet estimate
(`displayEstimateRate` / `showPreBetEstimate`, [`payout.ts:215-217`](../src/lib/payout.ts#L215-L217))
rather than `commission` — a one-sided win refunds at exactly 1.000×, so a fixed
`stake × (1 + rate)` estimate promises a profit that cannot occur.** ⭐ **Do not "fix" this until
the surface is located and photographed showing the wrong number.** Writing a fix against a
finding you cannot reproduce is how a remedy inherits the trap it was written beside
([[remedy-inherits-the-trap]]); and a probe that condemns a correctly-gated branch is the
instrument, not the product ([[an-instrument-reports-its-own-staleness]]).

### F3 · `per-market-rate-overrides-are-inert`

**Four of the six fields on the per-market override form can never affect anything.**

`/admin/config` → `MarketOverrideForm` asks for a **market id**, hinted *"Get this from the
markets table — starts with `mkt_`"* — i.e. a poll that already exists. It writes
`store.perMarket.set(marketId, …)`.

The only place rates are consumed is `createMarket`, which freezes them:

```ts
const id = `mkt_${randomId(10)}`;              // market-service.ts:377
const feeSnapshot = snapshotFromConfig({
  ...(await getEffectiveConfig(id)),           // market-service.ts:432 — a BRAND NEW random id
  ...(input.rateOverrides ?? {}),
});
```

`getEffectiveConfig` is asked for the rates of an id **minted one microsecond earlier**. An
override stored under an existing poll's id can never match it. Settlement, cash-out and every
preview then read the frozen `feeSnapshot`, never per-market config — by design, and correctly.

⭐ **The form's own comment asserts the thing that is false:**

> *"An override only affects polls created AFTER it is set — a poll freezes its rates at
> creation, so setting an override on a poll that already exists changes nothing about it.
> **That is the point.**"*

A poll created after has a **different id**, so it is not "the point" — it is a dead end. The
comment reads as a designed limitation and is actually a description of unreachable code.

⚠️ **Two of the six fields DO work** and must not be broken by the fix: `minStake` / `maxStake`
are read live via `getEffectiveConfig(m.id)` at
[`markets/[id]/page.tsx:146`](../src/app/markets/[id]/page.tsx#L146) and enforced server-side in
`buyPosition`. So this is *"4 of 6 controls are inert"*, not *"the form is broken"* — and a fix
that removes the form removes two working controls. ⛔ Before quoting this finding, ask which
population it is a count of.

**Fix, two honest options:** ① remove the four rate inputs and say in the UI that rates are
global-at-creation; or ② key rate overrides on something a *future* poll can carry (category, or
a named profile) rather than on an id that cannot exist yet. ①  is smaller and truthful; ② is the
feature the form's comment thinks it already has. **Ali's call.**

### F4 · `wizard-resolution-time-parsed-in-browser-timezone`

```ts
fd.set("resolutionAt", new Date(resolutionAt).toISOString());   // wizard.tsx:46
```

`resolutionAt` comes from `<Input type="datetime-local">`, which yields a **bare wall-clock
string** with no zone (`2026-08-15T14:30`). `new Date()` parses that in the **browser's** local
timezone. An officer whose laptop is not on EAT creates a poll that resolves at a different
absolute instant from the one they typed and confirmed on the review step.

🔴 **This is a money defect, not a cosmetic one, and session 41 proved the mechanism itself.**
Its own settlement record: BTC read **63,993** at the console but the criterion named 01:30, and
the 1-minute bar at the deadline read **64014.51** — it crossed one minute *after*. Resolving on
the wrong instant pays the wrong side. A timezone slip is that same error multiplied by hours.
⚠️ And every cloud/CI session runs on **UTC**, so a poll created from one is silently 3 hours off
EAT.

**SHIPPED**, and the fix is architectural rather than a patched line.

⛔ **THE CONVERSION MOVED TO THE SERVER.** The wizard now sends the wall clock **raw**;
[`createMarketAction`](../src/app/markets/actions.ts) resolves it with `toUtcIso(raw,
getPlatformTimezone())`. The platform timezone is **admin-configurable** and lives server-side,
so that is the only place the answer is authoritative — and it means the officer's laptop can no
longer decide when a poll settles.

⭐ **`selectionClosedAt` got the same treatment in the same commit.** It decides when *betting*
shuts, so a three-hour slip there is the same defect wearing a different name. Fixing only the
one the finding named would have left the other live.

**New module [`src/lib/zoned-time.ts`](../src/lib/zoned-time.ts)** — the inverse of `utils.ts`,
which had nine helpers turning an instant into a string in the platform zone and **not one**
going the other way. That absence is why the wizard reached for `new Date()`.

⛔ **The zone is a PARAMETER, never a constant, and the guard asserts that.** This repo already
had two disagreeing conventions: `eat-day.ts` pins a fixed `EAT_OFFSET_MS` (+3h, correct — no
DST since 1931), while `utils.ts` reads the configurable `getPlatformTimezone()`. An officer
reads the whole console through the second, so the wizard must too. Hardcoding +3 here would
have made a **third** convention. `test:zoned-time` §6 fails if `zoned-time.ts` ever contains an
offset literal or a zone name.

**The review step now echoes the instant that will be stored**, named with its zone —
`15 Aug 2026, 14:30 EAT · stored as 2026-08-15T11:30:00.000Z`. It used to print the raw
`datetime-local` string, which is the one value in the flow that **cannot be checked**, because
it does not say which clock it was read off.

**RED-proven in both halves, separately:** reverting the wizard fails §6's two client checks;
reverting the action fails §6's server check. Both files restored byte-identical (`cmp`).

⚠️ **One assertion SKIPPED rather than passed, and that is deliberate.** §4 compares the old
browser-parse against the correct answer — on a host already on EAT the two agree *by luck*, so
the guard detects that and prints `SKIP` instead of a green tick it did not earn. This laptop is
on EAT, so it skipped here. ⛔ A check that passes because the environment happens to match is
the [[checks-that-lie]] shape; saying so is the fix.

⭐ **Coverage bought cheaply: the DST branch is exercised via `America/New_York`** (−4h July,
−5h January). EAT has no DST, so without a second zone the two-pass correction would be
untested code that only ever runs if an admin switches the platform timezone — i.e. it would
first execute in production.

### F5 · `regex-advertised-never-executed` — 🟢 SHIPPED 2026-08-11

Three admin surfaces pass `allowRegex` to `SearchBox`
([`poll-filters.tsx:73`](../src/app/admin/ai-polls/poll-filters.tsx#L73),
[`candidate-filters.tsx:70`](../src/app/admin/candidates/candidate-filters.tsx#L70),
[`admin-proposals-client.tsx:386`](../src/app/admin/proposals/admin-proposals-client.tsx#L386)),
which makes `SearchHelp` render the regex row — the **advertisement**.

`SearchBox` then uses that flag for exactly one thing: its own echo line.

```ts
const parsed = parseQuery(q, { allowRegex, fields: helpFields });   // search-box.tsx:125
```

**Every call site that actually filters omits it** — `ai-poll-generation.ts:640`,
`market-candidate.ts:255`, `admin-proposals-client.tsx:220`, and also `admin/markets`,
`admin/players`, `admin/resolver-queue`, `/markets`, `/results`, `/live`. Without the flag,
`parseQuery` falls through: *"Without `allowRegex`, `/foo/` is literally three-plus characters"*
([`query.ts:145`](../src/lib/search/query.ts#L145)).

⭐ **The compounding part is the echo.** An operator types `/^mkt_8/`, the help chip says regex is
supported, and the echo under the box reads **"pattern"** — because the echo *did* parse it as
one. The filter then matches the literal characters `/^mkt_8/` against the fields, finds nothing,
and **reports zero rows as the answer**. Three independent signals tell the operator the pattern
ran. It never did.

**Fix:** pass `allowRegex: true` at the three filtering call sites that correspond to the three
advertising surfaces. ✅ Both executors already handle it correctly and need no change —
[`predicate.ts:52-66`](../src/lib/search/predicate.ts#L52-L66) fails **closed** on `invalid`
(*"a broken pattern must show nothing, never everything"*) and compiles `regex` against a
4,000-char-capped haystack.

⛔ **The guard must assert the ADVERTISEMENT and the EXECUTION agree**, not that a literal
`allowRegex: true` appears — the whole defect is that the string was present in one place and
absent in the other. Assert the set of components passing `allowRegex` to `SearchBox` equals the
set of surfaces whose `parseQuery` carries it.

**SHIPPED.** `allowRegex: true` at all three executing call sites; guarded by
[`test:search-adoption` §5](../scripts/search-adoption.test.mts), which joins advertisement to
execution through the `XXX_SEARCH` schema both of them already name — so there is no
hand-maintained map to fall out of date. **RED-proven on the unmodified product**: the guard
named all three real call sites and exited 1 before the fix.

⭐ **A SECOND DEFECT WAS FIXED ON THE WAY, AND IT WOULD HAVE MADE THE FIRST FIX A LIE.** Both
server call sites did `filter?.search?.trim().toLowerCase()` **before** parsing. `parseQuery`
lowercases term values itself, so that was redundant for terms — but for a regex it is
destructive: `/[A-Z]+/` arrives as `/[a-z]+/`, a **different pattern that still compiles and
still returns rows**. Shipping regex support on top of it would have meant every case-sensitive
pattern silently answering a question the operator did not ask. The pre-lowercasing is gone;
`matchesQuery` already matches regex against original-case text.

⚠️ **AND THE GUARD'S OWN RECONCILIATION WAS WRONG FIRST — it passed over a planted drift.** The
`<SearchBox …/>` matcher used a lazy `[\s\S]*?`, so rewriting one element as `></SearchBox>` let
it run **past** the closing tag to the next `/>` in the file and stitch two elements into one
phantom advertisement that still carried both `allowRegex` and a `fieldNames(…)`. The
reconciliation shared that matcher and agreed with it. Fixed to `[^<]`, which cannot leave the
element it started in, and re-proven: the same plant now drops `CANDIDATE_SEARCH` from the
advertised set and exits 1. ⛔ **A reconciliation built on the same locator as the thing it
reconciles only catches the matcher matching too LITTLE, never too much** — see
[[guards-that-agree-and-are-both-wrong]].

### F6 · `resolution-criterion-english-only`

`resolutionCriterion` — **the sentence the payout turns on** — is a single column, written in
English by the wizard and rendered raw to every locale. A Swahili or Chinese player reads the
rule that decides their money in a language they may not have.

⚠️ Session 41 deliberately did not take this one: **it needs a schema change**, so it is a
migration against the live money DB, not an edit. That makes it a different risk class from
F1–F5 and it should be scheduled deliberately rather than swept in.

**Fix:** `resolutionCriterionSw` / `resolutionCriterionZh`, nullable and additive; wizard collects
all three (the AI generation path already produces trilingual titles and can produce these);
render falls back to EN when a translation is absent, and says so rather than pretending.

---

## The eight that were lost

⛔ **Names, evidence and proposed fixes: gone.** They existed only in session 41's transcript,
which does not exist on this machine. They are recorded here as a **known gap**, not as
"nothing outstanding" — the honest count of the poll lane's open findings is **6 known + 8
unknown**, not 6.

They can only be recovered by **re-running the audit** over the same surfaces, which is a session
of work. ⚠️ Do not quietly renumber to 6 and call the lane clean; a count that drops from 14 to 6
because the record was lost is not progress, and the next session must be able to tell those two
situations apart.

---

## Operator items — not defects, but they are open

| # | item | owner | state |
|---|---|---|---|
| OP1 | Two LIVE polls carry no Chinese title | — | ⚪ **NOT A DEFECT — closed 2026-08-11.** See below |
| OP2 | `mkt_fdf70a0704dc1789f404` (TCRA Q2) CLOSED awaiting an officer's verdict since **2026-08-09 21:00** | officers | ~46h as of 2026-08-11. Needs a human verdict, not code |
| OP3 | Owner console password rotation | **Ali** | 🔴 `Admin@1234` was in this repo in plaintext from 2026-08-04 to 2026-08-11 on a pushed branch. Redacted in `3bc5d60b`; **redaction does not un-publish**. Rotation is the only remedy, plus 2FA re-enrol |

### OP1 · "two LIVE polls have no Chinese title" — ⚪ NOT A DEFECT, closed 2026-08-11

Session 41 recorded this as a dev task: *"the AI path sets `titleZh`, the proposal path does not,
and `backfill:zh` exists because this has been patched by backfill before rather than at source."*

**Checked, and the premise is wrong in both halves.**

① **The proposal path does set it.** [`proposals-service.ts:559`](../src/lib/server/proposals-service.ts#L559)
passes `titleZh: p.titleZh ?? null`, the service stores it
([`:193`](../src/lib/server/proposals-service.ts#L193)), and the player's submission form has a
Chinese field ([`create-form.tsx:101`](../src/app/proposals/new/create-form.tsx#L101)). The whole
chain is wired. The field is simply **optional**, and these two proposers left it blank.

② **And a blank one renders correctly.** [`pickLocalized`](../src/lib/localized.ts) treats
`null` / `""` / whitespace as absent and falls back to English — *"English is the CANONICAL
language … the UI always renders exactly ONE language and never a blank."* A Chinese player sees
the English title, which is the documented design, not a hole.

⭐ **This is the [[write-only-fields]] lesson running in reverse: I checked the READ path and it
was already right.** The finding described a write-side asymmetry and inferred a player-visible
consequence that does not exist. ⛔ Before filing "field X is missing", render it.

⚠️ **AND THE ASYMMETRY IS REAL BUT POINTS THE OTHER WAY — filed as F8 below.** It is
`titleSw`, not `titleZh`, that is handled wrongly.

### F8 · `proposal-publish-bakes-english-into-the-swahili-column` — ⚪ NEW, found 2026-08-11, NOT fixed

The line above `titleZh` reads:

```ts
titleSw: p.titleSw ?? p.titleEn,     // proposals-service.ts:558
titleZh: p.titleZh ?? null,          // :559
```

Since `pickLocalized` already falls back to English at render time, the `?? p.titleEn` is not
needed for display — and it does real harm: it **writes the English string into the Swahili
column**, making "this poll has no Swahili translation" permanently indistinguishable from "its
Swahili translation is the same as its English". Any audit, any `backfill:sw`, any *"which live
polls still need translating?"* query is blinded for every proposal-published poll.

⭐ **`titleZh: … ?? null` is the CORRECT one of the pair.** The fix is to make `titleSw` match it,
not the reverse.

**Not fixed today** because it changes what gets STORED for future polls, and a data-semantics
change on a money-adjacent entity should be Ali's call rather than a quiet edit. ⚠️ Check whether
anything reads `titleSw` raw (outside `pickLocalized`) before flipping it.

### F9 · `proposal-resolution-date-pinned-to-23:59-UTC` — 🟢 SHIPPED 2026-08-11 (E-145)

Same family as F4, found while reading the publish path:

```ts
const resolutionAt = new Date(`${p.resolutionDate}T23:59:59.000Z`).toISOString();   // :550
```

A proposer picks a **calendar date**. It is pinned to 23:59:59 **UTC**, which is **02:59:59 EAT
the following morning** — so a poll a player proposed "for the 15th" actually resolves three
hours into the 16th, and betting stays open through those hours. `selectionCloseDate` gets the
same treatment on the next line.

**SHIPPED, with the policy stated explicitly rather than inferred:** *"the proposed day ends when
that day ends on the clock the platform runs on."* On EAT the 15th now ends at **20:59:59Z**, not
23:59:59Z.

⭐ **It was written FIVE times, and that is the finding underneath the finding.** Two validation
gates, one edit gate, and the two that move money (`resolutionAt`, `selectionClosedAt`) each
inlined `Date.parse(\`${date}T23:59:59.000Z\`)`. All five now route through **one**
`endOfProposalDayIso`, which takes its zone from `getPlatformTimezone()` — so it cannot drift
from the zone every other timestamp is displayed in.

⚠️ **A sixth site was found on the CLIENT and fixed in the same commit.** `create-form.tsx`
enabled Submit using `T23:59:59Z` — **three hours later** than the server's cutoff — so for a
three-hour window every night the form lit up Submit on a date the server then refused as
*"must be in the future"*. The platform zone is now passed to the form so both apply one policy.

**RED-proven:** restoring the literal on the `resolutionAt` line fails both the structural check
and the by-name money check, exit 1; file restored byte-identical. ⭐ **The structural half is
the one that holds** — the arithmetic is three assertions, but the real risk is the *sixth copy*,
and this concept reached five copies precisely because inlining it is easier than finding the
helper. `test:proposal-day` §3 now fails the file if the literal returns.

⚪ **Deliberately NOT open:** the E-138 pool-inflation shape on 5 LIVE polls. Ali ruled *"the data
gets reset before launch"* — see [[50pick-data-resets-before-launch]]. It is a pre-launch reset
checklist item, not a finding. ⛔ Do not re-raise it.
