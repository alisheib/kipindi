/**
 * A4 · LOOK AT `/admin/updown`'s FEE TILE ON THE LIVE CONSOLE, AT FOUR WIDTHS.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-admin-updown-widths.mjs
 *
 * The tile used to read a CORRECT number (TZS 650, loser-share) under a HARDCODED caption
 * ("capped-commission 13%"). `test:fee-model-caption` proves the caption is derived and
 * `red:fee-model-caption` proves it goes red when it is not — but a passing suite is not a
 * screen, and the delta chip is the one element in `AdminKpi` that TRUNCATES above `sm` and
 * WRAPS below it. A caption that is right and unreadable is still a defect.
 *
 * ⚠️ Signs in as the TRADING officer, not as ADMIN: `/admin/updown` is a `trading` page and
 * ADMIN bypasses every domain check, so a sweep run as ADMIN measures nothing about what an
 * officer actually sees. Read-only — it never touches a control.
 */
import { BASE, SHOT, browser, loginOnce, shot } from "./live/harness.mjs";

const WIDTHS = [360, 768, 1024, 1440];
const FEE_TILE_LABEL = "Fee · balanced 10,000";

const { b } = await browser();
let failures = 0;
try {
  const state = await loginOnce(b, "trading");
  for (const width of WIDTHS) {
    const ctx = await b.newContext({ storageState: state, viewport: { width, height: width <= 400 ? 900 : 1000 } });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForFunction(() => /up & down|juu na chini/i.test(document.body.innerText), null, { timeout: 45_000 });
      await page.waitForTimeout(4_000);

      // ⛔ MEASURE THE TILE, NOT THE PAGE. Clipping INSIDE a card never reaches
      // document.scrollWidth — only a per-element read or a human looking at the shot finds
      // it, which is the whole reason `AdminKpi` carries the E-30 comment it does.
      const read = await page.evaluate((label) => {
        const t = (el) => (el.innerText || "").replace(/\s+/g, " ").trim();
        // 🔴 LOWERCASE BOTH SIDES. `AdminKpi` paints its label with `uppercase`, so
        // `innerText` returns "FEE · BALANCED 10,000" while the source says
        // "Fee · balanced 10,000". A case-sensitive `startsWith` reported the tile MISSING
        // at all four widths on a console that was rendering it perfectly — the exact trap
        // `live/harness.mjs` documents about `bodyText()`, walked into one file over.
        const norm = (s) => s.toLowerCase();
        const want = norm(label);
        const tile = [...document.querySelectorAll("div")].find(
          (d) => norm(t(d)).startsWith(want) && d.querySelector("span[title]"),
        );
        if (!tile) return { found: false };
        const chip = [...tile.querySelectorAll("span")].find((s) => s.getAttribute("title"));
        return {
          found: true,
          tile: t(tile),
          captionRendered: chip ? t(chip) : null,
          captionFull: chip ? chip.getAttribute("title") : null,
          // The ellipsis is invisible to innerText — compare the painted box to the content
          // box, which is the only thing that distinguishes a fit from a truncation.
          truncated: chip ? chip.scrollWidth > chip.clientWidth + 1 : null,
          // ⭐ The BUDGET, not just the verdict. "It truncates" tells you to shorten the
          // caption; it does not tell you BY HOW MUCH, and guessing costs a deploy per
          // attempt. These two numbers size the fix exactly.
          chipClientPx: chip ? chip.clientWidth : null,
          chipContentPx: chip ? chip.scrollWidth : null,
          chipChars: chip ? t(chip).length : null,
        };
      }, FEE_TILE_LABEL);

      if (!read.found) {
        console.log(`  FAIL ${width}px — the fee tile was not found. ⚠️ RE-ANCHOR, do not relax.`);
        failures++;
      } else {
        // ⚠️ The chip renders `{▲|▼|·} {delta}` and sets `title={delta}`, so the rendered
        // text ALWAYS carries a direction glyph the title does not. Comparing them raw
        // reports every width as broken; strip the glyph first.
        const rendered = String(read.captionRendered ?? "").replace(/^[▲▼·]\s*/, "");
        const bad = read.truncated || (read.captionFull && rendered !== read.captionFull);
        console.log(`  ${bad ? "FAIL" : "ok  "} ${width}px  "${read.captionRendered}"` +
                    (read.captionFull !== read.captionRendered ? `  (full: "${read.captionFull}")` : "") +
                    `  truncated=${read.truncated}  chip ${read.chipContentPx}px content in ${read.chipClientPx}px box (${read.chipChars} chars)`);
        console.log(`         tile: ${read.tile}`);
        if (bad) failures++;
      }
      await shot(page, `a4-admin-updown-${width}`);
    } catch (e) {
      console.log(`  FAIL ${width}px — ${String(e.message).split("\n")[0]}`);
      failures++;
    } finally {
      await ctx.close();
    }
  }
} finally {
  await b.close();
}
console.log(`\n${failures === 0 ? "ok" : "FAILED"} · shots in ${SHOT}`);
process.exit(failures ? 1 : 0);
