# A21 first-frame timing: exact source and early input

2026-10-15. This is a local production-build diagnostic, not a production wager or a revision of S8-PLAN §A21's 150 ms acceptance rule. The browser was Chrome for Testing 147 at 360×640 and 4× CPU. The in-memory S8 fixture supplied a signed player and a guest. No money action was submitted. Each build was bound to its exact Git SHA by `RAILWAY_GIT_COMMIT_SHA`, and `qa:bet-sheet-production` rejected stale served metadata.

## Source and strict gate

| Source | Change from `20c49f568` | Strict production driver | Additional 16-page ordinary tap trace |
| --- | --- | --- | --- |
| `20c49f568` | Baseline | 88/90; signed `/live` 150.5 ms and guest `/live` 178.7 ms failed | Four cold first taps without a completed warmup took 220.6–249.6 ms. |
| `c35dc9f0c` | Bound signed and guest `requestIdleCallback` warmup at 50 ms instead of 1,000 ms | 89/90; guest `/` sample 2 took 158.0 ms | A guest `/` tap still took 222.3 ms despite prior warmup; pointer delay was 101.9 ms. |
| `a0ecb475c` | `c35` plus removal of Modal's per-open responsive `<style>` elements; same rules in `motion.css` | **90/90, 0 unmeasured**; all 12 heading frames below 150 ms | 16/16 heading frames at or below 142.6 ms; measured pointer delay 22.6–43 ms. |
| `048449961` | Only the Modal stylesheet change, with the original 1,000 ms warmup deadline | 90/90 in the strict sample | **7/16 above 150 ms**, maximum 220.1 ms. Four guest taps arrived before warmup began. This variant is not a robust replacement for `a0ec`. |

At `a0ecb475c`, the strict frame samples in milliseconds were: signed `/` 90.0, 141.2, 78.0; signed `/live` 83.1, 91.5, 99.7; guest `/` 88.7, 81.1, 139.0; guest `/live` 92.4, 139.6, 127.7. The original negative controls, lazy first-load manifest checks, URL traversal, private-read ordering, and browser/console checks passed. Evidence: `C:\50pick-ssd\s8-a21-a0ecb475c\evidence.json` on the QA host. The CSS-only evidence is at `C:\50pick-ssd\s8-a21-048449961\evidence.json`.

The Modal rule relocation preserved computed entrance names at 360 and 1024 px for ordinary, tall, and anchored sheets. Exit remained `m-leave-out`. Browser reduced-motion duration remained 0.01 ms. The focused motion ladder, reduced-motion, entrance/focus, popup, stacking, and bet-sheet-host checks passed on `a0ec` (12/0, M6 all, entrance all, 12/0, 144/0, 50/0 respectively). The exact production build and TypeScript passed.

## Physical tap while warmup is executing

The ordinary A21 driver taps once the card is hydrated. A separate read-only diagnostic sent CDP mouse press/release events at 0, 10, 20, 30, 60, 80, 100 and 150 ms from the beginning of the actual `warmSheet` task. This makes an otherwise rare collision repeatable. It recorded both event timestamp and browser handler time, so input delay is included in physical tap-to-heading time. The page-only instrumentation held the idle callback until the pick was in view, then let the real callback execute; it did not change application source or the 150 ms strict gate.

At exact served `a0ecb475c`, the synchronous hidden rehearsal occupied 125–216 ms at 4× CPU. **13 of 16 forced-overlap taps exceeded 150 ms** (signed 5/8, guest 8/8); maximum physical tap-to-heading was 341.2 ms and maximum input delay was 213.4 ms. These are real queued-input costs, not a slow heading caused by a private read. The `50 ms` deadline therefore improves the defined armed-tap sample while retaining an early-interaction edge that the strict sample does not exercise.

A local-only, unreleased concurrent-root prototype `45f3485d3` replaced the browser's `flushSync` warmup with `root.render` into the same hidden, inert, layout-contained host, followed by frame-time layout and cleanup. Its strict driver passed 90/90, but the forced-overlap diagnostic worsened to 15/16 above 150 ms, with a 389.7 ms maximum physical tap and 195.2 ms maximum input delay. React still produced 108–202 ms render tasks that competed with the real opening click. **Do not cherry-pick `45f3485d3`.**

## Tap from initial document load

A further exact-`a0ec` probe tapped the first home pick after DOMContentLoaded, aiming at 0, 250, 500, 1,000 and 2,000 ms for each viewer. Scroll/geometry setup meant the earliest actual injection was about 0.6–1.2 seconds after DOMContentLoaded. Nine of ten taps followed the card's `href` to `/markets/{id}?side=YES&from=home` before the lazy host was wired. S8-PLAN §WP7 explicitly requires this pre-hydration fallback; the destination opens the preset sheet. The one guest tap that arrived after hydration but inside warmup took 306.6 ms from physical tap to heading, with 181.9 ms input delay. The probe observed only the first 550 ms after each tap and does not claim the destination's final state.

## Release interpretation

`a0ecb475c` is the best measured candidate for S8's defined strict gate and normal armed taps. It is **not proof that every physically possible early tap reaches a heading within 150 ms**. A complete fix for that stronger condition needs the heavy first-use React/font/layout work split into interruptible tasks or a separately reviewed staged sheet that preserves visible content, focus, and money-control readiness. Merely starting the same 125–216 ms task sooner shifts input delay. Any merged release SHA needs its own exact-tip build and strict A21 gate on a quiet machine; the results above do not transfer to a different compiled SHA.
