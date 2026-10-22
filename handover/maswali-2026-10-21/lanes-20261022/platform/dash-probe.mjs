// Scratch: why does `stroke-dashoffset: 0 !important` not beat an inline dash offset on an SVG path?
import { createRequire } from "node:module";
const { chromium } = createRequire("C:/50pick-ssd/kipindi-mln-fplt/package.json")("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><head><style>
.a { stroke-dashoffset: 0 !important; }
.b { stroke-dashoffset: 0px !important; }
</style></head><body><svg width="200" height="20">
<path id="p1" class="a" d="M0 10H200" stroke="#fff" style="stroke-dasharray: 200; stroke-dashoffset: 200" />
<path id="p2" class="b" d="M0 10H200" stroke="#fff" style="stroke-dasharray: 200; stroke-dashoffset: 200" />
<path id="p3" class="a" d="M0 10H200" stroke="#fff" />
<path id="p4" d="M0 10H200" stroke="#fff" pathLength="100" class="a" style="stroke-dasharray: 100; stroke-dashoffset: 100" />
</svg></body></html>`);
const r = await page.evaluate(() => ["p1", "p2", "p3", "p4"].map((id) => {
  const el = document.getElementById(id);
  return { id, dash: getComputedStyle(el).strokeDashoffset, inline: el.getAttribute("style") };
}));
console.log(JSON.stringify(r, null, 1));
// The JS way the first probe set it:
const r2 = await page.evaluate(() => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", "M0 10H200");
  el.style.strokeDasharray = "200"; el.style.strokeDashoffset = "200";
  document.querySelector("svg").appendChild(el);
  const before = getComputedStyle(el).strokeDashoffset;
  el.classList.add("a");
  return { before, after: getComputedStyle(el).strokeDashoffset, style: el.getAttribute("style") };
});
console.log(JSON.stringify(r2));
await browser.close();
