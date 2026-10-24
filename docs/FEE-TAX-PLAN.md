# FEE & TAX PLAN — 13% of every stake, a 15% winnings tax, Millionea's fee on the ticket, and any admin at any step (programme `FEE-TAX-2026-10`)

> ⭐ **Say "continue the fee/tax plan" in any session, on any machine.** Read §0 RESUME AT, then do the release it names.
> §1 is the board; §2 holds Ali's rulings; §3 the arithmetic; §4 the releases; §5 go-live and rollback; §6 verification.
>
> **The one tracker for this programme.** Owner: Ali. Plan approved 2026-10-24. Rulings:
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § "2026-10-24 · The fee becomes 13% of every stake, a 15% winnings
> tax on every win, Millionea's fee moves to the ticket, and any admin may do any step (owner rulings; in force from the
> switch)". The money law stays [`RULES.md`](RULES.md): until the switch (§5) today's §1/§2 are in force everywhere; R5
> rewrites them in the same commit that turns the new law on.
>
> **Sources.** Ali's two documents of 2026-10-22 and 2026-10-24 — *"Peer-to-Peer Prediction Pool — Business & Revenue
> Model Plan"* (draft for management approval; every pool game) and the Millionea sheet (jackpot 1,000,000; ticket
> 1,000; "our fees 13% = 130"; "to be added in jackpot = 870"; "we will now take from stake not winnings").
> The plan was built from read-only maps of the code (seven areas, an arithmetic check, a completeness critic; a map of
> every second-officer check) and three adversarial reviews of the draft, on `main` `fb53c9bd6`.

## §0 · RESUME AT

**State (2026-10-24):** R0 — the records — is being published: the rulings entry, this tracker, the RULES.md roll-out
row, the NEXT-PLAN row and MASWALI-PLAN's S8 hold (gate lines 8 and 9 re-opened). No code has changed. Today's law is in
force everywhere.

**Next:** R1 — any admin can do any step: the Owner setting "Second-officer checks" over the twelve checks of §4 R1, and
the code lock that refuses to open a public Millionea week that would freeze the old fee model. Then R2.

**Blocked on Ali:** nothing for R0–R4. Before the switch (§5): the desk's budgets reviewed; Finance's written TRA basis
for the 15% (statute, base, the per-winner return, the tax of a forfeited share); the note to the Gaming Board; his yes for
the named read-only production scripts. Straight after R1 is read back: one audited click — "Second-officer checks" OFF.

**Who pushes `main`:** the session working this programme pushes its own verified releases (Ali, 2026-10-24, approving
the plan: each release pushed live), rebased on `origin/main` immediately before, with AGENTS.md §4's release checklist.

**Last handoff:** 2026-10-24, Ali-Blade15 (the session that wrote the plan). The plan file lives outside the repo; this
tracker is its copy and supersedes it.

## §1 · Board

| Release | What | Status | Note |
|---|---|---|---|
| R0 | The records: rulings, this tracker, the RULES row, the board row, the S8 hold | 🔨 | docs only |
| R1 | Any admin can do any step + the Millionea open lock | ⬜ | |
| R2 | Fee engine, settlement, ledger, safe config — gated off | ⬜ | |
| R3 | Reports and money around settlement (polls + Up & Down) | ⬜ | |
| R4 | Millionea `ticket-share` — engine, money, records, reports, figures — gated off | ⬜ | |
| R5 | Every binding word in one commit, the gate flipped, the admin's three saves | ⬜ | the switch |

**Status values:** ⬜ not started · 🔨 in progress · ✅ live and read back (cites its commit).

## §2 · Ali's rulings (2026-10-24 — final)

| # | Question | Ruling |
|---|---|---|
| 1 | Can a winner get back less than their stake? | **Yes — exactly as the document.** The bet screen warns before the bet |
| 2 | Void, one-sided market, 5-minute free cancel | **Full refund, no fee** (as today) |
| 3 | The 15% winnings tax on Millionea too? | **Yes, on every win** (Finance confirms the legal basis with TRA) |
| 4 | Millionea jackpot | **At least 1,000,000**: J = max(floor, carried + 870 × tickets); the guarantee fills a shortfall only in a week with a winner |
| 5 | Is the 1,000,000 before or after the tax? | **Before**: one winner of 1,000,000 receives 850,000; 150,000 goes to TRA |
| 6 | Any admin can do anything | **No more second-person checks**, for every staff account; role areas unchanged; every act still audited by name |
| 6b | An officer acting on their OWN account | **Keep those checks** — they never block work on anyone else's case |
| 7 | Start date | **As soon as it is ready**, without the 14-day notice Terms §10 promises — a deliberate departure, recorded as one; the site banner goes up first |

## §3 · The arithmetic

**Polls and Up & Down — `stake-share`** (frozen per market or round at creation, like every fee model):

- each stake's fee: fee_i = round-half-up(13% × stake_i); the market's fee F = Σ fee_i; net_i = stake_i − fee_i;
- prize fund P = Σ of the LOSING side's net stakes; winnings tax T = round-half-up(15% × P);
- each winner: P_i = largest-remainder share of P by net stake; T_i = largest-remainder share of T by P_i;
  **payout_i = net_i + P_i − T_i**; the pool ends at exactly 0 (no shilling invented or stranded);
- TRA 10% and GBT 5% of F (`levySplit`, once per market); a void, a one-sided market and a free cancel refund in full;
- the winner floor becomes payout ≥ net stake (a winner on a lopsided market can get back less than they staked — ruling 1).

**The document's own example** (YES 1,000 / 3,000 / 5,000 against NO 10,000 / 20,000 / 5,000; YES wins):

| | The document | 50pick pays |
|---|---|---|
| YES 1,000 / 3,000 / 5,000 | 3,717 / 11,151 / 18,844 | **3,746 / 11,237 / 18,729** (tax 507 / 1,523 / 2,538) |
| Tax · fee · TRA · GBT · net GGR | 4,568 · 5,720 · 572 · 286 · 4,862 | the same |
| Total | 44,001 | **44,000** |

The document's per-player table applied rounded shares (11/33/56%), and it rounded both the tax and the distributable
amount up; its tax base is worded three ways. The worked example's base is the one implemented (15% of each winner's share
of the losing side's net stakes); Finance confirms it with TRA.

**What it means** (re-derived by the arithmetic check and the reviews — re-derive before quoting):
- 5,000 vs 5,000: our fee goes 650 → 1,300, plus 652.5 tax; a winner's return per shilling 1.87× → 1.61×;
- a winner on the big side gets back less than their stake once the small side is under about 14.95% of the pool
  (100,000 vs 10,000 pays 94,395; 108,700 today);
- agent commission (rule unchanged: 10% of the net fee kept from a recruit) roughly doubles per balanced position;
- the house desk is an ordinary player in every filing (ruling D20), so its wins are taxed too and its cost rises.

**Millionea — `ticket-share`** (frozen per week at OPEN):

- φ = round(13% × price) — 130 of a 1,000 ticket — frozen for the week; the week's fee F = n·φ in EVERY week; the
  jackpot's part N = n·(price − φ) — 870 a ticket;
- no winning ticket: N carries to the jackpot, F is kept; a winning week: J = max(floor, R + N); share = ⌊J / k⌋;
  each share's tax τ = round(15% × share), the same for every winner; top-up U = max(0, k·share − (R + N)) from the
  guarantee; the final week: J = R + N; TRA and GBT once per week on F; a cancel and a void refund 1,000;
- records: `BET_PAYOUT` = `ticket.payout` = the net (share − τ), `taxWithheld` = τ; a forfeited share returns its net
  and reverses its τ (no winnings, no tax — Finance confirms); a held share is paid net;
- every jackpot figure says "before 15% tax", with one winner's net beside it.

## §4 · Releases — each gated, pushed live and read back before the next

**The gate for every push to `main`:** one GitHub-runner job at the exact integrated commit — `npm run predeploy`
(includes `build`), `test:all`, and the PostgreSQL suites through `scripts/db-scratch.mts --run`; from R4 also `e2e:*`
and `test:maswali-fairness`. One reviewed D19a / chat re-pin per release, at the integrated commit. Read back:
`?dpl=` on the three hosts, `/api/health`, production `qa:live`. Helper agents write in their own worktrees (four at
most); each lane merges only after its suites, `tsc` and an adversarial read of its diff.

**R0 — the records (docs only).** The rulings entry; this tracker; a RULES.md roll-out row; the NEXT-PLAN row;
MASWALI-PLAN §0's S8 hold, with §6.1 lines 8 and 9 re-opened.

**R1 — any admin can do any step.** An Owner setting, "Second-officer checks" (absent = today's behaviour; the Owner
turns it OFF as an audited act straight after R1 is read back), gates every check on another person's work:
1. Millionea — the officer who drafted a week may not attest its translations (`maswali-service.ts`);
2. Millionea — nor may an officer who edited the draft since its last attestation, with the audit-history read that
   exists only for these two checks;
3. Millionea — only the officer who set a result may correct it;
4. Millionea — objection rulings barred to the question's sealer and its confirmer (`maswali-objections.ts`);
5. Millionea — and to the officer whose upheld ruling set the present result;
6. KYC — the high-risk maker-checker, and its fail-closed risk read (`kyc-actions.ts`);
7. the monthly Gaming Board pack — its preparer may not approve it (`pack-actions.ts`);
8. Up & Down — the two-officer purge of an archived chain (`purge-actions.ts`);
9. a held withdrawal of TZS 1,000,000 or more — two different approvers (`aml/actions.ts`);
10. a balance adjustment of TZS 1,000,000 or more — two different officers (`players/[id]/actions.ts`);
11. polls — the officer who placed a payout hold, or filed an objection, may not decide it (`objections-service.ts`);
12. contacts imports — only the officer who started one may continue it (`contacts/import-staging.ts`).

Also: the bulk-resolve wording "another officer must complete it" is false while two-officer approval is off — fixed.

The existing two-officer approval switch (`resolution.policy.requireTwoOfficer`) stays OFF and is shown beside it. Kept:
own-account checks (ruling 6b), staff-may-not-play rules, role areas, the Owner's typed ceremonies, every audit row.
**Also in R1:** `openWeek` refuses a public week that would freeze the `jackpot-payout` model (the S8 hold, in code).

**R2 — the fee engine (gated off).** `stake-share` in `src/lib/payout.ts` (the model, the rates, the snapshot, the
pricing, the model-aware floor, the disclosure, the lean levels) and in `src/lib/server/market-config.ts` (pass-through
instead of the silent fall-back to `capped-commission` at line 386; stamping only with complete rates;
compare-and-swap writers and a fail-closed fresh read). Settlement and ledger (`market-service.ts`, `updown-service.ts`,
`ledger.ts`, a new `HOUSE:WINNINGS_TAX` account and `SETTLEMENT_WINNINGS_TAX` entry type in an additive migration,
nullable `Position.feeTzs` / `winningsTaxTzs`); the close-time disclosure under the market lock through the settlement
function (today it is stamped before a computation that can throw, `market-service.ts` 2343→2372); every projection
(estimate, Up & Down pricing and board, the journey, the dial, the confirm modal, the stake panels) with a below-stake
warning; `/admin/config`'s Fees & taxes card (polls, Up & Down default and every chain in one act, the winnings tax) and
simulator. A code gate keeps every new-model door refusing until R5.

**R3 — reports and money around settlement.** The tax report (each round files under its frozen model; Report 1's
"Winnings tax withheld" line; a new Report 3 — winnings tax withheld — with a per-winner TRA schedule for roles that may
read identity, each export audited; locked periods recompute byte-identically); GGR everywhere = fees; the house book's
new liability; /admin/finance, /admin/compliance (the TRA card), /admin/transactions; agent commission per position (never
the tax) and the /agent waterfall; the resolution panel, the bell, the e-mails, the share card and the Up & Down digest.

**R4 — Millionea `ticket-share` (gated off).** The week arithmetic, config, open freeze, money, settlement, void,
invariants, share payout, ledger, every reader (the fee every week, k = 0 included), the console, the hub, the slip, the
ticket, the register, the notices, the claims lint; the guarantee re-checked.

**R5 — go-live.** First the agent-terms branch (OD-20). Then ONE commit: Terms §4/§5 and the Millionea paragraph, both
rulebooks and the index, the Millionea binding rules, help, the assistant, How to play, the landing, the wallet's tax
text, the privacy notice, i18n; the gate flipped; RULES.md and every record and hand-out; the production instruments taught
the new account.

## §5 · Go-live day and rollback

1. Preconditions (§0 Blocked on Ali). 2. Baselines: open markets and rounds by frozen model; chains by state; locked tax
periods; Millionea's state and guarantee; pool residuals; levy divergence; the config bracket. 3. Deploy R5; wait until
the old deployment is REMOVED (one instance). 4. The banner on. 5. The three saves, in order, each read back: polls and
the tax; Up & Down; Millionea — if any fails, all three reversed and the banner off. 6. Read-backs: the next snapshot;
the first post-switch poll; each chain's first round; Millionea's stored model. 7. After the first settlements: the
ledger (fee = Σ per-stake fees, tax line = Σ withheld, pool 0); the day's tax report; a real-money drive with six
unequal stakes on one poll and one round (Ali's authorisation). 8. The first public Millionea week opens (S8).

**Rollback:** never below R2 once a new-model snapshot or a tax row exists, never below R4 once a ticket-share week has
opened. Undoing the switch = the three saves reversed and the banner off; markets already stamped keep settling under
their frozen law on fixed-forward code.

## §6 · Verification

New suites, each with a red twin: `test:stake-share-fee` (the document's example to the shilling; 94,395; pool 0; odd
stakes; no-mix), `test:winnings-tax-ledger` (pure builders in memory, real rows on PostgreSQL),
`test:agent-settlement-attribution`, `test:fee-gate`, `test:updown-fee-apply`, `test:fee-model-census`, Millionea
`ticket-share` arithmetic, ledger and reporting, the tax report's new section (a pre-switch locked period recomputes
with an identical fingerprint), `test:second-officer-switch`. Kept green unchanged — the proof old markets are
untouched: `test:loser-share-fee`, `test:fee-model`, `test:settlement-gate`, `test:emergency`. PostgreSQL end to end on
the runner: `e2e:money` (a stake-share poll and round: deposit → bet → close, disclosed = paid → settle → withdraw, drift
0.00, `HOUSE:WINNINGS_TAX` = Σ withheld), `e2e:maswali-money`, `e2e:tax-report`. Screens read tile by tile at
360/768/1280 in sw/en/zh.

## §7 · Left for Ali, outside the code

"Second-officer checks" OFF after R1 · Finance: the TRA basis · the Gaming Board: a note on the four changes and the
technical report's separation-of-duties section · the Vodacom agency re-reads the journey's money words before S14 ·
the desk's budgets · the parked branches `claude/maswali-s6-lint` / `claude/maswali-s6-notices` rebase after R4.
