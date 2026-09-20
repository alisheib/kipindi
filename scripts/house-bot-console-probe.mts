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
 * writers write them). Then, on `next start` over the FRESH build, it signs in a player, the holder, a trigger player, a
 * NON-OWNER STAFF officer (ruling 393 — the owner-only branch of the gate had never been driven over the wire) and
 * the ADMIN, and requests every console page enumerated from disk (every `page.tsx` under `src/app/admin/`, each dynamic
 * segment filled from the fixture, each `tab === "…"` the page names, every audit category and actor filter) as a plain
 * document, an `RSC: 1` flight and a flight whose `Next-Router-State-Tree` names the section segments, plus every admin
 * API GET route on disk. Each body is read with the shared vocabulary (ruling 175), the accounts' labels and ids, and
 * the CANARY amounts (ruling 374) — a TZS figure is none of the first three, so without them a clean sheet proved
 * nothing at all about a leaked money figure.
 *
 * ⛔ THE CLASSIFICATION IS AUDIENCE-AWARE (ruling 393). On the console's OWN routes — owner-only, hard-coded here
 * rather than recomputed from `isOwnerOnlyPath`, because a test that recomputes the code's own answer proves nothing —
 * the staff officer is held to the PLAYER's standard: zero hits, in all three modes. Everywhere else its hits are
 * REPORTED, not failed: ruling 260's design is deliberately "whole for the route's audience", and register row X13
 * records that a staff viewer legitimately sees house audit rows on `/admin/players/[id]`.
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
import { LOCAL_STAFF } from "./local-staff.mjs";

/**
 * ⛔ THE CANARY AMOUNTS (C7-SPEC ruling 374). The probe's other needles are the shared vocabulary, the account's
 * LABEL and its id — and a TZS figure is NONE of those, so before these existed a clean sheet proved nothing
 * whatever about a leaked money figure. A unique amount is the only needle a money figure can have.
 *
 * ⛔ EACH ONE IS SHOWN ABSENT FROM THE REPOSITORY FIRST (`0.canary` below, over `src/`, `scripts/`, `prisma/` and
 * `public/`, this file excepted), or the zero it produces is meaningless: an amount that already occurs somewhere
 * would be found in a body for reasons that have nothing to do with the desk.
 * ⛔ AND THEY ARE MATCHED IN BOTH FORMS — the raw digits and `formatTzs`' grouped form — because the console renders
 * the grouped one and a payload can carry either.
 * ⚠️ Every value is under `900_000_000`, the world fixture's own open-cap ceiling, so no cap the fixture relies on
 * is tightened by planting one.
 */
const CANARY = {
  gStake: 818_273_645,
  gLoss: 729_384_617,
  gExposure: 636_451_829,
  gStaffChosen: 318_492_756,
  botLoss: 483_920_175,
  botExposure: 517_284_930,
} as const;
const CANARY_STRINGS = Object.values(CANARY).flatMap((n) => [String(n), n.toLocaleString("en-US")]);

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
  /* ⭐ 374 · THE GLOBAL LIMITS CARRY CANARY AMOUNTS, so the limits tab has a figure only this pass can produce. */
  await w.limits({ gCapDailyStakeTzs: CANARY.gStake, gCapDailyLossTzs: CANARY.gLoss, gCapOpenExposureTzs: CANARY.gExposure, gCapStaffChosenDailyTzs: CANARY.gStaffChosen });
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
  /* ⭐ 374 · and the account's own two money caps, which the ROSTER renders as usage. */
  await w.dal.houseBotStore.saveRules(botId, b0.rulesVersion, { rules, ...w.OPEN_CAPS, capDailyLossTzs: CANARY.botLoss, capOpenExposureTzs: CANARY.botExposure, freqMinGapSec: 20 });
  const started = await D.startHouseBot({ officerId: A, botId, rulesContext: CTX });
  ok("1.start · the bot is started through the real service (house_bot.started)", !!started?.ok, JSON.stringify(started).slice(0, 200));
  const b1 = await w.dal.houseBotStore.get(botId);
  await w.dal.houseBotStore.saveRules(botId, b1.rulesVersion, { rules, ...w.OPEN_CAPS, capDailyLossTzs: CANARY.botLoss, capOpenExposureTzs: CANARY.botExposure, freqMinGapSec: 0 });
  const bot = { botId, userId: holder };

  /**
   * ⭐ 392(b) · A SECOND ACCOUNT, REMOVED. The console's `[id]` route takes THREE fixture values — a designated
   * account, a REMOVED one and an unknown id — so that when C7 step 4 builds that page, ruling 399's identical-answer
   * measurement (same status, same body length for every non-audience viewer) has something to measure.
   * ⛔ It also earns its place TODAY: `listNonRemoved()` excludes it from the roster while `houseDayBook(day, null)`
   * and `houseOpenExposure(null)` still count its money, which is ruling 432(l)'s wrong-population defect made real
   * on a served page rather than only in a unit fixture.
   */
  const holder2 = await w.user({ balance: 2_000_000 });
  const h2Salt = CRYPTO.randomId(16);
  await w.setUserFields(holder2, { displayName: "Probe Holder Two", passwordHash: await CRYPTO.hashPassword(PW, h2Salt), passwordSalt: h2Salt, passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE" });
  const LABEL2 = "Probe morning desk";
  const designated2 = await D.designateHouseBot({ officerId: A, userId: holder2, label: LABEL2, note: null, password: PW, submitId: null });
  const removedBotId: string | null = designated2?.ok ? (designated2.bot.id as string) : null;
  if (removedBotId) {
    await w.dal.houseBotStore.setStatus(removedBotId, { from: ["PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: A, reason: "probe fixture", cause: "MANUAL" } });
  }
  ok("1.removed · 392(b) · a SECOND account is designated and REMOVED, so the console's `[id]` route has its three fixture values",
    removedBotId !== null, JSON.stringify(designated2).slice(0, 160));

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
  /**
   * ⛔ AND IT IS FINALLY REFUSED, WHICH IS WHAT MAKES RULING 530's CONTROL ABLE TO FIRE AT ALL.
   * MEASURED at this head, correcting 530's own premise: `/admin/kyc/[id]` READS the holder's durable audit rows
   * through the gate but RENDERS only (a) blocked cash-out counts, dates and amounts and (b) the four
   * `REFUSED_FUNDS_ACTION` decision rows — and `priorDecisions` is built ONLY when the case is `REJECTED` with a
   * FINAL refusal code. A read is not a render: only rendered output is serialised, which is exactly why the ADMIN's
   * own body carried no house data there and the control was blind. So the case is refused finally, and the decision
   * row planted below then renders.
   * ⚠️ AFTER every house stake is placed, and the engine is off in this pass, so the account's stored status does
   * not move: the roster still renders it.
   */
  const kycRefused = await KYC.reviewKyc({ officerId: A, userId: holder, decision: "REJECT", reason: "The identity submitted matches a sanctions listing; this is a final refusal.", rejectCode: "SANCTIONED" }).catch((e: unknown) => ({ ok: false, error: String(e) }));
  ok("1.kyc · 530 · …and FINALLY refused, so the case page builds its prior-decision list and the ADMIN control can fire there",
    !!(kycRefused as Any)?.ok, JSON.stringify(kycRefused).slice(0, 200));

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
  /**
   * ⛔ RULING 530 · THE ONE CONTROL THE RELEASE GATE LEFT BLIND, FIXED HERE RATHER THAN CARRIED TO COMMIT 8.
   * Ruling 529 measured `leaks: 0` over 1,544 requests and then found that 4.3's positive control FAILED on a single
   * instance — `/admin/kyc/[id]<holder>`. MEASURED why, at this head: that page reads ALL of the holder's durable
   * audit rows through the gate (`houseAuditForConsole(…, "/admin/kyc", getAuditForTargetDurable("User", id, …))`)
   * but RENDERS only the blocked cash-outs and the four `REFUSED_FUNDS_ACTION` decision rows — so the
   * `house_bot.password_verified` and `house_bot.designated` rows the designation writes never reach the body, and
   * the ADMIN's own response carried no house data. The absence of house data for the other viewers there therefore
   * proved NOTHING about that page: a blind control, not a leak.
   * ⛔ THE FIX IS A ROW THE PAGE ACTUALLY RENDERS, AND IT IS THE REAL DEFECT CLASS, NOT A CONTRIVANCE. Ruling 260's
   * own words: "a platform row can carry a house VALUE". A refused-funds decision's `justification` is officer prose
   * rendered verbatim on that page, and an officer refusing funds on a desk account's holder writes exactly this.
   * The gate drops the whole row for a viewer outside the audience, so 4.1 stays at zero while 4.3 can finally fire.
   * ⛔ IT IS NOT MADE GREEN BY SHRINKING `MUST_CARRY`: that is the opposite of what the control is for.
   */
  await AUD.audit({
    category: "COMPLIANCE", action: "kyc.refused_funds.held_pending_appeal", actorId: A, targetType: "User", targetId: holder,
    payload: { decisionId: `rfd_probe_${process.pid}`, justification: `Held pending appeal: this account is the holder of house bot ${botId} and the balance is not the holder's alone.`, balanceBefore: 5_000_000, returnedTzs: 0, forfeitedTzs: 0 },
  });
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
  /**
   * ⛔ 393 · A NON-OWNER STAFF VIEWER, AND WITHOUT IT ONE OF THE GATE'S TWO BRANCHES HAD NEVER BEEN DRIVEN OVER THE
   * WIRE. `houseConsoleAudience` answers `isAdmin(role)` for the console's own prefix and a DOMAIN GRANT for
   * everything else; the four viewers above are a player, the holder, a trigger player and the ADMIN, so the
   * owner-only branch the whole console depends on was measured by no served request at all. The second belt
   * (`OWNER_ONLY_PREFIXES`) is why forgetting it would be caught by nothing else.
   * ⚠️ COMPLIANCE is the persona `seed-staff-local.mts` already writes — a real staff session, not a synthesised
   * one — and its `ops` view grant is whatever the default matrix gives it, which is the point: the console must
   * refuse it on its own prefix regardless.
   */
  const staffPhone = `+255${LOCAL_STAFF.COMPLIANCE}`;
  const staffUser = await w.db.user.findByPhone(staffPhone);
  ok("0.staff · 393 · the non-owner staff persona exists and is NOT an ADMIN", !!staffUser && staffUser.role === "COMPLIANCE", `${staffPhone} → ${staffUser?.role ?? "missing"}`);
  const viewers: Array<[string, string]> = [["player", player], ["holder", holder], ["trigger", triggers[0]], ["staff", staffUser!.id], ["admin", A]];
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
    /* ⭐ 392(b) · THE CONSOLE'S OWN RECORD ROUTE, with its three values. The page is C7 step 4's, so this entry is
       INERT today (the disk walk finds no `page.tsx` under `/admin/desk/[id]`) — and it lands NOW because the check
       below turns an unfilled CONSOLE route into a FAILURE rather than a soft `notMeasured`, and a failure with no
       fixture ready is a step 4 that cannot run its own probe. */
    "/admin/desk/[id]": [["designated", botId], ["removed", removedBotId ?? "zz_not_a_record_000000000000"], ["unknown", "zz_not_a_record_000000000000"]],
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
  /**
   * ⛔ 392(c) · AN UNFILLED CONSOLE ROUTE IS A FAILURE, NOT A `notMeasured`. The soft report above stays for the
   * rest of the tree, where a page with no fixture is a gap in coverage. Under the console's own prefix it is worse
   * than a gap: a detail route that can be requested by NOBODY leaves 4.1 printing a clean sheet over a population
   * that never included the page most likely to leak a record id — the measure-the-right-population failure this
   * whole instrument exists to prevent.
   */
  const CONSOLE_PREFIX = "/admin/desk";
  const consoleUnfilled = unfilled.filter((r) => r === CONSOLE_PREFIX || r.startsWith(`${CONSOLE_PREFIX}/`));
  ok("2.routes.console · ⛔ 392(c) · every DYNAMIC console route on disk has a FILL value — an unfilled console route FAILS here, where the rest of the tree only reports",
    consoleUnfilled.length === 0, consoleUnfilled.join(", ") || "none unfilled");
  const consoleInstances = ROUTES.filter((r) => r.name === CONSOLE_PREFIX || r.name.startsWith(`${CONSOLE_PREFIX}?`) || r.name.startsWith(`${CONSOLE_PREFIX}/`));
  /* ⛔ THE FLOOR IS RAISED IN THE SCRIPT TO WHAT THIS PASS MEASURES (392(e)) — never compared against a number
   * recorded in a plan document, because a gate that is not in the pipeline is not a gate. */
  ok("2.routes · every console page is enumerated from disk and requested", pageRoutes.length >= 55 && ROUTES.length >= pageRoutes.length, `${pageRoutes.length} pages · ${ROUTES.length} route instances · ${consoleInstances.length} of them under ${CONSOLE_PREFIX}: ${consoleInstances.map((r) => r.name).join(", ")}`);
  /* ⛔ AND THE DESK'S OWN TABS ARE ENUMERATED, BY NAME. Ruling 315: the probe discovers tabs by matching
   * `tab === "…"` in the page FILE, so any other shape leaves panels silently unrequested — and a COMMENT that
   * quotes the idiom invents an instance no panel answers. The count is printed and read, not assumed. */
  /* ⭐ C7 STEP 5 (the account half) · THE TWO NEW PANELS ARE NAMED, not left to a floor. 392(e) says a floor is
     raised in the SCRIPT to what a pass measured; a floor alone would have risen with the account page's five tabs
     and still never have required the two most leak-prone surfaces of the section to be REQUESTED. The names are
     derived from the disk walk — route + fixture label + query — so naming them costs no fixture and no guess. */
  const hasTab = (tab: string) => consoleInstances.some((r) => r.name.endsWith(`?tab=${tab}`));
  ok("2.routes.tabs · 315 · the desk's bare route and every tab its pages name are requested, and nothing else — the account page's activity and history panels by name",
    consoleInstances.length >= 3 && consoleInstances.some((r) => r.name === CONSOLE_PREFIX)
      && consoleInstances.some((r) => r.name === `${CONSOLE_PREFIX}?tab=limits`)
      && hasTab("activity") && hasTab("history")
      && consoleInstances.some((r) => r.name.startsWith(`${CONSOLE_PREFIX}/[id]`) && r.name.endsWith("?tab=activity")),
    consoleInstances.map((r) => r.name).join(", "));
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

  /**
   * ⛔ 374 · EACH CANARY IS SHOWN ABSENT FROM THE REPOSITORY BEFORE IT IS LOOKED FOR. A needle that already occurs
   * somewhere would be found in a body for reasons that have nothing to do with the desk, and the zero it then
   * produced would be worth nothing. This file is excepted: it is where the constants are declared.
   */
  {
    const SELF = join(ROOT, "scripts", "house-bot-console-probe.mts");
    const found: string[] = [];
    const scan = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const f = join(dir, e.name);
        if (e.isDirectory()) { scan(f); continue; }
        if (f === SELF || !/\.(ts|tsx|mts|mjs|js|json|sql|md|css)$/.test(e.name)) continue;
        const body = readFileSync(f, "utf8");
        for (const c of CANARY_STRINGS) if (body.includes(c)) found.push(`${relative(ROOT, f)}: ${c}`);
      }
    };
    for (const d of ["src", "scripts", "prisma", "public"]) scan(join(ROOT, d));
    ok(`0.canary · 374 · every canary amount is absent from src/, scripts/, prisma/ and public/ before it is planted (${CANARY_STRINGS.length} forms)`,
      found.length === 0 && CANARY_STRINGS.length === 12, found.slice(0, 6).join(" · "));
  }

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
  /* ⛔ 374 · THE CANARY AMOUNTS ARE NEEDLES TOO, and that is what makes a money figure measurable at all: the
   * shared vocabulary, the account's label and its id are none of them a TZS amount, so before this the probe's zero
   * said nothing whatever about a leaked figure. Both forms are matched — the raw digits and the grouped form the
   * console renders. ⛔ And because they are needles, the ADMIN control (4.3) can finally fire on `?tab=limits`,
   * whose body carries no account label at all: its only house data IS the money. */
  const needles = (body: string) => {
    let text = body;
    for (const r of rootForms) text = text.split(r).join("<root>");
    return [...new Set([...houseHits(text),
      ...[LABEL, LABEL2, botId, ...(removedBotId ? [removedBotId] : [])].filter((x) => text.includes(x)),
      ...CANARY_STRINGS.filter((c) => text.includes(c))])];
  };
  ok("3.needles · CONTROL · a house word, the label, the bot id and a CANARY amount in both its forms are each found; the repo's own folder in a stack trace is not",
    needles("House stake: YES").length >= 1 && needles(`tag ${LABEL}`).length === 1 && needles(`id ${botId}`).length >= 1
      && needles(`used TZS ${CANARY.gStake.toLocaleString("en-US")} of`).length === 1
      && needles(`${CANARY.botExposure}`).length === 1
      && needles(`at ${ROOT.replace(/\\/g, "/")}/src/x.ts (kipindi-house-bots)`).length === 0);

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
  /* ═══ ⛔ THE ECHO CLASSIFIER (replan ruling 551(b)) — A DISCRIMINATION, NOT A DILUTION ═════════════════════
   * 🔴 WHAT THIS IS FOR, MEASURED. The first run this probe ever made against a tree in which
   * `/admin/desk/[id]` exists printed `leaks: 96` — 8 route instances × 4 non-admin viewers × 3 transports. The
   * bodies were READ: no label, no canary amount, no vocabulary word in any of them. Every occurrence was the
   * account id, and every occurrence sat in a position the REQUEST had put there — the login redirect's `next=`
   * parameter (`NEXT_REDIRECT;replace;/auth/admin?next=%2Fadmin%2Fdesk%2Fhb_1d2a…;307;`) and Next's own flight
   * router-state encodings of the requested route (the segment array, and the dynamic-segment triple). A viewer
   * must already hold an id to have asked for it, so a body that hands it back tells them nothing they brought.
   *
   * ⛔ SO THE NEEDLE IS NOT NARROWED AND NOTHING IS DROPPED. A needle whose EVERY occurrence lies inside one of
   * these request-derived positions is classified `echoed`, printed and COUNTED on its own line (4.1e). A needle
   * with ONE occurrence anywhere else is a leak and turns 4.1 red, exactly as before. Apply the standing test —
   * *would this still pass if the feature were absent?* A store-read id rendered into a cell, or returned in a
   * payload field, is outside every echo span, is counted, and the gate goes red: 4.1c plants precisely that and
   * REQUIRES it to be reported as a leak.
   *
   * ⛔ AND THE ECHO SET IS BUILT FROM THE REQUEST, NEVER FROM A VOCABULARY. The forms below are derived from the
   * path this very request asked for; 4.1c's last half re-classifies the SAME body against a DIFFERENT request's
   * forms and requires a LEAK, so "it is an id, therefore it is an echo" cannot pass here. It is fail-closed
   * twice over: a needle the body does not literally contain comes out a leak, and so does any occurrence in an
   * encoding these forms do not reproduce — an encoding change turns the gate red rather than quiet.
   * ⛔ `MUST_CARRY` is untouched by all of this (ruling 530), and `leaks: 0` is still the merge condition. */
  const jsonEsc = (t: string) => t.split("\\").join("\\\\").split('"').join('\\"');
  const echoFormsFor = (path: string, segs: unknown[]): string[] => {
    const pathname = path.split("?")[0];
    const resolved = segs.map((x) => (Array.isArray(x) ? String(x[1]) : String(x)));
    const base = [
      /* the URL the viewer themselves asked for, raw and percent-encoded, as the login gate hands it back */
      path, pathname, encodeURIComponent(path), encodeURIComponent(pathname),
      /* Next's own router-state encodings of that same path. Two canonical forms, both observed in a real
         body: the bare segment array, and the same array with the query string carried on its LAST segment
         (`[\"\",\"admin\",\"desk\",\"hb_…?tab=targets\"]`), which is what an instance with a `?tab=` prints. */
      JSON.stringify(["", ...resolved]),
      ...(path.includes("?") ? [JSON.stringify(["", ...resolved.slice(0, -1), `${resolved[resolved.length - 1]}?${path.split("?").slice(1).join("?")}`])] : []),
      ...segs.filter((x): x is unknown[] => Array.isArray(x)).map((x) => JSON.stringify(x)),
    ].filter((f) => f.length > 1);
    /* Both spellings: a flight payload inlined into a <script> string carries every quote backslash-escaped. */
    return [...new Set(base.flatMap((f) => [f, jsonEsc(f)]))];
  };
  /** Every [start, end) in `body` at which one of `forms` appears. */
  const echoSpans = (body: string, forms: string[]): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (const f of forms) for (let i = body.indexOf(f); i >= 0; i = body.indexOf(f, i + 1)) out.push([i, i + f.length]);
    return out;
  };
  /**
   * Split a response's needles in two. `leaks` holds every needle with at least one occurrence outside every
   * request-derived span — and every needle the body does not contain at all, which cannot be an echo of anything.
   */
  const classifyHits = (body: string, found: string[], forms: string[]): { leaks: string[]; echoed: string[] } => {
    const spans = echoSpans(body, forms);
    const inside = (a: number, b: number) => spans.some(([x, y]) => x <= a && b <= y);
    const leaks: string[] = [], echoed: string[] = [];
    for (const n of found) {
      let seen = 0, allInside = true;
      for (let i = body.indexOf(n); i >= 0; i = body.indexOf(n, i + 1)) {
        seen++;
        if (!inside(i, i + n.length)) { allInside = false; break; }
      }
      (seen > 0 && allInside ? echoed : leaks).push(n);
    }
    return { leaks, echoed };
  };
  /** An index in `body` that no echo span covers — where 4.1c plants, so the plant cannot split an echo. */
  const outsideEveryEchoSpan = (body: string, forms: string[]): number => {
    const spans = echoSpans(body, forms);
    for (let k = Math.floor(body.length / 2); k < body.length; k++) {
      if (!spans.some(([x, y]) => x < k && k < y)) return k;
    }
    return body.length;
  };
  /** The one REAL body 4.1c plants into: a non-admin console response whose needles were ALL echoes. */
  let echoSample: { viewer: string; route: string; mode: string; body: string; forms: string[]; echoed: string[] } | null = null;

  const fileName = (s: string) => s.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 150);
  // Warm the server's audit ring from the database (the ADMIN's first page view writes a row).
  await fetchFollowingRsc(`/admin/players/${holder}`, { cookie: cookies.admin, "sec-fetch-mode": "navigate" });
  const rows: Any[] = [];
  // The audit log and the overview first, before the probe's own page views write rows ahead of the fixture's.
  /* ⛔ THE PROBE'S OWN PAGE VIEWS POLLUTE THE RING IT MEASURES. `/admin/players/[id]` WRITES a COMPLIANCE
   * `player.record_viewed` row on every render (`players/[id]/page.tsx:96` — the docblock said
   * `admin.player.viewed`, which is not an action this platform writes), and its Activity and Audit panels read the RING
   * (`getAuditForActor` + `getAuditForTarget`, newest first, sliced). MEASURED at this head: by the time
   * `?tab=audit` was requested, ~100 of the probe's own view rows sat ahead of the fixture's two `house_bot.*` rows,
   * so the ADMIN control read the page as SILENT and 4.3 reported a blind control on an instance that is not blind at
   * all. The holder's instances therefore join the audit log in the FIRST group, which is the same reason the
   * comment below already gives for `/admin/audit`. */
  /* ⛔ AND THE ORDER INSIDE THE FIRST GROUP MATTERS TOO, MEASURED. Putting the holder's instances first was not
   * enough: the BARE instance is requested by five viewers in three modes before `?tab=audit` is reached, and every
   * one of those fifteen renders writes its own `player.record_viewed` row against the same target — so the decay is
   * monotonic and visible inside a single instance (`?tab=activity` carried on `document` and `flight` and not on
   * `flight+tree`). The instance whose control depends on the ring window is therefore requested FIRST of all, when
   * only the warm-up's single row sits ahead of the fixture's. ⛔ This is ordering, not population: nothing is
   * dropped from `MUST_CARRY`, and the pollutant is the probe's own traffic, not the product. */
  const RING_FIRST = (n: string) => n === "/admin/players/[id]<holder>?tab=audit";
  const FIRST = (n: string) => n === "/admin" || n.startsWith("/admin/audit") || n.startsWith("/admin/players/[id]<holder>");
  const rank = (n: string) => (RING_FIRST(n) ? 0 : FIRST(n) ? 1 : 2);
  ROUTES.sort((x, y) => rank(x.name) - rank(y.name));
  for (const route of ROUTES) {
    /* ⛔ AND ON A RING_FIRST INSTANCE THE ADMIN GOES FIRST, which is the other half of the ordering above. The
       viewer loop runs `player, holder, trigger, staff, admin`, and each of the four earlier renders writes its
       own `player.record_viewed` row against the same target — so the ADMIN, whose non-zero body is the CONTROL
       that makes every other viewer's zero worth anything, read the ring AFTER four more rows had pushed the
       fixture's down it. A control that decays with request order is a control that will one day report a blind
       instance as a measured one. ⛔ Ordering only: no viewer and no instance is dropped. */
    const order = RING_FIRST(route.name)
      ? [...viewers].sort((a, b) => Number(b[0] === "admin") - Number(a[0] === "admin"))
      : viewers;
    for (const [viewer] of order) {
      const modes: Array<[string, Record<string, string>]> = [
        ["document", { cookie: cookies[viewer], "sec-fetch-mode": "navigate" }],
        ["flight", { cookie: cookies[viewer], RSC: "1" }],
        ["flight+tree", { cookie: cookies[viewer], RSC: "1", "Next-Router-State-Tree": encodeURIComponent(JSON.stringify(treeOf(route.segs))) }],
      ];
      for (const [mode, headers] of modes) {
        try {
          const r = await fetchFollowingRsc(route.path, headers);
          const found = needles(r.body);
          /* ⛔ 551(b) · the split happens HERE, where the body is in hand — and the body of every response
             that carries a needle of EITHER kind is written out, so a reader can check the verdict. */
          const forms = echoFormsFor(route.path, route.segs);
          const { leaks: hits, echoed } = classifyHits(r.body, found, forms);
          if (found.length > 0 && viewer !== "admin") writeFileSync(join(OUT, "bodies", `${viewer}-${fileName(route.name)}-${mode.replace("+", "_")}.txt`), r.body);
          if (echoSample === null && viewer !== "admin" && echoed.length > 0 && hits.length === 0) {
            echoSample = { viewer, route: route.name, mode, body: r.body, forms, echoed };
          }
          rows.push({ viewer, route: route.name, path: route.path, mode, status: r.status, hits: hits.slice(0, 8), echoed: echoed.slice(0, 8) });
        } catch (e) { rows.push({ viewer, route: route.name, mode, error: String(e).slice(0, 200) }); }
      }
    }
  }
  for (const path of API_PATHS) {
    for (const [viewer] of viewers) {
      try {
        const r = await fetchFollowingRsc(path, { cookie: cookies[viewer] });
        const found = needles(r.body);
        /* An API route has no router state, so its echo set is the requested URL alone. */
        const { leaks: hits, echoed } = classifyHits(r.body, found, echoFormsFor(path, path.split("?")[0].split("/").filter(Boolean)));
        if (found.length > 0 && viewer !== "admin") writeFileSync(join(OUT, "bodies", `${viewer}-${fileName(path)}-api.txt`), r.body);
        rows.push({ viewer, route: path, path, mode: "api", status: r.status, hits: hits.slice(0, 8), echoed: echoed.slice(0, 8) });
      } catch (e) { rows.push({ viewer, route: path, mode: "api", error: String(e).slice(0, 200) }); }
    }
  }
  writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 2));

  /**
   * ⛔ THE AUDIENCE-AWARE CLASSIFICATION (ruling 393), AND WHY IT IS NOT ONE RULE FOR EVERYONE.
   * A player, the holder and a trigger player are outside EVERY console audience, so a single house hit anywhere is a
   * leak. A non-owner STAFF officer is different by design: ruling 260 gates the audit rows "whole for the route's
   * audience", and register row X13 records that a COMPLIANCE officer legitimately reads house audit rows on
   * `/admin/players/[id]`. So its hits are FAILURES on the console's own prefix — owner-only — and REPORTED
   * everywhere else.
   * ⛔ THE CONSOLE'S EXPECTATION IS A LITERAL HERE, never `isOwnerOnlyPath`: a test that recomputes the code's own
   * answer proves nothing about the code.
   */
  const PLAYER_STANDARD = new Set(["player", "holder", "trigger"]);
  const onConsole = (route: string) => route === CONSOLE_PREFIX || route.startsWith(`${CONSOLE_PREFIX}?`) || route.startsWith(`${CONSOLE_PREFIX}/`);
  const nonStaff = rows.filter((r) => r.viewer !== "admin");
  const leaks = nonStaff.filter((r) => (r.hits?.length ?? 0) > 0 && (PLAYER_STANDARD.has(r.viewer) || onConsole(r.route)));
  const staffElsewhere = rows.filter((r) => r.viewer === "staff" && (r.hits?.length ?? 0) > 0 && !onConsole(r.route));
  const errored = rows.filter((r) => r.error);
  ok("4.0 · every request was answered (no transport error)", errored.length === 0, errored.slice(0, 5).map((r) => `${r.viewer} ${r.route} ${r.mode}: ${r.error}`).join(" · "));
  /* ⛔ THE TWO POPULATIONS ARE PRINTED SEPARATELY, BECAUSE THEY ARE HELD TO DIFFERENT STANDARDS. The label read
     "N responses from four non-audience viewers" over the whole `nonStaff` count, while `leaks` holds the PLAYER
     standard everywhere and the STAFF viewer only on the console prefix — so the printed number was larger than
     the population the assertion actually judges by that standard, and a reader could not tell which was which. */
  const judgedEverywhere = nonStaff.filter((r) => PLAYER_STANDARD.has(r.viewer));
  const judgedOnConsole = nonStaff.filter((r) => !PLAYER_STANDARD.has(r.viewer) && onConsole(r.route));
  ok(`4.1 · ⛔ D19 · no response carries a house word, an account's label or id, or a canary amount — to a player, the holder or a trigger player ANYWHERE (${judgedEverywhere.length} responses from three viewers), or to a non-owner staff officer on ${CONSOLE_PREFIX} (${judgedOnConsole.length} responses), over ${ROUTES.length} page instances and ${API_PATHS.length} API routes; ${nonStaff.length} non-staff responses in all`,
    judgedEverywhere.length > 0 && judgedOnConsole.length > 0 && leaks.length === 0, leaks.slice(0, 12).map((r) => `${r.viewer} ${r.route} ${r.mode} ${r.status}: ${r.hits.slice(0, 3).join("|")}`).join(" · "));
  /**
   * ⛔ 4.1e · THE ECHOES ARE PRINTED AND COUNTED, NEVER SILENTLY DROPPED (replan ruling 551(b)).
   * A number that disappears from a report is a number nobody can argue with. Every needle the classifier moved
   * out of `leaks` is counted here and held to a claim that can fail: it must be a literal piece of the URL the
   * viewer themselves requested. A needle that is NOT in that URL cannot have been echoed out of it, and saying
   * so here is what stops `echoed` becoming a place to put an inconvenient hit.
   */
  const echoedRows = nonStaff.filter((r) => (r.echoed?.length ?? 0) > 0 && (PLAYER_STANDARD.has(r.viewer) || onConsole(r.route)));
  const notInUrl = echoedRows.flatMap((r: Any) => (r.echoed as string[]).filter((n) => !String(r.path ?? "").includes(n)).map((n) => `${r.viewer} ${r.route} ${r.mode}: ${n}`));
  ok(`4.1e · ⛔ 551(b) · ECHOED, not leaked: ${echoedRows.length} of the ${judgedEverywhere.length + judgedOnConsole.length} judged responses carried a needle whose every occurrence lies in a position the REQUEST put there — and every one of them is a literal piece of the URL that viewer asked for`,
    notInUrl.length === 0, notInUrl.slice(0, 8).join(" · "));
  /**
   * ⛔ 4.1c · THE PLANTED CONTROL, AND IT IS THE WHOLE JUSTIFICATION FOR 4.1e EXISTING AT ALL.
   * A classifier that called everything an echo and a classifier that discriminates print the same `leaks: 0`.
   * So a REAL body from this very run — one whose needles the classifier called echoes — has the SAME needle
   * planted into two positions the product would use if it genuinely leaked: a rendered table cell and a JSON
   * payload field. Both must come back as LEAKS. The plant goes in at an index no echo span covers, so it cannot
   * work by splitting an echo in half.
   * ⛔ And the fourth half pins where the verdict comes FROM: the untouched body, judged against a DIFFERENT
   * request's echo forms, must be a LEAK. Without it "an id is an echo" would pass this control.
   */
  if (echoSample === null) {
    ok("4.1c · CONTROL · a real body whose needles were all echoes was captured to plant into", false,
      "no non-admin console response carried an echoed needle with no leak beside it — the control could not be run");
  } else {
    const ctl = echoSample;
    const needle = ctl.echoed[0];
    const at = outsideEveryEchoSpan(ctl.body, ctl.forms);
    const plant = (piece: string) => `${ctl.body.slice(0, at)}${piece}${ctl.body.slice(at)}`;
    const cellBody = plant(`<tr><td class="p-3 tabular">${needle}</td></tr>`);
    const payloadBody = plant(`{"houseBotId":"${needle}","stakeTzs":${CANARY.botExposure}}`);
    const asIs = classifyHits(ctl.body, [needle], ctl.forms);
    const cell = classifyHits(cellBody, [needle], ctl.forms);
    const payload = classifyHits(payloadBody, [needle], ctl.forms);
    const otherForms = echoFormsFor("/admin/roles?tab=reads", ["admin", "roles"]);
    const other = classifyHits(ctl.body, [needle], otherForms);
    ok(`4.1c · CONTROL · on ${ctl.viewer} ${ctl.route} ${ctl.mode} the untouched body's needle is an ECHO — so the classifier is not simply calling everything a leak`,
      asIs.echoed.length === 1 && asIs.leaks.length === 0, `${needle.slice(0, 10)}… · spans ${echoSpans(ctl.body, ctl.forms).length} · plant index ${at} of ${ctl.body.length}`);
    ok("4.1c · CONTROL · ⭐ the SAME id planted into a RENDERED CELL of that same body is reported as a LEAK — a store-read id on a page still turns 4.1 red",
      cell.leaks.length === 1 && cell.echoed.length === 0, `leaks ${cell.leaks.length} · echoed ${cell.echoed.length}`);
    ok("4.1c · CONTROL · ⭐ …and planted into a JSON PAYLOAD FIELD beside a canary amount it is reported as a LEAK too",
      payload.leaks.length === 1 && payload.echoed.length === 0, `leaks ${payload.leaks.length} · echoed ${payload.echoed.length}`);
    ok("4.1c · CONTROL · the verdict is derived from THIS request: the untouched body judged against another route's echo forms is a LEAK, so `it is an id, therefore it is an echo` cannot pass here",
      other.leaks.length === 1 && other.echoed.length === 0, `leaks ${other.leaks.length} · echoed ${other.echoed.length}`);
  }
  /**
   * ⛔ 4.1b · 393 · THE OWNER-ONLY BRANCH, DRIVEN BY A REAL STAFF SESSION OVER THE WIRE, WITH ITS CONTROL.
   * Zero hits for this viewer is worth something only where the ADMIN has non-zero on the SAME instance — otherwise
   * it is a page that says nothing to anybody, and the silence proves nothing.
   */
  const staffConsole = rows.filter((r) => r.viewer === "staff" && onConsole(r.route));
  const staffConsoleHits = staffConsole.filter((r) => (r.hits?.length ?? 0) > 0);
  const adminConsoleHitInstances = new Set(rows.filter((r) => r.viewer === "admin" && onConsole(r.route) && (r.hits?.length ?? 0) > 0).map((r) => r.route));
  ok(`4.1b · 393 · a NON-OWNER STAFF officer receives NOTHING from any console instance, in all three modes — with the ADMIN carrying house data on the same instances (${staffConsole.length} staff responses)`,
    staffConsole.length > 0 && staffConsoleHits.length === 0 && adminConsoleHitInstances.size >= 2,
    `${staffConsoleHits.slice(0, 6).map((r) => `${r.route} ${r.mode} ${r.status}: ${r.hits.slice(0, 3).join("|")}`).join(" · ")} | ADMIN carries on: ${[...adminConsoleHitInstances].sort().join(", ")}`);
  ok("4.1b · 393 · …and that staff session really was signed in, not merely refused at the edge — it reached a route its own domain grants",
    rows.some((r) => r.viewer === "staff" && r.route.startsWith("/admin/audit") && (r.status ?? 0) === 200),
    [...new Set(rows.filter((r) => r.viewer === "staff").map((r) => `${r.status}`))].join(","));
  /* ⛔ REPORTED, NOT FAILED (393): outside the console's prefix a staff officer's hits are ruling 260's own design. */
  for (const r of [...new Set(staffElsewhere.map((r) => r.route))].sort()) {
    notMeasured(`4.1b.x · ${r}`, "a non-owner staff officer sees house data here, which ruling 260 grants by the route's own audience (X13) — reported, never failed");
  }
  /* ⛔ 4.2's POPULATION IS THE NON-STAFF VIEWERS, NOT "EVERYONE BUT THE ADMIN" (corrected with ruling 393's staff
   * viewer). A COMPLIANCE officer is STAFF: `/api/admin/kyc-doc` and `/api/admin/transactions/export` answering it
   * 200 is the product working, and folding it into this assertion would have turned a correct grant into a failure
   * — and, worse, taught the next session to relax the rule. What the staff officer must not receive is measured by
   * 4.1b, on the console's own prefix. */
  const apiNonStaff = nonStaff.filter((r) => r.mode === "api" && PLAYER_STANDARD.has(r.viewer));
  ok("4.2 · every admin API route refuses a non-staff account (status 400 or above)", apiNonStaff.length > 0 && apiNonStaff.every((r) => (r.status ?? 0) >= 400),
    [...new Set(apiNonStaff.map((r) => `${r.route} ${r.status}`))].join(" · "));
  /* ⛔ AND THE STAFF OFFICER'S OWN API RESULTS ARE PRINTED RATHER THAN ASSERTED: a role's API grants are the RBAC
   * suites' subject, not this probe's, and an assertion here would be a second, weaker copy of them. */
  const apiStaff = rows.filter((r) => r.mode === "api" && r.viewer === "staff");
  ok("4.2b · 393 · the staff officer's admin API results are recorded, and none of them carries a house needle",
    apiStaff.length > 0 && apiStaff.every((r) => (r.hits?.length ?? 0) === 0),
    [...new Set(apiStaff.map((r) => `${r.route} ${r.status}`))].join(" · "));
  const adminHitRoutes = new Set(rows.filter((r) => r.viewer === "admin" && (r.hits?.length ?? 0) > 0).map((r) => r.route));
  /**
   * ⛔ THE POSITIVE CONTROL, RE-ANCHORED BY OWNER RULING D20 (C5-5b, 2026-09-18). It named the six R2/R9 display pages
   * until the un-build removed the display: those pages now carry house data for NOBODY, so expecting the ADMIN to see it
   * there would make 4.1 unfalsifiable — every viewer silent, the pass meaningless. What an ADMIN still receives, and the
   * gate of rulings 259/260 still governs, is the house AUDIT rows: the audit log (default and by category), the holder's
   * player page, and the KYC case — the two surfaces whose leak was MEASURED when ruling 260 was written. If those go
   * silent too, this control fails and 4.1's clean result is void.
   *
   * ⛔ THE KYC CASE BELONGS HERE (C5-5b review, d19-hunt-03). It was dropped with the six display pages, but it is not one
   * of them: `/admin/kyc/[id]` still reads the holder's durable audit rows through the gate
   * (`houseAuditForConsole(…, "/admin/kyc", getAuditForTargetDurable("User", id, …))`), and this probe's own first-time
   * designation writes `house_bot.password_verified` and `house_bot.designated` against that holder. A route the ADMIN no
   * longer hits is reclassified NOT MEASURED by the loop below, so shrinking this list turns a proof into a non-measurement.
   */
  /**
   * ⭐ `/admin/desk` JOINS THE LIST WITH THE PAGE (C7-SPEC ruling 315). A console page the ADMIN control reads as
   * SILENT would otherwise be reclassified `4.nm` NOT MEASURED by the loop below — a page whose zero-hit result for
   * every other viewer proves nothing. What makes the desk's own body a hit is its OWN copy, not a planted audit row:
   * the roster renders the designated account's LABEL, which is one of this probe's needles. ⛔ So the house fixture
   * must leave at least one designated account, and the checkpoint READS the printed 4.3 line to confirm the control
   * is non-empty on `/admin/desk` BY NAME — never on the audit routes alone.
   * ⚠️ `?tab=` instances of the desk stay OUT of this list while the roster is the only panel: ruling 315's reason
   * (the strip's own sentence being a words-family hit) does not hold under ruling 453, which made every rendered
   * sentence neutral. The label is the hit, and the label is on the roster.
   */
  const MUST_CARRY = ["/admin/audit", "/admin/audit?category=SYSTEM", "/admin/audit?category=COMPLIANCE", "/admin/audit?category=ADMIN", `/admin/players/[id]<holder>`, `/admin/players/[id]<holder>?tab=audit`, `/admin/kyc/[id]<holder>`,
    /* ⭐ EVERY CONSOLE INSTANCE, and `?tab=limits` is the one that needed ruling 374 to be measurable at all: its
       body carries no account label — the roster's needle — because it renders limits and usage only. Its house
       data IS the money, and the canary amounts are what make money a needle. */
    "/admin/desk", "/admin/desk?tab=roster", "/admin/desk?tab=limits"];
  ok("4.3 · CONTROL · the ADMIN's own responses still carry house data where it exists after D20's un-build — the audit log (default, SYSTEM, COMPLIANCE and ADMIN, where the house actions and the value rows are), the holder's player page with and without its audit tab, the KYC case's durable target read, and the desk's own roster",
    MUST_CARRY.every((r) => adminHitRoutes.has(r)), `missing: ${MUST_CARRY.filter((r) => !adminHitRoutes.has(r)).join(", ") || "none"} · ADMIN carries house data on ${adminHitRoutes.size} route instances`);
  const silent = [...new Set(rows.map((r) => r.route))].filter((r) => !adminHitRoutes.has(r)).sort();
  for (const r of silent) notMeasured(`4.nm · ${r}`, "the ADMIN control carries no house data there, so its absence for the other viewers proves nothing about that page");
  const summary = { requests: rows.length, nonStaff: nonStaff.length, leaks: leaks.length, echoed: echoedRows.length, staffConsoleResponses: staffConsole.length, staffElsewhereReported: staffElsewhere.length, canaryForms: CANARY_STRINGS.length, consoleInstances: consoleInstances.length, adminRouteInstancesWithHouseData: [...adminHitRoutes].sort(), notMeasured: silent,
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
