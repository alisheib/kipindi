# 50pick — the working rules for every agent and engineer

**This is the one file that says how to work on 50pick.** Claude Code reads it through `CLAUDE.md`, which does nothing
but import it; Codex and every other coding agent read it directly; so does a human engineer. Every other file that
addresses an agent is either a pointer to this one or a dated record of a past session. If anything you read elsewhere
disagrees with this file about **how to work**, this file wins and the other file is a defect to fix in the same commit.

What is **true about the product** is not here: it lives in the owning documents (§3), and the **current state** —
what is live, what is next, who owns what — lives in [`docs/NEXT-PLAN.md`](docs/NEXT-PLAN.md). This file never carries a
status line, a count or a date that will go stale.

## 1. What 50pick is

- A Tanzania-licensed, **real-money**, pari-mutuel prediction market: players pick YES or NO on a question, and the
  winners share the pool less the commission. Money correctness and provability are the whole job.
- The product is always **50pick**. `kipindi` is a legacy infrastructure name — the repository, the Railway host and
  similar — never the game's name on anything a player or a partner sees.
- Live at **https://www.50pick.tz** (`50pick.tz` and `kipindi-production.up.railway.app` serve the same deployment).
  Production is the Railway project `50pick`; **every push to `main` deploys it** (§4).
- Next.js 16.4 (App Router, Turbopack) · React 19 · TypeScript · Tailwind 3 · Prisma 6 on PostgreSQL · Playwright.
  One dark-royal theme (there is no light mode). Three languages: English, Swahili, Chinese.
- **The repository is public.** Nothing secret is ever committed, pasted or printed (§9).
- The owner is **Ali** (Dar es Salaam). He is not technical: lead on architecture and design, explain in plain
  English, and ask him only for the decisions that are his — money, compliance, anything outward-facing or
  irreversible, and anything that needs his own sign-in. He reviews the live site, not your machine. Screenshots go to
  him when he asks for them.

## 2. Start of every session

1. Ask the shell where you are — a path is a fact about a machine, never copy one from a document (§10):
   `hostname && pwd && git rev-parse --show-toplevel && git branch --show-current && git status --short`
2. `git fetch`, then read **THE BOARD** at the top of [`docs/NEXT-PLAN.md`](docs/NEXT-PLAN.md). Each ▶ row is a live
   programme; its document's **§0 RESUME AT** says what to do next (for the Vodacom journey:
   [`docs/VODACOM-PLAN.md`](docs/VODACOM-PLAN.md)). A document that is not on the board is a record of finished work.
   Do not start a new programme — ask Ali.
3. A machine that has never run 50pick: [`docs/SETUP.md`](docs/SETUP.md). Every document, with a status:
   [`docs/README.md`](docs/README.md). After a pull that changed dependencies or the schema: `npm ci` and
   `npx prisma generate`.

## 3. Where the truth lives

| Subject | Owner |
|---|---|
| What is live, what is next, who is the release owner | [`docs/NEXT-PLAN.md`](docs/NEXT-PLAN.md) (the board) and each programme's §0 |
| Money: commission, taxes, stake and deposit bounds, limits, failure messages | [`docs/RULES.md`](docs/RULES.md); the arithmetic is [`src/lib/payout.ts`](src/lib/payout.ts) |
| Anything visual | [`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md) (its §0 is the filing law); values in [`src/app/globals.css`](src/app/globals.css) |
| Every redirect and gate | [`docs/FLOWS.md`](docs/FLOWS.md) |
| Data model, stores, locks | [`docs/DATA-LAYER.md`](docs/DATA-LAYER.md) · [`prisma/schema.prisma`](prisma/schema.prisma) |
| Owner rulings and compliance positions | [`docs/COMPLIANCE-DECISIONS.md`](docs/COMPLIANCE-DECISIONS.md) · identity: [`docs/IDENTITY-POLICY.md`](docs/IDENTITY-POLICY.md) |
| Payments (Selcom) | [`docs/SELCOM-API-DIGEST.md`](docs/SELCOM-API-DIGEST.md) · [`docs/SELCOM-PAYOUT-RAILS.md`](docs/SELCOM-PAYOUT-RAILS.md) |
| SMS · email | [`docs/BLACKBALL-SMS.md`](docs/BLACKBALL-SMS.md) · [`docs/EMAIL.md`](docs/EMAIL.md) (templates: [`src/lib/server/comms-registry.ts`](src/lib/server/comms-registry.ts)) |
| Production, Railway, environment variables | [`RAILWAY.md`](RAILWAY.md) · [`docs/RAILWAY-LIVE.md`](docs/RAILWAY-LIVE.md) |
| Backups and restores | [`docs/BACKUP-RUNBOOK.md`](docs/BACKUP-RUNBOOK.md) |
| What an agent may be granted, and how | [`docs/AGENT-ACCESS.md`](docs/AGENT-ACCESS.md) |
| Code that is unmounted on purpose | [`docs/SHELVED.md`](docs/SHELVED.md) |
| Every other document, with its status | [`docs/README.md`](docs/README.md) |

⛔ **Link to the owner; never copy a rate, a count, a path or a status into another file.** A fact written twice will
disagree with itself, and this project has paid for that repeatedly (a fee formula, a theme, a branch name, a repo's
visibility). A change updates the document that owns its subject in the same commit; nobody starts a new tracker file.

## 4. Who changes `main`, and how a release goes out

- **Every push to `main` is a live deploy of a real-money platform** (Railway runs `prisma migrate deploy && next start`).
  There is no staging.
- **One release owner at a time pushes `main`.** Ali chooses it; the board records it. Every other session works on its
  own branch, pushes only that branch, and never pushes `main` "to help". Nobody merges a stale branch: a branch whose
  work is not on the board is a record.
- Before any commit: `git branch --show-current`. Stage files **by name** (`git add <paths>`); never `git add -A` or
  `git add .` — another session's half-finished files would ride along. Commit a type and its users together. Never
  force-push `main`. On a Windows command line, never put a `#` comment after a command.
- **Each change:** its own guard and a mutation proof (the guard fails when the change is undone); every script that
  reads a changed file — `test:*`, and the `qa:*` and `red:*` ones too, whose plants pin exact lines (grep `scripts/`
  for the path); both stores (memory and PostgreSQL) for any money or data path.
- **Each push:** typecheck; `next build` at the exact commit; local `qa:live` (a build is not a render). Then, after
  Railway deploys: `?dpl=<sha>` on www, apex and the Railway host; `/api/health` (database reachable and migrated);
  `npm run qa:chunks-prod -- --origin <url>` on both public origins; production `qa:live`
  (`BASE=https://www.50pick.tz`); and the changed pages looked at in a real browser.
- **A money change:** `npm run test:all` and `e2e:money`, `e2e:fault` and `e2e:card` on a throwaway PostgreSQL before
  the push.
- **Each session close:** `test:all` with the database suites; classic parity against a baseline at live `main`, every
  difference named; real-browser tiles of what changed, read one by one.
- **Never waive a failed check, never invent an approval, a result or an elapsed period.** Say what ran, what passed,
  what failed and what was not run. A failing check that predates your change is still reported, with its proof.

## 5. Production data and schema

- A schema change reaches production **only through the deploy's own `prisma migrate deploy`**. Write the migration's
  SQL by hand, additive and re-runnable (`IF NOT EXISTS`); apply it with `prisma migrate deploy` on a throwaway
  PostgreSQL that holds production's exact migration set; and run `npm run verify:backup-schema`, because the backup
  builds its schema from the live database and a migration is the one change that can break recovery
  ([`docs/BACKUP-RUNBOOK.md`](docs/BACKUP-RUNBOOK.md)). Never hand-apply SQL to production; never run
  `prisma migrate dev` against anything but a throwaway database.
- Production runs one container. In-memory state is wiped by every deploy, and some safeguards count only their own
  process (the bet admission queue; the rate limits whenever Redis is absent) — see
  [`docs/RAILWAY-LIVE.md`](docs/RAILWAY-LIVE.md) before adding a second.
- When the old code and the new cannot both run against the new schema, use the **zero-overlap cutover**
  ([`docs/qa/s9-zero-overlap-release-20261015.md`](docs/qa/s9-zero-overlap-release-20261015.md)): the app stopped, a
  stopped-writer backup, the deploy, the read-back. The outage needs Ali's approval.
- Read production only through the Postgres public proxy, in a read-only session
  (`default_transaction_read_only=on`), printing counts and names — never rows, references or personal data. Nobody
  writes production data by hand.
- Measure infrastructure state live — the selected deployment, its settings, the schema — rather than trusting a
  comment or a document about it ([`docs/RAILWAY-LIVE.md`](docs/RAILWAY-LIVE.md) prints the command beside each figure).

## 6. Money, honesty and compliance

- Taxes are levied only on 50pick's commission, never on a player. A winner is never paid below stake. Rates freeze
  per market at creation — money paths read `ratesFor(market)`, never live config. Wallet lock before market lock;
  money writes claim their row with a conditional update; every money mutation is audited. (Detail:
  [`docs/RULES.md`](docs/RULES.md), [`docs/DATA-LAYER.md`](docs/DATA-LAYER.md).)
- A money path is done only when a committed test proves all five: **conservation** (in = out + house), **no negative
  balance** even under concurrency, **idempotent** (a replayed key or webhook applies once), **audited**, and
  **race-safe**. The in-memory store's lock is a single-process mutex, so cross-instance safety is proven only on real
  PostgreSQL (`scripts/load/README.md`: the disposable cluster and the cross-instance harnesses).
- **Never fabricate:** money, prices, chart history, officers, signatures, elapsed windows or live data. If it cannot
  be computed, show nothing.
- Never `throw` at boot for a non-fatal condition — a thrown boot is the whole site down. Alarm at boot; enforce at
  runtime.
- Player surfaces never narrate internal operations. Every player string exists in English, Swahili and Chinese.
  Responsible-gambling words are plain and direct.

## 7. UI work

- [`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md) is the only design source and the design is frozen behind
  `test:design-frozen`. Use the UI components in `src/components/ui` and `src/components/admin`; never hand-roll a
  duplicate of one — extend the component instead. No emoji in UI copy unless asked. Money is always formatted
  (`formatTzs`). Read DESIGN_AUTHORITY §0 before creating any design document, and never build from the superseded teal
  kit under `50PICK/design_handoff_prediction_market_kit/` — trust the tokens in `globals.css`, not a token's name.
- **Responsiveness is a rule:** 320 · 360 · 768 · 1280 · 1920, in English, Swahili and Chinese — no horizontal
  overflow, nothing clipped, tap targets of at least 40px. Run `npm run test:responsive` against a running server and
  **read the screenshots**: a green suite is not a readable screen. Content cut off inside a container passes the
  automatic overflow check and shows only in the picture; Swahili is the longest language, so check it at 360 first.
- Shoot every state that matters — empty, loading, error, full, long text and big numbers — and the overlays at 360
  and 1280. Set the language with the `kp-locale` cookie on the browser context and read `<html lang>` back before
  capturing; a sweep in the wrong language looks like evidence. Prefer a production build (`next build && next start`)
  for CSS fidelity.
- A consequential action confirms in a kit dialog, never the browser's `confirm()`. Enter acts only where it is
  pressed, and Enter in a form never skips its confirm (`test:enter-where-pressed`, `test:implicit-submit`).

## 8. Checks that mean something

- **Assert the value, not the symbol.** Count calls in statement position, not mentions; read an element's state, not
  prose near it; scope every selector to the thing under test; refuse to continue when the premise is absent.
- A guard and its red proof can agree and both be wrong — prove the thing you found is the thing you meant.
- Never regex a CSS colour (the tokens are `oklch()`); let the browser convert it.
- Write files with an editor, never through a shell string: shells eat backslashes and backticks.
- The runnable inventory is `package.json` (`test:*`, `qa:*`, `e2e:*`, `red:*`). Derive a count; never quote one.

## 9. Credentials and access

- Never print, paste or commit a secret — environment values, tokens, passwords, connection strings. Local test
  secrets live in `.env.qa.local` at the checkout root (git-ignored): load them into the process, assert only that they
  are present.
- Never use Ali's personal credentials, even when they are offered in chat: ask him to act himself, and to change them.
- The QA player `mobile01` signs in on production only when Ali authorizes that run (`QA_SIGNED_IN=mobile01`): one
  attempt, never retried — each wrong try counts toward the account's lockout and ends any other `mobile01` session.
- Before any Railway command: `railway whoami` must read `alisheib07@gmail.com` and `railway status` the project
  `50pick` — a machine can hold other people's projects too.
- A refused action is either a harness rule or a missing credential; they look alike and need different fixes:
  [`docs/AGENT-ACCESS.md`](docs/AGENT-ACCESS.md). An agent never widens its own permissions.

## 10. Machines and the local toolchain

| `hostname` | Long-lived checkout | Notes |
|---|---|---|
| `OMEGA-COMPILE01` | `F:\kipindi-main` | `F:` is a spinning disk: build, test and run servers from SSD worktrees under `C:\50pick-ssd\` (each with its own `npm ci`; `TEMP=C:\50pick-ssd\tmp`). `embedded-postgres` needs `msvcp140.dll`, `vcruntime140.dll` and `vcruntime140_1.dll` copied into its `native/bin`. |
| `Ali-Blade15` | `C:\kipindi-main` | `F:` does not exist there. |

- One `next dev` per worktree. A `.next/dev` left from older source answers "HMR hash mismatch": stop the server,
  unlink the junctions inside `.next/dev`, delete it, restart.
- A worktree's `node_modules` or `.next/dev` may be a **junction into another tree**. Before deleting any folder, unlink
  every junction in it (the link only — `rmdir` on the link) or the delete follows it into the other tree.
- Git Bash rewrites an environment value that starts with `/` into a Windows path (`ONLY=/positions` arrives mangled;
  pass `ONLY=positions`). Windows PowerShell 5.1's `ConvertFrom-Json` wraps a JSON array in another array — parse CLI
  JSON in Node.
- Next.js 16.4 differs from older versions: read `node_modules/next/dist/docs/` before relying on a remembered API.
  `next dev` is told not to write its own block into this file (`agentRules: false` in `next.config.ts`).
- Stop only the processes you started; check a port before you use it.

## 11. Tools, and the files that are not rules

- **Claude Code:** `CLAUDE.md` imports this file and holds nothing else. The skills in `.claude/skills/` are short
  pointers back here. `.claude/settings.json` holds read-only command permissions.
- **Codex and other agents:** this file is the whole brief; there is no separate one.
- **A cloud session** cannot push to GitHub (its sandbox refuses). It delivers a bundle instead —
  `git bundle create <name>.bundle origin/main..HEAD` — which the release owner imports with
  `git fetch <path-to-bundle> HEAD` and `git merge --ff-only FETCH_HEAD`, then releases as in §4.
- **Records, not rules:** `docs/SESSION-PROMPT-*.md`, `docs/qa/claude-vodacom-continuation-20261014.md`,
  `plans/house-bots/HANDOFF-CODEX-2026-10-15.md`, `docs/PARALLEL-SESSION-COORDINATION.md` and every other dated prompt
  or handoff. They say what a past session was told; where they disagree with this file, this file wins.
- `test:agent-rules` keeps this arrangement from rotting: one rules file, `CLAUDE.md` an import, the skills pointers,
  and none of the contradictions this file replaced.
