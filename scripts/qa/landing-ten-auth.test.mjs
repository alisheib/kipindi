import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { landingSignInMode } from "./landing-ten-auth.mjs";

const cases = [
  ["http://localhost:3009", "demo"],
  ["http://127.0.0.1:3013", "demo"],
  ["https://www.50pick.tz", "mobile01"],
  ["https://50pick.tz", "mobile01"],
  ["https://kipindi-production.up.railway.app", "mobile01"],
];
const entry = readFileSync("scripts/qa/landing-ten.mjs", "utf8");
assert.match(entry, /landingSignInMode\(BASE\) === "demo"/);
assert.match(entry, /BASE \+ "\/auth\/demo"/);
assert.match(entry, /loginOnce\(browser, "mobile01"\)/);
for (const [origin, expected] of cases) {
  assert.equal(landingSignInMode(origin), expected, origin);
}

if (process.argv.includes("--prove-red")) {
  const source = readFileSync("scripts/qa/landing-ten-auth.mjs", "utf8");
  const broken = source.replace('? "demo" : "mobile01"', '? "mobile01" : "demo"');
  assert.notEqual(broken, source, "the role swap landed");
  const changedMode = new Function(broken.replace("export function", "function") + "; return landingSignInMode;")();
  const caught = cases.filter(([origin, expected]) => changedMode(origin) !== expected);
  assert.equal(caught.length, cases.length, "the guard catches a swapped target on every origin");
  console.log(`${caught.length}/${cases.length} swapped-target plants caught`);
} else {
  console.log(`${cases.length}/${cases.length} local and public sign-in targets pass`);
}
