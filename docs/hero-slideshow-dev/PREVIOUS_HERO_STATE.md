# Previous Hero State — How to Revert

The landing page hero was changed from the interactive constellation
(Tipping Field with 7 market dials, drift particles, verdict tape) to
a full-bleed background image with text overlay.

## To restore the constellation hero

```bash
git checkout 1001040 -- src/app/page.tsx
```

This restores `page.tsx` from commit `1001040` which has:
- Two-column grid layout (text left, constellation right)
- `HeroConstellation` component with 7 animated market dials
- Drift particles (8 mobile, 18 desktop)
- Verdict tape rotating every 6s
- The `import { HeroConstellation }` line

The constellation component itself is untouched at:
`src/components/landing/hero-constellation.tsx`

## Current state (full-bleed image hero)

- Single full-width hero section (75vh)
- Background image (`/hero/hero-bg.webp`) with CSS filter
- Directional gradient overlay (dark left, transparent right)
- Text with drop shadow for readability
- No constellation, no tipping field
- Market cards + trust strip in centered container below
