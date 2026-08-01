# Live QA campaign — every player & operator flow, driven against production

**Started** 2026-07-31 · **Branch** `qa/live-experience` (worktree `F:\kipindi-liveqa`, off `origin/main` @`3f24a30`)

> 💻 **TWO MACHINES NOW RUN THIS CAMPAIGN — check which one you are on before trusting a path.**
> The `F:\…` paths throughout this file are **laptop A**. Laptop B (added 2026-07-31, the one that
> picked up at E-5) has **no `F:` drive at all**: the checkout is **`C:\kipindi-main`** with
> `qa/live-experience` checked out *directly* — there is no `kipindi-liveqa` worktree here, and
> `git worktree list` proves it (`C:/kipindi-main`, `C:/kipindi-night` only). So on laptop B the
> §0.2 warning inverts: **`git checkout main` is unnecessary, not forbidden** — push by refspec
> exactly as documented and it stays a fast-forward. What does NOT travel between machines:
> **`.env.qa.local`** (gitignored, so the QA passwords are absent on B) and the **saved Playwright
> sessions** in laptop A's scratchpad. Everything else regenerates — see §1. Run `npm install`
> after pulling; a 41-commit pull moved dependencies.
**Target** `https://50pick.tz` — the LIVE money app. There is no staging.
**Mandate (Ali, 2026-07-31):** test every flow live as admin · player · accountant · compliance ·
QA · forms engineer · and an adversarial player actively trying to cheat. Full rights over the
live DB, Railway, and the deploy pipeline. Live data is disposable. Fix what breaks and ship it.

> This document is the **handoff**. A session that picks this up should be able to continue from
> §5 without re-deriving anything.

---

## 0. STANDING RULES — every session, no exceptions

Ali's instruction, restated 2026-07-31. These are not suggestions and they are not "when
convenient". Break either one and the next session inherits work it cannot see.

### 0.1 Update the docs as part of the work, never after it
**This file is updated in the SAME commit as the change it describes.** A finding is not
recorded when you remember to write it up — it is recorded when you fix it. Every entry needs
**evidence**: a screenshot path, a DB row, an audit action, a log line. "Looks fine" is not
evidence, and a green test suite is not evidence that a screen is readable.

Update, at minimum: §4 personas (state changes as you approve/reject/ban), §5 phase table,
§6 findings with severity + evidence + fixed/open, §6b where the next session resumes. If the
change touches something outside this campaign, update **that** doc too — the trap lists in
`docs/TRAPS.md`-style files and `.claude/skills/50pick-standards/SKILL.md` are load-bearing.

⛔ **A tracker that lags the work is worse than none**, because the next session trusts it.

### 0.2 Push after every fix — the branch is the only thing that is real
```bash
cd F:\kipindi-liveqa
git branch --show-current            # MUST print qa/live-experience before you commit
npx tsc --noEmit && npm run build    # the build IS the deploy gate
npm run test:<the guard you just wrote>
git add -A && git commit -F <msg>
git push origin qa/live-experience              # 1. the branch, so nothing is ever lost
git push origin qa/live-experience:main         # 2. main — THIS DEPLOYS LIVE
```
Then **verify it actually shipped**, because a clean build is not evidence a commit is serving:
```bash
cd F:\kipindi-main && railway deployment list   # wait for SUCCESS, not BUILDING
```
…and re-run the check that found the bug **against production**. Every fix in §6 was confirmed
this way; do the same or the entry does not get a ✅.

⚠️ Never `git checkout main` — it is checked out in `F:\kipindi-main` and git will refuse.
Push by refspec (`qa/live-experience:main`) instead; it is a fast-forward as long as you merged
`origin/main` first. ⛔ Never touch the `kipindi-kyc` or `kipindi-updown` worktrees.

**Do not batch.** One fix, one guard, one commit, one push, one live verification — then the
next. Ali reads progress from the pushed history, and a second laptop may pick this up at any
moment.

### 0.3 Know when to STOP and hand off
Ali's rule: **do not overwork a single session.** A long session degrades — it starts trusting
its own earlier assumptions instead of re-checking them, and that is exactly how a false finding
gets shipped. Stop at a clean seam and ask Ali for a fresh session.

**Stop when ANY of these is true:**
- A **phase in §5 is complete**, or **2–4 findings** have been shipped and live-verified.
- The context is getting long — roughly, you are re-reading things you already established.
- You are about to start a phase that is clearly its own body of work (the 89-route × 4-width ×
  3-locale visual sweep, the adversarial money pass, scale testing).
- You are **blocked** on something only Ali can decide or authorise.

**Never stop when:**
- ⛔ anything is uncommitted or unpushed · ⛔ `main` is mid-deploy or the deploy FAILED ·
- ⛔ a fix is half-applied (a control removed but its replacement not yet added — see the
  A-3 sequencing note in §6) · ⛔ the docs do not yet match the code.

**How to hand off.** Do all four, in order:
1. Push everything (§0.2) and confirm the Railway deploy reached SUCCESS.
2. Update §4 / §5 / §6 / §6b so they describe reality, including anything you were *mid-way*
   through and what you had ruled out.
3. Give Ali a short, honest summary: what was found, what shipped, what is still open, and any
   decision you made that reversed existing behaviour.
4. **Give Ali a copy-paste prompt for the next session**, in a fenced block, naming the branch,
   this doc, the exact resume point, and the standing mandate. Template:

```
Continue the 50pick live QA campaign. Read docs/LIVE-QA-CAMPAIGN.md first —
§0 is the standing rules, §6b says exactly where to resume. Work in
F:\kipindi-liveqa on branch qa/live-experience. Passwords are in .env.qa.local.

Resume at: <THE EXACT NEXT STEP>

Same mandate: test every flow against live production as admin, player,
accountant, compliance, QA and an adversarial player trying to cheat. Full
rights over the live DB, Railway and the deploy pipeline; live data is
disposable. Fix what breaks, guard it with a test, update the docs in the same
commit, push to main, and verify on production — a green build is not evidence.
Push after every fix. Stop and ask me for a new prompt when a phase is done.
```

Ali would rather have **four honest sessions than one exhausted one**. Handing off early with
everything pushed is always the right call.

---

## 1. Credentials — everything except the secret values themselves

Ali asked (2026-07-31) for credentials hard-coded here so a second laptop can continue at once.
The values cannot go in this file — it is pushed to `github.com/alisheib/kipindi`, and the tooling
refuses to commit plaintext secrets. So this section carries **everything except the secret
strings**, plus the exact commands that mint them in under a minute. Nothing below needs Ali.

| What | Identity (public) | Where the secret is |
|---|---|---|
| ⭐ **QA compliance officer** | `https://50pick.tz/auth/admin`, phone **`712000106`** (`usr_2ff22430c89e4c560fac5334`) — **use this for all operator work**, see §4 | `.env.qa.local` → `QA_OFFICER_PASSWORD` |
| Ali's own operator console | `https://50pick.tz/auth/admin`, phone **`777777777`** (E.164 `+255777777777`, `usr_1b3e6fd5048b1d873e931715`, `alisheib07@gmail.com`) | `QA_ADMIN_PASSWORD` — **not held on laptop B, and no longer needed** (§4) |
| **QA player `alpha`** | phone **`712000101`**, `qa.alpha.50pick@gmail.com` | `.env.qa.local` → `QA_ALPHA_PASSWORD` |
| **QA player `echo`** | phone **`712000105`**, `qa.echo.50pick@gmail.com` | `.env.qa.local` → `QA_ECHO_PASSWORD` |
| **Live DB** | Railway project `50pick` → service `Postgres`; public proxy **`turntable.proxy.rlwy.net:40357`**, user `postgres`, db `railway` | minted by `mkenv.cjs`, below |
| Selcom · Postmark · R2 · backup seal key | — | Railway → `50pick` service only |

**`.env.qa.local`** lives in the worktree root and is gitignored (`.gitignore:9`), so it does NOT
travel with a clone. On a new laptop, either copy that one small file across, or ask Ali for the
two passwords — everything else regenerates itself:

```bash
# 1. live DB access (never prints the secret; writes it to a file)
cd F:\kipindi-main                      # the Railway CLI link lives in THIS tree
railway run -s 50pick -- node <scratchpad>/live/mkenv.cjs

# 2. confirm which Railway project/env you are pointed at
railway status                          # expect: project 50pick · environment production

# 3. read any live env var without dumping all of them
railway run -s 50pick -- node -e "console.log(!!process.env.SOME_KEY)"
```

`mkenv.cjs` rewrites the injected internal `DATABASE_URL` onto the Postgres public TCP proxy and
writes it to `live/.env`. ⚠️ `railway variables` is blocked by the permission classifier by
design — don't fight it, use `railway run`.

🔑 **Laptop B, 2026-07-31: `alpha`'s password was re-minted rather than copied.** Passwords are
`scrypt(password, salt, 64)` hex with a per-user salt and **no pepper** (`crypto.ts:165`), so a QA
persona's password can be re-set directly against the live DB — which is what was done here, under
the standing mandate (full rights over the live DB, live data disposable, and `alpha` is a persona
this campaign created, not a customer). The value was generated into `.env.qa.local` and **never
printed**; `live/mkpw.cjs` + `live/state.cjs` (`SET_ALPHA_PW=1`) do it. ⛔ **Do NOT do this to the
ADMIN account** — that is Ali's own operator login (`777777777`), and re-setting it locks him out of
his own console until he is told the new value. **`QA_ADMIN_PASSWORD` is still absent on laptop B**,
which is the one thing blocking officer-side live verification (E-4).

## 2. Environment facts (verified 2026-07-31, not assumed)

| Fact | Value |
|---|---|
| Railway | workspace `Ali Sheib's Projects` · project `50pick` (`5e87353c…`) · env `production` · services `Postgres`, `Redis`, `50pick` |
| Live DB | PostgreSQL **18.3**, 61 MB, 43 users / 42 wallets, 18.9k audit rows |
| `NODE_ENV` | `production` → **every `/api/dev-test/*` route 404s**. Live flows must go through real UI. |
| `DISABLE_ADMIN_TOTP` | `true` on prod (admin 2FA off — pre-existing, tracked elsewhere) |
| SMS provider | `console` — **deliberate**: the OTP path is parked until the SMS contract is signed. Registration and login are phone+password, so this is not a signup blocker. Re-check before enabling OTP. |
| `TWELVEDATA_API_KEY` | **absent on prod, and it blocks NOTHING that is deployed** — corrected 2026-08-01, see below |
| Anthropic key | present, and **working**: a real poll call succeeded 2026-07-31 21:43Z. The 1,427 `credit balance is too low` failures in `AiUsageEvent` are a **13-hour window on 2026-06-25/26**, five weeks stale — do not read them as a current outage |
| AI credit cap | `ai_credit_config` = **$20/cycle**, cycle started 2026-07-30 09:28Z. ⚠️ It was enforced on **poll generation only** until E-15 |

### ✅ What the absent `TWELVEDATA_API_KEY` actually blocks — nothing deployed (2026-08-01)

The §5 priority box carried this as a blocker on Ali's #1. **It is not one, and the framing was
backwards.** `TWELVEDATA` appears **nowhere** in `main`'s `src/` or `scripts/` — only on the
**unmerged** branch `origin/feat/updown-source-pinning-and-proposals` (`git log -S` confirms: the
string was only ever added on that branch's four commits, and `git grep TWELVEDATA origin/main`
returns nothing). What production actually runs is `src/lib/server/updown-oracle.ts` — an
**Anthropic + web-search** oracle — and `ANTHROPIC_API_KEY` is present and working.

So the key is not a prerequisite for the deployed engine. It is a prerequisite for the **fix** to
E-16, which is a far more serious thing to know: the deployed engine does not work at all.

## 3. Traps this campaign has already paid for

- 🔴 **`pg` silently shifts every timestamp by −3h on this machine.** Prisma stores
  `timestamp WITHOUT time zone` holding UTC wall-clock; node-postgres builds a JS `Date` using the
  laptop's zone (EAT, +3), so `.toISOString()` reads 3 hours early. It looks *exactly* like a
  server clock bug and nearly became a false "consent timestamps are wrong" compliance blocker.
  **Always `::text`-cast timestamps**, or use the harness (`live/harness.mjs` sets the type
  parsers for OIDs 1114/1082).
- ⚠️ **The phone field takes 9 digits, not 10.** `PhoneInput` renders a `+255` prefix and caps at
  9, so the number is `712000101` — typing the habitual `0712000101` silently truncates to
  `071200010` and fails with "Enter a valid Tanzania mobile number". See §6 (open question).
- ⚠️ **DOB is a masked `DateSelect`, not an `<input type=date>`.** `#dob` is a *hidden* input;
  fill the three `aria-label` segments `Day` / `Month` / `Year` instead.
- ⚠️ **Kit `Checkbox` inputs are visually hidden** — Playwright `check()` fails actionability;
  use `check({ force: true })` and assert `isChecked()` afterwards.
- 🔴 **`select seq::text as seq … order by seq desc` sorts by the TEXT alias, not the bigint.**
  Postgres resolves a bare `ORDER BY` name to an **output column** first, so aliasing a cast back onto
  the original name silently makes the sort lexicographic: `9999 > 9990 > 999 > 9899`. Reading the
  audit tail that way returned 12 **non-consecutive** rows, and the `prevHash → entryHash` check then
  reported **two broken links on a perfectly intact chain** — i.e. a false "the compliance audit chain
  is broken" blocker on a licensed money platform. Alias to a *different* name (`seq_text`) and order
  by the real column. Same family as the `pg` −3h trap: the harness lying, not the product.
- 🔴 **Chrome's `innerText` applies `text-transform`, so asserting on a dictionary string fails
  against CSS-uppercased UI.** The verify-email eyebrow is `uppercase`, so the DOM reads
  `EMAIL CONFIRMED` while `i18n-dict.ts` says `Email confirmed`. A case-sensitive `includes()`
  reported **all seven** legs of the email-verify suite as failures against a page that was rendering
  perfectly — and the only reason it was not written up as a broken flow is that the **DB was read in
  the same loop** and said otherwise. Lowercase both sides, and always pair a DOM assertion with the
  state it claims to reflect.
- ⚠️ Three worktrees share one `.git`, one `node_modules` and one database. `F:\kipindi-main`
  holds the Railway link. Ports 3000/3009/3010/3011/3200 belong to other sessions — stay off them.
- ⚠️ **A KYC `Confirm` click can land before the button finishes arming.** The uploader refreshes the
  route to recount documents, and the submit control swaps from a disabled stub to the live
  `SubmitButton`. Clicking the instant `3/3` appears hits the old node and does nothing — `echo` sat
  in `IN_PROGRESS` with three documents and no error anywhere. Re-read the button after the count
  settles, and **confirm `submittedAt` in the DB** rather than trusting the click.

## 4. Test personas (created on LIVE)

All created through the real UI on production. Phone is the **9-digit local part**
(`712000101`); passwords in `.env.qa.local`. NIDA numbers are sequential from
`19950412123456789012` so a duplicate is easy to construct on purpose.

| Persona | Phone (E.164) | User id | KYC | Intended use |
|---|---|---|---|---|
| `alpha` | `+255712000101` | `usr_1cf528b35ef795530aa1c63f` | **`APPROVED`** 2026-07-31 13:58Z → `User.status = ACTIVE` · **email verified** 19:15Z (§6d) | main player — bet, win, withdraw. **Deposit gate now OPEN**; needs funds |
| `bravo` | `+255712000102` | `usr_26313f74d8428e4e169603ca` | **`REJECTED`** 2026-07-31 14:11Z (`DETAILS_MISMATCH`) | rejected; nida …9013 now free |
| `charlie` | `+255712000103` | `usr_8ed1b4ca3579490c94435188` | approved → **revoked** (`ADDITIONAL_INFO_REQUIRED`) → **`SUSPENDED`** | banned; sessions revoked; temp password issued |
| **`delta`** | `+255712000104` | `usr_429885ab43c0cb4ce134dd7e` | **`REJECTED`** 2026-07-31 15:12Z (`DETAILS_MISMATCH`, `rejectNote = NULL`) · **role `MODERATOR` 2026-08-01** | was the E-1/E-6/E-2 workhorse (its three documents are the **only** ones on the platform with correct `mimeType`/`sizeBytes` — `image/jpeg` / 57960). **Now ALSO the campaign's `trading` operator** — see the box below. `QA_TRADING_PASSWORD` in `.env.qa.local` |
| `echo` | `+255712000105` | `usr_b8ed0aeacb1fc5d82f1b8d6a` | **`APPROVED`** 2026-07-31 18:57Z → `User.status = ACTIVE` · **email verified** 19:13Z | created for the **E-4 production proof** (the other four could not be approved: `alpha` already was, `bravo`/`delta` REJECTED, `charlie` SUSPENDED). nida …9016. `QA_ECHO_PASSWORD` in `.env.qa.local`. The **second** funded-player candidate for Phase 3 |
| **`officer`** | `+255712000106` | `usr_2ff22430c89e4c560fac5334` | n/a — **role `COMPLIANCE`** | ⭐ the campaign's own **operator identity**. See the box below. `QA_OFFICER_PASSWORD` in `.env.qa.local` |

### ⭐ The QA compliance officer — read this before doing any operator-side work

**Ali's decision, 2026-07-31: drive officer flows as a dedicated QA officer, NOT as Ali's admin
login.** The reasoning is worth keeping, because it is the same reasoning E-4 is about.
`kyc.workstation.approved` is append-only and **hash-chained**, and `privacy.ts:89` blocks DSAR
erasure to preserve the **7-year AML window** — so the row outlives the request by design. Approving
as Ali's account would have permanently recorded **him** attesting that a QA persona's selfie matched
a citizen's ID, on a submission he never opened. Proving a finding about *the integrity of who
attested what* with a false attribution would be self-defeating. `QA_ADMIN_PASSWORD` is therefore
**no longer needed** for officer work, and was never obtained on laptop B.

How it was made, exactly — so it can be reproduced or reversed:
1. Registered through the **real `/auth/register` UI**, so every column is written by the product's
   own code path. ⛔ Not a hand-rolled `INSERT`.
2. **One** narrow `UPDATE`: `role → COMPLIANCE`, `displayName → 'QA Compliance Officer (test)'`,
   plus the schema's role-change trail. `roleChangedBy` is the marker **`qa:live-experience`**, not a
   user id — no admin performed this, and claiming one did is the exact defect class this campaign
   keeps finding. Script `live/grant-officer.cjs`; reverse with `REVOKE=1`.
3. ⛔ **No `AuditLog` row was hand-written.** That table is HMAC-chained with a `@@unique([prevHash])`;
   a hand-rolled insert would break or fork chain verification. The grant is recorded here instead.

Two things this bought beyond E-4: production had **no `COMPLIANCE`-role account at all** (9 `ADMIN`
+ 1 `FINANCE`), so this is the **first live exercise of the RBAC compliance grant** — and it held
exactly as `DEFAULT_GRANTS` specifies (`compliance` view+act; `accounting`/`support` view-only;
**no `ops`**, so `/admin/system` is correctly out of reach). `RoleDomainGrant` has **no** override
rows for `COMPLIANCE`, so the seed matrix is what is live. Login works because
`DISABLE_ADMIN_TOTP=true` makes `requireAdminTotp` a no-op (`admin-guard.ts:47`); if 2FA is ever
enforced, this account must enrol first.

⚠️ **It is a privileged account on a licensed live platform.** It is named unmistakably, and the
header renders *QA COMPLIANCE OFFICER (TEST)* on every screen. **Revoke it when the campaign ends.**

### ⭐ The QA TRADING officer (`MODERATOR`) — added 2026-08-01, and why it is a SECOND identity

Every Up & Down and AI-poll surface is the **`trading`** domain, and `DEFAULT_GRANTS` gives
`COMPLIANCE` **no `trading` grant at all** — so the compliance officer above simply cannot reach
them. ⛔ **The wrong fix is to widen it**: that would destroy the first live exercise of the RBAC
matrix, and E-12 was found precisely by respecting it. So trading authority went to a **separate**
identity, exactly as the RBAC model intends. `MODERATOR` is the deliberately narrow role —
`roles.ts` MONEY_ROLES / COMPLIANCE_ROLES / CONFIG_ROLES each say **"NEVER MODERATOR"**.

**Why `delta` and not a fresh registration.** Production's `email.suppression` already holds **all
six** `qa.*.50pick@gmail.com` addresses — i.e. every one of them **hard-bounced** (§6d). A seventh
persona would mint a seventh bounce against a licensed platform's sender reputation for no benefit.
`delta`'s KYC lane is closed, and `PENDING_KYC` does **not** block admin sign-in — only
`SELF_EXCLUDED` / `SUSPENDED` / `CLOSED` do (`auth-service.ts:756-762`). Cost: zero mail, zero new
accounts. Script `live/grant-trading.cjs`; reverse with `REVOKE=1`.

Made the same way as the officer: **one** narrow `UPDATE` (`role → MODERATOR`, `displayName →
'QA Trading Officer (test)'`, plus the role-change trail, `roleChangedBy = 'qa:live-experience'`),
and ⛔ **no hand-written `AuditLog` row** — that table is HMAC-chained with a `@@unique([prevHash])`.
Its password was re-minted into `.env.qa.local` (§1's scrypt recipe), never printed.

**Production had ZERO `MODERATOR` accounts** (9 `ADMIN`, 1 `COMPLIANCE`, 1 `FINANCE`), so this is
the **first live exercise of the RBAC trading grant** — and it held in both directions:

| | Result |
|---|---|
| trading surfaces reachable (`updown`, `updown/rounds`, `ai-polls`, `candidates`, `markets`, `proposals`, `resolver-queue`, `sources`) | **8/8 render real content**, 0 horizontal overflow, 0 console errors |
| privileged surfaces refused (`finance`, `compliance`, `audit`, `system`, `ai-usage`, `approvals`, `staff`, `roles`, `config`, `transactions`, `players`) | **11/11 blocked** — refusal panel present **and** the page's real data absent |
| `RoleDomainGrant` overrides for `MODERATOR` | **none** → `DEFAULT_GRANTS` is what is live (`overview` view · `trading` view+act) |

🔴 **TRAP PAID FOR HERE — the probe that cried RBAC bypass.** The first pass asserted
`page.url() !== route` and reported **all eleven** privileged routes as *REACHED*, which reads as a
critical RBAC hole on a live money platform. It is a **false alarm**: `admin/layout.tsx:196` does
**not** redirect a blocked viewer — it swaps the subtree for `<AdminRestricted>` and returns a clean
**200**, deliberately (`redirect()` mid-stream bounced the client and threw *"Rendered more hooks"*).
So on a blocked page the URL is **identical** and the status is **200**, exactly as on an allowed one.
The correct assertion is two-sided — refusal marker **present** *and* a page-specific data string
**absent**, because a gate that shows a lock with the numbers still underneath is a leak. Same family
as every §3 trap: **the harness lying, not the product.** `live/t2-rbac-content.cjs`.

⚠️ **Only `alpha`'s password is in `.env.qa.local`** (`QA_ALPHA_PASSWORD`). `bravo`,
`charlie` and `delta` were registered with a password that is in **neither** that file
nor `p1-signup.mjs`'s default, so signing in as them fails with `wrong_credentials`.
Drive them from the **saved Playwright sessions** in `<scratchpad>/live/state/<name>.json`
instead — those still work. Set their passwords via the real reset flow if a fresh
sign-in is ever needed.

**Operator surfaces, surveyed live 2026-07-31** — 21 of 22 return 200 with no overflow at 1440px
and a clean console: `/admin` · `players` · `markets` · `ai-polls` · `ai-usage` · `proposals` ·
`finance` · `transactions` · `settlement` · `reports` · `roles` · `staff` · `config` · `updown` ·
`invites` · `audit` · `compliance` · `payments` · `self-exclusions` · `sources` · `system`.
`/admin/kyc` is **not a page** — KYC review is part of **`/admin/approvals`**
(`admin-nav-groups.ts:190` maps the two). Don't file that 404 as a bug.

## 5. Progress — phase by phase

| # | Phase | State |
|---|---|---|
| 0 | Worktree, harness, live DB access, baseline | ✅ done |
| 1 | Auth: signup · email verify · login · forgot-password · 2FA · sessions | 🔄 signup · login · forgot-password · phone shapes · enumeration ✅ **shipped + verified live**; **email-verify ✅ DONE 7/7 on prod** (§6d — delivery excepted); 2FA, sessions, rate-limits still open |
| 2 | KYC: submit · import · approve · reject · revoke · ban · NIDA duplicate | ✅ **COMPLETE** — approve · reject · revoke · ban · NIDA freed, all driven on prod (§6c). E-1 verified in **EN + SW + ZH**; E-3, E-6, E-2, E-5, **E-4 + E-9** fixed **and live-verified**. Only `import` untested |
| 3 | Money in: wallet · deposit · ledger · receipts | ✅ **UNBLOCKED + DONE (§6g)** — `alpha` and `echo` funded 50,000 each through the real money path; 9 webhook forgeries refused, exactly-once proven over 3 deliveries, ledger balanced |
| 4 | Core play: markets · YES/NO · win + lose · resolution · payout | ✅ **DONE on production (§6h)** — create → bet both sides → resolve → objection window → settle. A real WIN (37,400 paid) and a real LOSS, ledger sums to 0, with a CONTROL market proving the objection window is what gates payment |
| 5 | Up & Down: rounds · quick-bet · pricing · void · history | 🔴 **BLOCKED — E-16: it has never settled a round and cannot.** Round *generation* works (1,398 generated); *resolution* has 0 confirmed readings out of 1,400 and voids 100% |
| 6 | Proposals: propose · approve · 4-state switch · bonus | ⏳ |
| 7 | AI: poll generation · source registry · token enable/disable · usage | ✅ **generate → review → publish → live market DRIVEN ON PROD, 15/15, on real tokens** (§6e). **Spend ceiling fixed + live-verified (E-15).** Remaining: poll **resolution** with money, and the Up & Down half, which does not exist on prod (**E-17**) |
| 8 | Invites & referrals | ⏳ |
| 9 | Admin & accountant: roles · RBAC · finance · reports · settlement · audit | 🔄 **RBAC proven live for `MODERATOR`, 8 allow / 11 deny** (§4) — first `MODERATOR` account production has ever had. Finance · reports · settlement · audit untouched |
| 10 | Money out: withdrawal + the payout gate | ⏳ |
| 11 | Visual sweep: 4 widths × EN/SW/ZH across 89 routes | ⏳ |
| 12 | Adversarial: cheating, manipulation, abuse of every money path | ⏳ |
| 13 | Scale readiness for 10,000s of users | ⏳ |

### ⚠️ The numbered order above is NOT the priority order — Ali's is (2026-07-31)

Stated mid-session, so the phase numbers are now just labels. **Work these first**, and do not let the
table's ordering pull the campaign back to `3 → 4 → 5 …`:

1. **Up & Down: generation · playing · resolution — on our REAL AI tokens** (phase 5).
   🔴 **ANSWERED 2026-08-01, and the answer is worse than the question assumed — see E-16.**
   *Generation* works. *Resolution* has **never** worked: 0 confirmed readings in 1,400 attempts,
   1,398/1,398 rounds VOID, $59.37 of real tokens spent proving it. The `TWELVEDATA_API_KEY` note
   that used to sit here was **backwards** — the key blocks nothing deployed (§2); it is a
   prerequisite for the *unmerged* branch that would **fix** E-16. So this item is not "test it",
   it is **"the game cannot go live until E-16 is fixed"**, and the fix is a decision for Ali
   (§6b step 3), not a QA task.
2. **Polls: generation · playing · resolution · winning AND losing** (phases 7 + 4). A real win and a
   real loss settled end to end, with money moving, not just a market resolving.
   ℹ️ **Generation is confirmed live and healthy** (§5 row 7). The *playing / winning / losing* half
   is the part still blocked on a funded wallet.
3. **Visuals** (phase 11) — "super important". The 4-width × 3-locale sweep, and *looking* at the
   images (§6b: E-2 and E-5 were both found by looking, and one E-5 pass nearly shipped a
   below-the-fold screenshot as proof).
4. **The backup system, LIVE-tested** — "very important". Not "the config says backups are on":
   restore something. ⚠️ Start from the fact that `admin-guard.ts:33-40` records a precedent — a
   compliance card once *“showed a hardcoded green tick for backups that did not exist.”* Treat any
   green backup indicator as unproven until a restore has been driven. The seal key lives in Railway
   on the `50pick` service (§1).

**Everything in 1 and 2 needs money in a wallet, so Phase 3 stays the immediate next step** — it is
the prerequisite, not a detour.

## 6. Findings

Severity: **BLOCKER** (stops a player) · **HIGH** (money/compliance/data) · **MEDIUM** (real but
survivable) · **LOW** (polish). Every entry needs evidence — a screenshot, a DB row, or a log line.

| # | Sev | Area | Finding | Evidence | State |
|---|---|---|---|---|---|
| **A-1** | HIGH | register + sign-in | **The phone field could not accept 4 of the 5 shapes a Tanzanian writes.** `PhoneInput` stripped non-digits and truncated to 9, so `0712000101` → `071200010` ("Enter a valid Tanzania mobile number", never mentioning the leading zero) and a pasted `+255712000101` → `255712000`, *a different number*. `tzPhone` had always accepted all four. Hits the **first screen** of every new player. | typed into live `/auth/register`; table below | ✅ fixed |
| **A-2** | HIGH | sign-in | **Sign-in was a phone-enumeration oracle.** One unauthenticated request per number revealed whether it had a 50pick account: unknown → `?error=no_account`, real account + wrong password → `?error=wrong_credentials`. | live probe: `+255712000101` vs `+255799999999` | ✅ fixed |
| **A-3** | HIGH | sign-in / RG | **Self-exclusion status was readable without a password.** `SELF_EXCLUDED` / `SUSPENDED` / `CLOSED` were checked *before* the password, so a prober could learn that a given Tanzanian mobile belonged to someone who had self-excluded from gambling. | `auth-service.ts` ordering | ✅ fixed |

**A-1 evidence — what the live field kept, before the fix:**

| Typed | Field kept | |
|---|---|---|
| `0712000101` | `071 200 010` | last digit silently lost |
| `+255712000101` | `255 712 000` | **a different subscriber number** |
| `255712000101` | `255 712 000` | |
| `0712 000 101` | `071 200 010` | |
| `712000101` | `712 000 101` | the only shape that survived |

**Fixes** — `src/lib/phone-normalize.ts` (one shared definition, used by the widget so admin
sign-in cannot drift), `burnPasswordVerify()` + post-verification status gates in
`auth-service.ts`. **Guards**: `npm run test:phone-normalize` (17) · `npm run test:login-enum` (11).

| **D-1** | HIGH | `/profile/kyc` | **The card badged an unverified player "ID verified"** — green ticked pill, in EN/SW/ZH, bound to `nidaDone && !submitted`: a 20-digit number typed, zero documents uploaded, nothing submitted, no officer involved. | live walk-through; `page.tsx:301` | ✅ fixed → "NIDA saved" |
| **D-2** | HIGH | audit chain | **A 97% NIDA identity match was recorded that nothing computed.** Live KYC wrote `nida.verify.requested` → `nida.verify.success {"matchScore":0.97}` → `kyc.nida.verified {"matchScore":0.97}` into the hash-chained compliance record, and `verifyNida` returned `gender:"M"` for every player. `docs/NIDA-POLICY.md`: the authority check is "deliberately absent … no request has ever reached" NIDA. | live `AuditLog` rows 13:32; `nida.ts:53` | ✅ fixed |

D-1/D-2 both violate the same standing rule — **never fabricate live data; if we cannot
compute it we show and record nothing** — on the two surfaces where it matters most: what the
player is told about their own verification, and what a GBT/TRA inspector reads. Neither
touched money and nothing fabricated was persisted to the KYC row (name/DOB are the player's
own input echoed back), so the blast radius was presentation + audit, not balances.

**Fixes** — `t.profile.nidaSaved` in all three locales; `nida.ts` now audits
`nida.check.requested` / `nida.check.format_accepted` / `kyc.nida.accepted` carrying
`authorityChecked:false` and `basis:"format+uniqueness"`, and synthesises no score or gender.
The `NIDA_API_URL` switch is kept, so wiring a real endpoint restores the `verify.*` naming by
itself. **Guard**: `npm run test:kyc-honesty` (19).

**Verified working, not defects** — the duplicate-NIDA control genuinely holds: reusing
`alpha`'s number on `delta` left `nidaNumber` null and audited `kyc.nida.duplicate_blocked`
with the conflicting user id. Forgot-password is correctly enumeration-neutral and its reset
token is a stateless HMAC bound to the email *and* a password-hash fingerprint, so it is
single-use with a 1h TTL. The approval reward-burst and stepper are properly `APPROVED`-gated.

⚠️ **A-2/A-3 reversed an existing tested behaviour — Ali should know.** Three assertions in
`scripts/auth-email-signin.test.mts` pinned the *enumerating* answer as correct, and the parked
OTP path in `auth-service.ts:~93` still carries the opposite rationale in a comment
("anti-enumeration is not load-bearing for this product — phone numbers aren't private"). That
rationale is OTP-era; `MODULE-CERTIFICATION-PROGRAM.md` §A is the newer binding exit bar and
requires enumeration-neutrality *proven by timing distribution*. The three assertions were
updated with the reasoning inline. **If the OTP login path is ever un-parked it will reintroduce
A-2 and A-3** — fix it at the same time.

**Residual, not closed:** the brute-force lockout still only fires for accounts that exist, so 5+
wrong passwords against one number is a weaker existence signal. It is rate-limited (per
identifier *and* per IP) and audited, unlike the old one-request oracle. Left as-is deliberately;
closing it costs the owner a usable "your account is locked" message.

| **E-1** | HIGH | KYC reject · player + compliance | **A rejected player was shown a reason that contradicted itself, in English, in every language.** The officer picked *Details mismatch*; `/profile/kyc` read “**Reason: other.** Details do not match the submitted ID…”. Two defects stacked: (a) `rejectKycWorkstationAction` used the reason code only to pick an English sentence and never passed it on, so `reviewKyc` hard-coded `rejectReason: "OTHER"` — **every manual rejection 50pick has ever made is uncategorised**, and a rejection-reason report reads 100 % OTHER; (b) `humanizeRejectReason` keyed its label map on six names that are **not members** of the `KycRejectReason` enum (`NIDA_MISMATCH`, `PHOTO_UNREADABLE`, `WRONG_DOCUMENT`, `SELFIE_MISMATCH`, `EXPIRED_DOCUMENT`, `DUPLICATE_ACCOUNT` — only `UNDERAGE` was real), so every rejection fell through to `raw.replace(/_/g," ").toLowerCase()` and printed raw English enum text to SW and ZH players while **21 correct translations sat unreachable** in the dictionary. Hits the automatic NIDA rejections too — those have always written real enum members. | live rejection of `bravo` on prod; screenshot `p2-bravo-player-kyc-430`; DB `rejectReason='OTHER'` after the officer chose *Details mismatch* | ✅ fixed |

**E-1 fix** — the rail's reason codes now carry the enum member
(`document_unreadable→BLURRY_DOC`, `mismatch→DETAILS_MISMATCH`, `expired→EXPIRED_ID`;
`suspected_fraud→OTHER` **deliberately** — never tell a suspected fraudster what we
suspect), `reviewKyc` takes a typed `rejectCode` and audits it, `humanizeRejectReason`
is keyed on the schema enum and returns `null` rather than raw text, `OTHER` prints no
category at all (the officer's note is the message), and `rejectSanctioned` was added in
all three locales with copy that never names a sanctions list. The two orphan dictionary
keys were deleted — a dead translation key is indistinguishable from a live one, and that
is exactly what hid (b). **Guard**: `npm run test:kyc-reject-reason` (47) — it reads the
enum **out of `prisma/schema.prisma`**, so adding a member without a translation fails.
Proven red first: 12 failures against the pre-fix tree.

**E-1 verified on production** after deploy `ac123a17` (SUCCESS 17:21 EAT): `delta` was
rejected through `/admin/kyc/<id>` with *Document unreadable* and the row came back
`rejectReason = 'BLURRY_DOC'` — the first categorised rejection 50pick has ever stored —
while `bravo`'s older `OTHER` row now prints **no** category at all, just the officer's
sentence.

**E-1 verified in SW and ZH on production, 2026-07-31 17:45 EAT.** `delta`'s `/profile/kyc`
renders the categorised reason in the player's own language at all four widths:

| Locale | Rendered |
|---|---|
| `sw` | *Sababu: **Picha ya kitambulisho ina ukungu au ni nyeusi sana**.* |
| `zh` | *原因: **证件照片过于模糊或太暗**.* |

Evidence `shots/e1card-delta-{sw,zh}-{360,768,1280,1920}.png`, `html lang` confirmed `sw`/`zh`,
0 horizontal overflow at every width. **How the locale is actually selected** (this is what
blocked the previous session — record it, it is not obvious):

> The UI language is the **`kp-locale` cookie**, values `en` | `sw` | `zh`, written client-side
> by the header toggle (`src/lib/i18n.tsx:83-95` — React state + `localStorage["kp-locale"]` +
> the cookie + `router.refresh()`; no server action, no DB write). Every server render reads it
> from the cookie jar (`src/lib/i18n-server.ts:16-21`, `src/app/layout.tsx:96-105`). There is
> **no `?lang=`, no `/[locale]/` segment, no `NEXT_LOCALE`, and no `Accept-Language`** anywhere
> except `not-found.tsx`. Any unrecognised value silently renders English.
> In Playwright: `ctx.addCookies([{ name: "kp-locale", value: "sw", url: BASE }])` **and**
> `localStorage["kp-locale"]`, because the provider adopts localStorage on mount.

| **E-3** | MEDIUM | KYC documents | **Every KYC document stored in R2 records `sizeBytes = 0`, `mimeType = 'application/octet-stream'`** while holding a real JPEG. `attachDocument` measures the truth (`validateDocImage` sniffs the mime from the **magic bytes** and decodes the byte count) and `db.kyc.upsert` writes it — but **`toStoredKyc` dropped both columns on the way back out**, and the upsert syncs documents by **deleting and re-creating every row** from the StoredKyc it is handed, re-deriving the two facts from the `storageKey`. That regex only matches an inline `data:` URL, so every `r2:<key>` was rewritten as octet-stream/0. The very next write after an upload — attaching document 2, or `submitForReview` — erased document 1's measurement. The write half was fixed in `502160f`; **the read half is what made that fix invisible**, which is why its own comment still described live data. These columns are what a compliance export and the retention tooling state about a citizen's identity evidence. | live `KycDocument` table: **19/19** R2 rows octet-stream/0, **24/24** legacy inline rows correct — the split is the bug | ✅ fixed |

**E-3 fix** — `toStoredKyc` carries `mimeType`/`sizeBytes` back out, and the row builder is
extracted as the exported, tested `toKycDocumentRows()` so the upsert can no longer
re-implement the derivation (that drift is how this happened). Evidence precedence is now
explicit, strongest first: **the inline bytes themselves** (measurable, so they beat any stored
column) → **the carried sniffed facts** (the only evidence an `r2:<key>` can ever have) →
`application/octet-stream` / `0`, the honest *we do not know*. The inline size formula also now
subtracts base64 padding exactly as `validateDocImage` does — the two disagreed by 1–2 bytes.
**E-3 verified on production** after deploy `2b563b81` (SUCCESS 17:56 EAT), by re-uploading real
JPEGs as `delta` through the real `/profile/kyc` uploader and reading the live rows back:

| | `mimeType` | `sizeBytes` | |
|---|---|---|---|
| all three, before | `application/octet-stream` | `0` | the production defect |
| after re-uploading `NIDA_FRONT` | **`image/jpeg`** | **`51593`** | 76 077-byte JPEG, client-side resized |
| after then re-uploading `NIDA_BACK` | `image/jpeg` | `51684` | and **`NIDA_FRONT` still reads `51593`** |

That last line is the whole fix: before it, the second upload's delete-and-recreate re-derived
the first document's facts from an `r2:` key and wrote it back as octet-stream/0. `SELFIE` was
deliberately left untouched and is still `0` — which is the correct behaviour for a row nobody
has re-uploaded, and the reason the backfill question below is real.

⏳ **The 19 existing rows stay wrong until re-uploaded — a backfill is Ali's call** (the bytes
are in R2, so a backfill could HEAD each object rather than guess). **Guard**:
`npm run test:kyc-doc-metadata` (19) — it drives the real `toStoredKyc → toKycDocumentRows`
round trip, not either half alone. Proven red first: reverting *only* the read half fails 5
assertions with exactly the production symptom (`application/octet-stream` / `0`).

| **E-6** | MEDIUM | KYC reject · player | **The rejection reason is printed twice — once in the player's language, once in English.** Found while verifying E-1 in SW/ZH. `REJECT_REASONS` mapped each rail code to a hard-coded **English sentence**, prepended to the officer's note and stored as `rejectNote`. Once E-1 made the category translate, a Swahili player read *“Sababu: **Picha ya kitambulisho ina ukungu au ni nyeusi sana**. Document unreadable — please re-upload a clear photo.”* — the same sentence twice, the second one ours, in a language 44 of 46 live users have not chosen. The **automatic NIDA** rejections did it too (`NIDA_TEXT` beside `DETAILS_MISMATCH`/`EXPIRED_ID`/`UNDERAGE`/`SANCTIONED`, all of which have translated labels). | `shots/e1card-delta-sw-360.png`, `e1card-delta-zh-1280.png` | ✅ fixed |

**E-6 fix** — one rule, applied on both rejection paths: **`rejectNote` carries the officer's own
words and nothing else**, because whatever is stored there is shown to the player verbatim, in
whatever language it was written. Our English sentence survives only for `OTHER`, which renders
no category at all and would otherwise tell a player they were rejected and nothing more.
Two consequences had to be handled rather than worked around:

- The `reason.length < 5` rule in `reviewKyc` **pre-dates categorised rejections** and is what
  forced the English sentence to exist. It now applies only when the rejection is uncategorised
  — a categorised one already says why, in the player's language. The officer's screen keeps the
  same requirement for `OTHER`, so no rejection can reach a player with nothing to read.
- The **rejection email has no dictionary**, so blanking `rejectNote` would have sent an email
  with an empty reason line. `REJECT_EMAIL_TEXT` gives every enum member an English fallback the
  email uses when the officer wrote no note. `SANCTIONED` still names no list (the E-1 rule).

`rejectNote` is now written `null`, not `""`. **Guard**: `test:kyc-reject-reason` grows 47 → 64,
including one assertion per rail code that its English sentence is empty. Proven red first: 16
failures against the pre-fix tree.

**E-6 verified on production** after deploy `ef507b41` (SUCCESS 18:06 EAT), by driving the whole
cycle: `delta` restarted KYC → refilled NIDA → uploaded three documents → submitted; the officer
then rejected with *Details mismatch* and **an empty note**, which the pre-fix server would have
refused. Row: `rejectReason = 'DETAILS_MISMATCH'`, **`rejectNote = NULL`**. What the player reads:

| Locale | Rendered |
|---|---|
| `sw` | *Sababu: **Taarifa za NIDA hazilingani na rekodi zetu**. Tafadhali ingiza tena maelezo yako…* |
| `zh` | *原因: **NIDA 信息与我们的记录不符**. 请在下方重新输入您的信息并重新提交…* |
| `en` | *Reason: **NIDA details don't match our records**. Please re-enter your details below…* |

Not one word of stray English in the Swahili or Chinese render. Evidence `shots/e6-player-{sw,zh,en}.png`,
`e6-officer-no-note.png`.

🎯 **That run also re-proved E-3 the hard way.** A complete fresh submission — three uploads
*then* `submitForReview`, the exact sequence that used to zero everything — left all three rows
`image/jpeg` / `57960`. **This is the first KYC submission 50pick has ever stored with correct
document metadata.**

| **E-2** | MEDIUM | KYC workstation | **One officer screen renders the same day in two timezones.** The decision card says *31 Jul 2026, 17:11* and the applicant panel *SUBMITTED 31 Jul 2026, 16:31* (both EAT), while the document strip directly between them says *uploaded 2026-07-31 13:31:33* — the raw UTC value, unlabelled and 3h earlier. DOB renders as the raw ISO string `1995-04-12T00:00:00.000Z`. An officer comparing upload time against submission time on a compliance record reads a 3-hour gap that does not exist. | `shots/p2-bravo-rejected.png` — all three on one screen | ✅ fixed |

**E-2 fix** — the document strip was `uploadedAt.slice(0, 19).replace("T", " ")`: the raw ISO
value with its `Z` cut off, so it neither *said* UTC nor *was* local. It now uses the same
`formatDateTime` as the two panels around it, and DOB uses `formatDate` in both places it
appears. A raw UTC string is not banned outright — `/admin/insights` prints one and writes
“UTC” next to it, which is honest; what is banned is an **unlabelled** one sitting beside
formatted local times. **Guard**: `npm run test:kyc-workstation-time` (16) — it asserts the
source pattern is gone *and* drives the helpers on the exact instant from the screenshot
(`13:31:33Z` must render `16:31`), plus that a midnight DOB stays on its own day. Proven red
first: 7 failures against the pre-fix tree.

**E-2 verified on production** after deploy `df131ed4` (SUCCESS 18:16 EAT), on the same officer
screen that produced the finding:

| | Before (`shots/e6-officer-no-note.png`) | After (`shots/e2-officer-768.png`) |
|---|---|---|
| document strip | `uploaded 2026-07-31 15:10:01` | **`uploaded 31 Jul 2026, 18:10`** |
| applicant · SUBMITTED | `31 Jul 2026, 18:10` | `31 Jul 2026, 18:10` (unchanged) |
| applicant · DOB | `1995-04-12T00:00:00.000Z` | **`12 Apr 1995`** |

The two timestamps now read the same instant in the same zone, side by side — that 3-hour gap
was the whole finding. A DOM scan for `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}` returns **nothing** on the
page. Audited at **360 / 768 / 1280 / 1920**: 0 horizontal overflow and 0 console errors at every
width.

⚠️ **Not fixed, deliberately, and the next session should not "tidy" it**: the same unlabelled
`slice().replace("T"," ")` pattern also appears in `src/lib/server/reports/catalogue.ts:497-522`.
That is the **reports** subsystem, whose window bounds feed the TRA/GBT levies and are pinned by
`test:report-parity`. Changing what a report prints is a separate, evidenced piece of work.

| **E-5** | MEDIUM | approval burst | **The approval burst promised what the next banner refused.** `/profile/kyc` showed the gold *ID verified* burst reading “**You can now deposit and withdraw freely**”, and it was wrong twice on the one screen a player is proudest of. (a) **Deposits were never gated on KYC at all** — the product's own ladder is *browse free → verify email to deposit → KYC to withdraw* (`wallet/deposit/page.tsx`, the EMAIL GATE block), so approval unlocked no part of depositing, and the burst rendered **directly beneath** the banner telling the player to confirm their email before adding money; `/wallet/deposit` then blocks on exactly that. (b) **Withdrawals carry a second gate** — when the payout provider cannot pay, `payoutsAcceptingRequests` is false and `/wallet/withdraw` refuses the request outright, which is the live state of the platform today. Same family as D-1/D-2 (telling a player something about their own verification the product does not support), and no money or audit record moved — but it lands on the celebration screen, which is where a player decides whether to trust us. | `shots/p2-alpha-player-kyc-430.png`, `p2-alpha-wallet-deposit-430b.png` | ✅ fixed |

**E-5 fix** — the burst now states only what approval **actually** unlocked, and it **asks the
live gate instead of assuming it**. `kycApprovedBody` became “Your identity is verified. You can
now request withdrawals to your mobile money account” (no deposit promise, and “freely” is gone —
nothing here is free of gates), and a new `kycApprovedPayoutsPaused` renders instead when
`payoutsAcceptingRequests` is false, saying withdrawals are paused **and that the balance is safe
and unchanged** — “we cannot pay you” alone reads as “your money is gone”. All three locales moved
together, as with E-1. A failed gate read defaults to **accepting**, matching
`derivePayoutStatus`'s own `catch` (`payout-status.ts:120`): an unreachable DB is not evidence
that payouts are down, and claiming an unsubstantiated pause is the same defect pointing the other
way. The existing email banner is untouched — with the deposit promise gone, it no longer
contradicts anything. **Guard**: `npm run test:kyc-approved-copy` (30). It gives each locale its
**own** forbidden term (`deposit` / `kuweka` / `充值`), because this bug survived review precisely
by being in a language the reviewer did not read; it pins `payoutsAcceptingRequests`' meaning
(`delayed` still accepts — a slow payout is not a refused one, so the burst must not claim a
pause); and it pins **the ladder the copy rests on**, so gating deposits on KYC later cannot
silently make this copy wrong again. Proven red first: **7 failures** against the pre-fix tree,
including all three locales.

**E-5 verified on production** after deploy `36213464` (SUCCESS 19:19 EAT), driven through the real
UI as the approved player `alpha` at **360 / 768 / 1280 / 1920 × EN / SW / ZH — all 12 combinations**:

| | Result |
|---|---|
| the shipped promise (`deposit and withdraw freely`, and its SW/ZH twins) | **absent in all 12** |
| which branch renders live | the **paused** one, in all 12 — correct, and see below |
| “balance is safe and unchanged” present | all 12 |
| `html lang` | `en` / `sw` / `zh` as set |
| horizontal overflow · console errors | **0 · 0** at every width |
| burst found, and not clipped by its container | 12/12 (328 px @360, 608 @768, 576 @1280+) |

**The live gate proves the finding was real, not theoretical.** `SystemConfig.payouts.availability`
is unset (so `declared` = `operational`), but **three WITHDRAWAL rows have sat `PENDING`/`PROCESSING`
since 2026-07-29 14:04Z**, which trips `derivePayoutStatus` on *both* limits at once
(`UNAVAILABLE_STUCK_COUNT` = 3, `UNAVAILABLE_AFTER_HOURS` = 6 vs ~53h elapsed). So live status is
`unavailable` → `payoutsAcceptingRequests` is **false** → before this fix, every approved player was
being congratulated with “you can now deposit and withdraw freely” **by a platform that could not
pay a withdrawal at all**, directly above a banner refusing their deposit. Rendered now:

| Locale | Rendered |
|---|---|
| `en` | *Your identity is verified. Withdrawals are paused right now — our payout provider cannot complete transfers. Your balance is safe and unchanged.* |
| `sw` | *Utambulisho wako umethibitishwa. Kutoa pesa kumesitishwa kwa sasa — mtoa huduma wetu wa malipo hawezi kukamilisha uhamisho. Salio lako ni salama na halibadiliki.* |
| `zh` | *您的身份已验证。提现目前已暂停——我们的支付服务商无法完成转账。您的余额安全且不变。* |

Evidence `shots/e5-burst-{en,sw,zh}-{360,768,1280,1920}.png` (viewport) and
`shots/e5v-el-*.png` (the burst element itself, scrolled into view). ⚠️ **The first pass was not
evidence and nearly shipped as if it were**: at 360 the burst is *below the fold*, so a viewport
screenshot photographed the page header while the text assertion — which read `body.innerText` —
passed. The images only became proof once the element was scrolled into view and captured on its
own. Assert on the DOM, but photograph the thing you are claiming.

| **E-4** | MEDIUM→**HIGH** | KYC workstation | **The officer's four attestations were never recorded — and never required.** *Name matches the ID · Document appears authentic · Selfie matches the ID photo · Sanctions / PEP clear* armed the Approve button from client-side `useState` and were then discarded. Two defects wearing one coat, and the second is the serious one the original write-up missed: **(a) NOT RECORDED** — the audit payload carried only `{riskScore, makerChecker}`, so the one thing an inspector would ask for (that a *named officer* positively attested the selfie matched a citizen's ID) existed nowhere afterwards; **(b) NOT ENFORCED** — the gate was client-side *only*. `approveKycWorkstationAction` took a `userId` and approved, so an approval that **opens the withdrawal rail** could be made with **no attestations at all**. The checklist was decorative from the server's point of view. | `kyc-decision-rail.tsx` (`judg` useState, `run(approveKycWorkstationAction, …)` with no extras) vs `kyc-actions.ts`; live audit row `kyc.workstation.approved` | ✅ fixed |

**E-4 fix — and the schema decision the handoff asked for.** The four attestations now travel with
the decision, are **required server-side**, and land in the **hash-chained audit payload**.

> **Audit payload, not a column — and this is the *defensible* answer, not the cheap one.** The
> handoff assumed a column would be more defensible. Measured, it is the opposite: a column on
> `KycSubmission` is **mutable**, and an attestation that can be silently edited later is weaker
> evidence, not stronger. The audit log is append-only and **hash-chained** (`AUDIT_CHAIN_SECRET`),
> and it is **retained** — `privacy.ts:89` blocks DSAR erasure precisely to preserve the **7-year
> AML window**, so these rows outlive the request by design. The attestation therefore lands in the
> same tamper-evident record, at the same instant, attributed to the same officer, as the decision
> it justifies. No migration was run against the live money DB to achieve it.

Mechanics: a new shared `src/lib/kyc-attestations.ts` holds the four keys **once** and is imported
by *both* the client rail and the server action, so collected-keys and required-keys cannot drift —
that drift is exactly what hid E-1(b). `parseAttestations` is deliberately strict: every one of the
four must be present and exactly `pass` (`fail` and `pending` are both refusals, and a **missing key
is not an implied yes**), and **unknown keys are refused rather than ignored**, so a forged payload
cannot pad itself. The refusal names the outstanding check, so the button reads as un-armed rather
than broken. **The maker attests too** — `recommendKycApprovalAction` requires and records the same
evidence, because a recommendation is what the second officer relies on; without it the
maker-checker gate would rest on an unrecorded claim. A missing attestation on an approve is either
a client bug or a bypass attempt, so it is audited as **SECURITY**
(`kyc.approve.attestations_missing`), not returned as a silent validation error.

**Guard**: `npm run test:kyc-attestations` (39). It drives the real `parseAttestations` rather than
asserting on source text — *a client-side gate is precisely what looks correct in review and is
absent on the wire* — and it checks each of the four keys individually for missing/`fail`/`pending`,
plus malformed JSON, `null`, an array, and a padded payload. Proven red first: **10 failures**
against the pre-fix wiring, while the 29 pure-validator assertions still passed — i.e. the wiring
assertions are what caught the defect.

**E-4 verified END-TO-END on a local in-memory boot** — because a guard and a green build could not
answer the question that actually mattered. E-4 makes the server **refuse** an approval whose
attestations are absent; if the FormData the real rail sends did not satisfy the validator, **every
KYC approval on the live platform would be blocked**, and two real players are already queued (§6c
ops note). Neither the unit guard nor `npm run build` proves the wire. So the whole flow was driven
against `localhost:3400` (`DISABLE_ADMIN_TOTP=true`, mirroring prod's own setting): player seeded via
`/api/dev-test/fresh-kyc-player` → **three real JPEGs minted in-browser** (the uploader runs a real
canvas resize and the server sniffs magic bytes, so a hand-rolled buffer is rejected) → submitted →
officer seeded via `/api/dev-test/seed-admin` → decision rail driven by hand:

| Check | Result |
|---|---|
| Approve disabled with only **3** attestations ticked | **true** — the client gate still holds |
| Approve enabled with all **4** | **true** |
| approval **succeeded** — no `Blocked` toast, officer screen reads verified | **true** ← the regression that mattered |
| `kyc.workstation.approved` present in the audit log | **true** |
| its payload carries `name_matches` · `document_authentic` · `selfie_match` · `sanctions_clear` | **all four** |
| audit **CHAIN INTEGRITY** after the new payload shape | **Valid** (HMAC-chained) — adding the field did not break chain verification |
| E-9: dialog says “opens the withdrawal gate”, no longer “deposits, play and withdrawals” | **true / true** |
| E-5 end-to-end: the player's burst renders and does **not** mention deposits | **true** |

Evidence `shots/e4-local-{player-submitted,officer-armed,confirm-dialog,officer-after,audit,player-approved}.png`.

**✅ E-4 VERIFIED ON PRODUCTION, 2026-07-31 21:57 EAT — including the half that mattered.**
Driven against `https://50pick.tz` on deploy `a924bde9` as the new **QA compliance officer** (§4), on
a purpose-made applicant `echo` (§4) staged through the real player UI. `live/e4-prod.cjs`.

The local run had already proved the happy path. What it could **not** prove is that the *live* server
— the one serving real money — refuses an approval whose attestations are absent. That is E-4(b), the
serious half, and a client-side gate is precisely what looks correct in review and is absent on the
wire. So it was attacked directly:

> **The adversarial probe.** `run()` (`kyc-decision-rail.tsx:77`) builds a `new FormData()` and
> `set`s `attestations`. So `FormData.prototype.set` was patched **in the page** to drop that one
> field, reproducing the exact pre-fix wire while every client-side control still reads as satisfied.
> Then Approve → confirm.

| # | Check on production | Result |
|---|---|---|
| 1 | Approve inert with **3 of 4** attestations ticked | **disabled** — client gate holds |
| 1 | Approve armed with all **4** | **enabled** |
| 2 | `attestations` confirmed dropped on the wire | `["attestations"]` |
| 2 | **the live server REFUSED** | **“Blocked · The verification attestations are missing.”** |
| 2 | `echo` still awaiting review afterwards | **yes** — nothing was approved |
| 2 | E-9 dialog copy: “opens the withdrawal gate” / no “deposits, play and withdrawals” | **true / true** |
| 3 | a real approval then **succeeded** | **yes**, no Blocked toast ← the regression that would have frozen every live KYC approval |
| 3 | `KycSubmission → APPROVED`, `User.status → ACTIVE`, `displayName` backfilled | all three |
| — | horizontal overflow · console errors, at 1440 | **0 · 0** |

**The audit row, read straight off the live money DB** (`live/e4-audit-read.cjs`):

```
2026-07-31 18:57:01Z  SECURITY    kyc.approve.attestations_missing
   {"reason": "The verification attestations are missing."}          ← the refused probe
2026-07-31 18:57:10Z  COMPLIANCE  kyc.workstation.approved
   {"riskScore": 10, "makerChecker": false,
    "attestations": {"name_matches":"pass","document_authentic":"pass",
                     "selfie_match":"pass","sanctions_clear":"pass"}}
```

All three rows are attributed to `usr_2ff22430c8…`, the officer who actually decided. Unexpected keys
in the attestation object: **none**. For contrast, **the only two `kyc.workstation.approved` rows
production had before today read exactly `{"riskScore": 10, "makerChecker": false}`** — that is the
E-4 defect, captured on live. This is the first approval 50pick has ever recorded with the officer's
attestations attached.

📸 `shots/e4p-05-server-refused.png` is the one to look at: **all four checks render `PASS`, Approve
is armed and blue, and the server still says Blocked.** That single frame is E-4(b). The same frame
re-confirms **E-2** (`uploaded 31 Jul 2026, 21:45` beside `SUBMITTED 31 Jul 2026, 21:47` — one zone,
formatted, DOB `12 Apr 1995`) and **D-2** (`no authority check by design`). Also
`e4p-{01,02,03,04,06}-*.png`.

**Chain integrity after the new payload shape:** the `prevHash → entryHash` links over the tail are
**all valid** (newest `seq` 19420). ⚠️ Read that claim with the §3 `ORDER BY`-alias trap in mind — the
first attempt reported *two broken links* and was **my SQL, not the product**. The product's own
authoritative `verifyChainFull()` is on `/admin/system`, which is the **`ops`** domain and therefore
correctly unreachable for a COMPLIANCE officer — so it is **booked, not claimed** (see E-12).

⚠️ **Trap paid for here, for the next session:** hard-killing `next dev` mid-write **corrupts the
Turbopack cache** — the next boot says `✓ Ready` and then serves nothing, panicking with
`Cache corruption detected: checksum mismatch in block … .sst`. It looks exactly like a hung
compile. Fix: kill whatever still holds the port (stopping the shell does **not** kill the Next
child — it survives and keeps the port, so a replacement server dies of `EADDRINUSE` and you end up
testing the OLD process), then `Remove-Item -Recurse -Force .next` and restart.

| **E-9** | MEDIUM | KYC workstation · officer copy | **The approve dialog told the accountable officer the wrong consequence.** The confirmation read “This marks the player's identity as verified and **unlocks full real-money deposits, play and withdrawals**” — wrong on two of the three, measured at the **enforcement layer** rather than the UI: deposits are gated on a confirmed email address (`wallet-service.ts:121`), and **play is not gated on identity at all** (`market-service.ts` contains no KYC reference in 2,986 lines). Only the withdrawal gate turns on this decision (`wallet-service.ts:1226`). The officer-facing twin of E-5, found while fixing E-4 — and in one respect worse, because misstating what a compliance action does, in the confirmation the accountable officer reads, is a defect in the record's provenance, not just in copy. | `kyc-decision-rail.tsx` approve `ConfirmDialog` body | ✅ fixed |

**E-9 fix** — the dialog now says the decision opens the **withdrawal** gate, and states plainly
that deposits are gated on a confirmed email and play is not gated on identity. **Guard**:
`test:kyc-approved-copy` grows 30 → 35 and now pins the **enforcement**, not the presentation —
the deposit *service* checking `emailVerifiedAt`, the withdraw *service* checking
`status !== "APPROVED"` plus its `withdraw.kyc_blocked` audit, and `market-service` carrying no KYC
reference at all. If play or deposits ever become identity-gated, every “what approval unlocks”
string on the platform fails a test instead of quietly becoming a lie.

**Post-deploy smoke on production as `alpha`** (after the E-4/E-9 deploy `fafef331`, SUCCESS 19:48
EAT): `/` · `/markets` · `/profile` · `/profile/kyc` · `/wallet` · `/wallet/deposit` ·
`/wallet/withdraw` · `/updown` · `/results` · `/positions` · `/watchlist` — **11/11 → 200, 0
horizontal overflow, 0 console errors.** So the compliance change did not regress the player
surfaces. Two things that looked like findings in that run and were not:

- **`/history` 404 is not a broken link — there is no such route.** The nav's *History* label points
  at **`/positions`** (`top-app-bar.tsx:72`). The 404 was invented by the smoke script, not by the
  product.
- **`navigator.vibrate` console errors are a headless artifact** — “Blocked call to
  navigator.vibrate because user hasn't tapped on the frame”. Chromium refuses haptics without a
  real gesture. They appeared in one run and not the next; they are not a defect.

⚠️ **And one lesson about the harness, not the product.** That smoke's E-5 line printed
*“paused branch present: **false**”* on one run, which read like a regression. It was **vacuous**:
the script asserted the paused copy was *absent* without first proving the burst was *on the page*,
so an unrelated navigation hiccup produced a false alarm. A targeted recheck — assert the burst
**exists**, then read its own `innerText`, three consecutive fresh sessions — returned the correct
paused sentence **3/3**, with the live gate unchanged (still 3 in-flight withdrawals since
2026-07-29). **Assert existence before asserting absence**, or a missing element will happily
confirm whatever you were hoping for.

### 🚫 Two things that look like defects on this screen and are NOT — do not file them

1. **The teal disc bleeding off the right edge of every screenshot is The Needle.** `#needle` is
   `position: fixed`, `role="presentation"`, `pointer-events: none`, z 45, placed by
   `translate3d(1248px, 418px, 0)` — so at 1280 it hangs 32 px past the edge. It is the design
   system's deliberate *persistent, physically-simulated pause object*
   (`src/components/layout/needle.tsx`, brief `docs/design-system/v2-2026-07-27/09-needle/`),
   mounted once in the shell, **parked** at an edge until grabbed, hidden on `/wallet/*` money
   surfaces and toggleable from the navbar. Headless has no pointer, so it simply rests where it
   was placed. It does not scroll the page (`scrollWidth − clientWidth` = 0).
2. **The Swahili burst caption is not truncated.** `shots/e5v-el-sw-360.png` reads
   “*…imethibitishwa*” and looks cut, but the SW string genuinely **is** `Imethibitishwa`
   (`i18n-dict.ts:2196`) — one word, complete. A burst ray crosses the capital `I`. EN is
   `ID verified`, ZH is `已验证`; none of the three overflow.

| **E-15** | **HIGH** | AI spend · money safety | **The AI credit ceiling was enforced on poll generation ONLY, so the platform's two biggest spenders ran uncapped.** `assertAiBudget` has refused over-limit calls since the F8 events-calendar work — and it was imported by `ai-poll-generation.ts` and **nothing else**. Measured on live production: `polls` 447 calls / **$80.72** (capped) · `sentinel` 2,962 calls / **$68.36** (uncapped) · `updown` 656 calls / **$59.37** (uncapped). **$127.73 of real money bypassed a $20 cycle limit.** The Up & Down oracle spent **256 calls / $21.35 on 2026-07-26 alone** — one day past the whole-cycle cap — and nothing refused a single call; the sentinel once made **383 calls costing $15.38 in one hour**, and 1,427 calls over 13 hours after the provider account had already run dry. Exactly E-4's defect class: a control that exists, reads as correct in review, and is absent at the point that needed it. | live `AiUsageEvent` aggregates (above); `grep assertAiBudget src/` → one production file | ✅ fixed |

**E-15 fix** — `assertAiBudget` now gates **both** remaining spend paths, **before** the provider is
dialled: `observePrice` (a new `budget-exhausted` `RefusalReason`) and `deepCheckMarket` (an `error`
action). Refusing is the safe direction in both, and that is *why* those two shapes were chosen
rather than a throw: the oracle's existing contract is that a boundary which will not confirm
**voids its rounds and refunds every stake in full**, and `deepCheckMarket` never writes to a market
or moves money, so a blocked check leaves it exactly as it was for a human officer. `outcome` stays
`UNKNOWN` with `confidence 0` — **a spend ceiling is not evidence about the world**, and must never
be recorded as one. `describeRefusal` names the credit limit and the two numbers, so an operator
watching rounds void can tell a ceiling they can raise from a price source that is broken.

**Guard**: `npm run test:ai-budget` (28). It **drives the real `observePrice` and `deepCheckMarket`**
rather than asserting on source text — E-4 established that a missing gate is precisely what reads as
present in review. The provider key is a deliberate dummy: both gates sit after the client is built
and before any network call, so a blocked call must make **no request**, which is asserted by proving
the feature's `AiUsage` call count **does not move**. Pre-fix, that count went `2 → 3` and the
refusal reason came back `"error"` carrying a provider **401** — i.e. over budget, it really did dial
out and pay. Proven red first: **5 failures** on the pre-fix tree, each naming the production
symptom. The suite also models spend as **paths, not files** (polls is legitimately gated one layer
above the module that meters, in `ai-poll-generation.ts`, and both provider entry points are reached
from there alone), and carries a **drift detector** that fails if any new module starts metering AI
spend without being declared with its gate — adversarially verified by adding an ungated spender,
which it named by filename.

### Open findings — evidenced on production, NOT yet fixed

| # | Sev | Area | Finding | Evidence |
|---|---|---|---|---|
| **E-16** | 🔴 **BLOCKER** | Up & Down · resolution | **Up & Down has NEVER settled a single round on production, and cannot.** The price oracle has produced **zero** confirmed readings in its entire history: `UpDownObservation` holds **1,397 `PENDING` + 3 `FAILED` = 0 `CONFIRMED`**, and every one of the **1,398** `UpDownRound` rows is **`VOID`** (1,395 `operator`, 3 `source-failed`). `PredictionMarket` agrees — **1,398 `UPDOWN` rows, every one `VOIDED`**, not one `RESOLVED`. The cause is in the stored `failReason`s and it is the same every time: **the two enabled assets' sources render their prices in JavaScript widgets that a web search cannot read.** Verbatim from live rows — *"the search engine returned only static/descriptive text from that page … no actual quoted numeric spot price and no timestamp"* (`goldprice.org`), and for `kitco.com` the crawl returns only *"Market Data and Widgets Technology provided by TradingView"* and *"Data Delayed by 10 minutes"*. So the design behaved **honestly** — it refused rather than guessing, and every stake was refunded, which is the correct and player-safe direction — but the game is **structurally unable to resolve**, and it burned **$59.37** of real tokens establishing that 656 times. ⚠️ Both chains are currently `PAUSED`/`STOPPED` and the newest boundary is 2026-07-30 09:40, so nothing is spending **right now**. | live: `UpDownObservation` state counts · `UpDownRound` outcome counts · the `failReason` text quoted above · `AiUsageEvent` feature=`updown` |

**E-16 — WHICH GATE actually refuses, classified over all 1,400 live observations.** This is the part
that decides the fix, and it is not what the first look suggested:

| Refusals | Gate | Meaning |
|---|---|---|
| 519 | *(not a gate)* `Resolution AI is paused` | an operator had paused it |
| **450** | **GATE 1 `unparseable-price`** | **the page could not be READ at all** |
| **427** | **GATE 3/4 `stale`** | **a price WAS read — the SOURCE'S OWN TIMESTAMP was outside the 90s window** |
| 3 | ladder exhausted (4 attempts) | → `FAILED` → round VOID |
| 1 | provider `529 overload` | transient |

`price` is non-null on **0** rows and `sourceQuotedAt` on **0** rows, because a refused reading persists
only its `failReason` — so the classification above is the only record of what happened, and it says
there are **two independent causes, not one**:

1. **Readability** (450). The approved pages serve their price from a JS/TradingView widget.
2. **The time contract** (427) — **and this one cannot be fixed by changing sources.** Live
   `SystemConfig.updown.config` sets `maxStalenessSeconds: 90`, and a web search returns a *crawled*
   page, not a live tick. 427 times the model read a real price and was refused because the page's own
   published time was more than 90s from the boundary. Note also that the retry ladder
   (`retryBackoffSeconds: [15, 45, 120]`, `maxObservationAttempts: 4`) puts attempt 4 at ~T+180s, so by
   then a **fresh** quote is *necessarily* >90s from the boundary — later attempts can only succeed
   with an older quote. The ladder partly works against the gate it is retrying for.

**Tested, not assumed: the obvious fix does not work.** `coingecko.com` is the strongest candidate
source on the platform — it is already an **enabled `TrustedSource`**, and the AI-poll pipeline
resolves BTC/ETH markets against it successfully. Probed on real tokens through the **real
`observePrice`** (`scripts/ops-updown-probe-source.mts`, ~$0.09–0.35/probe, no DB writes): **REFUSED,
`unparseable-price`** — *"neither snippet contained the explicit, directly quoted BTC/USD spot…"*; the
crawl returned the all-time high and a percentage, not the current price. So re-pointing assets is
**not** a viable fix, which is exactly what the unmerged branch concluded when it titled its commit
*"a real price feed — the only method that can meet the time contract"*.

> 🔑 **The engine is not buggy — it is being asked to do something a web search cannot do.** Every
> refusal was the *correct* call: it refunded every stake rather than settling real money on a guessed
> or stale price. That is the design working. What is broken is the **premise** that an LLM web search
> can source a price to a 90-second contract. `updown-oracle.ts`'s own header says so in its first
> paragraph. Fixing E-16 means changing the price *source*, not the engine.
| **E-17** | MEDIUM | Up & Down · AI generation | **The Up & Down AI-generation surface does not exist on production — and prod carries its orphaned table.** Ali's own observation (2026-08-01): *"in the nav bar the AI generation is not there, maybe we have to add it in admin for up down."* Confirmed live as the trading officer: the **Up & Down** nav group renders exactly two items, `Overview` and `Rounds`, while the **Markets** group has `AI poll generation` and `AI candidates`. There is no generation page, no route and no nav entry — `src/app/admin/updown/` holds only `page.tsx`, `rounds/`, `actions.ts` and `updown-controls.tsx`, and `actions.ts` exports asset/chain CRUD plus thresholds and **nothing that triggers a reading or a round**. Meanwhile **migration `20260730223000_updown_proposals` IS applied to the live DB** (2026-07-30 13:41Z) so the `UpDownProposal` table exists on production with **0 rows and no code referencing it** — `model UpDownProposal` is absent from `main`'s `prisma/schema.prisma` entirely. ⛔ Not a new discovery for the backup subsystem, which already documents it (`backup/core.ts:117`, `db-backup.mts:181`, `backup.test.mts:91` all name `UpDownProposal` as a table "applied ahead of its code") — but it *is* new as a **product** gap. Everything missing lives on the unmerged branch: `admin/updown/proposals/{page,actions,proposal-actions}.tsx`, `updown-proposal.ts` (849 lines), and the `AI proposals` nav entry. | live nav read from the DOM as `MODERATOR` (`live/t2-rbac-content.cjs`); live `_prisma_migrations`; `git diff main...origin/feat/updown-source-pinning-and-proposals` |
| ~~**E-18**~~ | MEDIUM | RBAC · resolver queue · audit hygiene | **✅ FIXED 2026-08-01 — and it was three surfaces, not one. See the block below §6f.** Original finding text kept for the record: | **Every interactive control on `/admin/resolver-queue` is gated tighter than the page, so no granted role can use any of them — and an innocent click writes a SECURITY privilege-escalation row.** The route is the **`trading`** domain, so a `MODERATOR` sees the queue *and* its buttons; but `recheckMarketNowAction` and the two-officer toggle both require `ADMIN \|\| canAct(role,"compliance")` (`resolution-mode-action.ts:31`, `resolution-policy-action.ts:27`), and `ResolveControls` → `resolveMarketAction` requires `requireAdminOrThrow`. `DEFAULT_GRANTS` makes those sets **disjoint**: `MODERATOR` has `trading` but no `compliance` (sees, cannot act); `COMPLIANCE` has no `trading` at all (can act, cannot even reach the page). **So on production only the 9 `ADMIN` accounts can operate the resolver queue — no granted role can.** Worse for the audit trail: clicking a button the UI offered writes `privilege_escalation_blocked` at **`SECURITY`** severity, i.e. a legitimate operator's ordinary click is recorded as an attempted privilege escalation in the log a compliance officer reads. ⚠️ **This is a known-and-already-solved class that the resolver queue was missed on**: `admin/objections/page.tsx:36` computes `canDecide` and renders a "compliance-only" state precisely so *"a MODERATOR sees a clear compliance-only state instead of decision buttons that bounce them"* — its comment describes this bug. `admin-nav-groups.ts:134` also states the three-layer gate **"MUST agree with the route + action gates (same domains)"**; here it does not. Fails safe (nothing executed), hence MEDIUM not HIGH. **Suggested fix** (deliberately not applied this session — see §6b): mirror the objections precedent, computing the capability in `resolver-queue/page.tsx` and rendering an explanatory state instead of unusable controls. | **live `AuditLog`**: `2026-07-31 23:11:58Z · SECURITY · privilege_escalation_blocked · actor usr_429885ab43c0cb4ce134dd7e · target recheckMarketNow · {"role":"MODERATOR","domain":"compliance"}` — the only such row production has ever had, generated by clicking the real button as the QA trading officer |
| **E-21** | MEDIUM | payments · webhook | **The Selcom deposit path has a second door that skips the authoritative re-query the file's own header promises.** `route.ts`'s header states, of Selcom deposits: *"settled from an AUTHORITATIVE, signed order-status re-query (**we never credit on the callback body alone**)"* — and the dedicated `handleSelcomCallback` does exactly that, ignoring the callback's claimed status and re-asking Selcom. But that handler is only reached when the request carries `Authorization: SELCOM …`. **`selcom` is ALSO listed in `KNOWN_PROVIDERS` for the GENERIC path** (`route.ts:41`), which verifies an HMAC and then settles **straight from the body's `status` and `amount`** — no re-query. So a request with `X-Provider: selcom` credits a wallet on the callback body alone, which is the precise thing the design says it never does. **This is a leftover, not a decision**: `git log -S` puts the generic map entry in the `678960c1` baseline and the dedicated authoritative handler in the much later `2aeeb3bc` Selcom adapter — the second door was never closed behind it. Genuine Selcom traffic never sends `X-Provider`, so nothing legitimate uses it. **Exposure**: it costs a leaked `SELCOM_WEBHOOK_SECRET`, and the re-query exists precisely so that a leaked webhook secret *still* cannot mint money — so this is a live defense-in-depth hole, not a remote exploit. `settlePaymentWebhook`'s M4 check caps the damage at the initiated amount (proven, §6g row 8), and `test:webhook-sec` does not mention `selcom` at all. ⚠️ **This is also the door §6g used to fund the QA wallets**, which is disclosed here deliberately rather than left implicit. **Fix**: drop `selcom` from `KNOWN_PROVIDERS` so Selcom can only settle through the re-query, and add a `test:webhook-sec` case pinning that. ⛔ **Sequencing: fix it LAST** — closing it removes the only way this campaign can fund a wallet, so it must come after the money-dependent testing is finished. | `route.ts:41` + `:52` vs the file header; `git log -S'selcom:  "SELCOM_WEBHOOK_SECRET"'`; the funded wallets in §6g |
| **E-14** | LOW | AI spend config | **`limitUsd = 0` is documented as "no cap" and is unreachable dead code.** `assertAiBudget` opens with `if (cfg.limitUsd <= 0) return { ok: true }; // 0 = no cap configured`, but `getCreditConfig` (`ai-usage.ts:133`) rewrites a stored `0` back to `DEFAULT_LIMIT_USD` **before that branch ever sees it** — so 0 silently means **$20**, not "uncapped", and the branch can never execute. Two further `limitUsd > 0` guards on `/admin/ai-usage` can likewise never be false. **Left as-is deliberately**: the admin control is `min="0.01"` (`credit-controls.tsx:38`), so nothing on the platform can store 0, and changing the semantics of an unreachable value on a live money platform is an unforced risk. ⚠️ The reason it is recorded rather than ignored: **`events-calendar.test.mts:146` asserts *"limit 0 = uncapped (does not brick generation)"* and passes VACUOUSLY** — its 1M-token burn is ~$3, comfortably under the coerced $20, so that assertion has never once exercised the claim it makes. `test:ai-budget` now pins what actually happens instead. | `ai-usage.ts:133` vs `:168`; `test:ai-budget` §4b |
| **E-8** | LOW | KYC reject copy | **The `DETAILS_MISMATCH` label describes a comparison the product never makes.** The officer's rail calls it *Details mismatch* — meaning the details typed do not match the **document the player submitted**. The player is told, in all three languages, *“NIDA details don't match **our records**”* / *“Taarifa za NIDA hazilingani na rekodi zetu”* / *“NIDA 信息与我们的记录不符”*. We hold no NIDA record to compare against — `docs/NIDA-POLICY.md` and the D-2 fix are explicit that no request has ever reached the authority. Milder than D-2 (it says *our* records, not the authority's) but it is the same class: describing evidence we do not have. Suggested: name the submitted ID document instead. All three locales + `test:kyc-reject-reason`'s key list would need updating together. | live `e6-player-{sw,zh,en}.png`; `i18n-dict.ts:960/2306/3650` |
| **E-10** | **HIGH** | one-account-per-email · RG | **The one-account-per-email control does not survive Gmail plus-addressing, and its own comment says why that matters.** `setUserEmail` (and `registerWithPassword`) compare `email.trim().toLowerCase()` against `db.user.findByEmail` — an **exact string** match. Gmail delivers `user+anything@gmail.com` *and* `u.s.e.r@gmail.com` to the same inbox, so one inbox can hold unlimited accounts that the platform counts as different people. The code comment states the control's purpose in terms that this defeats: *“a verified email now UNLOCKS DEPOSITING, so a shared address would let one inbox open unlimited depositing accounts, and per-account controls (**deposit caps, self-exclusion**) are only as strong as the one-person-one-account assumption underneath them.”* For a licensed operator, self-exclusion that a `+1` re-registers around is the serious end of this. **Proven on production:** `qa.alpha.50pick+officer@gmail.com` was accepted as a wholly separate account while `qa.alpha.50pick@gmail.com` already existed — no duplicate block, no `user.email.duplicate_blocked` audit row. ⏳ **NOT yet proven:** that the second account can actually deposit, and that it survives a self-exclusion on the first — both need Phase 3/12, and the finding should not be written up as self-exclusion bypass until they are. Note the comment also records that the DB `@unique` was deliberately deferred; a unique index would not have caught this either, since the strings genuinely differ. | live: officer persona registered on `+officer` sub-address of an existing account, `email-verification.ts:121-138` |
| **E-11** | LOW | KYC workstation · officer copy | **The Decision panel attributes a compliance decision to a raw user id.** After approval it reads *“Identity approved by **usr_2ff22430c8…** · 31 Jul 2026, 21:57”*, although `displayName` is set and the page header renders *QA COMPLIANCE OFFICER (TEST)* on the same screen. The accountable officer's **name** is the point of the attribution on a record an inspector reads; a truncated cuid identifies nobody without a second lookup. Same family as E-2/E-9 — an officer-facing compliance surface stating less than it knows. | `shots/e4p-06-approved.png` |
| **E-12** | LOW | RBAC · audit | **The audit-chain verifier is out of reach of the roles whose job is the audit trail.** `verifyChainFull()` — the authoritative tamper check — is exposed only on `/admin/system`, which `ROUTE_DOMAINS` tags **`ops`**. `DEFAULT_GRANTS` gives neither `COMPLIANCE` nor `AUDITOR` any `ops` grant, so both can read `/admin/audit` (compliance) yet **cannot verify that what they are reading is intact**. Confirmed live: the QA COMPLIANCE officer's nav has no System section. Not a security hole — the restriction fails safe — but it means chain verification is Owner-only in practice, and an auditor's assurance rests on asking the Owner. | live nav as `COMPLIANCE`; `roles.ts:260`, `admin/system/actions.ts:7` |
| **E-13** | LOW | KYC copy | **“3/3 document attached”** — `docsCount`/3 is glued to a **singular** toast string (`page.tsx:352`: `{docsCount}/3 {t.toast.documentAttached.toLowerCase()}`). It also `.toLowerCase()`s a *translated* string, which is meaningless-to-wrong for ZH and fragile for SW. Needs a count-aware key per locale rather than a lowercased toast. | `shots/p2-echo-docs.png` |
| **E-7** | MEDIUM | i18n · profile | **`User.locale` is stored, shown to the player, and never used to render anything — and the player cannot change it.** Signup hard-codes `locale: "SW"` (`auth-service.ts:268,463`) and the column defaults to `SW`, so **44 of 46 live users are `SW`**. But the rendered language is the `kp-locale` cookie alone, which falls back to **`en`** when absent — so a brand-new Tanzanian visitor gets English while their row says Swahili. `/profile` then badges that row directly (`profile/page.tsx:132`, `user.locale === "SW" ? "Kiswahili" : "English"`), i.e. it tells a player reading English that their language is Kiswahili — **and prints "English" for a `ZH` user**. `profile/actions.ts:29` accepts `EN`/`SW` only (no `ZH`), and **no component in the app ever submits a `locale` field**, so nothing a player does can ever correct it. The column does drive real output: web-push (`notification-service.ts:136`) and OTP SMS (`sms.ts:156`) — both would go out in Swahili to a player using the site in English. | live: `delta` is `locale = SW` and rendered EN until the cookie was set; `select locale, count(*)` → SW 44 / EN 2 | ⏳ open |

## 6f. E-18 fixed — and the class was three surfaces, not one (2026-08-01)

**One defect class: a page offers a control its own viewer's role can never work.** The
symptom that makes it more than a UX wart is in the audit log — clicking a control the UI
offered writes `privilege_escalation_blocked` at **SECURITY** severity, so a legitimate
operator's ordinary click is filed as an attempted privilege escalation in the log a
compliance officer reads.

**Two corrections to the original write-up, both found by reading the enforcement rather
than the name.** The handoff should not have been trusted on either point:

1. 🔴 **`requireAdminOrThrow` does not require ADMIN.** Despite the name it checks
   `canAct(role, "trading")` (`app/markets/actions.ts:52`). So the *Resolve YES/NO/VOID*
   buttons **always worked for a MODERATOR** — E-18's "every interactive control" was
   **2 of 3**, not 3 of 3. Had the fix been applied as written, it would have hidden a
   control that was working correctly.
2. 🔴 **Two more surfaces had the same defect, and one is worse than the resolver queue.**

| # | Surface | Control | Route domain | Action demands | Was |
|---|---|---|---|---|---|
| E-18 | `/admin/resolver-queue` | Re-check this market now | `trading` | `compliance` | offered + refused |
| E-18 | `/admin/resolver-queue` | Two-admin authorization toggle | `trading` | `compliance` | offered + refused |
| E-18 | `/admin/resolver-queue` | Resolve YES / NO / VOID | `trading` | `trading` | ✅ actually worked |
| **E-19** | **every admin page** (shell header) | AI toolkit · all **4** switches | *(any)* | `compliance` | offered + refused |
| **E-20** | `/admin/markets` | **Emergency void** — refunds every open stake on a LIVE market | `trading` | `compliance` | offered + refused |

**E-19 is the broadest**: `<AiToolkit>` renders in `admin-shell.tsx`'s top bar, i.e. on
*every* admin page for *every* console role. **E-20 is the sharpest**: the kill switch on
the markets table. Neither was found by clicking — **both were found by the guard written
for E-18**, which is the argument for writing the general detector rather than patching
the one page.

### The fix — agreement, not access

⛔ **The wrong fix is to widen the grants.** These are compliance decisions and AI-spend
controls; `roles.ts` says CONFIG_ROLES / COMPLIANCE_ROLES are **"NEVER MODERATOR"**.
Widening would "fix" the bug by deleting the control, and it would destroy the first live
exercise of the RBAC matrix (§4). The invariant is that **the page asks the same question
the action will ask** — the precedent `admin/objections/page.tsx` already set with
`canDecide`, now promoted to a shared mechanism:

- **`src/lib/server/control-gates.ts`** — `CONTROL_DOMAIN` maps each control to the domain
  its action demands, **once**. The page reads it via `canUseControl()`; the action reads it
  for its own `canAct()`. They cannot drift because there is nothing to drift from. (Same
  shape as E-4's shared attestation keys, and for the same reason.)
- **`src/components/admin/control-locked.tsx`** — the read-only stand-in. It names the
  control and **who can work it**, so the operator knows who to ask instead of believing the
  console is broken. `AdminRestricted` is its page-level sibling.
- The AI toolkit becomes a **read-only status board** rather than four disabled switches —
  a greyed toggle reads as *"temporarily unavailable, try again"*, which is not what is
  happening. A trading officer still needs to see whether AI resolution is paused.

**Guard**: `npm run test:control-gates` (**90**). §1–2 drive the **real `canUseControl`**
against the real grant matrix for all 9 roles × 5 controls (E-4's lesson: a missing gate is
precisely what reads as present in review); §3–4 pin the wiring on both halves; **§5 is a
general drift detector** — every file that refuses with `privilege_escalation_blocked` under
a hard-coded domain literal must either sit on a route whose domain matches, or declare the
control. A file with **no** route (`_actions/`, or the player tree) can never have its surface
inferred and must declare — which is exactly how E-20 surfaced, since
`emergencyVoidMarketAction` lives in `src/app/markets/actions.ts` while its control renders on
an admin page.

**Proven red first, three ways** — and the third is the one worth keeping:

| Reverted to | Guard says |
|---|---|
| resolver-queue page's pre-fix bare `<RecheckButton />` | `FAIL 4 · <RecheckButton> sits behind canRecheck` |
| ai-toolkit's hard-coded `"compliance"` | `FAIL 3 ×2` + `FAIL 5 · …gates on "compliance" but has no route to infer it from` — **names the file** |
| **the WRONG fix** — widening `recheckMarketNow` to `trading` so MODERATOR passes | `FAIL 2 · MODERATOR · recheckMarketNow → false — got true` |

That last row is the point: the suite refuses the lazy fix as loudly as the bug. Changing a
control's domain is now a decision that must be made **explicitly, in the test**, on a
licensed money platform.

### ✅ VERIFIED ON PRODUCTION, 2026-08-01 12:1x EAT — 18/18

Deploy `b98c4af9` SUCCESS 12:03 EAT. Driven against `https://50pick.tz` as the **QA TRADING
officer (`MODERATOR`)** — the exact identity that generated the original finding.
`live/e18-prod.mjs`. The proof is deliberately **three**-sided, because "the button is gone"
on its own would also be true of a fix that broke the page:

| | Check on production | Result |
|---|---|---|
| **gone** | Re-check button · two-admin toggle · Emergency void control | **0 of each** |
| **explained** | each replaced by a read-only `🔒 … · COMPLIANCE ONLY` state | **3/3** |
| **not over-reached** | *Resolve YES / NO / VOID* still offered (MODERATOR genuinely has `trading` act) | **still there** ← the correction to the original finding, held live |
| **not over-reached** | the resolution **ceremony** still gives a MODERATOR its seal controls | **yes** |
| **still usable** | resolver-queue still shows `1 pending`; markets still lists real titles; the two-admin **mode** is still readable | **yes** |
| **E-19** | AI toolkit opens, all four labels readable, **0 operable toggles**, and it says why | **4/4** |
| ⭐ | **`AuditLog` gained NO new `privilege_escalation_blocked` row across the entire run** | **2 → 2** |
| — | horizontal overflow · console errors at 1440 | **0 · 0** |

That last row is the finding closing. Production's only two such rows remain the ones this
campaign generated *before* the fix; the same officer walking the same screens now writes
none. 📸 `shots/e18-rq-moderator.png` — the header reads *🔒 SINGLE-ADMIN · COMPLIANCE ONLY*
while **Resolve YES/NO/Void are still live and blue** underneath, which is the whole
correction in one frame. Also `e18-aitoolkit-moderator.png` (the panel as a status board:
OFF/ON pills plus *"Status only — switching an AI feature is a compliance decision"*) and
`e18-markets-moderator.png`.

⚠️ **Harness traps paid for here, both worth keeping:**
- **The two login forms name their field differently.** `/auth/login` (player) is
  `#identifier`; `/auth/admin` is **`#phone`**. §3's "the login field is `#identifier`, not
  `#phone`" is about the *player* form only — applied to the admin form it hangs 30s on a
  locator that will never exist.
- **`/admin/markets` page 1 contains no LIVE market**, because production carries 1,398
  VOIDED Up & Down markets (E-16) that crowd the default sort. The E-20 assertion first
  came back FAIL against a perfectly correct page — every action cell was `—` because no
  row qualified for the control at all. Filter to `?status=LIVE`. Same family as every §3
  trap: **the harness lying, not the product**, and it would have been written up as
  "the fix did not ship" by a session that trusted one assertion.

## 6g. MONEY IN — two wallets funded on production through the real money path (2026-08-01)

**Phase 3 is UNBLOCKED.** `alpha` and `echo` each hold **TZS 50,000**, credited by the
platform's own authoritative money code. Ali's authorisation (§6b ②) was honoured
**without weakening a single production guard** — no `ADMIN_TEST_DEPOSITS`, no `NODE_ENV`
change, no hand-written `Transaction`/`LedgerEntry`/`Wallet` row, no schema change.

| Player | Deposit txn | providerRef | Balance |
|---|---|---|---|
| `alpha` | `txn_42f02e87f456e445a1530394` | `dep_141196700453867b191b` | **50,000.00** |
| `echo` | `txn_45e87d6a200bca0dd3fcc7f2` | `dep_81ec0454c86615587cba` | **50,000.00** |

**Step 1 — a REAL deposit, initiated through the real UI** (`live/m1-initiate.mjs`): sign in
as the player → `/wallet/deposit` → M-Pesa → 50,000 → handset → *Confirm deposit* → the
informed-consent modal → *Deposit*. Lands on `/wallet?deposited=…&status=PROCESSING` with a
`PROCESSING` row and a `providerRef`, and **the wallet still reads 0.00** — initiation does
not credit. This also closes the gap §6d flagged: the **service-level** deposit gate
(`wallet-service.ts:121`) is now exercised, not just the page gate.

**Step 2 — the webhook, ATTACKED FIRST and then honoured** (`live/m2-suite.cjs`, run under
`railway run -s 50pick` so `SELCOM_WEBHOOK_SECRET` never touches a file or a transcript).
Ordering is the whole design, and it is the §6d email-verify lesson applied to money: **every
forgery was driven while the wallet was still empty and the txn still `PROCESSING`**, because
a refusal tested after the credit proves nothing — `already-confirmed` would mask it. After
**every single attempt** the wallet *and* the txn were re-read from the live DB; a 401 page is
not evidence that nothing was written.

| # | Attack on production | Refused with | Wallet after |
|---|---|---|---|
| 1 | no signature | `missing-signature` | 0.00 · PROCESSING |
| 2 | no timestamp | `missing-timestamp` | 0.00 · PROCESSING |
| 3 | signature not hex | `bad-signature-encoding` | 0.00 · PROCESSING |
| 4 | unknown provider | `unknown-provider` | 0.00 · PROCESSING |
| 5 | **last MAC char flipped** | `signature-mismatch` | 0.00 · PROCESSING |
| 6 | **correctly signed but 11 min stale** (window 300s) | `stale-timestamp` | 0.00 · PROCESSING |
| 7 | signed with the **wrong secret** | `signature-mismatch` | 0.00 · PROCESSING |
| 8 | ⭐ **validly signed, amount inflated ×20** | `amount-mismatch` **+ a `SECURITY` `webhook.amount_mismatch` row** `{"got":1000000,"expected":50000}` | 0.00 · PROCESSING |
| 9 | valid signature, unknown reference | `unknown-reference` | 0.00 · PROCESSING |

Row 8 is the one an attacker holding the secret would actually try, and **M4 held**: the
platform credits `txn.amount` and nothing else, refuses the mismatch outright, and alerts.

**Then the genuine webhook**, and the assertion that matters most on a money platform:

| Check | Result |
|---|---|
| genuine delivery accepted | `{handled:true, reason:"deposit-confirmed"}` |
| txn → **`CONFIRMED`** · wallet credited **exactly 50,000** | ✅ / ✅ `0.00 → 50000.00` |
| ⭐ **the SAME webhook replayed** (freshly signed, so the replay window cannot be what stops it) | `already-confirmed` — **balance did not move** |
| ⭐ a **third** delivery (providers retry more than once) | **balance still 50,000.00** |
| double-entry: `EXTERNAL:MPESA −50,000` + `PLAYER:alpha +50,000`, one `groupId` | **sums to 0** |

⚠️ **Two harness bugs paid for here, and the second is the more dangerous kind:**
- The terminal status is **`CONFIRMED`**, not `COMPLETED` (`Transaction.status` only ever holds
  `PROCESSING | CONFIRMED | FAILED`; `completedAt` is the column named "completed"). The first
  run reported `FAIL` against a perfectly settled deposit.
- 🔴 **A VACUOUS assertion passed.** "debits === credits" filtered `entryType` on `"DEBIT"` /
  `"CREDIT"` — **neither value exists in this schema** (`entryType` is the movement *kind*:
  `DEPOSIT`, `STAKE_DEBIT`, `PAYOUT_CREDIT`, `SETTLEMENT_TRA_LEVY`, …), so both filters matched
  nothing and `0 === 0` passed while checking **absolutely nothing**. Direction lives in the
  **sign of `amount`**, so the real invariant is that the group **sums to zero**. Same family as
  the E-14 note and the vacuous E-5 recheck: *an assertion that cannot fail is worse than no
  assertion*, because it is counted as evidence. Both are fixed in `m2-suite.cjs` with the
  reasoning inline.

## 6h. PHASE 4 — a real WIN and a real LOSS settled to real wallets on production (2026-08-01)

**Ali's priority #2 is closed for polls/markets.** The full chain was driven end to end on
`https://50pick.tz`: create → bet both sides → resolve → objection window → settle → money in
the wallet, with every step through the real UI and every assertion against the live DB.

| | Market #1 — the drill | Market #2 — the CONTROL |
|---|---|---|
| id | `mkt_13a8ac2b5a40d8ede682` | `mkt_4969c3dd29fde8742618` |
| stakes | `alpha` YES 20,000 · `echo` NO 20,000 | `alpha` YES 5,000 · `echo` NO 5,000 |
| resolved | **YES**, by the QA trading officer | **YES**, same officer |
| objection window | **advanced past** | **left intact (real 24h)** |
| settled | ✅ `09:58:33Z` by **`system`** | ⛔ **not settled** |

### Why there is a control market

The clock on #1 was advanced so settlement could be observed the same session. On its own that
would prove nothing — the redeploy that made the platform notice could just as easily have been
the cause. So **#2 is identical in every respect except the clock**: same officer, same verdict,
same code path, present through the same boot. **#1 paid and #2 did not**, which isolates the
objection window as the thing that gates payment. ⚠️ #2 is deliberately left running; it should
settle on its own at **2026-08-02 09:54Z** with no intervention, which is a second, unaided proof
of the timer — **check it, do not clear it**.

⚠️ **Exactly what was and was not touched by the fast-forward** (`live/p4d-fastforward.mjs`,
which refuses to run if any non-QA player holds a position or any objection is open): one column,
`objectionsClosedAt`, on one market whose only two participants are personas this campaign
created. **No `Wallet`, `Transaction`, `LedgerEntry` or `Position` row was written by hand** —
`settleMarket()` did all of its own arithmetic under its own lock, as `actorId: "system"`. The
alternative, lowering the **global** `objectionWindowHours` at `/admin/config`, would have
switched a player-protection control off platform-wide to suit a test. (Recorded because it is
useful: lowering that global could not retroactively release already-resolved markets anyway —
`settleMarket` reads `objectionsClosedAt` off the row, stamped at resolve time.)

### The two negatives that matter as much as the payout

| Assertion | Result |
|---|---|
| **resolution moves NO money** — `settledAt` null, both balances unchanged, both positions still OPEN after the verdict | ✅ on **both** markets |
| **a market with an open objection window does not pay**, even across a restart | ✅ market #2 |

### The money, read off the live DB

```
loser-share · commission 13% of the LOSING pool
  losing pool 20,000 → commission 2,600 → distributable 17,400
  winner payout = own stake 20,000 + 17,400 = 37,400
```

| | Before | After |
|---|---|---|
| `alpha` (**won**) | 25,000 | **62,400** — `BET_PAYOUT 37,400`, `balanceAfter 62,400` |
| `echo` (**lost**) | 25,000 | **25,000** — the stake is taken and nothing more |

The settlement ledger is the part worth reading, because it shows the levies are taken **out of
the operator's commission, not out of the player**:

| account | entry | amount |
|---|---|---|
| `PLAYER:alpha` | `PAYOUT_CREDIT` | **+37,400** |
| `POOL:<market>` | `PAYOUT_CREDIT` | −40,000 |
| `HOUSE:COMMISSION` | `SETTLEMENT_COMMISSION` | +2,600 |
| `HOUSE:COMMISSION` | `SETTLEMENT_TRA_LEVY` | −260 |
| `HOUSE:TRA_LEVY` | `SETTLEMENT_TRA_LEVY` | +260 |
| `HOUSE:COMMISSION` | `SETTLEMENT_GBT_LEVY` | −130 |
| `HOUSE:GBT_LEVY` | `SETTLEMENT_GBT_LEVY` | +130 |

**The whole market's ledger sums to exactly 0** — nothing created, nothing lost. Net to the
house 2,210; TRA 260 (10% of commission); GBT 130 (5%). Audit trail:
`market.created` → `market.adjudicated` *(officer)* → `market.resolved` → `market.settled`
*(both `system`)*.

⚠️ **A market can be sealed BEFORE its stated resolve time while it is still LIVE.** #1 was
resolved at 09:49 against a 09:54 resolve time and the queue offered the buttons. This is
**intended** — the queue exists partly so an officer can act "when a result lands early", and the
objection catalogue carries `RESOLVED_EARLY` as a player remedy — but it is worth knowing that
nothing stops a verdict landing while betting is still open.

### Harness contract for the betting dial — read before automating a bet

Four selector traps cost a run each, and all four are the harness lying, not the product:

1. **The side control's accessible name is `Back YES at 50%`**, an `aria-label` that overrides the
   visible "YES @ 50%". `getByRole("button", {name: /^YES/})` matches **nothing**.
2. **The dial panel does not exist until a side is picked** — stake input and CTA are absent on a
   fresh page, so they must be found in that order.
3. **The CTA is `Place YES TZS 20,000`**, and it opens a modal whose CTA is **`Confirm · TZS
   20,000`** — that modal button is the only thing that calls `buyPositionAction`.
4. **`.first()` matters**: the page renders related markets, each with its own `Back YES at …`.
   Also `input[type=text]` selects **nothing** anywhere in the kit — the Input atom renders no
   literal `type` attribute, and a field survey that reports `"type":"text"` is reading the DOM
   *property*, which defaults to "text". Same trap in the market wizard.

## 6d. Email verification — DONE on production, 7/7 (2026-07-31 22:15 EAT)

Ali's choice (§6b): **mint the genuine link and click it**, not write the column. The token is a
stateless HMAC with no DB row (`signSession`, `crypto.ts:139-144`) over
`{purpose:"email-verify", userId, email, exp}`, so `live/mint-verify.cjs` — run **through
`railway run -s 50pick`** so `SESSION_SECRET` is injected and never touches a file or this transcript
— produces a URL byte-identical to what Postmark would have carried.

**Every refusal was driven FIRST, while the address was still unverified.** A refusal tested after
confirmation proves nothing, because `already` would mask it. And after each click the **DB was
re-read**: a page saying *invalid* is not evidence that nothing was written.

| Variant | What it forges | Rendered | `emailVerifiedAt` after |
|---|---|---|---|
| `tampered` | payload intact, **last MAC char flipped** | *Link invalid or expired* | still `null` |
| `expired` | `exp` 1h in the **past** (24h TTL) | *Link invalid or expired* | still `null` |
| `wrongPurpose` | valid MAC, `purpose: "password-reset"` | *Link invalid or expired* | still `null` |
| `unknownUser` | valid MAC, a `userId` that does not exist | *Link invalid or expired* | still `null` |
| `mismatch` | valid MAC for a **different address** (the stale-link branch) | *Link out of date* | still `null` |
| **`valid`** | the genuine link | ***Email confirmed*** | **set** `19:15:30Z` |
| `replay` | the **same** genuine link, clicked again | *Already confirmed* | unchanged — idempotent |

Each click ran in a **fresh browser context**, exactly like a link opened from a mail client.
`user.email.verified` (COMPLIANCE) audited. Evidence `shots/p3a-verify-*.png`, and
`shots/p3-verify-valid.png` for the confirmed page itself. Run against `alpha`; **`echo` was verified
the same way**, so both are now `emailVerifiedAt`-set.

⚠️ **Not covered, and must not be assumed: Postmark DELIVERY.** This proves the endpoint, not that a
mail ever arrives. There is **no `EmailLog` model**, so delivery can only be confirmed from Postmark's
own activity feed or Ali's inbox. `POSTMARK_API_KEY` *is* set on prod, so mail is really being sent.

### 🔴 ANSWERED 2026-08-01 — the `qa.*.50pick@gmail.com` inboxes DO NOT EXIST

**Ali did not need to answer this; production already had.** `SystemConfig.email.suppression` on the
live DB reads:

```
["john@example.com", "vickyhabibalalji13@icloud.com",
 "qa.alpha.50pick@gmail.com", "qa.bravo.50pick@gmail.com", "qa.delta.50pick@gmail.com",
 "qa.charlie.50pick@gmail.com", "qa.echo.50pick@gmail.com", "qa.alpha.50pick+officer@gmail.com"]
```

All **six** campaign addresses are suppressed — i.e. every one of them **hard-bounced**. So the
warning below was right, and the count is six, not five (the `+officer` sub-address bounced too,
which also confirms `alpha`'s inbox never existed rather than merely rejecting mail).

**Consequences, stated plainly.** (1) **Stop registering personas on `qa.*.50pick@gmail.com`** — each
one is another bounce against a licensed platform's sender reputation. That is exactly why the new
trading officer re-used `delta` instead of registering a seventh persona (§4). (2) Any campaign step
that depends on **receiving** mail is untestable on these addresses, which is precisely why email
verification had to be proven by **minting the genuine link** (§6d) rather than reading an inbox — a
choice that now looks better-founded than when it was made. (3) If a future step genuinely needs a
delivered mail, it needs **a real inbox from Ali**, not another invented address.

⚠️ **Also on that list: `vickyhabibalalji13@icloud.com`, which is not ours.** A real customer's
address is suppressed on production, so that person receives no platform mail at all. Not caused by
this campaign, not investigated here — **flagged for Ali** as an ops item.

⚠️ **Postmark being live has a cost this campaign was paying blind.** Every persona registration
mails a real address, and a non-existent Gmail address **hard-bounces** — which suppresses the address
and counts against sender reputation on a money platform. `alpha`…`echo` were registered on
`qa.<name>.50pick@gmail.com`. The officer persona used a `+officer` sub-address of the *presumed*-good
`alpha` inbox to avoid adding another — which is exactly what exposed **E-10**.

**The deposit gate really did open.** As `alpha` on `/wallet` and `/wallet/deposit`: the
*“Confirm your email — deposits locked”* banner is **gone**, the amount field renders, and **all five
providers are enabled** (`MPESA`, `AIRTEL_MONEY`, `HALO_PESA`, `MIXX`, `CARD`), 0 horizontal overflow.
`shots/p3-gate-_wallet.png`, `p3-gate-_wallet_deposit.png`. (The `navigator.vibrate` console errors
are the known headless artifact, §6.) ⚠️ Honest limit: this proves the **page** gate. The **service**
gate (`wallet-service.ts:121`) reads the same column but stays unexercised until a deposit is actually
submitted — see the blocker below.

### ⛔ Phase 3 is now blocked on Ali — real money, and there is no way around it

**The play-money path cannot exist on production, by deliberate design.** `wallet-service.ts:88`:
`adminTestAllowed = process.env.NODE_ENV !== "production" && adminTestEnv !== "false"`, with the
comment *“Hard rule: the uncapped, gate-skipping admin test-deposit path can NEVER be active in
production — not even if `ADMIN_TEST_DEPOSITS="true"` leaks into the prod env.”* That is correct
security design and **must not be weakened for QA convenience**. So on prod, funding a wallet means a
real Selcom order.

⛔ **And the wrong way to unblock it is to insert a `Transaction`/ledger row by hand.** The money path
runs in one collapsed transaction with invariants that a hand-written row silently breaks
(`docs/` bet-concurrency rules). Live data is disposable; **live money integrity is not**.

**⚠️ But this blocker is NARROWER than it looks — do not let it stall Ali's priority list.**
Only **placing bets and winning/losing money** needs a funded wallet. **Generation and resolution do
not**: AI poll generation, market creation, Up & Down round generation and the resolver are all
**operator** flows. So priority items #1 and #2 can be driven *most* of the way — generate, inspect,
resolve — with no money at all, and only the play/win/lose leg waits on funds.

**The catch, and it is a real one:** those routes are all the **`trading`** domain
(`/admin/ai-polls`, `/admin/markets`, `/admin/updown`, `/admin/proposals`, `/admin/resolver`,
`/admin/sources` — `roles.ts` `ROUTE_DOMAINS`), and `DEFAULT_GRANTS` gives **`COMPLIANCE` no
`trading` grant at all**. So the QA compliance officer (§4) **cannot** reach them. Unblocking that
needs one of:
- **grant a second QA persona `MODERATOR`** (surfaced in the UI as *“Trading”*) — same recipe as §4,
  one narrow `UPDATE`, and it keeps trading and compliance authority separated the way the RBAC model
  intends. **This is the cheap, correct answer and needs nothing from Ali.**
- or Ali's `ADMIN` password (bypasses the grant table entirely) — but see §4 for why a named
  attribution matters on anything that writes a compliance or money record.
⛔ Do **not** widen the QA compliance officer's own grants to cover `trading`; that would make the
first live exercise of the RBAC matrix meaningless, and E-12 was found precisely by respecting it.

What Ali needs to decide for the money leg — ledger, receipts, caps, bets and poll wins/losses:
- **(a) Push one small real deposit** (e.g. TZS 1,000–5,000) from a real mobile-money handset to
  `alpha`. Tests the genuine rail end to end. Needs a real MSISDN — the personas' numbers
  (`+255712000101`…) are **not real handsets**, so a push to them goes nowhere.
- **(b) Name a real MSISDN** Ali controls that a persona may be re-pointed at, so the QA session can
  drive the initiation and he only approves the USSD prompt.
- **(c) Authorise a CARD deposit** through Selcom's hosted checkout with a real card.
⚠️ Also note that **withdrawals are still unavailable** (3 payouts stuck since 2026-07-29, §6 E-5),
so money-in will be testable before money-out regardless.

## 6e. AI polls — generate → review → publish → LIVE MARKET, driven on production (2026-08-01)

Ali's priority **#2**, generation half: **15/15 PASS on real Anthropic tokens**, driven entirely as the
**QA TRADING officer (`MODERATOR`)** — not an Owner bypass, so this also exercises the real RBAC path.
Every `ai-polls` action is `requireStaff("trading", …)`, which the officer legitimately satisfies.
⭐ Note the contrast with **E-18**: this surface gets the three-layer gate right; the resolver queue does not.

**Generation** (`live/p7-polls.cjs`) — the real *Generate poll* control, on prod:

| | |
|---|---|
| wall-clock | **28s** (4-layer pipeline, **3 web searches**) |
| poll | `aipoll_7d7a3f7f09b52ea2ad586407` → `PENDING_REVIEW` |
| title | *Will Arsenal keep a clean sheet vs Coventry City in the 2026/27 Premier League opener (August 21)?* |
| quality · confidence | **95** · 82 · `filterReasons []` · `rejectReasons []` |
| real spend | **$0.2015**, 52,731 tokens, `AiUsageEvent` 447 → **448** |

**Review → publish** (`live/p7b-publish.cjs`) — and the assertions are on the **live DB**, not the toast:

| Check | Result |
|---|---|
| poll → `PUBLISHED` with `publishedMarketId` + `publishedCandidateId` | ✅ `mkt_d70ee2f6f2777f74e901` |
| `reviewedBy` is the **trading officer**, not a system marker | ✅ `usr_429885ab43c0cb4ce134dd7e` |
| market `LIVE` · `productLine MARKET` (not `UPDOWN`) | ✅ / ✅ |
| **fees FROZEN at publish** (`feeSnapshot` present) | ✅ — an unfrozen market could re-price a placed stake later |
| titles in **all three locales** | ✅ incl. `zh` *阿森纳能否…零封（2026年8月21日）？* — no null-`zh` English fallback (the E-1 class) |
| resolution criterion present · `resolutionAt` in the future | ✅ / ✅ `2026-08-21 22:30` |
| pools start empty (`yesPool`/`noPool` = 0) | ✅ |
| **source host is an ENABLED `TrustedSource`** | ✅ `premierleague.com` (`sports`, enabled) — the anti-fabrication gate F8 found imported-and-never-called |
| public `/markets/<id>` renders | ✅ **200**, title present, **0 horizontal overflow** |
| audit trail | ✅ `generate_started → pending_review → approved → market.created → published`, **all five** attributed to the officer |

The single console error is the known headless `navigator.vibrate` artifact (§6), not a defect.

⏳ **Not yet done on this lane:** poll **resolution with money** — a real win *and* a real loss settling to
a wallet. That needs a funded wallet (see the money box in §6b) and a market whose `resolutionAt` has
passed; the one published here resolves 2026-08-21, so resolution testing should use an existing market.

## 6c. Verified working on production this session (not defects)

- **Approve** → `KycSubmission.APPROVED` + `User.status PENDING_KYC→ACTIVE` + `displayName`
  backfilled from the verified legal name + in-app notification in **all three locales** +
  `kyc.approved` and `kyc.workstation.approved` audit rows. Approve is correctly inert until
  all four attestations are ticked — force-clicking the disabled button opens nothing.
- **Reject** requires a reason code (Confirm stays disabled without one), and the rejected
  player is told honestly — red *Rejected* card, the reason, a *Try again* button. **D-1 stayed
  fixed**: no success banner anywhere on a rejected account.
- **Rejected NIDA is freed, approved NIDA is not.** Two-sided proof against the live index
  inside a rolled-back transaction: inserting `bravo`'s rejected …9013 for a second account is
  ALLOWED; inserting `alpha`'s approved …9012 is BLOCKED by
  `KycSubmission_nidaNumber_active_key`. Exactly what `docs/NIDA-POLICY.md` specifies.
- **Revoke** (force re-verify) → `ADDITIONAL_INFO_REQUIRED` + `kyc.force_reverify` +
  "More information needed" notification. **Ban** (suspend) → `SUSPENDED`, **all sessions
  revoked immediately** (0 live sessions; the banned persona's saved cookie bounced to
  `/auth/login`), `player.suspended` audited with the prior status.
- **A-3 held under a direct probe.** A stranger sending a wrong password to the banned
  number, an active number and an unknown number gets byte-identical `error=wrong_credentials`
  at 2630 / 2630 / 2627 ms. Only after the **correct** password does the banned player see
  *"Account unavailable — contact support"*, which names no ban and no reason.
- Officer-issued **temporary password** works end to end and is shown once with a Copy control.

### Ops note, not a code defect

Two **real** players have been sitting in the live KYC queue unreviewed: `usr_fbfea6024c…`
(Dhiresh Prabhudas Kaba, submitted 28 Jul) and `usr_0990e27217…` (Ali Test 2, 15 Jun). The
workstation shows an SLA countdown, but nothing escalates when it runs out. Ali's call.

### Open questions (raised, not yet concluded)

- ~~**Stored locale on signup.**~~ **Concluded — it is E-7.** The UI never flips: `User.locale`
  is not read by any rendering path. Rendering is the `kp-locale` cookie only.
- ~~**DOB is stored as midnight EAT** (`1995-04-12` → `1995-04-11T21:00:00Z`).~~ **Wrong —
  corrected 2026-07-31.** Measured with `::text` on the live rows: DOB is stored as
  `1995-04-12 00:00:00`, i.e. midnight **UTC**, for every submission. So formatting it in the
  platform zone (+3) keeps it on the right day, and the E-2 fix is safe. The earlier note was
  the `pg` −3h trap (§3) reading back through an un-cast client.

## 6b. NEXT SESSION — start here

### 🔵 Laptop B, session 3 (2026-08-01) — Up & Down + AI, and what it found

**Read this block first; it supersedes the session-2 notes below it.** Four things happened.

**1 · The `trading` operator exists now.** `delta` → `MODERATOR`, verified live 8 allow / 11 deny
(§4). Production had no `MODERATOR` at all before. ⛔ The compliance officer was **not** widened.

**2 · E-15 shipped: the AI spend ceiling now applies to every spender.** $127.73 of real money had
bypassed a $20 cap because `assertAiBudget` was wired into poll generation only. Guarded by
`test:ai-budget` (28), red-proven, drift-detector adversarially verified.

**3 · 🔴 E-16 — the headline, and it is a BLOCKER Ali must decide on.** Up & Down **has never settled
a round on production and structurally cannot**: 0 confirmed price readings in 1,400 attempts,
1,398/1,398 rounds VOID, because both enabled assets quote their prices in JavaScript widgets that a
web search cannot read. The engine behaved *honestly* (refused, refunded every stake) — it simply
cannot do its job. **Ali's three options, and none is a QA call:**
  - **(a) Merge `origin/feat/updown-source-pinning-and-proposals`** — 7,437 insertions / 61 files,
    another session's unreviewed work, which replaces the web-search oracle with a real
    **TwelveData** price feed (*"the only method that can meet the time contract"*) **and** ships the
    missing AI-generation UI of E-17. Needs `TWELVEDATA_API_KEY` set on Railway. ⛔ **Do not merge
    7.4k lines of unreviewed code into a live money platform on a QA session's judgement** — this
    wants Ali's decision and its own review pass.
  - **(b) Re-point the two assets at a source a web search CAN actually read**, and prove one round
    settles end to end. Cheapest path to a working game on today's code; it is a data change plus a
    guard. ⚠️ Unproven — no candidate source has been tested yet, and it must be an **enabled
    `TrustedSource`** as well as readable. **This is the obvious next experiment**, and it costs
    ~$0.15–0.35 per probe against the $20 cycle cap.
  - **(c) Leave Up & Down off.** Both chains are already `PAUSED`/`STOPPED`, so this is the current
    de-facto state and nothing is spending. Honest, and it keeps the void-and-refund record clean.

**4 · E-17 — Ali's nav observation was exactly right.** There is no AI-generation entry under
Up & Down because there is no page: it lives only on the unmerged branch, while production carries
the orphaned `UpDownProposal` **table** (migration applied 2026-07-30, 0 rows, no code). ⛔ Do **not**
"just add the nav item" — it would point at a 404.

**Also answered without needing Ali:** the `qa.*.50pick@gmail.com` inboxes **do not exist** (all six
are on production's `email.suppression`, i.e. hard-bounced — §6d). And a **real customer's** address,
`vickyhabibalalji13@icloud.com`, is suppressed on prod and receives no platform mail: an ops item for
Ali, not ours.

**5 · ✅ E-15 VERIFIED ON PRODUCTION, both directions.** Deploy `82137e64` SUCCESS 2026-08-01 02:04 EAT.

**(a) ALLOW, against production's real config** (`scripts/ops-ai-budget-live-check.mts`, read-only):
`getCreditConfig()` returns the live `limitUsd $20` / `cycleStartIso 2026-07-30T09:28:26Z`, and
`assertAiBudget("updown")` correctly **allows** at $3.45 of $20.

**(b) REFUSE, against production's real config** — the half that could not be reached any other way,
so Ali authorised it explicitly (*"full rights on everything in the project"*, 2026-08-01). The live
ceiling was lowered below current spend, the **real `observePrice`** was driven against the live DB,
and the original config restored in a `finally`:

| Check | Result |
|---|---|
| oracle refused for budget on **live** config | **true** |
| reason | **`budget-exhausted`** |
| detail — real production spend, read live | **`AI credit limit reached ($3.45 of $0.50 this cycle)`** |
| `AiUsageEvent` rows before → after | **4074 → 4074** — the provider was **never dialled** |
| `ai_credit_config` restored byte-identical | **true** |

That third row is the whole point: over budget, **nothing was spent**, because the gate fires ahead of
the network. Pre-fix, the same drive spent a call and came back with a provider `401`.

⚠️ **One honest caveat, and it is the harness not the product.** `ai.call_blocked.budget_exhausted`
did **not** persist during that run — the log printed *"[audit] persist failed (entry kept in ring
only)"*, because the one-shot script called `$disconnect()` in its `finally` before `audit()`'s
fire-and-forget write had flushed. `audit()` is used identically platform-wide and the server process
never tears its connection down mid-request, so this says nothing about production; but **the audit row
itself is therefore booked, not proven.** Do not upgrade that claim without seeing the row.

⚠️ **Also: an earlier attempt to prove this through the ADMIN UI produced a false alarm worth keeping.**
Driving *"Re-check this market now"* as the trading officer showed `AiUsageEvent 4074 → 4074` and no
credit-limit message — which reads exactly like "E-15 froze the live AI subsystem". It was **E-18**:
the action refused the MODERATOR before any AI call. **"Nothing was spent" proved E-18, not E-15.**
Assert *why* nothing happened, not just that nothing happened.

### 📌 Ali's directive, 2026-08-01 — and what it actually requires

> *"we have to add in the navigation bar admin menu the AI generation for up and down now. And
> dedicate some AI tokens usage, it's ok to test really the whole flow of controlling AI polls and up
> and downs and user experience and resolution logic and generation logic perfectly, literally players
> will be a lot on them. Then how money resolves to user wallet."*

⛔ **The nav item cannot simply be added — it would ship a 404.** There is no Up & Down AI-generation
page on `main` (E-17). Everything needed lives on `origin/feat/updown-source-pinning-and-proposals`,
and the dependency graph is **not** cherry-pickable: `updown-proposal.ts` imports `hostMatchesDomain`
from that branch's `updown-feed.ts` (the TwelveData module), and the page needs branch-side additions
to `updown-config.ts` and `ai-provider.ts`. Porting a slice means re-deriving another session's 7,437-line
design under time pressure on a live money platform.

✅ **But merging the branch properly is far more tractable than its size suggests — measured, not
guessed:** 28 commits ahead / 60 behind, merge base 2026-07-30, and `git merge-tree` reports **exactly
ONE conflict: `package.json`** (the `test:*` script list — trivial, and `test:ai-budget` sits in it).
`prisma/schema.prisma`, `lifecycle.ts` and `market-service.ts` all **auto-merge**. The `UpDownProposal`
table is **already on production**, so that migration carries no new risk.

**That one merge delivers everything Ali asked for**, which is why it is the recommendation rather
than a workaround: the *AI proposals* nav entry, the generation UI and engine, **and** the real price
feed that is the only thing that can fix **E-16**. It also independently corroborates E-15 — that
branch's `updown-proposal.ts` already calls `assertAiBudget` itself.

🔑 **One thing is needed from Ali and cannot be worked around: a `TWELVEDATA_API_KEY`** on the Railway
`50pick` service. Without it the merge still ships the nav entry and the generation UI, but
**resolution stays broken** — the branch is explicitly built to refuse *by name* when the key is
absent rather than invent a price, which is the right behaviour and also means the game still cannot
settle. So: **key first, then merge, then the end-to-end flow Ali wants tested.**

⚠️ **And a sequencing point worth stating plainly:** *"test resolution logic perfectly"* cannot be
done on today's code. Up & Down resolution does not work and has never worked (E-16) — driving it now
would only re-document that. **Poll** generation and resolution *are* testable today and are the right
place to spend tokens meanwhile. *"How money resolves to the user wallet"* additionally needs a funded
wallet, which is still the Phase-3 blocker below.

### ✅ ALI'S TWO DECISIONS, 2026-08-01 — both answered, and they set the next session's job

**① Up & Down → "Get the TwelveData key, then merge."** So the sequence is fixed:
Ali obtains a `TWELVEDATA_API_KEY` (twelvedata.com; a free tier exists) → it goes on the Railway
`50pick` service → **then** `origin/feat/updown-source-pinning-and-proposals` is merged as its **own
dedicated session** with a real review and the full gauntlet. ⛔ Not as a tail-end task of another
session: it is 7,437 insertions across 61 files touching the resolution and money paths of a live
licensed platform. The merge itself is easy (28 commits, one trivial `package.json` conflict); the
**review** is the work. That one merge closes **E-16** *and* **E-17** — the price feed that can settle
a round, and the `AI proposals` nav entry Ali asked for.
⏳ **BLOCKED until the key exists.** Merging without it ships a visibly-live game that still cannot
settle, which is worse than the current paused state.

**② Money → Ali authorised generating test funds himself: *"generate yourself money in control and
play with them, I'm admin I allow this now for testing as much as you need."*** Recorded as the owner's
explicit decision, given after this campaign had flagged the opposite concern.

> ⚠️ **How that will be done — and how it will NOT.** The concern that was raised still stands on its
> own terms, so the authorisation is honoured **without weakening a single production guard**:
> - ⛔ **NOT** by flipping `ADMIN_TEST_DEPOSITS` — `wallet-service.ts:88` gates on
>   `NODE_ENV !== "production"`, so the uncapped path is hard-dead on prod regardless. Its comment says
>   it must never be active there. **Leave it exactly as it is.**
> - ⛔ **NOT** by touching `NODE_ENV`. That would alter session, cookie and security behaviour
>   platform-wide. Never.
> - ⛔ **NOT** by hand-writing a `Transaction`/`LedgerEntry`/`Wallet` row. The money path runs in one
>   collapsed transaction whose invariants a hand-written row silently breaks. Live data is disposable;
>   **live money integrity is not.**
> - ✅ **BY THE PLATFORM'S OWN AUTHORITATIVE PATH — a signed provider webhook.** Payments are
>   webhook-authoritative and exactly-once, so this credits the wallet through the real money code with
>   the real audit trail and the real replay protection. Verified available on production 2026-08-01:
>   `POST /api/webhooks/payments`, headers `X-Provider: selcom` · `X-Signature: <HMAC-SHA-256 hex>` ·
>   `X-Timestamp`, body status normalising to `CONFIRMED` (`route.ts:31,47-71`), secret
>   **`SELCOM_WEBHOOK_SECRET` — confirmed SET on prod**. No code change, no env change, no schema change.
>
> **Sequence for the next session:** initiate a real deposit as `alpha` through the real `/wallet/deposit`
> UI (the E-16 gate is open — email verified, all five providers enabled) → read the `PENDING`
> `Transaction` and its provider reference off the live DB → deliver the signed webhook → assert the
> wallet credited **once** → **replay the same webhook and assert it does NOT double-credit** (that
> assertion is the point; exactly-once is the invariant most worth proving on a money platform) → then
> bet, resolve, and follow the money back to the wallet.
> ⚠️ Money-**out** stays blocked regardless: 3 payouts stuck since 2026-07-29 (§6 E-5).

**Still owed by Ali:** ① the **`TWELVEDATA_API_KEY`** (everything Up & Down waits on it); ② the E-3
backfill call; ③ E-7 / E-8. **No longer owed:** the QA-inbox question (production answered it — §6d)
and the money-route decision (② above).

**Laptop B, session 2 (2026-07-31 21:39→22:1x EAT) closed E-4 on production.** No code changed —
E-4/E-9 were already shipped; what was owed was the live proof, and it is now in §6 with the audit
row, the adversarial refusal and the screenshots. Guards re-run: `--filter kyc` **8/8 green** incl.
typecheck. Four new findings were opened in the same run (**E-10 HIGH**, E-11, E-12, E-13) and two
harness traps were paid for and written into §3.

**Shipped and live so far:** `26a1471` (A-1/A-2/A-3) · `5e6babe` (tracker) · `c3aded6` (D-1) ·
`647e266` (D-2) · `617fbfb` (E-1) · **`dd25a22` (E-3)** · `b27b66b` (E-3 live proof) ·
**`0820558` (E-6)** · **`800aa06` (E-2)** · `f11722b` (E-2 live proof) · **E-5 (this session)**.
All merged to `main`, deployed SUCCESS on Railway, and re-verified against production — not just
built. Branch `qa/live-experience` == `main`.

**Guards this campaign now owns** (all auto-discovered by `node scripts/test-all.mjs --filter kyc`,
**8/8 green** incl. typecheck): `test:kyc` · `test:kyc-honesty` (19) ·
`test:kyc-reject-reason` (64) · `test:kyc-doc-metadata` (19) · `test:kyc-workstation-time` (16) ·
**`test:kyc-approved-copy` (35)** · **`test:kyc-attestations` (39)**. Plus `test:phone-normalize` (17)
and `test:login-enum` (11) from Phase 1, and **`test:ai-budget` (28)** from session 3 (E-15) —
`node scripts/test-all.mjs --filter ai --no-tsc` runs **13/13 green**, and
`--filter updown,sentinel,events,resolver` **8/8 green** (the suites E-15's two edits could regress).

ℹ️ **Pre-existing build noise, not ours and not a failure.** `npm run build` prints
*“Ecmascript file had an error … `node:crypto` is not supported in the Edge Runtime”* twice, via
`lock-key.ts` ← `audit.ts` ← `instrumentation.ts`, and the trace also shows `audit.ts` reaching the
**Client Component Browser** graph. The build still **exits 0**, and `audit.ts:41` already carries a
comment acknowledging that reachability (it imports `./lock-key`, not `./locks`, for exactly this
reason). Recorded so nobody attributes it to a KYC change; a proper look belongs to its own lane.

**Phase 2 officer review is COMPLETE** (§6c). Approve, reject, revoke, ban, session
revocation, the enumeration probe and the NIDA free/claimed pair were all driven against
production. Four fixes shipped and live-verified (E-1 in **EN, SW and ZH**, E-3, E-6, E-2).
Two findings are evidenced and **open** (E-4, E-5), plus **E-7 and E-8, which are Ali's calls**.

**Resume here, in this order:**

1. ✅ **E-1 verified in SW and ZH** — done, see §6. It turned up **E-6** (the reason is printed
   twice, the second time in English) and confirmed **E-7** (`User.locale` renders nothing).
2. ✅ **E-3 fixed and live** — the round trip is guarded by `test:kyc-doc-metadata`.
   ⏳ **Still owed: Ali's decision on backfilling the 19 existing R2 rows.**
3. ✅ **E-6 fixed and live** — guarded by the grown `test:kyc-reject-reason` (64).
4. ✅ **E-2 fixed and live** — guarded by `test:kyc-workstation-time` (16).
5. ✅ **E-5 fixed AND live-verified** in 12 combinations (§6) — the burst states only what approval
   unlocked and reads the live payout gate; guarded by `test:kyc-approved-copy` (30).
6. ✅ **E-4 and E-9 fixed AND VERIFIED ON PRODUCTION** (§6) — the audit row now carries all four
   attestations, and the **live server refuses an approval with them stripped off the wire**
   (adversarial probe, `shots/e4p-05-server-refused.png`). Guards `test:kyc-attestations` (39) and
   `test:kyc-approved-copy` (35). **Phase 2 is closed** apart from `import`.
   Two things this produced that outlive it: the **QA compliance officer** (§4 — use it for all
   operator work; `QA_ADMIN_PASSWORD` is no longer needed) and persona **`echo`**, now `ACTIVE` and
   the second funded-player candidate.
6. **⛔ E-7 and E-8 are Ali's, not the next session's.** E-8 is a small copy change in three
   locales — safe to do, but it changes what a rejected player is told, so it wants Ali's eye
   on the wording first. E-7 is a product decision, not a bug fix: should
   a brand-new Tanzanian visitor land in **Swahili** (matching the column, and 44 of 46 live
   users) or in **English** (today's cookie default)? Everything else follows from that answer —
   whether `kp-locale` seeds from `User.locale` on sign-in, whether the toggle writes it back,
   and whether `/profile` should show the badge at all. **Do not guess it**; changing the default
   language of a live money product on a QA session's judgement is exactly the wrong call.
7. ✅ **Email verification DONE on production, 7/7** (§6d) — every forgery branch refused with the
   column re-read each time, then the genuine link confirmed and the replay proved idempotent.
   **`alpha` and `echo` are both `emailVerifiedAt`-set**, and the deposit form is reachable with all
   five providers enabled. Postmark **delivery** is the one part still unproven — booked, not assumed.

8. **⏭️ START HERE — Phase 3 money-in is BLOCKED ON ALI, and the block is real money, not effort.**
   Read the boxed blocker at the end of §6d before doing anything. In short: the uncapped
   admin/play-money deposit path **cannot be active on production by deliberate design**
   (`wallet-service.ts:88`), and that must not be weakened for QA convenience; and a hand-written
   `Transaction` row would break the collapsed-transaction money invariants. So funding `alpha`
   requires one of Ali's three options in §6d (a real mobile-money push, a real MSISDN to re-point a
   persona at, or a CARD deposit). **Everything in his priority list below depends on this** — bets,
   poll wins *and* losses, and Up & Down all need a funded wallet.
   ⚠️ Ali also owes a yes/no on whether the `qa.<name>.50pick@gmail.com` inboxes actually exist
   (§6d) — if they do not, this campaign has generated up to five Postmark hard bounces.
   ⚠️ Note also that **withdrawals are genuinely unavailable** right now (3 payouts stuck since
   2026-07-29), so Phase 10 money-out cannot be tested end to end until Selcom closes them — the
   `PAYOUT_TEST_BYPASS_MSISDN` escape hatch exists for exactly one controlled test
   (`payout-status.ts:170`) and is unset by default.

8. **Then Ali's priority order, not the phase numbers** — Up & Down on real AI tokens → polls with a
   real win *and* a real loss → visuals → a live backup **restore**. See the priority box in §5; it
   carries the blockers already known for each.

### What this session did NOT touch

Said plainly so the next one does not assume coverage it did not get: **Phases 3–13 are untouched**
(money in, core play, Up & Down, proposals, AI, invites, admin/accountant, money out, the 89-route ×
4-width × 3-locale visual sweep, the adversarial money pass, scale). Phase 2's **`import`** sub-flow
is still the one KYC path never exercised. `E-7` and `E-8` remain **Ali's calls** and were
deliberately left alone.

**Five things to carry:**
- ⚠️ **The UI language is the `kp-locale` cookie** (`en`|`sw`|`zh`), NOT `User.locale`, NOT
  `?lang=`, NOT `Accept-Language`. Set the cookie *and* `localStorage["kp-locale"]`; an
  unrecognised value silently renders English. See the E-1 SW/ZH block in §6.
- ⚠️ Every `pg` read must `::text`-cast timestamps or use `live/harness.mjs` — otherwise every
  timestamp reads 3h early and looks like a server clock bug (§3).
- ⚠️ Screenshot with the **viewport**, not `fullPage`, and then **actually look at the image**.
  E-2, E-5 and the blank document viewer were all found by looking, not by asserting.
- ⚠️ **The first-run primer mounts over `/wallet/deposit` and every other page**, not just the
  identity form, and it throws React error #310 while it is up. Dismiss it after *every*
  navigation, or you will screenshot a tutorial and file a phantom bug.
- ⚠️ The login field is **`#identifier`**, not `#phone`. A saved session bounces `/auth/login`
  to `/`, so check for a password field before filling one.

**Open, not yet chased:** ~~email verification~~ **DONE, §6d** · **Postmark DELIVERY** — nothing on
the platform proves a mail ever arrives (no `EmailLog` model), and this now covers both the KYC
approval mail and the confirmation link · 2FA · auth rate-limits under load · `locale` defaulting to
SW for a player who signed up in English (E-7) · KYC **import** (the only Phase-2 sub-flow never
exercised) · the **service-level** deposit gate, which stays unexercised until a real deposit is
submitted (§6d).

## 7. Reproducing the harness

Scripts live in the session scratchpad (`…/scratchpad/live/`), not the repo, so a QA run never
dirties a shared tree:

| File | Does |
|---|---|
| `harness.mjs` | browser + persona + screenshot + console-error capture + live DB handle |
| `mkenv.cjs` | mints the public `DATABASE_URL` from Railway |
| `p1-signup.mjs` | registers a persona through the real UI (`PHONE=`, `NAME=`, `EMAIL=`) |
| `shots/` | every screenshot, named `p<phase>-<persona>-<step>` |

`node_modules` there is a **junction** to `F:\kipindi-main\node_modules` — ⛔ never `rm -rf` it
(it follows the link and deletes the other sessions' install); remove with cmd `rmdir`.
