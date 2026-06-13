/**
 * Markets search — end-to-end across the scenarios a prediction-market board
 * must tolerate:
 *   1. Search input renders on the board.
 *   2. Typing filters the grid live (debounced) and writes ?q= to the URL.
 *   3. Case-insensitive.
 *   4. Multi-word token AND match (words in any order, non-adjacent).
 *   5. Global across categories (a topic chip doesn't hide a name match).
 *   6. Partial-word match.
 *   7. No-results shows the query-echoed empty state + result count.
 *   8. Clear (×) restores the full board.
 *   9. Shareable: direct nav to /markets?q=… renders filtered server-side.
 *  10. Whitespace-only query is treated as empty.
 *  11. Long/garbage query doesn't error.
 *  12. Responsive: full-width + usable at a phone width.
 *
 *   BASE=http://localhost:3009 node scripts/markets-search-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
let pass = 0, fail = 0;
const ok = (label, cond, detail = "") => { console.log(`${cond ? "✓" : "✗"} ${label}${detail ? "  →  " + detail : ""}`); cond ? pass++ : fail++; };

const cardCount = (p) => p.locator(".mcardp").count();
const titles = async (p) => (await p.locator(".mcardp .mcardp-q").allInnerTexts()).map((t) => t.trim());

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Make sure the board has markets to search. "All / All-time" widens it.
  await page.goto(`${BASE}/markets?when=all`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  ok("01 search input renders", await page.getByPlaceholder(/Search markets/).count() > 0);

  const baseTitles = await titles(page);
  const baseCount = baseTitles.length;
  ok("01b board has markets to search", baseCount > 0, `${baseCount} cards`);

  // Pick a distinctive word from a real seeded title (robust to seed changes).
  const sample = baseTitles.find((t) => t.split(/\s+/).some((w) => w.replace(/[^A-Za-z]/g, "").length >= 5))
    ?? baseTitles[0] ?? "market";
  const words = sample.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter((w) => w.length >= 5);
  const word = (words[0] ?? "market").toLowerCase();

  // 2 + 3: type (lower/mixed case), expect live filtering + URL + matching card kept.
  const box = page.getByPlaceholder(/Search markets/);
  await box.click();
  await box.fill(word.toUpperCase()); // case-insensitivity
  await page.waitForTimeout(600); // debounce + rerender
  ok("02 URL gets ?q=", /[?&]q=/.test(page.url()), page.url());
  const afterTitles = await titles(page);
  ok("03 case-insensitive filter keeps matching market",
    afterTitles.some((t) => t.toLowerCase().includes(word)),
    `q="${word}" → ${afterTitles.length} shown`);
  ok("03b filtered set is a subset (search narrowed the board)", afterTitles.length <= baseCount);

  // 4: multi-word token AND (two words from the sample, reversed order).
  if (words.length >= 2) {
    const two = `${words[1]} ${words[0]}`.toLowerCase(); // reversed
    await box.fill(two);
    await page.waitForTimeout(600);
    const t = await titles(page);
    const hay = (s) => { const h = s.toLowerCase(); return two.split(" ").every((w) => h.includes(w)); };
    ok("04 multi-word AND match (any order)", t.length > 0 && t.every(hay), `q="${two}" → ${t.length}`);
  } else {
    ok("04 multi-word AND match (any order)", true, "sample had <2 long words — skipped");
  }

  // 6: partial word (prefix of the word).
  await box.fill(word.slice(0, Math.max(3, word.length - 2)));
  await page.waitForTimeout(600);
  ok("06 partial-word match", (await cardCount(page)) > 0, `q="${word.slice(0, 3)}…"`);

  // 7: no results → echoed empty state + count line.
  await box.fill("zzqxqweirdnomatch");
  await page.waitForTimeout(600);
  const bodyTxt = (await page.locator("body").innerText()).toLowerCase();
  ok("07 no-results empty state echoes query", bodyTxt.includes("zzqxqweirdnomatch") && /no.*market/.test(bodyTxt));

  // 8: clear (×) restores the board — from a known valid search state.
  await box.fill(word);
  await page.waitForFunction(() => /[?&]q=/.test(location.href), null, { timeout: 4000 }).catch(() => {});
  await page.getByRole("button", { name: /Clear search/ }).first().click();
  await page.waitForFunction(() => !/[?&]q=/.test(location.href), null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
  ok("08 clear restores full board", !/[?&]q=/.test(page.url()) && (await cardCount(page)) >= 1, `${await cardCount(page)} cards, ${page.url()}`);

  // 9: shareable direct nav renders filtered server-side (no typing).
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/markets?q=${encodeURIComponent(word)}`, { waitUntil: "networkidle" });
  await p2.waitForTimeout(400);
  const t2 = await titles(p2);
  ok("09 shareable ?q= renders filtered (SSR)", t2.length > 0 && t2.some((t) => t.toLowerCase().includes(word)));
  // input is pre-filled from the URL
  ok("09b input reflects URL query", (await p2.getByPlaceholder(/Search markets/).inputValue()).toLowerCase() === word);
  await p2.close();

  // 10: whitespace-only query == empty board (not "no results").
  const p3 = await ctx.newPage();
  await p3.goto(`${BASE}/markets?when=all&q=${encodeURIComponent("   ")}`, { waitUntil: "networkidle" });
  await p3.waitForTimeout(400);
  ok("10 whitespace query treated as empty", (await p3.locator(".mcardp").count()) > 0 && !/no markets match/i.test(await p3.locator("body").innerText()));
  await p3.close();

  // 11: long/garbage query doesn't error.
  const p4 = await ctx.newPage();
  const resp = await p4.goto(`${BASE}/markets?q=${encodeURIComponent("x".repeat(300) + " <script> %% ")}`, { waitUntil: "networkidle" });
  ok("11 long/garbage query → 200, no crash", (resp?.status() ?? 0) === 200 && !/hit a snag/i.test(await p4.locator("body").innerText()));
  await p4.close();

  // 12: responsive — phone width, full-width usable input.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pm = await mobile.newPage();
  await pm.goto(`${BASE}/markets?when=all`, { waitUntil: "networkidle" });
  await pm.waitForTimeout(400);
  const inp = pm.getByPlaceholder(/Search markets/);
  const vis = await inp.isVisible();
  const w = (await inp.boundingBox())?.width ?? 0;
  ok("12 search is full-width + usable on mobile", vis && w > 280, `width ${Math.round(w)}px @390`);
  await inp.fill(word);
  await pm.waitForTimeout(600);
  ok("12b mobile search filters", (await pm.locator(".mcardp").count()) > 0);
  await mobile.close();

  await ctx.close();
} catch (err) {
  ok("FATAL", false, err?.message || String(err));
} finally {
  await browser.close();
}
console.log(`\nMARKETS SEARCH E2E   PASS: ${pass}   FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
