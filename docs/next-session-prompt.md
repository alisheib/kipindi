# Next-session kickoff prompt (copy-paste)

> Paste the block below to start the next session. Written 2026-07-16, for the
> session that integrates the payment aggregator (keys expected ~2026-07-17).

---

You are continuing 50pick (repo `F:\kipindi-main`, pushes to `main`). Read the two
always-on skills first — `.claude/skills/50pick-standards` (how we build: 9-role
gate, UI-kit, responsiveness 360/768/1280/1920, visual verification, testing, copy
rules) and `.claude/skills/50pick-audit` (ops playbook, safe DB/migration workflow,
Railway, money invariants) — then `docs/NEXT-SESSION.md`.

**State:** Final Audit COMPLETE + the §9 enhancement batch DONE & LIVE (Session M
money-ops + Session E UI/compliance, merged @ `023dfbf`). Prod is HEALTHY — verify
against `https://kipindi-production.up.railway.app` (the `50pick.tz` domain still
parks on Apache). Trackers: `docs/ENHANCEMENT-PLAN-STATUS.md`,
`docs/GO-LIVE-READINESS.md`. Nothing in the plan blocks launch except the payment
rail.

**PRIMARY TASK — payment aggregator integration (if the API keys are in hand):**
Execute `docs/PAYMENT-INTEGRATION-CHECKLIST.md` step by step on the branch
`feat/payment-adapter` (already pushed — it has the env-switched adapter scaffold;
you fill the two adapter bodies for the signed provider (selcom/azampay), wire
`PAYMENT_AGGREGATOR`/`PAYMENT_API_KEY`/`PAYMENT_API_SECRET` + the webhook secret,
confirm the inbound webhook contract in `route.ts`, map MNO→aggregator). Test:
`PAYMENTS_DEMO_ASYNC=true` suites + full gate + `e2e:money` on the local PG + a
sandbox round-trip. Then merge → main, deploy, verify, do the go-live DB hygiene
(unset `TEST_FUNDING`, format/rebaseline), and only THEN flip `AUTO_SETTLE=true`.
Ask me for: which aggregator, the API/webhook docs, the base URL + key/secret.
NEVER ship a guessed signature — every provider-specific value is marked VERIFY.

**IF the keys are NOT here yet — do safe, valuable work (no live-money risk):**
pick from the optional admin features in ENHANCEMENT-PLAN-STATUS (A) — A6
featured/pinned markets, A7 configurable compliance knobs, A13 officer/RBAC UI,
A14 scheduled reports, A15 post-publish market edit, A16 bonus windows — or the E
DENYLIST cosmetics (server-side money `toLocaleString`, resolver B≠A gate →
`twoOfficerGate`, L6 tap-targets on logo/nav/proposals). Keep each self-contained.

**Non-negotiable guardrails:**
- Every `git push` to `main` = a LIVE production deploy to the money DB.
- Before ANY push: `npx tsc --noEmit` + `npm run build` green. Before any push that
  touches money code: the FULL `npm run test:all` (not a subset) + `test:integrity`.
- Incomplete/unproven money code stays on a BRANCH — never deploy it to main.
- After every push VERIFY: technical + logical + visual (screenshot the live page)
  + live-DB HTTP 200 + `railway logs` clean. Railway CLI = alisheib07.
- Never `throw` at boot on a non-fatal condition. Money lock order wallet→market;
  claim rows on money writes. Develop/test migrations on the LOCAL disposable PG
  (`F:\pg-loadtest:5433`) only — prod gets them via deploy.
- Keep it factual (test:integrity bans 15% tax / "bilingual EN/SW" / flat-9% fee /
  teal-kit / light-theme). Keep the trackers + `CLAUDE.md` banner + memory current.

Two open policy questions for Ali (each unblocks one small money-ops item): does an
admin RG-limit override bypass the cooling-off on increases? which comm should the
"resend" action send? And a dedicated future session should do the bet-STAKE
single-`$transaction` (highest blast radius; money is already correct + drift-detected).
