STATUS: the next plan. Written 2026-07-29, immediately after the design system was
frozen and shipped. **Revised 2026-07-31 against the live platform, not against memory.**

**Items 1, 2 and 4 are DONE and live. Item 3 (withdrawals) is blocked at Selcom.
Multi-container is DONE and merged (2026-07-31); scale ceilings are the one code item
left.** What is left on 1 and 2 is not code — it is the operator actions listed under
"Only Ali can do these", below.

⚠️ **Two lanes ran in parallel on 2026-07-30/31** and both have now landed on `main`
(merge `491318a`): the launch-hardening lane (backups → alerting → multi-container) from
`F:\kipindi-main`, and the certification/readiness lane above. If a claim in this file
looks like it contradicts another, prefer the one with the later date and check
`git log --oneline` before rebuilding anything.

---

## ▶ Domain C — communications (in progress, 2026-07-31)

A parallel lane is certifying **C · Communications** (email + notifications). It owns
`email.ts`, `comms-registry.ts`, `notification-service.ts`, the bell and the channels; it does
**not** touch `kyc-*`, `nida`, `storage.ts` or `prisma/schema.prisma`, which belong to the KYC lane
running at the same time.

**Measured on production 2026-07-31 — verify, don't trust:**

| | |
|---|---|
| Notifications | **1,673 — every one `channel: IN_APP`.** `prisma-dal` writes that literal and nothing else writes the table, so PUSH/SMS/EMAIL are unreachable enum members |
| `sentAt` / `failedAt` / `failureReason` | **0 of 1,673.** Written by no code path anywhere in the repo |
| `priority` | `NORMAL` on all 1,673; the other three members unused |
| `event` | a **duplicate of `kind`** — the DAL writes `event: n.kind`, not the `bet.won` the schema comment promises |
| Chinese | **1,573 of 1,673 have none.** Root cause located: of **36** emitters, only **3** set `titleZh`/`bodyZh`. Swahili is complete |
| Users | 42 · locales **40 SW, 2 EN, 0 ZH** · 28 have an email, 20 verified |
| Duplicates | **28 byte-identical notifications (deep-link included) inside 60 s** — WIN ×3, BET_PLACED ×4, DEPOSIT ×20, WITHDRAW ×1. `notify()` has no idempotency key |
| Ordering | **0 violations.** No LOSS ever preceded its market's close notice. But **15 of 47** losses went to players who never received a close notice for that market at all |

🔴 **The one emitter with an idempotency guard has zero duplicates.**
`notifySelectionClosedForMarket` stamps `selectionClosedNotifiedAt` inside `withLock` — and
SELECTION_CLOSED does not appear once in the duplicate set. Every path without such a guard has
produced duplicates, including *"You won TZS 23,349"* twice **84 ms apart** and a TZS 5,000 refund
notice twice 1.25 s apart. That contrast is the argument for the fix.

**All three gates are live and every one was proven red before it was trusted:**

| Gate | Assertions | Red proofs |
|---|---|---|
| `test:cert-c1` email truth | 850 | 16 |
| `test:cert-c2` delivery resilience | 41 | 8 |
| `test:cert-c3` notification truth | 853 | 9 |
| `qa:cert-c1` email visual (4 widths) | 1,519 | — browser gate, outside `test:all` |
| `qa:cert-c3` bell visual | 🔴 **written, never run** — see below | |

🔴 **The one thing this pass did NOT do: look at the bell.** `qa:cert-c3` is written and complete
(empty / 1 item / many / long body / unread badge × 360·768·1280·1920 × en·sw·zh) but has **never
been executed**, so no claim is made about it. A production build refuses to boot without a
database (`store.ts` throws by design), and `next dev` refuses a second server for this directory
while a **hung one from 2026-07-29 (PID 22004)** holds the lock without answering on `:3000` — not
this session's process, so it was left alone. Free `:3000`, then `npm run qa:cert-c3`.

**Fixed:** the ZH gap (all 36 emitters now trilingual) · duplicate money notifications (deduped on
message + deep link, failing open, audited) · `sentAt` now written · `notifyCashout`'s hardcoded
"5-min grace window" · emoji in officer copy · the English-only SSE payload · a 10 s send timeout
where there was none · a dead provider now reports `DOWN` on `/api/health` and writes a COMPLIANCE
audit row once per outage · a `200` with no `MessageID` no longer counts as delivered.

**Original C1 note:** `npm run test:cert-c1` (843 assertions) — see the C1 dossier in
[`MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md). The inventory is code now
([`src/lib/server/comms-registry.ts`](../src/lib/server/comms-registry.ts)), and two defects that
five green suites had been sitting on top of are fixed: an unescaped `heading()`/`ctaButton` that
carried a **player-controlled display name into the inbox as live markup**, and three emails —
including self-exclusion and the mail every **failed payout** sends — that showed the player raw
HTML tags as text.

⚠️ **`email.ts` has no timeout anywhere**, and `password-reset` / `email-verification` **await** the
send inside a request. A hung Postmark hangs those requests. A dead key is one `console.error`.

---

## ▶▶ PICK UP HERE — close of session 2026-07-31 (late)

**The tree is clean and everything below is pushed. Nothing is half-finished.**

**Read [`MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) first** — the platform
is now divided into **52 modules across 12 domains**, each with a dossier, an attack list and a
gate. That document commands the remaining work; this one holds launch-hardening state.

**On a machine that has never seen this repo? → [`SETUP.md`](SETUP.md)** — prerequisites, how to
boot with no database at all, `railway run` vs `railway ssh`, and a symptom→cause table for the
traps that waste an afternoon. Then [`README.md`](README.md), the doc index.

### What this session shipped

| | |
|---|---|
| **Merged: the launch-hardening lane** | Backups (8 defects the first real drill found), alerting (`@sentry/node` + the off-box PII scrub), and the **multi-container leader lease** — proven with two real OS processes racing on real Postgres, `s12` now in CI beside s10/s11. See items 1, 2 and 5 below. Suite **114/116** after the merge. |
| Wave 0 · `test:cert-devroutes` | 110 assertions. Every exported handler under `api/dev-test/` and `api/dev/` must refuse in production **before its first `await`**. All 36 were guarded only by a convention repeated 35 times. Proven red. |
| Wave 0 · `test:orphans` | **145 of 286** `scripts/` files are run by nothing. Now declared in `scripts/orphan-allowlist.json`; the gate refuses to re-seed. **145 → 0 is the program's progress metric.** |
| Wave 1 · **F1 G8** `test:cert-f1` | 69 assertions. Players are now told, in en/sw/zh, that withdrawals cannot be paid — on withdraw **and** deposit (above the cashback promo). `unavailable` disables the form *and* the server action refuses. Officer control on `/admin/payments`. **The banner cannot be forced green:** `worstOf(declared, derived)`. |
| `npm run test:docs` | Every link, `scripts/*` path and `npm run` reference in `docs/` must resolve. |
| `docs/README.md` | New index — all 41 docs with an honest status (LAW / LIVE / RECORD / OPEN / DESIGN / HISTORICAL). |
| Wave 1 · **A6 honesty** `test:cert-a6` | 16 assertions. Admin 2FA is OFF in production and **nothing said so** — now `/api/health` reports `security.adminTotp` (live-verified `"DISABLED"`) and every boot warns, naming the lockout hazard. Pins the bypass to a closed set of 4 doors. |
| `docs/SETUP.md` | New-machine setup, and `CLAUDE.md` now opens with a START HERE pointer. |
| Orphans | **145 → 140.** Five ops tools adopted under `ops:` (never `test:` — they need live credentials). |
| Suite | **113/113 green** (`--skip responsive,motion`). `test:responsive` still unverified — see the trap list. |

### ✅ DONE — domain D (KYC) certified and live, 2026-07-31

**D1 · D2 · D3 · D4 are certified.** 4 headless gates + 2 browser gates + 2 concurrency proofs,
every negative assertion broken on purpose and observed red. Shipped in three pushes, all three
deploys verified on production. Full record in
[`MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) §4 and §9 — **that document
owns the detail; do not duplicate it here.**

| | |
|---|---|
| Gates | `test:cert-d1` (40) `test:cert-d2` (33) `test:cert-d3` (25) `test:cert-d4` (24) · `qa:cert-d1` (19) `qa:cert-d2` (26) |
| Proofs | `load:nida-race` (two OS processes) · `load:kyc-race` (real Postgres, 11 assertions) |
| Orphans | both KYC E2Es **adopted**, allowlist 140 → 138 |
| Suite | **122/122 green**, tsc clean |

**What was found, in one line each:** a player whose NIDA check FAILED was shown a green *"NIDA
number accepted"* banner while their inbox held *"Identity check needs attention"* · one NIDA
could hold two accounts (closed with a partial unique index, now live on production) · a renamed
`.exe`, an SVG carrying `<script>`, a zip and raw HTML were all accepted as ID documents · three
legal documents in three locales claimed a NIDA authority check that has never existed · a player
could silently overwrite a Source-of-Funds declaration an officer had ACCEPTED · the
Approve/Reject/Escalate controls were 38px on a phone.

⚠️ **Correction to what this file previously said.** The 24 inline documents are **NOT** evidence
that the R2 seam is misbehaving "even though `KYC_STORAGE=r2` is set". Ordering every document by
`uploadedAt` shows two clean, non-overlapping eras — all 24 inline uploaded 06-13→06-15, all 7 R2
uploaded 07-27→07-28, **zero interleaving**. They are LEGACY, from before R2 was switched on, and
every upload since has been correct. The real risk was that the seam *could* degrade silently;
`assertStorageModeIntended()` now makes that an error before any inline write.

⏳ **Still open, and both are yours:** the purge of those 24 legacy documents (all 8 owning
submissions show zero balance / zero transactions / zero positions — the evidence the owner
decision asked for — but that does not establish consent to destroy someone's ID; a six-step
procedure is in D2's dossier), and **item D2 below — narrowing the R2 token**.

### 🔴 Start here, in this order

1. **A6 — finish turning admin TOTP on.** The honesty half is done (`test:cert-a6`, 16 assertions):
   `/api/health` now reports `security.adminTotp`, and every production boot warns. **The flip
   itself is Ali's**, and the order matters:
   `railway ssh "node scripts/admin-2fa-readiness.mjs"` → enrol at `/admin/2fa/setup` while 2FA is
   still off, storing backup codes off-machine → re-run the readiness check → only then
   `railway variables --set DISABLE_ADMIN_TOTP=false` → confirm health says `"enforced"`.
   ⚠️ `admin/layout.tsx` **forces** enrolment, so flipping with zero enrolled admins locks Ali out
   with no admin able to readmit him.
2. **Wave 2 — the money core** (G1–G4, then E1–E3). This resolves the orphan TZS 100,000 wallet and
   the broken audit-chain link. ⚠️ **G3 is blocked** until Ali rules on the fee basis
   ([`FEE-MODEL-DECISION.md`](FEE-MODEL-DECISION.md), open since 2026-07-22).
3. **F1's remaining gates** — G3 (double-pay adversarial) and G7 (rail-failure resilience). G8 is done.

### ⛔ Do NOT do these — each would undo a deliberate decision

- **Do not add a two-officer/solo-resolve hard-lock.** See the note under item 3 below and H6's
  dossier. Superseded by the owner decision of 2026-07-24; `test:two-admin` asserts its absence.
- **Do not certify J1 (Up & Down)** until Ali rules on `feat/updown-source-pinning-and-proposals`
  (28 commits, unmerged). Certifying first would certify a live money bug.
- **Do not reopen design.** Frozen. Write findings down instead.
- **Do not re-seed `orphan-allowlist.json`.** It may only shrink.

### 🔴 New finding, measured on production 2026-07-31

**Nine active ADMIN accounts** (plus one FINANCE), of which **only 2 have TOTP enrolled**. Every one
of the nine can resolve markets single-handed, adjust balances and run money-ops. **Review the nine
with Ali and demote whoever does not need ADMIN** — the cheapest security work available, and it
shrinks the blast radius of the 2FA gap instead of only reporting it. Tracked in B2's dossier.
Re-measure any time with `railway ssh "node scripts/admin-2fa-readiness.mjs"`.

### Still only Ali can do these

~~Create the `50pick-backups` R2 bucket~~ ✅ **done 2026-07-31 — the bucket exists and TWO
sealed artifacts are in it, one shipped by CI itself; the unattended nightly is proven.**
~~decide the orphan TZS 100,000 wallet~~ ✅ **done — cleared, and `trialBalance()` now returns
`ok:true` for the first time.** ~~90-day lifecycle rule~~ ✅ **done — `expire-backups-90d`,
all objects, Enabled** (the nightly still prints `RETENTION UNVERIFIED` because the token
cannot read bucket config; that is accurate, not a bug — see the runbook).

~~`BACKUP_ENCRYPTION_KEY` into a password manager~~ ✅ **rotated 2026-07-31 and now readable
on Railway** — the previous one existed ONLY as a GitHub secret, which cannot be read back,
so every nightly artifact was undecryptable by anyone. A password-manager copy is still
worth adding. ~~set `SENTRY_DSN`~~ ✅ **alerting is LIVE** — see item B below.

**Still outstanding:** narrow the R2 token, which currently reaches ALL buckets · rule on the
fee basis · rule on the Up & Down branch · turn on admin 2FA (readiness check FIRST).

⚖️ **Owner decision, Ali, 2026-07-31: credential rotation is NOT being done.** The R2 keys,
the Sentry auth token and the Postgres password have all passed through session chat and
are knowingly being kept. Recorded so it reads as a decision rather than an oversight —
**do not re-raise it as an open item.** If that changes, rotate Railway and GitHub in the
SAME sitting: rolling the R2 token without updating Railway broke KYC storage on production
earlier that day.

---

## ▶ Earlier that day — state at the close of 2026-07-31

**Nothing is half-finished. No branch is mid-edit, no test is mid-run, the tree is clean
and everything below is pushed.** Head `main` at the time of writing: the `test:docs` guard
commit.

**What that session did, so you don't redo it:**

| | |
|---|---|
| GitHub repo secrets | ✅ all seven set + verified (`gh secret list`). `railway run node scripts/backup-secrets.mjs` re-checks them |
| Nightly backup | ✅ runs end-to-end on Actions. A real run dumped production (32,538 rows, 13.8 MB sealed), restored into a throwaway PG18 and passed **79 checks** |
| 🔴 The bug it found | The workflow reported **every step green while NOTHING had ever gone off-box** — `\| tee` swallowed the upload's exit code. Fixed with `set -euo pipefail` + an explicit empty-destination failure, and **proven red**. Full account in [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md) |
| Selcom probe | ✅ fixed — it reported `USABLE RAILS: NONE` (i.e. "the vendor account is dead") whenever run via `railway run`. See [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) |
| Payout state | ⚠️ **SUPERSEDED later on 2026-07-31 — Selcom fixed TIPS and payouts now pay.** Two settled end to end. What still holds from this row: float TZS 100,000, `SELCOM_PESA`/`HUDUMA_AGENT` still `4035`, and the two payouts from 07-29 still stuck at `999`. See [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state — 2026-07-31 |
| New guard | `npm run test:docs` — every link, `scripts/*` path and `npm run` reference in `docs/` must resolve. Broken on purpose and observed to go red |
| Test suite | **111** `test:*` scripts. 108 verified green; `test:responsive` still unverified (see the trap list below) |

**~~The ONE thing blocking backups~~ — RESOLVED 2026-07-31.** The bucket exists, two sealed artifacts are in it (one shipped by CI), and a 90-day expiry rule is set. Historical text follows: the `50pick-backups` R2
bucket does not exist. Cloudflare → R2 → Create bucket. The Railway R2 token is
bucket-scoped and cannot create it. Then prove it with
`railway run node scripts/backup-verify-offbox.mjs` — **do not trust a green tick**, that is
exactly what went wrong.

**Also outstanding from that session, and easy to lose:** `BACKUP_ENCRYPTION_KEY` was
generated into `.env.backup.local` (gitignored) and **must be moved into a password
manager**. It is the seal on every artifact the nightly will write. The previous drill's key
was written to that same path and lost.

# 50pick — next plan: LAUNCH HARDENING

The design pass is done and live. Design is no longer a source of risk: it is frozen
behind `test:design-frozen`, and a change is a token edit in one place.

**What is left is not features. It is the things that decide whether a live real-money
platform survives its first bad day** — a lost database, an error nobody sees, a second
container, a withdrawal that cannot be paid.

This file is the brief. Copy the block at the bottom into a fresh session.

---

## Where we actually stand (re-verified 2026-07-31 against production, not assumed)

| | State |
|---|---|
| Live | `www.50pick.tz`, Railway `50pick` / `production`, running `be4a12be`; `/api/health` `ok:true` |
| Money mode | **TEST** — deposits real via Selcom. **Withdrawals PAY as of 2026-07-31** (2 real payouts settled) but the form is still shut to players: two payouts stuck at `999` since 07-29 keep `derivePayoutStatus` at `unavailable`. Only Selcom closing those reopens it. |
| Test suite | **110** `test:*` scripts. **108 verified green 2026-07-31**; `test:responsive` was **not** verified — see below |
| Design | FROZEN + LIVE (B9/B10, `test:design-frozen`) |
| Error tracking | ✅ code complete — durable + scrubbed + `@sentry/node` wired and proven (`test:alerting`). ⚠️ **`SENTRY_DSN` is NOT set in Railway (verified), so nobody is paged.** `/api/health` reports `monitoring.alerting:false` |
| Database backups | ✅ toolchain complete, **drilled against production**, and the nightly now runs end-to-end on GitHub Actions (secrets set 2026-07-31; a real run restored production into a throwaway PG18 and passed 79 checks). 🔴 **Nothing is off-box yet — the `50pick-backups` bucket does not exist.** The job correctly fails red on it now; until 2026-07-31 it reported GREEN while shipping nothing, see [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md) |
| KYC storage | ✅ live on R2 — `R2_BUCKET=50pick-kyc`, endpoint + keys set in Railway |
| Admin 2FA | ❌ **OFF in production** — `DISABLE_ADMIN_TOTP` is set. Must be off before real-money launch; flipping it blind risks locking Ali out, so it needs an enrolment first |
| Multi-container | ❌ unsafe — `admission.ts`, `rate-limit.ts` and the ticker keep state in module scope |

### Only Ali can do these (nothing in the repo can advance them)

| # | Action | Why it cannot be automated |
|---|---|---|
| A | **Tell Selcom to enable `SELCOM_PESA` + `HUDUMA_AGENT`** | Their switch. Unblocks paying customers; the ladder already tries both, so no code change |
| B | ~~Set `SENTRY_DSN`~~ | ✅ **DONE 2026-07-31 — alerting is LIVE.** Org `50pick`, project `50pick-server`, **EU region** (`de.sentry.io`). `/api/health` reports `alerting: true`. Proven by pushing a labelled error through the real path and **reading it back out of Sentry**: the stored issue title is `payout failed for <msisdn> (<email>) nida=<digits>` — scrubbed in Sentry's own record, not just in what we sent. Repeat with `npm run ops:sentry-smoke` |
| C | ~~Add the GitHub repository secrets~~ | ✅ **DONE 2026-07-31.** All seven set. 🔴 **`BACKUP_ENCRYPTION_KEY` was ROTATED later that day**: the previous one existed ONLY as a GitHub secret, which cannot be read back by anyone — so every nightly artifact was **undecryptable**, while restoring, verifying and recording `verified: true`. It is now on **Railway** (readable), in GitHub, and in `.env.backup.local`, and the newest artifact was opened with it to prove it. A password-manager copy is still worth adding. See the runbook's key section |
| D | ~~Create the `50pick-backups` R2 bucket~~ | ✅ **DONE 2026-07-31.** Bucket created (WEUR, Standard, private), R2 credentials updated on Railway **and** in the GitHub secrets, and run `30615505120` shipped its own 13.18 MB artifact. Verified by listing the bucket, not by the tick. ⚠️ **Rolling the old token broke KYC storage on production** until Railway was updated — see the runbook; never roll the token in use |
| D2 | **Narrow the R2 token to `50pick-backups` only** | The current token reaches ALL buckets (chosen for speed), so one leaked key reaches both the KYC documents and the backups containing them. A Cloudflare action + updating two GitHub secrets |
| D3 | **Add an Object Lifecycle Rule** on `50pick-backups` — **expire after 90 days** | Dashboard-only: an Object Read & Write token cannot write bucket config (`PutBucketLifecycleConfiguration` → `AccessDenied`, tried 2026-07-31). Otherwise every KYC record on the platform accumulates there forever — a data-protection problem, not a storage bill. **The nightly now nags about it every run** until it can confirm a rule |
| E | ~~Decide the TZS 100,000 orphan wallet~~ | ✅ **DONE 2026-07-31**, at Ali's instruction. Reversed through the audited path, then the missing ledger entry backfilled. **`trialBalance()` now returns `ok: true` — 0 drifting wallets, 0 drift** for the first time. Script: `scripts/ops-clear-unledgered-credit.mjs` (refuses without `--actor`, dry-run by default) |
| F | **Rotate the Postgres password**, and the credentials exposed in chat | Rotating live DB creds mid-session takes the site down if mistimed |

### The four things that would hurt most, worst first

1. ✅ **Backups — DONE 2026-07-30. THE DRILL HAS BEEN RUN AGAINST PRODUCTION.** A sealed
   13 MB artifact was taken, shipped, restored into a throwaway PostgreSQL 18.3, checked
   by 79 assertions, and `db:restore` was rehearsed to exit 0. `/admin/compliance` now
   reads that run. Nightly at 00:15 UTC via `.github/workflows/backup-nightly.yml`.

   ✅ **AND THE UNATTENDED NIGHTLY NOW WORKS — 2026-07-31, run `30615505120`.** All seven
   repository secrets set, `50pick-backups` created, and a dispatched run dumped
   production, shipped it off-box, restored it into a throwaway PostgreSQL 18 and recorded
   `verified: true` with a real `destination`. The bucket holds two objects and the newer
   one is CI's. Confirmed by listing the bucket — the previous "all steps ✓" was a job in
   which nothing had ever left the runner.

   🔴 **The drill found EIGHT defects, and that is the finding.** The toolchain had been
   green on 59 checks the whole time. Among them: `db:restore` summed a column that does
   not exist and so **reported a successful recovery as a failure**; the seal key had two
   different names, so the one tool needed during a recovery could not open what the other
   two produce; **a unique index was missing from every artifact ever written** (an FK's
   `conindid` made the index filter skip it) — row counts, money and the audit chain all
   still matched, and the only symptom would have been a duplicate months later; the dump
   read data and invariants on different connections, so a live platform made the manifest
   contradict itself; and two of the files **could not be parsed** while
   `npm run typecheck` reported success, because `.mts` is outside the root tsconfig.
   Full list and what changed: [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md).

   ⚠️ **Source problems are not backup problems.** The first verification ended in "DO NOT
   TRUST THIS BACKUP" over four failures that production reports identically. The artifact
   was flawless. Verification now compares restored-vs-**source**, and the source's health
   is reported separately — otherwise the nightly is red forever and people stop reading it.

   ⏳ **Operator actions left:** C and D in the table above.

   🔴 **Correction, 2026-07-31.** This file previously said *"`BACKUP_ENCRYPTION_KEY` was
   generated locally into `.env.backup.local` (gitignored) — copy it into a password
   manager."* **That file does not exist**, in `C:\kipindi-main`, in the `kipindi-night`
   worktree, or anywhere else searched. The key from the drill is **gone**. This costs
   nothing today — the drill artifact was local and disposable, nothing has been uploaded
   off-box, and no stored backup is stranded — but it would have been read as "the key is
   safe on the laptop". **Generate a fresh 32-byte key at the moment you add the repository
   secrets, and put it in a password manager in the same sitting.** Do not write it to a
   file and intend to move it later; that is exactly what did not happen here.

   🔴 **A live money finding the drill surfaced, needing Ali:** one wallet holds
   **TZS 100,000 with no ledger entry, no `Transaction` and no audit row**, and the audit
   chain reports a broken link. Both are on production, both are on `/admin/compliance`
   under the backup card, and neither is a backup problem. See the runbook's "Open
   finding" section for what was and was not confirmed about its origin.

   ⚠️ Worse, until 2026-07-29 `/admin/compliance` rendered a **hardcoded green ✓**
   reading *"Auto-snapshot on every mutation · HMAC-signed · last 12 retained ·
   disk-backed"*, and `/admin/system` stated *"Backup → Postgres point-in-time recovery
   … replicated across two regions"* as fact. None of it existed: no script, no snapshot
   writer, and nothing reads `STORE_BACKUP_DIR` (it survives only in `.gitignore`). The
   tick sat beside the audit-chain card, which reads live state, so it borrowed real
   credibility. Both now state the truth. **When you build backups, wire this card to the
   REAL last-run state — do not restore a static tick.**
2. ✅ **Error tracking — CODE COMPLETE 2026-07-30, one operator action left.**
   `@sentry/node` is installed and the seam is **proven end to end**: `test:alerting`
   (27 checks) points a real Sentry client at a throwaway HTTP server on `127.0.0.1`,
   pushes a real error through the real `captureServerError`, and inspects the bytes that
   arrive. **Ali sets `SENTRY_DSN` and redeploys — that is the whole remaining step.**

   🔴 **That gate found a dormant data-protection bug.** `captureException` was handed the
   **raw** error while only the audit sink ran `scrubForAudit`. The scrubber sat one line
   above the call that ships data off-box and was not applied to it, so the *first alert
   ever sent* would have carried a player's phone number out of Tanzania. Proven, not
   argued: delete `beforeSend` and the gate catches a real `+255…`, a real email and a
   real NIDA in the envelope on the wire. It was invisible only because no DSN was ever
   set. Now every string in an event is scrubbed — messages, stack frames, breadcrumbs,
   `extra`, framed local variables — cycle-safe, built on the same `scrubForAudit` the
   audit sink uses so the two lists cannot drift.

   **Durable ≠ alerting, and both `/api/health` and `/admin/compliance` now say which is
   which.** Until the DSN is set the card reads "Durable — but nobody is paged".

   Historical detail below.

   ~~**HALF CLOSED.**~~ ✅ Production exceptions are **durable**:
   `onRequestError` → `captureServerError` writes a PII-scrubbed, deduped `SYSTEM /
   server.error` audit row (stack included, repeat-count carried) alongside the `[snag]`
   log. This mattered more than it sounds — chasing a payout failure ten minutes old that
   day, Railway's log buffer had **already rolled past it**, so nothing survived to find.
   Guarded by `test:monitoring` (23 checks, scrubber driven behaviourally).
   ⚠️ **Still missing: ALERTING.** Nothing pages anyone; you must go and look. `monitoring.ts`
   is a ready seam — `npm i @sentry/node` + `SENTRY_DSN` activates the off-box mirror with no
   other code change. Sending a licensed operator's data off-box is Ali's call.
3. ✅ **RESOLVED 2026-07-31 — Selcom fixed TIPS and withdrawals now pay.** Two real payouts
   settled end to end (`wdr_95e5cddab0fbfcb3fdbf`, `wdr_009c1a7c3662aaabcf47`, TZS 1,970 each,
   `resultcode 000`), the first successes in the platform's life. The success path —
   confirm → hold release → ledger → notification → "Withdrawal sent" email — has now run.

   🔴 **But withdrawals are still SHUT to players, and it is no longer Selcom's rail.** The two
   payouts stranded at `999` since 07-29 (TZS 15,000 of a customer's money) are older than
   `UNAVAILABLE_AFTER_HOURS`, so `derivePayoutStatus` reports `unavailable` and the form refuses
   everyone. **Closing those two — either way — is what reopens withdrawals**; no code change
   will, and an officer cannot override it (`worstOf(declared, derived)`, by design).
   A scoped `PAYOUT_TEST_BYPASS_MSISDN` lets the owner-testers through meanwhile; **seal it**
   with `railway variables --unset` once the two are closed.

   🔴 **One bug was ours, and only a working rail could expose it:** Selcom refuses a NET below
   TZS 1,000 (`resultcode 013`). Our minimum was 1,000 *gross*, so after the 1.5% fee we asked
   for 985 — the smallest withdrawal we advertised was undeliverable. Fixed by checking the net
   against `PROVIDER_MIN_PAYOUT_TZS`, with the form minimum **derived** from the live fee rate
   (`minWithdrawalForRate`) rather than hardcoded, since the fee is admin-tunable.

   Until then the asymmetry stood: players could put money **in** and not take it **out** — the
   single worst thing a gambling operator can ship, and a licence question, not just an ops one.

   Everything on our side is ruled out with evidence: float funded, PIN set,
   `WALLET_CASHIN` provisioned, payee number valid, `utilitycode` correct, signature
   accepted. And a payout still returns `010 "Invalid mobile number or operator not
   supported"` — while `namelookup` on the *same number, minutes apart* returns `000
   SUCCESS` with the correct registered name. Their gateway contradicts itself; every
   status query returns `999 "No reponse from upstream system"` **including for a transid
   that does not exist**, which points at their upstream (TIPS) being down.

   ▶ **The ask: enable `SELCOM_PESA` and `HUDUMA_AGENT`.** Both are Selcom-internal, do not
   ride the broken upstream, and **the fallback ladder already tries them — no code change.**

   ⛔ Do **not** "fix" this by editing `mnoToSelcomCashin`. The codes are proven correct.
   ⛔ Two superseded diagnoses are fenced in the rails doc — do not re-derive them.
   Full state: [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state.
4. ~~**`scripts/gift-admin-credit.ts` still exists.**~~ ✅ **DONE 2026-07-30.** Deleted, along
   with `docs/OPERATOR-CREDIT-TOOLS.md` (per that file's own removal checklist);
   `scripts/credit-user.ts` was already gone. Nothing in the repo can mint balance now
   except `scripts/seed-test-float.mjs`, which **refuses outright when
   `NODE_ENV=production`** and is guarded by `test:float-guard`. ⚠️ Step 4 of that
   checklist — **rotate the Postgres password** — is still outstanding and is Ali's call.

### Known scale ceilings (measured, from `POLISH-BACKLOG.md` §3)

Each is fine today and bites at a stated threshold — none is speculative:

- **~125 concurrent SSE clients** (`event-bus.ts` `setMaxListeners(500)`, 4 listeners per
  client) on a product whose pitch is live odds.
- **~1k users:** the public leaderboard runs `db.user.list()` with no `where`/`take`, then
  one positions query per user, uncached. Whoever shares that link is the trigger.
- **~1k users:** `db.txn.listAll()` walks the whole transactions table into memory from
  12+ call sites — while the adjacent `txn.search` does it correctly and its own comment
  says the table "must never be walked in memory".
- **Multi-container is unsafe today.** Correct only because production runs ONE container.
- **Lifecycle ticker:** serial sweeps on a 60s interval guarded by a process-local boolean.
  Past one pass > 60s it starts skipping. ✅ **No longer silent (2026-07-30):** each skip is
  logged with how long the pass has held and which chores did not run, consecutive and
  lifetime counts are kept, a COMPLIANCE audit fires after 5 consecutive skips (~5 min of
  stalled payment reconcile), and `/api/health` reports `ticker`. Guarded by
  `test:payout-observability` §7. The ceiling itself is unchanged — a pass still has to fit
  in 60s; you will now simply know when it does not.

---

## What still governs (read before touching anything)

- [`docs/README.md`](README.md) — **the index. 41 docs, each with an honest status: LAW, LIVE,
  RECORD, OPEN, DESIGN or HISTORICAL.** Read it before opening anything else in `docs/`; from
  the outside a snapshot of a Tuesday in May looks identical to a law
- [`docs/MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) — **52 modules, 8
  gates, 0 certified.** The program that finishes the platform module by module. This file
  (launch hardening) and that one (certification) are siblings; neither supersedes the other
- `CLAUDE.md` — how this repo works
- `docs/DESIGN_AUTHORITY.md` — B1–B10, and "what the freeze pass found — do not undo"
- `docs/design-system/v2-2026-07-27/06-patterns-and-rules/` — RULES.md (16 laws) +
  MERGE-DISCIPLINE.md
- `docs/perfection-plan.md` — the 0-issue launch plan and its 9 role gates
- `docs/LAUNCH-GO-NO-GO.md` — the env/infra checklist
- `docs/POLISH-BACKLOG.md` — §2 FIX SOON and §3 LATER are still open; §1 and §4 are done
- `docs/GO-LIVE-RUNBOOK.md`, `docs/SELCOM-DISBURSEMENT-ACTIVATION.md` — payments ops

---

=== BEGIN NEXT PROMPT ===

You are working in the **50pick** repo (`kipindi-main`), a licensed real-money prediction
platform that is **already live** at `www.50pick.tz` in TEST money mode. This is the
**launch-hardening** pass. It is not a feature pass and not a design pass — design is
frozen and must not be reopened.

Read first: `CLAUDE.md`, `docs/NEXT-PLAN.md` (this file's "where we stand"),
`docs/DESIGN_AUTHORITY.md`, `docs/perfection-plan.md`, `docs/LAUNCH-GO-NO-GO.md`,
`docs/POLISH-BACKLOG.md` §2–§3.

**Verify every claim above before you act on it.** The last pass found three test gates
that were passing while the thing they guarded was broken — a contrast audit that
hardcoded the token values it was meant to check and hid a real AA failure, a bridge test
querying the wrong Tailwind map, and a component that re-typed its own tokens by hand. A
green gate is evidence, not proof. Check the artifact the user actually receives.

### ✅ Already done — do NOT rebuild these

Three of the original six items are closed and live. Rebuilding them is the most likely way
to waste this pass, so they are named explicitly:

1. **Backups + a proven restore — DONE 2026-07-30, drilled against production.** The
   toolchain exists (`db:backup` / `db:verify-backup` / `db:restore` / `db:scratch`),
   `test:backup` is 113 checks, and a real artifact was restored into a throwaway
   PostgreSQL 18.3 and diffed. What is left is **operator setup only** (secrets + bucket).
   Read [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md) — especially the eight defects the drill
   found that 59 green checks had not.
2. **Error tracking — CODE COMPLETE 2026-07-30.** `@sentry/node` wired, scrubbing proven on
   the wire by `test:alerting` (27 checks). Left: **Ali sets `SENTRY_DSN`.** Do not rebuild
   the seam; do not add a second scrubber.
3. **Balance-minting scripts — DELETED 2026-07-30.** Only `seed-test-float.mjs` remains and
   it refuses in production (`test:float-guard`).

### The actual work, worst risk first

**1. Withdrawals — tell the player the truth while they are down.** The payout blocker is
Selcom's (item 3 above) and no code fixes it. What *is* ours: an operator that accepts
deposits while withdrawals cannot be paid **must say so plainly, in the product**, in all
three languages. Check what the wallet and cash-out screens currently promise a player
about timing, and make them honest. This is a licence exposure, not a nicety.

**2. Scale ceilings** — ✅ **the expensive ones are DONE and MEASURED (2026-07-31).** The
backlog said they "bite at ~1k users"; that was reasoned, not measured. Seeded a disposable
Postgres to 1,000 users × 100 transactions (`scripts/load/s13-scale-ceilings.mts`) and timed
the real paths:

| at 100k transactions | before | after |
|---|---|---|
| 30-day report window | 3,321 ms · **385 MB heap** | **303 ms** (54 ms with the new index) |
| one player's transactions | 3,783 ms | **11 ms** |
| build the leaderboard | ~2,236 ms, **pool exhausted mid-run** | **6 ms** |

The heap figure was the real danger — a Railway container has 512 MB, so one report on a
moderately busy platform was near the end of the process. The leaderboard was worse: a
**public** page whose trigger is somebody sharing the link.

Parity is guarded, not assumed — `npm run test:report-parity` (28 assertions) drives both
implementations over a fixture with a row sitting exactly on each window bound, because GGR
feeds the TRA and GBT levies and a moved boundary moves money between two filings.

⏳ **Still open, stated rather than implied fixed:** `reports/catalogue.ts` (3 sites) and
`insights.ts` still walk the whole table — they are all-time statutory aggregates, so the
fix is a `GROUP BY` per report, not a smaller scan. And the **SSE ceiling (~125 concurrent
clients)** is untouched, on a product whose pitch is live odds. Both in
`POLISH-BACKLOG.md` §3.

**3. Admin 2FA is OFF in production** (`DISABLE_ADMIN_TOTP` is set — verified 2026-07-31).
It was disabled deliberately so a consultant could test, and must be on before real money.
**Do not simply unset it** — confirm an admin has TOTP enrolled first, or the flip locks
Ali out of his own console.

⛔ **Not on this list, and deliberately so: the two-officer resolution rule.** An earlier note
claimed solo-resolve "lost its production hard-lock" and must be re-locked. That is
**superseded** — `COMPLIANCE-DECISIONS.md` §2026-07-24 records Ali's decision that single-admin
resolution is the permanent default in all money modes with **no** real-money hard-lock, the
officer-conflict block is deleted, and `test:two-admin` asserts the absence of a lock as a
passing requirement. Re-adding one reverses a dated owner decision. If Ali wants it mandatory
before real money that is a **new** decision needing a new entry and a test change.

**4. `docs/POLISH-BACKLOG.md` §2 FIX SOON** — the i18n and date-helper items. Small, real,
and untouched.

**5. Multi-container readiness** — ✅ **the dangerous half is CLOSED (2026-07-30).** The
lifecycle chores run behind a **leader lease** (`src/lib/server/leader.ts`): a short-lived
`SystemConfig` row claimed and renewed inside a Postgres advisory lock, so the
read-then-write is atomic across containers. Fails **closed** (an unreachable database
returns `false` — driven, 2.1 s), hands the lease back on `SIGTERM`, and expires on its own
if a container dies holding it. `/api/health` reports the holder.

Proven by `scripts/load/s12-leader-contention.mts`: **two real OS processes** racing
against real Postgres, 10/10, now in CI beside s10/s11. It cannot be proven in-process —
`leader.ts` keeps its instance id in module scope, so two calls in one process always
agree. Removing the advisory lock makes **both instances win**; that was run, and s12
caught it.

⚠️ Still per-container **by design**, each with a stated consequence in
`POLISH-BACKLOG.md` §3: `admission.ts` (Redis must never touch the bet path ⇒ N containers
need the DB pool sized N×; at pool 40 that is ~36 in-flight bets each), rate limits and SSE
fan-out (cross-container code exists in `redis.ts` but is **inert** until Ali sets
`REDIS_ENABLED=true` **and** `REDIS_URL` — until then two containers would each grant the
full OTP/login budget, audit H2), and the deposit fast-poll (idempotent on purpose).
Redis fail-open verified against a dead port: 2 ms, then 0 ms, never throws.

### Also true, and worth knowing before you start

- **`npm install` after pulling.** The hardening pass added `pg`, `@sentry/node` and
  friends. `test:backup` and `test:alerting` fail with `TS2307: Cannot find module 'pg'`
  on a stale `node_modules` — that is a missing install, not a broken suite.
- **`test:responsive` and `test:motion` need a server on `:3000`.** Without one they fail on
  navigation and look like real regressions. `test:motion` re-ran green (43/43).
  ⚠️ **`test:responsive` is the one suite NOT verified on 2026-07-31.** It is locales × routes
  × breakpoints with a screenshot each — thousands of page loads. Against a Turbopack **dev**
  server, which recompiles every route on first hit, it ran **40+ minutes without finishing**
  and was abandoned. Run it against a production build (`npm run build` then `next start`),
  budget real time, and do not read a slow run as a hang. The last recorded result was
  5016 pass / 24 fail, and `POLISH-BACKLOG.md` §4 documents those 24 as Playwright
  navigation races on admin routes, not product defects.
- **There is a second worktree**, `C:\kipindi-night` on `night/measure-search` at
  `7d58354d`. That work is **merged and live**; the checkout is finished debris. It belongs
  to another session — leave it alone unless Ali says otherwise.
- **An unmerged branch is open:** `feat/updown-source-pinning-and-proposals`, 28 commits,
  current with `main`. It fixes a real money bug (editing an Up & Down asset's source URL
  silently switches the source under open rounds with stakes already placed) and adds AI
  round proposals behind an officer queue. See [`NEXT-SESSION-UPDOWN-AI.md`](NEXT-SESSION-UPDOWN-AI.md).
  **It is another lane's work — do not merge it without Ali.**

### Rules

- **Money paths are gated.** Anything touching payout, settlement, the ledger or wallet
  needs the money suite green (`test:money-invariants`, `test:fee-model`,
  `test:settlement-gate`, `test:concurrency`, `e2e:money`) plus a stated reason it is safe.
- **Do not reopen design.** No token edits, no component restyling. If something looks
  wrong, write it down for a later pass.
- **Every push to `main` is a LIVE deploy.** Work on a branch, run the gates, stop for Ali.
- **Same change updates code AND docs.** No new tracker files — update the doc that already
  owns the subject, and delete this file's items as they are finished.
- **`npm run test:all` before you claim done**, and drive the real site, not just the suite.

=== END NEXT PROMPT ===
