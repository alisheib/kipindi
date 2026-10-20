# Giving an agent full access to 50pick — what to grant, and what to never grant

Written 2026-07-31, after a session that stalled on three access walls. This file exists so
nobody has to rediscover which wall is which.

**Current working rules are in [`AGENTS.md`](../AGENTS.md), especially §§4 and 9.** The machine
state recorded below is historical evidence, not permission to use a saved login. Agents
never use Ali's personal credentials. A `main` push still needs the release owner, current
branch and release-lock checks, and the complete release gates.

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
| `git credential fill` (reading the stored GitHub token) | 🔴 **Leave this blocked.** It reads a live secret into the transcript. The right fix is a separately configured service credential (§2.1), not opening the credential store. |
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
  "Bash(git add:*)", "Bash(git commit:*)", "Bash(git push origin main)", // only after AGENTS.md §4 gates

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

Needed for: an authorized Git push, PR, release or repository-secret change. A deploy key
covers Git access to its repository; it does not grant GitHub API access for PRs or secrets.

**The 2026-07-31 block:** `gh` was unauthenticated while Git could push through Windows
Credential Manager. That did not establish an agent-safe identity. A saved credential may
belong to Ali personally; a successful push is not proof that an agent may use it.

1. An authorized human provisions a **50pick-owned GitHub App installation, dedicated bot
   account, or repository-scoped SSH deploy key with write access**, limited to this
   repository and the operation at hand. Grant Contents read/write for a push through an App
   or bot; add Secrets or Actions permissions only for tasks that need them. A deploy key is
   attached directly to the repository, with "Allow write access" enabled by the human
   ([GitHub's deploy-key guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)).
   Use a short-lived token or remove a temporary deploy key after the release, not a token
   from Ali's personal account. An agent cannot create or authorize its own bot account,
   install its own deploy key, or widen its permissions.
2. The human makes that credential available through a secure local credential or process
   environment, **never chat**. Before a write, the agent verifies the service identity and
   that the Git command will use it rather than the saved personal Windows login. A read-only
   `gh auth status` can help for a bot account; a GitHub App installation token and an SSH
   deploy key have no user login to check that way. For a deploy key, pin Git to that SSH
   identity, verify repository-bound authentication, and have the human confirm write access
   in repository settings. Do not print or retrieve a token or private key.
3. If the only available credential is personal, Ali performs the push himself after the
   release owner gives him the reviewed commit and checks. The agent does not borrow his
   login, including when he offers it.

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

### 2.4 Railway — historical session access

The 2026-07-31 session had a CLI login linked to `50pick` / `production`. That is a record,
not an access grant for another agent or machine. Follow `AGENTS.md` §9's identity and
project checks before any Railway command, and never use Ali's personal login. For an agent
or CI, an authorized human can provision a **project token** (Railway → project → Settings →
Tokens) and expose it locally as `RAILWAY_TOKEN` without printing it.

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

## 3.5 · Who owns what — and the gap

🔴 **Nothing in this repo records which account owns Cloudflare.** Searched 2026-07-31: the
setup guide, the hosting status doc, every `CLOUDFLARE_*` reference, and the local `.env`
(absent). All the docs ever say is *"Ali created Cloudflare account"* (2026-07-03).

That matters more than it sounds. Behind that one login sit **`50pick.tz` DNS**, the **MX/SPF
/DKIM records that keep `ali.sheib@50pick.tz` and Postmark working**, the **KYC bucket**, and
soon the **backup bucket**. If Ali is unreachable, nobody can reach any of it — and a
recovery that needs DNS is a recovery that stops.

What *is* known, enough to confirm you are in the right account:

| | |
|---|---|
| Cloudflare account ID | `e6e5f86245721a28fea6fe1170feba12` (visible in the dashboard URL) |
| Assigned nameservers | `ollie.ns.cloudflare.com` / `yadiel.ns.cloudflare.com` |
| Zone | `50pick.tz` — 31 records, **1 proxied since 2026-08-24** (`www` only; the apex and every mail record are still DNS-only). SSL/TLS mode `Full (strict)`. Zone id `99ca5dd0799461d35c6297f34d1e04d1`. Mail records carried over from Netpoa. See `LIVE-HOSTING-STATUS.md` → EDGE POSTURE |
| R2 buckets | `50pick-kyc` (WEUR) exists; `50pick-backups` **does not** |
| Login email | ❌ **unknown — fill this in** |

⚠️ Ali runs **at least two identities** across these projects (`ali.sheib@omega-financial-solutions.com`
is the git identity; the AWARKEH Railway project sits under an Outlook account). Do not assume
one; check the account ID.

**To fill the gap:** record the owning login for Cloudflare, Railway, GitHub, Selcom and
Postmark in the table above — **account and email only, never passwords**. A password manager
holds the secrets; this file holds the map to them.

## 4 · Rules that survive this session

1. **Never paste a secret into the chat.** A human enters a project credential through a
   secure local flow; an agent never prints it. The transcript is permanent.
2. **Time-box access.** Set token expiry to 30 days or less; remove a temporary repository
   deploy key after the release. A credential an agent used once does not need to outlive
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
