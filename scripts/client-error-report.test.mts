/**
 * CLIENT-CRASH REPORTING — the guard for the instrument that did not exist, and whose absence
 * cost two sessions on ONE player's phone (Ali, 2026-09-18).
 *
 *   npx tsx scripts/client-error-report.test.mts   (npm run test:client-error-report)
 *
 * A client-side throw renders `error.tsx` with the response still HTTP **200**, mints no
 * `error.digest`, and leaves its stack only in a phone's console. So the platform could not see
 * its own crashes at all, and a log search for a bad status ruled out a fault that was happening.
 *
 * ⛔ §1 IS THE ONE THAT MATTERS AND IT IS ADVERSARIAL. This endpoint carries diagnostic text off
 * surfaces that hold wallets, stakes and positions. A crash message can easily read *"insufficient
 * balance 412500"*, and a stack frame can carry a URL holding an invite token. Every assertion
 * there is a leak that must not happen, and §6 proves each matcher can actually fail.
 *
 * ⭐ §1g IS THE COUNTERWEIGHT: a scrub that redacts everything is useless. The real exception
 * texts from this campaign must survive it and still be diagnosable.
 *
 * No network, no database, no build: pure functions plus a source read. Belongs in `predeploy`.
 */
import { scrubText, parseClientErrorBody } from "../src/lib/server/client-error.ts";
import { RATE_RULES } from "../src/lib/server/rate-limit.ts";
import { decomment } from "./lib/decomment.mts";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
/**
 * ⛔ CODE ASSERTIONS READ THE CODE, NEVER THE PROSE — and this file got it wrong first.
 * Both §3g ("it cannot rethrow") and §4f (the effect ordering) initially matched the words
 * `throw` and `location.reload()` inside the very COMMENTS that document those rules, so the
 * guard failed on files that were correct. `deploy-skew.test.mts` carries the identical lesson
 * about `reset()`. Assert against `readCode`; quote prose only in a message.
 */
const readCode = (rel: string) => decomment(read(rel));

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, why = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && why ? ` — ${why}` : ""}`);
};
/** Nothing that looks like money, identity or a credential may survive. */
const clean = (s: string) =>
  !/\d{4,}/.test(s) && !/@[\w-]+\.[\w.]+/.test(s) && !/\b(token|secret|password|bearer)\b\s*[:=]\s*[^[\s]/i.test(s);

/* ── §1 · ⛔ THE LEAK ASSERTIONS ──────────────────────────────────────────────────────────── */
console.log("\n§1 · ⛔ no money, identity or credential may survive the scrub");
{
  const cases: Array<[string, string]> = [
    ["a balance", "Insufficient balance 412500 for stake 25000"],
    ["a grouped figure", "payout was 1,250,000 but wallet held 412,500"],
    ["an E.164 phone", "login failed for +255712000101"],
    ["a local phone", "no account for 0712000101"],
    ["an email", "no user matching ali.sheib@50pick.tz in this tenant"],
    ["a query token", "GET /profile/invite?token=aBc123XyZ_secret failed"],
    ["a bearer header", "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9"],
    ["a password field", "password=hunter2 rejected"],
    ["an epoch instant", "asc ordered by time, prev time=1789720565"],
  ];
  for (const [what, raw] of cases) {
    const out = scrubText(raw);
    ok(`§1 ${what} is redacted`, clean(out), `left: ${JSON.stringify(out)}`);
  }
  // ⭐ AND THE COUNTERWEIGHT — an over-eager scrub is a useless one.
  const real = scrubText("Assertion failed: data must be asc ordered by time, index=1, time=1789720565");
  ok("§1g ⭐ a real exception is still diagnosable after scrubbing",
    /asc ordered by time/.test(real) && /index=1/.test(real),
    `got ${JSON.stringify(real)}`);
  ok("§1h ⭐ …and so is the other one", /Invalid time value/.test(scrubText("RangeError: Invalid time value")));
  ok("§1i a short number (a status code) is NOT redacted", /404/.test(scrubText("chunk 404 on load")));
}

/* ── §2 · the body parser ─────────────────────────────────────────────────────────────────── */
console.log("\n§2 · what the endpoint will accept");
{
  ok("§2a junk is refused", parseClientErrorBody("not json") === null);
  ok("§2b a non-object is refused", parseClientErrorBody('"hello"') === null);
  ok("§2c a report with no message is refused", parseClientErrorBody('{"path":"/updown"}') === null);

  const r = parseClientErrorBody(JSON.stringify({
    message: "RangeError: Invalid time value",
    stack: "at formatClock (updown-card.tsx:226)",
    path: "/wallet/deposit?token=aBc123XyZ&amount=50000",
    digest: "1234567890",
    build: "79eed440324ee3e43c0e7b4b6352fa7276b3da15",
  }));
  ok("§2d a real report is accepted", r !== null);
  // ⛔ THE QUERY STRING IS DISCARDED, NOT SCRUBBED — it has already leaked by then.
  ok("§2e 🔴 the query string is gone entirely", r?.path === "/wallet/deposit",
    `got ${JSON.stringify(r?.path)}`);
  ok("§2f the message survives", /Invalid time value/.test(r?.message ?? ""));
  ok("§2g the stack survives", /formatClock/.test(r?.stack ?? ""));
  // ⚠️ digest/build are IDS — the digit rule must not eat the value we look up.
  ok("§2h ⚠️ the digest is NOT redacted", r?.digest === "1234567890", `got ${JSON.stringify(r?.digest)}`);
  ok("§2i ⚠️ the build sha is NOT redacted", r?.build?.startsWith("79eed440") === true);

  const weird = parseClientErrorBody(JSON.stringify({ message: "x", path: "https://evil.test/x", digest: "a b c" }));
  ok("§2j a non-path is normalised to /", weird?.path === "/", `got ${JSON.stringify(weird?.path)}`);
  ok("§2k a non-id digest is dropped", weird?.digest === null);

  const long = parseClientErrorBody(JSON.stringify({ message: "m".repeat(5_000), stack: "s".repeat(50_000) }));
  ok("§2l the message is capped", (long?.message.length ?? 0) <= 500);
  ok("§2m the stack is capped", (long?.stack?.length ?? 0) <= 2_000);
}

/* ── §3 · the endpoint's own defences ─────────────────────────────────────────────────────── */
console.log("\n§3 · the route trusts nothing");
{
  const route = readCode("src/app/api/client-error/route.ts");
  ok("§3a same-origin only", /sec-fetch-site/.test(route) && /same-origin/.test(route));
  ok("§3b automation is ignored", /isAutomatedAgent/.test(route));
  ok("§3c the body size is capped before reading", /content-length/.test(route));
  ok("§3d it is rate limited", /rateCheckAsync\([^)]*clientError\.ip/.test(route));
  ok("§3e it re-validates and scrubs server-side", /parseClientErrorBody/.test(route));
  // ⛔ A reporting failure must never become an error the page sees.
  ok("§3f 🔴 it always answers 204", /status:\s*204/.test(route) && !/status:\s*(4|5)\d\d/.test(route));
  ok("§3g …and it cannot rethrow", /catch\s*\(/.test(route) && !/throw\b/.test(route));
  ok("§3h the rate rule exists", typeof RATE_RULES["clientError.ip"]?.capacity === "number");
  // ⚠️ Tight on purpose: a render LOOP would beacon on every re-render.
  ok("§3i ⚠️ …and it is tight", (RATE_RULES["clientError.ip"]?.capacity ?? 99) <= 10,
    "a crash loop would otherwise flood the log");
}

/* ── §4 · the boundary actually reports ───────────────────────────────────────────────────── */
console.log("\n§4 · RouteError sends it, and survives its own reload");
{
  const re = readCode("src/components/ui/route-error.tsx");
  ok("§4a it posts to the endpoint", /\/api\/client-error/.test(re));
  ok("§4b it sends the message", /error\?\.message|error\.message/.test(re));
  ok("§4c …and the stack", /error\?\.stack|error\.stack/.test(re));
  ok("§4d …and which build the browser ran", /NEXT_DEPLOYMENT_ID/.test(re));
  // ⭐ THE LOAD-BEARING CHOICE. The recovery effect calls location.reload(); a pending fetch
  // dies with the document, a beacon is specified to outlive unload.
  ok("§4e ⭐ it uses sendBeacon, not fetch alone", /navigator\.sendBeacon\(/.test(re));
  // ⭐ …and it must be QUEUED BEFORE the reload is requested.
  ok("§4f ⭐ the report is declared BEFORE the reload effect",
    re.indexOf("/api/client-error") < re.indexOf("location.reload()"),
    "queued after the reload, the report would be lost exactly when it is most needed");
  ok("§4g the whole thing is wrapped so the error surface cannot throw",
    /try \{[\s\S]*sendBeacon[\s\S]*catch/.test(re));
  ok("§4h ⛔ it does NOT scrub client-side and call it done", !/scrubText/.test(re),
    "a browser-side scrub is advice; the server owns it");

  // 🔴 §4i · THE ROOT BOUNDARY REPORTS TOO. It did not until 2026-09-26, and a crash in the root
  // layout — NavMore's hook-after-return, every soft sign-in/out for three days — was invisible.
  const ge = readCode("src/app/global-error.tsx");
  ok("§4i the ROOT boundary posts to the endpoint", /\/api\/client-error/.test(ge));
  ok("§4j …with the message and the stack", /error\?\.message/.test(ge) && /error\?\.stack/.test(ge));
  ok("§4k …by beacon", /navigator\.sendBeacon\(/.test(ge));
  ok("§4l …wrapped, so the last surface in the product cannot throw", /try \{[\s\S]*sendBeacon[\s\S]*catch/.test(ge));
}

/* ── §5 · what it would have told us about the 2026-09-18 report ──────────────────────────── */
console.log("\n§5 · the report this would have produced");
{
  const r = parseClientErrorBody(JSON.stringify({
    message: "RangeError: Invalid time value",
    stack: "at formatClock (/_next/static/chunks/updown-card.js:1:2226)\nat UpDownCard",
    path: "/updown", digest: null, build: "79eed440",
  }));
  ok("§5a it names the route", r?.path === "/updown");
  ok("§5b it names the throw", r?.message === "RangeError: Invalid time value");
  ok("§5c it names the frame", /formatClock/.test(r?.stack ?? ""));
  ok("§5d ⭐ a client throw legitimately has no digest, and that is recorded", r?.digest === null);
}

/* ── §6 · controls — every matcher above must be able to FAIL ─────────────────────────────── */
console.log("\n§6 · controls");
{
  ok("§6a control · `clean` CATCHES a raw balance", !clean("balance 412500"));
  ok("§6b control · `clean` CATCHES a raw email", !clean("ali@x.com"));
  ok("§6c control · `clean` CATCHES a raw token", !clean("token=abc"));
  ok("§6d control · `clean` PASSES already-redacted text", clean("balance [num] for [email]"));
  ok("§6e control · a fetch-only boundary IS detected", !/navigator\.sendBeacon\(/.test("void fetch('/api/client-error')"));
  ok("§6f control · the ordering test can fail", "reload location.reload() then /api/client-error".indexOf("/api/client-error") > "reload location.reload() then /api/client-error".indexOf("location.reload()"));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 45) { console.error(`!! only ${pass + fail} assertions ran — treating as failure.`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
