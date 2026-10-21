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
type NsOf = (l: Loc) => Record<string, unknown>;
/** A word, or a list of words (the weekdays): never empty, and a list as long in every language. */
const filled = (v: unknown) => (typeof v === "string" ? v.trim() !== "" : Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" && x.trim() !== ""));
const emptyDefects = (nsOf: NsOf) => {
  const empty = LOCALES.flatMap((l) => Object.entries(nsOf(l)).filter(([, v]) => !filled(v)).map(([k]) => `${l}.${k}`));
  const ragged = Object.keys(nsOf("en")).filter((k) => Array.isArray(nsOf("en")[k])
    && LOCALES.some((l) => !Array.isArray(nsOf(l)[k]) || (nsOf(l)[k] as unknown[]).length !== (nsOf("en")[k] as unknown[]).length));
  return [...empty, ...ragged.map((k) => `${k} (a list of another length)`)];
};
const PH = /\{([A-Za-z0-9_]+)\}/g;
const holes = (v: unknown) => [...String(v).matchAll(PH)].map((m) => m[1]).sort().filter((x, i, a) => a.indexOf(x) === i);
const driftDefects = (nsOf: NsOf) => Object.keys(nsOf("en")).sort()
  .filter((k) => !(j(holes(nsOf("en")[k])) === j(holes(nsOf("sw")[k])) && j(holes(nsOf("en")[k])) === j(holes(nsOf("zh")[k]))))
  .map((k) => `${k}: ${j(LOCALES.map((l) => holes(nsOf(l)[k])))}`);
/** A copy of the namespace with one language's entry changed (`undefined` removes the key) — the controls' planted copy. */
const plantedNs = (loc: Loc, key: string, value: unknown): NsOf => (l) => {
  const copy: Record<string, unknown> = { ...ns(l) };
  if (l === loc) { if (value === undefined) delete copy[key]; else copy[key] = value; }
  return copy;
};
{
  const d = keySetDefects(keysOf);
  ok(`1.1 · en, sw and zh name exactly the same ${keysOf("en").length} Millionea keys`, keysOf("en").length >= 200 && d.length === 0, d.slice(0, 8).join(" | "));
  const e = emptyDefects(ns);
  ok("1.2 · every value is a non-empty word, or a list of them as long in every language (the weekdays)", e.length === 0, e.join(" | "));
  const drift = driftDefects(ns);
  ok("1.3 · each key carries the same placeholders in all three languages (a dropped one prints its brace to a player)", drift.length === 0, drift.slice(0, 6).join(" | "));
  // ── §1's own controls: each reader on a planted copy of the namespace.
  const lacking = keySetDefects((l) => Object.keys(plantedNs("sw", "productLabel", undefined)(l)).sort());
  ok("1.1′ CONTROL · a key one language lacks is reported, in that language", j(lacking) === j(["sw lacks productLabel"]), j(lacking));
  const blank = emptyDefects(plantedNs("zh", "productTitle", " "));
  const short = emptyDefects(plantedNs("sw", "weekdays", (ns("sw").weekdays as unknown[] | undefined)?.slice(1) ?? []));
  ok("1.2′ CONTROL · a blank word, and a list one item short, are reported", j(blank) === j(["zh.productTitle"]) && short.some((x) => x.startsWith("weekdays")), j({ blank, short }));
  const dropped = driftDefects(plantedNs("sw", "resultWon", String(ns("sw").resultWon).split("{week}").join("")));
  ok("1.3′ CONTROL · a placeholder dropped from one language is reported", dropped.length === 1 && dropped[0].startsWith("resultWon:"), j(dropped));
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
/** The names a language keeps as they are: the product's, and the Swahili word for a jackpot. */
const SAME: Record<"sw" | "zh", string[]> = { sw: ["productTitle", "productLabel", "jackpot"], zh: ["productTitle", "productLabel"] };
const lawDefects = (nsOf: NsOf) => {
  const zh = Object.entries(nsOf("zh")).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)] as [string, string]);
  return {
    informal: zh.filter(([, v]) => v.includes("你")).map(([k]) => k),
    deposit: zh.filter(([, v]) => v.includes("存款")).map(([k]) => k),
    english: (["sw", "zh"] as const).flatMap((l) => Object.keys(nsOf("en")).sort()
      .filter((k) => nsOf(l)[k] === nsOf("en")[k] && !SAME[l].includes(k)).map((k) => `${l}.${k}`)),
  };
};
{
  const law = lawDefects(ns);
  ok("4.1 · Chinese addresses the player formally (您, never 你)", law.informal.length === 0, law.informal.join(", "));
  ok("4.2 · Chinese says 充值 for money in, never 存款", law.deposit.length === 0, law.deposit.join(", "));
  ok("4.3 · no Swahili or Chinese word is the English left in place (the product's names aside)", law.english.length === 0, law.english.join(", "));
  // ── §4's own controls.
  const informal = lawDefects(plantedNs("zh", "signInToBuy", `你${String(ns("zh").signInToBuy)}`)).informal;
  const deposit = lawDefects(plantedNs("zh", "slipTitle", "存款")).deposit;
  const left = lawDefects(plantedNs("sw", "resultWon", ns("en").resultWon)).english;
  ok("4.1′–4.3′ CONTROL · an informal 你, a 存款, and an English sentence left in Swahili are each reported",
    j(informal) === j(["signInToBuy"]) && j(deposit) === j(["slipTitle"]) && j(left) === j(["sw.resultWon"]), j({ informal, deposit, left }));
}

// ── §5 · no clash with a dictionary-wide guard ──────────────────────────────────────────────────────────────────────
console.log("\n§5 · no Millionea key shares the away bar's names (test:presence-class counts them across the whole dictionary)");
{
  const AWAY = ["awayTitle", "awayWon", "awayLost", "awayReturned", "awayMixed", "awayView"];
  const clashDefects = (nsOf: NsOf) => LOCALES.flatMap((l) => AWAY.filter((k) => k in nsOf(l)).map((k) => `${l}.millionea.${k}`));
  const clash = clashDefects(ns);
  ok("5.1 · the hub's result lines are named result*, never the away bar's away* (a second copy would read as three more)", clash.length === 0, clash.join(", "));
  const planted = clashDefects(plantedNs("en", "awayWon", "Millionea Week {week}: your ticket won"));
  ok("5.1′ CONTROL · an away* name back in the namespace is reported", j(planted) === j(["en.millionea.awayWon"]), j(planted));
}

// ── §6 · every "·" is the fact separator ────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · every \"·\" in a Millionea string is the fact separator, spaced on both sides (S5-FIX-PLAYER P12)");
{
  /** Each "·" in a value that is not " · ": `factsOf` splits a fact line only at " · ", so an unspaced one stays INSIDE a
   *  fact, where it can open or end a drawn line (A1) — zh `resultDetails` once read "（主余额）· 免费取消至", one fact. */
  const unspacedDefects = (nsOf: NsOf) => LOCALES.flatMap((l) => Object.entries(nsOf(l)).flatMap(([k, v]) => {
    const s = Array.isArray(v) ? v.join(" ") : String(v);
    return s.split("·").length - 1 === s.split(" · ").length - 1 ? [] : [`${l}.${k}`];
  }));
  const d = unspacedDefects(ns);
  ok("6.1 · no Millionea string holds a \"·\" its fact lines cannot split (one with no space before or after it)", d.length === 0, d.join(", "));
  const facts = (s: string) => s.split(" · ").filter((x) => x !== "");
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-SLIP, the slip critic's LOW): the stamp says its facts as the receipt's ROWS
  // now (\`details\`, as §3.7 and the Up & Down receipt do), so each row's words are ONE fact — a label, and a value — and the
  // free cancel carries its zone, as the confirm's line does ("Free cancel until 11:18 EAT").
  const rowWords = LOCALES.map((l) => [ns(l).price, ns(l).totalRow, ns(l).cancelFreeLabel, ns(l).payoutWhenSettled].map(String));
  const cancelLine = LOCALES.map((l) => facts(String(ns(l).cancelFreeUntil).replace("{time}", "11:18")));
  ok("6.2 · the cut's stamp words are one fact each in every language — the price or the total, \"free cancel until\", when the payout comes — and the free cancel is one fact that ends on its zone (zh \"免费取消至 11:18 EAT\")",
    rowWords.every((ws) => ws.every((w) => w !== "undefined" && facts(w).length === 1)) && cancelLine.every((f) => f.length === 1 && f[0].endsWith("11:18 EAT"))
      && j(cancelLine[2]) === j(["免费取消至 11:18 EAT"]), j({ rowWords, cancelLine }));
  const planted = unspacedDefects(plantedNs("zh", "resultDetails", "第{week}周 · {price}（主余额）· 免费取消至 {time}"));
  ok("6.1′ CONTROL · the old zh stamp line (\"（主余额）· 免费取消至\", the \"·\" glued to the bracket) is reported", j(planted) === j(["zh.resultDetails"]), j(planted));
}

// ── §7 · one Swahili verb per fact ──────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · Swahili says each fact with ONE verb (S5-FIX-PLAYER P14; S5-VIS-FINDINGS §D)");
{
  /**
   * §D decided the verbs: a carry is KUHAMISHA — "linahamishiwa wiki inayofuata" (moved TO a week: the applicative, the
   * week right after it, no "kwenye"), "kinachohamishwa kutoka Wiki 47" and "imehamishwa" (moved, no destination named) —
   * and a refund is KUREJESHA in its plain passive, "Imerejeshwa" ("kila tiketi imerejeshwa", "itarejeshwa"). Each form
   * agrees with its subject: an amount or a ticket is class 9 (i-), "kiasi" class 7 (ki-), tickets class 10 (zi-).
   * ⛔ The other verbs the namespace once mixed in are gone: "imeletwa mbele" / "hailetwi mbele" for a carry, and the
   * applicative "imerejeshewa" / "itarejeshewa" for a refund (a reader met two words for one fact on one page).
   */
  const verbDefects = (nsOf: NsOf) => Object.entries(nsOf("sw")).flatMap(([k, v]) => {
    const s = String(v);
    return [
      ...(/le(?:t|tw)[ai] mbele\b/.test(s) ? [`sw.${k}: a carry said with "kuleta mbele"`] : []),
      ...(/rejeshewa\b/.test(s) ? [`sw.${k}: a refund said with "-rejeshewa"`] : []),
      ...(/hamishiwa kwenye\b/.test(s) ? [`sw.${k}: "-hamishiwa kwenye" (the applicative takes its week directly)`] : []),
    ];
  });
  const d = verbDefects(ns);
  ok("7.1 · no Swahili Millionea string carries with \"kuleta mbele\" or refunds with \"-rejeshewa\" — one verb per fact", d.length === 0, d.join(" | "));
  // The decided forms, each where its fact is said (en binding; these are for Gate B's native review).
  const WANT: Array<[string, string]> = [
    ["howFour", "Hakuna 10/10? Bwawa lote linahamishiwa wiki inayofuata, bila ada."],
    ["pendingCarry", "pamoja na kiasi kinachohamishwa kutoka Wiki {week} itakapokamilika"],
    ["carriedOut", "Imehamishiwa Wiki {week}"],
    ["carriedForwardAgain", "Imehamishwa tena kwa ukamilifu"],
    ["rolloverNotice", "Wiki {prev}: hakuna tiketi ya 10/10. {amount} imehamishiwa Wiki {week}."],
    ["settledRollover", "hakuna 10/10 · {amount} imehamishwa"],
    ["lastWeekRolled", "Wiki {week} · hakuna 10/10 · {amount} imehamishwa · ada 0"],
    ["regCarried", "{amount} imehamishwa"],
    ["topUpNote", "inalipwa, haihamishwi"],
    ["statRefunded", "Imerejeshwa"], ["refundedLine", "Imerejeshwa · {price}"],
    ["refundEach", "Kila tiketi imerejeshwa {price}"], ["regRefunded", "Kila tiketi imerejeshwa"],
    ["weekVoidedShort", "Wiki imebatilishwa · kila tiketi imerejeshwa"],
    ["refundEachIfVoid", "Ubatilishaji ukisimama, kila tiketi itarejeshwa {price}"],
  ];
  const off = WANT.filter(([k, v]) => ns("sw")[k] !== v).map(([k]) => `sw.${k}=${j(ns("sw")[k])}`);
  ok(`7.2 · the decided forms where each fact is said (${WANT.length} keys): a carry "linahamishiwa" / "imehamishiwa Wiki {week}" / "imehamishwa", a refund "Imerejeshwa" / "itarejeshwa"`, off.length === 0, off.join(" | "));
  const carry = verbDefects(plantedNs("sw", "regCarried", "{amount} imeletwa mbele"));
  const refund = verbDefects(plantedNs("sw", "regRefunded", "Kila tiketi imerejeshewa"));
  ok("7.1′ CONTROL · the old \"imeletwa mbele\" carry and the old \"imerejeshewa\" refund are each reported",
    j(carry) === j(['sw.regCarried: a carry said with "kuleta mbele"']) && j(refund) === j(['sw.regRefunded: a refund said with "-rejeshewa"']), j({ carry, refund }));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI I18N: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTS; it only rises, to a printed number: 19 (S5-FIX-PLAYER P12's §6 added three to
 *  the 16 static call sites, none in a loop). */
const MIN_ASSERTIONS = 19;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
