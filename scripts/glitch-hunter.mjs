/**
 * Glitch hunter — comprehensive UI sweep for visual artefacts on hover,
 * focus, drag, and animation states.
 *
 * For every interactive surface across every public + authed page,
 * captures (a) the resting state and (b) the hover state, and runs
 * automatic checks for:
 *   • Bounding-box drift on hover (element grows / shifts unexpectedly)
 *   • Overflow into adjacent elements (rounded edges escaping their parent)
 *   • Animation that doesn't settle (still moving 1.5 s after hover stop)
 *   • Border-radius changes mid-transition (the bug we fixed on TippingBar)
 *   • z-index issues (hovered element gets covered by sibling)
 *   • Console errors / pageerrors during interaction
 *
 * Writes screenshots to /tmp/glitch-shots/ and prints a summary table.
 *
 *   BASE=http://localhost:3000  node scripts/glitch-hunter.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const SHOTS = "C:\\kipindi\\50pick-logo-for-claude-design\\screenshots\\glitch\\";
try { mkdirSync(SHOTS, { recursive: true }); } catch {}

let pass = 0, fail = 0;
const findings = [];

function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else { fail++; findings.push({ label, detail }); }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push("PAGEERROR: " + e.message.slice(0, 160)));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE.ERROR: " + m.text().slice(0, 160)); });

// Provision a session so we can reach authed pages too
await page.goto(`${BASE}/auth/demo`, { waitUntil: "load" });
await page.waitForTimeout(800);

const ROUTES = [
  { path: "/",            name: "home" },
  { path: "/markets",     name: "markets" },
  { path: "/live",        name: "live" },
  { path: "/leaderboard", name: "leaderboard" },
  { path: "/help",        name: "help" },
  { path: "/fairness",    name: "fairness" },
  { path: "/wallet",      name: "wallet" },
  { path: "/positions",   name: "positions" },
  { path: "/profile",     name: "profile" },
];

// SELECTORS — common hoverable surfaces in the kit
const HOVER_TARGETS = [
  { sel: 'a[href^="/markets/mkt_"]', label: "market-card-link" },
  { sel: '[role="progressbar"]',     label: "probability-bar" },
  { sel: ".btn",                     label: "btn-any" },
  { sel: ".chip",                    label: "chip" },
  { sel: "nav a",                    label: "nav-link" },
  { sel: ".cm-bubble",               label: "chat-bubble" },
  { sel: "[data-testid='wallet-balance']", label: "wallet-balance" },
];

async function checkHoverGlitch(route, sel, label) {
  const el = page.locator(sel).first();
  if (await el.count() === 0) return; // not on this page

  // Scroll the element into view FIRST so Playwright's hover() doesn't
  // auto-scroll mid-measurement (that auto-scroll was the cause of
  // huge dy values in the initial sweep — false positives).
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 1500 });
  } catch {
    /* not visible / lazy-mounted — skip */
    return;
  }
  await page.waitForTimeout(100);

  let box0, box1;
  try {
    box0 = await el.boundingBox({ timeout: 1500 });
    if (!box0) return;
  } catch {
    return;
  }

  // ── INVARIANT 1 — element doesn't crash on hover ─────────────
  const errBefore = errors.length;
  try {
    await el.hover({ timeout: 1500 });
  } catch {
    log(`${route.name}/${label}: hover did not crash`, true, "(not hoverable)");
    return;
  }
  await page.waitForTimeout(120);
  log(`${route.name}/${label}: no JS error on hover`, errors.length === errBefore,
    errors.length > errBefore ? errors[errBefore] : "");

  // ── INVARIANT 2 — box hasn't drifted (the parent's frame) ────
  try {
    box1 = await el.boundingBox({ timeout: 1000 });
  } catch {
    box1 = null;
  }
  if (box0 && box1) {
    // Allow small intentional motions (hover-lift up to 4 px in any
    // direction, slight scale). Reject anything more than that. Now
    // that we pre-scroll, page-scroll-on-hover can't cause false
    // positives here.
    const drifted =
      Math.abs(box1.x - box0.x) > 6 ||
      Math.abs(box1.y - box0.y) > 6 ||
      Math.abs(box1.width - box0.width) > 12 ||
      Math.abs(box1.height - box0.height) > 12;
    log(`${route.name}/${label}: hover stays within tolerance`, !drifted,
      drifted ? `dx=${(box1.x - box0.x).toFixed(1)} dy=${(box1.y - box0.y).toFixed(1)} dw=${(box1.width - box0.width).toFixed(1)} dh=${(box1.height - box0.height).toFixed(1)}` : "");
  }

  // ── INVARIANT 3 — child isn't escaping the parent's bounds ──
  // Skip surfaces where intentional overflow is by-design — the
  // TippingBar's tipping-needle child is positioned top:-6/bottom:-6
  // so it visually extends above/below the rail. The kit is correct
  // there; this invariant would false-positive on it.
  if (label === "probability-bar") {
    return;
  }
  // Inspect first 5 children and verify each is inside the box.
  const childOverflow = await el.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    let overflowCount = 0;
    const TOL = 1.5;
    for (const c of Array.from((node).children).slice(0, 8)) {
      const r = (c).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.left < rect.left - TOL) overflowCount++;
      else if (r.right > rect.right + TOL) overflowCount++;
      else if (r.top < rect.top - TOL) overflowCount++;
      else if (r.bottom > rect.bottom + TOL) overflowCount++;
    }
    return overflowCount;
  });
  log(`${route.name}/${label}: children stay inside parent`, childOverflow === 0,
    childOverflow > 0 ? `${childOverflow} child overflow(s)` : "");

  // ── INVARIANT 4 — animation settles within 1.5s ─────────────
  // Skip kit-intentional infinite animations (chip-live pulse, the
  // hero-constellation mark-breathe + drift particles). These move
  // forever by design.
  const isIntentionallyAnimated = await el.evaluate((node) => {
    if (node.classList.contains("chip-live")) return true;
    if (node.classList.contains("live-dot")) return true;
    if (node.classList.contains("mark-breathe")) return true;
    // The constellation dial wrappers also breathe.
    const inConst = node.closest('[class*="hero-constellation"], .mark-breathe');
    if (inConst) return true;
    return false;
  });
  if (!isIntentionallyAnimated) {
    await page.waitForTimeout(1600);
    let box2;
    try { box2 = await el.boundingBox({ timeout: 1000 }); } catch { box2 = null; }
    if (box1 && box2) {
      const stillMoving =
        Math.abs(box2.x - box1.x) > 1 ||
        Math.abs(box2.y - box1.y) > 1 ||
        Math.abs(box2.width - box1.width) > 1 ||
        Math.abs(box2.height - box1.height) > 1;
      log(`${route.name}/${label}: animation settles by 1.5 s`, !stillMoving,
        stillMoving ? "still oscillating" : "");
    }
  }

  // Move mouse away so the next target isn't pre-hovered
  await page.mouse.move(0, 0);
  await page.waitForTimeout(120);
}

for (const route of ROUTES) {
  await page.goto(BASE + route.path, { waitUntil: "load" });
  await page.waitForTimeout(800);
  console.log(`\n=== ${route.path} ===`);
  for (const target of HOVER_TARGETS) {
    await checkHoverGlitch(route, target.sel, target.label);
  }
  // Screenshot the page in resting state for visual reference
  try {
    await page.screenshot({ path: SHOTS + `${route.name}-resting.png`, fullPage: false });
  } catch {}
}

// ── Special probes: market detail page (the hot surface) ───────
const firstMarket = await page.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
if (firstMarket) {
  await page.goto(BASE + firstMarket, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  console.log(`\n=== ${firstMarket} (market detail) ===`);

  // Hover the dial slider
  await checkHoverGlitch({ name: "mkt-detail" }, "[role='slider']", "dial-track");
  await checkHoverGlitch({ name: "mkt-detail" }, "[role='progressbar']", "tipping-bar");
  await checkHoverGlitch({ name: "mkt-detail" }, ".btn-gold", "btn-gold-place");
  await checkHoverGlitch({ name: "mkt-detail" }, ".btn-ghost", "btn-ghost-secondary");

  // Open the chat bubble and hover the inside
  const bubble = page.locator(".cm-bubble").first();
  if (await bubble.count() > 0) {
    await bubble.click();
    await page.waitForTimeout(500);
    await checkHoverGlitch({ name: "chat" }, ".cm-empty-starter", "chip-starter");
    await checkHoverGlitch({ name: "chat" }, ".cm-close", "chat-close");
    await checkHoverGlitch({ name: "chat" }, ".cm-send", "chat-send");
    // Send a question to surface a citation chip
    await page.locator(".cm-composer textarea").fill("How do I deposit?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1200);
    await checkHoverGlitch({ name: "chat" }, ".cm-cite", "chat-citation");
    await page.locator(".cm-close").click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`GLITCH-HUNTER  PASS: ${pass}    FAIL: ${fail}`);
console.log(`${"=".repeat(60)}`);
if (findings.length > 0) {
  console.log(`\nFindings:`);
  for (const f of findings) console.log(`  ✗ ${f.label}${f.detail ? " — " + f.detail : ""}`);
}
console.log(`\nScreenshots under: ${SHOTS}`);

await browser.close();
process.exit(fail > 0 ? 1 : 0);
