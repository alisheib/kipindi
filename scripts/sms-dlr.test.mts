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
 * ⛔ EVERY TOKEN ON THE VENDOR'S OFFICIAL LIST MAPS (by email 2026-09-17,
 * docs/BLACKBALL-SMS.md §3) — but a list received by email is not a guarantee of
 * what the gateway will send, and only DELIVRD has ever arrived live. So the mapper's
 * real contract is not "recognise these tokens" — it is "NEVER guess". §6 is the
 * assertion that an unrecognised token leaves the row alone and records itself,
 * and it is the one that matters most: a token silently read as DELIVERED is a
 * login code reported as received that never arrived.
 *
 * ⭐ THE REPLY BODY IS COMPARED BYTE FOR BYTE. Blackball expects `{"status":"Ok"}`,
 * not the `{ok:true}` every other webhook here returns. A shape check would pass on
 * `{status:"Ok", extra:1}`; a string compare will not.
 *
 * ⭐ U46a (ENGINE-SPEC §4.14) · §12 — THE CAMPAIGN ARM AND THE ROTATED SECRET. A campaign
 * receipt settles its `SmsCampaignRecipient` row through ONE door, `recordReceipt`, run
 * only when the message itself moved: D1 a SENT row DELIVERED; D2 a replay re-runs
 * nothing; D3 a late FAILED after DELIVERED is discarded, and D3b the door's own status
 * guard; D4 an UNCONFIRMED row settled late, D4b a FAILED one's words scrubbed before the
 * cut; D5 a claimed row reached first; D6 the identity (number and reference), D6c a
 * refusal recorded, never thrown; D7 a test send's receipt touches no recipient; D8 three
 * arms in one POST; D9 the previous secret beside the current one (E29); D10 the reply.
 * Every fixture row goes through the REAL recipient doors (U43a), never a hand-set map.
 *
 * Run: npm run test:sms-dlr
 */
import { GET, POST, mapDlrStatus, authorized } from "../src/app/api/webhooks/blackball/route.ts";
import { db } from "../src/lib/server/store.ts";
import type { StoredSmsCampaignRecipient, SmsCampaignRecipientSettle, SmsCampaignGateTrail } from "../src/lib/server/store.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";
import { isProtectedPath } from "../src/proxy.ts";
// U46a · the target type the slice sends under, the boot sentence for the rotation's second secret, the ONE mask and the
// ONE phone-run reading — §12 holds the arm to each.
import { DISPATCH_TARGET_TYPE } from "../src/lib/server/marketing/dispatch.ts";
import { previousWebhookSecretWarning } from "../src/lib/server/boot-checks.ts";
import { maskPhone } from "../src/lib/phone-normalize.ts";
import { holdsPhoneRun } from "../src/lib/contacts/contact-fields.ts";

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

/* ══ §12 · U46a · THE CAMPAIGN ARM, AND THE SECRET THAT ROTATES (ENGINE-SPEC §4.14 · E28 · E29) ═════════════
 * ⭐ A campaign receipt settles its recipient row through ONE door, `smsCampaignRecipient.recordReceipt`, run only when
 * the message itself moved. Every row below is made through the REAL recipient doors (create, claim, settle — U43a),
 * never a hand-set map, so what each case meets is the door's own guard. The messages are seeded as the slice's send
 * writes them: the campaign's target type, the row's id, the row's number.
 * ⛔ No backslash below, and no spaced dash inside a label: `red:sms-dlr` reads a FAIL line's label up to the first one. */
const FIX_AT = "2026-10-01T08:00:00.000Z";
const SENT_AT = "2026-10-01T08:00:01.000Z";
const TRAIL12: SmsCampaignGateTrail = [{ check: "gate", verdict: "CLEARED", wording: null, source: null }];
type Row12 = { id: string; key: string };
let cmp12 = 0, tok12 = 0;
/** A DRAFT campaign of `n` people through the real create doors (the recipient doors never read a campaign's status),
 *  each on a number of their own. */
async function campaignOf12(n: number): Promise<{ cid: string; rows: Row12[] }> {
  const cid = `cmp_dlr12_${String(++cmp12).padStart(3, "0")}`;
  await db.smsCampaign.create({
    id: cid, name: `DLR ${cid}`, status: "DRAFT", bodySw: "50pick: Habari.", bodyEn: null, codingSw: "GSM7", segmentsSw: 1,
    codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: null, draftRevision: 0,
    confirmTier: null, audienceFilter: '{"consent":["GIVEN"]}', audienceCount: null, audienceWatermark: null,
    estimateSegments: null, estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null,
    createdBy: "usr_dlr12_officer", confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null,
    createdAt: FIX_AT, updatedAt: FIX_AT,
  });
  const rows = Array.from({ length: n }, (_, i): Row12 => ({
    id: `rcp_dlr12_${String(cmp12).padStart(3, "0")}_${i}`, key: `25571${String(4000000 + cmp12 * 10 + i)}`,
  }));
  const made = await db.smsCampaignRecipient.createMany(rows.map((r) => ({
    id: r.id, campaignId: cid, msisdn: r.key, contactId: null, userId: null, optOutToken: null, createdAt: FIX_AT,
  })));
  if (made.inserted !== n) throw new Error(`fixture: ${made.inserted} of ${n} recipient rows inserted`);
  return { cid, rows };
}
/** Every row of the campaign claimed under ONE fresh token, as a slice claims them. Answers the token. */
async function claim12(cid: string, n: number): Promise<string> {
  const token = `tok_dlr12_${String(++tok12).padStart(4, "0")}`;
  const won = await db.smsCampaignRecipient.claim(cid, n, token, FIX_AT);
  if (won.length !== n) throw new Error(`fixture: the claim took ${won.length} of ${n} rows`);
  return token;
}
/** The slice's settle, through the real door. A patch that does not land is a broken fixture. */
async function settle12(patches: SmsCampaignRecipientSettle[]): Promise<void> {
  const res = await db.smsCampaignRecipient.settle(patches, FIX_AT);
  if (res.settled !== patches.length) throw new Error(`fixture: ${res.settled} of ${patches.length} settles landed`);
}
const sent12 = (r: Row12, claimToken: string, smsReference: string): SmsCampaignRecipientSettle => ({
  id: r.id, claimToken, to: "SENT", smsReference, sentAt: SENT_AT, optOutToken: null, locale: "SW", segments: 1, bodyLen: 40, gateTrail: TRAIL12,
});
/** The SmsMessage the slice's send writes for a row. Answers its reference. */
const message12 = (r: Row12, over: Partial<Parameters<typeof db.smsMessage.create>[0]> = {}) =>
  seed({ msisdn: r.key, purpose: "MARKETING", targetType: DISPATCH_TARGET_TYPE, targetId: r.id, ...over });
/** A receipt line for a row, carrying the row's own number as the vendor echoes it. */
const line12 = (r: Row12, reference: string, status: string, description = "d") => ({ reference, status, description, msisdn: r.key });
const row12 = (r: Row12) => db.smsCampaignRecipient.find(r.id);
/** The newest `sms.dlr.received` row's counts — the callback just posted (read after `settle()`). */
const received12 = (): Record<string, unknown> =>
  (getAuditPage({ limit: 20_000 }).find((a) => a.action === "sms.dlr.received")?.payload ?? {}) as Record<string, unknown>;
/** Every column of `b` but `except` holds the same value in `r`. */
const sameBut12 = (r: StoredSmsCampaignRecipient | null, b: StoredSmsCampaignRecipient | null, except: readonly string[]): boolean =>
  r !== null && b !== null && Object.keys(b).every((k) => except.includes(k)
    || JSON.stringify((r as unknown as Record<string, unknown>)[k]) === JSON.stringify((b as unknown as Record<string, unknown>)[k]));
/** The reply bodies D10 reads: a single campaign line, a refused one, a batch. */
const bodies12: string[] = [];

// ── D1 · ⭐ a SENT recipient DELIVERED by its receipt ──────────────────────────────────────────────
{
  const { cid, rows: [a] } = await campaignOf12(1);
  const token = await claim12(cid, 1);
  const ref = await message12(a);
  await settle12([sent12(a, token, ref)]);
  const before = await row12(a);
  const res = await post([line12(a, ref, "DELIVRD", "Success")]);
  bodies12.push(await res.text());
  const after = await row12(a);
  const msg = await db.smsMessage.findByReference(ref);
  await settle();
  const counts = received12();
  ok("§12 D1 ⭐ a DELIVRD receipt moves its SENT recipient to DELIVERED at the message's own instant: the reference, the claim and every other column kept",
    res.status === 200 && before?.status === "SENT" && after?.status === "DELIVERED" && !!after.deliveredAt
      && after.deliveredAt === msg?.deliveredAt && after.updatedAt === after.deliveredAt && after.smsReference === ref
      && after.claimToken === token && after.claimedAt === FIX_AT && after.sentAt === SENT_AT
      && sameBut12(after, before, ["status", "deliveredAt", "updatedAt"]),
    `${before?.status} -> ${after?.status} · deliveredAt ${after?.deliveredAt} (the message's ${msg?.deliveredAt}) · claim ${after?.claimToken}`);
  ok("§12 D1 …and the callback's ONE audit row counts it under campaign, beside invites",
    counts.campaign === 1 && counts.applied === 1 && counts.invites === 0 && counts.lines === 1, JSON.stringify(counts));
}

// ── D2 · a replay re-runs nothing ─────────────────────────────────────────────────────────────────
{
  const { cid, rows: [a, b] } = await campaignOf12(2);
  const token = await claim12(cid, 2);
  const refA = await message12(a);
  // ⭐ THE DEPLOY OVERLAP'S STATE (decision 6): a receipt reached the OLD build, which settled the MESSAGE alone — the
  // message DELIVERED, its recipient still SENT. Its replay must not run the arm, and it is the `changed` gate itself, and
  // nothing else, that keeps this row SENT: the door, asked, would move it. (§7's replay marker, for the same reason.)
  const refB = await message12(b, { status: "DELIVERED", deliveredAt: SENT_AT });
  await settle12([sent12(a, token, refA), sent12(b, token, refB)]);
  await post([line12(a, refA, "DELIVRD")]);
  const once = await row12(a);
  await post([line12(a, refA, "DELIVRD")]);
  const twice = await row12(a);
  await settle();
  const replay = received12();
  await post([line12(b, refB, "DELIVRD")]);
  const overlap = await row12(b);
  ok("§12 D2 a replay re-runs nothing: a receipt whose message did not move leaves its recipient as it was, even one still SENT",
    once?.status === "DELIVERED" && JSON.stringify(twice) === JSON.stringify(once) && replay.campaign === 0 && replay.replayed === 1
      && overlap?.status === "SENT" && overlap.deliveredAt === null,
    `the same receipt twice: ${once?.status}, then ${JSON.stringify(twice) === JSON.stringify(once) ? "unchanged" : "REWRITTEN"} · counted ${String(replay.campaign)} · the overlap's row ${overlap?.status}`);
}

// ── D3 · a late FAILED after DELIVERED · D3b · the door's own status guard ───────────────────────────
{
  const { cid, rows: [a] } = await campaignOf12(1);
  const token = await claim12(cid, 1);
  const ref = await message12(a);
  await settle12([sent12(a, token, ref)]);
  await post([line12(a, ref, "DELIVRD")]);
  const delivered = await row12(a);
  await post([line12(a, ref, "UNDELIV", "Absent subscriber")]);
  const late = await row12(a);
  ok("§12 D3 ⛔ a late FAILED after DELIVERED is discarded: the recipient stays DELIVERED, with no failedAt, class or error",
    delivered?.status === "DELIVERED" && JSON.stringify(late) === JSON.stringify(delivered)
      && late?.failedAt === null && late.failureClass === null && late.error === null,
    `${delivered?.status} -> ${late?.status}`);
}
{
  // ⭐ THE DOOR'S OWN GUARD, with the message's out of the way: each row was settled by ANOTHER writer for its claim —
  // refused at hand-over (FAILED, never handed over), refused by the gate (SKIPPED), parked (HELD) — while an EARLIER
  // attempt's message to it is still open (E6's race: a stalled slice's send that left after a reap). That message's
  // receipt DOES move the message, so only the door's status test keeps each row as it was.
  const { cid, rows: [f, s, h] } = await campaignOf12(3);
  const token = await claim12(cid, 3);
  const refs = [await message12(f), await message12(s), await message12(h)];
  await settle12([
    { id: f.id, claimToken: token, to: "FAILED", failureClass: "BAD_MSISDN", error: null, failedAt: SENT_AT, smsReference: null, gateTrail: TRAIL12 },
    { id: s.id, claimToken: token, to: "SKIPPED", skipReason: "suppressed", skipDetail: "", gateTrail: TRAIL12 },
    { id: h.id, claimToken: token, to: "HELD", failureClass: "gate_unanswered", attempts: 3 },
  ]);
  const before = [await row12(f), await row12(s), await row12(h)];
  await post([line12(f, refs[0], "DELIVRD"), line12(s, refs[1], "DELIVRD"), line12(h, refs[2], "UNDELIV")]);
  const after = [await row12(f), await row12(s), await row12(h)];
  const moved = await Promise.all(refs.map((x) => db.smsMessage.findByReference(x)));
  ok("§12 D3b ⭐ a receipt never moves a row another writer settled: FAILED, SKIPPED and HELD rows stay as they were though their message moved",
    moved.every((m) => m?.status === "DELIVERED" || m?.status === "FAILED") && JSON.stringify(after) === JSON.stringify(before),
    `messages ${moved.map((m) => m?.status).join(",")} · rows ${after.map((r) => r?.status).join(",")}`);
}

// ── D4 · ⭐ an UNCONFIRMED row settled by a late receipt · D4b · a FAILED one's words ──────────────────
{
  const { cid, rows: [u, v] } = await campaignOf12(2);
  const token = await claim12(cid, 2);
  // Handed to the wire, and the network's answer never came (E3): the message UNKNOWN, the row UNCONFIRMED — u without
  // the reference (a transport that died before it learnt one), v with it.
  const refU = await message12(u, { status: "UNKNOWN", sentAt: null });
  const refV = await message12(v, { status: "UNKNOWN", sentAt: null });
  await settle12([
    { id: u.id, claimToken: token, to: "UNCONFIRMED", smsReference: null, optOutToken: null, locale: "SW", segments: 1, bodyLen: 40, gateTrail: TRAIL12 },
    { id: v.id, claimToken: token, to: "UNCONFIRMED", smsReference: refV, optOutToken: null, locale: "SW", segments: 1, bodyLen: 40, gateTrail: TRAIL12 },
  ]);
  // The vendor's words hold a number placed so that a cut at 200 would keep eight of its digits — fewer than the scan
  // calls a number, so only a scrub of the WHOLE text, before the cut, can take it out.
  const words = `${"x".repeat(191)} 255712345678 is not reachable`;
  await post([line12(u, refU, "DELIVRD", "Success"), line12(v, refV, " undeliv ", words)]);
  const du = await row12(u);
  const fv = await row12(v);
  ok("§12 D4 ⭐ an UNCONFIRMED row settles on a late receipt: DELIVERED, the receipt's reference written where the row had none",
    du?.status === "DELIVERED" && du.smsReference === refU && !!du.deliveredAt && du.sentAt === null && du.claimToken === token,
    `${du?.status} · reference ${du?.smsReference === refU ? "written" : String(du?.smsReference)}`);
  const error = fv?.error ?? "";
  ok("§12 D4b a FAILED receipt writes its class receipt:<token> and the vendor's words as the error, every phone number scrubbed before the cut",
    fv?.status === "FAILED" && fv.failureClass === "receipt:UNDELIV" && !!fv.failedAt && fv.smsReference === refV
      && error.length > 0 && error.length <= 200 && error.startsWith("xxx") && !error.includes("2557") && !holdsPhoneRun(error),
    `${fv?.status} · ${fv?.failureClass} · the error ends ${JSON.stringify(error.slice(-12))}`);
}

// ── D5 · a receipt that beats the slice's settle ──────────────────────────────────────────────────
{
  const { cid, rows: [p] } = await campaignOf12(1);
  const token = await claim12(cid, 1);
  const ref = await message12(p, { status: "QUEUED", sentAt: null });   // the wire has it; the slice has not settled yet
  const held = await row12(p);
  await post([line12(p, ref, "DELIVRD")]);
  const reached = await row12(p);
  const lateSettle = await db.smsCampaignRecipient.settle([sent12(p, token, ref)], FIX_AT);
  const after = await row12(p);
  ok("§12 D5 a receipt that beats the slice's settle sets its claimed row DELIVERED with the claim kept, and the slice's later settle of it is lost",
    held?.status === "PENDING" && held.claimToken === token && reached?.status === "DELIVERED" && reached.smsReference === ref
      && reached.claimToken === token && reached.claimedAt === held.claimedAt
      && lateSettle.settled === 0 && lateSettle.lost.join(",") === p.id && JSON.stringify(after) === JSON.stringify(reached),
    `${held?.status} -> ${reached?.status} · the settle after it: settled ${lateSettle.settled}, lost [${lateSettle.lost.join(",")}]`);
}

// ── D6 · the identity: the number and the reference · D6c · a refusal recorded, never thrown ────────────
{
  const { cid, rows: [m, r] } = await campaignOf12(2);
  const token = await claim12(cid, 2);
  // (a) THE MESSAGE NAMES THE ROW BUT WENT TO ANOTHER NUMBER — the receipt agrees with its message, so the route's own
  //     check passes, and the door's identity test is all that is left to refuse it. The row stays open (claimed).
  const elsewhere = "255719990001";
  const refM = await seed({ msisdn: elsewhere, purpose: "MARKETING", targetType: DISPATCH_TARGET_TYPE, targetId: m.id });
  // (b) THE ROW ALREADY HOLDS ANOTHER MESSAGE'S REFERENCE — a second message naming it.
  const refR = await message12(r);
  const refR2 = await message12(r);
  await settle12([sent12(r, token, refR)]);
  const before = [await row12(m), await row12(r)];
  await settle();
  const rowsBefore = getAuditPage({ limit: 20_000, category: "SECURITY" }).filter((x) => x.action === "sms.dlr.recipient_mismatch").length;
  await post([{ reference: refM, status: "DELIVRD", description: "d", msisdn: elsewhere }, line12(r, refR2, "DELIVRD")]);
  await settle();
  const after = [await row12(m), await row12(r)];
  const notes = getAuditPage({ limit: 20_000, category: "SECURITY" }).filter((x) => x.action === "sms.dlr.recipient_mismatch");
  const fresh = notes.slice(0, Math.max(0, notes.length - rowsBefore));
  const text = JSON.stringify(fresh.map((x) => x.payload));
  ok("§12 D6 ⛔ a receipt for the row of another number, or for a row holding another message's reference, writes nothing",
    JSON.stringify(after) === JSON.stringify(before), after.map((x) => `${x?.status}/${x?.smsReference ?? "no reference"}`).join(" · "));
  ok("§12 D6 …and each is audited SECURITY as sms.dlr.recipient_mismatch, naming the numbers masked and never in full",
    fresh.length === 2 && text.includes(maskPhone(m.key)) && text.includes(maskPhone(elsewhere)) && text.includes(refR)
      && ![m.key, r.key, elsewhere].some((k) => text.includes(k.slice(3))),
    text.slice(0, 320));
}
{
  const { cid, rows: [h, t] } = await campaignOf12(2);
  const token = await claim12(cid, 2);
  // The message names t, but h already holds its reference: the column is unique, so the door refuses (P2002).
  const shared = await message12(t);
  await settle12([sent12(h, token, shared)]);
  const before = [await row12(h), await row12(t)];
  const res = await post([line12(t, shared, "DELIVRD")]);
  const body = await res.text();
  bodies12.push(body);
  await settle();
  const noted = getAuditPage({ limit: 20_000 }).find((x) => x.action === "sms.dlr.recipient_failed" && x.targetId === t.id);
  const pl = (noted?.payload ?? {}) as Record<string, unknown>;
  const after = [await row12(h), await row12(t)];
  ok("§12 D6c a receipt the door refuses (a reference another row holds, P2002) writes nothing, is audited by its code alone, and still answers 200",
    res.status === 200 && JSON.stringify(after) === JSON.stringify(before) && (await db.smsMessage.findByReference(shared))?.status === "DELIVERED"
      && noted?.category === "SYSTEM" && pl.code === "P2002" && pl.reference === shared && !JSON.stringify(pl).includes(t.key.slice(3)),
    JSON.stringify(pl));
}

// ── D7 · a test send's receipt ────────────────────────────────────────────────────────────────────
{
  // A TEST SEND's message (`SmsCampaignTest`, campaign-test-send.ts) whose target id happens to name a row a slice holds —
  // open, no reference, the same number: everything the door would accept, so only the arm's target type keeps it out.
  const { cid, rows: [a] } = await campaignOf12(1);
  await claim12(cid, 1);
  const testRef = await seed({ msisdn: a.key, purpose: "MARKETING", targetType: "SmsCampaignTest", targetId: a.id });
  const before = await row12(a);
  await post([line12(a, testRef, "DELIVRD")]);
  const after = await row12(a);
  await settle();
  const counts = received12();
  ok("§12 D7 a test send's receipt settles its SmsMessage row and touches no recipient, even one its target id names",
    (await db.smsMessage.findByReference(testRef))?.status === "DELIVERED" && before?.status === "PENDING"
      && JSON.stringify(after) === JSON.stringify(before) && counts.campaign === 0,
    `the row ${before?.status} -> ${after?.status} · counted ${String(counts.campaign)}`);
}

// ── D8 · three lines in one POST, each to its own arm ─────────────────────────────────────────────────
{
  const { cid, rows: [a] } = await campaignOf12(1);
  const token = await claim12(cid, 1);
  const refA = await message12(a);
  await settle12([sent12(a, token, refA)]);
  const entryId = `ive_dlr12_${++seq}`;
  await db.inviteEntry.create({
    id: entryId, campaignId: "camp_dlr12", contactType: "PHONE", contactValue: "+255772619619", bonusAmountTzs: 1000, status: "SENT",
    sentAt: null, registeredUserId: null, bonusGrantId: null, failureReason: null, createdAt: new Date().toISOString(),
  });
  const refI = await seed({ targetType: "InviteEntry", targetId: entryId });
  const unknown = "sms_" + "c".repeat(24);
  const res = await post([line12(a, refA, "DELIVRD"), line(refI, "DELIVRD"), line(unknown, "DELIVRD")]);
  bodies12.push(await res.text());
  await settle();
  const counts = received12();
  ok("§12 D8 three lines in one POST reach each its own arm: the campaign row DELIVERED, the invite DELIVERED, the unknown reference acked and audited",
    (await row12(a))?.status === "DELIVERED" && (await db.inviteEntry.findById(entryId))?.status === "DELIVERED"
      && getAuditPage({ limit: 20_000 }).some((x) => x.action === "sms.dlr.unknown_reference" && x.targetId === unknown),
    `campaign ${(await row12(a))?.status} · invite ${(await db.inviteEntry.findById(entryId))?.status}`);
  ok("§12 D8 …and ONE audit row counts them: 3 lines, 2 applied, 1 unknown, 1 invite, 1 campaign",
    counts.lines === 3 && counts.applied === 2 && counts.unknownRef === 1 && counts.invites === 1 && counts.campaign === 1,
    JSON.stringify(counts));
}

// ── D9 · ⭐ the previous secret beside the current one (E29) ──────────────────────────────────────────────
{
  const OLD = "the-old-secret-that-went-through-chat";
  const THIRD = "a-third-value-nobody-was-given";
  const SHORT = "fifteen-chars-x";
  /** `authorized()` asked with a token in the query, in the header, or none at all. */
  const asks = (token: string | null, where: "query" | "header" = "query"): boolean => authorized(new Request(
    token !== null && where === "query" ? `${URL_BASE}?token=${encodeURIComponent(token)}` : URL_BASE,
    { method: "POST", headers: token !== null && where === "header" ? { "x-blackball-token": token } : {} },
  ));
  process.env.BLACKBALL_WEBHOOK_SECRET_PREVIOUS = OLD;
  const during = { old: asks(OLD), oldHeader: asks(OLD, "header"), current: asks(SECRET), third: asks(THIRD), none: asks(null), empty: asks("") };
  const ref = await seed();
  const res = await post([line(ref, "DELIVRD")], { token: OLD });
  const applied = (await db.smsMessage.findByReference(ref))?.status === "DELIVERED";
  delete process.env.BLACKBALL_WEBHOOK_SECRET_PREVIOUS;
  const unset = { old: asks(OLD), current: asks(SECRET), third: asks(THIRD), none: asks(null), empty: asks("") };
  process.env.BLACKBALL_WEBHOOK_SECRET_PREVIOUS = SHORT;
  const short = { value: asks(SHORT), none: asks(null), current: asks(SECRET) };
  process.env.BLACKBALL_WEBHOOK_SECRET_PREVIOUS = "";
  const blank = { none: asks(null), empty: asks(""), current: asks(SECRET) };
  delete process.env.BLACKBALL_WEBHOOK_SECRET_PREVIOUS;
  ok("§12 D9 ⭐ while PREVIOUS is set the old secret is accepted beside the current one, in the query and in the header, and a receipt carrying it is applied",
    during.old && during.oldHeader && during.current && res.status === 200 && applied, JSON.stringify(during));
  ok("§12 D9 ⛔ while PREVIOUS is set a third value, an absent token and an empty one are still refused",
    !during.third && !during.none && !during.empty, JSON.stringify(during));
  ok("§12 D9 ⭐ with PREVIOUS unset only the current secret works: the old one, a third value and an absent or empty token are each refused",
    unset.current && !unset.old && !unset.third && !unset.none && !unset.empty, JSON.stringify(unset));
  ok("§12 D9 ⛔ a PREVIOUS shorter than 16 characters, or set empty, is never compared: neither it nor an absent token gets in, and the current still does",
    !short.value && !short.none && short.current && !blank.none && !blank.empty && blank.current, `${JSON.stringify(short)} ${JSON.stringify(blank)}`);
  const sentence = "[sms] WARNING: BLACKBALL_WEBHOOK_SECRET_PREVIOUS is set — remove it once Blackball's callback URL carries the new secret.";
  const said = previousWebhookSecretWarning(OLD);
  const saidShort = previousWebhookSecretWarning(SHORT) ?? "";
  ok("§12 D9 boot says the exact sentence while PREVIOUS is set, says too that a short one is never accepted, and says nothing once it is gone",
    said === sentence && saidShort.startsWith(sentence) && saidShort.includes("shorter than 16 characters")
      && previousWebhookSecretWarning(undefined) === null && previousWebhookSecretWarning("") === null,
    JSON.stringify(said));
}

// ── D10 · the reply ───────────────────────────────────────────────────────────────────────────────
ok(`§12 D10 the reply stays exactly {"status":"Ok"} for a campaign receipt, for one the door refused and for a batch`,
  bodies12.length === 3 && bodies12.every((b) => b === '{"status":"Ok"}'), JSON.stringify(bodies12));

console.log(`\nsms-dlr: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
