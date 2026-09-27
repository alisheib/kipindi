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
 * Run: npm run test:sms-cost-guard
 */
import { readFileSync } from "node:fs";
import { sendBatch, smsBalanceSnapshot, refreshSmsBalance, type SmsBalanceRead } from "../src/lib/server/sms.ts";
import { db } from "../src/lib/server/store.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";
import { smsCreditTile, eatClock } from "../src/app/admin/system/sms-credit-tile.ts";

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

/** The officer a low-balance alarm must reach (§4c). */
const OFFICER = "scg_officer";
const OFFICER_EMAIL = "scg.officer@test.tz";
{
  const nowIso = new Date().toISOString();
  await db.user.create({
    id: OFFICER, phoneE164: "+255780000901", email: OFFICER_EMAIL,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "ADMIN", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
  } as never);
}
const officerBells = async () =>
  (await db.notification.findByUser(OFFICER, 200)).filter((n) => n.kind === "SECURITY" && n.href === "/admin/system");
const officerMail = () =>
  ((globalThis as { __50PICK_EMAIL_OUTBOX?: { to: string; tag?: string }[] }).__50PICK_EMAIL_OUTBOX ?? [])
    .filter((e) => e.tag === "sms-credit-low" && e.to === OFFICER_EMAIL);
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

  // A second restart while the balance is still low is not a new crossing.
  resetBalance();
  reply = accepted(110);
  await sendBatch(otp());
  await until(() => lowAlarms() > base + 1, 400);
  ok("§4b …and a second restart inside a day does not raise it again: a restart is not a crossing", lowAlarms() === base + 1,
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
  balanceReply = balanceRefused;
}

/* ══ §8 · WHO CALLS IT — the admin card and /api/health, each within a budget ═══════════════════ */
{
  const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const page = src("src/app/admin/system/page.tsx");
  ok("§8 the System page reads the balance live within its render budget",
    /refreshSmsBalance\(\{ maxAgeMs: 60_000, budgetMs: SMS_BALANCE_RENDER_BUDGET_MS \}\)/.test(page));
  const tile = page.match(/<AdminKpi label="SMS credit"[^\n]*\/>/)?.[0] ?? "";
  ok("§8 …and draws the tile from smsCreditTile, with no pulse and no arrow",
    /value=\{smsTile\.value\}/.test(tile) && /delta=\{smsTile\.caption\}/.test(tile) && !/pulse|deltaDir/.test(tile), tile || "no SMS credit tile");
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
  const idle = { sent: 0, successRate: null };
  const tileOf = (s: ReturnType<typeof snap>, r: SmsBalanceRead | null, health: { sent: number; successRate: number | null } = idle, provider = "blackball") =>
    smsCreditTile({ provider, read: r, snapshot: s, health, thresholds: T, now });

  const unknown = tileOf(snap(null), null);
  ok("§9 unknown: a dash and the words, never a blank or a zero",
    unknown.value === "—" && flat(unknown.caption) === "Couldn't read the balance · not zero" && unknown.tone === undefined, JSON.stringify(unknown));

  // The balance read is the one free live credential check: wrong keys must not look like an outage, nor a slow
  // vendor like a dead one.
  const why = {
    refused: flat(tileOf(snap(null), read("failed", "refused")).caption),
    down: flat(tileOf(snap(null), read("failed", "unreachable")).caption),
    keys: flat(tileOf(snap(null), read("failed", "not-configured")).caption),
    slow: flat(tileOf(snap(null), read("pending")).caption),
    stub: flat(tileOf(snap(null), read("unavailable"), idle, "console").caption),
  };
  ok("§9 unknown says WHY: wrong credentials read differently from an outage",
    why.refused === "Couldn't read the balance · not zero · Blackball refused our credentials"
      && why.down === "Couldn't read the balance · not zero · no answer from Blackball"
      && why.keys === "Couldn't read the balance · not zero · Blackball keys not set",
    JSON.stringify(why));
  ok("§9 …a read still in flight, and a provider with no balance endpoint, say so too",
    why.slow === "Couldn't read the balance · not zero · still waiting for Blackball"
      && why.stub === "Couldn't read the balance · not zero · no balance read on Console (dev)",
    JSON.stringify(why));

  const healthy = tileOf(snap(185), read("fresh"));
  ok("§9 healthy: the CREDIT is the headline, the state is a word, and the provider is named, never its slug",
    healthy.value === `TZS${NB}185` && flat(healthy.caption) === "Healthy · Blackball · idle since restart" && healthy.tone === undefined, JSON.stringify(healthy));

  const busy = tileOf(snap(185), read("reused"), { sent: 12, successRate: 0.98 });
  ok("§9 healthy with traffic: the rate and the count, since restart", flat(busy.caption) === "Healthy · Blackball · 98.0% ok · 12 sent since restart", busy.caption);
  ok("§9 …and never splits inside 'N sent' or the rate", busy.caption.includes(`12${NB}sent`) && busy.caption.includes(`98.0%${NB}ok`), busy.caption);

  const low = tileOf(snap(120), read("fresh"));
  ok("§9 below the alert line: the word, in warning ink",
    low.tone === "warning" && low.value === `TZS${NB}120` && flat(low.caption) === "Low — top up soon · alert at TZS 150", JSON.stringify(low));

  const floor = tileOf(snap(30), read("fresh"));
  ok("§9 below the floor: danger, and what is paused",
    floor.tone === "danger" && flat(floor.caption) === "Below floor — invites paused, login codes still send · top up now", JSON.stringify(floor));

  // Past the TTL the gate treats a figure as unknown, so the headline does too; the old figure keeps its time.
  const readAt = now - 20 * 60_000;
  const stale = tileOf(snap(185, { at: readAt, stale: true }), read("failed", "unreachable"));
  ok("§9 stale: a reading past the TTL is headlined as a dash, its figure and time in the caption",
    stale.value === "—" && stale.tone === undefined && flat(stale.caption) === `Last read ${flat(eatClock(readAt, now))} · was TZS 185 · couldn't refresh`,
    JSON.stringify(stale));
  const staleLow = tileOf(snap(30, { at: readAt, stale: true }), read("failed", "unreachable"));
  ok("§9 …a stale LOW figure keeps its word and warning ink, never the danger of a floor that is not refusing",
    staleLow.value === "—" && staleLow.tone === "warning" && flat(staleLow.caption) === `Last read ${flat(eatClock(readAt, now))} · was TZS 30, below floor · couldn't refresh`,
    JSON.stringify(staleLow));
  // Inside the TTL the gate still acts on the figure, so it stays the headline, with its time.
  const slow = tileOf(snap(185, { at: now - 3 * 60_000 }), read("pending"));
  ok("§9 …a read still in flight too: never shown as current",
    slow.value === `TZS${NB}185` && flat(slow.caption) === `Last read ${flat(eatClock(now - 3 * 60_000, now))} · couldn't refresh`, slow.caption);
  const floorStale = tileOf(snap(30, { at: now - 3 * 60_000 }), read("failed"));
  ok("§9 below the floor on a figure that could not be refreshed: the state AND its time",
    floorStale.tone === "danger" && flat(floorStale.caption) === `Below floor — invites paused, login codes still send · top up now · last read ${flat(eatClock(now - 3 * 60_000, now))} · couldn't refresh`,
    floorStale.caption);
  ok("§9 a reading from another day carries its date", /[A-Z][a-z]{2}/.test(eatClock(now - 30 * 60 * 60_000, now)) && !/[A-Z][a-z]{2}/.test(eatClock(now, now).replace("EAT", "")),
    eatClock(now - 30 * 60 * 60_000, now));

  const all = [unknown, healthy, busy, low, floor, stale, staleLow, slow, floorStale,
    tileOf(snap(null), read("failed", "refused")), tileOf(snap(null), read("pending"))];
  ok("§9 no caption line can end on a separator: every dot is bound to the fact after it", all.every((t) => !t.caption.includes("· ")),
    all.map((t) => t.caption).find((c) => c.includes("· ")) ?? "");
  ok("§9 no amount and no clock breaks inside", all.every((t) => !/TZS \d|\d EAT/.test(t.value + t.caption)));
  ok("§9 ⛔ no tile claims to be live or moving", all.every((t) => !/\blive\b|▲|▼/i.test(t.caption)));
}

console.log(`\nsms-cost-guard: ${pass} passed, ${fail} failed`);
// ⚠️ An explicit exit either way: §4c loads the notification and email modules, and a handle either one leaves
// open must not turn a green run into a hang.
process.exit(fail > 0 ? 1 : 0);
