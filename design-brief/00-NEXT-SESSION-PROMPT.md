# NEXT SESSION — BATCH 5: ONE filter language across the whole platform

**Paste this whole file as your opening prompt.**

**Ali, 2026-08-14, reading the live platform:** *"filtering is not designed properly, markets has a
different filter design than up and down. This is not acceptable in a consistent professional
platform. Please revise all filtering systems, make sure all is consistent and professional...
put all efforts, make them consistent and perfect and aesthetic, based on our newest design
patterns."*

He is right, and it is **measured, not opinion** — the scan below was run against production.
⛔ **A6 / admin 2FA is PARKED at Ali's instruction** (*"2fa we don't care now about it, later, we do
keep pending"*). Do not start it.

---

## ⛔ THE BAR — Ali, verbatim, unchanged

> *"perfectly working, no glitches, 100% functional, no workarounds, clean code"* ·
> *"no half work accepted. only full work"* · *"visually perfect and data perfect and ready for
> live manipulation instinctively"* · *"you should perfectly finish, tested, validated,
> re-validated and re-analysed, then we push"*

**You act as ALL NINE roles on every change** (`.claude/skills/50pick-standards/SKILL.md` §1).

### The five rules that override convenience

1. **VERIFIED MEANS EXECUTED.** Run it, quote the output. **A doc that names a file is not evidence
   the file changed** — batch 4 found a third copy of a formatter the plan said had two.
2. **ASK OF EVERY CHECK: would this still pass if the feature were absent? Would it fail even if the
   product were fine?** Every refusal check needs a positive control **in the same run**.
3. **A DEFECT CAN BE INVISIBLE TO EVERY GATE AND OBVIOUS IN A FRAME.** Read every screenshot.
4. **NEVER `git add -A`.** Stage by explicit path. ⚠️ **Another session shares this working
   directory** — `scripts/live/ops/house-money-census.cjs`, `docs/rates-for-admins.html`,
   `docs/50pick-rates-for-admins.pdf` and `scripts/generate-rates-pdf.mjs` are **NOT yours**.
5. **DOCS TRAVEL WITH THE CODE, IN THE SAME COMMIT**, and a gate nothing runs is not a guard —
   wire every new gate into `predeploy` in the same commit.

---

## ▶ START HERE

1. `cd F:\kipindi-main` · `git fetch origin` · `git status` — expect **`main`**, at or past
   `6d222766`.
2. `npm install` is normally not needed — if `package-lock.json` and
   `node_modules/.package-lock.json` share a timestamp, the tree matches the lockfile.
3. **`.env.qa.local` holds the credentials** — gitignored, does not travel. It now carries
   `ADMIN_LOGIN_PHONE` + `ADMIN_LOGIN_PASSWORD` (Ali supplied a live admin login on 2026-08-14) as
   well as the six QA operator passwords. ⛔ **Never write those values into a tracked file, a
   commit message, a doc or a screenshot.** ⛔ Never `git clean -x` — it takes that file.
4. There is **no `.env`**, and there must not be: no `DATABASE_URL` → in-memory store.

```
$env:SESSION_SECRET='qa_local_session_secret_at_least_32_chars_long'
$env:OTP_PEPPER='qa_local_otp_pepper_16plus'
$env:DISABLE_ADMIN_TOTP='true'
npx next dev -p 3009
npm run qa:board-bootstrap      # seed -> objection window 0 -> funded spread -> 8000/8000 -> settle
```

⭐ `qa:board-bootstrap` reads every step's result BACK — `resolve-seed-markets` reports **attempts**,
`stress-bulk-bet` truncates `userPrefix` to **two characters** (so bets get silently rejected while
`poolMath: "PASS"` stays green — assert `accepted === n`), and its `yesRatio` is probabilistic.

---

## THE SCAN — run against production 2026-08-14, this is the starting truth

**Six player surfaces filter. `/markets` is the reference BY LAW. Five diverge.**

| Surface | Control | Shape | Height | Inline style |
|---|---|---|---|---|
| `/markets` | status · sort · odds · pool · topic · search | **pill `999px`** | **44px** | 2 controls |
| `/results` | category rail | `8px` | 48px | yes |
| `/updown` | asset tabs | `8px` | 44 / 64px | **all** |
| `/updown` | duration tabs | `8px` | **40px** | **all** |
| `/positions` | 3 tabs | `8px` | **32px** | yes |
| `/proposals` | hot · new · listed · mine | `8px` | 48px | yes |
| `/updown/history` | day indicator + "All days" | `chip` + `btn-sm` | — | — |

**Correctly OUT of scope — verified, do not "fix" them:**
- `/leaderboard`, `/fairness` — **pagination only** (`?page=`), already on the shared `Pagination`.
- `/live`, `/watchlist` — **no `searchParams` at all.** No filtering exists to make consistent.
  ⚠️ Adding filters to these is a NEW feature, not a consistency fix. Do not.

**Re-run the scan yourself before touching anything** — `node .qa-design-round4/filter-language-audit.mjs
https://www.50pick.tz` if that scratch dir survives, otherwise rebuild it; it is ~90 lines and the
method matters more than the file: measure `borderRadius`, height, font-size and the presence of an
inline `style` attribute on the real rendered control.

### The three defects, named

1. **Shape.** Five surfaces use `rounded-md` (8px). The law is the pill (999px).
2. **Tap floor.** `/positions` renders **32px** and `/updown` durations **40px**. Law 9's floor is
   40; the round-2 bar is 44, which `/markets` holds everywhere.
3. **Inline styles.** Every diverging surface writes `style={{ background, border, color }}` at the
   call site — B9/B10 **law 82** says every value is a token consumed through a class.
   ⚠️ **`/markets` breaks this too** (its pressed chip carries an inline `background` +
   `boxShadow`), so the reference must be fixed as part of extracting it. Do not copy the flaw.

### 🔴 The deepest defect is not cosmetic

`discovery-bar.tsx` §COMPONENTS 3, the governing rule in the kit's own words: **only the SELECTED
chip carries an outline — an unselected chip is text on transparent.** *"Fifteen outlined capsules
in one bar was the single biggest source of the 'chunky' criticism the round-2 brief was
answering."* **Every diverging surface outlines EVERY control.** So they do not merely look
different — they contradict the reasoning the current design exists to embody. Fixing shape without
fixing this misses the point.

---

## THE WORK

### 5a · Extract ONE primitive — `src/components/ui/filter-pill.tsx`

The reference language, verbatim from `discovery-bar.tsx:80-84`:

```
kp-fchip inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5
whitespace-nowrap rounded-pill border text-[13px] font-semibold
pressed ? "px-4" : "px-3"
pressed ? "border-brand-400 text-text"
        : "border-transparent text-text-muted hover:bg-bg-overlay hover:text-text"
```

- ⚠️ **`min-h-[44px]` is an arbitrary value ON PURPOSE.** Tailwind's spacing scale is OVERRIDDEN in
  this repo (`h-8` = 48px, `h-10` = 80px, `tailwind.config.ts:156-171`), so a scale class here is
  silently the wrong size. **Never "tidy" it into `h-11`.**
- **Move the pressed styling out of the inline `style` into a class** (e.g. `.kp-fchip[data-on]`
  carrying `background: var(--pill-active)` + `box-shadow: var(--glow-selected)`). This is what
  brings `/markets` itself back inside law 82.
- Support BOTH semantics, because these are not all the same control: a filter toggle wants
  `aria-pressed`; a tab/segment wants `aria-current="page"`. One prop, both correct — do not ship a
  primitive that makes `/positions` lie about being a toggle.
- Keep `data-chip` / `data-count` — `qa:discovery-probe` and `qa:results-board` press exactly those
  and read the promised count. **Breaking them silently breaks the count-honesty proofs.**

### 5b · Convert the five surfaces

`/updown` (asset + duration) · `/results` · `/proposals` · `/positions` · `/updown/history`.

- ⛔ **`/updown`'s tabs are a `startTransition` filter, not a navigation** — read
  `updown-board-tabs.tsx`'s header before touching it. It keeps the live board on screen and dims
  it while the new one streams; plain `<Link>`s used to blank a live board mid-countdown. **Preserve
  that behaviour exactly**, and preserve the modifier/middle-click fallthrough.
- `/updown` durations are deliberately **quieter** than assets (secondary rank). Consistency does
  **not** mean identical weight — keep a defensible hierarchy while both speak the pill language.
  If you cannot express the hierarchy inside the primitive, that is a design question for Ali, not
  an inline style at the call site.
- `/updown/history` has **no day picker at all** — only an indicator and a clear link. Decide
  explicitly: give it a real picker in the one language, or leave it and say why.

### 5c · Guard it — `test:filter-language` + `red:filter-language`

Assert, per player filter surface: the control renders through the primitive · radius is the pill ·
height ≥ 44 · **no inline `style` attribute** on a filter control · only the selected one is
outlined. ⭐ **Carry a positive control**: assert the set of surfaces checked is non-empty and names
the six known ones, or a rename empties the list and the gate passes over nothing — the exact
failure that let a third time-left copy live for two batches. Wire it into `predeploy`.

### 5d · Verify — the counts may not move, only the language

`qa:discovery-probe` · `qa:discovery-board` · `qa:results-board` · `qa:filter-stress` **must stay
green against production** — promise == delivery is a money-adjacent property and this batch is
cosmetic. Then 4 widths (360/768/1280/1920) × 3 locales × 6 surfaces, **every control opened**, and
read the frames. `npm run qa:tap-hit` for anything whose hit area is not its box.

---

## WHAT IS SETTLED — do not re-open

- ⛔ **§4c is SUPERSEDED.** Batch 4 recorded "filter UI for `/live`, `/watchlist`, `/leaderboard`,
  `/fairness` is not commissioned" on the premise that filtering had **no design source**. That
  premise was wrong: `/markets`' pill language **is** the source, and it is already law. What
  survives is narrower and still true — **those four surfaces have no filtering to unify**
  (two are pagination-only, two have no `searchParams`), so adding filters there is a new feature,
  not this batch.
- **Three round-2 kit pieces stay carried forward** (§8.8): density toggle / compact list · the
  mobile filter sheet · search typeahead. ⚠️ **The mobile filter sheet overlaps this batch** — if
  the pill language changes the sticky bar's height budget, say so in §8.8 rather than quietly
  re-opening it.
- **Still Ali's Phase-3 call:** the `--h-control-*` and `--type-nano`/`--type-label` raises.
- **`test:responsive` is RED with 81 PRE-EXISTING failures** — reproduced against production, all
  global-header chrome, classified in §8.7g. Do not read it as yours.
- `test:responsive` and `test:motion` are **server-dependent** (default `:3000`) — pass
  `BASE=http://localhost:3009` or they die with `ECONNREFUSED` and look like product failures.

## The traps that cost time in the last five sessions

- ⛔ **Git Bash rewrites a leading `/` argument** into `C:/Program Files/Git/…` — use
  `MSYS_NO_PATHCONV=1`. It struck three times in one session and once made a sweep exit **0 having
  measured nothing**. Redirect to a file; never `| tail`, which returns tail's exit code.
- ⛔ **Tailwind's spacing scale is overridden here** — `mt-12` is **128px**, `h-8` is 48px. Never
  read a spacing class from the Tailwind defaults.
- ⛔ **A bounding-box measurement cannot see a hit-area fix** — use `npm run qa:tap-hit`.
- ⛔ **`boundingBox()` and a non-fullPage `clip` are both viewport-relative.** Pair document
  coordinates with `fullPage`. A `fullPage` frame renders the sticky header mid-page — an artifact.
- ⛔ **A zero can be correct** (`00 SIKU` is the countdown's padding), and **Swahili puts the number
  in the middle** (`dakika {n} zimebaki`) — anchor probes on the product's own i18n templates.
- ⚠️ Write files containing regex or backslashes with the editor, not a shell heredoc.

## The instruments (read-only, local OR production)

`qa:landing-seam` · `qa:tap-hit` · `qa:card-geometry` · `qa:board-bootstrap` ·
`qa:landing-shots` · `qa:discovery-probe` · `qa:discovery-board` · `qa:results-board` ·
`qa:filter-stress`. Contract gates: `hero-contract` · `discovery-contract` · `board-discovery` ·
`landing-contract` · `ticker-honesty` · `time-left` — **all six now run in `predeploy` (78 steps)**.
⛔ Screenshots are EVIDENCE: `.qa-design-*/` (gitignored), never the tree.

## DEFINITION OF DONE

- **One primitive**, consumed by every player filter control. Zero inline `style` on any of them —
  `/markets` included.
- Every filter control is the pill, ≥ 44px, and **only the selected one is outlined**.
- `test:filter-language` green with its own RED proof (each defect on its own assertion, plus the
  vacuity control) and wired into `predeploy`.
- The four board probes still green **against production** — the counts did not move.
- 4 widths × 3 locales × 6 surfaces read as frames, every control opened.
- `git fetch` shows no surprise commits; `git branch --show-current` is `main`; the push verified
  live (HTTP 200, clean `railway logs`, a frame actually looked at).
- Docs updated in the SAME commit: `PLAN-OF-RECORD.md` §6 batch log + a §8.7h account,
  `docs/NEXT-PLAN.md`, and §8.8 if the sheet's budget changed.
