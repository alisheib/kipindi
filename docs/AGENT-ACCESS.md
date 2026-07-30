# Giving an agent full access to 50pick — what to grant, and what to never grant

Written 2026-07-31, after a session that stalled on three access walls. This file exists so
nobody has to rediscover which wall is which.

**There are TWO different kinds of block, and they look identical from the outside.**

| | Symptom | Fix |
|---|---|---|
| **Harness** | "Permission for this action was denied by the Claude Code auto mode classifier" | A rule in `settings.json` — §1. No credential involved. |
| **Credential** | `403`, `AccessDenied`, `gh auth login`, `not authenticated` | A real token — §2. No setting will substitute. |

Granting tokens will not fix a harness block. Changing settings will not fix a missing token.
Most wasted time comes from treating one as the other.

---

## 1 · The harness — Claude Code's own permissions

`C:\Users\Ali\.claude\settings.json` holds the permission rules. Today it carries ~70
one-off `allow` entries accumulated across projects (single `curl`s, single `node -e`
invocations) and no general rules — so an agent re-prompts for near-identical commands
forever.

### What actually got blocked on 2026-07-31

| Blocked | Verdict |
|---|---|
| `git credential fill` (reading the stored GitHub token) | 🔴 **Leave this blocked.** It reads a live secret into the transcript. The right fix is `gh auth login`, not opening the credential store. |
| `Remove-Item docs/<stale>.md` | Safe to allow, scoped to the repo. |
| `Get-ChildItem -Recurse` across `C:\` roots | Safe to allow read-only, scoped. |
| `railway run … --create` (creating an R2 bucket) | Reasonable to keep behind a prompt — it mutates cloud infrastructure. |

### 🔴 An agent cannot do this part for you — by design

Attempting to edit `settings.json` to widen its own permissions is **blocked**. That is the
correct behaviour: if an agent could grant itself access, "the agent needs permission" would
mean nothing. **Section 1 is always a human action.** Don't ask an agent to do it; it will
just burn a turn discovering the same wall.

### How to change it

- **`/permissions`** in Claude Code — interactive, and the one to prefer.
- **`/config`** — model, effort, and the default permission mode.
- Or edit `C:\Users\Ali\.claude\settings.json` by hand.

⚠️ **Put these in USER settings, not project settings.** Claude Code loads project settings
from the working directory, and sessions here run with `C:\Users\Ali` as the primary
directory — so a `.claude/settings.json` inside `C:\kipindi-main` may never load at all.
User settings always load.

Rules are `Tool(specifier)`; `:*` is a prefix wildcard. Paste-ready, merge into the existing
`permissions` object (do **not** replace the `allow` array — it already holds ~70 entries):

```jsonc
"allow": [
  // …existing entries stay…
  "Bash(npm run test:*)", "Bash(npm run qa:*)", "Bash(npm run build)",
  "Bash(npm run typecheck)", "Bash(npm run lint)", "Bash(npm install)",

  "Bash(git status:*)", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git show:*)",
  "Bash(git fetch:*)", "Bash(git branch:*)", "Bash(git pull --ff-only)",
  "Bash(git add:*)", "Bash(git commit:*)", "Bash(git push origin main)",

  "Bash(railway status:*)", "Bash(railway logs:*)", "Bash(railway variables)",
  "Bash(railway variables --json)", "Bash(railway run:*)",

  "Bash(gh auth status)", "Bash(gh secret list:*)", "Bash(gh secret set:*)",
  "Bash(gh run list:*)", "Bash(gh run view:*)"
],
"ask": [
  "Bash(railway variables --set:*)",   // mutates production config
  "Bash(railway redeploy:*)",
  "Bash(npx prisma migrate deploy:*)"
],
"deny": [
  "Bash(git credential:*)",            // never read the credential store
  "Bash(git push --force:*)",
  "Bash(git reset --hard:*)",
  "Read(.env)", "Read(.env.*)", "Read(**/.env)", "Read(**/.env.*)"
]
```

`Bash(railway ssh:*)` is already allowed in the existing list — keep it. It is the only
trustworthy way to talk to Selcom (§2.4).

### ⛔ Do not use `bypassPermissions` on this repo

It exists, and it is the wrong tool here. This is a **licensed real-money platform where
every push to `main` is a live deploy**. The prompts that cost seconds are the same ones
standing between a bad idea and 42 players' balances. Grant a wide *allowlist* instead — it
is nearly as fast and it still stops the unusual thing.

---

## 2 · The credentials — one row per wall, with exactly what to do

### 2.1 GitHub — 🔴 the blocker that matters most

Needed for: repository secrets (so the nightly backup can run), PRs, releases.

**Why it is blocked:** `gh` is **not authenticated** on this machine and there is no
`GH_TOKEN`. Git pushes work only because **Windows Credential Manager** holds the
credential — and `gh` cannot read that store. So an agent can push code but cannot touch
repository settings.

1. Create a token at **https://github.com/settings/tokens/new**
   - Note `claude-code`, expiry **30 days** (not "no expiration")
   - Classic token: tick **`repo`** — that is enough for repository secrets
   - Fine-grained instead: repo `alisheib/kipindi`, permissions **Secrets: Read and write**,
     **Contents: Read and write**, **Actions: Read and write**
2. In **your own terminal**, not through the agent:

   ```
   gh auth login --with-token
   ```

   Paste the token at the blank prompt, press Enter. Verify with `gh auth status`.

🔴 **Paste it into the terminal, never into the chat.** Anything typed in chat is written
into the session transcript permanently. That is how this project already accumulated a
rotation debt (see §4).

### 2.2 Cloudflare R2 — needed to create the backup bucket

**Why it is blocked:** the R2 token already in Railway is **bucket-scoped to `50pick-kyc`**.
Proven, not assumed — `ListBuckets` returns `AccessDenied`, and a bucket-scoped token cannot
`CreateBucket`.

Either is fine:

- **One click (recommended):** Cloudflare → R2 → **Create bucket** → `50pick-backups`.
  Then confirm with `railway run node scripts/r2-provision-backup-bucket.mjs`.
- **Or grant an account-level token:** Cloudflare → R2 → **Manage API tokens** → Create,
  permission **Admin Read & Write** (account-level, *not* scoped to one bucket). An agent can
  then run the same script with `--create`.

⚠️ The backup bucket must **not** be the KYC bucket. Backups and identity documents must not
share a blast radius — `scripts/r2-provision-backup-bucket.mjs` refuses outright if pointed
at the KYC bucket, and `backup-upload.mts` carries the same warning.

⚠️ **A separate bucket is not separate credentials.** Backups currently reuse the R2 key the
running app holds for KYC, so one leaked key still reaches both. A backup-only token is the
better end state.

### 2.3 Sentry — needed before anyone is paged

**Why it is blocked:** `SENTRY_DSN` is not set in Railway (verified 2026-07-31), so
`/api/health` correctly reports `monitoring.alerting:false`. The code is complete and proven
by `test:alerting`; only the DSN is missing. This is also a **decision**, not just a step:
setting it sends a licensed Tanzanian operator's error data off-box. Every string is scrubbed
first (phone numbers, emails, NIDA) and that scrubbing is proven on the wire, but the choice
is yours.

1. sentry.io → create project (platform **Node.js**)
2. Settings → **Client Keys (DSN)** → copy the DSN
3. `railway variables --set SENTRY_DSN=https://…` then redeploy
4. Verify: `/api/health` flips to `monitoring.alerting:true`

### 2.4 Railway — already granted

The CLI is logged in and linked to `50pick` / `production`. That is what let this session
read every variable, tail logs, and run `railway ssh`. For headless or CI use, create a
**project token** (Railway → project → Settings → Tokens) and expose it as `RAILWAY_TOKEN`.

🔴 **`railway run` ≠ `railway ssh`.** `run` executes **locally** with production's env vars
injected; `ssh` executes **inside the production container**. For anything IP-whitelisted —
Selcom above all — `run` gives a false answer. It once made the payout probe report
`USABLE RAILS: NONE — disbursement is not provisioned`, which was flatly untrue. See
`SELCOM-PAYOUT-RAILS.md`.

### 2.5 Already provisioned — no action

In Railway `production`, verified present 2026-07-31: `DATABASE_URL`, `ANTHROPIC_API_KEY`,
`POSTMARK_API_KEY`, all four Selcom `PAYMENT_*` values, `R2_*` (KYC), `AUDIT_CHAIN_SECRET`,
`SESSION_SECRET`, `OTP_PEPPER`.

---

## 3 · The seven repository secrets

Once `gh` is authenticated, the nightly backup needs these on the **repository** (the
workflow reads GitHub secrets, not Railway):

`BACKUP_SOURCE_DATABASE_URL` · `BACKUP_ENCRYPTION_KEY` · `AUDIT_CHAIN_SECRET` ·
`R2_ENDPOINT` · `R2_BACKUP_BUCKET` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY`

`.github/workflows/backup-nightly.yml` checks all seven and **fails before touching
production** if any is missing — that redness is deliberate, not a bug.

🔴 **`BACKUP_ENCRYPTION_KEY` must be generated fresh and stored in a password manager in the
same sitting.** The drill's key is **gone**: `NEXT-PLAN.md` said it was written to
`.env.backup.local`, and that file does not exist anywhere. Nothing is stranded today
because nothing was ever uploaded off-box — but a key that lives only on the machine the
database lives on is not a key, and a key that lives nowhere is worse.

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 4 · Rules that survive this session

1. **Never paste a secret into the chat.** Terminal, `railway variables --set`, or
   `gh secret set`. The transcript is permanent.
2. **Expiry on everything.** 30 days. A token an agent used once does not need to outlive
   the task.
3. **Least privilege beats convenience.** The bucket-scoped R2 token blocked an agent today —
   that is the control working, not failing. Grant the narrow thing.
4. **Outstanding rotation debt** (all predate this file, all still open): the Postgres
   password, and the credentials exposed in chat previously — Selcom API key, vendor PIN,
   Railway token. Tracked in `NEXT-PLAN.md`.
5. **Admin 2FA is OFF in production** (`DISABLE_ADMIN_TOTP` is set) and must be on before
   real money. **Do not simply unset it** — without an enrolled admin it locks Ali out of his
   own console.
6. **An agent that cannot do something should say so.** Three walls in one session were each
   one operator action wide. Naming the wall precisely is worth more than working around it,
   and working around a *credential* block by reading the credential store is not a
   workaround — it is the thing the block exists to prevent.
