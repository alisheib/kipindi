# Request #2 — Micro-animation / motion layer

## What we want
A **cohesive set of small interaction animations** that make the app feel alive and responsive, extending the motion vocabulary we already have (see the "What we already ship" list in the README and the keyframes in `kit/globals.reference.css`). We have great *big* moments (win confetti, settlement seal) but the *small* everyday interactions are mostly static.

## Constraints
- **Transform/opacity only** (60fps on mid-range Android). Never animate width/height/top/left/margin.
- Reuse existing easing/duration tokens (`--ease-micro/glide/arrive/conduct`, `--dur-flick/quick/glide`). Only add a new token if truly missing — and justify it.
- Every keyframe ships with a `prefers-reduced-motion: reduce` branch (snap to end state, no motion).
- Subtle. These should be *felt*, not *watched*.

## The interactions to design (fill the gaps)
Please spec each as a keyframe + utility class (or a small component), with duration/easing token and a reduced-motion branch:

1. **Button / chip press** — a crisp tactile press-down (we have `--ease-micro` transitions on `.btn`; add the satisfying "press" pop). Pairs with the `tap` haptic.
2. **Card / list-item entrance stagger** — when a list of markets / positions / proposals / leaderboard rows renders, stagger them in with `reveal-up`-style motion (cap the stagger so long lists don't feel slow).
3. **Tab / filter switch** — the active-pill underline/indicator sliding between tabs (we have a gold underline in the top nav — make it *slide*, not cut).
4. **Optimistic vote** — the up/down vote control already updates optimistically; give the count a tiny `count-up-flash`-style tick and the arrow a press pop.
5. **Toggle** — the kit Toggle (`role="switch"`) thumb travel + a soft glow when turning ON (gold).
6. **Value-changed** — generalize the wallet pill's number-roll + delta-flash (`wbp-delta-fade`) into a reusable treatment for any TZS figure that changes (balance, pool size, payout estimate).
7. **Success checkmark draw** — an SVG stroke-draw check for "saved / submitted / verified" confirmations (KYC, limits saved, proposal submitted), in gilt. Pairs with `confirm`/`success` haptic.
8. **Page / route transition** — a light shared entrance (content `reveal-up` on navigate) so pages don't hard-cut. Must not delay perceived load.
9. **Skeleton → content cross-fade** — when a skeleton (`skel`) is replaced by real content, cross-fade rather than pop.
10. **Pull-to-refresh affordance** (mobile) — *if* you think it fits; optional.

## Deliverable
- Spec doc with the list above, each mapped to: keyframe name, tokens used, trigger, and the paired haptic (from request #1).
- The new `@keyframes` + utility classes as **additions to `globals.css`**, each with a reduced-motion branch.
- Component-level notes where a behavior needs JS (e.g. stagger index, sliding tab indicator) — props/approach, we'll implement.
