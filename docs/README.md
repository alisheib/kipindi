# `docs/` — the index, with an honest status on every file

Written 2026-07-31. **Read this before opening anything else in here.**

⭐ **If you are an ADMIN rather than a developer, you want exactly one file:**
[`50pick-updown-operator-guide.pdf`](50pick-updown-operator-guide.pdf) — the Up & Down operator
contract. Everything else in here is for whoever builds and runs the platform.

There are **61 files** at this level — this index plus 60 documents — and five
subdirectories with their own indexes: [`design-system/`](design-system/README.md) (the index of
the delivered design archive — **record, not rule**; the design rule book is
[`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) and nothing else is needed to build correctly),
[`design-brief/`](design-brief/INTAKE.md) (the
material commission's brief + intake playbook), [`ux-audit-2026-08/`](ux-audit-2026-08/MASTER-PLAN.md)
(the live UX-audit tracker), [`runbooks/`](runbooks/README.md) (the operator PDFs + their HTML
sources), and `guide-img/` (manual screenshots). Some files are law, some are a snapshot
of a Tuesday in May, and from the outside they look identical. Getting that wrong is how a session spends a night rebuilding
something that shipped a week ago — which has happened in this repo more than once. This
file exists so the *next* session can tell them apart in thirty seconds.

**Guarded by `npm run test:docs`** — every relative link, `scripts/*` path and `npm run`
reference in `docs/` must resolve on disk. Broken on purpose and observed to go red.

## Status key

| | |
|---|---|
| 🟢 **LAW** | Authoritative. Cited by code or by a gate. Changing it changes what is correct. |
| 🔵 **LIVE** | Current working state. Expected to be edited as work proceeds. |
| ⚪ **RECORD** | A closed decision or a finished event. Do not "update" it; write a new one. |
| 🟡 **OPEN** | A question awaiting Ali. Nothing is blocked on code. |
| 🟠 **DESIGN** | Specified, not built. No code exists. |
| ⚫ **HISTORICAL** | A snapshot of a past moment. Trust the date, not the content. |

---

## Start here

| Doc | | What it is |
|---|---|---|
| [`RULES.md`](RULES.md) | 🟢 LAW | ⭐ **THE MONEY RULES — THE ONLY STATEMENT OF THEM.** What we charge (13% of the losing side, both games), the stake bounds (1,000/1,000,000 **per bet**), positions per market, bonus wagering, free cancellation, the withdrawal fee, and the standard a failure message must meet — each with where it is enforced in code, where it is configured, and which surfaces state it. ⛔ **No other document restates a rate.** If anything anywhere disagrees with this file, that thing is the defect. Read it before touching money, and before writing any copy that mentions a fee or a limit. ⚠️ Not the design-law file of the same name under `design-system/`. |
| [`NEXT-PLAN.md`](NEXT-PLAN.md) | 🔵 LIVE | **The one live plan.** Opens with "PICK UP HERE" — the state at the close of the last session, what is done, what is left. Start every session here. |
| [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) | 🔵 LIVE | **The finding register (E-1…) + the §6b session handoffs** — the newest handoff sits at the TOP of §6b, and a commit newer than the newest handoff means another session is IN FLIGHT. Guarded by `test:tracker-hygiene`. |
| [`ux-audit-2026-08/MASTER-PLAN.md`](ux-audit-2026-08/MASTER-PLAN.md) | 🔵 LIVE | The 2026-08 UX-audit implementation tracker — Sessions A/B/C, the DS/DA design sweeps, §9 open decisions for Ali. |
| [`POLL-OPEN-FINDINGS.md`](POLL-OPEN-FINDINGS.md) | 🔵 LIVE | **The poll lane's open findings, with evidence.** The six that survived session 41 (re-confirmed against source), the **eight that were lost with its transcript**, and the operator items. Exists because a finding recorded only in a handoff paragraph is a finding you will lose — read it before touching `productLine: "MARKET"`. |
| [`MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) | 🟢 LAW | **The program that finishes the platform.** 52 modules in 12 domains, each with a dossier, an attack list and a `cert:` gate; the eight gates that define "0 flaws"; the 12 laws; the orphan reckoning; a status board; and a copy-paste session prompt. Governs certification — `NEXT-PLAN.md` governs launch hardening. |
| [`AGENT-ACCESS.md`](AGENT-ACCESS.md) | 🟢 LAW | How to grant an agent access, and the two kinds of block that look identical. Also records which accounts own Cloudflare/Railway — **and that the Cloudflare login is written down nowhere**. |
| [`SETUP.md`](SETUP.md) | 🟢 LAW | **Getting 50pick running on a machine that has never seen it.** Prerequisites, install, booting with no database, `railway run` vs `railway ssh`, and a symptom→cause table for the traps that waste an afternoon. |
| `../CLAUDE.md` | 🟢 LAW | How this repo works — the **mechanics**. ⚠️ Its first ~140 lines are an accumulated status log and parts are stale; for *current state* use `NEXT-PLAN.md`. Now opens with a START HERE pointer. |

## Design — frozen, do not reopen

| Doc | | |
|---|---|---|
| [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) | 🟢 LAW | **The design rule book — the only one.** B1–B10 invariants, §0 the filing law, §M the material law. Enforced by `test:design-frozen` + `test:design-one-door`. |
| [`design-system/v3-2026-08-11-landing-discovery/`](design-system/v3-2026-08-11-landing-discovery/ACCEPTANCE.md) | 🟢 ACCEPTED | **The round-2 design delivery** — landing composition + `/markets` discovery, accepted 2026-08-12 for those surfaces only. `ACCEPTANCE.md` records INHERIT/IGNORE per file and where our laws beat the kit. Being applied per `../design-brief/PLAN-OF-RECORD.md`. |
| [`design-brief/handover-2026-08/`](design-brief/handover-2026-08/README.md) | ⚪ RECORD | **The measured reference that outlived the August commission round**: `LAWS.md` (85 invariants + 4 licence conditions), the trilingual measurement corpus, the system inventory, integration cost notes. Live repo wins on any disagreement. |
| `../design-brief/PLAN-OF-RECORD.md` | 🔵 LIVE | **The inheritance plan** — how the accepted round-2 kit is being applied (gates, batches, decisions log). Updated after every batch. |
| [`design-master-brief.md`](design-master-brief.md) | 🟢 LAW | Palette + composition source of truth; live tokens match to ~0.3%. |
| [`POLISH-BACKLOG.md`](POLISH-BACKLOG.md) | 🔵 LIVE | §1 and §4 done; **§2 FIX SOON and §3 LATER are open**. §3 carries the measured scale ceilings. |

⚠️ The old `design_handoff` kit is **deleted and forbidden** — following it reverts the brand
to teal and resurrects the killed light theme.

## Money, payments, payouts

| Doc | | |
|---|---|---|
| [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) | 🟢 LAW | **The single source of truth for payout state.** Everything else in `SELCOM-*` is history or evidence. Contains the `railway run` vs `railway ssh` trap and two fenced wrong diagnoses. |
| [`SELCOM-DISBURSEMENT-ACTIVATION.md`](SELCOM-DISBURSEMENT-ACTIVATION.md) | 🔵 LIVE | Activation runbook. Carries a "CORRECTED 2026-07-30" banner — read that first. |
| [`SELCOM-API-DIGEST.md`](SELCOM-API-DIGEST.md) | 🟢 LAW | Real-money signing reference for the adapter. |
| [`SELCOM-010-INVESTIGATION.md`](SELCOM-010-INVESTIGATION.md) | ⚪ RECORD | ✅ Closed. Kept deliberately as the reasoning trail — the wrong answer was confident. |
| [`SELCOM-PAYOUT-INCIDENT-2026-07-30.md`](SELCOM-PAYOUT-INCIDENT-2026-07-30.md) | ⚪ RECORD | The incident itself. |
| [`SELCOM-DISBURSEMENT-REQUEST.md`](SELCOM-DISBURSEMENT-REQUEST.md) | ⚪ RECORD | ✅ Granted 2026-07-27. |
| [`PAYMENT-INTEGRATION-CHECKLIST.md`](PAYMENT-INTEGRATION-CHECKLIST.md) | 🔵 LIVE | Run the day new API keys land. |
| [`FEE-MODEL-DECISION-2026-07-14.md`](FEE-MODEL-DECISION-2026-07-14.md) | ⚪ RECORD | **SHIPPED.** Fixed the bug where a winner was paid less than they staked (the capped fee). ⚠️ This index used to carry a second row claiming a "newer 2026-07-22 file" awaiting a ruling — **no such file exists, and the question it described was RULED 2026-07-23**: new long-form polls freeze `loser-share` (3%+10% of the losing pool), Up & Down rounds freeze `capped-commission` @ 13% with the ⅓ ceiling, models never mix. The ruling's record is `COMPLIANCE-DECISIONS.md` § 2026-07-23; the maths is `src/lib/payout.ts`. |
| [`F6-LIQUIDITY-DESIGN.md`](F6-LIQUIDITY-DESIGN.md) | 🟠 DESIGN | Seeded liquidity. **No code written.** |
| [`bonus-wallet-plan.md`](bonus-wallet-plan.md) | ⚪ RECORD | Shipped 2026-06-26. |
| [`proposals.md`](proposals.md) | 🟢 LAW | Player market proposals → instant approval bonus. Supersedes the old prize model. |

## Backups, ops, infrastructure

| Doc | | |
|---|---|---|
| [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md) | 🟢 LAW | The four commands, the drill, **the eight defects a green suite missed**, and the `\| tee` bug that made the nightly report success while shipping nothing. Read before touching backups. |
| [`LIVE-HOSTING-STATUS.md`](LIVE-HOSTING-STATUS.md) | 🔵 LIVE | Living snapshot of go-live hosting. Cloudflare zone, DNS, R2. |
| [`GO-LIVE-RUNBOOK.md`](GO-LIVE-RUNBOOK.md) | ⚪ RECORD | How 50pick.tz *was* taken live (2026-07-17). |
| [`LAUNCH-GO-NO-GO.md`](LAUNCH-GO-NO-GO.md) | 🔵 LIVE | The env/infra walk-down before real money. |
| [`CLOUDFLARE-SETUP-GUIDE.md`](CLOUDFLARE-SETUP-GUIDE.md) | ⚪ RECORD | Mostly done. ⚠️ Keep the mail-records section — it is what stops `ali.sheib@50pick.tz` breaking. |
| [`DATA-LAYER.md`](DATA-LAYER.md) | 🟢 LAW | Read before touching any persistence. |
| [`FLOWS.md`](FLOWS.md) | 🟢 LAW | Every redirect, gate and recovery path, with file references. |
| [`EMAIL-SIGNATURES.md`](EMAIL-SIGNATURES.md) | ⚪ RECORD | Signature images hosted on the domain. |
| [`PARALLEL-SESSION-COORDINATION.md`](PARALLEL-SESSION-COORDINATION.md) | ⚫ HISTORICAL | ⚠️ Written for a specific Session M / Session E split whose A2–A5 scope is **finished**. The *hazard* it describes is still real — parallel lanes still run here, and an unmerged 28-commit branch is open — but the role assignments no longer apply. Use a git worktree per lane. |

## Compliance and certification

| Doc | | |
|---|---|---|
| [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) | 🟢 LAW | Owner-authorised decisions touching a compliance control. Append, never rewrite. |
| [`NIDA-POLICY.md`](NIDA-POLICY.md) | 🟢 LAW | Owner decision 2026-07-19. Authoritative over any contradicting doc. |
| [`gli-remediation-plan.md`](gli-remediation-plan.md) | 🟢 LAW | Canonical GLI spec of record, ticket-level acceptance criteria. |
| [`gli-remediation-tracker.md`](gli-remediation-tracker.md) | 🔵 LIVE | The done / not-done companion to the plan above. |
| [`REGULATOR_STRESS_REPORT.md`](REGULATOR_STRESS_REPORT.md) | ⚫ HISTORICAL | 2026-05-26 — **the oldest doc here.** Opens with "DO NOT SHOW THIS TO A REGULATOR AS-IS". Predates the licence, the fee-model fix, the design freeze and every payment change. Re-run before citing it. |

## Up & Down

| Doc | | |
|---|---|---|
| [`UPDOWN-SPEC.md`](UPDOWN-SPEC.md) | 🟢 LAW | Owns **WHAT** it is — rules, workflows, states. |
| [`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md) | 🟢 LAW | Owns **HOW** it is built — data model, engines, money path. |
| [`UPDOWN-PRICING.md`](UPDOWN-PRICING.md) | 🟢 LAW | The margin / winning-boundary math. Money-critical. |
| [`UPDOWN-FINAL-DESIGN.md`](UPDOWN-FINAL-DESIGN.md) | 🟢 LAW | **The settled Up & Down design, written from production measurements.** §4 names what must NOT be re-opened (the settlement proof, refund-reason copy, the result moment); §3b carries G1–G6. |
| [`FINDING-GOLD-CHAINS-STALLED.md`](FINDING-GOLD-CHAINS-STALLED.md) | 🟠 **OPEN — CLEARED TO FIX (Ali, 2026-08-14: ship it first)** | ⛔ **All three XAU chains read `RUNNING` and have opened NO round since their last session close** — 15m for ~17h, 30m/60m for ~4 days (measured 2026-08-14). `advanceChain`'s session gate returns BEFORE the re-arm, so the chain stays pinned to a boundary inside the closed session and the gate is re-evaluated at that same stale instant forever: a deadlock by construction, immune only for crypto. Mechanism, one-line fix, and the red-first plan are all in the file. |
| [`updown-operator-guide.html`](updown-operator-guide.html) → [`50pick-updown-operator-guide.pdf`](50pick-updown-operator-guide.pdf) | 🟢 **LAW — THE OPERATOR CONTRACT** | ⭐ **The document the admins are handed.** 14 sections: what the game is, every field and what to enter, the **Feed record** and the measured round-length gate (§8.5), the first live round (§9), the **six refund reasons and what to say to a player** (§10), the daily check (§11), troubleshooting (§12), and **every element on the player's card and when it is visible** (§13). ⛔ Edit the **HTML**, then regenerate with `node scripts/generate-pdfs.mjs`, then **verify by rasterising** — never by trusting the render. |

## Up & Down — ops scripts (there is deliberately no delete in the console, E-59)

| Script | | |
|---|---|---|
| `scripts/ops-updown-reset-games.mts` | 🟢 LAW | Clears chains, rounds, markets and observations so operators start from a clean board. **Dry run by default; refuses outright while any round is unresolved or any position is OPEN, and there is no `--force`.** Assets are never touched. |
| `scripts/ops-updown-retire-asset.mts` | 🟢 LAW | Removes an asset row that should not exist. **Dry run by default; refuses anything still ENABLED or still referenced by a chain or an observation**, and writes a `updown.asset.retired` compliance row per removal. Used 2026-08-05 to retire `GOLD` (a duplicate of `XAU`), `SNP500` (unquotable symbol, pointed at kitco.com) and `BNB` (stored as `macro`, which would shut a 24/7 coin at weekends). |

## AI

| Doc | | |
|---|---|---|
| [`AI-POLL-SOURCES.md`](AI-POLL-SOURCES.md) | 🟢 LAW | The AI generator is bound to the trusted-source registry. One rule, and it is enforced. |

## Planning and backlog — read the status line, not the title

| Doc | | |
|---|---|---|
| [`perfection-plan.md`](perfection-plan.md) | 🟠 DESIGN | The 9 role-gate *framework*. ⚠️ **Aspirational, not a defect list** — and until 2026-07-31 its own header cited itself as the authority. For what is actually open, use `NEXT-PLAN.md`. |
| [`feature-backlog.md`](feature-backlog.md) | ⚫ HISTORICAL | Wishlist. **Not committed requirements.** |
| [`LOAD_DAY1_FINDINGS.md`](LOAD_DAY1_FINDINGS.md) | ⚫ HISTORICAL | First-ever Postgres load run. Superseded by the measured ceilings in `POLISH-BACKLOG.md` §3. |
| [`NEXT-SESSION-MATERIAL-VISIBLE.md`](NEXT-SESSION-MATERIAL-VISIBLE.md) | ⚫ HISTORICAL | The design session's context notes for the material-adoption push. Its tracker MOVED to `ux-audit-2026-08/MASTER-PLAN.md` §6 (DA) — work there, not here. The tolerated `NEXT-SESSION-*` exception (design-system README §0b): **delete it when the DA/DS sweep closes.** |
| [`GLI-COST-TRACKER.csv`](GLI-COST-TRACKER.csv) | ⚪ RECORD | Cost lines for the GLI remediation. Companion to `gli-remediation-tracker.md`. |

---

## Session prompts, findings and operator material

> ⚠️ **ADDED 2026-08-15, and the omission was the point.** Eleven files at this level were
> absent from this index — including `FAILURE-INVENTORY.md`, which two gates cite — while the
> count above still read "46 files … plus 45 documents" against a real **60**. Rule 4 below
> says an unindexed doc is one nobody trusts; it had been broken for four of these files since
> they were created. The count is now derived by listing, not remembered.

| Doc | | What it is |
|---|---|---|
| [`FAILURE-INVENTORY.md`](FAILURE-INVENTORY.md) | 🔵 LIVE | **Every server refusal a player can reach**, what it means, what they are told, and at what severity — plus **§6, the action × channel feedback matrix** (171 server actions, opened at their call sites). Cited by `test:failure-reasons` and `test:feedback-law`. Read before changing any failure copy. |
| [`SESSION-PROMPT-JAY-COMMENTS.md`](SESSION-PROMPT-JAY-COMMENTS.md) | 🔵 LIVE | ⭐ **THE GAMING BOARD'S REQUIREMENT LIST — 15 items, triaged against the code** (`50pick_website_comments-2.pdf`, Jay, 2026-08-19). Ali: *"Jay is from Gaming Board — anything he says is actually legit, we just do it."* So the default on every item is IMPLEMENT; the document exists to say what **already exists** (two items are shipped — the Up & Down handover and the notification digest), where **reality constrains delivery** (S&P 500 needs a data-plan purchase *and* a cash-session calendar), and which item **reverses a decision the code attributes to the Board itself** (#1, KYC on withdrawal — `FLOWS.md:30` cites the "TZ Gaming Board model" as the reason the gate exists, so that attribution must be rewritten or the gate gets re-added by someone reading the docs correctly). ⛔ Carries the labelling trap for #10: `results/page.tsx:366` passes a literal `"MARKET"` to `outcomeWord`, so adding Up & Down rounds without fixing it prints **"YES won" over an Up bet**. |
| [`SESSION-PROMPT-VISUAL-SWEEP.md`](SESSION-PROMPT-VISUAL-SWEEP.md) | 🔵 LIVE | ⭐ **A LIVE COMMISSION** (Ali, 2026-08-15): every pixel, control, width and language against the design kit; nothing technical. ⛔ **Seven spent prompts were DELETED on 2026-08-16** at Ali’s instruction, so the tree stays down to the prompts that are actually live — this one and `SESSION-PROMPT-JAY-COMMENTS.md`, and no more. Their substance was already in the files that own each subject — `DESIGN_AUTHORITY` §F/§L, `FAILURE-INVENTORY` §6/§7, `LIVE-QA-CAMPAIGN` §6b — and git history holds the originals. ⚠️ One item outlived its prompt: **unit H** (`qa:refusal-frames`’ drive half), recorded in `LIVE-QA-CAMPAIGN` §6b, session-48 block. |
| [`ADMIN-CONSOLE-FINDINGS.md`](ADMIN-CONSOLE-FINDINGS.md) | ⚪ RECORD | Session 44's admin-console audit — A1–A6, all shipped. Carries the role × page coverage buckets. |
| [`UPDOWN-PLAYBOOK.md`](UPDOWN-PLAYBOOK.md) | 🔵 LIVE | The Up & Down operator playbook — which asset/duration pairings the tape actually supports, and why a pairing is greyed. |
| [`FEE-DOCX-SUPERSEDED.md`](FEE-DOCX-SUPERSEDED.md) | ⚪ RECORD | The banner for two `.docx` hand-outs that state **retired** rates. A binary cannot carry its own warning, so it lives here. ⛔ Regenerate from `RULES.md` before either is handed to anyone. |
| [`FINDING-SCHEDULER-BUSY-WAIT.md`](FINDING-SCHEDULER-BUSY-WAIT.md) | ⚪ RECORD | A single filed finding, kept as its own file because it predates the register. |
| [`rates-for-admins.html`](rates-for-admins.html) · [`rates-decisions-needed.html`](rates-decisions-needed.html) | ⚪ RECORD | Two generated hand-outs from the 2026-08-14 rates programme. Snapshots — `RULES.md` is the truth. |

## Rules for this directory

1. **One live plan.** `NEXT-PLAN.md`. Do not create `NEXT-SESSION-*.md`, `SESSION_STATUS.md`
   or a new tracker — a previous cleanup deleted 28 such files for exactly this reason.
2. **Same change updates code AND docs.** Update the doc that already owns the subject.
3. **Never silently "update" a ⚪ RECORD.** Its value is being a true account of a moment.
   Write a correction beneath it, fenced, so nobody re-derives the wrong answer.
4. **Add every new doc to this index, with a status.** An unindexed doc is one nobody trusts.
5. **`npm run test:docs` before you claim the docs are clean.**
