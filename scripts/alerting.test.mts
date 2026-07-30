/**
 * ALERTING — prove an error actually LEAVES the process, and prove what it carries.
 *
 * 🔴 WHY THIS IS NOT PART OF test:monitoring. That suite proves errors survive ON BOX: a
 * scrubbed row in the audit chain. This one proves the other half — that something tells
 * you — and it is the half that ships a licensed operator's data to a third party. The two
 * obligations point in opposite directions and deserve separate gates.
 *
 * 🔴 WHAT THIS CAUGHT. `captureServerError` handed the RAW error to `captureException`
 * while only the audit sink ran `scrubForAudit`. The scrubber sat one line above the call
 * that ships data off-box and was not applied to it. Nobody had noticed because no DSN was
 * ever set — the bug was dormant, waiting for the day someone turned alerting on. On a
 * platform whose errors read "no wallet for +2557…", the first alert would have exported
 * a player's phone number out of Tanzania.
 *
 * HOW IT IS PROVEN. Not by reading the source. A real `@sentry/node` client is pointed at
 * a throwaway HTTP server on 127.0.0.1, a real error is pushed through the real
 * `captureServerError`, and the bytes that arrive are searched for planted identifiers.
 * If the envelope never arrives the gate fails — "no PII was sent" is trivially true of a
 * transport that sends nothing, and that is the exact shape of a lying gate.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

// Real values of the three shapes this platform actually holds. Planted in the places an
// exception carries text: the message, the stack, and the structured context.
const MSISDN = "+255757619808";
const EMAIL = "mwajuma.hassan@example.co.tz";
const NIDA = "19900101141150000123";

/** A throwaway Sentry ingest endpoint. Returns the raw bodies it received. */
async function captureEnvelopes(): Promise<{
  url: (projectId: string) => string;
  bodies: string[];
  close: () => Promise<void>;
}> {
  const bodies: string[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      bodies.push(Buffer.concat(chunks).toString("utf8"));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "0".repeat(32) }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return {
    url: (projectId) => `http://publickey@127.0.0.1:${port}/${projectId}`,
    bodies,
    close: () => new Promise<void>((r) => { server.close(() => r()); }),
  };
}

console.log("\n── 1 · The SDK is installed and the seam can load it ────────────");

let sdkResolved = false;
try {
  await import("@sentry/node");
  sdkResolved = true;
} catch { /* reported below */ }
ok("@sentry/node resolves", sdkResolved,
  "monitoring.ts imports it through a computed specifier, so the BUILD never needed it — " +
  "which is also why nobody would notice it missing until an incident");

console.log("\n── 2 · A real error reaches a real transport ───────────────────");

const sink = await captureEnvelopes();
process.env.SENTRY_DSN = sink.url("1");
process.env.SENTRY_ENVIRONMENT = "test";
// No DB in this gate; the audit sink logs its failure and must not stop the Sentry sink.
delete process.env.DATABASE_URL;

const { captureServerError, flushMonitoring, isMonitoringEnabled, scrubEvent, scrubForAudit } =
  await import("../src/lib/server/monitoring.ts");

ok("monitoring reports itself enabled once a DSN is set", isMonitoringEnabled());

const err = new Error(`payout failed for ${MSISDN} (${EMAIL}) nida=${NIDA}`);
err.stack = `Error: payout failed for ${MSISDN} (${EMAIL}) nida=${NIDA}\n` +
  `    at dispatchWithdrawal (/app/src/lib/server/payments.ts:412:9)\n` +
  `    at settle (/app/src/lib/server/lifecycle.ts:88:5)`;

await captureServerError(err, {
  routePath: "/api/withdrawals",
  method: "POST",
  // Structured context is shipped as `extra` and is just as capable of carrying PII.
  playerPhone: MSISDN,
  playerEmail: EMAIL,
});
await flushMonitoring(6000);
// The transport is HTTP; give a slow loopback a moment to deliver the last write.
await new Promise((r) => setTimeout(r, 400));

const received = sink.bodies.join("\n");
ok("🔴 an envelope actually ARRIVED at the transport", sink.bodies.length > 0,
  `${sink.bodies.length} request(s), ${received.length} bytes — "no PII was sent" is ` +
  `trivially true of a transport that sends nothing`);
ok("it carries the error that was raised", /payout failed/.test(received));
ok("it carries the stack frames", /dispatchWithdrawal/.test(received),
  "an alert without a stack is a notification, not a diagnosis");
ok("it is tagged with the route", /api\/withdrawals/.test(received));

console.log("\n── 3 · …and it carries NO player identifier ────────────────────");

ok("🔴 no MSISDN left the process", !received.includes(MSISDN) && !received.includes("255757619808"),
  received.includes("255757619808") ? "FOUND A PHONE NUMBER IN THE ENVELOPE" : "redacted");
ok("🔴 no email left the process", !received.includes(EMAIL));
ok("🔴 no NIDA left the process", !received.includes(NIDA));
ok("the redaction markers are present, so it was scrubbed and not merely absent",
  /<msisdn>|<email>|<digits>/.test(received),
  "if the text vanished entirely, the transport dropped it and this gate proves nothing");

await sink.close();

console.log("\n── 4 · The scrubber walks the WHOLE event, not a field list ─────");

// Sentry carries strings in places an allowlist forgets: framed local variables,
// breadcrumb data, request bodies. Driven, not asserted about.
const nested = scrubEvent({
  message: `contact ${MSISDN}`,
  exception: { values: [{ value: `bad email ${EMAIL}`, stacktrace: { frames: [{ vars: { nida: NIDA } }] } }] },
  breadcrumbs: [{ data: { url: `/u/${MSISDN}` } }],
  extra: { deep: { deeper: [`${EMAIL}`] } },
}) as Record<string, unknown>;
const flat = JSON.stringify(nested);
ok("a nested exception value is scrubbed", !flat.includes(EMAIL));
ok("a framed local variable is scrubbed", !flat.includes(NIDA));
ok("a breadcrumb URL is scrubbed", !flat.includes(MSISDN));
ok("an array deep in `extra` is scrubbed", (flat.match(/<email>/g) ?? []).length >= 2);
ok("non-string values survive intact", scrubEvent({ n: 42, b: true, z: null }).n === 42,
  "a scrubber that mangles timestamps or ids breaks the event it is protecting");

// A cycle inside an error handler must not blow the stack.
const cyclic: Record<string, unknown> = { phone: MSISDN };
cyclic.self = cyclic;
let survivedCycle = true;
try { scrubEvent(cyclic); } catch { survivedCycle = false; }
ok("🔴 a cyclic event does not blow the stack", survivedCycle,
  "Sentry events reference their own scope; recursing forever inside the error path " +
  "would turn one 500 into a dead container");

console.log("\n── 5 · The scrubber is ONE definition, used by both sinks ───────");

const mon = (await import("node:fs")).readFileSync(
  new URL("../src/lib/server/monitoring.ts", import.meta.url), "utf8");
ok("the audit sink scrubs", /scrubForAudit\(message\)/.test(mon));
ok("🔴 the OFF-BOX sink scrubs too", /beforeSend: \(event: unknown\) => scrubEvent\(event\)/.test(mon),
  "this is the line whose absence would have exported a player's phone number");
ok("transactions are scrubbed as well as errors", /beforeSendTransaction/.test(mon));
ok("scrubEvent is built on scrubForAudit, not a second copy of the rules",
  /return scrubForAudit\(value\) as unknown as T/.test(mon),
  "two redaction lists drift, and the one that drifts is the one nobody drives");
ok("breadcrumbs are off by default", /maxBreadcrumbs: Number\(process\.env\.SENTRY_MAX_BREADCRUMBS \?\? 0\)/.test(mon),
  "console breadcrumbs on this platform routinely carry MSISDNs");
ok("scrubForAudit still redacts the three shapes",
  scrubForAudit(`${MSISDN} ${EMAIL} ${NIDA}`) === "<msisdn> <email> <digits>",
  scrubForAudit(`${MSISDN} ${EMAIL} ${NIDA}`));

console.log("\n── 6 · An operator can SEE whether anyone is paged ──────────────");

// Before this, the only way to answer "is alerting on?" was to read Railway's variable
// list. "Durable" and "alerting" are different promises and the difference is the whole
// point — an operator who believes errors reach a human, when they only reach a table,
// will not go and look.
const fsMod = await import("node:fs");
const health = fsMod.readFileSync(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8");
ok("/api/health reports whether alerting is armed",
  /alerting: isMonitoringEnabled\(\)/.test(health));
ok("…and says errors are durable regardless", /durable: true/.test(health),
  "the on-box record is unconditional; only the paging depends on a DSN");

const page = fsMod.readFileSync(
  new URL("../src/app/admin/compliance/page.tsx", import.meta.url), "utf8");
ok("the compliance page reads it live", /const alerting = isMonitoringEnabled\(\)/.test(page));
ok("🔴 the card distinguishes durable from alerting",
  page.includes("Durable — but nobody is paged") && page.includes("Durable and alerting"),
  "one word apart, and only one of them means somebody finds out");
ok("it does not claim monitoring while the DSN is unset",
  !/Errors are monitored/i.test(page),
  "the hardcoded backup tick this page used to carry was exactly this mistake");

console.log(`\n${"─".repeat(64)}\n  ALERTING: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
process.exit(fail === 0 ? 0 : 1);
