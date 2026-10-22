/**
 * §4 OF THE BINDING TERMS STATES ALL THREE CANCELLATION CONDITIONS — RENDERED, in all three
 * languages.
 *
 *   npx tsx scripts/terms-cancellation.test.mts    (npm run test:terms-cancellation)
 *
 * 🔴 THE DEFECT THIS EXISTS FOR. `/legal/terms` §4 promised free cancellation with ONLY the
 * 5-minute window, in EN, SW and ZH alike. RULES §2.6 makes the right conditional on THREE
 * things — the window AND the runway AND not-bonus-funded — and the runway condition is what
 * makes cash-out unreachable by construction on Up & Down 3- and 5-minute rounds (0 of 688
 * rounds have ever cashed out). The English text is the legally binding one, and it promised a
 * right the product cannot deliver. §6.12 rewrote all three languages on 2026-09-09.
 *
 * ⛔ AND NOTHING COULD HAVE CAUGHT IT. `test:rate-copy` scans the i18n dictionaries; this text
 * is JSX prose inside a page component, outside its reach. `MONEY-GATE-REMEDIATION.md` §6.3
 * recorded "⚠️ no guard" against the fix, and `RULES.md` said so too. This closes that.
 *
 *   §1 all three conditions, in all three languages, RENDERED not grepped
 *   §2 ⚠️ POSITIVE CONTROL — the checker REJECTS the real pre-fix text, verbatim
 *   §3 ⛔ OVER-CORRECTION — a text with two of the three conditions is still rejected
 *   §4 MASWALI MILLIONEA's binding rules (MASWALI-BUILD S6, MB-70): all fifteen answered, the reserve order, the week
 *      void, the void deadlines, the absolute close, the cap and no cancellation in the last minutes before the close —
 *      rendered at NON-DEFAULT figures in all three languages, so a typed figure cannot pass; the management PDF's rule 3
 *      ("reserves are not answered") is refused; and the same over-correction and one-language controls as §2–§3
 *
 * ⚠️ THIS GUARD PINS PHRASES, AND THAT IS DELIBERATE. A guard over prose can only match words,
 * so a legitimate rewrite of §4 will trip it. That is the correct behaviour for a BINDING LEGAL
 * DOCUMENT: a rewrite of a player's cancellation right should stop and be re-read, not sail
 * through. If you are here because you rewrote §4 on purpose, update the anchors below in the
 * same commit — and check you did it in all three languages, which is the failure this catches.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { content } from "../src/app/legal/terms/page.tsx";
import { millioneaContent, type MillioneaRulesFigures } from "../src/app/legal/rules/_content-millionea.tsx";
import type { Locale } from "../src/lib/i18n-server.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

/** Rendered markup → the text a player actually reads, tags and entities gone. */
const plain = (node: React.ReactNode): string =>
  renderToStaticMarkup(createElement(() => node as React.ReactElement))
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/**
 * The THREE conditions RULES §2.6 makes the right conditional on, per language.
 * Each entry is a list of alternatives — any ONE satisfies that condition, so a translator
 * may pick a phrasing without breaking the guard, but may not drop the condition.
 */
const CONDITIONS: Record<Locale, { label: string; anyOf: string[] }[]> = {
  en: [
    { label: "the 5-minute WINDOW", anyOf: ["within the first 5 minutes"] },
    { label: "the RUNWAY condition", anyOf: ["at least 5 minutes of betting time still remained"] },
    { label: "the rounds where it can NEVER be met", anyOf: ["cash-out is not available on those rounds at all"] },
    { label: "BONUS-funded is never sellable", anyOf: ["bonus-funded position can never be sold"] },
  ],
  sw: [
    { label: "the 5-minute WINDOW", anyOf: ["ndani ya dakika 5 za kwanza"] },
    { label: "the RUNWAY condition", anyOf: ["angalau dakika 5 za muda wa kuweka dau"] },
    { label: "the rounds where it can NEVER be met", anyOf: ["hakupatikani kabisa katika raundi hizo"] },
    { label: "BONUS-funded is never sellable", anyOf: ["kwa bonasi haliwezi kuuzwa"] },
  ],
  zh: [
    { label: "the 5-minute WINDOW", anyOf: ["前 5 分钟内"] },
    { label: "the RUNWAY condition", anyOf: ["仍剩余至少 5 分钟的投注时间"] },
    // 2026-09-14 — the zh Terms name Up & Down rounds 回合 (涨跌), as every other screen does; 场次 was the English-era word.
    { label: "the rounds where it can NEVER be met", anyOf: ["这些回合完全不提供兑现"] },
    { label: "BONUS-funded is never sellable", anyOf: ["奖金资助的持仓在任何时候均不可卖出"] },
  ],
};

/** §4's own heading, per language — proof the section rendered, independent of its length. */
const SECTION_4_TITLE: Record<Locale, string> = {
  en: "How price-competition markets work",
  sw: "Jinsi masoko ya ushindani wa bei yanavyofanya kazi",
  zh: "价格竞争市场的运作方式",
};

/** The check §2 and §3 must be able to FAIL. */
function missingConditions(text: string, locale: Locale): string[] {
  return CONDITIONS[locale].filter((c) => !c.anyOf.some((p) => text.includes(p))).map((c) => c.label);
}

// ── §1 · the live document ───────────────────────────────────────────────────
console.log("\n§1 · §4 states all three conditions, in all three languages");
{
  const rendered = content(1);
  for (const locale of ["en", "sw", "zh"] as Locale[]) {
    const text = plain(rendered[locale]);
    // ⚠️ NOT a character count. The first draft asserted `length > 2000` and ZH failed at 1,765
    // on a complete document — Chinese says the same thing in fewer characters, so the
    // threshold measured the language, not the content. The §4 heading is the real anchor.
    ok(`${locale}: §4 rendered`, text.includes(SECTION_4_TITLE[locale]), `${text.length} chars, no §4 heading`);
    const missing = missingConditions(text, locale);
    ok(`${locale}: all four anchors present`, missing.length === 0, `MISSING: ${missing.join(" · ")}`);
  }

  // ⛔ The anchors must be found in the SAME paragraph the promise lives in, not scattered
  // across the document — a runway sentence three sections away would not qualify the promise.
  const en = plain(rendered.en);
  const promiseAt = en.indexOf("within the first 5 minutes");
  const runwayAt = en.indexOf("at least 5 minutes of betting time still remained");
  ok(
    "en: the RUNWAY qualifies the promise — it follows it within 200 characters",
    promiseAt >= 0 && runwayAt > promiseAt && runwayAt - promiseAt < 200,
    `promise@${promiseAt} runway@${runwayAt}`,
  );
}

// ── §2 · POSITIVE CONTROL ────────────────────────────────────────────────────
console.log("\n§2 · ⚠️ POSITIVE CONTROL — the checker rejects the REAL pre-fix text");
{
  // Verbatim from `git show a783299f:src/app/legal/terms/page.tsx` — the §4 promise as it
  // stood before §6.12. It has the window and nothing else.
  const preFix =
    "Cash-out is available for a short window after placing a bet: within the first 5 minutes " +
    "you may sell for a full refund at no charge. After that the position is locked and rides " +
    "to settlement — it cannot be sold. If no bets are placed on the opposing side, there is " +
    "no prize to pay from and every stake is refunded in full, at no charge.";

  const missing = missingConditions(preFix, "en");
  ok("⚠️ the pre-fix text is REJECTED", missing.length > 0, "it passed — the check is vacuous");
  ok(
    "⚠️ …and the checker names all three things it lacks",
    missing.length === 3
      && missing.some((m) => m.includes("RUNWAY"))
      && missing.some((m) => m.includes("BONUS"))
      && missing.some((m) => m.includes("NEVER")),
    missing.join(" · "),
  );
  ok(
    "⚠️ …while still finding the one condition it DID state",
    !missing.some((m) => m.includes("WINDOW")),
    "it missed the window too — the matcher is broken, not the text",
  );
}

// ── §3 · over-correction ─────────────────────────────────────────────────────
console.log("\n§3 · ⛔ OVER-CORRECTION — two of three is still a rejection");
{
  // The runway restored but the bonus rule dropped — the shape a partial fix would leave.
  const twoOfThree =
    "within the first 5 minutes you may sell for a full refund at no charge — provided that, " +
    "at the moment you placed the bet, at least 5 minutes of betting time still remained on " +
    "that market. On Up & Down 3-minute and 5-minute rounds that condition can never be met, " +
    "so cash-out is not available on those rounds at all.";
  const missing = missingConditions(twoOfThree, "en");
  ok("⛔ a text missing only the BONUS rule is REJECTED", missing.length === 1 && missing[0].includes("BONUS"), missing.join(" · "));

  // And one language left behind is the exact failure §6.12 could have shipped.
  const swMissingRunway = plain(content(1).sw).replace("angalau dakika 5 za muda wa kuweka dau", "");
  ok(
    "⛔ ONE language left behind is caught — sw with the runway removed",
    missingConditions(swMissingRunway, "sw").some((m) => m.includes("RUNWAY")),
  );
}

// ── §4 · Maswali Millionea's binding rules (MB-70) ───────────────────────────
console.log("\n§4 · Maswali Millionea's binding rules state the seven things MB-70 names, in all three languages");
{
  // ⭐ NON-DEFAULT FIGURES: the cap 7 (ruled 10), the free cancel 9 minutes (ruled 5), the void deadline 36 hours (ruled
  // 48). A rulebook that typed the ruled figures instead of reading them cannot pass an anchor that names these.
  const FIG: MillioneaRulesFigures = {
    source: "CONFIG", weekCode: null, licence: "GBT-TEST-0099", ticketPrice: 2500, floor: 3_000_000, feePct: 11, traPct: 10, gbtPct: 5,
    ticketCap: 7, openWeekday: 2, openAt: "06:00", closeWeekday: 4, closeAt: "20:30", minLockBufferMinutes: 40, voidDeadlineHours: 36,
    finalDeadlineWeekday: 2, finalDeadlineAt: "21:15", objectionWindowHours: 30, objectionNotBeforeAt: "11:00", freeCancelMinutes: 9,
    withdrawalFeePct: 2.5, examples: { shared: null, floorWeek: null },
  };
  /** MB-70's seven statements, per language — each an alternative list, as §1's conditions are. */
  const MLN: Record<Locale, { label: string; anyOf: string[] }[]> = {
    en: [
      { label: "ALL FIFTEEN are answered", anyOf: ["you answer all fifteen questions"] },
      { label: "the RESERVE ORDER", anyOf: ["in order from A1 to A5"] },
      { label: "the WEEK VOID", anyOf: ["the whole week is voided and every ticket is refunded in full"] },
      { label: "the VOID DEADLINE", anyOf: ["void deadline is 36 hours after its scheduled start"] },
      { label: "the ABSOLUTE CLOSE", anyOf: ["no ticket can be bought and no ticket can be cancelled"] },
      { label: "the CAP", anyOf: ["at most 7 tickets in one week"] },
      { label: "NO CANCEL in the last minutes", anyOf: ["in the last 9 minutes before the close can never be cancelled"] },
    ],
    sw: [
      { label: "ALL FIFTEEN are answered", anyOf: ["unajibu maswali yote kumi na tano"] },
      { label: "the RESERVE ORDER", anyOf: ["kwa mpangilio kuanzia A1 hadi A5"] },
      { label: "the WEEK VOID", anyOf: ["wiki nzima inabatilishwa na kila tiketi inarejeshwa kamili"] },
      { label: "the VOID DEADLINE", anyOf: ["Muda wa mwisho wa kubatilisha swali ni saa 36"] },
      { label: "the ABSOLUTE CLOSE", anyOf: ["hakuna tiketi inayoweza kununuliwa na hakuna tiketi inayoweza kughairiwa"] },
      { label: "the CAP", anyOf: ["tiketi zisizozidi 7 katika wiki moja"] },
      { label: "NO CANCEL in the last minutes", anyOf: ["dakika 9 za mwisho kabla ya kufunga haiwezi kamwe kughairiwa"] },
    ],
    zh: [
      { label: "ALL FIFTEEN are answered", anyOf: ["回答全部十五道题"] },
      { label: "the RESERVE ORDER", anyOf: ["按 A1 至 A5 的顺序"] },
      { label: "the WEEK VOID", anyOf: ["整周作废，每张彩票全额退款"] },
      { label: "the VOID DEADLINE", anyOf: ["作废截止时间为其预定开始后 36 小时"] },
      { label: "the ABSOLUTE CLOSE", anyOf: ["任何彩票既不能购买，也不能取消"] },
      { label: "the CAP", anyOf: ["每周您最多持有 7 张彩票"] },
      { label: "NO CANCEL in the last minutes", anyOf: ["截止前最后 9 分钟内购买的彩票永远不能取消"] },
    ],
  };
  /** The management PDF's rule 3, which R-RESERVES overrides (MB-70): its return in any language is a defect. */
  const RULE3: Record<Locale, RegExp> = {
    en: /reserves? (?:questions? )?(?:are|is) not answered/i,
    sw: /akiba (?:hazijibiwi|hazihitaji kujibiwa)/i,
    zh: /备选题(?:无需|不需|不必)作答/,
  };
  const missingMln = (text: string, locale: Locale) => MLN[locale].filter((c) => !c.anyOf.some((p) => text.includes(p))).map((c) => c.label);
  const docs = millioneaContent(FIG);
  for (const locale of ["en", "sw", "zh"] as Locale[]) {
    const text = plain(docs[locale]);
    const missing = missingMln(text, locale);
    ok(`${locale}: all seven of MB-70's statements, at the driven figures`, missing.length === 0, `MISSING: ${missing.join(" · ")}`);
    ok(`${locale}: ⛔ the PDF's rule 3 ("reserves are not answered") is nowhere`, !RULE3[locale].test(text), (RULE3[locale].exec(text) ?? [""])[0]);
  }
  const en = plain(docs.en);
  ok("en: ⭐ none of the RULED figures was typed — the cap, the free cancel and the void deadline say the driven ones",
    !en.includes("at most 10 tickets") && !en.includes("in the last 5 minutes") && !en.includes("48 hours after its scheduled start"));

  // ⚠️ POSITIVE CONTROL — the PDF's own shape of the rule is REJECTED, and the rule-3 scanner sees it.
  const pdf = "Answer the ten main questions; the reserve questions are not answered by the player, and each ticket costs TZS 1,000.";
  ok("⚠️ the PDF's rule-3 text is REJECTED: it lacks 'all fifteen are answered', and the scanner finds its sentence",
    missingMln(pdf, "en").includes("ALL FIFTEEN are answered") && RULE3.en.test(pdf));
  // ⛔ OVER-CORRECTION — a text with every statement but one is still a rejection, and ONE language left behind is caught.
  const noCap = en.replace("at most 7 tickets in one week", "a few tickets in one week");
  ok("⛔ a text missing only the CAP is REJECTED, and names it",
    JSON.stringify(missingMln(noCap, "en")) === JSON.stringify(["the CAP"]), JSON.stringify(missingMln(noCap, "en")));
  const swBehind = plain(docs.sw).replace("dakika 9 za mwisho kabla ya kufunga haiwezi kamwe kughairiwa", "");
  ok("⛔ ONE language left behind is caught — sw with the last-minutes rule removed", missingMln(swBehind, "sw").includes("NO CANCEL in the last minutes"));
}

console.log(`\n${"═".repeat(70)}\n  TERMS §4 CANCELLATION: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
