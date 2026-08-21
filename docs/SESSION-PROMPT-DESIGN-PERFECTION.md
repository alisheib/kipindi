# Design-Perfection Campaign — implementation of the 2026-08-21 full-surface audit

> **Status: ACTIVE.** This file is the campaign's ONLY tracker. When every stage below reads
> DONE and live-verified, the top of this file is changed to **SPENT** and nothing else is
> created. Do not open a second tracker.

Audit artifact: <https://claude.ai/code/artifact/19c38906-d3b0-41aa-ba59-37c62b07d34c>
("The 50pick Design Audit"). Sixteen lenses; the top ten findings adversarially re-verified
in code.

**Baseline measured at campaign start (2026-08-21, HEAD `937e4d19`, machine `OMEGA-COMPILE01`,
repo `F:\kipindi-main`, branch `main`):**

- `npx tsc --noEmit` — clean.
- `npm run test:all` — **230/232 green in 464s.** The only two red are `test:responsive` and
  `test:motion`, which need a live server on `:3000` and fail without one. That is the
  documented expected state (`scripts/test-all.mjs` header; `50pick-standards` §5), not a
  regression. Every stage below is measured against this line.
- ⚠️ CLAUDE.md's session protocol says "**117** `test:*` scripts". The real count is **232
  suites**. Filed for the Stage 8 doc-truth commit.

---

## ▶ STATUS BOARD

| Stage | Title | Status | Commit | Live-verified |
|---|---|---|---|---|
| 0 | Bootstrap + baseline + this tracker | **DONE** | `stage-0` | n/a (docs only) |
| 1 | Safety (no visual change) | **DONE** | `99999f99` | ✓ 200 · clean boot · shots read |
| 2 | The alpha critical (D7) | **DONE** | `85bfb075` | ✓ 200 · clean boot · shots read |
| 3 | Sizing (operator's top priority) | **DONE** | `2122067d` | ✓ 200 · clean boot · shots read |
| 4 | Correctness: time, words, money formatting | **DONE** | `6882091f` | ✓ 200 · clean boot · shots read |
| 5 | Focus & accessibility | **DONE** | `dd1dc8ec` | ✓ 200 · clean boot · shots read |
| 6 | Motion | **DONE** | `b14c749f` + `453f515b` | ✓ 200 · clean boot · shots read |
| 7 | Performance | **DONE** (one item deferred with a written plan — see below) | `640d45d1` | ✓ 200 · clean boot |
| 8 | Dead code & doc truth | **DONE** | `stage-8` | pending push |
| 9 | Consolidations | NOT STARTED | | |
| 10 | New guards | NOT STARTED | | |
| 11 | Owner-decision items + exit | NOT STARTED | | |

### Decisions applied by default (Ali may veto — each is a one-line revert of the named commit)

**D7 — the alpha Critical. DEFAULT NOT APPLIED AS WRITTEN; a per-group ruling was taken
instead, on evidence D7 did not have.** D7's default was "Option A — sweep, don't enable",
because enabling `<alpha-value>` "would restyle ~140 files sight-unseen". Measuring the 577
usages split them in two, and one half makes Option A *destructive*:

- **Group A — 83 usages / 19 classes, on tokens ALREADY pre-mixed with `transparent`**
  (`--warning-bg` is `color-mix(… 18%, transparent)`). Here D7's sweep is exactly right:
  `bg-warning-bg/30` would render 18% × 30% = **5.4%**, which nobody meant. The modifier was
  dropped. ✅ Option A applied.
- **Group B — 494 usages / 125 classes, on OPAQUE tokens.** Here "sweep to bare tokens" paints
  a **solid crimson panel** where `bg-no-500/10` asked for a faint tint. The only
  non-destructive alternative to fixing the bridge is minting ~125 new named tokens, which is
  a worse breach of §0a "one fact, one home" than the disease. The bridge was fixed. ⚠️ Option
  B applied.

**What Ali sees change:** tints and tone-borders that were written but have NEVER rendered now
appear at their designed strength — `<Callout>`'s four tones, the standing unconfirmed-email
`<NoticeBar>`, `PayoutStatusNotice`, the KYC rejection panel, the deposit/withdraw money
alerts, the RG panels, the auth banners, and 22 admin tone cards. Verified by screenshot at
360 and 1280: the result is subtle, not garish. **To veto: revert the `stage-2` commit.**

### Deliberately deferred

_None yet._

### Findings the campaign produced that the audit did not have

Recorded as they are measured, because each one is a claim a later session would otherwise
have to re-derive.

**Stage 1**

- ⭐ **The audit's "17+ admin controls" with the `useMayAct` hooks-order violation is exactly
  18** — and six other consumers (8 component instances) already use the CORRECT shape
  (`disabled={!mayAct}`, no early return): `config-form.tsx` ×3, `control-plane.tsx`,
  `kill-switch-toggle.tsx`, `payout-status-control.tsx`, `dsar-controls.tsx` ×2,
  `settle-button.tsx`. ⛔ Those must not be "fixed".
- 🔴 **The failure is reachable, not theoretical.** `mayAct` is not a mount-time constant:
  `admin/layout.tsx` resolves it through `canAct()` from LIVE DB grant overrides, and every
  one of the 18 controls calls `router.refresh()` after a successful action — which re-runs
  the layout RSC and streams a new `mayAct` into a control that is still mounted. Revoking an
  officer's ACT grant mid-session crashed the page instead of downgrading it.
- 🔴 **There is no ESLint in this repo at all** — `"lint"` is `tsc --noEmit`, there is no
  eslint config and no eslint dependency, so `react-hooks/rules-of-hooks` has never run. That
  is why an 18-file copied violation survived.
- ⚠️ **`markets/[id]` → Up & Down needed a MAP, not just a validation.** `/updown/[roundId]`
  locks a side only on `UP`/`DOWN`, so an untranslated `?side=YES` was silently discarded at
  the destination: a player who tapped YES on an Up & Down card landed on the unlocked
  both-ways dial that CLAUDE.md's betting-flow invariant forbids. Routed through
  `sideToOutcome`, the single mapping.
- ⚠️ **The repo's line endings are MIXED, not CRLF.** A sample of 300 `src/**/*.tsx` splits
  ~76 pure-LF / ~224 CRLF. Do not tell a session "the repo is CRLF" — it will write the wrong
  anchors.
- ⚠️ **Two guards pin `toast.tsx` byte-for-byte** (`test:feedback-law` §10.6 and
  `red-feedback-law.cjs` mutation #2), and one pins `notify-poller.tsx`'s
  `const tick = async () => {` as a >400-char slice (`market-result-announce.test.mts`, a hard
  `process.exit(1)` refusal gate). Any future edit to either file must carry its companion
  guard edit in the SAME commit.
- 🔴 **A red proof can pass under its own mutation.** The spec'd assertion for the new toast
  guard used a literal regex that the accompanying mutation never matched — it would have
  proven only the re-pin, not the guard. Widened before shipping. This is the
  `50pick-standards` §5b class, found again.

**Stage 2**

- 🔴 **`.glass-panel` was swallowing the tone on 22 admin cards, and no bridge fix could have
  helped.** It set `background` and `border` as SHORTHANDS at (0,1,0) — equal specificity to a
  utility, but later in source order than `@tailwind utilities`, so it won. `AdminCard`
  composes it and appends the caller's `className`, so every
  `<AdminCard className="border-warning-border bg-warning-bg">` in the console painted plain:
  an officer's warning card looked exactly like an ordinary one. Found only because the sweep
  agent checked whether its own edit would actually be visible. The colour declarations now sit
  in `:where()` (zero specificity); the cast and radius stay at full specificity, because those
  are the rung (§M2) and not a default to override.
- ⭐ **The bridge is fixed by making it carry alpha, not by minting tokens.** Every colour is
  wrapped in one `alpha()` helper emitting `color-mix(in oklab, var(--x) calc(<alpha-value> *
  100%), transparent)`. The bare class is unchanged — `<alpha-value>` defaults to 1, and a
  `color-mix` at 100% is the colour itself. `globals.css` already used `color-mix(in oklab, …)`
  in 84 places, so this added no browser requirement.
- ⚠️ **Tailwind's stock `theme.opacity` runs in steps of 5**, so `/8` and `/12` stay dead even
  with the bridge fixed — `asColor` bails before alpha is applied. The nine such usages were
  rewritten to the arbitrary form `/[0.08]` and `/[0.12]`, which bypasses the scale entirely.
  ⛔ Deliberately NOT fixed by extending `theme.opacity`: an opacity step is a value, and §0d
  says this file is a bridge that never originates one.
- ⚠️ **`bg-current/10` and `border-current/40` cannot be fixed by any bridge** — Tailwind owns
  the `current` keyword and `parseColor('currentColor')` fails exactly as `var(--x)` does. Both
  were rewritten to real tokens at the call site.
- 🔴 **`test:bridge` — the guard written after the 1,325-dead-class incident — could not see
  this, by one character.** Its `classRe` lookahead lists `/` as a legal TERMINATOR, so
  `bg-brand-500/10` was captured as `bg-brand-500`, found in the theme, and PASSED. It also
  skipped unknown families forever (that is how `text-warn` survived) and walked `.tsx` only.
- ⭐ **The new §6 compile probe stops asking the proxy question.** It compiles every
  alpha-modified class through the repo's own Tailwind and fails on any that produces no rule —
  a key-existence check can be fooled, a compiler cannot. It carries a NEGATIVE CONTROL that
  fails loudly if the probe ever loses the ability to detect anything.
- 🔴 **Two ways to write the probe's predicate wrong, both hit within ten minutes, both making
  a DEAD class look alive:** (1) `css.includes("." + cls)` is a substring test — `.text-warn`
  matches inside `.text-warning-fg`, and it made me briefly report the audit wrong when the
  audit was right; (2) the selector is escaped in two alphabets (Tailwind's, then the regex's)
  and collapsing them yields `\\[` in regex source — a literal backslash followed by the start
  of a character class — which silently reports every `/[0.08]` class missing.
- ⚠️ **A shell heredoc ate a backslash layer** while drafting that predicate (`\\.` → `.`,
  `\\s` → `s`), producing a probe that reported everything missing. This is
  `50pick-standards` §5b rule 11, paid again. **Write files with the editor, never through a
  shell string.**

**Stage 3**

- 🔴 **EVERY FORM FIELD IN THE PRODUCT WAS 96px TALL.** `input.tsx` set `sm/md/lg` to
  `h-9/h-11/h-12`, which under the overridden spacing scale is **64 / 96 / 128px** — against
  its own JSDoc contract of "sm 36 · md 44 · lg 48". 33 files import it, `md` is the default,
  and `lg` is what the wallet amount field uses. That single line is the audit's "inputs at
  ~2× normal height", and the true multiple was **2.67×**. `password-input.tsx` carried a
  byte-identical copy of the same table.
- ⭐ **ELEVEN COMMENTS STATED A PIXEL COUNT THE CODE CONTRADICTED**, every one of them
  claiming compliance the render did not have: `conviction-dial`'s two "44 px height (WCAG
  2.5.5)" over 96px, `top-app-bar`'s "44px-tall hit area … width stays 28px" over 96×40,
  `watch-star`'s "≥40px tap target" over 80px, `side-picker`'s "44px without growing the row"
  over 96px with a −24px pull-back, `amount-field`'s "≥44px (was h-8/32px)" where `h-8` was
  48px and `min-h-11` is 96. **The false comment is how the defect spread** — each one told
  the next author the trap had already been handled.
- ⚠️ **The audit said three inline compensating patches; there were five.** The two extra are
  the `btn-sm h-8` idiom in admin, which `globals.css` claims `btn-xs` already replaced.
- ⚠️ **`h-auto` is INERT on every `.btn` in this codebase.** No cascade layers, so
  `.btn-md { height }` beats `.h-auto` on source order. Buttons paired with it are fixed
  boxes, and `whitespace-normal` on them cannot grow — a two-line Swahili label overflows.
  Pre-existing, NOT fixed by the bump, and now written down.
- ⚠️ **`globals.css` said the bump had "148 call sites"; the real number is 333** (192 literal
  `btn-*` classNames + 141 `<Button>`/`<SubmitButton>` tags resolving through their defaults,
  which no text search sees). The decision that comment justified — leave the tokens alone —
  was taken on roughly half the real number.
- ⭐ **The market card did not move.** `.mcardp-actions .btn` is (0,2,0) and outranks
  `.btn-md` (0,1,0), so the board's money buttons stayed at 40px: `qa:card-geometry` reports
  **349px at 360, 1280 and 1920**, identical to `MARKET_CARD_H`. That was the top-flagged risk
  and it held.
- ⭐ **`/admin/system`'s maintenance lever was a FORK of the kit Toggle, and it had drifted
  into a behaviour defect** — an `h-7 w-12` track (40×**128**px) with a 32px knob travelling
  2px→22px. A knob crossing a sixth of its own track made ON and OFF nearly indistinguishable
  **on the switch that pauses money-in**. The fork existed for one reason: it wanted claret,
  and the kit shipped only royal and gold. Fixed by giving the kit a `tone` prop (replacing a
  `gold` boolean that had ZERO call sites) — extend the kit, never fork it.
- ⚠️ **The landing page lost ~1000px at 360** (8514 → 7513) once the rhythm stepped down under
  the breakpoint. The `--rh-*` block's own warning — that an observed gap is the SUM of the two
  paddings meeting at it — is why the step is on the tokens and not on a margin.
- ⭐ **`qa:shots` gained a clipped-not-scrolled check**, because the document-level overflow
  test cannot see it: a child clipped by an intermediate `overflow:hidden` row never reaches
  the document edge. ⚠️ Two rounds of false positives taught the shape it needs: skip
  `sr-only` (a 1px clip BY DESIGN), and name the overflowing CHILD rather than the box, keeping
  only in-flow, non-`aria-hidden` children — otherwise every decorative watermark bleed on
  every hero reports as a defect, and a guard that cries wolf gets skipped.

**Stage 4**

- 🔴 **The RG cooling-off deadline was rendered in the SERVER's timezone**, i.e. UTC on
  Railway — three hours behind EAT — on a **statutory** control shown to a player. It told
  them a deposit-limit increase lands at 22:00 when it lands at 01:00 the next day. Six more
  of the same class on `/admin/players/[id]` (KYC decision dates, self-exclusion expiry,
  cooling-off), the settled-day stamp on the statutory settlement-fee table, and a wallet feed
  printing a raw UTC ISO slice **directly beneath a correctly-zoned bet feed on the same page**
  — one screen, two clocks, three hours apart.
- ⭐ `utils.ts` **already documented this exact defect class** in `formatDayTime`'s own header,
  from a previous round of the same bug. The helpers were right; the call sites went around
  them.
- ⚠️ **`formatDateISO` is the one member of the formatter family that is UTC** (a
  `toISOString().slice`). Do not reach for it for an EAT calendar day — `eat-day.ts` is "the
  one place the platform decides what a day is", and the statutory reporting stack already
  bins on it.
- ⚠️ **A `.slice(0, 10)` on an ISO string is the same defect as `toLocaleString`** and no
  `toLocale*` grep finds it. `admin/sources` had one.
- ⭐ **The brief's premise about `/positions` was FALSE and the agent said so.** It does NOT
  hold Up & Down positions — `listPositionsForUser(..., "MARKET")` — so "it holds both
  products" was wrong. The "Polls you've played" defect stands anyway on §L4 grounds and for a
  better reason: every OTHER string on that page already says "market", so "Polls" was the odd
  word out inside the single product line the page does hold. The page was named **three
  ways** (top nav "History", bottom nav "Bets", title "Polls you've played"); all three now
  read `common.positions`.
- 🔴 **`qa:live` asserted the two names the rename removed** (`includes("History") ||
  includes("played")`), so it would have gone RED on a correct page. Re-pointed at the one
  name AND at the old names being gone, so a partial revert cannot pass it.
- ⚠️ **The Swahili was left partial ON PURPOSE.** The lexicon's own header forbids inventing
  Swahili — every `sw` string must be lifted verbatim from an already-shipped source. Families
  with no shipped source stay EN-only, which is the existing documented convention, not an
  omission.
- ⚠️ **`updown/rounds` printed a raw `voidReason` while `updown-refund-reason.ts` existed
  precisely to phrase it** — a refund explanation an officer reads, bypassing its own module.

**Stage 5**

- ⭐ **HALF THE FORCED-COLORS PREMISE WAS FALSE, AND THE AGENT PROVED IT.** Tailwind 3's
  `outline-none` UTILITY is not `outline: none` — `corePlugins.js` defines it as
  `outline: 2px solid transparent; outline-offset: 2px`, i.e. it already IS the
  forced-colors bridge. So every `focus:outline-none` in a `.tsx` was already covered. The
  genuine defects were the REAL `outline: none` declarations in the stylesheets
  (`.brand-focus`, `.admin-focus`, `.input:focus`, `.input-group`, `textarea`, `.m-focusable`,
  the chat composer) — those had no bridge at all. ⚠️ Tailwind 4 redefines the utility, so
  this is a trap to remember rather than a reason to relax.
- 🔴 **`.admin-focus` was stripping the kit's ring off buttons.** Both it and `.btn:focus-visible`
  are (0,2,0), and `.admin-focus` is emitted ~2,800 lines later — so it won, and its
  `outline: none` deleted the ring. Closed in CSS with a combined `.btn.admin-focus:focus-visible`
  selector, so it is safe **regardless of whether the five `.tsx` stacking sites are ever
  touched**. It was also `:focus`, not `:focus-visible`, so it fired on mouse click; all 45
  call sites were checked before changing it.
- ⚠️ **`textarea` needed TWO rules, not one.** The bare `textarea { outline: none }` is (0,0,1)
  and the `:where(…)` catch-all is (0,1,0), so a keyboard-focused bare textarea ALREADY drew a
  real brand outline. A flat transparent outline at (0,1,1) would have OUTRANKED the catch-all
  and deleted it — trading one regression for another.
- 🔴 **The chat composer's `textarea { outline: none }` at (0,1,1) outranked the catch-all**, so
  the chat field had no keyboard ring at all. The catch-all exists precisely so nothing in the
  long tail is unfocusable; this was the thing that got out of the tail.
- 🔴 **The notifications panel declared `role="dialog"` and provided none of the contract** — no
  `aria-modal`, no focus-in, no trap, no return, on a PORTALED panel hosting money
  notifications, so Tab went straight to the page behind the scrim. It also nested a
  `<button>` inside a `<button>` (dismiss inside the row), which is invalid HTML with undefined
  AT behaviour.
- ⭐ **Tabs dropped their `role="tab"` rather than gaining arrow keys**, and the reason is
  structural: the ARIA tab pattern requires `aria-controls` pointing at a `role="tabpanel"`,
  and neither component owns its panel — `Tabs`' panel is rendered by its caller, and the
  chart's "panel" is an SVG that is already `role="img"` with alt text and cannot be both.
  `aria-pressed` (the `FilterPill` semantics used everywhere else in this product) is the
  honest description of what these actually are.
- ⚠️ **`countdown-pill` was announcing every second** via `aria-live` — on the OTP screen, a
  screen reader counting out loud. Now sparse (start / 30s / 10s / ready).
- 🔴 **`test:ui-consistency`'s `bare-text-button` rule has been UNDER-reporting for its whole
  life, by one character.** Its `<button\b([^>]*)>` stops at the FIRST `>` — and an arrow
  function contains one, so any button written `onClick={() => …}` (i.e. most of them) never
  had its `className` captured and was silently skipped. Found only because simplifying one
  handler to `onClick={open}` made a button the rule had never been able to see appear as
  "new drift". Widened — and the rule now also treats an ICON as paint, since its own words
  are "painted ONLY with type" and a pencil glyph is exactly what tells a reader that text is
  pressable. Net 58 → 55 findings: seeing more buttons retired more false positives than it
  added.
- ⚠️ **`backYesAria`/`backNoAria` could NOT be deleted**: `side-picker.tsx` still consumes all
  four, and correctly — it hardcodes `sideWord(t, side, "MARKET")`, so it is poll-only and its
  aria matches its visible label. The §L4 defect was specific to `market-card`, which renders
  MIXED books.

**Stage 6**

- 🔴 **NOTHING IN THE PRODUCT ANIMATED OUT.** Modal, notifications panel, Select, avatar menu,
  AI toolkit and needle drawer all arrived on eased kit entrances and were removed by INSTANT
  UNMOUNT. §M2 says every arrival has its exit — and the exits were already defined with
  **zero consumers** (`.m-out`, `.m-float-out`, `m-leave-out`). One shared `useExitPhase` hook
  now carries the toast's two-phase shape across all six, so they cannot drift apart.
- ⭐ **The JS hold is the part a CSS clamp cannot reach.** An exit implemented only in CSS still
  delays the unmount for someone who asked for no motion, so `exitBeatMs` collapses the hold to
  zero on gates 1 and 2. Gate 3 is deliberately EXCLUDED with the reason written down: it is a
  THROTTLE, not a clamp, and a one-shot 90–140ms exit is not an ambient loop.
- ⭐ **No duration is retyped in TypeScript** — the beat is read from `--t-quick`/`--t-flick`
  via `getComputedStyle` at close time, and an unresolvable token yields 0 (instant unmount),
  which is the safe failure direction.
- ⚠️ **The needle drawer's PANEL genuinely cannot take `.m-float-out`** — that keyframe sets
  `transform: translateY(…)`, which would REPLACE the `sm:-translate-x-1/2 -translate-y-1/2`
  centring and throw the dialog to the corner for the whole fade. The file already documents
  the identical constraint for its arrival; the exemption was mirrored, not invented, and the
  keyframe registry names that exact pattern in writing as legitimate.
- 🔴 **A BACKTICK INSIDE A `<style>{\`…\`}</style>` TEMPLATE LITERAL BROKE THE BUILD.** A CSS
  comment in `brand.tsx` wrote `` `transform` `` for emphasis; the backtick closed the string
  and the rest of the file parsed as JSX. Caught by `tsc`, cost one build. A ⛔ note now sits
  in that block. This is the third backtick/escaping trap this campaign has hit.
- ⚠️ **`route-transition` gave Chrome a DOUBLE entrance** — the View-Transition cross-fade
  (180ms) and `.route-enter`'s `m-settle-in` (340ms) replayed together, 520ms of stacked motion
  on the hottest path. And the in-app "Reduce motion" switch did NOT stop route cross-fades at
  all, because a universal CSS clamp cannot match a `::view-transition` pseudo-element — the
  gate has to be applied in JS, at `startViewTransition`.
- 🔴 **TWO GUARDS AND ONE RED PROOF ASSERTED THE SPELLING, NOT THE VALUE.** Moving the bet
  dwell into `feedback-timing.ts` — which is the module §F8 created to own dwells — turned
  `test:feedback-law` §9.8 and `test:updown-bet-feedback` §2.5/2.6 RED over a strictly better
  shape, because all three required a numeric LITERAL at the call site. Worse, `feedback-law`
  §9.7 four lines above §9.8 ALREADY read constants from that module, so the file disagreed
  with itself. All three now RESOLVE the constant and assert the number, which is stronger
  than the literal check was: it still fails on a missing dwell, and now also fails on a
  constant that does not exist. ⭐ The red proof's anchor went stale in the same move and
  said so out loud — *"THIS MUTATION PROVES NOTHING"* — which is the only reason it was
  noticed. That refusal-to-pass-quietly is worth more than the assertion it guards.
- ⚠️ **`style={{ animation }}` attributes are invisible to every motion gate**, and three were
  INFINITE loops with no gate-3 entry — including `pr-pulse`, which renders on `/live`, a
  player board. The keyframe registry was also mislabelling them "no consumer", which is a
  DELETION TRAP for a future session.

**Stage 7**

- ⭐ **THE FONT BRIEF'S PREMISE WAS WRONG, AND ACTING ON IT WOULD HAVE COST FIVE REGRESSIONS
  FOR ZERO BYTES.** All three families are **VARIABLE** fonts: every weight of a family points
  at the SAME woff2 (Sora 400–800 → one 25,240 B file; Inter 400–700 → one 48,432 B; JBM
  400–600 → one 31,340 B). Pruning a weight saves nothing but ~200 bytes of CSS, and the census
  says every declared weight is genuinely referenced. ⛔ Do not "prune the font weights" — the
  suggestion is in the audit and it is wrong.
- ⭐ **The notifications bell went from ~720 requests/hour to ~120** — 30s closed, 5s only while
  open, self-chaining so ticks cannot overlap, with `use-event-stream.ts`'s exact backoff policy
  (1s→30s, ±30% jitter, reset earned by a real answer) rather than a second one. Opening the
  panel now fires an immediate refresh, so the list a player actually looks at is FRESHER than
  before, not staler — without that the change would have been a user-visible regression.
- ⭐ **An 8-card Up & Down board armed 32 unaligned 1-second timers; it now has ONE.** The
  per-render `Intl` construction is gone (`usd()` built a fresh `Intl.NumberFormat` on each of
  ~5 calls per card per second) and the second is pushed down into a digits leaf, so a tick
  re-renders the digits rather than the card.
- 🔴 **The last per-second whole-card render was one line in `use-quick-bet`**, which every card
  calls unconditionally: it read the clock to derive ONE boolean — has the selection window shut
  — through an ungated `useServerNow` that returns a new number every second. Gated on the
  boolean itself, so a render is requested once per round instead of once per second.
- ⚠️ **`admin-shell` carried a PERSISTENT `backdrop-filter: blur(14px)`** on its sticky top bar
  — continuous compositing for the whole session, on the console an operator leaves open all
  day. The player top bar had already deleted its own for exactly this reason and `globals.css`
  records why.

### 🔴 DEFERRED WITH A PLAN — the i18n first-load bundle (Stage 7's biggest single win)

**The premise is CONFIRMED and measured:** `src/lib/i18n-dict.ts` is 340,197 B of EN + SW + ZH,
imported by a client provider mounted in the root layout, and it lands in first-load JS as a
**267,096 B chunk** — the second-largest. At least two thirds is dead weight per visitor, and
this product's players are on low-end Android over Tanzanian mobile data.

**Why it was NOT split, on evidence rather than caution.** That file is not only a module — it
is a **test fixture read as SOURCE TEXT by 19 wired gate scripts, 7 of which REWRITE it**
(`red-labels.mjs` mutates exact ZH string literals; `red-feedback-law`, `failure-reasons-red`,
`rate-copy-red`, `ticker-honesty-red`, `updown-source-class-red`, `updown-void-copy-red`). Two
assertion shapes make the split self-contradictory: `label-lexicon.test.mts` locates the locale
blocks by the regex `^  en: \{` and **deliberately hard-fails rather than scan nothing**, while
the only form that would tree-shake — three top-level `export const en/sw/zh` — cannot also be a
two-space-indented object property. And `I18nProvider` is mounted from a `"use client"` file, so
there is no server component in its path to hand the active dict down from.

**The unblock, ready to execute** (needs ownership of `src/app/layout.tsx`,
`src/components/theme-provider.tsx` and `scripts/`): `layout.tsx` already derives `lang` from the
`kp-locale` cookie — have it call `getServerT()` and pass the active dict down as `initialDict`.
The client bundle then carries **no dictionary at all** (the whole 267 KB leaves first-load JS,
not just two thirds), the active locale arrives inline with no waterfall and no wrong-language
flash, `useT()` stays synchronous, and the other two locales load only on a real switch — covered
by the `isChangingLocale` overlay that already exists for exactly that moment. The scripts pass is
mechanical: one shared helper replacing `read("src/lib/i18n-dict.ts")` with a read-and-concatenate
of the per-locale files, plus repointing the 7 RED harnesses' mutation targets — ⚠️ if those are
missed their mutations become silent no-ops and they will report "the gate did not catch it",
which looks like a broken gate rather than a broken harness.
⚠️ **Type safety to preserve:** `Dict = typeof dict.en` with `as const`, so `sw`/`zh` are NOT
compile-checked against it (hence the existing `as Dict` cast); parity is enforced at RUNTIME by
`test:i18n` comparing flattened leaf-key sets. Any split must reproduce that exact arrangement —
one canonical type from EN, runtime parity for the other two — or the 1880-key count silently
stops meaning anything.

**Stage 8**

- ⭐ **73 dead classes and 10 dead keyframes gone from `globals.css` (−334 lines)** — and the
  ones that mattered were TRAPS, not merely unused: `.gilt-num` put `letter-spacing` on a MONEY
  ink class, contradicting §M4 and a comment thirty lines above it in the same file;
  `.countdown-ring`/`.ring-num` was a **Sora** block for a countdown whose real component is
  mono; `.mterm-*`/`.pool-amt` rendered a pool AMOUNT in Sora; `.gold-dot` carried a FALSE
  comment claiming the notification bell used it. Each would have handed its violation to
  whoever found it first.
- ⭐ **FOUR "DEAD" ITEMS WERE REFUTED WITH EVIDENCE AND LEFT ALONE.** `.ticket-target` /
  `-scope` / `-anchor` are LIVE deep-link classes on four pages plus `hash-focus.tsx` (the
  audit's "ticket ×17" conflated 4 live with 13 dead — only the 13 went). `.pbar-*` carries a
  RECORDED decision that deleting it is a design-system call, "filed, not acted on", and has
  spec pages. `.mat-flat`/`.mat-raised-i` are rungs of a documented 6-rung ladder whose
  siblings ship. `.countdown--urgent`/`--critical` HAVE a consumer — the KEPT list inside
  `reduce-motion.test.mts` — so deleting the CSS alone would have broken that suite.
- ⚠️ **The audit's claim that `.pbar-resolved` was "an ungated ambient loop" was FALSE** — it
  was already in the third gate.
- 🔴 **`PriceChart` was unmounted, still carried the BANNED teal 215**, and its file-wide
  ratchet exemption was meanwhile letting the LIVE `VolumeSparkline` beside it re-type a token
  unguarded. Deleting the dead half made the file clean and the sparkline guarded in one move;
  the ratchet shrank 36 → 35.
- ⭐ **`rounded-2xl` is now genuinely ZERO in `src`**, so CLAUDE.md's long-standing claim is
  true for the first time rather than merely corrected.
- ⚠️ **Every count CLAUDE.md stated was wrong**: "50 loading.tsx" (79), "75+ SVGs at 1.85px"
  stroke (both numbers wrong — the glyph file's own header says 1.9), "117 `test:*` scripts"
  (less than half the real number), and a `next-themes` line where **both halves were false**.
  The corrections say *how to re-derive* rather than restating a new number to go stale.
- ⚠️ **`.skel-fade-out` was UNWIREABLE, not merely unused** — it would have to play on a Next
  `loading.tsx` Suspense fallback, which React unmounts synchronously, and this codebase has no
  exit-animation coordinator. Its sibling `.content-fade-in` is applied to the LOADER, not the
  arriving content, so the "cross-fade" its comment described never existed in either half.

**Follow-ups this campaign opened and has not closed**

- Nothing in the repo asserts **storage-safety**. Both Stage-1 storage fixes can regress
  silently. → candidate guard for Stage 10.
- No assertion pins the two new **revoked-session `r == null` guards** or the sell `inFlight`
  latch. → candidate guard for Stage 10.
- No assertion pins **`WithdrawConfirm`'s openGuard/validate** trio. → candidate guard for
  Stage 10.
- **There is no client-safe payment-provider catalog.** Eight sites own their own id →
  display-name map; Stage 4 could only reach two of them from inside one agent's scope, and a
  module used by two while six keep copies is a seventh definition, not a consolidation. →
  Stage 9 (`src/lib/payment-providers.ts`, all eight converted).
- **`toLocaleString()` on COUNTS is repo-wide in admin** (affiliate, ai-polls ×4, ai-usage,
  aml, audit, bonuses, candidates …). It takes the runtime locale, so a count can group with
  dots beside `formatTzs` money grouping with commas on the same KPI row. → Stage 9 sweep.
- `updown-stake-controls` quick-stake chips use `rounded-md` (8px) while the sibling control
  for the same job now uses `--r-pill` — same money control, two shapes, §S2 breached on one.
  → the radius pass.
- `.ticket-chip` is a **30px** money control that the Phase-3 bump does not reach (it is not
  on `--h-control-*`). → Stage 9.

---

## 0. Bootstrap (do this first, in order)

1. Read CLAUDE.md. Load skills `50pick-standards`, `50pick-audit`, `railway`. `git pull`.
   `git branch --show-current` must say `main` — every push is a LIVE production deploy of a
   real-money platform. No staging exists.
2. Run the baseline: `npx tsc --noEmit`, then `npm run test:all`. It was green at HEAD
   `937e4d19` (26/26 design guards). If anything is red BEFORE you change anything, stop and
   tell Ali.
3. Save the campaign prompt as this file in the first commit and keep the STATUS BOARD above
   updated after every stage (stage → DONE @ commit). When the campaign completes, mark the
   file SPENT at the top. Do not create any other tracker file.

## 1. HOW TO INTERPRET THE AUDIT — read before touching anything

- Findings were produced by 16 audit lenses and the top ten were adversarially re-verified in
  code. Items tagged VERIFIED below are proven at the quoted lines. Everything else was
  produced by an agent that opened the file — still re-read each file before editing; line
  numbers may have drifted.
- **DO NOT "FIX" THESE** — they were checked and are fine (the audit's own corrections):
  - Modal ✕ and toast dismiss are 48×48 (`h-8` = 48px under the overridden spacing scale).
    Leave them.
  - The notifications 5s poll is NOT redundant with SSE (it alone carries cross-device
    read/dismiss state and covers SSE outages). Fix its cadence and guards (Stage 7); do not
    delete it.
  - The first-visit primer's dismissal persistence and Esc handling are correct. Leave it.
  - The overridden Tailwind spacing scale itself and the legacy numeric radius scale are
    FROZEN by recorded decision. Never renumber either. Fix call sites, never the scale.
- **NEVER TOUCH** (verified-good, load-bearing): the deposit CREDIT path; settlement/payout
  logic; the bet/sell/deposit/withdraw double-fire architecture (pending gate → hold-open
  confirm → idempotency key); NotifyPoller's self-chaining design; the SSE client's backoff;
  ToastProvider's memoization; the FilterSheet; the Modal primitive's trap/lock/return (you
  will ADD an exit phase, not restructure); the conviction dial's keyboard model; the
  `.mcardp` card system; the glyph set; the brand mark; the landing top half; cold-start
  honesty rules (B6/B10); the design-system archives under `docs/design-system/` (deliberate
  duplication — "do not clean up" is written into the manifest).
- **Money rules**: `docs/RULES.md` is the only source of rates. §M money invariants in the
  `50pick-audit` skill apply. Any push that touches a file on a money surface requires full
  `npm run test:all` first.
- **Design rules**: `docs/DESIGN_AUTHORITY.md` is the only rulebook; values live in
  `globals.css`/`motion.css` only; new states are props on existing components; no new `.css`
  files; no new hex/oklch literals in components; extend the kit, never fork it. When a fix
  needs a new token, the SYSTEM gains the token.
- **Autonomy contract**: do not stop to ask permission mid-stage. The only decision points are
  §3 below, and each has a DEFAULT — if Ali hasn't answered inline, apply the default and
  record "default applied" in the commit message. Work stage → verify → push → next stage
  until every stage is DONE and live-verified. Do not end the session with unpushed work.

## 2. OPERATING PROTOCOL — every stage, no exceptions

1. Implement the stage's items. Stage the files you touched BY NAME (never `git add -A` /
   `add .`).
2. Run the stage's named guard suites + `npx tsc --noEmit` + `npm run build`. Money-adjacent
   stages: full `npm run test:all`.
3. Where a stage changes anything visual: boot the local dev server
   (`SESSION_SECRET=x32chars OTP_PEPPER=x16 npx next dev -p 3009`, in-memory) and screenshot
   the touched surfaces at 360/768/1280/1920 with Playwright; LOOK at the screenshots. Copy
   changes: verify EN + SW + ZH.
4. Commit `"Design-perfection stage NN: <title> — <one-line>"`, push, wait for Railway (2–3
   min), then live-verify: `curl https://50pick.tz` → 200; `railway logs -s 50pick` clean
   boot; screenshot the touched live pages. Ali's rule: technical + logical + visual + live
   verification after every push.
5. Update the STATUS BOARD and the doc that owns each subject (DESIGN_AUTHORITY corrections
   belong in DESIGN_AUTHORITY, CLAUDE.md corrections in CLAUDE.md) in the same commit as the
   code.
6. If a stage goes sideways: revert that stage cleanly (`git revert`, push), record it on the
   board, continue with the next stage. Never leave prod broken while you debug.

## 3. OWNER DECISIONS — Ali may answer inline here; otherwise APPLY THE DEFAULT

**D1 Gold confirm ruling** (two contradictory laws live: CLAUDE.md "confirm CTA is btn-gold"
vs `modal.tsx` "gold is intentionally NOT a confirm tone").
DEFAULT: deposit/withdraw `ConfirmDialog` commits become tone `"brand"` `btn-lg` (not claret,
not gold); bet/sell confirms stay gold as shipped; record the ruling in DESIGN_AUTHORITY §M3
and delete the contradicting CLAUDE.md sentence.

**D2 Success/danger divorce from YES/NO (§B2).**
DEFAULT: mint `--success` (green, hue ~160, visibly distinct from `--yes-500`'s 152) and keep
`--danger` (25) for app-state; re-point toast success/danger, `Callout`, `ErrorState`, and the
six auth pages off yes/no tokens; betting surfaces keep yes/no untouched. Contrast-check every
new pairing with `test:contrast`.

**D3 Claret.**
DEFAULT: file the observed convention into §B4 as law — "claret = irreversible operator
ceremony (kill-switch, emergency void, final reject)" — and migrate the mixed danger/claret
chip (`poll-actions:891`) to match. No visual sweep beyond that.

**D4 Status-color dictionary.**
DEFAULT: build the word×surface×tone table into `admin-status-lexicon` (and the player lexicon)
exactly as shipped today EXCEPT: APPROVED = success green everywhere (proposals loses its gold
gradient); PENDING/CLOSED = royal everywhere (admin loses amber for these); keep the LIVE split
(red = player broadcast, green = admin ops health) and write that exception down.

**D5 Wallet gold hierarchy.**
DEFAULT: the TZS 0 Bonus card and the Cashback promo drop the gold costume (royal panel + gold
TEXT accents only, no gradient wash, no jackpot glow); the Available card gains the strongest
elevation on the page; exactly ONE gold Deposit CTA per viewport (the header one wins; the
others become brand). This is D1-adjacent — do both in one stage.

**D6 Aqua.**
DEFAULT: re-hue `.chip-signal` (TIPPING) to brand royal (chip-new's family); `/live`'s aqua
identity (masthead dot, eyebrows, pager) becomes a WRITTEN §B4 exception, one sentence, instead
of a re-hue; `.btn-aqua-ghost` loses the aqua LABEL (label becomes text on aqua-tinted ghost)
or is folded into ghost — pick whichever its single consumer tolerates.

**D7 The alpha-utility strategy (the Critical).**
DEFAULT: Option A — sweep, don't enable. Enabling `<alpha-value>` would restyle ~140 files
sight-unseen. Instead: replace the ~40 money/compliance-surface usages (`callout.tsx` tones,
KYC rejection panel, deposit/withdraw alerts, RG panels, login banners, sell/bet accents) with
the existing pre-mixed `*-bg` tokens or new named tokens minted in `globals.css`; then sweep the
remaining `/alpha` usages file-by-file to bare tokens or new mixes; finish by adding a
compile-probe to `test:bridge` that FAILS on any class that doesn't emit, so the class can never
come back silently.

## 4. THE STAGES — in this order

### Stage 1 — SAFETY (no visual change; ship first) [VERIFIED items marked ✓]

- ✓ `rg/reality-check.tsx:42-83` — wrap all 5 `sessionStorage` calls in try/catch w/ in-memory
  fallback (keep the check firing).
- ✓ `lib/i18n.tsx:67` — try/catch the `localStorage` read (the write 20 lines down shows the
  intended shape).
- ✓ `wallet/withdraw/withdraw-confirm.tsx:44-51` — seq-guard the payee lookup (copy
  `vote-control.tsx`'s B-20 pattern); reset payee to idle on dialog close.
- `withdraw-confirm.tsx` — port `DepositConfirm`'s openGuard/validate/noValidate trio
  (B-22/V-3): TZS 0 must not be confirmable; kit toast refusals, no native bubbles.
- ✓ The `useMayAct` hooks-order violation: move `if (!mayAct) return <ActReadOnly/>` BELOW all
  hooks in the 17+ admin control files (grep `useMayAct`); fix `act-gate.tsx`'s doc comment
  which prescribes the broken pattern.
- `conviction-dial.tsx:943-952` + `sell-button.tsx:135-142` — add the `if (r == null) return`
  revoked-session guard `use-quick-bet.ts:326` already has.
- `comments-thread.tsx:83,99,119` — B-12 try/catch + errorCopy toast, input preserved.
- `notify-poller.tsx:235-246` — null the timer id after clearing; add a `tickInFlight`
  re-entrancy ref; `AbortSignal.timeout` on both fetches; single wake path (visibilitychange
  only).
- ✓ `toast.tsx:176-180` — resume only on the `resultModalOpen` true→false EDGE (prev-ref), and
  never resume toasts in a user-paused set (hover/focus/drag add to it).
- `sell-button.tsx:127` — `if (pending) return` at the top of `submit()`.
- `nav-progress.tsx:46,60` — track the completion timeout in a ref; `startBar` clears it and
  re-arms.
- `admin/reports/generate-button.tsx:28` — `AbortSignal.timeout(60_000)` → `overlay.fail` with
  retry.
- `operation-result-modal` primary: stop double-push ("Keep predicting") — `onPrimary`
  suppresses the auto `onClose` (mirror the secondary's fixed semantics).
- `markets/[id]/page.tsx:119` — validate `side` before interpolating (copy `:721`'s guard).
- `notifications-panel.tsx` refresh — monotonic seq, apply only latest.

Guards: `npm run test:all` (money-adjacent files touched).

### Stage 2 — THE ALPHA CRITICAL (D7 default) [✓ proven by compile]

Execute D7. Verify visually: KYC rejection alert, deposit/withdraw warning panels, all four
`Callout` tones, login banners — screenshot before/after at 360+1280. New guard: compile-probe
in `scripts/bridge` (fails on non-emitting class). Guards: `test:bridge`, `test:contrast`,
`build`.

Also in this stage (same class): fix the dead classes `text-warn` (admin/compliance ×4 →
`text-warning-fg`), `text-hot-rose-300` (×4 → `text-no-300` or a real token), `text-onBrand`
(`admin-shell:40` → `text-text-onBrand`).

### Stage 3 — SIZING (the operator's top priority)

- ✓ `round-stake-panel.tsx:162,177` — move `borderRadius` out of the comment; per §S2 stake
  pills take `--r-pill` (record the choice).
- The spacing-trap sweep: replace numeric size utilities ≥7 written in default-Tailwind idiom
  with explicit literals or tokens at: `ui/input.tsx:50-54` (make the atom's real heights match
  its documented 36/44/48 contract), `conviction-dial.tsx:1434-36` (stake input → 44px),
  `bet-confirm-modal.tsx:378` (cancel → same height as sell-confirm's, both `btn-lg` per F2),
  `side-picker.tsx:85`, `wallet/amount-field.tsx:82` (quick chips → `min-h-[44px]`; they must
  stop being 96px circles), `ui/select.tsx:212`, `markets/watch-star.tsx:104` (→ 44px),
  `position-share.tsx:114`, `share-button.tsx:66`, `profile/password-section.tsx:131,138`,
  `ui/tabs.tsx:115` (→ `h-[44px]`; kills the 80px wallet tabs), `ui/pull-to-refresh.tsx:87`.
  Then grep the whole of `src` for remaining `h-(7|8|9|10|11|12)\b` / `w-(9|10|11|12)\b` /
  `min-h-(8|9|11)\b` in tsx and adjudicate each hit (some are intentional under the override —
  decide per site, comment intent).
- Phase-3 control-height bump: `globals.css` `--h-control-sm` 30→40, `--h-control-md` 38→44
  (the plan already written at `globals.css:226-228`); DELETE the three inline compensating
  patches (`conviction-dial:1599-1602` style, `sell-button:194-195`, `reality-check:132,136`)
  in the same commit; re-verify every button surface visually at 360 — this moves the whole
  product, look at it.
- `markets/notify-prompt.tsx:102-118` — add `btn-md`; replace `btn-yes` "watching" state with
  `aria-pressed` styling (non-semantic).
- `admin/refresh-button.tsx:62` + `admin/markets/page.tsx:129` — `btn-sm h-8` → `btn-xs`.
- `reality-check.tsx:124-139` — RG exits sized equal to "Continue playing" (all `btn-lg`
  full-width grid).
- `proposals/new/create-form.tsx:140-156` — category chips 34px→44px, selection royal not gold
  (reuse the KYC `FilterPill` pattern).
- Landing mobile rhythm: step `--rh-*` down under 768 (144→96, 96→64) in `globals.css`; verify
  the landing bottom third at 360 no longer has 200px voids.
- Landing stat row at 360: let the three stats flow 3-up or stack cleanly (kill the 2+1 orphan).
- One compaction grammar: make landing hero, board header, and ticker all use
  `formatTzsCompact`'s output for the same figure ("TZS 1.3M" wins; fix the "1279k" producer).

Guards: `test:measure`, `responsive-audit` against local server, tap screenshots at 360. FULL
`test:all` before push (money surfaces move).

### Stage 4 — CORRECTNESS: time, words, money formatting

- ✓ `admin/players/[id]/page.tsx:488,490,491,549,592,609,618` — all seven →
  `formatDateTimeSafe`.
- `profile/responsible-gambling/page.tsx:131` → `formatDateTime` (compliance deadline).
- `admin/live/page.tsx:161` → `formatTime`; `admin/finance/page.tsx:228` → `formatDate` (EAT
  day, not UTC slice); `admin/sources:108`, `admin/updown/updown-controls:394` → shared
  formatters.
- `withdraw-confirm.tsx:41` + `deposit-confirm.tsx:67` — provider display names from the
  catalog (the names `PaymentLogo` already receives), not `replace(/_/g," ")`.
- Raw enums → lexicon sweep (extend `admin-status-lexicon` families): `admin/candidates:294,416`;
  `ai-polls:357`; `privacy:88,155`; `staff:90` + `staff/[id]:46`; `payments:317`; `players:179`;
  `transactions:187-258`; `updown/rounds:274-275` (route `voidReason` through
  `updown-refund-reason.ts`); `updown:493,654`; `audit:100`; `admin-proposals-client:539` (and
  fix its `.replace` without `/g`).
- `round-stake-panel.tsx:141` — label the projected payout as TZS via `formatTzs` (+ "est." per
  §C3 conventions).
- Money via raw `toLocaleString` → helpers: `round-stake-panel:136`, `admin/config
  config-form:387,390`, `admin/updown:593`, `invite:241`, `admin-charts` default formatter
  (money series must pass `formatTzs`).
- Positions page naming: one word for one destination — nav label and title agree; replace
  "Polls you've played" with product-neutral copy (it holds Up & Down too; §L1) in all three
  locales.
- approvals header "Name (NIDA)" → "Name (ID document)".

Guards: `test:labels` (+ extend it into admin per its §3 skip — new rule), `test:i18n`,
`test:trilingual`.

### Stage 5 — FOCUS & ACCESSIBILITY

- The forced-colors family: add a real `outline` beside every box-shadow focus ring:
  `.brand-focus`, `.admin-focus` (and make it `:focus-visible`, and stop it stripping `.btn`'s
  ring — fix the stacking at `transactions:110,196,197` + `datetime-range-filter:142,145`),
  `.input:focus`, `textarea`, `.input-group`, `.m-focusable`, chat composer,
  `close-account-form:36`, `set-email-form:51`.
- `provider-radio-grid.tsx` + source-of-funds tiles — `peer-focus-visible` ring on the visible
  tile (`Checkbox.tsx:76` is the recipe).
- `name-editor.tsx:84` + `email-editor.tsx:90` — remove `focus:outline-none`; brand focus
  border; `autoFocus` into edit mode, focus return on close; add the missing pending guard in
  `name-editor`'s `save()`.
- `notifications-panel.tsx` — `aria-modal` + focus trap + initial focus + return (lift from
  `Modal`/`filter-sheet`); restructure rows so dismiss is NOT a button inside a button; sr-only
  "unread" state.
- `ui/select.tsx` — `aria-controls` + `aria-activedescendant` + option ids; accessible name =
  label, value = selected text; Home/End; close on Tab.
- `ui/tabs.tsx` + `probability-chart` tabs — either roving tabindex + arrows or drop the tab
  roles for `aria-pressed` buttons (`FilterPill` semantics).
- `market-card.tsx:398,401` — aria built from `sideWord(row product)` via a `"{side}"` template
  key; delete `backYesAria`/`backNoAria`.
- `first-visit-primer.tsx:146` + `auth-shell.tsx:47` + `invite-client.tsx:53` +
  `probability-bar` wrapper — localized labels passed / `aria-hidden` for decorative; primer's
  baked 7-8px English labels → `t.*` at ≥ nano.
- `countdown-pill.tsx` — `aria-hidden` the ticking span; sparse announcements
  (start/30s/10s/ready).
- `operation-result-modal` — pause auto-close on hover/focus-within (reuse toast pause
  machinery).
- `modal.tsx:321` — `initialFocus` = cancel for non-brand tones.
- `SortTh` — emit `aria-sort` (activates the dead CSS at `globals:3579`).
- Tap-floor list: `min-h` 40→44 on the 17 admin row actions + `notice-bar:107` +
  `objection-dialog:84` + `updown-stake-controls:116`; pad the predictors chip and icon-only
  source link; `featured-contest` pager — real ≥40px hit areas, drop the
  `aria-hidden`/label contradiction.
- "@ pct%" `opacity-85` inside YES/NO buttons — measure with the `qa:button-contrast` raster;
  if <4.5, darken fills per H10 (never lighten labels).
- `useModalLock` on: `needle-drawer`, chat mobile sheet, `admin-mobile-nav`
  (notifications/avatar: either lock or remove their full scrims — record which).

Guards: `test:contrast`, `qa:contrast-rendered`, `test:reduce-motion`, manual keyboard walk of
Select/notifications/dial, screenshots.

### Stage 6 — MOTION

- Modal: add an `exiting` phase (hold one `--t-quick` beat with `.m-out` + scrim fade) —
  `toast.tsx:374-386` is the model; apply `.m-float-out` the same way to `notifications-panel`,
  `select`, `avatar-menu`, `ai-toolkit`, `needle-drawer`.
- `route-transition.tsx` — re-trigger `.route-enter` ONLY on the non-View-Transition path
  (kills the double entrance); gate `startViewTransition` on the in-app reduce-motion setting
  (fixes the VT gate-2 hole).
- `wallet-balance-pill.tsx:56-73` — use the three-gate `motionOff()`/`motionReduced()` check
  (`win-celebration:64-71` is the model); `needle.tsx:179` — include the in-app pref.
- Move style-attribute animations into `<style>` blocks and add gate-3 entries or KEPT rows:
  `lcl-orbit`, `lcl-pulse` (`i18n.tsx`), `pr-pulse` (`brand.tsx` — it renders on `/live`),
  `spin` (Spinner may be KEPT with reason).
- `orm-pop` → `var(--m-settle)` (drop the reserved `--m-pivot`).
- `avatar-menu` `am-rise` → `.m-float-in`; `date-select` `cd-rise` → `.m-dialog-in`; delete both
  keyframes.
- Dwell literals → `feedback-timing.ts` constants: `action-overlay:92`, `use-quick-bet:376`,
  `conviction-dial:1705`.
- OTP expiry bar + `ai-progress` + primer/wallet/limit-usage fills → `transform:scaleX`
  (`admin-bar-grow` is the model); narrow the listed `transition-all` sites to explicit
  properties (dial arm pill first — it animates `font-size` by accident).
- Drop hover transforms on glyphs (`avatar-menu` arrow, `.mcardp-watermark` scale); normalize
  card lifts to `var(--m-lift)` at `--t-quick`.
- `state-tokens.css` — replace the six hand-typed curves/durations with `var(--t-*)`
  `var(--m-*)`; delete the three dead `--state-*` tokens.
- Regenerate `motion.css`'s frozen ambient list from the reduce-motion gate's census (24 loops,
  not 7).
- Delete or map the dead `tailwind.config` `transitionTimingFunction`/`transitionDuration`
  vocabulary onto the CSS vars.

Guards: `test:tokens`, `test:keyframes`, `test:reduce-motion`, `test:glyph-motion`,
`test:motion-ladder`, `qa:calm`; watch a modal close and a route change with your own eyes at
360.

### Stage 7 — PERFORMANCE

- `notifications-panel` poll: 30s closed-panel cadence (5s only while open), `inFlight` ref,
  exponential backoff + jitter, keep SSE as primary trigger. (Do NOT remove the poll — see
  interpretation.)
- i18n dictionary: per-locale dynamic chunks (initial locale inlined/preloaded; others load on
  switch); keep `getServerT` server-side. Verify the 259KB chunk is gone from the build output.
- Up & Down: one shared `useSharedSecond()` ticker + leaf `<TickDigits>` components so
  per-second re-render is digits only; memoize `lockClock` and the `usd()`/Intl strings (kill
  the per-tick `Intl.DateTimeFormat` at `updown-card:398`).
- Fonts: prune to Sora 600/700/800, Inter 400/600, JBM 400/600 (audit usage of dropped weights
  first).
- `admin-shell.tsx:119` — replace the persistent `blur(14px)` with an opaque bar (the player top
  bar's own fix, `globals:2476-2488`); add a `[data-motion=reduced]` branch that zeroes scrim
  blur and move inline `backdropFilter` styles to classes so the tier can reach them.
- `countdown-pill` interval churn; `probability-chart` `useMemo` on paths; memoize
  `I18nProvider` value (copy `ToastProvider`).
- audit page: DB-side pagination (transactions' count-first take/skip is the model); players
  page same.

Guards: `build` + compare chunk sizes; `qa:live` local; `test:refresh-cadence`.

### Stage 8 — DEAD CODE & DOC TRUTH (one deletion commit + one docs commit)

- Delete: the `.countdown-ring` block (`globals:1674-1702` + its reduced-motion refs) and
  correct DESIGN_AUTHORITY §B5's table row (0 usages) and line ~342's "visible delta" list; move
  the component's inline 0.5s onto the ladder while there.
- Delete `PriceChart` (keep `VolumeSparkline`, re-tokenised to `var(--aqua-300)`, moved or
  header corrected) — removes the last teal-215; shrink the design-frozen allowlist
  accordingly. Delete `BrandLoader`. Delete the ~78 dead classes (mterm/ticket/pool/comment/
  tpanel/check/pbar-label/num-roll/value-roll/odds-flash/streak/kp-switch/avatar-sm-md-lg/
  gilt-num/gilt-strong/gold-dot/aqua-focus/chip-politics/settling-bar/skel-fade-out/
  tab-indicator/countdown--urgent-critical/mat-flat/mat-raised-i + the `glyphs.tsx` shadowed
  percent/activity) — verify each has zero consumers before deleting; anything with a consumer
  gets FIXED not deleted.
- Stale-file deletions (verified safe): `docs/NEXT-SESSION-MATERIAL-VISIBLE.md` (fix
  `docs/README.md:140` + `design-system/README.md:65` same commit);
  `docs/ux-audit-2026-08/RUN-EVERYTHING-PROMPT.md`, `UPDOWN-STABILIZATION-PROMPT.md`,
  `SESSION-A-EDIT-SPECS.md`; `public/icons/favicon-16.png` + `favicon-32.png` (correct
  CLAUDE.md's favicon line same commit).
- Doc corrections (one line each): CLAUDE.md "zero rounded-2xl remaining" (false — or fix the 5
  sites and make it true: needle-drawer → `rounded-modal`, proposals-state-views ×4); CLAUDE.md
  "50 loading.tsx" → 76; CLAUDE.md "next-themes" line (not installed); CLAUDE.md glyphs "75+
  @1.85" → 178 @1.9; DESIGN_AUTHORITY §S3's "kit icon strokes 1.5px" parenthetical → 1.9; §0d
  gains the chat stylesheet row; `docs/README.md:45` MASTER-PLAN → RECORD, `:157`
  NIDA→IDENTITY-POLICY; `darkMode:"class"` removed from `tailwind.config`; `PageRibbon`'s stale
  consumer list.
- Unify the two 64-grid glyph weights (GL 1.9 vs G64 2.2 — pick 1.9, note badges' 2.2 as its own
  documented tier); fix `glyphs.tsx` mojibake comments.
- Add the three missing admin `loading.tsx` (staff, staff/[id], roles); fix the 2FA-setup
  loading cap (mirror the page's `max-w-form` shell); fix `transactions/loading` wrapper
  (`SkBody`); wrap `staff/[id]`'s table in `ScrollX`.

Guards: `test:design-frozen`, `test:design-one-door`, `test:keyframes`, `test:docs`,
`test:integrity`, `build`.

### Stage 9 — CONSOLIDATIONS (each = migrate to the named winner, DELETE the forks)

- Chip: one definition site — the React `Chip` consumes the CSS classes (or classes deleted);
  port the G-7 min-height/wrap fix to whichever survives; promote the market card's 9px override
  to a real `size="xs"`; migrate the 27 raw `.chip` call sites.
- Callout ×5: `payout-status-notice`, `proposals-state-views` banner + Unavailable, and the
  maintenance-amber tint → one `Callout` (mint the gold tone if brand isn't it);
  ComingSoon/Maintenance share one size dict.
- Stat: fold `resolution-panel` Row, `markets/[id]` KPI, wallet `SubStat` ×6, `updown-card`
  pairs, performance `Kpi` + shadow `Stat`, invite `Cap`/`Kpi`, `admin/payments` `Stat`/`Metric`
  onto `ui/stat.tsx` (add size/boxed variants); fix its overstated header.
- Money receipt-row: promote withdraw's variant (fee/net/divider) into a `ReceiptRow` used by
  deposit/withdraw/bet/sell confirms.
- `CountBadge` (99+ cap, one chrome) for bell/chat/admin sidebar/admin drawer; `Dot` primitive
  (tone, pulse w/ reduced-motion) replacing the 12 hand-rolled dots — `/live`'s masthead dot
  color per D6.
- `AuthPanel`/`PageHeader` on the 7 auth pages; the 6 loading files re-typing `PageHeader` import
  it instead.
- `IconPlate` atom (kills the 8 arbitrary radii); admin `AdminBody` + `KpiGrid` helpers (the
  42-file wrapper stack).
- Constants: `MAX_DOC_BYTES` one home (server exports, client imports); `report-money` imports
  `EAT_OFFSET_MS` from `eat-day`; `MAX_QUERY_LEN` one home.
- `PasswordInput`: `bg-inset` + error prop; `DateSelect`: `lg` size + validatable `required`
  (sr-only text input, not hidden); `PhoneInput` paste-offset fix + leading-digit pattern on the
  visible input; autofill override CSS block; search cancel-button suppression; `FormColumn` on
  the 5 unmeasured admin authoring forms; email `inputMode` fix; reset-password uses
  `PasswordPair`.
- Typography backbone: bridge `--type-*` into Tailwind `fontSize` under the ladder's names
  (freeze-note the legacy keys like the radius ruling); mint `--type-title` (28px); wire
  `PageHeader`/`AdminPageHead` to it; promote the eyebrow/microlabel to ONE primitive (size from
  `--type-label`, one tracking 0.14em, one weight) and migrate by family; strip tracking from all
  money (`wallet:74,162`, `performance:144`, `invite:91`) and delete `.gilt-num`; mono the four
  Sora-money surfaces (`withdraw:99` balance, `MoneyTile`, profile `Stat`, performance streak);
  wallet fine-print ≥12.5px on ramp ink; collapse `--text-secondary`/`tertiary` aliases; Firefox
  `scrollbar-color`; Up&Down gutters → house `px-3 lg:px-6`; unify the three board-grid gaps on
  one definition; `auth-shell` `max-w-6xl` → `max-w-auth`; `PageLoader` width prop → tier union;
  migrate the two receipt pages onto `PageContainer`.

Guards after EACH sub-batch: `test:all` relevant subset; visual 4-width pass on every touched
surface; full `test:all` before each push.

### Stage 10 — NEW GUARDS (make the decay impossible, then re-run everything)

1. `test:bridge` compile-probe (every written class emits) — shipped in Stage 2, extend to
   unknown families.
2. `test:type-scale` — ratchet on `text-[..]`/`tracking-[..]`/inline `fontSize`; mono-predicate
   on `formatTzs` elements; the 12.5px floor.
3. Numeric-size-utility lint (`h`/`w`/`min-h` ≥7 in tsx) as a `test:ui-consistency` rule (must
   catch `cn()` and template literals).
4. Stacking-contract test — effective root z-order of the named surfaces + "no non-portaled
   `position:fixed` inside route content"; fix the tailwind `z` ladder to state shipped truth
   (admin drawer BELOW modal tier) while there.
5. Dead-CSS ratchet (consumption sweep, allowlist may only shrink).
6. Tap-target gate that FAILS below 44 on player surfaces (current one warns below its own
   floor).
7. Motion gates read JSX `style={{animation}}`; keyframe registry stops mislabeling live
   keyframes dead.
8. `test:labels` extended into admin + runtime-value provider names.
9. `design-frozen`: per-property style-object scanning (closes the `var(--` line exemption),
   geometry props added, `.css` files included.

Each guard ships with a red proof (deliberately reintroduce the bug in a scratch copy, watch it
fail). Then: FULL `npm run test:all` + every `qa` suite that doesn't need prod creds + one
complete 4-width × 3-locale visual sweep of player surfaces + admin spot-check. Fix anything
found. Push.

### Stage 11 — OWNER-DECISION items (D1–D6 defaults unless Ali answered) + exit

Implement D1–D6 as decided. Then write the exit report INTO the STATUS BOARD: every stage →
commit hash → live-verified ✓; the list of default-applied decisions Ali can still veto;
anything deliberately deferred with reasons. Mark this prompt file SPENT. Final full `test:all`
+ `build` + push + live verification. You are done only when the board shows every stage DONE
and <https://50pick.tz> serves the last push cleanly.

## 5. Definition of done

`main` is green (`test:all`, `tsc`, `build`), every stage pushed and live-verified, no unpushed
work, no stage skipped without a written reason on the board, the new guards red-proven, and the
product visually verified at 360/768/1280/1920 in EN/SW/ZH on every surface touched.
