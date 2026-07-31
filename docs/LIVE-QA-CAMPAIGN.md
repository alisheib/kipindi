# Live QA campaign — every player & operator flow, driven against production

**Started** 2026-07-31 · **Branch** `qa/live-experience` (worktree `F:\kipindi-liveqa`, off `origin/main` @`3f24a30`)
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
| **Operator console** | `https://50pick.tz/auth/admin`, phone **`777777777`** (E.164 `+255777777777`, `usr_1b3e6fd5048b1d873e931715`, `alisheib07@gmail.com`) | `.env.qa.local` → `QA_ADMIN_PASSWORD`; also Ali |
| **QA player `alpha`** | phone **`712000101`**, `qa.alpha.50pick@gmail.com` | `.env.qa.local` → `QA_ALPHA_PASSWORD` |
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

**Regenerating live DB access from scratch** (the internal host is unreachable from a laptop):

```bash
cd F:\kipindi-main                      # the Railway CLI link lives in THIS tree
railway run -s 50pick -- node <scratchpad>/live/mkenv.cjs
```

`mkenv.cjs` rewrites the injected internal `DATABASE_URL` onto the Postgres service's public TCP
proxy (`turntable.proxy.rlwy.net:40357`) and writes it to a file — **it never prints the secret**.
`railway variables` is blocked by the permission classifier by design; don't fight it, use this.

## 2. Environment facts (verified 2026-07-31, not assumed)

| Fact | Value |
|---|---|
| Railway | workspace `Ali Sheib's Projects` · project `50pick` (`5e87353c…`) · env `production` · services `Postgres`, `Redis`, `50pick` |
| Live DB | PostgreSQL **18.3**, 61 MB, 43 users / 42 wallets, 18.9k audit rows |
| `NODE_ENV` | `production` → **every `/api/dev-test/*` route 404s**. Live flows must go through real UI. |
| `DISABLE_ADMIN_TOTP` | `true` on prod (admin 2FA off — pre-existing, tracked elsewhere) |
| SMS provider | `console` — **deliberate**: the OTP path is parked until the SMS contract is signed. Registration and login are phone+password, so this is not a signup blocker. Re-check before enabling OTP. |
| `TWELVEDATA_API_KEY` | **absent** on prod — the Up & Down source-pinning branch needs it (other session's work) |
| Anthropic key | present (AI poll generation is live) |

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
- ⚠️ Three worktrees share one `.git`, one `node_modules` and one database. `F:\kipindi-main`
  holds the Railway link. Ports 3000/3009/3010/3011/3200 belong to other sessions — stay off them.

## 4. Test personas (created on LIVE)

All created through the real UI on production. Phone is the **9-digit local part**
(`712000101`); passwords in `.env.qa.local`. NIDA numbers are sequential from
`19950412123456789012` so a duplicate is easy to construct on purpose.

| Persona | Phone (E.164) | User id | KYC | Intended use |
|---|---|---|---|---|
| `alpha` | `+255712000101` | `usr_1cf528b35ef795530aa1c63f` | **`APPROVED`** 2026-07-31 13:58Z → `User.status = ACTIVE` | main player — bet, win, withdraw |
| `bravo` | `+255712000102` | `usr_26313f74d8428e4e169603ca` | **`REJECTED`** 2026-07-31 14:11Z (`DETAILS_MISMATCH`) | rejected; nida …9013 now free |
| `charlie` | `+255712000103` | `usr_8ed1b4ca3579490c94435188` | approved → **revoked** (`ADDITIONAL_INFO_REQUIRED`) → **`SUSPENDED`** | banned; sessions revoked; temp password issued |
| `delta` | `+255712000104` | `usr_429885ab43c0cb4ce134dd7e` | **`REJECTED`** 2026-07-31 14:26Z (`BLURRY_DOC`) | used to verify E-1 on prod; nida …9015 now free |

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
| 1 | Auth: signup · email verify · login · forgot-password · 2FA · sessions | 🔄 signup · login · forgot-password · phone shapes · enumeration all ✅ **shipped + verified live**; email-verify, 2FA, sessions, rate-limits still open |
| 2 | KYC: submit · import · approve · reject · revoke · ban · NIDA duplicate | ✅ **officer review DONE** — approve · reject · revoke · ban · NIDA freed, all driven on prod (§6c). E-1 now verified in **EN + SW + ZH**; E-3 fixed. Only `import` untested |
| 3 | Money in: wallet · deposit · ledger · receipts | ⏳ |
| 4 | Core play: markets · YES/NO · win + lose · resolution · payout | ⏳ |
| 5 | Up & Down: rounds · quick-bet · pricing · void · history | ⏳ |
| 6 | Proposals: propose · approve · 4-state switch · bonus | ⏳ |
| 7 | AI: poll generation · source registry · token enable/disable · usage | ⏳ |
| 8 | Invites & referrals | ⏳ |
| 9 | Admin & accountant: roles · RBAC · finance · reports · settlement · audit | ⏳ |
| 10 | Money out: withdrawal + the payout gate | ⏳ |
| 11 | Visual sweep: 4 widths × EN/SW/ZH across 89 routes | ⏳ |
| 12 | Adversarial: cheating, manipulation, abuse of every money path | ⏳ |
| 13 | Scale readiness for 10,000s of users | ⏳ |

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

| **E-6** | MEDIUM | KYC reject · player | **The rejection reason is printed twice — once in the player's language, once in English.** Found while verifying E-1 in SW/ZH. `REJECT_REASONS` in `kyc-actions.ts:34-40` maps each rail code to a hard-coded **English sentence**, which is prepended to the officer's note and stored as `rejectNote`. Now that E-1 makes the category translate, a Swahili player reads *“Sababu: **Picha ya kitambulisho ina ukungu au ni nyeusi sana**. Document unreadable — please re-upload a clear photo.”* — the same sentence twice, the second one ours, in a language 44 of 46 live users have not chosen. | `shots/e1card-delta-sw-360.png`, `e1card-delta-zh-1280.png` | ⏳ open |

### Open findings — evidenced on production, NOT yet fixed

| # | Sev | Area | Finding | Evidence |
|---|---|---|---|---|
| **E-2** | MEDIUM | KYC workstation | **One officer screen renders the same day in two timezones.** The decision card says *31 Jul 2026, 17:11* and the applicant panel *SUBMITTED 31 Jul 2026, 16:31* (both EAT), while the document strip directly between them says *uploaded 2026-07-31 13:31:33* — the raw UTC value, unlabelled and 3h earlier. DOB renders as the raw ISO string `1995-04-12T00:00:00.000Z`. An officer comparing upload time against submission time on a compliance record reads a 3-hour gap that does not exist. | `shots/p2-bravo-rejected.png` — all three on one screen |
| **E-4** | MEDIUM | KYC workstation | **The officer's four attestations are never recorded.** *Name matches the ID · Document appears authentic · Selfie matches the ID photo · Sanctions / PEP clear* must all be ticked to arm Approve, but they are client-side `useState` only: `approveKycWorkstationAction` never receives them and the audit payload carries just `{riskScore, makerChecker}`. The one thing an inspector would want — that a named officer positively attested the selfie matched — is discarded at the moment it is made. | `kyc-decision-rail.tsx:66` vs `kyc-actions.ts:62-85`; live audit row `kyc.workstation.approved` |
| **E-7** | MEDIUM | i18n · profile | **`User.locale` is stored, shown to the player, and never used to render anything — and the player cannot change it.** Signup hard-codes `locale: "SW"` (`auth-service.ts:268,463`) and the column defaults to `SW`, so **44 of 46 live users are `SW`**. But the rendered language is the `kp-locale` cookie alone, which falls back to **`en`** when absent — so a brand-new Tanzanian visitor gets English while their row says Swahili. `/profile` then badges that row directly (`profile/page.tsx:132`, `user.locale === "SW" ? "Kiswahili" : "English"`), i.e. it tells a player reading English that their language is Kiswahili — **and prints "English" for a `ZH` user**. `profile/actions.ts:29` accepts `EN`/`SW` only (no `ZH`), and **no component in the app ever submits a `locale` field**, so nothing a player does can ever correct it. The column does drive real output: web-push (`notification-service.ts:136`) and OTP SMS (`sms.ts:156`) — both would go out in Swahili to a player using the site in English. | live: `delta` is `locale = SW` and rendered EN until the cookie was set; `select locale, count(*)` → SW 44 / EN 2 | ⏳ open |
| **E-5** | MEDIUM | approval burst | **The approval burst promises what the next banner refuses.** `/profile/kyc` shows the gold *ID verified* burst reading “**You can now deposit and withdraw freely**” — directly under a banner reading “Confirm your email to add money to your account”, and `/wallet/deposit` does block on exactly that. Withdrawals are additionally disabled platform-wide right now (“Withdrawals cannot be paid right now”). The player's proudest moment tells them something the product immediately contradicts twice. | `shots/p2-alpha-player-kyc-430.png`, `p2-alpha-wallet-deposit-430b.png` |

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
- **DOB is stored as midnight EAT** (`1995-04-12` → `1995-04-11T21:00:00Z`). Correct, but any
  surface that renders the raw UTC date will show the previous day. Check the KYC/admin views.

## 6b. NEXT SESSION — start here

**Shipped and live so far:** `26a1471` (A-1/A-2/A-3) · `5e6babe` (tracker) · `c3aded6` (D-1) ·
`647e266` (D-2) · **`617fbfb` (E-1)**. All merged to `main`, deployed SUCCESS on Railway, and
re-verified against production — not just built. Branch `qa/live-experience` == `main`.

**Phase 2 officer review is COMPLETE** (§6c). Approve, reject, revoke, ban, session
revocation, the enumeration probe and the NIDA free/claimed pair were all driven against
production. Two fixes shipped (E-1, E-3); E-1 is now verified in **EN, SW and ZH**. Five
findings are evidenced and **open** (E-2, E-4, E-5, E-6, E-7).

**Resume here, in this order:**

1. ✅ **E-1 verified in SW and ZH** — done, see §6. It turned up **E-6** (the reason is printed
   twice, the second time in English) and confirmed **E-7** (`User.locale` renders nothing).
2. ✅ **E-3 fixed and live** — the round trip is guarded by `test:kyc-doc-metadata`.
   ⏳ **Still owed: Ali's decision on backfilling the 19 existing R2 rows.**
3. **E-6, then E-2, E-5, E-4.** E-6 is a two-line change in `REJECT_REASONS` (stop prepending
   the English sentence for codes whose enum member is now translated — but KEEP it for
   `suspected_fraud`, which maps to `OTHER` and therefore prints no category at all, and relax
   the `reason.length < 5` check so a code-only rejection is still allowed). E-2 is a formatter,
   E-5 is copy, E-4 needs a small schema decision about where attestations live.
4. **Then Phase 3, money in** — credit the approved wallets (Ali has authorised crediting test
   users on live), then wallet · ledger · receipts. **`alpha` is the only ACTIVE persona**;
   `bravo`/`delta` are REJECTED and `charlie` is SUSPENDED, so create a fresh persona or restore
   one before you need a second funded player.

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

**Open, not yet chased:** email verification (every persona is `emailVerifiedAt: null` and the
deposit gate depends on it — this now blocks Phase 3 deposits) · whether the KYC approval email
actually reached Postmark (the in-app notification did; the email was fire-and-forget and not
confirmed) · 2FA · auth rate-limits under load · `locale` defaulting to SW for a player who
signed up in English · KYC **import** (the only Phase-2 sub-flow never exercised).

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
