# 50pick — GO-LIVE RUNBOOK & Execution Record (2026-07-17)

> The single source of truth for how 50pick.tz was taken live: the architecture, the
> **exact steps we executed**, the gotchas we hit and how we solved them, the final
> DNS/mail config, the environment-variable registry, and the remaining switch steps.
>
> 🔐 **SECRETS POLICY — read first.** This file is committed to git, whose history is
> permanent. It therefore contains **NO secret values** — no API keys, no secret access
> keys, no webhook secrets, no DB URL. Secrets live **only** in Railway env vars (and
> should be mirrored in a password manager). Where a secret exists, this doc names the
> **variable** and says *"value in Railway"*. Everything else here (DNS records, public
> DKIM keys, nameservers, IPs, endpoints) is public information and safe to commit.

---

## 0. Architecture (what runs where)

- **App + database:** Railway — Next.js app + PostgreSQL. Service `50pick`, project `50pick`
  (`5e87353c-1d59-433d-a683-a32b9149f74c`), env `production`, region US-West. Railway CLI
  account `alisheib07@gmail.com`. Every push to `main` = a LIVE deploy
  (`prisma migrate deploy && … && next start`).
- **DNS:** Cloudflare (Free plan), account `Ali.sheib@50pick.tz's Account`
  (`e6e5f86245721a28fea6fe1170feba12`). Grey-cloud (DNS-only) at launch; proxy/WAF is a
  post-launch flip.
- **Domain registrar:** Netpoa (`netpoa.com`), owner contact "Ocean Entertainment Limited /
  Jaykishan Kaba". Domain registered 2026-05-05, renews 2027-05-05.
- **Mailbox email:** cPanel hosting at **`157.180.76.142`** (mailbox `ali.sheib@50pick.tz`,
  webmail/autodiscover). Independent of the app.
- **App transactional email:** Postmark (account owner `ali.sheib@50pick.tz`) — order/reset/
  admin emails. Anchored to the domain by a DKIM TXT + the `pm-bounces` return-path CNAME.
- **KYC document storage:** Cloudflare R2 (bucket `50pick-kyc`) — S3-compatible; seam in
  `src/lib/server/storage.ts`. (Activation pending R2 creds — see §5.)
- **Payments:** Selcom (BoT-licensed aggregator) — adapter staged on `feat/payment-selcom`
  (see §6). Pending Selcom API keys/docs.

---

## 1. The go-live run order (high level)
1. **DNS cutover** (Netpoa → Cloudflare) — **DONE 2026-07-17**; tzNIC registry flipped ~15:23, propagating + Railway verifying (§2–§3).
2. **R2 KYC storage** — **✅ DONE + LIVE 2026-07-17** (bucket `50pick-kyc`, round-trip PASS) (§5).
3. **Selcom payment adapter** — branch staged; needs Selcom keys/docs (§6).
4. **The switch** — unset `TEST_FUNDING`, rebaseline DB, verify the settlement timers (§7).
5. **Post-launch watch** (§8).

---

## 2. DNS CUTOVER — the exact steps we executed (2026-07-17)

**Goal:** move DNS authority from Netpoa to Cloudflare so the root `50pick.tz` can point at
Railway (Railway needs a CNAME at the apex, which only Cloudflare's CNAME-flattening allows),
**without breaking email** (the mailbox + Postmark both anchor to the current DNS).

### Step-by-step (what we actually did, in order)
1. **Baseline & capture.** Confirmed prod healthy on `kipindi-production.up.railway.app`
   (200). Captured the **entire current Netpoa DNS zone** via live DNS queries + reading
   Netpoa's DNS manager (Domains → 50pick.tz → NETPOA DNS). Key facts captured: mail host
   `157.180.76.142`; MX pointed at the bare apex `50pick.tz`; SPF; DMARC; **two DKIM keys**
   (cPanel `default._domainkey` + Postmark `20260612082716pm._domainkey`); `pm-bounces`
   return-path. Current NS were `dns1.netpoa.com` / `dns2.netpoa.com`.
2. **Confirmed Railway targets** (live, via `railway domain status`): apex →
   `g31rs69a.up.railway.app` + TXT `_railway-verify`; www → `ss3egn8f.up.railway.app` + TXT
   `_railway-verify.www`. (Values in §3.)
3. **Cloudflare zone** — `50pick.tz` already existed in the account (import had run). We
   finished onboarding by selecting the **Free** plan. Cloudflare had **auto-imported the
   Netpoa records** — but see the gotchas (§2.1): most imported **Proxied**, and it **dropped
   the Postmark DKIM**.
4. **Edited the records** in Cloudflare (Overview → DNS → Records) to the target state (§3):
   apex A → CNAME(Railway); www CNAME → Railway; `mail` CNAME → A `157.180.76.142`; MX →
   `mail.50pick.tz`; flipped **every record to "DNS only" (grey cloud)**; **re-added the
   missing Postmark DKIM**; added the two `_railway-verify` TXT records.
5. **Verified the whole zone against Cloudflare's own nameservers** (`Resolve-DnsName …
   -Server ollie.ns.cloudflare.com`) BEFORE switching — every record correct, apex flattens
   to Railway IP `69.46.46.49`, both DKIMs byte-exact, MX → mail → `157.180.76.142`.
6. **Checked DNSSEC** — no DS record at the `.tz` registry, no DNSKEY → DNSSEC OFF → safe to
   switch (a stale DS is the classic thing that breaks a nameserver change).
7. **Switched nameservers at Netpoa** (Domains → 50pick.tz → Nameservers → "Use custom
   nameservers"): set `ollie.ns.cloudflare.com` + `yadiel.ns.cloudflare.com`, removed the two
   Netpoa NS, Saved. Registrar Lock was not blocking.
8. **Propagation watch** — `.tz` registry + worldwide caches (old NS had a 24 h TTL) take
   minutes–hours. Watching `railway domain status` for both domains to flip to
   **Verified: yes** and the TLS certs to issue.

### 2.1 Gotchas we hit (and the fixes) — carry these forward
- **Cloudflare imported almost everything as "Proxied" (orange).** Mail cannot pass through
  Cloudflare's HTTP proxy — proxied `mail`/`webmail`/`autodiscover`/`pm-bounces`/MX-target
  would **break email**. **Fix:** set **every** record to "DNS only" (grey). (Grey is also
  required for Railway to verify + issue certs; flip to orange/WAF only post-launch.)
- **The MX trap.** The Netpoa MX pointed at the bare apex `50pick.tz`. Once the apex CNAMEs to
  Railway, an MX at the bare domain resolves to **Railway** → inbound mail dies. **Fix:** add
  a dedicated `mail` **A**-record → `157.180.76.142` and repoint the MX to `mail.50pick.tz`.
- **Cloudflare's import DROPPED the Postmark DKIM** (`20260612082716pm._domainkey`). Without
  it, app emails fail DKIM → spam/rejection. **Fix:** re-added it from our captured value
  (this is exactly why we captured the full zone first).
- **API-token route blocked.** Creating a scoped Cloudflare API token required account email
  verification, which wasn't arriving — so we edited DNS **directly in the dashboard** (no
  token needed) and verified every record against Cloudflare's NS before cutover.

---

## 3. Final Cloudflare DNS zone (authoritative — rebuild from this if ever lost)

**Nameservers (set at Netpoa):** `ollie.ns.cloudflare.com` · `yadiel.ns.cloudflare.com`
**All records grey-cloud / DNS-only until post-launch.**

### Web → Railway
| Type | Name | Value |
|---|---|---|
| CNAME | `@` (`50pick.tz`) | `g31rs69a.up.railway.app` |
| CNAME | `www` | `ss3egn8f.up.railway.app` |
| TXT | `_railway-verify` | `railway-verify=5a2ae218422d38d9c358ffaa0e6e559cb1244d1daebe2e8af197a05b461cdd13` |
| TXT | `_railway-verify.www` | `railway-verify=b159edaa5b8003bc7267e79f780838a320f9d186ad733a1aa3d049d10bf2306c` |

### Mail — mailbox (cPanel @ 157.180.76.142)
| Type | Name | Value |
|---|---|---|
| A | `mail` | `157.180.76.142` |
| MX | `@` | `mail.50pick.tz` (priority 0) |
| TXT | `@` | `v=spf1 +a +mx +ip4:157.180.76.142 ~all` (SPF) |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |
| TXT | `default._domainkey` | `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvaAcG1lrpi5X5QR4bluKnF/bdoy/PoFabxPQsbJiQabl8jfFL5AgiUNAaouPRK3IH5dYas9zNfF+Hbe3lZ8MYpMNugiqkxPlCnNC7VIHGNxBsjas6kW3/e827vkAm+VOAB8S8HTzwRYAsxj8CpSNpMsG6kTQYMBHfQPZLMVsa0zvgbTH6x7D1umgaSi2gl6e4UYQgLVQ75R4/vPRiZaNHLdCM/Z/6Cy7TZqxFpRLDcWdMrZyvfZjJCyVT3ysS0ijffp7EfNv2lQwx55Gcka4b7PpuFPbtAYF3ahcfolMskcSCxdwHAuYyfeja9ZV8a134ZCYlJ4tjdknhR0uzQU5gwIDAQAB;` (cPanel DKIM — public key) |
| A | `webmail` / `autodiscover` / `autoconfig` | `157.180.76.142` (mailbox conveniences) |
| SRV | `_autodiscover._tcp` | `0 0 443 cpanelemaildiscovery.cpanel.net` |

### Mail — Postmark (app email)
| Type | Name | Value |
|---|---|---|
| TXT | `20260612082716pm._domainkey` | `k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCNyQVMC1qf3lP9nxueWds4VKE0CWYxapDwFdgoFX5WaOTfHV1ztC8lmnAIAXHYxF5r8s64yV+nwYnu+ooTXNNDfktPr8h3U98WeqHSSK9al+ugNwZNmJ/HssNsnmQyFGY5LJejgrQaDfbNlS5ZgsP1Rak/RFw968uP+ci1b/mqxwIDAQAB` (Postmark DKIM — public key) |
| CNAME | `pm-bounces` | `pm.mtasv.net` (Postmark return-path) |

*(Harmless leftovers still in the zone: `_acme-challenge`, `_cpanel-dcv-test-record`,
caldav/carddav SRV+TXT, cpanel/whm/webdisk/cpcontacts/cpcalendars/ftp A-records — safe to
leave or delete; none affect launch.)*

**Post-cutover verification checklist:**
- `railway domain status 50pick.tz -s 50pick` and `… www.50pick.tz …` → **Verified: yes**,
  Certificate: ISSUED.
- `https://50pick.tz` and `https://www.50pick.tz` load the app with a valid cert.
- Postmark → Sender Signatures → 50pick.tz → **DKIM + Return-Path green**; send a test email,
  confirm it lands at `ali.sheib@50pick.tz`.

---

## 4. Railway
- Verify host until DNS lands: `https://kipindi-production.up.railway.app` (then the customs).
- Custom domains attached to service `50pick`: `50pick.tz` + `www.50pick.tz` (certs ISSUING
  until DNS verifies).
- **Static outbound egress IPs (given to the PSP):** `162.220.232.250` / `152.55.176.240` /
  `152.55.177.181`. Payments webhook URL: `https://www.50pick.tz/api/webhooks/payments`.
- Ops: `railway status`, `railway logs -s 50pick`, `railway variables`, `railway domain`.

---

## 5. R2 KYC storage — activation

**Code side — DONE (this session):** `@aws-sdk/client-s3` added to `package.json` and
deployed; the storage seam (`src/lib/server/storage.ts`) loads it lazily and stays inline
until switched on.

**✅ DONE + LIVE (2026-07-17):** bucket `50pick-kyc` created (Cloudflare R2, WEUR); all 5
Railway vars set; local + prod-env round-trip (`scripts/r2-roundtrip.mjs`) PASS. New KYC
uploads store to R2. The steps below are the record of what was done:

**Steps (completed):**
1. Cloudflare → **R2** → create bucket **`50pick-kyc`** → **Manage R2 API Tokens** → create
   an **Object Read & Write** token → note **Access Key ID**, **Secret Access Key**, **Account ID**.
2. Set these Railway env vars (**exact** names — code reads them in `storage.ts`):
   - `KYC_STORAGE=r2` (the activation switch — without it R2 is ignored)
   - `R2_BUCKET=50pick-kyc`
   - `R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `R2_ACCESS_KEY_ID=…` *(secret — value in Railway only)*
   - `R2_SECRET_ACCESS_KEY=…` *(secret — value in Railway only)*
3. Test: upload a KYC doc → view it in admin (existing inline docs keep working; no backfill).

---

## 6. Selcom payment adapter — activation

**Branch staged (this session): `feat/payment-selcom`** (cut fresh off current `main` +
cherry-picked the adapter scaffold; `tsc` green). ⚠️ **Do NOT merge the old `feat/payment-adapter`
branch — it is ~17 commits behind `main` and would revert the bet-stake atomicity, the route
tier-gating, and the solo-resolution lock.** Use `feat/payment-selcom`.

**Remaining (needs Selcom keys/docs from Ali):**
1. Fill `selcomAdapter.deposit`/`withdraw` in `src/lib/server/payments.ts` (return
   `PENDING` + provider ref; the wrapper already owns the correlation id, audit, and the
   AML ≥ 1,000,000 TZS hold). Follow `docs/PAYMENT-INTEGRATION-CHECKLIST.md` (on the branch).
2. **Verify every endpoint/field/signature against Selcom's real docs — never guess a
   signature.** Selcom uses a signed-header scheme (`Authorization: SELCOM base64(apiKey)`,
   `Digest` = HMAC-SHA256 of the signed fields with the API secret).
3. Set Railway env vars: `PAYMENT_AGGREGATOR=selcom`, `PAYMENT_API_KEY`, `PAYMENT_API_SECRET`
   (+ base-URL var) — *values in Railway only*; `SELCOM_WEBHOOK_SECRET` is already set.
4. Confirm the inbound webhook contract in `route.ts` matches Selcom (header names +
   `${timestamp}.${body}` HMAC + `normalizeStatus`). Map MNO → Selcom channel codes.
5. Test: `PAYMENTS_DEMO_ASYNC=true` suites + full gate + `e2e:money` on local PG (drift 0.00)
   + a sandbox round-trip (deposit→webhook→credited once; withdrawal payout; ≥1M → AML hold).
   Merge `feat/payment-selcom` → `main` → deploy → verify.

**What to get from Selcom:** base URLs (sandbox + prod), API key + secret, vendor/merchant ID,
webhook signing secret, collection (C2B) + disbursement (B2C) API docs, callback signature
scheme, MNO channel codes, sandbox creds.

---

## 7. THE GO-LIVE SWITCH (run only after §2–§6 green) — `docs/LAUNCH-GO-NO-GO.md` §5
1. Payment rail merged, deployed, sandbox round-trip proven, reconciles to 0.
2. R2 live + a KYC upload→view round-trip works.
3. Full gate on the go-live commit: `tsc` + `build` + `test:all` + `test:integrity`; on real
   PG: `s10`, `s11`, `e2e:money` (drift 0).
4. **Unset `TEST_FUNDING`** → also auto-hard-locks the solo-resolution override (POCA §16).
5. **Format/rebaseline the DB** → clean genesis (ledger/audit/wallets from zero).
6. Verify on the fresh DB: trial balance = TZS 0 drift, audit chain valid, one real small
   deposit→bet→settle→withdraw round-trip correct.
7. **Settlement — nothing to flip.** There is no `AUTO_SETTLE` env var and no auto-settle toggle
   any more; settlement is **per-market timer-driven**. When a market is adjudicated it gets its own
   timer set to its `objectionsClosedAt` and pays itself then — the objection window, the freeze on
   a standing objection, the winner-floor, exact conservation and idempotency (no double-pay) are
   all still enforced. **Verify instead:**
   - `/admin/system` → **Timers armed** > 0 with a sane **next fire** (a ~5-minute reconciler
     re-arms any market whose timer was dropped).
   - `/admin/settlement` → **Ready to settle** not silently piling up, and anything under **Frozen
     by objection** understood. Manual **Settle now** here stays the human fallback.
   - `/admin/resolver-queue` → the intended **resolution mode**: **human** (two-officer ceremony,
     the default) unless the owner has deliberately enabled **auto** AI sealing above the
     confidence threshold.
8. Confirm `https://50pick.tz` + `https://www.50pick.tz` serve with valid certs; logs clean.

**Env cleanup to fold into the switch redeploy** (per Ali, 2026-07-17):
- **Remove `SPORTS_API_PROVIDER`** — markets are AI-generated, not sports-feed-driven (the
  admin "match-feed" copy is being corrected to say so).
- **Remove `DEMO_MODE_ENABLED`** — dead variable, read nowhere in the code.
- **Set `NEXT_PUBLIC_LICENSE_REF`** to the **real GBT licence number** (currently the
  placeholder `TZ-GBT-2026-XXXX`, shown in the public footer).
- **`DISABLE_ADMIN_TOTP=true` stays** for now (Ali's call — admin 2FA to be enabled later).
- **`SMS_PROVIDER=console` stays** — launching without SMS (auth is phone+password); wire a
  TCRA sender post-launch.

---

## 8. Post-launch watch
- `railway logs -s 50pick` clean · `/admin/payments` reconcile drift 0 · nightly
  `ledger.trial_balance_drift` quiet · first real player flows.
- **Settlement scheduler:** `/admin/system` → timers armed with the next fire advancing ·
  `/admin/settlement` → **Ready to settle** clearing on its own (a queue that only grows means
  timers are not firing) · watch the first real market pay itself at its objection-window close.
- Run the full responsive matrix (360/768/1280/1920) against the live site with a test admin.
- Consider: Postmark 2FA on; enable Cloudflare DNSSEC; flip Cloudflare proxy/WAF on.

---

## 9. Access accounts registry (WHO/WHERE — **no passwords/keys here**)
| System | Account / identifier | Used for |
|---|---|---|
| Railway (CLI) | `alisheib07@gmail.com` · project `50pick` `5e87353c-…` | app + DB deploys, env vars, logs, domains |
| Cloudflare | `Ali.sheib@50pick.tz's Account` · `e6e5f86245721a28fea6fe1170feba12` | DNS, (R2, WAF later) |
| Netpoa (registrar) | Ocean Entertainment Ltd / Jaykishan Kaba | domain registration + nameservers |
| Postmark | owner `ali.sheib@50pick.tz` | app transactional email |
| Mailbox (cPanel) | `ali.sheib@50pick.tz` @ `157.180.76.142` | staff mailbox |
| Selcom | (pending) | payment collection + disbursement |

**All passwords/API keys/secrets:** in Railway env vars and/or a password manager — **never
in this repo.** If any secret is ever pasted into a chat or a file by mistake, rotate it.
