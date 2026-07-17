# 50pick — LIVE HOSTING STATUS (living snapshot)

> **Purpose:** the current, real-time state of go-live hosting so any session can pick up
> instantly. Update the "Last updated" line + the status table whenever something changes.
> Full procedures/architecture live in [`GO-LIVE-RUNBOOK.md`](GO-LIVE-RUNBOOK.md); this file
> is just "where are we RIGHT NOW."
>
> **Last updated: 2026-07-17 15:30 — tzNIC registry FLIPPED to Cloudflare (~15:23); DNS
> propagating worldwide, Railway domains verifying. R2 KYC storage LIVE + verified.**

## TL;DR status
| Item | State | Blocker / next |
|---|---|---|
| App on Railway host | 🟢 LIVE & healthy | `kipindi-production.up.railway.app` → 200; testers active |
| DNS delegation (tzNIC registry) | 🟢 **FLIPPED** ~15:23 | registry now returns `ollie`/`yadiel.ns.cloudflare.com` |
| Custom domain `50pick.tz`/`www` | 🟡 Propagating | resolvers catching up (24h old-TTL); www already → Railway, apex still cached-old on some |
| Cloudflare DNS zone | 🟢 Done & verified | 31 records, 0 proxied; all correct incl. mail; verified via CF API |
| Railway verify + cert | 🟡 Issuing | `Verified: no` → flips to yes once Railway's resolvers see the delegation (mins–~1h); then `https://50pick.tz` serves the app (returns 404 until verified) |
| R2 (KYC storage) | 🟢 **LIVE** | bucket `50pick-kyc`; 5 vars set in Railway; prod-env round-trip PASS |
| Selcom payments | 🟡 Branch staged | `feat/payment-selcom`; needs Selcom keys/docs |
| The go-live switch | ⚪ Not started | after Selcom + certs: unset TEST_FUNDING, rebaseline, AUTO_SETTLE |

## ⏳ CURRENT WAIT: DNS propagation → Railway verify → certs
- The tzNIC registry **FLIPPED to Cloudflare ~15:23** (Netpoa pushed it — took ~3h). Now the
  delegation propagates to resolvers worldwide (old NS had a 24h TTL, so some resolvers lag).
- **Next:** Railway's resolvers see the delegation → `railway domain status` flips to
  `Verified: yes` → TLS certs issue → `https://50pick.tz` + `https://www.50pick.tz` serve
  the app. Until verified, the custom domains return **404** (Railway edge for an unverified
  domain) — expected, not a defect.
- **Watch:** `railway domain status 50pick.tz -s 50pick` (+ `www.…`) for `Verified: yes`;
  `curl -I https://50pick.tz` for the app + valid cert. (Background watcher polling.)
- Nothing to do but wait for propagation to reach Railway (mins–~1h typically).

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

## Selcom payments — how to finish
- Branch `feat/payment-selcom` (off current main + adapter scaffold, tsc green). Fill the
  two `selcomAdapter` bodies in `src/lib/server/payments.ts` per
  `docs/PAYMENT-INTEGRATION-CHECKLIST.md` (on the branch). Needs Selcom keys/docs. See
  runbook §6.

## Env state (Railway, service `50pick`) — key flags
- Set + correct: `NODE_ENV=production`, `USE_PRISMA_DAL=true`, `TEST_FUNDING=true` (pre-launch),
  `DATABASE_URL`, `POSTMARK_API_KEY`, `POSTMARK_WEBHOOK_SECRET`, `SELCOM_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_APP_URL=https://www.50pick.tz`.
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
