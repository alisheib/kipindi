# NEXT SESSION — BATCH 6: the mobile filter sheet, and the chart buttons

**Paste this whole file as your opening prompt.**

**Commissioned by Ali on 2026-08-14**, chosen explicitly from the deferred register at the close of
batch 5. He was given each trade in plain terms and picked these two. The full ruling table is
`design-brief/PLAN-OF-RECORD.md` § "ALI'S RULINGS — 2026-08-14".

⛔ **He also ruled things OUT in the same breath. Do not build these, and do not re-ask:**
compact list / density toggle · search typeahead · admin filter rails · `/wallet`'s section tabs ·
the `/markets` `aria-pressed` wording · the `rounded-pill` literal sweep.

---

## ⛔ THE BAR — Ali, verbatim, unchanged

> *"perfectly working, no glitches, 100% functional, no workarounds, clean code"* ·
> *"no half work accepted. only full work"* · *"visually perfect and data perfect"* ·
> *"you should perfectly finish, tested, validated, re-validated and re-analysed, then we push"*

**You act as ALL NINE roles on every change** (`.claude/skills/50pick-standards/SKILL.md` §1).

### The five rules that override convenience

1. **VERIFIED MEANS EXECUTED.** Run it, quote the output. A doc naming a file is not evidence.
2. **ASK OF EVERY CHECK: would it still pass if the feature were absent? Would it fail even if the
   product were fine?** Every refusal check needs a positive control **in the same run**.
3. **A DEFECT CAN BE INVISIBLE TO EVERY GATE AND OBVIOUS IN A FRAME.** Read every screenshot.
4. **NEVER `git add -A`.** Stage by explicit path. ⚠️ Another session shares this working directory.
5. **DOCS TRAVEL WITH THE CODE, IN THE SAME COMMIT**, and a gate nothing runs is not a guard.

---

## ▶ START HERE

1. `cd F:\kipindi-main` · `git fetch origin` · `git status` — expect **`main`**, at or past
   `<batch-5 head>`.
2. ✅ **`.env.qa.local` IS CURRENT ON THIS PC** — the six QA personas were re-minted 2026-08-14
   (6/6 verified) and `qa:filter-scan --as=alpha` reached **8 of 8** surfaces on production.
   ⚠️ **The HOME laptop's copy is now stale** until Ali copies this file across.
3. Boot local:
```
$env:SESSION_SECRET='qa_local_session_secret_at_least_32_chars_long'
$env:OTP_PEPPER='qa_local_otp_pepper_16plus'
$env:DISABLE_ADMIN_TOTP='true'
npx next dev -p 3009
npm run qa:board-bootstrap
```

---

## 6a · The mobile filter SHEET — the main work

**The problem, measured.** On a phone the `/markets` sticky filter bar eats **~220px** before a
single market is visible. Batch 1 chose horizontally-scrolling strips because they need no
JavaScript; §8.7c then spent 104px of sticky height making every control readable and operable.
That was **the right trade for a defect fix and the wrong end state** — the kit's own answer
(`05-markets-discovery-mobile.html`) puts every filter behind ONE `Filters` button, taking the bar
back **under 120px**.

**What it must be:** a `<details>`-driven bottom sheet with a scrim (elevation rung 3 already
defines "sheet with a scrim"). Sort and topic render as **FLAT LISTS inside it**.

### ⛔ The three traps this surface has already sprung

1. **NEVER nest `<details>` inside the sheet.** A sheet that scrolls clips an absolutely-positioned
   panel and re-creates §8.7c's exact defect: at 360px a 362px topic panel was clipped to **4px —
   1%, zero of 8 topics reachable** — while every automated check passed and the closed menu
   photographed perfectly. **Only OPENING the control found it.**
2. **A MASK CLIPS LIKE AN OVERFLOW.** Do not re-parent anything into `.kp-thin-scroll` or
   `.kp-strip-fade` (`globals.css`) — `mask-image` clips an absolutely-positioned child exactly as
   `overflow` does. That is the second reason the menus live outside the chip strip today.
3. **Check the focus trap against the shared `<Modal>`'s ACTUAL contract, not the kit's drawing** —
   focus trap, focus RETURN, Escape-closes — at 4 widths × 3 locales. And the sheet **must not
   regress the strip's keyboard operability**: today every filter is reachable with no JavaScript.

### What must not move
- ⛔ `data-chip` immediately followed by `data-count`, literal adjacent JSX attributes. `qa:discovery-probe`
  matches them with a **regex over raw SSR HTML**; a spread or a reorder makes it find ZERO controls.
- ⛔ Exactly **two** `details.kp-menu > summary` under `.kp-discovery-bar` (`qa:discovery-board` asserts it).
- ⛔ Every filter control keeps rendering through `FilterPill` — `test:filter-language` (66 assertions)
  is in `predeploy` and will say so.
- ⛔ The sticky bar budget is **< 260px at 360×780 in SWAHILI and CHINESE**, not English.

## 6b · The chart's time-range buttons → 44px

`.pchart-range` (`globals.css`, the market-detail probability chart) is `min-height: var(--tap-min)`
= **40px**. Ali chose consistency: make it **44px**, the height every other filter control now uses.

⚠️ **He was told the cost and accepted it:** the rail becomes ~48px tall inside a chart header whose
label is 10px mono. **So the acceptance test is visual** — read the chart header at 360/768/1280/1920
and confirm it does not wrap, does not push the chart down awkwardly, and still reads as a header.
Then **re-measure the hit area with `elementFromPoint`** — 🔴 a `::after` overlay measured **36px
where 40 was intended** here, because paint order handed the pixels back to the chart wrapper.
⛔ A bounding box cannot see this. `test:filter-language` §4.3 asserts the rule; update it to 44.

---

## VERIFY (both items)

- `npm run test:filter-language` + `npm run red:filter-language` (8/8) · `npm run test:all`
- **Against PRODUCTION after the push:** `qa:discovery-probe` · `qa:discovery-board` ·
  `qa:results-board` · `qa:filter-stress` — the counts must not move; this batch is cosmetic.
- `npm run qa:filter-scan -- https://50pick.tz --as=alpha` — must report **8 of 8 surfaces**.
  ⛔ It exits non-zero on a failed sign-in, so it cannot pass over surfaces it never loaded.
- **4 widths × 3 locales, and OPEN THE SHEET in every one.** The 4px-listbox defect is the proof
  that a closed control photographs perfectly while being unusable.
- `npm run qa:tap-hit`.

## The traps that cost time in the last six sessions

- ⛔ **Tailwind's spacing scale is OVERRIDDEN** — `h-8` is 48px, `h-9` is **64px**, `mt-12` is
  **128px**. Never read a spacing class as its Tailwind default. `min-h-[44px]` is arbitrary ON PURPOSE.
- ⛔ **`test:design-frozen` exempts any line containing `var(--`** — it was green over six law-82
  inline-style breaches. A green ratchet is not evidence.
- ⛔ **`[System.IO.File]` in PowerShell ignores `cd`** — it uses the .NET process CWD. Use absolute
  paths, or you will read the wrong file and believe it.
- ⛔ **Git Bash rewrites a leading `/`** — `MSYS_NO_PATHCONV=1`. Redirect to a file; never `| tail`,
  which returns tail's exit code.
- ⛔ **PowerShell's `Get-Content` mangles UTF-8** — use the editor for the i18n dict, never a shell.
- ⚠️ Write files containing regex or backslashes with the editor, not a shell heredoc.

## READ, IN ORDER, BEFORE TOUCHING ANYTHING

1. `CLAUDE.md` · 2. `.claude/skills/50pick-standards/SKILL.md` · 3. `docs/DESIGN_AUTHORITY.md` §0
   **and §K6 (the one-filter-control law)** · 4. `PLAN-OF-RECORD.md` §8.7c (the 4px defect),
   §8.7h (batch 5), §8.8 (the register + Ali's rulings) ·
5. `src/components/ui/filter-pill.tsx` and its spec at
   `docs/design-system/v2-2026-07-27/02-components/filter-pill/spec.md`.

## DEFINITION OF DONE

- The sticky bar is **under 120px at 360** in all three languages, every filter still reachable,
  keyboard operability not regressed, focus trap/return/Escape proven against `<Modal>`'s contract.
- `.pchart-range` is 44px, hit area **measured** ≥44, and the chart header READ at 4 widths.
- `test:filter-language` green (with §4.3 updated to 44) and `red:filter-language` still 8/8.
- The four board probes green **against production** — the counts did not move.
- Docs in the SAME commit: PLAN §6 batch log + a §8.7i account, §8.8 updated, `docs/NEXT-PLAN.md`,
  the filter-pill spec if the primitive changed, and the provenance CHANGELOG.
- Pushed to `main`, deploy verified live (HTTP 200, clean `railway logs`, **a frame actually read**).
- ⭐ **Then EMPTY this file** — a spent brief that still says "paste this as your opening prompt"
  sends the next session to redo finished work.
