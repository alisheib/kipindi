# SESSION PROMPT — 50pick: move KYC to withdrawal only

> **Status:** 🔵 IN PROGRESS — opened 2026-09-13 (session 94). Tick §Status in the same commit as
> the work. When every row is ☑ and the change is verified on production, mark this ⚪ SPENT.
> **Ruling of record:** [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), 2026-09-13 (and
> 2026-09-13 second, the nickname).
> **Full design:** the plan `playful-beaming-starfish.md` kept outside the repo, whose substance is
> carried below and in the compliance entry. ⛔ Every number in it was re-derived before use; the
> ones that had moved are noted in §Measured.

This file is the brief as handed to the implementing session, kept as the repo's record.

---

## The brief, verbatim

> **50pick — move KYC to withdrawal only.** You are working on 50pick, a licensed real-money
> prediction-market and betting platform in Tanzania, regulated by the Gaming Board of Tanzania,
> live at https://50pick.tz. Repo `C:\kipindi-main`. Push to main = LIVE, with real players and
> real money.
>
> **What changed and why.** Players complained, in volume, about having to upload documents and
> wait for approval before depositing or playing. Ali took it to the Gaming Board and the Board has
> permitted 50pick to enforce KYC finalisation only at withdrawal. The ladder becomes:
> **register → confirm email → deposit and play → verify identity → withdraw.**
>
> **Ali's rulings, 2026-09-13 — settled, do not re-litigate.**
> 1. Nothing at all before deposit or betting. Not documents, not a submission.
> 2. No deposit cap for unverified accounts.
> 3. Declared age only until withdrawal — the DOB typed at sign-up and the 18+ tickbox.
> 4. Re-version the legal documents and ship now — no 14-day §10 notice; the change is
>    player-favourable.
> 5. A refused player's balance: an officer decides each case, with a recorded reason.
> 6. Re-opening a verification no longer blocks money — the officer uses the wallet freeze.
> 7. Approval no longer overwrites a chosen nickname. ⛔ This reverses the 2026-06-14 ruling and
>    needs its own dated entry.
>
> Each was put to him with its consequence stated, including that a minor who types a false date
> of birth can deposit and gamble, and that the platform's only sanctions/PEP screening moves
> behind the money. Those consequences go into `COMPLIANCE-DECISIONS.md` under his name, in plain
> words. They are not hedges in the design and not reasons to narrow the work.
>
> **The one thing that must not go wrong.** ⛔ Never make a money gate answer "yes" to a question
> it used to refuse. Delete the DEPOSIT and BET members of `MoneyAction` so a stale call site is a
> compile error, not a silent pass.
>
> **Discover the population — do not work from a list.** `grep -rli "kyc" src/ --include=*.ts
> --include=*.tsx` · `grep -rn "assertKycForMoney" src/` · a scan of `package.json` for scripts
> naming kyc / identity / deposit / withdraw / bonus · a sweep of `src/lib/i18n-dict.ts` for every
> key asserting identity comes first, in all three locales. ⚠️ Swahili and Chinese are two thirds
> of the players.
>
> **Standard of work.** "0 flaws end to end, sealed and verified on tampering"; "full
> responsiveness, perfect design, perfect appeal, everything 100% functional". Green is not
> verification. Every guard states its population, lands at zero, and ships a RED control. A build
> is not a render. Tailwind scans comments. Docs and the status board update in the same pass as
> the code.
>
> **The four things most likely to be missed.** ① `assertKycForMoney` has FOUR call sites —
> `bonus-service.ts` is the one every summary drops. ② `predeploy` does not run `test:kyc-gate`,
> `red:kyc-gate`, `test:deposit-gate`, `test:failure-reasons`, `test:kyc-approved-copy` or
> `test:labels` — run them explicitly and say so. ③ `test:kyc-copy-truth` §2 reads four of eight
> legal pages. ④ Two `instruction:` strings in `wallet-service.ts` hard-code a superseded ruling
> into the tamper-evident audit chain.
>
> **S1 — the hole with no code path.** A player refused at withdrawal while holding a real balance
> has nowhere to go, and `reviewKyc`'s REJECT branch freezes nothing, so a refused player can keep
> betting. Ali has ruled: an officer decides each case, with a recorded reason. Build a real
> return-of-funds action, a closed set of outcomes each writing its own audit action, a mandatory
> typed justification, and one report an inspector can be handed. Plus the terminal-code wallet
> freeze and the fix that stops a terminal rejection releasing the document number for reuse.
> Terms §3a describes the process, not an outcome, in three languages, live before anyone can hit
> it.
>
> **Deliverables.** The change, shipped and verified on production · this file · a dated
> `COMPLIANCE-DECISIONS.md` entry and a Board-disclosure update (`BOARD-DISCLOSURE-KYC-FIRST.md`
> §§1–4 become false and it is marked DRAFT, never sent) · a session block in
> `LIVE-QA-CAMPAIGN.md` §6b with the next RESUME AT.

---

## Measured — re-derived 2026-09-13, not quoted

| Claim in the brief | Measured |
|---|---|
| `grep -rli kyc src` → 158 files | **159** |
| `assertKycForMoney` → 4 call sites | **4** (`wallet-service` ×2, `market-service`, `bonus-service`) ✅ |
| 66 scripts naming kyc/identity/deposit/withdraw/bonus, 13 in `predeploy` | **55** by name-or-command, **10** of them in `predeploy` (which runs 110 scripts). The difference is the matcher, not the repo — both counts are recorded so neither is quoted as the other |
| `predeploy` omits `test:kyc-gate`, `red:kyc-gate`, `test:deposit-gate`, `test:failure-reasons`, `test:kyc-approved-copy`, `test:labels` | ✅ all six confirmed absent |
| Bonus grants in `PENDING_KYC` | **0** — and 0 grants of any status |
| Production population | See the compliance entry's cut-over table |

## Status

| # | Unit | State |
|---|---|---|
| 1 | Measure production | ☑ |
| 2 | Compliance entry + nickname entry + Board letters | ☑ |
| 3 | The gate (§1) and its four call sites (§2) | ☐ |
| 4 | Bonus hold removed (§3) | ☐ |
| 5 | Audit record + instruction strings (§4) | ☐ |
| 6 | `User.status` semantics | ☐ |
| 7 | Wallet freeze reasons + officer freeze/unfreeze | ☐ |
| 8 | S1 refused-funds decision + report + S16 + S2 | ☐ |
| 9 | Copy — dictionary en/sw/zh + legal (Terms §3/§3a, AML) + versions | ☐ |
| 10 | Guards — rewritten, inverted, extended, each RED-proven | ☐ |
| 11 | Player surfaces (§10, §11c, §12) | ☐ |
| 12 | Admin surfaces (§7, §11a) | ☐ |
| 13 | Verify — suites incl. non-predeploy, browser drive | ☐ |
| 14 | Migration applied, pushed, verified on production | ☐ |
| 15 | `LIVE-QA-CAMPAIGN.md` §6b handoff | ☐ |
