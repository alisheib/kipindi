# Cloudflare Setup Guide — 50pick.tz

> Architecture: Cloudflare (DNS + CDN + WAF + R2) in front of Railway (Next.js + Postgres + Redis)
> Date: 2026-07-03 · **CUTOVER PLAN updated 2026-07-16 (see the ⭐ section — it
> SUPERSEDES Step 4's record table and Step 8's env names).**

---

## ⭐ GO-LIVE CUTOVER — do this TODAY (2026-07-16), live tomorrow

Hosting decision: **the app stays on Railway** (already live + healthy, Postgres
there). Only **DNS moves to Cloudflare**. The domain stays REGISTERED at Netpoa —
Netpoa is only used once, to change the nameservers; after that Netpoa's DNS
limitations (www/CNAME) are irrelevant because Cloudflare serves the zone.

### A. Resume Cloudflare onboarding (account EXISTS since 2026-07-03, stalled at plan selection)
1. dash.cloudflare.com → the `50pick.tz` site → finish onboarding.
2. Plan: **Free is fine for tomorrow's launch** (Pro $20/mo adds WAF/CDN polish —
   upgrade any time later; NOT a launch gate).
3. Cloudflare shows your **2 nameservers** (e.g. `xxx.ns.cloudflare.com`).

### B. At Netpoa (the ONLY Netpoa step)
Replace the domain's nameservers with the 2 Cloudflare nameservers. Propagation:
usually minutes–hours (Cloudflare emails when the zone is active).

### C. Cloudflare DNS records — EXACT values (from `railway domain status`, 2026-07-16)
Delete any imported A/AAAA records (they point at the Apache parking). Add:

| Type  | Name                  | Content / Value                                                                    | Proxy |
|-------|-----------------------|------------------------------------------------------------------------------------|-------|
| CNAME | `@`                   | `g31rs69a.up.railway.app`                                                           | **DNS only (grey)** |
| CNAME | `www`                 | `ss3egn8f.up.railway.app`                                                           | **DNS only (grey)** |
| TXT   | `_railway-verify`     | `railway-verify=5a2ae218422d38d9c358ffaa0e6e559cb1244d1daebe2e8af197a05b461cdd13`   | —     |
| TXT   | `_railway-verify.www` | `railway-verify=b159edaa5b8003bc7267e79f780838a320f9d186ad733a1aa3d049d10bf2306c`   | —     |

⚠️ Each hostname has its OWN Railway target — do NOT point both at
`kipindi-production.up.railway.app` (the old Step 4 table below is superseded).
The two TXT records are Railway's domain verification — without them the domains
stay `Verified: no` and certificates stay stuck in ISSUING.

### C2. ⚠️ CARRY OVER THE MAIL RECORDS — or ali.sheib@50pick.tz + Postmark BREAK

The current (Netpoa) zone carries LIVE email infrastructure (verified by DNS query
2026-07-16). Cloudflare's import scan may miss some — confirm ALL of these exist
in the Cloudflare zone before/at the nameserver swap:

| Type  | Name         | Content                                   | Proxy | Why |
|-------|--------------|-------------------------------------------|-------|-----|
| A     | `mail`       | `157.180.76.142`                          | DNS only | the mailbox host (new name — see below) |
| MX    | `@`          | `mail.50pick.tz` (priority 0)             | —     | inbound mail for `@50pick.tz` |
| TXT   | `@`          | `v=spf1 +a +mx +ip4:157.180.76.142 ~all`  | —     | SPF (keep verbatim) |
| CNAME | `pm-bounces` | `pm.mtasv.net`                            | DNS only | Postmark return-path (exists today) |
| TXT   | `<selector>._domainkey` | *(copy from Netpoa zone / Postmark dashboard)* | — | **Postmark DKIM — copy it EXACTLY; can't be guessed** |

**The trap:** today the MX is literally `50pick.tz → 50pick.tz` (the apex A record
doubles as web + mail). Once the apex CNAMEs to Railway, an MX pointing at the
bare domain resolves to RAILWAY → inbound mail dies. Hence the new `mail`
subdomain A-record + repointing the MX at `mail.50pick.tz`.

**After the swap, verify:** Postmark dashboard → Sender Signatures → 50pick.tz →
DKIM + Return-Path both green; send yourself a test email (an order/reset email)
and confirm delivery to ali.sheib@50pick.tz.
(Postmark itself is account-based — the paid account, templates, and API key are
untouched by any hosting/DNS move; only these DNS records anchor it to the domain.)

**Grey-cloud first:** with "DNS only", Railway verifies + issues the TLS certs
itself and everything just works. Flip to Proxied (orange) + SSL **Full (Strict)**
+ WAF (Steps 5–7) AFTER launch is stable — never before the certs are issued.

### D. Verify (once Cloudflare says the zone is active)
- `https://50pick.tz` and `https://www.50pick.tz` load the app with a valid cert
  (railway CLI: `railway domain status 50pick.tz -s 50pick` → `Verified: yes`).
- In grey mode there is NO `cf-ray`/`server: cloudflare` header — that's expected
  (Step 9's checks apply only after flipping to Proxied).
- `NEXT_PUBLIC_APP_URL` is already `https://www.50pick.tz` (set 2026-07-03).

### E. R2 while you're in Cloudflare (KYC storage) — CORRECTED env names
Create bucket `50pick-kyc` + an API token (Object Read & Write on that bucket),
then set in Railway → 50pick → Variables (these EXACT names — the code reads them
in `src/lib/server/storage.ts`; the old Step 8 names are superseded):
- `KYC_STORAGE=r2`  ← the activation switch (without it R2 is silently ignored)
- `R2_BUCKET=50pick-kyc`  (NOT `R2_BUCKET_NAME`)
- `R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID=…` · `R2_SECRET_ACCESS_KEY=…`
(`R2_ACCOUNT_ID` is not read — the account id lives inside the endpoint URL.)
Then the code session runs `npm i @aws-sdk/client-s3` and a staging KYC round-trip.

### F. Hand the payment provider everything (after DNS is live)
- Static outbound IP from Railway (enable Static Outbound IPs on the 50pick
  service first — dynamic egress would break their whitelist).
- Webhook URL on the FINAL domain: `https://www.50pick.tz/api/webhooks/payments`.
- Ask back: API docs (collection + disbursement), sandbox creds, webhook signature
  scheme (headers + HMAC construction), webhook signing secret.

---

## Already Done (CLI — Session 2026-07-03)

| Step | Status |
|------|--------|
| Redis added to Railway project | Done — keep "Redis", delete 5 duplicates (Redis-5oCE, Redis-_KBv, Redis-b5ik, Redis-nwvS, Redis-WgZB) |
| `AUDIT_CHAIN_SECRET` set (was missing) | Done — 64-char base64url secret, distinct from SESSION_SECRET |
| `NEXT_PUBLIC_APP_URL` fixed to `https://www.50pick.tz` | Done — was pointing to railway.app subdomain |
| New deployment auto-triggered | Done — env var change triggers Railway redeploy |

---

## Browser Steps (Ali)

### ~~Step 0: Create Cloudflare Account + Add Domain~~ DONE (2026-07-03)

Ali created Cloudflare account, entered `50pick.tz`, configured:
- Search bots: Allow
- Agent bots: Allow
- Training crawlers: Block on pages with ads
- Block training in robots.txt: ON
- Import DNS records: Automatic
- Hit Continue — resume from plan selection screen next session

### Step 1: Clean Up Duplicate Redis (Railway Dashboard)

1. Go to railway.com -> 50pick project
2. Delete these 5 services: Redis-5oCE, Redis-_KBv, Redis-b5ik, Redis-nwvS, Redis-WgZB
3. Keep only "Redis"
4. Click the Redis tile -> Connect tab -> copy REDIS_URL
5. Go to 50pick service -> Variables -> add `REDIS_URL` using Railway reference: `${{Redis.REDIS_URL}}`

### Step 2: Create Cloudflare Account + Add Domain

1. Go to dash.cloudflare.com -> Sign up (or log in)
2. Click "Add a site" -> enter `50pick.tz`
3. Select Pro plan ($20/mo)
4. Cloudflare will scan your current DNS records — review and confirm
5. Cloudflare gives you 2 nameservers (e.g. ada.ns.cloudflare.com, bob.ns.cloudflare.com)

### Step 3: Switch Nameservers at Registrar

1. Go to wherever you registered 50pick.tz
2. Replace current nameservers with the 2 Cloudflare nameservers
3. Wait 5-30 min for propagation (Cloudflare will email you when active)

### ~~Step 4: Configure DNS Records in Cloudflare~~ SUPERSEDED — use the ⭐ cutover section (§C) above

The table below is the OLD (wrong) version kept for history: Railway requires a
**distinct target per hostname + two `_railway-verify` TXT records**, and grey
cloud (DNS only) until certs are issued — see §C for the exact 2026-07-16 values.

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| ~~CNAME~~ | ~~@ (or 50pick.tz)~~ | ~~kipindi-production.up.railway.app~~ | ~~Proxied~~ |
| ~~CNAME~~ | ~~www~~ | ~~kipindi-production.up.railway.app~~ | ~~Proxied~~ |

Delete any old A/AAAA records pointing at the Apache parking — see §C.

### Step 5: SSL/TLS Settings

1. SSL/TLS -> Overview -> set to Full (Strict)
2. Edge Certificates -> Enable Always Use HTTPS
3. Edge Certificates -> Enable Automatic HTTPS Rewrites
4. Edge Certificates -> Set Minimum TLS Version to 1.2

### Step 6: WAF (Web Application Firewall)

1. Security -> WAF -> Managed Rules
2. Enable Cloudflare Managed Ruleset
3. Enable Cloudflare OWASP Core Ruleset
4. Set sensitivity to Medium (tune later if false positives)

### Step 7: Performance / Caching

1. Caching -> Configuration -> set caching level to Standard
2. Speed -> Optimization -> enable Auto Minify (JS, CSS, HTML)
3. Speed -> enable Brotli compression

### Step 8: Create R2 Bucket (KYC Storage)

1. R2 -> Create bucket
2. Name: `50pick-kyc`
3. Region: Auto (or choose EMEA for closer to Tanzania)
4. Go to R2 -> Manage R2 API Tokens -> Create API token
5. Permissions: Object Read & Write on 50pick-kyc bucket only
6. Copy Account ID, Access Key ID, Secret Access Key
7. In Railway -> 50pick service -> Variables -> add (**names CORRECTED 2026-07-16
   to what `src/lib/server/storage.ts` actually reads — see ⭐ §E**):
   - `KYC_STORAGE` = `r2`  (the activation switch — without it R2 is ignored)
   - `R2_BUCKET` = `50pick-kyc`  (the code reads `R2_BUCKET`, not `R2_BUCKET_NAME`)
   - `R2_ENDPOINT` = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `R2_ACCESS_KEY_ID` = (from step 6)
   - `R2_SECRET_ACCESS_KEY` = (from step 6)
   - (`R2_ACCOUNT_ID` is NOT read by the code — the account id is in the endpoint)

### Step 9: Verify Everything Works

1. Visit https://www.50pick.tz — should load normally through Cloudflare
2. Check Cloudflare dashboard -> Analytics -> you should see traffic
3. Check browser dev tools -> Response headers should show `cf-ray` header (proves Cloudflare is active)
4. Run from terminal: `curl -I https://www.50pick.tz` — look for `server: cloudflare`

---

## After Cloudflare Is Active — Code Work

These are done in code sessions (Claude assists):

1. Wire Redis rate limiter (swap in-memory -> Redis-backed using REDIS_URL)
2. Wire R2 KYC document storage (move base64 from Postgres -> R2 signed URLs)
3. Add GitHub Actions CI pipeline (.github/workflows/ci.yml)
4. Wire Sentry error tracking
5. Write DR runbook

All tracked in docs/gli-remediation-tracker.md and docs/gli-remediation-plan.md.

---

## Monthly Cost After Setup

| Item | Cost |
|------|------|
| Cloudflare Pro (DNS + CDN + WAF + SSL) | $20/month |
| Cloudflare R2 (KYC storage) | ~$0.15/month |
| Railway Redis | $5/month |
| Sentry (free tier or $26/month Team) | $0-26/month |
| **Total** | **$25-51/month** |
