# SESSION PROMPT — THE ADMIN SHAPE PROGRAMME · internal tabs + pending-change tracking

**Programme key: `ADMIN-TABS-2026-09-01`** — quote it in every commit and handoff so any session,
on any machine, knows which programme it is inside. Owner: Ali. Commissioned 2026-09-01:

> *"admin pages got lots and lots of sections but all you keep on scrolling and scrolling — is it
> better to separate them into tabs? each page has internal tabs with change tracking for unsaved
> changes. everything becomes cleaner, perfect. it should be 100% accurate, functional,
> responsive, perfectly rendered. track pending changes whole system."*

> ⭐ **THIS FILE IS THE DOOR AND THE TRACKER.** It is the ONLY place this programme's state is
> written (§0a — one fact, one home). ⛔ Do not record progress in a commit message, a summary
> line, or another doc and expect it to be found.

---

## ⏭️ START HERE

**This programme does not invent law. The law already exists and it is binding:**
[`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) **§K rule 7** — *"THERE IS ONE SECTION RAIL, AND A
TAB IS NOT A FILTER"* — 7a when a page earns tabs · 7b the primitive · 7c geometry/paint/type ·
7d what may not go behind a click · 7f discovery · 7g the gate. Read it in full before the first
edit. Read [`DESIGN-BASELINE.md`](DESIGN-BASELINE.md) first for what already enforces what.

⛔ **THE PREVIOUS PROGRAMME ALREADY BUILT THE MACHINERY.** `DESIGN-GATE-2026-08-28` shipped the
rail primitive, the URL-backed `?tab=` state, `UnsavedChangesGuard`, `fieldError`/
`focusFirstInvalid`, and four gates with RED controls. **This programme ADOPTS them.** ⛔ Do not
build a second rail, a second guard, or a second dirty-tracking mechanism.

| | |
|---|---|
| **Planner** | **0 ☑ · 0 🚢 · 13 ☐ of 13** — re-derive from the table below, never from this line. ⚠️ Count `🚢` BEFORE `☑`: a shipped-with-remainder row may carry a `☑` inside its own text, and the obvious `if ☑ … else if 🚢` returns a plausible wrong answer. |
| **Measured** | ✅ `npm run qa:tab-candidates` — **38 routes, 0 unmeasured · 12 over three screens · 2 already railed · 5 pass 7a ①**. This is the whole population; it is not a guess. |
| **Adoption** | ✅ **41** admin client components own editable state AND call a server action; **3** carry `UnsavedChangesGuard`. ⛔ 38 is a CANDIDATE list, not a work list — see Track B. |
| **Gates that must stay green** | `test:section-rail` (+`red:section-rail`) · `test:unsaved-changes` (+`red:unsaved-changes`) · `test:validation-focus` (+`red:`) · `test:tap-target` §5 (+`red:tap-floor`) · the whole of `test:all` |
| **▶ RESUME AT** | **Track A row 1 — `/admin/payments`.** Read the page before you tab it. |

---

## ⛔ THE CRITERION — a page earns tabs only if ALL THREE hold (§K 7a)

1. **The height comes from the SECTION COUNT, not ROW DENSITY.** If one panel is >~40% of
   `docH`, that panel *is* the length and a rail moves nothing. ⭐ **This is the only mechanical
   test, and `qa:tab-candidates` answers it.**
2. **The bands are alternative TASKS, read one at a time** — not one document read together.
   ⛔ This is judgement and cannot be automated. A page whose bands are compared *against each
   other* stays scrolling.
3. **Nothing load-bearing behind a click** (7d). A kill-switch, an alarm, or a "players are being
   refused" counter stays ABOVE the rail.

⛔ **LENGTH ALONE DOES NOT QUALIFY A PAGE. A tab is a REACHABILITY change, never a rhythm
change.** `/admin/updown/proposals` is 8,677px and **85% of it is one queue** — tabbing it yields
a small landing tab and a tab that is still 7,300px. That is a pagination question.

---

## 📋 THE PLANNER — one row per system. Tick a row and push in the SAME commit as the work.

A row is only ☑ when its gate line is GREEN **re-measured on production**, not on localhost.

### TRACK A — the rails (measured 2026-09-01, `qa:tab-candidates`)

| # | Page | docH · panels · tallest | 7a ① | Status | Notes |
|---|---|---|---|---|---|
| **A-1** | `/admin/payments` | 4470 · 11 · **33%** | ⭐ passes | ☐ | ⛔ **7d IS THE WHOLE JOB HERE.** The MNO kill-switches, the Selcom reachability state and the stuck-payout count are load-bearing — they stay ABOVE the rail, exactly as `/admin/system` kept Maintenance mode, Bet queue and Settlement above its own. ⚠️ The 13 money levers render ONLY when a retry has failed or a payout is stuck; production reads STUCK PAYOUTS 0, so **a drive cannot see them** — seed state or accept they are unproven and say so. |
| **A-2** | `/admin/reports` | 3367 · **20** · 18% | ⭐ passes | ☐ | The clearest shape in the console after `/admin/system`: 20 panels, none over a fifth. Judge ②: are report packs alternative tasks, or one document read together? |
| **A-3** | `/admin/sources` | 3624 · 13 · 23% | ⭐ passes | ☐ | Source registry + per-category toggles. ⚠️ Judge ② carefully — a global toggle read *against* the per-host list may be one document. |
| **A-4** | `/admin/resolver-queue` | 3338 · 11 · 17% | ⭐ passes | ☐ | ⚠️ It is a QUEUE. 7a ② is the real question: a worklist read top-to-bottom is one document, not alternative tasks. **This row may close as REFUSED, and that is a result.** |
| **A-5** | `/admin/finance` | 3286 · 16 · 34% | ⭐ passes ① | ☐ | ⛔ **REFUSED BY EXISTING LAW, NOT BY THIS SESSION.** §K 7a ② names it: *"wallet liability is read AGAINST house accounts, and tabs would put the two compared things on different screens."* Close this row by confirming the ruling still holds, and record it. Do not re-litigate. |
| **A-6** | The four that FAIL ① | see table | ⛔ fails | ☐ | `/admin/updown/proposals` 85% · `/admin/updown` 68% · `/admin/ai-usage` 48% · `/admin/ai-polls` 42% · `/admin/config` 41% · `/admin/markets` 86%. **Record each as REFUSED with its number**, so no future session re-proposes them. ⭐ A refusal with arithmetic is a result. |
| **A-7** | Re-measure after every conversion | — | — | ☐ | ⭐ `/admin/system` was **3,327px before its rail and 2,419px after** — the drop is the proof the rail moved something. Re-run `qa:tab-candidates` after each conversion and record the before/after in the row. |

### TRACK B — pending-change tracking (41 components, 3 adopted)

| # | System | Status | Notes |
|---|---|---|---|
| **B-1** | Triage the 41 | ☐ | ⛔ **38 IS A CANDIDATE LIST, NOT A WORK LIST.** For each, answer ONE question: *would leaving this lose typed work?* A `<Toggle>` that saves on change loses nothing — flipping it IS the save, and guarding it would train operators to dismiss a dialog that never means anything. Split the 41 into **GUARD** / **NOTHING TO LOSE** / **already guarded**, with the reason per component. |
| **B-2** | Adopt on every GUARD component | ☐ | One prop, the kit primitive, no new mechanism. ⛔ `dirty` is the caller's honest answer to *"would leaving lose work?"* — not `useState !== initial` on a controlled field that was never edited. |
| **B-3** | The tab switch is an EXIT | ☐ | ⭐ Already true and must be PROVEN, not assumed: a `?tab=` option is an `<a href>`, so the guard's in-app-link interception covers it. Drive it: type into a form on tab 1, click tab 2, assert the kit `ConfirmModal` opens with that form's own copy. |
| **B-4** | ⛔ The exit nobody covers | ☐ | The **browser BACK button** (`popstate`) is NOT guarded and the primitive says so in its own header — App Router gives no cancellable navigation event. **Do not fake one with `history.pushState`.** Confirm the miss is still the right call, and keep it written down. |
| **B-5** | A ratchet for adoption | ☐ | Today: 3 of 41. ⛔ A gate cannot demand 41/41 (see B-1), so the honest instrument is a **ratchet that may only shrink** over the GUARD set B-1 defines — plus a `red:` control. ⚠️ If it cannot land at zero, **refuse it with arithmetic** rather than ship a baseline of debt. |
| **B-6** | Responsive + rendered | ☐ | Every converted rail at **1440 and 390**: `qa:dg-rail` proves the active option is announced, visible and reachable. ⚠️ At 390 the rail scrolls — the ACTIVE option must be brought into view (`scrollLeft`), which is the defect that shipped once already. |

---

## ⛔ THE RULES THIS LINEAGE KEEPS PAYING FOR

- **Never quote a recorded number in a conclusion — RE-DERIVE it, and print the command.** Every
  register number in the previous programme rotted at least once; one rotted mid-session.
- **MEASURE THE RIGHT POPULATION.** A true measurement over the wrong population is the most
  convincing way to be wrong. Ask what the FULL set is before counting.
- **A gate one level too shallow is indistinguishable from no gate.** Any new guard must state
  (a) its re-derived population, (b) its HEAD hit count outside any allowlist, (c) the CONTROL
  that makes it RED — **built before you believe the gate**. If it cannot land at zero, refuse it.
- **A gate not in `test:all` is not a gate** (declaring a `test:*` key registers it).
- **Read the diff before you believe the suite.**
- **If your work moves a ratchet, lower the constant in the SAME commit.** The gates print the
  new number — run them, never read a doc line.
- ⛔ **An allowlist entry earns its place by a rendered fact or a written reason — never a filename.**
- ⛔ **A markdown table row is split by an unescaped `|` in its prose.** Escape `\|`, and verify a
  row edit by printing the row's last 200 characters — an index-based append lands mid-sentence.

## ▶ BOOT — any machine
1. `git pull` on `main`, then `npm install`. ⚠️ A parallel session may share this tree —
   `git fetch` before every push, and read `.claude/skills/50pick-standards/SKILL.md` §8b.
2. Read: this file → [`DESIGN-BASELINE.md`](DESIGN-BASELINE.md) → `DESIGN_AUTHORITY` §K rule 7.
3. Credentials in `.env.qa.local` (never tracked). ⛔ **One login per account at a time** — a
   second login revokes the first and every later page "succeeds" as the sign-in page at HTTP 200.
   Chain drives per account in ONE command.
4. ⛔ Before pushing: `node scripts/test-all.mjs --skip responsive,motion` — the whole suite, not
   a list you chose — plus `npx tsc --noEmit`, **exit captured BEFORE any pipe**. Push to `main`
   is **LIVE**. ⚠️ `/api/health` reports no SHA, so a drive cannot ask what is deployed: measure
   something the commit changed and use that as the deploy detector.

## 🔬 THE INSTRUMENTS
`qa:tab-candidates` (**new** — which pages earn a rail, §K 7a ①) · `qa:dg-rail` (⛔ requires
`ROUTE=`; on Git Bash prefix `MSYS_NO_PATHCONV=1`) · `qa:dg-shell` · `qa:dg-measure` ·
`qa:personas` (prove a login before trusting a drive) · `test:section-rail` ·
`test:unsaved-changes` · `test:validation-focus` · `test:tap-target`.

## ✅ THE CEREMONY — when every row is ☑
1. Full suite + `tsc`, exits captured before any pipe.
2. Drive every converted rail with `qa:dg-rail` at **1440 and 390**, plus `qa:dg-shell`.
3. Re-run `qa:tab-candidates` and record the before/after `docH` for each converted page.
4. Fold what is still TRUE into [`DESIGN-BASELINE.md`](DESIGN-BASELINE.md) — the guards, what is
   deliberately left, the blind spots.
5. Delete THIS FILE. ⛔ Not before: while any row is open it is the only home of the state, and
   commit it once in its final state first so the planner survives in git history.
