/**
 * NO PLAYER-FACING STRING MAY MISSTATE WHERE IDENTITY IS ASKED — IN EITHER DIRECTION.
 *
 *   npm run test:kyc-copy-truth        (in predeploy)      RED: npm run red:kyc-copy-truth
 *
 * 🔴 WHY THIS FILE EXISTS, AND IT IS NOT HYPOTHETICAL. When the 2026-09-05 gate shipped, the source was
 * swept for the old ladder and every occurrence fixed. Six MORE false statements survived that sweep, in
 * the dictionary, saying the same thing in different words — `profile.verifyBody` ("It is not required
 * in order to withdraw"), `auth.welcomeNewBody`, `wallet.verifyGateFootnote`, `help.faq4a` — and
 * `verifyBody` rendered TWO LINES BELOW the gate panel, so one screen said both things at once.
 * ⭐ NOT ONE OF THEM CONTAINED THE PHRASE THAT WAS GREPPED FOR. A sweep for a form of words finds the
 * sentences written in those words; the product is written in every other form of words too. So this
 * guard tests the CLAIM, not the phrasing, in ALL THREE LOCALES — the Swahili and Chinese halves are
 * the ones that survive review, and they are two thirds of our players.
 *
 * ── ⛔ THE RULE INVERTED ON 2026-09-13, SO THE GUARD GREW A SECOND DIRECTION ──────────────────────────
 *
 * Identity is now asked before WITHDRAWAL and nothing else (docs/COMPLIANCE-DECISIONS.md, top 2026-09-13
 * entries; copy rule in docs/IDENTITY-POLICY.md). The sentence this file used to hold up as CORRECTED —
 * "Identity verification is required before you can deposit, place a bet or withdraw" — is now the false
 * one, and a denial rule cannot see it: it denies nothing. Three rules, each its own assertion:
 *
 *   rule 1 · §1 · money moves WITHOUT identity      deny ∧ money ∧ identity in one unit      (2026-09-05)
 *   rule 2 · §3 · identity bound to the ENTRANCE    identity ∧ entrance ∧ requirement        (2026-09-13)
 *   rule 3 · §4 · the gaming regulator as its REASON identity ∧ Gaming Board / Act / GBT     (2026-09-13)
 *
 * ── ⛔ THE POPULATION, AND WHAT THE LAST ONE MISSED ──────────────────────────────────────────────────
 *
 * §1/§3/§4 read every string leaf of the dictionary (which carries `kycNotice.*`, the quiet first-deposit
 * notice). §2 reads EVERY `.ts`/`.tsx` under `src/app/legal/`. 🔴 The 2026-09-07 reader listed only
 * `page.tsx`, and matched only locale blocks indented exactly two spaces — so `agent-terms/page.tsx` was opened
 * and matched nothing (four spaces), `rules/_content-yes-no.tsx` and `rules/_content-up-down.tsx` were never
 * listed at all, and its "four of eight" pages was reported as a pass. The first run of this reader found a
 * denial word in agent-terms (zh) — see the allow-set. Blocks are now found by balanced brackets, a file
 * with no locale block FAILS unless it is in the reasoned skip-list, and every file × locale prints its
 * unit count so an empty population is a visible zero rather than a silent green.
 *
 * ── ⚠️ THE UNIT, PER RULE — stated, because each is a deliberate trade ──────────────────────────────
 *
 *   · rule 1 and rule 3 read a PARAGRAPH (`<p>`/`<li>`, an array item, a string): a denial and its money
 *     verb can sit in two sentences of one claim.
 *   · rule 2 reads a SENTENCE, plus that sentence's neighbours. Identity ∧ entrance ∧ requirement in one
 *     sentence is a hit; so is identity ∧ requirement in one sentence with the entrance named in the
 *     sentence before or after ("Verify your identity first. Then you can deposit.").
 *     ⛔ NOT THE WHOLE PARAGRAPH, and the reason is a TRUE paragraph: /legal/aml §4 says an identity review
 *     assesses sanctions exposure, and — two sentences on — that a suspension "stops deposits, bets and
 *     withdrawals … where the law requires it". A paragraph-wide rule flags that in English. It is frozen
 *     below as a control that must pass, in all three languages.
 *     ⚠️ The limit that buys: a claim spread over three or more sentences with an unrelated one between is
 *     not seen. IDENTITY-POLICY's stricter advice — split identity and the entrance into separate `<p>` —
 *     is still the way to write it.
 *
 * ⛔ A FAILED OR EMPTY READ IS NEVER A PASS. Every population carries a floor, and every rule is shown the
 * sentence it must reject and the one it must accept in the same run: a scanner that has gone blind
 * reports "0 violations" in exactly the words a clean tree does.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { dict } from "../src/lib/i18n-dict.ts";
// ⛔ THE SHARED STRIPPER, never a private one — the WHY-comments in these pages quote the very sentences
// the rules reject (terms/page.tsx carries the 2026-09-05 wording in its version note).
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s);

type Loc = "en" | "sw" | "zh";
const LOCALES: readonly Loc[] = ["en", "sw", "zh"];
type Rule = 1 | 2 | 3;
const RULES: readonly Rule[] = [1, 2, 3];
const RULE_NAME: Record<Rule, string> = {
  1: "no unit claims money moves without identity",
  2: "no unit binds identity to the entrance",
  3: "no unit gives the gaming regulator as the reason for identity",
};

// ═══ §0 · THE THREE RULES ═══════════════════════════════════════════════════════════════════════════

/**
 * RULE 1 — "<money verb> … does not need identity".
 *
 * ⛔ THREE HALVES, ALL REQUIRED. Matching only the negation flags every "no fee"; matching only the money
 * verb flags most of the dictionary. A violation is a NEGATION and a MONEY VERB and an IDENTITY WORD in one
 * unit.
 */
const R1: Record<Loc, { deny: RegExp; money: RegExp; identity: RegExp }> = {
  en: {
    // ⭐ 2026-09-07: `not a precondition` — /legal/aml §1 said it in those words and the old alternation
    //   could not see it (AGENT-STRESS-TEST-FINDINGS, the legal finding).
    deny: /\b(not required|no need|without|doesn'?t need|don'?t need|not needed|isn'?t required|not a precondition|no precondition)\b/i,
    // ⛔ WORD-BOUNDED ON BOTH SIDES since 2026-09-13. The prefix form read "play" inside "player" and "bet"
    //   inside "better", which is why the AML page had to say "account holder" to get past it. Inflections are
    //   listed, not left to a prefix.
    money: /\b(withdraw(?:s|n|al|als|ing)?|cash(?:ing|ed)?[- ]?outs?|deposit(?:s|ed|ing)?|add(?:s|ed|ing)? money|bet(?:s|ting)?|play(?:s|ed|ing)?|stak(?:e|es|ed|ing))\b/i,
    identity: /\b(identity|verif|KYC|ID\b|NIDA)/i,
  },
  sw: {
    // ⭐ 2026-09-13: `si lazima` ("not necessary") and `huhitaji` ("you do not need") — the two ordinary ways
    //   Swahili says it that the passive forms missed. ⚠️ The trailing \b is what keeps `huhitajika`
    //   ("is needed") out: that is the OPPOSITE claim, and a control below holds it.
    deny: /\b(hauhitajiki|hakihitajiki|hazihitajiki|bila|si lazima|huhitaji)\b/i,
    // ⭐ 2026-09-07: `kutoa fedha` — /legal/terms §3 (sw) said "hauhitajiki ili kutoa fedha" and the money
    //   alternation only knew `pesa`. Same defect, other synonym.
    money: /\b(kutoa pesa|kuweka pesa|kutoa fedha|kuweka fedha|kucheza|kuweka dau|dau)/i,
    identity: /\b(utambulisho|kitambulisho|uthibitisho|thibitisha)/i,
  },
  zh: {
    // ⭐ 2026-09-13: `无须` (formal "need not") and `不用` (spoken "no need").
    deny: /(无需|无须|不需要|不必|不用)/,
    money: /(提现|充值|投注|下注|游戏)/,
    identity: /(身份|验证|认证)/,
  },
};
const rule1 = (loc: Loc, t: string) => R1[loc].deny.test(t) && R1[loc].money.test(t) && R1[loc].identity.test(t);

/**
 * RULE 2 — identity bound to the ENTRANCE (adding money, depositing, betting, playing).
 *
 * ⛔ THE IDENTITY WORDS ARE NARROWER THAN RULE 1's, AND THAT IS THE POINT. Confirming an EMAIL before a
 * deposit is TRUE (register → confirm email → deposit and play), and it is written "verify your email",
 * "thibitisha barua pepe", "验证邮箱". So bare verify / thibitisha / 验证 never count here — only words that
 * name identity itself. English also counts "we've verified you" / "you're verified" (the 2026-09-05
 * "open up once we've verified you"), but not in a sentence about an email.
 * ⛔ THE EXIT IS NOT A MONEY WORD HERE. Withdraw / cash out / kutoa pesa / 提现 is exactly where identity
 * belongs; naming it beside identity is the correct sentence, not a violation.
 */
const EMAIL = /\b(e-?mail|inbox|barua pepe)\b|邮箱|电子邮件|邮件/i;
const R2: Record<Loc, { identity: RegExp; verifiedYou?: RegExp; entrance: RegExp; binds: RegExp; beforeEntrance?: RegExp }> = {
  en: {
    identity: /\b(?:[Ii]dentit(?:y|ies)|KYC|IDs?|NIDA)\b/,
    verifiedYou: /\bverif(?:y|ies|ied|ying)\s+you\b(?!r)|\byou(?:'re|’re|\s+are)\s+verified\b/i,
    entrance: /\b(?:deposit(?:s|ed|ing)?|add(?:s|ed|ing)?\s+money|top(?:s|ped|ping)?\s+up|bet(?:s|ting)?|play(?:s|ed|ing)?|stak(?:e|es|ed|ing)|wager(?:s|ed|ing)?)\b/i,
    binds: /\b(?:require[sd]?|requirement|must|needs?\s+to|first|until|unlock(?:s|ed)?|opens?|open\s+up|before\s+(?:you|they)\s+(?:can\s+)?(?:deposit|add\s+money|bet|play|stake)|to\s+(?:deposit|add\s+money|bet|play|stake))\b/i,
  },
  sw: {
    identity: /\b(?:utambulisho|kitambulisho|vitambulisho|uthibitisho wa utambulisho|KYC)\b/i,
    entrance: /\b(?:kuweka\s+(?:pesa|fedha|dau|amana)|kuongeza\s+pesa|kucheza)\b/i,
    binds: /\b(?:inahitajika|unahitajika|zinahitajika|lazima|kwanza|hufunguka|kufungua|kufunguliwa|ili\s+(?:kuweka|kucheza|kuongeza)|kabla\s+ya\s+(?:kuweka|kucheza|kuongeza))\b/i,
  },
  zh: {
    identity: /身份|KYC|实名/,
    entrance: /充值|存款|投注|下注/,
    binds: /必须|须先|先完成|才能|方可|后即可|之后即可|解锁/,
    // ⚠️ 之前 / 前 ("before") binds only in the SAME sentence as an entrance word — alone it is in half the
    //   withdrawal copy ("首次提现前").
    beforeEntrance: /之前|前/,
  },
};
const sentencesOf = (t: string): string[] =>
  t.split(/\n+|(?<=[.!?])\s+|(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
/** The offending sentence, or null. */
function rule2(loc: Loc, t: string): string | null {
  const r = R2[loc];
  const s = sentencesOf(t);
  const names = (x: string) => r.identity.test(x) || (!!r.verifiedYou && r.verifiedYou.test(x) && !EMAIL.test(x));
  const entrance = (x: string | undefined) => x !== undefined && r.entrance.test(x);
  for (let i = 0; i < s.length; i++) {
    if (!names(s[i])) continue;
    const binds = r.binds.test(s[i]);
    if (entrance(s[i]) && (binds || (!!r.beforeEntrance && r.beforeEntrance.test(s[i])))) return s[i];
    if (binds && (entrance(s[i - 1]) || entrance(s[i + 1]))) return `${s[i]} ⟷ ${entrance(s[i - 1]) ? s[i - 1] : s[i + 1]}`;
  }
  return null;
}

/**
 * RULE 3 — the gaming regulator given as the reason for identity.
 *
 * 🔴 DELETED TWICE ALREADY. `withdraw.verifyFirstBody` and `help.faq4a` both asserted the Tanzania Gaming Act
 * requires identity before a withdrawal — a legal claim the Board's own instruction of 2026-08-19 contradicts
 * (i18n-dict.ts keeps both tombstones). Identity at withdrawal is the OWNER's ruling; AML attributions are true
 * and stay. ⛔ Locale-agnostic on purpose: the Swahili and Chinese legal text names the Board in English too.
 */
const R3_BODY = /Gaming\s+(?:Board|Act|Control)|\bGBT\b|Bodi\s+ya\s+Michezo|Sheria\s+ya\s+Michezo|博彩委员会|博彩法|博彩管理/;
const R3_IDENTITY = /\b(?:[Ii]dentit(?:y|ies)|[Vv]erif\w*|KYC|IDs?|NIDA|[Uu]tambulisho|[KkVv]itambulisho|[Uu]thibitisho|(?:[Kk]u)?[Tt]hibitisha\w*)\b|身份|验证|认证|实名/;
const rule3 = (t: string) => R3_BODY.test(t) && R3_IDENTITY.test(t);

function hitsOf(loc: Loc, text: string): { rule: Rule; why: string }[] {
  const out: { rule: Rule; why: string }[] = [];
  if (rule1(loc, text)) out.push({ rule: 1, why: text });
  const s = rule2(loc, text);
  if (s) out.push({ rule: 2, why: s });
  if (rule3(text)) out.push({ rule: 3, why: text });
  return out;
}

/**
 * ⛔ THE ALLOW-SET — a TRUE unit that a rule still matches. Each entry pins the unit's exact decoded text by
 * hash, so an edit to that unit (including one that makes it false) voids the allowance and the rule fires
 * again. §5 pins the size and fails on an entry that matches nothing: an allowance outliving its string is
 * how an allow-list becomes a hole.
 */
type Allow = { where: string; rule: Rule; sha: string; excerpt: string; why: string };
const ALLOW: readonly Allow[] = [
  {
    // ⭐ Found 2026-09-13, the first run that ever opened this file (four-space blocks were invisible to the
    //   2026-09-07 reader). Read in full and TRUE: the identity sentence is the AGENT application's own
    //   requirement (purpose="agent", kept by ruling), and the denial 无需 is about the agent fee — "no receipt
    //   to upload, no reference to type" — three sentences later. The en and sw twins carry no denial word,
    //   so only Chinese trips. ⛔ Not reworded here: player copy is not this guard's to edit.
    where: "src/app/legal/agent-terms/page.tsx · zh",
    rule: 1,
    sha: "5b4bd2f920b7d9f8",
    excerpt: "余额不足时请先按常规方式充值 — 无需上传收据，也无需填写参考号。",
    why: "the denial is about a fee receipt; identity is the agent application's own requirement, in another sentence",
  },
];
const ALLOW_SIZE = 1;
const used = new Set<Allow>();
const shaOf = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);

type Unit = { key: string; text: string };
function scan(where: string, locs: readonly Loc[], units: readonly Unit[]): Record<Rule, string[]> {
  const found: Record<Rule, string[]> = { 1: [], 2: [], 3: [] };
  for (const u of units) {
    for (const loc of locs) {
      for (const h of hitsOf(loc, u.text)) {
        const a = ALLOW.find((x) => x.where === where && x.rule === h.rule && x.sha === shaOf(u.text));
        if (a) { used.add(a); continue; }
        const line = `${u.key}: "${clip(h.why, 160)}" [sha ${shaOf(u.text)}]`;
        if (!found[h.rule].includes(line)) found[h.rule].push(line);
      }
    }
  }
  return found;
}

// ═══ §1 · RULE 1 — money moves without identity, and THE DICTIONARY ═════════════════════════════════════
console.log("\n§1 · rule 1 — money moves without identity · the dictionary");

function flat(o: unknown, p = "", out: [string, string][] = [], odd: string[] = []) {
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (typeof v === "string") out.push([p + k, v]);
    else if (v && typeof v === "object") flat(v, `${p}${k}.`, out, odd);
    else odd.push(`${p}${k} (${typeof v})`);
  }
  return { out, odd };
}
/** ⛔ A floor, not a count: a dictionary that stopped importing would otherwise read as clean. */
const DICT_FLOOR = 2000;
const dictUnits = {} as Record<Loc, Unit[]>;
const dictFound = {} as Record<Loc, Record<Rule, string[]>>;
for (const loc of LOCALES) {
  const { out, odd } = flat(dict[loc]);
  dictUnits[loc] = out.map(([key, text]) => ({ key, text }));
  ok(`§1 dict · ${loc} · the population is read`, out.length >= DICT_FLOOR, `${out.length} strings (floor ${DICT_FLOOR})`);
  ok(`§1 dict · ${loc} · every leaf is a string`, odd.length === 0, odd.length ? `a non-string leaf is skipped silently: ${odd.slice(0, 5).join(", ")}` : "");
  const hasNotice = out.some(([k]) => k === "kycNotice.body");
  ok(`§1 dict · ${loc} · kycNotice.* is inside it (the quiet first-deposit notice)`, hasNotice,
    hasNotice ? "" : "kycNotice.body not found — the one identity notice a depositing player sees is going unread");
  dictFound[loc] = scan(`dict · ${loc}`, [loc], dictUnits[loc]);
  ok(`§1 dict · ${loc} · rule 1 — ${RULE_NAME[1]}`, dictFound[loc][1].length === 0, dictFound[loc][1].join(" | "));
}

// ⭐ POSITIVE CONTROLS — each language is shown the sentence it must reject, and one it must NOT, in the same run.
{
  const cases: [Loc, string, boolean][] = [
    ["en", "Identity verification is not required before a withdrawal.", true],
    ["en", "A withdrawal is charged a 1.5% fee and nothing else.", false],
    ["sw", "Uthibitisho wa utambulisho hauhitajiki kabla ya kutoa pesa.", true],
    ["sw", "Kutoa pesa kunatozwa ada ya 1.5% pekee.", false],
    ["zh", "提现无需身份验证。", true],
    ["zh", "提现收取 1.5% 手续费。", false],
    // ⭐ 2026-09-13 — the word boundary: "player" is not "play", and "playing" still is.
    ["en", "Every player can verify their identity without an appointment.", false],
    ["en", "You can keep playing without verifying your identity.", true],
    // ⭐ 2026-09-13 — the new denial words, and the positive form they must not swallow.
    ["sw", "Si lazima kuthibitisha utambulisho ili kutoa pesa.", true],
    ["sw", "Huhitaji kitambulisho ili kutoa pesa.", true],
    ["sw", "Kitambulisho huhitajika kabla ya kutoa pesa.", false],
    ["zh", "提现无须身份验证。", true],
    ["zh", "提现不用验证身份。", true],
    // ⛔ A REQUIREMENT IS NOT A DENIAL. This was the "corrected" sentence of 2026-09-07; it is false since
    //   2026-09-13, and rule 1 is blind to it by construction — §3's rule 2 is what rejects it.
    ["en", "Identity verification is required before you can deposit, place a bet or withdraw.", false],
  ];
  for (const [loc, s, shouldFlag] of cases) {
    ok(`§1 control.${loc} · rule 1 ${shouldFlag ? "REJECTS" : "accepts"} "${clip(s, 44)}"`, rule1(loc, s) === shouldFlag);
  }
  // The sentences that were LIVE on 2026-09-07, verbatim — each invisible to the dictionary sweep of its day.
  const live: [Loc, string][] = [
    ["en", "Identity verification is not required in order to withdraw. You may verify at any time with any one of four documents"],
    ["en", "Identity verification is offered to every player and is not a precondition of withdrawal."],
    ["sw", "Uthibitisho wa utambulisho hauhitajiki ili kutoa fedha. Unaweza kuthibitisha wakati wowote"],
    ["sw", "Uthibitisho wa utambulisho unapatikana kwa kila mchezaji na hauhitajiki kabla ya kutoa fedha."],
    ["zh", "提现无需完成身份验证。您可随时使用四种证件之一进行验证"],
    ["zh", "我们为每位玩家提供身份验证，但提现无需先完成验证。"],
  ];
  for (const [loc, t] of live) ok(`§1 control.${loc} · the LIVE 2026-09-07 sentence is rejected: "${clip(t, 40)}"`, rule1(loc, t));
}

// ═══ §2 · THE LEGAL PAGES — every file under src/app/legal, every locale, all three rules ═══════════════
//
// 🔴 /legal/terms §3 stated "Identity verification is not required in order to withdraw" in the BINDING
// English text for two days after the 2026-09-05 ruling, and /legal/aml §1 said "is not a precondition of
// withdrawal". Neither is a dictionary string: the legal pages are inline `Record<Locale, ReactNode>` by
// convention. So the population here is the files themselves, split by locale block and read unit by unit.
console.log("\n§2 · the legal pages");

const LIT = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\[\s\S])*`/g;
function unquote(lit: string): string {
  let body = lit.slice(1, -1);
  if (lit[0] === "`") { let prev: string; do { prev = body; body = body.replace(/\$\{[^{}]*\}/g, " "); } while (body !== prev); }
  return body
    .replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_m, a: string | undefined, b: string | undefined) => String.fromCodePoint(parseInt(a ?? b ?? "20", 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\(.)/g, "$1");
}
const decodeEntities = (t: string) => t
  .replace(/&apos;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/**
 * JSX → the words a reader sees. ⭐ An expression's own string literals are KEPT, innermost first: a
 * ternary's two branches are copy (agent-terms §3 renders "You earn for as long as your recruits play." from
 * inside one), and the 2026-09-07 reader deleted every `{…}` wholesale.
 */
function decodeJsx(t: string): string {
  let prev: string;
  do {
    prev = t;
    t = t.replace(/\{([^{}]*)\}/g, (_m, inner: string) => ` ${[...inner.matchAll(LIT)].map((m) => unquote(m[0])).join(" ")} `);
  } while (t !== prev);
  return decodeEntities(t.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
/** End index of a string/template literal opened at `i`, or -1. Same contract as scripts/lib/decomment.mts. */
function endLiteral(src: string, i: number): number {
  const q = src[i];
  if (q === "`") {
    let depth = 0;
    for (let j = i + 1; j < src.length; j++) {
      const c = src[j];
      if (c === "\\") { j++; continue; }
      if (c === "$" && src[j + 1] === "{") { depth++; j++; continue; }
      if (c === "}" && depth > 0) { depth--; continue; }
      if (c === "`" && depth === 0) return j;
    }
    return -1;
  }
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === "\\") { j++; continue; }
    if (c === "\n") return -1;
    if (c === q) return j;
  }
  return -1;
}
/**
 * ⚠️ JSX PARENS ARE COUNTED RAW, NOT LEXED. JSX text holds bare apostrophes ("never holds players' money" in
 * agent-terms §1), and a quote-aware scanner would open a string there — the `tap-target` lexer's trap. Prose
 * parentheses are balanced in practice; when they are not, the close lands somewhere that is not `,` `}` or
 * `)` and findBlocks FAILS the file rather than reading a truncated block.
 */
function closeRaw(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) return i;
  }
  return -1;
}
function closeArray(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") { const j = endLiteral(src, i); if (j < 0) return -1; i = j; continue; }
    if (c === "[") depth++;
    else if (c === "]" && --depth === 0) return i;
  }
  return -1;
}

type Block = { loc: Loc; kind: "jsx" | "array" | "string"; start: number; end: number };
/**
 * Every locale block in a decommented file: `en: (` JSX, `en: [` string arrays, `en: "…"` strings, and the
 * `{locale === "en" && ( … )}` form /legal/rules uses for its commission line. A key inside an already-read
 * block belongs to that block.
 */
const KEY = /(?<![\w$.])(en|sw|zh)\s*:\s*(?=[(["'`])|\blocale\s*===\s*["'](en|sw|zh)["']\s*&&\s*(?=\()/g;
function findBlocks(src: string, lineOf: (i: number) => number) {
  const blocks: Block[] = [];
  const errors: string[] = [];
  for (const m of src.matchAll(KEY)) {
    const loc = (m[1] ?? m[2]) as Loc;
    const open = (m.index ?? 0) + m[0].length;
    if (blocks.some((b) => open > b.start && open < b.end)) continue;
    const c = src[open];
    const kind: Block["kind"] = c === "(" ? "jsx" : c === "[" ? "array" : "string";
    const close = kind === "jsx" ? closeRaw(src, open) : kind === "array" ? closeArray(src, open) : endLiteral(src, open);
    if (close < 0) { errors.push(`${loc} ${kind} block at line ${lineOf(open)} never closes`); continue; }
    if (kind !== "string" && !/^\s*[,})\]]/.test(src.slice(close + 1, close + 40))) {
      errors.push(`${loc} ${kind} block at line ${lineOf(open)} closes at line ${lineOf(close)} on neither , } ) nor ] — the bracket count is off`);
      continue;
    }
    blocks.push({ loc, kind, start: open, end: close + 1 });
  }
  return { blocks, errors };
}

const PARA = /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g;
const TEXT = />([^<>{}]*\p{L}[^<>{}]*)</gu;
/** Literals and JSX text left once the paragraphs are read: section titles, table heads and cells, labels. */
function looseUnits(rest: string, at: (i: number) => number): Unit[] {
  const units: Unit[] = [];
  for (const m of rest.matchAll(LIT)) {
    const t = unquote(m[0]).replace(/\s+/g, " ").trim();
    if (/\p{L}/u.test(t)) units.push({ key: `literal@${at(m.index ?? 0)}`, text: t });
  }
  for (const m of rest.matchAll(TEXT)) {
    const t = decodeEntities(m[1]).replace(/\s+/g, " ").trim();
    if (t) units.push({ key: `text@${at(m.index ?? 0)}`, text: t });
  }
  return units;
}
const blank = (s: string) => s.replace(/[^\n]/g, " ");
function unitsOf(src: string, b: Block, lineOf: (i: number) => number): { units: Unit[]; paragraphs: number } {
  const body = src.slice(b.start, b.end);
  const at = (i: number) => lineOf(b.start + i);
  // ⚠️ Whitespace collapsed like JSX text, so a dropped `${…}` leaves one space, not three.
  const norm = (t: string) => t.replace(/\s+/g, " ").trim();
  if (b.kind === "string") return { units: [{ key: `string@${at(0)}`, text: norm(unquote(body)) }], paragraphs: 0 };
  if (b.kind === "array") {
    return { units: [...body.matchAll(LIT)].map((m) => ({ key: `item@${at(m.index ?? 0)}`, text: norm(unquote(m[0])) })), paragraphs: 0 };
  }
  const paras: Unit[] = [];
  for (const m of body.matchAll(PARA)) {
    const t = decodeJsx(m[2]);
    if (t) paras.push({ key: `<${m[1]}>@${at(m.index ?? 0)}`, text: t });
  }
  // A JSX block with no <p>/<li> of its own IS one paragraph — the rules page's `locale === "en" && (<>…</>)`
  // renders inside a <p> that lives outside the block.
  if (paras.length === 0) {
    const t = decodeJsx(body.slice(1, -1));
    return { units: t ? [{ key: `block@${at(0)}`, text: t }] : [], paragraphs: 0 };
  }
  return { units: [...paras, ...looseUnits(body.replace(PARA, blank), at)], paragraphs: paras.length };
}

/**
 * ⛔ THE SKIP-LIST — files with no locale block, each READ and reasoned. A skip is not an exemption from the
 * rules: its literals are still read in §2's "outside locale blocks" pass. Each entry is re-verified every run
 * (still no block, still no prose), so a file that grows copy leaves the list by failing, not by being noticed.
 */
const SKIP: Record<string, string> = {
  "src/app/legal/legal-nav.tsx":
    "The client component that decides the ACTIVE tab. Its labels arrive as props, resolved on the server from LEGAL_NAV in layout.tsx — which this walker reads.",
  "src/app/legal/rules/_shared.tsx":
    "Rate and table machinery for the two rules documents. RulesTable renders the head and rows each document passes in, and those are read in that document's locale block.",
};
const looksLikeProse = (t: string) =>
  /[\u4e00-\u9fff]/.test(t) || t.split(/\s+/).filter((w) => /^[A-Za-z]{3,}[.,;:!?]?$/.test(w)).length >= 4;

/**
 * ⛔ FLOORS — per file × locale, below today's count so a copy edit does not trip them, and far above zero so a
 * reader that goes blind on one of them cannot pass. The three the 2026-09-07 walker never opened are named.
 */
const FLOOR: Record<string, number> = {
  "src/app/legal/terms/page.tsx": 30,
  "src/app/legal/aml/page.tsx": 14,
  "src/app/legal/privacy/page.tsx": 30,
  "src/app/legal/responsible-gambling/page.tsx": 14,
  "src/app/legal/agent-terms/page.tsx": 14,
  "src/app/legal/rules/_content-yes-no.tsx": 40,
  "src/app/legal/rules/_content-up-down.tsx": 40,
  "src/app/legal/rules/page.tsx": 6,
};
const FILE_FLOOR = 14;
// Measured 2026-09-13: 172 per locale (terms 25 · aml 13 · privacy 29 · responsible-gambling 16 · agent-terms 13 ·
// yes-no rules 39 · up-down rules 37) — checked by hand against the files. The 2026-09-07 floor was 60.
const PARAGRAPH_FLOOR = 150;

{
  const LEGAL_DIR = join(ROOT, "src", "app", "legal");
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d).sort()) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(LEGAL_DIR);
  ok("§2 the population is every .ts/.tsx under src/app/legal", files.length >= FILE_FLOOR, `${files.length} files (floor ${FILE_FLOOR})`);

  const read = new Map<string, number>();
  const paragraphs: Record<Loc, number> = { en: 0, sw: 0, zh: 0 };
  for (const abs of files) {
    const rel = relative(ROOT, abs).split("\\").join("/");
    const src = decomment(readFileSync(abs, "utf8"));
    const starts = [0];
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
    const lineOf = (i: number) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= i) lo = mid; else hi = mid - 1; } return lo + 1; };

    const { blocks, errors } = findBlocks(src, lineOf);
    ok(`§2 ${rel} · every locale block it opens also closes`, errors.length === 0, errors.join(" | "));

    let outside = src;
    for (const b of blocks) outside = outside.slice(0, b.start) + blank(src.slice(b.start, b.end)) + outside.slice(b.end);

    if (SKIP[rel] !== undefined) {
      ok(`§2 ${rel} · skip-listed, and still has no locale block`, blocks.length === 0,
        blocks.length === 0 ? "" : `${blocks.length} block(s) — it holds copy now; take it off the skip-list`);
      const prose = [...outside.matchAll(TEXT)].map((m) => m[1].trim()).concat([...outside.matchAll(LIT)].map((m) => unquote(m[0])).filter(looksLikeProse));
      ok(`§2 ${rel} · skip-listed, and still renders no prose of its own`, prose.length === 0, prose.map((p) => `"${clip(p, 50)}"`).join(" | "));
    } else {
      ok(`§2 ${rel} · has locale blocks, or is in the reasoned skip-list`, blocks.length > 0,
        blocks.length > 0 ? "" : "no en/sw/zh block found — read the file: copy the walker cannot find is copy nobody checks");
    }

    if (blocks.length > 0) {
      for (const loc of LOCALES) {
        const mine = blocks.filter((b) => b.loc === loc);
        const got = mine.map((b) => unitsOf(src, b, lineOf));
        const units = got.flatMap((g) => g.units);
        paragraphs[loc] += got.reduce((n, g) => n + g.paragraphs, 0);
        read.set(`${rel} · ${loc}`, units.length);
        console.log(`     ${rel} · ${loc} · ${mine.length} block(s) · ${units.length} unit(s)`);
        ok(`§2 ${rel} · ${loc} · the locale is read`, units.length > 0,
          units.length > 0 ? "" : `${mine.length} block(s), 0 unit(s) — a file with locale blocks carries all three languages, or one goes unread`);
        const found = scan(`${rel} · ${loc}`, [loc], units);
        for (const r of RULES) ok(`§2 ${rel} · ${loc} · rule ${r} — ${RULE_NAME[r]}`, found[r].length === 0, found[r].join(" | "));
      }
    }

    // ⭐ OUTSIDE THE LOCALE BLOCKS — `CARDS` in /legal/rules is a switch, not a Record, and a ternary like
    // agent-terms' VAT clause is no block either. Read under all three languages' rules.
    const loose = looseUnits(outside, lineOf);
    console.log(`     ${rel} · outside locale blocks · ${loose.length} literal(s) and text node(s)`);
    const lf = scan(`${rel} · outside`, LOCALES, loose);
    for (const r of RULES) ok(`§2 ${rel} · outside locale blocks · rule ${r} — ${RULE_NAME[r]}`, lf[r].length === 0, lf[r].join(" | "));
  }

  for (const [rel, n] of Object.entries(FLOOR)) {
    for (const loc of LOCALES) {
      const got = read.get(`${rel} · ${loc}`) ?? 0;
      ok(`§2 floor · ${rel} · ${loc} · at least ${n} units read`, got >= n, `${got}`);
    }
  }
  for (const loc of LOCALES) {
    ok(`§2 floor · ${loc} · at least ${PARAGRAPH_FLOOR} <p>/<li> paragraphs read across the legal pages`, paragraphs[loc] >= PARAGRAPH_FLOOR, `${paragraphs[loc]}`);
  }

  // ⭐ CONTROLS FOR THE READER ITSELF — shapes the live tree has, rebuilt here so a regression in the parser
  // cannot hide behind a page that happens to be clean.
  const fixture = [
    "const C = (): Record<Locale, React.ReactNode> => ({",
    "    en: (",
    "      <>",
    "        <p>An agent never holds players' money (ever).</p>",
    "        <Table label=\"Refunds\" rows={[[\"Ambiguity\", \"The question was unclear\"]]} />",
    "      </>",
    "    ),",
    "    sw: [\"Kanuni ya kwanza\", \"Kanuni ya pili\"],",
    "    zh: `版本 ${V} · 生效`,",
    "});",
    "{locale === \"en\" && (<>Our commission is{\" \"}<strong>13%</strong> on both products.</>)}",
  ].join("\n");
  const lines = (i: number) => fixture.slice(0, i).split("\n").length;
  const fb = findBlocks(fixture, lines);
  const texts = fb.blocks.map((b) => ({ loc: b.loc, units: unitsOf(fixture, b, lines).units.map((u) => u.text) }));
  const fourSpace = fb.errors.length === 0 && !!texts.find((t) => t.loc === "en" && t.units.includes("An agent never holds players' money (ever)."));
  ok("§2 control · a four-space JSX block with a bare apostrophe is read to its close", fourSpace,
    fourSpace ? "" : `${fb.errors.join(" | ")} ${JSON.stringify(texts)}`);
  ok("§2 control · …and its table cells are read too", !!texts.find((t) => t.loc === "en" && t.units.includes("The question was unclear")));
  ok("§2 control · a string-array block yields one unit per item", !!texts.find((t) => t.loc === "sw" && t.units.length === 2));
  ok("§2 control · a template string block drops its interpolation", !!texts.find((t) => t.loc === "zh" && t.units[0] === "版本 · 生效"));
  ok("§2 control · a `locale === \"en\" && (…)` block is one paragraph", !!texts.find((t) => t.loc === "en" && t.units.includes("Our commission is 13% on both products.")));
  const broken = findBlocks("const C = {\n  en: (\n    <p>unbalanced ( paren</p>\n  ),\n};", (i) => i);
  ok("§2 control · ⛔ an unbalanced block FAILS rather than reading short", broken.errors.length > 0 && broken.blocks.length === 0, broken.errors.join(" | "));
  const oldBlind = !/\n {2}en: \(([\s\S]*?)\n {2}\),/.test(fixture);
  ok("§2 control · ⛔ the 2026-09-07 reader's own shape was blind to a four-space block", oldBlind,
    oldBlind ? "" : "the old two-space pattern matched a four-space block — this control no longer proves the fix");
}

// ═══ §3 · RULE 2 — identity bound to the ENTRANCE ═══════════════════════════════════════════════════════
//
// ⭐ The copy rule of 2026-09-13: attach verification FORWARD to the exit, never BACKWARD to the entrance, and
// never name adding money or playing in the same sentence as identity. The dictionary's `kycGate` and
// `kycNotice` groups cite this section.
console.log("\n§3 · rule 2 — identity bound to the entrance");
for (const loc of LOCALES) {
  ok(`§3 dict · ${loc} · rule 2 — ${RULE_NAME[2]}`, dictFound[loc][2].length === 0, dictFound[loc][2].join(" | "));
}
{
  // ⛔ FROZEN — the 2026-09-05 wording in all three languages, and the old KycGatePanel body. Each was TRUE for
  // eight days and each must now be REJECTED.
  const rejected: [Loc, string][] = [
    ["en", "Identity verification is required before you can deposit, place a bet or withdraw."],
    ["en", "Verify your identity to add money, play and cash out."],
    ["en", "Adding money, playing and cashing out all open up once we've verified you."],
    ["sw", "Thibitisha utambulisho wako ili kuweka pesa, kucheza na kutoa pesa."],
    ["sw", "Uthibitisho wa utambulisho unahitajika kabla ya kuweka fedha, kuweka dau au kutoa fedha."],
    ["zh", "完成身份验证后即可充值、投注和提现。"],
    ["zh", "在充值、投注或提现之前，必须先完成身份验证。"],
    // The neighbour tier: the requirement in one sentence, the entrance in the next.
    ["en", "Verify your identity first. Then you can deposit and play."],
  ];
  for (const [loc, t] of rejected) ok(`§3 control.${loc} · REJECTED: "${clip(t, 48)}"`, rule2(loc, t) !== null);

  // ⛔ FROZEN — true sentences, which must pass ALL THREE rules.
  const accepted: [Loc, string][] = [
    ["en", "Verify your identity before you cash out."],
    ["en", "Verify your identity anytime before your first withdrawal."],
    ["sw", "Thibitisha utambulisho wako kabla ya kutoa pesa."],
    ["zh", "提现前请先验证身份。"],
    // ⭐ /legal/aml §4, verbatim as decoded on 2026-09-13 — identity review in one sentence, a suspension that
    //   stops deposits "where the law requires it" two sentences on. The reason rule 2 reads sentences.
    ["en", "We do not run an automated screening feed against the UN, OFAC, EU or UK HMT sanctions lists. Sanctions and PEP exposure are assessed by a compliance officer as a checklist item during every identity review and every enhanced due diligence review, using the name, date of birth and document details collected under §1. Where an officer records a concern, the account may be suspended — which stops deposits, bets and withdrawals — and a suspicious-activity report is filed with the Financial Intelligence Unit where the law requires it. This policy states only the screening we actually perform; it will be re-versioned before any automated list screening is introduced."],
    ["sw", "Hatuendeshi mfumo wa kiotomatiki wa kuchunguza orodha za vikwazo za UN, OFAC, EU au UK HMT. Hatari ya vikwazo na ya PEP hukaguliwa na afisa wa uzingatiaji kama kipengele cha orodha ya ukaguzi katika kila ukaguzi wa utambulisho na kila ukaguzi wa kina wa mteja (EDD), kwa kutumia jina, tarehe ya kuzaliwa na taarifa za nyaraka zilizokusanywa chini ya §1. Afisa akirekodi wasiwasi, akaunti inaweza kusimamishwa — jambo linalozuia kuweka fedha, kuweka dau na kutoa fedha — na ripoti ya shughuli za kutiliwa shaka huwasilishwa kwa Kitengo cha Intelijensia ya Fedha (FIU) pale sheria inapohitaji. Sera hii inataja tu uchunguzi tunaoufanya kweli; itatolewa toleo jipya kabla ya uchunguzi wowote wa kiotomatiki wa orodha kuanzishwa."],
    ["zh", "我们不运行对照 UN、OFAC、EU 或 UK HMT 制裁名单的自动筛查系统。制裁与 PEP 风险由合规专员在每次身份审核及每次强化尽职调查（EDD）中，依据第 1 条采集的姓名、出生日期及证件信息，作为核查清单项目进行人工评估。若专员记录了疑虑，该账户可被暂停——暂停后无法充值、投注或提现——并在法律要求时向金融情报单位（FIU）提交可疑活动报告。本政策仅陈述我们实际执行的筛查；在引入任何自动名单筛查之前，本政策将先行更新版本。"],
    // ⛔ Confirming an EMAIL before a deposit is the true ladder — bare verify / thibitisha / 验证 are not identity.
    ["en", "Confirm your email to add money and play."],
    ["en", "Verify your email first to deposit."],
    ["sw", "Thibitisha barua pepe yako ili kuweka pesa na kucheza."],
    ["zh", "验证邮箱后即可充值和投注。"],
    // ⛔ "player" is not "play".
    ["en", "Every player verifies their identity once, before their first withdrawal."],
  ];
  for (const [loc, t] of accepted) {
    const h = hitsOf(loc, t);
    ok(`§3 control.${loc} · accepted by all three rules: "${clip(t, 48)}"`, h.length === 0, h.map((x) => `rule ${x.rule}: ${clip(x.why, 80)}`).join(" | "));
  }
}

// ═══ §4 · RULE 3 — the gaming regulator as the reason for identity ══════════════════════════════════════
console.log("\n§4 · rule 3 — the gaming regulator as the reason");
for (const loc of LOCALES) {
  ok(`§4 dict · ${loc} · rule 3 — ${RULE_NAME[3]}`, dictFound[loc][3].length === 0, dictFound[loc][3].join(" | "));
}
{
  const cases: [string, boolean][] = [
    ["The Gaming Board of Tanzania requires identity verification for every account that wagers real money.", true],
    ["Tanzania Gaming Act requires identity verification before any withdrawal.", true],
    ["Bodi ya Michezo ya Kubahatisha Tanzania inataka uthibitisho wa utambulisho kwa kila akaunti.", true],
    ["坦桑尼亚博彩委员会要求每个账户完成身份验证。", true],
    // ⛔ Naming the Board is fine; so is an AML reason for identity.
    ["Licensed by the Gaming Board of Tanzania.", false],
    ["Under anti-money-laundering rules, we verify your identity before your first withdrawal.", false],
    ["依据反洗钱法规，我们会在您首次提现前验证您的身份。", false],
  ];
  for (const [t, shouldFlag] of cases) ok(`§4 control · rule 3 ${shouldFlag ? "REJECTS" : "accepts"} "${clip(t, 48)}"`, rule3(t) === shouldFlag);
}

// ═══ §5 · THE ALLOW-SET ═════════════════════════════════════════════════════════════════════════════════
console.log("\n§5 · the allow-set");
ok(`§5 the allow-set holds exactly ${ALLOW_SIZE} entr${ALLOW_SIZE === 1 ? "y" : "ies"}`, ALLOW.length === ALLOW_SIZE,
  ALLOW.length === ALLOW_SIZE ? "" : `${ALLOW.length} — an allowance is added with its reason and this number in the same edit, never alone`);
for (const a of ALLOW) {
  ok(`§5 allow · ${a.where} · rule ${a.rule} · still matches a live unit — ${a.why}`, used.has(a),
    used.has(a) ? "" : `"${a.excerpt}" matched nothing — the string changed or went; delete the allowance`);
}

console.log(`\nkyc-copy-truth: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
