# SELCOM COMPLETION — next-session prompt

> Copy the block below into a fresh session. It is self-contained.
> Written 2026-07-18 at head `420ce20`, immediately after card deposits shipped.

---

Continue 50pick (repo `C:\kipindi-main`, github `alisheib/kipindi`, branch `main`).
⚠️ EVERY PUSH TO main = LIVE PRODUCTION DEPLOY to https://www.50pick.tz — a licensed
real-money platform in Tanzania. There is no staging. Ali will deposit REAL money from
his real bank card. Treat every change as if a player's money depends on it.

⭐ FIRST read, in this order:
1. memory `project_kipindi_selcom_gateway.md`
2. `.claude/skills/50pick-standards/SKILL.md`
3. `.claude/skills/50pick-audit/SKILL.md`
4. `docs/SELCOM-API-DIGEST.md`
5. `CLAUDE.md` (the ACTIVE WORK banner)

═══ THIS SESSION HAS ONE JOB ═══
**Finish Selcom completely and perfectly: every STATE, every user-facing
NOTIFICATION, every reflection in the platform UI, and every redirect.**
Ali's words: "0 bugs, 0 flaws… everything should be visible to the user — pending
etc… and reflected into his account with the right IDs and the right emails from
us." He will NOT test until this is done. Take as long as it needs.

DO NOT re-do these — they shipped and are verified (`3a31a87`):
- the Selcom card rail (`selcomCardCheckout`, hosted checkout, base64 gateway URL)
- `/wallet/deposit/return` (settles from the SIGNED order-status re-query only)
- `/wallet/receipt/[id]`
- email mandatory at sign-up + the first-deposit email gate + email-or-phone sign-in
- the 5 money fixes (INPROGRESS→FAILED, tester-float mint, boot seeder, card
  mis-routing, email uniqueness)

═══ THE CONFIRMED GAPS — FIX ALL OF THEM ═══

**G1 · The deposit receipt email carries the WRONG reference.** (HIGH — Ali called
this out explicitly.) `wallet-service.ts` → `settleDepositConfirmed`:
```ts
html: depositConfirmedHtml({ ..., reference: t.id, ... })
```
`t.id` is our internal `txn_…`. The player, the bank and Selcom all key off the
GATEWAY reference (`t.providerRef`, `dep_…`). The email must carry BOTH, clearly
labelled, and match what `/wallet/receipt/[id]`, `/wallet/deposit/return` and
`/admin/transactions` show. One payment must have ONE set of identifiers everywhere.

**G2 · A FAILED deposit tells the player NOTHING.** `settleDepositFailed` writes an
audit entry and stops — no notification, no email. A player whose card was declined,
or whose payment was reconciled to failed 30 minutes later, is never informed. On a
real-money platform that is unacceptable. Add a notification + email, and make sure
they say plainly that **no money was taken**.

**G3 · A PENDING deposit tells the player NOTHING.** Nothing fires when a deposit is
initiated and left PROCESSING. On mobile money that can be up to 30 minutes of
silence — the exact condition that makes a player pay twice. Add a "we're waiting for
your bank / your payment is processing" notification (and decide, with reasons,
whether an email is right here too — it may be noise for a 5-second gap, but a
30-minute gap needs one).

**G4 · An RG-reversed deposit tells the player NOTHING.** In `settleDepositConfirmed`
the `rgReversed` branch deliberately sends no email. A self-excluded player whose
deposit was auto-reversed must still be told what happened to their money.

**G5 · `/admin/payments` is not clear enough about what is ON and OFF.** (Ali: "what
to turn on, what to turn off, I need clear UI.") It must state, unmistakably and at
the top: real-money mode (LIVE/TEST), the ACTIVE provider, and — when the platform is
LIVE but the provider is still `mock` — a loud banner saying **every deposit is being
refused right now** and exactly which control fixes it. Note `getPaymentProvider()` is
`store.provider ?? envProvider()`, so a persisted `mock` silently outranks
`PAYMENT_AGGREGATOR=selcom` (which IS already set in Railway). That precedence is
invisible in the UI today and it is the single thing blocking a real deposit.

**G6 · Verify (don't assume) that every confirmation actually FIRES end-to-end**, with
the right recipient and the right IDs:
  - sign-up confirmation email · email-verification email
  - deposit receipt email + in-app notification
  - the on-screen success/pending/failed state
  - the transaction in the player's own wallet history, with a correct status label
  - the matching row in `/admin/transactions`, carrying the gateway reference
I verified the RENDERED UI in a browser but I did **not** verify the email/notification
side effects. Assume nothing; drive it and read the output.

**G7 · Audit every STATE and its redirect.** Build the full state table
(PROCESSING · CONFIRMED · FAILED · REVERSED · AML_REVIEW) × (mobile money · card) and
prove each one has: a correct player-visible label, a notification, an email where it
matters, a sane redirect, and an admin view. `/wallet/wallet-client.tsx` maps status →
`confirmed | pending | review` tones — check every real status maps to something
truthful, and that PROCESSING deposits are visible rather than silently absent.

═══ HOW TO TEST (all of this already exists — use it) ═══
- `scripts/selcom-stub-gateway.mjs` — local Selcom stand-in. The real creds are
  IP-allow-listed to Railway's egress, so the card rail **cannot** be exercised
  locally any other way. Outcome is chosen by the amount's **last two digits**:
  `00` pays · `11` pending · `22` in-progress · `33` rejected · `44` user-cancelled ·
  `55` create-order fails.
- `npm run test:card-deposit` (48) · `test:deposit-gate` (42) · `test:auth-email` (61)
- `npx tsx scripts/card-flow-e2e.test.mts` — 100 assertions, incl. every failure path;
  asserts balance == sum(CONFIRMED deposits) after every case.
- `node scripts/browser-journey.mjs` — the real UI, signup → gate → verify → card →
  return → receipt → wallet. Needs a dev server wired to the stub:
  ```
  node scripts/selcom-stub-gateway.mjs &
  PAYMENT_API_URL=http://127.0.0.1:4599/v1 PAYMENT_API_KEY=stub-key \
  PAYMENT_API_SECRET=stub-secret PAYMENT_VENDOR_ID=STUBVENDOR \
  PAYMENT_AGGREGATOR=selcom NEXT_PUBLIC_APP_URL=http://localhost:3000 npx next dev -p 3000
  ```
- `node scripts/deposit-journey-shots.mjs` — 4 widths × 3 locales, and it FAILS on
  overflow / console errors / untranslated keys.
- `/auth/demo?email=verified|unverified|none` picks which side of the deposit gate you
  land on. `/api/dev/verify-link` returns the real confirmation URL. Both 404 in prod.
- Emails print to the console as `[email-stub]` locally — that is how you prove G1–G4
  without a live inbox. **Assert on the rendered HTML, not just that a send was called.**

═══ GOTCHAS THAT ALREADY COST HOURS ═══
- `ConfirmModal` renders **confirm FIRST, cancel LAST** — `.last()` clicks Cancel.
- Provider radios are `sr-only`; click the **label**.
- DOB is a segmented DD/MM/YYYY mask — fill `input[aria-label="Day"|"Month"|"Year"]`.
- Tailwind: an **unnamed `group` is satisfied by any ancestor `.group`**. This lit the
  "selected" tick on every provider tile at once. Groups are now named
  (`group/tile`, `group/deposit`) — keep them named.
- `navigator.vibrate` console errors under Playwright are a browser policy notice, not
  an app error. Filter them; don't let them mask a real one.
- A **production build refuses the in-memory store**, so local visual passes need
  `next dev`.
- `clientMeta()` now fails open outside a request scope — don't re-introduce a throw.

═══ ENVIRONMENT / STATE OF THE WORLD ═══
- DNS is DONE: `50pick.tz`, `www.50pick.tz` and `kipindi-production.up.railway.app`
  all serve the same Railway instance (verified 2026-07-18).
- `NEXT_PUBLIC_APP_URL=https://www.50pick.tz` is **money-load-bearing** — it builds the
  card `redirect_url`/`cancel_url` and the email-confirmation link.
- Set in Railway: `PAYMENT_AGGREGATOR=selcom`, `PAYMENT_WEBHOOK_URL`,
  `PAYMENT_API_*`, `PAYMENT_VENDOR_ID`, `SELCOM_WEBHOOK_SECRET`.
- `TEST_FUNDING` and `TESTER_BOOTSTRAP_PHONES` are DELETED (both minted money).
  `ADMIN_BOOTSTRAP_PHONES` is a DIFFERENT variable — Ali's 4 admin numbers — KEEP IT.
- `PAYMENT_VENDOR_PIN` is unset → **cash-out is BLOCKED** on Selcom's side. Deferred;
  do not spend time on it. The email to send Selcom is `docs/SELCOM-DISBURSEMENT-REQUEST.md`.
- The prod DB is NOT reachable from a dev machine (`postgres.railway.internal`). For DB
  reads/writes, hand Ali copy-paste SQL for Railway → Postgres → Data.
- The F: disposable-Postgres drive was NOT attached last session, so the real-PG money
  run did not happen. Try `F:\pg-loadtest` (see the audit skill §3); if it is missing,
  say so plainly rather than implying PG coverage.
- `NEXT_PUBLIC_LICENSE_REF` is still `TZ-GBT-2026-XXXX` — ask Ali for the real GBT number.

═══ TWO OPERATOR ACTIONS STILL OPEN (Ali does these, in the admin UI) ═══
1. `/admin/payments` → set provider to `selcom`. Until then every deposit is refused.
2. Clear the persisted `test.overrides` conflicted-resolution flag (warns each boot).
   POCA §16 is enforced at runtime regardless — hygiene, not exposure.
Make G5 good enough that both are obvious without explanation.

═══ STANDARDS (non-negotiable) ═══
UI-kit only — extend the kit, never hand-roll a duplicate. ONE control per setting;
if shown elsewhere, mark it display-only via `ControlledElsewhere`. Money is always
`formatTzs`. Palette royal-268; YES=green/NO=rose untouchable. EN+SW+ZH parity
(`npm run test:i18n`) — never hardcode user-facing copy. NEVER push without
LOGICAL (`npx tsc --noEmit` + `npm run build` + `npm run test:all`) **and** VISUAL
(actually LOOK at the screenshots) **and** COMPLIANCE (role gates, audit logging, no
PII leak, no money minted) all green. Verify after every push: deploy SUCCESS +
`/api/health` 200 + `railway logs -s 50pick` clean.

AUTONOMY: Ali grants full access — push without asking. `railway variables` read AND
write both work. Keep docs in the SAME commit: `CLAUDE.md` banner,
`docs/GO-LIVE-CONTINUATION-PROMPT.md`, and this file. Update the memory at session end.

FINISH BY: (1) the complete state × rail × notification table, with evidence each one
fires; (2) proof you ran the whole flow repeatedly with identical results; (3) the
screenshots you actually looked at; (4) a plain go/no-go for Ali. He does not test
until you say it is ready.

---

# ✅ COMPLETED — 2026-07-19

All seven gaps closed, plus one that was not on the list and one whole flow the
owner asked for mid-session. Everything below is proven by a named suite.

## G1–G7

| Gap | What was wrong | Fix | Proof |
|---|---|---|---|
| **G1** | Receipt email carried `t.id` only — the player's bank and Selcom both key off the GATEWAY ref | `depositRefRows()` prints **both**, labelled "50pick reference" / "Gateway reference", shared by every deposit email; matches receipt, return leg, admin table, wallet row | `deposit-notifications` A9–A12 |
| **G2** | FAILED deposit wrote an audit row and told the player **nothing** | Notification + email, both leading with **"No money was taken"**; friendly reason mapper (never a raw gateway code) | B1–B14, H4–H6 |
| **G3** | PROCESSING deposit told the player nothing for up to 30 min | Inbox entry fires **immediately** ("don't pay again"); the **email** is withheld until the deposit is actually slow, sent once by `notifyStillPendingDeposits` | D1–D7, E1–E10 |
| **G4** | RG-reversed deposit sent nothing at all | Notification + email explaining the reversal; deliberately **no** CTA back into depositing | C1–C12 |
| **G5** | `/admin/payments` didn't say what was on/off | Active provider chip beside the mode badge; a loud `Callout` naming the live consequence + the exact control that fixes it; env-precedence made visible (`store.provider ?? env`) | screenshots 360/1280 |
| **G6** | Confirmations never verified end to end | Asserted on **rendered HTML**, not "was send called" — via a guarded test-only outbox | all suites |
| **G7** | Statuses collapsed/untruthful | 1:1 status map (7 states), trilingual lexicon, exhaustive receipt table (no `?? PROCESSING` fallback), receipt link on PENDING too | i18n + suites |

## Not on the list, found on the way

- **The reconcile sweep was never scheduled.** `reconcileStalePayments` was written, tested and
  documented as "intended to run on a schedule" — and nothing called it. A deposit the player
  genuinely PAID whose webhook was lost sat PROCESSING forever. Now on the lifecycle ticker
  (5-min cadence). Ali chose deposits **and** withdrawals.
- **`bg-no-soft` is not a real token** — the pre-existing `/admin/payments` warning had *no
  background at all*.
- **Login rewrote `user.email` from `PHONE_EMAIL_MAP` without clearing `emailVerifiedAt`**
  (BLOCKER). Laundered an unconfirmed inbox into a verified one, clobbered profile edits, and
  skipped the duplicate check. **The var is set in prod, to Ali's own test number.**
- **"Sent. Check your inbox." was returned unconditionally**, including for hard-bounced
  addresses the app refuses to mail — a permanent, un-exitable no-deposit state.
- **The confirmation link was click-tracked** — the one link that opens the money-in path.
- **A duplicate EMAIL was reported as a duplicate PHONE**, with a CTA to sign in with a phone
  that had no account: an infinite loop that never named the real cause.
- **NIDA copy claimed a check that does not happen** ("checked against the National
  Identification Authority"; "NIDA verified"). `nida.ts` is a deterministic mock. Copy now
  states what is true: we record the number, compliance reviews it against the documents.
- Admin email override bypassed the single writer; email editor persisted the literal
  string `"Player"` as a display name.

## Owner-requested, added this session

**A standing app-wide unconfirmed-email bar.** Confirming your email is what unlocks
depositing, but the only place that said so was the deposit page. Now every page shows it,
with **Resend in the bar**. Built as a new kit primitive `NoticeBar` (`src/components/ui/`),
and the pre-existing hand-rolled `AnnouncementBanner` was moved onto it too.

## Test surface added

`npm run test:deposit-notifications` (71) · `npm run test:auth-email-integrity` (28).
Both auto-discovered by `test:all` (now 77 suites).

## Still open — NOT done by this session

- **Cash-out is still blocked** on `PAYMENT_VENDOR_PIN` (Selcom-side). Deposits only.
- `NEXT_PUBLIC_LICENSE_REF` is still `TZ-GBT-2026-XXXX`.
- **`F:\pg-loadtest` was NOT attached** — the real-Postgres money run did not happen this
  session. The new `pendingNotifiedAt` migration is additive/nullable and was reviewed as SQL
  and exercised in-memory only.
- 119 pre-existing tap-target (<40px) failures in `deposit-journey-shots`. **Verified
  identical on a clean tree (510/119 both before and after), so none are from this work** —
  but they are a real standards gap someone should close.
- `PHONE_EMAIL_MAP` is still set in prod. It is now read-only (delivery fallback), so it is
  no longer dangerous — but it should be unset once Ali no longer needs it.
