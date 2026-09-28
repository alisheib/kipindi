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
 * Run: npm run test:sms-cost-guard
 */
import { sendBatch, smsBalanceSnapshot, refreshSmsBalance } from "../src/lib/server/sms.ts";
import { db } from "../src/lib/server/store.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";

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
const lowAlarms = () => getAuditPage({ limit: 20_000 }).filter((a) => a.action === "sms.balance_low").length;
const resetBalance = () => { globalThis.__50PICK_SMS_BALANCE = undefined; };

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
globalThis.fetch = (async (input: RequestInfo | URL) => {
  if (String(input).includes("/api/account/balance")) { balanceCalls++; return balanceReply(); }
  calls++;
  return reply();
}) as typeof fetch;
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
  await settle();
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
{
  resetBalance();
  balanceReply = balanceIs(185);
  balanceCalls = 0; calls = 0;
  const first = await refreshSmsBalance();
  ok("§7 with no reading, the live read asks the balance endpoint and returns the account's figure",
    first === 185 && balanceCalls === 1, `got ${first}, ${balanceCalls} read(s)`);
  ok("§7 …records it in the ONE snapshot, so /api/health and the alarm read the same figure", smsBalanceSnapshot().tzs === 185);
  ok("§7 ⛔ …and it SENDS nothing — the balance endpoint is the only request", calls === 0, `${calls} send request(s)`);
  const again = await refreshSmsBalance();
  ok("§7 a reading under a minute old is reused — a page render cannot hammer the vendor", again === 185 && balanceCalls === 1, `${balanceCalls} read(s)`);
  resetBalance();
  balanceReply = balanceRefused;
  const refused = await refreshSmsBalance();
  ok("§7 ⛔ a REFUSED read (its 0.0 is not the account's balance) records nothing — unknown stays unknown, never low",
    refused === null && smsBalanceSnapshot().tzs === null && !smsBalanceSnapshot().belowFloor, `got ${refused}`);
  balanceReply = balanceRefused;
}

console.log(`\nsms-cost-guard: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
