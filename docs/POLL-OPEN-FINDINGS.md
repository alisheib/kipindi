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
| F3 | `per-market-rate-overrides-are-inert` | medium | 🟢 **SHIPPED 2026-08-11** | [`config-form.tsx:337-365`](../src/app/admin/config/config-form.tsx#L337-L365) |
| F4 | `wizard-resolution-time-parsed-in-browser-timezone` | medium | 🟢 **SHIPPED 2026-08-11** | guard: `test:zoned-time` |
| F5 | `regex-advertised-never-executed` | medium | 🟢 **SHIPPED 2026-08-11** | guard: `test:search-adoption` §5 |
| F6 | `resolution-criterion-english-only` | medium | 🟢 **SHIPPED 2026-08-11 — read + both writers** | guard: `test:criterion-i18n` (91) · F6a/F6b/F6c below |

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

#### 🟢 SHIPPED 2026-08-11 — Ali chose ①

The four rate inputs are gone, the misleading comment is replaced with what is actually true, and
the panel now says **"Stake bounds only. Fee rates are global and are frozen onto a poll when it
is created, so they cannot be overridden per market."**

⛔ **THE ACTION REFUSES A RATE KEY RATHER THAN IGNORING IT.** A stale tab or a hand-rolled POST
now gets told why, naming the fields. ⭐ **Silently dropping a value an officer typed is exactly
how the four dead inputs survived**: every signal — the input, the save, the success toast —
said the write had worked.

⚠️ **`minStake` / `maxStake` STAY, and the guard's §2 exists to keep them.** They are read live
via `getEffectiveConfig(m.id)` on the market page and enforced server-side in `buyPosition`, so a
fix that deleted the form would have deleted two working controls. **Before quoting this finding,
ask which population it counts: 4 of 6, never 6 of 6.**

**Guarded by [`test:override-scope`](../scripts/market-override-scope.test.mts), 20 assertions.**
§3 asserts the **AGREEMENT** — the set of fields the form offers must equal the set the action
consumes — which guards against an input with no writer and a writer with no input (the state
`cashOutFeeRate`/`thinProfitRatio` were once in, reachable from storage but not from the UI).
⛔ It counts `updates.x =` in **statement position**, so the four dead keys now appearing inside a
refusal *message* do not read as consumers.

⚠️ **BUT §3 IS NOT WHAT CAUGHT THIS DEFECT, AND THE ⭐ THIS PARAGRAPH ONCE CARRIED WAS MISPLACED.**
Before the fix all six fields were *both* offered and consumed, so the agreement held perfectly —
§3 **passed in the defect state** and contributed **zero** of the six red failures. The defect was
never "an input with no writer"; it was "a writer whose value nothing can ever read". §1's
absence checks and §4's refusal check are what went red. §3 protects a *different* future
regression, which is worth having and is not evidence about this one.

🔴 **AND §5's "buyPosition enforces both bounds" WAS A FILE-WIDE GREP** — `/minStake/` and
`/maxStake/` over all 3,200 lines of `market-service.ts`, non-vacuous only by luck because today
the sole occurrences happen to sit in the buy path. It now brace-matches the function body.
⚠️ Scoping it exposed a second error of the same kind: the enforcement is in **`buyPositionInner`**,
not the exported `buyPosition`, which is a thin admission/retry wrapper — so the first scoped
version reported "the bounds are not enforced" about code that enforces them one call deeper.
Both halves are asserted now, including that the wrapper still delegates.

⭐ **§4 RECORDS THE REASON, NOT THE SYMPTOM** — that `createMarket` mints `mkt_${randomId(10)}`
and then asks `getEffectiveConfig(id)` for *that* id. **If someone later re-keys overrides onto
something a future poll can carry (option ②), §4 is the assertion to revisit deliberately**,
instead of §1 being quietly deleted because it has become inconvenient.

**RED-proven on the unmodified form: 6 named failures, exit 1** — all four inputs present, the
consumed set reading `[commissionRate, feeCeilingRate, cashOutFeeRate, thinProfitRatio, minStake,
maxStake]`, and no refusal in the action. ⚠️ **§2 passed in both states, on purpose**: it is the
anti-collateral assertion, so it *should* be green before and after — a check that only goes red
with the defect cannot protect the thing the fix might break.

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

#### F6a · the READ path — 🟢 SHIPPED 2026-08-11

⭐ **SPLIT IN THREE ON PURPOSE, READ SIDE FIRST.** The finding's actual harm is what a player
sees, and that is fixable without a single new writer: the columns, the helper that returns the
fallback FACT, and a surface obliged to state it. Shipping the schema ahead of the writers also
puts the migration on production by itself, where a deploy problem has one candidate cause.

**Schema.** `PredictionMarket.resolutionCriterionSw` / `…Zh`, both `String?`. Migration
[`20260811120000_market_resolution_criterion_i18n`](../prisma/migrations/20260811120000_market_resolution_criterion_i18n/migration.sql)
— two nullable `ADD COLUMN`s, no default, so it is a catalogue-only change with no table rewrite
on the live money table. Applied to the local disposable cluster first and read back out of
`information_schema` (`is_nullable = YES` on both) before it was allowed near a deploy.

⛔ **NULLABLE, AND NOT BACKFILLED WITH THE ENGLISH.** `null` is the honest value for *"nobody has
translated this yet"*. Copying `resolutionCriterion` into them would make "untranslated" and
"the translation happens to equal the English" permanently indistinguishable — which is **F8**
(`proposal-publish-bakes-english-into-the-swahili-column`) reappearing on a brand-new column,
in the same file that files F8 as a defect.

**The helper: [`pickCriterion`](../src/lib/localized.ts), and it is deliberately NOT
`pickLocalized`.** That existing helper answers *"which string do I render?"* and **discards the
fact that it fell back** — correct for a title, where a Chinese player reading the English
question has lost nothing they can act on. ⭐ **The criterion is the sentence the payout turns
on: a player who cannot read it cannot check that the rule which took their stake is the rule
they agreed to.** So `pickCriterion` returns `{ text, shownIn, fellBack }` and the surface is
obliged to say it.

**The render** ([`markets/[id]/page.tsx`](../src/app/markets/[id]/page.tsx)) has exactly two
non-English states and is silent in neither:
- **no translation** → the English text, plus *"Imeonyeshwa kwa Kiingereza — hakuna tafsiri ya
  Kiswahili ya kigezo hiki"* / *"以英文显示 — 此规则暂无中文译文。"*
- **translation shown** → the translation, plus *"Tafsiri. Maandishi ya Kiingereza ndiyo
  yanayoamua matokeo"* and a `<details>` holding the English original.

⭐ **THE SECOND NOTE IS NOT DECORATION — IT IS THE RESOLUTION CONTRACT.** Officers resolve
against `resolutionCriterion` (`/admin/resolver/[id]`) and `market-sentinel.ts` reads the same
column, so English is what decides. Rendering a translation *without* saying that would replace
one untruth with a worse one: a player would be reading a rule that is not the rule. The English
is one tap away rather than a language switch away, because **the binding text must never be
something a player has to leave their language to read.**

⚠️ **The `<p>` also carries `lang={criterion.shownIn}`** — the language the text is *actually* in,
which on a fallback is not the page's language. Same fact, spent twice: once for a reader, once
for a screen reader that would otherwise pronounce English with Swahili phonetics.

**Guarded by [`test:criterion-i18n`](../scripts/criterion-i18n.test.mts) §1–§5, and §2 is the one
that matters.** It asserts the **AGREEMENT** over every locale × six data shapes: the returned
`text`, `fellBack` and `shownIn` must all equal what a correct implementation would return, and
⛔ **that expectation is computed from the ARGUMENTS, never from the result.** §2 also carries a
**CONTROL**: `pickCriterion` must pick the *same text* as `pickLocalized` in all 18 cells,
because the difference between the two helpers is the disclosure, not the string.

🔴 **AND §2 WAS VACUOUS AS FIRST SHIPPED — an adversarial audit proved it on 2026-08-11 by
planting a `pickCriterion` that never reads the `sw`/`zh` arguments at all.** The original derived
"the fact" from `r.text` itself, so a helper that always returned English was *internally
consistent* (English text + `fellBack` for every non-`en` locale) and the agreement passed with
**"0 disagreed"**. ⛔ **A check that derives its expectation from the answer can only catch a
helper that contradicts itself, never one that is uniformly wrong** — the
guard-agrees-with-itself shape, in the assertion this write-up called *"the one that matters"*.
Rewritten against an independent oracle and re-proven: the same plant now fails §2 with
**5 disagreed**.

⚠️ **THE ORIGINAL CLAIM HERE — *"an unread `…Sw` column fails it"* — WAS FALSE.** It is true only
of the rewritten version.

**RED-proven twice, both restored byte-identical (`cmp`):**
① against the **unmodified product** — **22 passed / 23 failed**, exit 1, naming the absent
columns, the absent dictionary keys and the raw `{m.resolutionCriterion}` render. ⚠️ **This was
first recorded as "20 passed"**, which is arithmetically impossible against a 45-assertion file;
22/23 is the reproduced figure;
② with `fellBack` forced to `false` — **6 assertions failed**, exit 1, while the §2 CONTROL stayed
**green**. ⚠️ **This was first recorded as "7 failed" and that was also wrong**: 7 was the count of
disagreeing locale×data **cells** inside one assertion's detail string, not the number of failing
assertions. ⛔ **Before quoting a count, ask which population it counts** — the rule this file
states in F3 and then broke about itself, twice, in the paragraph above.

🔴 **AND TWO OF MY OWN ASSERTIONS WERE WRONG BEFORE THE PRODUCT WAS.**
- The §3 locator anchored on the `{/* 5. Resolution criterion */}` comment — which the guard's
  own `decomment()` had already deleted. It located **0 characters** and then "failed" five
  assertions about a section it had never read. ⛔ **A guard whose own preprocessing destroys
  its anchor reports the INSTRUMENT, not the product** ([[an-instrument-reports-its-own-staleness]]).
  Re-anchored on the heading key, and it now **asserts that what it found is what it meant** —
  one `<section>`, under 2,500 chars, containing both the heading and the source link.
- §3 then required a literal `criterion.fellBack &&` and failed over a perfectly correct
  ternary. **That is testing which JSX idiom the author picked, not a fact about the product.**
  Replaced with the real invariant: the note must sit *inside* the branch the fact opens, appear
  exactly once, and be the other arm from the binding note.
- ⚠️ And §2's vacuity check read `agree >= 12`, so **the planted defect failed it too** — a
  "the sweep ran" check that goes red because the product is broken tells you nothing. It now
  asserts the sweep's SHAPE (every cell visited, both arms present) and is independent of the
  verdict.

✅ **AND IT WAS LOOKED AT, IN A BROWSER, BECAUSE A GREEN SUITE IS NOT A READABLE SCREEN.**
`npm run qa:criterion-visual` drives both arms × en/sw/zh × 360/1280 — **56 assertions, 0
failures** — reading the rendered text back out of the criterion panel and refusing to capture
on an `<html lang>` mismatch. ⭐ **The translated arm cannot exist on production until F6b/F6c
land**, so `npm run db:seed-criterion-local` (localhost-only, three refusal gates) creates it on
the disposable cluster — otherwise that half of the feature would ship having only ever been
unit-tested. All twelve shots were read by eye: the Swahili and Chinese bodies render without
clipping at 360, and the disclosure opens to the English original.

#### F6b · the WRITE path — 🟢 SHIPPED 2026-08-11

The wizard's step 3 collects **all three**, `createMarketAction` validates them and
`createMarket` stores them. `CreateMarketInput` gained two optional nullable fields.

⭐ **BOTH TRANSLATIONS ARE OPTIONAL AND A BAD ONE IS REFUSED RATHER THAN SILENTLY CORRECTED.**
Two shapes are worse than leaving it blank, and blank is already honest because F6a discloses it:
- **`TOO_SHORT`** — *"n/a"*, *"TODO"*, *"-"*. A stub renders **as the rule**.
- **`SAME_AS_ENGLISH`** — pasting the English in. This is **F8 exactly**, and storing it makes
  *"untranslated"* and *"translated identically"* indistinguishable forever. ⚠️ The comparison is
  whitespace- and case-insensitive, because *"pasted the English then title-cased it"* is still
  the English and a naive `!==` misses it entirely.

⛔ **ONE POLICY, BOTH SIDES.** [`criterionTranslationIssue`](../src/lib/localized.ts) is imported
by the wizard **and** by the action — not re-implemented in either. **E-145 was this same shape
from the other end**: the proposal form enabled Submit on a cutoff three hours later than the
server's, so for a window every night it lit up a value the server then refused. A client that
accepts what the server rejects is a defect even though the server wins.

⭐ **AND `normaliseCriterionTranslation` IS DEFENCE IN DEPTH, NOT A SECOND COPY.** The refusal is
the message to the officer; the normaliser is the guarantee about the data — a caller that skips
validation entirely still cannot write the English into a translation column.

⚠️ **Fixed on the way:** the wizard's criterion box was a **hand-rolled `<textarea>`**, and the
kit's `Textarea` atom docstring says in so many words that it *"replaces 3 hand-rolled textareas
that drifted on background, padding and font size"* — this was a **fourth** the cleanup missed,
on `text-[14px]` against the atom's `text-[16px]`. ⭐ The 16px is not cosmetic: **under 16px, iOS
Safari zooms the viewport on focus**, so an officer typing the legal text of a money contract had
the page jumping under them.

🔴 **AND THE WRITE PATH WAS NEVER EXECUTED UNTIL 2026-08-11, WHICH IS THE MOST IMPORTANT
CORRECTION IN THIS FILE.** §7 is titled *"the write path, end to end"* and is **100% `readFileSync`
+ regex**: it proves the characters are in the wizard, the action and the service. It never calls
one of them. `qa:criterion-wizard` filled the form and **never pressed Publish**;
`qa:criterion-visual` read markets that had been **seeded straight into the database**. Four
pieces of evidence, and not one of them joined officer input to player output.
⭐ **Now executed, and it is a different class of evidence:**
[`qa:criterion-publish`](../scripts/criterion-publish-e2e.mjs) — **18/0** — signs an officer in,
types three criteria into the real wizard, **presses Publish**, then opens the created market as a
player in `en`/`sw`/`zh` and asserts the criterion read back is the one that was typed. Nothing
seeded, nothing called directly. Plus [`test:criterion-chain`](../scripts/criterion-chain-e2e.test.mts)
— **19/0** — which drives `createMarket` against **real Postgres** and reads the row back with
**raw SQL**, bypassing the very DAL under test.

**Guarded by `test:criterion-i18n` §6 + §7 — 26 assertions across those two sections** (⚠️ this
said *"71 assertions total"*, which is the whole file including F6a's §1–§5 and inflates F6b's
guard by 2.7×). §6 is the storage rule,
including a **PROPERTY** over ten hostile inputs — *whatever is fed in, the English is never
stored as a translation* — which is the one assertion that survives someone rewriting the helper.
§7 joins the three surfaces: the wizard sends both fields, both files import the **same** rule
and neither re-implements it, the action refuses, and `createMarket` normalises. ⛔ It also
**names and forbids the one-character version of this defect**: `?? input.resolutionCriterion`
must never appear on these columns.

**RED-proven three ways, every file restored byte-identical (`cmp`):** ① callers stashed, helper
kept → **9 named §7 failures**, exit 1; ② `?? input.resolutionCriterion` planted on the Sw column
→ **2 failures**, which is the F8 shape being caught at the moment it is written; ③ the normaliser
made to skip its own rule → §6's property reports **4 of 10 hostile inputs leaked**.

✅ **LOOKED AT.** `npm run qa:criterion-wizard` signs in through the real form and drives the
step at **360 and 1280 — 24 assertions, 0 failures**: three fields present, the English pasted
into Swahili refused with Continue disabled, a stub refused as too short, a real translation
clearing both, and the review step reading *"— none · players see the English, with a note saying
so"* instead of a bare dash. Shots read by eye; the refusal is legible and unclipped at 360.

🔴 **AND GETTING THAT SCREENSHOT COST AN HOUR IN THE INSTRUMENT, NOT THE PRODUCT — three separate
false alarms, all worth writing down.**
1. **`/api/dev-test/seed-admin` 404s under `next start`** (gated on `NODE_ENV`), so the first
   attempt used `next dev`. The dev server's **HMR WebSocket never came up** on this machine (19
   × `ERR_INVALID_HTTP_RESPONSE`), so the page rendered from the server and **never hydrated** —
   a perfectly healthy wizard whose Continue button stayed `disabled` through 60s of retries.
   ⭐ The answer was to stop needing the dev server ([`seed-admin-local.mts`](../scripts/seed-admin-local.mts)),
   not to lower the bar to what it could show — dev also serves stale CSS.
2. **The local `next start` had no `AUDIT_CHAIN_SECRET`**, so the audit write inside the login
   transaction threw and the sign-in bounced to the signed-out home page — *"looks exactly like a
   wrong password, and is not one"*. Settled by verifying the credential against the app's own
   `verifyPassword` before touching the browser again: **`true`**, so the browser was the liar.
3. **A page-wide `[role="alert"]` also matches the always-mounted toast region**, so *"no alert
   on the page"* was false over a perfectly valid field. ⛔ Scope every selector to the thing
   under test — I quoted that rule in the same file and then broke it.

⚠️ **The 9-digit local part, `/auth/admin` for staff, and `networkidle` before filling are all
already written down in [`scripts/live/harness.mjs`](../scripts/live/harness.mjs) — I re-derived
two of them the hard way before reading it.** The driver now cites that file as the source.

#### F10 · `proposal-criterion-lands-in-the-canonical-english-column` — ⚪ NEW, found 2026-08-11, NOT fixed

Found while wiring F6a, and written down here rather than carried in a head.

**The player's proposal form asks for three TITLES by language and exactly one CRITERION, by
none.** [`create-form.tsx:100`](../src/app/proposals/new/create-form.tsx#L100) labels the title
`t.common.titleEn` — *"Title (EN)"* / *"Kichwa (EN)"* / *"标题（英文）"*, the language **named in
the label**, with optional SW and ZH fields beneath it. The criterion field twelve lines down is
labelled `t.common.resolutionCriterion` — *"Kigezo cha utatuzi"* to a Swahili proposer, with no
language asked for and none implied.

So a Swahili proposer reads a Swahili label and types **Swahili**. On publish,
[`proposals-service.ts:603`](../src/lib/server/proposals-service.ts#L603) does
`resolutionCriterion: p.resolutionCriterion` — straight into `PredictionMarket.resolutionCriterion`,
**the column this product treats as canonical English and that officers resolve against.**

⭐ **This is F6 wearing its mirror image.** F6 was *"the English rule reaches a Swahili reader
unlabelled"*; F10 is *"a Swahili rule reaches the English column unlabelled"* — and the second is
the worse of the two, because F6 was a display problem while this one puts the wrong language
into the field the **resolver** and `market-sentinel.ts` read to decide the payout.

🔴 **AND F6a MAKES IT WORSE IN A WAY THE FIRST WRITE-UP UNDERSTATED — corrected after an
adversarial pass.** It said only that `lang={criterion.shownIn}` would assert `lang="en"` over
Swahili text: *"a quiet, screen-reader-only untruth."* **The visible note is wrong too.**
`pickCriterion` decides `fellBack` purely from whether the `…Sw` COLUMN is populated — it never
inspects what language `resolutionCriterion` is actually in. So on a poll whose "English" column
holds Swahili, a Swahili reader is shown that Swahili text under the sentence
*"Imeonyeshwa kwa Kiingereza — hakuna tafsiri ya Kiswahili ya kigezo hiki"* — **"shown in English,
there is no Swahili translation", printed directly above Swahili.** F6a's whole purpose is to stop
the page claiming something false about the language on screen, and on this data it does exactly
that.

⛔ **The fix is the DATA, not the note** — `pickCriterion` cannot detect language and should not
try; a heuristic there would be a new source of false statements. ⚠️ **Not currently firing:
measured 0 non-English criteria across 102 live poll rows** (heuristic — see above). ⛔ Do not
"fix" it by dropping the `lang` or softening the note.

**Not fixed today, because the honest answers are product decisions rather than bug fixes:**
① demand English in the proposal form (name the language in the label, as the title field
already does) and let F6b/F6c collect the translations; or ② accept the proposer's language,
store *which* language it is, and have the officer supply the English at publish — the publish
step is already an officer ceremony, so there is a place to put it. ⛔ **Do not guess which.**

**Before quoting a count, ask which population it counts.** This affects proposal-published polls
only — AI-generated and wizard-created polls are English by construction.

✅ **MEASURED 2026-08-11, having been filed as "NOT measured".**
[`criterion-i18n-census.cjs`](../scripts/live/ops/criterion-i18n-census.cjs) sweeps every live poll
criterion for Han characters and for common Swahili resolution wording: **0 candidates among 102
poll rows.** ⚠️ **Heuristic, and the probe says so in its own output** — zero is evidence of
absence only for the patterns tested. The *shape* remains real and unfixed; its current live
exposure appears to be nil.

⭐ **AND THREE MORE PROPOSAL-SIDE GAPS FOUND IN THE SAME PASS, all consistent with this finding:**
- [`/proposals/[id]`](../src/app/proposals/[id]/page.tsx) still renders `{p.resolutionCriterion}`
  **raw under a fully localized heading** — the exact defect F6a fixed on `/markets/[id]`, still
  live one route away. The page localizes the title, the heading and the decline reasons, then
  prints the criterion bare with no disclosure.
- `goLiveProposal` is the **one production `createMarket` call site that passes no translations**.
  Three of the four now do. It cannot pass any, because a Proposal has no such columns.
- **Search never looks at the new columns**: `MARKET_SEARCH`'s `criterion` field maps to
  `["resolutionCriterion"]` only, so a Swahili *title* is findable and a Swahili *criterion* is not.

**Whether to give Proposal the same two columns is the same decision as F10 itself**, which is why
these are recorded here rather than as separate findings.

### F12 · `criterion-translations-are-write-once-and-can-go-stale` — ⚪ NEW, found 2026-08-11, NOT fixed

Two halves of one lifecycle gap, both found by an adversarial pass over F6's own code.

**① A market's translations can never be changed after creation.** Grepping every write:
`resolutionCriterionSw`/`Zh` are set on a `PredictionMarket` in exactly one place — inside
`createMarket`. There is no admin surface, action or service that edits them on a LIVE poll.
⛔ **So a translation that is wrong, or that an officer later realises is misleading, cannot be
corrected — on the sentence the payout turns on.** The English has the same property, which is
defensible for a *binding* text that players have already bet against; a translation is an aid to
reading and has no such reason to be immutable.

**② Editing the English leaves the translations describing the OLD rule.** The AI-poll edit panel
seeds `criterionSw`/`criterionZh` from the stored poll and always resubmits all three, so an
officer who edits only the English silently keeps two translations of a rule that no longer
exists. ⛔ **The player then reads a Swahili criterion that describes different terms from the
English one the officer will resolve against** — worse than no translation, and invisible.
⭐ The `SAME_AS_ENGLISH` rule cannot catch this: after the edit the two genuinely differ.

**③ And the RESOLVER cannot see what the non-English player read.**
[`/admin/resolver/[id]`](../src/app/admin/resolver/[id]/page.tsx) renders `{m.titleEn}` and then
`{m.titleSw}` — its own established convention is to show the officer what a Swahili player saw —
but the criterion block prints the English only. ⭐ **The officer deciding the payout is the one
person who most needs to know whether the player was shown a different wording**, and they are the
only one who cannot.

**Not fixed** — ① is a new surface, ② needs a policy (clear the translations on an English edit?
warn? require re-confirmation?), ③ is a small render change but on the resolution ceremony, which
is not a surface to touch casually. All three are Ali's call. ⚠️ Neither is reachable today on
production, because **no live poll has a translation yet** (measured: `withSw = 0`, `withZh = 0`
across 102 poll rows). That is the window to decide in.

### F11 · `one-failed-edit-locks-an-ai-poll-forever` — ⚪ NEW, found 2026-08-11, NOT fixed

Found by *running* the officer edit path instead of grepping it — which is the only reason it was
found at all.

[`editAIPoll`](../src/lib/server/ai-poll-generation.ts) re-validates after every edit and sets
`state = revalidation.passes ? "PENDING_REVIEW" : "FILTERED"`. Its own entry guard is
`if (!poll || (poll.state !== "PENDING_REVIEW" && poll.state !== "EDITING")) return null`.

⛔ **So an edit whose re-validation fails moves the poll into a state from which `editAIPoll`
refuses every further edit.** Nothing moves a poll out of `FILTERED` — the only `PENDING_REVIEW`
assignment elsewhere is in the *generation* path, which mints a new poll. The officer's remaining
options are DELETE or REGENERATE, and regenerating costs a paid AI call.

🔴 **AND IT FIRES ON A FIELD RE-VALIDATION NEVER EVEN RECEIVES.** `validateAndFilter` is passed
titles, category, criterion, date, options, sources, confidence and reasoning — **not** the new
`resolutionCriterionSw`/`Zh`. Measured deterministically: a poll at `PENDING_REVIEW` with
`filterReasons = 0`, edited to add **only a Swahili criterion**, came back `state = FILTERED`, and
the next edit returned `null`. So the officer's very first attempt to add a translation can lock
the poll.

⚠️ **PRE-EXISTING — the `FILTERED` transition predates this session** and is deliberate (its
comment explains that an edit introducing a hard fail must not stay approvable). **But F6c added
two new editable fields to that form**, so it is newly reachable by an officer doing exactly what
F6c asks of them.

**Fix, and it is Ali's call:** ① admit `FILTERED` into `editAIPoll`'s guard — editing is *how* you
fix a filtered poll, and approval is separately gated on `filterReasons.length === 0`, so this
looks safe; or ② leave the state machine alone and say so in the UI, so an officer knows one bad
edit ends the poll. ⛔ Do not guess: ① changes a money-adjacent state machine.

**Reproduced by** [`test:criterion-ai-publish`](../scripts/criterion-ai-publish-e2e.test.mts) §3,
which creates its own isolated poll, demonstrates the lock, and deletes it. ⚠️ The first draft of
that section **borrowed a seeded fixture and could not put it back** — it had locked it. A harness
that damages state it did not create is destructive however green it prints.

#### F6c · the AI generation path — 🟢 SHIPPED 2026-08-11

The model is now **asked** for the criterion in all three languages, the pipeline **stores** what
it returns, the officer can **read and edit** it before publish, and **both** publish paths carry
it to the market. Second migration:
[`20260811150000_ai_resolution_criterion_i18n`](../prisma/migrations/20260811150000_ai_resolution_criterion_i18n/migration.sql)
adds the same two nullable columns to `AIPoll` and `MarketCandidate`.

⭐ **THE TWO TRANSLATIONS ARE DELIBERATELY *NOT* IN THE TOOL SCHEMA'S `required`, AND THE GUARD
ASSERTS THAT ABSENCE.** A model forced to fill a field will invent something, and a criterion that
drifts from the English **describes a different bet** while being read by the player as the rule
that decides their money. The prompt says so in as many words: *"OMIT the field entirely rather
than guess … never copy the English here."* ⛔ **Absent is disclosed; wrong is not.**

⛔ **EVERY WRITER GOES THROUGH `normaliseCriterionTranslation` — the same function the wizard and
`createMarket` use.** A model that copies the English into a translation field is not translating,
and storing that is F8 arriving from the AI instead of from an officer. One rule, four surfaces.

⚠️ **THERE ARE TWO PUBLISH PATHS AND THEY ARE IN DIFFERENT FILES.** `/admin/ai-polls` and
`/admin/candidates` each call `createMarket` independently. Fixing only the one this finding named
would have left every candidate-published poll untranslated — the same defect with a smaller blast
radius. ⭐ **The guard names both**, because the reason to write it down is that it is easy to miss.

⭐ **AND THE OFFICER CAN NOW SEE WHAT THEY ARE APPROVING.** `/admin/ai-polls/[id]` renders both
translations under the English (labelled **binding**), and the edit panel makes all three
editable under the same imported rule. Without that, a generated Swahili criterion would be
stored and published **with no human ever having read it** — a write-only field, which is a defect
class this campaign has already filed. ⛔ A missing translation is spelled out — *"No translation —
players see the English with a note saying so"* — rather than left as a blank row, because a blank
row reads as *"I forgot to look"*.

**Guarded structurally by `test:criterion-i18n` §8, and EXECUTED by
[`test:criterion-ai-publish`](../scripts/criterion-ai-publish-e2e.test.mts) — 13/0.** The second
one is the evidence: it runs the publish hop with real data and asserts the translations land on
the market, and that the server-side storage rule refuses a re-cased copy of the English.

🔴 **§8's "the chain" ASSERTION WAS VACUOUS FOR THE AI-POLL PUBLISH HOP, and an adversarial audit
proved it by planting exactly the defect it claims to catch.** `ai-polls/actions.ts` contains
`resolutionCriterionSw: poll.resolutionCriterionSw` **twice** — once in `ingestCandidate(...)`
and once in `createMarket(...)` — so a file-wide regex stayed **GREEN** when the `createMarket`
pair was deleted. That is the write-only-field defect this section exists to prevent, sailing
past the check named after it. ⛔ **Fifth ambiguous anchor of the session.** Each call's argument
object is now extracted by **brace matching** and asserted separately; the same plant now fails.

⚠️ **AND THE CORRECTIONS TO THE RED CLAIM.** It was recorded as *"16 of 18 assertions"* with two
unexercised. §8 has **20** assertions, and **four** passed in both states — the two admitted
untracked-migration ones plus two more. ⛔ **A caveat that undercounts itself is not a caveat.**
The RED run (F6c product stashed, guard kept) produced **16 named §8 failures, exit 1**, and
that figure is right; the denominator was not.

🔴 **AND A THIRD LOCATOR OF MINE WAS WRONG, IN THE SAME WAY AS THE FIRST TWO.** §8 read the tool
schema's `required` array with a plain `.match()` — which returned the **`sources` sub-schema's**
`required: ["url", "publisher"]`, the first of several in that file. Re-anchored on *the array that
contains `resolutionCriterion`*, then wrong again because a **second tool schema** also lists
`titleEn`. ⭐ **And the tokens are now PARSED rather than substring-matched, because
`"resolutionCriterion"` is a PREFIX of `"resolutionCriterionSw"`** — `includes()` literally could
not tell *"the English is required"* from *"the Swahili is required"*, so the check was unable to
fail in the one direction that mattered. ⛔ **An anchor that matches in more than one place is not
an anchor** — three times in one session, in a file whose entire subject is one name being
mistaken for another.

✅ **LOOKED AT.** `qa:criterion-wizard` now also drives the officer's review card at 360 and 1280
for a seeded translated poll and an untranslated one — **38 assertions, 0 failures** across both
surfaces. Shots read by eye: the Swahili and Chinese criteria render cleanly under the English,
and the untranslated poll states the absence twice rather than showing two empty rows.
⚠️ **One instrument bug on the way:** the label carries `text-transform: uppercase`, and
`innerText` returns the **rendered** text — so a case-sensitive `includes("EN (binding)")` failed
over correct markup. CSS changed what the DOM property returned, which is the same family as
reading a truncated string back and believing it.

---

## ⭐ ALI'S STANDING AUTHORIZATION — given 2026-08-11, session 42

> *"yes do full schema migrations, changed and stored data changes, anything — all clear …
> you have full access, ask me for atomic permission."*

**Scope:** F6's schema migration, F8's stored-data change, F3's form change, F7's money-figure
decision — all approved in principle. **Ali approves each tool call as it happens**, so the
authorization is to *proceed*, not to batch.

⛔ **THIS IS WRITTEN DOWN BECAUSE IT WAS SPOKEN IN A TRANSCRIPT, WHICH IS THE ONE THING THIS
WHOLE FILE EXISTS TO PREVENT.** A permission that lives only in a chat log is gone the moment
the session ends, and the next session would re-ask a question already answered.

⚠️ **BUT IT IS NOT A LICENCE TO SKIP THE RULES, AND TWO STILL BIND:**
- **Additive migrations only, local PG first, prod via the deploy — never by hand.** `main`
  auto-deploys and `prisma migrate deploy` runs on start, so a bad migration reaches the live
  money DB with no staging in between.
- **One change, one guard proven RED first, docs in the same commit, one push, one production
  verification.** "All clear" removes the *asking*, not the *proving*.

⛔ **SESSION 42 DID NOT START F6.** It reached the end of its context window here, and a schema
migration against a live money DB is the exact thing not to begin without the runway to finish
and verify it. That is a deliberate stop, not an oversight — see the ready-to-run plan in F6.

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
