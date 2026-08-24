# SESSION COMMISSION · THE GAMING BOARD'S 15 REQUIREMENTS — every one delivered, nothing skipped

**Source:** `50pick_website_comments-2.pdf` — *"Website Development Comments"*, prepared by **Jay**,
2026-08-19, 15 items with screenshots.
**Commissioned:** Ali, 2026-08-19 — *"give me a new session prompt to start with the new ones
perfectly until done. None is allowed to be skipped. Don't come back until all paths completed,
tested, validated and documents updated."*
**Written after E-167 shipped** (`5055cea5`) and triaged against the code the same day.

> ⭐ **WHO JAY IS, AND WHY THE DEFAULT IS "IMPLEMENT".** Ali: *"Jay is from Gaming Board — anything
> he says is actually legit, we just do it."* These are requirements from the licensing authority.
> The default answer to every item is **build it**. This document's job is narrower: to stop you
> building two things that already exist, to hand you the three traps that would embarrass us in
> front of the regulator, and to make sure the two items that need a purchase or a direction get
> **asked** rather than silently dropped.
>
> ⛔ **NOTHING HERE MAY BE SKIPPED, AND "BLOCKED" IS NOT AN EXIT.** §4 gives every
> decision-dependent item a *partial delivery that is still real work*, so the session ends with
> every path either **DONE** or **DONE-TO-THE-DECISION** with the question in writing. A unit left
> untouched because it "needs input" is a skipped unit and fails this commission.

---

## §0 · WHAT "DONE" MEANS HERE

A unit is **DONE** only when all six are true. Not five.

1. **It works on the real product**, driven — not asserted. A green suite is not proof; this campaign
   has 30+ findings that were green somewhere before they were found.
2. **A guard exists and has been proven RED** against the defect it protects, with a **positive
   control in the same run**. A refusal with no positive control is an absent test.
3. **It was LOOKED AT** — screenshots at **393 / 768 / 1024 / 1280 / 1440 × EN / SW / ZH** for
   anything a player or operator sees. Swahili and Chinese are where labels overflow and where a
   check passes *vacuously*.
4. **`test:all` is green with `DATABASE_URL` UNSET**, run **before that unit's commit**, not batched
   at the end. (`test:responsive` and `test:motion` need a live server — run them against one, don't
   write them off.)
5. **Docs moved in the same commit** — the file that *owns* the subject, not a new file beside it.
6. **The register row is filed** in `docs/LIVE-QA-CAMPAIGN.md` with the measurement, and the
   completion ledger in §1 is ticked.

💰 **And the handoff states the money position first and plainly**, whether or not a shilling moved.

### §0b · THE ZERO-FLAW GATE — twelve checks, run at the end, every one of them mechanical

Ali: *"everything 100% handled properly, 0 flaws, integrations perfect, end to end sealed."* That is
only meaningful if it is **checkable**, so here it is as commands and counts rather than adjectives.
**Every line must be true before the session closes.**

| # | Check | How |
|---|---|---|
| 1 | **No suite is red** — including the two that need a server. ⛔ "Known-red" is not a status | `npm run test:all` with `DATABASE_URL` UNSET, then `test:responsive` and `test:motion` against a live server |
| 2 | **Every RED harness catches every mutation** | `npm run red:all` — and read its report, because it is a *reporting* runner: 27 of 68 harnesses had never run when it was a `&&` chain |
| 3 | **No orphan scripts** — nothing written this session is unreachable from `package.json` | `npm run test:orphans` |
| 4 | **No dead mapped failure codes** — Unit B removes an emitter, so its code must go too | `npm run test:failure-reasons` |
| 5 | **No stale anchors** — this session touches `updown-service.ts`, which six harnesses anchor into | `npm run test:red-anchors`, then re-run all six harnesses |
| 6 | **Typecheck clean — and the suites actually RAN.** ⛔ `tsc` does **not** cover `.mts`, so a green typecheck says nothing about the suites (E-161) | `npx tsc --noEmit` **and** every suite executed |
| 7 | **No doc claims something false.** The index count, any "the only X" phrasing, any file:line reference you moved | `npm run test:docs`, `test:design-one-door`, `test:tracker-hygiene` |
| 8 | **No `TODO`, `FIXME` or commented-out code introduced** | `git diff origin/main -- . \| grep -nE "^\+.*(TODO\|FIXME\|XXX)"` → empty |
| 9 | **Working tree clean** — no untracked leftovers, no temp scripts, no zero-byte redirect artefacts (four were found this month) | `git status --short` → empty |
| 10 | **Every §6 integration pair driven together**, after both units landed | §6, each row evidenced |
| 11 | **The §7 seal completed as one continuous journey**, with an artefact per step | §7 |
| 12 | **The §1 ledger fully ticked**, and anything not ✅ named in the handoff with what remains | §1 |

⛔ **AND ONE JUDGEMENT CHECK THAT IS NOT MECHANICAL, ASKED OF EVERY GUARD YOU WROTE:**
*"would this still pass if the feature were absent?"* If yes, it is not a guard. Six shapes of
check-that-lies are catalogued in this repo, and each one was green over a real defect.

---

## §1 · THE COMPLETION LEDGER — fill this in as you go, and do not delete a row

Order is dependency-driven, not importance-driven. **Do not reorder without reading why.**

| Order | Unit | Item(s) | Why here | Status |
|---|---|---|---|---|
> 🔴 **THIS LEDGER SAT ENTIRELY BLANK FOR EIGHT SESSIONS WHILE FOUR OF ITS ROWS SHIPPED**, and
> §0 rule 6 — *"the completion ledger in §1 is ticked"* — is one of the six conditions this
> document defines "DONE" by. Every session since has read the same all-⬜ table and had to
> reconstruct the real state from `LIVE-QA-CAMPAIGN.md` §6b instead. **A tracker nobody updates
> is a tracker that costs more than it saves**, and it is the same defect shape as the stale
> `ux-audit` index row `docs/README.md` records. Backfilled 2026-08-24 (session 60) **from
> evidence, not from memory** — each ✅ below names where the proof is. Tick your row in the
> commit that ships it.

| 0 | **Pre-flight** | — | The 3m chains and the fleet are the instrument for A, C and J | ✅ **2026-08-24, re-verified live.** `chain-stall-census.cjs`: 19 chains, **16 RUNNING**, none past its own span; **BTC/USD 3m and ETH/USD 3m are both RUNNING** (2,520 and ~2,490 rounds). The 3 not RUNNING are operator decisions (BTC 30m/60m, SOL 15m). Fleet: **20 accounts, TZS 1,592,983**, locales spread EN/SW/ZH — `ops-qa-fleet.mts list`. |
| A | Results page: UD rounds + product split | #10 · #4 | Everything else about "where do I see my bet" depends on this surface existing once | ✅ **SHIPPED.** `results/page.tsx` resolves `outcomeWord` **per row from that row's own `productLine`** — the literal `"MARKET"` trap §3 warned about is gone — and the product split is the kit's **`FilterPill`**, not a ninth hand-rolled rail. Census in the file: **UPDOWN 11,112 · MARKET 65** on production. |
| B | Withdrawal KYC gate removed | #1 | Independent, high-visibility, and its paper trail must be right | ✅ **SHIPPED, session 53** — see §6b *"UNIT B SHIPPED: A GATE REMOVED, A RECORD PUT IN ITS PLACE"*, and `BOARD-DISCLOSURE-B-E.md` for what was told to the Gaming Board. `E-175`. |
| C | Next round visibly playable | #2c | Needs A's fleet + the 3m chains; engine already done | ✅ **SHIPPED, session 60 — DRIVEN, not asserted.** `npm run qa:updown-next-playable`: real money on **both sides** of a real 3-minute round on production, **15 viewports** held through the real settle, all 15 carried by the real auto-advance, **66 assertions**. ⭐ **The question passes at every width: the live "betting closes in" pod is above the fold in 15/15 cells, in all three languages.** Fixed what the frames showed — **`E-193`**, the round page's two-column rail was gated at `xl` so at 1024×768 the price hero rendered **425px tall** and the bet controls sat **301px below the fold**; the rail now starts at `lg` and the control is at 483..531. ⚠️ 393 and 768 are measured and **filed for Ali** rather than fixed: raising them means putting the stake panel above the price hero, which reverses the D3 spec's reading order on a money page. 🟡 **`E-194` came out of the same drive and is a decision, not a bug:** a "3-minute" round is reachable for **89 of its 180 advertised seconds** (measured over 5,479 rounds). |
| D | Date beside every timer | #6 | Independent; touches a shared formatter, so land it before more surfaces exist | ✅ **SHIPPED 2026-08-25 (session 62) — `E-203`.** Both clocks on `/markets/[id]` name the instant they count to, on the label row, through one new **pure exported** rule: `formatDeadline` in `src/lib/utils.ts`. 🔴 **The measurement is the finding.** The obvious fix is `formatDayTime` — the helper `/positions` already used — which prints **no year**. Measured on production first: **3 of 49 LIVE markets resolve in 2027**, the furthest **170 days out** (`mkt_0d271bde3ae784abe12b`, 2027-02-10). Beside a three-digit DAYS cell a bare *"10 Feb"* is **the arithmetic #6 exists to remove**, so the year appears **iff** the deadline leaves the reader's platform-zone year. ⛔ **No third format** — both branches already existed, so the cross-year string is the same-year string plus a year, and the guard pins that. ⚠️ **The zone is the risk §3 named, and it is driven, not commented:** at 2026-12-31 21:30 UTC the Dar clock has already turned to 2027 while the host clock has not, so `sameZonedYear` asks Intl in `tz()` and never `getFullYear()`. ✅ **One home per fact** — the *"results expected by"* line and `/positions`' selection-close line route through the same rule; `formatDayTime` survives only as its same-year branch. **`test:timer-date` 24/0 · `red:timer-date` 7/7 caught, 0 missed** (anchors declared as data; case 5 is the positive control for a vacuous per-timer loop). |
| E | Phone prefilled from the account | #8 | Independent, small | ⬜ |
| F | Cash Back removed | #5 | **Before J** — it changes what the bonus drive must test | ⬜ |
| G | Chain archive + safe delete | #3 | Independent; admin only | ⬜ |
| H | Re-categorise a market | #14 | Independent; admin only | ⬜ |
| I | Selcom page: C2B + B2C | #7 | Independent; verify the API first | ⬜ |
| J | Bonus proved end to end | #15 | **After F**; extends an existing drive | ⬜ |
| K | Customer-care surface + mailbox | #12 · #13 | One feature; largest; needs the READ_TIERS design first | ⬜ |
| L | New markets | #11 | Last: two ship immediately, four need measurement over time | ⬜ |
| M | Per-bet UD notifications, switchable | #9 | Last: capability behind a switch, default OFF | ⬜ |
| Z | **Close-out** | — | Register rows, handoff, the questions sent to Jay | ⬜ |

---

## §2 · UNIT 0 · PRE-FLIGHT — not code, and not optional

**① Start the two stopped chains.** 🔴 **BTC/USD 3m (`udc_5820850ef13f34e5`) and ETH/USD 3m
(`udc_f8d666a0d781b8d6`) are STOPPED on production**, left over from the E-167 outage, so players
have **no 3-minute game on either asset**. Start them from `/admin/updown`. Safe now: `setChainState`
recomputes a fresh `nextBoundaryAt` on resume, and E-167's fix means a late bar can no longer brick
them. Then **watch one full round open and settle** before trusting anything else.

```bash
node scripts/live/ops/chain-stall-census.cjs   # 0 bricked, and now 0 stopped-with-a-stale-boundary
```

**② Mint a real fleet.** ⛔ **Ali has asked for this twice, and the harness itself admits the gap:**
`scripts/live/harness.mjs` carries only `alpha` and `echo`, and its own comment names *"the
two-personas blindness"*. Every finding about one-sidedness came from having too few players. Mint
**as many players as the case needs and play BOTH sides** — the fleet convention is `fleet:NN` on
`7990000NN` (see `scripts/live-bonus-live-proof.mjs`). Prod minting is pre-authorised (Ali,
2026-08-14): players, markets, money, grants, tokens, no cap, don't ask.

**③ Re-grep the `E-` ids at the moment you file, not now.** The last session's work was numbered
E-119, then E-161, before landing on **E-167** — two ids were taken while it ran.

```bash
grep -ohE "\*\*E-[0-9]+\*\*" docs/LIVE-QA-CAMPAIGN.md | grep -oE "[0-9]+" | sort -n | tail -3
```

🔴 **AND RE-GREPPING IS NOT ENOUGH WHEN TWO SESSIONS SHARE THE CHECKOUT — IT HAPPENED ON
2026-08-24.** Two sessions both grepped, both correctly saw `E-189` as the highest, and both
filed **`E-191`** within the hour: one for a vacuous clipping check, one for a dated certificate
renewal. Neither did anything wrong; the ids were free when each looked.

⭐ **THE TIE-BREAK, so the next collision resolves itself without a negotiation:**

> **`docs/LIVE-QA-CAMPAIGN.md` §6 IS THE AUTHORITY. Whichever finding has a ROW there keeps the
> id; the other moves.** An id recorded only in `NEXT-PLAN.md`, a session prompt or a code
> comment is not filed — it is announced. So the loser of a tie is decided by a `grep` anyone
> can run, and the fix is a rename plus a row, never a discussion.

⛔ **And renumber the CITATIONS in the same edit** — a finding is usually cited from three or
four places, and a rename applied to the register alone leaves the old id pointing at somebody
else's defect. ⚠️ **A pushed commit message cannot be renamed**, so the register row that
inherits the id must say which commit still carries the old one (see `E-195`).

**④ Read these three, in order:** `docs/HANDOVER-E166-NEXT-SESSION.md` §5 (the celebration/handover
coupling you can break), `docs/FAILURE-INVENTORY.md` §7.4 (why a chain bricks), and
`DESIGN_AUTHORITY.md` (the only design door).

---

## §3 · THE UNITS

### ▶ A · #10 + #4 — settled rounds reach the results page, split by product

**What is true now.** `src/app/results/page.tsx` is built entirely on `listMarkets`,
`MARKET_CATEGORIES` and `MARKET_SEARCH`. **Up & Down rounds are not on it at all.**

🔴 **THE TRAP, AND IT IS THE WORST ONE IN THIS COMMISSION.** Line **366** passes the literal
`"MARKET"` as the product line to `outcomeWord`. `test:labels` §8 exists because *"a surface holding
EVERY product line must resolve its side words through the lexicon — the omitted third argument is
the tell."* Ali's own report — *"Up & Down says YES won, should be UP won"* — was this defect on other
surfaces; it was **declared fixed twice** before it was, with **three green guards over it**. Add UD
rounds and leave that literal, and the results page prints **"YES won" over an Up bet**, on the page
the regulator asked for.

**Build.** ① UD rounds appear on `/results` once settled, side words resolved through the **same**
lexicon with the round's real `productLine` — never a literal. ② A visible split between long-form
(Yes/No) and Up & Down. ⛔ **Use the kit's `FilterPill`** — ONE filter language, 8 rails; hand-rolling
a ninth is a documented refusal. ③ #4's redirect for long-form markets **reuses
`updown-handover.tsx`'s gates** (observed settle only, past the hold, no open overlay, no bet in
flight) rather than adding a second auto-navigation.

**Guards.** Extend `test:labels` §8/§9 and prove RED against the hardcoded-`"MARKET"` version. A
positive control in the same run: a long-form market still says YES/NO.

**Acceptance.** A settled UD round is findable on `/results` in all three languages with the correct
side word; both sections render at all five widths with no horizontal overflow; the redirect does not
fire over an open modal or a bet in flight.

---

### ▶ B · #1 — remove KYC as a precondition of withdrawal

**What is there now.** A **server-side** gate at **`wallet-service.ts:1285-1288`**:

```ts
const kyc = await db.kyc.findByUserId(userId);
if (kyc?.status !== "APPROVED") {
  audit({ category: "COMPLIANCE", action: "withdraw.kyc_blocked", … });
  return { ok: false, error: "Verify your identity to withdraw.", code: "INVALID", reason: "kyc_required" };
}
```

`/wallet/withdraw` also renders a `KycLock` and computes `canSubmit = kycApproved && payoutsOpen`.

⛔ **CHANGE BOTH.** A UI-only change leaves the service refusing and reproduces **E-5** — a screen
promising what the next screen refuses, which landed on the celebration screen last time.

⛔ **THREE THINGS MUST SURVIVE, each for a different reason:**

1. **The KYC system.** [`docs/IDENTITY-POLICY.md`](IDENTITY-POLICY.md) — ⚠️ **this row said
   `NIDA-POLICY.md`, which no longer exists** (renamed 2026-08-20 when identity stopped being one
   document): *"Uniqueness — one document, one account"*, audited as `kyc.id.duplicate_blocked`
   (⚠️ **also renamed** from `kyc.nida.duplicate_blocked`), and *"Document review by a human —
   this is the real identity control."* Jay is removing a **gate on a payout**, not the identity
   system. ⛔ **And do not tell the Board "one NIDA, one account":** uniqueness is now the tuple
   `(idType, idNumber)` across FOUR documents, so one human holding several documents is a gap
   only the human reviewer closes — overstating it is the failure this row exists to prevent.
2. **The AML controls.** `/admin/aml` reasons in thresholds (`TWO_PERSON_THRESHOLD_TZS`, two-person
   review over a limit). ⚠️ **Those come from the AML/FIU regime, a different authority** — a Gaming
   Board instruction about KYC-on-withdrawal does not repeal them. **Do not touch them in this unit.**
3. **An audit fact.** Keep emitting a COMPLIANCE event when an **unverified** account withdraws — not
   a refusal, a *fact*. That record is what answers *"why did you pay an unverified player?"* with
   *"the Board instructed it on 2026-08-19, and here is every instance."*

🔴 **AND REWRITE THE ATTRIBUTION, OR THIS GETS REVERTED.** `docs/FLOWS.md:30` cites the
**"TZ Gaming Board model"** as the *reason* the gate exists. Leave it and someone re-adds the gate in
six weeks by reading the docs correctly. In the same commit: replace that row with the new rule,
dated, naming the source document; and add a dated entry to `docs/COMPLIANCE-DECISIONS.md` recording
the instruction, its source, what changed, and what deliberately did not (1–3 above).

⚠️ **`docs/FLOWS.md` also points at the wrong lines** — it cites `wallet-service.ts:100-104`, which is
the *deposit* email gate. Fix the reference while you are there.

🔴 **AND RETIRE THE FAILURE REASON WITH ITS EMITTER.** `kyc_required` is declared at
`failure-reasons.ts:93` and mapped at `:228` (`severity error, channel modal, key errVerifyIdentity`),
and line 1288 is its **only** producer. Delete the emitter alone and the registry gains a **dead
mapped code** — exactly what session 47 filed six of: *"six `REASON_BY_CODE` rows mapped codes NOTHING
has ever emitted, while §9 proved them 'working' by synthesising the code itself."* Remove the union
member, the map row and the dictionary key in the same commit.

**Acceptance.** An unverified fleet player completes a withdrawal **end to end on production**; the
COMPLIANCE record exists and names the instruction; `test:kyc-honesty`, the KYC suites and
`test:failure-reasons` are green; a guard proves the page and the service agree.

---

### ▶ C · #2c — a player can see that the next round is playable

**Already delivered, and do not rebuild:** the successor is open when the result lands in
**1,186 of 1,203 settles measured over 24h (98.6%)**, median **91.5s early**
(`handover-gap-census.cjs`), and E-166 shipped the handover on top of that.

⛔ **And #2's "the AI should search 30s before the end" cannot be built** — see §4, which has the
paragraph to send Jay. Do not attempt a pre-open: a round's opening price comes from the dated bar
labelled with its own start instant, which does not publish until ~19s **after** it, and opening
without one voided **175 consecutive rounds** over eleven hours (E-83).

**Do.** With the fleet on a 3-minute chain, drive a real settle at all five widths × three languages
and answer one question **from the frames**: *can a player who has just seen a result tell, without
scrolling, that the next round is open and bettable?* Fix only what the screenshots show.

⛔ **The coupling you can break:** the win celebration dwells **7s**, the handover moves at **2.5s**,
and they are safe only because the celebration is a kit `<Modal>` whose lock the auto-advance reads.
A celebration rendered outside the kit modal loses a winner their moment.

---

### ▶ D · #6 — the date beside every timer

`components/markets/countdown.tsx` already renders a `days` cell (Jay's screenshot shows **64 DAYS**),
so the gap is the **absolute date**.

⚠️ **THE TIMEZONE IS THE WHOLE RISK, and this project nearly filed a false money finding over it.** A
settlement proof reads `13:47:22 EAT` while the database holds UTC wall-clock; a session was spent
concluding a correct page was wrong because the reader shifted a naive timestamp by its own offset.
**One convention, resolved in one place** — reuse the platform's `formatDateTime` / `resolveRange`
helpers. ⛔ Never a new `toISOString().slice()`.

**Acceptance.** Closing and resolve timers show the same date in the same zone in all three
languages; a guard pins that the two agree and that neither derives its own format; no overflow at
393px.

---

### ▶ E · #8 — prefill the registered number

Today `prevMsisdn = sp.msisdn ?? ""` (`wallet/withdraw/page.tsx:59`) — repopulated from the **URL**
after a failed submit, otherwise empty behind the placeholder `712 345 678`. ⛔ **A placeholder must
never become a value** (A-5).

**Build.** Default both deposit and withdraw to the account's registered msisdn, still editable.
⚠️ Withdrawals are the sensitive half: a defaulted payout destination is a convenience, not an
assumption. Keep every existing destination validation.

**Acceptance.** Prefilled on both pages; a failed submit still round-trips what the player typed
rather than reverting to the account number; guard covers both.

---

### ▶ F · #5 — remove the Cash Back Deposit promo

`components/ui/cashback-promo.tsx`, plus `wallet/page.tsx`, `wallet/wallet-client.tsx`,
`wallet/deposit/page.tsx`, `admin/bonuses/*`, `bonus-config.ts`, `bonus-service.ts`, `i18n-dict.ts`.

⛔ **HIDE THE OFFER; DO NOT DELETE THE LEDGER PATH.** His words: *"disabled/hidden for now until
further notice"* — a feature-state, not a deletion. Any cash back already granted must still fulfil
and stay visible in the player's own history.

⭐ **Reuse the existing 4-state mechanism** rather than inventing a flag:
`src/lib/server/proposals-config.ts` defines `PROPOSALS_STATES = ["ACTIVE","COMING_SOON",
"MAINTENANCE","DISABLED"]`, driven from `/admin/config`. ⚠️ **Check the live state after deploy** —
that precedent exists because a switch read differently in production than in the repo.

**Acceptance.** The promo renders nowhere for players; existing grants still fulfil; all five bonus
suites green; a guard asserts the surface is absent **and** that a pre-existing grant still settles.

---

### ▶ G · #3 — chain removal that cannot destroy the audit trail

🔴 **A HARD DELETE IS NOT SAFE, AND IT HAS ALREADY HAPPENED HERE.** `prisma/schema.prisma`:
`UpDownRound.chain` is `onDelete: Cascade`, so deleting a chain **deletes every round it ever ran** —
the settlement record for real money. `e63-window.cjs` exists because **1,915 "failures" turned out
to be rounds deleted with the board.**

⭐ **The Board's own interest argues for the safer form:** it audits settlement history, so the control
must not be able to erase it.

**Build both halves.** ① An **ARCHIVE** state — hidden from the admin list and the player board,
every round kept. ② A hard delete permitted **only when the chain has zero rounds** (the mistyped
chain, minutes old), refused with a stated reason and audited otherwise.

⚠️ Also surface what already works: **stop → start** fully recovers a chain. If the underlying need is
*"undo a chain I just created"*, archive plus zero-round delete covers it without touching history.

**Acceptance.** Removing a chain with rounds is refused, with the reason, and audited; a RED-proven
guard covers the refusal **and** a positive control proves a zero-round chain really can be deleted;
archived chains are invisible to players, visible to admins, and their rounds still reachable by the
healer's read.

---

### ▶ H · #14 — re-categorise a market

✅ **Confirmed absent.** Category is set **once, at creation** (`admin/markets/new/wizard.tsx:91`).
Everywhere else in `/admin/markets` it is only filtered and sorted. A market in the wrong category
can currently only be fixed by re-creating it — which is Jay's problem exactly.

**Build.** An edit control on an existing market, audited (`actor`, `before`, `after`).
⚠️ **Keep the licence exclusion**: `MARKET_CATEGORIES` excludes politics **by licence**, and
re-categorisation must not become the way back in. If Jay wants that changed, it is its own
instruction.

**Acceptance.** A mis-categorised market can be corrected; the change is in the audit chain; a guard
proves the licence-excluded category cannot be reached by this path.

---

### ▶ I · #7 — the Selcom page

**Exists:** `/admin/payments` shows the **disbursement float** (B2C) with a low-float warning and an
honest *"Unavailable"* when the float PIN is unset.
**Missing:** collections (C2B) balance, and one statement view covering deposits *and* withdrawals.

⛔ **THE ONE MISTAKE THIS PAGE MUST NOT MAKE**, from `scripts/live/ops/README.md`: separate
`BET_PAYOUT` (an internal wallet credit) from `WITHDRAWAL` (money actually leaving to Selcom).
*"Conflating them reads as 'payouts work' when the rail is untested."* Adding a ledger movement to a
rail movement produces a number true of nothing — on a page built for the regulator.

⚠️ **VERIFY FIRST** whether Selcom's API exposes a C2B balance at all (`docs/SELCOM-API-DIGEST.md`,
`ops:payments-now`). If it does not, **the page says so** — it does not compute one from our ledger
and label it a Selcom balance (A-5).

**Acceptance.** Both balances shown or honestly absent; a statement reconciling to
`scripts/live/ops/payments-now.cjs`; a guard that fails if a ledger figure is ever labelled a rail
figure.

---

### ▶ J · #15 — the bonus system, proved end to end

⭐ **NOT GREENFIELD, AND FURTHER ALONG THAN THE REPORT ASSUMES.** Five unit suites exist
(`test:bonus`, `-restitution`, `-betting`, `-stress`, `-one-side`) **and a live production drive
already exists**: `npm run qa:bonus-live` → `scripts/live-bonus-live-proof.mjs`, with four legs —
`grant` (issued by the **GROWTH** officer, not ADMIN, because `grantBonusToPlayerAction` calls
`requireStaff("growth")` and ADMIN bypasses every domain check), `warn`, `hedge` (turnover must NOT
move) and `cancel`. ⛔ Its own rule: *"THE DOM IS NOT THE PROOF"* — every turnover claim is read off
the **grant row** via `bonus-census.cjs`.

**What is missing is the last leg:** a bonus-funded bet that **settles**, completes the **wagering
requirement**, and reaches a **withdrawal**.

**Build.** Extend the existing drive with `settle` and `withdraw` legs. Read the ledger at each step
and check the `balance + hold` identity. ⚠️ **Run after Unit F** — removing cash back changes what
there is to test.

**Acceptance.** One end-to-end run on production: grant → bet → settle → turnover met → withdrawal,
every figure read from the grant row and the ledger, never from a rendered number.

---

### ▶ K · #12 + #13 — the customer-care surface and its mailbox

⚠️ **These are one feature, not two.** `msaada@50pick.tz` is the inbound side of a ticket system. Build
them together.

`SUPPORT` already exists in the role enum (`schema.prisma:25`) and `/admin/players` already holds
customer history. **New:** ticket search — there is no ticket system in the codebase.

⛔ **READ_TIERS IS THE GATE, AND IT IS NOT OPTIONAL.** The Final Audit remediation blocks `MODERATOR`
from money and PII, and an earlier audit found **a read-only auditor being offered the payment
kill-switches**. A support agent needs enough to help and no more. **Design the tier in `docs/` first
and get it agreed**, then build it through the data-driven matrix at `/admin/roles` — never a new
hardcoded check.

**#13 is mostly infrastructure:** DNS + Postmark + a mailbox group delivering to both agents. Then
wire the address into the app's support copy and `docs/EMAIL-SIGNATURES.md` so the platform has **one**
support address. ⚠️ **The mail key dies silently** — verify a real inbound and a real reply, not
configuration.

**Acceptance.** A support agent can find a customer and their history without seeing anything the tier
forbids; a ticket sent to `msaada@50pick.tz` arrives, is searchable, and can be replied to; a
RED-proven guard covers the tier boundary (a SUPPORT session must be *refused* something an ADMIN
gets, with a positive control in the same run).

---

### ▶ L · #11 — the new markets

| His symbol | Reality | Action |
|---|---|---|
| **GBP/USD** | ✅ already catalogued — `macro`, FX/metals week, 5 dp, 2 ticks | **Enable now** |
| **USD/JPY** | ✅ already catalogued — `macro`, 3 dp, 2 ticks | **Enable now** |
| **USD/CNY** · **USD/CAD** | ⚪ not catalogued | Add + **measure** |
| **KES/USD** · **ZAR/USD** | ⚪ not catalogued, and quoted the other way round in convention | §4 — ship as `USD/KES` / `USD/ZAR`, flagged |
| **S&P 500 (SPX)** | 🔴 blocked twice, both recorded in the catalogue | §4 — design + ask |

⛔ **ADDING AN ASSET IS NOT ADDING A ROW**, and `updown-symbols.ts` is a monument to why. Gold carries
`minMoveTicks: 40` and `minDurationMinutes: 15` because *"the feed disagrees with itself by up to
$0.87 at a single instant — about the size of a whole 5-minute gold move."* Silver and platinum are
deliberately given **no** measured minimum: *"nobody has measured their seams — and inventing one from
gold's would be exactly the guess this file exists to prevent."*

**Per symbol, before enabling:** `decimals` and `minMoveTicks` measured from the live feed
(`ops:updown-probe-bars`, `ops:updown-probe-source`); the seam disagreement measured to set
`minDurationMinutes`; the session confirmed against `market-calendar`. **One asset per commit**, each
carrying its measurement in the catalogue entry the way gold's does.

⚠️ **The real risk on an exotic pair is the band.** If the smallest legal move is a large fraction of a
3-minute move, the chain refunds constantly — the SOL/USD lesson already in the file, and a regulator
hears it as *"the game never pays."* If a measured pair fails that test, **give it a
`minDurationMinutes` and say why in the entry** rather than shipping a refund machine.

---

### ▶ M · #9 — per-bet UD notifications, behind a switch

**Already there:** UD notifications are in the inbox — Jay's own screenshot is the **daily digest**
(`updown-digest.ts`): *"18 Aug: 38 rounds — won 13… Staked TZS 141,000, returned TZS 145,430."*

⚠️ **A per-bet notification is not obviously an improvement**, and this is worth being straight about:
a 3-minute chain runs **~480 rounds a day**, so per-bet notifications would bury the inbox they are
meant to serve.

**Deliver both, decided by a switch, default OFF** — so the capability exists the moment Jay wants it
and nothing is skipped. Use the 4-state mechanism from Unit F. Ask him the question in §4 in the same
reply.

**Acceptance.** With the switch ON a fleet player receives one notification per UD bet; with it OFF
the digest behaves exactly as today; a guard covers both states and a positive control proves the
digest is unaffected.

---

## §4 · THE FOUR DECISION-DEPENDENT ITEMS — how each is delivered *without* waiting

⛔ **"Waiting for an answer" is not a status.** Each of these has work that must be finished this
session, plus a question sent in writing.

| Item | Do this session, regardless | Send Jay |
|---|---|---|
| **#11 · S&P 500** | Write the **cash-session calendar design** into `docs/` (a third session kind beside 24/7 and FX-metals: ~13:30–20:00 UTC, holidays, half-days) so only the purchase remains. ⛔ Enable nothing | *Our provider returns **HTTP 404 for SPX** on the tier we buy — the index needs their higher tier, which is a purchase, not development. Separately it trades a **cash session (~13:30–20:00 UTC)** that our calendar does not model; classified as either of our two week-shapes it would be treated as open overnight and at weekends, and every round outside its session would void and refund. **Is the data-tier purchase approved?*** |
| **#11 · KES / ZAR** | Ship as **`USD/KES`** and **`USD/ZAR`** — the market convention — with the assumption stated at the top of each catalogue entry and in the register row | *Convention quotes these `USD/KES` and `USD/ZAR`. We have used that direction. **Confirm** — a reversed pair inverts every Up and Down on the board* |
| **#12 + #13** | Build the READ_TIERS design doc **and** the ticket system fed by the mailbox — that satisfies both readings of the requirement | *We read #12 and #13 as one feature: mail to `msaada@50pick.tz` becomes a searchable ticket. **Confirm**, or tell us if you wanted history search only* |
| **#9** | Build per-bet notifications behind the switch, default OFF | *Already in the inbox as a daily digest (your screenshot). A 3-minute chain runs ~480 rounds a day, so per-bet would bury the inbox. **The switch is built and off — say the word*** |

**And two demonstrations to send, as screenshots not prose:**

- **#2** — the next round is already open and playable in **98.6% of 1,203 settles**, median 91.5s
  early. Show the board mid-handover. Then the one part that cannot work: *a round cannot open 30
  seconds early, because its opening price is read from the price bar labelled with its own start
  instant, and that bar does not publish until ~19 seconds after it. When we did open rounds without
  a confirmed opening price, 175 consecutive rounds voided and refunded over eleven hours. There is
  also no AI in that path — round times sit on a fixed grid, so every instance computes the same
  instants.*
- **#1** — the withdrawal completing for an unverified account, with the compliance record beside it.

---

## §5 · THE TRAPS — every one of these has already cost this project a session

1. ⛔ **A check can pass through the wrong field.** A "black band" assertion matched the SKU and
   stayed green with the colour columns deleted. Ask of every guard: *would this still pass if the
   feature were absent?*
2. ⛔ **An assertion phrased as the defect goes red when you fix it.** Every refusal needs a
   **positive control in the same run**.
3. ⛔ **A guard and its RED proof can share one wrong locator** and be green for eight sessions.
4. ⛔ **A comment that quotes deleted code is a decoy anchor.** Describe old code; never paste it.
5. ⛔ **Appending a section to a suite puts it after the verdict.** Insert above the summary and
   compute the total after the last assertion.
6. ⛔ **`import()` of a red harness RUNS it.** Two instances mutating one file made a 48/0 suite
   report 37/7. Check a harness by running it.
7. ⛔ **A fix can duplicate a string another harness anchors on**, and `String.replace` takes the
   first match. Six harnesses anchor into `updown-service.ts`; re-run them all after touching it.
8. ⛔ **An injected clock the code under test does not read.** `advanceChain` takes `now`;
   `createMarket` reads `Date.now()`. A fixture dated in the past threw in every case *including the
   control*.
9. ⛔ **Git Bash rewrites paths and pipes eat exit codes.** Never `| tail` a suite you need the exit
   code from; write to a file and echo `$?`.
10. ⛔ **PowerShell destroys UTF-8 on round-trip**, and backticks inside a double-quoted shell string
    are executed. Write patch scripts with the file tool, not a heredoc.
11. ⛔ **`test:design-frozen` exempts any line containing `var(--`** — its green is not coverage.
12. ⛔ **A DB read gives state, not reason.** Cast every timestamp `::text`; read "now" from the
    database (this laptop's clock is ~93s slow).
13. ⛔ **Truncation is paint.** `innerText` returns the full string whatever the ellipsis shows.
14. ⛔ **Never `git add -A`** — two sessions share this working directory. Stage surgically, and check
    `git branch --show-current` before every commit: **every push to `main` deploys live.**

---

## §6 · THE INTEGRATION MATRIX — where the units touch, and what must be true JOINTLY

⛔ **A UNIT THAT PASSES ALONE AND BREAKS ITS NEIGHBOUR IS NOT DONE.** Every one of these pairs has to
be driven **together**, after both units land, and each has a named failure mode. This section is the
difference between fifteen features and a sealed product.

| Pair | The joint requirement | The failure mode if you skip it |
|---|---|---|
| **B × E** (#1 KYC removed × #8 phone prefilled) | 🔴 **STATE THIS TO THE BOARD; DO NOT SILENTLY MITIGATE IT.** Together these mean a payout goes to the registered number of an **unverified** account, prefilled, with no identity check anywhere in the path. The only remaining controls are the AML threshold and one-NIDA-one-account — and the NIDA rule only binds accounts that *chose* to verify | The two requirements are individually correct and jointly remove every identity control from the money-out path. The Board must know that is the shape it asked for, in writing, before it is discovered later |
| **B × J** (#1 × #15 bonus end-to-end) | The bonus drive's new **withdrawal leg must run as an UNVERIFIED player**. Turnover completion, then payout, with no KYC | A bonus withdrawal tested only with a verified fleet player proves the old path, not the new one |
| **B × I** (#1 × #7 Selcom page) | Unverified payouts must still appear in the Selcom statement **and** still trip `TWO_PERSON_THRESHOLD_TZS` above the limit | Removing the gate raises unverified payout volume; if the AML threshold silently stops firing, the last control is gone and the page will not show it |
| **B × K** (#1 × #12 support) | A support agent looking at a withdrawal must see a coherent record for an account with **no KYC submission at all** | Support surfaces built against verified accounts render an empty or broken identity panel for the majority case |
| **A × C × M** (#10 results × #2c next round × #9 notifications) | ⛔ **All three answer "where is my outcome", and they must give the SAME answer.** One side word (the lexicon), one destination, one timestamp. If the notification deep-links to `/results` while the handover sends the player to the round page, the product contradicts itself twice in ten seconds | This is exactly how *"Up & Down says YES won"* survived three green guards — each surface was correct about what it measured, and none measured agreement |
| **A × D** (#10 results × #6 dates) | The date on a results row, a countdown and a notification body must be the **same instant in the same zone**, from the one formatter | ⚠️ **A notification body is STORED.** A formatted date written into a stored string freezes the zone at write time — and the wallet already has this defect (one English string rendered verbatim to SW and ZH players). Store the instant; format at render |
| **A × H** (#10 results × #14 re-categorise) | Changing a market's category **after** it settles must move it correctly on `/results` and leave an audit trail — and must never move it into the licence-excluded category | `/results` groups by category; a re-categorisation that does not invalidate the page's grouping shows a market in two places or none |
| **A × L** (#10 results × #11 new assets) | New FX assets are `macro`, so they follow the **FX/metals week**. At a weekend the board must say **"closed"**, not render as broken — and their rounds must appear on `/results` with the right side words and category group | E-36 / E-16 / E-25 / E-32 are all one lesson: *"the game is closed right now"* and *"the game is broken"* look identical in a history full of voids |
| **F × J** (#5 cashback removed × #15 bonus proof) | Existing cash-back grants must still fulfil and still be visible in the player's own history **after** the promo is hidden; the bonus census must still reconcile | Deleting rather than switching off strands a granted bonus — real money a player was promised |
| **G × L** (#3 archive × #11 new assets) | An archived chain must vanish from the player board **and** from the asset board, while its rounds stay reachable by the healer | A half-archived chain leaves a card nobody can bet on and a round nobody closes |
| **K × everything** (#12 READ_TIERS) | The tier must be proven by **refusal**: a SUPPORT session is denied something an ADMIN gets, with a positive control in the same run | *"A read-only AUDITOR was offered the payment kill-switches"* — a permission surface that only ever tests the allow path is an absent test |
| **L × the refund rate** | After a new pair runs for a day, measure its **void/refund rate** against BTC's. If it refunds materially more, give it a `minDurationMinutes` and record why | SOL/USD is already in the catalogue as this exact lesson. A regulator experiences a high refund rate as *"the game never pays"* |

---

## §7 · THE SEAL — one continuous end-to-end drive, on production, with real money

⛔ **THE PER-UNIT DRIVES ARE NOT THE SEAL.** They each prove one thing in isolation. The seal is **one
uninterrupted journey** by a fleet player who has never verified, exercising every unit in the order a
real person would meet them. Run it **once, at the end, after every unit has landed and deployed** —
and if any step needs a workaround to proceed, that workaround is a defect, not a note.

**The journey, and what to record at each step:**

1. **Register** a fresh fleet player. No KYC, ever, for the whole drive.
2. **Deposit** — the phone is **prefilled with the registered number** (E). Complete it on the real
   rail. *Record: the prefill, and the deposit landing in the ledger.*
3. **No cash-back offer is visible** anywhere in the wallet (F). *Record: a screenshot of the wallet
   with the promo absent.*
4. **A GROWTH officer grants a bonus** (J). *Record: the grant row, read by `bonus-census.cjs`.*
5. **Bet on a 3-minute Up & Down round** — placed with the bonus. *Record: the receipt, and the stake
   in the ledger.*
6. **While that round is resolving, bet on the NEXT round** (C) — without scrolling, without a reload.
   *Record: the frame that proves both were reachable.*
7. **Bet on a long-form Yes/No market too**, so both product lines are live in one account.
8. **Both settle.** *Record: the outcome, and the settlement proof's date **in the same zone** as the
   countdown that preceded it (D).*
9. **The results page shows both**, in the correct section, with the correct side word — **"Up wins",
   never "YES"** (A). *Record: five widths × three languages.*
10. **The notification inbox agrees** with the results page — same outcome, same side word, same date,
    and it links where the results page lives (M, A×C×M).
11. **Turnover completes**; the bonus becomes withdrawable (J).
12. **Withdraw — with no KYC at any point** (B). *Record: the payout on the rail, the COMPLIANCE audit
    fact, and the AML threshold behaviour.*
13. **The Selcom page reconciles** the deposit and the withdrawal, with `WITHDRAWAL` never conflated
    with `BET_PAYOUT` (I).
14. **A support agent finds this player and this journey** within their tier — and is refused what the
    tier forbids (K).
15. **An operator re-categorises** the long-form market and the results page follows (H); **archives** a
    chain and it disappears from the board while its rounds remain (G).
16. **`chain-stall-census.cjs` is green** and no chain is stopped-with-a-stale-boundary.

⭐ **THE SEAL IS THE ARTEFACT.** Write it up as one numbered walk with one screenshot or one ledger
read per step, in the register row. A step you cannot evidence did not happen.

---

## §8 · CLOSE-OUT — Unit Z, and the session is not done until this is done

1. **A register row per unit** in `docs/LIVE-QA-CAMPAIGN.md`, with the measurement that proves it, and
   the id re-grepped at the moment of filing.
2. **A new topmost `RESUME AT` block** in §6b naming what is open. ⚠️ The marker must sit inside §6b's
   **topmost** `###` block or `test:tracker-hygiene` fails — that guard has drifted four times.
3. **Each subject's owning doc updated in the unit's own commit** — `FLOWS.md` and
   `COMPLIANCE-DECISIONS.md` for B, `updown-symbols.ts` entries for L, `EMAIL-SIGNATURES.md` for K,
   `RULES.md` for anything that changes a rule a player is held to.
4. **`docs/README.md`'s count and index row** if any doc is added or removed — the gate now counts
   **tracked** files, so `git add` it before running the gate.
5. **The four questions and two demonstrations from §4, sent to Jay**, and recorded here so the next
   session knows what is outstanding.
6. **`test:all` green** (with `DATABASE_URL` UNSET) **and `red:all`**, plus `test:responsive` and
   `test:motion` run **against a live server** rather than counted as known-red.
7. 💰 **The money position, first and plainly**, in the handoff.
8. **The completion ledger in §1, fully ticked** — and if any row is not ⬜→✅, the handoff says which,
   why, and exactly what remains. **A row silently left blank fails this commission.**
