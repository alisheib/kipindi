# Hero Slideshow — Postponed (ready to activate)

Full-bleed Ken Burns image slideshow for the landing page hero. Winning
moments (trophies, champagne, celebrations) rotate behind the headline.
Postponed until professional video/images are ready.

## Status: NOT APPLIED

The component and images are stored here for reference. Nothing in `src/`
or `public/` is active. When ready to activate:

1. Copy `hero-slideshow.tsx` to `src/components/landing/hero-slideshow.tsx`
2. Copy images from `public/hero/slides/` (already in place)
3. In `src/app/page.tsx`:
   - Import: `import { HeroSlideshow } from "@/components/landing/hero-slideshow";`
   - Remove `HeroConstellation` import
   - Wrap the hero `<section>` with `<HeroSlideshow />` as first child (z-index 0)
   - Set hero section to `position: relative; overflow: hidden; min-height: 80vh`
   - Set content div to `position: relative; z-index: 2`
4. Tune overlay opacity in `hero-slideshow.tsx` line ~216 to taste

## Files

| File | Purpose |
|---|---|
| `hero-slideshow.tsx` | React component — Ken Burns slideshow with crossfade |
| `HERO_VIDEO_BACKGROUND_SPEC.md` | Full spec (video vs images, all edge cases) |
| `public/hero/slides/*.jpg` | 20 stock images (Pexels, free commercial license) |
| `Test Images/` | User's reference images (not for production) |

## Image replacement

When professional images/video arrive:
- **Images:** Replace files in `public/hero/slides/`, update SLIDES array in component
- **Video:** Replace the entire component with a `<video autoplay muted loop playsinline>` element

## Spec document

See `docs/HERO_VIDEO_BACKGROUND_SPEC.md` for the complete specification covering
content requirements, technical implementation, performance budgets, mobile
strategy, accessibility, and browser compatibility.
