# GO-LIVE session prompt — 50pick.tz (copy-paste)

> The single, self-contained prompt to run the go-live mission. Everything code
> is DONE; this session is DNS + R2 + payment keys + the switch. Written 2026-07-17.

---

You are running 50pick's GO-LIVE mission (repo `F:\kipindi-main`; every push to
`main` = a LIVE production deploy to the money DB). Read `.claude/skills/50pick-standards`
+ `.claude/skills/50pick-audit` first. Prod verify host: `kipindi-production.up.railway.app`
until DNS lands, then `https://www.50pick.tz`. Railway CLI = alisheib07.

STATE — everything code is DONE, merged, live, and verified:
- Final Audit COMPLETE (all 11 Criticals + Highs + Mediums).
- §9 enhancement batch merged + live. GBT licence obtained.
- ALL money paths atomic — bet-stake single-`$transaction` merged @ 595901e
  (independently verified: e2e:money 57/57, e2e:fault 34/34, s10 PASS).
- Payment plumbing built; only the outbound adapter body is stubbed. Adapter
  scaffold + runbook ready on branch `feat/payment-adapter`.
- Railway static egress IPs ACTIVE: 162.220.232.250 / 152.55.176.240 /
  152.55.177.181 (sent to the PSP; webhook `https://www.50pick.tz/api/webhooks/payments`).

Ali brings this session: payment API keys + docs, Cloudflare access (ideally a
scoped Zone-DNS-Edit API token for 50pick.tz), the Netpoa nameserver-swap screen,
and the Postmark DKIM record. Domain is owned at Netpoa.

RUN IN THIS ORDER (each step has a dedicated doc — follow it exactly):

1 · DNS CUTOVER FIRST (propagation needs lead time). `docs/CLOUDFLARE-SETUP-GUIDE.md`
   ⭐ section §A–§D **and §C2 (mail carry-over — the mailbox MX + Postmark DKIM/
   pm-bounces MUST be recreated or ali.sheib@50pick.tz + all app email break)**.
   Free plan is fine; grey-cloud (DNS only) until Railway certs issue. Verify:
   both hosts serve the app, `railway domain status 50pick.tz -s 50pick` →
   Verified: yes, Postmark DKIM+Return-Path green, a test email lands.

2 · R2 (parallel with DNS propagation). Bucket `kipindi-kyc` + API token → Railway
   vars EXACT: `KYC_STORAGE=r2`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY` → `npm i @aws-sdk/client-s3` → KYC upload→admin-view test.

3 · PAYMENT INTEGRATION (when keys arrive). `docs/PAYMENT-INTEGRATION-CHECKLIST.md`
   on `feat/payment-adapter`: fill the signed provider's two adapter bodies (VERIFY
   every endpoint/field/signature against their real docs — NEVER guess a signature),
   set creds + webhook secret, confirm the `route.ts` inbound contract + `normalizeStatus`,
   map MNO→aggregator. Test: `PAYMENTS_DEMO_ASYNC=true` suites, full gate, `e2e:money`
   on the local PG (drift 0.00), a sandbox round-trip (deposit push → webhook →
   credited exactly once; withdrawal payout; ≥1M → AML hold). Merge → main → deploy → verify.

4 · THE SWITCH (only after 1–3 green). `docs/LAUNCH-GO-NO-GO.md` §5:
   unset `TEST_FUNDING` → format/rebaseline the DB (clean genesis) → verify trial
   balance = TZS 0 drift + audit chain VALID → one real small deposit→bet→settle→
   withdraw round-trip → flip `AUTO_SETTLE=true` → confirm https://50pick.tz +
   https://www.50pick.tz serve with valid certs → announce.

5 · POST-LAUNCH WATCH. railway logs clean · /admin/payments reconcile drift 0 ·
   nightly `ledger.trial_balance_drift` stays quiet · first real player flows.

GUARDRAILS (unchanged): every push = LIVE deploy; full `npm run test:all` before
any money push; verify after every push (tech/logical/visual screenshot/live-DB
200/railway logs); never `throw` at boot on a non-fatal; migrations on the local
disposable PG (`F:\pg-loadtest:5433`) only; NEVER commit secrets (creds → Railway
vars or pasted in-session only); keep the trackers + CLAUDE.md + memory current.

DEFER to post-launch stabilization (NOT launch day): Redis + replicas (scale step;
Redis already in the Railway project, unwired), Cloudflare orange-proxy/WAF flip,
PG load benchmark, optional admin features (A6/A7/A13–A16). Two small policy calls
for Ali when convenient: RG-limit override vs cooling-off; which comm "resend" sends.
