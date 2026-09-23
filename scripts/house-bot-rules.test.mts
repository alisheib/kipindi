/**
 * HOUSE-BOT RULES — the pure half of house bots, proven with no database and no network.
 *
 *   npm run test:house-bot-rules
 *
 * ⛔ WHAT THIS GUARDS. `src/lib/house-bot/{clock,constants,pause-reasons,rules}.ts` are imported by
 * the rules form in the browser, the server actions, the stored-rules parser and (from commit 4) the
 * engine. One number parser, one bound table, one cross-field table and one timing function mean one
 * answer everywhere — but only while the answer is pinned. Every string an owner will read is compared
 * here, digit for digit, with the sealed text (04 N1 §5, N2 §5), so "the form says one thing and the
 * save refuses another" is a red line in this file, not a support ticket.
 *
 * ⭐ PURE, SO IT CANNOT SKIP. No `DATABASE_URL`, no Redis, no clock of its own. §13 starts two child
 * processes under foreign timezones and §14 starts `tsc` on a throwaway fixture; neither needs a
 * database, and neither is optional — a missing tool is a FAIL, never a skip.
 *
 * ⛔ EVERY SECTION HAS A PLANTED CONTROL THAT MUST FAIL. A check that can only pass is decoration.
 * Exit 1 on any failure; exit 3 when no assertion ran at all (the population trap).
 *
 * ⚠️ BINDING CORRECTIONS THIS SUITE CARRIES (critic pass on the commit-1 specs):
 * - The untargeted COUNTER keeps PLAN §12's 0:20 / 5:00 / 5:00 / 7:00. Only a TARGET's reaction waits
 *   the extra `LOCK_MARGIN_MS` (N1 §4.1, N2 §4 step 12); §10's control is that margin added back.
 * - The typecheck fixture of §14 is written at run time into a fresh temp folder. A deliberately
 *   failing file committed under `scripts/` would turn the repo-wide typecheck red.
 * - All nine sealed N2 §5 target rows, and `lastReactableStakeAt` with a 15-min and a 0-min no-react
 *   zone, each checked against an independent millisecond search.
 * - Polls with a 120-min paid exit are "never"; with 60 min they are not (the shortest poll lives
 *   120 min, `ai-poll-config.ts`). Labels refuse emoji; the 32/33 length test uses U+20000. The rolling
 *   hour counts 20 prior bets. The TZ child runs under Asia/Tokyo and America/New_York.
 * - The min-gap floor is `ceil(200 / refill)`; the old "float formula returns 101" control could never
 *   pass and is replaced by a planted `floor`.
 *
 * Sections: §0 module law · §1 C1 parse · §2 bound matrix · §3 cross-field · §4 recommended values ·
 * §5 min-gap floor · §6 C2 labels · §7 C3 typed words · §8 C15 windows · §9 scope and stored rules ·
 * §10 timing and Start · §11 constants · §12 A3 cause pairs · §13 clock · §14 F1 typecheck.
 *
 * The migrations suite proves the database half of the closed lists; the seam, caps and engine suites
 * (commits 2–4) prove the rest. This file never pretends to.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { expectDriftReport, expectDriftControl, type DeclaredMutation } from "./lib/house-bot-expect-drift.mts";
import { MUTATIONS as CEREMONY_ANCHORS } from "./anchors/house-bot-ceremony.anchors.mjs";
import { MUTATIONS as SCOPE_ANCHORS } from "./anchors/house-bot-scope.anchors.mjs";
import { consoleNeutralRegExp } from "./lib/house-bot-vocabulary.mjs";
import { BY_HAND_SCREENS, BY_HAND_SCREEN_ROUTES, consoleBotTabHref } from "../src/lib/house-bot/console-routes.ts";
import { MARKET_CATEGORIES, type MarketCategory } from "../src/lib/markets/categories.ts";
import { ALLOWED_DURATIONS } from "../src/lib/updown-durations.ts";
import {
  EAT_KEY_UNITS,
  EAT_SQL,
  EAT_SQL_BY_UNIT,
  EAT_SQL_TIMEZONE,
  eatDayKey,
  eatDayStartMs,
  eatHourKey,
  eatKeyFor,
  eatMinuteKey,
  eatMinuteOfDay,
  eatMonthKey,
  EAT_OFFSET_MS,
  eatWeekday,
  formatAfterStake,
  formatEat,
  formatMinutes,
  parseEatTime,
  windowContains,
} from "../src/lib/house-bot/clock.ts";
import {
  ALERT_KEY,
  CLAIM_TTL_SEC,
  DSAR_HOLDER_EVENT_KINDS,
  EVENT_KINDS,
  HOUSE_AUDIT,
  HOUSE_ID_PREFIX,
  LIVE_INTENT_STATUSES,
  LOCK_MARGIN_MS,
  MAX_TOLERATED_SKEW_MS,
  PRESS_AUDIT_REPAIR_AFTER_MS,
  PRESS_INTERRUPTED_AFTER_MS,
  PRESS_INTERRUPTED_COPY,
  PRESS_REFUSAL_INTERRUPTED,
  STALE_AFTER_SEC,
  SUBMIT_ID_RE,
  SWEEP_LOOKBACK_MS,
  SWEEP_MIN_AGE_MS,
  TARGET_ARMING_SEC,
  capEngineCode,
  houseIntentKey,
  isAllowedHouseAuditPayload,
  isCapCode,
  manualAnchorKey,
} from "../src/lib/house-bot/constants.ts";
import {
  CREDENTIAL_CHANGED_VIA,
  HOLDER_CAUSES,
  PASSWORD_CHANGE_METHODS,
  PAUSE_REASONS,
  PAUSE_REASON_WAY_OUT,
  REMOVE_CAUSES,
  REMOVE_CAUSE_COPY,
  canReverify,
  canStart,
  nextActions,
  type HolderCause,
  type HolderCauseCode,
} from "../src/lib/house-bot/pause-reasons.ts";
import {
  CHOOSE_FROM_LIST_COPY,
  CLEAR_EXEMPT,
  COUNT_LIMIT_FIELDS,
  CROSS_FIELD_RULES,
  DEFAULT_RULES_V1,
  ENTRY_MODES,
  ENTRY_MODE_WORDS,
  FIELD_META,
  FIELD_ORDER,
  INERT_COPY,
  LIMIT_FIELDS,
  LIMITS_TAB_HREF,
  NULLABLE_LIMIT_FIELDS,
  MAX_BOTS_LOWERING_PREVIEW,
  NO_AUTOMATIC_MODE_LINE,
  REQUIRED_FOR_MASTER_ON,
  REQUIRED_FOR_START,
  RULES_MIGRATIONS,
  SCOPE_PRODUCTS,
  START_COPY,
  TARGETS_LOWERING_PREVIEW,
  countChars,
  countInRollingWindow,
  describeWindow,
  effectiveTargetTiming,
  effectiveTiming,
  exitWindowCloseSec,
  expandWindows,
  fieldBounds,
  holdAfterStakeSec,
  labelKey,
  maxOpenerUdDelaySec,
  maxUdFillLeadSec,
  migrateRules,
  minGapFloorSec,
  normaliseLabel,
  parseHouseBotRules,
  parseWholeNumber,
  recommendedCaps,
  recommendedLimits,
  recommendedRules,
  ruleCopy,
  rulesCoverTarget,
  rulesInertReasons,
  rulesLiveBoundProblems,
  rulesReach,
  rulesStartProblems,
  targetDueAfterStakeSec,
  toWhole,
  validateField,
  validateHouseBotLimits,
  validateHouseBotRules,
  validateLabel,
  validateNote,
  validateReason,
  validateTargetInput,
  type EntryMode,
  type ExitRates,
  type FieldError,
  type FieldId,
  type HouseBotCaps,
  type HouseBotLimits,
  type HouseBotRulesV1,
  type InertReason,
  type ParseContext,
  type RulesBot,
  type RulesChain,
  type RulesContext,
  type ScopeProduct,
  type ScopeTarget,
  type TargetTimingInput,
} from "../src/lib/house-bot/rules.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const THIS = fileURLToPath(import.meta.url);
const HOUSE_DIR = join(ROOT, "src/lib/house-bot");
/**
 * Every module in the folder, read from the directory — never a hand-picked list. Until commit 3 this was
 * four names, and `bet-path.ts` (commit 2) sat beside them unchecked; a new pure module is now under the law
 * the moment it exists. §0's population check names the files the law must at least see.
 */
const MODULE_FILES = readdirSync(HOUSE_DIR).filter((f) => f.endsWith(".ts")).sort();

/* ═══ §13's child mode — a fresh process under a foreign TZ reports its EAT readings, then exits ═══ */

/**
 * The instants that straddle one EAT midnight, read through `clock.ts`, plus what a LOCAL-time
 * implementation would have said. The parent compares both across zones (§13).
 */
function clockReadings() {
  const before = Date.UTC(2026, 8, 14, 20, 59, 59, 999); // 23:59:59.999 EAT, Mon 14 Sep 2026
  const at = Date.UTC(2026, 8, 14, 21, 0, 0, 0); //          00:00:00.000 EAT, Tue 15 Sep 2026
  const local = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return {
    tzOffsetMin: new Date(Date.UTC(2026, 0, 15, 12)).getTimezoneOffset(),
    dayBefore: eatDayKey(before),
    dayAt: eatDayKey(at),
    dayStartMs: eatDayStartMs("2026-09-15"),
    hourKey: eatHourKey(Date.UTC(2026, 8, 14, 10)),
    weekdayAt: eatWeekday(at),
    minuteOfDayAt: eatMinuteOfDay(at),
    formattedAt: formatEat(at, "D MMM, HH:MM"),
    localDayBefore: local(before),
    localDayAt: local(at),
  };
}

if (process.env.HOUSE_BOT_RULES_TZ_CHILD === "1") {
  // writeSync, not process.stdout.write: a pipe write can still be pending when exit() runs.
  writeSync(1, JSON.stringify(clockReadings()));
  process.exit(0);
}

/* ═══ Harness ═══════════════════════════════════════════════════════════════════════════════ */

let pass = 0, fail = 0;
/** Every label this run emitted, so the `rules` roll-call below measures the suite instead of asserting `true`. */
const emitted: string[] = [];
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; emitted.push(l); console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const section = (title: string) => console.log(`\n${title}`);

/** Canonical JSON (sorted keys), so "exactly these fields" compares shape, not key order. */
function canon(v: unknown): string {
  if (v === undefined) return "undefined";
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, (val as Record<string, unknown>)[k]]))
      : val === Number.POSITIVE_INFINITY ? "Infinity" : val,
  );
}
const same = (a: unknown, b: unknown) => canon(a) === canon(b);

/** Thousands separators, written independently of the module's `formatWhole`. */
const fmt = (n: number) => n.toLocaleString("en-US");

/* ═══ Fixtures ══════════════════════════════════════════════════════════════════════════════ */

const RATES_5_0: ExitRates = { freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 };
const CHAINS: RulesChain[] = [
  { key: "BTC:3", label: "BTC 3-min", durationMinutes: 3 },
  { key: "BTC:10", label: "BTC 10-min", durationMinutes: 10 },
];
const LIVE_MAX = 1_000_000;

/** A server-built context, with every platform value injected as a fixture. */
function ctxWith(over: Partial<RulesContext> = {}): RulesContext {
  return {
    stakeBounds: { minTzs: 1_000, maxTzs: LIVE_MAX },
    betPlaceRefillPerMin: 10,
    chains: CHAINS,
    categories: MARKET_CATEGORIES,
    durations: ALLOWED_DURATIONS,
    exitRates: { polls: RATES_5_0, updown: { "BTC:3": RATES_5_0, "BTC:10": RATES_5_0 } },
    pollMinLifetimeMin: 120,
    limits: null,
    bots: [],
    ...over,
  };
}
const CTX = ctxWith();
const SPORTS: MarketCategory = "sports";

const rulesOf = (mut?: (r: HouseBotRulesV1) => void, ctx: RulesContext = CTX): HouseBotRulesV1 => {
  const r = structuredClone(DEFAULT_RULES_V1(ctx));
  mut?.(r);
  return r;
};
const capsOf = (over: Partial<HouseBotCaps> = {}, ctx: RulesContext = CTX): HouseBotCaps => ({ ...recommendedCaps(ctx), ...over });
const limitsOf = (over: Partial<HouseBotLimits> = {}, ctx: RulesContext = CTX): HouseBotLimits => ({ ...recommendedLimits(ctx), ...over });

/** Enter now switched on with the sealed recommended stakes, on polls with one category. */
const enterNowOn = (r: HouseBotRulesV1) => {
  r.enterNow = { enabled: true, thinStakeTzs: 10_000, openerStakeTzs: 2_000 };
  r.scope.products.polls = true;
  r.scope.categories = [SPORTS];
};

type SaveOpts = {
  rules?: (r: HouseBotRulesV1) => void;
  caps?: Partial<HouseBotCaps>;
  ctx?: RulesContext;
  prev?: { status: string; caps: HouseBotCaps; label?: string };
  label?: string;
};
function saveRules(o: SaveOpts = {}) {
  const ctx = o.ctx ?? CTX;
  return validateHouseBotRules({ rules: rulesOf(o.rules, ctx), caps: capsOf(o.caps, ctx), label: o.label }, ctx, o.prev);
}

type Refusable = { ok: true } | { ok: false; errors: FieldError[] };
const errorsOf = (res: Refusable): FieldError[] => (res.ok ? [] : res.errors);
const errOn = (res: Refusable, field: string) => errorsOf(res).find((e) => e.field === field);

/** Every cross-field rule id an assertion below has seen fire with its exact copy. */
const seenRules = new Set<string>();

function refuses(label: string, res: Refusable, field: string, rule: string, message: string, href?: string) {
  const e = errOn(res, field);
  const code = rule === "R-GAP-FLOOR" ? "BELOW_MIN" : "CROSS";
  const good = !!e && e.rule === rule && e.message === message && e.href === href && e.code === code;
  if (good) seenRules.add(rule);
  ok(label, good, e ? canon(e) : `no error on ${field}; got ${canon(errorsOf(res))}`);
}
function saves(label: string, res: Refusable) {
  ok(label, res.ok === true, canon(errorsOf(res)));
}

/* ═══ §0 · Module law — pure, type-only server imports, no class-shaped text, real citations ════ */
section("§0 · module law");
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
  const scripts = new Set(Object.keys(pkg.scripts));
  /** The citation matcher `test:guards-exist` uses: an npm-run citation, or a backticked prefixed name. */
  const CITATION = /(?:npm run\s+([a-z0-9][a-z0-9:-]*)|`((?:test|red|qa|ops|e2e|verify|migrate):[a-z0-9][a-z0-9:-]*)`)/g;
  const PLACEHOLDER = /[<>{}$]|:-|:$|-$/;
  /** A Tailwind-shaped token: `word-[…]`, `[a:b]`, `[--x`. Tailwind scans every src comment and string. */
  const CLASS_SHAPED = /\b[a-z][a-z-]*-\[[^\]\s]*\]|\[[a-z-]+:[^\]\s]+\]|\[--/;
  const IMPORT_RE = /^\s*import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/gm;
  const EXPORT_FROM_RE = /^\s*export\s+(type\s+)?(\{[^}]*\}|\*)\s+from\s+["']([^"']+)["']/gm;
  const VALUE_IMPORT_ALLOWED = new Set([
    "@/lib/eat-day",
    "@/lib/updown-durations",
    "@/lib/markets/categories",
    "@/lib/wallet-freeze-reasons",
    // Ruling 166 · the platform's one side/outcome vocabulary. Pure, and the alternative is a hand-written
    // `side === "YES" ? …` in three languages, which is the defect `side-label.ts` exists to end.
    "@/lib/side-label",
    "./clock",
    "./constants",
    "./pause-reasons",
    // C7-SPEC ruling 319 · the console's ONE route home. A sibling PURE module of this folder, under this same law
    // (no "use client", no server value import, no node import), holding the section's route, its tab keys and every
    // href built from them. `rules.ts` re-exports `LIMITS_TAB_HREF` from it and `alert-copy.ts` builds its links
    // through it, so the segment is typed in exactly one file. ⛔ Not a widening of the server-import rule: this is
    // an intra-folder specifier, the same class as `./clock` and `./constants`.
    "./console-routes",
  ]);

  /** Every import or re-export: its specifier and whether the whole statement is `type`-only. */
  const importsOf = (code: string) =>
    [...code.matchAll(IMPORT_RE), ...code.matchAll(EXPORT_FROM_RE)].map((m) => ({ typeOnly: !!m[1], spec: m[3] }));
  const badImports = (code: string) =>
    importsOf(code).filter(
      (i) => (i.spec.startsWith("@/lib/server/") && !i.typeOnly) || (!i.typeOnly && !VALUE_IMPORT_ALLOWED.has(i.spec)),
    );
  const citationsOf = (text: string) =>
    [...text.matchAll(CITATION)].map((m) => m[1] ?? m[2]).filter((n): n is string => !!n && !PLACEHOLDER.test(n));

  let importCount = 0;
  for (const f of MODULE_FILES) {
    const raw = readFileSync(join(HOUSE_DIR, f), "utf8");
    const code = decomment(raw);
    importCount += importsOf(code).length;
    ok(`0.${f} · no "use client"`, !raw.includes("use client"));
    const bad = badImports(code);
    ok(`0.${f} · server modules come in as \`import type\` only; every value import is on the allowlist`, bad.length === 0, canon(bad));
    ok(`0.${f} · no node: import and no require`, !/["']node:/.test(code) && !/\brequire\(/.test(code));
    const shaped = raw.split("\n").map((line, i) => [i + 1, line] as const).filter(([, line]) => CLASS_SHAPED.test(line));
    ok(`0.${f} · no class-shaped token in any comment or string`, shaped.length === 0, shaped.map(([n, l]) => `${n}: ${l.trim()}`).join(" | "));
    const missing = citationsOf(raw).filter((n) => !scripts.has(n));
    ok(`0.${f} · every cited npm key exists in package.json`, missing.length === 0, missing.join(", "));
  }
  ok("0.population · the import parser saw the modules' imports (≥ 8 statements)", importCount >= 8, `saw ${importCount}`);
  ok("0.population.files · the law reads the folder, and it holds at least the six known modules",
    // C5-SPEC ruling 178: the one requester rule is a module of this folder, under the same law.
    // ⛔ D20 un-built `exposure-copy.ts` (C5-5b): the R2 words have no home because there is no R2 line.
    ["bet-path.ts", "clock.ts", "consent.ts", "constants.ts", "pause-reasons.ts", "rules.ts", "stake-snapshot.ts"].every((f) => (MODULE_FILES as readonly string[]).includes(f)),
    MODULE_FILES.join(", "));

  // ⛔ CONTROLS — each check above can fail.
  ok("0.c1 · CONTROL · a planted client directive is seen", `"use ${"client"}";\nexport const x = 1;`.includes("use client"));
  ok("0.c2 · CONTROL · a planted class-shaped token is seen", CLASS_SHAPED.test(`const bar = "h-${"[3px]"} rounded";`));
  ok("0.c3 · CONTROL · a planted server VALUE import is refused",
    badImports(`import { db } from "@/lib/server/store";\n`).length === 1 && badImports(`import type { Db } from "@/lib/server/store";\n`).length === 0);
  const planted = "`" + "test:" + "house-bot-planted-missing-guard" + "`";
  ok("0.c4 · CONTROL · a planted citation of a missing npm key is reported", citationsOf(`see ${planted}`).some((n) => !scripts.has(n)));

  // C4 ruling 156 · the cases-only hook suspension is never called from product code (a production A2 kill switch).
  const SUSPEND = new RegExp(["suspend(?:ed)?InAppHolder", "Hook\\w*ForCases", String.raw`\s*\(`].join(""));
  const srcFiles = spawnSync("git", ["ls-files", "src"], { cwd: ROOT, encoding: "utf8" }).stdout.split(/\r?\n/).filter((f) => /\.(tsx?|mts|mjs|js)$/.test(f));
  const callers = srcFiles.filter((f) => {
    const code = decomment(readFileSync(join(ROOT, f), "utf8"));
    return SUSPEND.test(code.replace(/export function suspend(?:ed)?InAppHolderHook\w*ForCases\(/g, "").replace(/\bsuspendedInAppHolderHookCallsForCases\(\) \+ 1/, ""));
  });
  ok("0.8 · ⛔ ruling 156 · no file under src/ calls suspendInAppHolderHookForCases or its counter (only case files may)",
    srcFiles.length > 500 && callers.length === 0 && srcFiles.includes("src/lib/server/house-bot/holder-hook.ts"), `${srcFiles.length} files · callers: ${callers.join(", ")}`);
  ok("0.8c · CONTROL · a planted call is seen, and the declaration alone is not",
    SUSPEND.test("house.suspendInAppHolderHookForCases(true);") && SUSPEND.test("const n = HH.suspendedInAppHolderHookCallsForCases();")
      && !SUSPEND.test("export function suspendInAppHolderHookForCases(on: boolean) {".replace(/export function suspend(?:ed)?InAppHolderHook\w*ForCases\(/g, "")));
}

/* ═══ §1 · C1 — one number parser for the form and the server ═══════════════════════════════ */
section("§1 · C1 parse table");
{
  const OKS: [string, number, string][] = [
    ["TZS 10,000", 10_000, "10000"],
    ["Tsh 10 000", 10_000, "10000"],
    ["1,00,000", 100_000, "100000"],
    ["٣٠٠٠", 3_000, "3000"], // Arabic-Indic ٣٠٠٠
    ["１０００", 1_000, "1000"], // fullwidth １０００
    ["10'000", 10_000, "10000"],
    [`10${String.fromCharCode(0xa0)}000`, 10_000, "10000"], // a no-break space, as a phone keyboard pastes it
  ];
  for (const [raw, value, digits] of OKS) {
    const got = parseWholeNumber(raw);
    ok(`1.ok · ${JSON.stringify(raw)} → ${value}, keeping its digits "${digits}"`,
      got.kind === "OK" && got.value === value && String(got.value) === digits, canon(got));
  }
  const REFUSED: [string, string][] = [
    ["10,000.50", "DECIMAL"],
    ["10.000", "DECIMAL"],
    ["1.5", "DECIMAL"],
    ["-500", "NEGATIVE"],
    ["−500", "NEGATIVE"], // U+2212 minus sign
    ["2e5", "NOT_A_NUMBER"],
    ["TZS", "NOT_A_NUMBER"],
    ["", "UNSET"],
    ["  ", "UNSET"],
  ];
  for (const [raw, kind] of REFUSED) {
    const got = parseWholeNumber(raw);
    ok(`1.kind · ${JSON.stringify(raw)} → ${kind}`, got.kind === kind, canon(got));
  }
  const big = parseWholeNumber("1234567890123456");
  ok("1.big · 16 significant digits read as Infinity, so the bound check says \"At most …\"", big.kind === "OK" && big.value === Number.POSITIVE_INFINITY, canon(big));
  ok("1.toWhole · a posted number: 1.5 DECIMAL, -1 NEGATIVE, NaN NOT_A_NUMBER, null UNSET, 2^53 Infinity",
    toWhole(1.5).kind === "DECIMAL" && toWhole(-1).kind === "NEGATIVE" && toWhole(Number.NaN).kind === "NOT_A_NUMBER" &&
      toWhole(null).kind === "UNSET" && same(toWhole(2 ** 53), { kind: "OK", value: Number.POSITIVE_INFINITY }));
  // ⛔ CONTROL — the kit's numeric sanitiser strips every non-digit and saves the decimal as a million.
  const sanitised = Number("10,000.50".replace(/\D/g, ""));
  ok("1.c1 · CONTROL · a strip-non-digits sanitiser reads \"10,000.50\" as 1,000,050; the parser refuses it",
    sanitised === 1_000_050 && parseWholeNumber("10,000.50").kind === "DECIMAL");
}

/* ═══ §2 · Bound matrix — every numeric field × the edge values, at two live minimums ════════ */
section("§2 · bound matrix");
{
  const NUMERIC = FIELD_ORDER.filter((id) => FIELD_META[id].min !== null && FIELD_META[id].max !== null);
  // 60 → 59 on 2026-09-16 (C4 ruling 153): `holderNoticesPerHour` removed with the holder notices (D19c).
  // 59 → 57 on 2026-09-18 (owner ruling D20, ruling 265): the two staff-edge thresholds are un-built. MEASURED = 57.
  ok("2.0 · the matrix covers every numeric rules, caps and limits field (≥ 57)", NUMERIC.length >= 57, `saw ${NUMERIC.length}`);

  /** The copy a bound refusal must carry, written from the sealed table rather than the module. */
  const boundCopy = (id: FieldId, which: "BELOW" | "ABOVE", b: { min: number; max: number }): string => {
    const meta = FIELD_META[id];
    if (meta.unit === "TZS") {
      if (which === "ABOVE") return `At most TZS ${fmt(b.max)}.`;
      return meta.min === "LIVE_MIN" ? `At least TZS ${fmt(b.min)} — the platform minimum.` : `At least TZS ${fmt(b.min)}.`;
    }
    if (meta.min === "FLOOR" && which === "BELOW") return `Min gap is at least ${fmt(b.min)} seconds.`;
    const tail = meta.unit === "s" ? " seconds." : meta.unit === "min" ? " minutes." : ".";
    return `Between ${fmt(b.min)} and ${fmt(b.max)}${tail}`;
  };
  const expectFor = (id: FieldId, raw: string | number, b: { min: number; max: number }) => {
    const meta = FIELD_META[id];
    if (raw === "") {
      return meta.nullable ? { ok: true, value: null } : { ok: false, error: { field: id, code: "UNSET", message: "Enter a whole number." } };
    }
    let v: number;
    if (typeof raw === "number") v = Number.isSafeInteger(raw) ? raw : Number.POSITIVE_INFINITY;
    else if (raw.startsWith("-")) return { ok: false, error: { field: id, code: "NEGATIVE", message: "Must be 0 or more." } };
    else v = raw.length > 15 ? Number.POSITIVE_INFINITY : Number(raw);
    if (meta.options && !meta.options.includes(v)) {
      return { ok: false, error: { field: id, code: "INVALID", message: "Choose one of the options." } };
    }
    if (v < b.min) {
      const error = { field: id, code: "BELOW_MIN", message: boundCopy(id, "BELOW", b) };
      return { ok: false, error: meta.min === "FLOOR" ? { ...error, rule: "R-GAP-FLOOR" } : error };
    }
    if (v > b.max) return { ok: false, error: { field: id, code: "ABOVE_MAX", message: boundCopy(id, "ABOVE", b) } };
    return { ok: true, value: v };
  };

  for (const liveMin of [1_000, 500]) {
    const ctx = ctxWith({ stakeBounds: { minTzs: liveMin, maxTzs: LIVE_MAX } });
    let cells = 0;
    for (const id of NUMERIC) {
      const b = fieldBounds(id, ctx);
      if (!b) { ok(`2.${liveMin}.${id} · has bounds`, false); continue; }
      const raws: (string | number)[] = [
        "", "0", String(b.min - 1), String(b.min), String(b.max), String(b.max + 1),
        "9007199254740992", "9223372036854775808", 2 ** 53, 2 ** 63,
      ];
      const wrong: string[] = [];
      for (const raw of raws) {
        cells++;
        try {
          const got = validateField(id, raw, ctx);
          const want = expectFor(id, raw, b);
          if (!same(got, want)) wrong.push(`${JSON.stringify(raw)}: got ${canon(got)} want ${canon(want)}`);
        } catch (e) {
          wrong.push(`${JSON.stringify(raw)}: THREW ${(e as Error).message}`);
        }
      }
      ok(`2.${liveMin}.${id} · ${fmt(b.min)}–${fmt(b.max)} × 10 edge values give exactly {field, code, message}`, wrong.length === 0, wrong[0] ?? "");
    }
    ok(`2.${liveMin}.population · ${cells} cells checked`, cells === NUMERIC.length * 10);
  }

  // How each symbolic bound resolves today.
  const b = (id: FieldId) => fieldBounds(id, CTX);
  ok("2.resolve · LIVE_MIN/LIVE_MAX are the injected stake bounds", same(b("stakeMinTzs"), { min: 1_000, max: LIVE_MAX }));
  ok("2.resolve · FLOOR at refill 10 is 20 s", b("freqMinGapSec")?.min === 20);
  ok("2.resolve · the longest FILL lead is 60·60 − 92 − 20 = 3,488 s on today's durations",
    b("fill.leadUdSec")?.max === 3_488 && maxUdFillLeadSec(ALLOWED_DURATIONS) === 3_488);
  ok("2.resolve · the longest Up & Down OPENER delay is 60·20 = 1,200 s", b("opener.delayUdMaxSec")?.max === 1_200 && maxOpenerUdDelaySec(ALLOWED_DURATIONS) === 1_200);

  // ⭐ The sealed N1 §5 / N2 §5 bounds, by value (CC-16e) — a drifted row fails by name.
  const SEALED: [FieldId, number | "LIVE_MIN", number | "LIVE_MAX"][] = [
    ["enterNow.thinStakeTzs", "LIVE_MIN", "LIVE_MAX"],
    ["enterNow.openerStakeTzs", "LIVE_MIN", "LIVE_MAX"],
    ["capStaffChosenPerDay", 1, 50],
    ["capStaffChosenDailyTzs", 0, 1_000_000_000],
    ["targetsMaxActive", 1, 50],
    ["gCapStaffChosenPerDay", 1, 200],
    ["gCapStaffChosenDailyTzs", 0, 1_000_000_000],
    ["gTargetsMaxActive", 1, 200],
    ["gStaffChosenMaxCounterpartyShare", 10, 100],
    ["gCounterPerPlayerPerDay", 1, 1_440],
    ["counter.delayMinSec", 5, 600],
    ["counter.delayMaxSec", 5, 600],
  ];
  for (const [id, min, max] of SEALED) {
    const meta = FIELD_META[id];
    ok(`2.sealed · ${id} is ${min}–${max}, not set = NULL`, meta.min === min && meta.max === max && (meta.nullable || id.startsWith("counter.")), `min ${meta.min} max ${meta.max}`);
  }
  const msg = (id: FieldId, raw: string) => {
    const r = validateField(id, raw, CTX);
    return r.ok ? `ok:${r.value}` : r.error.message;
  };
  const SEALED_COPY: [FieldId, string, string][] = [
    ["capStaffChosenPerDay", "51", "Between 1 and 50."],
    ["capStaffChosenDailyTzs", "1000000001", "At most TZS 1,000,000,000."],
    ["capStaffChosenDailyTzs", "0", "ok:0"],
    ["targetsMaxActive", "51", "Between 1 and 50."],
    ["gCapStaffChosenPerDay", "201", "Between 1 and 200."],
    ["gCapStaffChosenDailyTzs", "1000000001", "At most TZS 1,000,000,000."],
    ["gTargetsMaxActive", "201", "Between 1 and 200."],
    ["gStaffChosenMaxCounterpartyShare", "9", "Between 10 and 100."],
    ["enterNow.openerStakeTzs", "999", "At least TZS 1,000 — the platform minimum."],
    ["gCounterPerPlayerPerDay", "1441", "Between 1 and 1,440."],
  ];
  for (const [id, raw, want] of SEALED_COPY) ok(`2.copy · ${id} "${raw}" → ${want}`, msg(id, raw) === want, msg(id, raw));

  // F5: a live minimum of 500 lets a stake minimum of 500 save.
  const at500 = ctxWith({ stakeBounds: { minTzs: 500, maxTzs: LIVE_MAX } });
  saves("2.F5 · at a live minimum of 500, Stake min 500 saves", saveRules({ ctx: at500, caps: { stakeMinTzs: 500 } }));
  ok("2.F5 · …and at 1,000 the same value is refused with the platform-minimum copy",
    errOn(saveRules({ caps: { stakeMinTzs: 500 } }), "stakeMinTzs")?.message === "At least TZS 1,000 — the platform minimum.");

  // The exemption and requirement groups (N1 §5, MON-14).
  ok("2.groups · CLEAR_EXEMPT is exactly the sealed seven",
    same([...CLEAR_EXEMPT].sort(), ["capStaffChosenDailyTzs", "capStaffChosenPerDay", "gCapStaffChosenDailyTzs", "gCapStaffChosenPerDay", "gStaffChosenMaxCounterpartyShare", "gTargetsMaxActive", "targetsMaxActive"]));
  const staff = ["capStaffChosenPerDay", "capStaffChosenDailyTzs", "targetsMaxActive"];
  ok("2.groups · Start never requires a staff-chosen cap or the target maximum", !REQUIRED_FOR_START.some((f) => staff.includes(f)) && REQUIRED_FOR_START.length === 11);
  ok("2.groups · Master ON never requires a staff-chosen limit, the target maximum or a staff-edge threshold",
    !(REQUIRED_FOR_MASTER_ON as readonly string[]).some((f) => /StaffChosen|TargetsMaxActive|StaffEdge/.test(f)) && REQUIRED_FOR_MASTER_ON.length === 8);

  // ⛔ OWNER RULING D20 (2026-09-17), ruling 265 · the staff-edge thresholds are UN-BUILT: a writer with no reader is a
  // control that lies. No limit list, no meta row and no exemption may name one again.
  // ⛔ THE POPULATION IS EVERY LIST A RE-ADD WOULD TOUCH, not only FIELD_META's own rows: `saveLimits` writes what
  // LIMIT_FIELDS names (`assertWritable` / `patchSets`), and NULLABLE_LIMIT_FIELDS is where a nullable threshold would
  // land — a guard blind to those two would stay green while the column came back (C5-5b review, test-strength-02).
  const isStaffEdge = (f: string) => /staffedge/i.test(f.replace(/[^A-Za-z]/g, ""));
  const limitIds = FIELD_ORDER.filter((id) => FIELD_META[id].group === "limits");
  const limitLists = [...LIMIT_FIELDS, ...NULLABLE_LIMIT_FIELDS, ...COUNT_LIMIT_FIELDS] as readonly string[];
  const staffEdgeNames = [...limitIds, ...Object.keys(FIELD_META), ...CLEAR_EXEMPT, ...limitLists].filter(isStaffEdge);
  ok("2.d20 · ⛔ D20 · no limits field, no meta row, no clear-exemption and no writable limit list (LIMIT_FIELDS, NULLABLE_LIMIT_FIELDS, COUNT_LIMIT_FIELDS) names a staff edge; the limits tab and the writable list are the SAME sealed 14, and the nullable 12 plus the two counts are exactly them",
    staffEdgeNames.length === 0 && limitIds.length === 14 && LIMIT_FIELDS.length === 14 && NULLABLE_LIMIT_FIELDS.length === 12 && COUNT_LIMIT_FIELDS.length === 2
      && same([...limitIds].sort(), [...LIMIT_FIELDS].sort()) && same([...LIMIT_FIELDS].sort(), [...NULLABLE_LIMIT_FIELDS, ...COUNT_LIMIT_FIELDS].sort())
      && !("gStaffEdgeWinRatePts" in FIELD_META) && !("gStaffEdgeNetTzs" in FIELD_META),
    `${limitIds.length} limits · ${LIMIT_FIELDS.length} writable · ${staffEdgeNames.join(", ")}`);
  // The control's arms are SYNTHETIC on purpose: it measures the detector, never the population 2.d20 measures, so a
  // re-added threshold reddens 2.d20 alone and this case still says whether the measure can see one.
  const cleanList = ["gCapDailyStakeTzs", "gCapStaffChosenPerDay", "gStaffChosenMaxCounterpartyShare", "gTargetsMaxActive", "maxDesignatedBots"];
  ok("2.d20c · CONTROL · 2.d20's OWN measure reports a planted threshold in a clean list, in either spelling, and reports none of the sealed staff-chosen fields",
    [...cleanList, "gStaffEdgeWinRatePts"].filter(isStaffEdge).length === 1 && [...cleanList, "staff_edge_net"].filter(isStaffEdge).length === 1
      && cleanList.filter(isStaffEdge).length === 0);

  // ⛔ CONTROL — "not set" coerced to 0 is the C1 defect: Number("") is 0, the validator's value is null.
  const unset = validateField("capPerMarketTzs", "", CTX);
  ok("2.c1 · CONTROL · Number(\"\") is 0, while an empty cap validates to null (not set)", Number("") === 0 && unset.ok && unset.value === null);
}

/* ═══ §3 · Cross-field rules — every row violated and satisfied, with its exact copy ══════════ */
section("§3 · cross-field rules — the rules form");
{
  saves("3.0 · the baseline (a new bot's rules + recommended caps) saves", saveRules());

  refuses("3.R-STAKE-ORDER · min above max is refused on Stake min",
    saveRules({ caps: { stakeMinTzs: 20_000, stakeMaxTzs: 10_000 } }), "stakeMinTzs", "R-STAKE-ORDER", "Minimum stake can't be above maximum stake.");
  saves("3.R-STAKE-ORDER · min = max saves", saveRules({ caps: { stakeMinTzs: 10_000, stakeMaxTzs: 10_000 } }));

  refuses("3.R-PM-GE-STAKE · a per-market cap below the max stake is refused",
    saveRules({ caps: { stakeMaxTzs: 30_000 } }), "capPerMarketTzs", "R-PM-GE-STAKE", "Per-market cap must be at least the maximum stake.");
  saves("3.R-PM-GE-STAKE · per-market cap = max stake saves", saveRules({ caps: { stakeMaxTzs: 20_000 } }));

  refuses("3.R-DAY-GE-PM · a daily stake cap below the per-market cap is refused",
    saveRules({ caps: { capDailyStakeTzs: 15_000 } }), "capDailyStakeTzs", "R-DAY-GE-PM", "Daily stake cap must be at least the per-market cap.");
  saves("3.R-DAY-GE-PM · equal caps save",
    saveRules({ caps: { capDailyStakeTzs: 20_000, capDailyLossTzs: 20_000, capStaffChosenDailyTzs: 20_000 } }));

  refuses("3.R-LOSS-LE-DAY · a daily loss cap above the daily stake cap is refused",
    saveRules({ caps: { capDailyLossTzs: 250_000 } }), "capDailyLossTzs", "R-LOSS-LE-DAY", "Daily loss cap can't exceed daily stake cap.");
  saves("3.R-LOSS-LE-DAY · loss = daily stake saves", saveRules({ caps: { capDailyLossTzs: 200_000 } }));

  refuses("3.R-EXP-GE-PM · an exposure cap below the per-market cap is refused",
    saveRules({ caps: { capOpenExposureTzs: 15_000 } }), "capOpenExposureTzs", "R-EXP-GE-PM", "Open exposure cap must be at least the per-market cap.");
  saves("3.R-EXP-GE-PM · exposure = per-market saves", saveRules({ caps: { capOpenExposureTzs: 20_000 } }));

  refuses("3.R-HOUR-FITS-GAP · 20 an hour at 600 s apart is refused with the fitted count",
    saveRules({ caps: { freqMinGapSec: 600, freqMaxPerHour: 20 } }), "freqMaxPerHour", "R-HOUR-FITS-GAP", "At 600 s apart this bot can place at most 6 bets an hour.");
  saves("3.R-HOUR-FITS-GAP · 6 an hour at 600 s saves", saveRules({ caps: { freqMinGapSec: 600, freqMaxPerHour: 6 } }));

  refuses("3.R-DAY-GE-HOUR · bets per day below bets per hour is refused",
    saveRules({ caps: { freqMaxPerDay: 10 } }), "freqMaxPerDay", "R-DAY-GE-HOUR", "Bets per day must be at least bets per hour.");
  saves("3.R-DAY-GE-HOUR · per day = per hour saves", saveRules({ caps: { freqMaxPerDay: 20 } }));

  refuses("3.R-POOL-BAND · a pool minimum above the maximum is refused on the maximum",
    saveRules({ rules: (r) => { r.scope.poolTotalMinTzs = 5_000; r.scope.poolTotalMaxTzs = 1_000; } }),
    "scope.poolTotalMaxTzs", "R-POOL-BAND", "Pool minimum can't be above pool maximum.");
  saves("3.R-POOL-BAND · an equal band saves", saveRules({ rules: (r) => { r.scope.poolTotalMinTzs = 5_000; r.scope.poolTotalMaxTzs = 5_000; } }));

  /* 3.R-COUNTER-POOL-MAX-ZERO · PRODUCTION 2026-09-23. The live account had `poolTotalMaxTzs = 0` saved with
     every COUNTER on, and `decide.ts:383` refuses POOL_BAND whenever `total > max`. A COUNTER only ever answers
     a stake already IN the pool, so the total is never 0 and every counter was refused, on every market, for
     ever. ⭐ THE TWO `saves` ROWS ARE THE DISCRIMINATORS: an EMPTY maximum (the field's own default) means no
     ceiling and must keep saving, and a 0 with every counter OFF is merely inert, not contradictory. */
  refuses("3.R-COUNTER-POOL-MAX-ZERO · ⭐ a pool maximum of 0 with a counter on is refused — it can never be satisfied",
    saveRules({ rules: (r) => { r.scope.poolTotalMinTzs = 0; r.scope.poolTotalMaxTzs = 0; r.modes.updown.counter = true; } }),
    "scope.poolTotalMaxTzs", "R-COUNTER-POOL-MAX-ZERO",
    "A pool maximum of 0 stops every counter: a counter answers a stake that is already in the pool, so the total is never 0. Leave it empty for no maximum.");
  saves("3.R-COUNTER-POOL-MAX-ZERO · ⭐ DISCRIMINATES · an EMPTY maximum is no ceiling at all, and saves with a counter on",
    saveRules({ rules: (r) => {
      r.scope.products.updown = true; r.scope.chains = ["BTC:3"]; r.modes.updown.counter = true;
      r.scope.poolTotalMinTzs = 0; r.scope.poolTotalMaxTzs = null;
    } }));
  saves("3.R-COUNTER-POOL-MAX-ZERO · ⭐ DISCRIMINATES · a 0 maximum with NO counter anywhere is not a contradiction and saves",
    saveRules({ rules: (r) => {
      r.scope.products.updown = true; r.scope.chains = ["BTC:3"]; r.modes.updown.fill = true;
      r.modes.updown.counter = false; r.modes.polls.counter = false;
      r.scope.poolTotalMinTzs = 0; r.scope.poolTotalMaxTzs = 0;
    } }));

  refuses("3.N2-b · a COUNTER minimum delay above the maximum is refused",
    saveRules({ rules: (r) => { r.counter.delayMinSec = 50; r.counter.delayMaxSec = 45; } }),
    "counter.delayMinSec", "N2-b", "Minimum delay can't be above maximum delay.");
  saves("3.N2-b · COUNTER min = max is valid", saveRules({ rules: (r) => { r.counter.delayMinSec = 45; r.counter.delayMaxSec = 45; } }));

  refuses("3.R-TRIGGER-RANGE · a trigger minimum above its maximum is refused",
    saveRules({ rules: (r) => { r.counter.triggerStakeMinTzs = 300_000; r.counter.triggerStakeMaxTzs = 200_000; } }),
    "counter.triggerStakeMinTzs", "R-TRIGGER-RANGE", "Trigger stake minimum can't be above its maximum.");
  saves("3.R-TRIGGER-RANGE · an equal range saves", saveRules({ rules: (r) => { r.counter.triggerStakeMinTzs = 200_000; } }));

  {
    const res = saveRules({ rules: (r) => {
      r.opener.delayUdMinSec = 100; r.opener.delayUdMaxSec = 90;
      r.opener.delayPollsMinMin = 40; r.opener.delayPollsMaxMin = 30;
      r.opener.stakeMinTzs = 6_000; r.opener.stakeMaxTzs = 5_000;
    } });
    for (const field of ["opener.delayUdMinSec", "opener.delayPollsMinMin", "opener.stakeMinTzs"]) {
      refuses(`3.R-OPENER-ORDER · ${field} above its maximum is refused on the minimum`, res, field, "R-OPENER-ORDER", "Minimum can't be above maximum.");
    }
    saves("3.R-OPENER-ORDER · equal pairs save", saveRules({ rules: (r) => {
      r.opener.delayUdMinSec = 90; r.opener.delayPollsMinMin = 30; r.opener.stakeMinTzs = 5_000;
    } }));
  }

  /* ⚠️ Since the scope rows (2026-09-22) a mode is on WITH its product and one member, or the save refuses the mode itself. */
  const udFillOn = (r: HouseBotRulesV1) => { r.scope.products.updown = true; r.scope.chains = ["BTC:3"]; r.modes.updown.fill = true; };
  const pollsFillOn = (r: HouseBotRulesV1) => { r.scope.products.polls = true; r.scope.categories = [SPORTS]; r.modes.polls.fill = true; };
  refuses("3.R-FILL-LEAD-UD · an Up & Down FILL lead under min time to cutoff + jitter is refused",
    saveRules({ rules: (r) => { udFillOn(r); r.fill.leadUdSec = 25; } }),
    "fill.leadUdSec", "R-FILL-LEAD-UD", "FILL lead must be at least min time to cutoff plus jitter (30 s).");
  saves("3.R-FILL-LEAD-UD · exactly 30 s saves", saveRules({ rules: (r) => { udFillOn(r); r.fill.leadUdSec = 30; } }));

  refuses("3.R-FILL-LEAD-POLLS · a polls FILL lead of 6 min (360 s < 370 s) is refused",
    saveRules({ rules: (r) => { pollsFillOn(r); r.fill.leadPollsMin = 6; } }),
    "fill.leadPollsMin", "R-FILL-LEAD-POLLS", "FILL lead must be more than min time to cutoff plus jitter.");
  saves("3.R-FILL-LEAD-POLLS · 7 min saves", saveRules({ rules: (r) => { pollsFillOn(r); r.fill.leadPollsMin = 7; } }));

  /* ⛔ THE TWO SCOPE ROWS (prod finding 2026-09-22): a ticked product with no member on its list, and a mode on for a
   * product that is off. Both are evaluated through the same function Start's inert reasons are built on. */
  refuses("3.R-PRODUCT-LIST · Polls ticked with no category is refused on the category list, naming the remedy",
    saveRules({ rules: (r) => { r.scope.products.polls = true; r.modes.polls.counter = true; } }),
    "scope.categories", "R-PRODUCT-LIST", "Choose at least one poll category, or turn Polls off.");
  refuses("3.R-PRODUCT-LIST · Up & Down ticked with no chain is refused on the chain list",
    saveRules({ rules: (r) => { r.scope.products.updown = true; r.modes.updown.counter = true; } }),
    "scope.chains", "R-PRODUCT-LIST", "Choose at least one chain, or turn Up & Down off.");
  {
    const both = saveRules({ rules: (r) => { r.scope.products = { updown: true, polls: true }; r.modes.updown.counter = true; r.modes.polls.counter = true; } });
    ok("3.R-PRODUCT-LIST · ⛔ THE PRODUCTION SHAPE (both ticked, both lists empty) is refused once per list and on NEITHER product switch",
      !both.ok && errOn(both, "scope.chains")?.rule === "R-PRODUCT-LIST" && errOn(both, "scope.categories")?.rule === "R-PRODUCT-LIST"
        && !errOn(both, "scope.products.updown") && !errOn(both, "scope.products.polls") && errorsOf(both).length === 2, canon(errorsOf(both)));
    const stale = saveRules({ rules: (r) => { r.scope.products.polls = true; r.modes.polls.counter = true; r.scope.categories = ["astrology" as MarketCategory]; } });
    ok("3.R-PRODUCT-LIST · a member the platform does not have is the list's own refusal (\"Choose from the list.\"), and the row does not add a second sentence to that field",
      !stale.ok && errOn(stale, "scope.categories")?.message === CHOOSE_FROM_LIST_COPY && errorsOf(stale).filter((e) => e.field === "scope.categories").length === 1, canon(errorsOf(stale)));
  }
  saves("3.R-PRODUCT-LIST · one member on each list saves",
    saveRules({ rules: (r) => { r.scope.products = { updown: true, polls: true }; r.scope.chains = ["BTC:3"]; r.scope.categories = [SPORTS]; r.modes.updown.counter = true; r.modes.polls.counter = true; } }));
  saves("3.R-PRODUCT-LIST · an empty list under a product that is OFF is the default document, and it still saves", saveRules());
  refuses("3.R-MODE-PRODUCT · a polls mode on with Polls off is refused on that mode, in the console's words for it",
    saveRules({ rules: (r) => { r.modes.polls.counter = true; } }),
    "modes.polls.counter", "R-MODE-PRODUCT", "React to a player's stake is on for polls, but Polls is off. Turn Polls on, or turn this off.");
  refuses("3.R-MODE-PRODUCT · an Up & Down mode on with Up & Down off — the fill, on its own field",
    saveRules({ rules: (r) => { r.modes.updown.fill = true; } }),
    "modes.updown.fill", "R-MODE-PRODUCT", "Fill a thin side is on for Up & Down, but Up & Down is off. Turn Up & Down on, or turn this off.");
  {
    const three = saveRules({ rules: (r) => { r.modes.polls = { counter: true, fill: true, opener: true }; } });
    ok("3.R-MODE-PRODUCT · three orphan modes are three refusals, one on each mode field, and none on the product switch",
      !three.ok && (["modes.polls.counter", "modes.polls.fill", "modes.polls.opener"] as const).every((f) => errOn(three, f)?.rule === "R-MODE-PRODUCT")
        && !errOn(three, "scope.products.polls") && errorsOf(three).length === 3, canon(errorsOf(three)));
  }
  saves("3.R-MODE-PRODUCT · the same mode with its product on and a member chosen saves",
    saveRules({ rules: (r) => { r.scope.products.polls = true; r.scope.categories = [SPORTS]; r.modes.polls.counter = true; } }));

  // Against a SET global (04 C6): raising a bot above it is refused here; lowering the global is §3's limits half.
  // C7-SPEC rulings 319, 320, 452 · the console ships at `/admin/desk` and the segment is typed in ONE file, so this
  // pins the re-export's value rather than a second spelling of it. ⛔ Re-anchored to the SAME defect (a relative or
  // drifted limits href), never relaxed: it still compares the whole string, digit for digit.
  ok("3.href · the limits href is absolute and is the console's own route", LIMITS_TAB_HREF === "/admin/desk?tab=limits");
  refuses("3.R-SMAX-LE-GPM · a max stake above the global per-market limit is refused, linking to Limits",
    saveRules({ ctx: ctxWith({ limits: limitsOf({ gCapPerMarketTzs: 5_000 }) }) }),
    "stakeMaxTzs", "R-SMAX-LE-GPM", "Max stake TZS 10,000 is above the global per-market limit TZS 5,000.", LIMITS_TAB_HREF);
  saves("3.R-SMAX-LE-GPM · equal to the global saves", saveRules({ ctx: ctxWith({ limits: limitsOf({ gCapPerMarketTzs: 10_000 }) }) }));
  saves("3.R-SMAX-LE-GPM · a global that is not set compares with nothing", saveRules({ ctx: ctxWith({ limits: limitsOf({ gCapPerMarketTzs: null }) }) }));

  refuses("3.R-PM-LE-GEXP · a per-market cap above the global exposure limit is refused, linking to Limits",
    saveRules({ ctx: ctxWith({ limits: limitsOf({ gCapOpenExposureTzs: 15_000 }) }) }),
    "capPerMarketTzs", "R-PM-LE-GEXP", "Per-market cap TZS 20,000 is above the global open exposure limit TZS 15,000.", LIMITS_TAB_HREF);
  saves("3.R-PM-LE-GEXP · equal to the global saves", saveRules({ ctx: ctxWith({ limits: limitsOf({ gCapOpenExposureTzs: 20_000 }) }) }));

  // N1-a — Enter now needs both stakes, both staff-chosen caps, polls and a category (sealed N1 §5).
  refuses("3.N1-a · Enter now without a thin stake names that field",
    saveRules({ rules: (r) => { enterNowOn(r); r.enterNow.thinStakeTzs = null; } }),
    "enterNow.thinStakeTzs", "N1-a", "Set Enter now thin stake to use Enter now.");
  refuses("3.N1-a · …without an opener stake",
    saveRules({ rules: (r) => { enterNowOn(r); r.enterNow.openerStakeTzs = null; } }),
    "enterNow.openerStakeTzs", "N1-a", "Set Enter now opener stake to use Enter now.");
  refuses("3.N1-a · …without staff-chosen stakes per day",
    saveRules({ rules: enterNowOn, caps: { capStaffChosenPerDay: null } }),
    "capStaffChosenPerDay", "N1-a", "Set Staff-chosen stakes per day to use Enter now.");
  refuses("3.N1-a · …without the staff-chosen daily cap",
    saveRules({ rules: enterNowOn, caps: { capStaffChosenDailyTzs: null } }),
    "capStaffChosenDailyTzs", "N1-a", "Set Staff-chosen daily cap to use Enter now.");
  refuses("3.N1-a · …with polls off",
    saveRules({ rules: (r) => { enterNowOn(r); r.scope.products.polls = false; } }),
    "scope.products.polls", "N1-a", "Enter now is for polls: turn on polls and choose at least one category.");
  refuses("3.N1-a · …with polls on but no category",
    saveRules({ rules: (r) => { enterNowOn(r); r.scope.categories = []; } }),
    "scope.products.polls", "N1-a", "Enter now is for polls: turn on polls and choose at least one category.");
  saves("3.N1-a · everything set saves", saveRules({ rules: enterNowOn }));

  // N1-b — both halves, with the figure.
  refuses("3.N1-b · a staff-chosen daily cap above the daily stake cap is refused",
    saveRules({ caps: { capStaffChosenDailyTzs: 250_000 } }),
    "capStaffChosenDailyTzs", "N1-b", "Staff-chosen daily cap can't exceed the daily stake cap.");
  saves("3.N1-b · equal to the daily stake cap saves", saveRules({ caps: { capStaffChosenDailyTzs: 200_000 } }));
  refuses("3.N1-b · while Enter now is on, a cap below the larger Enter now stake is refused with TZS {x}",
    saveRules({ rules: enterNowOn, caps: { capStaffChosenDailyTzs: 5_000 } }),
    "capStaffChosenDailyTzs", "N1-b", "Staff-chosen daily cap must be at least the Enter now stakes (TZS 10,000).");
  saves("3.N1-b · a cap equal to the larger stake saves", saveRules({ rules: enterNowOn, caps: { capStaffChosenDailyTzs: 10_000 } }));
  saves("3.N1-b · with Enter now off, the same small cap saves", saveRules({ caps: { capStaffChosenDailyTzs: 5_000 } }));

  // N1-c — the rules-form comparisons with a SET global (the limits-form comparison is below).
  refuses("3.N1-c · staff-chosen stakes per day above the global is refused",
    saveRules({ ctx: ctxWith({ limits: limitsOf({ gCapStaffChosenPerDay: 2 }) }) }),
    "capStaffChosenPerDay", "N1-c", "Staff-chosen stakes per day 3 is above the global limit 2.");
  refuses("3.N1-c · the per-bot staff-chosen TZS cap above the global is refused",
    saveRules({ ctx: ctxWith({ limits: limitsOf({ gCapStaffChosenDailyTzs: 20_000 }) }) }),
    "capStaffChosenDailyTzs", "N1-c", "Per-bot staff-chosen cap TZS 30,000 is above the global staff-chosen cap TZS 20,000.");
  {
    const res = saveRules({ ctx: ctxWith({ limits: limitsOf({ gTargetsMaxActive: 5 }) }), caps: { targetsMaxActive: 6 } });
    refuses("3.N1-c · max active targets above the global is refused — reported as N1-c, the first rule to reach the field",
      res, "targetsMaxActive", "N1-c", "Max active targets 6 is above the global limit 5.");
    ok("3.N1-c · …with exactly one error on that field (N2-c restates it and does not add a second)",
      errorsOf(res).filter((e) => e.field === "targetsMaxActive").length === 1, canon(errorsOf(res)));
    const n2c = CROSS_FIELD_RULES.find((r) => r.id === "N2-c");
    const same2c = ruleCopy("N2-c", 0, { x: "6", g: "5" }) === "Max active targets 6 is above the global limit 5." && n2c?.reportOn === "targetsMaxActive";
    if (same2c) seenRules.add("N2-c");
    ok("3.N2-c · N2-c carries the sealed copy on targetsMaxActive, word for word the same as N1-c's", same2c);
    ok("3.N2-c · the lowering preview is the sealed sentence",
      TARGETS_LOWERING_PREVIEW(7, 5) === "7 targets are active. With a limit of 5, no target can be added until 2 are removed. No target is ended.");
  }
  saves("3.N1-c · every per-bot value equal to its global saves",
    saveRules({ ctx: ctxWith({ limits: limitsOf({ gCapStaffChosenPerDay: 3, gCapStaffChosenDailyTzs: 30_000, gTargetsMaxActive: 6 }) }), caps: { targetsMaxActive: 6 } }));
  saves("3.N1-c · a global that is not set compares with nothing",
    saveRules({ ctx: ctxWith({ limits: limitsOf({ gTargetsMaxActive: null }) }), caps: { targetsMaxActive: 50 } }));

  refuses("3.N1-d · staff-chosen stakes per day above bets per day is refused with {n}",
    saveRules({ caps: { capStaffChosenPerDay: 30, freqMaxPerDay: 20 } }),
    "capStaffChosenPerDay", "N1-d", "Can't exceed bets per day (20).");
  saves("3.N1-d · equal saves", saveRules({ caps: { capStaffChosenPerDay: 20, freqMaxPerDay: 20 } }));

  {
    const res = saveRules({ rules: (r) => { enterNowOn(r); r.enterNow.thinStakeTzs = 20_000; r.enterNow.openerStakeTzs = 20_000; } });
    for (const field of ["enterNow.thinStakeTzs", "enterNow.openerStakeTzs"]) {
      refuses(`3.N1-e · ${field} above the bot's stake max is refused with the bot's bounds`, res, field, "N1-e",
        "Enter now stake must be between Bot A's stake min TZS 1,000 and max TZS 10,000.");
    }
    refuses("3.N1-e · the copy names the bot's own label",
      saveRules({ label: "Desk 2", rules: (r) => { enterNowOn(r); r.enterNow.thinStakeTzs = 20_000; } }),
      "enterNow.thinStakeTzs", "N1-e", "Enter now stake must be between Desk 2's stake min TZS 1,000 and max TZS 10,000.");
    saves("3.N1-e · stakes on the bot's bounds save",
      saveRules({ rules: (r) => { enterNowOn(r); r.enterNow.thinStakeTzs = 10_000; r.enterNow.openerStakeTzs = 1_000; } }));
  }

  // N2-a — targets need polls, a category, the counter amount and range, the target maximum and the staff caps.
  const targetsOn = (r: HouseBotRulesV1) => { r.targeting.enabled = true; r.scope.products.polls = true; r.scope.categories = [SPORTS]; };
  refuses("3.N2-a · targets with polls off are refused on the products field",
    saveRules({ rules: (r) => { targetsOn(r); r.scope.products.polls = false; }, caps: { targetsMaxActive: 5 } }),
    "scope.products.polls", "N2-a", "Targets are for polls: turn on polls and choose at least one category.");
  refuses("3.N2-a · targets without a target maximum",
    saveRules({ rules: targetsOn }), "targetsMaxActive", "N2-a", "Set Max active targets to use targets.");
  refuses("3.N2-a · targets without staff-chosen stakes per day",
    saveRules({ rules: targetsOn, caps: { targetsMaxActive: 5, capStaffChosenPerDay: null } }),
    "capStaffChosenPerDay", "N2-a", "Set the staff-chosen limits to use targets.");
  refuses("3.N2-a · targets without the staff-chosen daily cap",
    saveRules({ rules: targetsOn, caps: { targetsMaxActive: 5, capStaffChosenDailyTzs: null } }),
    "capStaffChosenDailyTzs", "N2-a", "Set the staff-chosen limits to use targets.");
  saves("3.N2-a · everything set saves", saveRules({ rules: targetsOn, caps: { targetsMaxActive: 5 } }));
  {
    const res = saveRules({ rules: (r) => { targetsOn(r); r.counter.amount = { kind: "FIXED", fixedTzs: undefined as unknown as number }; }, caps: { targetsMaxActive: 5 } });
    ok("3.N2-a · a FIXED counter amount left empty is refused on that field (its own \"Enter a whole number.\")",
      errOn(res, "counter.amount.fixedTzs")?.code === "UNSET", canon(errorsOf(res)));
    ok("3.N2-a · the counter-amount copy is the sealed sentence",
      ruleCopy("N2-a", 0) === "Targets use the Counter amount and trigger range — set them.");
  }

  // X-CLEAR-ACTIVE — a running bot's required cap cannot be cleared; the exempt ones can (MON-14).
  const running = { status: "ACTIVE", caps: capsOf({ targetsMaxActive: 5 }) };
  refuses("3.X-CLEAR-ACTIVE · clearing the per-market cap of a running bot is refused",
    saveRules({ prev: running, caps: { targetsMaxActive: 5, capPerMarketTzs: null } }),
    "capPerMarketTzs", "X-CLEAR-ACTIVE", "Bot A is running — pause it before clearing Per-market cap.");
  refuses("3.X-CLEAR-ACTIVE · the copy names the bot's label",
    saveRules({ prev: { ...running, label: "Desk 2" }, caps: { targetsMaxActive: 5, capPerMarketTzs: null } }),
    "capPerMarketTzs", "X-CLEAR-ACTIVE", "Desk 2 is running — pause it before clearing Per-market cap.");
  saves("3.X-CLEAR-ACTIVE · the same clear on a PAUSED bot saves",
    saveRules({ prev: { ...running, status: "PAUSED" }, caps: { targetsMaxActive: 5, capPerMarketTzs: null } }));
  saves("3.X-CLEAR-ACTIVE · clearing both staff-chosen caps and the target maximum of a running bot saves (CLEAR_EXEMPT)",
    saveRules({ prev: running, caps: { capStaffChosenPerDay: null, capStaffChosenDailyTzs: null, targetsMaxActive: null } }));

  // ⛔ CONTROLS — exact copy and the reporting field are both load-bearing.
  const stakeOrder = saveRules({ caps: { stakeMinTzs: 20_000, stakeMaxTzs: 10_000 } });
  ok("3.c1 · CONTROL · the refusal is not on the other field of the pair", !errOn(stakeOrder, "stakeMaxTzs"));
  ok("3.c2 · CONTROL · a message one character short does not match", errOn(stakeOrder, "stakeMinTzs")?.message !== "Minimum stake can't be above maximum stake");
}

section("§3 · cross-field rules — the limits form, conflicts and clearing");
{
  const saveLimits = (over: Partial<HouseBotLimits> = {}, ctx: RulesContext = CTX, prev?: { masterOn: boolean; limits: HouseBotLimits }) =>
    validateHouseBotLimits(limitsOf(over, ctx), ctx, prev);

  saves("3.L0 · the recommended limits save", saveLimits());
  refuses("3.L-LOSS-LE-DAY · a global daily loss above the global daily stake is refused",
    saveLimits({ gCapDailyLossTzs: 600_000 }), "gCapDailyLossTzs", "L-LOSS-LE-DAY", "Daily loss can't exceed daily stake.");
  saves("3.L-LOSS-LE-DAY · equal saves", saveLimits({ gCapDailyLossTzs: 500_000 }));
  refuses("3.N1-c · (limits) the staff-chosen daily limit above the global daily stake limit is refused",
    saveLimits({ gCapStaffChosenDailyTzs: 600_000 }), "gCapStaffChosenDailyTzs", "N1-c", "Staff-chosen daily limit can't exceed the global daily stake limit.");
  saves("3.N1-c · (limits) equal saves", saveLimits({ gCapStaffChosenDailyTzs: 500_000 }));
  refuses("3.L-DAY-GE-MIN · bets per day below bets per minute is refused",
    saveLimits({ gMaxBetsPerMinute: 6, gMaxBetsPerDay: 5 }), "gMaxBetsPerDay", "L-DAY-GE-MIN", "Bets per day must be at least bets per minute.");
  saves("3.L-DAY-GE-MIN · equal saves", saveLimits({ gMaxBetsPerMinute: 6, gMaxBetsPerDay: 6 }));
  refuses("3.L-CPP-LE-DAY · counters per player above bets per day is refused",
    saveLimits({ gMaxBetsPerMinute: 1, gMaxBetsPerDay: 2, gCounterPerPlayerPerDay: 3 }),
    "gCounterPerPlayerPerDay", "L-CPP-LE-DAY", "Counters per player per day can't exceed bets per day.");
  saves("3.L-CPP-LE-DAY · equal saves", saveLimits({ gMaxBetsPerMinute: 1, gMaxBetsPerDay: 2, gCounterPerPlayerPerDay: 2 }));

  // CONFLICT rows: lowering a global below a bot never refuses; every non-removed status is listed.
  const BOT_CAPS = capsOf({ targetsMaxActive: 6 });
  const BOTS: RulesBot[] = [
    { botId: "hb_active", label: "Bot A", status: "ACTIVE", caps: BOT_CAPS },
    { botId: "hb_paused", label: "Bot B", status: "PAUSED", caps: BOT_CAPS },
    { botId: "hb_auto", label: "Bot C", status: "AUTO_PAUSED", caps: BOT_CAPS },
  ];
  const withBots = ctxWith({ bots: BOTS });
  const conflicts = (label: string, over: Partial<HouseBotLimits>, rule: string, field: string, copy: (botLabel: string) => string) => {
    const res = saveLimits(over, withBots);
    const rows = res.ok ? res.conflicts.filter((c) => c.rule === rule && c.field === field) : [];
    const good = res.ok && rows.length === 3 &&
      same(rows.map((c) => c.status).sort(), ["ACTIVE", "AUTO_PAUSED", "PAUSED"]) &&
      rows.every((c) => c.message === copy(c.label));
    if (good) seenRules.add(rule);
    ok(label, good, res.ok ? canon(res.conflicts) : canon(res.errors));
  };
  conflicts("3.L-GPM-VS-BOTS · lowering the global per-market limit below three bots saves and lists all three",
    { gCapPerMarketTzs: 5_000 }, "L-GPM-VS-BOTS", "gCapPerMarketTzs", (l) => `Per-market limit TZS 5,000 is below bot “${l}” max stake TZS 10,000.`);
  conflicts("3.L-GEXP-VS-BOTS · lowering the global exposure limit below their per-market caps",
    { gCapOpenExposureTzs: 15_000 }, "L-GEXP-VS-BOTS", "gCapOpenExposureTzs", (l) => `Open exposure limit TZS 15,000 is below bot “${l}” per-market cap TZS 20,000.`);
  conflicts("3.L-STAFF-VS-BOTS · lowering the global staff-chosen stakes per day",
    { gCapStaffChosenPerDay: 2 }, "L-STAFF-VS-BOTS", "gCapStaffChosenPerDay", (l) => `Staff-chosen stakes per day (all bots) 2 is below bot “${l}” 3.`);
  conflicts("3.L-STAFF-VS-BOTS · lowering the global staff-chosen daily limit",
    { gCapStaffChosenDailyTzs: 20_000 }, "L-STAFF-VS-BOTS", "gCapStaffChosenDailyTzs", (l) => `Staff-chosen daily limit TZS 20,000 is below bot “${l}” TZS 30,000.`);
  conflicts("3.L-STAFF-VS-BOTS · lowering the global target maximum",
    { gTargetsMaxActive: 5 }, "L-STAFF-VS-BOTS", "gTargetsMaxActive", (l) => `Max active targets (all bots) 5 is below bot “${l}” 6.`);
  {
    const res = saveLimits({}, withBots);
    ok("3.conflict · limits at or above every bot list no conflicts", res.ok && res.conflicts.length === 0, res.ok ? canon(res.conflicts) : "refused");
    const lowered = saveLimits({ maxDesignatedBots: 2 }, withBots);
    const line = "3 bots are designated. With a limit of 2, no account can be designated until 1 are removed. No bot is paused.";
    ok("3.preview · lowering max designated bots below the roster saves with the sealed preview",
      lowered.ok && same(lowered.previews, [line]) && MAX_BOTS_LOWERING_PREVIEW(3, 2) === line, lowered.ok ? canon(lowered.previews) : "refused");
  }

  // X-CLEAR-ON — with the master ON only the exempt limits clear; every other limit does not.
  const on = { masterOn: true, limits: limitsOf({ gTargetsMaxActive: 5 }) };
  refuses("3.X-CLEAR-ON · clearing the global per-market limit with bots on is refused",
    saveLimits({ gCapPerMarketTzs: null }, CTX, on), "gCapPerMarketTzs", "X-CLEAR-ON", "Can't clear a limit while bots are on. Switch off first.");
  refuses("3.X-CLEAR-ON · clearing the global bets-per-day limit with bots on is refused (not exempt)",
    saveLimits({ gMaxBetsPerDay: null }, CTX, on), "gMaxBetsPerDay", "X-CLEAR-ON", "Can't clear a limit while bots are on. Switch off first.");
  saves("3.X-CLEAR-ON · the four exempt limits, the counterparty share among them, clear with bots on",
    saveLimits({ gCapStaffChosenPerDay: null, gCapStaffChosenDailyTzs: null, gTargetsMaxActive: null, gStaffChosenMaxCounterpartyShare: null }, CTX, on));
  saves("3.X-CLEAR-ON · with the master OFF the per-market limit clears", saveLimits({ gCapPerMarketTzs: null }, CTX, { ...on, masterOn: false }));
}

/* ═══ §4 · Recommended values — they pass both validators, and never choose to bet ═══════════ */
section("§4 · recommended values");
{
  const ctx = ctxWith(); // live minimum 1,000, refill 10
  const withLimits = ctxWith({ limits: recommendedLimits(ctx) });
  const base = DEFAULT_RULES_V1(ctx);
  const rec = recommendedRules(base, ctx);
  saves("4.1 · recommended rules + recommended caps pass the rules validator", validateHouseBotRules({ rules: rec, caps: recommendedCaps(ctx) }, ctx));
  saves("4.2 · recommended limits pass the limits validator", validateHouseBotLimits(recommendedLimits(ctx), ctx));
  saves("4.3 · recommended caps pass against the recommended limits", validateHouseBotRules({ rules: rec, caps: recommendedCaps(ctx) }, withLimits));
  {
    const onRules = structuredClone(rec);
    onRules.enterNow.enabled = true;
    onRules.scope.products.polls = true;
    onRules.scope.categories = [SPORTS];
    saves("4.4 · Enter now on with the recommended stakes holds every N1 rule (N1 §5)", validateHouseBotRules({ rules: onRules, caps: recommendedCaps(ctx) }, withLimits));
    onRules.targeting.enabled = true;
    saves("4.5 · …and with targets on, once a target maximum is chosen (no value is recommended for it)",
      validateHouseBotRules({ rules: onRules, caps: { ...recommendedCaps(ctx), targetsMaxActive: 5 } }, withLimits));
  }
  ok("4.6 · \"Use recommended values\" never ticks a product, mode, list, All day, Enter now or targets",
    same(rec.scope.products, base.scope.products) && same(rec.modes, base.modes) && same(rec.scope.chains, base.scope.chains) &&
      same(rec.scope.categories, base.scope.categories) && same(rec.schedule, base.schedule) &&
      rec.enterNow.enabled === base.enterNow.enabled && rec.targeting.enabled === base.targeting.enabled);
  const caps = recommendedCaps(ctx);
  const limits = recommendedLimits(ctx);
  ok("4.7 · the sealed recommended values (N1 §5): Enter now 10,000 / 2,000; per bot 3 / TZS 30,000; global 10 / TZS 100,000",
    rec.enterNow.thinStakeTzs === 10_000 && rec.enterNow.openerStakeTzs === 2_000 &&
      caps.capStaffChosenPerDay === 3 && caps.capStaffChosenDailyTzs === 30_000 && caps.targetsMaxActive === null &&
      limits.gCapStaffChosenPerDay === 10 && limits.gCapStaffChosenDailyTzs === 100_000 && limits.gTargetsMaxActive === null);
  ok("4.8 · …counterparty share 50%, and nothing is recommended for a staff edge (D20 un-built it)",
    limits.gStaffChosenMaxCounterpartyShare === 50 && !("gStaffEdgeWinRatePts" in limits) && !("gStaffEdgeNetTzs" in limits), canon(Object.keys(limits)));
  // ⛔ CONTROL — the validator is live: one planted value breaks the recommended set.
  const planted = validateHouseBotRules({ rules: rec, caps: { ...caps, stakeMinTzs: 20_000 } }, ctx);
  ok("4.c1 · CONTROL · the recommended caps with a planted Stake min 20,000 are refused", planted.ok === false);
}

/* ═══ §5 · The min-gap floor (04 C14) ═══════════════════════════════════════════════════════ */
section("§5 · min-gap floor");
{
  ok("5.1 · refill 10 → 20 s; refill 2 → 100 s", minGapFloorSec(10) === 20 && minGapFloorSec(2) === 100);
  const refill2 = ctxWith({ betPlaceRefillPerMin: 2 });
  refuses("5.2 · at refill 2 a saved min gap of 30 s is refused on freqMinGapSec",
    saveRules({ ctx: refill2, caps: { freqMinGapSec: 30 } }), "freqMinGapSec", "R-GAP-FLOOR", "Min gap is at least 100 seconds.");
  saves("5.3 · …and 100 s saves", saveRules({ ctx: refill2, caps: { freqMinGapSec: 100 } }));
  const disagree: number[] = [];
  for (let r = 1; r <= 60; r++) if (minGapFloorSec(r) !== Math.ceil(60 / (r * 0.3))) disagree.push(r);
  ok("5.4 · ceil(200 / r) equals C14's ceil(60 / (r × 0.3)) for every refill 1–60", disagree.length === 0, disagree.join(","));
  const start = rulesStartProblems(rulesOf((r) => { r.scope.products.polls = true; r.modes.polls.counter = true; }), capsOf({ freqMinGapSec: 30 }), refill2);
  ok("5.5 · Start refuses a saved min gap the live refill now puts under the floor",
    start.refusals.some((f) => f.field === "freqMinGapSec" && f.code === "BELOW_MIN"), canon(start.refusals));
  // ⛔ CONTROL — a floor that rounds down would give 66 at refill 3 and let the holder's bucket run dry.
  ok("5.c1 · CONTROL · a planted Math.floor(200 / 3) gives 66, the real floor is 67", Math.floor(200 / 3) === 66 && minGapFloorSec(3) === 67);

  // Every CROSS_FIELD_RULES row has now been seen firing with its exact copy (§3 and 5.2).
  const ids = CROSS_FIELD_RULES.map((r) => r.id as string);
  const unseen = ids.filter((id) => !seenRules.has(id));
  ok(`5.coverage · all ${ids.length} CROSS_FIELD_RULES rows were exercised`, ids.length >= 33 && unseen.length === 0, unseen.join(", "));
  ok("5.c2 · CONTROL · a planted rule id is reported unexercised", [...ids, "R-PLANTED"].filter((id) => !seenRules.has(id)).includes("R-PLANTED"));
}

/* ═══ §6 · C2 — labels, notes and reasons ═══════════════════════════════════════════════════ */
section("§6 · C2 labels, notes and reasons");
{
  const ZERO_WIDTH = String.fromCharCode(0x200b);
  const RTL_OVERRIDE = String.fromCharCode(0x202e);
  const ASTRAL_LETTER = String.fromCodePoint(0x20000); // a CJK letter outside the BMP: one character, two UTF-16 units
  const ROBOT = String.fromCodePoint(0x1f916);
  const GRIN = String.fromCodePoint(0x1f600);
  const CHARSET = "Letters, numbers, spaces and - _ . # ' only.";
  const TOO_LONG = "At most 300 characters — shorten it to save.";

  ok("6.1 · \" Bot  A \" normalises to \"Bot A\"", normaliseLabel(" Bot  A ") === "Bot A");
  const charsetCases: [string, string][] = [
    [`Bot${ZERO_WIDTH}A`, "a zero-width space"],
    [`${RTL_OVERRIDE}A toB`, "a right-to-left override"],
    [ROBOT.repeat(3), "emoji"],
  ];
  for (const [raw, what] of charsetCases) {
    const e = validateLabel(raw);
    ok(`6.2 · a label with ${what} gets the charset error`, e?.field === "label" && e.code === "INVALID" && e.message === CHARSET, canon(e));
  }
  ok("6.3 · labelKey(\"Bot A\") === labelKey(\"bot a\")", labelKey("Bot A") === labelKey("bot a"));
  ok("6.4 · 32 × U+20000 is a valid label", validateLabel(ASTRAL_LETTER.repeat(32)) === null, canon(validateLabel(ASTRAL_LETTER.repeat(32))));
  ok("6.5 · 33 × U+20000 gets the length error", validateLabel(ASTRAL_LETTER.repeat(33))?.message === "2 to 32 characters.");
  ok("6.6 · a one-character label gets the length error", validateLabel("A")?.message === "2 to 32 characters.");
  ok("6.7 · a reason of five spaces is refused", validateReason("     ", { required: true })?.message === "Give a reason (at least 5 characters).");
  ok("6.8 · a 300-emoji note is valid; 301 is refused",
    validateNote(GRIN.repeat(300)) === null && validateNote(GRIN.repeat(301))?.message === TOO_LONG);
  {
    const paste = "a".repeat(5_000);
    const note = validateNote(paste);
    const reason = validateReason(paste, { required: true, field: "removeReason" });
    ok("6.9 · a 5,000-character paste is a field error on its own field, never a truncation",
      note?.field === "note" && note.message === TOO_LONG && reason?.field === "removeReason" && reason.message === TOO_LONG, `${canon(note)} ${canon(reason)}`);
  }
  ok("6.10 · an optional reason may be empty", validateReason("", { required: false }) === null);
  // ⛔ CONTROL — a UTF-16 length (what a DOM maxLength counts) would refuse the valid 32-letter label.
  ok("6.c1 · CONTROL · .length calls 32 × U+20000 sixty-four; countChars calls it 32",
    ASTRAL_LETTER.repeat(32).length === 64 && countChars(ASTRAL_LETTER.repeat(32)) === 32);
}

/* ═══ §7 · C3 — the typed ceremony words THE PRODUCT ACTUALLY SHIPS ═════════════════════════ */
/**
 * ⛔ RE-AIMED 2026-09-20, AND THE OLD §7 IS WHY THIS COMMENT IS LONG.
 *
 * What stood here was a five-row truth table over `isTypedWord` / `normaliseTypedWord` /
 * `TYPED_WORD` in `constants.ts`. It was GREEN on every run and it measured a module with ZERO
 * production callers — the shipped ceremony words are `CONSOLE_SWITCH_ON_WORD` ("SWITCH ON") and
 * `CONSOLE_REMOVE_WORD` ("REMOVE"), neither of which that table ever names, and both of which
 * compare with a plain `.trim()` rather than a normaliser. ⛔ That is worse than no test: a green
 * row reads as coverage. The helpers are now deleted (see the retirement note in `constants.ts`)
 * and this section measures the comparison that RUNS.
 *
 * ⛔ AND IT STAYS IN THIS SUITE, which is the point of re-aiming rather than moving. The shipped
 * ceremony already has BEHAVIOURAL cases — `test:house-bot-console` 1.454 and 1.415 · 454 drive
 * the real switch action with `typed: "switch on"` and the real `deskActArmed` with
 * `typed: "remove"`. But `test:house-bot-console` is in NO runner: it is run by hand. This suite
 * is in `predeploy`. Moving the assertions to the richer suite would have taken the ceremony out
 * of the gate that actually stops a deploy, so what lands here is the half a pure suite can hold
 * — the SHAPE of both comparisons, at source — and it is a strict gain over a table about a
 * module the product did not contain.
 *
 * ⛔ SOURCE, BECAUSE THIS SUITE IS PURE. `house-console-read.ts` is a server module with a
 * database behind it; §0's own module law forbids importing it here. Comments are stripped first
 * on every file read — both ceremonies carry a comment that NAMES the rule it enforces, and an
 * assertion matching its own explanatory prose would go green on a repaired-away gate.
 */
section("§7 · C3 the shipped ceremony words");
{
  const CONSOLE_SRC = decomment(readFileSync(join(ROOT, "src/lib/server/house-console-read.ts"), "utf8"));
  const DESK_SRC = decomment(readFileSync(join(ROOT, "src/app/admin/desk/[id]/account-actions.tsx"), "utf8"));
  /* ⛔ The population is the tracked tree, enumerated by git — never a file list typed here, which is
   * the staleness §0's own header records paying for. Its own call: §0's `srcFiles` is block-scoped. */
  const srcFiles = spawnSync("git", ["ls-files", "src"], { cwd: ROOT, encoding: "utf8" })
    .stdout.split(/\r?\n/).filter((f) => /\.(tsx?|mts|mjs|js)$/.test(f));

  // ── the two words themselves ────────────────────────────────────────────────────────────
  ok('7.word.switch · the master switch\'s ceremony word is the literal "SWITCH ON"',
    /export const CONSOLE_SWITCH_ON_WORD = "SWITCH ON";/.test(CONSOLE_SRC));
  ok('7.word.remove · the removal\'s ceremony word is the literal "REMOVE"',
    /export const CONSOLE_REMOVE_WORD = "REMOVE";/.test(CONSOLE_SRC));

  /* ⛔ BOTH SERVER RE-CHECKS ARE A PLAIN TRIM AND NOTHING ELSE. The ceremony exists so the act
   * cannot be reached by habit; a `.toUpperCase()` added to either line would let "switch on" and
   * "remove" through, and NOTHING else in the tree would notice — the dialog would still paint
   * the same prompt and every other case would stay green. */
  const SERVER_CHECK = (word: string) =>
    new RegExp(String.raw`if \(\(typeof input\.typed === "string" \? input\.typed\.trim\(\) : ""\) !== ${word}\) \{`);
  ok("7.server.switch · the SERVER re-checks the switch word with a plain trim against its own constant",
    SERVER_CHECK("CONSOLE_SWITCH_ON_WORD").test(CONSOLE_SRC));
  ok("7.server.remove · …and the removal the same way, so a crafted POST meets the same ceremony the dialog does",
    SERVER_CHECK("CONSOLE_REMOVE_WORD").test(CONSOLE_SRC));
  ok("7.client · the dialog arms on that SAME plain trim, never a case-fold",
    /if \(copy\.word !== null && v\.typed\.trim\(\) !== copy\.word\) return false;/.test(DESK_SRC));

  /* ⛔ AND THE REFUSAL THE OFFICER READS PROMISES CAPITALS. It is built from the constant rather
   * than typed twice, so the sentence and the comparison cannot drift apart — and it is the
   * sentence that makes case-folding a LIE rather than merely a widening. */
  ok("7.copy · the switch refusal names the word and promises capitals, built from the constant",
    /wordWrong: `Type \$\{CONSOLE_SWITCH_ON_WORD\} exactly, in capitals, to confirm\.`/.test(CONSOLE_SRC));

  /* ⛔ NO NORMALISER TOUCHES A TYPED WORD ANYWHERE ON EITHER CEREMONY PATH. The two checks above
   * pin the comparison; this pins that no LINE BEFORE them quietly folds `input.typed` first —
   * `const t = input.typed.toUpperCase()` above the check would leave both regexes matching. */
  const FOLDS = [/input\.typed[^\n;]*\.toUpperCase\(\)/, /input\.typed[^\n;]*\.toLowerCase\(\)/,
    /input\.typed[^\n;]*\.normalize\(/, /input\.typed[^\n;]*\.replace\(\/\\s/, /v\.typed[^\n;]*\.toUpperCase\(\)/];
  const folded = FOLDS.filter((re) => re.test(CONSOLE_SRC) || re.test(DESK_SRC));
  ok(`7.nofold · ⛔ neither ceremony case-folds or re-spaces what was typed (${FOLDS.length} foldings swept on 2 files)`,
    folded.length === 0, folded.map(String).join(" · "));
  ok("7.nofold.c1 · CONTROL · the sweep CAN see a folding — it finds one planted into a copy of the real line",
    FOLDS.some((re) => re.test('    if ((typeof input.typed === "string" ? input.typed.trim().toUpperCase() : "") !== CONSOLE_REMOVE_WORD) {')));
  /* ⭐ POSITIVE CONTROL · a refusal needs one, or a sweep that flagged EVERYTHING would look like
   * a working guard from the outside. What must still be ALLOWED is the shipped line itself — a
   * plain `.trim()` — and the reason field's trim beside it, which is a different value entirely. */
  ok("7.nofold.c2 · ⭐ POSITIVE CONTROL · a plain trim is still ALLOWED — the sweep flags neither shipped line",
    !FOLDS.some((re) => re.test('    if ((typeof input.typed === "string" ? input.typed.trim() : "") !== CONSOLE_REMOVE_WORD) {'))
      && !FOLDS.some((re) => re.test('  const reason = typeof input.reason === "string" ? input.reason.trim() : "";')));

  /* ── the retirement, INVERTED rather than deleted (the shape `test:failure-reasons` 8c uses) ──
   * ⛔ Three names left `constants.ts` on 2026-09-20. Deleting their assertions would have left
   * the retirement unmeasured, and the specific way a half-retirement ships is silent: the module
   * comes back with one caller and every case above stays green, because none of them names it. */
  const DEAD = ["normaliseTypedWord", "isTypedWord", "TYPED_WORD"];
  const deadHits = DEAD.map((n) => ({
    name: n,
    files: srcFiles.filter((f) => new RegExp(String.raw`\b${n}\b`).test(decomment(readFileSync(join(ROOT, f), "utf8")))),
  })).filter((h) => h.files.length > 0);
  ok(`7.retired · ⛔ no file under src/ names the retired normaliser (${DEAD.length} names swept over ${srcFiles.length} files)`,
    srcFiles.length > 500 && deadHits.length === 0,
    deadHits.map((h) => `${h.name}: ${h.files.join(", ")}`).join(" · "));
  /* ⭐ CONTROL · the sweep above would pass over an empty population or a broken reader. Prove it
   * still SEES a name that is genuinely present in the same folder, and that it reads the same
   * files: `CONSOLE_REMOVE_WORD` is live, in the very file §7 pins. */
  const liveHits = srcFiles.filter((f) => /\bCONSOLE_REMOVE_WORD\b/.test(decomment(readFileSync(join(ROOT, f), "utf8"))));
  ok("7.retired.c1 · CONTROL · the same sweep finds a name that IS live, so the zero above is a measurement",
    liveHits.includes("src/lib/server/house-console-read.ts") && liveHits.length >= 1, liveHits.join(", "));
}

/* ═══ §8 · C15 — schedule windows in fixed EAT ══════════════════════════════════════════════ */
section("§8 · C15 schedule windows");
{
  const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const TUE_0100 = Date.UTC(2026, 8, 14, 22); // Tue 15 Sep 2026, 01:00 EAT
  const MON_0100 = Date.UTC(2026, 8, 13, 22); // Mon 14 Sep 2026, 01:00 EAT
  ok("8.0 · the fixture instants are the weekdays they claim", eatWeekday(TUE_0100) === "TUE" && eatWeekday(MON_0100) === "MON");

  const sameTime = expandWindows({ days: ["MON"], allDay: false, windows: [{}] }, [{ start: "00:00", end: "00:00" }]);
  ok("8.1 · 00:00–00:00 is refused as the same time",
    same(sameTime.errors, [{ field: "schedule.windows.0.end", code: "INVALID", message: "Start and end are the same — use All day for 24 hours." }]), canon(sameTime.errors));
  const lastMinute = expandWindows({ days: ["MON"], allDay: false, windows: [{}] }, [{ start: "23:59", end: "00:00" }]);
  ok("8.2 · 23:59–00:00 is valid; the 00:00 end is stored as 1440",
    lastMinute.errors.length === 0 && same(lastMinute.windows, [{ startMin: 1_439, endMin: 1_440 }]), canon(lastMinute.errors));
  const monOvernight = expandWindows({ days: ["MON"], allDay: false, windows: [{ startMin: 22 * 60, endMin: 2 * 60 }] });
  ok("8.3 · Mon 22:00 → 02:00 contains Tue 01:00", monOvernight.errors.length === 0 && windowContains(monOvernight.intervals, TUE_0100), canon(monOvernight.intervals));
  const sunOvernight = expandWindows({ days: ["SUN"], allDay: false, windows: [{ startMin: 22 * 60, endMin: 2 * 60 }] });
  ok("8.4 · a Sunday overnight row contains Mon 01:00, split at the end of the week",
    sunOvernight.errors.length === 0 && sunOvernight.intervals.length === 2 && windowContains(sunOvernight.intervals, MON_0100), canon(sunOvernight.intervals));
  const overlap = expandWindows({ days: ALL_DAYS, allDay: false, windows: [{ startMin: 22 * 60, endMin: 2 * 60 }, { startMin: 60, endMin: 180 }] });
  ok("8.5 · 22:00→02:00 plus 01:00→03:00 is refused on row 1, naming the overnight window",
    same(overlap.errors, [{ field: "schedule.windows.1", code: "INVALID", message: "Overlaps Mon 22:00 → Tue 02:00." }]), canon(overlap.errors));
  const half = expandWindows({ days: ["MON"], allDay: false, windows: [{}] }, [{ start: "2_", end: "05:00" }]);
  ok("8.6 · a half-typed \"2_\" is \"Enter a time as HH:MM.\", never an empty valid time",
    parseEatTime("2_") === "INCOMPLETE" && same(half.errors, [{ field: "schedule.windows.0.start", code: "INVALID", message: "Enter a time as HH:MM." }]), canon(half.errors));
  const five = expandWindows({ days: ["MON"], allDay: false, windows: [0, 2, 4, 6, 8].map((h) => ({ startMin: h * 60, endMin: h * 60 + 60 })) });
  ok("8.7 · a fifth row is \"Up to 4 windows\" on schedule.windows.4",
    same(five.errors, [{ field: "schedule.windows.4", code: "INVALID", message: "Up to 4 windows" }]), canon(five.errors));
  const noDays = expandWindows({ days: [], allDay: true, windows: [] });
  ok("8.8 · zero days is \"Pick at least one day.\"",
    same(noDays.errors, [{ field: "schedule.days", code: "INVALID", message: "Pick at least one day." }]), canon(noDays.errors));
  ok("8.9 · the overnight description, and 1440 rendering as 00:00",
    describeWindow("MON", 22 * 60, 2 * 60) === "Mon 22:00 → Tue 02:00 (overnight)" && formatMinutes(1_440) === "00:00");
  ok("8.10 · parseEatTime: 09:30 → 570, 24:00 and 12:60 INVALID", parseEatTime("09:30") === 570 && parseEatTime("24:00") === "INVALID" && parseEatTime("12:60") === "INVALID");
  // ⛔ CONTROL — a Sunday overnight interval that is not split runs past the end of the week and misses Monday.
  ok("8.c1 · CONTROL · an unsplit Sunday interval 9960–10200 misses Mon 01:00", !windowContains([{ startMin: 9_960, endMin: 10_200 }], MON_0100));
}

/* ═══ §9 · C14 scope and F4 stored rules — parse never widens, migrate never mutates ═════════ */
section("§9 · C14 scope and F4 stored rules");
{
  const parseCtx: ParseContext = { chains: CHAINS, categories: MARKET_CATEGORIES, durations: ALLOWED_DURATIONS };
  const stored = (mut?: (r: HouseBotRulesV1) => void): Record<string, unknown> => JSON.parse(JSON.stringify(rulesOf(mut))) as Record<string, unknown>;

  {
    const wider: ParseContext = {
      chains: [...CHAINS, { key: "BTC:1", label: "BTC 1-min", durationMinutes: 1 }, { key: "BTC:120", label: "BTC 120-min", durationMinutes: 120 }],
      categories: [...MARKET_CATEGORIES, "lottery" as MarketCategory],
      durations: [...ALLOWED_DURATIONS, 1, 120],
    };
    const p = parseHouseBotRules(stored((r) => { r.scope.chains = ["BTC:3"]; r.scope.categories = [SPORTS]; }), wider);
    ok("9.1 · durations gaining 1 and 120, and an extra category, leave the parsed scope exactly as stored",
      p.ok && same(p.rules.scope.chains, ["BTC:3"]) && same(p.rules.scope.categories, ["sports"]) && p.stale.length === 0, canon(p));
  }
  {
    const p = parseHouseBotRules(stored((r) => { r.scope.chains = ["BTC:3", "DOGE:7"]; }), parseCtx);
    ok("9.2 · an unknown chain loads, with exactly one stale entry",
      p.ok && same(p.rules.scope.chains, ["BTC:3"]) &&
        same(p.stale, [{ path: "scope.chains", value: "DOGE:7", message: "Rules mention DOGE 7-min, which no longer exists — review and save." }]), canon(p));
  }
  {
    const v99 = parseHouseBotRules({ ...stored(), schemaVersion: 99 }, parseCtx);
    ok("9.3 · schemaVersion 99 → RULES_FROM_FUTURE", !v99.ok && v99.code === "RULES_FROM_FUTURE", canon(v99));
    const v0 = parseHouseBotRules({ ...stored(), schemaVersion: 0 }, parseCtx);
    const none = stored();
    delete none.schemaVersion;
    const vNone = parseHouseBotRules(none, parseCtx);
    ok("9.4 · schemaVersion 0, or none at all → RULES_OUTDATED",
      !v0.ok && v0.code === "RULES_OUTDATED" && !vNone.ok && vNone.code === "RULES_OUTDATED", `${canon(v0)} ${canon(vNone)}`);
  }
  {
    const withoutDelay = (modeOn: boolean) => {
      const j = stored((r) => { r.modes.polls.counter = modeOn; });
      delete (j.counter as Record<string, unknown>).delayMinSec;
      return parseHouseBotRules(j, parseCtx);
    };
    const on = withoutDelay(true);
    const off = withoutDelay(false);
    ok("9.5 · a mode on with a numeric leaf it reads missing → RULES_INVALID naming the leaf",
      !on.ok && on.code === "RULES_INVALID" && on.field === "counter.delayMinSec", canon(on));
    ok("9.6 · …the same leaf missing with that mode off parses, filled from the defaults", off.ok && off.rules.counter.delayMinSec === 15, canon(off));
    const noThin = parseHouseBotRules(stored((r) => { enterNowOn(r); r.enterNow.thinStakeTzs = null; }), parseCtx);
    ok("9.7 · Enter now on with no thin stake → RULES_INVALID naming it",
      !noThin.ok && noThin.code === "RULES_INVALID" && noThin.field === "enterNow.thinStakeTzs", canon(noThin));
    const bare = stored();
    delete bare.enterNow;
    delete bare.targeting;
    const p = parseHouseBotRules(bare, parseCtx);
    ok("9.8 · v1 without enterNow or targeting → both off, and it parses (no pause)",
      p.ok && same(p.rules.enterNow, { enabled: false, thinStakeTzs: null, openerStakeTzs: null }) && same(p.rules.targeting, { enabled: false }), canon(p));
    const live = parseHouseBotRules(stored((r) => { r.opener.stakeMinTzs = 500; r.opener.stakeMaxTzs = 500; }), parseCtx);
    ok("9.9 · parse never applies live stake bounds: a stored opener stake of 500 loads (F5 revalidates it)",
      live.ok && live.rules.opener.stakeMinTzs === 500, canon(live));
  }

  // ⭐ PROPERTY — 200 generated v0 inputs through the only migration (v0 → v1).
  {
    let state = 0x5eed2026;
    const rand = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
    const MISSING = Symbol("missing");
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
    const put = (obj: Record<string, unknown>, path: string, v: unknown) => {
      if (v === MISSING) return;
      const keys = path.split(".");
      let cur = obj;
      for (const k of keys.slice(0, -1)) {
        const next = cur[k];
        if (!next || typeof next !== "object" || Array.isArray(next)) cur[k] = {};
        cur = cur[k] as Record<string, unknown>;
      }
      cur[keys[keys.length - 1]] = v;
    };
    const read = (obj: unknown, path: string): unknown =>
      path.split(".").reduce<unknown>(
        (cur, k) => (cur && typeof cur === "object" && !Array.isArray(cur) ? (cur as Record<string, unknown>)[k] : undefined),
        obj,
      );
    const arr = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
    const subset = (out: readonly unknown[], inp: readonly unknown[]) => out.every((x) => inp.includes(x));

    const NUMBER_LEAVES = FIELD_ORDER.filter(
      (id) => FIELD_META[id].group === "rules" && FIELD_META[id].min !== null && !id.startsWith("enterNow.") && !id.startsWith("counter.amount."),
    );
    /** The static bounds a STORED rules JSON is held to: no live stake bounds (F5 is not parse's job). */
    const storedBound = (id: FieldId) => {
      const m = FIELD_META[id];
      const min = typeof m.min === "number" ? m.min : 0;
      const max = m.max === "LIVE_MAX" ? 1_000_000_000
        : m.max === "MAX_UD_SEC" ? maxUdFillLeadSec(ALLOWED_DURATIONS)
        : m.max === "MAX_OPENER_UD_SEC" ? maxOpenerUdDelaySec(ALLOWED_DURATIONS)
        : (m.max as number);
      return { min, max };
    };
    const genNumber = (id: FieldId): unknown => {
      const { min, max } = storedBound(id);
      const inRange = () => min + Math.floor(rand() * (Math.min(max, min + 100_000) - min + 1));
      const makers: (() => unknown)[] = [
        inRange, inRange, inRange,
        () => min - 1 - Math.floor(rand() * 1_000),
        () => max + 1 + Math.floor(rand() * 1_000),
        () => inRange() + 0.5,
        () => String(inRange()),
        () => null,
        () => MISSING,
        () => 1e20,
      ];
      const options = FIELD_META[id].options;
      if (options) makers.push(() => pick(options));
      return pick(makers)();
    };
    const flag = () => pick<unknown>([true, false, false, "true", 1, null, MISSING]);
    const genV0 = (): Record<string, unknown> => {
      const j: Record<string, unknown> = {};
      put(j, "schemaVersion", pick<unknown>([0, MISSING]));
      put(j, "scope.products.updown", flag());
      put(j, "scope.products.polls", flag());
      put(j, "scope.chains", pick<unknown>([[...CHAINS.map((c) => c.key), "DOGE:7"].filter(() => rand() < 0.5), "all", MISSING, ["BTC:3", 7]]));
      put(j, "scope.categories", pick<unknown>([[...MARKET_CATEGORIES, "astrology"].filter(() => rand() < 0.4), "all", MISSING]));
      for (const product of ["updown", "polls"]) for (const mode of ["counter", "fill", "opener"]) put(j, `modes.${product}.${mode}`, flag());
      for (const id of NUMBER_LEAVES) put(j, id, genNumber(id));
      const amount: Record<string, unknown> = { kind: pick(["PCT", "FIXED", "BOGUS"]) };
      put(amount, "pct", genNumber("counter.amount.pct"));
      put(amount, "fixedTzs", genNumber("counter.amount.fixedTzs"));
      put(j, "counter.amount", pick<unknown>([amount, amount, "80%", MISSING]));
      put(j, "schedule.days", pick<unknown>([["MON", "TUE", "SUN"].filter(() => rand() < 0.7), ["MON", "XYZ"], "weekdays", MISSING]));
      put(j, "schedule.allDay", flag());
      const windows = Array.from({ length: Math.floor(rand() * 6) }, () => ({
        startMin: Math.floor(rand() * 1_600) - 80,
        endMin: Math.floor(rand() * 1_600) - 80,
      }));
      put(j, "schedule.windows", pick<unknown>([windows, "none", MISSING]));
      put(j, "legacyUnknownKey", pick<unknown>(["x", MISSING]));
      return j;
    };

    const defaults = DEFAULT_RULES_V1({ stakeBounds: { minTzs: 1_000, maxTzs: 1_000_000_000 } });
    const clampTo = (id: FieldId, v: number) => { const b = storedBound(id); return Math.min(Math.max(Math.trunc(v), b.min), b.max); };
    const expectLeaf = (id: FieldId, input: unknown): unknown => {
      const fallback = read(defaults, id);
      if (typeof input !== "number" || !Number.isFinite(input)) return typeof fallback === "number" ? fallback : null;
      const options = FIELD_META[id].options;
      if (options) return options.includes(Math.trunc(input)) ? Math.trunc(input) : fallback;
      return clampTo(id, input);
    };
    /** The only refusals a converted v0 may earn: an inverted range that an enabled mode draws from. */
    const RANGES: [string, string][] = [
      ["counter.delayMinSec", "counter.delayMaxSec"],
      ["counter.triggerStakeMinTzs", "counter.triggerStakeMaxTzs"],
      ["opener.delayUdMinSec", "opener.delayUdMaxSec"],
      ["opener.delayPollsMinMin", "opener.delayPollsMaxMin"],
      ["opener.stakeMinTzs", "opener.stakeMaxTzs"],
      ["scope.poolTotalMinTzs", "scope.poolTotalMaxTzs"],
    ];
    const explained = (field: string, converted: unknown) => {
      const pair = RANGES.find(([lo, hi]) => lo === field || hi === field);
      if (!pair) return false;
      const lo = read(converted, pair[0]);
      const hi = read(converted, pair[1]);
      return typeof lo === "number" && typeof hi === "number" && lo > hi;
    };

    let converted = 0, refused = 0, clamped = 0, staleSeen = 0;
    const problems: string[] = [];
    for (let i = 0; i < 200; i++) {
      const input = genV0();
      const snapshot = JSON.stringify(input);
      const lifted = RULES_MIGRATIONS[0](input, parseCtx);
      const parsed = parseHouseBotRules(lifted, parseCtx);
      const migrated = migrateRules(input, parseCtx);
      if (JSON.stringify(input) !== snapshot) { problems.push(`#${i} mutated its input`); continue; }
      if (migrated.ok !== parsed.ok) { problems.push(`#${i} migrateRules and parse disagree: ${canon(migrated)}`); continue; }
      if (!parsed.ok) {
        refused++;
        if (!(parsed.code === "RULES_INVALID" && parsed.field && explained(parsed.field, lifted))) {
          problems.push(`#${i} refused for an unexplained reason ${canon(parsed)}`);
        }
        continue;
      }
      converted++;
      const r = parsed.rules;
      staleSeen += parsed.stale.length;
      if (migrated.ok && !same(migrated.rules, r)) problems.push(`#${i} migrateRules returned different rules`);
      if (!subset(r.scope.chains, arr(read(input, "scope.chains")))) problems.push(`#${i} widened scope.chains`);
      if (!subset(r.scope.categories, arr(read(input, "scope.categories")))) problems.push(`#${i} widened scope.categories`);
      for (const p of ["updown", "polls"] as const) {
        if (r.scope.products[p] && read(input, `scope.products.${p}`) !== true) problems.push(`#${i} turned on product ${p}`);
        for (const m of ["counter", "fill", "opener"] as const) {
          if (r.modes[p][m] && read(input, `modes.${p}.${m}`) !== true) problems.push(`#${i} turned on ${p}.${m}`);
        }
      }
      if (r.enterNow.enabled || r.targeting.enabled) problems.push(`#${i} turned on Enter now or targets`);
      for (const id of NUMBER_LEAVES) {
        const inV = read(input, id);
        const want = expectLeaf(id, inV);
        const got = read(r, id);
        if (got !== want) problems.push(`#${i} ${id}: ${canon(inV)} → ${canon(got)}, want ${canon(want)}`);
        else if (typeof inV === "number" && got !== inV) clamped++;
      }
      const a = read(input, "counter.amount");
      const am = a && typeof a === "object" && !Array.isArray(a) ? (a as Record<string, unknown>) : {};
      const wantAmount = am.kind === "FIXED" && typeof am.fixedTzs === "number"
        ? { kind: "FIXED", fixedTzs: clampTo("counter.amount.fixedTzs", am.fixedTzs) }
        : { kind: "PCT", pct: typeof am.pct === "number" ? clampTo("counter.amount.pct", am.pct) : 80 };
      if (!same(r.counter.amount, wantAmount)) problems.push(`#${i} counter.amount ${canon(r.counter.amount)}, want ${canon(wantAmount)}`);
      if (!subset(r.schedule.days, arr(read(input, "schedule.days")))) problems.push(`#${i} widened schedule.days`);
      if (r.schedule.windows.length > 4) problems.push(`#${i} kept more than 4 windows`);
    }
    ok("9.P1 · 200 v0 inputs: scope ⊆ input, modes ⊆ input, every number kept or moved to the nearer bound, input never mutated",
      problems.length === 0, `${problems.length} problem(s): ${problems.slice(0, 3).join(" | ")}`);
    ok("9.P2 · population: inputs really converted, numbers really were clamped, stale chains really were dropped",
      converted >= 40 && clamped > 0 && staleSeen > 0, `converted ${converted} · refused ${refused} · clamped ${clamped} · stale ${staleSeen}`);

    // ⛔ CONTROLS — the subset check sees a widening, and the snapshot sees a mutation.
    ok("9.c1 · CONTROL · a migrator that widened an empty chain list to every chain fails the subset check", !subset(CHAINS.map((c) => c.key), []));
    const probe: { a: number[] } = { a: [1] };
    const before = JSON.stringify(probe);
    probe.a.push(2);
    ok("9.c2 · CONTROL · a planted in-place mutation changes the snapshot", JSON.stringify(probe) !== before);
  }
}

/* ═══ §10 · Timing and Start — PLAN §12, the nine sealed target rows, Enter now, "no mode" ═════ */
section("§10 · timing and Start");
{
  type CounterTiming = Exclude<ReturnType<typeof effectiveTiming>["counter"]["polls"], "never">;
  const asTiming = (t: "never" | CounterTiming | undefined): CounterTiming | null => (t && t !== "never" ? t : null);
  const figure = (t: "never" | CounterTiming | undefined) => (t === undefined ? "missing" : t === "never" ? "never" : formatAfterStake(t.earliestAfterStakeSec));
  const delay20 = (r: HouseBotRulesV1) => { r.counter.delayMinSec = 20; r.counter.delayMaxSec = 20; };
  const timingCtx = (polls: ExitRates) => ctxWith({ exitRates: { polls, updown: { "BTC:3": RATES_5_0, "BTC:10": RATES_5_0 } } });

  // ⛔ The automatic COUNTER is held to the exit close with NO lock margin (N1 §4.1, N2 §4 step 12).
  const t0 = effectiveTiming(rulesOf(delay20), timingCtx(RATES_5_0));
  const t2 = effectiveTiming(rulesOf(delay20), timingCtx({ freeExitGraceMinutes: 5, paidExitWindowMinutes: 2 }));
  ok("10.1 · PLAN §12 · a 3-min round counters at 0:20", figure(t0.counter.updown["BTC:3"]) === "0:20", figure(t0.counter.updown["BTC:3"]));
  ok("10.2 · PLAN §12 · a 10-min round, stake at open, at 5:00", figure(t0.counter.updown["BTC:10"]) === "5:00", figure(t0.counter.updown["BTC:10"]));
  ok("10.3 · PLAN §12 · a poll at 5:00", figure(t0.counter.polls) === "5:00", figure(t0.counter.polls));
  ok("10.4 · PLAN §12 · a 2-min paid window makes the poll 7:00", figure(t2.counter.polls) === "7:00", figure(t2.counter.polls));
  ok("10.5 · the sentences read \"5:00 after the stake\" and \"7:00 after the stake\" (PLAN F2)",
    asTiming(t0.counter.updown["BTC:10"])?.sentence === "10-min rounds: 5:00 after the stake, because the player keeps a free 5-min exit" &&
      asTiming(t2.counter.polls)?.sentence === "Polls: 7:00 after the stake, because the player keeps a free 5-min exit plus a 2-min paid exit",
    `${asTiming(t0.counter.updown["BTC:10"])?.sentence} | ${asTiming(t2.counter.polls)?.sentence}`);
  ok("10.6 · the rules tab carries the Up & Down line \"3-min rounds: exactly 20 s after the stake (usually +2–5 s)\" (N2 §5)",
    t0.lines.includes("3-min rounds: exactly 20 s after the stake (usually +2–5 s)"), canon(t0.lines));

  const t120 = effectiveTiming(rulesOf(delay20), timingCtx({ freeExitGraceMinutes: 5, paidExitWindowMinutes: 120 }));
  const t60 = effectiveTiming(rulesOf(delay20), timingCtx({ freeExitGraceMinutes: 5, paidExitWindowMinutes: 60 }));
  ok("10.7 · a 120-min paid exit makes polls never, with the PLAN F2 line",
    t120.counter.polls === "never" && t120.lines.includes("Counter: never fires on polls under current exit rules (players can exit for 125 min)"), canon(t120.lines));
  ok("10.8 · a 60-min paid exit does not: stakes in the first 50:00 of the shortest poll can still be countered",
    asTiming(t60.counter.polls)?.lastCounterableFromOpenSec === 3_000 && formatAfterStake(3_000) === "50:00", canon(t60.counter.polls));
  ok("10.9 · a 60-min paid exit on polls leaves the 3-min Up & Down timing unchanged", same(t60.counter.updown["BTC:3"], t0.counter.updown["BTC:3"]));
  {
    const impossible = rulesStartProblems(rulesOf((r) => { delay20(r); r.scope.products.polls = true; r.scope.categories = [SPORTS]; r.modes.polls.counter = true; }), capsOf(), timingCtx({ freeExitGraceMinutes: 5, paidExitWindowMinutes: 120 }));
    ok("10.10 · Start warns when the only enabled mode can never fire — on a document it would otherwise start",
      impossible.refusals.length === 0 && impossible.warnings.includes("Every enabled mode is currently impossible."), canon(impossible));
  }
  // ⛔ CONTROL — the margin added to the automatic counter moves the 10-min row off PLAN §12.
  ok("10.c1 · CONTROL · adding LOCK_MARGIN_MS to the automatic 10-min counter gives 5:07, which turns the 5:00 row red",
    formatAfterStake(holdAfterStakeSec(exitWindowCloseSec(10 * 60 - 92, RATES_5_0))) === "5:07" && figure(t0.counter.updown["BTC:10"]) !== "5:07");

  // Targets (N2 §5): the nine golden rows. A stake placed now, cutoff two hours away, polls guards 15:00 / 5:00.
  const NOW = "2026-09-14T09:00:00.000Z"; //    12:00:00 EAT
  const CUTOFF = "2026-09-14T11:00:00.000Z"; // 14:00:00 EAT
  const ZONE_15 = { noReactZoneSec: 900, minTimeToCutoffSec: 300 };
  const ZONE_0 = { noReactZoneSec: 0, minTimeToCutoffSec: 300 };
  const G5P0 = { graceMin: 5, paidMin: 0 };
  const G5P2 = { graceMin: 5, paidMin: 2 };
  const G0 = { graceMin: 0, paidMin: 0 };
  const tgt = (from: "STAKE" | "EXIT_CLOSE", min: number, max = min): TargetTimingInput => ({ delayMinSec: min, delayMaxSec: max, timingFrom: from, reactTo: "FIRST" });
  const GOLDEN: [string, { graceMin: number; paidMin: number }, TargetTimingInput, string, string, number, boolean][] = [
    ["grace 5, paid 0 · STAKE 10 s", G5P0, tgt("STAKE", 10), "10 s → held to 5:07",
      "Held to 5:07 after each stake — the player keeps a free 5-min exit. Usually lands 5:09–5:12 after the stake.", 307, true],
    ["grace 5, paid 0 · STAKE 20–40 s", G5P0, tgt("STAKE", 20, 40), "20–40 s → held to 5:07",
      "Held to 5:07 after each stake (asked 20–40 s) — the player keeps a free 5-min exit. Usually lands 5:09–5:12 after the stake.", 307, true],
    ["grace 5, paid 0 · EXIT_CLOSE 10 s", G5P0, tgt("EXIT_CLOSE", 10), "exit + 10 s = 5:10",
      "5:10 after each stake (10 s after the player's free exit closes). Usually lands 5:12–5:15 after the stake.", 310, false],
    ["grace 5, paid 0 · EXIT_CLOSE 5 s", G5P0, tgt("EXIT_CLOSE", 5), "exit + 5 s → held to 5:07",
      "Held to 5:07 after each stake (asked 5 s after the player's free exit closes; 50pick waits at least 7 s). Usually lands 5:09–5:12 after the stake.", 307, true],
    ["grace 5, paid 0 · EXIT_CLOSE 20–40 s", G5P0, tgt("EXIT_CLOSE", 20, 40), "exit + 20–40 s = 5:20–5:40",
      "5:20–5:40 after each stake (20–40 s after the player's free exit closes). Usually lands 2–5 s after that.", 320, false],
    ["grace 5, paid 2 · STAKE 10 s", G5P2, tgt("STAKE", 10), "10 s → held to 7:07",
      "Held to 7:07 after each stake — free 5-min exit plus a 2-min paid exit. Usually lands 7:09–7:12 after the stake.", 427, true],
    ["grace 0 · STAKE 10 s", G0, tgt("STAKE", 10), "10 s",
      "10 s after each stake — this poll has no free exit. Usually lands 12–15 s after the stake.", 10, false],
    ["grace 0 · STAKE 5 s", G0, tgt("STAKE", 5), "5 s → held to 0:07",
      "Held to 0:07 after each stake (asked 5 s) — 50pick waits at least 7 s. Usually lands 0:09–0:12 after the stake.", 7, true],
  ];
  const TAIL_15 = " Armed from 12:00:12 EAT. Stakes placed after 13:45:00 EAT aren't reacted to.";
  for (const [name, frozen, target, short, body, dueSec, held] of GOLDEN) {
    const t = effectiveTargetTiming(target, frozen, ZONE_15, CUTOFF, NOW);
    ok(`10.T · ${name} · short "${short}"`, t.short === short, t.short);
    ok(`10.T · ${name} · the sealed sentence, then "Armed from" and "Stakes placed after"`, t.sentence === body + TAIL_15, t.sentence);
    ok(`10.T · ${name} · due ${formatAfterStake(dueSec)}, held ${held}, armed now + 12 s, last reactable 1 ms before the zone`,
      t.earliestAfterStakeSec === dueSec && t.held === held && !t.never && t.armedFrom === "2026-09-14T09:00:12.000Z" &&
        t.lastReactableStakeAt === "2026-09-14T10:44:59.999Z", canon(t));
  }
  {
    const soon = "2026-09-14T09:10:00.000Z"; // cutoff ten minutes away: no stake from arming on is reactable
    for (const [name, frozen] of [["grace 5", G5P0], ["grace 0", G0]] as const) {
      const t = effectiveTargetTiming(tgt("STAKE", 10), frozen, ZONE_15, soon, NOW);
      ok(`10.T · never (${name}) · "Too late" and the sealed refusal sentence`,
        t.never && t.short === "Too late" && t.lastReactableStakeAt === null &&
          t.sentence === "Can't react on this poll: a stake placed from 12:00:12 EAT would be held past Bot A's cutoff (12:05 EAT).", canon(t));
    }
    const named = effectiveTargetTiming(tgt("STAKE", 10), G5P0, ZONE_15, soon, NOW, null, { botLabel: "Desk 2" });
    ok("10.T · never · the sentence names the bot it belongs to", named.sentence.includes("held past Desk 2's cutoff"), named.sentence);
    const existing = effectiveTargetTiming(tgt("STAKE", 10), G5P0, ZONE_15, CUTOFF, NOW, "2026-09-14T08:59:00.000Z");
    ok("10.T · an existing target is armed from its own effectiveFrom, not now + 12 s",
      existing.armedFrom === "2026-09-14T08:59:00.000Z" && existing.sentence.includes("Armed from 11:59:00 EAT."), existing.sentence);
  }

  // lastReactableStakeAt in both regimes — against an independent millisecond search of the sealed definition:
  // the latest p ≥ armedFrom with p < cutoff − zone and dueAt(p, delayMin) ≤ cutoff − minTimeToCutoff, where
  // dueAt = p + max(requested, exit(p) + 7 s) and exit(p) is grace + paid only while p had the grace left.
  const searchLastReactable = (target: TargetTimingInput, frozen: { graceMin: number; paidMin: number },
    guards: { noReactZoneSec: number; minTimeToCutoffSec: number }, cutoffIso: string, armedFromIso: string): string | null => {
    const cutoff = Date.parse(cutoffIso);
    const armed = Date.parse(armedFromIso);
    const graceMs = frozen.graceMin * 60_000;
    const exitMs = graceMs > 0 ? graceMs + frozen.paidMin * 60_000 : 0;
    const dueAt = (p: number) => {
      const exit = graceMs > 0 && cutoff - p >= graceMs ? exitMs : 0;
      const requested = (target.timingFrom === "STAKE" ? 0 : exit) + target.delayMinSec * 1_000;
      return p + Math.max(requested, exit + 7_000);
    };
    for (let p = cutoff - guards.noReactZoneSec * 1_000 - 1; p >= armed; p--) {
      if (dueAt(p) <= cutoff - guards.minTimeToCutoffSec * 1_000) return new Date(p).toISOString();
    }
    return null;
  };
  const REGIMES: [string, TargetTimingInput, { graceMin: number; paidMin: number }, { noReactZoneSec: number; minTimeToCutoffSec: number }, string][] = [
    ["zone 15:00 · grace 5 · STAKE 10 s — the zone binds", tgt("STAKE", 10), G5P0, ZONE_15, "2026-09-14T10:44:59.999Z"],
    ["zone 0 · grace 5 · STAKE 10 s — the held stake binds", tgt("STAKE", 10), G5P0, ZONE_0, "2026-09-14T10:49:53.000Z"],
    ["zone 0 · grace 5 · EXIT_CLOSE 10 s", tgt("EXIT_CLOSE", 10), G5P0, ZONE_0, "2026-09-14T10:49:50.000Z"],
    ["zone 0 · grace 5, paid 2 · STAKE 10 s", tgt("STAKE", 10), G5P2, ZONE_0, "2026-09-14T10:47:53.000Z"],
    ["zone 0 · grace 0 · STAKE 10 s", tgt("STAKE", 10), G0, ZONE_0, "2026-09-14T10:54:50.000Z"],
    ["zone 0, cutoff guard 1:00 · grace 5 · STAKE 10 s — a stake with no free exit binds", tgt("STAKE", 10), G5P0, { noReactZoneSec: 0, minTimeToCutoffSec: 60 }, "2026-09-14T10:58:50.000Z"],
  ];
  for (const [name, target, frozen, guards, want] of REGIMES) {
    const t = effectiveTargetTiming(target, frozen, guards, CUTOFF, NOW);
    const searched = searchLastReactable(target, frozen, guards, CUTOFF, t.armedFrom);
    ok(`10.R · ${name} · lastReactableStakeAt = ${want}, and the search agrees`, t.lastReactableStakeAt === want && searched === want,
      `module ${t.lastReactableStakeAt} · search ${searched}`);
  }
  {
    const t = effectiveTargetTiming(tgt("STAKE", 10), G5P0, ZONE_0, CUTOFF, NOW);
    ok("10.R · a zone shorter than the grace appends the no-free-exit line",
      t.sentence === "Held to 5:07 after each stake — the player keeps a free 5-min exit. Usually lands 5:09–5:12 after the stake. " +
        "Armed from 12:00:12 EAT. Stakes placed after 13:49:53 EAT aren't reacted to. From 13:55:00 EAT a stake has no free exit, so Bot A reacts 10 s after it.",
      t.sentence);
  }
  ok("10.due · the seconds decide uses: STAKE 10 → +307, EXIT_CLOSE 10 → +310, EXIT_CLOSE 5 → +307, grace 0 STAKE 5 → +7",
    targetDueAfterStakeSec("STAKE", 300, 10) === 307 && targetDueAfterStakeSec("EXIT_CLOSE", 300, 10) === 310 &&
      targetDueAfterStakeSec("EXIT_CLOSE", 300, 5) === 307 && targetDueAfterStakeSec("STAKE", 0, 5) === 7);
  // ⛔ CONTROL — a target with the 7 s hold removed would read 5:00, not 5:07.
  ok("10.c2 · CONTROL · a target timed without the hold gives 5:00 on the first golden row",
    formatAfterStake(Math.max(10, exitWindowCloseSec(7_200, RATES_5_0))) === "5:00");

  // Target fields: delay bounds × {"", "0", 4, 5, 600, 601, 2^53}, equal allowed, min ≤ max.
  {
    const withMin = (raw: unknown) => validateTargetInput({ delayMinSec: raw, delayMaxSec: "600", timingFrom: "STAKE", reactTo: "FIRST" });
    const DELAYS: [unknown, string | null][] = [
      ["", "UNSET:Enter a whole number."],
      ["0", "BELOW_MIN:Between 5 and 600 seconds."],
      ["4", "BELOW_MIN:Between 5 and 600 seconds."],
      ["5", null],
      ["600", null],
      ["601", "ABOVE_MAX:Between 5 and 600 seconds."],
      ["9007199254740992", "ABOVE_MAX:Between 5 and 600 seconds."],
    ];
    for (const [raw, want] of DELAYS) {
      const res = withMin(raw);
      const got = res.ok ? null : res.errors.map((e) => `${e.code}:${e.message}`).join(" | ");
      ok(`10.delay · ${JSON.stringify(raw)} → ${want ?? "valid"}`, got === want, `${got}`);
    }
    const equal = validateTargetInput({ delayMinSec: "10", delayMaxSec: "10", timingFrom: "EXIT_CLOSE", reactTo: "EVERY" });
    ok("10.delay · min = max is valid", equal.ok && equal.value.delayMinSec === 10 && equal.value.delayMaxSec === 10, canon(equal));
    const inverted = validateTargetInput({ delayMinSec: "20", delayMaxSec: "10", timingFrom: "STAKE", reactTo: "FIRST" });
    ok("10.delay · min above max is N2-b on delayMinSec",
      !inverted.ok && same(inverted.errors, [{ field: "delayMinSec", code: "CROSS", message: "Minimum delay can't be above maximum delay.", rule: "N2-b" }]), canon(inverted));
    const badEnum = validateTargetInput({ delayMinSec: "10", delayMaxSec: "10", timingFrom: "LATER", reactTo: "FIRST" });
    ok("10.delay · an unknown timing choice is refused on its field", !badEnum.ok && badEnum.errors.some((e) => e.field === "timingFrom" && e.message === "Choose one of the options."));
  }

  // Enter now (N1 §5).
  {
    const en = effectiveTiming(rulesOf(enterNowOn), CTX);
    ok("10.EN · the Enter now line is the sealed N1 §5 sentence, {m:ss} being the polls min time to cutoff",
      en.enterNow !== "off" && en.enterNow.sentence ===
        "Enter now (polls only) places within a few seconds of your press. If 50pick is busy it keeps trying for 15 s, then gives up with nothing moved. It ignores this bot's schedule, pool band and closing-soon skip, and stays out of the last 5:00 before betting closes.",
      en.enterNow === "off" ? "off" : en.enterNow.sentence);
    ok("10.EN · …and \"off\" while Enter now is off", effectiveTiming(rulesOf(), CTX).enterNow === "off");
  }

  // Start (02 §3.3, N1 §5).
  {
    ok("10.S · the three sealed Start dialog lines, and none when neither Enter now nor targets is on",
      NO_AUTOMATIC_MODE_LINE("Bot A", { enterNow: true, targets: false }) === "Bot A has no automatic mode: it bets only when you press Enter now." &&
        NO_AUTOMATIC_MODE_LINE("Bot A", { enterNow: true, targets: true }) === "Bot A has no automatic mode: it bets only when you press Enter now or a target reacts." &&
        NO_AUTOMATIC_MODE_LINE("Bot A", { enterNow: false, targets: true }) === "Bot A has no automatic mode: it bets only when a target reacts." &&
        NO_AUTOMATIC_MODE_LINE("Bot A", { enterNow: false, targets: false }) === null);
    const caps = capsOf({ targetsMaxActive: 5 });
    const NO_SCREENS = { enterNow: false, targeting: false };
    const ALL_SCREENS = { enterNow: true, targeting: true };
    const wrong: string[] = [];
    let rows = 0;
    let screensDecide = 0;
    for (let bits = 0; bits < 32; bits++) {
      const [pollsCounter, updownFill, pollsOpener, enterNow, targets] = [0, 1, 2, 3, 4].map((i) => (bits & (1 << i)) !== 0);
      const r = rulesOf((x) => {
        x.scope.products = { updown: true, polls: true };
        x.scope.categories = [SPORTS];
        x.scope.chains = ["BTC:3"];
        x.modes.polls.counter = pollsCounter;
        x.modes.updown.fill = updownFill;
        x.modes.polls.opener = pollsOpener;
        x.enterNow = { enabled: enterNow, thinStakeTzs: 10_000, openerStakeTzs: 2_000 };
        x.targeting.enabled = targets;
      });
      const automatic = pollsCounter || updownFill || pollsOpener;
      const byHand = enterNow || targets;
      const line = automatic ? null : NO_AUTOMATIC_MODE_LINE("Bot A", { enterNow, targets });
      const wantWarnings = line ? [line] : [];
      /* ⛔ THE NEW TRUTH (2026-09-22), row by row. Nothing on at all is ONE refusal. Otherwise each ticked product needs
       * an entry of its own: Up & Down its fill; polls its counter or opener, or a by-hand switch a SCREEN can press —
       * so an account whose only polls entry is Enter now or targets is refused on this build and allowed once the
       * screens are declared. Page order: the Up & Down mode field, the polls mode field, then the by-hand switch. */
      const want = (screens: { enterNow: boolean; targeting: boolean }): string[] => {
        if (!automatic && !byHand) return [START_COPY.noMode];
        const out: string[] = [];
        if (!updownFill) out.push(INERT_COPY.productNoMode.updown);
        if (!pollsCounter && !pollsOpener) {
          if (!byHand) out.push(INERT_COPY.productNoMode.polls);
          else if (!((enterNow && screens.enterNow) || (targets && screens.targeting))) {
            out.push(enterNow && targets ? INERT_COPY.byHandNoScreen.both : enterNow ? INERT_COPY.byHandNoScreen.enterNow : INERT_COPY.byHandNoScreen.targeting);
          }
        }
        return out;
      };
      const verdicts: boolean[] = [];
      for (const screens of [NO_SCREENS, ALL_SCREENS]) {
        const got = rulesStartProblems(r, caps, CTX, { label: "Bot A", byHandScreens: screens });
        rows++;
        verdicts.push(got.refusals.length === 0);
        if (!same(got.refusals.map((f) => f.message), want(screens)) || !same(got.warnings, wantWarnings)) {
          wrong.push(`bits ${bits} screens ${canon(screens)}: got ${canon(got)} want ${canon(want(screens))}`);
        }
      }
      if (verdicts[0] !== verdicts[1]) screensDecide++;
    }
    ok("10.S · the Start truth table over 5 booleans (polls counter, Up & Down fill, polls opener, Enter now, targets) × 2 screen settings — an account whose only polls entry is by hand is REFUSED on this build and allowed (warned) once a screen is declared",
      rows === 64 && wrong.length === 0 && screensDecide > 0, wrong[0] ?? `rows ${rows} · screens decided ${screensDecide}`);

    const min2000 = ctxWith({ stakeBounds: { minTzs: 2_000, maxTzs: LIVE_MAX } });
    const liveCaps = capsOf({ stakeMinTzs: 2_000 }, min2000);
    const raised = rulesStartProblems(rulesOf((x) => { enterNowOn(x); x.enterNow.openerStakeTzs = 1_000; }, min2000), liveCaps, min2000);
    ok("10.S · a raised platform minimum refuses Start on the Enter now opener stake, in the sealed words",
      raised.refusals.some((f) => f.field === "enterNow.openerStakeTzs" &&
        f.message === "Can't start: the platform minimum stake is now TZS 2,000; the Enter now opener stake is TZS 1,000."), canon(raised.refusals));
    const quiet = rulesStartProblems(rulesOf((x) => { x.scope.products.polls = true; x.modes.polls.counter = true; x.enterNow.openerStakeTzs = 1_000; }, min2000), liveCaps, min2000);
    ok("10.S · …and says nothing about that stake while Enter now is off", !quiet.refusals.some((f) => f.field === "enterNow.openerStakeTzs"), canon(quiet.refusals));
    /* ⛔ THE LIVE-BOUND REFUSALS HAVE ONE HOME (review finding 2026-09-22): the why-panel printed "nothing stops this
     * account" on the page whose Start refused a moved platform minimum, because these checks lived inside Start
     * alone. Start's BELOW_MIN/ABOVE_MAX refusals are now exactly `rulesLiveBoundProblems`' entries, and each entry
     * carries the VALUE and the BOUND a surface composes its own sentence from. */
    {
      const doc = rulesOf((x) => { enterNowOn(x); x.enterNow.openerStakeTzs = 1_000; }, min2000);
      const caps = capsOf({ stakeMinTzs: 1_000, freqMinGapSec: 1 }, min2000);
      const problems = rulesLiveBoundProblems(doc, caps, min2000);
      const start = rulesStartProblems(doc, caps, min2000);
      const floor = minGapFloorSec(min2000.betPlaceRefillPerMin);
      ok("10.S.live · ⛔ Start's live-bound refusals are exactly rulesLiveBoundProblems' entries — same fields, codes and sentences, in the same order — and nothing else in Start carries those codes",
        same(start.refusals.filter((f) => f.code === "BELOW_MIN" || f.code === "ABOVE_MAX"), problems.map((p) => ({ field: p.field, code: p.code, message: p.message })))
          && problems.length === 3 && floor > 1,
        canon({ problems, start: start.refusals }));
      ok("10.S.live · each entry names the saved value and the live bound it breaks: Stake min 1,000 under a 2,000 minimum, Min gap 1 under the refill floor, the Enter now opener stake 1,000 under the minimum",
        same(problems.map((p) => [p.field, p.code, p.value, p.bound]), [
          ["stakeMinTzs", "BELOW_MIN", 1_000, 2_000],
          ["freqMinGapSec", "BELOW_MIN", 1, floor],
          ["enterNow.openerStakeTzs", "BELOW_MIN", 1_000, 2_000],
        ]), canon(problems));
      const above = rulesLiveBoundProblems(doc, capsOf({ stakeMinTzs: LIVE_MAX + 1 }, min2000), min2000);
      ok("10.S.live · a Stake min above the platform maximum is ABOVE_MAX with the maximum as its bound, and a document inside every bound yields NOTHING",
        same(above.filter((p) => p.field === "stakeMinTzs").map((p) => [p.code, p.value, p.bound]), [["ABOVE_MAX", LIVE_MAX + 1, LIVE_MAX]])
          && rulesLiveBoundProblems(rulesOf((x) => enterNowOn(x), min2000), capsOf({ stakeMinTzs: 2_000 }, min2000), min2000).length === 0,
        canon(above));
    }
    const unset = Object.fromEntries(Object.keys(capsOf()).map((k) => [k, null])) as HouseBotCaps;
    const bare = rulesStartProblems(rulesOf((x) => { x.scope.products.polls = true; x.modes.polls.counter = true; }), unset, CTX);
    ok("10.S · with every cap unset, Start names exactly the 11 required caps — never a staff-chosen cap or the target maximum",
      same(bare.refusals.filter((f) => f.code === "UNSET").map((f) => f.field).sort(), [...REQUIRED_FOR_START].sort()), canon(bare.refusals));
  }

  /* ═══ scope reach — ONE predicate for the engine and the desk (prod finding 2026-09-22) ═══════════════════════════
   * Verified read-only on production: an ACTIVE account on a switched-ON desk had matched nothing, ever — both products
   * ticked, both scope lists EMPTY, [].includes(x) false on every market — and Start had refused nothing. Everything
   * below holds the predicate, its reach, the inert reasons, the save rows and Start to one truth; the class guard at
   * the end generates every combination of the twelve switches and compares Start with the engine's predicate through
   * two different paths. */
  {
    const SCOPE_CTX = { chains: CHAINS, categories: MARKET_CATEGORIES };
    const NO_SCREENS = { enterNow: false, targeting: false };
    const sports: ScopeTarget = { product: "MARKET", category: "sports" };
    const macro: ScopeTarget = { product: "MARKET", category: "macro" };
    const btc3: ScopeTarget = { product: "UPDOWN", chainKey: "BTC:3" };
    const btc10: ScopeTarget = { product: "UPDOWN", chainKey: "BTC:10" };
    const ALL_ON = { counter: true, fill: true, opener: true };
    const pollsDoc = rulesOf((r) => { r.scope.products.polls = true; r.scope.categories = [SPORTS]; r.modes.polls.counter = true; });
    const udDoc = rulesOf((r) => { r.scope.products.updown = true; r.scope.chains = ["BTC:3"]; r.modes.updown.fill = true; });
    const prodShape = (r: HouseBotRulesV1) => { r.scope.products = { updown: true, polls: true }; r.modes.updown.counter = true; r.modes.polls.counter = true; };

    // ── the predicate ──────────────────────────────────────────────────────────────────────────
    ok("10.cover · polls on + sports + counter: covers (sports, counter) and (sports, null); not macro, not fill, not an Up & Down round",
      rulesCoverTarget(pollsDoc, sports, "counter") && rulesCoverTarget(pollsDoc, sports, null) && !rulesCoverTarget(pollsDoc, macro, "counter")
        && !rulesCoverTarget(pollsDoc, sports, "fill") && !rulesCoverTarget(pollsDoc, btc3, "counter") && !rulesCoverTarget(pollsDoc, btc3, null));
    ok("10.cover · Up & Down on + BTC:3 + fill: covers (BTC:3, fill) and (BTC:3, null); not BTC:10, not counter, not a poll",
      rulesCoverTarget(udDoc, btc3, "fill") && rulesCoverTarget(udDoc, btc3, null) && !rulesCoverTarget(udDoc, btc10, "fill")
        && !rulesCoverTarget(udDoc, btc3, "counter") && !rulesCoverTarget(udDoc, sports, "fill") && !rulesCoverTarget(udDoc, sports, null));
    ok("10.cover · ⛔ THE FINDING · a ticked product with an EMPTY list covers nothing — every member, every mode, and mode null",
      (() => {
        const doc = rulesOf((r) => { r.scope.products = { updown: true, polls: true }; r.modes.updown = { ...ALL_ON }; r.modes.polls = { ...ALL_ON }; });
        const modes: (EntryMode | null)[] = [...ENTRY_MODES, null];
        return MARKET_CATEGORIES.every((c) => modes.every((m) => !rulesCoverTarget(doc, { product: "MARKET", category: c }, m)))
          && CHAINS.every((ch) => modes.every((m) => !rulesCoverTarget(doc, { product: "UPDOWN", chainKey: ch.key }, m)));
      })());
    ok("10.cover · the product switch off covers nothing, with the member listed and every mode on",
      !rulesCoverTarget(rulesOf((r) => { r.scope.categories = [SPORTS]; r.modes.polls = { ...ALL_ON }; }), sports, "counter")
        && !rulesCoverTarget(rulesOf((r) => { r.scope.chains = ["BTC:3"]; r.modes.updown = { ...ALL_ON }; }), btc3, null));

    // ── the reach: the predicate asked the other way ───────────────────────────────────────────
    {
      const reach = rulesReach(pollsDoc, SCOPE_CTX);
      ok("10.reach · polls on + sports + counter → live [{polls, counter}], categories [sports], polls.modes counter only, Up & Down nothing, by-hand off",
        same(reach.live, [{ product: "polls", mode: "counter" }]) && same(reach.polls.categories, ["sports"]) && same(reach.polls.modes, { counter: true, fill: false, opener: false })
          && reach.polls.product === true && reach.updown.product === false && reach.updown.chains.length === 0 && same(reach.updown.modes, { counter: false, fill: false, opener: false })
          && same(reach.byHand, { enterNow: false, targeting: false }), canon(reach));
      const both = rulesReach(rulesOf((r) => {
        r.scope.products = { updown: true, polls: true }; r.scope.categories = [SPORTS]; r.scope.chains = ["BTC:3", "BTC:10"];
        r.modes.polls.counter = true; r.modes.updown.opener = true; r.enterNow.enabled = true;
      }), SCOPE_CTX);
      ok("10.reach · both products: live pairs in page order (Up & Down first), both chains listed, by-hand Enter now read off the switch",
        same(both.live, [{ product: "updown", mode: "opener" }, { product: "polls", mode: "counter" }]) && same(both.updown.chains, ["BTC:3", "BTC:10"])
          && same(both.polls.categories, ["sports"]) && both.byHand.enterNow === true && both.byHand.targeting === false, canon(both));
      const empty = rulesReach(rulesOf(prodShape), SCOPE_CTX);
      ok("10.reach · ⛔ THE FINDING · the production shape (both products ticked, both lists empty, a mode on each) reaches NOTHING: live empty, both member lists empty, both product switches still reported on",
        empty.live.length === 0 && empty.polls.categories.length === 0 && empty.updown.chains.length === 0 && empty.polls.product && empty.updown.product
          && same(empty.polls.modes, { counter: false, fill: false, opener: false }), canon(empty));
      const stale = rulesReach(pollsDoc, { chains: [], categories: ["macro"] });
      ok("10.reach.c1 · CONTROL · the reach is asked over the CONTEXT's members, not the document's list: a listed category the platform no longer has reaches nothing",
        stale.live.length === 0 && stale.polls.categories.length === 0 && stale.polls.product === true, canon(stale));
    }

    // ── the reasons: one per cause, exact sentence, page order ────────────────────────────────
    const reasonsOf = (mut?: (r: HouseBotRulesV1) => void, screens = NO_SCREENS): InertReason[] => rulesInertReasons(rulesOf(mut), SCOPE_CTX, { byHandScreens: screens });
    const keyed = (rs: InertReason[]) => rs.map((r) => `${r.code}${r.product ? `:${r.product}` : ""}${r.mode ? `:${r.mode}` : ""}@${r.field}`);
    ok("10.inert · a coherent document has no reason", reasonsOf((r) => { r.scope.products.polls = true; r.scope.categories = [SPORTS]; r.modes.polls.counter = true; }).length === 0);
    ok("10.inert · the default document is NO_PRODUCT and NO_MODE, once each, on the first field of each group, with the two sealed Start sentences",
      same(reasonsOf().map((r) => [r.code, r.field, r.message]), [
        ["NO_PRODUCT", "scope.products.updown", "Choose at least one product."],
        ["NO_MODE", "modes.updown.counter", "Turn on at least one entry mode."],
      ]) && START_COPY.noProduct === INERT_COPY.noProduct && START_COPY.noMode === INERT_COPY.noMode, canon(reasonsOf()));
    ok("10.inert · ⛔ THE PRODUCTION SHAPE: exactly PRODUCT_NO_LIST twice, on the two list fields, page order, the sealed sentences",
      same(reasonsOf(prodShape).map((r) => [r.code, r.product, r.field, r.message]), [
        ["PRODUCT_NO_LIST", "updown", "scope.chains", "Up & Down is on but no chain is chosen."],
        ["PRODUCT_NO_LIST", "polls", "scope.categories", "Polls is on but no poll category is chosen."],
      ]), canon(reasonsOf(prodShape)));
    ok("10.inert · …the same shape with NO mode on adds NO_MODE once, never a per-product 'no mode' beside it",
      same(keyed(reasonsOf((r) => { r.scope.products = { updown: true, polls: true }; })), ["PRODUCT_NO_LIST:updown@scope.chains", "PRODUCT_NO_LIST:polls@scope.categories", "NO_MODE@modes.updown.counter"]),
      canon(keyed(reasonsOf((r) => { r.scope.products = { updown: true, polls: true }; }))));
    {
      const orphans = reasonsOf((r) => { r.modes.polls = { ...ALL_ON }; r.scope.products.updown = true; r.scope.chains = ["BTC:3"]; r.modes.updown.counter = true; });
      ok("10.inert · a mode on for a product that is OFF is one reason per mode, on the mode's own field, in the console's words — while the other product is live",
        same(orphans.map((r) => [r.code, r.product, r.mode, r.field, r.message]), [
          ["MODE_WITHOUT_PRODUCT", "polls", "counter", "modes.polls.counter", "React to a player's stake is on for polls, but Polls is off."],
          ["MODE_WITHOUT_PRODUCT", "polls", "fill", "modes.polls.fill", "Fill a thin side is on for polls, but Polls is off."],
          ["MODE_WITHOUT_PRODUCT", "polls", "opener", "modes.polls.opener", "Open a quiet market is on for polls, but Polls is off."],
        ]), canon(orphans));
      const half = reasonsOf((r) => { r.scope.products = { updown: true, polls: true }; r.scope.chains = ["BTC:3"]; r.scope.categories = [SPORTS]; r.modes.polls.counter = true; });
      ok("10.inert · a ticked product with a member but none of its modes on, beside a live product: PRODUCT_NO_MODE on its first mode field",
        same(half.map((r) => [r.code, r.product, r.field, r.message]), [["PRODUCT_NO_MODE", "updown", "modes.updown.counter", "Up & Down is on but no entry mode is on for Up & Down."]]), canon(half));
      const en = (r: HouseBotRulesV1) => { enterNowOn(r); };
      const tg = (r: HouseBotRulesV1) => { r.scope.products.polls = true; r.scope.categories = [SPORTS]; r.targeting.enabled = true; };
      const bothHand = (r: HouseBotRulesV1) => { enterNowOn(r); r.targeting.enabled = true; };
      ok("10.inert · polls with a category and no automatic mode, by hand only: BY_HAND_NO_SCREEN with this build's screens — the Enter now, targets and both-on sentences, on the by-hand field — and nothing once a screen can press it",
        same(reasonsOf(en).map((r) => [r.code, r.field, r.message]), [["BY_HAND_NO_SCREEN", "enterNow.enabled", INERT_COPY.byHandNoScreen.enterNow]])
          && same(reasonsOf(tg).map((r) => [r.code, r.field, r.message]), [["BY_HAND_NO_SCREEN", "targeting.enabled", INERT_COPY.byHandNoScreen.targeting]])
          && same(reasonsOf(bothHand).map((r) => [r.code, r.field, r.message]), [["BY_HAND_NO_SCREEN", "enterNow.enabled", INERT_COPY.byHandNoScreen.both]])
          && reasonsOf(en, { enterNow: true, targeting: false }).length === 0 && reasonsOf(tg, { enterNow: false, targeting: true }).length === 0
          && reasonsOf(bothHand, { enterNow: false, targeting: true }).length === 0
          && same(keyed(reasonsOf(en, { enterNow: false, targeting: true })), ["BY_HAND_NO_SCREEN:polls@enterNow.enabled"]),
        canon({ en: reasonsOf(en), tg: reasonsOf(tg), both: reasonsOf(bothHand) }));
      ok("10.inert · by hand beside a live automatic polls mode is no reason at all (an inert switch is not a refusal), and Enter now with Polls OFF is the product's problem, not the screen's",
        reasonsOf((r) => { enterNowOn(r); r.modes.polls.counter = true; }).length === 0
          && same(keyed(reasonsOf((r) => { r.enterNow = { enabled: true, thinStakeTzs: 10_000, openerStakeTzs: 2_000 }; r.scope.products.updown = true; r.scope.chains = ["BTC:3"]; })), ["PRODUCT_NO_MODE:updown@modes.updown.counter"]));
    }
    {
      /* ⛔ 453 · every sentence a reason or a save row can carry, scanned with the console's own lexicon. */
      const sentences = [
        INERT_COPY.noProduct, INERT_COPY.noMode, ...Object.values(INERT_COPY.noList), ...Object.values(INERT_COPY.productNoMode), ...Object.values(INERT_COPY.byHandNoScreen),
        ...SCOPE_PRODUCTS.flatMap((p: ScopeProduct) => ENTRY_MODES.map((m) => INERT_COPY.modeWithoutProduct(m, p))),
        ...SCOPE_PRODUCTS.flatMap((p: ScopeProduct) => ENTRY_MODES.map((m) => ruleCopy("R-MODE-PRODUCT", 0, { mode: ENTRY_MODE_WORDS[m], product: p === "polls" ? "polls" : "Up & Down", switch: p === "polls" ? "Polls" : "Up & Down" }))),
        ruleCopy("R-PRODUCT-LIST", 0), ruleCopy("R-PRODUCT-LIST", 1),
      ];
      const lexicon = consoleNeutralRegExp();
      const hits = sentences.filter((s) => lexicon.test(s));
      ok(`10.inert · ⛔ 453 · not one of the ${sentences.length} sentences a reason or a scope row can paint names the feature (the console's lexicon, the four extra words included)`,
        sentences.length >= 20 && hits.length === 0 && sentences.every((s) => s.length > 0 && !s.includes("{")), hits.join(" | "));
      ok("10.inert.c1 · CONTROL · the same lexicon fires on the field label the sentences deliberately avoid (\"Polls · Counter\"), so the zero above is a measurement",
        lexicon.test(FIELD_META["modes.polls.counter"].label) && lexicon.test("this bot cannot bet"));
    }

    // ── Start: one refusal per reason, with the Rules href; the default screens are this build's ──
    {
      const href = consoleBotTabHref("hb_x", "rules");
      const got = rulesStartProblems(rulesOf(prodShape), capsOf(), CTX, { botId: "hb_x", label: "Bot A" });
      ok("10.start · ⛔ THE PRODUCTION SHAPE is refused at Start with exactly two refusals — one per product, on its list field, code INVALID, each linking to the Rules tab",
        same(got.refusals, [
          { field: "scope.chains", code: "INVALID", message: INERT_COPY.noList.updown, href },
          { field: "scope.categories", code: "INVALID", message: INERT_COPY.noList.polls, href },
        ]) && href === "/admin/desk/hb_x?tab=rules", canon(got.refusals));
      const half = rulesStartProblems(rulesOf((r) => { prodShape(r); r.scope.categories = [SPORTS]; }), capsOf(), CTX, { botId: "hb_x" });
      ok("10.start · populating the category list with one member clears the polls refusal ONLY — Up & Down still claims a product it cannot reach",
        same(half.refusals.map((f) => [f.field, f.message]), [["scope.chains", INERT_COPY.noList.updown]]), canon(half.refusals));
      const whole = rulesStartProblems(rulesOf((r) => { prodShape(r); r.scope.categories = [SPORTS]; r.scope.chains = ["BTC:3"]; }), capsOf(), CTX, { botId: "hb_x" });
      ok("10.start · …and one chain as well leaves nothing refused", whole.refusals.length === 0, canon(whole.refusals));
      const byHandOnly = rulesOf(enterNowOn);
      const dflt = rulesStartProblems(byHandOnly, capsOf(), CTX, { label: "Bot A" });
      const withScreen = rulesStartProblems(byHandOnly, capsOf(), CTX, { label: "Bot A", byHandScreens: { enterNow: true, targeting: false } });
      ok("10.start · an Enter-now-only account is REFUSED by default — the default is BY_HAND_SCREENS, this build's honest {false, false} — and allowed, with the dialog's warning, once its screen is declared",
        same(dflt.refusals.map((f) => [f.field, f.code, f.message]), [["enterNow.enabled", "INVALID", INERT_COPY.byHandNoScreen.enterNow]])
          && same(BY_HAND_SCREENS, { enterNow: false, targeting: false })
          && withScreen.refusals.length === 0 && same(withScreen.warnings, [NO_AUTOMATIC_MODE_LINE("Bot A", { enterNow: true, targets: false })]) && same(dflt.warnings, withScreen.warnings),
        canon({ dflt, withScreen }));
      const none = rulesStartProblems(rulesOf(), capsOf(), CTX, { botId: "hb_x" });
      ok("10.start · the default document's two old refusals are still exactly two, each said once, now on a field of the form and with the href",
        same(none.refusals, [
          { field: "scope.products.updown", code: "INVALID", message: START_COPY.noProduct, href },
          { field: "modes.updown.counter", code: "INVALID", message: START_COPY.noMode, href },
        ]), canon(none.refusals));
    }

    // ── the existence tie (ruling 432(h)'s shape): a by-hand flag is true exactly when the page at its route exists ──
    {
      const pageOf = (route: string) => join(ROOT, "src/app", route, "page.tsx");
      const untied = (flags: Record<string, boolean>, routes: Record<string, string>, exists: (p: string) => boolean): string[] =>
        Object.keys(routes).filter((k) => flags[k] !== exists(pageOf(routes[k])));
      const routes = Object.values(BY_HAND_SCREEN_ROUTES);
      ok("10.byhand · ⛔ BY_HAND_SCREENS is tied by existence: each flag equals whether src/app<route>/page.tsx exists on disk, for both keys, both routes under the console's own account page",
        untied(BY_HAND_SCREENS, BY_HAND_SCREEN_ROUTES, existsSync).length === 0 && same(Object.keys(BY_HAND_SCREENS).sort(), ["enterNow", "targeting"])
          && same(Object.keys(BY_HAND_SCREEN_ROUTES).sort(), ["enterNow", "targeting"]) && routes.every((r) => r.startsWith("/admin/desk/[id]/")) && new Set(routes).size === 2,
        canon({ BY_HAND_SCREENS, BY_HAND_SCREEN_ROUTES, untied: untied(BY_HAND_SCREENS, BY_HAND_SCREEN_ROUTES, existsSync) }));
      ok("10.byhand.c1 · CONTROL · a planted true flag with no page is reported, and a planted false flag beside a page that exists is reported too — the tie refuses both directions",
        same(untied({ enterNow: true, targeting: false }, BY_HAND_SCREEN_ROUTES, existsSync), ["enterNow"])
          && same(untied({ enterNow: false, targeting: false }, BY_HAND_SCREEN_ROUTES, () => true), ["enterNow", "targeting"]));
      /* ⛔ AND THE FORM'S PROSE FOLLOWS THE FLAGS: while neither screen exists the console says so above the two switches. */
      const gate = readFileSync(join(ROOT, "src/lib/server/house-console-read.ts"), "utf8");
      const saysNoScreen = /No screen on this build can do that yet/.test(gate);
      ok("10.byhand · the rules form's by-hand note says no screen exists exactly while both flags are false — a flag that flips without the sentence, or the sentence without the flag, is reported",
        saysNoScreen === (!BY_HAND_SCREENS.enterNow && !BY_HAND_SCREENS.targeting), `says no screen: ${saysNoScreen} · flags ${canon(BY_HAND_SCREENS)}`);
    }

    // ── the engine reads the scope through the one predicate only (a source pin on decide.ts, with its control) ──
    {
      const decideSrc = decomment(readFileSync(join(ROOT, "src/lib/server/house-bot/decide.ts"), "utf8"));
      const importsIt = /import \{[^}]*\brulesCoverTarget\b[^}]*\} from "@\/lib\/house-bot\/rules"/.test(decideSrc);
      const LIST_READ = /scope\.(chains|categories)/;
      const calls = (decideSrc.match(/\brulesCoverTarget\(/g) ?? []).length;
      ok("10.engine · decide.ts value-imports rulesCoverTarget, calls it at its three sites (the Up & Down and polls halves of rulesCover, the target's scope) and reads NEITHER scope list itself — so the desk and the engine cannot disagree about what a document covers",
        importsIt && !LIST_READ.test(decideSrc) && calls === 3, `imports ${importsIt} · list reads ${LIST_READ.test(decideSrc)} · calls ${calls}`);
      ok("10.engine.c1 · CONTROL · the body this pin replaced — a direct .includes over the document's own list — is what the list-read sweep reports, and the delegate is not",
        LIST_READ.test("(r.scope.chains as string[]).includes(view.round.chainKey)") && LIST_READ.test("(targetBot.rules.scope.categories as string[]).includes(view.category)")
          && !LIST_READ.test("rulesCoverTarget(r, { product: \"UPDOWN\", chainKey: view.round.chainKey }, mode)"));
      /* ⛔ AND THE PLANNER'S TARGET SWEEP (review finding 2026-09-22): `endTargets` restated "polls on and the category
       * listed" by hand — the one direct list read left outside rules.ts, and the one this pin could not see while it
       * read decide.ts alone. The whole engine directory is swept now, file by file, and every file that names a scope
       * list is reported. */
      const engineDir = join(ROOT, "src/lib/server/house-bot");
      const engineFiles = readdirSync(engineDir).filter((f) => f.endsWith(".ts"));
      const listReaders = engineFiles.filter((f) => LIST_READ.test(decomment(readFileSync(join(engineDir, f), "utf8"))));
      const plannerSrc = decomment(readFileSync(join(engineDir, "planner.ts"), "utf8"));
      ok("10.engine · no file under src/lib/server/house-bot/ reads either scope list itself — planner.ts included, which now asks rulesCoverTarget (value-imported, one call) to end a target the scope no longer covers",
        engineFiles.length >= 10 && listReaders.length === 0
          && /import \{[^}]*\brulesCoverTarget\b[^}]*\} from "@\/lib\/house-bot\/rules"/.test(plannerSrc)
          && (plannerSrc.match(/\brulesCoverTarget\(/g) ?? []).length === 1
          && /if \(!rulesCoverTarget\(r, \{ product: "MARKET", category: view!\.category \}, null\)\) cause = "OUT_OF_SCOPE";/.test(plannerSrc),
        `files ${engineFiles.length} · list readers ${canon(listReaders)}`);
    }

    // ── ⭐ THE CLASS GUARD · every combination of the twelve switches, Start against the engine's predicate ──
    {
      const caps = capsOf({ targetsMaxActive: 5 });
      const ALL_SCREENS = { enterNow: true, targeting: true };
      const targetsOf = (p: ScopeProduct): ScopeTarget[] =>
        p === "updown" ? CHAINS.map((c) => ({ product: "UPDOWN", chainKey: c.key })) : MARKET_CATEGORIES.map((c) => ({ product: "MARKET", category: c }));
      const wrong: string[] = [];
      let n = 0, allowedNone = 0, allowedAll = 0, prodShapeVerdict: boolean | null = null;
      for (let bits = 0; bits < 4096; bits++) {
        const b = (i: number) => (bits & (1 << i)) !== 0;
        const doc = rulesOf((r) => {
          r.scope.products = { updown: b(0), polls: b(1) };
          r.modes.updown = { counter: b(2), fill: b(3), opener: b(4) };
          r.modes.polls = { counter: b(5), fill: b(6), opener: b(7) };
          r.scope.categories = b(8) ? [SPORTS] : [];
          r.scope.chains = b(9) ? ["BTC:3"] : [];
          r.enterNow = { enabled: b(10), thinStakeTzs: 10_000, openerStakeTzs: 2_000 };
          r.targeting.enabled = b(11);
        });
        /* THE ORACLE: the engine's own predicate, asked DIRECTLY over the context's lists — never rulesReach, so the
         * start check and the engine predicate meet through two different paths. Start allows exactly when some product
         * is ticked, every ticked product reaches a member with a mode that is on (polls also through a by-hand switch a
         * screen can press, over a member the product lists), and no mode is on for a product that is off. */
        const reaches = (p: ScopeProduct) => targetsOf(p).some((t) => ENTRY_MODES.some((m) => rulesCoverTarget(doc, t, m)));
        const listed = (p: ScopeProduct) => targetsOf(p).some((t) => rulesCoverTarget(doc, t, null));
        const orphan = SCOPE_PRODUCTS.some((p: ScopeProduct) => !doc.scope.products[p] && ENTRY_MODES.some((m) => doc.modes[p][m]));
        const someProduct = doc.scope.products.updown || doc.scope.products.polls;
        for (const screens of [NO_SCREENS, ALL_SCREENS]) {
          const usable = (doc.enterNow.enabled && screens.enterNow) || (doc.targeting.enabled && screens.targeting);
          const updownOk = !doc.scope.products.updown || reaches("updown");
          const pollsOk = !doc.scope.products.polls || reaches("polls") || (listed("polls") && usable);
          const expectAllowed = someProduct && updownOk && pollsOk && !orphan;
          const got = rulesStartProblems(doc, caps, CTX, { byHandScreens: screens });
          const allowed = got.refusals.length === 0;
          n++;
          if (allowed) { if (screens === NO_SCREENS) allowedNone++; else allowedAll++; }
          if (bits === 0b0000_0010_0011 && screens === NO_SCREENS) prodShapeVerdict = allowed; // both products, counter on each, both lists empty
          if (allowed !== expectAllowed) wrong.push(`bits ${bits.toString(2).padStart(12, "0")} screens ${screens.enterNow}: Start ${allowed ? "allows" : canon(got.refusals.map((f) => f.message))}, the predicate says ${expectAllowed}`);
          const inert = rulesInertReasons(doc, SCOPE_CTX, { byHandScreens: screens });
          /* The WIRING clause: Start pushes every inert reason, in order. It compares Start with the function Start is
           * built on, so on its own it is f(x) = f(x) (review finding 2026-09-22); the independent clause is below. */
          if (!same(got.refusals.map((f) => f.message), inert.map((r) => r.message))) wrong.push(`bits ${bits}: Start's refusals are not exactly the inert reasons`);
          /* ⭐ THE SECOND ORACLE: the reason SET, derived from the twelve switches by hand — never from rulesInertReasons
           * or rulesReach — as a multiset of codes. NO_PRODUCT when nothing is ticked; NO_MODE when nothing at all is on;
           * per ticked product, PRODUCT_NO_LIST when its list is empty and, while something is on somewhere, PRODUCT_NO_MODE
           * when none of its own modes is (polls: BY_HAND_NO_SCREEN instead when a by-hand switch stands in and no screen
           * can press it, nothing when one can); MODE_WITHOUT_PRODUCT once per mode on for a product that is off. */
          const wantCodes: string[] = [];
          const modesOn = (p: ScopeProduct) => ENTRY_MODES.filter((m) => doc.modes[p][m]).length;
          const anyEntry = modesOn("updown") + modesOn("polls") > 0 || doc.enterNow.enabled || doc.targeting.enabled;
          if (!someProduct) wantCodes.push("NO_PRODUCT");
          if (!anyEntry) wantCodes.push("NO_MODE");
          for (const p of SCOPE_PRODUCTS) {
            if (!doc.scope.products[p]) { for (let k = 0; k < modesOn(p); k++) wantCodes.push("MODE_WITHOUT_PRODUCT"); continue; }
            if ((p === "updown" ? doc.scope.chains : doc.scope.categories).length === 0) wantCodes.push("PRODUCT_NO_LIST");
            if (anyEntry && modesOn(p) === 0) {
              if (p === "polls" && (doc.enterNow.enabled || doc.targeting.enabled)) { if (!usable) wantCodes.push("BY_HAND_NO_SCREEN"); }
              else wantCodes.push("PRODUCT_NO_MODE");
            }
          }
          if (!same(inert.map((r) => r.code).sort(), wantCodes.sort())) wrong.push(`bits ${bits} screens ${screens.enterNow}: inert codes ${canon(inert.map((r) => r.code).sort())}, the hand-derived set says ${canon(wantCodes)}`);
        }
      }
      ok("10.class · ⭐ over all 4096 documents × 2 screen settings, Start allows EXACTLY the documents whose every ticked product reaches a member of the context through rulesCoverTarget (polls also by a by-hand switch a screen can press), with no mode on for a product that is off — its refusals are exactly the inert reasons, and the inert reasons' CODES are exactly the set derived by hand from the switches; the oracles call the engine's predicate directly or read the switches, never rulesReach",
        n === 8192 && wrong.length === 0, wrong.slice(0, 3).join(" | ") || `${n} verdicts`);
      ok("10.class.population · both verdicts occur in numbers, the screens change some verdicts, and the production shape is one of the refused",
        allowedNone >= 100 && allowedNone <= 4096 - 100 && allowedAll > allowedNone && prodShapeVerdict === false, `allowed ${allowedNone} of 4096 without screens, ${allowedAll} with · production shape allowed: ${prodShapeVerdict}`);
      /* ⛔ CONTROL · the oracle discriminates on the LIST: the production shape is refused by it, and the same document with
       * both lists filled is allowed — so a predicate that ignored the list would put the oracle and Start on different
       * sides of that row, which is what the mutation run of this commit measured. */
      const filled = rulesOf((r) => { prodShape(r); r.scope.categories = [SPORTS]; r.scope.chains = ["BTC:3"]; });
      const oracle = (d: HouseBotRulesV1) => SCOPE_PRODUCTS.every((p: ScopeProduct) => !d.scope.products[p] || targetsOf(p).some((t) => ENTRY_MODES.some((m) => rulesCoverTarget(d, t, m))));
      ok("10.class.c1 · CONTROL · the oracle refuses the production shape and allows it once both lists hold a member — it measures the list, not the switches",
        oracle(rulesOf(prodShape)) === false && oracle(filled) === true);
    }
  }
}

/* ═══ §11 · Constants — pinned before their consumers exist ═════════════════════════════════ */
section("§11 · constants");
{
  ok("11.1 · LOCK_MARGIN_MS = 7000 ≥ the largest tolerated skew + 2 s", LOCK_MARGIN_MS === 7_000 && LOCK_MARGIN_MS >= MAX_TOLERATED_SKEW_MS + 2_000);
  ok("11.2 · TARGET_ARMING_SEC = 12 ≥ tolerated skew + 2 s + the sweep's age filter",
    TARGET_ARMING_SEC === 12 && TARGET_ARMING_SEC >= MAX_TOLERATED_SKEW_MS / 1_000 + 2 + SWEEP_MIN_AGE_MS / 1_000);
  ok("11.3 · SWEEP_LOOKBACK_MS = 90,000 ≥ 60,000", SWEEP_LOOKBACK_MS === 90_000 && SWEEP_LOOKBACK_MS >= 60_000);
  ok("11.4 · staleAt offsets: Enter now 15 s, targeted 60 s, Up & Down 30 s, polls 600 s",
    STALE_AFTER_SEC.manual === 15 && STALE_AFTER_SEC.targetedCounter === 60 && STALE_AFTER_SEC.updown === 30 && STALE_AFTER_SEC.polls === 600);

  // CLAIM_TTL_SEC against the literals it depends on — read from source, and an unfound literal is a FAIL.
  const LOCK_RE = /timeout:\s*([\d_]+)[^\n]*\n\s*maxWait:\s*([\d_]+)/;
  const ADMISSION_RE = /maxWaitMs:[^\n]*\?\s*w\s*:\s*([\d_]+)/;
  const num = (s: string) => Number(s.replace(/_/g, ""));
  const lock = LOCK_RE.exec(decomment(readFileSync(join(ROOT, "src/lib/server/locks.ts"), "utf8")));
  const admission = ADMISSION_RE.exec(decomment(readFileSync(join(ROOT, "src/lib/server/admission.ts"), "utf8")));
  ok("11.5 · the lock transaction's timeout and maxWait literals are found in locks.ts", !!lock);
  ok("11.6 · the admission queue's default wait is found in admission.ts", !!admission);
  if (lock && admission) {
    const waitSec = num(admission[1]) / 1_000;
    const poolSec = num(lock[2]) / 1_000;
    const txSec = num(lock[1]) / 1_000;
    const floor = waitSec + 4 * (poolSec + txSec) + 5;
    ok(`11.7 · CLAIM_TTL_SEC ${CLAIM_TTL_SEC} ≥ ${waitSec} + 4 × (${poolSec} + ${txSec}) + 5 = ${floor}`, CLAIM_TTL_SEC >= floor);
  }
  ok("11.c1 · CONTROL · a lock options block with no numeric literal reads as unfound", !LOCK_RE.test("timeout: env.TX_TIMEOUT,\n    maxWait: env.TX_WAIT,"));

  // Every quoted house audit literal under src/ is a HOUSE_AUDIT key.
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(e)) out.push(p);
    }
    return out;
  };
  const LITERAL = /["'`](house_bot\.[a-z_]+)["'`]/g;
  const found = new Set<string>();
  for (const f of walk(join(ROOT, "src"))) for (const m of readFileSync(f, "utf8").matchAll(LITERAL)) found.add(m[1]);
  const isKey = (a: string) => Object.prototype.hasOwnProperty.call(HOUSE_AUDIT, a);
  const unknown = [...found].filter((a) => !isKey(a));
  ok(`11.8 · every quoted house audit literal under src/ is a HOUSE_AUDIT key (${found.size} distinct)`,
    found.size >= Object.keys(HOUSE_AUDIT).length && unknown.length === 0, unknown.join(", "));
  const plantedLiteral = [...`audit("house_bot.${"planted_action"}")`.matchAll(LITERAL)].map((m) => m[1]);
  ok("11.c2 · CONTROL · a planted literal is matched and is not a key", plantedLiteral.length === 1 && !isKey(plantedLiteral[0]));

  ok("11.9 · an audit payload carrying a label is refused", !isAllowedHouseAuditPayload({ label: "Bot A" }));
  ok("11.10 · a nested change {field, before: \"a\"} is refused", !isAllowedHouseAuditPayload({ changes: [{ field: "x", before: "a" }] }));
  ok("11.11 · a forbidden key at depth is refused", !isAllowedHouseAuditPayload({ counts: { name: "x" } }));
  ok("11.11b · a payload nested deeper than 8 levels is refused, whatever it holds (fail closed)",
    !isAllowedHouseAuditPayload({ counts: { a: { b: { c: { d: { e: { f: { g: { h: { label: "x" } } } } } } } } } }));
  ok("11.11c · CONTROL · a shallow nested count is allowed", isAllowedHouseAuditPayload({ counts: { a: { b: 1 } } }));
  ok("11.11d · CONTROL · a real cancel payload is allowed",
    isAllowedHouseAuditPayload({ botId: "hb_1", cancelled: [{ intentId: "hbi_1", side: "YES", stakeTzs: 1000 }] }));
  ok("11.12 · numeric and enum changes are allowed",
    isAllowedHouseAuditPayload({ botId: "hb_1", changes: [{ field: "stakeMaxTzs", before: 1_000, after: null }, { field: "timingFrom", before: "STAKE", after: "EXIT_CLOSE" }] }));

  // The two closed lists whose storage moved (removedCause is its own column) — read from the migration.
  const migrationDir = readdirSync(join(ROOT, "prisma/migrations")).find((d) => d.endsWith("_house_bot_tables"));
  const sql = migrationDir ? readFileSync(join(ROOT, "prisma/migrations", migrationDir, "migration.sql"), "utf8").replace(/--.*$/gm, "") : "";
  const checkValues = (name: string): string[] | null => {
    const head = `CONSTRAINT "${name}"`;
    const at = sql.indexOf(head);
    if (at < 0) return null;
    const rest = sql.slice(at + head.length);
    const ends = [rest.indexOf("CONSTRAINT \""), rest.indexOf(");")].filter((i) => i >= 0);
    return [...rest.slice(0, ends.length > 0 ? Math.min(...ends) : rest.length).matchAll(/'([A-Z0-9_]+)'/g)].map((m) => m[1]);
  };
  ok("11.13 · the house tables migration is found", !!migrationDir);
  ok("11.14 · HouseBot_pauseReason_check lists PAUSE_REASONS, value for value and in order",
    same(checkValues("HouseBot_pauseReason_check"), [...PAUSE_REASONS]), canon(checkValues("HouseBot_pauseReason_check")));
  ok("11.15 · HouseBot_removedCause_check lists REMOVE_CAUSES, value for value and in order",
    same(checkValues("HouseBot_removedCause_check"), [...REMOVE_CAUSES]), canon(checkValues("HouseBot_removedCause_check")));
  ok("11.16 · every PauseReason has a way-out row, and no other key does",
    PAUSE_REASONS.length === 20 && same(Object.keys(PAUSE_REASON_WAY_OUT).sort(), [...PAUSE_REASONS].sort()));
  ok("11.17 · the removal causes' History copy",
    REMOVE_CAUSE_COPY.MANUAL === "Removed by an owner." && REMOVE_CAUSE_COPY.SUNSET === "House bots were withdrawn." &&
      same(Object.keys(REMOVE_CAUSE_COPY).sort(), [...REMOVE_CAUSES].sort()));
  ok("11.c3 · CONTROL · a constraint that is not in the migration reads as unfound", checkValues("HouseBot_plantedMissing_check") === null);

  ok("11.18 · id prefixes, the event prefix among them", same(HOUSE_ID_PREFIX, { bot: "hb_", intent: "hbi_", event: "hbe_", target: "hbt_", press: "hbp_" }));
  ok("11.19 · a house bet key is hb:<intent>; an Enter now anchor is manual:<officer>:<submitId>",
    houseIntentKey("hbi_1") === "hb:hbi_1" && manualAnchorKey("usr_1", "s1") === "manual:usr_1:s1");
  ok("11.20 · a submitId is a lower-case browser UUID",
    SUBMIT_ID_RE.test("3f2b8c1e-0d4a-4c1b-9e2f-5a6b7c8d9e0f") && !SUBMIT_ID_RE.test("not-a-uuid") && !SUBMIT_ID_RE.test("3F2B8C1E-0D4A-4C1B-9E2F-5A6B7C8D9E0F"));
  ok("11.21 · a press CHECKING for 120 s is REFUSED as INTERRUPTED, with the sealed copy; the audit repair waits 60 s",
    PRESS_INTERRUPTED_AFTER_MS === 120_000 && PRESS_REFUSAL_INTERRUPTED === "INTERRUPTED" && PRESS_AUDIT_REPAIR_AFTER_MS === 60_000
      && PRESS_INTERRUPTED_COPY === "This press was interrupted before anything was saved. Nothing moved. You can try again.");
  ok("11.22 · EVENT_KINDS holds all 30, with the holder email and 2FA events and one global SUNSET",
    EVENT_KINDS.length === 30 && new Set(EVENT_KINDS).size === 30 &&
      ["HOLDER_EMAIL_CHANGED", "HOLDER_2FA_ON", "HOLDER_2FA_OFF", "SUNSET"].every((k) => (EVENT_KINDS as readonly string[]).includes(k)));
  ok("11.23 · the holder's data-rights export is the explicit 17-kind allowlist",
    same([...DSAR_HOLDER_EVENT_KINDS], [
      "DESIGNATED", "VERIFIED", "STARTED", "PAUSED", "AUTO_PAUSED", "RULES_SAVED", "REMOVED", "CREDENTIAL_CHANGED",
      "HOLDER_CAUSE_ADDED", "CONSENT_VOIDED", "HOLDER_2FA_ON", "HOLDER_2FA_OFF", "HOLDER_EMAIL_CHANGED",
      "ENTER_NOW_REQUESTED", "TARGET_ADDED", "TARGET_REMOVED", "TARGET_ENDED",
    ]) && !["SWITCH_ON", "SWITCH_OFF", "LIMITS_SAVED", "PENALTY_BOXED"].some((k) => (DSAR_HOLDER_EVENT_KINDS as readonly string[]).includes(k)));
  ok("11.24 · CREDENTIAL_CHANGED_VIA is the three password writers plus UNKNOWN", same([...CREDENTIAL_CHANGED_VIA], [...PASSWORD_CHANGE_METHODS, "UNKNOWN"]));
  ok("11.25 · live intents are PENDING and CLAIMED", same([...LIVE_INTENT_STATUSES], ["PENDING", "CLAIMED"]));
  // ⛔ D20 (ruling 265): `ALERT_KEY.staffEdge` was un-built with the staff-edge alert; the suffix machinery it used
  // is still proven by the daily, hourly and per-minute keys here and by the dal cases' `previousMonth` claim (c18).
  ok("11.26 · an EAT-suffixed alert key hands the claim a prefix and a unit, never a finished key",
    same(
      { daily: ALERT_KEY.botDaily("hb_1", "CAP_BALANCE_FLOOR"), db: ALERT_KEY.engineDb(), preview: ALERT_KEY.preview("usr_1", "hb_1", "mkt_1") },
      {
        daily: { prefix: "bot:hb_1:CAP_BALANCE_FLOOR", unit: "day" },
        db: { prefix: "engine:db", unit: "hour" },
        preview: { prefix: "preview:usr_1:hb_1:mkt_1", unit: "minute" },
      },
    ) && ALERT_KEY.poison("hbi_1") === "poison:hbi_1");

  /**
   * ⛔ **C5-SPEC RULING 258 / C4 RULING 149 · THE HOURLY SUMMARY HAS EXACTLY ONE AUDIENCE, AND THE TYPE MUST SAY SO.**
   *
   * `ALERT_KEY.summary`'s parameter read `"admins" | "holder"` for five commits after owner ruling D19c DELETED the
   * holder's hourly summary — the type went on describing a recipient this platform must never have, and
   * `docs/HOUSE-BOTS.md` cited ruling 258 as the authority for NOT carrying out ruling 258. C5-8 narrowed it.
   *
   * ⚠️ A TYPE IS NOT OBSERVABLE AT RUN TIME, so this is a SOURCE pin, and it is a source pin with a control: the
   * union is rebuilt and planted into the read text, and the matcher must report the planted file and clear the real
   * one. Without `c27` a regex that matched nothing would pass on an empty file, which is the vacuous-green shape
   * this suite exists to refuse. The comments are stripped first — this very docblock names the union it forbids.
   */
  {
    const constantsSrc = decomment(readFileSync(join(ROOT, "src/lib/house-bot/constants.ts"), "utf8"));
    const summaryLine = (text: string) => text.split("\n").find((l) => /^\s*summary:\s*\(/.test(l)) ?? "";
    const real = summaryLine(constantsSrc);
    const HOLDER_AUDIENCE = ["\"", "holder", "\""].join("");
    const planted = summaryLine(constantsSrc.replace(
      /(summary:\s*\(audience:\s*"admins")/, `$1 | ${HOLDER_AUDIENCE}`));
    ok("11.27 · the hourly summary's audience is `\"admins\"` and no union — D19c deleted the holder's summary, so a key builder that still ACCEPTS a holder audience is an invitation to mint a notice the holder may never receive",
      real.length > 0 && real.includes("audience: \"admins\"") && !real.includes(HOLDER_AUDIENCE),
      real.trim() || "no `summary:` declaration found in constants.ts");
    ok("11.27c · CONTROL · the widened union this ruling removed is planted back and REPORTED, and the real line is read and clear — so 11.27 measures that declaration and is not a regex matching nothing",
      planted.includes(HOLDER_AUDIENCE) && real.length > 0 && !real.includes(HOLDER_AUDIENCE),
      `planted: ${planted.trim() || "PLANT FAILED"}`);
  }
}

/* ═══ §12 · A3 — every pair of holder causes, cleared in both orders, keeps a way out ═══════ */
section("§12 · A3 cause pairs");
{
  type PauseReason = (typeof PAUSE_REASONS)[number];
  const CAUSE: Record<HolderCauseCode, HolderCause> = {
    ACCOUNT_CLOSED: { code: "ACCOUNT_CLOSED" },
    HOLDER_ERASURE_REQUEST: { code: "HOLDER_ERASURE_REQUEST" },
    SELF_EXCLUDED: { code: "SELF_EXCLUDED", until: null },
    COOLING_OFF: { code: "COOLING_OFF", until: "2026-09-20T00:00:00.000Z" },
    IDENTITY_REFUSED: { code: "IDENTITY_REFUSED" },
    HOLDER_WITHDREW: { code: "HOLDER_WITHDREW" },
    CONSENT_VOID: { code: "CONSENT_VOID", cause: "HOLDER_WITHDREW", at: "2026-09-10T08:00:00.000Z" },
    PASSWORD_CHANGED: { code: "PASSWORD_CHANGED", method: "SELF_CHANGE", changedAt: null },
    ACCOUNT_SUSPENDED: { code: "ACCOUNT_SUSPENDED" },
    WALLET_FROZEN: { code: "WALLET_FROZEN", reasons: [] },
    ROLE_CHANGED: { code: "ROLE_CHANGED", to: "AGENT" },
    OWNER_LOSS_LIMIT: { code: "OWNER_LOSS_LIMIT", freesAt: null },
  };
  const OFFICER_TEMP: HolderCause = { code: "PASSWORD_CHANGED", method: "OFFICER_TEMP", changedAt: null };
  const pool: HolderCause[] = [...HOLDER_CAUSES.map((c) => CAUSE[c]), OFFICER_TEMP];
  ok("12.0 · a fixture for each of the 12 holder causes, plus support's temporary password", HOLDER_CAUSES.length === 12 && HOLDER_CAUSES.every((c) => CAUSE[c].code === c));

  const name = (c: HolderCause) => (c.code === "PASSWORD_CHANGED" ? `PASSWORD_CHANGED(${c.method})` : c.code);
  const rgLocked = (cs: readonly HolderCause[]) => cs.some((c) => c.code === "SELF_EXCLUDED" || c.code === "COOLING_OFF");
  /** A real step forward exists — for a closed account, whose bot is removed, NONE is the honest answer. */
  const hasWayOut = (cs: readonly HolderCause[]) => {
    const steps = nextActions("AUTO_PAUSED", cs, rgLocked(cs));
    return cs.some((c) => c.code === "ACCOUNT_CLOSED") ? steps.some((s) => s !== "REMOVE") : steps.some((s) => s !== "REMOVE" && s !== "NONE");
  };
  let states = 0;
  const dead: string[] = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = 0; j < pool.length; j++) {
      if (i === j || pool[i].code === pool[j].code) continue;
      const [first, second] = [pool[i], pool[j]]; // clear `first`, then `second`; the (j, i) pass is the other order
      for (const cs of [[first, second], [second], []]) {
        states++;
        if (!hasWayOut(cs)) dead.push(`${name(first)} then ${name(second)} at [${cs.map(name).join(", ")}] → ${nextActions("AUTO_PAUSED", cs, rgLocked(cs)).join(",")}`);
      }
    }
  }
  ok(`12.1 · every ordered pair of causes, cleared one at a time, keeps a step other than Remove (${states} states)`,
    states === 462 && dead.length === 0, dead.slice(0, 3).join(" | "));
  ok("12.2 · no pause reason but ACCOUNT_CLOSED is a dead end",
    PAUSE_REASONS.filter((r) => r !== "ACCOUNT_CLOSED").every((r) => PAUSE_REASON_WAY_OUT[r].steps.some((s) => s !== "REMOVE" && s !== "NONE")));
  ok("12.3 · no way-out sentence genders the holder",
    Object.values(PAUSE_REASON_WAY_OUT).every((w) => !/\b(he|she|him|his|her|hers)\b/i.test(w.copy)));
  ok("12.4 · Start needs no live cause, and never on a removed bot",
    canStart("PAUSED", []) && !canStart("PAUSED", [CAUSE.OWNER_LOSS_LIMIT]) && !canStart("REMOVED", []));
  ok("12.5 · re-verify clears a password change — never over support's temporary password, never inside a responsible-gambling lock",
    canReverify("AUTO_PAUSED", [CAUSE.PASSWORD_CHANGED], false) && !canReverify("AUTO_PAUSED", [OFFICER_TEMP], false) &&
      !canReverify("AUTO_PAUSED", [CAUSE.PASSWORD_CHANGED, CAUSE.COOLING_OFF], true));
  // ⛔ CONTROL — gating on the stored reason alone offers Re-verify that a second, live cause forbids.
  const reasonOnlyGate = (reason: PauseReason) => PAUSE_REASON_WAY_OUT[reason].steps.includes("REVERIFY");
  ok("12.c1 · CONTROL · a pauseReason-only gate offers Re-verify for PASSWORD_CHANGED while a live self-exclusion forbids it",
    reasonOnlyGate("PASSWORD_CHANGED") && !canReverify("AUTO_PAUSED", [CAUSE.PASSWORD_CHANGED, CAUSE.SELF_EXCLUDED], true));
}

/* ═══ §13 · Clock — fixed EAT whatever the process timezone (04 C14, A24) ═══════════════════ */
section("§13 · clock");
{
  const r = clockReadings();
  ok("13.1 · 23:59:59.999 and 00:00:00.000 EAT are different EAT days", r.dayBefore === "2026-09-14" && r.dayAt === "2026-09-15");
  ok("13.2 · eatHourKey at 10:00Z on 14 Sep is \"2026-09-14T13\"", r.hourKey === "2026-09-14T13");
  ok("13.3 · the EAT day of 15 Sep starts at 21:00Z on the 14th", r.dayStartMs === Date.UTC(2026, 8, 14, 21));
  ok("13.4 · the minute key and the month key",
    eatMinuteKey(Date.UTC(2026, 8, 14, 10, 7, 30)) === "2026-09-14T13:07" && eatMonthKey(Date.UTC(2026, 8, 30, 21)) === "2026-10");
  {
    const at = Date.UTC(2026, 8, 30, 20, 59, 59, 999);
    ok("13.5 · each unit's key builder is the one the memory store uses",
      // C4-SPEC ruling 80 adds previousHour: an hourly summary's key names the hour summarised.
      same([...EAT_KEY_UNITS], ["day", "hour", "previousHour", "month", "previousMonth", "minute"]) &&
        eatKeyFor("previousHour", Date.UTC(2026, 8, 14, 10)) === "2026-09-14T12" &&
        eatKeyFor("previousHour", Date.UTC(2026, 8, 30, 21)) === "2026-09-30T23" &&
        eatKeyFor("day", at) === eatDayKey(at) && eatKeyFor("hour", at) === eatHourKey(at) &&
        eatKeyFor("month", at) === eatMonthKey(at) && eatKeyFor("minute", at) === eatMinuteKey(at));
    ok("13.5b · the previous-month key is the EAT month just ended, across a month and a year turn",
      eatKeyFor("previousMonth", Date.UTC(2026, 8, 30, 21)) === "2026-09" &&
        eatKeyFor("previousMonth", Date.UTC(2026, 9, 1, 20, 59, 59, 999)) === "2026-09" &&
        eatKeyFor("previousMonth", Date.UTC(2026, 8, 30, 20, 59, 59, 999)) === "2026-08" &&
        eatKeyFor("previousMonth", Date.UTC(2026, 11, 31, 21)) === "2026-12");
  }
  ok("13.6 · the SQL fragments compute every suffix from DB now() in Africa/Dar_es_Salaam",
    EAT_SQL_TIMEZONE === "Africa/Dar_es_Salaam" &&
      EAT_SQL.dayKey === `to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD')` &&
      EAT_SQL.hourKey === `to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD"T"HH24')` &&
      EAT_SQL.monthKey === `to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM')` &&
      EAT_SQL.previousMonthKey === `to_char((now() AT TIME ZONE 'Africa/Dar_es_Salaam') - interval '1 month', 'YYYY-MM')` &&
      EAT_SQL.previousHourKey === `to_char((now() AT TIME ZONE 'Africa/Dar_es_Salaam') - interval '1 hour', 'YYYY-MM-DD"T"HH24')` &&
      EAT_SQL.minuteKey === `to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD"T"HH24:MI')` &&
      EAT_KEY_UNITS.every((u) => EAT_SQL_BY_UNIT[u] === (EAT_SQL as Record<string, string>)[`${u}Key`]));
  ok("13.7 · a duration after a stake: 20 → 0:20, 307 → 5:07, 3907 → 1:05:07",
    formatAfterStake(20) === "0:20" && formatAfterStake(307) === "5:07" && formatAfterStake(3_907) === "1:05:07");
  ok("13.8 · EAT renders with English months and no zone suffix",
    r.formattedAt === "15 Sep, 00:00" && formatEat(Date.UTC(2026, 8, 14, 10, 7, 30), "HH:MM:SS") === "13:07:30" &&
      formatEat(Date.UTC(2026, 8, 14, 10), "D MMM YYYY") === "14 Sep 2026");
  ok("13.9 · EAT midnight is Tuesday, minute 0", r.weekdayAt === "TUE" && r.minuteOfDayAt === 0);
  // Two fresh processes under foreign zones. TZ is read at start-up, so it has to be a child, not an assignment.
  const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
  const eatOnly = (x: ReturnType<typeof clockReadings>) => ({
    dayBefore: x.dayBefore, dayAt: x.dayAt, dayStartMs: x.dayStartMs, hourKey: x.hourKey,
    weekdayAt: x.weekdayAt, minuteOfDayAt: x.minuteOfDayAt, formattedAt: x.formattedAt,
  });
  const ZONES: [string, number][] = [["Asia/Tokyo", -540], ["America/New_York", 300]];
  for (const [zone, offset] of ZONES) {
    const child = spawnSync(process.execPath, [tsxCli, THIS], {
      env: { ...process.env, TZ: zone, HOUSE_BOT_RULES_TZ_CHILD: "1" },
      encoding: "utf8",
      timeout: 120_000,
    });
    let got: ReturnType<typeof clockReadings> | null = null;
    try { got = JSON.parse(child.stdout ?? "") as ReturnType<typeof clockReadings>; } catch { got = null; }
    ok(`13.TZ ${zone} · the child really ran under that zone (UTC offset ${offset} min in January)`,
      !!got && got.tzOffsetMin === offset, got ? `offset ${got.tzOffsetMin}` : `status ${child.status} ${(child.stderr ?? "").slice(0, 300)}`);
    ok(`13.TZ ${zone} · every EAT reading equals this process's — the day still turns at 21:00Z`,
      !!got && same(eatOnly(got), eatOnly(r)), got ? canon(eatOnly(got)) : "no output");
    // ⛔ CONTROL — a local-time day key in that zone puts midnight somewhere else.
    ok(`13.TZ ${zone} · CONTROL · a local-time day key disagrees with EAT at one of the two instants`,
      !!got && (got.localDayBefore !== got.dayBefore || got.localDayAt !== got.dayAt), got ? `${got.localDayBefore} / ${got.localDayAt}` : "");
  }

  // The pure half of PER_HOUR (the database half is the caps suite, commit 2).
  const first = Date.UTC(2026, 8, 14, 10, 0, 31); // 13:00:31 EAT
  const last = Date.UTC(2026, 8, 14, 10, 59, 0); //  13:59:00 EAT
  const bets = Array.from({ length: 20 }, (_, i) => first + Math.round((i * (last - first)) / 19));
  const now = Date.UTC(2026, 8, 14, 11, 0, 30); //   14:00:30 EAT
  const inHour = countInRollingWindow(bets, now, 3_600_000);
  ok("13.10 · 20 bets 13:00:31–13:59:00 EAT all still count at 14:00:30", inHour === 20, `counted ${inHour}`);
  ok("13.11 · …so at 20 per hour the 21st is refused as CAP_PER_HOUR", inHour >= 20 && isCapCode("PER_HOUR") && capEngineCode("PER_HOUR") === "CAP_PER_HOUR");
  ok("13.12 · the window is (now − 60 min, now]: exactly 60 min old is out, placed now is in",
    countInRollingWindow([now - 3_600_000], now, 3_600_000) === 0 && countInRollingWindow([now], now, 3_600_000) === 1);
  ok("13.c1 · CONTROL · a clock-hour window (since 14:00 EAT) counts none of the 20 and would admit the 21st",
    bets.filter((t) => t >= Date.UTC(2026, 8, 14, 11)).length === 0);
}

/* ═══ §14 · F1 — a product line with no policy row does not compile ════════════════════════ */
section("§14 · F1 typecheck");
{
  // ⛔ Written at run time into a fresh temp folder and deleted after. A failing fixture committed under
  // scripts/ would be picked up by the repo-wide typecheck and turn it red.
  const slash = (p: string) => p.split("\\").join("/");
  const tsc = join(ROOT, "node_modules", "typescript", "bin", "tsc");
  ok("14.0 · the TypeScript compiler is installed", existsSync(tsc), tsc);
  const BAD_DIAGNOSTIC = /(^|[\\/])bad\.ts\(\d+,\d+\): error TS\d+/;
  const GOOD_DIAGNOSTIC = /(^|[\\/])good\.ts\(\d+,\d+\): error TS\d+/;
  // ⭐ bad.ts is built from the REAL declaration. A fixture that declares its own object stays green
  // when the `satisfies` clause is deleted from constants.ts, so it would prove nothing about it.
  const DECL_RE = /export const HOUSE_PRODUCT_POLICY = \{[\s\S]*?\} as const satisfies Record<ProductLine, HouseProductPolicy>;/;
  const decl = readFileSync(join(ROOT, "src/lib/house-bot/constants.ts"), "utf8").match(DECL_RE)?.[0] ?? "";
  ok("14.0b · constants.ts declares HOUSE_PRODUCT_POLICY with its satisfies clause", decl.length > 0);
  ok("14.0c · CONTROL · the declaration with the satisfies clause removed is not matched",
    !DECL_RE.test(`export const HOUSE_PRODUCT_POLICY = {\n  MARKET: "polls",\n  UPDOWN: "updown",\n} as const;\n`));
  const dir = mkdtempSync(join(tmpdir(), "house-bot-typecheck-"));
  try {
    writeFileSync(join(dir, "bad.ts"), [
      `import type { ProductLine } from "@/lib/server/market-service";`,
      `import type { HouseProductPolicy } from "@/lib/house-bot/constants";`,
      `// The real declaration, widened by a product line with no policy row. This must not compile.`,
      decl.replace("Record<ProductLine, HouseProductPolicy>", `Record<ProductLine | "JACKPOT", HouseProductPolicy>`),
      ``,
    ].join("\n"));
    writeFileSync(join(dir, "good.ts"), [
      `import { HOUSE_PRODUCT_POLICY, type HouseProductPolicy } from "@/lib/house-bot/constants";`,
      `import type { ProductLine } from "@/lib/server/market-service";`,
      `export const PLAIN: Record<ProductLine, HouseProductPolicy> = HOUSE_PRODUCT_POLICY;`,
      ``,
    ].join("\n"));
    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({
      extends: slash(join(ROOT, "tsconfig.json")),
      compilerOptions: {
        baseUrl: slash(ROOT),
        paths: { "@/*": [slash(join(ROOT, "src")) + "/*"] },
        typeRoots: [slash(join(ROOT, "node_modules", "@types"))],
        incremental: false,
        noEmit: true,
      },
      include: ["bad.ts", "good.ts"],
    }, null, 2));
    const run = existsSync(tsc)
      ? spawnSync(process.execPath, [tsc, "-p", join(dir, "tsconfig.json"), "--pretty", "false"], {
        cwd: dir, encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024,
      })
      : null;
    const out = run ? `${run.stdout ?? ""}\n${run.stderr ?? ""}` : "";
    const lines = out.split(/\r?\n/);
    const bad = lines.filter((l) => BAD_DIAGNOSTIC.test(l));
    const good = lines.filter((l) => GOOD_DIAGNOSTIC.test(l));
    ok("14.1 · tsc ran to completion and reported errors", !!run && !run.error && run.status !== 0,
      run ? `status ${run.status}${run.error ? ` · ${run.error.message}` : ""}` : "not run");
    ok("14.2 · the diagnostics name bad.ts, over the missing JACKPOT row", bad.length > 0 && out.includes("JACKPOT"), bad[0] ?? out.slice(0, 400));
    ok("14.3 · …and none names good.ts", good.length === 0, good[0] ?? "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  ok("14.4 · the fixture folder is gone afterwards", !existsSync(dir));
  // ⛔ CONTROL — the matcher that must find nothing for good.ts can find something.
  ok("14.c1 · CONTROL · a planted good.ts error line is recognised", GOOD_DIAGNOSTIC.test("C:/tmp/x/good.ts(3,14): error TS2322: planted"));
}

/* ━━ THE `rules` ROLL-CALL, AND IT MUST BE LAST — it reads the labels THIS run printed ━━━━━━━━━━━━━━━━━━
 * ⛔ RULING 505: a suite key declared in a house anchors file with no roll-call is audited by NOBODY. The
 * `rules` key arrived with `scripts/anchors/house-bot-ceremony.anchors.mjs` on 2026-09-20 and
 * `test:house-bot-reports` 0.505 reported it RED the same day — five declarations quoting labels of this
 * suite, with nothing checking those quotes still match a label this suite can print. An `expect` that
 * matches no label is classed WRONG-ASSERTION by the drive: red for the wrong reason, which inside a batch
 * run reads exactly like success.
 * ⛔ IT MUST RUN BEFORE THE FLOOR, because the floor exits the process. */
{
  const selfCode = decomment(readFileSync(fileURLToPath(import.meta.url), "utf8"));
  const LBL = "7.505 · every declared `rules` mutation names an assertion THIS run actually printed — an `expect` that matches no label can only ever report WRONG-ASSERTION";
  const LBLC = "7.505 · CONTROL · the roll-call reads this run's own labels and this suite's own source, so a drifted `expect` IS reported and an invented one is never found";
  /* ⭐ BOTH anchors files that declare a `rules` entry (the scope anchors joined on 2026-09-22 with the scope-reach
   * mutations of that day's production finding), the way the seam and comms roll-calls read theirs. */
  const input = {
    suiteKeys: ["rules"], declarations: [...CEREMONY_ANCHORS, ...SCOPE_ANCHORS] as DeclaredMutation[],
    emitted, source: selfCode, ownLabels: [LBL, LBLC],
  };
  const rc = expectDriftReport(input);
  ok(LBL, rc.declared >= 10 && rc.stale.length === 0, JSON.stringify(rc));
  const control = expectDriftControl(input, 40);
  ok(LBLC, control.pass, control.extra);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-rules: ${pass} passed, ${fail} failed`);
/**
 * ⛔ RULING 519 · THE FLOOR, AND WHY THIS SUITE HAD NONE. Ruling 515 raised every `minPass` the two-store runner
 * carries, and its own sentence says EVERY house suite's floor is checked against its last printed count. This suite is
 * not a two-store suite, so it had no floor to raise — and no floor at all is strictly worse than a stale one:
 * its `pass + fail === 0` guard refuses only the EMPTY run, so this suite could have lost all but one of
 * its cases and still exited 0.
 * The floor below is the count `npm run test:house-bot-rules` PRINTED at `670a0bc1` on 2026-09-18, in the run this commit records. It
 * only ever RISES, and only to a number a run printed — never to an arithmetic guess.
 */
/* ⭐ RAISED 521 → 525 on 2026-09-20, to what this run PRINTED. §7 stopped being a truth table over
 * `isTypedWord` — a module with zero production callers — and became eleven assertions over the two
 * ceremony comparisons the console actually ships. 7 dead assertions out, 11 live ones in: the +4 IS
 * the measurement. A build where the new §7 silently stopped running would print 514 and be refused. */
/* ⭐ RAISED 525 → 527 on 2026-09-20: the two `rules` roll-call assertions ruling 505 requires (7.505 and its
 * control). The +2 IS the measurement — this is the count the run printed, never an arithmetic guess. */
/* ⛔ MERGED 2026-09-21 (ops ← alerts), AND THE TWO FLOORS WERE RAISED FOR DIFFERENT ASSERTIONS, SO NEITHER
 * NUMBER DESCRIBES THIS TREE. From the shared base of 521 the alerts lane went to 527 (the §7 rewrite, +4,
 * then ruling 505's two roll-call assertions, +2) and the ops lane went to 523 (§11.27 and its control, +2).
 * BOTH sets of assertions are present in the merged file, so the honest floor is higher than either side's.
 * ⛔ IT WAS NOT SET BY ADDING 527 + 2. Taking the larger side and adding the smaller side's delta is exactly
 * the arithmetic guess the paragraph above forbids, and it would be wrong the moment either side's count was
 * itself approximate. The value below is the number `npm run test:house-bot-rules` PRINTED in this merged
 * tree, re-derived after the merge and not inherited from either lane. */
/* ⭐ RAISED 529 → 570 on 2026-09-22, to what this run PRINTED once the scope-reach block (§10) and the two scope rows'
 * §3 cases landed with that day's production finding. The +41 IS the measurement — the count the run printed, never
 * an arithmetic guess. */
/* ⭐ RAISED 570 → 577 on 2026-09-23, to what this run PRINTED. +4 for `R-PRODUCT-LIST`'s and the scope rows'
 * settling, and +3 for `R-COUNTER-POOL-MAX-ZERO`: the refusal itself plus its TWO discriminators — an EMPTY
 * maximum (the field's own default, meaning no ceiling) still saves, and a 0 with every counter off is inert
 * rather than contradictory and still saves. That rule is the second production finding of 2026-09-23: the
 * live account had `poolTotalMaxTzs = 0` saved with every counter on, and `decide.ts:383` refuses POOL_BAND
 * whenever `total > max` — while a COUNTER only ever answers a stake ALREADY in the pool, so the total is
 * never 0 and every counter was refused for ever. The +3 IS the measurement, never an arithmetic guess. */
const MIN_ASSERTIONS = 577;
if (pass < MIN_ASSERTIONS) {
  console.error(`\n!! FLOOR — test:house-bot-rules ran ${pass} assertion(s), fewer than the ${MIN_ASSERTIONS} a green run printed. Cases that stop running are not cases that pass.`);
  process.exit(4);
}
if (pass + fail === 0) {
  console.error("!! ZERO assertions ran — treating as failure.");
  process.exit(3);
}
process.exit(fail === 0 ? 0 : 1);
