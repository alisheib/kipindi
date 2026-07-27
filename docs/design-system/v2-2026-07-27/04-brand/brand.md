# 50pick brand — rules (GIVEN, kit/brand.jsx)

## The mark (FiftyMark)
Circle r50 (viewBox 100), divider tilted **−14° from vertical**; YES wedge upper-left `oklch(58% 0.16 152)`, NO wedge lower-right `oklch(60% 0.18 22)`; divider stroke 2.4 + outer ring 2.0 in `oklch(20% 0.01 240)`; "50" JetBrains Mono 700, 30/100 of the diameter, ls −0.04em, `oklch(96% 0.005 240)`, centred on the divider.
Variants: `mono` (near-black wedges 20%/50% L) and `mono inverted` (pearl wedges on dark) — exact values in brand.jsx.

## Wordmark (FiftyWordmark)
"50pick" Sora 700, ls −0.03em + ".tz" JetBrains Mono 500 at 0.55× size, 0.04× left gap, 70% opacity.

## Lockup (FiftyLockup)
Mark at 1.18× the wordmark font-size, gap 0.32×, vertically centred.

## Sizes & clear space
- Mark minimum 24px (favicon 16px is the one tolerated exception).
- Wordmark minimum 14px font-size.
- Clear space: ≥ 0.25× mark diameter on all sides (INFERRED — no explicit rule was given; flagged in OPEN-GAPS).

## Never do this
- Never re-hue the wedges — YES/NO colours are semantic and untouchable.
- Never remove the tilt or set the divider vertical (a 50/50 split with no lean is not the brand story).
- Never put the mark on gold, or fill any part of it gold — gold is earned money, not identity.
- Never a light-theme variant of app surfaces around it; the canvas is the one dark royal indigo.
- Never emoji next to the lockup; never drop the ".tz" below 10px.
- The idle mark may breathe (mark-breathe, 6s, ±0.6° / 1.015 scale) — never spin, never bounce.

## Signature shapes
TippingBar and ConfidenceDial are brand-signature data-viz (see 02-components/tipping-bar-and-dials). The gilt needle is the same object everywhere: --bar-needle / --bar-needle-glow.

## Banners
BannerHero / BannerSocial / BannerLaunch / BannerRegulator exist as kit specimens in brand.jsx (1600×540 hero radial recipe is quoted in tokens.css --hero-grad comments). Not re-rendered here — source is authoritative.
