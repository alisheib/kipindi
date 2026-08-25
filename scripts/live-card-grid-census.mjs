/**
 * UNIT 2 — THE MARKET-CARD GRID, MEASURED ON PRODUCTION AT SEVEN WIDTHS.
 *
 *   npm run qa:card-grid            (writes .qa-design-geometry/card-grid-<label>.json)
 *   npm run qa:card-grid -- after
 *
 * > *"Are the number of rows and columns, and when they move to a new line, good? Are we taking
 * >  advantage to maximum of the space we have?"* — and, from the same session:
 * > **"constantly, not just a fix on one screen and not another."**
 *
 * ⭐ CONSISTENCY IS THE DELIVERABLE, SO THE MEASUREMENT IS COMPARATIVE BY CONSTRUCTION. Every
 * surface that renders `.mcardp` is measured at the same seven bands, and what is recorded is
 * the thing that can DISAGREE between them: the column count, the resolved
 * `grid-template-columns`, the container's own width, and the dead space left at the right
 * edge. A per-screen screenshot cannot answer "does /results wrap where /markets wraps"; a
 * table of column counts can, and that is the finding Ali asked for.
 *
 * ⛔ MORE COLUMNS IS NOT AUTOMATICALLY BETTER, and the dead-space number must not be read as a
 * defect on its own. Ali's width tiers are law — board 1480 / 4-up, reading 1080, forms ≤960
 * (`DESIGN_AUTHORITY`) — so a grid that stops at 4-up inside a 1480 container at 1920 is
 * OBEYING the tier, and the ~440px outside it is margin, not waste. This probe therefore
 * records the container width separately from the viewport width, so "unused space" can be
 * attributed to the tier rather than blamed on the grid.
 *
 * ⚠️ SIGNED IN, because `/watchlist` does not exist otherwise and a signed-out `/markets` is a
 * different page. One `loginOnce` state, N contexts — per-cell sign-in trips the server's
 * attempt limiting and reports product failures that are not (harness.mjs `loginOnce`).
 */
import { BASE, loginOnce, browser } from "./live/harness.mjs";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const LABEL = process.argv[2] || "before";
const OUT_DIR = ".qa-design-geometry";
mkdirSync(OUT_DIR, { recursive: true });
const OUT = `${OUT_DIR}/card-grid-${LABEL}.json`;

const BANDS = [360, 414, 768, 1024, 1280, 1440, 1920];
const SURFACES = [
  { name: "/markets", path: "/markets" },
  { name: "/results", path: "/results" },
  { name: "/live", path: "/live" },
  { name: "/watchlist", path: "/watchlist" },
  { name: "landing", path: "/" },
];

const { b, ctx: boot } = await browser({});
await boot.close();
const state = await loginOnce(b, "alpha");

/**
 * ⭐ MAKE `/watchlist` MEASURABLE, THEN PUT IT BACK.
 *
 * ⛔ "no cards" is a DATA state, not a finding, and reporting it as one would be this campaign's
 * favourite mistake: measuring the wrong population and writing down the answer. `/watchlist`
 * renders an `EmptyState` — not a grid — when the account follows nothing, so a census that
 * simply recorded `-` for it would be silent about the surface Ali named explicitly.
 *
 * So follow one market through the PRODUCT (the same `WatchStar` a player clicks), measure, and
 * unfollow at the end. ⚠️ It writes a real row on production; that is why it is undone in the
 * same run, and why the toggle is driven rather than the table written directly.
 */
let watchAdded = false;
{
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1280, height: 1000 } });
  const p0 = await ctx.newPage();
  try {
    // ⚠️ THE STAR IS ON THE DETAIL PAGE, NOT ON THE CARD. `WatchStar` has exactly one call
    // site — `markets/[id]/page.tsx:431` — so looking for it on `/markets` finds nothing and
    // reports "could not follow" against a product that is fine. Open a market first.
    await p0.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await p0.waitForTimeout(2_500);
    const href = await p0.evaluate(() => {
      const a = [...document.querySelectorAll('a[href^="/markets/"]')]
        .find((x) => /\/markets\/[^/?#]+$/.test(x.getAttribute("href") || ""));
      return a ? a.getAttribute("href") : null;
    });
    if (href) {
      await p0.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await p0.waitForTimeout(2_500);
      const star = p0.getByRole("button", { name: /follow this market|fuatilia soko hili/i }).first();
      if (await star.count()) { await star.click(); await p0.waitForTimeout(2_500); watchAdded = true; }
    }
  } catch { /* measured as "-" below if this could not be done */ }
  finally { await ctx.close(); }
  console.log(watchAdded ? "· followed one market so /watchlist renders a grid\n" : "· could not follow a market — /watchlist will read as empty\n");
}

const rows = [];
for (const s of SURFACES) {
  for (const w of BANDS) {
    const ctx = await b.newContext({ storageState: state, viewport: { width: w, height: 1000 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    let cell;
    try {
      // ⚠️ `domcontentloaded`, not `networkidle` — `/live` holds a stream open, so networkidle
      // can only ever expire there. Settle with an explicit scroll+pause instead.
      await p.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await p.waitForTimeout(2_500);
      await p.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        scrollTo(0, 0); await new Promise((r) => setTimeout(r, 500));
      });
      cell = await p.evaluate(() => {
        const cards = [...document.querySelectorAll(".mcardp")].filter((c) => c.getBoundingClientRect().width > 0);
        if (!cards.length) return { cards: 0 };
        // ⭐ COLUMNS ARE COUNTED FROM THE FIRST ROW'S DISTINCT LEFT EDGES, not from the CSS.
        // `grid-template-columns` can say `repeat(auto-fill, …)` and resolve to a different
        // number than it reads; the rendered left edges are what the player actually sees.
        const top0 = Math.round(cards[0].getBoundingClientRect().top);
        const firstRow = cards.filter((c) => Math.abs(Math.round(c.getBoundingClientRect().top) - top0) < 8);
        const lefts = [...new Set(firstRow.map((c) => Math.round(c.getBoundingClientRect().left)))].sort((a, z) => a - z);
        const grid = cards[0].parentElement;
        const gcs = grid ? getComputedStyle(grid) : null;
        const gbox = grid ? grid.getBoundingClientRect() : null;
        const cbox = cards[0].getBoundingClientRect();
        const cols = lefts.length;
        const gap = gcs ? Math.round(parseFloat(gcs.columnGap || "0")) || 0 : 0;
        const used = cols * Math.round(cbox.width) + (cols - 1) * gap;
        return {
          cards: cards.length,
          cols,
          cardW: Math.round(cbox.width),
          cardH: Math.round(cbox.height),
          gap,
          containerW: gbox ? Math.round(gbox.width) : null,
          // Space left INSIDE the grid container after the columns — true dead space.
          deadRight: gbox ? Math.round(gbox.width) - used : null,
          // Space outside the container — this is the width TIER, not waste.
          tierMargin: gbox ? Math.round(document.documentElement.clientWidth - gbox.width) : null,
          templateCols: gcs ? gcs.gridTemplateColumns : null,
          display: gcs ? gcs.display : null,
          docScrollW: document.documentElement.scrollWidth,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
    } catch (e) {
      cell = { error: String(e.message ?? e).slice(0, 120) };
    } finally {
      await ctx.close();
    }
    rows.push({ surface: s.name, band: w, ...cell });
    const c = cell;
    console.log(
      `${s.name.padEnd(11)} ${String(w).padStart(4)} | ` +
      (c.error ? `ERROR ${c.error}`
        : c.cards === 0 ? "no cards"
        : `cols=${c.cols} card=${c.cardW}x${c.cardH} gap=${c.gap} container=${c.containerW} dead=${c.deadRight} tier=${c.tierMargin} ${c.overflowX ? "⚠ X-OVERFLOW" : ""}`),
    );
  }
}
// ⛔ PUT IT BACK. A probe that leaves state behind makes the next run measure something else.
if (watchAdded) {
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1280, height: 1000 } });
  const p1 = await ctx.newPage();
  try {
    await p1.goto(`${BASE}/watchlist`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await p1.waitForTimeout(2_500);
    const un = p1.getByRole("button", { name: /unfollow this market|acha kufuatilia soko hili/i }).first();
    if (await un.count()) { await un.click(); await p1.waitForTimeout(2_000); }
    await p1.goto(`${BASE}/watchlist`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await p1.waitForTimeout(2_000);
    const left = await p1.evaluate(() => document.querySelectorAll(".mcardp").length);
    console.log(`\n· unfollowed — /watchlist now holds ${left} card(s)${left === 0 ? " (restored)" : " ⚠ NOT RESTORED"}`);
  } catch (e) { console.log(`\n⚠ could not restore the watchlist: ${String(e.message).slice(0, 100)}`); }
  finally { await ctx.close(); }
}
await b.close();

writeFileSync(OUT, JSON.stringify(rows, null, 2));
console.log(`\nwrote ${OUT}`);

// ── THE CONSISTENCY QUESTION, ANSWERED AS A TABLE ───────────────────────────
console.log(`\n=== COLUMNS × BAND × SURFACE ===`);
console.log(`surface     ${BANDS.map((w) => String(w).padStart(6)).join("")}`);
for (const s of SURFACES) {
  const line = BANDS.map((w) => {
    const r = rows.find((x) => x.surface === s.name && x.band === w);
    return String(r?.cols ?? (r?.cards === 0 ? "-" : "?")).padStart(6);
  }).join("");
  console.log(`${s.name.padEnd(11)} ${line}`);
}

// ⭐ THE FINDING IS DISAGREEMENT, so state it rather than leaving it to be eyeballed.
console.log(`\n=== DISAGREEMENTS (same band, different column count) ===`);
let disagreements = 0;
for (const w of BANDS) {
  const at = rows.filter((x) => x.band === w && x.cols != null);
  const counts = [...new Set(at.map((x) => x.cols))];
  if (counts.length > 1) {
    disagreements++;
    console.log(`  ${String(w).padStart(4)} → ${at.map((x) => `${x.surface}=${x.cols}`).join(" · ")}`);
  }
}
if (!disagreements) console.log("  none — every surface wraps at the same count at every band");

const prev = `${OUT_DIR}/card-grid-${LABEL === "before" ? "after" : "before"}.json`;
if (existsSync(prev)) {
  const old = JSON.parse(readFileSync(prev, "utf8"));
  const diffs = rows.filter((r) => {
    const o = old.find((x) => x.surface === r.surface && x.band === r.band);
    return o && (o.cols !== r.cols || o.cardW !== r.cardW || o.cardH !== r.cardH);
  });
  console.log(`\n=== DIFF vs ${prev} ===`);
  if (!diffs.length) console.log("IDENTICAL — columns, card width and card height unchanged everywhere.");
  for (const d of diffs) {
    const o = old.find((x) => x.surface === d.surface && x.band === d.band);
    console.log(`  ${d.surface} @${d.band}: cols ${o.cols}→${d.cols} · card ${o.cardW}x${o.cardH}→${d.cardW}x${d.cardH}`);
  }
}
