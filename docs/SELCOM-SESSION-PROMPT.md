> ✅ **DONE (2026-07-17) — this session is COMPLETE.** The Selcom adapter + operations
> control-plane were built, merged to `main`, deployed, and the deposit credentials were
> validated against the live gateway. Do NOT re-run this prompt. For the go-live continuation
> (real deposit test → payout PIN → the switch) use **`docs/GO-LIVE-CONTINUATION-PROMPT.md`**.
> Kept for the record.

# 50pick — Payments + Operations Control-Plane session (copy-paste prompt)

> The dedicated session for the LAST code before go-live: the **Selcom** adapter **plus** a
> production-grade, admin-controllable **operations control-plane** (test-mode ↔ live-mode).
> Everything else is live (DNS cut over, R2 KYC live, all money paths atomic). Written 2026-07-17.

---

You are building the final pre-launch code for 50pick, a Tanzania-licensed real-money
pari-mutuel platform. Two deliverables, both **100% production-grade, perfect, verified**:
**(A)** wire the **Selcom** payment adapter, and **(B)** add an admin **operations control-plane**
so every test/prod behaviour is controllable by Ali at runtime — but safely.

Repo `F:\kipindi-main`; **every push to `main` = a LIVE production deploy to the money DB.**
Read `.claude/skills/50pick-standards` (the quality bar + 9-role gate) + `.claude/skills/50pick-audit`
(safe money ops) FIRST, then `docs/LIVE-HOSTING-STATUS.md`, `docs/COMPLIANCE-DECISIONS.md`, and
`docs/PAYMENT-INTEGRATION-CHECKLIST.md`.

## The quality bar (non-negotiable — this is real money)
Nothing ships until it passes the **9-role gate** and the "Perfect · 0 issues" bar
(50pick-standards §1): correct (verified end-to-end, not just tests), money-safe (no
mint/lose/double-pay/strand; every mutation audited; holds under concurrency), compliant
(POCA/GBT/TRA/FATF/PDPA; never fabricate), consistent (UI-kit), responsive (360/768/1280/1920),
accessible (WCAG AA), trilingual (EN+SW+ZH), fast, and **visually verified** (read the
screenshots). Perfect for the player AND the admin AND the auditor.

## Branch
**`feat/payment-selcom`** (adapter scaffold + checklist already on it). ⚠️ FIRST: bring it up
to current main — `git checkout feat/payment-selcom && git merge main` (main only added the R2
dep + docs; clean, no payments.ts conflict). ⛔ Do NOT touch/merge the stale `feat/payment-adapter`.

═══════════════════════════════════════════════════════════════════════════
## PART A — Selcom adapter
═══════════════════════════════════════════════════════════════════════════
Fill `selcomAdapter.deposit`/`withdraw` in `src/lib/server/payments.ts` (currently
`throw NOT_WIRED("selcom")`). Interface is FIXED (wallet-service depends on it): both async,
return `{ok:true, status:"PENDING", providerRef, correlationId}` (mobile money is async — the
webhook settles it) or `{ok:false, reason, correlationId}`. The WRAPPER already owns the
correlation id, the `*.dispatch` audit, and the **AML ≥ 1,000,000 TZS hold** (withdraw bodies
never see ≥1M). Add a signing helper + `mnoToSelcom(provider)` map.

**Selcom API — digest. ⚠️ VERIFY EVERYTHING against the real docs; NEVER guess a signature.**
Docs: https://developers.selcommobile.com/#authentication and #checkout-api.
- **Auth headers:** `Authorization: SELCOM <base64(API_KEY)>`, `Digest-Method: HS256`,
  `Digest: <base64(HMAC_SHA256(signing_string, API_SECRET))>`, `Timestamp: <ISO8601 e.g.
  2019-02-26T09:30:46+03:00>`, `Signed-Fields: <comma-sep field names>`, `Content-Type: application/json`.
  Signing string = `timestamp=<v>&field1=<v>&…` in EXACT `Signed-Fields` order (timestamp first).
  CONFIRM the field list/order + encoding against the docs.
- **Collection (deposit / money IN):** the Checkout create-order + wallet-payment (USSD push)
  flow, or C2B `POST /v1/wallet/pushussd` (transid, utilityref, amount, vendor, msisdn). CONFIRM
  which the signed account uses + exact endpoint/fields.
- **Disbursement (withdrawal / money OUT):** Selcom **Wallet Cashin** `POST /v1/walletcashin/process`
  (cash INTO the customer wallet = our payout) using the *CASHIN codes; bank = `/v1/qwiksend/process`.
- **Base URLs:** sandbox + prod — get exact hosts from the docs/portal (often
  `apigwtest.selcommobile.com` / `apigw.selcommobile.com` — CONFIRM).
- **Webhook/callback:** ⚠️ HIGHEST-RISK reconciliation. Our `src/app/api/webhooks/payments/route.ts`
  expects `X-Provider`/`X-Signature`/`X-Timestamp` + HMAC over `${timestamp}.${body}`, mandatory
  timestamp, 5-min replay, fails closed. Selcom signs differently — confirm Selcom's real callback
  headers/signature/status values and adapt `route.ts` (L25–56) + `normalizeStatus()`. Settlement
  is exactly-once (`@@unique([provider,providerRef])` + advisory lock + amount-tamper defense) in
  `wallet-service.ts settlePaymentWebhook` — keep it that way.
- **MNO → Selcom map:** MPESA→VMCASHIN / MPESA-TZ, AIRTEL_MONEY→AMCASHIN / AIRTELMONEY,
  TIGO_PESA→TPCASHIN / TIGOPESATZ, MIXX→TPCASHIN (Mixx by Yas), HALO_PESA→HPCASHIN / HALOPESATZ,
  TTCL_PESA→TTCASHIN / TTCLMOBILE. VERIFY (collection vs disbursement codes may differ).

═══════════════════════════════════════════════════════════════════════════
## PART B — Operations control-plane (TEST-mode ↔ LIVE-mode)
═══════════════════════════════════════════════════════════════════════════
**Goal:** Ali controls every test/prod behaviour at runtime from admin — but the money/compliance
rails stay safe. Selcom is INTEGRATED but not used until Ali flips a toggle.

**Design (use the EXISTING patterns — don't invent a parallel one):**
- Build on the DB-backed config store (`src/lib/server/config-store.ts` + `define-config.ts`) —
  admin-editable, single-source-of-truth, and follow the audited-change pattern. Extend the
  existing `/admin/payments` surface (it already has `kill-switch-toggle.tsx`, reconcile, retry).
- **Master mode indicator:** `TEST` vs `LIVE`, driven by the deployment-level `TEST_FUNDING`
  env (LIVE = real money, TEST_FUNDING unset). Show it PROMINENTLY in admin. In TEST mode the
  toggles below are freely settable; in LIVE mode the money/compliance-critical ones hard-lock —
  reuse the `isConflictOverrideHardLocked()` pattern from `test-overrides.ts`
  (`production && TEST_FUNDING!=="true"`).
- **Safe runtime toggles (admin, audited):**
  1. **Payment provider:** `mock` ↔ `selcom` — `pickAdapter()` reads the DB config (fallback to
     `PAYMENT_AGGREGATOR` env). This is how Selcom is "integrated but not used": default `mock`,
     flip to `selcom` when Ali is ready; the existing **kill-switch** is the instant emergency
     stop back to safe/paused. Guard: refuse `selcom` unless `paymentGatewayConfigured()` (creds
     present); a boot-check refuses real money on `mock` in LIVE mode.
  2. **Auto-settle:** on/off — ⚠️ **SUPERSEDED (2026-07-24, see `docs/COMPLIANCE-DECISIONS.md`).**
     This axis was built as planned and has since been **DELETED**: the `AUTO_SETTLE` env, the
     `autoSettle` admin toggle on `/admin/payments`, `getAutoSettleEnabled()` and the global
     `settleDueMarkets()` sweep are all gone. Settlement is now **per-market and timer-driven** —
     an adjudicated market arms its own timer at its `objectionsClosedAt` and pays itself then
     (`market-scheduler.ts`), with a ~5-minute `reconcileMarketSchedules()` backstop that re-arms
     any market whose timer was dropped. **There is no global settlement on/off switch to build or
     flip.** The real payout gates are unchanged and still enforced (the objection window, a
     standing objection freezing the pool, the winner-floor, exact conservation, idempotency —
     no double-pay); `/admin/settlement` remains the HUMAN FALLBACK (manual "Settle now" + the
     objection-frozen view); `/admin/system` shows live scheduler health (armed timers + next fire).
  3. **Payments demo-async:** on/off (mock's async behaviour; test-only).
- **⛔ COMPLIANCE-CRITICAL — keep as deployment-level / hard-locked, NOT casual admin toggles:**
  - `TEST_FUNDING` (mints the pre-launch testing float AND gates POCA §16 solo-resolution via
    `isConflictOverrideHardLocked()`). Do NOT turn money-minting into a one-click admin button on
    the real-money DB. It stays the deployment-level go-live switch. Preserve audit C7 intent and
    the `docs/COMPLIANCE-DECISIONS.md` decisions — ⛔ do NOT re-widen the hard-lock.
  - Solo-resolution override stays hard-locked in LIVE mode.
- **Every toggle change is audited** (actor, timestamp, old→new, category COMPLIANCE/WALLET) and
  visible in admin. Trilingual labels, UI-kit, responsive, a11y. Screenshot every state.

═══════════════════════════════════════════════════════════════════════════
## Env / creds (Railway service `50pick`; secrets in-session or Railway only — NEVER commit)
- Selcom: `PAYMENT_AGGREGATOR` (or DB config) — leave `mock` until tested; `PAYMENT_API_KEY`,
  `PAYMENT_API_SECRET`, a base-URL var, the Selcom **vendor/merchant ID**. `SELCOM_WEBHOOK_SECRET`
  already set. Ali: Selcom said creds were already shared — have base URLs (sandbox+prod), API
  key, API secret, vendor ID, webhook secret, sandbox creds ready to paste.

## Test plan (do ALL before merge)
1. `PAYMENTS_DEMO_ASYNC=true npm run test:payments` + `npm run test:webhook-sec` green.
2. Full gate: `tsc` · `build` · `test:all` · `test:integrity`. Add tests for the new
   control-plane toggles (incl. the LIVE-mode hard-lock — mirror `test:conflict-gate`).
3. Local disposable PG (50pick-audit §3): `npm run e2e:money` — drift **0.00**.
4. **Sandbox round-trip** (Selcom test env): deposit push → webhook → credited **exactly once**;
   withdrawal → payout → webhook confirms; **≥1M** withdrawal → **AML_REVIEW hold**. Toggle the
   provider mock↔selcom + the kill-switch and confirm each behaves. Reconcile `/admin/payments` = 0.
5. Visual pass on the new admin controls (360/768/1280/1920, EN+SW+ZH). Merge → deploy → verify
   (200s, logs clean, a real sandbox round-trip, the toggles behave).

## Guardrails
⛔ Full `test:all` before ANY money push; verify after every push (tech/logical/visual/live-DB
200/railway logs). Never `throw` at boot on non-fatal. Migrations on local PG only. 🔐 NEVER
commit secrets. Never guess a signature. Money invariants: claim-the-row, lock order wallet→market,
exactly-once webhook, amount-tamper defense, RG re-check, taxes only on 50pick's commission.

## After this session → the go-live switch (docs/LAUNCH-GO-NO-GO.md §5)
Once payments + control-plane are merged/verified and certs are live: unset `TEST_FUNDING` →
rebaseline the DB (clean genesis) → verify trial balance 0 drift + audit chain valid → one real
small deposit→bet→settle→withdraw → **nothing to flip for settlement** (it is per-market
timer-driven, no global switch): instead verify on `/admin/system` that market timers are armed
with a sane next fire, and that `/admin/settlement` shows nothing stuck in **Ready to settle**.
Also fold in: set real
`NEXT_PUBLIC_LICENSE_REF`, remove dead `SPORTS_API_PROVIDER` + `DEMO_MODE_ENABLED`.

## Reference
`src/lib/server/payments.ts` · `src/app/api/webhooks/payments/route.ts` ·
`src/lib/server/wallet-service.ts` · `src/lib/server/config-store.ts` + `define-config.ts` ·
`src/lib/server/test-overrides.ts` (hard-lock pattern) · `src/app/admin/payments/*` ·
`docs/PAYMENT-INTEGRATION-CHECKLIST.md` · `docs/COMPLIANCE-DECISIONS.md` · `docs/GO-LIVE-RUNBOOK.md` §6.
