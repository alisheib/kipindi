/**
 * Anchors for red:otp-delivery — each reintroduces, on the real file, one of the things that
 * made the OTP path unsafe to use as a login path. DATA, so `test:red-anchors` §3 can audit
 * that every `from` still resolves exactly once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines must be paired with re-anchoring
 * here, or the harness reports ANCHOR FAIL — loudly, by design.
 *
 * ⭐ THE FIRST TWO ARE THE LIVE CODE AS IT STOOD BEFORE THIS BRANCH. They are not invented
 * defects; they are what production would run today with `OTP_ENABLED=1` flipped.
 */
export const MUTATIONS = [
  {
    // 🔴 THE ACTUAL LINE THAT WAS THERE. Fire-and-forget was defensible while OTP was a
    // dormant second door; as a login path it sends the player to a five-minute countdown
    // for a code that was never sent.
    name: "auth-service.ts — the send goes back to fire-and-forget",
    file: "src/lib/server/auth-service.ts",
    from: `    await sms.send(phone, otpMessage(code, locale), { purpose: "OTP", targetType: "Otp", targetId: otp.id });`,
    to: `    void sms.send(phone, otpMessage(code, locale), { purpose: "OTP", targetType: "Otp", targetId: otp.id }).catch(() => {});`,
    expect: `§4 requestLoginOtp does not resolve before the gateway has answered`,
  },
  {
    // Awaiting but swallowing: the caller is still told ok, which is the half that produces
    // the dead screen. Proves the suite checks the RETURN, not merely the timing.
    name: "auth-service.ts — the failure is awaited and then swallowed",
    file: "src/lib/server/auth-service.ts",
    from: `    return {
      ok: false,
      error: "We couldn't send your code. Please sign in with your password · Tumia nenosiri kuingia.",
      code: "SMS_UNDELIVERABLE",
    };
  }`,
    to: `  }`,
    expect: `§3 ③ a refusing gateway does NOT return ok`,
  },
  {
    // The OTP path was the ONE send site that never consulted smsConfigured(); invite-service
    // and /admin/invites both did. Without it we mint a live credential for a message that
    // cannot even be attempted.
    name: "auth-service.ts — the OTP path stops consulting smsConfigured()",
    file: "src/lib/server/auth-service.ts",
    from: `  if (!smsConfigured()) {`,
    to: `  if (false) {`,
    expect: `§2 …and no Otp row was created at all`,
  },
  {
    // A code nobody received stays live for five minutes and counts against the account's
    // active-OTP set.
    name: "auth-service.ts — a failed send leaves the minted code live",
    file: "src/lib/server/auth-service.ts",
    from: `    await db.otp.consume(otp.id);`,
    to: `    void 0;`,
    expect: `§3 ① the minted Otp is CONSUMED, not left live`,
  },
  {
    // The player is locked out of retrying for the full resend spacing over OUR failure.
    name: "auth-service.ts — the spent rate-limit tokens are not returned",
    file: "src/lib/server/auth-service.ts",
    from: `    for (const bucket of spentBuckets) await rateRefundAsync(phone, bucket).catch(() => {});`,
    to: `    void spentBuckets;`,
    expect: `§3 ② the resend allowance was REFUNDED, so they can retry immediately`,
  },
  {
    // The open A4 finding: every player got Swahili regardless of their own setting.
    name: "auth-service.ts — the OTP locale goes back to a hardcoded SW",
    file: "src/lib/server/auth-service.ts",
    from: `    if (who?.locale === "EN" || who?.locale === "SW" || who?.locale === "ZH") locale = who.locale;`,
    to: `    void who;`,
    expect: `§7 an EN player gets the English one`,
  },
  {
    // 🔴 THE ONE THAT WOULD HAVE BROKEN EVERY DELIVERY RECEIPT. Storing the `+255…` we hold
    // on the user, rather than the `255…` the gateway quotes back, makes the DLR route's
    // identity cross-check impossible to satisfy — so every genuine receipt is discarded AND
    // audited as a SECURITY mismatch.
    // ⚠️ RE-ANCHORED 2026-09-25. The line this quoted (`    msisdn: toMsisdn255(m.to),`, inside a
    // `messages.map`) stopped existing when U1 replaced that map with a two-pass partition that
    // refuses a bad msisdn before any row is written. The DEFECT is unchanged — persist the stored
    // `+255…` instead of the wire form and every delivery receipt is discarded as a mismatch — only
    // the line that reintroduces it moved.
    name: "sms.ts — the persisted msisdn reverts to the stored E.164",
    file: "src/lib/server/sms.ts",
    from: `    prepared.push({ out: m, index, reference: mintSmsReference(), msisdn: toMsisdn255(m.to) });`,
    to: `    prepared.push({ out: m, index, reference: mintSmsReference(), msisdn: m.to });`,
    expect: `§6 …and stores the msisdn in the gateway's wire form, not E.164`,
  },
  {
    // 🔴 THE STRING COUPLING, BROKEN THE WAY IT WOULD ACTUALLY BREAK. Ambiguity was once
    // inferred by regex-matching the transport's message text. This models the day somebody
    // rewords that message: the facade stops recognising a lost reply, records FAILED, and
    // FAILED invites a retry — a second SMS at a second charge.
    name: "sms.ts — a lost reply stops being recognised as ambiguous",
    file: "src/lib/server/sms.ts",
    from: `    const ambiguous = !outcome.ok && outcome.ambiguous;`,
    to: `    const ambiguous = !outcome.ok && /request did not complete/.test(outcome.message);`,
    expect: `§5 ⛔ a lost reply is recorded UNKNOWN, never FAILED`,
  },
];
