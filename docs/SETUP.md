STATUS: 🟢 **LAW** — how to get 50pick running on a machine that has never seen it. Written
2026-07-31 from a working setup, not from memory. If a step here is wrong, fix it here.

# Setting up on a new machine

**50pick is LIVE at `www.50pick.tz` in TEST money mode, and every push to `main` deploys it.**
Read that sentence twice before you run anything.

---

## 0 · Read these first, in this order

| | |
|---|---|
| [`docs/README.md`](README.md) | The doc index. 42 docs, each with a status (LAW / LIVE / RECORD / OPEN / DESIGN / HISTORICAL). **From the outside, a snapshot of a Tuesday in May looks identical to a law.** |
| [`docs/NEXT-PLAN.md`](NEXT-PLAN.md) | Opens with **PICK UP HERE** — the state at the close of the last session and what to start on. |
| [`docs/MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) | The programme that finishes the platform: 52 modules, 8 gates, the laws. |
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
- **`api/dev-test/*`** (35 routes) seed wallets, markets and admins. They **404 in production** —
  enforced by `npm run test:cert-devroutes`, not by convention.

⚠️ **`npm start` is NOT the local command.** It runs `prisma migrate deploy` and the float
seeder — it is the production entrypoint. For a local production build use
`npm run build` then `npx next start`.

### Two things that will confuse you once

- **Locale is the `kp-locale` cookie**, not `?lang=`. Setting a query param renders English and
  looks like a translation bug. (`src/lib/i18n-server.ts:18`.)
- **Config caches live on `globalThis`** and survive hot-reload by design. Changing a config
  *default* needs a full dev-server restart, not a save.

---

## 4 · Environment variables

`.env.example` lists all 42. For local development you need **none of them** — the in-memory
store, console SMS and mock payments cover everything.

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
npm run test:all                          # 113 suites, the safety net
npm run test:all -- --skip responsive,motion   # …without a running server
npm run typecheck
npm run test:docs                         # every link/script/npm ref in docs/ must resolve
npm run test:orphans                      # no script may claim coverage nothing runs
npm run qa:live                           # pre-deploy check against the live site
```

⚠️ **`test:responsive` and `test:motion` need a server on `:3000`** — start the app first or they
fail on navigation and read as real regressions. `test:responsive` is thousands of browser page
loads; against a *dev* server it ran 40+ minutes without finishing. Use a production build.

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
| Swahili/Chinese page renders English | You set `?lang=`; it is the `kp-locale` cookie |
| A config default change has no effect | `globalThis` cache — restart the dev server |
| A build warning about `node:crypto` in Edge Runtime | Pre-existing, confirmed on a clean tree |
