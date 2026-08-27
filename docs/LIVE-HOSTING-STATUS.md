# 50pick — LIVE HOSTING STATUS (living snapshot)

> **Purpose:** the current, real-time state of go-live hosting so any session can pick up
> instantly. Update the "Last updated" line + the status table whenever something changes.
> Full procedures/architecture live in [`GO-LIVE-RUNBOOK.md`](GO-LIVE-RUNBOOK.md); this file
> is just "where are we RIGHT NOW."
>
> **Last updated: 2026-08-24 — 🛡️ `www` IS NOW PROXIED THROUGH CLOUDFLARE (SSL/TLS `Full (strict)`),
> and production runs Node 24.19.0. The apex is deliberately still DNS-only. See
> "EDGE POSTURE" below for what was measured and the one-click rollback.**
>
> **Last updated: 2026-07-27 — 💸 SELCOM DISBURSEMENT (payout) API GRANTED. Withdrawals not live
> yet: set the float PIN/creds + ship the activation phases in `docs/SELCOM-DISBURSEMENT-ACTIVATION.md`.**
>
> **2026-07-18 ~03:55 — 🚀 DOMAIN LIVE. https://50pick.tz + https://www.50pick.tz
> serve the app with valid Let's Encrypt certs; global DNS propagated (all major resolvers →
> Railway). SELCOM built + LIVE (OFF/mock default; deposit creds GENUINELY validated via the
> corrected `/checkout/order-status` probe — @213165c). R2 KYC LIVE.
> Left: Selcom deposit go-live test + payout PIN + the final switch.**

## TL;DR status
| Item | State | Blocker / next |
|---|---|---|
| App on Railway host | 🟢 LIVE & healthy | `kipindi-production.up.railway.app` → 200; testers active |
| DNS delegation (tzNIC registry) | 🟢 **FLIPPED** ~15:23 | registry now returns `ollie`/`yadiel.ns.cloudflare.com` |
| Custom domain `50pick.tz`/`www` | 🟢 **LIVE** | both serve the app (HTTP 200, real app) over valid HTTPS; global DNS propagated (Cloudflare/Google/Quad9/OpenDNS → Railway 69.46.46.10/.31) |
| Cloudflare DNS zone | 🟢 Done & verified | 31 records; all correct incl. mail; verified via CF API |
| Edge (CDN/WAF) | 🟡 **`www` PROXIED 2026-08-24**, apex DNS-only | SSL/TLS `strict`. `www` → `cf-ray` present, SSE verified through it. Apex left direct on purpose — flip it only after `www` has run a few days. Rollback = set `proxied:false`, seconds, no deploy |
| Node runtime | 🟢 **24.19.0** (2026-08-24) | `package.json` `engines: {node:"24.x"}` → Railpack resolved 24.19.0. Was 22.23.2 by builder default while CI pinned 24 |
| Railway verify + cert | 🟢 **VALID** | both Verified: yes, cert VALID (Let's Encrypt CN=50pick.tz, exp 2026-10-15) |
| R2 (KYC storage) | 🟢 **LIVE** | bucket `50pick-kyc`; 5 vars set in Railway; prod-env round-trip PASS |
| Selcom payments (deposits) | 🟢 **LIVE code, OFF** | merged `main @213165c`; provider=mock default; deposit creds set + **GENUINELY validated** (corrected probe hits `/checkout/order-status` → HTTP 200 + envelope `404 order-not-found` = signature/creds/IP reached the real handler; a bad-auth request returns 401/403). Next: 1 real deposit test → flip provider→selcom |
| Selcom payouts (withdrawals) | 🟢 **CODE LIVE (2026-07-27 @e046c51), 1 op-blocker** | All 3 phases built + tested (`test:all` 94/94) + **deployed** (Railway `b96f42f0` SUCCESS): `selcomDisburseEnv`+`CASHIN` routing · AML approve→dispatch · payee name-lookup + float-balance + money-grade emails · `BANK_TRANSFER` dropped. Provider already `selcom`. **Only blocker: set `PAYMENT_VENDOR_PIN` (float PIN — get from Selcom portal `61247989`) + fund the float.** Runbook: `docs/SELCOM-DISBURSEMENT-ACTIVATION.md` |
| The go-live switch | ⚪ Not started | after the deposit test + certs: unset TEST_FUNDING, rebaseline, licence ref — **no settlement flag to flip** (settlement is per-market timer-driven; verify on `/admin/system`) — see `docs/GO-LIVE-RUNBOOK.md` §6 |

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

## 🛡️ EDGE POSTURE — `www` proxied 2026-08-24, apex still direct

Closes item 3 of `SESSION-PROMPT-INFRA-HARDENING.md`. Before this, `curl -sI` returned
`server: railway-hikari` and no `cf-ray`: Cloudflare was DNS-only, so a live-odds product had no
edge cache, no DDoS absorption and no WAF in front of it.

| | Before | After |
|---|---|---|
| SSL/TLS mode | `full` | **`strict`** — set FIRST, while both records were still DNS-only |
| `www.50pick.tz` | CNAME → `3hwa21jh.up.railway.app`, DNS-only | **Proxied** (`server: cloudflare`, `cf-ray` present, `cf-cache-status: DYNAMIC`) |
| `50pick.tz` (apex) | CNAME → `ggze9tup.up.railway.app`, DNS-only | **unchanged — still DNS-only, on purpose** |
| mail records (MX/SPF/DKIM) | — | **untouched** |

⭐ **SSE was the thing to be afraid of, and it is fine.** `/api/events` is a long-lived
`text/event-stream` with a 15s heartbeat; a buffering or timing-out proxy kills live prices while
the page still loads perfectly — the failure is silent. Measured with `npm run qa:sse-edge`,
before and after, and the two readings are identical: 4 heartbeats, **15.0s apart to the tenth**,
stream open the full 45s, 28 bytes. After the flip it carried `cf-ray a30114b21eaf5729-BEY`.

⚠️ **Selcom is on EGRESS and was confirmed, not assumed** — `railway ssh "node
scripts/selcom-probe.mjs"` after the flip still reports `WALLET_CASHIN` + `QWIKSEND` enabled and
reads the float. Proxying inbound does not touch the outbound allow-list.

🔴 **THE INBOUND MONEY PATH THE COMMISSION DID NOT MENTION.**
`PAYMENT_WEBHOOK_URL=https://www.50pick.tz/api/webhooks/payments` — the host that was just put
behind Cloudflare. Selcom's deposit confirmation is a **server-to-server POST**: no browser, no
JavaScript, nothing that can answer a challenge. If Cloudflare had decided to interrogate it,
deposits would stop confirming while the site looked perfectly healthy — money leaves the
player's phone and never lands.

Checked, with a request that cannot change anything: a POST carrying neither `X-Provider` nor
`Authorization: SELCOM` is refused at the first line of the handler with
`400 {"ok":false,"error":"unknown-provider"}` — before any secret is read, any audit row is
written or any settlement is considered. Through the proxy it returns **exactly that JSON**,
`cf-ray` stamped, byte-identical to the same POST against the still-direct apex. The request
reaches the app; Cloudflare is not standing in front of it.

⛔ **Re-run that probe if anyone ever turns on Bot Fight Mode, a WAF managed ruleset, or a rate
limit on this zone.** Those are precisely the settings that would start challenging it, and the
symptom is silent.

🔴 **THE ONE THING STILL TO WATCH: ACME RENEWAL — and until 2026-08-27 THE GATE ON IT WAS
FICTION (`E-227`).** The origin certs were
issued 2026-07-17 and expire **2026-10-15**, and Railway renews them by answering a challenge at
the origin. That challenge now arrives through Cloudflare for `www`, and no renewal has yet been
observed on that path. An expired origin cert under `Full (strict)` is a total outage arriving
🔴 **CORRECTED 2026-08-27 (`E-227`): IT WAS NEVER A GATE — §[F] HAD NEVER EXECUTED ONCE.**
`predeploy` invokes `qa:live` with no `BASE`; `BASE` defaults to `http://localhost:3009`;
`LOCAL` is therefore true; and the whole certificate block sat inside `if (!LOCAL)`. `qa:live`
appeared nowhere in `.github/`. Apply the house test — *would it pass with an expired
certificate?* **Yes, silently, every time.** ⚠️ **And the one documented prod invocation failed it
every time it was used:** `CLAUDE.md` said to run
`BASE=https://kipindi-production.up.railway.app npm run qa:live`, a hostname absent from
`ORIGIN_OF`, so §[F] failed on *"no known origin"* and never on the certificate.
✅ **REPLACED by `npm run qa:cert-expiry` (`scripts/cert-expiry-watch.mjs`), running twice weekly
in `.github/workflows/cert-expiry.yml`.** It iterates **BOTH** origin hosts (§[F] selected ONE by
`new URL(BASE).hostname`, so a single run could structurally never cover both), **asserts its own
population** so losing a host cannot quietly reduce coverage to nothing, takes its threshold from
`CERT_MIN_DAYS` so it is provable RED **without editing the file**, and treats an unreadable
certificate as a FAILURE rather than a skip. `red:cert-expiry` **3/3**. §[F] has been **deleted**
from `pre-deploy-live-check.mjs` — two copies of one threshold drift apart, and that was the copy
that could not run. ⚠️ **MEASURED 2026-08-27 by the new watch:** www origin expires
**Oct 15 14:49:57 2026 GMT** and the apex **Oct 15 14:50:00 GMT** — **49 days**, both
**Let's Encrypt**. ⛔ **The note elsewhere that the two hosts have "different CAs" is wrong** —
different intermediates, same CA.

without warning, so it is ~~**`qa:live` §[F]**~~ **`qa:cert-expiry`** rather than a note in a file: it fails at 21 days
left, not at 0. Tracked as **`E-195`** in [`NEXT-PLAN.md`](NEXT-PLAN.md).

⛔ **That check reads the ORIGIN certificate, and it has to.** Since the flip, connecting to
`www.50pick.tz` returns **Cloudflare's** certificate — `CN=50pick.tz`, Google Trust Services,
which Cloudflare renews itself and which is never at risk. Railway's is a different certificate
with a different expiry:

| dialled | subject | issuer | expires |
|---|---|---|---|
| `www.50pick.tz` (the edge) | `CN=50pick.tz` | Google Trust Services | Oct 15 **12:26:23** |
| `3hwa21jh.up.railway.app` w/ SNI `www.50pick.tz` (**the origin**) | `CN=www.50pick.tz` | Let's Encrypt | Oct 15 **14:49:57** |

The first cut of the gate read the top row and went green — measuring the certificate that
renews itself while the one that can fail sat behind it. It now dials the origin and carries a
positive control that goes red if it ever reads the edge's certificate again.

⚠️ **A local resolver will lie to you for a while.** Minutes after the flip, 1.1.1.1 and 8.8.8.8
returned the Cloudflare anycast addresses while this laptop still returned Railway's
`69.46.46.31`, and `Clear-DnsClientCache` did not help — the stale cache is upstream. A check run
from here in that window measures the DIRECT ORIGIN and passes confidently about a proxy it never
touched. `qa:sse-edge` takes `SSE_RESOLVE=<ip>` for exactly this; `curl` takes `--resolve`.

**Rollback (seconds, no deploy):** set the `www` record back to `proxied:false` — dashboard, or
`PATCH /zones/{zone}/dns_records/{id}` with `{"proxied":false}`.

## ⚠️ Do NOT (guardrails for any session touching this)
- Do **not** re-edit the Cloudflare **web** records (apex/www CNAMEs, the two `_railway-verify`
  TXT) or the **mail** records — the zone is verified-correct. See runbook §3.
  ⚠️ **Amended 2026-08-24:** the `www` record's *proxied flag* was deliberately changed under
  the infra-hardening commission (above). Its CNAME target is untouched, and the guardrail
  otherwise stands — this was an authorised, recorded exception, not a precedent.
- Do **not** merge `feat/payment-adapter` — it's stale (~17 commits behind main) and would
  revert audited money code. Use `feat/payment-selcom`.
- A parallel session may be doing the **Zoho email migration** — it owns only the mail
  records (MX/SPF/DKIM), never the web records.

## R2 (KYC) — ✅ LIVE (2026-07-17) · 🔧 in-app crash fixed 2026-07-22
- `@aws-sdk/client-s3` deployed (@9f4acd3); seam `src/lib/server/storage.ts`; smoke test
  `scripts/r2-roundtrip.mjs`.
- **⚠️ Fixed 2026-07-22 — KYC/document uploads crashed in the live app** ("page hit a snag";
  server log `KYC_STORAGE=r2 but @aws-sdk/client-s3 is not installed`). Root cause: `storage.ts`
  loaded the SDK via a *computed specifier* (`["@aws-sdk","client-s3"].join("/")`) to keep it out
  of the build graph, and it was NOT in `next.config` `serverExternalPackages` — so the Next
  server bundle could not resolve it at runtime and `getS3()` threw on every upload/view. The
  `r2-roundtrip.mjs` smoke passed anyway because it runs as a **plain node script** (native import),
  never through the bundled server — false confidence. Fix: literal `import("@aws-sdk/client-s3")`
  + added it to `serverExternalPackages` (same treatment as pdfkit/exceljs). Verified: runtime
  import resolves, `tsc`+`build` green. Confirm on the live app after deploy.
- Bucket `50pick-kyc` (Cloudflare R2, WEUR). All 5 Railway vars set: `KYC_STORAGE=r2`,
  `R2_BUCKET=50pick-kyc`, `R2_ENDPOINT=https://e6e5f86245721a28fea6fe1170feba12.r2.cloudflarestorage.com`,
  `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` (secret values — Railway only).
- Verified: local + prod-env (`railway run … node scripts/r2-roundtrip.mjs`) round-trip PASS.
  New KYC uploads → R2; existing inline docs keep working (no backfill).

## Selcom payments — ✅ BUILT + LIVE (Selcom OFF), deposits validated (2026-07-17)
- Adapter + operations control-plane merged to `main` (@f7d9081) and deployed. Provider defaults
  to `mock` — nothing routes to Selcom until an officer flips the toggle in `/admin/payments`.
- **Deposit creds GENUINELY VALIDATED** end-to-end against the live gateway via the admin "Test
  Selcom" probe (2026-07-18, @213165c). The probe now hits the real `/checkout/order-status`
  endpoint (the same one the deposit reconciliation uses) and returned **HTTP 200 + envelope
  `resultcode 404` / "50pick-conn-probe not found"** — an *application-level* order-not-found,
  which means the signature + API key/secret + vendor + allow-listed IP were all accepted and the
  request reached the real order-lookup handler. A bad signature/creds returns 401/403.
  ⚠️ NOTE: the earlier "HTTP 404 = auth OK" reading (pre-@213165c) was a FALSE positive — the old
  probe hit a non-existent `/order-status` path, so its 404 was transport-level (any unsigned
  request 404s too) and never actually exercised the signature. Fixed in @213165c.
- **Full handoff (money model, creds/PINs, integration, pending, go-live switch, copy-paste
  prompt): `docs/GO-LIVE-RUNBOOK.md`.** Signing digest: `docs/SELCOM-API-DIGEST.md`.
- **Pending:** (1) one small real deposit test → flip deposits on; (2) **payouts** — Selcom
  disbursement API GRANTED 2026-07-27; set `PAYMENT_VENDOR_PIN` (or `PAYMENT_DISBURSE_*` if a
  separate account) + ship the activation phases in `docs/SELCOM-DISBURSEMENT-ACTIVATION.md`.
- ⚠️ Prod creds are **IP-allow-listed** to the Railway egress — validate from the deployed app,
  never locally.

## Env state (Railway, service `50pick`) — key flags
- Set + correct: `NODE_ENV=production`, `USE_PRISMA_DAL=true`, `TEST_FUNDING=true` (pre-launch),
  `DATABASE_URL`, `POSTMARK_API_KEY`, `POSTMARK_WEBHOOK_SECRET`, `SELCOM_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_APP_URL=https://www.50pick.tz`.
- **Selcom (deposits) — set + validated:** `PAYMENT_API_URL` (prod `apigw/v1`), `PAYMENT_VENDOR_ID`,
  `PAYMENT_API_KEY`, `PAYMENT_API_SECRET` (secret values — Railway only). `PAYMENT_AGGREGATOR`
  intentionally **unset** (→ mock; flip via admin). **For payouts (API granted 2026-07-27):** set
  `PAYMENT_VENDOR_PIN` (or the `PAYMENT_DISBURSE_*` set if Selcom issued a separate disbursement account).
- **To change at the go-live switch:** unset `TEST_FUNDING` (→ LIVE money-mode; this no longer
  changes any resolution lock — single-admin resolution is the default, two-admin authorization is an
  optional resolver-queue toggle, docs/COMPLIANCE-DECISIONS.md 2026-07-24), flip `/admin/payments` to
  **Selcom** (the mock is an operator-selectable simulator, not for real money), set real
  `NEXT_PUBLIC_LICENSE_REF` (currently placeholder `TZ-GBT-2026-XXXX`).
- **⛔ No `AUTO_SETTLE` — the var no longer exists** (nor the `/admin/payments` auto-settle toggle
  or the global settle sweep). Settlement is **per-market timer-driven**: an adjudicated market arms
  its own timer for its `objectionsClosedAt` and pays itself then; a ~5-min reconciler re-arms any
  dropped timer. Nothing to flip at the switch — instead **verify** on `/admin/system` that
  "Timers armed" is non-zero with a sane next fire, and that nothing is stuck under "Ready to
  settle" on `/admin/settlement` (which stays the human fallback: manual *Settle now* + the
  objection-frozen view). Payout gates are unchanged (objection window, objection freeze,
  winner-floor, exact conservation, idempotency). Owner decision 2026-07-24 —
  see `docs/COMPLIANCE-DECISIONS.md`.
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
