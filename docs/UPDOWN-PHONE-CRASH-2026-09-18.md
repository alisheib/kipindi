# The Up & Down board crash on ONE player's phone — 2026-09-18

**Status:** root cause found and fixed; ⚠️ NOT yet confirmed as *the* thing Dhiheksh Kaba saw.
**Authority:** this file. Everything below was measured, not assumed.

---

## 1 · What was reported

Ali, 2026-09-18, two messages:

1. *"in up and down market management, reporting that on Bitcoin up and down or some other
   up and down market, when they try to bet it shows page not found."*
2. *"this page has encountered a problem — only on Dhiheksh Kaba's phone. Other phones work."*

The second message changes the diagnosis. **"This page has encountered a problem" is the route
ERROR BOUNDARY, not the 404 page.** The two look alike to a player and are completely different
faults: a 404 is the server saying the round does not exist; the error boundary is the page's own
JavaScript throwing after it rendered.

## 2 · What was ruled OUT (measured, not reasoned)

| Claim | How it was tested | Result |
|---|---|---|
| The round URL 404s | Every round id on `/updown` and `/live`, curled on production | all **200** |
| A 404 is being served at all | Railway HTTP logs, `status=404`, 3 days, then narrowed to the exact window of player activity (04:20–05:14) | **no `/updown/*` 404 in any window** — only a credential scanner and `/robots.txt` |
| The bet tap lands somewhere dead | `scripts/live/updown-404-drive.mjs` — a real browser clicks every card, side button and anchor on `/updown`, `/updown?asset=BTC` and `/live`, signed out, on production | **17/17 clean** |
| Bets are failing | Railway HTTP logs, `path=/updown` | `POST /updown` (the bet server action) returning **200** throughout |
| The bet path can 404 for a signed-in player only | Read `getRoundDetail` — its only auth-dependent read is the viewer's own stake; a throw goes to `error.tsx`, not `notFound()` | a 404 **cannot** be auth-dependent there |
| A dead link in the bet/KYC/receipt path | Read every `redirect()` target, `signInHref`, `positionPermalink`, the receipt modal, the blocked modal | all resolve to real routes |

⛔ **So the reported words "page not found" do not match a real 404 anywhere.** What *was*
reproduced is a client-side crash — which is what Ali's second message actually describes.

## 3 · The defect that WAS reproduced

Driving a local board (`next dev`, in-memory store) and forcing two round rollovers,
`/updown` painted the error boundary — `h1="That page hit a snag"` — with:

```
Assertion failed: data must be asc ordered by time, index=1, time=1789720565, prev time=1789720565
```

That is **lightweight-charts**. It requires `setData()` to be sorted **and strictly
increasing**, and throws on a tie. The throw escapes the draw effect, so React unmounts the
whole route: the player is told the PAGE is broken, on a page whose chart is decoration.

### Why it ties

`terminal-chart.tsx` maps every server timestamp through

```ts
const at = (ms: number) => ((Math.round(ms / 1000) + tzShift) as UTCTimestamp);
```

The payload carries **milliseconds**; the renderer takes **seconds**. Two confirmed reads 400 ms
apart are distinct in the payload and identical on the axis. Two of the three call sites sorted
— and **sorting is not the contract**, because what is being sorted is not what is drawn. The
third (the volume histogram) did not even sort.

Reads land inside one second routinely: a round boundary, or the self-healer working through a
backlog (`unresolvedBefore` exists because production once held 1,398 of them).

### ⭐ Why it was ONE phone — the important part

`board-viz.tsx` renders **cubes** by default and mounts the terminal **only while the chart is
selected**. That choice is stored **per device** in `localStorage`:

- `kp-updown-viz` = `cubes` | `chart`  ← **the switch**
- `kp-updown-range` = `15M…7D`, `kp-updown-style` = `line` | `candles`

A player who once tapped **Chart** carries that value on that handset for ever. So the crashing
code path mounts on his phone and on no other. **An outage with a population of one** — invisible
to every other phone, to every test suite, and to every HTTP status code.

⚠️ **The first version of the matrix probe reported 28 cheerful passes having measured nothing**
— `canvases=0`, because it set the range and style but not `kp-updown-viz`, so the chart never
mounted. The probe now gates on the chart actually drawing. A silent "not applicable" reads
exactly like a pass.

## 4 · The fix

`src/components/charts/chart-series.ts` — new, one pure function, `ascUnique()`: sort by time,
collapse ties. Applied at **all four** `setData` sites:

- `terminal-chart.tsx:337` candles + gap whitespace
- `terminal-chart.tsx:360` volume histogram (had no sort at all)
- `terminal-chart.tsx:407` line/area runs + gap whitespace
- `market-curve.tsx:150` the long-form poll curve (had no sort at all)

**The tie rule is a correctness rule, not a tidy-up.** A gap marker is a whitespace item
(`{ time }`, no value) and the feed emits one per missing grid step so an outage keeps its axis
width. At the line/area site those markers land in the *same array* as real readings — so if
whitespace ever won a tie it would **draw a hole over a price the platform really read**. Data
beats whitespace; between two data items the last (newest) wins.

**Guard:** `npm run test:chart-series` (`scripts/chart-series.test.mts`), 20 assertions —
the contract, the gap-must-not-erase-a-price rule, and §3, which feeds it the real shape
(distinct milliseconds that collide once rounded) and asserts the raw payload *does* tie.
Wired into `predeploy` (after `test:bridge`); `test:all` auto-discovers it.

## 5 · RESUME AT — what is NOT yet proven

⛔ **The fix is not yet confirmed to be what Dhiheksh saw.** It is a real, reproduced crash on
the same surface with the same symptom, found on the only per-device code path there is. That is
not the same as proof. To close it:

1. **Ask him one question:** *on that phone, is the board showing the little **Chart** /
   **Cubes** toggle set to Chart?* If yes → almost certainly this. If he is on Cubes, the crash
   is elsewhere and §2's table is where to restart.
2. **Get the real error off his handset.** Any of: Chrome `chrome://inspect`, or have him read
   the text under the heading, or check whether a hard refresh + clearing site data fixes it
   (clearing site data wipes `kp-updown-viz` → back to cubes → symptom gone even if the chart is
   still broken — so that is a *diagnosis*, not a fix).
3. **A one-tap workaround exists right now, before any deploy:** on his phone, tap **Cubes** on
   the board. It rewrites `kp-updown-viz` and the terminal stops mounting.
4. **Re-drive after deploy:** `LOCAL_BASE=https://50pick.tz node scripts/live/updown-chart-crash-matrix.mjs`
   — 7 ranges × 2 styles × 2 board paths with `kp-updown-viz=chart` forced, gated on
   `canvases > 0`. On 2026-09-18 pre-fix this was **0 crashes / 26 of 28 drew**, i.e. production
   data did not happen to be colliding at that moment. The crash is **data-dependent and
   intermittent** — a green matrix does not clear the chart, which is exactly why the
   deterministic unit guard in §4 is the real gate.
5. **Still unexplained and worth a look:** `/live` cards print a countdown that disagrees with
   the round they open (a card labelled *"dakika 1 zimebaki"* opened a round whose page said
   **15 DAKIKA**). Measured on production 2026-09-18, signed out. Not this bug; not yet filed.
6. **A second, separate lead nobody has pulled:** production HTTP logs show
   `GET /_next/static/chunks/0um9izluviz.0.js 404` at 04:30 — stale chunk requests from an open
   tab (deploy skew, `test:deploy-skew`). There **is** a service worker (`public/sw.js`,
   registered in `src/lib/register-sw.ts`). A phone pinned to a stale cached shell is the other
   textbook way one handset breaks while every other works, and it would also explain the words
   *"page not found"* better than the chart crash does. **If §5.1 comes back "he's on Cubes",
   start here.**

## 6 · How to search for a bug like this one (the method, for next time)

1. **Get the exact words on the screen.** "Page not found" and "this page has encountered a
   problem" are different faults. Grep the copy: `src/app/not-found.tsx` vs
   `src/components/ui/route-error.tsx`. The whole first hour of this session went into a 404
   that was never happening.
2. **Ask the status code, then stop trusting it.** A client-side `notFound()` or a crash after
   hydration is served as **200**. Railway HTTP logs will show nothing. Only a browser sees it.
3. **"Only on one device" means per-device state.** Grep `localStorage` before anything else —
   it is the only thing that can differ between two phones on the same build. Then service
   worker / cached shell, then viewport, then locale cookie.
4. **Gate every probe on the thing having rendered.** Assert the `h1`, and assert the specific
   element you are judging actually exists (here: `canvases > 0`). A probe that measures nothing
   reports a pass.
5. **Prefer a deterministic unit guard over a live sweep** for anything data-dependent. The live
   matrix was green on production while the bug was real.

---

*Written 2026-09-18. Branch `main`. Commit: see `git log --oneline -- docs/UPDOWN-PHONE-CRASH-2026-09-18.md`.*
