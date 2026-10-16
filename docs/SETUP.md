STATUS: 🟢 **LAW** — how to get 50pick running on a machine that has never seen it. Written
2026-07-31 from a working setup, not from memory. If a step here is wrong, fix it here.

# Setting up on a new machine

**50pick is LIVE at `www.50pick.tz` with real money, and every push to `main` deploys it.**
Read that sentence twice before you run anything. (It is in LIVE money mode — `NODE_ENV=production` with `TEST_FUNDING`
unset, read off the live service 2026-09-09: `docs/RULES.md`, and `isLiveMoneyMode()` in
`src/lib/server/runtime-mode.ts`. This line said "TEST money mode" until 2026-10-16.)

---

## 0 · Read these first, in this order

| | |
|---|---|
| [`docs/README.md`](README.md) | The doc index: every doc, each with a status (LAW / LIVE / RECORD / OPEN / DESIGN / HISTORICAL). **From the outside, a snapshot of a Tuesday in May looks identical to a law.** |
| [`docs/NEXT-PLAN.md`](NEXT-PLAN.md) | Opens with **PICK UP HERE** — the state at the close of the last session and what to start on. |
| [`docs/MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) | The programme that finishes the platform: its modules, its gates, the laws. |
| [`CLAUDE.md`](../CLAUDE.md) | How the codebase works. ⚠️ Its top ~140 lines are an accumulated status log and parts are stale — trust `NEXT-PLAN.md` over it for *current state*, and CLAUDE.md for *how things work*. |
| [`docs/AGENT-ACCESS.md`](AGENT-ACCESS.md) | Credentials, and the two kinds of block that look identical. |

---

## 1 · Prerequisites

- **Node 24.** CI pins `node-version: 24`, local development runs 24.x, and `package.json`
  declares `"engines": { "node": "24.x" }` so the Railway builder installs the same major in
  production. ⛔ Do not lower any of the three: under Node 22 `tsx` dual-instantiates modules
  and the seam-patching suites (`late-bet`, `settlement-gate`) fail falsely. Check with `node -v`.
- **npm** (no `packageManager` field; do not switch to pnpm/yarn).
- **git**, and a GitHub account with push access to `alisheib/kipindi`.
- **Railway CLI** — `npm i -g @railway/cli`, then `railway login`, then `railway link` and pick
  project **50pick** / environment **production**.
- **GitHub CLI** (only for repository secrets) — `gh auth login`.
- **PowerShell or Git Bash.** Both work; the repo is developed on Windows.

Optional, only for the browser suites:

- **Playwright browsers** — `npx playwright install chromium`. Without them `test:responsive`,
  `test:motion` and every `qa:*` suite fail on launch, not on a real defect.

---

## 2 · Clone and install

```bash
git clone https://github.com/alisheib/kipindi.git
cd kipindi
npm install
```

🔴 **`npm install` again after every `git pull`.** A stale `node_modules` makes `test:backup`
fail with `TS2307: Cannot find module 'pg'`, which reads exactly like a broken suite and is not.
This cost real hours on 2026-07-31.

---

## 3 · Run it locally — no database needed

The app boots against an **in-memory store** when `DATABASE_URL` is empty. This is the normal
way to develop; you do **not** need Postgres, and you should **not** point local development at
production.

```powershell
$env:DATABASE_URL=""; npm run dev      # PowerShell
```
```bash
DATABASE_URL="" npm run dev            # bash
```

Then open `http://localhost:3000`.

- **`/auth/demo`** logs you in as a seeded demo player instantly. Use it; do not hand-craft
  sessions.
- **`/api/dev-test/*`** seed wallets, markets and admins — the full set is the folders under
  `src/app/api/dev-test/`, and the ones worth knowing are below. They **404 in production** (each route checks
  `NODE_ENV`, and the edge blocks the whole tree) — enforced by `npm run test:cert-devroutes`, not by convention.

⚠️ **`npm start` is NOT the local command.** It runs `prisma migrate deploy` before `next start` — it is the
production entrypoint. For a local production build use `npm run build` then `npx next start`.

### The dev helpers worth knowing

| Helper | What it does |
|---|---|
| `GET /auth/demo` | Creates (or reuses) a fixed demo player with a funded wallet and signs you in. `?email=unverified` or `?email=none` lands on the other sides of the withdrawal's email step |
| `POST /api/dev-test/promote-admin` `{ phone }` | Makes a registered phone ADMIN (audited `dev_test.admin_promotion`), for admin pages without `ADMIN_BOOTSTRAP_PHONES` |
| `POST /api/dev-test/seed-wallet` `{ phone, amount }` | Adds to that wallet's balance directly — no deposit row, no ledger entry, capped per call |
| `POST /api/dev-test/seed-real-markets` | Creates a handful of REAL (non-demo) live markets across categories, so the board, a market page and its similar-markets rail have something to show (demo markets are kept off the board); skips a title that exists |
| `POST /api/dev-test/seed-player-portfolio` `{ markets?, stake? }` | Gives the SIGNED-IN player (sign in at `/auth/demo` first) a position in every status, through the real service: buy, cash out, resolve, void |
| `POST /api/dev-test/updown-seed` `{ durations?, feedProvider? }` | Stands up running Up & Down chains through the same service calls the console makes. Pass `feedProvider: "mock-bars"` for DECISIVE local settles: the default `mock` quotes one constant price per symbol, so every round voids on no move |
| `POST /api/dev-test/updown-advance` | Drives every RUNNING chain across one boundary through the scheduler's own `runDueChainTransitions`, instead of waiting for it. It moves no money by itself: a boundary with no confirmed price leaves the round pending, as in production |
| `GET /api/dev-test/last-otp?phone=…` or `?email=…` | The last code sent to that person: `phone` reads the SMS facade's in-memory ring (any provider), `email` the captured outbox, which needs `EMAIL_OUTBOX_CAPTURE=1` on the server |

### Two things that will confuse you once

- **Locale is the `kp-locale` cookie**, not `?lang=`. A query param is ignored, and with no cookie a page renders in
  Swahili, the default (`DEFAULT_LOCALE` in `src/lib/i18n-dict.ts`, read by `getServerT` in `src/lib/i18n-server.ts`).
- **Config caches live on `globalThis`** and survive hot-reload by design. Changing a config
  *default* needs a full dev-server restart, not a save.

---

## 4 · Environment variables

`.env.example` names the variables, each with a comment, and [`RAILWAY.md`](../RAILWAY.md) says what each one does
in production. For local development you need **none of them** — the in-memory store, console SMS and mock payments
cover everything.

Real values live in **Railway**, never in the repo:

```bash
railway variables                 # names + values for the linked service
railway variables --json
```

🔴 **Never copy production credentials into a local `.env`.** There is no local `.env` in this
repo and there should not be. `.gitignore` blocks `.env*`, and `docs/AGENT-ACCESS.md` records why.

---

## 5 · Running against production — the trap that matters

| Command | Runs where | Use for |
|---|---|---|
| `railway run <cmd>` | **your laptop**, with production's env injected | scripts that only need env vars |
| `railway ssh "<cmd>"` | **inside the production container** | anything touching the DB or an IP-whitelisted API |

🔴 **`railway run` will lie to you about Selcom.** Selcom whitelists the production container's
IP, so from your laptop every rail returns `403 … Source IP not whitelisted (4032)`. On
2026-07-31 this made the payout probe report `USABLE RAILS: NONE — disbursement is not
provisioned` about a **live, working** account. The probe now refuses to conclude from the wrong
host, but the general rule stands.

🔴 **`DATABASE_URL` is the INTERNAL host** (`postgres.railway.internal`) and only resolves inside
Railway. Anything running outside — GitHub Actions, your laptop — needs the Postgres service's
`DATABASE_PUBLIC_URL`. This broke the nightly backup with `getaddrinfo ENOTFOUND`.

```bash
railway ssh "node scripts/admin-2fa-readiness.mjs"   # ✅ correct shape
```

---

## 6 · The commands worth knowing

```bash
npm run test:all                          # typecheck + every test:* suite in package.json; the run prints its count
npm run test:all -- --skip responsive,motion   # …without a running server
npm run typecheck
npm run test:docs                         # every link/script/npm ref in docs/ must resolve
npm run test:orphans                      # no script may claim coverage nothing runs
npm run qa:live                           # the pre-deploy browser gauntlet — localhost:3009 unless BASE says otherwise
```

⚠️ **`test:responsive` and `test:motion` need a server on `:3000`** — start the app first or they
fail on navigation and read as real regressions. `test:responsive` is thousands of browser page
loads; against a *dev* server it ran 40+ minutes without finishing. Use a production build.

**The runnable inventory is `package.json`** — its `test:*`, `qa:*`, `e2e:*`, `ops:*`, `red:*` and `verify:*`
scripts — **plus `scripts/orphan-allowlist.json`**, the by-hand drivers no gate runs (a list that may only shrink).
Trust those two, not a prose table of scripts; count them there when you need a number.

### `qa:live` — the pre-deploy gauntlet

`scripts/pre-deploy-live-check.mjs` fails on any console, page or 5xx error, a real Next error overlay, a broken
internal link, horizontal overflow at phone width, a clipped date segment or a mis-handled date. `npm run predeploy`
runs it last, after the build, and always against localhost: it passes no `BASE`.

**Locally**, against an in-memory dev server on the gauntlet's default port:

```bash
# terminal 1 — no DATABASE_URL (the memory store), throwaway secrets, the console's two-step check off
DATABASE_URL="" SESSION_SECRET="$(openssl rand -hex 32)" OTP_PEPPER="$(openssl rand -hex 16)" \
  DISABLE_ADMIN_TOTP=true npx next dev -p 3009
# terminal 2
npm run qa:live
```

- `DISABLE_ADMIN_TOTP=true` lets the local server mint a staff preview pass, so section [E2] can first prove that its
  checks SEE the journey shell when it is served. Without it that control prints a SKIP — never a pass.
- The signed-in sections sign in through `/auth/demo` (above).
- Run it on a WARM server: the gauntlet warms the heaviest routes first, but a just-restarted instance can still race.

**Against production** — `BASE=https://www.50pick.tz npm run qa:live` — the run is read-only except section [E3]:

- [E3] signs the QA player `mobile01` in through the real form ONLY when `QA_SIGNED_IN=mobile01` is set as well and
  `QA_MOBILE01_PASSWORD` is in `.env.qa.local` at the checkout root. Otherwise it prints NOT MEASURED — neither a pass
  nor a failure — and never touches the form.
- ⛔ Set it only with the owner's go-ahead, and only while no other drive uses `mobile01`: the sign-in writes a session
  that ENDS any other `mobile01` session. It is ONE attempt — a failed sign-in stops the run (exit 1) and is never
  retried, because each wrong try counts toward the account's lockout.
- The demo sign-in section ([F]) is skipped: `/auth/demo` does not exist in production.

**Ops tools** (`ops:*` never runs in `test:all` — they need live credentials):

```bash
railway ssh "node scripts/selcom-probe.mjs"            # which payout rails are enabled
railway ssh "node scripts/admin-2fa-readiness.mjs"     # who has admin 2FA enrolled
railway run node scripts/backup-verify-offbox.mjs      # is a backup actually off-box
```

---

## 7 · Before you push

**Every push to `main` is a live deploy of a licensed real-money platform.**

1. `git fetch` first. A session once sat **150 commits stale** and rebuilt shipped work twice.
2. Work on a branch. Run the gates. Stop for Ali on anything money-related.
3. Money paths need the money suite green **plus a stated reason the change is safe**:
   `test:money-invariants` `test:fee-model` `test:settlement-gate` `test:concurrency` `e2e:money`.
4. `npm run test:all`, `npm run test:docs`, `npm run test:orphans`.
5. Update the doc that owns the subject **in the same commit** — and the §9 status board in
   `MODULE-CERTIFICATION-PROGRAM.md` if you certified anything.

**Parallel sessions are normal here.** More than one Claude session may hold this repo at once.
Use a git worktree per lane (each with its own `node_modules`), and `git fetch` before analysing
anything.

---

## 8 · If something looks broken, check these first

| Symptom | Almost certainly |
|---|---|
| `TS2307: Cannot find module 'pg'` in `test:backup` | Stale `node_modules` → `npm install` |
| `test:responsive` / `test:motion` fail instantly | No server on `:3000` |
| Playwright "browser not found" | `npx playwright install chromium` |
| Selcom says nothing is provisioned | You used `railway run`; use `railway ssh` |
| `getaddrinfo ENOTFOUND postgres.railway.internal` | Internal host used from outside Railway |
| A page ignores `?lang=` and opens in Swahili | The language is the `kp-locale` cookie, and Swahili is the default |
| A config default change has no effect | `globalThis` cache — restart the dev server |
| A build warning about `node:crypto` in Edge Runtime | Pre-existing, confirmed on a clean tree |
