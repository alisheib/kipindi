"use client";

/**
 * The Needle — a persistent, physically-simulated pause object for 50pick.
 *
 * Integration per docs/design-system/v2-2026-07-27/09-needle/CLAUDE-CODE-BRIEF.md.
 * The engine (`needle-physics.js`) and haptics (`needle-haptics.js`) are VENDORED
 * libraries — not edited. The host below is PORTED from `Needle Playground.html`
 * (its <script type="module"> block), wrapped in a React mount lifecycle. Behaviour,
 * physics, sizing, speed and rotations are the playground's, unchanged. What is
 * adapted, and only for integration:
 *   · mounted ONCE in the app shell; every listener removed on unmount (no leaks);
 *   · elements looked up WITHIN #needle-root (not document) so ids can't clash;
 *   · a visibility gate — hidden on money surfaces (wallet/deposit/withdraw routes
 *     and open money modals) and when the player toggles it off in the navbar;
 *   · session() driven from a per-tab session clock; acknowledge() from an event;
 *     onRecord forwarded to analytics only and NEVER rendered.
 *
 * Hard rules honoured (CLAUDE-CODE-BRIEF §4): one instance, below every overlay/modal
 * (z 25 — see needle.css; 50pick modals are z 100, not the brief's assumed 1000), hidden
 * on money surfaces, colour untouched, reduced-motion respected by the engine, personal
 * best never displayed.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getPrefs } from "@/lib/haptics";
import type { NeedleOptions } from "@/lib/needle-physics";
import "./needle.css";

/** Money surfaces where a fidget must never appear (CLAUDE-CODE-BRIEF §4.1). */
const MONEY_ROUTE = /^\/wallet(\/|$)/;
function isMoneySurface(path: string | null): boolean {
  return !!path && MONEY_ROUTE.test(path);
}

/* Verbatim body markup from the playground (the #safe + #needle tree), with the
   SVG paint-def ids namespaced `ndl-*` so `url(#faceL)` etc. can never resolve to
   an app glyph gradient of the same name. Element ids (needle/tilt/hit/…) are kept
   and looked up within the root, so they cannot clash either. */
const MARKUP = `
<div id="safe" aria-hidden="true"></div>
<div id="needle" role="presentation">
  <div id="tilt">
    <span id="wake"></span>
    <span id="glow"></span>
    <span id="trail"></span>
    <span id="whole"></span>
    <span id="shadow"></span>
    <span id="ring"></span>
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="ndl-faceL" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%"   stop-color="#1C9264"></stop>
          <stop offset="100%" stop-color="#146F4C"></stop>
        </linearGradient>
        <linearGradient id="ndl-faceR" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%"   stop-color="#A83A43"></stop>
          <stop offset="100%" stop-color="#822A33"></stop>
        </linearGradient>
        <linearGradient id="ndl-spec" x1="0.12" y1="0" x2="0.72" y2="1">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.17"></stop>
          <stop offset="30%"  stop-color="#ffffff" stop-opacity="0.04"></stop>
          <stop offset="56%"  stop-color="#0A0E28" stop-opacity="0.12"></stop>
          <stop offset="100%" stop-color="#0A0E28" stop-opacity="0.42"></stop>
        </linearGradient>
        <radialGradient id="ndl-gloss" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.30"></stop>
          <stop offset="55%"  stop-color="#ffffff" stop-opacity="0.10"></stop>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"></stop>
        </radialGradient>
        <clipPath id="ndl-face"><circle cx="50" cy="50" r="46"></circle></clipPath>
        <radialGradient id="ndl-vig" cx="0.5" cy="0.5" r="0.5">
          <stop offset="62%"  stop-color="#0A0E28" stop-opacity="0"></stop>
          <stop offset="88%"  stop-color="#0A0E28" stop-opacity="0.16"></stop>
          <stop offset="100%" stop-color="#0A0E28" stop-opacity="0.40"></stop>
        </radialGradient>
        <linearGradient id="ndl-rim" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.52"></stop>
          <stop offset="42%"  stop-color="#ffffff" stop-opacity="0.06"></stop>
          <stop offset="100%" stop-color="#E3BC66" stop-opacity="0.34"></stop>
        </linearGradient>
        <radialGradient id="ndl-hub" cx="0.34" cy="0.28" r="0.85">
          <stop offset="0%"   stop-color="#FFF3D4"></stop>
          <stop offset="42%"  stop-color="#EFCC7C"></stop>
          <stop offset="78%"  stop-color="#D8AE55"></stop>
          <stop offset="100%" stop-color="#A87D33"></stop>
        </radialGradient>
        <linearGradient id="ndl-blendA" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#146F4C"></stop>
          <stop offset="100%" stop-color="#822A33"></stop>
        </linearGradient>
        <filter id="ndl-cast" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="6.5" flood-color="oklch(5% 0.05 268)" flood-opacity="0.58"></feDropShadow>
        </filter>
      </defs>

      <g filter="url(#ndl-cast)">
        <g id="disc" style="transform-origin: 50px 50px">
          <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" fill="url(#ndl-faceL)"></path>
          <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" fill="url(#ndl-faceR)"></path>
          <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63" fill="none" stroke="#54EDA6" stroke-width="var(--inlay, 2.6)" opacity="0.95"></path>
          <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63" fill="none" stroke="#FF7B82" stroke-width="var(--inlay, 2.6)" opacity="0.95"></path>
          <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#070A1E" stroke-width="7.5" stroke-linecap="round" opacity="0.62"></line>
          <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#FFE7B0" stroke-width="var(--needlew, 4.4)" stroke-linecap="round"
                style="filter: drop-shadow(0 0 3px rgba(255,214,120,0.9))"></line>
        </g>
        <circle id="blend" cx="50" cy="50" r="46" fill="url(#ndl-blendA)" opacity="0"></circle>
        <g id="smearA" style="transform-origin: 50px 50px" opacity="0">
          <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#F0D08A" stroke-width="3.6" stroke-linecap="round"></line>
        </g>
        <g id="smearB" style="transform-origin: 50px 50px" opacity="0">
          <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#F0D08A" stroke-width="3" stroke-linecap="round"></line>
        </g>
        <circle cx="50" cy="50" r="46" fill="url(#ndl-spec)"></circle>
        <circle cx="50" cy="50" r="46" fill="url(#ndl-vig)"></circle>
        <circle cx="50" cy="50" r="46.4" fill="none" stroke="#080B22" stroke-width="1.4" opacity="0.72"></circle>
        <circle cx="50" cy="50" r="47.3" fill="none" stroke="url(#ndl-rim)" stroke-width="1.5"></circle>
        <circle id="edgeArc" cx="50" cy="50" r="47.3" fill="none" stroke="var(--aqua-300)" stroke-width="1.9" opacity="0"
                style="filter: drop-shadow(0 0 5px color-mix(in oklab, var(--aqua-400) 70%, transparent))"></circle>
        <circle cx="50" cy="50" r="10" fill="#0A0E28" opacity="0.34"></circle>
        <circle cx="50" cy="50" r="7.4" fill="#0A0E28" opacity="0.58"></circle>
        <circle cx="50" cy="50" r="6.3" fill="url(#ndl-hub)"></circle>
        <circle cx="50" cy="50" r="6.3" fill="none" stroke="#7C5A22" stroke-width="0.5" opacity="0.7"></circle>
        <circle cx="47.9" cy="47.6" r="1.7" fill="#FFF8E6" opacity="0.72"></circle>
        <circle cx="50" cy="50" r="1.5" fill="#141A38"></circle>
      </g>
    </svg>
    <span id="hit" role="button" tabindex="0" aria-label="Needle — an optional fidget toy. Nothing here affects your account. Space to spin, arrow keys to move, Escape to tuck it away."></span>
  </div>
</div>`;

type NeedleApi = { setSuppressed: (v: boolean) => void };
type Hx = typeof import("@/lib/needle-haptics");

/**
 * The ported playground host. Populates `root`, builds the engine, wires every
 * listener, and returns a cleanup that removes all of them. Never rewrites the
 * engine or the renderer — this is the playground's own logic, scoped to React.
 */
function mountNeedle(
  root: HTMLDivElement,
  NeedleBody: typeof import("@/lib/needle-physics").NeedleBody,
  hx: Hx,
  apiRef: { current: NeedleApi | null },
  wantSuppressed: { current: boolean },
): () => void {
  const { haptic, hapticImpact, hapticDetent, setMuted } = hx;

  root.innerHTML = MARKUP;
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;

  const el = $("needle");
  const tilt = $("tilt");
  const hit = $("hit");
  const disc = $("disc");
  const trail = $("trail");
  const whole = $("whole");
  const glow = $("glow");
  const ring = $("ring");
  const shadow = $("shadow");
  const wake = $("wake");
  const edgeArc = $("edgeArc");
  const blend = $("blend");
  const smearA = $("smearA");
  const smearB = $("smearB");
  const safe = $("safe");

  // Listener registry — the single most likely integration bug is a leaked listener,
  // so every addEventListener goes through on() and is removed on cleanup.
  const listeners: Array<[EventTarget, string, EventListenerOrEventListenerObject, (boolean | AddEventListenerOptions)?]> = [];
  const on = (t: EventTarget, type: string, h: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
    t.addEventListener(type, h, opts);
    listeners.push([t, type, h, opts]);
  };

  function clampN(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }

  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  let raf: number | null = null, last = 0, pid: number | null = null;
  let samples: Array<{ x: number; y: number; a: number; t: number }> = [];
  let down: { x: number; y: number; t: number } | null = null, wasParked = false;
  let pending: { x: number; y: number } | null = null;
  let blurStep = -1, trailOpa = -1, tiltStr = "", squash = 1, squashV = 0, shadowOn = -1, wakeOn: string | number = -1, blendOpa = -1;
  let hoverOut = 0, hoverTo = 0, presenceOn = -1, wholeOpa = -1;

  // Visibility state: hidden on money routes / toggle (routeSuppressed, from React)
  // OR while a money modal is open (modalSuppress, from events). While hidden the
  // loop is paused; the instance and its saved position persist.
  let routeSuppressed = false;
  let modalSuppress = 0;
  const isSuppressed = () => routeSuppressed || modalSuppress > 0;

  let keepOuts: Array<{ x: number; y: number; w: number; h: number }> = [], keepOutAt = -1;
  function readKeepOuts() {
    const now = performance.now();
    if (now - keepOutAt < 8) return keepOuts;
    keepOutAt = now;
    const els = document.querySelectorAll("[data-needle-keepout]");
    if (!els.length) { keepOuts = keepOuts.length ? [] : keepOuts; return keepOuts; }
    const next: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const n of els) {
      const r = (n as HTMLElement).getBoundingClientRect();
      if (r.width > 0 && r.height > 0) next.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    }
    keepOuts = next;
    return keepOuts;
  }

  function insets() {
    const s = getComputedStyle(safe);
    return {
      top: parseFloat(s.paddingTop) || 0,
      right: parseFloat(s.paddingRight) || 0,
      bottom: parseFloat(s.paddingBottom) || 0,
      left: parseFloat(s.paddingLeft) || 0,
    };
  }

  function viewport() {
    const vv = window.visualViewport;
    return { w: Math.round(vv ? vv.width : innerWidth), h: Math.round(vv ? vv.height : innerHeight) };
  }

  function diameter() {
    const v = viewport();
    return Math.round(clampN(Math.min(v.w, v.h) * 0.155, 56, 88));
  }

  function haloInset() {
    const v = viewport();
    const t = clampN((Math.min(v.w, v.h) - 360) / (900 - 360), 0, 1);
    return -(14 + t * 20).toFixed(1);
  }

  const opts: NeedleOptions = {
    size: diameter(),
    bounds: () => { const v = viewport(); return { w: v.w, h: v.h, insets: insets() }; },
    obstacles: readKeepOuts,
    onImpact: (i) => {
      hapticImpact(i.speed);
      squashV -= Math.min(0.09, i.speed * 0.05);
      if (mq.matches) return;
      ring.style.transition = "none";
      ring.style.opacity = String(Math.min(0.55, i.speed * 0.55));
      ring.style.transform = `translate(${-i.nx * 7}px, ${-i.ny * 7}px) scale(1)`;
      requestAnimationFrame(() => {
        ring.style.transition = "opacity 280ms linear, transform 280ms cubic-bezier(0.32,0.72,0,1)";
        ring.style.opacity = "0";
        ring.style.transform = "translate(0,0) scale(1.26)";
      });
    },
    onCross: () => haptic("cross"),
    onPark: () => { haptic("tuck"); save(); },
    onSleep: () => { el.style.willChange = "auto"; haptic("settled"); save(); },
    onTrue: () => haptic("trueFound"),
    onDetent: (strength, quarters) => hapticDetent(strength, quarters),
    onCatch: (info) => {
      haptic("catch");
      squashV -= Math.min(0.12, info.w * 0.06);
      start();
    },
    // Analytics: one event per completed interaction, never per frame.
    onInteraction: (d) => { try { window.dispatchEvent(new CustomEvent("needle:interaction", { detail: d })); } catch { /* ignore */ } },
    // Personal best — analytics ONLY, never rendered (CLAUDE-CODE-BRIEF §3b/§4.7).
    onRecord: (kind, best) => { try { window.dispatchEvent(new CustomEvent("needle:record", { detail: { kind, best } })); } catch { /* ignore */ } },
  };
  const body = new NeedleBody(opts);
  body.calm = mq.matches ? 0.34 : 1;
  on(mq, "change", () => { body.calm = mq.matches ? 0.34 : 1; });

  let saved: { x?: number; y?: number; edge?: string } | null = null;
  try { saved = JSON.parse(localStorage.getItem("50pick.needle.pos") || "null"); } catch { /* ignore */ }
  body.y = saved && Number.isFinite(saved.y) ? (saved.y as number) : viewport().h * 0.5 - body.radius;
  body.snapPark(saved && saved.edge ? saved.edge : "right");
  paint(0);

  function save() {
    try { localStorage.setItem("50pick.needle.pos", JSON.stringify({ x: Math.round(body.x), y: Math.round(body.y), edge: body.edge })); } catch { /* ignore */ }
  }

  function paint(dt: number) {
    if (dt) {
      const f = clampN(dt / 16.67, 0, 3);
      hoverOut += (hoverTo - hoverOut) * 0.22 * f;
      if (Math.abs(hoverTo - hoverOut) < 0.05) hoverOut = hoverTo;
    }
    const nx = body.edge === "right" ? -1 : body.edge === "left" ? 1 : 0;
    const ny = body.edge === "bottom" ? -1 : body.edge === "top" ? 1 : 0;
    const ox = body.parked ? nx * hoverOut : 0;
    const oy = body.parked ? ny * hoverOut : 0;
    el.style.transform = `translate3d(${(body.x + ox).toFixed(2)}px, ${(body.y + oy).toFixed(2)}px, 0)`;
    disc.style.transform = `rotate(${body.a.toFixed(2)}deg)`;

    const sp = Math.abs(body.w);
    const dir = body.w < 0 ? 1 : -1;
    const lag = Math.min(46, sp * 26);
    const gA = Math.min(0.5, sp * 0.42);
    const gB = Math.min(0.28, sp * 0.24);
    if (Math.abs(gA - blurStep) > 0.015) {
      smearA.setAttribute("opacity", gA.toFixed(3));
      smearB.setAttribute("opacity", gB.toFixed(3));
      blurStep = gA;
    }
    if (gA > 0.004) {
      smearA.style.transform = `rotate(${(body.a + dir * lag * 0.5).toFixed(2)}deg)`;
      smearB.style.transform = `rotate(${(body.a + dir * lag).toFixed(2)}deg)`;
    }
    const bo = Math.min(0.9, Math.max(0, (sp - 0.55) * 0.85));
    if (Math.abs(bo - blendOpa) > 0.015) { blend.setAttribute("opacity", bo.toFixed(3)); blendOpa = bo; }

    const o = mq.matches ? 0 : Math.min(0.66, sp / 2.2);
    if (Math.abs(o - trailOpa) > 0.02) { trail.style.opacity = o.toFixed(2); trailOpa = o; }
    if (o > 0.01) trail.style.transform = `rotate(${(body.a * (body.w < 0 ? -1 : 1) * 0.35 + (body.w < 0 ? 180 : 0)).toFixed(1)}deg)`;
    const wo = mq.matches ? 0 : Math.max(0, (sp / 2.8 - 0.88) / 0.12) * 0.85;
    if (Math.abs(wo - wholeOpa) > 0.02) { whole.style.opacity = wo.toFixed(2); wholeOpa = wo; }

    const lean = mq.matches ? 0 : 1;
    const rx = clampN(-body.vy * 2.6, -7, 7) * lean;
    const ry = clampN(body.vx * 2.6, -7, 7) * lean;
    if (dt) {
      const f = clampN(dt / 16.67, 0, 3);
      squashV += (1 - squash) * 0.055 * f;
      squashV *= Math.pow(0.86, f);
      squash += squashV * f;
    }
    const t = `perspective(420px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${squash.toFixed(4)})`;
    if (t !== tiltStr) { tilt.style.transform = t; tiltStr = t; }

    const tucked = body.parked ? 1 : 0;
    if (tucked !== shadowOn) { shadow.style.opacity = tucked ? "0.9" : "0"; shadowOn = tucked; }
    const wantWake = body.parked && !body.held ? body.edge : "";
    if (wantWake !== wakeOn) {
      wake.classList.toggle("on", !!wantWake);
      edgeArc.setAttribute("opacity", wantWake ? "0.85" : "0");
      hit.className = wantWake ? "tuck-" + wantWake : "";
      if (wantWake) hit.style.setProperty("--npad", body.padPx() + "px");
      const at = body.edge === "right" ? "28% 50%" : body.edge === "left" ? "72% 50%"
               : body.edge === "top" ? "50% 72%" : "50% 28%";
      wake.style.background = wantWake
        ? `radial-gradient(circle at ${at}, color-mix(in oklab, var(--aqua-400) 46%, transparent) 0%, color-mix(in oklab, var(--aqua-500) 20%, transparent) 38%, transparent 64%)`
        : "none";
      wakeOn = wantWake;
    }
    if (body.presence !== presenceOn) {
      const pr = body.presence;
      wake.style.setProperty("--pmax", (0.42 + pr * 0.58).toFixed(3));
      wake.style.animationDuration = (4.6 - pr * 1.4).toFixed(2) + "s";
      if (body.parked) hit.style.setProperty("--npad", body.padPx() + "px");
      presenceOn = pr;
    }
  }

  function start() {
    if (raf) return;
    if (isSuppressed()) return;   // never run the loop while hidden
    last = performance.now();
    el.style.willChange = "transform";
    const tick = (t: number) => {
      let dt = t - last; last = t;
      if (dt > 50) dt = 50;
      if (body.held) applyDrag();
      body.advance(dt);
      paint(dt);
      raf = (body.awake || Math.abs(1 - squash) > 0.0015 || hoverOut !== hoverTo) ? requestAnimationFrame(tick) : null;
      if (!raf) { squash = 1; squashV = 0; paint(0); }
    };
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  on(hit, "pointerdown", ((e: PointerEvent) => {
    if (e.button) return;
    if (pid !== null) return;
    pid = e.pointerId;
    wasParked = body.parked || body.parking;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    body.hold(wasParked ? "move" : body.grabKind(e.clientX, e.clientY));
    samples = [{ x: e.clientX, y: e.clientY, a: Math.atan2(e.clientY - body.cy, e.clientX - body.cx) * 180 / Math.PI, t: performance.now() }];
    hit.style.cursor = "grabbing";
    glow.style.opacity = "1";
    haptic("grab");
    if (hit.setPointerCapture) hit.setPointerCapture(e.pointerId);
    e.preventDefault();
    start();
  }) as EventListener);

  on(window, "pointermove", ((e: PointerEvent) => {
    if (!body.held || (pid !== null && e.pointerId !== pid)) return;
    e.preventDefault();
    pending = { x: e.clientX, y: e.clientY };
  }) as EventListener, { passive: false });

  function applyDrag() {
    if (!pending) return;
    const l = samples[samples.length - 1];
    if (body.held === "move") {
      body.dragBy(pending.x - l.x, pending.y - l.y);
      samples.push({ x: pending.x, y: pending.y, a: l.a, t: performance.now() });
    } else {
      const a = body.turnTo(pending.x, pending.y, l.a);
      samples.push({ x: pending.x, y: pending.y, a, t: performance.now() });
    }
    if (samples.length > 8) samples.shift();
    pending = null;
  }

  function release(e?: PointerEvent) {
    if (!body.held || (pid !== null && e && e.pointerId != null && e.pointerId !== pid)) return;
    applyDrag();
    pid = null;
    pending = null;
    hit.style.cursor = "grab";
    glow.style.opacity = "0";
    const moved = down && e && e.clientX != null ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 0;
    const quick = down ? performance.now() - down.t < 320 : false;
    if (wasParked && quick && moved < 8) { haptic("wake"); body.wake(true); start(); return; }
    body.release(samples, body.held);
    start();
  }
  on(window, "pointerup", release as EventListener);
  on(window, "pointercancel", release as EventListener);
  on(window, "blur", (() => release()) as EventListener);

  on(hit, "keydown", ((e: KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 12;
    if (e.key === "Escape") { e.preventDefault(); body.held = null; body.parkTo(body.nearestEdge()); start(); return; }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (body.parked || body.parking) body.wake(); else body.flick(1.7);
      start();
      return;
    }
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (map[e.key]) { e.preventDefault(); body.unpark(); body.dragBy(map[e.key][0], map[e.key][1]); start(); }
  }) as EventListener);

  on(hit, "pointerenter", ((e: PointerEvent) => {
    if (e.pointerType === "touch" || !body.parked) return;
    hoverTo = 7; start();
  }) as EventListener);
  on(hit, "pointerleave", (() => { hoverTo = 0; start(); }) as EventListener);

  function applyViewport() {
    const d = diameter();
    if (d !== body.size) body.setSize(d);
    el.style.setProperty("--nsize", d + "px");
    el.style.setProperty("--inlay", (2.6 * (88 / d)).toFixed(2));
    el.style.setProperty("--halo", haloInset() + "%");
    el.style.setProperty("--needlew", (4.4 * Math.max(1, 74 / d)).toFixed(2));
    body.reclamp();
    paint(0);
  }
  applyViewport();

  on(window, "resize", applyViewport as EventListener);
  on(window, "orientationchange", (() => setTimeout(applyViewport, 120)) as EventListener);
  if (window.visualViewport) {
    on(window.visualViewport, "resize", applyViewport as EventListener);
    on(window.visualViewport, "scroll", applyViewport as EventListener);
  }
  on(document, "visibilitychange", (() => {
    if (document.hidden) stop();
    else if (body.awake && !isSuppressed()) { body.acc = 0; start(); }
  }) as EventListener);

  /* ── session clock: drives presence. Derived from a per-tab start timestamp so it
     survives hide/show and route changes without a running counter. Called on mount
     and once a minute (CLAUDE-CODE-BRIEF §3). */
  function sessionTick() {
    let s = 0;
    try { s = Number(sessionStorage.getItem("50pick.needle.sessionStart")) || 0; } catch { /* ignore */ }
    if (!s) { s = Date.now(); try { sessionStorage.setItem("50pick.needle.sessionStart", String(s)); } catch { /* ignore */ } }
    const minutes = (Date.now() - s) / 60000;
    if (body.setSession(minutes)) { paint(0); if (!isSuppressed() && body.awake) start(); }
  }
  sessionTick();
  const sessionTimer = window.setInterval(sessionTick, 60000);

  // Platform API — mount once, these are the only two calls a page makes.
  const api = {
    session: (minutes: number) => { if (body.setSession(minutes)) { paint(0); if (!isSuppressed()) start(); } },
    acknowledge: () => { if (body.acknowledge() && !isSuppressed()) start(); },
  };
  (window as unknown as { needle?: typeof api; __needle?: typeof body }).needle = api;
  (window as unknown as { needle?: typeof api; __needle?: typeof body }).__needle = body;

  // acknowledge() from app code: dispatch `needle:acknowledge` when a HELD position
  // resolves (see src/lib/needle-bridge.ts → acknowledgeNeedle()).
  on(window, "needle:acknowledge", (() => api.acknowledge()) as EventListener);

  // Money-modal suppression: bet-confirm / cash-out / stake sheets dispatch these
  // while open so the object is hidden during a live money commit (a fidget beside
  // one is a dark pattern — CLAUDE-CODE-BRIEF §4.1).
  const recompute = () => {
    if (isSuppressed()) { root.classList.add("needle-suppressed"); stop(); }
    else { root.classList.remove("needle-suppressed"); if (body.awake) start(); }
  };
  on(window, "50pick:needle-suppress", (() => { modalSuppress++; recompute(); }) as EventListener);
  on(window, "50pick:needle-release", (() => { modalSuppress = Math.max(0, modalSuppress - 1); recompute(); }) as EventListener);

  // React-driven visibility (money routes + navbar toggle).
  function setSuppressed(v: boolean) { routeSuppressed = v; recompute(); }
  apiRef.current = { setSuppressed };
  setSuppressed(wantSuppressed.current);   // apply whatever React already computed

  // Live-sync the Needle's mute cache with the app's "Sound & feedback" master switch.
  on(window, "50pick:feedback-changed", (() => {
    try { setMuted(getPrefs().haptics === false); } catch { /* ignore */ }
  }) as EventListener);
  try { setMuted(getPrefs().haptics === false); } catch { /* ignore */ }

  // ── cleanup: remove EVERY listener, cancel the loop, drop the API, empty the root.
  return () => {
    stop();
    window.clearInterval(sessionTimer);
    for (const [t, type, h, opts] of listeners) t.removeEventListener(type, h, opts as EventListenerOptions);
    const w = window as unknown as { needle?: unknown; __needle?: unknown };
    if (w.needle === api) delete w.needle;
    if (w.__needle === body) delete w.__needle;
    apiRef.current = null;
    root.innerHTML = "";
  };
}

export function Needle() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<NeedleApi | null>(null);
  const wantSuppressed = useRef(false);
  const pathname = usePathname();
  const [hiddenPref, setHiddenPref] = useState(false);

  // Track the persisted show/hide preference; both the settings panel and the navbar
  // toggle dispatch "50pick:feedback-changed" when it flips.
  useEffect(() => {
    setHiddenPref(getPrefs().needleHidden === true);
    const onPrefs = () => setHiddenPref(getPrefs().needleHidden === true);
    window.addEventListener("50pick:feedback-changed", onPrefs);
    return () => window.removeEventListener("50pick:feedback-changed", onPrefs);
  }, []);

  // Mount the engine ONCE. The shell keeps a single instance across route changes;
  // visibility is a display toggle, never a remount (remounting resets position).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = hostRef.current;
    if (!root) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    (async () => {
      const [{ NeedleBody }, hx] = await Promise.all([
        import("@/lib/needle-physics"),
        import("@/lib/needle-haptics"),
      ]);
      if (cancelled || !hostRef.current) return;
      cleanup = mountNeedle(hostRef.current, NeedleBody, hx, apiRef, wantSuppressed);
    })();
    return () => { cancelled = true; if (cleanup) cleanup(); };
  }, []);

  // Visibility gate: hide on money surfaces or when toggled off. Written to a ref so
  // the engine picks it up even if it finishes mounting after this runs.
  useEffect(() => {
    const suppressed = hiddenPref || isMoneySurface(pathname);
    wantSuppressed.current = suppressed;
    apiRef.current?.setSuppressed(suppressed);
  }, [hiddenPref, pathname]);

  return <div id="needle-root" ref={hostRef} />;
}

export default Needle;
