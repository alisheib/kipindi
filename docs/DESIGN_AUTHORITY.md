STATUS: authoritative — the design invariants of 50pick. Cited by code
(`globals.css`, `theme-provider.tsx`). Last verified against the build 2026-07-20.

# 50pick — Design Authority

This document records the **invariants** the design system must never violate.
It is cited by number in code comments (e.g. `/* DESIGN_AUTHORITY B3 */`). When a
rule lives beside the value it governs, a stale doc elsewhere can no longer mandate
a regression (that was audit finding C9).

> ### 🎨 THE COMMISSIONED MATERIAL SYSTEM IS DELIVERED, MERGED AND LAW — section M below
> The material system commissioned from Claude Design on **2026-08-06** (light source,
> elevation ladder, real gilt treatment, glyph/identity motion primitives) was accepted,
> merged into `src/` (sessions 34–35, 2026-08-07) and is codified here as **§M (M1–M8)**.
> Provenance — the delivery, the acceptance record, the four measured departures from it,
> and the designer Q&A — lives in `docs/design-system/v2-2026-07-27/11-material/` and
> `docs/design-brief/` (brief, before-picture `AUDIT.txt`, critique, `INTAKE.md` playbook).
> Adoption progress is tracked in `docs/ux-audit-2026-08/MASTER-PLAN.md` §6 (DA/DS).

**Hierarchy of truth:**
1. **`src/app/globals.css`** — the authoritative *implementation* (tokens, the live palette). Newest artifact; if anything disagrees with it, it wins.
2. **`docs/design-master-brief.md`** — palette *rationale* / ground-truth sRGB. The live tokens match it to ~0.3%.
3. **This file** — the *invariants* (what must stay true).

⚠️ **`50PICK/design_handoff_prediction_market_kit/kit/`** is a **SUPERSEDED snapshot**
(teal 215, dead `[data-theme="light"]`). **The folder no longer exists on disk** — it was
deleted in the 2026-07-15 finalization (archive: `F:/50pick-design-archive/` + git history).
Historical only. **Do NOT build from it** — following it reverts the brand to teal and
resurrects the killed light theme. If a note tells you to "consult the kit first", that note
is stale; consult `globals.css` instead.

---

## B1 — Palette is royal 268

The brand hue is **royal indigo, OKLCH hue 268** — matching `design-master-brief.md`
(`#060A50` → hue 268). It is **not** teal 215. Core tokens, verified against the brief:

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| YES | `#00A24F` | `oklch(62% 0.17 152)` | winning / affirmative money surface |
| NO | `#E6424C` | `oklch(62% 0.20 22)` | losing / negative money surface |
| Gilt | `#D49824` | `oklch(72% 0.14 78)` | needle, hub, accents |
| Canvas royal | `#060A50` | hue 268 (L deepened to ~15% by design) | app background |
| Aqua | `#36BABA` | `oklch(72% 0.110 195)` | finishing accent only (see B4) |
| Claret | `#A4273F` | `oklch(48% 0.160 15)` | editorial weight only (see B4) |

`src/app/globals.css` is authoritative for the exact values. Brand-identity hexes in
`src/components/brand.tsx` (`#1EA362`/`#B03A3E`/`#E3BC66`) are a deliberate byte-identical
port of the delivered logo `mark-a.svg` and are allowed to diverge from theme tokens —
brand identity ≠ theme tokens.

### B1a — ⭐ THE MARK ITSELF, and the two things people get wrong about it

Recorded 2026-08-06 because an outside design pass reconstructed the mark from prose as
*"the '50' on royal enamel over a −14° baton"* — and **both halves of that are wrong.**

**What the mark is** (`src/lib/brand-mark.ts`, the ONE definition — audit C11; delivered
`mark-a`, 2026-07-09): a circle split **YES-emerald LEFT · NO-rose RIGHT** by a diagonal
chord, the **gilt NEEDLE** riding the seam past the rim, over a gilt hub with a navy pivot.
⛔ **No ring, no numerals** — the wordmark carries the name.

1. ⛔ **There is no "50" glyph in the mark.** A coin face bearing numerals contradicts the
   canon. The name lives in `FiftyWordmark`; `FiftyLockup` is mark + wordmark, and the
   delivered lockups are `public/brand/lockup-horizontal.svg` and `lockup-stacked.svg`.
2. ⛔ **It is a NEEDLE, not a baton** — the same object as `TippingBar` and the conviction
   dial. The mark is not a logo that sits near the UI; it is **the UI's own instrument
   reduced**, and anything built on it must read as that instrument.

**The −14° axis is measured from this artwork, not chosen.** From the shipped coordinates
(`x1 38.39, y1 3.43 → x2 61.61, y2 96.57`): `atan(23.22 / 93.14) = 13.998°`, so
`--m-tilt: -14deg` is accurate to three significant figures. Negative because the needle's
top leans **left** of centre. ⚠️ `@keyframes m-axis-sweep` in `motion.css` writes `-14deg`
**literally** — `skewX()` cannot take a custom property in every engine we support — so it is
the one place the number is duplicated and it must move with the axis.

⛔ **Never hand-edit a brand asset.** Every SVG and PNG under `public/brand/` and
`public/icons/` is generated from `brand-mark.ts` by `scripts/build-brand-assets.mts`. Editing
one directly is how the PWA icon and every outbound email once shipped the superseded round-1
logo. **Change the source, regenerate.**

⚠️ **And the mark's gold stays `#E3BC66`.** Any satin/material recipe adopted for *surfaces*
does not apply to the trademark — that is this rule's parent, B1, applied to the one place it
matters most.

**Reproduction law** (enforced in `FiftyMark`, which auto-switches below 24px): full mark
min **24px** · simplified min **14px** · clear space **0.25 × diameter**.

📌 **The per-player heraldic crest (`ui/identity-avatar.tsx`) is a SECOND system** and must not
borrow from the mark. E-111 fixed its sub-pixel geometry (every stroke now carries a 1-CSS-px
floor, guarded by `test:crest-legibility`); its band opacity and material remain open.

**Type:** Sora (display, `--font-display`) · Inter (body) · JetBrains Mono (money + numerals),
all Google Fonts under **SIL OFL 1.1** — commercial use, embedding and web serving, no in-UI
attribution. The wordmark is *set in Sora*; there is no separate logotype to license.

## B2 — YES / NO semantics are untouchable

Green means YES/win; rose means NO/loss. This mapping is load-bearing for a money
product and must never be inverted, re-hued, or reused for a non-money meaning. The
two together form the core betting control; their duality (one light-labelled, one
dark-labelled where contrast requires) must be preserved.

## B3 — Single dark-royal theme. No light mode.

The product has **one theme: dark royal.** Light mode was deliberately killed and
correctly removed. `color-scheme: dark` is forced in `globals.css`. There are:
- 0 light-theme selectors (`[data-theme="light"]`, `.light`, `prefers-color-scheme`)
- 0 `next-themes` imports, 0 theme toggles
- 0 `dark:` variants

**Do not re-introduce a light theme.** Every WCAG contrast ratio the product proves is
computed for this one surface; a resurrected light mode would be an entirely unverified
contrast surface on money screens.

## B4 — Claret editorial-only; aqua ≤ 8% coverage

- **Claret** (`#A4273F`): editorial weight only — Politics chip, Sovereign tier,
  regulator/footer crest. **Never** on YES/NO money surfaces or adjacent to NO-rose.
- **Aqua** (hue 195): finishing pass only, **≤ 8% surface coverage**. Never a chip,
  button label, or anything semantic.

These usage rules are already encoded in the `globals.css` token comments; this is
the canonical statement of them.

---

## Accessibility floor (see audit H10)

Money controls must meet WCAG AA (≥ 4.5:1 for text on button fills, ≥ 3.0:1 for
control borders). Where a token fails, **darken the fill** rather than lighten the
label, to preserve the YES/NO convention. Contrast is re-checked by
`scripts/` contrast tooling on any token change.

## B6 — A settled outcome is READ, never inferred

Added 2026-07-20 after users reported resolved cards contradicting the detail page.

`market-card.tsx` rendered the settled result as `yesPct >= 50 ? YES : NO`. `yesPct` is
`impliedYesPct()` — `yesPool / (yesPool + noPool)`, the crowd's **money split**. It is
mathematically unrelated to how the market settled. On any upset (crowd 70% on YES, market
resolves NO) the board displayed the **opposite of the truth**, while `/markets/[id]` — which
reads the real `resolvedOutcome` — displayed the correct one. A user clicked a card marked
"RESOLVED YES" and landed on a page saying NO. The card had no `resolvedOutcome` prop at all,
so it could not have been right except by luck.

**Measured on production before the fix: 4 of 8 sampled resolved markets displayed the wrong
outcome** — half the resolved board. Three were lopsided pools at 100% YES that settled NO, so
the card read "RESOLVED YES" while the detail page read NO. After the fix, 8/8 card↔detail
agreement live.

The rule: **the settled side comes from `PredictionMarket.resolvedOutcome` or it is not
shown.** Never derive it from a probability, a percentage, or a pool comparison. When the
outcome is unknown, render "RESOLVED" with **no** side — an absent side is recoverable, a
wrong side is a false statement about someone's money.

Note *why* it skewed: a lopsided market (everyone on one side) pins `yesPct` to 100/0, so the
inference was **most confidently wrong exactly where the pool was most one-sided** — and those
are the markets where a refund or an upset matters most to the people who staked.

This generalises: on a money surface, prefer showing nothing to showing a guess.

**Full-surface audit (2026-07-20) — the defect was isolated to `market-card.tsx`.** Verified
clean: `resolveMarket()` and the whole payout path take the officer-supplied outcome as input
(`winningSidePositions = filter(p => p.side === opts.outcome)`) and never infer; `/positions`
uses the stored per-position `status === "WIN"|"LOSS"` written at settlement; `/results`
counters filter on `resolvedOutcome`; the win-share OG card resolves its side from an
HMAC-signed token re-read from the ledger; emails/notifications never state a side. A codebase
sweep for pool comparisons (`yesPool > noPool` and friends) and percentage thresholds returns
**zero** hits outside the payout math itself.

Two enforcement layers:

- **`scripts/outcome-display.test.mts`** (`npm run test:outcome`, in `test:all` + `predeploy`)
  — static. Fails on (1) a YES/NO ternary keyed off *any* probability variable, raw percentage
  or direct pool comparison, (2) a `<MarketCard>` that can render RESOLVED without passing
  `resolvedOutcome`, (3) the card reintroducing inference. Verified to fail on both the
  original `yesPct >= 50` line and a `yesPool > noPool` variant, and to pass on the fix.
- **`scripts/outcome-parity.mjs`** (`npm run qa:outcome`) — behavioural, against the running
  site. For every resolved market on the board it opens the detail page and asserts the two
  outcomes agree. This is the check that would have caught the user report directly. Live
  result after the fix: **14/14 match**, including a VOID.

---

## B5 — One definition site per motion token; easings are bare curves

Added 2026-07-20 after motion was found **silently dead across the whole platform**.

`globals.css` defined `--ease-micro: 100ms cubic-bezier(…)` — a shorthand with the duration
baked in. `micro-patterns.css` loads *after* it and redefined the same name as a bare curve.
Last declaration wins, so every rule written as `transition: border-color var(--ease-micro)`
expanded to a transition with **no duration → 0s**. Input focus rings, selects, textareas,
tabs, button shadows, progress bars and the probability-chart crosshair all snapped instantly.
Nothing errored. The same shadowing set `--dur-stage` 820ms → 240ms (countdown ring and chart
draw-in ran 3.4× too fast), killed all four chat easings (the AI panel had **zero** motion),
and let a button drop-glow overwrite the ambient badge `--glow-gold`.

The rules:
1. **A motion/elevation token is defined in exactly ONE file.** `globals.css` owns
   `--ease-*`, `--dur-*`, `--glow-*`, `--shadow-*`. Other stylesheets *consume*, never redeclare.
   A stylesheet needing its own scale must **namespace** it (the chat layer uses `--cm-*`).
2. **Easing tokens are bare curves.** No duration baked in. Ever.
3. **Every `transition`/`animation` states a duration before the easing:**
   `transition: opacity var(--dur-micro) var(--ease-micro);`

Enforced by **`scripts/token-collision.test.mts`** (`npm run test:tokens`, in `test:all` and
`predeploy`). It fails on a cross-file duplicate, a duration-bearing easing token, or a
duration-less transition. It caught a real regression during its own introduction — the chat
`prefers-reduced-motion` block was still overriding the pre-rename token names.

**Honest scope of the 2026-07-20 fix.** The token layer was genuinely broken, but not every
repaired rule reaches a user — several are dead CSS with zero component usages. Measured:

| Repaired rule | Component usages | User-visible? |
|---|---|---|
| chat easings (`--cm-*`) | whole chat panel | **yes** — panel had *zero* motion |
| `.countdown-ring .ring-arc` | 3 | **yes** — 240ms → 820ms sweep |
| `.pchart-*` (draw-in, crosshair) | 2 | **yes** — draw 240→820ms, crosshair 0s→120ms |
| `.input` / `.select` CSS classes | 3 / 2 | partly — the `Input` **atom** uses Tailwind `transition-all duration-150`, not `.input`, so most fields were never affected |
| `.pbar-yes` / `.pbar-no` | **0** | no — dead CSS |
| `.win-seal`, `.badge-unlock-coin`, `.win-card-rare` | **0** | no — dead CSS (the `--ease-celebrate` phantom 600ms delay was real but unreachable) |

Do not cite this fix as "restored motion everywhere". It restored the token *contract*; the
visible delta is the chat panel, the countdown ring and the probability chart.

---

## B7 — The measure: every page states its width, once

Added 2026-07-28 after users reported that "sometimes the pages are too wide, and
the input fields as well". Both halves were true, and neither was anyone's
mistake — **there was no rule.** This file had B1–B6 and the design-system
`RULES.md` had 12 laws; neither mentioned width. The only statement anywhere was a
stale line in `CLAUDE.md` that the code did not match.

So width was a hand-typed string (`mx-auto max-w-[1280px] px-3 lg:px-6`) repeated
~60 times, drifted into **eight** page tiers where three were documented, and:

- `src/app/admin/layout.tsx` had **no cap at all** — all 43 admin pages rendered at
  `100vw − 216px`: 1,704px at 1920 and **2,344px at 2560**, while the player chrome
  above them was capped at 1280.
- The `Input` atom had a height, a radius, a border, a background… and **no width
  rule** (`size` is height-only). Every field was as wide as whatever page it
  landed on — `/admin/markets/new` measured **1,492px** text boxes.
- `notice-bar.tsx` was 1480 against 1280 chrome and renders only on an
  announcement / unconfirmed email / offline state. That is the **"sometimes"**.

**The rules.**

1. **Six tiers, and the numbers live in `globals.css` only.** `console` ·
   `board` · `reading` · `form` · `receipt` · `auth` (auth is the split-pane
   exception, not a general tier). `tailwind.config.ts` maps names onto the vars
   and adds no values of its own. This file deliberately does not restate them —
   a rule beside its value cannot be contradicted by a stale doc elsewhere.
2. **A page states its width through `<PageContainer tier>` and nothing else.**
   The tier is a TS union, so an invented width is a compile error, and it stamps
   `data-measure` so the width can be *measured* at runtime rather than trusted.
3. **A page and its `loading.tsx` state the same tier.** `/updown/[roundId]` was
   1232 against a 1080 skeleton — a 152px jump on every load that no test could see.
4. **A field never exceeds the measure its `<FormColumn>` sets.** `--field-max`
   defaults to `none`, so the cap is opt-in per form and an inline admin toolbar
   still flexes. Six atoms carry `.field-measure`; `OtpInput`,
   `DateTimeRangeFilter` and `TimeSelect` are documented exemptions and the guard
   asserts they *stay* exempt.

**Why it survived every QA cycle, which is the part worth remembering:**
`scripts/responsive-audit.mjs` asserted `scrollWidth ≤ clientWidth`, tap targets
and off-screen overlays. **Every one of those is a lower bound**, and the sweep
stopped at 1920. A 2,400px form scored a clean pass. A gate that can only detect
*too narrow* will never report *too wide*.

Two enforcement layers:
- **`npm run test:measure`** — static. Tokens defined once with the expected
  values; no new hand-typed width ≥500px outside a ratchet list that may only
  shrink; page/loading tier parity; the admin cap present; the field atoms and
  their exemptions.
- **`scripts/responsive-audit.mjs`** — behavioural, now **two-sided**: a 2560
  breakpoint, and per page "exactly one measure root, within its tier". Verified
  to fail on the reintroduced bug (`console 2344px > 1600px` on every admin route)
  and to pass on the fix.

## B8 — A token class must resolve, or it is a typo

Added 2026-07-28. **1,325 utility-class usages compiled to nothing**, platform-wide,
for the life of the project.

`globals.css` defined a four-step ink ramp; `tailwind.config.ts` never bridged
three of its steps. Tailwind only emits a utility for a key present in the theme,
and there is no safelist and `plugins: []` — so `text-text-subtle` (732 uses),
`text-text-muted` (433), `text-text-faint` (59), `text-royal-300` (56) and
`text-gilt` (the brand needle's own colour, with no family in the config at all)
were not utilities. They were typos that `tsc` cannot see and the build does not
warn about, and every one of those elements silently inherited its parent's ink.

The visible consequence: a **four-step hierarchy rendered as two**. Everything
written to recede — captions, hints, table headers, timestamps — did not recede.

**The rule: every colour-utility class must name a key that exists in
`tailwind.config.ts`. If a token has no key, bridge it or stop using it — never
leave the class in place hoping it renders.** Where the CSS variable does not
exist, fix the CALL SITE rather than invent a colour (`border-brand-700` →
`border-brand-600`; `border-info-700` → `border-info-500`).

Guarded by **`npm run test:bridge`**, verified to fail on the reintroduced bug.

Contrast was **proven, not assumed** — making the quiet steps render for the first
time is a real darkening, and law 9 of the design system names faint body copy as
a failure mode. `npm run test:contrast` now covers the ramp on every surface it
lands on: muted 12.67/12.33/12.51 · subtle 7.22/7.03/7.13/7.37 · **faint
4.87/4.74/4.81** — all above AA 4.5, with faint the tight one. A rendered DOM
sweep of 1,519 text nodes found one AA failure (leaderboard avatar initials,
1.44:1) which reproduces identically with the change stashed — pre-existing, and
recorded rather than quietly absorbed.

⚠️ Why the 2026-07-17 `DESIGN_AUTHORITY.md` signed this off as
"launch-ready": it grepped for rogue *values* — raw hex, off-palette classes — and
correctly found none. It never checked that the on-palette classes **resolve**. A
dead class is invisible to a value audit.

---

## B9 — One design system. New design merges in; it never sits beside.

Added 2026-07-29. Every design change lands in the **canonical home** for its kind and
nowhere else: a *value* in `globals.css` (bridged in `tailwind.config.ts`), a *utility class*
naming a key that exists (B8), a *new state* as a **prop on the existing component**, and the
*written spec* in the matching `02-components/<name>/spec.md` + `07-provenance/CHANGELOG.md` —
in the same change. Search before you add; no new `.css` file, ever.

**Full law, with reasons and failure modes:**
`docs/design-system/v2-2026-07-27/06-patterns-and-rules/MERGE-DISCIPLINE.md` (also RULES.md law 15).

Why it exists: the product has been bitten three times by *parallel* design — the dead
`micro-patterns.css` shadow kit, the superseded teal `design_handoff` kit, and the 1,325
utility classes that resolved to nothing (B8). Each was a **second place a design truth could
live**. A truth in two places drifts, and on a money product drift means the board and the
detail page can disagree about someone's stake — which already happened (B6).

## B10 — The system is COMPLETE and FROZEN. Edges, shadows, popups — decided once.

Added 2026-07-29. Every visual primitive is decided once, in the system, and components only
*consume* it: edges (`--border`, `-strong`, `-royal`, `-gold`, `-control`), the elevation ladder
(`--shadow-1..5`, `--shadow-card`, `--shadow-card-top`, `--shadow-modal`, `--shadow-overlay`),
the radius scale, the popup primitives (`Modal` / `ConfirmModal` / `OperationResultModal` /
`Toast` / `Tooltip`), and motion/focus (one definition site per token — B5).

You change a look by editing its **token or spec in the system**, and every consumer updates at
once. You do **not** reach into a component for a border, a shadow, or a popup again. If a
component needs a look the system lacks, **the system gains the token + spec** — not the
component a one-off.

Guarded by `npm run test:design-frozen` (static, ratchet — the allowlist may only shrink),
alongside `test:tokens` and `test:bridge`.

**Full law:** `06-patterns-and-rules/MERGE-DISCIPLINE.md` (also RULES.md law 16).

### What the freeze pass found — do not undo these

The 2026-07-29 pass (LIVE on `main`) found that **three gates were passing while the
thing they guarded was broken.** Each fix is load-bearing:

1. **`scripts/contrast-audit.mts` now PARSES `globals.css`.** It used to hand-mirror the
   token values with a comment saying "update both together" — they were not. Its copy
   said `--bg-elevated` was L=0.19 against a real 0.22. Consequence: `--text-faint` on
   every elevated card measured **4.50, under the 4.5 AA floor**, while the gate printed a
   comfortable 4.74. **Do not "simplify" it back to hardcoded values.**
2. **`--text-faint` is 62%, and that is an accessibility floor, not a style choice.**
   Darkening it requires re-running `test:contrast`, which now tells the truth.
3. **`test:bridge` checks `shadow-*` against `boxShadow`,** not the colour map. Tailwind
   resolves it there; the old check made `shadow-overlay` pass only by colliding with a
   key in the `bg` family while correctly-bridged rungs were reported dead.

Two more standing rules from the same pass:

4. **The numeric `borderRadius` scale in `tailwind.config.ts` is frozen as LEGACY.**
   `rounded-md` is 8px while `--r-md` is 12px — they disagree. Reconciling them shifts
   every corner in the product, so it was deliberately deferred. New design uses the
   semantic `rounded-card` / `control` / `chip` / `modal`. **Do not renumber the scale.**
5. **Cold-start is ONE rule with THREE consumers.** The board, the market card and the
   detail page each derive it as `volume === 0 && predictors === 0` on a live, open
   market. The detail page shipped a fabricated 50/50 split and a "TIPPING" badge above
   "TZS 0" until this pass. If the rule changes, change all three — a card and a detail
   page disagreeing about someone's money is exactly the defect B6 exists for.

---

## M — The material law (M1–M8)

Merged 2026-08-07 from the accepted Claude Design commission (ATOM J). The measured state it
corrects: 79% of components had no light, 60% no elevation, 43 had neither and no motion. The
restraint law was right; answering it with flatness was the defect. Where these rules differ
from the delivery, the difference was **measured first** and recorded in
`docs/design-system/v2-2026-07-27/11-material/material.css` (header) — the law below states
what SHIPPED, which wins.

### M1 — One lamp

Light comes from high above the plane, tilted **−14°** — the mark's own axis (`--m-tilt`).
Every lit surface catches a soft, **even** 1px inner ring (`--edge-lit`) carrying a 4% royal
tint, never pure white — and never a one-sided line. The direction of the light lives in the
wash (`--light-angle`, 166deg); speculars centre at x ≈ 42%; shadows fall straight down.
**The tilt lives in the light, never in the gravity.** There is no second lamp; a surface lit
from below or from the right is a bug — including a `.tsx` inline style, which is where the
last seven lived (E-131). Guard: `npm run test:m1-light` — 0 lamps over 6 stylesheets **and**
the full component corpus (`scripts/m1-corpus.mjs` is the one file list).

### M2 — A surface picks a rung; it never composes a shadow

Five rungs: `flat → raised → float → modal → toast` (`--elev-*` + `--wash-*` in
`globals.css`, `.mat-*` in `motion.css`). A component takes a rung and is done. If it
genuinely needs a sixth rung, the SYSTEM gains one (token + spec, deliberately) — the
component does not improvise. `flat` is a legitimate rung (form rows, pollers, containers),
not a failure.

- **Every wash's lit stop is capped at 24%** (E-130) — solved from the ink floors
  (`--text-faint` 4.5, `--border-control` 3.0), not chosen. The ladder rises on the cast and
  the ring; the wash's one job is direction.
- **Tint is rung-independent**: `.mat-tint-yes/-no/-warn/-gold/-brand` compose a ring into
  ANY rung through the `--mat-tint` slot. (The delivery's `.mat-edge-*` welded a toast-level
  cast to whatever it touched — the D-6.6 send-back.)
- A surface taking `.mat-float` or `.mat-toast` **drops its own border** (those rungs carry
  an outer ring); `.mat-modal` does **not** — its cast carries only the inset edge.
- Each rung pairs with its arrival and every arrival has its exit: raised → `.m-in-lift`/
  `.m-out` · float → `.m-float-in`/`.m-float-out` · modal → `.m-dialog-in` or `.m-sheet-in`/
  `.m-out` (scrim `.m-scrim`) · toast → the toast component's own transition. There is no
  third entrance.

### M3 — Gold is struck, and struck means earned

Gilt renders as satin metal — one calm `--gilt-metal` ramp anchored on the **measured**
trademark: `#E3BC66` = `oklch(81.2% 0.1141 85.4)`, written at hue **84** (E-124 — the
delivery's `0.095` figure round-trips to a duller `#D7B672`; every gilt chroma shipped
×1.2011). An even `--gilt-metal-edge` ring; one soft `shimmer-gilt` specular sweep on hover
(a per-layer keyframe — do not "simplify" it back to one value, the metal slides off the
button). **No bloom** — radial glow dilutes the financial texture; **rays are banned**.
The usage law has teeth: **struck gold appears only where money was earned** (payout,
celebration, resolved seal). A decorative element wearing `--gilt-metal` is a violation, not
a style choice. And `.gilt-metal:focus-visible` **keeps a real `outline`** (E-129): a
box-shadow ring is invisible in forced-colors, and this class lands on the Deposit button.

### M4 — Money is mono, and it never reflows

Every amount: `--font-mono`, `tabular-nums`, **never letter-spaced** — tracking is for
identifiers; money has weight, so at the earned peak it takes `.gilt-ink` (struck type,
glow at the measured 84/0.114). A motion on a changing number must not shift layout; verify
with tabular figures. (D-0's table listed `--font-display` for the celebration amount —
mono won, amended at source.)

### M5 — A glyph moves for a reason, and all 178 move the same way

Four primitives, applied as classes (`.g-settle`, `.g-nudge-up/-down`, `.g-ring`,
`.g-swap*` — state morphs go through the kit `GlyphSwap`, `ui/glyph-swap.tsx`): arrival,
directional emphasis, alert, state morph. Triggers are mount, data change, or state change —
**never hover**; icons respond, they do not perform. The nudges fire on a data CHANGE only,
never on mount. In-flight is the kit `Spinner`, not a spinning glyph. Glyph #179 inherits by
taking a class; a glyph with bespoke keyframes is a violation. Static glyphs stay static —
this law governs motion, it does not demand it. Guard: `npm run test:glyph-motion`.

### M6 — Every animation still works with motion off — and there are THREE gates

1. **`@media (prefers-reduced-motion: reduce)`** — the OS setting. The universal clamp
   zeroes duration **and delay** (E-126 — with only duration zeroed, a delayed animation
   holds its invisible first frame for the whole delay).
2. **`html.kp-reduce-motion`** — the user's own in-app setting, a written mirror of every
   branch.
3. **`[data-motion="reduced"]`** — the low-end-Android tier (`theme-provider.tsx`
   `detectLowEnd()`: ≤4 cores, ≤4GB RAM, or Save-Data). **A THROTTLE, not a clamp**: full
   durations, ambient loops off. Its one list lives in `globals.css` §6, and every
   `infinite` animation needs an entry there.

Every `.mat-*`/`.g-*`/`.seal-*`/`.crest-*` state has written branches for the two clamps:
end frames render, nothing invisible, the bloom rests at 0.35. A new animation lands with
its branches in the same change or it does not land. The delivery named only the first two
gates; this product has three (E-125) — our target device is exactly the one the third
covers. Guard: `npm run test:reduce-motion`.

### M7 — Wins get the seal; losses get the receipt

The celebration vocabulary (seal-impress, needle-sweep, mark-flip, gilt strike) is
EXCLUSIVE to a win. A loss renders as bookkeeping: the factual toast (plain rung 4, no
color, no tick), the settled card leading with the outcome, the needle settling crisply
against the position. No red ceremony, no drained counters, no altered mark — a dramatized
loss is punitive, dilutes the win, and is a compliance liability. The asymmetry is the
design (designer R2 Q5, confirmed).

### M8 — The mark performs; nothing else borrows its stage

Identity motion (mark-flip on the needle axis, `.mark-pending`'s ambient breath — listed in
the frozen ambient-loop set and in the third gate's list) is reserved for the trademark. The
mark's colours stay the delivered hexes (#1EA362 / #B03A3E / #E3BC66) in chrome; on the seal
it renders single-ink relief. Clear space 0.25 × diameter is law even inside our own seal —
76px on a 114px face is the ceiling, not a style choice. Surface gold is the trademark
re-derivation (M3); the two never drift because they share one source. `--m-pivot` is
reserved for the needle and dials — `.g-ring` takes `--m-glide` (a bell is neither).

---

## Related

- Palette rationale & history: `docs/design-master-brief.md`
- Merge discipline / frozen system (B9, B10): `docs/design-system/v2-2026-07-27/06-patterns-and-rules/MERGE-DISCIPLINE.md`
- Superseded snapshot (do not use): `50PICK/design_handoff_prediction_market_kit/`
- Brand identity assets: `public/brand/` (generated from `src/components/brand.tsx`)
