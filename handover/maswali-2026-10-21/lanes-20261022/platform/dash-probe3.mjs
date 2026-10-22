// Scratch: the m-draw case of rm-probe, isolated, with the full motion.css under the OS preference.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire("C:/50pick-ssd/kipindi-mln-fplt/package.json")("playwright");
const css = readFileSync("C:/50pick-ssd/kipindi-mln-fplt/src/app/motion.css", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: "reduce" });
await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body><div id="h"></div></body></html>`);
const r = await page.evaluate(() => {
  const host = document.getElementById("h");
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", "M0 10 H200");
  el.style.strokeDasharray = "200"; el.style.strokeDashoffset = "200";
  s.appendChild(el); host.appendChild(s);
  const before = getComputedStyle(el).strokeDashoffset;
  el.classList.add("m-draw");
  const c = getComputedStyle(el);
  return { before, after: c.strokeDashoffset, anim: c.animationName, matches: el.matches(".m-draw"), mq: matchMedia("(prefers-reduced-motion: reduce)").matches, cls: el.getAttribute("class") };
});
console.log(JSON.stringify(r));
await browser.close();
