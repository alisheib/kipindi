# Maswali Millionea — architecture, as built

> **This document owns HOW Maswali Millionea is built:** who sees it, the data, the money path, the file map, the tests,
> the permissions and the one home of each control. If the code and this document disagree, the code wins and this
> document is a defect — fix it in the same commit. Written from the code at MASWALI-BUILD S6 (2026-10-18).
>
> ⏳ **DECIDED, NOT SELLING.** The product ships WITHDRAWN. Nothing here is live behaviour for a player until the
> roll-out row of [`RULES.md`](RULES.md) says so.

## Document ownership

One fact, one home. Nothing below restates a rule or a figure; each links instead.

| Document | Owns | Does NOT contain |
|---|---|---|
| **`MASWALI-ARCHITECTURE.md`** (this) | Who sees it · the data · the money path · the file map · the tests · the permissions · one control, one place | Rules, figures, status, rationale |
| [`RULES.md`](RULES.md) §2.12 | 🟢 LAW — what Millionea charges, and when | How it is built |
| [`MASWALI-PLAN.md`](MASWALI-PLAN.md) | The programme: §0 where it stands · §3 the rulebook (MR-1…MR-32) · §5 the money, worked · §6 the launch gate and the weekly runbook · §8 the blind areas · §9 the Owner's decisions | The file map |
| [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § 2026-10-16 | The Owner's decision | — |
| [`maswali-operator-guide.html`](maswali-operator-guide.html) → [`50pick-maswali-operator-guide.pdf`](50pick-maswali-operator-guide.pdf) | The admin guide: how Millionea works, how admins run each console step, what every console word means | Code, file names, the desk's scripts |
| [`rates-for-admins.html`](rates-for-admins.html) · [`rates-decisions-needed.html`](rates-decisions-needed.html) | The sources of `50pick-rates-for-admins.pdf` and `50pick-betting-rules-final.pdf` | — |
| [`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md) | The second product's — the precedent this one follows | — |

---

## 1 · The one-sentence version

A week is one `PredictionMarket` (`productLine "MASWALI"`) and one `MaswaliCycle`; a ticket is one `Position` and one
`MaswaliTicket` holding fifteen salted answers; the week's money waits in `POOL:{market}` until ONE balanced settlement
group splits it into shares, fee, levies, carry and top-up; and every surface a player can reach asks the rollout first.

## 2 · Who sees it — the rollout, answered once per request

| Layer | File | What it answers |
|---|---|---|
| The states and the ceiling | `src/lib/millionea-rollout.ts` | WITHDRAWN · STAFF_PREVIEW · ACTIVE; the environment's ceiling (`millioneaCeiling` — the lower of the two wins); `millioneaVisibleFor` |
| The Owner's switch | `src/lib/server/millionea-switch.ts` (read) · `millionea-ceremony.ts` (the Owner's write) | The stored state, read fresh; `millioneaStateNow()` — the GLOBAL state |
| The per-request answer | `src/lib/server/millionea-preview.ts` → `resolveMillionea()` | React-cached and never throws: may THIS request see Millionea, and as a preview? |
| The routes' 404 | `src/lib/server/millionea-gate.ts` → `millioneaGate()` · `millioneaTicketGate()` | A hidden product is a missing page. The tickets' gate also admits a HOLDER of their own tickets at a kill (decision L5) |
| Doors on other pages | `src/lib/server/millionea-doors.ts` → `millioneaDoor()` · `millioneaTicketsDoor()` | The home card, the More rows, the board's card, `/positions`' row — and the routes' metadata |
| Sales | `rolloutSells` in `src/lib/server/maswali-service.ts` | A public week sells only at ACTIVE, a drive week from STAFF_PREVIEW; WITHDRAWN sells nothing anywhere |

⛔ **Three kinds of reader, one question each — never mixed:**
- **A Millionea route** calls its gate first, in the page AND in its metadata. The metadata asks inside a `try`, or
  through a door, so it never rejects (`npm run test:visual-pass-r5d` 1.4″).
- **A section on a page every reader sees** — `/fairness`, `/help`, the `/legal/rules` chooser — asks
  `resolveMillionea()` and below it draws nothing and reads nothing, so that page is today's for every other reader.
  The chooser's changed slots each keep today's expression as their else arm, word for word.
- **The help assistant** is told about Millionea on the GLOBAL state alone (`millioneaStateNow`, in
  `src/lib/server/millionea-chat.ts`). Its prompt is built from settings, never from the reader
  (`npm run test:privacy-notice` §2c), so the model is never told who is asking or what a preview shows.

A loading state renders before any gate answers, so a Millionea route's loading and error files print no word of the
product (`npm run test:maswali-fairness` H.7; S5's ghosts are wordless for the same reason).

## 3 · The data

| Table | One row is | Written by |
|---|---|---|
| `MaswaliCycle` | A week: code, line (PUBLIC or DRIVE), state, its times, `rulesSnapshot`, `questionSetHash`, then at the close `ticketMerkleRoot` · `ticketCount` · `closedAt` · `salesAtClose`, the objection window, and the settlement's figures and group | `maswali-service.ts` (draft → open → close → gate), `maswali-settlement.ts`, `maswali-void.ts` |
| `MaswaliQuestion` | One of the fifteen: slot, role (MAIN or RESERVE), ordinal, the three languages' question and criterion, the source and fallback, the event's start in its own zone, the void deadline, the probability and its source, the seal and its evidence | `maswali-service.ts` |
| `MaswaliTicket` | One ticket: serial, position, holder, the fifteen picks, the 128-bit salt and the commitment (`selectionsHash`), status (LIVE · CANCELLED · SETTLED · REFUNDED), `rulesVersion`, score, payout, any hold | `maswali-money-service.ts` (purchase, cancel), settlement, the week void |
| `MaswaliNoticeSeen` | A player's seen mark on one of a week's notices | `maswali-player-acts.ts` |
| `Objection.questionOrdinal` | An objection to one question of a week (MR-16) | ⏳ nothing yet: the per-question objection path (MB-23) is not built, so a result is raised with support and corrected by its sealing officer inside the check window |

- ⭐ **One OPEN week per line** is a partial unique index (`MaswaliCycle_one_open_per_visibility_key`). There is
  deliberately no "one closed-unsettled week" index: a stalled week N would stop week N+1 from closing.
- ⭐ **Frozen at the open:** the whole rule set in `rulesSnapshot` (write-once; settlement reads only it), the fee in
  the week's market `feeSnapshot` (`feeModel: "jackpot-payout"`) — never in both — and `questionSetHash` over the
  fifteen questions and their sources.
- ⭐ **Stamped at the close, once:** the RFC 6962 Merkle root over every non-cancelled ticket's commitment, the count
  and the time (`closeWeek`, inside the chain lock and the week market's lock, so no purchase lands after the list).
  After the close the committed set is every non-CANCELLED ticket, whatever it becomes (`maswali-fairness.ts` rebuilds
  the proof from exactly that set).

## 4 · The money path

- **Accounts** (`src/lib/server/ledger.ts`): `POOL:{marketId}` per week; `HOUSE:MASWALI_JACKPOT` and its drive twin
  `HOUSE:MASWALI_JACKPOT_DRIVE` — players' money carried for a later week, as the house ledger (`house-ledger.ts`)
  reports it; `HOUSE:MASWALI_GUARANTEE` (Owner capital); `HOUSE:COMMISSION`, `HOUSE:TRA_LEVY`, `HOUSE:GBT_LEVY`.
- **The arithmetic** is one pure function, `settleArithmetic` in `src/lib/maswali-money.ts`. The settlement's preview
  and its release call it (`maswali-settlement.ts`), and so do How to play's and the binding rules' worked examples
  (`maswali-player.ts`). `npm run test:maswali-money` holds it to the plan's §5 to the shilling.
- **The purchase** is the platform's one bet path (`buyMaswaliTickets`), with the week's frozen price and the ticket
  cap; a cancel inside the free window refunds through the same path (`cancelMaswaliTicket`).
- **The settlement** is ONE balanced group, `maswali_settle_{weekId}`, built by `maswaliSettlementEntries`: the pool
  ends at exactly 0, with no rounding tolerance. A no-winner week is `maswaliRolloverEntries`. A whole-week void
  refunds every live ticket in one bulk transaction (`refundVoidedWeek`, group `maswali_void_{weekId}`). The guarantee
  moves only through the Owner's two ceremonies (`fundMaswaliGuarantee`, `returnMaswaliGuarantee`).
- **Nothing runs a winning settlement on its own.** The scheduler (`maswali-scheduler.ts`) closes a week, proposes
  voids at their deadlines and completes a certain week void; an officer seals, an officer opens, and one accounting
  officer releases from a preview whose digest the release re-checks.
- `npm run ops:maswali-invariants` reports the nightly invariants on demand; `npm run ops:maswali-heal` heals a stuck
  close or void refund; `npm run ops:maswali-pause` is the containment pause.

## 5 · File map

| File | Role |
|---|---|
| `src/lib/server/maswali-config.ts` | The rule set (`maswali.config`): every figure a player reads, validated, read back, audited; frozen per week |
| `src/lib/server/maswali-licence.ts` | The Owner-only licence basis; no week opens while it reads NONE |
| `src/lib/server/maswali-pause.ts` | The sales pause: sales only — never a cancel, a settlement or a refund |
| `src/lib/server/maswali-dal.ts` | The three stores (weeks, questions, tickets), Prisma and in-memory |
| `src/lib/server/maswali-service.ts` | The lifecycle: draft, attestation, open (its checklist in words), the close and its moves, seals, corrections, the gate, the week void, the carry, the sunset |
| `src/lib/server/maswali-scheduler.ts` | ONE idempotent tick for the product: closes, void proposals, the certain week void |
| `src/lib/server/maswali-money-service.ts` | The money path: purchase, cancel, the guarantee's ceremonies, ledger posting |
| `src/lib/server/maswali-settlement.ts` | The preview, the release, holds, releases and forfeits of a share, the sunset's top score |
| `src/lib/server/maswali-void.ts` | The week void's refunds, exactly once, at any size |
| `src/lib/server/maswali-invariants.ts` | The nightly invariants |
| `src/lib/server/maswali-console.ts` · `maswali-integrity.ts` · `src/lib/maswali-admin-format.ts` | What the console reads: the weeks, the alerts, the pools, the integrity reports |
| `src/lib/server/maswali-player.ts` · `maswali-player-acts.ts` · `maswali-pool-feed.ts` | What the player surfaces read and do; the live pool figure |
| `src/lib/server/maswali-fairness.ts` | What `/fairness` publishes, and one owner's inclusion proof |
| `src/lib/server/millionea-legal.ts` · `src/lib/millionea-rules-version.ts` | The binding rules' figures (one week's, never a mix), their version and the hash of their text |
| `src/lib/server/millionea-chat.ts` | The help assistant's Millionea facts, at the global ACTIVE only |
| `src/lib/maswali-score.ts` | The one grader (reserves, the win condition, the whole-week void) — slip, ticket and settlement |
| `src/lib/maswali-commitment.ts` | The commitment: leaves, the root, inclusion proofs, verification — isomorphic, so a browser re-checks |
| `src/lib/maswali-money.ts` | The week's arithmetic and the guarantee requirement |
| `src/lib/maswali-time.ts` · `maswali-topics.ts` · `maswali-void-reason.ts` · `maswali-week-label.ts` | An event's own clock; the politics screen; the closed list of void grounds; the word for each state |
| `src/app/admin/maswali/**` | The console: the week list, the builder, the week page and its seal console, pools, integrity |
| `src/app/millionea/**` · `src/components/maswali/**` | The player pages (hub, slip, How to play, register, Tiketi zangu, a ticket) and their parts |
| `src/app/legal/rules/millionea/page.tsx` · `src/app/legal/rules/_content-millionea.tsx` | The binding rules, en/sw/zh, every figure read |
| `src/app/fairness/millionea-section.tsx` · `src/app/fairness/millionea/[serial]/**` | `/fairness`'s commitments, and the owner-only inclusion proof with the browser's own check |
| `src/app/help/millionea-help.tsx` | `/help`'s Millionea block |
| `prisma/migrations/20261017*_maswali_*` | The tables, the ledger entry types, the tax report's product, the REFUNDED state, the seen marks |
| `scripts/ops-maswali-heal.mts` · `scripts/ops-maswali-invariants.mts` · `scripts/ops-maswali-pause.mts` | Ops tools |

## 6 · The tests

| Script | Guards |
|---|---|
| `npm run test:maswali-law` | The law is written where the law lives, and the code agrees |
| `npm run test:maswali-config` | The rules are admin-editable, validated, frozen per week; the licence basis gates the open |
| `npm run test:maswali-rollout` | Dark until the Owner decides; every surprise keeps it dark |
| `npm run test:maswali-fence` | No generic door or read treats a week as a poll (both stores) |
| `npm run test:maswali-score` · `npm run test:maswali-time` · `npm run test:maswali-commitment` | The grader, the clocks, the commitment |
| `npm run test:maswali-money` · `npm run test:maswali-ledger` | The arithmetic to the shilling; every movement a balanced group |
| `npm run test:maswali-engine` | A week from draft to settlement (both stores) |
| `npm run test:maswali-purchase` · `npm run test:maswali-settle` · `npm run test:maswali-void` · `npm run test:maswali-close-race` | The money path (both stores) |
| `npm run e2e:maswali-fault` | A settlement under fault, on a real Postgres |
| `npm run test:maswali-shared-paths` | The code every product shares, left as it was |
| `npm run test:maswali-rbac` · `npm run test:maswali-integrity` | The console's permissions; Compliance's reports |
| `npm run test:maswali-player` | What a player sees and does (both stores) |
| `npm run test:maswali-fairness` | `/fairness`'s commitments and the owner's proof (both stores); the assistant's passage, byte-identical to today below ACTIVE; the binding rules' version, hash and driven figures; the chooser's slots; `/help`'s block |
| `npm run test:terms-cancellation` §4 | The binding rules' cancellation and close statements, at driven figures |
| `npm run test:maswali-plan` | The plan's tracker cannot lie |
| `npm run qa:live` (its Millionea section) · `npm run qa:maswali-admin-drive` · `npm run qa:maswali-admin-shots` | Live and visual drives |

Red twins: `npm run red:maswali-law`, `npm run red:maswali-fence`, `npm run red:maswali-engine`,
`npm run red:maswali-money-path`, `npm run red:maswali-rbac`.

## 7 · Permissions

Every control's domain is written once, in `CONTROL_DOMAIN` (`src/lib/server/control-gates.ts`), and the page asks
exactly the question its action asks: a role that cannot act sees the control locked, naming who can. The routes'
domains are in `ROUTE_DOMAINS` (`src/lib/server/roles.ts`).

| Domain | Pages | Controls |
|---|---|---|
| `trading` | `/admin/maswali`, `/admin/maswali/new`, a week's page | draft, edit a question, attest the languages, open, move the close, seal, void a question, confirm, correct |
| `accounting` | `/admin/maswali/pools` | release a settlement |
| `compliance` | `/admin/maswali/integrity` | pause and resume sales, void a week whole, hold, release and forfeit a share |
| `ops` (the Owner, by default) | the Owner card on `/admin/maswali/pools` | fund and return the guarantee, the licence basis, the rollout, the sunset |

- By default trading is the Trading role, accounting Finance, compliance Compliance, and `ops` the Owner alone (no
  default role acts there); the Auditor reads accounting and compliance. The Owner edits every grant on `/admin/roles`.
- ⭐ MB-92 · the console's ONE route exception: the Auditor also reads the trading pages under `/admin/maswali` (the week
  list, each week page, its edit page and the draft builder) — so it reads every Millionea console page but the desk's
  ticket lookup — while it holds its compliance view grant (`auditorReadsPath` in `roles.ts`, asked by `canViewPath`,
  the page gate and the nav). It acts on none, and opens no other trading page (`test:maswali-rbac` §7).
- The officer who drafted a week can never attest it. Only the officer who sealed a question may correct it.
- ⛔ The integrity page decides its audience on the STORED role before it reads anything, because it renders records
  read from the audit log.
- ⛔ Staff never buy: a staff role, or an account 50pick operates, is refused at the purchase.

## 8 · One control, one place

| Control | Its only home |
|---|---|
| The week's rules — price, floor, fee, cap, open and close, buffer, void deadline, check window, question rules | `maswali.config` (`maswali-config.ts`); each week's frozen `rulesSnapshot`, and its fee in the market's `feeSnapshot` |
| The licence basis | `maswali-licence.ts`, the Owner's record — never on the config form |
| Who sees Millionea | The Owner's switch (`millionea-switch.ts`, written only by `millionea-ceremony.ts`) under the environment's ceiling, resolved per request by `resolveMillionea` |
| Sales paused or running | `maswali-pause.ts` |
| The guarantee's money | `HOUSE:MASWALI_GUARANTEE`, moved only by the Owner's ceremonies |
| The week's arithmetic | `settleArithmetic` (`src/lib/maswali-money.ts`) |
| Grading | `src/lib/maswali-score.ts` |
| The commitment and its proofs | `src/lib/maswali-commitment.ts` |
| Why a question voided | `src/lib/maswali-void-reason.ts` |
| The binding rules' version and text hash | `src/lib/millionea-rules-version.ts` |
| Each control's domain | `CONTROL_DOMAIN` (`control-gates.ts`) |

## 9 · Waiting for the launch commit (S8) — delete this section when it lands

- **The Terms' sentence (OD-18).** Existing terms do not change before launch ([`RULES.md`](RULES.md) §2.12, Stated),
  so `/legal/terms` §4 gains this paragraph in S8's commit, with `TERMS_VERSION` moved and the binding hash re-pinned.
  Native readers check the Swahili and the Chinese at Gate B.
  - **en** — *Maswali Millionea is not a price-competition market. A Millionea ticket is bought and settled under its
    own binding rules — the Maswali Millionea Rules at /legal/rules/millionea, in the version recorded on the ticket.
    This section's statements about our commission, about a winning bet never being paid less than it staked, about
    one-sided markets and about cash-out do not apply to a ticket; the rest of these terms do.*
  - **sw** — *Maswali Millionea si soko la ushindani wa bei. Tiketi ya Millionea inanunuliwa na kulipwa kwa kanuni
    zake zenye nguvu ya kisheria — Kanuni za Maswali Millionea katika /legal/rules/millionea, kwa toleo
    lililorekodiwa kwenye tiketi. Kauli za sehemu hii kuhusu kamisheni yetu, kuhusu dau lililoshinda kutolipwa chini
    ya dau lake kamwe, kuhusu masoko ya upande mmoja na kuhusu kuuza dau hazihusu tiketi; masharti mengine yote
    yanaihusu.*
  - **zh** — *Maswali Millionea 并非价格竞争市场。Millionea 彩票依其自身具有约束力的规则购买与结算——即
    /legal/rules/millionea 上的《Maswali Millionea 规则》，以彩票上记录的版本为准。本节关于我们的佣金、关于获胜投注
    绝不会低于本金、关于单边市场以及关于兑现的说明不适用于彩票；本条款的其余内容仍然适用。*
- **The ticket's rules version.** `MaswaliTicket.rulesVersion` is written by the purchase as the week's code and the
  instant its figures froze; it takes `MILLIONEA_RULES_VERSION` beside them when the purchase is wired to it
  (`src/lib/millionea-rules-version.ts` says so).
