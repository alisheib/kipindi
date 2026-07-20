/**
 * Live card-to-detail settlement parity check.
 *
 * The static guard (`npm run test:outcome`) proves no code INFERS an outcome.
 * This proves the running site AGREES with itself: for every resolved market on
 * the board, the outcome printed on the card must equal the outcome printed on
 * that market's detail page.
 *
 * This is the check that would have caught the 2026-07-20 user report directly —
 * on prod at that time, 4 of 8 sampled resolved markets disagreed, worst on
 * lopsided pools (100% YES that settled NO).
 *
 * Run:  BASE=https://50pick.tz node scripts/outcome-parity.mjs
 *       npm run qa:outcome
 *
 * Exit 1 on any disagreement.
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE || "https://50pick.tz").replace(/\/+$/, "");
const LIMIT = parseInt(process.env.LIMIT || "12", 10);
const SURFACES = (process.env.SURFACES || "/results,/markets").split(",");

/** Pull the settled side out of a blob of visible text. Handles EN + SW. */
function readOutcome(text) {
  const t = text.replace(/\s+/g, " ");
  if (/\bVOIDED\b|\bIMEBATILISHWA\b/i.test(t)) return "VOID";
  const m =
    t.match(/RESOLVED\s*·\s*(YES|NO)\b/i) ||          // detail resolution panel
    t.match(/RESULT\s+(YES|NO)\b/i) ||                 // card value slot
    t.match(/RESOLVED\s+(YES|NO)\b/i) ||               // card status pill
    t.match(/MATOKEO\s*·?\s*(NDIYO|HAPANA)\b/i);       // sw
  if (!m) return null;
  const v = m[1].toUpperCase();
  return v === "NDIYO" ? "YES" : v === "HAPANA" ? "NO" : v;
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();

const seen = new Map(); // href -> outcome on card
for (const surface of SURFACES) {
  await page.goto(BASE + surface, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(900);
  const found = await page.evaluate(() =>
    [...document.querySelectorAll(".market-grid > *")].map((el) => {
      const a = el.querySelector('a[href*="/markets/"]') || el.closest('a[href*="/markets/"]');
      return { href: a ? a.getAttribute("href") : null, text: el.innerText };
    })
  );
  for (const f of found) {
    if (!f.href) continue;
    const o = readOutcome(f.text);
    if (o && !seen.has(f.href)) seen.set(f.href, o);
  }
}

const targets = [...seen.entries()].slice(0, LIMIT);
console.log(`\n=== outcome parity: ${BASE} — ${targets.length} resolved market(s) ===`);
let bad = 0;
for (const [href, cardSays] of targets) {
  await page.goto(BASE + href, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(500);
  const detailText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
  const detailSays = readOutcome(detailText);
  const ok = detailSays && cardSays === detailSays;
  if (!ok) bad++;
  console.log(`  ${ok ? "MATCH   " : "MISMATCH"} card=${String(cardSays).padEnd(5)} detail=${String(detailSays).padEnd(5)} ${href}`);
}
await browser.close();

console.log(`\n${bad === 0 ? "ALL PASS" : `${bad} MISMATCH(ES)`} — ${targets.length} checked`);
if (targets.length === 0) console.log("  (no resolved markets found — nothing to compare)");
process.exit(bad === 0 ? 0 : 1);
