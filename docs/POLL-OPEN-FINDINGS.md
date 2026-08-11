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
| F1 | `sell-offered-on-bonus-funded-position` | medium | ✅ re-confirmed | [`market-service.ts:1793-1826`](../src/lib/server/market-service.ts#L1793-L1826) |
| F2 | `one-sided-loser-share-phantom-fee` | medium | ⚠️ **narrowed, line NOT pinned** | [`payout.ts:344-362`](../src/lib/payout.ts#L344-L362) |
| F3 | `per-market-rate-overrides-are-inert` | medium | ✅ re-confirmed | [`config-form.tsx:337-365`](../src/app/admin/config/config-form.tsx#L337-L365) |
| F4 | `wizard-resolution-time-parsed-in-browser-timezone` | medium | ✅ re-confirmed | [`wizard.tsx:46`](../src/app/admin/markets/new/wizard.tsx#L46) |
| F5 | `regex-advertised-never-executed` | medium | ✅ re-confirmed | [`search-box.tsx:125`](../src/components/ui/search-box.tsx#L125) vs every call site |
| F6 | `resolution-criterion-english-only` | medium | ✅ by inspection | `prisma/schema.prisma` — `resolutionCriterion` is one column |

### F1 · `sell-offered-on-bonus-funded-position`

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

**Fix:** add `bonusStakeTzs` to the Pick and to the `sellable` computation, with a third
`reason: "BONUS_FUNDED"` so the UI can say why. The guard must assert `sellable === false` for a
bonus-funded position **inside** the window — outside it, `sellable` is already false for an
unrelated reason and the check would pass vacuously ([[checks-that-lie]]).

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

**Fix:** interpret the wizard's wall-clock in the platform zone (Africa/Dar_es_Salaam, UTC+3)
explicitly, and echo the resolved absolute instant **with its zone** on the review step so the
officer confirms what will actually be stored. ⚠️ `wizard.tsx:128` currently shows
`<Row label="Resolves at" value={resolutionAt} />` — the raw, zoneless string, which is exactly
the value that cannot be checked.

### F5 · `regex-advertised-never-executed`

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
| OP1 | Two LIVE polls carry no Chinese title | dev | proposal path never sets `titleZh`; AI path does. Fix at source — `backfill:zh` exists because this has been patched by backfill before |
| OP2 | `mkt_fdf70a0704dc1789f404` (TCRA Q2) CLOSED awaiting an officer's verdict since **2026-08-09 21:00** | officers | ~46h as of 2026-08-11. Needs a human verdict, not code |
| OP3 | Owner console password rotation | **Ali** | 🔴 `Admin@1234` was in this repo in plaintext from 2026-08-04 to 2026-08-11 on a pushed branch. Redacted in `3bc5d60b`; **redaction does not un-publish**. Rotation is the only remedy, plus 2FA re-enrol |

⚪ **Deliberately NOT open:** the E-138 pool-inflation shape on 5 LIVE polls. Ali ruled *"the data
gets reset before launch"* — see [[50pick-data-resets-before-launch]]. It is a pre-launch reset
checklist item, not a finding. ⛔ Do not re-raise it.
