# SESSION PROMPT · THE GAMING BOARD'S 15 COMMENTS — a regulator's requirement list, and what the code says about delivering each one

**Source:** `50pick_website_comments-2.pdf` — *"Website Development Comments"*, prepared by **Jay**,
2026-08-19, 15 items with screenshots.
**Written:** 2026-08-19, immediately after E-167 shipped (`5055cea5`).

> ⭐ **WHO JAY IS, AND WHY IT CHANGES HOW THIS DOCUMENT READS.** Ali, 2026-08-19: *"Jay is from
> Gaming Board — anything he says is actually legit, we just do it."*
>
> These are not stakeholder preferences to be weighed against engineering taste. **They are
> requirements from the licensing authority, and the default answer to every one of them is
> IMPLEMENT.** This document exists for one narrower purpose: to say, per item, **what the code
> already does** (so nothing is built twice), and **where physical reality constrains delivery** (so
> the two items that need a purchase or a decision get reported back to him promptly instead of
> quietly slipping).
>
> ⛔ **Nothing below is a refusal.** Where an item cannot be delivered as literally described, the
> entry says what *can* be delivered, what it costs, and **exactly what to put in front of Jay** so
> he can decide. A regulator asking for the impossible has been given a wrong description of the
> system by us; the fix is a better description, not a "no".

---

## §0 · THE STANDARD, AND THE ONE THING TO GET RIGHT ABOUT ITEM #1

**The house standard, unchanged:**

- 🔴 **Real data or nothing** (A-5). A surface with nothing to show says so. No fabricated zero, no
  placeholder that reads like a value.
- ⛔ **Every change ships with a guard proven RED against the defect**, plus a positive control in
  the same run. A refusal with no positive control is an absent test.
- ⛔ **Docs move with the code, in the same commit.**
- 💰 **State the money position in the handoff**, first and plainly, whether or not money moved.
- ⛔ **`test:all` with `DATABASE_URL` UNSET before each commit**, not batched at the end.

**And one thing specific to this list:**

⭐ **ITEM #1 REVERSES A DECISION THE CODE ATTRIBUTES TO THE GAMING BOARD ITSELF, so the attribution
has to be rewritten or the next session will re-add the gate citing Jay's own institution.**
`docs/FLOWS.md:30` currently reads:

> *"Bet placement (no KYC required). Allowed pre-KYC (**TZ Gaming Board model**). KYC only gates
> withdrawals."*

That line is the reason the gate exists. Once #1 is implemented that line is **superseded**, and
leaving it in place is how a "fix" gets reverted six weeks later by someone reading the docs
correctly. See Unit A.

---

## §1 · THE TRIAGE TABLE — what to build, what already exists, what needs a decision from Jay

| # | Requirement | Status | Where the truth is |
|---|---|---|---|
| 1 | Remove KYC from withdrawals | ✅ **AUTHORISED — implement.** The authority that put the gate there is the authority removing it. ⛔ Record the attribution and keep the adjacent AML controls, which come from a different regulator | `wallet-service.ts` · `docs/FLOWS.md:29-30` · `docs/NIDA-POLICY.md` |
| 2 | UD: next round ready while the current resolves; "AI searches 30s before the end" | 🟢 **ALREADY DELIVERED (E-166) — demonstrate it, don't rebuild it.** The 30s pre-open specifically cannot be built; §2 has the paragraph to send Jay | `updown-board.ts` · `handover-gap-census.cjs` |
| 3 | Delete button on Add Chain | ✅ **BUILD — as archive + zero-round delete.** A hard delete cascades over settled rounds, i.e. over the settlement record the Board audits | `schema.prisma` `onDelete: Cascade` · E-63 |
| 4 | Redirect to results when a round/poll ends; split Yes/No and Up/Down | ✅ **BUILD.** Redirect exists for UD only; the split results view is genuinely absent | `results/page.tsx` · `updown-handover.tsx` |
| 5 | Remove Cash Back Deposit | ✅ **BUILD** — hide the offer, keep the ledger path so granted bonuses still settle | `components/ui/cashback-promo.tsx` |
| 6 | Date beside every closing timer | ✅ **BUILD.** Days already show; the absolute date does not. ⚠️ Timezone is the whole risk | `components/markets/countdown.tsx` |
| 7 | Standalone Selcom page: C2B + B2C balances and statements | ✅ **BUILD.** B2C float already exists on `/admin/payments`. ⛔ Never conflate ledger with rail | `admin/payments/page.tsx` · `payments-now.cjs` |
| 8 | Prefill deposit/withdraw phone with the registered number | ✅ **BUILD.** Today it repopulates from the URL only | `wallet/withdraw/page.tsx:59` |
| 9 | Keep UD bets in the notification inbox | 🟢 **ALREADY THERE** — his own screenshot is the daily digest. One question in §6 before adding more | `updown-digest.ts` |
| 10 | Settled rounds in the results section | ✅ **BUILD — highest value in the list.** ⛔ Carries the labelling trap that already produced a wrong word over a real bet | `results/page.tsx:366` |
| 11 | Add S&P 500, USD/CNY, USD/CAD, GBP/USD, USD/JPY, KES/USD, ZAR/USD | 🟡 **TWO SHIP NOW · FOUR NEED MEASUREMENT · S&P 500 NEEDS A PURCHASE.** §2 has what to send him | `updown-symbols.ts:194-209` |
| 12 | Customer-care admin: ticket search + customer history | ✅ **BUILD.** `SUPPORT` role exists; the surface does not | `schema.prisma:25` · READ_TIERS |
| 13 | Group email `msaada@50pick.tz` | ✅ **DO — mostly infrastructure** (DNS + Postmark + mailbox group), then wire the address into the app's support copy | `docs/EMAIL-SIGNATURES.md` |
| 14 | Authority to re-categorise a bet/poll | ✅ **BUILD — confirmed absent.** Category is set once in the creation wizard and never editable after; audit the change and keep the licence exclusion | `markets/new/wizard.tsx:91` |
| 15 | Test the bonus system before going live | ✅ **DO.** Five unit suites exist; the live end-to-end drive does not | `package.json` `test:bonus*` |

**Nothing on this list is declined.** Twelve are build-and-ship. Two are already delivered and need
*demonstrating* to Jay rather than rebuilding. One (#11) is partly a purchase decision.

---

## §2 · THE THREE ITEMS THAT NEED SOMETHING SENT BACK TO JAY

### ✅ #1 · Remove KYC from withdrawals — authorised, and here is how to do it without losing the record

**What is there now.** KYC-approved is a **server-side** gate at
**`wallet-service.ts:1285-1288`**, not a UI inconvenience. `/wallet/withdraw` also renders a
`KycLock` and computes `canSubmit = kycApproved && payoutsOpen`, but the service refuses
independently:

```ts
const kyc = await db.kyc.findByUserId(userId);
if (kyc?.status !== "APPROVED") {
  audit({ category: "COMPLIANCE", action: "withdraw.kyc_blocked", … });
  return { ok: false, error: "Verify your identity to withdraw.", code: "INVALID", reason: "kyc_required" };
}
```

The trust ladder is written into the code beside the deposit gate — *browse free → verify email to
deposit → KYC to withdraw* — with the reason given as *"a heavier check for money leaving."*

⚠️ **`docs/FLOWS.md` points at the wrong lines.** Its row cites `wallet-service.ts:100-104`; that is
the **deposit** email gate. The withdrawal gate is at **1285-1288**. Fix the reference while you are
in there — a stale line number in the one document a session is told to follow is how the next
person concludes the gate is somewhere it is not.

🔴 **AND `kyc_required` IS A MAPPED FAILURE REASON WITH EXACTLY ONE EMITTER — RETIRE THEM TOGETHER.**
`src/lib/failure-reasons.ts:93` declares it in the union and `:228` maps it
(`severity: "error", channel: "modal", key: "errVerifyIdentity"`), and line 1288 above is the only
place it is ever produced. Delete the emitter alone and the registry gains a **dead mapped code** —
which is precisely the defect session 47 filed: *"six `REASON_BY_CODE` rows mapped codes NOTHING has
ever emitted, while §9 proved them 'working' by synthesising the code itself."* So the guard would
report it healthy for ever. Remove the row, the union member and the dictionary key in the **same
commit** as the gate, and let `test:failure-reasons` prove the absence.

**Implement:** remove KYC as a **precondition of withdrawal**, on the server and on the page (a UI-only
change would leave the service refusing and produce exactly the E-5 defect — a screen promising what
the next screen refuses).

⛔ **THREE THINGS THAT MUST SURVIVE THE CHANGE, and each for a different reason:**

1. **The KYC system itself.** `docs/NIDA-POLICY.md` records *"Uniqueness — one NIDA, one account"*,
   enforced and audited as `kyc.nida.duplicate_blocked`, and *"Document review by a human — this is
   the real identity control."* Jay is removing a **gate on a payout**, not the identity system. KYC
   stays available, stays reviewable, and stays the thing an AML escalation can demand.
2. **The AML controls.** `/admin/aml` reasons in thresholds (`TWO_PERSON_THRESHOLD_TZS`, two-person
   review over a limit). ⚠️ **Those obligations do not come from the Gaming Board** — they come from
   the AML/FIU regime, which is a different authority. A Gaming Board instruction about KYC-on-
   withdrawal does not repeal them, so **do not touch them in this unit.** If Jay intends those to
   change too, that is a separate written instruction from the right body.
3. **The audit trail.** Keep a COMPLIANCE record of the *change* itself, and keep emitting an event
   when a withdrawal is made by an unverified account — not as a refusal, as a **fact**. That single
   record is what lets 50pick answer "why did you pay an unverified player?" with "because the Board
   instructed it on 2026-08-19, and here is every instance."

⭐ **AND REWRITE THE ATTRIBUTION, OR THIS GETS REVERTED.** In the same commit:

- `docs/FLOWS.md:29-30` — the row citing the *"TZ Gaming Board model"* as the reason for the gate is
  now **superseded**. Replace it with the new rule and the new attribution, dated, naming the source
  document.
- `docs/COMPLIANCE-DECISIONS.md` — a new dated entry: the instruction, who gave it, which document
  it came from, what changed in the code, and what deliberately did **not** (points 1–3 above).

⚠️ **Optional, worth putting to him in the same reply, because it is cheap and he may prefer it:**
the codebase already reasons in thresholds for AML, so *"KYC required above a cumulative lifetime
payout"* is a small variant that keeps a first small cash-out frictionless while still binding the
control in aggregate. If he wants the flat removal, do the flat removal — but he should know the
option existed, because he is the one who will be asked about it.

---

### 🟢 #2 · "The next round should already be active; the AI should search 30s before the end"

**Two of his three sentences are already delivered, and the third describes a mechanism we do not
have. Send him this, with screenshots.**

**(a) "When users wait for a round result, the next round should already be active."**
✅ **Already true, and measured rather than claimed.** `scripts/live/ops/handover-gap-census.cjs`,
over **every settled round in 24 hours (n = 1,203)**:

| Measurement | Value |
|---|---|
| successor **already open** when the result landed | **1,186 / 1,203 — 98.6%** |
| median (successor opens − predecessor resolved) | **−91.5s** — open a minute and a half *before* |
| median (successor created − predecessor resolved) | **0.1s** |
| successor still in the future | 16 / 1,203 — **1.3%** |

E-166 then built the handover on top of that measurement: a settled card names its successor, holds
2.5s, and moves the player to it. **Deployed.** Do not rebuild it.

**(b) "When 30 seconds remain, the AI should search for the next round so it is ready for betting."**
⛔ **This cannot be built as described, and the reason is a money guarantee — put it to him plainly:**

> A round's opening price is not chosen by us; it is read from the **dated one-minute price bar
> labelled with that round's own start instant**. That bar does not exist until roughly 19 seconds
> *after* the instant it names (and ~87 seconds for Solana). So a round cannot be opened 30 seconds
> **early** — there is nothing to open it at. When we did open rounds without a confirmed opening
> price, **175 consecutive rounds voided and refunded** over eleven hours while the price data was
> available the whole time. The engine now refuses to open a round it could only void.
>
> There is also no AI in this path. Round times are not searched for — they sit on a fixed grid
> derived from the chain's anchor, so every instance and every restart computes the same instants.
> The AI reads *prices*; it never decides *when* a round exists.

**(c) "Users should be able to play the next round while waiting for the current one to resolve."**
🟢 **This is the real deliverable, and it is a UI job.** The successor is already open ~91s before its
predecessor settles, so the bet is already *possible* — the question is whether a player can *see*
that. E-166's own post-mortem records the first attempt showing **two identical `02:50` three hundred
pixels apart**, because the successor is the card immediately to the left.

**Do:** with the fleet on a 3-minute chain, drive a real settle at 393/768/1024/1280/1440 × EN/SW/ZH
and answer one question from the frames — *can a player who has just seen a result tell, without
scrolling, that the next round is open and bettable?* Fix what the screenshots show. ⛔ Read §5 of
`docs/HANDOVER-E166-NEXT-SESSION.md` first: the win celebration dwells 7s and the handover moves at
2.5s, and they are safe only because the celebration is a kit `<Modal>` whose lock the auto-advance
reads. **A celebration rendered outside the kit modal loses a winner their moment.**

---

### 🟡 #11 · The seven markets — two ship now, four need measuring, one needs a purchase

`src/lib/server/updown-symbols.ts` is a catalogue built so that absences are **explained rather than
mysterious**. Against Jay's list:

| His symbol | Reality | Action |
|---|---|---|
| **GBP/USD** | ✅ already catalogued — `macro`, FX/metals week, 5 decimals, 2 ticks | **Enable now** |
| **USD/JPY** | ✅ already catalogued — `macro`, 3 decimals, 2 ticks | **Enable now** |
| **USD/CNY** · **USD/CAD** | ⚪ not catalogued | Add + **measure** (below) |
| **KES/USD** · **ZAR/USD** | ⚪ not catalogued, and **quoted the other way round** in market convention (`USD/KES`, `USD/ZAR`) | **Confirm the direction with Jay first** — a reversed pair inverts every Up and Down on the board |
| **S&P 500 (SPX)** | 🔴 two independent blockers, both already written down in the catalogue | **Report to Jay** |

**What to send Jay about the S&P 500**, both facts, because one is a cost and one is a delivery date:

> 1. **The data plan.** Our market-data provider returns **HTTP 404 for SPX on the tier we currently
>    buy** — the index needs their higher tier. This is a purchase decision, not development work.
> 2. **The trading session.** The S&P 500 trades a **cash session (~13:30–20:00 UTC)**, and our
>    calendar models two week-shapes today: 24/7 for crypto, and the FX/metals week for gold and FX.
>    Classified as either, the index would be treated as open overnight and at weekends, and every
>    round opened outside its session would void and refund. It needs its own session model built
>    before it can be listed — that is real work, and it is wasted until the data plan exists.

⛔ **AND ADDING AN ASSET IS NOT ADDING A ROW.** This catalogue is a monument to why: gold carries
`minMoveTicks: 40` and `minDurationMinutes: 15` because *"the feed disagrees with itself by up to
$0.87 at a single instant — about the size of a whole 5-minute gold move."* Silver and platinum are
deliberately given **no** measured minimum, with the reason recorded: *"nobody has measured their
seams — and inventing one from gold's would be exactly the guess this file exists to prevent."*

**So each new symbol, before it is enabled:** `decimals` and `minMoveTicks` measured from the live
feed (`ops:updown-probe-bars`, `ops:updown-probe-source`); the seam disagreement measured to set
`minDurationMinutes`; the session confirmed against `market-calendar`. **One asset per commit**, each
carrying its measurement in the catalogue entry the way gold's does. ⚠️ The real risk on an exotic
pair is the band: if the smallest legal move is a large fraction of a 3-minute move, the chain
refunds constantly — that is the SOL/USD lesson already in the file, and a regulator will hear about
it as "the game never pays".

---

## §3 · THE WORK, IN ORDER — with acceptance criteria

⭐ **The order matters because #10 and #4 share a surface.** Build the results view once, with both
product lines in it, rather than twice.

### ▶ UNIT A · #1 — the withdrawal gate, and its paper trail

Server + page + `docs/FLOWS.md` + `docs/COMPLIANCE-DECISIONS.md`, in one commit. Keep the KYC system,
the NIDA uniqueness rule and the AML thresholds untouched. Keep an audit fact for a withdrawal by an
unverified account.

**Acceptance:** an unverified player completes a withdrawal end to end on a live drive; the
COMPLIANCE record exists and names the instruction; `test:kyc-honesty` and the KYC suites stay green;
a guard proves the *page* and the *service* agree (E-5 was a screen promising what the next screen
refused, and it landed on the celebration screen).

### ▶ UNIT B · #10 + #4 — settled rounds reach the results page, split by product

**What is true now.** `src/app/results/page.tsx` is built entirely on `listMarkets`,
`MARKET_CATEGORIES` and `MARKET_SEARCH`. Up & Down rounds are **not on it at all** — the tell is line
366, which passes the literal `"MARKET"` as the product line to `outcomeWord`.

🔴 **THAT LITERAL IS THE TRAP.** `test:labels` §8 exists because *"a surface holding EVERY product
line must resolve its side words through the lexicon — the omitted third argument is the tell."*
Ali's own report — *"Up & Down says YES won, should be UP won"* — was this defect on other surfaces;
it was declared fixed **twice** before it was, with **three green guards over it**. Add UD rounds to
`/results` and leave that literal, and the results page will say **YES won over an Up bet** — in
front of the regulator who asked for the page.

**Build:** UD rounds on `/results` once settled, resolved through the same lexicon with the round's
real `productLine`; a visible split between long-form (Yes/No) and Up & Down; #4's redirect for
long-form markets reusing the handover's existing gates (it already defers to an open modal, a bet in
flight and the celebration lock). ⛔ **Use the kit's `FilterPill`** — ONE filter language, 8 rails,
and hand-rolling a ninth is a documented refusal.

**Acceptance:** a settled UD round is findable on `/results` in all three languages with the correct
side word; `test:labels` extended and proven RED against the hardcoded-`"MARKET"` version;
screenshots at five widths × three languages, no horizontal overflow.

### ▶ UNIT C · #6 — the date beside every timer

`components/markets/countdown.tsx` already renders a `days` cell (his screenshot shows **64 DAYS**),
so the gap is the **absolute date**.

⚠️ **THE TIMEZONE IS THE WHOLE RISK, and this project nearly filed a false money finding over it.** A
settlement proof reads `13:47:22 EAT` while the database holds UTC wall-clock, and a session was
spent concluding a correct page was wrong because the driver shifted a naive timestamp by the
reader's offset. One convention, resolved in one place: reuse the platform's `formatDateTime` /
`resolveRange` helpers, never a new `toISOString().slice()`.

**Acceptance:** closing and resolve timers show the same date in the same zone in all three
languages; a guard pins that the two agree and that neither derives its own format; no overflow at
393px.

### ▶ UNIT D · #8 — prefill the registered number

Today `prevMsisdn = sp.msisdn ?? ""` — repopulated from the **URL** after a failed submit, otherwise
empty behind a placeholder (`712 345 678`, a placeholder that must never become a value — A-5).

**Build:** default both deposit and withdraw to the account's registered msisdn, still editable.
⚠️ Withdrawals are the sensitive half — a defaulted payout destination is a convenience, not an
assumption. Keep it editable, keep every existing destination validation.

**Acceptance:** prefilled on both pages; a failed submit still round-trips what the player typed
rather than reverting; guard covers both.

### ▶ UNIT E · #5 — remove the Cash Back Deposit promo

`components/ui/cashback-promo.tsx`, plus `wallet/page.tsx`, `wallet/wallet-client.tsx`,
`wallet/deposit/page.tsx`, `admin/bonuses/*`, `bonus-config.ts`, `bonus-service.ts`, `i18n-dict.ts`.

⛔ **HIDE THE OFFER; DO NOT DELETE THE LEDGER PATH.** His words are *"disabled/hidden for now until
further notice"* — a feature-state, not a deletion. Any cash back already granted must still fulfil
and stay visible in the player's own history. Use the existing feature-state mechanism (the
4-state proposals switch is the precedent). ⚠️ **Check the live state after deploy** — that
precedent exists because a switch read differently in production than in the repo.

**Acceptance:** the promo renders nowhere for players; existing grants still fulfil; the five bonus
suites stay green; a guard asserts the surface is absent.

### ▶ UNIT F · #3 — a chain removal that cannot destroy the audit trail

🔴 **A HARD DELETE IS NOT SAFE, AND IT HAS ALREADY HAPPENED ONCE HERE.**
`prisma/schema.prisma`: `UpDownRound.chain` is `onDelete: Cascade`, so **deleting a chain deletes
every round it ever ran** — the settlement record for real money. `e63-window.cjs` exists because
**1,915 "failures" turned out to be rounds deleted with the board.**

⭐ **This is the one item where the regulator's own interest argues for the safer form:** the Board
audits settlement history, so the control he wants must not be able to erase it.

**Build:** an **ARCHIVE** state (hidden from the admin list and the player board, every round kept),
**and** a hard delete permitted **only when the chain has zero rounds** — the mistyped-chain case,
minutes old — refused with a stated reason otherwise.

⚠️ Also tell the operator what already works: **stop → start** fully recovers a chain
(`setChainState` nulls `nextBoundaryAt` on stop and recomputes a fresh one on resume). If the
underlying need is *"undo a chain I just created"*, archive plus zero-round delete covers it without
touching history.

**Acceptance:** removing a chain with rounds is refused, with the reason, and audited; the refusal
has a RED-proven guard; archived chains are invisible to players, visible to admins, and their rounds
still reachable by the healer's read.

### ▶ UNIT G · #7 — the Selcom page

**Exists:** `/admin/payments` shows the **disbursement float** (B2C) with a low-float warning and an
honest *"Unavailable"* when the float PIN is unset.
**Missing:** collections (C2B) balance, and one statement view covering deposits *and* withdrawals.

⛔ **THE ONE MISTAKE THIS PAGE MUST NOT MAKE**, from `scripts/live/ops/README.md`: separate
`BET_PAYOUT` (an internal wallet credit) from `WITHDRAWAL` (money actually leaving to Selcom).
*"Conflating them reads as 'payouts work' when the rail is untested."* Adding a ledger movement to a
rail movement produces a number that is true of nothing — and this page is for the regulator.

⚠️ **VERIFY FIRST** whether Selcom's API exposes a C2B balance at all. If it does not, the page says
so; it does not compute one from our own ledger and label it a Selcom balance (A-5).

### ▶ UNIT H · #12 (+ #13) — the customer-care surface

`SUPPORT` already exists in the role enum and `/admin/players` already holds customer history. What
is new is **ticket search** — there is no ticket system in the codebase.

⛔ **READ_TIERS IS THE GATE, AND IT IS NOT OPTIONAL.** The Final Audit remediation blocks `MODERATOR`
from money and PII, and an earlier audit found a **read-only auditor being offered the payment
kill-switches**. A support agent needs enough to help and no more. Design the tier in `docs/` first,
then build it through the data-driven matrix at `/admin/roles` — never a new hardcoded check.

⚠️ #12 and #13 are probably **one feature**: `msaada@50pick.tz` is the inbound side of a real ticket
system. Confirm with Jay (see §6) before building two things.

### ▶ UNIT I · #14 — re-categorise a market

✅ **CONFIRMED ABSENT.** Category is set **once, at creation**, in the wizard
(`admin/markets/new/wizard.tsx:91`, `fd.set("category", category)`). Everywhere else in
`/admin/markets` it is only **filtered** and **sorted** (`page.tsx:53, 67, 72, 77, 146`). There is no
edit control anywhere, so a market placed in the wrong category today can only be fixed by
re-creating it — which is exactly the problem Jay is describing.

Category is part of a market's **published** identity, so the change must be audited
(actor, before, after). ⚠️ **Keep the licence exclusion** — `MARKET_CATEGORIES` excludes politics by
licence, and re-categorisation must not become the way back in. If Jay wants that exclusion changed
too, that is its own instruction.

### ▶ UNIT J · #15 — prove the bonus system, end to end

**Not greenfield:** `test:bonus`, `test:bonus-restitution`, `test:bonus-betting`, `test:bonus-stress`,
`test:bonus-one-side` all exist.

⭐ **What is missing is the thing a suite cannot give you:** a real grant, spent on a real bet, on a
real round, settling to a real wallet, through the wagering requirement, to a real withdrawal. *"A
green suite is not proof"* — `qa:results-board` once passed 32 assertions on a board with zero rows,
where every promise/delivery pair was `0 ≤ 0`.

**Build:** one live drive on production with the fleet, recorded like the Up & Down money drives, with
the ledger read at each step and the `balance + hold` identity checked. ⚠️ Sequence **after** Unit E
(#5) — removing cash back changes what there is to test.

### ▶ UNIT K · #13 — the group mailbox

DNS + Postmark + a mailbox group for `msaada@50pick.tz`, delivering to both agents. Then wire the
address into the app's support copy and `docs/EMAIL-SIGNATURES.md` so there is one support address on
the platform, not two. ⚠️ **The Resend/Postmark key dies silently** — verify a real inbound and a
real reply, not just configuration.

---

## §4 · WHAT NOT TO DO

- ⛔ **Do not rebuild the Up & Down handover** (#2a). Shipped, deployed, measured at n=1,203, with a
  load-bearing coupling documented in `docs/HANDOVER-E166-NEXT-SESSION.md` §5.
- ⛔ **Do not pre-open a round before its boundary** (#2b). There is no opening price to open it with;
  E-83's 175 consecutive voids are the cost.
- ⛔ **Do not touch the AML thresholds or the NIDA uniqueness rule** while doing #1. Different
  authority, different instruction.
- ⛔ **Do not implement #1 in the UI only.** The service refuses independently; a page-only change
  reproduces E-5 — a screen promising what the next screen refuses.
- ⛔ **Do not hard-delete a chain** (#3). It cascades over settled rounds.
- ⛔ **Do not enable SPX** (#11) until the data plan is bought *and* a session kind exists.
- ⛔ **Do not hand-roll a filter control** (#4/#10). ONE `FilterPill`.
- ⛔ **Do not add a second auto-navigation mechanism** (#4). Extend the handover's gates.
- ⛔ **Do not write a new date formatter** (#6). One `formatDateTime`, one zone.

---

## §5 · THE LENSES, APPLIED — a checklist before any unit is called done

**UI/UX.** Does it survive **393/768/1024/1280/1440 × EN/SW/ZH**? Swahili and Chinese are where
labels overflow and where a check can pass **vacuously** — E-166 shipped a stopped-state assertion
that matched a timestamp and passed in SW and ZH while proving nothing. **Look at the frame; a green
suite is not a readable screen.**

**Theme-kit consistency.** Kit components only; extend the kit rather than adding an ad-hoc control.
`DESIGN_AUTHORITY.md` is the single door. The system is **FROZEN** with a ratchet that may only
shrink — and note `test:design-frozen` **exempts any line containing `var(--`**, so its green is not
coverage.

**Compliance.** For every unit: does this change what a regulator can reconstruct? Audit events are
part of the product, not instrumentation. Player surfaces never narrate internal ops (no vendor
names). Licence exclusions are not a filter to be re-opened by a side door.

**Integration / architecture.** One rule per concept, in one place: one date formatter, one lexicon,
one filter language, one feature-state mechanism. Every duplicated rule here has produced a finding —
E-49, E-56, the four drifts of the handoff anchor, the three copies of a refusal map.

**Money.** `balance + hold` is the identity. Decimal/NUMERIC, never float. Claim the row on every
write. State the money position in the handoff whether or not a shilling moved.

---

## §6 · WHAT TO SEND JAY — three questions and two demonstrations, in one reply

**Questions:**

1. **#11 · S&P 500** — our data provider does not serve SPX on the tier we buy (HTTP 404); it needs
   their higher tier. **Is that purchase approved?** And note it separately needs a cash-session
   calendar built, which is wasted work until the plan exists.
2. **#11 · KES and ZAR** — market convention quotes these `USD/KES` and `USD/ZAR`. **Confirm the
   direction**, because a reversed pair inverts every Up and Down on the board.
3. **#12 + #13** — is a ticket **system** wanted (inbound mail to `msaada@50pick.tz` becomes a
   searchable record), or ticket **search** over customer history, which mostly exists already?

**Demonstrations (screenshots, not prose):**

4. **#2** — the next round is already open and bettable while the current one resolves, in **98.6% of
   1,203 settles measured over 24 hours**, median 91.5 seconds early. Show him the board mid-handover.
   And explain the one part that cannot work: a round cannot open 30 seconds early because its
   opening price comes from a price bar labelled with its own start instant, which does not publish
   until ~19s *after* it.
5. **#9** — Up & Down notifications are already in the inbox; his own screenshot shows the **daily
   digest** (*"18 Aug: 38 rounds — won 13… Staked TZS 141,000, returned TZS 145,430"*). **Does he want
   one notification per bet?** A 3-minute chain runs ~480 rounds a day, so per-bet notifications
   would bury the inbox they are meant to serve. Confirm before building.

---

## §7 · THE FIRST THING TO DO IN THE SESSION

Not code. Two things, in this order:

1. 🔴 **BTC/USD 3m and ETH/USD 3m are STOPPED on production** (left over from the E-167 outage), so
   players have no 3-minute game on either asset. Start them and watch one full round open and
   settle. This is also the fleet needed for #2c, #10 and #15.
2. Re-grep the `E-` ids in `docs/LIVE-QA-CAMPAIGN.md` **at the moment you file**, not before. The last
   session's work was numbered E-119, then E-161, before landing on **E-167** — two ids were taken
   while it ran.
