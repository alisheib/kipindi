# SESSION PROMPT — 50pick: AUDIT the identity-at-withdrawal release (validate, find every gap, fix, prove)

> Copy everything below this line into a fresh Claude Code session opened on `C:\kipindi-main`.

---

You are auditing a release that is ALREADY LIVE on **50pick** (https://50pick.tz), a licensed real-money prediction-market
and betting platform in Tanzania regulated by the Gaming Board of Tanzania. Repo `C:\kipindi-main`, branch `main`.
**Push to main = LIVE, with real players and real money.** Your job is to prove the release is correct, find every gap,
bug, visual or logical problem the previous session missed, fix what is real, and prove each fix — not to re-describe
what was built.

## 0 · Read first, in this order (do not work from memory or from this prompt's summaries)
1. `docs/LIVE-QA-CAMPAIGN.md` §6b — the topmost block, **Session 94 (2026-09-13)**, and its RESUME AT.
2. `docs/SESSION-PROMPT-KYC-AT-WITHDRAWAL.md` — the original brief, the seven rulings, the §Status table.
3. `docs/COMPLIANCE-DECISIONS.md` — every 2026-09-13 entry (the ruling; the nickname; *how a player is told — quietly*;
   *withdrawals are no longer held for a two-officer review* (2026-09-13 third)) and the 2026-09-12 socials entries with their dated notes.
4. `docs/BOARD-DISCLOSURE-KYC-AT-WITHDRAWAL.md` (a DRAFT for the owner, never sent), `docs/IDENTITY-POLICY.md`,
   `docs/FLOWS.md` §2, `docs/ROSTER-KYC-STAGE.md`.
5. `git log --oneline c63a4668..HEAD` — the release is `ac411357` (1/n) → `1699c17a` (2/n, the code, LIVE) →
   `cb654046` → `f714a6ee` → `345306ce` (docs/anchors) → the withdrawal-review removal and its docs, pushed the same evening. Read the diffs, not the messages.

## 0b · You may be running IN PARALLEL with another session — coordinate, because both of you push live
Another Claude session (or a person) may be developing something related in this same repository at the same time,
and **both of you push to `main`, which is production**. Assume it until you have checked. You must be able to work
beside it without breaking its work or shipping half of it.
- **Find it first.** Use `ListAgents` (other local sessions on this machine) and `SendMessage` to introduce yourself:
  what you are auditing, the files and areas you expect to touch, and whether you will run anything that mutates the
  repo (red harnesses) or restarts servers. Ask what it is working on. Re-check before each push. If no other session
  is reachable, write a short "IN FLIGHT" line at the top of `docs/LIVE-QA-CAMPAIGN.md` §6b (who, what, which files,
  since when) and remove it when you finish.
- **Same folder = one working tree.** `C:\kipindi-main` is shared. ⛔ Never `git add -A` / `git add .`, never
  `git stash`, `git checkout -- <file>`, `git reset`, `git clean`, never switch branches — any of these can sweep,
  hide or destroy the other session's uncommitted work (it has happened in this repo). Before staging, run
  `git status` and stage **only the files you changed**, by name (`GIT_LITERAL_PATHSPECS=1` for `[id]` paths). If a
  file you need is already modified and you did not modify it, **stop and ask the other session** instead of editing it.
- **Pull before you build on anything, and before every push.** `git fetch origin main`; if `origin/main` moved,
  integrate it (`git pull --rebase` only when your own work is committed and the tree holds nothing of the other
  session's), then **re-run the full battery on the combined tree** — a green run on a tree that no longer matches
  `origin/main` proves nothing. ⛔ Never force-push. Never push a commit that contains another session's files.
- **Deploy verification is shared too.** The served `?dpl=` on https://50pick.tz may be the OTHER session's commit.
  Check ancestry (`git merge-base --is-ancestor <yourSHA> <servedSHA>`) before claiming your change is live, and tell
  the other session when you push so it does not misread a restart.
- **Things that must not overlap:** red harnesses (they temporarily rewrite source files and require a clean tree —
  agree a window, and neither session edits while one runs); dev servers (each session its own port — check who owns a
  port before stopping a process, and never kill node machine-wide); Prisma migrations (only one session creates one;
  run `prisma migrate status` first; never two migrations racing to production); big dictionary or legal-text edits
  (`src/lib/i18n-dict.ts`, `src/app/legal/*` — one session at a time, pull first); ratchet ceilings (if both change
  a counted value, re-measure after pulling instead of trusting your earlier number).
- **When you disagree with the other session's change** (for example it reintroduces an identity prompt the quiet rule
  forbids), do not silently revert it: message it with the evidence, and record the finding.

## 1 · What the release claims (verify each claim — every one is a hypothesis until you have evidence)
- **The ladder:** register → confirm email → deposit and play → verify identity → withdraw. Identity is asked before a
  WITHDRAWAL and before nothing else. The only gate is `assertIdentityForPayout` in `src/lib/server/kyc-gate.ts`,
  called only from `withdraw()`, asking *ever approved* (`src/lib/kyc-approval.ts`).
- **The quiet rule:** identity is put in front of a player in exactly two prompts — the `/wallet/withdraw` panel
  (`KycGatePanel`, "Before you withdraw", the form is NOT rendered until approved) and ONE dismissible first-deposit
  notice on `/wallet` and the deposit return page (`kyc-first-deposit-notice.tsx`, cookie `kp-kyc-notice`, decided on
  the server by `firstDepositNoticeDue`) — plus /profile/kyc, the /profile pill, legal pages and help. No app-wide bar,
  no reminders, no receipt sentences, no emails nudging verification.
- **Final refusals** (UNDERAGE · SANCTIONED · DUPLICATE_IDENTITY, `src/lib/kyc-refusal.ts`): wallet frozen first
  (`Wallet.freezeReasons`, `src/lib/server/wallet-freeze.ts`, each lifter removes only its own reason), the document
  number stays reserved (both partial unique indexes, migration `20260913120000_kyc_at_withdrawal`, applied to
  production before the push), no restart, officer re-open. **The balance:** an officer decides one of RETURN_DEPOSITS ·
  RETURN_BALANCE · HOLD_PENDING_APPEAL · FORFEIT with a written justification, each its own audit action, reported at
  `/admin/kyc/refused` (`src/lib/server/refused-funds.ts`).
- **Money traps said to be closed:** `decideRefusedFunds` takes no lock (nested `withLock` joins the outer transaction);
  the forfeit is a compare-and-swap on the decided balance; a payout throw after the forfeit is recorded as
  `payoutError`; a paused network refuses a RETURN before anything moves; the officer's return skips the player rate
  limit.
- **Withdrawals:** **no withdrawal is held for an officer review** since the evening of 2026-09-13 (owner ruling; `WITHDRAWAL_AML_HOLD = false` in `src/lib/server/payments.ts` gates the hold branch of `dispatchWithdrawal`). Rows held before that (0 on production at the time) and deposits owed back to excluded players still go through `/admin/aml`; `AML_REVIEW_THRESHOLD_TZS` stays as the reporting line. ⚠️ Known consequences recorded, not bugs: one payout can draw up to TZS 5,000,000 from the Selcom float at once (low-float alert at 1,000,000); a refused player holding more than 5,000,000 cannot be returned the whole balance in one decision. The production drive `qa:e177` relied on the hold and is disabled — never re-enable it without re-reading why. The per-withdrawal cap stays TZS 5,000,000 (`WITHDRAW_MAX_TZS`).
- **Install popup withdrawn** (`src/lib/feature-state.ts`, `FEATURE_INSTALL=ACTIVE` re-enables); the socials panel
  stays, but not on the `/markets` list.
- **Legal:** Terms v2026-09-13 (§2, §3, new §3a, §5, §10), AML v2026-09-13, rules v2026-09-13 — en/sw/zh.

## 2 · Audit it like an adversary — lanes (run them as parallel agents; each finding must be CONFIRMED with evidence)
**A. Money and state logic.** Read every changed money path end to end: `withdraw()`, `deposit()`,
`buyPositionInner()`, `bonus-service`, `kyc-service` (review, restart, final refusal, re-open), `wallet-freeze.ts`,
`refused-funds.ts`, `payments.ts`. For each: what happens on a read failure, a concurrent request, a retry, a paused
provider, a frozen wallet with several reasons, an account approved once then re-verifying, a refusal re-opened, a
refused player who still has an open bet or an in-flight withdrawal. Prove or refute by writing a failing test first.
⛔ Never make a money gate answer "yes" to a question it used to refuse — except where a dated ruling says so.
**B. Every player surface, every state, every locale, every width — VISUAL.** States: new (no deposit) · funded ·
uploaded · pending · more-info · rejected (recoverable) · refused-final · approved · email-unverified. Pages: `/`,
`/markets`, a market detail, `/updown`, a round page, `/wallet`, `/wallet/deposit` (+ return), `/wallet/withdraw`,
`/profile`, `/profile/kyc`, `/help`, every `/legal/*`, `/auth/*`. Locales en/sw/zh. Widths 360, 768, 1280. Look for:
overlays (chat bubble, bottom nav, socials panel, the Needle), clipping, orphans, wrong tone (betting YES green / NO red
used for app state), raw keys or `{placeholders}`, English inside sw/zh, doubled units, false money or speed promises,
identity prompts where the quiet rule forbids them, broken icons, blank sections, layout shift on load.
**C. Staff console.** `/admin/kyc`, `/admin/kyc/[id]` (money card, refused-funds panel, reopen, decision rail),
`/admin/kyc/refused`, `/admin/approvals`, `/admin/players` (8th stage, `?funded=`, "Finally refused"),
`/admin/players/[id]` (freeze controls), `/admin/finance` ("Held for unverified"), `/admin/aml`, at 390 and 1280.
RBAC: a role without `canView(role,"accounting")` must never see a balance.
**D. Copy truth, all three locales.** Every string that talks about identity, withdrawals, holds, speed, fees, networks,
refunds, commission: the dictionary (`src/lib/i18n-dict.ts`), emails (`src/lib/server/email.ts`), bells
(`notification-service.ts`), the chatbot (`src/app/_actions/chat.ts`, `src/lib/chat/send-message.ts`), legal pages.
Each claim must match what the code does TODAY.
**E. Data and production (READ-ONLY).** Indexes and `freezeReasons` present, 0 `PENDING_KYC`, no withdrawal stranded
in a status nothing can release, audit chain actions present for refused-funds decisions.
**F. Guards.** For every guard the release added or changed, prove it can fail (mutation / red harness) and that its
population is the right one. A guard that is green because it inspects nothing is a finding.

## 3 · Known traps (each cost the previous session time — check, don't assume)
- **The served HTML is the truth for spacing.** Next/SWC dropped the space after `</strong>` where the text continued on
  the next source line; the source and a TypeScript compile both looked fine, and "requiredbefore" was live. Check with
  `curl -s https://50pick.tz/legal/terms | grep -oE '</(strong|em|b|i|code|a)>[A-Za-z]'`. `qa:live` [A] now asserts it
  for public routes only — the staff console has ~25 unconfirmed runs of the same shape.
- `npm run` with `-s` and a missing script name exits 1 with an EMPTY log — resolve script names from `package.json` before calling
  anything a failure.
- A CLOSED dialog kept in the DOM matched `[role=dialog][aria-modal=true]`; use `src/lib/modal-open.ts`.
- `capture @market` picks the first market, which changes after a re-seed — delete stale tiles before inspecting.
- Tailwind scans comments; the spacing scale is overridden (`p-2` = 12px, `h-10` = 80px); ratchets: spacing, type-scale,
  eyebrow-roles, ui-consistency — counts may only fall, and a fall must lower the ceiling in the same commit.
- Red harnesses mutate the REPO: run them strictly one at a time, on a clean committed tree, and make no edits while they
  run (the previous session broke its own run by editing docs mid-run).
- The machine has failing RAM: never run tsc/build/playwright concurrently.
- Parallel sessions may run dev servers from `C:\kipindi-social` on 3011/3013/3014 — never kill node machine-wide; stop
  only this repo's process on 3009.

## 4 · How to run locally
- Dev server (in-memory store, admin renders): `SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars>
  DISABLE_ADMIN_TOTP=true npx next dev -p 3009` with no `DATABASE_URL`. Seed: `POST /api/dev-test/seed-markets`,
  `POST /api/dev-test/updown-seed`. Player states: `/auth/demo?kyc=none|uploaded|pending|more_info|rejected|refused_final|approved&deposit=0|1`
  (+ `&email=unverified`; + `&hold=officer` for an officer's freeze). `deposit=0` fails the demo deposit row AND empties
  the wallet to TZS 0 (since 2026-09-14). Admin: `POST /api/dev-test/seed-admin`.
- Capture VIEWPORT TILES, never full-page screenshots (full-page fakes overlays). Hide the Next dev badge.
- Suites the release relies on (not all are in `predeploy` — run them explicitly): `test:kyc-gate`,
  `test:kyc-at-withdrawal`, `test:kyc-copy-truth`, `test:kyc-stage`, `test:refused-funds`, `test:refused-funds-race`,
  `test:wallet-freeze`, `test:updown-void-copy`, `test:rate-copy`, `test:rules-copy`, `test:cert-c1`, `test:cert-c3`,
  `test:dal-parity`, `test:control-gates`, `test:social-panel`, `test:stacking`, `test:install-invite`,
  `test:support-contact`, `test:labels`, `test:i18n`, design ratchets, `test:motion`, `qa:live`,
  `test:revoked-deadend`; red: `red:kyc-gate`, `red:refused-funds-race`, `red:refused-funds`, `red:kyc-copy-truth`,
  `red:bonus-withdrawable`, `red:install-invite`; `test:red-anchors` (baseline 11 pre-existing failures).
  Withdrawal review removal: `test:payments` (inverted — a gross 1,000,000 withdrawal is not held, the 5,000,000 cap is enforced, the switch is asserted off, a seeded legacy `AML_REVIEW` row still releases), `test:aml-dispatch-window`, `test:payout-observability`, `test:txn-search`.
- Known red on `c63a4668` before the release (not regressions): `test:failure-reasons` §10.1/10.2, `test:read-tiers` 7.1.

## 5 · Safety (non-negotiable)
- Never print, echo or commit a secret or a Railway variable value. Read production only through read-only
  transactions; never hand-apply SQL; migrations only via `prisma migrate status` → `prisma migrate deploy`.
- ⛔ Never re-mint `QA_ADMIN_PASSWORD`; never run `ADMIN_DRIVE=1` (it revokes the owner's session); never register a
  production account with the owner's email.
- Stage files by name only (never `git add -A`); `house-flow-final.png` is not ours; never skip hooks.
- A binding legal text changes only with a dated compliance entry, and with a version bump unless it is a
  player-favourable amendment on the day that version was published (as the 2026-09-13 withdrawal-review removal was,
  inside v2026-09-13 — that is not a finding).
- Commit in small, self-contained pieces, each pushed only after the battery passes on a tree that matches `origin/main`,
  so a parallel session can integrate your work without inheriting a half-finished change.

## 6 · Already known and deliberately OPEN — do not re-report as new; DO report if you find it worse than described
Read the OPEN list in §6b Session 94. Highlights: the Board letter is an unsent DRAFT; the Terms TIN is pending; sw uses
"dial" and "kidhibiti" for the same control; ~25 staff-console fused-word candidates; admin tables at 390 lack scroll
cues; admin KPI labels truncate; two different risk scores for one player; dates in en-GB for sw/zh; bilingual badge
names; the Up & Down voided card's empty band; the shared query-bar count beside a scrolling chip strip on several list
pages; the chat bubble ignores the iPhone safe area; `kycFunnel` is current-status and N+1; held-bucket floors have no
ruling; 8 approved accounts show legal names.

## 7 · Deliverables
1. A findings table: id · severity (P0 money/legal/compliance, P1 broken or misleading for players, P2 visible polish,
   P3 nit) · surface · locale/width/state · evidence (file:line, screenshot tile, served-HTML excerpt, failing test) ·
   root cause · fix.
2. Fix every CONFIRMED P0/P1 (and P2s that are cheap and safe), each with a test or guard that fails before and passes
   after, and a visual re-check for anything visual.
3. Full battery + `qa:live` + the red harnesses on the final tree; commit by name; push; confirm the served `?dpl=` on
   https://50pick.tz; re-run the signed-out live drive `scripts/live/kyc-at-withdrawal-prod.mjs`.
4. Update `docs/LIVE-QA-CAMPAIGN.md` §6b with a new topmost session block and RESUME AT, `docs/COMPLIANCE-DECISIONS.md`
   for anything that changes a ruling's substance, and the relevant status docs — in the same pass as the code.
