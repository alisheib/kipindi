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
| **Planner** | **5 ☑ · 3 🚢 · 7 ☐ of 15** — re-derive from the tables below, never from this line. ⚠️ Count `🚢` BEFORE `☑`: a shipped-with-remainder row carries a `☑` inside its own text, so the obvious `if ☑ … else if 🚢` returns a plausible wrong answer. ⭐ **THE HEADLINE FINDING: of 38 admin routes, only TWO more earn tabs.** Three pages passed the mechanical test ① and were REFUSED on ② — `/admin/finance` (a balance sheet), `/admin/sources` (a registry list) and `/admin/resolver-queue` (a worklist) — because their length comes from ROWS wearing a section count. ⛔ So tabs are not the answer to most of the scrolling; the rest is a pagination/density question and belongs to another programme. |
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
| **A-1** | `/admin/payments` | 4470 · 11 · **33%** | ⭐ passes | 🚢 | ✅ **BUILT — three tabs (Health · Rails · Retry queue), and 7d decided the layout.** Above the rail and on every tab: the **operations control-plane** (it holds the MNO kill-switches, and a switch an officer cannot see is one they cannot reach in an incident), **what players are told about withdrawals** (the sentence the product is showing right now, carrying the stuck-payout count), and the **frozen-payouts alarm** (a player's money is HELD and nothing automatic releases it — an alarm behind a click is not an alarm). ⭐ **THE QUEUE'S COUNT RIDES THE RAIL:** the retry queue's ROWS are a detail and may sit in a tab, but *"there are failed transactions"* is a STATE, so the number is on the option itself. That is 7d's DETAIL-vs-STATE distinction applied rather than quoted. ⚠️ Pagination keeps `?tab=` (`buildBaseHref` preserves every param but `page`) while the RAIL links are bare — reusing `base` there would have emitted `?tab=queue&tab=health`. ▶ Awaiting the production drive. ⛔ **THE ORIGINAL NOTE, KEPT:** 7d IS THE WHOLE JOB HERE. The MNO kill-switches, the Selcom reachability state and the stuck-payout count are load-bearing — they stay ABOVE the rail, exactly as `/admin/system` kept Maintenance mode, Bet queue and Settlement above its own. ⚠️ The 13 money levers render ONLY when a retry has failed or a payout is stuck; production reads STUCK PAYOUTS 0, so **a drive cannot see them** — seed state or accept they are unproven and say so. |
| **A-2** | `/admin/reports` | 3367 · **20** · 18% | ⭐ passes | 🚢 | ✅ **BUILT — two tabs, and the split is the two JOBS, not the length.** An officer either READS the period or GENERATES from the library; those are never read against each other. ⛔ **② decided the grouping too:** the KPI strip, the daily P&L and the per-game/per-category breakdowns ARE one document compared against itself, so they stay in ONE tab rather than becoming three. ⛔ **TWO THINGS STAY ABOVE THE RAIL, both 7d:** the KPI strip **and the freshness stamp** (a report generated against the wrong window is the defect that stamp exists to prevent, so the period cannot be one click away), and the **REGULATOR PACK** — a maker-checker chain whose state (draft → prepared → approved → submitted → acknowledged) is exactly what 7d refuses to hide: a pack sitting at PREPARED is waiting on a second officer. ⚠️ **It could have ridden the rail as a count and deliberately does not:** `ReportPackCard` fetches its own pack, so the page does not know the state, and inventing that plumbing to justify a tab is the tail wagging the dog. ▶ Awaiting the production drive. |
| **A-3** | `/admin/sources` | 3624 · 13 · 23% | ⭐ passes ① | ☑ | ⛔ **REFUSED ON ② — and it is the most TEMPTING wrong answer in the console.** Its 13 panels are not 13 sections: they are **one card PER CATEGORY**, generated by a loop, plus a `Categories · global toggle` card that is read *against* them (you disable a category globally, then look at what it held). That is a REGISTRY browsed as a list — one document — not a set of alternative tasks. ⭐ **And tabbing it by category would be a FILTER, which §K rule 7 forbids in its own title:** *"THERE IS ONE SECTION RAIL, AND A TAB IS NOT A FILTER."* The capsule `FilterPill` language already exists for exactly that job. |
| **A-4** | `/admin/resolver-queue` | 3338 · 11 · 17% | ⭐ passes ① | ☑ | ⛔ **REFUSED ON ②, exactly as this row predicted — and a refusal is a result.** Its panels are a filter/summary card, the bulk-resolve bar, and then **one card PER MARKET awaiting resolution**, emitted by a loop. A worklist is read top to bottom until it is empty; its items are not alternative tasks and no officer compares market 3 against market 9 by switching sections. ⭐ Its length comes from HOW MANY markets are queued — i.e. ROW DENSITY wearing a section count — which is the very thing 7a ① exists to catch and ① missed here because each row is its own card. **② is what caught it.** |
| **A-5** | `/admin/finance` | 3286 · 16 · 34% | ⭐ passes ① | ☑ | ⛔ **REFUSED, AND THE RULING STILL HOLDS — re-read at HEAD 2026-09-01.** §K 7a ② names this page by name: *"wallet liability is read AGAINST house accounts, and tabs would put the two compared things on different screens."* The page confirms it: its panels are a **balance sheet**, not a set of jobs — house float, wallet liability, settlement fees and drift are each meaningless alone and are read as one document. ⭐ **It passes ① and is still refused, which is exactly why 7a needs all three tests**: length and section count would have qualified it, and a rail would have made the console worse in a way no measurement catches. Do not re-litigate. |
| **A-6** | The six that FAIL ① | see below | ⛔ fails | ☑ | ⛔ **REFUSED WITH ARITHMETIC, 2026-09-01 — each is one panel wearing a page's length, so a rail moves nothing.** `/admin/markets` **86%** ("All markets") · `/admin/updown/proposals` **85%** ("Queue · 16") · `/admin/updown` **68%** ("Chains · 9 running") · `/admin/ai-usage` **48%** ("Every API call") · `/admin/ai-polls` **42%** ("All generations") · `/admin/config` **41%** ("Global rates"). ⭐ **Every one of the six is a TABLE**, which is the tell: tabbing them yields a small landing tab and a tab that is still the whole page. These are **pagination or density** questions and belong to a different programme. ⚠️ `/admin/ai-polls` was NOMINATED as the first console to tab by the previous programme's own plan and fails on its own number — the nomination rested on cost (*"it already reads 13 search params"*), and 7a says all three tests must hold. Re-derive with `npm run qa:tab-candidates`. |
| **A-7** | Re-measure after every conversion | — | — | ☐ | ⭐ `/admin/system` was **3,327px before its rail and 2,419px after** — the drop is the proof the rail moved something. Re-run `qa:tab-candidates` after each conversion and record the before/after in the row. |

### TRACK B — pending-change tracking (41 components, 3 adopted)

| # | System | Status | Notes |
|---|---|---|---|
| **B-1** | Triage the 41 | ☑ | ✅ **DONE 2026-09-01. 3 already guarded · 32 own TYPED work · 6 have NOTHING TO LOSE.** The six that need no guard are toggle/matrix surfaces where flipping IS the save: `markets/recategorise-control` · `payments/control-plane` · `privacy/dsar-controls` · `resolver-queue/two-admin-toggle` · `roles/read-tiers-matrix` · `roles/roles-matrix`. ⛔ **And the 32 split again**, which is the distinction that matters: a field inside a `<Modal>` is lost to an explicit **Cancel**, not to navigation, so the guard's real population is **page-level** forms. Modal-scoped only: `sources/source-controls` · `bonuses/bonus-admin-client` · `candidates/candidate-actions` · `kyc/[id]/kyc-decision-rail` · `approvals/sof-review-client`. ⚠️ Re-derive both splits before trusting them — they key on a SPELLING (which control tags appear, and whether one appears before the first `<Modal>`), not on a rendered fact. |
| **B-2** | Adopt on every GUARD component | 🚢 | ⭐ **THE MECHANISM IS BUILT AND IT IS TWO SURFACES ON ONE SIGNAL (Ali, 2026-09-01: a bar that comes up from the bottom to say pending changes).** ① **`<PendingChangesBar>`** — PROACTIVE: it states the condition while the officer is still on the page and puts Save and Discard in reach on a form taller than the viewport. A rail makes this necessary, not optional: you can edit on one tab and switch to another, and a leave-dialog is the only thing that would ever have mentioned it. ② **`<UnsavedChangesGuard>`** — the BACKSTOP for the exits a bar cannot stop. ⛔ **ONE `dirty`, two surfaces — never two mechanisms.** ⛔ **THE BAR INTRODUCES NO NEW DESIGN (§B9/§B10):** surface `.kp-rail` (the player bottom nav's own recipe, incl. `env(safe-area-inset-bottom)`) · motion `.kp-rise` (an EXISTING registered keyframe, already in the reduced-motion block, so §M6 needs no new rule) · rung `z-nav` (40 — **below** menu/drawer/modal so a dialog always covers it) · tone `--warning-*` (app state, ⛔ never the betting ramp) · the kit `Button`. ⭐ **`useFormDirty`** answers *"would leaving lose work?"* for the UNCONTROLLED forms that are most of this console (`config-form` alone has 11 `defaultValue` inputs) by SNAPSHOTTING and comparing — so typing a value back to what it was stops being dirty, instead of a `touched` flag that warns over nothing and teaches operators to dismiss the dialog that matters. ⚠️ **`--h-pending-bar` is a TOKEN with one home** because two things must agree on it — the fixed bar and the in-flow spacer that stops it covering the last card. `test:ui-consistency` caught the first draft writing `h-10` instead. 🔴 **FOUR GATES CAUGHT THIS COMPONENT WHILE IT WAS BEING WRITTEN, and every one was right — worth recording because it is what "nothing off-kit" looks like in practice.** ① `test:ui-consistency` `numeric-size-utility` refused the spacer's `h-10` → became the `--h-pending-bar` token, one home for a number two things must agree on. ② `test:design-frozen` refused a hand-rolled `createPortal` outside the shared primitives → it is now a NAMED exemption with the reason, because the rule targets DIALOGS that skip the focus trap and this is a non-modal `role="status"` bar that must never trap focus, return it, or lock scrolling. ③ `test:measure` refused `max-w-[1400px]` as a new hand-typed page width (§B7) → removed entirely, and it was simply WRONG: `AdminBody` states no measure and runs full-width, so a centred bar would not have lined up with the form above it. ④ `test:ui-consistency` `adhoc-portal` (a warning) → re-baselined with the reason; the baseline moved **149 → 137**, one new entry against twelve real wins. ▶ **Adopted so far: `config/config-form`, `system/SupportConfigForm` (uncontrolled → `useFormDirty`), `system/AnnouncementForm` (controlled → its own `changed`, no hook needed). The remaining page-level forms are the row's remainder.** |
| **B-3** | The tab switch is an EXIT | ☐ | ⭐ Already true and must be PROVEN, not assumed: a `?tab=` option is an `<a href>`, so the guard's in-app-link interception covers it. Drive it: type into a form on tab 1, click tab 2, assert the kit `ConfirmModal` opens with that form's own copy. |
| **B-4** | ⛔ The exit nobody covers | ☐ | The **browser BACK button** (`popstate`) is NOT guarded and the primitive says so in its own header — App Router gives no cancellable navigation event. **Do not fake one with `history.pushState`.** Confirm the miss is still the right call, and keep it written down. |
| **B-5** | A ratchet for adoption | ☐ | Today: 3 of 41. ⛔ A gate cannot demand 41/41 (see B-1), so the honest instrument is a **ratchet that may only shrink** over the GUARD set B-1 defines — plus a `red:` control. ⚠️ If it cannot land at zero, **refuse it with arithmetic** rather than ship a baseline of debt. |
| **B-7** | 🔴 **A GATE GAP FOUND, MEASURED, NOT HALF-FIXED** | ☐ | `test:stacking` §5.2 forbids a non-portaled `position: fixed` overlay inside route content — because `.route-enter` retains a `transform` for ever and a transformed ancestor becomes the containing block, so the overlay anchors to the page wrapper instead of the window. ⛔ **Its predicate is `fixed` + `inset-0`, i.e. FULL-VIEWPORT ONLY.** An EDGE-ANCHORED bar (`fixed inset-x-0 bottom-0`) is mis-anchored by the identical mechanism and the gate cannot see it — which is how `PendingChangesBar` was written wrong and passed a green gate. **The component was fixed by portalling** (that is the real fix); the gate is still one level too shallow for this shape. 📐 **Measured:** widening the predicate to edge-anchored bars finds **3** — `layout/bottom-nav.tsx` and `ui/nav-progress.tsx` (both consumed by `app-shell.tsx`, a ROOT MOUNT, so both are correctly skipped) and `ui/toast.tsx`, whose viewport is root-mounted **one hop further out** via `ToastProvider` → `theme-provider.tsx`. ⛔ So the widened rule **cannot land at zero** without making the consumer walk TRANSITIVE, and a ratchet or a filename allowlist for `toast.tsx` would be debt wearing a rule's clothes (§A1). ▶ **The work is the transitive resolve, then widen.** |
| **B-8** | 🆕 **BREAK THE SCREEN ON PURPOSE** — `npm run qa:chaos` | ☐ | ⭐ **Ali, 2026-09-01: *"you should try to chaotically break the screen and see what will render."*** The other drives are polite: `qa:dg-shell` asks whether a page loaded, `qa:dg-rail` whether a rail announces itself. **A screen only ever tested politely ships the defects that appear when it is not** — and this platform's scar tissue is exactly those: a card heading laid out at width **ZERO**, a rail **119px below the fold**, a control whose centre a pseudo-element had stolen. The drive asserts RENDERED GEOMETRY at **320 · 360 · 390 · 768 · 1440 · 2560**: ① horizontal overflow (§A6 says zero at 360) · ② elements laid out at ~0 width, and text HARD-CLIPPED without an ellipsis (⛔ `min-w-0` is a promise not to overflow, **not** a promise to be readable) · ③ controls whose box leaves the viewport · ④ page errors. ⛔ It types and RESTORES; it never submits. ▶ Run it, fix what it finds, and only then call a page done. |
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
