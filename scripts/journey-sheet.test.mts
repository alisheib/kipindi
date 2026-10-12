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
 *   2. NOT A SHEET — a missing market, a malformed id, an Up & Down round, a RESOLVED and a DRAFT market are null (404);
 *      a LIVE market whose selection has closed is a sheet that is not bettable, with no figure.
 *   3. THE VIEWER'S HALF — spendable = balance + bonus, the sides they hold OPEN (a cashed-out side is not held), the
 *      bonus warning; an unread wallet is null spendable, never zero.
 * And it reads the route as text — the contract a cache and an attacker meet:
 *   4. GET only; force-dynamic on the nodejs runtime; rate-limited per IP on `sheet.ip` (a real rule); the public half
 *      `s-maxage` ≤ 5; the viewer's half `private, no-store` and 401 without a session; 404 and 503 are `no-store`.
 *   5. THE CARD'S FIGURES (the Vodacom plan S7, S7-PLAN WP3 step 5) — `cardFigures`, the one source a journey card and
 *      this public half share: it gives exactly the sheet's bettable, rates and figures; on the markets only a card meets,
 *      an Up & Down round has no figure and a RESOLVED or DRAFT market takes no bet (`bettableAt`'s LIVE test); and, read
 *      as text, `sheetPublic` takes all three from one `cardFigures` call after the stake bounds' await, as before the
 *      extraction, and computes none of them itself.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written (the store is in memory).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import { DEFAULT_GLOBAL_CONFIG, snapshotFromConfig } from "../src/lib/server/market-config.ts";
import { RATE_RULES } from "../src/lib/server/rate-limit.ts";
import * as SHEET from "../src/lib/server/journey-sheet.ts";
import { isSelectionClosed } from "../src/lib/server/market-service.ts";
import { cardEstimate, pickEstimateRates } from "../src/lib/markets/estimate.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTE = readFileSync(join(ROOT, "src/app/api/markets/[id]/sheet/route.ts"), "utf8").replace(/\r\n/g, "\n");
const PROVE_RED = process.argv.includes("--prove-red");

const LF = String.fromCharCode(10);
/** `src/lib/server/journey-sheet.ts` as text, CRLF read as LF: §5 reads `sheetPublic`'s body. */
const SHEET_SRC = readFileSync(join(ROOT, "src/lib/server/journey-sheet.ts"), "utf8").split(String.fromCharCode(13) + LF).join(LF);

type Impl = {
  pub: typeof SHEET.sheetPublic; forUser: typeof SHEET.sheetForUser; route: string; rules: Record<string, unknown>;
  /** §5: the card's figures, and the module's text. */
  figures: typeof SHEET.cardFigures; sheetSrc: string;
};
const REAL: Impl = {
  pub: SHEET.sheetPublic, forUser: SHEET.sheetForUser, route: ROUTE, rules: RATE_RULES, figures: SHEET.cardFigures, sheetSrc: SHEET_SRC,
};

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
  await market("mkt_sheet0draft", { status: "DRAFT" });
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
  const nulls = await Promise.all(["mkt_sheet0updown", "mkt_sheet0resolved", "mkt_sheet0draft", "mkt_nothere", "not an id", "mkt_a/../b"].map((id) => impl.pub(id, NOW)));
  ok("2.not-a-sheet · an Up & Down round, a RESOLVED market, a DRAFT market, a missing one and a malformed id are all null (404)", nulls.every((n) => n === null), j(nulls.map((n) => n?.id ?? null)));
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

  /* 5 · the card's figures (S7 WP3 step 5): the one source a journey card and the public half share */
  const figuresOf = async (id: string) => { const m = await marketStore.get(id); return m ? impl.figures(m, NOW) : null; };
  const differ: string[] = [];
  for (const id of ["mkt_sheet0live", "mkt_sheet0closed", "mkt_sheet0legacy"]) {
    const f = await figuresOf(id), s = await impl.pub(id, NOW);
    const same = !!f && !!s && j({ bettable: f.bettable, rates: f.rates, estimates: f.estimates }) === j({ bettable: s.bettable, rates: s.rates, estimates: s.estimates });
    if (!same) differ.push(id);
  }
  ok("5.figures · the card's figures are the sheet's: for a LIVE market, one whose selection has closed and one with no selection close, cardFigures gives exactly sheetPublic's bettable, rates and estimates",
    differ.length === 0, j({ differ }));
  const ud = await figuresOf("mkt_sheet0updown"), rs = await figuresOf("mkt_sheet0resolved"), dr = await figuresOf("mkt_sheet0draft");
  const closedBoth = (f: Awaited<ReturnType<typeof figuresOf>>) => !!f && f.bettable === false && f.estimates.YES?.state === "closed" && f.estimates.NO?.state === "closed";
  ok("5.card-only · the markets only a card meets: an Up & Down round has no figure on either side; a RESOLVED and a DRAFT market take no bet (the LIVE test) and their figures are the closed state",
    !!ud && ud.estimates.YES === null && ud.estimates.NO === null && closedBoth(rs) && closedBoth(dr),
    j({ updown: ud?.estimates ?? null, resolved: rs && [rs.bettable, rs.estimates.YES?.state], draft: dr && [dr.bettable, dr.estimates.YES?.state] }));
  const src = decomment(impl.sheetSrc);
  const fnAt = src.indexOf("export async function sheetPublic(");
  const body = fnAt < 0 ? "" : src.slice(fnAt, src.indexOf(LF + "}" + LF, fnAt) + 2);
  const awaitAt = body.indexOf("await stakeBoundsForMarket(m)"), figuresAt = body.indexOf("cardFigures(m, nowMs)");
  const ownCopy = ["isSelectionClosed(", "pickEstimateRates(", "cardEstimate(", "bettableAt("].filter((name) => body.includes(name));
  ok("5.one-source · sheetPublic takes its bettable, rates and figures from ONE cardFigures call, read after the stake bounds' await (the pools it returns and the figures priced from them come from one moment), and computes none of them itself",
    body.length > 0 && body.split("cardFigures(").length - 1 === 1 && awaitAt >= 0 && figuresAt > awaitAt && ownCopy.length === 0,
    j({ calls: body.split("cardFigures(").length - 1, awaitAt, figuresAt, ownCopy }));
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
    // §5 · the card's figures (S7 WP3 step 5)
    { name: "the card's figures drop the selection close (a closed market still prices its card)", expect: /^5[.]figures /,
      impl: { ...REAL, figures: (m, now) => REAL.figures({ ...m, selectionClosedAt: null }, now) } },
    { name: "an Up & Down round priced on its card as if it were a market", expect: /^5[.]card-only /,
      impl: { ...REAL, figures: (m, now) => REAL.figures({ ...m, productLine: "MARKET" }, now) } },
    { name: "the card's bettable test drops its LIVE conjunct (a DRAFT market takes bets on its card; a RESOLVED one is still shut by isSelectionClosed)", expect: /^5[.]card-only /,
      impl: { ...REAL, figures: (m, now) => {
        const f = REAL.figures(m, now);
        const open = !isSelectionClosed(m) && Date.parse(m.resolutionAt) > now;
        return { ...f, bettable: open, estimates: { YES: cardEstimate(m, f.rates, "YES", open), NO: cardEstimate(m, f.rates, "NO", open) } };
      } } },
    { name: "sheetPublic re-inlined: its own copy of the figures beside cardFigures, free to drift from the card's", expect: /^5[.]one-source /,
      impl: { ...REAL, sheetSrc: REAL.sheetSrc.replace("  const { bettable, rates, estimates } = cardFigures(m, nowMs);", [
        "  const bettable = !isSelectionClosed(m) && Date.parse(m.resolutionAt) > nowMs;",
        "  const rates = pickEstimateRates(ratesFor(m));",
        '  const estimates = { YES: cardEstimate(m, rates, "YES", bettable), NO: cardEstimate(m, rates, "NO", bettable) };',
      ].join(LF)) } },
    { name: "the figures read before the stake bounds' await again (the returned pools and the figures from two moments)", expect: /^5[.]one-source /,
      impl: { ...REAL, sheetSrc: REAL.sheetSrc.replace("  const bounds = await stakeBoundsForMarket(m);" + LF, "").replace(
        "  const { bettable, rates, estimates } = cardFigures(m, nowMs);" + LF,
        "  const { bettable, rates, estimates } = cardFigures(m, nowMs);" + LF + "  const bounds = await stakeBoundsForMarket(m);" + LF) } },
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
