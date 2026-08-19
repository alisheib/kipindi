# SESSION PROMPT — THE VISUAL SWEEP: every pixel, every control, every width, every language

Repo: `C:\kipindi-main`, branch `main`. ⚠️ **Every push to `main` deploys LIVE to `https://50pick.tz`.**

Commissioned by Ali, 2026-08-15: *"full sweep on the whole platform. Nothing technical, only
visual — every visual bug, responsiveness, design consistency, colours, against our design kit.
Nothing from outside it. What is made in 2 ways for the same purpose. Everything should be 100%
functional, properly working, perfectly working, no flaws, no issues. Every nit, every scroller,
every button, every popup, everything — just visual. Act as the strictest visual engineer, even
in compliance."*

⛔ **THIS SESSION CHANGES HOW THINGS LOOK AND BEHAVE ON SCREEN — NOT WHAT THEY COMPUTE.**
No money logic, no settlement, no schema, no new features. If you find a behavioural or money
defect, **FILE it (§7) and keep going.**

---

## §0 · BEFORE YOU TOUCH ANYTHING

```bash
git fetch --all --prune && git log --since="today" --format="%ci %h %s" origin/main && git status --short
```

Then read, in this order:

1. ⭐ **`docs/DESIGN_AUTHORITY.md` — THE ONLY DESIGN RULEBOOK. Read it whole.** It is long and
   it is the job. Pay particular attention to **§0** (the filing law — where a design fact goes),
   **§B1–B10**, **§T** (type scale), **§S** (space, shape, the weight of a line), **§A** (the
   floors: contrast, tap, focus, language), **§C** (what the interface may SAY), **§F** (the
   feedback law — which surface answers an action, and at what severity), **§L** (the label law),
   **§E** (elevation + motion mechanics), **§K** (kit adoption and the Definition of Done), and
   **§M1–M8** (the material law).
2. **`src/app/globals.css`** and **`src/app/motion.css`** — ⭐ **THE VALUES LIVE HERE AND THEY
   OUTRANK EVERY DOCUMENT.** `motion.css` is imported LAST, so at equal specificity it wins.
   `tailwind.config.ts` is a **bridge only** — it never originates a value.
3. `.claude/skills/50pick-standards/SKILL.md` — **§1** (the bar + the 9-role gate), **§3** (UI &
   design discipline), **§4** (responsiveness & visual verification) and **§5b in full** (twelve
   ways an instrument here has lied).
4. `docs/perfection-plan.md` **§9.1** (the primitives that were unified, and why) and **§9.2**
   (the status-label drift) — this is the existing record of *"two ways to do one thing"*.
5. `docs/LIVE-QA-CAMPAIGN.md` **§6/§6b** — where findings and the handoff are filed. ⛔ There is
   no new tracker file. Ever.

### The four rules that make parallel sessions survivable

1. ⛔ **NEVER `git add -A` / `git add .`** — stage by explicit path, commit with
   `git commit -F msg -- <paths>`.
2. 🔴 **AND YOUR OWN DISCIPLINE DOES NOT PROTECT YOU — measured twice, most recently 2026-08-15.**
   The *other* session's `git add -A` swept an in-flight file that passed a new prop into its own
   commit, **without the file that defines that prop**, and `main` could not build. ⭐ So when a
   change spans two files where one **types** the other (a prop and its call site, a token and its
   consumer), **commit them in the SAME commit and do it promptly.** ⚠️ And `git status` showing
   your file CLEAN is not proof it is unchanged — it can mean the other session committed it for
   you. `git show HEAD:<path>` before concluding anything.
3. ⚠️ **`main` moves under you.** Re-read `git rev-list --left-right --count origin/main...HEAD`
   immediately before every commit.
4. ⚠️ **Shared ports and ONE database.** `netstat -ano | grep LISTENING | grep :300` first, take a
   free port, and kill **only your own PID**. Say what you will seed before you seed it.

---

## §1 · WHAT "A VISUAL DEFECT" MEANS HERE — the five failure modes

Judge every surface against all five. Ali named all five in his own words.

| # | Failure | Shape |
|---|---|---|
| **V1** | **Off-kit — a value from outside the system** | a hardcoded hex/px/shadow/radius where a token exists; a one-off `<div>` doing a kit primitive's job; a `dark:` variant or a light-theme selector (there is ONE theme); a lucide icon where the kit has a glyph |
| **V2** | **Two ways, one purpose** | two modals, two confirm dialogs, two empty states, two spinners, two chips, two date fields, two "no data yet" rails. ⭐ **This is Ali's explicit ask.** perfection-plan §9.1 is the record of the last round of this |
| **V3** | **Breaks at a width or in a language** | horizontal overflow, clipped-not-scrolled, a tap target < 40px, a control that leaves the viewport, SW/ZH truncating a label the English fits |
| **V4** | **Says the wrong thing visually** | **gold on money that was not EARNED** (§M3 — the single strictest rule here); YES=green/NO=rose inverted or reused for non-money; claret outside editorial; aqua > 8%; a fixable refusal wearing the alarm register (§F3) |
| **V5** | **A control that does not behave** | a popup that will not close (✕ / click-outside / Esc), a scroller with no affordance or that does not scroll, focus lost on open/close, no visible focus ring, a disabled control with no stated reason, a dead button, a hover state that sticks on touch |

⭐ **"EVERY NIT" IS THE COMMISSION.** A 1px misalignment, a chip whose baseline sits off its
neighbour's, an inconsistent gap in one card of twelve — those are the deliverable, not noise.

---

## §2 · WHAT IS ALREADY GUARDED — ⛔ DO NOT REBUILD ANY OF THIS

⭐ **Verified in `package.json` on 2026-08-15.** Run these FIRST: they are your baseline, and a
failure here is a finding you did not have to look for.

`test:design-frozen` · `test:design-one-door` · `test:tokens` (+`red:tokens`) · `test:measure` ·
`test:contrast` (+`red:contrast`) · `qa:contrast-rendered` (+`red:contrast-rendered`) ·
`test:ui-consistency` · `test:chip-contract` · `test:crest-legibility` · `test:m1-light`
(+`red:m1-light`) · `test:gold-is-money` · `test:motion-ladder` · `test:glyph-motion` ·
`test:reduce-motion` (+`red:reduce-motion`) · `test:keyframes` (+`red:keyframes`) ·
`test:admin-clip` · `test:responsive` · `test:motion` · `qa:button-contrast`

⚠️ **`test:responsive` and `test:motion` need a live server and FAIL locally without one. That is
not a regression** — boot a server first or exclude them knowingly.

### ⛔ AND THERE ARE ALREADY ~65 SCREENSHOT DRIVERS IN `scripts/`

`visual-matrix.mjs` · `multi-viewport-audit.mjs` (99 routes × 4 viewports) ·
`responsive-audit.mjs` · `responsive-overflow-test.mjs` · `overlay-responsiveness-test.mjs` ·
`ui-regression.mjs` · `ui-material-audit.mjs` · `a11y-audit.mjs` · `axe-audit.mjs` ·
`dead-button-audit.mjs` · `mobile-audit.mjs` · `final-visual-sweep.mjs` · `screenshot.mjs` …

⛔ **DO NOT WRITE A 66TH.** Read `scripts/orphan-allowlist.json` and `package.json` first. If an
existing driver is *close*, extend it. If you must add one, it replaces something — say which, and
delete that. ⭐ Sixty-five one-off drivers IS ITSELF A V2 FINDING: report the duplication you find
among the tools, not only in the product.

---

## §3 · THE METHOD — the denominator first, always

⭐ **"EVERY VISUAL BUG" NEEDS A DENOMINATOR. Do not start from what you notice.**

**Step 1 — the surface inventory.** Enumerate from the **filesystem**, never by memory:
`src/app/**/page.tsx` (~99 routes) plus every modal, sheet, drawer, toast, popover, dropdown,
tooltip, empty state and skeleton in `src/components/**`. Write the count down. A sweep that
cannot state its denominator has not swept.

**Step 2 — the state matrix.** Every surface × **empty · loading · error · populated · edge**
(longest real string, biggest real number, SW **and** ZH). ⛔ A screen is not done because its
populated state is clean — the empty and error states are where this platform's kit drift lives.

**Step 3 — the render matrix.** **360 / 768 / 1280 / 1920 × EN / SW / ZH.**
⛔ 360 is not optional and is not "mobile-ish" — it is the floor and it is where the product's
real users are.

**Step 4 — LOOK.** ⭐ **A GREEN SUITE IS A PRE-FLIGHT CHECK, NOT EVIDENCE.** Open the images.
The "clipped-not-scrolled" class passes every automated overflow check and only shows in the
picture. This was proven again on 2026-08-15: `test:labels` was ALL PASS while production still
carried four defects, and every one of them was found by *reading the live page*.

**Step 5 — one definition site.** When you find V2, ⛔ **DELETE one, never sync both** (§0a).
Extend the kit and use it everywhere; do not add a third.

### ⛔ Step 0, actually — A SURFACE IS NOT ONLY A COMPONENT

🔴 **The labelling sweep the day before this one shipped with its commissioned bug still live,
because it swept `src/components/**` and `src/app/**` and called that "every surface".** It was
not. The bug survived in a string **built on the server and stored in the database** —
`Transaction.description`, rendered verbatim by the wallet hours later. Three separate guards
were green over it. Full record: `FAILURE-INVENTORY.md` **§7.3**.

Your inventory must therefore also include, for every screen:
- **strings composed server-side and persisted** (`description`, audit payloads, notification
  and email bodies) — a JSX scan cannot see these, because no JSX exists when they are written;
- **text baked into images** — OG/social cards under `src/app/api/og/**` render real type;
- **`aria-label`s, `title`s and `alt`s** — four of the labelling sweep's findings were aria-only,
  so a screen-reader user *heard* the defect while every screenshot looked perfect.

⭐ **AND CHECK WHETHER A FIX CAN EVEN REACH ITS SURFACE.** `perEventNotificationsSuppressed()`
marks where *communication* stops — it is **not** a map of where a player reads words. The money
record is written for every round regardless, which is exactly why fixing the notification could
not fix the wallet.

---

## §4 · ATOMIC UNITS — one family, one commit

⛔ Do not batch two families. Each unit is independently shippable, verifiable and revertable.

| # | Unit | Done when |
|---|---|---|
| **A** | **The inventory + the baseline** — surfaces, states, and the existing guards run | the denominator is written into `LIVE-QA-CAMPAIGN.md` §6; no code changed |
| **B** | **V1 · off-kit values** — hardcoded colour/space/radius/shadow, non-kit icons | every value resolves to a token; `test:tokens` + `test:design-frozen` green |
| **C** | **V2 · two ways, one purpose** — the duplicate primitives | one survives, the other is DELETED; grep proves no third |
| **D** | **V3 · the width × language matrix** — overflow, clipping, tap targets, truncation | 360/768/1280/1920 × EN/SW/ZH clean, **shots read** |
| **E** | **V4 · the semantic palette** — gold discipline, YES/NO, claret, aqua, severity | `test:gold-is-money` + `test:chip-contract` + `test:contrast` green |
| **F** | **V5 · controls that misbehave** — popups, scrollers, focus, dead buttons | every control opens, closes, traps focus correctly, and shows a focus ring |
| **G** | **The guard + its RED proof** | §5 |

---

## §5 · THE GUARD — and what it must NOT be

Whatever you fix, **leave a guard that fails when it comes back**, wired into `test:all`, with a
RED harness at the **HEAD** of `red:all` (⛔ that chain is `&&` — a guard at the tail starves
everything after it, and one is failing there right now: see §7).

1. ⛔ **ASSERT THE VALUE, NOT THE SYMBOL** (standards §5b). Count calls in **statement position**
   and assert `mentions === statements`, or a `void 0 &&` short-circuit passes.
2. ⭐ **CARRY A POSITIVE CONTROL IN THE SAME RUN.** A scanner that has gone blind prints
   "0 violations" in exactly the same words as a clean tree. Show it input it MUST reject **and**
   input it MUST accept. This is not ceremony — on 2026-08-15 a first-draft scanner located its
   target with a pattern that did not match, scanned ZERO lines, and read as a pass.
3. ⭐ **PROVE IT RED FIRST**, one mutation per defect it names, each reverted byte-for-byte.
   ⛔ **Expect the RED run to find your guard is wrong.** On 2026-08-15 the first RED run came
   back 7/8 and the miss was *the exact defect the session had been commissioned to fix.*
4. ⛔ **Use `scripts/red-anchor.mjs`** — the shared anchor resolver. The last harness that
   hand-rolled matching had **all five** of its multi-line anchors silently missing on a CRLF
   checkout.
5. 🔴 **A GUARD THAT MEASURES A PRESENCE CANNOT SEE AN ABSENCE — the most expensive lesson
   available to you, paid for on 2026-08-15.** Three guards were ALL PASS over one live defect,
   and **each was correct about what it measured**: one counted `=== "YES" ? t.` ternaries, and
   there was no ternary; one recognised translated copy by its `title*`/`body*` keys, and the
   offending string was neither; one read JSX, and the string was built on the server. The
   defect was a surface that **never made a decision at all**. ⭐ So for every rule you write,
   ask: *what does the code look like when this decision was never taken?* — and check for
   **that** shape, not only for the wrong answer.
6. ⛔ **A GUARD THAT FAILS ON CORRECT CODE IS WORSE THAN NO GUARD**, because the next session
   weakens it. One draft flagged a call site that already resolved correctly; it was narrowed to
   the shape that contains no decision. **Run every new check against the whole tree and read
   each hit before you believe the count.**

---

## §6 · TRAPS THAT HAVE COST REAL TIME HERE

- ⛔ **LANGUAGE COMES FROM THE `kp-locale` COOKIE. There is no `/api/locale`.** Set it on the
  Playwright **context** so it is on the first request, then read `<html lang>` back and **REFUSE
  to capture on a mismatch** — a sweep that silently shoots the wrong language is worse than one
  that fails, because its output looks like evidence. ✅ Verified working 2026-08-15.
- ⛔ **A TRILINGUAL PRODUCT NEEDS TRILINGUAL SELECTORS, AND CASE MATTERS.** A harness filtering
  buttons on `/UP|JUU|涨/` matched only Chinese, because EN renders "Up" and SW "Juu". **Prefer a
  class or `data-` attribute (`button.btn-yes`) over text.** ⚠️ `退出登录` (sign OUT) contains
  `登录` (sign in) — a ZH predicate needs the lookbehind.
- ⛔ **NEVER REGEX A CSS COLOUR.** The tokens are `oklch()`, and Chrome returns
  `oklch(0.98 0.01 270)` from `getComputedStyle` — the usual `[\d.]+` scrape reads **lightness,
  chroma and hue as R, G and B** and once scored a bright button at 1.24:1. Paint the value into a
  1×1 canvas and read the pixel back. ⚠️ A kit button painted by a **gradient** has a transparent
  `backgroundColor`, so "has no background" is false about it.
- ⛔ **AN ELLIPSIS IS NOT A DEFECT** — skip `text-overflow: ellipsis` elements, but **REPORT how
  much is hidden**: *"51% of the trust line is behind the ellipsis in Swahili"* is a human's call.
- ⛔ **A PER-ELEMENT EDGE CHECK CANNOT SEE A CLIP.** A child clipped by an intermediate row never
  reaches the CARD's edge. Measure every container against **its own `scrollWidth`**.
- ⛔ **A CLOSED CONTROL PHOTOGRAPHS PERFECTLY.** Use `checkVisibility()`, never a rect.
- ⛔ **SCREENSHOT AGAINST `next build && next start`, NOT THE DEV SERVER** — dev can serve stale
  CSS and invent overflow. Run `ui-regression` on a **fresh, unseeded** server (a seeded store
  fires `navigator.vibrate` → false console-error failures).
- ⚠️ **A BUILD FAILURE MAY BE A CLOBBERED CACHE, NOT YOUR CODE.** On 2026-08-15 `next build` failed
  with 28 `next/font/google` module-not-found errors caused by a concurrent build sharing `.next`.
  `rm -rf .next` and rebuild **before** believing a build error you did not cause.
- ⛔ **SHELL HEREDOCS AND `node -e` EAT A BACKSLASH LAYER.** A driver shipped `/([d,]+)s*$/` and
  reported *"the button names no stake"* over a label reading `TZS 500`. **Write files with the
  editor.** ⛔ Never shell-edit `src/lib/i18n-dict.ts`.
- ⚠️ **JSX comments have positions.** `{/* … */}` between attributes, or inside a `cond && ( … )`
  before the element, is a **syntax error**. Put it above the expression, or use a bare `//`
  comment in the attribute list.
- ⚠️ **Longer words break layouts.** Swahili runs long; German-length Swahili in a chip is a
  visual consequence — read frames at 360 for every label whose length you change.
- ⚠️ **`.env.qa.local` on this machine is STALE.** A sign-in that lands back on the signed-out
  shell is that staleness, not a product defect.

---

## §7 · KNOWN-OPEN, INHERITED — read before you "discover" them

- ⚠️ **`red:updown-readiness` has FIVE stale anchors** (reports 11/16, *"the harness is broken,
  not the guard"*) and **makes `red:all` exit 1 today**. Because that chain is `&&`, everything
  after it is starved. Fixing it is a legitimate unit of this sweep.
- ⚠️ **`trust-band.tsx:127` has no null arm** — an *unrecorded* outcome renders **"NO" in red** on
  the landing page. Latent, not observed. `FAILURE-INVENTORY.md` §7.2c.
- ⚠️ **The §L label ratchet stands at 15** private word-maps outside `src/lib/side-label.ts`, each
  with a recorded reason. It may only go **down**. `test:labels` enforces it.

---

## §8 · DEFINITION OF DONE

- **The inventory exists** — surfaces × states × widths × locales, with its count stated, filed in
  `docs/LIVE-QA-CAMPAIGN.md` §6. ⛔ No new tracker file.
- Every unit A–G shipped as its **own commit**, docs in the SAME commit. Laws → `DESIGN_AUTHORITY`
  in its lettered section. Values → `globals.css` / `motion.css` **at their line, with the rule as
  a comment beside them**. ⛔ Never restate a value in a doc.
- **One definition site per primitive.** Grep proves no second copy.
- **Zero horizontal overflow. Zero tap targets < 40px. Zero contrast below 4.5:1.** Zero clipped
  controls at 360 in any language.
- **Every control operable by keyboard, with a visible focus ring**, and every popup closable by
  ✕, click-outside and Esc.
- The new suite green, its RED harness catching **100%** of its mutations.
- `npx tsc --noEmit` · `npm run build` · `npm run test:all` · **`npm run red:all` at the END**.
- ⭐ **Frames READ** at 360/768/1280/1920 × EN/SW/ZH for every surface you touched — opened and
  looked at, not merely captured. State how many you read.
- **Verified on production after the push**: HTTP 200, a clean `railway logs -s 50pick` boot, and
  a frame actually read on the live site. ⛔ HTTP 200 alone proves nothing — Railway serves the
  OLD deployment until the new build succeeds. Confirm a string that only the new build contains.
- Behavioural / money defects found along the way are **FILED, not fixed**.
- ⭐ **Then EMPTY this file** — a spent prompt that still reads as live sends the next session to
  redo finished work.
