/**
 * WITHDRAWAL — THE VISUAL AND LAYOUT DRIVE.
 *
 * ⛔ WHY THIS IS NOT "TAKE SOME SCREENSHOTS". Removing a rendered element is a LAYOUT change,
 * not a deletion. The failures that matter here are the ones a passing render check cannot
 * see and a human skimming a PNG usually misses:
 *
 *   · a card whose children all went, still painting its border, padding and background
 *   · a section heading whose only content was removed — an eyebrow over nothing
 *   · a flex/grid wrapper left holding zero children but still contributing a gap
 *   · `space-y-*` is a SIBLING selector (`> * ~ *`), so removing the FIRST child silently
 *     re-assigns every margin below it. This repo has already shipped that defect class.
 *   · horizontal overflow, which is how a removed element's neighbours re-flow badly
 *
 * So this measures the DOM at three widths and screenshots for the record. The measurements
 * are the finding; the images are the evidence.
 *
 * USAGE:  BASE=http://localhost:3210 node scripts/live/withdrawal-visual-drive.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3210";
const OUT = process.env.OUT ?? "shots/withdrawal";
const WIDTHS = [360, 768, 1280];
const ROUTES = ["/profile", "/wallet", "/wallet/deposit", "/profile/invite", "/markets", "/positions"];

let pass = 0, fail = 0;
const failures = [];
function ok(label, cond, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(`${label}${extra ? " — " + extra : ""}`); console.log(`  FAIL ${label}${extra ? " — " + extra : ""}`); }
}

mkdirSync(OUT, { recursive: true });

/** Sign in as the demo player and return the cookies for the browser context. */
async function demoCookies() {
  const res = await fetch(`${BASE}/auth/demo`, { redirect: "manual" });
  const raw = res.headers.getSetCookie?.() ?? [];
  if (!raw.length) throw new Error(`/auth/demo issued no cookie (status ${res.status})`);
  const host = new URL(BASE).hostname;
  return raw.map((c) => {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    return { name: pair.slice(0, idx), value: pair.slice(idx + 1), domain: host, path: "/" };
  });
}

/**
 * The layout audit, run in the page. Returns plain data — every predicate here is a thing
 * that removing an element can break, expressed as something measurable.
 */
function auditInPage() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  const paints = (el) => {
    const cs = getComputedStyle(el);
    const hasBorder = ["Top", "Right", "Bottom", "Left"].some((s) => {
      const w = parseFloat(cs["border" + s + "Width"]) || 0;
      return w > 0 && cs["border" + s + "Style"] !== "none";
    });
    const bg = cs.backgroundColor;
    const hasBg = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    const hasPad = ["Top", "Right", "Bottom", "Left"].some((s) => (parseFloat(cs["padding" + s]) || 0) > 0);
    const hasShadow = cs.boxShadow && cs.boxShadow !== "none";
    return hasBorder || hasBg || hasPad || hasShadow;
  };
  const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
  /**
   * ⛔ AN ELEMENT THAT IS ITSELF A CONTROL IS NOT AN EMPTY CONTAINER.
   * The first version of this drive reported `<input class="flex-1 ...">` on /wallet/deposit as
   * an "empty flex reserving space", three times. An input has no children and no textContent
   * by definition, and the descendant check (`querySelector("input")`) cannot see the element
   * ITSELF. A true measurement over the wrong population — the instrument was wrong, not the
   * page. Void and control elements are excluded here, at the source.
   */
  const SELF_CONTENT = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "IMG", "SVG", "CANVAS", "VIDEO", "IFRAME", "HR", "BR", "PROGRESS", "METER"]);
  const isControl = (el) => SELF_CONTENT.has(el.tagName);

  // 1 · Containers that render nothing but still paint.
  const emptyPainted = [];
  for (const el of document.querySelectorAll("main div, main section, main ul, main aside")) {
    if (isControl(el)) continue;
    if (el.children.length !== 0) continue;
    if (textOf(el)) continue;
    if (el.querySelector("svg, img, canvas, input, button")) continue;
    if (!visible(el)) continue;
    if (!paints(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4) continue; // a hairline rule is deliberate, not an empty card
    emptyPainted.push({ cls: el.className && el.className.toString().slice(0, 90), h: Math.round(r.height), w: Math.round(r.width) });
  }

  // 2 · A heading whose section has no content after it.
  const orphanHeadings = [];
  for (const h of document.querySelectorAll("main h1, main h2, main h3, main p[class*=eyebrow]")) {
    if (!visible(h)) continue;
    const sec = h.closest("section, div");
    if (!sec) continue;
    const rest = textOf(sec).replace(textOf(h), "").trim();
    if (rest) continue;
    if (sec.querySelector("svg, img, input, button, a")) continue;
    orphanHeadings.push({ text: textOf(h).slice(0, 60), cls: sec.className && sec.className.toString().slice(0, 70) });
  }

  // 3 · Flex/grid wrappers holding zero children while still reserving a gap.
  const emptyFlex = [];
  for (const el of document.querySelectorAll("main [class*=flex], main [class*=grid]")) {
    if (isControl(el)) continue;
    if (el.children.length !== 0) continue;
    if (textOf(el)) continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4) continue;
    emptyFlex.push({ cls: el.className && el.className.toString().slice(0, 90), h: Math.round(r.height) });
  }

  // 4 · 🔴 THE LONELY CARD — a multi-column grid left holding exactly ONE child.
  //
  // ⛔ THIS IS THE ONE THE FIRST VERSION OF THIS DRIVE MISSED, and it shipped a real regression:
  // the wallet's `lg:grid-cols-2` lost its bonus card and left the player's REAL BALANCE at half
  // width with a ~520px hole beside it at 1280. Checks 1–3 all passed over it, because the grid
  // is not empty (it has a child) and nothing is orphaned. Removing an element does not only
  // leave holes where the element was — it changes how its SURVIVING SIBLINGS are laid out.
  //
  // ⚠️ Measured from the COMPUTED grid, not from class names: a `lg:` prefix tells you nothing
  // about the width actually in force. A single-child grid is only a defect when the track count
  // is >1 AND the child occupies materially less than the container, so a deliberate half-width
  // element is not reported.
  const lonelyCards = [];
  for (const el of document.querySelectorAll("main [class*=grid]")) {
    if (el.children.length !== 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display !== "grid") continue;
    const tracks = cs.gridTemplateColumns.split(" ").filter(Boolean).length;
    if (tracks < 2) continue;
    const parentW = el.getBoundingClientRect().width;
    const childW = el.children[0].getBoundingClientRect().width;
    if (parentW < 200 || childW <= 0) continue;
    if (childW / parentW > 0.75) continue; // occupies the row — not lonely
    lonelyCards.push({
      cls: el.className && el.className.toString().slice(0, 80),
      tracks, parentW: Math.round(parentW), childW: Math.round(childW),
      holePx: Math.round(parentW - childW),
    });
  }

  return {
    lonelyCards,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mainCount: document.querySelectorAll("main").length,
    bodyLen: textOf(document.body).length,
    emptyPainted,
    orphanHeadings,
    emptyFlex,
  };
}

const cookies = await demoCookies();
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addCookies(cookies);
const page = await ctx.newPage();

console.log(`\nwithdrawal-visual-drive — ${BASE}\n`);

for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 });
  console.log(`  ── ${width}px ──`);
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1200);
    const slug = route.replace(/\//g, "_") || "_root";
    await page.screenshot({ path: `${OUT}/${width}${slug}.png`, fullPage: true });
    const a = await page.evaluate(auditInPage);

    const at = `${route} @${width}`;
    // CONTROL — a blank page would pass every absence check below it.
    ok(`CONTROL · ${at} rendered real content`, a.bodyLen > 200, `bodyLen=${a.bodyLen}`);
    ok(`${at} · exactly one <main>`, a.mainCount === 1, `count=${a.mainCount}`);
    ok(`${at} · no horizontal overflow`, a.overflowX <= 1, `overflow=${a.overflowX}px`);
    ok(`${at} · no empty container still painting`, a.emptyPainted.length === 0, JSON.stringify(a.emptyPainted).slice(0, 300));
    ok(`${at} · no orphan heading`, a.orphanHeadings.length === 0, JSON.stringify(a.orphanHeadings).slice(0, 300));
    ok(`${at} · no empty flex/grid reserving space`, a.emptyFlex.length === 0, JSON.stringify(a.emptyFlex).slice(0, 300));
    ok(`${at} · no lonely card in a multi-column grid`, a.lonelyCards.length === 0, JSON.stringify(a.lonelyCards).slice(0, 300));
  }
}

// ── The nav overflow menu must still be usable after Invite left it ─────────
await page.setViewportSize({ width: 360, height: 900 });
await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 60000 });
const moreBtn = page.locator('button:has-text("More"), [aria-label*="More" i]').locator("visible=true").first();
if (await moreBtn.count()) {
  await moreBtn.click();
  await page.waitForTimeout(400);
  const items = await page.locator('[role="menu"] a, [role="dialog"] a, nav a').count();
  ok("the More menu still opens with destinations after Invite left it", items > 0, `links=${items}`);
  await page.screenshot({ path: `${OUT}/360_more-open.png`, fullPage: false });
} else {
  ok("the More control is present at 360", false, "no More button found");
}

await browser.close();

console.log(`\n${pass} passed · ${fail} failed`);
if (fail) { console.log("\nFAILURES:"); failures.forEach((f) => console.log("  · " + f)); }
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fail === 0 ? 0 : 1);
