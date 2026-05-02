# Kipindi — Logo Specification

> Original mark, designed for this brief. Geometric, calm, distinctly **not** the loud red-and-yellow gambling vernacular.

---

## 1. The Idea

The mark is a **time window** — the central mechanic of the product — drawn as a circular arc segment. The arc spans 270° (three of four quadrants) over a flat baseline, like a clock face with one quadrant left open. The open quadrant is "the window of play" and is filled with a single gold dot at its center.

- Arc colour: Royal Blue `#1E3E94`
- Open-quadrant dot: Gold `#B58A21`
- Wordmark: `Kipindi` — Sora Semibold, optical-aligned to the arc baseline.

This reads, at small sizes, as a stopwatch fragment with a gold pin. It is **never** to be drawn as: a soccer ball, an acacia tree, a sun, a coin, a die, or a horseshoe.

---

## 2. Construction Grid

Built on an **8×8 unit grid** (1u = 8px at 64px reference height).

```
Reference height:  64u  (8u grid × 8 cells)
Arc:               outer radius 24u, inner radius 19u, stroke 5u
Arc sweep:         from 0° (3 o'clock) clockwise to 270° (12 o'clock open)
Dot:               radius 4u, centred at (x = +14u, y = -14u) from glyph centre
Optical centre:    glyph rendered 1u above geometric centre to balance dot
Wordmark x-height: 18u, cap-height 26u, baseline aligned to arc baseline
Glyph–wordmark gap: 12u
```

SVG (drop directly):

```svg
<svg viewBox="0 0 256 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kipindi">
  <g transform="translate(32,32)">
    <!-- 270° arc, opens at top-right quadrant -->
    <path d="M 24 0 A 24 24 0 1 0 0 -24" fill="none" stroke="#1E3E94" stroke-width="5" stroke-linecap="round"/>
    <!-- gold dot in open quadrant -->
    <circle cx="14" cy="-14" r="4" fill="#B58A21"/>
  </g>
  <text x="72" y="42" font-family="Sora, Inter, sans-serif" font-weight="600" font-size="32" fill="#0A1838" letter-spacing="-0.5">Kipindi</text>
</svg>
```

---

## 3. Lockups

| Lockup | Use | Min width |
|---|---|---|
| **Primary (horizontal)** — glyph + wordmark | Web header, app top bar, marketing | 96 px |
| **Stacked** — glyph above wordmark | Square placements, OG cards | 64 px |
| **Monogram** — glyph alone | App icon, favicon, social avatar, watermark | 16 px |
| **Wordmark only** | Email footers where the glyph would be visually redundant | 88 px |

---

## 4. Clear Space

Minimum clear space on **all sides** = the height of the gold dot (4u at reference, scaling proportionally). No other element — text, image, edge — may enter this zone.

---

## 5. Minimum Sizes

| Asset | Min height (digital) | Min height (print) |
|---|---|---|
| Primary lockup | 24 px | 12 mm |
| Stacked | 32 px | 14 mm |
| Monogram | 16 px | 6 mm |

Below these sizes, swap to a simpler version (monogram only).

---

## 6. Colour Variants

| Variant | Glyph arc | Glyph dot | Wordmark | Use |
|---|---|---|---|---|
| **Primary** | `#1E3E94` | `#B58A21` | `#0A1838` | Light surfaces |
| **Reverse** | `#FFFFFF` | `#DEBC54` | `#FFFFFF` | Dark / photographic surfaces |
| **Mono dark** | `#0A1838` | `#0A1838` | `#0A1838` | Single-colour print |
| **Mono light** | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | Knockouts |
| **Gold treatment** | `#DEBC54` | `#FFFFFF` | `#DEBC54` | Premium / win-share contexts only |

Never recolour the wordmark independent of the glyph except in the explicit variants above.

---

## 7. Incorrect Usage (do **not**)

1. Do not stretch, skew, or rotate the glyph.
2. Do not fill the open quadrant with anything other than the dot.
3. Do not add a stroke around the wordmark.
4. Do not place the gold dot outside the open quadrant.
5. Do not use red, green, or rainbow gradient on the mark.
6. Do not pair the mark with cartoon mascots, dice, money piles, or fireworks.
7. Do not place primary mark on photographs without a 70 % black scrim or solid plate.
8. Do not animate the wordmark; only the dot may animate (slow 4 s pulse).

---

## 8. App Icon

- **Master:** 1024 × 1024 px PNG.
- **Background:** `linear-gradient(135deg, #102356 0%, #1E3E94 100%)` with a subtle 8 % opacity Maasai-derived diamond pattern (see `DESIGN_SYSTEM.md §2.1` Pattern Library — pattern #2 "Sokoni").
- **Glyph:** monogram, white arc + gold dot, centred, sized to 60 % of canvas.
- **iOS:** square master, system applies rounded corners (no pre-rounding).
- **Android adaptive:** foreground layer = monogram glyph at 432 × 432 dp (within 108 dp safe zone); background layer = the gradient + pattern.
- **Notification icon (Android):** monochrome white silhouette of the arc + dot, 24 dp, no background.

---

## 9. Splash Screen

Full-bleed `brand-hero` gradient (`#060F24 → #102356 → #1E3E94`, 135°). Stacked monogram + wordmark, centred, 33 % of the shorter viewport edge. No taglines, no spinners on first paint — load progress is a 1 px gold line at the bottom edge that fills left-to-right.

---

## 10. Favicon Set

| Size | Format | Notes |
|---|---|---|
| 16 × 16 | ICO + PNG | Monogram, slightly thickened arc (stroke 6u at 16px) for legibility |
| 32 × 32 | ICO + PNG | Standard monogram |
| 180 × 180 | PNG (apple-touch) | App-icon background + monogram |
| 192 × 192 | PNG (manifest) | App-icon background + monogram |
| 512 × 512 | PNG (manifest) | App-icon master |

`mask-icon` (Safari pinned tab): solid `#1E3E94` silhouette of the monogram only.

---

## 11. Open Graph Template (1200 × 630)

Five layout variants:

1. **Homepage** — brand-hero gradient, stacked logo top-left, tagline bottom-left, single gold accent line from logo to bottom-right corner.
2. **Match** — left half: home team badge placeholder + name; right half: away team; centre: small monogram + match window pill; gold underline.
3. **Win-share** — full-bleed `gradient.streak-aurora`, large gold flip-clock number (return amount, NEVER stake), monogram bottom-centre. **No PII** — never user name, never username; only first-initial + last-initial avatar at most.
4. **Leaderboard** — top 3 avatars in a triangle composition, gold rank chevrons, monogram bottom-right.
5. **Generic** — brand-hero gradient with one of the three brand patterns (`Mwangaza`, `Sokoni`, `Mfumo`) at 6 % opacity, centred monogram + wordmark, no other text.

Safe area: 60 px from each edge. Right-side 480 px reserved for Open Graph crop on link unfurls.

---

## 12. Email Header Banner

600 × 120 px. White background, primary lockup left-aligned at 24 px from edge, vertically centred. Right edge has a 4 px gold rule running the full height. No imagery.

---

## 13. Social Avatars

1:1 ratio, monogram on `#1E3E94` solid (no gradient — gradients lose to platform compression). 8 % padding inside the safe circle that platforms crop to.

---

## 14. Animation Rules

- Only the **gold dot** animates.
- **Idle:** scale 1.00 ↔ 1.06 over 4000 ms, ease `standard`. Opacity 1.0 ↔ 0.85.
- **Loading:** dot travels around the arc once over 1200 ms, ease `decelerate`, then snaps back to home position.
- **Win moment (one-shot):** dot scales 1.00 → 1.6 → 1.0 over 600 ms with `gold-glow` shadow blooming and decaying.
- **Reduced motion:** all animations replaced by static dot at scale 1.0.

---

## 15. File Bundle (delivered separately)

```
/brand
  /logo
    kipindi-primary.svg
    kipindi-stacked.svg
    kipindi-monogram.svg
    kipindi-wordmark.svg
    kipindi-primary-reverse.svg
    kipindi-mono-dark.svg
    kipindi-mono-light.svg
    /png
      kipindi-primary@1x.png  (96w)
      kipindi-primary@2x.png  (192w)
      kipindi-primary@3x.png  (288w)
  /app-icon
    master-1024.png
    ios-1024.png
    android-foreground.png
    android-background.png
    notification-24.png
  /favicon
    favicon.ico
    favicon-16.png  favicon-32.png
    apple-touch-180.png
    manifest-192.png  manifest-512.png
    safari-mask.svg
  /og
    og-home.png  og-match.png  og-win.png  og-leaderboard.png  og-generic.png
  /email
    email-header.png
  /social
    avatar-1024.png
```
