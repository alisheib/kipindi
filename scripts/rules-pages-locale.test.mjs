/** Local and production Rules QA must set kp-locale on the origin actually opened. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { localeCookieForOrigin } from "./live/rules-pages-locale.mjs";

const driver = readFileSync(new URL("./live/rules-pages-drive.mjs", import.meta.url), "utf8");
const helper = readFileSync(new URL("./live/rules-pages-locale.mjs", import.meta.url), "utf8");
const LOCAL = ["http://localhost:3417", "http://127.0.0.1:3417"];
const PUBLIC = ["https://50pick.tz", "https://www.50pick.tz", "https://kipindi-production.up.railway.app"];

function driverIssues(source) {
  const issues = [];
  if (!source.includes('import { localeCookieForOrigin } from "./rules-pages-locale.mjs";')
    || !source.includes("await ctx.addCookies([localeCookieForOrigin(BASE, loc)]);")) {
    issues.push("Rules QA sets the locale cookie on its BASE origin");
  }
  if (/domain:\s*["']50pick\.tz["']/.test(source)) issues.push("Rules QA hardcodes the apex cookie domain");
  return issues;
}

assert.deepEqual(driverIssues(driver), [], "Rules QA must call the shared origin-aware cookie helper");
for (const base of [...LOCAL, ...PUBLIC]) for (const locale of ["en", "sw", "zh"]) {
  const cookie = localeCookieForOrigin(base, locale);
  assert.deepEqual(cookie, { name: "kp-locale", value: locale, domain: new URL(base).hostname, path: "/" });
}
assert.throws(() => localeCookieForOrigin("file:///tmp/rules", "sw"), /HTTP origin/);
assert.throws(() => localeCookieForOrigin(LOCAL[0], "fr"), /supported locale/);
console.log("Rules QA locale guard: local, public, and rejected-premise cases passed");

if (process.argv.includes("--prove-red")) {
  const oldCall = "localeCookieForOrigin(BASE, loc)";
  const hardcodedCall = '{ name: "kp-locale", value: loc, domain: "50pick.tz", path: "/" }';
  const mutatedDriver = driver.replace(oldCall, hardcodedCall);
  assert.notEqual(mutatedDriver, driver, "driver mutation anchor absent");
  assert.ok(driverIssues(mutatedDriver).length > 0, "hardcoded driver escaped the guard");

  const mutatedHelper = helper.replace("domain: url.hostname", 'domain: "50pick.tz"');
  assert.notEqual(mutatedHelper, helper, "helper mutation anchor absent");
  const { localeCookieForOrigin: oldCookie } = await import(`data:text/javascript,${encodeURIComponent(mutatedHelper)}`);
  for (const base of LOCAL) {
    assert.notEqual(oldCookie(base, "sw").domain, new URL(base).hostname,
      "hardcoded apex domain unexpectedly satisfied the local locale premise");
    assert.equal(localeCookieForOrigin(base, "sw").domain, new URL(base).hostname);
  }
  console.log("Rules QA locale RED: hardcoded driver and helper rejected; source unchanged");
}
