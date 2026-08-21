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
 *   §11 ⭐ THE OFFICER CONSOLE IS A SURFACE TOO — and a RUNTIME enum is still an enum
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
 * A CSS VALUE is not prose either, and it is the shape CLASSY cannot see: an inline
 * `style={{ background: … }}` interpolates a computed colour rather than a class list.
 * `poll-actions.tsx` builds `color-mix(in oklab, ${statusColor(q.status)} 8%, transparent)` —
 * the expression names `status`, so the enum test fires, and the template is a paint
 * instruction with no reader. A tone is not a word (the same distinction §4's PRIVATE_MAP
 * draws for ternaries), so it is judged the same way: not copy, not this guard's business.
 */
const CSS_VALUE = /\b(?:color-mix|oklch|rgba?|hsla?|calc|clamp|linear-gradient|radial-gradient|translate[XYZ]?|rotate|scale)\s*\(|var\(--/;

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
  if (CSS_VALUE.test(lit)) return false;                                 // a paint instruction
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
const PRIVATE_MAP_RATCHET = 11;
// ⭐ 14 → 11 on 2026-08-21. The three that left are not a decision taken here: the campaign's
// earlier stages folded them into the lexicon, and this file printed "NOTE §4 ratchet can be
// tightened to 11" on every run since. A ratchet that reports slack and never takes it up is
// not a ratchet — it is a number that once meant something.

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


// ───────────────────────────────────────────────────────────────────────────
// §7 · The NOTIFY path carries all three titles — a shape, not a word
// ───────────────────────────────────────────────────────────────────────────
/**
 * 🔴 §7.2c: *"`notifyWin` takes a `label` the caller builds from `m.titleEn`, so a Chinese
 * player's inbox reads a Chinese sentence around an English market question."* Every player
 * emitter that embedded a market title took a bare `marketTitle: string`, and every caller
 * passed `m.titleEn` — so the SW and ZH bodies were correct sentences wrapped around English.
 * The ticker fixed exactly this for its own titles; the notification path never did.
 *
 * ⛔ THE GUARD IS ON THE SHAPE, NOT ON A WORD. A prose test would pass the moment someone
 * translated one sentence. What must hold is that the signature cannot ACCEPT a bare English
 * string — so a caller reaching for `m.titleEn` fails to compile rather than shipping quietly.
 */
{
  const notif = readFileSync(join(SRC, "lib/server/notification-service.ts"), "utf8");
  const market = readFileSync(join(SRC, "lib/server/market-service.ts"), "utf8");

  // ⚠️ SCOPED TO PLAYER EMITTERS. The one surviving `marketTitle: string` is
  // `notifyAdminObjectionFiled`, and §7f pins that it is the only one — so this cannot be
  // satisfied by quietly reverting a player emitter to a bare string.
  const bareSigs = notif.split(/\r?\n/).filter((l) => /marketTitle: string/.test(l));
  check("§7a no PLAYER emitter takes a bare `marketTitle: string`",
    bareSigs.length === 1 && /notifyAdminObjectionFiled/.test(bareSigs[0]),
    bareSigs.length !== 1
      ? `${bareSigs.length} bare signatures — a string cannot carry SW or ZH, and the caller will pass titleEn`
      : `the survivor is not the admin one: ${bareSigs[0].trim().slice(0, 70)}`);
  check("§7b the emitters take the three-language shape",
    (notif.match(/marketTitle: LocalizedText/g) ?? []).length >= 5,
    "");
  check("§7c `notifyWin`'s label is localized too — it was the one that took a pre-built string",
    /export function notifyWin\(userId: string, amount: number, label: LocalizedText, href: string\)/.test(notif),
    "");
  // ⛔ AND THE CALLERS ACTUALLY PASS ALL THREE. A signature widened while every caller still
  // hands it `localizedText(m.titleEn)` would type-check perfectly and change nothing.
  // ⚠️ `notifyAdmin*` IS EXCLUDED, and that is not a convenience: the admin console is
  // monolingual English by design, so a staff notice built from `titleEn` is correct.
  const bareTitleEn = market.split(/\r?\n/).filter((l) =>
    /notify[A-Z]\w*\(|alertWatchers\w*\(/.test(l) && !/notifyAdmin/.test(l)
    && /\bm\.titleEn\b|\bmarket\.titleEn\b/.test(l) && !/localizedText\(/.test(l));
  check("§7d every PLAYER notify/alert caller passes all three titles, not `titleEn`",
    bareTitleEn.length === 0,
    bareTitleEn.length ? bareTitleEn[0].trim().slice(0, 90) : "");
  check("§7e …and they go through `localizedText`, so the empty-translation fallback is one rule",
    (market.match(/localizedText\(/g) ?? []).length >= 9, "");
  // ⚠️ THE ADMIN EMITTER IS DELIBERATELY EXEMPT — one audience, one language, by design.
  check("§7f ⚠️ the ADMIN objection emitter stays English by design",
    /notifyAdminObjectionFiled\(objectionId: string, marketTitle: string\)/.test(notif),
    "widening an English-only staff notice would demand three titles to serve one language");
}


// ───────────────────────────────────────────────────────────────────────────
// §8 · A MIXED BOOK CANNOT USE ONE VOCABULARY
// ───────────────────────────────────────────────────────────────────────────
/**
 * 🔴 THIS SECTION EXISTS BECAUSE §1–§7 WERE ALL GREEN WHILE ALI'S BUG WAS STILL LIVE ON THE
 * SURFACE HE NAMED. Consultants found it after the sweep shipped; the guard had not.
 *
 * `/positions/performance` calls `listPositionsForUser(userId, 5_000)` with **no product
 * line** — correctly, because a performance summary that hid half a player's book would
 * misstate their money. It then rendered `p.side` raw, so a player who backed **Up** read
 * "YES · TZS 5,000" in their own history, in all three languages.
 *
 * ⭐ THE RULE THAT GENERALISES: the omitted third argument is the tell. A caller that asks
 * for EVERY product line is holding both vocabularies at once, so it is exactly the caller
 * that may not hard-code either. §4's ratchet could not see this — there was no `=== "YES" ?`
 * to count. The defect was the ABSENCE of a decision, and absence is what this checks.
 *
 * ⛔ Do not "fix" a listed file by adding a product filter. Filtering would hide bets from a
 * page whose whole job is to total them; the fix is to ask the market for its line, which is
 * already in hand at every one of these call sites.
 */
{
  const MIXED_CALL = /listPositionsForUser\s*\(\s*[^,)]+,\s*[^,)]+\s*\)/;   // exactly 2 args → no productLine
  const RENDERS_SIDE = /\{\s*(?:[A-Za-z_$][\w$]*\.)?(?:side|outcome|resolvedOutcome)\s*\}/;
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (!MIXED_CALL.test(src) || !RENDERS_SIDE.test(src)) continue;
    if (/from "@\/lib\/side-label"/.test(src)) continue;   // it asks the lexicon — that is the fix
    offenders.push(f.slice(ROOT.length + 1));
  }
  check("§8 a surface holding EVERY product line resolves its side words through the lexicon",
    offenders.length === 0,
    `raw side on a mixed book: ${offenders.join(", ")}`);
}

// ───────────────────────────────────────────────────────────────────────────
// §9 · A MONEY RECORD'S `description` IS A PLAYER SURFACE
// ───────────────────────────────────────────────────────────────────────────
/**
 * 🔴 THE THIRD PLACE ALI'S BUG SURVIVED, AND THE SECOND GUARD MISS IN ONE DAY.
 *
 * The wallet's Activity tab renders `Transaction.description` verbatim. Two of them were
 * built by interpolating the STORED token:
 *
 *   · `${opts.side} on "…"`      → *"YES on \"Bitcoin Up or Down\""*
 *   · `${opts.outcome} won · "…"` → *"NO won · \"Bitcoin Up or Down\""*
 *
 * ⛔ §3 could not see these BY CONSTRUCTION. It recognises trilingual copy by the key a
 * literal is assigned to — `titleEn/titleSw/titleZh`, `bodyEn/bodySw/bodyZh` — because that
 * is what makes a string player-facing *in three languages*. A `description` is English-only
 * operational prose, so §3 excluded it deliberately and correctly. What nobody noticed is
 * that English-only does not mean machine-only: **this one is rendered to the player**, so
 * the WORD still has to be the right word even though the SENTENCE stays English.
 *
 * ⭐ The rule: a description may stay English; it may not stay in the storage vocabulary.
 */
{
  /**
   * ⛔ BARE INTERPOLATION ONLY — `${opts.side}`, never `${side === "UP" ? copy.up : …}`.
   * The first draft matched any `side` inside the braces and flagged `use-quick-bet.ts`,
   * whose ternary ALREADY resolves to the Up & Down words. A guard that fails on correct
   * code teaches the next session to weaken it. The defect is the **absence** of a
   * decision, so the pattern is the shape that contains no decision at all.
   */
  const DESC = /description:\s*(?:[^`\n]*)?`[^`]*\$\{\s*(?:[A-Za-z_$][\w$]*\.)?(?:side|outcome)\s*\}/;
  const offenders: string[] = [];
  for (const f of files) {
    readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => {
      if (!DESC.test(l)) return;
      offenders.push(`${f.slice(ROOT.length + 1)}:${i + 1}`);
    });
  }
  check("§9 a money record's description names the side in the product's vocabulary",
    offenders.length === 0,
    `raw enum in a rendered description: ${offenders.join(", ")}`);
}

// ───────────────────────────────────────────────────────────────────────────
// §10 · A MIXED-BOOK SURFACE MAY NOT NAME ITS PRODUCT WITH A LITERAL
// ───────────────────────────────────────────────────────────────────────────
/**
 * 🔴 THIS EXISTS BECAUSE §8 IS STRUCTURALLY BLIND TO THE SURFACE THE GAMING BOARD ASKED FOR,
 * and finding that out is `E-169`.
 *
 * §8 asks its question through two locators that both miss `/results`:
 *   ① it `continue`s on any file importing `@/lib/side-label` — and a file that passes a WRONG
 *     literal to the lexicon imports the lexicon, so the escape hatch fires on exactly the
 *     files most worth checking. `results/page.tsx` was excused by its own import;
 *   ② its mixed-book detector matches `listPositionsForUser(x, y)` only, so a page that reads
 *     `listMarkets({ productLine: "ALL" })` is never even looked at.
 *
 * ⭐ THE RULE, STATED SO IT CANNOT BE SATISFIED BY AN IMPORT: if a file's own read declares that
 * it holds BOTH product lines, then every side word on it must be resolved from the ROW, and a
 * string literal in the product-line argument is the tell. This is the same law `side-label.ts`
 * states for its parameter — *"There is no default, on purpose"* — applied one level out: a
 * literal on a mixed book is a default wearing an argument.
 *
 * ⛔ AND IT DELIBERATELY DOES NOT BAN LITERALS OUTRIGHT. `markets/page.tsx`, `page.tsx`,
 * `landing-hero.tsx` and `markets/[id]/page.tsx` all pass `"MARKET"` and are CORRECT to: they
 * provably hold one product, and `side-label.ts` asks a caller to say which. A rule that failed
 * them would teach the next session to weaken it. §10b proves both directions in this run.
 */
{
  /**
   * ⛔ COMMENTS STRIPPED FIRST. `market-service.ts:284` DOCUMENTS the rule in prose — *"any MONEY
   * or REGULATOR read must opt IN with `productLine: \"ALL\"`"* — and the first draft of this
   * section read that sentence as a mixed-book read. A guard that cannot tell code from a comment
   * about code will be turned off by the first person it lies to.
   */
  const codeOnly = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /** The file's own declaration, in CODE, that it holds both lines. */
  const MIXED_READ = /productLine\s*:\s*["']ALL["']/;

  /**
   * A lexicon call, captured so its arguments can be judged separately.
   *
   * ⭐ THE DEFECT IS A DATA-DERIVED SIDE WITH A HARD-WRITTEN PRODUCT, and that pairing is the
   * whole signature. Two shapes are therefore NOT the defect and must stay green:
   *
   *   · **both arguments literal** — `sideWord(t, "YES", "MARKET")`. Nothing about a row is being
   *     described; the call is NAMING a vocabulary, which is how `/results` labels its own product
   *     filter pills. The literal IS the meaning.
   *   · **a literal inside an arm that already established the product** — `market-service.ts:1175`
   *     sits in the `else` of a product branch whose comment reads *"this is the one arm where the
   *     product line is genuinely UPDOWN"* and warns against merging the arms. A regex cannot see
   *     a branch, so this section does not look at services at all (see SURFACES below); §3, §7
   *     and §9 already own the notification paths.
   */
  const CALL = /\b(?:sideWord|outcomeWord|sideWordIn|outcomeWordIn)\s*\(([^()]*)\)/g;
  const isLiteral = (arg: string) => /^\s*["']/.test(arg);

  /**
   * ⛔ RENDER SURFACES ONLY. The requirement Jay filed is about what a PLAYER READS, and a page
   * or component holds one book for its whole render — so a literal there is a claim about the
   * whole surface and can be judged. A service resolves per call inside product branches.
   */
  const SURFACES = /[\\/]src[\\/](app|components)[\\/]/;

  /**
   * The predicate, kept as a named function so §10b can aim known input at THIS code rather
   * than at a copy of it — §5's rule, and the reason a scanner that has gone blind gets caught.
   */
  const offends = (raw: string) => {
    const text = codeOnly(raw);
    if (!MIXED_READ.test(text)) return false;
    for (const m of text.matchAll(CALL)) {
      const args = m[1].split(",");
      if (args.length < 3) continue;
      const side = args[args.length - 2];
      const line = args[args.length - 1];
      // literal product + data-derived side = the defect. Both-literal = a label.
      if (isLiteral(line) && !isLiteral(side)) return true;
    }
    return false;
  };

  const offenders: string[] = [];
  for (const f of files) {
    if (!SURFACES.test(f)) continue;
    if (offends(readFileSync(f, "utf8"))) offenders.push(f.slice(ROOT.length + 1));
  }
  check("§10 a surface that reads BOTH product lines resolves every side word from the row",
    offenders.length === 0,
    `literal product line on a mixed book: ${offenders.join(", ")}`);

  // ── §10b · POSITIVE CONTROL, in this same run ────────────────────────────
  // ⛔ Both directions, because a refusal with no positive control is an absent test (§0 rule 2)
  // and a rule that also fails correct code is worse than no rule at all.
  check("§10b the scanner REJECTS a mixed read that passes a literal",
    offends('const rows = await listMarkets({ productLine: "ALL" });' +
            'const w = outcomeWord(t, m.resolvedOutcome ?? "VOID", "MARKET");'),
    "the exact shape of results/page.tsx:366 before Unit A — if this passes, the scanner is blind");

  check("§10b the scanner ACCEPTS a single-product surface passing a literal",
    !offends('const rows = await listMarkets({ status: "RESOLVED" });' +
             'const w = outcomeWord(t, m.resolvedOutcome ?? "VOID", "MARKET");'),
    "markets/page.tsx is correct to name its one product — a rule that fails it would be weakened");

  check("§10b the scanner ACCEPTS a label that names a product with BOTH arguments literal",
    !offends('const rows = await listMarkets({ productLine: "ALL" });' +
             'const label = `${sideWord(t, "YES", "MARKET")} / ${sideWord(t, "NO", "MARKET")}`;'),
    "/results names its own product filter pills this way — flagging it would force a new dict key");

  check("§10b the scanner does not read a COMMENT as a mixed-book read",
    !offends('// any MONEY or REGULATOR read must opt IN with `productLine: "ALL"`' + String.fromCharCode(10) +
             'const w = outcomeWord(t, m.resolvedOutcome, "MARKET");'),
    "market-service.ts:284 documents the rule in prose; the first draft of §10 flagged the sentence");

  check("§10b the scanner ACCEPTS a mixed read that resolves from the row",
    !offends('const rows = await listMarkets({ productLine: "ALL" });' +
             'const w = outcomeWord(t, m.resolvedOutcome ?? "VOID", m.productLine);'),
    "the fixed shape must be green, or the rule cannot be satisfied");

  // ⚠️ And the scanner must have had something to scan — a §10 that covered nothing would
  // report the same green as a §10 that covered everything (§5's whole reason for existing).
  check("§10b the scanner actually saw the mixed-book surfaces",
    files.some((f) => MIXED_READ.test(readFileSync(f, "utf8"))),
    "no file in the scan declares productLine \"ALL\" — the locator has drifted");
}

// ───────────────────────────────────────────────────────────────────────────
// §11 · THE OFFICER CONSOLE IS A SURFACE TOO — AND A RUNTIME ENUM IS STILL AN ENUM
// ───────────────────────────────────────────────────────────────────────────
/**
 * 🔴 §3 CARRIES `if (f.includes("app/admin") || f.includes("components/admin")) continue;`
 * AND THAT ONE LINE IS WHY THIRTEEN OFFICER SURFACES PRINTED DATABASE SPELLING.
 *
 * The skip is not wrong about what it says — the console IS English by design, so §3's
 * *trilingual* question genuinely does not apply there. It is wrong about what it was read to
 * mean. "This file speaks one language" got treated as "this file has no label rules", and
 * under that reading `<Chip>{kyc.status}</Chip>` shouted **PENDING_REVIEW** at a compliance
 * officer, the player list printed **SELF_EXCLUDED** and **PENDING_KYC**, /admin/transactions
 * rendered all three money columns as `value.replace(/_/g, " ")` — so the officer reconciling
 * against a Selcom statement read *"ADJUSTMENT DEBIT"*, *"AML REVIEW"* and *"TIGO PESA"* —
 * and the DSAR queue offered **ERASURE**, the one word on that page that must not be misread.
 * Stage 4 routed all of it through `src/lib/admin-status-lexicon.ts`. This section is what
 * stops it coming back.
 *
 * ⭐ AND THE HARDER HALF: TWO OF THOSE WERE INVISIBLE TO EVERY STRING SCAN IN THIS FILE.
 * The withdraw and deposit confirm dialogs rendered `provider.replace(/_/g, " ")` — the last
 * screen a player sees before money moves, naming the rail in database spelling — and the
 * token never appears as a literal anywhere. §1–§10 all match on TEXT; a value that arrives
 * through a variable has none. So §11a guards the **shape** instead:
 *
 *   ⛔ DE-UNDERSCORING IS NOT LOCALISATION. There is exactly one reason to turn `A_B` into
 *   "A B" at a render site: the value is SCREAMING_SNAKE and a human is about to read it.
 *   Stripping the underscore does not make it a word — it makes a misspelling ("Aml review",
 *   "TIGO PESA"). The fix is a lexicon entry, never a `.replace`.
 *
 * The one non-label use of `_` in this repo is base64url decoding, and it is excluded by
 * VALUE rather than by filename: it replaces `_` with `/`, never with whitespace.
 */
{
  // ── §11a · the de-underscore shape ───────────────────────────────────────
  /**
   * `x.replace(/_/g, " ")` · `x.replaceAll("_", " ")` · `x.split("_")` · `x.split(/_/)`.
   * The replacement is CAPTURED so base64url (`_` → `/`) is judged on what it produces
   * rather than on where it lives — `register-sw.ts` and `proxy.ts` are decoding, not
   * labelling, and a filename exemption would have gone stale the first time either moved.
   */
  const DEUNDER =
    /\.(?:replace\s*\(\s*\/_\/g\s*,|replaceAll\s*\(\s*["']_["']\s*,)\s*(["'`])([^"'`]*)\1\s*\)|\.split\s*\(\s*(?:\/_\/|["']_["'])\s*\)/g;
  /** A replacement that produces a human-readable gap. `/` or `+` is a codec, not a label. */
  const HUMANISING = (repl: string | undefined) => repl === undefined || /^[\s·.-]*$/.test(repl);

  /** The predicate, named so §11d can aim known input at THIS code and not at a copy. */
  function deUnderscoreHits(src: string): string[] {
    const out: string[] = [];
    const clean = stripComments(src);
    for (const m of clean.matchAll(DEUNDER)) {
      if (!HUMANISING(m[2])) continue;                       // codec, not a label
      out.push(clean.slice(0, m.index).split("\n").length.toString());
    }
    return out;
  }

  /**
   * ⛔ BY DESIGN, NOT BY BACKLOG — one entry, and it is the lexicon's OWN last resort.
   * `status-badge.tsx`'s `humanise()` exists so a value no map knows degrades to something
   * readable instead of shouting at an officer. It is the floor under the lexicon, so the
   * one place de-underscoring is the right answer is the place that owns the labels.
   */
  const DEUNDER_BY_DESIGN = new Map<string, string>([
    ["src/components/admin/status-badge.tsx",
     "humanise() — the lexicon's documented last resort for an unmapped value"],
  ]);

  /**
   * ⛔ THE BACKLOG, MEASURED 2026-08-21. THIS MAP MAY ONLY EVER SHRINK.
   * Both are real: an officer and a player respectively read database spelling today.
   *   · `admin/page.tsx` — the Provider-mix bar labels its segments `provider.split("_")[0]`,
   *     so the 28-day deposit share reads TIGO / HALO / TTCL / BANK instead of the brand
   *     spellings the lexicon already holds (`MONEY.providerTigoPesa`, …).
   *   · `email.ts` — `kycSubmittedHtml` maps three doc codes by hand and de-underscores the
   *     rest. IDENTITY-POLICY widened identity to FOUR documents on 2026-08-20, so every
   *     passport / driving-licence / voter's-card code now falls through to the fallback and
   *     reaches the player's inbox as de-underscored database spelling.
   */
  const DEUNDER_RATCHET = new Map<string, number>([
    ["src/app/admin/page.tsx", 1],
    ["src/lib/server/email.ts", 1],
  ]);

  const over: string[] = [];
  const stale: string[] = [];
  const seen = new Map<string, number>();
  for (const f of walk(SRC)) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (DEUNDER_BY_DESIGN.has(rel)) continue;
    const lines = deUnderscoreHits(readFileSync(f, "utf8"));
    if (lines.length === 0) continue;
    seen.set(rel, lines.length);
    const allowed = DEUNDER_RATCHET.get(rel) ?? 0;
    if (lines.length > allowed) over.push(`${rel}:${lines.join(",")} (${lines.length} > ${allowed})`);
  }
  for (const [rel, n] of DEUNDER_RATCHET) {
    const now = seen.get(rel) ?? 0;
    if (now === 0) stale.push(`${rel} (now clean — delete the entry)`);
    else if (now < n) log(`  NOTE §11a ${rel} is down to ${now} — lower its ratchet entry.`);
  }
  check("§11a no NEW site de-underscores an enum on its way to a human",
    over.length === 0,
    over.length ? `${over.join(" · ")} — de-underscoring is not localisation; add a lexicon entry` : "");
  check("§11a the de-underscore ratchet holds no stale entries", stale.length === 0, stale.join(", "));
  // ⛔ AND IT MUST HAVE SCANNED SOMETHING. A walk that silently covered nothing reports the
  // same green as a clean tree — §5's whole reason for existing, and rule 3 of standards §5b:
  // prove the thing you found is the thing you meant.
  check("§11a the scanner actually reached the ratcheted files",
    [...DEUNDER_RATCHET.keys()].every((rel) => seen.has(rel)),
    `expected a hit in ${[...DEUNDER_RATCHET.keys()].filter((r) => !seen.has(r)).join(", ")} — the walk has drifted`);

  // ── §11b · a known enum ARM as literal display text ──────────────────────
  /**
   * The second shape: the token typed out by hand where a human reads it.
   *
   * ⛔ THE TOKEN SET IS READ FROM `prisma/schema.prisma`, NEVER HAND-LISTED — the same rule
   * §1 follows. A new underscored arm on any enum is covered on the next run, with no edit
   * here. And ONLY underscored arms are judged: `SPORTS`, `YES` and `LIVE` are legitimate
   * words in an English console, while `A_B` in database spelling never is. That single
   * restriction is what keeps this rule from crying wolf on correct copy.
   *
   * ⚠️ IT IS ALSO WHY THE FIRST DRAFT WAS USELESS. A blanket "no SCREAMING_SNAKE in admin
   * display text" found 18 hits and every single one was an ENVIRONMENT VARIABLE —
   * `DATABASE_URL`, `SMS_PROVIDER`, `ANTHROPIC_API_KEY` — which the ops pages must name
   * exactly. Asserting the VALUE (an arm that really exists in the schema) instead of the
   * SHAPE (anything shouty) drops all 18 without an exemption list.
   */
  const underscoredArms = new Set<string>();
  for (const m of schema.matchAll(/enum\s+\w+\s*\{([^}]*)\}/g)) {
    for (const l of m[1].split(/\r?\n/)) {
      const t = l.replace(/\/\/.*$/, "").trim();
      if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(t)) underscoredArms.add(t);
    }
  }
  check("§11b the schema yielded underscored enum arms to look for",
    underscoredArms.size > 30, `only ${underscoredArms.size} — the schema parse has drifted`);
  const ARM = new RegExp(`\\b(?:${[...underscoredArms].join("|")})\\b`);

  /**
   * ⛔ DISPLAY POSITIONS ONLY. `status === "PENDING_REVIEW"` and `<option value="ERASURE">`
   * are the enum doing its job; the defect is the token in the place a person READS.
   * Two positions carry that: a JSX text child, and a label-shaped object field or
   * display attribute.
   */
  function literalArmHits(src: string): string[] {
    const clean = stripComments(src);
    const out: string[] = [];
    const at = (i: number) => clean.slice(0, i).split("\n").length.toString();
    // ⛔ NEWLINES ARE PART OF A JSX TEXT CHILD, and the first draft excluded them — which made
    // this whole section decoration. The red harness typed the token into the player drill-in's
    // KYC chip, where the text sits on its own line between a `/>` and a `</Chip>`, and the
    // scanner did not see it. `<`, `>`, `{` and `}` are what bound a text run; a line break is
    // not one of them.
    //
    // ⚠️ AND ALLOWING THE NEWLINE ALONE OVER-CORRECTED, IMMEDIATELY: an arrow function's `=>`
    // supplies a `>` and the next JSX tag supplies a `<`, so `useState<KycDocSlot>(… ??
    // "NIDA_FRONT"); const [zoom, setZoom] = useState<` read as one long "text child" and four
    // perfectly correct files were flagged. `;` and `=` are what separate the two: they end
    // statements and bind names, and JSX display text does neither.
    for (const m of clean.matchAll(/>([^<>{}=;]{2,160})</g)) if (ARM.test(m[1])) out.push(at(m.index));
    // ⚠️ AND THE RUN MUST ALSO BE ALLOWED TO START AFTER A `}`. The red harness's token sat one
    // line below a `{cond ? <A/> : <B/>}` expression child, so the nearest preceding character
    // was a closing brace, not a `>` — and a `>`-only opener missed the SAME mutation twice.
    // `{expr}Text<` is ordinary JSX.
    //
    // ⛔ BUT `}` … `{` IS ALSO THE COMMONEST SHAPE IN PLAIN CODE, and letting it close on `{`
    // flagged six correct files in one run — a union type's arms, the receipt's chip map, the
    // provider catalogue, `notifyKyc`'s signature. So this second pass closes on `<` ONLY, and
    // refuses a run carrying `:` `"` or `'`: an object key, a type annotation and a string
    // literal all need one of those, and JSX display text needs none of them.
    for (const m of clean.matchAll(/\}([^<>{}=;:"']{2,160})</g)) if (ARM.test(m[1])) out.push(at(m.index));
    for (const m of clean.matchAll(
      /\b(?:label|title|sw|heading|placeholder|aria-label|subtitle|caption|hint|help|message|detail|body|summary)\s*[:=]\s*(["'])([^"']{2,200})\1/g,
    )) if (ARM.test(m[2])) out.push(at(m.index));
    return out;
  }

  /**
   * ⛔ DECIDED, WITH ITS REASON — this is not a place to park a defect.
   *
   * The AML policy tells a regulator, in all three locales, that a held withdrawal sits in
   * `AML_REVIEW` status, in the `font-mono` code voice. That is a QUOTED IDENTIFIER, not a
   * label: the whole point is that the word in the policy matches the word in the console, so
   * translating it would break the match the document exists to make. One file, three lines
   * (en · sw · zh), and the list may only shrink.
   */
  const LITERAL_ARM_OK = new Map<string, string>([
    ["src/app/legal/aml/page.tsx",
     "the AML policy quotes the system's own withdrawal status so a regulator can match policy to console"],
  ]);

  const armHits: string[] = [];
  let armExempt = 0;
  for (const f of walk(SRC)) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    const lines = literalArmHits(readFileSync(f, "utf8"));
    if (lines.length === 0) continue;
    if (LITERAL_ARM_OK.has(rel)) { armExempt += lines.length; continue; }
    armHits.push(`${rel}:${lines.join(",")}`);
  }
  check("§11b no enum arm is typed out where a person reads it",
    armHits.length === 0,
    armHits.length ? `${armHits.join(" · ")} — put the word in admin-status-lexicon.ts` : "");
  check("§11b the exemption list is not carrying a file that is already clean",
    armExempt > 0 || LITERAL_ARM_OK.size === 0,
    "an entry in LITERAL_ARM_OK no longer matches anything — delete it so the list keeps shrinking");

  // ── §11c · §3's prose rule, extended into the console ────────────────────
  /**
   * §3 refuses to scan `app/admin` / `components/admin`. §11c scans exactly those, with the
   * SAME predicate — so an enum interpolated into an officer's sentence fails here.
   *
   * ⛔ AND IT STOPS AT `.tsx`, DELIBERATELY. §3's own header says why: a single-language
   * server-action refusal (`Cannot suspend — the account is ${target.status}.`) belongs to
   * `FAILURE-INVENTORY.md` §1.5's raw-server-string ratchet, and two guards owning one rule is
   * how they drift apart. `.tsx` under those two trees is what an officer READS on a screen;
   * `actions.ts` is what they read in a toast, and that one already has an owner.
   */
  /**
   * ⛔ A `fetch` RESPONSE'S `.status` IS AN HTTP NUMBER, NOT A DOMAIN ENUM, and this one is
   * the reason the exclusion is proved rather than assumed. `ENUM_WORD` matches the *word*
   * `status`, so `` `Server returned ${res.status}` `` read as an enum in a sentence — and it
   * is a 500, which is precisely the right thing to put in that sentence.
   *
   * ⚠️ A BLANKET `res.status` EXCLUSION WOULD BE A BLIND SPOT, and the repo proves it:
   * `updown-result-announcer.tsx` writes `res.status === "WIN"` and
   * `stress-regulator-grade/route.ts` writes `res.status === "fulfilled"` — the same receiver
   * name carrying a real enum. So the exclusion is not on the NAME: the identifier must be
   * bound to a `fetch(` call in the same file. That is a fact about the code, checkable, and
   * it goes stale loudly (the binding disappears) rather than quietly.
   */
  const httpResponseIds = (src: string) => {
    const ids = new Set<string>();
    for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+fetch\s*\(/g)) ids.add(m[1]);
    return ids;
  };
  const onlyHttpStatus = (lit: string, ids: Set<string>) => {
    if (ids.size === 0) return false;
    const exprs = [...lit.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""').matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]);
    const enumish = exprs.filter(exprCarriesEnum);
    return enumish.length > 0 && enumish.every((e) => {
      const m = /^\s*([A-Za-z_$][\w$]*)\.status\s*$/.exec(e);
      return !!m && ids.has(m[1]);
    });
  };

  /**
   * ⛔ MEASURED 2026-08-21, AND THE NUMBER MAY ONLY EVER FALL. Five sites, each with its
   * verdict — a ratchet that does not say WHY an entry is here becomes a list nobody dares
   * shrink:
   *   · `config/fee-simulator.tsx` — `Stake on ${side}` where `side` is a local
   *     `useState<"YES" | "NO">` on a provably poll-only simulator (`yesPool`/`noPool`).
   *     Correct English today. It is here because the token and the word coincide for
   *     `MarketSide` in EN, which is a coincidence, not a rule (§8's whole lesson).
   *   · `insights/page.tsx` — the volume-chart tooltip appends `${m.status}`, so an officer
   *     hovering a bar reads "· RESOLVED" in database spelling. LIFECYCLE already holds the
   *     word. A live, visible defect.
   *   · the RESOLVER, 7 sites across 4 files — the seal chip, the settled banner, the stage-1
   *     and stage-2 toasts, the result modal, the queue's "confirm …" hint and the confirm
   *     button's own verb all interpolate the raw verdict ("SEALED · YES", "Sealed NO",
   *     "Verdict recorded · VOIDED", "Settle YES"). Latent while the resolver serves polls
   *     only; wrong the day it serves an Up & Down round, where the word is UP/DOWN and
   *     never YES/NO.
   *
   * ⚠️ THE FIRST DRAFT OF THIS LIST HELD FIVE ENTRIES, NOT NINE, AND THE MISSING FOUR WERE MY
   * OWN REPORTING BUG: the section printed `hits.slice(0, 8)` and I built the ratchet from what
   * I could see. Truncated output is not an inventory. The grouping below prints every file
   * that exceeds its entry, with no cap.
   */
  const ADMIN_PROSE_RATCHET = new Map<string, number>([
    ["src/app/admin/config/fee-simulator.tsx", 1],
    ["src/app/admin/insights/page.tsx", 1],
    ["src/app/admin/resolver/[id]/page.tsx", 2],
    ["src/app/admin/resolver/[id]/resolution-ceremony.tsx", 1],
    ["src/app/admin/resolver-queue/page.tsx", 1],
    ["src/app/admin/resolver-queue/resolve-controls.tsx", 4],
  ]);

  const adminProse = new Map<string, string[]>();
  let adminFilesScanned = 0;
  for (const f of files) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (!/^src\/(app\/admin|components\/admin)\//.test(rel) || !rel.endsWith(".tsx")) continue;
    adminFilesScanned++;
    const src = stripComments(readFileSync(f, "utf8"));
    const httpIds = httpResponseIds(src);
    for (const m of src.matchAll(/`(?:[^`\\]|\\.)*`/g)) {
      const before = src.slice(Math.max(0, m.index - 90), m.index);
      if (!templateInterpolatesEnum(m[0], before)) continue;
      if (onlyHttpStatus(m[0], httpIds)) continue;
      const rec = adminProse.get(rel) ?? [];
      rec.push(src.slice(0, m.index).split("\n").length.toString());
      adminProse.set(rel, rec);
    }
  }
  const proseOver: string[] = [];
  const proseStale: string[] = [];
  for (const [rel, lines] of adminProse) {
    const allowed = ADMIN_PROSE_RATCHET.get(rel) ?? 0;
    if (lines.length > allowed) proseOver.push(`${rel}:${lines.join(",")} (${lines.length} > ${allowed})`);
  }
  for (const [rel, n] of ADMIN_PROSE_RATCHET) {
    const now = adminProse.get(rel)?.length ?? 0;
    if (now === 0) proseStale.push(`${rel} (now clean — delete the entry)`);
    else if (now < n) log(`  NOTE §11c ${rel} is down to ${now} — lower its ratchet entry.`);
  }
  check("§11c the console is scanned at all — the gap this section closes",
    adminFilesScanned > 40, `only ${adminFilesScanned} admin tsx files reached`);
  check("§11c no NEW enum is interpolated into a sentence an officer reads",
    proseOver.length === 0, proseOver.join(" · "));
  check("§11c the console-prose ratchet holds no stale entries", proseStale.length === 0, proseStale.join(", "));
  const proseTotal = [...adminProse.values()].reduce((n, l) => n + l.length, 0);
  log(`  NOTE §11c ${proseTotal} enum-in-a-sentence site(s) remain in the console, across ${adminProse.size} file(s) — the number may only fall.`);

  // ── §11d · POSITIVE CONTROLS, both directions ────────────────────────────
  log("");
  check("§11d de-underscore scanner rejects the withdraw dialog's old `provider.replace(/_/g, \" \")`",
    deUnderscoreHits('const label = providerRaw.replace(/_/g, " ");').length === 1);
  check("§11d …and the `.split(\"_\")` spelling of the same defect",
    deUnderscoreHits('segments.push({ label: p.provider.split("_")[0] });').length === 1);
  check("§11d …and `replaceAll`, which no earlier draft matched",
    deUnderscoreHits('const l = t.replaceAll("_", " ");').length === 1);
  check("§11d de-underscore scanner ACCEPTS base64url decoding (`_` → `/`, a codec)",
    deUnderscoreHits('const std = s.replace(/-/g, "+").replace(/_/g, "/");').length === 0);
  check("§11d de-underscore scanner ACCEPTS a comment that quotes the defect it removed",
    deUnderscoreHits('// this used to render provider.replace(/_/g, " ") — see §11a').length === 0);

  check("§11d literal-arm scanner rejects `<Chip>PENDING_REVIEW</Chip>`",
    literalArmHits("<Chip size=\"sm\">PENDING_REVIEW</Chip>").length === 1);
  check("§11d literal-arm scanner rejects an arm in a label field",
    literalArmHits('{ label: "SELF_EXCLUDED", value: n }').length === 1);
  check("§11d literal-arm scanner rejects a token on its OWN LINE inside a chip",
    literalArmHits("<Chip size=\"sm\" variant={v}>\n  KYC · PENDING_REVIEW\n</Chip>").length === 1,
    "the newline-spanning text child is the shape that made the first draft of §11b decoration");
  check("§11d literal-arm scanner ACCEPTS a generic + arrow run that merely spans a `>` and a `<`",
    literalArmHits('const [a, setA] = useState<Slot>(first?.type ?? "NIDA_FRONT");\n  const b = xs.map((p) => p.n);\n  return (\n    <>').length === 0,
    "four correct files were flagged by exactly this before `=` and `;` bounded the run");
  check("§11d literal-arm scanner ACCEPTS an env var name — an ops page must spell it exactly",
    literalArmHits("<code>DATABASE_URL</code> is not set").length === 0);
  check("§11d literal-arm scanner ACCEPTS the enum doing its job in code",
    literalArmHits('if (kyc.status === "PENDING_REVIEW") return null;').length === 0);
  check("§11d literal-arm scanner ACCEPTS an <option value> carrying the arm",
    literalArmHits('<option value="ADDITIONAL_INFO_REQUIRED">More information needed</option>').length === 0);

  check("§11d prose scanner ACCEPTS a color-mix() paint instruction naming `status`",
    !templateInterpolatesEnum("`color-mix(in oklab, ${statusColor(q.status)} 8%, transparent)`"),
    "poll-actions.tsx paints its status pill this way — a tone is not a word");
  check("§11d prose scanner still REJECTS the same enum in an actual sentence",
    templateInterpolatesEnum("`Verdict sealed · ${m.resolvedOutcome} on this market`"),
    "if this passes, the CSS exclusion has swallowed the rule it was carved out of");
  {
    const ids = httpResponseIds("const res = await fetch(`/api/admin/reports/${id}`);");
    check("§11d the fetch binding is found, so the HTTP exclusion has a premise",
      ids.has("res"), "no binding found — the exclusion below would be vacuous");
    check("§11d HTTP exclusion fires on `Server returned ${res.status}` when `res` IS a fetch",
      onlyHttpStatus("`Server returned ${res.status}`", ids));
    check("§11d …and does NOT fire when the same name was never bound to fetch",
      !onlyHttpStatus("`Server returned ${res.status}`", new Set<string>()),
      "the exclusion must rest on the binding, not on the identifier's name");
    check("§11d …and does NOT fire on a real enum beside an HTTP status",
      !onlyHttpStatus("`Server returned ${res.status} for ${m.resolvedOutcome}`", ids),
      "one excusable expression must not launder the sentence it sits in");
  }
}

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${LOCALES.length} locales × ${LINES.length} products, ${files.length} files scanned, ${privateMaps.length}/${PRIVATE_MAP_RATCHET} private maps`);
process.exit(fail === 0 ? 0 : 1);