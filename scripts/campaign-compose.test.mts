/**
 * test:campaign-compose — what an SMS costs, and the four ways that number goes wrong.
 *
 * ⭐ THIS IS A MONEY SUITE. A segment is the billed unit, and the list this platform is being built
 * for is ~150,000 contacts, so ONE miscounted segment is TZS 900,000. Every assertion below exists
 * because it changes a number someone pays.
 *
 * ── THE FOUR FAILURES ────────────────────────────────────────────────────────
 *
 * 🔴 ① PRICING FROM `String.length`. `SmsMessage.bodyLen` has always stored exactly that, and it is
 * wrong twice over: an extension character (`€ [ ] { } \ ^ | ~`) is ONE character and TWO septets,
 * and an emoji is ONE code point and TWO UTF-16 units. §3 asserts `bodyLen` is never the answer.
 *
 * 🔴 ② DIVIDING INSTEAD OF PACKING. `ceil(units / perSegment)` is the arithmetic everyone writes.
 * It is wrong, because a two-septet character may not be SPLIT across a segment boundary. §4 carries
 * the vector where the two answers differ — 152 plain characters then 77 euro signs is 306 septets,
 * which division prices as 2 segments and which actually sends as 3.
 *
 * 🔴 ③ TWO TABLES. `smsCodingFor` in `sms-blackball.ts` decides what the GATEWAY is told; `sizeSms`
 * decides what the OFFICER is shown. If those come from different tables they will disagree, and the
 * disagreement is silent: the officer is quoted one segment and billed three. §5 asserts they are
 * the same answer over a corpus, and §2 asserts the move that unified them lost no character.
 *
 * 🔴 ④ THE STANDARD IS NOT THE BILLER. Everything here is GSM 03.38. Nothing here has been checked
 * against a Blackball invoice, because no multi-segment message has ever been sent on this account.
 * §7 asserts the module SAYS so — `SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER` is false and `planSms`
 * marks its answer `estimated`. ⛔ A confident number nobody has reconciled is worse than a hedged
 * one, and this is the exact shape of "right about the standard, wrong about the biller".
 *
 * ⭐ §14 (the Vodacom plan S2, 2026-09-30) · THE FOLD. `foldToGsm7` swaps a pasted curly quote, dash,
 * ellipsis or odd space for its plain GSM-7 twin — a market's short title travels in SMS as well as on
 * cards — and it must never touch a character the table already has, nor invent a twin for one it lacks.
 *
 * ⭐ §15–§16 (U37a, 2026-10-01) · THE ONE CAMPAIGN RENDERER. `campaign-template.ts` turns a campaign's two bodies into
 * the officer's live counter and every recipient's message. 🔴 `{jina}` is 8 septets as typed (two extension braces),
 * so a counter that sized the template as typed under-reserved every name over 8 letters and made an at-budget message
 * TWO segments for exactly those recipients; §15 sizes the worst-case name instead and proves the bound over a corpus
 * of real and hostile names, prices the source phrase (DECISIONS M5), and holds the name rules (folded, never cut, a
 * book contact never greeted by a stored name). §16 holds that nothing else in `src/` calls `composeMarketing`.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION — `--prove-red` plants each defect IN MEMORY and requires the
 * MATCHING assertion to fire. No file-writing call, so it stays outside `test:red-anchors` §4.
 *
 * Run: `npm run test:campaign-compose` · Red: `npm run red:campaign-compose`
 */
import {
  sizeSms, planSms, encodingFor, offendingChars, foldToGsm7, unitsIn,
  GSM7_BASIC, GSM7_EXTENDED, SMS_LIMITS, SMS_MAX_SEGMENTS,
  SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER,
  type SmsSize,
} from "../src/lib/sms-compose.ts";
import { smsCodingFor } from "../src/lib/server/sms-blackball.ts";
import {
  marketingFooter, operatorBudget, composeMarketing, shortDomain, footerMeasurementToken,
  SENDER_IDENTITY, STATUTORY_SMS_HELPLINE,
  type MarketingCompose,
} from "../src/lib/marketing/footer.ts";
import {
  JINA, JINA_MAX_CHARS, CAMPAIGN_NAME_MAX_CHARS,
  counterFor, renderForRecipient, renderBody, worstCaseJina, jinaFor, firstNameFor, scanPlaceholders,
  validateCampaignTemplate, describeOffenders, variantFor,
  type CampaignTemplate, type CampaignDraftFields, type CampaignVariant, type RecipientOrigin,
} from "../src/lib/marketing/campaign-template.ts";
import { appUrl } from "../src/lib/app-url.ts";
import { decomment } from "./lib/decomment.mts";
import { srcFiles, REPO_ROOT } from "./lib/tracked-files.mts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.exitCode = 1; // failure is the default
const PROVE_RED = process.argv.includes("--prove-red");

/**
 * ⭐ THE PRE-MOVE TABLE, BYTE FOR BYTE. Copied from `sms-blackball.ts` before U3 split it. Its only
 * job is to prove the split lost nothing — a dropped character would send a perfectly good message
 * as UCS-2 and double its price, and no functional assertion would notice.
 */
const GSM7_BEFORE_THE_MOVE =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà" +
  "\f^{}\\[~]|€";

type Sizer = (text: string) => SmsSize;

/** Text of n plain GSM-7 characters. */
const plain = (n: number) => "a".repeat(n);

function check(size: Sizer, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  /* ── §1 · the limits are the concatenated ones, not multiples of the single ── */
  log("\n§1 · THE LIMITS");
  ok("§1 GSM-7 is 160 single and 153 concatenated (the UDH costs 7 septets)",
    SMS_LIMITS.GSM7.single === 160 && SMS_LIMITS.GSM7.concatenated === 153);
  ok("§1 UCS-2 is 70 single and 67 concatenated (the UDH costs 3 units)",
    SMS_LIMITS.UCS2.single === 70 && SMS_LIMITS.UCS2.concatenated === 67);
  ok("§1 ⛔ …so a two-segment message is NOT 2 × the single limit",
    SMS_LIMITS.GSM7.concatenated * 2 !== SMS_LIMITS.GSM7.single * 2);

  /* ── §2 · the move lost nothing ────────────────────────────────────────── */
  log("\n§2 · THE TABLE MOVED WITHOUT LOSING A CHARACTER");
  {
    const before = new Set(GSM7_BEFORE_THE_MOVE);
    const after = new Set([...GSM7_BASIC, ...GSM7_EXTENDED]);
    const lost = [...before].filter((c) => !after.has(c));
    const gained = [...after].filter((c) => !before.has(c));
    ok("§2 ⭐ basic ∪ extended is EXACTLY the pre-move table", lost.length === 0 && gained.length === 0,
      `lost ${JSON.stringify(lost)} gained ${JSON.stringify(gained)}`);
    ok("§2 …and the two halves do not overlap",
      [...GSM7_BASIC].every((c) => !GSM7_EXTENDED.includes(c)));
    ok("§2 control · the pre-move fixture is a real table, not an empty string", before.size > 100, `${before.size} chars`);
    log(`       basic ${new Set(GSM7_BASIC).size} · extended ${new Set(GSM7_EXTENDED).size} · total ${after.size}`);
  }

  /* ── §3 · length is not cost ───────────────────────────────────────────── */
  log("\n§3 · `String.length` IS NEVER THE ANSWER");
  {
    const euros = "€".repeat(80); // 80 characters, 160 septets
    const s = size(euros);
    ok("§3 ⭐ 80 euro signs are 80 characters and 160 septets", euros.length === 80 && s.units === 160, `units ${s.units}`);
    ok("§3 …and still fit one segment, exactly", s.segments === 1);
    const euros81 = "€".repeat(81);
    ok("§3 ⭐ …but 81 of them is 162 septets and TWO segments, on a body of 81 characters",
      size(euros81).segments === 2, `units ${size(euros81).units} segments ${size(euros81).segments}`);
    const emoji = "😀".repeat(35); // 35 code points, 70 UTF-16 units
    const e = size(emoji);
    ok("§3 ⭐ an emoji is one code point and TWO UTF-16 units",
      [...emoji].length === 35 && e.units === 70, `units ${e.units}`);
    ok("§3 …so 35 emoji fill a single UCS-2 segment exactly", e.segments === 1 && e.encoding === "UCS2");
    ok("§3 …and 36 do not", size("😀".repeat(36)).segments === 2);
    // ⭐ WHY THIS BUG HIDES, MEASURED. `String.length` is EXACTLY RIGHT for UCS-2 — it already counts
    // an emoji as the two UTF-16 units it occupies — and wrong only for GSM-7 extension characters.
    // So the naive implementation agrees with the correct one on every non-GSM-7 body an officer is
    // likely to paste, and disagrees only on `€ [ ] { } \ ^ | ~`. A suite built from emoji and
    // Chinese would have found nothing.
    ok("§3 ⛔ String.length is CORRECT for UCS-2 — which is why pricing from it looks fine",
      emoji.length === e.units && "漢".repeat(70).length === size("漢".repeat(70)).units);
    ok("§3 ⭐ …and WRONG for GSM-7, by exactly one per extension character",
      "€".repeat(80).length === 80 && size("€".repeat(80)).units === 160);
  }

  /* ── §4 · the boundary vectors ─────────────────────────────────────────── */
  log("\n§4 · BOUNDARY VECTORS — chosen because they are where the answer changes");
  const BOUNDS: Array<[string, string, number, number]> = [
    // label, text, expected units, expected segments
    ["159 GSM-7 characters", plain(159), 159, 1],
    ["160 — the last that fits one segment", plain(160), 160, 1],
    ["161 — the first that does not", plain(161), 161, 2],
    ["305", plain(305), 305, 2],
    ["306 — 2 × 153, the last two-segment body", plain(306), 306, 2],
    ["307 — the first three-segment body", plain(307), 307, 3],
    ["69 UCS-2 units", "é".repeat(0) + "漢".repeat(69), 69, 1],
    ["70 — the last single UCS-2 segment", "漢".repeat(70), 70, 1],
    ["71 — the first that is not", "漢".repeat(71), 71, 2],
    ["133", "漢".repeat(133), 133, 2],
    ["134 — 2 × 67", "漢".repeat(134), 134, 2],
    ["135 — three segments", "漢".repeat(135), 135, 3],
    // ⭐ the plan's own edge: a 160-septet body whose LAST character is an extension character
    ["160 septets ending in an extension character", plain(158) + "€", 160, 1],
    ["…and one more plain character makes it 161", plain(159) + "€", 161, 2],
  ];
  for (const [label, text, units, segments] of BOUNDS) {
    const s = size(text);
    ok(`§4 ${label} → ${units} units, ${segments} segment(s)`,
      s.units === units && s.segments === segments, `got ${s.units} units, ${s.segments} segment(s)`);
  }

  /* ── §4b · packing, not dividing ───────────────────────────────────────── */
  log("\n§4b · SEGMENTS ARE PACKED, NOT DIVIDED");
  {
    // 152 plain + 77 euro = 152 + 154 = 306 septets.
    const text = plain(152) + "€".repeat(77);
    const s = size(text);
    const naive = Math.ceil(s.units / SMS_LIMITS.GSM7.concatenated);
    ok("§4b ⭐ 152 plain + 77 euro is 306 septets", s.units === 306, `got ${s.units}`);
    ok("§4b ⭐ …which division prices as 2 segments", naive === 2, `division said ${naive}`);
    ok("§4b ⛔ …and which actually sends as 3, because a two-septet character cannot be split",
      s.segments === 3, `got ${s.segments}`);
    log(`       the gap is one segment — at 150,000 recipients, TZS ${(150_000 * 6).toLocaleString()}`);
  }

  /* ── §5 · one table, two readers ───────────────────────────────────────── */
  log("\n§5 · THE GATEWAY AND THE OFFICER READ THE SAME TABLE");
  {
    const CORPUS = [
      "Habari! 50pick ina soka leo.",
      "50pick: bet on today's matches",
      "Bei ni TZS 1,000 — anza sasa",          // em-dash: UCS-2
      "Pata bonasi ya 50% leo!",
      "€100 bonus",                             // extension char, still GSM-7
      "Karibu 50pick 😀",                       // emoji: UCS-2
      "Salamu za “kipekee”",                    // curly quotes: UCS-2
      "@£$¥ èéùìòÇ Øø Åå ΔΦΓΛΩΠΨΣΘΞ ÆæßÉ",
      "[brackets] {braces} \\backslash ^caret ~tilde |pipe",
      "",
      "a".repeat(200),
      "漢字のメッセージ",
    ];
    let disagreements = 0;
    for (const s of CORPUS) {
      if (smsCodingFor(s) !== size(s).encoding) {
        disagreements++;
        log(`  FAIL §5 disagreement on ${JSON.stringify(s.slice(0, 30))}: gateway ${smsCodingFor(s)} vs officer ${size(s).encoding}`);
      }
    }
    ok(`§5 ⭐ smsCodingFor === sizeSms().encoding over ${CORPUS.length} real bodies`, disagreements === 0, `${disagreements} disagreed`);
    // ⛔ CONTROL. Without this, a corpus of only-GSM-7 strings would agree trivially.
    const ucs2 = CORPUS.filter((s) => size(s).encoding === "UCS2").length;
    const gsm7 = CORPUS.filter((s) => size(s).encoding === "GSM7").length;
    ok("§5 control · the corpus contains BOTH encodings, so agreement is not trivial",
      ucs2 >= 3 && gsm7 >= 3, `${gsm7} GSM-7, ${ucs2} UCS-2`);
  }

  /* ── §6 · which character cost the money ───────────────────────────────── */
  log("\n§6 · THE OFFICER IS TOLD WHICH CHARACTER COST THEM");
  {
    const s = size("Bei ni TZS 1,000 — anza sasa");
    ok("§6 an em-dash is named as the offender", s.offending.includes("—"), JSON.stringify(s.offending));
    ok("§6 …and a GSM-7 body names none", size("Bei ni TZS 1,000 - anza sasa").offending.length === 0);
    ok("§6 ⭐ an extension character is NOT an offender — it is representable, it just costs two",
      offendingChars("€100").length === 0 && encodingFor("€100") === "GSM7");
    ok("§6 offenders are de-duplicated and in first-seen order",
      offendingChars("a—b—c“d").join("") === "—“");
  }

  /* ── §7 · the honesty of the number ────────────────────────────────────── */
  log("\n§7 · THE NUMBER SAYS WHAT IT IS");
  {
    const p = planSms(plain(161), 150_000);
    ok("§7 ⛔ the arithmetic is NOT yet reconciled against the biller", SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER === false);
    ok("§7 ⭐ …and every plan says so, rather than quoting a confident number nobody has checked", p.estimated === true);
    ok("§7 a plan multiplies segments by recipients", p.billableSegments === 2 * 150_000, `${p.billableSegments}`);
    ok(`§7 a body over ${SMS_MAX_SEGMENTS} segments is outside the cap`, planSms(plain(400), 1).withinCap === false);
    ok("§7 …and one within it is not", planSms(plain(100), 1).withinCap === true);
    ok("§7 recipients are never negative", planSms(plain(10), -5).recipients === 0);
    ok("§7 ⛔ a plan returns QUANTITY, never a currency amount — the rate belongs with the ledger",
      !Object.keys(p).some((k) => /tzs|cost|price|amount/i.test(k)), Object.keys(p).join(","));
  }

  /* ── §8 · empty and degenerate ─────────────────────────────────────────── */
  log("\n§8 · THE EDGES");
  ok("§8 an empty body is zero units and one segment", size("").units === 0 && size("").segments === 1);
  ok("§8 a single character is one segment", size("a").segments === 1);
  ok("§8 whitespace and newlines are GSM-7", encodingFor("a\nb\rc d") === "GSM7");

  return failed;
}

/* ══ U4 — THE STATUTORY ENVELOPE ════════════════════════════════════════════
 * Separate from `check` because these assertions are about the FOOTER, and the red control plants a
 * different thing here: a composer that sizes the body instead of the message. */

type Composer = (body: string, token: string) => MarketingCompose;

function checkEnvelope(compose: Composer, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const TOKEN = "a1b2c3d4";

  /* ── §9 · the footer is what it says it is ─────────────────────────────── */
  log("\n§9 · THE FOOTER, MEASURED");
  {
    const f = marketingFooter(TOKEN, "SW");
    log(`       ${JSON.stringify(f)}`);
    ok("§9 the footer carries the sender identity", f.includes(SENDER_IDENTITY));
    ok("§9 …the age restriction, in the Swahili already shipped on the registration screen", f.includes("18+"));
    ok("§9 …the helpline (the one 50pick publishes — OQ4)", f.includes(STATUTORY_SMS_HELPLINE));
    ok("§9 …and a working opt-out link", f.includes(`${shortDomain()}/s/${TOKEN}`), f);
    ok("§9 ⭐ it is 49 septets — and that number is COMPUTED, not typed",
      sizeSms(f).units === 49, `${sizeSms(f).units} septets`);
    ok("§9 the footer is itself GSM-7 — a footer that forced UCS-2 would halve every message",
      sizeSms(f).encoding === "GSM7");
    ok("§9 it begins with a newline, and that newline is counted", f.startsWith("\n"));
    ok("§9 the English footer costs exactly the same, so the budget does not move with locale",
      sizeSms(marketingFooter(TOKEN, "EN")).units === sizeSms(f).units);
  }

  /* ── §10 · the budget is derived from the real deployment URL ──────────── */
  log("\n§10 · THE OPERATOR'S BUDGET");
  {
    const budget = operatorBudget("SW");
    ok("§10 ⭐ the budget is 111 characters — 160 minus the footer, computed from both",
      budget === SMS_LIMITS.GSM7.single - 49 && budget === 111, `${budget}`);
    // ⭐ THE DOMAIN IS NOT TYPED ANYWHERE. If `appUrl()` ever changes, this is what notices.
    ok("§10 ⭐ the short domain is DERIVED from the real appUrl(), not typed",
      appUrl().replace(/^https?:\/\//, "").replace(/^www\./, "") === shortDomain(),
      `appUrl ${appUrl()} → ${shortDomain()}`);
    ok("§10 control · the derivation actually produced something",
      shortDomain().length > 3 && !shortDomain().includes("/"), shortDomain());
    ok("§10 ⛔ a longer domain would cost budget, and the guard would see it",
      operatorBudget("SW") > operatorBudget("SW", "x".repeat(10)));
    // OQ3's shadow, priced rather than argued about.
    const withSource = operatorBudget("SW", "Umetupa namba yako 50pick.");
    ok("§10 ⚠️ if OQ3 forces the source phrase inline, the budget falls to about 89",
      withSource >= 80 && withSource <= 92, `${withSource}`);
    log(`       budget ${budget} without a source phrase, ${withSource} with one`);
  }

  /* ── §11 · nothing composes without the footer ─────────────────────────── */
  log("\n§11 · NOTHING COMPOSES WITHOUT THE FOOTER");
  {
    const c = compose("50pick: soka leo. Weka dau sasa.", TOKEN);
    ok("§11 a good body composes", c.ok, c.problems.join(" | "));
    ok("§11 ⭐ and the composed text ENDS with the footer", c.text.endsWith(marketingFooter(TOKEN, "SW")));
    ok("§11 ⭐ the size is taken of the WHOLE message, not the body",
      c.size.units === sizeSms(c.text).units, `${c.size.units} vs ${sizeSms(c.text).units}`);

    // ETA s.32(1)(b) — identity at the start.
    const noIdentity = compose("Soka leo. Weka dau sasa.", TOKEN);
    ok("§11 a body that does not begin with the sender identity is refused", !noIdentity.ok);
    ok("§11 …and says so in words, not a code",
      noIdentity.problems.some((p) => p.length > 30 && !/[A-Z]{4,}_/.test(p)), noIdentity.problems.join(" | "));

    ok("§11 an empty body is refused", !compose("", TOKEN).ok);
    ok("§11 ⭐ a missing or wrong-length opt-out token is refused — a message with no way to stop is unlawful",
      !compose("50pick: habari", "").ok && !compose("50pick: habari", "short").ok);

    // ⭐ THE BUDGET BOUNDARY, BOTH SIDES.
    const at = "50pick " + "a".repeat(operatorBudget("SW") - 7);
    const over = at + "a";
    ok(`§11 ⭐ a body of exactly ${operatorBudget("SW")} characters is one message`, compose(at, TOKEN).size.segments === 1,
      `${compose(at, TOKEN).size.units} units, ${compose(at, TOKEN).size.segments} segment(s)`);
    ok("§11 ⛔ …and one more character is two, and is refused", compose(over, TOKEN).size.segments === 2 && !compose(over, TOKEN).ok);
    ok("§11 …and the refusal quotes the budget the officer actually has",
      compose(over, TOKEN).problems.some((p) => p.includes(String(operatorBudget("SW")))), compose(over, TOKEN).problems.join(" | "));
  }

  /* ── §12 · ONE helpline — OQ4 answered ─────────────────────────────────── */
  // ⭐ Until 2026-09-26 this section asserted the footer DIFFERED from the published helpline, because
  // OQ4 (ours, or the Gaming Board Code's 0800110051?) was Ali's to answer. He answered: "the right
  // helpline is ours." — read as: the number 50pick already publishes (labelled on the site as the
  // national helpline), not a line 50pick runs. The section now pins the answer the other way round.
  log("\n§12 · ONE HELPLINE — the footer carries the number support-config publishes (OQ4, answered 2026-09-26)");
  {
    const support = readFileSync(new URL("../src/lib/support-config.ts", import.meta.url), "utf8");
    const published = (support.match(/STATUTORY_HELPLINE\s*=\s*"([^"]+)"/) || [])[1] ?? "";
    ok("§12 control · support-config's published helpline was actually read", published.length > 5, `read "${published}"`);
    checkHelpline(published, STATUTORY_SMS_HELPLINE, marketingFooter, ok);
  }

  /* ── §13 · ONE cap, and the budget in the message's own encoding (2026-09-26) ── */
  // 🔴 `SMS_MAX_SEGMENTS` said 2 while the composer refused anything over 1, and the refusal quoted the
  // GSM-7 budget (111) for a UCS-2 message whose real room is 70 − 49 = 21.
  log("\n§13 · ONE SEGMENT CAP, AND THE BUDGET IN THE MESSAGE'S OWN ENCODING");
  {
    const at = compose("50pick " + "a".repeat(operatorBudget("SW") - 7), TOKEN);
    const over = compose("50pick " + "a".repeat(operatorBudget("SW") - 6), TOKEN);
    ok("§13 ⛔ the composer and the plan agree on the cap — both accept the at-budget message and both refuse one more",
      at.ok && planSms(at.text, 1).withinCap && !over.ok && !planSms(over.text, 1).withinCap,
      `at ok=${at.ok} withinCap=${planSms(at.text, 1).withinCap} · over ok=${over.ok} withinCap=${planSms(over.text, 1).withinCap}`);
    ok("§13 the UCS-2 budget is 70 minus the footer, computed — 21", operatorBudget("SW", "", "UCS2") === SMS_LIMITS.UCS2.single - 49,
      `${operatorBudget("SW", "", "UCS2")}`);
    const curly = "50pick: leo ni siku ya soka’ ok"; // 31 characters, one curly apostrophe → UCS-2
    const c = compose(curly, TOKEN);
    ok("§13 ⭐ a short body with one ’ is two messages, and the refusal quotes its REAL room (21), not 111",
      c.size.encoding === "UCS2" && c.size.segments === 2 && c.problems.some((p) => p.includes("you have 21 characters")) && !c.problems.some((p) => p.includes("111")),
      c.problems.join(" | "));
    ok("§13 …and states what the body uses, in the same units", c.problems.some((p) => p.includes(`this uses ${curly.length}`)), c.problems.join(" | "));
  }

  return failed;
}

/**
 * §12's two assertions as a function of the VALUES, so `--prove-red` can hand it the Board's number
 * back in the footer (docs-prompt-17, 2026-09-26: §12 had no plant, so "a test fails if the Board's
 * number gets back in" had never been shown able to fail — §5.11).
 * ⚠️ "The published one" is the number 50pick already publishes, which every public surface labels
 * the national helpline — not a line 50pick operates (OQ4 as clarified 2026-09-26).
 */
function checkHelpline(
  published: string,
  helpline: string,
  footer: (token: string, locale: "SW" | "EN") => string,
  ok: (label: string, cond: boolean, extra?: string) => void,
): void {
  ok("§12 ⭐ the marketing footer's helpline IS the published one — one number, not a second",
    published.replace(/\s/g, "") === helpline, `footer "${helpline}" · published "${published}"`);
  ok("§12 …and the Gaming Board Code's 0800110051 appears nowhere in a composed footer",
    !footer("a1b2c3d4", "SW").includes("0800110051") && !footer("a1b2c3d4", "EN").includes("0800110051"));
}

/* ══ §14 — THE FOLD (the Vodacom plan S2, 2026-09-30) ═══════════════════════
 * Separate from `check` because it tests a different function — and `check(naiveDivide)` must keep breaking
 * exactly ONE assertion (the §4b finding below), which a fold case inside `check` would disturb.
 * ⛔ Every non-ASCII character here is BUILT with String.fromCharCode / fromCodePoint. A pasted one can silently
 * become its plain twin in an editor, and the assertion would then compare a string with itself. */

type Fold = (text: string) => string;
const cc = (...codes: number[]) => String.fromCharCode(...codes);
const FOLD_EM_DASH = cc(0x2014);
const FOLD_ZERO_WIDTH = [0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF].map((c) => cc(c));
const FOLD_CJK = cc(0x6F22, 0x5B57);
const FOLD_E_ACUTE = cc(0xE9);

function checkFold(fold: Fold, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  log("\n§14 · THE FOLD — onto GSM-7 where a plain twin exists, and nowhere else");
  {
    const LSQ = cc(0x2018), RSQ = cc(0x2019), LDQ = cc(0x201C), RDQ = cc(0x201D);
    const quotes = fold(`${LSQ}a${RSQ} ${LDQ}b${RDQ}`);
    ok("§14 curly quotes fold to straight ones", quotes === `'a' "b"`, JSON.stringify(quotes));

    // hyphen, non-breaking hyphen, figure dash, en dash, em dash, horizontal bar, minus sign
    const dashes = [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map((c) => fold(`1${cc(c)}2`));
    ok("§14 every dash (hyphen, non-breaking hyphen, figure, en, em, bar) and the minus sign fold to -",
      dashes.every((s) => s === "1-2"), JSON.stringify(dashes));

    ok("§14 the ellipsis folds to three full stops", fold(`leo${cc(0x2026)}`) === "leo...", JSON.stringify(fold(`leo${cc(0x2026)}`)));

    // no-break, narrow no-break, thin, figure, hair, en and em spaces
    const spaces = [0x00A0, 0x202F, 0x2009, 0x2007, 0x200A, 0x2002, 0x2003].map((c) => fold(`a${cc(c)}b`));
    ok("§14 the no-break, narrow and thin spaces fold to a plain space", spaces.every((s) => s === "a b"), JSON.stringify(spaces));

    const dots = fold(`a${cc(0x00B7)}b${cc(0x2022)}c 2${cc(0x00D7)}3`);
    ok("§14 the middle dot and the bullet fold to -, and the multiplication sign to x", dots === "a-b-c 2x3", JSON.stringify(dots));

    const zw = FOLD_ZERO_WIDTH.map((z) => fold(`a${z}b`));
    ok("§14 zero-width characters are removed", zw.every((s) => s === "ab"), JSON.stringify(zw.map((s) => s.length)));

    // a-acute, e-circumflex, c-cedilla, o-macron, i-acute: none is in GSM-7, each has a bare twin that is
    const accented: Array<[number, string]> = [[0xE1, "a"], [0xEA, "e"], [0xE7, "c"], [0x14D, "o"], [0xED, "i"]];
    const bare = accented.map(([c]) => fold(cc(c)));
    ok("§14 an accented letter OUTSIDE GSM-7 loses its accent", accented.every(([, b], i) => bare[i] === b), JSON.stringify(bare));

    // e-acute, E-acute, u-umlaut, n-tilde, a-grave, e-grave: all already in the basic table
    const kept = [0xE9, 0xC9, 0xFC, 0xF1, 0xE0, 0xE8].map((c) => cc(c));
    ok("§14 a letter ALREADY in GSM-7 is kept, accent and all (the e-acute stays)",
      kept.every((k) => fold(k) === k) && encodingFor(FOLD_E_ACUTE) === "GSM7", JSON.stringify(kept.map((k) => fold(k))));
    ok("§14 the fold is the identity on the whole GSM-7 table — it never touches a character the table has",
      fold(GSM7_BASIC + GSM7_EXTENDED) === GSM7_BASIC + GSM7_EXTENDED);

    ok("§14 a CJK character is left as it is, so encodingFor still reports UCS-2 (the fold never invents a twin)",
      fold(FOLD_CJK) === FOLD_CJK && encodingFor(fold(FOLD_CJK)) === "UCS2", JSON.stringify(fold(FOLD_CJK)));
    const emoji = `hi ${String.fromCodePoint(0x1F600)}`;
    ok("§14 …and so is an emoji", fold(emoji) === emoji && encodingFor(fold(emoji)) === "UCS2");

    const pasted = `Je, Simba ${LDQ}watashinda${RDQ} derby${FOLD_EM_DASH}leo${cc(0x2026)}?`;
    ok("§14 a pasted title that was UCS-2 is GSM-7 after the fold, and is sized in septets again",
      encodingFor(pasted) === "UCS2" && encodingFor(fold(pasted)) === "GSM7" && sizeSms(fold(pasted)).encoding === "GSM7",
      JSON.stringify(fold(pasted)));
    ok("§14 the fold is idempotent", fold(fold(pasted)) === fold(pasted));
  }
  return failed;
}

/* ══ §15–§16 — THE ONE CAMPAIGN RENDERER (U37a, 2026-10-01) ════════════════
 * Separate from `check` for the §4b reason above: `check(naiveDivide)` must keep breaking exactly ONE assertion.
 * Every plant swaps ONE member of `TemplateImpl` (or one source string) in memory; nothing is written to disk.
 * ⛔ Non-ASCII test characters are BUILT with `cc` / `String.fromCodePoint`, exactly as §14's are. */

type TemplateImpl = {
  counterFor: typeof counterFor;
  renderForRecipient: typeof renderForRecipient;
  jinaFor: typeof jinaFor;
  firstNameFor: typeof firstNameFor;
  scanPlaceholders: typeof scanPlaceholders;
  validate: typeof validateCampaignTemplate;
  describeOffenders: typeof describeOffenders;
  variantFor: typeof variantFor;
};
const REAL_TEMPLATE: TemplateImpl = {
  counterFor, renderForRecipient, jinaFor, firstNameFor, scanPlaceholders,
  validate: validateCampaignTemplate, describeOffenders, variantFor,
};

/** A token of the minted length (`OPTOUT_TOKEN_CHARS`). */
const TT = "a1b2c3d4";
/** §10's realistic phrase — a TEST string. ⛔ The real wording is owner gate G5's (OQ3), never this suite's. */
const PHRASE = "Umetupa namba yako 50pick.";
const FB = "Rafiki";
const HEAD = "50pick Habari {jina}, ";
const HEAD_EN = "50pick Hello {jina}, ";
const EN_BODY = "50pick: Hello {jina}, football today.";
const NL15 = cc(10);
const RSQ15 = cc(0x2019);
const NBSP15 = cc(0x00A0);
const ZWSP15 = cc(0x200B);
const ZOE = `Zo${cc(0xEB)}`;
const ONEIL = `O${RSQ15}Neil`;
const EMOJI_NAME = `Juma${String.fromCodePoint(0x1F600)}`;
const CJK_NAME = cc(0x738B, 0x4F1F);
const GREEK_GSM_NAME = cc(0x394, 0x3A6, 0x393);

const tpl = (over: Partial<CampaignTemplate> = {}): CampaignTemplate => ({
  bodySw: "50pick: Habari {jina}, soka leo.", bodyEn: "", nameFallbackSw: FB, nameFallbackEn: "Friend", sourcePhrase: "", ...over,
});
const draft = (over: Partial<CampaignDraftFields> = {}): CampaignDraftFields => {
  const { sourcePhrase: _typedByNoOfficer, ...typed } = tpl();
  return { name: "Derby week", ...typed, ...over };
};

/** The reserve restated BY HAND (12 W's, one septet each), so no fixture leans on the code under test. */
const worstTyped = (body: string) => body.split("{jina}").join("W".repeat(JINA_MAX_CHARS));
/** `head` padded with plain letters until its worst case is exactly `target` septets. */
const fillTo = (head: string, target: number) => head + "a".repeat(Math.max(0, target - unitsIn(worstTyped(head), "GSM7")));
const has = (list: string[] | undefined, needle: string) => (list ?? []).some((p) => p.includes(needle));

/**
 * ⭐ THE NAME CORPUS — written out, never generated, so a reader can see what was tried. Real names at and over the
 * limit, folded letters, joiners in the wrong place, the handles `User.displayName` actually allows (a URL, digits,
 * an underscore), emoji, CJK, Greek in and out of the GSM table, invisible characters, line breaks, and nothing.
 */
const NAMES: Array<string | null | undefined> = [
  "Ali", "Asha", "Zawadi", "Mwanaisha", "Abdulrahman", "Christabella", "Kristoffersen",
  "WWWWWWWWWWWW", "WWWWWWWWWWWWW", "UPPERCASENAME", "a",
  ZOE, ONEIL, `Jos${cc(0xE9)}`, `${cc(0xC5)}sa`, `${cc(0xD1)}and${cc(0xFA)}`,
  "Mary-Jane", "D'Souza", "-Ali", "Ali-", "Jean--Paul", "Ma'am'",
  "Ali99", "www.50pick.tz", "BigWinner_1", `${cc(0x20AC)}uro`, "{jina}", "Ali{jina}",
  EMOJI_NAME, String.fromCodePoint(0x1F525), CJK_NAME,
  cc(0x395, 0x3BB, 0x3AD, 0x3BD, 0x3B7), GREEK_GSM_NAME,
  `Mohammed${NBSP15}Ali`, `Ju${ZWSP15}ma`, `Ali${cc(9)}Baba`, `Ali${NL15}Baba`,
  "Abdulrahman Mohamed", "  two  words ", "", null, undefined,
];

function checkTemplate(impl: TemplateImpl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const v = (over: Partial<CampaignDraftFields> = {}, phrase = "") => impl.validate(draft(over), phrase);

  log("\n§15 · THE ONE CAMPAIGN RENDERER — the worst-case counter, the name, the source phrase");
  {
    const base = v();
    ok("§15.0 control · the fixture draft passes — every refusal below comes from its one change", base.ok, JSON.stringify(base.problems));
  }

  /* ── §15.1 · {jina} reserves the longest name, not its own 8 septets ── */
  {
    const budget = operatorBudget("SW");
    const atBudget = fillTo(HEAD, budget);
    const c1 = impl.counterFor(atBudget, "SW", FB, "");
    const c2 = impl.counterFor(atBudget + "a", "SW", FB, "");
    ok("§15.1 ⭐ {jina} reserves JINA_MAX_CHARS septets — a template at budget WITH the reserve is 1 message, ok, 0 left",
      c1.segments === 1 && c1.ok && c1.left === 0 && c1.jinaReserve === JINA_MAX_CHARS,
      `segments ${c1.segments} left ${c1.left} reserve ${c1.jinaReserve} · ${c1.problems.join(" | ")}`);
    ok("§15.1 ⛔ …and one more character is 2 messages, refused, and the refusal quotes the real room",
      c2.segments === 2 && !c2.ok && c2.left === -1
        && c2.problems.some((p) => p.includes(`you have ${budget} characters`) && p.includes(`this uses ${budget + 1}`)),
      `segments ${c2.segments} left ${c2.left} · ${c2.problems.join(" | ")}`);
    ok("§15.1 control · the placeholder as typed is 8 septets — 4 short of the reserve, so sizing it as typed is visible",
      unitsIn(JINA, "GSM7") === 8 && JINA_MAX_CHARS - unitsIn(JINA, "GSM7") === 4);
  }

  /* ── §15.2 · THE BOUND: no real message is bigger than the counter said ── */
  {
    const templates: Array<{ label: string; t: CampaignTemplate }> = [
      { label: "no source phrase", t: tpl({ bodySw: fillTo(HEAD, operatorBudget("SW")), bodyEn: fillTo(HEAD_EN, operatorBudget("EN")) }) },
      {
        label: "with the source phrase",
        t: tpl({ bodySw: fillTo(HEAD, operatorBudget("SW", PHRASE)), bodyEn: fillTo(HEAD_EN, operatorBudget("EN", PHRASE)), sourcePhrase: PHRASE }),
      },
    ];
    const strings = NAMES.filter((n): n is string => typeof n === "string");
    ok("§15.2 control · the corpus is real: 40+ names, with a 13-letter one, an emoji, CJK, a URL, empty and null",
      NAMES.length >= 40 && strings.includes("Kristoffersen") && strings.includes(EMOJI_NAME) && strings.includes(CJK_NAME)
        && strings.includes("www.50pick.tz") && strings.includes("") && NAMES.includes(null),
      `${NAMES.length} names`);
    const atCap: string[] = [];
    const violations: string[] = [];
    let cases = 0;
    for (const { label, t } of templates) {
      for (const variant of ["SW", "EN"] as CampaignVariant[]) {
        const body = variant === "EN" ? t.bodyEn : t.bodySw;
        const fallback = variant === "EN" ? t.nameFallbackEn : t.nameFallbackSw;
        const counter = impl.counterFor(body, variant, fallback, t.sourcePhrase);
        if (!(counter.ok && counter.left === 0)) atCap.push(`${label}/${variant}: ok=${counter.ok} left=${counter.left}`);
        for (const name of NAMES) {
          for (const origin of ["account", "book"] as RecipientOrigin[]) {
            cases++;
            const r = impl.renderForRecipient(t, { variant, name: name ?? null, token: TT, origin });
            const within = r.ok && r.size.encoding === "GSM7" && r.size.units <= counter.units && r.size.segments <= counter.segments;
            if (!within) violations.push(`${label}/${variant}/${origin}/${JSON.stringify(name)}: ${r.size.units} units ${r.size.encoding} ${r.size.segments} seg ok=${r.ok} vs counter ${counter.units}`);
          }
        }
      }
    }
    ok("§15.2 control · every counter sits exactly AT the cap, so the bound below is tight, not trivially loose",
      atCap.length === 0, atCap.join(" | "));
    ok(`§15.2 ⭐ BOUND PROPERTY · over ${cases} renders, every real message is within the counter's units, its encoding (GSM-7) and its segments, and sendable`,
      violations.length === 0 && cases === NAMES.length * 8, `${violations.length} over: ${violations.slice(0, 3).join(" | ")}`);
  }

  /* ── §15.3 · the name: folded, first word, letters, never cut ── */
  {
    ok("§15.3 ⭐ a usable name is kept, and a letter outside GSM-7 is FOLDED, not refused (Abdulrahman; Zoe; O'Neil)",
      impl.jinaFor("Abdulrahman", FB) === "Abdulrahman" && impl.jinaFor(ZOE, FB) === "Zoe" && impl.jinaFor(ONEIL, FB) === "O'Neil",
      `${impl.jinaFor("Abdulrahman", FB)} · ${impl.jinaFor(ZOE, FB)} · ${impl.jinaFor(ONEIL, FB)}`);
    const long = "Kristoffersen";
    const got = impl.jinaFor(long, FB);
    ok("§15.3 ⛔ a 13-letter name gives the FALLBACK — never cut to 12 (the result is never a strict prefix of the name)",
      got === FB && !(long.startsWith(got) && got.length < long.length), got);
    const junk: Array<string | null | undefined> = ["www.50pick.tz", "Ali99", "BigWinner_1", EMOJI_NAME, CJK_NAME, GREEK_GSM_NAME, "", null, undefined];
    ok("§15.3 ⛔ a URL, digits, an underscore, an emoji, CJK, Greek, empty and null all give the fallback",
      junk.every((n) => impl.jinaFor(n, FB) === FB), junk.map((n) => impl.jinaFor(n, FB)).join(","));
    ok("§15.3 the FIRST word of a padded name is the one used", impl.jinaFor("  two  words ", FB) === "two", impl.jinaFor("  two  words ", FB));
    const handle = impl.renderForRecipient(tpl(), { variant: "SW", name: "BigWinner_1", token: TT, origin: "account" });
    const folded = impl.renderForRecipient(tpl(), { variant: "SW", name: ZOE, token: TT, origin: "account" });
    ok("§15.3 ⭐ the renderer prints jinaFor's word, never the raw handle",
      handle.text.startsWith(`50pick: Habari ${FB},`) && !handle.text.includes("BigWinner") && folded.text.startsWith("50pick: Habari Zoe,"),
      `${JSON.stringify(handle.text.slice(0, 40))} · ${JSON.stringify(folded.text.slice(0, 40))}`);
  }

  /* ── §15.4 · exactly one placeholder, spelled exactly; a usable fallback when it is used ── */
  {
    const two = impl.scanPlaceholders("50pick {jina} na {jina}");
    const odd = impl.scanPlaceholders("50pick {name} {Jina} {name}");
    const loose = impl.scanPlaceholders("50pick { jina } leo");
    ok("§15.4 ⭐ scanPlaceholders counts EVERY {jina}, names every other token once, and counts stray braces",
      two.jina === 2 && odd.jina === 0 && odd.unknown.join(",") === "{name},{Jina}" && loose.jina === 0 && loose.stray === 2,
      JSON.stringify({ two, odd, loose }));
    const twice = v({ bodySw: "50pick: {jina}, karibu {jina}" });
    const named = v({ bodySw: "50pick: Habari {name}" });
    const cased = v({ bodySw: "50pick: Habari {Jina}" });
    const noFb = v({ nameFallbackSw: "" });
    const badFbs = ["Mpendwamtejaa", "Rafiki1", "{Rafiki}"].map((nameFallbackSw) => v({ nameFallbackSw }));
    const noJinaNoFb = v({ bodySw: "50pick: soka leo.", nameFallbackSw: "" });
    ok("§15.4 ⛔ validate refuses two {jina}, an unknown token (NAMED in the sentence), a missing or unusable fallback — and accepts no placeholder with no fallback",
      !twice.ok && has(twice.problems.bodySw, "once")
        && !named.ok && has(named.problems.bodySw, "{name}")
        && !cased.ok && has(cased.problems.bodySw, "{Jina}")
        && !noFb.ok && (noFb.problems.nameFallbackSw?.length ?? 0) > 0
        && badFbs.every((x) => !x.ok && (x.problems.nameFallbackSw?.length ?? 0) > 0)
        && noJinaNoFb.ok,
      JSON.stringify({ twice: twice.problems, named: named.problems, noFb: noFb.problems, bad: badFbs.map((x) => x.ok), noJinaNoFb: noJinaNoFb.problems }));
  }

  /* ── §15.5 · Swahili required, English optional and checked in full ── */
  {
    const enOnly = v({ bodySw: "", bodyEn: EN_BODY });
    const noEn = v({ bodyEn: "" });
    const enNoId = v({ bodyEn: "Hello friend, football today." });
    ok("§15.5 ⛔ Swahili is REQUIRED — an empty bodySw with a valid bodyEn is refused on bodySw, and only there",
      !enOnly.ok && (enOnly.problems.bodySw?.length ?? 0) > 0 && enOnly.problems.bodyEn === undefined, JSON.stringify(enOnly.problems));
    ok("§15.5 an empty bodyEn is fine, and its counter is null — everyone gets Swahili", noEn.ok && noEn.counters.EN === null);
    ok("§15.5 ⛔ a bodyEn that does not begin with 50pick is refused on bodyEn",
      !enNoId.ok && has(enNoId.problems.bodyEn, SENDER_IDENTITY) && enNoId.counters.EN !== null, JSON.stringify(enNoId.problems));
  }

  /* ── §15.6 · the counter is the WHOLE message ── */
  {
    const t6 = tpl({ nameFallbackSw: worstCaseJina(), sourcePhrase: PHRASE });
    const c6 = impl.counterFor(t6.bodySw, "SW", t6.nameFallbackSw, t6.sourcePhrase);
    const r6 = impl.renderForRecipient(t6, { variant: "SW", name: null, token: TT, origin: "book" });
    const t6a = tpl({ bodyEn: EN_BODY });
    const c6a = impl.counterFor(t6a.bodyEn, "EN", t6a.nameFallbackEn, "");
    const r6a = impl.renderForRecipient(t6a, { variant: "EN", name: worstCaseJina(), token: TT, origin: "account" });
    ok("§15.6 ⭐ THE COUNTER IS THE WHOLE MESSAGE — its units are the rendered worst case's, source phrase and footer included",
      c6.units === sizeSms(r6.text).units && c6a.units === sizeSms(r6a.text).units
        && c6.units === c6.bodyUnits + c6.sourceUnits + c6.footerUnits,
      `book ${c6.units} vs ${sizeSms(r6.text).units} · account ${c6a.units} vs ${sizeSms(r6a.text).units} · parts ${c6.bodyUnits}+${c6.sourceUnits}+${c6.footerUnits}`);
    ok("§15.6 left is budget − bodyUnits, and the footer is 49 septets in GSM-7, in both languages",
      c6.left === c6.budget - c6.bodyUnits && c6.footerUnits === 49 && c6.encoding === "GSM7" && c6a.footerUnits === 49,
      `left ${c6.left} budget ${c6.budget} body ${c6.bodyUnits} footer ${c6.footerUnits}/${c6a.footerUnits}`);
  }

  /* ── §15.7 · UCS-2 is a refusal, and the offender is NAMED ── */
  {
    const body7 = `50pick: leo ni siku ya soka${RSQ15} karibu`;
    const c7 = impl.counterFor(body7, "SW", FB, "");
    ok("§15.7 ⭐ UCS-2 is a REFUSAL with a NAMED, foldable offender — the curly apostrophe",
      !c7.ok && c7.encoding === "UCS2" && c7.offenders.length === 1 && c7.offenders[0].ch === RSQ15
        && c7.offenders[0].foldable && c7.offenders[0].label.includes("curly apostrophe"),
      JSON.stringify(c7.offenders));
    const inv = impl.describeOffenders(`a${NBSP15}b${ZWSP15}c`);
    ok("§15.7 ⛔ an invisible character gets a code-point label, never a blank — the no-break and zero-width spaces",
      inv.length === 2 && inv.every((o) => o.label.trim().length > 0) && inv[0].label.includes("U+00A0") && inv[1].label.includes("U+200B"),
      JSON.stringify(inv.map((o) => o.label)));
    const folded7 = impl.counterFor(foldToGsm7(body7), "SW", FB, "");
    ok("§15.7 after foldToGsm7 the same body composes ok, in GSM-7", folded7.ok && folded7.encoding === "GSM7", folded7.problems.join(" | "));
    const cjk = impl.describeOffenders(cc(0x6F22));
    ok("§15.7 a CJK character is named by its code point but NOT foldable — the screen offers no Replace for it",
      cjk.length === 1 && !cjk[0].foldable && cjk[0].label.includes("U+6F22"), JSON.stringify(cjk));
  }

  /* ── §15.8 · who gets English (OD42) ── */
  {
    const withEn = { bodyEn: "50pick: Hello" };
    ok("§15.8 ⭐ English goes ONLY to an EN account, and only when an English body exists",
      impl.variantFor(withEn, "EN") === "EN" && impl.variantFor({ bodyEn: "   " }, "EN") === "SW");
    const others: Array<"ZH" | "SW" | null | undefined> = ["ZH", "SW", null, undefined];
    ok("§15.8 ⛔ ZH, SW, null and undefined all get Swahili", others.every((l) => impl.variantFor(withEn, l) === "SW"),
      others.map((l) => impl.variantFor(withEn, l)).join(","));
    const enBlank = impl.renderForRecipient(tpl({ bodyEn: "" }), { variant: "EN", name: null, token: TT, origin: "account" });
    ok("§15.8 an EN recipient of a campaign with no English body is sent the SWAHILI message, fallback and footer",
      enBlank.ok && enBlank.text.startsWith(`50pick: Habari ${FB},`) && enBlank.text.endsWith(marketingFooter(TT, "SW")),
      JSON.stringify(enBlank.text));
  }

  /* ── §15.9 · M5 · the source phrase: priced in, never dropped ── */
  {
    const at9 = fillTo(HEAD, operatorBudget("SW"));
    const no9 = impl.counterFor(at9, "SW", FB, "");
    const with9 = impl.counterFor(at9, "SW", FB, PHRASE);
    ok("§15.9 ⭐ M5 · the counter PRICES the source phrase — the body at budget without it is over the cap with it",
      no9.ok && no9.sourceUnits === 0 && !with9.ok && with9.segments === 2
        && with9.sourceUnits === unitsIn(` ${PHRASE}`, "GSM7") && with9.budget === operatorBudget("SW", PHRASE),
      `without ok=${no9.ok} · with ok=${with9.ok} segments=${with9.segments} source=${with9.sourceUnits} budget=${with9.budget}`);
    const t9 = tpl({ sourcePhrase: PHRASE });
    const book9 = impl.renderForRecipient(t9, { variant: "SW", name: null, token: TT, origin: "book" });
    ok("§15.9 ⭐ a book contact's message CARRIES the phrase, just before the footer, and still begins with the officer's 50pick",
      book9.ok && book9.text.startsWith(`${SENDER_IDENTITY}:`) && book9.text.endsWith(` ${PHRASE}${marketingFooter(TT, "SW")}`),
      `${JSON.stringify(book9.text)} · ${book9.problems.join(" | ")}`);
    const acct9 = impl.renderForRecipient(t9, { variant: "SW", name: "Asha", token: TT, origin: "account" });
    const odd9 = impl.renderForRecipient(t9, { variant: "SW", name: null, token: TT, origin: "imported" as unknown as RecipientOrigin });
    ok('§15.9 ⛔ only exactly origin "account" goes without the phrase — an unknown origin carries it (never dropped)',
      acct9.ok && !acct9.text.includes(PHRASE) && odd9.text.includes(PHRASE), `${JSON.stringify(acct9.text)} · ${JSON.stringify(odd9.text)}`);
  }

  /* ── §15.10 · a recycled number never prints the previous holder's name ── */
  {
    const rec = impl.renderForRecipient(tpl(), { variant: "SW", name: "Asha", token: TT, origin: "book" });
    ok("§15.10 ⛔ a BOOK contact is greeted by the fallback even when a name is handed in",
      rec.text.startsWith(`50pick: Habari ${FB},`) && !rec.text.includes("Asha"), JSON.stringify(rec.text));
    ok("§15.10 firstNameFor reads only the player's own account name — its usable first word, or null",
      impl.firstNameFor({ userDisplayName: "  Asha Mwakalinga " }) === "Asha" && impl.firstNameFor({ userDisplayName: null }) === null
        && impl.firstNameFor({ userDisplayName: "Ali99" }) === null && impl.firstNameFor({ userDisplayName: "Kristoffersen" }) === null,
      String(impl.firstNameFor({ userDisplayName: "  Asha Mwakalinga " })));
  }

  /* ── §15.11 · the source line's own rules · §15.12 · the campaign's name ── */
  {
    const brace = v({}, "Source {jina}");
    const twoLine = v({}, `Source${NL15}list`);
    const fine = v({}, PHRASE);
    ok("§15.11 ⛔ the source line is refused with a brace or a line break — and a plain one is accepted",
      !brace.ok && (brace.problems.sourcePhrase?.length ?? 0) > 0 && !twoLine.ok && (twoLine.problems.sourcePhrase?.length ?? 0) > 0 && fine.ok,
      JSON.stringify({ brace: brace.problems, twoLine: twoLine.problems, fine: fine.problems }));
    ok(`§15.12 the campaign name is required and at most ${CAMPAIGN_NAME_MAX_CHARS} characters`,
      !v({ name: "  " }).ok && v({ name: "  " }).problems.name !== undefined
        && !v({ name: "n".repeat(CAMPAIGN_NAME_MAX_CHARS + 1) }).ok && v({ name: "n".repeat(CAMPAIGN_NAME_MAX_CHARS) }).ok);
  }

  return failed;
}

/* ── §16 · the sources: the `src/` population, client-graph-safe's PINNED list, the template ── */

/** `population` = every `src/` file walked; `files` = the ones that name composeMarketing, decommented. */
type ComposerSources = { population: number; files: ReadonlyMap<string, string>; pinned: string; template: string };
const TEMPLATE_REL = "src/lib/marketing/campaign-template.ts";
const FOOTER_REL = "src/lib/marketing/footer.ts";
const TEMPLATE_PIN = '"lib/marketing/campaign-template.ts"';

function loadComposerSources(): ComposerSources {
  const all = srcFiles();
  const files = new Map<string, string>();
  // ⭐ Decommenting can only REMOVE text, so a file whose raw text never names composeMarketing cannot name it once
  // decommented: only the files that do are decommented and scanned, while the population is still all of `src/`.
  for (const rel of all) {
    const raw = readFileSync(join(REPO_ROOT, rel), "utf8");
    if (raw.includes("composeMarketing")) files.set(rel, decomment(raw).replace(/\r\n/g, NL15));
  }
  const cgs = decomment(readFileSync(join(REPO_ROOT, "scripts/client-graph-safe.test.mjs"), "utf8"));
  const at = cgs.indexOf("const PINNED = [");
  const end = at < 0 ? -1 : cgs.indexOf("];", at);
  return { population: all.length, files, pinned: at < 0 || end < 0 ? "" : cgs.slice(at, end + 2), template: files.get(TEMPLATE_REL) ?? "" };
}

function checkOneComposer(src: ComposerSources, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  log("\n§16 · ONE COMPOSER — campaign-template.ts is the only door to composeMarketing");
  {
    const naming: string[] = [];
    const calling: string[] = [];
    for (const [rel, text] of src.files) {
      if (!/\bcomposeMarketing\b/.test(text)) continue;
      naming.push(rel);
      for (const m of text.matchAll(/\bcomposeMarketing\s*\(/g)) {
        const at = m.index ?? 0;
        if (/function\s+$/.test(text.slice(Math.max(0, at - 12), at))) continue; // its definition, in footer.ts
        calling.push(rel);
        break;
      }
    }
    log(`       walked ${src.population} src files · ${src.files.size} name composeMarketing: ${naming.join(", ")}`);
    ok("§16.1 control · the src population is real, and the scan can see a caller and the definition",
      src.population > 500 && calling.includes(TEMPLATE_REL) && naming.includes(FOOTER_REL), `${src.population} files · callers ${calling.join(", ")}`);
    ok("§16.1 ⛔ composeMarketing( is called in src/ ONLY from campaign-template.ts, and named nowhere else but its definition",
      calling.length === 1 && calling[0] === TEMPLATE_REL && naming.every((f) => f === TEMPLATE_REL || f === FOOTER_REL),
      `callers: ${calling.join(", ")} · named in: ${naming.join(", ")}`);
  }
  {
    const imports = [...src.template.matchAll(/^\s*import\s+(?:[^;]*?\s+from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
    // ⭐ The transitive walk is client-graph-safe's job (the pin below); this is the first hop, read here so a
    // server import is caught by THIS suite in the same run that adds it.
    const clientSafe = (spec: string) => spec.startsWith("@/lib/") && !spec.startsWith("@/lib/server/") && !spec.includes("server-only");
    ok("§16.6 ⛔ campaign-template.ts imports no server module — only @/lib modules outside lib/server",
      imports.length > 0 && imports.every(clientSafe), imports.join(", "));
    ok("§16.6 ⭐ campaign-template.ts is in client-graph-safe's PINNED list — the composer client imports it",
      src.pinned.includes('"lib/marketing/footer.ts"') && src.pinned.includes(TEMPLATE_PIN),
      src.pinned.length === 0 ? "the PINNED list was not found" : "not pinned");
  }
  return failed;
}

const COMPOSER_SOURCES = loadComposerSources();

/* ══ THE RUN ════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  const failed = [
    ...check(sizeSms, (l) => console.log(l)),
    ...checkEnvelope((body, token) => composeMarketing(body, token), (l) => console.log(l)),
    ...checkFold(foldToGsm7, (l) => console.log(l)),
    ...checkTemplate(REAL_TEMPLATE, (l) => console.log(l)),
    ...checkOneComposer(COMPOSER_SOURCES, (l) => console.log(l)),
  ];
  console.log(`\nCAMPAIGN COMPOSE — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  let pass = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) { pass++; console.log(`  ok   ${label}`); }
    else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  console.log("RED CONTROL — the real defects, planted in memory\n");

  const baseline = [
    ...check(sizeSms, quiet), ...checkEnvelope((body, token) => composeMarketing(body, token), quiet), ...checkFold(foldToGsm7, quiet),
    ...checkTemplate(REAL_TEMPLATE, quiet), ...checkOneComposer(COMPOSER_SOURCES, quiet),
  ];
  ok("§0 baseline · the shipped module passes every assertion before anything is planted",
    baseline.length === 0, baseline.join("; "));

  /** The naive sizer everyone writes: length, and division. */
  const naiveLength: Sizer = (text) => {
    const s = sizeSms(text);
    return { ...s, units: text.length, segments: Math.max(1, Math.ceil(text.length / s.perSegment)) };
  };
  const naiveDivide: Sizer = (text) => {
    const s = sizeSms(text);
    const limits = SMS_LIMITS[s.encoding];
    const segments = s.units <= limits.single ? 1 : Math.ceil(s.units / limits.concatenated);
    return { ...s, segments };
  };

  type Plant = { name: string; expect: RegExp; sizer: Sizer; landed: () => boolean; landedAs: string };
  const plants: Plant[] = [
    {
      name: "① priced from String.length — an extension character counted as one septet",
      expect: /^§3 ⭐ 80 euro signs are 80 characters and 160 septets/,
      sizer: naiveLength,
      landed: () => naiveLength("€".repeat(80)).units === 80,
      landedAs: `naive units for 80 euro signs = ${naiveLength("€".repeat(80)).units}, not 160`,
    },
    {
      // ⛔ THE PLANT I FIRST WROTE HERE WAS AIMED AT NOTHING, and this control is what caught it. It
      // assumed `String.length` under-counts an emoji. It does not — `.length` IS the UTF-16 unit
      // count, so the naive sizer and the correct one AGREE on every emoji body. The realistic bug
      // is the opposite "fix": someone reaches for `[...text].length` to count characters properly
      // and thereby under-counts UCS-2 by half.
      name: "① a sizer that counts CODE POINTS for UCS-2 — the plausible over-correction",
      expect: /^§3 ⭐ an emoji is one code point and TWO UTF-16 units/,
      sizer: (text) => {
        const s = sizeSms(text);
        if (s.encoding !== "UCS2") return s;
        const units = [...text].length;
        return { ...s, units, segments: units <= SMS_LIMITS.UCS2.single ? 1 : Math.ceil(units / SMS_LIMITS.UCS2.concatenated) };
      },
      landed: () => [..."😀".repeat(35)].length === 35 && "😀".repeat(35).length === 70,
      landedAs: "35 emoji are 35 code points and 70 UTF-16 units; counting code points halves the bill",
    },
    {
      name: "② segments DIVIDED rather than packed — the 306-septet vector",
      expect: /^§4b ⛔ …and which actually sends as 3/,
      sizer: naiveDivide,
      landed: () => naiveDivide("a".repeat(152) + "€".repeat(77)).segments === 2,
      landedAs: "division prices the 306-septet body as 2 segments; it sends as 3",
    },
    {
      name: "③ a second GSM-7 table that dropped the euro sign",
      expect: /^§5 ⭐ smsCodingFor === sizeSms\(\)\.encoding/,
      sizer: (text) => {
        const s = sizeSms(text);
        return text.includes("€") ? { ...s, encoding: "UCS2" } : s;
      },
      landed: () => smsCodingFor("€100 bonus") === "GSM7",
      landedAs: "the gateway calls €100 GSM-7, so an officer table that calls it UCS-2 disagrees with the wire",
    },
    {
      name: "control · a sizer that says one segment for everything",
      expect: /^§4 161 — the first that does not/,
      sizer: (text) => ({ ...sizeSms(text), segments: 1 }),
      landed: () => true,
      landedAs: "an always-one sizer needs no proof of landing",
    },
    {
      name: "control · a sizer that says GSM-7 for everything",
      expect: /^§3 …so 35 emoji fill a single UCS-2 segment exactly/,
      sizer: (text) => ({ ...sizeSms(text), encoding: "GSM7" }),
      landed: () => true,
      landedAs: "an always-GSM-7 sizer needs no proof of landing",
    },
  ];

  for (const p of plants) {
    ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
    const failures = check(p.sizer, quiet);
    const matched = failures.filter((f) => p.expect.test(f));
    ok(`  └─ fires: ${p.expect.source.slice(0, 56)}`, matched.length > 0,
      failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }

  /* ── U4's plants: the envelope ─────────────────────────────────────────── */
  const REAL: Composer = (body, token) => composeMarketing(body, token);
  type EnvPlant = { name: string; expect: RegExp; compose: Composer; landed: () => boolean; landedAs: string };
  const envPlants: EnvPlant[] = [
    {
      // ⭐ THE DEFECT THIS WHOLE UNIT EXISTS TO PREVENT. Size the body, send body + footer, and every
      // quote is short by 49 septets — a 140-character body reads as one message and sends as two.
      name: "the composer sizes the BODY and the engine sends body + footer",
      expect: /^§11 ⭐ the size is taken of the WHOLE message, not the body/,
      compose: (body, token) => ({ ...REAL(body, token), size: sizeSms(body) }),
      landed: () => sizeSms("50pick " + "a".repeat(140)).segments === 1 && REAL("50pick " + "a".repeat(140), "a1b2c3d4").size.segments === 2,
      landedAs: "a 147-character body is one segment alone and two with the footer — 49 septets of difference",
    },
    {
      name: "the identity check dropped — ETA s.32(1)(b) unenforced",
      expect: /^§11 a body that does not begin with the sender identity is refused/,
      compose: (body, token) => {
        const c = REAL(body, token);
        return { ...c, problems: c.problems.filter((p) => !p.includes("must begin")), ok: c.problems.filter((p) => !p.includes("must begin")).length === 0 };
      },
      landed: () => REAL("Soka leo", "a1b2c3d4").problems.some((p) => p.includes("must begin")),
      landedAs: "the real composer refuses a body that does not begin with the sender identity",
    },
    {
      name: "the footer made optional — an opt-out that is not in the message",
      expect: /^§11 ⭐ and the composed text ENDS with the footer/,
      compose: (body, token) => ({ ...REAL(body, token), text: body }),
      landed: () => true,
      landedAs: "a composer that can emit a body with no footer is one an officer can send without one",
    },
    {
      name: "the opt-out token unchecked — a lawful-looking message with a dead link",
      expect: /^§11 ⭐ a missing or wrong-length opt-out token is refused/,
      compose: (body, token) => {
        const c = REAL(body, token);
        const problems = c.problems.filter((p) => !p.includes("opt-out link"));
        return { ...c, problems, ok: problems.length === 0 };
      },
      landed: () => REAL("50pick: habari", "").problems.some((p) => p.includes("opt-out link")),
      landedAs: "the real composer refuses an empty token",
    },
    {
      // 🔴 The pre-2026-09-26 shape: the composer allowed what `withinCap` allowed (2), or the reverse.
      name: "the composer keeps its OWN cap of 2 — the two truths the plan and the composer used to be",
      expect: /^§13 ⛔ the composer and the plan agree on the cap/,
      compose: (body, token) => {
        const c = REAL(body, token);
        if (c.size.segments !== 2) return c;
        const problems = c.problems.filter((p) => !p.includes("messages, and the limit is"));
        return { ...c, problems, ok: problems.length === 0 };
      },
      landed: () => REAL("50pick " + "a".repeat(operatorBudget("SW") - 6), "a1b2c3d4").problems.some((p) => p.includes("the limit is")),
      landedAs: "the real composer refuses a two-segment message on the cap",
    },
    {
      name: "the budget quoted in GSM-7 whatever the encoding — 111 for a UCS-2 message",
      expect: /^§13 ⭐ a short body with one ’ is two messages/,
      compose: (body, token) => {
        const c = REAL(body, token);
        const real = operatorBudget("SW", "", c.size.encoding);
        return { ...c, budget: operatorBudget("SW"), problems: c.problems.map((p) => p.replace(`you have ${real} characters`, `you have ${operatorBudget("SW")} characters`)) };
      },
      landed: () => operatorBudget("SW") !== operatorBudget("SW", "", "UCS2"),
      landedAs: "the GSM-7 and UCS-2 budgets differ, so quoting one for the other is a visible lie",
    },
  ];
  for (const p of envPlants) {
    ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
    const failures = checkEnvelope(p.compose, quiet);
    const matched = failures.filter((f) => p.expect.test(f));
    ok(`  └─ fires: ${p.expect.source.slice(0, 56)}`, matched.length > 0,
      failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }

  /* ── §12's plant: the Gaming Board Code's number back in the footer (OQ4) ── */
  // ⭐ The real published number and the real footer, with ONLY the helpline swapped — so the two §12
  // assertions are the ones that must fire, and nothing else about the footer is under test here.
  {
    const support = readFileSync(new URL("../src/lib/support-config.ts", import.meta.url), "utf8");
    const published = (support.match(/STATUTORY_HELPLINE\s*=\s*"([^"]+)"/) || [])[1] ?? "";
    const BOARD = "0800110051";
    const planted = (token: string, locale: "SW" | "EN") => marketingFooter(token, locale).replace(STATUTORY_SMS_HELPLINE, BOARD);
    ok("PLANT LANDED · the Board's 0800110051 back in the footer in place of the published helpline",
      planted("a1b2c3d4", "SW").includes(BOARD) && planted("a1b2c3d4", "EN").includes(BOARD) && !planted("a1b2c3d4", "SW").includes(STATUTORY_SMS_HELPLINE),
      JSON.stringify(planted("a1b2c3d4", "SW")));
    const failures: string[] = [];
    checkHelpline(published, BOARD, planted, (label, cond) => { if (!cond) failures.push(label); });
    for (const expect of [/^§12 ⭐ the marketing footer's helpline IS the published one/, /^§12 …and the Gaming Board Code's 0800110051 appears nowhere/]) {
      ok(`  └─ fires: ${expect.source.slice(0, 56)}`, failures.some((f) => expect.test(f)),
        failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.join(" | ")}`);
    }
    const control: string[] = [];
    checkHelpline(published, STATUTORY_SMS_HELPLINE, marketingFooter, (label, cond) => { if (!cond) control.push(label); });
    ok("  └─ control: the same two assertions pass on the shipped footer", control.length === 0, control.join(" | "));
  }

  /* ── §14's plants: the fold (the Vodacom plan S2) ──────────────────────── */
  {
    /** The fold applied one character at a time, with ONE character's treatment replaced. */
    const except = (target: string, treat: (c: string) => string): Fold => (t) => {
      let out = "";
      for (const c of t) out += c === target ? treat(c) : foldToGsm7(c);
      return out;
    };
    type FoldPlant = { name: string; expect: RegExp; fold: Fold; landed: () => boolean; landedAs: string };
    const foldPlants: FoldPlant[] = [
      {
        name: "a fold table that lost the em dash",
        expect: /^§14 every dash/,
        fold: except(FOLD_EM_DASH, (c) => c),
        landed: () => except(FOLD_EM_DASH, (c) => c)(`1${FOLD_EM_DASH}2`) === `1${FOLD_EM_DASH}2`,
        landedAs: "the em dash survives, so a pasted title stays UCS-2",
      },
      {
        name: "a fold that strips the accent from a letter GSM-7 already has (e-acute to e)",
        expect: /^§14 a letter ALREADY in GSM-7 is kept/,
        fold: except(FOLD_E_ACUTE, () => "e"),
        landed: () => except(FOLD_E_ACUTE, () => "e")(FOLD_E_ACUTE) === "e",
        landedAs: "a Swahili or French name loses a letter the SMS could have carried",
      },
      {
        name: "a fold that INVENTS a twin — ? for anything it cannot map",
        expect: /^§14 a CJK character is left as it is/,
        fold: (t) => [...foldToGsm7(t)].map((c) => (encodingFor(c) === "GSM7" ? c : "?")).join(""),
        landed: () => [...foldToGsm7(FOLD_CJK)].map((c) => (encodingFor(c) === "GSM7" ? c : "?")).join("") === "??",
        landedAs: "a Chinese title becomes question marks and reports GSM-7",
      },
      {
        name: "a fold that keeps the zero-width space",
        expect: /^§14 zero-width characters are removed/,
        fold: except(FOLD_ZERO_WIDTH[0], (c) => c),
        landed: () => except(FOLD_ZERO_WIDTH[0], (c) => c)(`a${FOLD_ZERO_WIDTH[0]}b`).length === 3,
        landedAs: "an invisible character survives and forces UCS-2",
      },
      {
        name: "control · a fold that does nothing",
        expect: /^§14 curly quotes fold to straight ones/,
        fold: (t) => t,
        landed: () => true,
        landedAs: "an identity fold needs no proof of landing",
      },
    ];
    for (const p of foldPlants) {
      ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
      const failures = checkFold(p.fold, quiet);
      const matched = failures.filter((f) => p.expect.test(f));
      ok(`  └─ fires: ${p.expect.source.slice(0, 56)}`, matched.length > 0,
        failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
    }
  }

  /* ── §15's plants: the renderer and the worst-case counter (U37a) ───────── */
  {
    const atB = fillTo(HEAD, operatorBudget("SW"));
    const book = (name: string | null = null) => ({ variant: "SW" as CampaignVariant, name, token: TT, origin: "book" as RecipientOrigin });
    const acct = (name: string | null) => ({ variant: "SW" as CampaignVariant, name, token: TT, origin: "account" as RecipientOrigin });

    /** P1 · the body sized BEFORE the footer and the phrase are appended (the U4 defect, one layer up). */
    const bodyFirst: typeof counterFor = (body, variant, fallback, phrase) => {
      const s = sizeSms(renderBody(body, worstCaseJina()).trim());
      return { ...counterFor(body, variant, fallback, phrase), units: s.units, segments: s.segments };
    };
    /** P2 · the template sized AS TYPED — `{jina}` counted as its own 8 septets. */
    const asTyped: typeof counterFor = (body, variant, fallback, phrase) => {
      const real = counterFor(body, variant, fallback, phrase);
      const c = composeMarketing(body, footerMeasurementToken(), variant, phrase);
      const bodyUnits = unitsIn((body ?? "").trim(), c.size.encoding);
      return {
        ...real, units: c.size.units, segments: c.size.segments, encoding: c.size.encoding, bodyUnits, left: c.budget - bodyUnits,
        problems: c.problems, ok: c.ok && real.fallbackProblems.length === 0,
      };
    };
    /** P3 · the handle inserted raw — no fold, no first word, no letters rule, no length rule. */
    const rawName: typeof renderForRecipient = (t, r) => {
      const english = r.variant === "EN" && t.bodyEn.trim().length > 0;
      const variant: CampaignVariant = english ? "EN" : "SW";
      const fallback = english ? t.nameFallbackEn : t.nameFallbackSw;
      return composeMarketing(renderBody(english ? t.bodyEn : t.bodySw, r.name ?? fallback), r.token, variant, r.origin === "account" ? "" : t.sourcePhrase);
    };
    /** P4 · a long name CUT to 12 instead of replaced by the fallback. */
    const truncating: typeof jinaFor = (raw, fallback) => {
      const first = typeof raw === "string" ? (foldToGsm7(raw).trim().split(/\s+/)[0] ?? "") : "";
      return first.length > JINA_MAX_CHARS ? first.slice(0, JINA_MAX_CHARS) : jinaFor(raw, fallback);
    };
    /** P5 · Swahili made optional: an English-only draft accepted. */
    const swOptional: typeof validateCampaignTemplate = (f, phrase) => {
      const real = validateCampaignTemplate(f, phrase);
      if (f.bodySw.trim().length > 0 || f.bodyEn.trim().length === 0) return real;
      const { bodySw: _sw, nameFallbackSw: _fb, ...rest } = real.problems;
      return { ...real, problems: rest, ok: Object.keys(rest).length === 0 };
    };
    /** P6 · a scanner that sees one {jina} at most and no unknown token. */
    const lenientScan: typeof scanPlaceholders = (body) => ({ jina: Math.min(1, scanPlaceholders(body).jina), unknown: [], stray: 0 });
    /** P7 · the raw character as its own label — a blank for a no-break space. */
    const bareLabel: typeof describeOffenders = (text) => describeOffenders(text).map((o) => ({ ...o, label: o.ch }));
    /** OD42 · English for every non-Swahili account (a Chinese-language player gets the English body). */
    const zhEnglish: typeof variantFor = (t, locale) => (locale === "SW" ? "SW" : variantFor(t, "EN"));
    /** OD42 · an EN recipient of a Swahili-only campaign rendered from the blank English body. */
    const enFromBlank: typeof renderForRecipient = (t, r) => (r.variant === "EN"
      ? composeMarketing(renderBody(t.bodyEn, jinaFor(r.name, t.nameFallbackEn)), r.token, "EN", r.origin === "account" ? "" : t.sourcePhrase)
      : renderForRecipient(t, r));
    /** M5 · the counter forgets the phrase. */
    const counterNoPhrase: typeof counterFor = (body, variant, fallback) => counterFor(body, variant, fallback, "");
    /** M5 · the renderer forgets the phrase. */
    const renderNoPhrase: typeof renderForRecipient = (t, r) => renderForRecipient({ ...t, sourcePhrase: "" }, r);
    /** M5 · the phrase put FIRST — `composeMarketing`'s placement before U37a — so the message no longer begins with 50pick. */
    const phraseFirst: typeof renderForRecipient = (t, r) => {
      const bare = renderForRecipient({ ...t, sourcePhrase: "" }, r);
      const phrase = r.origin === "account" ? "" : t.sourcePhrase.trim();
      if (!phrase) return bare;
      const text = `${phrase} ${bare.text}`;
      const problems = text.startsWith(SENDER_IDENTITY) ? bare.problems : [...bare.problems, "The message must begin with 50pick."];
      return { ...bare, text, size: sizeSms(text), problems, ok: problems.length === 0 };
    };
    /** The recycled number · a book contact greeted by the name a caller handed in. */
    const bookName: typeof renderForRecipient = (t, r) => renderForRecipient(t, { ...r, origin: "account" });
    /** firstNameFor returning the whole handle. */
    const wholeHandle: typeof firstNameFor = (src) => (src?.userDisplayName ?? "").trim() || null;
    /** The source line's own rules dropped. */
    const phraseUnchecked: typeof validateCampaignTemplate = (f, phrase) => {
      const real = validateCampaignTemplate(f, phrase);
      const { sourcePhrase: _p, ...rest } = real.problems;
      return { ...real, problems: rest, ok: Object.keys(rest).length === 0 };
    };
    /** The campaign's name unchecked. */
    const nameUnchecked: typeof validateCampaignTemplate = (f, phrase) => {
      const real = validateCampaignTemplate(f, phrase);
      const { name: _n, ...rest } = real.problems;
      return { ...real, problems: rest, ok: Object.keys(rest).length === 0 };
    };

    const R = REAL_TEMPLATE;
    type TemplatePlant = { name: string; expect: RegExp[]; impl: TemplateImpl; landed: () => boolean; landedAs: string };
    const templatePlants: TemplatePlant[] = [
      {
        name: "P1 · the counter sizes the body BEFORE the footer is appended",
        expect: [/^§15\.6 ⭐/],
        impl: { ...R, counterFor: bodyFirst },
        landed: () => bodyFirst(atB, "SW", FB, "").units === counterFor(atB, "SW", FB, "").units - 49,
        landedAs: "the at-budget body reads 111 units alone and 160 as sent — the footer's 49 missing",
      },
      {
        name: "P2 · the counter sizes {jina} as typed (8 septets), not the longest name (12)",
        expect: [/^§15\.1 ⭐/, /^§15\.1 ⛔/, /^§15\.2 ⭐/],
        impl: { ...R, counterFor: asTyped },
        landed: () => counterFor(atB, "SW", FB, "").units - asTyped(atB, "SW", FB, "").units === JINA_MAX_CHARS - unitsIn(JINA, "GSM7"),
        landedAs: "the typed placeholder is 4 septets short of the reserve",
      },
      {
        name: "P3 · the renderer inserts the raw displayName — no jinaFor",
        expect: [/^§15\.2 ⭐/, /^§15\.3 ⭐ the renderer/],
        impl: { ...R, renderForRecipient: rawName },
        landed: () => rawName(tpl(), acct("BigWinner_1")).text.includes("BigWinner_1"),
        landedAs: "a handle with an underscore is printed under the sender ID",
      },
      {
        name: "P4 · jinaFor cuts a long name to 12 instead of falling back",
        expect: [/^§15\.3 ⛔ a 13-letter/],
        impl: { ...R, jinaFor: truncating },
        landed: () => truncating("Kristoffersen", FB) === "Kristofferse",
        landedAs: "Kristoffersen becomes Kristofferse — somebody else's name",
      },
      {
        name: "P5 · Swahili treated as optional — an English-only campaign accepted",
        expect: [/^§15\.5 ⛔ Swahili/],
        impl: { ...R, validate: swOptional },
        landed: () => !validateCampaignTemplate(draft({ bodySw: "", bodyEn: EN_BODY }), "").ok && swOptional(draft({ bodySw: "", bodyEn: EN_BODY }), "").ok,
        landedAs: "the real verdict refuses the English-only draft; the plant accepts it",
      },
      {
        name: "P6 · scanPlaceholders accepts a second {jina} and every unknown token",
        expect: [/^§15\.4 ⭐/],
        impl: { ...R, scanPlaceholders: lenientScan },
        landed: () => scanPlaceholders("50pick {jina} {jina}").jina === 2 && lenientScan("50pick {jina} {jina} {name}").jina === 1,
        landedAs: "two placeholders read as one, and {name} as nothing",
      },
      {
        name: "P7 · describeOffenders labels a character with itself — a blank for a no-break space",
        expect: [/^§15\.7 ⛔/],
        impl: { ...R, describeOffenders: bareLabel },
        landed: () => (bareLabel(NBSP15)[0]?.label ?? "x").trim() === "",
        landedAs: "the no-break space's label is a space",
      },
      {
        name: "OD42 · a Chinese-language account gets the English body",
        expect: [/^§15\.8 ⛔/],
        impl: { ...R, variantFor: zhEnglish },
        landed: () => variantFor({ bodyEn: "50pick: Hello" }, "ZH") === "SW" && zhEnglish({ bodyEn: "50pick: Hello" }, "ZH") === "EN",
        landedAs: "ZH reads as EN",
      },
      {
        name: "OD42 · an EN recipient of a Swahili-only campaign is rendered from the blank English body",
        expect: [/^§15\.8 an EN recipient/],
        impl: { ...R, renderForRecipient: enFromBlank },
        landed: () => !enFromBlank(tpl({ bodyEn: "" }), { ...acct(null), variant: "EN" }).ok,
        landedAs: "the blank English body composes as an empty, refused message",
      },
      {
        name: "M5 · the counter drops the source phrase",
        expect: [/^§15\.9 ⭐ M5/],
        impl: { ...R, counterFor: counterNoPhrase },
        landed: () => !counterFor(atB, "SW", FB, PHRASE).ok && counterNoPhrase(atB, "SW", FB, PHRASE).ok,
        landedAs: "the at-budget body is over the cap with the phrase and passes without it",
      },
      {
        name: "M5 · the renderer drops the source phrase for a book contact",
        expect: [/^§15\.9 ⭐ a book/],
        impl: { ...R, renderForRecipient: renderNoPhrase },
        landed: () => !renderNoPhrase(tpl({ sourcePhrase: PHRASE }), book()).text.includes(PHRASE),
        landedAs: "a book contact's message goes out with no source",
      },
      {
        name: "M5 · the source phrase placed BEFORE the body (composeMarketing before U37a)",
        expect: [/^§15\.9 ⭐ a book/],
        impl: { ...R, renderForRecipient: phraseFirst },
        landed: () => phraseFirst(tpl({ sourcePhrase: PHRASE }), book()).text.startsWith(PHRASE),
        landedAs: "the message begins with the phrase, not with 50pick",
      },
      {
        name: "the recycled number · a book contact greeted by a stored name",
        expect: [/^§15\.10 ⛔/],
        impl: { ...R, renderForRecipient: bookName },
        landed: () => bookName(tpl(), book("Asha")).text.includes("Asha"),
        landedAs: "a book contact's stored name is printed",
      },
      {
        name: "firstNameFor returns the whole handle",
        expect: [/^§15\.10 firstNameFor/],
        impl: { ...R, firstNameFor: wholeHandle },
        landed: () => wholeHandle({ userDisplayName: "  Asha Mwakalinga " }) === "Asha Mwakalinga",
        landedAs: "the full handle, untrimmed of its second word, comes back",
      },
      {
        name: "the source line's rules dropped",
        expect: [/^§15\.11 ⛔/],
        impl: { ...R, validate: phraseUnchecked },
        landed: () => !validateCampaignTemplate(draft(), "Source {jina}").ok && phraseUnchecked(draft(), "Source {jina}").ok,
        landedAs: "a braced source line is accepted",
      },
      {
        name: "the campaign's name unchecked",
        expect: [/^§15\.12/],
        impl: { ...R, validate: nameUnchecked },
        landed: () => !validateCampaignTemplate(draft({ name: "" }), "").ok && nameUnchecked(draft({ name: "" }), "").ok,
        landedAs: "a nameless campaign is accepted",
      },
      {
        name: "control · a counter that says one message and ok for everything",
        expect: [/^§15\.1 ⛔/],
        impl: { ...R, counterFor: (b, v, f, p) => ({ ...counterFor(b, v, f, p), segments: 1, ok: true, problems: [] }) },
        landed: () => true,
        landedAs: "an always-ok counter needs no proof of landing",
      },
    ];
    for (const p of templatePlants) {
      ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
      const failures = checkTemplate(p.impl, quiet);
      for (const expect of p.expect) {
        ok(`  └─ fires: ${expect.source.slice(0, 56)}`, failures.some((f) => expect.test(f)),
          failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
      }
    }
  }

  /* ── §16's plants: one composer, a client-safe module ─────────────────── */
  {
    const S = COMPOSER_SOURCES;
    const extra = new Map(S.files);
    extra.set("src/__planted__/composes-on-its-own.ts", 'export const c = composeMarketing(body, token, "SW");');
    const unpinned = S.pinned.split(NL15).filter((l) => !l.includes(TEMPLATE_PIN)).join(NL15);
    type ComposerPlant = { name: string; expect: RegExp; sources: ComposerSources; landed: () => boolean; landedAs: string };
    const composerPlants: ComposerPlant[] = [
      {
        name: "P8 · the test send composes on its own — a second caller of composeMarketing(",
        expect: /^§16\.1 ⛔/,
        sources: { ...S, files: extra },
        landed: () => extra.size === S.files.size + 1,
        landedAs: "one in-memory source file calls composeMarketing directly",
      },
      {
        name: "campaign-template.ts imports a server module",
        expect: /^§16\.6 ⛔/,
        sources: { ...S, template: `import { db } from "@/lib/server/store";${NL15}${S.template}` },
        landed: () => S.template.length > 0 && !S.template.includes("@/lib/server/"),
        landedAs: "the store import is prepended to the real template source",
      },
      {
        name: "campaign-template.ts left out of client-graph-safe's PINNED list",
        expect: /^§16\.6 ⭐/,
        sources: { ...S, pinned: unpinned },
        landed: () => S.pinned.includes(TEMPLATE_PIN) && !unpinned.includes(TEMPLATE_PIN),
        landedAs: "the pin line is removed from the real list (red until the pin itself lands)",
      },
    ];
    for (const p of composerPlants) {
      ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
      const failures = checkOneComposer(p.sources, quiet);
      ok(`  └─ fires: ${p.expect.source.slice(0, 56)}`, failures.some((f) => p.expect.test(f)),
        failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
    }
  }

  // ⭐ A FINDING ABOUT THE GUARD ITSELF, NOT ABOUT THE CODE — and it is the reason §4b exists.
  // The boundary vectors this unit was SPECIFIED with (159/160/161, 305/306/307, 69/70/71,
  // 133/134/135) are all plain text, and on plain text packing and division give identical answers.
  // Shipping only those vectors would have produced a suite that looked thorough, passed, and could
  // never have caught the defect that costs the money.
  {
    const ROUND = [159, 160, 161, 305, 306, 307];
    const agreeEverywhere = ROUND.every((n) => naiveDivide("a".repeat(n)).segments === sizeSms("a".repeat(n)).segments);
    ok("⛔ the SPECIFIED round-number vectors cannot tell packing from division — they all agree", agreeEverywhere,
      "if this fails, one of them does discriminate and the note below is wrong");
    const onlyExtensionVectorFires = check(naiveDivide, quiet);
    ok("⭐ …and the ONLY assertion the division defect breaks is the extension-character one",
      onlyExtensionVectorFires.length === 1 && /^§4b/.test(onlyExtensionVectorFires[0]),
      `broke: ${onlyExtensionVectorFires.join(" | ")}`);
  }

  console.log(`\nRED CONTROL — ${fail === 0 ? `all ${pass} proofs held` : `${fail} of ${pass + fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
