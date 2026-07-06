# Cloudflare Setup Guide — 50pick.tz

> Architecture: Cloudflare (DNS + CDN + WAF + R2) in front of Railway (Next.js + Postgres + Redis)
> Date: 2026-07-03

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

### Step 4: Configure DNS Records in Cloudflare

Once the domain is active on Cloudflare, set these records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | @ (or 50pick.tz) | kipindi-production.up.railway.app | Proxied (orange cloud ON) |
| CNAME | www | kipindi-production.up.railway.app | Proxied (orange cloud ON) |

Delete any old A/AAAA records pointing to Railway IPs — the CNAME handles it.

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
2. Name: `kipindi-kyc`
3. Region: Auto (or choose EMEA for closer to Tanzania)
4. Go to R2 -> Manage R2 API Tokens -> Create API token
5. Permissions: Object Read & Write on kipindi-kyc bucket only
6. Copy Account ID, Access Key ID, Secret Access Key
7. In Railway -> 50pick service -> Variables -> add:
   - `R2_ACCOUNT_ID` = (your Cloudflare account ID)
   - `R2_ACCESS_KEY_ID` = (from step 6)
   - `R2_SECRET_ACCESS_KEY` = (from step 6)
   - `R2_BUCKET_NAME` = kipindi-kyc
   - `R2_ENDPOINT` = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

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
