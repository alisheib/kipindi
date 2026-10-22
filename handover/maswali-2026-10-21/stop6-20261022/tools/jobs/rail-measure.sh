#!/usr/bin/env bash
# The classic phone rail's labels at 320/340/360/412 x en/sw/zh for a guest on /markets, measured the same way on three
# trees in ONE job (one machine): live main da3d32180, the S5 release 2ed817395, and this target (the round-2 head).
# A label is cut when its scrollWidth exceeds its clientWidth by more than half a pixel (qa:classic-rail's own test).
. "$CI_RUN/lib.sh"
cat > "$OUT/rail-measure.mjs" <<'JS'
import { chromium } from "playwright";
const BASE = process.env.BASE;
const out = [];
const browser = await chromium.launch();
for (const locale of ["en", "sw", "zh"]) {
  for (const width of [320, 340, 360, 412]) {
    const ctx = await browser.newContext({ viewport: { width, height: 780 } });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE + "/markets", { waitUntil: "domcontentloaded", timeout: 240000 });
    await page.waitForSelector("nav .kp-rail__label", { timeout: 120000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(1000);
    const labels = await page.evaluate(() => [...document.querySelectorAll("nav .kp-rail__label")].map((l) => {
      const cs = getComputedStyle(l);
      return { text: l.textContent.trim(), sw: l.scrollWidth, cw: l.clientWidth, cut: l.scrollWidth > l.clientWidth + 0.5,
        font: [cs.fontFamily.split(",")[0], cs.fontSize, cs.fontWeight, cs.letterSpacing].join(" ") };
    }));
    out.push({ locale, width, cut: labels.filter((x) => x.cut).map((x) => x.text), labels });
    await page.screenshot({ path: `${process.env.SHOTS}/${locale}-${width}.png`, clip: { x: 0, y: 780 - 90, width, height: 90 } }).catch(() => {});
    await ctx.close();
  }
}
await browser.close();
for (const r of out) console.log(`${r.locale} ${r.width}: cut ${r.cut.length ? r.cut.join(" | ") : "none"} :: ${r.labels.map((x) => `${x.text} ${x.sw}/${x.cw}`).join(" · ")}`);
console.log("FONT " + (out[0]?.labels[0]?.font ?? "?"));
JS
git worktree add --detach "$RUNNER_TEMP/t-main" da3d3218051cbe6b8c7b1176dd36eed544eb6050 > /dev/null 2>&1
git worktree add --detach "$RUNNER_TEMP/t-rel" 2ed817395404c12935c10bf0fa4a5dbaf88693cb > /dev/null 2>&1
( cd "$RUNNER_TEMP/t-main" && npm ci > "$OUT/npm-main.log" 2>&1 ) || echo "npm ci main failed"
( cd "$RUNNER_TEMP/t-rel" && npm ci > "$OUT/npm-rel.log" 2>&1 ) || echo "npm ci rel failed"
for t in main rel head; do
  tree="$RUNNER_TEMP/t-$t"; [ "$t" = head ] && tree="$PWD"
  mkdir -p "$OUT/shots-$t"
  # Inside the tree, so `playwright` resolves from that tree's own node_modules; removed after.
  cp "$OUT/rail-measure.mjs" "$tree/rail-measure.tmp.mjs"
  step "measure-$t" serve_tree "$tree" 3520 -- env SHOTS="$OUT/shots-$t" node rail-measure.tmp.mjs
  rm -f "$tree/rail-measure.tmp.mjs"
done
finish
