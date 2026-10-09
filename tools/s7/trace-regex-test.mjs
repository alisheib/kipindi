// Tests qa-journey-preview.mjs's trace helpers exactly as written in the drive (read from the file, not retyped).
import { readFileSync } from "node:fs";
const src = readFileSync("F:/kipindi-wp12/scripts/qa-journey-preview.mjs", "utf8").replace(/\r\n/g, "\n");
const a = src.indexOf("const PREVIEW_TRACE"), b = src.indexOf("\n", src.indexOf("const traceFree"));
if (a < 0 || b < 0) throw new Error("helpers not found");
const { shellIdsIn, traceFree } = new Function(`${src.slice(a, b)}\nreturn { shellIdsIn, traceFree };`)();
const all = (ids) => Object.values(ids).every(Boolean);
const cases = [
  // [label, html, want traceFree, want 2.5c (every shell id)]
  ["classic page", '<header class="app-topbar"><div data-testid="deposit-rail"></div>', true, false],
  ["a chunk file name only", '<script src="/_next/static/chunks/src_components_journey_journey-tabs_tsx_1.js">', true, false],
  ["the marker ALONE (the reviewer's case)", '<div data-testid="journey-preview-marker"></div>', false, false],
  ["the pass cookie name", "kp_preview=abc", false, false],
  ["header id only", '<header data-testid="journey-top-bar">', false, false],
  ["both ids as attributes", '<header data-testid="journey-top-bar"><nav data-testid="journey-tabs">', false, true],
  ["both ids as JSON props", '\\"data-testid\\":\\"journey-top-bar\\" \\"data-testid\\":\\"journey-tabs\\"', false, true],
  ["a longer id", '<nav data-testid="journey-tabsx">', true, false],
];
let bad = 0;
for (const [label, html, wantFree, wantAll] of cases) {
  const free = traceFree(html), every = all(shellIdsIn(html));
  const good = free === wantFree && every === wantAll;
  if (!good) bad++;
  console.log(`${good ? "ok " : "BAD"} ${label}: traceFree ${free}, every shell id ${every}`);
}
console.log(bad ? `${bad} BAD` : "all as intended");
process.exit(bad ? 1 : 0);
