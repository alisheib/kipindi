# Admin console — the open findings, written down

**Created 2026-08-11 (session 44). Status: LIVING — tick a row when it ships.**

## Why this file exists, and why the ids start at `A`

The poll lane keeps its findings in [`POLL-OPEN-FINDINGS.md`](POLL-OPEN-FINDINGS.md) with `F`
ids; the campaign register in [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) uses `E` ids. Both
are **shared with a parallel session**, and that register has already produced a collision —
two sessions filed `E-111` minutes apart. ⭐ **So the admin-console lane takes its own prefix
rather than a slice of someone else's number line.** Re-grep the ids at the moment you file,
not at the start of the session.

**Guarded by `npm run test:docs`** (link/path resolution) like every file in here.

---

## What "confirmed" means in the table below

| mark | meaning |
|---|---|
| ✅ **DRIVEN** | the control was worked in a browser, the resulting state read back from Postgres with **raw SQL**, and the screenshot read by eye |
| 🔍 **STRUCTURAL** | derived from the source only. A question, not evidence |
| ⚪ **NOT MEASURED** | named, not yet tested. Say so rather than implying coverage |

⛔ There is no fourth bucket. A grep is not a proof, a green suite is not a readable screen,
and a page that renders is not a working control.

---

## The findings

| # | campaign id | slug | sev | confirmed | where |
|---|---|---|---|---|---|
| A1 | **E-155** | `view-only-roles-are-offered-act-controls` | medium | 🟢 **SHIPPED 2026-08-11** | guard: `test:admin-act-gate` · driven: `qa:admin-act-gate` 39/0 |
| A2 | **E-156** | `privacy-refusal-is-never-audited` | medium | 🟢 **SHIPPED 2026-08-11** | guard: `test:admin-soft-gate` · RED `red:admin-soft-gate` |
| A3 | **E-157** | `refused-clicks-pollute-the-security-log` | medium | 🟢 **SHIPPED 2026-08-11** — fixed at source by A1 | guard: `test:admin-act-gate` |
| A4 | **E-158** | `area-chart-y-axis-mislabels-its-own-gridlines` | low | 🟢 **SHIPPED 2026-08-11** | guard: `test:admin-charts` · RED `red:admin-charts` |
| A5 | **E-159** | `a-zero-paints-a-visible-mark` | low–medium | 🟢 **SHIPPED 2026-08-11** | guard: `test:admin-charts` · RED `red:admin-charts` |
| A6 | **E-160** | `operator-margin-chart-divides-settlements-by-the-wrong-days-stakes` | **medium–high** | 🟢 **SHIPPED 2026-08-11** | guard: `test:margin-series` · RED `red:margin-series` |

⚠️ **WHY BOTH IDS.** The `A` numbers are this lane's own; the `E` numbers are the campaign
register's series, which is what [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) and its handoff
guard index on. ⛔ **`A-1` … `A-5` were ALREADY TAKEN** in that file, which is why this lane
uses `A1` without the hyphen — and why the campaign id exists as a separate column rather than
a rename. **Re-grepped at the moment of filing: the highest live id was `E-154`**, so these
take 155–160. (`E-999` is the documented mutation sentinel, not a finding.)

---

### A1 · `view-only-roles-are-offered-act-controls` — 🟢 SHIPPED 2026-08-11

**`canView` without `canAct` is a state the console very largely does not render for.**

`DEFAULT_GRANTS` ([`roles.ts:171-202`](../src/lib/server/roles.ts#L171-L202)) puts four
(role, domain) pairs into exactly that state on a domain that HAS act controls:

| role | domain | can see | cannot do |
|---|---|---|---|
| COMPLIANCE | `accounting` | insights · settlement · finance · reports · payments · transactions · config | any money action |
| COMPLIANCE | `support` | the player roster | suspend / restore / reset |
| AUDITOR | `accounting` | the same seven money pages | any money action |
| AUDITOR | `compliance` | KYC · AML · approvals · DSAR · retention · audit · objections | any compliance decision |

**Measured with [`qa:admin-act-gate`](../scripts/admin-act-gate-drive.mjs): all 23 cells
render an IDENTICAL control set to the view-only role and to a role that can act.**

⭐ **The comparison IS the measurement, which is why it needs no taxonomy of "act
controls".** `control-gates.ts` states the contract: the page must ask the same question the
action will ask and render a read-only state instead of a control that bounces — the
precedent [`admin/objections/page.tsx`](../src/app/admin/objections/page.tsx) set with
`canDecide`. So a page that gates renders *differently* for the two roles; one that renders
identically does not gate at all. The admin chrome appears in both renders and drops out of
the diff.

⚠️ **An identical render is a question, not a verdict, and 8 of the 23 cells are NOT
defects** — on `/admin/insights`, `/admin/settlement`, `/admin/compliance`,
`/admin/objections`, `/admin/aml`, `/admin/self-exclusions`, `/admin/retention` and
`/admin/approvals` the only enabled controls are shell chrome (`Refresh`, `Open admin
navigation`, `AI toolkit`), so rendering the same for everyone is correct.
⛔ **Before quoting this finding, ask which population it counts: 15 of 23 cells, not 23.**

**The cells with a real body control**, by count of enabled controls offered to the
view-only role:

| page | role(s) | enabled | what is offered |
|---|---|---|---|
| `/admin/reports` | COMPLIANCE · AUDITOR | 32 | report pack prepare / approve / submit |
| `/admin/payments` | COMPLIANCE · AUDITOR | 17 | 💰 **the real-money control-plane** — see below |
| `/admin/transactions` | COMPLIANCE · AUDITOR | 17 | |
| `/admin/finance` | COMPLIANCE · AUDITOR | 14 | |
| `/admin/privacy` | AUDITOR | 11 | 8 × **Export bundle** (a player's whole personal-data file) |
| `/admin/config` | COMPLIANCE · AUDITOR | 9 | `Save override`, `Fee model for new polls` |
| `/admin/audit` | AUDITOR | 5 | `Download Excel report`, `Download PDF report` |
| `/admin/players` | COMPLIANCE | 5 | filters only — likely benign, ⚪ not yet read |

#### ✅ DRIVEN — `/admin/payments`, and the money is SAFE

[`qa:admin-act-refusal`](../scripts/admin-act-refusal-drive.mjs), **9 passed / 1 failed**,
signed in as the seeded local AUDITOR:

- the view gate **admits** AUDITOR to `/admin/payments` (correct — they hold `accounting` view);
- the page renders the **`REAL MONEY LIVE` / `MOCK` mode toggle, the provider switcher, the
  withdrawal-status `Apply`, and eight MNO kill-switches, all ENABLED** — read off the
  screenshot by eye, not inferred;
- the kill-switch was driven through its **whole hard-confirm ceremony** (type `PAUSE`, press
  Pause), and
- 💰 **`SystemConfig['payments.killswitch']` was UNCHANGED.** The action layer refused. **No
  money control moved and nothing was stranded.**
- **CONTROL:** FINANCE ran the identical ceremony on the same control and it **did** change —
  so the refusal is the product, not a driver that never clicked. Restored afterwards.

⭐ **So this is an OFFER that lies, not a hole.** `payment-actions.ts`'s `gate()` checks
`canAct(role, "accounting")` and refuses. The defect is that the console spends an officer's
attention on a control that cannot work, on the surface where the emergency stop lives.

#### ✅ DRIVEN — `/admin/privacy`, same shape, PII instead of money

[`qa:admin-privacy-gate`](../scripts/admin-privacy-gate-drive.mjs), **13 passed / 2 failed**:
AUDITOR is admitted, sees **8 enabled `Export bundle` controls**, clicks one, and
**`SystemConfig['privacy.dsar_queue']` is unchanged — nothing was exported.** CONTROL:
COMPLIANCE's identical click succeeded and wrote `privacy.dsar.exported`.

#### Why it is worth fixing rather than shrugging at

⚠️ **9 of 47 admin pages compute `canAct` at all, and 8 of those 9 are `trading`** —
`markets`, `proposals`, `resolver-queue`, `resolver/[id]`, `updown`, `updown/proposals`,
`updown/rounds`, plus `players/[id]`. The one compliance-domain page that does it
(`objections`) is the precedent everything else was supposed to follow. **The `accounting`
domain has zero.** This is a systematic gap, not a slipped page.

#### 🟢 SHIPPED 2026-08-11 — Ali chose the shell-level gate

⛔ **Not by widening the grants.** `roles.ts` is explicit that Trading never touches
money/PII/config and Auditor is read-only everywhere; the grants are right and the console
was wrong about them.

**The gate is one question, asked once, in [`admin/layout.tsx`](../src/app/admin/layout.tsx)**
— `canAct(viewerRole, domainForPath(path))`, the **same** `domain` the view gate two lines
above already resolved, so the two can never disagree about which domain a route belongs to.
It is published through [`AdminActProvider`](../src/components/admin/act-gate.tsx) and read by
controls as `useMayAct()`.

⭐ **THE REFUSAL NAMES THE ROLE, THE DOMAIN AND THE REMEDY**, because an officer's next
question is always *"then who can?"*: *"The Auditor role can view Accounting & money but not
change it, so the controls on this page are disabled. The Owner can adjust this at
/admin/roles."*

⚠️ **AND THE BANNER IS SUPPRESSED ON A DOMAIN WITH NO ACTIONS — found by driving, not by
reasoning.** EVERY non-Owner role holds `overview` as view-without-act; that is the shipped
matrix, deliberately. So the first version put the banner on `/admin` and `/admin/live` for
all six roles, announcing *"the controls on this page are disabled"* on pages that have no
controls. ⛔ **A banner that is technically true and practically false is worse than none** —
it trains an officer to ignore the one that matters. `DOMAIN_SUMMARY[domain].act === "—"` is
the existing single definition of *"this domain has nothing to do"*, so it decides.

⛔ **"GATED BY DEFAULT" IS THE GUARD, NOT THE MECHANISM, AND SAYING OTHERWISE WOULD BE THE
LIE.** A layout cannot reach inside a control component and disable its button; a new control
that never calls `useMayAct()` is ungated no matter what the shell computes.
[`test:admin-act-gate`](../scripts/admin-act-gate.test.mts) is what makes the property real:
it fails on any client component under `src/app/admin` that imports a server action and does
not consult the gate.

**Coverage, stated exactly: 24 of 46 acting controls consult the gate.** The other 22 are
declared in [`act-gate-allowlist.json`](../scripts/act-gate-allowlist.json) **with a reason
each**, and the guard fails if that number grows or if a migrated control is left listed.
⭐ **Every one of the 22 sits on a domain where no role currently holds view-without-act**, so
none can exhibit A1 under the shipped matrix — but that is a statement about today's grant
table, **not** about the code: the Owner can create a view-only grant for any (role, domain)
pair at `/admin/roles`, and the moment they do those 22 become reachable. They are work items,
not exemptions, and the allowlist says so in its own header.

⚠️ **`Select` gained a control-level `disabled` + `disabledReason`** rather than a hand-rolled
one at the call site — the kit rule, and `test:ui-consistency` exists because this codebase has
already paid for three hand-rolled copies of a kit primitive.

⭐ **THE READING SURVIVES, WHICH IS THE WHOLE POINT.** Date-range presets, search, sort,
pagination, CSV/PDF export and the transactions filter selects stay live for a read-only
officer — an auditor who cannot change the window they are looking at cannot audit. The
payout-status pills and the config toggles are gated *despite* not writing directly, because
they let a read-only officer **stage** a change they can never apply: the form would show
"Unavailable" selected while players were still told "Operational".

**Driven: [`qa:admin-act-gate`](../scripts/admin-act-gate-drive.mjs) — 39 passed, 0 failed
across all 23 cells** (was 23 of 23 rendering identically). Plus `qa:admin-privacy-gate`
**14/0** and `qa:admin-act-refusal` with the kill-switch now reading `disabled=true` for
AUDITOR while FINANCE's identical ceremony still changes the switch.

✅ **LOOKED AT.** `/admin/payments` as AUDITOR, read by eye at 1280: the banner is legible,
and the provider switcher, Test Selcom, demo-async, all three withdrawal-status pills, Apply
and **all eight MNO kill-switches** render greyed — while `REAL MONEY LIVE`, the simulation
warning, MNO health, reconciliation and the telemetry note are all still readable.

🔴 **AND THE SWEEP ITSELF WAS WRONG THREE TIMES BEFORE THE PRODUCT WAS.** ① It compared every
button in `<main>`, so chrome and read controls counted — 8 of the original 23 "failures" were
a refresh glyph and a nav opener. ② Admin labels are **bilingual** and `textContent`
concatenates them, so a filter reading `"Apply · Tumia"` matched no English name and reported
nine phantom ungated controls on `/admin/transactions`; it now splits on the interpunct and
requires **every** part to be read-safe, which cannot accidentally pass an act control.
③ Its assertion was *"the renders must differ"* — correct while the defect existed and **wrong
the moment the fix landed**, because a page with no act controls legitimately renders the same
for everyone. Restated as the real invariant: *no ENABLED act control is offered to a role that
cannot act.* ⛔ **Two of my drivers failed over exactly the behaviour they exist to require**,
which is the [[a-guard-that-cries-wolf]] shape.

---

### A2 · `privacy-refusal-is-never-audited` — 🟢 SHIPPED 2026-08-11

**Every admin gate in this codebase writes `privilege_escalation_blocked` at SECURITY
severity when it refuses. `/admin/privacy` is the only one that does not.**

The writers: [`rbac-guard.ts`](../src/lib/server/rbac-guard.ts) (`requireStaff` **and**
`requireOwner`), `payments/payment-actions.ts` `gate()`, `kyc/[id]/kyc-actions.ts` `gate()`,
`reports/pack-actions.ts`, both `resolver-queue` actions, `_actions/ai-toolkit.ts`,
`objections-service.ts`, and `markets/actions.ts` twice.

[`privacy/actions.ts`](../src/app/admin/privacy/actions.ts)'s `requireOfficer()` imports
`audit` and returns `{ ok: false, error: "Not authorised." }` with **no `audit()` call**. The
file's single `audit()` is `privacy.dsar.exported`, on the SUCCESS path.

✅ **DRIVEN, not read:** AUDITOR clicked `Export bundle`; `privilege_escalation_blocked` went
**0 → 0** and the three newest `AuditLog` rows were the two login rows and nothing else.
**CONTROL:** the same click as COMPLIANCE wrote `privacy.dsar.exported`, so the click reached
the action.

⭐ **This is a PDPA surface.** A data-subject export is precisely the attempt a regulator
would expect to find recorded, successful or not. ⚠️ It is also a difference two officers
would never notice, because the refusal message looks identical either way.

#### 🟢 SHIPPED 2026-08-11 — and the count was **seven** copies, not four

⛔ **Do not fix A2 by copying `requireStaff` into privacy.** That would have been a fifth copy
of a gate that already existed in four places — the fix is one gate, not another one.

**`softRequireStaff(domain, action, refusal)`** now lives in
[`rbac-guard.ts`](../src/lib/server/rbac-guard.ts) beside `requireStaff`: grant lookup →
SECURITY audit on refusal → step-up 2FA → the officer's session. It is the SOFT form, for
surfaces that return `{ ok: false, error }` because their controls render the message inline.

⚠️ **THE FIRST WRITE-UP SAID FOUR COPIES. THE GUARD FOUND SEVEN**, and the three extra ones
were the interesting ones — this is why §2 asserts the *absence* of copies rather than the
presence of a call:

| file | refusal shape | audited? | now |
|---|---|---|---|
| `payments/payment-actions.ts` | soft `{error}` | ✅ | delegates |
| `kyc/[id]/kyc-actions.ts` | soft `{error}` | ✅ | delegates |
| `reports/pack-actions.ts` | soft `{error}` | ✅ | delegates |
| `privacy/actions.ts` | soft `{error}` | 🔴 **no** | delegates |
| `resolver-queue/resolution-mode-action.ts` | soft `{error}` | ✅ | delegates |
| `resolver-queue/resolution-policy-action.ts` | soft `{error}` | ✅ | delegates |
| `settlement/actions.ts` | 🔴 **`redirect("/auth/admin")`** | 🔴 **no** | delegates |

🔴 **`settleMarketAction` was the second unaudited refusal, and it is the MONEY path** — an
officer pays out a market by hand there. A role without `accounting` was **redirected to the
sign-in page while still signed in**, which reads as an expired session rather than a
refusal, so the officer retries a login that was never the problem — and the attempt to move
money by hand left **no trace at all**. Both halves are fixed by the delegation: the officer
now gets *"Forbidden: paying a market is a money act — accounting access is required."* in
the action's own return shape, and the attempt is on the record.

⚠️ **AND ONE CLAIM IN AN EARLIER DRAFT OF THIS SECTION WAS FALSE.** It said `reports` had
"lost step-up 2FA". It had not — each of its four actions called `requireAdminTotp` itself,
immediately after gating, so the protection was present and merely placed differently. Those
call-site calls are now redundant and were removed; the second factor is taken once, in the
same place as every other gate. ⛔ **The difference between "this copy is missing a control"
and "this copy puts the control somewhere else" is the difference between a finding and a
false alarm**, and only reading all four bodies tells them apart.

**Guarded by [`test:admin-soft-gate`](../scripts/admin-soft-gate.test.mts) — 24 assertions.**
§1 asserts the helper audits, carries `SECURITY`, takes 2FA, consults `canAct`, lets ADMIN
bypass, and — the one that matters — that **the audit is written BEFORE the refusal returns**.
§2 asserts **no admin action file calls `canAct()` directly at all**, which is what caught the
three copies the finding had missed. §3 asserts each of the seven delegates, asks for the
right domain, and **keeps no local copy of the decision**.

**RED-proven by [`red:admin-soft-gate`](../scripts/admin-soft-gate-red.mjs) — 11/0, three
plants, every file restored byte-identical (verified by re-reading, not assumed):** ① privacy
keeps its own local gate, the A2 defect exactly → §2 + §3 red; ② the helper loses its audit
call → §1 red; ③ the helper returns *before* it audits → §1's ordering assertion red. ⭐ Plant
③ exists because ② alone would pass over a gate that audits unreachably — the
[[checks-that-lie]] shape.

✅ **AND IT WAS EXECUTED, NOT ONLY GREPPED.** `qa:admin-privacy-gate` re-run against a fresh
production build: **`privilege_escalation_blocked` 1 → 2**, newest row
`SECURITY/privilege_escalation_blocked@2026-08-11 13:13:37`. **The same driver measured 0 → 0
before the fix.** §3 still passes — no DSAR row was created — so the data is exactly as safe
as it was; what changed is that the attempt is now recorded.

⚠️ Suites re-run after the change: `test:rbac` 115 · `test:control-gates` 219 ·
`test:admin-roles` 33 · `test:staff-role` 24 · `test:admin-money-ops` 16 · `test:two-admin` 18
· `test:settlement-gate` 121 · `test:money-invariants` 84 — all 0 failed. `tsc` exit 0.

---

### A3 · `refused-clicks-pollute-the-security-log` — 🟢 SHIPPED 2026-08-11 (fixed at source by A1)

[`control-gates.ts:19-23`](../src/lib/server/control-gates.ts#L19-L23) already states this as
a defect it exists to prevent, in its own words:

> *"clicking a control the UI offered writes `privilege_escalation_blocked` at SECURITY
> severity — so an ordinary operator's legitimate click is recorded as an attempted privilege
> escalation in the log a compliance officer reads. That is audit pollution on a licensed
> platform, not just a UX wart."*

**That was fixed for `/admin/resolver-queue` and the AI toolkit (E-18/E-19, 2026-08-01). The
same shape is still live across the whole `accounting` and `compliance` domains**, because
those pages never gained the page-side gate — which is A1.

✅ **DRIVEN:** the AUDITOR kill-switch ceremony wrote **`privilege_escalation_blocked` 0 → 1**,
and it is the newest row in `AuditLog`. So on production, a read-only auditor doing the
obvious thing on a page they were legitimately given becomes a SECURITY event.

⭐ **A1, A2 and A3 are one fix.** Gate the control at the page and none of the three can
happen: the officer is told why, no refusal fires, and there is nothing to audit or to fail
to audit.

---

### A4 · `area-chart-y-axis-mislabels-its-own-gridlines` — 🟢 SHIPPED 2026-08-11

`AdminAreaChart` draws five y-gridlines at `minY + t·range` for `t ∈ {0, .25, .5, .75, 1}` and
labels each with [`compact()`](../src/components/admin/admin-charts.tsx#L460), which **rounds
to a whole number**. So on a series with a small range, distinct gridlines carry identical or
wrong labels.

✅ **DRIVEN by rendering** (`test:admin-charts` §1), not by reading:

| series max | rendered labels | distinct |
|---|---|---|
| 1 | `0, 0, 1, 1, 1` | **2 of 5** |
| 2 | `0, 1, 1, 2, 2` | **3 of 5** |
| 3 | `0, 1, 2, 2, 3` | **4 of 5** |
| 4 | `0, 1, 2, 3, 4` | 5 of 5 ✅ |

The gridline at 0.25 is labelled `0` and the one at 0.5 is labelled `1`. A reader taking a
value off the axis reads a number the chart does not mean, and unlike the bar-list and the
meter there is no adjacent figure to correct it.

⚪ **NOT REACHABLE TODAY, and this is measured rather than assumed.**
[`chart-source-census.cjs`](../scripts/live/ops/chart-source-census.cjs) recomputes the real
series from the live DB: the 24h net flow runs `min=-24,499 max=0` and the 28d margin
`min=-1183 max=100`. Both give **5 of 5 distinct labels**. ⭐ The `minY = Math.min(…, 0)`
zero-baseline is what saves them — it forces the range to at least the series max, so only a
series topping out at ≤ 3 collides. **That is why this is `low` and not `medium`: the defect
is certain, its current exposure is nil.** ⛔ It becomes reachable the moment any area chart
plots a small count rather than a money amount.

---

### A5 · `a-zero-paints-a-visible-mark` — 🟢 SHIPPED 2026-08-11

Three primitives floor their bar size, so a **zero value draws a mark**:

| primitive | code | a zero paints | number beside it? |
|---|---|---|---|
| `AdminStackedBars` | `Math.max(0.5, segH)` | 0.5px segment | ❌ **no** |
| `AdminMeter` | `Math.max(1, pct)` | 1% fill | ✅ `0 / cap` |
| `AdminBarList` | `Math.max(2, pct)` | 2% bar | ✅ `0` |

✅ **DRIVEN by rendering** (`test:admin-charts` §2/§4/§5) — the emitted markup carries
`height="0.5"`, `width: 1%` and `width: 2%` respectively for a zero input.

⭐ **`AdminStackedBars` IS THE ONE THAT MATTERS, AND IT IS THE ONLY ONE WITH NO NUMBER.** The
bar-list and the meter print the true value right next to the floored bar, so the reader is
told `0` even though a sliver shows; the stacked bar has only a legend, so nothing discloses
it. Its single instance is `/admin/finance` **"Provider mix over time"**.

🔴 **REACHABLE AND FIRING, measured on production 2026-08-11**: the legend takes the distinct
providers across the whole window (`MIXX`, `MPESA`, `AIRTEL_MONEY`, `HALO_PESA`) and then
emits one segment per provider per bucket — so **6 of 8 (provider × day) cells hold zero
volume**, each painting a sliver for deposits that did not happen. ⚠️ 75% of that chart's
segments are currently fabricated marks.

⛔ **Do not "fix" the meter and the bar-list by removing their floors without checking the
design intent** — a 2% stub on a bar list is arguably a deliberate affordance so a row is
still clickable/visible. **The stacked bar has no such defence**: it is a proportional area
chart and 0.5px of area means "some".

---

### A6 · `operator-margin-chart-divides-settlements-by-the-wrong-days-stakes` — 🟢 SHIPPED 2026-08-11

🔴 **The `/admin/finance` "Operator margin" chart is not an operator margin.**

[`marginSeries`](../src/lib/server/analytics.ts#L339-L363) buckets by `createdAt` and computes
per bucket:

```ts
margin = stakes === 0 ? 0 : ((stakes - payouts - refunds) / stakes) * 100;
```

**Every term is bucketed by the day the money MOVED.** In a prediction market a payout or a
refund happens days after the stake that earned it, so the numerator and the denominator
describe **different bets**. No bucket compares like with like.

✅ **MEASURED ON PRODUCTION, 23 days, recomputed from raw SQL with the same definition:**

| day | stakes | payouts | refunds | margin |
|---|---|---|---|---|
| 2026-07-20 | 4,000 | 0 | 0 | **100.0%** |
| 2026-07-28 | 13,000 | 58,097 | 0 | **−346.9%** |
| 2026-07-30 | 7,500 | 0 | 96,250 | **−1183.3%** |
| 2026-08-05 | 825,600 | 362,927 | 379,450 | 10.1% |

- **5 of 23 days read exactly `100.0%`** — because nothing had settled that day. ⛔ **A 100%
  operator margin is impossible in a pari-mutuel**, where the operator takes a commission and
  the rest of the pool belongs to the winners. The chart states it as fact five times.
- **2026-07-30 reads −1183%** because that day's refunds were **12.8× its stakes**, and those
  refunds belong to bets placed on earlier days.
- The card is subtitled **"28-day · band 7–10%"**, inviting the operator to read each point
  against a band no point in the series is near.

⚠️ **AND THE SAME PAGE PRINTS A SECOND, DIFFERENT "Operator margin".** The KPI tile at
[`finance/page.tsx:145`](../src/app/admin/finance/page.tsx#L145) uses `operatorMarginPct(period)`
— the **aggregate** over the window (~37.9% on this data) — while the chart at `:357` plots
the per-day series. **Two surfaces, one name, different denominators, visibly disagreeing.**

⭐ **This is a CODE path, so [[50pick-data-resets-before-launch]] does not cover it.** Ali's
own distinction: a DATA inconsistency is disregarded; a code path that keeps producing one is
not. Wiping the data changes none of the arithmetic above.

**Two honest options:**
① **attribute settlement to the originating bet's bucket**, so a day's margin describes that
day's bets. Correct, and the largest change — it needs the payout joined back to the stake's
date, and the last buckets stay provisional until their markets resolve.
② **make the series cumulative-to-date** over the window. Identical formula, but every point
is a real operator margin over a real period, it cannot print 100% once anything has settled,
and it agrees with the scalar tile at the right-hand edge by construction.
⛔ **Do not simply clamp the axis or hide the outliers** — that would leave the number wrong
and make it look right, which is worse.

#### 🟢 SHIPPED 2026-08-11 — option ②, and the arithmetic did not change

⭐ **THE DEFECT WAS NEVER THE FORMULA. It was WHERE THE ACCUMULATORS LIVED.** Declared outside
the bucket loop the series is cumulative and every point is a real margin over
`[window start → this bucket]`; declared inside it, each bucket divides that day's
settlements by that day's stakes. The diff is three `let`s moving up four lines, and it is the
whole finding. **A guard that checked the formula would have passed in both states** — which
is why `test:margin-series` §4 asserts the *position* of the declaration and §3 asserts
agreement with the KPI tile.

⚠️ **The card's subtitle changed too, and that is not cosmetic.** It read *"28-day · band
7–10%"* while plotting points at 100% and −1183%; inviting an officer to read those against a
band was the compounding half. It now says **"cumulative to date · 28-day window"** — what is
actually plotted.

**Guarded by [`test:margin-series`](../scripts/margin-series.test.mts) — 15 assertions, and
§3 is the one that matters:** the series' LAST point must equal `operatorMarginPct` over the
same window, which is exactly the "two surfaces, one name, different denominators"
disagreement this finding is about. ⭐ **The fixture is the REAL production shape** — four of
the 23 measured live days, including both impossible readings — so §1's CONTROLs first prove
the *old* algorithm produces 100% and −346% on this data before asserting the new one does
not. A guard written against invented numbers proves the algebra; written against the numbers
that actually broke, it proves the defect.

🔴 **AND §4's CARD CHECK WAS VACUOUS AS FIRST WRITTEN — the RED run caught it.** It did
`fin.split("Operator margin")[1].slice(0, 200)`, and `"Operator margin"` occurs **twice** in
`finance/page.tsx`: once as the KPI tile's label and once as this card's title. It read the
200 characters after the *tile*, so the plant that restored `band 7–10%` onto the **card**
left the guard GREEN. Re-anchored on `<AdminCard title="Operator margin"` **and asserted to
match exactly once**. ⛔ **Sixth ambiguous anchor of this session, in a check written by
someone who had already been burned five times.**

**RED-proven by [`red:margin-series`](../scripts/margin-series-red.mjs) — 8/0, both files
restored byte-identical:** ① the accumulators move back inside the loop; ② the card
re-advertises the 7–10% band.

---

## Coverage — what is proven, and what is not

⛔ **Stated as three buckets, because "we audited the admin console" is not a claim anyone can
check.** The console is 47 pages; nothing below rounds up.

### ✅ PROVEN BY DRIVING

| axis | instrument | result |
|---|---|---|
| The VIEW gate, **7 roles × 7 domains** + owner-only for every role | [`qa:admin-view-matrix`](../scripts/admin-view-matrix-drive.mjs) | **73/0** |
| The ACT gate, **all 23 canView-without-canAct cells** | [`qa:admin-act-gate`](../scripts/admin-act-gate-drive.mjs) | **39/0** |
| A money control refused + the switch read back from Postgres | [`qa:admin-act-refusal`](../scripts/admin-act-refusal-drive.mjs) | kill-switch unchanged; FINANCE's control DID change |
| A PII control refused + the DSAR queue read back | [`qa:admin-privacy-gate`](../scripts/admin-privacy-gate-drive.mjs) | **14/0** |

⭐ **THE VIEW MATRIX IS 49 CELLS, NOT 47 × 7 = 329, AND THAT IS A STRENGTH.** The gate is
decided **per domain** — `domainForPath(path)` → `canView(role, domain)` — so loading every
route as every role would re-prove one function call 282 times. Driving 7 × 7 proves the gate;
`test:rbac`'s `assertRouteDomainsComplete` proves the route→domain map separately; §0 of the
sweep asserts each representative route resolves to the domain it claims **using the product's
own resolver**. Together they cover all 47 routes. ⛔ **Without §0 this would be a sweep that
passes while a mis-mapped route is mis-gated** — the map is the load-bearing assumption and it
is checked, not trusted.

### 🔍 ASSERTED STRUCTURALLY (source only — a question, not evidence)

- **24 of 46** acting controls consult the act gate; the other **22** are declared with reasons
  in [`act-gate-allowlist.json`](../scripts/act-gate-allowlist.json), all on domains where no
  role currently holds view-without-act.
- Every exported admin server action carries a guard whose domain matches its route
  (`test:admin-soft-gate` §2/§3 — no file calls `canAct()` directly any more).
- The chart primitives' edge behaviour is proven by **rendering** them
  (`test:admin-charts`, 32 assertions) — that is stronger than a grep and weaker than a
  screenshot of the real page with real data.

### ⚪ NOT COVERED — say so rather than implying otherwise

- **Per-page filter / sort / pagination correctness.** `test:date-range` covers the shared
  `resolveRange`, and the act-gate sweep proves filters stay *usable* for a read-only role, but
  **no instrument yet asserts that a filter actually narrows the rows** on each of the 47 pages.
- **The remaining chart instances' provenance.** A6 pinned and fixed the operator-margin
  series; the other 18 instances have their source named but only
  `/admin/finance`'s provider mix and the 24h flow were recomputed from raw SQL.
- **Empty / loading / error states per page.** Only the states the drivers happened to hit.
- **Production browser verification of the admin console.** Every drive above ran against a
  local production build (`next build && next start`) on the disposable cluster. Ali cleared
  the Owner login on production this session, so this is now a matter of remaining time, not
  permission.
- **The 22 allowlisted controls**, by definition.

---

## Measured facts about the live console (2026-08-11, read-only, no login)

From [`scripts/live/ops/rbac-census.cjs`](../scripts/live/ops/rbac-census.cjs) — read-only,
identity-asserted, no session touched:

- ⭐ **`RoleDomainGrant` is EMPTY on production — 0 rows.** Every (role, domain) pair resolves
  to the code `DEFAULT_GRANTS`, so a local sweep against the defaults **is** representative.
  ⛔ That is worth re-checking before trusting any future role result: the table is
  Owner-editable live at `/admin/roles`, and the day it gains a row this stops being true.
- 🔴 **AUDITOR and SUPPORT hold no account at all** — not on production, and `.env.qa.local`
  carries no persona for either. **A role sweep limited to the existing identities cannot
  exercise 2 of the 7 staff roles**, and would report a clean matrix having never touched a
  third of it. [`db:seed-staff-local`](../scripts/seed-staff-local.mts) exists for exactly
  this and creates all six non-Owner roles on the disposable cluster.
- ⚠️ **9 ACTIVE ADMIN accounts**, unchanged since the campaign's BLOCKER 3. Every one bypasses
  the grant table entirely.
- ⚠️ The other staff accounts are `PENDING_KYC`, which does **not** gate the console — the
  layout admits any `isStaffRole` with no status check.

---

## Instrument errors made while producing the above — recorded because they are the method

🔴 **Three of my own checks were wrong before the product was, and each was caught by a
CONTROL rather than by thinking harder.**

1. **The action inventory took a destructured parameter's brace as the function body.**
   `src.indexOf("{", afterName)` lands on `function f({ id }: { id: string })`, yielding a
   12-byte "body" — so **50 actions read as unguarded** on the first run. Fixed by
   paren-matching the parameter list first, then accepting only a brace group whose closing
   `}` sits at **column 0**, and asserting no body is under 40 bytes.
2. **Its population was wrong too.** It matched `/actions\.ts$/`, which misses
   `resolution-mode-action.ts` (singular) — **4 of the 30 `"use server"` files under
   `src/app/admin` were never scanned.** ⛔ The anchor for "is this a server-action module"
   is `"use server"`, not the filename.
3. **The privacy driver's card locator matched a leaf.**
   `locator("section,div").filter({hasText:/on-behalf export/i}).last()` found a div holding
   the heading but no table, and reported `rows=0` **for COMPLIANCE — a role the screenshot
   plainly shows eight controls to.** Only §5's positive control caught it. Re-anchored on
   *the table that contains the control*, asserting exactly one such table exists.
4. **The refusal driver clicked once and concluded "refused + silent".** The kill-switch is a
   hard-confirm tier: the first click only opens a panel. §5's control failed in the same run
   — FINANCE's identical click changed nothing either — which is the only reason a
   **non-firing action was not written up as a silent refusal.**

⭐ **The rule underneath all four: every refusal check needs a positive control on the same
control, in the same run.** A refusal that cannot be told apart from a broken driver is not
evidence, and three of these four would have shipped as findings without one.
