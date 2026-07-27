# 50pick motion language — "The Settle"

Motion derived from the mark: a needle on a pivot, poised between two outcomes.
Everything swings in from a real anchor, decelerates hard, overshoots by a hair, and
settles — the way a balance finds true.

## The three laws
1. **Anchored** — motion begins at the thing that caused it. `transform-origin` is
   always the causal element. No unanchored slides.
2. **Settled** — arrivals decelerate hard and stop with one hair of overshoot (<1.5%
   scale, <2px travel). One correction, never a second.
3. **Weighted** — speed encodes consequence. Anything touching player funds takes the
   next duration tier up.

## Four curves. No fifth.
| Token | Curve | For |
|---|---|---|
| `--m-settle` | `cubic-bezier(0.16, 0.9, 0.24, 1.004)` | every arrival — the signature |
| `--m-glide` | `cubic-bezier(0.32, 0.72, 0, 1)` | neutral travel, no overshoot |
| `--m-leave` | `cubic-bezier(0.55, 0, 0.85, 0.3)` | exits — accelerate away |
| `--m-pivot` | `cubic-bezier(0.34, 1.4, 0.44, 1)` | the needle and dials ONLY |

Springs are deliberately absent: a spring's rest time depends on displacement, so
identical UI settles at different moments. On a market screen that reads as
instability. Our overshoot is baked into the curve — fixed, tiny, repeatable.

## Six duration tiers
90 · 140 · 220 · 340 · 520 · 620 ms (ceiling). Distance sets the tier; money moves it
one step up. Nothing in the product exceeds 620ms — if it needs longer, it is a page,
not a transition.

## The signature: −14°
Every sweep, reveal and seal travels on the same tilt as the divider in the mark.
Skeletons sweep on it, panels reveal along it, settled results seal across it. One
angle used everywhere becomes unmistakable, and it costs nothing.

## Usage
Load `motion.css` after `globals.css`. It adds tokens, utilities and keyframes and
overrides nothing — the legacy `--ease-*`/`--dur-*` tokens stay valid so existing
components keep working while they migrate.

Full interaction inventory with live demos: `Motion Language.dc.html` in the project.
