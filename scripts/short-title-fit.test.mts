/**
 * test:short-title-fit — THE S2 DONE-WHEN GATE (the Vodacom plan S2, 2026-09-30; ruling SJ-8; COMPLIANCE §6).
 *
 *   npm run test:short-title-fit       # the gate
 *   npm run red:short-title-fit        # its in-process red twin (--prove-red)
 *
 * The plan's Done-when is "every open market renders within 2 lines in 3 languages". ⛔ THAT CANNOT BE MEASURED ON A
 * CARD: `.mcardp-q` clamps to two lines AND has a two-line min-height, so every box measures exactly two lines and a
 * browser check could never fail (VODACOM-PLAN §0c). So the fit is a BUDGET in code points — sw/en ≤ 56, zh ≤ 28 —
 * held here, PURE: no browser, no database, and CI runs it through `test:all`. Production's open markets get a
 * separate read-only read (`qa:short-title-fit`), because this gate must never need a connection string.
 *
 *   (a) THE ONE BUDGET — `SHORT_TITLE_MAX` is declared once in src/ and equals { en 56, sw 56, zh 28 }; no other src
 *       file carries a literal budget near short-title code.
 *   (b) THE NORMALISER — each language's form, code points not UTF-16, the fold onto GSM-7, the copied-English
 *       refusal, number drift as a WARNING that strict refuses, empty → null, and a hard issue never stored.
 *   (c) WHAT A CARD SHOWS — `cardTitle` falls back to the reader's OWN full title, never to the English short one.
 *   (d) THE MIGRATIONS — additive only, exactly four nullable TEXT columns on "PredictionMarket" and on "AIPoll".
 *   (e) THE ONE FUNNEL — `createMarket` stores the four through the normalisers, and none for an Up & Down round.
 *   (f) THE SEED CATALOGUE — what every seeded LIVE market's card says today, per language. A REPORT: the fallbacks
 *       are the backfill's work, not a failure. Any seeded short title must itself be within budget.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a budget of 60, a second budget literal
 * in src, a card that falls back through `pickLocalized` over the SHORT titles, a fold that leaves an em dash, a
 * normaliser that stores a hard issue, and createMarket without its UPDOWN guard — and requires the check named for
 * it to fail. This file makes no file-writing call anywhere (comments included), so `test:red-anchors` §4 counts it
 * in the in-process class and the undeclared ceiling does not move.
 *
 * ⛔ Every non-ASCII character a check depends on is BUILT with String.fromCharCode / fromCodePoint: a pasted one can
 * silently become its plain twin in an editor, and the assertion would then test nothing.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import {
  SHORT_TITLE_MAX, SHORT_TITLE_LOCALES, HARD_ISSUES, codePoints, cleanShortTitle, normaliseShortTitle,
  normaliseShortTitleSet, shortTitleFor, cardTitle, type ShortTitleIssue,
} from "../src/lib/markets/short-title.ts";
import { foldToGsm7, encodingFor } from "../src/lib/sms-compose.ts";
import { pickLocalized } from "../src/lib/localized.ts";
import type { Locale } from "../src/lib/i18n-dict.ts";

process.exitCode = 1; // failure is the default
const PROVE_RED = process.argv.includes("--prove-red");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
/** The one file allowed to write the budget. */
const HOME = "lib/markets/short-title.ts";
const LOCALES: readonly Locale[] = ["en", "sw", "zh"];
/**
 * ⛔ THE PIN. The budget lives in `short-title.ts`; this is the one other place its numbers are written, and it is
 * here on purpose: changing the budget must be a decision somebody makes twice, never a drift nobody saw.
 */
const EXPECTED_MAX: Record<Locale, number> = { en: 56, sw: 56, zh: 28 };
const S2_COLUMNS = ["shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"];

/* ══ CHARACTERS — built, never pasted ═══════════════════════════════════════ */
const ch = (...codes: number[]) => String.fromCharCode(...codes);
const FWQ = ch(0xFF1F);                           // the full-width question mark
const HAN = ch(0x6F22);                           // one CJK ideograph (inside the BMP)
const ASTRAL = String.fromCodePoint(0x20000);     // a CJK ideograph OUTSIDE the BMP: one code point, two UTF-16 units
const EMOJI = String.fromCodePoint(0x1F600);      // one code point, two UTF-16 units
const LSQ = ch(0x2018), RSQ = ch(0x2019), LDQ = ch(0x201C), RDQ = ch(0x201D);
const EN_DASH = ch(0x2013), EM_DASH = ch(0x2014), ELLIPSIS = ch(0x2026), NBSP = ch(0x00A0), ZWSP = ch(0x200B);

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════ */
const DERBY = {
  titleEn: "Will Simba SC win the next Kariakoo Derby?",
  titleSw: "Je, Simba SC watashinda Derby ya Kariakoo ijayo?",
  titleZh: `辛巴SC会赢得下一场卡里亚库德比吗${FWQ}`,
};
const EN_SHORT = "Will Simba win the derby?";
const SW_SHORT = "Je, Simba watashinda derby?";
const ZH_SHORT = `辛巴会赢德比吗${FWQ}`;
const BTC = "Will Bitcoin close above $80,000 at end of week?";
const CTX = {
  en: { full: DERBY.titleEn, englishFull: DERBY.titleEn },
  sw: { full: DERBY.titleSw, englishFull: DERBY.titleEn },
  zh: { full: DERBY.titleZh, englishFull: DERBY.titleEn },
};

const show = (v: unknown) => JSON.stringify(v);
const sameSet = (a: readonly string[], b: readonly string[]) => {
  const x = [...new Set(a)].sort(), y = [...new Set(b)].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/* ══ SOURCE — read once, decommented, so a guard never matches the paragraph explaining a fix ═══════════════ */
type SrcFile = { rel: string; text: string };
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
const SRC_FILES: SrcFile[] = walk(SRC).map((p) => ({
  rel: relative(SRC, p).split("\\").join("/"),
  text: decomment(readFileSync(p, "utf8")),
}));
const SERVICE_SRC = SRC_FILES.find((f) => f.rel === "lib/server/market-service.ts")?.text ?? "";

/**
 * (a)'s census. `declaredIn` — every src file that DECLARES `SHORT_TITLE_MAX`. `strays` — outside its home, the
 * budget's own shape (`en: 56`, `zh: 28`) anywhere, or a bare 56 / 28 within two lines of short-title code. The
 * generator's prompt, the admin counter and every writer must READ the constant, never restate it.
 */
const NEAR_SHORT = /shortTitle|SHORT_TITLE|short-title|short title/i;
function budgetCensus(files: readonly SrcFile[]): { declaredIn: string[]; strays: string[] } {
  const declaredIn = files.filter((f) => /\b(?:const|let|var)\s+SHORT_TITLE_MAX\b/.test(f.text)).map((f) => f.rel);
  const strays: string[] = [];
  for (const f of files) {
    if (f.rel === HOME) continue;
    const shape = /\b(?:en|sw|zh)\s*:\s*(?:56|28)\b/.exec(f.text);
    if (shape) strays.push(`${f.rel}: "${shape[0]}" (the budget's own shape)`);
    const lines = f.text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!/\b(?:56|28)\b/.test(line)) return;
      if (NEAR_SHORT.test(lines.slice(Math.max(0, i - 2), i + 3).join("\n"))) strays.push(`${f.rel}:${i + 1}: ${line.trim().slice(0, 90)}`);
    });
  }
  return { declaredIn, strays };
}

/** (d)'s check: a migration that only ever ADDS nullable columns. Comments are stripped first. */
type Additive = { ok: boolean; why: string[]; adds: Map<string, Map<string, string>> };
const BANNED_SQL = /\b(?:NOT\s+NULL|DROP|UPDATE|RENAME|DELETE|TRUNCATE|DEFAULT|INSERT|CREATE|ALTER\s+COLUMN)\b/gi;
function additive(sql: string): Additive {
  const body = sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
  const why: string[] = [];
  const banned = body.match(BANNED_SQL) ?? [];
  if (banned.length) why.push(`names ${[...new Set(banned.map((b) => b.toUpperCase().replace(/\s+/g, " ")))].join(", ")}`);
  const adds = new Map<string, Map<string, string>>();
  for (const stmt of body.split(";").map((s) => s.trim()).filter(Boolean)) {
    if (/^SET\s+LOCAL\s+lock_timeout\s*=\s*'\d+m?s'$/i.test(stmt)) continue;
    const t = /^ALTER\s+TABLE\s+"(\w+)"\s+([\s\S]+)$/i.exec(stmt);
    if (!t) { why.push(`an unexpected statement: ${stmt.replace(/\s+/g, " ").slice(0, 60)}`); continue; }
    const cols = adds.get(t[1]) ?? new Map<string, string>();
    adds.set(t[1], cols);
    for (const clause of t[2].split(",").map((c) => c.trim())) {
      const c = /^ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"(\w+)"\s+(\w+)$/i.exec(clause);
      if (!c) { why.push(`a clause that is not a bare ADD COLUMN: ${clause.replace(/\s+/g, " ").slice(0, 60)}`); continue; }
      cols.set(c[1], c[2].toUpperCase());
    }
  }
  return { ok: why.length === 0, why, adds };
}
const showAdds = (a: Additive) => [...a.adds].map(([t, cols]) => `${t}(${[...cols].map(([c, ty]) => `${c} ${ty}`).join(", ")})`).join(" · ");

/** (e)'s region: `createMarket`, from its declaration to the next top-level export. */
function createMarketBody(src: string): string {
  const at = src.indexOf("export async function createMarket(");
  if (at < 0) return "";
  const next = src.indexOf("\nexport ", at + 1);
  return src.slice(at, next < 0 ? undefined : next);
}

/** (f)'s parser: the object literals of `seedDemoMarkets`'s `seed` array, string-aware, and their string fields. */
type Seed = Partial<Record<"titleEn" | "titleSw" | "titleZh" | "shortTitleEn" | "shortTitleSw" | "shortTitleZh" | "competition" | "productLine", string>>;
function skipString(s: string, i: number): number {
  const q = s[i];
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === "\\") { j++; continue; }
    if (s[j] === q) return j;
  }
  return s.length;
}
function seedCatalogue(src: string): Seed[] {
  const fn = src.indexOf("export async function seedDemoMarkets(");
  const decl = fn < 0 ? -1 : src.indexOf("const seed: CreateMarketInput[] = [", fn);
  if (decl < 0) return [];
  const objects: string[] = [];
  let sq = 0, curly = 0, start = -1;
  for (let i = src.indexOf("= [", decl) + 2; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") { i = skipString(src, i); continue; }
    if (c === "[") sq++;
    else if (c === "]") { sq--; if (sq === 0) break; }
    else if (c === "{") { if (curly === 0 && sq === 1) start = i; curly++; }
    else if (c === "}") { curly--; if (curly === 0 && sq === 1 && start >= 0) { objects.push(src.slice(start, i + 1)); start = -1; } }
  }
  const KEYS = /\b(titleEn|titleSw|titleZh|shortTitleEn|shortTitleSw|shortTitleZh|competition|productLine)\s*:\s*("(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*')/g;
  return objects.map((o) => {
    const out: Seed = {};
    for (const m of o.matchAll(KEYS)) {
      let v: string;
      try { v = m[2].startsWith('"') ? JSON.parse(m[2]) : m[2].slice(1, -1).replace(/\\'/g, "'"); } catch { v = m[2].slice(1, -1); }
      out[m[1] as keyof Seed] = v;
    }
    return out;
  });
}

/* ══ THE CHECKS — one function of the implementation, so --prove-red can hand it a defective one ═══════════ */
type Impl = {
  MAX: Readonly<Record<Locale, number>>;
  normalise: typeof normaliseShortTitle;
  cardTitle: typeof cardTitle;
  fold: (text: string) => string;
  serviceSrc: string;
  srcFiles: readonly SrcFile[];
};

function run(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const stored = (r: { value: string | null; issues: readonly string[] }, v: string) => r.value === v && r.issues.length === 0;

  /* ── (a) ─────────────────────────────────────────────────────────────── */
  log("\n(a) THE ONE BUDGET");
  {
    ok("a.budget · SHORT_TITLE_MAX is exactly { en: 56, sw: 56, zh: 28 }, counted in code points",
      Object.keys(impl.MAX).length === 3 && LOCALES.every((l) => impl.MAX[l] === EXPECTED_MAX[l]), show(impl.MAX));
    ok("a.locales · SHORT_TITLE_LOCALES is en, sw, zh — every language a card speaks has a budget",
      SHORT_TITLE_LOCALES.length === 3 && LOCALES.every((l) => SHORT_TITLE_LOCALES.includes(l)), show(SHORT_TITLE_LOCALES));
    const c = budgetCensus(impl.srcFiles);
    ok(`a.census · SHORT_TITLE_MAX is declared once (in ${HOME}) and no other src file writes a budget near short-title code`,
      c.declaredIn.length === 1 && c.declaredIn[0] === HOME && c.strays.length === 0,
      `declared in [${c.declaredIn.join(", ")}] · strays: ${c.strays.slice(0, 4).join(" | ") || "none"}`);
    const probe = budgetCensus([{ rel: "lib/probe.ts", text: 'export const COUNTER = { field: "shortTitleSw",\n  max: 56 };' }]);
    ok(`a.census.c · CONTROL · the census walked src/ (${impl.srcFiles.length} files) and its detector flags a planted literal`,
      impl.srcFiles.length > 200 && probe.strays.length > 0, `${impl.srcFiles.length} files · probe flagged ${probe.strays.length}`);
  }

  /* ── (b) ─────────────────────────────────────────────────────────────── */
  log("\n(b) THE NORMALISER — per language, in code points, folded onto GSM-7");
  {
    const n = impl.normalise;
    // FORM
    const swOk = n("sw", SW_SHORT, CTX.sw);
    const swNoJe = n("sw", "Simba watashinda derby?", CTX.sw);
    const swNoQ = n("sw", "Je, Simba watashinda derby", CTX.sw);
    ok('b.sw-form · a Swahili short title in the deck\'s "Je, …?" form is stored as written', stored(swOk, SW_SHORT), show(swOk));
    ok('b.sw-form.refuse · …and one without "Je, " or without the "?" is refused as form and stored as nothing',
      [swNoJe, swNoQ].every((r) => r.value === null && r.issues.includes("form")), show([swNoJe, swNoQ]));
    const enOk = n("en", EN_SHORT, CTX.en);
    const enNoQ = n("en", "Will Simba win the derby", CTX.en);
    ok('b.en-form · an English short title is a question ending in "?", and one that is not is refused as form',
      stored(enOk, EN_SHORT) && enNoQ.value === null && enNoQ.issues.includes("form"), show([enOk, enNoQ]));
    const zhFull = n("zh", ZH_SHORT, CTX.zh);
    const zhAscii = n("zh", "辛巴会赢德比吗?", CTX.zh);
    const zhNone = n("zh", "辛巴会赢德比吗", CTX.zh);
    ok("b.zh-form · a Chinese short title ends in the full-width question mark or in \"?\", and one ending in neither is refused",
      stored(zhFull, ZH_SHORT) && stored(zhAscii, "辛巴会赢德比吗?") && zhNone.value === null && zhNone.issues.includes("form"),
      show([zhFull, zhAscii, zhNone]));

    // CODE POINTS, NOT UTF-16
    const zh28 = HAN.repeat(27) + FWQ, zh29 = HAN.repeat(28) + FWQ;
    const r28 = n("zh", zh28, CTX.zh), r29 = n("zh", zh29, CTX.zh);
    ok("b.codepoints.zh · a Chinese short title of 28 code points passes and one of 29 is refused as too_long",
      codePoints(zh28) === 28 && stored(r28, zh28) && r29.value === null && r29.issues.includes("too_long"),
      show({ at28: r28.issues, at29: r29.issues }));
    const astral = ASTRAL.repeat(27) + FWQ;
    const ra = n("zh", astral, CTX.zh);
    ok("b.codepoints.utf16 · 28 code points that are 55 UTF-16 units still pass — the budget counts what a reader counts, not String.length",
      astral.length === 55 && codePoints(astral) === 28 && stored(ra, astral), `length ${astral.length} · ${show(ra.issues)}`);
    const withEmoji = EMOJI + HAN.repeat(26) + FWQ;
    const re = n("zh", withEmoji, CTX.zh);
    ok("b.codepoints.emoji · an emoji counts ONCE: 28 code points with an emoji among them pass",
      codePoints(EMOJI) === 1 && EMOJI.length === 2 && codePoints(withEmoji) === 28 && stored(re, withEmoji), show(re.issues));
    const en56 = "Will " + "a".repeat(50) + "?", en57 = "Will " + "a".repeat(51) + "?";
    const sw56 = "Je, " + "a".repeat(51) + "?", sw57 = "Je, " + "a".repeat(52) + "?";
    const [e56, e57, s56, s57] = [n("en", en56, CTX.en), n("en", en57, CTX.en), n("sw", sw56, CTX.sw), n("sw", sw57, CTX.sw)];
    ok("b.budget.en-sw · English and Swahili: 56 code points pass, 57 are refused as too_long",
      en56.length === 56 && sw56.length === 56 && stored(e56, en56) && stored(s56, sw56)
        && e57.value === null && e57.issues.includes("too_long") && s57.value === null && s57.issues.includes("too_long"),
      show([e56.issues, e57.issues, s56.issues, s57.issues]));

    // THE FOLD
    const raw = `A${LSQ}b${RSQ}c${LDQ}d${RDQ}e${EN_DASH}f${EM_DASH}g${ELLIPSIS}h${NBSP}i`;
    const folded = impl.fold(raw);
    ok("b.fold · foldToGsm7 turns curly quotes, the en and em dashes, the ellipsis and a no-break space into their GSM-7 twins",
      encodingFor(raw) === "UCS2" && folded === `A'b'c"d"e-f-g...h i` && encodingFor(folded) === "GSM7", show(folded));
    const pasted = `Will Simba${RSQ}s side win${NBSP}${EN_DASH} or draw${ELLIPSIS}?`;
    const rp = n("en", pasted, CTX.en);
    ok("b.fold.normalise · …so a short title pasted with them is stored folded, with no not_gsm7",
      rp.value === "Will Simba's side win - or draw...?" && rp.issues.length === 0, show(rp));
    const rEmoji = n("en", `Will Simba win ${EMOJI}?`, CTX.en);
    ok("b.fold.refuse · a character with no GSM-7 twin survives the fold and is refused as not_gsm7",
      rEmoji.value === null && rEmoji.issues.includes("not_gsm7"), show(rEmoji));

    // NOT ENGLISH IN DISGUISE (F8)
    const copyFull = n("sw", DERBY.titleEn, CTX.sw);
    ok("b.copied-english.full · a Swahili short title equal to the English FULL title is refused as copied_english",
      copyFull.value === null && copyFull.issues.includes("copied_english"), show(copyFull));
    const copies = normaliseShortTitleSet({ ...DERBY, shortTitleEn: EN_SHORT, shortTitleSw: EN_SHORT, shortTitleZh: EN_SHORT });
    ok("b.copied-english.short · …and one equal to the English SHORT title is refused too (Swahili and Chinese), while the English one is kept",
      copies.shortTitleEn === EN_SHORT && copies.shortTitleSw === null && copies.issues.sw.includes("copied_english")
        && copies.shortTitleZh === null && show(copies.issues.zh) === show(["copied_english"]),
      show(copies));
    const real = normaliseShortTitleSet({ ...DERBY, shortTitleEn: EN_SHORT, shortTitleSw: SW_SHORT, shortTitleZh: ZH_SHORT });
    ok("b.copied-english.c · CONTROL · real Swahili and Chinese short titles beside it are kept",
      real.shortTitleSw === SW_SHORT && real.shortTitleZh === ZH_SHORT, show(real));

    // NUMBER DRIFT — a warning
    const bctx = { full: BTC, englishFull: BTC };
    const drift = n("en", "Will Bitcoin close above $90,000?", bctx);
    const strict = n("en", "Will Bitcoin close above $90,000?", bctx, { strict: true });
    const noDrift = n("en", "Will Bitcoin top $80,000 this week?", bctx);
    ok("b.number-drift · a number the full title does not contain is a WARNING: number_drift, not hard, still stored",
      show(drift.issues) === show(["number_drift"]) && drift.hard === false && drift.value === "Will Bitcoin close above $90,000?"
        && !HARD_ISSUES.has("number_drift"), show(drift));
    ok("b.number-drift.strict · …and strict (the AI, the backfill) refuses it — a machine does not accept its own drift",
      strict.value === null && strict.hard === true && strict.issues.includes("number_drift"), show(strict));
    ok("b.number-drift.c · CONTROL · a number the full title DOES contain is no drift", stored(noDrift, "Will Bitcoin top $80,000 this week?"), show(noDrift));

    // EMPTY → NULL
    const empties: unknown[] = ["", "   ", ZWSP, `${ZWSP} ${NBSP}`, null, undefined, 42];
    const er = empties.map((v) => n("sw", v, CTX.sw));
    ok("b.empty · an empty value (blank, whitespace, zero-width only, not a string) is null with NO issues — simply no short title",
      er.every((r) => r.value === null && r.issues.length === 0 && r.hard === false), show(er));

    // A HARD ISSUE IS NEVER STORED
    const hard = [
      n("en", en57, CTX.en),
      n("en", `Will Simba win ${EMOJI}?`, CTX.en),
      n("sw", "Simba watashinda derby?", CTX.sw),
      n("zh", EN_SHORT, { ...CTX.zh, englishShort: EN_SHORT }),
    ];
    ok("b.hard-null · a value with a HARD issue is never stored, even non-strict: too_long, not_gsm7, form, copied_english → null",
      hard.every((r) => r.value === null && r.hard === true), show(hard));
    ok("b.hard-set · HARD_ISSUES is exactly too_long, not_gsm7, form, copied_english — number_drift stays a warning",
      HARD_ISSUES.size === 4 && (["too_long", "not_gsm7", "form", "copied_english"] as ShortTitleIssue[]).every((i) => HARD_ISSUES.has(i)),
      show([...HARD_ISSUES]));
  }

  /* ── (c) ─────────────────────────────────────────────────────────────── */
  log("\n(c) WHAT A CARD SHOWS — the reader's own short title, else the reader's OWN full title");
  {
    const M = { ...DERBY, shortTitleEn: EN_SHORT, shortTitleSw: null, shortTitleZh: null };
    const sw = impl.cardTitle("sw", M), zh = impl.cardTitle("zh", M), en = impl.cardTitle("en", M);
    ok("c.own-full · a Swahili reader with no Swahili short title gets the SWAHILI FULL title — never the English short one",
      sw.text === DERBY.titleSw && sw.short === false && sw.text !== EN_SHORT, show(sw));
    ok("c.own-full.zh · …and a Chinese reader gets the CHINESE full title", zh.text === DERBY.titleZh && zh.short === false, show(zh));
    ok("c.short.en · the English reader gets the English short title, marked short", en.text === EN_SHORT && en.short === true, show(en));
    const swShort = impl.cardTitle("sw", { ...M, shortTitleSw: SW_SHORT });
    ok("c.short · with a short title in the reader's language the card shows it, marked short",
      swShort.text === SW_SHORT && swShort.short === true, show(swShort));
    const noZh = impl.cardTitle("zh", { ...M, titleZh: null });
    ok("c.no-zh · a market with no Chinese title shows a Chinese reader the full-title fallback (the English FULL question), never the English short",
      noZh.text === DERBY.titleEn && noZh.short === false, show(noZh));
    const blank = impl.cardTitle("en", { ...M, shortTitleEn: "   " });
    ok("c.blank · a whitespace-only short title counts as none", blank.text === DERBY.titleEn && blank.short === false, show(blank));
    ok("c.exact · shortTitleFor answers in EXACTLY the language asked — no cross-language fallback",
      shortTitleFor("sw", M) === null && shortTitleFor("zh", M) === null && shortTitleFor("en", M) === EN_SHORT);
  }

  /* ── (d) ─────────────────────────────────────────────────────────────── */
  log("\n(d) THE MIGRATIONS — additive only, four nullable TEXT columns per table");
  {
    const MIG = join(ROOT, "prisma/migrations");
    const readMig = (dir: string) => {
      const p = join(MIG, dir, "migration.sql");
      return existsSync(p) ? readFileSync(p, "utf8") : null;
    };
    const market = readMig("20260930200000_market_short_titles");
    const poll = readMig("20260930200100_ai_poll_short_titles");
    ok("d.0 · both S2 migrations exist", market !== null && poll !== null, `market ${market !== null} · poll ${poll !== null}`);
    const exactly = (a: Additive, table: string) => {
      const cols = a.adds.get(table);
      return a.adds.size === 1 && !!cols && sameSet([...cols.keys()], S2_COLUMNS) && [...cols.values()].every((t) => t === "TEXT");
    };
    const am = additive(market ?? ""), ap = additive(poll ?? "");
    ok('d.market · 20260930200000 is additive only and adds exactly the four nullable TEXT columns to "PredictionMarket"',
      market !== null && am.ok && exactly(am, "PredictionMarket"), `${am.why.join(" | ") || "additive"} · ${showAdds(am)}`);
    ok('d.aipoll · 20260930200100 is additive only and adds exactly the four nullable TEXT columns to "AIPoll"',
      poll !== null && ap.ok && exactly(ap, "AIPoll"), `${ap.why.join(" | ") || "additive"} · ${showAdds(ap)}`);
    const all = existsSync(MIG) ? readdirSync(MIG).filter((d) => existsSync(join(MIG, d, "migration.sql"))) : [];
    const naming = all.filter((d) => /"shortTitle(?:En|Sw|Zh)"/.test(readMig(d) ?? ""));
    const notAdditive = naming.filter((d) => !additive(readMig(d) ?? "").ok);
    ok("d.census · every migration that names a short-title column is additive only (no NOT NULL, DROP, UPDATE, RENAME, DEFAULT …)",
      naming.length >= 2 && notAdditive.length === 0,
      `${naming.length} of ${all.length} migration(s) name one: ${naming.join(", ")}${notAdditive.length ? ` · NOT additive: ${notAdditive.join(", ")}` : ""}`);
    ok("d.c · CONTROL · the check refuses SET NOT NULL, a backfill UPDATE and a RENAME, and ignores a word inside a comment",
      !additive('ALTER TABLE "PredictionMarket" ALTER COLUMN "shortTitleEn" SET NOT NULL;').ok
        && !additive('UPDATE "PredictionMarket" SET "shortTitleSw" = "titleSw";').ok
        && !additive('ALTER TABLE "AIPoll" RENAME COLUMN "competition" TO "league";').ok
        && additive('-- we never DROP or UPDATE anything here\nALTER TABLE "X" ADD COLUMN IF NOT EXISTS "y" TEXT;').ok);
  }

  /* ── (e) ─────────────────────────────────────────────────────────────── */
  log("\n(e) THE ONE FUNNEL — createMarket stores the four through the normalisers, and none for a round");
  {
    const body = createMarketBody(impl.serviceSrc);
    ok("e.0 · createMarket resolves in market-service.ts", body.length > 1000, `${body.length} chars`);
    const setVar = /const\s+(\w+)\s*=\s*[^;\n]*\bnormaliseShortTitleSet\(\s*input\s*\)/.exec(body)?.[1] ?? null;
    const fromSet = setVar !== null && ["shortTitleEn", "shortTitleSw", "shortTitleZh"]
      .every((k) => new RegExp(`^\\s*${k}\\s*:\\s*${setVar}\\??\\.${k}\\b`, "m").test(body));
    const RAW = /^\s*(?:shortTitle(?:En|Sw|Zh)|competition)\s*:\s*input\./m;
    ok("e.set · the three short titles are stored FROM normaliseShortTitleSet(input) — never raw from the input",
      fromSet && !RAW.test(body), `set variable ${setVar ?? "(none)"}`);
    ok("e.competition · the competition is stored through normaliseCompetition(input.competition)",
      /^\s*competition\s*:[^\n]*\bnormaliseCompetition\(\s*input\.competition\s*\)/m.test(body));
    const guard = /const\s+(\w+)\s*=\s*[^;\n]*\bproductLine\b[^;\n]*===\s*"UPDOWN"/.exec(body)?.[1] ?? null;
    const guardedSet = guard !== null && new RegExp(`const\\s+\\w+\\s*=\\s*${guard}\\s*\\?\\s*null\\s*:\\s*normaliseShortTitleSet\\(`).test(body);
    const guardedComp = guard !== null && new RegExp(`^\\s*competition\\s*:\\s*${guard}\\s*\\?\\s*null\\s*:\\s*normaliseCompetition\\(`, "m").test(body);
    ok('e.updown · an Up & Down round stores NO short title and NO competition — both are guarded by the "UPDOWN" check',
      guardedSet && guardedComp, `guard ${guard ?? "(none)"} · short titles guarded ${guardedSet} · competition guarded ${guardedComp}`);
    ok("e.audit · the market.created audit carries all four, so what the card says is on the record from the first moment",
      S2_COLUMNS.every((k) => new RegExp(`\\b${k}\\s*:\\s*m\\.${k}\\b`).test(body)));
    ok("e.c · CONTROL · a body storing an input value raw is caught",
      RAW.test("    shortTitleSw: input.shortTitleSw ?? null,") && RAW.test("    competition: input.competition,"));
  }

  /* ── (f) ─────────────────────────────────────────────────────────────── */
  log("\n(f) THE SEED CATALOGUE — what every seeded LIVE market's card says today");
  {
    const seeds = seedCatalogue(impl.serviceSrc).filter((s) => s.productLine !== "UPDOWN");
    ok("f.0 · the seed catalogue parses: at least 30 seeded markets, each with an English and a Swahili title",
      seeds.length >= 30 && seeds.every((s) => !!s.titleEn && !!s.titleSw), `${seeds.length} parsed`);
    const shown: Record<Locale, number> = { en: 0, sw: 0, zh: 0 };
    const fallback: Record<Locale, number> = { en: 0, sw: 0, zh: 0 };
    const literalProblems: string[] = [];
    const cardProblems: string[] = [];
    let seededShorts = 0, zhNoFull = 0;
    for (const s of seeds) {
      const titleEn = s.titleEn ?? "", titleSw = s.titleSw ?? "", titleZh = s.titleZh ?? null;
      // What createMarket would store for this seed (non-strict; a hard issue becomes NULL).
      const set = normaliseShortTitleSet({ titleEn, titleSw, titleZh, shortTitleEn: s.shortTitleEn, shortTitleSw: s.shortTitleSw, shortTitleZh: s.shortTitleZh });
      for (const l of LOCALES) {
        const lit = l === "en" ? s.shortTitleEn : l === "sw" ? s.shortTitleSw : s.shortTitleZh;
        if (lit === undefined || !lit.trim()) continue;
        seededShorts++;
        if (set.issues[l].length > 0 || codePoints(lit) > SHORT_TITLE_MAX[l]) {
          literalProblems.push(`"${titleEn.slice(0, 40)}" [${l}] ${codePoints(lit)}/${SHORT_TITLE_MAX[l]} ${set.issues[l].join(",")}`);
        }
      }
      const m = { titleEn, titleSw, titleZh, shortTitleEn: set.shortTitleEn, shortTitleSw: set.shortTitleSw, shortTitleZh: set.shortTitleZh };
      if (!titleZh) zhNoFull++;
      for (const l of LOCALES) {
        const ct = impl.cardTitle(l, m);
        if (ct.short) {
          shown[l]++;
          if (codePoints(ct.text) > SHORT_TITLE_MAX[l] || ct.text !== shortTitleFor(l, m)) cardProblems.push(`"${titleEn.slice(0, 40)}" [${l}] ${ct.text}`);
        } else {
          fallback[l]++;
          if (ct.text !== pickLocalized(l, titleEn, titleSw, titleZh)) cardProblems.push(`"${titleEn.slice(0, 40)}" [${l}] shows "${ct.text}"`);
        }
      }
    }
    ok("f.budget · every seeded short title is itself within budget and breaks no rule (a seed stored as NULL would silently fall back)",
      literalProblems.length === 0, literalProblems.length ? literalProblems.slice(0, 3).join(" | ") : `${seededShorts} seeded short title(s)`);
    ok("f.card · every seeded card shows a short title within budget in the reader's language, or the reader's own full title",
      cardProblems.length === 0, cardProblems.slice(0, 3).join(" | "));
    log(`       REPORT · ${seeds.length} seeded LIVE markets (createMarket stores every seed LIVE):`);
    for (const l of LOCALES) {
      log(`         ${l}: ${shown[l]} show a short title within budget · ${fallback[l]} fall back to the full title`);
    }
    log(`         zh: ${zhNoFull} have no Chinese full title either, so a Chinese reader sees the English full question`);
    log("       The fallbacks are the backfill's work, not a failure: a fallback card shows the full title, clamped to two lines.");
  }

  return failed;
}

/* ══ THE RUN ════════════════════════════════════════════════════════════════ */

const REAL: Impl = {
  MAX: SHORT_TITLE_MAX,
  normalise: normaliseShortTitle,
  cardTitle,
  fold: foldToGsm7,
  serviceSrc: SERVICE_SRC,
  srcFiles: SRC_FILES,
};

if (!PROVE_RED) {
  console.log("short-title-fit — the S2 Done-when gate (pure: no browser, no database)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nSHORT-TITLE FIT — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  let pass = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) { pass++; console.log(`  ok   ${label}`); }
    else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  console.log("RED CONTROL — short-title-fit's defects, planted in memory\n");

  const baseline = run(REAL, quiet);
  ok("baseline · the shipped modules pass every check before anything is planted", baseline.length === 0, baseline.join("; "));

  /** ⛔ THE DEFECT §0c NAMED: `pickLocalized` over the SHORT titles falls back to ENGLISH. */
  const plantedCard: typeof cardTitle = (locale, m) => {
    const s = pickLocalized(locale, m.shortTitleEn ?? "", m.shortTitleSw, m.shortTitleZh);
    return s.trim() ? { text: s, short: true } : { text: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh), short: false };
  };
  /** A fold whose table lost the em dash. */
  const plantedFold = (t: string) => {
    let out = "";
    for (const c of t) out += c === EM_DASH ? c : foldToGsm7(c);
    return out;
  };
  /** A normaliser that reports the issue and stores the value anyway. */
  const plantedNormalise: typeof normaliseShortTitle = (locale, raw, c, opts = {}) => {
    const r = normaliseShortTitle(locale, raw, c, opts);
    return { ...r, value: cleanShortTitle(locale, raw) || null };
  };
  /** createMarket with its UPDOWN ternaries removed: a round would get short titles and a competition. */
  const UNGUARDED = SERVICE_SRC.replace(/\b\w+\s*\?\s*null\s*:\s*(normaliseShortTitleSet|normaliseCompetition)\(/g, "$1(");
  /** A second budget, written beside an admin counter instead of read from SHORT_TITLE_MAX. */
  const SECOND_BUDGET: SrcFile = { rel: "app/admin/markets/short-title-counter.tsx", text: 'export const COUNTER = { field: "shortTitleSw", max: 56 };' };

  const tooLong = "Will " + "a".repeat(60) + "?";
  type Plant = { name: string; expect: RegExp; impl: Impl; landed: boolean; landedAs: string };
  const plants: Plant[] = [
    {
      name: "a budget of 60 — the constant edited without the pin",
      expect: /^a\.budget · /,
      impl: { ...REAL, MAX: { en: 60, sw: 60, zh: 28 } },
      landed: true,
      landedAs: "MAX.en = MAX.sw = 60",
    },
    {
      name: "a second budget written beside an admin counter",
      expect: /^a\.census · /,
      impl: { ...REAL, srcFiles: [...SRC_FILES, SECOND_BUDGET] },
      landed: budgetCensus([SECOND_BUDGET]).strays.length > 0,
      landedAs: "the planted file carries a literal 56 on the line that names shortTitleSw",
    },
    {
      name: "cardTitle falls back through pickLocalized over the SHORT titles",
      expect: /^c\.own-full · /,
      impl: { ...REAL, cardTitle: plantedCard },
      landed: plantedCard("sw", { ...DERBY, shortTitleEn: EN_SHORT, shortTitleSw: null, shortTitleZh: null }).text === EN_SHORT,
      landedAs: "a Swahili reader is handed the English short question",
    },
    {
      name: "a fold that leaves the em dash",
      expect: /^b\.fold · /,
      impl: { ...REAL, fold: plantedFold },
      landed: plantedFold(`a${EM_DASH}b`) === `a${EM_DASH}b`,
      landedAs: "the em dash survives, so the text stays UCS-2",
    },
    {
      name: "a normaliser that stores a value with a hard issue",
      expect: /^b\.hard-null · /,
      impl: { ...REAL, normalise: plantedNormalise },
      landed: plantedNormalise("en", tooLong, CTX.en).value === tooLong,
      landedAs: "a 66-code-point English short title is stored",
    },
    {
      name: "createMarket without its UPDOWN guard",
      expect: /^e\.updown · /,
      impl: { ...REAL, serviceSrc: UNGUARDED },
      landed: UNGUARDED !== SERVICE_SRC && !/\?\s*null\s*:\s*normaliseShortTitleSet\(/.test(UNGUARDED),
      landedAs: "the ternaries are gone from createMarket",
    },
  ];

  let caught = 0;
  for (const p of plants) {
    ok(`PLANT LANDED · ${p.name}`, p.landed, p.landedAs);
    const failures = run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit && p.landed) caught++;
    ok(`  └─ fires: ${p.expect.source}`, hit,
      failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }

  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? ` · all ${pass} proofs held` : ` · ${fail} of ${pass + fail} proofs FAILED`}\n`);
  process.exitCode = fail === 0 && caught === plants.length ? 0 : 1;
}
