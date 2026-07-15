# Final Audit Remediation — progress tracker

<!-- ═══════════════════════════════════════════════════════════════════════
     ▶▶▶  CURRENT STATUS — update this block at the end of EVERY stage  ◀◀◀
     Any new session: read THIS block first to know exactly where we are.
     ═══════════════════════════════════════════════════════════════════════ -->
> ## ▶ WHERE WE ARE
> - **STAGE 6 of 12 complete.** Next: **STAGE 7 — Concurrency & webhook security (C4, C5, M4)**.
> - **Closed so far:** C1, C2, C7, C8, C9, C10, C11, H7, H12, M9, M11, M12.
> - **Next up:** Stage 7 (C4, C5, M4) → 8 (C3, C6) → 9 (scale H4/H5/M1/M3/M5/M6/M7) → 10 (a11y H1/H10/H11 + L1–L6) → 11 (cleanup) → 12 (CI/Sentry).
> - **Blocked on Ali/infra:** C4/C6 full proof needs a local Postgres; H2 Redis; H8 object storage; H6 Sentry DSN; TRA tax ruling; MNO logos; pentest.
> - **Verify locally:** `npm run typecheck` · per-suite `npx tsx scripts/<name>.test.mts` · full `npm run test:all`.

**Source:** `Final Audit 1507/50pick-FINAL-AUDIT-v8-FINAL-2026-07-15.md`
**Started:** 2026-07-15 · **Owner:** Ali · **Driver:** Claude
**Goal:** every launch-gate box ticked, 100% functional, before real money.

## How this file works
- The audit is the specification. This file is the **execution plan**, divided into stages.
- After each stage: tests run → this tracker updated → committed → pushed.
- Status legend: `[ ]` not started · `[~]` in progress · `[x]` done+verified · `[A]` Ali/external-blocked (cannot be closed in code by an agent).
- **A finding is only `[x]` when its reproduction is re-run and its "Done when" boxes pass.**

## Re-baseline note (critical)
The audit was written against the **committed HEAD**. Since then, an uncommitted,
fully-tested **capped-fee-model** feature (Ali's decision, `docs/FEE-MODEL-DECISION-2026-07-14.md`)
was in the working tree. It **already resolves C1** (the 15% withholding tax on principal is
deleted; deposit→withdraw now returns 99,000 not 85,000) and touches C8 copy and M2 rounding.
Stage 1 commits that work so the remaining findings are mapped against the real tree.

Verified at baseline (2026-07-15): `tsc --noEmit` clean · `test:fee-model` 77/77 · `test:withdrawal` 16/16.

---

## Stage map

| Stage | Theme | Findings | Status |
|---|---|---|---|
| 1 | Baseline — commit fee model | C1 ✓, M2 (verify), C8 partial | `[x]` |
| 2 | Repo integrity & hard-locks | C10, C7, H7, M11, M12 | `[x]` |
| 3 | Documentation authority | C9, §16 | `[x]` |
| 4 | Brand identity | C11 | `[x]` |
| 5 | Money copy & disclosure | C8, H12, M9 | `[x]` |
| 6 | Bonus integrity | C2 | `[x]` |
| 7 | Concurrency & webhook security | C4, C5, M4 | `[ ]` |
| 8 | Ledger provability & audit chain | C3, C6 | `[ ]` |
| 9 | Scale & performance | H4, H5, M5, M3, M1, M6, M7 | `[ ]` |
| 10 | Security, a11y, design polish | H1, H10, H11, L1–L6 | `[ ]` |
| 11 | Repo cleanup | §15 / §18 | `[ ]` |
| 12 | CI & observability | H9, H6 | `[ ]` |
| — | External / Ali-blocked | H2, H8, pentest, TRA ruling, MNO logos | `[A]` |

---

## Finding-by-finding status

### Critical
- `[x]` **C1** — tax on principal → **DELETED** by fee model. `computeWithdrawalTax` gone (`payments.ts:87`). Verified: `test:withdrawal` deposit→never-bet→withdraw = 99,000.
- `[x]` **C2** — bonus no longer evaporates on void. `refundBonusToActive` now mints a zero-wagering **restitution grant** when no ACTIVE grant remains, so it NEVER returns less than requested; `bonus.refund_forfeited` is unreachable in the normal path. Ledger↔wallet can't diverge: the wallet refund always equals the `bonusPart` the ledger already recorded (chosen over reordering, which would invert the wallet→market lock order and risk deadlock). New test `scripts/bonus-void-restitution.test.mts` 16/16; bonus suites 59+24+33 still green. **Ali/ops:** audit-query historical `bonus.refund_forfeited` and compensate; nightly `bonusBalance == Σ ACTIVE remaining` lands with C3 (Stage 8).
- `[ ]` **C3** — ledger fire-and-forget + blind reconcile → atomic `$transaction` + trial balance. *(Stage 8)*
- `[x]` **C4** — RG deposit cap + daily loss cap **re-checked inside `withLock`**; `sumDepositsSince` gains `includePending` (counts PROCESSING) for the cap/SOF paths only (dashboard stays confirmed-only); deposit reservation (check+SOF+PROCESSING row) is now atomic. New `scripts/rg-limit-race.test.mts` (npm `test:rg-race`) 5/5: 10 concurrent 100k deposits → exactly 1 clears (was 10×); concurrent bets stop at the loss cap. Existing concurrency 34/34, wallet-atomic 8/8, loss-limit 7/7 still green. **Ali/ops:** the DB-level `DailyDepositTotal` (conditional UPDATE) upgrade from the audit is optional hardening.
- `[ ]` **C5** — webhook replay via missing timestamp → mandatory ts, sign `ts.body`, nonce table. *(Stage 7)*
- `[ ]` **C6** — audit chain forks multi-instance → DB-side head + `@@unique([prevHash])` + await persist. *(Stage 8)*
- `[x]` **C7** — POCA §16 lock **restored** (`test-overrides.ts`: prod returns `false` unconditionally + `assertProductionComplianceLocks()` refuses boot if flag ON, wired in `instrumentation.ts` via `boot-checks.ts`). Tests: solo-resolution 18/18, officer-conflict 33/33. **Ali/ops:** verify prod DB flag=false + audit query for historical conflicted resolutions.
- `[x]` **C8** — the "tax on winnings" copy is **gone**. Fee model rewrote `taxNotice`/`taxBody` in EN/SW/ZH to "a {pct}% withdrawal fee applies, and nothing else; no tax is withheld from your money." Verified all three locales. **Ali:** legal review of final wording.
- `[x]` **C9** — kit mandates **removed** (CLAUDE.md source-of-truth row + "Working with Ali" hero note; README.md row) → now point at `docs/DESIGN_AUTHORITY.md` (**written**, B1–B4). `kit-gap-audit.md` marked historical + rule retired; teal-kit `tokens.css`/`README.md` carry SUPERSEDED headers; `design-master-brief.md` marked authoritative. Grep clean: no active kit mandate. **Stage 11 tail:** physically delete `50PICK/design_handoff.../` + fix 10 code comments citing the kit (§18.8).
- `[x]` **C10** — `db-check.cjs` **removed** (`git rm`); `.gitignore` blocks `db-check.*`, `*-check.cjs`, `scratch-*`, `*.zip`, `*.docx`. **Ali/ops:** check git history + CI/shell logs for any leaked NIDA output; if it ran against prod, treat as a disclosure event.
- `[x]` **C11** — brand assets **regenerated** from a single source. New `src/lib/brand-mark.ts` defines the mark once; `brand.tsx` imports it; `scripts/build-brand-assets.mts` (npm `build:brand`, sharp) emits the 4 SVGs + 7 PNGs; old `build-logo-png.mjs` (Playwright, re-declared old mark) removed. Grep gate `<text|r="44.6"` → 0. **Verified visually:** mark-color-512, tile-512, maskable-512 all render the needle mark (no ring/numerals); OG/twitter already the new mark. **Ali/ops:** confirm PWA install icon + email header at runtime after deploy.

### High
- `[x]` ~~H3~~ — RETRACTED by auditor; headers exist in `src/proxy.ts`. No action.
- `[ ]` **H1** — JSON-LD XSS → escape `<`, Zod title schema. *(Stage 10)*
- `[A]` **H2** — in-memory rate limiter → Redis/Postgres bucket (needs infra). *(documented; Stage 12 partial)*
- `[ ]` **H4** — `/api/health` full-scan → `user.count()`. *(Stage 9)*
- `[ ]` **H5** — NIDA dup check loads all images → indexed `findFirst` + `select`. *(Stage 9)*
- `[~]` **H6** — no error monitoring → Sentry (needs DSN from Ali; scaffold). *(Stage 12)*
- `[x]` **H7** — webhook env names **fixed** (`.env.example`, `RAILWAY.md` now list `SELCOM_/AZAMPAY_/MIXX_WEBHOOK_SECRET`); `boot-checks.ts` warns per missing secret in production. **Ali/ops:** staging webhook round-trip.
- `[A]` **H8** — KYC base64 in Postgres → object storage (needs storage provider). *(documented)*
- `[~]` **H9** — no CI → GitHub Actions + Postgres service. *(Stage 12)*
- `[ ]` **H10** — 5 WCAG contrast fails → `btn-no`, `btn-danger`, `--border-control`. *(Stage 10)*
- `[ ]` **H11** — no skip link → add to `app-shell.tsx` + EN/SW/ZH. *(Stage 10)*
- `[x]` **H12** — withdraw confirm now shows **amount → −fee → you receive (net)**, plus provider. Fee computed by new isomorphic `computeWithdrawalFee(amount, rate)` in `payout.ts`, used by BOTH the modal and `wallet-service` — shown == charged, to the shilling. Verified: `tsc` clean · `test:withdrawal` 16/16 (server math unchanged). **Ali/QA:** visual pass of the modal.

### Medium
- `[ ]` **M1** 64-bit lock hash *(Stage 9)* · `[~]` **M2** largest-remainder (verify fee model) *(Stage 1)* · `[ ]` **M3** indexes *(Stage 9)* · `[ ]` **M4** webhook amount *(Stage 7)* · `[ ]` **M5** remove `db.user.list()` *(Stage 9)* · `[ ]` **M6** idempotency keys *(Stage 9)* · `[ ]` **M7** atomic increment *(Stage 9)* · `[ ]` **M8** schema comment (with H8) *(Stage 9/doc)* · `[x]` **M9** deposit confirm added (`DepositConfirm` mirrors withdraw; shows amount, provider, MSISDN) · `[x]` **M11** next-themes **removed** from package.json · `[x]` **M12** tsconfig **scoped** to `src/`+`scripts/*.ts`+configs; stale excludes replaced with `50PICK`/`Final UI enhancement Kit`; design mocks no longer swept; `tsc` clean.

### Low
- `[ ]` **L1** hex validation · `[ ]` **L2** winnersPaid derived · `[ ]` **L3** tokenise hex · `[ ]` **L4** finalPayout=refund · `[ ]` **L5** `--royal-*` canonical · `[ ]` **L6** 44px targets *(all Stage 10)*

---

## Stage log
_(appended after each stage)_

- **Stage 1 — DONE (commit `1614a7c`, pushed).** Committed the verified capped-fee-model feature (65 files). C1 closed. Baseline: `tsc` clean · fee-model 77/77 · withdrawal 16/16.
- **Stage 2 — DONE.** C7 (POCA §16 hard-lock restored + boot assertion), C10 (`db-check.cjs` removed + gitignore), H7 (webhook env names + boot warning), M11 (next-themes removed), M12 (tsconfig scoped). New file `src/lib/server/boot-checks.ts`. Verified: `tsc` clean · solo-resolution 18/18 · officer-conflict 33/33 · config-persist 10/10.
- **Stage 3 — DONE.** C9 closed (docs only). Rewrote CLAUDE.md (2 mandates) + README.md to point at new `docs/DESIGN_AUTHORITY.md`; superseded headers on teal kit + kit-gap-audit (rule retired); authoritative header on design-master-brief. Grep clean: no active kit mandate. Docs-only — no code/test impact.
- **Stage 4 — DONE.** C11 closed. Single-source brand pipeline (`src/lib/brand-mark.ts` → `brand.tsx` + `scripts/build-brand-assets.mts`, npm `build:brand`). Regenerated 4 SVGs + 7 PNGs; removed old Playwright script. Verified: `tsc` clean · grep gate 0 · PNGs eyeballed (needle mark, not the old ring) · OG images already correct.
- **Stage 5 — DONE.** C8 (copy already trilingual via fee model), H12 (withdraw confirm shows amount/−fee/net via shared `computeWithdrawalFee`), M9 (new `DepositConfirm`). +2 i18n keys (confirmDeposit/depositSendBody) all locales. Verified: `tsc` clean · `test:withdrawal` 16/16 · `test:i18n` parity PASS.
- **Stage 6 — DONE.** C2 closed. `refundBonusToActive` mints a zero-wagering restitution grant when no active grant remains (never forfeits). New `scripts/bonus-void-restitution.test.mts` (npm `test:bonus-restitution`) 16/16. Verified: `tsc` clean · bonus-service 59/59 · bonus-betting 24/24 · emergency-void 33/33. **Policy note for Ali:** restitution is zero-wagering per the audit ("turnover already served"); if bonus-abuse-via-void is a concern, the wagering requirement on the restitution grant is the lever to revisit.
