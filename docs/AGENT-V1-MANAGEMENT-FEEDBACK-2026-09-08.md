# AGENT v1 · management's feedback, closed — 2026-09-08

> ⭐ **THIS FILE IS THE HANDOVER FOR THIS SESSION AND NOTHING ELSE.** The programme's authority
> is [`AGENT-PROGRAMME.md`](AGENT-PROGRAMME.md) (what the programme IS) and
> [`RULES.md`](RULES.md) §2.10 (the money rule). Both carry the amendment; ⛔ do not restate a
> number here that lives there. What this file records is **what was done, what was found, and
> what is left** — the three things the next session needs and the two authorities do not say.

**Branch** `agent-v1-mgmt-feedback` · **worktree** `C:\kipindi-agent-v1` · 10 commits off
`origin/main@1f64ca1a`.

---

## 1 · What management asked for, and where each answer lives

Their document — *Feedback for the Agent v1* (`~/Downloads`, a .docx) — is **five annotated
screenshots of the live `/agent` page**, not prose. The annotations and their answers:

| Annotated | Their note | Done |
|---|---|---|
| "What you earn" tile | *"Agent fee = 10% of commission on winnings after tax"* | rate 20% → **10%** |
| "What it costs" tile | *"TZS 100,000 + VAT = 118,000"* | VAT treatment INCLUSIVE → **EXCLUSIVE** |
| "Approval time" tile | *"5 Working days"* | the copy AND the console's SLA measure moved to working days |
| the commission paragraph | *"Remove this and Keep this below:"* + an 8-row waterfall | paragraph deleted; waterfall rendered |

⭐ **The fourth one carried a fifth change nobody wrote down.** Their waterfall has a row the
platform had never modelled — **local withholding tax, 5% of the agent's earnings** — and its
last line reads *"Direct cash payout credited to your agent wallet"*. Drawing that table over
an engine that credited the gross would have been a false money statement, so it is implemented
for real. See `RULES.md` §2.10's Withholding row for the rule.

---

## 2 · The two things where we did NOT do exactly what the document said

Both are deliberate; both were the more truthful option. **Management should see this list.**

### 2a · Half a shilling, twice

Their table's last two rows read **552.50** and **10,497.50**. Ours read **553** and **10,497**.

TZS has no circulating subunit and every money column in this platform is a whole number of
shillings, so 5% of 11,050 is `Math.round(552.5)` = 553. Rendering `552.50` would print a figure
the ledger cannot pay. `Math.round` (not floor or ceil) was chosen because it is exactly how
`levySplit` already rounds TRA and GBT — the same kind of statutory deduction on the same fee.

⚠️ **Every other row matches their document to the shilling.**

### 2b · Their last row is mislabelled, and we did not copy the label

Their bottom row reads **"NET AGENT PAYOUT PER WINNING PLAYER"**. It is not per player — it is
the payout on the whole TZS 1,000,000 aggregate the table's first row starts from. The rendered
row reads **"Net agent payout"**. Keeping their label would have made the table contradict its
own first line.

### 2c · Two columns instead of their three (a layout call, not a content one)

Their document sets PARAMETER · AMOUNT · NOTES side by side. §A6's floor is **zero horizontal
overflow at 360px**, and in Swahili — 35–40% longer than English — a third prose column either
scrolls sideways or wraps to six lines a row. **Every word of every note is kept**, set under
its parameter instead of beside it. Verified at 360/768/1280 in all three locales.

---

## 3 · Ali's own three asks

| Ask | Done |
|---|---|
| "we don't have SMS yet … work with mail only, Postmark, usable for OTP" | invitations and their one-time codes both go through Postmark; the SMS path is gone from the agent programme |
| "fields need comments on what they are and examples and full form and input validations" | every field carries the three tiers `id-documents.ts` sets for KYC — the SHAPE in `hint`, the RULE as a full sentence, and a placeholder that is a literal specimen; refusals land ON the field |
| "full visual check … nothing is empty … paging, filtering, sorting where needed" | two new live drives, 167 assertions; search + real pagination + sortable columns on the console |

---

## 4 · Defects found on the way — 15, none of them in the brief

The brief was four numbers and a table. These were found while implementing it, and **twelve of
them were live on production** — every one below except #2 (a test fixture, not shipped code),
#3 (a would-be defect: the tax it concerns did not exist yet) and #6 (which only became a
mismatch when management changed the unit; "about 5 days" and a 5-calendar-day chip agreed).

### Money and truth

1. 🔴 **The fee refund mis-reversed VAT.** `recordFeeRefund` backed the VAT out with the
   INCLUSIVE formula whenever the stamped amount differed from today's expected total — even
   under an EXCLUSIVE treatment. It left a permanent residue in `HOUSE:TAX`, the one account the
   statutory pack is read from. Fixed with `vatWithinGross`, which states the algebra once.
2. 🔴 **`agent-application-security` attested the NET against the TOTAL.** Correct only by
   coincidence while VAT was inclusive; the flip broke four legs downstream (reconcile → approve
   → reject → refund) from one wrong fixture. The same defect was in `qa:agent-drive`.
3. 🔴 **The per-recruit cap would have silently widened** by the withholding tax, because it
   summed `amountTzs` (now the net). It sums `grossAmountTzs ?? amountTzs`, and the fallback is
   what keeps pre-2026-09-08 history correct.

### Promises the product could not keep

4. 🔴 **"A text with the link is on its way"** — there is no licensed SMS provider. `sms.ts`
   ships `console` by default, Beem and Africa's Talking are declared stubs that THROW, and the
   Selcom adapter's contract is unsigned. In production the log read *"console provider active
   in PRODUCTION … NOT delivered"* while the officer's console promised delivery, `/agent` told
   the applicant the link *"was texted to your number"*, and `/agent/invite` armed a "Text me a
   code" button that could not deliver. Both sends were `.catch(() => {})`, so nothing recorded
   the failure. The two sibling invite paths both consult `smsConfigured()` first; only the agent
   path did not.
5. 🔴 **Three surfaces asserted "VAT inclusive" regardless of config** — including the BINDING
   terms, in all three locales. Under management's flip every one of them stated the opposite of
   what an applicant is charged.
6. 🔴 **The console measured the SLA in calendar days** against a promise now in working days.
   An application submitted on a Friday was chipped "Past SLA" the following Wednesday while
   `/agent` had promised the applicant until Friday.

### Controls that did not work

7. 🔴 **`public-footer.tsx` is `"use client"` and called `getAgentConfig()`** — the exact thing
   `app-shell.tsx`'s own comment forbids ("importing a server module from a client file is what
   took every page in this app down once already"). And it was WRONG as well as forbidden:
   `defineConfig`'s cache does not cross to the browser bundle, so the client read the module
   DEFAULT and the footer link would have stayed up whatever an officer saved. **A switch that
   switched nothing.** It also stripped a paid applicant of their only route to `/agent` when
   the programme closed.
8. 🔴 **The invitation identity check string-matched the MASK** — two numbers sharing a country
   code and their last three digits "matched".
9. 🔴 **The mismatch branch was a dead end**: a lone Callout while the copy said "sign in with
   that address", and the file's header claimed the viewer "is sent to sign in with the right
   one". They were not.
10. 🔴 **The withdrawal reason reused the applicant-facing info-request note**, so typing a note
    and then withdrawing filed that note in the audit chain under the wrong action.
11. 🔴 **The workstation showed NO decision history at all**, though every mutation writes a
    COMPLIANCE audit row and `reviewerId` was loaded and never displayed. On a two-party control
    that is the one thing a case file is for.

### Things nobody could reach

12. 🔴 **"Decided" was `slice(0, 20)` with no next page** — application #21 onward was
    unreachable from the console. Invitation history cut at 10 with the truncation disclosed
    nowhere. Payables read 5,000 rows and rendered every match.
13. 🔴 **No search at all.** An officer holding a phone number, an application id or a receipt
    reference could not look it up.
14. 🔴 **The referee contact's only rule was `length >= 6`**, so `aaaaaa` passed and an officer
    discovered the unreachable referee days later, at the point of a decision. And every refusal
    on the form was a TOAST — on a four-step form, naming none of the four boxes.
15. 🔴 **`test:bridge` was ALREADY RED on `origin/main`**: `border-warning-400` does not exist,
    so the hover state on a rejected document tile compiled to nothing. Both call sites were
    agent files. **That guard is now green.**

---

## 5 · Verification — what was actually run

| | |
|---|---|
| `qa:agent-drive` | **64/64, exit 0** — five personas, the whole lifecycle, including the email invitation and the emailed code read from the server outbox |
| `qa:agent-visual` | **135/135** — the public page at 360/768/1280 × en/sw/zh: every waterfall row, zero horizontal overflow, and the payout figure measured FLAT not gold (§B4) |
| `qa:agent-visual-authed` | **32/32** — the application form's hints/examples/inline refusal, the console's search and pagers, the workstation's case file |
| `test:all` | **294/300**, failing on exactly the six already red at `origin/main` (§7) |
| red harnesses | **11/11 proven RED** across the eight agent gates (three mutations are new) |
| `next build` | green |

⚠️ **`next start` cannot serve locally** — the store refuses the in-memory fallback in
production, correctly. Local visual work runs on `next dev`; `EMAIL_OUTBOX_CAPTURE=1` is needed
to read invitation codes.

---

## 6 · ⛔ THE POST-DEPLOY STEP THAT IS NOT OPTIONAL

**Three of management's four numbers do NOT reach production on deploy if an `agent.config` row
exists.** `defineConfig` hydrates `{ ...defaults, ...restored }`, so a persisted row overrides
`defaultCommissionPct`, `feeVatTreatment` and `reviewSlaDays` with whatever an officer last
saved. `agentWithholdingTaxPct` is new and takes the default either way.

⭐ **Open `/admin/agents` → Settings on production and confirm all four read 10 · EXCLUSIVE ·
5 working days · 5.** A deploy that silently keeps the old rate is indistinguishable from a
successful one.

⚠️ **And re-price the existing agents.** A config change pre-fills NEW approvals only. Every
agent already approved keeps their own `AffiliateAgent.commissionPct` — 20% for anyone approved
on 2026-09-07 — until an officer changes it with `setAgentRate`, which emails them. Prod had
**9 admin accounts and an unknown number of approved agents** at the time of writing: check the
roster before assuming it is empty.

---

## 7 · Six pre-existing red suites, untouched

Measured on `origin/main` **before** any of this work, and unrelated to the agent programme.
Listed so the next session does not attribute them to this one:

`test:read-tiers` · `test:updown-source-class` · `test:tracker-hygiene` · `test:popup-fit` ·
`test:failure-reasons` · `test:updown-handover`

---

## 8 · What is NOT done

1. **`hint="TZS"` stays a literal** on the agent dashboard's three money tiles. It is a currency
   ISO code, identical in every locale, and the sibling `/profile/invite` page does the same —
   changing only the agent one would be the inconsistency. `test:labels` and `test:i18n` both
   pass. **A deliberate non-change, not an oversight.**
2. **The roster's sortable columns are not covered by a live assertion.** On a fresh in-memory
   store the roster renders its EmptyState and has no headers to sort, so
   `qa:agent-visual-authed` reports **NOT MEASURED** with the reason rather than passing
   serenely. `qa:agent-drive` §3 does exercise a populated roster; the SORT LINKS specifically
   are not asserted anywhere. ⭐ A seeded roster would close it.
3. **Public holidays are not modelled** in `workingDaysBetween`. Deliberate — Tanzania's move
   (two are lunar) and a wrong calendar is worse than none. The count runs slightly FAST across
   one, so an officer chases sooner, which is the only direction that cannot become a broken
   promise.
4. **Per-document rejection** is still only the coarse "Ask for more information" checkbox list.
   `DocGrid` renders per-slot `rejected` / `rejectReason` and `requestMoreInfo` is the only thing
   that writes them, which is coherent — but an officer cannot send back ONE document with its
   own reason.
5. **The admin console remains English-by-convention** (`AdminPageHead` takes `sw` for the title
   only). The ~250 hardcoded strings there are the house pattern, not a defect. ⭐ What WAS
   fixed is the subset that reaches the PLAYER: the applicant-visible service refusals and the
   fee-step copy no longer render raw English into a Swahili or Chinese UI.
6. **Phone-era invitations** issued on 2026-09-07 stay readable, revocable and previewable, and
   `requestInvitationOtp` refuses them with the remedy named ("ask the officer to withdraw it and
   send a new invitation to your email address"). ⛔ They cannot be ACCEPTED. If any are live on
   production, withdraw and re-issue them.

---

## 9 · The files that matter

| Concern | File |
|---|---|
| the waterfall arithmetic, and the engine's own split | `src/lib/agent-commission.ts` |
| working days, for the promise and the policing | `src/lib/business-days.ts` |
| the operator's levers | `src/lib/server/agent-config.ts` |
| the accrual, the withholding, the clawback | `src/lib/server/affiliate-service.ts` |
| the fee, the invitation channel, the referee rules | `src/lib/server/agent-application-service.ts` |
| the waterfall as rendered | `src/components/agent/commission-waterfall.tsx` |
| the two new migrations | `prisma/migrations/20260908120000_agent_withholding_tax`, `…130000_agent_invite_by_email` |
| the live drives | `scripts/live/agent-v1-visual.mjs`, `…-authed.mjs`, `…/agent-programme-drive.mjs` |
| the shots | ⛔ not committed — regenerate with `npm run qa:agent-visual` and `npm run qa:agent-visual-authed` against a `next dev` (they write to `docs/shots/agent-v1/`, which is git-ignored). Evidence is regenerable; the drives that assert it are tracked |
