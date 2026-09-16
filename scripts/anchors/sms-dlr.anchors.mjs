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
 * report the guard as unprovable while the gate stayed green.
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
    // evidence for, on the rail that carries login codes — and the vendor has NOT published its
    // vocabulary, so unrecognised tokens are the expected case, not the edge case.
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
];
