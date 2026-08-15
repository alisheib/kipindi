/**
 * THE LABEL GUARD — DESIGN_AUTHORITY §L.
 *
 * ⛔ WHY THIS EXISTS WHEN `test:i18n` ALREADY RUNS. `test:i18n` compares a translation
 * against its English source and passes anything that DIFFERS. So
 * `probOverTime: "YES 概率随时间变化"` counted as translated by its measure, and six Chinese
 * keys shipped carrying the ASCII token — four of them `aria-label`s, so a Chinese
 * screen-reader user *heard* "YES". A guard that cannot fail on the defect in front of it
 * is not covering it. This suite covers exactly the gap:
 *
 *   §1  every enum value that reaches a human has a real word in all THREE locales
 *   §2  no ASCII enum token sits inside a Swahili or Chinese string
 *   §3  no enum is interpolated into a sentence
 *   §4  the lexicon is the only definition site, and the count only ever goes DOWN
 *   §5  ⭐ THE POSITIVE CONTROL — every scanner is shown input it MUST reject
 *
 * ⭐ §5 IS NOT CEREMONY. A scanner that has gone blind — a bad path, a regex that stopped
 * matching, a locale block that resolved to -1 — prints "0 violations" in exactly the same
 * words as a clean tree. That is not hypothetical: the first draft of §2's scanner located
 * the ZH block with a pattern that did not match, scanned ZERO lines, and reported two
 * findings instead of eight. It looked like a pass. Every scanner below is therefore run
 * twice: once over the repo, and once over a string that is a known violation.
 *
 * ⛔ ASSERT THE VALUE, NOT THE SYMBOL (standards §5b). §1 does not check that
 * `side-label.ts` mentions each enum value — it CALLS the helper and reads what comes back,
 * so a value that resolves to an empty string, or back to the enum token itself, fails.
 *
 * Run: npm run test:labels   ·   proved red by: npm run red:labels
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { dict, type Locale } from "../src/lib/i18n-dict.ts";
import {
  sideWord, outcomeWord, positionStatusWord,
  type LabelProductLine, type PositionStatusValue,
} from "../src/lib/side-label.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const LOCALES: Locale[] = ["en", "sw", "zh"];
const LINES: LabelProductLine[] = ["MARKET", "UPDOWN"];

let fail = 0;
const log = (m: string) => console.log(m);
function check(name: string, ok: boolean, detail = "") {
  if (ok) log(`  PASS ${name}`);
  else { fail++; log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

log("\nlabel lexicon guard (DESIGN_AUTHORITY §L)\n");

// ───────────────────────────────────────────────────────────────────────────
// §1 · Every enum value that reaches a human resolves to a real word, in all
//      three locales. The VALUES come from prisma/schema.prisma, never a
//      hand-list — a new arm on any of these enums fails here on the next run.
// ───────────────────────────────────────────────────────────────────────────
const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");

/** Pull an enum's arms straight out of the schema. Throws if the enum is gone/renamed —
 *  a guard that silently scans nothing is the failure mode §5 exists to catch. */
function enumArms(name: string): string[] {
  const m = new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`).exec(schema);
  if (!m) throw new Error(`enum ${name} not found in schema.prisma — this guard is scanning nothing`);
  const arms = m[1]
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, "").trim())
    .filter((l) => /^[A-Z_]+$/.test(l));
  if (arms.length === 0) throw new Error(`enum ${name} parsed to zero arms`);
  return arms;
}

const SIDE_ARMS = enumArms("MarketSide");            // YES NO
const POS_ARMS = enumArms("PositionStatus");         // OPEN WIN LOSS VOID CASHED_OUT
const UD_ARMS = enumArms("UpDownRoundOutcome");      // UP DOWN VOID

check("schema parse — MarketSide has both arms", SIDE_ARMS.length === 2, SIDE_ARMS.join(","));
check("schema parse — PositionStatus has five arms", POS_ARMS.length === 5, POS_ARMS.join(","));
check("schema parse — UpDownRoundOutcome has three arms", UD_ARMS.length === 3, UD_ARMS.join(","));

/**
 * A word is only a word if it is non-empty — and, in a TRANSLATED locale, is not the enum
 * token wearing a disguise.
 *
 * ⚠️ THE LOCALE SCOPE IS THE WHOLE POINT AND THE FIRST DRAFT GOT IT WRONG. In English the
 * correct word for `YES` *is* "YES" — `common.yes` is "YES" / "NDIO" / "是". A blanket
 * "word must differ from the token" rule failed on perfectly correct English and would have
 * pushed the next session to "fix" the dictionary. §L4 is about a token surviving inside a
 * TRANSLATION, so that is exactly where the rule applies.
 */
function isRealWord(word: string, token: string, loc: Locale): boolean {
  if (word.trim().length === 0) return false;
  if (loc === "en") return true;
  return word.trim().toUpperCase() !== token.toUpperCase();
}

const wordGaps: string[] = [];
for (const loc of LOCALES) {
  const t = dict[loc] as Parameters<typeof sideWord>[0];
  for (const line of LINES) {
    for (const arm of SIDE_ARMS) {
      const w = sideWord(t, arm as "YES" | "NO", line);
      if (!isRealWord(w, arm, loc)) wordGaps.push(`side ${loc}/${line}/${arm} → ${JSON.stringify(w)}`);
    }
    for (const arm of [...SIDE_ARMS, "VOID"]) {
      const w = outcomeWord(t, arm as "YES" | "NO" | "VOID", line);
      if (!isRealWord(w, arm, loc)) wordGaps.push(`outcome ${loc}/${line}/${arm} → ${JSON.stringify(w)}`);
    }
    for (const arm of POS_ARMS) {
      const w = positionStatusWord(t, arm as PositionStatusValue, line);
      if (!isRealWord(w, arm, loc)) wordGaps.push(`status ${loc}/${line}/${arm} → ${JSON.stringify(w)}`);
    }
  }
}
check("§1 every enum arm resolves to a real word in all 3 locales × both products",
  wordGaps.length === 0, wordGaps.slice(0, 6).join(" · "));

// ⭐ The Up & Down vocabulary must actually DIFFER from the poll one, or the whole
// product-awareness is decorative. This is the check that would have caught Ali's
// original report ("NO won" where it should say "DOWN won") at its root.
const notDistinct: string[] = [];
for (const loc of LOCALES) {
  const t = dict[loc] as Parameters<typeof sideWord>[0];
  for (const arm of SIDE_ARMS) {
    const poll = sideWord(t, arm as "YES" | "NO", "MARKET");
    const round = sideWord(t, arm as "YES" | "NO", "UPDOWN");
    if (poll === round) notDistinct.push(`${loc}/${arm}: both "${poll}"`);
  }
}
check("§1b the round vocabulary is genuinely different from the poll vocabulary",
  notDistinct.length === 0, notDistinct.join(" · "));

// ───────────────────────────────────────────────────────────────────────────
// §2 · No ASCII enum token inside a Swahili or Chinese string.
// ───────────────────────────────────────────────────────────────────────────
const ENUM_TOKEN = /\b(YES|NO|UP|DOWN|VOID|OPEN|WIN|LOSS|MARKET|UPDOWN|CLOSED|RESOLVED|LIVE|DRAFT|VOIDED|CASHED_OUT|PENDING)\b/;

/**
 * ⛔ DECIDED exceptions only, each with its reason. This is NOT a place to park a defect:
 * an entry here is a statement that the English token is the intended product word.
 */
const TOKEN_OK = new Map<string, string>([
  ["home.heroHeadline", "the brand line — verbatim in all three locales by Ali (PLAN-OF-RECORD §7b), and already allowlisted in i18n-parity"],
]);

const dictSrc = readFileSync(join(SRC, "lib", "i18n-dict.ts"), "utf8");
const dictLines = dictSrc.split(/\r?\n/);
const blockStart = (k: string) => dictLines.findIndex((l) => new RegExp(`^  ${k}: \\{`).test(l));
const bEn = blockStart("en"), bSw = blockStart("sw"), bZh = blockStart("zh");
const bEnd = dictLines.findIndex((l) => /^\} as const;/.test(l));
// ⛔ Refuse to run rather than scan nothing — the exact failure §5 is written against.
if (bEn < 0 || bSw < 0 || bZh < 0 || bEnd < 0) {
  log(`  FAIL §2 locale block boundaries not found (en=${bEn} sw=${bSw} zh=${bZh} end=${bEnd}) — scanner would have covered NOTHING`);
  fail++;
}

/** Every string literal on a line, so a KEY named `statusVoid` is never mistaken for a value. */
function stringLiteralsOf(line: string): string[] {
  return line.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? [];
}
/** The predicate, exported in spirit so §5 can aim a known violation at it. */
function lineCarriesEnumToken(line: string): boolean {
  return stringLiteralsOf(line).some((s) => ENUM_TOKEN.test(s));
}

const tokenHits: string[] = [];
if (bSw >= 0 && bZh >= 0 && bEnd >= 0) {
  for (const [name, from, to] of [["sw", bSw, bZh], ["zh", bZh, bEnd]] as const) {
    for (let i = from; i < to; i++) {
      if (!lineCarriesEnumToken(dictLines[i])) continue;
      const key = /^\s*(\w+):/.exec(dictLines[i])?.[1] ?? "?";
      // The allowlist is keyed by path tail; match on the leaf key, which is unique enough here.
      const allowed = [...TOKEN_OK.keys()].some((p) => p.endsWith(`.${key}`));
      if (!allowed) tokenHits.push(`${name}:${i + 1} ${key}`);
    }
  }
}
check("§2 no ASCII enum token inside a Swahili or Chinese string",
  tokenHits.length === 0, tokenHits.join(" · "));

// ───────────────────────────────────────────────────────────────────────────
// §3 · No enum interpolated into a sentence.
//      `resolved ${opts.outcome}` is the shape; a URL or a key is not.
// ───────────────────────────────────────────────────────────────────────────
const ENUM_WORD = /\b(outcome|resolvedOutcome|sentinelOutcome|side|status)\b/i;
/** A label function's output is a WORD, not an enum — those interpolations are the fix. */
const VIA_LEXICON = /(sideWord|outcomeWord|positionStatusWord|sideWordIn|outcomeWordIn|sideLabel|statusLabel|outcomeLabel)/;

/**
 * Does ONE `${…}` expression put an enum into the sentence?
 *
 * ⛔ THE QUOTES ARE STRIPPED FIRST, and that is not a detail. `t.market.onSide.replace("{side}",
 * sideLabel)` contains the letters `side` only inside a QUOTED PLACEHOLDER — it is the fixed
 * form, not the defect. Testing the raw expression flagged the corrected code, which is the
 * fastest way to teach a session to ignore a guard.
 */
function exprCarriesEnum(expr: string): boolean {
  let bare = expr.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, "");
  // ⛔ A DICTIONARY LOOKUP IS A TRANSLATED STRING, NEVER AN ENUM — and the key that proves it
  // is `t.market.resolvedOutcome`, whose NAME is an enum name. Left in, the scanner read the
  // translated label "Resolved outcome" as the enum it labels, and flagged every corrected
  // line in the codebase. `t.<path>` is stripped before the enum test for that reason.
  bare = bare.replace(/\bt\.\w+(?:\.\w+)*/g, "");
  if (VIA_LEXICON.test(expr)) return false;      // already routed through the lexicon
  if (/\?\s*["']/.test(expr)) return false;      // ⛔ ternary yielding a LITERAL = a tone/class, not a word
  return ENUM_WORD.test(bare);
}

/** Tailwind class lists read like prose to a regex and are not prose. */
const CLASSY = /\b(text|font|bg|btn|chip|border|rounded|tracking|uppercase|inline|flex|gap|opacity|leading)-?\[?\w/;

/**
 * Is this template a SENTENCE a player reads, rather than a path, a class list, a cache key,
 * an English-only surface, or a developer diagnostic?
 *
 * ⛔ Getting this wrong in the permissive direction is how a guard goes quiet; getting it wrong
 * in the strict direction is how a guard gets ignored. Both exclusions below are DECIDED:
 *   · a literal that also interpolates a `*En` field is English BY CONSTRUCTION — the OG/social
 *     description does exactly this beside `m.titleEn`, and naming YES there is consistent;
 *   · an assert/throw's context string is read by an ENGINEER looking at a crash, and naming
 *     the enum is the correct thing to do there.
 */
function isProseTemplate(lit: string, before = ""): boolean {
  const outside = lit.replace(/\$\{[^}]*\}/g, " ");
  if (/:\/\/|href|^`\/|\/[a-z-]+\/|[?&]\w+=/.test(lit)) return false;   // URL / path / query
  if (CLASSY.test(outside)) return false;                                // a class list
  if (/\b\w+En\b/.test(lit)) return false;                               // English-only by construction
  if (/(assert\w*|throw|new Error)\s*\(?[^;]*$/.test(before)) return false; // developer diagnostic
  if (!/\s/.test(outside)) return false;                                 // no spaces → not prose
  return /[A-Za-z]{3,}|[一-鿿]/.test(outside);                   // a word, or Chinese
}
/**
 * ⛔ QUOTED SUBSTRINGS ARE NEUTRALISED BEFORE THE `${…}` EXTRACTION, and this one bit.
 * `${t.market.onSide.replace("{side}", sideLabel)}` contains a `}` INSIDE a string literal,
 * so a `\$\{[^}]*\}` extractor stops there and hands back the fragment
 * `t.market.onSide.replace("{side` — which ends in a bare word `side` and reads as an enum.
 * The guard therefore flagged the CORRECTED code, on an aria-label that is already routed
 * through the lexicon. A scanner that fails on the fix is worse than no scanner.
 */
function templateInterpolatesEnum(lit: string, before = ""): boolean {
  const safe = lit.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  const exprs = [...safe.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]);
  if (!exprs.some(exprCarriesEnum)) return false;
  // 🔴 A TEMPLATE THAT IS *ONLY* INTERPOLATIONS IS STILL A SENTENCE, and missing that let a
  // live defect through. `${t.market.resolvedOutcome} ${m.resolvedOutcome}` has no literal
  // word between the braces, so `isProseTemplate`'s "must contain a word" test rejected it —
  // and it was rendering "已结算 YES" on the production markets board while this suite was
  // green. ⭐ A dictionary lookup in the template IS the proof it is copy: nothing reaches
  // for `t.` except to say something to a person.
  if (exprs.some((e) => /\bt\.\w/.test(e))) return true;
  return isProseTemplate(lit, before);
}

/** Blank out block and line comments, preserving offsets so reported line numbers stay true. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\r\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\r\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = walk(SRC).filter((f) => !f.endsWith(join("lib", "side-label.ts")));
check("§3 scanner has files to scan", files.length > 200, `${files.length} files`);

const interpHits: string[] = [];
for (const f of files) {
  // ⛔ COMMENTS ARE STRIPPED FIRST. A fix's own explanation quotes the defect it removed —
  // `resolved ${opts.outcome}` appears verbatim inside the comment above the corrected line.
  // Scanning raw source made the guard report the very fix that satisfied it, which is the
  // fastest possible way to teach a reader that this suite cries wolf.
  const src = stripComments(readFileSync(f, "utf8"));
  // ⛔ ADMIN IS ENGLISH BY DESIGN — one language, and the console names the enum on purpose
  // so an officer and the database agree. §L applies to player surfaces.
  if (f.includes(join("app", "admin")) || f.includes(join("components", "admin"))) continue;
  // Dev-test routes are double-gated out of production (404 there); they are not a surface.
  if (f.includes(join("api", "dev-test"))) continue;
  // ⛔ SCOPE: THE TRILINGUAL COPY SURFACE — DETECTED, NEVER LISTED.
  //
  // §L3's defect class is an enum landing in copy that exists in more than one language;
  // that is what makes it a LABEL bug rather than a wording preference. A single-language
  // internal error return (`kyc-service`'s "KYC is ${k.status} — only an APPROVED player…",
  // the proposals-service refusals) is a DIFFERENT concern with a DIFFERENT owner:
  // `FAILURE-INVENTORY.md` §1.5's raw-server-string ratchet. Two guards owning one rule is
  // how they drift apart (§0a), so this one does not reach for that.
  //
  // 🔴 THIS WAS A HARDCODED FILE LIST AND IT MISSED ALI'S BUG. The list named
  // `notification-service.ts` and `email.ts` — and the Up & Down push copy lives in
  // `market-service.ts`, so the guard was blind to the exact defect that started the
  // session. `red:labels` caught it at 7/8. A surface is now recognised by what it DOES:
  // a file that writes `titleSw`/`bodyZh` is producing trilingual copy, wherever it sits.
  // Outside the JSX tree, the signal is the KEY the literal is assigned to: trilingual copy
  // is written as `titleEn/titleSw/titleZh` and `bodyEn/bodySw/bodyZh`. A `return { error: …}`
  // string is not that, however humanised — `proposals-service` lowercases its enum into
  // "a changes requested proposal", which is English-only prose owned by §1.5's ratchet.
  const isJsxTree = f.includes(join("src", "app")) || f.includes(join("src", "components"));
  const TRILINGUAL_KEY = /\b(title|body|subject)(En|Sw|Zh)\s*:\s*$/;
  for (const m of src.matchAll(/`(?:[^`\\]|\\.)*`/g)) {
    const lit = m[0];
    const before = src.slice(Math.max(0, m.index - 90), m.index);
    if (!isJsxTree && !TRILINGUAL_KEY.test(before)) continue;
    if (templateInterpolatesEnum(lit, before)) {
      interpHits.push(`${f.slice(ROOT.length + 1)}:${src.slice(0, m.index).split("\n").length}`);
    }
  }
}
check("§3 no enum is interpolated into a sentence on a player surface",
  interpHits.length === 0, interpHits.slice(0, 8).join(" · "));

// ───────────────────────────────────────────────────────────────────────────
// §4 · The lexicon is the only definition site — RATCHET, downward only.
// ───────────────────────────────────────────────────────────────────────────
/**
 * A side/outcome test whose consequent is a DICTIONARY lookup is a private copy of the
 * word map. ⛔ A tone ternary (`? "yes" : "no"`, `? "text-yes-300"`) is NOT one — a colour
 * is not a word, and counting those would push sessions to "fix" correct code.
 */
const PRIVATE_MAP = /===\s*"(YES|NO|UP|DOWN)"\s*\?\s*t\./;

/**
 * ⛔ THIS NUMBER MAY ONLY EVER GO DOWN. It is MEASURED, never picked.
 *
 * ⭐ 15 → 14 on 2026-08-15: `trust-band.tsx` is folded into the lexicon. It was listed below
 * as needing "a product decision about what the landing shows for an unrecorded outcome" —
 * and it did not: `ticker.ts` rule 5 (law 25) had already made that decision, *"a row whose
 * outcome is absent is DROPPED rather than guessed"*. The landing was simply bypassing it,
 * because `page.tsx` feeds the band from `recentSettlements` directly. Applying an existing
 * rule to a surface that was skipping it is not a new decision.
 *
 * Each remaining site has a reason it survived:
 *   · 7 Up & Down files were being edited by a parallel session in the same hour, and a
 *     collision there costs more than the tidy-up is worth;
 *   · `market-card.tsx` is pinned by `test:outcome` §3, which asserts its literal
 *     `resolvedOutcome === "YES"` shape — folding it in needs that guard rewritten and
 *     re-proved in the same commit, not a quiet edit.
 *
 * ⚠️ AND A COMMENT CAN BE THE VIOLATION. The first draft of the trust-band fix QUOTED the
 * line it had just deleted, and the count stayed at 15 — the note explaining the fix was
 * itself the fifteenth private word-map, because this scanner reads raw lines and cannot tell
 * code from prose about code. Describe the old shape; do not paste it.
 */
const PRIVATE_MAP_RATCHET = 14;

const privateMaps: string[] = [];
for (const f of walk(SRC)) {
  if (f.endsWith(join("lib", "side-label.ts"))) continue;
  const src = readFileSync(f, "utf8");
  src.split(/\r?\n/).forEach((l, i) => {
    if (PRIVATE_MAP.test(l)) privateMaps.push(`${f.slice(ROOT.length + 1)}:${i + 1}`);
  });
}
check(`§4 private word-maps outside the lexicon do not increase (≤ ${PRIVATE_MAP_RATCHET})`,
  privateMaps.length <= PRIVATE_MAP_RATCHET,
  `found ${privateMaps.length}: ${privateMaps.slice(0, 4).join(", ")}`);
if (privateMaps.length < PRIVATE_MAP_RATCHET) {
  log(`  NOTE §4 ratchet can be tightened to ${privateMaps.length} — lower it in this file.`);
}

// ───────────────────────────────────────────────────────────────────────────
// §5 · POSITIVE CONTROL — show every scanner input it MUST reject.
//      A blind scanner reports "0 violations" in the same words as a clean tree.
// ───────────────────────────────────────────────────────────────────────────
log("");
check("§5a token scanner rejects a Chinese string carrying YES",
  lineCarriesEnumToken(`      probOverTime: "YES 概率随时间变化",`));
check("§5b token scanner rejects a Swahili string carrying CASHED_OUT",
  lineCarriesEnumToken(`      faq6a: "Mauzo yanabadilisha dau kuwa CASHED_OUT na pesa zinarudi.",`));
check("§5c token scanner ACCEPTS a clean Chinese string",
  !lineCarriesEnumToken(`      probOverTime: "「是」概率随时间变化",`));
check("§5d token scanner is not fooled by a KEY named like an enum",
  !lineCarriesEnumToken(`      statusVoid: "已作废", statusLive: "实时",`));

check("§5e interpolation scanner rejects `resolved ${opts.outcome}`",
  templateInterpolatesEnum("`${title} · resolved ${opts.outcome}.`"));
check("§5f interpolation scanner rejects a Chinese sentence carrying the enum",
  templateInterpolatesEnum("`${title} · 结果：${opts.outcome}。`"));
check("§5g interpolation scanner ACCEPTS the lexicon-routed form",
  !templateInterpolatesEnum("`${title} · resolved ${outcomeWordIn(\"en\", opts.outcome, \"MARKET\")}.`"));
check("§5h interpolation scanner ACCEPTS a URL carrying ?side=",
  !templateInterpolatesEnum("`/markets/${m.id}?side=${side}`"));

check("§5i private-map matcher rejects a dictionary ternary",
  PRIVATE_MAP.test(`  const l = row.outcome === "YES" ? t.common.yes : t.common.no;`));
check("§5j private-map matcher ACCEPTS a tone ternary (a colour is not a word)",
  !PRIVATE_MAP.test(`  const tone = row.outcome === "YES" ? "chip-yes" : "chip-no";`));

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${LOCALES.length} locales × ${LINES.length} products, ${files.length} files scanned, ${privateMaps.length}/${PRIVATE_MAP_RATCHET} private maps`);
process.exit(fail === 0 ? 0 : 1);
