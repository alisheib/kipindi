/** Client and server share honest limits for Millionea's written admin ceremonies. */
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { MASWALI_LICENCE_REF_MIN, MASWALI_LICENCE_REF_MAX, MASWALI_REASON_MIN, MASWALI_REASON_MAX,
  licenceRefLengthOk, pauseReasonLengthOk, reasonLengthOk } from "../src/lib/maswali-ceremony-bounds.ts";

const helper = readFileSync("src/lib/maswali-ceremony-bounds.ts", "utf8");
const pools = readFileSync("src/app/admin/maswali/pools/pools-controls.tsx", "utf8");
const integrity = readFileSync("src/app/admin/maswali/integrity/integrity-controls.tsx", "utf8");
const licence = readFileSync("src/lib/server/maswali-licence.ts", "utf8");
const pause = readFileSync("src/lib/server/maswali-pause.ts", "utf8");
const switchSource = readFileSync("src/lib/server/millionea-switch.ts", "utf8");
const service = readFileSync("src/lib/server/maswali-service.ts", "utf8");
let pass = 0, fail = 0;
function ok(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  condition ? pass++ : fail++;
}

ok("reason limits accept exactly five and three hundred characters", reasonLengthOk("a".repeat(MASWALI_REASON_MIN)) && reasonLengthOk("a".repeat(MASWALI_REASON_MAX)));
ok("reason limits reject four and three hundred one characters", !reasonLengthOk("a".repeat(MASWALI_REASON_MIN - 1)) && !reasonLengthOk("a".repeat(MASWALI_REASON_MAX + 1)));
ok("pause normalizes internal whitespace before its limit", pauseReasonLengthOk("alpha   beta") && !pauseReasonLengthOk("a".repeat(MASWALI_REASON_MAX + 1)));
ok("licence limits accept exactly five and five hundred normalized characters", licenceRefLengthOk("a".repeat(MASWALI_LICENCE_REF_MIN)) && licenceRefLengthOk("a".repeat(MASWALI_LICENCE_REF_MAX)));
ok("licence limits reject four and five hundred one normalized characters", !licenceRefLengthOk("a".repeat(MASWALI_LICENCE_REF_MIN - 1)) && !licenceRefLengthOk("a".repeat(MASWALI_LICENCE_REF_MAX + 1)));
ok("licence form uses its shared normalized bound and caps input", pools.includes("!licenceRefLengthOk(ref)") && pools.includes("maxLength={MASWALI_LICENCE_REF_MAX}"));
ok("rollout and sunset forms use the shared reason bound and cap input", (pools.match(/!reasonLengthOk\(reason\)/g) ?? []).length === 2 && (pools.match(/maxLength=\{MASWALI_REASON_MAX\}/g) ?? []).length === 2);
ok("pause and resume form chooses the matching service normalization", integrity.includes("paused ? reasonLengthOk(text) : pauseReasonLengthOk(text)") && integrity.includes("maxLength={MASWALI_REASON_MAX}"));
ok("all four server ceremonies read the same bounds", licence.includes("LICENCE_REF_MAX = MASWALI_LICENCE_REF_MAX") && pause.includes("PAUSE_REASON_MAX = MASWALI_REASON_MAX")
  && switchSource.includes("MILLIONEA_REASON_MAX = MASWALI_REASON_MAX") && service.includes("reason.length > MASWALI_REASON_MAX"));

function changed(source: string) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(compiled, { module, exports: module.exports });
  return module.exports as { reasonLengthOk: typeof reasonLengthOk; pauseReasonLengthOk: typeof pauseReasonLengthOk; licenceRefLengthOk: typeof licenceRefLengthOk };
}
if (process.argv.includes("--prove-red")) {
  const unboundedReason = helper.replace("value.trim().length <= MASWALI_REASON_MAX", "value.trim().length <= 9999");
  if (unboundedReason === helper) throw new Error("Reason upper-bound plant target missing");
  ok("red: an overlong reason reaches the confirm when its bound is removed", changed(unboundedReason).reasonLengthOk("a".repeat(MASWALI_REASON_MAX + 1)));
  const unboundedRef = helper.replace("writtenLength(value) <= MASWALI_LICENCE_REF_MAX", "writtenLength(value) <= 9999");
  if (unboundedRef === helper) throw new Error("Licence upper-bound plant target missing");
  ok("red: an overlong licence reference reaches confirm when its bound is removed", changed(unboundedRef).licenceRefLengthOk("a".repeat(MASWALI_LICENCE_REF_MAX + 1)));
  const unnormalizedPause = helper.replace("pauseReasonLengthOk = (value: string) => writtenLength(value) >= MASWALI_REASON_MIN && writtenLength(value) <= MASWALI_REASON_MAX",
    "pauseReasonLengthOk = (value: string) => value.trim().length >= MASWALI_REASON_MIN && value.trim().length <= MASWALI_REASON_MAX");
  if (unnormalizedPause === helper) throw new Error("Pause normalization plant target missing");
  ok("red: skipping pause whitespace normalization refuses a service-valid note", !changed(unnormalizedPause).pauseReasonLengthOk("alpha" + " ".repeat(MASWALI_REASON_MAX) + "beta"));
}
console.log(`maswali ceremony bounds: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
