# NEXT SESSION — A6: turn admin 2FA ON in production (the last Wave 1 licence exposure)

**Paste this whole file as your opening prompt.**

**The round-2 design lane is CLOSED** at `69f516cd` (batch 4, 2026-08-13) — all three commissioned
surfaces shipped and verified live. That work is finished; its record is
[`PLAN-OF-RECORD.md`](PLAN-OF-RECORD.md) and nothing in it is open. **This session leaves the design
lane and rejoins the programme that commands the remaining work:**
[`docs/MODULE-CERTIFICATION-PROGRAM.md`](../docs/MODULE-CERTIFICATION-PROGRAM.md) — 52 modules, 12
domains, **4 certified**. Its §5 order-of-work names exactly one remaining Wave 1 item, and it is
this one.

---

## ⛔ THE BAR — Ali, verbatim, unchanged

> *"perfectly working, no glitches, 100% functional, no workarounds, clean code"* ·
> *"no half work accepted. only full work"* · *"visually perfect and data perfect and ready for
> live manipulation instinctively"* · *"you should perfectly finish, tested, validated,
> re-validated and re-analysed, then we push"*

**You act as ALL NINE roles on every change** (`.claude/skills/50pick-standards/SKILL.md` §1).
A change is not done until every lens signs off.

### The five rules that override convenience

1. **VERIFIED MEANS EXECUTED.** Run it, quote the output. A doc that names a file is **not**
   evidence the file changed — batch 4 found a third copy of a formatter the plan said had two, and
   it was on the busiest board, rendering "0m left" while a market was still taking bets.
2. **ASK OF EVERY CHECK: would this still pass if the feature were absent? Would it fail even if the
   product were fine?** Every refusal check needs a positive control **in the same run**.
3. **A DEFECT CAN BE INVISIBLE TO EVERY GATE AND OBVIOUS IN A FRAME.** Read every screenshot.
4. **NEVER `git add -A`.** Stage by explicit path. `git branch --show-current` first, `git fetch`
   before every batch. Every push to `main` is a LIVE deploy.
5. **DOCS TRAVEL WITH THE CODE, IN THE SAME COMMIT.** And a gate nothing runs is not a guard —
   wire every new gate into `predeploy` in the same commit, then parse the chain and assert all
   steps resolve to a real script.

---

## ▶ START HERE

1. `cd F:\kipindi-main` · `git fetch origin` · `git status` — expect **`main`, clean**, at or past
   `69f516cd`. ⚠️ One untracked file is **not yours**: `scripts/live/ops/house-money-census.cjs`.
   Never stage it — four sessions have now independently confirmed this.
2. `npm install` is normally **not** needed — if `package-lock.json` and
   `node_modules/.package-lock.json` share a timestamp, the tree matches the lockfile.
3. `.env.qa.local` exists on this machine and holds the five QA operator passwords. Gitignored.
   ⛔ Never `git clean -x` — it takes that file.
4. There is **no `.env`**, and there must not be: no `DATABASE_URL` → in-memory store, zero-risk
   local work.

**Boot + seed — one command now** (batch 4 promoted the whole sequence into a script):

```
$env:SESSION_SECRET='qa_local_session_secret_at_least_32_chars_long'
$env:OTP_PEPPER='qa_local_otp_pepper_16plus'
$env:DISABLE_ADMIN_TOTP='true'          # ⛔ REQUIRED or /admin/* redirects to /admin/2fa/setup
npx next dev -p 3009
npm run qa:board-bootstrap              # seed -> objection window 0 -> funded spread -> settle
```

⭐ `qa:board-bootstrap` reads every step's result BACK, because three separate things lie here:
`resolve-seed-markets` reports **attempts** (`resolved: 6` while 2 settled — assert the per-market
`state`), `stress-bulk-bet`'s `userPrefix` is **truncated to two characters** (distinct-looking
prefixes share one user pool, later bets are silently **rejected**, and `poolMath: "PASS"` stays
green through it — assert `accepted === n`), and its `yesRatio` is **probabilistic**, so only `0`
and `1` are deterministic.

---

## THE WORK — A6 · admin TOTP ON in production

### Why this one

`docs/MODULE-CERTIFICATION-PROGRAM.md` §5: *"Licence exposures that need no Selcom. **Start with
A6.**"* It is the only Wave 1 item that is an engineering task — **H6 needs Ali's ruling, not code**
(a hard-lock would reverse the owner decision of 2026-07-24 and break `test:two-admin`), and **G3
needs Ali's fee ruling** before the money core can start.

**The exposure is live and confirmed this session.** `https://www.50pick.tz/api/health` reports:

```
"security": { "adminTotp": "DISABLED" }
```

On a licensed real-money platform, the admin console — which holds the payment rail kill-switches,
balance adjustment and KYC override — is behind a password and an OTP, and **not** behind 2FA.
`test:cert-a6` (16 assertions) already exists and already pins the bypass to a closed set of four
doors; the honesty work is done. **What is missing is the switch actually being ON.**

### What this session owes

1. **Read the A6 dossier first** in `MODULE-CERTIFICATION-PROGRAM.md`, then
   `src/app/admin/layout.tsx:116` (`DISABLE_ADMIN_TOTP !== "true"`), `src/app/admin/totp-verify/`,
   `src/app/auth/admin/page.tsx:30`, and `src/lib/server/totp*`. The four bypass doors are named in
   the dossier — verify the list against the code, do not inherit it.
2. ⛔ **THE LOCKOUT HAZARD IS THE WHOLE RISK, AND IT IS NOT THEORETICAL.** Turning TOTP on for an
   account with no enrolled authenticator locks that account out of `/admin/*`, and
   **recovery is documented as identity verification with the AML lead — there is no self-service
   reset** (`/admin/2fa/setup` says so on screen). Before the flag flips on Railway:
   - enumerate **every** live account with `ADMIN`/`COMPLIANCE`/`MODERATOR` role on production,
   - confirm which of them have a TOTP secret enrolled **by querying, not by asking the UI**,
   - enrol the rest FIRST, and keep a proven second admin path open,
   - and have the rollback (`DISABLE_ADMIN_TOTP=true`) ready to paste, timed.
   ⚠️ `RoleDomainGrant` is **EMPTY on prod** and `AUDITOR`/`SUPPORT` have **no account anywhere** —
   so the enumeration may be shorter than the roles suggest. Verify; do not assume either way.
3. **This is an OPERATOR action, not only a code change.** The flag lives in Railway env, so the
   change is: enrol → verify enrolment → flip → verify the gate → verify `/api/health` flips to
   `"ENABLED"` → verify a real admin can still sign in. **Ask Ali before flipping it**, with the
   enrolment evidence in hand. Locking the owner out of his own console is not a recoverable
   mistake made at 2am.
4. **Certify the module properly** — all eight gates in §1's standard, each behind a named
   `npm run` script, with a RED proof per defect class. Then update the §9 status board and the
   §5 wave table in the same commit.

### After A6 — the order is already decided, do not re-derive it

**Wave 2 = the money core: G1 G2 G3 G4 → E1 E2 E3.** ⛔ **G3 needs Ali's fee ruling first**, so open
that question early rather than discovering it mid-wave. The G domain also resolves a known
**orphan TZS 100,000** and a broken chain.

---

## WHAT IS SETTLED — do not re-open

- **The round-2 design lane is closed.** Three pieces are **carried forward by decision** (density
  toggle / compact list · the mobile filter sheet · search typeahead — §8.8), and **filter UI for
  `/live`, `/watchlist`, `/leaderboard`, `/fairness` is NOT COMMISSIONED** (Ali, 2026-08-13).
  §8.7d's inventory is a *record*, not a backlog.
- **Still Ali's Phase-3 call:** the `--h-control-*` raise and the `--type-nano`/`--type-label` raise.
- **`test:responsive` is RED with 81 failures and they are PRE-EXISTING** — reproduced against
  `www.50pick.tz`. All global-header chrome, classified in §8.7g: one instrument artifact (the
  language listbox sits in the DOM under a *closed* trigger, so the audit measures options a user
  never sees), one real but only at **320px** (below the 360 floor PLAN §5.3 pins), and the known
  signed-in tabletL `Account menu` overflow. ⛔ Do not read that red as new, and do not "fix" the
  artifact. If you touch the global header, fix the two real ones deliberately, with frames.
- **`test:responsive` and `test:motion` are server-dependent** (default `:3000`, NOT among the 22
  static design gates). Pass `BASE=http://localhost:3009` or they die with `ECONNREFUSED` and look
  like product failures.

## The traps that cost time in the last four sessions

- ⛔ **Git Bash rewrites a leading `/` argument** into `C:/Program Files/Git/…`. Use
  `MSYS_NO_PATHCONV=1`. It struck three times in one session, and once made a QA sweep exit **0
  having measured nothing at all**. Redirect to a file and read it — never `| tail`, which reports
  `tail`'s exit code, and which truncated the evidence twice.
- ⛔ **`mt-12` is 128px here**, not 48 — this repo has a CUSTOM Tailwind spacing scale
  (`tailwind.config.ts`). Never read a spacing class from the Tailwind defaults.
- ⛔ **`boundingBox()` and a non-fullPage `clip` are both viewport-relative.** Pair document
  coordinates with `fullPage`, or the frame captures the sticky header and still looks plausible.
  And a `fullPage` frame renders the sticky header **mid-page** — an artifact, not a defect.
- ⛔ **A bounding-box measurement cannot see a hit-area fix.** Use `npm run qa:tap-hit`.
- ⛔ **A zero can be correct** — `00 SIKU` is the countdown's intended padding. And Swahili renders
  time-left as `dakika {n} zimebaki`, with the number in the **middle**, so a `(\d+)(unit)` probe
  matches the countdown in every locale and the label in none. Anchor probes on the product's own
  i18n templates, and assert the templates still exist.
- ⚠️ Write files containing regex or backslashes with the editor, not a shell heredoc — a heredoc
  ate a `\\` and produced an invalid regular expression.

## The instruments (all read-only, local OR production)

`qa:landing-seam` · `qa:tap-hit` · `qa:card-geometry` · `qa:board-bootstrap` (new in batch 4) ·
`qa:landing-shots` · `qa:discovery-probe` · `qa:discovery-board` · `qa:results-board` ·
`qa:filter-stress`. Contract gates: `test:hero-contract` · `test:discovery-contract` ·
`test:board-discovery` · `test:landing-contract` · `test:ticker-honesty` · `test:time-left` — **all
six are now in `predeploy` (78 steps); they were not before, in any batch.**
⛔ Screenshots are EVIDENCE: write them under `.qa-design-*/` (gitignored), never into the tree.

## DEFINITION OF DONE

- A6 is either **CERTIFIED** (eight gates, RED proofs, status board updated) or **explicitly
  blocked on Ali** with the enrolment evidence gathered and the question asked — not left ambiguous.
- ⛔ **The production flag is not flipped without Ali's go-ahead and a proven enrolment list.**
- Every gate green individually with real exit codes; any new gate has its own RED proof and is in
  `predeploy` in the same commit.
- `git fetch` shows no surprise commits; `git branch --show-current` is `main`; the push verified
  live (HTTP 200, clean `railway logs`, `/api/health` read, and a frame actually looked at).
- Docs updated in the SAME commit as the code they describe.
