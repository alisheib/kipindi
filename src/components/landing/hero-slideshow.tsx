"use client";

/**
 * HeroSlideshow — full-bleed Ken Burns alternating images of winning moments.
 *
 * Two <img> elements alternate opacity. The outgoing image holds while the
 * incoming crossfades over 1.4s. Each slide runs a slow Ken Burns pan/zoom
 * over its 5s display window.
 *
 * Performance:
 *   - Pauses when tab is hidden (Page Visibility API)
 *   - Pauses when hero is off-screen (IntersectionObserver)
 *   - prefers-reduced-motion: shows static first slide, no animation
 *   - Save-Data: shows static first slide
 *   - First 3 images preloaded, rest loaded on demand
 */

import { useEffect, useRef, useState, useCallback } from "react";

type Slide = {
  src: string;
  alt: string;
  panDirection: "tl" | "tr" | "bl" | "br" | "center";
};

const SLIDES: Slide[] = [
  { src: "/hero/slides/01-trophy-champion.webp",    alt: "Champion holding gold trophy",        panDirection: "bl" },
  { src: "/hero/slides/02-soccer-stadium.webp",     alt: "Football stadium under floodlights",  panDirection: "center" },
  { src: "/hero/slides/03-boxing-ring.webp",         alt: "Boxing champion in the ring",         panDirection: "tr" },
  { src: "/hero/slides/04-champagne-toast.webp",     alt: "Champagne toast celebration",         panDirection: "tl" },
  { src: "/hero/slides/05-confetti-party.webp",      alt: "Confetti raining on celebration",     panDirection: "br" },
  { src: "/hero/slides/06-stadium-lights.webp",      alt: "Stadium lights blazing at night",     panDirection: "bl" },
  { src: "/hero/slides/07-fireworks-victory.webp",   alt: "Victory fireworks in the sky",        panDirection: "center" },
  { src: "/hero/slides/08-gold-coins.webp",          alt: "Gold coins winning jackpot",          panDirection: "tr" },
  { src: "/hero/slides/09-race-finish.webp",         alt: "Runners crossing the finish line",    panDirection: "tl" },
  { src: "/hero/slides/10-basketball-court.webp",    alt: "Basketball championship moment",      panDirection: "br" },
  { src: "/hero/slides/11-football-crowd.webp",      alt: "Football crowd roaring",              panDirection: "bl" },
  { src: "/hero/slides/12-racing-speed.webp",        alt: "Racing car at full speed",            panDirection: "center" },
  { src: "/hero/slides/13-gold-trophy.webp",         alt: "Gold trophy gleaming in spotlight",   panDirection: "tr" },
  { src: "/hero/slides/14-swim-race.webp",           alt: "Swimming race at full intensity",     panDirection: "tl" },
  { src: "/hero/slides/15-cycling-peloton.webp",     alt: "Cycling peloton powering through",    panDirection: "br" },
  { src: "/hero/slides/16-crowd-stadium.webp",       alt: "Crowd erupting in stadium",           panDirection: "bl" },
  { src: "/hero/slides/17-champion-victory.webp",    alt: "Champion celebrating victory",        panDirection: "center" },
  { src: "/hero/slides/18-soccer-action.webp",       alt: "Soccer action on the pitch",          panDirection: "tr" },
  { src: "/hero/slides/19-medal-gold.webp",          alt: "Gold medal ceremony",                 panDirection: "tl" },
  { src: "/hero/slides/20-tennis-court.webp",        alt: "Tennis court championship",           panDirection: "br" },
];

const SLIDE_DURATION = 5000;
const CROSSFADE_MS   = 1400;
const KB_SCALE_FROM  = 1.0;
const KB_SCALE_TO    = 1.08;

const PAN_MAP: Record<Slide["panDirection"], { x: string; y: string }> = {
  tl:     { x: "-1.5%", y: "-1%" },
  tr:     { x: "1.5%",  y: "-1%" },
  bl:     { x: "-1.5%", y: "1%" },
  br:     { x: "1.5%",  y: "1%" },
  center: { x: "0%",    y: "0%" },
};

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) setReducedMotion(true);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handler = () => { visibleRef.current = document.visibilityState !== "hidden"; };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { inViewRef.current = entry.isIntersecting; },
      { threshold: 0.1 },
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    SLIDES.slice(0, 3).forEach((slide, i) => {
      const img = new Image();
      img.onload = () => setImagesLoaded((prev) => new Set(prev).add(i));
      img.onerror = () => setImagesLoaded((prev) => new Set(prev).add(i));
      img.src = slide.src;
    });
  }, []);

  const advance = useCallback(() => {
    if (reducedMotion) return;
    if (!visibleRef.current || !inViewRef.current) {
      timerRef.current = setTimeout(advance, 1000);
      return;
    }
    const next = (activeIdx + 1) % SLIDES.length;
    setNextIdx(next);
    setTransitioning(true);
    for (let offset = 1; offset <= 2; offset++) {
      const preloadIdx = (next + offset) % SLIDES.length;
      if (!imagesLoaded.has(preloadIdx)) {
        const img = new Image();
        img.onload = () => setImagesLoaded((prev) => new Set(prev).add(preloadIdx));
        img.src = SLIDES[preloadIdx].src;
      }
    }
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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
        }}
      >
        <SlideImage
          slide={activeSlide}
          pan={PAN_MAP[activeSlide.panDirection]}
          animate={!reducedMotion && !transitioning}
          loaded={imagesLoaded.has(activeIdx)}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          opacity: transitioning ? 1 : 0,
          transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
        }}
      >
        <SlideImage
          slide={nextSlide}
          pan={PAN_MAP[nextSlide.panDirection]}
          animate={!reducedMotion && transitioning}
          loaded={imagesLoaded.has(nextIdx)}
        />
      </div>
    </div>
  );
}

function SlideImage({ slide, pan, animate, loaded }: {
  slide: Slide;
  pan: { x: string; y: string };
  animate: boolean;
  loaded: boolean;
}) {
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
          style={{ filter: "saturate(0.6) brightness(0.55)" }}
          loading="lazy"
          decoding="async"
        />
      ) : (
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
