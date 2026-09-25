/**
 * D42 · PRODUCTION — does every arc the ring paints have a word?
 *
 *   LIVE_BASE=https://www.50pick.tz node scripts/live/ops/d42-ring-legend.mjs
 *
 * ⭐ THE CONTRACT IS ARITHMETIC, NOT APPEARANCE: the counts the legend NAMES must sum to the
 * page's own stated total (`data-result-count`), which is the donut's denominator. "The legend
 * has three entries" would pass a legend that names the wrong three; summing to the ring is the
 * thing a player could check.
 *
 * ⛔ AND IT CHECKS THE VOID FILTER BY NAME. `/results?out=void` was the worst case and the one
 * nobody had looked at: `linesShown` keeps a product only when it has a YES or a NO, so that
 * view dropped EVERY legend row — 31 results, a full 360° grey circle, not one word.
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE;
if (!BASE) { console.error("⛔ set LIVE_BASE"); process.exit(2); }
console.log(`\n  TARGET: ${BASE}\n`);

const verdicts = [];
const say = (v, name, detail) => { verdicts.push({ v, name }); console.log(`  ${v.padEnd(8)} ${name}${detail ? ` — ${detail}` : ""}`); };

/** The ring's arcs (degrees) and the legend's named counts, as the page renders them. */
const read = (page) => page.evaluate(() => {
  const arcs = [...document.querySelectorAll("svg circle")]
    .filter((c) => c.getAttribute("stroke-dasharray"))
    .map((c) => ({
      deg: +((parseFloat(c.getAttribute("stroke-dasharray")) / 100.53) * 360).toFixed(2),
      ink: (c.getAttribute("stroke") || "").slice(0, 24),
    }));
  const box = document.querySelector("div.flex.min-w-0.flex-col");
  /* ⛔ LEAF SPANS ONLY. The per-product row is a <span> WRAPPING two <span>s, so reading every
     span counted the wrapper's whole text AND its children — the legend "named" 320 of 210 and
     the probe reported REFUTED against a page that was correct. A nesting artefact in the
     instrument, not a defect in the ring. */
  const words = box
    ? [...box.querySelectorAll("span")].filter((s) => s.children.length === 0)
        .map((s) => s.textContent.trim()).filter(Boolean)
    : [];
  // Every "<word> <number>" the legend states, with the number parsed out.
  const named = words
    .map((w) => (w.match(/^(.+?)\s+(\d+)$/) ?? null))
    .filter(Boolean)
    .map((m) => ({ word: m[1], n: Number(m[2]) }));
  return {
    arcs,
    named,
    total: Number(document.querySelector("[data-result-count]")?.getAttribute("data-result-count") ?? "0"),
    overflow: box ? Math.max(0, ...[box, ...box.querySelectorAll("*")].map((n) => n.scrollWidth - n.clientWidth)) : null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  for (const width of [320, 360]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    // EN so the legend words are one fixed set rather than three.
    await ctx.addCookies([{ name: "kp-locale", value: "en", domain: new URL(BASE).hostname, path: "/" }]);
    const page = await ctx.newPage();

    for (const q of ["", "?out=void"]) {
      await page.goto(`${BASE}/results${q}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1400);
      const r = await read(page);
      const label = `@${width}${q || " (all)"}`;
      console.log(`  ${label}  total=${r.total} arcs=${JSON.stringify(r.arcs.map((a) => a.deg))} legend=${JSON.stringify(r.named)}`);

      if (r.total === 0 || r.arcs.length === 0) {
        say("BLIND", `D42 ${label}`, "no ring on this view — nothing to check");
        continue;
      }
      // ⭐ THE CONTRACT: what the legend NAMES sums to what the ring DIVIDES BY.
      const namedSum = r.named.reduce((s, x) => s + x.n, 0);
      say(namedSum === r.total ? "PROVED" : "REFUTED", `D42 ${label} · every arc has a word`,
        `legend names ${namedSum} of ${r.total}${namedSum === r.total ? "" : ` — ${r.total - namedSum} painted and unnamed`}`);

      // The arcs must still close the circle, or the denominator lost a term.
      const deg = r.arcs.reduce((s, a) => s + a.deg, 0);
      say(Math.abs(deg - 360) < 0.5 ? "PROVED" : "REFUTED", `D42 ${label} · the arcs close the circle`,
        `${deg.toFixed(2)}°`);

      // D64's constraint: the legend row may not grow wider.
      say((r.overflow ?? 0) <= 0 && r.docOverflow <= 0 ? "PROVED" : "REFUTED",
        `D42 ${label} · the legend does not overflow`,
        `legend ${r.overflow}px, document ${r.docOverflow}px`);
    }
    await ctx.close();
  }
} finally { await b.close(); }

console.log("\n──────────────────────────────────────────────────────────────────────");
const n = (v) => verdicts.filter((x) => x.v === v).length;
console.log(`  ${n("PROVED")} proved · ${n("BLIND")} blind · ${n("REFUTED")} refuted`);
if (n("REFUTED") > 0) process.exit(1);
if (n("BLIND") > 0) { console.log("  ⚠️ BLIND is not a pass."); process.exit(3); }
