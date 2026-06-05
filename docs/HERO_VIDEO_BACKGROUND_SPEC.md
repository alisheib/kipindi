# Hero Background: Video Loop vs. Alternating Images

> Comprehensive specification for replacing or augmenting the landing page hero
> background. Covers both approaches, all edge cases, content requirements,
> technical implementation, and a recommendation.

---

## Current state

The hero is **not** a static image. It's a 655-line interactive component
(`src/components/landing/hero-constellation.tsx`) called "The Tipping Field":

- Pure CSS radial gradient background (royal indigo, no image/video)
- 7 animated market dials with hover interactions
- Drift particles (8 on mobile, 18 on desktop)
- Rotating verdict tape showing recent results
- All rendered in SVG + absolute-positioned divs
- Highly optimized: animations pause on tab hide, particle count adapts to viewport

**The constellation is the brand centrepiece.** Any video/image treatment must
work *with* it, not replace it entirely — unless the decision is to retire it.

---

## Two approaches

### Approach A: Video background behind the constellation

The video sits behind everything — a full-bleed ambient layer underneath the
existing gradient + constellation. The constellation floats on top with its
current semi-transparent radial background, which now composites over moving
footage instead of a flat colour.

### Approach B: Alternating images (Ken Burns slideshow)

A sequence of high-quality still images that crossfade with slow pan/zoom
(Ken Burns effect). Same layering as Approach A but with static assets
instead of video. Lighter on bandwidth, easier to source content.

### Approach C: Hybrid (recommended)

- **Desktop (lg+):** Video loop behind constellation
- **Mobile (<1024px):** Alternating images with Ken Burns effect
- **Slow connection (Save-Data header / prefers-reduced-motion):** Single static image

This gives the premium feel on desktop where bandwidth and GPU are available,
while keeping mobile performant and accessible.

---

## Content requirements

### For video (Approach A / C desktop)

| Requirement | Specification |
|---|---|
| **Duration** | 20–30 seconds total, seamless loop (first and last frames must match) |
| **Resolution** | 1920x1080 minimum, 2560x1440 preferred |
| **Format** | MP4 (H.264, Main profile) + WebM (VP9) for browser coverage |
| **File size** | Target 3–5 MB for the MP4 (aggressive CRF compression, ~28-30) |
| **Frame rate** | 24fps (cinematic feel, smaller file) |
| **Audio** | None. Strip all audio tracks. Muted autoplay requires no audio. |
| **Colour treatment** | Desaturated 40–60%, darkened to ~30% brightness, slight blue/indigo tint to match brand canvas. The video should feel like looking through tinted glass. |
| **Content pace** | Slow. No fast cuts. 3–5 second clips with 1s crossfade dissolves. Movement should be ambient — crowds swaying, tickers scrolling, rain falling — not action replays. |
| **Loop point** | Use a 2-second dissolve at the loop point so there's no visible jump. |

**Clip categories needed (3–5 seconds each, 5–7 clips total):**

| Category | Example clips | Why |
|---|---|---|
| **Sports** | Stadium crowd celebrating, football goal net rippling, F1 cars on grid (not racing — static tension), boxing ring before a fight | "Sports" is the primary market category |
| **Finance / Macro** | Stock ticker scrolling, trading floor wide shot, currency notes being counted, Dar es Salaam skyline at dusk | Reinforces "prediction" and "money" |
| **Weather** | Dramatic cloud formations, rain on a window, sunrise timelapse over Kilimanjaro or Indian Ocean | Weather is a market category |
| **Crypto** | Abstract blockchain visualization, gold Bitcoin coin rotating slowly, candlestick chart scrolling | Crypto is a market category |
| **Culture** | Concert crowd with stage lights, Diamond Platnumz performing (if licensable), Bongo Flava studio session | Culture is a market category |
| **Tanzania-specific** | Dar es Salaam ferry, Serengeti wildlife, Zanzibar coastline, SGR train | Local identity — this is a Tanzanian platform |

**Content sourcing options:**

1. **Stock footage** — Pexels, Pixabay (free), Shutterstock, Getty (paid). ~$50–200 for a
   licensed compilation. Most of the generic clips (crowds, tickers, weather) are available free.
2. **Custom shoot** — Only for Tanzania-specific clips. A local videographer in Dar
   can capture ferry, skyline, SGR for ~$200–500.
3. **AI-generated** — Runway, Pika, Sora for abstract/ambient clips. Good for the
   crypto/finance visuals. Quality is now sufficient for dark, desaturated background use.

### For images (Approach B / C mobile)

| Requirement | Specification |
|---|---|
| **Count** | 5–8 images |
| **Resolution** | 1920x1080 minimum (will be cropped/scaled per viewport) |
| **Format** | WebP (primary) + JPEG fallback |
| **File size** | 80–150 KB each (quality 75-80 in WebP) |
| **Aspect ratio** | 16:9 landscape |
| **Colour treatment** | Same as video — desaturated, darkened, indigo-tinted |
| **Content** | Same categories as video clips — one per category |

**Image sourcing:**
Easier than video. Pexels/Unsplash have excellent free options for all categories.
Search terms: "stadium crowd silhouette dark", "stock ticker dark", "storm clouds dramatic",
"bitcoin gold dark", "concert stage lights", "dar es salaam skyline night".

---

## Technical implementation

### Desktop: Video player

```
Layer stack (bottom to top):
1. <video> — full-bleed, object-fit: cover, z-index: 0
2. Gradient overlay — radial royal indigo, opacity 0.75-0.85, z-index: 1
3. HeroConstellation — existing component, z-index: 2
```

**Video element spec:**

```html
<video
  autoplay
  muted
  loop
  playsinline
  preload="none"
  poster="/hero/poster.webp"
  class="absolute inset-0 w-full h-full object-cover"
  style="filter: saturate(0.4) brightness(0.3)"
>
  <source src="/hero/loop.webm" type="video/webm">
  <source src="/hero/loop.mp4" type="video/mp4">
</video>
```

Key attributes:
- `autoplay` + `muted` — required for autoplay without user interaction (all browsers)
- `playsinline` — prevents iOS from going fullscreen
- `loop` — seamless repeat
- `preload="none"` — don't load until in viewport (use IntersectionObserver)
- `poster` — static frame shown before video loads
- `filter: saturate(0.4) brightness(0.3)` — CSS-level desaturation + darkening

**Gradient overlay (on top of video, under constellation):**

```css
.hero-video-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: radial-gradient(
    ellipse 90% 70% at 42% 46%,
    oklch(24% 0.150 268 / 0.80) 0%,
    oklch(20% 0.135 268 / 0.85) 60%,
    oklch(15% 0.130 268 / 0.90) 100%
  );
}
```

This is the existing constellation background gradient, but applied as an overlay
with ~80-90% opacity. The video bleeds through subtly — you see movement and
shape, but the royal indigo brand canvas dominates.

### Mobile: Alternating images (Ken Burns)

```
Layer stack (bottom to top):
1. <img> stack — crossfading with Ken Burns, z-index: 0
2. Gradient overlay — same as desktop, z-index: 1
3. HeroConstellation — existing component (8 particles), z-index: 2
```

**Implementation:**

```tsx
// Rotate images every 6 seconds with crossfade
const IMAGES = [
  "/hero/slides/sports.webp",
  "/hero/slides/finance.webp",
  "/hero/slides/weather.webp",
  "/hero/slides/crypto.webp",
  "/hero/slides/culture.webp",
];

// Two <img> elements alternating opacity 0/1 with CSS transition
// Ken Burns: transform scale(1) -> scale(1.08) over 6s, alternate pan direction
```

Ken Burns CSS:
```css
@keyframes ken-burns-a {
  0%   { transform: scale(1.0) translate(0, 0); }
  100% { transform: scale(1.08) translate(-1%, -0.5%); }
}
@keyframes ken-burns-b {
  0%   { transform: scale(1.08) translate(-1%, -0.5%); }
  100% { transform: scale(1.0) translate(1%, 0.5%); }
}
```

### Fallback chain

```
1. Desktop + good connection     → Video loop
2. Desktop + Save-Data header    → Single poster image
3. Desktop + prefers-reduced-motion → Single poster image (no animation)
4. Mobile + good connection      → Ken Burns slideshow
5. Mobile + Save-Data header     → Single poster image
6. Mobile + prefers-reduced-motion → Single poster image (no animation)
7. No JS / SSR                   → Poster image via CSS background-image
```

### Loading strategy

1. Page loads with **poster image** as CSS `background-image` on the hero container
   (works without JS, instant paint, no layout shift)
2. After `DOMContentLoaded`, IntersectionObserver detects hero is in viewport
3. **Desktop:** Loads `<video>` element, sets `src`, begins playback when `canplay` fires
4. **Mobile:** Preloads first 2 images, starts slideshow after first image loads
5. If video fails to load within 5s, falls back to Ken Burns slideshow
6. If all images fail, poster stays visible (graceful degradation)

### Performance budget

| Asset | Size | Load time (3G) | Load time (4G) |
|---|---|---|---|
| Poster WebP | ~100 KB | 1.0s | 0.2s |
| Video MP4 (30s) | ~4 MB | 40s | 5s |
| Video WebM (30s) | ~3 MB | 30s | 4s |
| 5 slide images | ~600 KB total | 6s | 1s |

**Mobile data impact:** Video would cost ~4 MB per visit. On Tanzanian mobile
plans where 1 GB costs ~2,000 TZS, that's ~8 TZS per visit just for the hero.
This is why **mobile should never autoload video** — use images instead.

---

## When does the video play?

| Scenario | Behaviour |
|---|---|
| **First visit, desktop** | Poster shows immediately. Video lazy-loads. Crossfades from poster to video over 1s when ready. |
| **First visit, mobile** | Poster shows. Ken Burns slideshow starts after first additional image loads. |
| **Scroll past hero** | Video pauses (IntersectionObserver). Saves CPU/GPU. |
| **Scroll back to hero** | Video resumes from where it paused. |
| **Tab backgrounded** | Video pauses (Page Visibility API). Same pattern as existing constellation particles. |
| **Tab foregrounded** | Video resumes. |
| **User on metered connection** | `navigator.connection.saveData` check — skip video, use poster only. |
| **User prefers-reduced-motion** | `prefers-reduced-motion: reduce` media query — poster only, no Ken Burns, constellation particles also pause. |
| **Subsequent visits** | Video is in browser cache (~4 MB). Loads near-instantly from disk. |
| **Video load failure** | Fallback to Ken Burns slideshow. If images also fail, poster stays. |
| **iOS Safari** | `playsinline` attribute prevents fullscreen hijack. Muted autoplay works in Safari 11+. |
| **Older browsers (no WebM)** | Falls back to MP4 source. |

---

## Interaction with existing constellation

The constellation currently has a radial gradient background:
```
radial-gradient(ellipse 90% 70% at 42% 46%,
  oklch(24% 0.150 268) 0%,
  oklch(20% 0.135 268) 60%,
  oklch(15% 0.130 268) 100%)
```

**Two options for compositing:**

### Option 1: Video behind constellation only (contained)

Video plays only within the constellation's rounded-2xl container (border-radius 16px).
The gradient overlay sits between video and dials. Effect: the constellation
"window" shows moving footage, rest of page stays solid. Premium, contained feel.

**Pros:** Minimal layout change, contained visual impact, easy to implement.
**Cons:** Small viewport for the video, less dramatic.

### Option 2: Video behind full hero section (full-bleed)

Video spans the entire hero area (both text column and constellation column).
Both the text and constellation float on top of the video + overlay.

**Pros:** Maximum visual impact, cinematic feel.
**Cons:** Need to ensure text readability over moving footage. Requires
testing the overlay opacity carefully. More complex z-index management.

**Recommendation:** Option 1 (contained within constellation) for v1. It's safer,
preserves the current layout, and the rounded container acts as a natural frame
for the footage. Can upgrade to Option 2 later if desired.

---

## Quality checklist

Before shipping, verify all of these:

### Visual
- [ ] Video/images are desaturated enough that brand colours (gold, aqua) still pop
- [ ] Text over the hero is legible at all viewports (test on white/light clips)
- [ ] The constellation dials remain clearly visible and interactive
- [ ] The drift particles don't clash with video movement
- [ ] The verdict tape text remains readable
- [ ] No visible "jump" at the video loop point
- [ ] Ken Burns transitions are smooth (no jank)
- [ ] Poster image is representative and looks good on its own

### Performance
- [ ] Lighthouse score doesn't drop below 90 on mobile
- [ ] First Contentful Paint (FCP) is not delayed by video preload
- [ ] Largest Contentful Paint (LCP) uses the poster, not the video
- [ ] Video file size is under 5 MB (MP4) / 4 MB (WebM)
- [ ] Each slideshow image is under 150 KB
- [ ] Total hero asset budget is under 5.5 MB
- [ ] Video pauses when not in viewport (CPU check via DevTools)
- [ ] Video pauses when tab is backgrounded (battery check)
- [ ] No layout shift when video loads (CLS = 0)

### Accessibility
- [ ] `prefers-reduced-motion` disables all video/slideshow animation
- [ ] `Save-Data` header respected (no video download)
- [ ] Video has no audio track (autoplay compliance)
- [ ] All decorative video/images have `aria-hidden="true"`
- [ ] Screen readers see the same content with or without video

### Browser compatibility
- [ ] Chrome 90+ (desktop + Android)
- [ ] Safari 14+ (macOS + iOS)
- [ ] Firefox 90+
- [ ] Samsung Internet 15+
- [ ] Edge 90+
- [ ] Fallback works with JS disabled (poster via CSS)

### Mobile-specific
- [ ] Video does NOT autoplay on mobile (images only)
- [ ] Ken Burns slideshow doesn't cause jank on mid-tier Android
- [ ] Battery drain is acceptable (test on actual device for 5 min)
- [ ] Data usage is under 600 KB for mobile hero (images only)

---

## File structure

```
public/hero/
  poster.webp          # 1920x1080, ~100KB, static fallback
  poster.jpg           # JPEG fallback for older browsers
  loop.mp4             # H.264 Main, 24fps, CRF 28-30, ~4MB
  loop.webm            # VP9, 24fps, ~3MB
  slides/
    sports.webp        # 1920x1080, ~120KB
    finance.webp
    weather.webp
    crypto.webp
    culture.webp
    tanzania.webp
```

---

## What you need to provide

| Item | Format | Notes |
|---|---|---|
| **5–7 video clips** | MP4/MOV, any resolution | I will edit, colour-grade, compress, and loop them |
| **OR stock footage budget** | ~$100–200 | I can source and license the clips from Shutterstock/Getty |
| **OR permission to use free stock** | Verbal OK | Pexels/Pixabay clips are free for commercial use |
| **Tanzania-specific clips** (optional) | Any format | Dar skyline, ferry, SGR, Serengeti — makes it feel local |
| **Decision: contained vs full-bleed** | Your call | Option 1 (within constellation box) or Option 2 (full hero width) |
| **Decision: video on mobile?** | Your call | Recommendation is NO — images only on mobile |

If you don't have clips ready, I can build the entire component with placeholder
footage and you drop in the final video later. The component will work either way.

---

## Effort estimate

| Phase | What | Files touched |
|---|---|---|
| **1. Component** | `HeroVideoBackground` component with video player, Ken Burns slideshow, fallback chain, IntersectionObserver, visibility API | New: `src/components/landing/hero-video-bg.tsx` |
| **2. Integration** | Wire into `hero-constellation.tsx` or `page.tsx` depending on contained vs full-bleed | Modified: `hero-constellation.tsx` or `page.tsx` |
| **3. Assets** | Compress video, generate WebM, create poster, resize/optimize slideshow images | New: `public/hero/*` |
| **4. CSS tokens** | Add `--hero-video-overlay` opacity token, Ken Burns keyframes | Modified: `globals.css` |
| **5. Testing** | All checklist items above | Manual + Lighthouse |

---

## Recommendation

**Go with Approach C (hybrid):**
- Desktop: video loop within constellation container (Option 1)
- Mobile: Ken Burns image slideshow
- Reduced-motion / Save-Data: single poster

**Start with free stock footage** from Pexels. If the effect looks right, invest
in custom Tanzania clips and licensed premium footage later.

**Don't remove the constellation.** It's the most distinctive visual element on
the site. The video should be ambient texture behind it, not a replacement.

The video makes the hero feel alive. The constellation makes it feel intelligent.
Together they say: "this platform is premium, active, and data-driven."
