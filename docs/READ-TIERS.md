# READ_TIERS — what a support agent may READ, and how that becomes data rather than a habit

> 🟠 **THIS IS A DESIGN FOR AGREEMENT, NOT SHIPPED CODE.** Nothing in §3 exists yet. It is
> written first on purpose: `docs/SESSION-PROMPT-JAY-COMMENTS.md` unit K says *"design the tier
> in `docs/` first and get it agreed, then build it through the data-driven matrix at
> `/admin/roles` — never a new hardcoded check."*
>
> **Author** session 65 (2026-08-26) · **Status** ⛔ **awaiting Ali's ruling on §4** · **Blocks**
> Jay unit K (#12 customer-care surface, #13 `msaada@50pick.tz`).

---

## 0. Why a second axis at all

The platform already has a role model, it is already data-driven, and it already works. This
document does **not** propose replacing it. It proposes one thing the existing axis structurally
cannot express.

**What exists** (`src/lib/server/roles.ts`, verified against production 2026-08-26 with
`scripts/live/ops/rbac-census.cjs`): seven roles × seven **domains**, each cell one of
`—` / `view` / `view+act`, overridable per-cell in `RoleDomainGrant` and edited at `/admin/roles`.

```
role       overview   accounting growth     compliance trading    ops        support
ADMIN      VA         VA         VA         VA         VA         VA         VA
COMPLIANCE V          V          —          VA         —          —          V
MODERATOR  V          —          —          —          VA         —          —
FINANCE    V          VA         —          —          —          —          —
GROWTH     V          —          VA         —          —          —          —
AUDITOR    V          V          —          V          —          —          —
SUPPORT    V          —          —          —          —          —          VA
```

⭐ **Measured, not assumed: `RoleDomainGrant` holds ZERO override rows on production**, so the
code defaults above *are* the live matrix, and `rbac-census.cjs` reports `0 cell(s) differ`.

**The gap.** A domain grant answers *"may this role reach this **route**?"*. It cannot answer
*"may this role read this **field**?"* — and the two questions have different answers on exactly
one surface, which is the surface unit K is about.

---

## 1. What a SUPPORT agent can see and do TODAY — measured, not inferred

`ROUTE_DOMAINS` maps `/admin/players` → **`support`**, and SUPPORT holds **`view+act`** there.
So the whole player drill-down is already open to them. Read from
`src/app/admin/players/[id]/page.tsx` rather than from memory:

| On the page | State today | Gate |
|---|---|---|
| Phone number | **Masked** — `+255*****01` (`:205`) | none needed |
| KYC document number | **Masked** — first 4 … last 4 (`:484`) | inside the KYC tab |
| Email address | **FULL, in the clear** (`:207-211`) | ⛔ none |
| Date of birth | **FULL** (`:487`) | ⛔ none |
| Region | **FULL** (`:205`) | ⛔ none |
| Wallet balance | **FULL**, on a KPI (`:275`) | ⛔ none |
| Lifetime deposits | **FULL**, on a KPI (`:275`) | ⛔ none |
| Suspend / unsuspend the account | available | `capSupport` ✅ |
| Reset the player's password | available | `capSupport` ✅ |
| Adjust the balance | hidden | `capMoney` (accounting) ✅ |
| Export the player's data | hidden | `capCompliance` ✅ |
| Force KYC re-verification | hidden | `capCompliance` ✅ |

⭐ **The good news first, because it changes the size of this job.** Every *action* on that page
is already capability-gated, and the two highest-risk reads — the phone number and the identity
document — are **already masked for everybody, including ADMIN**. This is not a greenfield
permission system; it is a page that got most of the way there and never had the reads audited.

🔴 **What is actually open:** a support agent reads **every player's exact wallet balance,
lifetime deposit total, full email address, date of birth and region.** None of those are
needed to answer *"where is my withdrawal?"*, and three of them (email, DOB, region) are the
identity set an attacker wants.

⚠️ **AND THE PRECEDENT IS ON RECORD.** Unit K's brief cites an earlier audit finding *"a
read-only AUDITOR being offered the payment kill-switches"*. The same shape is here in the
reads: a role scoped to *support* is handed *accounting* and *compliance* facts because they
happen to sit on a `support`-domain route.

---

## 2. The rule this document proposes, in one sentence

> **A field is readable by a role when the field's CLASS is granted to that role — and the class
> is data in the same matrix the domains already live in, never a check written into a page.**

Three consequences, and they are the reason for the shape:

1. **The gate moves off the route and onto the datum.** `/admin/players/[id]` stays a `support`
   route. What changes is that the balance KPI asks *"may I show a money figure?"* instead of
   *"am I on a page support can reach?"*
2. **It composes with the domain axis instead of replacing it.** A role must still hold the
   domain to reach the route at all. READ_TIERS can only ever *subtract*.
3. **⛔ ADMIN is not exempt, and that is deliberate.** ADMIN bypasses every domain check today
   (`live-bonus-live-proof.mjs`'s own header says so). A masking rule that ADMIN skips is a rule
   nobody can test as an ADMIN, and this campaign has already paid for sweeps run as ADMIN that
   *"measured nothing about RBAC"*.

---

## 3. The proposed model

### 3.1 The classes

Four, and no more. ⚠️ **The number is a design decision, not an accident:** every class is a
column somebody has to fill in for seven roles, and a matrix nobody can hold in their head is
edited wrongly. If a fifth is ever proposed, it must displace one of these.

| Class | What it covers | Why it is its own class |
|---|---|---|
| `money.figures` | wallet balance, bonus balance, lifetime deposits/withdrawals, any TZS total attributable to one named player | The Final Audit remediation blocks `MODERATOR` from money; this is that rule, expressed once |
| `identity.contact` | email address, unmasked phone | The account-recovery set. `AWARKEH`'s `RA7` is the same lesson one product over: an email on a row is a takeover vector |
| `identity.personal` | date of birth, region, full document number, document images | The KYC set. Already partly masked; this makes the masking a *rule* rather than a `slice()` |
| `history.activity` | positions, bets, notification and login history | ⭐ **The one a support agent genuinely needs** — *"which round was this?"* — and the one nothing currently withholds from anyone |

### 3.2 The proposed default grid

`read` / `masked` / `—`. **`masked` is the important cell**: it is what makes a support agent
able to *confirm* a detail the player reads out to them without being able to *harvest* it.

| role | money.figures | identity.contact | identity.personal | history.activity |
|---|---|---|---|---|
| ADMIN | read | read | read | read |
| COMPLIANCE | read | read | read | read |
| FINANCE | read | masked | — | read |
| AUDITOR | read | masked | masked | read |
| **SUPPORT** | **masked** | **masked** | **—** | **read** |
| GROWTH | — | masked | — | read |
| MODERATOR | — | — | — | read |

⭐ **`SUPPORT` reads `money.figures` as `masked`, not `—`, and that is the whole design in one
cell.** A support agent must be able to say *"I can see a withdrawal of TZS 2,000 on the 26th
that failed"* — the **event** — without reading the player's balance. So `masked` on a money
figure means *transactions yes, totals no*: individual movements stay legible, the standing
balance renders as `••••`.

### 3.3 Where it lives

- The axis beside `ADMIN_DOMAINS` in `roles.ts`, with `DEFAULT_READ_GRANTS` mirroring
  `DEFAULT_GRANTS`.
- Overrides in a `RoleReadGrant` table shaped exactly like `RoleDomainGrant` — same override-or-
  default resolution, so `rbac-census.cjs` can print both matrices with one change.
- Edited on `/admin/roles`, in a second tab. ⛔ **Not a second page**: two permission screens is
  how two permission models are born.
- Consumed through **one** helper, `canRead(role, class)`, and one presentational primitive,
  `<Sensitive class="money.figures">`, so a page cannot mask a field *nearly* right.

---

## 4. ⛔ THE DECISIONS ONLY ALI CAN MAKE

Nothing gets built until these are answered. They are money-and-privacy calls, not engineering
ones, and guessing them is how a permission surface acquires a private opinion.

**D1 · Does a support agent see a player's wallet balance at all?**
The grid above says **masked** — they see movements, not the standing total. The alternative is
`read`: simpler, and it means the first agent hired can answer *"how much do I have?"* without
escalating. ⚠️ It also means every future support hire can read the balance of all 100 accounts.

**D2 · Does a support agent see the player's email address?**
The grid says **masked** (`a••••@gmail.com`). ⛔ Consider that `msaada@50pick.tz` (#13) means
tickets *arrive by email*, so the agent already knows the address the player wrote from. Masking
it in the console while it sits in the inbox is theatre unless the ticket view is masked too —
**so D2 and the mailbox design are one decision, not two.**

**D3 · Is ADMIN subject to masking?**
§2 argues yes. The cost is real: you, as ADMIN, would see `••••` where you see figures today, and
would need an explicit "reveal" that writes an audit row. **The benefit is that the rule becomes
testable by the only account that currently exists on production.**

**D4 · Does revealing a masked field get logged?**
Recommended: yes, `audit({ category: "COMPLIANCE", action: "pii.revealed" })` with the class and
the target. It is the difference between *"support could have read it"* and *"support did read
it, at 14:02, for player X"* — which is the question a regulator asks after an incident.

**D5 · Who is the first SUPPORT account?**
⛔ **This is a blocker, not a formality.** `rbac-census.cjs` reports **AUDITOR and SUPPORT hold
no account on production at all**, and `.env.qa.local` carries no persona for either. So today
**the tier cannot be proven live** — a refusal test needs a session that is actually refused.
Either a real support hire, or a QA SUPPORT persona created on production the way the fleet was.

---

## 5. How it gets proven — and why the obvious test is not enough

⛔ **THE TIER MUST BE PROVEN BY REFUSAL, WITH A POSITIVE CONTROL IN THE SAME RUN.** Unit K's
integration matrix (`K × everything`) is explicit: *"a permission surface that only ever tests
the allow path is an absent test."*

`test:read-tiers` must assert, at minimum:

1. **A refusal** — a SUPPORT session renders `••••` where a money figure would be.
2. **A positive control, same run, same page** — an ADMIN (or COMPLIANCE) session renders the
   figure. Without this, deleting the KPI entirely passes the refusal.
3. **A positive control on the SAME ROLE** — the SUPPORT session still reads
   `history.activity` in full. Without this, "SUPPORT sees nothing" passes.
4. ⭐ **That the masked value is not merely hidden in CSS.** `innerText` returns text a
   `display:none` wrapper still contains, and a `visibility:hidden` balance is a balance that
   shipped. **The figure must be absent from the server's response**, asserted on the HTML, not
   on the rendered box. This is `E-221`'s lesson pointed the other way: there, real content was
   clipped out of reach; here, hidden content would still be *present*.
5. **A drift detector** — every field declared in a class must be reachable through
   `<Sensitive>`, and a new money figure added to a page without one fails the suite. ⚠️ A count
   of "masked fields" would pass by never growing; the ratchet has to be on *unclassified*
   fields, the way `test:orphans` and `test:red-anchors` already do it.

**RED harness**, with declared anchors in `scripts/anchors/read-tiers.anchors.mjs`:
`support-reads-money` (the grid cell flipped to `read`) · `masking-is-css-only` (the value
rendered and hidden) · `admin-exempted` (the ADMIN bypass re-introduced) ·
`every-role-masked` (the over-correction — support can no longer do its job) ·
`reveal-is-not-audited`.

---

## 6. What this must NOT become

- ⛔ **Not a new hardcoded check.** Unit K says so in as many words. If the answer to *"can
  support see X?"* ever lives in a `.tsx` file, the matrix has stopped being the authority.
- ⛔ **Not a per-page opinion.** One helper, one component. E-30's lesson: fix the shared
  component, not the page.
- ⛔ **Not a reason to widen SUPPORT.** READ_TIERS can only subtract from what the domain axis
  already grants. If a support agent needs a *route* they cannot reach, that is a domain-matrix
  change and it gets argued on its own.
- ⛔ **Not applied to the player's own view of themselves.** Every rule here is about a STAFF
  member reading a player's record.

---

## 7. Open, and deliberately not decided here

- **The ticket system itself** (#12's *"ticket search — there is no ticket system in the
  codebase"*) is not designed in this document. It is the larger half of unit K, and it should
  be designed against an agreed tier rather than the other way round — a ticket view is just
  another surface that will have to ask `canRead`.
- **`msaada@50pick.tz`** (#13) is DNS + Postmark + a mailbox group, and ⚠️ its brief warns *"the
  mail key dies silently — verify a real inbound and a real reply, not configuration."* It has
  no dependency on this design except through **D2**.
