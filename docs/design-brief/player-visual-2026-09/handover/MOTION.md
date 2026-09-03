# MOTION — the commit sequence, named in rungs

> **PV-05 / row 10, part 2 (lens 7 + 14).** The choreography of *side pick → panel → dial settle →
> confirm modal → seal*, with **every duration named in a `--t-*` rung and every curve in a
> `--m-*`**. Part 1 (the dial's visual **weight** and the three-words-for-one-idea problem) is a
> judgment that wants artboards and is scoped in [`DECISIONS.md`](DECISIONS.md).
>
> ⛔ **This document invents nothing.** §d requires the mechanical check to run FIRST: every token
> named below already exists in `motion.css`. That check is [`TOKENS-USED.md`](TOKENS-USED.md),
> and it was run before a word of this was written — not after.

---

## 0 · What this is, and what it is not

This is a **specification of the sequence as it should be**, derived from the sequence as it **is**.
Every step below was read out of the shipping code, not imagined; where the code already does the
right thing the row says so and changes nothing. ⭐ That matters because the record's PV-14 entry
was filed from a browser census that turned out to be **two orders of magnitude** off the source,
and the correction cost a session. A motion spec written from taste rather than from the tree
would repeat that exactly.

⚠️ **A duration is matched to its DISTANCE and role, not merely to the ladder** — the rule this
programme minted (`DESIGN_AUTHORITY.md` §E). A 520ms `--t-stage` on a 6px nudge is as wrong as a
90ms `--t-flick` on a full-screen sheet, and both sit "on the ladder".

---

## 1 · The ladder, restated only as a reference

⛔ These values are **not** defined here — `motion.css` is the one home (§E9). They are reprinted
so the sequence below can be read without a second file open, and if they ever disagree with
`motion.css`, **`motion.css` is right and this table is stale.**

| rung | value | what it is for |
|---|---|---|
| `--t-flick` | 90ms | state only, no travel |
| `--t-quick` | 140ms | < 40px |
| `--t-base` | 220ms | 40–200px |
| `--t-move` | 340ms | > 200px, or a container resize |
| `--t-stage` | 520ms | a new surface owns the screen |
| `--t-max` | 620ms | ceiling — settlement + celebration only |

Curves: `--m-settle` (arrivals, the signature) · `--m-glide` (neutral travel) · `--m-leave`
(exits) · `--m-breathe` (symmetric loops) · `--m-pivot` (**needle and dials ONLY**, §M8 — now
guarded by `test:motion-ladder` §4).

---

## 2 · The sequence

Five beats. Each names its **travel distance**, because that is what selects the rung.

### Beat 1 · Side pick — the tile takes the choice
- **Travels:** nothing. A tile changes state (border, fill, ink); the box does not move.
- **Rung:** `--t-flick` (90ms) — *"state only, no travel"* is this beat, verbatim.
- **Curve:** `--m-glide`. An arrival signature on a state change over-dramatises a tap.
- **Status:** ✅ **already correct.** `.btn` transitions `transform var(--t-flick) var(--m-glide)`
  and the press scale is `--m-press`, the only scale a control may take.

### Beat 2 · The panel arrives
- **Travels:** a panel entering from below the fold — > 200px.
- **Rung:** `--t-move` (340ms). **Not** `--t-stage`: the panel does not own the screen, the board
  is still visible behind it.
- **Curve:** `--m-settle` — this is an arrival, and it is the signature moment of the whole flow.
- **Status:** ✅ **already correct.** `motion.css` `.m-in` is `m-settle-in var(--t-move) var(--m-settle) both`.

### Beat 3 · The dial settles
- **Travels:** the knob tracks the finger 1:1 (no transition at all while dragging — a transition
  here would break the 1:1 tracking PV-12 measured and confirmed sound), then **settles** on
  release over a short distance.
- **Rung:** `--t-base` (220ms) on release.
- **Curve:** `--m-pivot` — **the one place outside the needle where the pivot is correct**, because
  §M8 reserves it for *"the needle and dials"* and this is the dial. ⛔ Everything else in this
  sequence takes `--m-settle`; `test:motion-ladder` §4 now enforces that boundary.
- ⚠️ **Do not animate the drag.** The dial's physics are already proven (1:1 tracking, RG clamp,
  holds on release). Motion belongs to the *release*, not the *track*.

### Beat 4 · The confirm modal
- **Travels:** a new surface takes the screen, with a scrim.
- **Rung:** `--t-stage` (520ms) for the surface; the scrim at `--t-base` (220ms) so the dim lands
  **before** the panel, not with it — the scrim's job is to say "something else is happening now".
- **Curve:** `--m-settle` for the panel; `linear` for the scrim (a dim has no shape).
- **Status:** ✅ **already correct.** `.m-scrim` is `m-scrim-in var(--t-base) linear both` with
  `backdrop-filter: blur(var(--m-blur-behind))`.

### Beat 5 · The seal
- **Travels:** a crest scales up in place — no positional travel, but it is the **celebration**,
  which is the one role the ladder's top rung exists for.
- **Rung:** `--t-stage` (520ms).
- **Curve:** `--m-settle`.
- **Status:** ✅ **already correct** — `.seal-commit` is `seal-place var(--t-stage) var(--m-settle) both`.
- 🔴 **AND ONE THING WAS WRONG HERE, NOW FIXED (2026-09-03).** The generic crest —
  `orm-pop` in [`operation-result-modal.tsx`](../../../../src/components/markets/operation-result-modal.tsx) —
  animated on **`var(--m-pivot)`**, the needle's reserved curve. `motion.css`'s own header had
  named that breach in prose since 2026-08-21 and nothing enforced it. It is `--m-settle` now, and
  the reason is not only §M8: the `orm-pop` keyframe **already carries its own 1.06 overshoot at
  60%**, so the pivot was adding a second overshoot on top of a keyframe that overshoots. The
  curve only has to arrive. Guarded by `test:motion-ladder` §4, RED-proven.

---

## 3 · The stagger, and its hard stop

Siblings enter on `--m-stagger` (40ms), **never more than 4 steps** — beyond that every remaining
row lands together. That is already implemented (`globals.css`: `calc(min(var(--i, 0), 4) * var(--m-stagger))`)
and it is the correct shape: a stagger that keeps counting turns a list into a queue.

⚠️ **`chat-styles.css` does not honour this** — its starter chips use `animation-delay: 100ms` and
`180ms`, hand-typed and off `--m-stagger`. Found during row 7, **scoped out and filed** rather than
swept in: it is a different shape from that row's finding (an `animation-delay:` is invisible to
`test:motion-ladder` by its written scope, which reads `transition:`/`animation:` only). ▶ It is the
first thing to fix if this spec is adopted.

---

## 4 · Reduced motion — three gates, not one

Every beat above must still work with motion off and **land on the same end state** (§M6). The
product already has three gates and they are not interchangeable:

1. `prefers-reduced-motion` (the OS switch),
2. `html.kp-reduce-motion` (the in-app switch `theme-provider.tsx` toggles),
3. `[data-motion="reduced"]` (the low-end-Android throttle, whose one job is turning **ambient
   loops** off — `globals.css` §6, and `test:reduce-motion` rule 2.1 fails an `infinite` animation
   with no entry there).

⛔ **A celebration becomes a fade; it does not become nothing.** Beat 5 with motion off still marks
the moment — the player committed money and must see that it landed.

---

## 5 · What a reviewer should check, and with what

| claim | instrument |
|---|---|
| no bare `ms` or `cubic-bezier()` outside `motion.css` | `npm run test:motion-ladder` (§1.1) |
| only `motion.css` declares a curve or duration | `test:motion-ladder` §3 |
| `--m-pivot` stays on the needle and dials | `test:motion-ladder` §4 |
| the guard can actually fail | `npm run red:motion-ladder` (6/6) |
| every `infinite` animation has a reduced-tier entry | `npm run test:reduce-motion` |
| no keyframe name is duplicated | `npm run test:keyframes` |
| the tokens resolve in a real browser | `BASE=… npm run test:motion` |

⭐ **Run `red:motion-ladder` before believing any of the others.** That guard was green over an
entire missing file type for its whole life, and nobody had watched it fail until this programme
built its first control.
