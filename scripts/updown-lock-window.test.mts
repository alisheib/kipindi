/**
 * test:updown-lock-window — A ROUND IN ITS LOCK WINDOW STAYS ON THE BOARD (live fix, 2026-10-14; S12-PLAN F2).
 *
 *   npm run test:updown-lock-window        the in-memory store
 *   npm run test:updown-lock-window-db     the same suite on a real Postgres (boots the on-box cluster through db-scratch)
 *   npm run red:updown-lock-window         --prove-red: §2's defects planted IN MEMORY, each must be caught
 *
 * 🔴 THE DEFECT. `getBoard` kept the started rounds whose state was "open" or "confirming" (updown-board.ts, the
 * `started` filter, written 2026-07-24), and `roundState` has answered "locked" from the lock to the boundary since E-72
 * (2026-08-04) — so a fresh server render of /updown in a round's lock window (a reload, or the 20-second poll) had NO
 * current round, while a page loaded earlier went on drawing that round as locked on its own clock (`roundPhase`). The
 * player who had just bet watched their round disappear for the last 20% of it, and the settled card beside it promised
 * "the next match is one card away" over a gap. The round page kept it; the board did not.
 * ⭐ THE BOARD KEEPS EVERY STARTED ROUND THAT HAS NOT SETTLED (`roundIsSettled`), so a state added later cannot be
 * silently dropped the way "locked" was.
 *
 *   §1 THE BEHAVIOUR, on the store the service chose. A settled round, then its successor opened where it closed, a
 *      player's stake on it; the successor is the board's current round while betting is open, and after its lock it is
 *      STILL the current round — drawn "locked", the holder's stake and both outcomes on it, the settled card's successor
 *      pointing at it, the round page agreeing, a guest seeing it too — and the state the server now renders is the
 *      phase a page loaded while betting was open has reached on its own clock. Its red is the parent commit's: there
 *      the locked round is missing from the board. (The lock is the market's own `selectionClosedAt`, stamped into the
 *      past — the field `buyPosition` enforces; the suite does not wait four minutes for it.)
 *   §2 THE SOURCE. The `started` filter, executed from its own text over every state of the union: every started round
 *      that has not settled is kept, a settled one is not, and a round whose window has not begun is not.
 *
 * ⛔ §1 runs on the real tree only. `--prove-red` plants §2 in a copy of the text held in memory, under a GREEN control.
 * ⛔ No multiplier is read or asserted anywhere here: Up & Down choices say Up and Down only (owner ruling, 2026-10-14).
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import ts from "typescript";
import pg from "pg";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const BOARD = "src/lib/server/updown-board.ts";
const PHASE = "src/lib/updown-card-phase.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
};
const J = (v: unknown) => JSON.stringify(v);

/** Compile a TS module's text to CommonJS and return its exports (no imports allowed but the ones handed in). */
function compileModule(src: string, deps: Record<string, unknown> = {}): Record<string, any> {
  const module = { exports: {} as Record<string, unknown> };
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", js)((name: string) => {
    if (name in deps) return deps[name];
    throw new Error(`unexpected import ${name}`);
  }, module, module.exports);
  return module.exports;
}

/* ── §2 · the selection, executed from the board's own text ─────────────────────────────────────────────────── */
type World = { read: (rel: string) => string };
function runSource(world: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const check = (id: string, cond: boolean, extra = "") => {
    log(`${cond ? "  ✓" : "  ✗"} ${id}${!cond && extra ? ` — ${extra}` : ""}`);
    if (!cond) failed.push(id);
  };
  const board = decomment(world.read(BOARD));
  const phase = compileModule(world.read(PHASE), { "@/lib/feedback-timing": { DWELL_HANDOVER_HOLD_MS: 4_000 } });
  const m = /const started = mapped\.filter\(\s*(\(r\) =>[\s\S]*?),\s*\);/.exec(board);
  let keep: ((r: { state: string; opensAt: string }) => boolean) | null = null;
  const NOW = Date.parse("2026-10-14T12:00:00.000Z");
  if (m) {
    try {
      keep = compileModule(`export const make = (roundIsSettled: any, nowMs: number) => ${m[1]};`).make(phase.roundIsSettled, NOW);
    } catch { keep = null; }
  }
  const UNION = (readRaw(PHASE).match(/export type RoundPhaseState = ([^;]+);/)?.[1] ?? "").split("|").map((x) => x.trim().replace(/"/g, "")).filter(Boolean);
  const began = new Date(NOW - 60_000).toISOString(), later = new Date(NOW + 60_000).toISOString();
  const verdict = (state: string, opensAt = began) => (keep ? keep({ state, opensAt }) : null);
  check("2.0 control · the filter was found and compiled, and the state union is the six states the card knows",
    !!keep && UNION.length === 6 && ["open", "locked", "closing", "confirming", "resolved", "void"].every((s) => UNION.includes(s)), `${!!keep} · ${UNION.join(",")}`);
  check("2.1 ★ a started LOCKED round is kept — the round between the lock and the boundary",
    verdict("locked") === true, String(verdict("locked")));
  check("2.2 every started round that has not settled is kept (open, locked, closing, confirming)",
    UNION.filter((s) => !phase.roundIsSettled(s)).every((s) => verdict(s) === true), J(UNION.map((s) => [s, verdict(s)])));
  check("2.3 a settled round is not a started round (resolved, void) — it reaches the board as the last result, not as current",
    UNION.filter((s) => phase.roundIsSettled(s)).length === 2 && UNION.filter((s) => phase.roundIsSettled(s)).every((s) => verdict(s) === false));
  check("2.4 ⛔ a round whose window has not begun is never kept, whatever its state (`opensAt <= now` stays load-bearing)",
    ["open", "locked", "confirming"].every((s) => verdict(s, later) === false));
  check("2.5 the current round is still the newest started one, and the one behind it shows only while confirming",
    /const current = started\[0\] \?\? null;/.test(board) && /const justClosed = started\.slice\(1\)\.find\(\(r\) => r\.state === "confirming"\) \?\? null;/.test(board));
  return failed;
}

if (PROVE_RED) {
  const real: World = { read: readRaw };
  const planted = (from: string, to: string): World => {
    const base = readRaw(BOARD);
    if (base.split(from).length !== 2) throw new Error(`missing or ambiguous live anchor in ${BOARD}: ${from}`);
    return { read: (r) => (r === BOARD ? base.replace(from, to) : readRaw(r)) };
  };
  const control = runSource(real, () => {});
  console.log(`control (the real tree): ${control.length === 0 ? "every §2 check passes" : `FAILS ${control.join(", ")}`}`);
  let missed = control.length ? 1 : 0;
  const KEEP = "(r) => !roundIsSettled(r.state) && Date.parse(r.opensAt) <= nowMs,";
  const plants: Array<[string, string, string, string]> = [
    ["the pre-fix filter: open and confirming only (the lock window dropped)", KEEP, '(r) => (r.state === "open" || r.state === "confirming") && Date.parse(r.opensAt) <= nowMs,', "2.1"],
    ["a listed filter that forgets a live state", KEEP, '(r) => (r.state === "open" || r.state === "locked" || r.state === "confirming") && Date.parse(r.opensAt) <= nowMs,', "2.2"],
    ["a settled round kept as current", KEEP, '(r) => r.state !== "void" && Date.parse(r.opensAt) <= nowMs,', "2.3"],
    ["a round not yet begun kept", KEEP, "(r) => !roundIsSettled(r.state),", "2.4"],
    ["the oldest started round made current", "const current = started[0] ?? null;", "const current = started[started.length - 1] ?? null;", "2.5"],
  ];
  for (const [name, from, to, want] of plants) {
    const failed = runSource(planted(from, to), () => {});
    const hit = failed.some((f) => f.startsWith(want));
    console.log(`${hit ? "PROVED" : "MISSED"} ${name} → ${want} (${failed.join(", ") || "nothing failed"})`);
    if (!hit) missed++;
  }
  console.log(`\nupdown-lock-window red: ${plants.length} plants; control ${control.length === 0 ? "green" : "RED"}; ${missed === 0 ? "every plant caught" : `${missed} problem(s)`}`);
  process.exit(missed === 0 ? 0 : 1);
}

/* ── the store: Postgres when the cluster is offered, else memory ─────────────────────────────────────────────── */
const RAW = process.env.VERIFY_DATABASE_URL ?? "";
let DB = "";
let appPrisma: { $disconnect(): Promise<void> } | null = null;
if (RAW) {
  let host = "";
  try { host = new URL(RAW).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("!! refusing: this suite creates and drops a database and runs only against a loopback cluster.");
    process.exit(2);
  }
  DB = `ud_lockwin_${process.pid}`;
  const admin = new pg.Client({ connectionString: RAW });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${DB}"`);
  await admin.end();
  const URL_DB = `${RAW.replace(/\/[^/?]*(\?.*)?$/, "")}/${DB}?connect_timeout=30`;
  console.log(`Applying migrations to ${DB} …`);
  execFileSync("npx", ["prisma", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: URL_DB }, stdio: "inherit", shell: process.platform === "win32" });
  process.env.DATABASE_URL = URL_DB;
  process.env.USE_PRISMA_DAL = "true";
}
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER = "false";
process.env.HOUSE_BOT_ENGINE = "false";
delete process.env.ANTHROPIC_API_KEY;
const ON_POSTGRES = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";

try {
  await import("./lib/verified-fixtures.mts");
  const { db } = await import("../src/lib/server/store.ts");
  const { buyPosition } = await import("../src/lib/server/market-service.ts");
  const { marketStore } = await import("../src/lib/server/market-dal.ts");
  const { getBoard, getRoundDetail } = await import("../src/lib/server/updown-board.ts");
  const UC = await import("../src/lib/server/updown-config.ts");
  const UD = await import("../src/lib/server/updown-dal.ts");
  const { openRound, closeRound } = await import("../src/lib/server/updown-service.ts");
  const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry.ts");
  const { roundPhase, msOrNull } = await import("../src/lib/updown-card-phase.ts");
  if (ON_POSTGRES) appPrisma = (await import("../src/lib/server/prisma.ts")).prisma() as never;
  console.log(`\nstore: ${ON_POSTGRES ? `Postgres (${DB})` : "memory"}`);

  if (!ON_POSTGRES) { UD.__resetUpDownMemoryStores(); UC.__resetUpDownConfig(); }
  await seedDefaultSources();
  try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" }); } catch { /* present */ }

  const KEY = `LKW${process.pid % 1000}`;
  const asset = await UC.createAsset({ key: KEY, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币", iconKey: "crypto",
    priceSourceUrl: "https://www.kitco.com/price/crypto", category: "crypto", decimals: 2, minMoveTicks: 2 }, "off");
  if (!asset.ok) throw new Error(`asset: ${asset.error}`);
  await UC.setAssetEnabled(asset.data.id, true, "off");
  const chainR = await UC.createChain({ assetId: asset.data.id, durationMinutes: 5 }, "off");
  if (!chainR.ok) throw new Error(`chain: ${chainR.error}`);
  await UC.setChainState(chainR.data.id, "RUNNING", "off");
  const chain = (await UD.chainStore.get(chainR.data.id))!;
  async function confirmed(iso: string, price: number): Promise<string> {
    const o = await UD.observationStore.ensure(asset.data.id, iso);
    await UD.observationStore.confirm(o.id, { price, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: iso, evidence: `q ${price}`, confidence: 95, model: "t", rawHash: `h${price}${iso}` });
    return o.id;
  }
  let seq = 0;
  async function player(cash: number): Promise<string> {
    const id = `usr_lkw_${process.pid}_${++seq}`;
    const now = new Date().toISOString();
    await db.user.create({ id, phoneE164: `+2556${String(process.pid % 10_000).padStart(4, "0")}${String(seq).padStart(4, "0")}`, email: null,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW",
      displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
      twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: cash, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
    return id;
  }

  /* ── the previous round: opened so it closes in a few seconds, waited out, settled ── */
  const WAIT_MS = 6_000;
  const prevOpen = new Date(Date.now() - 5 * 60_000 + WAIT_MS).toISOString();
  const prev = await openRound(chain, prevOpen, await confirmed(prevOpen, 62_000), 62_000);
  if (!prev.ok) throw new Error(`previous round: ${prev.error}`);
  await new Promise((r) => setTimeout(r, Date.parse(prev.data.closesAt) - Date.now() + 250));
  // ONE reading at the boundary closes the previous round and opens the next — `advanceChain`'s own shape.
  const boundaryObs = await confirmed(prev.data.closesAt, 62_500);
  const closed = await closeRound(prev.data.id, boundaryObs, 62_500);
  if (!closed.ok) throw new Error(`previous round close: ${(closed as { error?: string }).error}`);

  /* ── its successor opens where it closed — the round under test ── */
  const round = await openRound(chain, prev.data.closesAt, boundaryObs, 62_500);
  if (!round.ok) throw new Error(`round: ${round.error}`);
  const { id: roundId, marketId } = round.data;
  const holder = await player(50_000), other = await player(50_000);
  for (const [uid, side, stake] of [[holder, "YES", 2_000], [other, "NO", 3_000]] as Array<[string, "YES" | "NO", number]>) {
    const r = await buyPosition(uid, { marketId, side, stake, idempotencyKey: `lkw-${uid}` });
    if (!r.ok) throw new Error(`fixture bet: ${(r as { error?: string }).error}`);
  }

  console.log("\n§1 · the board through the round's life");
  const open = await getBoard({ assetKey: KEY, durationMinutes: 5, userId: holder });
  const openRow = open.rounds[0];
  ok("1.0 control · while betting is open the round is the board's current round, open, the holder's stake on it",
    openRow?.roundId === roundId && openRow.state === "open" && openRow.myUpStake === 2_000,
    J(open.rounds.map((r) => [r.roundId === roundId ? "ROUND" : r.roundId === prev.data.id ? "PREV" : r.roundId, r.state])));
  ok("1.0 control · the settled round beside it is the previous one, and its successor is this round",
    open.rounds.some((r) => r.roundId === prev.data.id && (r.state === "resolved" || r.state === "void") && r.successor.roundId === roundId));

  // The lock: the market's own `selectionClosedAt` — the instant `buyPosition` enforces — passes.
  await marketStore.stamp(marketId, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });
  const refused = await buyPosition(holder, { marketId, side: "YES", stake: 1_000, idempotencyKey: `lkw-late-${holder}` });
  ok("1.1 control · the round IS in its lock window: the bet path refuses a stake now (SELECTION_CLOSED)",
    !refused.ok && (refused as { code?: string }).code === "SELECTION_CLOSED", J(refused));

  const locked = await getBoard({ assetKey: KEY, durationMinutes: 5, userId: holder });
  const row = locked.rounds.find((r) => r.roundId === roundId);
  ok("1.2 ★ a fresh render in the lock window STILL shows the round — the board's current round, not a gap",
    locked.rounds[0]?.roundId === roundId,
    J(locked.rounds.map((r) => [r.roundId === roundId ? "ROUND" : r.roundId === prev.data.id ? "PREV" : r.roundId, r.state])));
  ok("1.3 ★ drawn LOCKED, with the holder's stake on it and both outcomes stated for the holder",
    row?.state === "locked" && row.myUpStake === 2_000 && row.myDownStake === 0
      && typeof row.myPayoutIfUp === "number" && row.myPayoutIfUp > 0 && row.myPayoutIfDown === 0,
    J(row && { state: row.state, up: row.myUpStake, ifUp: row.myPayoutIfUp, ifDown: row.myPayoutIfDown }));
  const prevRow = locked.rounds.find((r) => r.roundId === prev.data.id);
  ok("1.4 the settled card beside it still names this round as the next match — and that card is on the board",
    !!prevRow && prevRow.successor.roundId === roundId && locked.rounds.length === 2, J(prevRow?.successor));
  // ⭐ "Exactly as the client's live state shows it": a page loaded while betting was open holds state "open" and
  // derives the lock on its own server-anchored clock (`roundPhase`). The fresh render and that page agree.
  const nowMs = row?.serverNowMs ?? Date.now();
  const sel = msOrNull(row?.selectionClosedAt ?? null), close = Date.parse(row?.closesAt ?? "");
  const live = roundPhase({ state: "open", selectionClosesAtMs: sel, closesAtMs: close, nowMs });
  const fresh = roundPhase({ state: (row?.state ?? "open") as never, selectionClosesAtMs: sel, closesAtMs: close, nowMs });
  ok("1.5 ★ the fresh render's phase is the phase the page loaded at the open has reached: locked, not bettable, on both",
    live.locked && !live.bettable && fresh.locked && !fresh.bettable, J({ live, fresh }));
  const detail = await getRoundDetail(roundId, holder);
  ok("1.6 the round page agrees: locked", detail?.round.state === "locked", detail?.round.state);
  const guest = await getBoard({ assetKey: KEY, durationMinutes: 5 });
  ok("1.7 a signed-out visitor sees the locked round too (no stake of theirs on it)",
    guest.rounds[0]?.roundId === roundId && guest.rounds[0].state === "locked" && guest.rounds[0].myUpStake === 0);
  ok("1.8 nothing invented: no multiplier field rides the round, and the pool is the stakes placed",
    !!row && !("estMultiplier" in row) && row.pricing.upPool === 2_000 && row.pricing.downPool === 3_000, J(row?.pricing));

  console.log("\n§2 · the source");
  const failed2 = runSource({ read: readRaw }, (l) => console.log(l));
  for (const id of ["2.0", "2.1", "2.2", "2.3", "2.4", "2.5"]) ok(`§${id} (see above)`, !failed2.some((f) => f.startsWith(id)));
} finally {
  try { await appPrisma?.$disconnect(); } catch { /* nothing to close */ }
  if (DB) {
    const drop = new pg.Client({ connectionString: RAW });
    try { await drop.connect(); await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); }
    catch (e) { console.error(`!! scratch database "${DB}" not dropped: ${e instanceof Error ? e.message : String(e)}`); }
    finally { try { await drop.end(); } catch { /* gone */ } }
  }
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — test:updown-lock-window (${ON_POSTGRES ? "Postgres" : "memory"}): ${pass} passed, ${fail} failed`);
if (pass === 0) { console.error("!! ZERO assertions ran — treating as failure."); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
