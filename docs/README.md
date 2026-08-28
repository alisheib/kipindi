# `docs/` — the index, with an honest status on every file

Written 2026-07-31. **Read this before opening anything else in here.**

⭐ **If you are an ADMIN rather than a developer, you want exactly two files:**
[`50pick-updown-operator-guide.pdf`](50pick-updown-operator-guide.pdf) — the Up & Down operator
contract — and [`50pick-ai-cycles-admin-guide.pdf`](50pick-ai-cycles-admin-guide.pdf), which explains
the **AI spend cycles**: what a $100 cycle is, the red bar that pauses the AI and how to resume
it, and what a market actually costs. Everything else in here is for whoever builds and runs
the platform.

⚠️ **This sentence used to state a file count. It said 67; there were 70.**
Two of the three were added by the session that noticed — but it was already wrong by one
before that, which is the point: a count written in prose is a count that drifts the next
time anyone adds a document, and nobody re-runs the count to check. **Derive it, never quote
it:**

```bash
git ls-files docs | grep -c '^docs/[^/]*$'
```

⛔ **Count TRACKED files, not what happens to be on disk.** The first version of this line said
`find docs -maxdepth 1 -type f | wc -l`, and `find` counts untracked leftovers too — a stray
export, a `.env`, an unpushed PDF — so it gives a different answer on this laptop, on the other
laptop and in CI. `test:design-one-door` §6 holds this file to the tracked count and has already
been red for days over two untracked PDFs; a derivation whose answer depends on the room it runs
in is the same defect as a quoted number, one level up. This is the same correction the
`docs/README.md` row in `CLAUDE.md` already records, applied to this file's own opening.

At this level there is this index plus the documents beside it, and five
subdirectories with their own indexes: [`design-system/`](design-system/README.md) (the index of
the delivered design archive — **record, not rule**; the design rule book is
[`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) and nothing else is needed to build correctly),
[`design-brief/`](design-brief/INTAKE.md) (the
material commission's brief + intake playbook), [`ux-audit-2026-08/`](ux-audit-2026-08/MASTER-PLAN.md)
(the 2026-08 UX-audit campaign — ⚪ **CLOSED 93/93 on 2026-08-10**, a record, not a plan),
[`runbooks/`](runbooks/README.md) (the operator PDFs + their HTML
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
| [`READ-TIERS.md`](READ-TIERS.md) | ✅ **RULED, BUILT + PROVEN LIVE** | ✅ **§4 IS ANSWERED (2026-08-26, session 66) AND INCREMENT 1 IS SHIPPED.** ⚠️ **This row previously read "AWAITING ALI'S RULING · NOTHING IN IT IS BUILT"; it is corrected in place rather than duplicated.** Ali **delegated** the five decisions — *"you decide based on how the overall platform works and how it behaves and according to our direction"* — and §4a rules each from a **measured precedent**: **D1** masked (movements yes, totals no) · **D2** masked, with the mailbox **inheriting** it as an acceptance condition in §7 · **D3** ADMIN **not** exempt · **D4** the reveal is audited · **D5** mint QA `SUPPORT` **and** `AUDITOR` personas on production. ⭐ **A SECOND AXIS, not a replacement:** the existing role×domain matrix answers *"may this role reach this ROUTE?"* and structurally cannot answer *"may this role read this FIELD?"* — the only question that matters on `/admin/players`, a `support`-domain route where SUPPORT already holds **view+act**. ⭐ **§1 is measured against production, not assumed** (`rbac-census.cjs`: `RoleDomainGrant` holds **0** override rows, so the code defaults ARE the live matrix): every ACTION on the player page is already capability-gated and the phone and document number are already masked **for everybody** — 🔴 what is open is that a support agent reads **every player's exact wallet balance, lifetime deposits, full email, date of birth and region.** ⭐ **The design's whole argument sits in one cell:** SUPPORT reads money as **`masked`, not `—`** — *transactions yes, totals no*. ⭐ **AND §4c IS THE ONE TO READ:** the build found §2.3/D3 ("ADMIN is not exempt") contradicting §3.2's grid ("ADMIN: read"), and resolved it by **defining the cell** rather than changing the grid — `read` = **masked at rest, MAY reveal**. ADMIN and SUPPORT therefore render the same dots and what separates them is **whether a reveal control exists at all**. ✅ **Shipped `682bfcfa`:** the axis in `roles.ts`, `test:read-tiers` **25/0**, `red:read-tiers` **5/5 caught**. ✅ **ALL OF IT IS BUILT AND PROVEN ON PRODUCTION — `qa:read-tiers` 18/0 (§5a):** the `RoleReadGrant` table (migration verified applied, 0 rows so defaults are live), `<Sensitive>` + the audited reveal, the `/admin/players/[id]` header wiring, and the **Reads tab** on `/admin/roles`. ⭐ **D5 was closed by CREATING the state** — both personas registered on the real sign-up form and promoted by a real ADMIN session through `/admin/staff`: SUPPORT 0→1, AUDITOR 0→1. ⭐ **Proven by refusal with positive controls in the same run**, and sealed against a modified client: ADMIN's real reveal request replayed from SUPPORT's session is refused **naming the class**, with the address nowhere in the response. 🔴 **Read §1a before anything else** — the unit's own premise was wrong: three of the five reads §1 called open were already closed by the DOMAIN axis, so the real exposure was two fields and one role, and §3.2's headline cell is a **ceiling for later, not a narrowing now**. ⚠️ **Unit K is still not ✅**: the ticket system (#12) and `msaada@50pick.tz` (#13) are not built, and **D2 binds them**. |
| [`RULES.md`](RULES.md) | 🟢 LAW | ⭐ **THE MONEY RULES — THE ONLY STATEMENT OF THEM.** What we charge (13% of the losing side, both games), the stake bounds (1,000/1,000,000 **per bet**), positions per market, bonus wagering, free cancellation, the withdrawal fee, and the standard a failure message must meet — each with where it is enforced in code, where it is configured, and which surfaces state it. ⛔ **No other document restates a rate.** If anything anywhere disagrees with this file, that thing is the defect. Read it before touching money, and before writing any copy that mentions a fee or a limit. ⚠️ Not the design-law file of the same name under `design-system/`. |
| [`SESSION-PROMPT-CLOSE-THE-BOARD.md`](SESSION-PROMPT-CLOSE-THE-BOARD.md) | 🔵 LIVE | ⭐ **THE NEXT SESSION STARTS HERE.** The six items left open at the close of session 60 (2026-08-24), each with its measurement, its guard and what "done" means — plus §7, the eleven traps that board was built on, every one paid for in a single day. Two of the six are Ali's ruling and each carries a partial delivery that stands on its own. Ordered: money first. |
| [`NEXT-PLAN.md`](NEXT-PLAN.md) | 🔵 LIVE | **The one live plan.** Opens with "PICK UP HERE" — the state at the close of the last session, what is done, what is left. Start every session here. |
| [`DATA-AUDIT-2026-08-20.md`](DATA-AUDIT-2026-08-20.md) | 🔵 LIVE | **The whole-platform data-handling audit AND its fixing session.** ⭐ **§0a first** — it records what shipped, what remains, and **every place the audit itself was wrong**, because several findings were. Two defects worse than anything it originally contained were found while fixing it: the player data export was shipping the account's password hash, and the audit-chain verifier was reporting a break on an intact chain. ⛔ Do not re-audit §1 — it is positive evidence with citations. ⚠️ §4's F-08 premise is marked WRONG in place; read the annotation before acting on it. |
| [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) | 🔵 LIVE | **The finding register (E-1…) + the §6b session handoffs** — the newest handoff sits at the TOP of §6b, and a commit newer than the newest handoff means another session is IN FLIGHT. Guarded by `test:tracker-hygiene`. |
| [`ux-audit-2026-08/MASTER-PLAN.md`](ux-audit-2026-08/MASTER-PLAN.md) | ⚪ RECORD | The 2026-08 UX-audit implementation tracker — Sessions A/B/C, the DS/DA design sweeps, the §9 decisions. ⚠️ **Was listed 🔵 LIVE here until 2026-08-21; it closed on 2026-08-10 at 93/93** and its own PICK-UP block has said so, in bold, ever since — including *"a new session should take whatever Ali names next, not this plan"*. An index calling a closed plan live is how a session picks up finished work. ⛔ Do not resume from it; three of its working files were deleted on 2026-08-21 as spent (`RUN-EVERYTHING-PROMPT.md`, `UPDOWN-STABILIZATION-PROMPT.md`, `SESSION-A-EDIT-SPECS.md`), so its file tree at §"repo layout" no longer matches what is on disk. |
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
| [`design-brief/maswali-2026-08/handover/`](design-brief/maswali-2026-08/handover/README.md) | 🟢 DELIVERED · NOT MERGED | ⭐ **`MASWALI-DESIGN-R1` — the Maswali Millionea design round, returned 2026-08-28.** Four sets, all invariant to §0: **A** the ten-row slip at 360/768 in Swahili (five states), **B** the loss receipt on the 560 tier, **C** the money figure gold-vs-mono, **D** the three tier glyphs. Plus `sources/` — the living `.dc.html` artboards, so round 2 edits rather than redraws. ⭐ **The §2 token check passed: all 59 tokens exist.** ⭐ **And the ruling that was expected to be contested was not** — `DECISIONS.md` rules *"Ship C2, neutral mono ink"* and records *"Nothing rose to wrong"*, so `MASWALI-MILLIONEA-IMPLEMENTATION.md` §12.1 row 2 stands. ⛔ **Nothing is merged into `src/` and nothing is built** — §0's seven decisions are Ali's and **D-1 (the licence class) blocks everything**. Its own `OPEN-QUESTIONS.md` holds nine asks, incl. the bottom-rail slot and the 1024–1279 band. |
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
| [`DATA-RETENTION.md`](DATA-RETENTION.md) | 🟢 LAW | **The authority for every retention period.** Read the Enforcement column before quoting a row to anybody — it separates a control from an intention, which is the defect it was written to close (audit F-01). ⚠️ §2 holds the unresolved marketing-consent conflict and the three other answers owed by Ali. |
| [`SESSION-PROMPT-DATA-FINALISE.md`](SESSION-PROMPT-DATA-FINALISE.md) | 🔵 LIVE | ⭐ **The brief for finishing the data work** — written 2026-08-21 by the session that did the audit, for the session that closes it. Erasure first, because it is the only item that can hurt someone: nulling `idNumber` would repeal the sole enforcement of one-document-one-account. Also carries the four decided answers, what NOT to do (the snapshot skip is settled), and the loose ends. |
| [`FLOWS.md`](FLOWS.md) | 🟢 LAW | Every redirect, gate and recovery path, with file references. |
| [`EMAIL-SIGNATURES.md`](EMAIL-SIGNATURES.md) | ⚪ RECORD | Signature images hosted on the domain. |
| [`PARALLEL-SESSION-COORDINATION.md`](PARALLEL-SESSION-COORDINATION.md) | ⚫ HISTORICAL | ⚠️ Written for a specific Session M / Session E split whose A2–A5 scope is **finished**. The *hazard* it describes is still real — parallel lanes still run here, and an unmerged 28-commit branch is open — but the role assignments no longer apply. Use a git worktree per lane. |

## Compliance and certification

| Doc | | |
|---|---|---|
| [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) | 🟢 LAW | Owner-authorised decisions touching a compliance control. Append, never rewrite. |
| [`BOARD-DISCLOSURE-B-E.md`](BOARD-DISCLOSURE-B-E.md) | ⚪ RECORD | The statement sent to the Gaming Board **before** identity verification stopped gating withdrawal (`E-175`) — the joint effect of comments #1 and #8, every control that remains and where it actually runs, the three that do **not**, and the fail-open caveat on the record that replaced the gate. ⛔ Says `(idType, idNumber)` across four documents, never *"one NIDA, one account"* — overstating the residual control to a regulator is the failure it exists to prevent. |
| [`IDENTITY-POLICY.md`](IDENTITY-POLICY.md) | 🟢 LAW | Owner decision 2026-07-19, widened 2026-08-19. Authoritative over any contradicting doc. ⚠️ **Was `NIDA-POLICY.md` until 2026-08-20** — renamed because it stopped being about one document: a player proves identity with **any ONE of four** (NIDA · passport · driving licence · voter's card). Carries the per-document format table with its sources — two published, two openly absent — and the 🔴 **residual gap** that per-`(type, number)` uniqueness cannot stop one human using two *different* documents on two accounts. |
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
| [`ai-cycles-admin-guide.html`](ai-cycles-admin-guide.html) → [`50pick-ai-cycles-admin-guide.pdf`](50pick-ai-cycles-admin-guide.pdf) | 🟢 **LAW — THE ADMIN CONTRACT FOR AI SPEND** | ⭐ **7 pages, handed to the admins.** What a $100 cycle is and why it is an AMOUNT rather than a period; the four figures on the Spend-cycles panel; **the red "AI is paused" bar and the two things to check before pressing Start**; the cycle history and what "Lasted" tells you; what a market costs and why the "Suggested" column is a cost floor and **never a price** (TZS 1,000 is the minimum STAKE); every setting; **cycles vs. top-up windows**, which are different things people confuse; and the monthly routine. ⛔ Edit the **HTML**, then regenerate with `node scripts/generate-pdfs.mjs`, then **verify by rasterising** — never by trusting the render. ⚠️ Screenshots in `docs/guide-img/cyc-*.png` are captured from the real admin screen by a driver; re-shoot them if the page changes. |
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
| [`SESSION-PROMPT-MASWALI-DESIGN.md`](SESSION-PROMPT-MASWALI-DESIGN.md) | ⚪ RECORD | ⭐ **`MASWALI-DESIGN-R1` — DELIVERED AND FILED 2026-08-28.** The instruction set for whichever session receives the Maswali design handover from Claude Design. If Ali hands you a handover under that key name, **this file is your brief**; `grep -rn "MASWALI-DESIGN-R1" docs/` finds every reference. ⛔ **§2 first, and it is mechanical:** every token named in the handover's `TOKENS-USED.md` must exist in `tokens-LOCKED.css` — the file gives the exact `comm -23` to run — because one invented colour means the deliverable cannot be built without amending a frozen system. §3 names the one ruling most likely to be contested (gold vs mono on the jackpot figure) and says plainly that if Ali rules for gold then §12.1 must **change**, not sit beside a contradicting handover. §4 lists what goes stale the moment it lands, to fix in the SAME commit. §5 carries two traps already paid for: 🔴 **extracting the package in-repo took `test:design-one-door` 4-red** (it carries a second `DESIGN_AUTHORITY.md`, and the gate globs the disk so `.gitignore` cannot quiet it), and a commission must never carry a **kept** snapshot. ⛔ §6: this does not unblock §0 — the licence class, the guarantee funding, the void rule and the ticket cap are still Ali's. |
| [`SESSION-PROMPT-MASWALI-BUILD.md`](SESSION-PROMPT-MASWALI-BUILD.md) | 🔴 BLOCKED ON D-1 | ⭐ **`MASWALI-BUILD` — THE ONE DOOR for the third product.** The build plan, the nine chunks S0–S8 with their acceptance lines, the gates, the traps, and a tracking table to tick in the same commit as the work. ⭐ **Six of §0's seven decisions were answered 2026-08-29** and are recorded in [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md): progressive-only (no 20M guarantee) · 13% of losing stakes · void counts CORRECT with a 3-void cycle refund · no bonus money · capped at 10 tickets · route `/millionea`. 🔴 **D-1, the licence class, is unanswered and blocks every line of code** — if it returns negative the plan stops and nothing is lost, which is why the design was bounded to what §0 cannot change. ⚠️ **D-7 is a rename that must happen BEFORE S1** (`/maswali/…` → `/millionea/…`; module names unchanged). §2 carries the fee rates MEASURED from production, so no session re-derives them: the operator nets **11.05%** of losing stakes, not 13%, once TRA and GBT come off the fee. |
| [`MASWALI-MILLIONEA-IMPLEMENTATION.md`](MASWALI-MILLIONEA-IMPLEMENTATION.md) | 🟠 DESIGN | **A THIRD PRODUCT, evaluated — nothing is built and nothing is decided.** The Arrow Consulting jackpot proposal (fixed TZS 2,000 entry, 10 questions, three shared-pool tiers) measured against this platform as it actually is, plus the nine sessions that would build it. ⭐ **Read §0 first — seven decisions are Ali's and they block every line of code**, starting with whether the Gaming Board licence even covers a fixed-stake multi-event jackpot. 🔴 **§5 is the one that matters:** the advertised TZS 20,000,000 guarantee is an open-ended weekly liability — ten binary questions is only **1,024 combinations**, so at 2,000 tickets a week the top prize is hit ~86% of cycles, and the pool self-funds 20M only at **20,000 tickets**. 🔴 **And §3 G-14:** buying all 1,024 tickets costs TZS 2,048,000 and *guarantees* the top prize, so an uncapped ticket count is both an arbitrage hole and the clearest RG harm in the product. ⭐ The proposal's 13/50/25/12 split needs **no renegotiation** — 50+25+12 = 87 = 100−13, so it already reads as "our 13%, then the rest in three parts"; §4 only has to rule *13% of what*. ⛔ §12 rejects the proposal's visual direction outright against `DESIGN_AUTHORITY.md` — no gold on the jackpot figure (it is the most *unearned* number the platform would ever show), no count-up ticker (Law 7), no sub-brand (B9/M8). §13 carries the verdict from all nine roles. ⚠️ This file states **no law**; `RULES.md` does. |
| [`perfection-plan.md`](perfection-plan.md) | 🟠 DESIGN | The 9 role-gate *framework*. ⚠️ **Aspirational, not a defect list** — and until 2026-07-31 its own header cited itself as the authority. For what is actually open, use `NEXT-PLAN.md`. |
| [`feature-backlog.md`](feature-backlog.md) | ⚫ HISTORICAL | Wishlist. **Not committed requirements.** |
| [`LOAD_DAY1_FINDINGS.md`](LOAD_DAY1_FINDINGS.md) | ⚫ HISTORICAL | First-ever Postgres load run. Superseded by the measured ceilings in `POLISH-BACKLOG.md` §3. |
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
| [`SESSION-PROMPT-AI-CYCLES.md`](SESSION-PROMPT-AI-CYCLES.md) | 🟢 **LIVE — SHIPPED 2026-08-23 (session 59)** | ⭐ **AI SPEND COUNTED IN CYCLES, SO THE PLATFORM CAN SAY WHAT A RESOLUTION COSTS.** A cycle is a **$100 tranche** of Claude spend (custom, settable), numbered for ever and **never reset** — and it is a **CHECKPOINT**: when one ends, AI poll posting and AI resolving are BLOCKED until an officer starts the next (Ali, 2026-08-23). ⛔ Still exactly one money authority: `limitUsd` says how MUCH may be spent, a cycle boundary says WHEN AN OFFICER MUST LOOK — they cannot disagree because only one is about an amount, and the budget is checked first. ⛔ `cycleStartIso` → `topUpWindowStartIso`; 🔴 the legacy key is still READ, because renaming without it would have zeroed the live "spent this window" counter and re-opened an exhausted budget. ✅ Attribution shipped: `subjectType`/`subjectId` through **all 12** `recordAiUsage()` call sites. 📊 **Measured on production:** $243.32 over 4,271 calls → cycle 1 lasted **12.8 days**, cycle 2 **20.9 days**, cycle 3 open at $43.32 — so a $100 cycle is **two to three weeks**, not two months. 🔴 **The polls line costs ~$2.66 of AI per settled market against TZS 1,737 of commission earned.** ⭐ **`red:ai-cycles` 23/23 · `test:ai-cycles` 115/115 — and a red that MISSED found a real shipped bug: the checkpoint would have fired ZERO times, because a call straddling a boundary opened the successor.** ⚠️ Ali must enter the USD→TZS rate before any shilling figure appears; there is deliberately no default. |
| [`SESSION-PROMPT-DESIGN-PERFECTION.md`](SESSION-PROMPT-DESIGN-PERFECTION.md) | 🔵 **LIVE — THE COMMISSION RUNNING NOW** | ⭐ **THE 2026-08-21 SIXTEEN-LENS DESIGN AUDIT, AS AN ELEVEN-STAGE WORK PROGRAMME** — and the campaign's ONLY tracker, so no second one gets created beside it. It carries the **STATUS BOARD** (stage → commit → live-verified), the **measured baseline** every stage is judged against (`test:all` 230/232 at `937e4d19`; the two red need a live `:3000` and say so themselves), the seven **owner decisions D1–D7** with the default applied when Ali has not answered, and a **do-not-fix list** of things the audit checked and found correct — the modal ✕ (already 48px), the notifications poll (not redundant with SSE), the frozen spacing and legacy radius scales. ⛔ Its Critical is that **every alpha-modified colour utility in the product compiles to nothing** (`bg-no-500/10`, `border-border/60`, … — 577 usages), which is why danger callouts are indistinguishable from structure. Mark it **SPENT** when the board is complete; do not delete it. |
| [`SESSION-PROMPT-BONUS-AND-CARE-DESK.md`](SESSION-PROMPT-BONUS-AND-CARE-DESK.md) | 🔵 **LIVE — THE NEXT COMMISSION** | ⭐ **Supersedes `SESSION-PROMPT-FINISH-THE-BOARD.md`**, whose Unit B (`E-177`) shipped 2026-08-26. Five units: **A** `E-224` — a bonus cleared having risked nothing, **RULED by Ali and not yet built** (§2 carries the full mechanics: *a returned stake does not discharge a wagering obligation, and nothing is ever clawed back — the bonus is RE-LOCKED*) · **B** Jay unit K's other half, the ticket system + `msaada@50pick.tz`, ⛔ **bound by ruling D2** — #13 is not DONE until its ticket view resolves `identity.contact` through `canRead` · **C** Jay unit L, new markets, one asset per commit · **D** Jay unit M, per-bet UD notifications behind a default-OFF switch · **E** the dated cert watch (`E-195`, from ~2026-09-15). ⛔ **§7 is the part to read before writing code** — eight traps session 66 paid for, including *a guard that only checks the WIRED surface is not coverage* (46 checks, 13 RED mutations and an 18/0 live drive were all green while the read axis governed one page out of four), *a restore must be IDEMPOTENT*, *a guard against an append-only log needs a RUN BOUNDARY*, and *on this platform a money-commit control is ALWAYS two steps*. ⭐ §0c opens with the trap that cost that session its first hour: **after a pull, check whether `prisma/schema.prisma` moved — NOT the lock file.** |
| [`SESSION-PROMPT-JAY-COMMENTS.md`](SESSION-PROMPT-JAY-COMMENTS.md) | 🔵 **LIVE — THE COMMISSION TO RUN** | ⭐ **THE GAMING BOARD'S 15 REQUIREMENTS, as an execution commission** (`50pick_website_comments-2.pdf`, Jay, 2026-08-19). Ali: *"Jay is from Gaming Board — anything he says is actually legit, we just do it"*, and *"none is allowed to be skipped… end to end sealed."* So the default on every item is IMPLEMENT, all 15 map to units **A–M**, and it carries a **completion ledger** (§1), a **zero-flaw gate of twelve mechanical checks** (§0b), an **integration matrix** for the pairs that must be driven together (§6), and a **single continuous end-to-end seal drive** on production (§7). ⭐ It also records what is **already shipped** (the Up & Down handover, measured at 98.6% of 1,203 settles; the notification digest) so neither is rebuilt, and what **reality constrains** (S&P 500 needs a data-plan purchase *and* a cash-session calendar that does not exist). ⛔ Two things in it are load-bearing: **#1 reverses a decision the code attributes to the Board itself** — `FLOWS.md:30` cites the "TZ Gaming Board model" as the *reason* the withdrawal KYC gate exists, so that attribution must be rewritten or the gate gets re-added by someone reading the docs correctly — and **#10 carries a live labelling trap**: `results/page.tsx:366` passes a literal `"MARKET"` to `outcomeWord`, so adding Up & Down rounds without fixing it prints **"YES won" over an Up bet**. |
| [`SESSION-PROMPT-KYC-ID-OPTIONS.md`](SESSION-PROMPT-KYC-ID-OPTIONS.md) | ⚪ **SPENT — DELIVERED 2026-08-20 (`E-173`), CONTRACT STEP DONE (`E-174`).** Kept, not emptied: it is the reasoning the unit was built from, and three of its warnings were paid for again during the build | ⭐ **FOUR WAYS TO PROVE WHO YOU ARE — any ONE of them, not NIDA alone.** Ali: *"give options for KYC, not just NIDA… one of them works for us"* — **NIDA**, **passport** (+ bio page), **driving licence** (+ front) or **voter's card** (+ image), and *"it should be perfectly implemented and validated end to end."* ⭐ `DocType` **already carries** `PASSPORT`, `DRIVER_LICENSE` and `VOTER_CARD` unused, and `KycRejectReason` already carries `EXPIRED_ID`, so the enums anticipated this; what is missing is an identity **type** on `KycSubmission`, which holds only `nidaNumber`. 🔴 **The load-bearing risk is the partial unique index** `KycSubmission_nidaNumber_active_key` — the database-level enforcement of *"one NIDA, one account"* (`IDENTITY-POLICY.md` — ⚠️ the prompt cites it under its old name `NIDA-POLICY.md`, renamed 2026-08-20 when identity stopped being one document; there is no `NIDA-POLICY.md` on disk). It knows only about NIDA, so three more number columns added naively give one human four accounts **and a route around a `DUPLICATE_IDENTITY` rejection**. ⛔ **And it refuses to invent three regexes:** NIDA's 20-digit shape is published and already enforced, passport is 9 alphanumeric from secondary sources, and the **driving-licence and voter-card formats are not publicly documented by TRA or NEC at all** — so those stay deliberately permissive with the absence stated, the way `updown-symbols.ts` states it for silver. A wrong regex on a national ID locks a real citizen out of their own money, and the human review is the real control. |
| [`SESSION-PROMPT-LANDMARK-AND-MEASURE.md`](SESSION-PROMPT-LANDMARK-AND-MEASURE.md) | ⚫ HISTORICAL | ✅ **SPENT — the work shipped 2026-08-22 (session 57).** Kept for its reasoning, not as a task: it is the clearest worked example in this repo of *two backlogs turning out to be one*. It asked for one `<main>` per page and got it — production went from **17 of 17 sampled player routes rendering two nested `<main>` elements** to exactly one `#main-content` everywhere, and because those same 44 files were the population **B7** was still migrating, the hand-typed-width ratchet fell **59 → 12** in the same edits. ⛔ It also called the mechanical `<main>`→`<div>` sweep the WRONG fix *before* anyone tried it, and that judgement held. The outcome, the two guards it exposed as asserting less than they claimed, and the 12 padding-blocked files that remain are recorded as **`E-185`/`E-186`/`E-187`** in [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) §6; the law it produced is **`DESIGN_AUTHORITY` B7 rule 5**. Its own §8 checklist is ticked off at the top of the file. |
| [`SESSION-PROMPT-VISUAL-SWEEP.md`](SESSION-PROMPT-VISUAL-SWEEP.md) | 🔵 LIVE | ⭐ **A LIVE COMMISSION** (Ali, 2026-08-15): every pixel, control, width and language against the design kit; nothing technical. ⛔ **Seven spent prompts were DELETED on 2026-08-16** at Ali’s instruction, so the tree keeps only prompts that still do work. ⚠️ **This row went on to say “this one and `SESSION-PROMPT-JAY-COMMENTS.md`, and no more” — corrected 2026-08-21 by LISTING rather than remembering:** `docs/` holds **seven** `SESSION-PROMPT-*.md` (re-counted 2026-08-23 by running the `ls`, as this row instructs — it said six the day before). 🔵 LIVE: `AI-CYCLES`, `DESIGN-PERFECTION`, `JAY-COMMENTS`, `VISUAL-SWEEP` (this one) and `DATA-FINALISE`. ⚪ SPENT but deliberately kept: `KYC-ID-OPTIONS`. Every one of them is indexed in this section. Run `ls docs/SESSION-PROMPT-*.md` before quoting a number — “and no more” was written on the day it was true and was false within five days. Their substance was already in the files that own each subject — `DESIGN_AUTHORITY` §F/§L, `FAILURE-INVENTORY` §6/§7, `LIVE-QA-CAMPAIGN` §6b — and git history holds the originals. ⚠️ One item outlived its prompt: **unit H** (`qa:refusal-frames`’ drive half), recorded in `LIVE-QA-CAMPAIGN` §6b, session-48 block. |
| [`ADMIN-CONSOLE-FINDINGS.md`](ADMIN-CONSOLE-FINDINGS.md) | ⚪ RECORD | Session 44's admin-console audit — A1–A6, all shipped. Carries the role × page coverage buckets. |
| [`UPDOWN-PLAYBOOK.md`](UPDOWN-PLAYBOOK.md) | 🔵 LIVE | The Up & Down operator playbook — which asset/duration pairings the tape actually supports, and why a pairing is greyed. |
| [`FEE-DOCX-SUPERSEDED.md`](FEE-DOCX-SUPERSEDED.md) | ⚪ RECORD | The banner for two `.docx` hand-outs that state **retired** rates. A binary cannot carry its own warning, so it lives here. ⛔ Regenerate from `RULES.md` before either is handed to anyone. |
| [`FINDING-SCHEDULER-BUSY-WAIT.md`](FINDING-SCHEDULER-BUSY-WAIT.md) | ⚪ RECORD | A single filed finding, kept as its own file because it predates the register. |
| [`HANDOVER-E166-NEXT-SESSION.md`](HANDOVER-E166-NEXT-SESSION.md) | ⚫ HISTORICAL | A single session's handover for `E-166`, which has since shipped. It was the only file in `docs/` this index never listed — which is exactly how a spent artifact gets mistaken for live instruction. ⛔ Not a plan: [`NEXT-PLAN.md`](NEXT-PLAN.md) is the only live one. |
| [`rates-for-admins.html`](rates-for-admins.html) · [`rates-decisions-needed.html`](rates-decisions-needed.html) | ⚪ RECORD | Two generated hand-outs from the 2026-08-14 rates programme. Snapshots — `RULES.md` is the truth. |

## Rules for this directory

1. **One live plan.** `NEXT-PLAN.md`. Do not create `NEXT-SESSION-*.md`, `SESSION_STATUS.md`
   or a new tracker — a previous cleanup deleted 28 such files for exactly this reason.
2. **Same change updates code AND docs.** Update the doc that already owns the subject.
3. **Never silently "update" a ⚪ RECORD.** Its value is being a true account of a moment.
   Write a correction beneath it, fenced, so nobody re-derives the wrong answer.
4. **Add every new doc to this index, with a status.** An unindexed doc is one nobody trusts.
5. **`npm run test:docs` before you claim the docs are clean.**
