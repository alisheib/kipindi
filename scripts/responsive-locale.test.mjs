import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assertLang } from "./qa-locale.mjs";

const source = readFileSync(fileURLToPath(new URL("./responsive-audit.mjs", import.meta.url)), "utf8");
const helperSource = source.match(/async function screenshotWithLocale\(page, locale, path\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(helperSource, "responsive capture helper must exist");

function checkWiring(script) {
  assert.equal((script.match(/\.screenshot\s*\(/g) ?? []).length, 1, "all captures must use the locale helper");
  assert.equal((script.match(/\bscreenshotWithLocale\s*\(/g) ?? []).length, 8, "all seven capture sites must use the helper");
  assert.equal((script.match(/await screenshotWithLocale\(page, locale,/g) ?? []).length, 1, "sweep must check its requested locale");
  assert.equal((script.match(/await screenshotWithLocale\(p, "en",/g) ?? []).length, 6, "English overlays must check English");
}

function makeHelper(body) {
  return new Function("assertLang", `return (${body});`)(assertLang);
}

async function checkBehavior(helper) {
  for (const [actual, requested, shouldCapture] of [
    ["sw", "sw", true],
    ["en", "sw", false],
    ["", "sw", false],
  ]) {
    const events = [];
    const page = {
      evaluate: async () => { events.push("lang"); return actual; },
      screenshot: async ({ path }) => { events.push(`shot:${path}`); },
    };
    if (shouldCapture) {
      await helper(page, requested, "sw.png");
      assert.deepEqual(events, ["lang", "shot:sw.png"], "read back language before capture");
    } else {
      await assert.rejects(helper(page, requested, "sw.png"), /locale mismatch/);
      assert.deepEqual(events, ["lang"], "wrong or absent language must refuse capture");
    }
  }
}

checkWiring(source);
await checkBehavior(makeHelper(helperSource));
console.log("responsive locale: seven capture sites checked; matching, wrong and absent <html lang> PASS");

if (process.argv.includes("--prove-red")) {
  const withoutReadback = helperSource.replace(/  await assertLang\(page, locale\);\r?\n/, "");
  assert.notEqual(withoutReadback, helperSource, "read-back removal mutation must plant");
  await assert.rejects(checkBehavior(makeHelper(withoutReadback)), /locale mismatch|read back language before capture/);

  const forcedEnglish = source.replace("await screenshotWithLocale(page, locale,", "await screenshotWithLocale(page, \"en\",");
  assert.notEqual(forcedEnglish, source, "forced-English mutation must plant");
  assert.throws(() => checkWiring(forcedEnglish), /sweep must check its requested locale/);
  console.log("responsive locale RED: removed read-back and forced-English sweep both caught");
}
