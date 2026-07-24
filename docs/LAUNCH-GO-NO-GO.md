# 50pick — Launch Go/No-Go (real money at 50pick.tz)

> The single walk-down list to take 50pick live. GBT licence ✅ (2026-07-16),
> payment keys expected 2026-07-17. Owners: 🤖 = code (me) · 👤 = Ali/ops.
> Ordered so nothing runs before its prerequisite. Companion:
> `GO-LIVE-READINESS.md`, `PAYMENT-INTEGRATION-CHECKLIST.md`.

## ✅ Already cleared
- GBT licence (the hard legal gate).
- The whole money engine: exact pari-mutuel payout (drift 0.00), **ALL money paths
  atomic** — settle/deposit/withdraw/refund AND bet placement (bet-stake single-tx
  merged @595901e, verified e2e:money 57/57 + e2e:fault 34/34 + s10) — double-entry
  ledger + trial balance, fork-proof audit chain, exactly-once webhooks. Audit +
  §9 enhancement all merged + live.

## 1 · Code to finish before real money (🤖 me)
- [ ] **Payment gateway** — wire + TEST the aggregator on `feat/payment-adapter`
      (when keys land): sandbox round-trip, reconcile to 0, merge, deploy.
      *Send me: which aggregator, API/webhook docs, base URL, key+secret.*
- [x] **bet-stake single-transaction** — DONE (merged @595901e). Every money write
      of a bet is now one atomic `$transaction`. No longer a launch consideration.
- [ ] **Activate R2 for KYC** — the seam is built; I run `npm i @aws-sdk/client-s3`,
      confirm the code path, and we do a staging KYC upload→view round-trip once
      you set the R2 creds (§2).

## 2 · Infra / hosting you provision (👤 Ali)
- [ ] **DNS → Railway (this is "go to 50pick.tz").** Follow the ⭐ cutover section in
      `CLOUDFLARE-SETUP-GUIDE.md`: finish the (existing) Cloudflare onboarding →
      swap nameservers at Netpoa → add the 4 exact records (per-host CNAME targets
      + 2 `_railway-verify` TXT), grey-cloud first. Both custom domains are ALREADY
      attached in Railway; `NEXT_PUBLIC_APP_URL` is already `https://www.50pick.tz`.
- [ ] **Cloudflare R2 bucket** (e.g. `50pick-kyc`) + an R2 API token. Gives me the
      creds for §3. (If you also front the app with Cloudflare DNS/CDN/WAF, do that
      here too — recommended, not required.)
- [ ] **Redis** (Railway tile) — *only needed if you run more than one instance.*
      Single instance at launch is fine without it; add before scaling.

## 3 · Env / credentials to set in Railway (👤 Ali)
- [ ] **Payment:** `PAYMENT_AGGREGATOR` (`selcom`|`azampay`), `PAYMENT_API_KEY`,
      `PAYMENT_API_SECRET` (+ base-URL var).
- [ ] **Webhook secrets:** `AZAMPAY_WEBHOOK_SECRET` / `MIXX_WEBHOOK_SECRET` per
      provider enabled (`SELCOM_WEBHOOK_SECRET` already set).
- [ ] **R2:** `KYC_STORAGE=r2`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
      `R2_SECRET_ACCESS_KEY`.
- [ ] **App URL:** `NEXT_PUBLIC_APP_URL=https://www.50pick.tz`.
- [ ] **Sentry (recommended):** `SENTRY_DSN` (I add `npm i @sentry/node`).
- [ ] **Confirm already set + distinct:** `DATABASE_URL`, `USE_PRISMA_DAL=true`,
      `SESSION_SECRET` (≥32), `OTP_PEPPER` (≥16), `AUDIT_CHAIN_SECRET` (≠ session).
- [ ] **VAPID keys** — only if enabling web-push at launch (else push stays stubbed).

## 4 · Decisions to confirm (👤 Ali, quick)
- [ ] **Phone OTP / SMS at launch?** Auth today is phone + password; SMS-OTP paths
      exist but need a **TCRA-licensed SMS sender** (`SMS_PROVIDER`/`SMS_API_KEY`/
      `SMS_SENDER_ID`) to deliver. Without it: no SMS password-reset / phone
      verification. Decide if that's required for day 1 (Selcom can also do SMS).
- [ ] **TRA tax base** — commission-slice vs GGR is intentionally unresolved in
      code; confirm the ruling for the finance reports (doesn't block betting).
- [ ] **Geo-fencing / sanctions-PEP screening** — planned, not built. Confirm
      whether GBT requires either on day 1.
- [ ] **Who seals an outcome on day 1?** /admin/resolver-queue carries a
      resolution-mode toggle: **"Require human ceremony"** (the default — the AI
      recommends, two officers seal) vs **"Auto-resolve at resolve date"** (the AI
      seals the outcome itself once its confidence clears the threshold; a
      low-confidence or UNKNOWN read always falls back to the ceremony). Confirm the
      default (human) is the launch posture. Either way the market still pays on its
      own settle timer after the objection window — see §5.7.

## 5 · THE GO-LIVE SWITCH — run in this exact order (🤖 me + 👤 you)
1. [ ] Payment rail merged, deployed, **sandbox round-trip proven** + reconciles to 0.
2. [ ] R2 live + a KYC upload→view round-trip works.
3. [ ] Full gate on the go-live commit: `tsc` + `build` + `test:all` + `test:integrity`;
       on real PG: `s10` (double-spend), `s11` (audit fork), `money-e2e` (drift 0).
4. [ ] **Unset `TEST_FUNDING`** (stop minting un-ledgered test money). ⚠️ This ALSO
       auto-hard-locks the solo-resolution override (POCA §16) — from this point an
       officer can never resolve a market they hold a position in. See
       `docs/COMPLIANCE-DECISIONS.md` (2026-07-17). Confirm the resolver-queue toggle
       shows "locked (live)" after go-live.
5. [ ] **Format / rebaseline the DB** → clean genesis (ledger, audit chain, wallets
       from zero; clears the test float + pre-audit rows). *This is the point where
       "clean" becomes real — after it, ANY trial-balance drift = a real defect.*
6. [ ] Verify on the fresh DB: trial balance = **TZS 0 drift**, audit chain verifies,
       a real small deposit→bet→settle→withdraw round-trip is correct end-to-end.
7. [ ] **Settlement — nothing to flip; verify instead.** There is no `AUTO_SETTLE` env
       var and no auto-settle admin toggle any more: each adjudicated market arms its
       own timer at its `objectionsClosedAt` and pays itself then (a ~5-minute
       reconciler re-arms any market whose timer was dropped). So on the go-live commit,
       **check /admin/system → "Settlement"**: "Timers armed" is non-zero with a sane
       "next fire", and **"Ready to settle" is 0** — a count that *sits* above 0 means
       timers were dropped and players are not being paid. **/admin/settlement** stays
       the human fallback (manual settle + the objection-frozen view). The payout gates
       are unchanged: objection window, a standing objection freezes the pool,
       winner-floor, exact conservation, idempotency (no double-pay). This supersedes
       the old "automatic payout is paused, every payout is a manual officer action"
       posture — see `docs/COMPLIANCE-DECISIONS.md` (2026-07-24).
8. [x] Repoint DNS confirmed: `https://50pick.tz` serves the app (not Apache) with a
       valid cert; verify + `railway logs` clean. **DONE** — cutover 2026-07-17,
       re-verified 2026-07-20 (`server: railway-hikari`, `x-powered-by: Next.js`).

## 6 · Strongly recommended before holding customer funds (👤 arrange)
- [ ] Third-party **penetration test**.
- [ ] **Backup + restore rehearsal** (prove you can recover the money DB).

---
### Shortest honest answer to "what do I need?"
**Tomorrow:** payment keys → I wire + test the rail. **You provision:** DNS repoint
50pick.tz→Railway, a Cloudflare R2 bucket + creds, and the env vars in §3.
**I finish:** bet-stake atomicity + R2 activation + the go-live DB reset. **Then** we
run §5 in order and you're live. Everything else (Redis, Sentry, pentest, SMS) is
recommended/optional, not a hard gate for a single-instance launch.
