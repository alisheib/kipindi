# MARKETING CAMPAIGN & CONTACTS SETUP — work order and tracker

**STATUS — 🟢 BUILDING. 8/52 units ✅ LIVE (U1–U8), 7/25 defects. 52 units · defects D1–D25 · 46 owner decisions taken on
Ali's delegation · 10 legal questions, each shipping with a safe default that IS built.**

> ⚠️ **THIS FILE IS BOTH THE PLAN AND THE PROGRESS TRACKER.** Any session, on any machine, learns where
> the programme stands by reading §0 (RESUME AT) and §1 (status board) — and nothing else. `npm run
> test:marketing-setup-plan` refuses a ✅ that cannot show a real commit, a measured before → after, a
> guard key that resolves to a script that exists **with a red control beside it**, and a live date.

| | |
|---|---|
| **Opened** | 2026-09-16 (session S0 — planning only, no product code; committed 2026-09-17) |
| **Owner instruction** | Ali, 2026-09-16: *"a page for contacts, with all its features, bulk and normal contact import, duplication detection, everything perfect, progress bars, loading systems, rendering perfection. Also campaign for broadcast SMS sending page… for Tanzanian numbers, the right formats, input validation"* · *"take decisions based on what you think is perfect and compatible with our platform… make it fully functional, a perfect version, you decide"* · *"save the plan and the prompt and push it, naming it the marketing campaign and contacts setup"* · *"make it perfectly working for 50pick, perfect design and logic"* |
| **Scope** | `/admin/contacts` (the address book: single + bulk import, duplicate detection, pre-flight, determinate progress, export) and `/admin/campaigns` (broadcast SMS: compose, audience, confirm, send, results) — plus the permission layer neither can lawfully exist without |
| **Repo / branch** | `F:\kipindi-main`, branch `main`. ⛔ Push to `main` is a LIVE deploy. ⛔ Never the House Bots checkout (`F:\kipindi-house-bots`), which runs its own programme in parallel |
| **Live state rule** | The broadcast surface ships **built and CLOSED**. Dispatch refuses until a Gaming Board advertising approval is recorded (§5.1). Contacts, compose, preview, estimate and test-send-to-self all work meanwhile |
| **Evidence** | `.qa-shots/marketing-setup/<unit>/…` (gitignored). ⛔ A `shots/…png` path may only be written into a doc in the commit that also commits the PNG |
| **Tracker guard** | `npm run test:marketing-setup-plan` · red control `npm run red:marketing-setup-plan` (the same file, `--prove-red`, plants in memory) |
| **Cadence** | **TWO units per session** (Ali's standing cadence). 52 units → 26 sessions |
| **Priority** | The Mobile Visual Plan keeps `NEXT-PLAN.md` ▶ 0 START HERE. This programme is ▶ 0a and runs when Ali says so, on any machine |

---

## §0 — RESUME AT

1. Run `npm run test:marketing-setup-plan`. If it fails, the board is lying — fix the board before any code.
2. Read the fenced block below, then §1 (status board), then the two units named in ▶ NEXT (§9).
3. `git log --oneline -8` — a commit newer than ✔ LAST SESSION means another session is IN FLIGHT. Stop and ask.
4. Work per §11. Close per §0a step 6.

```
▶ NEXT: U9 and U10 — S6's pair. The previous unit is closed; see ✔ LAST SESSION.

  U9 · THE GATE INSIDE THE LOOP. U7 built the gate; nothing calls it yet. §5.6 fixes the order
  — suppression → consent → self-exclusion → cooling-off → harm markers → age → frequency cap
  → window → approval → dispatch — and requires it to run IMMEDIATELY BEFORE DISPATCH, per
  recipient, so somebody who opts out in minute two does not receive minute four's message.
  ⛔ A refusal is `skipped`, never `failed`.
  ⚠️ VERIFY THE PREMISE FIRST, because this plan has been wrong about it before: there is no
  send loop yet. Check what U35/U42 actually leave behind before designing against them.

  U10 · COOLING-OFF AND HARM MARKERS as a STANDING predicate (D9), never `isLockedOut` — which
  lifts itself when the chosen period elapses, so a 24-hour exclusion would be marketable 25
  hours later. U7 already refuses `minimum_served` for that reason; U10 adds the rest.
  ⛔ `selfExclusionStanding` WRITES A ROW if you ask it unguarded (`responsible-gambling.ts:90`
  → `db.responsible.upsert`). Read `db.responsible.get` FIRST and only ask the predicate when a
  row exists. U7 shipped that defect and fixed it the same session; do not reintroduce it.

✔ LAST SESSION: S5, 2026-09-25 — **U8 ✅ LIVE on `80a8b0a4`. 8/52 units, 7/25 defects.**
  ⭐ THE DECISION S4 LEFT OPEN WAS TAKEN, AND IT WAS RIGHT: a suppression row is never DELETED
  but may be SUPERSEDED. `liftedAt` + `liftedReason`, expand-only, one migration, generated
  offline and proven FROM AN EMPTY DATABASE on real PostgreSQL 18.3 — 84 migrations, both
  columns nullable, a SECOND lift touching 0 rows, the row still present after it. §17's "no
  delete" assertions all stand, and new ones say a lift never removes a row.

  🔴 AND THE DECISION SURFACED A SECOND FALSE SUCCESS, POINTING THE OTHER WAY, THAT THIS PLAN
  DID NOT NAME. `suppression.create` is an upsert with `update: {}`. Once a row can be lifted,
  `stop → start again → stop again` returns through it, and an EMPTY update block hands back
  the LIFTED row untouched — telling somebody they will never be marketed again while the
  suppression stays lifted and the next campaign sends to them. ⛔ So the update CLEARS the
  lift, and §17's `update: {}` assertion was REPLACED rather than softened: it now says what it
  always meant — the block must not touch `createdAt`, and it must re-arm.

  🔴 AND A THIRD, FOUND BY RUNNING U7's SUITE RATHER THAN BY REASONING. The memory twin first
  asked `r.liftedAt === null`, which is FALSE for a row carrying no lift field at all — so a
  suppression written by any caller that had not been updated read as LIFTED, and a person who
  said stop came back MARKETABLE. It failed OPEN, the one direction the law does not forgive.
  It is now `!r.liftedAt`. ⭐ AND THE REASON `tsc` COULD NOT HAVE CAUGHT IT IS WORTH KNOWING
  REPO-WIDE: `tsconfig.json` includes `scripts/**/*.ts`, and every suite in this repo is
  `.mts` — so **no test file here is typechecked**. A DAL type change breaks fixtures silently.

  ⭐ THE RED CONTROL CAUGHT THE GUARD LYING, TWICE, AND BOTH ARE NOW CASES:
  · the expiry plant reached nothing, because the assertion called the SHIPPED resolver rather
    than the object under test — case 1 was green against a page whose links expire;
  · the fail-closed fixture STOPPED BEING LEGACY: its number came from the tag's LENGTH, so
    every red case shared one row and `create`'s idempotence re-armed it before the case that
    needed it. A fixture that stops being the shape it is named for is a control that has
    quietly stopped controlling.

  ⭐ AND READING THE SCREENSHOTS FOUND WHAT NO ASSERTION DID: the invalid-token refusal passed
  `optout.body` — "tap once to stop marketing messages" — onto a page that renders NO BUTTON.
  Instructing an action the page does not offer, on the one page whose whole job is never to
  make a false promise. Fixed, and now asserted.

  ✔ U8's numbers: `test:marketing-optout` 54 assertions · `red:marketing-optout` 8/8, each on
  its own named assertion, with the shipped page green in §0 first and the model faithful in
  §0b · dal-parity 1461 → 1482 · `red:dal-parity` 29 → 35 · the visual drive 47/47 at 1280, 360
  and 360+reduced-motion.

✔ BEFORE IT: S4, 2026-09-25 — U7 ✅ LIVE, U8 store half. **7/52 units, 7/25 defects.**
  🔴 U7 SHIPPED WITH A DEFECT AND WAS FIXED IN THE SAME SESSION: `selfExclusionStanding` →
  `getRgSettings` ends in `db.responsible.upsert(fresh)` (`responsible-gambling.ts:90`), so
  ASKING THE GATE A QUESTION WROTE A ROW — 150,000 ResponsibleGambling rows per campaign,
  created by deciding NOT to message people.
  ⭐ AND THE TRAP U7 EXISTS TO SURVIVE: this platform stores phone numbers in TWO formats.
  `User.phoneE164` is `+255…` (`tzPhone`, `validators.ts:32-37`); the marketing key is bare
  `255…` (`toMsisdn255`). Unequal for EVERY input. `userPhoneKeyFor` is the bridge.

✔ BEFORE IT: S2, 2026-09-25 — U3 and U4 ✅ LIVE. The GSM-7 table came out of the server module
  and the gateway now delegates to it; the operator's budget is 111 rather than 160.

✔ BEFORE IT: S1, 2026-09-25 — U1 and U2 ✅ LIVE. **Five premises this plan was written on turned
  out to be false and are corrected in the document, not worked around.** ⭐ The habit that found
  most of it: audit the INSTRUMENT, not only the code.

✔ AND BEFORE THAT: S0b (the SMS rail sealed) and S0 (this document and its three doors).

◐ HALF-DONE: nothing. U1–U8 are ✅ LIVE and re-measured on production.

⚠️ ENVIRONMENT — CORRECTED THIS SESSION, AND THE OLD NOTE WAS TOO NARROW:
  ⛔ **`next dev` CANNOT RUN IN A JUNCTIONED WORKTREE EITHER**, not only `next build`. Turbopack
  gives the same refusal — *"Symlink [project]/node_modules is invalid, it points out of the
  filesystem root"* — and it dies while walking the app directory, AFTER printing "Ready", so it
  looks like it started. ⭐ So a worktree lane has no local drive host of its own: photograph
  the states from a checkout with REAL `node_modules`, at your own SHA, and put it back after.
  ⛔ AND A DRIVE MUST TAKE FRESH NUMBERS EVERY RUN. `next dev` with no DATABASE_URL keeps the
  store IN THE SERVER PROCESS, so this drive's second run found the number its first run had
  already stopped and reported a page defect that was really its own fixture.
  ⚠️ `npx prisma generate` in a junctioned worktree writes the client into the SIBLING checkout
  it is junctioned to, and can fail `EPERM` on the engine DLL when that sibling has it open.

⚠ A FINDING FOR ALI, NOT A DEFECT — §6 SAYS IT IS NOT THIS PROGRAMME'S TO TAKE:
  ⭐ **The opt-out page's loudest controls are "Ingia" and "Jisajili" — sign in and register.**
  `/s/<token>` carries the standard public shell, so a person who received a marketing SMS and
  tapped "stop" lands on a page whose two most prominent buttons invite them to JOIN, with the
  product's tab bar under it. Every promise U8 makes is kept and nothing is obstructed, but a
  page that exists so somebody can leave should probably not upsell them while they do it.
  Changing it means a route group or a conditional in the root layout — a design-system
  decision, under the design freeze. ⛔ Not taken unilaterally; Ali's call.

⚠️ ONE PROMISE THE LIVE DRIVE COULD NOT PROVE, STATED RATHER THAN IMPLIED: `/s` being excluded
  from Google Analytics is NOT verifiable from production HTML — the tag is opt-in (PDPA, no
  legitimate-interests ground), so the measurement id is absent from `/s/` AND from `/` alike,
  and "absent on both" discriminates nothing. It is proven by `test:google-tag` (67 assertions,
  including a look-alike control that `/settings` and `/support` still report) and by the
  source-level assertion in `test:marketing-optout`. ⛔ Do not write it up as a live proof.

? OPEN OWNER ITEMS (each has a safe default that is BUILT — §4a): OQ1–OQ10, unchanged.
  ⛔ OQ4 IS STILL A TRAP: the marketing footer carries the Board's 0800110051 while
  support-config publishes 0800 11 0011, and `test:campaign-compose` §12 ASSERTS THEY DIFFER.

⚠ TRAPS — each cost someone a session somewhere:
  ⛔ `test:red-anchors` counts UNDECLARED harnesses with `===` against a ceiling of 65. A new red
     harness must either declare anchors or prove red IN MEMORY, and must contain NO write-call
     token — not even in a comment. Baseline on clean main: **3098 passed / 4 failed, 68 vs 65**;
     after this session **3111 / 4**, still 68 vs 65. ⛔ Do not claim or bump it.
  ⛔ **EDITING A FILE IS EXACTLY WHEN A RED ANCHOR ROTS.** This session broke two of
     `red:dal-parity`'s, on its own edits, and they were silently uninjectable until the red
     control was RUN. ⭐ `npm run test:red-anchors` after touching any file an anchor quotes.
  ⛔ `test:docs` fails on any `npm run <name>` or `scripts/<file>.<ext>` in `docs/*.md` that does
     not exist. THIS DOCUMENT NAMES SUITES BY KEY ONLY, never with the words "npm run".
  ⛔ `test:route-census` globs `page.tsx` from disk: a NEW CLIENT-FACING ROUTE CANNOT SHIP
     without a ruling in `PLAYER-QUERY-CAMPAIGN.md` §4. It caught `/s/[token]`.
  ⛔ `test:google-tag` §2's excluded list is HAND-WRITTEN — a new excluded prefix must be added
     there too, with a look-alike control (`/s` is two characters; `/settings` must still report).
  ⛔ A `curl` 200 is not proof a BROWSER reaches a page. Check reachability with a browser.
  ⛔ Visual drives keep `HeadlessChrome` in the UA or `/api/pv` counts them as real visitors.
  ⛔ `git commit --only <paths>`, and new files must be `git add`ed BY NAME first — `--only`
     refuses a path git does not yet know. ⛔ Never `git add -A`.
  ⛔ THE TRUNK MOVES UNDER YOU. `origin/main` advanced twice during this session; pull before
     you start and before every push, and re-run your suites AFTER the merge, not before it.
```

---

## §0a — THE SESSION PROMPT (copy-paste, any PC, no memory required)

> Paste everything between the lines into a fresh session in `F:\kipindi-main`.

---

You are continuing the **MARKETING CAMPAIGN & CONTACTS SETUP** programme for 50pick.

**1 · Get the truth before you touch anything.**
```
cd F:\kipindi-main
git status --short
git branch --show-current          # expect: main
git pull --ff-only
git log --oneline -8
npm run test:marketing-setup-plan   # the tracker cannot lie; if it fails, fix the board first
```
⚠️ **OTHER SESSIONS ARE WORKING IN THIS REPO AT THE SAME TIME, ON THEIR OWN PROGRAMMES.** So:
`git pull --ff-only` before you start and again before every push; `git commit --only <paths>` and ⛔
**never `git add -A`** — files you did not touch belong to someone else; and ⚠️ **the checkout may be on
another branch, or carry their uncommitted work.** Check `git branch --show-current` and
`git status --short` FIRST. If it is not on `main`, or their edits are in the tree, ⛔ do not switch the
branch and do not stash — work in your own worktree instead (`git worktree add <dir> origin/main
--detach`), commit there and push `HEAD:main`. ⛔ Do not remove a worktree with `--force` in this repo: it
has deleted `node_modules/.bin` through the junction before (if `npm run` then says *"tsx is not
recognized"*, run `npm install`; `node scripts/<file>.mts` works meanwhile).

⭐ **PUSH YOUR WORK LIVE AS YOU GO — one unit, one commit, one push.** Do not hold a branch of finished
units to merge later: this repo's trunk moves under you and other sessions are pushing to it. Each unit
lands on `main`, deploys, and is re-measured live before its row is ticked (§11.4). A unit that is not
pushed is not done.

The planner and the progress tracker are ONE file: `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`.
§0 is where we are, §1 is the board, §9 is the work, §10 is the order. Nothing else — not your memory,
not a summary, not another document — decides what is done. If `git log` shows a commit newer than §0's
✔ LAST SESSION, another session is in flight: **stop and ask Ali**.

**2 · Read, in this order.** `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md` §0 → §1 → **§3a and §3b
(what the SMS rail actually does now, and what the vendor is — these replace premises the plan was
written on)** → §5 (hard rules) → §6 (what you may not change) → the two units named in ▶ NEXT, in §9.
Then `docs/BLACKBALL-SMS.md` §1 and `CLAUDE.md`. ⛔ Do not read the whole `docs/` tree; this file is the
contract.

**3 · Say the plan back.** Before writing code, state in one message: the two units, the guard each one
gets, the RED control that proves that guard, and what you will measure. If a unit will not fit in half a
session, SPLIT IT FIRST and write the split into §2 — do not start and leave it half-built.

**4 · Work, exactly this way, one unit at a time.**
- Write the guard **before** the feature, and prove it RED against the real defect (in-memory plants, or
  anchors in `scripts/anchors/`), then green. ⭐ The question for every guard: *"would this still pass if
  the feature were absent?"* If yes, the guard is decoration.
- Two stores or it does not exist: every new `db.*` namespace lands in `src/lib/server/store.ts` AND
  `src/lib/server/prisma-dal.ts`, with **named** types (never an inline object literal in a DAL
  signature), and `test:dal-parity` gets a new section with its own planted-key control.
- Migrations are expand-only, and an **enum value ships in its own migration one commit before anything
  writes it** (Postgres refuses to use a value added in the same transaction).
- Swahili is the DEFAULT player language: every player-facing string is Swahili first. The admin console
  is English chrome with a Swahili gloss on headings only, and ⛔ a `sw` gloss is copied verbatim from
  text already shipped — never invented.
- Run the unit's own suites, then `npm run predeploy`. New suites are NOT auto-added to `predeploy` —
  add the key to the chain in `package.json` in the same commit, or it never gates anything.
- Visual units: drive the states listed on the unit at **1280×800** and **360×780**, plus
  `prefers-reduced-motion: reduce`, keep `HeadlessChrome` in the UA, and **open the screenshots and read
  them**. A green assertion is not a picture.
- Commit with `git commit --only <paths>` (⛔ never `git add -A`). The commit that ships a unit ALSO
  rewrites §0, ticks §1, appends §2, and updates the `docs/NEXT-PLAN.md` ▶ 0a counts.
- Push, wait for the deploy, then re-measure on `www.50pick.tz` and confirm you are on the new build via
  `data-dpl-id`. ⭐ Prove it by DISCRIMINATION — a check that passes before and after proves nothing.
  Only then may the row read ✅ with today's date.

**5 · Stop and ask Ali ONLY for these.** Everything else is already decided in §4 — decide and proceed.
- Any of the ten legal questions in §4a moving from "safe default" to "we may now do X" (Gaming Board
  approval, PDPA registration, the helpline number, the published §4 promise).
- Spending real money: any live send beyond the ledger cap in §11.4, or a balance top-up.
- Anything that would send a real marketing SMS to a real player for the first time.
- A change to `tzPhone`, `isLockedOut`, the money rails, or anything in §6's must-not-change column.

**6 · Close cleanly.** Rewrite §0's fenced block (▶ NEXT, ✔ LAST SESSION, ◐ HALF-DONE, ⚠ TRAPS you hit),
tick §1, append a §2 row, update the ▶ 0a counts in `docs/NEXT-PLAN.md`, run
`npm run test:marketing-setup-plan` and `npm run test:tracker-hygiene`, push, and end with:
**"We're done here. Run the prompt in a new session."**

---

## §1 — STATUS BOARD

**Legend:** ⬜ not started · 🟡 in progress · 🔵 shipped (commit exists, not re-measured live) · ✅ verified
live · ⏸ held (reason required).

⛔ A row may only claim what it can show. ✅ needs: a commit SHA that exists, a measured `before → after`,
a Guard key that resolves to a script on disk, `yes` plus the backticked `red:` key that proves it in the RED column, and a live date.

| Unit | Kind | Status | Session | Commit | Before → After (measured) | Guard | RED | Live ✅ (date) · notes |
|---|---|---|---|---|---|---|---|---|
| U1 | pure | ✅ | S1 | c0552156 | 4 malformed numbers billed as send attempts, one of them 16 digits → refused `BAD_MSISDN`, no row, no request | `test:phone-normalize` | yes · `red:phone-normalize` | 2026-09-25 · live on `934f8d80`: pasting `00255712345678` into /auth/register carries `712345678`, ⛔ not the pre-fix `255712345` |
| U2 | pure | ✅ | S1 | db44ebf3 | no operator map at all, and the table drafted for it had 5 of 19 rows wrong → TCRA v1.16, seven verdicts, 064 refused, two formatter copies collapsed to one | `test:tz-msisdn` | yes · `red:tz-msisdn` | 2026-09-25 · live on `db44ebf3`: the moved formatter groups 3-3-3 from its new home at 1280 and 360, and the deploy building at all is the client-graph proof |
| U3 | pure | ✅ | S2 | ccc32526 | no segment arithmetic anywhere and the only GSM-7 table locked inside a server module → one pure table, PACKED segments, the gateway delegating to it | `test:campaign-compose` | yes · `red:campaign-compose` | 2026-09-25 · live on `ccc32526`. The delegation is proven by EXECUTION — `test:otp-delivery` and `test:sms-cost-guard` drive the real send path through `smsCodingFor`. ⛔ Biller reconciliation is U52 |
| U4 | pure | ✅ | S2 | b760fefe | no sender identity and no RG footer in any SMS, and a body-only quote would be 49 septets short → footer computed, counted and un-removable; operator budget 111, not 160 | `test:campaign-compose` | yes · `red:campaign-compose` | 2026-09-25 · live on `b760fefe`; the U2 drive re-run green on it, so the new modules did not break the client bundle |
| U5 | guard | ✅ | S3 | 64d6bc05 | a 15-section helpline guard with NO red control at all, and a product half already built → 4/4 mutations caught each on its own assertion | `test:support-contact` | yes · `red:support-contact` | 2026-09-25 · live on `64d6bc05`: every helpline-LABELLED link on /legal/responsible-gambling dials the pinned 0800110011, while the support desk legitimately differs. ⛔ D6 stays ⬜ — its substance is OQ4 |
| U6 | data | ✅ | S3b | 6429f86f | no consent ledger and no SMS suppression list anywhere, and `marketingOptIn` a bare boolean with no channel, wording, evidence or history → two append-only stores in BOTH DALs with named types, the 82nd migration generated offline and APPLIED on real PostgreSQL 18.3 (10/10, two controls), dal-parity 1380 → 1440 | `test:dal-parity` · `test:marketing-consent-ledger` | yes · `red:dal-parity` (24/24) · `red:marketing-consent-ledger` (4/4) | 2026-09-25 · live on `32067c92`: production starts `prisma migrate deploy && next start`, so serving AT that SHA is the migration having applied to the live database. 7/7 on the drive, three of them controls — and ⭐ the Swahili sentence the ledger stores VERBATIM is the sentence /auth/register really shows |
| U7 | engine | ✅ | S4 | e14e4204 + b60dc492 | nothing asked whether a number may be marketed at all, and a gate written the obvious way would have found NO player: `User.phoneE164` is `+255…` while the marketing key is bare `255…`, unequal for every input → one ordered gate, suppression first, with the bridge pinned in both directions and four mutually exclusive outcomes in one run | `test:marketing-consent` | yes · `red:marketing-consent` (4/4) | 2026-09-25 · live on `b60dc492`. ⚠️ The gate has no HTTP surface until U42, so its behaviour is proven by EXECUTION (15 assertions, 5/5 red) rather than by a live drive — stated plainly rather than dressed up as one. The deploy landing IS the build proof, and the U6 drive re-ran green on it |
| U8 | visual | ✅ | S4 + S5 | 5942332f + 80a8b0a4 | the resubscribe button U8 promises COULD NOT HAVE WORKED — suppression rows are never deleted and U7's gate asks suppression FIRST, so "start them again" would have reported a success while the row refused for ever → a row is never DELETED but may be SUPERSEDED (`liftedAt`), one expand-only migration proven from an EMPTY database on real PostgreSQL 18.3, and stop → start → stop proven in one run with the GATE asked after every step | `test:marketing-optout` · `test:dal-parity` §17/§18 | yes · `red:marketing-optout` (8/8) · `red:dal-parity` (35/35) | 2026-09-25 · live on `80a8b0a4`: production starts `prisma migrate deploy && next start`, so serving AT that SHA is the 84th migration having applied to the live database. The production drive is 14/14 and REFUSED to report until it reached the SHA — `noindex` proven by DISCRIMINATION (`/s/<token>` answers `noindex, nofollow` while `/legal/responsible-gambling` answers `index, follow`), and a real signed-out browser LANDS on `/s/` while `/wallet` is sent to `/auth/login`, so the no-login check can fail. ⭐ Six states driven at **1280 and 360**, plus `prefers-reduced-motion: reduce`, and the screenshots OPENED AND READ — 47/47, and reading them found a defect no assertion had: the refusal told the reader to "tap once to stop" on a page that renders NO BUTTON. ⚠️ **The token-bearing states are driven against a local `next dev`, not production, and that is stated rather than dressed up:** nothing mints a token until U42, and the dev-test seed route correctly 404s in production. What production proves is that the page serves, refuses a bad token with no false success, and is NOT sent to sign in. |
| U9 | guard | ⬜ | — | — | — | `test:marketing-consent` | — | gate INSIDE the loop |
| U10 | engine | ⬜ | — | — | — | `test:rg-doors` | — | D9 standing, not lockout |
| U11 | engine | ⬜ | — | — | — | `test:marketing-consent` | — | 18+ |
| U12 | docs | ⬜ | — | — | — | `test:privacy-notice` | — | D12 published promise |
| U13 | engine | ⬜ | — | — | — | `test:marketing-window` | — | quiet hours |
| U14 | engine | ⬜ | — | — | — | `test:marketing-consent` | — | frequency cap |
| U15 | guard | ⬜ | — | — | — | `test:marketing-engine` | — | D15 one send path |
| U16 | data | ⬜ | — | — | — | `test:retention` | — | erasure reaches it |
| U17 | visual | ⬜ | — | — | — | `test:rbac` | — | five doors |
| U18 | data | ⬜ | — | — | — | `test:dal-parity` | — | contact book |
| U19 | guard | ⬜ | — | — | — | `test:read-tiers` | — | masked everywhere |
| U20 | visual | ⬜ | — | — | — | `test:contacts-page` | — | list + search |
| U21 | visual | ⬜ | — | — | — | `test:filter-language` | — | filters |
| U22 | visual | ⬜ | — | — | — | `test:contacts-page` | — | add / edit |
| U23 | visual | ⬜ | — | — | — | `test:contacts-page` | — | bulk |
| U24 | engine | ⬜ | — | — | — | `test:contacts-audience` | — | ONE resolver |
| U25 | pure | ⬜ | — | — | — | `test:contacts-import` | — | CSV |
| U26 | pure | ⬜ | — | — | — | `test:contacts-import` | — | vCard |
| U27 | guard | ⬜ | — | — | — | `test:contacts-boundary` | — | XLSX server-only |
| U28 | pure | ⬜ | — | — | — | `test:contacts-import` | — | one field list |
| U29 | data | ⬜ | — | — | — | `test:dal-parity` | — | staging |
| U30 | visual | ⬜ | — | — | — | `test:contacts-import` | — | pre-flight |
| U31 | engine | ⬜ | — | — | — | `test:contacts-import` | — | decide() |
| U32 | visual | ⬜ | — | — | — | `test:contacts-import` | — | progress = rows |
| U33 | engine | ⬜ | — | — | — | `test:marketing-consent` | — | basis at import |
| U34 | guard | ⬜ | — | — | — | `test:contacts-export` | — | export |
| U35 | data | ⬜ | — | — | — | `test:dal-parity` | — | campaign models |
| U36 | visual | ⬜ | — | — | — | `test:admin-nav` | — | list + badge |
| U37 | visual | ⬜ | — | — | — | `test:campaign-compose` | — | composer |
| U38 | visual | ⬜ | — | — | — | `test:campaign-audience` | — | audience |
| U39 | visual | ⬜ | — | — | — | `test:read-tiers` | — | estimate |
| U40 | guard | ⬜ | — | — | — | `test:campaign-gates` | — | confirm |
| U41 | guard | ⬜ | — | — | — | `test:campaign-gates` | — | approval + 2 officers |
| U42 | engine | ⬜ | — | — | — | `test:marketing-engine` | — | enqueue |
| U43 | engine | ⬜ | — | — | — | `test:marketing-engine` | — | the slice |
| U44 | engine | ⬜ | — | — | — | `test:marketing-engine` | — | the pump |
| U45 | engine | ⬜ | — | — | — | `test:dal-parity` | — | D20 scale |
| U46 | engine | ⬜ | — | — | — | `test:sms-dlr` | — | D21 receipts |
| U47 | visual | ⬜ | — | — | — | `test:campaign-visuals` | — | live page |
| U48 | visual | ⬜ | — | — | — | `test:campaign-visuals` | — | results |
| U49 | engine | ⬜ | — | — | — | `test:sms-cost-guard` | — | D24 budget |
| U50 | guard | ⬜ | — | — | — | `test:cert-c1` | — | registry + boot |
| U51 | docs | ⬜ | — | — | — | `test:docs` | — | the operator's guide |
| U52 | live | ⬜ | — | — | — | `test:marketing-engine` | — | live drive + Seal |

**Defects this programme closes** (detail in §8):

| Id | Owner | State | One line |
|---|---|---|---|
| D1 | U1 | ✅ | `toMsisdn255("00255…")` produces a 16-digit MSISDN — latent today, live the day an importer exists |
| D2 | U1 | ✅ | no refusal at the wire boundary: a malformed number is billed as a send attempt |
| D3 | U2 | ✅ | no operator map; `tzPhone` accepts NDCs no licensee holds — ⚠️ re-scored at S1: **60 only**, not "60 and 70" (§3d), and the sharper case is 064, allocated on paper and dead on the wire |
| D4 | U3 | ✅ | no segment arithmetic anywhere; the only GSM-7 table is inside a server module |
| D5 | U4 | ✅ | no statutory RG footer and no sender identity in any SMS body |
| D6 | U5 | ⬜ | the helpline we publish (0800 11 0011) is not the one the Gaming Board's code names |
| D7 | U6 | ✅ | there is no SMS suppression list at all |
| D8 | U6 | ✅ | `marketingOptIn` is a boolean with no channel, no wording and no ledger |
| D9 | U10 | ⬜ | `isLockedOut` lifts itself when the chosen period elapses — marketing must not use it |
| D10 | U10 | ⬜ | `push-service` inherits that lift (filed here, changed only by owner ruling) |
| D11 | U11 | ⬜ | nothing checks age before an outbound marketing message |
| D12 | U12 | ⬜ | `/legal/responsible-gambling` §4 publishes three commitments with no code behind them |
| D13 | U13 | ⬜ | the published "late-night window" does not exist in code |
| D14 | U14 | ⬜ | no per-person frequency cap; uniqueness is per-campaign only |
| D15 | U15 | ⬜ | `invite-service.sendCampaign` is a second, ungated send path holding `withLock` across sends |
| D16 | U16 | ⬜ | new PII stores would sit outside erasure and retention, as `SmsMessage` already does |
| D17 | U17 | ⬜ | a new admin section is five doors; missing one renders it to the Owner alone |
| D18 | U27 | ⬜ | no admin uploader, no CSV parser, and a 1 MB server-action ceiling |
| D19 | U30 | ⬜ | a pre-flight that says "400 of these are players" is a membership oracle |
| D20 | U45 | ⬜ | `sendBatch` updates `SmsMessage` rows one at a time — 10k serial UPDATEs for a 10k campaign |
| D21 | U46 | ⬜ | the DLR route fans out to `InviteEntry` only — receipts now arrive (§3a), and a campaign recipient has nowhere to receive one |
| D22 | U35 | ⬜ | no `MARKETING` purpose: per-lane volume and cost are unreadable |
| D23 | U43 | ⬜ | the 30 s `withLock` transaction timeout makes the existing send shape unusable at scale |
| D24 | U49 | ⬜ | no campaign budget; the only spend control is a floor worth eight messages |
| D25 | U50 | ⬜ | `comms-registry.ts` states as fact that SMS is "OTP + invite campaigns" |

### §1a — Closure conditions (all nine, or it is not 🏁 CLOSED)

1. Every unit ✅ and every defect ✅.
2. `test:marketing-setup-plan` green, and its red control catches every plant.
3. `predeploy` green, and `test:all` shows no suite red that is not already red on clean `main`.
4. A real campaign has been sent on production to the ledger-capped test number and **read on a handset**.
5. The provider's own `COUNT` (portal export) equals this platform's segment arithmetic for that send.
6. Opt-out has been exercised end-to-end from the handset, and the number is suppressed on production.
7. Every one of the ten questions in §4a is either answered by Ali or carries a default he has confirmed.
8. `/legal/responsible-gambling` §4 and `/legal/privacy` are re-read and agree with what the engine does.
9. `HOW-TO-SEND-A-CAMPAIGN.md` exists and an operator who is not its author has followed it once.

---

## §2 — SESSION LOG (newest first)

| Session | Date | What happened |
|---|---|---|
| S5 | 2026-09-25 | **U8 ✅ LIVE (`80a8b0a4`) — 8/52 units.** ⭐ **The decision S4 refused to rush was taken and it was right:** a suppression row is never DELETED but may be SUPERSEDED. `liftedAt` + `liftedReason`, expand-only, proven FROM AN EMPTY DATABASE on real PostgreSQL 18.3 — 84 migrations, both columns nullable, a SECOND lift touching 0 rows, the row still present. §17's "no delete" assertions all stand. 🔴 **AND THE DECISION SURFACED A SECOND FALSE SUCCESS THE PLAN DID NOT NAME**, pointing the other way: `suppression.create` is an upsert with `update: {}`, so once a row can be lifted, `stop → start again → stop again` hands back the LIFTED row — telling somebody they will never be marketed again while the lift stands and the next campaign sends. The update now CLEARS the lift, and §17's `update: {}` assertion was REPLACED rather than softened: it says what it always meant — the block must not touch `createdAt`, and it must re-arm. 🔴 **AND A THIRD, FOUND BY RUNNING U7's SUITE:** the memory twin asked `r.liftedAt === null`, which is FALSE for a row carrying no lift field — so an un-lifted suppression read as LIFTED and a person who said stop came back MARKETABLE. It failed OPEN. Now `!r.liftedAt`. ⭐ **And the repo-wide fact behind it:** `tsconfig.json` includes `scripts/**/*.ts` while every suite is `.mts`, so **no test file in this repo is typechecked** — a DAL type change breaks fixtures in silence. ⭐ **The red control caught the GUARD lying, twice:** the expiry plant reached nothing because the assertion called the SHIPPED resolver instead of the object under test, and the fail-closed fixture stopped being legacy once `create`'s idempotence re-armed it — a fixture that stops being the shape it is named for is a control that has quietly stopped controlling. Both are cases now; 8/8 caught. ⭐ **And reading the screenshots found what no assertion did:** the invalid-token refusal told the reader to "tap once to stop" on a page that renders NO BUTTON. ⚠️ **Two instrument defects of my own, both in the drive:** `button.first()` resolved to a hidden language-picker option in the SITE CHROME, and the text assertions could not fail — `optout.title` is the SAME STRING as the stop button's label, so "the stop button is on the page" was TRUE on a page with no button. Controls are counted by role and accessible name now. ⚠️ **`next dev` cannot run in a junctioned worktree either**, not only `next build` — same Turbopack symlink refusal, after printing "Ready". |
| S4 | 2026-09-25 | **U7 ✅ LIVE (`b60dc492`); U8 🟡 store half live (`5942332f`), page not built.** ⭐ **The trap U7 exists to survive:** this platform stores phone numbers in TWO formats and nothing said so — `User.phoneE164` is `+255…` from `tzPhone` (`validators.ts:32-37`), the marketing key is bare `255…` from `toMsisdn255`, and they are unequal for EVERY input including `+255712345678` itself. So the obvious gate finds NO player, hands the entire player base to the ledger branch — the one branch that must never govern a player (OD10) — and never throws or logs. `userPhoneKeyFor` is the bridge and the suite pins it in BOTH directions, because a bridge asserted only in the working direction can be deleted without the guard noticing. 🔴 **U7 SHIPPED WITH A DEFECT AND WAS FIXED THE SAME SESSION:** `selfExclusionStanding` → `getRgSettings` ends in `db.responsible.upsert(fresh)` (`responsible-gambling.ts:90`), so ASKING THE GATE A QUESTION WROTE A ROW — 150,000 ResponsibleGambling rows per campaign, created by deciding NOT to message people. ⚠️ Found by an adversarial read of the SHIPPED unit, not by a failing test: the defect writes correct-looking data, so nothing went red. Assertion 14 now pins it and red case 4 plants it. ⛔ **Three of this plan's own instructions were stale again:** OD9 named a `MessagingConsent{GRANTED}` status the shipped enum does not have (it is `GIVEN`, matching the existing `privacy.marketing_consent.given` audit action) and OD9's `UNKNOWN` is not in the enum either — both corrected, with the 55P04 cost of adding it later recorded on OD9 itself. ⭐ **U8's premise failed twice over**, which is why only its store shipped: there is no recipient row to hang a token on until U35 (S18) and nothing mints one until U42 (S21), and `marketingFooter` has no callers outside its own test — so U8's stated Accept (a minted token suppressing on production) is unreachable at S4 and now belongs to U42/U52. 🔴 **And the number OD43's length hides:** the token is 8 characters and never expires, so the obvious hex `randomId(4)` (16⁸ = 4.3×10⁹) gives ≈2.6 EXPECTED collisions per 150k campaign — near-certain on the first one. The 32-char ambiguity-free alphabet gives ≈1%, still compounding, so a taken token is REFUSED rather than upserted (an upsert would silently re-point somebody else's live opt-out link). 🔴 **THE OPEN DESIGN QUESTION THIS SESSION SURFACED AND DID NOT HALF-APPLY:** U8 promises a resubscribe button, but suppression rows are never deleted and the gate asks suppression FIRST — so resubscribe would show a success that is not one. The fix is a nullable `liftedAt` (superseded, never deleted); it is written into ▶ NEXT rather than rushed into the live gate at the end of a long session. |
| S3b | 2026-09-25 | **U6 ✅ LIVE on `32067c92` — D7 and D8 closed; the consent ledger and the SMS suppression list exist, in both stores.** ⭐ **The unit was never blocked — the blocker was.** §0 had stopped U6 for a whole session on "`docker` is not on PATH, so `db-scratch.mts` cannot raise a scratch Postgres". That script does not use Docker: it loads `embedded-postgres` (`:129-146`), whose 107 MB binaries are already installed, and it raised **PostgreSQL 18.3 — production's own major version** here. All 82 migrations apply from empty through the real `prisma migrate deploy`. The lesson is the one this lane keeps re-learning: **audit the instrument, not only the code** — the blocker named a MECHANISM (`docker`) and nobody opened the file to see whether that was the mechanism. ⛔ **Two more of the plan's own instructions were stale**, both because parallel programmes moved underneath it: `dal-parity` was to gain "§7 with its own planted-key control", but §7–§16 have been taken since house bots' build and the gate has had a planted-key control at §0 all along — so U6 took §17 and EXTENDED `red:dal-parity` rather than shipping a second control beside a working one. ⭐ **The red control then found a hole in this unit's own guard**: the tiebreak assertion asked whether the ordering appeared ANYWHERE in the namespace, and each twin has TWO readers — so planting its removal from `latestFor` left the gate GREEN, because `listFor` still carried it. An assertion a sibling can satisfy on your behalf is not an assertion about you; it counts both readers now, with a control proving one is not enough. ⭐ **And the enum rule is narrower than this plan states** — measured, not assumed: adding a value to an EXISTING enum cannot be used in the same transaction (`55P04 unsafe use of new value`), which binds U35/D22 adding `MARKETING` to `SmsPurpose`; a BRAND-NEW type created and used in one transaction is allowed, so U6's five types ship in ONE migration rather than two. 🔴 **A FINDING OUTSIDE THIS PROGRAMME, RECORDED AND NOT FIXED (§6 forbids it):** `schema.prisma` has declared `@@unique([provider, providerRef])` on `Transaction` since 2026-06-08 (`1112ee3c`, "Hardening sprint") with **no migration** — the init migration creates only a non-unique `Transaction_providerRef_idx`, so production has never had the constraint. Its own comment says "a retried webhook with the same providerRef must not" duplicate. Money is NOT leaking today: `settlePaymentWebhook` is idempotent in application code (`wallet-service.ts:1015`, `txn.status !== "PROCESSING"`). The exposure is that `findByProviderRef` is `findFirst({ where: { providerRef } })` — it does not even use the compound key — so two rows sharing a ref would resolve arbitrarily. ⚠️ It also means **`prisma migrate diff` sweeps it into any unrelated migration**, which is exactly what happened here: it was generated into U6's SQL and removed by hand before the commit. ⚠️ **Environment, recorded so it costs nobody else a session:** `prisma migrate dev` needs a shadow database, dies `P1017` on the embedded cluster and leaves ~14 orphaned `postgres.exe` holding `.pgscratch` against deletion — use `migrate diff --from-url` + `migrate deploy` instead; and ⛔ do not clear those orphans with a global kill, because sibling sessions run their own clusters and this session killed theirs. ⚠️ **Also recorded for U7:** `isSuppressed` is ALREADY an exported name (`email-suppression.ts`) meaning bounced/complained — deliverability, not consent — and `marketingOptIn` has FIVE writers, of which U6 wired two. |
| S3 (part) | 2026-09-25 | **U5 ✅ LIVE.** ⭐ Its product half was ALREADY BUILT and the plan did not know: the statutory helpline is already one pinned constant with no setter, `global-error.tsx` already keeps its four hand-written copies BY DESIGN (root error boundary, imports nothing, renders when the root layout has already failed), and `test:support-contact` §15 already DISCOVERS every helpline-shaped literal there and pins each to the constant. Building it again would have been a second implementation of a working one. **What was actually missing was the control** — that suite is fifteen sections, among the most careful in this repo, and had NO `red:` key at all. `red:support-contact` ships it: 4/4 caught each on its own assertion, tree restored byte-identical, DECLARED anchors so the undeclared ratchet stays at 68. Two of the four are controls on the suite's own controls — §15.1 passes perfectly over a file that has stopped printing the helpline altogether, so one mutation DELETES a copy rather than drifting it. ⭐ **And the suite under test caught this unit's own first draft:** the mutation seeding an operator-settable helpline used the operator's REAL desk number as its literal, and §8 (no support-contact literal outside `support-config.ts`, sweep includes `scripts/`) refused to run at all. A red harness that seeds a real contact number into the tree is one that leaks one. ⚠️ **The live drive's first answer was also a false alarm** — it asserted every `tel:` link dials the helpline, but the page carries three and one is 50pick's own support desk under "Wasiliana nasi", which SHOULD be there and SHOULD differ. The defect was never "another number exists" but "a link that says helpline dials something else"; the drive now classifies by LABEL, with controls that it found at least two helpline links and at least one non-helpline link, so the classifier is proven to discriminate. ⛔ D6 stays ⬜: engineering half closed, substance is OQ4. ⛔ U6 NOT STARTED — no Docker and no `DATABASE_URL` on this machine, so a migration cannot be verified anywhere, and a push deploys it straight onto production. |
| S2 | 2026-09-25 | **U3 and U4 ✅ LIVE — D4 and D5 closed.** The GSM-7 table came out of `lib/server/sms-blackball.ts` into a pure client-safe `sms-compose.ts` and the gateway now DELEGATES to it, so the price an officer is quoted and the coding the wire receives come from one table; the move is asserted lossless byte-for-byte against a copy of the pre-move string. **Two findings worth more than the units themselves.** ① **Segments are PACKED, not divided** — a two-septet extension character cannot be split across a boundary, so 152 plain characters then 77 euro signs is 306 septets, which `ceil()` prices as TWO segments and which sends as THREE; at 150,000 recipients that one unit of slack is TZS 900,000. ⛔ And **every boundary vector this plan SPECIFIED is blind to it** — all eight are plain text, and on plain text packing and division agree exactly, so the suite as drafted would have looked thorough, passed, and never caught the defect that costs the money. The red control now asserts that about itself: the division plant breaks exactly ONE assertion in the file. ② **`String.length` is CORRECT for UCS-2** — it already counts an emoji as its two UTF-16 units — and wrong only for GSM-7 extension characters, which is precisely why pricing from `bodyLen` looks fine. U4 made the statutory footer computed (49 septets), counted, and impossible to omit — there is no call shape that produces a marketing body without it — so the operator budget is 111 rather than 160; every Swahili fragment is copied from a shipped string with the line cited, and §12 ASSERTS the footer helpline still DIFFERS from the published one so that OQ4 cannot be closed by an "obvious cleanup". ⚠️ **Two red anchors rotted by this lane own edits** (`otp-delivery`, `blackball`) were flagged by a parallel session and re-anchored here, then re-proven by EXECUTION (8/8 and 11/11 on their own assertions, tree restored byte-identical). ⭐ Two of the first red plants written this session were AIMED AT NOTHING and the baseline-plus-named-assertion shape is what caught them. ⛔ Recorded: `npm run build` cannot run in a junction worktree, so the build proof is typecheck + client-graph-safe + the Railway deploy. |
| S1 | 2026-09-25 | **U1 ✅ LIVE — the first product code in this programme. D1 and D2 closed.** Worked in a worktree off `origin/main`: the checkout was on another session's branch (`mobile-s2`) with their files in the tree, and `main` moved twice under this lane mid-session. **Three premises in the plan were false and are corrected here rather than worked around.** ① U1's text said it extends "its existing red control" — `test:phone-normalize` had NO red control and never touched `toMsisdn255` at all, while §1's own rule needs a backticked `red:` key to tick a row; `red:phone-normalize` was added, in-process, costing the `red-anchors` ceiling zero (measured: **68 vs 65 on clean `origin/main` AND 68 vs 65 here** — that suite was already red and is not claimed). ② The suite gated nothing: it was in no `predeploy` chain. ③ §3d — the NDC table U2 was drafted from is the 2020 edition and five rows are wrong today. **Two findings came from auditing the instruments rather than the code:** `00712000101` has sat in this suite since August labelled "the double-zero fat finger", the one input it calls a real user mistake — and nothing anywhere evaluated `toMsisdn255` on it, which returned a THIRTEEN-digit msisdn; and `test:shell-boundary`, named on U2 as its gate, is E-70 (plain `<a>` across shells) and cannot pass or fail on a module move — the real import guard is `test:client-graph-safe`, whose pinned set a new module must be added to or the guard is decoration. Ali added two standing requirements mid-session, both written into the contract so they bind later units rather than living in a chat: **§5.15** (every grid ships paging, sorting, a determinate loading state, an empty state and a retryable error state) and **§3c** (the import is ~150k contacts or a `.vcf`, *and* could be small — which breaks D18's 1 MB server-action ceiling outright, makes a full send TZS 900,000 against a measured float of TZS 232, and rules out pairwise duplicate detection at 1.1 × 10¹⁰ comparisons). ⚠️ RECORDED, NOT FIXED — outside §6's permission: `payout-destination.ts`'s canonical `destination.msisdn` is computed at `wallet-service.ts:1597` and **never read again**; the ledger and the gateway both take `parse.data.msisdn`. Harmless today because the two are equal, but the comment describes a reader that does not exist.  **U2 ✅ LIVE — D3 closed.** The NDC table was researched from the regulator rather than trusted: TCRA has re-issued the numbering plan three times since the edition U2 was drafted from, and 63, 64, 66, 70 and 72 all changed holder, so five of nineteen rows were wrong — including the one the unit had chosen AS its red control (070 was spare in 2020 and is Honora/Yas, operational, in v1.16, so planting `verdictFor("701234567") === "ok"` as the DEFECT would have pinned the wrong answer permanently). Cross-checked row by row against libphonenumber TZ ranges and carrier map, which carry GSMA IR21 provenance; the two sources agree on every code except 60. **Three rulings the research forced:** the operator is the RANGE HOLDER and never the network, because MNP has been live in Tanzania since March 2017 — so `walletHint` is display-only and §7 asserts no money module reads the table; where the regulator and the carriers disagree the parser ACCEPTS and flags, because a false refusal is invisible for ever and a false send is a receipt that never arrives; and 064 is allocated on paper and dead on the wire, which `isGatewayMsisdn` cannot see by design, so this module is the only thing in front of it. ⚠️ **An instrument nearly lied about the most important one:** the ITU E.164 notification answers "sans objet" in its portability row, which reads like "no portability here" and in fact answers a request for a LINK to a database TCRA never published — a blank field is not a negative finding. Also folded in: the display formatter had a SECOND, drifted copy in `wallet/withdraw/page.tsx` (no nine-digit cap, groups every run of three) that agreed with the first on every nine-digit input and diverged on everything else; both now resolve to one function. ⛔ Recorded for every worktree lane: `npm run build` cannot run where `node_modules` is a junction (Turbopack refuses the symlink), so the build proof in a worktree is typecheck + client-graph-safe + the Railway deploy itself. |
| S0b | 2026-09-23 | **The SMS rail was sealed, and its lessons folded in — no code, board untouched at 0/52.** Delivery receipts now work end to end: a production-issued OTP was DELIVERED and its receipt settled the real row in 11 seconds (`applied: 1`, `unknownRef: 0`, `mismatch: 0`), after the gateway's first unattended batch of three receipts in one POST. §3a replaces the "no receipt has ever arrived" premise this plan was written on; §3b records the vendor's measured vocabulary and operational facts, plus the seven lessons from eleven days of chasing it — chief among them that four vendor claims of "it is fixed" produced four identical silences, that the real fault (a missing `?token=` on their saved URL) only became visible because our receiver records REFUSED attempts, and that our own probe was briefly mistaken for theirs until it was discriminated by `srcIp`. D21, OD41, §7.7, U46, U47 and U51 were rewritten against the new truth; every guard and unit count is unchanged. |
| S0 | 2026-09-16 | **Planning only.** Nine agents: four research lenses (Tanzanian law · data model + engine · contacts + import · campaign UX), one draft, three adversarial critics (compliance/abuse/money · code truth · completeness/trackability), one revision. 52 critique findings, all resolved or refuted in writing. **Four critic claims were refuted with evidence:** (1) the `00255…` defect is *latent*, not live — every current caller is pre-validated, so it becomes live only when an importer exists; (2) `isLockedOut` is not "wrong" — Ali ruled on 2026-08-27 that a chosen period is a MINIMUM and the account is not reinstated by itself, so marketing needs its OWN predicate and ⛔ `isLockedOut` is not modified; (3) the helpline is not a citation-free assertion — the Gaming Board's own Advertising Code names `0800110051` three times while `support-config.ts:120` pins `0800 11 0011`, so the defect is real but the remedy is an owner question, not a silent edit; (4) routing campaign bodies through `test:cert-c1`/`c3` aims at a gate that structurally cannot fail — `comms-registry.ts` places SMS outside the module, so marketing gets its own wording assertion instead. Unit count was raised from 22 to **52** after measuring the shipped equivalent at Awarkeh (8,625 + 8,948 lines): 22 units would have been ~800 lines each, which is not half a session. ⚠️ Recorded as UNVERIFIED at S0 and to be re-scored at S1: §0a's self-sufficiency on a fresh machine, and whether the two-unit cadence holds for U30/U43. |

---

## §3 — MEASURED CONTEXT (what is true on 2026-09-16, with citations)

**The SMS rail is live and has never carried marketing.** `SMS_PROVIDER=blackball` since `b726cb7f`;
sender `50pick`; **TZS 6 per delivered single-segment GSM-7 SMS**, measured (balance 250 → 244 on one
send); balance **TZS 232** — thirty-eight single-segment messages; `BATCH_MAX` 50 per request; every
gateway failure is HTTP 400, so the `status` boolean is the only verdict; the success reply carries no
per-message id. ✅ **Delivery receipts WORK** — see §3a, which supersedes the "no receipt has ever
arrived" premise this plan was written on. Guide: `docs/BLACKBALL-SMS.md`.

**Nothing on this platform checks marketing permission before an SMS.** There is no suppression list, no
consent ledger, no opt-out, no age check and no responsible-gambling gate on the SMS rail.
`User.marketingOptIn` exists (default **false**, withdrawable, 730-day lapse) and is read by nothing that
sends. `push-service.ts` gates push notifications on `isLockedOut`; SMS has no equivalent.

**Phones.** `validators.ts:21` `tzPhone` = `^(?:\+?255|0)?[67]\d{8}$` — it accepts NDCs no licensee holds
(60, 70) and gates registration, sign-in and both money forms. `phone-normalize.ts:82` `toMsisdn255`
turns `00255712345678` into a 16-digit string. `phone-input.tsx:29` holds a private `formatTzPhone`
inside a `"use client"` file. There is no NDC → operator map anywhere.

**Read tiers.** `scripts/read-tiers.test.mts:373-397` governs **both** `phoneE164` and `msisdn` under
`identity.contact`; GROWTH's ceiling for that class is **masked** (`roles.ts:446`), and GROWTH's
`money.figures` is **none**. So the officer who runs campaigns may not read a number and may not read a
TZS figure — that is a design input, not an obstacle (§4 OD24, OD25).

**Responsible gambling.** `responsible-gambling.ts:382` `isLockedOut` returns `locked:false` the moment
the chosen period elapses; `:421` `selfExclusionStanding` is the predicate that knows an account is still
not reinstated; `:780` `detectHarmMarkers` is the only vulnerability signal that exists.
`two-officer.ts:51` `twoOfficerGate` already exists and is reusable.

**Platform mechanics.** No job queue. `lifecycle.ts` ticks every 60 s under a leader lease and also runs
payment reconcile. `locks.ts:142` gives every `withLock` a 30 s transaction timeout.
`invite-service.sendCampaign` holds one across `sendBatch` (D15). `chain-purge.ts` +
`purge-chain-card.tsx` are the platform's only long-job precedent: a durable row, one `advance()` per
call, a determinate `ProgressBar`. Server actions carry Next's default **1 MB** body; there is no admin
file-upload component and no CSV parser in `package.json` (`exceljs` is present, server-side, for
exports). `predeploy` (`package.json:248`) is a hand-written chain — a new suite that is not added to it
gates nothing. `red-anchors.test.mts:239` caps undeclared harnesses at 65 with `===`.

**The law, read this session** (full citations in §5): marketing SMS requires consent (ETA Cap 442 s.32,
EPOCA GN 61 reg 7(4)); the message must disclose sender and purpose **at the beginning**, carry an
opt-out in **every** message, and state the **source** of the number (ETA s.31(c)); personal data must be
collected **directly from the data subject** and Tanzania has **no legitimate-interests ground** (PDPA
Cap 44 ss.22–23, and 50pick's own recorded position in `docs/COMPLIANCE-DECISIONS.md`); 🔴 **a gaming
advertisement may not be published without Gaming Board approval, and unsolicited SMS needs the Board's
PRIOR WRITTEN approval** (GN 478T reg 56(1); GBT Advertising Code 2023 cl. 2.2.6); every marketing SMS
must **end** with the condensed responsible-gaming message, plus the Board's toll-free number above 160
characters (Code cl. 3.7.1–3.7.2); **no promotional material to a self-excluded player** (GN 478T reg
49(3)); penalties are criminal — not less than TZS 5,000,000 or 12 months (GN 61 reg 15(1)), TZS
10,000,000 or a year (ETA s.32(3)), and licence suspension or revocation (GN 478T reg 64).

---

### §3a — ✅ THE RECEIPT RAIL IS PROVEN (2026-09-23) — this replaces the premise above

Measured on production, end to end, on a message production itself sent:

```
07:14:42.373Z  SmsMessage sms_de5d…  purpose=OTP            production wrote the row
07:14:43.770Z  sms.accepted   HTTP 200 · balance=196        the gateway took it
07:14:53.760Z  sms.dlr.received  {lines:1, applied:1, unknownRef:0, mismatch:0}
               row → status=DELIVERED   dlr=DELIVRD / Success
```

**Eleven seconds.** `applied: 1` with `unknownRef: 0` and `mismatch: 0` is the discriminator: the receipt
carried OUR `sms_…` reference, passed the msisdn cross-check, and moved a real row. Earlier the same
morning the gateway sent its first unattended batch — **three receipts in ONE POST**, one per earlier
test send, each echoing our reference.

**What this hands the campaign engine, free:**

- ⭐ **`DELIVERED` is a real state, not an aspiration.** U47's figures, U48's results and the export can
  show delivery as fact. ⛔ But `accepted → delivered` still takes seconds to minutes, so OD41 stands:
  `accepted` is never rendered as delivered, and `UNCONFIRMED` after 15 minutes (U46) is still needed.
- ⭐ **The reference echo is PROVEN**, which is what makes `SmsCampaignRecipient.smsReference` a usable
  join. The plan hedged on this (§3 of `BLACKBALL-SMS.md` warned their emailed example carried a
  23-character id of their own); the hedge is discharged.
- ⭐ **The multi-line batch shape is real** — `{statuses:[…]}` with several lines in one POST, handled
  line by line. A campaign will receive receipts in batches, not one per call.
- ⛔ **Still unproven, so U46 keeps its RED controls:** the `SmsCampaignRecipient` arm (unbuilt), every
  failure token (only `DELIVRD` has ever arrived — see §3b), and behaviour at campaign volume.

### §3b — WHAT THE VENDOR IS, MEASURED (and how the last exchange with them actually went)

**Their delivery-status vocabulary, given in writing 2026-09-17 and checked against `mapDlrStatus`:**
`DELIVRD` → DELIVERED · `UNDELIV`, `REJECTD`, `EXPIRED`, `FAILED` → FAILED · `SENT` → *no verdict yet*
(the row stays ACCEPTED, which is correct: it means the network has it). ⚠️ Only `DELIVRD` has ever been
seen in a live callback; the rest are their words, not our measurements, so U46's failure fixtures stay
synthetic until one arrives.

**Their operational facts:** callbacks retry **5 times** on a non-200 (interval not given) · three sender
IDs are whitelisted on the account (the exact strings still not supplied) · the portal's `COUNT` column is
the **segment** count, i.e. the billed unit — the cross-check for U3's arithmetic and U52's drive ·
`CODE 0` accompanies `DELIVRD` (the failure codes are still unknown).

**And the part worth keeping for the next vendor, because it cost eleven days:**

1. ⛔ **A vendor's "it is fixed" is a claim, not evidence.** Four separate claims of a fix produced four
   identical silences. Each retest cost TZS 6 of the float that belongs to login codes. **The rule this
   earns: re-test on evidence, not on assurance** — a log line from their side, or a receipt they posted
   by hand. U52 inherits this: the live drive is capped and ledger-counted for the same reason.
2. ⭐ **The fault was a missing `?token=` on the URL they had saved** — invisible from our side until
   they were asked to POST by hand and the 401 appeared **in our own audit rows**. ⭐ The receiver
   recording *refused* attempts is what turned "nothing is happening" into "your token is wrong". Every
   guard this plan writes should record the refusal, not only the success (§5.14 already says so for
   audit content; this is the same rule for coverage).
3. ⛔ **Our own probe is indistinguishable from the vendor's call.** A `curl -X POST` reachability check
   wrote the same `webhook.blackball.rejected` row and was briefly read as "they are calling us at last".
   ⭐ Discriminate on `srcIp`, exclude the operator's own address, and never probe an endpoint while a
   watch on it is running. U52's drive and any campaign watch inherit this.
4. ⛔ **`railway logs --http` is a TAIL, not a history** — measured: 5,000 lines covered **fifteen
   minutes**, and `--json` returned nothing while the plain form returned thousands. It can be trusted
   only LIVE, during a watch. **The durable instrument is the audit chain**, which is why every unit in
   this plan writes an audit row for refusals as well as sends.
5. ⛔ **`curl` reports `200` where a browser is redirected**, because the redirect is streamed
   (`/auth/otp`). Any "is this page reachable" check in this programme uses a browser, not a status code.
6. ⭐ **A flag can gate a PAGE and not the SERVICE behind it.** `OTP_ENABLED` gates only
   `src/app/auth/otp/page.tsx`; `requestLoginOtp` was never gated. U17's five doors and U41's approval
   gate are written on the opposite principle — the refusal lives in the server action, not the route.
7. ⚠️ **The webhook secret travelled through chat and WhatsApp during the fix.** Rotating it is an open
   owner item in `BLACKBALL-SMS.md`; if it is rotated while this programme runs, the campaign engine
   needs nothing — the secret lives only in Railway and the vendor's saved URL.

### §3d — 🔴 THE NDC TABLE IN U2's §9 TEXT IS THE 2020 EDITION, AND FIVE ROWS ARE WRONG TODAY

Found at S1, 2026-09-25, by researching the regulator rather than trusting the plan. **TCRA has
re-issued the National Numbering and Signaling Point Codes Plan three times since the edition U2 was
drafted from** (June 2024 → v1.15 July 2025 → **v1.16, 1 July 2026**, doc
`TCRA/DICT/CRTM/PLA-NMSP/002`). Codes **63, 64, 66, 70 and 72 all changed holder.** ⛔ Do not type
U2's list into the module; U2's own commit rewrites that §9 paragraph against the edition it ships.

| NDC | U2's §9 text says | v1.16 (Jul 2026) says |
|---|---|---|
| 63 | Amotel | **Viettel (Halotel)** — Amotel's holder was *Mkulima African Telecommunication Co. Ltd*; dropped in 2024, reserved in v1.15, reassigned 2026 |
| 64 | CooTel (Wiafrica) | **Telxer Enterprise Ltd — NOT operational** |
| 66 | Smile, A2P reach unproven | **Airtel, operational** (Smile ceased; Vodacom bought it Apr 2024; reserved in v1.15; Airtel in v1.16) |
| 70 | unallocated — U2's RED control plants `verdictFor("701234567") === "ok"` as the DEFECT | **Honora (Yas), operational.** ⛔ The specified red control is therefore BACKWARDS and must not be written as drafted |
| 72 | MO Mobile | **Vodacom** |

Unchanged and confirmed: 61/62 Viettel·Halotel · 65/67/71/77 Honora·**Yas** (77 was Zanzibar Telecom
/ Zantel — the "formerly Zantel" claim holds; MIC Tanzania PLC is now **Honora Tanzania PLC**, Tigo →
Yas on 2024-11-26) · 68/69/78 Airtel · 73 Tanzania Telecommunications Corporation (TTCL) ·
74/75/76/79 Vodacom. **60 is still reserved** (`060AXXXXXX`, "Reserved for future use").

⚠️ **D3's wording is half right and must be re-scored when U2 lands:** `tzPhone` does accept NDCs no
licensee holds, but **60 is now the only such code in 6X/7X**, not "60 and 70".

⭐ **THE LESSON THIS PROGRAMME KEEPS, AND WHY IT IS RECORDED HERE RATHER THAN IN U2:** a numbering
table is a REGULATOR'S document with an edition, and it moved three times in the six years this
plan's version was current. That is exactly why U1's `isGatewayMsisdn` is coarse (twelve digits,
`255` then `6` or `7`) and refuses to know about allocation at all: a table on the money wire goes
stale on TCRA's schedule, and its failure mode is **refusing to text a real customer**. U2's module
therefore carries its edition, its source URL and a `PLAN_REVIEWED` date in the file, and its suite
PRINTS that date's age rather than failing on it. ⚠️ The ITU's E.164 notification for Tanzania
(1.XI.2024) is a primary source but is **two editions behind** — it still shows 66 as Vodacom and
omits 79 — so it is a corroborating source, never the table.

---

### §3c — ⭐ THE SCALE THIS MUST ACTUALLY CARRY (Ali, 2026-09-25) — a premise the plan was NOT written on

> *"keep in mind what we are planning now is not a small contact list to Excel list — it's 150k approx
> contacts, or VCF."* · *"it could be small and could be large."*

**Both ends of that range are requirements, and the small end is the trap.** A design that only works
at 150,000 makes a 40-contact import feel broken (a job queue, a poll, a progress bar, three screens),
and a design that only works at 40 loses the file. Every import unit is therefore specified for BOTH:
the same code path, chosen by measured size, never a second implementation.

**What 150,000 actually costs, computed rather than asserted:**

| | |
|---|---|
| A 150k `.vcf` | tens of MB. ⛔ D18's **1 MB server-action ceiling** makes a direct upload impossible — the file cannot arrive the way the plan assumed |
| One single-segment campaign to 150k | 150,000 × TZS 6 = **TZS 900,000**. The account's measured balance was **TZS 232** (§3), so a full send is ~3,900× the float on hand. ⭐ This is what makes U49's budget cap structural, not a nicety |
| D20's serial `SmsMessage` UPDATE | 150,000 round trips where a grouped update is one. At 5 ms each that is **12½ minutes of pure latency** inside a job that also has to survive a restart |
| D23's `withLock` | `pg_advisory_xact_lock` inside a `$transaction` with a **30 s** timeout. 150k rows cannot pass through it, and §5.5 already forbids holding it across a send or an import |
| Duplicate detection | ⛔ pairwise comparison is 1.1 × 10¹⁰ comparisons. It is a hash on the ONE phone key (U1) — O(n) — or it does not ship |

**What this binds, and it binds them now rather than at the unit:**

1. ⛔ **The file never arrives through a server action.** U23/U27 upload in chunks to a staged row, or
   direct to storage with the server reading it back — decided at U23, but the 1 MB ceiling is not
   negotiable and must not be discovered at U27.
2. ⭐ **Parse is STREAMING, never `readFile` then `split`.** A 40 MB vCard read whole is a 40 MB string
   plus its parsed array in one request's heap. U25/U26 parse a stream into batches.
3. ⭐ **Staging (U29) is the resume point, and the progress bar (U32) counts ROWS STAGED, not bytes
   read.** An import that dies at row 120,000 resumes at 120,000. ⛔ A progress bar that is a timer is
   the defect this plan already names.
4. ⭐ **Every per-row helper is allocation-cheap by construction** — `parseTzNumber` (U2) is called
   150,000 times per import, so its NDC lookup is a prebuilt map and its regexes are module-level
   constants, never rebuilt per call. U2's suite asserts the table is built **once**.
5. ⛔ **No `fetch-all-then-slice` anywhere** — not in the grid (§5.15), not in the pre-flight (U30), not
   in the audience resolver (U24). The count and the page come from the database.
6. ⚠️ **And the small end is asserted too:** every import unit carries a fixture of ~40 rows alongside
   its large one, and the 40-row path must not show a queue, a poll, or an indeterminate spinner.

---

## §4 — OWNER DECISIONS, TAKEN ON ALI'S DELEGATION

*"Take decisions based on what you think is perfect and compatible with our platform… you decide."* Each
is decided, with what it rules out. They are not questions.

**Shape and scope**

- **OD1 · The plan of record is `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`**, guarded by
  `test:marketing-setup-plan`, red control `red:marketing-setup-plan`. One name, in Ali's own words.
- **OD2 · CONTACTS leads.** The address book ships before a single message is sent; the campaign engine
  is useless and dangerous without it, and the contacts page has standalone value (ops, invites, roster).
- **OD3 · ONE key: the bare 12-digit `255XXXXXXXXX`**, the output of `toMsisdn255`, stored in a column
  named `msisdn` on every new model. It is already what `SmsMessage.msisdn` holds, already what the DLR
  cross-check compares, and already governed by name in `read-tiers` §7. A player link is one indexed
  equality: `User.phoneE164 = "+" + msisdn`. ⛔ Rules out a second `phoneKey`/`phoneE164` column that
  could drift.
- **OD4 · `tzPhone` is not touched.** It gates sign-in and both money forms; narrowing it retroactively
  invalidates stored numbers. The new validator is **additive and marketing-only**.
- **OD5 · An unallocated NDC (60, 70) WARNS in the contacts book and REFUSES at dispatch.** An allocated
  but unlaunched NDC (62, 63, 64, 72) is valid and counted on its own line — refusing a real number
  because a regulator's PDF says a licensee has not launched is refusing a number off a business card.
- **OD6 · No new contact model for players.** A player is not copied into the book; the audience unions
  the book and the player table on the one key, and the `User` row always governs.

**Permission (the part the law writes)**

- **OD7 · A marketing SMS is sent only on CONSENT.** There is no other lawful basis in Tanzania.
- **OD8 · `User.marketingOptIn = true` is consent for a player**, because the profile screen says so in
  the shipped wording; from the day U6 ships, every change to it ALSO appends a ledger row, so the ledger
  becomes complete going forward. ⛔ No backfill — a ledger row nobody was shown is a fabricated record.
- **OD9 · An imported contact is marketable only when BOTH hold**: a `MessagingConsent{GIVEN}` row with
  the **verbatim wording** the person was shown, **and** a first-party basis (our own form, our own
  event, our own agent roster — the person gave us the number). ⛔ A bought or third-party list is
  STORED and never marketed; its rows carry `UNKNOWN` and the audience query cannot return them. ⚠️ **`UNKNOWN` IS NOT IN THE SHIPPED ENUM.** U6 shipped `MessagingConsentStatus` as `GIVEN | WITHDRAWN`, because those are the only two states anything writes today. Adding `UNKNOWN` is a value on an EXISTING enum, which Postgres refuses to use in the transaction that adds it (`55P04`, measured on 18.3) — so it must ship in its OWN migration ONE COMMIT before U33 writes it.
- **OD10 · Consent can never be granted by a file.** No column alias, no checkbox, no import path may set
  consent to granted; a withdrawn row can never be re-granted by a spreadsheet. ⛔ Un-buildable, not
  defaulted off.
- **OD11 · Suppression is checked BEFORE consent**, and a suppression row is never deleted — not by
  contact deletion, not by re-import, not by an officer. Deleting one re-permits marketing to someone who
  said stop.
- **OD12 · Marketing suppression on self-exclusion uses `selfExclusionStanding`, never `isLockedOut`**,
  and treats any self-exclusion as lasting at least six months (GN 478T reg 48(3)), lifted only by an
  officer restore **plus** a fresh consent after restoration. ⛔ `isLockedOut` itself is not modified.
- **OD13 · Cooling-off and `detectHarmMarkers` also suppress marketing**, with their own skip reasons.
- **OD14 · 18+ is enforced in the loop.** An account's `dob` must yield ≥18; a contact with no account
  is marketable only when the import recorded an explicit 18+ attestation with the consent. Unknown age
  is `skipped`, never sent.
- **OD15 · One message per number per 72 hours, four per 30 days**, counted from `SmsMessage` rows with
  purpose MARKETING, enforced inside the loop.
- **OD16 · The send window is 08:00–20:00 EAT**, self-imposed, server-evaluated in the loop. ⛔ The
  document states plainly that no statute imposes it; the two candidate windows are named constants so
  the answer to OQ5 is a one-line change. Outside the window rows are **HELD**, never failed.
- **OD17 · Dispatch is closed until a Gaming Board advertising approval is on file** — a `SystemConfig`
  record with reference, grant date, expiry and scope, checked at Start **and re-checked in the loop** so
  an expiry mid-send stops the campaign instead of finishing it.
- **OD18 · Two officers above 50 recipients or TZS 10,000**, reusing `twoOfficerGate`; the approver may
  not be the composer; the authorisation carries an id, expires in 60 minutes, and is re-checked in the
  loop. ⛔ Not sixteen TOTP prompts for sixteen slices.

**Engine**

- **OD19 · Hybrid driver: a leader-leased pump is the authority, the open page is an accelerator.**
  Browser-only stops when the laptop closes; pump-only gives no feedback. Both drive the same conditional
  claim, so they cannot conflict — the loser's `count` is 0.
- **OD20 · The pump has its OWN timer and lease and yields to the lifecycle ticker** (`if
  lifecycleTickerHealth().running return`). ⛔ Marketing never delays money, mechanically.
- **OD21 · No lock on the send path.** `withLock` wraps state transitions only (confirm/start/pause/
  cancel), never an HTTP call. Claims are conditional `updateMany` with a token.
- **OD22 · A number messaged twice is unrepresentable**: `@@unique([campaignId, msisdn])` + the
  conditional claim + the one normalization key. All three, or the property is gone.
- **OD23 · A message we are not sure about is `UNCONFIRMED`, never retried automatically.** The claim is
  written before the HTTP call, so an interrupted slice does not know whether the gateway took it;
  re-sending is a second charge to a real person. Retry is an explicit operator act on a named failure
  set, and it re-runs the whole gate.
- **OD24 · GROWTH reads SEGMENTS; TZS renders only to a role holding the accounting tier.** Segments are
  the honest unit anyway — the gateway bills per segment.
- **OD25 · Every number is masked on every contacts and campaign surface for every role**, revealed only
  through `<Sensitive>` with a `pii.revealed` audit row. The operator chip is derived from the NDC, so a
  masked row still shows "Yas" — the fact the marketer actually needs.
- **OD26 · Counts are always a `groupBy` over rows.** ⛔ No stored counters: two surfaces cannot disagree
  if only one number exists.
- **OD27 · The typed-number confirmation compares against the count the SERVER recomputes**, never the
  one the client posted. A gate built from the value it checks can never fail.
- **OD28 · Above the confirmed audience, Start refuses** (`audience_moved`) and sends nothing; below it,
  it proceeds and reports. More people than were approved is money nobody approved.

**Contacts and import**

- **OD29 · CSV, vCard and paste are parsed in the BROWSER and posted as rows**; XLSX goes to one server
  action as base64, capped at 700 KB, with the remedy named ("save it as CSV — there is no size limit").
  ⛔ Rules out raising the global 1 MB body limit (the money forms inherit it) and rules out inventing
  the console's first multipart upload endpoint alongside everything else.
- **OD30 · The import STAGES rows in the database**, so a run survives a closed tab, a reload and a
  deploy — and the totals come back from the server, never from client arithmetic.
- **OD31 · The pre-flight writes nothing**, and its six buckets are asserted to add up to the rows read.
- **OD32 · `msisdn` is `@unique` on the contact book**, so duplicate detection is the index, not a
  pre-check that can be raced. "Add a second row" is therefore not offered — the three choices are keep /
  take the file's version (tags MERGE) / fill blanks only.
- **OD33 · In-file duplicates: the FIRST row wins**, the rule is printed on screen, and the loop never
  sorts.
- **OD34 · The progress bar counts rows the server reports written.** ⛔ Never a timer, never an eased
  animation, never an optimistic increment.
- **OD35 · No undo, said out loud** — and instead: a pre-flight that writes nothing, an enumerated
  overwrite confirmation, a run record naming every row touched, and a filter on the run id so "remove
  everything that run created" is one click the OPERATOR performs.
- **OD36 · One audience resolver.** The list, the whole-book counts, every bulk action, the export and
  the campaign all read `contactAudience(filter)`; a ticked-row selection is expressed AS a filter. ⛔
  This is the Awarkeh debt (two send paths) made structurally impossible.

**Screen**

- **OD37 · Zero tabs in this programme** — §K 7a fails on all three routes; the recipient-state rail is a
  FilterPill rail, because it chooses which rows show.
- **OD38 · Zero new keyframes, zero new tokens, zero new durations.** Every motion is a primitive that
  already ships with its reduced-motion branch. ⛔ No indeterminate bar (`progress-bar.tsx` is
  deliberately determinate), no count-ups, no pulsing dot.
- **OD39 · No global progress strip.** A nav `CountBadge` on "SMS campaigns" counts campaigns wanting
  attention — a reachability signal that cannot go stale and lie.
- **OD40 · Failures are grouped by reason with the dominant one visible**, and "not receiving" is neutral
  ink, never danger. Nothing failed: the consent gate worked. ⛔ Retry is offered only for retryable
  reasons — never for a skip.
- **OD41 · `accepted` is never rendered as delivered.** ⭐ Amended 2026-09-23: receipts now arrive
  (§3a), so the page's honesty line is rendered FROM THE DATA — "no receipt yet for this campaign" while
  none has landed, and gone by itself once one does. ⛔ The rule it protects is unchanged: handing a
  message to the gateway is not delivery, and only a receipt earns the delivered count.
- **OD42 · One campaign carries a required Swahili body and an optional English one**; per-recipient
  selection from `User.locale`, defaulting to Swahili; an empty English body means everyone gets Swahili,
  stated on screen. ⛔ No machine translation, ever. Exactly one placeholder, `{jina}`.
- **OD43 · The opt-out link is a per-recipient 8-character token at `/s/<token>`**, never expiring, no
  login, one click out with resubscribe beside it. Its length is pinned by a guard against a real minted
  token, and the footer is composed BEFORE the message is sized.
- **OD44 · The statutory footer is appended by the engine and cannot be removed by any control**, and the
  body must BEGIN with `50pick` (ETA s.32(1)(b)). Both are counted in the segment arithmetic.
- **OD45 · The sender ID is a server constant.** ⛔ Never operator-editable — a spoofed header is a
  Cybercrimes Act offence.
- **OD46 · `HOW-TO-SEND-A-CAMPAIGN.md` is written for Ali in plain words**, by the session that ships the
  live page, and an operator who did not write it follows it once before the Seal.

### §4a — The ten legal questions (each with the safe default that is BUILT)

| Id | Question for Ali + a lawyer | Safe default shipping meanwhile |
|---|---|---|
| OQ1 | Does 50pick hold a Gaming Board advertising approval, does it cover SMS (Code cl. 2.2.6 requires PRIOR WRITTEN approval), and has our own advertising code of practice been submitted (GN 478T reg 56(2))? | The whole broadcast surface ships **closed**: no approval record ⇒ dispatch refuses with one sentence. Contacts, compose, preview, estimate, test-send-to-self all work |
| OQ2 | Is 50pick registered with the Personal Data Protection Commission (PDPA s.14(1))? | The contacts page ships; the registration reference must be recorded before the first bulk import of non-account contacts |
| OQ3 | How must ETA s.31(c)'s "source of the personal information" be given inside a 160-character SMS? | For any non-account source the footer carries a short source phrase and the opt-out page states the particulars in full. If the answer is "in the body", it costs a second segment — priced in §9 U4 |
| OQ4 | 🔴 Which helpline is correct — our `0800 11 0011` or the Gaming Board code's `0800110051`? | The marketing footer uses `0800110051` (the regulator's own number). ⛔ No published page is silently changed; D6 only removes the duplication |
| OQ5 | Are there lawful quiet hours for promotional SMS? (Nothing found imposes any; the 6am–2pm blackout is radio/TV only) | 08:00–20:00 EAT, self-imposed, documented AS ours, both candidate windows named constants |
| OQ6 | `/legal/responsible-gambling` §4 promises no marketing to "players under 25 in vulnerability segments" — build the segment, or re-version the page? | Build what exists (self-exclusion, cooling-off, harm markers, 18+) and suppress those; ⛔ do not ship the engine while the page states a commitment it cannot honour — U12 forces the choice |
| OQ7 | Does marketing suppression follow the player's chosen self-exclusion period or GN 478T reg 48(3)'s six months? | Six months minimum, and permanent absent a fresh post-restoration consent |
| OQ8 | Does the Blackball account have an inbound number for STOP keywords, and what is the payload? | Link-based opt-out only. Inbound STOP is specified and built behind a guard, and ⛔ no reply keyword is printed in any message until inbound is proven live |
| OQ9 | What is the authorised wording of the "condensed responsible gaming message"? (The Code uses the term four times and defines it nowhere) | The wording 50pick already ships to players, compressed, plus `18+` and the Board's number. ⛔ No new Swahili sentence is invented |
| OQ10 | Is an operator attestation ("collected on our form, holder is 18+") sufficient evidence of consent for an imported contact? | Yes, recorded verbatim with a proof note, and marketable only on a first-party basis — everything else is stored and never marketed |

---

## §5 — HARD RULES (law first, then platform)

**5.1 · Consent is the only basis.** ETA Cap 442 R.E. 2022 s.32(1)(a) and EPOCA GN 61 reg 7(4)(a) both
forbid unsolicited commercial SMS without the recipient's consent. PDPA Cap 44 s.23(1) requires personal
data to be collected **directly from the data subject**, and Tanzania has **no legitimate-interests
ground** (50pick's own recorded position, `docs/COMPLIANCE-DECISIONS.md`, 2026-09-15). ⛔ No soft opt-in
audience is built anywhere.

**5.2 · Every marketing SMS: identity and purpose at the START, opt-out in EVERY message, the condensed
responsible-gaming message and the Board's number at the END.** ETA s.32(1)(b)–(c), s.32(2)(d); GBT Code
cl. 3.7.1–3.7.2. Engine-composed, un-removable, counted in the segment arithmetic.

**5.3 · A gaming advertisement needs the Board's approval; unsolicited SMS needs its PRIOR WRITTEN
approval.** GN 478T reg 56(1), Code cl. 2.2.6. Checked at Start and again inside the loop.

**5.4 · No promotional material to a self-excluded player during the exclusion period.** GN 478T reg
49(3), and 50pick's own published §4. The predicate is `selfExclusionStanding`, never `isLockedOut`.

**5.5 · Never a lock across a send or an import.** `locks.ts:142` — 30 s transaction timeout.

**5.6 · The consent, suppression, RG, age, window and approval gates run INSIDE the send loop,
immediately before dispatch**, in this order: `suppression → consent → self-exclusion → cooling-off →
harm markers → age → frequency cap → window → approval → dispatch`. A refusal is `skipped`, never
`failed`. Somebody who opts out in minute two must not receive minute four's message.

**5.7 · Consent wording is stored VERBATIM and never re-rendered from current strings.**

**5.8 · Records are kept per recipient per campaign**: the wording shown, the source, every check that
ran and its verdict, the body, the provider reference, the status, the receipt, and the cost the
**provider** reported. GN 478T reg 51(1); our published audit retention is seven years.

**5.9 · A new admin section is FIVE doors**: `NAV_GROUPS` + `ROUTE_KEYS`, `ROUTE_DOMAINS`, a `layout.tsx`
rendering `AdminSectionGate`, a `loading.tsx`, and a `filter-language` `ADMIN_SURFACES` entry with
`data-filter-rail`. Miss one and the page is invisible to the role that owns it.

**5.10 · Two stores or it does not exist**, with named types and a new `dal-parity` section carrying its
own planted-key control.

**5.11 · Every guard ships with a RED control that reintroduces the real defect** — in memory
(`--prove-red`) or declared in `scripts/anchors/`. ⛔ A new red harness that writes files breaks
`test:red-anchors` for every session in both checkouts.

**5.12 · `test:cert-c1`/`c3` do NOT cover campaign bodies** — `comms-registry.ts` places SMS outside the
module. The registry declares the ENVELOPE (sender, purpose, footer, consent gate, no `Notification`
row); marketing gets its own verbatim-wording assertion. ⛔ Do not aim a gate that cannot fail.

**5.13 · Swahili is the default player language**; admin chrome is English with copied glosses only.

**5.14 · No raw phone number in any audit payload, log line or error string** — `maskPhone` or nothing.
The chain is unprunable: a marketing list inside it is one nobody can ever delete.

**5.15 · EVERY LIST OR GRID THIS PROGRAMME SHIPS IS A COMPLETE ONE.** Ali, 2026-09-25: *"make sure
any grid created, or any development, should fully satisfy our platform requirements — paging,
sorting, loading, everything."* A table that renders rows is not a finished grid here. Each one ships
**paging** (server-side once the contact book can exceed one screen — ⛔ never fetch-all-then-slice,
which is how U45's D20 shape gets reinvented in the UI), **sorting** on the columns an operator
actually works by, **a determinate loading state** (a `loading.tsx` plus in-place skeletons that hold
the row height, so the page does not jump), **an empty state that says what to do next**, **an error
state that can be retried without losing the filter**, and **the filter language the rest of the
console already speaks** (§7.6, one filter language). The counts a grid prints are computed from the
same resolver the send uses (U24), never from a second query — two numbers that disagree on a
confirmation screen is the class §12 is written against. ⛔ This rule binds U20, U22, U23, U30, U32,
U36, U38, U47 and U48; their §9 **States:** lines are the mechanical hold on it, and a `visual` unit
whose states omit `loading` or `error` cannot be ticked ✅ (`test:marketing-setup-plan` §1c).

---

## §6 — WHAT THIS PROGRAMME MAY AND MAY NOT CHANGE

| May change | Must NOT change |
|---|---|
| `phone-normalize.ts` (fix + vectors, with the payout and OTP suites run) | `tzPhone` in `validators.ts` — it gates sign-in and both money forms (OD4) |
| `sms.ts` (MARKETING purpose, second floor, grouped updates) | the OTP path's behaviour, its floor exemption, or `SmsStatus` semantics |
| the DLR route (a third fan-out arm) | the `InviteEntry` arm, the msisdn cross-check, the monotonic guard, the `{"status":"Ok"}` reply |
| `invite-service.ts` (retire the SMS half) | `InviteEntry`, `bindRegistration`, the email lane, the admin pages |
| `retention.ts`, `DATA-RETENTION.md` (new rows) | the published retention periods |
| `comms-registry.ts` (a MARKETING lane) | the certification gates' meaning |
| new `db.*` namespaces, new models, new routes | `isLockedOut` and every one of its nine money call sites (§7.2) |
| `/legal/*` — only with an owner ruling and a version bump | the published helpline, silently (OQ4) |

---

## §7 — INHERITED RULINGS (standing, not re-litigated here)

1. **Design is FROZEN.** No new colour, radius, shadow or duration; `FROZEN_RATCHET` is per-file and may
   only shrink, so a new `.tsx` with a hand-typed value is an instant red with nowhere to put an
   exemption.
2. **Ali, 2026-08-27:** a self-exclusion period is a MINIMUM; the account is not reinstated by itself.
   This is why marketing needs its own predicate and `isLockedOut` is left alone.
3. **Read tiers (2026-08-26):** masked at rest, reveal audited; the §7 list shrinks only.
4. **Swahili is the default** since `8822b648`; `sw` glosses are copied, never invented.
5. **No fabrication:** a promise about money is computed from measured data, never stated as a constant.
6. **One filter language** across the console; one home for every design decision.
7. **Blackball facts** (`docs/BLACKBALL-SMS.md`): 400-for-everything, `status` is the verdict, 12-char
   sender, ≥20-char reference, no per-message id. ⭐ Receipts arrive and settle rows since 2026-09-23 (§3a).

---

## §8 — DEFECT REGISTER (D1–D25)

Each is a real defect measured this session, owned by exactly one unit, and named inside that unit's §9
text. The one-line summaries are in §1; what follows is what each one actually is.

- **D1 · `toMsisdn255("00255712345678")` → `"2550255712345678"`** (`phone-normalize.ts:82`). ⚠️ **Latent
  today**: every current caller is pre-validated by `tzPhone`, which rejects the `00` form. It becomes
  live the day a file supplies numbers — which is this programme. **U1**
- **D2 · Nothing refuses a malformed msisdn at the wire boundary.** `sendBatch` writes its row, posts,
  and reads back a 400 with no per-message reason. A `BAD_MSISDN` refusal must happen **before** the row
  is written. **U1**
- **D3 · No NDC → operator map, and `tzPhone` accepts 60/70**, which no licensee holds. Additive,
  marketing-only validation (OD4/OD5). **U2**
- **D4 · No segment arithmetic exists**, and the only GSM-7 table lives inside `sms-blackball.ts`, a
  server module a composer cannot import. Two tables would disagree invisibly, and the disagreement is a
  bill. **U3**
- **D5 · No SMS carries a sender identity, an opt-out or the statutory RG message.** **U4**
- **D6 · The helpline has two values and six print sites.** `support-config.ts:120` pins `0800 11 0011`;
  the Gaming Board's Advertising Code names `0800110051` three times. ⚠️ `global-error.tsx` keeps its own
  hand-written copies **by design** (it must not import), so the guard asserts they EQUAL the constant
  rather than removing them. **U5**
- **D7 · There is no SMS suppression list.** **U6**
- **D8 · `marketingOptIn` carries no channel, no wording, no evidence and no history.** **U6**
- **D9 · `isLockedOut` lifts itself** when the chosen period elapses (`responsible-gambling.ts:382`), so a
  24-hour self-exclusion is marketable 25 hours later. **U10**
- **D10 · `push-service` gates on that same predicate** and inherits the lift. Filed here; changed only
  by owner ruling. **U10**
- **D11 · No age check anywhere on outbound messaging.** **U11**
- **D12 · Three published RG commitments have no code** (`legal/responsible-gambling/page.tsx:84,86`).
  Vacuously unbroken only because nothing markets yet. **U12**
- **D13 · The published late-night window does not exist.** **U13**
- **D14 · No per-person frequency cap.** **U14**
- **D15 · `invite-service.sendCampaign` is a second send path**, ungated by consent and holding `withLock`
  across `sendBatch` — closed today only by the withdrawn-bonus flag. ⚠️ No suite executes that branch,
  which is why it is removed rather than maintained. **U15**
- **D16 · New PII stores would sit outside erasure and retention**, as `SmsMessage` already does. The
  guard is structural: grep the schema for phone/e-mail columns and require each owning model to appear
  in both files or be listed with a reason. **U16**
- **D17 · Five doors** (§5.9). **U17**
- **D18 · No admin uploader, no CSV parser, 1 MB actions.** **U27**
- **D19 · A pre-flight that reports which numbers are players is a membership oracle** for a role that
  may not read a number at all. **U30**
- **D20 · `sendBatch` updates `SmsMessage` rows one at a time** — and the patch is identical for every row
  in a chunk, because the gateway's verdict is per-request. **U45**
- **D21 · The DLR route updates `InviteEntry` only.** ⭐ Rewritten 2026-09-23: receipts now arrive and settle real rows in seconds (§3a), so this is no longer "a fan-out nothing feeds" — it is the one arm a campaign recipient needs and does not have. **U46**
- **D22 · No `MARKETING` purpose** — folding 50k rows into `INVITE` destroys the invite lane's meaning
  and makes a per-lane cost report impossible. **U35**
- **D23 · The 30 s `withLock` timeout** makes the existing send shape unusable at campaign scale. **U43**
- **D24 · No budget.** The only spend control is a TZS 50 floor — eight messages. **U49**
- **D25 · `comms-registry.ts` states as measured fact that SMS is "OTP + invite campaigns".** That
  sentence becomes false on the first marketing send. **U50**

---

## §9 — THE UNITS

Every unit: what it ships, the guard, the RED control that proves the guard, an **Accept** line, and —
for `visual` units — a **States:** line naming at least six states to build and capture, `loading` and
`error` among them. ⛔ Suites are named by
key only (e.g. `test:tz-msisdn`); each lives at `scripts/<key without the prefix>.test.mts` and is created
in the commit that first names it in code (§11a.1).

### Phase A — foundations and permission (U1–U16)

**U1 · One phone key, and a refusal at the wire** — `src/lib/phone-normalize.ts`, `src/lib/server/sms.ts`
Fix D1 (`00`/IDD prefix, and `normalizeTzLocalDigits`'s matching wrong answer). Add D2: `sendBatch`
refuses a message whose msisdn is not exactly 12 digits starting `2556|2557`, with code `BAD_MSISDN`,
**before** the `SmsMessage` row is written. Twelve written-out vectors (⛔ not round numbers):
`0712345678`, `712345678`, `255712345678`, `+255712345678`, `00255712345678`, `+255 712 345 678`,
`255-712-345-678`, `+254712345678`, `0222123456`, `0701234567`, `'+255712345678` (our own export's
formula guard), `255712345` (short).
Extends the existing `test:phone-normalize` suite and its existing red control — ⛔ no new `red:` key.
**Gates:** `test:phone-normalize`, `test:selcom`, `test:payout-rails`, `test:payout-destination`,
`test:msisdn-prefill`, `test:otp-delivery`, `test:shell-boundary`.
**RED:** restore the naive `startsWith("0")` branch → the `00255…` vector must fail.
**Accept:** every vector maps to one stated result; a 16-digit msisdn can no longer reach the gateway; the
payout suites are green in the same run.

**U2 · The Tanzanian number library** — `src/lib/tz-msisdn.ts` (pure, client-safe) (D3) — ✅ SHIPPED S1
`parseTzNumber(raw) → { verdict, e164, msisdn, ndc, operator, display, reason }` with verdicts `ok |
not_a_number | too_short | too_long | landline | foreign | unallocated_prefix`, each carrying **one
sentence in words** for the operator, never a code. `isSendableTzNumber` is the one-line form.
⛔ `e164` and `msisdn` are non-null **only** when the verdict is `ok`, so a refusal cannot hand out a
number something downstream might send to.
**The NDC table is TCRA v1.16 (issued 2026-07-01, doc `TCRA/DICT/CRTM/PLA-NMSP/002`)**, not the 2020
edition this unit was drafted from — see §3d for the five rows that moved. Corroborated row by row
against Google libphonenumber's TZ ranges and carrier map, which carry GSMA **IR21** provenance per
range (the filing international aggregators actually route from); the two sources agree on every code
except 60. The edition, publisher, document number, both source URLs and a human `reviewed` date are
in the file.
⭐ **Three rulings the research forced, none of them in the original text:**
① **The operator is the RANGE HOLDER, not the network the subscriber is on.** ⭐ Mobile number
portability has been LIVE in Tanzania since **March 2017**, under TCRA's own MNP Regulations — a
ported number keeps its NDC and changes network, and has been able to for nine years.
⚠️ **The instrument that nearly said otherwise is worth keeping.** The ITU's E.164 notification
answers *"sans objet"* in its portability row, which reads like "not applicable — no portability
here". It is not: that row asks for a **LINK** to a public real-time ported-number database, and TCRA
supplied no URL. ⛔ A BLANK FIELD IS NOT A NEGATIVE FINDING — one careless reading of it would have
licensed exactly the inference this rule forbids.
⛔ `walletHint` is therefore display-only and **may never choose a payout rail** —
§7 of the suite asserts no payment module and no wallet screen imports the table (the pure display
formatter is allowed, and the withdraw page uses it). A withdrawal routed on "074… therefore M-Pesa"
reaches the wrong provider for anyone who has ported.
② **Where the regulator and the carriers disagree, the parser ACCEPTS and flags.** The asymmetry is
not close: a number wrongly refused is dropped from every campaign for ever and nobody finds out; a
number wrongly accepted costs TZS 6 and produces a receipt that never arrives — which, since §3a, is
something this platform can see. NDC 60 is exactly that case and is marked `disputed` in the file.
③ **064 is allocated on paper and dead on the wire** — Telxer Enterprise Limited, no carrier-map entry
since 2022-09-08, excluded from libphonenumber's TZ mobile pattern, absent from TCRA's own quarterly
subscriber table. ⛔ `isGatewayMsisdn` ACCEPTS `25564…` by design, so this module is the only thing in
front of it; §5 asserts that seam in both directions.
⚠️ **Reach is not uniform across the codes this calls `ok`.** Since 2025-06-16 an unregistered
alphanumeric sender ID is blocked outright on Vodacom, Airtel, Yas and Zantel; Halotel and TTCL may
REPLACE a registered one; numeric sender IDs are supported by nobody. `ok` means "a real Tanzanian
mobile number", never "this will arrive looking the way you wrote it". U41 and U52 inherit this.
⭐ Moves `formatTzPhone` out of `phone-input.tsx` into this module and has the input import it back —
and takes the **second, drifted copy** with it: `wallet/withdraw/page.tsx` rendered the same shape with
`.replace(/(\d{3})(?=\d)/g, "$1 ")`, which has no nine-digit cap and groups every run of three. The two
agreed on every nine-digit input and diverged on everything else, which is why nothing caught it.
⛔ No calendar-triggered assertion: the suite asserts the review date parses and PRINTS its age.
⭐ Built for §3c's scale: every regex is a module-level constant and the NDC index is built once at
module load. `tzTableBuildCount()` makes that falsifiable — measured at 20,000 parses in 23 ms
(~870,000/s), so 150,000 rows cost about 0.2 s.
**Guard:** `test:tz-msisdn` (in-memory `--prove-red`). **Also:** `test:client-graph-safe`, whose pinned
set this unit ADDS `tz-msisdn.ts` and `phone-normalize.ts` to — ⚠️ that ratchet walks only a hard-coded
list, so it had no opinion about either module and was decoration for them. ⛔ `test:shell-boundary`,
named on this unit in the original draft, is E-70 (plain `<a>` across shells) and can neither pass nor
fail on a module move.
**RED:** `red:tz-msisdn`, 24 proofs — the 2020 answers for 63 and 66; ⛔ **070 refused as unallocated,
which is the unit's own drafted control, backwards**; 064 accepted; the formatter re-inlined with the
withdraw page's regex; a wallet screen importing the table; an always-ok and an always-refusing parser;
a refusal that still hands out an msisdn; a disputed row refused rather than accepted; and a parser that
rebuilds the index per call.
**Accept:** every verdict has a fixture; both call sites of the display formatter resolve to one
function; the table's edition, sources and review date are in the file.

**U3 · Segment arithmetic, one home** — `src/lib/sms-compose.ts` (pure, client-safe) (D4) — ✅ SHIPPED S2
`SMS_LIMITS`, `sizeSms`, `planSms`, `encodingFor`, `offendingChars`, `SMS_MAX_SEGMENTS`, the GSM-7 basic
table and its extension set (`€ [ ] { } \ ^ | ~` and form feed cost **two septets** each), UCS-2 at 70/67,
an emoji at two UTF-16 units. 🔴 In the same commit `smsCodingFor` in `sms-blackball.ts` **delegates** to
this module, and §5 asserts identity over a corpus — without that, the price the officer reads and the
coding the gateway gets come from two tables. Boundary vectors: 159/160/161, 305/306/307, 69/70/71,
133/134/135, plus a 160-septet body whose last character is an extension character.
⭐ **THREE THINGS FOUND WHILE BUILDING IT, EACH OF WHICH CHANGES A NUMBER SOMEONE PAYS:**
① **Segments are PACKED, not divided.** `ceil(units / perSegment)` is the arithmetic everyone writes and
it is wrong: a two-septet character may not be SPLIT across a segment boundary. 152 plain characters then
77 euro signs is 306 septets, which division prices as **2** segments and which actually sends as **3** —
one segment of slack, or **TZS 900,000** at 150,000 recipients (§3c).
② ⛔ **THE SPECIFIED BOUNDARY VECTORS CANNOT SEE THAT.** All eight round-number vectors above are plain
text, and on plain text packing and division agree exactly. A suite built only from them would have looked
thorough, passed, and never caught the defect that costs the money. The red control asserts this about
itself: the division plant breaks **exactly one** assertion, and it is the extension-character one.
③ ⚠️ **`String.length` is CORRECT for UCS-2** — it already counts an emoji as its two UTF-16 units — and
wrong only for GSM-7 extension characters. That is why pricing from `bodyLen` looks fine: it agrees with
the truth on every emoji and every Chinese body, and disagrees only on `€ [ ] { } \ ^ | ~`.
⛔ **THE STANDARD IS NOT THE BILLER, AND THE MODULE SAYS SO.** All of this is GSM 03.38. No multi-segment
message has ever been sent on this account, so none of it is reconciled against a Blackball invoice —
`SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER` is `false` and `planSms` marks every answer `estimated`. The one
place the two could differ is whether the provider charges extension characters at two septets or counts
characters. U52's capped live drive cross-checks a deliberately multi-segment body against the portal's
own `COUNT` column (§3b: that column IS the billed segment count), and flips the flag from an invoice,
never from a reading of the standard.
⭐ `planSms` returns **quantity, never currency** — the rate is the provider's and belongs with the ledger
(U49), not in a pure module that would go stale the day it changes and would then be a fabricated promise
about money (§7.5). `SMS_MAX_SEGMENTS` is 2, computed from money: one segment to 150,000 contacts is
TZS 900,000, so a third needs an owner's signature rather than a longer text box.
**Guard:** `test:campaign-compose`. **Also:** `test:client-graph-safe`, whose pinned set this unit adds
`sms-compose.ts` to — from the commit that MOVES the table, not the one that first imports it.
**RED:** `red:campaign-compose`, 15 proofs — priced from `String.length`; UCS-2 counted by code point
(the plausible over-correction); segments divided rather than packed; a second GSM-7 table that dropped
the euro sign; an always-one-segment sizer; an always-GSM-7 sizer. ⛔ Two of the first plants written here
were aimed at nothing and the control caught them — the baseline-plus-specific-assertion shape is what
made that visible.
**Accept:** `smsCodingFor(s) === sizeSms(s).encoding` over a corpus containing both encodings; `bodyLen`
is never used to price; the moved table is asserted byte-for-byte against a copy of the pre-move string.

**U4 · The statutory envelope** — `src/lib/marketing/footer.ts`, `src/lib/sms-compose.ts` (D5) — ✅ SHIPPED S2
The engine-appended footer, per locale, un-removable and counted:
`\n50pick 18+ 0800110051 Acha: 50pick.tz/s/<8>` — **49 septets, computed and asserted, never typed**.
A compose-time gate that the body **begins** with `50pick` (ETA s.32(1)(b)), one that the opt-out token
is present and the right length (a message with no way to stop is unlawful), and one that names the
character that pushed a body out of GSM-7. The single-segment operator budget is therefore **111**
characters — `160 − 49`, computed — and the composer prints THAT, not 160.
⭐ **Every Swahili fragment is COPIED, and the lines are cited in the file** (§5.13, OQ9): `miaka 18+`
from `i18n-dict.ts` `tanzaniaMobile18` — the string on the registration screen every player already
passes — and `Acha` from `unfollow` ("Acha kufuatilia soko hili"), this product's existing verb for
"stop doing this". `18+` is a symbol rather than prose deliberately: the shipped sentence "miaka 18 au
zaidi" is fifteen septets and the whole footer has forty-nine to spend.
⭐ **THE SHORT DOMAIN IS DERIVED FROM `appUrl()`, NEVER TYPED.** A typed domain is a bill waiting to
happen: a longer one silently pushes every single-segment campaign into two, and a stale one prints a
link that no longer resolves. Deriving it makes a domain change a failing assertion instead of an
invoice. Measured 2026-09-25: the apex `https://50pick.tz/` answers 200, so the `www.` is dropped and
four septets are returned to the officer — ⚠️ but §3b says a `curl` 200 is not proof a BROWSER reaches
a page, so U8's live drive confirms the opt-out link before any message carries it.
🔴 **THE HELPLINE HERE IS DELIBERATELY NOT THE ONE `support-config.ts` PUBLISHES**, and §12 of the
guard asserts that they DIFFER. `support-config.ts` pins `0800 11 0011`; the Board's Advertising Code
names `0800110051` three times. That is OQ4, Ali's to answer — ⛔ not a thing to resolve by quietly
making the two agree, which is exactly what an "obvious cleanup" would do. The footer carries the
regulator's number because a statutory footer citing a helpline the regulator does not recognise is the
failure that matters, and no published page is changed silently.
⚠️ **OQ3 is priced rather than argued about:** `operatorBudget(locale, sourcePhrase)` takes the source
phrase, and with a realistic one the budget falls from 111 to **85**. If the lawyer's answer is "in the
body", that is the number the composer will show.
**Guard:** `test:campaign-compose` §9–§12. **RED:** `red:campaign-compose` — the composer sizing the
BODY while the engine sends body + footer (every quote short by 49 septets: a 147-character body reads
as one message and sends as two); the identity check dropped; the footer made optional; the opt-out
token unchecked.
**Accept:** no marketing body can be composed without the footer — there is no call shape that
produces one, which is the only way "un-removable" is true of software rather than of a policy
document; the footer's length is asserted against a token of the real minted length; the 111 is
computed from the footer and the single-segment limit, not written down.

**U5 · One helpline** — `src/lib/support-config.ts` and its print sites (D6) — ✅ SHIPPED S3
🔴 **THE PRODUCT HALF OF THIS UNIT WAS ALREADY BUILT, AND THE PLAN DID NOT KNOW.** Measured at S3
before writing any code: the statutory helpline is already ONE pinned constant with no setter and no
persisted field; `global-error.tsx` already keeps its four hand-written copies **by design** (it is
the root error boundary and must import nothing, because it renders when the root layout itself has
failed); and `test:support-contact` §15 already **discovers** every helpline-shaped literal in that
file rather than listing line numbers, asserts each equals the constant, and carries its own controls
that the file still publishes the number at all and that the detector rejects a drifted copy. The
support-and-care campaign shipped it. ⛔ Building it again would have been a second implementation of
a working one.
⭐ **WHAT WAS ACTUALLY MISSING WAS THE CONTROL.** `test:support-contact` is fifteen sections, one of
the most careful suites in this repo — and it had **no `red:` key at all**. Fifteen sections on trust.
§5.11 says every guard ships with a control that reintroduces the real defect, so this unit ships
`red:support-contact`: four mutations, 4/4 caught each on its OWN named assertion, tree restored
byte-identical.
⭐ **DECLARED ANCHORS, NOT AN IN-MEMORY PLANT, AND THE REASON MATTERS.** The suite reads the tree from
disk — that IS its method — so an in-memory plant would have to fake the whole sweep and would then be
testing the fake. Mutating the real file is what proves the sweep sees it. Declaring the anchors in
`scripts/anchors/support-contact.anchors.mjs` also keeps `test:red-anchors`'s undeclared count at 68
against its ceiling of 65 — ⭐ measured before and after: **unchanged**.
⚠️ **TWO OF THE FOUR MUTATIONS ARE CONTROLS ON THE SUITE'S OWN CONTROLS.** §15.1 passes perfectly over
a file that has stopped printing the helpline altogether — every surviving copy still matches — so one
mutation DELETES a copy rather than drifting it and requires §15.2 to be the thing that fires. Another
drifts the `tel:` href while leaving the printed text right: a drifted display string is a bad number
to read out; a drifted href dials one.
⭐ **AND THE SUITE UNDER TEST CAUGHT THIS UNIT'S OWN FIRST DRAFT.** The mutation that makes the
statutory helpline operator-settable first used the operator's REAL desk number as its replacement
literal, and §8 — "no support contact is a literal outside `support-config.ts`", whose sweep includes
`scripts/` — refused the whole harness because the tree was already red. A red harness that seeds a
real contact number into the tree is a red harness that leaks one. The replacement is now plainly fake.
⛔ **D6 IS NOT CLOSED BY THIS UNIT AND STAYS ⬜.** Its engineering half is done — one home, every copy
pinned, drift now impossible and PROVEN impossible. Its substance is **which number is correct**, and
that is OQ4: we publish `0800 11 0011`, the Board's own Advertising Code names `0800110051`. ⛔ Not a
thing to settle by making them agree — `test:campaign-compose` §12 asserts the marketing footer's
number still DIFFERS from the published one, precisely so an "obvious cleanup" fails instead of
turning an open owner question into a silent product decision. When Ali answers, the constant moves
and §15 forces all four copies to move with it.
**Guard:** `test:support-contact` (already on `predeploy`; §13.1 asserts that).
**RED:** `red:support-contact` — 4/4, declared anchors.
**Accept:** `grep` finds the number in exactly the declared places, all equal — and, added here, the
guard that says so is now proven able to fail.

**U6 · Consent ledger + suppression** — schema, both DALs, `dal-parity` §17 (D7, D8) — ✅ LIVE S3b
`MessagingConsent` (append-only: channel, `identifier` = the one key, category, status, source, **verbatim
wording**, locale, evidence, recorder, time) and `Suppression` (`@@unique([channel, identifier,
category])`). From this commit, the profile toggle and registration ALSO append a ledger row. ⛔ Zero
backfill (OD8). ⛔ `Suppression` rows are never deleted — not by contact deletion, not by re-import.
**Guard:** `test:dal-parity` §17 + `test:marketing-consent-ledger`. **RED:** `red:dal-parity` gains nine mutations
(the wording dropped from the read mapper and from the create; an `update` added to the ledger; a
`deleteMany` added to suppression; an upsert that refreshes `createdAt`; the id tiebreak removed from
either twin) — 24/24 caught. `red:marketing-consent-ledger` is in-process: the wording re-rendered from
English, the second decision lost, an unusable identifier accepted, re-suppression replacing the row —
4/4, after a §0 baseline proving the shipped code passes first.
**Accept:** both DALs, named types, the new section's own control green; a withdrawal survives a
re-import. ✅ All four met and MEASURED, and ✅ LIVE on `32067c92` — the drive is `scripts/live/marketing-u6-consent-ledger-drive.mjs`, which REFUSES to report unless it reached the commit it was told to prove (7/7, three controls). The withdrawal/re-import pair is proven twice over: in Postgres
(a second suppression for the same triple refused `23505`, two consent rows coexisting, the GIVEN row
un-overwritten) and in the memory twin (re-suppression returns the row already there, with its
ORIGINAL `createdAt`).

⛔ **THREE THINGS THIS UNIT WAS TOLD THAT WERE NOT TRUE, corrected here rather than worked around:**
① §0 said a migration could not be verified on a machine without Docker. `db-scratch.mts` does not use
Docker — it loads `embedded-postgres` (`:129-146`), already installed, and raises PostgreSQL 18.3.
② This unit was told to add §7 "with its own planted-key control". §7–§16 were long since taken, and the
gate has had a planted-key control at §0 since it was written; U6 took §17 and EXTENDED the existing
`red:dal-parity`. A second control beside a working one is the U5 mistake in mirror image.
③ The enum rule is narrower than §0a states: it binds a value added to an EXISTING enum (`55P04`), which
is U35/D22's problem, not a brand-new type, which may be created and used in one transaction.

⚠️ **AND `marketingOptIn` HAS FIVE WRITERS, NOT THE TWO THIS UNIT WIRED.** Registration and the profile
toggle now append; the 730-day retention lapse (U16 owns it, explicitly), account closure
(`user-service.ts:147`) and erasure (`erasure.ts:476`) do not. Until they do, the ledger and the boolean
disagree after any of those three. ⛔ Not absorbed into U6 — closure and erasure are currently unowned.

**U7 · The ONE gate** — `src/lib/server/marketing/consent.ts`
`mayReceiveMarketingSms(msisdn) → { ok } | { ok:false, skipReason, detail }`, ordered exactly as §5.6.
Suppression first; then, if the number belongs to a `User`, that user governs (RG standing → account
status → `marketingOptIn`); otherwise the ledger governs. ⛔ A contact-book row can never override a
player's own "no".
**Guard:** `test:marketing-consent` (14 assertions on the real gate). **RED:** `red:marketing-consent`,
in-process, 4/4 — consent asked before suppression, the phone bridge dropped, an elapsed self-exclusion
re-permitting marketing, an imported row speaking over a player's own no. ⭐ It runs TWO controls before
planting anything: the shipped gate green, and the defect-free MODEL proven to agree with it on every
fixture, so a red case's failure is attributable to its flag rather than to a sloppy model.
**Accept:** four mutually exclusive states in one run (allowed / suppressed / no consent / RG), so neither
an always-open nor an always-closed gate can pass. ✅ Asserted as a PROPERTY (assertion 13), not hoped for.

🔴 **THE TRAP THIS UNIT FOUND, AND THE REASON IT IS THE MOST IMPORTANT LINE IN IT:** this platform
stores phone numbers in **two** formats and nothing said so. `User.phoneE164` is written from `tzPhone`
(`validators.ts:32-37`), which returns **`+255XXXXXXXXX`**; the marketing key, the SMS wire and
`MessagingConsent.identifier` all use `toMsisdn255`, which returns **`255XXXXXXXXX`**. Measured: unequal
for EVERY input, including `+255712345678` itself. So `db.user.findByPhone(<marketing key>)` returns null
for **every player**, and the obvious gate would hand the entire player base to the ledger branch — the
one branch that must never govern a player (OD10) — silently, with no error anywhere. `userPhoneKeyFor`
is the bridge; assertions 12 and 12b pin it in BOTH directions, because a bridge asserted only in the
working direction is a bridge that can be deleted without the guard noticing.
⚠️ **Any later unit that looks a player up by a marketing key inherits this** — U8, U24, U30 and U44 all
do. Use `userPhoneKeyFor`, never a bare `findByPhone`.

⛔ **NOT in this unit, by design, so nobody reads a false completeness into it:** cooling-off and harm
markers (U10), age (U11), the frequency cap (U14), the window (U13) and the Board's approval (U41) are
separate gates in the loop. U7 answers suppression, consent, self-exclusion standing and account status.
⭐ `minimum_served` is refused, not only `serving` — a 24-hour self-exclusion that elapsed a year ago is
still a refusal (D9, OD12). U10 adds the rest ON TOP of this; it does not replace it.

**U8 · Opt-out that works** — `src/app/s/[token]/{page,actions}.tsx`, `src/lib/marketing/optout.ts`
An 8-character token minted per recipient at enqueue (unique index), never expiring, no login. One click
writes: the suppression row, a `WITHDRAWN` ledger row carrying the page's exact wording, and — when the
number belongs to a player — `marketingOptIn = false` through the **existing** `privacy.
marketing_consent.withdrawn` audit action. Resubscribe is the second button on the same page, never a
condition of the first. Rate-limited per IP; `noindex`; a bad token says so plainly and ⛔ never shows a
false success.
**Guard:** `test:marketing-optout`. **RED:** make the token expire; make the click require a confirmation.
**States:** loading · valid token · already suppressed · resubscribed · invalid token · error.
**Accept:** a minted token suppresses on production in the U52 drive, and the number is refused at the
next dispatch.

⛔ **SCOPE CORRECTED BEFORE BUILDING (S4), because this unit's premise fails twice over.**
① **There is no recipient row to hang a token on.** `SmsCampaign` does not exist; `InviteCampaign` /
`InviteEntry` (`schema.prisma:783,806`) are the unrelated referral system and carry no token. The
recipient table is U35 (S18) and the minting is U42 (S21) — both far downstream of S4. Worse, U35's own
field list in this plan names no opt-out token column at all (the `claimToken` there is U43's slice
token). So U8 ships **its own** token store, keyed by token and mirroring `Suppression`'s triple, which
U42 later writes into at enqueue.
② **Nothing mints one yet, so the production half of Accept cannot be met in S4.** `marketingFooter()`
(`footer.ts:86`) builds the string `50pick 18+ 0800110051 Acha: 50pick.tz/s/<token>`, but `composeMarketing`
and `marketingFooter` have **no callers outside `campaign-compose.test.mts`** — no message carries a `/s/`
link today. ⭐ The production half therefore moves to **U42 (minting) and U52 (the Seal drive)**, and is
NOT claimed here. What U8 proves on production is that the page serves, refuses a bad token without a
false success, and suppresses a token planted through the DAL.

🔴 **AND A COLLISION NUMBER OD43's LENGTH HIDES.** `randomId` returns **hex** (`crypto.ts:109-111`),
so the obvious `randomId(4)` is 16⁸ = 4.3×10⁹ — about **2.6 expected collisions per 150k-recipient
campaign** (§3c), i.e. near-certain. The repo's ambiguity-free 32-character `CODE_ALPHABET`
(`agent-application-service.ts:1330`) gives 32⁸ = 1.1×10¹² and ~1% per campaign — and because OD43 says the
token **never expires**, that 1% compounds for ever. ⛔ So the alphabet is the 32-character one, the column
is UNIQUE, and **minting retries on conflict**. ⚠️ U42 must NOT use `createMany({ skipDuplicates: true })`:
that emits `ON CONFLICT DO NOTHING` with no target, so a token collision would silently drop the whole
recipient row — a person who is never messaged and never appears as a failure.

⚠️ **Three things this unit needs that the plan does not say:** `/s` joins `GA_EXCLUDED_PREFIXES`
(`google-tag.ts:32-41` already names this exact hazard for the invite token, so a token would otherwise be
sent to Google in a page path); `/s` must stay OUT of `PROTECTED_PREFIXES` (`proxy.ts:40`) or the no-login
promise breaks; and every player lookup goes through `userPhoneKeyFor` (U7), never a bare `findByPhone`.

**U9 · The gate runs in the loop, and the proof of it** — `test:marketing-consent`
The unit is the guard: a fixture that opts out **between** slice one and slice two, and must not receive
slice two's message.
**RED:** hoist the gate to list-build time → the suite must fail. ⭐ If it still passes, the suite was
testing the list, not the send, and the control has found the worse defect.
**Accept:** the mid-send opt-out fixture is red before the in-loop gate exists and green after.

**U10 · The marketing RG predicate** — `src/lib/server/marketing/rg.ts` (D9, D10)
`marketingRgStanding(userId)` built on `selfExclusionStanding` (⛔ not `isLockedOut`, which is not
modified), cooling-off, and `detectHarmMarkers`, with six-months-minimum semantics and a fresh
post-restoration consent required. Each refusal carries its own skip reason and an audit line matching the
`push.suppressed.rg_lockout` precedent. D10 is filed as an owner item, not silently changed.
**Guard:** `test:rg-doors` + `test:marketing-consent`.
**RED:** plant a player whose standing is `minimum_served` — a control planting only `serving` would pass
today and prove nothing.
**Accept:** a player who self-excluded for 24 hours a year ago is still refused.

**U11 · 18+** — the loop (D11)
Account-linked: `dob` must yield ≥18 at send time. Contact-only: marketable solely when the import
recorded an explicit 18+ attestation (U33). Unknown → `skipped` with `age_unknown`.
**Guard:** `test:marketing-consent`. **RED:** treat a null `dob` as adult → the fixture must fail.
**Accept:** three fixtures — adult, minor, unknown — each with its own outcome.

**U12 · The published promise, reconciled** — `/legal/responsible-gambling` (D12, OQ6)
Build what exists (U10 + U11 suppress self-excluded, cooling-off, harm-marked and under-18 recipients).
Then either build an age band and a vulnerability-segment definition, or re-version §4 to say only what
runs — Ali's call, recorded. ⛔ The engine does not go live while the page claims something it cannot do.
**Guard:** `test:privacy-notice` (the whitelist of audience attributes is asserted inside it, so the
notice and the audience builder are gated by one suite). **RED:** add a behavioural field to the audience
whitelist → red. **Accept:** the page and the engine agree, and the guard can prove it.

**U13 · The send window** — `src/lib/marketing/window.ts` (D13, OQ5)
`08:00–20:00 EAT`, evaluated server-side in the loop against `Africa/Dar_es_Salaam`; both candidate
windows are named constants with the arithmetic written out; outside the window rows are **HELD**, the
campaign pauses with `quiet_hours` and resumes by itself. ⛔ The document and the UI both say this is
50pick's own rule, not a TCRA rule.
**Guard:** `test:marketing-window`. **RED:** clock at 03:00 EAT → every dispatch must be held.
**Accept:** a campaign started at 19:55 holds at 20:00 and resumes at 08:00, and the held rows are counted
as outstanding, never as failures.

**U14 · Frequency cap** — the loop (D14)
One message per number per 72 h, four per 30 days, counted from `SmsMessage` rows with purpose MARKETING;
the skip carries the release date.
**Guard:** `test:marketing-consent`. **RED:** two campaigns an hour apart → the second must skip.

**U15 · One send path** — `src/lib/server/invite-service.ts` (D15)
Retire the phone half: delete the `sendBatch` block (unreachable today behind the withdrawn-bonus flag),
replace it with a refusal naming the new surface, keep `InviteEntry`, `bindRegistration`, the email lane,
the admin pages and the DLR's invite arm untouched. Then the **structural** guard: grep the pattern
`sendBatch(` across `src/` and assert the non-OTP call sites are exactly one module. ⛔ A hand-written
file list is the consolidation trap; grep the pattern.
**Guard:** `test:marketing-engine` §1 + `test:invites` + `test:invite-flow` + `test:withdrawn-features`.
**RED:** add a second non-OTP caller → red.
**Accept:** exactly one module may send a non-OTP SMS, provable by grep.

**U16 · Erasure and retention reach the new stores** — `retention.ts`, DSAR export/erasure,
`docs/DATA-RETENTION.md` (D16)
Import rows expire 90 days after the run; recipient rows are the proof of what was sent and are **not**
deleted; ledger rows are never deleted; suppression rows are **never** deleted, ever. ⚠️ Fix in the same
pass: the 730-day marketing lapse clears the boolean without appending a ledger row, so the two disagree
after the first lapse. The guard is structural — grep the schema for phone/e-mail columns and require each
owning model to appear in both files or be listed with a reason.
**Guard:** `test:retention` + `test:dsar-secrets`. **RED:** add a model with a phone column → reported.
**Accept:** `/admin/retention` and the published schedule name the same rows.

### Phase B — the contacts book (U17–U34)

**U17 · Five doors** — `/admin/contacts` exists and is reachable (D17)
`NAV_GROUPS` + `ROUTE_KEYS` (Growth group, label **"Contacts"**), `ROUTE_DOMAINS` `["/admin/contacts",
"growth"]`, `layout.tsx` with `AdminSectionGate`, `loading.tsx` (`SkKpiRow` + `SkFormCard` +
`SkTableCard`), and the `filter-language` `ADMIN_SURFACES` entry. ⚠️ Prefix order in `ROUTE_KEYS` is
load-bearing.
**Guard:** `test:rbac`, `test:admin-nav`, `test:admin-section-gate`, `test:filter-language`.
**RED:** remove the `ROUTE_DOMAINS` row → the page must become invisible to GROWTH, and the suite red.
**States:** loading · empty · populated · in-progress (n/a) · refused (no act right) · error.
**Accept:** a GROWTH session reaches the page; an unlisted role does not; the skeleton's declared height
equals the real block.

**U18 · The book** — `MarketingContact`, `ContactList`, `ContactListMember` + both DALs + `dal-parity` §8
`msisdn` (bare 255, `@unique` — OD3/OD32), `rawInput`, `displayName?`, `email?`, `ndc` (denormalised so
the operator filter is an index scan), `operator?`, `source`, `sourceRef`, `userId?` (a LINK, never a
copy — an erased player must not survive inside a marketing row), `consentState`, `suppressedAt`, `tags`,
`notes`, `importId?`, audit columns; GIN index on `tags`, indexes on `ndc`, `consentState`, `createdAt`.
**Guard:** `test:dal-parity` §8. **RED:** a planted key in one mapper only.
**Accept:** named types, both halves, the section's own control green.

**U19 · Masked by construction** — `sensitive-fields.ts`, `read-tiers` §7/§8 (OD25)
A new `contactPhone` registry entry keyed by **contact** id (⛔ a separate field from `phone`, for the
same reason `msisdn` is separate — the subject is a different row). Every render goes through
`<Sensitive>`; the query-shaping object literal gets its `GOVERNED_REVIEWED` entry with a reason. ⛔ "Copy
number" is a REVEAL: a masked role gets no copy control at all, because an absent control cannot be
forged.
**Guard:** `test:read-tiers`. **RED:** render the raw column → red.
**Accept:** a GROWTH session sees `+255••••01` everywhere, including the export and the failure lists.

**U20 · The list** — `/admin/contacts` server-paged
Nine columns (select · Name · Number · Operator · Consent · Reachable · Lists/Tags · Source · Added),
`SortTh`/`parseSort` tie-breaking on `id`, ⚠️ **"Operator" sorts by `ndc`** and the header says so (a
localised label cannot survive paging), `Pagination` with `parsePage` clamped, whole-book `AdminKpi`
counts by `groupBy` (⛔ never the filtered view), and `SearchBox` in url mode whose `q` is **normalized
through `parseTzNumber`** so `0712 345 678`, `712345678` and `+255712345678` all find one row.
**Guard:** `test:contacts-page` + `test:search-adoption`.
**RED:** drop the query normalization → the `0712…` fixture returns 0 rows.
**States:** loading · empty book (its own copy) · populated · in-progress (n/a) · no-match (different
copy, with the clear-filter action) · error (`AdminLoadError`, never a zero).
**Accept:** page 4 of a 3-row result renders row 1–3, not "no matches".

**U21 · Filters** — `contact-filters.tsx`
One rail of `FilterPill rank="dense"`: consent · reachability · operator · list · tag · source, all in the
URL. ⭐ The operator pill's value is a **brand**, expanded to its NDC set by the one table — a hand-written
NDC array on the page would be the second list.
**Guard:** `test:filter-language`. **RED:** add an undeclared rail → §0.4 red.
**States:** loading · none applied · applied · in-progress (n/a) · no-match with the rail STILL rendered ·
error. ⛔ An empty filter that removes its own controls is a known trap here.

**U22 · Add and edit one contact** — `contact-form.tsx` in a `Modal`
`PhoneInput`; a live verdict under the field on every keystroke (operator `Chip` as soon as two digits
land; one sentence for every refusal); duplicate check on blur that offers **"Open the existing
contact →"**. ⛔ There is no "save anyway" — `msisdn` is unique and a button that violates a constraint is
a button that lies. Consent defaults to **"No consent recorded"**.
**Guard:** `test:contacts-page`. **RED:** default consent to granted → red.
**States:** loading · blank · typing (chip + verdict) · saving · refused (duplicate / invalid) · error.

**U23 · Selection and bulk** — the bar
Selection is a `Map<id,row>` (rows, not ids), and "select all N matching" stores the **filter**. Actions:
add to list · tag / untag · record consent · suppress · export · remove. Confirmations **enumerate** (name
+ masked number, first 20 + "and N more") below 50, and take a typed word above 50 or when the audience is
a filter — ⚠️ re-enforced **server-side**. Toasts report server-counted results ("2,981 tagged · 431
already had it").
**Guard:** `test:contacts-page`. **RED:** confirm from a client-supplied count → the server must refuse.
**States:** loading · none selected · selected (bar) · acting (overlay) · refused (act gate, with the
reason in `title`, never hidden) · error.

**U24 · One audience resolver** — `src/lib/server/marketing/audience.ts` (OD36)
`contactAudience(filter)` — the ONE place a filter becomes a query, read by the list, the counts, every
bulk action, the export and the campaign. A ticked-row selection is expressed as a filter.
**Guard:** `test:contacts-audience`. **RED:** a second query path → the structural grep fails.
**Accept:** the count the list shows, the count the export writes and the count the campaign confirms come
from one function, proven by a fixture where all three are read in one run.

**U25 · The CSV reader** — `src/lib/contacts/import-parse.ts` (pure)
RFC 4180: quotes, doubled quotes, embedded newlines, CRLF, **BOM strip**, the `sep=` directive, and a
delimiter vote counted **outside quotes, on the header line only**. `detectFormat` lets content beat the
filename (a `.txt` of vCards is vCards).
**Guard:** `test:contacts-import`. **RED:** count the delimiter inside quotes → the embedded-comma
fixture mis-splits.

**U26 · The vCard reader** — `src/lib/contacts/vcard.ts` (pure)
⛔ **Both** continuation rules in ONE walk (RFC 2425 folding and quoted-printable `=`) — separate passes
corrupt each other silently. `itemN.` group prefixes, bare 2.1 params (`TEL;CELL`), 4.0
`TEL;VALUE=uri:tel:`, preferred-first, and cards counted so "12 cards, 9 rows" is sayable.
**Guard:** `test:contacts-import`. **RED:** split the two continuation rules into two passes → red.

**U27 · XLSX, server-side, and the boundary that proves it** — `src/lib/server/contacts/import-xlsx.ts`
(D18)
`exceljs` behind one server action, base64, **capped at 700 KB** with the remedy named on screen ("save it
as CSV — there is no size limit on CSV"). ⚠️ The phone cell is read as `typeof cell.value === "number" ?
String(Math.round(cell.value)) : cell.text` — `cell.text` gives `"2.55713E+11"` and that is lossy and
unrecoverable. One `ParsedContactsFile` shape, two producers.
**Guard:** `test:contacts-boundary` (no `"use client"` file under the contacts trees may transitively
import `src/lib/server/**` or `exceljs`) + `test:contacts-import`.
**RED:** import `exceljs` into the dialog → the boundary guard goes red **while `typecheck` stays green**,
which is the entire point.

**U28 · One field list, four readers** — `src/lib/contacts/contact-fields.ts` (pure)
`CONTACT_FIELDS` feeds the export header, the import aliases, the sample sheets and the mapping panel —
Swahili aliases included (`simu`, `jina`, `nambari`, `makundi`, `maelezo`), because the operator's own
sheet will be in Swahili; ⛔ the export HEADER row stays English so our own importer can re-read it, and
the reason is written at the top of the file. One `displayName`, no first/last split. Tags split on `,`,
`;` and `|`. A `<SampleSheetButton>` beside **every** file entrance, and the suite drives each generated
sample back through the real parser.
**Guard:** `test:contacts-import`. **RED:** add a field with no sample value → red.

**U29 · Staging** — `ContactImport`, `ContactImportRow` + both DALs (OD30)
Rows are posted in batches of ≤2,000 (≈200 KB — a 5× margin under the 1 MB action limit) into staged
rows; the run row carries the buckets, the written counters and a `cursor` that is an ordinal into the
rows this run owns (⛔ never an offset into a query).
**Guard:** `test:dal-parity` §9. **RED:** a planted key in one mapper only.
**Accept:** a closed tab, a reload and a redeploy all leave the run resumable, and the totals come back
from the server.

**U30 · Pre-flight** — writes nothing (OD31, D19)
Six buckets — `new`, `inBook`, `isPlayer`, `dupInFile`, `invalid`, plus `unreadable` counted separately —
and `assertPreflightAdds` is **exported so the suite asserts it**. `dupInFile` carries the winning **row
number**, and the rule is printed: *"When a number appears twice, the FIRST row in your file wins."*
`invalid` carries the §U2 sentence, never a code. Row numbers are 1-based over the **unfiltered** grid.
🔴 **D19:** for any role whose `identity.contact` cell is not `read`, the `isPlayer` bucket returns a
COUNT and never a per-row flag; the run is rate-limited per officer and audited.
**Guard:** `test:contacts-import` + `test:read-tiers`.
**RED:** drop one bucket increment (the assertion must throw); leak the per-row flag to a masked role;
count rows before and after over a 5,000-row fixture and require zero delta.
**States:** loading · no file · reading · pre-flighted (buckets + columns matched + unmapped + dup list +
basis picker) · refused (no `Phone` column — the column NAMED) · error.

**U31 · `decide()`** — one rule, three choices (OD32)
Keep what's in the book (default; counted `skipped`, ⛔ never `failed`) · take the file's version
(overwrite name/email/notes, **MERGE** tags) · fill blanks only. Bulk choice with a per-row override keyed
by **file row number** (⛔ not array index). A row whose contact is suppressed **collapses to keep**
whatever was asked. ⛔ Consent is never written by an import path — a withdrawn row can never be
re-granted by a file.
**Guard:** `test:contacts-import`. **RED:** write `GIVEN` over a `WITHDRAWN` row → red; remove the
suppressed collapse → red.
**Accept:** the Apply button's label, the confirmation and the request all read the same `decide()`.

**U32 · The commit loop and its bar** — `contacts-import-dialog.tsx` (OD34)
Batch size **derived, not copied**: commit 1 ships a ping action; after deploy, 20 sequential calls from a
browser on `www.50pick.tz` give p50/p95 recorded in §3 with the date and the `data-dpl-id`; Cloudflare
kills a proxied request at 100 s, so the budget is 60 s (a stated 40 % margin); the per-row fallback is
concurrency-bounded at **6–8**, because the bet admission gate is sized from the same pool.
`<ProgressBar value={written} max={total}>` with `Batch 4 of 12 · 1,847 of 5,912 written` beneath. Stop is
read between batches and rows already written stay written. A server refusal stops the loop and shows the
REASON. Reopening **adopts** an unfinished run and offers "Resume — 4,065 rows remaining".
**Guard:** `test:contacts-import`. **RED:** drive the bar from a timer → the stubbed-slow-batch assertion
must fail.
**States:** loading · idle · importing (bar + batch line) · stopped (reason + what landed) · done
(created/updated/skipped/failed + error list capped at 50 **with the true total beside it**) · error.

**U33 · Consent basis at import** — required before Apply enables (OD9, OD10, OQ10)
A basis picker showing each option's **verbatim stored wording** in full, plus a required proof note
(≥10 chars) and an explicit 18+ attestation. First-party bases write `GIVEN` ledger rows; ⭐ **"bought /
third-party list" writes `UNKNOWN`**, and the dialog says so in one sentence before Apply — that is what
stops this being a spam machine by default. The wording is copied onto every row the run creates and
⛔ never edited afterwards.
**Guard:** `test:marketing-consent`. **RED:** edit a stored wording → red; make a third-party basis grant
consent → red.

**U34 · Export** — `GET /api/admin/contacts/export`
Modelled on the transactions export: session + domain check answering **404** (don't confirm the endpoint),
RFC 4180 quoting, the `'` formula guard that the importer's `unguard` reverses, a **UTF-8 BOM written and
stripped as a PAIR**, the header named `phone_masked` when masked and `phone_e164` when full, masked unless
`mayReveal` — and a full pull writes `pii.revealed` **with the row count**. Travels as the FILTER through
`contactAudience`, and the audit names the filter rather than claiming "all".
**Guard:** `test:contacts-export`. **RED:** drop the `mayReveal` branch; write the BOM and stop stripping
it (the round-trip fixture's first header mangles).
**Accept:** export → re-import returns 0 invalid and 0 changed.

### Phase C — campaigns (U35–U49)

**U35 · Campaign models** — `SmsCampaign`, `SmsCampaignRecipient`, `SmsPurpose.MARKETING` (D22)
⚠️ **Two migrations**: one that does nothing but `ALTER TYPE "SmsPurpose" ADD VALUE IF NOT EXISTS
'MARKETING'`, deployed before any code writes it (Postgres refuses a value added in the same transaction —
the repo already paid for this once), then the tables. Campaign: name, `bodySw`, `bodyEn?`, coding,
segments, `audienceFilter` Json (⛔ a filter, never a list of ids, and it lives on the row so a confirmed
scope cannot be widened afterwards), `audienceCount`, status, `enqueueCursor` (prefixed, so a resume
cannot restart the wrong walk), stop reason, budget, estimate, window override, approval ids, timestamps.
Recipient: `msisdn`, `contactId?` (`SetNull`, never Cascade — deleting a contact must not erase the proof
we messaged them), `userId?` (stamped for the grid, ⛔ re-resolved at send), status, `smsReference?`
(nullable-unique), `failureClass`, `error`, `skipReason`, `claimToken`, attempts, segments, cost,
timestamps, **`@@unique([campaignId, msisdn])`**. ⛔ No stored counters.
**Guard:** `test:dal-parity` §10. **RED:** planted key; drop the unique index → the U43 concurrency
control must fail.

**U36 · The campaign list** — `/admin/campaigns` + its five doors + the nav badge (OD39)
Label **"SMS campaigns"** — ⚠️ never "Campaigns": `/admin/invites` already heads "Invite campaigns" and two
identically-labelled entries is a support ticket waiting to happen. `getSidebarBadges` gains one count
(running, or paused with outstanding rows) rendered as a `CountBadge`.
**Guard:** `test:admin-nav`, `test:rbac`, `test:admin-section-gate`.
**States:** loading · empty · populated · in-progress (a running campaign's row) · refused · error.

**U37 · The composer** — `/admin/campaigns/new` (OD42, OD44)
One page, three cards, no wizard. Swahili body required, English optional; exactly one placeholder
`{jina}` with an operator-typed fallback; a live counter per variant showing segments, coding, characters
left, *"Forced to Unicode by: ’"* (on this platform every UCS-2 character is a stray, so the hint always
fires and is always right) and *"Includes the stop link, which is required and is counted"*; a read-only
sender line; and **test-send-to-my-own-number** (⛔ never a typed number — a typed number is how a test
reaches a player) with the composed text shown verbatim beside it.
**Guard:** `test:campaign-compose`. **RED:** size before appending the footer; allow a typed test number.
**States:** loading · blank · typing (counter live) · over-cap · refused (missing SW body / body does not
begin with `50pick`) · error.

**U38 · The audience** — same page (OD26)
Pills for source · consent · network · list/tag, a `DateTimeRangeFilter` for "joined between", all in the
URL and all registered. The split, server-counted: **matching · reachable · will receive · not receiving**,
with every reason line named and counted, in neutral ink. `describeAudience(filter)` renders the filter in
words — ONE implementation, shown in the builder, the confirm, the campaign row and the page a month
later. A sample of five, masked, in the enqueue's own order. ⚠️ A permanent info callout: on day one
"will receive" is small and "no permission on record" is nearly everyone, because consent defaults to
false and there is no backfill — so the first operator does not file a bug against a working system.
**Guard:** `test:campaign-audience`. **RED:** derive a count on the client → red.
**States:** loading · no filter · filtered (the split) · computing · empty audience · error.

**U39 · The estimate** — segments for GROWTH, money for accounting (OD24)
Segments × recipients, the per-segment cost **measured** from the balance walk over recent accepted sends
(⛔ never a bare constant — the caption says "estimated from the last N sends" or "configured, not yet
measured"), the **live** balance read fresh (⛔ never the 15-minute in-process snapshot, which is
per-container), and what that balance covers in recipients. A duration **floor**, not a promise.
**Guard:** `test:read-tiers`. **RED:** render TZS unconditionally → a GROWTH session must show no `TZS`.
**States:** loading · no audience yet · segments only (GROWTH) · segments and money (accounting role) ·
balance unreadable (says so, never guesses) · error.

**U40 · Confirm** — `ConfirmModal` (OD27, OD28)
≤5 recipients: **enumerate** every one. >5 or unfiltered: the filter in words, the four figures, the
sample, and a **typed number**. 🔴 The server compares the typed value against the count **it** recomputes.
`audience_moved` (count + watermark) refuses, sends nothing, and shows the new number. The destructive
button is never the focused element on open.
**Guard:** `test:campaign-gates`. **RED:** compare against the posted count → the stale-client fixture must
be refused and the suite must fail without the fix.

**U41 · Authorisation** — the Board's approval and two officers (OD17, OD18)
`SystemConfig` `gbt.advertising_approval` {reference, grantedAt, expiresAt, scope, documentUrl} — absent or
expired ⇒ dispatch refuses with one plain sentence on the page (⛔ not a disabled button with no reason).
`twoOfficerGate` above 50 recipients or TZS 10,000; the approver may not be the composer; the grant expires
in 60 minutes and is **re-checked in the loop**.
**Guard:** `test:campaign-gates`. **RED:** remove the in-loop re-check → a grant that expires mid-send must
stop the campaign, and the suite must fail; and let the composer approve their own campaign → refusal
required.

**U42 · Enqueue** — `src/lib/server/marketing/enqueue.ts`
Two keyset walks (contacts by `msisdn`, players by `phoneE164`), a prefixed cursor carrying the phase,
`createMany({ skipDuplicates: true })` against the unique index, chunks of 1,000, resumable, with a stated
backstop of 200,000 recipients reported rather than silently truncated. The opt-out token is minted here.
**Guard:** `test:marketing-engine`. **RED:** restart mid-walk → no duplicate row, no skipped row.

**U43 · The slice** — `src/lib/server/marketing/engine.ts` (D23, OD21, OD22, OD23)
`reap stranded claims (→ UNCONFIRMED, ⛔ never back to PENDING) → check status and window → claim ≤50 with
a token (findMany → conditional updateMany → findMany by token, so the won set is exactly readable) →
GATE each claimed row immediately before dispatch → ONE `sendBatch` → settle by `targetId` (⛔ never by
array index) → re-read the campaign status every chunk so Stop does not have to wait out a slice`.
A shop-wide refusal (balance floor, not configured, provider unrecognised) returns every claimed row to
PENDING, pauses the campaign with **one** reason and **one** audit row — ⛔ never N failed rows for one
shop-wide fact. Slice budget ≤50 recipients or 10 s, re-derived in U52.
**Guard:** `test:marketing-engine`. **RED:** ⭐ five concurrent drivers over 1,000 rows must produce exactly
1,000 sends — a single-driver test passes with or without the conditional claim, which is why the control
is concurrent; and removing the unique index must fail it.

**U44 · The pump** — `src/lib/server/marketing/pump.ts` (OD19, OD20)
Its own timer and its own leader lease, started from `instrumentation.register()`, yielding whenever the
lifecycle ticker is running, releasing its lease on SIGTERM so a redeploy hands over in seconds.
**Guard:** `test:marketing-engine`. **RED:** remove the yield → the fixture where lifecycle is running must
fail.
**Accept:** a campaign finishes with every browser closed, and a deploy mid-send resumes without a
duplicate.

**U45 · `sendBatch` at scale** — `sms.ts`, both DALs (D20)
`updateManyByReference(references, patch)` driven through the existing column map (same coercion, same
throw on an unmapped field, ⛔ no allow-list), turning 50 round trips into 1; and `settleMany(rows)` for the
per-row recipient write-back as ONE `$transaction([...])`. ⛔ No raw SQL — it would have no memory twin, and
every behavioural suite runs on memory.
**Guard:** `test:dal-parity` §6 (three new lines) + `test:marketing-engine`.
**RED:** an unmapped field must throw; a patch applied to a reference outside the list must fail.

**U46 · Receipts** — the DLR route's third arm (D21, OD41)
`targetType === "SmsCampaignRecipient"` fans out to the recipient with the monotonic guard **in the WHERE**,
mirroring the existing `SmsMessage.recordDlr`. `ACCEPTED` becomes `UNCONFIRMED` after 15 minutes without a
receipt; ⭐ `UNCONFIRMED` is deliberately **not** terminal, so a late receipt can still settle it — exactly
as `SmsStatus.UNKNOWN` is not terminal one layer up, and the two layers must agree.
**Guard:** `test:sms-dlr`. **RED:** a receipt must move the row; a replay must not; a late FAILED after
DELIVERED must be discarded; an `UNCONFIRMED` row must still settle.
⭐ **The `SmsMessage` half of this is PROVEN on production (§3a)** — 11 seconds, `applied: 1`,
`mismatch: 0` — so this unit adds the recipient arm to a rail that works, and its live acceptance is a
campaign receipt moving a `SmsCampaignRecipient` row, not the first receipt of any kind. ⚠️ Receipts
arrive in BATCHES (three lines in one POST, measured), so the fixtures use multi-line bodies, and only
`DELIVRD` has ever been seen live — every failure fixture is synthetic until one arrives (§3b).

**U47 · The live campaign page** — `/admin/campaigns/[id]` (OD34, OD41)
The standing facts first, because each changes what the numbers mean: the list is not finished · the rail
is not configured · nobody is driving this (running, and no slice for 90 s, and the pump is not holding the
lease) · **no receipt yet for THIS campaign** (rendered from the data — receipts do work platform-wide
since 2026-09-23, §3a — so it disappears by itself the
day one does) · the mapped stop reason (⛔ never the raw key; an unrecognised key is still shown, labelled
as the engine's own words). Then four KPIs (**On campaign · Handed over · Failed · Skipped** — "handed
over", not "sent", and `accepted` is info, never green), two determinate bars that are never shown at once
(preparing: rows written / audience confirmed; sending: settled / rows), per-state chips from the
`groupBy`, and the controls (Start/Continue · Pause · Resume · Retry N failures · Stop) — **disabled with
the reason in `title`, never hidden**. Pause writes the campaign's status, not a tab's flag. ⛔ Retry is
never offered on a paused campaign: it would silently lift the pause.
**Guard:** `test:campaign-visuals` + `test:campaign-plan` (bucket arithmetic: HELD is **outstanding**, not
settled; `progressPct` of an empty campaign is **null**, so nothing paints a 0 % bar as progress).
**RED:** freeze the count server-side and require the painted width to be byte-identical after 10 s; move
HELD into settled → "a campaign that still owes people a message reads as complete" must fail.
**States:** loading · draft/not-prepared · sending (bar + spinner) · paused with a reason · done · error.

**U48 · Results** — same page
Failures and not-sent are **two sections**, because they need different actions. `AdminBarList` shows which
reason dominates; each label filters the recipients table below (one filter language, two views). The
table is server-paged, masked, with `AdminTableEmpty` **and the rail still rendered**. Export reuses the
one CSV writer. The event log reads the hash chain filtered on the campaign id, newest first, as
one-sentence rows — ⛔ no per-recipient audit row: the recipient rows are the record, and flooding an
unprunable chain is permanent.
**Guard:** `test:campaign-visuals`. **RED:** offer Retry on a skip → refusal required.
**States:** loading · no failures · grouped failures · filtered to one reason · empty filter result · error.

**U49 · Budget** — `budgetTzs` and the floor (D24)
A budget authorised at approval, decremented by **segments accepted**, auto-pausing at 90 % with a named
reason; a second, higher marketing floor enforced in the one place `sms.ts` already decides whether a batch
may spend money; and a refusal at **Start** when the projection exceeds the live balance — not at message
40. ⛔ A refused reply's `balance: 0.0` is never recorded as the account's balance.
**Guard:** `test:sms-cost-guard`. **RED:** projection above the live balance must refuse at Start; a
MARKETING batch below the marketing floor must refuse while OTP still sends.

### Phase D — registry, docs, proof (U50–U52)

**U50 · Declarations** — `comms-registry.ts`, `boot-checks.ts`, audit actions (D25)
A MARKETING lane declaring the **envelope** (sender, purpose, footer, consent gate, no `Notification` row)
and its own verbatim-wording assertion (§5.12). Boot warns when marketing is enabled without the webhook
secret — without it DELIVERED is structurally zero and the report reads as "nobody got it". New audit
actions registered: `marketing.campaign_created|started|paused|cancelled|slice`, `marketing.optout`,
`marketing.suppressed`, `contacts.imported|exported`, `pii.revealed`.
**Guard:** `test:cert-c1`, `test:cert-c3`, `test:audit`. **RED:** send a body with no footer → red.

**U51 · The operator's guide** — `docs/HOW-TO-SEND-A-CAMPAIGN.md` + updates (OD46)
Plain words, for Ali: what a campaign costs, what "handed over" means and why DELIVERED lags it by seconds
to minutes (and what `UNCONFIRMED` means when a receipt never comes), how
to stop one, what the refusals mean and what to do about each. Plus `docs/BLACKBALL-SMS.md` (the marketing
lane), `docs/DATA-RETENTION.md` (the new rows), `docs/COMPLIANCE-DECISIONS.md` (every ruling in §4 and
§4a).
**Guard:** `test:docs`. **Accept:** an operator who did not write it follows it once, and what they got
stuck on is fixed in the doc.

**U52 · The live drive, and the Seal** — production, ledger-capped
`live:marketing` drives a real campaign of **≤6 chargeable sends to +255772619619 only**, with its own
ledger file (gitignored), proving by **discrimination**: a suppressed number is refused while an eligible
one is sent in the same run; the opt-out link is tapped on the handset and the next send to that number is
refused; the provider's own portal `COUNT` is compared against `planSms`; the slice budget and batch size
are re-derived from the measured latency; and the session confirms it is on the new build via
`data-dpl-id`.
**Guard:** `test:marketing-engine` + the §1a closure list. **RED:** the drive must fail if the gate is
removed — the refusal is the evidence, not the send.
**Accept:** all nine closure conditions in §1a, ticked with dates.

---

## §10 — SESSION ORDER (two units per session)

| S | Units | Why this pairing |
|---|---|---|
| S1 | U1 · U2 | one key and one number library — everything else reads them |
| S2 | U3 · U4 | the counter and the envelope: what a message costs and what it must contain |
| S3 | U5 · U6 | one helpline; the ledger and the suppression list |
| S4 | U7 · U8 | the gate, and the way out of it (a gate with no exit is not lawful) |
| S5 | U9 · U10 | prove the gate runs in the loop; the RG predicate |
| S6 | U11 · U12 | age, and the published promise reconciled |
| S7 | U13 · U14 | the window and the cap |
| S8 | U15 · U16 | one send path; erasure and retention reach the new stores |
| S9 | U17 · U18 | the route exists; the book exists |
| S10 | U19 · U20 | masked by construction, then the list |
| S11 | U21 · U22 | filters, then one contact |
| S12 | U23 · U24 | bulk, then the one resolver it proves |
| S13 | U25 · U26 | CSV and vCard |
| S14 | U27 · U28 | XLSX + the boundary guard; the field list |
| S15 | U29 · U30 | staging, then the pre-flight it makes resumable |
| S16 | U31 · U32 | `decide()`, then the loop that executes it |
| S17 | U33 · U34 | consent basis; export (and the round trip that proves both) |
| S18 | U35 · U36 | campaign models (enum migration first), then the list |
| S19 | U37 · U38 | composer and audience — read together or not at all |
| S20 | U39 · U40 | the estimate, then the confirmation that quotes it |
| S21 | U41 · U42 | authorisation, then the enqueue it guards |
| S22 | U43 · U44 | the slice, then the pump that drives it |
| S23 | U45 · U46 | scale, then receipts |
| S24 | U47 · U48 | the live page, then its results |
| S25 | U49 · U50 | budget; declarations |
| S26 | U51 · U52 | the guide, then the live drive and the Seal |

⚠️ U30, U43 and U47 are the three most likely to overrun. If one will not fit, **split it before starting**
and write the split into §2 — a half-built unit is worse than a smaller one.

---

## §11 — VERIFICATION

1. **Per unit:** the guard is written first and proven RED against the real defect, then green; the unit's
   own suites pass; `npm run predeploy` passes (with the new key added to the chain in the same commit).
2. **Two stores:** `test:dal-parity` gains a section with its own planted-key control.
3. **Whole tree:** `node scripts/test-all.mjs`, diffed against clean `main`. ⚠️ 20 suites are already red
   there; the only claim allowed is "no suite red that is not red on clean main". ⚠️ `predeploy` includes
   `qa:live` and `test:admin-section-gate`, which need a dev server on the expected port.
4. **Live, by discrimination:** after the deploy, confirm the build via `data-dpl-id`, then run the check
   that fails when the feature is absent. For U52, the evidence is the **refusal** (a suppressed number not
   sent) alongside a successful send in the same run, capped at **6 chargeable sends to +255772619619**
   with a gitignored ledger.
5. **Visual:** every `visual` unit's six states at 1280×800 and 360×780, plus reduced motion, with
   `HeadlessChrome` in the UA — screenshots **opened and read**, into `.qa-shots/marketing-setup/<unit>/`.
6. **Tracker:** `test:marketing-setup-plan` and `test:tracker-hygiene` before every push.

### §11a — The four repo-wide gates that punish a new programme

1. **`test:docs`** fails on any `npm run <name>` or `scripts/<file>.<ext>` in `docs/*.md` that does not
   exist. **This document names suites by KEY only** (`test:tz-msisdn`), never as a path and never after
   the words "npm run", until the commit that creates them — at which point that unit's §9 text is
   rewritten to the full forms in the same commit, and `test:docs` then guards them too. The only full
   forms written today are the tracker guard's, which commit 1 creates. ⛔ A `shots/…png` path is written
   only in the commit that commits the PNG.
2. **`test:red-anchors`** counts undeclared harnesses with `===` against 65. Every new `red:` key either
   plants in memory or declares anchors. ⛔ The tracker guard's own file contains no write-call token, even
   in a comment.
3. **`test:tracker-hygiene`** reads the topmost `⏭️ **RESUME AT` block in `LIVE-QA-CAMPAIGN.md` §6b and
   cross-checks the finding ids it names. Our pointer is prose **inside** that block: no new marker, no new
   finding id.
4. **`test:guards-exist`** hard-fails on a backticked `test:*` cited from `src/`, `scripts/` or `prisma/`
   that has no `package.json` key. The key lands in the same commit as the first docblock citing it.

---

## §12 — RISKS

| Risk | Why it is real here | What this plan does |
|---|---|---|
| A marketing send breaks the law before the lawyer answers | the penalties are criminal (≥ TZS 5m / 12 months; licence revocation) | the surface ships CLOSED behind the Board's approval record (U41), and every one of the ten questions has a built default (§4a) |
| A GROWTH officer learns who gambles | a pre-flight that separates "already a player" from "new" is a membership oracle | U30 returns a COUNT for masked roles, rate-limits the run, audits it, and its RED control runs **as the masked role** |
| The tracker reports progress that did not happen | a "yes" in a Guard column is free text | the guard **resolves** the key in `package.json`, the script on disk, and a sibling red control (WIRING §4, plants 10–13) |
| A fix to `phone-normalize` breaks payouts | `selcom.ts` shares `toMsisdn255` | U1 runs the payout, OTP and prefill suites in the same gate list |
| A session breaks a repo-wide gate at 2am | three gates fail on things a new programme naturally does | §11a, repeated in §0's TRAPS |
| One number is messaged twice | three mechanisms hold it, and removing any one silently loses the property | U43's control runs **five concurrent drivers over 1,000 rows** |
| A unit proves too big for a session | the shipped equivalent is ~17,500 lines | 52 units; §10 names the three likely to overrun and requires a split **before** starting |
| A prose citation rots | no gate can check a sentence in a document | every citation in §3 and §8 is re-derived at the start of the session that touches that file |

---

## §13 — SIX-LENS REVIEW (S0, 2026-09-16)

| Lens | What it attacked | What changed |
|---|---|---|
| **Compliance & law** | a consent flag collected under three different promises; imported leads with no lawful basis; three published RG commitments with no code; self-exclusion that expires on its own timer; a mandatory safer-gambling suffix missing from the arithmetic; a URL-only opt-out in a feature-phone market; **and the one nobody had: a gaming advertisement needs the Board's approval, and unsolicited SMS needs its prior WRITTEN approval** | U6/U7's verbatim ledger · OD9's first-party-only rule · U11/U12/U13 · U10's standing predicate · U4's counted footer · U8 plus a specified-but-unclaimed inbound STOP · **U41 and OQ1: the surface ships closed** |
| **Money & cost** | a floor worth eight messages as the only spend control; per-segment billing costed per message; a 15-minute balance snapshot treated as current; `accepted` counted as delivered | U49's budget and the refusal at Start against a fresh balance read · U3's septets · U39's measured unit cost · U46's `UNCONFIRMED` |
| **Code truth** | a red control that would have turned `test:red-anchors` red for both checkouts; an enum used in the transaction that added it; a 1 MB action carrying a 30k-row file; a segment counter that cannot import its own table; five code doors called three | in-memory `--prove-red` · U35's two migrations · OD29's browser parse · U3's pure module with `smsCodingFor` delegating · §5.9's five doors, repeated in §0 |
| **Completeness & trackability** | 22 units for ~17,500 lines of precedent; a guard column nothing resolved; four owner requirements (progress bars, loading systems, rendering perfection, animations) with no acceptance | 52 units · the resolving Guard column · a six-state **States:** line on every `visual` unit, enforced by the tracker |
| **Adversarial / red-proof** | a typed-number gate built from the value it checks; boundary vectors chosen as round numbers; a progress bar a timer could fake; a concurrency claim provable by a single driver | OD27 · U1's twelve written-out vectors and U3's 159/160/161 · U32's rows-not-time control · U43's five concurrent drivers |
| **The officer's screen** | a failure list with no dominant reason; a retry that re-sends to someone who opted out; a refusal with no remedy; a dashboard showing 0 % delivered as failure | OD40 · retry only for retryable reasons · U41's plain sentence · U47's data-driven receipts callout |

**The four claims a reviewer should attack first**, because each is the kind that passes while being wrong:

1. *"One number messaged twice is structurally impossible."* It rests on the unique index **and** the
   conditional claim **and** one normalization key. Remove any one and the property is gone.
2. *"The consent gate runs before every dispatch."* True only while the gate is **inside** the loop — U9
   exists to keep it there.
3. *"The counter and the invoice cannot drift."* True only while `smsCodingFor` delegates to the one
   module (U3), and U52 closes it against the provider's own `COUNT`.
4. *"The broadcast surface ships closed."* True only while the approval is re-checked **in the loop** as
   well as at Start (U41) — a start-only check lets an expired approval finish a 50,000-message send.

---

## WIRING — what session S0 does when this plan is approved

**1 · Write the plan of record.** This document becomes `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`.

**2 · Write the tracker guard** — `scripts/marketing-setup-plan.test.mts`, registered as
`test:marketing-setup-plan`, with `red:marketing-setup-plan` = the same file with `--prove-red`. Copied
from the Mobile Visual Plan's guard (same `ok()` harness, same `section()`/`cells()`/`isTableRow()`
helpers, same `commitExists()` via `git cat-file -e <sha>^{commit}`), re-anchored on this file, plus four
checks that guard does not have:

- **§1 · status discipline** — ✅ needs an existing SHA, a `→` with content either side, `yes` in
  RED-proven and a live date; 🔵 a SHA and no date; ⏸ a reason; ⬜ nothing. An unknown status fails.
- **§1b · ⭐ the Guard and RED columns are RESOLVED, not read** — for every ✅/🔵 row the Guard key exists
  in `package.json.scripts` and the script it runs exists on disk; for every ✅ row the RED cell names a
  backticked `red:` key that exists and is either in-process (`--prove-red`, write-free source) or names
  an anchors file. ⛔ Without this a session can write "yes" beside a harness nobody wrote.
- **§1c · visual units show their states** — a ✅ row of kind `visual` whose §9 body has no `**States:**`
  line naming at least six states, `loading` and `error` among them, fails. This is the
  only mechanical hold on "progress bars, loading systems, rendering perfection".
- **§2 board ↔ units**, **§3 defect integrity** (owner exists, one owner in both places, named inside its
  unit, never ✅ before its unit), **§4 ▶ NEXT names no ✅ unit**, **§5 the two doors agree** (anchored on
  this programme's own token **and** asserting the matched slice names this file, so it cannot read the
  neighbouring row), **§6 closure is earned** (every unit and defect ✅, the nine §1a conditions, U52 ✅),
  **§7 every table renders**, **§8 every OQ named anywhere has a §4a row with a non-empty default**.
- **Positive controls:** at least 52 units and 25 defects are asserted directly and printed (a split
  raises the count, never lowers it) — a parser that finds nothing must go red, not green. And the
  red control itself first requires the untouched plan, a fully valid ✅ `pure` row and a fully valid ✅
  `visual` row to pass cleanly, so no plant can be caught by a break it did not make.
- **28 in-memory `--prove-red` plants** (built and caught 28/28 on 2026-09-17), each requiring the named rule
  to fire — and three controls that must pass cleanly first (the untouched plan, a fully valid ✅ `pure`
  row, a fully valid ✅ `visual` row): a ✅ with a SHA that is not a commit · no measurement · `→` alone ·
  RED `no` · no live date · a 🔵 carrying a date · a ⬜ carrying a SHA · a ⏸ with no reason · an unknown
  status glyph · a Guard key absent from `package.json` · a guard script missing from disk · a RED cell
  naming no red control · a red control that writes files with no anchors · a `visual` ✅ with its States
  line deleted · one naming only five states · a board row with no §9 heading · a §9 heading with no
  board row · a defect owned by a unit that does not exist · a defect with two different owners · a
  defect id missing from its unit's body · a defect ✅ above a ⬜ unit · ▶ NEXT naming a ✅ unit ·
  mismatched NEXT-PLAN counts · a NEXT-PLAN row that never links this file · an orphan table row · an
  unearned closure claim · a legal question named but never asked · a legal question with no default.
- ⭐ **Its first real run caught this plan.** Four units (U2, U3, U4, U6) did not name the defects they
  own; the unit text was fixed, not the guard.

**3 · Open the three doors.**
- `docs/NEXT-PLAN.md` — a new `## ▶ 0a · MARKETING CAMPAIGN & CONTACTS SETUP` row **directly under** the
  Mobile Visual Plan's `▶ 0 · … START HERE` row, which keeps its place per Ali's 2026-09-15 instruction.
  It carries the counts (`0/52 units ✅ · 0/25 defects ✅`), which machine and session runs it, and the
  rule that every session updates those counts in its own commit.
- `docs/README.md` — a Start-here row: what the programme is, that §0a is a copy-paste prompt for any PC,
  and that nothing on this platform checks marketing consent, suppression, opt-out or RG exclusion today.
- `docs/LIVE-QA-CAMPAIGN.md` §6b — one paragraph appended **inside** the existing topmost RESUME AT block
  (⛔ no new marker, ⛔ no new finding id) saying the programme exists, is not in flight, and that the
  mobile visual plan still has priority.

**4 · Gate and push.** `test:marketing-setup-plan`, its red control, `test:docs`, `test:tracker-hygiene`,
`test:red-anchors`, then `git commit --only` the six paths and push to `main` (docs + one script + two
`package.json` keys — no product code, so the deploy is a no-op).

**5 · Hand Ali the prompt.** Paste §0a into the chat so he can run it on the other PC.



