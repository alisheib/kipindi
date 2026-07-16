# GO-LIVE DAY kickoff prompt (copy-paste tomorrow, 2026-07-17)

> Paste the block below to start the go-live session. Ali brings: payment API
> keys + docs, Cloudflare access (ideally a Zone-DNS-Edit API token), the Netpoa
> login (or does the 1-screen NS swap himself), and the Postmark DKIM record.
> Railway CLI is already logged in (alisheib07).

---

You are running 50pick's GO-LIVE DAY (repo `F:\kipindi-main`, pushes to `main` =
LIVE deploys). Read `.claude/skills/50pick-standards` + `.claude/skills/50pick-audit`
first. State: audit COMPLETE, §9 enhancements LIVE, GBT licence obtained, Railway
static egress IPs active (162.220.232.250 / 152.55.176.240 / 152.55.177.181),
payment adapter scaffold ready on branch `feat/payment-adapter`. Prod verify host:
`kipindi-production.up.railway.app` until DNS lands, then `https://www.50pick.tz`.

Execute in THIS order (details in the named docs — follow them exactly):

**1 · DNS cutover FIRST (morning — propagation needs lead time).**
`docs/CLOUDFLARE-SETUP-GUIDE.md` ⭐ §A–§D + **§C2 (mail records — the mailbox +
Postmark DKIM/pm-bounces MUST carry over or email dies)**. Free plan is fine;
grey-cloud (DNS only) until Railway certs issue. Verify: both hosts serve the app,
`railway domain status` → Verified: yes, Postmark dashboard DKIM+Return-Path green,
test email delivered to ali.sheib@50pick.tz.

**2 · R2 (parallel, while DNS propagates).** Bucket `kipindi-kyc` + API token →
Railway vars (EXACT names: `KYC_STORAGE=r2`, `R2_BUCKET`, `R2_ENDPOINT`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) → `npm i @aws-sdk/client-s3` →
KYC upload→admin-view round-trip.

**3 · Payment integration (when keys arrive).** `docs/PAYMENT-INTEGRATION-CHECKLIST.md`
on `feat/payment-adapter`: fill the signed provider's two adapter bodies (VERIFY
every endpoint/field/signature against their real docs — never guess a signature),
creds + webhook secret env, confirm `route.ts` inbound contract + `normalizeStatus`,
MNO map. Test: `PAYMENTS_DEMO_ASYNC=true` suites, full gate (tsc/build/test:all/
integrity), `e2e:money` on the local PG (drift 0.00), sandbox round-trip (deposit
push → webhook → credited exactly once; withdrawal payout; ≥1M → AML hold). Then
merge → main → deploy → verify.

**4 · THE SWITCH (only after 1–3 are green).** `docs/LAUNCH-GO-NO-GO.md` §5:
unset `TEST_FUNDING` → format/rebaseline the DB (clean genesis) → verify trial
balance = TZS 0 drift + audit chain VALID → one real small deposit→bet→settle→
withdraw round-trip → flip `AUTO_SETTLE=true` → confirm https://50pick.tz +
https://www.50pick.tz serve with valid certs → announce.

**5 · Post-launch watch.** railway logs clean · /admin/payments reconcile drift 0
· nightly `ledger.trial_balance_drift` stays quiet · first real player flows.

Guardrails (unchanged): every push = LIVE deploy; full `test:all` before any money
push; verify after every push (tech/logical/visual/200/logs); never throw at boot;
migrations on the local PG only; NEVER commit secrets (creds go in Railway vars
only); keep trackers + CLAUDE.md + memory current as you go.

Deferred BY DESIGN to the first post-launch stabilization session (do NOT do them
on launch day): bet-STAKE single-`$transaction` (highest blast radius — launch runs
on today's battle-tested code; risk is bounded: money correct + drift-detected),
Redis wiring + replicas (scale step), Cloudflare orange/WAF flip, PG load benchmark.
