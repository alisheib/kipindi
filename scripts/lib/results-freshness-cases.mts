/**
 * THE CASES BEHIND `test:results-freshness` — R9-D (the Vodacom plan's S6 visual pass, round 9, 2026-10-11, tiles
 * 168–170): the settled archive behind /results and /fairness (`listTerminalMarkets`) is never behind a market write this
 * process has committed, and its two siblings keep the same rule — the LIVE strip's memo (`getPlatformStats`) and the
 * sign-off rulings (`objectionRulings`).
 *
 * Run by `scripts/results-freshness.test.mts` through the two-store runner: once on the memory store, once on a fresh
 * scratch Postgres, each store in its own child process (a store picks its backend when it is first imported). Every line
 * carries its store. ⛔ Only Postgres has transactions: a write on a lock's transaction is invisible to every other
 * connection until that lock commits, so §F.7 — noted at the commit, never before, never on a rollback — is proved there
 * and only stated on memory, where there is no transaction to wait for.
 *
 * ── WHAT EACH SECTION HOLDS ─────────────────────────────────────────────────────────────────────────────────────────────
 *  F.4  an EMPTY warm read is not served after a market settles (tile 170: "0 imetatuliwa" beside a settlement).
 *  F.1  resolve after a warm read → the next read has it · F.2 void (the officer's, the emergency void, an upheld
 *       objection's) · F.3 settle → the row /results and /fairness print is the stored row, and the strip names it.
 *  F.5  CONTROLS — nothing written: the memo serves with ZERO store reads; one change costs ONE read by id and never the
 *       archive; the TTL still forces a full read, timed from the FULL read; a burst longer than the log → one full read.
 *  F.6  every path that writes a market row: the Sentinel's seal, an Up & Down round, an upheld REVERSE, a
 *       re-categorisation, the short titles, the demo resolver (kept OUT, as a full read keeps it), a delete; the
 *       officer's resolve, the void and settlement are F.1–F.3, the bulk bar and the purge are in the census.
 *  F.7  the commit: on Postgres noted only once the lock's transaction commits; a page rendered in between cannot keep
 *       the old row as current; a rollback notes nothing.
 *  F.8  the siblings: the strip (F.3b, and F.8b: an Up & Down round does not re-read it) and the rulings (F.8c, F.8d).
 *  C    THE CENSUS (source): who writes the market table, and how; every store write notes; every transaction handed to
 *       one is a lock's; every objection write moves the rulings; each memo takes its mark BEFORE its read; the lock runs
 *       the queue after its commit; the TTL memos over market rows are exactly four, each classified.
 *
 * ⚠️ FIXTURES, each declared: two officers are written directly through the store (ADMIN and COMPLIANCE — the two money
 * roles); a row "from before the stage-2 stamps" (F.3c) and a demo fixture whose clock has run out (F.6.demo) are moved
 * with `marketStore.set`, and the Sentinel's market is put in automatic mode with `marketStore.stamp` — every transition
 * under test then goes through the real service: createMarket, resolveMarket, settleMarket, emergencyVoidMarket,
 * holdSettlementAsOfficer + upholdObjection, resolveDueMarket, closeRound, recategoriseMarket, autoResolveExpiredDemoMarkets.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./decomment.mts";

type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (t: string) => console.log(`${String.fromCharCode(10)}[${STORE}] ${t}`);

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.EMAIL_OUTBOX_CAPTURE = "1";
const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";
const ROOT = process.cwd();
const read = (p: string): string => { try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; } };

const { db }: Any = await import("../../src/lib/server/store.ts");
const { hasDatabase }: Any = await import("../../src/lib/server/prisma.ts");
const SVC: Any = await import("../../src/lib/server/market-service.ts");
const DAL: Any = await import("../../src/lib/server/market-dal.ts");
const LOG: Any = await import("../../src/lib/server/market-change-log.ts");
const LOCKS: Any = await import("../../src/lib/server/locks.ts");
const STATS: Any = await import("../../src/lib/server/platform-stats.ts");
const TICKER: Any = await import("../../src/lib/server/ticker-feed.ts");
const REV: Any = await import("../../src/lib/server/reversals.ts");
const OBJ: Any = await import("../../src/lib/server/objections-service.ts");
const { signoffOf }: Any = await import("../../src/lib/markets/signoff.ts");

const j = (v: unknown) => JSON.stringify(v);
const ms = DAL.marketStore;

/* ── THE READ COUNTERS — what a memo costs is the number of times it goes to the store ─────────────────────────────── */
const reads = { board: 0, byIds: 0, rulings: 0 };
const realBoard = ms.listBoard, realByIds = ms.marketsByIds, realRulings = db.objection.listUpheldRulings;
ms.listBoard = (...a: Any[]) => { reads.board++; return realBoard.apply(ms, a); };
ms.marketsByIds = (...a: Any[]) => { reads.byIds++; return realByIds.apply(ms, a); };
db.objection.listUpheldRulings = (...a: Any[]) => { reads.rulings++; return realRulings.apply(db.objection, a); };
async function counted<T>(fn: () => Promise<T>): Promise<{ value: T; board: number; byIds: number; rulings: number }> {
  const b = reads.board, i = reads.byIds, r = reads.rulings;
  const value = await fn();
  return { value, board: reads.board - b, byIds: reads.byIds - i, rulings: reads.rulings - r };
}

/* ── FIXTURES ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
let seq = 0;
const uid = (p: string) => `${p}_${process.pid}_${++seq}`;
async function officer(p: string, role: "ADMIN" | "COMPLIANCE"): Promise<string> {
  const id = uid(p);
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: `${id}@t.tz`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as never);
  return id;
}
const OFFICER_A = await officer("r9d_admin", "ADMIN");
const OFFICER_B = await officer("r9d_compliance", "COMPLIANCE");

const future = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
async function poll(tag: string, extra: Record<string, unknown> = {}): Promise<Any> {
  return SVC.createMarket({
    titleEn: `R9D ${tag} poll ${process.pid}`, titleSw: `R9D ${tag} kura`, category: "sports",
    sourceUrl: "https://www.bbc.com/sport", resolutionCriterion: "The official final result as published.",
    resolutionAt: future(120), proposedBy: OFFICER_A, ...extra,
  });
}
const resolve = (id: string, outcome: string) =>
  SVC.resolveMarket({ marketId: id, outcome, officerId: OFFICER_A, evidence: "The official final result." });
/**
 * Wait until the clock is strictly past a row's seal. `signoffOf` counts a ruling only if it came AFTER the seal
 * (`r.at > resolutionStage2At`), and a fixture can resolve and rule inside one millisecond — which no officer can, and
 * which made F.8c pass or fail on the clock (seen once in fifteen runs) rather than on the memo.
 */
async function pastTheSeal(id: string): Promise<void> {
  const sealed = Date.parse((await row(id))?.resolutionStage2At ?? "") || 0;
  while (Date.now() <= sealed + 1) await new Promise((done) => setTimeout(done, 2));
}
const settle = (id: string) => SVC.settleMarket(id, { force: true, actorId: OFFICER_A });
const row = (id: string): Promise<Any> => ms.get(id);
const terminal = (key: string): Promise<Any[]> => SVC.listTerminalMarkets(key);
/**
 * A warm read COPIED at read time — for a case that compares a field of it after a write. ⚠️ On the memory store the memo
 * holds the store's own row objects, and several services change the object `marketStore.get` handed them in place before
 * writing it, so a "before" read through the live array would already show the "after". On Postgres every read is a copy.
 */
const snapshot = async (key: string): Promise<Any[]> => (await terminal(key)).map((m) => ({ ...m }));
const has = (rows: Any[], id: string) => rows.some((m) => m.id === id);
const find = (rows: Any[], id: string): Any => rows.find((m) => m.id === id);

/** The archive with NO memo — the same two passes `listTerminalMarkets` makes, straight from the store. */
async function uncached(key: string): Promise<Any[]> {
  const [r, v] = await Promise.all([
    SVC.listMarkets({ status: "RESOLVED", productLine: key }),
    SVC.listMarkets({ status: "VOIDED", productLine: key }),
  ]);
  return [...r, ...v];
}
/** What /results and /fairness read off a row (results/page.tsx, fairness/page.tsx, signoff.ts). */
const FIELDS = [
  "status", "resolvedOutcome", "resolutionStage1By", "resolutionStage2By", "resolutionStage2At", "updatedAt", "settledAt",
  "category", "titleEn", "titleSw", "titleZh", "yesPool", "noPool", "predictorCount", "sourceUrl", "resolutionCriterion",
  "productLine", "shortTitleEn",
];
/** "" when the memo holds exactly the store's archive — each row once, every field above equal; else the first difference. */
async function divergence(key: string, memo: Any[]): Promise<string> {
  const fresh = await uncached(key);
  const ids = memo.map((m) => m.id);
  if (new Set(ids).size !== ids.length) return `a row is held twice (${ids.length} rows, ${new Set(ids).size} ids)`;
  const byId = new Map(memo.map((m) => [m.id, m]));
  if (byId.size !== fresh.length) return `memo ${byId.size} rows · store ${fresh.length}`;
  for (const f of fresh) {
    const m = byId.get(f.id);
    if (!m) return `the memo lacks ${f.id} (${f.status})`;
    for (const k of FIELDS) if (j(m[k] ?? null) !== j(f[k] ?? null)) return `${f.id}.${k}: memo ${j(m[k])} · store ${j(f[k])}`;
  }
  return "";
}

/** A real Up & Down round: asset → chain → confirmed observation → openRound (house-bot-engine-cases §12's fixture). */
async function openUdRound(): Promise<{ ok: true; roundId: string; marketId: string } | { ok: false; error: string }> {
  const cfg: Any = await import("../../src/lib/server/updown-config.ts");
  const uds: Any = await import("../../src/lib/server/updown-service.ts");
  const udd: Any = await import("../../src/lib/server/updown-dal.ts");
  const { seedDefaultSources, addSource }: Any = await import("../../src/lib/server/source-registry.ts");
  await seedDefaultSources();
  await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture (mirrors production)", addedBy: "system" }).catch(() => null);
  const a = await cfg.createAsset({ key: `R${process.pid}`, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2 }, OFFICER_A);
  if (!a.ok) return { ok: false, error: `asset: ${a.error}` };
  await cfg.setAssetEnabled(a.data.id, true, OFFICER_A);
  const c = await cfg.createChain({ assetId: a.data.id, durationMinutes: 5 }, OFFICER_A);
  if (!c.ok) return { ok: false, error: `chain: ${c.error}` };
  await cfg.setChainState(c.data.id, "RUNNING", OFFICER_A);
  const chain = await udd.chainStore.get(c.data.id);
  const boundary = new Date(cfg.cleanGridAnchor(Date.now() + 60_000)).toISOString();
  const o = await udd.observationStore.ensure(a.data.id, boundary);
  await udd.observationStore.confirm(o.id, { price: 60_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: boundary,
    evidence: "BTC quoted 60000", confidence: 96, model: "test-stub", rawHash: `r9d_${process.pid}` });
  const r = await uds.openRound(chain, boundary, o.id, 60_000);
  if (!r.ok) return { ok: false, error: `round: ${r.error}` };
  return { ok: true, roundId: r.data.id, marketId: r.data.marketId };
}

/* ══ §0 · the store, and an empty archive to start from ══════════════════════════════════════════════════════════════ */
section("§0 · the store under test, and an EMPTY archive to start from");
ok("0.store · the runner's store is the one under test", !!hasDatabase() === onPostgres, `hasDatabase ${hasDatabase()} · onPostgres ${onPostgres}`);
const start = await uncached("ALL");
ok("0.empty · the archive is EMPTY before the first case — F.4's precondition, or F.4 proves nothing", start.length === 0, `${start.length} rows`);

/* ══ F.4 · the EMPTY warm read ════════════════════════════════════════════════════════════════════════════════════════ */
section("F.4 · an EMPTY warm read is not served once a market settles (tile 170: “0 imetatuliwa” beside a settlement)");
{
  const e0 = await terminal("ALL"), e0m = await terminal("MARKET"), e0u = await terminal("UPDOWN");
  const p = await poll("F4");
  const r = await resolve(p.id, "YES");
  const s = await settle(p.id);
  const e1 = await terminal("ALL"), e1m = await terminal("MARKET"), e1u = await terminal("UPDOWN");
  ok("F.4a · /results' read (ALL), warmed EMPTY, has the market once it resolves and settles",
    e0.length === 0 && r.ok && s.ok && has(e1, p.id), j({ warm: e0.length, resolve: r.ok ? "ok" : r.error, settle: s.ok ? "ok" : s.error, after: e1.length }));
  ok("F.4b · /fairness' read (MARKET), warmed EMPTY, has it too", e0m.length === 0 && has(e1m, p.id), j({ warm: e0m.length, after: e1m.length }));
  ok("F.4c · CONTROL · the Up & Down read, warmed empty, stays empty — a poll is not a round", e0u.length === 0 && e1u.length === 0, j({ warm: e0u.length, after: e1u.length }));
  const dv = await divergence("ALL", e1);
  ok("F.4d · and the read is exactly the store's archive, row for row", dv === "", dv);
}

/* ══ F.1 · resolve ════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("F.1 · resolve after a warm read → the next read has it");
{
  const p = await poll("F1");
  const w = await terminal("ALL"), wm = await terminal("MARKET");
  const r = await resolve(p.id, "NO");
  const a = await terminal("ALL"), am = await terminal("MARKET");
  const m = find(a, p.id);
  ok("F.1a · ALL: the warm read lacked it; the next read has it RESOLVED · NO",
    !has(w, p.id) && r.ok && m?.status === "RESOLVED" && m?.resolvedOutcome === "NO", j({ resolve: r.ok ? "ok" : r.error, status: m?.status, outcome: m?.resolvedOutcome }));
  ok("F.1b · MARKET (/fairness): the same", !has(wm, p.id) && has(am, p.id));
  const dv = await divergence("ALL", a);
  ok("F.1c · and the read equals the store's archive", dv === "", dv);
}

/* ══ F.2 · void ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("F.2 · void → the next read has it — the officer's, the emergency void, an upheld objection's");
{
  const p = await poll("F2a");
  const w = await terminal("ALL");
  const r = await resolve(p.id, "VOID");
  const a = await terminal("ALL");
  ok("F.2a · an officer's VOID: the next read has it VOIDED", !has(w, p.id) && r.ok && find(a, p.id)?.status === "VOIDED", j({ resolve: r.ok ? "ok" : r.error, status: find(a, p.id)?.status }));
}
{
  const p = await poll("F2b");
  const w = await terminal("ALL"), wm = await terminal("MARKET");
  const v = await SVC.emergencyVoidMarket({ marketId: p.id, officerId: OFFICER_A, reason: "The fixture was abandoned." });
  const a = await terminal("ALL"), am = await terminal("MARKET");
  const st = await row(p.id), m = find(a, p.id);
  ok("F.2b · the EMERGENCY void — written on its lock's transaction — is in the next read: VOIDED, settled, its pools as stored",
    !has(w, p.id) && v.ok && m?.status === "VOIDED" && !!st?.settledAt && m?.settledAt === st.settledAt && m?.yesPool === st.yesPool && m?.noPool === st.noPool,
    j({ void: v.ok ? "ok" : v.error, memo: m && { status: m.status, settledAt: m.settledAt }, store: st && { status: st.status, settledAt: st.settledAt } }));
  ok("F.2b′ · …and on /fairness' read", !has(wm, p.id) && has(am, p.id));
}
{
  const p = await poll("F2c");
  await resolve(p.id, "YES");
  const w = await snapshot("ALL");
  const mk = LOG.marketChangeMark();
  const hold = await OBJ.holdSettlementAsOfficer(OFFICER_A, { marketId: p.id, reason: "WRONG_OUTCOME", detail: "The source published a correction." });
  const up = hold.ok ? await OBJ.upholdObjection(hold.data.objectionId, OFFICER_B, { remedy: "VOID", note: "Upheld: the source was corrected." }) : hold;
  const noted = LOG.marketsChangedSince(mk, "ALL")?.has(p.id) ?? null;
  const a = await terminal("ALL");
  ok("F.2c · an objection upheld with VOID is noted, and turns the RESOLVED row the memo held into VOIDED on the next read",
    find(w, p.id)?.status === "RESOLVED" && up.ok && noted === true && find(a, p.id)?.status === "VOIDED",
    j({ hold: hold.ok ? "ok" : hold.error, uphold: up.ok ? "ok" : up.error, noted, after: find(a, p.id)?.status }));
}

/* ══ F.3 · settle ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("F.3 · settle → what /results, /fairness and the strip show is current");
{
  const p = await poll("F3");
  await resolve(p.id, "YES");
  const strip0 = await TICKER.getTickerFeed("sw");
  const w = await snapshot("ALL");
  const mk = LOG.marketChangeMark();
  const s = await settle(p.id);
  const noted = LOG.marketsChangedSince(mk, "ALL")?.has(p.id) ?? null;
  const a = await terminal("ALL");
  const st = await row(p.id), m = find(a, p.id);
  ok("F.3a · the memo held it unsettled; settlement is noted, and the next read's row carries the stored settledAt and updatedAt",
    find(w, p.id)?.settledAt == null && s.ok && noted === true && !!st?.settledAt && m?.settledAt === st.settledAt && m?.updatedAt === st.updatedAt,
    j({ settle: s.ok ? "ok" : s.error, noted, memo: m && { settledAt: m.settledAt, updatedAt: m.updatedAt }, store: st && { settledAt: st.settledAt, updatedAt: st.updatedAt } }));
  const strip1 = await TICKER.getTickerFeed("sw");
  ok("F.3b · the LIVE strip (getPlatformStats' memo), read BEFORE the settlement, names it after — one screen, one story",
    !strip0.some((e: Any) => e.id === p.id) && strip1.some((e: Any) => e.id === p.id), j({ before: strip0.length, after: strip1.map((e: Any) => e.id) }));
}
{
  // A row from before the stage-2 stamps: /results dates it `resolutionStage2At ?? updatedAt`, and settlement moves updatedAt.
  const p = await poll("F3c");
  const base = await row(p.id);
  await ms.set({ ...base, status: "RESOLVED", resolvedOutcome: "NO", resolutionStage1By: OFFICER_A, resolutionStage1At: null,
    resolutionStage2By: null, resolutionStage2At: null, objectionsClosedAt: new Date(Date.now() - 1_000).toISOString(),
    updatedAt: new Date(Date.now() - 3_600_000).toISOString() });
  const w = await snapshot("ALL");
  const mk = LOG.marketChangeMark();
  const s = await settle(p.id);
  const noted = LOG.marketsChangedSince(mk, "ALL")?.has(p.id) ?? null;
  const a = await terminal("ALL");
  const st = await row(p.id);
  ok("F.3c · a row with no stage-2 stamp — /results dates it by updatedAt — carries settlement's updatedAt on the next read",
    !!find(w, p.id) && s.ok && noted === true && find(w, p.id)?.updatedAt !== st?.updatedAt && find(a, p.id)?.updatedAt === st?.updatedAt,
    j({ settle: s.ok ? "ok" : s.error, noted, before: find(w, p.id)?.updatedAt, after: find(a, p.id)?.updatedAt, store: st?.updatedAt }));
}

/* ══ F.5 · CONTROLS — the memo still bounds the reads ═════════════════════════════════════════════════════════════════ */
section("F.5 · CONTROL — nothing written: no store read; one change: one read by id, never the archive; the TTL still holds");
{
  const c0 = await counted(() => terminal("ALL"));
  const c1 = await counted(() => terminal("ALL"));
  const c2 = await counted(() => terminal("ALL"));
  ok("F.5a · two reads with nothing written between them: ZERO store reads, the very same rows",
    c1.board === 0 && c1.byIds === 0 && c2.board === 0 && c2.byIds === 0 && c1.value === c0.value && c2.value === c0.value,
    j({ c1: [c1.board, c1.byIds], c2: [c2.board, c2.byIds] }));
}
{
  const p = await poll("F5b");
  await terminal("ALL"); // the creation is noted too (a full-row write); its LIVE row is read and left out
  const r = await resolve(p.id, "YES");
  const c = await counted(() => terminal("ALL"));
  ok("F.5b · one market resolved → the next read makes ONE read by id and NO archive read (0 board passes)",
    r.ok && c.board === 0 && c.byIds === 1 && has(c.value, p.id), j({ board: c.board, byIds: c.byIds }));
}
{
  const p = await poll("F5d");
  await terminal("ALL");
  const ent: Any = (globalThis as Any).__50PICK_TERMINAL_MARKETS?.get("ALL");
  const r = await resolve(p.id, "NO");
  const realNow = Date.now;
  let cp: Any = null, ct: Any = null;
  try {
    (Date as Any).now = () => ent.at + SVC.TERMINAL_TTL_MS - 1_000;
    cp = await counted(() => terminal("ALL"));
    (Date as Any).now = () => ent.at + SVC.TERMINAL_TTL_MS + 1_000;
    ct = await counted(() => terminal("ALL"));
  } finally { (Date as Any).now = realNow; }
  ok("F.5d · the TTL still forces a full read, timed from the last FULL read — a patch never extends it",
    !!ent && r.ok && cp.board === 0 && cp.byIds === 1 && ct.board === 2, j({ patch: cp && [cp.board, cp.byIds], expired: ct && [ct.board, ct.byIds] }));
}
{
  await terminal("ALL");
  const mk = LOG.marketChangeMark();
  LOG.noteMarketsChanged(Array.from({ length: LOG.MARKET_CHANGE_LOG_MAX + 5 }, (_: unknown, i: number) => `r9d_burst_${i}`), "UPDOWN");
  const b1 = await counted(() => terminal("ALL"));
  const b2 = await counted(() => terminal("ALL"));
  ok("F.5e · a burst longer than the log keeps (the memo's mark falls off its end) → ONE full read, never a 1,005-id lookup; then served",
    LOG.marketsChangedSince(mk, "ALL") === null && b1.board === 2 && b1.byIds === 0 && b2.board === 0 && b2.byIds === 0,
    j({ first: [b1.board, b1.byIds], then: [b2.board, b2.byIds] }));
}

/* ══ F.6 · every writer ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("F.6 · every writer of a market row reaches the memo — through the store, after its commit");
{
  const p = await poll("F6sentinel");
  await ms.stamp(p.id, { resolutionMode: "auto" });
  const w = await terminal("ALL");
  const due = await SVC.resolveDueMarket(p.id, { assessment: {
    marketId: p.id, title: p.titleEn, determined: true, outcome: "YES", confidence: 100,
    evidence: "The official site published the final result.", sourceUrl: "https://www.bbc.com/sport/result", action: "assessed",
  } });
  const a = await terminal("ALL");
  const m = find(a, p.id);
  ok("F.6.sentinel · the Sentinel's automatic seal (a stamp, outside any transaction) is in the next read",
    !has(w, p.id) && due?.status === "resolved-auto" && m?.status === "RESOLVED" && String(m?.resolutionStage2By ?? "").startsWith("system_"),
    j({ due, status: m?.status, by: m?.resolutionStage2By }));
}
{
  const ud = await openUdRound();
  const uds: Any = await import("../../src/lib/server/updown-service.ts");
  const w = await terminal("ALL"), wu = await terminal("UPDOWN");
  await terminal("MARKET");
  await STATS.getPlatformStats();
  const cr: Any = ud.ok ? await uds.closeRound(ud.roundId, null, null, "source-failed") : { ok: false, error: ud.error };
  const a = await terminal("ALL"), au = await terminal("UPDOWN");
  const st = ud.ok ? await row(ud.marketId) : null;
  const m = ud.ok ? find(a, ud.marketId) : null;
  ok("F.6.updown · an Up & Down round closing with no price — VOIDED by a stamp, then settled — is in the next read, settled",
    ud.ok && cr.ok && !has(w, ud.marketId) && !has(wu, ud.marketId) && m?.status === "VOIDED" && !!st?.settledAt && m?.settledAt === st?.settledAt && has(au, ud.marketId),
    j({ fixture: ud.ok ? "ok" : ud.error, close: cr.ok ? cr.data : cr.error, memo: m && { status: m.status, settledAt: m.settledAt } }));
  const cm = await counted(() => terminal("MARKET"));
  ok("F.5c · …and the round's writes (the Up & Down line) leave /fairness' key alone: ZERO store reads", cm.board === 0 && cm.byIds === 0, j([cm.board, cm.byIds]));
  const cs = await counted(() => STATS.getPlatformStats());
  ok("F.8b · …and the strip's memo too (it renders polls only): ZERO store reads after a round settles", cs.board === 0 && cs.byIds === 0, j([cs.board, cs.byIds]));
}
{
  const p = await poll("F6reverse");
  await resolve(p.id, "YES");
  await pastTheSeal(p.id);
  const w = await snapshot("ALL");
  const rul0 = await REV.objectionRulings();
  const mk = LOG.marketChangeMark();
  const hold = await OBJ.holdSettlementAsOfficer(OFFICER_A, { marketId: p.id, reason: "WRONG_OUTCOME", detail: "The verdict was the wrong way round." });
  // Pages render between the hold and the ruling — the rulings memo is warm again, AFTER the hold, before the uphold —
  // so only the uphold's own write can make the next read fresh (and the hold, an OPEN objection, is no ruling).
  const rulMid = await REV.objectionRulings();
  const up = hold.ok ? await OBJ.upholdObjection(hold.data.objectionId, OFFICER_B, { remedy: "REVERSE", note: "Upheld: the result was NO." }) : hold;
  const noted = LOG.marketsChangedSince(mk, "ALL")?.has(p.id) ?? null;
  const a = await terminal("ALL");
  const rul1 = await REV.objectionRulings();
  const m = find(a, p.id);
  ok("F.6.objection · an objection upheld with REVERSE is noted, and flips the verdict the memo held (YES → NO) on the next read",
    find(w, p.id)?.resolvedOutcome === "YES" && up.ok && noted === true && m?.resolvedOutcome === "NO",
    j({ hold: hold.ok ? "ok" : hold.error, uphold: up.ok ? "ok" : up.error, noted, after: m?.resolvedOutcome }));
  const so = m ? signoffOf(m, rul1.get(p.id)) : null;
  ok("F.8c · …and the rulings memo, warm since the hold, carries the ruling after the uphold: the archive's NO is “corrected on objection”, never credited to the officer who signed YES",
    !rul0.has(p.id) && !rulMid.has(p.id) && rul1.has(p.id) && so === "objection",
    j({ before: rul0.has(p.id), afterHold: rulMid.has(p.id), after: rul1.get(p.id) ?? null, signoff: so }));
}
{
  const c1 = await counted(() => REV.objectionRulings());
  const c2 = await counted(() => REV.objectionRulings());
  ok("F.8d · CONTROL · with no objection written, the rulings memo serves: ZERO reads", c1.rulings === 0 && c2.rulings === 0, j([c1.rulings, c2.rulings]));
}
{
  const p = await poll("F6category");
  await resolve(p.id, "NO");
  const w = await snapshot("ALL");
  const rc = await SVC.recategoriseMarket({ marketId: p.id, category: "crypto", officerId: OFFICER_A });
  const a = await terminal("ALL");
  ok("F.6.recategorise · re-categorising a resolved poll (on its lock's transaction) shows the new category on the next read",
    find(w, p.id)?.category === "sports" && rc.ok && find(a, p.id)?.category === "crypto", j({ recategorise: rc.ok ? "ok" : rc.error, after: find(a, p.id)?.category }));
}
{
  const p = await poll("F6short");
  await resolve(p.id, "YES");
  const w = await snapshot("ALL");
  await LOCKS.withLock(`market:${p.id}`, async (tx: Any) => {
    await ms.setShortTitles(p.id, { shortTitleEn: "R9D short", shortTitleSw: "R9D fupi", shortTitleZh: null, competition: null }, tx);
  });
  const a = await terminal("ALL");
  ok("F.6.shortTitles · the short titles of a resolved poll, written on the lock's transaction, are in the next read",
    !!find(w, p.id) && (find(w, p.id)?.shortTitleEn ?? null) === null && find(a, p.id)?.shortTitleEn === "R9D short", j({ before: find(w, p.id)?.shortTitleEn ?? null, after: find(a, p.id)?.shortTitleEn ?? null }));
}
{
  const p = await poll("F6demo", { titleEn: `Demo · R9D demo ${process.pid}` });
  const base = await row(p.id);
  await ms.set({ ...base, resolutionAt: new Date(Date.now() - 60_000).toISOString(), selectionClosedAt: null });
  await terminal("ALL");
  const d = await SVC.autoResolveExpiredDemoMarkets();
  const st = await row(p.id);
  const a = await terminal("ALL");
  const dv = await divergence("ALL", a);
  ok("F.6.demo · a demo fixture's automatic resolution is noted, and the re-read keeps it OUT exactly as a full read does",
    st?.status === "RESOLVED" && !has(a, p.id) && dv === "", j({ resolved: d, status: st?.status, divergence: dv }));
}
{
  const p = await poll("F6delete");
  await resolve(p.id, "YES");
  const w = await terminal("ALL");
  await ms.delete(p.id);
  const a = await terminal("ALL");
  ok("F.6.delete · a deleted row leaves the next read", has(w, p.id) && !has(a, p.id) && !(await row(p.id)), j({ before: has(w, p.id), after: has(a, p.id) }));
}

/* ══ F.7 · the commit ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section(`F.7 · ${onPostgres ? "a write on a lock's transaction is noted when it COMMITS — never before, never on a rollback" : "memory has no transaction: a write is noted the instant it is made"}`);
{
  const p = await poll("F7a");
  const mk = LOG.marketChangeMark();
  let inside: boolean | null = null;
  await LOCKS.withLock(`market:${p.id}`, async (tx: Any) => {
    await ms.stamp(p.id, { status: "VOIDED", resolvedOutcome: "VOID", resolutionStage2At: new Date().toISOString() }, tx);
    inside = LOG.marketsChangedSince(mk, "ALL")?.has(p.id) ?? null;
  });
  const after = LOG.marketsChangedSince(mk, "ALL")?.has(p.id) ?? null;
  ok(onPostgres ? "F.7a · NOT noted while the lock's transaction is open; noted once it commits" : "F.7a · noted at the write (no transaction to wait for), and still noted after",
    onPostgres ? inside === false && after === true : inside === true && after === true, j({ inside, after }));
}
{
  const p = await poll("F7b");
  await terminal("ALL");
  let mid: Any[] = [];
  await LOCKS.withLock(`market:${p.id}`, async (tx: Any) => {
    await ms.stamp(p.id, { status: "RESOLVED", resolvedOutcome: "YES", resolutionStage1By: OFFICER_A, resolutionStage2By: OFFICER_A, resolutionStage2At: new Date().toISOString() }, tx);
    // Another page renders /results while this lock is open — outside the lock, on its own connection.
    mid = await LOCKS.runOutsideLock(() => terminal("ALL"));
  });
  const after = await terminal("ALL");
  ok(onPostgres
    ? "F.7b · a page rendered between the write and the commit cannot see the uncommitted row — and cannot keep that view: the read after the commit has it"
    : "F.7b · a page rendered right after the write sees it, and so does the next",
    (onPostgres ? !has(mid, p.id) : has(mid, p.id)) && has(after, p.id), j({ mid: has(mid, p.id), after: has(after, p.id) }));
}
{
  const p = await poll("F7c");
  await terminal("ALL");
  const mk = LOG.marketChangeMark();
  let threw = "";
  try {
    await LOCKS.withLock(`market:${p.id}`, async (tx: Any) => {
      await ms.stamp(p.id, { status: "VOIDED", resolvedOutcome: "VOID" }, tx);
      throw new Error("R9D planned rollback");
    });
  } catch (e) { threw = String((e as Error)?.message ?? e); }
  const st = await row(p.id);
  const noted = LOG.marketsChangedSince(mk, "ALL")?.has(p.id) ?? null;
  const a = await terminal("ALL");
  ok(onPostgres
    ? "F.7c · a rolled-back write is never noted: the row is still LIVE and the archive does not list it"
    : "F.7c · memory cannot roll back: the write stands, is noted, and the archive lists it — the memo agrees with the store either way",
    threw.includes("planned rollback") && (onPostgres
      ? st?.status === "LIVE" && noted === false && !has(a, p.id)
      : st?.status === "VOIDED" && noted === true && has(a, p.id)),
    j({ threw: !!threw, status: st?.status, noted }));
}

/* ══ C · THE CENSUS (source) ══════════════════════════════════════════════════════════════════════════════════════════ */
section("C · the census — who writes the market table, and how every write reaches the memos");
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}
const sameSet = (a: readonly string[], b: readonly string[]) => {
  const x = [...new Set(a)].sort(), y = [...new Set(b)].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};
const SRC = walk("src").map((f) => ({ f, s: decomment(read(f)) }));
/** The text between a call's parentheses; `at` is the index of its "(". */
function callArgs(s: string, at: number): string {
  let d = 0;
  for (let i = at; i < s.length; i++) {
    if (s[i] === "(") d++;
    else if (s[i] === ")") { d--; if (d === 0) return s.slice(at + 1, i); }
  }
  return "";
}
function topLevel(args: string): string[] {
  const out: string[] = [];
  let d = 0, from = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (c === "(" || c === "{" || c === "[") d++;
    else if (c === ")" || c === "}" || c === "]") d--;
    else if (c === "," && d === 0) { out.push(args.slice(from, i)); from = i + 1; }
  }
  out.push(args.slice(from));
  return out.map((x) => x.trim()).filter((x) => x.length > 0);
}
function braceRegion(s: string, opener: string): string {
  const at = s.indexOf(opener);
  if (at < 0) return "";
  const open = s.indexOf("{", at + opener.length - 1);
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") d++;
    else if (s[i] === "}") { d--; if (d === 0) return s.slice(at, i + 1); }
  }
  return "";
}
function method(obj: string, name: string): string {
  const at = obj.indexOf(`async ${name}(`);
  if (at < 0) return "";
  const next = obj.slice(at + 1).search(/[\r\n] {2}async \w+\(/);
  return next < 0 ? obj.slice(at) : obj.slice(at, at + 1 + next);
}
{
  const direct = SRC.filter(({ s }) => /\.predictionMarket\.(update|updateMany|upsert|create|createMany|delete|deleteMany)\s*\(/.test(s)).map(({ f }) => f);
  ok("C.1 · the market table is written directly in exactly two files: the store (market-dal.ts) and the chain purge's redaction",
    sameSet(direct, ["src/lib/server/market-dal.ts", "src/lib/server/chain-purge.ts"]), direct.join(", "));
  const raw = SRC.filter(({ s }) => /(UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+("public"\.)?"PredictionMarket"/i.test(s)).map(({ f }) => f);
  /* ⭐ ONE RAW WRITER, CLASSIFIED BY WHAT IT WRITES, never admitted by its file name (2026-10-11, merging "Counts as" over
     R9-D). The desk's Counts-as shift (owner ruling 2026-10-11; house-bot-dal.ts `shiftShownExtra`) sets ONLY
     `predictorExtra`, ONLY on rows its predicate holds LIVE or CLOSED — re-checked on each row it locks — and every memo
     this rule serves holds finished rows alone: exempt for `addToPool`'s reason (C.3). A second raw writer, a second
     column in its SET, or a predicate that admits a finished row is red here. */
  const hb = decomment(read("src/lib/server/house-bot-dal.ts"));
  const rawWrites = [...hb.matchAll(/(UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+("public"\.)?"PredictionMarket"[^`]*/gi)].map((m) => m[0]);
  const setCols = rawWrites.length === 1 ? (/\sSET\s([\s\S]*?)\sFROM\s/.exec(rawWrites[0])?.[1] ?? "").match(/"\w+"\s*=/g) ?? [] : [];
  const whereAt = hb.indexOf("function shownMarketsWhere(");
  const where = whereAt < 0 ? "" : hb.slice(whereAt, hb.indexOf("}", whereAt));
  const shiftAt = hb.indexOf("async shiftShownExtra(input, tx) {");
  const shift = shiftAt < 0 ? "" : hb.slice(shiftAt, hb.indexOf("async countShownMarkets(", shiftAt));
  const exempt = rawWrites.length === 1 && /^UPDATE\s/i.test(rawWrites[0]) && setCols.length === 1 && setCols[0].startsWith('"predictorExtra"')
    && /m\."status" IN \('LIVE', 'CLOSED'\)/.test(where) && !/RESOLVED|VOIDED/.test(where)
    && shift.includes("WHERE ${shownMarketsWhere(account)}") && shift.includes('FROM target WHERE m."id" = target."id"');
  ok("C.1b · and no raw SQL writes it — but the desk's Counts-as shift, which sets only the shown extra and only on open rows (exempt for addToPool's reason)",
    sameSet(raw, ["src/lib/server/house-bot-dal.ts"]) && exempt, `${raw.join(", ")} · ${j({ writes: rawWrites.length, setCols, exempt })}`);
}
{
  const purge = decomment(read("src/lib/server/chain-purge.ts"));
  const batch = purge.indexOf("db.$transaction([");
  const note = purge.indexOf('noteMarketsChanged(marketIds, "UPDOWN")', batch);
  const moveOn = purge.indexOf("const done = Math.min(job.total", batch);
  ok("C.2 · the purge's redaction notes its rounds AFTER its batch commits, before the job moves on (F.6's purge path)",
    batch > 0 && note > batch && moveOn > note, j({ batch, note, moveOn }));
  const data = purge.slice(purge.indexOf("db.predictionMarket.updateMany({"), note);
  ok("C.2b · …and it writes no status: a redaction never moves a row into or out of the archive", data.length > 100 && !/[^A-Za-z]status\s*:/.test(data), `${data.length} chars`);
}
{
  const dal = decomment(read("src/lib/server/market-dal.ts"));
  const twins: Array<[string, string]> = [["memory", braceRegion(dal, "const memoryMarkets: MarketStore = {")], ["prisma", braceRegion(dal, "const prismaMarkets: MarketStore = {")]];
  for (const [twin, obj] of twins) {
    for (const name of ["set", "stamp", "setShortTitles", "delete"]) {
      const body = method(obj, name);
      const deferred = twin === "prisma" && name !== "delete";
      const notes = deferred ? /afterCommit\(tx,\s*\(\)\s*=>\s*noteMarketsChanged\(/.test(body) : /noteMarketsChanged\(/.test(body);
      ok(`C.3 · ${twin}.${name} notes the row it wrote${deferred ? " — once its transaction commits (afterCommit)" : ""}`, body.length > 20 && notes, `${body.length} chars`);
    }
    const pool = method(obj, "addToPool");
    ok(`C.3 · ${twin}.addToPool is the one exempt write (a LIVE market's pools; the archive holds no LIVE market)`, pool.length > 20 && !/noteMarketsChanged/.test(pool));
  }
}
{
  const foreign: string[] = [];
  let txCalls = 0;
  for (const { f, s } of SRC) {
    for (const m of s.matchAll(/marketStore\.(set|stamp|setShortTitles)\(/g)) {
      const open = (m.index ?? 0) + m[0].length - 1;
      const parts = topLevel(callArgs(s, open));
      const at = m[1] === "set" ? 1 : 2;
      if (parts.length <= at) continue;
      txCalls++;
      const ident = parts[at].replace(/\s*\?\?\s*undefined$/, "").trim();
      const before = s.slice(0, m.index);
      let fromLock = false;
      for (let k = before.lastIndexOf("withLock("); k >= 0; k = before.lastIndexOf("withLock(", k - 1)) {
        if (before.slice(k, k + 240).includes(`async (${ident})`)) { fromLock = true; break; }
        if (k === 0) break;
      }
      if (!fromLock || s.includes(`$transaction(async (${ident})`)) foreign.push(`${f}: marketStore.${m[1]}(…, ${parts[at]})`);
    }
  }
  ok("C.4 · every transaction handed to a market write is a withLock's own — the only kind afterCommit can wait for",
    txCalls >= 4 && foreign.length === 0, `${txCalls} call(s) with a transaction${foreign.length ? ` · foreign: ${foreign.join(" | ")}` : ""}`);
}
{
  const files = SRC.filter(({ s }) => /db\.objection\.(create|update)\(/.test(s)).map(({ f }) => f);
  ok("C.5 · objection rows are written in exactly one file, objections-service.ts", sameSet(files, ["src/lib/server/objections-service.ts"]), files.join(", "));
  const objectionNotes = (source: string) => {
    const os = decomment(source);
    const names = ["fileObjection", "closeObjectionsForVoidedMarket", "holdSettlementAsOfficer", "rejectObjection", "upholdObjection"];
    const expected = [1, 2, 1, 1, 2];
    const parts = names.map((name, index) => {
      const start = os.indexOf(`export async function ${name}(`);
      const end = index + 1 < names.length ? os.indexOf(`export async function ${names[index + 1]}(`, start + 1) : os.length;
      return start >= 0 && end > start ? os.slice(start, end) : "";
    });
    const writes = parts.map((part) => [...part.matchAll(/db\.objection\.(create|update)\(/g)].length);
    const notes = parts.map((part) => [...part.matchAll(/\bnoteObjectionWrite\(\)/g)].length);
    const ordered = parts.every((part) => part.lastIndexOf("noteObjectionWrite()") > part.lastIndexOf("db.objection."));
    const close = parts[1], uphold = parts[4];
    const rollbackNotes = close.indexOf("noteObjectionWrite();", close.indexOf("for (const prior of changedMemory.reverse())"))
        > close.indexOf("for (const prior of changedMemory.reverse())")
      && close.indexOf("noteObjectionWrite();", close.indexOf("for (const prior of changedMemory.reverse())"))
        < close.indexOf("if (rollbackErrors.length)")
      && uphold.indexOf("noteObjectionWrite();", uphold.indexOf("const after = await db.objection.findById(objectionId)"))
        > uphold.indexOf("const after = await db.objection.findById(objectionId)")
      && uphold.indexOf("noteObjectionWrite();", uphold.indexOf("const after = await db.objection.findById(objectionId)"))
        < uphold.indexOf("if (rollbackErrors.length)");
    const afterCommitNotes = close.includes("afterCommit(tx, () => noteObjectionWrite());")
      && /afterCommit\(tx, \(\) => \{\s*noteObjectionWrite\(\);/.test(uphold);
    const count = [...os.matchAll(/db\.objection\.(create|update)\(/g)].length;
    return { pass: count === 7 && writes.every((n, i) => n === expected[i])
        && notes.every((n, i) => n === expected[i]) && ordered && rollbackNotes && afterCommitNotes,
      count, noted: notes.reduce((sum, n) => sum + n, 0) };
  };
  const original = decomment(read("src/lib/server/objections-service.ts"));
  const census = objectionNotes(original);
  ok("C.5b · every objection write invalidates rulings, including both memory rollbacks", census.pass,
    `${census.noted}/${census.count}`);
  const noteSites = [...original.matchAll(/\bnoteObjectionWrite\(\)/g)];
  ok("C.5b′ PLANT · every one of seven note sites is load-bearing", noteSites.length === 7
    && noteSites.every((site) => !objectionNotes(original.slice(0, site.index) + "void 0" + original.slice((site.index ?? 0) + site[0].length)).pass),
    `${noteSites.length} site(s)`);
}
{
  const svc = decomment(read("src/lib/server/market-service.ts"));
  const ltm = svc.slice(svc.indexOf("export async function listTerminalMarkets("), svc.indexOf("export async function getMarket("));
  const firstMark = ltm.indexOf("const mark = marketChangeMark();"), lastMark = ltm.lastIndexOf("const mark = marketChangeMark();");
  ok("C.6a · the archive asks the change log on every hit, and takes its mark BEFORE each of its two reads",
    ltm.includes("marketsChangedSince(hit.mark, productLine)") && firstMark > 0 && firstMark < ltm.indexOf('listMarkets({ status: "RESOLVED"')
      && lastMark > firstMark && lastMark < ltm.indexOf("marketStore.marketsByIds("), `${ltm.length} chars`);
  const ps = decomment(read("src/lib/server/platform-stats.ts"));
  ok("C.6b · the strip's memo asks the log for POLL changes, and takes its mark before its read",
    ps.includes('marketsChangedSince(cached.mark, "MARKET")') && ps.indexOf("const mark = marketChangeMark();") > 0
      && ps.indexOf("const mark = marketChangeMark();") < ps.indexOf('listMarkets({ status: "RESOLVED"') && ps.includes("{ at: now, value, mark }"));
  const rv = decomment(read("src/lib/server/reversals.ts"));
  ok("C.6c · the rulings memo is served only at the generation it read, taken before its read",
    rv.includes("cached.gen === gen") && rv.indexOf("const gen = globalThis.__50PICK_RULINGS_GEN") > 0
      && rv.indexOf("const gen = globalThis.__50PICK_RULINGS_GEN") < rv.indexOf("db.objection.listUpheldRulings()"));
}
{
  const lk = decomment(read("src/lib/server/locks.ts"));
  const adv = lk.slice(lk.indexOf("async function withAdvisoryLock"), lk.indexOf("async function drainLock"));
  const tx = adv.indexOf("const out = await db.$transaction("), run = adv.indexOf("runCommitted(committed);");
  const ac = lk.slice(lk.indexOf("export function afterCommit("), lk.indexOf("function runCommitted("));
  ok("C.7 · the outermost Postgres lock runs what afterCommit queued only AFTER its $transaction resolves, and afterCommit queues only on that lock's own transaction",
    tx > 0 && run > tx && ac.includes("ctx.tx === tx") && ac.includes("ctx.committed.push(fn)"), j({ tx, run }));
}
{
  const memos = walk("src/lib/server").filter((f) => {
    const s = decomment(read(f));
    return s.includes("globalThis.__50PICK_") && /-\s*[A-Za-z_.]*\.at\s*</.test(s) && /listMarkets\(|listTerminalMarkets\(|marketStore\.|db\.objection\./.test(s);
  });
  ok("C.8 · the TTL memos over market or objection rows are exactly four, each classified: the archive, the strip and the rulings (all follow this rule) and /admin/insights",
    sameSet(memos, ["src/lib/server/market-service.ts", "src/lib/server/platform-stats.ts", "src/lib/server/reversals.ts", "src/lib/server/insights.ts"]), memos.join(", "));
  const callers = SRC.filter(({ f, s }) => f !== "src/lib/server/insights.ts" && /getInsights\(/.test(s)).map(({ f }) => f);
  ok("C.8b · …and /admin/insights' memo reaches staff only — no player-facing caller", callers.length > 0 && callers.every((f) => f.startsWith("src/app/admin/")), callers.join(", "));
}
{
  const bulk = decomment(read("src/app/admin/resolver-queue/bulk-resolve-action.ts"));
  ok("C.9 · the bulk resolver seals through resolveMarket — the officer's path (F.1) — and writes no market row itself",
    /resolveMarket\(\{/.test(bulk) && !/marketStore\.(set|stamp)\(/.test(bulk));
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
