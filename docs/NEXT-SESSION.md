# 50pick — next-session prompt (Final Audit remediation)

Paste-ready brief for the next session. Read the `50pick-audit` skill
(`.claude/skills/50pick-audit/SKILL.md`) and the tracker
(`docs/FINAL-AUDIT-REMEDIATION.md` → "▶ WHERE WE ARE") first.

## Suggested opening prompt
> Continue the 50pick Final Audit remediation. Read `.claude/skills/50pick-audit`
> and `docs/FINAL-AUDIT-REMEDIATION.md` first. **10/11 Criticals are done and prod
> is healthy — do NOT regress it.** Every `git push` is a live prod deploy, so
> tsc + build must pass and you must verify after each push (technical, logical,
> visual screenshot, live prod HTTP 200 + boot logs). Proceed stage by stage,
> update the tracker, commit + push after each. Start with C6, then C3.

## State at handoff (2026-07-15, main @ e3d754e)
- **10/11 Criticals closed** — only **C3** and **C6** remain.
- **Prod: HEALTHY (HTTP 200)**, clean boot; repo finalized/clean.
- Railway CLI = alisheib07; local disposable PG at `F:\pg-loadtest:5433` (skill §3).
- Design deliverables archived at `F:/50pick-design-archive/` (+ git history).

## Do next, in order
1. **C6 — audit chain (contained; do first).** Make the chain DB-authoritative:
   `pg_advisory_xact_lock` + SQL head-select + `@@unique([prevHash])` migration +
   `await persist()` for money/compliance. Verify with `scripts/load/s10-cross-instance.mts`
   on the local PG. (Fail-closed is fine for audit writes — but NOT at boot, per skill §0.)
2. **C3 — ledger provability.** Wrap wallet+txn+ledger writes in one Prisma
   `$transaction` on the money paths; write a CORRECT wallet↔ledger trial balance
   (must net `hold`/`pending`/bonus, or it false-positives) to replace the dead
   `reconcileLedger()`; nightly job + `/admin/finance` surface + alert. Verify on local PG.
3. **L2–L6** low polish · **M2** verify (fee-model rounding) · **M8** schema comment.
4. **Stage 12 — CI + Sentry.** GitHub Actions running `test:*` against a Postgres
   service container (makes C4/C6 provable in CI; also stabilise flaky `test:trilingual`).
   Sentry needs a DSN from Ali.

## Ali / ops actions (not code)
- Set `AZAMPAY_WEBHOOK_SECRET` + `MIXX_WEBHOOK_SECRET` in Railway before enabling those providers.
- Clear `test.overrides.allowConflictedResolution` via the admin UI (runtime already forces it false).
- Prune the ~6 unused Redis services on the 50pick Railway project (rate limiter is in-memory).
- Blocked/external: H2 Redis rate-limiter, H8 KYC object storage, TRA tax-base ruling,
  trademarked MNO logos, third-party pentest, DR-restore rehearsal.

## Guardrails (from the skill — do not violate)
- Every push = live deploy. tsc + `npm run build` green before pushing.
- Never `throw` at boot on a non-fatal condition.
- Money lock order is wallet → market; claim rows on money writes.
- Develop migrations on the local PG; prod gets them via the deploy, not by hand.
