# S14 local adversarial refute and S15 gate census — 2026-10-15

This is a **local disposable mock-rail** record. It does not prove a production
payment, a signed provider callback, the agency's decision, or the S15 public
flip. The source under test is the integrated S8–S13 candidate plus the S14
test additions through `206d4c7c0ed45020014d2de35ba57c862b1a89fa` on
`codex/broad-source-fixes-1015`; the final integrated release
must rerun these checks at its own exact SHA. No credentials, phone numbers,
transaction references, or screenshots with personal data are in this file.

## Local setup and observed money outcomes

`e2e:journey` refused any non-local host, configured database, or real rail. It
ran on `http://localhost:3051` with `DATABASE_URL` absent,
`PAYMENT_AGGREGATOR=mock`, `PAYMENTS_DEMO_ASYNC=false`,
`EMAIL_OUTBOX_CAPTURE=1`, `DISABLE_ADMIN_TOTP=true`, and
`NEXT_PUBLIC_APP_URL=http://localhost:3051`. Its preflight read
`/api/health.database.configured=false`, `simpleJourney.state=STAFF_PREVIEW`,
and the actual Mock selection in the admin payment control plane. It used a
staff-minted preview pass and synthetic accounts. The browser read positions
and `BET_PLACED` ledger rows from the server, rather than inferring them from
the visible receipt.

| Adversarial path | Local observation and limit |
| --- | --- |
| Guest choice and insufficient balance | Registration restored the chosen sheet. At zero spendable TZS the short-balance path had **0 positions / 0 `BET_PLACED` rows**. The deposit UI carried the selected bet and offered the TZS 1,000 funding minimum. |
| Confirmed mock payment | Exactly TZS 1,000 was credited; the waiting screen explicitly said no bet was placed. Before the player's separate press: **0 / 0** and zero bet action requests. One explicit TZS 500 press then made **1 position / 1 `BET_PLACED` row** and one bet action request. |
| Repeated funding action and status read | Reloading waiting and replaying the captured identical deposit action/key kept balance TZS 1,000 and **0 / 0** before the manual bet. `test:deposit-replay` passed 50/50, and its red twin caught 15/15 planted defects. |
| Repeated confirmed callback with a saved bet | `test:payments` settled the same provider reference twice: balance moved from 0 to TZS 50,000 once; pending, confirmed, and duplicate callback each left **0 positions / 0 `BET_PLACED` rows**. This is an in-process mock callback, not a signed external provider delivery. |
| Failed payment/callback | The browser mock decline returned `FAILED`, balance TZS 0, **0 / 0**. A separate failed webhook carrying a saved bet also left **0 / 0** and did not credit a second deposit. |
| Pending payment and early return | The async mock stayed `PENDING`, balance TZS 0, **0 / 0** across waiting reload. Following the saved choice before confirmation did not create a bet or make pending money spendable. |
| Altered market, side, or stake | `test:deposit-return` refuses deposit-return attribution when any of the three differs from the owned paid intent; a foreign, failed, expired, or house stake is also refused. This is an **attribution** rule: a later legal manual bet is not forbidden merely because its quote differs, but it cannot claim that deposit's return. The pure cases do not themselves write a position or ledger row. |
| Stale or forged pending marker | `test:pending-bet` rejects a marker at 24 hours, a future timestamp, malformed content, or a different side/stake as authority to prefill a stake. The browser's pending path separately observed **0 / 0**. |

Targeted runs on this isolated checkout: `e2e:journey` (result recorded below),
`test:payments` **81/0**, `test:deposit-return` **30/0**,
`red:deposit-return` **33/0**, `test:pending-bet` all checks passed,
`red:pending-bet` **22/22 mutants caught**, `test:deposit-replay`
**50/50**, `red:deposit-replay` **15/15 plants caught**,
`test:bet-admission` **32/0**, and `test:shortfall` all checks passed. The webhook
test's extra four assertions require an intent to be stored on the transaction,
then check the position store and actual `BET_PLACED` rows after pending,
confirmed, duplicate, and failed callbacks. `red:payment-background` also
caught **24/24** mutations on the integrated S8–S13 source checkpoint.

Browser result: `e2e:journey` **43/0** on 2026-10-15 from
17:20:32 to 17:21:20 UTC. It verified the early return restored the editable
choice with zero bet actions, while the payment stayed `PENDING`, balance TZS 0,
and positions/`BET_PLACED` rows **0 / 0**. The screenshots and synthetic IDs remain in the ignored local
`.qa-shots/simple-journey/e2e/` directory. The full browser drive still needs
to run on the final integrated SHA and on PostgreSQL as required by the plan.

## S15 predeploy gate census

The source review covered `predeploy` in `package.json`, its `qa:live` driver,
the named journey/classic browser drives, and the flip-specific tests named by
`VODACOM-PLAN.md` §5. These are the assertions whose **current expected
answer** depends on `STAFF_PREVIEW`, a classic no-pass viewer, or a classic dial.
The engineering owner for every rewrite below is the **S15 Codex integration
lane**; **Ali** is the release owner who reviews the final gate report and gives
the separate S15 go. The `qa:live` part of the first three rows has a local
dual-mode checkpoint; the other rewrites and production sign-off remain open.

| Current guard and assumption | Required S15 replacement assertion | Owner |
| --- | --- | --- |
| `qa:live` (`scripts/pre-deploy-live-check.mjs`) [E2]: no preview marker/journey shell on signed-out `/` and `/markets`, `/account` not found, classic `/markets` grid; it skips these under `ACTIVE`. | Branch on the health rollout. Under `ACTIVE`, positively read journey home, question route, account hub, four tabs, and **no** preview marker for signed-out and signed-in viewers. Keep classic absence checks in a separate local preview/rollback control. A skip cannot count as the active proof. | S15 Codex |
| `qa:live` [E3] and its demo player: signed-in no-pass player sees classic shell short of `ACTIVE`; it skips at `ACTIVE`. | Sign in the QA player under `ACTIVE`, assert the journey shell and account/ticket access, no marker, and the same production build identity; retain the no-pass classic check in local `STAFF_PREVIEW`. | S15 Codex |
| `qa:live` browser bet drive, `live-place-bet.mjs`, and `live-rg-break.mjs`: `.mcardp`, `?side=`, locked dial, `Place YES/NO`, slider and confirm dialog. | Route by rollout and drive the journey sheet under `ACTIVE`: displayed market/side/stake, low-balance, one explicit press/one ledger row, refusal stays in sheet, and responsible-gambling limits. Keep a classic-mode rollback regression. No real-money drive runs without its separately authorized staff operator. | S15 Codex; Ali for staff proof |
| `qa:classic-shell-parity`: refuses `ACTIVE` and compares a no-pass visitor to the classic baseline. | Retain its classic fixture for rollback on a local `STAFF_PREVIEW` server; add an active no-pass served-markup and browser parity book across the same widths, locales, and viewer states, with journey-only traces and no preview marker. | S15 Codex |
| `qa:bet-sheet-production`: refuses `ACTIVE` and requires both preview-pass journey and no-pass classic cookies. | Accept `ACTIVE` only with a positive no-pass journey identity and the same bet-sheet money/interaction checks; compare classic only on a separate preview/rollback fixture. | S15 Codex |
| `qa:journey-preview` and `qa:journey-updown`: require staff preview and, for Up/Down, a no-pass classic comparison. | Preserve the preview-door/revocation checks on a local preview server. Add active no-pass journey checks with no marker; compare Up/Down math to the engine and a frozen preflip classic fixture, not an assumed live classic page. | S15 Codex |
| `qa:visitor-path` classic H control and `e2e:journey` preflight: H refuses an `ACTIVE` classic no-pass control; `e2e:journey` requires `STAFF_PREVIEW` to mint the pass. | Split local classic rollback control from the `ACTIVE` flow. On the active server, enter without a preview cookie, preserve choice through signup/deposit, and prove pending/failure/replay/one manual bet with position and ledger reads. | S15 Codex |
| `test:one-sided`, `test:rate-copy`, and landing-ten-plan V15/V16/V19/V22-negative/V25/V26: current classic card, estimate, dial, deposit coin, and rail expectations. | Re-pin the active card's qualified `≈` estimate, sheet-only exact payout decision, no centre deposit coin, one reachable Deposit per non-inert region, and four tabs, with in-process red mutants. Keep `test:dial-stake` as a shelved classic regression until S16. | S15 Codex |
| `test:simple-journey-flag`, `test:markets-redirect`, `test:post-register-landing`, `test:flip-copy`, `test:privacy-notice`, `test:journey-home`, `test:journey-shell`: current switch/copy/route/privacy checks include the staff-preview split. | Pin the shipped `ACTIVE` ceiling and no-pass route table; re-point bare `/markets` links, converge action keys, version Terms/Rules/Privacy on the publication date, and assert active home/shell without a preview marker. Keep `WITHDRAWN` rollback and `STAFF_PREVIEW` pass controls. Run their red twins where supplied. | S15 Codex |

### Local `qa:live` two-state control

`scripts/pre-deploy-live-check.mjs` now branches on the health rollout for its
public and signed-in pages. `STAFF_PREVIEW` still tests the classic no-pass
viewer and a pass-holder positive control. `ACTIVE` positively reads the
journey home, first linked question, four tabs, `/updown`, `/live`, `/results`,
`/account`, and the signed-in ticket and watchlist pages; it checks the marker
is absent in served bytes and hydrated DOM, and drives `/markets` as a browser
document to prove the real 307 to `/`. Its local ACTIVE bet drive is confined
to an in-memory server and measures the owner-scoped position and `BET_PLACED`
ledger counts before and after one explicit sheet press. The local focused
switch `QA_LIVE_ROLLOUT_ONLY=1` omits sections [A]-[E] and prints that it is
not a full predeploy result.

On the isolated 2026-10-15 local server, the focused `STAFF_PREVIEW` control
passed **102/0** and the focused `ACTIVE` control passed **93/0**. The ACTIVE
press was TZS 500 against a synthetic demo balance: zero new positions/ledger
rows before the press and exactly one of each afterward. This is local mock
evidence, not a production payment or approval. The ACTIVE low-balance,
inline-refusal, and responsible-gambling browser drives in the third row are
still separate S15 work; this `qa:live` press does not replace them. The full
`qa:live` run on the same warm local ACTIVE server passed **381/0**. Its first
cold-cache attempt timed out on `/live` in the unchanged public sweep under
machine contention, so the driver now warms `/live` and `/results` and allows
90 seconds per public navigation. The remaining rows above and the full gate
on the final S15 SHA still need proof.

Stable money and access guards remain required on the flip commit:
`test:payments`, `test:deposit-replay`, `test:deposit-return`,
`test:deposit-status-read`, `test:bet-admission`, `test:money-invariants`,
`test:pending-bet`, `test:journey-sheet`, `test:rg-*`,
`test:withdrawn-features`, `test:deploy-skew`, and the house-bot gates.
`predeploy` plus the production read-back must be run after the rewrites on the
exact S15 SHA. This census does not waive any open `vodacom-s14-evidence.json`
entry or turn an `ACTIVE` skip into a pass.
