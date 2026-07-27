# CLAUDE CODE — implementation brief: The Needle

Copy this whole file to Claude Code. It is the complete instruction set for wiring the
Needle into the 50pick production app. It assumes the three source files ship alongside
it.

---

## 0 · What you are integrating

**The Needle** is a persistent, physically-simulated pause object for 50pick.tz (a
Tanzanian real-money prediction market). It is built from the company mark — a needle
on a pivot between two outcomes — and lives on the edge of the app shell at all times.

Players can grab it, carry it, throw it corner to corner, and spin it. However hard it
is spun it always comes to rest as the logo, exactly. It is a **responsible-play
surface**, not a game: its prominence grows with session length, so it becomes harder
to ignore the longer someone has been playing.

**It is not a feature request. It is already designed, built and verified.** Your job
is integration, not redesign.

---

## 1 · Files you are given

| File | What it is | Do you edit it? |
|---|---|---|
| `needle-physics.js` | The simulation engine. ES module, zero dependencies, no DOM. | **No.** Treat as a vendored library. |
| `needle-haptics.js` | The haptic vocabulary. ES module, zero dependencies. | **No.** |
| `Needle Playground.html` | Bare reference host: the ~180-line `<script type="module">` at the bottom is the canonical renderer. | Port it, don't rewrite it. |
| `NEEDLE-SPEC.md` | Full specification: colour rationale, dynamics, all 20 states, haptics, bug log. | Read §0, §1, §1b, §1c before writing anything. |

If any doc disagrees with `needle-physics.js`, **the engine wins**.

---

## 2 · Where it goes

Mount **once, in the app shell** (Next.js: `app/layout.tsx`), so it survives route
changes. Never mount it per-page — remounting resets its position and breaks
persistence.

```
<body>
  {children}
  <Needle />        {/* single instance, app-wide */}
</body>
```

- `z-index: 900` — deliberately **below modals (1000)**. A dialog is a decision; the
  needle must never sit on top of one.
- The wrapper is `pointer-events: none`; only the object itself is hittable. No page
  needs to know it is there, and nothing underneath is blocked.

---

## 3 · The only two API calls

```js
needle.session(minutes)   // current session length; call once a minute
needle.acknowledge()      // a round the player HOLDS has settled
```

That is the entire public surface. Do not add more.

**`session(minutes)`** drives presence: peek 44px → 52px, halo 0.42 → 1.0, breath
4.6s → 3.2s, ramped over the first hour then held. Wire it to the same session timer
that feeds the responsible-play card. If you do not have one, use time since login.

**`acknowledge()`** gives one quarter-turn back to true. Call it **only** when a
position the player actually holds resolves. There is deliberately **no win/loss
variant** — it is an acknowledgement, not a celebration. Do not add one.

---

## 3b · Optional hooks (wire these — they are how the object earns its place)

```js
new NeedleBody({
  ...,
  onTrue: () => haptic("trueFound"),        // it corrected itself onto true
  onRecord: (kind, best) => {},             // personal best beaten — DO NOT DISPLAY IT
  onInteraction: (d) => track(d),           // once per interaction, never per frame
});
```

**`onInteraction`** is the important one. It fires once per completed interaction with
`{turns, bounces, spinSeconds, presence, record}`. Send it to analytics.

This exists to answer the only question that decides the object's future: *does anyone
touch it, and at what session length?* Ship it, watch for a week, and be willing to
delete it if the answer is "never." **Please wire this before launch, not after** — a
retrofit means a wasted week of data.

**`onRecord`** fires when a personal best is beaten. Track it; **never render it.** No
badge, no number, no toast, no leaderboard. The point is that a good spin feels longer
than your last one — displaying it turns a pause object into a game and violates Rule 2.

---

## 3c · Feel hooks (wire all of them — this is what makes it worth having)

```js
new NeedleBody({
  ...,
  onDetent: (strength, quarters) => hapticDetent(strength, quarters),  // bearing texture
  onCatch: (info) => { haptic("catch"); /* + squash */ },              // caught mid-spin
});
```

`body.gesture` is set on every release to `"flick"` / `"shove"` / `"nudge"` / `"spin"`
if you need it for anything host-side.

**Do not skip `onDetent`.** It is the difference between a machined object and a
notification buzz, and it is the single most-noticed thing about the object in the hand.

## 3d · What "make it addictive" must not mean

If product asks for the object to be made addictive, the answer is no, and the reason is
not squeamishness: variable rewards, streaks with something to lose, escalating goals and
re-engagement prompts are the exact argument that gets this object removed in a license
review — *an interactive toy inside a gambling app engineered to be compulsive.*

Push on **satisfying** instead, which has no ceiling: feel, response, texture, discovery.
Spec §1f is the built version of that. "That's the nicest thing in this app" is the
target; "I can't stop" is a failure state.

---

## 4 · Hard rules — do not violate these

1. **Never render it on a money surface.** Hide it entirely on stake entry, bet
   confirmation, cash-out, deposit and withdrawal routes. A fidget next to a live
   money commit is a dark pattern.
2. **No score, no streak, no reward, no leaderboard, no sound, no notification.** If a
   product request arrives asking for any of these, escalate rather than build. The
   moment it gamifies it stops being a responsible-play object and becomes the problem
   it exists to soften.
3. **Do not change its colour.** Three liveries were built and two rejected. The
   rationale is `NEEDLE-SPEC.md §0`. Read it before touching a single hex value.
4. **Do not add a second overshoot** to anything, and do not replace the settle spring
   with a physics-library spring. Its rest angle must stay an exact multiple of 360°.
5. **Respect `prefers-reduced-motion`.** Already handled in the engine (`calm = 0.34`)
   and the haptics module. Do not bypass it.
6. **Never mount more than one.**
7. **Never display the personal best.** `onRecord` is for analytics only. See §3b.
8. **Do not replace conservative advancement with a single discrete test.** Collision
   is swept: displacement is subdivided so no step exceeds 35% of the radius. Removing
   this makes the object tunnel through thin obstacles at speed. Spec §3.4b.

---

## 5 · Integration steps

### 5.1 Copy the files
`needle-physics.js` and `needle-haptics.js` into your vendor/lib directory. They are
plain ES modules — no build config, no types package, no npm install.

### 5.2 Port the host
Take the `<script type="module">` block from `Needle Playground.html` verbatim and wrap
it in your framework's mount lifecycle. It already handles: rAF loop, pointer capture,
keyboard, resize, `visualViewport`, `visibilitychange`, safe areas, responsive
diameter, and persistence.

React sketch (do not paraphrase the internals — port them):

```jsx
"use client";
import { useEffect, useRef } from "react";

export function Needle() {
  const ref = useRef(null);
  useEffect(() => {
    let cleanup;
    (async () => {
      const { NeedleBody } = await import("@/lib/needle-physics");
      const hx = await import("@/lib/needle-haptics");
      cleanup = mountNeedle(ref.current, NeedleBody, hx);  // ported from the playground
    })();
    return () => cleanup && cleanup();
  }, []);
  return <div ref={ref} />;
}
```

**Every listener the playground adds must be removed on unmount:** `pointermove`,
`pointerup`, `pointercancel`, `blur`, `resize`, `orientationchange`,
`visualViewport` resize + scroll, `visibilitychange`, and the `matchMedia` change
listener. Leaking these is the most likely integration bug.

### 5.3 Wire the two calls
```js
// once a minute, from wherever session length already lives
needle.session(sessionMinutes);

// in the settlement handler, only for positions this player holds
if (position.userId === currentUser.id) needle.acknowledge();
```

### 5.3b Keep-out zones (optional)

If a docked panel or bottom nav should physically block the object rather than sit under
it, put `data-needle-keepout` on the element. The host reads the rects once per frame
and the engine collides with them — the object deflects, slides along edges and takes
spin off corners exactly as it does off a viewport wall. No other wiring needed.

Use sparingly: every keep-out zone is a place the object cannot rest, and too many make
its behaviour feel arbitrary.

⚠ **Two traps if you reimplement the read** (both were live bugs here — port the
playground's version rather than rewriting it):

1. **Do not cache whether any keep-outs exist.** A docked bet slip mounts on
   interaction, not at boot, so a boot-time flag is stale precisely when the feature
   matters — and it fails silently, with the object passing straight through the panel
   and no error to explain why.
2. **Do not read them in the rAF tick, or gate them on a counter that tick increments.**
   The loop sleeps at rest, so anything mounted during sleep is invisible to it. Let the
   engine's `obstacles()` callback trigger the read and cache it on elapsed time (8ms).

Test it the way it actually happens: mount the element **after** boot, then throw the
object at it at max velocity and assert zero frames past it.

### 5.4 Route gating
```js
const HIDDEN_ON = [/^\/bet\//, /^\/cashout/, /^\/wallet\/(deposit|withdraw)/, /\/confirm$/];
// hide the container entirely on match — do not merely lower opacity
```

### 5.5 Settings
Expose the haptics mute in the existing accessibility settings panel:
```js
import { setMuted, getMuted, hapticsAvailable } from "@/lib/needle-haptics";
// hide the control entirely when !hapticsAvailable() (all desktop, all iOS Safari)
```

---

## 6 · Storage keys it owns

| Key | Shape | Meaning |
|---|---|---|
| `50pick.needle.pos` | `{x, y, edge}` | last position and parked edge |
| `50pick.needle.hintSeen` | `"1"` | first-run disclaimer dismissed |
| `50pick.haptics.muted` | `"1"` / `"0"` | haptics mute |

Do not clear these on logout — they are device preferences, not session state.

---

## 7 · Performance contract — do not regress these

- **One rAF while moving, zero when still.** The loop cancels itself and releases
  `will-change` on sleep. If you ever see a persistent rAF at rest, that is a bug (it
  happened once already — see spec §12.2).
- **Transform, opacity and filter only.** No layout, no paint in the animation frame.
- **Pointer input is consumed on the frame, not on the event.** `pointermove` records;
  the loop applies. Do not "simplify" this — it is what stops a 240Hz mouse painting
  twice per frame.
- **Fixed 120Hz substeps.** A 60Hz phone and a 144Hz desktop must produce identical
  trajectories. Do not replace with a variable-dt integrator.
- No allocation in the hot loop.

---

## 7b · Tuning surface — how to change the feel

Every knob is in `CONST` at the top of `needle-physics.js`. Change values there, never
inside the integrator. After any change, re-run §8 and re-measure at **both** 64px and
88px, because several effects scale with radius.

### Spin speed and duration
| Constant | Ship | Effect |
|---|---|---|
| `MAX_ANG` | 2.8 deg/ms (466 rpm) | Hard ceiling on spin. Raise for a wilder toy; above ~3.5 the smear stops reading as rotation and becomes a flicker. |
| `TAU_ANG` | 1420 ms | Bearing drag time constant — **the single biggest feel knob**. Higher = longer, more luxurious coast. 800 feels cheap, 2000+ feels frictionless. |
| `MU_ANG` | 0.00015 deg/ms² | Stiction. This is what makes it *stop* rather than crawl. Set to 0 and it creeps for many seconds. |
| `SETTLE_ENTER` | 0.06 deg/ms | When the free spin hands over to the homing spring. |

Flick strength is a call argument, not a constant: `body.flick(1.9)`. Pointer flicks
derive their own speed from the gesture (§4).

### Full rotations and where it stops
| Constant | Ship | Effect |
|---|---|---|
| `SPRING_K` | 1.65e−5 | Homing spring stiffness. Higher snaps home faster and more mechanically. |
| `SPRING_Z` | 0.88 | Damping ratio. **Below 1 by a hair on purpose** — exactly one small correction. At 1.0 it is dead-flat and lifeless; at 0.7 it wobbles twice and looks broken. |
| `SNAP_DEG` | 0.10° | Snap-to-exact threshold. |
| `body.trueLock` | 1 | Runtime, not a constant. 1 = always lands as the logo; 0.28 = drifts home lazily; 0 = stops wherever it runs out. |

The rest angle is always `round(a / 360) × 360`, so **any** number of turns lands
pixel-identical to the logo. Verified at 9.000 turns from `flick(2.8)`, `mod 360 = 0.0000`.

### Collisions
| Constant | Ship | Effect |
|---|---|---|
| `RESTITUTION` | 0.58 | Energy kept on a normal bounce. `glass` preset uses 0.82, `lead` 0.24. |
| `WALL_FRICTION` | 0.88 | Tangential velocity kept. Lower = more grip = more spin transfer. |
| `SPIN_COUPLING` | 0.014 | Tangential→angular transfer. **Multiplies by `this.radius`** — re-measure at both sizes. |
| `MIN_BOUNCE` | 0.20 px/ms | Below this the normal component is absorbed, not reflected. Lower it and the object buzzes against edges. |
| `ROLL_COUPLING` | 0.00012 | A spinning disc walks along a wall it is touching. |
| `MAX_LIN` / `REF_DIAG` | 4.2 / 1700 | Linear ceiling, scaled by `diagonal / REF_DIAG`. |

### Corner and multi-edge behaviour — already correct, do not "fix" it

Corners are handled by resolving X and Y as **two independent impulses in the same
substep**, not as a special case. This is deliberate: each wall gets its own normal,
its own restitution and its own spin transfer, which is what a real disc does. Measured
on a 1440×900 frame at 88px:

| Scenario | Result |
|---|---|
| Corner slam at max speed into the bottom-right | 3 wall hits (R, B, T), peak 248 rpm, rests at `mod 360 = 0`, sleeps |
| Max diagonal across the full board | 2 hits, peak 461 rpm (clamped at `MAX_ANG`), rests exact, sleeps |
| Hostile injection `vx = vy = w = 99` | Clamped by `guard()`; 4 hits on all four walls; never escapes; rests exact, sleeps |
| Shallow skim along one wall (0.05 px/ms) | **0 impacts** — `MIN_BOUNCE` absorbs it, no buzz |

In every case: state stayed finite, the body never escaped the travel box, and it came
to rest as the logo and slept. If you touch `collide()` or `stepFree()`, re-run all four.

---

## 8 · Acceptance tests

Run these against the real build. Each has a known-good result.

```js
// 1 · lands on the logo, exactly — after any number of turns
body.unpark(); body.a = 0; body.flick(2.8);
for (let f = 0; f < 1500; f++) body.advance(16.67);
console.assert(((body.a % 360) + 360) % 360 === 0);   // expect exactly 0
console.assert(!body.awake);                          // expect asleep

// 2 · throw bounces, tucks exactly, sleeps
body.unpark(); body.x = 40; body.y = 40; body.vx = 3.2; body.vy = 2.2; body.w = 2.5;
for (let f = 0; f < 900; f++) body.advance(16.67);
const pose = body.parkPose(body.edge);
console.assert(Math.abs(body.x - pose.x) < 1.5 && Math.abs(body.y - pose.y) < 1.5);

// 3 · tap floor holds at every viewport
[[360,640],[390,844],[414,896],[1440,900]].forEach(([w,h]) => {
  /* set bounds, setSize(clamp(64, min(w,h)*0.19, 88)) */
  console.assert(body.padPx() >= 40);
});

// 4 · a glancing wall hit creates visible spin from zero.
// Sample the PEAK, not a value 200ms later: bearing drag has eaten a third of the
// impulse by then, so a late sample measures decay rather than the transfer.
// Input is a representative throw (a real flick has real tangential speed).
body.unpark(); body.w = 0; body.settling = false;
body.x = body.limits().maxX - 4; body.y = 300;    /* against the right wall */
body.vx = 2.2; body.vy = 3.0;
let peakRpm = 0;
for (let f = 0; f < 12; f++) { body.advance(16.67); peakRpm = Math.max(peakRpm, body.rpm); }
console.assert(peakRpm > 25);   // measured 36.1 rpm at 88px, 26.2 rpm at 64px (0.72x)

// 5 · corners and hostile input: never escapes, never NaNs, always rests as the logo
[[b => { const L = b.limits(); b.x = L.maxX - 2; b.y = L.maxY - 2; b.vx = b.maxLin(); b.vy = b.maxLin(); b.w = 2.0; }],
 [b => { const L = b.limits(); b.x = L.maxX / 2; b.y = L.maxY / 2; b.vx = 99; b.vy = -99; b.w = 99; }]
].forEach(([setup]) => {
  body.unpark(); body.settling = false; setup(body);
  const L = body.limits();
  for (let f = 0; f < 600; f++) {
    body.advance(16.67);
    console.assert(body.x >= L.minX - 1 && body.x <= L.maxX + 1);   // never escapes
    console.assert(Number.isFinite(body.x) && Number.isFinite(body.w));
  }
  console.assert(((body.a % 360) + 360) % 360 === 0);
  console.assert(!body.awake);
});
```

Manual checks:
- Nothing under the object is blocked — click, scroll and hover through its bounding box.
- On a notched phone it never parks under the notch or home indicator.
- Collapse the mobile URL bar: it re-parks smoothly, never stranded mid-air.
- Keyboard only: Tab to it, Space spins, arrows move, Escape tucks. Focus ring visible.
- With reduced motion on, everything still works and nothing loops.

---

## 9 · If you are asked to change it

| Request | Answer |
|---|---|
| "Make it more colourful / use the brand green and red properly" | Read spec §0. Flat brand hues were built and rejected — it read as a carnival prize wheel and stole the YES/NO betting semantics. |
| "Add a win animation" | No. `acknowledge()` is deliberately outcome-blind. |
| "Add a streak counter / points" | No. Rule 2. Escalate. |
| "Make it addictive / add a reward loop" | No — and say why: it is the argument that gets the object removed in a license review. Push on feel and discovery instead. §3d. |
| "Make it bigger so people notice it" | No. It is FAB-scale on phones by measurement (§1g); at 0.19 of the narrow side its halo covered 32% of a 360px screen. |
| "Put it on the bet slip so people play with it while deciding" | Absolutely not. Rule 1. |
| "Make it bounce more / add gravity" | Gravity is wrong for a floating object. Bounce is tunable via `CONST.RESTITUTION`; the `glass` material preset already exists. |
| "Spin-on-impact feels weak / too strong" | `CONST.SPIN_COUPLING`. Note it multiplies by `this.radius`, so the effect scales with the responsive diameter — re-measure at 64px **and** 88px after any change, and update the figure in spec §3.4 and test 4 together. |
| "Show how many spins I've done" / "add a personal best display" | No. The engine tracks it; displaying it is Rule 7. The reward is proprioceptive, not numeric. |
| "Make it dodge the bet slip / avoid a panel" | Already supported — add `data-needle-keepout` to the element (or pass rects via the `obstacles` option). Spec §3.4c. |
| "Use a spring library" | No. A spring's rest time varies with displacement, so identical UI settles at different moments — on a market screen that reads as instability. Spec §3.5. |

---

## 10 · Where this is documented

**Before launch, read these two as well** — they are what stop this object being kept on
faith:

- `MEASUREMENT-PLAN.md` — what is instrumented, the four questions, and **kill criteria
  agreed in advance** (remove it if interaction < 3% of sessions). Wire `onInteraction`
  before launch, not after.
- `COMPLIANCE-MEMO.md` — draft responsible-play memo for compliance review. **Not
  approved.** Design cannot self-certify this; it needs their written sign-off.

Canonical reference: **`50pick-design-system-v1.1-2026-07-27/`**

- `09-needle/` — engine, haptics, playground, `NEEDLE-SPEC.md`
- `08-motion/` — "The Settle", the platform-wide motion language this object obeys
- `10-haptics/` — the haptic vocabulary standalone
- `07-provenance/SUPERSEDED.md` — every rejected direction and why

Store this brief at `docs/needle/CLAUDE-CODE-BRIEF.md` in the app repo, and keep it
next to the vendored engine so the rules travel with the code.

If you change the engine, update `NEEDLE-SPEC.md` in the same commit and add a line to
its §12 bug log. The spec is the artifact that outlives all of us.
