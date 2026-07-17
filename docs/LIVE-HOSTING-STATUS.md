# 50pick — LIVE HOSTING STATUS (living snapshot)

> **Purpose:** the current, real-time state of go-live hosting so any session can pick up
> instantly. Update the "Last updated" line + the status table whenever something changes.
> Full procedures/architecture live in [`GO-LIVE-RUNBOOK.md`](GO-LIVE-RUNBOOK.md); this file
> is just "where are we RIGHT NOW."
>
> **Last updated: 2026-07-17 — DNS cutover done, BLOCKED on Netpoa pushing the NS change to
> the tzNIC registry. Everything else staged.**

## TL;DR status
| Item | State | Blocker / next |
|---|---|---|
| App on Railway host | 🟢 LIVE & healthy | `kipindi-production.up.railway.app` → 200; testers active |
| Custom domain `50pick.tz`/`www` | 🟡 **PENDING** | Netpoa hasn't pushed the NS change to the `.tz` registry (support ticket open) |
| Cloudflare DNS zone | 🟢 Done & verified | all records correct incl. mail; grey-cloud; verified against CF NS |
| Railway cert issuance | 🟡 Waiting | `Verified: no` until the registry flips → then auto-issues |
| R2 (KYC storage) | 🟡 Code done, creds pending | client deployed; needs bucket `kipindi-kyc` + token |
| Selcom payments | 🟡 Branch staged | `feat/payment-selcom`; needs Selcom keys/docs |
| The go-live switch | ⚪ Not started | after R2 + Selcom: unset TEST_FUNDING, rebaseline, AUTO_SETTLE |

## ⛔ THE ONE BLOCKER RIGHT NOW: Netpoa → tzNIC registry push
- Ali switched `50pick.tz` nameservers to **`ollie.ns.cloudflare.com` / `yadiel.ns.cloudflare.com`**
  in the Netpoa panel (saved twice, account email verified, no registrar lock).
- **But the `.tz` registry still returns `dns1/dns2.netpoa.com`** — Netpoa hasn't synced the
  change to tzNIC. This is a Netpoa-side processing step; a support ticket is open (they're
  on WhatsApp). ccTLD pushes can lag / need a human. Nothing on our side is wrong.
- **Check it directly (bypasses caches):**
  `nslookup -norecurse -type=ns 50pick.tz 196.216.162.67` (ns2.tznic.or.tz).
  When it returns `ollie/yadiel.ns.cloudflare.com`, propagation has started.
- Then: `railway domain status 50pick.tz -s 50pick` → `Verified: yes` + cert ISSUED, and
  `https://50pick.tz` + `https://www.50pick.tz` serve the app. (A background watcher polls
  the registry every 10 min.)

## ⚠️ Do NOT (guardrails for any session touching this)
- Do **not** re-edit the Cloudflare **web** records (apex/www CNAMEs, the two `_railway-verify`
  TXT) or the **mail** records — the zone is verified-correct. See runbook §3.
- Do **not** merge `feat/payment-adapter` — it's stale (~17 commits behind main) and would
  revert audited money code. Use `feat/payment-selcom`.
- A parallel session may be doing the **Zoho email migration** — it owns only the mail
  records (MX/SPF/DKIM), never the web records.

## R2 (KYC) — how to finish (creds-only, independent of the DNS blocker)
- Done: `@aws-sdk/client-s3` deployed (@9f4acd3); seam in `src/lib/server/storage.ts`;
  smoke test at `scripts/r2-roundtrip.mjs`.
- Ali creates bucket `kipindi-kyc` + an Object R/W token → then set Railway vars:
  `KYC_STORAGE=r2`, `R2_BUCKET=kipindi-kyc`,
  `R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY` (secrets — Railway only).
- Test: `node scripts/r2-roundtrip.mjs` (with the R2_* vars in the shell) → expect `PASS ✅`.

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
- **Removed as dead/irrelevant:** `SPORTS_API_PROVIDER` (markets are AI-generated),
  `DEMO_MODE_ENABLED` (read nowhere).

## Quick health commands
- App: `curl -s -o /dev/null -w "%{http_code}" https://kipindi-production.up.railway.app/api/health`
- Logs: `railway logs -s 50pick`
- Registry: `nslookup -norecurse -type=ns 50pick.tz 196.216.162.67`
- Domain: `railway domain status 50pick.tz -s 50pick`
