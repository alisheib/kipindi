STATUS: 🟢 **LAW** — the program that finishes 50pick. Written 2026-07-31 from a full survey of
the live codebase, not from memory. [`NEXT-PLAN.md`](NEXT-PLAN.md) remains the live plan for
**launch hardening**; this document governs **module certification**. Neither supersedes the other.

# 50pick — the Module Certification Program

**In one sentence:** the platform is divided into **52 modules across 12 domains**; each is taken
to a state where its functionality, its visuals, its money-safety and its behaviour under
deliberate abuse are *proven by a re-runnable gate*; and once certified a module is **never
re-audited**, because a named guard now fails if it regresses.

## Why this exists

50pick is feature-complete, live at `www.50pick.tz` in TEST money mode, and passes 112 named
suites. And yet, in the two days before this document was written, this repo found:

- a nightly backup workflow reporting **every step green** while **nothing had ever gone
  off-box** — `| tee` swallowed the upload's exit code;
- an `/admin/compliance` card displaying a hardcoded green tick for backups that did not exist,
  beside a real card, borrowing its credibility;
- a contrast audit that hardcoded the token values it was meant to check, hiding a real AA
  failure;
- a payout probe reporting `USABLE RAILS: NONE — disbursement is not provisioned` about a **live,
  working** vendor account;
- and, while building this program's first guard, an unguarded HTTP handler in a route that
  disarms the brute-force defence.

Every one was found by looking at the artifact, not the code. **The problem is not too little
testing. It is green gates guarding nothing.** So:

> 🔴 **An audit that does not end in a re-runnable guard did not happen.** It is a memory, and
> memories expire silently.

---

## 1 · The standard — what "0 flaws" means here

A module is **CERTIFIED** only when all eight gates pass, each behind a **named `npm run` script
a future session can re-run in one command.**

| | Gate | Passes when |
|---|---|---|
| **G1** | **FUNCTIONAL** | Every path a real user can take is driven end-to-end against a running app — not unit-mocked. **Including every failure path.** |
| **G2** | **VISUAL** | Every surface captured at all breakpoints × 3 locales (en/sw/zh) × dark and light. Zero horizontal overflow, zero clipped text, zero off-screen controls. **Inspected, not merely captured.** |
| **G3** | **ADVERSARIAL** | The module has been actively attacked: tampered payloads, replayed requests, forged identity, out-of-order state, concurrent races, hostile input. It refused all of it. |
| **G4** | **MONEY-SAFETY** | *(💰 modules.)* `test:money-invariants` `test:trial-balance` `test:concurrency` green, plus a module-specific invariant. No path can mint, lose or double-spend. |
| **G5** | **I18N** | en/sw/zh complete. No hardcoded user-facing string. `test:i18n` green. |
| **G6** | **MEASURE + A11Y** | AA contrast on **rendered pixels**, touch targets ≥ 44 px, correct width tier, keyboard-reachable, labelled for screen readers. |
| **G7** | **RESILIENCE** | Correct when its dependencies fail: DB down, Redis down, Selcom `403`/`999`/timeout, Claude API refusing, email bouncing, process restarted mid-operation. |
| **G8** | **TRUTH** | 🔴 **No surface states anything false.** Every number, badge, tick and status reflects real state. Every doc naming this module matches the code. |

### Three meta-rules

1. 🔴 **Every gate lands in `package.json` or it does not count.** 145 files in `scripts/` are
   run by nothing — see §6.
2. 🔴 **Every negative assertion must be broken on purpose and observed to go red.** A guard that
   has never failed is a guard nobody has tested. Record the proof in the commit.
3. 🔴 **Check the artifact the user receives.** The rendered pixel, the delivered email, the bytes
   on the wire, the row in the database — not the code that is supposed to produce them.

### Gate naming — this is not cosmetic

`scripts/test-all.mjs:44` builds its suite list from **every `test:*` key in `package.json`**. A
gate named `cert:a1` would sit *outside* the safety net, reintroducing the very orphan problem
this program exists to kill. Therefore:

| Prefix | For | Joins `test:all`? |
|---|---|---|
| `test:cert-<id>` | Headless assertions | ✅ automatically |
| `qa:cert-<id>` | Browser / visual / a11y gates (needs a server on `:3000`) | ❌ by design — `test:all` documents `--skip` for this class |
| `cert:<id>` | Thin per-module aggregator running both | ❌ it is the human entry point |

---

## 2 · Where we are now — verified 2026-07-31

| | |
|---|---|
| Live | `www.50pick.tz`, Railway `50pick`/`production`, money mode **TEST** |
| Pages | **89** |
| API routes | **46** — of which **36** are dev-harness (`dev-test/` × 35, `dev/` × 1) |
| Server modules | **120** files; largest `market-service.ts` **2,813 L**, `prisma-dal.ts` 1,627 L, `wallet-service.ts` 1,463 L |
| Components | **169** `.tsx` across 17 directories |
| Prisma | **45 models, 37 enums** |
| Suites run by `test:all` | **112** (plus `e2e:*` and `qa:*` outside it) |
| `scripts/` | **286** files — **141 reachable, 145 declared orphans** |
| Modules certified | **0 of 52** |

**Verified green:** 108 of the pre-existing suites (2026-07-31), plus the two Wave 0 gates below.
`test:responsive` remains **unverified** — it is thousands of browser page loads and needs a
production build; against a dev server it ran 40+ minutes without finishing.

### Wave 0 — already built and proven, in the same pass as this document

**`npm run test:cert-devroutes`** — 110 assertions over 36 route files. Fails unless **every
exported HTTP handler** under `api/dev-test/` and `api/dev/` refuses in production, *before its
first `await`*. These endpoints credit wallets, promote admins, disarm rate limits and move a
live market's clock; one reachable in production is simultaneously money-minting and privilege
escalation on a licensed platform.

Two things it found about its own first draft, both worth keeping:

- Checking the **file** rather than each handler produced **13 false failures** — `indexOf("await")`
  matched awaits inside helper functions declared *above* the handler. It now slices per handler.
- More importantly, the file-level check was **too lenient**: `reset-rate-limits` exports both
  `POST` and `GET`, and a single guarded handler satisfied the whole file. Per-handler checking
  surfaced it. (That one turned out safe — `GET` delegates to the guarded `POST` — so the gate now
  resolves one hop of delegation rather than forcing redundant checks into product code.)

Proven red by adding an unguarded route and watching it fail; green again on removal.

**`npm run test:orphans`** — fails on any file in `scripts/` that no `package.json` script runs
and that is not in `scripts/orphan-allowlist.json`. Seeded at **145**. It refuses to re-seed, so
nobody can bury new orphans by regenerating the baseline. Proven red three ways: a new orphan, a
stale allowlist entry, and an unparseable allowlist.

### Four findings that shape the whole program

1. 🔴 **145 declared orphans (51% of `scripts/`).** They are not junk — they include
   `break-it-player.mjs`, `break-it-admin.mjs`, `fuzz-malformed-payloads.mjs`,
   `betting-abuse-resistance-e2e.mjs`, `stress-regulator-grade.mjs`, `app-monkey-e2e.mjs`,
   `axe-audit.mjs`, seven dial-stress suites, six affiliate and five proposals sprint suites.
   **That is precisely the adversarial work G3 demands, already written, and nothing runs it.**
2. 🔴 **The dev-route gate existed only as a convention** repeated 35 times. Now enforced.
3. ⚠️ **`market-service.ts` is 2,813 lines on the money path.** Size is not a defect, but it is
   where G3 and G4 must be hardest.
4. ⚠️ **An unmerged 28-commit branch** (`feat/updown-source-pinning-and-proposals`) fixes a real
   money bug in **J1**. Certifying J1 first would certify the bug.

---

## 3 · The module map

**52 modules, 12 domains.** 💰 marks a module where money can be created, destroyed or moved.

| Domain | Modules |
|---|---|
| **A · Identity & Access** | A1 Registration & onboarding · A2 Login & sessions · A3 Password recovery · A4 OTP & SMS · A5 Player 2FA · A6 Admin TOTP & backup codes |
| **B · Authorization** | B1 Roles & domain grants · B2 Staff management · B3 Two-officer control |
| **C · Communications** | C1 Email delivery & templates · C2 Email verification & suppression · C3 Notifications, devices & push · C4 Realtime SSE & ticker |
| **D · Verification & Media** | D1 KYC submissions · D2 KYC documents · D3 Source of Funds · D4 Upload & R2 storage |
| **E · Money In** 💰 | E1 Wallet & balances · E2 Deposits · E3 Payment webhooks & reconciliation |
| **F · Money Out** 💰 | F1 Payouts, rails & the ladder · F2 Cash-out & withdrawal locks |
| **G · Accounting** 💰 | G1 Ledger & double-entry · G2 Trial balance & integrity · G3 House pool & fee model · G4 Audit chain |
| **H · Markets & Betting** 💰 | H1 Market creation & config · H2 Candidates pipeline · H3 Scheduling & lifecycle ticker · H4 Bet placement, dial & admission · H5 Positions & cash-out · H6 Resolution & settlement · H7 Sentinel & resolution policy |
| **I · AI** | I1 Poll generation · I2 Trusted-source registry · I3 AI resolution & oracle · I4 Chatbot & spend controls |
| **J · Products & Social** | J1 Up & Down 💰 · J2 Bonus wallet & cashback 💰 · J3 Invites & campaigns · J4 Affiliates & referrals 💰 · J5 Proposals & voting 💰 · J6 Comments & moderation · J7 Leaderboard & achievements · J8 Watchlist |
| **K · Compliance & Reporting** | K1 Responsible gambling & limits 💰 · K2 Self-exclusion & cooling-off · K3 AML, fraud flags & match integrity · K4 Privacy, data rights & retention · K5 Reporting & exports · K6 Events calendar · K7 Insights, cohorts & retention |
| **L · Platform** | L1 Admin console shell & nav · L2 System config & feature flags · L3 Ops: lifecycle, health, monitoring · L4 Backups & disaster recovery · L5 Rate limiting, Redis & resilience · L6 Design system, i18n, responsive, search, PWA |

---

## 4 · The dossiers

Attack-list items are **not hypotheticals.** Each is a specific way this module can be wrong,
given how it is built. Add to them; do not stop at them.

## A · Identity & Access

### A1 · Registration & onboarding — `cert:a1`
**Surfaces** `auth/register`, `components/onboarding` · **Owns** `auth-service` `validators` `password-policy` `crypto`
**Existing** `test:auth-email-integrity` (partial)
**Attack** Enumerate registered phones/emails via response body, status code **and timing** — the sibling AWARKEH repo shipped this bug twice · register a duplicate under a normalised variant (`+255…` vs `0…` vs spaces) · register a phone mid-OTP for another account · 🔴 **pending registrations are dropped on every deploy** (`auth-service.ts:149`) — a player mid-signup during a deploy is stranded; is that visible to them or silent? · password policy bypass via unicode/whitespace-only · mass-signup rate limiting.
**Exit** Enumeration-neutral *proven by timing distribution*, phone normalisation canonical and collision-free, deploy-stranded signup either survives or tells the player.

### A2 · Login & sessions — `cert:a2`
**Surfaces** `auth/login` `auth/admin` `profile/sessions` · **Owns** `session` `session-registry` `store`
**Existing** none named specifically — 🔴 **login has no dedicated gate**
**Attack** Forge a session cookie · replay a revoked one · use a session after logout elsewhere (durable single-session via `ActiveSession`) · race two logins for the same user · fixation: does the ID rotate on login? · does an admin session survive a role revocation? · 🔴 a P0 login outage already happened once (advisory lock shipped broken, `c3f2a31`) — the raw-SQL bigint trap is prod-only because dev is in-memory.
**Exit** `test:cert-a2` created, single-session enforced under a race, session ID rotates, revocation immediate.

### A3 · Password recovery — `cert:a3`
**Surfaces** `auth/forgot-password` `auth/reset-password` · **Owns** `password-reset`
**Attack** Reuse a token · use it after expiry · use one account's token on another · leak it via `Referer` or a redirect · enumerate accounts through the forgot-password response · request-flood a victim · does a reset invalidate every existing session?
**Exit** Single-use, time-bound, account-bound tokens; reset kills all sessions; enumeration-neutral.

### A4 · OTP & SMS — `cert:a4`
**Surfaces** `auth/otp` · **Owns** `sms` (`Otp` model)
**Attack** Brute-force the code (what is the attempt ceiling, and is it per-code or per-account?) · replay after use · reuse across accounts · race two verifications · request-flood for cost (SMS is billed) · 🔴 **`auth-service.ts:170` passes a `"SW"` literal** — OTP SMS is hardcoded Swahili for every player regardless of locale (G5 failure) · does a suppressed/failed send tell the player, or hang?
**Exit** Attempt ceiling proven, replay impossible, OTP localised, send failure surfaced.

### A5 · Player 2FA — `cert:a5`
**Surfaces** `auth/2fa` `profile/security` · **Owns** `player-2fa` `totp` `backup-codes`
**Existing** `test:2fa` `test:totp-enc`
**Attack** Reuse a TOTP code inside its window · accept a code from the previous/next window beyond tolerance · reuse a backup code · use one after regeneration · enumerate codes · bypass 2FA by going straight to a post-auth route · is the secret encrypted at rest (`test:totp-enc` says yes — try to break it)?
**Exit** Codes single-use, no post-auth route reachable without the second factor.

### A6 · Admin TOTP & backup codes — `cert:a6` 🔴 **Wave 1**
**Surfaces** `admin/2fa/setup` `admin/totp-verify` · **Owns** `totp` `totp-cookie` `admin-guard`
**Attack** 🔴 **`DISABLE_ADMIN_TOTP` is SET in production — admin 2FA is OFF.** Certification ends
with it ON. **Do not simply unset it:** prove an admin is enrolled first, or the flip locks Ali out
of his own console. · reach an admin route with a valid session but no TOTP cookie · forge the TOTP
cookie · downgrade to a staff role to skip it.
**Exit** TOTP mandatory in production **enforced by code**, enrolment proven before the flip, no
admin surface reachable without it.

## B · Authorization

### B1 · Roles & domain grants — `cert:b1`
**Surfaces** `admin/roles` · **Owns** `rbac` `roles` `rbac-guard` (`RoleDomainGrant`, `AdminDomain`)
**Existing** `test:rbac` `test:admin-roles`
**Attack** Reach an out-of-domain admin action by direct URL, by API, by a stale session issued
before a grant change · escalate via a grant on one domain · confirm every one of the 89 pages
enforces server-side, not just hidden in nav (`test:admin-nav` covers nav — nav is not a control).
**Exit** Every admin surface server-enforced, grant revocation immediate.

### B2 · Staff management — `cert:b2`
**Surfaces** `admin/staff` `admin/staff/[id]` · **Owns** `staff-roles` `actor-label`
**Existing** `test:staff-role`
**Attack** Self-promotion · promote above own level · delete the last admin · edit own permissions ·
is every staff mutation audited with a real actor (not "system")?
**Exit** No self-escalation, last-admin protected, every mutation attributable.

### B3 · Two-officer control — `cert:b3`
**Owns** `two-officer` · **Existing** `test:two-admin` `test:officer-conflict`
**Attack** Satisfy both officers as one human via two sessions, two browsers, a role swap, or an
API replay · approve one's own request · does the second approval revalidate the first officer still
holds the role?
**Exit** Un-defeatable by one human, proven adversarially rather than by construction.

## C · Communications

### C1 · Email delivery & templates — `cert:c1`
**Owns** `email` (1,286 L) `email-map` `EMAIL-SIGNATURES` · **Existing** `test:auth-email` `test:email-stress`
**Attack** **Render and read every template in all 3 locales** — subject, preheader, links, images
(signature images are hosted on the domain; do they load from a mail client?) · a token in a URL that
gets logged · HTML injection via a player-supplied name · what happens when Postmark is down mid-send?
**Exit** Every template proven against a real delivery in 3 locales, no injection, send failure handled.

### C2 · Email verification & suppression — `cert:c2`
**Surfaces** `auth/verify-email` · **Owns** `email-verification` `email-suppression` + `webhooks/postmark`
**Existing** `test:auth-email-integrity` `test:webhook-sec` (partial)
**Attack** 🔴 **Forge a bounce for a victim's address** — can an attacker suppress someone else's
mail, silently blocking their OTP and locking them out? · unsigned or replayed webhook · verification
link reuse, expiry, cross-account · does suppression surface to the player or fail silently?
**Exit** Webhook signature enforced, suppression un-weaponisable, suppressed state visible.

### C3 · Notifications, devices & push — `cert:c3`
**Surfaces** `profile/notifications`, the bell · **Owns** `notification-service` (921 L) `push-service` (`Device`, `PushSubscription`)
**Existing** `test:push` `test:deposit-notifications`
**Attack** Receive another player's notification · subscribe to someone else's stream · a
notification for a voided market · ordering under a settlement burst · 🔴 **relative timestamps in
the bell are English-only** (G5) · PII in a push payload (it leaves the box) · a stale
`PushSubscription` after device loss.
**Exit** No cross-player leak, no PII in push, timestamps localised.

### C4 · Realtime SSE & ticker — `cert:c4`
**Owns** `event-bus` `ticker-feed` · **Existing** `test:events`
**Attack** 🔴 **Measured ceiling ~125 concurrent clients** (`setMaxListeners(500)`, 4 listeners
each) on a product whose pitch is live odds. **Measure the real ceiling and state the new number.**
· 🔴 **SSE payloads carry stale English** (`event-bus.ts:37`) · does a client leak a listener on
disconnect? · reconnect storm after a deploy.
**Exit** Ceiling measured and stated, payloads locale-correct, no listener leak.

## D · Verification & Media

### D1 · KYC submissions — `cert:d1`
**Surfaces** `profile/kyc` `admin/kyc/[id]` · **Owns** `kyc-service` `kyc-risk` `nida`
**Existing** `test:kyc` · **Orphans to adopt** `kyc-fullflow-e2e.mjs` `kyc-admin-mobile-e2e.mjs`
**Attack** 🔴 **NIDA is a MOCK.** A licensed operator must not imply verification it does not
perform — the product text and `NIDA-POLICY.md` must agree with the code (G8 at its sharpest) ·
resubmit unchanged after rejection and get auto-approved · read another player's submission by ID ·
approve without the required documents · PII in logs, Sentry, audit rows and exports.
**Exit** Product text truthful about NIDA, no cross-player read, zero PII in any sink.

### D2 · KYC documents — `cert:d2`
**Owns** `KycDocument`, `DocType` · **Attack** 🔴 **Documents are base64-in-DB** per the known
architecture gaps — bloats every row and every backup · magic-byte validation: upload a `.exe`
renamed `.jpg`, a 100 MB file, a zip bomb, an SVG carrying script · fetch a document
unauthenticated · does a document survive account deletion (K4 conflict)?
**Exit** Magic-byte + size validation, no unauthenticated fetch, deletion policy consistent with K4.

### D3 · Source of Funds — `cert:d3`
**Surfaces** `profile/source-of-funds` · **Owns** `SourceOfFunds`, `SourceOfFundsReviewStatus`
**Attack** Deposit above the threshold without a SoF review · alter a submitted declaration ·
approve one's own · is the threshold configurable and audited?
**Exit** Threshold enforced server-side, review immutable once submitted, every decision audited.

### D4 · Upload & R2 storage — `cert:d4` 🔴 **no gate exists today**
**Surfaces** `api/admin/kyc-doc` · **Owns** `storage` (R2 `50pick-kyc`, WEUR)
**Attack** Content-type confusion · path traversal in an object key · overwrite another object ·
unbounded size · is any object reachable by unauthenticated URL? · 🔴 **the running app holds the R2
key that also reaches the backup bucket** — one leaked credential reaches both.
**Exit** First gate for this module, validation + limits enforced, no public object, credential
narrowed to a bucket-scoped token.

## E · Money In 💰

### E1 · Wallet & balances — `cert:e1`
**Surfaces** `wallet` `wallet/receipt/[id]` · **Owns** `wallet-service` (1,463 L) `user-service`
**Existing** `test:wallet` `test:money-invariants` `test:trial-balance`
**Attack** 🔴 **One production wallet holds TZS 100,000 with no ledger entry, no `Transaction` and
no audit row.** Certification ends with it resolved **and a guard that makes an unaudited balance
mutation impossible** · negative, zero, sub-shilling and `1e308` amounts · a suspended or
self-excluded wallet accepting a mutation · concurrent credit and debit on one wallet.
**Exit** Orphan credit resolved, every balance mutation double-entry + audited, proven by attack.

### E2 · Deposits — `cert:e2`
**Surfaces** `wallet/deposit` `wallet/deposit/return` · **Owns** `payments` `selcom` `payment-control`
**Existing** `test:payments` `test:card-deposit` `test:deposit-gate` `test:payment-control` `e2e:money`
**Attack** Deposit to a suspended / self-excluded / unverified account · deposit during settlement ·
deposit while a withdrawal is in flight · abandon at the provider and return to `/return` anyway ·
double-submit · a provider success for an amount different from the one requested.
**Exit** Gate conditions enforced server-side, amount authoritative from the provider, no
double-credit.

### E3 · Payment webhooks & reconciliation — `cert:e3`
**Surfaces** `webhooks/payments` · **Owns** `payment-ops` `retry` `lifecycle` reconcile
**Existing** `test:webhook-sec` `test:payment-control` `test:payout-observability`
**Attack** Payments are **webhook-authoritative and exactly-once** — try to break it: replay, forge
a signature, reorder, duplicate with a new ID, deliver for an unknown reference, deliver twice
concurrently · 🔴 the mock provider stays synchronous so **dev cannot see this**; drive it against
the real shape · a webhook arriving during a deploy.
**Exit** Exactly-once proven adversarially, not by design; unknown references rejected and audited.

## F · Money Out 💰

### F1 · Payouts, rails & the ladder — `cert:f1` 🔴 **Wave 1**
**Owns** `selcom` (980 L), the fallback ladder · **Existing** `test:selcom` `test:payout-rails` `test:fast-payout` `test:payout-alloc` `test:payout-observability`
### ✅ G8 (TRUTH) — DONE 2026-07-31, `npm run test:cert-f1` (69 assertions)

Withdrawals cannot be paid (Selcom-side). Until this landed, the product **said nothing at all**:
the withdraw form looked entirely normal, a player filled it in, submitted, and got a generic
failure. Now:

- **`src/lib/server/payout-status.ts`** — effective status is `worstOf(officer-declared,
  derived-from-the-queue)`. 🔴 **An officer cannot declare "operational" while payouts are stuck.**
  The flag may only ever make the picture WORSE. That asymmetry is the whole design: a banner an
  officer could force green would be the same defect as `/admin/compliance`'s hardcoded backup
  tick, pointed at players instead of auditors.
- Derived from `txn.search` (indexed, filter in SQL, count from `total`) — **not** `txn.listAll`,
  which the ceilings section below warns about and which this would have called on a player page
  load. "Stuck" reuses `STUCK_PROCESSING_MS` from `txn-filters` rather than defining a second,
  drifting threshold.
- Notice on **withdraw AND deposit**, in en/sw/zh, non-dismissible, `role="alert"`. On deposit it
  renders **above the cashback promo** — an incentive shown before a limitation reads as a lure.
- `unavailable` disables the form **and** `withdrawAction` refuses server-side before touching the
  wallet. A disabled form is a hint; the action is the control.
- Officer control on `/admin/payments`, audited, showing declared vs derived and saying plainly
  when reality has overruled the console.
- Fixed on the way: two **hardcoded English** validation errors on the money path
  (`actions.ts:53,57`) that a Swahili or Chinese player saw in English, and re-typed
  `1000`/`5_000_000` literals now taken from the validators. `SubmitButton` gained the `disabled`
  prop it lacked.
- **Verified in a real browser**, all three locales, notice rendering, zero overflow, submit
  disabled. ⚠️ Locale is the **`kp-locale` cookie**, not `?lang=` — the first attempt used the
  query param and rendered English three times while reporting success.

**Attack (still open for full certification)** · re-attempt a `999` ambiguous payout on a
different rail and prove **one** payment, not two (a real double-pay bug was closed by rail-aware
re-query — try to reopen it) · a refused payout must **return** the money, never freeze it ·
⛔ never "fix" an outage by editing `mnoToSelcomCashin`; the codes are proven correct ·
⛔ `railway ssh`, never `railway run` — see [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md).
**Exit** ~~Honest player-facing messaging in 3 locales~~ ✅, double-pay un-reopenable, every failure
path returns funds.

### F2 · Cash-out & withdrawal locks — `cert:f2`
**Surfaces** `wallet/withdraw` · **Existing** `test:cashout` `test:cashout-lock` `test:withdrawal`
**Attack** Withdraw more than balance · withdraw bonus funds (must be blocked) · withdraw during
settlement · race two withdrawals to double-spend · withdraw to another player's number · withdraw
below the fee floor · cancel and re-request.
**Exit** Lock proven under a race, bonus funds unreachable, no negative balance possible.

## G · Accounting 💰

### G1 · Ledger & double-entry — `cert:g1`
**Owns** `ledger` (658 L) · **Existing** `test:ledger` `test:money-invariants`
**Attack** Find any path that writes one side only — **one already existed** (see E1) · a
transaction with mismatched debit/credit · an entry with no counterparty · deleting or editing an
entry · concurrent settlement + withdrawal on one wallet.
**Exit** Single-sided write impossible by construction and proven by attack.

### G2 · Trial balance & integrity — `cert:g2`
**Surfaces** `admin/finance` `admin/compliance` · **Existing** `test:trial-balance` `test:integrity`
**Attack** 🔴 `trialBalance()` currently reports **`ok: false`, 1 drifting wallet, 100,000 TZS** on
production. Certification resolves it · make the trial balance disagree with the ledger and confirm
it is detected · 🔴 does the admin UI show drift honestly, or round it away?
**Exit** Production trial balance clean, drift surfaced honestly, detection proven.

### G3 · House pool & fee model — `cert:g3`
**Owns** `HousePoolLedger`, `payout.ts` · **Existing** `test:fee-model` `test:loser-share-fee` `test:win-share` `test:payout-alloc`
**Attack** A market where one side has zero stake · a single participant · rounding across many
small stakes (does the pool leak a shilling per settlement?) · a fee that exceeds the pool ·
🟡 **an OPEN owner decision:** [`FEE-MODEL-DECISION.md`](FEE-MODEL-DECISION.md) (2026-07-22) asks
whether to adopt Jay's flat 13%-of-losing-pool basis. **Do not certify G3 while the fee basis is
undecided.**
**Exit** Ali's fee ruling recorded and implemented, zero-shilling leak proven across 10k settlements.

### G4 · Audit chain — `cert:g4`
**Surfaces** `admin/audit` `admin/compliance` · **Owns** `audit` (662 L)
**Existing** `test:audit` `test:integrity` `test:lock-hash`
**Attack** 🔴 **Production reports a BROKEN LINK** (`verifyChainFull().linkBroken`); 1,044 entries
predate the current signing key. **Resolve or formally accept it — a broken chain is a regulator
conversation.** · edit or delete an audit row · re-sign the chain to hide a gap · insert
out-of-sequence · does key rotation preserve verifiability of older entries?
**Exit** Chain state resolved, tampering detected, rotation policy documented and guarded.

## H · Markets & Betting 💰

### H1 · Market creation & config — `cert:h1`
**Surfaces** `admin/markets*` `admin/config` `markets` `markets/[id]` `live` `results` · **Owns** `market-service` (2,813 L) `market-config` `market-dal`
**Existing** `test:markets` `test:config` `test:duration` `test:product-line`
**Attack** Every illegal state transition: resolve twice, reopen a settled market, edit terms after
stakes are placed, change duration mid-round · 🔴 **selection-close time is 3 h wrong and English**
(`positions/page.tsx:241`) — a G5 **and** G8 failure a player sees · untranslated category on every
market card (`market-card.tsx:278`) · board N+1 (`countComments` per card) — measure it · timezone
correctness EAT vs UTC across create/close/settle/display.
**Exit** No illegal transition reachable, times correct and localised, N+1 measured and stated.

### H2 · Candidates pipeline — `cert:h2`
**Surfaces** `admin/candidates` `admin/approvals` · **Owns** `market-candidate` (`CandidateState`)
**Existing** orphan `candidate-pipeline-e2e.mjs` to adopt
**Attack** Promote a candidate twice · skip approval · approve one's own · a candidate referencing a
deleted source · state machine dead ends.
**Exit** Orphan adopted, state machine closed, approval un-skippable.

### H3 · Scheduling & lifecycle ticker — `cert:h3`
**Owns** `market-scheduler` `lifecycle` · **Existing** `test:scheduler` `test:lifecycle-e2e` `test:selection-closed` `test:time` `test:date`
**Attack** 🔴 **A pass > 60 s starts skipping**, guarded by a process-local boolean. Now logged, with
a COMPLIANCE audit after 5 consecutive skips — **the ceiling itself is unchanged.** Measure how long
a pass takes at 10× current volume · a market whose close falls inside a skipped pass · DST/leap
handling · two containers both ticking (see L5).
**Exit** Pass duration measured at projected volume, skip consequences bounded and audited.

### H4 · Bet placement, dial & admission — `cert:h4`
**Surfaces** the dial on `markets/[id]` · **Owns** `admission` `locks` `lock-key`
**Existing** `test:bet-admission` `test:concurrency` `test:bet-retry` `test:late-bet` `test:mixed-flow`
**Orphans to adopt** `stress-mass-concurrent-bets.mjs` + **7 dial suites** (`dial-adversarial`,
`dial-architect-stress`, `dial-clamp-stress`, `dial-exact-stress`, `dial-stress`,
`dial-tri-coordinate`, `place-bet-adversarial`) + `betting-abuse-resistance-e2e.mjs`
**Attack** The proven strength is **200 concurrent bets on one market, 0 TZS leaked** (old ceiling
~9) — **adopt the suite that proves it so the result cannot silently rot** · bet after close to the
millisecond · bet on a resolved market · tamper the odds/side payload · stake above balance,
negative, zero, beyond an RG limit · the **side-locked dial invariant** — try to bet both sides ·
🔴 `admission.ts` keeps state in module scope: **correct only because production runs ONE container.**
**Exit** 200-bet result behind a named gate, no post-close bet accepted, 8 orphans adopted,
container constraint fixed or enforced (L5).

### H5 · Positions & cash-out — `cert:h5`
**Surfaces** `positions` `positions/performance` · **Existing** `test:cashout` `test:history` `test:outcome`
**Attack** Cash out twice · cash out after resolution · cash out during settlement · a position on a
voided market · `positions/page.tsx:50` N+1 · 🔴 **cash-out failure headlines lack codes**
(`market-service.ts:1300,1363`) — the player sees a generic failure for distinct causes.
**Exit** Cash-out exactly-once, failure causes distinguished and localised.

### H6 · Resolution & settlement — `cert:h6`
**Surfaces** `admin/resolver/[id]` `admin/resolver-queue` `admin/settlement` · **Existing** `test:settlement-gate` `test:outcome` `test:emergency` `test:two-admin` `test:officer-conflict`

> ⛔ **CORRECTION, 2026-07-31 — read before touching this.** This dossier originally said
> *"solo-resolve lost its production hard-lock… certification makes it code."* **That was wrong,
> and acting on it would have reversed a dated owner decision.**
>
> `COMPLIANCE-DECISIONS.md` §2026-07-24 ("Single-admin resolution by default; two-admin
> authorization optional; officer-conflict block removed") records Ali's explicit decision that
> single-admin resolution is the **permanent default in all money modes, with NO real-money
> hard-lock**, and that the officer-conflict block is **deleted** from `resolveMarket` and
> `emergencyVoidMarket`. It carries its own **⛔ guardrail**: *do not re-add an officer-conflict
> block or a second place that edits the two-admin flag.* `test:two-admin` asserts
> "simulated-LIVE **no hard-lock**" as a passing requirement — so adding one breaks a green suite
> on purpose.
>
> The earlier note this dossier was built on (a hard-lock removed 2026-07-12 "so a consultant
> could test") describes a **superseded** state. `resolution-policy.ts` supersedes and replaces
> that override entirely.
>
> 🟡 **What is actually open is a QUESTION FOR ALI, not an engineering task:** POCA §16 describes a
> two-officer rule, and this decision knowingly relaxes it. If he wants two-officer resolution
> mandatory before real money, that is a **new owner decision** — it needs a new dated entry in
> `COMPLIANCE-DECISIONS.md`, `test:two-admin` updated, and the ⛔ guardrail lifted. **No session
> should implement it without that.**

**Attack** Settle twice · settle a void · settle with zero on one side · settle a one-participant
market · reverse a wrong settlement — is it audited and does the money return exactly? · resolve a
market the officer holds a position in (permitted by the 2026-07-24 decision — confirm the audit
records `resolutionAuth: "single-admin"` and the badge never claims a fabricated two-signature) ·
flip `requireTwoOfficer` mid-ceremony, between stage-1 and stage-2.
**Exit** Double-settle impossible, reversal exact and audited, the resolution badge never overstates
how many officers signed, and the flag cannot be flipped to strand a half-finished ceremony.

### H7 · Sentinel & resolution policy — `cert:h7`
**Owns** `market-sentinel` `resolution-policy` · **Existing** `test:sentinel-guards`
**Attack** The sentinel auto-closes settled markets and **must catch tricky cumulative/threshold
cases 100%** — this is real money. Build the adversarial corpus: cumulative totals, thresholds
crossed then re-crossed, ties, ambiguous wording, a source that changed after the fact · what does it
do when it cannot decide — refuse or guess?
**Exit** Exhaustive tricky-case corpus, refusal on ambiguity (never a guess).

## I · AI

### I1 · Poll generation — `cert:i1`
**Surfaces** `admin/ai-polls` `admin/ai-polls/[id]` · **Owns** `ai-poll-generation` (1,449 L) `ai-provider-claude` `ai-poll-config`
**Existing** `test:ai-polls` `test:ai-coordination` · **Orphans** `ai-poll-generation-e2e.mjs` `ai-poll-ui-theme-audit.mjs`
**Attack** 🔴 **Prompt injection from a fetched source** — can a web page make the generator produce
a market outside its category, or one that appears pre-approved? · the **officer queue is the
safety**: prove nothing reaches players without a human approval · the AI pause switch **was
bypassable once** — prove it is not again · a malformed tool call · a generated market with an
unresolvable outcome.
**Exit** Injection-resistant, pause switch un-bypassable, no publication without approval.

### I2 · Trusted-source registry — `cert:i2`
**Surfaces** `admin/sources` · **Owns** `source-registry` (`TrustedSource`)
**Existing** `test:ai-source-allowlist`
**Attack** An unapproved domain · a redirect from approved to unapproved · a domain
`normalizeDomain()` treats as equal but is not (`evil-bbc.co.uk`, punycode, trailing dot, case) ·
removing a source that open markets depend on.
**Exit** Allowlist un-evadable including redirects and homoglyphs.

### I3 · AI resolution & oracle — `cert:i3`
**Owns** `updown-oracle` and AI resolution paths · **Existing** covered partly by `test:updown-*`
**Attack** A stale reading (`sourceQuotedAt` is the **source's** timestamp, never our boundary) · a
wrong-source reading · an unconfirmable boundary — must **void and refund in full**, never guess · the
model returning a plausible but wrong number · Claude API down, rate-limited, or returning prose.
**Exit** Every refusal path returns money, staleness enforced, no guess under ambiguity.

### I4 · Chatbot & spend controls — `cert:i4`
**Surfaces** `components/chat` (9 files) · **Owns** `ai-usage` `ai-usage-dal` `ai-controls` `ai-ops-config` `anthropic-billing`
**Existing** `test:ai-usage` `test:ai-controls`
**Attack** Evade the **10 messages/day** cap (new session, cleared cookie, second device, race two
requests) · make the bot give betting advice or a payout promise (a licensed operator's liability) ·
extract the system prompt · exhaust the Anthropic budget in a loop · is spend metered before or after
the call?
**Exit** Cap un-evadable, spend bounded pre-call, no advice/guarantee output, prompt not extractable.

## J · Products & Social

### J1 · Up & Down — `cert:j1` ⛔ **BLOCKED**
**Surfaces** `updown` `updown/[roundId]` `updown/history` `admin/updown*` · **Owns** `updown-config` `updown-dal` `updown-service` `updown-board` `updown-scheduler`
**Existing** `test:updown-engine` `test:updown-config` `test:updown-adversarial` `test:updown-load` `test:updown-quickbet` `test:updown-reporting`
**Attack** ⛔ **BLOCKED on Ali's ruling on `feat/updown-source-pinning-and-proposals` (28 commits).**
Today, editing an asset's `priceSourceUrl` **silently switches the source under open rounds with
player money staked**, and `UpDownRound` has no source field at all. **Certifying now would certify
the bug.** · round terms must not move after open · settle against the **pinned** source · one
observation per asset per boundary shared by 5/15/30-minute rounds — race it · `computeTargets`
margin changed mid-round.
**Exit** Branch merged, source pinned at open and proven immovable, all refusals refund in full.

### J2 · Bonus wallet & cashback — `cert:j2`
**Existing** `test:bonus` `test:bonus-betting` `test:bonus-stress` `test:bonus-restitution` `test:cashback`
**Attack** Cash out bonus funds (must be blocked) · unlock without meeting conditions · grant twice ·
restitution double-credit · a mixed bonus+real stake settled — does each side return to the right
wallet? · a bonus expiring mid-bet.
**Exit** Non-withdrawable invariant unbreakable, no double-grant, mixed-stake settlement exact.

### J3 · Invites & campaigns — `cert:j3`
**Surfaces** `profile/invite` `admin/invites*` · **Owns** `invite-service` `share-token`
**Existing** `test:invites` `test:invite-flow` · **Orphan** `marketing-invite-stress.mjs`
**Attack** Forge a `share-token` · claim an invite twice · enumerate campaigns · invite a
self-excluded account · a campaign past its end date · the branded OG image leaking data.
**Exit** Token forgery impossible, claims exactly-once.

### J4 · Affiliates & referrals — `cert:j4` 💰
**Surfaces** `admin/affiliate` · **Owns** `affiliate-service` `affiliate-config` (`ReferralReward`)
**Existing** `test:referral` · **Orphans (6)** `affiliate-e2e` `affiliate-sprint1-stress`
`affiliate-sprint2-ui-completeness` `affiliate-sprint3-kit-conformance` `affiliate-sprint4-security`
`affiliate-sprint5-integration`
**Attack** Self-referral · cycles (A→B→A) · farm rewards with disposable accounts · claim a reward
twice · reward on a self-excluded recruit · commission on a reversed/refunded deposit.
**Exit** Self/cyclic referral impossible, rewards exactly-once, reversal claws back commission,
6 orphans adopted or deleted.

### J5 · Proposals & voting — `cert:j5` 💰
**Surfaces** `proposals` `proposals/new` `proposals/[id]` `admin/proposals` · **Owns** `proposals-service` `proposals-config` (`Proposal`, `ProposalVote`, `VoteDirection`)
**Existing** `test:proposals` `test:proposals-state` `test:proposal-close` · **Orphans (5)** the
proposals sprint1–5 suites
**Attack** Approve one's own proposal · collect the instant-approval bonus twice · edit after
approval · vote twice, or on one's own · race a close against an approval · 🔴 **two buttons, one
action, two sizes** (`proposals/page.tsx:131,140`) is a G6 failure.
**Exit** State machine closed, bonus exactly-once, one vote per player, 5 orphans resolved.

### J6 · Comments & moderation — `cert:j6`
**Surfaces** `admin/moderation` · **Owns** `comments-store` `objections-service` (`Comment`, `Objection`)
**Existing** orphan `comments-e2e` route exists; no named gate
**Attack** XSS and HTML injection · a comment on a deleted market · edit/delete another player's ·
flood · abusive content reaching players before moderation · object to an objection.
**Exit** Sanitisation proven with real payloads, ownership enforced, moderation queue closed.

### J7 · Leaderboard & achievements — `cert:j7`
**Surfaces** `leaderboard` · **Owns** `achievements` `platform-stats` `insights`
**Attack** 🔴 **`db.user.list()` with no `where`/`take`, then one positions query per user,
uncached — bites at ~1k users, and the trigger is whoever shares the link.** Fix, then state the
measured ceiling · does it leak PII (full phone, email) or list a self-excluded player? · can a
player game the ranking with self-dealt bets? · ⚠️ **never gold/silver/bronze** — brand `--data-*`
tokens only.
**Exit** N+1 removed with a measured ceiling, zero PII, self-excluded players absent.

### J8 · Watchlist — `cert:j8`
**Surfaces** `watchlist` · **Owns** `watchlist-service` · **Existing** `test:watchlist`
**Attack** Watch a deleted market · another player's watchlist · unbounded growth · duplicate entries.
**Exit** Ownership enforced, bounded, idempotent.

## K · Compliance & Reporting

### K1 · Responsible gambling & limits — `cert:k1` 💰
**Surfaces** `profile/responsible-gambling` `legal/responsible-gambling` · **Owns** `responsible-gambling` (563 L)
**Existing** `test:loss-limit` `test:rg-race` `test:controlled-guards`
**Attack** Exceed a loss limit by **racing** two bets (`test:rg-race` exists — extend it) · lower a
limit and have it apply immediately; raise one and confirm a cooling-off · a limit crossed mid-bet ·
🔴 do the **limit-usage meters** on the wallet reflect real usage (they read `getLimitUsage`) or
approximate it?
**Exit** No limit evadable by race, raise requires cooling-off, meters exact.

### K2 · Self-exclusion & cooling-off — `cert:k2`
**Surfaces** `admin/self-exclusions` · **Attack** A self-excluded player logging in, depositing,
betting, receiving a notification, or appearing on the leaderboard · evade by registering a new
account on the same phone or NIDA · exclusion expiring early · staff lifting an exclusion without
two officers.
**Exit** Exclusion total across every surface, un-evadable by new account, lift requires two officers.

### K3 · AML, fraud flags & match integrity — `cert:k3`
**Surfaces** `admin/aml` · **Owns** `AntiFraudFlag` (`FlagType/Severity/Status`), `MatchIntegrityCheck`
**Existing** `test:integrity` · **Orphan** `regulator-audit.mjs`
**Attack** Structure deposits below a threshold to avoid a flag · collusion between two accounts on
opposite sides · a flag raised and silently dropped · is every flag actioned or explicitly dismissed
with a reason? · match-integrity check on a market whose source changed.
**Exit** Structuring detected, collusion pattern detected, no flag closable without a recorded reason.

### K4 · Privacy, data rights & retention — `cert:k4`
**Surfaces** `admin/privacy` `admin/retention` `legal/privacy` · **Owns** `privacy`
**Attack** Export another player's data · a deletion request that leaves KYC documents (D2) or audit
rows behind — **and the audit chain must not break when data is deleted (G4 conflict)** · retention
window enforced · 🔴 **PII masked in both compliance lists in the UI — is it masked in the export
(K5)?**
**Exit** Deletion complete and chain-safe, retention enforced, exports masked.

### K5 · Reporting & exports — `cert:k5`
**Surfaces** `admin/reports` `api/admin/reports/[id]` `api/admin/transactions/export` · **Owns** `reports/catalogue` (983 L) `reports/pdf` `reports/xlsx` `report-money` `report-pack`
**Existing** `test:date-range` · **Orphans** `report-renderers-smoke.mjs` `reports-retest.mjs`
**Attack** 🔴 **Do PDF, XLSX and CSV agree with each other and with the ledger, to the shilling, for
the same period?** · timezone boundaries at month-end · a period with zero rows · a period spanning
the fee-model change · **formula injection in XLSX/CSV** (`=cmd|…`, `+`, `-`, `@` leading cells) ·
a 100k-row export (memory, timeout) · PII masking (K4).
**Exit** Three renderers reconcile to the ledger exactly, injection-safe, masked, bounded.

### K6 · Events calendar — `cert:k6`
**Surfaces** `admin/events` · **Owns** `events-service` `EventCalendar` · **Existing** `test:events`
**Attack** An event in the past · overlapping events · an event driving a market that was deleted ·
timezone.
**Exit** Validation server-side, no dangling market reference.

### K7 · Insights, cohorts & retention — `cert:k7`
**Surfaces** `admin/insights` `admin/players/cohorts` `admin/retention` · **Owns** `insights` `analytics` `activity-summary`
**Attack** 🔴 **The silent-zero problem**: a failed query must render `unavailable`, never `0` — a
zero is a claim. `AdminKpi`'s `unavailable` state and `AdminLoadError` exist; prove **every** tile
uses them · does a cohort include self-excluded or deleted players? · do sparks/`dailyKpiSeries`
match the ledger? · use `dataviz` for any new chart.
**Exit** No tile can render a fabricated zero, cohorts exclude deleted/excluded, series reconcile.

## L · Platform

### L1 · Admin console shell & nav — `cert:l1`
**Existing** `test:admin-nav` `test:admin-money-ops` `test:ui-consistency` · **Orphans** `admin-smoke-e2e` `admin-grids-smoke` `break-it-admin` `admin-screenshots`
**Attack** Nav hiding is **not** a control — every route must enforce server-side (B1) · a 404 or
500 inside the admin shell · deep-link to a detail page for a deleted entity · 2,344 px-wide layout
regressions (the width law, DESIGN_AUTHORITY B7/B8).
**Exit** No surface reachable by nav manipulation, `break-it-admin` adopted.

### L2 · System config & feature flags — `cert:l2`
**Surfaces** `admin/config` `admin/system` · **Owns** `config-store` `define-config` `platform-config` `runtime-mode` (`SystemConfig`)
**Existing** `test:config` `test:killswitch` `test:maintenance`
**Attack** Set a config value out of range, of the wrong type, or to `null` · change a money-relevant
config mid-settlement · is every change audited with an actor? · does a flag flip need two officers?
· 🔴 `/admin/system` **once stated "Postgres point-in-time recovery … replicated across two regions"
as fact** when none existed — audit every claim on that page (G8).
**Exit** Validation + range enforcement, every change audited, no false claim on any system surface.

### L3 · Ops: lifecycle, health, monitoring — `cert:l3`
**Surfaces** `api/health` `api/diagnostic` `admin/events` · **Owns** `lifecycle` `monitoring` `boot-checks` `ProviderHealth`
**Existing** `test:monitoring` `test:alerting` `test:payout-observability`
**Attack** 🔴 **`SENTRY_DSN` is unset — nobody is paged.** `/api/health` says
`monitoring.alerting:false`, honestly; **keep it honest** and arm it · the scrubber must strip
phone/email/NIDA from every string, stack frame, breadcrumb and framed local (a real leak was caught
here — the *first alert ever sent* would have carried a player's phone number) · a health endpoint
that reports OK while the DB is down · `ProviderHealth` staleness.
**Exit** Alerting armed and proven end-to-end, scrubber re-proven on the wire, health cannot lie.

### L4 · Backups & disaster recovery — `cert:l4`
**Owns** `backup/core` `backup/state`, `.github/workflows/backup-nightly.yml`
**Existing** `test:backup` (113 checks) + `scripts/backup-verify-offbox.mjs` `scripts/backup-secrets.mjs`
**Attack** 🔴 **NOTHING IS OFF-BOX YET** — the `50pick-backups` R2 bucket does not exist. And until
2026-07-31 the nightly reported **green while shipping nothing**, because `| tee` ate the exit code.
Both now fail loudly. · restore into an empty cluster and diff against source · a restore during
live traffic (the dump once read data and invariants on different connections and contradicted
itself) · the seal key lost (it has been, once) · a *source* problem must not be reported as a
*backup* problem, or the nightly is red forever and people stop reading it.
**Exit** Artifact landing off-box and **proven by `backup-verify-offbox`**, key in a password
manager, restore rehearsed to exit 0. See [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md).

### L5 · Rate limiting, Redis & resilience — `cert:l5`
**Owns** `rate-limit` `redis` `admission` `locks` `retry` · **Existing** `test:redis-failopen` `test:lock-hash`
**Attack** 🔴 **Multi-container is UNSAFE:** `admission.ts`, `rate-limit.ts` and the ticker's
`lastReconcileAt` keep state in module scope. Correct **only** because production runs one
container. **Decide with Ali: make it safe, or document it as a hard constraint and enforce a single
container in config so nobody scales it by accident.** · Redis down — does rate limiting fail open
(available, unprotected) or closed (protected, unavailable)? Which is right for login vs betting? ·
brute-force login across many IPs · the advisory-lock bigint trap (`pg_advisory_xact_lock` needs
`::int` casts; Prisma binds JS numbers as bigint) is **prod-only** because dev is in-memory.
**Exit** Container constraint enforced not merely described, fail-open/closed decided per surface
and documented.

### L6 · Design system, i18n, responsive, search, PWA — `cert:l6`
**Existing** `test:design-frozen` `test:tokens` `test:contrast` `test:measure` `test:motion` `test:needle` `test:responsive` `test:i18n` `test:trilingual` `test:ui-consistency` `test:bridge` `test:numeric` `test:search` `test:search-adoption` `qa:visual` `qa:contrast-rendered`
**Status** The most mature module. ⛔ **Design is FROZEN — do not reopen.** Narrow scope:
- 🔴 **Verify `test:responsive` end-to-end against a production build** — it is the one suite
  currently unverified; against a dev server it ran 40+ min without finishing.
- 🔴 **Adopt `axe-audit.mjs`** — G6 has **no keyboard/screen-reader gate** today.
- Close `POLISH-BACKLOG` §2: `--text-tertiary` is identical to `--text-secondary`; delete
  `--text-disabled` (zero consumers); localise `utils.ts:51-72` (pinned to `en-GB`); localise the
  OG route and PWA manifest.
- `offline` page and PWA install path; share/OG cards must not print ungrouped numbers.
**Exit** `test:responsive` verified with its runtime documented, a named a11y gate exists.

---

## 5 · Order of work

Not by size. By **what a failure costs**, and what unblocks other modules.

| Wave | Modules | Why |
|---|---|---|
| ✅ **0** | dev-route guard · orphan tracker | **DONE 2026-07-31.** Until they existed, one new route minted money and 145 files claimed coverage that had expired |
| 🟨 **1** | ✅ **F1 G8** DONE 2026-07-31 · ⛔ **H6 — NOT an engineering task**, see its dossier: a hard-lock would reverse the owner decision of 2026-07-24 and break `test:two-admin`. Needs Ali's ruling, not code · 🔴 **A6** (admin TOTP on) **is the remaining Wave 1 item** | Licence exposures that need no Selcom. **Start with A6.** |
| **2** | G1 G2 G3 G4 → E1 E2 E3 | The money core. G-domain resolves the orphan TZS 100,000 and the broken chain; E-domain guards them shut. **G3 needs Ali's fee ruling first** |
| **3** | H4 H5 H1 H3 H7 H2 | Highest-traffic money paths. Adopts 9 orphaned stress suites incl. the 200-concurrent-bet proof |
| **4** | K1 K2 K3 K4 · D1 D2 D3 D4 | Compliance and PII. **D4 has no gate at all today** |
| **5** | A1 A2 A3 A4 A5 · B1 B2 B3 · C1 C2 C3 C4 · J7 J8 | Identity, comms, and the two measured ceilings (leaderboard ~1k users, SSE ~125 clients) |
| **6** | I1 I2 I3 I4 · J2 J3 J4 J5 J6 · K5 K6 K7 | Feature modules that already have real gates |
| **7** | ⛔ **J1** | Blocked on Ali's ruling on the unmerged branch |
| **8** | L1 L2 L3 L4 L5 L6 | Platform. L4 and L5 carry operator actions; L6 is narrow |

---

## 6 · The orphan reckoning — 145 files

Every dossier naming an orphan must, at certification, do exactly one of two things with each.
**There is no third option:**

- **ADOPT** — wire it into `package.json` as a named gate, fix it until green, and prove it goes red
  when broken. Its guarantee becomes permanent.
- **DELETE** — with a one-line commit note saying what it proved and why that no longer needs
  proving. Its guarantee is formally surrendered, on the record.

**Leaving a script orphaned is not neutral. It is a claim of coverage that does not exist** — the
same defect as the compliance card's hardcoded green tick, one directory over.

Enforced by `npm run test:orphans`. Remove each adopted or deleted file from
`scripts/orphan-allowlist.json` in the same commit. **The allowlist may only shrink, and its length
is this program's progress metric: 145 → 0.**

---

## 7 · Laws

1. **No module is certified without a named `npm run` gate.** Prose is not a gate.
2. **Every negative assertion broken on purpose and observed red.** Record it in the commit message.
3. **Money paths need the money suite green plus a stated reason the change is safe:**
   `test:money-invariants` `test:fee-model` `test:settlement-gate` `test:concurrency` `e2e:money`.
4. **Design is frozen.** Write findings down; do not restyle. The old `design_handoff` kit is
   **deleted and forbidden** — following it reverts the brand to teal and resurrects the killed
   light theme. Use `globals.css` → `design-master-brief.md` → `DESIGN_AUTHORITY.md`.
5. **Never state a ceiling you did not measure.** Give the number and how you got it.
6. **A gate that needs a running server must say so.** `test:responsive`/`test:motion` need `:3000`;
   a stale `node_modules` fails `test:backup` with a `pg` type error that reads like a broken suite.
   Both cost this project real hours.
7. **`railway ssh`, never `railway run`, for anything IP-whitelisted.** `run` executes locally; it
   once made the payout probe declare a live vendor account dead.
8. **One live plan per subject.** Update the doc that owns it. **No new tracker files** — a previous
   cleanup deleted 28 of them.
9. **Every push to `main` is a live deploy.** Branch, run the gates, stop for Ali.
10. **Truth outranks green.** A surface that claims something false is a defect of the same severity
    as a crash.
11. **Never widen your own permissions, and never read a credential store.** Ask.
12. **Add every new doc to [`README.md`](README.md) with a status.** Run `npm run test:docs`.

---

## 8 · Skills

| Skill | When |
|---|---|
| `/run` | Drive the real app. **G1 and G2 cannot be satisfied without it.** |
| `/code-review` | Before every certification commit. |
| `/security-review` | **Mandatory** for A1–A6, B1–B3, D1–D4, E1–E3, F1–F2, I1–I4, K1–K4. |
| `/simplify` | After a module is green — never before. |
| `dataviz` | Any chart in K5, K7 or J7. |
| `/loop` | Long stress runs and soaks. |
| `artifact-design` | Publishing a module report for Ali to read visually. |

Existing commands to use rather than reinvent: `npm run test:all` · `npm run qa:live` ·
`npm run qa:visual` · `npm run test:docs` · `npm run test:orphans` ·
`railway ssh "node scripts/selcom-probe.mjs"` · `railway run node scripts/backup-verify-offbox.mjs`

---

## 9 · Status board

**0 of 52 certified.** This is the honest baseline.

| Module | Gate | Status |
|---|---|---|
| A1 Registration & onboarding | `cert:a1` | ⬜ |
| A2 Login & sessions | `cert:a2` | ⬜ no dedicated gate today |
| A3 Password recovery | `cert:a3` | ⬜ |
| A4 OTP & SMS | `cert:a4` | ⬜ OTP hardcoded Swahili |
| A5 Player 2FA | `cert:a5` | ⬜ |
| A6 Admin TOTP | `cert:a6` | ⬜ **Wave 1** — TOTP OFF in production |
| B1 Roles & domain grants | `cert:b1` | ⬜ |
| B2 Staff management | `cert:b2` | ⬜ |
| B3 Two-officer control | `cert:b3` | ⬜ |
| C1 Email delivery | `cert:c1` | ⬜ |
| C2 Email verification & suppression | `cert:c2` | ⬜ |
| C3 Notifications & push | `cert:c3` | ⬜ |
| C4 Realtime SSE & ticker | `cert:c4` | ⬜ ceiling ~125 unmeasured |
| D1 KYC submissions | `cert:d1` | ⬜ NIDA is a mock |
| D2 KYC documents | `cert:d2` | ⬜ base64-in-DB |
| D3 Source of Funds | `cert:d3` | ⬜ |
| D4 Upload & R2 storage | `cert:d4` | ⬜ **no gate exists** |
| E1 Wallet & balances | `cert:e1` | ⬜ orphan TZS 100,000 |
| E2 Deposits | `cert:e2` | ⬜ |
| E3 Payment webhooks | `cert:e3` | ⬜ |
| F1 Payouts & rails | `test:cert-f1` | 🟨 **G8 TRUTH DONE 2026-07-31** (69 assertions). Honest player messaging shipped in 3 locales + officer control. Remaining for full cert: G3 double-pay adversarial, G7 rail-failure resilience |
| F2 Cash-out & locks | `cert:f2` | ⬜ |
| G1 Ledger & double-entry | `cert:g1` | ⬜ |
| G2 Trial balance | `cert:g2` | ⬜ `ok:false` on production |
| G3 House pool & fee model | `cert:g3` | ⬜ **fee basis undecided** |
| G4 Audit chain | `cert:g4` | ⬜ link broken on production |
| H1 Market creation & config | `cert:h1` | ⬜ close time 3 h wrong |
| H2 Candidates pipeline | `cert:h2` | ⬜ |
| H3 Scheduling & ticker | `cert:h3` | ⬜ |
| H4 Bet placement & admission | `cert:h4` | ⬜ 9 orphans to adopt |
| H5 Positions & cash-out | `cert:h5` | ⬜ |
| H6 Resolution & settlement | `cert:h6` | ⬜ ⛔ **premise corrected 2026-07-31** — single-admin resolution is a dated owner decision with no hard-lock **by design**; a lock needs Ali's ruling, not code |
| H7 Sentinel & policy | `cert:h7` | ⬜ |
| I1 Poll generation | `cert:i1` | ⬜ |
| I2 Trusted-source registry | `cert:i2` | ⬜ |
| I3 AI resolution & oracle | `cert:i3` | ⬜ |
| I4 Chatbot & spend | `cert:i4` | ⬜ |
| J1 Up & Down | `cert:j1` | ⛔ **BLOCKED** — unmerged branch |
| J2 Bonus wallet | `cert:j2` | ⬜ |
| J3 Invites & campaigns | `cert:j3` | ⬜ |
| J4 Affiliates & referrals | `cert:j4` | ⬜ 6 orphans |
| J5 Proposals & voting | `cert:j5` | ⬜ 5 orphans |
| J6 Comments & moderation | `cert:j6` | ⬜ no named gate |
| J7 Leaderboard & achievements | `cert:j7` | ⬜ N+1 at ~1k users |
| J8 Watchlist | `cert:j8` | ⬜ |
| K1 Responsible gambling | `cert:k1` | ⬜ |
| K2 Self-exclusion | `cert:k2` | ⬜ |
| K3 AML & match integrity | `cert:k3` | ⬜ |
| K4 Privacy & retention | `cert:k4` | ⬜ |
| K5 Reporting & exports | `cert:k5` | ⬜ |
| K6 Events calendar | `cert:k6` | ⬜ |
| K7 Insights & cohorts | `cert:k7` | ⬜ |
| L1 Admin shell & nav | `cert:l1` | ⬜ |
| L2 System config & flags | `cert:l2` | ⬜ |
| L3 Ops & monitoring | `cert:l3` | ⬜ nobody is paged |
| L4 Backups & DR | `cert:l4` | ⬜ **nothing off-box** |
| L5 Rate limiting & resilience | `cert:l5` | ⬜ multi-container unsafe |
| L6 Design, i18n, responsive | `cert:l6` | ⬜ most mature |

**Update this table in the same commit that certifies a module.** A status board that lags the code
is worse than none.

---

## 10 · The session command

Copy this into a fresh session, replacing `<MODULE>` with an ID such as `F1` or `H4`.

=== BEGIN MODULE SESSION PROMPT ===

You are working in **50pick** (`kipindi-main`), a **licensed real-money** prediction platform that
is **already LIVE** at `www.50pick.tz` in TEST money mode. **Every push to `main` deploys.**

Read first, in order: `docs/README.md` (the doc index — the status column tells you what to trust),
`docs/MODULE-CERTIFICATION-PROGRAM.md` §1 (the eight gates) and §7 (the laws), **your module's
dossier in §4**, `CLAUDE.md`, then `docs/NEXT-PLAN.md` for launch-hardening state.

**Your job: take module `<MODULE>` to CERTIFIED.** All eight gates in §1 pass, each behind a named
`npm run` script a future session can re-run in one command.

**Before you start**
- `git fetch` and confirm you are current. A previous session sat **150 commits stale** and rebuilt
  already-shipped work **twice**.
- `npm install`. A stale `node_modules` fails `test:backup` with `TS2307: Cannot find module 'pg'`,
  which looks exactly like a broken suite.
- If your gates need a browser, start the app first — `test:responsive` and `test:motion` fail on
  navigation without a server on `:3000`, and read as real regressions.

**Verify every claim in the dossier before acting on it.** This repo has repeatedly found gates that
were green while the thing they guarded was broken: a contrast audit that hardcoded the values it was
checking; a compliance card showing a hardcoded tick for backups that did not exist; a backup
workflow reporting success while shipping nothing off-box because `| tee` swallowed the exit code;
and a payout probe declaring a live vendor account dead. **A green gate is evidence, not proof.**

**How to work**
1. Read the module's code and its existing suites. Establish what is *actually* true.
2. **Attack it.** Work the dossier's attack list, then add your own. Find real defects.
3. Fix them. Money paths need the money suite green **plus a stated reason the change is safe**.
4. **Write the gate.** `test:cert-<id>` for headless (it auto-joins `test:all`), `qa:cert-<id>` for
   browser, `cert:<id>` as the aggregator. Then **break each negative assertion on purpose and watch
   it go red**, and say in the commit that you did.
5. Drive the real app (`/run`) for G1 and G2. Screenshot every surface at every breakpoint × 3
   locales × dark and light — and **look at them**.
6. **Adopt or delete** every orphan named in your dossier (§6), and remove it from
   `scripts/orphan-allowlist.json` in the same commit.
7. Update the §9 status board and any doc that owns the subject, in the same commit.
8. `npm run test:all`, `npm run test:docs`, `npm run test:orphans` before claiming done.

**Report honestly.** If a gate is unverified, say so and why. Never claim a number you did not
observe. If you are blocked, finish everything that is not blocked, then state precisely what is
blocked and what would unblock it.

=== END MODULE SESSION PROMPT ===
