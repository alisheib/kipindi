# Admin console — the open findings, written down

**Created 2026-08-11 (session 44). Status: LIVING — tick a row when it ships.**

## Why this file exists, and why the ids start at `A`

The poll lane keeps its findings in [`POLL-OPEN-FINDINGS.md`](POLL-OPEN-FINDINGS.md) with `F`
ids; the campaign register in [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) uses `E` ids. Both
are **shared with a parallel session**, and that register has already produced a collision —
two sessions filed `E-111` minutes apart. ⭐ **So the admin-console lane takes its own prefix
rather than a slice of someone else's number line.** Re-grep the ids at the moment you file,
not at the start of the session.

**Guarded by `npm run test:docs`** (link/path resolution) like every file in here.

---

## What "confirmed" means in the table below

| mark | meaning |
|---|---|
| ✅ **DRIVEN** | the control was worked in a browser, the resulting state read back from Postgres with **raw SQL**, and the screenshot read by eye |
| 🔍 **STRUCTURAL** | derived from the source only. A question, not evidence |
| ⚪ **NOT MEASURED** | named, not yet tested. Say so rather than implying coverage |

⛔ There is no fourth bucket. A grep is not a proof, a green suite is not a readable screen,
and a page that renders is not a working control.

---

## The findings

| # | slug | sev | confirmed | where |
|---|---|---|---|---|
| A1 | `view-only-roles-are-offered-act-controls` | medium | ✅ **DRIVEN** on 2 surfaces, 🔍 structural on 21 more | [`admin/privacy/page.tsx`](../src/app/admin/privacy/page.tsx) + 20 others |
| A2 | `privacy-refusal-is-never-audited` | medium | ✅ **DRIVEN** | [`admin/privacy/actions.ts`](../src/app/admin/privacy/actions.ts) |
| A3 | `refused-clicks-pollute-the-security-log` | medium | ✅ **DRIVEN** | [`control-gates.ts`](../src/lib/server/control-gates.ts) names it; two domains still carry it |

---

### A1 · `view-only-roles-are-offered-act-controls` — ⚪ NOT FIXED

**`canView` without `canAct` is a state the console very largely does not render for.**

`DEFAULT_GRANTS` ([`roles.ts:171-202`](../src/lib/server/roles.ts#L171-L202)) puts four
(role, domain) pairs into exactly that state on a domain that HAS act controls:

| role | domain | can see | cannot do |
|---|---|---|---|
| COMPLIANCE | `accounting` | insights · settlement · finance · reports · payments · transactions · config | any money action |
| COMPLIANCE | `support` | the player roster | suspend / restore / reset |
| AUDITOR | `accounting` | the same seven money pages | any money action |
| AUDITOR | `compliance` | KYC · AML · approvals · DSAR · retention · audit · objections | any compliance decision |

**Measured with [`qa:admin-act-gate`](../scripts/admin-act-gate-drive.mjs): all 23 cells
render an IDENTICAL control set to the view-only role and to a role that can act.**

⭐ **The comparison IS the measurement, which is why it needs no taxonomy of "act
controls".** `control-gates.ts` states the contract: the page must ask the same question the
action will ask and render a read-only state instead of a control that bounces — the
precedent [`admin/objections/page.tsx`](../src/app/admin/objections/page.tsx) set with
`canDecide`. So a page that gates renders *differently* for the two roles; one that renders
identically does not gate at all. The admin chrome appears in both renders and drops out of
the diff.

⚠️ **An identical render is a question, not a verdict, and 8 of the 23 cells are NOT
defects** — on `/admin/insights`, `/admin/settlement`, `/admin/compliance`,
`/admin/objections`, `/admin/aml`, `/admin/self-exclusions`, `/admin/retention` and
`/admin/approvals` the only enabled controls are shell chrome (`Refresh`, `Open admin
navigation`, `AI toolkit`), so rendering the same for everyone is correct.
⛔ **Before quoting this finding, ask which population it counts: 15 of 23 cells, not 23.**

**The cells with a real body control**, by count of enabled controls offered to the
view-only role:

| page | role(s) | enabled | what is offered |
|---|---|---|---|
| `/admin/reports` | COMPLIANCE · AUDITOR | 32 | report pack prepare / approve / submit |
| `/admin/payments` | COMPLIANCE · AUDITOR | 17 | 💰 **the real-money control-plane** — see below |
| `/admin/transactions` | COMPLIANCE · AUDITOR | 17 | |
| `/admin/finance` | COMPLIANCE · AUDITOR | 14 | |
| `/admin/privacy` | AUDITOR | 11 | 8 × **Export bundle** (a player's whole personal-data file) |
| `/admin/config` | COMPLIANCE · AUDITOR | 9 | `Save override`, `Fee model for new polls` |
| `/admin/audit` | AUDITOR | 5 | `Download Excel report`, `Download PDF report` |
| `/admin/players` | COMPLIANCE | 5 | filters only — likely benign, ⚪ not yet read |

#### ✅ DRIVEN — `/admin/payments`, and the money is SAFE

[`qa:admin-act-refusal`](../scripts/admin-act-refusal-drive.mjs), **9 passed / 1 failed**,
signed in as the seeded local AUDITOR:

- the view gate **admits** AUDITOR to `/admin/payments` (correct — they hold `accounting` view);
- the page renders the **`REAL MONEY LIVE` / `MOCK` mode toggle, the provider switcher, the
  withdrawal-status `Apply`, and eight MNO kill-switches, all ENABLED** — read off the
  screenshot by eye, not inferred;
- the kill-switch was driven through its **whole hard-confirm ceremony** (type `PAUSE`, press
  Pause), and
- 💰 **`SystemConfig['payments.killswitch']` was UNCHANGED.** The action layer refused. **No
  money control moved and nothing was stranded.**
- **CONTROL:** FINANCE ran the identical ceremony on the same control and it **did** change —
  so the refusal is the product, not a driver that never clicked. Restored afterwards.

⭐ **So this is an OFFER that lies, not a hole.** `payment-actions.ts`'s `gate()` checks
`canAct(role, "accounting")` and refuses. The defect is that the console spends an officer's
attention on a control that cannot work, on the surface where the emergency stop lives.

#### ✅ DRIVEN — `/admin/privacy`, same shape, PII instead of money

[`qa:admin-privacy-gate`](../scripts/admin-privacy-gate-drive.mjs), **13 passed / 2 failed**:
AUDITOR is admitted, sees **8 enabled `Export bundle` controls**, clicks one, and
**`SystemConfig['privacy.dsar_queue']` is unchanged — nothing was exported.** CONTROL:
COMPLIANCE's identical click succeeded and wrote `privacy.dsar.exported`.

#### Why it is worth fixing rather than shrugging at

⚠️ **9 of 47 admin pages compute `canAct` at all, and 8 of those 9 are `trading`** —
`markets`, `proposals`, `resolver-queue`, `resolver/[id]`, `updown`, `updown/proposals`,
`updown/rounds`, plus `players/[id]`. The one compliance-domain page that does it
(`objections`) is the precedent everything else was supposed to follow. **The `accounting`
domain has zero.** This is a systematic gap, not a slipped page.

**Fix, and it is Ali's call between two shapes:** ① give each page the `objections` treatment
— compute `canAct` once and pass it down, rendering read-only; or ② render the gate once in
the admin shell, since the domain is already known there (`domainForPath`), and have pages
opt in. ⛔ Do not "fix" it by widening the grants — `roles.ts` is explicit that Trading never
touches money/PII/config and Auditor is read-only everywhere.

---

### A2 · `privacy-refusal-is-never-audited` — ⚪ NOT FIXED

**Every admin gate in this codebase writes `privilege_escalation_blocked` at SECURITY
severity when it refuses. `/admin/privacy` is the only one that does not.**

The writers: [`rbac-guard.ts`](../src/lib/server/rbac-guard.ts) (`requireStaff` **and**
`requireOwner`), `payments/payment-actions.ts` `gate()`, `kyc/[id]/kyc-actions.ts` `gate()`,
`reports/pack-actions.ts`, both `resolver-queue` actions, `_actions/ai-toolkit.ts`,
`objections-service.ts`, and `markets/actions.ts` twice.

[`privacy/actions.ts`](../src/app/admin/privacy/actions.ts)'s `requireOfficer()` imports
`audit` and returns `{ ok: false, error: "Not authorised." }` with **no `audit()` call**. The
file's single `audit()` is `privacy.dsar.exported`, on the SUCCESS path.

✅ **DRIVEN, not read:** AUDITOR clicked `Export bundle`; `privilege_escalation_blocked` went
**0 → 0** and the three newest `AuditLog` rows were the two login rows and nothing else.
**CONTROL:** the same click as COMPLIANCE wrote `privacy.dsar.exported`, so the click reached
the action.

⭐ **This is a PDPA surface.** A data-subject export is precisely the attempt a regulator
would expect to find recorded, successful or not. ⚠️ It is also a difference two officers
would never notice, because the refusal message looks identical either way.

⛔ **Do not fix A2 by copying `requireStaff` into privacy.** That would be a fifth copy of a
gate that already exists in four places (see A3) — the fix is one gate, not another one.

---

### A3 · `refused-clicks-pollute-the-security-log` — ⚪ NOT FIXED, and it is A1's other half

[`control-gates.ts:19-23`](../src/lib/server/control-gates.ts#L19-L23) already states this as
a defect it exists to prevent, in its own words:

> *"clicking a control the UI offered writes `privilege_escalation_blocked` at SECURITY
> severity — so an ordinary operator's legitimate click is recorded as an attempted privilege
> escalation in the log a compliance officer reads. That is audit pollution on a licensed
> platform, not just a UX wart."*

**That was fixed for `/admin/resolver-queue` and the AI toolkit (E-18/E-19, 2026-08-01). The
same shape is still live across the whole `accounting` and `compliance` domains**, because
those pages never gained the page-side gate — which is A1.

✅ **DRIVEN:** the AUDITOR kill-switch ceremony wrote **`privilege_escalation_blocked` 0 → 1**,
and it is the newest row in `AuditLog`. So on production, a read-only auditor doing the
obvious thing on a page they were legitimately given becomes a SECURITY event.

⭐ **A1, A2 and A3 are one fix.** Gate the control at the page and none of the three can
happen: the officer is told why, no refusal fires, and there is nothing to audit or to fail
to audit.

---

## Measured facts about the live console (2026-08-11, read-only, no login)

From [`scripts/live/ops/rbac-census.cjs`](../scripts/live/ops/rbac-census.cjs) — read-only,
identity-asserted, no session touched:

- ⭐ **`RoleDomainGrant` is EMPTY on production — 0 rows.** Every (role, domain) pair resolves
  to the code `DEFAULT_GRANTS`, so a local sweep against the defaults **is** representative.
  ⛔ That is worth re-checking before trusting any future role result: the table is
  Owner-editable live at `/admin/roles`, and the day it gains a row this stops being true.
- 🔴 **AUDITOR and SUPPORT hold no account at all** — not on production, and `.env.qa.local`
  carries no persona for either. **A role sweep limited to the existing identities cannot
  exercise 2 of the 7 staff roles**, and would report a clean matrix having never touched a
  third of it. [`db:seed-staff-local`](../scripts/seed-staff-local.mts) exists for exactly
  this and creates all six non-Owner roles on the disposable cluster.
- ⚠️ **9 ACTIVE ADMIN accounts**, unchanged since the campaign's BLOCKER 3. Every one bypasses
  the grant table entirely.
- ⚠️ The other staff accounts are `PENDING_KYC`, which does **not** gate the console — the
  layout admits any `isStaffRole` with no status check.

---

## Instrument errors made while producing the above — recorded because they are the method

🔴 **Three of my own checks were wrong before the product was, and each was caught by a
CONTROL rather than by thinking harder.**

1. **The action inventory took a destructured parameter's brace as the function body.**
   `src.indexOf("{", afterName)` lands on `function f({ id }: { id: string })`, yielding a
   12-byte "body" — so **50 actions read as unguarded** on the first run. Fixed by
   paren-matching the parameter list first, then accepting only a brace group whose closing
   `}` sits at **column 0**, and asserting no body is under 40 bytes.
2. **Its population was wrong too.** It matched `/actions\.ts$/`, which misses
   `resolution-mode-action.ts` (singular) — **4 of the 30 `"use server"` files under
   `src/app/admin` were never scanned.** ⛔ The anchor for "is this a server-action module"
   is `"use server"`, not the filename.
3. **The privacy driver's card locator matched a leaf.**
   `locator("section,div").filter({hasText:/on-behalf export/i}).last()` found a div holding
   the heading but no table, and reported `rows=0` **for COMPLIANCE — a role the screenshot
   plainly shows eight controls to.** Only §5's positive control caught it. Re-anchored on
   *the table that contains the control*, asserting exactly one such table exists.
4. **The refusal driver clicked once and concluded "refused + silent".** The kill-switch is a
   hard-confirm tier: the first click only opens a panel. §5's control failed in the same run
   — FINANCE's identical click changed nothing either — which is the only reason a
   **non-firing action was not written up as a silent refusal.**

⭐ **The rule underneath all four: every refusal check needs a positive control on the same
control, in the same run.** A refusal that cannot be told apart from a broken driver is not
evidence, and three of these four would have shipped as findings without one.
