/**
 * WHAT A CONSOLE PAGE STREAMS TO AN ACCOUNT THAT MAY NOT SEE IT (owner ruling D19; C5-SPEC rulings 259, 260).
 *
 *   npm run build && npm run qa:house-bot-console-probe
 *
 * ⛔ A LAYOUT IS NOT A GATE (ruling 259). `admin/layout.tsx`'s redirect and each section's `AdminSectionGate` change what is
 * PAINTED; the page under them still renders and streams its whole server payload, and a flight whose router state names
 * the admin layouts skips them altogether. Measured on this branch's production build at C5 step 5: a signed-in player, the
 * holder and a trigger player received house stakes, house audit rows and bot ids from console pages, all with status 200.
 * So this pass is the SERVED proof of the house console gate (`src/lib/server/house-console-read.ts`), not a static one.
 *
 * On a scratch database it writes every kind of house data a console page can render through the real services — a
 * designated and started bot, staff-chosen and reaction stakes on closed markets, objections, emergency voids, an Up & Down
 * round, the holder's KYC case — and the platform rows that carry a house VALUE (a deduped HOUSE_BOT notice through the real
 * notifier; the provider-down alert, a server error, a refused and a fulfilled erasure and a bulk resolve written as their
 * writers write them). Then, on `next start` over the FRESH build, it signs in a player, the holder, a trigger player and
 * the ADMIN, and requests every console page enumerated from disk (every `page.tsx` under `src/app/admin/`, each dynamic
 * segment filled from the fixture, each `tab === "…"` the page names, every audit category and actor filter) as a plain
 * document, an `RSC: 1` flight and a flight whose `Next-Router-State-Tree` names the section segments, plus every admin
 * API GET route on disk. Each body is read with the shared vocabulary (ruling 175) and the bot's label and id.
 *
 * ⭐ WHAT PASSES AND WHAT IS NOT MEASURED. A non-staff response carrying any house word, label or id FAILS. The ADMIN is the
 * control: it must carry house data on the pages that show it, and a route instance whose ADMIN response carries none is
 * printed NOT MEASURED — its silence for the other viewers proves nothing about that page.
 *
 * ⛔ NEVER PORTS 3009, 3011, 3013 OR 3014 (other sessions own them). This one uses 3021. A scratch cluster only.
 * ⚠️ `qa:` is not part of `test:all`: it needs a fresh `next build`, a server and a scratch cluster. Step 13's served layer
 * (ruling 248) and the closing gates (ruling 252) run it; a build older than any `src` file is refused, never measured.
 *
 * house-bot: covered by L2 sweep — it sets the holder's password and wallet directly as fixtures of consent and money, with
 * no in-app hook behind them.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import pgLib from "pg";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { houseHits } from "./lib/house-bot-vocabulary.mjs";

type Any = any;
const ROOT = join(import.meta.dirname, "..");
const PORT = Number(process.env.HB_PROBE_PORT ?? 3021);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, ".qa-shots", "house-bot-console-probe");
let pass = 0, fail = 0, unmeasured = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const notMeasured = (l: string, why: string) => { unmeasured++; console.log(`NOT MEASURED ${l} — ${why}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
if (![3009, 3011, 3013, 3014].every((p) => p !== PORT)) { console.error(`!! refusing port ${PORT}: another session owns it.`); process.exit(2); }

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) { console.error("\n!! NOT MEASURED — this needs a local cluster. Run `npm run qa:house-bot-console-probe`, which boots one."); process.exit(3); }
const host = (() => { try { return new URL(RAW).hostname; } catch { return ""; } })();
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) { console.error("!! refusing: this creates and drops a database, so it runs only against a loopback cluster."); process.exit(2); }

// ── the build must be newer than every source file: a stale build measures yesterday's pages ──
const newestSrc = (() => {
  let newest = 0, file = "";
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p); else { const m = statSync(p).mtimeMs; if (m > newest) { newest = m; file = p; } }
    }
  };
  walk(join(ROOT, "src"));
  return { newest, file: relative(ROOT, file).replace(/\\/g, "/") };
})();
let buildAt = 0;
try { buildAt = statSync(join(ROOT, ".next", "BUILD_ID")).mtimeMs; } catch { buildAt = 0; }
if (!(buildAt > newestSrc.newest)) {
  console.error(`\n!! NOT MEASURED — the production build (${buildAt ? new Date(buildAt).toISOString() : "none"}) is older than ${newestSrc.file} (${new Date(newestSrc.newest).toISOString()}). Run \`npm run build\` first.`);
  process.exit(3);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "bodies"), { recursive: true });

const SECRETS = { SESSION_SECRET: "console-probe-session-secret-000000000000000", OTP_PEPPER: "console-probe-otp-pepper-0000", AUDIT_CHAIN_SECRET: "console-probe-audit-chain-secret-0000000000" };
Object.assign(process.env, SECRETS);
type PgClient = { connect(): Promise<void>; query(q: string, v?: unknown[]): Promise<unknown>; end(): Promise<void> };
const pg = pgLib as unknown as { Client: new (o: { connectionString: string }) => PgClient };
const BASE_URL = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `hb_console_probe_${process.pid}`;
{ const a = new pg.Client({ connectionString: RAW }); await a.connect(); await a.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); await a.query(`CREATE DATABASE "${DB}"`); await a.end(); }
const DATABASE_URL = `${BASE_URL}/${DB}?connect_timeout=30`;
const childEnv = { ...process.env, DATABASE_URL, USE_PRISMA_DAL: "true", ...SECRETS };
const isWin = process.platform === "win32";
const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], { cwd: ROOT, env: childEnv, encoding: "utf8", shell: isWin, timeout: 10 * 60_000 });
ok("0.migrate · every migration applies to the scratch database", mig.status === 0, (mig.stderr ?? "").split("\n").slice(-2).join(" "));
for (const seed of ["scripts/seed-admin-local.mts", "scripts/seed-staff-local.mts"]) {
  const r = spawnSync("npx", ["tsx", seed], { cwd: ROOT, env: childEnv, encoding: "utf8", shell: isWin, timeout: 5 * 60_000 });
  ok(`0.seed · ${seed} seeds the console's accounts`, r.status === 0, (r.stdout ?? "").split("\n").filter(Boolean).slice(-1).join(""));
}

let server: Any = null;
let w: Any = null;
try {
  if (fail > 0) throw new Error("the scratch database was not prepared");
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.USE_PRISMA_DAL = "true";
  process.env.MARKET_SCHEDULER = "false";
  const { loadWorld, OFFICER } = await import("./lib/house-bot-world.mts");
  w = await loadWorld();
  const D: Any = await import("../src/lib/server/house-bot/designation.ts");
  const RULES: Any = await import("../src/lib/house-bot/rules.ts");
  const OBJ: Any = await import("../src/lib/server/objections-service.ts");
  const KYC: Any = await import("../src/lib/server/kyc-service.ts");
  const CRYPTO: Any = await import("../src/lib/server/crypto.ts");
  const AUD: Any = await import("../src/lib/server/audit.ts");
  const NS: Any = await import("../src/lib/server/notification-service.ts");
  const REG: Any = await import("../src/lib/server/session-registry.ts");
  const AGENT: Any = await import("../src/lib/server/agent-application-service.ts");
  const { MARKET_CATEGORIES }: Any = await import("../src/lib/server/market-service.ts");
  const { ALLOWED_DURATIONS }: Any = await import("../src/lib/updown-durations.ts");

  // ── people ──
  const A = (await w.db.user.findByPhone("+255700000000")).id as string;
  await w.user({ id: OFFICER, role: "ADMIN" });
  const B = await w.user({ role: "ADMIN" });
  await w.limits();
  await w.switchOn(); // the scratch database only
  const PW = "Tembo-Kubwa-2026!";
  const holder = await w.user({ balance: 5_000_000 });
  const hSalt = CRYPTO.randomId(16);
  await w.setUserFields(holder, { displayName: "Probe Holder", passwordHash: await CRYPTO.hashPassword(PW, hSalt), passwordSalt: hSalt, passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE", email: `${holder}@test.tz`, emailVerifiedAt: new Date().toISOString() });
  const LABEL = "Probe evening desk";
  const designated = await D.designateHouseBot({ officerId: A, userId: holder, label: LABEL, note: null, password: PW, submitId: null });
  ok("1.designate · the holder is designated through the real service (house_bot.password_verified, house_bot.designated)", !!designated?.ok, JSON.stringify(designated).slice(0, 200));
  if (!designated?.ok) throw new Error("designation refused");
  const botId = designated.bot.id as string;
  const RATES = { freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 };
  const CTX = { stakeBounds: { minTzs: 1_000, maxTzs: 1_000_000 }, betPlaceRefillPerMin: 10, chains: [], categories: MARKET_CATEGORIES, durations: ALLOWED_DURATIONS, exitRates: { polls: RATES, updown: {} }, pollMinLifetimeMin: 120, limits: null, bots: [] };
  const rules = structuredClone(RULES.DEFAULT_RULES_V1(CTX));
  rules.scope.products.polls = true; rules.scope.categories = ["macro"]; rules.modes.polls.fill = true;
  const b0 = await w.dal.houseBotStore.get(botId);
  await w.dal.houseBotStore.saveRules(botId, b0.rulesVersion, { rules, ...w.OPEN_CAPS, freqMinGapSec: 20 });
  const started = await D.startHouseBot({ officerId: A, botId, rulesContext: CTX });
  ok("1.start · the bot is started through the real service (house_bot.started)", !!started?.ok, JSON.stringify(started).slice(0, 200));
  const b1 = await w.dal.houseBotStore.get(botId);
  await w.dal.houseBotStore.saveRules(botId, b1.rulesVersion, { rules, ...w.OPEN_CAPS, freqMinGapSec: 0 });
  const bot = { botId, userId: holder };

  const poll = async (title: string) => {
    const m = await w.poll({ graceMin: 0 });
    await w.prisma().$executeRawUnsafe('UPDATE "PredictionMarket" SET "titleEn" = $1, "titleSw" = $1, "sourceUrl" = $2 WHERE id = $3', title, "https://www.bot.go.tz", m.id);
    return m;
  };
  const bet = async (marketId: string, side: "YES" | "NO", stake: number) => {
    const player = await w.user({ balance: 2_000_000 });
    const r = await w.svc.buyPosition(player, { marketId, side, stake, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`bet refused ${JSON.stringify(r)}`);
    await w.backdate(r.data.positionId, 30_000);
    return { player: player as string, positionId: r.data.positionId as string };
  };
  const place = async (marketId: string, o: Any) => {
    await w.ageHouseMinute();
    const r = await w.place(bot, await w.intent(bot, marketId, o));
    if (!r.ok) throw new Error(`house stake refused (${o.kind}): ${JSON.stringify(r)}`);
    await w.ageHouseMinute();
    return r.data.positionId as string;
  };
  const manual = (marketId: string, officer: string, side: "YES" | "NO", stakeTzs: number) =>
    place(marketId, { kind: "MANUAL", entryCondition: "THIN", requestedById: officer, anchorKey: w.constants.manualAnchorKey(officer, crypto.randomUUID()), side, stakeTzs });
  const triggers: string[] = [];
  const reaction = async (marketId: string, creator: string, side: "YES" | "NO", stakeTzs: number) => {
    const trigger = await bet(marketId, side === "YES" ? "NO" : "YES", 10_000);
    triggers.push(trigger.player);
    const t = await w.dal.targetStore.insert({ id: w.dal.newHouseId("target"), houseBotId: botId, marketId, delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "EVERY",
      createdById: creator, snapshot: { titleEn: "target", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 } });
    return place(marketId, { kind: "COUNTER", triggerPositionId: trigger.positionId, triggerUserId: trigger.player, targetId: t.id, decision: { reactTo: "EVERY" }, side, stakeTzs });
  };
  const close = (marketId: string) => w.mdal.marketStore.stamp(marketId, { status: "CLOSED", sentinelOutcome: "YES", sentinelConfidence: 97, sentinelEvidence: "The published statement confirms the outcome.",
    sentinelSourceUrl: "https://www.bot.go.tz/statement", sentinelDetermined: true, sentinelClosedAt: new Date().toISOString() });

  // ── closed markets for the resolver queue, the ceremony and the market page: a staff-chosen stake, a reaction, a fill ──
  const Q1 = await poll("Will the policy rate hold on Thursday?");
  await bet(Q1.id, "YES", 20_000); await manual(Q1.id, A, "NO", 9_000);
  const Q2 = await poll("Will the derby end in a home win on Saturday?");
  await bet(Q2.id, "NO", 20_000); await manual(Q2.id, A, "YES", 9_000); await reaction(Q2.id, B, "YES", 6_000);
  const Q3 = await poll("Will it rain in the capital on Friday?");
  await bet(Q3.id, "NO", 10_000); await place(Q3.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  for (const m of [Q1, Q2, Q3]) await close(m.id);
  // ── an objection on a house-held market; an emergency void of one ──
  const O1 = await poll("Will the port backlog clear by Monday?");
  await bet(O1.id, "YES", 20_000); await manual(O1.id, A, "NO", 9_000);
  const objector = await bet(O1.id, "NO", 3_000);
  const resolvedO1 = await w.svc.resolveMarket({ marketId: O1.id, outcome: "YES", officerId: B });
  const filed = await OBJ.fileObjection(objector.player, { marketId: O1.id, reason: "WRONG_OUTCOME", detail: "The official source says otherwise, please look again." });
  const V1 = await poll("Will the ferry route reopen this week?");
  await bet(V1.id, "YES", 20_000); await manual(V1.id, A, "NO", 5_000); await bet(V1.id, "NO", 4_000);
  const voided = await w.svc.emergencyVoidMarket({ marketId: V1.id, officerId: B, reason: "The publisher withdrew the notice" });
  ok("1.decisions · a resolve, an objection and an emergency void on house-held markets (their audits, and the holder's own marked rows)", !!resolvedO1?.ok && !!filed?.ok && !!voided?.ok, JSON.stringify({ r: resolvedO1?.ok, o: filed?.ok, v: voided?.ok }));

  // ── an Up & Down round with a house stake ──
  const cfg: Any = await import("../src/lib/server/updown-config.ts");
  const uds: Any = await import("../src/lib/server/updown-service.ts");
  const udd: Any = await import("../src/lib/server/updown-dal.ts");
  const SR: Any = await import("../src/lib/server/source-registry.ts");
  let roundOk = false;
  try {
    await SR.seedDefaultSources();
    await SR.addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "probe fixture (mirrors production)", addedBy: "system" }).catch(() => null);
    const a = await cfg.createAsset({ key: "BTCP", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto", priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2 }, OFFICER);
    await cfg.setAssetEnabled(a.data.id, true, OFFICER);
    const c = await cfg.createChain({ assetId: a.data.id, durationMinutes: 60 }, OFFICER);
    await cfg.setChainState(c.data.id, "RUNNING", OFFICER);
    const chain = await udd.chainStore.get(c.data.id);
    const boundary = new Date(cfg.cleanGridAnchor(Date.now() + 60_000)).toISOString();
    const o = await udd.observationStore.ensure(a.data.id, boundary);
    await udd.observationStore.confirm(o.id, { price: 60_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: boundary, evidence: "BTC quoted 60000", confidence: 96, model: "probe-stub", rawHash: `hr_probe_${process.pid}` });
    const opened = await uds.openRound(chain, boundary, o.id, 60_000);
    const marketId = (await udd.roundStore.get(opened.data.id)).marketId as string;
    const snapshot = { ...((await w.svc.getMarket(marketId)).feeSnapshot as Record<string, unknown>), freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 };
    await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "feeSnapshot" = $1::jsonb WHERE "id" = $2`, JSON.stringify(snapshot), marketId);
    await bet(marketId, "YES", 50_000);
    await place(marketId, { kind: "FILL", productLine: "UPDOWN", side: "NO", stakeTzs: 2_000 });
    roundOk = true;
  } catch (e) { notMeasured("1.updown · the Up & Down round fixture", String((e as Error)?.message ?? e).slice(0, 200)); }
  if (roundOk) ok("1.updown · an open Up & Down round carries a house stake", true);

  // ── the holder's KYC case (the KYC page's durable audit read) ──
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const kycOf = async (userId: string, idNumber: string, fullName: string) => {
    await KYC.startKyc(userId);
    await KYC.submitIdentityStep(userId, { idType: "NIDA", idNumber, fullName, dob: "1990-01-01" });
    for (const slot of ["NIDA_FRONT", "NIDA_BACK", "SELFIE"]) await KYC.attachDocument(userId, slot, PNG);
    return KYC.submitForReview(userId);
  };
  const kycSubmitted = await kycOf(holder, "19900101000000009100", "Probe Holder");
  ok("1.kyc · the holder's KYC case is submitted", !!kycSubmitted?.ok, JSON.stringify(kycSubmitted).slice(0, 160));

  // ── an agent application, so the agent page's own audit read runs over a real record (self-service needs approved KYC) ──
  const applicant = await w.user({ balance: 50_000 });
  const applicantKyc = await kycOf(applicant, "19900101000000009200", "Probe Applicant");
  const approvedKyc = applicantKyc?.ok ? await KYC.reviewKyc({ officerId: A, userId: applicant, decision: "APPROVE" }) : applicantKyc;
  const app = await AGENT.startApplication(applicant).catch((e: unknown) => ({ ok: false, error: String(e), approvedKyc }));
  const appId = app?.ok ? (app.data.applicationId as string) : null;
  if (!appId) notMeasured("1.agent · a real agent application", `startApplication refused: ${JSON.stringify(app).slice(0, 160)}`);

  // ── the platform rows that carry a house VALUE (ruling 260) ──
  const dup = { userId: A, kind: "HOUSE_BOT", titleEn: `${LABEL} paused`, titleSw: `${LABEL} paused`, bodyEn: `Bot ${botId} paused`, bodySw: `Bot ${botId} paused`, href: "/admin" };
  const n1 = await NS.notify(dup); const n2 = await NS.notify(dup);
  ok("1.dedupe · the same HOUSE_BOT notice twice writes notification.deduped through the real notifier", !!n1 && n2?.id === n1?.id);
  await AUD.audit({ category: "COMPLIANCE", action: "email.provider_down", actorId: null, targetType: "System", targetId: "email", payload: { consecutiveFailures: 5, reason: "timeout", tag: "house-bot-erasure-blocked", note: "5 consecutive transactional email failures" } });
  await AUD.audit({ category: "SYSTEM", action: "server.error", actorId: null, targetType: "Route", targetId: "/admin/markets/[id]", payload: { name: "Error", message: `house bot ${botId} label read failed`, stack: "Error: house bot label read failed", method: "GET", digest: null, repeatsSuppressed: 0, monitorEnabled: false } });
  await AUD.audit({ category: "COMPLIANCE", action: "privacy.dsar.erasure_blocked", actorId: A, targetType: "DsarRequest", targetId: "dsar_probe_blocked", payload: { userId: holder, reason: "house_bot_live" } });
  await AUD.audit({ category: "ADMIN", action: "privacy.dsar.fulfilled", actorId: A, targetType: "DsarRequest", targetId: "dsar_probe_done", payload: { type: "ERASURE", userId: applicant, exportRef: null, status: "FULFILLED", houseBots: 0, houseBotNotificationsRedacted: 0 } });
  // ⛔ A ROW WRITTEN BEFORE OWNER RULING D20 KEEPS ITS KEYS. R9 was un-built in C5-5b, so nothing writes `houseStakes`
  // any more — which is exactly why the probe plants one by hand: a stored Batch row from before the un-build must still
  // never reach a non-staff viewer (ruling 260's gate drops the row; rulings 154/170 strip the key from an own export).
  await AUD.audit({ category: "COMPLIANCE", action: "market.resolve.bulk", actorId: A, targetType: "Batch", targetId: "batch_probe", payload: { batchId: "batch_probe", resolved: [Q1.id], houseStakes: { [Q1.id]: { yes: 0, no: 9_000, staffChosen: { yes: 0, no: 9_000, requestedBy: [A] } } } } });
  await AUD.audit({ category: "ADMIN", action: "report.house-liquidity.generated", actorId: A, targetType: null, targetId: null, payload: { format: "xlsx", filename: "house-liquidity-2026-08.xlsx" } });
  await AUD.audit({ category: "ADMIN", action: "house_bot.exported", actorId: A, targetType: "HouseBot", targetId: botId, payload: { botId, holderUserId: holder } });
  await AUD.auditFlush();

  // ── the viewers: a signed-in session minted as the session route mints one ──
  const player = await w.user({ balance: 10_000 });
  const mint = async (userId: string) => {
    const u = await w.db.user.findById(userId);
    const sessionId = `sess_${CRYPTO.randomId(16)}`;
    await REG.setActiveSessionId(userId, sessionId);
    const now = Date.now();
    return `kp_session=${CRYPTO.signSession({ userId, sessionId, phoneE164: u.phoneE164, role: u.role, kycStatus: u.kycStatus ?? "NOT_STARTED", iat: now, exp: now + 6 * 86_400_000, lastSeenAt: now, playStartedAt: now })}`;
  };
  const viewers: Array<[string, string]> = [["player", player], ["holder", holder], ["trigger", triggers[0]], ["admin", A]];
  const cookies: Record<string, string> = {};
  for (const [k, id] of viewers) cookies[k] = await mint(id);

  // ── every console page from disk; every dynamic segment filled; every tab the page names; every audit filter ──
  const pageRoutes: Array<{ route: string; file: string }> = [];
  const walk = (dir: string, rel: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${rel}/${e.name}`);
      else if (e.name === "page.tsx" || e.name === "page.ts") pageRoutes.push({ route: rel, file: join(dir, e.name) });
    }
  };
  walk(join(ROOT, "src", "app", "admin"), "/admin");
  pageRoutes.sort((x, y) => (x.route < y.route ? -1 : 1));
  const FILL: Record<string, Array<[string, string]>> = {
    "/admin/agents/[id]": appId ? [["application", appId]] : [],
    "/admin/ai-polls/[id]": [["unknown", "zz_not_a_record_000000000000"]], "/admin/invites/[id]": [["unknown", "zz_not_a_record_000000000000"]],
    "/admin/house/[marketId]": [["Q2", Q2.id]], "/admin/kyc/[id]": [["holder", holder]], "/admin/markets/[id]": [["Q2", Q2.id], ["V1", V1.id]],
    "/admin/players/[id]": [["holder", holder], ["A", A], ["trigger", triggers[0]]], "/admin/resolver/[id]": [["Q2", Q2.id]], "/admin/staff/[id]": [["A", A]],
  };
  const AUDIT_CATEGORIES = [...readFileSync(join(ROOT, "src/lib/server/audit.ts"), "utf8").match(/export type AuditCategory = ([^;]+);/)?.[1].matchAll(/"([A-Z]+)"/g) ?? []].map((m) => m[1]);
  const queriesFor = (route: string, file: string) => {
    const code = readFileSync(file, "utf8");
    const tabs = [...new Set([...code.matchAll(/tab === "([a-z-]+)"/g)].map((m) => m[1]))];
    const q = ["", ...tabs.map((t) => `?tab=${t}`)];
    if (route === "/admin/audit") q.push(...AUDIT_CATEGORIES.map((c) => `?category=${c}`), `?actorId=${holder}`);
    if (route === "/admin/resolver-queue") q.push("?window=all");
    return q;
  };
  type RouteRow = { name: string; path: string; segs: unknown[] };
  const ROUTES: RouteRow[] = [];
  const unfilled: string[] = [];
  for (const { route, file } of pageRoutes) {
    const parts = route.split("/").filter(Boolean);
    const dyn = parts.filter((p) => p.startsWith("["));
    const values: Array<[string, string] | null> = dyn.length === 0 ? [null] : (FILL[route] ?? []);
    if (dyn.length > 1 || values.length === 0) { unfilled.push(route); continue; }
    for (const v of values) {
      for (const q of queriesFor(route, file)) {
        ROUTES.push({ name: `${route}${v ? `<${v[0]}>` : ""}${q.replace(holder, "<holder>")}`, path: `/${parts.map((p) => (p.startsWith("[") ? v![1] : p)).join("/")}${q}`, segs: parts.map((p) => (p.startsWith("[") ? [p.slice(1, -1), v![1], "d", null] : p)) });
      }
    }
  }
  if (unfilled.length) notMeasured("2.routes · dynamic console routes with no fixture value", unfilled.join(", "));
  ok("2.routes · every console page is enumerated from disk and requested", pageRoutes.length >= 50 && ROUTES.length >= pageRoutes.length, `${pageRoutes.length} pages · ${ROUTES.length} route instances`);
  const apiRoutes: string[] = [];
  const walkApi = (dir: string, rel: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walkApi(join(dir, e.name), `${rel}/${e.name}`);
      else if (e.name === "route.ts" && /export (async function|const) GET\b/.test(readFileSync(join(dir, e.name), "utf8"))) apiRoutes.push(rel);
    }
  };
  walkApi(join(ROOT, "src", "app", "api", "admin"), "/api/admin");
  const API_FILL: Record<string, string> = {
    "/api/admin/agent-doc": `?app=${appId ?? "zz_not_a_record"}&type=ID`, "/api/admin/kyc-doc": `?user=${holder}&type=NIDA_FRONT`,
    "/api/admin/reports/[id]": "", "/api/admin/updown/symbol-check": "?symbol=BTC/USD",
  };
  const API_PATHS = apiRoutes.flatMap((r) => r === "/api/admin/reports/[id]"
    ? ["/api/admin/reports/house-liquidity?format=pdf", "/api/admin/reports/audit-trail-export?format=xlsx"]
    : [`${r}${API_FILL[r] ?? ""}`]);

  // ── the server over the fresh build ──
  server = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: ROOT, shell: isWin, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...SECRETS, DATABASE_URL, USE_PRISMA_DAL: "true", DISABLE_ADMIN_TOTP: "true", HOUSE_BOT_ENGINE: "false", MARKET_SCHEDULER: "false", UPDOWN_SCHEDULER: "false", NODE_ENV: "production" } });
  let serverLog = "";
  server.stdout?.on("data", (d: unknown) => { serverLog += String(d); });
  server.stderr?.on("data", (d: unknown) => { serverLog += String(d); });
  let up = false;
  for (let i = 0; i < 120 && !up; i++) { await sleep(1_000); try { up = (await fetch(`${BASE}/api/health`)).status < 600; } catch { up = false; } }
  ok("3.server · next start answers on the port this pass owns", up, `port ${PORT}${up ? "" : ` · ${serverLog.slice(-300)}`}`);
  if (!up) throw new Error("the server never came up");

  // ── the needles: the shared vocabulary, the bot's label and id; the repo's own folder name stripped from stack traces ──
  const rootForms = [ROOT, ROOT.replace(/\\/g, "/"), ROOT.replace(/\\/g, "\\\\"), "kipindi-house-bots"];
  const needles = (body: string) => {
    let text = body;
    for (const r of rootForms) text = text.split(r).join("<root>");
    return [...new Set([...houseHits(text), ...[LABEL, botId].filter((x) => text.includes(x))])];
  };
  ok("3.needles · CONTROL · a house word, the label and the bot id are each found; the repo's own folder in a stack trace is not",
    needles("House stake: YES").length >= 1 && needles(`tag ${LABEL}`).length === 1 && needles(`id ${botId}`).length >= 1 && needles(`at ${ROOT.replace(/\\/g, "/")}/src/x.ts (kipindi-house-bots)`).length === 0);

  const treeOf = (segs: unknown[]) => {
    let node: unknown[] = [segs[segs.length - 1], {}];
    for (let i = segs.length - 2; i >= 0; i--) node = [segs[i], { children: node }];
    return ["", { children: node }];
  };
  const fetchFollowingRsc = async (path: string, headers: Record<string, string>) => {
    let url = `${BASE}${path}`;
    let r: Any = null;
    for (let hop = 0; hop < 4; hop++) {
      r = await fetch(url, { headers, redirect: "manual" });
      const loc = r.headers.get("location");
      if (r.status === 307 && loc && /[?&]_rsc=/.test(loc)) { url = new URL(loc, BASE).href; await r.text().catch(() => ""); continue; }
      break;
    }
    return { status: r.status as number, body: await r.text() };
  };
  const fileName = (s: string) => s.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 150);
  // Warm the server's audit ring from the database (the ADMIN's first page view writes a row).
  await fetchFollowingRsc(`/admin/players/${holder}`, { cookie: cookies.admin, "sec-fetch-mode": "navigate" });
  const rows: Any[] = [];
  // The audit log and the overview first, before the probe's own page views write rows ahead of the fixture's.
  const FIRST = (n: string) => n === "/admin" || n.startsWith("/admin/audit");
  ROUTES.sort((x, y) => Number(!FIRST(x.name)) - Number(!FIRST(y.name)));
  for (const route of ROUTES) {
    for (const [viewer] of viewers) {
      const modes: Array<[string, Record<string, string>]> = [
        ["document", { cookie: cookies[viewer], "sec-fetch-mode": "navigate" }],
        ["flight", { cookie: cookies[viewer], RSC: "1" }],
        ["flight+tree", { cookie: cookies[viewer], RSC: "1", "Next-Router-State-Tree": encodeURIComponent(JSON.stringify(treeOf(route.segs))) }],
      ];
      for (const [mode, headers] of modes) {
        try {
          const r = await fetchFollowingRsc(route.path, headers);
          const hits = needles(r.body);
          if (hits.length > 0 && viewer !== "admin") writeFileSync(join(OUT, "bodies", `${viewer}-${fileName(route.name)}-${mode.replace("+", "_")}.txt`), r.body);
          rows.push({ viewer, route: route.name, mode, status: r.status, hits: hits.slice(0, 8) });
        } catch (e) { rows.push({ viewer, route: route.name, mode, error: String(e).slice(0, 200) }); }
      }
    }
  }
  for (const path of API_PATHS) {
    for (const [viewer] of viewers) {
      try {
        const r = await fetchFollowingRsc(path, { cookie: cookies[viewer] });
        const hits = needles(r.body);
        if (hits.length > 0 && viewer !== "admin") writeFileSync(join(OUT, "bodies", `${viewer}-${fileName(path)}-api.txt`), r.body);
        rows.push({ viewer, route: path, mode: "api", status: r.status, hits: hits.slice(0, 8) });
      } catch (e) { rows.push({ viewer, route: path, mode: "api", error: String(e).slice(0, 200) }); }
    }
  }
  writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 2));

  const nonStaff = rows.filter((r) => r.viewer !== "admin");
  const leaks = nonStaff.filter((r) => (r.hits?.length ?? 0) > 0);
  const errored = rows.filter((r) => r.error);
  ok("4.0 · every request was answered (no transport error)", errored.length === 0, errored.slice(0, 5).map((r) => `${r.viewer} ${r.route} ${r.mode}: ${r.error}`).join(" · "));
  ok(`4.1 · ⛔ D19 · no response to a player, the holder or a trigger player carries a house word, the bot's label or its id (${nonStaff.length} responses over ${ROUTES.length} page instances and ${API_PATHS.length} API routes)`,
    nonStaff.length > 0 && leaks.length === 0, leaks.slice(0, 12).map((r) => `${r.viewer} ${r.route} ${r.mode} ${r.status}: ${r.hits.slice(0, 3).join("|")}`).join(" · "));
  const apiNonStaff = nonStaff.filter((r) => r.mode === "api");
  ok("4.2 · every admin API route refuses a non-staff account (status 400 or above)", apiNonStaff.length > 0 && apiNonStaff.every((r) => (r.status ?? 0) >= 400),
    [...new Set(apiNonStaff.map((r) => `${r.route} ${r.status}`))].join(" · "));
  const adminHitRoutes = new Set(rows.filter((r) => r.viewer === "admin" && (r.hits?.length ?? 0) > 0).map((r) => r.route));
  /**
   * ⛔ THE POSITIVE CONTROL, RE-ANCHORED BY OWNER RULING D20 (C5-5b, 2026-09-18). It named the six R2/R9 display pages
   * until the un-build removed the display: those pages now carry house data for NOBODY, so expecting the ADMIN to see it
   * there would make 4.1 unfalsifiable — every viewer silent, the pass meaningless. What an ADMIN still receives, and the
   * gate of rulings 259/260 still governs, is the house AUDIT rows: the audit log (default and by category) and the
   * holder's and officer's player pages. If those go silent too, this control fails and 4.1's clean result is void.
   */
  const MUST_CARRY = ["/admin/audit", "/admin/audit?category=SYSTEM", "/admin/audit?category=COMPLIANCE", "/admin/audit?category=ADMIN", `/admin/players/[id]<holder>`, `/admin/players/[id]<holder>?tab=audit`];
  ok("4.3 · CONTROL · the ADMIN's own responses still carry house data where it exists after D20's un-build — the audit log (default, SYSTEM, COMPLIANCE and ADMIN, where the house actions and the value rows are) and the holder's player page with and without its audit tab",
    MUST_CARRY.every((r) => adminHitRoutes.has(r)), `missing: ${MUST_CARRY.filter((r) => !adminHitRoutes.has(r)).join(", ") || "none"} · ADMIN carries house data on ${adminHitRoutes.size} route instances`);
  const silent = [...new Set(rows.map((r) => r.route))].filter((r) => !adminHitRoutes.has(r)).sort();
  for (const r of silent) notMeasured(`4.nm · ${r}`, "the ADMIN control carries no house data there, so its absence for the other viewers proves nothing about that page");
  const summary = { requests: rows.length, nonStaff: nonStaff.length, leaks: leaks.length, adminRouteInstancesWithHouseData: [...adminHitRoutes].sort(), notMeasured: silent,
    statusesNonStaff: Object.entries(nonStaff.reduce((m: Record<string, number>, r) => { const k = String(r.status ?? "ERR"); m[k] = (m[k] ?? 0) + 1; return m; }, {})) };
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nsummary: ${JSON.stringify({ ...summary, adminRouteInstancesWithHouseData: summary.adminRouteInstancesWithHouseData.length, notMeasured: silent.length })}`);
} catch (e) {
  ok("probe · the pass ran to the end", false, String((e as Error)?.stack ?? e).split("\n").slice(0, 4).join(" | "));
} finally {
  if (server?.pid) spawnSync("taskkill", ["/T", "/F", "/PID", String(server.pid)], { encoding: "utf8" });
  await sleep(2_000);
  let stillUp = false;
  try { stillUp = (await fetch(`${BASE}/api/health`)).status > 0; } catch { stillUp = false; }
  ok("5.port · the server is stopped and the port released", !stillUp);
  try { await w?.prisma?.()?.$disconnect?.(); } catch { /* ignore */ }
  const d = new pg.Client({ connectionString: RAW });
  await d.connect();
  await d.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => null);
  await d.end();
}
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — qa:house-bot-console-probe: ${pass} passed, ${fail} failed, ${unmeasured} NOT MEASURED`);
process.exit(fail === 0 ? 0 : 1);
