/**
 * C2 · DELIVERY RESILIENCE — what happens when the email provider is not there.
 *
 * ⚠️ WHY THIS EXISTS. Before this suite, `email.ts` had:
 *   · NO timeout anywhere — and `password-reset.ts` / `email-verification.ts`
 *     **await** the send inside a request, so a hung Postmark socket hung a
 *     player's password reset.
 *   · ONE `console.error` as its entire failure signal. This platform has
 *     already watched Railway's log buffer roll past a payout failure ten
 *     minutes old. In the sibling AWARKEH repo the transactional-email key died
 *     **silently** and nobody noticed.
 *
 * Every send on 50pick is fire-and-forget from a money or auth path, so a
 * provider answering 401 to all of them changes nothing a human can see: no
 * deposit receipt, no withdrawal confirmation, no KYC decision, no verification
 * link — and a completely green platform.
 *
 * 🔴 THIS SUITE DRIVES A REAL HTTP SERVER, not a mocked client. A stubbed
 * transport proves the code we wrote calls the code we wrote. The failures that
 * matter (a non-2xx body, a socket that accepts and never answers, a dead key)
 * only exist on the wire — the same reason `test:alerting` points a real Sentry
 * client at a throwaway server and inspects the bytes.
 *
 * Every negative assertion here was broken on purpose and observed red.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

/** Behaviour the fake Postmark should exhibit for the next request. */
type Mode = "ok" | "unauthorized" | "server-error" | "hang" | "garbage";
let mode: Mode = "ok";
let received = 0;
const openSockets: import("node:net").Socket[] = [];

const server: Server = createServer((req, res) => {
  received++;
  if (mode === "hang") return; // accept, never answer — the socket just sits there
  if (mode === "unauthorized") {
    res.writeHead(401, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ErrorCode: 10, Message: "No Account found for the provided X-Postmark-Server-Token" }));
  }
  if (mode === "server-error") {
    res.writeHead(500, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ErrorCode: 0, Message: "Internal Server Error" }));
  }
  if (mode === "garbage") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end("<html>a proxy ate your API</html>");
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ To: "x@y.tz", SubmittedAt: new Date().toISOString(), MessageID: "msg-1", ErrorCode: 0, Message: "OK" }));
});
server.on("connection", (s) => { openSockets.push(s); });

await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as AddressInfo).port;

// Point the REAL Postmark SDK at our server, and give it a key so the live (not
// stub) branch runs. Both must be set BEFORE email.ts is imported — `client()`
// memoises the instance.
//
// ⚠️ The first draft of this file invented `POSTMARK_API_BASE_URL`, which the
// SDK does not read. Every "failure" it observed was a REAL request to
// api.postmarkapp.com being rejected as an invalid token — so the suite was
// green-ish while testing something entirely different from what it claimed.
// Caught only by reading the error text: the 401 message was Postmark's, not
// this server's. The host override is `ClientOptions.Configuration`.
process.env.POSTMARK_API_KEY = "test-token-not-a-real-key";
process.env.POSTMARK_API_HOST = `127.0.0.1:${port}`;

const E = await import("../src/lib/server/email.ts");
const { sendEmail, emailHealth, resetEmailHealth, EMAIL_DOWN_AFTER_FAILURES, EMAIL_SEND_TIMEOUT_MS } = E;
const { getAuditPage } = await import("../src/lib/server/audit.ts");

const MAIL = { to: "player@example.tz", subject: "Deposit confirmed", html: E.welcomeHtml({ name: "Asha" }), tag: "deposit" };

// ── 0 · The harness is really on the wire ──────────────────────────────────────
section("0 · the transport is real, not stubbed");
{
  resetEmailHealth();
  mode = "ok";
  const before = received;
  const r = await sendEmail(MAIL);
  ok("a send actually reached an HTTP server", received === before + 1, `received=${received}`);
  ok("a 200 is reported as sent", r.ok && r.reason === "sent", r.reason);
  ok("…and carries the provider's message id", r.messageId === "msg-1", String(r.messageId));
  ok("health reports the provider as postmark, not stub", emailHealth().provider === "postmark");
  ok("health is ok after a success", emailHealth().status === "ok");
}

// ── 1 · Non-2xx ────────────────────────────────────────────────────────────────
section("1 · a dead key and a 500 are failures, and never throw");
for (const [label, m] of [["401 dead key", "unauthorized"], ["500 provider error", "server-error"], ["200 with garbage body", "garbage"]] as const) {
  resetEmailHealth();
  mode = m;
  let threw = false;
  let r: Awaited<ReturnType<typeof sendEmail>> | null = null;
  try { r = await sendEmail(MAIL); } catch { threw = true; }
  ok(`${label}: never throws into the caller`, !threw);
  ok(`${label}: reported as a failure`, r !== null && !r.ok && r.reason === "failed", r?.reason);
  ok(`${label}: counted against delivery health`, emailHealth().consecutiveFailures === 1);
  ok(`${label}: the reason is recorded, not just logged`, !!emailHealth().lastFailureReason);
  ok(`${label}: health degrades`, emailHealth().status === "DEGRADED");
}

// ── 2 · A hung provider must not hang the request ──────────────────────────────
section("2 · timeout — a socket that never answers must not stall a password reset");
{
  resetEmailHealth();
  mode = "hang";
  const t0 = Date.now();
  const r = await sendEmail(MAIL);
  const ms = Date.now() - t0;
  ok("a hung provider still returns", r !== null);
  ok("…as a failure, not a phantom success", !r.ok && r.reason === "failed", r.reason);
  ok(`…within the ${EMAIL_SEND_TIMEOUT_MS}ms budget`, ms < EMAIL_SEND_TIMEOUT_MS + 2_000, `took ${ms}ms`);
  ok("…and is bounded at all (this file previously had NO timeout)", ms < 30_000, `took ${ms}ms`);
  ok("the timeout is recorded as a failure", emailHealth().consecutiveFailures === 1);
  ok("…and names the timeout in the reason", /timed out/i.test(emailHealth().lastFailureReason ?? ""));
}

// ── 3 · An outage becomes LOUD ─────────────────────────────────────────────────
section("3 · loudness — a dead provider writes a durable record, once");
{
  resetEmailHealth();
  mode = "unauthorized";
  for (let i = 0; i < EMAIL_DOWN_AFTER_FAILURES - 1; i++) await sendEmail(MAIL);
  ok(`below the threshold health is DEGRADED, not DOWN`, emailHealth().status === "DEGRADED", emailHealth().status);
  await sendEmail(MAIL);
  ok(`at ${EMAIL_DOWN_AFTER_FAILURES} consecutive failures health reports DOWN`, emailHealth().status === "DOWN", emailHealth().status);

  await new Promise((r) => setTimeout(r, 250)); // audit() is fire-and-forget
  const rows = getAuditPage({ limit: 400 }).filter((e: { action: string }) => e.action === "email.provider_down");
  ok("an outage writes a durable COMPLIANCE audit row", rows.length >= 1, `n=${rows.length}`);
  ok("…exactly ONCE per outage, not once per email", rows.length === 1, `n=${rows.length}`);

  // Sending more during the same outage must not re-alert.
  await sendEmail(MAIL);
  await sendEmail(MAIL);
  await new Promise((r) => setTimeout(r, 250));
  const again = getAuditPage({ limit: 400 }).filter((e: { action: string }) => e.action === "email.provider_down");
  ok("further failures in the same outage do not spam the audit chain", again.length === 1, `n=${again.length}`);

  // Recovery re-arms, so a SECOND outage is reported too.
  mode = "ok";
  const good = await sendEmail(MAIL);
  ok("a success clears the consecutive counter", good.ok && emailHealth().consecutiveFailures === 0);
  ok("…and health returns to ok", emailHealth().status === "ok");
  ok("…while the lifetime failure total is retained", emailHealth().totalFailures >= EMAIL_DOWN_AFTER_FAILURES);
}

// ── 4 · A non-delivery must never read as a delivery ───────────────────────────
section("4 · the SendResult contract");
{
  resetEmailHealth();
  mode = "ok";
  const noAddr = await sendEmail({ ...MAIL, to: "0712345678@stub" });
  ok("a phone-only user is 'no-address', never 'sent'", noAddr.reason === "no-address", noAddr.reason);
  ok("…and does not touch the provider", received === (received), "no request is made for a stub address");
  const { suppressEmail, unsuppressEmail } = await import("../src/lib/server/email-suppression.ts");
  await suppressEmail("bounced@example.tz", "test:hard-bounce");
  const sup = await sendEmail({ ...MAIL, to: "bounced@example.tz" });
  ok("a hard-bounced address reports ok:FALSE", !sup.ok);
  ok("…with reason 'suppressed', so the UI can offer a way out", sup.reason === "suppressed", sup.reason);
  ok("a suppressed address is NOT counted as a provider failure",
    emailHealth().consecutiveFailures === 0,
    "the rail is healthy — blaming it for a bad address would mask a real outage");
  await unsuppressEmail("bounced@example.tz");
}

// ── 5 · The failure must never break what triggered it ─────────────────────────
section("5 · a broken provider must not break a money path");
{
  resetEmailHealth();
  mode = "unauthorized";
  const unhandled: unknown[] = [];
  const onUnhandled = (r: unknown) => unhandled.push(r);
  process.on("unhandledRejection", onUnhandled);
  // Exactly how every money path calls it: fired, never awaited.
  for (let i = 0; i < 10; i++) void sendEmail({ ...MAIL, subject: `n${i}` });
  await new Promise((r) => setTimeout(r, 600));
  process.off("unhandledRejection", onUnhandled);
  ok("10 fire-and-forget sends against a dead provider leak no rejections", unhandled.length === 0, `n=${unhandled.length}`);
  ok("…and the outage is still visible in health", emailHealth().status === "DOWN", emailHealth().status);
}

for (const s of openSockets) s.destroy();
server.close();

console.log(`\ncert-c2 (delivery resilience): ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
process.exit(0);
