import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adminLoadPersona, adminLoadSession } from "./admin-load-persona.mjs";

async function verify(selector, session) {
  for (const origin of ["http://localhost:3416", "http://127.0.0.1:3416", "http://[::1]:3416"]) {
    assert.equal(selector(origin), "local:ADMIN", `${origin} must use the disposable Owner fixture`);
    const calls = [];
    const browser = {};
    const state = await session(browser, origin, async (seenBrowser, who) => {
      calls.push([seenBrowser, who]);
      return { cookies: [] };
    });
    assert.deepEqual(calls, [[browser, "local:ADMIN"]], `${origin} sign-in must use the local fixture`);
    assert.deepEqual(state, { cookies: [] });
  }
  assert.equal(selector("https://www.50pick.tz"), "admin", "remote selection stays explicit");
  assert.throws(() => selector("file:///tmp/fake"), /HTTP\(S\)/);
}

const loader = readFileSync(new URL("./admin-load-budget.mjs", import.meta.url), "utf8");
assert.match(loader, /await adminLoadSession\(b, BASE, loginOnce\)/, "the load sweep must use the proven selector");
assert.match(loader, /new URL\(BASE\)\.origin !== new URL\(DEFAULT_BASE\)\.origin/, "the login and measured target must match");
await verify(adminLoadPersona, adminLoadSession);

if (process.argv.includes("--prove-red")) {
  const source = readFileSync(new URL("./admin-load-persona.mjs", import.meta.url), "utf8");
  assert.ok(source.includes('"local:ADMIN"'), "missing local-fixture mutation site");
  const broken = source.replace('"local:ADMIN"', '"admin"');
  const mutant = await import(`data:text/javascript,${encodeURIComponent(broken)}`);
  await assert.rejects(() => verify(mutant.adminLoadPersona, mutant.adminLoadSession), /disposable Owner fixture/);
  console.log("RED admin load persona: local fixture erased and the value guard failed");
} else {
  console.log("PASS admin load persona: loopback signs in with the disposable Owner fixture");
}
