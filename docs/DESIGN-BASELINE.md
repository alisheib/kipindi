# 50pick — THE DESIGN BASELINE

**What the design system is now, what enforces it, what is deliberately left alone, and how to
add to it.** Written 2026-08-31 when `DESIGN-GATE-2026-08-28` closed — 45 systems, all ☑ — and
its door file (`SESSION-PROMPT-DESIGN-GATE.md`) was deleted per its own ceremony.

> ⭐ **THIS FILE IS A RECORD AND AN ON-RAMP. IT IS NOT LAW.**
> The law is [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) — one rulebook, no second one (§0a:
> one fact, one home). Nothing here restates a value; where a number matters this file names the
> *instrument that re-derives it*, never the number. That is deliberate: **every register number
> in the Design Gate rotted at least once, and one rotted mid-session.**

---

## 1. WHERE A DESIGN FACT LIVES (read this before writing one anywhere)

| The fact | Its ONE home |
|---|---|
| A rule, a floor, a ruling | `docs/DESIGN_AUTHORITY.md` |
| A token's VALUE | `src/app/globals.css` (`:root`) |
| A size/space/radius rung a `.tsx` can reach | `tailwind.config.ts` |
| A component recipe | the kit under `src/components/ui/` |
| Whether the rule is still true | a `test:*` guard — see §3 |
| What a past programme measured | its dated report in `docs/`, marked ⚪ SPENT when closed |

⛔ **There are TWO ladders and they disagree on five names** — `--type-*` in `globals.css` and
Tailwind's `fontSize`. §T7 froze that disagreement and `test:type-scale` §7 fails on a sixth
collision. **From a `.tsx` file you can only reach the Tailwind ladder**, so "put it on the
ladder" means that one. ⭐ A hand-typed size that *equals* a `--type-*` rung (15 · 17 · 20 · 24)
is a **cross-ladder reach, not debt** — moving it to the "nearest" Tailwind rung breaks alignment
with everything `globals.css` sizes from that token, and 15 and 17 are each equidistant from two
rungs, which makes "nearest" a coin flip wearing a design call.

---

## 2. WHAT THE GATE CHANGED, IN ONE PARAGRAPH EACH

- **Primitives first.** The tap floor, the search popover, the kit Toggle, the section rail, the
  type ladder and the eyebrow recipe were fixed at their DEFINITION sites, so consumers moved
  without being touched. Where a fix had to be per-site it is recorded per-site.
- **Semantic colour split from betting ink (§B2a / D2).** `--success-*` and `--danger-*` are
  app-state; `--yes-*` / `--no-*` are money. The kit is migrated, and `Chip`'s `success` no
  longer shares an object with `yes`.
- **Refusals gained an address.** Every field-shaped server refusal in the admin console names
  the control the operator must fix (`fieldError`), and the client takes them there
  (`focusFirstInvalid`).
- **The console got shape.** Long consoles have URL-backed section rails; forms guard unsaved
  changes; validation is complete *and* moves the caret.

⚠️ **Two reports are the measured record and are marked ⚪ SPENT:**
[`DESIGN-GATE-ADMIN-2026-08-28.md`](DESIGN-GATE-ADMIN-2026-08-28.md) ·
[`DESIGN-GATE-PLAYER-2026-08-28.md`](DESIGN-GATE-PLAYER-2026-08-28.md). Spent means *the work is
done*; the measurements stay readable, the instructions no longer apply.

---

## 3. THE GUARDS — what actually holds the line

Every one runs in `npm run test:all` (which enumerates `test:*` keys — declaring the key IS
registering the gate; there is no list to update). A gate with a `red:*` twin has a control that
plants the defect on a COPY of the tree and proves the gate fails **on its own assertion**.

| Guard | What it holds | Control |
|---|---|---|
| `test:tap-target` | §A2's tap floor. §3 the player surface, **§5 the ADMIN console** (5.1 no sub-floor declaration except by NAMING the 32px rung · 5.2 a padded control takes a recipe or states the floor · 5.3 a coverage floor), **§6 (2026-09-03, PV-13) two NAMED controls whose height is declared OUTSIDE the interactive tag's own JSX attributes** — a kit-component wrapper (`<CashEye className="h-[…]">`) and a CSS rule (`.mcardp-info`), both invisible to §3's tag scan by construction. Deliberately NOT a sweep of every `h-[Npx]` in `src/` (377 at HEAD, mostly decorative) — a NAMED, grep-found population, extended when a real control is found outside it. | `red:tap-floor`, `red:tap-rung` |
| `test:type-scale` | the closed type scale, the 12.5px reading floor, money type (§M4), and the two-ladder freeze (§7) | ratchets, §0 fixtures |
| `test:bridge` | a class must RESOLVE; `cn()` knows every rung; **§9 every app-state token the stylesheet defines is spellable as a utility** | §9.3 + manual RED |
| `test:cn-collision` | `cn()` cannot delete a class it does not recognise | `red:cn-collision` |
| `test:validation-focus` | a refusal can name its field; the helper goes to the right place; **§4 every literal address a refusal names is actually rendered** | `red:validation-focus` |
| `test:unsaved-changes` | **every admin component that renders a control someone can TYPE INTO** either guards its three exits or is NAMED exempt with a reason. ⭐ Rebuilt 2026-09-02: it used to select files that already computed a `dirty`, so a form was invisible to it **precisely because it was unprotected** — a true measurement of the wrong set. Lands at **zero**, not a ratchet of debt. | `red:unsaved-changes` (6 cases) |
| `test:section-rail` | every rail of destinations names the one in force | `red:section-rail` |
| `test:tab-anchors` | **§K 7d ③ ACROSS PAGES** — an `#anchor` link into an admin route must land on the tab that renders that id. ⚠️ It cannot hold an UNANCHORED link's INTENT; that is the human audit step in §3b, and `/admin/system` was broken for a whole wave by exactly that. | `red:tab-anchors` (3 cases) |
| `test:contrast` | §A1, scored on the RENDERED ink (`token × alpha × opacity`), composited in gamma sRGB. **§P-u2 (2026-09-03, PV-10)** a call-site `opacity-NN` on a label inside a SOLID money button (`btn-yes`/`btn-no`/`btn-danger`/`btn-gold`), composited against that family's own known (ink, fill) pair — closes the gap that let a `@pct%`/`×N` suffix ship at `opacity-85` (~3.5:1) with `§P-u` (which only ever matched `text-text-subtle/NN`) green. Scoped to the four SOLID families on purpose; `btn-primary`/`btn-claret` are gradients and out of scope until an unconditional (non-`disabled:`) opacity appears inside one. | `red:contrast`, `red:contrast-rendered`, `red:contrast-callsite` |
| `test:design-frozen` | no hand-typed edge/shadow/radius beside a token | ratchet |
| `test:tokens` · `test:design-one-door` | one definition site per token; one door into the system | `red:tokens` |
| `test:ui-consistency` | per-rule component conventions | baseline |
| `test:eyebrow-roles` | every uppercase-and-tracked site is `.eyebrow` or has its role written down | census must total exactly |
| `test:chip-contract` · `test:reduce-motion` · `test:stacking` · `test:dead-css` | chips, §M6, z-order, unused CSS | `red:chip-one-home` |
| `test:motion-ladder` | the motion ladder, and **the guard PV-10 had to repair before it could use it**. §1.1 no hardcoded duration/easing · **§2 (2026-09-03) THE CORPUS, pinned by EXTENSION** — for its whole life `walk()` took only `.tsx`/`.ts`, so all six `.css` files under `src/` (including `motion.css`, the ladder it enforces) were invisible, while §1.3's directory pin passed throughout · **§3 only `motion.css` may DECLARE a curve or a duration** — a namespace may alias the ladder, never re-value it (Authority §E9) · **§4 `--m-pivot` is reserved for the needle and dials** (§M8), a rule that had **no guard anywhere** and lived in a `motion.css` comment naming its own breach | **`red:motion-ladder` (6/6) — the guard had NO control until 2026-09-03.** Carries the pattern worth copying: a **CORPUS mutation** (strip every `.css` from a copied tree; §2 must go RED **while §1.1 stays GREEN**) |
| `test:invite-coming-soon` | a feature flag reaches **every** entry point. §2.1 judges a **POSITION** — each `/profile/invite` link must sit within 8 lines of the switch being consulted, because its first version asked only *"does this file mention `inviteIsLive`?"* and passed over two surfaces gone silently live with the import still present · §3.3 the page consults the switch **BEFORE** minting a referral code | `red:invite-coming-soon` (4/4) |
| `responsive-audit.mjs` **B7's LOWER bound** | B7 had only an UPPER bound (no column exceeds its tier). PV-03 lived in the missing half: `/positions` got its 1080 tier **correctly** and still floated an empty state 328px from its own section heading, passing every width, clip and overflow check. Keys on `data-empty-state`, a **contract**, never `border-dashed` | the fix measured 328px → 0 at 1280 and 390 |
| `qa:fit` (live) · `test:popup-fit` | **§M4a — text fits its container, and a clipped NUMBER is a wrong number.** ⚠️ Added by a parallel programme on 2026-09-01, after this file was first written; listed here so the table stays the one place that answers *"what holds this rule?"* | `red:header-fit` |
| `test:chart-one-home` | **§B12 — the chart system's one home** (CHART-SPRINT, 2026-09-04). §0 proves the four detectors on fixtures · §3 zero chart-shaped files outside `components/charts/` + the named member + 9 reasoned exemptions, and a STALE exemption fails (the list may only shrink) · §4 every member has an import site (the dead-`Sparkline` class) · §5 no charting dependency, in package.json or an import — the §8 decision, enforced | `red:chart-one-home` (5/5: two planted strays, a stale exemption, a banned dep, a killed import) |

### ⛔ If you add a guard, it must state three things or it is not a guard
1. its **re-derived population** (what the FULL set is, and how you know your matcher reaches it),
2. its **HEAD hit count outside any allowlist** — and it must land at **zero**,
3. the **CONTROL that makes it go RED**, built *before* you believe the gate.

If it cannot land at zero, **refuse it and say so with arithmetic**. A baseline of debt wearing a
rule's clothes is worse than no rule. ⭐ An allowlist entry earns its place by a **rendered fact
or a written reason — never by a filename**, because a file-scoped exemption also exempts every
future site in that file.

---

## 3b. THE CONSOLE'S SHAPE — what `ADMIN-TABS-2026-09-01/02` settled

> 🏁 **CLOSED 2026-09-02 — the admin console is DONE and validated on production.**
> `qa:chaos` **438 page-views · 38 routes × every discovered tab × 6 widths · 0 unmeasured ·
> 0 defects** · `qa:dg-shell` GREEN (104 probes) · `qa:dg-rail` on **all 14 rails** at 1440 and
> 390 · `qa:pending-bar` **7/7** · `qa:tab-candidates` **0 remaining candidates** ·
> `test:all` green · `tsc` 0.
>
> ⚠️ **What is deliberately NOT claimed.** `/admin/updown/proposals` is 11,580px of a
> *paginated* 16-row queue — 580px per row. That is a ROW-DENSITY question and is left OPEN;
> a rail there would have been the wrong instrument wearing the look of progress. And
> `test:docs` is red on `docs/PLAYER-VISUAL-2026-09.md`, a parallel session's untracked work
> in this shared directory — not this programme's, and not touched.

**Fourteen admin pages carry a rail** (`/admin/payments` · `reports` · `system` · `roles` ·
`ai-usage` · `ai-polls` · `finance` · `updown` · `config` · `sources` · `compliance` ·
`bonuses` · `proposals` · `retention`). Measured at 390: **38 routes, 14 railed, 0 remaining**
**candidates**. The four still over three screens each fail ① on one dominant panel
(`updown/proposals` 80% · `markets` 80% · `candidates` 76% · `aml` 67%) — a page with ONE
section has nothing to tab. ⚠️ `/admin/updown/proposals` is 11,580px of a *paginated* 16-row
queue: 580px per row. That is a ROW-DENSITY question, not a tab one, and is left open.
Tab state is a URL
fact, so it survives a refresh, a Back and a shared link — and `qa:tab-candidates` /
`qa:chaos` DISCOVER a page's tabs off the rendered `data-section-rail` rather than any list.

### The four rules that cost the most to learn

1. **A page earns a rail on its SECTION COUNT, never its length.** `qa:tab-candidates`
   measures the one mechanical part (§K 7a ①: no panel over ~40% of docH); ② and ③ are
   judgement. `/admin/markets` and `/admin/updown/proposals` are 86% and 85% one panel —
   **a page with one section has nothing to tab**, and refusing them is the rule working.
   🔴 **AND MEASURE AT 390, NOT 1440.** `qa:tab-candidates` defaulted to the desktop and
   reported 9 routes over three screens; at 390 the same console reports **17**, because
   every `lg:grid-cols-*` collapses to one column and a page roughly doubles. Four pages —
   compliance, bonuses, proposals, retention — were invisible to the candidate list for
   exactly that reason. A rail is a REACHABILITY instrument and reachability is worst where
   the page is longest, so the drive now defaults to the binding width (`W=1440` for desktop).
   ⚠️ `/admin/updown` is railed while FAILING ①, with the arithmetic stated in its own
   comment: the landing stays ~6,000px, and what the rail buys is reachability, not length.

2. **⛔ NOTHING LOAD-BEARING BEHIND A CLICK (§K 7d ③), and this is where tabs BREAK things.**
   Three deep links pointed at ids that moved onto tabs. A remedy button that scrolls to
   nothing is worse than no button, and none of it is visible to `tsc`:
   · `aiBudgetRefusal` → `#ai-credit-budget`, now `?tab=settings#…`;
   · `BatchGenerateForm` → `#ai-polls-pending`, now switches tabs before revealing;
   · the paused-cycle gate `#ai-cycle-gate` is kept ABOVE the rail on every tab instead.
   ⭐ **`test:tab-anchors` now holds the mechanical half** (+ `red:tab-anchors`, 3 cases): an
   `#anchor` link into an admin route must land on the tab that renders that id.
   🔴 **BUT THE WORST ONE HAD NO ANCHOR AT ALL, and no gate can catch it.** `/admin/system`
   took a rail in wave 1, moving the audit-chain verify control onto `diagnostics`;
   `/admin/compliance`'s *"verify now →"* kept pointing at the bare route and landed an
   officer on `platform`, a page with no verify control anywhere on it. It resolved, it
   returned 200, the page it showed was perfectly rendered, and it was wrong for a whole
   wave. Two more of the shape: `/admin/updown`'s *"Purge a chain on /admin/retention →"*,
   and the events table's *"drafted"* link, which offered a form for making a NEW poll
   instead of the one just drafted.
   ⛔ **SO THIS IS A HUMAN STEP, NOT A GREEN RUN: after railing a page, read every INBOUND
   link to it and ask what the sentence promised.** No regex reads intent.

3. **The underline is the SECTION language; the capsule is the FILTER language (§K 7c).**
   `/admin/sources` is one card shape repeated once per category — subsets of one list, not
   parts of a document — so it takes a capsule. ⚠️ A filter's default is "All", so its
   default height is unchanged; the win is one click instead of a scroll past eleven.

4. **A landing tab must always paint.** `/admin/ai-polls` cannot land on its queue: both
   queue cards are `{list.length > 0 && …}`, so a quiet morning would open on a blank page.

### ⛔ FITTING — what a card is allowed to be put inside

Two defects on `/admin/reports` on 2026-09-02, one screenshot, and **neither drive was wrong
to miss them**. Read this before adding a card to an existing grid.

1. **COUNT THE GRID'S CHILDREN BEFORE ADDING ONE.** That grid was written for TWO cards —
   `Daily P&L` wide, the category breakdown narrow — and said so in its own comment. `By game`
   arrived later as a THIRD child, so at `xl` the browser placed it in column 2 (**360px**) and
   pushed the bar list, the one card that genuinely wants 360px, into the WIDE column of row 2.
   Both cards ended up in the wrong track and nothing said so. ⚠️ This is **DG-A-22's shape**,
   already documented once on `/admin/compliance` — auto-placement is silent, and a comment
   describing the old child count is worse than none.
   ⭐ **A 7-column money table does not go in a sidebar track.** Give it the full width.

2. **`.admin-tbl td` DID NOT INHERIT `th`'s `white-space: nowrap`.** Headers have never
   wrapped; cells always could. A column narrower than its content folded `TZS 550,560` into
   "TZS" above "550,560" — §M4 says a money figure is ONE object, §M4a that a clipped number
   is a WRONG number, and a number folded in half is read wrong the same way.
   ⭐ Fixed with ONE rule over the marker that already existed: `.admin-tbl td.tabular
   { white-space: nowrap }`. A table's min-content width then grows to fit its figures and
   `ScrollX` scrolls it — **`min-w-[…]` becomes a floor, not a guess that goes stale the day a
   number gains a digit.** ⚠️ Scoped to `.tabular`: a LABEL cell may wrap and should.

🔴 **WHY NO GATE CAUGHT IT, which is the part worth keeping.** The table lives inside a
`ScrollX`, and `qa:chaos` ①/③ and `qa:fit` all exempt content there as one-scroll-away —
**correctly**, for a table that is merely wide. But **a value that WRAPS is not a value that is
CLIPPED**: its box never overflows, it simply grows a second line, and no bounding box
separates those two. `qa:chaos` ⑤ now counts LINE BOXES with a `Range`. ⚠️ Its first draft
compared height to line-height and false-positived on every `<td>` in the console — cell
padding alone is 2.7× a line. Proven discriminating against the live defect BEFORE the fix
shipped: 61 wraps on `?tab=performance`, 0 on `?tab=library`.

### The tab's own states, and why

🔴 Hover and active both resolved to `--text` until 2026-09-02 — **a rail whose selected
state a mouse can imitate has to be re-read to be trusted.** Hover now takes a SURFACE
(`--bg-overlay`, the kit's shipped hover-down token) rather than more ink, and the underline
PREVIEWS itself on hover in `--border-strong` — a non-brand ink, so a preview can never be
read as a selection. ⚠️ Colour deliberately does not transition: `.m-indicator` sets
`transition-property: transform`, and `transition-colors` would REPLACE that list, not extend
it, snapping the scale that is the actual motion.

### Pending changes — two surfaces, one signal

`PendingChangesBar` (proactive, says the work exists) + `UnsavedChangesGuard` (catches the
three exits: tab close, in-app link — **a rail tab is an in-app link** — and the kit dialog).
⛔ **The bar is a SINGLETON.** Every instance is `fixed bottom-0`, five files render two or
three, and two dirty forms painted two bars in the same pixels while the page reserved the
height of one. The lowest-id instance paints, showing the most recently dirtied entry and a
count of the rest. `qa:pending-bar` ⑥ counts bars in the DOM, because two bars at identical
coordinates look exactly like one in a screenshot.

⛔ **A POPOVER IS NOT A MODAL.** A `Modal` earns its exemption by painting a `fixed inset-0`
scrim, so a click aimed at the sidebar hits the scrim. A bare `absolute` panel with a Cancel
button looks identical to a reader and blocks nothing — the sidebar, the tabs and every row
link stay live through it. An earlier triage exempted five files as "modal-scoped" that
contain no `<Modal>` at all; it keyed on a spelling this codebase does not use there.

---
## 4. DELIBERATELY LEFT — do not "fix" these without reading why

- **`ui/stat.tsx`'s size dictionary.** Five of seven rungs are hand-typed on purpose: 15 · 17 ·
  24 are the `--type-*` ladder (§T7 cross-ladder reach); 13.5 and 21 are off both ladders, and
  13.5 is the DEFAULT rung behind ~35 money figures. The reasoning is at the dictionary.
- **`Chip`'s `no` / `hot` pair.** Still one object. Both have zero call sites; splitting was
  offered and not taken.
- **`.btn-xs` (32px).** The documented dense, mouse-only admin rung. Legal ONLY on admin, and
  only when the call site NAMES it (`btn-xs` / `size="xs"` / `h-[var(--h-control-xs)]`) — a
  hand-typed `h-[32px]` is the rung's value copied away from its ruling.
- **`--type-h1` is not a page-title token**; page titles use the 28px step (§T rule 2).
- **`.row-link` supplies `text-transform`.** ⛔ Check the COPY before adopting it — four
  lowercase pills nearly shipped as "8 PREDICTORS".
- **`design-brief/design-gate-2026-08-28/`** — an OUTBOUND commission that was **never sent**
  (Ali, 2026-08-31). It is the only copy of the request. ⛔ Do not delete it.

---

## 5. KNOWN BLIND SPOTS — what no gate here can see

Stated so nobody reads a green suite as more than it is.

- **Source gates cannot see a height that comes from PADDING.** `test:tap-target` reads what a
  control *declares*. The rendered half is `responsive-audit.mjs` and the hit-probes
  (`qa:toggle-hit`), which walk real coordinates — a bounding box cannot see an
  absolutely-positioned `::after`, and `elementFromPoint` can.
- **`qa:dg-money`'s population is not the money population.** Every money scanner matches an
  element whose ENTIRE content is text, so amounts rendered through a nested component
  (`<Cash>`, `<RollingAmount>` — the wallet balance, the bonus balance, the win payout) are
  invisible to all of them.
- **A spelling-keyed colour guard cannot see indirection.** `src/components/proposals` scores
  zero on every betting spelling and still reaches `var(--yes-300)` through
  `STATUS_TONE → chip variant`. This is why §9 gates token REACHABILITY instead of class names.
- **`ui-consistency`'s `bare-text-button` rule is blind to ~61% of classNamed `<button>`s**
  because its open-tag regex stops at the `>` inside `=>`. `test:tap-target` §0 proves the
  correct lexer on three fixtures; that rule has never been moved onto it.
- **A control can pass every gate and still be unreachable at rest.** At 390 the last rows of
  `/profile/responsible-gambling` sit under the fixed bottom nav and a fixed overlay; the
  toggles measure 41px when scrolled into view and 1px where they land. That is a shell
  bottom-padding question, not a control defect.
- **`test:tap-target` §6 and `test:contrast` §P-u2 (2026-09-03, PV-13/PV-10) are NAMED-population
  checks, not general ones, and say so in their own headers.** §6 knows exactly two controls
  whose height is declared outside a JSX tag's own attributes (`<CashEye>`, `.mcardp-info`); a
  THIRD kit wrapper that hides a hand-typed height the same way is invisible until it is added
  to `NAMED_CONTROLS` by name. §P-u2 knows the (ink, fill) pair for exactly four SOLID button
  families; a new money-control class, or an opacity dimming a label through more than one level
  of inherited colour, needs its own entry before this gate can see it. Both are the correct
  trade against the alternative (a population that cannot land at zero — see PV-13's own
  377-literal count) — but a gate that is precise is also a gate with an edge, and the edge is
  named here rather than left to be discovered as a false "0 findings".

---

## 6. THE METHOD — how to decide any value

**In this order, and say which step decided it:**
1. **A law** in `DESIGN_AUTHORITY.md`. Read the section in full; do not skim.
2. **A dated ruling already in the repo** — an in-file tombstone, a comment beside a token, a
   guard's own reason string. Hunt with `git log -S` / `git log -L`.
3. **Only then taste** — and the value must match the site's NEIGHBOURS, which you must name.
   ⭐ Ali has delegated the per-site design calls (*"you decide, based on the overall design of
   the platform and perfection… I care about consistency and being perfect"*) — that delegation
   is for step ③, **never** for overriding ① or ②.

### The rules this programme paid for, in blood
- **Never quote a recorded number in a conclusion — RE-DERIVE it, and print the command.**
- **MEASURE THE RIGHT POPULATION.** A true measurement over the wrong population is the most
  convincing way to be wrong. Ask what the FULL set is *before* counting.
- **A gate one level too shallow is indistinguishable from no gate.** Build the control first.
- **A gate not in `test:all` is not a gate.**
- **Read the diff before you believe the suite.**
- **If your work moves a ratchet, lower the constant in the SAME commit.** The gates print the
  new number for you — run them, don't read a doc line.
- ⛔ **Some register items ask to REVERSE a dated, measured decision.** Refuse them by name, with
  the ruling's date and `file:line`. Thirteen were caught during the Gate.
- ⛔ **A blocker measured once and generalised can hold work for days.** *"All six QA secrets are
  rejected"* was true of two accounts and false of six, and it blocked four rows for three days.
  Re-derive a blocker before you inherit it.

#### ⭐ And the four PLAYER-VISUAL-10 paid for (closed 2026-09-04, all 13 rows ☑)

- ⛔ **AN UNMEASURED ADJECTIVE IS A HYPOTHESIS, AND IT WAS WRONG EVERY TIME IT WAS CHECKED.**
  `duration-150` ×373 → **3** · bare Tailwind curves ×391 → **0** · "seven chip heights" → **three
  tiers** · "eight narrow routes" → **one** real defect · "three words for one idea" → **three
  correct words for three things** · "a thin 5px-ish slider" → a **12px** track and a **56px**
  knob. Six of twelve findings shrank or vanished under measurement. ⚠️ **A census taken through
  `getComputedStyle` counts CONSEQUENCES; a fix has to count DEFINITION SITES** — the two differ
  by however many elements share a class, which was ~124× in PV-14's case.
- ⛔ **THE INSTRUMENTS WERE WRONG MORE OFTEN THAN THE PRODUCT WAS — eight times in two sessions,
  and NOT ONE was found by reading code.** Each was caught by a control, a screenshot, or a number
  that did not survive being printed: a probe that returned the same value for the control and the
  defect (it was measuring the route wrapper); a substring selector that counted a 6-card board as
  **126** (`[class*="mcardp"]` also matches `.mcardp-info` and nineteen other children — use
  `[class~=…]`); a regex right **by luck** (`TZS 94,50019d left`); three "locales" that were all
  English because the switch is a **cookie**, not `?lang=`; a "green baseline" over **zero cells**
  because Git Bash rewrote `/positions` into `C:/Program Files/Git/positions` (`MSYS_NO_PATHCONV=1`);
  a check that ran **after** the failure list printed, so it incremented `fail` invisibly; and — on
  production — a reader that took the **first** `TZS` figure where a market's own question contains
  one, nearly filing a false sort defect against a live money product.
  ⭐ **Measure the control in the same run, always.** With only the suspect surfaces measured, four
  of those would have read as clean passes.
- ⛔ **CHECK A BRANCH BY ITS CONTENT, NEVER BY ITS NAME OR AHEAD/BEHIND COUNT.** `pv10/rows-3-4-6`
  was already in `main` by content; its only remaining `src/` delta was the **needle files, where
  `main` was NEWER**, so merging it would have reverted 127 lines of a parallel session's work.
  Three consecutive handoffs said *"NOTHING on production"* about work that had been live for a day.
  `git diff origin/main <branch> -- src/` answers this in one command.
- ⛔ **A GUARD THAT READS THE SOURCE'S VOCABULARY CANNOT SEE A DEFECT THAT LEAVES THE VOCABULARY IN
  PLACE.** `test:invite-coming-soon` §2.1 first asked *"does this file mention `inviteIsLive`?"*
  and passed over two surfaces gone live, because severing the usage left the **import** intact.
  Judge a **position**, not a mention. ⚠️ And never make the *fix's own mark* the marker — a
  surface rendering a "coming soon" badge unconditionally satisfies "shows coming soon" today and
  keeps showing it after the feature opens: the failure wearing the costume of the fix.

---

## 7. INSTRUMENTS THAT NEED A LIVE SITE

`scripts/design-gate/` — all tracked, because an instrument in a gitignored directory exists on
one machine and is gone the moment anyone else pulls (this cost the programme twice).

`qa:dg-measure` (⚠️ `SURFACE=player ANON=1` drives the 17 public routes with no login) ·
`qa:dg-shell` · `qa:dg-rail` (⛔ **requires `ROUTE=`**; on Git Bash prefix `MSYS_NO_PATHCONV=1`) ·
`qa:dg-type` · `qa:dg-money` · `qa:dg-eyebrow` · `qa:dg-rhythm` · `qa:toggle-hit` ·
`qa:tab-candidates` (which pages earn a rail — measures 7a ① and REPORTS what it could not see) ·
`qa:pending-bar` (⛔ needs `ROUTE=`/`FIELD=`; `FIELD_B=` is a second field in a DIFFERENT form,
which is what proves the bar is a singleton — ⚠️ it must be a VISIBLE input, the kit's `<Select>`
keeps its value in a hidden one) · `qa:chaos` (geometry at 320/360/390/768/1440/2560; it
DISCOVERS each page's tabs off the rendered rail and FAILS on any view it could not measure) ·
`qa:dg-redo <admin|player>` after every drive · `qa:personas` to prove a login before trusting a
drive.

⛔ **One login per account at a time** — the platform keeps ONE live session per account; a second
login revokes the first and every later page "succeeds" as the sign-in page at HTTP 200. Chain
drives per account in one command. ⚠️ `/api/health` reports no SHA, so **a drive cannot ask what
is deployed** — measure something the commit changed and use that as the deploy detector.

---

## 8. THE CHART SYSTEM — the decision and the graveyard (CHART-SPRINT, 2026-09-04)

**The law is `DESIGN_AUTHORITY.md` §B12** (one home · the four-ink chart language · honest
form · no library). This section is the record of how it was decided.

**The census that decided it** (every user-level data visual, walked before any decision):
ProbabilityChart (`/markets/[id]`) · card spark (boards + landing hero) · LAST ROUNDS cubes
(`/updown`) · PriceHero (`/updown/[roundId]`) · PnlChart + win-rate NeedleDial
(`/positions/performance`) · outcome donut (`/results`) · balance spark (`/wallet`) ·
VolumeSparkline (`/leaderboard`, series EMPTY for real players — A-5, no per-day feed) · plus
one export with ZERO import sites (`Sparkline`, deleted with its `.spark-*` CSS).
Six implementations, six homes, four private copies of one Catmull-Rom smoother, two colour
languages. The data: MarketSnapshot rows are bet/settle events (≤800/market, compressed to
≤24 before render); UpDownObservation rows are single CONFIRMED point-reads at one-minute
grid boundaries — **a 5-minute round holds ~5 real ticks with no intra-minute high/low, so
honest OHLC is underivable and candlesticks are forbidden** (§B12.3).

> ⚠️ **THE NO-LIBRARY HALF OF THIS DECISION WAS REVERSED BY ALI THE SAME DAY — read
> §B12.4 for the standing law.** The reversal (2026-09-04, Ali's direct order: *"search for
> the perfect library… harmonize with our whole platform design and theme kit… we proceed
> on your call alone"*, after judging the honest-but-sparse round chart "nice but not like
> financial graphs") adopted **TradingView `lightweight-charts@5.2.1`** (Apache-2.0,
> pinned exact) for the Up & Down terminal chart ONLY — re-weighed fresh against KLineChart
> (API churn, indicator bloat, thinner docs), ECharts 6 (weight, dashboard aesthetic) and
> ApexCharts (license ambiguity, SVG perf): lightweight-charts is the genre-defining
> renderer with native price-lines, baseline series, whitespace gaps (A-5's gap markers
> render as REAL holes) and kinetic mobile pan/zoom. Confinement: imported only by
> `charts/terminal-chart.tsx` (guard §5.3, red-proven), lazy-loaded only when a history
> range is opened (+168 KB static total, ~46 KB gz, zero on cubes/ROUND paths), themed
> through a no-fallback `getComputedStyle` token bridge. The paragraphs below record the
> morning's reasoning unchanged — a reversed ruling stays readable (⚪ SPENT in part).

**Decision (2026-09-04 morning, ⚪ partially SPENT — see the reversal box above):
dependency-free SVG, consolidated into `src/components/charts/`.** Weighed and
rejected, each on measurement:
- **TradingView lightweight-charts** (Apache-2.0, ~45KB gz) — canvas + client-only: two
  shipped charts (PnlChart, PriceHero) render with ZERO client JS and would forfeit it;
  canvas cannot read `var()` at paint time, so every token needs a `getComputedStyle`
  bridge — a second definition site for every colour; its centrepiece (candles, pan/zoom
  over 10k bars) is unusable at this platform's honest tick density.
- **uPlot** (MIT, ~12KB gz) — same canvas/client/theme-bridge costs; its headroom (~150k pts
  @60fps) is unreachable by series that render 16–24 points; scrubbing, i18n labels and
  empty states would still be hand-built on top.
- **Apache ECharts** (Apache-2.0, ~90KB+ gz tree-shaken) — fails the 2G bar on weight alone.
The in-house kit already held every locally-hard win a library would reopen: token classes
that resolve `oklch` `var()`s, the motion ladder + reduced-motion snap, trilingual labels,
touch scrubbing, A-5 empty states, E-93 label collision avoidance, E-198 legibility. The
gap was CONSISTENCY, not capability — so the sprint consolidated instead of importing.
**Bundle delta of the consolidation: ≤ 0** (code deleted, none added from npm).

> ⚠️ **THE FINAL FORM (2026-09-04 evening, Ali's closing orders — supersedes the
> paragraphs below where they conflict):** the board's chart view is the TradingView-engine
> TERMINAL only (rail **15M·30M·1H·6H·12H·24H·7D**, style **Curve|Candles**, candles the
> default everywhere); **the ROUND frame is REMOVED** (*"no need for round chart — remove
> the option"*) — `RoundChart` and the lab's `roundView` slot were deleted and live intact
> at commit `98b309d5` if ever needed, with `udRangeRound`/related i18n keys left dormant
> in the dict; **every non-candle chart moved onto the engine curve** — `MarketCurve`
> replaced the hand-rolled `ProbabilityChart` svg on the market detail page (same grammar:
> gilt 50 tipping line, emerald/rose half-planes, the `.pchart-range` rail; the pchart svg
> CSS family was retired with it, `.pchart-dot-halo` + the rail classes surviving with
> their consumers); the shared token↔canvas mechanics live in `charts/ink-bridge.ts`.

**The board's cubes ↔ chart toggle (CHART-SPRINT B, ⚪ partially SPENT — see the box above).** `/updown` offers CUBES (default —
the outcome heartbeat, now `charts/outcome-cubes.tsx` on tokens instead of four hand-typed
`oklch()` literals) or CHART (`charts/round-chart.tsx` — the CURRENT round's confirmed reads
against its gilt open line, zones tinted in direction ink, the kit `RoundCountdown` composed
in so the chart's clock is the same component as every other clock). `charts/board-viz.tsx`
is the client switch: `.pchart-range` pressed-buttons rail, localStorage `kp-updown-viz`,
server renders CUBES first (no per-device state in SSR). A missing body removes the rail —
no live round means chart mode has no question to answer. Data: `getBoard` gained ONE
bounded read (`currentRoundChart`), the same `priceSeriesFor` the detail hero uses.

⚠️ `updown/price-hero.tsx` is a named member AT ITS PINNED ADDRESS, not moved:
`updown-chart.test.mts` imports it, `updown-chart-red.mjs` anchors it CRLF-sensitively, and
`design-frozen`/`eyebrow-roles` pin the path. Moving it would churn three guards and a RED
harness for zero player value — the guard names it instead.

### 8b. CHART ROUND 2 — the four-lens review, its verdicts and its parks (2026-09-04, session 80)

The day after the sprint closed, Ali asked for a perfection pass: *"make sure they are
visually perfect… see if they tolerate any additions, especially Up & Down… the toggle —
validate it's in the visually perfect place as a UI/UX engineer."* Method: fresh production
shots (28: board both toggle states + detail hero + probability rail, 3 locales, lang-verified),
then a **four-lens review workflow — toggle-UX · design-law · honest-additions ·
cross-surface consistency — 26 findings, every one adversarially verified by an independent
refuter: 24 confirmed, 2 killed.** Fixes shipped as E-260..E-264 (campaign register); the
§B12.2 live-dot-role and gilt-value-flag rulings came out of the same pass.

**The toggle verdict: KEEP, exactly where it is.** Right-aligned opposite the section
eyebrow, directly above the content it governs — the same geometry as `.pchart-ranges` in
the probability chart's header; visually distinct from the filter pills above (joined
segmented capsule vs standalone pills, and at 360 the filter collapses to one sheet-trigger);
pressed-buttons vocabulary complete (aria-pressed, role=group, localized aria, 44px literal,
--pill-active, focus ring); rail removed when only one body exists. The one label defect
(the cubes pill echoing the nav's "Results") is E-264 ①.

**Parks — judged, recorded, NOT to be re-litigated as bolt-ons:**
- **Per-cube tap detail / links** — the data is free (`recent` already holds roundId before
  the board read discards it) but an 18×18 cube is tap-hostile; park until a cube redesign
  gives each ≥44px. Honest destination when revisited: `/updown/[roundId]`, the proof page.
- **Time-axis marks** — dishonest under index-spaced x (the live point is pinned to the
  right edge, so a "close" mark there would label an 18-second-old read as the close). The
  honest version re-plots x by timestamp; that is a deliberate form change, not axis text.
- **Hi/lo ticks** — at per-minute reads a 5-min round has ≤6 vertices; the path IS the
  visible high/low. Reconsider only if a 60-min duration becomes flagship.
- **Sparse-series count note** — parked permanently: §B12.3 makes the straight segment the
  honesty statement, and a "2 reads" caption narrates the feed on a player surface.
- **Pool/multiplier on the chart panel** — VETO stands: the sprint ruled the cards below
  carry the full money statement; the panel answers "above or below, how long".

**Killed by the adversarial pass (so they are not re-filed):** "toggle undiscoverable during
round gaps" — deliberate-and-documented (a toggle with one destination is decoration;
CHART-SPRINT-2's history ranges moot it anyway); "probability alt fabricates 0%" — the
empty-range branch is unreachable dead defense (the page gates on ranges with ≥2 points).

---

*Superseded: `docs/SESSION-PROMPT-DESIGN-GATE.md`, deleted 2026-08-31 when the last of its 45
rows closed. Its state lives in the planner history of that file's final commit, and everything
still TRUE from it is above.*
