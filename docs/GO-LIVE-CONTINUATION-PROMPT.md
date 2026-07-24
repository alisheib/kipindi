# 50pick — GO-LIVE continuation prompt (payments live-switch session)

> Self-contained handoff for the NEXT session: taking 50pick **live** now that the
> Selcom payments adapter + operations control-plane are **built, merged, deployed,
> and credential-validated**. Written 2026-07-17 at the end of the Selcom session.
> 🔐 No secret values here — creds live in Railway env vars only (referenced by NAME).

---

## 0. TL;DR — where we are
- **Payments code is DONE + LIVE on `main`** (Selcom adapter + admin control-plane), deployed to
  `kipindi-production.up.railway.app`, verified (clean boot, webhook probe confirms new code).
- **Selcom is INTEGRATED but OFF** — provider defaults to `mock`; nothing routes to Selcom until an
  officer flips the toggle in `/admin/payments`.
- **Deposit credentials are VALIDATED end-to-end** against the live Selcom gateway (the admin
  "Test Selcom · Jaribu" probe returned HTTP 404 = authenticated + IP-allowlisted; a 401/403 would
  have meant bad creds/signature).
- **Still pre-launch:** `TEST_FUNDING=true` on Railway → TEST mode (test float, no real money;
  POCA §16 solo-resolution + money-minting hard-locks are *relaxed* only because of this).
- **Two things remain:** (1) one small **real deposit test** to prove the full pipe, then flip
  deposits on; (2) **payout/withdrawal credentials + float PIN** from Selcom (what we have is
  deposit-only). Then the formal **go-live switch** (§6).

---

## 1. The money model — how payments work now
- **Adapter seam** `src/lib/server/payments.ts`: `dispatchDeposit`/`dispatchWithdrawal` (the wrapper)
  own the correlation id, the `*.dispatch` audit, and the **AML ≥ 1,000,000 TZS review hold**
  (large payouts are held for a second officer, never auto-disbursed). `resolveActiveAdapter`
  picks the adapter from the control-plane and **refuses to run real money on the mock** in LIVE
  mode (returns PROVIDER_DOWN + a SECURITY audit).
- **Deposits (money IN)** — Selcom **Checkout** rail: `create-order-minimal` → `wallet-payment`
  (USSD push). Async → returns `PENDING`; the wallet is **credited only** by the settlement path,
  which reads the **authoritative signed `checkout/order-status` re-query** (never the callback
  body). Exactly-once (`@@unique([provider,providerRef])` + advisory lock + amount-tamper defense)
  in `wallet-service.settlePaymentWebhook`.
- **Withdrawals (money OUT)** — Selcom **Wallet Cashin** `walletcashin/process`. Async → `PENDING`;
  settled from the authoritative signed `walletcashin/query?transid=` re-query. Needs the float
  **PIN** (see §3) — without it the adapter returns a clean failure and the hold is reversed.
- **`providerRef` = our correlation id** (we send it to Selcom as `order_id`/`transid`, Selcom
  echoes it on the callback) → deterministic correlation, no dependency on capturing Selcom's id.
- **Reconciliation:** `/admin/payments` shows matched/unmatched/drift; drift must be **TZS 0**.
- **Money invariants unchanged & proven:** claim-the-row, lock order wallet→market, exactly-once
  webhook, amount-tamper defense, RG re-check, taxes only on 50pick's commission. `e2e:money` on
  real PG = **0.00 drift**.

## 2. The operations control-plane (TEST ↔ LIVE)
`src/lib/server/payment-control.ts` + `runtime-mode.ts`, surfaced on `/admin/payments`:
- **Master mode indicator** `TEST` / `LIVE` — driven by `isLiveMoneyMode()` = `production &&
  TEST_FUNDING !== "true"` (the SINGLE source; POCA §16 lock references the same predicate).
- **Runtime toggles (admin, audited):** payment provider `mock↔selcom`; demo-async on/off.
  DB-backed (config-store); env is the fallback when no override is set.
- ⛔ **There is NO settlement toggle** — the `autoSettle` control and the `AUTO_SETTLE` env var were
  DELETED (2026-07-24). Market payout is **per-market timer-driven**: an adjudicated market arms its
  own timer at its `objectionsClosedAt` and pays itself then (`src/lib/server/market-scheduler.ts`),
  with a ~5-min reconciler re-arming any dropped timer. See §6.7.
- **LIVE-mode hard-locks:** mock is REFUSED on real money (use the kill-switch to pause, not the
  mock); a real provider can't be selected unless its creds are present; demo-async forced off.
- **Kill-switch** (per-MNO, `payment-ops.ts`) = the instant emergency stop.
- **"Test Selcom · Jaribu"** button = signed `order-status` probe, moves no money — the safe way to
  validate prod, IP-locked creds from the allow-listed Railway egress.
- ⛔ `TEST_FUNDING` (money-mint) and POCA §16 solo-resolution are NOT admin toggles — deployment-
  level, hard-locked in LIVE. Do not re-widen (`docs/COMPLIANCE-DECISIONS.md`).

## 3. Credentials & PINs — READ THIS 🔐
Secrets live in **Railway env only** (never the repo). Names + status:

| Env var | Purpose | Status |
|---|---|---|
| `PAYMENT_API_URL` | Selcom base URL (`.../v1`) — **production** host (`apigw`, no sandbox) | ✅ set |
| `PAYMENT_VENDOR_ID` | Selcom vendor/till id | ✅ set |
| `PAYMENT_API_KEY` | Selcom API key (Collections) | ✅ set + **validated** |
| `PAYMENT_API_SECRET` | Selcom API secret (Collections) | ✅ set + **validated** |
| `SELCOM_WEBHOOK_SECRET` | inbound webhook HMAC secret | ✅ set (pre-existing) |
| `PAYMENT_WEBHOOK_URL` | per-order callback URL (base64'd on the wire) | ⬜ optional — set to `https://www.50pick.tz/api/webhooks/payments` (or the Railway URL until DNS cuts over) |
| `PAYMENT_VENDOR_PIN` | float-account **PIN** for **payouts** (Wallet Cashin) | ❌ **NOT set — needed for withdrawals** |
| `PAYMENT_AGGREGATOR` | env fallback for the provider | ⬜ unset (→ mock) — leave unset; flip via admin |

- ⚠️ **What we have is COLLECTIONS (deposit) only.** The creds are labelled "Customer to Business";
  there is **no float PIN**, so **withdrawals cannot run yet**. Email `support@selcom.net` (or the
  Selcom contact) for **disbursement/payout access + the float PIN**, then set `PAYMENT_VENDOR_PIN`.
- ⚠️ **Prod creds are IP-allow-listed** to the Railway static egress
  (`162.220.232.250 / 152.55.176.240 / 152.55.177.181`). Selcom rejects calls from any other IP →
  **there is no local test**; validate from the deployed app (the Test button, or the real flow).
- **Selcom portal** (monitoring/reports): `https://portal.selcompay.com/register`.

## 4. How it was integrated (files + verification)
- `src/lib/server/selcom.ts` — the signer + HTTP client. Signing verified **byte-for-byte** against
  Selcom's own documented golden vector (`scripts/selcom-adapter.test.mts`, 36/36):
  `Authorization: SELCOM base64(API_KEY)` · `Digest-Method: HS256` · `Digest =
  base64(HMAC_SHA256(signing_string, API_SECRET))` · `Timestamp` ISO-8601 `+03:00` (EAT, no millis)
  · `Signed-Fields` = body keys in order · signing string `timestamp=<TS>&k=v&…` (timestamp first).
  `999` AMBIGUOUS = pending (never hard-fail). Full digest: `docs/SELCOM-API-DIGEST.md`.
- `src/lib/server/payments.ts` — `selcomAdapter.deposit/withdraw` wired to selcom.ts.
- `src/app/api/webhooks/payments/route.ts` — detects Selcom's `Authorization: SELCOM` callback;
  settles deposits from `order-status` and withdrawals from `walletcashin/query` (authoritative
  re-queries, not the callback body). Generic `X-Provider` path (azampay/mixx) untouched.
- `src/lib/server/payment-control.ts` · `runtime-mode.ts` — the control-plane + mode predicate.
- `src/app/admin/payments/*` — `control-plane.tsx` (UI), `payment-actions.ts`
  (`setPaymentControlsAction`, `testSelcomConnectionAction`).
- Tests: `test:selcom` (36/36) · `test:payment-control` (33/33) · `test:webhook-sec` (10/10) ·
  `test:payments` (25/25) · full `test:all` 69/70 (only `test:responsive`, needs a live server) ·
  `test:integrity` · `e2e:money` 0 drift. Visual pass on `/admin/payments` 360–1920.

## 5. PENDING — do these next
1. **Real deposit test** (proves the full pipe; moves ~1,000 TZS real): in `/admin/payments` flip
   provider → **SELCOM** (confirm) → player side **Wallet → Deposit** ~1,000 TZS + a real MNO number
   → approve the USSD PIN prompt → confirm the wallet credits **exactly once** and reconciliation
   drift = TZS 0. Then keep Selcom on (deposits live) or revert to mock. NB the test balance is
   wiped at the go-live DB rebaseline; the money is in the Selcom float (recoverable).
2. **Payout creds + PIN** from Selcom → set `PAYMENT_VENDOR_PIN` (+ any disbursement-specific
   vendor) → withdrawals work. Re-run "Test Selcom" and a small real withdrawal.
3. **Then the go-live switch (§6).**

## 6. The go-live switch (docs/LAUNCH-GO-NO-GO.md §5) — do all, in order
On the Railway `50pick` service, batched into one redeploy where possible:
1. **Unset `TEST_FUNDING`** → flips to LIVE money-mode; auto-arms POCA §16 hard-lock + the
   real-money-on-mock refusal.
2. **Rebaseline the DB** to a clean genesis (format/rebaseline; wipes test-float balances) →
   verify **trial balance 0 drift** + **audit chain valid**.
3. Set the real **`NEXT_PUBLIC_LICENSE_REF`** (GBT licence number — player-visible footer).
4. Remove dead vars **`SPORTS_API_PROVIDER`** + **`DEMO_MODE_ENABLED`** (read nowhere).
5. Flip provider → **selcom** in `/admin/payments` (deposits; withdrawals too once the PIN is set).
6. One real small **deposit → bet → settle → withdraw** end-to-end on the live platform.
7. **Settlement — nothing to flip; verify instead.** There is no `AUTO_SETTLE` var and no auto-settle
   toggle: every adjudicated market pays itself on its own timer at `objectionsClosedAt`. Once the
   payout rail is live and reconciled, confirm on **`/admin/system`** that **Timers armed** > 0 with a
   sane **next fire**, and that **`/admin/settlement`** has nothing stuck in **Ready to settle**
   (that page stays the human fallback — manual *Settle now* + the objection-frozen view). Payout
   gates are unchanged and still enforced: objection window, objection freeze, winner-floor, exact
   conservation, idempotency. Owner decision recorded in `docs/COMPLIANCE-DECISIONS.md` (2026-07-24).
   Related: the AI **resolution mode** on `/admin/resolver-queue` defaults to **human** (two-officer
   ceremony) — leave it there unless Ali explicitly asks for **auto**.
8. **DNS:** confirm `50pick.tz`/`www` resolve to Railway (as of 2026-07-17 they still showed the old
   Apache parking page — verify `railway domain status 50pick.tz -s 50pick` = Verified + cert issued;
   see `docs/GO-LIVE-RUNBOOK.md`). Then set `PAYMENT_WEBHOOK_URL` + register the callback in the
   Selcom portal against the real host.
9. Consider enabling admin 2FA (unset `DISABLE_ADMIN_TOTP`) — Ali's call (force-enrolls admins).

## 7. Guardrails (unchanged)
Every push to `main` = LIVE deploy. Full `test:all` + `tsc` + `build` before any money push. Verify
after every push (prod 200 + `railway logs -s 50pick` clean + logical + visual). Migrations on local
disposable PG first. 🔐 NEVER commit secrets. Never guess a signature. Verify against the RAILWAY
domain until DNS cuts over. Railway CLI is logged in as `alisheib07@gmail.com`; project `50pick`
(`5e87353c-…`), service `50pick`, env `production`.

---

## 8. ⬇️ COPY-PASTE PROMPT for the go-live session
```
Continue 50pick's go-live. The Selcom payments adapter + admin operations control-plane are
already BUILT, MERGED, DEPLOYED and credential-VALIDATED (deposit creds passed the live
"Test Selcom" probe). Repo F:\kipindi-main; every push to `main` = a LIVE production deploy to
the money DB. This is REAL-MONEY code — verify everything.

⭐ FIRST read docs/GO-LIVE-CONTINUATION-PROMPT.md (the complete handoff: money model, control-plane,
credential/PIN status, integration, pending items, and the exact go-live switch). Also read the
always-on skills .claude/skills/50pick-standards + .claude/skills/50pick-audit, then
docs/SELCOM-API-DIGEST.md, docs/LAUNCH-GO-NO-GO.md §5, docs/COMPLIANCE-DECISIONS.md, and the
memory (go-live-day-2026-07-17.md + MEMORY.md).

STATE: Selcom INTEGRATED but OFF (provider=mock default). Deposit creds set on Railway + validated
against the live gateway (IP-allow-listed to the Railway egress; NO local test possible). Still
pre-launch (TEST_FUNDING=true → TEST mode). Prod healthy at kipindi-production.up.railway.app.

DO (in order, per docs/GO-LIVE-CONTINUATION-PROMPT.md §5–6):
1. If not yet done: the one small REAL deposit test (flip provider→selcom in /admin/payments,
   ~1,000 TZS from a real phone, approve USSD PIN, confirm the wallet credits exactly once +
   reconciliation drift = TZS 0).
2. Withdrawals: once Ali provides Selcom DISBURSEMENT creds + float PIN, set PAYMENT_VENDOR_PIN,
   re-run "Test Selcom", do a small real withdrawal.
3. The go-live switch: unset TEST_FUNDING → rebaseline the DB to clean genesis → verify trial
   balance 0 drift + audit chain valid → set real NEXT_PUBLIC_LICENSE_REF → remove dead
   SPORTS_API_PROVIDER + DEMO_MODE_ENABLED → flip provider→selcom → one real deposit→bet→settle→
   withdraw. There is NO auto-settle switch (AUTO_SETTLE is deleted) — settlement is per-market
   timer-driven, so instead VERIFY /admin/system (timers armed + next fire) and that
   /admin/settlement has nothing stuck in "Ready to settle". Confirm DNS (50pick.tz→Railway) +
   set PAYMENT_WEBHOOK_URL + register the Selcom callback.

⛔ Do NOT re-widen the POCA §16 / TEST_FUNDING hard-locks. 🔐 Never commit secrets. Full test:all
before every money push; verify after every push.

ALI PROVIDES: Selcom DISBURSEMENT/payout credentials + float PIN (what we have is deposit-only);
the real GBT licence number; the go-ahead for the real deposit test + the go-live switch.
```
