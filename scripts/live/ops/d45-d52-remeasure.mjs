/**
 * D45 + D52 · PRODUCTION RE-MEASURE.
 *
 *   LIVE_BASE=https://www.50pick.tz node scripts/live/ops/d45-d52-remeasure.mjs
 *
 * ⛔ PROVED / BLIND / REFUTED, and BLIND is not a pass. D52 needs a SETTLED card on the board
 * to look at; a board holding none cannot speak to it either way (§0 trap 3).
 *
 * ⭐ D45 IS MEASURED AS A DELTA, not against a remembered number: /markets is read in the same
 * run at the same width and the two must AGREE. "16px" asserted alone would pass if the whole
 * platform drifted to 20 together, which is the thing the defect was about.
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE;
if (!BASE) { console.error("⛔ set LIVE_BASE"); process.exit(2); }
console.log(`\n  TARGET: ${BASE}\n`);

const WIDTHS = [320, 360, 412];
const verdicts = [];
const say = (v, name, detail) => { verdicts.push({ v, name }); console.log(`  ${v.padEnd(8)} ${name}${detail ? ` — ${detail}` : ""}`); };

/**
 * Where the page's content actually starts: the measure wrapper's left edge + its own padding.
 *
 * ⛔ SCOPED INSIDE `<main>`, and the first version of this was NOT — it took the first div on the
 * page with a 1280px max-width and some padding, which is the TOP APP BAR (`max-w-board … px-2`).
 * That reported a serene **12px on /markets, /updown and /updown/history alike** and called D45
 * proved, because all three share one piece of chrome. Three pages agreeing is not evidence when
 * the thing measured belongs to none of them.
 */
const contentEdge = (page) => page.evaluate(() => {
  const main = document.querySelector("main") ?? document.body;
  const pick = [...main.querySelectorAll("div")].find((d) => {
    const c = getComputedStyle(d);
    return /^(1280|1080)px$/.test(c.maxWidth) && parseFloat(c.paddingLeft) > 0;
  });
  if (!pick) return null;
  const r = pick.getBoundingClientRect();
  return {
    edge: Math.round((r.left + parseFloat(getComputedStyle(pick).paddingLeft)) * 100) / 100,
    pad: getComputedStyle(pick).paddingLeft,
    cls: (pick.className || "").slice(0, 60),
  };
});

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  /* ⛔ /updown/history IS BEHIND THE SESSION. Signed out it never renders its wrapper at all, and
     the first run read `null` for it at every width — which is a FAILED READ, not a 0px gutter.
     One sign-in, reused across all three widths (the harness's own rule: calling login() per cell
     trips the server's attempt limiting and reports product failures that are not). */
  const { loginOnce } = await import("../harness.mjs");
  let state = null;
  try { state = await loginOnce(b, "mobile01"); } catch (e) { console.log(`  ⚠️ sign-in failed: ${String(e).slice(0, 100)}`); }

  console.log("── D45 · the page gutter ──────────────────────────────────────────────");
  for (const width of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width, height: 740 }, ...(state ? { storageState: state } : {}) });
    const page = await ctx.newPage();
    const edges = {};
    for (const [name, path] of [["/markets", "/markets"], ["/updown", "/updown"], ["/updown/history", "/updown/history"]]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(600);
      const got = await contentEdge(page);
      edges[name] = got ? got.edge : null;
      if (got) console.log(`      ${name}: pad ${got.pad} · "${got.cls}"`);
    }
    console.log(`  ${width}px → ${JSON.stringify(edges)}`);
    const ref = edges["/markets"];
    if (ref == null) {
      say("BLIND", `D45 @${width}`, "could not find /markets' measure wrapper to compare against");
    } else if (edges["/updown"] == null || edges["/updown/history"] == null) {
      say("BLIND", `D45 @${width}`, `an Up & Down wrapper did not read (${JSON.stringify(edges)})`);
    } else {
      const same = edges["/updown"] === ref && edges["/updown/history"] === ref;
      say(same ? "PROVED" : "REFUTED", `D45 @${width} · Up & Down sits on the platform gutter`,
        `/markets ${ref}px · /updown ${edges["/updown"]}px · /updown/history ${edges["/updown/history"]}px`);
    }
    await ctx.close();
  }

  console.log("\n── D52 · the settled pod's price pair ─────────────────────────────────");
  for (const width of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width, height: 740 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("article.mcardp", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);

    const pods = await page.evaluate(() => {
      const out = [];
      for (const card of document.querySelectorAll("article.mcardp")) {
        // The pair is the only place an arrow sits between two figures.
        for (const span of card.querySelectorAll("span")) {
          const kids = [...span.children].filter((k) => k.tagName === "SPAN");
          if (kids.length !== 2) continue;
          if (!/→/.test(kids[1].textContent ?? "")) continue;
          const a = kids[0].getBoundingClientRect(), c = kids[1].getBoundingClientRect();
          const lh = parseFloat(getComputedStyle(span).lineHeight) || a.height || 14;
          out.push({
            phase: card.getAttribute("data-phase"),
            open: kids[0].textContent.trim(), rest: kids[1].textContent.trim(),
            sameLine: Math.abs(a.top - c.top) < 2,
            // A wrap INSIDE either figure would show as a box taller than one line.
            openLines: Math.round(a.height / lh), restLines: Math.round(c.height / lh),
            overflow: Math.round(span.scrollWidth - span.clientWidth),
          });
        }
      }
      return out;
    });

    if (pods.length === 0) {
      say("BLIND", `D52 @${width}`, "no settled card on the board right now — nothing to look at");
    } else {
      console.log(`  ${width}px → ${JSON.stringify(pods)}`);
      const bad = pods.filter((p) => p.openLines > 1 || p.restLines > 1 || p.overflow > 0);
      const arrowLeads = pods.every((p) => p.rest.startsWith("→"));
      say(bad.length === 0 && arrowLeads ? "PROVED" : "REFUTED",
        `D52 @${width} · the arrow never ends a line and no figure breaks`,
        `${pods.length} pod(s); ${pods.filter((p) => p.sameLine).length} on one line, ` +
        `${pods.filter((p) => !p.sameLine).length} stacked with the arrow leading; ${bad.length} broken`);
    }
    await ctx.close();
  }
} finally { await b.close(); }

console.log("\n──────────────────────────────────────────────────────────────────────");
const n = (v) => verdicts.filter((x) => x.v === v).length;
console.log(`  ${n("PROVED")} proved · ${n("BLIND")} blind · ${n("REFUTED")} refuted`);
if (n("REFUTED") > 0) process.exit(1);
if (n("BLIND") > 0) { console.log("  ⚠️ BLIND is not a pass — say so in the record."); process.exit(3); }
