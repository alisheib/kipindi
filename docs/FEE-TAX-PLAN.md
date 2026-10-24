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

**State (2026-10-24):** ✅ R0 — the records — is LIVE at `82c16ec20` (gate: `test:all` 724/724 and eight red twins on
GitHub's runner, run 40099194709; read back: `?dpl=` on the three hosts, health, `qa:chunks-prod` on both origins,
production `qa:live` 360/0, run 40101277556): the rulings entry, this tracker, the RULES.md roll-out row, the NEXT-PLAN
row and MASWALI-PLAN's S8 hold (gate lines 8 and 9 re-opened). Ali's go-live answers of the same day are recorded in
COMPLIANCE-DECISIONS (§ "2026-10-24 · The fee & tax change — Ali's go-live answers …"): the release itself turns the new
law on under his ruling, the second-officer checks go live OFF by his word, his word stands as Finance's TRA
confirmation, production reads and a six-bet live proof are approved, and he sets the desk himself.
✅ R1 — any admin can do any step — is LIVE at `f12eb06cd` (2026-10-24): the Owner setting "Second-officer checks"
(`second-officer-policy.ts`; its card on /admin/system, English like the console, Owner-only to change) over the twelve
checks of §4 R1, OFF by Ali's word (nothing stored reads OFF; a read that fails, or a malformed row, reads ON; a stored
position always wins); the S8 hold in code (`openWeek` refuses a public week that would freeze `jackpot-payout`).
- Gate on GitHub's runners at `f12eb06cd`: typecheck; `test:all` 726/726; `test:integrity`; `red:second-officer-switch`
  and `red:maswali-engine` (their anchors moved); build; `qa:first-load` 10 routes; the house-bot bundle; the browser
  gates (`qa:live`, responsive, motion, revoked-deadend, admin-section-gate); `e2e:money`, `e2e:fault` and `e2e:card`
  (100/0), each on its own fresh scratch PostgreSQL.
- The admin drives with Millionea ACTIVE: `qa:maswali-admin-drive` 119/0 (the card read, turned on, refused, turned off,
  attested) and `qa:maswali-objection-console` 71/0. `qa:purge-ceremony` fails the same way on `main` (`82c16ec20`): its
  admin session is sent to sign-in. That is pre-existing and not R1's; the purge's checks are held by `test:chain-purge`
  and `test:second-officer-switch`.
- Read back: `?dpl=f12eb06cd` on the three hosts after 533 s; `qa:chunks-prod` on both origins; production `qa:live`
  358/0.
- The operator guide's PDF has been regenerated (B3: any officer attests while the checks are off) and read page by page.
✅ R2 — the fee engine, settlement, ledger, safe config and the bet screens, all GATED OFF — is LIVE at `abbee1fa1`
(2026-10-24; pushed on Ali's word "push live now … continue testing, fix and repush"): lane a (the `stake-share` engine
in `payout.ts`, the fee-law gate, the config's gated doors and compare-and-swap writers with the form baseline, the fresh
read at stamping, the one act that moves every chain, the fee-model census — reviewed twice), lane b (settlement by the
split, the `HOUSE:WINNINGS_TAX` ledger line, the additive schema, the close-time disclosure under the market lock) and
lane c (projections, the bet screens' below-stake warning and standing line, the admin Fees & taxes card and simulator).
- Gate on GitHub's runners: typecheck, build, `qa:first-load`, the house-bot bundle, the browser gates, `e2e:money`,
  `e2e:fault` and `e2e:card` each on a fresh scratch PostgreSQL, and the red twins of `stake-share-fee`,
  `winnings-tax-ledger`, `fee-model-caption` and `maswali-law` — all green at `774f333e7`. `test:all` named twelve suites:
  five guards R2 moved (the census, the budgeted-lock and commit-lag lists, Ruling 232's line pins — each nine-line write
  SHA-checked, D19a), fixed in `abbee1fa1`; seven of lane c's (two suites the merge left unloadable, the below-stake
  body through the notice keep, one inverted spacing key, two pins), fixed in `44528b54d`. Each fix re-run green on the
  runner at its exact commit.
- Read back: `?dpl=abbee1fa1` on the three hosts after 1081 s; `qa:chunks-prod` on both origins; production `qa:live`
  358/0. Production (read-only): both R2 migrations applied (`Position.feeTzs` / `winningsTaxTzs`,
  `SETTLEMENT_WINNINGS_TAX`); the polls and Up & Down still on `loser-share`, no tax, no switch record — the law is off.
🔨 R5 lane b — the one-time switch — is LIVE and INERT at `245c53e2f` (it does nothing while the gate is shut):
`src/lib/server/fee-law-switch.ts` runs at boot (after the audit drain and the boot checks, before every scheduler) and,
once the gate opens, applies Ali's ruling through the audited writers — the banner (Swahili and English, the saved rates),
the polls (stake-share; the stored 13% split kept; the 15% tax), then Up & Down's default and every chain in one
transaction — and records `fee_law.switch` with `at`; a failed step puts back what was done, records FAILED, writes a
COMPLIANCE row and retries; once across containers by a claim on the record. `/api/health` publishes `feeLaw` {live,
switch, switchedAt} — production reads `{"live":false,"switch":"none","switchedAt":null}`. Proven by
`test:fee-law-switch` (38) and `red:fee-law-switch` (10/10 planted defects caught). Production instruments taught the new
law: `stake-share-settled.cjs` (new), `pool-residual.cjs`, `house-money.cjs`. Pre-switch production baselines (read-only):
every settled pool at 0, levy divergence 0, the books balanced; 47 + 3 open polls and 9 open rounds on loser-share; 20
chains on loser-share; three polls of 2026-06/07 carry no snapshot and settle by the coded legacy terms, which the switch
cannot touch. Millionea's `ticket-share` step joins the act when R4 merges.
Today's money law is still in force everywhere; the fee change is not switched on.
R3 lane b — what players, agents and officers read about a `stake-share` result — is written (branch `feetax-r3b`) and merged at integration (`feetax-int3`), gated off: the win's bell and letter name the stake, our fee, the winnings before tax, the tax withheld and what was paid, and a win paid back below its stake reads "Returned … of your … stake" (a result row, royal letter, no share card, no gold), never a gain; the bet receipt, the betting-closed notice, the Up & Down digest, the public resolution panel, the wallet row, /positions, the officers' transactions column and settled-market card, and the /agent waterfall on stakes follow each market's frozen model; new `test:stake-share-receipts` (predeploy).

**Next:** R3 (lanes a: the tax report and books; b: receipts and notices), R4 (Millionea `ticket-share`) and R5 (lane a:
every binding word; lane b: the one-time audited switch at boot — `fee-law-switch.ts`, its record, `/api/health`'s
`feeLaw`) — written in parallel, each merged, gated and pushed as it lands; R5 last, as the switch.

**Blocked on Ali:** nothing for R0–R5 (he delegated every remaining decision on 2026-10-24: "keep going until all
perfectly done and pushed live … you take decisions based on what is better for the platform"). Before the switch, on
his side only: the desk's budgets (he sets them himself), and a `railway login` on the build machine for the approved
read-only production reads (the CLI's login had expired on 2026-10-24). The note to the Gaming Board is his to send.

**Who pushes `main`:** the session working this programme pushes its own verified releases (Ali, 2026-10-24, approving
the plan: each release pushed live), rebased on `origin/main` immediately before, with AGENTS.md §4's release checklist.

**Last handoff:** 2026-10-24, Ali-Blade15 (the session that wrote the plan). The plan file lives outside the repo; this
tracker is its copy and supersedes it.

## §1 · Board

| Release | What | Status | Note |
|---|---|---|---|
| R0 | The records: rulings, this tracker, the RULES row, the board row, the S8 hold | ✅ | `82c16ec20`, live and read back 2026-10-24 (docs only) |
| R1 | Any admin can do any step + the Millionea open lock | ✅ | `f12eb06cd`, live and read back 2026-10-24: the Owner setting and its /admin/system card, live OFF by Ali's word (nothing stored = OFF; a failed read = ON; a stored position wins); the twelve checks gated (check 11 frees an officer's own payout hold on a market they hold no money in — a case on their own stake stays refused, ruling 6b); the bulk-resolve staged-row words follow the two-officer switch; the S8 hold in `openWeek`; `test:second-officer-switch`, `test:maswali-open-lock`, `red:second-officer-switch` |
| R2 | Fee engine, settlement, ledger, safe config — gated off | ✅ | `abbee1fa1`, live and read back 2026-10-24 (gated off: nothing a player sees changed); lane c's gate fixes `44528b54d` |
| R3 | Reports and money around settlement (polls + Up & Down) | ⬜ | |
| R4 | Millionea `ticket-share` — engine, money, records, reports, figures — gated off | ⬜ | |
| R5 | Every binding word in one commit, the gate flipped, the release's one-time switch under Ali's ruling | ⬜ | the switch |

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

**R1 — any admin can do any step.** An Owner setting, "Second-officer checks" — live OFF by Ali's word with no click after
the release (his go-live answers of 2026-10-24): nothing stored = OFF; a read that fails = ON, never weaker on an error; a
stored position always wins, so the Owner turns the checks back ON from his card as an audited act — gates every check on
another person's work:
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

Finance: the TRA basis · the Gaming Board: a note on the four changes and the
technical report's separation-of-duties section · the Vodacom agency re-reads the journey's money words before S14 ·
the desk's budgets · the parked branches `claude/maswali-s6-lint` / `claude/maswali-s6-notices` rebase after R4.
