/**
 * test:sms-cost-guard — the SMS credit floor, and the balance reading it runs on.
 *
 * ⭐ WHAT THE FLOOR IS FOR. Below `SMS_BALANCE_FLOOR_TZS`, INVITE/OPS traffic is held so the
 * remaining float is kept for login codes. OTP is never refused on cost: once phone-code login is
 * on, refusing a login code to save TZS 6 is a self-inflicted outage.
 *
 * 🔴 WHY THIS SUITE EXISTS, AND WHY IT WAS WRITTEN LATE. It was in the integration plan and was
 * not built, so the floor shipped unguarded — and re-reading it against the live measurements
 * found a latch. Blackball validates BEFORE it authenticates, so a refused reply (bad
 * credentials, a schema complaint) answers `balance: 0.0` without ever identifying the account.
 * The facade recorded that as the balance: one auth failure stored TZS 0, tripped the floor, and
 * refused every INVITE send — which are refused before any request is made, so no fresh reading
 * could ever arrive to clear it. §2 and §3 are the assertions that latch cannot come back.
 *
 * ⛔ EVERY REFUSAL HAS A CONTROL: §0 shows the same batch sending when nothing is wrong, so a
 * suite that refuses everything cannot pass.
 *
 * 2026-09-26 (owner rulings D7/D8): §4b/§4c the alarm survives a restart and reaches a person, §7 the one
 * refresh path (budget, shared request, remembered failure and why it failed, stale figures marked), §8 who calls it, §9 the
 * admin tile's every state. Red plants: `scripts/anchors/sms-cost-guard.anchors.mjs`.
 *
 * 2026-09-27 (re-review): §4b a restart that finds the floor crossed alarms, §4c only officers who can open the page,
 * §4d the floor is a crossing too, §4e a new low spell after a top-up is told across a restart, §7 "refused" only for
 * a credential verdict and a late read never overwrites a newer one, §8 the rail's words, §9 never "Healthy" on a rail
 * that cannot send, the state sentence as prose, the reason kept after a first reading, the clock pinned to EAT.
 *
 * 2026-09-27 (final visual review): §8/§9 the provenance is its own line under the figure, the refused keys are both
 * named whole, the chip is one fact, "Healthy" names the alert line, a stale figure under the floor is danger, and the
 * clock's month comes from a fixed list (a newer ICU spelt September "Sept" and turned §9 red on one machine).
 *
 * 2026-10-07 (U49a, ENGINE-SPEC §4.12 decision 1): §10 `sendBatch`'s optional `minimumBalanceTzs`, the credit kept for
 * login and withdrawal codes. ⭐ An all-MARKETING batch on a confirmed reading below it is held MARKETING_FLOOR while a
 * login code in the same state sends (alone, or beside marketing); a top-up is honoured within the re-check, and a
 * missing or stale reading asked for that comes back low holds the batch; unknown is not low there (the engine fails
 * closed); a malformed option holds the batch. Every case above passes no option and is unchanged: that is today's
 * behaviour, byte for byte. Its plants are in the anchors file too.
 *
 * Run: npm run test:sms-cost-guard
 */
import { readFileSync } from "node:fs";
import { sendBatch, smsBalanceSnapshot, refreshSmsBalance, smsRailProblem, smsConfigured, type SmsBalanceRead, type SmsRailProblem } from "../src/lib/server/sms.ts";
import { db } from "../src/lib/server/store.ts";
import { getAuditPage, auditPending } from "../src/lib/server/audit.ts";
import { smsCreditTile, eatClock, type SmsCreditTile } from "../src/app/admin/system/sms-credit-tile.ts";

// §4c reads the officer's email from the outbox, never from a log line. Read at send time, so setting it here works.
process.env.EMAIL_OUTBOX_CAPTURE = "1";

let pass = 0,
  fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

process.env.SMS_PROVIDER = "blackball";
process.env.SMS_SENDER_ID = "50pick";
process.env.BLACKBALL_CLIENT_ID = "cid";
process.env.BLACKBALL_CLIENT_SECRET = "csec";
delete process.env.SMS_BALANCE_FLOOR_TZS; // default 50
delete process.env.SMS_BALANCE_ALERT_TZS; // default 150
delete process.env.SMS_BALANCE_TTL_MS; // default 15 minutes

const settle = () => new Promise((r) => setTimeout(r, 25));
/** Poll a condition for up to `ms` — an alarm's officer notice lands through a lazy import. */
const until = async (cond: () => boolean | Promise<boolean>, ms = 3_000): Promise<boolean> => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await cond()) return true; await settle(); }
  return cond();
};
const lowAlarms = () => getAuditPage({ limit: 20_000 }).filter((a) => a.action === "sms.balance_low").length;
const recoveries = () => getAuditPage({ limit: 20_000 }).filter((a) => a.action === "sms.balance_recovered").length;
/** Every queued audit row stamped: a restart's fire-and-forget alarm must not land after a count is taken. */
const quiet = async () => { await until(() => auditPending() === 0, 2_000); await settle(); };
/** A restart, as the balance sees one: no reading, no request in flight, no remembered failure. */
const resetBalance = () => { globalThis.__50PICK_SMS_BALANCE = undefined; globalThis.__50PICK_SMS_BALANCE_READ = undefined; };

/** Every stubbed reply is a real gateway shape. `calls` counts SEND requests; `balanceCalls` counts
 *  reads of `POST /api/account/balance`, which cost nothing and can never send. */
let calls = 0;
let balanceCalls = 0;
let reply: () => Response = () => new Response("{}");
/** Captured verbatim from the live balance endpoint with bad credentials, 2026-09-16. */
const balanceRefused = () =>
  new Response(JSON.stringify({ status: false, message: "Invalid credentials used", data: null, balance: 0.0 }), { status: 400 });
const balanceIs = (balance: number) => () =>
  new Response(JSON.stringify({ status: true, message: "Account balance", data: { currency: "TZS" }, balance }), { status: 200 });
let balanceReply: () => Response = balanceRefused;
/** While set, a balance read hangs until it resolves — a slow or hanging vendor (§7). */
let balanceGate: Promise<void> | null = null;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("/api/account/balance")) {
    balanceCalls++;
    if (balanceGate) await balanceGate;
    return balanceReply();
  }
  if (!url.includes("/api/sms/send")) return new Response("{}", { status: 200 }); // never a gateway send
  calls++;
  return reply();
}) as typeof fetch;

/** The officer a low-balance alarm must reach (§4c), and one it must not: COMPLIANCE holds no `ops` view by default,
 *  so /admin/system — where the alarm sends them — would refuse them. */
const OFFICER = "scg_officer";
const OFFICER_EMAIL = "scg.officer@test.tz";
const COMPLIANCE_OFFICER = "scg_compliance";
const COMPLIANCE_EMAIL = "scg.compliance@test.tz";
const mkOfficer = async (id: string, phoneE164: string, email: string, role: "ADMIN" | "COMPLIANCE") => {
  const nowIso = new Date().toISOString();
  await db.user.create({
    id, phoneE164, email,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
  } as never);
};
await mkOfficer(OFFICER, "+255780000901", OFFICER_EMAIL, "ADMIN");
await mkOfficer(COMPLIANCE_OFFICER, "+255780000902", COMPLIANCE_EMAIL, "COMPLIANCE");
const officerBells = async () =>
  (await db.notification.findByUser(OFFICER, 200)).filter((n) => n.kind === "SECURITY" && n.href === "/admin/system");
const mailTo = (to: string) =>
  ((globalThis as { __50PICK_EMAIL_OUTBOX?: { to: string; subject: string; tag?: string }[] }).__50PICK_EMAIL_OUTBOX ?? [])
    .filter((e) => e.tag === "sms-credit-low" && e.to === to);
const officerMail = () => mailTo(OFFICER_EMAIL);
const accepted = (balance: number) => () =>
  new Response(JSON.stringify({ status: true, message: "Successfully submitted 1 message(s) to broker.", data: null, balance }), { status: 200 });
/** Captured verbatim from the live gateway, 2026-09-16. */
const authRefused = () =>
  new Response(JSON.stringify({ status: false, message: "Invalid credentials", data: null, balance: 0.0 }), { status: 400 });

const invite = (n = 1) => Array.from({ length: n }, (_, i) => ({ to: `+25577261961${i}`, body: "invite", purpose: "INVITE" as const }));
const otp = () => [{ to: "+255772619619", body: "Msimbo 50pick: 123456", purpose: "OTP" as const }];

/* ══ §0 · CONTROL — nothing wrong, the batch sends ═══════════════════════════ */
{
  resetBalance();
  reply = accepted(244);
  calls = 0;
  const r = await sendBatch(invite());
  ok("§0 control: with no reading at all, an INVITE batch sends", !r.refused && calls === 1 && r.results[0]?.ok === true,
    `refused=${r.refused} calls=${calls}`);
  ok("§0 control: an accepted reply records its balance", smsBalanceSnapshot().tzs === 244);
}

/* ══ §4b · A RESTART DOES NOT SWALLOW A LOW BALANCE ═════════════════════════ */
// ⚠️ Runs BEFORE any other low reading in this file: it needs a chain with no recent alarm in it.
// The reading lives in the process, so after every deploy there is no "previous" figure — and a balance that
// crossed the line while nothing was watching never alarmed at all.
{
  resetBalance();
  await settle();
  const base = lowAlarms();
  const bellsBefore = (await officerBells()).length;
  reply = accepted(120); // at or below the TZS 150 alert line, and the FIRST reading of this "process"
  await sendBatch(otp());
  await until(() => lowAlarms() >= base + 1);
  ok("§4b a first reading after a restart already at or below the alert line raises ONE alarm", lowAlarms() === base + 1,
    `${base} -> ${lowAlarms()}`);

  /* ══ §4c · …AND THE ALARM REACHES A PERSON ═══════════════════════════════ */
  // It was an audit row nothing read, under a comment saying officers were alarmed.
  await until(async () => (await officerBells()).length > bellsBefore && officerMail().length > 0, 5_000);
  const bell = (await officerBells())[0];
  ok("§4c the alarm reaches the officers: a SECURITY bell row that links to /admin/system",
    (await officerBells()).length === bellsBefore + 1 && /TZS 120/.test(bell?.titleEn ?? ""), bell?.titleEn ?? "no bell row");
  ok("§4c …and an email to the officer's own address", officerMail().length === 1, `${officerMail().length} email(s)`);
  // ⛔ …and only to officers who can OPEN the page it links to (2026-09-27): the default grants give COMPLIANCE no
  // `ops` view, so a compliance officer was told "top up now" and sent to a page that refused them.
  await settle();
  const complianceBells = (await db.notification.findByUser(COMPLIANCE_OFFICER, 200)).filter((n) => n.href === "/admin/system");
  ok("§4c ⛔ …and never to an officer whose role cannot open that page: no bell, no email for compliance",
    complianceBells.length === 0 && mailTo(COMPLIANCE_EMAIL).length === 0,
    `${complianceBells.length} bell(s), ${mailTo(COMPLIANCE_EMAIL).length} email(s)`);
  const { rolesThatCanOpen } = await import("../src/lib/server/notification-service.ts");
  const audience = {
    system: await rolesThatCanOpen("/admin/system"),
    aml: await rolesThatCanOpen("/admin/aml"),
    roles: await rolesThatCanOpen("/admin/roles"),
  };
  ok("§4c the recipients are the page's own audience: the Owner for System, compliance too for a compliance page, the Owner alone for an Owner-only page",
    JSON.stringify(audience.system) === '["ADMIN"]' && audience.aml.includes("ADMIN") && audience.aml.includes("COMPLIANCE")
      && JSON.stringify(audience.roles) === '["ADMIN"]',
    JSON.stringify(audience));

  // A second restart while the balance is still low is not a new crossing.
  resetBalance();
  reply = accepted(110);
  await sendBatch(otp());
  await until(() => lowAlarms() > base + 1, 400);
  ok("§4b …and a second restart inside a day does not raise it again: a restart is not a crossing", lowAlarms() === base + 1,
    `${base} -> ${lowAlarms()}`);

  // …but a restart that finds the balance BELOW THE FLOOR since an alert-line alarm is new news: invites have paused.
  resetBalance();
  reply = accepted(30);
  await sendBatch(otp());
  await until(() => lowAlarms() > base + 1);
  ok("§4b …but a restart that finds it below the FLOOR after an alert-line alarm raises the floor's alarm", lowAlarms() === base + 2,
    `${base} -> ${lowAlarms()}`);
}

/* ══ §1 · THE FLOOR — campaigns held, login codes never ══════════════════════ */
{
  resetBalance();
  reply = accepted(30); // under the TZS 50 floor
  await sendBatch(otp());
  ok("§1 setup: a real accepted reading under the floor", smsBalanceSnapshot().belowFloor === true, JSON.stringify(smsBalanceSnapshot()));

  reply = accepted(30);
  calls = 0;
  const held = await sendBatch(invite(2));
  ok("§1 under the floor, an INVITE batch is REFUSED with BALANCE_FLOOR", held.refused === "BALANCE_FLOOR", String(held.refused));
  ok("§1 …before any request is made", calls === 0, `calls=${calls}`);
  ok("§1 …and every message in it is reported refused, never sent", held.results.length === 2 && held.results.every((x) => !x.ok && x.code === "BALANCE_FLOOR"));

  calls = 0;
  const code = await sendBatch(otp());
  ok("§1 ⭐ under the SAME floor, an OTP still sends", !code.refused && calls === 1 && code.results[0]?.ok === true,
    `refused=${code.refused} calls=${calls}`);
}

/* ══ §2 · 🔴 A REFUSAL'S balance:0.0 IS NOT THE ACCOUNT'S BALANCE ════════════ */
{
  resetBalance();
  reply = accepted(244);
  await sendBatch(otp());
  ok("§2 setup: a healthy reading of TZS 244", smsBalanceSnapshot().tzs === 244);

  reply = authRefused;
  const refused = await sendBatch(otp());
  ok("§2 setup: the gateway refused the send", refused.results[0]?.ok === false);
  ok("§2 ⛔ the refusal's balance 0.0 is NOT recorded", smsBalanceSnapshot().tzs === 244, `tzs=${smsBalanceSnapshot().tzs}`);
  ok("§2 ⛔ …so the floor is not tripped by an auth failure", smsBalanceSnapshot().belowFloor === false);

  // The latch itself: after the outage ends, campaigns must still flow.
  reply = accepted(238);
  calls = 0;
  const after = await sendBatch(invite());
  ok("§2 ⛔ after the refusal, an INVITE batch still sends: no latch", !after.refused && calls === 1, `refused=${after.refused} calls=${calls}`);

  // A refused row must not carry the false figure either.
  const row = await db.smsMessage.findByReference(refused.results[0]!.reference);
  ok("§2 the refused row stores NO balance rather than a false 0", row?.balanceTzs === null, `balanceTzs=${row?.balanceTzs}`);
}

/* ══ §3 · A STALE LOW READING IS UNKNOWN, NOT LOW ════════════════════════════ */
{
  resetBalance();
  globalThis.__50PICK_SMS_BALANCE = { tzs: 10, at: Date.now() - 16 * 60_000 }; // older than the 15-minute TTL
  const snap = smsBalanceSnapshot();
  ok("§3 a reading older than the TTL is reported stale", snap.stale === true);
  ok("§3 …and is not treated as below the floor", snap.belowFloor === false && snap.belowAlert === false);

  reply = accepted(500);
  balanceReply = balanceIs(500); // the account was topped up since that reading
  calls = 0;
  balanceCalls = 0;
  const r = await sendBatch(invite());
  ok("§3 ⛔ a stale low reading does not hold a campaign after a top-up", !r.refused && calls === 1, `refused=${r.refused} calls=${calls}`);
  ok("§3 …because the stale reading was replaced by a real balance read", balanceCalls === 1 && smsBalanceSnapshot().tzs === 500,
    `balanceCalls=${balanceCalls} tzs=${smsBalanceSnapshot().tzs}`);

  // Control: the same low reading, fresh, DOES hold it — so §3 is about staleness, not a broken floor.
  globalThis.__50PICK_SMS_BALANCE = { tzs: 10, at: Date.now() };
  calls = 0;
  balanceCalls = 0;
  const fresh = await sendBatch(invite());
  ok("§3 control: the same reading, fresh, does hold the campaign: without a balance read", fresh.refused === "BALANCE_FLOOR" && calls === 0 && balanceCalls === 0);

  // D8 · the admin card read TZS 30 five minutes ago; the account has been topped up since. Refusing is the costly
  // outcome and a read is free, so a low reading over a minute old is re-read before the floor refuses on it.
  resetBalance();
  globalThis.__50PICK_SMS_BALANCE = { tzs: 30, at: Date.now() - 5 * 60_000 };
  balanceReply = balanceIs(500);
  reply = accepted(500);
  calls = 0;
  balanceCalls = 0;
  const topped = await sendBatch(invite());
  ok("§3 ⭐ a LOW reading over a minute old is re-checked before refusing: a top-up is honoured",
    !topped.refused && calls === 1 && balanceCalls === 1 && smsBalanceSnapshot().tzs === 500,
    `refused=${topped.refused} calls=${calls} balanceCalls=${balanceCalls} tzs=${smsBalanceSnapshot().tzs}`);

  // …and a re-check that cannot read changes nothing: the low reading still holds.
  resetBalance();
  globalThis.__50PICK_SMS_BALANCE = { tzs: 30, at: Date.now() - 5 * 60_000 };
  balanceReply = balanceRefused;
  calls = 0;
  balanceCalls = 0;
  const still = await sendBatch(invite());
  ok("§3 …and a re-check that cannot read keeps the low reading: the campaign is still held",
    still.refused === "BALANCE_FLOOR" && calls === 0 && balanceCalls === 1, `refused=${still.refused} calls=${calls} balanceCalls=${balanceCalls}`);
}

/* ══ §6 · NO READING: ASK THE BALANCE ENDPOINT, NEVER GUESS ══════════════════ */
{
  // a · the endpoint says the float is low → the campaign is held before anything is sent.
  resetBalance();
  balanceReply = balanceIs(30);
  reply = accepted(30);
  calls = 0;
  balanceCalls = 0;
  const held = await sendBatch(invite());
  ok("§6 with no reading, a campaign asks the balance endpoint first", balanceCalls === 1, `balanceCalls=${balanceCalls}`);
  ok("§6 …and is held when the true balance is under the floor", held.refused === "BALANCE_FLOOR" && calls === 0, `refused=${held.refused} calls=${calls}`);

  // b · the endpoint cannot be read → unknown stays unknown, and unknown is not low.
  resetBalance();
  balanceReply = balanceRefused;
  reply = accepted(244);
  calls = 0;
  const unread = await sendBatch(invite());
  ok("§6 ⛔ an unreadable balance does NOT hold a campaign: unknown is not low", !unread.refused && calls === 1, `refused=${unread.refused} calls=${calls}`);

  // c · a login code never waits on a balance read.
  resetBalance();
  balanceReply = balanceIs(30);
  reply = accepted(30);
  balanceCalls = 0;
  calls = 0;
  const code = await sendBatch(otp());
  ok("§6 ⭐ an OTP batch makes NO balance read and still sends", balanceCalls === 0 && calls === 1 && !code.refused,
    `balanceCalls=${balanceCalls} calls=${calls}`);
  balanceReply = balanceRefused;
}

/* ══ §4 · THE LOW-BALANCE ALARM IS EDGE-TRIGGERED ════════════════════════════ */
{
  resetBalance();
  await quiet();
  const base = lowAlarms();
  for (const b of [200, 140, 130, 120]) { reply = accepted(b); await sendBatch(otp()); }
  await settle();
  ok("§4 crossing the alert line writes exactly ONE alarm, not one per send", lowAlarms() === base + 1, `${base} -> ${lowAlarms()}`);

  for (const b of [300, 100]) { reply = accepted(b); await sendBatch(otp()); }
  await settle();
  ok("§4 recovering and crossing again re-arms it: a second alarm", lowAlarms() === base + 2, `${base} -> ${lowAlarms()}`);

  // A refusal must not produce a crossing either: 0.0 from an auth failure is not "low".
  resetBalance();
  reply = accepted(400);
  await sendBatch(otp());
  await settle();
  const beforeRefusal = lowAlarms();
  reply = authRefused;
  await sendBatch(otp());
  await settle();
  ok("§4 ⛔ an auth failure's balance 0.0 raises NO low-balance alarm", lowAlarms() === beforeRefusal);
}

/* ══ §4d · CROSSING THE FLOOR ALARMS TOO, the moment invites pause (2026-09-27) ═════════════════ */
// The usual drain 160 → 140 → 40 was ONE alarm ("top up soon") and then a silent pause: only the alert line alarmed.
{
  resetBalance();
  reply = accepted(300);
  await sendBatch(otp());
  await quiet();
  const base = lowAlarms();
  const floorMail = () => officerMail().filter((e) => /below the floor/.test(e.subject)).length;
  const floorBefore = floorMail();
  for (const b of [160, 140]) { reply = accepted(b); await sendBatch(otp()); }
  await until(() => lowAlarms() >= base + 1);
  for (const b of [40, 34]) { reply = accepted(b); await sendBatch(otp()); }
  await until(() => lowAlarms() >= base + 2 && floorMail() > floorBefore, 5_000);
  await quiet();
  ok("§4d crossing the FLOOR raises its own alarm once: 160, 140, 40, 34 is two alarms", lowAlarms() === base + 2,
    `${base} -> ${lowAlarms()}`);
  const row = getAuditPage({ limit: 20_000 }).find((a) => a.action === "sms.balance_low" && (a.payload as { to?: number } | undefined)?.to === 40);
  ok("§4d …and says so: the row is level floor, and the officer's email is the below-the-floor one",
    (row?.payload as { level?: string } | undefined)?.level === "floor" && floorMail() === floorBefore + 1,
    `${JSON.stringify(row?.payload)} · ${floorBefore} -> ${floorMail()} floor email(s)`);
}

/* ══ §4e · A NEW LOW SPELL AFTER A TOP-UP IS TOLD, EVEN WHEN A RESTART FINDS IT (2026-09-27) ═════════ */
// Any sms.balance_low under a day old used to silence the boot check, and a recovery wrote nothing durable, so a second
// low spell that spanned a deploy was never announced.
{
  resetBalance();
  reply = accepted(300);
  await sendBatch(otp());
  await quiet();
  const base = lowAlarms();
  reply = accepted(140);
  await sendBatch(otp());
  await until(() => lowAlarms() >= base + 1);
  await quiet();
  const before = recoveries();
  reply = accepted(1_000); // the top-up
  await sendBatch(otp());
  await until(() => recoveries() > before);
  resetBalance(); // a push to main
  reply = accepted(130);
  await sendBatch(otp());
  await until(() => lowAlarms() >= base + 2);
  ok("§4e a new low spell after a top-up is announced even when a restart finds it", lowAlarms() === base + 2,
    `${base} -> ${lowAlarms()}`);
  ok("§4e …because the recovery was written down: one sms.balance_recovered row for the top-up", recoveries() === before + 1,
    `${before} -> ${recoveries()}`);
}

/* ══ §5 · A REFUSED BATCH LEAVES NO ROWS ═════════════════════════════════════ */
{
  resetBalance();
  globalThis.__50PICK_SMS_BALANCE = { tzs: 10, at: Date.now() };
  const before = (await db.smsMessage.listRecent(10_000)).length;
  await sendBatch(invite(3));
  const after = (await db.smsMessage.listRecent(10_000)).length;
  ok("§5 a batch held by the floor writes no SmsMessage rows (nothing was attempted)", after === before, `${before} -> ${after}`);
}

/* ══ §7 · THE OPERATOR'S LIVE READ — `refreshSmsBalance` (admin System page, 2026-09-26) ═══════ */
// After a restart the in-process reading is empty and the admin card showed no balance at all. The live
// read is the SAME free, authenticated endpoint `sendBatch` refreshes from, recorded in the SAME snapshot.
// ⚠️ Labels here carry no " — ": the red harness reads a FAIL line's label up to the first one.
{
  resetBalance();
  balanceReply = balanceIs(185);
  balanceCalls = 0; calls = 0;
  const first = await refreshSmsBalance();
  ok("§7 with no reading, the live read asks the balance endpoint and returns the account's figure",
    first.tzs === 185 && first.outcome === "fresh" && !first.stale && balanceCalls === 1, `got ${JSON.stringify(first)}, ${balanceCalls} read(s)`);
  ok("§7 …and records it in the ONE snapshot the floor and the admin card both read", smsBalanceSnapshot().tzs === 185);
  ok("§7 ⛔ …and it SENDS nothing: the balance endpoint is the only request", calls === 0, `${calls} send request(s)`);
  const again = await refreshSmsBalance();
  ok("§7 a reading under a minute old is reused: a page render cannot hammer the vendor",
    again.tzs === 185 && again.outcome === "reused" && balanceCalls === 1, `${balanceCalls} read(s)`);

  resetBalance();
  balanceReply = balanceRefused;
  balanceCalls = 0;
  const refused = await refreshSmsBalance();
  ok("§7 ⛔ a REFUSED read records nothing: its 0.0 is not the account's balance, and unknown is never low",
    refused.tzs === null && refused.outcome === "failed" && smsBalanceSnapshot().tzs === null && !smsBalanceSnapshot().belowFloor,
    `got ${JSON.stringify(refused)}`);
  const retry = await refreshSmsBalance();
  ok("§7 a read that failed moments ago is not repeated: a reload cannot re-pay a failing vendor",
    retry.outcome === "failed" && balanceCalls === 1, `${balanceCalls} read(s), ${retry.outcome}`);
  // The balance read is the one free live credential check: its verdict is kept, never flattened to "failed".
  ok("§7 a refused read says REFUSED, so the card can tell wrong credentials from an outage",
    refused.error === "refused" && retry.error === "refused", `${refused.error}/${retry.error}`);

  // …and a vendor that does not answer, or answers with its own 5xx, is an outage, never "wrong credentials".
  resetBalance();
  balanceReply = () => { throw new TypeError("fetch failed"); };
  const down = await refreshSmsBalance();
  resetBalance();
  balanceReply = () => new Response("<html>502 Bad Gateway</html>", { status: 502 });
  const bad = await refreshSmsBalance();
  ok("§7 no response, or the vendor's own 5xx, says UNREACHABLE: an outage never reads as wrong credentials",
    down.outcome === "failed" && down.error === "unreachable" && bad.outcome === "failed" && bad.error === "unreachable" && smsBalanceSnapshot().tzs === null,
    `${down.error}/${bad.error}`);
  const good = { outcome: first.outcome, error: first.error };
  ok("§7 control: a read that landed carries no error", good.outcome === "fresh" && good.error === null, JSON.stringify(good));

  // ⛔ "refused" is a verdict on our KEYS, and the operator answers it by rotating them (2026-09-27). A moved endpoint's
  // 404 page, or a 200 whose balance we cannot read, says nothing about the keys; a rate limit is an outage.
  resetBalance();
  balanceReply = () => new Response("<html>404 Not Found</html>", { status: 404 });
  const moved = await refreshSmsBalance();
  resetBalance();
  balanceReply = () => new Response(JSON.stringify({ status: true, message: "Account balance", data: { currency: "TZS" }, balance: "185" }), { status: 200 });
  const unreadable = await refreshSmsBalance();
  ok("§7 a moved endpoint or a reply we cannot read says UNEXPECTED, never wrong credentials",
    moved.outcome === "failed" && moved.error === "unexpected" && unreadable.outcome === "failed" && unreadable.error === "unexpected"
      && smsBalanceSnapshot().tzs === null,
    `${moved.error}/${unreadable.error}`);
  resetBalance();
  balanceReply = () => new Response(JSON.stringify({ status: false, message: "Too many requests" }), { status: 429 });
  const limited = await refreshSmsBalance();
  ok("§7 a rate limit is an outage, never wrong credentials", limited.outcome === "failed" && limited.error === "unreachable", String(limited.error));
  balanceReply = balanceRefused;

  // A failure with an EARLIER reading: the old figure comes back marked stale, its time untouched.
  resetBalance();
  const seededAt = Date.now() - 16 * 60_000;
  globalThis.__50PICK_SMS_BALANCE = { tzs: 30, at: seededAt };
  const old = await refreshSmsBalance();
  ok("§7 ⛔ a failed read with an earlier reading returns it as STALE, with its own time",
    old.outcome === "failed" && old.tzs === 30 && old.stale === true && old.at === seededAt, JSON.stringify(old));

  // Two tabs, or a render and a send, at once.
  resetBalance();
  balanceReply = balanceIs(185);
  balanceCalls = 0;
  let release: () => void = () => {};
  balanceGate = new Promise<void>((r) => { release = r; });
  const a = refreshSmsBalance();
  const b = refreshSmsBalance();
  await settle();
  release();
  const [ra, rb] = await Promise.all([a, b]);
  balanceGate = null;
  ok("§7 two concurrent reads share ONE request", balanceCalls === 1 && ra.outcome === "fresh" && rb.outcome === "fresh",
    `${balanceCalls} read(s), ${ra.outcome}/${rb.outcome}`);

  // A vendor that answers after 1.5 s, read under a 100 ms budget.
  resetBalance();
  balanceReply = balanceIs(170);
  balanceGate = new Promise<void>((r) => { release = r; });
  const answers = setTimeout(() => release(), 1_500);
  const t0 = Date.now();
  const slow = await refreshSmsBalance({ budgetMs: 100 });
  const waited = Date.now() - t0;
  ok("§7 ⛔ a slow vendor cannot hold a render: the read returns within its budget",
    slow.outcome === "pending" && slow.tzs === null && waited < 1_000, `${waited} ms, ${JSON.stringify(slow)}`);
  await until(() => smsBalanceSnapshot().tzs === 170, 4_000);
  ok("§7 …and the read carries on and records the figure when it lands", smsBalanceSnapshot().tzs === 170, `tzs=${smsBalanceSnapshot().tzs}`);
  clearTimeout(answers);
  balanceGate = null;

  // ⛔ A LATE READ NEVER OVERWRITES A NEWER READING (2026-09-27): a send reply that lands while a balance read is in
  // flight is newer, and the old figure used to replace it — re-arming the alarm, or undoing a top-up.
  resetBalance();
  balanceReply = balanceIs(152);
  balanceGate = new Promise<void>((r) => { release = r; });
  const late = refreshSmsBalance();
  await settle();
  reply = accepted(146);
  await sendBatch(otp());
  release();
  await late;
  balanceGate = null;
  ok("§7 a read that lands late never overwrites a newer reading", smsBalanceSnapshot().tzs === 146, `tzs=${smsBalanceSnapshot().tzs}`);
  balanceReply = balanceRefused;
}

/* ══ §10 · U49a · THE CREDIT KEPT FOR LOGIN AND WITHDRAWAL CODES, `minimumBalanceTzs` (2026-10-07) ═════════════════ */
// ENGINE-SPEC §4.12 decision 1 / E16: the campaign engine's LAST line, ADDITIVE to the platform floor. It judges only a
// batch whose every message is MARKETING, and only when the caller asks for it; with no option, every case above is
// today's behaviour unchanged. TZS 15,000 sits far above the TZS 50 floor and the TZS 150 alert line (so it raises no
// alarm) and below the TZS 20,000 kept for codes by default (OD63). Placed after §7 so no alarm count runs after it.
// ⚠️ Labels here carry no spaced dash: the red harness reads a FAIL line's label up to the first one.
{
  const KEPT = { minimumBalanceTzs: 20_000 };
  const marketing = (n = 1) =>
    Array.from({ length: n }, (_, i) => ({ to: `+25577261962${i}`, body: "Ofa ya 50pick", purpose: "MARKETING" as const }));
  /** A reading the snapshot holds, `ageMs` old, set directly as a send reply or the admin card would have left it. */
  const holding = (tzs: number, ageMs = 0) => { resetBalance(); globalThis.__50PICK_SMS_BALANCE = { tzs, at: Date.now() - ageMs }; };
  const rowCount = async () => (await db.smsMessage.listRecent(10_000)).length;

  // Control: no option (and an empty one) is today's send path, the platform floor alone judging.
  holding(15_000);
  reply = accepted(15_000);
  calls = 0;
  const plain = await sendBatch(marketing());
  holding(15_000);
  const empty = await sendBatch(marketing(), {});
  ok("§10 control: with no option a MARKETING batch at TZS 15,000 sends as it always has, the platform floor alone judging it",
    !plain.refused && !empty.refused && calls === 2 && plain.results[0]?.ok === true && empty.results[0]?.ok === true,
    `refused=${plain.refused}/${empty.refused} calls=${calls}`);

  // ⭐ The plan's RED, this file's half: the same batch, with the credit kept for codes asked for.
  holding(15_000);
  calls = 0;
  balanceCalls = 0;
  const rowsBefore = await rowCount();
  const held = await sendBatch(marketing(2), KEPT);
  const rowsAfter = await rowCount();
  ok("§10 ⭐ below the credit kept for codes a MARKETING batch is REFUSED MARKETING_FLOOR before any request, every message reported refused and no row written",
    held.refused === "MARKETING_FLOOR" && calls === 0 && balanceCalls === 0 && rowsAfter === rowsBefore
      && held.results.length === 2 && held.results.every((x) => !x.ok && x.code === "MARKETING_FLOOR"),
    `refused=${held.refused} calls=${calls} balanceCalls=${balanceCalls} rows ${rowsBefore} -> ${rowsAfter}`);

  // ⭐ …while a login code in the SAME state sends: alone (even were a caller to pass the option), or beside marketing.
  holding(15_000);
  calls = 0;
  balanceCalls = 0;
  const code = await sendBatch(otp(), KEPT);
  const codeReads = balanceCalls;
  holding(15_000);
  const mixed = await sendBatch([...otp(), ...marketing()], KEPT);
  ok("§10 ⭐ in the SAME state an OTP batch still sends, and so does a batch carrying a login code beside marketing: the marketing floor judges only an all-MARKETING batch",
    !code.refused && code.results[0]?.ok === true && codeReads === 0
      && !mixed.refused && mixed.results.length === 2 && mixed.results.every((x) => x.ok) && calls === 2,
    `otp refused=${code.refused} reads=${codeReads} · mixed refused=${mixed.refused} · calls=${calls}`);

  // A top-up: TZS 15,000 was read five minutes ago and the account was topped up since. Refusing is the costly outcome.
  holding(15_000, 5 * 60_000);
  balanceReply = balanceIs(30_000);
  reply = accepted(30_000);
  calls = 0;
  balanceCalls = 0;
  const topped = await sendBatch(marketing(), KEPT);
  ok("§10 a LOW reading over a minute old is re-checked before the marketing floor refuses: a top-up is honoured",
    !topped.refused && calls === 1 && balanceCalls === 1 && smsBalanceSnapshot().tzs === 30_000,
    `refused=${topped.refused} calls=${calls} balanceCalls=${balanceCalls} tzs=${smsBalanceSnapshot().tzs}`);

  holding(15_000, 5 * 60_000);
  balanceReply = balanceRefused;
  calls = 0;
  balanceCalls = 0;
  const stillLow = await sendBatch(marketing(), KEPT);
  ok("§10 …and a re-check that cannot read keeps the low reading: the MARKETING batch is still held",
    stillLow.refused === "MARKETING_FLOOR" && calls === 0 && balanceCalls === 1,
    `refused=${stillLow.refused} calls=${calls} balanceCalls=${balanceCalls}`);

  // No reading at all, then a reading past the 15-minute TTL: each is ASKED for before the floor decides, and when the
  // account really is under the line, the asked-for reading holds the batch (U49a review: the read that comes back LOW).
  resetBalance();
  balanceReply = balanceIs(15_000);
  reply = accepted(15_000);
  calls = 0;
  balanceCalls = 0;
  const askedLow = await sendBatch(marketing(), KEPT);
  holding(30_000, 16 * 60_000);
  const staleThenLow = await sendBatch(marketing(), KEPT);
  ok("§10 a missing or stale reading is asked for first, and a credit that comes back below the line holds the MARKETING batch",
    askedLow.refused === "MARKETING_FLOOR" && staleThenLow.refused === "MARKETING_FLOOR" && calls === 0 && balanceCalls === 2
      && smsBalanceSnapshot().tzs === 15_000,
    `refused=${askedLow.refused}/${staleThenLow.refused} calls=${calls} balanceCalls=${balanceCalls} tzs=${smsBalanceSnapshot().tzs}`);
  balanceReply = balanceRefused;

  // ⛔ Unknown is not low INSIDE sendBatch: failing closed is the engine's (its slice pauses credit_unreadable first).
  resetBalance();
  balanceReply = balanceRefused;
  reply = accepted(15_000);
  calls = 0;
  const unread = await sendBatch(marketing(), KEPT);
  holding(10_000, 16 * 60_000); // past the 15-minute TTL: a stale reading
  const stale = await sendBatch(marketing(), KEPT);
  ok("§10 ⛔ an unreadable or a stale balance does NOT hold a MARKETING batch inside sendBatch: unknown is not low, the engine fails closed before it (E16)",
    !unread.refused && !stale.refused && calls === 2, `refused=${unread.refused}/${stale.refused} calls=${calls}`);

  // The line itself is not below it; and under the platform floor the floor still answers first.
  holding(20_000);
  reply = accepted(20_000);
  calls = 0;
  const atLine = await sendBatch(marketing(), KEPT);
  holding(19_999);
  const under = await sendBatch(marketing(), KEPT);
  holding(30);
  const belowFloor = await sendBatch(marketing(), KEPT);
  ok("§10 the line itself: TZS 20,000 sends and TZS 19,999 is held, and under the platform floor the batch is still BALANCE_FLOOR",
    !atLine.refused && under.refused === "MARKETING_FLOOR" && belowFloor.refused === "BALANCE_FLOOR" && calls === 1,
    `20,000 ${atLine.refused ?? "sent"} · 19,999 ${under.refused ?? "SENT"} · 30 ${belowFloor.refused ?? "SENT"} · calls=${calls}`);

  // ⛔ A malformed option never opens the rail; 0 is a figure (nothing kept) and sends.
  holding(40_000);
  reply = accepted(40_000);
  calls = 0;
  const notNumber = await sendBatch(marketing(), { minimumBalanceTzs: Number.NaN });
  const negative = await sendBatch(marketing(), { minimumBalanceTzs: -1 });
  const asText = await sendBatch(marketing(), { minimumBalanceTzs: "20000" as unknown as number });
  const zero = await sendBatch(marketing(), { minimumBalanceTzs: 0 });
  ok("§10 ⛔ a floor that is not a figure holds the MARKETING batch: a malformed option never opens the rail (and 0, a figure, sends)",
    notNumber.refused === "MARKETING_FLOOR" && negative.refused === "MARKETING_FLOOR" && asText.refused === "MARKETING_FLOOR"
      && !zero.refused && calls === 1,
    `NaN ${notNumber.refused ?? "SENT"} · -1 ${negative.refused ?? "SENT"} · text ${asText.refused ?? "SENT"} · 0 ${zero.refused ?? "sent"} · calls=${calls}`);

  balanceReply = balanceRefused;
  await quiet();
}

/* ══ §8 · WHO CALLS IT — the admin card and /api/health, each within a budget ═══════════════════ */
{
  const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const page = src("src/app/admin/system/page.tsx");
  ok("§8 the System page reads the balance live within its render budget",
    /refreshSmsBalance\(\{ maxAgeMs: 60_000, budgetMs: SMS_BALANCE_RENDER_BUDGET_MS \}\)/.test(page));
  const tile = page.match(/<AdminKpi label="SMS credit"[^\n]*\/>/)?.[0] ?? "";
  ok("§8 …and draws the tile from smsCreditTile, with no pulse and no arrow",
    /value=\{smsTile\.value\}/.test(tile) && /provenance=\{smsTile\.provenance\}/.test(tile) && /note=\{smsTile\.note\}/.test(tile)
      && /noteCode=\{smsTile\.vars\}/.test(tile) && /delta=\{smsTile\.caption\}/.test(tile) && !/pulse|deltaDir/.test(tile),
    tile || "no SMS credit tile");
  // A readable balance is not a rail that sends (2026-09-27): the tile is told why SMS cannot send, and how many failed.
  ok("§8 …and tells the tile whether SMS can send at all, and how many sends failed",
    /rail: smsRailProblem\(\)/.test(page) && /health: smsHealthSnapshot\(\)/.test(page));
  // The state sentence is prose, not the 10px grey chip (DA rule 4's 12.5px reading floor), in the state's own ink.
  const shell = src("src/components/admin/admin-shell.tsx");
  ok("§8 the state sentence is prose at the reading floor in the state's ink, never the 10px chip",
    /\{note && <p className=\{`text-body-sm break-words \$\{noteInk\}`\}>\{note\}<\/p>\}/.test(shell)
      && /const noteInk = tone === "danger" \? "text-danger" : tone === "warning" \? "text-warning-fg"/.test(shell));
  // Final visual review (2026-09-27): "last read … · couldn't refresh" at the tail of a red run-on read as today's credit,
  // and `break-words` split "BLACKBALL_CLIENT" / "_ID" at 360. The provenance is its own neutral line under the figure,
  // above the state; a Railway name is its own mono line whose only break is a <wbr> after an underscore.
  // 2026-09-30: the helper splits AFTER each underscore (`split(/(?<=_)/)`, so `test:labels` §11a no longer reads it
  // as de-underscoring); each part keeps its own underscore and the <wbr> follows it — the same output.
  const provAt = shell.indexOf("{provenance && <p className=\"text-body-sm break-words text-text-secondary\">{provenance}</p>}");
  ok("§8 the provenance is its own line under the figure, and a Railway name breaks only after an underscore",
    provAt > shell.indexOf("{value}", shell.indexOf("export function AdminKpi(")) && provAt < shell.indexOf("{note && <p")
      && /\{noteCode\.map\(\(name\) => <span key=\{name\} className="block">\{breakAfterUnderscores\(name\)\}<\/span>\)\}/.test(shell)
      && /<p className="font-mono text-body-sm break-words text-text">/.test(shell)
      && /\.split\(\/\(\?<=_\)\/\)/.test(shell) && /\? \[part, <wbr key=\{i\} \/>\] : \[part\]/.test(shell),
    `provenance line at ${provAt}`);
  // The rail's words and smsConfigured() are one function: each problem named, and "configured" only without one.
  const RAIL_ENVS = ["SMS_PROVIDER", "SMS_SENDER_ID", "BLACKBALL_CLIENT_ID"] as const;
  const saved = Object.fromEntries(RAIL_ENVS.map((k) => [k, process.env[k]])) as Record<(typeof RAIL_ENVS)[number], string | undefined>;
  const railWith = (over: Partial<Record<(typeof RAIL_ENVS)[number], string | null>>) => {
    for (const [k, v] of Object.entries(over)) { if (v === null) delete process.env[k]; else process.env[k] = v; }
    const r = { rail: smsRailProblem(), configured: smsConfigured() };
    for (const k of RAIL_ENVS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    return r;
  };
  const rails = {
    ok: railWith({}),
    noSender: railWith({ SMS_SENDER_ID: "" }),
    longSender: railWith({ SMS_SENDER_ID: "FIFTYPICKLTD1" }),
    noKeys: railWith({ BLACKBALL_CLIENT_ID: null }),
    typo: railWith({ SMS_PROVIDER: "blackbal" }),
  };
  ok("§8 smsRailProblem names why SMS cannot send, and smsConfigured agrees with it",
    rails.ok.rail === null && rails.ok.configured
      && rails.noSender.rail === "sender-id" && !rails.noSender.configured
      && rails.longSender.rail === "sender-id" && !rails.longSender.configured
      && rails.noKeys.rail === "keys-not-set" && !rails.noKeys.configured
      && rails.typo.rail === "provider-unrecognised" && !rails.typo.configured,
    JSON.stringify(rails));
  // DG-A-10 in the same band: an arrow claims a movement, and "▲ 14 entries" is a count. The word and its tone carry
  // valid/broken — on this page and on the audit log's own tile.
  const chainTile = page.match(/<AdminKpi label="Audit chain"[^\n]*\/>/)?.[0] ?? "";
  const auditChain = src("src/app/admin/audit/page.tsx").match(/label="Chain integrity"[\s\S]*?\/>/)?.[0] ?? "";
  ok("§8 the Audit chain tiles carry valid/broken by word and tone, never an arrow",
    /tone=\{chain\.valid \? "success" : "danger"\}/.test(chainTile) && !/deltaDir/.test(chainTile)
      && /tone=\{chain\.valid \? "success" : "danger"\}/.test(auditChain) && !/deltaDir/.test(auditChain),
    `${chainTile || "no system tile"} | ${auditChain ? "audit tile found" : "no audit tile"}`);
  const health = src("src/app/api/health/route.ts");
  ok("§8 /api/health refreshes the balance within a short budget",
    /refreshSmsBalance\(\{ maxAgeMs: 60_000, budgetMs: SMS_BALANCE_HEALTH_BUDGET_MS \}\)/.test(health) && /await smsRead;/.test(health));
  ok("§8 …and publishes when the figure was read, and whether it is stale",
    /balanceAt: smsBalance\.at === null \? null : new Date\(smsBalance\.at\)\.toISOString\(\)/.test(health) && /balanceStale: smsBalance\.stale/.test(health));
  // A gate not in the pipeline is not a gate: this suite shipped in test:all only, so the push checklist never ran it.
  const predeploy = (JSON.parse(src("package.json")) as { scripts: Record<string, string> }).scripts.predeploy ?? "";
  ok("§8 this suite is on the predeploy chain", /npm run test:sms-cost-guard(?![\w:-])/.test(predeploy), `${predeploy.length} chars`);
}

/* ══ §9 · THE ADMIN TILE (owner ruling D7) — the credit is the headline, the state is in words ═══ */
// 2026-09-27 (re-review): the state sentence is `note`, drawn as prose in the state's ink; the chip (`caption`) keeps the
// plain facts. "Healthy" only when SMS can go out, and a dead rail says the consequence and the fix.
// 2026-09-27 (final visual review): when and how an unconfirmed figure was read is `provenance`, its own line under the
// figure, never the tail of the note; the note is the state and the action; the Railway names a fix needs are `vars`,
// both in full; the chip is one fact with no provider; "Healthy" names the alert line; a stale figure below the floor is
// danger; the clock spells its month from a fixed list, so it reads the same on every Node/ICU.
{
  const NB = String.fromCharCode(0xa0);
  const flat = (s: string) => s.split(NB).join(" ");
  const T = { floorTzs: 50, alertTzs: 150 };
  const now = Date.now();
  const snap = (tzs: number | null, over: Partial<{ at: number; stale: boolean }> = {}) => {
    const at = tzs === null ? null : (over.at ?? now);
    const stale = over.stale ?? false;
    const live = tzs !== null && !stale;
    return { tzs, at, stale, belowAlert: live && tzs! <= 150, belowFloor: live && tzs! < 50 };
  };
  const read = (outcome: SmsBalanceRead["outcome"], error: SmsBalanceRead["error"] = null): SmsBalanceRead =>
    ({ tzs: null, at: null, outcome, stale: false, error });
  type Health = { sent: number; failed: number; successRate: number | null };
  const idle: Health = { sent: 0, failed: 0, successRate: null };
  const tileOf = (s: ReturnType<typeof snap>, r: SmsBalanceRead | null, health: Health = idle, provider = "blackball", rail: SmsRailProblem | null = null) =>
    smsCreditTile({ provider, read: r, snapshot: s, health, rail, thresholds: T, now });
  const at = (ms: number) => flat(eatClock(ms, now));
  const noteOf = (t: SmsCreditTile) => flat(t.note ?? "");
  const provOf = (t: SmsCreditTile) => flat(t.provenance ?? "");

  const unknown = tileOf(snap(null), null);
  ok("§9 unknown: a dash and the words, never a blank or a zero",
    unknown.value === "—" && noteOf(unknown) === "Couldn't read the balance" && unknown.tone === "warning"
      && flat(unknown.caption) === "0 sent since server start" && unknown.provenance === undefined,
    JSON.stringify(unknown));

  // The balance read is the one free live credential check: wrong keys must not look like an outage, nor a slow
  // vendor like a dead one.
  const why = {
    refused: tileOf(snap(null), read("failed", "refused")),
    down: tileOf(snap(null), read("failed", "unreachable")),
    keys: tileOf(snap(null), read("failed", "not-configured"), idle, "blackball", "keys-not-set"),
    odd: tileOf(snap(null), read("failed", "unexpected")),
    slow: tileOf(snap(null), read("pending")),
    stub: tileOf(snap(null), read("unavailable"), idle, "console"),
    provider: tileOf(snap(null), read("unavailable"), idle, "unrecognised", "provider-unrecognised"),
  };
  const said = Object.fromEntries(Object.entries(why).map(([k, t]) => [k, noteOf(t)])) as Record<keyof typeof why, string>;
  ok("§9 unknown says WHY: wrong credentials read differently from an outage",
    said.refused === "Blackball refused our keys · no SMS can send, login codes included · check both keys on Railway"
      && said.down === "Couldn't read the balance — no answer from Blackball"
      && said.keys === "Blackball keys not set · no SMS can send, login codes included · set both keys on Railway"
      && said.odd === "Couldn't read the balance — Blackball sent a reply we couldn't read",
    JSON.stringify(said));
  // "check BLACKBALL_CLIENT_ID / SECRET" sent the owner to search Railway for a variable called SECRET, which does not
  // exist. Both real names, whole, as their own lines (the page draws them in mono, breaking only after an underscore).
  const KEYS = ["BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET"];
  ok("§9 refused and unset keys name BOTH real Railway variables, whole",
    JSON.stringify(why.refused.vars) === JSON.stringify(KEYS) && JSON.stringify(why.keys.vars) === JSON.stringify(KEYS)
      && [why.down, why.odd, why.slow, why.stub, why.provider].every((t) => t.vars === undefined),
    JSON.stringify({ refused: why.refused.vars, keys: why.keys.vars }));
  // ⛔ No SMS can send — login codes included — is a login outage, not a hiccup: danger, the consequence and the fix.
  ok("§9 a dead rail is danger, with the consequence and the fix",
    why.refused.tone === "danger" && why.keys.tone === "danger" && why.provider.tone === "danger"
      && said.provider === "SMS provider not recognised · no SMS can send, login codes included · set SMS_PROVIDER to blackball on Railway"
      && why.down.tone === "warning" && why.odd.tone === "warning",
    JSON.stringify({ refused: why.refused.tone, keys: why.keys.tone, provider: why.provider.tone, down: why.down.tone, odd: why.odd.tone }));
  // A read still in flight records itself when it lands: not a failure, and the action is a reload.
  ok("§9 a slow vendor is not called a failure: checking, and reload in a few seconds",
    said.slow === "Checking with Blackball… · reload in a few seconds" && why.slow.tone === undefined
      && said.stub === "No balance read on Console (dev)" && why.stub.tone === undefined,
    JSON.stringify(said));
  // The dash already says "no figure"; an unread balance may well be zero, so the words make no claim about it.
  ok("§9 ⛔ an unread balance makes no claim about the amount",
    [unknown, ...Object.values(why)].every((t) => t.value === "—" && !/zero|credit left|still has/i.test(noteOf(t))),
    [unknown, ...Object.values(why)].map(noteOf).find((n) => /zero/i.test(n)) ?? "");

  // "Healthy" at TZS 185 gave no reference: the alert line it is measured against is named, as sms.ts says the card does.
  const healthy = tileOf(snap(185), read("fresh"));
  ok("§9 healthy: the CREDIT is the headline, and the state names the alert line",
    healthy.value === `TZS${NB}185` && noteOf(healthy) === "Healthy · alert at TZS 150" && flat(healthy.caption) === "0 sent since server start"
      && healthy.tone === undefined && healthy.provenance === undefined,
    JSON.stringify(healthy));

  // The chip is ONE plain fact. It named the provider the note already names, and "· Blackball" / "· idle since" /
  // "restart" wrapped at 360 into what looked like a bullet list. The counters reset on any restart of the process.
  const busy = tileOf(snap(185), read("reused"), { sent: 1234, failed: 1, successRate: 0.9992 });
  ok("§9 healthy with traffic: the counts, since server start",
    noteOf(busy) === "Healthy · alert at TZS 150" && flat(busy.caption) === "1,234 sent, 1 failed since server start", busy.caption);
  ok("§9 …and never splits inside 'N sent' or 'N failed'", busy.caption.includes(`1,234${NB}sent`) && busy.caption.includes(`1${NB}failed`), busy.caption);

  // ⛔ The balance read and the send are separate endpoints: a readable balance is not a rail that sends.
  const dark = tileOf(snap(185), read("fresh"), { sent: 0, failed: 5, successRate: 0 });
  const patchy = tileOf(snap(185), read("fresh"), { sent: 9, failed: 3, successRate: 0.75 });
  ok("§9 ⛔ never Healthy while sends fail: the failures in words, danger when none got through",
    dark.tone === "danger" && noteOf(dark) === "Sends failing — 5 of 5 failed since server start · none accepted, login codes included · check Blackball"
      && patchy.tone === "warning" && noteOf(patchy) === "Sends failing — 3 of 12 failed since server start · check Blackball"
      && ![dark, patchy].some((t) => /Healthy/.test(noteOf(t))),
    JSON.stringify({ dark: dark.note, patchy: patchy.note }));
  const noSender = tileOf(snap(185), read("fresh"), idle, "blackball", "sender-id");
  ok("§9 ⛔ never Healthy on a rail that cannot send: a readable balance with no sender ID is danger",
    noSender.value === `TZS${NB}185` && noSender.tone === "danger" && noSender.vars === undefined
      && noteOf(noSender) === "Sender ID missing or too long · no SMS can send, login codes included · check SMS_SENDER_ID on Railway",
    JSON.stringify(noSender));

  // The floor is named, and the next step is said, as the bell and the email that link here say them.
  const low = tileOf(snap(120), read("fresh"));
  ok("§9 below the alert line: the word, in warning ink",
    low.tone === "warning" && low.value === `TZS${NB}120` && noteOf(low) === "Low — top up Blackball soon · invites pause below TZS 50", JSON.stringify(low));

  const floor = tileOf(snap(30), read("fresh"));
  ok("§9 below the floor: danger, and what is paused",
    floor.tone === "danger" && noteOf(floor) === "Below the TZS 50 floor — invites paused, login codes still send · top up Blackball now", JSON.stringify(floor));

  // Past the TTL the gate treats a figure as unknown, so the headline does too: the old figure is in the note, and when
  // it was read, and why it was not refreshed, is the provenance line under the dash.
  const readAt = now - 20 * 60_000;
  const stale = tileOf(snap(185, { at: readAt, stale: true }), read("failed", "unreachable"));
  ok("§9 stale: a reading past the TTL is headlined as a dash, its figure in the note and its time under the dash",
    stale.value === "—" && stale.tone === "warning" && noteOf(stale) === "Was TZS 185"
      && provOf(stale) === `Last read ${at(readAt)} · couldn't refresh — no answer from Blackball`,
    JSON.stringify(stale));
  const staleLow = tileOf(snap(120, { at: readAt, stale: true }), read("failed", "unreachable"));
  ok("§9 …a stale LOW figure keeps its word, its action and warning ink",
    staleLow.value === "—" && staleLow.tone === "warning" && noteOf(staleLow) === "Was TZS 120, low · top up soon",
    JSON.stringify(staleLow));
  // Unknown is not low, so on an expired reading under the floor invites SEND AGAIN and eat the credit login codes
  // need: danger and "top up now" (final visual review), but never "paused", because the floor is not refusing on it.
  const staleFloor = tileOf(snap(30, { at: readAt, stale: true }), read("failed", "unreachable"));
  ok("§9 …a stale figure below the floor is danger: invites are sending again on the credit login codes need",
    staleFloor.value === "—" && staleFloor.tone === "danger" && !/paused|no longer held/.test(noteOf(staleFloor)),
    JSON.stringify(staleFloor));
  ok("§9 …and keeps the action: invites are sending again, top up now",
    noteOf(staleFloor) === "Was TZS 30, below floor · invites are sending again · top up now"
      && provOf(staleFloor) === `Last read ${at(readAt)} · couldn't refresh — no answer from Blackball`,
    staleFloor.note ?? "");
  // While a read is still running the tile makes no claim about invites, as before; the danger and the action stay.
  const staleFloorWaiting = tileOf(snap(30, { at: readAt, stale: true }), read("pending"));
  ok("§9 …and while a read is still running: no claim about invites, the danger and the action stay",
    staleFloorWaiting.tone === "danger" && noteOf(staleFloorWaiting) === "Was TZS 30, below floor · top up now"
      && provOf(staleFloorWaiting) === `Last read ${at(readAt)} · still waiting for Blackball`,
    JSON.stringify(staleFloorWaiting));
  // Inside the TTL the gate still acts on the figure, so it stays the headline, with its time on the line under it.
  const slow = tileOf(snap(185, { at: now - 3 * 60_000 }), read("pending"));
  ok("§9 …a read still in flight too: never shown as current",
    slow.value === `TZS${NB}185` && provOf(slow) === `Last read ${at(now - 3 * 60_000)} · still waiting for Blackball` && slow.note === undefined,
    JSON.stringify(slow));
  const floorStale = tileOf(snap(30, { at: now - 3 * 60_000 }), read("failed"));
  ok("§9 below the floor on a figure that could not be refreshed: the state AND its time",
    floorStale.tone === "danger" && floorStale.value === `TZS${NB}30`
      && noteOf(floorStale) === "Below the TZS 50 floor — invites paused, login codes still send · top up Blackball now"
      && provOf(floorStale) === `Last read ${at(now - 3 * 60_000)} · couldn't refresh`,
    JSON.stringify(floorStale));
  // Keys rotated on the vendor's portal after a good reading used to read "couldn't refresh" in normal ink: a blip.
  // The dead rail's sentence says why; the line under the figure keeps the time (and, under a dash, the old figure).
  const refusedLater = tileOf(snap(185, { at: now - 3 * 60_000 }), read("failed", "refused"));
  const staleRefused = tileOf(snap(185, { at: readAt, stale: true }), read("failed", "refused"));
  ok("§9 the reason survives a first reading: refused keys after a good read are danger, and a stale figure says why",
    refusedLater.tone === "danger" && refusedLater.value === `TZS${NB}185`
      && noteOf(refusedLater) === "Blackball refused our keys · no SMS can send, login codes included · check both keys on Railway"
      && JSON.stringify(refusedLater.vars) === JSON.stringify(KEYS) && provOf(refusedLater) === `Last read ${at(now - 3 * 60_000)}`
      && staleRefused.tone === "danger" && noteOf(staleRefused) === noteOf(refusedLater) && provOf(staleRefused) === `Last read ${at(readAt)} · was TZS 185`
      && provOf(stale).endsWith("couldn't refresh — no answer from Blackball"),
    JSON.stringify(refusedLater));
  // 🔴 "Below the TZS 50 floor — … · top up Blackball now · last read 20:30 EAT · couldn't refresh — no answer from
  // Blackball" was one red run-on under a big "TZS 30": the clause that said the figure was unconfirmed came fourth.
  const unconfirmed = [slow, floorStale, refusedLater, stale, staleLow, staleFloor, staleFloorWaiting, staleRefused];
  ok("§9 an unconfirmed figure says so on its own line under it: the note keeps only the state and the action",
    unconfirmed.every((t) => /^Last read /.test(provOf(t)) && !/last read|couldn't refresh|still waiting/i.test(noteOf(t))),
    unconfirmed.map(noteOf).find((n) => /last read|couldn't refresh|still waiting/i.test(n)) ?? unconfirmed.map(provOf).join(" | "));

  // A campaign top-up of a million: the full figure is 13 characters and would ellipsise in a 2-up tile at 360.
  // The exact figure is the line under the compact one (it wrapped the chip into dot-led lines at 360), and an
  // unconfirmed one adds its time after it.
  const big = tileOf(snap(1_234_567), read("fresh"));
  const bigUnconfirmed = tileOf(snap(1_234_567, { at: now - 3 * 60_000 }), read("pending"));
  const justUnder = tileOf(snap(999_999), read("fresh"));
  ok("§9 a seven-figure credit is compacted, never clipped, and the exact figure is the line under it",
    big.value === `TZS${NB}1.2M` && provOf(big) === "TZS 1,234,567" && flat(big.caption) === "0 sent since server start"
      && provOf(bigUnconfirmed) === `TZS 1,234,567 · last read ${at(now - 3 * 60_000)} · still waiting for Blackball`
      && flat(justUnder.value) === "TZS 999,999" && justUnder.provenance === undefined,
    JSON.stringify(big));

  ok("§9 a reading from another day carries its date", /[A-Z][a-z]{2}/.test(eatClock(now - 30 * 60 * 60_000, now)) && !/[A-Z][a-z]{2}/.test(eatClock(now, now).replace("EAT", "")),
    eatClock(now - 30 * 60 * 60_000, now));
  // Fixed instants, never eatClock's own output: 11:02 UTC is 14:02 in Dar es Salaam, and 20:50 UTC on the 26th is
  // 23:50 EAT that day while "now" (21:10 UTC) is already the 27th in Dar. Railway's servers run on UTC.
  // 21:00 UTC is midnight in Dar: 00, never 24.
  const clocks = [
    flat(eatClock(Date.UTC(2026, 8, 27, 11, 2), Date.UTC(2026, 8, 27, 12, 0))),
    flat(eatClock(Date.UTC(2026, 8, 26, 20, 50), Date.UTC(2026, 8, 26, 21, 10))),
    flat(eatClock(Date.UTC(2026, 8, 26, 21, 0), Date.UTC(2026, 8, 26, 21, 30))),
  ];
  ok("§9 the clock is East Africa Time, 24-hour, and a reading from the EAT day before carries its date",
    clocks[0] === "14:02 EAT" && clocks[1] === "26 Sep 23:50 EAT" && clocks[2] === "00:00 EAT", clocks.join(" | "));
  // 🔴 The assertion above went red on a newer Node whose ICU spells September "Sept": the month was Intl's own
  // name. It is the tile's fixed list now, so the clock reads the same on every box and every ICU build.
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months = MONTHS.map((_, m) => flat(eatClock(Date.UTC(2026, m, 15, 9, 0), Date.UTC(2026, m, 20, 9, 0))));
  ok("§9 the month is the same three letters on every Node and ICU build",
    months.every((c, m) => c === `15 ${MONTHS[m]} 12:00 EAT`), months.join(" | "));

  const all = [unknown, ...Object.values(why), healthy, busy, dark, patchy, noSender, low, floor, ...unconfirmed, big, bigUnconfirmed];
  const text = (t: SmsCreditTile) => [t.provenance, t.note, ...(t.vars ?? []), t.caption].filter((x) => x !== undefined).join("\n");
  ok("§9 no caption line can end on a separator: every dot is bound to the fact after it", all.every((t) => !text(t).includes("· ")),
    all.map(text).find((c) => c.includes("· ")) ?? "");
  ok("§9 no amount, count or clock breaks inside", all.every((t) => !/TZS \d|\d EAT|\d sent|\d failed/.test(`${t.value}\n${text(t)}`)),
    all.map(text).find((c) => /TZS \d|\d EAT|\d sent|\d failed/.test(c)) ?? "");
  ok("§9 ⛔ no tile claims to be live or moving", all.every((t) => !/\blive\b|▲|▼/i.test(text(t))));
  // Every tile says its state in words: the note, or (a figure that is fine but unconfirmed) the provenance alone.
  const CHIP = /^[\d,]+ sent(, [\d,]+ failed)? since server start$/;
  ok("§9 every tile says its state in words, and the chip is one plain fact: no provider, no separator",
    all.every((t) => (t.note ?? t.provenance ?? "").length > 0 && CHIP.test(flat(t.caption))),
    all.map((t) => flat(t.caption)).find((c) => !CHIP.test(c)) ?? "");
  ok("§9 no tile names a Railway variable that does not exist", all.every((t) => !/(?<!CLIENT_)SECRET/.test(text(t))),
    all.map(text).find((c) => /(?<!CLIENT_)SECRET/.test(c)) ?? "");
}

console.log(`\nsms-cost-guard: ${pass} passed, ${fail} failed`);
// ⚠️ An explicit exit either way: §4c loads the notification and email modules, and a handle either one leaves
// open must not turn a green run into a hang.
process.exit(fail > 0 ? 1 : 0);
