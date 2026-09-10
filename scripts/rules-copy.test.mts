/**
 * THE GAME RULES DOCUMENTS — every rate comes from CONFIG, and the side words come from the
 * PRODUCT. Rendered, in all three languages, not grepped.
 *
 *   npx tsx scripts/rules-copy.test.mts    (npm run test:rules-copy)
 *
 * 🔴 WHY THIS EXISTS. `docs/RULES.md` is 🟢 LAW: *"Do not restate a rate anywhere else. A number
 * written twice is a number that will disagree with itself."* Marketing's source PDFs hard-code
 * **13%**, **87%**, **TZS 130,000** and **TZS 65,000**, and `/legal/terms` §4 is already a FILED
 * duplicate in §7 for exactly this reason. Two new binding documents quoting the fee schedule are
 * the largest opportunity yet for that class of defect.
 *
 * ⭐ §1 IS THE ONE THAT MATTERS, AND IT WORKS BY DRIVING A RATE THAT IS NOT PRODUCTION'S.
 * Asserting the page says "13%" would pass just as happily on a hard-coded literal — the
 * assertion could not fail for the reason it exists. So the documents are rendered at **11%**
 * and a *different* stake ceiling, and the guard demands the page show THOSE. A literal cannot.
 *
 * ⛔ AND THE WORKED EXAMPLES ARE THE SUBTLE HALF. A prose "13%" looks wrong the moment the rate
 * moves; a worked example reading "1,000,000 − 130,000 = 870,000" stays internally consistent
 * while being false — three numbers agreeing with each other and with nothing else. §1c checks
 * the arithmetic against the driven rate.
 *
 * ⚠️ §4 pins PHRASES, deliberately. A rewrite of a player's cash-out right should stop and be
 * re-read, not sail through — the same doctrine `terms-cancellation.test.mts:22-25` states.
 *
 *   §1  rates are READ, not typed (driven at a non-production rate)
 *   §2  the cash-out right states all THREE conditions, in all three languages
 *   §3  the withdrawal fee, the stake bounds and the licence number are all present
 *   §4  the side words match the PRODUCT dictionary, in every language
 *   §5  ⚠️ POSITIVE CONTROLS — marketing's original claims are REJECTED, verbatim
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { yesNoContent } from "../src/app/legal/rules/_content-yes-no.tsx";
import { upDownContent } from "../src/app/legal/rules/_content-up-down.tsx";
import type { RulesRates } from "../src/app/legal/rules/_shared.tsx";
import { ALLOWED_DURATIONS } from "../src/lib/updown-durations.ts";
import { sideWordIn } from "../src/lib/side-label.ts";
import { LICENCE_NUMBER } from "../src/lib/support-config.ts";
import type { Locale } from "../src/lib/i18n-server.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const plain = (node: React.ReactNode): string =>
  renderToStaticMarkup(createElement(() => node as React.ReactElement))
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const LOCALES: Locale[] = ["en", "sw", "zh"];

/** Prose comparison is CASE-INSENSITIVE. A condition stated at the start of a sentence reads
 *  "Within the first…"; one mid-sentence reads "within…". Both state the condition, and a guard
 *  that cared about the capital would be pinning sentence order rather than meaning. */
const has = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.toLowerCase());

/**
 * ⛔ NOT PRODUCTION'S NUMBERS, ON PURPOSE. Production is 13% / 1.5% / 1,000 / 1,000,000 / 5 / 1.
 * Every value here differs, so a literal left in the prose fails instead of coinciding.
 */
const DRIVEN: RulesRates = {
  commissionPct: 11,
  netSharePct: 89,
  withdrawalFeePct: 2.5,
  minStake: 7_000,
  maxStake: 9_000_000,
  freeExitMinutes: 4,
  objectionHours: 3,
  commissionRate: 0.11,
};

const docs = () => [
  { name: "yes-no", map: yesNoContent(DRIVEN) },
  { name: "up-down", map: upDownContent(DRIVEN) },
];

// ── §1 — the rates are READ ─────────────────────────────────────────────────────────────────
for (const { name, map } of docs()) {
  for (const loc of LOCALES) {
    const text = plain(map[loc]);
    ok(`§1a ${name}/${loc} shows the DRIVEN commission (11%), not a literal`,
      text.includes("11%") && !text.includes("13%"),
      text.includes("13%") ? "found 13% — a hard-coded rate" : "11% absent");
    ok(`§1b ${name}/${loc} shows the DRIVEN withdrawal fee (2.5%)`,
      text.includes("2.5%"), "2.5% absent");
    // ⭐ The worked example must be ARITHMETIC on the driven rate, not four agreeing literals.
    ok(`§1c ${name}/${loc} worked example is computed (110,000 / 890,000)`,
      text.includes("110,000") && text.includes("890,000") && !text.includes("130,000"),
      text.includes("130,000") ? "found 130,000 — the PDF's literal" : "computed figures absent");
    ok(`§1d ${name}/${loc} shows the DRIVEN stake bounds`,
      text.includes("7,000") && text.includes("9,000,000"), "driven bounds absent");
  }
}

// ── §2 — the cash-out right, all three conditions, all three languages ──────────────────────
const CASHOUT: Record<Locale, { label: string; anyOf: string[] }[]> = {
  en: [
    { label: "the WINDOW", anyOf: ["within the first"] },
    { label: "the RUNWAY condition", anyOf: ["still remained"] },
    { label: "NOT bonus-funded", anyOf: ["not funded by a bonus"] },
  ],
  sw: [
    { label: "the WINDOW", anyOf: ["ndani ya dakika"] },
    { label: "the RUNWAY condition", anyOf: ["kulikuwa bado na angalau"] },
    { label: "NOT bonus-funded", anyOf: ["haikugharamiwa na bonasi"] },
  ],
  zh: [
    { label: "the WINDOW", anyOf: ["分钟内"] },
    { label: "the RUNWAY condition", anyOf: ["仍剩余至少"] },
    { label: "NOT bonus-funded", anyOf: ["并非由奖金资助"] },
  ],
};
for (const { name, map } of docs()) {
  for (const loc of LOCALES) {
    const text = plain(map[loc]);
    for (const c of CASHOUT[loc]) {
      ok(`§2 ${name}/${loc} states ${c.label}`, c.anyOf.some((n) => has(text, n)));
    }
  }
}

// ⛔ AND Up & Down must NAME the rounds where the right cannot be reached. Marketing's PDF
// denied cash-out outright; the honest version says where it genuinely never applies.
{
  const expected = ALLOWED_DURATIONS.filter((m) => m <= DRIVEN.freeExitMinutes).join(" · ");
  for (const loc of LOCALES) {
    const text = plain(upDownContent(DRIVEN)[loc]);
    ok(`§2b up-down/${loc} names the unreachable rounds, derived (${expected})`,
      expected.length > 0 && text.includes(expected), `expected "${expected}"`);
  }
}

// ── §3 — the omissions marketing left, and the licence ──────────────────────────────────────
for (const { name, map } of docs()) {
  for (const loc of LOCALES) {
    const text = plain(map[loc]);
    ok(`§3a ${name}/${loc} carries the licence number`, text.includes(LICENCE_NUMBER()));
    ok(`§3b ${name}/${loc} states a withdrawal fee at all`, /2\.5\s*%/.test(text));
  }
}

// ── §4 — the side words come from the PRODUCT dictionary ────────────────────────────────────
for (const loc of LOCALES) {
  const yn = plain(yesNoContent(DRIVEN)[loc]);
  const ud = plain(upDownContent(DRIVEN)[loc]);
  const yes = sideWordIn(loc, "YES", "MARKET");
  const no = sideWordIn(loc, "NO", "MARKET");
  const up = sideWordIn(loc, "YES", "UPDOWN");
  const down = sideWordIn(loc, "NO", "UPDOWN");
  ok(`§4a yes-no/${loc} uses the product's own side words ("${yes}"/"${no}")`,
    yn.includes(yes) && yn.includes(no));
  ok(`§4b up-down/${loc} uses the product's own direction words ("${up}"/"${down}")`,
    ud.includes(up) && ud.includes(down));
  // ⛔ THE DEFECT `side-label.ts:103-107` RECORDS: the ASCII token inside a non-English sentence.
  if (loc === "zh") {
    ok("§4c zh/yes-no does NOT print the ASCII enum in Chinese prose",
      !/\bYES\b|\bNO\b/.test(yn), "found the ASCII enum — the '若 YES 获胜' defect");
  }
}

// ── §5 — POSITIVE CONTROLS. Marketing's original claims must all be REJECTED. ───────────────
{
  const all = LOCALES.flatMap((l) => [plain(yesNoContent(DRIVEN)[l]), plain(upDownContent(DRIVEN)[l])]).join(" \n ");
  const REJECT: [string, string][] = [
    ["M-Pesa named as the only rail", "M-Pesa"],
    ["the fabricated crypto buffer", "$0.02"],
    ["the unconditional 24-hour payout promise", "in all cases within 24 hours"],
    ["the denial of the cash-out right", "cannot be withdrawn, edited or cancelled once placed"],
    ["the claim that players do not submit markets", "Players do not submit markets"],
    ["marketing's undated version", "Version 1.0"],
  ];
  for (const [label, needle] of REJECT) {
    ok(`§5 REJECTED: ${label}`, !all.includes(needle), `"${needle}" is still in the documents`);
  }
  // ⚠️ CONTROL ON THE CONTROL — if the corpus were empty every rejection above would "pass".
  ok("§5 CONTROL: the rendered corpus is real", all.length > 20_000, `${all.length} chars`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
