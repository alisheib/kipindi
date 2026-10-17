/**
 * `npm run test:predictor-shown` — THE COUNT PLAYERS SEE AND THE COUNT ADMINS READ, KEPT APART (owner ruling,
 * 2026-10-11: docs/COMPLIANCE-DECISIONS.md, "A desk account may count as more than one predictor in the count players
 * see"). `npm run red:predictor-shown` replays its declared plants.
 *
 * A market holds two numbers. `predictorCount` is the TRUE count of accounts: the Gaming Board match-integrity report,
 * an Up & Down round's audit row and every admin page read it, and only it (D20a). `predictorExtra` is what players see
 * on top of it — a desk account's "Counts as". ONE helper, `src/lib/markets/predictors.ts`, adds the two, for player
 * surfaces only. This suite holds that split:
 *   §1 the helper itself: its sum, its zero rule, its refusals;
 *   §2 census A — no PLAYER surface reads the true count raw: every count a player sees is built by the helper;
 *   §3 census B — no ADMIN page, report or audit writer calls the helper or names the extra;
 *   §4 no browser module names either column, so neither number reaches a player's device (D19);
 *   §5 the extra has exactly the writers it is meant to have — increments alone; `set()` never writes it on an
 *      existing row; it is never stampable;
 *   §6 the bet path names it only through the seam's own read, inside the one pool increment.
 *
 * ⛔ EVERY CENSUS HAS A PLANTED CONTROL, and `--prove-red` replays `scripts/anchors/predictor-shown.anchors.mjs`
 * against IN-MEMORY copies of the sources — nothing is ever written to disk — demanding each plant turn ITS OWN check
 * red. Exit 1 on any failure; exit 3 when nothing was measured.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/predictor-shown.anchors.mjs";
import { shownPredictors } from "../src/lib/markets/predictors.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PROVE_RED = process.argv.includes("--prove-red");

type Check = { label: string; ok: boolean; detail: string };

/* ═══ The source population — walked once; every read goes through `read`, so a plant can stand in for a file ═══ */
const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel));
    else if (/\.(ts|tsx|mts)$/.test(name)) out.push(rel);
  }
  return out;
};
const SRC_FILES = walk("src");
const isAdmin = (rel: string) => /(^|\/)admin(\/|$)/.test(rel);

/** ⭐ THE TRUE COUNT'S HOMES — the only files that may NAME `predictorCount` at all: the admin pages, the market store and
 *  the bet path that write it, the readers that report it (insights, the Up & Down config's refusal and audit row, the
 *  reports), and the helper that adds the extra to it. ⛔ EVERY OTHER FILE UNDER `src/` — every player page, component,
 *  library and server builder, including ones written next year — is census A's population, and must not name it in any
 *  form: a member read, a destructuring, a bracket read or a parameter (review, 2026-10-11: the first census matched
 *  `.predictorCount` and an object pattern, and a parameter destructuring walked past it). */
const HELPER = "src/lib/markets/predictors.ts";
const TRUE_COUNT_HOMES = (f: string) => isAdmin(f) || f.startsWith("src/lib/server/reports/") || [
  HELPER, "src/lib/server/market-dal.ts", "src/lib/server/market-service.ts", "src/lib/server/insights.ts",
  "src/lib/server/updown-config.ts", "src/lib/server/updown-service.ts",
  // MASWALI-BUILD S3 (2026-10-17): Millionea's purchase WRITES the week market's true count on a player's first ticket,
  // as updown-service does for a round; it reads none, and the fence keeps that market off every player surface.
  "src/lib/server/maswali-money-service.ts",
].includes(f);
const PLAYER_FILES = SRC_FILES.filter((f) => !TRUE_COUNT_HOMES(f));
/** The rows each player surface is built in — each must build its count through the helper. The landing's rows are built
 *  in its body, which S7 WP2 moved verbatim out of the route file (`src/app/page.tsx` keeps only the metadata). */
const ROW_SITES = [
  "src/components/home/legacy-landing.tsx", "src/app/markets/page.tsx", "src/app/markets/[id]/page.tsx", "src/app/results/page.tsx",
  "src/app/watchlist/page.tsx", "src/app/live/page.tsx", "src/lib/server/updown-board.ts",
  "src/app/api/og/market/[id]/route.tsx", "src/app/api/dev-test/seed-watchlist/route.ts",
];
/** Every admin page, report and audit writer — they read the TRUE count and nothing else (D20a). */
const ADMIN_FILES = SRC_FILES.filter((f) => isAdmin(f) || f.startsWith("src/lib/server/reports/")
  || ["src/lib/server/insights.ts", "src/lib/server/updown-config.ts", "src/lib/server/updown-service.ts"].includes(f));
/** The four files that may name the extra at all. */
const EXTRA_HOMES = ["src/lib/server/market-dal.ts", "src/lib/server/market-service.ts", "src/lib/server/house-bot-dal.ts", HELPER];

const RAW_READ = /\bpredictorCount\b/;
const CALLS_HELPER = /\bshownPredictors\b|@\/lib\/markets\/predictors/;
const NAMES_EXTRA = /\bpredictorExtra\b/;
const isClient = (code: string) => /^\s*["']use client["']/.test(code);

function checks(read: (rel: string) => string): Check[] {
  const out: Check[] = [];
  const ok = (label: string, cond: boolean, detail = "") => out.push({ label, ok: cond, detail });
  const code = (rel: string) => decomment(read(rel));

  /* §2 · census A */
  const rawReaders = PLAYER_FILES.filter((f) => RAW_READ.test(code(f)));
  ok("2.A · no player surface reads the true count raw — every count a player sees is built by shownPredictors; outside the true count's homes no file under src/ names predictorCount in any form",
    PLAYER_FILES.length >= 1_000 && rawReaders.length === 0, `${PLAYER_FILES.length} files outside the homes · naming it: ${rawReaders.join(", ")}`);
  const helperless = ROW_SITES.filter((f) => !existsSync(join(ROOT, f)) || !/\bshownPredictors\(/.test(code(f)) || !/from "@\/lib\/markets\/predictors"/.test(read(f)));
  ok("2.A′ · every row-building site — the board, the detail page, results, watchlist, live, the Up & Down board, the share image — imports and calls the helper",
    helperless.length === 0, helperless.join(", "));

  /* §3 · census B */
  const adminHits = ADMIN_FILES.filter((f) => CALLS_HELPER.test(code(f)) || NAMES_EXTRA.test(code(f)));
  ok("3.B · no admin page, report or audit row calls the helper or names the extra — they read the TRUE count (D20a)",
    ADMIN_FILES.length >= 60 && adminHits.length === 0, `${ADMIN_FILES.length} admin/report files · hits: ${adminHits.join(", ")}`);
  const catalogue = code("src/lib/server/reports/catalogue.ts");
  ok("3.B′ · the regulator's match-integrity report still reads the true count", /predictors: m\.predictorCount,/.test(catalogue));

  /* §4 · the browser */
  const clientFiles = SRC_FILES.filter((f) => isClient(code(f)));
  const clientHits = clientFiles.filter((f) => NAMES_EXTRA.test(code(f)) || RAW_READ.test(code(f)));
  ok("4 · no browser module names predictorExtra or reads .predictorCount — only the built number crosses",
    clientFiles.length >= 100 && clientHits.length === 0, `${clientFiles.length} client modules · hits: ${clientHits.join(", ")}`);

  /* §5 · the writers */
  const namers = SRC_FILES.filter((f) => NAMES_EXTRA.test(code(f)));
  ok("5.1 · predictorExtra is named only by its four homes: the market store, the bet path, the desk's shift and the helper",
    namers.every((f) => EXTRA_HOMES.includes(f)) && EXTRA_HOMES.every((f) => namers.includes(f)), namers.join(", "));
  const dal = code("src/lib/server/market-dal.ts");
  const pri = dal.slice(dal.indexOf("async set(m, tx) {"));
  const createArm = pri.slice(pri.indexOf("create: {"), pri.indexOf("update: {"));
  const updateArm = pri.slice(pri.indexOf("update: {"), pri.indexOf("async delete(id)"));
  ok("5.2 · set()'s UPDATE arm never writes the extra (a full-row write from a stale read would erase an increment); its CREATE arm writes it once",
    createArm.length > 500 && updateArm.length > 500 && (createArm.match(/predictorExtra:/g) ?? []).length === 1 && !/predictorExtra/.test(updateArm),
    `create ${createArm.length} · update ${updateArm.length}`);
  ok("5.3 · the memory set() keeps the stored extra when a different copy of an existing row is written",
    /markets\.set\(m\.id, \{ \.\.\.m, predictorExtra: cur\.predictorExtra \?\? 0 \}\);/.test(dal));
  const stampable = dal.slice(dal.indexOf("const STAMPABLE"), dal.indexOf("};", dal.indexOf("const STAMPABLE")));
  ok("5.4 · the extra is not stampable — no narrow write can set it", stampable.length > 200 && !NAMES_EXTRA.test(stampable), `${stampable.length} chars`);
  ok("5.5 · both addToPool twins add it by increment, never by a written value",
    /data\.predictorExtra = \{ increment: deltas\.predictorExtra \};/.test(dal)
      && /cur\.predictorExtra = \(cur\.predictorExtra \?\? 0\) \+ deltas\.predictorExtra;/.test(dal));

  /* §6 · the bet path */
  const svcRaw = read("src/lib/server/market-service.ts");
  const svc = decomment(svcRaw);
  ok("6 · the bet path names the extra only through the seam's read, inside the one pool increment, and never for a player",
    svcRaw.split(String.fromCharCode(13)).join("").includes(["    // SEAM:shownCount", '    const shownExtra = ctx.kind === "house" ? await houseShownExtra({ tx: lockTx, botId: ctx.botId, mine }) : 0;'].join(String.fromCharCode(10)))
      && /const shown = shownExtra > 0 \? \{ predictorExtra: shownExtra \} : \{\};/.test(svc)
      && (svc.match(/predictorCount: firstForThisPlayer, \.\.\.shown \}/g) ?? []).length === 2
      && (svc.match(/\bpredictorExtra\b/g) ?? []).length === 3,
    `${(svc.match(/\bpredictorExtra\b/g) ?? []).length} names`);

  /* §6b · the desk's control — which sentence the officer reads before Save, and that it ends with the save */
  const form = code("src/app/admin/desk/[id]/rules-form.tsx");
  ok("6b · the desk form says \"up\" only above the saved number and \"down\" only below it, says nothing outside the live bounds or on an empty box, and clears the sentence when a save lands",
    /dir\[rule\.key\] = typed === "" \|\| saved === "" \|\| outside \|\| Number\(typed\) === Number\(saved\) \? null : Number\(typed\) > Number\(saved\) \? "up" : "down";/.test(form)
      && /const outside = typed !== "" && \(\(rule\.min !== "" && Number\(typed\) < Number\(rule\.min\)\) \|\| \(rule\.max !== "" && Number\(typed\) > Number\(rule\.max\)\)\);/.test(form)
      && /markSaved\(\);\s*setChangeDir\(\{\}\);/.test(form)
      && /\{changeDir\[row\.key\] === "up" \? row\.change\.up : changeDir\[row\.key\] === "down" \? row\.change\.down : ""\}/.test(form));
  return out;
}

/* ═══ Run ═══ */
let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const disk = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

console.log("\n§1 · the helper");
for (const [name, m, want] of [
  ["true count alone", { predictorCount: 7 }, 7],
  ["true count plus the extra", { predictorCount: 3, predictorExtra: 99 }, 102],
  ["⭐ 0 exactly when the true count is 0 — an extra without a counted account is not shown", { predictorCount: 0, predictorExtra: 99 }, 0],
  ["a null extra", { predictorCount: 4, predictorExtra: null }, 4],
  ["a negative extra reads as 0", { predictorCount: 4, predictorExtra: -50 }, 4],
  ["a non-finite extra reads as 0", { predictorCount: 4, predictorExtra: Number.NaN }, 4],
  ["an infinite extra reads as 0", { predictorCount: 4, predictorExtra: Number.POSITIVE_INFINITY }, 4],
  ["a fractional extra is truncated", { predictorCount: 4, predictorExtra: 2.9 }, 6],
  ["a negative true count reads as 0", { predictorCount: -2, predictorExtra: 9 }, 0],
] as const) {
  const got = shownPredictors(m as { predictorCount: number; predictorExtra?: number | null });
  ok(`1 · ${name} → ${want}`, got === want, String(got));
}

console.log("\n§2–§6 · the split, on the tree as it is");
const baseline = checks(disk);
for (const c of baseline) ok(c.label, c.ok, c.detail);

console.log("\n§7 · CONTROLS — each census can fail");
{
  const plant = (file: string, add: string) => (rel: string) => (rel === file ? `${disk(rel)}\n${add}\n` : disk(rel));
  const fails = (read: (rel: string) => string, label: string) => checks(read).some((c) => c.label.startsWith(label) && !c.ok);
  ok("7.1 · CONTROL · a raw `.predictorCount` read planted in a player page turns 2.A red",
    fails(plant("src/app/results/page.tsx", "export const leak = (m: { predictorCount: number }) => m.predictorCount;"), "2.A ·"));
  ok("7.2 · CONTROL · the helper planted in an admin page turns 3.B red",
    fails(plant("src/app/admin/markets/page.tsx", "export const leak = shownPredictors;"), "3.B ·"));
  ok("7.3 · CONTROL · predictorExtra named in a browser module turns 4 red",
    fails(plant("src/components/markets/market-card.tsx", "export const predictorExtra = 0;"), "4 ·"));
  ok("7.4 · CONTROL · predictorExtra named outside its homes turns 5.1 red",
    fails(plant("src/lib/server/market-config.ts", "export const predictorExtra = 0;"), "5.1 ·"));
  ok("7.5 · CONTROL · a commented-out raw read is not a read (the census reads code, not prose)",
    !fails(plant("src/app/results/page.tsx", "// m.predictorCount is the true count"), "2.A ·"));
}

if (PROVE_RED) {
  console.log("\n§8 · PROVE RED — every declared plant turns its own check red, on an in-memory copy");
  for (const m of MUTATIONS) {
    let mutated: string;
    try {
      mutated = injectDefect(disk(m.file), m.from, m.to);
    } catch (e) {
      ok(`8 · ${m.name} · plant injects`, false, (e as Error).message);
      continue;
    }
    const after = checks((rel) => (rel === m.file ? mutated : disk(rel)));
    const red = after.filter((c) => !c.ok).map((c) => c.label);
    ok(`8 · ${m.name} · CAUGHT by "${m.expect}"`, red.some((l) => l.startsWith(m.expect)), red.length ? `red: ${red.join(" | ")}` : "nothing went red");
  }
} else {
  /* ⛔ The roll-call: every declared plant names a check THIS suite prints, or its proof could only ever say WRONG-ASSERTION. */
  const labels = baseline.map((c) => c.label);
  const stale = MUTATIONS.filter((m) => !labels.some((l) => l.startsWith(m.expect))).map((m) => m.name);
  ok(`8.0 · every declared plant (${MUTATIONS.length}) names a check this suite prints`, MUTATIONS.length >= 8 && stale.length === 0, stale.join(", "));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — predictor-shown: ${pass} passed, ${fail} failed`);
if (pass + fail === 0) process.exit(3);
process.exit(fail === 0 ? 0 : 1);
