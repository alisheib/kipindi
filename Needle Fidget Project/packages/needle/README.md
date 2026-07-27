# The Needle — standalone package

The persistent pause object. Drop-in, framework-free.

| File | Role |
|---|---|
| `needle-physics.js` | The engine. Zero dependencies. Source of truth for all dynamics. |
| `needle-haptics.js` | The haptic vocabulary. Rate-limited, mutable, reduced-motion aware. |
| `Needle Playground.html` | Bare harness — empty screen, just the object. **Open this to try it.** |
| `CLAUDE-CODE-BRIEF.md` | **Copy-paste brief for Claude Code** — what to build, the hard rules, acceptance tests. Start here to integrate. |
| `NEEDLE-SPEC.md` | Full specification: colour rationale, dynamics, all 17 states, haptics, bug log. |
| `theme/` | Tokens + the motion language it obeys. |

## Quick start

Open `Needle Playground.html` in a browser with the folder intact. The needle is
already parked on the right edge. Tap the sliver to pop it out, grab the gold hub to
carry it, whip the rim to spin it, throw it anywhere.

## Integrating

Mount once in the app shell, above everything, so it survives route changes:

```js
import { NeedleBody } from "./needle-physics.js";
import { haptic, hapticImpact } from "./needle-haptics.js";
// ~150-line reference host: see the <script type="module"> in Needle Playground.html
```

`z-index: 900` — deliberately below modals (1000). A dialog is a decision; the needle
must never sit on top of one. The wrapper is `pointer-events: none` with only the
object hittable, so no page needs to know it is there.

## The one hard rule

It is a pause object, not a game. No score, no streak, no reward, no leaderboard, and
never on a surface where money is in play. See NEEDLE-SPEC §1.
