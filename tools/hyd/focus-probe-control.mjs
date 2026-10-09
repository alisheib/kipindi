// Control for qa:journey-shell's FOCUS_PROBE.onScreen: the probe's own source, read from the drive, run on a static page
// whose last rail slot touches the screen's right and bottom edges. +2px offset → the ring leaves the screen (must read
// false); -2px → inside (must read true); a slot away from the edges at +2px → on screen (true).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const TREE = process.argv[2];
const require = createRequire(join(TREE, "package.json"));
const { chromium } = require("playwright");
const src = readFileSync(join(TREE, "scripts/qa-journey-shell.mjs"), "utf8");
const m = /const FOCUS_PROBE = (\(sel\) => \{[\s\S]*?\n\});/.exec(src);
if (!m) { console.log("FOCUS_PROBE not found in the drive"); process.exit(2); }
const probe = m[1];
const page = (offset) => `<!doctype html><html><head><style>
  html, body { margin: 0; height: 100%; }
  nav { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(4, 1fr); }
  a { display: block; height: 64px; outline: none; }
  a:focus-visible { outline: 2px solid blue; outline-offset: ${offset}; }
</style></head><body><nav><a href="#1" id="t1">1</a><a href="#2">2</a><a href="#3">3</a><a href="#4" id="t4">4</a></nav></body></html>`;
const browser = await chromium.launch();
const results = [];
for (const [offset, sel, want] of [["2px", "#t4", false], ["-2px", "#t4", true], ["2px", "#t1", null]]) {
  const p = await browser.newPage({ viewport: { width: 390, height: 780 } });
  await p.setContent(page(offset));
  await p.focus("body");
  // a real Tab sequence, so :focus-visible holds
  const steps = sel === "#t4" ? 4 : 1;
  for (let i = 0; i < steps; i++) await p.keyboard.press("Tab");
  const f = await p.evaluate(`(${probe})(${JSON.stringify(sel)})`);
  results.push({ offset, sel, want, onScreen: f?.onScreen, ringBox: f?.ringBox, viewport: f?.viewport, isTarget: f?.isTarget });
  await p.close();
}
await browser.close();
for (const r of results) console.log(JSON.stringify(r));
// #t1 at +2px touches the LEFT and bottom edges too (left 0, bottom = vh), so it must also read off-screen.
const okAll = results[0].onScreen === false && results[1].onScreen === true && results[2].onScreen === false && results.every((r) => r.isTarget);
console.log(okAll ? "CONTROL HOLDS — an edge slot's outside ring reads off-screen, its inside ring on-screen" : "CONTROL FAILED");
process.exit(okAll ? 0 : 1);
