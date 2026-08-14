# Changelog (reconstructed)

## 2026-08-14 (design-system · filter-pill) — eight filter rails, one control, and the reference was breaking its own law

**New component: `FilterPill` + `FilterGroupKey`** (`src/components/ui/filter-pill.tsx`, spec at
`02-components/filter-pill/spec.md`). Extracted from the module-private `Chip` inside
`discovery-bar.tsx` and adopted by every player filter rail: `/markets`, `/results`,
`/proposals`, `/positions`, `/updown` (assets + durations), `/updown/history`,
`/profile/activity`, `/profile/account`.

**Measured in a browser against production before anything was touched** — four control heights
(**40 / 44 / 48 / 64px**), two radii (8px `rounded-md` on five rails against the pill's 999px),
an inline `style` at the call site on every diverging rail, and the defect that is not cosmetic:
**every diverging rail outlined EVERY control**, against COMPONENTS §3's *"only the selected chip
carries an outline"*. After: 999px, 44px, zero inline styles, zero unselected outlines, on 516
controls across 96 surface × width × locale combinations.

🔴 **The reference was breaking the law it set.** `discovery-bar.tsx`'s chip painted
`background: var(--pill-active)` + `boxShadow: var(--glow-selected)` **inline** — B9/B10 law 82 —
and the five rails told to match it had copied the habit. The extraction fixed it rather than
propagating it: the selected state is `.kp-fchip[data-on]` in `globals.css`, one definition site,
plus `.kp-fopt[data-on]` (fill, no halo) for a selected listbox row. ⛔ `test:design-frozen` was
green over all six the whole time — its rules are exempted by any line containing `var(--`, and
every one of those inline styles did.

🔴 **And a filter control was wearing the money ink.** `.pchart-range.is-active` (the market
detail chart's time-range) painted `var(--gilt)` on `var(--gold-fg)` — struck gold, which Q5
reserves for money that was *earned* — on a control that chooses a chart window. The discovery
bar had already made this exact call in as many words (*"NO GOLD — sort is view state"*). It is
`--pill-active` now. `test:gold-is-money` could not see it: that gate is scoped to two IDENTITY
surfaces on purpose, because money surfaces MUST use those tokens.

**Two accessibility fixes that came out of the measurement, not the brief.** `/updown`'s duration
tabs were **40px** and are 44. `.pchart-range` was **24.5px painted**; the first fix was batch 4's
`::after` overlay technique and it **measured 36px, not 40** — paint order handed the pixels back
to the chart wrapper below it — so the control is genuinely `min-height: var(--tap-min)` instead.
An invisible overlay whose reach depends on stacking cannot be told from a working one without
walking real pixels.

**`/updown/history` gained a filter it never had.** It had a `?day=` filter reachable only from the
daily digest's deep link, a chip that could report the active day and a link that could clear it —
and no control that could *choose* one. It now has a day rail derived from the player's own rounds
(`eatDayKey` over rows already in hand, zero extra I/O), each day carrying an honest round count.

**Guards:** `test:filter-language` (66 assertions incl. a vacuity control, wired into `predeploy`)
· `red:filter-language` (8/8, each defect on its own assertion, plus a case that proves the gate
refuses to pass over an EMPTY subject set) · `qa:filter-scan` (live geometry at 4 widths × 3
locales, frames, every menu opened, and the day rail's promise-vs-delivery).

## 2026-08-08 (design-system · celebration) — the struck seal replaces the gilt trophy; the celebration vocabulary gains its first consumer

**The win moment is the spec's §3 now, built in place** (`markets/win-celebration.tsx` — the
designer's offered React drop-ins never arrived; 11-material README open item 1 closes as
"built in-house from the spec"). The reeded gilt rim (`--gilt-reeding`, landed with its first
consumer, chroma ×1.2011 per E-124) around a guilloché royal-enamel face carrying the trademark
in **single-ink relief** — `FiftyMark variant="white"` from `brand-mark.ts`'s one geometry, with
a new `needleClassName` prop so `.needle-sweep` can ride the needle without a second drawing.
Choreography all on the ladder: `.seal-arrive` impress + recoil → `.seal-cascade`'s staggered
`.g-settle` copy → the rolling amount **strikes to `.gilt-ink`** as the count lands → the mark
flips once on its own axis (`.seal-mark-flip`, delay `--t-max + --t-stage`) → `.seal-band
.seal-sheen` closes the beat. Seal paint lives in `globals.css` (`.seal-rim/-spec/-enamel/-band`),
choreography offsets in `motion.css`; the component only composes classes (B10). Two deliberate
departures from the spec markup, recorded at the recipe: the enamel ring and guilloché carry the
royal tint, never pure white (M1's own text), and initial focus lands on the Continue CTA rather
than the demoted ✕.

**What died with it (INTAKE §3b):** the drawn trophy, the 12 rays, the corner brackets and the
`burst-medal-pop`/`burst-rays-in` keyframes + `.reward-burst__*` classes (state-tokens.css).
`RewardBurst` is remade as the calm NON-WIN earned-peak medallion (KYC verified, proposal-bonus)
on `.m-in-lift` + `.g-settle`, its amount in `.gilt-ink`; `OperationResultModal` lost its
never-called `celebrate`/`celebrateGlyph` props (M7 — a generic result modal must not be able to
wear the win vocabulary). "Won! · Congratulations" collapsed to one headline (`wonSub` deleted,
all three locales). `test:design-frozen` ratchet 45 → 44 (reward-burst's bracket literals died).

**Proof:** `npm run qa:seal` (new, wired) — 94/94 across 360/768/1280 × EN/SW/ZH + a
reduced-motion cell (amount snaps pre-struck, sheen rests at 0), and a REAL two-player
mock-bars settle: seal fired on the winner's mounted board at the realised payout to the
shilling (modal 1,740 = wallet-derived 1,740; fee 260 under the ⅓ ceiling), loser got the
factual receipt and exactly −stake. Shots in `.qa-design/seal/` (gitignored, re-shootable).

## 2026-08-06 (design-system · merge) — §A: the lamp is installed, and the card's lit edge stops being a line

The material merge, atom by atom. One token change per commit, each with its gates, its
production drive and its image opened. This entry grows as the atoms land.

**ATOM 5 — 2c-a: the button family stops being lit from its own top edge, and M1 gets a ratchet.**

- **Ten one-sided lights die.** `.btn-yes` `.btn-no` `.btn-danger` `.btn-gold` and each hover went
  from `inset 0 1px 0` — a line on the TOP EDGE ONLY — to `inset 0 0 0 1px`. Same colour, same
  alpha, same 1px, all four sides. M1: *"never a one-sided line; the direction of the light lives
  in the WASH."* A top-only highlight puts direction in the edge, the one place the law forbids.
- ⭐ **And the two BEVEL PAIRS the sweep's own list never had.** `.btn-primary` and `.btn-claret`
  each carried a top light *and* a bottom shade, both fully opaque — two one-sided lines, not one.
  ⛔ The bottom shade is NOT covered by `--edge-shade`: that exception is granted to sunken WELLS
  ("inset wells only") and a raised control is not a well. ⭐ These two can afford to lose the
  bevel precisely because they HAVE a wash — their gradients already carry the direction, which is
  exactly what M1 asks for. The ring takes **32%** alpha, the delivery's own tinted-edge strength
  (`.mat-edge-*` = 32% of the hue); at full opacity an even ring is a hard outline, not a lit edge.
- ⛔ **The flat fills stay flat.** Giving YES/NO/danger/gold a wash to carry direction would invent
  system the delivery does not specify, and M2 is explicit that flat is a rung, not a failure.
- ⭐ **New ratchet: `npm run test:m1-light`, with `red:m1-light` 4/4.** The rule is geometry —
  *an inset that carries light is compliant iff its x and y offsets are both zero* — with a pending
  list that names the atom each unconverted site belongs to and that may only shrink. The sweep is
  finished when it prints `one-sided LAMPS still to convert: 0`.
- 🔴 **The gate's first version failed three correct designs, and the second waved two real ones
  through.** v1 judged every offset inset a lamp and condemned `.cm-composer`'s dark inner shadow
  (a sunken well M1 blesses) and `.admin-tbl`'s `inset 3px 0 0` (a structural accent rail, not
  illumination). v2 added a lightness test with the ceiling at 45 — which then waved through
  `.cm-bubble`'s `inset 0 1px 0 oklch(35% …)`, **on a bubble whose own background starts at 24%**.
  ⭐ *"Dark" is relative to the surface*: an absolute ceiling only works below the darkest surface
  in the system (`--bg-inset` 11%, `--bg` 13.5%), so it is **15**, and the file says the rule
  becomes wrong the day a light theme exists. ⛔ An unreadable lightness counts as a LAMP — a gate
  that waves through what it could not parse is not a gate, and there is a RED case for exactly it.

**ATOM 4 — a surface rises toward the lamp; it does not re-light itself (E-120; E-121 filed).**

- 🔴 **Every solid button lost contrast the moment a pointer touched it.** `.btn-yes`/`.btn-no`
  carried `filter: brightness(1.07)` and `.btn-danger`/`.btn-primary`/`.btn-claret` 1.08, under a
  `--pearl-50` label at `oklch(99%)` — already a whisker from clipping. So the fill rises and the
  ink cannot. Measured on the production raster: `.btn-yes` **4.74 → 4.36**, `.btn-danger`
  **4.85 → 4.37**, both under the floor; `.btn-no` survived at 4.59 by luck of its albedo.
- ⭐ **The remedy is M1, not arithmetic.** In the one-lamp model a hover makes a surface **rise
  toward the light** — `translateY(--m-lift)` plus the coloured cast every one of these rules
  already carries. A `filter: brightness()` is a surface re-lighting *itself*, which that model
  does not have. The gain drops to **1.03**, leaving the lift and the cast to do the work.
- **One token, `--btn-hover-gain`, replacing five literals.** ⭐ The token is the point rather
  than the number: a per-rule literal can only be wrong one button at a time — and can only be
  FIXED one button at a time, which is how three of five drifted under the floor with nobody
  choosing it. One RED mutation (`1.03 → 1.20`) now breaks all four at once.
- ⛔ **The alternative was rejected on evidence, not on taste.** Darkening the fills clears AA at
  one point of lightness (`.btn-yes` 53→52 → hover 4.535) but leaves **0.035** of headroom, moves
  two *semantic* colours (YES/NO are the product's money vocabulary), and one of them is
  `--danger-500`, a **shared** token with consumers beyond the button.
- **Result:** `.btn-yes` 4.64 · `.btn-danger` 4.75 · `.btn-no` 4.91 · `.btn-primary` 5.25 ·
  `.btn-gold` 7.57 (its ink is dark, so brightness helps it). `test:contrast` 30 → **34** checks,
  `red:contrast` **17/17**, tsc 0, build exit 0.
- 🔴 **E-121 filed while sizing this, and it is the same defect one file over.** `.cm-send` (the
  support chat's send button) swaps its fill to a *lighter* `--brand-400` on hover, taking its
  white glyph from **3.58 to 2.55** against WCAG 1.4.11's **3.0** floor for a graphical control.
  ⛔ Not fixed here: different stylesheet, different token vocabulary, and `contrast-audit.mts`
  reads `globals.css` only. ✅ Its neighbour `.cm-escalate` measured 5.34 / 5.35 and is fine.

**ATOM 4, validated (INTAKE §4a) — `54f80d8c`, deployed and re-measured on the raster.**

- **Technical.** `test:contrast` 34 checks / 0 failures · `red:contrast` **17/17** · tsc 0 ·
  build exit 0 · tokens 48 · design-frozen 45 · ui-consistency baseline · motion-ladder 0 ·
  trilingual 36 · integrity OK · tracker-hygiene 16/0.
- **Production, after deploy: 24/24 button states PASS.** `.btn-yes` hover 4.36 → **4.64**,
  `.btn-danger` 4.37 → **4.74**, `.btn-no` 4.59 → **4.92**, `.btn-primary` 4.20 → **5.55**,
  `.btn-gold` → 7.54. The modelled figures agree with the raster to **±0.01** on every button,
  which is what licenses the gate to speak for a state it cannot photograph.
- ⭐ **Hover states photographed for the first time.** `SHOT_DIR=… node
  scripts/live-button-contrast.mjs` now keeps the frame at 4×; nothing else in the repo can shoot
  a hover, because it needs a pointer held on the element while the shutter fires.
- ⚠️ **And that shooting mode shipped a false-failure bug of its own, caught by disbelieving the
  number.** The geometry is in CSS pixels and the raster is in DEVICE pixels, so at
  `deviceScaleFactor 4` every sample landed a quarter of the way in: `worst` came off the rounded
  **border** and the run condemned `.btn-claret` at **2.73** on a control that measures 7.05.
  ⛔ A false failure is not a safe failure — it condemns something correct. The scale is now
  derived from the image the browser returned, never assumed from the context, and both scales
  are cross-checked against each other.
- ⛔ **Recorded because it changes the next atom: the handoff's "16 one-sided lights" was a
  partial grep.** Re-grepped after ATOM 3 shifted the line numbers, the real inventory is **23
  sites across 2 files** — the old list missed the toast at `globals.css:1336`, four of the six
  chat sites, and the two bevel PAIRS on `.btn-primary` and `.btn-claret`. It is split into three
  atoms so each visual diff stays attributable.

**ATOM 3 — the primary CTA's white label stops being 4:1 on its own light, and contrast
gains a third instrument (E-119; E-120 filed).**

- **`.btn-primary` was the one solid-family button painted with a RAMP, and that put it in
  the gap between both contrast instruments.** `linear-gradient(180deg, oklch(60%…),
  oklch(48%…))` under a `--pearl-50` label: the token gate could only express a flat fill,
  and the DOM sweep read a gradient-painted element as transparent (until E-118) and scored
  the label against the page canvas behind the button. **Green in both, 4.0:1 in fact**, on
  the two highest-intent controls in the product — `Sign up` and `Show all open markets`.
- ⭐ **Measured, not modelled — and the raster said the size matters.** A `180deg` ramp is
  invariant in x, so the fill at the LABEL BOX's top row is the background behind the tallest
  ascender. That is **size-dependent**: **4.62** under the 56px hero CTA and **4.39** under
  the 30px header pill, from one gradient. ⛔ Shooting only the hero would have photographed
  the passing half and closed the atom on it.
- **The light stop goes 60% → 53%** — worst stop **5.40** at rest, **4.85** on hover.
  ⭐ **The 5-point spread that leaves is the delivery's own law, not a compromise:**
  `material.css` §A1 sets `--wash-float` at 26.5%→21% and says the spread is *"deliberately
  small: material, not decoration"*. The 12-point ramp was the decoration. The bevel pair and
  the border are untouched — an edge pass on the control family has not happened yet, and
  E-119 is a contrast atom.
- **`contrast-audit.mts` gains a gradient parser, and `worstStop()` CHOOSES the stop** — the
  light one under pale ink, the dark one under dark ink. `.chip-resolved` stops naming
  `--gold-500` by hand: that pick was right, and it would have gone on pointing at gold-500
  through **ATOM 2b's** re-derivation of the whole ramp with nothing to notice.
- ⭐ **A `filter:` is a RASTER effect, so a hover state had never been scored by anything.**
  `getComputedStyle` returns the authored colour, so both colour-reading instruments are
  constitutionally blind to it. The gate now models `brightness`/`saturate` in gamma-encoded
  sRGB and **refuses any filter function it does not implement** rather than rounding it to
  1.0 — and the model is validated against real pixels on production, agreeing to within
  **0.01** on all five solid buttons.
- **New instrument: `npm run qa:button-contrast`** (`scripts/live-button-contrast.mjs`). It
  puts a real pointer on a real button on production and reads the pixels back; the ink comes
  from a solid `currentColor` swatch, never from a glyph (subpixel antialiasing tinted a
  pearl-white sample `rgb(209,252,255)` — 0.3 of a point, in the flattering direction). It
  refuses to report unless its fixture computes to the same `background-image` as the page's
  own button.
- 🔴 **It found E-120 on its first run: hover makes three of the five buttons LESS legible.**
  The fill lightens while an `oklch(99%)` label is already clipped, so `.btn-yes` falls
  4.74 → **4.36** and `.btn-danger` 4.85 → **4.37**. Filed, not fixed here: two are semantic
  fills and the third is `--danger-500`, a shared token, and ATOM **2c** rewrites every one of
  those hover rules for M1 — one visual pass, not two.
- **Gates:** `test:contrast` 26 → **30** checks, 0 failures · `red:contrast` **14/14**,
  including *restore the 60% stop → FAIL 4.01* · tsc 0 · build exit 0 · `test:tokens` 48 ·
  `test:design-frozen` 45 (it walks `.tsx` only, so no CSS atom can move it) ·
  `test:ui-consistency` baseline · `test:motion-ladder` 0 · `test:trilingual` 36 ·
  `test:integrity` OK · **24 shots** at deviceScaleFactor 4, both button sizes ×
  360/768/1280/1920 × en/sw/zh.

**ATOM 3, validated on all four axes (INTAKE §4a) — `44290cf8`, deployed and re-measured on
production, not asserted from the diff.**

1. **Technical.** `test:contrast` 30 checks / 0 failures · `red:contrast` **14/14**, and the
   falsifiable one is the point: restoring the 60% stop prints `FAIL btn-primary label (pearl on
   royal ramp, worst stop) → 4.01`, the exact number this was filed at. tsc 0 · build exit 0 ·
   tokens 48 · design-frozen 45 · ui-consistency baseline · motion-ladder 0 · trilingual 36 ·
   integrity OK · tracker-hygiene 15/0.
2. **Visual.** 24 images opened at deviceScaleFactor 4, before and after. The CTA reads as a
   deeper, more solid royal; the top bevel still carries the light; no truncation or clipping in
   any cell, including 360/SW (`Jisajili`) and 360/ZH (`创建账户`).
3. **Consistency with the handover.** The 5-point spread is `material.css` §A1's own rule
   (*"deliberately small: material, not decoration"*, `--wash-float` 26.5%→21%), and M1's
   direction-of-light stays in the wash. ⛔ The bevel pair and border were deliberately NOT
   re-cut — that is the control-family edge pass, and smuggling it into a contrast atom is the
   thing INTAKE §7 warns about.
4. **Responsiveness.** 360 · 768 · 1280 · 1920 × EN · SW · ZH, **at both button sizes**, because
   the size is what decides where on the ramp the glyphs sit.

**Production, after deploy:** the live rule serves `linear-gradient(#3c5cdd, #304ccc)` where it
served the 60% stop. Raster: `btn-sm` **4.39 → 5.65** at rest and **3.92 → 5.01** on hover;
`btn-xl` **4.62 → 5.75** and **4.20 → 5.16**. `qa:contrast-rendered` over `/` + `/markets` at
1280: **427 text nodes, cells 2/2, 0 AA failures** — it reported 3 before.

**ATOM 2 — one lamp, five rungs (`src/app/globals.css`).**

- **`--shadow-card-top` was a one-sided line, and M1 bans exactly that.** It read
  `inset 0 1px 0` — a highlight on the TOP EDGE ONLY — and it is the lit edge under every
  market card and Up & Down card in the product. M1 is explicit that a lit surface catches an
  **even** ring and never a one-sided line, because the direction of the light belongs in the
  **wash**, not in an edge; a one-sided highlight is a drawn *suggestion* of light rather than
  light. Now `var(--edge-lit)`: same 1px, same job, all four sides, and a 4% royal tint instead
  of near-white so it does not read chalky on OLED.
- ⛔ **It was edited AT ITS LINE and never re-declared**, and that is not tidiness. The browser
  takes the **last** declaration; `scripts/contrast-audit.mts` takes the **first**
  (`CSS.match()`). A second copy higher up would have left the product on the old value while
  every gate scored the new one — and `test:tokens` could not have caught it, because its rule
  compares *files* and both copies would be in `globals.css`. Written into `INTAKE.md` §2a as a
  standing rule, since exactly one other token in this delivery has the same shape (`--bg`).
- **The rest of §A is inert by construction and that is the point.** `--light-angle`, the three
  edges, the four washes and the six elevation rungs land with **zero consumers** — proven by
  grep, not asserted — so the entire visible diff of this commit is attributable to one token.
- ⭐ **The rungs are not a second ladder.** `--elev-raised`'s two cast layers are byte-identical
  to the shipped `--shadow-card`; `--elev-modal` and `--elev-float` carry `--shadow-modal`'s and
  `--shadow-overlay`'s casts verbatim. At every rung the only change is that a one-sided
  highlight becomes an even one.
- ⚠️ **Recorded in the token block: the washes can never be delivered by redefining
  `--bg-elevated`.** That token is consumed as a *colour* — inside `color-mix()` at five sites
  and as Tailwind alpha across a dozen components — so a gradient there makes `color-mix()`
  invalid and those declarations drop **silently, with no build error**. The wash arrives as a
  class per surface, which is what M2 says anyway.

**The instrument — `scripts/live-material-probe.mjs`, and the bug it found in itself first.**

The sweep answers "does this screen overflow or clip". It cannot answer the only question this
merge asks: *is there light on that surface, and is it the right light.* A 1px ring at 5.5%
alpha is invisible in a 360-wide screenshot — you can photograph a completely unlit card and see
nothing wrong. So the probe shoots at **deviceScaleFactor 4 and crops the corner**, where a 1px
edge is four device pixels and a person can judge it, and it prints the shadow **geometry** with
every colour stripped, so "even ring" versus "top-only line" is a string comparison and not an
opinion.

🔴 **And its first run reported M1 compliance on the exact surface the merge exists to fix.** The
matchers were written as the CSS is *authored* — `inset 0px 0px 0px 1px` — and Chrome's computed
value serialises the colour first and `inset` **last**, so neither pattern could ever match. It
printed *"top-only line present: no"* over a production card whose shadow plainly read
`0px 1px 0px 0px inset`. Fixed, then **proven RED against production before being trusted**: on
the pre-merge state it now reports `even 1px ring: no · one-sided line: YES ⛔ M1 violation`.
That is SKILL §5b again — assert the value the platform hands back, not the symbol you wrote —
and it is the third time this campaign has found more bugs in a check than in the product.

🔴 **And its second bug was worse, because it manufactured product defects.** The first version
opened a fresh browser context per cell and signed in each time — **24 logins as one fleet account
against production inside a few minutes**. Eight failed, and one failure text read
`跳到主要内容 50pick .tz 市场 涨跌 直播 结果` — the signed-**IN** navigation. The sign-in had
worked and the harness said it had not. It now logs in **once per locale** and changes width by
resizing the viewport, which keeps the session and keeps `deviceScaleFactor` (fixed at context
creation). ⛔ And on a sign-in failure it refuses **every width for that locale** rather than
shooting a logged-out page, because an unauthenticated screenshot looks exactly like evidence.

**ATOM 2e — the rendered sweep stops passing over nothing, and stops reading paint as transparent
(`scripts/contrast-rendered.mjs`, `scripts/contrast-rendered-red.mjs`). E-118, and E-119 underneath it.**

Found by cross-checking ATOM 2d's new gold pairs against the page that actually paints them.

- 🔴 **`PASS — no AA contrast failures` over ZERO measured text nodes, exit 0.** Reproducible: from
  Git Bash, MSYS rewrites `ONLY=/results` into `C:/Program Files/Git/results`, all four routes
  SKIP, and the sweep reports success. ⛔ A check that would still pass if every surface it names
  had been deleted is not a check. **Coverage is part of the verdict now** — zero nodes, or any
  cell that failed to load, exits **2 · INCONCLUSIVE**, deliberately distinct from an AA failure's
  exit 1, because "we found nothing wrong" and "we did not look" are different sentences.
- 🔴 **A gradient is paint, and `background-color` cannot see it.** An element painted with
  `background-image: linear-gradient(…)` reports `background-color: rgba(0, 0, 0, 0)`, so the
  ancestor walk stepped straight past it and scored the text against whatever sat *behind* the
  element. `.chip-resolved` — a gold pill with dark ink — came back at **1.08:1** against the page
  canvas, eleven times, on production. **Now a gradient contributes its colour stops as candidate
  backgrounds and the node is scored against the WORST of them**, which is the same rule the token
  gate applies to that chip. A background that genuinely cannot be decomposed is reported
  **unmeasurable** and is neither scored nor counted as a pass.
- ⭐ **THE DIRECTION OF THAT LIE WAS NEVER FIXED, AND THE OTHER DIRECTION WAS LIVE.** Here it
  manufactured a failure; on light text over a light gradient the identical bug **hides** one. The
  RED fixture for that case is the reason it was caught: **`.btn-primary`'s white label scores
  4.0:1 against its own gradient's light stop** and had been reported at ~18:1 against the page
  canvas behind the button. That is **E-119**, on *"Sign up"* and *"Show all open markets"*, and it
  is the next atom. ⚠️ The token gate could not have caught it either — `.btn-primary` is the one
  solid-family button that is a **gradient**, so it is neither a `token()` nor a plain `var()`.
  **Both instruments were blind to the same button for two different reasons.**
- **RED 5/5 against a fixture server the harness starts itself** — neither defect is reproducible
  on demand against production without breaking the live site. ⚠️ **And its first version was
  broken in a way that made two of its five checks pass for the wrong reason:** it drove the sweep
  with **`execFileSync`, which blocks the event loop of the process serving the fixtures**, so
  every `goto` timed out — and a page that never loads reports *zero nodes, exit 2*, which is
  byte-identical to *a page that loaded and was empty*. The check and the failure it was aimed at
  had the same signature. Every check now asserts `cells measured: N/N` before anything else.
- **And a SKIP says why now.** `did not load` with no cause is what sent this session hunting a
  network fault that was a mangled argument.

**ATOM 2d — the contrast gate stops mirroring, and gold is measured for the first time
(`scripts/contrast-audit.mts`, `scripts/contrast-audit-red.mjs`). E-117.**

This atom lands **before** the M1 sweep on purpose: (2c) changes button fills and the gold
re-derivation (2b) moves the whole ramp, and a gate added *after* the change it is meant to judge
has no before-reading.

- 🔴 **The 2026-07-29 repair was only half done, and the surviving half had drifted.** That commit
  moved the token inputs into a parser and wrote a header explaining why hand-mirrored values
  cannot be trusted — while leaving **five** of them hand-typed: `pearl50`, `danger500`, `text`,
  `btnYesBg`, `btnNoBg`. `text` was typed `0.97 / 0.010` against a real
  `oklch(98% 0.012 268)` (`globals.css:260`). ⭐ **`--text on --bg` is the most-rendered pair in
  the product, and it was being scored against ink the product does not paint.** The reading moves
  **17.96 → 18.47** — which is the falsifiable proof the atom did something, and also the measure
  of how invisible this class of drift is: it was never going to fail a gate, it was going to
  quietly answer the wrong question forever.
- ⭐ **The lesson is about partial repairs, not about mirrors.** The 2026-07-29 note was *correct*;
  it simply did not finish, and nothing recorded which half was done. A partial repair leaves the
  identical defect with a smaller surface and a header that reads as if it were closed.
- **The four button FILLS are parsed now, out of their rule blocks.** They were the reason the
  mirror survived: `.btn-yes` / `.btn-no` declare literal `oklch()` **inside the rule**
  (`globals.css:715/727`), not in `:root`, so `token()` could not reach them. `ruleValue()` reads
  a declaration out of a named rule and follows a plain `var(--x)` to its definition, which also
  covers `.btn-danger`'s `var(--danger-500)` and `.btn-gold`'s `var(--gold-500)`.
- ⛔ **A control whose fill stops being scoreable now STOPS the gate.** If someone writes
  `background: color-mix(…)` on `.btn-gold`, the parser refuses rather than skipping it — a
  silently-skipped control is a green tick over a label nobody measured.
- ⛔ **`token()` now fails on a SECOND declaration site — this is INTAKE §2a, installed as
  enforcement rather than as a warning.** The browser takes the **last** declaration and this
  parser takes the **first**, so a token re-declared at the top of `:root` leaves the product on
  the old value while every ratio here prints the new one, and `test:tokens` cannot catch it
  because its cross-file rule compares *files*. ⭐ **That is the exact trap ATOM 2a walks into
  next** (`--bg` at `globals.css:244`), and it is now caught by the gate rather than by memory.
- **Gold is checked for the first time — 8 new pairs, 18 → 26 checks.** `--gilt` is money ink
  (`.gilt-num` colours amounts, and M4 says money is *read*, so it takes the 4.5 floor), on `--bg`,
  `--bg-elevated` and `--panel`; `--gilt-strong` on two; `.btn-gold`'s own label on its own fill
  (7.19); `.chip-resolved`'s label on the **dark** stop of its ramp (6.54 — scoring the light stop
  would have flattered it by ~2 points); `--gold-300` on the canvas. All pass today, which is the
  baseline 2b has to hold.
- **RED 10/10 (`npm run red:contrast`)** — every mutation breaks a colour the product actually
  paints. ⛔ **It does not rewrite `globals.css`**: two sessions share this tree and the house
  mutate-then-restore pattern opens a window in which the other session's build reads a
  deliberately-broken stylesheet. Each mutation is written to a copy and the gate is aimed at it
  with `CONTRAST_CSS` — and the gate **prints the path it read on every run**, so re-aiming it can
  never be silent.
- ⚠️ **Two of my own checks were wrong before either was trusted.** The RED harness's "did it
  refuse?" matcher was `/contrast-audit: .+/`, which matched the **source echo** `tsx` prints above
  a stack trace — the un-interpolated template literal `--${name} is not declared in ${GLOBALS}`,
  read straight out of the file. It scored a catch off text it had *read* rather than an error the
  gate had *thrown*. And the gate printed the file it was reading **after** building its token
  table, so on precisely the runs where a parse failed, the path never printed. Both were visible
  only by reading the output; the exit codes were what they should have been.

**ATOM 2, validated on all four axes (INTAKE §4a).**

- **Technical** — `tsc` 0 · `build` exit 0 · `test:tokens` (48 guarded) · `test:contrast` 0
  failures · `test:design-frozen` 45 (unchanged, correctly — it walks `.tsx` only) ·
  `test:motion-ladder` 0. Plus the three falsifiable checks: **one** definition of
  `--shadow-card-top` and one consumer · **zero** consumers of any new token, so the atom is
  inert as claimed · `--bg` still reads 13.5% and did not leak in from §A.
- **Consistency with the handover** — M1 checked literally, not impressionistically: the ring is
  **even** (`0 0 0 1px`), **1px**, **royal-tinted** (chroma 0.04 at hue 268, not `oklch(100% 0 0)`),
  the wash angle resolves to **166deg** on the live page, and **all ten** elevation cast layers
  have an x-offset of exactly `0` — *"the tilt lives in the light, never in the gravity"*.
  ⚠️ The first version of that axis check printed `1px 2px` and was reading **y and blur**, not
  x and y: the bare leading `0` carries no unit, so the pattern skipped it and the check would
  have passed over a skewed shadow. Re-written to read the offset it names.
- **Visual + responsive** — **16 of 24 cells captured, and 16/16 show the even ring with 0
  retaining the one-sided line.** The market card is covered at 360 · 768 · 1280 · 1920 × EN · SW ·
  ZH (11 of 12; the twelfth was the login contention above, not a rendering failure). At 4× the
  before/after is unambiguous: light on the **top edge only** becomes light around the **whole
  perimeter and every corner**.
- 🔎 **One observation filed, not fixed here:** a green circular element is clipped at the market
  card's right edge in the cold-start state, **identically in all three locales**. ⛔ Not caused
  by this atom — a `box-shadow` cannot move layout — and it is not scored as a defect until it is
  measured against **its own** container rather than the card's (§0.1b). It belongs to the card
  atom.

## 2026-08-06 (design-system · acceptance) — the material system is ACCEPTED, and the map that came with it was wrong

Claude Design's material commission landed at `11-material/` on 2026-08-06. **Nothing was merged
in this entry — this is the acceptance pass**, run against `design-brief/INTAKE.md` §1 before a
single file moved, which is the whole reason §1 exists.

- **Accepted, with one item going back.** Every animation names a `--t-*` duration and a `--m-*`
  easing, nothing animates a layout property, no hex, no dependency, no prop change, and the
  "how to extend this" note arrived as `EXTEND.md` M1–M8. ⭐ **The D-6.6 test — apply the system
  to a component the designer never saw, from the written rules alone — was run against
  `ui/callout.tsx` and it forced a guess.** M2 answers the *surface* cleanly (a callout is
  content-plane furniture, so rung 0, and M2 blesses flat), but the delivered tint utilities are
  welded to rung 4: `.mat-edge-warn` is `inset ring + var(--elev-toast)`, and its own comment
  names *"toasts / callouts"*. **There is no rung-independent tint recipe, so a tinted-but-flat
  surface cannot be expressed.** One rule fixes it in-house; it is the one thing to send back.
- ⭐ **The elevation ladder is not a second ladder — it is ours, repaired.** `--elev-raised`'s
  cast is **byte-identical** to the shipped `--shadow-card`; `--elev-modal` and `--elev-float`
  likewise contain `--shadow-modal`'s and `--shadow-overlay`'s casts verbatim. At every rung the
  only delta is that the one-sided `inset 0 1px 0` highlight becomes an **even** ring — which is
  M1 ("never a one-sided line, never pure white") enforced against our own file, where
  `inset 0 1px 0` appears **15 times** and two of those are pure white.
- 🔴 **The delivered merge map named three files that do not exist.** It sends the sections to
  `src/app/law/{tokens,keyframes,motion}.css`. There is no `src/app/law/`; `law/` is how the
  *outbound brief* was split, and those files sat in the **gitignored** `design-brief/law/`
  (⚠️ that folder was **deleted 2026-08-11** — archived to `F:\50pick-design-archive\`). The
  real destinations are `globals.css` (tokens **and** keyframes) and `motion.css` (utilities) —
  which `INTAKE.md` §2 had right all along. ⛔ The brief's own `law/keyframes.css` extract is
  **brace-unbalanced**: the extractor dropped an opening `@media (prefers-reduced-motion: reduce) {`,
  so its calm branches sit at top level and would kill press/vote/streak/seal motion if it were
  ever wired in. Corrected in the merge map, with the reason, so the next session does not
  rediscover it.
- ✅ **Open item 4 closed: `--shadow-card-top` already exists** (`globals.css:398`, bridged at
  `tailwind.config.ts:218`). The delivery's alias is not merely redundant — `--shadow-*` is a
  **guarded** family, so a second definition site is a hard `test:tokens` failure. The extract we
  sent out was lossy and simply stopped before that line. The token keeps its name and its one
  definition site and will take the even ring as its **value**.
- ✅ **Open item 5 closed: D-0's celebration-amount row now reads `--font-mono`.** It had said
  `--font-display` while the ⛔ line printed directly beneath it said money is *always* mono.
  M4 wins, and not on taste: Sora has no tabular figures, so a rolling count-up in display type
  reflows as its digits change. The headline keeps Sora; the amount does not.
- ⚠️ **Open item 8 — this row said the crest chief band ships at `0.26`, and it never did.**
  Recorded here as the designer's recommendation (demoed at 0.16 / 0.26 / 0.38), left "open"
  in `DESIGN_AUTHORITY.md`, and **rendering at `0.16`** the whole time
  (`identity-avatar.tsx:123`, `opacity="0.16"`). Three documents, three answers, one
  observable truth. **Corrected 2026-08-10 (session 38): the shipped value `0.16` is the
  declared value**, and the decision is closed in `DESIGN_AUTHORITY.md` rather than here —
  ⛔ a *record* file recording a decision is how the three-way split happened. ⛔ E-111's
  sub-pixel geometry is not re-opened.
- 🔴 **E-116 — the audit that would have condemned a correct merge.** `ui-material-audit.mjs`
  scores each component by word-grepping *its own `.tsx` source*, so it cannot see material that
  lives in a CSS class: `markets/market-card.tsx` is scored all-three-absent at the top of
  `AUDIT.txt` while `.mcardp` already carries a cast, a lit edge, a border and a draw-in. Because
  B9/B10 *require* material to live in the law layer, **a correct merge drives those numbers flat
  or backwards** — and `INTAKE.md` §3b told the next session to read that as proof the
  integration had failed. The instrument is left **byte-identical** (changing it would measure
  the before and the after with two different rulers); a `--resolve` mode will score the CSS a
  class actually applies, and the honest scoreboard is `test:design-frozen`'s 45, which **fails
  if a listed file becomes clean** and so cannot be left unmoved by accident.
- 🔴 **E-114 and E-115 filed** — two live defects the acceptance reading surfaced, both on result
  screens: the VOID/refund toast paints a confirmation tick over a returned stake (`default`,
  three lines from the loss toast that was moved to `factual` for exactly that reason), and the
  long-form win celebration headlines a place-time projection and infers the win from the round
  outcome rather than reading the position row.
- **Provenance repair.** `spec/spec.html` linked `deliverable/material.css`; our own
  reorganisation (`faf386a4`) moved the file and left the link, so **from that commit until this
  one the live spec page rendered with every `.mat-*`, `.gilt-*` and `.g-*` class inert** — the
  page whose job is to demo the material system was demoing none of it. Repaired to the path it
  always meant, with a note that it must be repointed at a frozen copy once `material.css` is
  consumed, because the spec must keep rendering the *delivery* and never the current app.

## 2026-07-29 (repo · foundation) — the design system is FROZEN (v2 final)
New law **B9/B10** (`06-patterns-and-rules/MERGE-DISCIPLINE.md`, RULES 15/16): one design
system; new design merges *into* it, never beside it; every visual primitive is decided once
and components only consume. What this pass actually found and closed:

- **Seven drop-shadows for one job.** The Modal, avatar-menu, notifications-panel,
  needle-drawer, date-select, nav-more and the market-card popover each typed their own
  floating-surface shadow — several as neutral `rgba(0,0,0,…)`, which on an indigo canvas reads
  grey and dead. That is why they never quite matched. Now **`--shadow-modal`** (centred dialog,
  owns the screen), **`--shadow-overlay`** (menus/popovers — deliberately shallower: attached to
  a trigger, not a scrim) and **`--shadow-overlay-up`** (bottom-docked sheet; a downward cast
  throws the shadow off-screen). Plus `--shadow-card-top` (the 1px lit edge, previously retyped
  at ~8 sites) and `--glow-selected` (was two hues, two intensities, one meaning).
- **`--shadow-card` / `--shadow-royal` were never bridged.** They existed as CSS vars from the
  start, so `shadow-card` was a dead class (B8) and every consumer wrote
  `shadow-[var(--shadow-card)]` to get it at all. Bridged.
- **The TippingBar ignored its own tokens.** `--bar-track`, `--bar-track-border` and
  `--bar-needle` had been in `globals.css` for this component since the beginning, and
  `brand.tsx` used **none** of them — it re-typed the identical values inline, across 21 style
  objects plus a `<style>` tag carrying two `@keyframes` (a stylesheet inside a component, which
  law 15 rule 3 forbids by name). The tokens were the dead half of a split truth: editing them
  changed nothing on screen. The bar is now a `.tipbar-*` family, and its motion joins the one
  language — `--m-pivot` at `--t-stage`, replacing a hand-typed `cubic-bezier(.34,1.56,.64,1)`
  at 540ms, i.e. a curve the kit had already named and a duration off its scale.
- **The last bespoke player popup.** market-card's "how it works" was a raw `createPortal` with
  its own scrim, shadow, rise animation and hand-computed position — and therefore no focus trap,
  no focus return, and none of the Android scroll/zoom lock every other dialog gets. It now goes
  through `Modal`. *Visible change: it presents as the standard centred dialog rather than a
  card-anchored bubble.* Its trigger's two `onMouseEnter`/`onMouseLeave` handlers, which re-typed
  four colours in JS to fake `:hover`, are now `.mcardp-info`.
- **Semantic radii** `rounded-card/control/chip/modal` → `var(--r-*)`. ⚠️ The numeric scale
  (`rounded-md` 8px) still disagrees with `--r-md` (12px); reconciling it would shift every corner
  in the product, so Ali deferred it. Frozen as legacy — **do not renumber it.**
- **Three dead recipes deleted** from `state-tokens.css`: `.is-interactive`, `.spark-draw`,
  `.btn-spin` (+ `--spin-duration` and their reduced-motion overrides). POLISH-BACKLOG §1.3 asked
  for an audit of these as suspected duplicates of `micro-patterns.css`; that file is long gone,
  but the audit found something worse — **zero consumers anywhere**, and `.is-interactive` was a
  *third* motion vocabulary beside `--m-*`/`--t-*`. Dead CSS that looks canonical is exactly what
  gets copied by accident.

**New guard: `npm run test:design-frozen`** (in `predeploy`). Fails on any new raw colour, inline
`boxShadow`/`border`/`borderRadius`, arbitrary `shadow-[…]`/`rounded-[…]`, or hand-rolled
`createPortal`, outside a **ratchet allowlist that may only shrink** (45 files / 244 lines as
measured today; brand marks are exempt by B1, Satori OG routes cannot read CSS vars at all). It
also fails on a *stale* exemption, so cleaning a file forces the list to tighten. Verified to fail
on a reintroduced violation and pass on the fix.
Why the existing gates could not see this class of bug: `test:tokens` guards token *definitions*,
not components that ignore them; `test:bridge` guards that a *class* resolves, and an inline style
has no class; `tsc` and `build` see a valid string either way.
`test:bridge` also gained a real fix — it was resolving `shadow-*` against the **colour** map
instead of `boxShadow`, so `shadow-overlay` passed only by colliding with a key in the `bg` family
while correctly-bridged rungs were reported dead.

## 2026-07-28 (repo · foundation) — Phase 3.4: the motion layer is ADOPTED, not just present
Phase 3.2 landed `motion.css` and imported it. It had **zero consumers** — 29 occurrences of
`.m-*` in `src/`, every one of them inside the definition file. The stylesheet shipped to every
player and nothing used it, while the app kept moving on a second, older vocabulary. This phase
closes that: one motion language, actually applied.

- **One timing scale.** `globals.css` held a SECOND independent scale beside the kit's — four
  curves and five tiers, three of which duplicated the kit outright (`--ease-conduct` was
  byte-identical to `--m-breathe`; `--dur-quick`/`--dur-arrive` already equalled `--t-base`/
  `--t-stage`). Worse, **`--ease-arrive` was `cubic-bezier(0.34, 1.56, 0.64, 1)` — a *pivot*-class
  overshoot, which the kit reserves for the needle and dials ONLY — applied to every arrival in
  the product.** That is precisely why arrivals never read as "The Settle". All `--ease-*`/`--dur-*`
  are now **aliases** onto `--m-*`/`--t-*`; new code uses the kit names directly. Aliasing rather
  than rewriting ~150 call sites was deliberate: one reviewable edit, and B5 stays intact
  (globals.css is still the single definition site of the legacy names).
- **🛑 One documented exception to the 620ms ceiling: `--dur-stage` stays 820ms.** Its consumers
  are the two countdown rings' `stroke-dashoffset` transition, driven by a **1-second tick**. That
  is progress *smoothing*, not a transition: at 820ms the arc glides almost continuously between
  ticks; clamped to `--t-max` it would finish early and sit frozen ~380ms of every second —
  visibly steppier. The kit's ceiling governs transitions; a continuously-updating progress arc is
  a third case it does not cover. **Do not "fix" this to `--t-max`.**
- **Dialog motion was defined THREE times** — `.dialog-anim`/`.sheet-anim` in globals.css,
  `kp-modal-rise`/`kp-sheet-rise` inline in the Modal primitive, and the kit's own
  `.m-dialog-in`/`.m-sheet-in`/`.m-scrim`. **The canonical `Modal` used none of the shared ones**;
  it rolled its own. Now every dialog, sheet and scrim in the app — money confirms included —
  composes the three kit classes. Scrim blur follows the kit's `--m-blur-behind` (7px, was a
  Tailwind 12px). The two admin dialogs that bypass `Modal` were repointed too.
- **9 duplicate/dead keyframes retired**: `dialog-rise`, `scrim-fade`, `sheet-rise`, `reveal-up`
  (+ `.reveal-up-d1..d4`), `kp-slide-up`, `ray-spin` (zero consumers), `pchart-draw`,
  `mcardp-spark-draw`, `dot-pulse-soft` — the last three byte-identical to kit keyframes.
  ⚠️ `.route-enter` — **every page arrival in the product** — turned out to reference `reveal-up`,
  so it now runs the kit's `m-settle-in` at `--t-move`. That is the single most-seen motion here.
- **Utilities on the real surfaces**: `.btn` takes the kit's `--m-lift` (−2px, the only hover
  displacement) and `--m-press` (0.97, the only press scale) and no longer sinks *below* rest on
  press; `.live-dot` takes the `.m-live-pip` cadence (2600ms breathe, was a 1.4s 0.3↔1 blink — a
  hard blink on a money board reads as an alarm, not as "live"); `.tab-indicator` takes the
  `.m-indicator` tier; `.stagger-item` uses the kit's 4-step × `--m-stagger` cascade.
- **Haptics: the physical-only rule is now TRUE, not just written.** The kit's rule is *contact,
  passing true, coming to rest — never encouragement, reward, or to pull attention.* Removed the
  reward/attention buzzes on `watch-star` and `vote-control` (preferences, not events — and
  proposals carry a regulated reward). **`win-celebration` and the `gold` toast fire `success`
  (money settled) instead of the 7-pulse `celebrate` flourish**: a congratulatory buzz on a
  gambling win is reinforcement, against both the kit and RG practice. The `celebrate` token is
  kept defined with no caller so the owner can overrule this in one line.
- **Verified in a real browser, not just green suites** — `scripts/motion-adoption-verify.mjs`
  (41/41) asserts every kit token AND every legacy alias resolves through to a real
  cubic-bezier/duration in computed style, that a real `.btn` computes a non-zero duration and a
  cubic-bezier timing function, and that the 9 retired keyframes are gone while the kit's are
  present. This exists because the B5 outage (2026-07-20) killed all motion platform-wide with
  zero errors and a green suite; re-pointing token families is exactly that shape of change.
  Plus `scripts/motion-adoption-shots.mjs`, which scrubs the dialog animation by `currentTime`
  (a screenshot round-trip costs more than the 340ms arrival, so wall-clock sampling only ever
  captures post-settle frames).

## 2026-07-27 (repo · foundation) — Phase 3.2 motion layer + 3.3 inconsistency reconciliation
- **Motion layer landed.** `08-motion/motion.css` → `src/app/motion.css`, imported after
  globals/state-tokens/micro-patterns in `layout.tsx`. Additive `--m-*` curves (settle/glide/
  leave/pivot/breathe) + `--t-*` durations (flick…max, 620ms ceiling) + `.m-*` utilities +
  keyframes; overrides nothing. In-app reduced-motion selector adapted to the class this repo
  actually toggles, `html.kp-reduce-motion`.
- **Collision guard extended** (`scripts/token-collision.test.mts`): the `--m-*`/`--t-*` families
  are now guarded (single-file definition) so a stray redefinition can never silently shadow the
  settle timing the way `--ease-micro` once did. `test:tokens` green — 7 css files, 61 tokens.
- **Token diff vs the archive:** no genuinely-new colour tokens needed — `--accent-*`, `--aqua-*`,
  `--claret-*` are all already defined; the only referenced-but-undefined hits were element-scoped
  inline vars and chat-subsystem tokens. Nothing added beyond the motion layer + the nano type tier.
- **~8 inconsistencies reconciled** (see 07-provenance/OPEN-GAPS.md "v1.1 RESOLVED"): skeletons are
  one system in two modes (`.skeleton` block + `.kp-shimmer-track` overlay, shared 1.4s cadence);
  toasts are already one composed component; empty-state teal retired (neutral `--text-faint` etch,
  brand stroke = `--brand-400`); sub-10px microlabels blessed via `--type-label: 9.5px` +
  `--type-nano: 8.5px`; `--type-h1` documented as the market-question hero (page titles = 28px);
  `ud-count-pulse`/`ud-point` promoted to the kit; one shared `estMultiplier` with an "est."
  qualifier. Doc-and-token reconciliations only — no risky component churn on a live money app.

## 2026-07-27 (repo · feature) — Up & Down D3 round detail (`/updown/[roundId]`) built to spec
The round page rebuilt to `02-components/_specs-as-delivered/D3-updown-round-spec.md` (canvas
`05-pages/UpDown Round.dc.html`): back link → header (44px asset mark + title + status line +
28px countdown pod) → two-column grid at 1280 (price hero left; pool + stake/result right) →
full-width settlement proof once decided. Single dark royal theme; gold appears exactly twice
per state (the gold Confirm on open; the winning payout + resolved-win chip on resolved).
- **Price hero** (`src/components/updown/price-hero.tsx`, pure/server): gilt dashed open-price
  reference line, area tint `--yes-400` above / `--no-400` below (two clip-paths split on the
  open Y), price line in direction ink, breathing live point (`ud-point`), value tag, "Above/
  Below open by $x · Source · quoted". No axis, no gridlines.
- **⚠️ REAL DATA, honestly.** The spec's "~60 points" is aspirational: the oracle reads only at
  grid boundaries, so `priceSeriesFor` (updown-board.ts) hands the hero **only the real CONFIRMED
  reads inside the round window** (≈2 for a 5-min round, more for longer), downsampled to ≤60 if a
  finer feed ever appears — **never a simulated walk** (A-5). `priceSeries=null` (fewer than two
  real points) ⇒ the hero draws the open line alone. No fabricated curve, ever.
- **Locked pick, no exit.** The pick is chosen on the board and carried here as `?side`; the stake
  panel shows it as a chip **statement, not a control** ("to switch sides, leave this round" — no
  cash-out). `RoundStakePanel` reuses the SAME `useUpDownQuickBet → buyPositionAction` money path
  (single-direction gold Confirm when a side is locked; a safe two-way fallback when navigated to
  directly, so betting is never blocked). Stake bounds 1k/1M enforced server-side as before.
- **Exact tie ⇒ VOID + full refund** was already the server rule (`decideOutcome` voids on
  `|move| < 1 tick`, which includes `close===open`); the receipt now **publishes** it — the "Rule"
  row reads truthfully as the dead-band ("Up if the close is above the open · Down if below · Void
  if it does not move"), not a literal `close=open`.
- **Settlement proof**: three cards (open obs · close obs · outcome) with Source (aqua link),
  quoted + **observed** timestamps in EAT, Move/Percent/Rule, a gilt-left-bordered evidence `<pre>`
  (wraps, never clips at 360), and the void-refund closing note. Renders only when `proof != null`.
- **Result panel** (resolved & played): real position (side/stake/payout/result) from
  `myPositionFor`; payout gilt on a win, `--text` on loss/void; honest "TZS 0" on a loss.
- New kit keyframe `ud-point` (globals.css, beside `ud-count-pulse`, reduced-motion gated) — the
  one flagged new value; every other token/class already existed. 19 new `market.ud*` i18n keys in
  EN+SW+ZH (parity 1556³).
- **Verified:** typecheck ✓ · `next build` ✓ · test:tokens ✓ · test:i18n (1556³) ✓ · test:trilingual
  ✓ · updown-engine 66 / updown-quickbet 28 / updown-config 62 / product-line 32 / updown-adversarial
  13 ✓ · rendered both states (open/resolved) against the real compiled CSS at 1280 + 360 — layout,
  chart, proof, gold discipline and zero-overflow confirmed by eye.

## 2026-07-27 (repo · feature) — The Needle: Spin/Bounce mode + an aesthetic controls drawer
A second, user-selectable interaction plus a small settings surface — no new physics, just a
new input on the proven engine.
- **Bounce mode.** Every tap REPELS the object away from the finger: a viewport-normalised
  linear impulse (`maxLin()*0.92`, so the kick is the same fraction of the screen on phone and
  desktop), a little spin, a kick-squash and a proportional impact haptic; the engine's swept
  collisions + restitution do the bouncing and it settles to the logo, ready for the next tap.
  No grab/drag in bounce mode. "Spin" (grab/flick) stays the default. Persisted as
  `needleMode` in `50pick:feedback` and read live in `needle.tsx`.
- **Aesthetic controls drawer** (`src/components/layout/needle-drawer.tsx`) — a bottom sheet on
  mobile / small centred panel on desktop, opened from the avatar menu ("The Needle ›") and
  Settings → Sound & feedback ("Manage the Needle"). Holds the view-sight toggle (Show on
  screen) + the Spin | Bounce segmented control with one-line hints; all tokens, trilingual,
  reduced-motion-gated, ≥44px targets, `role="dialog"`.
- **Robust by construction:** the prefs loader coerces any unknown `needleMode`→`"spin"` and
  non-true `needleHidden`→`false`, so hostile localStorage can't break it; the engine guards
  (proven) keep the physics finite under repel-spam.
- **Verified:** `test:needle` §17 — every tap repels AWAY, bounces + settles to the logo, kick
  viewport-normalised (ratio spread 0.000000), 5,000-tap repel-spam never corrupts — ALL PASS;
  `needle-visual.mjs` — a right-side tap sends it left in a real browser — PASS; typecheck +
  `test:tokens` + `next build` green.

## 2026-07-27 (repo · fix) — The Needle floats OVER the nav bars, never trapped behind one
Bug (reported by users): it stuck to the bottom nav on phones + the top bar on desktop, and
vanished on some pages — all one root cause: it sat at z-25, BELOW the nav chrome, so a bar
covered it (hidden AND unclickable). An interim attempt walled it OUT of the bars via insets,
but the object is supposed to pass OVER them, not avoid them. Final fix: **z-index 45** —
ABOVE the top bar (z-30) and bottom nav (z-40) so it floats over them and passes through
freely, but BELOW every dropdown (50) / menu (60) / popover (90) / modal (100), so it never
covers a decision. No app-bar insets (it is not walled out — it floats over); it still respects
device safe-area insets, and `nearestEdge` is overridden on the instance to rest on the
LEFT/RIGHT rails only (off the reading column / nav centre). Show/hide is a persisted toggle in
the avatar menu + Settings → Sound & feedback (reachable at every width). Verified: `test:needle`
§16 (floats free, reaches ALL FOUR corners, rests on a side rail as the logo) + `needle-visual.mjs`
(z=45 above both bars; rests on a rail) — ALL PASS.

Also: **diameter cap 88 → 64.** The strokes hold a constant ~2.3 CSS px, so on the big 88px
desktop disc they read thin and washed while the crisp, premium mobile look came from the
smaller disc making the gold needle + rim proportionally bolder. Keeping it FAB-scale (56–64)
at every width makes desktop as refined as mobile (screenshots re-verified at 360/768/1280/1920).

## 2026-07-27 (repo) — The Needle wired into the app, and torture-verified
Integration of `09-needle/` into the live 50pick app (physics/spec/renderer unchanged;
this is integration, not redesign).
- **Engine vendored unedited** → `src/lib/needle-physics.js` + `needle-haptics.js`, typed
  with hand-written `.d.ts` shims (repo is `allowJs:false`).
- **Host ported verbatim** from `Needle Playground.html` into a React client component
  `src/components/layout/needle.tsx`; mounted ONCE in `AppShell` for signed-in players.
  Adaptations are integration-only: elements looked up WITHIN `#needle-root` and the SVG
  paint-def ids namespaced `ndl-*`, and all CSS scoped under `#needle-root`
  (`src/components/layout/needle.css`), so nothing — not the bare `svg{}` rule, not a
  `url(#faceL)` — can leak onto an app glyph. The demo page's `html,body` reset was dropped.
- **z-index DEVIATION 900 → 25.** The brief assumed app modals at 1000; 50pick's real stack
  is top bar 30 / dropdowns 50 / menus 60 / popover 90 / MODALS 100 / selects 120–130 /
  banners 200 / toasts 1800. At 25 the object sits above page content but below every
  overlay and the top bar, so a fidget can never obscure navigation or a live money commit.
- **Hidden on money surfaces**: `/wallet*` routes, plus a navbar/settings show/hide toggle
  (persisted in the shared `50pick:feedback` prefs) and `50pick:needle-suppress/-release`
  events for money modals. Signed-in players only (every viewer can hide it via the menu).
- **Wired**: `session()` (per-tab clock drives presence), `acknowledge()` (on a held-win
  dismiss — no win/loss variant), `onInteraction`/`onRecord` → analytics events
  (`needle:interaction` / `needle:record` — the personal best is NEVER rendered),
  `onDetent`/`onCatch`/`onTrue` → haptics. The vendored haptics honour the app's master
  "Sound & feedback" switch (mute bridged); the raw `navigator.vibrate(12)` in the Up&Down
  quick-bet was replaced with the named `haptics.confirm()`.
- **Verified**: `npm run test:needle` — 15,000+ randomised throws/spins + 21 adversarial
  assertions (every wall/corner, interior/overlapping/enclosing obstacles, full spin range
  with cross/detent/true/catch, restitution/energy laws, NaN/∞/huge-dt/degenerate-viewport
  injection, resize storms, callback hygiene) — ALL PASS. `scripts/needle-visual.mjs` —
  real-browser render/responsiveness (56→88px)/scoping/spin-to-logo/suppress at
  360/768/1280/1920 — ALL PASS. typecheck + `test:tokens` clean. Signature invariant holds:
  it always comes to rest as the logo, exactly.

## 2026-07-27 (repo) — installed into the app as the single design-system home
Consolidation performed in the 50pick app repo (`F:\kipindi-main`) so a future session
sees exactly one design archive and one token truth. "One fact, one home."
- **Installed here.** This archive was moved from `New developments/Full Final Archive/…`
  to `docs/design-system/v2-2026-07-27/` and registered in `docs/design-system/README.md`
  as the current (and only) version.
- **Duplicates deleted, content-hash verified.** The four sibling kits under
  `New developments/` (`Haptics Vocabulary/`, `Motion Language + haptics/`,
  `The Needle Fidget Object/`, `Up and down d3 round detail/`) were byte-identical subsets
  of this archive — every one of their files' SHA-256 was confirmed present here before
  deletion. The only non-duplicate was one package `README.md` (a redundant quick-start
  index; its substance lives in the D3 spec + OPEN-GAPS). The loose `New developments/`
  staging folder was then removed entirely (it was untracked and not git-ignored — a
  `git add .` would have committed ~2.1 MB of cruft).
- **v1 retired.** `docs/design-system/v1-2026-07-24/` was **100% contained in this v2**
  (all 16 files hash-verified) and referenced by no code, so it was deleted — its history
  remains in git, its content here.
- **Code repointed.** The two `src/` JSDoc "built to spec" comments
  (`src/components/updown/updown-card.tsx`, `src/app/updown/page.tsx`) were repointed from
  the v1 spec paths to `02-components/_specs-as-delivered/D1|D2-updown-*-spec.md`.
- **Config residue pruned.** Dead `tsconfig.json` excludes (`50PICK`,
  `Final UI enhancement Kit` — long gone from disk) and stale `.gitignore` lines
  (`/Haptics/`, `/Motion Language/`, `/Needle Fidget Project/` — never matched anything)
  were removed.
- **Token truth unchanged.** The live `src/app/globals.css` remains the single token
  authority; `01-foundations/tokens.css` here is a dated snapshot, per README §1.

## 2026-07-27 — Up & Down D3 (round detail) designed
Closed the first item in OPEN-GAPS. Four frames (open + resolved, 1280 + 360), redlines
and contract per brief §5.
- **Price hero** answers "am I above or below?" before any number is read: the open price
  is a gilt dashed marker and the area tints `--yes-400` above it, `--no-400` below,
  clipped at the line. No axis, no gridlines, per brief.
- **Locked pick** rendered as a chip statement, not a switch — the side was chosen on the
  D1 card.
- **Gold used exactly twice**, both defensible: the confirm button (money commit) and a
  winning payout (earned money). The projection stays neutral ink — a projection is not
  earned money.
- **Settlement proof as a receipt**: open + close observations each with source link,
  quoted timestamp AND observed timestamp with timezone; outcome with the movement in
  absolute and percent; the raw evidence excerpt; and the stated rule
  ("close > open ⇒ UP") so a player can check the outcome rather than take it on trust.
  Proof prices are deliberately uncoloured — colour there would re-read facts of record
  as live direction.
- New values flagged: 26px hero price, 44px page-scale asset icon, `ud-point` keyframe,
  area-tint gradient recipe, 6px pool bar.
- Three open questions raised and logged rather than silently decided: exact-tie policy,
  whether leaving a round exists, and per-duration series sampling.

## 2026-07-27 (feel) — response, texture, discovery, and mobile restraint
Brief was "make it addictive". Declined and renegotiated to "make it satisfying" — the
reasons are in CLAUDE-CODE-BRIEF §3d, and the short version is that a compulsive toy
inside a gambling app is the argument that removes it in a license review. What shipped
instead:
- **Gesture response.** A flick, shove and nudge now behave like three different objects
  (gain ×1.18 / ×0.74 / ×0.22), classified on peak-speed-to-distance ratio.
  **Viewport-normalised** — absolute px gates classified every phone flick as a shove,
  which would have made the object feel dead on the devices most people use.
- **Bearing detents.** A quarter-turn tick scaled by speed, so one mechanism reads as
  discrete clicks slowly and a continuous purr fast. This is the most-noticed thing in
  the hand and the difference between a machined object and a notification buzz.
- **Catching it mid-spin** is its own event — firmer haptic plus body compression,
  because you absorbed real momentum. Grabbing at rest does not qualify.
- **Two discoveries, neither rewarded:** the clean pass (edge to edge, zero bounces,
  tracked but never displayed) and the closed ring (the trail completes into a whole
  circle above 88% of max spin).
- **Mobile footprint cut from 32% to a measured max of 10.5%** of the narrow viewport.
  Diameter is now FAB-scale on phones (56px at 360px wide), the halo scales with
  viewport, and the touch target is decoupled from the visible sliver — the earlier
  version forced 79% of a phone disc on screen chasing the 44px floor, when the floor
  applies to the hit area, not to the pixels. 44px touch at every size.
- Fixed a double-counted run: endRun() is reachable from both stepPark() and sleep(),
  and sleep() fires on consecutive frames, so one clean pass counted 342 times.

## 2026-07-27 (fix) — keep-out zones were dead code
Caught in review: interior keep-out zones never fired in the one integration that
matters. Two stacked bugs, both of the same family — **cached state that goes stale
exactly when the feature is needed**:
- A boot-time "do any keep-outs exist" flag could never flip true, because it was only
  recomputed inside the function it was gating. A docked bet slip mounts on interaction,
  so it was never seen.
- The replacement gated the read on a frame counter incremented by the rAF loop — which
  sleeps at rest, so anything mounted during sleep was still invisible.

Fixed by letting the engine's own `obstacles()` callback trigger the read, cached on
elapsed time (8ms) so it is self-invalidating regardless of who drives the simulation.
Re-verified with the obstacle mounted AFTER boot: 0 frames past a 12px wall at max
velocity, 18.8 rpm from a glancing hit, clears on removal. Documented as two named traps
in NEEDLE-SPEC §3.4c and CLAUDE-CODE-BRIEF §5.3b so a reimplementation cannot repeat it.

## 2026-07-27 (final) — swept collision, and the two documents the object needed
- **Collision is now swept, not discrete.** Conservative advancement subdivides each
  substep so no motion step exceeds 35% of the radius. Verified against a 12px wall hit
  at 35px-per-substep: zero frames past it, where discrete collision tunnels every time.
  This removes the last physics limitation and unlocks interior obstacles.
- **Interior keep-out zones** — `obstacles: () => rects`, or `data-needle-keepout` on any
  element. The object deflects off a docked panel, slides along its edges and takes spin
  off its corners. Recovers cleanly if a rect appears underneath it.
- **MEASUREMENT-PLAN.md** — four questions, and kill criteria agreed IN ADVANCE (remove
  it below 3% session interaction). Written because the object had no evidence and
  "it's beautiful" is not a reason to keep something.
- **COMPLIANCE-MEMO.md** — draft responsible-play memo, explicitly NOT approved,
  including the honest counter-argument that an interactive toy in a betting app could
  be read as gamification. Design cannot self-certify this claim.

## 2026-07-27 (later) — Needle refinements from a ten-role review
Rated the object as gamer, student, manager, gaming CEO, betting CEO, graphic designer,
motion engineer, haptics engineer, UI/UX engineer, game developer and player. Six real
gaps closed:
- **Silent mastery** — the engine now tracks a personal best (turns, bounces, spin
  time) and never displays it. A fidget with no skill ceiling gets boring; a displayed
  score would violate the no-gamification rule. Both problems solved at once.
- **Instrumentation** — `onInteraction` fires once per completed interaction with
  turns/bounces/spinSeconds/presence. This is what answers "does anyone use this",
  which was the manager's and CEO's only real objection.
- **`trueFound` haptic** — the moment the needle corrects onto true had no haptic,
  despite being the object's most meaningful event. Now a single crisp 11ms tick.
- **Stroke scaling** — a 2.6-unit inlay renders at 1.66 CSS px on a 68px phone disc,
  sub-pixel on 1x displays. Strokes now scale inversely with diameter, holding 2.29
  CSS px at every size.
- **Accessibility label rewritten** to lead with "an optional fidget toy. Nothing here
  affects your account" so screen-reader users can skip it knowingly, rather than
  hiding it from them.
- **Two limitations documented honestly** rather than left to be discovered: haptic
  duration is not amplitude (web API has no amplitude control), and collision is
  discrete not swept (would tunnel through thin interior obstacles if any are ever
  added).

## 2026-07-27 — v1.1 archive
- **Motion identity shipped: "The Settle."** Derived from the mark (a needle on a
  pivot): anchored, settled, weighted. Four curves, six duration tiers (90–620ms
  ceiling), four z-planes where depth is blur not dimming, and the −14° signature axis
  every sweep and reveal travels on. `theme/motion.css`.
- **The Needle** — persistent edge-parked pause object with a deterministic rigid-disc
  simulator (fixed 120Hz substeps, viscous + Coulomb friction, impulse collisions with
  tangential→spin transfer). Always comes to rest as the logo, exactly.
- **Haptic vocabulary** — named patterns for physical events only; rate-limited,
  mutable, reduced-motion aware.
- **Needle livery decided: enamel.** Flat brand hues were built, rejected (prize-wheel
  read + stole betting semantics), a monochrome version was built and rejected too
  (brand disappeared). Shipped: same hues fired as deep cloisonné with polished inlay.
  Rationale in 09-needle/NEEDLE-SPEC.md §0.
- Eight defects found in verification and fixed; logged in NEEDLE-SPEC.md §12.

Newest first. Dates are as known from the design sessions; earlier kit history is reconstructed from comments inside the given files and marked (inferred).

## 2026-07-24 — v1.0 archive assembled
This archive. Contents frozen: given kit + Positions/P&L + Up & Down D1–D2.

## 2026-07 (this month) — Up & Down, surfaces D1 + D2
- UpDownCard designed: 7 states + stress variant, 360/1280. New: ud-count-pulse keyframe, asset icon chip recipe, 8.5–9.5px mono micro-labels, 28px countdown digits, pool split bar, result pips.
- /updown board (D2): price tape, asset/duration tab hierarchy, results pip strip, paused-chain empty state, card-mirroring skeleton.
- Verifier fixes: resolvedDown countdown label; footer now preserves "· quoted HH:MM:SS" under truncation.
- D3 (round detail), D4 (admin console), D5 (nav glyph) — briefed, NOT designed.

## 2026-06/07 — Positions "Portfolio" surface (Brief #1)
- "Your standing" ledger strip replaced the old 4× SummaryCell grid; gilt NeedleDial (win rate) introduced.
- Performance page recomposed: net-P&L ledger hero, PnlChart (raw-TZS axis + gilt break-even) replacing a 0–1-normalised PriceChart usage; dignified loss copy.
- New i18n keys listed in _specs-as-delivered/README-handoff.md.

## 2026-05 (inferred from brief) — licence review
Compliance spec: per-position potential payout hidden pre-resolution; "if settled now" captions on unrealised value.

## ~2025–2026 (inferred) — v2 kit re-theme: teal → royal indigo
globals.css comments record: canvas re-anchored to #060a50 (hue 268); "v2 kit: one flat-solid button family" (YES/NO/gold became solid fills, primary kept its gradient); --accent-* aqua chrome tokens defined after being referenced-but-undefined; spinning win sunburst replaced with win-aura-breathe; compat aliases (--bg-base, --surface, --teal-*) kept so first-generation components still render.

## earlier (inferred) — first-generation concept kit
atoms/markets/brand/microstructure specimens authored on the older near-neutral dark (oklch hue ~240 backgrounds) with teal as the brand accent. Superseded visually; contracts still authoritative.
