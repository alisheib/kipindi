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
| `test:tap-target` | §A2's tap floor. §3 the player surface, **§5 the ADMIN console** (5.1 no sub-floor declaration except by NAMING the 32px rung · 5.2 a padded control takes a recipe or states the floor · 5.3 a coverage floor) | `red:tap-floor` |
| `test:type-scale` | the closed type scale, the 12.5px reading floor, money type (§M4), and the two-ladder freeze (§7) | ratchets, §0 fixtures |
| `test:bridge` | a class must RESOLVE; `cn()` knows every rung; **§9 every app-state token the stylesheet defines is spellable as a utility** | §9.3 + manual RED |
| `test:cn-collision` | `cn()` cannot delete a class it does not recognise | `red:cn-collision` |
| `test:validation-focus` | a refusal can name its field; the helper goes to the right place; **§4 every literal address a refusal names is actually rendered** | `red:validation-focus` |
| `test:section-rail` | every rail of destinations names the one in force | `red:section-rail` |
| `test:unsaved-changes` | a dirty form cannot be navigated away from silently | `red:unsaved-changes` |
| `test:contrast` | §A1, scored on the RENDERED ink (`token × alpha × opacity`), composited in gamma sRGB | `red:contrast`, `red:contrast-rendered` |
| `test:design-frozen` | no hand-typed edge/shadow/radius beside a token | ratchet |
| `test:tokens` · `test:design-one-door` | one definition site per token; one door into the system | `red:tokens` |
| `test:ui-consistency` | per-rule component conventions | baseline |
| `test:eyebrow-roles` | every uppercase-and-tracked site is `.eyebrow` or has its role written down | census must total exactly |
| `test:chip-contract` · `test:motion-ladder` · `test:reduce-motion` · `test:stacking` · `test:dead-css` | chips, motion tokens, §M6, z-order, unused CSS | — |

### ⛔ If you add a guard, it must state three things or it is not a guard
1. its **re-derived population** (what the FULL set is, and how you know your matcher reaches it),
2. its **HEAD hit count outside any allowlist** — and it must land at **zero**,
3. the **CONTROL that makes it go RED**, built *before* you believe the gate.

If it cannot land at zero, **refuse it and say so with arithmetic**. A baseline of debt wearing a
rule's clothes is worse than no rule. ⭐ An allowlist entry earns its place by a **rendered fact
or a written reason — never by a filename**, because a file-scoped exemption also exempts every
future site in that file.

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

---

## 7. INSTRUMENTS THAT NEED A LIVE SITE

`scripts/design-gate/` — all tracked, because an instrument in a gitignored directory exists on
one machine and is gone the moment anyone else pulls (this cost the programme twice).

`qa:dg-measure` (⚠️ `SURFACE=player ANON=1` drives the 17 public routes with no login) ·
`qa:dg-shell` · `qa:dg-rail` (⛔ **requires `ROUTE=`**; on Git Bash prefix `MSYS_NO_PATHCONV=1`) ·
`qa:dg-type` · `qa:dg-money` · `qa:dg-eyebrow` · `qa:dg-rhythm` · `qa:toggle-hit` ·
`qa:dg-redo <admin|player>` after every drive · `qa:personas` to prove a login before trusting a
drive.

⛔ **One login per account at a time** — the platform keeps ONE live session per account; a second
login revokes the first and every later page "succeeds" as the sign-in page at HTTP 200. Chain
drives per account in one command. ⚠️ `/api/health` reports no SHA, so **a drive cannot ask what
is deployed** — measure something the commit changed and use that as the deploy detector.

---

*Superseded: `docs/SESSION-PROMPT-DESIGN-GATE.md`, deleted 2026-08-31 when the last of its 45
rows closed. Its state lives in the planner history of that file's final commit, and everything
still TRUE from it is above.*
