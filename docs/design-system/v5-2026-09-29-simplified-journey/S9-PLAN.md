# S9 — Deposit, waiting and return

**Status: isolated S9 product candidate; S9 remains open, 2026-10-15.** The original preparation branch was
`codex/vodacom-s9` in `C:\Users\asheib\.codex\worktrees\vodacom-s9\kipindi-main`, created at
`e767f3f52c54b2659d9057dcbc46d42c5edcc833`. Its reviewed prerequisites and additive persistence now join
the product candidate on `codex/s9-candidate-1015` (record in §5m–§5n). No S9 product or migration has been deployed.
The candidate must integrate the verified S8 release, complete WP8 and pass an independent funding bridge review before S9 can close.

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
recovery stays read-only. The root agent reviewed the explicit one-shot endpoint contract on 2026-10-14 under the
owner's standing delegation; its separate
implementation is recorded in §5f. It is **not an expanded automatic polling policy**. The actual controller,
storage/expiry and auth/reload proof remain unimplemented review gates before WP4.

The real trusted page/action bridge, separate bounded funding namespace and disclosure remain gates before a client
writer. No waiting/deposit journey screen, production build, visual/flag parity or live provider result is claimed.
S9 stays open and undeployed and must rebase onto the verified S8 release before product integration.

### 5f. Explicit terminal recheck preparation — 2026-10-14

The new [private recheck core](../../../src/lib/server/deposit-recheck.ts) and
[POST adapter](../../../src/app/api/wallet/deposits/[id]/recheck/route.ts) are isolated preparation. The root agent
reviewed the nine-file endpoint, wallet-before-claim and transaction/notice correction on 2026-10-14 under the owner's
standing delegation and approved a checkpoint
on `codex/vodacom-s9`. Ordinary status and funding-key recovery are unchanged. Only an explicit authenticated same-origin
POST, with `Sec-Fetch-Site: same-origin` and `X-KP-Deposit-Recheck: 1`, enters this door; missing, same-site, cross-site,
none and non-POST requests refuse before session/core access. No CORS permission is added. The custom non-simple
header and browser-controlled fetch metadata avoid trusting an internal proxy URL or raw posted payment fields.

Caller budget precedes lookup; only the owned DEPOSIT/TZS/unmarked canonical funding row may spend its owned probe
budget. A raw FAILED with neither held/review authority nor a missing reference can query one of the four registered
MNO rails or CARD. Provider I/O runs outside the wallet lock. A signed FAILED, including an exact valid amount when
one is supplied, gains `failureAuthority: signed-recheck` only after the same canonical funding intent, provider
reference and funding key are reread under the wallet lock with a valid current TZS wallet. A transport/signature,
storage or review-write fault returns UNKNOWN/non-success; PENDING, unsupported, rate refusal, changed scope/intent,
invalid amount or absent wallet give no safe-new-payment authority. The initial canonical funding identity is a
normalized snapshot: the memory DAL's mutable row object cannot silently change both sides of its later comparison.
The fresh funding/ref/key/projection and current TZS wallet (safe nonnegative integer balance) are checked **before**
any opposed review claim. Signed CONFIRMED against fresh FAILED, or signed FAILED opposed by a fresh CONFIRMED row,
enters the existing durable review claim, with no automatic credit/refund. Its reads/update and the post-claim reread
use the same wallet transaction through the additive optional `txn.findById` transaction argument in both DAL twins;
existing callers retain their default reads. The new review notice runs after commit. A later read fault rolls back
the actual PG marker and drops the notice; the security audit may still record the observed provider contradiction.
Held/review marks never clear. This endpoint creates
no transaction, funding key, payment dispatch or refund. It makes no new claim that a rejected RG collection has
been returned. Every response, including 401/403/429/503, is `private, no-store`.

The proof reuses the existing actual-source wallet/core harness through a named `--recheck-only` mode, the real DAL,
wallet locks and ledger, with controlled signed adapter I/O. New package keys are `test:deposit-recheck`,
`red:deposit-recheck` and `db:probe-deposit-recheck`; the normal test is in predeploy. The targeted proof measured
**88/88 memory, 90/90 Postgres, 26/26 memory source plants and 2/2 actual-PG rollback plants caught**.
The PG-only controls prove same-transaction marker visibility, rollback of the marker and notice, and the continued
top-level committed claim; memory Maps are not presented as SQL rollback proof. The initial unsupported-guard deletion
became redundant after the final signed-FAILED guard was added: its replacement plant promotes an unsupported reply
to FAILED and is caught by the same verdict. Existing status-read remains **105/105 memory**
after sharing the harness. The PG run migrated this isolated checkout's own disposable cluster on port 5444, checked
its actual data directory and stopped it. These are not browser/provider/live proof.
The fixture imports one actual lock runtime. Sharing its context across independently compiled application bundles
still depends on rebasing onto S8's reviewed shared-lock repair before integration; this checkpoint does not prove a
production bundle or bypass that prerequisite.

**UI integration remains blocked by §5e.** This includes the existing classic Card return: its refresh currently
accepts ordinary stored FAILED and offers a new deposit. After a prior UNKNOWN that is not fresh-key authority.
The future controller must retain the original funding identity and all unresolved S8 bet keys across UNKNOWN,
auth and reload, reject stale completion, and persist its resolved transition before allowing a later explicit new
Lipa. Missing/expired funding storage cannot prove that earlier uncertainty never happened; an owned terminal FAILED
in such a reentry requires the explicit signed check. No client funding writer, namespace/disclosure, storage/expiry
controller, classic return retry repair or UI change is included here. Officer resolution, outbound-refund proof/SLA,
agency acknowledgement and rebase/integration/release gates remain open.

### 5g. S8 prerequisite merge preparation — 2026-10-14

The reviewed explicit-recheck preparation is saved at `5ac800f7152e8a28907a10edd594f8a279ae8eb0` on
`codex/vodacom-s9`. Preparation now merges `origin/codex/vodacom-s8` at
`2490c75c3`; S8's release gates remain with the root agent, and this is no LIVE or S9 completion claim.
The two conflicts were proof inputs: predeploy retains both parents' checks exactly once (239 commands), and the
house report's seven writer locators move +2 for S9's two `StoredPosition.origin` type lines. Every nine-line writer
was independently SHA256-compared with that S8 tip and remained byte-identical, along with the unchanged deletion,
wrong-object and stake controls. The merged memory report child measured **251 passed, zero failed**. Typecheck,
recheck **88/88**, landed-key **49/49**, admission-copy **17** and lock-copy **11 + 3 plants** pass. The isolated
Postgres lock-copy proof also passed all **7** actual connection/commit/rollback/drain controls and stopped the cluster.
This brings in the process-shared lock/admission runtime prerequisite; classic Card/controller/storage and UI work
still require their own source and browser proof, including the S10-owned account-partition prerequisite.

### 5h. Original funding restriction for explicit recheck — preparation, 2026-10-14

The root agent reviewed the binding design under the owner's standing delegation. Before client wiring, the explicit
POST now requires the [canonical original capsule](../../../src/lib/journey/deposit-recheck-binding.ts): version 1,
owner, transaction id, original nullable funding UUID, bounded original provider reference, and canonical funding
owner/type/amount/currency/provider/normalized phone/saved bet. An explicit null preserves a historical missing key;
absence, malformed keys or unknown envelope fields fail closed. An owned server row can produce this capsule; a URL
cannot. Posted fields only restrict an authenticated owned read: they never set money, status, a key or the provider
reference used for lookup/verification.

Caller budget still precedes lookup. Owner/id and canonical shape are checked before any row read, then the whole
original restriction matches the stored row before probe and again under the wallet lock before marker claim and
after it. The route bounds declared and streamed bodies to 4096 bytes, cancels an overflowing stream and parses
strict UTF-8/JSON. A missing or invalid body reaches only a minimal UNKNOWN, with no retry authority; private 401,
403, 429 and 503 behavior is retained. Ordinary status and funding-key recovery remain unchanged.

The actual-source proof now covers capsule absence, explicit null keys, extra posted status/money, foreign owner with
an otherwise matching foreign transaction, mismatched key/reference/amount/phone/provider/saved bet, malformed JSON,
exact and exceeded byte bounds, and streaming with a lying length. Original/fresh tuple drift, valid current wallet,
marker atomicity and deferred-notice controls remain. A clone-removal plant from the earlier endpoint became safely
redundant under the complete original-capsule restriction and was retired without weakening its normal raw-row drift
control. Fresh-tuple plants remove both equivalent comparisons for their named field; they still produce the actual
wrong-result/probe verdict, rather than claiming a redundant single deletion unsafe.
The current capsule preparation measured **121/121 memory, 123/123 Postgres, 30/30 memory source plants and 2/2
actual-PG rollback plants caught**. Typecheck and the strict proof graph pass; ordinary status remains **105/105**.
The final PG run migrated the isolated 103-migration cluster, checked its real data directory and stopped it. These
controlled signed-adapter fixtures add no browser, real provider, release or LIVE claim.
The root agent reviewed this six-file binding/body/proof packet under the owner's standing delegation and approved
its recoverable `codex/vodacom-s9` checkpoint on 2026-10-14. This records an internal source review, without claiming
an additional human or external agency approval.

No client storage writer, classic Card UI or deposit action is connected yet. The next controller must use a separate
bounded owner funding namespace and retain unresolved identities without age-based safe-retry inference, while the
S10-owned `kp-sheet-intents:v2:<owner>` and keyless 24-hour `kp-pending-bet` namespaces remain independent. It must show
ordinary bare FAILED as uncertainty, offer this explicit bound check, persist the correct resolved transition before
permitting a later explicit Lipa, and reject account/epoch/unmount/stale completions. Cached A chrome must refuse a B
session before money. Funding keys are allocated only on an explicit first Lipa, never observe/open/refusal/UNKNOWN.
New tab disclosure and the concrete trusted page/action bridge are review gates before a writer or WP4 UI.

### 5i. Provider-reference scope repair — preparation, 2026-10-14

Two actual-source local reproductions changed this packet's scope. An explicit recheck of B's fully bound FAILED
deposit with a signed CONFIRMED answer selected A's first matching provider reference, marked A REVIEW and notified
A, leaving B unchanged. The private restriction now reaches the common settlement door: it selects the original
transaction id through the current wallet transaction and matches the complete original owner/type/funding key,
reference and canonical funding tuple again at selection and before the fresh marker write. It refuses a
PROCESSING row, so this terminal restriction cannot become a known-id collection/credit bypass. It does not create,
dispatch, credit, debit, refund or resolve a funding key. The owned no-money REVIEW claim can still record a signed
contradiction when another row has the same reference; its marker and notice retain the reviewed commit/rollback
semantics.

The second reproduction used ordinary PROCESSING deposits for two owners with the same reference. Reading B's status
with a controlled signed CONFIRMED/5000 answer credited A 5000, left B at zero/PROCESSING and answered B PENDING.
The ignored local artifacts `s9-ref-collision-before.json`, `s9-ref-collision.mts`,
`s9-processing-ref-collision-before.json` and `s9-processing-ref-collision.mts` retain the original observations and
fixtures. This is a reproduced source defect, not evidence that a live collection collided. The root agent approved
the narrow repair under the owner's standing delegation. Both DAL `findByProviderRef` readers now refuse multiple
matches instead of choosing an arbitrary owner, rail or transaction type. SQL asks for at most two rows; memory
stops at the second match. Both retain missing/unique-reference behavior and accept the same optional current
transaction argument. An ambiguity propagates non-success from common settlement and the existing webhook failure
adapter; private readers return minimal UNKNOWN without raw database details or new-payment authority.

The common ordinary settlement still uses the global reference selector. Each existing deposit confirmation,
deposit failure, withdrawal confirmation, withdrawal failure and terminal-review wallet callback checks that the
reference remains unique and identifies that same row before changing money, status or a review marker. The reread
uses that callback's current transaction. No outer lock wrapper moves ordinary notices ahead of their existing
commit boundary, and provider I/O stays outside wallet locks. The ordinary eligible status probe checks the reference
before provider I/O and after its fresh row reread, so a collision during verification cannot return a misleading
PENDING or raw safe FAILED. Automatic polling policy and funding-key read-only recovery remain unchanged.

Even a matching signed FAILED cannot authorize a later payment when its reference belongs to multiple rows. The
explicit core now verifies a unique, same-id reference under the current wallet transaction before returning
`failureAuthority: signed-recheck`. Missing, ambiguous or other-row references stay UNKNOWN. It never turns an
ordinary bare FAILED into this authority. Stored REVIEW and RG-held collection behavior is retained; no automatic
review resolution, outbound-refund proof or policy is introduced.

The initial reference-check proof measured **165/165 memory and 172/172 Postgres**. It executes the actual selector AST over real
fixture rows, the actual SQL selector in Postgres, and the shipped core/settlement bodies with real DAL, locks and
ledger; only signed adapter and notification leaves are controlled. It covers both deposit/withdrawal orderings,
both signed terminal verdicts, a duplicate appearing at every pre-lock claim boundary, and a collision during the
signed probe. Balances, withdrawal holds, rows, notices, review markers and actual PG ledger rows stay unchanged on
refusal. The PG selector sees an uncommitted collision through its current transaction and rollback restores the
original reference. All **45/45 memory and 4/4 actual-PG plants** were caught: arbitrary single-row SQL selection, a selector escaping
the transaction, review-marker auto-commit and a notice escaping rollback. The isolated 103-migration PostgreSQL
18.3 cluster on 5444 passed its real data-directory guard and stopped. The next owned-probe identity correction is
recorded in §5j; no checkpoint acceptance is implied by the implementation ruling alone.
Fresh-reference drift controls use a distinct changed reference per fixture so old fixture rows cannot accidentally
mask a missing original-binding guard with unrelated ambiguity.

This repair does **not** install the `Transaction @@unique([provider, providerRef])` declaration. Its missing migration
is existing recorded drift (see `20260925160000_suppression_lifted_at/migration.sql` and the marketing plan's S3b
handoff). A compound constraint would not itself make a reference-only cross-provider lookup unique. The packet
detects an existing collision and rereads before mutation; it does not globally serialize every provider-reference
writer or assert prevention of an insertion after the final check. No live scan, constraint/backfill or production
schema change is part of this preparation. Separate funding storage, account/epoch retention, classic Card retry
repair, the expected-owner deposit action, three-locale disclosure, controller/browser gates and WP4 remain open.

### 5j. Freeze the owned automatic probe's original identity — preparation, 2026-10-14

Independent source review by the S10 agent found an identity hole that uniqueness alone did not close. The actual
local harness then reproduced it: while A awaited verification of old reference R, changing A to R2 and making B the
sole holder of R let the signed old-R answer credit B 5000, answer A PENDING and post one ledger group. Mutating the
memory DAL's A row object instead retargeted that same signed old-R answer to R2 and credited A under its changed
reference. The ignored `s9-ref-move-before.mts` and `s9-ref-move-before.json` preserve both original observations.
No actual gateway, HTTP request or live wallet was used. The root agent authorized the correction under the owner's
standing delegation; the peer's follow-up source review found that lost-owned-row trace addressed, with no browser
or test claim from their read-only review.

Before awaiting provider I/O the ordinary owned core now freezes the normalized original owner, transaction id,
funding UUID/null, provider reference and complete canonical funding tuple. It queries and submits the answer using
that original reference. A separate processing restriction reaches common settlement; it still selects through
the global unique reference reader and requires that row to match the original capsule. The existing deposit wallet
claim checks both uniqueness and that original funding tuple through its current transaction before credit/failure;
the same restriction survives a terminal race into the existing no-money review claim. The ordinary final projection
rereads the original transaction and matches that original capsule/reference. It cannot treat the reference's new
sole holder as the payment the caller checked, or use a mutable memory row as the original snapshot.

This processing restriction is distinct from the private explicit terminal restriction, which continues to refuse
PROCESSING and may only make the reviewed owned terminal claim. A private processing capsule restricts an existing
owned signed probe; it supplies no dispatch, new key or amount authority. Generic unique-reference webhook semantics
are retained. Ambiguous references remain refused before and inside the existing wallet transaction; the owned id
is never a bypass that could credit both duplicated rows. No provider I/O was moved into a wallet lock.

The expanded actual-source controls cover replacement of the old reference's sole holder, mutable memory retargeting,
foreign-terminal marker/audit refusal, and amount/phone/key/rail drift at the actual wallet claim. They retain the
earlier ambiguity, current-transaction visibility and review rollback/notice controls. The final real Postgres run
measured **172/172 memory, 179/179 Postgres, 49/49 memory plants and 4/4 actual-PG plants caught**. The PG run migrated
all 103 migrations, checked its own real data directory and stopped 5444. App typecheck and the strict proof graph
passed. Ordinary status remains **130/130 memory with 45/45 plants**, payment webhook **77/77**, replay **39/39 with
12/12 plants**, persistence **32/32**, DAL parity **2324/2324** and the house-report memory child **251/251**. The replay
fixture's existing actual-core dependency map gained the real binding module import; no replay verdict or floor
changed. The root agent reviewed the scoped implementation under the owner's standing delegation and authorized its
ten-file preparation checkpoint on 2026-10-14, without implying new human/external approval. The broader
missing-constraint/global-writer limit from §5i remains open; this packet addresses the
observed drift during provider I/O without claiming serialization of every later reference writer. Funding controller,
classic Card UNKNOWN recovery, owner-gated action, disclosure and UI integration remain unstarted and unverified.
The caller inventory also finds known-row verification in `creditConfirmedDeposits`, `settleConfirmedWithdrawals`
and `reconcileStalePayments` which is not yet given this private deposit restriction; the stale failure arms call
known-id helpers directly. The actual-source ignored `s9-fast-ref-move-before.mts` then reproduced foreign B credit
of 5000 by the deposit fast caller when A's old reference moved to B during verification, with A unchanged and one
ledger group. Its before output is saved in the adjacent JSON artifact. That background repair remains open before
client wiring. The deposit callers can retain their original deposit capsule; withdrawal drift needs a separately
reviewed payment-type binding (a withdrawal cannot reuse the DEPOSIT capsule) and its own actual-source proof.
This packet makes no all-background-callers-bound claim.

### §5k · Background signed claims, current wallet authority and publication (2026-10-14 preparation)

The primary verified preparation snapshot is `ae18a4aa83a40432d201054a1f4acecfdd8796ee` (§5j). This subsequent
isolated S9 packet addresses the background callers identified there; it is not main, integrated, deployed or S9
completion. The root agent authorized these repairs under the owner's standing delegation. No new human or external
agency approval is implied. Client funding storage/controller, the classic Card UNKNOWN/retry repair, expected-owner
deposit action, new funding disclosure and UI integration remain unimplemented and unverified. Work stops at this
recoverable server/proof checkpoint for the morning handoff.

The ignored actual-source `s9-background-six-before.mts` executes the primary snapshot's six signed background
lanes against bounded local fixtures. Moving A's reference during provider I/O to a new sole holder B credited or
released B in the confirmed lanes; the stale failed lanes instead changed/refunded A after its original reference
had changed. No actual provider, production wallet or HTTP was used. The fast/stale DEPOSIT callers now freeze
their canonical owned deposit capsule before verification. WITHDRAWAL has a distinct server-only original tuple:
owner, transaction/wallet ids, type, original reference, signed amount, stored fee/currency/provider/phone/rail and
original funding key/null. Historical positive withdrawal amounts and internal `rfd:` keys are retained; a withdrawal
cannot become a deposit capsule. Neither tuple includes mutable status/detail or grants dispatch authority.

Every signed answer goes through the global unique reference selector, matches that same original row before the
claim, and checks its current tuple/reference through the existing wallet transaction. Withdrawal provider-detail
writes use the same restriction/current transaction. The final ordinary settlement read also uses that transaction.
The distinct private terminal door still refuses PROCESSING. No provider I/O moved into a wallet lock, no reference
ambiguity bypass was added, and ordinary unique-reference webhook routing remains available. Malformed/unavailable
stored funding identity remains pending for review rather than being silently converted into a new identity. The
existing no-reference mock timeout and non-live supported-identity fallback remain; an existing mock payment fixture
was corrected to provide its registered phone so that it exercises a valid mobile-money tuple.

The actual-source `s9-wallet-authority-before.mts` also reproduced settlement into a USD wallet and a successful
common answer when a required wallet read returned null. Current wallet id/owner/TZS/safe balance, and withdrawal
hold covering the movement, are now checked before mutation. A null withdrawal refund adjustment refuses the claim
before FAILED or a returned-money notice; the failing before control is preserved in
`s9-background-null-adjust-before.log`. Read faults and incomplete settlement return neutral non-success; they do
not manufacture cash, a completed receipt or safe retry authority.

An actual Postgres extension of the enclosing-transaction proof reproduced the inherited DEPOSIT/FAILED path
writing outside its wallet transaction and publishing before commit (`s9-background-deposit-failed-before-pg.log`).
That failure write now uses the current transaction. All four deposit/withdrawal terminal completion publication
paths wait for an enclosing transaction to commit. Top-level behavior remains available immediately after its own
committed claim. Rollback drops the money/status/ledger change and the queued notice; it does not announce a refund
or deposit that never committed. Memory Maps are used for source/identity controls, not SQL rollback evidence.

The background controls execute actual source bodies with the actual DAL, wallet locks and ledger, and a controlled
signed adapter. They cover all six caller lanes with stable/duplicate/reference-move/mutable-row cases, exactly-once
replay, late amount/key/reference/fee/rail drift, opposing terminal races, invalid/missing/unreadable wallets and null
refund adjustment. Actual SQL checks also read balanced original-row ledger entries and all four enclosing commit/
rollback pairs. Five actual-PG source plants independently remove the failure write's transaction or release each
completion notice before commit. Final measured results are **109/109 memory controls, 141/141 Postgres controls,
12/12 memory plants and 5/5 actual-PG plants caught**. Logs are the ignored
`.qa-artifacts/s9-background-final-red.log` and `s9-background-final-pg.log` in this isolated S9 checkout. The SQL
runner migrated all 103 migrations, verified its own real data directory and stopped port 5444. Payment webhook
is **77/77**; retained ordinary status is **130/130 with 45/45 plants**. App typecheck, the strict proof TypeScript
graph and the exact current-source private recheck normal **172/172** passed. The orphan reachability and
**5672/5672** red-anchor checks passed. The new normal/red/guarded scratch keys are
reachable; predeploy preserves all 239 previous unique commands and adds the background normal for 240 total.
The retained private recheck defect run also caught **49/49** plants (`s9-background-recheck-regression.log`);
the separate final normal is recorded in `s9-background-recheck-final-normal.log`.

OPEN: the missing installed reference constraint/global writer serialization in §5i remains. This repair cannot
prevent an uncoordinated reference writer inserting a collision after the final guarded read. A persistent lookup
outage supplies no signed authority. The existing withdrawal contradiction alarm has no newly invented durable
refund/reversal resolution policy; DEPOSIT opposition retains its exact durable review marker. RG-held collection
does not prove an outbound refund arrived. Officer resolution, refund SLA/agency acknowledgment, controller storage/
owner/expiry boundaries and real provider/live verification remain open. No all-money-paths/all-background-safety,
refund-arrived, browser, release or LIVE claim follows from these local proofs.
Queued publication remains the existing process-local best-effort side-effect mechanism; this packet adds no durable
outbox and does not claim notices survive a crash after money commits. Sweep totals are not evidence that an outbound
refund reached its recipient. Funding UI/controller work does not begin in this handoff packet.

### §5l · Root review fixes — landability pass (2026-10-14)

Input: the independent root review of `9869dd701` (findings H1–H3, M1–M4, L1–L8). Branch `codex/vodacom-s9-fixes`,
three commits stacked on `codex/vodacom-s9`; not main, not pushed, not deployed, not S9 completion — the coordinator
decides what lands. No production, Railway or production credential was touched; every PostgreSQL run used this
checkout's own disposable 18.3 cluster on port 5448 (`.pgscratch`), a fresh database with all 103 migrations per suite.

- **H1 · one row never stalls the sweep.** `reconcileStalePayments` isolates each stale row (`for … try … catch`). A row
  whose settle throws moves no money, stays PROCESSING, counts in `leftPending` and is put before an officer once
  (`reconcile settle error — left PROCESSING, not auto-settled`, the message in the payload); the next row settles.
  `maybePaymentSweeps` gives the reconcile and the still-pending notices their own catch, as the escalation had. The
  background suite no longer scores a thrown lane as a pass, and a new control runs the REAL `listByStatus` with
  poisoned rows (ambiguous reference; a hold short of the payout) immediately ahead of valid rows of every arm: the valid
  deposit is credited and the valid FAILED payout's hold released, on both stores, with the visiting order asserted.
- **H2 · a Decimal(18,2) wallet is a valid wallet.** The credit, payout confirm/refund and the two readers require a
  finite, non-negative balance (and a hold covering the payout); identity, wallet id and the exact `TZS` unit are
  unchanged. Negative, NaN and infinite stay refused; a REAL stored 1,000.50 settles exactly on every arm.
- **H3 · the four red guards.** `test:aml-dispatch-window` 3.2 and `test:payout-callback-identity` 3.2 are re-derived to
  the bound two-hop shape, scanning whole functions, with positive controls; `test:cert-c3` asserts the ruling's label
  and the held-for-return body; `test:kyc-copy-truth`'s P3 plant lands inside `notifyWithdraw`.
- **M1 · migration lock order.** `"Position"` before `"Transaction"` (the bet path's order); `deadlock_detected` retried
  like a lock timeout; the recovery line in the header.
- **M2 · the 2026-10-07 ruling.** A held deposit's LABEL is "Reversed" on every player surface (COMPLIANCE-DECISIONS,
  item 6). The bell title, the email eyebrow/heading/Status row and the card-return title are restored in the status
  lexicon's words; the bodies keep the truthful held-for-return wording, which the ruling does not govern and whose old
  delivered-return claim the same entry records as untrue. No new ruling is recorded here.
- **M3** each store is held to its truth for an in-transaction review-marker fault (memory REVIEW; PostgreSQL rolls the
  claim back: UNKNOWN), and an answer-lost-after-commit control is REVIEW on both. **M4** stored funding keys are opaque
  (bounded printable text, compared by equality); the posted recheck capsule keeps UUID-or-null; `deposit()` refuses a
  key the binding could not carry. **L1** an ambiguous Selcom-callback reference is an audited 500. **L2** both payout
  lanes compare the stored trail form. **L3** the sweep's verified FAILED keeps `reconcile-verified-failed`. **L8** the
  owned probe's signed-FAILED exception to the sweep-only rule is stated at its site. L4–L7 are left as the review
  records them (latent, a copy decision, or pre-existing policy).

Measured (this checkout, 2026-10-14). Typecheck clean. Memory: payment-background **141/141, red 23/23** (11 new plants);
ordinary status **141/141, red 52/52** (9 new); recheck **173/173, red 51/51** (2 new); persistence **34/34, red 19/19**
(2 new); replay **39/39, red 12/12**; state **168/168, red 38/38**. PostgreSQL 18.3: status **149/149** (was 137/138);
recheck **180/180** with **4/4** actual-PG plants; background **176/176** with **5/5**; replay **39/39**; persistence
**37/37** (a real loss-limit deadlock that the migration loses is retried and both commit); migration re-run clean;
`e2e:money` **64/64**; `e2e:fault` **34/34**; `e2e:card` **100/100** on PostgreSQL and on memory (was 99/100); backup gate
**13/13** (`scripts/backup-schema-gate.mts`, the gate `verify:backup-schema` runs). Lock probe, three interleavings: the
old file lost case 1 (migration 40P01) and case 2 (bet 40P01); the new order without the deadlock retry lost case 3
(migration 40P01); the shipped file commits all three. Guards: `aml-dispatch-window` **18/18**, `payout-callback-identity`
**18/18**, `cert-c3` **1649/1649**, `kyc-copy-truth` **495/495**, `deposit-notifications` 73, `payments` 77, `cert-c1`
1246, `red-anchors` 5716, `dal-parity` 2324, and 65 further money, journey, copy and guard suites green. The review's own
reproduction, re-run on this tree on both stores: no wrong-wallet credit after a reference move; a fractional-wallet
deposit and payout settle; an ambiguous row is left for review while the valid row behind it is credited.

OPEN: `test:house-bot-disclosure` 5.1 (and its two controls) is red at `9869dd701` and here alike: it compares against
`origin/main`, whose `ee518f52a` changed `src/app/legal/privacy/page.tsx` after this stack's merge base; it clears when
the stack is merged with main. A withdrawal stored under a key the withdrawal tuple cannot carry (over 256 characters
or control characters, which a tampered form can send) is still left for review by both payout lanes; the deposit door
now refuses such keys, the withdrawal door does not yet.

### §5m · Codex S9 product candidate (2026-10-15)

The isolated `codex/s9-candidate-1015` checkpoint at `49acd4ed6` merges the pushed S9 preparation into
`origin/main` at `50b586d50` and implements a **candidate** for WP4–WP7. It has not been deployed or enabled.
The new journey uses focused deposit, Card and waiting routes; a separate owner-scoped, read-back-verified tab
funding key; a hydrated chosen-bet bridge; owned status and explicit bound FAILED recheck; the 30-minute
existing-wallet-money alternative; manual return; real closed-question and current-bounds frames; stored-intent
receipt links; and create-only question-position return attribution. The classic direct deposit form remains in
its same-route alternative. WP8 and independent bridge/controller review remain release gates.

**Reporting contract before integration.** The established `deposits.betWithin30` and old/new funnel
`depositToBet` stay broad: any player BET_PLACED transaction within 30 minutes of a confirmed deposit counts.
The candidate adds a separate `depositReturns` measure, displayed as “Saved question → manual bet (30 min) ·
all players.” Its denominator is confirmed TZS player deposits in the report window with a canonical saved
question intent, positive selected stake and valid completion time. A saved Up & Down intent is counted
separately, never treated as a question position. Its numerator is one-to-one inferred matches from
`Position.origin = deposit_return` to those deposits, with the same owner, exact question/side/stake,
and placement no later than 30 minutes after actual completion. Origin has no stored deposit foreign key,
so the pairing among overlapping identical deposits is inferred and the measure is not split by campaign
or old/new journey. The UI names it as an all-player measure. Neither the broad aggregate nor a client
funnel beacon is used to claim a saved-question return.

Memory candidate proof before the final storage/phone/listener edits: typecheck; deposit-return 20/20 and
red 17/17; deposit-state 184/184; replay 48/48; persistence 34/34; status-read 175/175. The latest
source edits and actual PostgreSQL, migration/backup, visual, three-locale, and full WP8 gates remain to be
rerun before integration. A checkpoint commit and branch push preserve the candidate; they do not constitute
release approval.

### §5n · Candidate hardening and remaining gates (2026-10-15)

The subsequent pushed candidate checkpoints through `19c6ebbd5` use a funding tab record containing only
its UUID, owner, creation time and attempts marker. The Card and mobile forms read it before another payment
commit. Typecheck, doc links (730), trilingual structure (38/38), journey shell (452/452), sheet-host
(49/49), its red controls (84), and the targeted source/status tests in §5m passed on memory. Those
checks do not establish the migration or browser result.

A source review found that the signed preflight redirect was releasing a stored funding UUID even though a
prior same-key request could still be uncertain. The candidate now retains that UUID for both mobile money
and Card and routes the owner through recovery. The Card bridge also closes its form gate on each effect
and checks the stored lock at submit time, including after same-route DOM reuse. These latest changes need
their focused test and typecheck rerun. A pre-dispatch refusal with no transaction can therefore stay
locked: a safe automatic unlock needs a proven writer/reference serialization rule, not an elapsed timer
or a signed message about only the latest invocation. §5i/§5k's missing installed reference constraint
and global writer serialization remain release blockers.

An attempted fresh `verify:backup-schema` on this candidate's isolated local PostgreSQL 18.3 runtime
stopped during `initdb` with Windows exception `0xC0000005` before migrations ran; it is **no database
verdict**. Retry on a known-good disposable cluster after the main release battery frees RAM. The
candidate still needs actual PostgreSQL status/return proof, backup-schema, the complete WP8 battery,
production build, visual and three-locale review, classic parity and independent bridge/controller
review. The root owns the integration and release decision; this checkpoint is not a LIVE claim.

### §5o · Reference-unique S9 release candidate (2026-10-15)

This section supersedes §5n's unresolved reference-index and local-PostgreSQL-runtime notes. The S9
candidate remains an isolated branch, not a production deployment. A SELECT-only preflight on the Railway
production proxy at 2026-10-15 11:09:44 UTC found **zero** duplicate non-null `providerRef` groups, zero
extra rows and zero cross-provider groups. Only the non-unique `Transaction_providerRef_idx` was installed.
`npm run qa:provider-ref-uniqueness` repeats the read-only scan without printing connection details; it
must be rerun immediately before migration. Webhook, signed return and reconciliation reads all select
by **bare reference**, so `prisma/migrations/20261015111500_provider_ref_global_unique/migration.sql`
installs one global unique index for non-null references. Prisma schema now declares `providerRef @unique`;
null internal/unreferenced transactions remain valid. The migration explicitly wraps `SET LOCAL`, the
unique-index statement and `COMMIT` in one PostgreSQL transaction, so its 3-second lock timeout makes
a busy live migration fail visibly rather than wait indefinitely on money writes. No speculative
provider-scoped identity is used.

The writer audit covered deposit pre-dispatch correlation and post-dispatch adapter references; ordinary and
AML-approved payout post-dispatch references; inside-money-transaction deposit settlement; officer reconcile
match/writeoff; the one fixed-ID demo deposit; agent registration fee and refund creates; and the null-ref
market, bonus and development fixtures. The prior deposit pre-dispatch write was best effort even though a
Prisma update outside a transaction returns `null` on error. It now refuses provider dispatch unless the
exact reference was saved. Every post-dispatch reference write and officer match/writeoff checks the exact
returned row before reporting success; a write failure keeps the payment or payout pending for review and
never releases held money. The writeoff sentinel is transaction-specific (`WRITEOFF-${txnId}`), so one
officer can write off multiple rows. Agent fee/refund prefixes differ and their creates are inside money
transactions, where uniqueness errors roll the money change back. The demo fixture has one fixed transaction
ID and therefore one reference row. The memory-only duplicate-reference controls remain as defense against
malformed legacy state; PostgreSQL fixtures now prove the database rejects such rows.

Disposable PostgreSQL 18.3 in this checkout, port 5452: all **104** migrations applied; backup/restore
schema gate **13/13**, including **127** unique indexes. Deposit persistence **38/38**, including actual
same-provider and cross-provider insert collisions, a failed update returning null with its old row intact,
and multiple null references. Signed status **156/156**; private recheck **146/146** and actual-PG rollback
plants **2/2**; background settlement **148/148** and actual-PG rollback plants **5/5**. The scratch cluster
stopped after each run. Typecheck, doc links (730), Vodacom plan and orphan reachability passed. Memory
signed status **177/177**, focused provider-reference **27/27**, and its two red plants **2/2**: a failed
pre-dispatch write allowed **zero** provider calls, while a failed returned-reference write left the
dispatched deposit PROCESSING without credit. These proofs cover reference identity, writer failure and
money settlement; they do not claim a live provider payment, a browser visual pass, or production rollout.

Before integration: rerun the read-only production preflight, then run the full WP8 gate and local/browser
release review on the exact integrated tip. After the
root-controlled deployment, repeat production read-back and owner-visible visual and logical checks.

### §5p · Dispatch recovery and Card checkout hold (2026-10-15)

The next isolated S9 checkpoint repairs three release findings. Every deposit form must submit its original
UUID before dispatch, including the classic form. If an accepted provider order cannot save its returned
reference, `deposit()` reports `recoveryRequired` with the reserved transaction id; the action takes the
owner to the funding-key waiting page before any error redirect can mint another UUID. A replay of a still
processing order also enters owned recovery. A dispatch-time failure claims FAILED only under the same wallet
lock as confirmation, after checking the fresh PROCESSING row and original reference. A confirmed callback
that won the lock remains CONFIRMED and credited.

Card checkout recovery remains held on `codex/s9-card-held`. The current
[Selcom Checkout API reference](https://developers.selcommobile.com/) shows the
`payment_gateway_url` only on create-order and gives an example.com placeholder;
its read-only order-status and list-orders responses do not include the URL. Repository
fixtures are not evidence of the production redirect host. The core release therefore
has no Card URL column, resume route or checkout continuation button. A first Card
response can still redirect the buyer as before; a lost redirect stays on the owned
status/review path and must not create a second order. A controlled Selcom response
or written provider confirmation of the host is required before promoting the held branch.

Focused memory proof on the held checkpoint: typecheck, deposit replay **57/57** with **17/17** red plants,
provider-reference **30/30** with **3/3** red plants, and deposit-return **28/28** including its ambiguity
plant. The race test runs the signed CONFIRMED callback between provider dispatch and the synchronous
failure arm, then checks one credit, CONFIRMED status and no failure audit. The core branch must rerun
these proofs without the held Card capability and then complete the PostgreSQL/browser release gates.

### §5q · Admin deposit retry authority and idempotency (2026-10-15)

The single-row and bulk admin actions now share `retryFailedDepositFromAdmin`. They may request a second
collection only for a FAILED, non-house TZS mobile-money deposit whose original provider reference still
uniquely identifies it, whose funding identity is valid, and whose `providerStatus` is exactly
`deposit-provider-final-failed:v1`. That marker is written in the same wallet-locked transaction as FAILED
only when the verified callback or authoritative order-status re-query reports FAILED. A synchronous
dispatch refusal, mock timeout, text description or legacy FAILED row does not prove a provider-negative
result. Such rows stay FAILED, gain a durable review note and audit, and have no Retry/Cancel buttons in
the admin queue. Admin Cancel rechecks the same marker under the wallet lock; withdrawals retain their
existing path. Card cannot be retried by an officer without the buyer's hosted-checkout context.

An eligible retry derives one bounded key from the original transaction id. Both admin paths use that
key; a lost response, repeat click and concurrent bulk/single action recover the same child row and never
send another provider order for that original. The original moves to CANCELLED only after a matching child
is found and its failure authority is rechecked under the wallet lock. A contradictory CONFIRMED callback
for an old FAILED or CANCELLED deposit records a durable terminal review without crediting or hiding it.
Provider-side contradictory final answers still require an officer money decision; no automatic debit or
second credit is introduced here.

The pre-dispatch wallet lock also writes `deposit-admin-retry-claimed:v1` to the existing `providerStatus`
column before releasing the lock for provider I/O. Cancel therefore cannot close the original during the
gap before child reservation. A repeat retry on a claimed row uses only the same deterministic child key;
the admin queue labels that row "Retry unresolved", offers "Check retry", and omits Cancel. The two
child lookups inside that wallet lock use its same PostgreSQL transaction, avoiding a second connection
and preserving the lock's read context. This marker
needs no schema change or backfill. It is reached only from an exact verified-negative marker, so old
FAILED and terminal-review rows remain locked out. A process failure before child reservation leaves the
claim recoverable through the same key. A reserved child lacking its pre-dispatch provider reference is
not accepted as a replacement collection: the original stays FAILED with a durable review marker and
no further automatic provider call.

### §5r · Existing Selcom rail evidence and core proof (2026-10-15)

The existing mobile-money code path is `wallet-service.deposit` → `dispatchDeposit` → the runtime-selected
`selcomAdapter.deposit` → `selcomDeposit`, which creates a minimal checkout order and sends a
`/checkout/wallet-payment` request. The withdrawal path is `wallet-service.withdraw` →
`dispatchWithdrawal` → `selcomAdapter.withdraw` → the payout ladder and `selcomPayout`. Accepted or
ambiguous sends remain pending until a signed order-status or the payout rail's status query supplies
settlement authority. The webhook uses the stored global provider reference to find the row and queries
Selcom again before settlement; a payout callback also requires a valid signature.

Read-only Railway production inventory on 2026-10-15 showed the `50pick` service deployed successfully
(latest deployment created 12:28:51 UTC) and the configured variable **names**
`PAYMENT_AGGREGATOR`, `PAYMENT_API_URL`, `PAYMENT_API_KEY`, `PAYMENT_API_SECRET`,
`PAYMENT_VENDOR_ID`, `PAYMENT_VENDOR_PIN`, `PAYMENT_WEBHOOK_URL` and `SELCOM_WEBHOOK_SECRET`.
The connector redacted their values; none were printed or changed. A bounded runtime-log sample filtered
for Selcom showed three Wallet Cashin **accepted** responses on 2026-10-11 and 2026-10-13, plus a
wallet-payment event on 2026-10-12. Acceptance establishes that the existing payout path reached
Selcom, not that a recipient received a final payout. Ali reports that deposits and withdrawals work;
this read-only check did not create an order or independently assert a final deposit settlement.

None of that supplies a Card `payment_gateway_url` host. That URL is returned only by Card create-order
in the published Checkout API shape; the read-only order-status/list-orders responses omit it. Card
recovery remains held on `codex/s9-card-held` until a controlled response or provider confirmation
establishes the exact redirect host. The releasable core has no Card URL persistence or resume button.

The core admin gate passed **15/15 memory controls**, including a deliberate legacy-gate mutation that
would send a second collection and a child-read transaction check. The prior checkpoint passed **13/13
disposable PostgreSQL controls** after all **104** migrations; repeat that PG proof on the tx-aware
follow-up tip before integration.
These include Cancel-versus-Retry overlap before child reservation and recovery of a claimed row after a
lost process answer, plus a pre-dispatch child with no reference. A repeat SELECT-only production preflight at **12:52:50 UTC** found zero duplicate
non-null provider-reference groups or excess rows, and only the prior non-unique reference index. Re-run
that preflight immediately before deployment because later payment rows can change the data.
The surrounding signed deposit-status suite passed **182/182 memory** and **161/161 PostgreSQL**;
the latter includes an answer-lost review rollback and the new authoritative failure marker. The
deposit-return suite passed **27/27 memory**; typecheck passed. Every PostgreSQL run used this
checkout's loopback port 5452 and stopped its cluster. Integration still needs the exact-tip WP8,
browser and production-readback gates. No S9 core or Card release is claimed by this branch.
