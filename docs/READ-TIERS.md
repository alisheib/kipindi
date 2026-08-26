# READ_TIERS — what a support agent may READ, and how that becomes data rather than a habit

> 🟠 **THIS IS A DESIGN FOR AGREEMENT, NOT SHIPPED CODE.** Nothing in §3 exists yet. It is
> written first on purpose: `docs/SESSION-PROMPT-JAY-COMMENTS.md` unit K says *"design the tier
> in `docs/` first and get it agreed, then build it through the data-driven matrix at
> `/admin/roles` — never a new hardcoded check."*
>
> **Author** session 65 (2026-08-26) · **Status** ✅ **§4 RULED 2026-08-26 (session 66) — see §4a**
> · **Blocks** Jay unit K (#12 customer-care surface, #13 `msaada@50pick.tz`).
>
> ⭐ **HOW THE RULING WAS MADE, because that matters as much as the answers.** Ali's instruction
> (2026-08-26) was to decide *"based on how the overall platform works and how it behaves and
> according to our direction"*. So every ruling in §4a is argued from something this platform
> ALREADY does, measured — and where there was no precedent to read, the ruling says so instead
> of inventing one.

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

> 🔴 **THIS SECTION IS SUPERSEDED IN PART — READ §1a FIRST.** Three of the five reads it calls
> open are **already closed** by the DOMAIN axis, measured 2026-08-26 by
> `npm run test:player-page-reads` (14/0): the wallet balance and lifetime deposits sit inside
> `{canSeeMoney && …}` and the date of birth inside `{tab === "kyc" && canSeePII && …}`, and
> SUPPORT holds neither domain. **The email and region are the real exposure, and they are real.**
> The table below is kept as the record of what was believed when the design was written.

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

### 1a · 🔴 §1 IS WRONG ON THREE OF ITS FIVE CLAIMS — CORRECTED BY MEASUREMENT, 2026-08-26

⛔ **§1 above is the measured basis this whole unit rests on, and the rulings in §4a cite it. It
over-states the exposure.** The correction is asserted, not narrated: **`npm run
test:player-page-reads`** models the page's own gate expressions and resolves them through the
real `canView`/`canAct`. **14/0.**

**What §1 missed:** the page ALREADY gates reads by the DOMAIN axis. `canSeeMoney =
canView(role, "accounting")` wraps the money KPI block **and** the transactions tab; `canSeePII =
canView(role, "compliance")` wraps the KYC panel — and both also filter the **tab list**, so a
hidden tab is not merely an empty one. SUPPORT holds neither domain.

| §1 claimed SUPPORT reads | measured | why |
|---|---|---|
| exact wallet balance | 🔴 **NO** | money KPI block is inside `{canSeeMoney && …}` |
| lifetime deposits | 🔴 **NO** | same block |
| date of birth | 🔴 **NO** | KYC panel is inside `{tab === "kyc" && canSeePII && …}` |
| full email address | ✅ **yes** | rendered in the header with **no gate at all** |
| region | ✅ **yes** | same header line, no gate |

⭐ **THE REAL EXPOSURE IS TWO FIELDS, ONE ROLE — and it is still worth closing.** Only ADMIN,
COMPLIANCE and SUPPORT can reach `/admin/players` at all (it is a `support`-domain route).
Of those, **SUPPORT is the only one that reads the email and region without also holding PII
rights.** The email is the account-recovery set; that is a real finding. It is not the five-field
harvest §1 described.

⚠️ **AND THE SIZE OF THE JOB CHANGES AGAIN, IN BOTH DIRECTIONS.** Smaller, because three of the
five reads are already closed. Larger, because the fix is not "mask five fields on one page" but
"the header renders PII with no read gate at all", which is a **shared header block**, not a leaf.

#### 🔴 The consequence for §3.2's central cell — this is the important part

§2.2 states the composition rule: *"A role must still hold the domain to reach the route at all.
READ_TIERS can only ever **subtract**."* §3.2's headline cell gives SUPPORT `money.figures:
masked`, whose stated purpose is that an agent can say *"a TZS 2,000 withdrawal failed on the
26th"* — the **event**, without the total.

⛔ **That cell cannot deliver its own motivating example.** The transactions tab is gated by the
**DOMAIN** axis, which SUPPORT fails, and §6 forbids READ_TIERS from widening a route:
*"if a support agent needs a route they cannot reach, that is a domain-matrix change and it gets
argued on its own."* So today, `masked` and `—` are **indistinguishable for SUPPORT on this page**:
both render nothing, because the domain gate closes first.

⭐ **THE RULING STANDS; ITS EFFECT IS DEFERRED, AND SAYING SO IS THE POINT.** D1's `masked` is the
**ceiling** — it guarantees that if SUPPORT is ever granted `accounting: view` for the transactions
list, they get **movements without totals** rather than everything. ⚠️ **It is not, today, a
narrowing of anything.** Recording that honestly is the difference between a design and a claim:
the alternative was to ship `masked`, observe dots where there had been dots, and report a fix.

📌 **THE COMPOSITION RULE, MADE EXPLICIT SO THE BUILD CANNOT GET IT WRONG:**
**effective = the INTERSECTION of the domain gate and the read cell.** `<Sensitive>` narrows what
the domain already permits; it never renders a field the domain would have hidden. ⛔ A `masked`
cell is **not** permission to show a masked value where the domain shows nothing — that would make
READ_TIERS *widen*, which §2.2 forbids in as many words.

#### What actually changes on the page, then

1. **`identity.contact` (email) and `identity.personal` (region) in the header** — the real work,
   and the only cells with an effect today.
2. Every other cell is a **ceiling for later**, correct to define now and honest to describe as
   dormant.

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

> ⛔ **READ `read` AS "MAY REVEAL", NOT AS "SEES IT" — the cell is DEFINED in §4c and this grid is
> unreadable without it.** Every sensitive cell above is **masked at rest for the role in it,
> ADMIN included** (ruling D3). `read` grants the *reveal*, `masked` is the ceiling, `—` renders
> nothing. ⚠️ Taking `read` to mean "sees the raw value" makes this table contradict §2.3 and D3
> outright — which is exactly what it did until the build tripped over it.

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

### 3.4 · AS BUILT — where the implementation differs from §3.3, and why

⭐ **§3.3 said "shaped exactly like `RoleDomainGrant`". It is, with two deliberate differences.
Both are recorded here so the doc and the code cannot drift apart.**

**① `readClass` is `TEXT`, not an enum — and it must stay TEXT.**
The classes are `money.figures`, `identity.contact`, `identity.personal`, `history.activity`.
**Neither a Prisma enum nor a Postgres enum can hold a dot**, so making this an enum would force
a SECOND vocabulary — `MONEY_FIGURES` beside `money.figures` — for classes that already have
names. ⛔ **Two names for one class is how a permission model acquires two opinions**, which §6
forbids in the UI and is no better in the schema. The cost is that **the database cannot reject a
typo**, so the code must: `isStorableReadOverride(readClass, cell)` in `rbac.ts` is shared by the
loader and the writer — ⭐ **one definition, both call sites**, because a value the writer refuses
but the loader accepts would let a row written by any other means (a migration, a console, an
importer) grant a read the code would never have stored. An unrecognised row is **discarded**, so
it fails closed. `red:read-tiers`'s `validator-accepts-anything` is the proof that guard is real.

**② It lives in `rbac.ts`, beside the domain grants — not in a module of its own.**
§6 says two permission *screens* is how two permission *models* are born; the same is true of two
permission *modules*. One loader, one cache, one invalidation path, so `rbac-census.cjs` can print
both matrices and neither can drift from the other.

⛔ **AND ONE THING THAT IS DELIBERATELY *NOT* MIRRORED: the ADMIN bypass.**
`roleGrants` (the DOMAIN axis) short-circuits ADMIN to all-true so a bad grant edit can never lock
the Owner out of the console — correct, because that axis is about *reaching a route*. Ruling **D3**
makes the READ axis the opposite: **ADMIN resolves through the table like everyone else.** ⚠️ **This
is the likeliest thing for a future change to "fix"**, because the read resolver looks like it is
*missing* a line the domain resolver has. It is not missing; it is the ruling. `red:read-tiers`
attacks it at **both layers** (`admin-exempted` in the model, `runtime-admin-bypass` in the runtime).
⭐ **An ADMIN still cannot lock itself out:** the worst a bad READ edit does is put dots where a
figure was, and `/admin/roles` is reached through the DOMAIN axis, which still bypasses. That
property is asserted as a positive control in the same run (`test:read-tiers` 5.4).

📌 **`ADMIN` is editable in the READ matrix**, unlike the domain matrix where `EDITABLE_ROLES`
excludes it — for the same reason: a permanently-exempt role would make §4c's *"masked at rest for
everyone"* untrue for the only account that exists on production.

### 3.5 · AS BUILT — the primitive, the reveal, and the one surface wired

**`<Sensitive>` is a SERVER component** (`src/components/ui/sensitive.tsx`) and is the only file in
`src/` permitted to import the resolver — `test:read-tiers` 4.4 enforces it by looking for an
IMPORT of `canRead`/`readCell`/`mayReveal`, not for a class NAME. ⚠️ **The first version of that
guard forbade the name**, which would have failed the moment the axis was used, because §3.3
specifies exactly that at call sites. **Naming which class a field belongs to is a classification;
the ANSWER is what §6 keeps out of pages.**

**The raw value never reaches the client at rest.** The server renders only the masked string. A
reveal is a round trip (`revealSensitiveAction`) that re-reads the value through the field registry,
checks `mayReveal` — **the same matrix the UI consulted, so the absent button and a refused forged
request are one rule rather than two that can drift** — and **awaits** an audit row before
returning. ⛔ The payload names the class and the field and **never the value**: an audit trail that
records the secret it protects is the leak, one layer down.

**The registry** (`src/lib/server/sensitive-fields.ts`) holds field → class, its masked form, and
how to re-read it. `email` masks to `a••••@gmail.com` — enough shape to CONFIRM what a caller reads
out, useless for harvesting. ⭐ **`region` masks to `••••` with no shape at all, and that is the
honest answer:** a region comes from a small closed vocabulary, so any partial reveal identifies it,
and a fake mask would be exactly the theatre D2 ruled out.

**`domainAllows` implements §1a's intersection rule.** It defaults to `true` because most call
sites already sit inside a domain-gated block; pass it explicitly anywhere the field is not.

**Wired so far: the two header fields on `/admin/players/[id]` — the whole of the real exposure
(§1a).** For SUPPORT that means the email becomes `a••••@…` with **no reveal control**, and the
region **disappears**. Everything else in §3.2 is a dormant ceiling, as §1a says.

⚠️ **NOT YET BUILT:** the `/admin/roles` tab (§3.3), and the **live proof by refusal** (§5), which
needs the SUPPORT and AUDITOR personas from ruling D5.

📌 **First cell to revisit, alongside §4b's GROWTH note:** `region` sits in `identity.personal`, so
for ADMIN and COMPLIANCE it is masked-at-rest and costs a click. That is faithful to §3.1 and may
prove to be more friction than the field is worth — **a cell to flip in `/admin/roles`, not a
special case to code.**

### 3.6 · AS BUILT — the editor is a TAB, and the Owner is listed on it

`/admin/roles` now carries two tabs — **Access** (role × domain, "may this role reach this ROUTE?")
and **Reads** (role × class, "may this role read this FIELD?"). ⛔ **A tab, not a page**, per §6:
*"two permission screens is how two permission models are born."* Only the matrix the active tab
renders is loaded, so a tab most visits never open costs no round trip.

⭐ **THE OWNER IS LISTED ON `Reads` AND NOT ON `Access`, AND THE TAB SAYS WHY ON SCREEN.** That
looks like an inconsistency between two halves of one screen, which is exactly how a rule gets
"tidied away" by someone making things uniform. It is ruling **D3**: the Owner bypasses the DOMAIN
table so a bad grant can never lock them out of a route, while the READ axis resolves ADMIN through
the table like every other role. ⚠️ **The Owner still cannot lock itself out** — the worst a read
edit does is show dots where a value was, and `/admin/roles` is reached through the DOMAIN axis.

📌 **D3 CAN NOW BE UNDONE AT THREE LAYERS, AND ALL THREE ARE ATTACKED BY `red:read-tiers`:** the
pure model (`admin-exempted`), the runtime resolver (`runtime-admin-bypass`), and the editor action
(`read-action-refuses-admin`). ⚠️ **The third is the most likely of the three**, because an author
working in `roles/actions.ts` sees the DOMAIN action a few lines above refusing ADMIN and adds the
same line "for consistency". The suite asserts the two actions as a **PAIR** — domain refuses,
read does not — because either half alone is a claim and only together are they the ruling.

⚠️ **A read edit revalidates `/admin/players/[id]` as well as the editor**, and that has its own
mutation. Without it an officer flips a cell, opens a player, sees the OLD masking from the router
cache, and concludes the matrix does not work — **a stale route presenting as a broken permission
model.**

⭐ **An unavailable level is OFFERED AND DISABLED WITH ITS REASON, never removed** (Ali,
2026-08-04). `Masked only` on `history.activity` is greyed with *"this class has no masked form — a
partial reveal would identify it"*, and ⛔ **the server refuses it too**: a control that greys what
the server would still accept is the defect, not the fix, and a modified client reaches the server
directly.


---

## 4. THE DECISIONS ONLY ALI COULD MAKE — ✅ **ANSWERED, SEE §4a**

> ✅ **RULED 2026-08-26 (session 66). The questions below are kept VERBATIM as the record of what
> was asked; the answers are in §4a and §4c.** ⛔ **They are not open — do not re-decide them here.**
> Ali delegated them the same day: *"you decide based on how the overall platform works and how it
> behaves and according to our direction."*
>
> ⚠️ **This heading used to read "THE DECISIONS ONLY ALI CAN MAKE" and the paragraph below said
> "nothing gets built until these are answered".** Both were true when written and both would now
> be false left alone — the campaign's one-finding-one-truth rule applied to a design document.

Nothing was built until these were answered. They are money-and-privacy calls, not engineering
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

## 4a. ✅ THE RULINGS — 2026-08-26 (session 66)

Ali delegated these with *"you decide based on how the overall platform works and how it behaves
and according to our direction"*. Each ruling therefore cites the precedent it is read from.
⛔ **A ruling with no precedent behind it is marked as such** — those are the ones to revisit first.

### D1 · Does a support agent see a player's wallet balance? → **MASKED** (as designed)

⚠️ **CORRECTED 2026-08-26, AFTER MEASUREMENT — the ruling stands, its stated EFFECT did not.**
This ruling was written believing §1's claim that a support agent reads the balance today. **They
do not** (§1a, `test:player-page-reads` 14/0): the money block is domain-gated and SUPPORT holds no
`accounting` grant. So `masked` **narrows nothing today** — it is a **CEILING**, guaranteeing that
if SUPPORT is ever granted the transactions list they get *movements without totals* rather than
everything. ⛔ **And it is not permission to render a masked figure where the domain shows nothing:
effective = the INTERSECTION of the domain gate and the read cell** (§1a), because §2.2 says
READ_TIERS may only ever subtract. **The reasoning below is unchanged and still decides the cell;
only the sentence about what a support hire can do today was wrong.**

**The precedent is already on the page, and it was set for everybody.** The phone number
(`:205`) and the KYC document number (`:484`) are **already masked for ADMIN too**. So this page
does not treat masking as a junior-role concession — it treats identity data as masked at rest and
lets seniority *reveal*, not *bypass*. A money total is the same shape of datum, and §1 shows it is
the one that never got audited.

⭐ **And the platform has already been told this once, in the other direction.** The Final Audit
remediation blocks `MODERATOR` from money outright, and §6's standing finding is *"a read-only
AUDITOR was offered the payment kill-switches"* — a role scoped to one domain handed another
domain's facts because they shared a route. **The reads are that same defect, unfixed.**

⚠️ **The cost is real and accepted:** the first support hire cannot answer *"how much do I have?"*
without a reveal. That is the correct trade — the player can read their own balance, and the agent
can see every movement.

### D2 · Does a support agent see the email address? → **MASKED — and the mailbox INHERITS the rule**

The design is right that D2 and the mailbox are one decision. **Ruling: masked in the console, and
the ticket view is bound by the same class when it is built.**

⛔ **The objection in §4 is correct and does not change the answer — it changes the ORDER.** Masking
the address in the console while the same address sits in an unmasked inbox *is* theatre. But the
inbox **does not exist yet** (#13 is unbuilt), so ruling `masked` now sets the constraint the inbox
must satisfy rather than inheriting a leak from it. ⭐ **Deciding the tier first is the only order in
which the ticket system can be built correctly** — §7 already says a ticket view is *"just another
surface that will have to ask `canRead`"*. **This ruling makes that binding, not advisory.**

📌 **Written into §7 as an acceptance condition of #13:** the mailbox is not DONE until its ticket
view resolves `identity.contact` through `canRead`. A ticket UI that renders a raw `from:` address
fails this design regardless of what the console does.

### D3 · Is ADMIN subject to masking? → **YES**

⭐ **This is the ruling the campaign's own history decides, not a philosophy.** ADMIN is the ONLY
account that exists on production. An exempt ADMIN makes the rule **untestable by the only session
anyone can open** — and this campaign has already paid for exactly that failure more than once:
sweeps run as ADMIN that *"measured nothing about RBAC"*, and `E-190`, where three guards stayed
green because their POPULATION was blind. **Today's `E-225` is the same shape one layer down:** a
leg asserting an absence, satisfied by a selector that could never match anything.

**A rule the top role skips is a rule with no witness.** ADMIN sees `••••` and gets an explicit
reveal, which is D4.

⚠️ **Accepted cost, stated plainly for Ali:** on `/admin/players/[id]` you will see `••••` where you
see figures today, and one click to reveal. ⛔ **`ops` and money-movement pages are NOT in scope** —
READ_TIERS only ever subtracts on the surfaces §3.3 names; it does not touch `/admin/payments`,
settlement or the ledger, where ADMIN reads stay as they are.

### D4 · Is a reveal audited? → **YES**

`audit({ category: "COMPLIANCE", action: "pii.revealed" })` carrying the **class**, the **target
player** and the **actor**. **Precedent:** the platform already writes `market.recategorised` with
actor/before/after (E-213), and the audit chain is already the thing the Board reads. ⭐ The
distinction this buys is the one a regulator actually asks for: not *"support could have read it"*
but *"support did read it, at 14:02, for player X"*.

⚠️ **The audit row must be written SERVER-side at the reveal, never from the client** — a client
that can render the value can decline to report that it did.

### D5 · Who is the first SUPPORT account? → **MINT QA PERSONAS ON PRODUCTION — `support` AND `auditor`**

⛔ **This was called a hard blocker, and it is not one — it is a state that has to be CREATED.**
`rbac-census.cjs` reports AUDITOR and SUPPORT hold no account on production, so the refusal test has
no population. **Ali's standing rule covers exactly this case:** *if a rule cannot be proven, create
the state* — the QA fleet on production exists for that reason.

**Both roles, not just SUPPORT**, because §3.2 grants AUDITOR a different row (`money.figures: read`,
`identity.personal: masked`) and a matrix proven at one row is a matrix proven nowhere. ⭐ Two
personas make §5's *"positive control on the SAME ROLE"* and the cross-role control possible in one
run.

⚠️ **A real support hire, when there is one, gets a real account** — these personas are QA
instruments and are named so they can never be mistaken for staff.

---

### 4c · ⛔ THE CONTRADICTION THE BUILD FOUND, AND HOW IT IS RESOLVED

**Found while implementing, 2026-08-26.** §2.3 and D3 say *ADMIN is not exempt from masking*.
§3.2's grid gives ADMIN **`read`** on all four classes. **Those cannot both be true while `read`
means "sees the raw value".** The design was agreed with an undefined term at its centre, and a
`canRead()` written against it would have silently picked one meaning.

⭐ **RESOLVED BY DEFINING THE CELL, NOT BY CHANGING THE GRID.** The grid is right; `read` was
under-specified. The three values mean:

| cell | at rest | may reveal? | audit on reveal |
|---|---|---|---|
| **`read`** | **masked** (`••••`) | ✅ **yes** | ✅ D4 |
| **`masked`** | **masked** (`••••`) | ⛔ **no** — this is the ceiling | n/a |
| **`—`** | **not rendered at all** | ⛔ no | n/a |

So **every sensitive field is masked at rest for EVERY role including ADMIN** — D3 satisfied,
literally — and `read` is not *"sees it"* but *"is permitted to reveal it"*. ⭐ **`masked` becomes
the genuinely interesting cell it was always described as:** the difference between SUPPORT and
COMPLIANCE on a money figure is no longer *what is on screen* — both see `••••` — but **whether
the reveal control exists at all**. That is a far stronger property to test than a rendering
difference, because a reveal that is absent cannot be reached by a modified client either.

⚠️ **`history.activity` IS EXEMPT FROM MASKING-AT-REST, and this is a rule, not an exception.**
A masked form only exists for a datum with a *shape* to preserve — a balance, an address, a date
of birth. A list of a player's own bets has no masked form that is both useful and safe, and
§3.2's own text calls it *"the one a support agent genuinely needs"*. For `history.activity`,
`read` renders in full and `—` renders nothing. **A class declares whether it is maskable; only
maskable classes get the three-value cell.**

⛔ **CONSEQUENCE FOR THE SUITE, and it is the point of §5.4.** Since ADMIN and SUPPORT now render
the SAME masked text at rest, a suite that only compares rendered strings proves nothing. **The
refusal must be asserted on the absence of the reveal control AND on the raw value's absence from
the server's HTML** — which is what §5.4 already demands for a different reason. The two now
reinforce each other.

### 4b · What is deliberately NOT ruled here

- **The masked RENDERING of a money figure** (`••••` vs a range vs a count) is an implementation
  detail of `<Sensitive>`, decided in the build, not a policy call.
- **Whether GROWTH keeps `identity.contact: masked`** — §3.2 proposes it; growth's actual job
  (invites, affiliates) may not need contact at all. ⛔ **No precedent to read**, so it ships as
  designed and is the first cell to revisit.
- **The ticket system** stays out of scope per §7, bound only by D2's inheritance rule above.

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

### 5a · ✅ AS PROVEN — `qa:read-tiers` **18/0 on production**, 2026-08-26

⭐ **D5 IS CLOSED, AND IT WAS NEVER A WALL.** `ops:mint-read-tier-personas` created the two
personas the acceptance needs, **through the real flow, not the database**: each was REGISTERED on
the real sign-up form and then PROMOTED by a real ADMIN session through `/admin/staff` with a
reason, leaving a `staff.role_changed` audit row the Board can read. Measured: **SUPPORT 0 → 1,
AUDITOR 0 → 1**, and neither persona acquired a role it was not granted.

**What §5 asked for, and what answers it:**

| §5 requirement | the assertion that satisfies it |
|---|---|
| 1 · a refusal | SUPPORT sees `a••••@…`, is given **no reveal control**, and the region is **absent entirely** |
| 2 · positive control, same run, same page | ADMIN, on that same page, **is** given `Reveal Email address` / `Reveal Region` |
| 3 · positive control on the SAME role | SUPPORT reaches the page, keeps their desk, and `history.activity` still reads in full |
| 4 · not merely hidden in CSS | the raw address is **absent from the SERVER'S HTML** — 101,269 bytes of it — for SUPPORT *and* for ADMIN |
| 5 · a drift detector | `test:read-tiers` 4.4 (no `.tsx` may import the resolver) + the field registry |

⭐ **AND THE SEAL §5 DID NOT ASK FOR, WHICH IS THE ONE THAT MATTERS MOST.** An absent button proves
the CONSOLE is safe; it says nothing about a modified client. So the drive **captures ADMIN's real
reveal request and replays it from SUPPORT's own session**. The server answers **HTTP 200** and
refuses: *"Your role cannot reveal email address (identity.contact)."* — ⛔ **naming the class**, so
a refused operator can tell their manager which grant they lack, and **the address appears nowhere
in that response.**

⭐ **THE AUDIT TRAIL TELLS THE TRUTH IN BOTH DIRECTIONS.** ADMIN's reveal is on the record; the
REFUSED attempt wrote **no** `pii.revealed` row — *a refusal is not a read*, and if it were logged
as one, the count that answers *"who read this?"* would lie. No payload anywhere carries the value
it protects.

#### 🔴 The leg that was wrong, because it is the more useful half of this section

Leg 3 first asserted that **AUDITOR** sees the region *masked* where SUPPORT sees nothing — a real
difference in §3.2's grid. **AUDITOR holds no `support` grant, and `/admin/players` is a `support`
route, so AUDITOR never reaches the page at all.** ⛔ **Worse, the leg's second assertion — "AUDITOR
is given no reveal control" — PASSED, vacuously**, because there was no page to carry one. *A
refusal satisfied by an empty page is precisely the defect this suite exists to catch, and it had
appeared inside the suite itself.*

⭐ **Rewritten, it proves something better: §1a's INTERSECTION RULE, live.** AUDITOR is stopped by
the DOMAIN gate before any read cell applies — with a positive control in the same run showing the
**same AUDITOR session** reaching `/admin/insights`, an accounting route it does hold. Without that
control, "AUDITOR sees nothing" would be satisfied by a broken account, a bad password, or a
persona that was never actually promoted.

⚠️ **STILL NOT BUILT, and unit K is NOT complete:** the **ticket system** (#12's larger half) and
**`msaada@50pick.tz`** (#13). §7 keeps both out of this design deliberately, and D2 binds them —
#13 is not DONE until its ticket view resolves `identity.contact` through `canRead`.

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
- ⭐ **BOUND BY D2 (§4a), AND THIS IS AN ACCEPTANCE CONDITION, NOT A NOTE.** `msaada@50pick.tz` is
  **not DONE** until its ticket view resolves `identity.contact` through `canRead` like any other
  surface. A ticket UI that renders a raw `from:` address defeats the console masking entirely, and
  the two would then disagree about the same field — which is how a permission model acquires a
  second, private opinion (§6). ⛔ **Whoever builds #13 does not get to re-decide D2.**
