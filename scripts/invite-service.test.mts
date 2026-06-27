/**
 * Invite-campaign service tests (in-memory store; no DATABASE_URL).
 * Covers contact parsing, campaign CRUD, sending (console SMS), and the
 * registration → bonus binding (idempotent, source INVITE).
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import {
  classifyContact, parseContacts, createCampaign, addContacts, addContactsStructured, sendCampaign,
  bindRegistration, getCampaignDetail,
} from "../src/lib/server/invite-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function mkUser(id: string, role = "ADMIN"): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25575${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: role as never, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
}
const bonus = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;

// ── classifyContact ──────────────────────────────────────────────────────────
{
  ok("email classified", classifyContact("Jane@Example.com")?.type === "EMAIL");
  ok("email lowercased", classifyContact("Jane@Example.com")?.value === "jane@example.com");
  ok("0712 phone → E.164", classifyContact("0712345678")?.value === "+255712345678");
  ok("9-digit phone → E.164", classifyContact("712345678")?.value === "+255712345678");
  ok("garbage rejected", classifyContact("not a contact") === null);
}

// ── parseContacts ────────────────────────────────────────────────────────────
{
  const { valid, invalid } = parseContacts("jane@example.com\n0712345678,15000\nbroken\n0712345678");
  ok("2 valid (dupe removed)", valid.length === 2, `valid=${valid.length}`);
  ok("amount override parsed", valid.find((v) => v.value === "+255712345678")?.bonusAmountTzs === 15_000);
  ok("1 invalid line", invalid.length === 1, `invalid=${invalid.length}`);
}

// ── createCampaign + addContacts ─────────────────────────────────────────────
await mkUser("usr_inv_admin");
let campaignId = "";
{
  const bad = await createCampaign({ name: "", bonusAmountTzs: 10_000, messageEn: "x", messageSw: "y" }, "usr_inv_admin");
  ok("empty name rejected", !bad.ok);
  const r = await createCampaign({ name: "June Push", bonusAmountTzs: 10_000, wagerMultiplier: 5, expiresInDays: 30, messageEn: "Join us", messageSw: "Jiunge" }, "usr_inv_admin");
  ok("campaign created", r.ok);
  if (r.ok) {
    campaignId = r.campaign.id;
    ok("code generated", !!r.campaign.code && r.campaign.status === "DRAFT");
  }
  // In-upload duplicate is removed at parse time; re-adding an existing contact
  // counts as skipped on a second call.
  const add = await addContacts(campaignId, "0712000111\n0713000222\n0712000111\nbad", "usr_inv_admin");
  ok("2 added, in-upload dupe collapsed, 1 invalid", add.ok && add.added === 2 && add.skipped === 0 && add.invalid.length === 1, add.ok ? `added=${add.added} skip=${add.skipped} inv=${add.invalid.length}` : "not ok");
  const add2 = await addContacts(campaignId, "0712000111\n0799888777", "usr_inv_admin");
  ok("re-add: 1 new, 1 skipped (already on campaign)", add2.ok && add2.added === 1 && add2.skipped === 1, add2.ok ? `added=${add2.added} skip=${add2.skipped}` : "not ok");
}

// ── sendCampaign (console SMS) ───────────────────────────────────────────────
{
  const r = await sendCampaign(campaignId, "usr_inv_admin");
  ok("send ok, 3 sent", r.ok && r.sent === 3, r.ok ? `sent=${r.sent} failed=${r.failed}` : "not ok");
  const detail = await getCampaignDetail(campaignId);
  ok("campaign marked SENT", detail?.campaign.status === "SENT");
  ok("all entries SENT", (detail?.counts.SENT ?? 0) === 3, `sent=${detail?.counts.SENT}`);
}

// ── bindRegistration grants bonus + idempotent ───────────────────────────────
{
  const campaign = (await getCampaignDetail(campaignId))!.campaign;
  await mkUser("usr_inv_recruit", "PLAYER");
  // Use the phone matching one of the entries so the entry is marked REGISTERED.
  const r1 = await bindRegistration("usr_inv_recruit", campaign.code, { phone: "+255712000111" });
  ok("bonus granted", r1?.grantedTzs === 10_000, `granted=${r1?.grantedTzs}`);
  ok("bonus wallet credited 10,000", (await bonus("usr_inv_recruit")) === 10_000, `bonus=${await bonus("usr_inv_recruit")}`);
  const detail = await getCampaignDetail(campaignId);
  ok("entry marked REGISTERED", (detail?.counts.REGISTERED ?? 0) === 1, `reg=${detail?.counts.REGISTERED}`);
  ok("campaign totalRegistered = 1", detail?.campaign.totalRegistered === 1, `tr=${detail?.campaign.totalRegistered}`);
  // Idempotent — same user again does not double-grant.
  await bindRegistration("usr_inv_recruit", campaign.code, { phone: "+255712000111" });
  ok("no double bonus on re-bind", (await bonus("usr_inv_recruit")) === 10_000, `bonus=${await bonus("usr_inv_recruit")}`);
  // Unknown code → null, no grant.
  const r3 = await bindRegistration("usr_inv_recruit", "NOPE9999");
  ok("unknown code → null", r3 === null);
}

// ── addContactsStructured (separate email/phone fields) ──────────────────────
{
  const r = await createCampaign({ name: "Structured", bonusAmountTzs: 5_000, messageEn: "x", messageSw: "y" }, "usr_inv_admin");
  const cid = r.ok ? r.campaign.id : "";
  const res = await addContactsStructured(cid, [
    { email: "a@x.com" },                            // email only → 1 entry
    { phone: "0712111222" },                         // phone only → 1 entry
    { email: "Both@X.com", phone: "0713222333" },    // both → 2 entries (one per channel)
    { },                                             // neither → invalid
    { email: "not-an-email" },                       // invalid
    { email: "a@x.com" },                            // dupe of first → skipped
  ], "usr_inv_admin");
  ok("structured: 4 added (both-row → 2)", res.ok && res.added === 4, res.ok ? `added=${res.added}` : "not ok");
  ok("structured: 1 skipped (dupe)", res.ok && res.skipped === 1, res.ok ? `skip=${res.skipped}` : "not ok");
  ok("structured: 2 invalid (empty + bad email)", res.ok && res.invalid === 2, res.ok ? `inv=${res.invalid}` : "not ok");
  const detail = await getCampaignDetail(cid);
  ok("structured: 4 entries on campaign", detail?.entries.length === 4, `entries=${detail?.entries.length}`);
  ok("structured: email lowercased + normalized phone", !!detail?.entries.find((e) => e.contactValue === "both@x.com") && !!detail?.entries.find((e) => e.contactValue === "+255713222333"));
  // Per-invitee amount override applies to both channels of a row.
  const res2 = await addContactsStructured(cid, [{ email: "vip@x.com", phone: "0715444555", bonusAmountTzs: 25_000 }], "usr_inv_admin");
  ok("structured: override row adds 2", res2.ok && res2.added === 2);
  const d2 = await getCampaignDetail(cid);
  ok("structured: per-invitee amount applied", (d2?.entries.filter((e) => e.bonusAmountTzs === 25_000).length ?? 0) === 2);
}

// ── SMS-pending honesty: no live SMS → phone stays QUEUED, never false SENT ──
{
  const r = await createCampaign({ name: "Pending", bonusAmountTzs: 5_000, messageEn: "x", messageSw: "y" }, "usr_inv_admin");
  const cid = r.ok ? r.campaign.id : "";
  await addContactsStructured(cid, [{ email: "p@x.com", phone: "0716555666" }], "usr_inv_admin");
  // Select a real provider with NO API key → smsConfigured() is false.
  process.env.SMS_PROVIDER = "selcom";
  const sent = await sendCampaign(cid, "usr_inv_admin");
  ok("pending: email sent, phone pending, none failed", sent.ok && sent.sent === 1 && sent.pending === 1 && sent.failed === 0, sent.ok ? `sent=${sent.sent} pending=${sent.pending} failed=${sent.failed}` : "not ok");
  const detail = await getCampaignDetail(cid);
  ok("pending: phone entry stays QUEUED (not falsely SENT)", (detail?.counts.QUEUED ?? 0) === 1, `queued=${detail?.counts.QUEUED}`);
  ok("pending: email entry SENT", (detail?.counts.SENT ?? 0) === 1, `sent=${detail?.counts.SENT}`);
  delete process.env.SMS_PROVIDER;
}

console.log(`\ninvite-service: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
