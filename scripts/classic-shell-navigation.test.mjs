import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isNavigationInterruption, retryNavigationCapture } from "./lib/classic-shell-navigation.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const driver = readFileSync(join(ROOT, "scripts/qa-classic-shell-parity.mjs"), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
let failed = 0;
const check = (label, yes) => {
  (yes ? passed++ : failed++);
  console.log(`${yes ? "PASS" : "FAIL"} ${label}`);
};

const navError = () => new Error("page.evaluate: Execution context was destroyed, most likely because of a navigation");
check("the observed Playwright navigation interruption is recognised", isNavigationInterruption(navError()));
check("ordinary snapshot and application errors remain failures",
  !isNavigationInterruption(new Error("page.evaluate: TypeError: no matching element"))
    && !isNavigationInterruption(new Error("page.goto: Timeout exceeded"))
    && !isNavigationInterruption(new Error("Execution context was destroyed")));

{
  let calls = 0, retries = 0;
  let result = null;
  try {
    result = await retryNavigationCapture(async () => {
      calls++;
      if (calls === 1) throw navError();
      return { landed: "/", snapshot: "second document" };
    }, () => { retries++; });
  } catch { /* The assertion below names a missing retry. */ }
  check("one interrupted snapshot is recaptured from a new attempt",
    calls === 2 && retries === 1 && result?.snapshot === "second document");
}
{
  let calls = 0, retries = 0;
  let threw = false;
  try {
    await retryNavigationCapture(async () => { calls++; throw navError(); }, () => { retries++; });
  } catch (error) { threw = isNavigationInterruption(error); }
  check("a second navigation interruption is reported, never waived", threw && calls === 2 && retries === 1);
}
{
  let calls = 0, retries = 0;
  let threw = false;
  try {
    await retryNavigationCapture(async () => { calls++; throw new Error("page.evaluate: product failure"); }, () => { retries++; });
  } catch (error) { threw = error.message.includes("product failure"); }
  check("an unrelated failure is never retried", threw && calls === 1 && retries === 0);
}

// The helper's behaviour is meaningful only when the real driver uses it around a
// whole capture attempt, with the browser context created inside that attempt.
const once = driver.match(/async function captureOnce\([\s\S]*?\n}\n/);
const wrapper = driver.match(/async function capture\([\s\S]*?\n}\n/);
check("the whole cell opens a fresh context on each attempt",
  !!once && /const ctx = await b\.newContext\(/.test(once[0])
    && /finally\s*{\s*await ctx\.close\(\)/.test(once[0]));
check("the actual cell capture uses the bounded retry around the fresh attempt",
  !!wrapper && /return await retryNavigationCapture\(\s*\(\) => captureOnce\(/.test(wrapper[0]));
check("the actual cell still reports exhausted retries as an error",
  !!wrapper && /catch \(e\)\s*{\s*return \{ error: msg\(e\) \}/.test(wrapper[0]));

console.log(`${failed ? "FAILURES" : "ALL PASS"} — ${passed} passed, ${failed} failed`);
if (passed + failed < 8) process.exit(3);
process.exit(failed ? 1 : 0);
