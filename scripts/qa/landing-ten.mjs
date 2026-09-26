/**
 * THE LANDING-PAGE ACCEPTANCE GATE — "nothing less than 10 visually is accepted. not 9.99, only 10."
 *
 *   node landing-ten.mjs                 # the whole matrix against production
 *   node landing-ten.mjs --pass=base     # one pass only: base | states | orientation
 *   RED=V4 node landing-ten.mjs --red    # plant V4's defect and assert V4 — and ONLY V4 — fires
 *   BASE=https://www.50pick.tz node ...
 *
 * ── WHAT A "10" MEANS HERE ────────────────────────────────────────────────────────────────────
 * Eleven defect classes, each of which must read EXACTLY ZERO in every cell. A class that cannot
 * be shown to fail is not a check, it is decoration — so every class has a RED control that plants
 * its own defect, and `--red` refuses to pass unless the planted class goes red AND the others do
 * not. "It went red" is not enough: while one class is failing for an unrelated reason, a control
 * appears to work whether or not it does.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ────────────────────────────────────────────────────────
 * It does not run the full cross product of width × locale × state — that is 1,584 cells and would
 * be theatre. It runs 11×3 widths×locales as the base grid, then exercises each STATE dimension at
 * three representative widths in Swahili. Say which it is: state coverage is 3 widths, not 11.
 *
 * ── TRAPS THIS HARNESS IS BUILT AROUND, ALL PAID FOR ON THIS CODEBASE ─────────────────────────
 * ⛔ NO GLOBAL `animation:none`. The card sparkline is a draw-on (`stroke-dashoffset`) and freezes
 *    UNDRAWN, which reads as a broken chart. We wait for settle instead and measure motion alive.
 * ⛔ Colours are oklch/color-mix. Scraping digits out of a computed colour string gives nonsense
 *    (it once reported white-on-navy as 1.25:1). Every colour goes through a 1×1 canvas, and the
 *    instrument SELF-TESTS at 21:1 white-on-black before any of its numbers are believed.
 * ⛔ `getBoundingClientRect` cannot see a CLIPPED focus ring, and a box saying "43px" cannot say
 *    the WORD was cut — only `scrollWidth > clientWidth` says that.
 * ⛔ A rectangle overlap is not occlusion. V3 proves the overlay wins `elementFromPoint`, sampled
 *    at five points across the target, because a centre-only probe passes while the defect is live.
 * ⛔ The UA keeps its HeadlessChrome marker: a spoofed Android UA once had /api/pv counting QA
 *    sweeps as real players.
 * ⛔ A failed read is not a zero. A cell that did not load is reported as ERROR, never as clean.
 */
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Repo root, derived from this file rather than hard-coded, so the gate runs from any worktree.
const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const PW = join(REPO, "node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(PW).href);

const BASE = process.env.BASE || "https://www.50pick.tz";
const OUT = process.env.OUT || join(REPO, ".qa-shots", "landing-ten");
const ONLY_PASS = (process.argv.find((a) => a.startsWith("--pass=")) || "").split("=")[1] || null;
const RED = process.env.RED || null;
const RED_MODE = process.argv.includes("--red");
mkdirSync(OUT, { recursive: true });

const UA_MOBILE = "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Mobile Safari/537.36";
const UA_DESK = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36";
for (const ua of [UA_MOBILE, UA_DESK]) {
  if (!/HeadlessChrome/.test(ua)) { console.error("REFUSING: UA lost its HeadlessChrome marker"); process.exit(2); }
}

const WIDTHS = [
  { w: 320, h: 640, mobile: true }, { w: 360, h: 780, mobile: true }, { w: 393, h: 852, mobile: true },
  { w: 412, h: 915, mobile: true }, { w: 430, h: 932, mobile: true }, { w: 560, h: 900, mobile: true },
  { w: 768, h: 1024, mobile: false }, { w: 1024, h: 900, mobile: false }, { w: 1280, h: 860, mobile: false },
  { w: 1440, h: 900, mobile: false }, { w: 1920, h: 1080, mobile: false },
];
const LOCALES = ["sw", "en", "zh"];
// ⛔ 320x640 IS IN THE STATE PASS BECAUSE SHORT VIEWPORTS ARE WHERE OVERLAYS BREAK. The primer
// fits at 360x780 and loses 149px of its last card at 320x640 — a defect invisible at every
// other width in this matrix.
const STATE_WIDTHS = [{ w: 320, h: 640, mobile: true }, { w: 360, h: 780, mobile: true }, { w: 768, h: 1024, mobile: false }, { w: 1280, h: 860, mobile: false }];

/** Every cell this gate claims to cover. `state` drives context options; `note` explains coverage. */
function buildCells() {
  const cells = [];
  for (const d of WIDTHS) for (const loc of LOCALES) {
    cells.push({ pass: "base", id: `base-${d.w}-${loc}`, ...d, locale: loc, state: "returning" });
  }
  for (const d of STATE_WIDTHS) {
    // ⛔ `clienthop` EXISTS BECAUSE A HARD `goto` NEVER PAINTS `loading.tsx`. Next's route-level
    //    skeletons render only on a client-side navigation, so a harness that always navigates
    //    straight to a URL certifies a page it has never seen in its loading state. Flagged by the
    //    mobile-s2 session, 2026-09-24, after proving it on their own surfaces.
    for (const st of ["firstvisit", "compact", "reducedmotion", "nojs", "clienthop", "signedin"]) {
      cells.push({ pass: "states", id: `state-${st}-${d.w}`, ...d, locale: "sw", state: st });
    }
  }
  cells.push({ pass: "orientation", id: "landscape-780", w: 780, h: 360, mobile: true, locale: "sw", state: "returning" });
  cells.push({ pass: "orientation", id: "landscape-915", w: 915, h: 412, mobile: true, locale: "sw", state: "returning" });
  // ⚠️ THESE ARE BROWSER ZOOM, NOT ANDROID TEXT SCALING, AND THE DIFFERENCE IS NOT COSMETIC.
  // Shrinking the CSS viewport models a browser zoom; Android's text scaling leaves the viewport
  // at 360 and scales the TEXT. This repo has already shipped a gate keyed to 300px that could
  // never fire on the device it was written for, for exactly this reason. So: these two cells are
  // WCAG 1.4.4 (200% resize) and zoom, honestly labelled — and Android text scaling remains
  // UNCOVERED by any driver here. A stated gap, not a silent one.
  cells.push({ pass: "orientation", id: "zoom-130", w: 277, h: 780, mobile: true, locale: "sw", state: "returning", note: "360 CSS px under 130% browser zoom" });
  // 🔴 zoom-200 IS INFORMATIONAL, AND MISLABELLING IT WAS MY ERROR, NOT THE PAGE'S.
  // It was tagged "WCAG 1.4.4", which is the wrong criterion twice over: 1.4.4 is about TEXT being
  // resizable to 200%, which viewport shrinking does not model at all and which no driver here
  // covers. The criterion that sets a WIDTH is 1.4.10 Reflow, and it sets it at **320 CSS px** —
  // which this matrix already covers, at three locales, and which is clean.
  // 180px is below the normative width and below this product's smallest supported phone. Holding
  // a bar nobody sets is the same error as the 44px tap floor I invented while the platform
  // documents 40: it manufactures work against a standard that does not exist. The cell still RUNS
  // and still reports, because a number worth knowing should not be deleted — it simply does not
  // fail the gate. Established with the mobile-s2 session, 2026-09-24, who also proved the ring
  // finding there is unfixable by an outline offset: at 180 the info button sits 23px outside its
  // own card because .mcardp-timeleft is a fixed 155px in a 148px card.
  cells.push({ pass: "orientation", id: "zoom-200", w: 180, h: 780, mobile: true, locale: "sw", state: "returning", informational: true, note: "180 CSS px — BELOW WCAG 1.4.10 Reflow (320) and below the smallest supported phone; reported, not gated" });
  const ONLY_CELL = (process.argv.find((a) => a.startsWith("--cell=")) || "").split("=")[1] || null;
  let out = ONLY_PASS ? cells.filter((c) => c.pass === ONLY_PASS) : cells;
  if (ONLY_CELL) out = out.filter((c) => c.id === ONLY_CELL);
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE CHECKS. One function per class, all evaluated in the page in a single pass.
   Each returns { cls, items: [{what, measured, where}] } — an empty `items` is the only pass.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const CHECKS = /* js */ `(() => {
  const V = [];
  const push = (cls, items) => V.push({ cls, items });
  const vw = innerWidth, vh = innerHeight;
  const sel = (el) => {
    if (!el) return "?";
    const c = (el.className?.baseVal ?? el.className ?? "").toString().trim().split(/\\s+/).filter(Boolean).slice(0, 2).join(".");
    return el.tagName.toLowerCase() + (c ? "." + c : "") + (el.id ? "#" + el.id : "");
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05;
  };
  const textOf = (el) => (el.innerText || "").trim().replace(/\\s+/g, " ").slice(0, 60);

  /* 🔴 EVERY TEXT-BEARING ELEMENT, NOT EVERY CHILDLESS ONE. V2 and V5 used to iterate
     \`el.children.length === 0\`, which silently excluded every element that owns text AND a child
     element — .kp-hero__eyebrow holds a tick span, so the eyebrow was never once examined for
     clipping or for contrast. Exposed by a RED plant that could not make V2 move. An element
     qualifies when it has at least one non-empty DIRECT text node of its own. */
  const textLeaves = () => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!vis(el)) continue;
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) { out.push(el); break; }
      }
    }
    return out;
  };

  /* ⭐ THE ONLY RELIABLE LINE COUNT: measure each WORD's own range and group by its top.
     Dividing height by line-height reported "1 line" for a 116-character question that plainly
     wrapped, so V7 was computing characters-per-line against a denominator of 1 and calling
     every wrapped paragraph a 100-character measure. Shared by V7 and V8b so there is one
     definition of what a line is. */
  const lineWords = (el) => {
    const words = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const txt = n.textContent; const re = /\\S+/g; let m;
      while ((m = re.exec(txt))) {
        const rg = document.createRange();
        rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const r = rg.getBoundingClientRect();
        if (r.height === 0 || r.width === 0) continue;
        words.push({ top: Math.round(r.top), w: m[0] });
      }
    }
    if (!words.length) return null;
    const groups = new Map();
    for (const w of words) groups.set(w.top, (groups.get(w.top) || []).concat(w.w));
    return [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k));
  };

  /* The physical length of the LONGEST rendered line, in em. This is what "measure" actually
     means — a reading column of roughly 30–40em — and a raw character count is only a proxy for
     it. The proxy breaks in Swahili, whose words are long, and it breaks on UI chrome. */
  const widestLineEm = (el, fpx) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const rows = new Map();
    let n;
    while ((n = walk.nextNode())) {
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        if (r.height === 0 || r.width === 0) continue;
        const k = Math.round(r.top);
        const cur = rows.get(k) || { l: Infinity, r: -Infinity };
        rows.set(k, { l: Math.min(cur.l, r.left), r: Math.max(cur.r, r.right) });
      }
    }
    let w = 0;
    for (const v of rows.values()) w = Math.max(w, v.r - v.l);
    return w / (fpx || 16);
  };

  /* ── colour, through a 1×1 canvas so oklch/color-mix survive ─────────────────────────────── */
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => { cx.clearRect(0,0,1,1); cx.fillStyle = css; cx.fillRect(0,0,1,1);
    const d = cx.getImageData(0,0,1,1).data; return [d[0], d[1], d[2], d[3]/255]; };
  const over = (f, b) => [0,1,2].map(i => Math.round(f[i]*f[3] + b[i]*(1-f[3]))).concat(1);
  const lum = (c) => { const [r,g,b] = c.slice(0,3).map(v => { v/=255; return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; });
    return 0.2126*r + 0.7152*g + 0.0722*b; };
  const ratio = (a,b) => { const x = lum(a)+0.05, y = lum(b)+0.05; return +(Math.max(x,y)/Math.min(x,y)).toFixed(2); };
  const bgOf = (el) => { const stack = []; let e = el;
    while (e) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) stack.push(c); e = e.parentElement; }
    let acc = [11,11,32,1]; for (let i = stack.length-1; i >= 0; i--) acc = over(stack[i], acc); return acc; };
  const selfTest = ratio(rgba("white"), rgba("black"));

  /* ⛔ SNAPSHOT THE ANIMATIONS BEFORE ANY CHECK TOUCHES THE PAGE.
     🔴 V9 focuses EVERY interactive element, which starts each one's focus transition — and V10,
     which ran afterwards, then reported those transitions as "not finished after settle". The
     gate was manufacturing its own V10 violations and blaming the page: 3 per cell, on buttons,
     in 49 cells. Order of checks is part of the instrument. */
  const ANIMS = document.getAnimations().map((a) => {
    const t = a.effect && a.effect.target;
    const timing = (a.effect && a.effect.getTiming) ? a.effect.getTiming() : {};
    return {
      name: a.animationName || null,          // null = a CSS transition, not a keyframe animation
      where: (t && t.getBoundingClientRect) ? sel(t) : "?",
      iterations: timing.iterations,
      state: a.playState,
    };
  });

  /* ── V1 horizontal overflow ──────────────────────────────────────────────────────────────────
     🔴 THIS READ documentElement.scrollWidth ALONE AND COULD NEVER FIRE. Measured on production
     2026-09-24: with a 200vw element appended to the body, documentElement.scrollWidth stayed at
     360 while body.scrollWidth went 360 to 720. Both elements compute overflow-x visible, so the
     root's scrolling box does not report the child's spill here. A guard reading only the number
     that does not move is decoration; the RED control is what exposed it. Take the MAX, and name
     which box saw it so the next person does not have to rediscover this.
     (No backticks in this comment on purpose: the whole block is a template literal.) */
  {
    const docSW = document.documentElement.scrollWidth, bodySW = document.body.scrollWidth;
    const widest = Math.max(docSW, bodySW);
    push("V1", widest > vw + 1
      ? [{ what: "content overflows horizontally", measured: widest + " > " + vw + " (doc " + docSW + ", body " + bodySW + ")", where: docSW > bodySW ? "documentElement" : "body" }] : []);
  }

  /* ── V2 clipped text: only where the clip is NOT a declared ellipsis/line-clamp ───────────── */
  {
    const bad = [];
    for (const el of textLeaves()) {
      const s = getComputedStyle(el);
      // 🔴 THE SKIP LINK FIRED THIS IN ALL 52 CELLS. A visually-hidden control is a 1px clipped
      // box BY DESIGN — it is revealed on focus — so "text wider than its box" is what it is
      // supposed to look like. Excluding it by the sr-only geometry rather than by class name,
      // so a differently-named utility is covered too.
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      if (s.clipPath && s.clipPath !== "none" && r.width < 4) continue;
      const declaredTruncation = s.textOverflow === "ellipsis" || s.webkitLineClamp !== "none";
      if (declaredTruncation) continue;                       // a deliberate clamp is not a defect
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;  // nothing is clipped
      if (el.scrollWidth > el.clientWidth + 1) bad.push({ what: "text cut with no ellipsis", measured: el.scrollWidth + " > " + el.clientWidth, where: sel(el) + ' "' + textOf(el) + '"' });
    }
    push("V2", bad);
  }

  /* ── V3 occlusion: an overlay must not win the hit test over money, a CTA or a figure ─────── */
  {
    const overlays = [];
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" || !vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) continue;
      if (el.parentElement && getComputedStyle(el.parentElement).position === "fixed") continue;
      // ⛔ A MODAL COVERING THE PAGE IS THE MODAL WORKING. The first-visit primer reported 10
      // "occlusions" of the header buttons and the proof figures — which is precisely what a
      // dialog and its scrim are for. Only overlays that are NOT a modal count here.
      if (el.closest("[role=dialog], [aria-modal=true]")) continue;
      if (el.querySelector("[role=dialog], [aria-modal=true]")) continue;
      overlays.push(el);
    }
    const TARGETS = ".kp-qrow__price, .kp-qrow__num, .kp-proof__num, .kp-topic__m, a.btn, button.btn, .mcardp-yes, .mcardp-no, .kp-shead__link";
    const bad = [];
    for (const t of document.querySelectorAll(TARGETS)) {
      if (!vis(t)) continue;
      const r = t.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      let buried = 0;
      for (let i = 0; i < 5; i++) {
        const x = r.left + (r.width * (i + 0.5)) / 5, y = r.top + r.height / 2;
        if (x < 0 || x > vw || y < 0 || y > vh) continue;
        const hit = document.elementFromPoint(x, y);
        if (!hit) continue;
        if (overlays.some((o) => o === hit || o.contains(hit))) buried++;
      }
      if (buried > 0) bad.push({ what: "overlay covers " + (buried) + "/5 sample points", measured: buried + "/5", where: sel(t) + ' "' + textOf(t) + '"' });
    }
    push("V3", bad);
  }

  /* ── V4 tap reach, including ::after extensions ───────────────────────────────────────────── */
  {
    const reach = (el) => {
      const r = el.getBoundingClientRect();
      let top = r.top, bot = r.bottom, left = r.left, right = r.right;
      for (const pe of ["::after", "::before"]) {
        const s = getComputedStyle(el, pe);
        if (s.content === "none" || s.position !== "absolute") continue;
        const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : NaN);
        const t = px(s.top), bo = px(s.bottom), l = px(s.left), ri = px(s.right);
        if (!isNaN(t)) top = Math.min(top, r.top + t);
        if (!isNaN(bo)) bot = Math.max(bot, r.bottom - bo);
        if (!isNaN(l)) left = Math.min(left, r.left + l);
        if (!isNaN(ri)) right = Math.max(right, r.right - ri);
      }
      return { h: Math.round(bot - top), w: Math.round(right - left) };
    };
    /* 🔴 THIS ASSERTED A FLOOR OF 44 AND CONDEMNED 784 LEGAL CONTROLS. This platform has its own
       documented standard (scripts/tap-target.test.mts §1): 44 is preferred, and --tap-min is the
       ONE legal step below it — "41, 42 and 43 are not nearly 44". Every one of the 784 was
       exactly 40px, which is that rung. A gate that invents its own bar instead of reading the
       project's makes work that fights the design system; the rung is read FROM THE PAGE so this
       check moves if the platform's floor ever moves. */
    const PREFERRED = 44;
    const rung = Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tap-min"))) || 40;
    const bad = [];
    for (const el of document.querySelectorAll("a,button,[role=button],summary,input,select")) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 && r.height <= 2) continue;              // the skip link, parked off-screen
      const R = reach(el);
      if (R.h >= PREFERRED || R.h === rung) continue;           // legal: the bar, or the one rung below it
      bad.push({ what: R.h > rung ? "between the rung and the floor" : "below the rung",
        measured: R.w + "x" + R.h + " (rung " + rung + ", preferred " + PREFERRED + ")", where: sel(el) + ' "' + textOf(el) + '"' });
    }
    push("V4", bad);
    V[V.length - 1].rung = rung;
  }

  /* ── V5 contrast, instrument self-tested first ───────────────────────────────────────────── */
  {
    const bad = [];
    const unmeasurable = [];
    if (selfTest !== 21) {
      bad.push({ what: "INSTRUMENT BROKEN — white on black did not read 21:1", measured: String(selfTest), where: "self-test" });
    } else {
      const seen = new Set();
      // 🔴 A STYLE READ CANNOT SEE A GRADIENT, AND GUESSING GIVES A CONFIDENT WRONG NUMBER.
      //    The signed-in "Amana" button reported 1.03:1 — dark text apparently on dark navy — and
      //    the page is fine: the button is painted with a background-IMAGE, and this composite only
      //    walks background-COLOR, so it composited against the surface behind the gradient. Third
      //    distinct way this one check has been wrong, after the oklch parser and the missing
      //    ancestor compositing.
      //    ⛔ So an element under any gradient is NOT scored. It is recorded separately as
      //    unmeasurable-from-styles, because a stated gap is honest and a fabricated 1.03 sends
      //    someone to fix a button that is perfectly legible. Measuring these properly needs
      //    painted pixels, which this harness does not sample.
      // ⛔ SIZE DISCRIMINATES, BECAUSE SKIPPING EVERY GRADIENT GUTS THE CHECK. The hero itself
      //    carries a page-scale gradient, so a blanket skip removed the entire hero from contrast
      //    scoring and the RED control went BLIND — the over-correction was worse than the bug.
      //    A page-wide backdrop is near-uniform where the text sits, so compositing background
      //    COLOR is a fair approximation of it. A CONTROL-sized gradient (the 103px "Amana"
      //    button) is not: the paint under the text is nothing like the surface behind it.
      //    So: skip only when the nearest gradient ancestor is control-sized.
      const gradientAbove = (el) => {
        let e = el;
        for (let i = 0; i < 8 && e; i++) {
          if (getComputedStyle(e).backgroundImage !== "none") {
            const r = e.getBoundingClientRect();
            return r.width < vw * 0.5 && r.height < 200;
          }
          e = e.parentElement;
        }
        return false;
      };
      unmeasurable.length = 0;
      for (const el of textLeaves()) {
        if (gradientAbove(el)) { unmeasurable.push(sel(el) + ' "' + textOf(el).slice(0, 24) + '"'); continue; }
        const s = getComputedStyle(el);
        const px = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700;
        const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
        const bg = bgOf(el.parentElement || el);
        // ⛔ THE BACKGROUND IS PART OF THE IDENTITY. Keying the dedupe on selector+colour+size
        // alone treats the same role on a tinted band and on the base surface as one element, so
        // the harder of the two is never computed. Two elements collapse only when the colour
        // AND the composited background behind them are identical.
        const key = sel(el) + "|" + s.color + "|" + s.fontSize + "|" + s.fontWeight + "|" + bg.join(",");
        if (seen.has(key)) continue; seen.add(key);
        const r = ratio(over(rgba(s.color), bg), bg);
        if (r < need) bad.push({ what: "contrast below AA", measured: r + " < " + need + " at " + s.fontSize, where: sel(el) + ' "' + textOf(el) + '"' });
      }
    }
    push("V5", bad);
    V[V.length - 1].unmeasurable = unmeasurable.length;
  }

  /* ── V6 ragged grid: an item whose height differs from its container's median ─────────────── */
  {
    /* 🔴 THE FIRST VERSION COMPARED EVERY CHILD TO THE CONTAINER'S MEDIAN, WHICH IS WRONG THE
       MOMENT THE CONTAINER WRAPS. At 360 the three how-it-works steps are STACKED — one per row,
       three different lengths — and being different heights is simply correct there. It reported
       them as defects in 25 cells. Raggedness is a statement about a ROW, so group by row top
       first. The cross-row comparison then only means something on a real grid (two or more items
       in a row), which is what catches the orphan tile sitting 15px shorter in a row of its own. */
    const bad = [];
    const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    for (const c of document.querySelectorAll(".kp-topics, .market-grid, .kp-steps, .kp-proof, .kp-trust__grid")) {
      if (!vis(c)) continue;
      const kids = [...c.children].filter(vis);
      if (kids.length < 3) continue;
      const rows = new Map();
      for (const k of kids) {
        const r = k.getBoundingClientRect();
        const top = Math.round(r.top);
        rows.set(top, (rows.get(top) || []).concat({ el: k, h: Math.round(r.height) }));
      }
      const rowList = [...rows.keys()].sort((a, b) => a - b).map((t) => rows.get(t));
      const maxPerRow = Math.max(...rowList.map((r) => r.length));
      // A HEIGHT DIFFERENCE IS ONLY VISIBLE WHERE THERE IS A BOX. The how-it-works steps are bare
      // text under a rule — no border, no background — so a shorter final step shows as nothing at
      // all, and flagging it sent work at a defect no reader can see. Raggedness needs an edge.
      const boxed = kids.some((k) => {
        const ks = getComputedStyle(k);
        const bg = ks.backgroundColor;
        // NO REGEX HERE ON PURPOSE. The escaped parens in /rgba(0, 0, 0, 0)/ did not survive
        // the shell that wrote this file, leaving /rgba(0, 0, 0, 0)/ — a capture group that never
        // matches a real transparent colour, so every element read as having a background and this
        // whole guard was inert. A substring test cannot be mangled the same way.
        const hasBg = !!bg && bg !== "transparent" && !bg.startsWith("rgba(0, 0, 0, 0");
        // A SINGLE RULE IS NOT A BOX. .kp-step carries one border-top that the numeral sits on,
        // so "some border" called it boxed and a shorter final step kept being reported — but with
        // the rule at the TOP of each step, a shorter step below it shows as nothing. A height
        // difference needs an enclosing edge to be visible, so require three sides or a background.
        const sides = ["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"]
          .filter((p) => parseFloat(ks[p]) > 0).length;
        const hasBorder = sides >= 3;
        return hasBg || hasBorder;
      });
      if (!boxed) continue;
      if (maxPerRow < 2) continue;                         // stacked: different heights are correct

      for (const row of rowList) {                         // within a row, everything must line up
        if (row.length < 2) continue;
        const m = med(row.map((x) => x.h));
        for (const x of row) {
          if (Math.abs(x.h - m) > 1) bad.push({ what: "item is a different height from its row-mates", measured: x.h + " vs " + m + " in the same row", where: sel(c) + " > " + sel(x.el) + ' "' + textOf(x.el) + '"' });
        }
      }
      const rowHeights = rowList.map((r) => med(r.map((x) => x.h)));
      const gridMed = med(rowHeights);
      rowList.forEach((row, i) => {                        // an under-filled final row that also shrank
        if (row.length >= maxPerRow) return;
        if (Math.abs(rowHeights[i] - gridMed) <= 1) return;
        bad.push({ what: "orphan row is a different height from the grid", measured: rowHeights[i] + " vs " + gridMed + " (" + row.length + " of " + maxPerRow + " in the row)", where: sel(c) + " > " + sel(row[0].el) + ' "' + textOf(row[0].el) + '"' });
      });
    }
    push("V6", bad);
  }

  /* ── V7 measure: running prose above 75 characters per line ──────────────────────────────── */
  {
    const bad = [];
    for (const el of document.querySelectorAll("p, .kp-lede, .kp-step__b, .kp-trust__b, .kp-qrow__q")) {
      if (!vis(el)) continue;
      const t = (el.textContent || "").trim(); if (t.length < 40) continue;
      const s = getComputedStyle(el);
      if (s.fontFamily.includes("JetBrains")) continue;         // data rows are not running prose
      const lines = lineWords(el);                              // real lines, not height / line-height
      if (!lines) continue;
      const cpl = Math.round(t.length / lines.length);
      if (cpl <= 75) continue;
      /* 🔴 THE CHARACTER COUNT ALONE CONDEMNED A NOTICE BAR THAT IS THE RIGHT SHAPE. The signed-in
         email-verify bar renders "Thibitisha barua pepe yako ili kuweka fedha kwenye akaunti.
         Tumekutumia kiungo." as ONE 79-character line beside its action button — 36em, squarely
         inside the ideal 30–40em reading column. Capping it to 75 characters would WRAP a notice
         bar onto two lines, which is worse than the thing being reported. Seen on production
         2026-09-24 at 768 and 1280; the frame is what settled it, not the number.
         ⛔ THE OBVIOUS FIX — skipping single-line elements — WOULD HAVE KILLED V7 OUTRIGHT. Its own
         RED control plants ONE 3000px line at 6px, so lines.length < 2 makes the control, and
         therefore the whole class, unable to fail. The control is what caught that.
         So both conditions must hold: too many characters AND a line physically longer than any
         reading column. 36em passes, the control’s ~500em does not. */
      const em = Math.round(widestLineEm(el, parseFloat(s.fontSize)));
      if (em <= 45) continue;
      bad.push({ what: "measure above 75 characters", measured: cpl + " chars/line over " + lines.length + " lines (" + em + "em)", where: sel(el) + ' "' + textOf(el) + '"' });
    }
    push("V7", bad);
  }

  /* ── V8b lone-glyph line: a heading whose last line is a single short token ───────────────── */
  {
    /* 🔴 THE FIRST VERSION WAS BLIND AND ITS RED CONTROL PROVED IT. It asked whether the LAST
       CLIENT RECT was under 40px wide — but a rect list is not a line list, and a heading whose
       final line is "sasa ok" has a wide final rect while still being badly broken. Worse, it
       could not fire at all on the case it was written for. The honest question is how many WORDS
       sit on the final line, so measure each word's own range and group the words by line top.
       A single word on the last line is only a defect when the word is SHORT — a heading ending
       on "bwawa" is ordinary typography; one ending on "ok" is a widow. */
    const bad = [];
    for (const el of document.querySelectorAll("h1, h2, h3, .kp-shead__h, .kp-hero__headline, .kp-step__h, .kp-hero__eyebrow")) {
      if (!vis(el)) continue;
      // ⛔ A CLAMPED HEADING IS NOT A WIDOW. The card question wears a 3-line clamp with an
      // ellipsis; word ranges still resolve for the clipped remainder, so it reported "8 lines,
      // last line 24)?" — a line nobody can see. Deliberate truncation is out of scope here.
      const cs = getComputedStyle(el);
      if (cs.webkitLineClamp !== "none" || cs.textOverflow === "ellipsis") continue;
      const lines = lineWords(el);
      if (!lines || lines.length < 2) continue;
      const last = lines[lines.length - 1];
      if (last.length === 1 && last[0].length <= 4) {
        bad.push({ what: "heading ends on a widow", measured: lines.length + " lines, last line is \\"" + last[0] + "\\"", where: sel(el) + ' "' + textOf(el) + '"' });
      }
    }
    push("V8b", bad);
  }

  /* ── V9 focus: every interactive element must paint a ring, and it must not be clipped ───── */
  {
    const bad = [];
    // ⛔ NO SILENT CAP. A sibling gate on this platform passed 64/64 while a cell rendered
    // unreadable, because it only ever measured the first three cells of each row. Every
    // focusable element is examined, and the count is reported so "clean" can be told apart
    // from "barely looked".
    // 🔴 THIS READ A TRANSITIONED PROPERTY MID-FLIGHT AND REPORTED 260 DEFECTS THAT DO NOT EXIST.
    //    The served CSS transitions outline-offset, so the value at rest is the initial 0px and a
    //    read within ~160ms of focusing returns an interpolated number. 0px is EXACTLY the midpoint
    //    of a 2px -> -2px animation, which is why it reads as a plausible "ring not moved inside the
    //    clip" rather than as a broken instrument. The fix (outline-offset: -2px) had shipped a day
    //    earlier and my gate called it 260 times over. Caught by the mobile-s2 session sampling the
    //    value over time instead of once.
    //    ⛔ So transitions are suppressed for the duration of this check ONLY, which makes every
    //    focus read the SETTLED value. V10 is unaffected: it reports from a snapshot taken before
    //    any check ran.
    const noTrans = document.createElement("style");
    noTrans.textContent = "*{transition:none !important}";
    document.head.appendChild(noTrans);
    const els = [...document.querySelectorAll("a,button,[role=button],summary")].filter(vis);
    const examined = els.length;
    const active = document.activeElement;
    for (const el of els) {
      const before = getComputedStyle(el).outlineWidth;
      try { el.focus({ preventScroll: true }); } catch { continue; }
      if (document.activeElement !== el) continue;             // not focusable; not this check's business
      const s = getComputedStyle(el);
      const w = parseFloat(s.outlineWidth) || 0;
      const shadow = s.boxShadow && s.boxShadow !== "none";
      if (w === 0 && !shadow) { bad.push({ what: "no focus ring", measured: "outline-width 0, no box-shadow", where: sel(el) + ' "' + textOf(el) + '"' }); continue; }
      // the ring's box is the element grown by offset + width; compare it to every clipping ancestor
      const off = parseFloat(s.outlineOffset) || 0;
      const r = el.getBoundingClientRect();
      const ring = { top: r.top - off - w, bottom: r.bottom + off + w, left: r.left - off - w, right: r.right + off + w };
      // A FIXED ELEMENT IS NOT CLIPPED BY THE DOCUMENT. The bottom rail is position:fixed and its
      // ring was being compared against body, which reported every rail item as clipped. Stop at
      // the nearest fixed ancestor, and never treat html/body as a clipping box.
      let p = el.parentElement, clipped = null;
      while (p && !clipped) {
        const ps = getComputedStyle(p);
        if (ps.position === "fixed") break;
        if (p === document.body || p === document.documentElement) break;
        if (ps.overflow !== "visible" && ps.overflow !== "") {
          const pr = p.getBoundingClientRect();
          if (ring.top < pr.top - 0.5 || ring.bottom > pr.bottom + 0.5 || ring.left < pr.left - 0.5 || ring.right > pr.right + 0.5) clipped = p;
        }
        p = p.parentElement;
      }
      if (clipped) bad.push({ what: "focus ring clipped by an ancestor", measured: "offset " + s.outlineOffset + ", width " + s.outlineWidth, where: sel(el) + " inside " + sel(clipped) });
    }
    try { if (active && active.focus) active.focus({ preventScroll: true }); } catch {}
    noTrans.remove();
    push("V9", bad);
    V[V.length - 1].examined = examined;
  }

  /* ── V10 motion: nothing left frozen, invisible or unfinished after settle ───────────────── */
  {
    const bad = [];
    for (const a of ANIMS) {                                    // the pre-check snapshot, not a live read
      if (a.iterations === Infinity || a.iterations === null) continue;  // breathing dots are meant to run
      if (a.state !== "finished") bad.push({ what: a.name ? "animation not finished after settle" : "transition not settled", measured: (a.name || "transition") + " " + a.state, where: a.where });
    }
    for (const el of document.querySelectorAll("[data-band], section, .kp-band")) {
      if (!el.textContent.trim()) continue;
      const s = getComputedStyle(el);
      if (+s.opacity < 0.05) bad.push({ what: "band still invisible after settle", measured: "opacity " + s.opacity, where: sel(el) });
    }
    push("V10", bad);
  }

  /* ── V11 dead states: advertised emptiness, and a collapsed price leading the page ────────── */
  {
    const bad = [];
    for (const el of document.querySelectorAll(".kp-topic__m, .kp-topic__pool")) {
      if (!vis(el)) continue;
      if (/TZS\\s*0(?!\\d)/.test(el.textContent || "")) bad.push({ what: "tile advertises an empty book", measured: textOf(el), where: sel(el) });
    }
    const rows = [...document.querySelectorAll(".kp-qrow")].filter(vis);
    rows.forEach((r, i) => {
      const n = (r.querySelector(".kp-qrow__num")?.textContent || "").trim();
      if (n === "0" || n === "100") bad.push({ what: "collapsed price in the hero board", measured: n + "%", where: "hero row " + (i + 1) });
    });
    push("V11", bad);
  }

  /* ── V12 a settled row may not describe as REFUNDED a market that was decided ────────
     Found on production 2026-09-24: the branch isVoid OR amountTzs == null OR amountTzs <= 0
     states into one word, so a market resolved YES with an empty pool carried the refund word
     beside an outcome pill naming a side. Nothing was refunded; nothing was ever staked.
     ⛔ IDENTIFIED BY THE CHIP VARIANT, NEVER BY THE WORD. The product ships in sw/en/zh and a
     driver that reads a visible outcome word is a driver that breaks on a translation. Chip
     emits data-kit-chip-variant, which is the machine-readable identity. */
  {
    const bad = [];
    for (const row of document.querySelectorAll(".kp-settled__row")) {
      if (!vis(row)) continue;
      const pill = row.querySelector("[data-kit-chip-variant]");
      const v = pill && pill.getAttribute("data-kit-chip-variant");
      const refundShown = !!row.querySelector(".kp-settled__amt--void");
      if ((v === "yes" || v === "no") && refundShown) {
        bad.push({ what: "a decided market is described as refunded", measured: "chip=" + v + " + refund word",
          where: ".kp-settled__row " + JSON.stringify(textOf(row).slice(0, 44)) });
      }
    }
    push("V12", bad);
  }

  /* ── V13 an overlay may not put content where nobody can scroll to it ───────────────
     Found on production 2026-09-24: the first-visit primer's last card is 789px in a 640px
     viewport, docked by align-items:flex-end, so 149px sat ABOVE the scroll origin of a wrapper
     that scrolls — overflow before a flex-end child is not reachable. The panel could not scroll
     itself either (scrollHeight === clientHeight), so the heading was simply gone.
     An element inside a fixed ancestor is flagged when it extends past the viewport AND neither it
     nor an ancestor can scroll to the missing part. */
  {
    const bad = [];
    const fixedAncestor = (el) => { let e = el; while (e) { if (getComputedStyle(e).position === "fixed") return e; e = e.parentElement; } return null; };
    const seenPanels = new Set();
    for (const el of document.querySelectorAll("body *")) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 80 || r.width < 80) continue;
      const fx = fixedAncestor(el);
      if (!fx || fx === el) continue;
      if (seenPanels.has(el)) continue;
      const over = Math.round(Math.max(0, -r.top));
      const under = Math.round(Math.max(0, r.bottom - vh));
      if (over < 2 && under < 2) continue;
      const selfScrolls = el.scrollHeight > el.clientHeight + 1;
      let anc = el.parentElement, ancScrolls = false;
      while (anc && anc !== fx.parentElement) {
        const as = getComputedStyle(anc);
        if (/(auto|scroll)/.test(as.overflowY) && anc.scrollHeight > anc.clientHeight + 1) { ancScrolls = true; break; }
        anc = anc.parentElement;
      }
      // flex-end docking puts the overflow BEFORE the scroll origin: a scrollable ancestor
      // does not rescue content cut off the TOP when its alignment is end/center.
      const wrapAlign = getComputedStyle(el.parentElement || el).alignItems;
      const rescuable = ancScrolls && !(over > 0 && /(flex-)?end|center/.test(wrapAlign));
      if (selfScrolls || rescuable) continue;
      seenPanels.add(el);
      bad.push({ what: over > 0 ? "overlay content cut above the viewport with no way to scroll to it" : "overlay content past the bottom with no way to scroll to it",
        measured: "cut " + (over || under) + "px, panel " + Math.round(r.height) + " in " + vh + ", align " + wrapAlign,
        where: sel(el) + ' "' + textOf(el).slice(0, 34) + '"' });
    }
    push("V13", bad);
  }

  /* ── V14 the landing page must actually be on the page ───────────────────────────
     🔴 THIS EXISTS BECAUSE THE GATE WAS REPORTING THE NO-JS CELLS AS CLEAN. With JavaScript off
     the document is 2108px against 7361px: header, a placeholder card, the rail and the footer,
     and nothing else. Every class I had measured overflow, clipping, occlusion, contrast, focus
     and was perfectly happy, because there was almost nothing there to be wrong. A cell that
     measured LESS is not a cleaner cell, and a gate that cannot tell the difference will certify
     an empty page. The content is in the HTML but sits behind a streaming Suspense boundary whose
     swap script never runs, so nothing paints it.
     The landmarks below are the page: its hero, a priced question, the topic tiles and the
     settled strip. If the surface under test does not show them, no other number about it means
     anything. Skipped on the loading-skeleton cell, which is not supposed to have them yet. */
  {
    const bad = [];
    const LANDMARKS = [
      [".kp-hero", "the hero"],
      [".kp-qrow", "a question row"],
      [".kp-topic", "the topic tiles"],
      [".kp-settled__row", "the settled strip"],
    ];
    for (const [q, name] of LANDMARKS) {
      const found = [...document.querySelectorAll(q)].filter(vis).length;
      if (found === 0) bad.push({ what: "the landing page did not render " + name, measured: "0 visible " + q,
        where: "document (" + Math.round(document.documentElement.scrollHeight) + "px tall)" });
    }
    push("V14", bad);
  }

  /* ── V15 the first screen shows a live market (landing v3) ───────────────────────────────────
     The delivery's mobile reviewer: at 360 x 740 the first screen shows the pitch AND a live market
     with its price and its YES/NO. So on every phone cell the featured card's price and its action
     row must END by 740px of document, measured at the top of the page. 740 is a FIXED line, not the
     viewport: the 360 cells are 780 tall, and a budget read off innerHeight would quietly grow with
     the cell. A cell narrower than 360 is reported by V1/V2, not here — 740 is the delivery's frame.
     No featured card at all is a finding, not a pass: a first screen without a market is the exact
     state this class exists to catch. */
  if (vw >= 360 && vw < 640) {
    const bad = [];
    const card = [...document.querySelectorAll(".kp-hero__card .mcardp")].find(vis);
    if (!card) bad.push({ what: "no featured market in the hero", measured: "0 visible .kp-hero__card .mcardp", where: "hero" });
    else {
      for (const [q, name] of [[".mcardp-prob", "its price"], [".mcardp-actions", "its YES/NO"]]) {
        const el = card.querySelector(q);
        if (!el || !vis(el)) { bad.push({ what: "the featured card shows no " + name, measured: "0 visible " + q, where: sel(card) }); continue; }
        const bottom = Math.round(el.getBoundingClientRect().bottom + scrollY);
        if (bottom > 740) bad.push({ what: "the featured card's " + name.replace("its ", "") + " ends below the first screen", measured: bottom + "px > 740", where: sel(el) });
      }
    }
    push("V15", bad);
  } else push("V15", []);

  /* ── V16 no promised winnings (landing v3) ──────────────────────────────────────────────────
     Law 1 of the delivery and LAWS §C3: no "win TZS X" on an open market, no stake-times-multiplier
     sum, in any of the three languages. The estimate is off on the landing by ruling (R3), so ANY
     multiplier-of-a-stake string here is a finding. Read from visible text only — a string a
     screen reader hears but nobody sees is still a claim, but a hidden sizer is not. */
  {
    const bad = [];
    const PROMISE = [
      [/\\bwin\\s+(up\\s+to\\s+)?TZS\\b/i, "win TZS"],
      [/\\butashinda\\b/i, "utashinda"],
      [/赢得\\s*TZS/, "赢得 TZS"],
      [/\\bTZS\\s?[\\d,.]+\\s*[×x]\\s*\\d/i, "a stake times a multiplier"],
      [/\\b\\d+(?:\\.\\d+)?\\s*[×x]\\s+(?:your\\s+)?stake\\b/i, "a multiple of your stake"],
    ];
    const seen = new Set();
    for (const el of textLeaves()) {
      const t = (el.textContent || "").replace(/\\s+/g, " ").trim();
      for (const [re, name] of PROMISE) {
        if (re.test(t) && !seen.has(t)) { seen.add(t); bad.push({ what: "a promised return: " + name, measured: JSON.stringify(t.slice(0, 60)), where: sel(el) }); }
      }
    }
    push("V16", bad);
  }

  /* ── V17 no degenerate price anywhere a market is priced (landing v3) ──────────────────────
     V11 catches a 0% / 100% price LEADING the page; V17 catches one anywhere on a card or a board
     row. A one-sided market has no price (a price needs two sides, MOBILE-VISUAL ruling 13) and a
     lopsided two-sided one is shown within 1-99 (L14), so a rendered 0% or 100% is always a
     statement of certainty nobody's money made. Read per market surface, never off the whole page:
     the conviction bar's reading is an aggregate, not a price. */
  {
    const bad = [];
    const DEGEN = /(?:^|[^\\d.])(0|100)\\s?%/;
    for (const surface of document.querySelectorAll(".mcardp, .kp-qrow")) {
      if (!vis(surface)) continue;
      for (const el of surface.querySelectorAll("*")) {
        if (!vis(el)) continue;
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
        const joined = (own + " " + (el.children.length ? "" : "")).trim();
        const full = (el.textContent || "").replace(/\\s+/g, " ").trim();
        // a price reads as NUMBER then "%" — test the element's full text when it is small (a button
        // label, a price cell), its own text otherwise, so a long sentence is not searched twice.
        const probe = full.length <= 24 ? full : joined;
        if (probe && DEGEN.test(probe)) { bad.push({ what: "a 0% or 100% price", measured: JSON.stringify(probe.slice(0, 40)), where: sel(surface) + " > " + sel(el) }); break; }
      }
    }
    push("V17", bad);
  }

  /* ── the text map V8 needs, compared across locales AFTER the sweep ──────────────────────── */
  const textMap = {};
  for (const s2 of [".kp-hero__headline", ".kp-hero__eyebrow", ".kp-lede", ".kp-shead__h", ".kp-step__h", ".kp-step__b", ".kp-trust__b", ".kp-rg__say", ".kp-proof__cap"]) {
    textMap[s2] = [...document.querySelectorAll(s2)].filter(vis).map((e) => (e.textContent || "").trim()).slice(0, 6);
  }

  return { V, textMap, selfTest, docH: document.documentElement.scrollHeight, vw, vh, lang: document.documentElement.lang };
})()`;

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE RED CONTROLS — each plants its own class's defect and nothing else.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
/**
 * ⭐ EVERY PLANT REPORTS WHETHER IT LANDED. Without this, "the class did not move" is ambiguous
 * between two completely different verdicts — the CHECK is blind, or the PLANT missed its target
 * (wrong selector, element not visible, a CSS rule outranking an inline style). Three plants
 * missed silently on the first run and were read as blind checks. A plant that cannot prove it
 * changed the page is not evidence about the check.
 * Each returns { applied: boolean, note: string }.
 */
const REDS = {
  V1: `(() => { const before = document.body.scrollWidth;
        const d = document.createElement("div"); d.style.cssText = "width:200vw;height:4px"; document.body.appendChild(d);
        return { applied: document.body.scrollWidth > before, note: before + " -> " + document.body.scrollWidth }; })()`,

  V2: `(() => { const e = [...document.querySelectorAll(".kp-hero__eyebrow, .kp-shead__h, .kp-topic__n")].find((x) => x.getBoundingClientRect().width > 0);
        if (!e) return { applied: false, note: "no target found" };
        e.style.cssText += ";overflow:hidden !important;white-space:nowrap !important;text-overflow:clip !important;max-width:20px !important;display:block !important";
        return { applied: e.scrollWidth > e.clientWidth + 1, note: e.scrollWidth + " vs " + e.clientWidth }; })()`,

  V3: `(() => { const t = [...document.querySelectorAll(".kp-qrow__price, a.btn, .kp-proof__num")].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.top < innerHeight; });
        if (!t) return { applied: false, note: "no on-screen target" };
        const r = t.getBoundingClientRect(); const f = document.createElement("div");
        f.style.cssText = "position:fixed;z-index:99999;background:#f00;width:" + Math.max(24, r.width) + "px;height:" + Math.max(24, r.height) + "px;left:" + r.left + "px;top:" + r.top + "px";
        document.body.appendChild(f);
        const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { applied: mid === f, note: "hit test returns " + (mid === f ? "the overlay" : "the target") }; })()`,

  V4: `(() => { const b = [...document.querySelectorAll("a.btn, button.btn")].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height >= 44; });
        if (!b) return { applied: false, note: "no button at or above 44px to shrink" };
        b.style.setProperty("height", "20px", "important"); b.style.setProperty("min-height", "20px", "important");
        b.style.setProperty("padding", "0", "important"); b.style.setProperty("line-height", "20px", "important");
        return { applied: b.getBoundingClientRect().height < 44, note: "now " + Math.round(b.getBoundingClientRect().height) + "px" }; })()`,

  V5: `(() => { const e = [...document.querySelectorAll(".kp-lede, .kp-step__b, .kp-trust__b, p")].find((x) => x.getBoundingClientRect().width > 0 && (x.textContent || "").trim());
        if (!e) return { applied: false, note: "no prose target" };
        const before = getComputedStyle(e).color;
        e.style.setProperty("color", "rgb(16,16,42)", "important");
        return { applied: getComputedStyle(e).color !== before, note: before + " -> " + getComputedStyle(e).color }; })()`,

  V6: `(() => {
        // Look at EVERY boxed grid and take the first with a row of more than one item. At 360
        // the card grid is a single column, so picking one container by querySelector found no
        // row-mate and the plant silently missed — reported INCONCLUSIVE, which is why it is here.
        const rowsOf = (g) => {
          const m = new Map();
          for (const k of [...g.children]) {
            const r = k.getBoundingClientRect();
            if (r.height <= 0) continue;
            const t = Math.round(r.top);
            m.set(t, (m.get(t) || []).concat(k));
          }
          return [...m.values()];
        };
        let full = null;
        for (const g of document.querySelectorAll(".kp-topics, .market-grid")) {
          const cand = rowsOf(g).find((r) => r.length > 1);
          if (cand) { full = cand; break; }
        }
        if (!full) return { applied: false, note: "no boxed grid has a row with more than one item at this width" };
        const victim = full[0];
        const before = victim.getBoundingClientRect().height;
        victim.style.setProperty("align-self", "start", "important");
        victim.style.setProperty("height", String(Math.round(before / 2)) + "px", "important");
        const after = victim.getBoundingClientRect().height;
        return { applied: Math.abs(after - before) > 1, note: Math.round(before) + " -> " + Math.round(after) + " beside a row-mate" }; })()`,
  V7: `(() => { const e = [...document.querySelectorAll(".kp-lede, .kp-step__b, .kp-trust__b")].find((x) => (x.textContent || "").trim().length > 60);
        if (!e) return { applied: false, note: "no long prose" };
        e.style.setProperty("max-width", "none", "important"); e.style.setProperty("font-size", "6px", "important");
        e.style.setProperty("width", "3000px", "important");
        return { applied: true, note: "forced to 3000px at 6px" }; })()`,

  V8b: `(() => { const h = [...document.querySelectorAll(".kp-shead__h, h2")].find((x) => x.getBoundingClientRect().width > 0);
        if (!h) return { applied: false, note: "no heading" };
        // One long unbreakable word then a short one, in a measure that fits only the long word,
        // so the short word is FORCED alone onto the last line. The earlier plant used two short
        // words and they shared the final line — the plant, not the page, decided the outcome.
        h.textContent = "Chaguaupandesasahivi ok";
        h.style.setProperty("max-width", "20ch", "important");
        const before = h.getBoundingClientRect().height;
        return { applied: before > 0, note: "forced a lone short word onto the last line" }; })()`,

  V9: `(() => { const s = document.createElement("style");
        s.textContent = "a,button,[role=button],summary{outline:0 !important;box-shadow:none !important}";
        document.head.appendChild(s);
        const b = document.querySelector("a.btn, button.btn"); if (b) b.focus({ preventScroll: true });
        return { applied: b ? parseFloat(getComputedStyle(b).outlineWidth) === 0 : false, note: b ? getComputedStyle(b).outlineWidth : "no button" }; })()`,

  V10: `(() => { const el = document.querySelector("[data-band='hero'], .kp-hero");
        if (!el) return { applied: false, note: "no hero band" };
        el.style.setProperty("opacity", "0.01", "important");
        return { applied: +getComputedStyle(el).opacity < 0.05, note: getComputedStyle(el).opacity }; })()`,

  V12: `(() => { const row = [...document.querySelectorAll(".kp-settled__row")].find((r) => {
          const p = r.querySelector("[data-kit-chip-variant]");
          const v = p && p.getAttribute("data-kit-chip-variant");
          return (v === "yes" || v === "no") && !r.querySelector(".kp-settled__amt--void"); });
        if (!row) return { applied: false, note: "no decided settled row on the page to corrupt" };
        const amt = row.querySelector(".kp-settled__amt");
        if (!amt) return { applied: false, note: "the decided row has no amount cell" };
        amt.classList.add("kp-settled__amt--void");
        return { applied: !!row.querySelector(".kp-settled__amt--void"), note: "refund word planted on a decided row" }; })()`,
  V13: `(() => {
        // The defect is content cut ABOVE a flex-end dock, not content past the bottom — a
        // scrollable ancestor genuinely rescues the latter, and V13 is right to ignore it. The
        // first version of this plant grew a panel downwards and proved nothing.
        // Prefer the real modal panel; fall back to any large element inside a fixed ancestor.
        const panels = [...document.querySelectorAll(".mat-modal, body *")].filter((e) => {
          const r = e.getBoundingClientRect(); if (r.height < 80 || r.width < 80) return false;
          let a2 = e.parentElement; while (a2) { if (getComputedStyle(a2).position === "fixed") return true; a2 = a2.parentElement; } return false; });
        const el = document.querySelector(".mat-modal") || panels[0];
        if (!el) return { applied: false, note: "no overlay panel on the page to overflow" };
        const wrap = el.parentElement;
        if (!wrap) return { applied: false, note: "panel has no wrapper to dock against" };
        wrap.style.setProperty("align-items", "flex-end", "important");
        // ⛔ max-height MUST BE DEFEATED OR THE PLANT CANNOT LAND. The primer now caps its panel at
        //    85dvh — which is the very fix this class exists to hold in place — so setting a height
        //    beyond the viewport is silently clamped and the panel never overflows. The plant went
        //    INCONCLUSIVE rather than pretending to prove anything, which is the point of that verdict.
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("height", String(innerHeight + 300) + "px", "important");
        el.style.setProperty("overflow", "hidden", "important");
        wrap.scrollTop = 0;
        const r = el.getBoundingClientRect();
        return { applied: r.top < -1, note: "panel " + Math.round(r.height) + " in " + innerHeight + ", top " + Math.round(r.top) }; })()`,
  V14: `(() => { const h = document.querySelector(".kp-hero");
        if (!h) return { applied: false, note: "no hero to hide" };
        h.style.setProperty("display", "none", "important");
        return { applied: getComputedStyle(h).display === "none", note: "hero hidden" }; })()`,
  V11: `(() => { const m = [...document.querySelectorAll(".kp-topic__m")].find((x) => x.getBoundingClientRect().width > 0);
        if (!m) return { applied: false, note: "no topic meta" };
        m.textContent = "4 hai · TZS 0";
        return { applied: /TZS\\s*0/.test(m.textContent), note: m.textContent }; })()`,
  // landing v3 — push the featured card down past the first screen. A margin, not an inserted node:
  // the hero is a grid of NAMED areas, and a new child would be auto-placed into a row of its own
  // at the end rather than in front of the card.
  V15: `(() => { const c = document.querySelector(".kp-hero__card");
        if (!c) return { applied: false, note: "no .kp-hero__card" };
        const before = Math.round(c.getBoundingClientRect().top + scrollY);
        c.style.marginTop = "800px";
        const after = Math.round(c.getBoundingClientRect().top + scrollY);
        return { applied: after - before >= 700, note: "card top " + before + " -> " + after }; })()`,
  V16: `(() => { const host = document.querySelector("main") || document.body;
        const p = document.createElement("p"); p.textContent = "Win TZS 50,000 today";
        p.style.cssText = "font-size:16px;color:#fff;position:relative";
        host.prepend(p);
        return { applied: p.getBoundingClientRect().height > 0, note: "planted a promised return" }; })()`,
  V17: `(() => { const b = [...document.querySelectorAll(".mcardp .btn-yes, .mcardp-yes")].find((x) => x.getBoundingClientRect().width > 0);
        if (!b) return { applied: false, note: "no visible YES button on a card" };
        b.textContent = "YES @ 100%";
        return { applied: b.textContent === "YES @ 100%", note: "a card button now reads 100%" }; })()`,
};

/* ══════════════════════════════════════════════════════════════════════════════════════════════ */
async function runCell(browser, cell, plantKey = null, signedInState = null) {
  const ctx = await browser.newContext({
    viewport: { width: cell.w, height: cell.h },
    deviceScaleFactor: 1,
    isMobile: cell.mobile, hasTouch: cell.mobile,
    // ⛔ ONE SESSION PER ACCOUNT. The state is minted ONCE for the whole matrix and reused; a
    //    second login revokes the first, and logging in per cell also trips the server's attempt
    //    limiting partway through and reports product failures that are not.
    ...(cell.state === "signedin" && signedInState ? { storageState: signedInState } : {}),
    userAgent: cell.mobile ? UA_MOBILE : UA_DESK,
    javaScriptEnabled: cell.state !== "nojs",
    reducedMotion: cell.state === "reducedmotion" ? "reduce" : "no-preference",
  });
  try {
    if (cell.locale !== "sw") {
      await ctx.addCookies([{ name: "kp-locale", value: cell.locale, domain: new URL(BASE).hostname, path: "/" }]);
    }
    if (cell.state !== "firstvisit" && cell.state !== "nojs") {
      await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
    }
    if (cell.state === "compact") {
      await ctx.addInitScript(() => { try { document.documentElement.setAttribute("data-density", "compact"); } catch {} });
    }
    const page = await ctx.newPage();
    if (cell.state !== "firstvisit" && cell.state !== "nojs") {
      await page.goto(BASE + "/", { waitUntil: "load", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const d = page.getByTestId("consent-decline");
      if (await d.count()) await d.first().click({ timeout: 6000 }).catch(() => {});
    }
    /* ── the loading-skeleton cell: arrive at "/" the way a player does, by a client-side hop ── */
    if (cell.state === "clienthop") {
      await page.goto(BASE + "/markets", { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(3000);
      // Slow the network so the skeleton is on screen long enough to be measured rather than raced.
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 20 * 1024,
      });
      const home = page.locator('header a[href="/"]').first();
      if (!(await home.count())) throw new Error("no client-side route to / in the header — cannot reach loading.tsx");
      await home.click({ timeout: 10000, noWaitAfter: true }).catch(() => {});
      /* 🔴 A BLIND 700ms MADE THIS CELL NON-DETERMINISTIC, AND A GATE THAT ANSWERS DIFFERENTLY ON
         THE SAME INPUT CERTIFIES NOTHING. The hop starts on /markets, so until the route commits
         the discovery bar is still mounted and CHECKS measures ANOTHER PAGE. Run three times on
         one commit, this cell returned clean, clean, then V5:2 + V9:17 — all seventeen of them
         a.kp-fchip inside nav.kp-thin-scroll, which is /markets chrome and does not exist on the
         landing page (0 occurrences against 54). The two clean readings were luck, not evidence.
         ⛔ SO WAIT FOR THE ROUTE TO COMMIT, NOT FOR A DURATION, and then PROVE the old route is
         gone rather than assume it. If either never happens this throws, the cell is reported
         unmeasured, and the matrix says so — a failed read is not a zero. */
      await page.waitForFunction(() => location.pathname === "/", null, { timeout: 25000 });
      await page.waitForTimeout(250);
      if (await page.evaluate(() => !!document.querySelector(".kp-fchip"))) {
        throw new Error("client hop measured /markets chrome: .kp-fchip still mounted after the route committed");
      }
      const r0 = await page.evaluate(CHECKS);
      await page.screenshot({ path: join(OUT, `${cell.id}.png`) }).catch(() => {});
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await ctx.close();
      return { cell: cell.id, pass: cell.pass, w: cell.w, locale: cell.locale, state: cell.state, skeleton: true, ...r0, ok: true };
    }

    // ⛔ THE FIRST-VISIT CELL HAD NEVER SEEN THE PRIMER. `first-visit-primer.tsx` refuses to open
    //    for a HeadlessChrome UA unless automation asks, so every browser gate on this platform,
    //    including this one, photographed a first visit with no primer in it. `?primer=1` is the
    //    opt-in the component provides for exactly this.
    const target = BASE + (cell.state === "firstvisit" ? "/?primer=1" : "/");
    const resp = await page.goto(target, { waitUntil: "load", timeout: 60000 }).catch((e) => ({ err: e.message }));
    if (resp && resp.err) throw new Error("navigation failed: " + resp.err);
    // Settle: every arrive/draw animation in motion.css is well under 2s; 6s is generous and
    // deliberate — a frozen or late-rising band is V10's business, not a race with the harness.
    await page.waitForTimeout(cell.state === "nojs" ? 2500 : 6000);
    // Fire every <Reveal> before measuring, or a band below the fold reads as "invisible".
    const dh = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => cell.h);
    for (let y = 0; y < dh; y += Math.floor(cell.h * 0.8)) {
      await page.evaluate((v) => scrollTo(0, v), y).catch(() => {});
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => scrollTo(0, 0)).catch(() => {});
    await page.waitForTimeout(800);

    let plantResult = null;
    if (plantKey && REDS[plantKey]) plantResult = await page.evaluate(REDS[plantKey]);

    const r = await page.evaluate(CHECKS);
    if (plantResult) r.plant = plantResult;
    await page.screenshot({ path: join(OUT, `${cell.id}.png`) }).catch(() => {});
    await ctx.close();
    return { cell: cell.id, pass: cell.pass, w: cell.w, locale: cell.locale, state: cell.state, note: cell.note || "", informational: !!cell.informational, ...r, ok: true };
  } catch (e) {
    await ctx.close().catch(() => {});
    return { cell: cell.id, pass: cell.pass, w: cell.w, locale: cell.locale, state: cell.state, ok: false, error: String(e.message).split("\n")[0] };
  }
}

const cells = buildCells();
console.log(`gate: ${cells.length} cells against ${BASE}${RED_MODE ? `  [RED CONTROL: ${RED}]` : ""}`);
const browser = await chromium.launch({ headless: true });

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   RED MODE — a DELTA, not a count.
   🔴 THE FIRST VERSION ASKED "did the class report anything?" and passed V4 and V2 on classes that
   were ALREADY failing, where planting the defect changed nothing at all (V4 read 18 with and
   without its plant; V2 read 1 either way). A control that cannot tell its own defect from the
   page's existing ones proves nothing. So: run the SAME cell clean, then planted, and require the
   target class to GO UP. Other classes moving is reported too — a plant that disturbs its
   neighbours is a badly aimed plant.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
if (RED_MODE) {
  const c = cells[0];
  if (!c) { console.error("no cell selected — pass --cell=<id>"); process.exit(2); }
  if (!REDS[RED]) { console.error(`no RED control defined for ${RED}`); process.exit(2); }
  const clean = await runCell(browser, c, null);
  const planted = await runCell(browser, c, RED);
  await browser.close();
  if (!clean.ok || !planted.ok) {
    console.error(`⛔ could not measure: clean=${clean.error || "ok"} planted=${planted.error || "ok"}`);
    process.exit(2);
  }
  const countOf = (r, cls) => (r.V.find((v) => v.cls === cls)?.items.length) ?? 0;
  const classes = [...new Set([...clean.V, ...planted.V].map((v) => v.cls))];
  const deltas = classes.map((cls) => ({ cls, clean: countOf(clean, cls), planted: countOf(planted, cls) }))
    .map((d) => ({ ...d, delta: d.planted - d.clean }));
  console.log(`\nRED ${RED} on ${c.id}`);
  for (const d of deltas) console.log(`  ${d.cls.padEnd(4)} ${String(d.clean).padStart(3)} → ${String(d.planted).padStart(3)}  ${d.delta > 0 ? "+" + d.delta : d.delta === 0 ? "" : String(d.delta)}`);
  const target = deltas.find((d) => d.cls === RED);
  const collateral = deltas.filter((d) => d.cls !== RED && d.delta !== 0);
  const plant = planted.plant || { applied: false, note: "plant returned nothing" };
  console.log(`  plant: ${plant.applied ? "APPLIED" : "DID NOT APPLY"} — ${plant.note}`);
  const pass = plant.applied && target && target.delta > 0;
  // ⛔ THREE VERDICTS, NOT TWO. "the class did not move" means nothing until we know the plant
  //    landed: a missed plant is a broken experiment, a landed plant that moves nothing is a
  //    blind check. Reporting them as one thing is how a decorative guard gets signed off.
  console.log(!plant.applied
    ? `⛔ ${RED} INCONCLUSIVE: the plant never took effect, so this run says nothing about the check. Fix the plant.`
    : pass
      ? `✅ ${RED} PROVED: its own defect raised it by ${target.delta}.`
      : `⛔ ${RED} BLIND: the plant landed and the class did not move (${target ? target.delta : "n/a"}). The check is decoration until this passes.`);
  if (collateral.length) console.log(`   ⚠️ plant also moved: ${collateral.map((d) => `${d.cls}${d.delta > 0 ? "+" : ""}${d.delta}`).join(" ")}`);
  writeFileSync(join(OUT, `red-${RED}.json`), JSON.stringify({ cell: c.id, deltas, pass }, null, 1));
  process.exit(pass ? 0 : 1);
}

/* ── SIGN IN ONCE FOR THE WHOLE MATRIX ────────────────────────────────────────────────────────
   The signed-in half of the landing page was reported BLOCKED for want of a QA player. There is
   one: harness.mjs persona `mobile01`, secret in .env.qa.local (gitignored). It is minted here
   ONCE and the storage state reused, because one session per account is a hard rule — a second
   login revokes the first.
   ⚠️ LIVE_BASE must be set or the harness signs in against http://localhost:3001, which is not
   running, and the failure reads like a bad password.
   ⛔ A failure here is reported as BLOCKED with its reason, never swallowed: an unmeasured cell
   must not be able to masquerade as a clean one. */
let SIGNED_IN_STATE = null;
let SIGNED_IN_WHY = "not attempted";
if (cells.some((c) => c.state === "signedin")) {
  if (!process.env.LIVE_BASE) process.env.LIVE_BASE = BASE;
  try {
    const { loginOnce } = await import(pathToFileURL(join(REPO, "scripts/live/harness.mjs")).href);
    SIGNED_IN_STATE = await loginOnce(browser, "mobile01");
    console.log(`signed in once as mobile01 against ${process.env.LIVE_BASE}`);
  } catch (e) {
    SIGNED_IN_WHY = "sign-in failed: " + String(e.message).split(String.fromCharCode(10))[0].slice(0, 90);
    console.log(`⛔ ${SIGNED_IN_WHY}`);
  }
}

// Declared above the run loop: the per-cell reporter reads it too, and a const used before its
// declaration is a temporal-dead-zone throw.
const SKELETON_CLASSES = new Set(["V1", "V2", "V3", "V5", "V9"]);

const results = [];
for (const c of cells) {
  // ⛔ signed-in cannot be driven until a QA player exists on this machine. Reported BLOCKED,
  //    never silently passed — an unmeasured cell is not a clean cell.
  if (c.state === "signedin" && !SIGNED_IN_STATE) {
    results.push({ cell: c.id, pass: c.pass, w: c.w, locale: c.locale, state: c.state, ok: false, blocked: SIGNED_IN_WHY });
    console.log(`BLOCK ${c.id}  (${SIGNED_IN_WHY})`);
    continue;
  }
  const r = await runCell(browser, c, null, SIGNED_IN_STATE);
  results.push(r);
  if (!r.ok) { console.log(`ERROR ${r.cell}  ${r.error}`); continue; }
  // 🔴 THE LINE MUST COUNT WHAT THE SUMMARY COUNTS. It printed every class with items, including
  //    ones the summary deliberately filters — the content classes on a loading skeleton, and every
  //    class on the sub-normative zoom cell. So state-clienthop-768 read "FAIL V10:1 V14:4" while
  //    contributing nothing to the total, and a reader would chase a defect that does not gate.
  //    Overstating failure misleads exactly as much as hiding it. Filtered classes are still shown,
  //    in brackets, so nothing is silently dropped either.
  const counts = (v) => (r.skeleton && !SKELETON_CLASSES.has(v.cls)) || r.informational ? false : true;
  const scored = r.V.filter((v) => v.items.length && counts(v));
  const filtered = r.V.filter((v) => v.items.length && !counts(v));
  const n = scored.reduce((a, v) => a + v.items.length, 0);
  const fmt = (list) => list.map((v) => `${v.cls}:${v.items.length}`).join(" ");
  const tail = [n === 0 ? "" : fmt(scored), filtered.length ? `(not counted: ${fmt(filtered)})` : ""].filter(Boolean).join("  ");
  console.log(`${n === 0 ? "clean" : "FAIL "} ${r.cell.padEnd(22)} ${tail}`);
}
await browser.close();

/* ── V8: a string identical across locales that is not a deliberate brand line ──────────────── */
const BRAND_OK = ["The wisdom of YES & NO.", "50pick", "Juu na Chini"];
const byLocale = {};
for (const r of results) if (r.ok && r.pass === "base") { byLocale[r.locale] ??= {}; byLocale[r.locale][r.w] = r.textMap; }
const v8 = [];
if (byLocale.sw && byLocale.en) {
  for (const w of Object.keys(byLocale.sw)) {
    const a = byLocale.sw[w] || {}, b = (byLocale.en || {})[w] || {};
    for (const k of Object.keys(a)) {
      (a[k] || []).forEach((s, i) => {
        const t = (b[k] || [])[i];
        if (!t || !s) return;
        if (s !== t) return;
        if (/^[\d\s.,%·TZS+-]*$/.test(s)) return;                 // pure figures are the same by design
        if (BRAND_OK.some((ok) => s.includes(ok))) return;
        v8.push({ what: "identical in sw and en", measured: JSON.stringify(s.slice(0, 60)), where: `${k}[${i}] @${w}` });
      });
    }
  }
}

const summary = {
  base: BASE, cells: cells.length,
  ran: results.filter((r) => r.ok).length,
  errored: results.filter((r) => !r.ok && !r.blocked).map((r) => ({ cell: r.cell, error: r.error })),
  blocked: results.filter((r) => r.blocked).map((r) => ({ cell: r.cell, why: r.blocked })),
  byClass: {},
  v8,
};
// A loading skeleton has no topic tiles, no priced rows and no settled bands, so the classes that
// read CONTENT would report the skeleton's absence as a defect. On that cell we judge only what a
// skeleton can actually get wrong: overflow, clipping, occlusion, contrast and focus.

for (const r of results) for (const v of r.V || []) {
  if (r.skeleton && !SKELETON_CLASSES.has(v.cls)) continue;
  if (r.informational) continue;   // reported below, never gated
  summary.byClass[v.cls] ??= { count: 0, cells: [], examples: [] };
  if (v.items.length) {
    summary.byClass[v.cls].count += v.items.length;
    summary.byClass[v.cls].cells.push(r.cell);
    for (const it of v.items.slice(0, 2)) if (summary.byClass[v.cls].examples.length < 8) summary.byClass[v.cls].examples.push({ cell: r.cell, ...it });
  }
}
summary.byClass.V8 = { count: v8.length, cells: [], examples: v8.slice(0, 8) };

writeFileSync(join(OUT, RED_MODE ? `red-${RED}.json` : "gate.json"), JSON.stringify({ summary, results }, null, 1));

console.log("\n──────── SUMMARY ────────");
for (const [cls, v] of Object.entries(summary.byClass)) {
  console.log(`${cls.padEnd(5)} ${String(v.count).padStart(5)} ${v.count === 0 ? "clean" : "violations in " + new Set(v.cells).size + " cells"}`);
}
if (summary.errored.length) console.log(`\n⛔ ${summary.errored.length} cells ERRORED — those are unmeasured, not clean:`, summary.errored);
if (summary.blocked.length) console.log(`⛔ ${summary.blocked.length} cells BLOCKED:`, summary.blocked);
for (const r of results.filter((x) => x.informational && x.ok)) {
  const n = (r.V || []).reduce((a, v) => a + v.items.length, 0);
  console.log(`
ℹ️  ${r.cell} (${r.note}): ${n} finding(s) — reported, NOT counted:`);
  for (const v of r.V || []) for (const it of v.items) console.log(`     ${v.cls}  ${it.measured}  @ ${it.where}`);
}

{
  const total = Object.values(summary.byClass).reduce((a, v) => a + v.count, 0);
  const unusable = summary.errored.length + summary.blocked.length;
  console.log(`\nTOTAL ${total} violations; ${unusable} cells unmeasured.`);
  console.log(total === 0 && unusable === 0 ? "GATE GREEN — and a green gate is not a 10 until the frames have been looked at." : "GATE RED.");
  process.exitCode = total === 0 && unusable === 0 ? 0 : 1;
}
