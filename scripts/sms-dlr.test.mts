/**
 * test:sms-dlr — the Blackball delivery-receipt receiver.
 *
 * 🔴 WHAT THIS ENDPOINT IS, STATED PLAINLY. It is an unauthenticated-by-default,
 * internet-facing POST that mutates delivery status and, through it, `InviteEntry`.
 * The only things standing between it and a forger are a shared secret, the
 * unguessability of a reference, an msisdn cross-check and a monotonic state
 * machine. Every one of those is asserted below, because each is the kind of
 * control that keeps working when it has quietly stopped working.
 *
 * ⛔ THE VENDOR HAS NOT PUBLISHED ITS STATUS VOCABULARY. So the mapper's real
 * contract is not "recognise these tokens" — it is "NEVER guess". §6 is the
 * assertion that an unrecognised token leaves the row alone and records itself,
 * and it is the one that matters most: a token silently read as DELIVERED is a
 * login code reported as received that never arrived.
 *
 * ⭐ THE REPLY BODY IS COMPARED BYTE FOR BYTE. Blackball expects `{"status":"Ok"}`,
 * not the `{ok:true}` every other webhook here returns. A shape check would pass on
 * `{status:"Ok", extra:1}`; a string compare will not.
 *
 * Run: npm run test:sms-dlr
 */
import { GET, POST, mapDlrStatus, authorized } from "../src/app/api/webhooks/blackball/route.ts";
import { db } from "../src/lib/server/store.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";
import { isProtectedPath } from "../src/proxy.ts";

let pass = 0,
  fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

const SECRET = "a-test-webhook-secret-long-enough";
const URL_BASE = "https://www.50pick.tz/api/webhooks/blackball";

process.env.BLACKBALL_WEBHOOK_SECRET = SECRET;
process.env.SMS_PROVIDER = "blackball";

let seq = 0;
async function seed(over: Partial<Parameters<typeof db.smsMessage.create>[0]> = {}) {
  const reference = `sms_${String(++seq).padStart(24, "0")}`;
  await db.smsMessage.create({
    reference,
    msisdn: "255772619619",
    purpose: "OPS",
    provider: "blackball",
    senderId: "50PICK",
    bodyLen: 20,
    status: "ACCEPTED",
    providerMsg: null,
    dlrStatus: null,
    dlrDesc: null,
    balanceTzs: null,
    attempts: 1,
    targetType: null,
    targetId: null,
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
    deliveredAt: null,
    failedAt: null,
    ...over,
  });
  return reference;
}

const post = (statuses: unknown[], opts: { token?: string | null; header?: string } = {}) => {
  const token = opts.token === undefined ? SECRET : opts.token;
  const url = token === null ? URL_BASE : `${URL_BASE}?token=${encodeURIComponent(token)}`;
  return POST(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(opts.header ? { "x-blackball-token": opts.header } : {}) },
      body: JSON.stringify({ statuses }),
    }),
  );
};

/** ⚠️ `audit()` is fire-and-forget through `globalThis.__50PICK_AUDIT_QUEUE`, so a read in
 *  the same tick as the POST races the write. This is the difference between asserting
 *  "the endpoint audited" and asserting "the endpoint audited before I happened to look". */
const settle = () => new Promise((r) => setTimeout(r, 25));

const line = (reference: string, status: string, extra: Record<string, unknown> = {}) => ({
  reference, status, description: "d", msisdn: "255772619619", ...extra,
});

/* ══ §0 · CONTROLS — the happy path really works ═════════════════════════════ */
{
  const ref = await seed();
  const res = await post([line(ref, "DELIVERED")]);
  const row = await db.smsMessage.findByReference(ref);
  ok("§0 control: an authorised receipt returns 200", res.status === 200);
  ok("§0 control: …and actually moved the row to DELIVERED", row?.status === "DELIVERED", row?.status);
  ok("§0 control: …and stamped deliveredAt", !!row?.deliveredAt);
}

/* ══ §1 · AUTH ══════════════════════════════════════════════════════════════ */
{
  const ref = await seed();
  ok("§1 a wrong token is 401", (await post([line(ref, "DELIVERED")], { token: "wrong" })).status === 401);
  ok("§1 an absent token is 401", (await post([line(ref, "DELIVERED")], { token: null })).status === 401);
  ok("§1 the right token in the QUERY is accepted", (await post([line(ref, "DELIVERED")])).status === 200);

  const ref2 = await seed();
  const viaHeader = await POST(
    new Request(URL_BASE, {
      method: "POST",
      headers: { "content-type": "application/json", "x-blackball-token": SECRET },
      body: JSON.stringify({ statuses: [line(ref2, "DELIVERED")] }),
    }),
  );
  ok("§1 the right token in the HEADER is accepted", viaHeader.status === 200);

  // A rejected call must not write.
  const ref3 = await seed();
  await post([line(ref3, "DELIVERED")], { token: "wrong" });
  ok("§1 a rejected call writes NOTHING", (await db.smsMessage.findByReference(ref3))?.status === "ACCEPTED");

  // ⛔ THE DEVIATION FROM THE POSTMARK TEMPLATE. Postmark opens when the secret is
  // unset and NODE_ENV is not production. Here that convenience must close as soon
  // as a real provider is selected, because then real references exist.
  delete process.env.BLACKBALL_WEBHOOK_SECRET;
  process.env.SMS_PROVIDER = "blackball";
  ok("§1 ⛔ no secret + a LIVE blackball provider is refused even off production",
    authorized(new Request(URL_BASE, { method: "POST" })) === false);
  process.env.SMS_PROVIDER = "console";
  ok("§1 …while no secret + the console stub stays open for local testing",
    authorized(new Request(URL_BASE, { method: "POST" })) === true);
  process.env.BLACKBALL_WEBHOOK_SECRET = SECRET;
  process.env.SMS_PROVIDER = "blackball";
}

/* ══ §2 · THE REPLY BODY IS THEIRS, NOT OURS ════════════════════════════════ */
{
  const ref = await seed();
  const res = await post([line(ref, "DELIVERED")]);
  const text = await res.text();
  ok(`§2 the body is byte-for-byte {"status":"Ok"}`, text === '{"status":"Ok"}', text);
}

/* ══ §3 · AN UNKNOWN REFERENCE IS ACKED, NEVER 404 ══════════════════════════ */
{
  const res = await post([line("sms_" + "f".repeat(24), "DELIVERED")]);
  ok("§3 an unknown reference still returns 200", res.status === 200);
  ok(`§3 …with the same {"status":"Ok"} body: never a 404 probing oracle`,
    (await res.text()) === '{"status":"Ok"}');

  // ⭐ THE LIVE DRIVE'S RECEIPTS LAND HERE. It never writes a production row, so this audit is
  // where the vendor's vocabulary is first seen — and it must keep BOTH fields, verbatim.
  const probeRef = "sms_" + "e".repeat(24);
  await post([{ reference: probeRef, status: "VENDOR_TOKEN_X", description: "Vendor description Y", msisdn: "255772619619" }]);
  await settle();
  const row = getAuditPage({ limit: 5_000 }).find((a) => a.action === "sms.dlr.unknown_reference" && a.targetId === probeRef);
  const pl = (row?.payload ?? {}) as Record<string, unknown>;
  ok("§3 the unknown-reference audit keeps the raw status token", pl.rawStatus === "VENDOR_TOKEN_X", JSON.stringify(pl));
  ok("§3 …and the vendor's description, verbatim", pl.description === "Vendor description Y");
  ok("§3 …and never the full msisdn", typeof pl.msisdn === "string" && !String(pl.msisdn).includes("772619619"));
}

/* ══ §4 · THE IDENTITY WE ASK ABOUT MUST BE THE ONE WE SETTLE ═══════════════ */
{
  const ref = await seed();
  const before = getAuditPage({ limit: 5_000, category: "SECURITY" }).length;
  await post([line(ref, "DELIVERED", { msisdn: "255700000001" })]);
  await settle();
  const row = await db.smsMessage.findByReference(ref);
  ok("§4 a receipt for a DIFFERENT msisdn writes nothing", row?.status === "ACCEPTED", row?.status);
  const after = getAuditPage({ limit: 5_000, category: "SECURITY" });
  ok("§4 …and audits it as a SECURITY event",
    after.length > before && after.some((a) => a.action === "sms.dlr.msisdn_mismatch"));
}

/* ══ §5 · MONOTONIC — the provider's at-least-once retry is a no-op ═════════ */
{
  const ref = await seed();
  await post([line(ref, "DELIVERED")]);
  const first = await db.smsMessage.findByReference(ref);
  await post([line(ref, "DELIVERED")]);
  const replay = await db.smsMessage.findByReference(ref);
  ok("§5 the same receipt twice leaves deliveredAt untouched",
    !!first?.deliveredAt && first.deliveredAt === replay?.deliveredAt);

  // ⛔ A LATE CONTRADICTION MUST NOT REWRITE A SETTLED ROW.
  await post([line(ref, "FAILED")]);
  const after = await db.smsMessage.findByReference(ref);
  ok("§5 ⛔ a later FAILED does NOT overwrite a settled DELIVERED", after?.status === "DELIVERED", after?.status);
  ok("§5 …and no failedAt is stamped on it", after?.failedAt === null);
}

/* ══ §6 · 🔴 AN UNRECOGNISED TOKEN IS RECORDED, NEVER GUESSED ═══════════════ */
{
  ok("§6 the mapper recognises the delivered family", mapDlrStatus("DELIVRD") === "DELIVERED");
  // ⭐ THE RECEIPT BLACKBALL ACTUALLY PRODUCED. Observed live 2026-09-16 in the portal's Out SMS
  // for the first real send: status `DELIVRD`, description `Success`. Driven through the whole
  // route rather than the mapper alone, so the one confirmed vendor pair is proven end to end.
  const liveRef = await seed();
  await post([line(liveRef, "DELIVRD", { description: "Success" })]);
  const liveRow = await db.smsMessage.findByReference(liveRef);
  ok("§6 ⭐ Blackball's observed receipt (DELIVRD / Success) moves the row to DELIVERED",
    liveRow?.status === "DELIVERED" && liveRow.dlrStatus === "DELIVRD" && liveRow.dlrDesc === "Success",
    `${liveRow?.status} ${liveRow?.dlrStatus} ${liveRow?.dlrDesc}`);
  ok("§6 …and the failed family", mapDlrStatus("UNDELIV") === "FAILED" && mapDlrStatus("EXPIRED") === "FAILED");
  ok("§6 …is case- and whitespace-insensitive", mapDlrStatus("  delivered ") === "DELIVERED");
  // ⛔ THE ASSERTION THAT MATTERS MOST.
  ok("§6 ⛔ an unknown token maps to NULL, never to DELIVERED", mapDlrStatus("SOMETHING_NEW") === null);
  ok("§6 ⛔ an empty token maps to NULL", mapDlrStatus("") === null);

  const ref = await seed();
  await post([line(ref, "SOMETHING_NEW")]);
  const row = await db.smsMessage.findByReference(ref);
  ok("§6 an unmapped receipt leaves the row's status alone", row?.status === "ACCEPTED", row?.status);
  ok("§6 …but records the RAW token, so the vocabulary is learned not invented",
    row?.dlrStatus === "SOMETHING_NEW", row?.dlrStatus ?? "(null)");
  await settle();
  ok("§6 …and audits it for an operator to read",
    getAuditPage({ limit: 5_000 }).some((a) => a.action === "sms.dlr.unmapped_status"));
}

/* ══ §7 · THE TWO INVITE ARMS THAT HAD NEVER BEEN WRITTEN ═══════════════════ */
{
  const mkEntry = async (status: "QUEUED" | "SENT" | "REGISTERED") => {
    const id = `ive_dlr_${++seq}`;
    await db.inviteEntry.create({
      id, campaignId: "camp_dlr", contactType: "PHONE", contactValue: "+255772619619",
      bonusAmountTzs: 1000, status, sentAt: null, registeredUserId: null, bonusGrantId: null,
      failureReason: null, createdAt: new Date().toISOString(),
    });
    return id;
  };

  const okId = await mkEntry("SENT");
  const refOk = await seed({ targetType: "InviteEntry", targetId: okId });
  await post([line(refOk, "DELIVERED")]);
  ok("§7 a delivered invite receipt writes InviteEntry.DELIVERED",
    (await db.inviteEntry.findById(okId))?.status === "DELIVERED");

  const badId = await mkEntry("SENT");
  const refBad = await seed({ targetType: "InviteEntry", targetId: badId });
  await post([line(refBad, "UNDELIVERABLE")]);
  const bad = await db.inviteEntry.findById(badId);
  ok("§7 a failed invite receipt writes InviteEntry.BOUNCED", bad?.status === "BOUNCED", bad?.status);
  ok("§7 …with a reason an officer can read", !!bad?.failureReason);

  // ⛔ THE PERSON ALREADY SIGNED UP. A late report about the invite that brought them
  // is not news that outranks that.
  const regId = await mkEntry("REGISTERED");
  const refReg = await seed({ targetType: "InviteEntry", targetId: regId });
  await post([line(refReg, "UNDELIVERABLE")]);
  ok("§7 ⛔ a REGISTERED entry is never demoted by a late receipt",
    (await db.inviteEntry.findById(regId))?.status === "REGISTERED");

  // A replay must not re-run the downstream write either.
  //
  // ⛔ THE MARKER IS DELIBERATELY *NOT* `REGISTERED`, AND THAT IS THE WHOLE POINT.
  // This case first used REGISTERED, and `red:sms-dlr` reported it NOT CAUGHT: the
  // no-demote guard one line below already blocks that value, so removing the
  // `changed` gate changed nothing observable and the assertion passed either way.
  // Two guards overlapping means one of them is untested. Resetting to SENT is a
  // value NEITHER guard protects, so the only thing that can keep it SENT is the
  // `changed` gate itself. (SENT is a marker for "did a second write happen", not a
  // workflow anyone performs.)
  const replayId = await mkEntry("SENT");
  const refReplay = await seed({ targetType: "InviteEntry", targetId: replayId });
  await post([line(refReplay, "DELIVERED")]);
  ok("§7 control: the first receipt did write", (await db.inviteEntry.findById(replayId))?.status === "DELIVERED");
  await db.inviteEntry.update(replayId, { status: "SENT" });
  await post([line(refReplay, "DELIVERED")]);
  ok("§7 a replayed receipt does not re-run the invite write",
    (await db.inviteEntry.findById(replayId))?.status === "SENT",
    (await db.inviteEntry.findById(replayId))?.status);
}

/* ══ §8 · AN OTP RECEIPT IS INERT BEYOND ITS OWN ROW ════════════════════════ */
{
  const otpId = `otp_dlr_${++seq}`;
  await db.otp.create({
    id: otpId, phoneE164: "+255772619619", email: null, hashedCode: "h", salt: "s",
    purpose: "login", attempts: 0, consumedAt: null,
    expiresAt: new Date(Date.now() + 300_000).toISOString(), createdAt: new Date().toISOString(),
  });
  const ref = await seed({ purpose: "OTP", targetType: "Otp", targetId: otpId });
  await post([line(ref, "DELIVERED")]);
  // `findAllActive` is the accessor the login path itself uses, so this asserts the
  // property the product actually depends on: the code is still live and usable.
  const active = await db.otp.findAllActive("+255772619619", "login");
  const mine = active.find((o) => o.id === otpId);
  ok("§8 the SmsMessage row moves", (await db.smsMessage.findByReference(ref))?.status === "DELIVERED");
  // ⛔ A DELIVERY REPORT IS NOT AN AUTHENTICATION EVENT. Wiring one to the Otp would
  // make the login path depend on an endpoint an attacker can reach.
  ok("§8 ⛔ the Otp is still ACTIVE after a delivery report", !!mine, `active=${active.length}`);
  ok("§8 ⛔ …not consumed", mine?.consumedAt === null);
  ok("§8 ⛔ …and its attempt budget is untouched", mine?.attempts === 0);
}

/* ══ §9 · THE ROUTE IS REACHABLE — the proxy must not gate it ═══════════════ */
{
  ok("§9 /api/webhooks/blackball is not behind the session guard",
    isProtectedPath("/api/webhooks/blackball") === false);
  // Control: the predicate is real and does protect something.
  ok("§9 control: the predicate actually protects /wallet", isProtectedPath("/wallet") === true);
}

/* ══ §10 · MALFORMED INPUT ══════════════════════════════════════════════════ */
{
  const badJson = await POST(new Request(`${URL_BASE}?token=${SECRET}`, { method: "POST", body: "not json" }));
  ok("§10 a non-JSON body is 400, not a 500", badJson.status === 400);
  const noStatuses = await POST(
    new Request(`${URL_BASE}?token=${SECRET}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}),
    }),
  );
  ok("§10 a body with no statuses array is acked, not a crash", noStatuses.status === 200);

  // ⛔ The audit chain cannot be pruned, so an empty callback must not add a permanent row.
  await settle();
  const receivedBefore = getAuditPage({ limit: 20_000 }).filter((a) => a.action === "sms.dlr.received").length;
  await post([]);
  await post([]);
  await settle();
  const receivedAfter = getAuditPage({ limit: 20_000 }).filter((a) => a.action === "sms.dlr.received").length;
  ok("§10 ⛔ an empty callback writes NO sms.dlr.received row", receivedAfter === receivedBefore,
    `${receivedBefore} -> ${receivedAfter}`);
  // Control: a callback that carries a line IS audited, so the assertion above is not vacuous.
  await post([line("sms_" + "d".repeat(24), "DELIVRD")]);
  await settle();
  ok("§10 control: a callback carrying lines IS audited",
    getAuditPage({ limit: 20_000 }).filter((a) => a.action === "sms.dlr.received").length === receivedAfter + 1);
  const res = await post([{ status: "DELIVERED" }, { reference: "", status: "X" }]);
  ok("§10 lines with no reference are skipped without throwing", res.status === 200);
}

/* ══ §11 · WHAT A VENDOR MIGHT ACTUALLY SEND ════════════════════════════════ */
{
  // a · A reachability GET. On 2026-09-16 the only request that reached this URL after registration was
  //     a browser GET from Tanzania, answered 405 — which reads to a vendor as "your URL is broken".
  await settle(); // let the previous section's audit rows land before taking the baseline
  const beforeGet = getAuditPage({ limit: 20_000 }).length;
  const g = await GET();
  await settle();
  ok("§11 a GET answers 200", g.status === 200);
  ok(`§11 …with exactly {"status":"Ok"}`, (await g.text()) === '{"status":"Ok"}');
  ok("§11 …and writes nothing", getAuditPage({ limit: 20_000 }).length === beforeGet);

  // b · A single status object instead of the documented array must not be silently dropped.
  const single = await seed();
  await POST(new Request(`${URL_BASE}?token=${SECRET}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(line(single, "DELIVRD", { description: "Success" })),
  }));
  ok("§11 ⛔ a SINGLE status object (no statuses array) is applied, not dropped",
    (await db.smsMessage.findByReference(single))?.status === "DELIVERED");

  // c · A bare array of status objects.
  const bare = await seed();
  await POST(new Request(`${URL_BASE}?token=${SECRET}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify([line(bare, "DELIVRD")]),
  }));
  ok("§11 ⛔ a BARE array of status objects is applied", (await db.smsMessage.findByReference(bare))?.status === "DELIVERED");

  // d · A body we cannot read must leave evidence, not silence.
  const malformed = () => getAuditPage({ limit: 20_000 }).filter((a) => a.action === "sms.dlr.malformed");
  await settle();
  const m0 = malformed().length;
  const odd = await POST(new Request(`${URL_BASE}?token=${SECRET}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ msgId: "x", deliveryState: "DELIVRD", phone: "255772619619" }),
  }));
  await settle();
  const oddRows = malformed();
  ok("§11 ⛔ an unrecognised shape is acked but AUDITED as sms.dlr.malformed", odd.status === 200 && oddRows.length === m0 + 1,
    `${m0} -> ${oddRows.length}`);
  const pl = (oddRows[0]?.payload ?? {}) as Record<string, unknown>;
  ok("§11 …recording key NAMES only, never values", JSON.stringify(pl.keys) === JSON.stringify(["msgId", "deliveryState", "phone"])
    && !JSON.stringify(pl).includes("772619619"), JSON.stringify(pl));

  const notJson = await POST(new Request(`${URL_BASE}?token=${SECRET}`, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "status=DELIVRD&reference=abc",
  }));
  await settle();
  ok("§11 ⛔ a non-JSON body is 400 AND audited, not silently lost", notJson.status === 400 && malformed().length === m0 + 2);

  // e · Dedupe: the same malformed shape again does not add another permanent row.
  await POST(new Request(`${URL_BASE}?token=${SECRET}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ msgId: "y", deliveryState: "DELIVRD", phone: "255700000000" }),
  }));
  await settle();
  ok("§11 a repeated malformed shape is deduped", malformed().length === m0 + 2);

  // f · Control: the recognised empty callback is NOT treated as malformed.
  await post([]);
  await settle();
  ok("§11 control: {statuses: []} is recognised, not malformed", malformed().length === m0 + 2);
}

console.log(`\nsms-dlr: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
