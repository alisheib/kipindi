/**
 * test:bet-landed-key — A LOST ANSWER NO LONGER BECOMES A SECOND BET ONCE THE FIRST HAS COMMITTED (live fix L2, the
 * Vodacom plan's S8-PLAN A23 item 1; Ali's ruling of 2026-10-12: "fix now").
 *
 *   npm run test:bet-landed-key     (in predeploy)
 *   npm run red:bet-landed-key      (--prove-red: every source defect below is planted IN MEMORY and must be caught)
 *
 * 🔴 THE DEFECT IT CLOSES, FOR EVERY PLAYER. A bet carries an idempotency key, and the same key is the same bet: the
 * dial's Retry, after an unknown outcome, re-sends it. But the replay sits INSIDE the wallet lock, after every gate before
 * it, so when a bet LANDED and only its answer was lost, that Retry could be refused by a gate that came up meanwhile —
 * maintenance answered "Nothing has been charged" about a bet that had been charged, the dial wiped itself on that
 * terminal refusal, and its next confirm minted a fresh key: a SECOND bet. `buyPosition` now answers a refusal made
 * before the in-lock replay with the receipt of the bet that key already placed, for that player, with those figures.
 *
 *   §1 THE BEHAVIOUR — the real `buyPosition` on the store the service chose (in memory, or Postgres when DATABASE_URL is
 *      set). A bet lands under K1. Then, under each gate in turn — maintenance, a drained rate bucket, betting closed, a
 *      cooling-off break — the same player's K1 is answered with that bet (`replayed`, its own id and `placedAt`) while a
 *      fresh key is still refused by the gate. Never answered: K1 with other figures, another player's use of K1, a
 *      house stake's key on the caller's own account, a request with no key. The override is recorded
 *      (`market.position.replayed`, the gate's reason). The wallet is debited once; one position stands. A refusal made
 *      AFTER the in-lock lookup asks nothing more (in memory: the positions are read once, not twice). And when the key's
 *      read fails without an earlier uncertain internal attempt, the genuine gate refusal stands (in memory only).
 *   §2 THE SOURCE — the ask sits inside admission, after the bet path, behind its three conditions (written in any
 *      order); the in-lock lookup marks the reach first; the answer checks owner, house marker and figures, records the
 *      override, and a failed read is null only without prior internal uncertainty or a known matching landed key;
 *      `placeHouseBet` does not ask.
 *   §3 THE WIRING — this suite in predeploy; its red twin declared.
 *   §4 THE INTERNAL RETRY FAULT — execute the real compiled outer functions, real transient retry and real sheet
 *      refusal/settle rules with a bounded inner-attempt fixture (not a PostgreSQL commit-loss or money proof). An
 *      attempt crosses the key lookup, records a fixture commit and loses its answer; maintenance/break then refuse,
 *      and recovery lookup fails. The neutral unknown retains the same key with no no-money claim. Genuine no-money,
 *      pre-lock-fault, keyless and in-lock refusals, a definitive missing key and a recovered receipt remain controls.
 *
 * ⛔ §1 runs on the real tree only (a planted market-service cannot be rebuilt in memory). Its red is the parent
 * commit's: there §1.2, §1.3, §1.9, §1.11 and §1.13 fail — each gate's refusal returned for a key that had landed (on
 * maintenance, "Nothing has been charged"), and no override recorded. `--prove-red` plants §2 and §3 in a copy of the text held in memory, with a
 * GREEN control (the return guard written in another order, the house check split in two) under which nothing may fail.
 */
import "./lib/verified-fixtures.mts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, getMarket } from "../src/lib/server/market-service.ts";
import { positionStore, marketStore } from "../src/lib/server/market-dal.ts";
import { setPlatformConfig } from "../src/lib/server/platform-config.ts";
import { rateCheck, rateRefund } from "../src/lib/server/rate-limit.ts";
import { coolOff } from "../src/lib/server/responsible-gambling.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";
import { transform } from "esbuild";
import { withTransientRetry } from "../src/lib/server/retry.ts";
import { answerOf, refusalOutcome, settleRefusal } from "../src/lib/journey/sheet-refusal.ts";
import { afterSettle, type SheetIntent, type SheetSeed } from "../src/lib/journey/sheet-state.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const SERVICE = "src/lib/server/market-service.ts";
const PKG = "package.json";
/** §1 runs on whichever store the service chose — Postgres when DATABASE_URL is set and USE_PRISMA_DAL is not "false" (market-dal.ts). */
const ON_POSTGRES = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";

type World = { read: (rel: string) => string };
const REAL: World = { read: readRaw };

/** A function's text, from `export async function <name>(` (or `async function`) to the next top-level declaration. */
function fnText(src: string, name: string): string {
  const at = src.search(new RegExp(`\\n(?:export )?async function ${name}\\(`));
  if (at < 0) return "";
  const rest = src.slice(at + 1);
  const next = rest.slice(1).search(/\n(?:export |async |function |const |type |\/\*\*)/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

function runSource(world: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (id: string, label: string, cond: boolean, extra = "") => {
    log(`${cond ? "  ✓" : "  ✗"} ${id} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
    if (!cond) failed.push(`${id} ${label}`);
  };
  const src = decomment(world.read(SERVICE));
  log("§2 the source");
  const buy = fnText(src, "buyPosition");
  const admit = buy.indexOf("withAdmission(");
  const inner = buy.indexOf("buyPositionInner(", admit);
  const ask = buy.indexOf("landedKeyAnswer(", inner);
  const busy = buy.indexOf("instanceof AdmissionBusy");
  ok("2.1", "the ask runs inside admission, after the bet path", admit >= 0 && inner > admit && ask > inner && (busy < 0 || busy > ask),
    `admission ${admit}, the bet path ${inner}, the ask ${ask}, the BUSY catch ${busy}`);
  // The return guard before the ask: the three conditions, in any order, and nothing else.
  const guard = buy.slice(inner, ask).match(/if\s*\(([^)]*)\)\s*return\s+r\s*;/)?.[1] ?? "";
  const terms = guard.split("||").map((t) => t.replace(/\s+/g, ""));
  const want = ["r.ok", "!opts.idempotencyKey", "reach.reached"];
  ok("2.2", "…behind its three conditions: a bet that went through, no key, the in-lock lookup reached",
    terms.length === 3 && want.every((w) => terms.includes(w)), `guard ${JSON.stringify(guard)}`);
  ok("2.3", "…answering with the receipt or the refusal while carrying prior internal uncertainty", /return\s*\(\s*await\s+landedKeyAnswer\(\s*userId\s*,\s*opts\s*,\s*r\s*,\s*reach\.uncertain\s*\)\s*\)\s*\?\?\s*r\s*;/.test(buy));
  ok("2.4", "…and each attempt starts with its current reach unmarked", /reach\.reached\s*=\s*false\s*;\s*try\s*\{\s*return\s+await\s+buyPositionInner\(/.test(buy));
  const innerFn = fnText(src, "buyPositionInner");
  ok("2.5", "the in-lock lookup marks the reach first",
    /if\s*\(\s*reach\s*\)\s*reach\.reached\s*=\s*true\s*;\s*const\s+existing\s*=\s*await\s+positionStore\.findByIdempotencyKey\(\s*opts\.idempotencyKey\s*,\s*lockTx\s*\)/.test(innerFn));
  const answer = fnText(src, "landedKeyAnswer");
  ok("2.6", "the answer checks the owner and refuses a house stake's key", /p\.userId\s*!==\s*userId/.test(answer) && /p\.houseBotId\s*!=\s*null/.test(answer));
  ok("2.7", "…and answers only the very bet asked for again (question, side, stake)",
    /p\.marketId\s*!==\s*opts\.marketId/.test(answer) && /p\.side\s*!==\s*opts\.side/.test(answer) && /p\.stake\s*!==\s*opts\.stake/.test(answer));
  ok("2.8", "…records the override beside the gate's own record", /action:\s*"market\.position\.replayed"/.test(answer) && /refused:/.test(answer));
  ok("2.9", "…is the bet's own receipt, marked replayed", /replayed:\s*true/.test(answer) && /placedAt:\s*p\.placedAt/.test(answer) && /positionId:\s*p\.id/.test(answer));
  ok("2.10", "…and only prior internal uncertainty or a known landed key makes a failed read neutral uncertainty",
    /catch\s*\{\s*if\s*\(\s*uncertain\s*\|\|\s*landed\s*\)\s*throw\s+new\s+Error\("We could not confirm this bet's outcome\."\);\s*return\s+null\s*;\s*\}/.test(answer) && !/system_error/.test(answer));
  ok("2.11", "placeHouseBet does not ask it (the house answers its key at H0)", fnText(src, "placeHouseBet").length > 0 && !fnText(src, "placeHouseBet").includes("landedKeyAnswer"));
  ok("2.12", "a thrown attempt beyond the key lookup remembers uncertainty across later internal attempts",
    /uncertain:\s*false/.test(buy) && /catch\s*\(err\)\s*\{\s*if\s*\(reach\.reached\)\s*reach\.uncertain\s*=\s*true\s*;\s*throw\s+err\s*;/.test(buy)
      && !/reach\.uncertain\s*=\s*false/.test(buy));
  ok("2.13", "a matching landed key keeps its authority through a missing/failed balance read, without fabricating zero",
    /landed\s*=\s*true\s*;\s*const\s+w\s*=\s*await\s+db\.wallet\.findByUserId/.test(answer)
      && /if\s*\(!w\s*\|\|\s*!Number\.isSafeInteger\(w\.balance\)\s*\|\|\s*w\.balance\s*<\s*0\)/.test(answer)
      && /balance:\s*w\.balance/.test(answer) && !/w\?\.balance\s*\?\?\s*0/.test(answer));
  log("§3 the wiring");
  const sc = (JSON.parse(world.read(PKG)) as { scripts: Record<string, string> }).scripts;
  ok("3.1", "test:bet-landed-key runs this suite", sc["test:bet-landed-key"] === "tsx scripts/bet-landed-key.test.mts");
  ok("3.2", "red:bet-landed-key is its red twin", sc["red:bet-landed-key"] === "tsx scripts/bet-landed-key.test.mts --prove-red");
  ok("3.3", "predeploy runs it", (sc.predeploy ?? "").split("&&").map((x) => x.trim()).includes("npm run test:bet-landed-key"));
  return failed;
}

// ── §1 the behaviour ───────────────────────────────────────────────────────────────────────────────────────────────────
async function runBehaviour(log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (id: string, label: string, cond: boolean, extra = "") => {
    log(`${cond ? "  ✓" : "  ✗"} ${id} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
    if (!cond) failed.push(`${id} ${label}`);
  };
  const now = () => new Date().toISOString();
  const player = async (id: string, phone: string, balance = 100_000) => {
    await db.user.create({
      id, phoneE164: phone, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
      displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
      marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
  };
  await player("lk_a", "+255760000101");
  await player("lk_b", "+255760000102");
  await player("lk_c", "+255760000103");
  await player("lk_d", "+255760000104", 2_000);
  const market = await createMarket({
    titleEn: "Landed-key market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  const STAKE = 5_000;
  const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
  const held = async (uid: string) => (await positionStore.listForUserAndMarket(uid, market.id)).length;
  const bet = (uid: string, key?: string, stake = STAKE) =>
    buyPosition(uid, { marketId: market.id, side: "YES", stake, ...(key ? { idempotencyKey: key } : {}) });
  type R = Awaited<ReturnType<typeof buyPosition>>;
  const show = (r: R) => JSON.stringify(r.ok ? { ok: true, id: r.data?.positionId, replayed: r.data?.replayed } : { ok: false, code: r.code, reason: (r as { reason?: string }).reason });
  const reasonOf = (r: R) => (r.ok ? null : (r as { reason?: string }).reason ?? null);
  const replays = async () => { await auditFlush(); return getAuditPage({ limit: 500 }).filter((e) => e.action === "market.position.replayed"); };

  log(`§1 the behaviour (the real buyPosition, ${ON_POSTGRES ? "on Postgres" : "in memory"})`);
  const K1 = "lk-key-1";
  const first = await bet("lk_a", K1);
  ok("1.1", "control: a bet under K1 lands, once", first.ok && !first.data?.replayed, show(first));
  if (!first.ok || !first.data) return [...failed, "1.1 the fixture bet did not land: nothing else can be measured"];
  const id = first.data.positionId, placedAt = first.data.placedAt;
  const isK1 = (r: R) => r.ok && r.data?.replayed === true && r.data.positionId === id && r.data.placedAt === placedAt;

  await setPlatformConfig({ maintenanceMode: true, maintenanceNote: null }, "lk_officer");
  const before = (await replays()).length;
  const m1 = await bet("lk_a", K1);
  ok("1.2", "maintenance on: the same player's K1 is answered with its bet, not \"Nothing has been charged\"", isK1(m1), show(m1));
  const after = await replays();
  const rows = after.slice(0, Math.max(0, after.length - before)); // newest first
  const row = rows.find((e) => e.targetId === id) as { payload?: { refused?: { reason?: string | null } } } | undefined;
  ok("1.3", "…and the override is recorded beside the gate's own record (market.position.replayed, the gate's reason)",
    rows.length === 1 && row?.payload?.refused?.reason === "maintenance", JSON.stringify(rows.map((e) => e.payload)));
  const m2 = await bet("lk_a", "lk-key-2");
  ok("1.4", "…while a fresh key is refused for maintenance (a gate still guards a NEW bet)", reasonOf(m2) === "maintenance", show(m2));
  const m3 = await bet("lk_a", K1, STAKE + 1_000);
  ok("1.5", "…and K1 sent with other figures is not that bet: the refusal stands", !m3.ok && reasonOf(m3) === "maintenance", show(m3));
  const m4 = await bet("lk_b", K1);
  ok("1.6", "…and another player's use of K1 is never answered with it (refused for maintenance)", !m4.ok && reasonOf(m4) === "maintenance", show(m4));
  const m5 = await bet("lk_a");
  ok("1.7a", "…and a request with no key is refused as before", !m5.ok && reasonOf(m5) === "maintenance", show(m5));
  // A house stake's key on the caller's OWN account (the holder of a desk bot): never answered to a player request.
  await positionStore.set({
    id: "pos_lk_house", userId: "lk_c", marketId: market.id, side: "YES", stake: STAKE, bonusStakeTzs: 0, potentialPayout: STAKE,
    status: "OPEN", finalPayout: null, placedAt: now(), settledAt: null, idempotencyKey: "lk-house-key", houseBotId: "hb_lk",
  } as never);
  const m6 = await bet("lk_c", "lk-house-key");
  ok("1.7b", "…and a house stake's key on the caller's own account is never answered with it", !m6.ok && reasonOf(m6) === "maintenance", show(m6));
  await setPlatformConfig({ maintenanceMode: false, maintenanceNote: null }, "lk_officer");
  const c1 = await bet("lk_b", K1);
  ok("1.8", "maintenance off: another player's K1 is refused as a conflict, as before", !c1.ok && reasonOf(c1) === "idempotency_key_conflict", show(c1));

  let drained = 0;
  while (rateCheck("lk_a", "bet.place").allowed) drained++;
  const r1 = await bet("lk_a", K1);
  ok("1.9", "a drained rate bucket: K1 is answered with its bet", isK1(r1), show(r1));
  const r2 = await bet("lk_a", "lk-key-3");
  ok("1.10", "…while a fresh key is told to slow down", reasonOf(r2) === "rate_limited", show(r2));
  for (let i = 0; i <= drained + 2; i++) rateRefund("lk_a", "bet.place");

  const kept = (await getMarket(market.id))?.selectionClosedAt ?? null;
  await marketStore.stamp(market.id, { selectionClosedAt: new Date(Date.now() - 60_000).toISOString() });
  const s1 = await bet("lk_a", K1);
  ok("1.11", "betting closed: K1 is answered with its bet", isK1(s1), show(s1));
  const s2 = await bet("lk_a", "lk-key-4");
  ok("1.12", "…while a fresh key is refused (selection closed)", !s2.ok && s2.code === "SELECTION_CLOSED", show(s2));
  await marketStore.stamp(market.id, { selectionClosedAt: kept });

  // In memory: the positions are read through one Map on globalThis, shared by every copy of the store module, so its
  // reads can be counted and failed here. (A method patched on this file's `positionStore` would not reach the
  // service's copy under every loader.)
  const rowsMap = (globalThis as { __50PICK_POSITIONS?: Map<string, unknown> }).__50PICK_POSITIONS;
  if (ON_POSTGRES || !rowsMap) {
    log("  · 1.14, 1.15 NOT RUN on Postgres — the reads are counted and failed on the in-memory store (run without DATABASE_URL)");
  } else {
    const counting = async (fn: () => Promise<R>): Promise<{ r: R; reads: number }> => {
      let reads = 0;
      const real = Map.prototype.values;
      (rowsMap as unknown as { values: () => IterableIterator<unknown> }).values = function (this: Map<string, unknown>) { reads++; return real.call(this); };
      try { return { r: await fn(), reads }; } finally { delete (rowsMap as unknown as { values?: unknown }).values; }
    };
    // A refusal made AFTER the in-lock lookup (a short balance) reads the positions as often as the same refusal made
    // with no key, plus the in-lock lookup's one read: the ask after it never runs.
    const keyless = await counting(() => bet("lk_d", undefined, 5_000));
    const keyed = await counting(() => bet("lk_d", "lk-key-short", 5_000));
    ok("1.14", "a refusal made after the in-lock lookup asks nothing more (the positions read once more than with no key, not twice)",
      reasonOf(keyless.r) === "balance_insufficient" && reasonOf(keyed.r) === "balance_insufficient" && keyed.reads === keyless.reads + 1,
      `no key: ${keyless.reads} read(s) ${show(keyless.r)} · keyed: ${keyed.reads} read(s) ${show(keyed.r)}`);
    // The key's read failing: the gate's refusal stands exactly as the gate made it.
    await setPlatformConfig({ maintenanceMode: true, maintenanceNote: null }, "lk_officer");
    (rowsMap as unknown as { values: () => never }).values = () => { throw new Error("planted: the key's read fails"); };
    let f1: R;
    try { f1 = await bet("lk_a", K1); } finally { delete (rowsMap as unknown as { values?: unknown }).values; }
    ok("1.15", "the key's read failing: the gate's refusal stands as it was (maintenance), never a new kind of answer",
      !f1.ok && reasonOf(f1) === "maintenance", show(f1));
    await setPlatformConfig({ maintenanceMode: false, maintenanceNote: null }, "lk_officer");
  }

  await coolOff("lk_a", "1h");
  const b1 = await bet("lk_a", K1);
  ok("1.13", "a cooling-off break: K1 is answered with its bet (a replay places nothing)", isK1(b1), show(b1));
  const b2 = await bet("lk_a", "lk-key-5");
  ok("1.16", "…while a fresh key is refused for the break", !b2.ok && reasonOf(b2) === "cooling_off", show(b2));

  const a = await bal("lk_a"), b = await bal("lk_b");
  ok("1.17", "the wallet was debited once: A holds 100,000 less one stake, B untouched", a === 100_000 - STAKE && b === 100_000, `A ${a}, B ${b}`);
  const ha = await held("lk_a"), hb = await held("lk_b");
  ok("1.18", "and one bet stands: A holds K1's bet alone on the market, B none", ha === 1 && hb === 0 && (await positionStore.findByIdempotencyKey(K1))?.id === id, `A ${ha}, B ${hb}`);
  return failed;
}

// ── §4 execute the internal-retry boundary, without SQL, HTTP or a second money service ────────────────────────────────

async function runRecoveryFaultProof(world: World, log: (line: string) => void): Promise<string[]> {
  const src = decomment(world.read(SERVICE));
  const compiled = await transform(`${fnText(src, "buyPosition")}\n${fnText(src, "landedKeyAnswer")}`, {
    loader: "ts", format: "cjs", target: "node24",
  });
  type R = Awaited<ReturnType<typeof buyPosition>>;
  type Case = { first?: "before-lock" | "after-lock"; lookup?: "fault" | "missing" | "placed"; reason?: "maintenance" | "cooling_off"; keyless?: boolean; inLock?: boolean; wallet?: "fault" | "missing" | "invalid" | "zero" };
  const quote = { marketId: "mkt_retryproof", side: "YES" as const, stake: 5_000 };
  const key = "internal-retry-key";
  const run = async (c: Case) => {
    let attempts = 0, fixtureCommits = 0, lookups = 0;
    const reason = c.reason ?? "maintenance";
    const refused = { ok: false, error: "gate refusal", code: c.inLock ? "INVALID" : "SUSPENDED", reason: c.inLock ? "balance_insufficient" : reason };
    const module = { exports: {} as { buyPosition: typeof buyPosition } };
    new Function("module", "exports", "withAdmission", "withTransientRetry", "buyPositionInner", "positionStore", "db", "audit", "AdmissionBusy", compiled.code)(
      module, module.exports, (fn: () => Promise<R>) => fn(), withTransientRetry,
      async (_user: string, _opts: unknown, _ctx: unknown, reach: { reached: boolean }) => {
        attempts++;
        if (attempts === 1 && c.first) {
          reach.reached = c.first === "after-lock";
          if (reach.reached) fixtureCommits++;
          throw Object.assign(new Error("private database connection details must not escape"), { code: "08006" });
        }
        if (c.inLock) reach.reached = true;
        return refused;
      },
      { findByIdempotencyKey: async () => {
        lookups++;
        if (c.lookup === "fault") throw new Error("private database recovery details must not escape");
        if (c.lookup !== "placed") return null;
        return { id: "pos_retryproof", userId: "retryproof", houseBotId: null, marketId: quote.marketId, side: quote.side, stake: quote.stake,
          potentialPayout: 9_000, placedAt: "2026-10-14T00:00:00.000Z" };
      } },
      { wallet: { findByUserId: async () => {
        if (c.wallet === "fault") throw new Error("private wallet lookup details must not escape");
        if (c.wallet === "missing") return null;
        return { balance: c.wallet === "invalid" ? NaN : c.wallet === "zero" ? 0 : 95_000 };
      } } }, () => {}, class AdmissionBusy extends Error {},
    );
    const answer = await answerOf(() => module.exports.buyPosition("retryproof", { ...quote, ...(c.keyless ? {} : { idempotencyKey: key }) }));
    const outcome = refusalOutcome(answer);
    const settled = settleRefusal(outcome, { state: "none" }, { inDoubt: false, priorSettledAt: null, seed: { id: quote.marketId } as SheetSeed,
      quote, nowMs: Date.now() });
    const intent: SheetIntent = { key, quote, phase: "placing", sentAt: Date.now(), settledAt: null };
    return { answer, outcome, settled, next: afterSettle(intent, settled, Date.now()), attempts, fixtureCommits, lookups };
  };
  const failed: string[] = [];
  const ok = (id: string, label: string, pass: boolean) => { log(`${pass ? "  ✓" : "  ✗"} ${id} ${label}`); if (!pass) failed.push(`${id} ${label}`); };
  log("§4 actual compiled recovery + real retry + real sheet rules (inner-attempt fixture; no SQL/HTTP/money)");
  for (const [reason, id] of [["maintenance", "4.1"], ["cooling_off", "4.2"]] as const) {
    const r = await run({ first: "after-lock", lookup: "fault", reason });
    ok(id, `lost commit answer → ${reason} → key-read fault retains uncertainty and the same key`,
      r.attempts === 2 && r.fixtureCommits === 1 && r.lookups === 1 && r.answer.kind === "rejected" && r.outcome.frame === "unknown"
      && !r.outcome.moneyClaim && r.settled.marker === "keepKey" && r.settled.retry === "same" && r.next?.key === key && r.next.phase === "inDoubt");
    ok(`${id}a`, "the refusal exposes no database details or codes",
      r.answer.kind === "rejected" && r.answer.error instanceof Error && r.answer.error.message === "We could not confirm this bet's outcome."
      && !("code" in r.answer.error));
  }
  const plain = await run({ lookup: "fault" });
  ok("4.3", "genuine pre-gate refusal without prior uncertain attempt stays a refusal", plain.fixtureCommits === 0 && plain.answer.kind === "resolved"
    && plain.outcome.reason === "maintenance" && plain.settled.marker === "dropKey");
  const before = await run({ first: "before-lock", lookup: "fault" });
  ok("4.4", "an earlier pre-lock transport fault does not invent a committed bet", before.attempts === 2 && before.fixtureCommits === 0
    && before.answer.kind === "resolved" && before.outcome.reason === "maintenance");
  const noKey = await run({ keyless: true, lookup: "fault", reason: "cooling_off" });
  ok("4.5", "a keyless genuine RG refusal asks no recovery lookup", noKey.attempts === 1 && noKey.lookups === 0
    && noKey.answer.kind === "resolved" && noKey.outcome.reason === "cooling_off");
  const placed = await run({ first: "after-lock", lookup: "placed" });
  ok("4.6", "a verified matching committed key returns its original receipt", placed.fixtureCommits === 1 && placed.outcome.frame === "receipt"
    && placed.outcome.receipt?.positionId === "pos_retryproof" && placed.outcome.receipt.replayed && placed.settled.marker === "clear");
  const absent = await run({ first: "after-lock", lookup: "missing" });
  ok("4.7", "a successful definitive missing-key read preserves the genuine refusal", absent.lookups === 1 && absent.answer.kind === "resolved"
    && absent.outcome.reason === "maintenance");
  const inLock = await run({ first: "after-lock", lookup: "fault", inLock: true });
  ok("4.8", "a refusal after the current in-lock key read does not ask the outer recovery reader", inLock.lookups === 0
    && inLock.answer.kind === "resolved" && inLock.outcome.reason === "balance_insufficient");
  for (const [wallet, id] of [["fault", "4.9"], ["missing", "4.10"], ["invalid", "4.11"]] as const) {
    const r = await run({ lookup: "placed", wallet });
    ok(id, `known matching landed key + ${wallet} wallet keeps the identity, without a refusal or fabricated balance`,
      r.answer.kind === "rejected" && r.answer.error instanceof Error && r.answer.error.message === "We could not confirm this bet's outcome."
      && r.outcome.frame === "unknown" && !r.outcome.moneyClaim && r.settled.marker === "keepKey" && r.next?.key === key);
  }
  const zero = await run({ lookup: "placed", wallet: "zero" });
  ok("4.12", "a real measured zero balance still returns the committed receipt", zero.answer.kind === "resolved"
    && (zero.answer.value as R).ok && (zero.answer.value as { data?: { balance: number } }).data?.balance === 0 && zero.outcome.frame === "receipt");
  return failed;
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────────────

if (!PROVE_RED) {
  console.log("bet-landed-key — live fix L2: a lost answer no longer becomes a second bet once the first has committed");
  const failed = [...(await runBehaviour((l) => console.log(l))), ...runSource(REAL, (l) => console.log(l)), ...(await runRecoveryFaultProof(REAL, (l) => console.log(l)))];
  console.log(`\nBET LANDED KEY — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const plantIn = (file: string, from: string, to: string, base: World = REAL): World => {
    const raw = base.read(file);
    const n = raw.split(from).length - 1;
    if (n !== 1) throw new Error(`plant anchor in ${file} occurs ${n} times, not once: ${JSON.stringify(from.slice(0, 60))}`);
    const planted = raw.replace(from, to);
    return { read: (rel) => (rel === file ? planted : base.read(rel)) };
  };
  const GUARD = "      if (r.ok || !opts.idempotencyKey || reach.reached) return r;\n";
  const ASK = "      return (await landedKeyAnswer(userId, opts, r, reach.uncertain)) ?? r;\n";
  const OWNER = "    if (!p || p.userId !== userId || p.houseBotId != null) return null;\n";
  const FIGURES = "    if (p.marketId !== opts.marketId || p.side !== opts.side || p.stake !== opts.stake) return null;\n";
  const MARK = "      if (reach) reach.reached = true; // L2: from here on a refusal was made with the key already looked up\n";
  type Plant = { name: string; expect: RegExp; world: () => World };
  const plants: Plant[] = [
    { name: "buyPosition never asks (the defect as it was)", expect: /^2\.(1|3) /, world: () => plantIn(SERVICE, ASK, "      return r;\n") },
    { name: "it asks after an in-lock refusal too (the reach ignored)", expect: /^2\.2 /,
      world: () => plantIn(SERVICE, GUARD, "      if (r.ok || !opts.idempotencyKey) return r;\n") },
    { name: "the in-lock lookup no longer marks the reach", expect: /^2\.5 /, world: () => plantIn(SERVICE, MARK, "") },
    { name: "the owner is not checked (another player's key would be answered with that player's bet)", expect: /^2\.6 /,
      world: () => plantIn(SERVICE, OWNER, "    if (!p || p.houseBotId != null) return null;\n") },
    { name: "a house stake's key is answered to a player", expect: /^2\.6 /,
      world: () => plantIn(SERVICE, OWNER, "    if (!p || p.userId !== userId) return null;\n") },
    { name: "the figures are not compared (a key sent with other figures is answered)", expect: /^2\.7 /,
      world: () => plantIn(SERVICE, FIGURES, "") },
    { name: "the override is not recorded", expect: /^2\.8 /,
      world: () => plantIn(SERVICE, "      action: \"market.position.replayed\",\n", "      action: \"market.position.opened\",\n") },
    { name: "a prior internal uncertainty is erased by the recovery reader", expect: /^2\.10 /,
      world: () => plantIn(SERVICE, "    if (uncertain || landed) throw new Error(\"We could not confirm this bet's outcome.\");\n", "") },
    { name: "the house path asks it as well", expect: /^2\.11 /,
      world: () => plantIn(SERVICE, "    { maxWaitMs: 0 });\n  } catch (err) {", "    { maxWaitMs: 0 }).then(async (x) => (x.ok ? x : (await landedKeyAnswer(botUserId, opts, x)) ?? x));\n  } catch (err) {") },
    { name: "predeploy without the suite", expect: /^3\.3 /, world: () => plantIn(PKG, "npm run test:bet-landed-key && ", "") },
  ];
  // ⭐ GREEN: the same rules written differently — the return guard's three conditions in another order, and the owner
  // and house checks split in two statements. Nothing may fail.
  const green = plantIn(SERVICE, OWNER, "    if (!p || p.userId !== userId) return null;\n    if (p.houseBotId != null) return null;\n",
    plantIn(SERVICE, GUARD, "      if (reach.reached || r.ok || !opts.idempotencyKey) return r;\n"));
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const quiet = () => {};
  const clean = runSource(REAL, quiet);
  ok("the REAL tree passes every source check", clean.length === 0, clean.join(" | "));
  const g = runSource(green, quiet);
  ok("GREEN: the guard in another order and the house check split pass every source check", g.length === 0, g.join(" | "));
  for (const p of plants) {
    let failures: string[];
    try { failures = runSource(p.world(), quiet); } catch (e) { ok(p.name, false, `the plant could not be made: ${(e as Error).message}`); continue; }
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  const runtimePlants = [
    { name: "a post-key thrown attempt is forgotten", from: "          if (reach.reached) reach.uncertain = true;\n", to: "", expect: /^4\.1 / },
    { name: "each retry erases the earlier uncertainty", from: "        reach.reached = false;\n", to: "        reach.reached = false; reach.uncertain = false;\n", expect: /^4\.1 / },
    { name: "the recovery call drops its uncertainty flag", from: ASK, to: "      return (await landedKeyAnswer(userId, opts, r)) ?? r;\n", expect: /^4\.1 / },
    { name: "the recovery reader swallows the observed money uncertainty", from: "    if (uncertain || landed) throw new Error(\"We could not confirm this bet's outcome.\");\n", to: "", expect: /^4\.1 / },
    { name: "a pre-lock fault invents money uncertainty", from: "          if (reach.reached) reach.uncertain = true;\n", to: "          reach.uncertain = true;\n", expect: /^4\.4 / },
    { name: "all genuine pre-gate read faults are made unknown", from: "    if (uncertain || landed) throw new Error(\"We could not confirm this bet's outcome.\");\n", to: "    throw new Error(\"We could not confirm this bet's outcome.\");\n", expect: /^4\.3 / },
    { name: "the recovery error leaks database details", from: "  } catch {\n    if (uncertain || landed) throw new Error(\"We could not confirm this bet's outcome.\");\n", to: "  } catch (err) {\n    if (uncertain || landed) throw err;\n", expect: /^4\.1a / },
    { name: "a known landed key is forgotten after its wallet fault", from: "    landed = true;\n", to: "", expect: /^4\.9 / },
    { name: "only internal uncertainty is kept, ignoring the matching landed key", from: "    if (uncertain || landed) throw new Error(\"We could not confirm this bet's outcome.\");\n", to: "    if (uncertain) throw new Error(\"We could not confirm this bet's outcome.\");\n", expect: /^4\.9 / },
    { name: "a missing wallet fabricates zero for a known committed bet", from: "    if (!w || !Number.isSafeInteger(w.balance) || w.balance < 0) throw new Error(\"The current balance could not be read.\");\n", to: "    if (!w) return { ok: true, data: { positionId: p.id, balance: 0, payoutIfWin: p.potentialPayout, placedAt: p.placedAt, replayed: true } };\n", expect: /^4\.10 / },
  ];
  const runtimeClean = await runRecoveryFaultProof(REAL, quiet);
  ok("REAL actual-module recovery proof passes", runtimeClean.length === 0, runtimeClean.join(" | "));
  const runtimeGreen = await runRecoveryFaultProof(green, quiet);
  ok("GREEN reordered guards also pass the executed recovery proof", runtimeGreen.length === 0, runtimeGreen.join(" | "));
  for (const p of runtimePlants) {
    const failures = await runRecoveryFaultProof(plantIn(SERVICE, p.from, p.to), quiet);
    const hit = failures.some(f => p.expect.test(f));
    if (hit) caught++;
    ok(`EXECUTED ${p.name}`, hit, hit ? "" : failures.join(" | "));
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length + runtimePlants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
