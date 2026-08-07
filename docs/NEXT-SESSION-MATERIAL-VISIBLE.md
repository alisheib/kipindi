# ⏭️ NEXT SESSION — MAKE THE MATERIAL SYSTEM VISIBLE

**Copy the block below into a fresh session, verbatim.** Written 2026-08-06 at the end of
session 34, which merged the whole §A **token** layer and none of the layer that shows.

> ## Why this document exists
>
> Session 34 landed seven atoms and verified every one on production. It also left the
> product looking almost unchanged, and Ali said so: *"I couldn't find in the platform the
> new popups etc — are you sure they're implemented?"*
>
> **He was right, and the census is unambiguous:**
>
> | | consumers in `src/` |
> |---|---|
> | `--wash-raised` / `-float` / `-modal` / `-inset` | **0** |
> | `--elev-raised` / `-float` / `-modal` / `-toast` / `-flat` | **0** |
> | §C — the 29 `.mat-*` / `.g-*` / `.gilt-*` / `.seal-*` / `.crest-*` utilities | **not in the bundle** |
> | §B — the 12 new keyframes | **never landed** |
>
> Nine of the tokens the delivery is built around have **zero consumers**. That is not a
> defect — INTAKE §3 orders the merge tokens-first *precisely* so the ladder can be wrong
> while three files use it instead of forty — but it means **the law is merged and the look
> is not.** This session is the look.

---

## THE PROMPT — copy from here

Continue the Claude Design material-system merge in `F:\kipindi-main` on branch `main`.
Production is https://50pick.tz, Railway project 50pick. **EVERY PUSH TO MAIN DEPLOYS LIVE.**

⛔ **THIS SESSION DOES NOT STOP UNTIL THE MERGE IS COMPLETE.** Ali is away and has said so
explicitly. The loop is: land one atom → commit → push → **WAIT FOR THE DEPLOY AND VERIFY ON
PRODUCTION** → record the validation → start the next atom. Do not stop to report between
atoms. Stop only for something that genuinely needs Ali's decision, and even then finish
every atom that does not depend on the answer first.

### ⛔ READ FIRST, IN THIS ORDER, BEFORE OPENING `src/`

1. `docs/LIVE-QA-CAMPAIGN.md` §6b — the **topmost** `RESUME AT (session 35)` block. It carries
   the seven atoms session 34 landed, what is left in order, and one open question for Ali.
2. `docs/design-brief/INTAKE.md` **§2a** (edit a token at its line), **§2b** (the wash cannot
   come from `--bg-elevated`), **§3** (integration ORDER — this session is steps 2–5),
   **§3b** (what DIES when each piece lands), **§4a** (the four-part exit gate),
   **§4b** (motion is physics), **§4c** (contrast is three instruments).
3. `docs/design-system/v2-2026-07-27/11-material/README.md` — the corrected merge map, and
   **the SEVEN things the delivery gets factually wrong about our files**.
4. `.../11-material/EXTEND.md` — M1–M8, the law being installed.
5. `.../11-material/material.css` — **§B and §C are what you are landing.** §A is done.

### ⭐ WHERE THE MERGE ACTUALLY STANDS

**DONE (session 34) — §A, the token layer, all verified on production:**

| atom | commit | what |
|---|---|---|
| 6 · 2c-b | `05946b9a` | the three floating rungs take `var(--edge-lit-strong)` — 36/36 cells |
| 7 · E-122 | `295febc8` | 3 colour tokens had two declaration sites; `test:tokens` rule 1b |
| 8 · 2c-c | `216ec6b7` | ⭐ **`test:m1-light` prints 0 — the M1 sweep is COMPLETE** + E-121 |
| 9 · E-123 | `83dae68d` | `/help` advertised a chat that is switched off; `test:chat-availability` |
| 10 · 2a | `594b77bc` | canvas 13.5% → 6.5%, chroma held at 0.130 |
| 11 · E-124 | `d667a3d9` | 🔴 `#E3BC66` is **not** `oklch(79% 0.095 84)` — chroma understated 17% |
| 12 · 2b | `3282b807` | one gold on the **measured** anchor; `--gilt` is now `var(--gold-300)` |

**NOT DONE — everything a person can see.** That is this session.

### ▶ THE ATOMS, IN THIS ORDER AND FOR THESE REASONS

**ATOM A — reduced motion's THIRD gate + `animation-delay`. ⛔ BEFORE ANY ANIMATION ATOM.**
`theme-provider.tsx:43` writes `data-motion="reduced"` for **low-end Android — our target
device** — and toggles `kp-reduce-motion` only on the user's own setting. So M6 has THREE
gates and the delivery covers two. ⛔ **Neither universal clamp touches `animation-delay`**,
so a delayed keyframe holds its FIRST frame instead of its last: `.needle-sweep` sits at
`rotate(-26deg)` for 600 ms and `.crest-ring-reveal` at `opacity: 0` for 340 ms for a
reduce-motion user. Close it here or M6 forces you to re-open all five animation atoms.
Gate it, and prove the gate RED.

**ATOM B — §B, the 12 keyframes** → `src/app/globals.css`, beside each one's family.
⛔ **Check the 67 live keyframe names first** (44 globals + 14 motion.css + 8 state-tokens +
1 needle.css). None of the 12 duplicates a name — verify that, do not trust it.
⛔ **`shimmer-gilt` IS A TRAP AND NO GATE CAN SEE IT.** `globals.css` animates
`background-position` with a **single** value; `.gilt-metal` declares **two** layers, so on
hover the gold ramp itself translates ±200% — **the metal slides off the button.** The
designer's spec shim writes the two-value form, so the spec demos correctly and the product
would not. Fix with a two-layer keyframe or a `::after` sheen; do **not** edit `shimmer-gilt`
in place without checking its other consumers.

**ATOM C — §C, the 29 utilities** → `src/app/motion.css` (imported LAST, so it outranks
globals at equal specificity). This is where `.mat-raised/-float/-modal/-toast`, `.g-*`,
`.gilt-metal`, `.gilt-ink`, `.seal-*`, `.crest-*`, `.needle-*` land.
⚠️ **SCALE EVERY GILT CHROMA BY ×1.20 — E-124.** `material.css` writes the gilt family at
0.075 / 0.095 / 0.100 / 0.085 / 0.045, all derived from an anchor that understates the
trademark's chroma by 17%. Pasting them re-introduces a dull gold **inside the one place gold
matters most, the earned-money surface** — the exact defect ATOM 12 just removed from the
ramp. The measured anchor is **`oklch(81.20% 0.1141 85.38)`**, which round-trips to `#E3BC66`
exactly.
⛔ **Do NOT land `--gilt-bloom`** — MANIFEST, M3 and §C's own seal comment all say the bloom
is REMOVED.
⭐ **D-6.6's ONE SEND-BACK IS YOURS TO REPAIR:** there is no rung-independent tint recipe, so
a tinted-but-FLAT surface cannot be expressed — `.mat-edge-warn` welds a toast-level cast to
anything it touches, and its own comment names *callouts*. Add `.mat-tint-*` as a ring-only
modifier that composes with any rung. One rule.

**ATOM D — ONE representative component per family, then STOP AND LOOK.**
`ui/modal.tsx` (overlays) · `markets/market-card.tsx` (cards) · `ui/button.tsx` (controls).
⭐ **This is the moment to find out the ladder is wrong, while three files use it and not
forty.** Shoot all three at 360/768/1280/1920 × EN/SW/ZH before touching anything else.
⚠️ **A surface adopting `--elev-float` DROPS ITS BORDER** — that rung carries an outer 1px
ring at 42% and six surfaces also carry `border-border-strong` at 44%; the two together read
as one muddy 2px edge. The fix is at the call site, never in the token.
⚠️ **The wash arrives as a CLASS PER SURFACE and never by redefining `--bg-elevated`** —
that token is consumed as a *colour* inside `color-mix()` at five sites and as Tailwind alpha
across a dozen components, so a gradient there makes those declarations **drop silently, with
no build error** (INTAKE §2b).

**ATOM E… — the rest of each family, one commit per family.**

**ATOM F — the 178 glyphs** (not 185: 180 definitions, 2 shadowed by `Iplus`; **107
referenced, ~71 dead**). Mechanical once the primitive exists. M5: four primitives, triggered
by mount / data change / state change — **never hover.**

**ATOM G — E-112.** The five Up & Down stake chips render **26 px** against the platform's
own **40 px** money-control floor, in all three languages at 360, and they choose how much a
player stakes. ⛔ Fix with the **control-height tokens**, not per-component: `chipBase` in
`updown-stake-controls.tsx:86-88` is padding-sized with **no height property at all** and is a
**fourth** independent chip implementation. `globals.css` already schedules the tap-floor bump
(`--h-control-sm` 30→40, `-md` 38→44, `-lg` 46→48) and notes **148 call sites including
admin**. Not a one-line patch.
⚠️ **The chip VALUES come from live config, not the code default** — `quickStakes(min,max)`
derives them; the code default `minStake` is 1,000 while the live global is 500. **A code
default is not a live setting.**

**ATOM H — E-114.** The VOID/refund toast paints a confirmation **tick** over a returned
stake (`variant: "default"`, three lines from the loss toast that was moved to `factual` for
exactly that reason). It survived because the toasts have **no imperative API** and it has
never been photographed live.
⚠️ **Related, found in session 34 and worth fixing here:** the shipped `Toast` component does
**not** use the kit `.toast` class at all — it paints `shadow-[var(--shadow-card)]`, i.e.
**rung 1**, while M2 puts a toast at **rung 4**. The kit `.toast` class has zero consumers.

**ATOM I — E-115. ⛔ THIS IS THE MONEY ATOM — ISOLATE IT.** The long-form win celebration
headlines a **place-time projection** from `localStorage` and **infers** the win from the
round outcome instead of reading the position row. **Ali's decision 2026-08-06: fix it in this
pass.** It crosses into `src/lib/server/`, so: its own commit, verified **against the ledger,
not against a screenshot**, and a fresh money census is owed at that point.

**ATOM J — M1–M8 into `docs/DESIGN_AUTHORITY.md` as section M**, in the authority's own
voice, **in the same commit as the last code that proves them.** Then delete `EXTEND.md` and
the merged sections of `material.css` — the folder shrinks to zero as the work lands.

### ⛔ THE EXIT GATE IS FOUR-PART AND ALL FOUR ARE REQUIRED (INTAKE §4a)

1. **Technical** — `npx tsc --noEmit`, `npm run build` exit code, the `test:*` set, **plus a
   falsifiable check**: the grep or probe that would FAIL if the atom had done nothing.
2. **Visual** — the image is **opened**, at 4× corner crops for material.
3. **Consistency with the handover** — name the M-law and the `material.css` section the
   shipped thing satisfies. *"It looks good"* is not this check.
4. **Responsive** — **360 · 768 · 1280 · 1920 × EN · SW · ZH.**

⛔ A single-viewport, single-locale capture does not close an atom.
⭐ **For any atom that adds MOTION**, axis 1 gains three requirements: **compositor-only**
props (`transform`/`opacity`/`filter` — never a layout property), a real `--t-*` duration AND
`--m-*` easing off the ladder (`test:motion-ladder`'s allowlist is at **0** and may only stay
there), and a **MEASURED** frame time. ⛔ *"It looks smooth on this laptop"* is not evidence —
the target is a low-end Android over 2G, and this machine's own clock runs 93 s slow.

### 🔧 THE INSTRUMENTS — five now, each blind to something the others see

```
npm run test:contrast          # the STYLESHEET — 38 checks over 3 sheets · red:contrast 21/21
npm run qa:contrast-rendered   # the DOM — every text node vs its real background
                               #   ⚠️ PowerShell, not Git Bash: MSYS mangles ONLY=/route
npm run qa:button-contrast     # the RASTER — real pixels, real pointer, the only :hover reader
npm run test:m1-light          # the M1 ratchet — prints 0; red:m1-light 6/6
npm run test:tokens            # cross-file token collisions (rule 1b) · red:tokens 3/3
npm run test:chat-availability # E-123's coupling rule · red:chat-availability 3/3

SHOT_DIR=.qa-design node scripts/live-material-probe.mjs card updown button button-xl \
  modal dropdown sheet glass-panel --widths=360,768,1280,1920 --locales=en,sw,zh
      # 4× corner crops. A surface may declare `open:` steps — locale-INDEPENDENT selectors only.

node scripts/material-ring-delta.mjs BEFORE.png AFTER.png label
      # ⭐ USE ON EVERY M1/edge ATOM. The probe proves the computed value changed;
      #   this proves a human gained light. Prints a depth profile.

node scripts/material-candidate-preview.mjs --route=/x --selector=.y --persona=fleet:07 \
  --css-file=cand.css --prop=backgroundColor --tag=t
      # ⭐ LOOK BEFORE YOU SHIP. Injects a candidate into the real production page and
      #   shoots A/B. ⚠️ PowerShell, not Git Bash.
```

### ⚠️ STANDING RULES THAT HAVE ALL COST SOMETHING

- **TWO SESSIONS SHARE THIS TREE.** `git add <path>` / `git commit -F msg -- <paths>`.
  **NEVER `git add -A`.** Always `git branch --show-current` before committing.
- **Re-grep finding ids at the moment you file.** **E-124** is the last one taken.
- `npm run qa` **does not exist** (only `qa:*`). `test:motion-ladder` / `test:crest-legibility`
  need the repo root. `test:responsive` / `test:motion` need a live `:3000`.
- ⛔ **`src/lib/updown-pricing.ts` and `updown-movement.ts` stay untouched** — money and gate
  logic, not design.
- 🔴 **The support chat is SWITCHED OFF in production** (`isChatbotEnabled()`), so its four
  probe surfaces cannot be reached. Their CSS is live in the bundle; the shots are owed the
  day the switch flips. **Do not point them at a fixture.**
- 🔴 **ONE OPEN QUESTION FOR ALI** (§6b ⑤, not blocking): the canvas at 6.5% is at the sRGB
  gamut floor, so the designer's chroma-halving was probably gamut-correct authoring rather
  than an aesthetic choice. Nothing needs undoing. The live question is **how deep the field
  should go.**

### ⭐ AND THE LESSON THE LAST SESSION KEPT PAYING FOR

It found **more defects in its own instruments than in the product**: a raster probe that
measured a border and called it a ring · a delta rule that condemned a correct even ring · a
`geom()` that made a colour probe blind to colour · an `includes()` satisfied by an unused
import · another satisfied by a renamed key · a deploy poller that could not parse a negative
L\* · a mutation using a colour that legitimately passes · a patch script that reported
success on one replacement of two.

**When a number looks wrong, suspect the instrument first.** And every gate you write gets a
RED harness that mutates a **copy** — never the shared tree — and names the check that failed.

## — copy to here
