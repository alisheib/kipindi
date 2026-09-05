# 50pick — Compliance Decisions Log

> Deliberate, owner-authorised decisions that touch a compliance control. Each is
> recorded so a future audit/session understands it was intentional and does NOT
> silently "restore" a prior behaviour. Newest first.

---

## 2026-09-05 · Identity verification precedes DEPOSITING, PLAYING and WITHDRAWING

**Ruling:** the owner (Ali), **2026-09-05**, relaying management's decision. In his words:

> *"He cannot deposit nor withdraw nor play until KYC is verified. He registers and starts
> pending, he can walk around in the platform until we verify him; he receives his notification
> and congrats, his state gets updated, then he can freely deposit and withdraw."*

The ladder is now **register free → verify identity → everything**.

### ⛔ One third of this reverses a Board instruction, and it is disclosed, not slipped in

The 2026-08-20 entry below records the Gaming Board's comment #1: identity must stop being a
precondition of **withdrawal**. That instruction said nothing about money coming *in* or about
staking — §9.4 of [`BOARD-DISCLOSURE-B-E.md`](BOARD-DISCLOSURE-B-E.md) records deposits being
left unbound for an unrelated reason (destination binding). So:

- **deposit and betting gates** are new policy and contradict nothing the Board said;
- **the withdrawal gate** is a deliberate reversal, taken by the owner as a control **stricter**
  than the regulator required. It was raised with him explicitly before implementation, and he
  reaffirmed it. A fresh disclosure goes to the Board — see
  [`BOARD-DISCLOSURE-KYC-FIRST.md`](BOARD-DISCLOSURE-KYC-FIRST.md).

⛔ **Do not "restore" either behaviour by reading the older entry.** Both are below, in order.

### The rule, and the one asymmetry that keeps money safe

| Action | Question asked | Why |
|---|---|---|
| Deposit | `status === "APPROVED"` | adds NEW exposure — stop it the moment a doubt appears |
| Bet | `status === "APPROVED"` | same |
| **Withdraw** | **`approvedAt != null`** — *ever* approved | taking out what you already hold is a different question |

🔴 **The asymmetry is the whole money-safety story.** `forceReverifyKyc` moves an APPROVED player
to `ADDITIONAL_INFO_REQUIRED`, and that player **holds real money earned under an identity we
accepted**. Gating their payout on current status would freeze it — precisely the harm
`BOARD-DISCLOSURE-B-E.md` §6 named when it recorded that force-reverify had stopped being a money
control. The same column covers the race where a deposit authorised while approved has its Selcom
callback land after a rejection. `approvedAt` is set once and **never cleared** — not on
force-reverify, not on rejection, not on `startKyc`'s reset of a REJECTED submission.

### Never gated

Cash-out, settlement, refunds, and every deposit-completion path (webhook, return leg, fast-credit
lane, reconcile sweep). Money already in a wallet is the player's; a deposit already authorised has
already been paid for. Refusing there takes a player's money and gives them nothing.

### Bonuses are HELD, not cancelled

`invite-service.bindRegistration` and `affiliate-service.payBonus` credit a brand-new account's
**bonus wallet during registration itself**, and bonus money is stakeable — so "no money until we
validate" was false on the one path nobody looks at. Grants now land in `PENDING_KYC`: nothing
enters `bonusBalance`, and the **expiry clock is stopped** (the date is shifted forward at release
by the hold's duration, because the delay is ours). `releaseKycHeldGrants()` runs from `reviewKyc`'s
APPROVE branch, so the money arrives with the congratulations.

### Email confirmation stays, and runs INDEPENDENTLY

Ali, same date: *"keep both, but he can confirm email before or after, order doesn't matter."*
Depositing requires both; the deposit screen shows them as a two-item checklist so a player waiting
on our review queue can clear their inbox meanwhile. The server asks **RG lockout → identity →
email**, and the screen renders in that same order.

⚠️ **Fixing an ordering defect found on the way:** the email gate sat *above* the responsible-gambling
lockout while its own comment claimed it sat below, so a self-excluded player with an unconfirmed
address was sent off on an email errand. A protective control the player set for their own safety
now outranks both trust-ladder doors. `test:deposit-gate` §C4 drives it.

### Cut-over

Ali's ruling: **production is emptied the day before go-live**, so there is no legacy population.
⛔ The migration backfills `approvedAt` from `reviewedAt` anyway — "there are no APPROVED rows" is
true right up until that reset slips, and without the backfill every already-verified player would
wake unable to withdraw.

**Code:** `src/lib/server/kyc-gate.ts` (the seam) · `wallet-service.deposit()/withdraw()` ·
`market-service.buyPositionInner()` · `bonus-service.creditBonus()/releaseKycHeldGrants()` ·
`prisma/migrations/20260905120000_kyc_approved_at` + `…130000_bonus_pending_kyc`.
**Tests:** `test:kyc-gate` (58) + `red:kyc-gate` (6/6, each on its own assertion) ·
`test:deposit-gate` §C · `test:kyc-approved-copy` §5 (inverted a second time) ·
`test:failure-reasons` §8c.
---

## 2026-09-05 · THE OBJECTION WINDOW IS ONE HOUR (rulings ③ and ④)

**Ruling:** management, relayed by Ali on **2026-09-05**. The post-settlement objection window
falls from **24 hours to 1**, to shorten payout cycles. Follows the entry below, which shipped
the two controls that had to exist first.

⛔ **DO NOT "RESTORE" 24.** It is not a default that drifted. Every statement of 24 hours in this
repository that is not a dated record is superseded by this entry.

### What the window IS, and why shortening it is a compliance act and not a setting change

This log cites the objection window in two places as the **compensating control** that makes
another decision acceptable: for **single-admin resolution** (one officer may seal alone) and for
**AI auto-resolve** (no officer reads the verdict at all). Both citations rest on a player being
able to reach the dispute before the money moves. Shortening the window shortens that reach —
**including overnight**, and including for verdicts no human ever read.

That is why the two controls in the entry below shipped **first**: until 2026-09-05 the platform
told a bettor nothing when a verdict was recorded, and the specification's "dispute raised by an
authorized admin" had no mechanism at all. A one-hour window without those would have been a
control the platform describes and does not have.

### Ruling ③ — AI auto-resolve continues, and Ali accepts what that means at one hour

Production was measured running `resolutionMode: auto` (threshold 90) on 2026-08-28. Under it an
AI seals a verdict unattended and, with a one-hour window, **real money is paid about an hour
after the event, at any hour of the day or night, unless a stakeholder objects inside that hour.**

Ali was given the three options — keep auto, pause auto while the window is short, or push seals
into business hours with `resolveOffsetMinutes` — and **chose to keep auto**. Recorded here in
those words so that nobody later reads the combination as an oversight. The live
`resolutionMode`, `resolveConfidenceThreshold` and `resolveOffsetMinutes` are read from
production and recorded at the moment of the flip.

### Ruling ④ — Terms §6's void ground narrows with it, and the Terms version is bumped

⚠️ **§6 IS NOT THE OBJECTION WINDOW, AND CONFLATING THE TWO WAS THE MISTAKE THIS RULING FIXES.**
It is a **void ground**: a bet may be voided where *"the result is corrected by the source
authority within 24 hours of resolution."* It was written as a flat 24 while the window happened
to be 24, so the two read as one rule.

🔴 **The platform cannot keep the 24-hour form once the window is shorter.** After `settledAt` is
stamped the money is in players' wallets: `emergencyVoidMarket` refuses a settled market and
`objectionEligibility` returns `ALREADY_SETTLED` by design. A correction arriving at hour two
could not be honoured. **A public promise the code refuses is worse than a shorter one it keeps**,
so §6 now tracks the window in force, in all three languages, and the binding English text's
version moved from **2026-04-01 to 2026-09-05**.

⛔ The other three "24 hours" in that document are the **AML review hold** on large withdrawals.
Unrelated, unchanged, and they stay 24.

### The mechanics, stated so they are not rediscovered

- **The code default is not the live value.** Production runs a persisted snapshot that
  `ensureHydrated` merges OVER the defaults. Changing the constant moves nothing; the flip is an
  audited act through the FINANCE officer's own `/admin/config` screen, bracketed by
  `market-config-diff.cjs` proving exactly one field moved.
- ⛔ **No `CONFIG_VERSION` reconcile rule was added, deliberately.** The forward-migration path
  exists and was used twice before for stake bounds — but it is **un-audited** and fires on a
  deploy. This is the control described to the regulator; it moves by a recorded human act.
  ⚠️ The consequence is that a snapshot restore would silently bring 24 back, which is why
  `market-config-diff.cjs` is the standing check rather than a one-time verification.
- ⚠️ **Config hydrates once per process and is never invalidated.** If more than one instance is
  running, the others keep the old value until restart, and seals there stamp the old window.
  Confirm a single instance, or restart after the flip.
- **It is not retroactive.** `objectionsClosedAt` is stamped at seal from the config then in
  force, so every market sealed before the flip keeps its 24-hour deadline. ⚠️ **Until an upheld
  objection with remedy `REVERSE` re-stamps it at the live value** — so "pre-flip markets keep
  24 h" holds only until an officer rules on one.
- **A minute-59 objection is honoured** (filing and settlement serialise on the same market lock)
  and freezes the pool **indefinitely** until an officer rules. There is no time limit on a freeze.
- **Payment follows the deadline, it does not coincide with it.** A refused settle backs off five
  minutes, a deploy adds a boot grace, and markets sealed together share one deadline and queue.
  Every player-facing surface says "Payout from", never "pays at".

### Where the number lived, and where it lives now

The sweep found the window stated as a literal in **nine dictionary strings across three
locales**, the **live chatbot's system prompt**, the legal terms in three languages, two admin
copy sites, three fallbacks on the FINANCE form itself, a production SQL fixture, and five
comments. It now lives in exactly one place — `objectionWindowHours` — and every surface
interpolates it.

🔴 **The worst of them was the chatbot's system prompt.** It is not in the dictionary, so no copy
scan could see it, and it said "24h objection window" as a flat fact. After the flip the
platform's own assistant would have gone on telling players the old number, on demand, about
their own money. `test:rate-copy` §3b now reads it, and `red:rate-copy` re-injects the literal
and requires the guard to catch it.

⚠️ **One admin sentence was false before the number was.** The resolver ceremony read *"Sealing
credits every winning wallet, closes every losing position, starts the 24-hour objection
window"* — and the first two clauses had been untrue since the window became a real gate.
Sealing pays nobody. Interpolating the hours into it would have preserved a false money
statement and made it look freshly checked, so the sentence was rewritten.

### The operator action, as performed

**Flipped on production 2026-09-05 ~17:10 UTC**, through `/admin/config`, by the audited server
action (`updateGlobalConfigAction` → `setGlobalConfig`, which writes a `config.global.updated`
audit row). `market-config-diff.cjs` snapshots either side prove **exactly one field moved**:

```
🔴 1 field(s) differ between "pre-1h-flip" and "post-1h-flip":
   global.objectionWindowHours:  24  ->  1
```

⚠️ **Performed as ADMIN, not FINANCE.** `requireStaff("accounting")` is the gate and FINANCE is
the role that owns it, but **the FINANCE QA persona is rejected on production** — a stale
credential, not an RBAC refusal — so the drill would not run at all. ADMIN holds every domain,
so the action's own gate was satisfied; the audit row names ADMIN. Recorded here rather than
left for a reader to infer a finance officer did it.

**Production settings as read at the moment of the flip** (ruling ③'s evidence, not a memory):

| | |
|---|---|
| `resolutionMode` | **`auto`** |
| `resolveConfidenceThreshold` | 90 |
| `resolveOffsetMinutes` | 0 |
| instances | **one** (uptime climbed monotonically across six probes) |

So ruling ③ is live and consequential exactly as it was put to Ali: an AI seals unattended and
the money follows about an hour later, at any hour.

**Verified on the live deploy, in all three languages**, by reading the value back from the
database and then reading the pages — never by looking for the literal "1":

- `/fairness` — *"A public objection window of 1 hour opens after resolution, and no money moves
  until it closes."* · *"Dirisha la pingamizi la saa 1 …"* · *"结算后开放1小时的公开异议窗口…"*
- `/legal/terms` §6 — *"within 1 hour of resolution, while the payout is still on hold"*, and the
  version reads **2026-09-05**.

⚠️ **NOT RETROACTIVE, AND OBSERVED TO BE SO.** Five long-form markets sealed before the flip were
read straight from the database and each still carries **`objectionsClosedAt − resolutionStage2At`
= 24.0 h**; they pay tomorrow on their original deadline. A post-flip long-form seal has not
happened yet, so the 1-hour stamp is proven by `test:settlement-gate` §7 (which derives the
stamped window from config rather than asserting a literal) and **is still owed as a live
observation** — the honest state, recorded rather than claimed.

### Proof

`test:rate-copy` **41/0** with the objection window matched **number-agnostically** (a guard that
banned "24" would go green the moment someone typed "1") and in **both word orders** — Swahili
puts the unit first, and the first draft caught English and Chinese while silently passing
Swahili. `red:rate-copy` **12/12**, including a mutation that restores the literal to the chat
prompt and one to the legal text. Five negative controls prove the unrelated 24-hour statements
(AML hold, email expiry, RG cooling-off, the range picker) do not trip it.

---

## 2026-09-05 · TWO NEW CONTROLS BEFORE THE OBJECTION WINDOW SHORTENS (rulings ① and ②)

Management asked for the post-settlement objection window to fall from **24 hours to 1 hour**.
That change is a SEPARATE, later entry — it is not made by this one. What is recorded here are
the two controls built FIRST, because shortening the window without them would have left the
platform describing a control it no longer had.

⛔ **Do not remove either of these on the grounds that "the window is the control".** The window
is the *time*; these two are what make it reachable and enforceable inside that time.

### The gap that prompted ruling ① — nobody was ever told a verdict had been recorded

Measured, not assumed. Sealing a market wrote the row, emitted an SSE `market:resolve` for pages
that happened to be open, and audited. It notified **nobody**. `alertWatchersSettled` fires
inside `settleMarket`, i.e. *after* the money has moved, and `notify-poller` announces from
`settledAt` rows only. So a bettor's first word of the result arrived together with the payout —
one instant after the only window in which an objection can change anything.

At 24 hours a player plausibly opened the app inside the window. At one hour most never will.
This log cites the objection window as the compensating control for **single-admin resolution**
and again for **AI auto-resolve**; both citations require that a player can actually reach it.

**Shipped:** `notifyVerdictRecorded` — a bell row and push to every holder of an open position,
at the moment a verdict is recorded, from all three seal sites: the human seal, the AI auto path,
and an upheld objection whose remedy is REVERSE.

⭐ **The REVERSE case was the worst of the three and had no message at all.** It flips the verdict
and re-opens a fresh window — deliberately, so the players it now goes against get the same right
the original side had — but the only notice it sent went to the *objector*, and it does not even
emit `market:resolve`. The side that had just lost learned nothing. The notice now says "Result
corrected" there, so a player who received the first one can tell the second apart.

⛔ **It states a TIME, never a number of hours** — read from that market's own
`objectionsClosedAt`. A "you have 1 hour" phrasing would be a second definition of
`objectionWindowHours` living inside a notification, and it would be wrong for every market
sealed before the window changed, because those keep their original deadline.

⛔ **And it never promises an instant.** "Payout from HH:MM" is a LOWER bound. The settle timer
fires at that second, but a refused settle backs off five minutes, a deploy adds a boot grace,
and markets sealed together share one deadline and queue behind the fire gate.

### The gap that prompted ruling ② — the spec described an admin dispute that did not exist

The management specification says settlement locks in *"unless an official dispute is raised by
an authorized admin"*. **There was no such act.** The only thing that freezes `settleMarket` is
an OPEN objection row, and filing one required a POSITION in the market (`NO_POSITION`). An
officer who could see that a verdict was wrong, but held no stake in it, could not stop the
payout. Their only instrument was `emergencyVoidMarket`: refund the entire market, right or
wrong. There was nothing between "do nothing" and "unwind everything".

**Shipped:** `holdSettlementAsOfficer`, surfaced as **Hold payout** on `/admin/settlement`.

⭐ **It reuses the existing freeze rather than inventing one.** It writes exactly the row
`countOpenObjections` already counts and `settleMarket` already refuses on, so this platform
still has ONE settlement freeze with one definition — not a second column the money path would
have to learn about. No schema change, and every existing proof of the freeze covers this too.

⭐ **Separation of duties is inherited, not re-implemented.** The row's `userId` is the officer
who raised it, and both rulings already refuse when the filer is the ruler. So **an officer who
freezes a market structurally cannot be the one who releases it** — a second officer must. The
confirm dialog says so before the act, not after it.

⛔ **Two deliberate differences from a player objection, both widening, both recorded here so
neither is "corrected" later:**
1. **No stake required** — the whole point.
2. **No window check.** A player may not object after `objectionsClosedAt`; an officer may hold
   right up to the instant the money actually moves. The settle timer can lag its own deadline
   (a five-minute back-off, a boot grace, a queued burst), and in that gap an officer who spots
   a wrong verdict must still be able to stop it. `settledAt` remains an absolute wall — once
   money has moved, a freeze would be theatre.

### A defect found and fixed on the way

**A rejected objection never re-armed the settle timer.** Rejecting releases the freeze but does
not move `objectionsClosedAt`, so it looked like a case needing no timer work. It is not: the
armed timer had already fired at the window, been refused with `OBJECTION_OPEN`, and re-armed on
the five-minute back-off — and the reconciler skips any market that already has a live timer. So
a payout an officer had explicitly released waited out the remainder of that back-off. At 24
hours that was noise; at one hour it is a material share of the whole window. The uphold path had
always re-armed; the reject path now does too.

### Proof

`test:settlement-gate` §14 (**142 passed, 0 failed**, +21 assertions) drives the hold end to end:
a player is refused, an officer with no stake succeeds, the freeze blocks both `settleMarket` and
the timer sweep, the filer cannot release their own hold, a **different** officer can, the money
then moves, a settled market cannot be held, a repeat by the same officer is refused, and an
officer can still hold after the window has closed **while a player in the same market cannot**
(a positive control in the same run). `red:officer-hold` **5/5** — each of the five design
decisions is re-injected as its own defect and the gate must go red on that case's own assertion.
`test:cert-c3` **1,038 passed, 0 failed** with the new notice driven in both shapes it can take.

⚠️ **What is NOT yet done and is coming in the next entry:** the window itself is still 24 hours
on production. Rulings ③ (AI auto-resolve continues, paying unattended about an hour after the
event, at any hour) and ④ (Terms §6's source-correction void ground narrows to the configured
window) are recorded when that change ships.

---

## 2026-08-29 · MASWALI MILLIONEA — the four remaining calls, and D-1's real status

Follows the §0 entry below. These are the items the build door listed as owner-owned once §0's
seven were settled. All four were put to Ali with the measured position and a recommendation; he
took three and **overruled one, deliberately** — recorded here so a later session does not "fix"
it back.

| | Question | Ruling |
|---|---|---|
| **G-15** | Does a jackpot win hold for AML review? | **No — credit the wallet immediately.** The existing WITHDRAWAL hold is the control |
| **D-10** | Does 5-minute free cancellation apply to a ticket? | **Yes — the existing rule, unchanged** |
| **Nav** | Which rail slot yields to Millionea? | ⚠️ **None — Millionea is a FIFTH slot.** Ali's call, against the recommendation |
| **Receipt** | Keep the rollover line on a losing receipt? | **Keep it — it is bookkeeping, and it is true** |

### G-15 — the control already sits at the perimeter, and the perimeter is money LEAVING

`AML_REVIEW_THRESHOLD_TZS = 1_000_000` (`payments.ts:128`) fires on **withdrawal**: a payout at or
above it is held and **not sent to the gateway** (`:162`, `:187`). A tier win is an *internal*
credit. Holding it would be a second control over the same shilling, and would delay the player's
**sight** of the win rather than its movement — the money still cannot leave without passing the
withdrawal hold.

⛔ **The obligation this creates, and it is not optional:** the ticket page and the win
notification must state that a withdrawal at or above TZS 1,000,000 is reviewed before it is sent,
**with the SLA**. §3 G-15's own words: *"a winner left in silence with no stated timeline is the
worst support outcome the product can produce."*

⚠️ The FIU suspicious-activity report must keep reporting the **same** threshold the live hold
enforces — `catalogue.ts:22` and `:216-217` say a SAR that reports a different number from the
control that generated the holds is itself the defect.

### D-10 — the existing rule's second condition is exactly the one a jackpot needs

`RULES.md` §2.6: five minutes, full refund, then locked — **but only if the bet had five minutes of
betting time still ahead of it when it was placed** (`freeExitGraceMinutes`, enforced in
`cashOutPosition`).

Applied to a ticket that condition already refuses the case that would matter: a slip bought two
minutes before lock cannot be cancelled, because there were never five minutes of buying time
ahead of it. So nobody can buy early, watch the field firm up, and cancel out at the boundary —
and no new condition had to be invented to say so.

⭐ Safe for the seal: `ticketSetHash` is stamped at **LOCK**, not at purchase, so a cancellation
before lock changes nothing published. Same argument as D-3 — one law, three products.

### The nav slot — ⚠️ ALI OVERRULED THE RECOMMENDATION, AND THIS IS THE TRADE HE ACCEPTED

Recommended: Results yields and moves under "more", keeping the rail at four
(`Markets · Up&Down · Millionea · Live`). **Ali ruled: Millionea is a FIFTH slot; nothing is
demoted** — `Markets · Up&Down · Millionea · Live · Results`.

⛔ **Do not silently revert this to four.** It is a deliberate owner decision to give a new weekly
product maximum visibility in its launch cycles.

⚠️ **What it costs, stated so it is measured rather than discovered:** five labels on a 360-wide
rail is where truncation begins, and `scripts/responsive-audit.mjs` tests down to **320**, where
this platform already has a documented header squeeze. **S5 must measure the rail at 320 and 360
before it ships**, and if a label truncates the answer is the label, not the slot count.

⚠️ **And the 1024–1279 band is a separate risk with the same cause.** The design handover records
that the band already survives by *subtracting two controls*; a sixth desktop link re-breaks it.
The handover's recommendation stands and is **not** overturned by this ruling, which is about the
mobile rail: **Millionea under "more" at lg–xl, top-level only at ≥1280.**

### The loss receipt keeps its rollover line

It is a third-person statement of fact about where the money went — nobody won the top tier, so
the pool carried forward. A receipt that omits it leaves a player wondering what became of the
pool they paid into. It says nothing like *"play again"* or *"bigger next week"*, and the receipt
carries no celebration vocabulary either way.

⚠️ The designers raised the counter-argument themselves and it is recorded, not dismissed: on the
screen **99% of tickets land on**, "the pool got bigger" can be read as an inducement. If the
Board or counsel reads it that way, the fix is one deleted row — the handover states *"the receipt
stands without it"*. **Ali's call is to keep it.**

### 🟠 D-1 — the licence, and exactly what "consider it done" does and does not license

**Ali, verbatim (2026-08-29):** *"licens eiscmin consder ti done for now dont worry"* — the licence
is coming; treat it as settled for planning.

⭐ **So the programme is unblocked for BUILDING, and this entry records the boundary rather than
losing it.** D-1 asks whether the Gaming Board licence covers a fixed-stake multi-event jackpot;
50pick is licensed as a pari-mutuel prediction market. The evaluation's rule is *"confirm with the
Board in writing before session 1"*.

- ✅ **S1–S7 may proceed on the owner's instruction.** They are law, config, schema, an engine,
  a money path exercised on a LOCAL database, an admin console, player surfaces and hardening.
  Nothing in them takes a shilling from a member of the public.
- ⛔ **S8 — the live drive on production with real money — must NOT run until the written answer
  exists.** That is the step that sells a ticket for a product whose authorisation class is
  unconfirmed, and no engineering decision can substitute for it.
- ⚠️ If the answer comes back negative, the plan stops and **nothing is lost** — which is why the
  design was bounded to what §0 cannot change, and why S8 is last.

---

## 2026-08-29 · MASWALI MILLIONEA — six of the seven §0 decisions, and the one that still blocks

**Programme key `MASWALI-BUILD`.** The build plan and tracker are
[`SESSION-PROMPT-MASWALI-BUILD.md`](SESSION-PROMPT-MASWALI-BUILD.md); the evaluation these
decisions answer is [`MASWALI-MILLIONEA-IMPLEMENTATION.md`](MASWALI-MILLIONEA-IMPLEMENTATION.md)
§0. Each was put to Ali with the arithmetic and a recommendation; he took the recommendation in
all six.

⛔ **NOTHING IS BUILT AND NOTHING MAY BE BUILT.** §0 has seven decisions and **D-1 is
unanswered** — whether the Gaming Board licence covers a fixed-stake multi-event jackpot at all.
50pick is licensed as a pari-mutuel prediction market; a fixed-entry pooled jackpot with a
guaranteed prize may sit under a different authorisation class. It is not a technical question,
no engineering answers it, and if it comes back negative the plan stops with nothing lost.

| | Decision | Ruling |
|---|---|---|
| **D-2** | The TZS 20,000,000 guarantee | ⭐ **Progressive only — no fixed guarantee at launch.** |
| **D-3** | 13% of what? | **13% of losing stakes**, not of gross. |
| **D-4** | A VOID question | **Void counts CORRECT.** If **3 or more** of the ten void, the whole cycle voids and every ticket refunds in full. |
| **D-5** | Bonus money buying a ticket | **No, for v1 — real balance only**, refused with a message that names the reason. |
| **D-6** | Tickets per player per cycle | **Capped. Config-driven, default 10**, enforced in the purchase path and stated on the slip. |
| **D-7** | The route | **`/millionea`**, nav label *Millionea*, headings *Maswali Millionea*. Module names stay `maswali-*`. |

### D-2 — the guarantee was an unbounded weekly liability

Ten binary questions is 1,024 combinations. At 2,000 tickets a cycle the top prize is hit in
roughly **six weeks out of seven (85.8%)**, and each hit costs the house the gap between the pool
and the promise. Against TZS 4,000,000 of gross entries the expected house cost was ≈ **TZS
15,400,000 per cycle**. Self-funding a 20M guarantee needs **20,000 tickets in one cycle**.

⛔ Correlation does not rescue it: players crowd favourites, so the real world gives "nobody wins"
or "forty win together". That protects the *share size* and not the guarantee — the house still
pays the full gap on any cycle with at least one winner. The proposal expressed the promise as a
schema default (`millionea_pool DECIMAL DEFAULT 20000000.00`), which is a promise no code can keep.

A progressive pool can only ever pay out what it collected. **House exposure is zero by
construction**, and an unwon pool rolls into a bigger headline next week.

### D-3 — one fee law, not a third one

`docs/RULES.md` §1 is already LAW: **13% of the LOSING side, on both existing products**, enforced
in one function (`poolFee()`), and stated to players in `/legal/terms` §4, the assistant's system
prompt and `/help`. ⭐ **The live database agrees**: `market.config.global.feeModel` is
`loser-share`, with `operatorFeeRate 0.10 + platformFeeRate 0.03 = 0.13`. This decision is
therefore not a new rule — it is a refusal to invent a second one.

The proposal's own split already contained the answer: **50 + 25 + 12 = 87, and 87 = 100 − 13**.
The tiers were always the remainder after our fee, not percentages of gross.

Measured difference on a 2,000-ticket week (40 tickets in a tier): fee TZS 509,600 rather than
520,000 — **TZS 10,400 more to the players**, and identical whenever nobody wins. ⛔ The reason is
not the 10,400: it is that Option A would leave the platform holding two contradictory statements
about what 13% means, in a document players are shown.

⚠️ **And the fee is not what the operator keeps.** `RULES.md` §2.2: TRA 10% + GBT 5% **of the fee**,
via `levySplit()` in `payout.ts`. Of every TZS 260: 26 to TRA, 13 to GBT, operator keeps 221. On
the week above the operator nets **TZS 433,160 — 11.05% of losing stakes**, not 13%.

### D-4 — nobody is punished for a match that was abandoned

Void counting as WRONG is named in the evaluation as the single most disputed mechanic in every
jackpot product ever run. Void counting as EXCLUDED makes two tickets that answered *differently*
tie on the same score, and forces a variable denominator onto the receipt's ten rows.

⭐ The floor matters as much as the rule: **at 3 or more voids the cycle voids and everyone is
refunded**, because at that point the ticket sold is no longer the ticket being settled.

⛔ One ruling, two surfaces: the slip's rules strip **before purchase**, and the receipt.

### D-5 — bonus money is non-withdrawable, and a jackpot must not launder it

The bonus wallet is non-withdrawable by design (grant → play → unlock) and cash-out is already
blocked on bonus-funded bets. Allowing bonus to buy a ticket would convert non-withdrawable credit
into a real cash tier payout in one step — a bigger hole than the one already closed.

⛔ `buyPosition` spends bonus balance unless explicitly told not to, so this is an **active**
refusal, not an omission, and it must say why (§2.9 failure-message standard).

### D-6 — an uncapped ticket count is an arbitrage hole and the clearest RG harm

1,024 combinations × TZS 2,000 = **TZS 2,048,000 buys the top prize outright**. Whenever the pool
exceeds that, it stops being gambling and becomes buying money at a discount. It is also the one
mechanic that teaches "spend more" on a platform that already enforces deposit caps, loss limits
and session limits.

⛔ Enforced where the purchase happens, never only in the UI, and **printed on the slip** so it is
a stated rule rather than a surprise refusal.

### D-7 — settle the name before S1, because it is a rename after

*Maswali* means "questions" — generic, and every product here asks questions. *Millionea* is the
distinctive half and the half marketing will say. The design handover already leans on it (*"Pool
ya Millionea"*). ⚠️ **One find-replace before S1; a rename across ~30 files after.** The
implementation doc's S5 routes are written `/maswali/…` and become `/millionea/…`; module names
(`maswali-dal.ts`, `maswali-tier-label.ts`) do not change.

---

## 2026-08-28 · The resolver queue says WHY, and a bulk seal that cannot wave the citation gate through

**Ali, verbatim:** *"the ai auto resolver is not working, i had it on auto resolve and 90%+
confidence"* — and, for the feature: *"an auto-resolve button on top of this resolver queue page.
It confirms all of them and resolves all of them. Plus a checkbox functionality — if admin wants
to resolve only a couple of them using the button, he checks each poll as much as he wants and
auto-resolves them."*

### ⭐ THE AUTO-RESOLVER WAS NOT BROKEN. IT WAS REFUSING, CORRECTLY, AND SAYING NOTHING.

Measured read-only on production, 2026-08-28: **17 markets CLOSED, 16 carrying a sentinel
verdict, 12 at confidence ≥ 90 — and the AI cited the market's own approved source on ZERO of
them.** `resolutionMode` was `auto`; `resolveConfidenceThreshold` was `90`.

| conf | approved source | host the AI actually cited |
|---|---|---|
| 99 / 95 | premierleague.com | espn.com |
| 98 | premierleague.com | worldfootball.net |
| 97 ×2 | premierleague.com | skysports.com |
| 97 / 93 | premierleague.com | nbcsports.com |
| 96 | foxsports.com | heavy.com |
| 95 | premierleague.com | mancity.com |
| 92 | premierleague.com | washingtonpost.com |
| 91 | premierleague.com | vavel.com |

`decideAutoResolve` ANDs `sourceMatches` into `confident`, so confidence is irrelevant when the
citation does not match. That gate is correct and it is not being relaxed: in auto mode there is
no officer in the path — the assessment stamps RESOLVED and the settle timer pays — so a wrong or
invented citation is the only thing between a model and a sealed real-money outcome.

⛔ **The defect was one layer downstream: the queue never said so.** It rendered "99% confidence"
beside a chip reading *"not the approved source"*, with nothing connecting them and nothing saying
that this was why the market was still sitting there. A control that refuses without saying it
refused is indistinguishable, from outside, from a control that is broken.

### The question that was put to Ali before anything was built

`sourceMatches` consults the trusted-source registry **only** on the `no-approved-source` verdict.
Every one of the 12 HAS an approved source, so espn.com and skysports.com — plausibly
registry-trusted platform-wide — were never even considered: **a market's own approved source
silently overrides the registry.** Asked, with the numbers in front of him.

**Ali's decision: keep it strict.** A market that names `premierleague.com` is satisfied by
`premierleague.com` and nothing else. The registry stays the fallback for markets that name no
approved source. Do not widen this without a new dated entry.

### What is now true

| | |
|---|---|
| Every queue row states its auto-resolve verdict | eligible, or the named reason — cited host and approved host spelled out |
| A bulk bar seals the SELECTED markets | select-all (page-scoped, stated on screen) or per-row checkboxes |
| It calls `resolveMarket` — the same engine as the per-card button | same `withLock`, same ceremony, same `market.adjudicated` row, same objection window, same settle timer, same exact-conservation at settle |
| A row the floor REFUSED is skipped… | …unless the officer types a per-row justification |
| The override is its OWN control (`bulkResolveOverride`, `compliance`) | recorded as `market.resolve.bulk_override` with the block reason, the cited host, the approved host and the pool |
| Every batch writes a run boundary | `market.resolve.bulk`, carrying the whole selection and every bucket |
| Two-admin mode | the bar STAGES only; a countersignature is never a bulk act (below) |

### The POCA §16 position, stated rather than assumed

`requireTwoOfficer` is **false** on production today, so one admin seals in one action — the
2026-07-24 decision, unchanged. When it is ON, the bulk bar **stages stage-1 and refuses every
row that already carries one**, for either officer. Three things go wrong if a countersignature
is treated as a bulk act, and all three were found by attacking the first build:

* stage-1 may have staged **VOID**, which the AI's YES/NO vocabulary cannot express — a bulk
  confirm offered the AI's outcome over the officer's actual decision;
* the auto-resolve floor asks whether the AI's READ can stand in for a human. At stage 2 a human
  has already decided, so gating the countersignature on the AI's read judges the wrong thing —
  and its override row was indistinguishable from a genuine floor override in the audit chain;
* countersigning twenty markets in one press is the rubber stamp the two-officer rule exists to
  prevent.

⛔ **Nothing here reverses a dated decision.** The strict citation gate, the two-officer rule and
the single-admin default all stand exactly as they were.

### ⚠️ The override is Owner-only in practice, and that is a gap, not a separation of duties

`/admin/resolver-queue` is a `trading` route and `DEFAULT_GRANTS` makes `trading` and `compliance`
DISJOINT, so a COMPLIANCE officer cannot open the page and never sees the bar. A TRADING officer
gets the bar, seals what the floor already allows, and sees a **locked** override on the rest. The
same shape `recheckMarketNow` and `setTwoAdminAuth` already have on this page. It is the safe
direction — relaxing the citation gate is the tightest thing on this surface — but it is recorded
as a gap rather than dressed up as design.

### ⚠️ What is NOT a second factor here

`adminTotp` is **DISABLED** on production, so `requireAdminTotp` is a no-op: this control is not
2FA-gated and nothing in the product says it is. There is also no CSRF token, no nonce and no
idempotency key in this repo. What is real: the per-market status guard inside
`withLock('market:<id>')`, `settledAt` as the settlement idempotency stamp, the audit chain's
`@@unique([prevHash])`, Next's default origin check, `SameSite=Lax`, a typed `RESOLVE` word when
any override is in the batch, and a mandatory 12-character-minimum reason per overridden row.

### Two defects fixed alongside, both found by measurement rather than by report

1. 🔴 **"Re-check this market now" was a no-op on every CLOSED market** — i.e. on the whole
   queue. It ran a real, paid, web-searching AI call and `resolveDueMarket` then discarded the
   answer on its `not-live` guard, toasting *"Nothing to do."* Fixed with an opt-in
   `reassessClosed` branch that refreshes the recommendation ONLY (no status, no outcome, no
   timer). ⭐ This is what makes the override exceptional rather than the only route past the
   gate. A re-check that finds no outcome now CLEARS the prior recommendation rather than
   leaving a retracted 97% on a row one click from a seal.
2. 🔴 **The engine never released `resolveClaimedAt` when a market transitioned**, so every
   scheduled close carried a live claim for ten minutes. Invisible until something read it on a
   CLOSED market; it also made the re-check above buy an answer and throw it away.

### Code

`src/lib/server/bulk-resolve-eligibility.ts` (the verdict — pure, calls `decideAutoResolve`, never
restates it) · `src/app/admin/resolver-queue/bulk-resolve-action.ts` (the one enforcement site) ·
`bulk-selection.tsx` · `row-select.tsx` · `bulk-resolve-bar.tsx` · `page.tsx` ·
`control-gates.ts` (`bulkResolveMarkets: trading`, `bulkResolveOverride: compliance`) ·
`market-service.ts` (persists `sentinelDetermined`; the re-assess branch; the claim release) ·
`source-registry.ts` (`sourceMatchesAny` — one host rule, hoistable) ·
`prisma/migrations/20260828120000_sentinel_determined` (additive, nullable, no backfill; NULL
reads as BLOCKED and is named *"not recorded"*, never as an AI refusal).

### Tests

`npm run test:bulk-resolve` (146) · `npm run red:bulk-resolve` (**25/25** mutations caught,
including a positive control that refuses every row and a liveness case that blinds the matrix) ·
`npm run test:control-gates` (249, both new keys asserted for all nine roles) ·
`npm run ops:verdict-census` (read-only, every live row) · `npm run ops:bulk-resolve-fleet`
(13 production fixtures, one per verdict).

---

## 2026-08-22 · Up & Down results go into the bell — reversing 2026-07-24 and 2026-08-05

**Ali, verbatim:** *"i want u to fully make all up and down results appear in the bell as well if
they are not. normal notifications please perfectly made and 100% accurate and functional."*

⛔ **THIS REVERSES TWO DATED DECISIONS AND IT WAS PUT BACK TO HIM BEFORE ANYTHING WAS BUILT**,
because §0's rule is that a session does not silently reverse one. He confirmed with the numbers
in front of him.

### What was decided before, and why it is being changed

| Date | Decision | Basis |
|---|---|---|
| 2026-07-24 | Per-round Up & Down messages suppressed (inbox **and** email), replaced by an in-app result plus a daily digest | *"forty emails an hour is unusable"* |
| 2026-08-05 | Reaffirmed when session 30 asked for a win/lose notification: **in-app only — no email, no push, no inbox row** | measured 6.7 msgs/hour per player, 15/hour on a 3-minute chain |
| **2026-08-22** | **Every terminal outcome writes a bell row. Email stays suppressed.** | measured again — below |

⚠️ **THE FIRST ARGUMENT FOR THE CHANGE WAS WRONG AND IS RECORDED AS WRONG.** I told Ali the
"forty an hour" premise had expired, because rounds became operator-generated on 2026-08-04
(E-67) and nothing emits on a timer. **The measurement did not support that.** Auto-generation is
switched off in DATA, not removed from CODE — `advanceChain` still opens rounds for any chain
whose `state` is `RUNNING`, and operators do run chains (session 32 recorded two RUNNING 15m
chains belonging to another admin). The premise had not expired; the volume is simply lower than
forty and always was.

**The numbers he decided on** (`scripts/s30-notify-volume.mts`, read-only, re-run 2026-08-21
against production):

| | |
|---|---|
| Worst observed hour, one player | **20 bell rows** |
| Busiest day | 85 rows across 4 players (~21 each) |
| If a 3-minute chain runs all day | **360/day** to a player who plays every round |
| What the digest sends instead | ~3/day — 21 rows to 8 players in 7 days |

### What is now true

- **Wins, losses, void refunds and one-sided refunds each write a `Notification` row**, filed
  `WIN` / `LOSS` / `DEPOSIT` / `DEPOSIT`, deep-linked to **that round** (`/updown/<roundId>`).
- ⛔ **EMAIL REMAINS SUPPRESSED.** Forty emails an hour was the original objection and it was
  never withdrawn. Ali asked for the bell.
- **The daily digest stays**, unchanged. It remains the readable account of a day.
- **Bet-placed stays push-only.** It is not a result; the card already shows the stake.
- **Web push is unchanged in behaviour** but is now derived from the row, so the two channels
  cannot drift apart. Its per-round collapse key is preserved.

### ⛔ All four outcomes or none — this is a law, not a preference

E-43 is why. Refunds once leaked through the suppression while wins and losses did not, so the
only outcome a player was ever told about was the one where their money came back unchanged —
**56/56 refunds notified against 0/13 wins and 0/11 losses**, measured on production. A fifth
outcome added later without a row rebuilds that inversion. `npm run test:updown-bell` and
`npm run test:updown-push` §2 both fail if any branch stops announcing.

### 🔴 A live false money statement was found while doing this, and fixed

The Up & Down loss push shipped the Chinese title **`投注失败`** — which means *the bet FAILED,
i.e. never went through*: the opposite money consequence from a bet that was placed and lost. A
Chinese-reading player was told their bet had not been placed at the exact moment it had been
placed and lost. `notifyLoss` has carried a comment forbidding that exact string since
2026-07-31 — **the fix was applied there and never propagated to the hand-written Up & Down
copy.** It is now `投注未中`, there is one source for the words rather than two, and both the
suite and its red proof pin the ban with a positive control.

⚠️ **The volume of noise is Ali's to accept and he accepted it.** If it proves too loud in
practice the cheapest reversal is to route the four emitters back behind
`perEventNotificationsSuppressed` — one branch each, no schema change, no data migration.

---

## 2026-08-21 (later) · Erasure, built — one hole in the reasoning, and three calls made in the code

**Origin:** implementing item 3 of the four answers below. The decision itself is unchanged and
is not being re-raised. What follows is what building it turned up, recorded so nobody has to
rediscover it, plus three sub-decisions the answer did not cover.

### 1 · 🔴 The mechanism was right and its stated reason was wrong — measured

Item 3 says the number becomes a keyed HMAC *"so the same document still hashes to the same
value, so the index still rejects the second account."* The first clause is the right mechanism.
**The second does not follow, and building it that way would have repealed the AML control the
decision exists to protect.**

A unique index compares STORED STRINGS. After erasure the row holds `a3f9…`; the next person
presenting that same document writes the RAW number, `19900101…`; those are different strings,
so `KycSubmission_idType_idNumber_active_key` sees no duplicate and the second account is
created. Hashing in place is the same hole as nulling — one step further from view.

⛔ **This was measured, not reasoned about.** `red:erasure` case 1 is the decision implemented
exactly as written, and `test:erasure` §5.5 — which drives `submitIdentityStep`, the same
function `/profile/kyc` calls — then reports a second account on one national ID.

**The fix keeps the decision to the letter** (`idNumber` becomes its keyed HMAC and is never
NULL) and adds `KycSubmission.idFingerprint`, the same HMAC in a column that BOTH the erased row
and any future applicant write, unique-indexed with the tuple index's exact partial predicate.
Full detail, including the table that makes it obvious, is in
[`DATA-RETENTION.md`](DATA-RETENTION.md) §2b.

⚠️ **`OTP_PEPPER` is now load-bearing for an AML control.** Rotating it makes every stored
fingerprint disagree with every new one, so each erased document silently frees its slot. There
is deliberately no separate `ID_PEPPER` and no optional override.

### 2 · ⚠️ The identity IMAGES are held 7 years, not deleted outright — flagged for Ali

Item 3 says the images *"are deleted outright — the bytes are the sensitive part."* They are
**held until 7 years after account closure** instead, and this is the one place the
implementation departs from the answer, so it is stated plainly rather than buried.

**Why.** [`DATA-RETENTION.md`](DATA-RETENTION.md) §1 has said since 2026-08-20 that identity
documents are kept *"7 years, from account closure, POCA Cap 423 §16; FATF R.11"*. Item 3
answered **how** an identity is erased, not **when** a customer-due-diligence record may be
destroyed. Destroying a passport scan in year 1 is irreversible and would breach the schedule
the platform publishes; holding it is `KYC_DOCUMENT_HOLD_YEARS`, one constant. When two readings
differ, take the recoverable one.

The number and the name ARE pseudonymised immediately, which is exactly what
`/admin/retention` already tells the Gaming Board (*"we partially fulfil"*).

⭐ **Ali's call.** If the images should go on request, change the constant to 0 and
`test:erasure` §10.2 will demand the published schedule change with it.

### 3 · What happens to a comment's BODY — decided: redacted, and the comment soft-deleted

Item 3's brief left this open. The author mask had to be overwritten (with no display name it is
the last three digits of the phone number, frozen at write time), but the 500 characters of free
text underneath it was undecided.

**Decision: the body is replaced with `[removed at the author's request]` and the comment is
soft-deleted.** A player's own words routinely contain their own name (*"Asha here, I think…"*)
and sometimes a number, and the platform has no way to know which — *"we could not tell, so we
kept it"* is not an answer to PDPA §31. Keeping the row and anonymising only the author is the
common forum pattern and it assumes the text is safe; here nobody has checked.

The cost is accepted and is real: a market discussion loses a message. The ROW stays, so
`reports`, the moderation trail and every audit entry naming the comment id still resolve.

⭐ **Objections and proposals are treated differently, deliberately.** `Objection.detail` is
dispute evidence and `Proposal.description` may have become a live market's text — both are
records with a business or legal function, not social content. They are kept.

### 4 · A DSAR can now be **PARTIAL**, and that request stays in the queue

Marking an erasure FULFILLED while the images are held for another seven years would put the
DSAR queue in exactly the position audit F-01 found the retention schedule in: describing work
it has not done. So `DsarStatus` gains `PARTIAL` — rendered *"Partly done · docs held"*, carrying
the release date, and **left open**.

⚠️ **Nothing re-runs erasure at year seven.** There is no 7-year timer, and building one nobody
can test for seven years would be worse than writing this line. The open request IS the
reminder, `/admin/privacy` prints the next release date as a KPI, and the **Fulfil** button
stays available on a PARTIAL row so an officer can finish the job when the date arrives. This is
a known manual step, recorded as one.

### 5 · ⭐ Two PII surfaces no hand-written list had — found by sweeping, not by checking

`test:erasure` §8 walks the whole store asking *"does anything still hold this value?"* rather
than checking a list of fields somebody remembered. It found two:

- **The referrer's notification body.** `notifyReferralJoined` writes
  `maskName(displayName, phoneE164)` into *somebody else's* row and freezes it there —
  `+255•••417 signed up with your link.` Erasure does not own that row and deleting the
  subject's own notifications does not reach it. It is now redacted, in **both** mask forms,
  because which one got frozen depends on whether the player had set a name that day.
- **`KycSubmission.extraRequests[].description`** — an officer's free text, and officers write
  the obvious thing: *"Proof of address for Asha Mwangi"*. The player's name survived inside a
  JSON column on a row whose name column had just been carefully pseudonymised.

The second one is the audit's own F-02 scope note (*"`extraRequests` is a second inline store the
acceptance query never looked at"*) coming back in a new place.

### 6 · E-33 closed — and two false claims found on the button that closes it

Item 2 below (*who may file a DSAR*) is wired. `fileDsarRequest` had exactly one caller,
`fileDsarAction`, and that action had **none**, so `/admin/privacy` said *"No data-subject
access requests are on file"* permanently — not because nobody had asked, but because asking
was unrecordable. Both doors now exist: the player's own on `/profile/account`, and the
officer's *File request* for a walk-in, letter or telephone request.

⛔ **Both refuse ACCESS and PORTABILITY** through one shared narrower, and the officer's door
used to **default to ACCESS** on unrecognised input — filing a 30-day statutory obligation for
the one right the export answers instantly. ⛔ **Both cap at one open request per kind**: the
player's is a public form, and the officer's needs it against a double-click.

⚠️ **And the Fulfil dialog was making two claims that were not true**, found by reading it
against what the code does:

- *"The player will be notified."* Nothing in `fulfillDsarRequest` notifies anybody — and for
  an erasure it is **impossible**, because the routine nulls the email, tombstones the phone
  and deletes the account's notifications. **The confirmation channel is destroyed by the act
  being confirmed.** The dialog now tells the officer to answer the player FIRST.
- *"This records the completion date and closes this request."* On an ERASURE row that button
  now DESTROYS columns. A destructive control described as bookkeeping does not tell the
  operator what they are about to do — the same defect as a retention schedule no code
  enforces, pointing the other way.

**Code:** `src/lib/server/erasure.ts` · `crypto.ts` (`identityFingerprint`) ·
`kyc-service.ts` · `privacy.ts` (`hasOpenRequest`, `asRequestableType`, `PARTIAL`) ·
`comments-store.ts` · `store.ts` + `prisma-dal.ts` (both DAL halves) ·
`src/app/profile/account/*` · `src/app/admin/privacy/*` ·
`prisma/migrations/20260821140000_kyc_identity_fingerprint`.
**Tests:** `test:erasure` 155/155 · `red:erasure` 16/16 · `test:dsar-intake` 36/36 ·
`red:dsar-intake` 12/12 · `test:red-anchors` 264/264, ratchet still 67.
**Docs:** [`DATA-RETENTION.md`](DATA-RETENTION.md) §2b is the authority.

---

## 2026-08-21 · The four open retention / erasure questions — answered

**Instruction:** Ali, **2026-08-21**, asked for the four answers rather than being asked for
them. Each is recorded here with the reasoning, so a future session inherits the decision and
not the question. Origin: audit finding **F-01**, `docs/DATA-RETENTION.md` §2.

---

### 1 · Marketing consent — **2 years from last activity.** ✅ Implemented

The player-facing policy said *"until withdrawn or 2 years of inactivity"* in all three
locales; `/admin/retention` told the Gaming Board *"3 years, from withdrawal of consent"*.
Different period **and** different trigger for the same data class.

**Corrected DOWN to the player's number, and the direction is the whole argument.** Under
PDPA 2022 you may not retain personal data longer than the purpose you disclosed to the person
it belongs to — and the player-facing policy *is* that disclosure. Raising the player's figure
to 3 years would have told players their data is kept longer than they were previously told: a
change requiring notice, and the only one of the two options carrying exposure. Lowering the
admin row requires notice to nobody.

The business case for 3 years was weak regardless: what is stored is `User.marketingOptIn`, a
boolean, plus the audit trail of consent changes. There is no rich marketing dataset here.

---

### 2 · Who may file a DSAR — **the player, from `/profile/account`, on their authenticated session**

The register could not be populated at all because `fileDsarAction` had no caller (E-33), and
the blocker was recorded as *"needs a compliance decision, not wiring"*. The decision:

- **The player files it themselves.** An authenticated session is sufficient evidence of
  identity — and it must be, because it is *already* the standard this platform accepts for
  handing over the player's entire data bundle through the existing "Export my data" button. A
  higher bar for *asking* than for *receiving* would be incoherent.
- **The ACCESS right needs no DSAR at all.** It is already served, immediately and without a
  queue, by that export. The register exists for **ERASURE** and **CORRECTION** — the requests
  that need a human decision and a statutory clock.
- **An officer may also file on a player's behalf** (letter, walk-in, phone), which is what
  `/admin/privacy` is for.

⛔ **What this decision does NOT do:** it does not make erasure work. It unblocks the register
so the 30-day clock can start and be seen. The routine itself is item 3.

---

### 3 · How a national ID is erased — **keyed HMAC of the number, never NULL.** ⚠️ Not yet built

🔴 **The landmine, stated plainly:** since the NIDA contract migration, the partial unique index
on `(idType, idNumber)` is the **sole** enforcement of one-document-one-account — a P0 AML
control. **Nulling `idNumber` frees that slot, so one human could open a second account.** An
erasure routine written the obvious way would quietly repeal an AML control.

**The mechanism:** replace `idNumber` with a **keyed HMAC of itself** (the same peppered-hash
pattern already used for OTP codes and 2FA backup codes). This is the only option that satisfies
both requirements at once:

- **Uniqueness survives** — the same document hashes to the same value, so the unique index
  still collides and one-document-one-account still holds after erasure.
- **The number is destroyed** — nobody can read a citizen's ID out of the database, and it is
  irreversible without the pepper.

It is also what the product **already tells the Board** on `/admin/retention` ("PII fields
pseudonymised, hashed-NIDA replaces full name + phone"), so this makes an existing published
statement true rather than introducing a new one.

The document **images** are a different matter and are deleted outright — the bytes are the
sensitive part and nothing depends on them for uniqueness. `deleteKycDocument` was shipped on
2026-08-20 specifically so this step would have something to call.

✅ **BUILT 2026-08-21** — `anonymizeClosedAccount`, `test:erasure` 155/155, `red:erasure` 16/16.
⛔ **Read the entry above this one before touching it.** The mechanism recorded here is right and
the reason given for it is not: hashing the number IN PLACE does not preserve the collision,
because a unique index compares stored strings. The collision now lives on
`KycSubmission.idFingerprint`. The images are held for the statutory 7 years rather than deleted
outright — flagged there for Ali. `Comment.authorName` is overwritten and the body is redacted.

---

### 4 · Support tickets — **the row is marked N/A until there is a ticket store.** ✅ Implemented

A 3-year retention period was published for data the platform does not hold: there is no ticket
store, and customer care is unbuilt (`NEXT-PLAN` queue, Unit K · #12 + #13). Publishing a period
for a system that does not exist is the same defect as the rest of F-01 — a schedule describing
a platform we are not.

The intent is **kept and labelled**, not deleted, so it is picked up when Unit K ships. Same
treatment as the `Session` row, which is marked N/A because that model has never been written to.

---

**Code:** `src/app/admin/retention/page.tsx` (rows 1 and 4, each with its reasoning inline).
**Docs:** `docs/DATA-RETENTION.md` §2 rewritten from open questions to recorded answers.
**Since:** item 3 is ✅ built (2026-08-21 — see the entry above, and `DATA-RETENTION.md` §2b),
and its officer door is wired: **Fulfil** on an ERASURE request runs the routine. Item 2's
**player-side intake** from `/profile/account` is still to wire.

---

## 2026-08-20 · What Up & Down writes to the audit chain — one entry cut, four protected

**Instruction:** Ali, **2026-08-20**, choosing between three options put to him for audit
finding **F-10**: *"Reduce what Up & Down writes"* — in preference to accepting the growth
or to a yearly export-and-re-anchor ceremony.

**The problem, measured.** `AuditLog` is **144 MB / 114,480 rows**, growing **~11,500 rows a
day** — three times the rate the audit recorded. ~90% is Up & Down machinery at six entries
per round. The chain is append-only and **cannot be pruned without breaking its HMAC links
by design**, so every row written is written for the platform's lifetime.

### What was cut

| Entry | Why it could go |
|---|---|
| `market.created` (for `productLine === "UPDOWN"` only) | Every field is already in the `updown.round.opened` entry written moments later, and that one is **strictly richer** — it carries the marketId, the pinned `capturedSourceUrl`/`capturedSourceDomain`, the `rateProfile`, the stake bounds, the margin, both targets, the open price and the write-once observation id. Nothing is lost by not saying it twice in two vocabularies. **10,012 entries in the last 7 days alone.** |
| `notification.delivered` (platform-wide) | Carried `{ userId, kind }` about a `Notification` row that already holds strictly more — both titles, both bodies, href, readAt, dismissedAt, createdAt. A poorer copy of a record that already exists, and the highest-volume non-money action in an unprunable log. Nothing read it: no consumer of the action name exists in `src/` or `scripts/`. |

### 🔴 What was NOT cut, and why — read this before reducing anything further

Each was examined individually. None is a duplicate:

- **`market.settled`** — THE MONEY: `winnersPaid`, `positionsSettled`, `grossPool`,
  `winningPool`, `objectionsClosedAt`. If this goes, the chain no longer records that a
  player was paid.
- **`market.resolved`** — the FULL FEE ARITHMETIC, written so *"an inspector (or a player who
  disputes a payout) can recompute the fee from these numbers"*. ⚠️ The Up & Down twin
  `updown.round.resolved` carries pools and players but **NOT the rate breakdown**, so this
  is *not* a mirror and dropping it would cost a dispute record.
- **`updown.round.opened`** — the round's provenance and its pinned price source.
- **`updown.observation.confirmed`** — the price, write-once. The fairness record the whole
  product rests on.

**⛔ Guardrail.** "Reduce what Up & Down writes" is not a licence to keep cutting. The four
above are asserted PRESENT by name in `test:updown-reporting` (assertions 20–23), each with
the reason attached, and the cut one is asserted ABSENT **for the round's market only** while
a long-form poll must still record its creation — so deleting the audit call outright fails
too. Both directions were driven red.

### ⚠️ Be honest about the size of the win

This removes **one of six** entries per round plus the notification rows: roughly
**1,700–3,000 rows a day**, on the order of **1 GB a year**. It does not solve the growth
curve — four load-bearing entries per round remain, and at ~1,650 rounds a day that is still
~6,600 rows a day from Up & Down alone.

**The remaining lever is not an engineering one: it is the number of rounds.** Nothing else
can come out of the chain without losing a money, fee, provenance or fairness record. If the
growth needs to be halved again, that is a decision about how many rounds the product
generates — or the export-and-re-anchor ceremony, which remains on the table and is recorded
here as *not chosen today*.

**Code:** `src/lib/server/market-service.ts` (the `productLine !== "UPDOWN"` guard) ·
`src/lib/server/notification-service.ts` (the audit call removed, with the reasoning left in
its place).
**Tests:** `test:updown-reporting` 25/25 (assertions 17–25, both halves driven red) ·
`test:audit` 36/36 · `test:lifecycle-e2e` 1545/1545 · `test:markets` 24/24.

---

## 2026-08-20 · The privacy policy stops declaring collection and controls we do not have

**Origin:** the data-handling audit ([`DATA-AUDIT-2026-08-20.md`](DATA-AUDIT-2026-08-20.md))
finding **F-04**, which named one false claim. Grounding the finding against the code found
**three**, each repeated in all three locales. Ali's decision on the open a/b question:
**option (a) — correct the policy to actual collection.** Device/browser fingerprinting is
NOT implemented and is NOT planned for launch, so the `Device` model stays unwritten and
F-05 may drop it.

**What was false, and what is true.**

| The policy said | The code does | Corrected to |
|---|---|---|
| "IP address, **device and browser fingerprint**, session timestamps" | Nothing computes a fingerprint. `Device.fingerprint` exists in the schema with **zero writes anywhere in `src/`**. The only "fingerprint" in auth code is `passwordFingerprint()` — a SHA-256 of the stored *password hash* that makes a reset link single-use (`password-reset.ts:52-55`). No browser entropy is read, stored or transmitted. | "IP address and browser user-agent string, recorded on sign-in and security events; session issue and expiry times" — which is exactly what `AuditLog.ip` / `AuditLog.userAgent` hold |
| "Behavioural: **time on platform, reality-check responses**, limit changes" | Session elapsed time and the reality-check dismissal are written to browser `sessionStorage` and **never sent to the server** — `reality-check.tsx` contains no `fetch`, no action, no POST. No table holds either. Only "limit changes" was ever real. | "deposit and loss limit changes, self-exclusion and cooling-off periods" — the whole of what `ResponsibleGambling` stores |
| "Passwords **(when introduced) will use Argon2id**." | Password registration and login are the **primary, live** auth path, and hashing is **scrypt with a per-user salt**. | "Passwords: scrypt with a per-user salt (NIST SP 800-132)." |

**Which of the three mattered most.** The Argon2id sentence. Over-claiming *collection* is
inaccurate; mis-stating an *actual security control* to a regulator, on the page they read,
is a different category — and it was future-tense about a control that had already shipped.

**⛔ This page is not dictionary-driven.** All three locales are inline JSX in
`src/app/legal/privacy/page.tsx`, so `npm run test:i18n` cannot see a word of it and never
protected any of this. The new `test:cert-d1` §2b block is the only guard there is; it
asserts the negative in all three languages, requires `scrypt` to appear at least three
times so a partial fix cannot pass, and carries a control assertion so the negatives cannot
pass vacuously on an unreadable page. Both new negatives were driven red by reinstating the
old sentences.

### The ISO 27001 / penetration-testing claim — Ali's attestation, recorded

§8 of the same page states, in all three locales, an **annual ISO 27001 audit cadence and
penetration testing twice a year**. Unlike the three corrections above this is an
operational fact, not a code fact — nothing in `docs/` records a completed ISO 27001 audit
or a pentest report, so it could not be settled from the repository.

Put to Ali on **2026-08-20**. His instruction: **both have happened; the sentence stands as
written.** The reports are held outside this repository.

This entry is the record of that attestation, and it is deliberately explicit about its
own basis: the claim rests on the owner's statement, **not** on anything verified in code or
filed in `docs/`. ⚠️ If a regulator asks for the ISO certificate or a pentest report, they
are requested from Ali — there is nothing in the repo to hand over. Filing copies (or a
summary with dates, scope and assessor) under `docs/` would close that gap; until then the
gap is this paragraph.

### Two inert controls found in the same sweep — NOT fixed here, recorded so they are not forgotten

Both are the same shape as the privacy overclaim — the product describes a control that no
code path can exercise — but both sit outside the data-handling audit's scope and neither was
changed in this pass:

1. **Shared-IP affiliate anti-fraud never fires.** `referrerSharesIp()`
   (`affiliate-service.ts:255-267`) reads `globalThis.__50PICK_SESSIONS`; a repo-wide grep
   finds that symbol on **that line only**, so it is always `undefined` and the function
   always returns `false`. `suspectIpOverlap` is therefore permanently false — the
   "rewards land HELD for review" branch never triggers, and every
   `affiliate.recruit.bound` audit payload records `suspectIpOverlap: false` forever. The IP
   *is* available at the call site (`bindRecruit` receives `ip: meta.ip`), so this is a
   wiring gap, not a missing input.
2. **The `SESSION_OVERRUN` responsible-gambling detector is unreachable.**
   `responsible-gambling.ts:537-551` returns immediately unless `ctx.opts.sessionStartedAt`
   is set, and its only caller (`:593`) passes no options. The detector that watches for a
   player sitting on the platform past 4× their reality-check interval has never produced a
   flag and cannot. Note the neighbouring detector #4 is *declared* an intentional no-op in
   a comment — so this file already has a convention for saying so honestly, and #5 should
   either be wired or labelled the same way.

**Code:** `src/app/legal/privacy/page.tsx` (9 lines, 3 claims × 3 locales).
**Tests:** `test:cert-d1` §2b (74/74, both negatives driven red).

---

## 2026-08-20 · Identity verification STOPS being a precondition of withdrawal

**Instruction:** Gaming Board comment **#1**, relayed by the owner (Ali) on **2026-08-19**. That
relay is the authority of record for this change. Register row **`E-175`**. The statement sent to
the Board **before** the code was written is [`BOARD-DISCLOSURE-B-E.md`](BOARD-DISCLOSURE-B-E.md);
it is the fuller document and this entry does not restate it.

**What changed.** `wallet-service.withdraw()` no longer refuses a payout on identity status. The
refusal, its `withdraw.kyc_blocked` COMPLIANCE audit, and the `kyc_required` failure reason — union
member, registry row, three dictionary keys and its single emitter — are retired together. The
`/wallet/withdraw` page changed in the **same commit** (`canSubmit = payoutsOpen`, the verify-first
panel deleted); a UI-only change would have reproduced `E-5`, a screen promising what the next
screen refuses.

**What replaced it — a RECORD, not another gate.** The identity read is deliberately KEPT. Every
withdrawal's `withdraw.initiated` audit now carries `kycStatus`, and an unverified payer produces an
**awaited** COMPLIANCE fact `withdraw.unverified_payer` carrying `txnId`, the amount, the provider,
and the instruction that authorised it. Stamping every payout — not only the unverified ones — is
deliberate: a stamp that appeared selectively would make its own absence ambiguous.

**Deliberately NOT changed.** The identity system itself (collection, the four documents, the
`(idType, idNumber)` uniqueness tuple, the human review, the audit trail) · the AML/FIU controls
(the ≥ TZS 1,000,000 two-officer hold comes from a **different authority** and a Gaming Board
instruction about identity-on-withdrawal does not repeal it; `payments.ts` contains no identity
reference at all and so cannot be weakened by this) · the human review queue.

### 🔴 THE LEVERS THIS COST US — recorded because they were real controls

1. **`forceReverifyKyc` is no longer a money control.** Its entire stated purpose was to "re-lock
   withdrawals". It now changes a player's KYC state and nothing about their ability to be paid.
   Four surfaces that said otherwise were corrected. What an officer has instead: **wallet freeze**,
   **payout pause**, **the AML two-officer hold**.
2. **`withdraw()` has no `user.status` check and no self-exclusion check.** With the identity gate
   gone, `wallet.status !== "ACTIVE"` is the only account-level control inside the function.
   Suspension and self-exclusion are enforced upstream by session revocation — which stops a
   *player*, not a call arriving without a session. The two **operator** retry paths
   (`retryWithdrawalAction`, `bulkRetryAction`) call `withdraw()` directly and pass neither those
   nor the route-level payout pause; the identity gate used to stop them for unverified accounts as
   a side effect, and no longer does. An actor is now threaded through so the record names the
   **officer** rather than the player. ⛔ The controls themselves were **not** changed here — that
   is a separate decision, disclosed rather than quietly patched.
3. **The payee-name lookup was ungated on purpose.** It was KYC-gated, and leaving it would have
   switched off the one check that catches a mistyped payout destination for exactly the population
   this opens up — silently, since it fails by returning no name. Its rate limit is now the only
   control against name enumeration.

### ⚠️ THE RECORD IS FAIL-OPEN, AND THAT IS DISCLOSED

`audit()` keeps the entry in a per-instance in-memory ring and lets the request proceed if the
database write throws. So under a database outage a payout can succeed while the record explaining
it does not durably persist — on the one path where that record is the only evidence. Stated to the
Board rather than presented as durability we have not built.

### ⛔ THE ATTRIBUTION WAS REWRITTEN, OR THIS GETS REVERTED

`docs/FLOWS.md` cited the *"TZ Gaming Board model"* as the **reason** the gate existed. Left
standing, that sentence invites a future session to re-add the gate by reading our own docs
correctly. It now records the removal, dated, naming this instruction. Four player-facing surfaces
additionally asserted that the **Tanzania Gaming Act requires** verification before withdrawal — a
legal claim the instruction contradicts — and one FAQ cited the Gaming Act *and* the AML Act. The
Gaming Act claims are gone; the AML attribution is kept, because it is true.

### 🔴 WHAT IS NOT PROVEN — the seal was waived

**No unverified player has completed a withdrawal on production.** The end-to-end seal moves real
money to a real mobile-money account and was **waived by Ali on 2026-08-20** — *"proceed without
this real test, if anything happens we detect later in live testing."* The change is proven by
green guards, twelve mutations and re-anchored live drives; the **payout leg is unproven**. Filed as
**`E-177`** so it is not mistaken for passed.

---

## 2026-08-20 · FOUR ways to prove who you are — NIDA is no longer the only accepted document

**Owner decision:** Ali, 2026-08-19. *"We have to give options for KYC, not just NIDA. One of
them: mandatory NIDA, or passport number and attach passport front page, or driving licence
number and attach driving licence front, or voting card and attach it. One of them works for us,
not just NIDA."* And, on the two undocumented formats, 2026-08-19: *"for now driving and voting,
keep them open — later we change."*

**The rule, in one line:** a player proves identity with **any ONE** of **NIDA**, **passport**
(+ bio page image), **driving licence** (+ front image) or **voter's card** (+ image). Full
statement, with every enforcement point: [`docs/IDENTITY-POLICY.md`](IDENTITY-POLICY.md).

### 🔴 THE RESIDUAL GAP — stated to the Board, in writing, and NOT closed

**One human legitimately holds a NIDA *and* a passport *and* a driving licence *and* a voter's
card.** The uniqueness rule is `(document type, document number)`, enforced by a partial unique
index at the database level. It stops **the same document** being used on two accounts. It does
**not** stop **one person** opening two accounts on **two different documents**.

⛔ **Nothing in the codebase can close this, and it is not an oversight.** It is the direct,
accepted consequence of the instruction above. Only two things could close it, and both are
excluded:

1. **NIDA-as-mandatory** — which is precisely what this decision removes.
2. **A cross-document identity match** against an authority — which would require an authority
   check. There is none, for any of the four, by owner decision (2026-07-19), and none is wired.

⚠️ **So the control that catches it is the HUMAN REVIEWER, and only the human reviewer.** The
officer sees the name, the declared date of birth, the document image and a selfie on every
submission. A second account opened by the same person on a different document is the case they
are positioned to catch, and it is the only place it can be caught.

⛔ **And one consequence must not be misdescribed anywhere:** a `DUPLICATE_IDENTITY` rejection on
one document does **not** prevent that person submitting a different one. No surface, report or
statement to the Board may imply that it does.

**Flagged for Ali and for the GBT file.** If the Board's position is that one natural person must
hold exactly one account regardless of which document they present, that requirement cannot be
met by this platform without an authority check, and the answer is a policy change rather than a
code change. Test it once, on this entry.

### What changed

| | |
|---|---|
| **The identity fact** | `KycSubmission.nidaNumber` → the tuple **`idType` + `idNumber`**, plus `idExpiry` and `idVerifiedAt`. ONE identity number per submission, whatever document it came from |
| **The uniqueness rule** | partial unique index **`KycSubmission_idType_idNumber_active_key`** on `("idType","idNumber") WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED'` — the **exact** `WHERE` semantics of the 2026-07-31 NIDA index it supersedes, so a REJECTED submission still frees the number |
| **Formats** | NIDA `^\d{20}$` with digits 1–8 validated as a real calendar date (🟢 published) · passport 9 alphanumeric as an **advisory** shape that flags but never refuses (🟡 secondary sources only) · driving licence and voter's card **openly unformatted** (🔴 TRA and NEC publish nothing), held to a stated 4–20 alphanumeric sanity band |
| **Expiry** | captured, and **refused at submit**, for the two documents that carry one (passport, driving licence). Re-checked again at submit-for-review. ⛔ Never asked for on a NIDA or a voter's card |
| **Images** | per document: NIDA front + back + selfie · the other three, one document image + selfie |
| **Failure reasons** | `nida_taken` → **`id_taken`**, `nida_not_verified` → **`id_not_verified`**, plus new `id_number_format`, `id_expired`, `id_expiry_required`. Union member, registry row and dictionary key moved together in one commit |

⭐ **THE SELFIE IS STILL REQUIRED ON ALL FOUR, and that is deliberate.** *"Selfie matches the ID
photo"* is one of the officer's four recorded attestations. Dropping it for three of the types
would have removed the human control in the same change that widened the document list — the one
thing the policy says this change must not do.

⛔ **AND THE AGE GATE IS NOT DERIVED FROM THE NUMBER.** Only a NIDA carries a date of birth
inside it. An UNDERAGE check read out of the number would pass for the other three *because the
feature is absent*. The gate is on the **declared** date of birth, enforced twice (Zod at parse
time, and the service above the per-document branch), and asserted per document type.

### 🟡 What is deliberately NOT enforced, and why

**We did not invent a driving-licence or voter-card format.** TRA's own driver's-licence guide
describes the card and not the number; NEC/INEC material confirms a voter number exists and does
not publish its shape. ⛔ A wrong regex on a national ID **locks a real citizen out of their own
money**, and a format-rejected submission never reaches the human who is the actual control — so
a permissive field is the safer error here. This is the same discipline `updown-symbols.ts`
applies to silver and platinum, and it is **instructed**, not assumed. A later session does not
get to tighten either on a guess: adding a rule is a one-line change to that document's entry in
`src/lib/id-documents.ts`, **with its citation beside it**.

**Ali asked for "100% accurate" sizes.** The honest form of that is a **sourced rule where a
source exists and a stated absence where none does** — two of the four are enforced from a
source, one is advisory from secondary sources, and two are deliberately permissive with the
absence written into the catalogue, this entry and the officer's own screen.

**No PDF uploads.** A passport scan arrives as a photograph like everything else. The storage
seam validates image magic bytes, the client downscales to stay under the 3 MB cap, and the
officer's viewer is an `<img>`; admitting PDFs would mean a second validation path, a second
viewer, and an active-content format on an identity page. Decided, not overlooked.

### What was NOT touched

- ⛔ **`TWO_PERSON_THRESHOLD_TZS` and `/admin/aml` are untouched.** Those come from the AML/FIU
  regime, a **different authority**. A Gaming Board instruction about which documents are
  accepted does not repeal an AML threshold.
- ⛔ **KYC remains a precondition of withdrawal.** Board instruction #1 (remove that gate) had
  **not** landed when this shipped — `wallet-service.ts` still requires `APPROVED` — and this
  unit deliberately does not pre-empt it.
- ⛔ **No `nidaNumber` value was rewritten or discarded.** The migration BACKFILLS the existing
  rows into the new tuple (`idType='NIDA'`) and changes nothing about them.

### ⚠️ One deliberate piece of debt, with its discharge named

The migration is **EXPAND ONLY**: `nidaNumber` and `nidaVerifiedAt` are kept, and mirrored on a
NIDA submission by exactly one write site. Railway health-checks a new deployment while the OLD
container is still serving, and Prisma selects every scalar column — so dropping them in the same
migration would have returned a 500 on every KYC read (`/profile/kyc`, `/wallet/withdraw`,
`/admin/kyc`) for the length of the switch, on an identity path.

⛔ **Nothing reads them**, and `npm run test:id-documents` §9 fails if anything starts to. ⚠️ **BOTH HALVES OF THAT SENTENCE WERE FALSE — see the amendment below:** the store layer held two readers, and §9 allowlisted the file they lived in.
**The contract step is: a follow-up migration dropping `nidaNumber`, `nidaVerifiedAt` and
`KycSubmission_nidaNumber_active_key`, once the expand release has been stable on production.**
Until that lands, this entry is the record that the duplication is time-boxed and intentional.

> #### ✅ AMENDED 2026-08-20 — the debt is being discharged, and in TWO releases
>
> ⚠️ **This paragraph named THREE objects and there are FOUR.** `@@index([nidaNumber])`
> (`KycSubmission_nidaNumber_idx`, created 2026-06-14) was not listed. It goes with the column.
>
> ⚠️ **And "nothing reads them" was true of PRODUCT code only.** `prisma-dal.findByNida` /
> `findActiveByNida` read the column — with zero callers — and §9, the guard cited here as
> proof, **allowlisted the file they lived in**. The claim was never tested. §9 has been
> re-pointed at every spelling across all of `src/`, with no allowlist, plus the schema and
> the absence of a number-only duplicate read.
>
> **Step 1 shipped 2026-08-20:** the fields left `prisma/schema.prisma`, the mirror write,
> the DTO, the two dead readers, eleven fixtures, both race proofs and one data-migration
> script — **with no DDL**. **Step 2 shipped 2026-08-20** as
> `20260821090000_kyc_drop_nida_legacy`, in the release after it, once `/api/health`
> confirmed the step-1 container was serving and `leadership.lifecycle.isMe: true` showed
> the previous instance had stopped renewing the lifecycle lease.
>
> ⭐ **From step 2 on, `KycSubmission_idType_idNumber_active_key` is the SOLE enforcement
> of one-document-one-account** — a P0 AML control that a NIDA used to have twice.
> `test:kyc` §2d therefore proves it at service level for a **passport** as well: the
> duplicate refusal, the `status <> 'REJECTED'` half that frees a rejected number, and a
> control showing the same digits under a different document type are a different
> document. All three proved RED by mutation.
>
> ⚠️ **And nothing in the platform had ever read a contract migration.** `test:cert-d1`
> hard-coded two migration paths, and its "does NOT drop the deprecated columns" check is
> scoped to the *expand* file — so a contract migration that dropped the wrong index,
> forgot `KycSubmission_nidaNumber_idx`, ran `CONCURRENTLY` inside Prisma's transaction or
> was not re-runnable would have been caught by **no suite**. §3b now reads it: nine
> assertions, three of them proved RED.
>
> 🔴 **THE ORDER IS THE SAFETY ARGUMENT, and the hazard was recorded five times with the
> wrong blast radius.** Every statement of it — including the paragraph above — named
> `/profile/kyc`, `/wallet/withdraw` and `/admin/kyc`. But `createSession` calls
> `db.kyc.findByUserId` **unguarded on all three login paths** (`auth-service.ts:353`,
> `:911`, `:952`), so dropping a column a previously-deployed container still selects is
> **sign-in, platform-wide** — and `/api/health` never touches `KycSubmission`, so nothing
> would have reported it.

### Where it lives

`src/lib/id-documents.ts` (the catalogue — one entry per document, the ONLY place a format is
declared) · `src/lib/server/kyc-service.ts` (`submitIdentityStep`) ·
`prisma/migrations/20260820120000_kyc_identity_document` ·
`src/app/profile/kyc/page.tsx` (the chooser, built from the kit's one filter control) ·
`src/app/admin/kyc/[id]` (the reviewer's per-document screen).
Guards: `npm run test:id-documents` (192 assertions, every refusal beside a positive control) ·
`npm run red:id-documents` (**18 injected defects, 18 caught**) · `npm run test:cert-d1` ·
`npm run test:failure-reasons`.

---

## 2026-08-14 · ONE fee for both games — Up & Down moves to `loser-share`

**Owner decision:** Ali, 2026-08-14. **This SUPERSEDES § 2026-07-24 item 1** below, which put
Up & Down on `capped-commission` at 13% of the pool with a ⅓ ceiling.

**The rule, for both games, identically:** our fee is **13% of the LOSING side** — Platform 3%
+ Operator 10%. Full statement, with enforcement and configuration for every rule:
[`docs/RULES.md`](RULES.md).

**Why.** Two charge models needed a diagram to explain and produced two different answers to
"what do you take?". One model the customer can understand is worth more than the difference.

### The two consequences, both accepted, both recorded

**1. Our income halves on a balanced round.** 13% of the whole pool becomes 13% of half of it:
a balanced TZS 10,000 round yields **TZS 650** where it used to yield TZS 1,300. On the
lopsided case the fall is larger still — a 9,000/1,000 pool goes from 333 to 130. Deliberate.
⛔ Do not "restore" the ceiling to protect income. `test:updown-config` §4.2/§4.3 pin both
numbers, and `red:updown-cutover` includes the mutation that takes the fee on the whole pool
precisely because it is the tempting one.

**2. 🔴 UP & DOWN IS NO LONGER OUTCOME-NEUTRAL — and that needs saying plainly.**

`capped-commission` reads only the two pool sizes, so its fee is byte-identical whether YES or
NO wins. `docs/F6-LIQUIDITY-DESIGN.md` §3.1 names that as the pari-mutuel licence anchor, and
it is the reason the 2026-07-24 ruling chose it for Up & Down — that entry says in as many
words that Up & Down therefore sat *closer* to the licence posture than long-form polls.

`loser-share` charges a slice of whichever side **lost**, so it is outcome-DEPENDENT by
construction. On a 7,000/3,000 pool the fee is 390 if YES wins and 910 if NO wins.

This is **not new to the platform**: long-form polls have been outcome-dependent since
2026-07-23, under Ali's explicit override of the same property. What 2026-08-14 does is
**extend that existing override to the second product**, so that the platform now has one
posture rather than two. It is recorded here, rather than left implicit, because a compliance
record that documents an override for one product and silently applies it to another has a
hole in exactly the place an auditor will look.

⚠️ **Flagged for Ali and for the GBT file.** The fee remains a function of the pools and the
outcome only — never of the identity of a bettor, never adjustable after a round opens, and
always disclosed before the bet. The winner floor still holds by construction under
loser-share (a winner keeps their stake plus a share of a net pool that can never be smaller
than the winning pool). If the Gaming Board's position on outcome-neutrality needs testing,
test it once, for both products, on this entry.

### What was NOT touched

- ⛔ **No `feeSnapshot` was rewritten, backfilled or migrated.** 4,146 Up & Down rounds and 58
  legacy polls stay frozen on `capped-commission` and settle by it forever. `test:updown-cutover`
  settles a legacy round beside a new one in the same process and asserts they differ.
- ⛔ The price band, the tick floor and `computeTargets` are untouched. This was a fee change.
- The ⅓ `feeCeilingRate` remains present in the profile and **inert** — `poolFee`'s loser-share
  arm never reads it. It is kept defined so a reader of an old snapshot never sees `undefined`.

### Where it lives

`DEFAULT_UPDOWN_CONFIG.defaultRateProfile` (`src/lib/server/updown-config.ts`) ·
`reconcileUpDownDefaults` v4, which moves a persisted config still on the exact retired default
and leaves a deliberate operator profile alone · **`ops:updown-loser-share`**, which migrates
the 16 `UpDownChain.rateProfile` rows one at a time, audited — they carry their own copy and do
**not** inherit the default, so the constant alone changes nothing a player can see.
Guards: `npm run test:updown-cutover` (23 assertions, both models settling on the real path) ·
`npm run red:updown-cutover` (6 mutations, including "history repriced" and "not switched").

---

## 2026-08-14 · A human approval wins — the AI confidence threshold is an autopilot gate, not a licence rule

**Owner decision:** Ali, 2026-08-14, after three false "publish failed" reports on live markets.

**The decision, in one line:** *the 75-confidence threshold applies only to publishing with
no human in the loop.* Where an officer has read a candidate and approved it, that approval
is the authority, and the score does not overrule it.

**Why the question arose.** `/admin/ai-polls` publishes a poll an officer has ALREADY
approved by running it through the market-candidate pipeline — ingest → filter → verify →
score → approve — so the candidate record carries the same audit trail as one that came
through the unattended route. `scoreCandidate` sent anything below
`CONFIDENCE_PUBLISH_THRESHOLD = 75` to `FILTERED_OUT`. `approveCandidate` then returned
`null`, **and its return value was discarded**, so `createMarket` ran anyway and put a LIVE,
bettable market on the board; `markPublished` refused because the candidate was not
`APPROVED`; and the officer was told the publish had **failed**.

It fired three times on production, every one of them on a market that was live:

| when | market | state |
|---|---|---|
| 2026-08-11 05:05 | `mkt_034555d0c988640474d8` | LIVE · 2 bettors |
| 2026-08-14 08:25 | `mkt_49303bbf4faec0e38524` | LIVE · TZS 15,000 staked |
| 2026-08-14 08:36 | `mkt_02fe245420ecec12fc80` | LIVE · 0 bettors |

All three audit rows read `pollLinked: true, marketPublished: false`. The console told an
officer a market did not exist while players were betting in it — and the error text said
*"Do NOT retry"*, which is the one instruction that would have made it worse.

**What the threshold is for, stated so it is not re-litigated.** It is the **autopilot's
admission test**: it stops the unattended pipeline (news → extract → filter → verify →
score) promoting a weak candidate on its own. That is a real control and it is unchanged —
an unattended candidate scoring 52 is still `FILTERED_OUT`, and `test:aipoll-publish` asserts
it in the same run as the waiver, so "fix the false alarm" and "delete the gate" cannot pass
the suite identically. What changed is only its **scope**.

**Nothing is hidden.** The confidence is still recorded on the candidate and still shown to
the officer. A waived gate is written into the candidate's own layer-4 trace
(`scored:52:human_approved:{…}`) and audited as `candidate.confidence_gate_waived`
(category COMPLIANCE), so an auditor reading the record months later sees the override
rather than inferring it from a gap.

**And a second, independent rule — nothing goes live off a broken pipeline.** Every
pipeline step's return value is now checked, and checked **before** `createMarket`. Creating
a market is the irreversible act — it can only be voided with refunds, never un-created — so
it is the last thing that happens, after everything that can still fail has. That ordering is
the safety property; the scoping decision above is what stops it being exercised.

**Where this lives.** `src/lib/server/ai-poll-publish.ts` (extracted from
`publishPollAction` so it can be executed by a test at all) ·
`scoreCandidate({ humanApproved })` in `src/lib/server/market-candidate.ts` ·
`npm run test:aipoll-publish` (33 assertions) · `npm run red:aipoll-publish` (6 mutations,
including the production defect verbatim, with a positive control).

---

## 2026-07-24 · "Up & Down" product line — fee basis, instant settlement, notification digest

> ⏳ **DECIDED, NOT YET LIVE.** The decisions below are owner-authorised as of
> 2026-07-24 and the architecture is built around them, but the behaviour ships in
> Phases 3–5. Nothing in production behaves this way yet. This entry exists now so a
> future session does not "correct" the design back to the platform default without
> realising it was a deliberate, dated choice. Update this block when it goes live.

**Owner decision:** Ali, explicit, 2026-07-24, on a presented trade-off with the
arithmetic and the risks on the table.

**What Up & Down is.** A second product line: short-term price rounds (5/15/30 min) on
Gold and Silver, running in continuous chains. Each round is a `PredictionMarket` row
(`productLine: "UPDOWN"`, UP = YES, DOWN = NO), so **every money path — bet, settle,
refund, ledger, audit — is the existing, proven code.** Spec: `docs/UPDOWN-SPEC.md`.
Architecture: `docs/UPDOWN-ARCHITECTURE.md`.

### 1. Fee basis — `capped-commission` at 13% of the pool

> ⛔ **SUPERSEDED 2026-08-14.** Up & Down now charges `loser-share` — 13% of the LOSING
> side — exactly as long-form polls do. See the § 2026-08-14 entry at the top of this file,
> and [`docs/RULES.md`](RULES.md) §2.1. **Everything below remains a true account of the
> 2026-07-24 decision and of how the rounds frozen before the cutover still settle** —
> ⚠️ (**4,220** of them as of 2026-08-14 18:28 — read the live count from
> `scripts/live/ops/loser-share-settled.cjs` §4, never from a number typed here: it grew from
> 4,146 between this note being written and the cutover, and a stale count in a compliance
> document is exactly the kind of thing a regulator checks.)
> it is history, not the current rule. In particular the outcome-neutrality argument it makes
> no longer describes Up & Down; the 2026-08-14 entry records that consequence explicitly.

Up & Down rounds freeze `feeModel: "capped-commission"`, `commissionRate: 0.13`,
`feeCeilingRate: 1/3` — i.e. `fee = min(0.13 × pool, ⅓ × smaller side)`.

The management proposal is built on "13% commission on the total poll volume"
(TZS 1,300 on a TZS 10,000 pool). The platform default is `loser-share` — 13% of the
**losing** pool — which on a balanced round yields TZS 650, **half** the proposal's
figure. Rather than invent a third model, this uses the `capped-commission` maths that
already exists and is already tested (`test:fee-model`, 77 assertions) at a 13% rate,
which reproduces the proposal's number exactly.

**Why this is the safer of the two for the licence:** `capped-commission` is
**outcome-neutral** — the fee is a function of the two pool sizes and nothing else, so
it is byte-identical whether UP or DOWN wins. That is the property the pari-mutuel
licence rests on (`docs/F6-LIQUIDITY-DESIGN.md` §3.1). `loser-share`, the model
long-form polls now use, is outcome-dependent and was itself an explicit owner
override. Up & Down therefore sits *closer* to the licence posture, not further from it.
The ⅓ ceiling preserves the winner floor: a winning bet can never be paid below stake.

⛔ **The two models never mix.** The model is frozen per poll at creation; long-form
polls keep `loser-share`, Up & Down rounds keep `capped-commission`, and
`snapshotOrLegacy` reads only what each poll froze.

### 2. Settlement is IMMEDIATE — the objection window does not apply

Winners are paid the moment the outcome is confirmed. The platform-wide 24-hour
objection window is **not** applied to Up & Down rounds.

**Why.** A five-minute round that pays out tomorrow is not a five-minute round. Holding
~800 pools/day open for 24 hours would also mean thousands of unsettled pools standing
at any moment.

**What still protects the money — none of this is bypassed:**
- The **standing-objection freeze** still runs. Settlement calls the normal
  `settleMarket()` gate, **not** `force`, so an objection filed against a round still
  stops its money.
- The already-settled idempotency guard, the winner floor and exact conservation are
  untouched.
- Every round stores a **full settlement proof**: open price, close price, both source
  links, and **both timestamps the source itself quoted**. This is materially stronger
  evidence than a long-form poll carries, because it is machine-checkable by the player.
- Disputes are handled **after** payout, with `emergencyVoidMarket` as the audited
  reversal path.

**The honest limitation, stated plainly:** the pre-payout dispute window is the control
being traded away. It is replaced by stronger evidence and a post-payout reversal, not
by nothing — but a player cannot freeze a round before it pays.

### 3. Per-round notifications are digested

Per-round bet-placed / win / loss **notifications and emails are suppressed** for
Up & Down and replaced by an in-app result plus a **daily digest**. A player running
twenty rounds an hour would otherwise receive forty emails, which is both unusable and
a worse RG signal than a single readable summary.

⚠️ **The money record is NOT digested.** Transaction, ledger and audit rows are written
per round exactly as today. Only the player-facing *notification* is aggregated. Loss
notifications remain direct and non-euphemistic within the digest (LCCP harm-prevention
— see the loss-notification rule in `CLAUDE.md`).

✅ **IMPLEMENTED 2026-08-03** — `src/lib/server/updown-digest.ts`, on the lifecycle ticker.
Until then only the *suppression* half existed, and the digest sentence above was a claim about
a system that did not exist: measured on production, **0 of 13 winning and 0 of 11 losing** Up &
Down positions had ever produced a notification. Worse, `perEventNotificationsSuppressed` was
never applied to the refund emitters, so **56 of 56 refunds did** — the policy kept the one
outcome where nothing happened to the player's money and deleted the two that moved it. Both
halves are now closed; the digest states wins, losses **and** refunds, each with its own count
and its own figure, and the loss clause is never folded into a net number. Guarded by
`npm run test:updown-digest` (72 assertions, proven RED against six reintroduced defects).

### 4. Resolution stays on the AI sentinel

No external price-feed contract. The cost/latency/determinism trade-off was presented
and the AI path chosen. It is made sound by an **immutable observation ledger**: a price
is read once per (asset, grid boundary) and shared by every round edge on that instant,
enforced by `@@unique([assetId, boundaryAt])`. Consequences: one AI call per asset per
boundary instead of one per round, and round N's close **is** round N+1's open — so the
AI can never disagree with itself between adjacent rounds, because it is never asked
twice. A reading whose source-quoted time is too far from the boundary is **refused**,
and a boundary that will not confirm **VOIDs its rounds with a full refund** rather than
settling on a guess.

**Guardrail for future work (⛔):** do not "optimise" the observation ledger into
per-round price columns, and never update a CONFIRMED observation's price. Both would
silently reintroduce the possibility of two adjacent rounds disagreeing about the same
instant.

---

## 2026-07-24 · Single-admin resolution by default; two-admin authorization optional; officer-conflict block removed

**Owner decision:** Ali, explicit, 2026-07-24 (authorised in-session): *"when solo admin, allow
him to resolve even if he holds a position in it — we should end this matter forever,"* and *"one
place controls one thing."*

**What changed.** Market resolution used to be a mandatory **two-officer ceremony** (stage-1 by A,
stage-2 by a different B), and an officer holding a position was **hard-blocked** from resolving.
Both are retired:

- **Single-admin resolution is the permanent DEFAULT, in ALL money modes (LIVE and TEST).** One
  admin resolves any market in ONE action — **including a market they hold a position in.** Their
  own position settles like any player's.
- **Two-admin authorization is an OPTIONAL toggle** (`resolution-policy.ts`, flag
  `requireTwoOfficer`, default `false`), switchable from the **resolver-queue header** only —
  ONE control, ONE place. When ON, the classic two-distinct-officer ceremony returns (B ≠ A gate).
- **There is NO real-money hard-lock** on this — unlike the (now-removed) 2026-07-17 solo-override.
  It is the owner's call in every mode, consistent with the auto-resolve precedent (below).
- **The officer-conflict block is deleted** from `resolveMarket` AND `emergencyVoidMarket`.

**Why this is acceptable to the compliance posture:** the relaxed control is the *pre-payout*
authorization step, not the money movement. Every payout is still gated by the untouched controls —
the objection window (`TOO_EARLY`), the objection freeze (`OBJECTION_OPEN`), the already-settled
idempotency guard, the winner-floor and exact-conservation — and **every** resolution writes an
immutable ADMIN audit (`market.adjudicated`) tagged `resolutionAuth: "single-admin" | "two-officer"`.
The toggle change writes a COMPLIANCE audit (`resolution.two_admin_enabled` / `…_disabled`). Player
and public surfaces state the truth: a single-officer resolution shows "Resolved by an officer
against the declared public source" (never a fabricated two-signature claim); the two-officer badge
shows ONLY for two genuinely distinct human officers.

**One-place-one-thing cleanup:** `test-overrides.ts` (`allowConflictedResolution`,
`getConflictedResolutionAllowed`, `isConflictOverrideHardLocked`, `setConflictedResolutionAllowed`,
`assertProductionComplianceLocks`), the conflict-override toggle + action, and the
`assertProductionComplianceLocks()` boot call are **deleted**. A `content-integrity` guard (`RESOLVE`)
fails the build if any of those symbols — or an import of `test-overrides` — returns to `src/**`.

**Guardrail for future work (⛔):** do NOT re-add an officer-conflict block or a second place that
edits the two-admin flag (e.g. RateConfig / `/admin/config`). The single flag lives only in
`resolution-policy.ts`, set only from the resolver-queue header.

**Code:** `src/lib/server/resolution-policy.ts` (the one flag) · `market-service.ts`
(`resolveMarket`, `emergencyVoidMarket`) · `admin/resolver-queue/` (two-admin-toggle +
resolution-policy-action + page + resolve-controls) · `admin/resolver/[id]/` (page +
resolution-ceremony) · `resolution-panel.tsx` · `markets/[id]/page.tsx` · `page.tsx` ·
`fairness/page.tsx` · `i18n-dict.ts` · `email.ts`.
**Tests:** `test:two-admin` (single-admin default incl. position-holder + money conservation; two-admin
B≠A; simulated-LIVE no hard-lock; audit, 18/18) · `test:officer-conflict` (position-holder can
resolve/void; evidence; predicate, 21/21) · `test:settlement-gate` (single-admin path hits the same
gate, 121/121) · `content-integrity` `RESOLVE` guard.

---

## 2026-07-24 · Operator-switchable payment provider (mock ↔ Selcom), any money mode

**Owner decision:** Ali, explicit, 2026-07-24: *"we are admins, we control the system — allow us to
toggle anytime, LIVE or TEST; we can change later."*

**What changed.** The mock provider used to be **hard-locked off whenever real money was LIVE** —
`setPaymentControls` refused to persist `provider=mock`, `resolveActiveAdapter` refused at dispatch
(`PROVIDER_DOWN` + SECURITY audit), and `demoAsync` was force-off. That forced pre-launch testers
onto real Selcom. Those hard-locks are **removed**. Admins may now switch the provider — **including
to the mock** — from `/admin/payments` in **any** money mode, with no Railway env change or redeploy.

**The guardrails that replace the locks (not blocks):**
- **The mock is a self-contained simulator** — it does not touch the real payment gateway in either
  direction. Selecting it while real money is LIVE is a deliberate **simulation**.
- **Typed confirm.** Switching to the mock while `isLiveMoneyMode()` requires typing `MOCK` in the
  control-plane confirm (hard tier).
- **Persistent banner.** While the mock is active on real money, `/admin/payments` shows a loud,
  role="alert" banner (`simulationActiveOnLiveMoney`) and the active-provider chip reads "· SIM";
  the boot alarm logs a NOTICE. It can never run silently.
- **Audited.** The switch writes a COMPLIANCE audit (`payments.simulation.activated`), and each
  dispatch under the live-money simulation leaves a `payments.simulation.dispatch` breadcrumb.
- **The ONE surviving gate:** a REAL provider (`selcom`/`azampay`) still cannot be selected until its
  credentials are present — otherwise every call would fail.
- **The kill-switch remains the emergency STOP** — to halt payments, use it, not the mock.

**Why this is acceptable:** the state is impossible to reach by accident (typed confirm), impossible
to leave running unseen (persistent banner + audit + boot notice), and cannot move real funds (the
mock does not reach the real rail). Provider selection is an operational, reversible control — not a
money-minting one (that is `TEST_FUNDING`, which stays deployment-level and is NOT here).

**Code:** `src/lib/server/payment-control.ts` · `payments.ts` (`resolveActiveAdapter`) ·
`admin/payments/control-plane.tsx`.
**Tests:** `test:payment-control` (mock selectable + dispatch runs the simulator in LIVE; demo-async
settable; credential gate remains; simulation flag, 39/39) · `test:payment-killswitch` (kill-switch
still the stop, 11/11).

---

## 2026-07-24 · Per-market scheduled resolution: operator-controlled auto-resolve + timer-driven settlement

**Owner decision:** Ali, explicit, 2026-07-24 (authorised in-session), as part of replacing the
poll-everything lifecycle sweep with a precise **per-market timer** keyed to each market's own
resolution date (`src/lib/server/market-scheduler.ts`).

Two compliance-relevant postures change here. Both are deliberate.

### 1. Auto-resolve — the operator's toggle governs, in BOTH money modes

**Control:** `resolutionMode` — `"human"` (default) or `"auto"` — global at
`/admin/resolver-queue` (kit `Toggle` + `ConfirmModal`), with an optional per-market override
(`PredictionMarket.resolutionMode`).

- **`human` (default):** at a market's resolution time the AI web-checks the outcome and
  **pre-fills a recommendation**; two officers then seal + settle it. Unchanged behaviour.
- **`auto`:** the AI **seals the outcome itself** — stamping RESOLVED and opening the objection
  window — **without the two-officer ceremony**.

**This overrides the two-officer / POCA §16 rule when enabled.** Ali's directive was explicit:
*the toggle works as toggled — LIVE or TEST, the operator decides.* So, unlike the
solo-resolution override below, there is **deliberately NO real-money hard-lock** on this control.
It is the owner's call, taken with the consequence stated on screen (the confirm dialog is sterner
still when real money is LIVE).

**The safety floor that is NOT negotiable (and must not be removed):**
- **Never auto-resolve on a shaky signal.** Auto fires only when ALL hold: the AI returned a
  concrete YES/NO (never UNKNOWN), said the outcome is irreversibly *determined*, cleared
  `resolveConfidenceThreshold` (default **90**, min 50), and supplied real evidence (a
  hallucination guard). Anything less **always** falls back to the human ceremony. This is the pure,
  exhaustively-tested `decideAutoResolve()`.
- **Money still waits.** Auto-resolve adjudicates only — it moves no money. The objection window,
  the objection freeze, the winner-floor and exact-conservation all still gate the payout.
- **Never silent.** Every auto-resolution writes a COMPLIANCE audit (`market.autoresolved`) with the
  AI's outcome, confidence, evidence, reasoning and source URL; every mode change writes
  `market.resolution_mode.auto_enabled` / `…human_restored` with the money-mode it was made in.

### 2. Settlement is timer-driven — `AUTO_SETTLE` is removed

**What changed:** the `settleDueMarkets()` sweep, its heartbeat, the `AUTO_SETTLE` env var, the
`autoSettle` control-plane toggle and `getAutoSettleEnabled()` are **all deleted**. Each
adjudicated market now carries its own **settle timer** that fires at its `objectionsClosedAt` and
calls the unchanged `settleMarket()`.

**This reverses the earlier "automatic market payout is PAUSED" posture** (Ali, 2026-07-13), under
which every payout was a manual officer action. That entry is superseded — do not restore it.

**Why this is safe:** the pause was a coarse "nothing pays itself" switch standing in for the real
controls. Those real controls are untouched and are re-checked under the market lock on every
attempt: the objection window (`TOO_EARLY`), a standing objection (`OBJECTION_OPEN`), the
already-settled idempotency guard (no double-pay), the winner-floor assertion, and exact
conservation. **The payout maths is byte-for-byte unchanged** (loser-share / capped-commission per
the poll's frozen snapshot — see the 2026-07-23 entry). Settlement credits a player's 50pick
wallet; it is not a gateway disbursement, so it does not depend on the withdrawal rail.

**What remains as the human fallback:** `/admin/settlement` keeps the manual **Settle now** button
and the objection-frozen view. Anything sitting in "Ready to settle" now means a timer was dropped —
the ~5-minute `reconcileMarketSchedules()` backstop re-arms it, and `/admin/system` shows live
scheduler health (armed timers + next fire).

**Guardrails (⛔):**
- Do **not** re-introduce a `NODE_ENV`/real-money hard-lock on `resolutionMode` — Ali decided the
  toggle governs directly. (This is the deliberate *difference* from the solo-resolution lock below;
  the two controls are not the same and must not be "harmonised".)
- Do **not** lower or bypass the confidence floor, the evidence guard, or the UNKNOWN→human
  fallback. Auto-resolve on a shaky signal is the one thing this design must never do.
- Do **not** resurrect `AUTO_SETTLE`/`settleDueMarkets` or re-add a global settlement pause switch.
- Do **not** let the resolve trigger close a market **early** (before `resolutionAt`) when the AI has
  no locked outcome — the `early-noop` guard exists so a manual re-check cannot kill live betting.

**Code:** `market-scheduler.ts` (timers, `nextDeadlineFor`, boot hydrate, reconciler) ·
`market-service.ts` (`resolveDueMarket`, `decideAutoResolve`, per-market notify transitions) ·
`market-sentinel.ts` (per-market AI check only — the global sweep is gone) ·
`market-config.ts` (`resolutionMode`, `resolveConfidenceThreshold`, `resolveOffsetMinutes`) ·
`admin/resolver-queue/` (mode toggle + per-market re-check).
**Tests:** `test:scheduler` (deadline matrix, >24.8-day timer chaining, boot hydrate never skips a
missed deadline, reconciler healing, concurrent-fire exactly-once, the full auto-vs-human matrix,
the early-re-check guard, and auto-seal → window → settle) · `test:settlement-gate` (the payout gates).

---

## 2026-07-23 · Fee model: "loser-share" (Jay) + pre-bet estimate — new polls

**Owner decision:** Ali, explicit, 2026-07-23 (authorised in-session), on the recommendation
of accountant Jay (`Proposal/50pick Calculations.xlsx`, reviewed in `docs/FEE-MODEL-DECISION-2026-07-14.md`).

**What changed (FUTURE polls only):** a new fee model, `loser-share`, is now the default a
new poll freezes at creation:
- **Fee = (platformFeeRate + operatorFeeRate) × the LOSING pool** (Jay's default: 3% + 10% =
  **13% of the losing side**), instead of `capped-commission`'s `min(commission·pool, ⅓·smaller)`.
- **Players see a fixed "possible winnings" estimate** pre-bet = `stake × (1 + estimatedWinningsRate)`
  (Jay's default 0.5 → **1.5×**), with a mandatory "estimate only — the pool sets the real
  amount" disclaimer. This is shown ONLY on `loser-share` polls.
- Admin-managed at **/admin/config → Fee model** (`feeModel`, `platformFeeRate`, `operatorFeeRate`,
  `estimatedWinningsRate`, `showEstimatedWinnings`); a change requires a confirm and is audited.

**Two compliance postures this DELIBERATELY overrides (for `loser-share` polls only):**
1. **Outcome-neutral fee (F6 §3.1).** `loser-share` is outcome-DEPENDENT — the fee is a slice
   of whichever side loses, so the same pools yield a different fee per outcome. This is an
   explicit owner override; the settlement audit records `payoutModel: "whole-pool-loser-share"`
   and the two rate slices so an inspector can still recompute it.
2. **Policy D3 (no pre-bet payout number).** `loser-share` polls show the fixed 1.5× estimate
   before betting. The disclaimer keeps it honest (it is a marketing estimate, not the payout).

**What did NOT change (the safety rails hold):**
- **No mint / no leak.** `Σ payouts + fee == pool` exactly, proven under `loser-share` by
  `money-invariants` (default is now loser-share), `jay-fee-model`, and `ledger` (double-entry).
- **Winner floor.** A correct call is never paid below its stake — `netPool = winningPool +
  losingPool·(1 − rate) ≥ winningPool`, `assertWinnerFloor` still enforced.
- **Taxes out of OUR fee.** TRA 10% + GBT 5% still come out of the 13%, never the player.
- **No mixed maths — the whole point.** The model is FROZEN per poll (`feeSnapshot.feeModel`,
  schema `v:2`). Every poll created before this change has NO `feeModel` and is read as
  `capped-commission` forever (`snapshotOrLegacy`), so existing/in-flight/settled polls are
  untouched. `capped-commission` remains fully implemented and tested (`fee-model.test.mts`,
  pinned to it).

**Where it lives:** `src/lib/payout.ts` (`FeeModel`, `poolFee(…, winningSide?)`),
`src/lib/server/market-config.ts` (RateConfig + snapshot), `market-service.ts` (settlement
passes the winner), admin `config/` (kit `Select` + `Toggle`, a kit `ConfirmModal` that warns
on EITHER model switch, and a per-model description that updates on select) + `markets/new`,
player `conviction-dial` / `bet-confirm-modal`, and the help FAQ / hedge copy (model-aware).
Golden test: `scripts/loser-share-fee.test.mts` (reproduces the accountant's sheet: 84,500 / 2,080).

**Naming (owner directive):** the product NEVER brands the model after the accountant. UI + code
call it **`loser-share`**; "Jay" appears only as the person who proposed it, and only in this
decision log. Do not reintroduce "Jay" into UI/code.

**Accountant visibility:** `/admin/finance` has a **"Settlement fees by poll"** card
(`analytics.settlementFeesByPoll(period)`) listing each settled poll's fee MODEL + fee + operator
net for the period, with per-model totals — so an accountant can reconcile which model applied to
which poll. The per-poll fee is recomputed from the poll's frozen snapshot (equals the booked
commission). The `/admin/markets/[id]` view also shows the model + both-outcome fees per poll.

**Guardrail (⛔):** do not "restore" outcome-neutrality or D3 for `loser-share` polls — the
override is intentional and owner-authorised. Do not change existing polls' frozen model. Do
not delete the `capped-commission` model (existing polls settle on it).

---

## 2026-07-21 · Player terminology: "one-sided market" → "one-sided win" (licence)

**Owner decision:** Ali, explicit, 2026-07-21 (authorised in-session). **Critical for the
GBT licence — apply everywhere.**

**What changed:** every textual occurrence of the term **"one-sided market"** (and
"one-sided markets") is now **"one-sided win"** — the player-facing disclaimer label in all
three locales, the code comments/audit-reason text, and the design docs:
- UI (`src/lib/i18n-dict.ts` → `market.oneSidedMarket`): EN "One-sided win" · SW
  "Ushindi wa upande mmoja" · ZH "单边获胜" (rendered on `/markets/[id]` when a pool is
  all on one side).
- Code: `market-service.ts` settlement comment + the `market.resolved.one_sided_refund`
  audit `reason` string.
- Docs: `F6-LIQUIDITY-DESIGN.md`, `perfection-plan.md`.

**What did NOT change (deliberate scope):**
- The **mechanic is identical** — a one-sided pool still issues a **full refund at 0% fee**
  (no money moves differently). Only the *label* changed.
- The disclaimer **body copy stays factually truthful** — it still explains that every stake
  is refunded and there is no opposing pool to pay winnings from. We do **not** claim anyone
  "wins money" on a one-sided pool (that would violate the A‑5 no-fabrication rule). The
  prominent term is the licence-preferred "win"; the explanation remains the honest refund.
- The **machine identifiers are unchanged** on purpose — the audit action stays
  `market.resolved.one_sided_refund`, and the code symbols (`isOneSided`, `notifyOneSidedRefund`,
  `oneSidedRefundHtml`, the `oneSidedMarket` i18n key, `oneSidedBody`) keep their names.
  Renaming symbols is refactoring with no licence value and real regression risk; the licence
  concern is the *text a player/regulator reads*, which is now consistent.
- Other "one-sided" **mechanic phrases** ("one-sided refund/pool/poll") are left as-is — they
  are not the "market" term and are accurate descriptions of the refund.

**Guardrail (⛔):** do not revert "one-sided win" back to "one-sided market" in player copy or
docs, and do not "correct" it to imply a real cash win — the body must keep truthfully
describing the full refund.

---

## 2026-07-17 · Solo-resolution override: real-money-state lock (replaces the NODE_ENV hard-lock)

> ⚠️ **HISTORICAL — SUPERSEDED by the 2026-07-24 "Single-admin resolution by default"
> entry above.** The `allowConflictedResolution` override, its hard-lock
> (`isConflictOverrideHardLocked`), the officer-conflict block and the whole
> `test-overrides.ts` module were **removed**. Single-admin resolution is now the
> permanent DEFAULT with no hard-lock, and two-admin authorization is the optional
> toggle. Kept for provenance; do NOT restore anything described below.

**Owner decision:** Ali, explicit, 2026-07-17 (authorised in-session).

**Control:** `allowConflictedResolution` (the "solo resolution" toggle on
`/admin/resolver-queue`). When ON it lets ONE officer resolve a market end-to-end
even if they hold a position in it — relaxing the POCA §16 officer-conflict block
AND the two-officer / self-countersign rule. Their own position settles like any
player's.

**Why POCA §16 matters:** a licensed operator must never let an officer with a
financial interest in a market decide its outcome — otherwise an admin could pay
their own bets with real money. This is a GBT licensing requirement.

**What changed:** previously (audit C7, 2026-07-15) the override was
UNCONDITIONALLY disabled whenever `NODE_ENV === "production"`. That made it
impossible to exercise solo-resolution on the production 50pick.tz deployment,
which blocked pre-launch testers. Per Ali's decision, the lock now keys off
**real-money state**, not NODE_ENV:

- `isConflictOverrideHardLocked()` = `NODE_ENV === "production" && TEST_FUNDING !== "true"`.
- `getConflictedResolutionAllowed()` returns `false` whenever hard-locked, else the
  persisted admin flag governs.

**Net behaviour:**
| State | Solo-resolution |
|---|---|
| Local / staging (`NODE_ENV !== production`) | admin flag governs |
| **Pre-launch prod** (`TEST_FUNDING=true`, test float, no real money) | **admin flag governs — testers CAN enable it** |
| **Real money live** (`TEST_FUNDING` unset at go-live) | **HARD-LOCKED off, flag ignored** |

**Why this is safe:** the relaxation is bound to the *provable no-real-money* state.
Unsetting `TEST_FUNDING` is already a **required go-live step** (`LAUNCH-GO-NO-GO`
§5) — the same action that stops minting the test float also auto-hard-locks
solo-resolution. You cannot have real money live with the override active. And
`TEST_FUNDING=true` on real money would itself mint un-ledgered money that the
nightly trial-balance screams about immediately, so the failure mode is already
loudly detected by an independent control.

**Defence-in-depth + trail:**
- The toggle action refuses to ENABLE when hard-locked (`enable_blocked` COMPLIANCE
  audit); it can always be turned OFF.
- The resolver-queue UI renders a clear "Solo resolve · locked (live)" disabled
  state when hard-locked, so a tester is never confused by a toggle that won't latch.
- The boot check logs loudly if the flag is left ON with real money live (runtime
  still forces it off), and a friendly note when it's active pre-launch.
- Every toggle and every actual bypass (`market.resolve.conflict_overridden`,
  `market.resolve.solo_overridden`) is written to the COMPLIANCE audit chain.

**Guardrail for future work (⛔):** do NOT re-widen `isConflictOverrideHardLocked()`
to a plain persisted flag, and do NOT revert it to a raw `NODE_ENV` lock without
re-reading this entry. The lock MUST stay coupled to real-money state.

**Code:** `src/lib/server/test-overrides.ts` · `admin/resolver-queue/conflict-override-action.ts`
· `admin/resolver-queue/conflict-override-toggle.tsx` · `admin/resolver-queue/page.tsx`.
**Tests:** `test:conflict-gate` (the lock matrix, 10/10) · `test:solo-resolution`
(full effects, 18/18) · `test:officer-conflict` (33/33).
