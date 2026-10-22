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
| `Objection.questionOrdinal` | An objection to one question of a week (MR-16): one per (week, question, player), open or decided — the partial unique index `Objection_maswali_question_player_key` | `maswali-objections.ts` (the holder's door on the ticket page; a Compliance officer's ruling on `/admin/maswali/integrity`) |
| `SmsMessage` (target `MaswaliWinner`) | The one winner SMS of a player's week: its row is written before the request, as that message's reservation — `SmsMessage_maswali_winner_target_key` refuses a second | `maswali-winner-sms.ts` |

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
| `src/lib/server/maswali-service.ts` | The lifecycle: draft (and a never-opened draft's discard), attestation, open (its checklist in words), the close and its moves, seals, corrections, the gate, the week void, the carry, the sunset |
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
| `src/app/legal/rules/millionea/page.tsx` · `src/app/legal/rules/_content-millionea.tsx` | The binding rules, en/sw/zh, every figure read (version 2026-10-23, published with the S6 release) |
| `src/app/legal/terms/page.tsx` §4 · `src/lib/terms-version.ts` | The Terms' Maswali Millionea paragraph (OD-18), printed with its version only above the ceiling (`MillioneaWording`); below it the Terms are v2026-10-14's text |
| `src/app/fairness/millionea-section.tsx` · `src/app/fairness/millionea/[serial]/**` | `/fairness`'s commitments, and the owner-only inclusion proof with the browser's own check |
| `src/app/help/millionea-help.tsx` | `/help`'s Millionea block |
| `src/lib/server/maswali-notify.ts` · `maswali-winner-sms.ts` · `comms-registry.ts` (its Millionea rows) | The week's notices — the close, the results, a correction, the refunds — the holders' letters and one winner SMS per player-week: each sent exactly once across processes, recorded, reconciled, and the winners no notice reached listed for the desk |
| `src/lib/server/maswali-evidence.ts` · `maswali-evidence-door.ts` · `src/app/api/admin/maswali/evidence/[weekId]/route.ts` · `src/app/admin/maswali/evidence/page.tsx` | The per-week evidence pack for an audit (MB-92): the record as JSON and every ticket as a CSV, each download recorded with its SHA-256 |
| `src/lib/server/maswali-support.ts` · `src/lib/maswali-support-scripts.ts` · `src/app/admin/maswali/lookup/**` | The support desk: one ticket's lookup, recorded before it answers; the desk's scripts in English and Swahili |
| `src/lib/server/maswali-objections.ts` · `src/app/millionea/objection-actions.ts` · `src/components/maswali/maswali-objection-*.tsx` · `src/app/admin/maswali/integrity/objection-*.tsx` | The per-question objection (MR-16): the holder's door on the ticket page and Compliance's ruling on the integrity page |
| `src/lib/server/maswali-takeover.ts` | The winners' takeover alert (MB-96): an alert and a name for Compliance, never a hold |
| `src/lib/marketing/millionea-claims.ts` · `src/lib/server/marketing/millionea-untagged.ts` · `millionea-lint-epoch.ts` · `src/lib/server/maswali-marketing.ts` | What a campaign may say about Millionea (MB-47): the tagged rules at the composer's one door, the untagged rules on the server only, the approved wordings with the fee the week froze |
| `src/lib/server/tax-report-data.ts` · `tax-report-view.ts` · `tax-report-doc.ts` · `house-ledger.ts` · `report-money.ts` · `src/lib/server/reports/catalogue.ts` · `finance-window.ts` | The reports (OD-08): the tax report's product pill and three reconciling lines, the house book's waterfall step, the statutory pack's liability and guarantee lines |
| `src/lib/server/maswali-register-cache.ts` · `maswali-week-record.ts` · `src/lib/maswali-cluster-coverage.ts` · `maswali-integrity-list.ts` · `maswali-week-list.ts` · `maswali-share-note.ts` | The register's brief cache; a settled week's record and the figures it lacks; the cluster report's coverage; the console's list queries; the words for a held share |
| `prisma/migrations/20261017*_maswali_*` · `20261018*_maswali_*` | The tables, the ledger entry types, the tax report's product, the REFUNDED state, the seen marks; one winner SMS per player-week; the database's fence on a market's line |
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
| `npm run test:maswali-engine` | A week from draft to settlement, and a never-opened draft's discard (both stores) |
| `npm run test:maswali-purchase` · `npm run test:maswali-settle` · `npm run test:maswali-void` · `npm run test:maswali-close-race` | The money path (both stores) |
| `npm run e2e:maswali-fault` | A settlement under fault, on a real Postgres |
| `npm run test:maswali-shared-paths` | The code every product shares, left as it was |
| `npm run test:maswali-rbac` · `npm run test:maswali-integrity` | The console's permissions; Compliance's reports |
| `npm run test:maswali-player` | What a player sees and does (both stores) |
| `npm run test:maswali-fairness` | `/fairness`'s commitments and the owner's proof (both stores); the assistant's passage, byte-identical to today below ACTIVE; the binding rules' version, hash and driven figures; the chooser's slots; `/help`'s block |
| `npm run test:terms-cancellation` §4 | The binding rules' cancellation and close statements, at driven figures |
| `npm run test:maswali-notify` | Every notice once, across processes and both stores; the letters, the winner SMS, the desk list |
| `npm run test:maswali-evidence` · `npm run test:maswali-reporting` | The evidence pack (both stores); the reports equal the ledger to the shilling (both stores) |
| `npm run test:maswali-objections` · `npm run test:maswali-adversarial` | The objection door and ruling (both stores); the adversarial cases (both stores) |
| `npm run test:maswali-claims` | The claims lint |
| `npm run test:tax-report` §12 · `npm run test:house-book` | The tax report's Millionea lines; the house book |
| `npm run test:maswali-admin-guide` | The admin guide quotes the console as built |
| `npm run test:maswali-admin-words` · `npm run test:maswali-admin-plain` | The console in plain words: no programme code in anything an admin's screen prints; names not ids, times in EAT, labels not enums, the lock chip's role words, a week's frozen rules on its page, the archive's search and filters |
| `npm run test:maswali-plan` | The plan's tracker cannot lie |
| `npm run qa:live` (its Millionea section) · `npm run qa:maswali-admin-drive` · `npm run qa:maswali-admin-shots` | Live and visual drives |

Red twins: `npm run red:maswali-law`, `npm run red:maswali-fence`, `npm run red:maswali-engine`,
`npm run red:maswali-money-path`, `npm run red:maswali-rbac`, `npm run red:maswali-objections`, `npm run red:maswali-claims`,
`npm run red:maswali-admin-guide`, `npm run red:maswali-admin-words`, `npm run red:maswali-admin-plain`, `npm run red:tax-report`.

## 7 · Permissions

Every control's domain is written once, in `CONTROL_DOMAIN` (`src/lib/server/control-gates.ts`), and the page asks
exactly the question its action asks: a role that cannot act sees the control locked, naming the officers who work it and whom to ask (`CONTROL_WHO`). The routes'
domains are in `ROUTE_DOMAINS` (`src/lib/server/roles.ts`).

| Domain | Pages | Controls |
|---|---|---|
| `trading` | `/admin/maswali`, `/admin/maswali/new`, a week's page | draft, edit a question, discard a draft that never opened, attest the languages, open, move the close, seal, void a question, confirm, correct |
| `accounting` | `/admin/maswali/pools` | release a settlement |
| `compliance` | `/admin/maswali/integrity`, `/admin/maswali/evidence` | pause and resume sales, void a week whole, hold, release and forfeit a share, record a winner reached by phone, record a letters' check, rule on an objection |
| `support` | `/admin/maswali/lookup` | none: the desk's lookup is a read, recorded before it answers |
| `ops` (the Owner, by default) | the Owner card on `/admin/maswali/pools`; the rules and the holiday list on `/admin/maswali` | fund and return the guarantee, the licence basis, the rollout, the sunset, the rules for the next week, the public holidays |

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
| Each control's domain | `CONTROL_DOMAIN` (`control-gates.ts`): 26 Millionea controls |
| Who rules on an objection | `ruleMaswaliObjection` (compliance; `maswali-objections.ts` bars the question's sealer, its confirmer, the officer whose upheld ruling set its result, the objector and a holder) |
| What a campaign may say about Millionea | `millionea-claims.ts` (the tagged rules, the composer's one door) and `millionea-untagged.ts` (the server's alone) |
| A notice sent once | `maswali-notify.ts`: each notice's own key, its run's lease and record |

## 9 · Waiting for the launch commit (S8) — delete this section when it lands

- **The ticket's rules version.** `MaswaliTicket.rulesVersion` is written by the purchase as the week's code and the
  instant its figures froze; it takes `MILLIONEA_RULES_VERSION` beside them when the purchase is wired to it
  (`src/lib/millionea-rules-version.ts` says so).
