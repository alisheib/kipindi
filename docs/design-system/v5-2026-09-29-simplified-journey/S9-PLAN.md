# S9 — Deposit, waiting and return

**Status: preparation, deposit-safety prerequisites, additive persistence and private status rehearsal; S9 remains open, 2026-10-13.** This plan is in the separate managed checkout
`C:\Users\asheib\.codex\worktrees\vodacom-s9\kipindi-main`, branch `codex/vodacom-s9`, created at
`e767f3f52c54b2659d9057dcbc46d42c5edcc833`. S8 is still being verified in its own checkout. The root reviewer authorized
the deposit prerequisites, additive persistence and private status rehearsal independently. No S9 screen, route, schema, provider or production
change has been deployed. Nullable persistence is prepared and rehearsed locally, with no application writer yet.
Rebase this branch onto the verified S8 release before wiring
its host: the final S8 recovery and keyboard corrections are newer than this preparation base.

This is an implementation plan for the existing S9, not another programme or a design rulebook. The authority is
[VODACOM-PLAN](../../VODACOM-PLAN.md), §3.5 and §5 S9, with §0h's later owner rulings; [INHERIT-MANIFEST](INHERIT-MANIFEST.md),
SJ-12, SJ-13, SJ-13b and SJ-18; [S4-COPY-AUDIT](S4-COPY-AUDIT.md); and the durable [S4 canvas](s4-canvas/README.md).
The kit and [DESIGN_AUTHORITY](../../DESIGN_AUTHORITY.md) govern appearance. [S8-PLAN](S8-PLAN.md), especially A3/A10
and §0h point 82, governs the handoff from the sheet. The [migration protocol](../../../.claude/skills/50pick-audit/SKILL.md)
governs any later database work.

## 1. The inherited decisions

| Subject | What S9 builds | Authority / correction |
|---|---|---|
| Deposit layout | One screen on `/wallet/deposit` for every journey reader; a bet strip only for a valid pending bet | §3.5 |
| Mobile wallets | M-Pesa, Airtel Money, HaloPesa, Mixx by Yas, in the shared chooser's order; paused deposit rails disabled | R3; SJ-13b; `MOBILE_MONEY_METHODS` and deposit kill switches |
| Card | A separate “Lipa kwa kadi” link carrying the bet; retain the complete classic card form and its confirm | §3.5; SJ-12 |
| Submit | Journey “Lipa TZS X” is the explicit one-tap payment commit, in the kit's primary ink | SJ-12; the classic confirm stays |
| Email / identity | A deposit asks neither question. First-deposit identity information uses the existing notice rule; withdrawal gates stay where they are | Owner, 2026-10-07 and 2026-10-10; §3.6 superseded |
| Phone / rail | Most recent **CONFIRMED mobile-money** deposit supplies both. Otherwise registered phone and no selected rail. An error return preserves a deliberately emptied phone | SJ-13/SJ-13b; `moneyFormMsisdn`; no phone-prefix rail inference |
| Amounts | Deposit minimum remains TZS 1,000; stake minimum is TZS 500. Read the real validators/bounds, not canvas literals | Owner, 2026-10-07 / 2026-10-12 |
| Focused chrome | Journey deposit and waiting have no normal header, tabs, footer or ticker; use a back control, title and minimal 18+ | SJ-18; no player helpline after the 2026-10-06 ruling |
| Back / paid return | Rebuild the safe pending-bet destination and replace history. Return opens a bet for a manual tap; it never places one | §3.5; pending-bet and safe-next rules |
| Receipt | The payment receipt stays in the app. Optional transactional mail still goes only to a confirmed address | §0h point 82(g); S4 review 3's correction |
| Loss limit on return | Keep the chosen stake, explain the current room, hide chips above it, disable an excessive commit. Never prefill to the room | §0h point 2; S4 panel A3 overrides the old “return-clamped” canvas |
| Long payment | Never turn the passage of time into failure. From 30 minutes offer the explicit bet-with-existing-money alternative when allowed; no new payment without a separate choice | §0h point 82; S8 A10 |
| Card reference / phone input | Already live: card `order_id` fix `684f72cb`, classic kit PhoneInput `b0f490c8`. Preserve and extend their proof | §5 S9; do not redo these fixes |

The canvas's six code boards are not implemented. Its helpline, “receipt by email”, “today” loss-room language and
automatic loss-room clamp are superseded. Its “within 3 working days” held-payment sentence is **not an established
refund SLA**: §0h point 5 still needs the finance answer. Use the truthful existing held-for-return explanation and
receipt/support path without a promised date. Record a finance answer if one is actually obtained.

## 2. Source seams and real prerequisites

These locators identify the preparation base; names and control flow are the durable anchors.

| Seam | Current source | S9 change |
|---|---|---|
| Payment entry / failures | [deposit action](../../../src/app/wallet/deposit/actions.ts), `carry`, `fail`, `depositAction` | Preserve canonical bet/next/key on every failure, recompute current facts, route journey results to waiting/return |
| Existing form | [deposit page](../../../src/app/wallet/deposit/page.tsx), `prevMsisdn`, five provider tiles, billing block, `DepositConfirm` | Keep the classic arm intact; add the journey arm and a full classic card route |
| Deposit replay | [wallet service](../../../src/lib/server/wallet-service.ts), `deposit`: early key lookup and concurrent-create catch | **Actual defect:** a globally found key is currently returned without owner/type/payload checks. Fix both sites before using replay to recover a journey payment |
| Signed return | Same service, `settleDepositFromReturn` | **Actual defect:** owner is checked but transaction type is not. Require an owned DEPOSIT before any provider call or settle; share the status core |
| Money settle | Same service, `settlePaymentWebhook`, `settleDepositConfirmed`, `settleDepositFailed` | Reuse the exactly-once wallet/transaction/ledger path and its amount-mismatch escalation; do not add a credit path |
| Provider authority | [payments](../../../src/lib/server/payments.ts), `verifyDepositStatus`; [Selcom](../../../src/lib/server/selcom.ts), `selcomVerifyOrder` | Signed COMPLETED confirms; only CANCELLED/USERCANCELLED/REJECTED fail. PENDING, INPROGRESS, unrecognised values, transport failure and UNSUPPORTED leave PROCESSING |
| Background lane | Wallet service, `creditConfirmedDeposits`; lifecycle's 15-second lane | Remains confirm-only and bounded to its existing window. S9's foreground read covers long waits |
| Shared facts | [journey sheet](../../../src/lib/server/journey-sheet.ts), `viewerFacts` / `sheetForUser`; [shortfall](../../../src/lib/journey/shortfall.ts) | Reuse current spendable balance, RG, ceilings, pending payment and market facts; do not infer balance from a deposit amount |
| Tab intent | [pending bet](../../../src/lib/journey/pending-bet.ts), [sheet storage](../../../src/lib/journey/sheet-storage.ts), [sheet state](../../../src/lib/journey/sheet-state.ts) | Preserve the chosen bet and all unresolved bet keys through payment, auth, reload and return; no overwrite of a prior uncertain bet |
| Deposit chooser / amount | [provider grid](../../../src/components/wallet/provider-radio-grid.tsx), [amount field](../../../src/components/wallet/amount-field.tsx), [phone normalisation](../../../src/lib/phone-normalize.ts) | Optional row layout/noDefault and full figures/onValueChange; defaults preserve classic deposit and withdrawal behavior |
| Server stores | [store](../../../src/lib/server/store.ts), [Prisma DAL](../../../src/lib/server/prisma-dal.ts), [market DAL](../../../src/lib/server/market-dal.ts) | Matching narrow reads, JSON mapping and create-only metadata in memory and Postgres |
| Shell | [AppShell](../../../src/components/layout/app-shell.tsx), [surface rules](../../../src/lib/surfaces.ts) | One exact journey-focused route decision used by server paint, ghosts, overlays and chrome; classic same-slot else |
| Receipts / inbox / mail | [receipt](../../../src/app/wallet/receipt/[id]/page.tsx), [notifications](../../../src/lib/server/notification-service.ts) `notifyDeposit`, wallet service `notifyStillPendingDeposits`, [mail](../../../src/lib/server/email.ts) `depositPendingHtml` | Derive the bet return link from the owned deposit's stored intent; preserve all existing receipt/reference and confirmed-email controls |
| Attribution | [funnel](../../../src/lib/journey/funnel.ts), [beacon](../../../src/lib/journey/funnel-beacon.ts), [server counters](../../../src/lib/server/journey-funnel.ts), [report](../../../src/lib/server/journey-funnel-report.ts) | `deposit_return` already exists in the central origin list. Persist a verified origin when the manual returned bet is created; no URL-only attribution |

### 2a. The shared server status contract

The status service resolves by transaction id for waiting, and by the sanitized provider reference for the card return.
Both adapters first authenticate, resolve a row and require `userId === caller` **and** `type === DEPOSIT`.
Missing, foreign and wrong-type references expose the same UNKNOWN shape, with no row, phone, provider reference,
amount or existence signal. Write a SECURITY audit for refused lookup attempts without logging raw credentials.
No provider request or money mutation happens before that check. A storage read fault is uncertainty, not failure.

For an owned PROCESSING non-CARD deposit with a provider reference and age at least 20 seconds, the foreground status
path may spend `deposit.probe` for that transaction and call the signed verifier. The foreground probe requires one
of the four currently registered mobile-wallet rails and a valid funding row; null/unknown/legacy/Card/internal/bank
rails are not eligible. Marked house rows are outside player status, trust, probes and funding-key recovery. The return adapter retains the card
leg's signed verification. Both feed only authoritative CONFIRMED/FAILED into `settlePaymentWebhook`, then reread the
row: the result of a competing webhook or RG hold wins. A status must never be inferred from `payment_status`,
`cancelled`, elapsed age, `handled: true`, a client amount or an SSE message.

Project the fresh owned row with `presentedStatus`, including `RG_RETURN_MARK`. Distinguish confirmed/paid,
processing/pending, failed and held-for-return; a generic AML review must not become “nothing was taken”. Return only
the fields needed for the page, plus server time and a throttling hint. A failed balance read is unknown, never a
zero or an old wallet snapshot presented as current. First-deposit information uses `firstDepositNoticeDue` and its
per-player dismissal rule, not a guessed “first” from the payment response.

An exact deposit-only `providerStatus = deposit-terminal-review:v1` takes precedence over a stored terminal status.
It projects REVIEW/AML_REVIEW without changing that status or ledger. A rejected RG-held collection stays HELD:
FAILED plus `RG_RETURN_MARK` does not prove an outbound refund. Matching retries never clear either review authority.
A request which observes a signed contradiction but cannot persist its review signal must answer UNKNOWN; it cannot
present the opposing raw terminal status as settled or safe to retry. The post-UNKNOWN controller/recheck gate is §5e.

The authenticated GET is dynamic and `private, no-store`; JSON errors and unauthenticated responses get the same
cache prohibition. It is never prefetched and is bypassed by the service worker. `deposit.status` is keyed by caller,
and checked before a probe; `deposit.probe` is keyed by the **owned** transaction, never a foreign id. Bucket capacities
must accommodate the specified 3-second polling without turning rate limiting into a false terminal state. Add and
prove the chosen rules in the real rate registry; do not rely on its unknown-action fallback.

### 2b. Deposit key and saved-intent contract

A UUID belongs to a canonical deposit intent, not to a page render. A lost action answer or uncertain dispatch
keeps that key locked and recovers the original transaction; it does not unlock a fresh Lipa. A definitive refusal
before dispatch with no earlier unknown attempt, or an authoritative FAILED payment with no unresolved earlier uncertainty or review, permits a fresh key at the next explicit attempt. A changed
amount/rail/phone is a new intent only after the previous attempt is conclusively resolved or a pending-payment
choice explicitly declines another payment. Auth-loss and deploy recovery use the existing redirect / reload rules.
An uncertain earlier same-key request can still reserve or dispatch after a retry meets a pre-lock refusal. That
refusal does not prove the earlier attempt never ran: retain its key/locked intent until owned recovery resolves it,
as S8 A2 does for an uncertain bet. WP3/4 must prove this ordering in the actual deposit recovery controller.

At both replay sites require caller, DEPOSIT type, amount, currency, provider and normalized phone to match, and compare the
stored normalized pending-bet intent when present. Reject mismatches without disclosing another owner's row and
without dispatch. Retain lookup inside the reservation race path. Preserve create-only origin and pending intent on
a matching replay; an update must not replace either. A read failure cannot be called a definitive “not sent”.

**Reviewed choice, 2026-10-13:** idempotency covers the persisted funding intent: caller/type/amount/currency/provider/
normalized phone/canonical pending bet. Card billing changes do not mutate the original order. A matching CARD key
recovers the verified existing order/status and never dispatches a new checkout, irrespective of subsequently edited
billing fields. No third fingerprint column is added, and no byte-equality claim is made for billing that was never
stored. A lost Card redirect needs the verified recovery/waiting path for that existing order.

`Transaction.pendingBet` is a small versioned nullable JSON envelope containing the normalized bet and rebuilt
destination, sufficient for an owned receipt, notification or pending email to reopen it. Parse it on every read;
no arbitrary URL, query bag, provider callback string, phone, credentials or unfinished **bet** key belongs in that
envelope. The payment UUID and the S8 bet UUID are different namespaces and are never interchanged. Legacy rows with
null intent continue to open the existing wallet/receipt path.

Use `parseBetParam`, `pendingBetUrl` and bounded safe-next rules, plus a permitted return-surface allowlist; reject
auth/admin/payment-loop destinations. The URL stake remains a claim. A forwarded link cannot prefill a stake or
shortfall from that claim: the same browser's fresh matching tab marker must authorize it, or an authenticated owned
deposit's normalized saved intent must supply a separately verified return. The server cannot read sessionStorage;
WP1 must specify the client/server handoff and prove the initial HTML never presents an untrusted stake as chosen.
The chosen amount is recomputed from live spendable funds and limits; unknown facts keep payment disabled.
**Reviewed bridge choice, 2026-10-13:** initial SSR supplies the explicit trust source `none` and never calls a URL
stake chosen. After hydration only a fresh matching marker may restore it, before writing a saved intent or sending
an action. An owned server-saved deposit intent may restore it across authentication/receipt contexts; raw URL tags
cannot substitute for that proof. The concrete page/action bridge must be independently reviewed before WP4.

Keep `kp-pending-bet`'s disclosed 24-hour lifetime and size limit, and preserve the unresolved-key array while writing
the chosen bet for a payment. Clear a bet key only when its bet is confirmed; a deposit confirmation does not confirm
a bet. An unavailable/over-cap marker store refuses the dependent operation before sending it, as S8 does. Review
the server intent's purpose and retention against the existing transaction/privacy policy separately from tab TTL.

## 3. Ordered workpacks

Each workpack ends with its own actual evidence and independent review. Product integration starts after
the S8 release is verified and this contract is reviewed. Pure status timing/intent helpers and their tests may be
built independently here first; they have no provider, database or server import. The root's scoped 2026-10-13
instruction also permits the existing deposit replay and signed-return scope prerequisites below, then the locally
rehearsed additive persistence in WP2 and private status/settlement work in WP3. This separate branch does not deploy those fields or introduce the product
flow ahead of the S8 release. The trusted bridge remains an independent review gate before WP4.

### WP0 — Rebase, authority and proof setup

Rebase onto the verified S8 release and read its host/storage amendments. Record the tested base and source SHA.
Link this plan from the existing session tracker; add no S9 “done” claim. Declare the two S9 proof suites only once
their real package scripts exist: planned **deposit-return** and **deposit-status-read**, with red twins reachable
from `red:all` and declared anchors. Use a dedicated runtime on F: if required; no dependency install on the full C:
drive. Coordinate the disposable cluster/data directory with the root owner; a different port alone is insufficient.

### WP1 — Pure intent, schedule and state projection

Agree the versioned pending-intent grammar and trusted-stake handoff before implementing persistence. Build pure
waiting age bands/poll schedule, terminal classification, canonical replay comparisons, safe rebuilt destinations and
returned-bet attribution predicates. Test exact 20-second, 1-minute, 10-minute, 30-minute and 24-hour boundaries;
invalid/future dates; forged external/loop URLs; null/legacy/malformed JSON; wrong kind/side/stake; and loss-room versus
market-bounds behavior. Use actual failing-input assertions and mutation controls, not a symbol census alone.

### WP2 — Replay prerequisites and additive persistence

Fix the two confirmed prerequisite defects in §2, with their red proofs. Add nullable `Transaction.pendingBet Json?`
and `Position.origin String?` in the Prisma schema and a handwritten rerunnable additive migration. No historical
backfill, default player origin, destructive rewrite or house-marker change. Ensure old rows/old code remain valid.
Map the fields through memory/Prisma transaction and position creation/reads; strip them from every ordinary update.
Latest confirmed mobile-money history is a narrow owner/type/status/rail query with deterministic time/id ordering,
not a full-history download or most-recent PROCESSING/Card guess. Prove ties, foreign rows, failed/Card/internal rails
and deliberately empty error-return numbers in both stores. Run the real migration and backup-schema rehearsal on a
disposable marked database before any release.

### WP3 — Shared status service and private route

Implement §2a in a small shared server core and make card return use it. Add the owner-only status GET and real rate
rules, then fault/race proof. In memory and Postgres race status reads, card returns, fast confirm and duplicate
webhooks for the same order; assert exactly one wallet credit, one ledger group, one claimed transition and correct
notification/counter behavior. Amount mismatch remains PROCESSING with its review signal. RG beginning while payment
is moving yields suspense/held and no playable credit. Prove terminal contradictions remain escalated without an
automatic reversal. A probe exception/unknown signature/unsupported gateway never becomes FAILED.

### WP4 — Journey deposit and classic card route

Render §3.5's order: focused back/title; optional chosen-bet strip; payout notice when applicable; amount, chips,
four wallet rows; phone and alternative-number affordance; PIN note; explicit primary Lipa; Card link; minimal 18+.
Keep ordinary classic `/wallet/deposit` markup/flow in its same-slot else. Move/extract its whole form so the Card
route retains billing fields, confirmation, signed flashes, phone input and all auth/error preservation. Specify and
prove direct Card-route behavior in both flag states; avoid a route where billing fields are inaccessible.

Extend `ProviderRadioGrid` with optional rows/noDefault and `AmountField` with optional full figures/onValueChange,
preserving both old callers' default output. Use shared PaymentLogo, PhoneInput, kit glyphs/type/spacing/radii, real
focus outlines and reduced-motion rules. Lipa stays disabled with no available chosen rail; choosing one enables it
only when actual deposit inputs/gates permit. A deposit below the bet shortfall, but above the deposit minimum, shows
the neutral gap sentence and remains payable. Over-ceiling chips are omitted rather than pushed to the limit.

### WP5 — Focused navigation and action routing

One server route predicate selects focused chrome for journey deposit/card/waiting/return as reviewed, in first HTML
and each loading picture. No normal bar/tab/footer/ticker or intervening promotional overlay appears while paying.
Back and entry/exit use document navigation and history replacement, so cached route chrome cannot linger. Keep the
staff preview seal available without reintroducing player chrome. Classic requests retain their current shell.

`depositAction` carries canonical bet/next and the payment key through every refusal; server facts are reread.
Journey CONFIRMED returns to the safe pending bet; PROCESSING opens waiting for the actual transaction; a Card
handoff keeps the canonical intent in its owned row and the signed-return URL. Preserve `withOrderId`, custom-domain
URL construction and cancelled-return verification. Never trust a raw `next`, posted status or browser amount.

### WP6 — Waiting page and manual return

Server-render an authenticated owned initial status; missing/foreign/type-mismatched ids get indistinguishable
UNKNOWN and no leaked receipt. Poll every 3 seconds during the first minute and 10 seconds afterwards, including
10–30 minutes and later. Listen to the existing `50pick:sse:wallet-balance` event as a payload-free refresh hint;
the response remains the authority. One request at a time; stale completions cannot overwrite a terminal state or
another transaction. Abort/remove all polls, timers and listeners at terminal, unmount or auth loss. Network/rate
failures keep truthful uncertainty and a recoverable same-key route.

Fresh asks for the phone PIN without another payment; slow says still waiting; long offers the owned receipt; from
30 minutes keep receipt/support/status access and the existing-money alternative if the real gates allow it.
PAID shows the real amount and first-deposit notice when due, then replaces location with the rebuilt chosen-bet
destination. FAILED offers a fresh explicit retry and return to the bet. Held says held for return and never failed,
“nothing taken”, another payment, or an invented refund deadline. UNKNOWN does not reveal existence or invite a
fresh charge on an uncertain result.

The sheet rereads current facts on return. Closed/suspended question: truthful closed frame, safe funds statement
only with a successful balance read, and up to three **real** similar available questions (never fabricated cards).
Changed market min/max: clamp only to those legal bounds and show what changed. Loss room: preserve the stake and
explain the refusal. Still short: recompute the gap; a second top-up needs explicit “Weka pesa tena”. No return,
refresh, mount, SSE event, identity notice or timer invokes a bet commit. Keyboard focus opens on the heading; the
manual button and its amount remain reachable when the keyboard is raised.

### WP7 — Records and returned-bet measures

Receipt/inbox/still-pending email links derive from the deposit's parsed stored intent, never a raw query. Retain
the receipt even when the question closes; transaction amounts/references stay authoritative. Money mail remains
confirmed-only and the existing delayed-email claim remains once-only. Review new strings in en/sw/zh against the
S4 copy audit; use corrected journey keys while classic words await S12.

Persist Position.origin only on a newly committed manual bet. `deposit_return` requires a real owned CONFIRMED
deposit, matching saved target/side/stake, player rather than house stake, and a bet placed within 30 minutes of
completion. Forged tags, foreign/failed/held deposits, expired windows, changed quotes and replayed positions cannot
acquire it. Keep the origin create-only on replay/cash-out/settle/void. Prove the numerator and denominator of §3.10
against row times and the actual report/counter; no client beacon may create a bet/deposit count. Review how round
intents are retained without attributing them to the question Position table; S12 owns the Up & Down consistency
sweep and S9 must not silently drop an existing valid round return.

### WP8 — Full proof, parity and release

Both planned S9 suites and their red controls must pass on memory and real disposable Postgres. Run the existing
`npm run test:deposit-gate`, `npm run test:msisdn-prefill`, `npm run test:payments`, `npm run e2e:money`,
`npm run e2e:fault`, `npm run test:dal-parity`, `npm run test:shortfall`, `npm run test:deposit-ceiling`,
`npm run test:pending-bet`, `npm run test:journey-funnel`, `npm run test:journey-shell`,
`npm run test:red-anchors`, `npm run test:orphans`, `npm run test:docs` and affected money/compliance/design guards.
Then fresh-store `test:all`, relevant red battery, typecheck, production build and `npm run verify:backup-schema`.
Do not claim a memory race proves cross-process credit safety or a source-string guard proves a served screen.

Read actual tiles for en/sw/zh at 320×640, 360×640, 390×844, 768, 1024, 1280 and 1920: default/no history, each paused
rail/all mobile wallets paused with Card available, phone edit/paste/empty error return, below shortfall, ceiling/RG/
SoF/maintenance, payout notice, every waiting state, and each return. Include real Chrome/Firefox/WebKit, keyboard
raised and reduced motion. Check visible focus/forced colours, Enter only at the explicit control, repeated-key/
double-tap suppression, errors/live regions, readable whole amounts/phone/reference, scroll/reachable commit,
document Back/Forward and auth expiry. Use production-served SHA/build evidence for first HTML, focused ghosts and
first-load cost. Classic null calibration and a scoped classic parity compare must precede a PASS; name any actual
unflagged bug correction rather than widening a baseline.

Before release, add exact [SHELVED](../../SHELVED.md) rows for newly hidden application source, with remount steps and
guards; keep the source compiling. Update VODACOM/COMPLIANCE/copy/migration records with measured outcomes, source
SHA and limitations. Root owns the main merge/push and migration deploy. After it, verify served deployment SHA,
HTTP health/database reachability, clean Railway migration/boot logs, and real classic player screens. Production
journey remains off until S14 under §0h point 4. A green local drive is not the S14 real-money staff drive.

## 4. Gates that code cannot close

- Finance's actual held-payment refund period remains unresolved. No made-up SLA or human approval.
- S14's real TZS 1,000 staff journey and written agency sign-off (or an explicit owner override) remain external gates.
- S15 requires the completed 14-day baseline and actual launch approval.
- S16 is no earlier than seven days after launch, with real measures/rollback history and agency acknowledgement.
  This preparation creates no substitute session, fabricated elapsed week or acknowledgement.

## 5. Preparation record

- Read-only audit completed at the preparation base: current deposit/action/return, signed verifier and settlement,
  two DALs, marker/recovery helpers, chooser/amount controls, shell/surface rules, receipts/comms/funnel, §3.5/S9,
  relevant §0h owner rulings, inheritance, copy audit and all deposit/waiting/return canvas boards.
- Confirmed prerequisite defects and the Card fingerprint decision in §2 were sent to the root reviewer.
- The root reviewer accepted the ordered scope and the two concrete choices in §2b. At the pure checkpoint the
  [pure helper](../../../src/lib/journey/deposit-state.ts) had **no application caller**: no server/schema/provider
  integration, payment route, screen or migration was implemented. Its explicit trust source is `none`, a fresh
  matching tab marker after hydration, or a separately owned deposit's saved intent; the actual bridge awaits review.
- `npm run test:deposit-state`: 168/168 value assertions; `npm run red:deposit-state`: 38/38 actual source mutants
  caught in memory and the transpiled green control held. Unique declared anchors cover scope/funding mismatches,
  URL/SSR/hydration trust, key loss/TTL renewal/cap, probe/poll boundaries, false failure and returned-bet attribution.
  Review added four registered-MNO probe eligibility, non-null house-marker exclusion at every player seam, and
  finite creation/completion dates with completion no earlier than creation for returned-bet attribution.
  The unconfirmed-origin red initially exposed a weak test whose missing completion date masked the status check;
  that fixture now has a valid completion date and differs only in status, so removing the confirmed gate fails.
- A restored tab choice keeps its original marker age even when another question is currently selected; the current
  storage's live unresolved keys keep their own keys/quotes/ages. A corrupt/over-cap envelope yields no proposed write.
  Matching Card funding identities ignore later billing edits and do not contain dispatch behavior or a fingerprint.
- Targeted TypeScript check of the helper/test dependency graph passed. Pure tests use the approved junction to
  `F:\50pick-work\isolated-red-runtime\node_modules`; its lockfile is identical to this branch's. No dependency install
  or disposable database was run. This scoped exception is for pure preparation, not a deployment/build premise.
- `npm run test:docs` passed; each local link in this plan was also resolved directly. The preparation base has two
  known inherited hygiene failures: `test:red-anchors`'s `market-columns` missing anchor and `test:orphans`'s two old
  Claude workflow panel scripts. All 38 new helper anchors resolve uniquely and both new proof commands are reachable.
  The S8 lane already owns those repairs; rebase onto its verified release instead of changing baselines here.
- The pure checkpoint was pushed as `6f741881fa455fde1ee1253f0bf26c53f5ea9212` on `codex/vodacom-s9`; it contained
  no server caller or database work. The following prerequisite work is newer and has not been deployed.

### 5a. Scoped prerequisite checkpoint

- The root authorized the existing replay and signed-return defects while S8 verification continues. The
  [wallet service](../../../src/lib/server/wallet-service.ts) now compares the reviewed canonical funding identity
  before returning a global key, inside the wallet lock before cap/SOF reads, and after a unique-create race. The
  under-lock recheck prevents two early misses from creating two memory rows and makes a replay consume no new cap.
  Matching replays remain available during maintenance and never dispatch again; Card billing edits recover the
  original transaction without mutating its order. Pending-bet persistence is still unimplemented: current requests
  have a null saved intent, and WP2 must connect the reviewed envelope to both reservation and comparison.
- The signed-return adapter now requires the owned, unmarked row to have type DEPOSIT and currency TZS before any verifier or settle.
  Unknown, foreign, wrong-type and marked rows expose no transaction detail. Existing balance/status behavior remains;
  the shared status core, unknown-balance semantics and signed-response race matrix still belong to WP3.
- Actual Postgres proof found that the [Prisma transaction mapper](../../../src/lib/server/prisma-dal.ts) relabelled
  every stored currency TZS. It now preserves the stored currency so a USD row is refused by funding recovery and return. No
  currency conversion, migration or historical rewrite was introduced.
- [deposit-replay](../../../scripts/deposit-replay.test.mts): **34/34 memory, 34/34 Postgres, 10/10 in-process source
  plants caught**. It executes the shipped function bodies with real DALs, wallet locks, validators and comparison;
  provider dispatch/verification and notifications are controlled counters. The PG catch fixtures hit the real
  unique idempotency-key index; the two-early-miss fixture yields one PROCESSING row and one dispatch. This is replay
  and pre-verifier scope proof, not signed provider or payment-settlement proof.
- PG used PostgreSQL 18.3 on loopback port 5444, this checkout's own `.pgscratch`, all 102 existing migrations, and
  an ignored byte-identical copy of `scripts/db-scratch.mts` beside an optional-runtime junction. The probe verified
  `SHOW data_directory` against this checkout before writing synthetic rows; the runner stopped/swept its own cluster.
  Neither repository lockfile nor the locked dependency runtime was changed. For a normally installed optional
  scratch runtime, run `KP_SCRATCH_PORT=5444 npm run db:probe-deposit-replay` with the appropriate shell environment.
- Full source typecheck, the targeted service/test type graph and docs-link check pass. Existing deposit gate/return
  (77), card adapter (48), wallet atomicity (8) and payment-webhook (77) checks pass. The payment-webhook
  FAILED replay fixture is corrected to carry one shared valid MNO phone/intent across original, replay and new key;
  its FAILED/notDone expectations are retained. The new suite separately refuses a missing-phone replay.
- No new status route, saved-intent migration, trusted page/action bridge, production build, browser or live-money
  result was claimed at prerequisite checkpoint `f041e56e365bba26c1bdda43a59730a24d1a5a23`. The full S9 done-when
  and both planned server proof suites remain open.

### 5b. Additive persistence rehearsal

- [Migration 20261013160000_deposit_return_intent](../../../prisma/migrations/20261013160000_deposit_return_intent/migration.sql)
  adds nullable JSONB `Transaction.pendingBet` and nullable TEXT `Position.origin`, without a default, backfill,
  destructive statement or house-marker change. Its local lock timeout is set inside the DO transaction: each
  individual metadata-lock wait is at most 3 seconds, with at most 20 attempts, 1.5 seconds apart; a failed attempt rolls both
  additions back. Legacy/direct metadata remains null. No application caller creates either new value yet.
- Both transaction stores retain the raw nullable JSON on create/read and ignore it on ordinary updates. A caller
  must parse it before use; malformed JSON remains visible to the funding guard so it cannot be mistaken for a null
  intent. Both position stores write origin only on create and retain it on subsequent full-row writes, including
  cash-out, void and win transitions. They cannot retrofit deposit-return attribution onto a legacy position.
- The root approved the additive fifth private `deposit` parameter, `SavedDepositBet | null`. It is parsed exactly
  before a new reservation/dispatch, included in canonical funding identity and persisted with the reserved row.
  Malformed non-null input is refused rather than erased. Existing four-argument application callers retain null;
  the reviewed page/action trust bridge is still required before any application supplies a chosen envelope.
  Expanded deposit-replay measured **39/39 memory, 39/39 Postgres and 12/12 source plants caught**. Its controlled
  adapter reads the real stored envelope at the dispatch boundary, proving it existed before dispatch, then proves
  matching recovery, changed-intent refusal, no replay mutation and malformed-input refusal before creating/sending.
- `db.txn.latestConfirmedMobileDeposit(userId)` resolves one own, unmarked, confirmed TZS deposit on a currently
  registered MNO rail, newest creation time then id. The Prisma twin asks SQL for one row; the memory twin uses the
  same scope/order. Card/internal/retired rails, pending/failed/wrong-type/foreign/marked/non-TZS rows are excluded.
  An unusable phone must cause the later page's registered-phone/no-rail fallback; deliberately empty error-return
  phone handling is still the page bridge's job, not silently filled by this DAL read.
- [deposit-persistence](../../../scripts/deposit-persistence.test.mts) measured **32/32 memory, 34/34 Postgres,
  17/17 in-process source plants caught**. The PG run applies the actual migration twice to legacy TEMP rows,
  preserves their values/null metadata, then forces a real 3-second lock timeout before successful retry. It also
  proves JSON/origin retention and the history query with both same-time ids and timezone-equivalent timestamps.
- The final SQL passed the mandatory **backup-schema gate 13/13** on this checkout's own PostgreSQL 18.3/5444:
  all 103 migrations, real dump, real restore/invariants, all 126 unique indexes and the existing failing controls.
  The gate removed its temporary artifact and the runner stopped/swept its own cluster. This is local schema/recovery
  evidence; no production database or provider was contacted.
- S9 now uses a separate locked runtime at `F:\50pick-work\vodacom-s9-runtime`. Real `npm ci` used the identical
  lockfile, and Prisma generation writes only there; S8's runtime was not regenerated. The earlier shared-runtime
  junction is retained under ignored `.qa-artifacts/node-modules-pure-baseline`.
- Migration ownership 13, DAL parity 2324 and house-bot rules 639 checks pass. Journey-funnel's 26 red controls pass
  after admitting only the named `pendingBet` exclusion while its origin-removal control still removes origin alone.
  House-report's deliberate absolute money-site locators move exactly +2 for the two new StoredPosition type lines:
  removing only those two lines made the entire source byte-identical to immutable `f041e56e3` (LF SHA256
  `8e46218bfa85c244eedd2b48e761c4e7dfb78f8d58d04a7e7cfe1af588efb28b`). The paired marker defect controls move by
  the same two lines; its exclusion control removes `positionId` alone and retains the new metadata field. No floor
  or population count is raised. Rebase onto S8 must reconcile its corresponding explicit locators again.
  The complete reports wrapper subsequently passed: memory 251, Postgres 80; 3/3 wrapper controls.

### 5c. Next adapter/bridge review

The root approved the following technical resolutions during WP2. The private routes are locally rehearsed in §5d;
the actual trusted bridge, client writer and privacy/storage proof remain required before WP4:

- Put the authenticated shared status core in `src/lib/server/deposit-status.ts`. Resolve an owned row, require
  DEPOSIT/TZS/unmarked scope, then consider a signed provider probe, settle through the existing webhook path and
  reread/recheck scope. Only the fresh row decides the result; balance-read failure remains unknown. The waiting
  adapter uses a transaction id. For a lost funding-action answer, use an owner-only funding-key lookup through
  the same core so recovering a row does not dispatch; foreign/missing/wrong-type keys get the same minimal UNKNOWN.
- Keep Card's signed return adapter for an owned order after its browser return, including a later check beyond the
  background lane's window. Regular MNO foreground probing stays restricted to the registered rails/valid funding
  row and the 20-second boundary. A client return flag, `payment_status`, age or handled verdict supplies no payment
  authority. Later pending Card checks retain this signed adapter, with the same ownership, rate and fresh-row guards.
- Declare status/probe rules in the real rate registry, with status keyed by caller and probe keyed by the owned
  transaction. The registry uses token capacity/refill per minute, not a fixed request count: the normal 3-second
  first-minute/10-second later polling must fit, including initial SSR and receipt refresh. The concrete capacities
  and rate/fault controls will be measured with WP3 rather than claimed from this plan.
- Initial deposit SSR uses trust `none`; incoming URL stake is never chosen. After hydration only the fresh matching
  tab marker can restore it. An owned normalized saved deposit intent can supply return context after auth/receipt.
  The payment's server action validates the canonical saved envelope, and funding equality includes it; the raw URL
  claim is never passed as the saved intent. Independently review this actual page/action code before WP4 ships.
- Funding UUIDs need durable recovery without overwriting any unresolved S8 bet UUID or renewing its 24-hour age.
  Use a separate necessary tab funding marker namespace: an older S8 Host's save would strip an added funding
  member from `kp-pending-bet`. A new namespace would require its own bounded owner/intent/key/TTL parser, storage
  failure-before-send proof and explicit privacy disclosure. The namespace and controller are still unimplemented;
  payment confirmation never clears an unresolved bet key or places a bet.

### 5d. WP3 private status and settlement evidence

The shared [status core](../../../src/lib/server/deposit-status.ts) and its two authenticated GET adapters are prepared
locally: `/api/wallet/deposits/[id]/status` and `/api/wallet/deposits/recover?key=<funding-uuid>`. Neither dispatches a
payment. Funding-key recovery is strictly read-only apart from its rate/audit record; it never probes or settles.
The transaction-id door may probe only a valid, owned, registered-MNO PROCESSING deposit at least 20 seconds old.
The classic signed Card return adapter now uses the same core, retaining later owned Card checks beyond 30 minutes.
It imports that reader dynamically to avoid a static wallet-mutation/reader cycle. Waiting's later explicit Card
check must retain this signed adapter; its client handoff is still to be built, not inferred from an unsigned flag.

- Scope requires owner, DEPOSIT, TZS and no house marker before provider I/O. Missing/foreign/wrong-type identifiers
  have the same minimal UNKNOWN view. Refused lookups write SECURITY without the submitted UUID/reference or a foreign
  row id. Invalid identifiers also refuse without lookup/provider I/O. Signed terminal authority enters only the existing
  webhook settle path. PENDING/UNSUPPORTED/unrecognised replies and exceptions never manufacture FAILED.
- The reader rereads and rechecks the row after a probe, even when the probe threw after a webhook won. It projects that
  row with the central review/held-for-return rules and reads a fresh wallet. A missing/failed wallet read gives
  UNKNOWN, never a stale balance or synthetic zero. Generic and marked disputes project REVIEW; the classic Card adapter
  now has an explicit REVIEW explanation and receipt access without retry or polling. Its UNKNOWN balance is null, and the page renders only non-null PAID
  balances. The old empty-reference assertion was changed specifically to prove this minimal UNKNOWN contract; no
  historical source baseline, population floor or count was raised.
- The final freshness boundary exposed a real mapper mismatch: the SQL wallet column can hold a non-TZS value,
  while `toStoredWallet` fabricated `currency: "TZS"`. Its single read property now preserves the stored value and
  the private core refuses a non-TZS balance as UNKNOWN. A real USD stored-row fixture failed before the repair;
  memory, Postgres and a directly executed mapper/old-hardcode plant prove the refusal after it. Valid TZS rows and
  money mutations are unchanged. This is a data-truth repair, not support for a new currency.
- Both GETs are force-dynamic and `private, no-store` on 200/401/429/503; only GET is exported. The existing service worker
  already bypasses all `/api/` addresses. There is no current waiting/recovery browser caller or prefetch to claim tested.
  The registered caller budget is 30 tokens/refill 30 per minute; the owned-transaction probe budget is one token/refill
  six per minute. The actual rate evaluator accepts the required 3-second first-minute cadence plus initial SSR/receipt
  reads. Refused probes retain stored PENDING and give a retry hint. Executed controls prove caller-key versus submitted
  id, owned-transaction probe key, refusal before lookup and no foreign probe-budget drain.
- Three existing settlement defects were reproduced before repair. A failure's old PROCESSING read could overwrite a
  concurrently confirmed credit and send a false failure notice: failure now rereads/claims under confirmation's same
  wallet lock and sends side effects only for its winning claim. An opposing terminal claim arriving after the webhook's
  early check also bypassed its contradiction alarm: a fresh post-settle opposing state now re-enters that existing
  review/escalation branch, with no automatic reversal or credit. Finally, synchronous dispatch could return CONFIRMED
  while RG settlement actually wrote AML_REVIEW/suspense: its result now uses the freshly scoped stored status.
- The root approved a durable deposit-only review signal in the existing `Transaction.providerStatus` field. The
  [exact predicate](../../../src/lib/wallet/deposit-review.ts) is shared by the core, common player status, receipts and
  every deposit replay result: early lookup, in-wallet lookup and uniqueness-race recovery. An opposing terminal claim
  sets it after a fresh scope/status read under the same wallet lock, preserves the original status and ledger, and
  emits one three-language review bell notice. Duplicate matching/opposing callbacks never clear the marker or credit
  again. Current ordinary `providerStatus` writers are five WITHDRAWAL-only sites; the executed source census and a
  planted DEPOSIT overwrite protect that inventory. No new column or automatic credit/refund decision was added.
- A review persistence fault propagates from the webhook service. Executed generic and Selcom HTTP adapters return
  **500 / `ok:false`**, allowing provider retry. The signed reader keeps its observed terminal verdict and answers
  UNKNOWN if the fresh row still contradicts it without a persisted review marker. A lost answer after the marker
  actually persisted rereads REVIEW. Physical status, wallet and ledger remain unchanged in both fault directions.
- The real `refundAmlRejection` DEPOSIT arm was executed on a genuinely received RG-suspense-funded row. It writes
  FAILED/completedAt and retains `RG_RETURN_MARK`; it dispatches no outbound payment and leaves the RG_SUSPENSE ledger
  entries byte-identical. This remains HELD, not RETURNED. A duplicate signed CONFIRMED for the original collection is
  `already-rg-held`/received, with no new credit, review marker or notice. An explicitly different reported amount
  refuses and alarms as amount-mismatch instead of being called that same collection. Ordinary FAILED-to-CONFIRMED disagreement
  still creates durable REVIEW. The legacy common REVERSED label is preserved; new/changed Card headings, bell text
  and English/Swahili email say held for return, with no delivered-refund claim or unsupported five-day promise.
- Receipts render the current review/held explanation in all three languages. They suppress the automatic-processing
  promise, completion date and balance-after figure for disputed/held money. Actual React renders cover both disputed
  physical statuses and the real RG rejection; kit/chrome leaves are controlled and are not visual measurements.
- [deposit-status-read](../../../scripts/deposit-status-read.test.mts) measured **105/105 memory, 108/108 Postgres and
  45/45 in-process source plants caught**. It executes the shipped reader, adapters and settlement bodies against the actual
  DAL, wallet locks and ledger. Its verifier/notification/mail/counter boundaries are controlled local fixtures, not real
  provider proof. Both opposing signed-reader/webhook interleavings preserve the winning ledger state and escalate;
  duplicate failure notices and confirmed credit/funnel notices happen once. Postgres independently checks the real
  balanced DEPOSIT group and RG_SUSPENSE entries. The checkout's own 5444 cluster stopped after the run.
- Existing deposit replay passes 39/39 memory with all 12 plants caught after moving its return-scope plants to the
  actual shared core. Payment-webhook 77, deposit-gate-return 77, wallet-status-writers 51, house-bot rules 639, Card
  deposit 48, rendered deposit-notifications 73, wallet-receipts 57 and email truth 1246 pass. Pure deposit state remains
  168/168 with 38/38 plants: the former FAILED-plus-RG "returned" expectation now honestly requires HELD. Full application
  typecheck and the status test's explicit TypeScript graph pass. Replay Postgres also passes 39/39 after the review
  changes. Disclosure remains 122/122: the immutable `7624cf8c9` original-clause golden stays, only S9's six existing
  held literals are restored and six exact new REVIEW literals removed for that comparison, and old/new deletions,
  mutations, unapproved keys and duplicates are rejected. No golden or assertion floor was moved. Translation safety
  24/24, source bytes 7/7 and doc links pass. The preceding WP3 rehearsal also passed DAL parity 2324 and the complete
  house-report wrapper (memory 251, Postgres 80, wrapper 3/3); these are not
  relabelled as measurements of later source changes.

The expanded source/test packet is prepared for independent root review before integration. The latest scoped
mapper repair and publication-delta helper remain explicitly in that packet; a branch checkpoint preserves this
reviewable work and is not a main/production approval. S8's final shared-lock corrections must arrive on rebase.

**Officer-resolution limitation:** no existing reviewed action resolves/clears the exact dispute marker. Matching
callbacks, retries and signed status reads do not clear it. The officer's policy for disputed credited money, a durable
outbound RG-return proof, any refund SLA and agency acknowledgement remain open; this checkpoint does not manufacture
them. The bell is best-effort: an older immutable notice can remain in history, and a lost response after the marker
write can precede notice creation. The fresh status/receipt is the authority; no durable notification outbox is claimed.

### 5e. Post-UNKNOWN recovery gate before client integration

[VODACOM-PLAN §3.5](../../VODACOM-PLAN.md) limits the automatic foreground probe to PROCESSING (the Selcom-probe
paragraph) and permits the failed page's "nothing was taken"/fresh-key retry only on terminal authority. This core
does not silently broaden terminal-row polling. A total persistence outage cannot durably remember an observed
contradiction: the failed review write propagates HTTP 500 for provider retry and this request returns UNKNOWN, but a
later ordinary stored FAILED read alone cannot erase a controller's earlier uncertainty.

Before any client writer, prove the actual controller keeps that owned funding identity/key locked across UNKNOWN,
auth loss and reload. It must not treat a later read-only bare FAILED as fresh-key authority after a known UNKNOWN.
Prepare an independently reviewed **explicit signed recheck** contract: an owned, canonical DEPOSIT/TZS/unmarked row,
one of the four MNO rails or the existing signed Card adapter, the same caller/owned-row budgets and no dispatch.
Fresh unmarked/non-RG stored FAILED plus a matching signed FAILED can resolve that uncertainty; signed CONFIRMED which
opposes stored FAILED must persist REVIEW before any terminal presentation. Faults, unsupported replies, missing or
changed scope and missing wallet truth remain UNKNOWN. Review/held markers never clear from recheck. Funding-key
recovery stays read-only. This proposal and its real controller/persistence proof are **not implemented or approved
as an expanded polling policy** at this checkpoint; review them before WP4.

The real trusted page/action bridge, separate bounded funding namespace and disclosure remain gates before a client
writer. No waiting/deposit journey screen, production build, visual/flag parity or live provider result is claimed.
S9 stays open and undeployed and must rebase onto the verified S8 release before product integration.
