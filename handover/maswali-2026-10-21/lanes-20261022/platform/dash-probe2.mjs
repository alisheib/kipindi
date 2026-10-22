// Scratch: what does Chromium parse from motion.css for the `.m-draw` rules?
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire("C:/50pick-ssd/kipindi-mln-fplt/package.json")("playwright");
const css = readFileSync("C:/50pick-ssd/kipindi-mln-fplt/src/app/motion.css", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: "reduce" });
await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body></body></html>`);
const r = await page.evaluate(() => {
  const out = [];
  const visit = (rules, at) => {
    for (const r of rules) {
      if (r instanceof CSSStyleRule) { if (/m-draw/.test(r.selectorText)) out.push(`${at}${r.cssText}`); }
      else if (r.cssRules && !(r instanceof CSSKeyframesRule)) visit(r.cssRules, `${at}${r.conditionText ?? r.media?.mediaText ?? ""} > `);
    }
  };
  visit(document.styleSheets[0].cssRules, "");
  return out;
});
console.log(r.join("\n"));
await browser.close();
