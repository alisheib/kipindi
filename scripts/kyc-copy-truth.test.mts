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
 * one, and a denial rule cannot see it: it denies nothing. Four rules, each its own assertion:
 *
 *   rule 1 · §1 · money moves WITHOUT identity      deny ∧ money ∧ identity in one unit      (2026-09-05)
 *   rule 2 · §3 · identity bound to the ENTRANCE    identity ∧ entrance ∧ requirement        (2026-09-13)
 *   rule 3 · §4 · the gaming regulator as its REASON identity ∧ Gaming Board / Act / GBT     (2026-09-13)
 *   rule 4 · §6 · a NEW withdrawal held or reviewed withdrawal ∧ hold / review / 24h claim   (2026-09-14)
 *
 * ── ⛔ RULE 4, AND THE FOUR POPULATIONS IT ADDED (audit session 95, 2026-09-14) ────────────────────────
 *
 * The owner ended the withdrawal hold on 2026-09-13 (`WITHDRAWAL_AML_HOLD = false`, payments.ts): no withdrawal
 * waits for an officer, whatever its size (docs/COMPLIANCE-DECISIONS.md, the third 2026-09-13 entry). The copy
 * describing the hold did not end with it, and none of it lived only in the dictionary: the chat stub said
 * "held for compliance review, up to 24 hours", the help answer and the rules pages said it in their own words.
 * So rule 4 reads the dictionary and the legal pages like the others, AND every literal of email.ts outside the
 * templates comms-registry.ts marks `audience: "officer"`, every literal of notification-service.ts outside the
 * `notifyAdmin*` emitters (each proven to address officers), and every line of the live chat prompt
 * (_actions/chat.ts) and of the offline answers (lib/chat/send-message.ts). Rules 1–3 do not read those four.
 * ⛔ Its allow-list is by SURFACE, not by text — email withdrawalUnderReviewHtml, the notifyWithdraw AML_REVIEW
 * branch, dictionary common.withdrawalUnderReview and common.amlReviewBody — and each entry is PROVEN, every run
 * (P1–P4, §6), reachable only for a withdrawal already held (status AML_REVIEW) while the hold switch is off.
 * A failed proof excuses nothing. Each rule-4 locale is shown planted sentences it must reject and true ones it
 * must accept (§6), and `red:kyc-copy-truth` plants the claim in the dictionary once per locale.
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
type Rule = 1 | 2 | 3 | 4;
const RULES: readonly Rule[] = [1, 2, 3, 4];
const RULE_NAME: Record<Rule, string> = {
  1: "no unit claims money moves without identity",
  2: "no unit binds identity to the entrance",
  3: "no unit gives the gaming regulator as the reason for identity",
  4: "no unit claims a new withdrawal is held or reviewed before it pays",
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

/**
 * RULE 4 — a NEW withdrawal held, reviewed by officers / compliance / AML, or up to 24 hours before it pays.
 *
 * 🔴 WHY (audit session 95, 2026-09-14). The owner switched the withdrawal hold off on 2026-09-13
 * (`WITHDRAWAL_AML_HOLD = false`, payments.ts). The chat stub still said "held for compliance review, up to 24
 * hours", the help answer and both rules documents said it in their own words, and rules 1–3 are blind to all of
 * it: none of those sentences names identity.
 *
 * ⛔ THE UNIT IS A SENTENCE (en, sw) OR A CLAUSE (zh), AND IT NEEDS THREE THINGS:
 *   · a SUBJECT — a withdrawal word, or the retired threshold amount (TZS 1,000,000) in a scope that does not
 *     name a deposit or a bet: the email said "Amounts of TZS 1,000,000 or more are reviewed by our compliance
 *     team" without the word withdrawal, and the source-of-funds rule for DEPOSITS of that size is true;
 *   · a CLAIM — held for review, under / awaiting review or approval, reviewed or checked by compliance / AML /
 *     officers, "compliance review", or up to 24 hours / within a day;
 *   · and the claim is NOT excused. Two excuses, both measured, never a word list of true sentences:
 *       ① NEGATED — a denial between the last stopper ("but", ";", "lakini", "但是"…) and the claim, within
 *         80 characters (en, sw) or 10 characters (zh). "No officer reviews a withdrawal before it is sent" is
 *         the TRUE sentence and must pass; "There is no fee, but large withdrawals are held for review" must not;
 *       ② ABOUT IDENTITY — an identity word NEARER the claim than any subject. "our compliance team reviews it,
 *         usually within a day" in help.faq4a is the identity review, which is true and stays; "even once identity
 *         is verified, withdrawals of TZS 1,000,000 or more are held for two-officer review" (the retired /legal/aml
 *         §1) has its subject nearer, and is caught.
 * ⚠️ THE LIMITS THAT BUYS, stated: a claim in a sentence that names neither a withdrawal nor the threshold is not
 * seen ("Compliance review takes up to 24h." as a notification body under a withdrawal title); a denial inside the
 * window that negates something else excuses a real claim. Chinese is read by clause because 经过审核的业务合作伙伴
 * ("vetted partners") and 可提现的现金 sit in one sentence of the agent page and mean nothing together.
 */
type R4Spec = {
  scopes: (t: string) => string[];
  subject: RegExp; amount: RegExp; notWithdrawal: RegExp;
  claims: RegExp[]; deny: RegExp; stop: RegExp; identity: RegExp; window: number;
};
const R4_AMOUNT_DIGITS = String.raw`\b1[,.\s]?000[,.\s]?000\b(?![,.]?\d)`;
const R4: Record<Loc, R4Spec> = {
  en: {
    scopes: sentencesOf,
    subject: /\b(?:withdraw(?:s|n|al|als|ing)?|cash(?:ing)?[- ]?outs?)\b/gi,
    amount: new RegExp(`${R4_AMOUNT_DIGITS}|\\b(?:1|one)\\s+million\\b`, "gi"),
    notWithdrawal: /\b(?:deposit(?:s|ed|ing)?|add(?:s|ed|ing)?\s+money|top(?:s|ped|ping)?[- ]?ups?|stakes?|bets?)\b/i,
    claims: [
      /\b(?:held|on\s+hold|kept|paused|queued|parked)\b[^.;:!?]{0,40}?\b(?:review|compliance|AML|anti-money|officers?|approv|sign[- ]?off|check|24\s*(?:h|hrs?|hours?)\b)/gi,
      /\b(?:under|pending|awaiting|await|for|needs?|requires?|subject\s+to)\s+(?:(?:an?|the|our|manual|compliance|AML|two-officer|second-officer|a\s+second|officers?(?:'s|’s)?)\s+)*(?:review|approval|sign[- ]?off)\b/gi,
      /\b(?:review(?:s|ed|ing)?|check(?:s|ed|ing)?|approv(?:e|es|ed|ing)|vet(?:s|ted|ting)?|sign(?:s|ed)?[- ]off)\b[^.;:!?]{0,30}?\b(?:compliance|AML|anti-money|officers?)\b/gi,
      /\b(?:compliance|AML|anti-money[- ]laundering|officers?(?:'s|’s)?)\s+(?:team\s+)?(?:reviews?|checks?|approv\w*|sign[- ]?off|hold)\b/gi,
      /\b(?:up\s+to|within|takes?|taking|about|around|under|less\s+than)\s+(?:a\s+)?24\s*(?:h|hrs?|hours?)\b|\b24[- ]?(?:h|hours?)\s+(?:review|hold|delay|wait)\b|\b(?:up\s+to|within)\s+(?:a|one)\s+(?:working\s+|business\s+)?day\b/gi,
    ],
    deny: /\b(?:no|not|never|nothing|none|nobody|neither|nor|without|cannot)\b|n['’]t\b/i,
    stop: /[;:]|\b(?:but|however|although|though|yet|except|unless|whereas|instead)\b/gi,
    identity: /\b(?:identit(?:y|ies)|KYC|IDs?|NIDA|passports?|selfies?|documents?|licen[cs]es?|voter['’]s\s+cards?)\b/gi,
    window: 80,
  },
  sw: {
    scopes: sentencesOf,
    subject: /\b(?:kutoa|kutolewa|kuitoa|utoaji|unazotoa|ulizotoa|zilizotolewa|inatolewa|zinazotolewa)\b/gi,
    amount: new RegExp(`${R4_AMOUNT_DIGITS}|\\bmilioni\\s+(?:moja|1)\\b`, "gi"),
    notWithdrawal: /\b(?:kuweka|amana|kuongeza\s+pesa|dau)\b/i,
    claims: [
      /\b\w*(?:kaguliwa|kaguzwa)\b/gi,
      /\bukaguzi\b/gi,
      /\b\w*(?:shikiliwa|zuiliwa)\b[^.;:!?]{0,40}?(?:kagu|uzingatiaji|ufuatiliaji|afisa|maafisa|AML|idhini|saa\s+24)/gi,
      /\b(?:uzingatiaji|ufuatiliaji|afisa|maafisa|AML)\b[^.;:!?]{0,30}?\b\w*kagu\w*/gi,
      /\b(?:idhini|kuidhinishwa|iidhinishwe)\b[^.;:!?]{0,30}?\b(?:afisa|maafisa|uzingatiaji)\b/gi,
      /\b(?:hadi|ndani\s+ya|mpaka|takriban|kwa)\s+(?:saa|masaa)\s+(?:24|ishirini\s+na\s+nne)\b|\b(?:hadi|ndani\s+ya)\s+siku\s+(?:moja|1)\b/gi,
    ],
    // ⚠️ Negative verb prefixes are listed, not left to `ha…`: `hadi` ("up to") is the word the claim itself uses.
    deny: /\b(?:hakuna|hamna|hapana|sio|siyo|si|bila|kamwe|wala|ha(?:ku|ja|ta|tu|wa|m|i|zi|u)[a-z]{2,})\b/i,
    stop: /[;:]|\b(?:lakini|ila|isipokuwa|ingawa)\b/gi,
    identity: /\b(?:utambulisho|kitambulisho|vitambulisho|nyaraka|hati|KYC|NIDA|pasipoti|selfie|leseni|kadi\s+ya\s+mpiga\s+kura)\b/gi,
    window: 80,
  },
  zh: {
    // Full-width punctuation and dashes only — an ASCII comma is inside "TZS 1,000,000".
    scopes: (t) => t.split(/[，。；：！？\n]|——|—/).map((s) => s.trim()).filter(Boolean),
    subject: /提现|提款|取款|出款/g,
    amount: /100\s*万|一百万|\b1[,，]?000[,，]?000\b/g,
    notWithdrawal: /充值|存款|入金|投注|下注/,
    claims: [
      /审核|审查|复核|人工核查|扣留|暂扣|待审|须经[^，。；：！？]{0,10}(?:批准|审批|同意|签字)/g,
      /合规(?:团队|专员|部门|官员|人员)?(?:审|核|检|批)|反洗钱(?:审|核|检)/g,
      /最长(?:需要?|可能需要)?\s*24\s*(?:个)?小时|24\s*(?:个)?小时(?:之)?内|一(?:个工作)?天(?:之)?内/g,
    ],
    deny: /不|无|没|未|非|勿|别|免/,
    stop: /但是?|然而|不过|除非/g,
    identity: /身份|证件|实名|KYC|NIDA|护照|自拍|驾驶证|选民证/g,
    window: 10,
  },
};
type Span = { s: number; e: number };
const spansOf = (re: RegExp, t: string): Span[] => [...t.matchAll(re)].map((m) => ({ s: m.index ?? 0, e: (m.index ?? 0) + m[0].length }));
/** Distance from the nearest span to [s, e) — 0 when they touch or overlap; Infinity when there is none. */
const gapTo = (xs: readonly Span[], s: number, e: number) =>
  xs.reduce((best, x) => Math.min(best, x.e <= s ? s - x.e : x.s >= e ? x.s - e : 0), Infinity);
/** The offending scope with its claim marked, or null. */
function rule4(loc: Loc, text: string): string | null {
  const r = R4[loc];
  for (const scope of r.scopes(text)) {
    const subjects = spansOf(r.subject, scope);
    if (!r.notWithdrawal.test(scope)) subjects.push(...spansOf(r.amount, scope));
    if (subjects.length === 0) continue;
    const ids = spansOf(r.identity, scope);
    for (const re of r.claims) {
      for (const m of scope.matchAll(re)) {
        const s = m.index ?? 0, e = s + m[0].length;
        let from = Math.max(0, s - r.window);
        for (const st of scope.slice(0, s).matchAll(r.stop)) from = Math.max(from, (st.index ?? 0) + st[0].length);
        if (r.deny.test(scope.slice(from, s))) continue;                          // ① negated
        if (ids.length > 0 && gapTo(ids, s, e) < gapTo(subjects, s, e)) continue; // ② about identity
        return `${scope.slice(0, s)}⟦${m[0]}⟧${scope.slice(e)}`;
      }
    }
  }
  return null;
}

function hitsOf(loc: Loc, text: string, rules: readonly Rule[] = RULES): { rule: Rule; why: string }[] {
  const out: { rule: Rule; why: string }[] = [];
  if (rules.includes(1) && rule1(loc, text)) out.push({ rule: 1, why: text });
  const s = rules.includes(2) ? rule2(loc, text) : null;
  if (s) out.push({ rule: 2, why: s });
  if (rules.includes(3) && rule3(text)) out.push({ rule: 3, why: text });
  const s4 = rules.includes(4) ? rule4(loc, text) : null;
  if (s4) out.push({ rule: 4, why: s4 });
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
    // 2026-09-14 (session 97, E-400 ③): the unit's text moved with one punctuation fix — the ASCII-spaced " — " became
    // the Chinese "——" (Agent Terms v2026-09-14). Re-read in full: the same true sentence, so the allowance follows it.
    sha: "e3f6cdfbb12d58b9",
    excerpt: "余额不足时请先按常规方式充值——无需上传收据，也无需填写参考号。",
    why: "the denial is about a fee receipt; identity is the agent application's own requirement, in another sentence",
  },
];
const ALLOW_SIZE = 1;
const used = new Set<Allow>();
const shaOf = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);

type Unit = { key: string; text: string };
function scan(where: string, locs: readonly Loc[], units: readonly Unit[], rules: readonly Rule[] = RULES): Record<Rule, string[]> {
  const found: Record<Rule, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const u of units) {
    for (const loc of locs) {
      for (const h of hitsOf(loc, u.text, rules)) {
        const a = ALLOW.find((x) => x.where === where && x.rule === h.rule && x.sha === shaOf(u.text));
        if (a) { used.add(a); continue; }
        // Rule 4's allow-list is by SURFACE and holds only while its proofs hold — see below.
        const surface = h.rule === 4 ? surfaceFor(where, u.key) : null;
        if (surface) { R4_EXCUSED.set(surface.id, (R4_EXCUSED.get(surface.id) ?? 0) + 1); continue; }
        const line = `${u.key}: "${clip(h.why, 160)}" [sha ${shaOf(u.text)}]`;
        if (!found[h.rule].includes(line)) found[h.rule].push(line);
      }
    }
  }
  return found;
}

// ── RULE 4's SURFACE ALLOW-LIST — by surface, never by wording, and PROVEN on every run ─────────────────────
/**
 * ⛔ Four surfaces still describe the retired hold, and each is TRUE where it can render: for a withdrawal put in
 * AML_REVIEW before the owner switched the hold off (production held 0 at the time; the officer path that releases
 * such a row stays). A surface is excused only while its proofs hold, read from source on this run:
 *   P1 · payments.ts — `WITHDRAWAL_AML_HOLD = false`, and every `status: "AML_REVIEW"` it returns sits inside
 *        `if (WITHDRAWAL_AML_HOLD && …)`: no NEW withdrawal is put in review;
 *   P2 · wallet-service.ts — every `if (result.status === "AML_REVIEW")` reads a `result` from dispatchWithdrawal,
 *        and across src/ every call of `withdrawalUnderReviewHtml(` and of `notifyWithdraw(… "AML_REVIEW" …)` sits
 *        inside such a block;
 *   P3 · notification-service.ts — notifyWithdraw has exactly ONE `if (opts.status === "AML_REVIEW")` branch, and
 *        only literals inside that branch are the surface;
 *   P4 · the dictionary keys `common.withdrawalUnderReview` / `common.amlReviewBody` are read by ONE file,
 *        wallet-result-modal.tsx, and only behind `amlHeld = isWithdraw && status === "AML_REVIEW"`.
 * A failed proof leaves its surface's hits standing as violations AND prints its own FAIL in §6.
 */
const readSrc = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8"));
function walkSrc(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walkSrc(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}
/** Index of the bracket closing the `{` or `(` at `open`, string and template literals skipped; -1 when unbalanced. */
function closeOfBracket(src: string, open: number): number {
  const want = src[open] === "{" ? "}" : src[open] === "(" ? ")" : "";
  if (!want) return -1;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") { const j = endLiteral(src, i); if (j >= 0) { i = j; continue; } }
    if (c === src[open]) depth++;
    else if (c === want && --depth === 0) return i;
  }
  return -1;
}
/** The `{…}` body that opens after each match of `head`, as a span from the match to its closing brace. */
function blocksAfter(src: string, head: RegExp): Span[] {
  const out: Span[] = [];
  for (const m of src.matchAll(head)) {
    const at = m.index ?? 0;
    const open = src.indexOf("{", at + m[0].length);
    const close = open < 0 ? -1 : closeOfBracket(src, open);
    if (close > 0) out.push({ s: at, e: close });
  }
  return out;
}
const insideAny = (i: number, blocks: readonly Span[]) => blocks.some((b) => i > b.s && i < b.e);
type Proof = { ok: boolean; why: string };

function provePayments(pay: string): Proof {
  const off = /\bexport\s+const\s+WITHDRAWAL_AML_HOLD\s*=\s*false\s*;/.test(pay);
  const guards = blocksAfter(pay, /\bif\s*\(\s*WITHDRAWAL_AML_HOLD\s*&&/g);
  const returns = [...pay.matchAll(/\bstatus\s*:\s*["'`]AML_REVIEW["'`]\s*[,}]/g)].map((m) => m.index ?? 0);
  const loose = returns.filter((i) => !insideAny(i, guards));
  if (!off) return { ok: false, why: "WITHDRAWAL_AML_HOLD is not `false` — a new withdrawal can be held again" };
  if (returns.length === 0) return { ok: false, why: "no `status: \"AML_REVIEW\"` return found — the proof is not reading the dispatcher" };
  if (loose.length > 0) return { ok: false, why: `${loose.length} AML_REVIEW return(s) outside \`if (WITHDRAWAL_AML_HOLD && …)\`` };
  return { ok: true, why: `switch false · ${returns.length} AML_REVIEW return(s), all behind it` };
}

type SrcFile = { rel: string; d: string };
const isDefinition = (d: string, i: number) => /function\s+$/.test(d.slice(Math.max(0, i - 12), i));
function proveTriggers(files: readonly SrcFile[]): Proof {
  const ws = files.find((f) => f.rel === "src/lib/server/wallet-service.ts");
  if (!ws) return { ok: false, why: "wallet-service.ts was not read" };
  const held = blocksAfter(ws.d, /\bif\s*\(\s*result\.status\s*===\s*["'`]AML_REVIEW["'`]\s*\)/g);
  if (held.length === 0) return { ok: false, why: "no `if (result.status === \"AML_REVIEW\")` block in wallet-service.ts" };
  const unsourced = held.filter((b) => {
    const decl = ws.d.lastIndexOf("const result =", b.s);
    return decl < 0 || !/^const result =\s*await\s+dispatchWithdrawal\s*\(/.test(ws.d.slice(decl, decl + 80));
  });
  if (unsourced.length > 0) return { ok: false, why: `${unsourced.length} held block(s) whose result is not read from dispatchWithdrawal` };
  const stray: string[] = [];
  let emailCalls = 0, notifyCalls = 0;
  for (const f of files) {
    for (const m of f.d.matchAll(/\bwithdrawalUnderReviewHtml\s*\(/g)) {
      const i = m.index ?? 0;
      if (isDefinition(f.d, i)) continue;
      emailCalls++;
      if (f !== ws || !insideAny(i, held)) stray.push(`${f.rel}: withdrawalUnderReviewHtml( outside a held-withdrawal block`);
    }
    for (const m of f.d.matchAll(/\bnotifyWithdraw\s*\(/g)) {
      const i = m.index ?? 0;
      if (isDefinition(f.d, i)) continue;
      const open = i + m[0].length - 1;
      const close = closeOfBracket(f.d, open);
      const args = close < 0 ? f.d.slice(open) : f.d.slice(open, close);
      // A computed status (`status: t.status as "AML_REVIEW"`) may reach the held branch from anywhere — unprovable.
      if (!/\bstatus\s*:\s*(["'`])[A-Z_]+\1/.test(args)) {
        stray.push(`${f.rel}:${f.d.slice(0, i).split("\n").length}: notifyWithdraw( with a computed or missing status`);
        continue;
      }
      if (!/AML_REVIEW/.test(args)) continue;
      notifyCalls++;
      if (f !== ws || !insideAny(i, held)) stray.push(`${f.rel}: notifyWithdraw(… "AML_REVIEW" …) outside a held-withdrawal block`);
    }
  }
  if (emailCalls === 0 || notifyCalls === 0) return { ok: false, why: `found ${emailCalls} email and ${notifyCalls} notification call(s) — the proof is not reading the trigger` };
  if (stray.length > 0) return { ok: false, why: stray.join(" | ") };
  return { ok: true, why: `${held.length} held block(s) · ${emailCalls} email call(s) · ${notifyCalls} notification call(s), every one inside` };
}

function proveNotificationBranch(ns: string): Proof & { branch: Span | null } {
  const start = ns.search(/\bexport\s+function\s+notifyWithdraw\s*\(/);
  if (start < 0) return { ok: false, why: "notifyWithdraw not found", branch: null };
  const next = ns.slice(start + 10).search(/\n(?:export\s|async\s|function\s)/);
  const end = next < 0 ? ns.length : start + 10 + next;
  const branches = blocksAfter(ns.slice(start, end), /\bif\s*\(\s*opts\.status\s*===\s*["'`]AML_REVIEW["'`]\s*\)/g)
    .map((b) => ({ s: b.s + start, e: b.e + start }));
  if (branches.length !== 1) return { ok: false, why: `${branches.length} AML_REVIEW branch(es) in notifyWithdraw — expected exactly 1`, branch: null };
  return { ok: true, why: "one AML_REVIEW branch in notifyWithdraw", branch: branches[0] };
}

const MODAL = "src/app/wallet/wallet-result-modal.tsx";
function proveDictKeys(files: readonly SrcFile[]): Proof {
  const readers = files.filter((f) => f.rel !== "src/lib/i18n-dict.ts" && /\b(?:withdrawalUnderReview|amlReviewBody)\b/.test(f.d)).map((f) => f.rel);
  const modal = files.find((f) => f.rel === MODAL);
  if (!modal) return { ok: false, why: `${MODAL} was not read` };
  if (readers.length !== 1 || readers[0] !== MODAL) return { ok: false, why: `the keys are read by: ${readers.join(", ") || "nobody"}` };
  if (!/\bconst\s+amlHeld\s*=\s*isWithdraw\s*&&\s*status\s*===\s*["'`]AML_REVIEW["'`]/.test(modal.d)) {
    return { ok: false, why: "`amlHeld` is no longer `isWithdraw && status === \"AML_REVIEW\"`" };
  }
  for (const key of ["withdrawalUnderReview", "amlReviewBody"]) {
    const all = [...modal.d.matchAll(new RegExp(`\\b${key}\\b`, "g"))].length;
    const guarded = [...modal.d.matchAll(new RegExp(`\\bamlHeld\\s*\\?\\s*t\\.common\\.${key}\\b`, "g"))].length;
    if (all === 0 || all !== guarded) return { ok: false, why: `common.${key}: ${all} reference(s), ${guarded} behind \`amlHeld ?\`` };
  }
  return { ok: true, why: `read only by ${MODAL}, only behind amlHeld` };
}

/** Every src/ file that names a rule-4 surface — decommented once, shared by P2 and P4. */
const R4_FILES: readonly SrcFile[] = walkSrc(join(ROOT, "src"))
  .map((abs) => ({ rel: relative(ROOT, abs).split("\\").join("/"), raw: readFileSync(abs, "utf8") }))
  .filter((f) => /withdrawalUnderReview|notifyWithdraw|amlReviewBody/.test(f.raw))
  .map((f) => ({ rel: f.rel, d: decomment(f.raw) }));
const NOTIFY_SRC = readSrc("src/lib/server/notification-service.ts");
const P1 = provePayments(readSrc("src/lib/server/payments.ts"));
const P2 = proveTriggers(R4_FILES);
const P3 = proveNotificationBranch(NOTIFY_SRC);
const P4 = proveDictKeys(R4_FILES);

type R4Surface = { id: string; why: string; where: (w: string) => boolean; key: (k: string) => boolean; proven: boolean; proofs: string };
const R4_SURFACES: readonly R4Surface[] = [
  { id: "dictionary common.withdrawalUnderReview", why: "the wallet result modal's title for a withdrawal already in AML_REVIEW",
    where: (w) => w.startsWith("dict · "), key: (k) => k === "common.withdrawalUnderReview", proven: P1.ok && P2.ok && P4.ok, proofs: "P1 P2 P4" },
  { id: "dictionary common.amlReviewBody", why: "the same modal's body, same gate",
    where: (w) => w.startsWith("dict · "), key: (k) => k === "common.amlReviewBody", proven: P1.ok && P2.ok && P4.ok, proofs: "P1 P2 P4" },
  { id: "email withdrawalUnderReviewHtml", why: "the email sent only from the held-withdrawal block",
    where: (w) => w === "email.ts", key: (k) => k.startsWith("withdrawalUnderReviewHtml@"), proven: P1.ok && P2.ok, proofs: "P1 P2" },
  { id: "notifyWithdraw AML_REVIEW branch", why: "the bell entry sent only from the held-withdrawal block",
    where: (w) => w === "notification-service.ts", key: (k) => k.startsWith("notifyWithdraw#AML_REVIEW@"), proven: P1.ok && P2.ok && P3.ok, proofs: "P1 P2 P3" },
];
const R4_SURFACE_SIZE = 4;
const R4_EXCUSED = new Map<string, number>();
function surfaceFor(where: string, key: string, list: readonly R4Surface[] = R4_SURFACES): R4Surface | null {
  return list.find((s) => s.proven && s.where(where) && s.key(key)) ?? null;
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

// ═══ §6 · RULE 4 — a NEW withdrawal held, reviewed, or 24 hours before it pays ═════════════════════════
//
// ⭐ 2026-09-14 (audit session 95). The dictionary was read in §1 and is asserted here; the legal pages are asserted
// in §2 under rule 4, file × locale; and four populations rules 1–3 never read are built and asserted below.
console.log("\n§6 · rule 4 — a new withdrawal held or reviewed before it pays");

/** Line number of an offset, by binary search over line starts. */
function lineIndex(src: string): (i: number) => number {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  return (i) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= i) lo = mid; else hi = mid - 1; } return lo + 1; };
}
type Decl = { name: string | null; start: number; end: number };
/** Top-level declarations of decommented source — each starts at column 0 in this codebase. */
function declsIn(d: string): Decl[] {
  const starts = [0];
  for (const m of d.matchAll(/\n(?=[A-Za-z_$@])/g)) starts.push((m.index ?? 0) + 1);
  return starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : d.length;
    const head = d.slice(s, Math.min(end, s + 300));
    const m = head.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)/) ?? head.match(/^(?:export\s+)?(?:const|let|var)\s+([\w$]+)/);
    return { name: m ? m[1] : null, start: s, end };
  });
}
const declAt = (decls: readonly Decl[], i: number) => decls.find((x) => i >= x.start && i < x.end)?.name ?? null;
/**
 * Every string and template literal in decommented source, with its offset. A template's static text is ONE literal
 * (each `${…}` read as a space) and the literals INSIDE its interpolations are read on their own — an email template
 * is one template literal whose copy sits in `${subtitle("…")}`, which a flat literal regex deletes with the `${}`.
 */
function literalsIn(src: string, base = 0, out: { text: string; at: number }[] = []): { text: string; at: number }[] {
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c !== '"' && c !== "'" && c !== "`") continue;
    const j = endLiteral(src, i);
    if (j < 0) continue;
    if (c !== "`") { out.push({ text: unquote(src.slice(i, j + 1)), at: base + i }); i = j; continue; }
    let stat = "";
    for (let k = i + 1; k < j; k++) {
      if (src[k] === "\\") { stat += src.slice(k, k + 2); k++; continue; }
      if (src[k] === "$" && src[k + 1] === "{") {
        const close = closeOfBracket(src, k + 1);
        if (close < 0 || close >= j) { stat += src.slice(k, j); break; }
        literalsIn(src.slice(k + 2, close), base + k + 2, out);
        stat += " ";
        k = close;
        continue;
      }
      stat += src[k];
    }
    out.push({ text: unquote(`\`${stat}\``), at: base + i });
    i = j;
  }
  return out;
}
const proseOf = (t: string) => decodeEntities(t.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/** E-400 ⑥ · title+body units for rule 4 — see the note where `notifyJoined` is built. Exported shape: Unit[]. */
function joinTitleBody(
  src: string,
  decls: readonly Decl[],
  skip: RegExp,
  lineOf: (at: number) => number,
  amlBranch: Span | null | undefined,
): Unit[] {
  const lits = literalsIn(src);
  const prop = (at: number) => /(title|body)(En|Sw|Zh)\s*:\s*$/.exec(src.slice(Math.max(0, at - 24), at));
  const units: Unit[] = [];
  for (let i = 0; i < lits.length; i++) {
    const t = prop(lits[i].at);
    if (!t || t[1] !== "title") continue;
    const fn = declAt(decls, lits[i].at);
    if (fn && skip.test(fn)) continue;
    const bodyLit = lits.slice(i + 1).find((l) => l.at > lits[i].at && l.at - lits[i].at < 900 && prop(l.at)?.[1] === "body" && prop(l.at)?.[2] === t[2]);
    if (!bodyLit || declAt(decls, bodyLit.at) !== fn) continue;
    const title = proseOf(lits[i].text);
    const body = proseOf(bodyLit.text);
    if (!hasLetters(title) || !hasLetters(body)) continue;
    const zh = t[2] === "Zh";
    const parts = zh ? body.split(/(?<=[，。；：！？])/).map((x) => x.trim()).filter(Boolean) : sentencesOf(body);
    const branch = fn === "notifyWithdraw" && amlBranch && insideAny(lits[i].at, [amlBranch]) ? "#AML_REVIEW" : "";
    parts.forEach((part, k) => {
      units.push({ key: `${fn ?? "top"}${branch}@${lineOf(lits[i].at)}~title+body${k}`, text: zh ? `${title}${part}` : `${title} ${part}` });
    });
  }
  return units;
}
const hasLetters = (t: string) => /\p{L}/u.test(t);

// ── §6.0 · the proofs behind the surface allow-list, and the same proofs failing on planted source ──────────────
ok("§6 proof P1 · payments.ts · no NEW withdrawal is put in AML_REVIEW", P1.ok, P1.why);
ok("§6 proof P2 · the held-withdrawal email and bell entry are sent only from wallet-service's held block", P2.ok, P2.why);
ok("§6 proof P3 · notifyWithdraw has exactly one AML_REVIEW branch", P3.ok, P3.why);
ok("§6 proof P4 · common.withdrawalUnderReview / common.amlReviewBody render only for a withdrawal in AML_REVIEW", P4.ok, P4.why);
ok("§6 proof · the src/ files naming a surface were read", R4_FILES.length >= 5, `${R4_FILES.length}: ${R4_FILES.map((f) => f.rel).join(", ")}`);
{
  const pay = readSrc("src/lib/server/payments.ts");
  ok("§6 proof control · P1 FAILS with the hold switched back on", P1.ok && !provePayments(pay.replace(/(WITHDRAWAL_AML_HOLD\s*=\s*)false/, "$1true")).ok);
  ok("§6 proof control · P1 FAILS with an AML_REVIEW return outside the switch",
    P1.ok && !provePayments(`${pay}\nexport function plantedHold() {\n  return { ok: true, status: "AML_REVIEW", correlationId: "x" };\n}\n`).ok);
  const strayNotify: SrcFile = { rel: "src/lib/server/planted.ts", d: `export async function planted(userId: string) {\n  notifyWithdraw(userId, { status: "AML_REVIEW", amount: 1, provider: "M-Pesa" });\n}\n` };
  ok("§6 proof control · P2 FAILS when another file sends the held-withdrawal bell entry", P2.ok && !proveTriggers([...R4_FILES, strayNotify]).ok);
  const computedNotify: SrcFile = { rel: "src/lib/server/planted.ts", d: `export async function planted(u: string, s: "AML_REVIEW" | "FAILED") {\n  notifyWithdraw(u, { status: s, amount: 1, provider: "x" });\n}\n` };
  ok("§6 proof control · P2 FAILS when a notifyWithdraw call passes a computed status", P2.ok && !proveTriggers([...R4_FILES, computedNotify]).ok);
  const strayMail = R4_FILES.map((f) => (f.rel === "src/lib/server/wallet-service.ts"
    ? { rel: f.rel, d: `${f.d}\nexport function plantedMail(amount: number) {\n  return withdrawalUnderReviewHtml({ amount, reference: "x" });\n}\n` } : f));
  ok("§6 proof control · P2 FAILS when the held-withdrawal email is sent outside the held block", P2.ok && !proveTriggers(strayMail).ok);
  ok("§6 proof control · P3 FAILS when notifyWithdraw grows a second AML_REVIEW branch",
    P3.ok && !proveNotificationBranch(NOTIFY_SRC.replace(/if\s*\(\s*opts\.status\s*===\s*"AML_REVIEW"\s*\)\s*\{/, (m) => `if (opts.status === "AML_REVIEW") { return null; }\n  ${m}`)).ok);
  const otherStatus = R4_FILES.map((f) => (f.rel === MODAL ? { rel: f.rel, d: f.d.replace(/status\s*===\s*"AML_REVIEW"/, 'status === "PROCESSING"') } : f));
  ok("§6 proof control · P4 FAILS when the modal shows the held copy for another status", P4.ok && !proveDictKeys(otherStatus).ok);
  ok("§6 proof control · P4 FAILS when a second file reads the held copy",
    P4.ok && !proveDictKeys([...R4_FILES, { rel: "src/app/wallet/page.tsx", d: "const x = t.common.amlReviewBody;" }]).ok);
  ok(`§6 the surface allow-list holds exactly ${R4_SURFACE_SIZE} surfaces`, R4_SURFACES.length === R4_SURFACE_SIZE,
    `${R4_SURFACES.length} — a surface is added with its proof and this number in the same edit, never alone`);
  ok("§6 control · an UNPROVEN surface excuses nothing",
    surfaceFor("dict · en", "common.withdrawalUnderReview", R4_SURFACES.map((s) => ({ ...s, proven: false }))) === null);
  ok("§6 control · a surface excuses by exact key, never by wording",
    surfaceFor("dict · en", "common.pendingHoldHint") === null && surfaceFor("dict · en", "common.withdrawalUnderReviewX") === null
    && surfaceFor("email.ts", "withdrawalSentHtml@980") === null && surfaceFor("notification-service.ts", "notifyWithdraw@810") === null);
}

// ── §6.1 · the dictionary (read in §1) ─────────────────────────────────────────────────────────────────────────
for (const loc of LOCALES) {
  ok(`§6 dict · ${loc} · rule 4 — ${RULE_NAME[4]}`, dictFound[loc][4].length === 0, dictFound[loc][4].join(" | "));
}
console.log("     the legal pages are read under rule 4 in §2, file by file and locale by locale");

// ── §6.2 · the four populations rules 1–3 do not read ──────────────────────────────────────────────────────────
{
  // email.ts — every literal outside the templates the registry marks as officer mail.
  const registry = readSrc("src/lib/server/comms-registry.ts");
  const audienceOf = new Map([...registry.matchAll(/template:\s*"(\w+)"[^}\n]*?audience:\s*"(player|officer)"/g)].map((m) => [m[1], m[2]] as const));
  const officerTemplates = [...audienceOf].filter(([, a]) => a === "officer").map(([t]) => t);
  const emailSrc = readSrc("src/lib/server/email.ts");
  const emailDecls = declsIn(emailSrc);
  const emailLine = lineIndex(emailSrc);
  ok("§6 email.ts · the officer templates excepted are named by the registry, and each is a real template",
    officerTemplates.length >= 5 && officerTemplates.every((t) => emailDecls.some((x) => x.name === t)), officerTemplates.join(", "));
  ok("§6 email.ts · withdrawalUnderReviewHtml is registered as PLAYER mail — read, and excused only by proof",
    audienceOf.get("withdrawalUnderReviewHtml") === "player");
  const emailUnits: Unit[] = [];
  for (const l of literalsIn(emailSrc)) {
    const fn = declAt(emailDecls, l.at);
    if (fn && officerTemplates.includes(fn)) continue;
    const text = proseOf(l.text);
    if (hasLetters(text)) emailUnits.push({ key: `${fn ?? "top"}@${emailLine(l.at)}`, text });
  }

  // notification-service.ts — every literal outside the notifyAdmin* emitters, each proven to address officers.
  const OFFICER_EMITTER = /^notifyAdmins?[A-Z]\w*$/;
  const notifyDecls = declsIn(NOTIFY_SRC);
  const notifyLine = lineIndex(NOTIFY_SRC);
  const officerEmitters = notifyDecls.filter((x) => x.name && OFFICER_EMITTER.test(x.name));
  const notProven = officerEmitters.filter((x) => !/\badminUserId\b|\blistByRoles\s*\(/.test(NOTIFY_SRC.slice(x.start, x.end))).map((x) => x.name);
  ok("§6 notification-service.ts · every officer emitter excepted provably addresses officers (adminUserId or listByRoles)",
    officerEmitters.length >= 5 && notProven.length === 0, `${officerEmitters.length} excepted${notProven.length ? ` · NOT proven: ${notProven.join(", ")}` : ""}`);
  const notifyUnits: Unit[] = [];
  for (const l of literalsIn(NOTIFY_SRC)) {
    const fn = declAt(notifyDecls, l.at);
    if (fn && OFFICER_EMITTER.test(fn)) continue;
    const text = proseOf(l.text);
    if (!hasLetters(text)) continue;
    const branch = fn === "notifyWithdraw" && P3.branch && insideAny(l.at, [P3.branch]) ? "#AML_REVIEW" : "";
    notifyUnits.push({ key: `${fn ?? "top"}${branch}@${notifyLine(l.at)}`, text });
  }
  // ⭐ E-400 ⑥ (2026-09-14) · A BELL ENTRY IS READ AS ONE THING — title, then body. Rule 4 reads a SENTENCE, so a title
  // naming the withdrawal ("Withdrawal update") over a body making the claim ("Compliance review takes up to 24h.") was
  // two innocent units. `notifyJoined` pairs each `title<L>:` literal with the next `body<L>:` literal of the same
  // locale in the same object, and puts the title in front of EVERY body sentence (zh: every clause, no separator).
  // ⚠️ Limit, stated: a title or body computed into a variable before the object literal is not paired.
  const notifyJoined = joinTitleBody(NOTIFY_SRC, notifyDecls, OFFICER_EMITTER, notifyLine, P3.branch);
  notifyUnits.push(...notifyJoined);

  // The chat assistant — one unit per LINE: the live prompt is one template literal of bullet lines.
  const linesOf = (rel: string): Unit[] => {
    const d = readSrc(rel);
    const line = lineIndex(d);
    const name = rel.split("/").pop();
    const units: Unit[] = [];
    for (const l of literalsIn(d)) {
      l.text.split("\n").forEach((part, k) => {
        const text = part.replace(/\s+/g, " ").trim();
        if (hasLetters(text)) units.push({ key: `${name}@${line(l.at) + k}`, text });
      });
    }
    return units;
  };

  // ⛔ FLOORS measured 2026-09-14 from source lines (410 title/body props · 450 email helper literals · a 42-line prompt ·
  // 41 answer lines), set below them so a copy edit does not trip them and far above zero so a blind reader cannot pass.
  const populations: { where: string; units: Unit[]; floor: number; must: string; has: (u: Unit) => boolean }[] = [
    { where: "email.ts", units: emailUnits, floor: 300, must: "the held-withdrawal template is in the population", has: (u) => u.key.startsWith("withdrawalUnderReviewHtml@") },
    { where: "notification-service.ts", units: notifyUnits, floor: 300, must: "notifyWithdraw's AML_REVIEW branch is in the population", has: (u) => u.key.startsWith("notifyWithdraw#AML_REVIEW@") },
    { where: "_actions/chat.ts", units: linesOf("src/app/_actions/chat.ts"), floor: 35, must: "the live prompt's withdrawal line is in the population", has: (u) => u.text.includes("No officer reviews a withdrawal before it is sent") },
    { where: "chat/send-message.ts", units: linesOf("src/lib/chat/send-message.ts"), floor: 25, must: "the offline answer's withdrawal line is in the population", has: (u) => u.text.includes("no withdrawal waits for an officer's review") },
  ];
  for (const p of populations) {
    console.log(`     ${p.where} · ${p.units.length} unit(s)`);
    ok(`§6 ${p.where} · the population is read`, p.units.length >= p.floor, `${p.units.length} units (floor ${p.floor})`);
    ok(`§6 ${p.where} · ${p.must}`, p.units.some(p.has));
    const found = scan(p.where, LOCALES, p.units, [4]);
    ok(`§6 ${p.where} · rule 4 — ${RULE_NAME[4]}`, found[4].length === 0, found[4].join(" | "));
  }
}

// ── §6.2b · CONTROL for the title+body pairing (E-400 ⑥) — the claim split across the two must be caught ─────────
{
  const planted = `export function notifyPlanted(userId: string) {\n  return create({ userId, titleEn: "Withdrawal update", bodyEn: "Compliance review takes up to 24 hours. Tap to view." });\n}\n`;
  const decls = declsIn(planted);
  const joined = joinTitleBody(planted, decls, /^notifyAdmins?[A-Z]\w*$/, lineIndex(planted), null);
  const alone = literalsIn(planted).map((l) => proseOf(l.text)).filter(hasLetters);
  ok("§6 control · a notification body alone does not trip rule 4 (so the pairing is what catches it)",
    alone.every((t) => rule4("en", t) === null), alone.join(" | "));
  ok("§6 control · the title+body pairing reports the claim split across them",
    joined.some((u) => rule4("en", u.text) !== null), joined.map((u) => u.text).join(" | "));
  ok("§6 control · the pairing finds the live notifyWithdraw entries (it is not reading nothing)",
    joinTitleBody(NOTIFY_SRC, declsIn(NOTIFY_SRC), /^notifyAdmins?[A-Z]\w*$/, lineIndex(NOTIFY_SRC), P3.branch).some((u) => u.key.startsWith("notifyWithdraw")));
}

// ── §6.3 · every surface is proven AND still matches live copy — an allowance outliving its copy is a hole ───────
for (const s of R4_SURFACES) {
  const n = R4_EXCUSED.get(s.id) ?? 0;
  ok(`§6 surface · ${s.id} · proven (${s.proofs}) and still excusing live copy — ${s.why}`, s.proven && n > 0,
    !s.proven ? "a proof failed, so its copy is reported above as a violation" : n > 0 ? `${n} excused hit(s)` : "matched nothing — the copy changed or went; delete the surface");
}

// ── §6.4 · CONTROLS — each locale rejects the planted claim and accepts the true sentences, in the same run ──────
{
  const rejected: [Loc, string][] = [
    ["en", "Withdrawals of TZS 1,000,000 or more are held for review by two compliance officers."],
    // ⭐ identity NEARBY does not excuse it: the retired /legal/aml §1, verbatim.
    ["en", "Even once identity is verified, withdrawals of TZS 1,000,000 or more are held for two-officer review."],
    // ⭐ no withdrawal word — the threshold is the subject (the email's own sentence).
    ["en", "Amounts of TZS 1,000,000 or more are reviewed by our compliance team."],
    // ⭐ a denial before the stopper does not reach the claim.
    ["en", "There is no fee, but a large withdrawal can take up to 24 hours."],
    ["sw", "Kiasi cha TZS 1,000,000 au zaidi kinakaguliwa na timu yetu ya uzingatiaji hadi saa 24."],
    ["sw", "Kutoa pesa kwa kiasi kikubwa kunashikiliwa kwa ukaguzi wa maafisa wawili."],
    ["zh", "100 万先令及以上的提现须经两名合规专员审核，最长需要 24 小时。"],
    ["zh", "大额提现会被暂扣，由合规团队人工审核。"],
  ];
  for (const [loc, t] of rejected) ok(`§6 control.${loc} · rule 4 REJECTS "${clip(t, 48)}"`, rule4(loc, t) !== null);

  const accepted: [Loc, string][] = [
    // The live chat prompt's line, verbatim — the claim appears only under "No" and "never".
    ["en", "No officer reviews a withdrawal before it is sent, whatever its size — never tell a player that a large withdrawal is held, reviewed by compliance officers, or slower than a small one."],
    ["en", "You verify your identity once, before your first withdrawal. After that, no withdrawal waits for an officer's review, whatever its size."],
    // help.faq4a, verbatim — the compliance review and "within a day" are the IDENTITY review.
    ["en", "We verify your identity once, before your first withdrawal, with any one of four documents — National ID (NIDA), passport, driving licence or voter’s card — and our compliance team reviews it, usually within a day; one document can only be used on one account."],
    // The threshold in a DEPOSIT sentence is the source-of-funds rule, which is true.
    ["en", "Deposits of TZS 1,000,000 or more need a source-of-funds declaration first."],
    ["en", "Winnings are paid after the 24-hour objection window closes, and you can withdraw them at once."],
    ["sw", "Thibitisha utambulisho wako — ukaguzi ule ule unaofanywa kabla ya kutoa pesa kwa mara ya kwanza."],
    ["sw", "Hakuna afisa anayekagua utoaji kabla haujatumwa, hata kiwe kikubwa kiasi gani."],
    ["zh", "验证您的身份——与首次提现前的身份审核相同。"],
    ["zh", "无论金额大小，提现在发出前都不会经过人工审核。"],
    // The agent page, verbatim — 审核 and 提现 in one sentence, in different clauses.
    ["zh", "50pick 认证代理是经过审核的业务合作伙伴，负责推荐新玩家，并从 50pick 在其投注中保留的净手续费中获得佣金——以可提现的现金支付，只要他们持续投注。"],
  ];
  for (const [loc, t] of accepted) {
    const hit = rule4(loc, t);
    ok(`§6 control.${loc} · rule 4 accepts "${clip(t, 48)}"`, hit === null, hit ?? "");
  }
  // Through the whole pipeline: a planted dictionary unit under a key that is no surface is REPORTED, not excused.
  const plantedHint = "尚未到账的提现 — 100 万先令及以上的提现须经合规团队审核，最长需要 24 小时";
  // The hint's REAL key — `common.pendingHoldHint`, a sibling of both surface keys in the same namespace.
  const planted = scan("dict · zh", ["zh"], [{ key: "common.pendingHoldHint", text: plantedHint }], [4]);
  ok("§6 control · the planted zh hint is reported through scan — 尚未 opens the unit and does not excuse the claim", planted[4].length === 1, planted[4].join(" | "));
}

console.log(`\nkyc-copy-truth: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
