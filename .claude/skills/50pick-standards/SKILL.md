---
name: 50pick-standards
description: How we build 50pick — the always-on working standards for ANY 50pick (kipindi) session. Read at the START of every session, and before any UI, responsiveness, visual, testing, i18n, money, or copy work. Covers the quality bar, the 9-role gate, UI-kit & design discipline, the responsiveness matrix, visual-verification discipline, testing discipline, money/compliance invariants, copy rules, and the verify-after-push protocol. Complements the `50pick-audit` skill (safe DB/ops) — this one is evergreen; that one is the launch-remediation playbook.
---

# 50pick — how we build (working standards & preferences)

This is **how we think and plan** on 50pick, distilled so every session starts with the
same bar and the same method. It is an INDEX + the distilled rules; the deep sources of
truth are linked and win on any conflict. Keep this skill in sync when the way we work
changes; never let it drift from the docs it points at (drift is itself a defect — audit
C8/C9/C3 were all "two definitions of one truth, nothing binding them").

## 0. Product identity (get this right first)
- **The product/game is `50pick`.** `kipindi` is only the repo/project name — never call
  the game kipindi in any surface, copy, or asset.
- 50pick is a **Tanzania-licensed, real-money pari-mutuel** prediction market. Players pick
  **YES or NO**; pools settle from official sources. Money correctness and provability are
  the whole job.
- **One theme: dark royal.** No light mode, no theme toggle (DESIGN_AUTHORITY B3).
- **Trilingual: EN · SW · ZH** (admin: EN + SW). Parity is enforced; no untranslated keys.

## 1. The bar — "Perfect · 0 issues"
A screen/flow/feature is **DONE only when ALL are true** (from `docs/perfection-plan.md` §0):
1. **Correct** — does what it claims, verified end-to-end against real state, not just tests.
2. **Money-safe** — no path can mint/lose/double-pay/strand money; every mutation audited;
   invariants hold under concurrency.
3. **Compliant** — POCA/GBT/TRA/FATF/PDPA met; never fabricates data/signatures/state; RG-safe.
4. **Consistent** — uses the kit; no divergence; gold-discipline held.
5. **Responsive** — pixel-clean **360 → 768 → 1280 → 1920**, mobile-first, 0 horizontal
   overflow, tap targets ≥ 40px.
6. **Accessible** — WCAG 2.1 AA: keyboard-operable, focus-visible, labelled, contrast ≥ 4.5:1,
   reduced-motion honoured, screen-reader coherent.
7. **Trilingual** — EN+SW+ZH render with no truncation/clipping/untranslated keys.
8. **Fast** — usable on a low-end Android over 2G; no console errors/warnings; no layout shift.
9. **Verified visually** — a **human-read screenshot** exists for every state × width × locale
   that matters. A green automated suite is NOT proof — you must LOOK.

### The 9-role acceptance gate (think as all nine, every task)
Nothing ships until every lens signs off: **architect · integration engineer · routing/nav ·
software engineer · UI/UX engineer · graphic designer · art evaluator · QA · player+shop-owner.**
The full "perfect for this role" table is in `docs/perfection-plan.md` §0. The compact
mental model: **integration engineer + UI/UX engineer + architect + manager + player, all at
once** (the "five-lens mindset").

## 2. Method — how we work a task
- **Understand before touching.** Read the authoritative doc + the real code path. Do not
  infer from a convention you "expect" — asserting absence is a positive claim needing
  positive evidence (audit H3 was wrong for three versions by trusting a grep).
- **Plan → phase → exit gate → sign-off.** Break work into stages; each stage: do → test →
  verify (technical + logical + visual + live) → update the tracker → commit → push.
- **Single source of truth.** One definition per fact; when a rule governs a value, put the
  rule beside the value (design tokens carry their own invariant comments). Never leave two
  copies that can drift.
- **Fix-as-you-go.** Anything unclean you encounter — dead code, divergent copies, a stale
  comment, a missing guard — fix it in place (or log it if out of scope). Leave every file
  better than you found it.
- **Match the surrounding code** — its comment density, naming, idiom. New code should read
  like it was always there.

## 3. UI & design discipline
- **UI-kit only.** Build from the kit (`src/components/ui/*`, `src/components/admin/*`).
  Never hand-roll a one-off that duplicates a primitive — **extend the kit**, then use it
  everywhere. Same thing done two ways is a defect (perfection-plan §9.1 lists the primitives
  to unify: one `<Modal>`, one `<ConfirmModal>`, one attestation rail, one config factory,
  one money-format rule).
- **Design invariants are law** — `docs/DESIGN_AUTHORITY.md`:
  - **Palette is royal 268** (NOT teal 215). `src/app/globals.css` tokens are authoritative.
  - **YES = green, NO = rose — untouchable.** Never invert, re-hue, or reuse for non-money.
  - **Single dark-royal theme.** 0 light selectors, 0 `next-themes`, 0 `dark:` variants.
  - **Claret = editorial only; aqua ≤ 8% coverage, never semantic.**
  - **Gold discipline** — player: earned-money / money-in only; admin: resolved-seal only.
  - ⚠️ Never build from the superseded teal kit `50PICK/design_handoff_prediction_market_kit/`.
- **MarketCards are the iconic surface** — audit them at every breakpoint: uniform heights,
  aligned buttons, no clipping, or the board fails.
- **Money is always formatted** via `formatTzs` / `formatTzsCompact` — never raw `toLocaleString`.

## 4. Responsiveness & visual verification (we LOOK, always)
The two rules that catch the most bugs. Full detail: **`references/responsiveness-and-visual.md`.**
- **Mobile-first, matrix 360 / 768 / 1280 / 1920** (the tool sweeps 320→1920). 0 horizontal
  overflow; nothing off-screen; tap targets ≥ 40px; SW/ZH must not truncate or clip.
- **Tool:** `scripts/responsive-audit.mjs` (`npm run test:responsive`) — needs a live server on
  `:3000`. Screenshots land in `.50pick-shots/` and **must be READ**.
- **A green suite ≠ a readable screen.** The "clipped-not-scrolled" bug class passes the
  automated no-overflow check and only shows in the image. Read every shot.
- **Screenshot against a real running server** — prefer `next build && next start` (the dev
  server can serve stale CSS → false overflow). Run the `ui-regression` visual gate on a
  **fresh, unseeded** server (a seeded store fires `navigator.vibrate` → false console-error
  fails).
- **Every meaningful (route × state × width × locale)** deserves a shot: empty · loading ·
  error · populated · edge (long text / big numbers / SW+ZH) · the feature's special states.
  Re-run the popup/overlay sweep at 360 + 1280 each cycle.

## 5. Testing discipline
Full detail: **`references/testing-and-verify.md`.**
- **Before any push:** `npx tsc --noEmit` · `npm run build` · the relevant `test:*`. The
  build is the deploy gate.
- **`npm run test:all`** runs the whole suite (auto-discovers every `test:*`); it must stay
  green on a **fresh store**. `test:responsive` is the one allowed to fail locally (it needs a
  live `:3000` server) — that's not a code regression.
- **`npm run test:integrity`** — the content-integrity guard: fails if a superseded/removed
  claim returns to a current-truth surface (15% tax, FR locale, "bilingual EN/SW", flat-9% fee,
  light theme/next-themes, committed `db-check.*`, teal-kit mandate). Keep it green — it's how
  "docs say things that aren't true" stays fixed.
- **Money paths need real Postgres.** The in-memory `withLock` is a single-process mutex, so
  multi-instance defects (double-spend, ledger/audit forks) only show on real PG. Use the
  local disposable cluster + the load harness (`scripts/load/`, e.g. `s10` wallet, `s11` audit
  chain). See the `50pick-audit` skill §3.
- **Money-invariant bar** for every money path: conservation (in = out + house) · no negative
  balance · idempotent · audit-entry-exists · holds under concurrency.

### ⛔ 5b. ASSERT THE VALUE, NOT THE SYMBOL (added 2026-08-03, session 18)
"Assert the call site, not the symbol" was already law here and it was **not enough**. In one
day, four checks passed while the thing they named was broken — each asserting something
*adjacent* to the truth:
- a guard proved `outcome` was computed once, early, and passed to both consumers — all true
  while the variable silently dropped `VOID` (**E-56**);
- a guard counted `pushOnly(` occurrences; prefixing one with `void 0 &&` killed a loss
  notification while leaving every character of the name in place (**E-57**);
- a live check asked the **page** for `[role="switch"]` and matched a control in the chrome
  while the panel it was testing plainly read *"Push isn't available on this deployment yet."*;
- a deploy-wait loop grepped `railway logs` for `"Ready in"` and matched the **previous** boot.

**The rules that generalise:**
1. Count calls in **statement position** (`/^\s*fn\(/m`), never mentions — and assert
   `mentions === statements`, so a short-circuited call is a failure.
2. Assert what a variable **carries** (the literal `=== "VOID"` inside its declaration), not
   that it is passed.
3. Where a component renders **different controls per state**, the control's *presence* is the
   state. Read the element and its `aria-checked`; never parse prose. `/on\b/` matches
   "turn this **off** any time".
4. **Scope every selector to the thing under test** — the row, the card, the panel, the dialog.
   A page-wide match cannot tell *"my control"* from *"a control"*. This also cost a near-miss
   on a money write: a void driver's page-wide confirm matched **"Resolve YES"** on the card
   behind the modal, and only the product's scrim stopped it.
5. **Refuse to continue when the premise is absent.** No control → throw, don't click into
   nothing and report green.
6. Every one of these was caught by **looking at a screenshot**, never by a suite. A green
   suite is a pre-flight check, not evidence.
7. ⛔ **NEVER REGEX A CSS COLOUR** (added 2026-08-05, session 27). This design system's tokens
   are `oklch()`, and Chrome hands `oklch(0.98 0.01 270)` straight back from
   `getComputedStyle` — so the usual `[\d.]+` scrape reads **lightness, chroma and hue as R,
   G and B**. A contrast probe written that way scored a bright primary button at **1.24:1**
   against a dark card and reported three failures that were entirely its own. Let the browser
   convert: paint the value into a 1×1 canvas and read the pixel back. The same rule covers
   `backgroundImage` — a kit button painted by a **gradient** has a transparent
   `backgroundColor`, so "has no background" is false about it.

## 6. Money & compliance invariants (never break)
Authoritative detail: `50pick-audit` skill §6 + `docs/DATA-LAYER.md` + `docs/FLOWS.md`.
- **Lock order is wallet → market.** Refund/bonus/referral helpers take the wallet lock and run
  OUTSIDE the market lock.
- **Claim the row** — money writes use conditional updates (`updateMany WHERE status = the
  status you read`) so a race can't double-spend or pocket cash.
- **Fee = `min(commissionRate·pool, feeCeilingRate·smaller)`**, frozen per poll; a winning bet is
  never paid below stake. Single source: `src/lib/payout.ts`.
- **Taxes are only ever on 50pick's commission**, never a player's money.
- **Never `throw` at boot** on a non-fatal condition — enforce controls at runtime, alarm at
  boot (a thrown `instrumentation.register()` = HTTP 500 everywhere = prod down).
- **Never fabricate** money, signatures, officers, windows, or live data. If we can't compute
  it, we show nothing — not a placeholder number presented as fact.
- **RG on every money path**; POCA §16 (`getConflictedResolutionAllowed()` false in prod).
- The **audit chain** is DB-authoritative & fork-proof (advisory lock + `@@unique([prevHash])` +
  canonical payload hashing); money/compliance events must be durably chained.

## 7. Copy discipline
- **Player surfaces never narrate internal ops.** A settled market says "Settled" — not the
  payout/commission/settlement mechanics. Internal detail stays in admin/audit.
- **Trilingual, always** (EN+SW+ZH). One status-label lexicon; no ad-hoc status strings
  (perfection-plan §9.2 catalogues the drift to avoid).
- Keep every current-truth surface factual (see `test:integrity`).

## 8. Verify-after-push protocol (every push is a LIVE deploy)
`git push origin main` auto-deploys `prisma migrate deploy && … && next start` to the LIVE
money DB. There is no staging. After every push verify:
- **Technical** — `tsc` + `test:*` green.
- **Logical** — the change does what it claims.
- **Visual** — screenshot the live page and LOOK.
- **Live-DB** — prod HTTP 200 + `railway logs -s 50pick` shows a clean boot.
✅ **Verify against `https://50pick.tz`** — the live app (re-confirmed 2026-07-20:
`server: railway-hikari`, `x-powered-by: Next.js`). `www.50pick.tz` and
`kipindi-production.up.railway.app` serve the same instance. The old "50pick.tz parks on an
Apache page" warning was true on 2026-07-16 and was fixed by the Netpoa→Cloudflare cutover on
2026-07-17 — **do not re-raise it.**

⚠️ `NEXT_PUBLIC_APP_URL` (`https://www.50pick.tz`) is load-bearing for MONEY — it builds the
Selcom card `redirect_url`/`cancel_url` and the email-confirmation link. The code default in
`src/lib/app-url.ts` is the custom domain so a missing env var degrades safely rather than
stranding a card deposit on a railway.app host.

Migrations: additive where possible, tested on the local PG first, prod gets them via the
deploy — never by hand.

## 8b. Working alongside a PARALLEL session (added 2026-07-30, rewritten 2026-08-03)

Two Claude sessions work this repo at once. They cannot see each other, so every rule below
exists because the collision is **silent** — you find out by losing work, not by an error.

**Layout — TWO MACHINES sharing only `origin` (corrected 2026-08-03):**

| Machine | Note |
|---|---|
| **laptop A** — `F:\kipindi-main` | the `F:\…` paths throughout `docs/LIVE-QA-CAMPAIGN.md`. Holds the `railway` CLI link — run `railway …` from here. **A single tree**: the `kipindi-kyc` / `kipindi-liveqa` / `kipindi-updown` worktrees were merged and removed |
| **laptop B** — added 2026-07-31 | its own clone. Ran campaign sessions 8–16 alone |

⛔ **THE OLD "one clone, two worktrees" MODEL IS GONE.** It described laptop A before 2026-08-03.
`git worktree list` now shows one tree, and the `rmdir`-the-junction and shared-`node_modules`
advice below applies only if someone deliberately re-creates a worktree.

⭐ **HOW TO TELL WHETHER THE OTHER SESSION IS STILL RUNNING — get this wrong and you collide.**
A finished session leaves a `§6b` handoff block in `docs/LIVE-QA-CAMPAIGN.md`. **Commits with no
handoff block mean a session is IN FLIGHT.** Before assuming the tree is yours:

    git fetch --all --prune
    git log --since="today" --format="%ci %h %s" origin/main   # recent pushes?
    grep -n "session " docs/LIVE-QA-CAMPAIGN.md | head          # newest handoff = last one CLOSED

On 2026-08-03 laptop A opened while laptop B was mid-session — B had pushed 7 minutes earlier and
shipped two more findings during the cleanup. The tell was a commit newer than the newest handoff.

- ⛔ **Never `git checkout` in another tree you did not create.** Worktrees share ONE `.git`, so
  switching a branch there yanks files out from under a session mid-edit. Run
  `git branch --show-current` before every commit; `git worktree list` shows who is where.
- ⛔ **Never push `main` to "help".** Every push to `main` is a live deploy (§8). Push your own
  branch — merging is Ali's call.
- ⚠️ **`main` moves under you.** The other session merges to `main` regularly. `git fetch` and
  check `git rev-list --left-right --count origin/main...HEAD` before assuming anything. Merge
  `main` into your branch **while you still have the context**, not at hand-off, and read the
  overlap first: `comm -12` the two `--name-only` lists against the merge base.
- ⚠️ **A merge can create a coupling neither side can see alone.** Real case, this date: one
  session made a slow lifecycle pass *visible* (an overrun alert); the other put a slow chore
  *inside* that pass. Neither is a bug; together they need a note. After merging a shared file,
  ask what the two changes do to **each other** — not just whether git resolved the text.

**Shared resources — the three that actually bite:**
- **Ports.** :3000 is usually taken. Check with
  `netstat -ano | grep LISTENING | grep :3000`, use another port, and kill **only your own PID**
  (`Get-CimInstance Win32_Process -Filter "ProcessId=N"` prints the command line — it tells you
  whose it is).
- **`node_modules`.** A worktree may be a *junction* to the other tree's install. **Turbopack
  refuses a junction pointing outside the project root**, so `next build` fails there — and
  `--webpack` is not a fallback (this codebase's `node:crypto` imports break under it). Do a real
  `npm ci` in the worktree, and remove the junction with **cmd `rmdir`** (the link only).
  ⛔ `rm -rf node_modules` would delete the OTHER session's install while it is in use.
- **The database.** One instance. A test run that seeds is visible to the other session's app —
  say what you are about to write before you write it.

## 9. Known gotchas (carry forward — from perfection-plan §6)
- **Dev in-memory store is SYNC** — `db.user.*` etc. return values (not Promises) in-memory
  while tsc sees the async Prisma types. Wrap `await Promise.resolve(db.x()).catch(...)` or it
  crashes only at runtime.
- **ui-regression false-fails on a seeded store** — always run it on a fresh, unseeded server;
  confirm a single node PID on :3000 (Windows orphans the child: `taskkill //F //IM node.exe`).
- **Clipped-not-scrolled overflow passes the auto-check** — READ the screenshot; fix admin
  grids with `grid-cols-[minmax(0,1fr)_…]`.
- **First cold-compile of a new page ~30s (Turbopack)** — bump Playwright `goto` timeout to 40s.
- **Testing overrides default OFF in prod** — solo-resolution + payment kill-switches.

## 10. Authoritative docs (sources of truth — this skill only distils them)
- `docs/perfection-plan.md` — the 0-issue plan, 9-role gate, phased method, matrices, risk register.
- `docs/DESIGN_AUTHORITY.md` — design invariants (palette, YES/NO, theme, gold, a11y floor).
- `docs/design-master-brief.md` — palette rationale / ground-truth sRGB.
- `docs/perfection-plan.md` — the launch-gate remediation tracker (current stage).
- `docs/DATA-LAYER.md` · `docs/FLOWS.md` — the data model + money/state flows.
- `docs/AI-POLL-SOURCES.md` — AI poll generation is bound to the trusted-source registry
  (`getGeneratableCategories()`): the model can only generate categories/domains the operator
  has enabled, enforced before + during generation. Adding a source under the wrong category is
  the usual "why won't it generate/publish" trap.
- `docs/design-system/v2-2026-07-27/07-provenance/CHANGELOG.md` — UI-kit rollout status.
- `.claude/skills/50pick-audit/SKILL.md` — safe DB/migration/Railway ops + money invariants + verify protocol.
- `CLAUDE.md` — architecture overview + the ACTIVE-WORK banner.
