/**
 * MONITORING — a production exception must SURVIVE, and must not carry player PII.
 *
 * 🔴 THE GAP THIS ENCODES. Until 2026-07-30 the only record of a server error was the
 * `[snag]` console block. That reads well and is greppable — and it is not a record.
 * Hunting a payout failure roughly ten minutes old that day, Railway's log buffer had
 * already rolled past it. "A silent 500 could run for days" was never about missing
 * logs; it was about nothing surviving to be found.
 *
 * So errors now also land in the audit chain: on-box, DB-backed, hash-chained,
 * queryable. Which immediately creates the second obligation — an error message or a
 * stack can contain a phone number, a NIDA id, or an email, and the audit chain is
 * exactly the place you cannot un-write them from.
 *
 * These are BEHAVIOURAL. The scrubber is driven with real strings, because a PII
 * control that is only asserted structurally is a promise rather than a control.
 */
import { scrubForAudit } from "../src/lib/server/monitoring.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

console.log("\n── 1 · MSISDNs are redacted in every accepted form ─────────────");

// The platform accepts all of these (toSelcomMsisdn normalises them), so an error
// message can carry any one of them.
for (const n of ["255757619808", "+255757619808", "0757619808"]) {
  const out = scrubForAudit(`withdraw failed for ${n}`);
  ok(`"${n}" is redacted`, !out.includes(n) && out.includes("<msisdn>"), out);
}
ok("a number inside a longer sentence is still caught",
  !scrubForAudit("payee=255757619808 amount=4925").includes("255757619808"));
ok("multiple numbers in one string are all caught",
  (scrubForAudit("from 0757619808 to 255712345678").match(/<msisdn>/g) ?? []).length === 2);

console.log("\n── 2 · Long identifiers and emails ─────────────────────────────");

ok("a 12+ digit identifier (NIDA-shaped) is redacted",
  scrubForAudit("nida=19900101123456789").includes("<digits>"));
ok("an email is redacted",
  !scrubForAudit("user jaykaba.mbet@gmail.com failed").includes("jaykaba.mbet@gmail.com"));
ok("an email with a plus tag is redacted",
  !scrubForAudit("ali.sheib+ops@50pick.tz").includes("ali.sheib+ops@50pick.tz"));

console.log("\n── 3 · It must not destroy the diagnostic value ────────────────");

// Over-scrubbing is its own failure: a stack with every number stripped is unusable.
const stack = "Error: boom\n    at dispatchWithdrawal (/app/src/lib/server/payments.ts:335:12)";
ok("file paths survive", scrubForAudit(stack).includes("payments.ts"));
ok("line:col survives", scrubForAudit(stack).includes("335:12"));
ok("the error text survives", scrubForAudit(stack).includes("Error: boom"));
ok("short numbers survive (amounts, codes, HTTP status)",
  scrubForAudit("resultcode=010 amount=4925 HTTP 200") === "resultcode=010 amount=4925 HTTP 200",
  "010 and 4925 are the whole diagnosis — redacting them would defeat the purpose");
ok("a transid survives",
  scrubForAudit("transid=wdr_4b7ee5dd2616b62d6c38").includes("wdr_4b7ee5dd2616b62d6c38"),
  "the transid is what Selcom looks the failure up by");

console.log("\n── 4 · Degenerate input cannot throw ───────────────────────────");

ok("empty string", scrubForAudit("") === "");
ok("no PII passes through unchanged", scrubForAudit("plain failure") === "plain failure");

console.log("\n── 5 · The wiring is real, not just present ────────────────────");

import { readFileSync } from "node:fs";
const mon = readFileSync(new URL("../src/lib/server/monitoring.ts", import.meta.url), "utf8");
const instr = readFileSync(new URL("../src/instrumentation.ts", import.meta.url), "utf8");

ok("onRequestError forwards to captureServerError",
  instr.includes("captureServerError"),
  "the hook is the only place uncaught server errors surface");
ok("the audit sink is always on, not gated behind SENTRY_DSN",
  /persistServerError/.test(mon) && !/if \(!?\s*process\.env\.SENTRY_DSN\s*\)[\s\S]{0,80}persistServerError/.test(mon),
  "gating durability behind a DSN we do not have would change nothing");
ok("both sinks are independent (one failing cannot suppress the other)",
  mon.includes("Promise.allSettled"));
ok("persisting is best-effort and cannot break a request",
  /persistServerError\(err, context\)\.catch\(/.test(mon));
ok("errors are deduped by fingerprint, not written per request",
  /DEDUPE_WINDOW_MS/.test(mon) && /fingerprint\(/.test(mon),
  "a flapping route would otherwise bury the audit chain");
ok("suppressed repeats are reported, not silently dropped",
  mon.includes("repeatsSuppressed"),
  "the storm count is the signal — losing it makes dedupe a cover-up");
ok("the dedupe map is bounded",
  /seen\.size > \d+/.test(mon) && /seen\.delete\(/.test(mon),
  "an unbounded map in a long-lived process is a leak");
ok("the stack is persisted (truncated), not dropped",
  /stack: e\?\.stack \? scrubForAudit/.test(mon),
  "an error record without a stack is an alert, not a diagnosis");

console.log(`\n${"─".repeat(64)}\n  MONITORING: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
process.exit(fail === 0 ? 0 : 1);
