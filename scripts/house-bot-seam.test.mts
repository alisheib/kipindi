/**
 * HOUSE-BOT SEAM — the money seam's player-path promises, proven on the in-memory store and by source.
 *
 *   npm run test:house-bot-seam
 *
 * ⛔ WHAT THIS GUARDS (PLAN §3, 04 A7/A14/A18, F3, N1 §3, N2 §3). House bots bet through the SAME
 * function players do. Every change the seam makes to the player path is a sanctioned change with a
 * letter, and each one is proven here to give unchanged output for a player (a null marker). The
 * house-only gates are proven to exist, in their declared order, and never to be skipped by a
 * `ctx.kind` branch at an unanchored site.
 *
 * ⛔ EVERY SECTION HAS A PLANTED CONTROL THAT MUST FAIL. A check that can only pass is decoration.
 * Exit 1 on any failure; exit 3 when no assertion ran at all.
 *
 * The Postgres half (markers on every money path, trial balance, concurrency and caps) is
 * `test:house-bot-money` and `test:house-bot-caps`; this file never pretends to cover it.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT_WINDOW_GRID, exitGridCase } from "./lib/house-bot-exit-grid.mts";

process.env.DATABASE_URL = "";
process.env.USE_PRISMA_DAL = "false";
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/* ═══ Harness ═══════════════════════════════════════════════════════════════════════════════ */

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const section = (title: string) => console.log(`\n${title}`);

/** Canonical JSON (sorted keys, `undefined` dropped the way JSON drops it). */
function canon(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, (val as Record<string, unknown>)[k]]))
      : val,
  );
}

const { cashOutValue, exitWindowClosesAt } = await import("../src/lib/server/market-service.ts");
const { exitWindowFacts } = await import("../src/lib/exit-window.ts");

/* ═══ §1 · (k) A14 — the exit window, byte-identical to the pre-extraction golden grid ════════ */
section("§1 · (k) A14 exit window");
{
  const golden = JSON.parse(readFileSync(join(here, "fixtures", "house-bot-exit-window-golden.json"), "utf8")) as {
    count: number; rows: Array<{ id: string; out: Record<string, unknown> }>;
  };
  const byId = new Map(golden.rows.map((r) => [r.id, r.out]));
  ok("1.0 · the golden file covers exactly the grid", golden.count === EXIT_WINDOW_GRID.length && EXIT_WINDOW_GRID.every((c) => byId.has(c.id)),
    `golden ${golden.count} · grid ${EXIT_WINDOW_GRID.length}`);

  const realNow = Date.now;
  const diffs: string[] = [];
  const relationDiffs: string[] = [];
  const mutantDiffs: string[] = [];
  try {
    for (const c of EXIT_WINDOW_GRID) {
      const { position, market, nowMs } = exitGridCase(c);
      Date.now = () => nowMs;
      const live = await cashOutValue(position, market);
      const want = byId.get(c.id);
      if (canon(JSON.parse(JSON.stringify(live))) !== canon(want)) diffs.push(`${c.id}: ${canon(live)} ≠ ${canon(want)}`);

      if (!c.emptyPlacedAt) {
        // Independent relation: with no bonus, sellable ⇔ the window has a runway AND now is before its close.
        const closeMs = Date.parse(exitWindowClosesAt(position, market));
        const placedMs = Date.parse(position.placedAt);
        const expectSellable = c.bonus === 0 ? closeMs > placedMs && nowMs < closeMs : false;
        if ((want as { sellable: boolean }).sellable !== expectSellable) relationDiffs.push(c.id);

        // ⛔ CONTROL — the mutant A14 forbids (no `graceMs > 0`) must disagree with the golden grid somewhere.
        const graceMs = c.graceMin * 60_000, windowMs = graceMs + c.paidMin * 60_000;
        const mutantRunway = c.runwayMs >= graceMs;
        const mutantSellable = mutantRunway && nowMs - placedMs < windowMs && c.bonus === 0;
        if (mutantSellable !== (want as { sellable: boolean }).sellable) mutantDiffs.push(c.id);
      }
    }
  } finally {
    Date.now = realNow;
  }
  ok(`1.1 · cashOutValue deep-equals the golden grid on all ${EXIT_WINDOW_GRID.length} rows`, diffs.length === 0, diffs.slice(0, 3).join(" | "));
  ok("1.2 · exitWindowClosesAt agrees with the golden `sellable` on every row", relationDiffs.length === 0, relationDiffs.slice(0, 5).join(", "));
  ok("1.c1 · CONTROL · the formula without `graceMs > 0` disagrees with the golden grid", mutantDiffs.length > 0, `${mutantDiffs.length} rows differ`);

  // 1.3 · the pure facts, against hand-worked rows.
  const t0 = Date.UTC(2026, 8, 14, 9, 0, 0);
  const f1 = exitWindowFacts({ placedAtMs: t0, closesAtMs: t0 + 3_600_000, freeExitGraceMinutes: 5, paidExitWindowMinutes: 2 });
  ok("1.3 · grace 5, paid 2, an hour of runway → closes at +7:00", f1.hadRunway && f1.exitCloseAtMs === t0 + 420_000, canon(f1));
  const f2 = exitWindowFacts({ placedAtMs: t0, closesAtMs: t0 + 3_600_000, freeExitGraceMinutes: 0, paidExitWindowMinutes: 10 });
  ok("1.4 · grace 0 with a paid window → no runway, closes at placement", !f2.hadRunway && f2.exitCloseAtMs === t0, canon(f2));
  const f3 = exitWindowFacts({ placedAtMs: t0, closesAtMs: t0 + 299_999, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 });
  ok("1.5 · runway 1 ms short of grace → no runway", !f3.hadRunway && f3.exitCloseAtMs === t0, canon(f3));
  const f4 = exitWindowFacts({ placedAtMs: t0, closesAtMs: Number.NaN, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 });
  ok("1.6 · an unparseable close → no runway", !f4.hadRunway && f4.exitCloseAtMs === t0, canon(f4));
}

/* ═══ Shared source readers ═════════════════════════════════════════════════════════════════ */

const { decomment } = await import("./lib/decomment.mts");
const read = (rel: string) => readFileSync(join(root, rel), "utf8").replace(/\r\n/g, "\n");
const SVC_SRC = read("src/lib/server/market-service.ts");
const SEAM_SRC = read("src/lib/server/house-bot/seam.ts");
/** A function's body, from its signature to the next top-level declaration. */
function fnBody(src: string, signature: string): string {
  const at = src.indexOf(signature);
  if (at < 0) return "";
  const next = src.slice(at + signature.length).search(/\n(export )?(async )?function |\nexport (const|type|class) |\n\/\*\*\n/);
  return next < 0 ? src.slice(at) : src.slice(at, at + signature.length + next);
}
/**
 * A `// TAG:<name>` marker FINDER, built from a string. It reads the markers the seam writes; it strips
 * nothing, so it is not a private comment-stripper (every stripping here goes through `decomment`), and
 * a regex literal would only be counted as one by `test:decomment`'s shape scan.
 */
function markerRe(tag: string, name: string, flags = ""): RegExp {
  return new RegExp(`${"/".repeat(2)} ${tag}:(${name})`, flags);
}
const anchors = await import("./anchors/house-bot-seam.anchors.mjs") as {
  SEAM_SITES: string[]; H2_ORDER: string[]; H2_CAP_SEQUENCE: string[]; MUTATIONS: Array<{ expect: string; suite: string }>;
};

/* ═══ §2 · BET_PATH_REASONS — every reason the bet path emits, both directions (04 A10, F3) ═════ */
section("§2 · BET_PATH_REASONS");
{
  const { BET_PATH_REASONS } = await import("../src/lib/house-bot/bet-path.ts");
  const guarded = fnBody(SVC_SRC, "async function buyPositionInner(") + fnBody(SVC_SRC, "export async function placeHouseBet(");
  const source = decomment(guarded) + "\n" + decomment(SEAM_SRC);
  const literals = (s: string) => new Set([...s.matchAll(/reason:\s*(?:\(?[^,;}\n]*?\?\s*)?"([a-z_]+)"(?:\s*:\s*"([a-z_]+)")?/g)]
    .flatMap((m) => [m[1], m[2]]).filter(Boolean) as string[]);
  // Ternaries and `satisfies` chains: every quoted token that is a registered reason and sits on a `reason` line.
  const reasonLines = source.split("\n").filter((l) => /reason\b/.test(l));
  const quoted = new Set(reasonLines.flatMap((l) => [...l.matchAll(/"([a-z]+_[a-z_]+)"/g)].map((m) => m[1])));
  const emitted = new Set([...literals(source), ...quoted]);
  const { REASONS } = await import("../src/lib/failure-reasons.ts");
  const registered = new Set(Object.keys(REASONS));
  const emittedReasons = [...emitted].filter((r) => registered.has(r));
  const missing = emittedReasons.filter((r) => !(BET_PATH_REASONS as readonly string[]).includes(r));
  const dead = (BET_PATH_REASONS as readonly string[]).filter((r) => !emitted.has(r));
  ok("2.0 · the reader sees buyPositionInner, placeHouseBet and the house gates", guarded.length > 20_000 && SEAM_SRC.length > 5_000 && emittedReasons.length >= 25,
    `${guarded.length} + ${SEAM_SRC.length} chars · ${emittedReasons.length} reasons`);
  ok("2.1 · every reason the bet path emits is in BET_PATH_REASONS", missing.length === 0, missing.join(", "));
  ok("2.2 · every BET_PATH_REASONS entry is emitted by the bet path", dead.length === 0, dead.join(", "));
  const planted = [...literals(`return { ok: false, reason: "zz_geo_blocked" }`)];
  ok("2.c1 · CONTROL · a planted reason literal is read", planted.includes("zz_geo_blocked"));
  ok("2.c2 · CONTROL · a reason chosen by ternary is read on both arms", (() => {
    const s = literals(`reason: (wallet ? "wallet_frozen" : "wallet_missing")`);
    return s.has("wallet_frozen") && s.has("wallet_missing");
  })());
  ok("2.3 · every BET_PATH_REASONS entry has a registry row with copy (failure-reasons.ts)", (BET_PATH_REASONS as readonly string[]).every((r) => registered.has(r)));
}

/* ═══ §3 · GATE_PARITY — the same account state gives the same answer on both paths (04 F3, A7) ═══ */
section("§3 · GATE_PARITY");
const { loadWorld, OFFICER } = await import("./lib/house-bot-world.mts");
const w = await loadWorld();
await w.user({ id: OFFICER, role: "ADMIN" });
await w.limits();
await w.switchOn();
{
  const { GATE_PARITY, EXTRA_PARITY_FIXTURES } = await import("./lib/house-bot-gate-parity.ts");
  const { BET_PATH_REASONS } = await import("../src/lib/house-bot/bet-path.ts");
  ok("3.0 · GATE_PARITY has exactly one row per BET_PATH_REASONS entry",
    Object.keys(GATE_PARITY).sort().join() === [...BET_PATH_REASONS].sort().join());
  const rg: Any = await import("../src/lib/server/responsible-gambling.ts");
  const platform: Any = await import("../src/lib/server/platform-config.ts");
  const rate: Any = await import("../src/lib/server/rate-limit.ts");

  /** Put an account into the state a fixture names; returns the stake to try. */
  const apply = async (fixture: string, userId: string, marketId: string): Promise<number> => {
    switch (fixture) {
      case "maintenance": await platform.setPlatformConfig({ maintenanceMode: true }, OFFICER); return 1_000;
      case "self_excluded": await rg.selfExclude(userId, "24h"); return 1_000;
      case "cooling_off": await rg.coolOff(userId, "1h"); return 1_000;
      case "account_suspended": await w.setUserFields(userId, { status: "SUSPENDED" }); return 1_000;
      case "account_closed": await w.setUserFields(userId, { status: "CLOSED" }); return 1_000;
      case "wallet_frozen": { const wal = await w.bal(userId); await w.db.wallet.update(wal.id, { status: "FROZEN" }); return 1_000; }
      case "loss_limit_daily": await rg.setLimits(userId, { dailyLossLimit: 500 }); return 1_000;
      case "stake_below_min": return 1;
      case "stake_above_max": return 900_000_000;
      case "rate_limited": { for (let k = 0; k < 40; k++) rate.rateCheck(userId, "bet.place"); return 1_000; }
      default: throw new Error(`unknown parity fixture ${fixture}`);
    }
  };
  const undo = async (fixture: string) => { if (fixture === "maintenance") await platform.setPlatformConfig({ maintenanceMode: false }, OFFICER); };

  const fixtures = [...new Set([...Object.values(GATE_PARITY).flatMap((r: Any) => (r.fixture ? [r.fixture] : [])), ...EXTRA_PARITY_FIXTURES])];
  for (const fixture of fixtures) {
    const market = await w.poll({ graceMin: 0 });
    const player = await w.user({ balance: 1_000_000 });
    const b = await w.bot({ caps: { stakeMinTzs: 1, stakeMaxTzs: 1_000_000_000 } });
    const stake = await apply(fixture, player, market.id);
    await apply(fixture, b.userId, market.id).catch(() => undefined);
    const i = await w.intent(b, market.id, { kind: "OPENER", side: "YES", stakeTzs: stake });
    const playerBal = (await w.bal(player)).balance, botBal = (await w.bal(b.userId)).balance;
    const rp: Any = await w.svc.buyPosition(player, { marketId: market.id, side: "YES", stake, idempotencyKey: crypto.randomUUID() });
    const rh: Any = await w.place(b, i);
    await undo(fixture);
    const same = rp.ok === false && rh.ok === false && rp.code === rh.code && rp.reason === rh.reason;
    ok(`3.${fixture} · buyPosition and placeHouseBet refuse alike`, same, `player ${rp.code}/${rp.reason} · house ${rh.code}/${rh.reason}`);
    ok(`3.${fixture}.money · …and neither moved money`, (await w.bal(player)).balance === playerBal && (await w.bal(b.userId)).balance === botBal);
  }
  ok("3.c1 · CONTROL · a healthy account on the same fixture path places on both", await (async () => {
    const market = await w.poll({ graceMin: 0 });
    const player = await w.user({ balance: 1_000_000 });
    const b = await w.bot();
    const i = await w.intent(b, market.id, { kind: "OPENER", side: "YES", stakeTzs: 1_000 });
    const rh: Any = await w.place(b, i);
    const rp: Any = await w.svc.buyPosition(player, { marketId: market.id, side: "NO", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    return rh.ok === true && rp.ok === true;
  })());
}

/* ═══ §4 · SEAM sites — no house branch outside an anchored site (04 F3) ════════════════════════ */
section("§4 · SEAM sites");
{
  // A marker authorises only the first SITE_WINDOW code lines under it (comment-only lines skipped), and a
  // branch is read on decommented code, so a commented-out branch is not one and a comment cannot hide one.
  const SITE_WINDOW = 3;
  const MARKER = markerRe("SEAM", "[A-Za-z0-9]+");
  const HOUSE_TOKEN = String.raw`(?:\bctx\.kind\b|\bhouse(?:Intent|Pool|Position)\b|(?:\b\w+\.)?\bhouseBotId\b|["']house["'])`;
  const BRANCH = new RegExp([
    String.raw`\bctx\.kind\b`,
    String.raw`\{[^}]*\bkind\b[^}]*\}\s*=\s*ctx\b`,
    String.raw`${HOUSE_TOKEN}\s*(?:[!=]==?|\?(?![.?:])|&&|\|\|)`,
    String.raw`(?:[!=]==?|&&|\|\||!|\?\?)\s*\(?\s*${HOUSE_TOKEN}`,
    String.raw`\b(?:if|while|switch)\s*\(\s*!?\s*${HOUSE_TOKEN}`,
  ].join("|"));
  /** Data carried along is not a branch: a notice's `houseStake:` value and `houseBotId: … ?? null`. */
  const carried = (l: string) => l.replace(/\bhouseStake:\s*[^,})]+/g, "").replace(/\bhouseBotId:\s*[\w.]+\s*\?\?\s*null/g, "");
  const unanchored = (raw: string): number[] => {
    const rawLines = raw.split("\n"), code = decomment(raw).split("\n");
    const covered = new Set<number>();
    rawLines.forEach((l, n) => {
      if (!MARKER.test(l)) return;
      for (let k = n + 1, seen = 0; k < rawLines.length && seen < SITE_WINDOW; k++) {
        if (code[k].trim() === "") continue;
        covered.add(k); seen++;
      }
    });
    return code.flatMap((l, n) => (BRANCH.test(carried(l)) && !covered.has(n) ? [n + 1] : []));
  };
  const bad = unanchored(SVC_SRC);
  const code = decomment(SVC_SRC).split("\n");
  ok("4.0 · the reader sees the house branches", code.filter((l) => BRANCH.test(carried(l))).length >= 30,
    `${code.filter((l) => BRANCH.test(carried(l))).length} branch lines`);
  ok("4.1 · every ctx.kind comparison in market-service.ts sits under a SEAM: marker", bad.length === 0, `unanchored at line(s) ${bad.join(", ")}`);
  const markers = [...SVC_SRC.matchAll(new RegExp(MARKER.source, "g"))].map((m) => m[1]);
  ok("4.2 · the SEAM markers are exactly SEAM_SITES, each once", markers.slice().sort().join() === anchors.SEAM_SITES.slice().sort().join()
    && new Set(markers).size === markers.length, `markers ${markers.length} · declared ${anchors.SEAM_SITES.length}`);
  const idle = SVC_SRC.split("\n").flatMap((l, n, all) => {
    const m = MARKER.exec(l);
    if (!m) return [];
    const window = decomment(all.slice(n + 1, n + 1 + 12).join("\n")).split("\n").filter((x) => x.trim() !== "").slice(0, SITE_WINDOW).join("\n");
    return /house|\bctx\.kind\b/i.test(window) ? [] : [m[1]];
  });
  ok("4.2b · every SEAM marker's window touches house state (no marker parked where it covers nothing)", idle.length === 0, idle.join(", "));
  const plant = (lines: string[]) => unanchored(lines.join("\n")).length;
  ok("4.c1 · CONTROL · a planted unmarked `ctx.kind === \"house\"` branch is reported", plant(["  const x = 1;", "  if (ctx.kind === \"house\") skipGate();"]) === 1);
  ok("4.c2 · CONTROL · literal-first, destructured, switch and intent-keyed skips are each reported",
    plant(["  if (\"house\" === ctx.kind) skipGate();"]) === 1 && plant(["  const { kind } = ctx;"]) === 1
    && plant(["  switch (ctx.kind) {"]) === 1 && plant(["  if (!houseIntent && await isMaintenanceMode()) {"]) === 1
    && plant(["  if (p.houseBotId != null) return;"]) === 1 && plant(["  const k = housePosition ? 1 : 2;"]) === 1);
  ok("4.c3 · CONTROL · a branch on the 4th code line under a marker is reported; on the 3rd it is not", (() => {
    const lines = SVC_SRC.split("\n");
    const at = lines.findIndex((l) => l.includes("// SEAM:lockTimeout"));
    const nth = (n: number) => { let k = at, seen = 0; while (seen < n) { k++; if (decomment(lines[k]).trim() !== "") seen++; } return k; };
    const plantAfter = (k: number) => [...lines.slice(0, k + 1), "      if (ctx.kind === \"player\" && (!fresh || fresh.status !== \"OPEN\")) return \"CLOSED\";", ...lines.slice(k + 1)].join("\n");
    const fourth = unanchored(plantAfter(nth(3))).length, third = unanchored(plantAfter(nth(2))).length;
    return at > 0 && fourth === bad.length + 1 && third === bad.length;
  })());
  ok("4.c4 · CONTROL · a commented-out branch and carried data are not branches",
    plant(["  // if (ctx.kind === \"house\") skipGate();", "  notifyWin(u, { houseStake: p.houseBotId != null });", "  push({ houseBotId: p.houseBotId ?? null });"]) === 0);
  const importers = (await import("node:child_process")).spawnSync("git", ["grep", "-l", "placeHouseBet", "--", "src"], { cwd: root, encoding: "utf8" }).stdout
    .split(/\r?\n/).filter(Boolean).filter((f) => f !== "src/lib/server/market-service.ts");
  const offenders = importers.filter((f) => /import[^;]*\bplaceHouseBet\b/.test(read(f)) && !f.endsWith("src/lib/server/house-bot/fire.ts"));
  ok("4.3 · only house-bot/fire.ts may import placeHouseBet (PLAN I1)", offenders.length === 0, offenders.join(", "));
}

/* ═══ §5 · the house gates' own law: declared order, plain reads, H0 without status ═══════════════ */
section("§5 · house gates");
{
  const h2 = fnBody(SEAM_SRC, "export async function houseH2(");
  const order = [...h2.matchAll(markerRe("H2_ORDER", "[a-z-]+", "g"))].map((m) => m[1]);
  ok("5.1 · houseH2's group markers are exactly H2_ORDER, in order", order.join() === anchors.H2_ORDER.join(), order.join(" → "));
  const caps = [...decomment(h2).matchAll(/capReached\("([A-Z_]+)"/g)].map((m) => m[1]);
  ok("5.2 · houseH2's cap literals appear in H2_CAP_SEQUENCE order", caps.join() === anchors.H2_CAP_SEQUENCE.join(), caps.join(", "));
  ok("5.3 · the house gates take no row lock (no FOR UPDATE)", !/FOR\s+(UPDATE|SHARE)/i.test(decomment(SEAM_SRC)));
  const h0 = decomment(fnBody(SEAM_SRC, "export async function houseH0("));
  ok("5.4 · H0 never reads the intent's status", h0.length > 500 && !/\.status\b/.test(h0), `${h0.length} chars`);
  const h3 = decomment(fnBody(SEAM_SRC, "export async function houseH3("));
  ok("5.5 · the H3 path sums no position stakes itself — only lockedForHouse (N1 §3, N2 §3 pins)",
    h3.length > 1_000 && /lockedForHouse\(/.test(h3) && !/listForMarket\(|\.stake\b|reduce\(/.test(h3), `${h3.length} chars`);
  ok("5.6 · the untargeted COUNTER reads lockedA15; a targeted one reads locked", /intent\.targetId != null \? pool!\[opposite\(side\)\]\.locked : pool!\[opposite\(side\)\]\.lockedA15/.test(h3));
  const blackout = read("src/lib/server/house-bot/blackout.ts");
  const exported = [...decomment(blackout).matchAll(/export (?:async )?function (\w+)\([^)]*\)[^{]*:\s*([^{]+)\{/g)].map((m) => `${m[1]}:${m[2].trim()}`);
  ok("5.7 · blackout.ts exports only functions returning { blocked } (InfoBlackout)", exported.length === 2 && exported.every((e) => /InfoBlackout/.test(e)), exported.join(" | "));
  ok("5.c1 · CONTROL · a planted FOR UPDATE is caught", /FOR\s+(UPDATE|SHARE)/i.test("SELECT 1 FOR UPDATE"));
  ok("5.c2 · CONTROL · a status read in H0 is caught", /\.status\b/.test("if (intent.status !== 'CLAIMED') return"));
}

/* ═══ §6 · sanctioned player-path changes give unchanged output for a player (PLAN §3) ════════════ */
section("§6 · sanctioned changes");
{
  // (p) stakeBoundsForMarket is what the bet path refuses with.
  const { setMarketOverride } = await import("../src/lib/server/market-config.ts");
  for (const [label, over] of [["a poll", null], ["a poll with a per-market minimum override", { minStake: 2_500 }]] as const) {
    const market = await w.svc.createMarket({
      titleEn: "Bounds case", titleSw: "Soko", category: "macro", sourceUrl: "https://bot.go.tz", resolutionCriterion: "x",
      resolutionAt: w.iso(864e5), proposedBy: OFFICER,
    });
    if (over) {
      const set: Any = await setMarketOverride(market.id, over, OFFICER);
      if (!set.ok) throw new Error(`override fixture: ${JSON.stringify(set)}`);
    }
    const bounds = await w.svc.stakeBoundsForMarket(market);
    if (over) ok("6.p0 · fixture · the per-market override moved the minimum", bounds.min === 2_500, JSON.stringify(bounds));
    const player = await w.user({ balance: 1_000_000 });
    const r: Any = await w.svc.buyPosition(player, { marketId: market.id, side: "YES", stake: bounds.min - 1, idempotencyKey: crypto.randomUUID() });
    ok(`6.p · ${label}: a stake 1 under stakeBoundsForMarket().min is refused naming exactly those bounds`,
      r.ok === false && r.reason === "stake_below_min" && r.detail?.min === bounds.min && r.detail?.max === bounds.max, `${JSON.stringify(bounds)} · ${JSON.stringify(r.detail)}`);
  }

  // (r) adminReopenMarket: reopenedAt and reopenCount only.
  {
    const market = await w.poll();
    await w.mdal.marketStore.stamp(market.id, { status: "CLOSED", sentinelOutcome: "YES" });
    const before = { ...(await w.svc.getMarket(market.id)) };
    const r: Any = await w.svc.adminReopenMarket(market.id, OFFICER);
    const after: Any = { ...(await w.svc.getMarket(market.id)) };
    // The reopen as it was BEFORE sanctioned change (r), written out field by field — an independent model,
    // so "byte-identical apart from reopenedAt and reopenCount" is a comparison with something.
    const modelled: Any = {
      ...before, status: "LIVE", updatedAt: after.updatedAt,
      sentinelOutcome: null, sentinelEvidence: null, sentinelReasoning: null, sentinelSourceUrl: null, sentinelConfidence: null, sentinelClosedAt: null,
      resolutionNotifiedAt: null, selectionClosedNotifiedAt: null, closingSoonNotifiedAt: null, resolveClaimedAt: null,
    };
    const norm = (o: Any) => canon(Object.fromEntries(Object.entries(o).filter(([k]) => k !== "reopenedAt" && k !== "reopenCount").map(([k, v]) => [k, v ?? null])));
    ok("6.r · a reopen's output equals the pre-(r) reopen apart from reopenedAt and reopenCount", r.ok === true && norm(after) === norm(modelled),
      r.ok ? "" : JSON.stringify(r));
    ok("6.r.c1 · CONTROL · the comparison sees a difference when one exists", norm({ ...after, status: "CLOSED" }) !== norm(modelled));
    ok("6.r2 · reopenedAt is the reopen instant and reopenCount counts from 1", after.reopenedAt === after.updatedAt && after.reopenCount === 1);
    await w.mdal.marketStore.stamp(market.id, { status: "CLOSED" });
    await w.svc.adminReopenMarket(market.id, OFFICER);
    ok("6.r3 · a second reopen counts 2 and never clears reopenedAt", (await w.svc.getMarket(market.id)).reopenCount === 2);
  }

  // (n)/(f) objection standing.
  {
    const { objectionEligibility } = await import("../src/lib/server/objections-service.ts");
    const market = await w.poll({ graceMin: 0 });
    const player = await w.user({ balance: 100_000 });
    await w.svc.buyPosition(player, { marketId: market.id, side: "NO", stake: 5_000, idempotencyKey: crypto.randomUUID() });
    const houseOnly = await w.bot();
    const i1 = await w.intent(houseOnly, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 1_000 });
    await w.backdate((await w.positionsOf(market.id)).find((p: Any) => p.userId === player).id, 10_000);
    await w.limits({ gStaffChosenMaxCounterpartyShare: 100 });
    const placed: Any = await w.place(houseOnly, i1);
    await w.svc.resolveMarket({ marketId: market.id, outcome: "NO", officerId: OFFICER });
    const eHouse: Any = await objectionEligibility(houseOnly.userId, market.id);
    const ePlayer: Any = await objectionEligibility(player, market.id);
    ok("6.n · fixture · a house-only holder and a player on a resolved market", placed.ok === true, JSON.stringify(placed));
    ok("6.n1 · a holder whose only stakes are liquidity stakes → HOUSE_STAKE_ONLY", eHouse.eligible === false && eHouse.why === "HOUSE_STAKE_ONLY", JSON.stringify(eHouse));
    ok("6.n2 · CONTROL · a player with their own stake is eligible (unchanged)", ePlayer.eligible === true, JSON.stringify(ePlayer));

    // LIE-05: a mixed holder — a liquidity stake FIRST, then their own bet — keeps their standing (every, not some).
    const m2 = await w.poll({ graceMin: 0 });
    const p2 = await w.user({ balance: 100_000 });
    const r2 = await w.svc.buyPosition(p2, { marketId: m2.id, side: "NO", stake: 5_000, idempotencyKey: crypto.randomUUID() });
    if (r2.ok) await w.backdate(r2.data.positionId, 10_000);
    const mixed = await w.bot();
    const i2 = await w.intent(mixed, m2.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 1_000 });
    const placed2: Any = await w.place(mixed, i2);
    const own: Any = await w.svc.buyPosition(mixed.userId, { marketId: m2.id, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    await w.svc.resolveMarket({ marketId: m2.id, outcome: "NO", officerId: OFFICER });
    const mine2 = (await w.positionsOf(m2.id)).filter((p: Any) => p.userId === mixed.userId);
    const eMixed: Any = await objectionEligibility(mixed.userId, m2.id);
    ok("6.n3 · fixture · the mixed holder has one house-marked and one own position",
      placed2.ok === true && own.ok === true && mine2.length === 2 && mine2.filter((p: Any) => p.houseBotId != null).length === 1, `${placed2.reason ?? "ok"} · ${own.reason ?? "ok"} · ${mine2.length}`);
    ok("6.n4 · a holder with a liquidity stake AND their own stake is eligible", eMixed.eligible === true, JSON.stringify(eMixed));
  }

  // (c) and (m): the player action refuses reserved keys and never chips a liquidity stake.
  {
    const actions = decomment(read("src/app/markets/actions.ts"));
    const buy = fnBody(actions, "export async function buyPositionAction(");
    ok("6.c · buyPositionAction refuses a reserved hb: key before calling buyPosition",
      /isHouseIntentKey\(idempotencyKey\)[\s\S]*idempotency_key_conflict[\s\S]*buyPosition\(/.test(buy));
    const comment = fnBody(actions, "export async function postCommentAction(");
    ok("6.m · postCommentAction takes its side chip from commentSideFor", /commentSideFor\(\s*await listPositionsForUser\(/.test(comment));
    const { commentSideFor } = await import("../src/lib/comment-side.ts");
    const mk = "m1";
    const houseOnlySide = commentSideFor([{ marketId: mk, status: "OPEN", side: "YES", houseBotId: "hb1" }], mk);
    const mixedSide = commentSideFor([{ marketId: mk, status: "OPEN", side: "NO", houseBotId: null }, { marketId: mk, status: "OPEN", side: "YES", houseBotId: "hb1" }], mk);
    const playerSide = commentSideFor([{ marketId: mk, status: "OPEN", side: "NO" }, { marketId: "m2", status: "OPEN", side: "YES" }], mk);
    ok("6.m1 · a liquidity stake never gives its holder a side chip", houseOnlySide === null, String(houseOnlySide));
    ok("6.m2 · a mixed holder's chip is their OWN side, not the house stake's", mixedSide === "NO", String(mixedSide));
    ok("6.m3 · CONTROL · a player's own open stake on this market gives the chip (other markets ignored)", playerSide === "NO", String(playerSide));
  }

  // (h) UX-2: the house selection-closed notice rides its OWN push tag, so it can never replace the holder's
  // personal notice on the lock screen (the title label is proven behaviourally in money 8.7).
  {
    const notif = decomment(read("src/lib/server/notification-service.ts"));
    const sc = fnBody(notif, "export function notifySelectionClosed(");
    const tagged = /opts\.houseStake\s*\?\s*\{\s*pushTag:\s*`selection-closed-house:\$\{opts\.marketId\}`\s*\}\s*:\s*undefined/;
    ok("6.h1 · notifySelectionClosed passes pushTag selection-closed-house:<marketId> exactly when houseStake", tagged.test(sc), `${sc.length} chars read`);
    ok("6.h1c · CONTROL · a notice with no house condition on the tag is not matched",
      !tagged.test("}, { pushTag: `selection-closed-house:${opts.marketId}` });") && sc.length > 1_000);
  }

  // A17 and H9: no wagering reversal and no recruiter reward on a marked position.
  {
    const svc = decomment(SVC_SRC);
    const reversals = [...svc.matchAll(/reverseWagering\(/g)].length;
    const guarded = [...svc.matchAll(/if \((?:r|p)\.houseBotId == null\) await reverseWagering\(/g)].length;
    ok("6.g · every reverseWagering call in market-service.ts is guarded by the marker", reversals >= 3 && reversals === guarded, `${guarded} of ${reversals}`);
    const guardedFn = decomment(fnBody(SVC_SRC, "async function buyPositionInner("));
    ok("6.g1 · a house stake records no wagering: the only recordWageringLocked call is skipped for house context (H6)",
      [...guardedFn.matchAll(/recordWageringLocked\(/g)].length === 1 && /const wr = opposite \|\| ctx\.kind === "house" \? \{ fulfilled: \[\], creditedToRealTzs: 0 \} : await recordWageringLocked\(/.test(guardedFn));
    const aff = decomment(read("src/lib/server/affiliate-service.ts"));
    ok("6.g2 · onRecruitBet and onRecruitSettlement return first on a marked position", /onRecruitBet\([^)]*\)[\s\S]{0,400}?\{\s*if \(opts\.houseBotId != null\) return;/.test(aff)
      && /onRecruitSettlement\([\s\S]{0,600}?\): Promise<void> \{\s*if \(opts\.houseBotId != null\) return;/.test(aff));
  }
}

/* ═══ §7 · pure pieces: the blackout truth table and pro-rata attribution ════════════════════════ */
section("§7 · blackout and attribution");
{
  const { blackoutFromRow } = await import("../src/lib/server/house-bot/blackout.ts");
  const { attributeStake } = await import("../src/lib/server/house-bot/seam.ts");
  const now = Date.UTC(2026, 8, 14, 12, 0, 0);
  const base = { status: "LIVE", sentinelOutcome: null, sentinelConfidence: null, sentinelDetermined: null, sentinelClosedAt: null,
    resolvedOutcome: null, resolutionStage1By: null, resolveClaimedAt: null, reopenedAt: null };
  const b = (o: Record<string, unknown>) => blackoutFromRow({ ...base, ...o } as never, now).blocked;
  ok("7.1 · a clean LIVE poll is not blocked", b({}) === false);
  for (const [k, v] of [["sentinelOutcome", "YES"], ["sentinelConfidence", 0.4], ["sentinelDetermined", false], ["sentinelClosedAt", "2026-09-14T11:00:00.000Z"],
    ["resolvedOutcome", "NO"], ["resolutionStage1By", OFFICER], ["reopenedAt", "2026-09-13T00:00:00.000Z"]] as const) {
    ok(`7.2 · ${k} set → blocked`, b({ [k]: v }) === true);
  }
  ok("7.3 · a resolve claim 9:59 old → blocked", b({ resolveClaimedAt: new Date(now - 599_000).toISOString() }) === true);
  ok("7.4 · a resolve claim 10:01 old → not blocked", b({ resolveClaimedAt: new Date(now - 601_000).toISOString() }) === false);
  ok("7.5 · a non-LIVE market is never 'blocked' (the bet path refuses it anyway)", b({ status: "CLOSED", sentinelOutcome: "YES" }) === false);
  // N2 §4 step 9.5: `endTargets` never ends a target on a young resolve claim alone.
  const noClaim = (o: Record<string, unknown>) => blackoutFromRow({ ...base, ...o } as never, now, { countResolveClaim: false }).blocked;
  ok("7.5b · countResolveClaim:false · a resolve claim 9:59 old alone → not blocked", noClaim({ resolveClaimedAt: new Date(now - 599_000).toISOString() }) === false);
  ok("7.5c · …but a Sentinel stamp or a reopen still blocks with that option", noClaim({ resolveClaimedAt: new Date(now - 599_000).toISOString(), sentinelOutcome: "YES" }) === true
    && noClaim({ reopenedAt: "2026-09-13T00:00:00.000Z" }) === true);
  const a = attributeStake(5_000, [{ userId: "u80", lockedTzs: 8_000 }, { userId: "u20", lockedTzs: 2_000 }], 10_000);
  ok("7.6 · 5,000 against 8,000 / 2,000 → 4,000 to the 80% holder, nothing to the 20% one", JSON.stringify(a) === JSON.stringify([{ userId: "u80", sharePct: 80, attributedTzs: 4_000 }]), JSON.stringify(a));
  const edge = attributeStake(1_000, [{ userId: "u25", lockedTzs: 2_500 }], 10_000);
  ok("7.7 · exactly 25% is attributed (floor)", edge.length === 1 && edge[0].attributedTzs === 250, JSON.stringify(edge));
  ok("7.8 · no locked money → no attribution", attributeStake(1_000, [], 0).length === 0);
}

/* ═══ Result ════════════════════════════════════════════════════════════════════════════════ */

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-seam: ${pass} passed, ${fail} failed`);
if (pass + fail === 0) {
  console.error("!! ZERO assertions ran — treating as failure.");
  process.exit(3);
}
process.exit(fail === 0 ? 0 : 1);
