/**
 * D29 · PRODUCTION — does a TERMINAL card ever paint a crowd price nobody paid?
 *
 *   LIVE_BASE=https://www.50pick.tz node scripts/live/ops/d29-terminal-cards.mjs
 *
 * ⛔ THIS INSTRUMENT IS EXPECTED TO GO BLIND, and that is the point of running it anyway.
 * The board may hold no resolved-empty and no void card for days (MOBILE-VISUAL-PLAN §0
 * trap 3), so a green sweep here would be a statement about TODAY'S BOARD and not about the
 * code. The code is proven by `test:outcome`'s six assertions and five RED mutations; this
 * only looks for a live counter-example, and says BLIND when the population is empty.
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE;
if (!BASE) { console.error("⛔ set LIVE_BASE"); process.exit(2); }
console.log(`\n  TARGET: ${BASE}\n`);

const verdicts = [];
const say = (v, name, detail) => { verdicts.push({ v, name }); console.log(`  ${v.padEnd(8)} ${name}${detail ? ` — ${detail}` : ""}`); };

/** Every market card, with what its price slot and its bar actually say. */
const readCards = (page) => page.$$eval("article.mcardp", (cards) => cards.map((c) => {
  /* ⛔ THE STATUS CHIP IS THE ONLY HONEST TERMINAL TEST. The first version of this probe called
     a card terminal when its price slot was EMPTY (.mcardp-pct--empty) — but a LIVE cold-start
     card has exactly that too, so it "PROVED" D29 over two live cards with no bets and never
     looked at a settled or void one at all. The population it measured could not contain the
     defect. The chip carries the card's real state. */
  /* ⚠️ AND NOT `.chip` EITHER — the kit's Chip renders no such class, so that selector matched
     nothing, every card's status read null, and the probe flipped from a false PROVED to a false
     BLIND. Two wrong readings from one instrument before it was pointed at the right node. The
     status word is the first text in `.mcardp-top`. */
  const top = c.querySelector(".mcardp-top");
  const cap = c.querySelector(".mcardp-pctcap");
  const pct = c.querySelector(".mcardp-pct");
  const rail = c.querySelector(".tipbar-empty");
  const bar = c.querySelector('[role="progressbar"]');
  return {
    status: top ? (top.textContent.trim().match(/^(Live|Closed|Resolved|Void|Pending)/) ?? [null])[0] : null,
    cap: cap ? cap.textContent.trim() : null,
    pct: pct ? pct.textContent.trim() : null,
    pctEmpty: !!c.querySelector(".mcardp-pct--empty"),
    pctAria: pct ? pct.getAttribute("aria-label") : null,
    railPresent: !!rail,
    barName: bar ? bar.getAttribute("aria-label") : null,
    nobets: !!c.querySelector(".mcardp-nobets"),
    text: c.textContent.replace(/\s+/g, " ").slice(0, 70),
  };
}));

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const ctx = await b.newContext({ viewport: { width: 360, height: 900 } });
  const page = await ctx.newPage();
  let seen = 0, terminal = 0;
  const offenders = [], honest = [];

  // /results is the archive — the one surface guaranteed to hold settled and void markets.
  // ⭐ EN, so the status chip is one fixed string rather than three.
  await ctx.addCookies([{ name: "kp-locale", value: "en", domain: "www.50pick.tz", path: "/" }]);
  for (const path of ["/results", "/markets", "/live"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1200);
    // The resolved strip sits BELOW the grid on /markets; scroll so nothing is lazily withheld.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(1200);
    const cards = await readCards(page);
    seen += cards.length;
    for (const c of cards) {
      // A terminal card is one whose price slot is captioned as a RESULT rather than a side.
      // Locale is pinned to EN below, so the chip reads "Resolved" or "Void" verbatim.
      const isTerminal = /^(Resolved|Void)$/i.test(c.status ?? "");
      if (!isTerminal) continue;
      terminal++;
      // ⛔ THE DEFECT: a terminal card showing a PERCENTAGE. Post-fix it must show an outcome
      //    word, or an em-dash — never a figure derived from an empty pool's default.
      if (/^\d+\s*%$/.test((c.pct ?? "").replace(/\s/g, " ").trim())) offenders.push({ path, ...c });
      else honest.push({ path, status: c.status, cap: c.cap, pct: c.pct, barName: c.barName, nobets: c.nobets });
    }
  }

  console.log(`  ${seen} cards read · ${terminal} terminal`);
  honest.slice(0, 8).forEach((h) => console.log(`    honest: ${h.path} [${h.status}] cap="${h.cap}" pct="${h.pct}" bar="${h.barName}" nobets=${h.nobets}`));

  if (terminal === 0) {
    say("BLIND", "D29 · no terminal card on any surface right now",
      `${seen} cards read and none is settled or void — §0 trap 3, this run cannot see the defect either way`);
  } else if (offenders.length > 0) {
    offenders.slice(0, 4).forEach((o) => console.log(`    ⛔ ${o.path} cap="${o.cap}" pct="${o.pct}" bar="${o.barName}"`));
    say("REFUTED", "D29 · a terminal card still paints a percentage", `${offenders.length} of ${terminal}`);
  } else {
    say("PROVED", "D29 · no terminal card paints a crowd percentage",
      `${terminal} terminal card(s), every one showing an outcome word or an em-dash`);
    // ⭐ AND THE ABSENCE CLAIM IS ONLY MADE WHERE IT CAN BE TRUE.
    const lying = honest.filter((h) => h.nobets && h.pct && !/^—$/.test(h.pct));
    say(lying.length === 0 ? "PROVED" : "REFUTED", "D29 · no terminal card claims 'no bets' beside a real figure",
      `${lying.length} contradiction(s)`);
  }
  await ctx.close();
} finally { await b.close(); }

console.log("\n──────────────────────────────────────────────────────────────────────");
const n = (v) => verdicts.filter((x) => x.v === v).length;
console.log(`  ${n("PROVED")} proved · ${n("BLIND")} blind · ${n("REFUTED")} refuted`);
if (n("REFUTED") > 0) process.exit(1);
if (n("BLIND") > 0) { console.log("  ⚠️ BLIND is not a pass — the code is proven by test:outcome, not by this."); process.exit(3); }
