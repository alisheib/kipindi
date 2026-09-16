/**
 * The case list behind `test:house-bot-comms`. Run by that suite in two child processes — one on Postgres, one on
 * the memory store — never on its own.
 *
 * Sections:
 *   §1 recipients and channels · §2 the holder's own notices · §3 the caps and what the summary accounts for ·
 *   §4 staff-chosen: uncapped, and never counted · §5 the words themselves (trilingual, no reason, no placeholder) ·
 *   §6 the dedupe window · §7 links · §8 SMS, never · §9 the channel policy.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./decomment.mts";
import { loadWorld, OFFICER } from "./house-bot-world.mts";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n[${STORE}] ${t}`);
const j = (v: unknown) => JSON.stringify(v) ?? String(v);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, `${String((e as Error)?.message ?? e).replace(/\s+/g, " ")}`); }
}

const w = await loadWorld();
const N: Any = await import("../../src/lib/server/notification-service.ts");
const EM: Any = await import("../../src/lib/server/house-bot/emitters.ts");
const REG: Any = await import("../../src/lib/server/comms-registry.ts");
const K: Any = await import("../../src/lib/house-bot/constants.ts");
const { alertRow, ALERT_CODES }: Any = await import("../../src/lib/house-bot/alert-copy.ts");
const RG: Any = await import("../../src/lib/server/responsible-gambling.ts");

ok(`0.store · the child runs on ${STORE}`, w.onPostgres === (STORE === "postgres"));

/** Two admins, because "every recipient" must mean more than one (04 A22). */
const ADMIN_A = OFFICER;
const ADMIN_B = "usr_hb_comms_admin_b";
await w.user({ id: ADMIN_A, role: "ADMIN" });
await w.user({ id: ADMIN_B, role: "ADMIN" });
await w.limits();
// The switch is ON for this suite: every case here is about what a REAL stake tells people.
await w.switchOn();

const { db }: Any = await import("../../src/lib/server/store.ts");
const rowsFor = async (userId: string, limit = 500): Promise<Any[]> => (await db.notification.findByUser(userId, limit)) as Any[];
const houseRows = async (userId: string): Promise<Any[]> => (await rowsFor(userId)).filter((r) => r.kind === "HOUSE_BOT");
const countHouse = async (userId: string): Promise<number> => (await houseRows(userId)).length;
const newest = async (userId: string): Promise<Any> => (await houseRows(userId))[0];
const at = "14:02:11";

/* ═══ §1 · recipients and channels (04:1071, A22) ═════════════════════════════════════════════════ */
section("§1 · every admin alert reaches every recipient, and only recipients");
await guard("1", async () => {
  const before = { a: await countHouse(ADMIN_A), b: await countHouse(ADMIN_B) };
  const player = await w.user({});
  const beforePlayer = await countHouse(player);
  await N.notifyAdminsHouseBotRoster({ botId: "hb_comms1", label: "Bot A", event: "RULES_SAVED", eventId: "hbe_comms1", at, detail: { byName: "Juma M.", field: "daily loss cap", from: "TZS 50,000", to: "TZS 200,000" } });
  const after = { a: await countHouse(ADMIN_A), b: await countHouse(ADMIN_B) };
  ok("1.1 · 04 A22 · a roster change reaches EVERY admin, not the first one found",
    after.a === before.a + 1 && after.b === before.b + 1, j({ before, after }));
  ok("1.2 · …and no player is told about a house bot's roster", (await countHouse(player)) === beforePlayer);
  const row = await newest(ADMIN_B);
  ok("1.3 · the row is a HOUSE_BOT bell with a link into the bot's history", row?.kind === "HOUSE_BOT" && /^\/admin\/house-bots\/hb_comms1\?tab=history&event=hbe_comms1$/.test(row?.href ?? ""), j(row?.href));
});

/* ═══ §2 · the holder's own notices ══════════════════════════════════════════════════════════════ */
section("§2 · the holder hears about their own account, in their own language");
await guard("2", async () => {
  const holder = await w.user({});
  const r = await N.notifyHouseBotOwnerStake({ userId: holder, positionId: "pos_comms1", side: "YES", stakeTzs: 8_000, marketTitle: "Will Dar get rain today?", at });
  ok("2.1 · a stake from their account gives the holder one row, linked to the position itself",
    r != null && r.kind === "HOUSE_BOT" && r.href === "/positions/pos_comms1", j({ href: r?.href }));
  ok("2.2 · ⭐ 04 N1 §7 · it never says a person chose the stake: the body reads the same for an automatic and a staff-chosen row",
    !/chose|officer|staff|Enter now/i.test(`${r?.bodyEn} ${r?.titleEn}`), j(r?.bodyEn));
  ok("2.3 · it is complete in all three languages", !!r?.titleSw && !!r?.titleZh && !!r?.bodySw && !!r?.bodyZh && /[一-鿿]/.test(`${r?.titleZh}${r?.bodyZh}`));

  // ⛔ 04 C13's RG gate: a responsible-gambling lock means no outbound engagement at all.
  const locked = await w.user({});
  await RG.selfExclude(locked, "24h");
  const before = await countHouse(locked);
  const blocked = await N.notifyHouseBotOwnerStake({ userId: locked, positionId: "pos_comms2", side: "NO", stakeTzs: 1_000, marketTitle: "A poll", at });
  const summary = await N.notifyHouseBotOwnerHourSummary({ userId: locked, count: 3, stakeTzs: 9_000, fromHH: "13:00", toHH: "14:00" });
  const notice = await N.notifyHouseBotOwner(locked, "paused");
  ok("2.4 · ⭐ 04:1074 · a self-excluded holder gets ZERO house rows — the stake notice, the summary and the state notice all return early",
    blocked === null && summary === null && notice === null && (await countHouse(locked)) === before, j({ blocked, summary, notice }));
});

/* ═══ §3 · the caps, and what the summary accounts for (04:1076, N1 04:3737) ═════════════════════ */
section("§3 · the hourly caps, and the summary that accounts for what they suppressed");
await guard("3", async () => {
  await w.limits({ bellAlertsPerHour: 3, holderNoticesPerHour: 2 });
  const b = await w.bot();
  const alerts = EM.houseEngineAlerts();
  const beforeAdmin = await countHouse(ADMIN_A);
  const beforeHolder = await countHouse(b.userId);
  // Five automatic stakes in the same hour, each a real PLACED row. An OPENER happens once per market, so each
  // stake gets its own fresh empty poll — the fixture the caps suite proves places.
  for (let i = 0; i < 5; i++) {
    const market = await w.poll({ graceMin: 0 });
    const intent = await w.intent(b, market.id, { kind: "OPENER", side: "YES", stakeTzs: 1_000 + i });
    const placed = await w.place(b, intent);
    if (!placed.ok) throw new Error(`fixture: the house bet was refused — ${j(placed)}`);
    await alerts.placed(await w.dal.houseBotIntentStore.get(intent.id));
  }
  const admin = (await countHouse(ADMIN_A)) - beforeAdmin;
  const holder = (await countHouse(b.userId)) - beforeHolder;
  ok("3.1 · ⭐ the admin bell cap holds: 5 automatic stakes in one hour give 3 rows at a cap of 3",
    admin === 3, `${admin} admin rows`);
  ok("3.2 · ⭐ N1 04:3737 · the holder's own cap holds too: 2 rows at a cap of 2",
    holder === 2, `${holder} holder rows`);
  // What the caps suppressed is what the hour's summary reports.
  const beforeSummary = await countHouse(ADMIN_A);
  await alerts.once("k", { code: "HOUR_SUMMARY_ADMINS", detail: { fromIso: new Date(Date.parse("2026-09-16T10:00:00.000Z")).toISOString(), toIso: new Date(Date.parse("2026-09-16T11:00:00.000Z")).toISOString(), count: 5, stakeTzs: 5_010, beyondCap: 2, staffChosen: 1 } });
  const s = await newest(ADMIN_A);
  ok("3.3 · the hour's summary names the count, the money and what the cap held back",
    (await countHouse(ADMIN_A)) === beforeSummary + 1 && /5 stakes/.test(s?.titleEn ?? "") && /2 of them were beyond the hourly bell cap/.test(s?.bodyEn ?? "") && /1 staff-chosen/.test(s?.bodyEn ?? ""), j(s?.bodyEn));
  const beforeHolderSummary = await countHouse(b.userId);
  await alerts.once("k2", { code: "HOUR_SUMMARY_HOLDER", botId: b.botId, detail: { fromIso: new Date(Date.parse("2026-09-16T10:00:00.000Z")).toISOString(), toIso: new Date(Date.parse("2026-09-16T11:00:00.000Z")).toISOString(), count: 5, stakeTzs: 5_010, beyondCap: 3 } });
  const hs = await newest(b.userId);
  ok("3.4 · the holder's summary goes to the HOLDER, not to an admin, and links to their positions",
    (await countHouse(b.userId)) === beforeHolderSummary + 1 && hs?.href === "/positions" && /5 liquidity stakes/.test(hs?.titleEn ?? ""), j({ title: hs?.titleEn, href: hs?.href }));
  await w.limits();
});

/* ═══ §4 · staff-chosen: uncapped, and never counted (N1 04:3732-3733, N2 04:4395) ═══════════════ */
section("§4 · a stake a person chose is alerted one by one");
await guard("4", async () => {
  await w.limits({ bellAlertsPerHour: 0 });
  const b = await w.bot();
  const market = await w.poll({ graceMin: 0 });
  const alerts = EM.houseEngineAlerts();
  const hourBefore = Number((await w.dal.houseBotRuntimeStore.get(K.RUNTIME_KEY.global))?.countInHour ?? 0);
  const beforeA = await countHouse(ADMIN_A);
  const beforeB = await countHouse(ADMIN_B);
  const manual = await w.intent(b, market.id, { kind: "MANUAL", entryCondition: "OPENER", side: "YES", stakeTzs: 2_000, requestedById: ADMIN_A });
  const placed = await w.place(b, manual);
  if (!placed.ok) throw new Error(`fixture: ${j(placed)}`);
  await alerts.placed(await w.dal.houseBotIntentStore.get(manual.id));
  const hourAfter = Number((await w.dal.houseBotRuntimeStore.get(K.RUNTIME_KEY.global))?.countInHour ?? 0);
  const rowA = await newest(ADMIN_A);
  ok("4.1 · ⭐ N1 04:3732 · with the per-bet cap at 0 a staff-chosen stake still reaches BOTH admins — it is never capped",
    (await countHouse(ADMIN_A)) === beforeA + 1 && (await countHouse(ADMIN_B)) === beforeB + 1, j({ a: (await countHouse(ADMIN_A)) - beforeA, b: (await countHouse(ADMIN_B)) - beforeB }));
  ok("4.2 · ⭐ N2 04:4395 · and it does not consume the hour's bell count",
    hourAfter === hourBefore, `${hourBefore} → ${hourAfter}`);
  ok("4.3 · the row says a person chose it, names how, and points at the feed where the reason is recorded",
    /Staff-chosen/.test(rowA?.titleEn ?? "") && /Enter now by/.test(rowA?.titleEn ?? "") && /Reason recorded in the activity feed/.test(rowA?.bodyEn ?? ""), j(rowA?.titleEn));
  await w.limits();
});

/* ═══ §5 · the words themselves (N1 04:3734, INT-10) ════════════════════════════════════════════ */
section("§5 · what a body may and may not contain");
await guard("5", async () => {
  const b = await w.bot();
  const market = await w.poll({ graceMin: 0 });
  const alerts = EM.houseEngineAlerts();
  // A needle in the OFFICER'S words. ⛔ It goes in the press row's `reason` — where an officer's text actually
  // lives (INT-10) — and never in the intent's `why`, which is the ENGINE's own sentence and IS printed. The first
  // run of this case planted it in `why` and the emitter printed it, correctly: the fixture was the defect.
  const NEEDLE = "NEEDLE-a7f3-do-not-print";
  const manual = await w.intent(b, market.id, { kind: "MANUAL", entryCondition: "OPENER", side: "YES", stakeTzs: 2_000, requestedById: ADMIN_A });
  const pressed = await w.dal.pressStore.insertChecking({
    id: `hbp_comms_${Date.now().toString(36)}`, actorId: ADMIN_A, submitId: crypto.randomUUID(),
    purpose: "ENTER_NOW", houseBotId: b.botId, marketId: market.id, targetId: null, intentId: manual.id, reason: `because ${NEEDLE}`,
  });
  ok("5.0 · fixture · an officer's reason is recorded on the press row, where INT-10 keeps it", pressed?.ok === true, j(pressed?.ok));
  const placed = await w.place(b, manual);
  if (!placed.ok) throw new Error(`fixture: ${j(placed)}`);
  await alerts.placed(await w.dal.houseBotIntentStore.get(manual.id));
  const rows = (await houseRows(ADMIN_A)).slice(0, 4);
  ok("5.1 · ⚠️ the side rule reaches the body (it is the engine's own sentence, not a person's words)",
    rows.some((r) => /Side rule/.test(r.bodyEn ?? "")), j(rows[0]?.bodyEn));
  // Every house row ever written in this run: none may carry a placeholder, an emoji, or an undefined.
  const all = [...(await houseRows(ADMIN_A)), ...(await houseRows(ADMIN_B))];
  const bad = all.filter((r) => [r.titleEn, r.titleSw, r.titleZh, r.bodyEn, r.bodySw, r.bodyZh].some((s: string) => /\{[a-zA-Z]+\}|undefined|NaN|\[object Object\]/.test(s ?? "")));
  ok("5.2 · ⭐ no row carries an unreplaced placeholder, an undefined, a NaN or an [object Object]",
    bad.length === 0, bad.slice(0, 2).map((r) => r.titleEn).join(" · "));
  const noZh = all.filter((r) => !/[一-鿿]/.test(`${r.titleZh ?? ""}${r.bodyZh ?? ""}`));
  ok("5.3 · every row is complete in Chinese (cert-c3 §2's rule, for house rows too)", noZh.length === 0, noZh.slice(0, 2).map((r) => r.titleEn).join(" · "));
  const emoji = all.filter((r) => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(`${r.titleEn}${r.bodyEn}`));
  ok("5.4 · no emoji in an admin bell", emoji.length === 0, emoji.slice(0, 2).map((r) => r.titleEn).join(" · "));
  // ── ruling 142 · a caller's verb or sentence never enters a translated body ──
  await N.notifyAdminsHouseBotMoneyEvent({ botId: b.botId, label: "Bot A", holder: "Player #A3F2K8", event: "withdrew", amountTzs: 50_000, txnId: "txn_r142", balanceTzs: 120_000, at });
  const findRow = async (needle: string): Promise<Any> => (await houseRows(ADMIN_A)).find((r) => `${r.titleEn} ${r.bodyEn} ${r.titleSw} ${r.bodySw}`.includes(needle));
  const money = await findRow("txn_r142.");
  ok("5.6 · ⭐ ruling 142 · the money row's verb is LOCALISED — Swahili says 'ametoa' and Chinese '提取了', and neither carries the English word",
    /ametoa/.test(money?.titleSw ?? "") && /提取了/.test(money?.titleZh ?? "")
      && !/withdrew/.test(`${money?.titleSw} ${money?.bodySw} ${money?.titleZh} ${money?.bodyZh}`),
    j({ sw: money?.titleSw, zh: money?.titleZh }));
  await N.notifyAdminsHouseBotRoster({ botId: b.botId, label: "Bot A", event: "RULES_SAVED", eventId: "hbe_r142", at: "14:09:59", detail: { byName: "Juma M.", field: "daily loss cap", from: "TZS 50,000", to: "TZS 200,000" } });
  const roster = await findRow("14:09:59");
  ok("5.7 · ⭐ ruling 142 · the roster sentence is BUILT in each language from parts (a name, a field, two figures), never pasted",
    /Kanuni zake zimebadilika/.test(roster?.bodySw ?? "") && /其规则已更改/.test(roster?.bodyZh ?? "")
      && /daily loss cap: TZS 50,000 → TZS 200,000/.test(roster?.bodySw ?? "") && /Juma M\./.test(roster?.bodySw ?? ""),
    j({ sw: roster?.bodySw }));
  await N.notifyAdminsHouseBotMoneyEvent({ botId: b.botId, label: "Bot A", holder: "Player #A3F2K8", event: "A_CODE_FROM_A_NEWER_BUILD", amountTzs: 1_000, txnId: "txn_r142b", balanceTzs: 1_000, at });
  const unknownMoney = await findRow("A_CODE_FROM_A_NEWER_BUILD");
  ok("5.8 · CONTROL · an unknown money code falls back to the code itself in all three languages — never 'undefined'",
    /A_CODE_FROM_A_NEWER_BUILD/.test(unknownMoney?.titleSw ?? "") && !/undefined/.test(`${unknownMoney?.titleEn} ${unknownMoney?.titleSw} ${unknownMoney?.titleZh}`),
    j(unknownMoney?.titleSw));

  // The needle: nowhere, in any language, in any row.
  const leaked = all.filter((r) => [r.titleEn, r.titleSw, r.titleZh, r.bodyEn, r.bodySw, r.bodyZh].some((s: string) => (s ?? "").includes("NEEDLE")));
  ok("5.5 · ⭐ N1 04:3734 · an officer's reason, seeded with a needle, appears in NO body in any language",
    leaked.length === 0, leaked.slice(0, 2).map((r) => r.titleEn).join(" · "));
});

/* ═══ §6 · the dedupe window (04:1076, N1 04:3735) ══════════════════════════════════════════════ */
section("§6 · two real events a second apart are two rows");
await guard("6", async () => {
  const beforeA = await countHouse(ADMIN_A);
  await N.notifyAdminsHouseBotBet({ botId: "hb_dd", label: "Bot D", side: "YES", stakeTzs: 1_000, marketTitle: "A poll", marketId: "mkt_dd", intentId: "hbi_dd1", at: "14:02:11" });
  await sleep(20);
  await N.notifyAdminsHouseBotBet({ botId: "hb_dd", label: "Bot D", side: "YES", stakeTzs: 1_000, marketTitle: "A poll", marketId: "mkt_dd", intentId: "hbi_dd2", at: "14:02:12" });
  ok("6.1 · ⭐ 04:1076 · two stakes one second apart both land: the second in the title is what makes them different",
    (await countHouse(ADMIN_A)) === beforeA + 2, `${(await countHouse(ADMIN_A)) - beforeA} rows`);
  // Two IDENTICAL money events are two events (02:429), so that emitter must not be deduped away either.
  const beforeMoney = await countHouse(ADMIN_A);
  for (const txn of ["txn_same_1", "txn_same_2"]) {
    await N.notifyAdminsHouseBotMoneyEvent({ botId: "hb_dd", label: "Bot D", holder: "Player #A3F2K8", event: "withdrew", amountTzs: 50_000, txnId: txn, balanceTzs: 10_000, at: "14:03:00" });
  }
  ok("6.2 · ⭐ 02:429 · two identical holder-money events give TWO rows",
    (await countHouse(ADMIN_A)) === beforeMoney + 2, `${(await countHouse(ADMIN_A)) - beforeMoney} rows`);
});

/* ═══ §7 · links (04:1077, N1 04:3736) ══════════════════════════════════════════════════════════ */
section("§7 · every link still resolves, and the ones that do not exist yet are named");
await guard("7", async () => {
  const all = [...(await houseRows(ADMIN_A)), ...(await houseRows(ADMIN_B)), ...(await houseRows((await w.dal.houseBotStore.listNonRemoved())[0]?.userId ?? ADMIN_A))];
  const hrefs = [...new Set(all.map((r) => r.href).filter(Boolean))] as string[];
  ok("7.1 · every href is absolute", hrefs.every((h) => h.startsWith("/")), hrefs.filter((h) => !h.startsWith("/")).join(" · ") || "-");
  /** A route that commit 7 builds. Named here so "it does not resolve yet" can never be mistaken for "it is broken". */
  const COMMIT_7 = ["/admin/house-bots"];
  const missing: string[] = [];
  for (const h of hrefs) {
    const path = h.split("?")[0].split("#")[0];
    if (COMMIT_7.some((p) => path === p || path.startsWith(`${p}/`))) continue;
    // Resolve /a/b/c against src/app, allowing one dynamic segment at each level.
    const parts = path.split("/").filter(Boolean);
    let dir = join(ROOT, "src", "app");
    let found = true;
    for (const part of parts) {
      if (existsSync(join(dir, part))) { dir = join(dir, part); continue; }
      const dyn = ["[id]", "[positionId]", "[marketId]", "[slug]"].find((d) => existsSync(join(dir, d)));
      if (dyn) { dir = join(dir, dyn); continue; }
      found = false; break;
    }
    if (!found || !existsSync(join(dir, "page.tsx"))) missing.push(h);
  }
  ok("7.2 · ⭐ 04:1077 · every link either resolves to a page that exists today, or is one of commit 7's console routes",
    missing.length === 0, missing.join(" · ") || "-");
  ok("7.3 · the console routes commit 7 owes are exactly what is named, not a growing list", COMMIT_7.length === 1);
});

/* ═══ §8 · SMS, never (04:1061, F6 04:1725, N1 04:3739) ═════════════════════════════════════════ */
section("§8 · a liquidity notice never reaches a phone");
await guard("8", () => {
  ok("8.1 · F6 · the policy says HOUSE_BOT is never SMS, and its letters only ever come from a registered template",
    REG.CHANNEL_POLICY.HOUSE_BOT.sms === "never" && REG.CHANNEL_POLICY.HOUSE_BOT.email === "template-only", j(REG.CHANNEL_POLICY.HOUSE_BOT));
  ok("8.2 · F6 04:1720 · a notice whose positions are all house-marked gets neither a phone nor a letter",
    j(REG.channelAllowed("HOUSE_BOT", { houseOnly: true })) === j({ sms: false, email: false })
      && j(REG.channelAllowed("WIN", { houseOnly: true })) === j({ sms: false, email: false }), j(REG.channelAllowed("HOUSE_BOT", { houseOnly: true })));
  ok("8.3 · CONTROL · the same call without houseOnly does not lie: a money kind may still use both",
    j(REG.channelAllowed("DEPOSIT")) === j({ sms: true, email: true }), j(REG.channelAllowed("DEPOSIT")));
  // The source pin: no house emitter may reach the SMS provider at all. `channelAllowed` has no production caller
  // while SMS is stubbed, so a behavioural drive here would be a check that cannot fail (extraction E11).
  // ⛔ Slice on CODE, not on a comment: the stripper removes comments, and a marker that is gone scans nothing
  // (this case read "1 characters scanned" on its first run and passed vacuously until it was fixed).
  const svc = decomment(readFileSync(join(ROOT, "src/lib/server/notification-service.ts"), "utf8"));
  const houseSection = svc.slice(svc.indexOf("export async function notifyAdminsHouseBotBet"));
  ok("8.4 · ⭐ the house emitters call no SMS sender at all (a source pin, because the provider is stubbed)",
    houseSection.length > 1_000 && !/sendSms|sms\.send|consoleSms/.test(houseSection), `${houseSection.length} characters scanned`);
  const emitters = decomment(readFileSync(join(ROOT, "src/lib/server/house-bot/emitters.ts"), "utf8"));
  ok("8.5 · …and neither does the engine's channel", !/sendSms|sms\.send/.test(emitters));
});

/* ═══ §9 · the policy and the copy table are exhaustive ═════════════════════════════════════════ */
section("§9 · nothing may ship without a row");
await guard("9", () => {
  const missing = (REG.NOTIFICATION_KINDS as string[]).filter((k) => !(k in REG.CHANNEL_POLICY));
  ok("9.1 · F6 04:1724 · every notification kind has a channel row (the annotation makes a 19th kind impossible)",
    missing.length === 0, missing.join(" · ") || "-");
  ok("9.2 · every alert code the engine raises has copy in three languages",
    (ALERT_CODES as string[]).every((code) => {
      const r = alertRow({ code, at, money: (n: number) => `TZS ${n}`, label: "Bot A", handle: "Player #A3F2K8", botId: "hb_x", detail: {} });
      return !!r.titleEn && !!r.titleSw && !!r.titleZh && !!r.bodyEn && !!r.bodySw && !!r.bodyZh && r.href.startsWith("/") && /[一-鿿]/.test(r.titleZh + r.bodyZh);
    }), `${(ALERT_CODES as string[]).length} codes`);
  const unknown = alertRow({ code: "A_CODE_FROM_A_NEWER_BUILD", at, money: (n: number) => `TZS ${n}`, botId: "hb_x" });
  ok("9.3 · ⭐ an unmapped code still reads as a sentence and names itself, in every language",
    /A_CODE_FROM_A_NEWER_BUILD/.test(unknown.titleEn) && /A_CODE_FROM_A_NEWER_BUILD/.test(unknown.titleZh) && unknown.href.startsWith("/") && unknown.severity === "warning", j(unknown.titleEn));
  // Oversight's two records reach every recipient (N1 04:3738); the staff-edge producer is commit 5 (ruling 78).
  ok("9.4 · the voided and self-decided records have their own copy, and it says a record was made, not that something was refused",
    /record only/.test(alertRow({ code: "STAFF_STAKE_VOIDED", at, money: (n: number) => `TZS ${n}`, detail: { action: "voided", titleEn: "A poll", side: "YES", stakeTzs: 1_000 } }).bodyEn)
      && /record only/.test(alertRow({ code: "STAFF_STAKE_SELF_DECIDED", at, money: (n: number) => `TZS ${n}`, detail: { action: "resolved", titleEn: "A poll" } }).bodyEn));
});

await w.dal.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
