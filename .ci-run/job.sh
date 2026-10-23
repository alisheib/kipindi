#!/usr/bin/env bash
# S5-R3-FIX 1 + the rails at the branch's head (R3-2B): qa:hover-touch with its plants, and its red twin (every hover gate
# opened: 1.1–1.3 must fail); the classic rail drawn and dark (qa:classic-rail, both engines); the journey rail with five
# tabs and four (qa:journey-rail-gaps, both engines); and the rails' tiles at 320 · 340 · 360 · 412 in sw · en · zh, both
# engines, ratio 3 — the classic rail drawn (Millionea's track) and the journey rail's five tabs.
. "$CI_RUN/lib.sh"
step cjk-font bash -c 'sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends fonts-noto-cjk && fc-cache -f && fc-list :lang=zh family | sort -u | head -4'

step hover-touch serve 3712 -- node scripts/qa-hover-touch.mjs
# F3's red twin: every hover gate opened (the defect D11 fixed, back), on the same drive.
python3 - <<'PY'
p = "src/app/globals.css"
s = open(p, encoding="utf-8").read()
n = s.count("@media (hover: hover) {")
assert n >= 3, n
open(p, "w", encoding="utf-8").write(s.replace("@media (hover: hover) {", "@media all {"))
print(f"PLANT red-hover: {n} hover gates opened")
PY
serve 3713 -- node scripts/qa-hover-touch.mjs > "$OUT/red-hover.log" 2>&1
rc=$?
grep -a -E "✗|passed, " "$OUT/red-hover.log" | cut -c1-220
if [ $rc -ne 0 ] && grep -a -q "✗ 1.1" "$OUT/red-hover.log" && grep -a -q "✗ 1.2" "$OUT/red-hover.log" && grep -a -q "✗ 1.3" "$OUT/red-hover.log"; then
  echo "red-hover caught rc=$rc (1.1, 1.2 and 1.3 each failed)" | tee -a "$OUT/summary.txt"
else
  echo "red-hover MISSED rc=$rc" | tee -a "$OUT/summary.txt"; LIB_FAILED=1
fi
plant_check red-hover src/app/globals.css

step classic-drawn serve 3714 FEATURE_MILLIONEA=ACTIVE -- env RAIL=drawn node scripts/qa-classic-rail.mjs "$OUT/classic-drawn"
step classic-dark serve 3715 -- env RAIL=dark node scripts/qa-classic-rail.mjs "$OUT/classic-dark"
step jrail-five serve 3716 FEATURE_SIMPLEJOURNEY=ACTIVE FEATURE_MILLIONEA=ACTIVE -- node scripts/qa-journey-rail-gaps.mjs "$OUT/jrail-five"
step jrail-four serve 3717 FEATURE_SIMPLEJOURNEY=ACTIVE -- node scripts/qa-journey-rail-gaps.mjs "$OUT/jrail-four"

cat > "$OUT/rail-tiles.mjs" <<'JS'
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE, DIR = process.env.DIR, SEL = process.env.SEL, PATH_ = process.env.PAGE || "/markets";
mkdirSync(DIR, { recursive: true });
for (const [engine, type] of [["chromium", chromium], ["webkit", webkit]]) {
  const b = await type.launch();
  for (const l of ["sw", "en", "zh"]) {
    const ctx = await b.newContext({ viewport: { width: 320, height: 780 }, deviceScaleFactor: 3, hasTouch: true, isMobile: engine === "chromium" });
    await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); localStorage.setItem("50pick-howto-seen", "1"); } catch {} });
    await ctx.addCookies([{ name: "kp-locale", value: l, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE + PATH_, { waitUntil: "load", timeout: 240000 });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; } html{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}" });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForSelector(SEL, { timeout: 120000 });
    for (const w of [320, 340, 360, 412]) {
      await page.setViewportSize({ width: w, height: 780 });
      await page.evaluate(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(() => d(true)))));
      await page.waitForTimeout(300);
      const labels = await page.$$eval(`${SEL} .kp-rail__label`, (els) => els.map((e) => `${e.textContent.trim()}${e.scrollWidth > e.clientWidth + 0.5 ? " CUT" : ""}`));
      await page.locator(SEL).screenshot({ path: `${DIR}/${engine}-${l}-${w}.png` });
      console.log(`TILE ${engine} ${l} ${w}: ${labels.join(" | ")}`);
    }
    await ctx.close();
  }
  await b.close();
}
JS
cp "$OUT/rail-tiles.mjs" rail-tiles.tmp.mjs
step tiles-classic serve 3718 FEATURE_MILLIONEA=ACTIVE -- env DIR="$OUT/tiles-classic" SEL="nav.kp-rail:not(.kp-rail--journey)" node rail-tiles.tmp.mjs
step tiles-journey serve 3719 FEATURE_SIMPLEJOURNEY=ACTIVE FEATURE_MILLIONEA=ACTIVE -- env DIR="$OUT/tiles-journey" SEL="nav.kp-rail--journey" PAGE=/ node rail-tiles.tmp.mjs
rm -f rail-tiles.tmp.mjs
finish
