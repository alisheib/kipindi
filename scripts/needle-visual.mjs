/**
 * The Needle — visual + responsiveness + scoping verification (real browser).
 *
 * Serves a self-contained harness that loads EXACTLY what ships — the vendored engine
 * (src/lib/needle-physics.js), the shipped scoped CSS (src/components/layout/needle.css)
 * and the same markup the React component injects — against the real design tokens. No
 * app/DB needed. It then drives Chromium to confirm:
 *   · the disc renders (enamel faces + gold needle + rim + hub SVG present, sized right);
 *   · RESPONSIVENESS — the diameter is correct at 360/768/1280/1920 and reflows on resize;
 *   · SCOPING — the scoped `#needle-root svg` rule does NOT leak onto an app SVG outside it;
 *   · a spin settles to rest AS THE LOGO (a % 360 === 0), parked;
 *   · the suppressed class fully hides it (display:none — money-surface / toggle behaviour).
 * Screenshots → .50pick-shots/needle/<width>.png  (READ them).
 *
 * Run: node scripts/needle-visual.mjs
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SHOTS = ".50pick-shots/needle";
mkdirSync(SHOTS, { recursive: true });

// The exact body markup the React component injects (scoped ids, namespaced SVG defs).
const MARKUP = `
<div id="safe" aria-hidden="true"></div>
<div id="needle" role="presentation">
  <div id="tilt">
    <span id="wake"></span><span id="glow"></span><span id="trail"></span>
    <span id="whole"></span><span id="shadow"></span><span id="ring"></span>
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="ndl-faceL" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#1C9264"></stop><stop offset="100%" stop-color="#146F4C"></stop></linearGradient>
        <linearGradient id="ndl-faceR" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#A83A43"></stop><stop offset="100%" stop-color="#822A33"></stop></linearGradient>
        <linearGradient id="ndl-spec" x1="0.12" y1="0" x2="0.72" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.17"></stop><stop offset="30%" stop-color="#ffffff" stop-opacity="0.04"></stop><stop offset="56%" stop-color="#0A0E28" stop-opacity="0.12"></stop><stop offset="100%" stop-color="#0A0E28" stop-opacity="0.42"></stop></linearGradient>
        <radialGradient id="ndl-vig" cx="0.5" cy="0.5" r="0.5"><stop offset="62%" stop-color="#0A0E28" stop-opacity="0"></stop><stop offset="88%" stop-color="#0A0E28" stop-opacity="0.16"></stop><stop offset="100%" stop-color="#0A0E28" stop-opacity="0.40"></stop></radialGradient>
        <linearGradient id="ndl-rim" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.52"></stop><stop offset="42%" stop-color="#ffffff" stop-opacity="0.06"></stop><stop offset="100%" stop-color="#E3BC66" stop-opacity="0.34"></stop></linearGradient>
        <radialGradient id="ndl-hub" cx="0.34" cy="0.28" r="0.85"><stop offset="0%" stop-color="#FFF3D4"></stop><stop offset="42%" stop-color="#EFCC7C"></stop><stop offset="78%" stop-color="#D8AE55"></stop><stop offset="100%" stop-color="#A87D33"></stop></radialGradient>
        <linearGradient id="ndl-blendA" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#146F4C"></stop><stop offset="100%" stop-color="#822A33"></stop></linearGradient>
        <filter id="ndl-cast" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="6.5" flood-color="oklch(5% 0.05 268)" flood-opacity="0.58"></feDropShadow></filter>
      </defs>
      <g filter="url(#ndl-cast)">
        <g id="disc" style="transform-origin: 50px 50px">
          <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" fill="url(#ndl-faceL)"></path>
          <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" fill="url(#ndl-faceR)"></path>
          <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63" fill="none" stroke="#54EDA6" stroke-width="var(--inlay, 2.6)" opacity="0.95"></path>
          <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63" fill="none" stroke="#FF7B82" stroke-width="var(--inlay, 2.6)" opacity="0.95"></path>
          <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#070A1E" stroke-width="7.5" stroke-linecap="round" opacity="0.62"></line>
          <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#FFE7B0" stroke-width="var(--needlew, 4.4)" stroke-linecap="round" style="filter: drop-shadow(0 0 3px rgba(255,214,120,0.9))"></line>
        </g>
        <circle id="blend" cx="50" cy="50" r="46" fill="url(#ndl-blendA)" opacity="0"></circle>
        <g id="smearA" style="transform-origin: 50px 50px" opacity="0"><line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#F0D08A" stroke-width="3.6" stroke-linecap="round"></line></g>
        <g id="smearB" style="transform-origin: 50px 50px" opacity="0"><line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#F0D08A" stroke-width="3" stroke-linecap="round"></line></g>
        <circle cx="50" cy="50" r="46" fill="url(#ndl-spec)"></circle>
        <circle cx="50" cy="50" r="46" fill="url(#ndl-vig)"></circle>
        <circle cx="50" cy="50" r="46.4" fill="none" stroke="#080B22" stroke-width="1.4" opacity="0.72"></circle>
        <circle cx="50" cy="50" r="47.3" fill="none" stroke="url(#ndl-rim)" stroke-width="1.5"></circle>
        <circle id="edgeArc" cx="50" cy="50" r="47.3" fill="none" stroke="var(--aqua-300)" stroke-width="1.9" opacity="0"></circle>
        <circle cx="50" cy="50" r="10" fill="#0A0E28" opacity="0.34"></circle>
        <circle cx="50" cy="50" r="7.4" fill="#0A0E28" opacity="0.58"></circle>
        <circle cx="50" cy="50" r="6.3" fill="url(#ndl-hub)"></circle>
        <circle cx="50" cy="50" r="6.3" fill="none" stroke="#7C5A22" stroke-width="0.5" opacity="0.7"></circle>
        <circle cx="47.9" cy="47.6" r="1.7" fill="#FFF8E6" opacity="0.72"></circle>
        <circle cx="50" cy="50" r="1.5" fill="#141A38"></circle>
      </g>
    </svg>
    <span id="hit" role="button" tabindex="0" aria-label="Needle"></span>
  </div>
</div>`;

const HARNESS = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="/docs/design-system/v2-2026-07-27/09-needle/theme/globals.css">
<link rel="stylesheet" href="/src/components/layout/needle.css">
<style>html,body{height:100%;margin:0;background:var(--bg);overflow:hidden}#decoy{position:fixed;left:10px;top:10px}</style>
</head><body>
<!-- A decoy SVG OUTSIDE #needle-root: proves the scoped rule never leaks onto app glyphs. -->
<svg id="decoy" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#caa24a"></circle></svg>
<!-- Fake fixed chrome: a top bar + a floating bottom nav, marked exactly like the real
     ones. The object must keep its resting zone clear of both (it sits below them at z-25). -->
<div data-needle-inset-top style="position:fixed;top:0;left:0;right:0;height:56px;background:#0c1150;border-bottom:1px solid #23306a;z-index:30"></div>
<div data-needle-inset-bottom style="position:fixed;bottom:9px;left:10px;right:10px;height:60px;border-radius:26px;background:#0c1150;border:1px solid #23306a;z-index:40"></div>
<div id="needle-root">${MARKUP}</div>
<script type="module">
import { NeedleBody } from "/src/lib/needle-physics.js";
const root = document.getElementById("needle-root");
const $ = (id) => root.querySelector("#" + id);
const el = $("needle"), disc = $("disc"), tilt = $("tilt"), wake = $("wake");
const clampN = (v,lo,hi)=>v<lo?lo:v>hi?hi:v;
const vp = () => { const v=window.visualViewport; return { w: Math.round(v?v.width:innerWidth), h: Math.round(v?v.height:innerHeight) }; };
const diameter = () => Math.round(clampN(Math.min(vp().w,vp().h)*0.155,56,88));
const haloInset = () => { const v=vp(); const t=clampN((Math.min(v.w,v.h)-360)/(900-360),0,1); return -(14+t*20).toFixed(1); };
// Chrome-aware insets (mirrors src/components/layout/needle.tsx).
function measureInsets(){ let top=0, bottom=0; const h=vp().h;
  document.querySelectorAll("[data-needle-inset-top]").forEach((n)=>{ const r=n.getBoundingClientRect(); if(r.height>0&&r.top<h*0.5) top=Math.max(top,r.bottom); });
  document.querySelectorAll("[data-needle-inset-bottom]").forEach((n)=>{ const r=n.getBoundingClientRect(); if(r.height>0&&r.bottom>h*0.5) bottom=Math.max(bottom,h-r.top); });
  return {top,right:0,bottom,left:0}; }
let insetCache = measureInsets();
const body = new NeedleBody({ size: diameter(), bounds: () => { const v=vp(); return { w:v.w, h:v.h, insets:insetCache }; } });
// Sides-only parking (mirrors the host override).
body.nearestEdge = () => { const L=body.limits(); return (body.cx-L.minX)<=((L.maxX+body.size)-body.cx)?"left":"right"; };
function render(){ el.style.transform = "translate3d("+body.x.toFixed(2)+"px,"+body.y.toFixed(2)+"px,0)"; disc.style.transform = "rotate("+body.a.toFixed(2)+"deg)"; tilt.style.transform="perspective(420px) scale(1)"; const w = body.parked && !body.held ? body.edge : ""; wake.classList.toggle("on", !!w); }
function applyViewport(){ insetCache = measureInsets(); const d=diameter(); if(d!==body.size) body.setSize(d); el.style.setProperty("--nsize", d+"px"); el.style.setProperty("--inlay",(2.6*(88/d)).toFixed(2)); el.style.setProperty("--halo", haloInset()+"%"); el.style.setProperty("--needlew",(4.4*Math.max(1,74/d)).toFixed(2)); body.reclamp(); render(); }
// Show the whole disc, centred, for the render check.
body.unpark(); body.place(vp().w/2 - body.radius, vp().h/2 - body.radius);
applyViewport(); render();
window.addEventListener("resize", applyViewport);
window.__needle = body;
window.__settle = (n) => { for(let i=0;i<n;i++) body.advance(1000/60); render(); return { a: body.a, parked: body.parked, edge: body.edge }; };
window.__render = render;
window.__ready = true;
</script></body></html>`;

const TYPES = { ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/harness") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(HARNESS); return; }
    const p = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    const body = await readFile(p);
    res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
});

let failures = 0;
const fail = (m) => { failures++; console.log("  FAIL " + m); };
const pass = (m) => console.log("  PASS " + m);

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const BASE = `http://localhost:${port}`;
console.log(`Needle visual gauntlet  (${BASE})\n`);

const browser = await chromium.launch();
const WIDTHS = [
  { tag: "360", w: 360, h: 740, expect: Math.round(Math.min(360,740)*0.155) },
  { tag: "768", w: 768, h: 1024, expect: Math.round(Math.min(768,1024)*0.155) },
  { tag: "1280", w: 1280, h: 800, expect: Math.round(clamp88(Math.min(1280,800)*0.155)) },
  { tag: "1920", w: 1920, h: 1080, expect: 88 },
];
function clamp88(v){ return Math.max(56, Math.min(88, v)); }

for (const bp of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: bp.w, height: bp.h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${BASE}/harness`);
  await page.waitForFunction("window.__ready === true", { timeout: 5000 }).catch(() => {});
  const info = await page.evaluate(() => {
    const root = document.getElementById("needle-root");
    const nd = root.querySelector("#needle");
    const svg = nd.querySelector("svg");
    const decoy = document.getElementById("decoy");
    return {
      ready: window.__ready === true,
      svgCount: nd.querySelectorAll("svg").length,
      nsize: getComputedStyle(nd).getPropertyValue("--nsize").trim(),
      // shape-rendering:geometricPrecision is set ONLY by the needle rule (the app's
      // Tailwind preflight already makes every svg display:block, so display can't tell
      // a leak apart — shape-rendering can).
      needleShape: getComputedStyle(svg).getPropertyValue("shape-rendering"),
      decoyShape: getComputedStyle(decoy).getPropertyValue("shape-rendering"),
      hitTarget: (() => { const h = root.querySelector("#hit"); const r = h.getBoundingClientRect(); return Math.min(r.width, r.height); })(),
    };
  });
  const expected = clamp88(Math.round(Math.min(bp.w, bp.h) * 0.155)) + "px";
  if (!info.ready) fail(`${bp.tag}: harness did not become ready`);
  if (info.svgCount === 1) pass(`${bp.tag}: disc SVG rendered`); else fail(`${bp.tag}: expected 1 svg, got ${info.svgCount}`);
  if (info.nsize === expected) pass(`${bp.tag}: responsive diameter ${info.nsize} (correct)`); else fail(`${bp.tag}: diameter ${info.nsize}, expected ${expected}`);
  const needleShape = (info.needleShape || "").toLowerCase();
  const decoyShape = (info.decoyShape || "").toLowerCase();
  if (needleShape === "geometricprecision") pass(`${bp.tag}: scoped svg rule applies inside #needle-root`); else fail(`${bp.tag}: needle svg shape-rendering=${info.needleShape}`);
  if (decoyShape !== "geometricprecision") pass(`${bp.tag}: scoping does NOT leak — decoy app SVG shape-rendering=${info.decoyShape || "auto"}`); else fail(`${bp.tag}: LEAK — the needle svg rule reached an app SVG outside #needle-root`);
  if (errors.length === 0) pass(`${bp.tag}: no console/page errors`); else fail(`${bp.tag}: ${errors.length} errors: ${errors.slice(0,2).join(" | ")}`);
  await page.screenshot({ path: `${SHOTS}/${bp.tag}.png` });

  // On the laptop width, exercise spin→rest-as-logo and the suppress gate.
  if (bp.tag === "1280") {
    const spun = await page.evaluate(() => { window.__needle.flick(2.6); return window.__settle(2500); });
    const restAngle = ((spun.a % 360) + 360) % 360;
    if (Math.abs(restAngle) < 1e-6 && spun.parked) pass(`spin→rest: settled AS THE LOGO (a=${spun.a.toFixed(1)}°, parked on ${spun.edge})`);
    else fail(`spin→rest: a%360=${restAngle} parked=${spun.parked}`);
    await page.evaluate(() => window.__render());
    await page.screenshot({ path: `${SHOTS}/1280-settled.png` });

    // Chrome exclusion: after settling it must rest on a side rail, with the whole disc
    // clear of the (fake, but marked-identically) top bar and bottom nav — the fix for
    // "the fidget got stuck under the top bar and couldn't be clicked".
    const chrome = await page.evaluate(() => {
      const nd = document.querySelector("#needle-root #needle").getBoundingClientRect();
      const tb = document.querySelector("[data-needle-inset-top]").getBoundingClientRect();
      const bn = document.querySelector("[data-needle-inset-bottom]").getBoundingClientRect();
      return { edge: window.__needle.edge, ndTop: nd.top, ndBottom: nd.bottom, topBar: tb.bottom, botBar: bn.top };
    });
    const onSide = chrome.edge === "left" || chrome.edge === "right";
    if (onSide && chrome.ndTop >= chrome.topBar - 1 && chrome.ndBottom <= chrome.botBar + 1)
      pass(`chrome: rests on the ${chrome.edge} rail, clear of both bars (disc ${chrome.ndTop.toFixed(0)}–${chrome.ndBottom.toFixed(0)} inside ${chrome.topBar.toFixed(0)}–${chrome.botBar.toFixed(0)})`);
    else
      fail(`chrome: NOT clear — edge=${chrome.edge} disc ${chrome.ndTop.toFixed(0)}–${chrome.ndBottom.toFixed(0)} vs bars ${chrome.topBar.toFixed(0)}/${chrome.botBar.toFixed(0)}`);

    const suppressed = await page.evaluate(() => { const r = document.getElementById("needle-root"); r.classList.add("needle-suppressed"); const disp = getComputedStyle(r).display; const rect = r.querySelector("#needle").getBoundingClientRect(); return { disp, painted: rect.width > 0 && rect.height > 0 }; });
    if (suppressed.disp === "none" && !suppressed.painted) pass("suppress gate: .needle-suppressed hides the object (root display:none, nothing painted)"); else fail(`suppress gate: root display=${suppressed.disp}, painted=${suppressed.painted}`);
  }
  if (info.hitTarget >= 40) pass(`${bp.tag}: hit target ${Math.round(info.hitTarget)}px ≥ 40px`); else fail(`${bp.tag}: hit target ${Math.round(info.hitTarget)}px < 40px`);
  await page.close();
}

await browser.close();
server.close();
console.log(`\nScreenshots → ${SHOTS}/  ·  ${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
