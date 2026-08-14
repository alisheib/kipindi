/**
 * IS THIS ASSET ALIVE ON THE PLAYER BOARD? — driven on production, at four widths.
 *
 *   SHOT_DIR=./shots/gold ASSET=XAU DUR=15 node scripts/live-asset-board.mjs
 *
 * ⭐ WHY THIS EXISTS. `docs/FINDING-GOLD-CHAINS-STALLED.md`: three XAU chains read `RUNNING`
 * in the database and had opened nothing for up to 3.8 days. The database said one thing, the
 * board said another, and it was the board a player was looking at. After the re-arm fix the
 * question is the same in the other direction — the chain row moved, but does a PLAYER see a
 * live round? A column is not a product.
 *
 * ⛔ NOT A DATABASE READ. This signs in as a real fleet player, opens the real board and reads
 * what is painted. `chain-stall-census.cjs` is the other half; two independent readings is
 * what the finding needed to be believed, and it is what clearing it needs too.
 *
 * Traps encoded here, each already paid for by this campaign:
 *  · ⚠️ `/updown` holds an open event stream, so `networkidle` NEVER fires. Wait for a control.
 *  · ⚠️ There is not always an open round, and a fixed wait measures when the run started, not
 *    whether the product works. This POLLS across a boundary, up to `WAIT_MS`.
 *  · ⚠️ A CSS-uppercased label reads back UPPERCASE — `bodyText()` lowercases both sides.
 *  · ⚠️ ASCII in selectors only; `×` (U+00D7) does not survive every shell/encoding path.
 */
import { browser, login, recorder, shot, BASE, SHOT } from "./live/harness.mjs";

const ASSET = process.env.ASSET ?? "XAU";
const DUR = process.env.DUR ?? "15";
const WHO = process.env.WHO ?? "fleet:01";
const WAIT_MS = Number(process.env.WAIT_MS ?? 20 * 60_000);
const WIDTHS = [360, 768, 1024, 1440];

const rec = recorder(`LIVE · is ${ASSET} ${DUR}m alive on the board?`);
const url = `${BASE}/updown?asset=${ASSET}&d=${DUR}`;

const { b, ctx } = await browser({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
try {
  await login(page, WHO);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // A control, not networkidle — the event stream keeps the page permanently "busy".
  await page.waitForSelector("main", { timeout: 60_000 });

  // ── Poll across a boundary for a round that is actually TAKING BETS ──────────
  // The signal is a live countdown plus an enabled stake control; "a card exists" is
  // satisfied by a wall of settled cards, which is exactly what the stall looked like.
  const deadline = Date.now() + WAIT_MS;
  let live = null;
  while (Date.now() < deadline) {
    live = await page.evaluate(() => {
      const txt = (document.body.innerText || "").toLowerCase();
      const buttons = [...document.querySelectorAll("button")];
      const upDown = buttons.filter((x) => /^(up|down)\b/i.test((x.innerText || "").trim()));
      return {
        hasCountdown: /\b\d{1,2}:\d{2}\b/.test(txt),
        openable: upDown.some((x) => !x.disabled),
        upDownCount: upDown.length,
        closedOnly: /closed/.test(txt) && upDown.every((x) => x.disabled),
        excerpt: txt.replace(/\s+/g, " ").slice(0, 220),
      };
    });
    if (live.openable && live.hasCountdown) break;
    await page.waitForTimeout(15_000);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForSelector("main", { timeout: 60_000 }).catch(() => {});
  }

  rec.check(`${ASSET} ${DUR}m offers a round a player can bet on`,
            !!live?.openable && !!live?.hasCountdown,
            live ? `countdown=${live.hasCountdown} enabled=${live.openable} of ${live.upDownCount} — "${live.excerpt.slice(0, 120)}"` : "no reading");
  rec.check(`…and the board is NOT the closed-and-settled wall the stall showed`,
            !live?.closedOnly, live?.closedOnly ? "every UP/DOWN control disabled" : "");

  // ── LOOK AT IT, at every width ──────────────────────────────────────────────
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w < 500 ? 900 : 1000 });
    await page.waitForTimeout(700);
    await shot(page, `${ASSET.toLowerCase()}-${DUR}m-${w}`);
    // ⛔ Clipping INSIDE a card never reaches document.scrollWidth, so measure the ELEMENTS.
    const clipped = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("main *")) {
        if (el.children.length) continue;
        const t = (el.textContent || "").trim();
        if (!t) continue;
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
          out.push({ text: t.slice(0, 40), box: el.clientWidth, content: el.scrollWidth });
        }
      }
      return out.slice(0, 6);
    });
    rec.check(`${w}px · nothing clipped inside a card`, clipped.length === 0,
              clipped.map((c) => `"${c.text}" box ${c.box}px < content ${c.content}px (over by ${c.content - c.box}px)`).join(" · "));
  }
  console.log(`\n  shots in ${SHOT}`);
} finally {
  await ctx.close(); await b.close();
}
rec.done();
