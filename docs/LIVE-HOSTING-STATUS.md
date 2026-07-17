# 50pick — LIVE HOSTING STATUS (living snapshot)

> **Purpose:** the current, real-time state of go-live hosting so any session can pick up
> instantly. Update the "Last updated" line + the status table whenever something changes.
> Full procedures/architecture live in [`GO-LIVE-RUNBOOK.md`](GO-LIVE-RUNBOOK.md); this file
> is just "where are we RIGHT NOW."
>
> **Last updated: 2026-07-17 ~18:50 — 🚀 DOMAIN LIVE. https://50pick.tz + https://www.50pick.tz
> serve the app with valid Let's Encrypt certs; global DNS propagated (all major resolvers →
> Railway). SELCOM built + LIVE (OFF/mock default, deposit creds validated). R2 KYC LIVE.
> Left: Selcom deposit go-live test + payout PIN + the final switch.**

## TL;DR status
| Item | State | Blocker / next |
|---|---|---|
| App on Railway host | 🟢 LIVE & healthy | `kipindi-production.up.railway.app` → 200; testers active |
| DNS delegation (tzNIC registry) | 🟢 **FLIPPED** ~15:23 | registry now returns `ollie`/`yadiel.ns.cloudflare.com` |
| Custom domain `50pick.tz`/`www` | 🟢 **LIVE** | both serve the app (HTTP 200, real app) over valid HTTPS; global DNS propagated (Cloudflare/Google/Quad9/OpenDNS → Railway 69.46.46.10/.31) |
| Cloudflare DNS zone | 🟢 Done & verified | 31 records, 0 proxied; all correct incl. mail; verified via CF API |
| Railway verify + cert | 🟢 **VALID** | both Verified: yes, cert VALID (Let's Encrypt CN=50pick.tz, exp 2026-10-15) |
| R2 (KYC storage) | 🟢 **LIVE** | bucket `50pick-kyc`; 5 vars set in Railway; prod-env round-trip PASS |
| Selcom payments (deposits) | 🟢 **LIVE code, OFF** | merged `main @f7d9081`; provider=mock default; deposit creds set + **validated** (live probe HTTP 404 = auth OK). Next: 1 real deposit test → flip provider→selcom |
| Selcom payouts (withdrawals) | 🔴 Blocked | needs **disbursement creds + float PIN** from Selcom (what we have is deposit-only); set `PAYMENT_VENDOR_PIN` |
| The go-live switch | ⚪ Not started | after the deposit test + certs: unset TEST_FUNDING, rebaseline, licence ref, AUTO_SETTLE — see `docs/GO-LIVE-CONTINUATION-PROMPT.md` §6 |

## ✅ DOMAIN CUTOVER — DONE (how it went, for the record)
- tzNIC registry flipped to Cloudflare ~15:23 (Netpoa pushed it after ~3h + a support ticket).
- Railway domain verification then STUCK ~3h at `Verified: no` (nameserver-move negative-cache:
  Railway's resolver had cached "the `_railway-verify` TXT doesn't exist" from before). Railway
  support confirmed this is normal (can take hours–a day) and the fix is **remove + re-add**.
- **FIX APPLIED:** deleted both custom domains → waited 15 min → re-added → Railway issued NEW
  CNAME targets (apex→`ggze9tup.up.railway.app`, www→`3hwa21jh.up.railway.app`; the
  `_railway-verify` TXT values were UNCHANGED) → updated the 2 CNAMEs in Cloudflare via the API
  → **Verified: yes + certs VALID within ~2 min.** New Railway edge IPs: apex 69.46.46.10, www
  69.46.46.31.
- ⚠️ Gotcha for humans: a stale LOCAL/office DNS resolver (e.g. `192.168.66.x`) can keep showing
  the OLD Apache "Index of /" page long after the site is live for everyone else — it's a client
  cache, not the site. Fix: point that machine at `1.1.1.1`, add a hosts entry, or wait out the TTL.
- Verify: `railway domain status 50pick.tz -s 50pick` → Verified: yes; `curl https://50pick.tz/api/health` → `{"ok":true...}`.

## ⚠️ Do NOT (guardrails for any session touching this)
- Do **not** re-edit the Cloudflare **web** records (apex/www CNAMEs, the two `_railway-verify`
  TXT) or the **mail** records — the zone is verified-correct. See runbook §3.
- Do **not** merge `feat/payment-adapter` — it's stale (~17 commits behind main) and would
  revert audited money code. Use `feat/payment-selcom`.
- A parallel session may be doing the **Zoho email migration** — it owns only the mail
  records (MX/SPF/DKIM), never the web records.

## R2 (KYC) — ✅ DONE + LIVE (2026-07-17)
- `@aws-sdk/client-s3` deployed (@9f4acd3); seam `src/lib/server/storage.ts`; smoke test
  `scripts/r2-roundtrip.mjs`.
- Bucket `50pick-kyc` (Cloudflare R2, WEUR). All 5 Railway vars set: `KYC_STORAGE=r2`,
  `R2_BUCKET=50pick-kyc`, `R2_ENDPOINT=https://e6e5f86245721a28fea6fe1170feba12.r2.cloudflarestorage.com`,
  `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` (secret values — Railway only).
- Verified: local + prod-env (`railway run … node scripts/r2-roundtrip.mjs`) round-trip PASS.
  New KYC uploads → R2; existing inline docs keep working (no backfill).

## Selcom payments — ✅ BUILT + LIVE (Selcom OFF), deposits validated (2026-07-17)
- Adapter + operations control-plane merged to `main` (@f7d9081) and deployed. Provider defaults
  to `mock` — nothing routes to Selcom until an officer flips the toggle in `/admin/payments`.
- **Deposit creds VALIDATED** end-to-end against the live gateway via the admin "Test Selcom"
  probe (HTTP 404 = authenticated + IP-allow-listed; 401/403 would mean bad creds/signature).
- **Full handoff (money model, creds/PINs, integration, pending, go-live switch, copy-paste
  prompt): `docs/GO-LIVE-CONTINUATION-PROMPT.md`.** Signing digest: `docs/SELCOM-API-DIGEST.md`.
- **Pending:** (1) one small real deposit test → flip deposits on; (2) **disbursement creds +
  float PIN** from Selcom → set `PAYMENT_VENDOR_PIN` → withdrawals work.
- ⚠️ Prod creds are **IP-allow-listed** to the Railway egress — validate from the deployed app,
  never locally.

## Env state (Railway, service `50pick`) — key flags
- Set + correct: `NODE_ENV=production`, `USE_PRISMA_DAL=true`, `TEST_FUNDING=true` (pre-launch),
  `DATABASE_URL`, `POSTMARK_API_KEY`, `POSTMARK_WEBHOOK_SECRET`, `SELCOM_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_APP_URL=https://www.50pick.tz`.
- **Selcom (deposits) — set + validated:** `PAYMENT_API_URL` (prod `apigw/v1`), `PAYMENT_VENDOR_ID`,
  `PAYMENT_API_KEY`, `PAYMENT_API_SECRET` (secret values — Railway only). `PAYMENT_AGGREGATOR`
  intentionally **unset** (→ mock; flip via admin). **Missing for payouts:** `PAYMENT_VENDOR_PIN`.
- **To change at the go-live switch:** unset `TEST_FUNDING` (→ auto-hard-locks solo-resolution),
  set `AUTO_SETTLE=true`, set real `NEXT_PUBLIC_LICENSE_REF` (currently placeholder
  `TZ-GBT-2026-XXXX`).
- **Staying as-is (Ali's calls):** `DISABLE_ADMIN_TOTP=true` (2FA later), `SMS_PROVIDER=console`
  (launching without SMS).
- **To remove at the switch (still set, no-op):** `SPORTS_API_PROVIDER` (markets are
  AI-generated), `DEMO_MODE_ENABLED` (read nowhere) — folded into the switch redeploy.
- **Added + live (R2 KYC):** `KYC_STORAGE=r2`, `R2_BUCKET=50pick-kyc`, `R2_ENDPOINT`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

## Quick health commands
- App: `curl -s -o /dev/null -w "%{http_code}" https://kipindi-production.up.railway.app/api/health`
- Logs: `railway logs -s 50pick`
- Registry: `nslookup -norecurse -type=ns 50pick.tz 196.216.162.67`
- Domain: `railway domain status 50pick.tz -s 50pick`
