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
 *   (b) THE NORMALISER — each language's form (Chinese: the full-width mark ONLY, a typed "?" cleaned into it when
 *       the value is Chinese), code points not UTF-16, the fold onto GSM-7, the copied-English refusal on a KEY (case,
 *       spacing, curly quotes, the closing mark and a Swahili "Je, " do not hide a copy; a Chinese value with no Chinese
 *       character is refused the same way, and FIRST), number drift on WHOLE numbers as a WARNING that strict refuses
 *       — except against an English title standing in for a missing one — empty → null, and a hard issue never stored.
 *   (c) WHAT A CARD SHOWS — `cardTitle` falls back to the reader's OWN full title, never to the English short one.
 *   (d) THE MIGRATIONS — additive only, exactly four nullable TEXT columns on "PredictionMarket" and on "AIPoll".
 *   (e) THE ONE FUNNEL — `createMarket` stores the four through the normalisers, and none for an Up & Down round.
 *   (f) THE SEED CATALOGUE — what every seeded LIVE market's card says today, per language. A REPORT: the fallbacks
 *       are the backfill's work, not a failure. Any seeded short title must itself be within budget.
 *   (g) THE WORDS — ONE wording (`shortTitleIssueSentence`, beside the rules) names every issue in every language
 *       and says what the rule means (a Chinese value must be written in Chinese; the Chinese form is the full-width
 *       mark; the Swahili pattern is held on one line by a no-break space) — and the wizard speaks it, with no words
 *       of its own.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a budget of 60, a second budget literal
 * in src, a card that falls back through `pickLocalized` over the SHORT titles, a fold that leaves an em dash, a
 * normaliser that stores a hard issue, createMarket without its UPDOWN guard, a byte-exact copy check, a Chinese
 * rule that lets a value with no Chinese through, the copy issue reported last, a set that compares only the STORED
 * English short title, substring number drift, strict refusing a fallback drift, a set that never says the English
 * title is standing in, a Chinese clean that keeps the ASCII "?", a Chinese form that accepts it, and the wizard's
 * old wording — and requires the check named for it to fail. This file makes no file-writing call anywhere (comments included), so `test:red-anchors` §4 counts it
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
  normaliseShortTitleSet, shortTitleIssues, hasHan, shortTitleFor, cardTitle, shortTitleIssueSentence, type ShortTitleIssue,
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
const FW_SIMBA = ch(0xFF33, 0xFF49, 0xFF4D, 0xFF42, 0xFF41);   // "Simba" in full-width Latin letters: no Han in it
const FW_12 = ch(0xFF11, 0xFF12), FW_13 = ch(0xFF11, 0xFF13); // "12" and "13" in full-width digits

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════ */
const DERBY = {
  titleEn: "Will Simba SC win the next Kariakoo Derby?",
  titleSw: "Je, Simba SC watashinda Derby ya Kariakoo ijayo?",
  titleZh: `辛巴SC会赢得下一场卡里亚库德比吗${FWQ}`,
};
const EN_SHORT = "Will Simba win the derby?";
const SW_SHORT = "Je, Simba watashinda derby?";
const ZH_BASE = "辛巴会赢德比吗";
const ZH_SHORT = `${ZH_BASE}${FWQ}`;
const BTC = "Will Bitcoin close above $80,000 at end of week?";
/** A market whose translations write its numbers their own way — "15万" for "$150,000" — so they drift from the English. */
const BTC150 = "Will Bitcoin top $150,000 by end of August 2026?";
const ZH_BTC = `比特币8月底前能否破15万美元${FWQ}`;
const SW_BTC = "Je, Bitcoin itapita dola 150 elfu?";
const CTX = {
  en: { full: DERBY.titleEn, englishFull: DERBY.titleEn },
  sw: { full: DERBY.titleSw, englishFull: DERBY.titleEn },
  zh: { full: DERBY.titleZh, englishFull: DERBY.titleEn },
};

/** What a value is checked against — the rule's own context type. */
type Ctx = Parameters<typeof shortTitleIssues>[2];

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
const WIZARD_SRC = SRC_FILES.find((f) => f.rel === "app/admin/markets/new/wizard.tsx")?.text ?? "";
/** Every issue the rule can report — the four HARD ones and the warning. (g) holds the ONE wording to all five. */
const ALL_ISSUES: readonly ShortTitleIssue[] = ["copied_english", "too_long", "not_gsm7", "form", "number_drift"];

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
/**
 * ⭐ THE LOCK-RETRY WRAPPER (review S2-BOOT-1): a `DO $$ … $$` block that retries ONE `ALTER TABLE … ADD COLUMN` on
 * `lock_not_available`. It is unwrapped to its inner statement ONLY when it is exactly that shape — any other DO block
 * is refused — so the wrapper cannot become a place to hide a statement the rest of this check would refuse.
 */
const RETRY_WRAPPER = /^DO \$\$ DECLARE attempt int := 0; BEGIN LOOP BEGIN (ALTER TABLE "\w+" (?:ADD COLUMN IF NOT EXISTS "\w+" \w+, )*ADD COLUMN IF NOT EXISTS "\w+" \w+); EXIT; EXCEPTION WHEN lock_not_available THEN attempt := attempt \+ 1; IF attempt >= \d+ THEN RAISE; END IF; PERFORM pg_sleep\([\d.]+\); END; END LOOP; END \$\$$/;
function unwrapRetry(body: string, why: string[]): string {
  return body.replace(/DO\s+\$\$[\s\S]*?\$\$/g, (block) => {
    const flat = block.replace(/\s+/g, " ").replace(/\s*;\s*/g, "; ").replace(/\s*,\s*/g, ", ").trim();
    const m = RETRY_WRAPPER.exec(flat);
    if (!m) { why.push(`a DO block that is not the one-statement lock-retry wrapper: ${flat.slice(0, 80)}`); return " "; }
    return m[1];
  });
}
function additive(sql: string): Additive {
  const why: string[] = [];
  const body = unwrapRetry(sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " "), why);
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
  normaliseSet: typeof normaliseShortTitleSet;
  issues: typeof shortTitleIssues;
  clean: typeof cleanShortTitle;
  cardTitle: typeof cardTitle;
  fold: (text: string) => string;
  sentence: typeof shortTitleIssueSentence;
  serviceSrc: string;
  wizardSrc: string;
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
    const zhAscii = n("zh", `${ZH_BASE}?`, CTX.zh);
    const zhNone = n("zh", ZH_BASE, CTX.zh);
    ok("b.zh-form · a Chinese short title ends in the full-width question mark; one typed with \"?\" is STORED with the full-width mark; one ending in neither is refused as form",
      stored(zhFull, ZH_SHORT) && stored(zhAscii, ZH_SHORT) && zhNone.value === null && zhNone.issues.includes("form"),
      show([zhFull, zhAscii, zhNone]));
    const ruleAscii = impl.issues("zh", `${ZH_BASE}?`, CTX.zh);
    const ruleFull = impl.issues("zh", ZH_SHORT, CTX.zh);
    ok("b.zh-form.rule · the RULE accepts the full-width mark only: an uncleaned Chinese value ending in the ASCII \"?\" is form (the store never sees one — the clean turns it)",
      ruleAscii.includes("form") && ruleFull.length === 0, show({ ascii: ruleAscii, fullWidth: ruleFull }));
    const closes: Array<[Locale, string, string]> = [
      ["zh", `${ZH_BASE}?`, ZH_SHORT],
      ["zh", `${ZH_BASE} ?`, ZH_SHORT],
      ["zh", `${ZH_BASE}??`, ZH_SHORT],
      ["zh", `${ZH_BASE}${FWQ}${FWQ}`, ZH_SHORT],
      ["zh", `${ZH_BASE} ${FWQ}`, ZH_SHORT],
      ["zh", `${HAN}?${HAN}`, `${HAN}?${HAN}`],
      ["zh", "Simba SC?", "Simba SC?"],
      ["en", EN_SHORT, EN_SHORT],
      ["sw", SW_SHORT, SW_SHORT],
    ];
    const closeBad = closes.filter(([l, raw, want]) => impl.clean(l, raw) !== want).map(([l, raw]) => `${l} ${show(raw)} → ${show(impl.clean(l, raw))}`);
    ok("b.zh-close.clean · the clean closes a CHINESE value with one full-width mark (from \"?\", a doubled mark, a space before it) — and touches no mark mid-text, no value without Chinese in it, and no English or Swahili \"?\"",
      closeBad.length === 0, closeBad.join(" | "));

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
    const copies = impl.normaliseSet({ ...DERBY, shortTitleEn: EN_SHORT, shortTitleSw: EN_SHORT, shortTitleZh: EN_SHORT });
    ok("b.copied-english.short · …and one equal to the English SHORT title is refused too (Swahili and Chinese, copied_english first), while the English one is kept",
      copies.shortTitleEn === EN_SHORT && copies.shortTitleSw === null && copies.issues.sw[0] === "copied_english"
        && copies.shortTitleZh === null && copies.issues.zh[0] === "copied_english",
      show(copies));
    const real = impl.normaliseSet({ ...DERBY, shortTitleEn: EN_SHORT, shortTitleSw: SW_SHORT, shortTitleZh: ZH_SHORT });
    ok("b.copied-english.c · CONTROL · real Swahili and Chinese short titles beside it are kept",
      real.shortTitleSw === SW_SHORT && real.shortTitleZh === ZH_SHORT, show(real));

    // …compared on a KEY, never the bytes: a copy in disguise is still a copy.
    const SIDE = `Will Simba${RSQ}s side win the derby?`; // an English FULL title as typed, with a curly apostrophe
    const disguises: Array<{ why: string; v: string; ctx: Ctx }> = [
      { why: "\"Je, \" in front of the English full title", v: `Je, ${DERBY.titleEn}`, ctx: CTX.sw },
      { why: "lower case, doubled spaces, a space before the mark", v: "je,  will simba   WIN the derby ?", ctx: { ...CTX.sw, englishShort: EN_SHORT } },
      { why: "no closing mark", v: "Will Simba win the derby", ctx: { ...CTX.sw, englishShort: EN_SHORT } },
      { why: "a straight apostrophe for the English title's curly one", v: "Je, Will Simba's side win the derby?", ctx: { ...CTX.sw, englishFull: SIDE } },
    ];
    const missed = disguises.filter((d) => !impl.issues("sw", cleanShortTitle("sw", d.v), d.ctx).includes("copied_english")).map((d) => d.why);
    ok("b.copied-english.key · a Swahili copy of the English in disguise is still copied_english: \"Je, \" in front, case, spacing, no mark, a straight quote for a curly one",
      missed.length === 0, `missed: ${missed.join(" | ")}`);
    const genuine = ["Je, Simba SC itashinda derby ya Kariakoo?", SW_SHORT, "Je, Simba itashinda?"];
    const flagged = genuine.filter((v) => impl.issues("sw", v, { ...CTX.sw, englishShort: EN_SHORT }).includes("copied_english"));
    ok("b.copied-english.key.c · CONTROL · genuine Swahili sharing names and words with the English is no copy",
      flagged.length === 0, `flagged: ${flagged.join(" | ")}`);

    // …and a Chinese short title with no Chinese in it is refused the same way — whatever it copies, or nothing.
    const notChinese = [`GDP 6%${FWQ}`, "Simba SC?", `${FW_SIMBA}${FWQ}`];
    const nc = notChinese.map((v) => ({ v, issues: impl.issues("zh", cleanShortTitle("zh", v), CTX.zh), stored: n("zh", v, CTX.zh).value }));
    ok("b.copied-english.not-chinese · a Chinese short title with no Chinese character in it — a copy of nothing — is refused as copied_english and stored as nothing",
      nc.every((r) => r.issues.includes("copied_english") && r.stored === null), show(nc));
    const mixed = `Simba SC能否赢得德比${FWQ}`;
    const rm = n("zh", mixed, CTX.zh);
    ok("b.copied-english.not-chinese.c · CONTROL · Chinese with a Latin name in it is Chinese and is stored; the detector sees a BMP and an astral ideograph, and no full-width Latin letter or mark",
      stored(rm, mixed) && hasHan(HAN) && hasHan(ASTRAL) && !hasHan(FW_SIMBA) && !hasHan(FWQ), show(rm));
    const zhEnglish = impl.issues("zh", DERBY.titleEn, CTX.zh);
    ok("b.copied-english.first · copied_english is reported FIRST (every caller shows the first hard issue): English in the Chinese field is told to be Chinese, not to be shorter or to change its mark",
      zhEnglish[0] === "copied_english" && zhEnglish.includes("too_long") && zhEnglish.includes("form"), show(zhEnglish));
    const typed = impl.normaliseSet({ ...DERBY, shortTitleEn: "Will Simba win the derby", shortTitleSw: "Je, Will Simba win the derby?" });
    ok("b.copied-english.typed · the copy rule compares with the English short title as TYPED: a Swahili copy of an English one that was itself refused (no \"?\") is still refused",
      typed.shortTitleEn === null && typed.issues.en.includes("form") && typed.shortTitleSw === null && typed.issues.sw.includes("copied_english"),
      show(typed));

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

    // …on WHOLE numbers, never substrings — and a thousands separator does not make a different number.
    const enCtx = (full: string): Ctx => ({ full, englishFull: full });
    const zh12: Ctx = { full: `辛巴会进12球吗${FWQ}`, englishFull: "Will Simba score 12 goals?" };
    const numberCases: Array<{ why: string; l: Locale; v: string; ctx: Ctx; drift: boolean }> = [
      { why: "5 is not 2.5", l: "en", v: "Will Simba score over 5 goals?", ctx: enCtx("Will Simba score over 2.5 goals?"), drift: true },
      { why: "10,000 is not 110,000", l: "en", v: "Will Bitcoin top $10,000?", ctx: enCtx("Will Bitcoin top $110,000?"), drift: true },
      { why: "2 is not 12", l: "en", v: "Will Simba score 2 goals?", ctx: enCtx("Will Simba score 12 goals?"), drift: true },
      { why: "2700 is 2,700", l: "en", v: "Will the fare top TZS 2700?", ctx: enCtx("Will the bus fare top TZS 2,700?"), drift: false },
      { why: "2,700 is 2700", l: "en", v: "Will the fare top TZS 2,700?", ctx: enCtx("Will the bus fare top TZS 2700?"), drift: false },
      { why: "2700 is 2.700 (a dot between thousands)", l: "en", v: "Will the fare top TZS 2700?", ctx: enCtx("Will the bus fare top TZS 2.700?"), drift: false },
      { why: "2.5 stays 2.5 (a decimal point is kept)", l: "en", v: "Over 2.5 goals for Simba?", ctx: enCtx("Will Simba score over 2.5 goals?"), drift: false },
      { why: "2,5 is 2.5 (a decimal comma)", l: "sw", v: "Je, magoli zaidi ya 2,5?", ctx: { full: "Je, Simba itafunga zaidi ya magoli 2.5?", englishFull: "Will Simba score over 2.5 goals?" }, drift: false },
      { why: "05 is 5 and 2.50 is 2.5", l: "en", v: "Over 2.50 goals on 05 October?", ctx: enCtx("Will Simba score over 2.5 goals on 5 October?"), drift: false },
      { why: "a date written with dots is its parts", l: "en", v: "Will it open on 12 October 2026?", ctx: enCtx("Will the line open on 12.10.2026?"), drift: false },
      { why: "full-width 12 is 12", l: "zh", v: `辛巴会进${FW_12}球吗${FWQ}`, ctx: zh12, drift: false },
      { why: "full-width 13 is not 12", l: "zh", v: `辛巴会进${FW_13}球吗${FWQ}`, ctx: zh12, drift: true },
    ];
    const numberWrong = numberCases
      .filter((c) => impl.issues(c.l, cleanShortTitle(c.l, c.v), c.ctx).includes("number_drift") !== c.drift)
      .map((c) => `${c.why} (expected ${c.drift ? "drift" : "none"})`);
    ok("b.number-drift.whole · numbers are compared WHOLE, against the set of the full titles' numbers: 5 is not 2.5, 10,000 is not 110,000, 2 is not 12 — while 2,700 / 2.700 / 2700, 2,5 / 2.5, 05 / 5 and full-width digits are the same number",
      numberWrong.length === 0, `wrong on: ${numberWrong.join(" | ")}`);

    // …and strict keeps a drift measured against the ENGLISH title standing in for a missing one: a warning, not a refusal.
    const fb = impl.normalise("zh", ZH_BTC, { full: BTC150, englishFull: BTC150, fullIsFallback: true }, { strict: true });
    const own = impl.normalise("zh", ZH_BTC, { full: `比特币价格能否大涨${FWQ}`, englishFull: BTC150 }, { strict: true });
    const fbHard = impl.normalise("zh", HAN.repeat(29) + FWQ, { full: BTC150, englishFull: BTC150, fullIsFallback: true }, { strict: true });
    ok("b.number-drift.fallback · strict keeps a drift against an English title STANDING IN (fullIsFallback) — stored, number_drift still reported — refuses it against the language's own full title, and a hard issue stays hard",
      fb.value === ZH_BTC && fb.hard === false && fb.issues.includes("number_drift")
        && own.value === null && own.hard === true && own.issues.includes("number_drift")
        && fbHard.value === null && fbHard.issues.includes("too_long"),
      show({ fb, own, fbHard }));
    const standIn = impl.normaliseSet({ titleEn: BTC150, titleSw: "   ", titleZh: null, shortTitleSw: SW_BTC, shortTitleZh: ZH_BTC }, { strict: true });
    const ownFull = impl.normaliseSet({ titleEn: BTC150, titleSw: "Je, bei ya Bitcoin itapanda sana?", titleZh: `比特币价格能否大涨${FWQ}`, shortTitleSw: SW_BTC, shortTitleZh: ZH_BTC }, { strict: true });
    ok("b.number-drift.fallback-set · the set says when the English title stands in (a blank titleSw, no titleZh): strict keeps those translations with their warning — and refuses them beside the language's own full title",
      standIn.shortTitleSw === SW_BTC && standIn.shortTitleZh === ZH_BTC && standIn.issues.sw.includes("number_drift") && standIn.issues.zh.includes("number_drift")
        && ownFull.shortTitleSw === null && ownFull.shortTitleZh === null && ownFull.hard.sw && ownFull.hard.zh,
      show({ standIn, ownFull }));

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
    // ⭐ The lock-retry wrapper (S2-BOOT-1) is unwrapped ONLY in its exact shape. A DROP smuggled inside it, or any other
    // DO block, is refused — and the real file, wrapper and all, still passes.
    const wrapped = market ?? "";
    const smuggled = wrapped.replace('ADD COLUMN IF NOT EXISTS "competition" TEXT;', 'ADD COLUMN IF NOT EXISTS "competition" TEXT; DROP TABLE "AIPoll";');
    const otherDo = `DO $$ BEGIN UPDATE "PredictionMarket" SET "competition" = 'epl'; END $$;`;
    ok("d.retry.c · CONTROL · the lock-retry wrapper is accepted only in its exact shape: a DROP smuggled inside it, and any other DO block, are refused",
      market !== null && smuggled !== wrapped && !additive(smuggled).ok && !additive(otherDo).ok && additive(wrapped).ok,
      `smuggled ${additive(smuggled).ok} · other DO ${additive(otherDo).ok} · real ${additive(wrapped).ok}`);
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

  /* ── (g) ─────────────────────────────────────────────────────────────── */
  log("\n(g) THE WORDS — one wording for every rule, and the wizard speaks it");
  {
    const said = (l: Locale, i: ShortTitleIssue): string => { try { const s = impl.sentence(l, i, ""); return typeof s === "string" ? s.trim() : ""; } catch { return ""; } };
    const missing = ALL_ISSUES.flatMap((i) => LOCALES.filter((l) => said(l, i) === "").map((l) => `${l}:${i}`));
    ok("g.words.cases · shortTitleIssueSentence has words for every issue the rule reports, in every language",
      missing.length === 0, `no words for: ${missing.join(", ") || "none"}`);
    const zhCopy = said("zh", "copied_english"), swCopy = said("sw", "copied_english");
    const zhForm = said("zh", "form"), swForm = said("sw", "form");
    const SW_PATTERN = `Je,${ch(0xA0)}${ch(0x2026)}?`;
    ok("g.words.say · copied_english tells a Chinese writer to write in CHINESE (the rule refuses a Chinese value with no Chinese character the same way) and a Swahili one in Swahili; the Chinese form names the full-width mark; the Swahili pattern is held on one line by a NO-BREAK space",
      /Write it in Chinese/.test(zhCopy) && /Write it in Swahili/.test(swCopy) && zhForm.includes(FWQ) && swForm.includes(SW_PATTERN),
      show({ zhCopy, swCopy, zhForm, swForm, swHoldsTogether: swForm.includes(SW_PATTERN) }));
    const wiz = impl.wizardSrc;
    ok("g.wizard.shared · the wizard speaks those same words: it imports shortTitleIssueSentence, calls it, and has no wording of its own",
      /import \{[^}]*\bshortTitleIssueSentence\b[^}]*\} from "@\/lib\/markets\/short-title"/.test(wiz)
        && /shortTitleIssueSentence\(locale, /.test(wiz)
        && !/case "(?:too_long|not_gsm7|form|copied_english|number_drift)"/.test(wiz),
      show({ imports: /\bshortTitleIssueSentence\b/.test(wiz), ownCases: (wiz.match(/case "(?:too_long|not_gsm7|form|copied_english|number_drift)"/g) ?? []).length }));
  }

  return failed;
}

/* ══ THE RUN ════════════════════════════════════════════════════════════════ */

const REAL: Impl = {
  MAX: SHORT_TITLE_MAX,
  normalise: normaliseShortTitle,
  normaliseSet: normaliseShortTitleSet,
  issues: shortTitleIssues,
  clean: cleanShortTitle,
  cardTitle,
  fold: foldToGsm7,
  sentence: shortTitleIssueSentence,
  serviceSrc: SERVICE_SRC,
  wizardSrc: WIZARD_SRC,
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

  /* The S2 review's rule defects (ST-1, ST-2, ST-5, ST-6), each planted as ONE layer around the real rule. */
  const exactKey = (x: string) => x.replace(/\s+/g, " ").trim();
  const isExactCopy = (v: string, c: Ctx) => [c.englishFull, c.englishShort ?? ""].map(exactKey).filter(Boolean).includes(v);
  /** ST-1 as first shipped: the copy check compared the BYTES. */
  const plantedExactCopy: typeof shortTitleIssues = (l, v, c) => {
    const rest = shortTitleIssues(l, v, c).filter((i) => i !== "copied_english");
    return l !== "en" && isExactCopy(v, c) ? ["copied_english", ...rest] : rest;
  };
  /** ST-1's Chinese half missing: a Chinese value with no Chinese character passes unless it is a byte copy. */
  const plantedNoHanRule: typeof shortTitleIssues = (l, v, c) => {
    const r = shortTitleIssues(l, v, c);
    return l === "zh" && !hasHan(v) && !isExactCopy(v, c) ? r.filter((i) => i !== "copied_english") : r;
  };
  /** The copy issue reported LAST: English in the Chinese field would first be told to be shorter. */
  const plantedCopyLast: typeof shortTitleIssues = (l, v, c) => {
    const r = shortTitleIssues(l, v, c);
    return r.includes("copied_english") ? [...r.filter((i) => i !== "copied_english"), "copied_english"] : r;
  };
  /** A set that compares only with the STORED English short title: a copy of a REFUSED English one slips through. */
  const plantedStoredEnglish: typeof normaliseShortTitleSet = (m, o = {}) => {
    const en = normaliseShortTitle("en", m.shortTitleEn, { full: m.titleEn, englishFull: m.titleEn }, o);
    const r = normaliseShortTitleSet({ ...m, shortTitleEn: en.value }, o);
    return { ...r, issues: { ...r.issues, en: en.issues }, hard: { ...r.hard, en: en.hard } };
  };
  /** ST-2 as first shipped: a digit run counts as present when it is a SUBSTRING of the full titles. */
  const plantedSubstringDrift: typeof shortTitleIssues = (l, v, c) => {
    const rest = shortTitleIssues(l, v, c).filter((i) => i !== "number_drift");
    const full = `${c.full} ${c.englishFull}`;
    return (v.match(/\d+(?:[.,]\d+)*/g) ?? []).some((d) => !full.includes(d)) ? [...rest, "number_drift"] : rest;
  };
  /** ST-5 as first shipped: strict refuses every warning, the English title standing in or not. */
  const plantedStrictFallback: typeof normaliseShortTitle = (l, raw, c, o = {}) => normaliseShortTitle(l, raw, { ...c, fullIsFallback: false }, o);
  /** ST-5's set half missing: the English title fed in as the language's OWN full title, so nothing says it stands in. */
  const plantedSetNoFlag: typeof normaliseShortTitleSet = (m, o = {}) =>
    normaliseShortTitleSet({ ...m, titleSw: m.titleSw?.trim() ? m.titleSw : m.titleEn, titleZh: m.titleZh?.trim() ? m.titleZh : m.titleEn }, o);
  /** ST-6's clean missing: a Chinese value keeps the ASCII "?" it was typed with. */
  const plantedZhClean: typeof cleanShortTitle = (l, raw) =>
    l === "zh" && typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : cleanShortTitle(l, raw);
  /** ST-6's form half missing: the Chinese form accepts the ASCII "?" again. */
  const plantedZhFormAscii: typeof shortTitleIssues = (l, v, c) =>
    shortTitleIssues(l, l === "zh" && v.endsWith("?") ? `${v.slice(0, -1)}${FWQ}` : v, c);
  /** The words from before the fixes — "write it in this language" to a Chinese writer; the Swahili pattern on an
   *  ordinary space again (it broke across two lines); one issue with no words — and the wizard with its own again. */
  const plantedOldWords: typeof shortTitleIssueSentence = (l, i, v) => shortTitleIssueSentence(l, i, v).replace(/Write it in Chinese/g, "Write it in this language");
  const plantedBreakingSpace: typeof shortTitleIssueSentence = (l, i, v) => shortTitleIssueSentence(l, i, v).split(ch(0xA0)).join(" ");
  const plantedLostCase: typeof shortTitleIssueSentence = (l, i, v) => (i === "number_drift" ? "" : shortTitleIssueSentence(l, i, v));
  const OWN_WORDS = `${WIZARD_SRC}
function shortIssueText(locale, issue) { switch (issue) { case "form": return "Write it as a question."; } }`;

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
    {
      name: "a copy check that compares the bytes (ST-1)",
      expect: /^b\.copied-english\.key · /,
      impl: { ...REAL, issues: plantedExactCopy },
      landed: !plantedExactCopy("sw", `Je, ${DERBY.titleEn}`, CTX.sw).includes("copied_english"),
      landedAs: "\"Je, \" + the English full title passes as Swahili",
    },
    {
      name: "a Chinese rule that lets a value with no Chinese character through (ST-1)",
      expect: /^b\.copied-english\.not-chinese · /,
      impl: { ...REAL, issues: plantedNoHanRule },
      landed: !plantedNoHanRule("zh", `GDP 6%${FWQ}`, CTX.zh).includes("copied_english"),
      landedAs: "\"GDP 6%\" + the full-width mark passes as Chinese",
    },
    {
      name: "the copy issue reported last",
      expect: /^b\.copied-english\.first · /,
      impl: { ...REAL, issues: plantedCopyLast },
      landed: plantedCopyLast("zh", DERBY.titleEn, CTX.zh)[0] !== "copied_english",
      landedAs: "English in the Chinese field is told first that it is too long",
    },
    {
      name: "a set that compares only with the STORED English short title",
      expect: /^b\.copied-english\.typed · /,
      impl: { ...REAL, normaliseSet: plantedStoredEnglish },
      landed: plantedStoredEnglish({ ...DERBY, shortTitleEn: "Will Simba win the derby", shortTitleSw: "Je, Will Simba win the derby?" }).shortTitleSw !== null,
      landedAs: "a Swahili copy of a refused English short title is stored",
    },
    {
      name: "number drift by substring (ST-2)",
      expect: /^b\.number-drift\.whole · /,
      impl: { ...REAL, issues: plantedSubstringDrift },
      landed: !plantedSubstringDrift("en", "Will Simba score over 5 goals?", { full: "Will Simba score over 2.5 goals?", englishFull: "Will Simba score over 2.5 goals?" }).includes("number_drift"),
      landedAs: "\"5\" is found inside \"2.5\"",
    },
    {
      name: "strict refusing a drift against the English title standing in (ST-5)",
      expect: /^b\.number-drift\.fallback · /,
      impl: { ...REAL, normalise: plantedStrictFallback },
      landed: plantedStrictFallback("zh", ZH_BTC, { full: BTC150, englishFull: BTC150, fullIsFallback: true }, { strict: true }).value === null,
      landedAs: "a correct Chinese title (15万 for $150,000) on a market with no Chinese title is dropped",
    },
    {
      name: "a set that never says the English title stands in (ST-5)",
      expect: /^b\.number-drift\.fallback-set · /,
      impl: { ...REAL, normaliseSet: plantedSetNoFlag },
      landed: plantedSetNoFlag({ titleEn: BTC150, titleSw: "   ", titleZh: null, shortTitleZh: ZH_BTC }, { strict: true }).shortTitleZh === null,
      landedAs: "the same Chinese title is dropped through the set",
    },
    {
      name: "a Chinese clean that keeps the ASCII \"?\" (ST-6)",
      expect: /^b\.zh-close\.clean · /,
      impl: { ...REAL, clean: plantedZhClean },
      landed: plantedZhClean("zh", `${ZH_BASE}?`) === `${ZH_BASE}?`,
      landedAs: "a Chinese value typed with \"?\" is stored with it",
    },
    {
      name: "a Chinese form that accepts the ASCII \"?\" (ST-6)",
      expect: /^b\.zh-form\.rule · /,
      impl: { ...REAL, issues: plantedZhFormAscii },
      landed: !plantedZhFormAscii("zh", `${ZH_BASE}?`, CTX.zh).includes("form"),
      landedAs: "the rule passes a Chinese value ending in \"?\"",
    },
    {
      name: "the old copied-English words",
      expect: /^g\.words\.say · /,
      impl: { ...REAL, sentence: plantedOldWords },
      landed: plantedOldWords("zh", "copied_english", "") !== shortTitleIssueSentence("zh", "copied_english", ""),
      landedAs: "a Chinese writer is told to \"write it in this language\"",
    },
    {
      name: "the Swahili pattern on an ordinary space",
      expect: /^g\.words\.say · /,
      impl: { ...REAL, sentence: plantedBreakingSpace },
      landed: plantedBreakingSpace("sw", "form", "") !== shortTitleIssueSentence("sw", "form", ""),
      landedAs: "“Je, …?” can break after the comma",
    },
    {
      name: "no words for one issue",
      expect: /^g\.words\.cases · /,
      impl: { ...REAL, sentence: plantedLostCase },
      landed: plantedLostCase("en", "number_drift", "") === "",
      landedAs: "number_drift says nothing",
    },
    {
      name: "the wizard with words of its own again",
      expect: /^g\.wizard\.shared · /,
      impl: { ...REAL, wizardSrc: OWN_WORDS },
      landed: OWN_WORDS !== WIZARD_SRC,
      landedAs: "a local switch with its own form sentence",
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
