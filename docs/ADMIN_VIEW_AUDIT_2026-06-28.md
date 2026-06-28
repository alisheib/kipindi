# 50pick / Kipindi — Admin-Role Audit (2026-06-28)

Full-surface audit of the **admin / operator / officer role** (session 2). Method: 7 parallel evidence-based read-only lanes (auth & authorization, money authority, market lifecycle, KYC/compliance/AML, player management, config/system/audit/reports, admin UI/design-system). Every finding cites `file:line`. No code changed during the audit.

Severity: 🔴 Blocker (fix before real-money launch) · 🟠 High · 🟡 Medium · 🔵 Polish.

---

## 0. Headline — the one root cause behind most blockers

**The role model is flat.** `ADMIN_ROLES = {ADMIN, COMPLIANCE, MODERATOR}` is copy-pasted into 6+ action files and the admin layout, and almost nothing tiers below it. Confirmed independently by **five** lanes (1, 2, 4, 5, 6). A MODERATOR — intuitively a content/chat moderator — can today:
- release AML-held withdrawals, approve/reject KYC, clear Source-of-Funds,
- view raw NIDA ID images and export any player's full PII bundle,
- set `starterBalanceTzs` (credits real money into *every* new wallet), retune live settlement fees, change the AI spend limit,
- reset any player's password and rebind their email (account-takeover-grade).

Fixing this one thing — introducing real tiers (`MONEY_RELEASE_ROLES` / `COMPLIANCE_ROLES = {ADMIN, COMPLIANCE}`, MODERATOR limited to moderation + market review) from a single shared module — resolves a large share of the blockers/highs below. **This is the #1 item.**

The second theme: **2FA is softer than it looks** — enrollment isn't forced, and the TOTP check is a page-render gate that server actions bypass.

---

## 1. 🔴 Blockers

### B1 — Flat role model: MODERATOR has full money/compliance/config authority
`src/app/admin/layout.tsx:10`, `aml/actions.ts:14`, `approvals/actions.ts:12`, `bonuses/bonus-actions.ts:12`, `affiliate/actions.ts:9`, `config/actions.ts:14`, `players/[id]/actions.ts:26`, `ai-usage/actions.ts:11`, `api/admin/kyc-doc/route.ts:20`, `api/admin/reports/[id]/route.ts:23`
One shared role set gates everything. **Fix:** centralize role sets in one module; define `MONEY_RELEASE_ROLES`/`COMPLIANCE_ROLES = {ADMIN, COMPLIANCE}` (exclude MODERATOR) for AML/KYC/SoF/config/reports/player-credentials; keep the broad set only for read-only console + moderation/market-review.

### B2 — TOTP enrollment is not forced (admin with no TOTP = password-only)
`src/app/admin/layout.tsx:110`, `auth/login/actions.ts:41`, `auth-service.ts:600`
The gate is `if (!DISABLE && await hasTotp(userId))` — an admin who never visited `/admin/2fa/setup` has `hasTotp=false` and the whole console + every action is reachable with password only. **Fix:** if role ∈ admin and `!hasTotp`, force-redirect to `/admin/2fa/setup` (only non-exempt page) until enrolled.

### B3 — TOTP is a render-gate only; server actions never check the TOTP cookie
`src/app/admin/**/actions.ts`, `markets/actions.ts:65+`
TOTP is verified only in `admin/layout.tsx`; Server Actions and `api/admin/*` don't run the layout. An admin who passed password login but not TOTP (or whose TOTP cookie expired) can POST `resolveMarketAction`, `approveAmlAction`, `emergencyVoidMarketAction`, config changes, etc. directly. **Fix:** add `requireAdminTotp()` (verify the signed `kp_admin_totp` cookie bound to userId+sessionId) inside the money/critical actions.

### B4 — Two-officer hole: AML holds start at 1M but two-person only triggers at 5M
`src/app/admin/aml/constants.ts:2` vs `src/lib/server/payments.ts:65`; single-officer path `aml/actions.ts:119-136`
Every withdrawal in the **1M–5M** band is released by a *single* officer (and that officer can be a MODERATOR). The UI even says "two-person ≥5M" (`aml/page.tsx:125`), misrepresenting the control. **Fix:** set the two-person threshold to the hold threshold (1M), or reconcile policy; never single-officer in the AML-held range.

### B5 — AML queue has no officer-vs-subject self-review check
`src/app/admin/aml/actions.ts:45-138, 140-201`
The only self-review guard is between the two AML officers; there's no check that the reviewer isn't the *owner* of the transaction. An admin/compliance user with their own wallet can self-approve their own withdrawal (single click under 5M). KYC and SoF both block self-review; AML doesn't. **Fix:** reject when `txn.userId === session.userId`, with a SECURITY audit.

### B6 — ISO audit report hardcodes "chain Valid" (false attestation)
`src/lib/server/reports/catalogue.ts:435`
The regulator-facing ISO integrity report emits `"Chain verification: Valid · no breaks"` as a literal — it never calls `verifyChain()`. If the chain is actually broken, it still attests "Valid". **Fix:** call `verifyChain()` and render the real verdict + first break point.

---

## 2. 🟠 High

### Money / AML
- **Stage-1 co-signature read from a 200-entry audit window** — `aml/actions.ts:28-33` — a busy day can drop the first signature, silently downgrading two-officer to one (or letting a different second officer complete it). **Fix:** persist `amlStage1By/At` on the txn row, read it directly.
- **AML approve drops the hold + says "withdrawal sent" but never dispatches** — `aml/actions.ts:91-114` — funds leave the ledger hold with no provider payout call. **Fix:** confirm/implement the post-approval disbursement (dispatch outside the wallet lock, drop hold on provider confirmation).
- **Finance "wallet liability" KPI understates real liability** — `analytics.ts:96-102` — sums only `balance`, excludes `hold` + `bonusBalance`. Regulator-facing number is wrong. **Fix:** include hold (+ decide bonus treatment) or relabel.

### Config / audit / reports
- **Excel formula injection in report exports** — `reports/xlsx.ts:37` — market titles / display names / regions / providerRefs written raw; a title like `=HYPERLINK(...)` executes when a regulator opens the workbook. **Fix:** prefix `'` to any cell starting with `= + - @` / control chars.
- **`verifyChain()` only validates the in-memory 10k ring, not the persisted log** — `audit.ts:289-320` — older tampering invisible. **Fix:** DB-backed full-chain verifier for the regulator path; label the in-memory check as "recent window."
- **Per-market fee overrides can exceed the 30% ceiling** — `market-config.ts:242` — combined-ceiling check uses global fallbacks, not the merged effective config; a crafted POST sets an override commission to 20%. **Fix:** compute the ceiling from the merged per-market config.

### Market lifecycle
- **Proposal→market bypasses the trusted-source gate and ships an empty sourceUrl** — `proposals-service.ts:265-273` — `createMarket` itself doesn't enforce `isSourceTrusted`; only the action wrappers do, and the proposal path calls the service directly. A real-money market goes LIVE with no source of truth. **Fix:** require/validate a trusted source at officer approval.
- **`approveAndList` has no idempotency lock** — `proposals-service.ts:256-278` — concurrent approval / double-click double-lists a proposal into two markets. **Fix:** `withLock("proposal:<id>")` + re-check status inside.

### Auth (step-up / bootstrap)
- **No step-up re-auth on resolve / emergency-void** — `markets/actions.ts:65,110` — an unlocked, already-TOTP'd admin browser can void/settle for the full 8h cookie window. **Fix:** OTP/TOTP re-auth on the kill-switch + stage-2 settlement (`reauth` OTP already exists).
- **Bootstrap-admin auto-promotion on every login** — `auth-service.ts:599-609` — any phone in `ADMIN_BOOTSTRAP_PHONES` is silently promoted to ADMIN on each login; a mis-set/leaked env var = standing admin grant with no 2FA. **Fix:** first-registration-only / one-shot, and force TOTP.
- **`adminResetPassword` / `setPlayerEmail` are single-officer, account-takeover-grade** — `players/[id]/actions.ts:129,139` — **Fix:** ADMIN-tier + consider two-officer for credential mutations.

### Player management (PII / audit visibility)
- **Admin actions on a player aren't visible in that player's audit tab** — `players/[id]/page.tsx:70` + `audit.ts:323` — the tab reads `getAuditForActor(id)` (player's own actions), so an officer can't see who suspended/reset/emailed the account. **Fix:** add a target-indexed read and merge.
- **Full unmasked phone in the player *list*** — `players/page.tsx:169` — the broad view leaks more PII than the masked detail page. **Fix:** mask in list.
- **No access-audit when an officer opens a player's PII detail / list / cohorts** — `players/[id]/page.tsx:62-70` — KYC *doc* views are audited; opening the full record isn't. **Fix:** emit a COMPLIANCE access audit.

### Compliance / DSAR
- **DSAR full-PII export is unaudited** — `privacy/actions.ts:48-55` — the sibling player-detail export *is* audited; this one isn't. **Fix:** audit actor + target before returning the bundle.
- **"Fulfill DSAR" performs no erasure** — `privacy.ts:82-99` — an ERASURE request is marked FULFILLED while data stays intact (false compliance record). **Fix:** real erasure/anonymization routine (respecting AML retention), or block manual erasure-fulfillment until implemented.

---

## 3. 🟡 Medium

- **AML approve reason not mandatory** — `aml/actions.ts:48` (reject requires ≥5 chars; approve, the higher-risk action, doesn't). Require a reason on approve.
- **Manual bonus grant: no cap/second-officer; monthlyCap not enforced in `creditBonus`** — `bonuses/bonus-actions.ts:22-57`, `bonus-service.ts` — single officer can grant up to 100M/call. Enforce the cap; consider two-officer for large grants.
- **Market creation doesn't require `resolutionAt` in the future** — `markets/actions.ts:156` — can publish an already-closed, un-bettable market. Reject past dates server-side.
- **Comment-moderation actions session-gated, not role-gated at the action layer** — `markets/actions.ts:213-232` — safe today (store re-checks `isMod`) but inconsistent/fragile. Add the standard role gate.
- **Report `[id]` route: no rate limit, heavy synchronous rebuild** — `api/admin/reports/[id]/route.ts:54` — DoS surface (no IDOR — closed catalogue map). Add rate-limit / short-window memoization.
- **`SX_REGISTER_SALT` weak hardcoded default** — `reports/catalogue.ts:38` — "anonymized" NIDA hashes become dictionary-reversible if env unset. Throw in prod (mirror the audit-secret guard).
- **PII over-exposure** — full phones in the self-exclusion roster (`self-exclusions/page.tsx:110`) and the privacy on-behalf-export table (`privacy/page.tsx:137`). Mask in list views.
- **Phone enumeration on admin login** — `auth-service.ts:519` — admin form distinguishes "no account" from "wrong password"; lets staff numbers be enumerated. Use a uniform error on the admin surface.
- **N+1 wallet lookups on the player list** — `players/page.tsx:46-50,153` — sort-by-balance is O(all users) round-trips. Pre-load via `listAll()`.
- **"Production theatre" copy** — retention page (`retention/page.tsx:25-36,102`) presents S3+KMS snapshots, nightly purge cron, two-person/IP-capture as live when not implemented; players-page footer claims the same. Mark as "target architecture / not yet enforced."
- **Audit payload dumps full before/after config to any admin viewer** — `audit/page.tsx:134`, `config/page.tsx:196` — compounds the flat-role issue. Redact by tier.
- **Hand-rolled table empty states** instead of a shared atom across ~15 admin tables — `players/page.tsx:181` et al. Add a thin `TableEmptyRow({colSpan,en,sw})`.
- **Arbitrary `text-[NNpx]` sizes vs the type scale** — ~370 occurrences (systemic house style, internally consistent). Map common sizes onto `text-micro/caption/body-sm`.

---

## 4. 🔵 Polish

- Sentinel reset/run audit records `actorId: "admin"` not the real officer — `market-sentinel.ts:727,744`.
- `onMarketResolved` prize-credit idempotency is non-atomic (single call site, low risk) — `proposals-service.ts:306`.
- Finance "tax accrued"/"operator margin" are hardcoded estimates (labeled est.) — `finance/page.tsx:48`.
- `ADMIN_ROLES` duplicated across 6 files (will be fixed by B1's centralization).
- `teal` vs `aqua` accent ramps used for the same role (both are tokens) — pick one, document.
- Sub-44px icon-only tap targets (12× `h-8 w-8`) — bump phone-reachable ones to ≥40px.
- Approvals "two-person from a different session and IP" copy overstates (code checks only actor id) — `approvals/page.tsx:230`. Align copy or implement.
- DSAR fulfilled confirm says "player will be notified" but no notice is sent — `privacy/dsar-controls.tsx:76`.

---

## 5. What's working well (verified, not assumed)

- **Authorization is defense-in-depth and uniform** — every admin mutation re-resolves the user from the DB and re-checks role server-side (not just UI hiding); a demoted admin loses access immediately; blocked calls emit a `SECURITY/privilege_escalation_blocked` audit. **No admin mutation is callable by a plain PLAYER.** (The *gap* is tiering *within* admin, not missing checks.)
- **Two-officer market resolution is genuinely enforced** — stage-2 must be a different officer and must match the stage-1 outcome; officerId comes from the server session, never the client; everything runs under `withLock("market:<id>")`; double-settle is structurally prevented (only OPEN positions settle; RESOLVED/VOIDED rejected).
- **Emergency void is correctly single-officer** (refund-only, no winnings → no collusion risk), reason-mandatory, idempotent, audited.
- **Wallet money-safety is solid** — atomic `db.wallet.adjust` deltas under `withLock("wallet:<userId>")`, no read-modify-write, real overdraw guards, no re-entrant-lock bugs, genuine idempotency (status/sourceRef gates). The AML two-officer flow is TOCTOU-safe with correct hold/balance ledger handling.
- **TOTP verify itself is well-built** — rate-limited, constant-time compare, ±1 skew, signed cookie bound to userId+sessionId, HttpOnly/SameSite/Secure, session-scoped (can't replay across logins). (The weaknesses are *enforcement*, B2/B3, not the primitive.)
- **Audit log** — HMAC hash-chained, append-only (no update/delete API), serialized writes, refuses to boot in prod without a distinct `AUDIT_CHAIN_SECRET`; viewer surfaces BROKEN prominently.
- **Dangerous toggles prod-blocked** — `TEST_FUNDING` and `ADMIN_TEST_DEPOSITS` hard-return in production even if env says "true".
- **KYC/SoF review** block self-review with mandatory reasons; **NIDA uniqueness** blocks multi-accounting; **self-exclusion cannot be lifted** from the admin surface; KYC doc route is role-gated, audited per-view, no path traversal/IDOR.
- **Config** validation is thorough (per-rate bounds, ≤30% combined ceiling, stake cross-check, NaN guards) and persists durably across deploys.
- **Reports route** authz is correct (401/403, closed-catalogue id → no IDOR/traversal, PII masked at source, every export audited). AI-usage dashboard is read-only, accurate, and makes no generative Anthropic call on render.
- **Admin UI is exemplary** — one shared chrome on 33/33 pages, one pager shared with the player app, **100% kit glyphs (zero lucide / zero inline UI svg)**, all wide tables in `overflow-x-auto`, reduced-motion-safe animations, bilingual EN·SW throughout, sensible sidebar grouping with live badge counts.

---

## 6. Suggested fix order (pending owner approval)

1. **B1 role tiering** (centralize role sets; `MONEY_RELEASE_ROLES`/`COMPLIANCE_ROLES`; MODERATOR → moderation/market-review). Unlocks most of the others.
2. **B2 + B3** force TOTP enrollment + enforce TOTP in critical server actions.
3. **B4 + B5** AML two-person across the full held range + officer-vs-subject self-review.
4. **B6 + Excel injection + verifyChain-persisted** (regulator-export integrity batch).
5. Highs: AML stage-1 durable signature; AML dispatch-on-approve; finance liability; proposal→market source+lock; player audit-visibility + PII masking + access audit; DSAR audit + real erasure; step-up re-auth; bootstrap hardening.
6. Mediums → Polish.

Player-view fixes from 2026-06-28 (commit 5fc3784) are already shipped; see docs/PLAYER_VIEW_AUDIT_2026-06-28.md.
