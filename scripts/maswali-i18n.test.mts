/**
 * test:maswali-i18n — MILLIONEA SPEAKS THREE LANGUAGES, KEY FOR KEY (MASWALI-BUILD S5 pages; MASWALI-PLAN §7b S5 item 7).
 *
 *   npx tsx scripts/maswali-i18n.test.mts     (npm run test:maswali-i18n)
 *
 *   §1 the `millionea` namespace has the same keys in en, sw and zh, none empty, each with the same placeholders
 *   §2 every lookup map resolves in every language: a week's state, a ticket's shown state, a void's ground
 *   §3 every `t.millionea.<key>` the code names exists
 *   §4 the languages' own laws: Chinese is formal (您) and says 充值 for money in; nothing is left in English but the names
 *   §5 no Millionea key shares a name with another namespace's key a dictionary-wide guard counts (the away bar's)
 *
 * Pure: it imports the dictionary and the three maps, and reads source files. No server, no database, no file written.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dict } from "../src/lib/i18n-dict.ts";
import { TICKET_SHOWN_KEY, WEEK_STATE_KEY } from "../src/lib/maswali-week-label.ts";
import { MASWALI_VOID_REASON_KEY } from "../src/lib/maswali-void-reason.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LOCALES = ["en", "sw", "zh"] as const;
type Loc = (typeof LOCALES)[number];
const ns = (l: Loc) => dict[l].millionea as unknown as Record<string, unknown>;
const j = (v: unknown) => JSON.stringify(v);

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

// ── §1 · the namespace ──────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the same keys, none empty, the same placeholders");
const keysOf = (l: Loc) => Object.keys(ns(l)).sort();
const keySetDefects = (get: (l: Loc) => string[]) => {
  const en = get("en");
  return LOCALES.flatMap((l) => {
    const mine = get(l);
    const missing = en.filter((k) => !mine.includes(k)), extra = mine.filter((k) => !en.includes(k));
    return [...missing.map((k) => `${l} lacks ${k}`), ...extra.map((k) => `${l} adds ${k}`)];
  });
};
{
  const d = keySetDefects(keysOf);
  ok(`1.1 · en, sw and zh name exactly the same ${keysOf("en").length} Millionea keys`, keysOf("en").length >= 200 && d.length === 0, d.slice(0, 8).join(" | "));
  /** A word, or a list of words (the weekdays): never empty, and a list as long in every language. */
  const filled = (v: unknown) => (typeof v === "string" ? v.trim() !== "" : Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" && x.trim() !== ""));
  const empty = LOCALES.flatMap((l) => Object.entries(ns(l)).filter(([, v]) => !filled(v)).map(([k]) => `${l}.${k}`));
  const ragged = keysOf("en").filter((k) => Array.isArray(ns("en")[k]) && LOCALES.some((l) => !Array.isArray(ns(l)[k]) || (ns(l)[k] as unknown[]).length !== (ns("en")[k] as unknown[]).length));
  ok("1.2 · every value is a non-empty word, or a list of them as long in every language (the weekdays)", empty.length === 0 && ragged.length === 0, [...empty, ...ragged].join(" | "));
  const PH = /\{([A-Za-z0-9_]+)\}/g;
  const holes = (v: unknown) => [...String(v).matchAll(PH)].map((m) => m[1]).sort().filter((x, i, a) => a.indexOf(x) === i);
  const drift = keysOf("en").filter((k) => !(j(holes(ns("en")[k])) === j(holes(ns("sw")[k])) && j(holes(ns("en")[k])) === j(holes(ns("zh")[k]))));
  ok("1.3 · each key carries the same placeholders in all three languages (a dropped one prints its brace to a player)", drift.length === 0,
    drift.slice(0, 6).map((k) => `${k}: ${j(LOCALES.map((l) => holes(ns(l)[k])))}`).join(" | "));
}

// ── §2 · the lookup maps ────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · every lookup map resolves in every language");
const MAPS: Record<string, Record<string, string>> = { WEEK_STATE_KEY, TICKET_SHOWN_KEY, MASWALI_VOID_REASON_KEY };
const mapDefects = (maps: Record<string, Record<string, string>>) => Object.entries(maps).flatMap(([name, map]) =>
  Object.entries(map).flatMap(([state, key]) => LOCALES.filter((l) => typeof ns(l)[key] !== "string").map((l) => `${name}.${state} → ${l}.millionea.${key}`)));
{
  const d = mapDefects(MAPS);
  ok(`2.1 · ${Object.values(MAPS).reduce((n, m) => n + Object.keys(m).length, 0)} entries of WEEK_STATE_KEY, TICKET_SHOWN_KEY and MASWALI_VOID_REASON_KEY name a word in en, sw and zh`, d.length === 0, d.join(" | "));
  const planted = mapDefects({ ...MAPS, WEEK_STATE_KEY: { ...WEEK_STATE_KEY, OPEN: "weekStatusOpenTypo" } });
  ok("2.2 · CONTROL · a map entry naming a missing word is reported in every language", planted.length === 3 && planted.every((x) => x.startsWith("WEEK_STATE_KEY.OPEN")), j(planted));
}

// ── §3 · the code's references ──────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · every t.millionea.<key> the code names exists");
const SRC: string[] = (() => {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const n of readdirSync(join(ROOT, rel))) {
      const p = `${rel}/${n}`;
      if (statSync(join(ROOT, p)).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(n) && n !== "i18n-dict.ts") out.push(p);
    }
  };
  walk("src");
  return out;
})();
const REF = /\bt\.millionea\.([A-Za-z0-9_]+)/g;
const refDefects = (texts: Array<[string, string]>) => texts.flatMap(([f, s]) =>
  [...decomment(s).matchAll(REF)].map((m) => m[1]).filter((k) => ns("en")[k] === undefined).map((k) => `${f}: t.millionea.${k}`));
{
  const texts: Array<[string, string]> = SRC.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]);
  const named = new Set(texts.flatMap(([, s]) => [...decomment(s).matchAll(REF)].map((m) => m[1])));
  const d = refDefects(texts);
  ok(`3.1 · each of the ${named.size} Millionea keys the code names (${SRC.length} files walked) is in the dictionary`, SRC.length >= 500 && named.size >= 100 && d.length === 0, d.join(" | "));
  const planted = refDefects([["planted.tsx", "const x = t.millionea.noSuchWord;"]]);
  ok("3.2 · CONTROL · a reference to a word the dictionary lacks is reported", j(planted) === j(["planted.tsx: t.millionea.noSuchWord"]));
}

// ── §4 · the languages' own laws ────────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · formal Chinese, 充值 for money in; nothing left in English but the names");
{
  const zh = Object.entries(ns("zh")).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)] as [string, string]);
  const informal = zh.filter(([, v]) => v.includes("你")).map(([k]) => k);
  ok("4.1 · Chinese addresses the player formally (您, never 你)", informal.length === 0, informal.join(", "));
  const deposit = zh.filter(([, v]) => v.includes("存款")).map(([k]) => k);
  ok("4.2 · Chinese says 充值 for money in, never 存款", deposit.length === 0, deposit.join(", "));
  /** The names a language keeps as they are: the product's, and the Swahili word for a jackpot. */
  const SAME: Record<"sw" | "zh", string[]> = { sw: ["productTitle", "productLabel", "jackpot"], zh: ["productTitle", "productLabel"] };
  const english = (["sw", "zh"] as const).flatMap((l) => keysOf("en").filter((k) => ns(l)[k] === ns("en")[k] && !SAME[l].includes(k)).map((k) => `${l}.${k}`));
  ok("4.3 · no Swahili or Chinese word is the English left in place (the product's names aside)", english.length === 0, english.join(", "));
}

// ── §5 · no clash with a dictionary-wide guard ──────────────────────────────────────────────────────────────────────
console.log("\n§5 · no Millionea key shares the away bar's names (test:presence-class counts them across the whole dictionary)");
{
  const AWAY = ["awayTitle", "awayWon", "awayLost", "awayReturned", "awayMixed", "awayView"];
  const clash = LOCALES.flatMap((l) => AWAY.filter((k) => k in ns(l)).map((k) => `${l}.millionea.${k}`));
  ok("5.1 · the hub's result lines are named result*, never the away bar's away* (a second copy would read as three more)", clash.length === 0, clash.join(", "));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI I18N: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTS; it only rises, to a printed number. ⏳ Set from the first green run. */
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
