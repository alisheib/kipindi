/**
 * Anchors for red:sms-dlr — each reintroduces, on the real file, a control the delivery-receipt
 * receiver depends on. DATA, so `test:red-anchors` §3 can audit that every `from` still resolves
 * exactly once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines must be paired with re-anchoring here,
 * or the harness reports ANCHOR FAIL — loudly, by design.
 *
 * ⚠️ THREE OF THESE MUTATE `store.ts`, NOT THE ROUTE. The suite runs on the in-memory DAL (no
 * DATABASE_URL), so the monotonic guard it actually exercises is the memory one. A harness that
 * mutated only the Prisma copy would prove nothing about the code under test — and would quietly
 * report the guard as unprovable while the gate stayed green. (U46a's two are the receipt door's
 * status guard and its identity check; the Prisma door's WHERE is `test:dal-parity` §26.u46a's.)
 *
 * ⭐ U46a (ENGINE-SPEC §4.14) · the spec's four plants — the arm without the status guard, the arm
 * run on `!changed`, the identity check removed, PREVIOUS accepted when unset — then the cut before
 * the scrub, the test send's receipt let in, the campaign count dropped and the mismatch unaudited.
 * Each `expect` is a §12 label, and no §12 label holds a spaced dash: the harness reads a FAIL
 * line's label up to the first one.
 */
export const MUTATIONS = [
  {
    // 🔴 THE POSTMARK TEMPLATE, COPIED WITHOUT THE DEVIATION. Postmark opens when the secret is
    // unset and NODE_ENV is not production — fine for a suppression list. Here it means a QA box
    // pointed at the real gateway, holding real references, accepts forged delivery statuses.
    name: "route.ts — authorized() falls back to the Postmark rule and opens off production",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `    return process.env.NODE_ENV !== "production" && smsProviderResolution() !== "blackball";`,
    to: `    return process.env.NODE_ENV !== "production";`,
    expect: `§1 ⛔ no secret + a LIVE blackball provider is refused even off production`,
  },
  {
    // The reply shape is the vendor's, not ours. `{ok:true}` is what every other webhook here
    // returns, which is exactly why this is the easy mistake — and Blackball would read it as a
    // failed callback and retry forever.
    name: "route.ts — the reply reverts to this codebase's house {ok:true} shape",
    file: "src/app/api/webhooks/blackball/route.ts",
    // Anchored with its comment: the GET handler returns the same body, so the bare line is not unique.
    from: `  // \`{ok:true}\` every other webhook in this codebase returns.
  return NextResponse.json({ status: "Ok" });`,
    to: `  // \`{ok:true}\` every other webhook in this codebase returns.
  return NextResponse.json({ ok: true });`,
    expect: `§2 the body is byte-for-byte {"status":"Ok"}`,
  },
  {
    // A 404 both invites a retry storm and turns the endpoint into an oracle: a caller learns
    // which references exist by reading the status code.
    name: "route.ts — an unknown reference 404s instead of acking",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `      counts.unknownRef++;
      if (firstSightIn(\`unknown:\${reference}\`)) {`,
    to: `      counts.unknownRef++;
      return NextResponse.json({ ok: false, error: "unknown-reference" }, { status: 404 });
      if (firstSightIn(\`unknown:\${reference}\`)) {`,
    expect: `§3 an unknown reference still returns 200`,
  },
  {
    // "The identity we ask about must be the one we settle" — the lesson the payments webhook
    // learned the hard way. Without it a forger needs only a reference, not the number it went to.
    name: "route.ts — the msisdn cross-check is removed",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `    if (msisdn && row.msisdn !== msisdn.replace(/\\D/g, "")) {`,
    to: `    if (false && msisdn && row.msisdn !== msisdn.replace(/\\D/g, "")) {`,
    expect: `§4 a receipt for a DIFFERENT msisdn writes nothing`,
  },
  {
    // 🔴 THE WORST ONE. An unrecognised token becoming DELIVERED reports delivery we have no
    // evidence for, on the rail that carries login codes. The vendor's written list (2026-09-17,
    // docs/BLACKBALL-SMS.md §3) all maps, but only DELIVRD has ever arrived live — so any token
    // outside that list must stay null and be audited, never guessed as delivered.
    name: "route.ts — an unrecognised status token defaults to DELIVERED",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `  return null;
}

/** Bounded, time-windowed dedupe`,
    to: `  return "DELIVERED";
}

/** Bounded, time-windowed dedupe`,
    expect: `§6 ⛔ an unknown token maps to NULL, never to DELIVERED`,
  },
  {
    // The monotonic guard, on the backend the suite actually runs against.
    name: "store.ts — recordDlr stops refusing to move a settled row",
    file: "src/lib/server/store.ts",
    from: `      const settled = SMS_TERMINAL.includes(m.status);`,
    to: `      const settled = false;`,
    expect: `§5 ⛔ a later FAILED does NOT overwrite a settled DELIVERED`,
  },
  {
    // Without the `changed` guard a replayed receipt re-runs the downstream write, so a late
    // duplicate can drag a REGISTERED entry back to DELIVERED.
    name: "route.ts — the invite write stops being gated on `changed`",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `    if (changed && after?.targetType === "InviteEntry" && after.targetId) {`,
    to: `    if (after?.targetType === "InviteEntry" && after.targetId) {`,
    expect: `§7 a replayed receipt does not re-run the invite write`,
  },
  {
    // The person already signed up. A late delivery report about the invite that brought them
    // is not news that outranks that.
    name: "route.ts — a REGISTERED invite entry becomes demotable again",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `      if (entry && entry.status !== "REGISTERED") {`,
    to: `      if (entry) {`,
    expect: `§7 ⛔ a REGISTERED entry is never demoted by a late receipt`,
  },
  {
    // The audit chain cannot be pruned without breaking it, so an empty callback that audits is a
    // permanent row per call. Measured: fifteen empty reachability probes wrote fifteen such rows.
    name: "route.ts — an empty callback is audited again",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `  if (lines.length > 0) {
    audit({
      category: "SYSTEM",
      action: "sms.dlr.received",`,
    to: `  if (true) {
    audit({
      category: "SYSTEM",
      action: "sms.dlr.received",`,
    expect: `§10 ⛔ an empty callback writes NO sms.dlr.received row`,
  },
  {
    // The only request that reached the URL after registration was a vendor-style browser GET, and a
    // POST-only route answered 405 — which reads as "your callback URL is broken".
    name: "route.ts — a reachability GET is refused again",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `export function GET() {
  return NextResponse.json({ status: "Ok" });`,
    to: `export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });`,
    expect: `§11 a GET answers 200`,
  },
  {
    // A receipt shaped as one object instead of the documented array would be acked and dropped.
    name: "route.ts — a single status object is no longer recognised",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `  if (looksLikeLine(body)) return [body as StatusLine];`,
    to: ``,
    expect: `§11 ⛔ a SINGLE status object (no statuses array) is applied, not dropped`,
  },
  {
    // Silence was indistinguishable from "the vendor never called".
    name: "route.ts — an unrecognised callback shape stops leaving evidence",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `  if (parsed === null) {
    noteMalformed(`,
    to: `  if (false) {
    noteMalformed(`,
    expect: `§11 ⛔ an unrecognised shape is acked but AUDITED as sms.dlr.malformed`,
  },
  /* ── U46a · the campaign arm and the rotated secret (ENGINE-SPEC §4.14 · E28 · E29) ────────────────────────────── */
  {
    // ⭐ THE SPEC'S OWN RED (the arm without the status guard), on the twin the suite runs on: a receipt for an earlier
    // attempt's message moves a row another writer already settled — a FAILED rewritten DELIVERED, a HELD failed.
    name: "store.ts — the receipt door's status guard removed (a settled row is moved by a receipt)",
    file: "src/lib/server/store.ts",
    from: `      const open = SMS_RECEIPT_FROM.includes(row.status);`,
    to: `      const open = true;`,
    expect: `§12 D3b ⭐ a receipt never moves a row another writer settled: FAILED, SKIPPED and HELD rows stay as they were though their message moved`,
  },
  {
    // ⭐ THE SPEC'S OWN RED (the arm run on `!changed`): a replay re-runs the arm, and the deploy overlap's row — whose
    // message the old build already settled — is moved by the replay that should have changed nothing.
    name: "route.ts — the campaign arm stops being gated on `changed`",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `    if (changed && after?.targetType === DISPATCH_TARGET_TYPE && after.targetId`,
    to: `    if (after?.targetType === DISPATCH_TARGET_TYPE && after.targetId`,
    expect: `§12 D2 a replay re-runs nothing: a receipt whose message did not move leaves its recipient as it was, even one still SENT`,
  },
  {
    // ⭐ THE SPEC'S OWN RED (the identity check removed): a receipt moves the row of ANOTHER number, or overwrites the
    // reference a row already holds — one real reference settles somebody else's record.
    name: "store.ts — the receipt door's identity check removed",
    file: "src/lib/server/store.ts",
    from: `      const ours = row.msisdn === r.msisdn && (row.smsReference === null || row.smsReference === r.reference);`,
    to: `      const ours = true;`,
    expect: `§12 D6 ⛔ a receipt for the row of another number, or for a row holding another message's reference, writes nothing`,
  },
  {
    // ⭐ THE SPEC'S OWN RED (PREVIOUS accepted when unset): the empty string compares equal to an absent token, so with no
    // rotation in progress EVERY caller that sends no token is let in.
    name: "route.ts — the previous secret is compared without its floor (an unset PREVIOUS lets an absent token in)",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `  const rotated = previous.length >= SECRET_MIN_CHARS && secretEqual(provided, previous);`,
    to: `  const rotated = secretEqual(provided, previous);`,
    expect: `§12 D9 ⭐ with PREVIOUS unset only the current secret works: the old one, a third value and an absent or empty token are each refused`,
  },
  {
    // A number split at the cut slips past the scrub: eight of its digits — fewer than the scan calls a number — land in
    // the row's error, in the campaign record kept for seven years.
    name: "route.ts — the campaign arm cuts the vendor's words before it scrubs them",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `scrubPhoneRuns(description).slice(0, SMS_RECEIPT_DESC_MAX)`,
    to: `scrubPhoneRuns(description.slice(0, SMS_RECEIPT_DESC_MAX))`,
    expect: `§12 D4b a FAILED receipt writes its class receipt:<token> and the vendor's words as the error, every phone number scrubbed before the cut`,
  },
  {
    // Decision 2: a test send's receipt (`SmsCampaignTest`) settles its message and nothing else. Keyed on any campaign
    // type, it reaches the door and settles a row its target id happens to name.
    name: "route.ts — the campaign arm keys on any campaign target type, the test send's included",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `after?.targetType === DISPATCH_TARGET_TYPE && after.targetId`,
    to: `after?.targetType?.startsWith("SmsCampaign") && after.targetId`,
    expect: `§12 D7 a test send's receipt settles its SmsMessage row and touches no recipient, even one its target id names`,
  },
  {
    // Decision 3: the receipt audit row counts the recipients it settled. Without it an operator reads receipts applied
    // and cannot tell whether one reached a campaign row.
    name: "route.ts — the campaign arm stops counting what it settled",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `        if (outcome.changed) counts.campaign++;`,
    to: `        if (outcome.changed) counts.invites += 0;`,
    expect: `§12 D8 …and ONE audit row counts them: 3 lines, 2 applied, 1 unknown, 1 invite, 1 campaign`,
  },
  {
    // A mismatch writes nothing — and, unaudited, says nothing either: a vendor's error or a forgery leaves no trace.
    name: "route.ts — a recipient mismatch is no longer audited",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `        else if (outcome.reason === "mismatch") await noteRecipientMismatch(recipientId, reference, after.msisdn);`,
    to: ``,
    expect: `§12 D6 …and each is audited SECURITY as sms.dlr.recipient_mismatch, naming the numbers masked and never in full`,
  },
  /* ── U46a · the review round (findings 1, 4 and 5) ───────────────────────────────────────────────────────────── */
  {
    // ⭐ FINDING 1: the campaign arm trusts a line that carries no number. A real reference alone then fails a recipient
    // with the forger's own words — the message's number, checked only when a line has one, no longer vouches for it.
    name: "route.ts — the campaign arm stops requiring the line's own number",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `      const vouched = msisdn !== "" && msisdn.replace(/[^0-9]/g, "") === after.msisdn;`,
    to: `      const vouched = true;`,
    expect: `§12 D6d ⛔ a campaign line without the message's number moves no recipient row: the row as it was, audited SECURITY by its code alone, and the reply still Ok`,
  },
  {
    // FINDING 4: one scrub, never read again. Words whose fraction folds into digits keep a number after the scrub, the
    // door refuses it, and the row waits for a verdict that already came — for ever.
    name: "route.ts — the receipt's words are handed in after one scrub, never read again",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `  for (let pass = 0; pass < 3 && holdsPhoneRun(words); pass++) words = scrubPhoneRuns(words).slice(0, SMS_RECEIPT_DESC_MAX);
  return holdsPhoneRun(words) ? null : words;`,
    to: `  return words;`,
    expect: `§12 D4c a FAILED receipt whose words fold into a number again after one scrub still lands: FAILED, its words read until no number is left`,
  },
  {
    // FINDING 5: the CURRENT secret compared below the floor — a short secret, the kind boot already calls unusable, opens
    // the receiver to whoever guesses it.
    name: "route.ts — the current secret is compared without its floor",
    file: "src/app/api/webhooks/blackball/route.ts",
    from: `  const current = secret.length >= SECRET_MIN_CHARS && secretEqual(provided, secret);`,
    to: `  const current = secretEqual(provided, secret);`,
    expect: `§12 D9 ⛔ a CURRENT secret shorter than the floor is never compared either: even its own exact value is refused, while one of exactly the floor is accepted`,
  },
];
