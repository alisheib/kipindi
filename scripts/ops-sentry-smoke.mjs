/**
 * Prove the alerting path end to end against the REAL Sentry project.
 *
 * `test:alerting` already proves the mechanics offline: a real @sentry/node client, a real
 * `captureServerError`, and a throwaway HTTP server that inspects the envelope. What it
 * cannot prove is that the DSN configured on production is correct, that Sentry accepts our
 * events, and — the part worth checking with your own eyes — what Sentry actually STORES.
 *
 * So this pushes one deliberately-labelled error, with a phone number, an email and a NIDA
 * planted in the message, the stack and the context, through the same `captureServerError`
 * the app uses. Then go and read the issue back with `--verify` and confirm none of the
 * three identifiers is in it.
 *
 *   SENTRY_DSN=<prod dsn> node scripts/ops-sentry-smoke.mjs
 *   SENTRY_TOKEN=<user auth token> node scripts/ops-sentry-smoke.mjs --verify
 *
 * ⚠️ It creates a real issue in the project, titled so it is obviously a drill. Resolve it
 * afterwards. Sending nothing and assuming the wiring is fine is the alternative, and that
 * is how a monitoring seam sits broken for months.
 */
process.env.USE_PRISMA_DAL = "false";

const MSISDN = "+255757619808";
const EMAIL = "smoke.test@example.co.tz";
const NIDA = "19900101141150000123";
const MARKER = "50PICK ALERTING SMOKE TEST";

if (process.argv.includes("--verify")) {
  const token = process.env.SENTRY_TOKEN;
  if (!token) { console.error("SENTRY_TOKEN required for --verify"); process.exit(1); }
  const API = "https://de.sentry.io/api/0";
  const h = { authorization: `Bearer ${token}` };
  const issues = await fetch(`${API}/projects/50pick/50pick-server/issues/?query=${encodeURIComponent(MARKER)}`, { headers: h }).then((r) => r.json());
  if (!Array.isArray(issues) || !issues.length) {
    console.error("\n🔴 NO ISSUE FOUND. The event did not reach Sentry — the DSN or the transport is wrong.\n");
    process.exit(2);
  }
  const issue = issues[0];
  console.log(`\nissue    ${issue.shortId}  "${issue.title}"`);
  console.log(`events   ${issue.count}   first seen ${issue.firstSeen}`);

  const ev = await fetch(`${API}/issues/${issue.id}/events/latest/`, { headers: h }).then((r) => r.json());
  const blob = JSON.stringify(ev);
  console.log(`stored event is ${blob.length} bytes\n`);

  let bad = 0;
  for (const [label, needle] of [["MSISDN", MSISDN], ["MSISDN (bare)", "255757619808"], ["email", EMAIL], ["NIDA", NIDA]]) {
    const found = blob.includes(needle);
    if (found) bad++;
    console.log(`  ${found ? "🔴 FOUND" : "ok  absent"}  ${label}`);
  }
  const redacted = ["<msisdn>", "<email>", "<digits>"].filter((m) => blob.includes(m));
  console.log(`  redaction markers present: ${redacted.join(", ") || "(none)"}`);

  if (bad) { console.error("\n🔴 PLAYER DATA IS STORED IN SENTRY. The scrubber is not working on the live path.\n"); process.exit(3); }
  if (!redacted.length) { console.error("\n⚠️  No redaction markers either — the text may simply not have arrived. Inspect by hand.\n"); process.exit(4); }
  console.log("\n✅ the event arrived, and carries none of the three identifiers.\n");
  process.exit(0);
}

if (!process.env.SENTRY_DSN) { console.error("SENTRY_DSN required"); process.exit(1); }
const { captureServerError, flushMonitoring, isMonitoringEnabled } = await import("../src/lib/server/monitoring.ts");
console.log("monitoring enabled:", isMonitoringEnabled());

const err = new Error(`${MARKER} — payout failed for ${MSISDN} (${EMAIL}) nida=${NIDA}`);
err.stack = `Error: ${MARKER} — payout failed for ${MSISDN} (${EMAIL}) nida=${NIDA}\n` +
  `    at dispatchWithdrawal (/app/src/lib/server/payments.ts:412:9)\n` +
  `    at settle (/app/src/lib/server/lifecycle.ts:88:5)`;

await captureServerError(err, { routePath: "/ops/sentry-smoke", method: "POST", playerPhone: MSISDN, playerEmail: EMAIL });
const flushed = await flushMonitoring(8000);
console.log("flushed:", flushed);
console.log("\nNow verify what Sentry STORED:\n  SENTRY_TOKEN=<token> node scripts/ops-sentry-smoke.mjs --verify\n");
