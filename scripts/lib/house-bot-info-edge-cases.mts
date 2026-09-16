/**
 * The case list behind `test:house-bot-info-edge` (C4 ruling 160). Run by that suite in two child processes — memory and
 * Postgres — never on its own. §1–§3 are source checks and run in the memory child; §4 runs on both stores.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import { decomment } from "./decomment.mts";

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
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, String((e as Error)?.stack ?? e).split("\n").slice(0, 3).join(" | ")); }
}

/** Code the bundler keeps: types and comments stripped exactly as esbuild strips them. */
const strip = (file: string, code: string) => transformSync(code, { loader: file.endsWith(".tsx") ? "tsx" : "ts", format: "esm", target: "es2022" }).code;
/** The body of the object-literal method `name(` that starts after `anchor` (the DAL twins are object literals). */
function methodBody(src: string, anchor: string, name: string): string {
  const a = src.indexOf(anchor);
  if (a < 0) return "";
  const start = src.indexOf(`async ${name}(`, a);
  if (start < 0) return "";
  const open = src.indexOf("{", src.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  return "";
}

/** Forbidden to every engine module except those exempt by name (ruling 160). */
export const FORBIDDEN_TOKENS = /\bsentinel\w*|\bresolvedOutcome\b|\bresolutionEvidence\b|\bresolveClaimedAt\b|\bresolutionStage1By\b|\bblackoutRow\b|\bHouseBlackoutRow\b/gi;
export const FORBIDDEN_READERS = /\bgetMarket\b|\blistMarkets\b|\bmarketStore\b|\bdb\.market\b|updown-board/g;
const EXEMPT_TOKENS = new Set(["blackout.ts"]);
const EXEMPT_STORED_MARKET = new Set(["seam.ts"]);
const ALLOWED_VALUE_IMPORTS: Record<string, Set<string>> = {
  "../market-service": new Set(["placeHouseBet", "stakeBoundsForMarket"]),
  "../market-dal": new Set(["positionStore"]),
};

/** One engine module's violations. `name` decides the exemptions; `raw` is the source as written. */
export function engineViolations(name: string, raw: string): string[] {
  const out: string[] = [];
  const kept = strip(name, raw);
  if (!EXEMPT_TOKENS.has(name)) for (const m of kept.matchAll(FORBIDDEN_TOKENS)) out.push(`token ${m[0]}`);
  for (const m of kept.matchAll(FORBIDDEN_READERS)) out.push(`reader ${m[0]}`);
  if (!EXEMPT_STORED_MARKET.has(name) && /\bStoredMarket\b/.test(decomment(raw))) out.push("StoredMarket");
  for (const m of kept.matchAll(/\bimport\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    const allowed = ALLOWED_VALUE_IMPORTS[m[2]];
    if (!allowed) continue;
    for (const spec of m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      if (!allowed.has(spec)) out.push(`import ${spec} from ${m[2]}`);
    }
  }
  return out;
}

if (STORE === "memory") {
  /* ═══ §1 · the pinned field lists ════════════════════════════════════════════════════════════════════ */
  section("§1 · the engine's market fields are exactly the pinned lists");
  await guard("1", async () => {
    const MV: Any = await import("../../src/lib/server/house-bot/market-view.ts");
    const PINNED_MARKET = ["id", "productLine", "category", "status", "yesPool", "noPool", "selectionClosedAt", "resolutionAt", "createdAt", "titleEn", "feeSnapshot", "reopenedAt"];
    const PINNED_ROUND = ["roundId", "chainId", "chainKey", "roundNumber", "opensAt", "durationMinutes", "openPrice", "upTarget", "downTarget", "chainRunning", "assetEnabled"];
    const PINNED_VIEW = ["id", "productLine", "category", "status", "yesPool", "noPool", "selectionClosedAt", "resolutionAt", "createdAt", "titleEn", "exitRates", "isDemo", "reopenedAt", "round"];
    ok("1.1 · HOUSE_MARKET_FIELDS equals the pinned list, in order", j(MV.HOUSE_MARKET_FIELDS) === j(PINNED_MARKET), j(MV.HOUSE_MARKET_FIELDS));
    ok("1.2 · HOUSE_ROUND_FIELDS equals the pinned list, in order", j(MV.HOUSE_ROUND_FIELDS) === j(PINNED_ROUND), j(MV.HOUSE_ROUND_FIELDS));
    const row = {
      id: "mkt_x", productLine: "MARKET", category: "sports", status: "LIVE", yesPool: 1, noPool: 2, selectionClosedAt: null,
      resolutionAt: "2026-09-16T10:00:00.000Z", createdAt: "2026-09-16T09:00:00.000Z", titleEn: "t", exitGraceMin: 5, exitPaidMin: 60,
      reopenedAt: null, round: null,
      // A row carrying forbidden columns must not pass them through the projection.
      sentinelOutcome: "YES", resolvedOutcome: "YES",
    };
    const view = MV.projectMarketView(row);
    ok("1.3 · projectMarketView returns exactly the pinned view keys, and drops a forbidden column it is handed", j(Object.keys(view)) === j(PINNED_VIEW) && !("sentinelOutcome" in view) && !("resolvedOutcome" in view), j(Object.keys(view)));
  });

  /* ═══ §2 · the DAL's market-view read ═══════════════════════════════════════════════════════════════ */
  section("§2 · houseSeamStore.marketView reads only the allowed market columns, on both twins");
  await guard("2", async () => {
    const MV: Any = await import("../../src/lib/server/house-bot/market-view.ts");
    const dal = decomment(read("src/lib/server/house-bot-dal.ts"));
    const memBody = methodBody(dal, "const memoryHouseSeam", "marketView") || methodBody(dal, "memoryHouseSeam", "marketView");
    const pgBody = methodBody(dal, "const prismaHouseSeam", "marketView") || methodBody(dal, "prismaHouseSeam", "marketView");
    ok("2.0 · both marketView bodies are found (the checks below read real code)", memBody.length > 300 && pgBody.length > 300, `${memBody.length} / ${pgBody.length} chars`);
    const allowed = new Set<string>(MV.HOUSE_MARKET_FIELDS);
    const pgCols = [...new Set([...pgBody.matchAll(/\bm\."(\w+)"/g)].map((m) => m[1]))];
    ok("2.1 · Postgres selects exactly HOUSE_MARKET_FIELDS from the market", pgCols.length === allowed.size && pgCols.every((c) => allowed.has(c)), j(pgCols));
    const memCols = [...new Set([...memBody.matchAll(/\bm\.(\w+)/g)].map((m) => m[1]))];
    ok("2.2 · the memory twin reads no market field outside HOUSE_MARKET_FIELDS", memCols.length > 5 && memCols.every((c) => allowed.has(c)), j(memCols));
    ok("2.3 · neither body names a forbidden field", ![...memBody.matchAll(FORBIDDEN_TOKENS), ...pgBody.matchAll(FORBIDDEN_TOKENS)].length);
  });

  /* ═══ §3 · the walker over every engine module ══════════════════════════════════════════════════════ */
  section("§3 · no engine module can read a result check, a staged verdict or a market row");
  await guard("3", async () => {
    const dirs = ["src/lib/server/house-bot", "src/lib/house-bot"];
    const files = dirs.flatMap((d) => readdirSync(join(ROOT, d)).filter((f) => f.endsWith(".ts")).map((f) => ({ name: f, rel: `${d}/${f}` })));
    ok("3.0 · the population is the two engine folders, read from disk (≥ 35 modules, the exempt ones among them)",
      files.length >= 35 && files.some((f) => f.name === "blackout.ts") && files.some((f) => f.name === "seam.ts") && files.some((f) => f.name === "fire.ts"), `${files.length} modules`);
    const bad = files.map((f) => ({ rel: f.rel, v: engineViolations(f.name, read(f.rel)) })).filter((x) => x.v.length > 0);
    ok("3.1 · ⛔ no engine module carries a forbidden token, a market-row reader, StoredMarket or a disallowed value import", bad.length === 0, j(bad));
    const decideRaw = decomment(read("src/lib/server/house-bot/decide.ts"));
    ok("3.2 · decide.ts never imports blackout.ts (the blackout arrives as an injected boolean)", !/from\s+["']\.\/blackout["']|import\(["']\.\/blackout["']\)/.test(decideRaw));
    ok("3.3 · measured, not assumed: ud-price.ts carries no forbidden token, so it is NOT exempt (ruling 160)", engineViolations("ud-price.ts", read("src/lib/server/house-bot/ud-price.ts")).length === 0);

    // CONTROLS — each rule can fail on a planted module.
    ok("3.c1 · CONTROL · a planted field read is caught, and the same words in a comment are not",
      engineViolations("planted.ts", "export const f = (m: any) => m.sentinelOutcome;").some((v) => v.includes("sentinelOutcome"))
        && engineViolations("planted.ts", "// sentinelOutcome is never read here\nexport const f = 1;").length === 0);
    ok("3.c2 · CONTROL · a type-only StoredMarket import is caught (esbuild would erase it)",
      engineViolations("planted.ts", "import type { StoredMarket } from \"../market-service\";\nexport const f = (m: StoredMarket) => m.id;").includes("StoredMarket"));
    ok("3.c3 · CONTROL · a market-row reader and a disallowed value import are caught",
      engineViolations("planted.ts", "import { getMarket, placeHouseBet } from \"../market-service\";\nexport const f = () => getMarket(\"x\") && placeHouseBet;").some((v) => v === "import getMarket from ../market-service")
        && engineViolations("planted.ts", "import { getMarket } from \"../market-service\";\nexport const g = () => getMarket(\"x\");").some((v) => v.startsWith("reader getMarket")));
    ok("3.c4 · CONTROL · the exemptions are by exact name only: the same blackout code under another name is caught",
      engineViolations("blackout.ts", read("src/lib/server/house-bot/blackout.ts")).length === 0
        && engineViolations("blackout2.ts", read("src/lib/server/house-bot/blackout.ts")).some((v) => v.startsWith("token")));
  });
}

/* ═══ §4 · both stores: the view is identical with and without the forbidden columns ═════════════════════ */
section("§4 · the same poll, before and after a result check and a staged verdict: one byte-identical view");
{
  const { loadWorld, OFFICER } = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  ok(`0.store · the child runs on ${STORE}`, w.onPostgres === (STORE === "postgres"));
  await guard("4", async () => {
    const BL: Any = await import("../../src/lib/server/house-bot/blackout.ts");
    const MV: Any = await import("../../src/lib/server/house-bot/market-view.ts");
    await w.user({ id: OFFICER, role: "ADMIN" });
    const market = await w.poll({ graceMin: 0 });
    const before = await w.dal.houseSeamStore.marketView(market.id);
    const blockedBefore = await BL.infoBlackout(market.id);
    await w.mdal.marketStore.stamp(market.id, {
      sentinelOutcome: "YES", sentinelConfidence: 0.97, sentinelDetermined: true, sentinelClosedAt: new Date().toISOString(),
      sentinelEvidence: "the official source says YES", resolvedOutcome: "YES", resolutionStage1By: OFFICER,
      resolutionEvidence: "stage-1 evidence", resolveClaimedAt: new Date().toISOString(),
    });
    const after = await w.dal.houseSeamStore.marketView(market.id);
    const blockedAfter = await BL.infoBlackout(market.id);
    ok("4.1 · CONTROL · the columns were really written: the blackout answers blocked:false before and blocked:true after",
      blockedBefore.blocked === false && blockedAfter.blocked === true, j({ blockedBefore, blockedAfter }));
    ok("4.2 · ⭐ the DAL's market view is byte-identical before and after", !!before && j(before) === j(after), j({ before, after }));
    ok("4.3 · …and so is the engine's PublicMarketView", !!before && j(MV.projectMarketView(before)) === j(MV.projectMarketView(after)));
    ok("4.4 · …and no forbidden value reaches the view in any form", !/YES"?,?\s*"?sentinel|stage-1 evidence|official source says/.test(j(after)) && ![...j(after).matchAll(FORBIDDEN_TOKENS)].length, j(after));
  });
}

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail })}`);
process.exit(fail === 0 ? 0 : 1);
