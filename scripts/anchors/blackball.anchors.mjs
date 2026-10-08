/**
 * Anchors for red:blackball — each reintroduces, on the real file, a defect the Blackball
 * transport was written to avoid. DATA, so `test:red-anchors` §3 can audit that every `from`
 * still resolves exactly once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines in `sms-blackball.ts` must be paired
 * with re-anchoring here, or the harness reports ANCHOR FAIL — loudly, by design.
 *
 * ⭐ EVERY `expect` IS THE EXACT LABEL THE GATE MUST PRINT AS `FAIL`. Matching on the label and
 * not merely on a non-zero exit is what stops a defect caught for the WRONG reason from counting
 * as caught — the harness would otherwise print PASS for a suite that collapsed for an unrelated
 * reason, which is the failure mode this whole fleet exists to prevent.
 */
export const MUTATIONS = [
  {
    // 🔴 THE HEADLINE DEFECT. Every other vendor in this repo answers a refusal with a status
    // that MEANS refusal, so `if (!res.ok) throw` is the house reflex. Blackball returns HTTP
    // 400 for "Invalid credentials" — measured 2026-09-16 — so the reflex converts a nameable
    // credential failure into an opaque transport error and discards the one string that says
    // what went wrong. This is the mutation that must never pass.
    // ⚠️ RE-ANCHORED 2026-10-07 (U43b-1). The return line this quoted now parses a body read INSIDE a
    // try (F2), so the throw is planted just above the comment that introduces the read — the same
    // seam: the verdict taken from `res.ok` before the body is ever read. Its `expect` is unchanged.
    name: "sms-blackball.ts — the verdict goes back to res.ok instead of the status boolean",
    file: "src/lib/server/sms-blackball.ts",
    from: `    // Read as TEXT then parse, like \`selcomFetch\`: a non-JSON reply is exactly the
    // case where the raw shape is the evidence, and \`res.json()\` would throw it away.`,
    to: `    if (!res.ok) throw new Error(\`blackball sms failed: \${res.status}\`);
    // Read as TEXT then parse, like \`selcomFetch\`: a non-JSON reply is exactly the
    // case where the raw shape is the evidence, and \`res.json()\` would throw it away.`,
    expect: `§3 an HTTP 400 auth refusal does NOT throw`,
  },
  {
    // ⛔ U43b-1 · E3 · F2 (R-BB1) — THE SEND'S BODY READ MOVED BACK OUTSIDE THE TRY. A reply whose body
    // dies mid-read throws out of the adapter again, into sendBatch's chunk catch, which writes the row
    // FAILED — terminal, so a late receipt is discarded — for a batch the gateway had whole; and FAILED
    // invites a retry, a second SMS at a second charge.
    name: "sms-blackball.ts — the send's body read moved back outside the try (a body that dies mid-read throws)",
    file: "src/lib/server/sms-blackball.ts",
    from: `    // lost reply, never a refusal (see \`replyBodyUnreadable\`).
    let raw: string;
    try {
      raw = await res.text();
    } catch (err) {
      return replyBodyUnreadable(res.status, err);
    }`,
    to: `    // lost reply, never a refusal (see \`replyBodyUnreadable\`).
    const raw = await res.text();`,
    expect: `§13 ⛔ U43b-1 · a send reply whose body dies mid-read does NOT throw: ambiguous, transport set, the status line kept`,
  },
  {
    // The same for the balance read (R-BB1b): its body read outside the try throws instead of
    // coming back as a transport that `sms.ts` reads as unreachable.
    name: "sms-blackball.ts — the balance's body read moved back outside the try",
    file: "src/lib/server/sms-blackball.ts",
    from: `    // dies mid-read is \`unreachable\` to \`sms.ts\`, never a throw.
    let raw: string;
    try {
      raw = await res.text();
    } catch (err) {
      return replyBodyUnreadable(res.status, err);
    }`,
    to: `    // dies mid-read is \`unreachable\` to \`sms.ts\`, never a throw.
    const raw = await res.text();`,
    expect: `§13 ⛔ the balance read is the same: a body that dies mid-read does NOT throw, it comes back as a transport (unreachable to sms.ts)`,
  },
  {
    // The PDF types `data` as an Object. The gateway sends an ARRAY on the commonest failure it
    // produces. A parser that believes the document indexes an array by field name and silently
    // finds nothing — so a validation complaint arrives with no complaint in it.
    name: "sms-blackball.ts — readFieldErrors believes the PDF and takes only an object",
    file: "src/lib/server/sms-blackball.ts",
    from: `  if (Array.isArray(data)) for (const e of data) absorb(e);
  else absorb(data);`,
    to: `  absorb(data);`,
    expect: `§4 data as an ARRAY flattens to per-field complaints`,
  },
  {
    // The parser must report `balance` faithfully on every reply, refused ones included. Which
    // readings to TRUST is decided in sms.ts (accepted replies only — a refusal's 0.0 is decided
    // before authentication); a parser that dropped the field would hide that evidence entirely.
    name: "sms-blackball.ts — balance is only read when the gateway said yes",
    file: "src/lib/server/sms-blackball.ts",
    from: `    balance: typeof o.balance === "number" && Number.isFinite(o.balance) ? o.balance : null,`,
    to: `    balance: o.status === true && typeof o.balance === "number" ? o.balance : null,`,
    expect: `§6 balance is read off a FAILED reply`,
  },
  {
    // 🔴 THE FORMAT THE TWO RAILS DISAGREED ON. `sms.ts` posted the stored `+255…` straight
    // through while the payments rail normalised to `255…`. The gateway does not validate the
    // msisdn at all — "notaphone" passes its schema — so nothing downstream would ever complain.
    name: "sms-blackball.ts — the stored E.164 goes on the wire unnormalised",
    file: "src/lib/server/sms-blackball.ts",
    from: `      msisdn: toMsisdn255(m.msisdn),`,
    to: `      msisdn: m.msisdn,`,
    expect: `§1 E.164 +255… is normalised to a bare 255…`,
  },
  {
    // A reference below 20 characters is refused by the gateway, so the send fails — but the
    // local guard is what makes that a condition a test can pin rather than a production
    // surprise. Without it the batch leaves, the gateway refuses it, and the reason is a field
    // complaint about a value we minted ourselves.
    name: "sms-blackball.ts — the reference floor stops being checked before the call",
    file: "src/lib/server/sms-blackball.ts",
    from: `    if (m.reference.length < REFERENCE_MIN_CHARS) {`,
    to: `    if (false && m.reference.length < REFERENCE_MIN_CHARS) {`,
    expect: `§2 a reference under the 20-char floor is refused BEFORE the network call`,
  },
  {
    // The batch ceiling is the vendor's, not ours. Exceeding it silently is how a 200-recipient
    // campaign becomes one refused request instead of four accepted ones.
    name: "sms-blackball.ts — the 50-message ceiling is raised past the vendor's",
    file: "src/lib/server/sms-blackball.ts",
    from: `export const BATCH_MAX = 50;`,
    to: `export const BATCH_MAX = 100;`,
    expect: `§2 the batch ceiling is the vendor's documented 50`,
  },
  {
    // A hung gateway with no abort is an OTP request that never resolves. With OTP as the login
    // path that is a login that hangs rather than one that fails and offers the password route.
    name: "sms-blackball.ts — the abort signal is dropped, so a hung gateway hangs forever",
    file: "src/lib/server/sms-blackball.ts",
    // Anchored with the payload line: \`signal: controller.signal\` also appears in blackballBalance.
    from: `        body: JSON.stringify(payload),
        signal: controller.signal,`,
    to: `        body: JSON.stringify(payload),
        signal: undefined,`,
    expect: `§7 a hung gateway aborts at the timeout rather than never`,
  },
  {
    // 🔴 THE ENV THAT MUST NOT BE READ. `smsConfigured()` used to be `!!process.env.SMS_API_KEY`.
    // A Blackball deployment sets neither that env nor anything like it, so the old body reported
    // a fully-working rail as dead — and `invite-service.ts` answers "dead" by silently leaving
    // every phone invite QUEUED while telling the officer nothing is wrong.
    name: "sms-blackball.ts — configuration goes back to reading the deleted SMS_API_KEY",
    file: "src/lib/server/sms-blackball.ts",
    from: `  return !!(process.env.BLACKBALL_CLIENT_ID?.trim() && process.env.BLACKBALL_CLIENT_SECRET?.trim());`,
    to: `  return !!process.env.SMS_API_KEY;`,
    expect: `§9 ⭐ both Blackball credentials and NO SMS_API_KEY → CONFIGURED`,
  },
  {
    // The cap is enforced by the gateway BEFORE authentication, so an over-long sender id fails
    // every send with a complaint about a field rather than about the sender id. Catching it at
    // boot is the difference between one loud line at startup and a silent, total outage.
    name: "sms-blackball.ts — the 12-character sender-id cap stops being checked",
    file: "src/lib/server/sms-blackball.ts",
    from: `  if (v.length > SENDER_ID_MAX_CHARS) {`,
    to: `  if (false && v.length > SENDER_ID_MAX_CHARS) {`,
    expect: `§8 13 characters is refused, and the message says why`,
  },
  {
    // GSM-7 cannot carry Chinese: a ZH login code would reach the player as unreadable glyphs.
    // ⚠️ RE-ANCHORED 2026-09-25. The loop this quoted was the GSM-7 table's only reader, and U3 moved
    // that table to `@/lib/sms-compose` so a composer screen could reach it — `smsCodingFor` now
    // DELEGATES. The defect and its `expect` are unchanged; what this mutation now severs is the
    // delegation rather than the loop, which is the same seam: the gateway is told the wrong coding.
    name: "sms-blackball.ts — coding detection always answers GSM7",
    file: "src/lib/server/sms-blackball.ts",
    from: `  return encodingFor(text);`,
    to: `  void text; return "GSM7";`,
    expect: `§11 ⛔ the Chinese OTP is UCS2: GSM-7 would garble it`,
  },
  {
    // Omitting coding falls back to the gateway's GSM default for EVERY message.
    name: "sms-blackball.ts — coding is dropped from the request",
    file: "src/lib/server/sms-blackball.ts",
    from: `      coding: smsCodingFor(m.text),`,
    to: ``,
    expect: `§1 exactly the five Swagger message fields, no extras`,
  },
  {
    // ⛔ U43b-2 (R-BB2) · THE STATUS LINE FORGOTTEN. Only the gateway's own `status:false` BELOW a 5xx is a refusal; a 5xx
    // can come from a proxy AFTER the gateway took the batch. Read the boolean alone and a 502 saying status:false is
    // written FAILED and REJECTED: terminal, a late receipt discarded, and a refusal a caller may re-send at a second charge.
    name: "sms.ts — a 5xx carrying status:false is a refusal again (the status line forgotten)",
    file: "src/lib/server/sms.ts",
    from: `    const refusedByGateway = r.verdict === false && r.httpStatus < 500;`,
    to: `    const refusedByGateway = r.verdict === false;`,
    expect: `§15 ⛔ U43b-2 · …and a 5xx is ambiguous EVEN WHEN its body says status:false: a reply from behind a failing proxy is not the gateway's verdict on the batch`,
  },
  {
    // ⛔ U43b-2 (R-BB3) · THE AMBIGUITY READ OFF THE TRANSPORT FIELD ALONE — the shape before U43b-2: a 504 with a proxy's HTML page
    // arrived with a status line, so it counted as a refusal, FAILED and REJECTED, for a batch the gateway may hold.
    name: "sms.ts — only a reply that never came is ambiguous again (a 504 page becomes a refusal)",
    file: "src/lib/server/sms.ts",
    from: `    return { ok: r.ok, ambiguous: !r.ok && !refusedByGateway, detail: describeBlackball(r), message: r.message, balance: r.balance };`,
    to: `    return { ok: r.ok, ambiguous: r.transport !== null, detail: describeBlackball(r), message: r.message, balance: r.balance };`,
    expect: `§15 ⛔ U43b-2 · a 504 carrying a proxy's HTML page is AMBIGUOUS, never a refusal: the row UNKNOWN with no failedAt, the result TRANSPORT (a late receipt can still settle it, and nobody re-sends it)`,
  },
  {
    // ⛔ U43b-2 (R-BB4) · A THROW LABELLED TRANSPORT AGAIN. The transport throws only before any request, and the catch
    // writes the row FAILED; the code TRANSPORT says the opposite ("the gateway may have it" — dispatch settles it
    // unconfirmed, never re-sent). Row and code must say the same thing: the error's own code, or UNKNOWN.
    name: "sms.ts — a throw that is not an SmsError is coded TRANSPORT again while its row says FAILED",
    file: "src/lib/server/sms.ts",
    from: `      const code = err instanceof SmsError ? err.code : "UNKNOWN";`,
    to: `      const code = err instanceof SmsError ? err.code : "TRANSPORT";`,
    expect: `§15 ⛔ U43b-2 · a throw that is not an SmsError, raised inside the transport before any request, is code UNKNOWN with its row FAILED and dated: never TRANSPORT, which says the gateway may have it while the row says it never left`,
  },
  {
    // ⭐ U43b-2 (R-BB5) · THE OTP-FAILURE MARK DROPPED. The campaign slice waits two minutes after a login or withdrawal
    // code failed; with the stamp gone it never waits, and marketing keeps the rail busy while codes are failing.
    name: "sms.ts — an OTP failure no longer stamps the OTP-failure mark",
    file: "src/lib/server/sms.ts",
    from: `  if (purpose === "OTP") globalThis.__50PICK_OTP_LAST_FAILURE_AT = Date.now();`,
    to: `  void purpose;`,
    expect: `§16 ⭐ U43b-2 · an OTP that fails (refused, unanswered or thrown before the request) stamps the process's OTP-failure mark at that moment, read back through lastOtpFailureAt`,
  },
];
