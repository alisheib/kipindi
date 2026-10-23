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

import { createServer, globalAgent, type Server } from "node:http";
import { AddressInfo } from "node:net";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

/** Behaviour the fake Postmark should exhibit for the next request. */
type Mode = "ok" | "unauthorized" | "server-error" | "hang" | "garbage" | "inactive" | "invalid" | "gateway" | "dropped";
let mode: Mode = "ok";
let received = 0;
const openSockets: import("node:net").Socket[] = [];

/** Round 6 (M2) · what the fake provider's outbound-message search answers, and the searches it was asked. */
let searchMode: "found" | "absent" | "broken" | "foreign" = "absent";
const searches: string[] = [];
const server: Server = createServer((req, res) => {
  if (req.method === "GET" && String(req.url ?? "").startsWith("/messages/outbound")) {
    searches.push(String(req.url));
    if (searchMode === "broken") {
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ErrorCode: 0, Message: "Internal Server Error" }));
    }
    // Round 8 (M1) · the message the provider returns carries its own metadata: this letter's, or another letter's.
    const asked = new URL(String(req.url), "http://fake").searchParams.get("metadata_letter") ?? "";
    const messages = searchMode === "found" ? [{ MessageID: "m-1", Metadata: { letter: asked } }]
      : searchMode === "foreign" ? [{ MessageID: "m-2", Metadata: { letter: `${asked}-another` } }] : [];
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ TotalCount: messages.length, Messages: messages }));
  }
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
  if (mode === "inactive") {
    res.writeHead(422, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ErrorCode: 406, Message: "You tried to send to a recipient that has been marked as inactive." }));
  }
  if (mode === "invalid") {
    res.writeHead(422, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ErrorCode: 300, Message: "Invalid 'Reply-To' address." }));
  }
  if (mode === "gateway") {
    res.writeHead(502, { "content-type": "text/html" });
    return res.end("<html>bad gateway</html>");
  }
  if (mode === "dropped") {
    // Round 6 (M1) · the reply's headers go out, then the connection drops before its body.
    res.writeHead(200, { "content-type": "application/json" });
    res.flushHeaders();
    setTimeout(() => res.socket?.destroy(), 20);
    return;
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
// ⭐ MASWALI-BUILD S6 (the lane-N review's round 4, M6) · and each says WHAT KIND of failure it is: a reply that refused it is
// `refused` (worth sending again), a 2xx the provider may have taken is `ambiguous` (never sent again). A provider's own 5xx
// is marked as one (round 15): only a money letter reads it as ambiguous.
for (const [label, m, kind] of [["401 dead key", "unauthorized", "refused"], ["500 provider error", "server-error", "refused"], ["200 with garbage body", "garbage", "ambiguous"]] as const) {
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
  ok(`${label}: …and says what kind of failure it is — ${kind}`, r?.failure === kind, String(r?.failure));
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
  ok("…and says it is AMBIGUOUS: the provider may still have it, so a letter is never sent twice (round 4, M6)", r.failure === "ambiguous", String(r.failure));
}

// ── 2b · A refusal that can never clear ────────────────────────────────────────
section("2b · round 4 (M6) · an inactive recipient is a PERMANENT refusal; a delivery carries no failure");
{
  resetEmailHealth();
  mode = "inactive";
  const r = await sendEmail(MAIL);
  ok("an inactive recipient (422, its error code) is a failure that can never clear: permanent", !r.ok && r.reason === "failed" && r.failure === "permanent", String(r.failure));
  // ⭐ Round 5 (MEDIUM 5, LOW 12) · a request the provider refused for a field it can accept once fixed is REFUSED (sent
  // again), never a hard bounce; a gateway's answer is AMBIGUOUS — the provider behind it may have taken the letter.
  mode = "invalid";
  const invalid = await sendEmail(MAIL);
  ok("a request refused for a field the provider rejects (its error code 300) is refused — sent again once fixed, never a hard bounce",
    !invalid.ok && invalid.reason === "failed" && invalid.failure === "refused", String(invalid.failure));
  mode = "gateway";
  const gateway = await sendEmail(MAIL);
  ok("a gateway's 502 is ambiguous: the provider behind it may have the letter, so it is never sent twice",
    !gateway.ok && gateway.reason === "failed" && gateway.failure === "ambiguous", String(gateway.failure));
  // ⭐ Round 6 (M1) · a connection dropped after the reply's headers: the provider answered, so the letter may be there.
  mode = "dropped";
  const dropped = await sendEmail(MAIL);
  ok("a connection dropped after the reply's headers is ambiguous — never refused, never sent twice",
    !dropped.ok && dropped.reason === "failed" && dropped.failure === "ambiguous", String(dropped.failure));
  mode = "ok";
  const good = await sendEmail(MAIL);
  ok("control · a delivery is sent, and carries no failure at all", good.ok && good.reason === "sent" && good.failure === undefined, String(good.failure));
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

// ── 6 · The reset path: a hung provider, and a hit that must look like a miss ──
section("6 · a hung provider must not slow a reset, and a hit must look like a miss");
{
  // 🔴 A2 (route audit 2026-10-06). `requestPasswordReset` AWAITED the send, so against this server a reset for a REAL
  // account took the whole EMAIL_SEND_TIMEOUT_MS (10 s) while an unknown one answered at once - a timing oracle on an
  // unauthenticated endpoint, saying which numbers and addresses have an account. The mail now leaves after the reply.
  resetEmailHealth();
  mode = "hang";
  const { db } = await import("../src/lib/server/store.ts");
  const { requestPasswordReset } = await import("../src/lib/server/password-reset.ts");
  const now = new Date().toISOString();
  await db.user.create({
    id: "usr_c2_reset_timing", phoneE164: "+255799000611",
    passwordHash: "h".repeat(64), passwordSalt: "s".repeat(32),
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE",
    locale: "EN", displayName: "Timing", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, email: "reset.timing@example.tz",
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);

  const before = received;
  const t0 = Date.now();
  const hit = await requestPasswordReset("reset.timing@example.tz");
  const hitMs = Date.now() - t0;
  ok("a reset for a REAL account returns ok", hit.ok === true);
  ok(`…in under 1500ms against a provider that never answers (it took at least ${EMAIL_SEND_TIMEOUT_MS}ms while the send was awaited)`,
    hitMs < 1500, `took ${hitMs}ms`);
  await new Promise((r) => setTimeout(r, 300));
  ok("…and the mail still left: the provider received it", received === before + 1, `received ${received - before}`);

  const t1 = Date.now();
  const miss = await requestPasswordReset("nobody.timing@example.tz");
  const missMs = Date.now() - t1;
  ok("a reset for an UNKNOWN address returns the same ok", miss.ok === true);
  ok("…in under 1500ms too: a hit and a miss answer alike", missMs < 1500, `took ${missMs}ms`);
  await new Promise((r) => setTimeout(r, 300));
  ok("…and nothing was sent for it", received === before + 1, `received ${received - before}`);
}

// ── 6b · Round 6 (M2) · the provider's outbound-message search ────────────────
section("6b · round 6 (M2) · did a letter go? the provider's own search answers found, absent, or unread — never a guess");
{
  // Round 14 · a letter is named to the provider by a one-way digest of its letter (`letterMetadata`), so the search is asked
  // by one: it matches its own letter and refuses another's.
  const q = { to: "player@example.tz", tag: "millionea-win", sinceIso: new Date().toISOString(), letter: "3f9a0c1e5b7d2468ace0f13579bdf024" };
  searchMode = "found";
  const found = await E.findOutboundLetter(q);
  searchMode = "absent";
  const absent = await E.findOutboundLetter(q);
  searchMode = "broken";
  const broken = await E.findOutboundLetter(q);
  const asked = searches.slice(-3);
  ok("the search answers found, then absent, and an unreadable search is null — never taken for either",
    found === "found" && absent === "absent" && broken === null, JSON.stringify({ found, absent, broken }));
  ok("…and it asks by the letter's recipient and tag", asked.length === 3 && asked.every((u) => /recipient=player%40example\.tz/i.test(u) && /tag=millionea-win/i.test(u)),
    asked.join(" | "));
  ok("…and by THIS letter's own metadata, between the day before its attempt and two days after (round 8, M1)",
    asked.every((u) => /metadata_letter=3f9a0c1e5b7d2468ace0f13579bdf024(?:&|$)/i.test(u) && /fromdate=/i.test(u) && /todate=/i.test(u)), asked.join(" | "));
  searchMode = "foreign";
  const foreign = await E.findOutboundLetter(q);
  ok("⭐ round 8 (M1) · a message the provider returns for ANOTHER letter is not this letter's: absent, never confirmed", foreign === "absent", String(foreign));
  const askedBefore = searches.length;
  const none = await E.findOutboundLetter({ ...q, to: "" });
  const noLetter = await E.findOutboundLetter({ ...q, letter: "" });
  ok("control · a search with no recipient, or no letter to ask for, asks the provider nothing and answers null",
    none === null && noLetter === null && searches.length === askedBefore, `${String(none)} ${String(noLetter)}`);
  searchMode = "absent";
}

for (const s of openSockets) s.destroy();
await new Promise<void>((r) => server.close(() => r()));

// ── 7 · Round 5 (MEDIUM 5) · a request that never left ────────────────────────
section("7 · round 5 (MEDIUM 5) · with the provider's address refusing every connection, a letter is REFUSED — it never left");
{
  // S6-INT 14 · Node keeps HTTP sockets alive by default (since 19): the client would reuse a socket the server above
  // destroyed, and a reused socket's reset is rightly AMBIGUOUS (a request may have gone). This section asks about a
  // connection REFUSED, so it starts with no pooled socket — every request opens a fresh connection to the closed port.
  globalAgent.destroy();
  resetEmailHealth();
  const before = received;
  const r = await sendEmail(MAIL);
  ok("a refused connection is a failure the next run sends again — the letter provably never left", !r.ok && r.reason === "failed" && r.failure === "refused" && received === before,
    `${String(r.failure)} · requests ${received - before}`);
}

console.log(`\ncert-c2 (delivery resilience): ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
process.exit(0);
