import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./maswali-admin-shots.mjs", import.meta.url)), "utf8");
const helper = source.match(/^const captureTile = (.+);$/m)?.[1];
assert.ok(helper, "admin tile capture helper must exist");
assert.equal((source.match(/\.screenshot\s*\(/g) ?? []).length, 1, "all admin captures must use the helper");
assert.equal((source.match(/await captureTile\(page, name, width\)/g) ?? []).length, 1, "each admin width must call the helper");

async function checkCapture(body) {
  const capture = new Function("OUT", `return (${body});`)(".50pick-shots/maswali");
  const calls = [];
  const page = { screenshot: async (options) => { calls.push(options); } };
  await capture(page, "week-ready", 360);
  assert.deepEqual(calls, [{ path: ".50pick-shots/maswali/week-ready-360.png", fullPage: false, caret: "initial" }],
    "capture must leave the live input caret unchanged during hydration");
}

await checkCapture(helper);
console.log("maswali admin shots caret: all widths use a nonmutating capture PASS");

if (process.argv.includes("--prove-red")) {
  const mutated = helper.replace(/caret: "initial"/, 'caret: "hide"');
  assert.notEqual(mutated, helper, "caret mutation must plant");
  await assert.rejects(checkCapture(mutated), /capture must leave the live input caret unchanged/);
  console.log("maswali admin shots caret RED: hiding the caret is caught");
}
