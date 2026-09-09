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
    { label: "the rounds where it can NEVER be met", anyOf: ["这些场次完全不提供兑现"] },
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

console.log(`\n${"═".repeat(70)}\n  TERMS §4 CANCELLATION: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
