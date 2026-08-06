# 50pick identity pack — the four things you asked for

**Prepared 2026-08-06, in answer to the identity questions raised with the last delivery.**
Everything here is the *shipped* source, not a description of it.

---

## ⛔ Read this first — the mark is not what the reconstruction assumed

Your stand-in was **"the '50' on royal enamel over the −14° baton."** The real mark has
**no numerals and no baton.** From `src/lib/brand-mark.ts`, which is the single definition
(audit C11) shared by the React component and the asset generator:

> *A circle split **YES-emerald LEFT · NO-rose RIGHT** by a diagonal chord, the **gilt NEEDLE**
> riding the seam past the rim, over a **gilt hub with a navy pivot**. No ring, no numerals.*
> **The wordmark carries the name.**

Three consequences, and the first is the one that matters:

1. **The "baton" is a NEEDLE, and it is the same object as the product's `TippingBar` needle and
   the conviction dial.** It is not decoration — it is the instrument that shows which way a
   market is leaning, reused at brand scale. Anything you build on it should read as *that
   instrument*, not as a graphic element.
2. **There is no "50" glyph in the mark.** A coin face bearing the numerals would contradict the
   canon. The name lives in `FiftyWordmark`, and the lockup (`FiftyLockup`) is mark + wordmark.
3. ⭐ **Your coin-flip gesture is still right — better than right.** The mark *is* a disc split
   into the two sides of a prediction, pivoting on a needle. A flip is the mark's own metaphor.
   It just has to flip **this** disc, on **this** axis, with the needle as the hinge.

---

## 1 · The real logo SVG — `svg/`

| file | use |
|---|---|
| `mark-color.svg` | full colour, dark canvas — **the primary** |
| `mark-white.svg` | single-ink white — dark canvas, photos via plate |
| `mark-dark.svg` | single-ink royal — light backgrounds, print |
| `mark-simplified.svg` | heavier needle + hub, **no pivot dot** — REQUIRED at ≤ 20px |
| `favicon.svg` | the simplified mark, as shipped |

**Reproduction rules, from the component's own header** — these are law, not preference:

- minimum **full** mark **24px** · minimum **simplified** mark **14px**
- clear space **0.25 × diameter**
- below 24px the component switches to `simplified` **automatically** (`simplified ?? size < 24`)

⚠️ **Do not hand-edit the SVGs.** `source/brand-mark.ts` is the one definition; the SVGs and every
PNG are generated from it by `scripts/build-brand-assets.mts`. Editing an asset directly is how
the PWA icon and every outbound email once shipped a superseded round-1 logo. **Change the source,
regenerate.**

### The literal geometry and colour

```
greenPath  M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z      (YES, left lens)
redPath    M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z      (NO, right lens)
needle     x1 38.39  y1 3.43  →  x2 61.61  y2 96.57      stroke 3.5 (5 simplified), round caps
hub        cx 50 cy 50 r 5 (6 simplified)
pivot      cx 50 cy 50 r 1.7        ⛔ dropped in the simplified variant
viewBox    0 0 100 100

green  #1EA362   red  #B03A3E   gold  #E3BC66
pivot/darkInk  #1A2140   whiteInk  #F7F8FC   tile background  #0A0B50
```

⚠️ **These hexes are deliberately hex and deliberately not the theme tokens.** `DESIGN_AUTHORITY`
B1: **brand identity ≠ theme tokens.** The product's palette is royal-268 `oklch()`; the *mark* is
the delivered brand identity and its colours are authoritative as given. **Do not "correct" the
mark's gold to the champagne-satin `--gilt` recipe** — the mark keeps `#E3BC66`. The satin story
is for surfaces, not for the trademark.

---

## 2 · The −14° axis — measured from the artwork, and it is exact

The axis is **the needle in the mark**, and `--m-tilt: -14deg` was derived from it rather than
chosen. From the shipped coordinates:

```
dx = 61.61 − 38.39 = 23.22
dy = 96.57 −  3.43 = 93.14
angle from vertical = atan(23.22 / 93.14) = atan(0.249302) = 13.998°
```

⭐ **13.998° — so −14deg is accurate to three significant figures, and every token built on it is
quoting the artwork correctly.** The sign is negative because the needle's **top leans left** of
centre (x 38.39 against a centre of 50) and its bottom leans right; a CSS `+14deg` would mirror it.

The token and everything derived from it live in `source/motion.css`:

```
--m-tilt: -14deg;   /* THE axis. Same angle as the divider in the mark. */
@keyframes m-axis-sweep { 0% { transform: translateX(-160%) skewX(-14deg); } … }
```

⚠️ `m-axis-sweep` writes `-14deg` literally rather than `var(--m-tilt)` — a `skewX()` inside a
keyframe cannot take the custom property in every engine we support. **If you touch the axis,
that keyframe must move with it**, and it is the one place the number is duplicated.

---

## 3 · Fonts — Sora is correct, and here is the full stack

**Yes: Sora is the display face.** Loaded twice on purpose (`next/font/google` for the CSS
variable and self-hosting, plus a `@import` in `globals.css` as the non-JS fallback).

| role | family | token |
|---|---|---|
| **display** | **Sora** 400/500/600/700/800 | `--font-display` |
| body | Inter 400/500/600/700 | — |
| numerals / money / code | JetBrains Mono 400/500/600 | — |
| CJK | see `--font-cjk` in `globals.css` | `--font-cjk` |

`--font-display: 'Sora', system-ui, var(--font-cjk), sans-serif;`
`.display { font-family: var(--font-display); letter-spacing: -0.02em; }`

**Licence:** all three are **Google Fonts, SIL Open Font License 1.1** — free for commercial use,
embedding and web serving, with no attribution requirement in the UI. There is no proprietary or
licence-restricted face anywhere in the product. ⚠️ The **wordmark is set in Sora**; it is not a
separate lettered logotype, so there is no third file to license or match.

---

## 4 · App icon, favicon and the crest — `png/` and the crest note

| file | what |
|---|---|
| `png/mark-color-512.png` | the mark, 512, transparent |
| `png/icon-192.png` · `png/maskable-512.png` | PWA — maskable carries the royal tile + safe-zone padding |
| `png/apple-touch-180.png` | iOS home screen |
| `png/email-signature.png` | outbound email lockup |
| `svg/favicon.svg` | + `public/favicon.ico`, `favicon-16/32.png` in the repo |

The opaque tile is `FiftyTile`: `oklch(19% 0.14 268)` in-app, `#0A0B50` where a rasteriser needs
hex, radius `0.225 × size`, mark at `0.72 × size`.

### ⚠️ The crest is a SECOND, separate system — do not conflate it with the mark

`src/components/ui/identity-avatar.tsx` generates a **per-player heraldic crest** — four crest
kinds, deterministic PRNG per seed, gilt chief with pips, tier rings, dependency-free SVG rendered
on the server. **It is a player identity system, not the brand mark**, and the two must not borrow
from each other.

- ✅ **E-111 fixed its geometry** on 2026-08-06: every stroke rendered sub-pixel (0.16–0.64px) at
  all six sizes, so the heraldic layer had never once been visible. Each stroke now carries a
  1-CSS-px floor and `test:crest-legibility` guards it. ⛔ **Do not re-fix the geometry.**
- ▶ **Still open and yours:** the chief's **band opacity** and the crest's **material and
  arrival** — that is the material system, not a geometry bug.

---

## What is in this pack

```
identity/
  README.md          ← this file
  svg/               the four shipped mark variants + favicon.svg
  png/               app icon, PWA, apple-touch, email lockup
  source/
    brand-mark.ts    ⭐ THE one definition — geometry + colours (audit C11)
    brand.tsx        FiftyMark · FiftyTile · FiftyWordmark · FiftyLockup · TippingBar · ConfidenceDial
    motion.css       the axis token, the easing/duration ladder, the keyframes
```

⭐ **`source/brand.tsx` is worth opening even though you did not ask for it.** `TippingBar` and
`ConfidenceDial` are the *same needle on the same axis* at product scale — the mark is not a logo
that happens to sit near the UI, it is the UI's own instrument reduced. If the coin-flip and the
seal read as members of that family, the identity closes.

---

## The one thing to send back if you can

The flip needs to be **the mark's own** flip: the disc rotating on the **needle axis** (−14° from
vertical), with the needle as the hinge rather than a highlight sweeping across a coin. If that
changes what you built, it is worth the change — and if the geometry above makes it cheap, please
also quote the real angle (13.998°, tokenised as `-14deg`) wherever the spec currently says
"−14° baton", so the document and the artwork agree.
