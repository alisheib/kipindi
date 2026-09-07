/**
 * NO PLAYER-FACING STRING MAY CONTRADICT THE IDENTITY GATE.
 *
 * 🔴 WHY THIS FILE EXISTS, AND IT IS NOT HYPOTHETICAL. When the gate shipped I swept the
 * source for the old ladder — "browse free → verify email to deposit → KYC to withdraw" —
 * and fixed every occurrence. Six MORE false statements survived that sweep, in the
 * dictionary, saying the same thing in different words:
 *
 *   · `profile.verifyBody`        "It is not required in order to withdraw."
 *   · `auth.welcomeNewBody`       "You can play straight away, and verifying your ID is
 *                                  not required in order to withdraw."
 *   · `wallet.verifyGateFootnote` "Browsing and betting stay open… identity verification
 *                                  is not required to withdraw."
 *   · `help.faq4a`                "Identity verification is not required before a
 *                                  withdrawal."
 *
 * ⛔ `verifyBody` renders on /profile/kyc TWO LINES BELOW the gate panel, so that screen
 * said "Verify your identity to add money, play and cash out" and "it is not required in
 * order to withdraw" AT THE SAME TIME. `welcomeNewBody` is the first sentence a new player
 * ever reads. `faq4a` is the public help page.
 *
 * ⭐ AND NOT ONE OF THEM CONTAINED THE PHRASE I HAD GREPPED FOR. A sweep for a form of
 * words finds the sentences written in those words; the product is written in every other
 * form of words too. So this guard tests the CLAIM, not the phrasing: no string may assert
 * that money moves without verification.
 *
 * ⚠️ It runs over ALL THREE LOCALES. The English half of this defect would have been caught
 * in review by anyone reading the screen; the Swahili and Chinese halves are precisely the
 * ones that survive review, and they are the two thirds of our players.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { dict } from "../src/lib/i18n-dict.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

type Node = { [k: string]: string | Node };
const flat = (o: Node, p = ""): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[p + k, v] as [string, string]] : flat(v, `${p}${k}.`)));

/**
 * The claim, per language: "<money verb> … does not need identity".
 *
 * ⛔ TWO HALVES, BOTH REQUIRED. Matching only the negation flags every "no fee" and
 * "nothing has been charged"; matching only the money verb flags most of the dictionary.
 * A violation is a NEGATION and a MONEY VERB and an IDENTITY WORD in one string.
 */
const RULES: Record<string, { deny: RegExp; money: RegExp; identity: RegExp }> = {
  en: {
    // ⭐ 2026-09-07: `not a precondition` — /legal/aml §1 said it in those words and the old
    //   alternation could not see it (AGENT-STRESS-TEST-FINDINGS, the legal finding).
    deny: /\b(not required|no need|without|doesn'?t need|don'?t need|not needed|isn'?t required|not a precondition|no precondition)\b/i,
    money: /\b(withdraw|withdrawal|cash ?out|deposit|add money|bet|play|stake)/i,
    identity: /\b(identity|verif|KYC|ID\b|NIDA)/i,
  },
  sw: {
    deny: /\b(hauhitajiki|hakihitajiki|hazihitajiki|bila)\b/i,
    // ⭐ 2026-09-07: `kutoa fedha` — /legal/terms §3 (sw) said "hauhitajiki ili kutoa fedha" and
    //   the money alternation only knew `pesa`. Same defect, other synonym.
    money: /\b(kutoa pesa|kuweka pesa|kutoa fedha|kuweka fedha|kucheza|kuweka dau|dau)/i,
    identity: /\b(utambulisho|kitambulisho|uthibitisho|thibitisha)/i,
  },
  zh: {
    deny: /(无需|不需要|不必)/,
    money: /(提现|充值|投注|下注|游戏)/,
    identity: /(身份|验证|认证)/,
  },
};

for (const loc of ["en", "sw", "zh"] as const) {
  const r = RULES[loc];
  const offenders = flat(dict[loc] as unknown as Node)
    .filter(([, v]) => r.deny.test(v) && r.money.test(v) && r.identity.test(v));
  ok(`${loc} · no string claims money moves without identity`,
    offenders.length === 0,
    offenders.map(([k, v]) => `${k}: "${v.slice(0, 70)}…"`).join(" | "));
}

// ⭐ POSITIVE CONTROLS — a scanner that has gone blind reports "0 violations" in exactly the
// same words as a clean dictionary. Each language is shown the sentence it must reject, and
// one it must NOT, in the same run.
{
  const cases: [string, string, boolean][] = [
    ["en", "Identity verification is not required before a withdrawal.", true],
    ["en", "A withdrawal is charged a 1.5% fee and nothing else.", false],
    ["sw", "Uthibitisho wa utambulisho hauhitajiki kabla ya kutoa pesa.", true],
    ["sw", "Kutoa pesa kunatozwa ada ya 1.5% pekee.", false],
    ["zh", "提现无需身份验证。", true],
    ["zh", "提现收取 1.5% 手续费。", false],
  ];
  for (const [loc, s, shouldFlag] of cases) {
    const r = RULES[loc];
    const flagged = r.deny.test(s) && r.money.test(s) && r.identity.test(s);
    ok(`control.${loc} · the scanner ${shouldFlag ? "REJECTS" : "accepts"} "${s.slice(0, 34)}…"`,
      flagged === shouldFlag);
  }
}

// ═══ §2 · THE LEGAL PAGES — the population the dictionary sweep could never reach ═══
//
// 🔴 /legal/terms §3 stated "Identity verification is not required in order to withdraw" in the
// BINDING English text (and in sw + zh) for two days after the 2026-09-05 KYC-first ruling, and
// /legal/aml §1 said "is not a precondition of withdrawal". Neither is a dictionary string: the
// legal pages are inline `Record<Locale, ReactNode>` by convention, so §1 above walked past them
// green. The population is now the pages themselves, split by locale block and read paragraph by
// paragraph. ⛔ A paragraph is the unit, not a sentence — a denial and its money verb can sit in
// two sentences of one claim.
{
  const LEGAL_DIR = join(process.cwd(), "src/app/legal");
  const pages: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === "page.tsx") pages.push(p); } };
  walk(LEGAL_DIR);
  ok("§2 the legal population is non-empty", pages.length >= 5, `${pages.length} pages`);
  const decode = (t: string) => t.replace(/<[^>]+>/g, " ").replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim();
  let paragraphs = 0;
  for (const p of pages) {
    const src = readFileSync(p, "utf8");
    for (const loc of ["en", "sw", "zh"] as const) {
      const m = src.match(new RegExp(`\\n  ${loc}: \\(([\\s\\S]*?)\\n  \\),`));
      if (!m) continue;
      const r = RULES[loc];
      const paras = [...m[1].matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((x) => decode(x[2])).filter(Boolean);
      paragraphs += paras.length;
      const offenders = paras.filter((t) => r.deny.test(t) && r.money.test(t) && r.identity.test(t));
      ok(`§2 ${p.replace(process.cwd(), "").replace(/\\/g, "/")} · ${loc} · no paragraph claims money moves without identity`, offenders.length === 0, offenders.map((t) => `"${t.slice(0, 90)}…"`).join(" | "));
    }
  }
  ok("§2 the paragraph reader actually read something", paragraphs >= 60, `${paragraphs} paragraphs`);

  // ⭐ POSITIVE CONTROLS — the sentences that were LIVE on 2026-09-07, verbatim, not paraphrased.
  // Each must be REJECTED by the rule that now guards its page; each was invisible to §1.
  const live: [string, string][] = [
    ["en", "Identity verification is not required in order to withdraw. You may verify at any time with any one of four documents"],
    ["en", "Identity verification is offered to every player and is not a precondition of withdrawal."],
    ["sw", "Uthibitisho wa utambulisho hauhitajiki ili kutoa fedha. Unaweza kuthibitisha wakati wowote"],
    ["sw", "Uthibitisho wa utambulisho unapatikana kwa kila mchezaji na hauhitajiki kabla ya kutoa fedha."],
    ["zh", "提现无需完成身份验证。您可随时使用四种证件之一进行验证"],
    ["zh", "我们为每位玩家提供身份验证，但提现无需先完成验证。"],
  ];
  for (const [loc, t] of live) {
    const r = RULES[loc];
    ok(`§2 control.${loc} · the LIVE 2026-09-07 sentence is rejected: "${t.slice(0, 40)}…"`, r.deny.test(t) && r.money.test(t) && r.identity.test(t));
  }
  // …and the corrected sentences pass, so the fix is not a rewording the scanner merely cannot see.
  const corrected: [string, string][] = [
    ["en", "Identity verification is required before you can deposit, place a bet or withdraw."],
    ["sw", "Uthibitisho wa utambulisho unahitajika kabla ya kuweka fedha, kuweka dau au kutoa fedha."],
    ["zh", "在充值、投注或提现之前，必须先完成身份验证。"],
  ];
  for (const [loc, t] of corrected) {
    const r = RULES[loc];
    ok(`§2 control.${loc} · the corrected sentence is accepted`, !(r.deny.test(t) && r.money.test(t) && r.identity.test(t)));
  }
}

console.log(`\nkyc-copy-truth: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
