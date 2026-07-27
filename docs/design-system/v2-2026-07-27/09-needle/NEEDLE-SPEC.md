# The Needle — implementation specification

**50pick motion identity · Object 01 · v2.0 · 2026-07-27**

A persistent, physically-simulated pause object built from the 50pick mark. It lives
on the edge of the app shell, can be grabbed, carried, thrown and spun anywhere on
screen, and always comes to rest as the logo — exactly.

Deliverables in this package:

| File | What it is |
|---|---|
| `needle-physics.js` | The engine. Framework-free ES module, zero dependencies. The source of truth for all dynamics. |
| `Needle Playground.html` | Bare test harness — empty screen, just the object. Open it and throw it around. |
| `Needle Fidget.dc.html` | The documented surface: live object + every state specified + tweakable feel. |
| `theme/motion.css` | The product-wide motion language (`--m-settle`, `--m-glide`, …) this object obeys. |
| `NEEDLE-SPEC.md` | This document. |

---

## 0 · Colour — why the fidget is not painted in the brand's flat hues

The mark uses YES emerald (hue 152) and NO rose (hue 22) at full saturation, and it is
right to. The **fidget is not**, for three reasons that only became obvious with the
object in hand:

1. **A saturated red/green disc that spins is a prize wheel.** That is the precise
   wrong signal for an object whose entire job is to be a break from betting.
2. **It stole the semantics.** Red and green are the platform's betting colours. Using
   them decoratively on a pause object dilutes the one pair of hues that has to mean
   exactly one thing everywhere else.
3. **It looked cheap.** Near-complementary hues at high chroma vibrate along their
   shared boundary, and #B03A3E in particular is a dusty brick that reads vintage —
   a 1970s carnival spinner, not a premium instrument.

A fully monochrome treatment was built and rejected too: premium, but the brand
disappeared entirely.

**The shipped answer is enamel.** The brand hues are kept — same hues, 152 and 22 —
but fired as deep cloisonné rather than painted flat: lightness and chroma pulled down
until they sit *inside* the royal palette instead of fighting it. Recognition is
carried by a polished inlay line of each hue at the rim, where enamel meets bezel on a
real piece. Gold stays the hero, because gold is the needle and the needle is the brand.

| Element | Value |
|---|---|
| Green face | `#23805B` → `#155440` → `#0B3227` |
| Rose face | `#8E3038` → `#5E2028` → `#3A1319` |
| Polished inlay | `#2FC77A` / `#D2555C`, 2.2px, 0.85 |
| Needle | `#F0D08A` 4px over `#0A0E28` 6px at 0.5 |
| Gloss crescent | white radial 0.30 → 0, ellipse 27×16 rotated −40°, clipped to the face |
| Bezel | `#080B22` 1.4px under a rim-highlight 1.5px |

The gloss crescent is the detail that matters: fired enamel is glassy, and without a
wet highlight the faces read as matte paint no matter how good the colour is. It is
world-space — it does not rotate with the body, so the object reads as a real thing
catching a fixed light.

### Rejected again: photoreal enamel

The enamel version was right about hue and wrong about medium. Rated as a platform
element rather than a screenshot, it failed: the object ships at **80px, and 40px when
tucked**, and at that size three-stop gradients, a gloss crescent and a vignette
average into a dark blob. It read as a museum piece on a floor full of live markets.
Material realism was costing the one thing that matters — reading at a glance.

**Ship: SIGNAL.** Near-flat faces, high value contrast, a luminous edge on each hue so
the halves read as backlit panels, and an emissive needle that dominates. Same hues
(152 / 22) throughout.

| Element | Value |
|---|---|
| Green face | `#1C9264` → `#146F4C` (two stops, near-flat) |
| Rose face | `#A83A43` → `#822A33` |
| Luminous edge | `#54EDA6` / `#FF7B82`, 2.6px, 0.95 |
| Needle | `#FFE7B0` 4.4px + `0 0 3px rgba(255,214,120,0.9)` glow, over `#070A1E` 7.5px at 0.62 |
| Removed | gloss crescent, heavy vignette, three-stop face gradients |

**Strokes scale inversely with diameter.** Strokes are authored in a 100-unit viewBox,
so they shrink with the element: a 2.6-unit inlay lands at 1.66 CSS px on a 68px
phone disc — sub-pixel on a 1× display, where the brand hairlines grey out into the
face. `--inlay` is therefore set to `2.6 × (88 / diameter)`, holding the inlay at a
crisp **2.29 CSS px at every diameter** (verified at 68px and 88px), and the needle
gets the same treatment below 74px.

The hierarchy is what kills the prize-wheel read, not desaturation: the needle is the
brightest, most saturated thing on the object, so the eye lands on the pivot rather
than on two competing halves.

**Do not restore flat unlit brand hues, photoreal enamel, or a monochrome body.** All
three were built and rejected — reasons above.

---

## 1 · Why it exists, and the line around it

The mark is a needle on a pivot, poised between two outcomes. The object makes that
physical: you can throw it as hard as you like and it will always find true. That is
the brand argument in one gesture — **markets swing, and they settle.**

It is a **pause object**, not a game. Binding constraints:

- No score, no streak, no timer, no reward, no leaderboard, no sound.
- Never rendered on a surface where money is in play (stake entry, confirmation,
  cash-out, deposit, withdrawal). Boards, positions, performance and settings only.
- First-run copy states plainly: *not a market, not a bet, no prize.*
- Shown alongside session length and deposit limits on the responsible-play card,
  where "spin it when the day is loud" is a genuine offer rather than a hook.

If it ever gamifies, it stops being the brand and becomes the problem.

---

## 1b · Presence — why this is a feature and not a fidget

The object's prominence is **a function of session length**. This is the single idea
that earns it a place in the product rather than beside it.

```
needle.session(minutes)      // called by the shell, e.g. once a minute
presence = clamp(minutes / 60, 0, 1)
```

| Presence | Peek | Halo peak | Breath |
|---|---|---|---|
| 0.0 — just arrived | 50% (40px) | 0.42 | 4.6s |
| 0.5 — half an hour | 59% (47px) | 0.71 | 3.9s |
| 1.0 — an hour or more | 68% (55px) | 1.00 | 3.2s |

At zero it is a whisper you could go a whole session without registering. By an hour it
sits further out of the edge, glows brighter and breathes faster. It never speaks,
never blocks, never interrupts, never scores. It just becomes harder to not notice —
which is exactly the right pressure for a responsible-play surface, and the opposite of
a modal that tells a player to take a break.

Peek only ever *increases* with presence, so the 40px tap floor is a floor in every
state.

### `needle.acknowledge()`

The second and last platform hook. When a round the player actually holds settles, the
shell calls it and the needle gives **one quarter-turn that resolves straight back to
true** (0.62 deg/ms, 0.22 under reduced motion). One tick. It is an acknowledgement,
not a celebration — there is no variant for winning versus losing, deliberately.

That is the entire public API: `session(minutes)` and `acknowledge()`.

---

## 1c · Mobile geometry

Three things that were wrong until they were measured on real phone dimensions.

### Safe areas
Bounds carry insets read from CSS `env(safe-area-inset-*)` via a hidden probe
element, so every clamp, park pose and collision wall respects them. The object cannot
park under a notch, a Dynamic Island, or the iOS home indicator. Verified on a
390×844 frame with 47/34 insets: the bottom-parked pose clears the home indicator and
the top-parked pose clears the notch.

### Responsive diameter
`diameter() = clamp(64, min(vw, vh) × 0.19, 88)`. 80px is 22% of a 360px screen —
a thumb-sized obstruction. Measured results:

| Viewport | Diameter | Sliver | Grab pad |
|---|---|---|---|
| 360×640 | 68px | 44px | 44×68 |
| 390×844 | 74px | 44px | 44×74 |
| 414×896 | 79px | 44px | 44×79 |
| 768×1024 | 88px | 44px | 44×88 |
| 1440×900 | 88px | 44px | 44×88 |

`setSize()` keeps the **centre** stable through a resize so the object does not appear
to jump, then re-derives the tuck pose.

### The tap floor is pixels, not a fraction
A flat 50% peek leaves 32px at 64px diameter — under the design system's 40px floor.
`peek()` therefore floors on `44 / size`, and `padPx()` returns the grab pad in real
pixels. **44px in every state at every viewport**, and presence only ever adds
(52px at 64px diameter after an hour).

### Viewport-normalised momentum
`MAX_LIN` scales by `diagonal / 1700`. Without it a flick crosses a 390px phone in
~80ms — a blur, not a throw. With it a full-strength throw takes ~1.75s including two
bounces on a phone, matching desktop feel. Angular limits deliberately do **not**
scale: a spin should look identical everywhere.

`visualViewport` drives all of it, not `innerHeight` — mobile URL-bar collapse and the
on-screen keyboard both change the real viewport, and `innerHeight` reports neither.

---

## 1d · Mastery, silently

A fidget with no skill ceiling gets boring: every throw is equally "correct" and there
is nothing to aim at. So the engine tracks a personal best — **and never shows it.**

```
body.run  = { turns, bounces, spinMs }    // the current interaction
body.best = { turns, bounces, spinMs }    // best on this device
onRecord(kind, best)                      // fired when one is beaten
```

No number, no badge, no notification, no leaderboard. The reward is that a good spin
*feels* longer than your last one, and you know it. This is the one concession to
game-feel that does not violate §1, because nothing is displayed, nothing is compared
between players, and nothing is rewarded.

### Instrumentation

`onInteraction({turns, bounces, spinSeconds, presence, record})` fires **once per
completed interaction**, never per frame, and only for real interactions (>0.15 turns
or at least one bounce). The reference host re-dispatches it as a
`needle:interaction` DOM event.

This exists to answer the only question that actually decides the object's future:
*does anyone touch it, and at what session length?* Measured example from a single
corner throw: 8.00 turns, 2 bounces, 3.30s of spin, `record: "turns"`.

Ship it, watch for a week, and be willing to delete it if the answer is "never." That
is a better outcome than keeping it on faith.

---

## 1e · Accessibility contract

The object is decorative, but it is also genuinely interactive, and a stress-relief
tool that keyboard users cannot reach is a worse answer than one screen-reader users
can skip. So:

- The wrapper is `role="presentation"` — it contributes nothing itself.
- The hit target is a real `role="button"`, `tabindex="0"`, fully operable: Space
  spins, arrows move, Escape tucks.
- The label **leads with the fact that it is optional and consequence-free**: *"Needle —
  an optional fidget toy. Nothing here affects your account."* A screen-reader user can
  then skip it without wondering what they are missing. Telling someone what a thing is
  for is more accessible than hiding it.
- Focus ring: `2px solid var(--brand-500)`, offset 5px.
- Nothing is conveyed by motion alone.

---

## 1f · Feel — response, texture, discovery

The brief here was "make it addictive." That was declined and renegotiated: addictive
mechanics — variable reward, streaks to protect, escalating goals — are what §1 exists
to forbid, and on a betting platform they are the argument that sinks the object in a
license review. What was built instead is the other axis: **satisfying**. A fidget
spinner is not compulsive through reward schedules; it is loved because the physics feel
extraordinary in the hand.

### Response — three gestures, three objects

The single largest gain in feel. A flick, a shove and a nudge now behave like different
objects rather than one object at three speeds:

| Gesture | Detected by | Momentum gain | Spin kick |
|---|---|---|---|
| **flick** | high peak speed, short travel, decisive | ×1.18 | 0.09 |
| **shove** | slow, long, deliberate — you are *placing* it | ×0.74 | 0.02 |
| **nudge** | barely moved | ×0.22 | 0 |

Classified on **peak-speed-to-distance ratio**, not total distance — distance alone
reads a slow long drag as a hard throw. Thresholds are **viewport-normalised**: the same
physical thumb movement covers far fewer CSS px on a 360px phone, so absolute pixel
gates would classify every real flick as a shove and the object would feel dead on
exactly the devices most people use. Verified correct on 360, 390, 768, 1024 and 1440.

### Texture — bearing detents

`onDetent(strength, quarters)` fires every **quarter turn**, scaled by speed, into
`hapticDetent()`. One mechanism, two textures: at low speed the ticks are far enough
apart to read as discrete clicks; at high speed they fuse into a continuous purr. That
is how a real bearing feels, and it is why a single fixed buzz reads as a phone
notification rather than a machined object. Rate-limited at 14ms — tighter than the
named patterns, because detents legitimately fire in fast succession.

### Catching it

`onCatch({w, rpm})` fires only when you stop something that was **moving** — grabbing
it at rest does not qualify (verified). It gets a firmer haptic than a grab and
compresses the body, because you absorbed real momentum.

### Discovery — two things nobody is told about

1. **The clean pass.** Thrown from one edge, tucked on the *opposite* edge, without
   touching another wall. Geometrically demanding, entirely optional, and the object's
   skill ceiling. Tracked; **never displayed.** You either saw it happen or you did not,
   and if you did it on purpose you know.
2. **The closed ring.** Above **88% of max spin** the gilt trail arc completes into a
   whole circle — the mark's tipping-point motif momentarily resolved. Verified to sit
   at exactly 0 opacity at rest, at half spin, and at 88%, reaching 0.85 at full.

Neither awards anything. That is the only kind of mastery §1 permits: the reward is
proprioceptive, never numeric, never compared between players.

---

## 1g · Screen footprint — restraint on small screens

A phone screen mostly belongs to the player's content. Sizing the disc at 0.19 of the
narrow side produced a 68px object whose halo occupied **32% of a 360px screen width** —
larger than a platform FAB and, in practice, an obstruction.

| Viewport | Diameter | Visible sliver | Touch pad | Total footprint |
|---|---|---|---|---|
| 360×640 | 56px (FAB scale) | 28px | 44px | 36px — **10.0%** |
| 390×844 | 60px | 30px | 44px | 39px — **10.0%** |
| 430×932 | 67px | 34px | 44px | 45px — **10.5%** |
| 768×1024 | 88px | 44px | 44px | 70px — **9.1%** |
| 1440×900 | 88px | 44px | 44px | 74px — **8.2%** |

Three changes got it there:

1. **Diameter 0.155 of the narrow side, floor 56px** — exactly FAB scale on a phone, a
   size people already accept as "a small floating control."
2. **Halo scales with viewport** (−14% phone → −34% desktop). The halo, not the disc, is
   the largest visual footprint, so it is what gives way on a small screen.
3. **Touch target decoupled from the visible sliver.** An earlier version floored
   `peek()` at 44px of *visible disc*, which on a 56px phone forced 79% of it on
   screen — the "discreetly half-tucked" object was really almost fully visible. Wrong
   trade: the accessibility floor applies to the **hit area**, not to the pixels. The
   disc now stays half-tucked at every size and `padPx()` extends the invisible pad
   inward to meet 44px, which is the standard mobile pattern of a touch target larger
   than its glyph.

**Never above 10.5% of the narrow viewport dimension, and 44px touch at every size.**

---

## 2 · Architecture

```
needle-physics.js          pure simulation — no DOM, no framework, testable in isolation
   NeedleBody              one rigid disc: position, velocity, angle, angular velocity
   CONST                   every tunable constant in one frozen-by-convention object

host (playground or DC)    owns the DOM, the rAF loop, and rendering only
   start()/stop()          loop lifecycle; cancels itself on sleep
   paint(dt)               writes transforms; never reads layout
```

The split is deliberate: the engine can be unit-tested, reused in React Native or a
canvas renderer, and reasoned about without touching a single style.

### Transform responsibilities are split so nothing ever fights

| Layer | Owns | Never touches |
|---|---|---|
| `#needle` | `translate3d(x, y, 0)` — position | rotation, scale |
| `#tilt` | `perspective + rotateX/rotateY + scale` — inertia lean and impact squash | position |
| `#disc` | `rotate(a)` — spin | position, scale |

Three elements, three concerns. No transform string is ever composed from two sources,
which is the usual origin of jitter in objects like this.

---

## 3 · Simulation

### 3.1 Determinism

```
SUBSTEP       1000/120 ms   fixed integration step
MAX_SUBSTEPS  6             per frame
MAX_FRAME_DT  50 ms         a longer gap is discarded, not integrated
```

Frame deltas accumulate; the engine consumes them in fixed 120 Hz substeps. A 60 Hz
Android phone and a 144 Hz desktop therefore produce **identical trajectories from an
identical flick**. If six substeps are not enough (tab switch, GC pause) the backlog
is dropped rather than replayed, so the object can never teleport or spiral.

### 3.2 Translation

```
x  += vx · dt
v  *= exp(−dt / TAU_LIN)        TAU_LIN 520 ms     viscous drag
|v| -= MU_LIN · dt              MU_LIN 0.00026     Coulomb friction
MAX_LIN 4.2 px/ms  ≈ 4200 px/s
```

Both drag terms are present on purpose. Viscous drag alone decays asymptotically and
the object crawls for seconds; Coulomb friction subtracts a constant and guarantees a
clean, definite stop. Together: a long glide that ends decisively.

### 3.3 Rotation

```
a  += w · dt
w  *= exp(−dt / TAU_ANG)        TAU_ANG 1420 ms    bearing drag
|w| -= MU_ANG · dt              MU_ANG 0.00015     bearing stiction
MAX_ANG 2.8 deg/ms ≈ 466 rpm
```

`TAU_ANG` is nearly three times `TAU_LIN`: the disc keeps turning long after it has
stopped travelling, which is both correct for a low-friction bearing and the part that
makes it satisfying.

### 3.4 Collisions — impulse, not reversal

For a wall with normal **n** and tangent **t**:

```
vn' = |vn| · RESTITUTION         RESTITUTION 0.58   (0 if |vn| < MIN_BOUNCE 0.20)
vt' = vt · WALL_FRICTION         WALL_FRICTION 0.88
w  += (vt − vt') · SPIN_COUPLING · r        SPIN_COUPLING 0.014
```

Three consequences worth stating, because they are what separate this from a lerp:

1. **Glancing impacts create spin.** The tangential momentum lost to friction is not
   discarded — it becomes angular momentum. Clip an edge on an angle and the disc
   starts turning, exactly as a real one would.

   **Measured** at 88px diameter, 1440×900, `calm = 1`, peak rpm within 12 frames of
   contact:

   | Glancing throw (vx, vy) | Peak | At 200ms |
   |---|---|---|
   | soft (2.2, 1.4) | 16.6 rpm | 10.3 rpm |
   | representative (2.2, 3.0) | **36.1 rpm** | 27.4 rpm |
   | hard (3.0, 3.4) | 41.0 rpm | 31.7 rpm |

   Visible, well short of a free spin. The transfer scales with `this.radius`, so these
   move with the responsive diameter (~70% of the above at 64px). Any change to
   `SPIN_COUPLING` must be re-measured at both ends of the size range, and this table
   and acceptance test 4 in `CLAUDE-CODE-BRIEF.md` updated together.
2. **Micro-bounces are absorbed.** Below `MIN_BOUNCE` the normal component is zeroed
   instead of reflected, so the object never buzzes against an edge.
3. **A spinning disc walks.** While in contact, `ROLL_COUPLING` (0.00012) bleeds spin
   into travel along the wall — a faint, correct drift.

### 3.4b Swept collision — conservative advancement

Collision is **swept, not discrete**. At max velocity a 120Hz substep moves the body
~35px, which is enough to pass straight through a thin obstacle. So each substep's
displacement is subdivided until no single motion step exceeds `MAX_STEP_FRAC` (0.35)
of the radius, up to 12 micro-steps, with a full collision test after each.

```
dist  = |v| · dt
steps = min(12, ceil(dist / (radius × 0.35)))
```

**Verified:** a 12px-thin wall across a 1440×900 board, hit head-on at max velocity
(35px per substep — three times the wall's thickness). Result: **0 frames past the
wall**, 2 clean impacts, body returned to its own side. Discrete collision tunnels this
test every time.

### 3.4c Interior keep-out zones

`obstacles: () => [{x, y, w, h}]` — the engine collides with interior rectangles as
well as viewport walls, so the object deflects off a docked bet slip or a bottom nav
instead of passing through it. The reference host derives them from any element carrying
`data-needle-keepout`, read once per frame.

The disc is tested as a circle against each rect; the nearest-point normal means it
**slides along a long edge and deflects off a corner** with the same impulse, spin
transfer and squash as a wall. Diagonal normals are handled — the tangent is derived by
rotating the normal, never assumed axis-aligned.

If the centre ends up inside a rect (a layout change appearing underneath it), it
escapes along the shallowest axis rather than exploding. Verified: placed dead-centre in
a 300×200 rect, it exits cleanly and comes to rest, state finite.

**Two traps in the host-side read** — both were live bugs, fixed:

1. **Never cache "do any keep-outs exist."** The documented case is a docked bet slip,
   which mounts on *interaction*, not at boot. A boot-time existence flag is stale
   exactly when the feature is needed, and the obstacle silently never fires. Match the
   selector fresh every read.
2. **Never drive the read from the rAF loop, or from a frame counter it increments.**
   That loop sleeps at rest, so an obstacle mounted during sleep is never seen. The
   engine's own `obstacles()` callback must trigger the read, cached on **elapsed
   time** (8ms) so it is self-invalidating regardless of who is driving the simulation.

**Verified with the obstacle mounted after boot:** 0 obstacles at boot → 1 registered
on mount → thrown head-on at max velocity gives 2 impacts and **0 frames past a 12px
wall** → a glancing hit off the panel creates 18.8 rpm → removing the element clears it
to 0 → still rests at `mod 360 = 0.0000` and sleeps.

With obstacles present it still lands on `mod 360 = 0.0000` and sleeps.

### 3.5 The settle — how it always finds true

Below `SETTLE_ENTER` (0.06 deg/ms) the free spin hands over to a spring targeting the
**nearest whole turn**:

```
target = round(a / 360) · 360
ω      = √SPRING_K                     SPRING_K 1.65e−5
w     += (SPRING_K · (target − a) − 2 · SPRING_Z · ω · w) · dt
                                       SPRING_Z 0.88
```

ζ = 0.88 is under-damped by a hair, which yields **exactly one small correction** and
no second wobble — the "one overshoot maximum" law of the wider motion system, in
physics rather than in a bezier. Within 0.10° it snaps and sleeps. The handover is guarded: a body already at true does
not re-enter settling, which would otherwise flip the flag every substep and keep the
rAF loop alive forever at zero motion (a real bug found and fixed in testing).

Because the target is a multiple of 360°, the resting frame is pixel-identical to the
logo no matter how many turns were put in.

**Verified deterministically** (engine driven at a fixed step, bypassing rAF):

| Test | Result |
|---|---|
| Corner throw + heavy spin | 2 bounces, parks exactly, `angle mod 360 = 0.0000`, sleeps |
| Free spin, 2.8 deg/ms | 9.00 full turns, `angle mod 360 = 0.0000`, 0 rpm, sleeps |
| Gentle nudge (0.18 px/ms) | Definite stop in 25 frames (Coulomb friction working) |
| Glancing wall hit from zero spin | 24.2 rpm created |
| Slow wall touch | Absorbed, no buzz |
| Reduced motion, same flick | Capped to 0.34 deg/ms, still lands true, sleeps |

### 3.6 Edge parking

```
PARK_DELAY  260 ms     of stillness before it tucks itself
WAKE_LINGER 2600 ms    extra grace after a tap-to-wake, so there is time to grab it
PEEK        0.50       fraction of the disc left visible (40px of an 80px disc)
PARK_K/Z    4.2e−5 / 0.92     the glide-home spring
EDGE_MARGIN 14 px
```

Nearest edge is chosen by distance with top and bottom **weighted 1.35×** — a disc on
the top edge eats the reading column, so sides win ties. A parked body is deliberately
outside the viewport and is exempt from the free-motion clamp (this was a real bug in
v1: the clamp kept dragging the tucked pose back on-screen).

---

## 4 · Interaction

| Gesture | Behaviour |
|---|---|
| Press inside the gold hub (< 34% radius) | `move` — carries the body 1:1 |
| Press anywhere else on the disc | `spin` — tracks true angular delta about the centre, unwrapped across ±180°, so it follows your wrist exactly |
| Tap the tucked sliver (< 8 px travel, < 320 ms) | Wakes it to a fully visible pose instead of throwing it nowhere. Calls `wake(true)`: the host has already invoked `hold()`, which clears the parked flags, so the force flag is required — without it `wake()` silently no-ops and the primary way to summon the object is dead. |
| Drag and release | Momentum from a **recency-weighted fit over the last 110 ms** — the flick you feel is the flick you performed |
| Carry it fast | Imparts a little spin (`vx · 0.05`), as a real object would |
| Second finger | Ignored; the first pointer id owns the object |
| Pointer capture | Set on grab, so dragging outside the window keeps working |
| `blur` / `pointercancel` | Treated as a release; the object can never get stuck held |

### Keyboard (fully operable)

| Key | Action |
|---|---|
| `Space` / `Enter` | Wake if tucked, otherwise spin (1.7 deg/ms) |
| Arrows | Move 12 px (48 px with `Shift`) |
| `Escape` | Tuck to the nearest edge |

Focus ring: `2px solid var(--brand-500)`, offset 5px, on the circular hit target.

### Never in the way

The wrapper is `pointer-events: none` and only the inscribed circle is hittable. The
object is `position: fixed` above the app, but every click, scroll and hover
underneath behaves as if it were not there. No bounding-box dead zone.

---

## 5 · Rendering

All effects are transform, opacity or filter only — no layout, no paint in the
animation frame.

| Effect | Implementation | Why |
|---|---|---|
| **Needle legibility** | 4px `#F0D08A` over a 6px `#0A0E28` underlay at 0.42 | The needle IS the brand, so it must be the brightest thing on the object. The dark underlay separates it from both wedges at every angle. |
| **Seating light** | `#spec` diagonal (white 0.17 → `#0A0E28` 0.42) + `#vig` edge vignette | The wedges keep their exact brand hues — brand law forbids re-hueing the mark — so depth comes from light instead of from repainting. |
| **Bezel** | 1.4px `#080B22` at 0.72 under a 1.5px `#rim` highlight | A crisp machined edge. The earlier 3px dark ring read as a muddy halo. |
| **Pivot** | r6.3 four-stop gold radial + 0.5px `#7C5A22` bezel + r1.7 specular dot, on two dark shadow discs | It is the grab target, so it has to read as a jewel you would reach for — not a screw. |
| **Vector motion smear** | Two ghost needles lag the real one by `min(46°, |w| · 26)`, at 0.5 / 0.28 opacity | Sharp at any DPI. A gaussian blur softens the whole disc and looks like a rendering artifact; angular ghosts are what a spinning object actually looks like. |
| **Colour averaging** | A green→rose gradient disc fades in above `0.55 deg/ms` | At speed the two wedges physically average into one ring, as a real colour wheel does |
| **World-space specular** | A fixed light gradient (`#spec`) sits *above* the rotating group | The highlight stays put while the body turns under it — the single strongest cue that this is a machined object and not a rotating picture |
| **Inertia lean** | `rotateX(−vy · 2.6°)`, `rotateY(vx · 2.6°)`, clamped ±7°, `perspective(420px)` | The disc tips into its own acceleration |
| **Impact squash** | Compression spring on scale, kicked by `−min(0.09, speed · 0.05)` on impact, recovering at 0.055/0.86 | The impact is felt in the body, not faked by bouncing the artwork |
| **Impact ring** | Gilt ring offset along the contact normal, fading out over 280 ms `--m-glide` | Locates the hit |
| **Spin trail** | Conic gilt arc, opacity `min(0.66, |w|/2.2)`, rotated with the spin direction | Leads the motion; flips with direction |
| **Diameter** | 80px, disc inscribed in the box; hub grab zone 34% radius = 27px | Worry-stone scale, not widget scale. |
| **Tucked grab pad** | While parked the hit area leaves the circle and becomes a pill covering the visible half edge-to-edge: 40×80 px | A circle's tappable chord tapers to nothing toward the viewport interior — at 46% peek it measured 78px wide at the extreme edge but only 16px a third of the way in, and the generous part sits exactly where a real app's status bar will steal it. The pad is a uniform 40px across the full 80px height, meeting the design system's tap floor at every point. |
| **Tucked presence** | Aqua halo breathing 3.6 s + a 2px aqua rim arc, both biased toward the visible half | Noticeable without asking for attention. Aqua is the design system's finishing-pass hue (≤ 8% coverage) — gold would break the *gold = earned money* law. |

Stepped writes: smear, blend and trail opacities are only written when they change by
more than ~0.015, so the hot loop performs three or four style writes per frame, not
twenty.

---

## 6 · Performance

- **One rAF while moving, zero when still.** `body.awake` gates the loop; it cancels
  itself and releases `will-change` on sleep.
- **No allocation in the hot loop.** Scalar maths only; the pointer trail is a bounded
  8-entry array reused in place.
- **Pointer input is consumed on the frame, not on the event.** `pointermove` only
  records the latest position; the loop applies it. A 240 Hz mouse therefore cannot
  cause two paints in one frame — the classic source of stutter here.
- **Frame-rate-independent springs.** The squash spring scales by `dt/16.67` and
  damping uses `pow(0.86, f)`, so it resolves in the same wall-clock time at 60 and
  144 Hz.
- **NaN-guarded.** Every integration ends in `guard()`; angle is reduced modulo 360°
  past 1e6 so float precision can never drift.
- **`visibilitychange`** cancels the loop when hidden and clears the accumulator on
  return, so a backgrounded tab resumes exactly where it was.

## 7 · Reduced motion

`calm = 0.34` when `prefers-reduced-motion: reduce`, watched live via a `matchMedia`
listener (not read once at boot):

- Flicks are capped to a single slow correcting turn rather than a free spin.
- Trail, impact ring, inertia lean and the tucked breathing animation are disabled;
  the halo stays on at fixed opacity so presence is not lost.
- The object remains fully functional — grab, carry, throw, keyboard, park.

Meaning is never carried by motion alone: the settle communicates arrival, but the
mark itself communicates what the object *is*.

---

## 8 · Complete state table

| State | Trigger | Spec |
|---|---|---|
| tucked | rest + `PARK_DELAY` | 50% peek (40px), 40×80 grab pad, loop stopped, aqua halo + rim arc |
| tap-to-wake | < 8 px, < 320 ms on the sliver | `wake(true)` → park spring to the visible pose, then holds out ~2.9 s before re-tucking |
| auto-park | 260 ms of stillness | weighted nearest edge, `PARK_K/Z` glide |
| released | grab from tucked | `nf-in` 340 ms `--m-settle` |
| first run | first release, once | disclaimer card, `50pick.needle.hintSeen` |
| carried | grab inside hub | 1:1, no easing while held |
| spun | grab outside hub | unwrapped angular tracking |
| thrown | release with travel | recency-weighted momentum, clamped |
| collision | wall contact | impulse + spin transfer + squash + ring |
| in flight | `|v| > SLEEP_LIN` | viscous + Coulomb drag, wall walking |
| coasting | `|w| > SLEEP_ANG` | smear, colour blend, trail |
| settling | `|w| < SETTLE_ENTER` | ζ = 0.88 spring to nearest whole turn |
| at rest | below both thresholds | angle snapped exact, position persisted |
| focused | keyboard focus | 2px `--brand-500` ring, offset 5 |
| resized | resize / rotate | `reclamp()` → `snapPark(edge)` |
| backgrounded | tab hidden | loop cancelled, accumulator cleared on return |
| reduced motion | OS preference | `calm 0.34`, decorative loops off |

Persistence: `50pick.needle.pos` → `{x, y, edge}`. It comes back where you left it,
on the edge you left it on.

---

## 9 · Tweakable feel (three dials, not thirty)

Exposed as Design Component props. Each reshapes the whole object:

| Dial | Options | What changes |
|---|---|---|
| **Material** | `brass` (ship) · `glass` · `lead` | `TAU_LIN`, `TAU_ANG`, `MU_LIN`, `MU_ANG`, `RESTITUTION`, `WALL_FRICTION`, `SPIN_COUPLING` together. Glass: light, lively, bouncy (e 0.82, coupling 0.023). Lead: heavy, dead, one thud (e 0.24, coupling 0.008). |
| **Discipline** | `always` (ship) · `prefers` · `free` | `trueLock` scales the settle spring. `always` = 1 (lands on the logo, to the degree), `prefers` = 0.28 (drifts home lazily), `free` = 0 (stops wherever it runs out). |
| **Habitat** | `edge` (ship) · `roaming` | Whether it tucks to an edge or stays wherever it was left. |

Ship configuration: **brass · always · edge.**

---

## 10 · Integration

```html
<!-- once, in the app shell, above everything -->
<script type="module">
  import { NeedleBody } from "/needle-physics.js";
  // see Needle Playground.html for the ~150-line reference host
</script>
```

Requirements: `theme/globals.css` for tokens, `theme/motion.css` for the motion
language. The object is `z-index: 900` — below modals (1000) by design: a dialog is a
decision, and the needle must never sit on top of one.

Mount it in the app shell so it survives route changes; the wrapper being
pointer-transparent means no page needs to know it is there.

---

## 11 · Haptics

`needle-haptics.js`. Every vibration the object can produce, as a named vocabulary
rather than `navigator.vibrate()` scattered through interaction code.

| Pattern | Fires on | ms |
|---|---|---|
| `grab` | picking it up | 5 |
| `wake` | tap-to-wake from the edge | 4 · 26 · 7 |
| `cross` | the needle sweeping past true at speed | 3 |
| `impact` | wall contact, **scaled by real impact speed** | 5–16 |
| `tuck` | arriving parked at an edge | 8 |
| `trueFound` | the needle correcting itself **onto true** — the object's most meaningful moment | 11 |
| `settled` | coming to rest — two soft beats, like a latch closing | 5 · 34 · 9 |

Rules:

- **Physical events only.** Contact, passing true, coming to rest. Never encouragement,
  never reward, never to pull attention back to the object.
- **Proportional.** A hard hit buzzes harder because it *is* harder. Below 0.35 px/ms
  nothing fires — that is a graze, and a graze you should see but not feel.
- **Rate-limited to 40 ms.** Two haptics closer than that are indistinguishable to skin
  and only cost battery; the later one is dropped.
- **Silent when asked.** `prefers-reduced-motion`, the in-app mute
  (`50pick.haptics.muted`, exposed via `setMuted()` for the settings panel), or a
  hidden document all suppress everything.
- **Fails silently.** No feature-detection branches in calling code.

**Honest limitation — duration is not amplitude.** The web Vibration API exposes only
ON/OFF durations: there is no amplitude or sharpness control, unlike iOS Core Haptics
or Android's `VibrationEffect` amplitude API. `hapticImpact` therefore scales
*duration* to approximate intensity, which is a real hack — a longer buzz reads as
"harder" to most people, but it is not the same thing, and on motors with slow spin-up
it reads as "mushier" instead. If 50pick ships a native wrapper, replace this module's
internals with real amplitude curves and keep the call sites identical.

iOS note: the Vibration API does not exist in Safari, so iOS gets no haptics. There is
no legitimate web substitute — the AudioContext trick is a dark pattern and behaves
inconsistently. Do not add a fake one.

---

## 12 · Bugs found in verification (all fixed)

Recorded because each was invisible in a screenshot and only surfaced under probing.

1. **Tucked pose dragged back on-screen.** `stepFree()` clamped every body to the
   viewport, including a parked one that is deliberately outside it. Parked bodies now
   return early from the free-motion step.
2. **`settling` flip-flopped at rest.** An at-rest body re-entered the settle spring
   every substep (settle → snap → settle …), so `awake` never went false and the rAF
   loop ran forever at zero motion — breaking the zero-CPU guarantee. The handover is
   now guarded on there actually being a correction to make.
3. **Impact-induced spin was imperceptible.** `SPIN_COUPLING` at 0.0011 produced
   ~0.7 rpm from a glancing hit. Raised to 0.014. The "~24 rpm" originally recorded
   here was measured at the old fixed 96px diameter and was never re-taken after v3
   made the disc responsive (64–88px) — coupling multiplies by `this.radius`, so the
   figure moved. Re-measured properly in §3.4: 36.1 rpm peak on a representative
   glance at 88px. Lesson: any doc number that depends on geometry must be re-measured
   when the geometry changes.
4. **Tap-to-wake was dead code.** `hold()` calls `unpark()`, clearing `parked` and
   `parking`; `wake()` then early-returned on its own guard, so tapping the sliver did
   nothing and the object simply re-tucked. The keyboard path worked because it never
   calls `hold()` first, which is why it went unnoticed. `wake(force)` added.
5. **Tucked tap target below the floor.** 46% peek gave 36.8px, and the circular hit
   area tapered hard inward. Peek raised to 50% and the tucked hit area replaced with
   a uniform 40×80 pad.
6. **Edge-dependent chrome cached on the wrong key.** The grab pad and halo were
   memoised on the tucked boolean alone, so re-parking on a *different* edge left both
   on the old one. Now keyed on the edge itself.
7. **Grab pads were mirrored.** Parked on the right edge it is the box's *left* half
   that is on screen; the first pads covered the wrong half and measured 3px. Now
   verified at a uniform 40×80 on all four edges.
8. **Tap-to-wake re-tucked in 1.5 s** — faster than a person can reach it. Added
   `WAKE_LINGER` (2600 ms) as a negative `stillFor` grace, and stopped the park-spring
   completion from resetting that clock. Measured: 2.95 s out, then tucks and sleeps.
