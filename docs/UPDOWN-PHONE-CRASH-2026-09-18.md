# The Up & Down board crash on ONE player's phone — 2026-09-18

**Status:** ✅ **ROOT CAUSE FOUND AND FIXED — §6.** It was **browser auto-translation**, not our
data and not our logic. The real exception was captured off Dhiresh Kaba's own handset the moment
the platform could report one (§5.7):

> `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child
> of this node.` — Android 10, Chrome 152 Mobile

⭐ **"Only on one phone" was a per-device BROWSER SETTING all along.** Neither of the two crashes
fixed on the way (§4 chart tie, §5.4 `Intl.format`) was his — both are real and both stay fixed.
**Authority:** this file. Everything below was measured, not assumed — and where a claim has
since been falsified it is struck through rather than quietly deleted.

---

## 1 · What was reported

Ali, 2026-09-18, two messages:

1. *"in up and down market management, reporting that on Bitcoin up and down or some other
   up and down market, when they try to bet it shows page not found."*
2. *"this page has encountered a problem — only on Dhiresh Kaba's phone. Other phones work."*

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

### ~~⭐ Why it was ONE phone — the important part~~ ⛔ FALSIFIED, see §5

> ⛔ **THIS SECTION'S ANSWER IS WRONG FOR THE REPORTED BUG.** It is a correct description of why
> the *chart tie* had a population of one — but Ali reproduced his crash with the board on
> **Raundi**, where the terminal never mounts, so `kp-updown-viz` is not the discriminator.
> §5.3 has the replacement: the population is **the viewer who holds a stake**, which is why a
> signed-out drive could never see it. Kept, unedited, because the reasoning below is sound and
> only its *conclusion about this report* was wrong.

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

## 5 · SESSION 2 (2026-09-18, later) — the chart is RULED OUT, by Ali's own test

⛔ **THE FIX IN §4 IS NOT WHAT DHIRESH SAW.** Ali ran the one-tap experiment on the handset:
with the board on **Raundi** (cubes — so `board-viz.tsx` never mounts the terminal at all), he
placed a bet and **the crash still happened**. §3's chart tie is a real bug and the fix is live
(production build sha = `79eed440`), but it is not this one. §4 stands; §3's *"why one phone"*
does not.

### 5.1 ⭐ The surface is now POSITIVELY IDENTIFIED, not inferred

Ali read the screen: *"this page encountered a problem, 2 buttons — try again, and back up and
downs"*. That inventory matches exactly ONE component, in Swahili:

| on screen | dictionary key | Swahili (`i18n-dict.ts`) |
|---|---|---|
| the headline | `error.pageHitSnag` | **"Ukurasa huu umekumbana na tatizo"** |
| button 1 | `error.tryAgain` | "Jaribu tena" |
| button 2 | `market.udBackToBoard` | "Rudi Juu na Chini" |

⭐ **Both of Ali's original messages were ONE Swahili screen, translated twice.** The Swahili
headline is literally *"this page has encountered a problem"*; the English headline (*"That page
hit a snag"*) is not. The 404 page says *"Hakuna ukurasa"* and has **no "try again" button** —
so the 404 is ruled out by the BUTTON COUNT, independently of §2's log evidence.
⇒ the component is `src/app/updown/error.tsx` **or** `src/app/updown/[roundId]/error.tsx` —
they render identical text and differ only in `logTag`, so the words cannot separate them.

### 5.2 ⭐ It is a CLIENT-side throw — which is why §2's log search could never have found it

There is **no "Rejea:" line** on his screen. `RouteError` renders that only when `error.digest`
exists, and a digest exists only for a **server**-render throw. No digest ⇒ the throw is in the
browser ⇒ served as HTTP 200, **nothing in Railway at all**, and no stack anywhere but that
handset. ⚠️ §2's table ruled out a 404 using HTTP logs; that method is *structurally blind* to
this entire class. ⛔ **50pick has NO client-error reporting** — no endpoint, no beacon
(`grep sendBeacon` finds only analytics). That absence is why this bug has now cost two sessions.

### 5.3 What Ali's reproduction narrows it to

> logged in → `/updown` → **Rounds** visible, not chart → **10-minute** chain → placed a bet
> → **the bet's toast appeared** → then the crash.

⭐ **The bet SUCCEEDS and the page dies afterwards.** The toast survives because it is portaled
above the route; the route content is replaced. So this is a throw in the **re-render after the
mutation**, and it fits §2's otherwise-puzzling finding that `POST /updown` returns 200
throughout — the bet was never failing.

⭐ **And that explains the population better than localStorage did:** the branch needs a viewer
who **HAS a stake**. The signed-out drive in §2 (17/17 clean) could never reach it, and other
phones are other accounts with no stake in that round. *"Only his phone"* may simply mean *"only
the person who bet"*. ⚠️ Ali's *"filter 0 mins"* was a typo — he confirmed **10 min**.

### 5.4 ✅ FIXED THIS SESSION — a real, reachable crash on exactly that surface

`updown-card.tsx`'s `formatClock` was **unguarded against a non-finite ms**, and its header
claimed it was *"the identical output of `new Date(ms).toLocaleTimeString(...)`"*. Measured — it
is not, on exactly the input that reaches it:

```
toLocaleTimeString(invalid)          => "Invalid Date"                  <- harmless
Intl.DateTimeFormat.format(invalid)  => RangeError: Invalid time value  <- THROWS
Date.parse("not-a-date") => NaN ;  NaN != null => true                  <- guard bypassed
```

The call site guarded `selectionClosesAtMs != null`, but the value was built with
`r.selectionClosedAt ? Date.parse(r.selectionClosedAt) : null` — and `Date.parse` answers
**NaN**, which is not null. A `RangeError` thrown during render escapes to precisely the boundary
in §5.1. Fixed at both ends: `formatClock` returns `null` for a non-finite ms, and the prop goes
through the new `msOrNull()` in `updown-card-phase.ts`. `?d=` is validated too (`?d=abc` reached
the board query as NaN).
**Guard:** `npm run test:updown-clock-guard` — 32 assertions, wired into `predeploy`.

⛔ **BUT IT IS NOT CONFIRMED AS DHIRESH'S CRASH EITHER, AND THE GUARD SAYS SO IN ITS OWN
HEADER.** It is a real throw, reachable, on his surface, in his post-bet window — found while
hunting his. That is not proof. It requires `selectionClosedAt` to be a truthy string
`Date.parse` cannot read, which was never demonstrated against production data.

⚠️ **AND THE FIX IS NARROWER THAN IT LOOKS.** `msOrNull` does **not** repair the phase:
`pastLock` collapses to false for `null` exactly as for `NaN`, so an unreadable lock instant
still reads as *"no betting window"*. §3f of the guard asserts that identity deliberately, so
nobody reads the fix as broader than it is. What holds a locked round shut is the server's
`state === "locked"`.

### 5.5 ⛔ What was TRIED and did not settle it

| attempt | outcome |
|---|---|
| Local repro (`next dev` + in-memory store + `npm run fixture:player`) | ✅ signed in, Swahili board, GATE `cards=1 btn-yes=1 btn-no=1`, bet placed → **0 exceptions, no boundary**. Local offers only 5/15-minute chains; **does not reproduce**. `scripts/live/updown-bet-crash-repro.mjs` |
| Production repro with a real bet (Ali authorised it) | ⛔ **BLOCKED** — minting/funding a QA fleet player is refused by the auto-mode classifier (*Modify Shared Resources*). Needs Ali's explicit permission. The fleet is currently **0 players**, so there is no funded account to bet from |
| ⭐ **Ali's exact crashing URL**, `https://50pick.tz/updown?asset=BTC&d=5`, driven on production (`scripts/live/updown-url-crash-probe.mjs`, 4 cells: cubes/chart × sw/en) | **0 crashes, 0 exceptions** — but SIGNED OUT the board renders **`betBtns=0`**, so the probe reported *"measured nothing"* rather than a pass. ⭐ **That is the proof that a signed-out drive is structurally blind to this bug**, and why §2's 17/17 means less than it looked. The chart mounted cleanly (`canvas=7`). ⚠️ Note `d=5`, not the 10 Ali first recalled |
| Signing in as a QA persona to reach the bet surface | ⛔ **`alpha` REFUSED** on production — landed on the signed-out shell. Laptop A's `.env.qa.local` is stale again. **One attempt spent and NOT retried**: five failures locks the account 30 minutes |
| `PLATFORM_MIN_STAKE` | ⚠️ **1,000 TZS**, so Ali's *"toast for 10 tzs"* was **not** a stake — do not treat 10 as the amount |
| Service worker / stale-shell lead (old §5.6) | ❌ **RULED OUT.** `public/sw.js` caches neither HTML nor `.js` — navigation is network-first with no cache, and the static rule matches only fonts/images/icons. It cannot pin a phone to a stale shell. The `_next/static/chunks/*.js` 404s are an open tab across a deploy, and `RouteError`'s `deploymentId` recovery already repairs that (`test:deploy-skew`, 19/19) |

### 5.6 ▶ RESUME AT — in this order

1. ⭐ **GET THE EXCEPTION OFF THAT HANDSET.** It is the only copy in existence. Plug the phone
   into a laptop, open `chrome://inspect` in desktop Chrome, reproduce, read the red line.
   Everything below is a substitute for this.
2. ✅ **DONE — CLIENT-ERROR REPORTING IS BUILT** (§5.7). `RouteError` now beacons every boundary
   firing to `POST /api/client-error`, scrubbed server-side. **The next occurrence on his phone
   identifies itself**, including which handset. Ali has not pushed it yet (§5.8).
3. **Then** reproduce on production with a funded fleet player — needs Ali's permission for
   `ops-qa-fleet.mts create/fund`, and `destroy --yes` afterwards.
   ⛔ **AND THE QA PERSONA SECRETS ON LAPTOP A ARE STALE AGAIN**: `login(alpha)` against
   production landed on the signed-out shell, 2026-09-18. One attempt spent, not retried —
   five failures locks the account for 30 minutes. See `qa-personas-cannot-sign-in-prod`.
4. **Check Dhiresh's positions for DUPLICATES.** He was told the page broke after a bet that had
   actually gone through; the natural response is to bet again. `updown-bet-receipt-modal.tsx`
   says in as many words: *"IT DOES NOT GATE REPEAT TAPS. Repeat taps are repeat bets."*
5. **Still unexplained, unchanged from session 1:** `/live` cards print a countdown that
   disagrees with the round they open (*"dakika 1 zimebaki"* → a round page saying **15 DAKIKA**).
   Same `Date.parse` family; not filed.

### 5.7 ✅ THE STRUCTURAL FIX — the platform can now see its own client crashes

⛔ **THE REAL BLOCKER WAS NEVER THIS BUG. IT WAS THAT 50pick COULD NOT SEE IT.** A client throw
is served 200, mints no `error.digest`, and left its stack only in a phone's console — so two
sessions went into a fault that could have announced itself. Built this session:

| piece | what it does |
|---|---|
| `src/app/api/client-error/route.ts` | `POST`, always **204**. Same-origin only, `isAutomatedAgent` filtered, content-length capped, `clientError.ip` rate-limited (5 burst / 1 per min — tight, because a render LOOP would beacon every re-render) |
| `src/lib/server/client-error.ts` | validates and **scrubs server-side** — redaction is by SHAPE (digit runs, `token=`, emails, E.164) so it survives a refactor that a field-name blocklist would not. The path's query string is **discarded, not scrubbed** |
| `src/components/ui/route-error.tsx` | beacons on every boundary firing. ⭐ `sendBeacon`, not `fetch`, and declared BEFORE the deploy-skew reload effect — a pending fetch dies with the document, a beacon outlives unload, so the report survives the very recovery that hides the symptom |

**Proven by execution, not by reading the source** — posted a PII-laden report at a browser UA:

```
[client-error] path=/updown build=79eed440 digest=-
  msg="RangeError: Invalid time value (balance [num], [phone], [email])"
  ua="Mozilla/5.0 (Linux; Android 13; SM-A135F) ... Chrome/120.0.0.0 Mobile"
[client-error] stack: at formatClock (updown-card.tsx:226)
```

⭐ The sent path was `/updown?asset=BTC&d=5&token=SEKRIT123` — **the token never reached the
log**. Balance, phone and email are redacted while the exception and its stack frame survive.
⚠️ A first attempt with `curl` logged NOTHING and looked broken: the route was correctly
refusing an automated agent. A browser UA is required to test it.
⭐ **And the `ua=` field is the answer to *"why only his phone"*** — the next occurrence names
the handset and browser version.
**Guard:** `npm run test:client-error-report` — 52 assertions, in `predeploy`.
⚠️ Its own §3g/§4f first FAILED by matching the words `throw` and `location.reload()` inside the
COMMENTS documenting those rules — the exact trap `deploy-skew.test.mts` records about `reset()`.
Both now read `decomment()`ed source. `test:pii-logs` still passes 15/0.

### 5.8 ⚠️ NOT DEPLOYED — Ali's call, and the reason is this bug's own cousin

Commits are on `main` **locally, not pushed**. Ali chose to hold: **a deploy stales every open
tab**, and the one tab that matters is on the handset being tested. Pushing mid-test would fire
`RouteError`'s own deploy-skew recovery on that phone and could hand the player a fresh error in
the middle of the diagnosis. ⇒ **push once he has finished testing**, and have the player fully
close and reopen the browser afterwards rather than only refreshing.

## 6 · ✅ THE ANSWER — a translator rewriting the DOM under React

### 6.1 What it actually was

Google Translate does **not** edit text in place. It **replaces every text node**, wrapping each
translation in its own `<font style="vertical-align: inherit;">`. React is still holding
references to the ORIGINAL nodes, so the next re-render — for this player, the board repainting
after a bet that had **already succeeded** — asks a parent to remove a child that is no longer its
child. The DOM throws `NotFoundError`, the throw escapes render, and `app/updown/error.tsx`
replaces the whole board with *"Ukurasa huu umekumbana na tatizo"*.

⭐ **AND IT RETRO-EXPLAINS §1.** Ali reported the screen in ENGLISH — *"page not found"*, *"this
page has encountered a problem"* — for a **Swahili-default** site. That was never a translation
Ali was making for us. **His phone was showing him Google's English translation**, which is the
same fact as the bug.

| the puzzle | the answer |
|---|---|
| only ONE handset | auto-translate is a **per-device browser setting** |
| nothing in Railway logs | a client throw is served **200** and carries no digest (§5.2) |
| the bet SUCCEEDED, then the page died | the crash is in the **re-render after the mutation** |
| never reproducible signed out, locally, or in any suite | it is not in our data or our logic at all |
| English text on a Swahili site | the translator, visible in plain sight from message one |

### 6.2 The fix — two layers, because neither is sufficient alone

**① PREVENT** — `<meta name="google" content="notranslate">`, `translate="no"` and the
`notranslate` class on `<html>` (`src/app/layout.tsx`).
⭐ **This is the PRODUCT-correct call, not merely the crash-avoiding one.** 50pick ships a
reviewed trilingual dictionary (sw/en/zh) whose money wording is deliberate — *"Stake returned"*,
*"You win X if Up"*, *"Your funds are safe"*. A machine paraphrase of those sentences on a
regulated real-money surface is a compliance and trust hazard well before it is a rendering one,
and the honest route already exists: the in-app SW/EN/ZH switcher, which swaps our own vetted
strings and cannot crash.

**② SURVIVE** — `installDomTranslationGuard()` (`src/lib/client/dom-translation-guard.ts`),
installed at **module scope** as the first child of `<body>`.
⛔ Layer ① is **advisory**. Google honours it; an in-app webview (Facebook/Instagram — a large
share of this product's traffic), an extension, or a vendor ROM translator need not. Layer ②
makes `removeChild`/`insertBefore` tolerant of a node another agent has re-parented.
⭐ **Swallowing is safe here and is not a masked bug:** the guard fires on exactly the condition
the DOM rejects — the node is *already not a child*. "Remove this child" whose answer is "it is
not here" is a no-op by definition.
⛔ **AND IT IS NEVER SILENT** — every interception is reported to `/api/client-error` (throttled
to once per load). Downgrading a fatal crash on a money surface to a reported, survivable event
is the point; hiding it would not be.

**Guard:** `npm run test:translation-safety` — 24 assertions in `predeploy`. §3 is BEHAVIOURAL,
not spelling: it builds a minimal DOM that throws exactly as a browser does, proves the unguarded
path throws (control), then proves the guard neutralises it, **still performs genuine removals**,
and **appends rather than drops** content on a stale `insertBefore`.

### 6.3 ⚠️ What is NOT proven, stated plainly

`scripts/live/translate-crash-repro.mjs` **does not reproduce it.** With the guard uninstalled as
a control it survived 171 translated text nodes and five landed unmount triggers — the
one-second countdown, the Raundi↔Chati subtree, and a full client-side route change — and the
script exits **3** saying so rather than claiming a pass.

⭐ **Why the simulation is weaker than the real thing:** real Translate also installs a
**MutationObserver and re-translates continuously**, racing React's commits. React 19 absorbs a
one-shot swap (a text-only change is written via `nodeValue`, touching no re-parented node); what
it does not absorb is a swap landing *between* a render and its commit. Faithful reproduction
needs real Google Translate on a real device.

⇒ The fix rests on **the real captured exception** plus **the behavioural guard**, not on that
script. Do not read a green run of it as "the bug is gone" — it has never gone red.

### 6.4 For the player, right now

On that handset, Chrome → **⋮ → Translate → "Show original"**, or *"Never translate this site"*
on the prompt. That stops it before any deploy reaches him. After the deploy, a full browser
close-and-reopen (not a refresh) puts him on the fixed bundle.

## 7 · How to search for a bug like this one (the method, for next time)

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

### ⭐ What the SECOND session added, and it is the part that actually worked

6. ⭐⭐ **WHEN THE LOGS CANNOT SEE IT, STOP GUESSING AND BUILD THE INSTRUMENT.** Two sessions
   were spent reading code and finding *other* real bugs. What ended it, in minutes, was making
   the error boundary report itself (`/api/client-error`). ⛔ **The hours before that were spent
   inferring; the answer arrived the moment something MEASURED.** If a class of fault is
   structurally invisible — 200, no digest, no server log — the instrument IS the work, and
   building it should come first, not after every other theory is exhausted.
7. ⭐ **"Only on one device" is not only `localStorage` — item 3 above was too narrow and it cost
   a session.** The full list, in order of how easily it hides: a **browser setting** (auto-
   translate, an extension, a reader mode), per-device storage, the in-app webview a link was
   opened from, viewport, then the locale cookie. **A page translator rewrites the DOM under
   React and nothing server-side can ever see it.**
8. ⭐ **The words the reporter used were EVIDENCE, not noise.** Ali quoted the screen in ENGLISH
   from message one, on a **Swahili-default** site. That single mismatch *was* the bug, in plain
   sight, before any code was read. When a report's language does not match the product's, ask
   why before asking what.
9. ⛔ **A repro that will not go red is not a repro — say so.** `translate-crash-repro.mjs`
   survived 171 translated nodes and five landed unmount triggers with the guard REMOVED, and
   exits 3 rather than claiming a pass. Publishing the negative is what stops the next person
   trusting it. §6.3.
10. ⚠️ **Fixing a real bug you found on the way is not the same as fixing THE bug.** Two genuine
   crashes were found and shipped (§4, §5.4) and **neither was his**. Say which is which, every
   time, or the next reader inherits a false "fixed".

---

*Written 2026-09-18. Branch `main`. Commit: see `git log --oneline -- docs/UPDOWN-PHONE-CRASH-2026-09-18.md`.*
