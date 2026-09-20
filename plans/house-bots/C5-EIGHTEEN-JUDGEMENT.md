# The eighteen with no test — judged one at a time

> **What this file is.** `test:scenario-coverage` assertion **3.4** holds `deferred + unresolved` at a ceiling of
> **18**: eighteen register rows with **no test at all**. This file is the judgement phase that the ops lane's own
> correction asks for — it writes **no test**. Each of the eighteen is read three ways (the register row, the ruling
> or amendment it routes to, the shipped code) and given one of three verdicts, with the evidence that settles it.
>
> **(a) NEEDS A TEST** — the behaviour is real, shipped and unasserted. A test lowers 3.4's ceiling by one.
> **(b) NEEDS RECONCILING** — the row asks for something the product deliberately does not have, or names an owner
> that does not and will not exist, or is already asserted and simply says so nowhere. Correct the ROW; cite the
> ruling. ⛔ Never write a test that asserts a withdrawn requirement.
> **(c) CANNOT BE MEASURED HERE** — NOT MEASURED, with the reason named.
>
> ⛔ **THE HONEST END STATE IS THAT ALL EIGHTEEN ARE ACCOUNTED FOR, NOT THAT ALL EIGHTEEN HAVE TESTS.**
>
> ⚠️ **(b) HAS TWO SUB-KINDS AND THEY ARE NOT THE SAME CLAIM**, so they are labelled separately below:
> **(b1) WITHDRAWN** — a ruling took the requirement away; no test is owed, ever.
> **(b2) ALREADY ASSERTED, MIS-ROUTED** — the behaviour ships AND is asserted; the row just names no live suite.
> A (b2) row leaves 3.4's population through the gate's OWNED/NAMED door rather than through a test — which is
> exactly the move the ops lane caught itself gaming — so **every (b2) below names the assertion ids that were
> read today**. If an id named here does not assert that row's Expected, the reconcile is wrong and must be refused.
>
> **Verdict counts: (a) 8 · (b) 7 (b1 four, b2 three, two rows carry both) · (c) 3.**
> Sources read: `01-scenario-register.md`, `02-sealed-flows.md`, `04-amendments.md`, `C7-SPEC.md`, `PROGRESS.md`,
> `docs/HOUSE-BOTS.md`, `docs/COMPLIANCE-DECISIONS.md`, and the shipped tree under `src/` and `scripts/`.

---

## 0. Two findings that fall out of the judgement and are not about any one row

**F-1 · A1's stated proof does not exist — a WRONG AUTHORITY.** `04-amendments.md` A1 (the amendment that owns
HB-ACC-07) ends *"Test: `test:docs` greps the risk line."* Measured today: `scripts/docs-links.mjs` (130 lines, the
whole of `test:docs`) checks three things only — relative links resolve, `scripts/<file>` paths exist, and every
`npm run <name>` is a real package.json key. **It greps no sentence anywhere.** So A1's recorded proof is a claim
about a guard that does not do that. The risk line itself is present twice (`docs/HOUSE-BOTS.md:813`,
`docs/COMPLIANCE-DECISIONS.md:391`, with a cross-reference at `:355`) and **nothing pins it**.

**F-2 · Three rows' only surviving requirement is a sentence in the authority docs, and one guard covers all three.**
After D20, R4's tests are struck in place and its whole surviving content is *"A COMPLIANCE and HOUSE-BOTS.md rule"*
(`04-amendments.md` R4). After A1, HB-ACC-07's surviving content is the risk-7 line. So:

| rule | HOUSE-BOTS.md | COMPLIANCE-DECISIONS.md | rows it is the whole of |
|---|---|---|---|
| R4 — no rewards on house stakes | `:851` | `:342` | CRA-12, FS-05 |
| risk 7 — a password change signs no other device out | `:813` | `:391` (+ `:355`) | HB-ACC-07 (tail only) |

One guard reading both documents for both sentences, with a planted control (the sentence removed from a copy of
the text **must** be reported) and a positive control (the untouched documents report nothing), closes the live half
of CRA-12 and FS-05 and gives A1 the proof it has been claiming. ⛔ It does **not** prove any future reward code
obeys R4 — D20 struck the walker that would have — and the guard's label must say so rather than imply it.

---

## (a) NEEDS A TEST — eight

### a1 · ENG-42 · the engine reads no Redis, and nothing says so

- **Row:** marked `[covered]`. Its `Test:` line is *"`scripts/redis-failopen.test.mts` extension:
  `src/lib/server/house-bot/**` imports no redis client."*
- **Measured:** that extension **was never written**. `grep -n "house-bot|houseBot|house_bot" scripts/redis-failopen.test.mts`
  → **0 hits** in 700 lines. The suite (`test:redis-failopen`, in `test:all`) proves the PLATFORM's fail-open contract
  (A/B/C/D/E/F: `getRedis()` null when unset, the sync and async buckets, a dead host, the breaker) and says nothing
  about the engine. A row marked `[covered]` whose owner never grew the case it names is the worst shape in the set.
- **The claim is TRUE today and that is why it is assertable:** `grep -rn "redis" src/lib/server/house-bot/*.ts` → 0,
  and `grep -rn "event-bus" src/lib/server/house-bot/*.ts` → 0.
- **Verdict (a).** Behaviour real, shipped, unasserted.
- **Where it ships:** `scripts/redis-failopen.test.mts`, a new section G. ⛔ **Print the population** — the count of
  house-bot modules scanned — because an absence over an empty file list passes on every build (this lane's own
  §11.247 lesson). PLANTED control: a redis import of the shape the real tree could contain
  (`import { getRedis } from "../redis"`) planted into a copy of one module **must be reported**. POSITIVE control: a
  module that legitimately DOES use Redis (`src/lib/server/event-bus.ts`) must still be allowed — the sweep is scoped
  to `house-bot/**`, not a ban. ⚠️ Scope it to the DIRECT import: transitive reach through the notification service
  is what the row's own Expected permits ("the console's `notification:new` refresh may not reach another container,
  and `RefreshPoller` covers it"), so a transitive sweep would assert the opposite of the row.

### a2 · HB-ACC-16 · a REHASH that refreshes the fingerprint keeps the bot ACTIVE

- **Row:** FUTURE — a code change rewrites `passwordHash` with no holder acting. Expected: *either* the writer
  declares `passwordSetVia=REHASH` **and** updates `HouseBot.passwordFingerprint` in the same transaction, *or* the
  build fails. Routed by `04-amendments.md:61` — *"HB-ACC-16: seal-flows §6 (a REHASH refreshes the fingerprint).
  Its writer pin is merged into A2."*
- **The "build fails" half IS asserted:** `test:house-bot-holder-lifecycle` §1 (`1.1`–`1.4`) walks every
  `db.user.update` naming `passwordHash` and requires the hook beside it, shrink-only at `WRITER_CEILING = 33`, with
  planted/positive controls at `4.1`/`4.2`/`4.5`.
- **The escape hatch is NOT asserted.** The mechanism ships: `PASSWORD_SET_VIA` includes `REHASH`
  (`src/lib/house-bot/constants.ts:168`), `designation.ts:93` words it, and `holderCauses` raises `PASSWORD_CHANGED`
  **only** on `s.fingerprintNow !== s.bot.passwordFingerprint` (`src/lib/house-bot/consent.ts:97`). So a rehash that
  refreshes the fingerprint raises no cause and the bot stays ACTIVE — and **nothing drives it**. The only `REHASH`
  in `scripts/` is `house-bot-migrations.test.mts` `d.11`, which proves the DB check constraint accepts the STRING.
- **Verdict (a).** The scenario is future; the mechanism is present-day and live.
- **Where it ships:** `scripts/lib/house-bot-engine-cases.mts` §19 (both stores, the real hook and the real sweep).
  DRIVE the condition: write the hash AND the bot's fingerprint, then run the hook → ACTIVE, no `AUTO_PAUSED` event,
  no bell. PLANTED control: the same rewrite WITHOUT the fingerprint refresh → `AUTO_PAUSED(PASSWORD_CHANGED)` with
  `method: "REHASH"` — the defect the row exists to prevent, and it must be caught. POSITIVE control: an ordinary
  `SELF_CHANGE` on the same fixture must still pause (19.A row 1's rule must not be weakened by the new branch).

### a3 · HB-ACC-14 · the holder's own activity feed is the door nobody opened

- **Row:** superseded by D19 — the house-bet rows stay in the holder's history with their house keys stripped
  (C4 ruling 154, C5-SPEC ruling 170), and `/profile/account` as served carries no house word (ruling 248).
  *"Coverage gate: counts in its absence form."*
- **The stripper is real:** `getOwnActivity` returns `withoutHouseAuditKeys(...)` (`src/lib/server/user-service.ts:223`),
  the same function `exportUserData` uses at `:108`.
- **Measured:** `test:dsar-secrets` §6 asserts the strip **through `exportUserData` only** — with a real control
  (`6.CONTROL`: the durable row really carries `houseBotId` and `intentId`). `getOwnActivity` is called once in the
  suite corpus, at `scripts/lib/house-bot-reports-cases.mts:3295`, for the **officer** and about **DSAR rows** (`3.3`)
  — not the holder, not a house bet row. It is **not** in §11.247's reader list either. So the feed door — the
  reader the register row names by name — is unasserted, and a change to `getOwnActivity` alone reddens nothing.
- **Verdict (a)** for the service layer. ⛔ **Its SERVED half stays NOT MEASURED** and keeps its existing home,
  `DEFERRED-TESTS.md` row 79 (the served layer: no fresh build was spent, and port 3021 is held by the visual sweep).
- **Where it ships:** `scripts/dsar-export-secrets.test.mts` §6, as the THIRD door on the fixture that is already
  built there. POSITIVE control: the row is PRESENT and keeps the holder's own money facts (stake, side, market) —
  an absence proved over a feed with no bet row in it is the empty-population failure. PLANTED: `6.CONTROL` already
  proves the durable row carries both keys, so the absence is a measurement the moment the door is opened.

### a4 · HB-LC-11 · four lifecycle emitters the byte-identical proof never reached

- **Row:** superseded by D19 — a notice about a house-marked position is built *"by the same call with the same
  arguments as any player's"*, selection-closed is one notice per player summing every open position. *"Coverage
  gate: counts in its regression form — byte-identical notices with no label."*
- **Measured, and most of it IS asserted:** `test:house-bot-money` §8 covers WIN (`8.1`–`8.3`, body byte for byte and
  the LINK as well as the words), LOSS (`8.4`, control), SELECTION_CLOSED (`8.5`–`8.8`: ONE notice naming both
  figures, both-sides title, and a non-holder control) and VERDICT (`8.9`–`8.13`, including a same-sentence equality
  against a player).
- **The gap is the rest of the row's own emitter list:** market **cancelled**, the **one-sided refund** notice, the
  **orphan refund** notice and the **Up & Down** rows/digest. `5.6` and `10.1` assert the house MARKER on the refund
  transaction — a different claim from the NOTICE text — and `10.c1` is a marker control, not a copy control.
- **Verdict (a).**
- **Where it ships:** `scripts/lib/house-bot-money-cases.mts` §8, same fixture shape. ⚠️ Check the Up & Down half
  against `test:updown-digest` first: if the digest row is already proved there, name it rather than writing a
  second one. POSITIVE control on every emitter: a non-holder player on the SAME market gets the same sentence —
  and assert the rows EXIST before asserting what they do not contain.

### a5 · CRA-12 and a6 · FS-05 · R4's surviving rule is a sentence, and nothing guards it

- **Rows:** both superseded by D20. `04-amendments.md` R4 strikes the `excludeHouse` option, `NON_HOUSE_POSITION_SQL`,
  the reward walker, the source pin **and both of its Test lines**, in place. What it leaves standing, verbatim:
  *"A COMPLIANCE and HOUSE-BOTS.md rule: no prize, cashback, tournament or rank reward may be computed on marked
  positions."* The D6 half — the bot stays on the public board — is **already asserted**: `test:house-bot-reports`
  `11.247.c4` (*"the holder is there as an ORDINARY PLAYER: the leaderboard row is the account's, with no marker and
  no house key on it"*), with `11.247.c3` proving that sweep non-vacuous.
- **Measured:** both sentences exist (`docs/HOUSE-BOTS.md:851`, `docs/COMPLIANCE-DECISIONS.md:342`) and **no test
  reads them.** The only assertion that opens `docs/HOUSE-BOTS.md` is `0.L52.4`, which reads rate-bucket keys and
  says so: *"SCOPE, NAMED: this doc only… a guard's scope is part of its claim."*
- **Verdict (a) for both**, closed by the ONE guard of finding F-2 — two rows, one test, and the test says in its
  own label that it proves the RULE IS RECORDED and not that any code obeys it.
- **Where it ships:** `scripts/lib/house-bot-reports-cases.mts`. PLANTED: the sentence deleted from a copy of each
  document **must** be reported (and the two documents are checked separately — one assertion over both would pass
  while either was empty, which is `test:dsar-secrets` §6's own recorded lesson). POSITIVE: the untouched documents
  report nothing.

### a7 · CRA-19 · the FIU suspicious-activity report has no test at all

- **Row:** superseded by D20 — no Context column (C5-SPEC ruling 228). **Standing:** *"The rows are included
  unchanged (statutory), and the two-officer AML release is unchanged. Admins get the F7 alert."*
- **Measured:** `buildFiuSar` (`src/lib/server/reports/catalogue.ts:225`) is named by **no** file under `scripts/`
  — `grep -rn "buildFiuSar" scripts/` → 0. `test:report-formats` mentions the string "FIU" only to forbid a false
  format claim on a button. The F7 half (PLAN `F7 Holder money events` — a deposit credited or an AML hold gives an
  admin bell + email and appends a `HouseBotEvent`) ships as `OWNER_MONEY` (`src/lib/server/house-bot/money-hook.ts:43`)
  and IS asserted — `test:house-bot-comms` `6.2` (*two identical holder-money events give TWO rows*, i.e. the
  emitter deliberately never dedupes). So only the SAR half is owed.
- **Why it matters and why it is not merely bookkeeping:** the failure this guards is a later session "helpfully"
  excluding a designated house account from a **statutory** report. Nothing would report that today.
- **Verdict (a).**
- **Where it ships:** `scripts/lib/house-bot-reports-cases.mts` (both stores). Use the §7 TWIN shape, which this lane
  already trusts: a holder with a 1.2M deposit and an identical non-holder with the same deposit produce the SAME
  row shape; assert the row is PRESENT (population non-zero) and that the report carries no Context column and no
  house word. POSITIVE control: a deposit BELOW `AML_REVIEW_THRESHOLD_TZS` is absent — otherwise "the row is there"
  would pass over a builder that returns everything.

### a8 · CRA-32 · the finance figures that must INCLUDE house rows

- **Row:** superseded by D20 — `/admin/finance` counts a house account in active players and the Top-10 like any
  player's and gains no house tile (C5-SPEC rulings 224–225). **Standing:** GGR, NGR and wallet liability **include**
  house rows; *"Held for unverified"* includes an unapproved holder's winnings.
- **Measured:** no house-bot suite imports `src/lib/server/analytics.ts` at all (`grep -rln "server/analytics" scripts/`
  names seven files, none of them a house suite). PROGRESS L34 records the D20 reading as correct; nothing asserts it.
- **Verdict (a).** These are INCLUSION claims — the dangerous kind, because the plausible future defect is a filter
  added for tidiness that quietly understates a regulator-facing liability.
- **Where it ships:** `scripts/lib/house-bot-reports-cases.mts` (both stores), over `activePlayers`,
  `walletLiabilityByStatus` and the unverified-liability basis. POSITIVE/PLANTED pair: the figures move by exactly
  the house fixture's amount when it is added (a before/after delta, not a bare "greater than zero"), and a planted
  `houseBotId IS NULL` filter over the same fixture must be REPORTED as a shortfall.

---

## (b) NEEDS RECONCILING — seven

### b1 · HB-ACC-07 · (b1 WITHDRAWN) — ⛔ RECONCILE, DO NOT TEST

- The row's `Test:` names **`test:password-change-revokes-sessions`**. Measured: `package.json` has no such key.
- `04-amendments.md` **A1 · RECORD ONLY · "Signing out other devices on a password change is not built"**,
  *Merged: HB-ACC-07*, owner ruling 2026-09-13 (owner default W5). Writing that suite would build and assert a
  feature the owner **decided against**.
- **Ruling that settles it:** A1. **Row action:** strike the suite name in place; replace the Expected with A1's own
  words; point the row at the recorded risk line.
- ⚠️ **And the tail (finding F-1):** A1's claimed proof — *"`test:docs` greps the risk line"* — is false as measured.
  The reconcile is not finished until the risk line is pinned by the F-2 guard. That is an obligation on the docs
  guard, **not** a reason to write the withdrawn sessions test.

### b2 · HB-ACC-08 · (b1 WITHDRAWN + b2 MIS-ROUTED)

- The row asks for `AUTO_PAUSED(HOLDER_CONFLICT)`, the bot skipping that market, and Start requiring a written
  reason. `04-amendments.md` **A21** (*Merged: HB-ACC-08, HB-LC-28, HB-ACC-09*) rules the opposite in one line:
  ***"Never refuse the bet and never pause the bot."*** `04-amendments.md:92` records it again — *"HB-ACC-08, pause
  or refuse options: the owner ruled alert only (A21)."* The stricter refusal copy is struck by D19 on the row
  itself. Measured: **`HOLDER_CONFLICT` appears nowhere in `src/` or `scripts/`** — only in the register row that
  asks for it.
- The row's `Test:` says only *"Engine or seam suite:"* — it names neither, which is why the gate cannot resolve it.
- **The alert-only behaviour ships and is asserted:** `test:house-bot-engine` `18.30` (fixture), `18.31` (ONE alert
  keyed `holder-against:<bot>:<market>`, aggregates only, no user id in the payload), `18.32` (ONE
  `HOLDER_AGAINST_BOT` event), `18.33` (I3 — the holder's own stake is never a trigger), `18.34` (same side →
  nothing), `18.35` (a second pass writes nothing more), `18.36` (it runs whatever the switch says), `18.78` (the
  LIVE hook on Up & Down). Code: `src/lib/server/house-bot/trigger.ts:303-321`.
- **Row action:** strike the pause/refusal Expected under A21; name `test:house-bot-engine` with those ids.

### b3 · HB-ACC-15 · (b2 MIS-ROUTED)

- The row's `Test:` describes a test without naming one: *"That pin, plus a red fixture file that writes
  `phoneE164` without the hook, which must fail."*
- **The pin it describes IS the shipped one.** `04-amendments.md` A2 merges HB-ACC-15, and
  `test:house-bot-holder-lifecycle` §1 is exactly it: `WRITTEN_FIELDS` includes `phoneE164`
  (`scripts/house-bot-holder-lifecycle.test.mts:53`), `1.1` fails on any unhooked writer of it, `1.2` holds the
  population shrink-only at 33, `1.3` proves the hook is wired at a real population (>= 18 sites), `1.4` requires
  every exemption to carry a reason, and §4 plants both halves (`4.1` unhooked → reported, `4.2` hooked → passes,
  `4.5` an irrelevant field → not a writer). The suite carries its own floor (`MIN_ASSERTIONS = 16`).
- **Row action:** name `test:house-bot-holder-lifecycle` §1/§4 on the row.
- ⚠️ **One honest residue, and it is a control gap, not a missing test:** §4's planted writer is a `status` write.
  A plant on `phoneE164` specifically would prove that entry of `WRITTEN_FIELDS` is live rather than merely present
  in an array literal. Worth one line when §4 is next touched; it does not change this verdict and must not be sold
  as lowering 3.4.

### b4 · HB-ACC-22 · (b1 WITHDRAWN + b2 MIS-ROUTED) — and the "ghost" is a naming slip

- The row's `Test:` names **`test:rg-limit-race`**, which `package.json` does not declare. ⭐ **But the suite exists
  under a different key:** `test:rg-race` → `tsx scripts/rg-limit-race.test.mts`. The row named the FILE stem, not
  the npm key. That is a pointer to correct, not a suite to write.
- The house-wording half of both the refusal and the limits meter is struck by D19 on the row.
- **The live behaviour is asserted four ways:** `test:house-bot-money` `12.0` (fixture: the limit is in force NOW),
  `12.1` (a HOUSE stake over the holder's OWN daily loss limit is REFUSED with `loss_limit_daily`), `12.1b` (the
  refusal moved nothing), `12.2` (⭐ POSITIVE CONTROL — a stake that FITS still lands); `test:house-bot-engine`
  19.A **row 8** (`LOSS_LIMIT_SET` → `AUTO_PAUSED(OWNER_LOSS_LIMIT)`, `botStopped`, one `AUTO_PAUSED` event, driven
  through the hook AND through the sweep with no hook at all); `test:house-bot-designation` `3.16`/`3.16b` (Start
  blocked and refused with the cause); `test:house-bot-rules` (`canStart` false while the cause stands).
- **Row action:** correct `test:rg-limit-race` → `test:rg-race`; name the four suites above.

### b5 · HB-ACC-26 · (b1 WITHDRAWN) — ⛔ its Test line asserts the SILENCING that X4 exists to prevent

- The row asks for *"at most one admin bell per bot per day"* on an AlertOnce key
  `bot:<id>:PASSWORD_CHANGED:<EAT day>`, and its Test says *"3 changes → 1 transition, 3 events, 1 bell."*
- `02-sealed-flows.md` **X4** is that exact key, rejected in its own words: *"The alert-once key
  `bot:<id>:<code>:<EAT day>` **would silence a second password change on the same day**. → Key password alerts as
  `pw:<botId>:<newFingerprint>`."* `02 §2.2`'s row 93 says *"A1 again (new key per X4)"*. Shipped at
  `src/lib/house-bot/constants.ts:657` — `password: (botId, fingerprint) => ...` keyed on the FINGERPRINT, not the
  day — used at `holder-hook.ts:146`. **Three changes are three fingerprints and
  therefore three bells.** Writing this row's Test would assert a silenced security alert.
- `04-amendments.md:63` routes the row: *"HB-ACC-26: seal-flows X4 plus the §2.6 step 7 mismatch check."*
- **Everything else on the row is asserted:** `test:house-bot-engine` `19.C1`/`19.C1b` (one CREDENTIAL_CHANGED, its
  SECURITY audit), `19.C2` (the same change again → nothing, the `pw:<botId>:<fingerprint>` claim), `19.C3` (**X4**:
  changed again → alerts again, second record), `19.C4` (officer temp on a suspended holder), `19.C5` (**one
  transition**: two hooks and a sweep racing → ONE A1, ONE `AUTO_PAUSED`, never an A2), `19.C9`–`19.C9c` (a failed
  send is paid once and never twice); and *"no bet ever fires on stale consent"* by
  `test:house-bot-designation` `6.4` with its planted control `6.2b`.
- **Row action:** strike the per-day bell and its Test line under X4; name the 19.C ids and `6.2b`/`6.4`.

### b6 · HB-ACC-31 · (b2 MIS-ROUTED)

- The row names no suite (*"5 bad logins → the bot still fires, one admin bell, verify refused with
  retryAfterSec"*). `04-amendments.md` A2 merges HB-ACC-31.
- **Asserted:** `test:house-bot-engine` `19.D1` — A2 row 16, driven twice through the hook: *a lockout never stops a
  bot, ONE SECURITY bell for the EAT day carrying when the lockout ends, no status change, no event* (and the
  `until` is compared to the fixture's own instant, not merely present). `test:house-bot-designation` `1.10`
  (`BLOCKED{SIGN_IN_LOCKED}`, uncounted), `3.13` (in designate and reverify), `3.13b` (⭐ in **start** it is a
  WARNING, not a block — the bot continues, which is the row's whole point), and `1.8` for the `retryAfterSec` the
  row asks for on a rate-limited verify. Code: `holder-hook.ts:315-317`, `eligibility.ts:136`/`:401`,
  `designation.ts:158` (`retryAfterSec` derived from `lockedUntil` on `SIGN_IN_LOCKED`).
- **Row action:** name `test:house-bot-engine` `19.D1` and `test:house-bot-designation` `1.10`/`3.13`/`3.13b`.

### b7 · HB-LC-20 · (b1 WITHDRAWN) — and the row's own "waits on Commit 7" line is now STALE

- Three of its four halves are already withdrawn: the three-bucket exposure split (D20, C5-SPEC ruling 254 — and
  `04-amendments.md:69` goes further: *"R2 is struck, so no amendment covers these ids"*), the console reading
  objection counts (struck in place on the row), and the label half.
- The fourth — *"CAP_EXPOSURE skips show why: 'Skipped — TZS 20,000 is held…'"* — is what the row says *"waits on
  Commit 7's ruling"*. **That ruling has landed and decided against it:** C7 step 7 **ruling 370**, *"THE KILL
  SWITCH SHOWS NO HELD AMOUNT… 254 proposed putting the amount still at risk into `CAP_EXPOSURE`'s sentence, and 370
  decides it NOT KEPT"*, with the cost recorded (a figure behind a refusal must be STORED on the intent or its
  audit — the per-decision money record **D20 struck** — or re-derived at render time, which the display-only law
  forbids). Shipped: `CAP_EXPOSURE: "{bot}'s open exposure limit was reached"`
  (`src/lib/house-bot/feed-copy.ts:61`) — no amount. **Pinned:** `test:house-bot-console` `1.370` — not one
  `EngineCode` sentence and not one switch-off sentence carries a formatted amount or an amount placeholder, with
  the capture proved complete against the block's own key count and a CONTROL that a TEMPLATE-form amount **is**
  reported.
- The surviving I2 half (*the engine never reads objection state*) is a statement about code the engine does not
  contain: `grep -rn "objection" src/lib/server/house-bot/*.ts` finds only audit ACTION NAMES in
  `decision-audits.ts` and `oversight.ts`, both of which are classified audit readers in
  `AUDIT_READERS_OUTSIDE_CONSOLE`, neither on the decision path. The nearest live pin is
  `test:house-bot-info-edge` `3.2` (`decide.ts` never imports `blackout.ts`; the blackout arrives as an injected
  boolean).
- **Row action:** replace *"waits on Commit 7's ruling"* with ruling 370 and name `test:house-bot-console` `1.370`.
  ⛔ Writing the held-amount test would assert a requirement two rulings have now refused.

---

## (c) CANNOT BE MEASURED HERE — three, each with the reason named

### c1 · ENG-19 · NOT MEASURED — a timed load run needs an uncontended database

- **What is already done:** PROGRESS **L5** records the EXPLAIN half as ✅ (eighth session, ruling 161) —
  `triggerPage` and A24's reads EXPLAINed at **1,000,046 positions**, no Seq Scan on `Position`.
- **What is left:** the row's Expected is a **budget** — 50 bets/s with the switch ON and 5 ACTIVE bots, sweep p95
  under 200 ms, extra queries per bet <= 1 write, admission p95 within 10% of an engine-off control. L5 says it in
  the same words: *"The load run (a timed sweep at 1M, ENG-19) is still NOT MEASURED."*
- **Reason it cannot be measured in this lane, named:** a p95 is a claim about contention. The scratch Postgres
  cluster is **shared by three lanes right now** (this one, the Commit-5 close and the visual sweep, which is also
  seeding scratch databases), so any latency measured here measures the neighbours and not the product — and a
  number produced under those conditions would be worse than no number, because it would be recorded. Running a
  1M-row load generator concurrently with two other lanes is additionally the machine hazard this programme already
  has written down.
- **NOT MEASURED. Owner: REL-0's load window, on a quiet cluster, with the engine-off control run back to back.**

### c2 · CA-18 · NOT MEASURED — the fix is NOT BUILT, and no ruling has settled it

- **The row's Evidence is still exactly true of the tree.** `src/components/ui/refresh-poller.tsx:48` —
  `if (document.visibilityState === "hidden") return;` — skips hidden ticks and the component adds **no**
  `visibilitychange` listener; `grep -rn "visibilitychange" src/` returns 28 lines across the player-side components
  (the chart, the needle, the notifications panel, session presence, the notify poller) and **not one is under
  `src/app/admin/` or in the desk strip**. `src/app/admin/desk/desk-live.tsx` (74 lines, the whole strip) mounts one
  `RefreshPoller` on `LIVE_ROUND_MS` and renders **no** *"Updated {HH:MM:SS} EAT"* stamp.
- **Its owning amendment C11** (*Merged: CA-04, CA-18, CA-23, CA-31…*) asks for the tab-return re-read and the
  stamp. **C7 ruling 316** built the poller and settled the cadence — and it neither built nor struck CA-18's
  tab-return re-read; it records only that a strip live on the 20 s interval *"is not a failure"*.
- **Reason, named: there is no shipped behaviour to assert.** A test written today would assert absent behaviour and
  be red on purpose, and asserting the CURRENT contract instead would pin the defect. ⛔ This is neither (a) nor
  (b): it is an **open Commit-7 debt that needs a build or an owner ruling**, and recording it as "deferred with a
  reason" is the exact move assertion 3.4 exists to refuse — so it stays inside the 18 until one or the other lands.

### c3 · CA-31 · NOT MEASURED — the fix is NOT BUILT, same class as CA-18

- **Measured:** `src/components/admin/action-overlay.tsx` (184 lines) has no timed sub-label and no 45 s card —
  `grep -n "Still working|slow connection|Check now"` over it and over `src/lib/client/run-admin-action.ts` → **0**.
  `run-admin-action.ts:32` still returns the one generic sentence *"Server error — nothing may have applied.
  Refresh before retrying."*, exactly as the row's Evidence says. The reconciliation the row describes reads back
  through `getHouseBotStatusAction`, which **does not exist** (`grep -rn "getHouseBotStatusAction" src/ scripts/`
  → 0), so its foundation is missing too.
- **Owning amendment:** C11 again; no C5 or C7 ruling names CA-31 (`grep` over `C7-SPEC.md`, `C5-SPEC.md`,
  `C5-D20-REPLAN.md` for *"Still working" / "Check now" / CA-31* → 0).
- **Reason, named: not built, and not decided.** Same disposition as CA-18 — it needs a build or a ruling, not a
  test, and it stays inside the 18 until one arrives.

---

## What this judgement does to assertion 3.4

⛔ **This section is the JUDGEMENT phase's forecast, kept as written so it can be checked against what actually happened — the measured outcome is the section AFTER it.** The judgement phase wrote no test, so at the time of writing the ceiling stayed at 18. What it changes
is what the next phase is allowed to do:

| verdict | ids | effect when the next phase acts |
|---|---|---|
| (a) | ENG-42, HB-ACC-16, HB-ACC-14, HB-LC-11, CRA-12, FS-05, CRA-19, CRA-32 | **8** real tests; 3.4's ceiling falls to **10**, one per test, in the same commit as each |
| (b) | HB-ACC-07, HB-ACC-08, HB-ACC-15, HB-ACC-22, HB-ACC-26, HB-ACC-31, HB-LC-20 | **7** row corrections. They leave the no-test population through the OWNED/NAMED door — legitimate only because the assertion ids above were read today. ⛔ Each reconcile commit must quote them, so the claim can be refuted |
| (c) | ENG-19, CA-18, CA-31 | **3** stay NOT MEASURED with the reason recorded. CA-18 and CA-31 need a BUILD or an owner ruling — not a deferral note |

⭐ **The claim this file supports is: 18 accounted for, 8 testable here, 7 already answered, 3 not measurable — not
that 18 tests are owed.** Six of the eighteen (HB-ACC-08, -15, -22, -26, -31, HB-LC-20) would have had a test
written **against a withdrawn or inverted requirement** if the eighteen had been worked as one backlog, and two of
those (HB-ACC-26's per-day bell, HB-LC-20's held amount) would have asserted the exact defect their own sealed-flow
ruling exists to prevent.

---

## The outcome — measured 2026-09-20, after the work was done

> **Everything below was RE-DERIVED by running the gate, not carried forward from the table above.**
> `scripts/scenario-coverage.test.mts` lives on **`ops-lane`**, not on this branch. It was run from this
> worktree against THIS tree (a read-only measurement: the file was placed untracked, run, and removed).

### What the gate now reads over this tree

```
NAMED 26 · STRUCK 9 · OWNED 243 · DEFERRED 0 · UNRESOLVED 3 = 281
⭐ COVERAGE 269 / 281 = 95.7%   (NAMED + OWNED)
3.4 · rows with NO TEST AT ALL: 3 — ENG-19, CA-18, CA-31
```

⚠️ **`3.3` reads RED from this branch and that is an artefact of the split, not a defect.** ENG-19, CA-18 and
CA-31 are named with their reason in **`ops-lane`'s** `DEFERRED-TESTS.md` row 104, which this branch's copy of
that file does not carry (the two copies have diverged by 182 lines). Merged, those three resolve through the
DEFERRED door: `UNRESOLVED 0`, `DEFERRED 3`, and `3.4` reads **3** either way. ⛔ This lane deliberately did
**not** add a section to its own `DEFERRED-TESTS.md`: `ops-lane` already holds §1l, §1m and row ids 99–105, and
a second §1l with ids 94–96 would have collided on both — duplicate ids across the register is the exact decay
`test:deferred-register` §1 exists to catch.

### The two counts, kept apart

| | rows | what changed |
|---|---|---|
| **TESTED** — a real test, planted control, positive control, seen red | **8** | ENG-42, HB-ACC-14, HB-ACC-16, HB-LC-11, CRA-12, FS-05, CRA-19, CRA-32 |
| **RECONCILED** — accounted for, **not** tested | **7** | HB-ACC-07, HB-ACC-08, HB-ACC-15, HB-ACC-22, HB-ACC-26, HB-ACC-31, HB-LC-20 |
| **NOT MEASURED** — reason named, still owed | **3** | ENG-19, CA-18, CA-31 |

⛔ **CRA-12 and FS-05 are two rows closed by ONE test, counted ONCE as one test and two rows.** The eight rows
gained seven distinct tests; the ceiling moves on rows, which is what 3.4 counts.

### The edit assertion 3.4 needs, and it is NOT this lane's to make

`scripts/scenario-coverage.test.mts` is `ops-lane`'s file. The edit it needs:

```diff
-const NO_TEST_CEILING = 18;
+const NO_TEST_CEILING = 10;
```

⛔ **10, not 3, and the difference is the whole point of keeping the counts apart.** 18 − 8 = 10: the ceiling
moves ONLY for a row that gained a real test. The seven reconciled rows left the no-test population through the
OWNED door — legitimately, because each one's assertion ids were read in the tree first and are quoted on the
row — but a reconcile is prose, and prose must never buy ceiling headroom. That is the exact failure the ops
lane caught itself committing within an hour of writing this gate.

⭐ **The measured value is 3, so a ceiling of 10 is loose by 7.** Tightening it to 3 is a second, deliberate act
and belongs to whoever verifies the seven reconciles — assertion `4.2` of `test:red-anchors` states the reason
in its own words: *"a ceiling above the real count stops being a ratchet."* Recorded here so the slack is
visible rather than discovered later as drift.

### The findings this phase turned up that were not in the judgement

1. **F-1 is repaired.** A1's claimed proof (*"`test:docs` greps the risk line"*) did not exist. The risk line is
   now pinned per document at `test:house-bot-reports` `12.risk-7.hb` / `12.risk-7.cd`.
2. **HB-ACC-16's row is wrong in two places, and the test asserts the product instead.** (i) No shipped writer
   can refresh `HouseBot.passwordFingerprint` while the bot is ACTIVE — `setVerified` is PAUSED-only — so the
   row's "in the same transaction" contract has no implementation to assert. (ii) A rehash's pause reports
   method **UNKNOWN**, never REHASH, because `CREDENTIAL_CHANGED_VIA` deliberately excludes it. The first draft
   of `19.J1` asserted the ROW and went red; `19.J1b`/`19.J1c` now pin the shipped distinction both ways.
3. **`test:house-bot-reports` was RED on this branch before this phase**, and had been pushed that way: `0.505`
   reported `dal-mem`, `dal-pg` and `rules` declared in this lane's own anchors files and audited by no
   roll-call. `rules` now has one (`house-bot-rules` `7.505`); the two DAL keys cannot have one in that form and
   are recorded as OWED naming the site that can carry them.
4. **HB-LC-11's Up & Down half was already proved** at `test:house-bot-reports` `9.235.2` and is NAMED rather
   than written twice. `test:updown-digest` was read first: 0 hits for house bots.
5. **Still not asserted, and written on the row rather than implied:** the per-ROUND Up & Down emitters
   (`notifyUpDownWin` / `Loss` / `Refund` / `OneSidedRefund`) for a holder; and `test:house-bot-holder-lifecycle`
   §4 plants a `status` writer, not a `phoneE164` one (a control gap on HB-ACC-15, which moves no ceiling).
