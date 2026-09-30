/**
 * test:journey-sheet — `GET /api/markets/[id]/sheet` (the Vodacom plan S3, §3.1).
 *
 *   npm run test:journey-sheet     (in predeploy)
 *   npm run red:journey-sheet      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * On the in-memory store it drives `lib/server/journey-sheet.ts` (the reads the route serves):
 *   1. THE PUBLIC HALF — a LIVE market's pools, its FROZEN rates (not the live config), {pct} 13, the stake bounds the
 *      bet path enforces, when betting closes (selection, not resolution), the server clock, and the card figure per
 *      side (Dodoma: ≈2.8× / ≈1.4×).
 *   2. NOT A SHEET — a missing market, a malformed id, an Up & Down round and a RESOLVED market are null (404); a LIVE
 *      market whose selection has closed is a sheet that is not bettable, with no figure.
 *   3. THE VIEWER'S HALF — spendable = balance + bonus, the sides they hold OPEN (a cashed-out side is not held), the
 *      bonus warning; an unread wallet is null spendable, never zero.
 * And it reads the route as text — the contract a cache and an attacker meet:
 *   4. GET only; force-dynamic on the nodejs runtime; rate-limited per IP on `sheet.ip` (a real rule); the public half
 *      `s-maxage` ≤ 5; the viewer's half `private, no-store` and 401 without a session; 404 and 503 are `no-store`.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written (the store is in memory).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../src/lib/server/store.ts";
import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import { DEFAULT_GLOBAL_CONFIG, snapshotFromConfig } from "../src/lib/server/market-config.ts";
import { RATE_RULES } from "../src/lib/server/rate-limit.ts";
import * as SHEET from "../src/lib/server/journey-sheet.ts";
import { pickEstimateRates } from "../src/lib/markets/estimate.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTE = readFileSync(join(ROOT, "src/app/api/markets/[id]/sheet/route.ts"), "utf8").replace(/\r\n/g, "\n");
const PROVE_RED = process.argv.includes("--prove-red");

type Impl = { pub: typeof SHEET.sheetPublic; forUser: typeof SHEET.sheetForUser; route: string; rules: Record<string, unknown> };
const REAL: Impl = { pub: SHEET.sheetPublic, forUser: SHEET.sheetForUser, route: ROUTE, rules: RATE_RULES };

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const iso = (t: number) => new Date(t).toISOString();
const SNAP = snapshotFromConfig({ ...DEFAULT_GLOBAL_CONFIG, feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10 });

async function market(id: string, o: { status?: string; productLine?: string; selectionClosedAt?: number | null } = {}) {
  await marketStore.set({
    id, titleEn: "Will Dodoma see rain on Saturday?", titleSw: "Je, Dodoma itanyesha Jumamosi?", titleZh: null, category: "weather",
    sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if TMA records rain at Dodoma on Saturday.",
    resolutionCriterionSw: null, resolutionCriterionZh: null, shortTitleEn: null, shortTitleSw: null, shortTitleZh: null, competition: null,
    status: o.status ?? "LIVE", yesPool: 24_825, noPool: 50_462, predictorCount: 12, feeSnapshot: SNAP, resolvedOutcome: null,
    productLine: o.productLine ?? "MARKET", proposedBy: "usr_author",
    resolutionAt: iso(NOW + 48 * HOUR), selectionClosedAt: o.selectionClosedAt === null ? null : iso(o.selectionClosedAt ?? NOW + 24 * HOUR),
    createdAt: iso(NOW - HOUR), updatedAt: iso(NOW - HOUR),
  } as never);
}
async function player(id: string, balance: number, bonus: number) {
  const now = iso(NOW);
  await db.user.create({
    id, phoneE164: `+2557111${id.slice(-5).padStart(5, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "Sheet Player", dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
    acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`, emailVerifiedAt: now,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, bonusBalance: bonus, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
}
async function position(id: string, userId: string, marketId: string, side: "YES" | "NO", status: string) {
  await positionStore.set({ id, userId, marketId, side, stake: 2_000, potentialPayout: 5_000, status, finalPayout: null, placedAt: iso(NOW - HOUR), settledAt: null } as never);
}

async function fixtures() {
  await market("mkt_sheet0live");
  await market("mkt_sheet0closed", { selectionClosedAt: NOW - HOUR });
  await market("mkt_sheet0updown", { productLine: "UPDOWN" });
  await market("mkt_sheet0resolved", { status: "RESOLVED" });
  await market("mkt_sheet0legacy", { selectionClosedAt: null });
  await player("usr_sheet_1", 3_000, 500);
  await position("pos_sheet_1", "usr_sheet_1", "mkt_sheet0live", "YES", "OPEN");
  await position("pos_sheet_2", "usr_sheet_1", "mkt_sheet0live", "NO", "CASHED_OUT");
  await position("pos_sheet_3", "usr_sheet_1", "mkt_sheet0closed", "NO", "OPEN");
}

async function run(impl: Impl, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);

  /* 1 · the public half */
  const p = await impl.pub("mkt_sheet0live", NOW);
  ok("1.public · a LIVE market: bettable, its pools, its FROZEN rates, {pct} 13, when betting closes (the selection), the server clock",
    !!p && p.bettable && p.yesPool === 24_825 && p.noPool === 50_462 && j(p.rates) === j(pickEstimateRates(SNAP)) && p.feePct === 13
      && p.closesAt === iso(NOW + 24 * HOUR) && p.serverNow === NOW, j(p));
  ok("1.figures · the card figure per side is the engine's: Dodoma ≈2.8× / ≈1.4×",
    p?.estimates.YES?.multText === "2.8" && p?.estimates.NO?.multText === "1.4", j(p?.estimates));
  ok("1.bounds · the stake bounds are the bet path's (the platform's default window: 1,000 – 1,000,000)",
    p?.min === DEFAULT_GLOBAL_CONFIG.minStake && p?.max === DEFAULT_GLOBAL_CONFIG.maxStake, j({ min: p?.min, max: p?.max }));
  const legacy = await impl.pub("mkt_sheet0legacy", NOW);
  ok("1.legacy · no selection close: betting closes at resolution", legacy?.closesAt === iso(NOW + 48 * HOUR), j(legacy?.closesAt));

  /* 2 · not a sheet */
  const nulls = await Promise.all(["mkt_sheet0updown", "mkt_sheet0resolved", "mkt_nothere", "not an id", "mkt_a/../b"].map((id) => impl.pub(id, NOW)));
  ok("2.not-a-sheet · an Up & Down round, a RESOLVED market, a missing one and a malformed id are all null (404)", nulls.every((n) => n === null), j(nulls.map((n) => n?.id ?? null)));
  const closed = await impl.pub("mkt_sheet0closed", NOW);
  ok("2.closed · a LIVE market whose selection has closed is a sheet that is NOT bettable, with no figure",
    !!closed && closed.bettable === false && closed.estimates.YES?.state === "closed" && closed.estimates.YES?.multText === null, j(closed));

  /* 3 · the viewer's half */
  const me = await impl.forUser("mkt_sheet0live", "usr_sheet_1");
  ok("3.me · spendable = 3,000 + 500 bonus; held = YES only (the cashed-out NO is not held; another market's NO is not this one's); the bonus warning is on",
    me.spendable === 3_500 && me.balance === 3_000 && me.bonusBalance === 500 && j(me.heldSides) === j(["YES"]) && me.bonusWarning === true, j(me));
  const nobody = await impl.forUser("mkt_sheet0live", "usr_sheet_nobody");
  ok("3.unread · no wallet: spendable is null (\"Salio lako —\"), never zero; nothing held", nobody.spendable === null && nobody.heldSides.length === 0, j(nobody));

  /* 4 · the route's contract */
  const r = impl.route;
  const code = r.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const sMax = /"Cache-Control": "public, s-maxage=(\d+)/.exec(code);
  ok("4.verbs · GET only — no POST, PUT, PATCH or DELETE handler", /export async function GET\(/.test(code) && !/export (?:async )?function (?:POST|PUT|PATCH|DELETE)\b/.test(code));
  ok("4.runtime · force-dynamic on the nodejs runtime", /export const dynamic = "force-dynamic";/.test(code) && /export const runtime = "nodejs";/.test(code));
  ok("4.rate · rate-limited per IP on `sheet.ip`, a rule that exists", /rateCheckAsync\(ip, "sheet\.ip"\)/.test(code) && Object.prototype.hasOwnProperty.call(impl.rules, "sheet.ip"));
  ok("4.cache · the public half is shared-cacheable for at most 5 seconds; the viewer's half is private, no-store",
    !!sMax && Number(sMax[1]) <= 5 && /const PRIVATE = \{ "Cache-Control": "private, no-store" \};/.test(code)
      && /\{ \.\.\.pub, me: await sheetForUser\(pub\.id, session\.userId\) \}, \{ headers: PRIVATE \}/.test(code)
      && /NextResponse\.json\(pub, \{ headers: PUBLIC \}\)/.test(code), sMax?.[0] ?? "no public cache header");
  ok("4.errors · ?me=1 without a session is 401; a non-sheet is 404; a store failure is 503 — each no-store",
    /status: 401, headers: NO_STORE/.test(code) && /status: 404, headers: NO_STORE/.test(code) && /status: 503, headers: NO_STORE/.test(code)
      && /const NO_STORE = \{ "Cache-Control": "no-store" \};/.test(code));
  return failed;
}

await fixtures();
if (!PROVE_RED) {
  console.log("journey-sheet — the Vodacom plan S3 sheet API (in-memory store + the route's contract)");
  const failed = await run(REAL, (l) => console.log(l));
  console.log(`\nJOURNEY SHEET — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const swap = (from: string, to: string): Impl => ({ ...REAL, route: REAL.route.replace(from, to) });
  const plants: Plant[] = [
    { name: "the public half priced at the LIVE config, not the frozen snapshot", expect: /^1\.public /,
      impl: { ...REAL, pub: async (id, now) => { const p = await REAL.pub(id, now); return p && { ...p, rates: pickEstimateRates({ ...SNAP, operatorFeeRate: 0.2 }) }; } } },
    { name: "betting closes at resolution even when the selection closes first", expect: /^1\.public /,
      impl: { ...REAL, pub: async (id, now) => { const p = await REAL.pub(id, now); return p && { ...p, closesAt: iso(NOW + 48 * HOUR) }; } } },
    { name: "an Up & Down round served as a sheet", expect: /^2\.not-a-sheet /,
      impl: { ...REAL, pub: async (id, now) => (await REAL.pub(id, now)) ?? (id === "mkt_sheet0updown" ? ((await REAL.pub("mkt_sheet0live", now)) as never) : null) } },
    { name: "a closed selection still bettable", expect: /^2\.closed /,
      impl: { ...REAL, pub: async (id, now) => { const p = await REAL.pub(id, now); return p && { ...p, bettable: true }; } } },
    { name: "spendable leaves the bonus out", expect: /^3\.me /,
      impl: { ...REAL, forUser: async (m, u) => { const r = await REAL.forUser(m, u); return { ...r, spendable: r.balance }; } } },
    { name: "a cashed-out side counted as held", expect: /^3\.me /,
      impl: { ...REAL, forUser: async (m, u) => { const r = await REAL.forUser(m, u); return { ...r, heldSides: ["YES", "NO"] }; } } },
    { name: "an unread wallet read as zero", expect: /^3\.unread /,
      impl: { ...REAL, forUser: async (m, u) => { const r = await REAL.forUser(m, u); return { ...r, spendable: r.spendable ?? 0 }; } } },
    { name: "a POST handler added", expect: /^4\.verbs /, impl: swap("export async function GET(", "export async function POST() { return null; }\nexport async function GET(") },
    { name: "the rate limit removed", expect: /^4\.rate /, impl: swap('rateCheckAsync(ip, "sheet.ip")', "({ allowed: true })") },
    { name: "the public half cached for a minute", expect: /^4\.cache /, impl: swap("s-maxage=5,", "s-maxage=60,") },
    { name: "the viewer's half served with the public cache header", expect: /^4\.cache /, impl: swap("{ headers: PRIVATE }", "{ headers: PUBLIC }") },
    { name: "a 503 that a cache may keep", expect: /^4\.errors /, impl: swap("status: 503, headers: NO_STORE", "status: 503, headers: PUBLIC") },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL, quiet);
  ok("the REAL sheet passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = await run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
