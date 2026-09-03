---
name: pv10-validate-as-you-go
description: TEMPORARY, programme-scoped. Ali's standing instruction for PLAYER-VISUAL-10 (2026-09-03) — every change is validated BOTH technically and VISUALLY before the row moves, the planner is updated as you go, and every new thing's ONE home is written down. Read at the start of every session working docs/SESSION-PROMPT-PLAYER-VISUAL-10.md, and before ticking any planner row. ⛔ Delete this skill when the planner closes.
---

# PV-10 — validate as you go (Ali, 2026-09-03)

> *"every move tested and validated until perfect"* · *"you should visually and technically
> validate all please as you go"* · *"always update planner as you go, and update location of
> where files should be regarding any design or instruction, to keep a clean final ruling"* ·
> *"for every move we care about perfect responsiveness and perfect consistency, we cannot have
> inconsistency among components — this is critical"*

⛔ **This skill is TEMPORARY.** It exists for the life of `docs/SESSION-PROMPT-PLAYER-VISUAL-10.md`
and is deleted by that planner's closing ceremony. Its evergreen half already lives in
`50pick-standards` §1 (the bar), §4 (we LOOK, always) and §5 (testing discipline) — ⛔ do not
copy rules from there into here, and do not let this file outlive the programme. A second
permanent home for "how we build" is exactly the drift `50pick-standards` §3 warns about.

## The gate — no row moves until all four are true

A planner row is `☑` **only** when every one holds. Anything less is `◐`, and say which.

| | Gate | What satisfies it | ⛔ What does NOT |
|---|---|---|---|
| 1 | **Technical** | `npx tsc --noEmit` · `npm run build` · the row's `test:*` **and** its `red:*` · `test:all` | a green suite that was ALSO green before the fix — see §"the ALL PASS trap" |
| 2 | **Visual** | a **screenshot you actually opened and looked at**, at **390 and ≥1280**, in **EN + SW + ZH** where words change | "the DOM says the text is right"; a green drive with unread shots |
| 3 | **Consistency** | the same idea renders the same way in **every** component that shows it — grep the siblings and check them in the same shot | fixing the component the finding named and leaving its twin |
| 4 | **Responsiveness** | measured at 390: no container clips its own content (`scrollWidth > clientWidth`), tap ≥44, SW (the longest words) fits | "it should fit" |

## The ALL PASS trap — the question to ask before trusting any guard

⭐ **"Would this check still pass if the feature were absent?"** On 2026-09-03 `test:labels` was
**ALL PASS over eight live defects** because it matched a *vocabulary of identifier names* and the
variables were called `effectiveSide`, `s` and `lock`. Then its replacement was **green against the
real defect twice** until the RED proof forced it honest.

So: **write the mutation before you believe the check.** `red:<name>` must plant the defect the row
exists to fix — the actual line, as it shipped — and the suite must EXIT NON-ZERO on it. A guard
you have not watched fail is decoration.

⛔ And pair every **absence** assertion with a **positive control**. "No English token found" and
"the reader is blind" print identically. If a ZH check asserts no `YES`, it must also assert the
render *does* carry `是`.

## Visual validation when production does not have the fix yet

Every push here goes to a **branch**; production runs `main`. So the visual gate is met in this
order, and the row stays `◐` until the last step:

1. **Drive production BEFORE the fix** — the RED run *is* the re-derivation, and it proves the
   instrument can see the defect. Keep those shots; they are the finding's evidence.
2. Fix, guard, `red:*`, `test:all`.
3. **Say plainly in the planner and to Ali that production is unverified**, and why.
4. On merge, re-run the row's `qa:*` drive and **open the shots**. That run is what ticks the row.

## As you go — three things, every time, not at the end

- **The planner** (`§g`) — set the row `◐` when you start it, and write the real state, not the
  intended one. A row ticked by intention is a lie the next session inherits.
- **The filing table** (`§b2` "Where everything lives" + "Homes minted so far") — anything you
  create gets its ONE home written down in the same commit. A home nobody can find gets
  re-invented, which is §K5's fifteen reasonable-looking decisions.
- **The docs** — the record's finding entry, `DESIGN_AUTHORITY.md` if a *rule* was minted (⛔ never
  the door file), and the `CHANGELOG` — **in the same commit as the code**. A rule with no guard
  rots; a guard with no note gets deleted by someone who cannot see why it exists.

## Scope discipline, when a drive finds something outside its row

Report it, scope it OUT of the drive, and file it — never sweep it in. A drive that fails on
someone else's surface gets ignored, and an ignored drive is worse than none. (`qa:side-words`
found `.mcardp-share` clipping at 390; it is filed in the record and excluded from the drive.)

## ⛔ Never
- Tick a row from a log. Re-run the instrument and read the output.
- Push `main` — every push there is a live money deploy. Push a branch; merging is Ali's.
- `git add -A` — a parallel session may be mid-edit. Stage paths explicitly.
- File a regulatory/licensing/AML finding — out of scope (§b3). Note it for Ali and move on.
