"use client";

/**
 * HeroSlideshow — full-bleed Ken Burns alternating images of winning moments.
 *
 * Architecture:
 *   Two <img> elements alternate opacity. The outgoing image holds while the
 *   incoming crossfades over 1.2s. Each slide runs a slow Ken Burns pan/zoom
 *   over its 6s display window, creating gentle movement even from stills.
 *
 * Performance:
 *   - Pauses when tab is hidden (Page Visibility API)
 *   - Pauses when hero is off-screen (IntersectionObserver)
 *   - prefers-reduced-motion: shows static first slide, no animation
 *   - Save-Data: shows static first slide
 *   - Images lazy-loaded: first two preloaded, rest loaded on demand
 *
 * Colour treatment:
 *   Images should be pre-processed (desaturated, darkened) but the CSS filter
 *   provides a runtime safety net: saturate(0.35) brightness(0.28) ensures
 *   even a bright photo won't blow out the overlay.
 *
 * Drop in real images:
 *   Replace the SLIDES array paths with your actual images in public/hero/slides/
 */

import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Slide configuration ─── */

type Slide = {
  src: string;
  alt: string;
  /** Ken Burns direction: which corner to drift toward */
  panDirection: "tl" | "tr" | "bl" | "br" | "center";
};

/**
 * Winning moments — replace these paths when real images are ready.
 * Until then, the component renders the brand gradient as fallback.
 *
 * Recommended images (all should be 1920x1080+, landscape, dark/dramatic):
 *   20 winning moments — trophies, celebrations, stadium lights, champagne.
 *   All images from Pexels (free commercial license).
 *   When video is ready, replace this component with HeroVideo.
 */
const SLIDES: Slide[] = [
  { src: "/hero/slides/test-worldcup.jpg",          alt: "World Cup trophy lift",                 panDirection: "tr" },
  { src: "/hero/slides/test-f1-schumacher.webp",    alt: "F1 podium champagne celebration",       panDirection: "tl" },
  { src: "/hero/slides/test-f1-webber.webp",        alt: "F1 champagne spray victory",            panDirection: "br" },
  { src: "/hero/slides/01-trophy-champion.jpg",     alt: "Champion holding gold trophy",          panDirection: "bl" },
  { src: "/hero/slides/02-soccer-stadium.jpg",      alt: "Football stadium under floodlights",    panDirection: "center" },
  { src: "/hero/slides/03-boxing-ring.jpg",         alt: "Boxing champion in the ring",           panDirection: "tr" },
  { src: "/hero/slides/04-champagne-toast.jpg",     alt: "Champagne toast celebration",           panDirection: "tl" },
  { src: "/hero/slides/05-confetti-party.jpg",      alt: "Confetti raining on celebration",       panDirection: "br" },
  { src: "/hero/slides/06-stadium-lights.jpg",      alt: "Stadium lights blazing at night",       panDirection: "bl" },
  { src: "/hero/slides/07-fireworks-victory.jpg",   alt: "Victory fireworks in the sky",          panDirection: "center" },
  { src: "/hero/slides/08-gold-coins.jpg",          alt: "Gold coins winning jackpot",            panDirection: "tr" },
  { src: "/hero/slides/09-race-finish.jpg",         alt: "Runners crossing the finish line",      panDirection: "tl" },
  { src: "/hero/slides/10-basketball-court.jpg",    alt: "Basketball championship moment",        panDirection: "br" },
  { src: "/hero/slides/11-football-crowd.jpg",      alt: "Football crowd roaring",                panDirection: "bl" },
  { src: "/hero/slides/12-racing-speed.jpg",        alt: "Racing car at full speed",              panDirection: "center" },
  { src: "/hero/slides/13-gold-trophy.jpg",         alt: "Gold trophy gleaming in spotlight",     panDirection: "tr" },
  { src: "/hero/slides/14-swim-race.jpg",           alt: "Swimming race at full intensity",       panDirection: "tl" },
  { src: "/hero/slides/15-cycling-peloton.jpg",     alt: "Cycling peloton powering through",      panDirection: "br" },
  { src: "/hero/slides/16-crowd-stadium.jpg",       alt: "Crowd erupting in stadium",             panDirection: "bl" },
  { src: "/hero/slides/17-champion-victory.jpg",    alt: "Champion celebrating victory",          panDirection: "center" },
];

const SLIDE_DURATION = 5000;   // ms each slide is shown (5s × 20 = 100s full cycle)
const CROSSFADE_MS   = 1400;   // ms for the opacity crossfade
const KB_SCALE_FROM  = 1.0;    // Ken Burns start scale
const KB_SCALE_TO    = 1.08;   // Ken Burns end scale

/** Pan translation targets per direction */
const PAN_MAP: Record<Slide["panDirection"], { x: string; y: string }> = {
  tl:     { x: "-1.5%", y: "-1%" },
  tr:     { x: "1.5%",  y: "-1%" },
  bl:     { x: "-1.5%", y: "1%" },
  br:     { x: "1.5%",  y: "1%" },
  center: { x: "0%",    y: "0%" },
};

/* ─── Component ─── */

export function HeroSlideshow() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(true);
  const inViewRef = useRef(true);

  // Detect prefers-reduced-motion + Save-Data
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);

    // Save-Data check
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) setReducedMotion(true);

    return () => mq.removeEventListener("change", handler);
  }, []);

  // Page Visibility API
  useEffect(() => {
    const handler = () => { visibleRef.current = document.visibilityState !== "hidden"; };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // IntersectionObserver — pause when off-screen
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { inViewRef.current = entry.isIntersecting; },
      { threshold: 0.1 },
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Preload first 3 images — enough for smooth start without loading all 20 upfront
  useEffect(() => {
    SLIDES.slice(0, 3).forEach((slide, i) => {
      const img = new Image();
      img.onload = () => setImagesLoaded((prev) => new Set(prev).add(i));
      img.onerror = () => setImagesLoaded((prev) => new Set(prev).add(i));
      img.src = slide.src;
    });
  }, []);

  // Rotation timer
  const advance = useCallback(() => {
    if (reducedMotion) return;
    if (!visibleRef.current || !inViewRef.current) {
      // Retry in 1s when not visible
      timerRef.current = setTimeout(advance, 1000);
      return;
    }

    const next = (activeIdx + 1) % SLIDES.length;
    setNextIdx(next);
    setTransitioning(true);

    // Preload 2 slides ahead so crossfade is always smooth
    for (let offset = 1; offset <= 2; offset++) {
      const preloadIdx = (next + offset) % SLIDES.length;
      if (!imagesLoaded.has(preloadIdx)) {
        const img = new Image();
        img.onload = () => setImagesLoaded((prev) => new Set(prev).add(preloadIdx));
        img.src = SLIDES[preloadIdx].src;
      }
    }

    // After crossfade completes, swap active
    setTimeout(() => {
      setActiveIdx(next);
      setTransitioning(false);
    }, CROSSFADE_MS);

    timerRef.current = setTimeout(advance, SLIDE_DURATION);
  }, [activeIdx, reducedMotion, imagesLoaded]);

  useEffect(() => {
    if (reducedMotion) return;
    timerRef.current = setTimeout(advance, SLIDE_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [advance, reducedMotion]);

  const activeSlide = SLIDES[activeIdx];
  const nextSlide = SLIDES[nextIdx];
  const activePan = PAN_MAP[activeSlide.panDirection];
  const nextPan = PAN_MAP[nextSlide.panDirection];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Active slide */}
      <div
        className="absolute inset-0"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
        }}
      >
        <SlideImage
          slide={activeSlide}
          pan={activePan}
          animate={!reducedMotion && !transitioning}
          loaded={imagesLoaded.has(activeIdx)}
        />
      </div>

      {/* Next slide (fades in during transition) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: transitioning ? 1 : 0,
          transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
        }}
      >
        <SlideImage
          slide={nextSlide}
          pan={nextPan}
          animate={!reducedMotion && transitioning}
          loaded={imagesLoaded.has(nextIdx)}
        />
      </div>

      {/* Gradient overlay — left side darker for text readability, right side
          lets the image show through clearly. Matches the reference screenshot
          where imagery is visible behind the headline. */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          background: `
            linear-gradient(
              90deg,
              oklch(12% 0.10 268 / 0.78) 0%,
              oklch(12% 0.10 268 / 0.55) 40%,
              oklch(12% 0.08 268 / 0.30) 70%,
              oklch(12% 0.06 268 / 0.15) 100%
            ),
            linear-gradient(
              180deg,
              oklch(12% 0.10 268 / 0.20) 0%,
              oklch(12% 0.08 268 / 0.10) 50%,
              oklch(12% 0.10 268 / 0.50) 100%
            )
          `,
        }}
      />
    </div>
  );
}

/* ─── Individual slide renderer ─── */

function SlideImage({
  slide,
  pan,
  animate,
  loaded,
}: {
  slide: Slide;
  pan: { x: string; y: string };
  animate: boolean;
  loaded: boolean;
}) {
  // Ken Burns: scale 1.0 → 1.08 + translate toward pan direction over SLIDE_DURATION
  const transform = animate
    ? `scale(${KB_SCALE_TO}) translate(${pan.x}, ${pan.y})`
    : `scale(${KB_SCALE_FROM}) translate(0%, 0%)`;

  return (
    <div
      className="absolute inset-0"
      style={{
        transform,
        transition: animate ? `transform ${SLIDE_DURATION}ms ease-out` : "none",
        willChange: "transform",
      }}
    >
      {loaded ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "saturate(0.6) brightness(0.55)",
          }}
          loading="lazy"
          decoding="async"
        />
      ) : (
        /* Fallback gradient when image isn't loaded yet — matches brand canvas
           so there's no flash of wrong colour */
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 90% 70% at 42% 46%, oklch(24% 0.150 268) 0%, oklch(20% 0.135 268) 60%, oklch(15% 0.130 268) 100%)",
          }}
        />
      )}
    </div>
  );
}
