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
 * of real and hostile names, prices the source phrase (DECISIONS M5 — reserving the longest one while it is blank),
 * refuses a number that is not the person's own while the campaign has no source line, re-runs the stored template's
 * WHOLE verdict for every recipient — one campaign, one verdict (§15.13) — and holds the name rules (folded, never cut,
 * a book contact never greeted by a stored name). §16 holds that nothing else in `src/` calls `composeMarketing`.
 *
 * ⭐ §16.2–§16.5 · §17 · §18 (U37b, 2026-10-02) · THE PAGE, THE SAVE AND THE TEST SEND. §16.2–§16.5 read the composer's own
 * files (`src/app/admin/campaigns/new/`): the screen sizes nothing itself, offers no sender control (OD45) and no number
 * control, and names no money (OD24); §17.6 holds the save to the campaign door's ONE draft writer (X12). §17 drives
 * `saveCampaignDraft` on the memory twin: the server re-validates and stores ITS OWN coding and segments (X15), an edit is a
 * compare-and-set on `draftRevision`, and an audience of one phone number is refused (OD55). §18 drives
 * `sendCampaignTest`: the officer's own number only, whatever else is posted; the ONE gate; the ONE live switch — with
 * `marketing.sms.live` absent a real carrier sends nothing (no token, no row, no transport call; X14); one token per
 * number; a masked audit row; never "handed over" unless the gateway took it; and the 40-name bound through the save and
 * the send.
 *
 * ⭐ §15.14–§15.16 · §16.7–§16.13 · §17.7–§17.11 (the validation audit, 2026-10-03) · THE COMPOSER'S FIELDS, VALIDATED AS
 * STORED. The `{jina}` fallback is judged trimmed (a phone keyboard's trailing space no longer blocks Save) and printed as
 * judged; a Unicode body gets ONE sentence naming what to replace and never a negative room; the name is cleaned by the
 * contact book's one cleaner, refused when it holds a phone number, and stored cleaned; a fallback is stored only while
 * its body uses `{jina}`; a masked viewer's posted search meets the campaign door's own rule (X25) on the save AND the
 * card, which offers to remove a refused address filter; a revision past INT4 is "stale", never thrown; the Save reason
 * takes the officer to the field; a refusal offers only the step that can work; the counter offers the fold when ANY
 * offender folds; and the words say what happened and what is next.
 * ⭐ §15.17–§15.18 · §16.14–§16.16 · §17.12 (the same audit's review round) · a name is refused for a phone number in the
 * ONE verdict — so the screen refuses it before Save — and ONLY for a Tanzanian mobile number (`parseTzNumber`), never a
 * date or a time, wherever in the name it sits; a draft confirmed since reloads only through the same confirmation, and
 * either refusal can keep the officer's text as a NEW draft, which carries the audience on screen (`carry`) or is not
 * offered — never the whole book by omission; the saved line invites a test only when the page can send one; and the
 * Audience card takes focus only while it shows a problem.
 * ⭐ §17.13–§17.16 (U37s, 2026-10-05) · THE SOURCE LINE IS STAMPED. A DRAFT save stamps the SAVED `source.phrase` wording
 * and the server's verdict prices exactly that line; blank (null) while nothing is saved, a line of spaces included; an
 * edit re-stamps — never a stale line — while a confirmed campaign keeps its own; and the composer's counter prices the
 * line the next save will stamp (a campaign past DRAFT, its frozen one).
 * ⭐ §16.15 · §18.33 (U13, 2026-10-07) · THE SEND WINDOW. Every test send and send loop here is handed a FIXED open window
 * (`scripts/lib/send-window.mts`, ENGINE-SPEC §5 rule 9), so the suite is green at any hour; §18.33 closes it on purpose:
 * the test is refused held in the window's own sentence before a token, a row or the wire (M12), and the saved line
 * invites no test while the window note stands (§16.15).
 * ⛔ §18.36 (U33r, 2026-10-07) · A PROMISED AGENT REFEREE. A typed test to a number an applicant gave as a referee is refused
 * by the ONE gate before a token or the wire — `typed_refused` to a masked viewer, the ONE `protected` reason to a reader
 * (the U33r review's MINOR-5: collapsed for readers too, as the split collapses it), the precise `agent_referee` ONLY in the
 * audit row — and an officer's own number that is a referee's is told it is protected, in the own-number words.
 * ⛔ §16.21–§16.22 · §18.37–§18.39 (the owner's ruling of 2026-10-09) · A TEST TO A TYPED NUMBER IS FOR THE OWNER AND
 * COMPLIANCE ONLY. The door decides by the officer's STORED role through ONE decider (`mayTestTypedNumber`): GROWTH and
 * every other role is refused `typed_role` in ONE sentence — in the console's own labels for the two roles — before
 * anything about the number is read: never parsed, masked or set beside their own, nothing reaching the rail, the gate, a
 * token or the wire — while the Owner (the `ADMIN` role) and Compliance are taken as before (§18.37, and §18.38 reads the
 * order in the source); the loader asks the same decider of the same stored row and hands a viewer who may not type the
 * empty typed view (§18.39); and the card offers the choice only to them, saying "My own number" alone to anyone else, its
 * reason in the one tone it has beside the radio (§16.21, §16.22). ⭐ So the typed claims above run as an officer who may
 * type: `o` is the Owner, and §18.23's and §18.33's officers are the Owner or Compliance.
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
  SENDER_IDENTITY, statutorySmsHelpline,
  type MarketingCompose,
} from "../src/lib/marketing/footer.ts";
import {
  JINA, JINA_MAX_CHARS, CAMPAIGN_NAME_MAX_CHARS, SOURCE_PHRASE_MAX_CHARS,
  counterFor, renderForRecipient, renderBody, worstCaseJina, jinaFor, firstNameFor, scanPlaceholders,
  validateCampaignTemplate, describeOffenders, variantFor, campaignNameHoldsNumber,
  type CampaignTemplate, type CampaignDraftFields, type CampaignVariant, type RecipientOrigin,
} from "../src/lib/marketing/campaign-template.ts";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";
import { appUrl } from "../src/lib/app-url.ts";
import { decomment } from "./lib/decomment.mts";
import { srcFiles, REPO_ROOT } from "./lib/tracked-files.mts";
import { endOfOpenTag } from "./lib/jsx-open-tag.mts";
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

  /* ── §9 · NOTHING IS APPENDED — the owner's ruling of 2026-10-09 (COMPLIANCE-DECISIONS) ── */
  log("\n§9 · NOTHING IS APPENDED — the message is sent exactly as the officer wrote it (2026-10-09)");
  {
    const footers = [marketingFooter(TOKEN, "SW"), marketingFooter(TOKEN, "EN"), marketingFooter(TOKEN, "SW", "Namba yako ipo orodhani kwetu.")];
    ok("§9 ⭐ the footer is EMPTY in both languages and with any source phrase", footers.every((f) => f === ""), JSON.stringify(footers));
    const sent = compose("50pick: soka leo. Weka dau sasa.", TOKEN);
    ok("§9 ⭐ no stop link, no 18+, no helpline and no token in a composed message",
      !sent.text.includes("/s/") && !sent.text.includes("18+") && !sent.text.includes(statutorySmsHelpline()) && !sent.text.includes(TOKEN)
        && !sent.text.includes("Acha"), JSON.stringify(sent.text));
  }

  /* ── §10 · the budget is derived from the real deployment URL ──────────── */
  log("\n§10 · THE OPERATOR'S BUDGET");
  {
    const budget = operatorBudget("SW");
    ok("§10 ⭐ the budget is the whole message — 160 characters, computed, in both languages",
      budget === SMS_LIMITS.GSM7.single && operatorBudget("EN") === budget, `${budget}`);
    // ⭐ THE DOMAIN IS NOT TYPED ANYWHERE. If `appUrl()` ever changes, this is what notices.
    ok("§10 ⭐ the short domain is DERIVED from the real appUrl(), not typed",
      appUrl().replace(/^https?:\/\//, "").replace(/^www\./, "") === shortDomain(),
      `appUrl ${appUrl()} → ${shortDomain()}`);
    ok("§10 control · the derivation actually produced something",
      shortDomain().length > 3 && !shortDomain().includes("/"), shortDomain());
    // ⛔ The source phrase is never printed (2026-10-09), so it costs nothing.
    const withSource = operatorBudget("SW", "Umetupa namba yako 50pick.");
    ok("§10 ⛔ a source phrase costs nothing — it is never printed", withSource === budget, `${withSource}`);
    log(`       budget ${budget} without a source phrase, ${withSource} with one`);
  }

  /* ── §11 · the composed text IS the officer's text ─────────────────────── */
  log("\n§11 · THE COMPOSED TEXT IS THE OFFICER'S TEXT");
  {
    const c = compose("50pick: soka leo. Weka dau sasa.", TOKEN);
    ok("§11 a good body composes", c.ok, c.problems.join(" | "));
    const padded = compose("  50pick: soka leo. Weka dau sasa. ", TOKEN);
    ok("§11 ⭐ the composed text IS the officer's text, trimmed — nothing appended", padded.text === "50pick: soka leo. Weka dau sasa.",
      JSON.stringify(padded.text));
    ok("§11 ⭐ the size is taken of the WHOLE message, not the body",
      c.size.units === sizeSms(c.text).units, `${c.size.units} vs ${sizeSms(c.text).units}`);

    // ETA s.32(1)(b) — identity at the start.
    const noIdentity = compose("Soka leo. Weka dau sasa.", TOKEN);
    ok("§11 a body that does not begin with the sender identity is refused", !noIdentity.ok);
    ok("§11 …and says so in words, not a code",
      noIdentity.problems.some((p) => p.length > 30 && !/[A-Z]{4,}_/.test(p)), noIdentity.problems.join(" | "));

    ok("§11 an empty body is refused", !compose("", TOKEN).ok);
    ok("§11 ⭐ the token is never printed — a message composes, as written, whatever token it is handed",
      ["", "short", TOKEN].every((t) => { const x = compose("50pick: habari", t); return x.ok && x.text === "50pick: habari"; }));

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
    const published = (support.match(/nationalHelpline:\s*"([^"]+)"/) || [])[1] ?? "";
    ok("§12 control · support-config's published helpline was actually read", published.length > 5, `read "${published}"`);
    checkHelpline(published, statutorySmsHelpline(), marketingFooter, ok);
  }

  /* ── §13 · ONE cap, and the budget in the message's own encoding (2026-09-26) ── */
  // 🔴 `SMS_MAX_SEGMENTS` said 2 while the composer refused anything over 1, and the refusal quoted the
  // GSM-7 budget for a UCS-2 message. Since nothing is appended (2026-10-09) the rooms are the whole 160 and 70.
  log("\n§13 · ONE SEGMENT CAP, AND THE BUDGET IN THE MESSAGE'S OWN ENCODING");
  {
    const at = compose("50pick " + "a".repeat(operatorBudget("SW") - 7), TOKEN);
    const over = compose("50pick " + "a".repeat(operatorBudget("SW") - 6), TOKEN);
    ok("§13 ⛔ the composer and the plan agree on the cap — both accept the at-budget message and both refuse one more",
      at.ok && planSms(at.text, 1).withinCap && !over.ok && !planSms(over.text, 1).withinCap,
      `at ok=${at.ok} withinCap=${planSms(at.text, 1).withinCap} · over ok=${over.ok} withinCap=${planSms(over.text, 1).withinCap}`);
    ok("§13 the UCS-2 budget is the whole 70, computed", operatorBudget("SW", "", "UCS2") === SMS_LIMITS.UCS2.single,
      `${operatorBudget("SW", "", "UCS2")}`);
    // 71 characters with one curly apostrophe → UCS-2, one past its 70.
    const curly = `50pick: ${"a".repeat(SMS_LIMITS.UCS2.single - 8)}${String.fromCharCode(0x2019)}`;
    const c = compose(curly, TOKEN);
    ok("§13 ⭐ a UCS-2 body over 70 is two messages, and the refusal quotes its REAL room (70), not 160",
      c.size.encoding === "UCS2" && c.size.segments === 2 && c.problems.some((p) => p.includes("you have 70 characters")) && !c.problems.some((p) => p.includes("you have 160")),
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
/** The room a BLANK phrase keeps, restated BY HAND (the longest phrase, one septet a letter), as `worstTyped` restates the name's. */
const RESERVE = "W".repeat(SOURCE_PHRASE_MAX_CHARS);
/** A phrase of exactly the longest length — §10's fixture padded with x's. A TEST string, never wording. */
const MAX_PHRASE = PHRASE + "x".repeat(Math.max(0, SOURCE_PHRASE_MAX_CHARS - unitsIn(PHRASE, "GSM7")));
const FB = "Rafiki";
const HEAD = "50pick Habari {jina}, ";
const HEAD_EN = "50pick Hello {jina}, ";
const EN_BODY = "50pick: Hello {jina}, football today.";
const NL15 = cc(10);
const RSQ15 = cc(0x2019);
const EURO15 = cc(0x20AC);
const NBSP15 = cc(0x00A0);
const ZWSP15 = cc(0x200B);
const ZOE = `Zo${cc(0xEB)}`;
const ONEIL = `O${RSQ15}Neil`;
/** §15.15 · one pasted curly quote — Unicode: its whole 70 characters of room, since nothing is appended (2026-10-09). */
const UNI15 = `50pick: leo ni siku ya soka${RSQ15} karibu`;
/** A RIGHT-TO-LEFT OVERRIDE — a format character the name cleaner drops (it would reverse a name in a list). */
const RLO16 = cc(0x202E);
/** A negative number in a sentence: a hyphen-minus straight before a digit, not inside a word ("zero-width" passes). */
const NEG_NUMBER = /(?:^|[^0-9A-Za-z])-[0-9]/;
/** §15.17 · names an officer writes that hold figures and NO phone number — dates, times, a batch, a comma'd figure. */
const NAMES_WITH_FIGURES17 = [
  "Derby 2026-10-03 18:00", "Promo 03/10 16h", "Simba v Yanga 2026-10-05 16h", "Promo 03-10-2026 1800", "Batch 20261003-2",
  "Week 40 2026 10 03", "Jackpot 700,000,000",
];
/** §15.17 · names that hold one Tanzanian mobile number, each ending 78, in the spellings an officer types. */
const NAMES_WITH_PHONES17 = ["Juma 0712 345 678", "Juma 0712 345 678 VIP", "VIP +255 712 345 678", "Call 0712345678 now"];
/** §15.18 · full-width digits, built — never typed (a compatibility fold makes them digits). */
const FULL_WIDTH18 = (digits: string) => [...digits].map((d) => String.fromCodePoint(0xFF10 + Number(d))).join("");
/** §15.18 · the number after another figure, in brackets, joined by en dashes, or in full-width digits. */
const NAMES_HIDING_PHONES18 = [
  "Week 40 0712 345 678", "List 1 0712345678", "Juma (0712) 345-678", `Juma 0712${cc(0x2013)}345${cc(0x2013)}678`,
  `Juma ${FULL_WIDTH18("0712")} ${FULL_WIDTH18("345")} ${FULL_WIDTH18("678")}`,
];
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
    // The room with no source line yet: the cap less the footer and the longest phrase's room, which the counter keeps (M5, §15.9).
    const budget = operatorBudget("SW", RESERVE);
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
    const W12 = "W".repeat(JINA_MAX_CHARS);
    const templates: Array<{ label: string; t: CampaignTemplate; origins: RecipientOrigin[]; tight?: true }> = [
      {
        // ⛔ No source line yet (owner gate G5): only an account recipient can be sent — a book contact is REFUSED (§15.9).
        label: "no source line yet", origins: ["account"],
        t: tpl({ bodySw: fillTo(HEAD, operatorBudget("SW", RESERVE)), bodyEn: fillTo(HEAD_EN, operatorBudget("EN", RESERVE)) }),
      },
      {
        label: "with the source phrase", origins: ["account", "book"],
        t: tpl({ bodySw: fillTo(HEAD, operatorBudget("SW", PHRASE)), bodyEn: fillTo(HEAD_EN, operatorBudget("EN", PHRASE)), sourcePhrase: PHRASE }),
      },
      {
        // ⭐ THE TIGHT CASE: the longest phrase allowed and 12-letter fallbacks — a book contact's message IS the worst case.
        label: "the longest phrase and fallback", origins: ["account", "book"], tight: true,
        t: tpl({
          bodySw: fillTo(HEAD, operatorBudget("SW", MAX_PHRASE)), bodyEn: fillTo(HEAD_EN, operatorBudget("EN", MAX_PHRASE)),
          nameFallbackSw: W12, nameFallbackEn: W12, sourcePhrase: MAX_PHRASE,
        }),
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
    let reached = 0;
    for (const { label, t, origins, tight } of templates) {
      for (const variant of ["SW", "EN"] as CampaignVariant[]) {
        const body = variant === "EN" ? t.bodyEn : t.bodySw;
        const fallback = variant === "EN" ? t.nameFallbackEn : t.nameFallbackSw;
        const counter = impl.counterFor(body, variant, fallback, t.sourcePhrase);
        if (!(counter.ok && counter.left === 0)) atCap.push(`${label}/${variant}: ok=${counter.ok} left=${counter.left}`);
        for (const name of NAMES) {
          for (const origin of origins) {
            cases++;
            const r = impl.renderForRecipient(t, { variant, name: name ?? null, token: TT, origin });
            const within = r.ok && r.size.encoding === "GSM7" && r.size.units <= counter.units && r.size.segments <= counter.segments;
            if (!within) violations.push(`${label}/${variant}/${origin}/${JSON.stringify(name)}: ${r.size.units} units ${r.size.encoding} ${r.size.segments} seg ok=${r.ok} vs counter ${counter.units}`);
            if (tight && origin === "book" && r.size.units === counter.units) reached++;
          }
        }
      }
    }
    ok("§15.2 control · every counter sits exactly AT the cap, so the bound below is tight, not trivially loose",
      atCap.length === 0, atCap.join(" | "));
    ok("§15.2 control · …and the bound is REACHED: on the longest phrase and fallback, every book contact's message is its counter, unit for unit",
      reached === NAMES.length * 2, `${reached} of ${NAMES.length * 2}`);
    // 10 renders a name: 2 languages × 1 origin with no source line yet (a book contact is refused there), × 2 for the two with one.
    ok(`§15.2 ⭐ BOUND PROPERTY · over ${cases} renders, every real message is within the counter's units, its encoding (GSM-7) and its segments, and sendable`,
      violations.length === 0 && cases === NAMES.length * 10, `${violations.length} over: ${violations.slice(0, 3).join(" | ")}`);
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
    // ⭐ A book contact on a 12-letter fallback IS the worst case: the longest name, the phrase, the footer.
    const t6 = tpl({ nameFallbackSw: worstCaseJina(), sourcePhrase: PHRASE });
    const c6 = impl.counterFor(t6.bodySw, "SW", t6.nameFallbackSw, t6.sourcePhrase);
    const r6 = impl.renderForRecipient(t6, { variant: "SW", name: null, token: TT, origin: "book" });
    const a6 = impl.renderForRecipient(t6, { variant: "SW", name: worstCaseJina(), token: TT, origin: "account" });
    const t6a = tpl({ bodyEn: EN_BODY, nameFallbackEn: worstCaseJina(), sourcePhrase: PHRASE });
    const c6a = impl.counterFor(t6a.bodyEn, "EN", t6a.nameFallbackEn, t6a.sourcePhrase);
    const r6a = impl.renderForRecipient(t6a, { variant: "EN", name: null, token: TT, origin: "book" });
    ok("§15.6 ⭐ THE COUNTER IS THE WHOLE MESSAGE — its units are the rendered worst case's (a book contact on a 12-letter fallback: body, source phrase, footer) in both languages, and an account recipient's is exactly the phrase's room less",
      c6.units === sizeSms(r6.text).units && c6a.units === sizeSms(r6a.text).units
        && c6.units === c6.bodyUnits + c6.sourceUnits + c6.footerUnits && sizeSms(a6.text).units === c6.units - c6.sourceUnits,
      `book ${c6.units} vs ${sizeSms(r6.text).units} · EN book ${c6a.units} vs ${sizeSms(r6a.text).units} · account ${sizeSms(a6.text).units} · parts ${c6.bodyUnits}+${c6.sourceUnits}+${c6.footerUnits}`);
    // ⛔ `left` against a value worked out BY HAND — the room with the phrase, less the worst-case body — never against
    // the counter's own `budget − bodyUnits`, which is how `left` is computed and so could not fail.
    const room6 = operatorBudget("SW", PHRASE) - unitsIn(worstTyped(t6.bodySw).trim(), "GSM7");
    const room6a = operatorBudget("EN", PHRASE) - unitsIn(worstTyped(t6a.bodyEn).trim(), "GSM7");
    ok("§15.6 left is the room restated by hand — the budget, less the worst-case body — and the footer is 0 (nothing is appended), in both languages",
      c6.left === room6 && c6a.left === room6a && c6.footerUnits === 0 && c6.encoding === "GSM7" && c6a.footerUnits === 0,
      `left ${c6.left}/${c6a.left} vs ${room6}/${room6a} · footer ${c6.footerUnits}/${c6a.footerUnits}`);
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

  /* ── §15.9 · the source phrase: neither printed, priced nor required (the owner's ruling of 2026-10-09) ── */
  {
    const atP9 = fillTo(HEAD, operatorBudget("SW"));
    const with9 = impl.counterFor(atP9, "SW", FB, PHRASE);
    const blank9 = impl.counterFor(atP9, "SW", FB, "");
    const over9 = impl.counterFor(`${atP9}a`, "SW", FB, PHRASE);
    ok("§15.9 ⭐ the counter does NOT price a source phrase — stored or blank, the room is the whole message's",
      with9.ok && with9.left === 0 && with9.segments === 1 && with9.sourceUnits === 0 && with9.budget === operatorBudget("SW")
        && blank9.ok && blank9.units === with9.units && blank9.sourceUnits === 0 && !over9.ok && over9.segments === 2,
      `with ok=${with9.ok} left=${with9.left} source=${with9.sourceUnits} budget=${with9.budget} · blank ${blank9.units} · one more ok=${over9.ok} segments=${over9.segments}`);
    const t9 = tpl({ sourcePhrase: PHRASE });
    const book9 = impl.renderForRecipient(t9, { variant: "SW", name: null, token: TT, origin: "book" });
    const odd9 = impl.renderForRecipient(t9, { variant: "SW", name: null, token: TT, origin: "imported" as unknown as RecipientOrigin });
    ok("§15.9 ⭐ a book contact's message is the officer's text alone — the fallback greets them, and no phrase is printed, for any origin",
      book9.ok && book9.text === `50pick: Habari ${FB}, soka leo.` && odd9.ok && !odd9.text.includes(PHRASE),
      `${JSON.stringify(book9.text)} · ${JSON.stringify(odd9.text)} · ${book9.problems.join(" | ")}`);
    const blankT9 = tpl();
    const refused9 = [
      impl.renderForRecipient(blankT9, { variant: "SW", name: null, token: TT, origin: "book" }),
      impl.renderForRecipient(blankT9, { variant: "SW", name: null, token: TT, origin: "imported" as unknown as RecipientOrigin }),
      impl.renderForRecipient(tpl({ sourcePhrase: "   " }), { variant: "SW", name: null, token: TT, origin: "book" }),
      impl.renderForRecipient(tpl({ bodyEn: EN_BODY }), { variant: "EN", name: null, token: TT, origin: "book" }),
    ];
    const acctBlank9 = impl.renderForRecipient(blankT9, { variant: "SW", name: "Asha", token: TT, origin: "account" });
    ok("§15.9 ⛔ no source line is required — a book contact, an unknown origin, a phrase of spaces and an English book recipient all render ok without one, as an account recipient does",
      refused9.every((x) => x.ok && !has(x.problems, "no source line")) && acctBlank9.ok,
      `${refused9.map((x) => `ok=${x.ok}`).join(",")} · account ok=${acctBlank9.ok} · ${refused9[0].problems.join(" | ")}`);
  }

  /* ── §15.10 · a recycled number never prints the previous holder's name ── */
  {
    // (A source line is stored here; it is never printed since the owner's ruling of 2026-10-09.)
    const rec = impl.renderForRecipient(tpl({ sourcePhrase: PHRASE }), { variant: "SW", name: "Asha", token: TT, origin: "book" });
    ok("§15.10 ⛔ a BOOK contact is greeted by the fallback even when a name is handed in",
      rec.ok && rec.text.startsWith(`50pick: Habari ${FB},`) && !rec.text.includes("Asha"), `${JSON.stringify(rec.text)} · ${rec.problems.join(" | ")}`);
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
    const atMax = v({}, "x".repeat(SOURCE_PHRASE_MAX_CHARS));
    const overMax = v({}, "x".repeat(SOURCE_PHRASE_MAX_CHARS + 1));
    const euroOver = v({}, `${"x".repeat(SOURCE_PHRASE_MAX_CHARS - 1)}${EURO15}`);
    ok("§15.11 ⭐ the source line no longer judges the template — a braced, a two-line, an over-long and a Unicode-forcing line are all accepted (it is never printed, 2026-10-09)",
      [brace, twoLine, fine, atMax, overMax, euroOver].every((x) => x.ok && x.problems.sourcePhrase === undefined),
      JSON.stringify({ brace: brace.problems, twoLine: twoLine.problems, overMax: overMax.problems, euroOver: euroOver.problems }));
    ok(`§15.12 the campaign name is required and at most ${CAMPAIGN_NAME_MAX_CHARS} characters`,
      !v({ name: "  " }).ok && v({ name: "  " }).problems.name !== undefined
        && !v({ name: "n".repeat(CAMPAIGN_NAME_MAX_CHARS + 1) }).ok && v({ name: "n".repeat(CAMPAIGN_NAME_MAX_CHARS) }).ok);
  }

  /* ── §15.13 · ONE CAMPAIGN, ONE VERDICT — the renderer re-runs the stored template's WHOLE verdict ── */
  {
    const STALE = "no longer passes its own check";
    const atP13 = fillTo(HEAD, operatorBudget("SW", PHRASE));
    const atPEn13 = fillTo(HEAD_EN, operatorBudget("EN", PHRASE));
    const over13 = tpl({ bodySw: `${atP13}aaa`, sourcePhrase: PHRASE });
    const enOver13 = tpl({ bodyEn: `${atPEn13}aaa`, sourcePhrase: PHRASE });
    const braced13 = tpl({ sourcePhrase: "Source {jina}" });
    const lineBreak13 = tpl({ sourcePhrase: `${PHRASE}${NL15}` });
    const stored13: Array<{ label: string; t: CampaignTemplate }> = [
      { label: "valid, both languages at the cap", t: tpl({ bodySw: atP13, bodyEn: atPEn13, sourcePhrase: PHRASE }) },
      { label: "Swahili 3 over in the worst case", t: over13 },
      // ⛔ ONE CAMPAIGN, ONE VERDICT: a fault in the English half refuses the Swahili recipients too — nothing is half-sent.
      { label: "only the English body bad, 3 over in the worst case", t: enOver13 },
      { label: "only the English fallback bad", t: tpl({ bodyEn: EN_BODY, nameFallbackEn: "Friend1", sourcePhrase: PHRASE }) },
      { label: "two {jina}", t: tpl({ bodySw: "50pick: Habari {jina}, karibu {jina}.", sourcePhrase: PHRASE }) },
      { label: "an unknown token", t: tpl({ bodySw: "50pick: Habari {name}, soka leo.", sourcePhrase: PHRASE }) },
      { label: "an unusable Swahili fallback", t: tpl({ nameFallbackSw: "Rafiki1", sourcePhrase: PHRASE }) },
      { label: "a braced source line", t: braced13 },
      { label: "a source line ending in a line break", t: lineBreak13 },
      { label: "a source line one over the limit", t: tpl({ sourcePhrase: "x".repeat(SOURCE_PHRASE_MAX_CHARS + 1) }) },
      { label: "a UCS-2 source line", t: tpl({ sourcePhrase: `${PHRASE.slice(0, -1)}${RSQ15}` }) },
      { label: "valid, no source line yet", t: tpl() },
    ];
    const disagree: string[] = [];
    let sent13 = 0;
    let refused13 = 0;
    let cases13 = 0;
    for (const { label, t } of stored13) {
      const { sourcePhrase, ...typed } = t;
      // The draft's name is fixed and valid, so this `ok` is the template's own verdict — WHOLE, both languages at once.
      const whole = impl.validate({ name: "Derby week", ...typed }, sourcePhrase).ok;
      for (const variant of ["SW", "EN"] as CampaignVariant[]) {
        for (const origin of ["account", "book"] as RecipientOrigin[]) {
          for (const name of ["Ali", "Christabella"]) {
            cases13++;
            const expected = whole;
            const r = impl.renderForRecipient(t, { variant, name, token: TT, origin });
            if (r.ok) sent13++;
            else refused13++;
            if (r.ok !== expected) disagree.push(`${label}/${variant}/${origin}/${name}: rendered ok=${r.ok}, validate says ${expected}`);
          }
        }
      }
    }
    ok(`§15.13 ⭐ THE RENDERER RE-RUNS THE STORED TEMPLATE'S VERDICT, WHOLE — over ${cases13} renders of ${stored13.length} stored templates, a message is sendable exactly when validateCampaignTemplate passes the WHOLE template (both languages, both fallbacks), for every origin`,
      disagree.length === 0 && cases13 === stored13.length * 8 && sent13 > 0 && refused13 > 0,
      `${disagree.length} disagree: ${disagree.slice(0, 3).join(" | ")} · sent ${sent13} refused ${refused13}`);
    const enVerdict = impl.validate(draft({ bodyEn: enOver13.bodyEn }), PHRASE);
    const swHalf = [
      impl.renderForRecipient(enOver13, { variant: "SW", name: "Ali", token: TT, origin: "account" }),
      impl.renderForRecipient(enOver13, { variant: "SW", name: null, token: TT, origin: "book" }),
    ];
    const enHalf = impl.renderForRecipient(enOver13, { variant: "EN", name: "Ali", token: TT, origin: "account" });
    ok("§15.13 ⛔ ONE CAMPAIGN, ONE VERDICT — when only the English body is bad, the Swahili recipients (an account and a book contact) are refused too, each told the stored template no longer passes its own check, though their own Swahili message is a single segment",
      enVerdict.problems.bodyEn !== undefined && enVerdict.problems.bodySw === undefined && enVerdict.problems.nameFallbackSw === undefined
        && enVerdict.problems.sourcePhrase === undefined
        && swHalf.every((x) => !x.ok && x.size.segments === 1 && has(x.problems, STALE)) && !enHalf.ok && has(enHalf.problems, STALE),
      `${swHalf.map((x) => `Swahili ok=${x.ok} ${x.size.units} units`).join(" · ")} · English ok=${enHalf.ok} · ${swHalf[0].problems.join(" | ")}`);
    const overAcct = impl.renderForRecipient(over13, { variant: "SW", name: "Ali", token: TT, origin: "account" });
    const overBook = impl.renderForRecipient(over13, { variant: "SW", name: null, token: TT, origin: "book" });
    ok("§15.13 ⛔ a stored body 3 over in the worst case is refused for an account recipient with a short name AND for a book contact — though each one's own message is a single segment",
      !overAcct.ok && !overBook.ok && overAcct.size.segments === 1 && overBook.size.segments === 1
        && has(overAcct.problems, STALE) && has(overBook.problems, STALE) && !impl.validate(draft({ bodySw: over13.bodySw }), PHRASE).ok,
      `account ok=${overAcct.ok} ${overAcct.size.units} units · book ok=${overBook.ok} ${overBook.size.units} units · ${overAcct.problems.join(" | ")}`);
    const asStored = [braced13, lineBreak13].flatMap((t) => (["account", "book"] as RecipientOrigin[]).map((origin) => ({
      line: JSON.stringify(t.sourcePhrase), origin, r: impl.renderForRecipient(t, { variant: "SW", name: "Asha", token: TT, origin }),
    })));
    ok("§15.13 ⭐ the source line no longer refuses anyone — a braced line and one ending in a line break, for an account and a book contact alike, render the officer's text alone (it is never printed, 2026-10-09)",
      asStored.every((x) => x.r.ok && !x.r.text.includes("Source") && !x.r.text.includes(PHRASE)),
      asStored.map((x) => `${x.line}/${x.origin} ok=${x.r.ok}`).join(" · "));
  }

  /* ── §15.14 · the fallback, judged as the save stores it — trimmed (the validation audit, 2026-10-03) ── */
  {
    const typed14 = ["Mteja ", " Mteja wetu "].map((nameFallbackSw) => v({ nameFallbackSw }));
    const counter14 = impl.counterFor(tpl().bodySw, "SW", "Mteja ", "");
    const printed14 = impl.renderForRecipient(tpl({ nameFallbackSw: " Mteja wetu ", sourcePhrase: PHRASE }), { variant: "SW", name: null, token: TT, origin: "book" });
    ok("§15.14 ⭐ THE FALLBACK IS TRIMMED BEFORE IT IS JUDGED — 'Mteja ' and ' Mteja wetu ' (a phone keyboard's space after a suggested word) pass the verdict and the counter, and the renderer prints exactly the trimmed word",
      typed14.every((x) => x.ok) && counter14.ok && counter14.fallbackProblems.length === 0
        && printed14.ok && printed14.text.startsWith("50pick: Habari Mteja wetu, soka leo."),
      JSON.stringify({ verdicts: typed14.map((x) => x.problems), counter: counter14.fallbackProblems, printed: printed14.text.slice(0, 40), problems: printed14.problems }));
  }

  /* ── §15.15 · a Unicode body: ONE sentence naming what to replace, never a negative room (the validation audit) ── */
  {
    const c15 = impl.counterFor(UNI15, "SW", FB, "");
    const v15 = impl.validate(draft({ bodySw: UNI15 }), "");
    const seven15 = [0x2018, 0x2019, 0x201C, 0x201D, 0x2013, 0x2014, 0x2026].map((x) => cc(x)).join(" ");
    const many15 = impl.counterFor(`50pick ${seven15}`, "SW", FB, "");
    // A six-letter source line leaves Unicode some room: the sentence then quotes it, and it is positive.
    const room15 = impl.counterFor(UNI15, "SW", FB, "Chanzo");
    const negatives = [...c15.problems, ...many15.problems, ...room15.problems, ...(v15.problems.bodySw ?? [])].filter((p) => NEG_NUMBER.test(p));
    const first15 = c15.problems[0] ?? "";
    ok("§15.15 ⭐ A UNICODE BODY IS TOLD IN ONE SENTENCE WHAT TO REPLACE, AND NEVER A NEGATIVE ROOM — one curly quote reads 'Unicode cuts this message to 70 characters' (nothing is appended, so Unicode keeps its whole 70) and 'replace:' the curly apostrophe by its label, first, on the counter and on the field; seven offenders name five and count the rest; a stored source line changes nothing; no sentence names a footer or holds a negative number",
      !c15.ok && c15.budget === 70 && first15 === `Unicode cuts this message to 70 characters — replace: ${RSQ15} (curly apostrophe).`
        && v15.problems.bodySw?.[0] === first15
        && many15.offenders.length === 7 && (many15.problems[0] ?? "").endsWith(" and 2 more.") && (many15.problems[0] ?? "").includes("(en dash)")
        && room15.budget === 70 && (room15.problems[0] ?? "") === first15
        && ![...c15.problems, ...many15.problems, ...room15.problems].some((p) => p.includes("footer"))
        && negatives.length === 0,
      JSON.stringify({ first: c15.problems, many: many15.problems[0], room: room15.problems, negatives }));
  }

  /* ── §15.16 · the campaign's name, cleaned by the contact book's ONE name cleaner before its checks ── */
  {
    const invisible16 = v({ name: ZWSP15.repeat(3) });
    const padded16 = v({ name: `${"n".repeat(CAMPAIGN_NAME_MAX_CHARS)}${ZWSP15}${RLO16}` });
    ok(`§15.16 ⭐ THE NAME IS CLEANED BEFORE IT IS JUDGED — a name of zero-width spaces only is blank ("Give the campaign a name"), and the ${CAMPAIGN_NAME_MAX_CHARS}-character limit counts what is left once the invisible characters (a zero-width space, a direction override) are dropped`,
      !invisible16.ok && (invisible16.problems.name?.[0] ?? "").startsWith("Give the campaign a name") && padded16.ok,
      JSON.stringify({ invisible: invisible16.problems, padded: padded16.problems }));
  }

  /* ── §15.17–§15.18 · the campaign's name refuses a phone number — and ONLY a Tanzanian mobile number (review round) ── */
  {
    const refusedDates = NAMES_WITH_FIGURES17.filter((name) => !v({ name }).ok);
    const said17 = NAMES_WITH_PHONES17.map((name) => v({ name }).problems.name ?? []);
    const sentence17 = campaignNameHoldsNumber("0712345678");
    const masked17 = sentence17.includes("ending 78") && !sentence17.includes("0712") && !sentence17.includes("345");
    ok("§15.17 ⭐ A CAMPAIGN NAME REFUSES A PHONE NUMBER, AND ONLY A PHONE NUMBER — in the ONE verdict the screen shows before Save is pressed: a date, a time, a batch or a figure written with a comma passes ('Derby 2026-10-03 18:00', 'Promo 03/10 16h'), while a Tanzanian mobile number in any spelling is refused on the name with one sentence that names it by its last two digits only",
      refusedDates.length === 0 && said17.every((list) => list.length === 1 && list[0] === sentence17) && masked17,
      JSON.stringify({ refusedDates, said: said17, sentence: sentence17 }));
    const missed18 = NAMES_HIDING_PHONES18.filter((name) => v({ name }).ok);
    ok("§15.18 ⭐ …WHEREVER IN THE NAME IT SITS — after another figure ('Week 40 0712 345 678'), in brackets, joined by en dashes, or in full-width digits, the number is still found and refused",
      missed18.length === 0, `missed [${missed18.join(" | ")}]`);
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

/* ══ §16.2–§16.5 · §17.6 — THE COMPOSER'S OWN FILES, READ (U37b, 2026-10-02) ══════════════════════════════
 * The page layer of U37a's rules: the screen sizes nothing itself (its counter is the renderer's), offers no sender
 * control (OD45) and ONE number control — the Test card's kit PhoneInput (U37c-2) — and names no money (OD24) —
 * and the save writes through the campaign door's ONE draft writer (X12). Read from the real tree; every plant below
 * swaps one source string IN MEMORY. */

/** The composer's route directory — EVERY file in it is read, so a new file joins the population by existing. */
const SCREEN_DIR = "src/app/admin/campaigns/new/";
/** What a screen must never reach for: the counter and the text are the renderer's (`campaign-template.ts`). */
const SIZER_NAMES = ["sizeSms", "encodingFor", "planSms", "unitsIn", "operatorBudget", "capUnits", "marketingFooter", "composeMarketing"];
const CR17 = cc(13);
type ScreenSources = { files: ReadonlyMap<string, string>; draftService: string; testService: string };

function loadScreenSources(): ScreenSources {
  const code = (rel: string) => decomment(readFileSync(join(REPO_ROOT, rel), "utf8")).split(CR17).join("");
  const files = new Map<string, string>();
  for (const rel of srcFiles()) if (rel.startsWith(SCREEN_DIR)) files.set(rel, code(rel));
  return {
    files,
    draftService: code("src/lib/server/marketing/campaign-draft.ts"),
    testService: code("src/lib/server/marketing/campaign-test-send.ts"),
  };
}

/** Every open tag of a control someone could type into, read by the shared lexer (an arrow function holds a `>`). */
function controlTags(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/<(Input|Textarea|Select|PhoneInput|input|textarea|select)(?=[\s/>])/g)) {
    const at = m.index ?? 0;
    const end = endOfOpenTag(text, at);
    out.push(end < 0 ? text.slice(at, at + 400) : text.slice(at, end + 1));
  }
  return out;
}

/** From `opener` to the next `until` (or 600 characters on) — one branch of a JSX conditional, read on its own. */
function branchOf(text: string, opener: string, until: string): string {
  const at = text.indexOf(opener);
  if (at < 0) return "";
  const next = text.indexOf(until, at + opener.length);
  return text.slice(at, next < 0 ? at + 600 : next);
}

/** How many times `needle` occurs in `text`. */
const occurrences = (text: string, needle: string): number => text.split(needle).length - 1;

/** The braces after `opener` — an object or type literal — brace-counted. "" when the opener is not there. */
function blockAfter(text: string, opener: string): string {
  const at = text.indexOf(opener);
  if (at < 0) return "";
  const open = text.indexOf("{", at);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return "";
}

function checkComposerScreen(src: ScreenSources, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  log(`${NL15}§16.2–§16.5 · §17.6 · THE COMPOSER'S OWN FILES — it sizes nothing, offers no sender and one number field (the Test card's), names no money`);
  const client = src.files.get(`${SCREEN_DIR}composer-client.tsx`) ?? "";
  const counter = src.files.get(`${SCREEN_DIR}composer-counter.tsx`) ?? "";
  const actions = src.files.get(`${SCREEN_DIR}actions.ts`) ?? "";
  const copy = src.files.get(`${SCREEN_DIR}composer-copy.ts`) ?? "";
  ok("§16.2 control · the composer's own files were read — the page, its ghost, the client, the counter, the actions, the copy, the loader",
    src.files.size >= 7 && client.length > 500 && counter.length > 100 && actions.length > 200 && copy.length > 200
      && src.files.has(`${SCREEN_DIR}page.tsx`) && src.files.has(`${SCREEN_DIR}loading.tsx`) && src.files.has(`${SCREEN_DIR}composer-loader.ts`),
    [...src.files.keys()].map((k) => k.slice(SCREEN_DIR.length)).join(", "));

  /* §16.2 · the counter is the renderer's */
  const reaches = [...src.files].flatMap(([rel, text]) =>
    SIZER_NAMES.filter((n) => new RegExp(`(?<![A-Za-z0-9_$])${n}(?![A-Za-z0-9_$])`).test(text)).map((n) => `${rel.slice(SCREEN_DIR.length)}:${n}`));
  const fromTemplate = /import\s*\{[^}]*validateCampaignTemplate[^}]*\}\s*from\s*"@\/lib\/marketing\/campaign-template"/.test(client)
    && client.includes("validateCampaignTemplate(fields, view.sourcePhrase)") && counter.includes("counterLine(counter)");
  ok("§16.2 ⛔ the screen sizes nothing itself — its live verdict is validateCampaignTemplate (counterFor) from campaign-template.ts, priced with the campaign's own source line, and no composer file names a sizer (sizeSms, encodingFor, planSms, unitsIn, operatorBudget, capUnits, marketingFooter, composeMarketing)",
    reaches.length === 0 && fromTemplate, `named: [${reaches.join(", ")}] · verdict from the template ${fromTemplate}`);

  /* §16.3 · OD45 — no sender control */
  const tags = [...src.files].flatMap(([rel, text]) => controlTags(text).map((t) => ({ rel: rel.slice(SCREEN_DIR.length), t })));
  const senderTags = tags.filter((x) => /sender/i.test(x.t));
  const labels = blockAfter(copy, "export const COMPOSE_FIELD");
  const inputType = blockAfter(src.draftService, "export type CampaignDraftInput");
  ok("§16.3 ⛔ OD45 · no composer control is a sender — no input, textarea or select names one, no field label offers one — and the save's input type carries no sender, segments, coding or source line",
    tags.length >= 4 && senderTags.length === 0 && labels.length > 50 && !/sender/i.test(labels)
      && inputType.length > 50 && !/sender|segments|coding|sourcePhrase/i.test(inputType),
    `${tags.length} controls · sender controls [${senderTags.map((x) => x.rel).join(", ")}] · input type ${inputType.length} chars`);

  /* §16.4 · U37c-2 · ONE number control, the kit's, in the Test card — and the test action's own signature: (campaignId,
     variant, recipient), the recipient exactly own, or typed with its confirmation; the typed number in no address or store */
  const phoneTags = tags.filter((x) => /^<PhoneInput\b/.test(x.t));
  const numberTags = tags.filter((x) => !/^<PhoneInput\b/.test(x.t)
    && /type=["']tel["']|inputMode=["']tel["']|(?:name|id)=["'](?:phone|msisdn|number|to)["']/i.test(x.t));
  const testCard = blockAfter(client, "export function ComposerTest(");
  const phoneInCard = phoneTags.length === 1 && phoneTags[0].rel === "composer-client.tsx" && testCard.includes(phoneTags[0].t)
    && /data-test-recipient="typed"/.test(phoneTags[0].t);
  const sendBlock = blockAfter(client, "const sendTest = (variant: CampaignVariant, recipient?: TypedTestRecipient) => {");
  const LEAKS = /router\.(push|replace)|useRouter|searchParams|useSearchParams|localStorage|sessionStorage|history\.(push|replace)State|location\.|document\.cookie|indexedDB|console\./;
  const typedLeaks = LEAKS.test(testCard) || sendBlock === "" || LEAKS.test(sendBlock);
  const sig = /export\s+async\s+function\s+sendCampaignTestAction\s*\(([^)]*)\)/.exec(actions)?.[1] ?? null;
  const params = sig === null ? [] : sig.split(",").map((p) => p.trim().split(/[\s:?=]/)[0]).filter((p) => p !== "");
  const testInput = blockAfter(src.testService, "export type CampaignTestInput");
  const testKeys = [...testInput.matchAll(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\??:/g)].map((m) => m[1]);
  const recipientUnion = (/export type TestRecipient\s*=\s*([\s\S]+?\});/.exec(src.testService)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const RECIPIENT_UNION = '{ kind: "own" } | { kind: "typed"; number: string; adultAttested: boolean; attestedVersion: number | null }';
  ok("§16.4 ⛔ ONE NUMBER CONTROL, THE KIT'S, IN THE TEST CARD — exactly one PhoneInput in the composer's sources, inside ComposerTest and marked data-test-recipient=typed; no raw tel input and no other field named phone, msisdn, number or to; sendCampaignTestAction takes exactly (campaignId, variant, recipient); CampaignTestInput's keys are exactly campaignId, variant and recipient; TestRecipient is exactly own or typed with number and adultAttested; and the typed number reaches no address or storage",
    phoneInCard && numberTags.length === 0 && !typedLeaks && params.join(",") === "campaignId,variant,recipient"
      && testKeys.join(",") === "campaignId,variant,recipient" && recipientUnion === RECIPIENT_UNION,
    `PhoneInputs [${phoneTags.map((x) => x.rel).join(", ")}] in the Test card ${phoneInCard} · other number controls [${numberTags.map((x) => x.rel).join(", ")}] · address/storage in the card ${typedLeaks} · params (${params.join(", ")}) · input keys {${testKeys.join(", ")}} · recipient ${recipientUnion || "(none)"}`);

  /* §16.17 · U37c-2 · D19 on the screen, and the remedy that fits the target */
  const stillTick = /export const COMPOSE_TEST_NEED_TICK = "([^"]+)";/.exec(copy)?.[1] ?? "";
  const serverTick = /export const TEST_ATTESTATION_MISSING = "([^"]+)";/.exec(src.testService)?.[1] ?? "";
  ok("§16.17 ⛔ U37c-2 · THE REFUSAL ON THE SCREEN IS THE SERVER'S — the reason and the sentence are the result's, field for field (testStateOf copies r.reason, r.error and r.target; the card prints data-test-reason={state.reason}); the officer's own consent link shows ONLY when the target is own; and Send's unticked reason is the test send's own sentence, word for word",
    client.includes("data-test-reason={state.reason}") && /reason: r\.reason, error: r\.error, target: r\.target/.test(client)
      && client.includes('state.target === "own" && CONSENT_REASONS.includes(state.reason)')
      && occurrences(client, "data-test-consent-link") === 1
      && branchOf(client, 'state.target === "own" && CONSENT_REASONS.includes(state.reason) && (', "</a>").includes("data-test-consent-link")
      && stillTick !== "" && stillTick === serverTick,
    JSON.stringify({ reason: client.includes("data-test-reason={state.reason}"), copied: /reason: r\.reason, error: r\.error, target: r\.target/.test(client), ownOnly: client.includes('state.target === "own" && CONSENT_REASONS.includes(state.reason)'), tick: stillTick === serverTick }));

  /* §16.18 · U37c-2 · the number's problem is said once — under the field — and the line beside Send goes back to it */
  const fixNumber = /export const COMPOSE_TEST_FIX_NUMBER = "([^"]+)";/.exec(copy)?.[1] ?? "";
  const backBranch = branchOf(client, "reason !== null && backToNumber && (", "</button>");
  ok("§16.18 ⭐ U37c-2 · THE NUMBER'S PROBLEM IS SAID ONCE — the plan's sentence is the field's error, and while it is the reason Send is off the line beside Send is COMPOSE_TEST_FIX_NUMBER as a button that goes to the testNumber field (the Save reason's pattern), never the sentence again",
    fixNumber !== "" && client.includes("error={numberProblem ?? undefined}") && client.includes('dataField="testNumber"')
      && client.includes("const backToNumber = blocked === null && numberProblem !== null && typedBlocked === numberProblem;")
      && backBranch.includes("<button") && backBranch.includes('onClick={() => c.goToField(["testNumber"])}')
      && backBranch.includes("{COMPOSE_TEST_FIX_NUMBER}") && !backBranch.includes("{reason}")
      && client.includes("{reason !== null && !backToNumber && <p"),
    JSON.stringify({ fixNumber, backBranch: backBranch.length }));

  /* §16.19 · U37c-2 · the 18+ tick is bound — to this draft, these words, this number, and one send (the review's BLOCKER) */
  const TICK_KEY = 'const tickKey = `${saved?.id ?? ""}|${typedView.attestation?.version ?? ""}|${digits}`;';
  const bound = {
    key: testCard.includes(TICK_KEY) && testCard.includes("const ticked = tickedFor === tickKey;"),
    pick: testCard.includes("const pick = (v: TestTarget) => { setTarget(v); setTickedFor(null); };")
      && occurrences(testCard, "onPick={pick}") === 2 && !testCard.includes("onPick={setTarget}"),
    box: testCard.includes("<Checkbox checked={ticked} onChange={(on) => setTickedFor(on ? tickKey : null)}"),
    edit: testCard.includes("onChange={(e) => { setDigits(e.target.value); setTickedFor(null); }}"),
    spent: /const r = recipient\(\);\s*setTickedFor\(null\);\s*c\.sendTest\(v, r\);/.test(testCard)
      && testCard.includes("onClick={() => send(v)}") && !/c\.sendTest\(v, recipient\(\)\)/.test(testCard),
    posted: testCard.includes("adultAttested: ticked, attestedVersion: typedView.attestation?.version ?? null"),
  };
  ok("§16.19 ⛔ U37c-2 · THE 18+ TICK IS BOUND — held as the key it was given for (this draft's id, the adult.test version, the digits), so a rewording or another draft unticks it; any edit of the number and a switch of target untick it; each Send reads the recipient and THEN spends the tick; and the post carries the tick with the version it was given for",
    Object.values(bound).every(Boolean), JSON.stringify(bound));

  /* §16.20 · U37c-2 · the card says the true reason and stays in step with the server (the reviews' minors) */
  const inStep = {
    // a typed test refused up front is said BEFORE "updating" — its preview is null, so it would never freshen
    order: /: typedOff\s*\?\s*typedWhy\s*:\s*!fresh\s*\?\s*COMPOSE_TEST_UPDATING/.test(testCard),
    // a disabled "Another number" always has a reason beside it
    why: testCard.includes("const typedWhy = typedView.why ?? (view.readOnly ? COMPOSE_TEST_NOT_DRAFT : saved !== null && !c.dirty ? COMPOSE_TEST_UPDATING : COMPOSE_TEST_SAVE_FIRST);")
      && testCard.includes("why={typedView.allowed ? null : typedWhy}"),
    // the choice is still while a test is in flight
    still: testCard.includes("disabled={!typedView.allowed || c.testing !== null}") && testCard.includes("disabled={t.ownNumberMasked === null || c.testing !== null}"),
    // a refusal that means "this page is out of date" re-reads the page
    reread: client.includes('const PAGE_STALE_REASONS = ["attestation_stale", "typed_outreach_closed", "typed_no_attestation_wording", "typed_needs_source_line", "typed_role"];')
      && sendBlock.includes('r.outcome === "refused" && PAGE_STALE_REASONS.includes(r.reason)) router.refresh();'),
  };
  ok("§16.20 ⭐ U37c-2 · THE CARD SAYS THE TRUE REASON AND KEEPS IN STEP — a typed test refused up front says so before \"updating\"; a disabled \"Another number\" always has its reason (save first, or updating just after a save); the choice is still while a test is in flight; and a refusal that means the page is out of date (the 18+ words, the record, the line) re-reads it",
    Object.values(inStep).every(Boolean), JSON.stringify(inStep));

  /* §16.5 · OD24 — no money */
  const money = [...src.files].filter(([, text]) => /TZS|formatTzs/.test(text)).map(([rel]) => rel.slice(SCREEN_DIR.length));
  ok("§16.5 ⛔ OD24 · no money on the composer — no TZS and no formatTzs in any of its files", money.length === 0, `money in [${money.join(", ")}]`);

  /* §17.6 · X12 — the save's one door, read */
  const svc = src.draftService;
  ok("§17.6 X12 · the save writes through the campaign door alone — create, and its ONE draft writer, the compare-and-set update — with no baseUpdatedAt, no second update method and no transition",
    svc.includes("db.smsCampaign.update(id, patch, guard, at)") && svc.includes("db.smsCampaign.create(row)")
      && !/baseUpdatedAt|updateDraft|smsCampaign\.transition/.test(svc),
    `${svc.length} chars`);

  /* §16.7 · validation takes the officer to the field (the validation audit, 2026-10-03) */
  const reason7 = branchOf(client, "showReason && c.blockedField !== null", "</button>");
  const goTo7 = blockAfter(client, "const goToField = ");
  const cut7 = tags.filter((x) => /maxLength/.test(x.t)).map((x) => x.rel);
  ok("§16.7 ⭐ THE SAVE REASON TAKES THE OFFICER TO THE FIELD — a button (onClick goToBlocked) wherever it names a field this page draws; goToField asks focusFirstInvalid and READS its result (not-rendered handled); the Audience card carries data-field audience; no composer control carries maxLength (the verdict refuses, the browser never cuts); and the §16.2 literal is kept",
    reason7.includes("<button") && reason7.includes("onClick={c.goToBlocked}") && reason7.includes("data-compose-save-reason")
      && goTo7.includes("focusFirstInvalid(root, keys)") && goTo7.includes('"not-rendered"')
      && client.includes('data-field="audience"')
      && cut7.length === 0 && client.includes("validateCampaignTemplate(fields, view.sourcePhrase)"),
    `reason ${reason7.length} chars · goToField ${goTo7.length} chars · maxLength in [${cut7.join(", ")}]`);

  /* §16.8 · a refusal offers only the step that can work; both bodies show their error; the Swahili hint; the Remove control */
  const changed8 = branchOf(client, '(c.refusal.kind === "stale" || c.refusal.kind === "not_draft") && (', "c.refusal.kind ===");
  const notFound8 = branchOf(client, 'c.refusal.kind === "not_found" && (', "c.refusal.kind ===");
  const modal8 = branchOf(client, "<ConfirmModal", "/>");
  const modalAt8 = client.indexOf("<ConfirmModal");
  const formAt8 = client.indexOf("export function ComposerMessage(");
  ok("§16.8 ⭐ A REFUSAL OFFERS ONLY THE STEP THAT CAN WORK — a stale save AND a draft confirmed since load the stored version only through ONE ConfirmModal ('Discard my text and load theirs'), held outside the composer's form, and either can keep the officer's text as a new draft; nothing reloads blind; a missing draft saves as new; only a save lost in transit is prefixed with 'Couldn't save … Try again.'; both bodies wear the danger border with their error; the Swahili hint is the copy's; a refused address filter has its Remove control",
    changed8.includes("onClick={() => c.askDiscard(true)}") && changed8.includes("onClick={c.saveAsNew}")
      && !client.includes("onClick={c.reload}") && notFound8.includes("onClick={c.saveAsNew}")
      && modal8.includes("onConfirm={reload}") && modal8.includes("confirmLabel={COMPOSE_DISCARD_CONFIRM}")
      && occurrences(client, "<ConfirmModal") === 1 && modalAt8 > 0 && formAt8 > modalAt8
      && client.includes('kind === "failed" ? `${COMPOSE_SAVE_FAILED} ${r.error}` : r.error')
      && client.includes('className={c.problemAt("bodySw") !== undefined ? "border-danger-500" : undefined}')
      && client.includes('className={c.problemAt("bodyEn") !== undefined ? "border-danger-500" : undefined}')
      && client.includes("hint={COMPOSE_BODY_SW_HINT}")
      && client.includes("a.clearHref !== null") && client.includes("router.replace((a.clearHref"),
    `stale/not_draft ${changed8.length} chars · modal ${modal8.length} chars at ${modalAt8} (form at ${formAt8}) · not_found ${notFound8.length} · blind reloads ${occurrences(client, "onClick={c.reload}")}`);

  /* §16.9 · the counter row: the ONE cap, and the fold offered when any offender folds */
  ok("§16.9 the counter row offers the fold through foldOffered (ANY offender with a plain twin) and reads its cap from SMS_MAX_SEGMENTS — no literal cap, no every()",
    counter.includes("foldOffered(counter)") && counter.includes("counter.segments > SMS_MAX_SEGMENTS")
      && !/segments > 1(?![0-9])/.test(counter) && !counter.includes(".every("),
    `${counter.length} chars`);

  /* §16.10 · every action refusal carries its reason */
  const refusedWith = (reason: string) => occurrences(actions, `return { ok: false, reason: "${reason}"`);
  ok("§16.10 ⭐ EVERY ACTION REFUSAL CARRIES ITS REASON — the role's (both actions), the save budget's, and an unfinished save's or test's (both catches, each with its own check-first sentence); the revision is campaign-model's INT4 rule; no bare 'return g' and no bare 'failed' fallback label is left",
    refusedWith("role") === 2 && refusedWith("rate_limited") === 1 && refusedWith("unfinished") === 2
      && actions.includes("safeError(err, COMPOSE_SAVE_UNFINISHED)") && actions.includes("safeError(err, COMPOSE_TEST_UNFINISHED)")
      && actions.includes("SMS_CAMPAIGN_VALUE.draftRevision(v)") && !/return g;/.test(actions)
      && !actions.includes("Saving the draft failed") && !actions.includes("The test send failed"),
    `role ${refusedWith("role")} · rate_limited ${refusedWith("rate_limited")} · unfinished ${refusedWith("unfinished")}`);

  /* §16.14 · a NEW draft keeps the audience on screen, or is not offered (the review round) */
  ok("§16.14 ⛔ 'SAVE AS A NEW DRAFT' POSTS THE AUDIENCE IT KEEPS — the card's carry, never the address alone (a draft with no address filter would become the whole book) — and is off, with its reason, when the audience cannot travel",
    client.includes("audience: asNew ? view.audience.carry : view.audience.params")
      && client.includes("view.audience.carry === null ? COMPOSE_SAVE_AS_NEW_AUDIENCE")
      && client.includes("const canSaveAsNew = saveAsNewBlocked === null && !saving;")
      && client.includes("title={c.saveAsNewBlocked ?? undefined}"),
    `${occurrences(client, "view.audience.carry")} reads of carry`);

  /* §16.15 · the saved line invites a test only when the page can send one */
  ok("§16.15 the saved line names the test below only when this page can send one — the live switch open (no live note), the send window open (no window note, U13), the officer's own number reachable, the rail up",
    client.includes("const canTest = view.test.liveNote === null && view.test.windowNote === null && view.test.ownNumberMasked !== null && !view.sender.dead;")
      && client.includes("composeSaved(c.saved.savedAt, canTest)"),
    `composeSaved calls: ${occurrences(client, "composeSaved(")}`);

  /* §16.16 · the Audience card takes focus only while it shows a problem */
  const card16 = branchOf(client, "export function ComposerAudience(", "function TestOutcome(");
  ok("§16.16 the Audience card is a programmatic tab stop, with its focus ring, ONLY while it shows a problem — a click inside a card with nothing wrong never frames it",
    card16.includes("tabIndex={flagged ? -1 : undefined}") && !card16.includes("tabIndex={-1}")
      && card16.includes('className={flagged ? "space-y-2 rounded-md brand-focus" : "space-y-2 rounded-md"}'),
    `card ${card16.length} chars · tab stops in it: ${occurrences(card16, "tabIndex=")}`);

  /* §16.21 · 2026-10-09 · the owner's ruling: "Another number" only for a viewer the door lets type one (§18.37–§18.39) */
  const iOffered = testCard.indexOf("{offered ? (");
  const iChoice = testCard.indexOf('<fieldset className="space-y-2" data-test-to-choice>');
  const iTypedChoice = testCard.indexOf('value="typed"');
  const iElse = iTypedChoice < 0 ? -1 : testCard.indexOf(") : (", iTypedChoice);
  const iSaid = testCard.indexOf('<div className="space-y-1" data-test-to="own">');
  const saidBranch = iSaid < 0 ? "" : testCard.slice(iSaid, testCard.indexOf("</div>", iSaid));
  const offeredOnly = {
    // the server's answer, never a decision of the card's own — no role is named in the client's code
    fromServer: testCard.includes("const offered = t.typedOffered;") && !/mayTestTypedNumber|[.]role\b|"ADMIN"|"COMPLIANCE"|"GROWTH"/.test(client),
    // the target is own whenever the choice is not offered — the state, what is posted, and the card's handles
    ownFirst: testCard.includes('useState<TestTarget>(t.ownNumberMasked !== null || !offered ? "own" : "typed")'),
    follows: testCard.includes('const typed = offered && target === "typed";') && testCard.includes('data-test-target={typed ? "typed" : "own"}')
      && testCard.includes('data-test-typed-offered={offered ? "yes" : "no"}'),
    // the choice — the fieldset and both radio cards — only inside the offered branch, and "Another number" nowhere else
    guarded: iOffered > 0 && iChoice > iOffered && iTypedChoice > iChoice && iElse > iTypedChoice && iSaid > iElse
      && occurrences(testCard, "data-test-to-choice") === 1 && occurrences(testCard, 'value="typed"') === 1
      && occurrences(client, "{COMPOSE_TEST_TO_TYPED}") === 1,
    // otherwise "Send the test to" and "My own number", said — no radio, no choice, nothing about another number
    saidAlone: saidBranch.includes("{COMPOSE_TEST_TO_LEGEND}") && saidBranch.includes("composeTestToOwn(t.ownNumberMasked)")
      && saidBranch.includes('data-test-choice="own"') && saidBranch.includes('data-test-choice-why="own"')
      && !/<input|TestToChoice|COMPOSE_TEST_TO_TYPED|typedView|onPick|type="radio"/.test(saidBranch),
    // a typed test refused for the role (changed since the page was read) re-reads the page — through the ONE mechanism,
    // the page-stale reasons, and no second path of its own
    reread: /const PAGE_STALE_REASONS = \[[^\]]*"typed_role"[^\]]*\];/.test(client)
      && sendBlock.includes('r.outcome === "refused" && PAGE_STALE_REASONS.includes(r.reason)) router.refresh();')
      && !sendBlock.includes("typed_role"),
  };
  ok("§16.21 ⛔ 2026-10-09 · 'ANOTHER NUMBER' ONLY FOR A VIEWER THE DOOR LETS TYPE ONE — the card takes the server's answer (typedOffered) and names no role itself; the choice — the fieldset with both radio cards — renders only while it is offered, and nowhere else; otherwise the card says 'Send the test to' and 'My own number' as text, with no radio, no choice and nothing about another number; the target is own whenever the choice is not offered (the state, the post and data-test-target follow it; data-test-typed-offered says which); and a typed_role refusal re-reads the page",
    Object.values(offeredOnly).every(Boolean), JSON.stringify(offeredOnly));

  /* §16.22 · 2026-10-09 · one sentence, one tone — the own number's reason, wherever the card says it */
  const whyTags = [...client.matchAll(/<(?:span|p)\b[^>]*\bdata-test-choice-why=[^>]*>/g)].map((m) => m[0]);
  const oneTone = whyTags.length === 2 && whyTags.every((tag) => /\btext-text-secondary\b/.test(tag) && !/\btext-danger/.test(tag))
    && occurrences(testCard, "t.ownNumberProblem") === 2;
  ok("§16.22 ⭐ 2026-10-09 · ONE SENTENCE, ONE TONE — the own number's reason (ownNumberProblem: the test send's TEST_OWN_NUMBER_UNUSABLE) is said in the card's secondary reason tone wherever the card says it — beside the disabled own radio and in the own-only card — never in the refusal red, and nowhere else",
    oneTone, JSON.stringify({ whyTags, uses: occurrences(testCard, "t.ownNumberProblem") }));
  return failed;
}

const SCREEN_SOURCES = loadScreenSources();

/* ══ §17–§18 — THE SAVE AND THE TEST SEND, DRIVEN (U37b, 2026-10-02) ════════════════════════════════════════
 * ⛔ ON THE MEMORY TWIN ONLY. `DATABASE_URL` (and Redis) are removed BEFORE the store is imported — the store picks its
 * twin at import, and nothing above this line imports it — so a run on a machine with a database configured can never
 * write a campaign, a token or a message into it. The console provider is pinned; the one real-carrier case (§18.5)
 * swaps in Blackball with DUMMY keys and a dead address and replaces `fetch` with a counter that refuses, so nothing in
 * this suite can reach a network.
 * ⭐ EVERY RUN BUILDS ITS OWN FIXTURES — unique officers, numbers and campaigns — so the red runs below never meet the
 * baseline's rows. */
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
process.env.SMS_PROVIDER = "console";
const { db } = await import("../src/lib/server/store.ts");
const DRAFT = await import("../src/lib/server/marketing/campaign-draft.ts");
const TEST = await import("../src/lib/server/marketing/campaign-test-send.ts");
const LIVE = await import("../src/lib/server/marketing/live-switch.ts");
const { dispatchSlice, auditRgRefusal } = await import("../src/lib/server/marketing/dispatch.ts");
const { recordPlayerMarketingChoice, mayReceiveMarketingSms, DB_GATE_READS } = await import("../src/lib/server/marketing/consent.ts");
// U33r · the REAL writer keys §18.36's referee numbers, exactly as setReferees does.
const { recordRefereeKeys } = await import("../src/lib/server/marketing/referee-exclusion.ts");
const { ensureOptOutToken, mintOptOutToken, stopMarketing } = await import("../src/lib/server/marketing/optout-service.ts");
/** U37c · §18.19's self-excluded player is made by the platform's own writer, never a hand-built row. */
const { selfExclude } = await import("../src/lib/server/responsible-gambling.ts");
const { getAuditPage, auditFlush } = await import("../src/lib/server/audit.ts");
const { maskPhone } = await import("../src/lib/phone-normalize.ts");
/** The validation audit's sections (2026-10-03) read the campaign door's sentences, the composer's words and its card. */
const AUDIENCE = await import("../src/lib/server/marketing/audience.ts");
const COMPOSE_COPY = await import("../src/app/admin/campaigns/new/composer-copy.ts");
const LOADER = await import("../src/app/admin/campaigns/new/composer-loader.ts");
/** 2026-10-09 · §18.37 asks the typed test's role decider of every role the console names. */
const ROLES = await import("../src/lib/server/roles.ts");
/** U13 · the test send and the send loop are handed a FIXED window here (ENGINE-SPEC §5 rule 9): §17–§18 hold at any clock,
 *  and §18.33 closes it on purpose. */
const { ALWAYS_OPEN, ALWAYS_CLOSED } = await import("./lib/send-window.mts");

type DraftInput = Parameters<typeof DRAFT.saveCampaignDraft>[0];
type TestDeps = typeof TEST.CAMPAIGN_TEST_DEPS;
type TestInput = Parameters<typeof TEST.sendCampaignTest>[0];
type TestResult = Awaited<ReturnType<typeof TEST.sendCampaignTest>>;
type StoredRow = NonNullable<Awaited<ReturnType<typeof db.smsCampaign.find>>>;

/** The memory twin's maps §17–§18 count in. */
type U37bMaps = {
  smsMessages: Map<string, { targetId: string | null; targetType: string | null; msisdn: string; purpose: string }>;
  smsCampaigns: Map<string, unknown>;
};
function u37bMaps(): U37bMaps {
  const s = (globalThis as unknown as { __50PICK_STORE?: U37bMaps }).__50PICK_STORE;
  if (!s || !s.smsMessages || !s.smsCampaigns) throw new Error("the memory store is not loaded — §17–§18 run on the memory twin only");
  return s;
}
const smsRowsFor = (targetId: string) => [...u37bMaps().smsMessages.values()].filter((m) => m.targetId === targetId);
const smsRowsTo = (msisdn: string) => [...u37bMaps().smsMessages.values()].filter((m) => m.msisdn === msisdn);
const campaignCount = () => u37bMaps().smsCampaigns.size;
const tokenCount = async (key: string) => (await db.marketingOptOutToken.listFor(key)).length;
const MASK_DOTS = cc(0x2022).repeat(4);

let u37bSeq = 0;
/** A fresh NDC-71 key per fixture (`25571` + seven digits): no run of these sections ever meets another's rows. */
function u37bKey(): string {
  u37bSeq++;
  return `25571${String(3700000 + u37bSeq)}`;
}

type OfficerFixture = { id: string; key: string; phone: string };
/** Every role `roles.ts` names — §18.37 asks the door with each. */
type FixtureRole = "PLAYER" | "AGENT" | "MODERATOR" | "ADMIN" | "COMPLIANCE" | "SUPPORT" | "FINANCE" | "GROWTH" | "AUDITOR";
/** An officer's own account — a GROWTH user unless `role` says (2026-10-09: a test to a typed number needs the Owner's
 *  role, `ADMIN`, or Compliance's) — with consent given the way a person gives it (the profile switch's writer). */
async function u37bOfficer(opts: { consent?: boolean; dob?: string | null; displayName?: string | null; phone?: string; role?: FixtureRole } = {}): Promise<OfficerFixture> {
  const key = u37bKey();
  const phone = opts.phone ?? `+${key}`;
  const id = `usr_u37b_${u37bSeq}`;
  const at = new Date().toISOString();
  await db.user.create({
    id, phoneE164: phone, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: opts.role ?? "GROWTH", status: "ACTIVE", locale: "EN", displayName: opts.displayName === undefined ? "Asha Officer" : opts.displayName,
    dob: opts.dob === undefined ? "1990-01-01" : opts.dob, region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: at,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null, createdAt: at, updatedAt: at,
    lastLoginAt: at, closedAt: null,
  });
  if (opts.consent !== false) {
    const r = await recordPlayerMarketingChoice({ userId: id, marketingOptIn: true, locale: "EN" });
    if (!r.ok) throw new Error(`fixture officer ${id}: the consent did not record`);
  }
  return { id, key: opts.phone ? phone.replace(/[^0-9]/g, "") : key, phone };
}
/** ⛔ 2026-10-09 · an officer who may type a number — the Owner (`ADMIN`); the ruling admits Compliance too (§18.37). */
const u37bTypist = (opts: Parameters<typeof u37bOfficer>[0] = {}): Promise<OfficerFixture> => u37bOfficer({ ...opts, role: "ADMIN" });

const U37B_SAVER = "usr_u37b_saver";
/** The real save's door with a silent audit — for fixtures, never for the save under test. */
const QUIET_DRAFT_DEPS = { ...DRAFT.CAMPAIGN_DRAFT_DEPS, audit: async () => ({}) };
const draftInput = (over: Partial<DraftInput> = {}): DraftInput => ({
  id: null, draftRevision: null, name: "U37b fixture", bodySw: "50pick: Habari {jina}, mechi kubwa leo.", bodyEn: "",
  nameFallbackSw: FB, nameFallbackEn: "Friend", audience: null, ...over,
});
/** A saved DRAFT through the REAL save — never a red case's — so a save plant cannot reach the test-send section. */
async function u37bDraft(over: Partial<DraftInput> = {}): Promise<string> {
  const r = await DRAFT.saveCampaignDraft(draftInput(over), U37B_SAVER, { viewerReads: true }, QUIET_DRAFT_DEPS);
  if (!r.ok) throw new Error(`fixture draft refused: ${r.error}`);
  return r.id;
}
/** A fresh draft moved to CONFIRMED through the campaign door's one conditional move. */
async function u37bConfirm(id: string): Promise<void> {
  const at = new Date().toISOString();
  const moved = await db.smsCampaign.transition(id, {
    from: ["DRAFT"], to: "CONFIRMED", draftRevision: 0, at,
    patch: {
      audienceCount: 5, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: 5, estimateTzs: null, budgetTzs: null,
      confirmedBy: "usr_u37b_owner", confirmedAt: at,
    },
  });
  if (moved === null) throw new Error(`fixture ${id} could not be confirmed`);
}
/** The stored row as the renderer reads it. */
function u37bTemplate(row: StoredRow): CampaignTemplate {
  return {
    bodySw: row.bodySw, bodyEn: row.bodyEn ?? "", nameFallbackSw: row.nameFallbackSw ?? "", nameFallbackEn: row.nameFallbackEn ?? "",
    sourcePhrase: row.sourcePhrase ?? "",
  };
}

type Outbound = { to: string; body: string; targetType?: string; targetId?: string };
type SendSpy = { calls: number; messages: Outbound[] };
/** A transport stand-in: it records the batch and answers as told — taken, held by the credit floor, a lost reply, or a throw. */
function u37bSpy(answer: "accept" | "floor" | "transport" | "throw" | "rejected" | "unknown" = "accept"): { send: TestDeps["send"]; spy: SendSpy } {
  const spy: SendSpy = { calls: 0, messages: [] };
  const send = async (ms: Outbound[]) => {
    spy.calls++;
    spy.messages.push(...ms);
    const keyed = (m: Outbound) => ({ to: m.to, targetType: m.targetType ?? null, targetId: m.targetId ?? null });
    if (answer === "throw") throw new Error("the transport threw (fixture)");
    if (answer === "floor") {
      return { results: ms.map((m) => ({ ...keyed(m), reference: "", ok: false, code: "BALANCE_FLOOR", error: "below the floor" })), balanceTzs: 10, refused: "BALANCE_FLOOR" };
    }
    if (answer === "transport") {
      return { results: ms.map((m) => ({ ...keyed(m), reference: `sms_lost_${spy.calls}`, ok: false, code: "TRANSPORT", error: "reply lost" })), balanceTzs: null };
    }
    // U43b-2 review · the gateway's own "no", and sendBatch's chunk catch for a transport that threw before its request
    if (answer === "rejected") {
      return { results: ms.map((m) => ({ ...keyed(m), reference: `sms_refused_${spy.calls}`, ok: false, code: "REJECTED", error: "Invalid credentials" })), balanceTzs: null };
    }
    if (answer === "unknown") {
      return { results: ms.map((m) => ({ ...keyed(m), reference: `sms_prewire_${spy.calls}`, ok: false, code: "UNKNOWN", error: "a fault before the request (fixture)" })), balanceTzs: null };
    }
    return { results: ms.map((m, i) => ({ ...keyed(m), reference: `sms_fixture_${spy.calls}_${i}`, ok: true })), balanceTzs: null };
  };
  return { send: send as unknown as TestDeps["send"], spy };
}
const ALLOW = async () => ({ allowed: true, remaining: 3, retryAfterSec: 0 });
const reasonOf = (r: TestResult): string => (r.ok ? "HANDED OVER" : "reason" in r ? String(r.reason) : r.outcome);

/** Each member is what a red case swaps — one at a time. */
type ComposeImpl = {
  save: typeof DRAFT.saveCampaignDraft;
  test: typeof TEST.sendCampaignTest;
  readSwitch: typeof LIVE.readMarketingLiveSwitch;
  liveGate: typeof LIVE.marketingLiveGate;
  ensureToken: typeof ensureOptOutToken;
  /** ⛔ THE SHIPPED WIRING (U37b review M1): §18.5, §18.15 and §18.16 run ITS switch reader, token rule and audit — the
   *  suite's own stand-ins above cannot see a regression in `CAMPAIGN_TEST_DEPS` itself. */
  testDeps: TestDeps;
  /** campaign-test-send.ts as text — §18.14 pins the wires it is built from. */
  testSendSource: string;
  /** U43b-1 · the send step itself (`dispatchSlice`) — §18.34 asks it how a lost reply arrives, alone and under the test. */
  dispatch: typeof dispatchSlice;
  /** The composer's Audience card (`composeAudienceView`) — §17.8 asks it for a masked viewer, the save's own rule. */
  audienceView: typeof LOADER.composeAudienceView;
  /** U37s · the line the composer's counter prices (`composerSourcePhrase`) — §17.16. */
  sourceLine: typeof LOADER.composerSourcePhrase;
  /** U37s · the composer's stale-stamp flag (`composerSourceLineStale`) — §17.19. */
  staleLine: typeof LOADER.composerSourceLineStale;
  /** U37c · the Test card's typed view (`composeTypedView`) — §18.22. */
  typedView: typeof LOADER.composeTypedView;
  /** U37s · the three files whose wiring §17.20 reads: the save, the loader and the screen. */
  draftSource: string;
  loaderSource: string;
  clientSource: string;
};
const REAL_COMPOSE: ComposeImpl = {
  save: DRAFT.saveCampaignDraft, test: TEST.sendCampaignTest, readSwitch: LIVE.readMarketingLiveSwitch,
  liveGate: LIVE.marketingLiveGate, ensureToken: ensureOptOutToken,
  testDeps: TEST.CAMPAIGN_TEST_DEPS,
  testSendSource: readFileSync(new URL("../src/lib/server/marketing/campaign-test-send.ts", import.meta.url), "utf8"),
  dispatch: dispatchSlice,
  audienceView: LOADER.composeAudienceView,
  sourceLine: LOADER.composerSourcePhrase,
  staleLine: LOADER.composerSourceLineStale,
  typedView: LOADER.composeTypedView,
  draftSource: readFileSync(new URL("../src/lib/server/marketing/campaign-draft.ts", import.meta.url), "utf8"),
  loaderSource: readFileSync(new URL("../src/app/admin/campaigns/new/composer-loader.ts", import.meta.url), "utf8"),
  clientSource: readFileSync(new URL("../src/app/admin/campaigns/new/composer-client.tsx", import.meta.url), "utf8"),
};
/** U37s · §17.18 saves the source line through the SHIPPED setter — the store the save reads. */
const WORDINGS = await import("../src/lib/server/marketing/wordings.ts");
/** U37s · Ali's approved source line (G5, 2026-10-05 — 30 septets, the limit) and a shorter line, as saved wordings would read. */
const LINE37S_A = "Namba yako ipo orodhani kwetu.";
const LINE37S_B = "Orodha yetu.";

/* ══ §16.11–§16.13 — THE COMPOSER'S WORDS, EXECUTED (the validation audit, 2026-10-03) ══════════════════════════════════
 * What the counter row offers, what its line says while Unicode leaves no room, and the sentences a save, a refusal and
 * an unusable own number print — each member swappable, so a plant replaces exactly one in memory. */
type WordsImpl = {
  foldOffered: typeof COMPOSE_COPY.foldOffered;
  counterLine: typeof COMPOSE_COPY.counterLine;
  composeSaved: typeof COMPOSE_COPY.composeSaved;
  bodyHint: string;
  saveUnfinished: string;
  testUnfinished: string;
  ownNumberUnusable: string;
};
const REAL_WORDS: WordsImpl = {
  foldOffered: COMPOSE_COPY.foldOffered, counterLine: COMPOSE_COPY.counterLine, composeSaved: COMPOSE_COPY.composeSaved,
  bodyHint: COMPOSE_COPY.COMPOSE_BODY_SW_HINT, saveUnfinished: COMPOSE_COPY.COMPOSE_SAVE_UNFINISHED, testUnfinished: COMPOSE_COPY.COMPOSE_TEST_UNFINISHED,
  ownNumberUnusable: TEST.TEST_OWN_NUMBER_UNUSABLE,
};
const EMOJI16 = String.fromCodePoint(0x1F600);
/** A pasted curly quote beside an emoji — one offender with a plain twin, one without. */
const MIXED16 = `50pick: Habari${RSQ15}s ${EMOJI16} leo`;

function checkComposerWords(w: WordsImpl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  log(`${NL15}§16.11–§16.13 · THE COMPOSER'S WORDS — the fold offer, the counter line, what a save and a refusal say`);

  /* §16.11 · the fold is offered when ANY offender has a plain twin */
  {
    const both = counterFor(MIXED16, "SW", FB, "");
    const folded = counterFor(foldToGsm7(MIXED16), "SW", FB, "");
    const emojiOnly = counterFor(`50pick: Habari ${EMOJI16} leo`, "SW", FB, "");
    ok("§16.11 ⭐ 'REPLACE WITH PLAIN CHARACTERS' IS OFFERED WHEN ANY OFFENDER FOLDS — an emoji beside a curly quote no longer hides it; after the fold only the emoji is named, and nothing more is offered (an emoji alone never is)",
      both.offenders.length === 2 && w.foldOffered(both)
        && folded.encoding === "UCS2" && folded.offenders.length === 1 && folded.offenders[0].ch === EMOJI16 && !w.foldOffered(folded)
        && emojiOnly.encoding === "UCS2" && !w.foldOffered(emojiOnly),
      JSON.stringify({ both: both.offenders.map((o) => o.label), folded: folded.offenders.map((o) => o.label), offered: [w.foldOffered(both), w.foldOffered(folded), w.foldOffered(emojiOnly)] }));
  }

  /* §16.12 · the counter line never asks for a cut that cannot fix it */
  {
    const spaced = (s: string) => s.split(NBSP15).join(" ");
    const uni = counterFor(UNI15, "SW", FB, "");
    const gsmOver = counterFor(`${fillTo(HEAD, operatorBudget("SW"))}aa`, "SW", FB, "");
    const lineU = spaced(w.counterLine(uni));
    const lineG = spaced(w.counterLine(gsmOver));
    ok(`§16.12 ⛔ THE COUNTER LINE NEVER ASKS FOR A CUT THAT CANNOT FIX IT — Unicode keeps its whole 70 (nothing is appended), so a short Unicode body reads '${uni.left} characters left · 1 message · Unicode', no 'over' and no negative; a GSM-7 body two past its room reads '2 over'`,
      uni.budget === 70 && lineU === `${uni.left} characters left · 1 message · Unicode`
        && !/over/.test(lineU) && !NEG_NUMBER.test(lineU)
        && lineG === `2 over · ${gsmOver.segments} messages · the limit is ${SMS_MAX_SEGMENTS}`,
      `unicode "${lineU}" (room ${uni.budget}) · GSM-7 "${lineG}"`);
  }

  /* §16.13 · what a save, an unfinished action and an unusable own number say */
  {
    const saved = w.composeSaved("2026-10-03T11:02:00.000Z", true);
    const noTest = w.composeSaved("2026-10-03T11:02:00.000Z", false);
    ok("§16.13 THE WORDS SAY WHAT HAPPENED AND WHAT IS NEXT — a save reads 'Draft saved HH:MM' then that nothing was sent, and names the test below ONLY when the page can send one; the Swahili hint is built from the identity and the placeholder themselves; an unfinished save or test says to check first, never to try again; an unusable own number says the number can't be changed and names who to ask and where (the owner, /admin/staff), promising no step the owner may not take",
      /^Draft saved [0-9]{2}:[0-9]{2} /.test(saved) && saved.endsWith("nothing was sent. Send yourself a test below.")
        && /^Draft saved [0-9]{2}:[0-9]{2} /.test(noTest) && noTest.endsWith("nothing was sent.") && !/test/i.test(noTest)
        && w.bodyHint === `Begin with ${SENDER_IDENTITY} (lower case). ${JINA} prints the first name.`
        && w.saveUnfinished.includes("before saving again") && !/try again/i.test(w.saveUnfinished)
        && w.testUnfinished.includes("Check your phone") && !/try again/i.test(w.testUnfinished)
        && w.ownNumberUnusable.includes("can't be changed") && w.ownNumberUnusable.includes("ask the owner")
        && w.ownNumberUnusable.includes("/admin/staff") && !/an account on your/i.test(w.ownNumberUnusable),
      JSON.stringify({ saved, noTest, hint: w.bodyHint, own: w.ownNumberUnusable }));
  }
  return failed;
}

/* ── §17 · the save ── */
async function checkSave(impl: ComposeImpl, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const claim = async (label: string, fn: () => Promise<[boolean, string?]>) => {
    try {
      const [c, x] = await fn();
      ok(label, c, x ?? "");
    } catch (err) {
      ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
    }
  };
  log(`${NL15}§17 · THE SAVE — the server's verdict and the server's figures, one compare-and-set, never one phone number`);
  u37bSeq++;
  const officerId = `usr_u37b_save_${u37bSeq}`;
  const audits: Array<{ action: string; actorId: string | null; targetId: string | null }> = [];
  const deps = { ...DRAFT.CAMPAIGN_DRAFT_DEPS, audit: async (e: { action: string; actorId: string | null; targetId: string | null }) => { audits.push(e); return {}; } };
  const save = (input: DraftInput, viewerReads = true) => impl.save(input, officerId, { viewerReads }, deps as typeof DRAFT.CAMPAIGN_DRAFT_DEPS);

  await claim("§17.1 ⭐ THE SERVER RE-VALIDATES — a body 3 over in the worst case, posted with injected figures (segmentsSw:1, codingSw:'GSM7'), is refused 'invalid' on bodySw, and NO row is written", async () => {
    const before = campaignCount();
    const over = `${fillTo(HEAD, operatorBudget("SW", RESERVE))}aaa`;
    const lie = { ...draftInput({ name: "Over the cap", bodySw: over }), segmentsSw: 1, codingSw: "GSM7", segmentsEn: 1, codingEn: "GSM7" } as unknown as DraftInput;
    const r = await save(lie);
    return [!r.ok && r.reason === "invalid" && (r.problems.bodySw?.length ?? 0) > 0 && campaignCount() === before,
      `${r.ok ? "SAVED" : r.reason} · rows ${before} → ${campaignCount()}`];
  });

  await claim("§17.2 ⭐ X15 · A VALID SAVE STORES THE SERVER'S FIGURES — born a DRAFT at revision 0, created by the officer, each body with its OWN counter's coding and segments (never the posted 7 / UCS2 / 9), no source line, the whole book as its audience — and ONE marketing.campaign_created row", async () => {
    const lies = {
      ...draftInput({ name: "Figures", bodyEn: EN_BODY }),
      segmentsSw: 7, codingSw: "UCS2", segmentsEn: 9, codingEn: "UCS2", sourcePhrase: "Typed by a browser", status: "CONFIRMED", createdBy: "usr_somebody_else",
    } as unknown as DraftInput;
    const r = await save(lies);
    const row = r.ok ? await db.smsCampaign.find(r.id) : null;
    const sw = counterFor(draftInput().bodySw, "SW", FB, "");
    const en = counterFor(EN_BODY, "EN", "Friend", "");
    const created = row === null ? 0 : audits.filter((a) => a.action === DRAFT.CAMPAIGN_CREATED_ACTION && a.targetId === row.id && a.actorId === officerId).length;
    return [r.ok && r.created && row !== null && row.status === "DRAFT" && row.draftRevision === 0 && row.createdBy === officerId
      && row.codingSw === sw.encoding && row.segmentsSw === sw.segments && sw.segments === 1
      && row.bodyEn === EN_BODY && row.codingEn === en.encoding && row.segmentsEn === en.segments && en.segments === 1
      && row.sourcePhrase === null && row.audienceFilter === "{}" && created === 1,
      row === null ? `no row (${r.ok ? "saved?" : r.error})`
        : `stored ${row.codingSw}/${row.segmentsSw} · ${row.codingEn}/${row.segmentsEn} · ${row.status} rev ${row.draftRevision} by ${row.createdBy} · phrase ${row.sourcePhrase} · audience ${row.audienceFilter} · created rows ${created}`];
  });

  await claim("§17.3 ⭐ X12 · ONE COMPARE-AND-SET — an edit on the revision the form carried lands (0 → 1); the same edit on the OLD revision, and an edit with no revision at all, are refused 'stale' (saying when it was saved), and the stored body stays the first edit's", async () => {
    const made = await save(draftInput({ name: "CAS" }));
    if (!made.ok) return [false, `fixture refused: ${made.error}`];
    const first = await save(draftInput({ id: made.id, draftRevision: 0, name: "CAS", bodySw: "50pick: Toleo la pili, soka leo." }));
    const stale = await save(draftInput({ id: made.id, draftRevision: 0, name: "CAS", bodySw: "50pick: Toleo la zamani linashinda." }));
    const blind = await save(draftInput({ id: made.id, draftRevision: null, name: "CAS", bodySw: "50pick: Bila toleo." }));
    const row = await db.smsCampaign.find(made.id);
    return [first.ok && !first.created && first.draftRevision === 1
      && !stale.ok && stale.reason === "stale" && stale.error.includes("saved this draft at")
      && !blind.ok && blind.reason === "stale"
      && row !== null && row.bodySw === "50pick: Toleo la pili, soka leo." && row.draftRevision === 1,
      `first ${first.ok ? `rev ${first.draftRevision}` : first.reason} · stale ${stale.ok ? "SAVED" : stale.reason} · blind ${blind.ok ? "SAVED" : blind.reason} · stored "${row?.bodySw}" rev ${row?.draftRevision}`];
  });

  await claim("§17.4 a campaign that left DRAFT cannot be edited — 'not_draft', its body unchanged — and an id that names nothing is 'not_found'", async () => {
    const made = await save(draftInput({ name: "Confirmed" }));
    if (!made.ok) return [false, `fixture refused: ${made.error}`];
    await u37bConfirm(made.id);
    const nd = await save(draftInput({ id: made.id, draftRevision: 0, name: "Confirmed", bodySw: "50pick: Haipaswi kubadilika." }));
    const nf = await save(draftInput({ id: "cmp_u37b_nobody_here", draftRevision: 0 }));
    const row = await db.smsCampaign.find(made.id);
    return [!nd.ok && nd.reason === "not_draft" && row !== null && row.status === "CONFIRMED" && row.bodySw === draftInput().bodySw
      && !nf.ok && nf.reason === "not_found",
      `confirmed → ${nd.ok ? "EDITED" : nd.reason} · unknown → ${nf.ok ? "SAVED" : nf.reason} · stored "${row?.bodySw}"`];
  });

  await claim("§17.5 ⛔ OD55 · A CAMPAIGN AUDIENCE IS NEVER ONE PHONE NUMBER — a whole-number search in each of its four spellings is refused 'invalid' on the audience card (a group, never one number; the test send for one phone) and writes no row; a NAME search is saved as the filter it is", async () => {
    const before = campaignCount();
    const spellings = ["0712345678", "+255712345678", "255712345678", "712345678"];
    const refused: string[] = [];
    for (const q of spellings) {
      const r = await save(draftInput({ name: `One number ${refused.length}`, audience: { q } }));
      if (!r.ok && r.reason === "invalid" && (r.problems.audience ?? []).some((p) => p.includes("never to one phone number") && p.includes("test send"))) refused.push(q);
    }
    const afterRefusals = campaignCount();
    const named = await save(draftInput({ name: "A name search", audience: { q: "Asha" } }));
    const row = named.ok ? await db.smsCampaign.find(named.id) : null;
    return [refused.length === spellings.length && afterRefusals === before && row !== null && row.audienceFilter === '{"q":"Asha"}',
      `refused ${refused.length} of ${spellings.length} · rows ${before} → ${afterRefusals} · the name search stored ${row?.audienceFilter ?? "NOTHING"}`];
  });
  await claim("§17.5b ⛔ OD55 · …AND IN NO OTHER FIELD (U37b review m4) — a whole number as a tag, a list id or an import id, or a search padded past the number parser (\"0712345678 0\" stays name text), is refused the same way and writes no row; a tag with a few digits is saved, and so is a deposit band (5000-10000, the vb5 review m3)", async () => {
    const before = campaignCount();
    const smuggled: Array<Record<string, string>> = [{ tag: "0712345678" }, { list: "0712345678" }, { import: "255712345678" }, { q: "0712345678 0" }];
    const refused: string[] = [];
    for (const audience of smuggled) {
      const r = await save(draftInput({ name: `Smuggled ${refused.length}`, audience }));
      if (!r.ok && r.reason === "invalid" && (r.problems.audience ?? []).some((p) => p.includes("never to one phone number"))) refused.push(Object.keys(audience)[0]);
    }
    const after = campaignCount();
    const fine = await save(draftInput({ name: "A tag with digits", audience: { tag: "vip2026" } }));
    // vb5 review m3 · a deposit band holds nine digits and no number — the book stores it as a tag, so OD55 lets it be aimed at.
    const band = await save(draftInput({ name: "A deposit band", audience: { tag: "5000-10000" } }));
    return [refused.length === smuggled.length && after === before && fine.ok && band.ok,
      `refused [${refused.join(", ")}] of ${smuggled.length} · rows ${before} → ${after} · vip2026 ${fine.ok ? "saved" : "REFUSED"} · 5000-10000 ${band.ok ? "saved" : "REFUSED"}`];
  });

  /* ── §17.7–§17.11 · the validation audit (2026-10-03) ── */
  await claim("§17.7 ⛔ X25 · A MASKED VIEWER'S POSTED SEARCH MEETS THE CAMPAIGN DOOR'S OWN RULE — q=asha posted by a viewer who may not read a number is refused 'invalid' on the audience card with the sentence U38a's count gives (CAMPAIGN_SEARCH_REFUSAL_REASON) and writes no row; a reader's is saved; and that STORED search is kept when a masked viewer next saves the draft (noted, never blocked)", async () => {
    const before = campaignCount();
    const masked = await save(draftInput({ name: "Masked search", audience: { q: "asha" } }), false);
    const afterRefusal = campaignCount();
    const reader = await save(draftInput({ name: "Reader search", audience: { q: "asha" } }), true);
    const kept = reader.ok
      ? await save(draftInput({ id: reader.id, draftRevision: reader.draftRevision, name: "Reader search, edited by a masked viewer" }), false)
      : null;
    const row = reader.ok ? await db.smsCampaign.find(reader.id) : null;
    return [!masked.ok && masked.reason === "invalid" && (masked.problems.audience ?? []).includes(AUDIENCE.CAMPAIGN_SEARCH_REFUSAL_REASON)
      && afterRefusal === before && reader.ok && kept !== null && kept.ok && row !== null && row.audienceFilter === '{"q":"asha"}',
      `masked ${masked.ok ? "SAVED" : masked.reason} · rows ${before} → ${afterRefusal} · reader ${reader.ok ? "saved" : reader.error} · masked re-save ${kept === null ? "-" : kept.ok ? "saved" : kept.error} · stored ${row?.audienceFilter ?? "NOTHING"}`];
  });

  await claim("§17.8 ⛔ X25 · THE CARD ASKS THE SAVE'S RULE — ?q=asha for a masked viewer is refused on the Audience card with the same sentence, nothing described, and 'Remove the filter' leads to the draft's own address for this viewer (draftAddressFor — its stored audience carried, so no redirect fires inside the mounted composer; the bare composer for a new draft); a reader's is described, with no remove control; a STORED search this viewer may not use is noted and never blocks Save", async () => {
    const made = await save(draftInput({ name: "Card fixture" }));
    if (!made.ok) return [false, `fixture refused: ${made.error}`];
    const row = await db.smsCampaign.find(made.id);
    if (row === null) return [false, "the fixture draft was not stored"];
    const masked = impl.audienceView({ draft: made.id, q: "asha" }, row, false);
    const reader = impl.audienceView({ draft: made.id, q: "asha" }, row, true);
    const blank = impl.audienceView({ q: "asha" }, null, false);
    const stored = impl.audienceView({ draft: made.id }, { ...row, audienceFilter: '{"q":"asha"}' }, false);
    return [masked.problem === AUDIENCE.CAMPAIGN_SEARCH_REFUSAL_REASON && masked.lines.length === 0
      && masked.clearHref === LOADER.draftAddressFor(row, false) && masked.clearHref.startsWith(`/admin/campaigns/new?draft=${encodeURIComponent(made.id)}`)
      && reader.problem === null && reader.lines.length > 0 && reader.clearHref === null
      && blank.problem === AUDIENCE.CAMPAIGN_SEARCH_REFUSAL_REASON && blank.clearHref === "/admin/campaigns/new"
      && stored.problem === null && stored.note !== null && stored.lines.length === 0 && stored.clearHref === null,
      JSON.stringify({ masked: [masked.problem, masked.clearHref, masked.lines.length], reader: [reader.problem, reader.clearHref, reader.lines.length], blank: blank.clearHref, stored: [stored.problem, stored.note, stored.lines.length] })];
  });

  await claim("§17.9 ⛔ A {jina} FALLBACK IS STORED ONLY WHILE ITS BODY USES {jina} — a body without it stores null for both words (the hidden 'Rafiki1', and an English word with no English body), and a body with it stores its word trimmed ('Mteja ' becomes 'Mteja')", async () => {
    const without = await save(draftInput({ name: "No placeholder", bodySw: "50pick: Mechi kubwa leo.", nameFallbackSw: "Rafiki1", nameFallbackEn: "Friend" }));
    const withIt = await save(draftInput({ name: "Placeholder", nameFallbackSw: "Mteja " }));
    const a = without.ok ? await db.smsCampaign.find(without.id) : null;
    const b = withIt.ok ? await db.smsCampaign.find(withIt.id) : null;
    return [a !== null && a.nameFallbackSw === null && a.nameFallbackEn === null && b !== null && b.nameFallbackSw === "Mteja" && b.nameFallbackEn === null,
      `without {jina}: ${a === null ? (without.ok ? "no row" : without.error) : `${a.nameFallbackSw}/${a.nameFallbackEn}`} · with: ${b === null ? (withIt.ok ? "no row" : withIt.error) : `${JSON.stringify(b.nameFallbackSw)}/${b.nameFallbackEn}`}`];
  });

  await claim("§17.10 ⛔ OD55 ON THE LABEL, AND THE NAME AS JUDGED — the save asks the ONE verdict: 'Juma 0712 345 678 VIP' is refused 'invalid' on the name with the verdict's own sentence (a campaign row is never deleted) and writes no row, while 'Derby 2026-10-03 18:00' — a date and a time — is saved; the name stored is the cleaned one (a zero-width space and a direction override gone, the spaces collapsed)", async () => {
    const before = campaignCount();
    const phone = await save(draftInput({ name: "Juma 0712 345 678 VIP" }));
    const afterRefusal = campaignCount();
    const messy = await save(draftInput({ name: `  Derby${ZWSP15}   week ${RLO16}` }));
    const dated = await save(draftInput({ name: "Derby 2026-10-03 18:00" }));
    const row = messy.ok ? await db.smsCampaign.find(messy.id) : null;
    return [!phone.ok && phone.reason === "invalid" && (phone.problems.name ?? []).includes(campaignNameHoldsNumber("0712345678")) && afterRefusal === before
      && row !== null && row.name === "Derby week" && dated.ok,
      `phone ${phone.ok ? "SAVED" : phone.reason} · rows ${before} → ${afterRefusal} · stored ${JSON.stringify(row?.name ?? null)} · the dated name ${dated.ok ? "saved" : dated.error}`];
  });

  await claim("§17.11 ⛔ A REVISION PAST POSTGRES INTEGER IS 'NO REVISION' — an edit posted with draftRevision 2,147,483,648 is refused 'stale' (saying when it was saved), never thrown into the campaign door, and the stored row is untouched", async () => {
    const made = await save(draftInput({ name: "Revision cap" }));
    if (!made.ok) return [false, `fixture refused: ${made.error}`];
    const r = await save(draftInput({ id: made.id, draftRevision: 2147483648, name: "Revision cap", bodySw: "50pick: Haipaswi kuandikwa." }));
    const row = await db.smsCampaign.find(made.id);
    return [!r.ok && r.reason === "stale" && r.error.includes("saved this draft at") && row !== null && row.draftRevision === 0 && row.bodySw === draftInput().bodySw,
      `${r.ok ? "SAVED" : r.reason} · stored rev ${row?.draftRevision} "${row?.bodySw}"`];
  });

  await claim("§17.12 ⛔ 'SAVE AS A NEW DRAFT' KEEPS THE AUDIENCE ON SCREEN — the card hands a stored filter over written as an address (carry), and a NEW draft saved with it stores that same filter, never the whole book; the whole book carries as no filter at all; a stored search a masked viewer may not post, and a refused address filter, carry nothing (the save is then not offered)", async () => {
    const made = await save(draftInput({ name: "Carry fixture", audience: { tag: "vip" } }));
    if (!made.ok) return [false, `fixture refused: ${made.error}`];
    const row = await db.smsCampaign.find(made.id);
    if (row === null) return [false, "the fixture draft was not stored"];
    const kept = impl.audienceView({ draft: made.id }, row, true);
    const copy = kept.carry === null ? null : await save(draftInput({ name: "Carry fixture, kept as new", audience: kept.carry }));
    const copied = copy !== null && copy.ok ? await db.smsCampaign.find(copy.id) : null;
    const book = impl.audienceView({}, null, true);
    const hidden = impl.audienceView({ draft: made.id }, { ...row, audienceFilter: '{"q":"asha"}' }, false);
    const refused = impl.audienceView({ q: "asha" }, null, false);
    return [row.audienceFilter === '{"tags":["vip"]}' && copied !== null && copied.audienceFilter === row.audienceFilter
      && book.carry !== null && Object.keys(book.carry).length === 0 && hidden.carry === null && refused.carry === null,
      JSON.stringify({ stored: row.audienceFilter, carry: kept.carry, copied: copied?.audienceFilter ?? (copy === null ? "nothing carried" : copy.ok ? "no row" : copy.error), book: book.carry, hidden: hidden.carry, refused: refused.carry })];
  });

  /* ── §17.13–§17.16 · U37s, the source line stamped (2026-10-05) ── */
  /** The save as it runs while the saved `source.phrase` wording reads `line` (null: nothing saved). */
  const saveUnder = (line: string | null, input: DraftInput) =>
    impl.save(input, officerId, { viewerReads: true }, { ...deps, sourcePhrase: () => ({ ok: true, phrase: line }) } as typeof DRAFT.CAMPAIGN_DRAFT_DEPS);
  const phraseOf = (r: Awaited<ReturnType<typeof saveUnder>>, row: StoredRow | null) =>
    row === null ? (r.ok ? "no row" : r.error) : JSON.stringify(row.sourcePhrase);

  await claim("§17.13 ⭐ U37s · A DRAFT SAVE STILL STAMPS THE SAVED SOURCE LINE, AND NEVER PRICES IT — saved while the line reads 'Namba yako ipo orodhani kwetu.', a new draft stores exactly that line; a body sized to the whole message's room is saved under a 12-character line with its own counter's segments, and under a blank line too (the line is never printed — 2026-10-09)", async () => {
    const stamped = await saveUnder(LINE37S_A, draftInput({ name: "Stamped line" }));
    const row = stamped.ok ? await db.smsCampaign.find(stamped.id) : null;
    const sized = draftInput({ name: "Priced line", bodySw: fillTo(HEAD, operatorBudget("SW")) });
    const priced = await saveUnder(LINE37S_B, sized);
    const pricedRow = priced.ok ? await db.smsCampaign.find(priced.id) : null;
    const blank = await saveUnder(null, sized);
    const own = counterFor(sized.bodySw, "SW", FB, LINE37S_B);
    return [row !== null && row.sourcePhrase === LINE37S_A
      && pricedRow !== null && pricedRow.sourcePhrase === LINE37S_B && pricedRow.segmentsSw === own.segments && own.left === 0 && own.segments === 1
      && blank.ok,
      `stamped ${phraseOf(stamped, row)} · priced ${phraseOf(priced, pricedRow)} (${pricedRow?.segmentsSw}/${own.segments}, left ${own.left}) · under a blank line ${blank.ok ? "SAVED" : blank.reason}`];
  });

  await claim("§17.14 ⛔ U37s · BLANK WHILE UNSAVED — with no line saved a draft stores NO source line (null, never the reserve's placeholder), and so does a line saved as spaces only; and the ONE reader answers null on a store where no line was ever saved", async () => {
    const none = await saveUnder(null, draftInput({ name: "Unsaved line" }));
    const spaces = await saveUnder("   ", draftInput({ name: "Spaces line" }));
    const noneRow = none.ok ? await db.smsCampaign.find(none.id) : null;
    const spacesRow = spaces.ok ? await db.smsCampaign.find(spaces.id) : null;
    const reader = DRAFT.savedSourcePhrase();
    return [noneRow !== null && noneRow.sourcePhrase === null && spacesRow !== null && spacesRow.sourcePhrase === null && reader === null,
      `unsaved ${phraseOf(none, noneRow)} · spaces ${phraseOf(spaces, spacesRow)} · reader ${JSON.stringify(reader)}`];
  });

  await claim("§17.15 ⛔ U37s · AN EDIT RE-STAMPS; A CONFIRMED CAMPAIGN KEEPS ITS OWN — a draft stamped under line A and edited after the saved line became B stores B, never the stale A, and edited after the line was cleared stores none; a campaign confirmed under A keeps A when the line changes, and a save of it is refused 'not_draft' with A untouched", async () => {
    const made = await saveUnder(LINE37S_A, draftInput({ name: "Re-stamped line" }));
    if (!made.ok) return [false, `fixture refused: ${made.error}`];
    const edited = await saveUnder(LINE37S_B, draftInput({ id: made.id, draftRevision: 0, name: "Re-stamped line" }));
    const row = await db.smsCampaign.find(made.id);
    const cleared = await saveUnder(null, draftInput({ id: made.id, draftRevision: 1, name: "Re-stamped line" }));
    const clearedRow = await db.smsCampaign.find(made.id);
    const frozen = await saveUnder(LINE37S_A, draftInput({ name: "Frozen line" }));
    if (!frozen.ok) return [false, `fixture refused: ${frozen.error}`];
    await u37bConfirm(frozen.id);
    const late = await saveUnder(LINE37S_B, draftInput({ id: frozen.id, draftRevision: 0, name: "Frozen line" }));
    const frozenRow = await db.smsCampaign.find(frozen.id);
    return [edited.ok && row !== null && row.sourcePhrase === LINE37S_B
      && cleared.ok && clearedRow !== null && clearedRow.sourcePhrase === null
      && !late.ok && late.reason === "not_draft" && frozenRow !== null && frozenRow.status === "CONFIRMED" && frozenRow.sourcePhrase === LINE37S_A,
      `edited ${edited.ok ? JSON.stringify(row?.sourcePhrase) : edited.reason} · cleared ${cleared.ok ? JSON.stringify(clearedRow?.sourcePhrase) : cleared.reason} · confirmed ${late.ok ? "SAVED" : late.reason}, keeps ${JSON.stringify(frozenRow?.sourcePhrase)}`];
  });

  await claim("§17.16 ⭐ U37s · THE COUNTER PRICES THE LINE THE SAVE STAMPS — a new composer and a DRAFT stamped under an older line are priced with the SAVED line (the next save re-stamps it), and with the reserve (blank) once the saved line is cleared or while none was ever saved; a campaign past DRAFT is priced with its own frozen line, whatever is saved now", async () => {
    const draftA = { status: "DRAFT", sourcePhrase: LINE37S_A } as unknown as StoredRow;
    const confirmedA = { status: "CONFIRMED", sourcePhrase: LINE37S_A } as unknown as StoredRow;
    const confirmedNone = { status: "CONFIRMED", sourcePhrase: null } as unknown as StoredRow;
    const v = impl.sourceLine;
    const got = {
      fresh: v(null, LINE37S_B), draft: v(draftA, LINE37S_B), never: v(null, null), cleared: v(draftA, null),
      confirmed: v(confirmedA, LINE37S_B), confirmedNone: v(confirmedNone, LINE37S_B),
    };
    return [got.fresh === LINE37S_B && got.draft === LINE37S_B && got.never === "" && got.cleared === ""
      && got.confirmed === LINE37S_A && got.confirmedNone === "", JSON.stringify(got)];
  });

  /* ── §17.17–§17.20 · U37s review (2026-10-05): the fresh read, the real wiring, the stale draft ── */
  await claim("§17.17 ⛔ U37s · A SOURCE LINE THAT COULD NOT BE READ IS NO SAVE — with the fresh read answering no answer, a new draft is refused 'source_unreadable' with its sentence and writes no row, and an edit of a draft stamped A is refused with A and its revision untouched — never a guessed or blank stamp over a good line", async () => {
    const unread = { ...deps, sourcePhrase: () => ({ ok: false as const }) } as typeof DRAFT.CAMPAIGN_DRAFT_DEPS;
    const before = campaignCount();
    const fresh = await impl.save(draftInput({ name: "Unread line" }), officerId, { viewerReads: true }, unread);
    const written = campaignCount() - before;
    const made = await saveUnder(LINE37S_A, draftInput({ name: "Unread edit" }));
    if (!made.ok) return [false, `fixture refused: ${made.error}`];
    const edit = await impl.save(draftInput({ id: made.id, draftRevision: 0, name: "Unread edit", bodySw: "50pick: Toleo jipya." }), officerId, { viewerReads: true }, unread);
    const row = await db.smsCampaign.find(made.id);
    return [!fresh.ok && fresh.reason === "source_unreadable" && fresh.error === DRAFT.CAMPAIGN_SOURCE_LINE_UNREADABLE && written === 0
      && !edit.ok && edit.reason === "source_unreadable" && row !== null && row.sourcePhrase === LINE37S_A && row.draftRevision === 0,
      `new ${fresh.ok ? "SAVED" : fresh.reason} (rows written ${written}) · edit ${edit.ok ? "SAVED" : edit.reason} · stamp ${JSON.stringify(row?.sourcePhrase)} rev ${row?.draftRevision}`];
  });

  await claim("§17.18 ⭐ U37s · THE REAL WIRING — the line saved through the SHIPPED setter (`saveMarketingWordings`) is stamped by a draft saved through the SHIPPED deps, the composer's reader agrees, the stale flag reads true for a draft stamped before the line existed and false once it is re-saved; the line is then cleared through the setter, and a new draft stamps none again", async () => {
    const quiet = { ...DRAFT.CAMPAIGN_DRAFT_DEPS, audit: async () => ({}) };
    const saveLine = async (text: string) => {
      const base = WORDINGS.wordingHistory("source.phrase").length;
      const res = await WORDINGS.saveMarketingWordings({ "source.phrase": text, "approve.source.phrase": "1", "base.source.phrase": String(base) }, "usr_u37s_owner");
      return res.ok === true;
    };
    const early = await impl.save(draftInput({ name: "Before the line" }), officerId, { viewerReads: true }, quiet);
    let saved = false;
    let cleared = false;
    try {
      saved = await saveLine(LINE37S_A);
      const shown = DRAFT.savedSourcePhrase();
      const earlyRow = early.ok ? await db.smsCampaign.find(early.id) : null;
      const staleBefore = impl.staleLine(earlyRow, shown);
      const resaved = early.ok ? await impl.save(draftInput({ id: early.id, draftRevision: 0, name: "Before the line" }), officerId, { viewerReads: true }, quiet) : null;
      const resavedRow = early.ok ? await db.smsCampaign.find(early.id) : null;
      const staleAfter = impl.staleLine(resavedRow, DRAFT.savedSourcePhrase());
      cleared = await saveLine("");
      const after = await impl.save(draftInput({ name: "After the clear" }), officerId, { viewerReads: true }, quiet);
      const afterRow = after.ok ? await db.smsCampaign.find(after.id) : null;
      return [saved && shown === LINE37S_A && impl.sourceLine(null, shown) === LINE37S_A
        && earlyRow !== null && earlyRow.sourcePhrase === null && staleBefore === true
        && resaved !== null && resaved.ok && resavedRow !== null && resavedRow.sourcePhrase === LINE37S_A && staleAfter === false
        && cleared && DRAFT.savedSourcePhrase() === null && afterRow !== null && afterRow.sourcePhrase === null,
        JSON.stringify({ saved, shown, early: earlyRow?.sourcePhrase ?? (early.ok ? "no row" : early.error), staleBefore, resaved: resavedRow?.sourcePhrase, staleAfter, cleared, after: afterRow?.sourcePhrase ?? (after.ok ? "no row" : after.error) })];
    } finally {
      // ⛔ The store is left as it was found — no line — whatever failed above, so no later section reads one.
      if (saved && !cleared) await saveLine("");
    }
  });

  await claim("§17.19 ⭐ U37s · THE STALE FLAG — a DRAFT stamped with no line, an older line, or a line since cleared reads stale against the saved one; a DRAFT carrying the saved line, or none while none is saved, does not; a new composer and a campaign past DRAFT never do", async () => {
    const d = (status: string, sourcePhrase: string | null) => ({ status, sourcePhrase }) as unknown as StoredRow;
    const s = impl.staleLine;
    const got = {
      none_vs_A: s(d("DRAFT", null), LINE37S_A), A_vs_B: s(d("DRAFT", LINE37S_A), LINE37S_B), A_vs_cleared: s(d("DRAFT", LINE37S_A), null),
      A_vs_A: s(d("DRAFT", LINE37S_A), LINE37S_A), none_vs_none: s(d("DRAFT", null), null),
      fresh: s(null, LINE37S_A), confirmed: s(d("CONFIRMED", LINE37S_A), LINE37S_B),
    };
    return [got.none_vs_A && got.A_vs_B && got.A_vs_cleared && !got.A_vs_A && !got.none_vs_none && !got.fresh && !got.confirmed,
      JSON.stringify(got)];
  });

  await claim("§17.20 ⛔ U37s · THE WIRES, READ — the save's shipped deps stamp `readSavedSourcePhrase`, which reads `freshWording(\"source.phrase\")`; the loader prices and flags from ONE `savedSourcePhrase()` read (`composerSourcePhrase(draft, savedLine)`, `composerSourceLineStale(draft, savedLine)`); and the screen's no-changes rule gives way to `view.sourceLineStale` and says so (`data-compose-source-stale`)", async () => {
    const deps37 = impl.draftSource.slice(impl.draftSource.indexOf("export const CAMPAIGN_DRAFT_DEPS"));
    const wires = {
      depsStampFresh: /sourcePhrase:\s*readSavedSourcePhrase,/.test(deps37.slice(0, deps37.indexOf("};"))),
      readsFresh: /export async function readSavedSourcePhrase\(\)[\s\S]{0,200}freshWording\("source\.phrase"\)/.test(impl.draftSource),
      oneRead: /const savedLine = savedSourcePhrase\(\);/.test(impl.loaderSource),
      prices: /sourcePhrase: composerSourcePhrase\(draft, savedLine\),/.test(impl.loaderSource),
      flags: /sourceLineStale: composerSourceLineStale\(draft, savedLine\),/.test(impl.loaderSource),
      screenRule: /!dirty && !view\.sourceLineStale/.test(impl.clientSource),
      screenSays: impl.clientSource.includes("data-compose-source-stale") && impl.clientSource.includes("COMPOSE_SOURCE_LINE_STALE"),
    };
    return [Object.values(wires).every(Boolean), JSON.stringify(wires)];
  });
  return failed;
}

/* ── §18 · the test send ── */
async function checkTestSend(impl: ComposeImpl, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const claim = async (label: string, fn: () => Promise<[boolean, string?]>) => {
    try {
      const [c, x] = await fn();
      ok(label, c, x ?? "");
    } catch (err) {
      ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
    }
  };
  log(`${NL15}§18 · THE TEST SEND — the officer's own number, the one gate, the one live switch`);
  type AuditRow = { action: string; actorId: string | null; targetId: string | null; payload?: Record<string, unknown> };
  const audits: AuditRow[] = [];
  const keys: string[] = [];
  const capture = async (e: AuditRow) => { audits.push(e); return {}; };
  /** The real dependencies, with an open budget, a capturing audit, and this run's token rule and switch reader — and
   *  (U13) a FIXED open send window, so a claim never depends on the hour the suite runs at. */
  const deps = (over: Partial<TestDeps> = {}): TestDeps => ({
    ...TEST.CAMPAIGN_TEST_DEPS, rate: ALLOW, audit: capture, ensureToken: (raw: string) => impl.ensureToken(raw),
    liveSwitch: () => impl.readSwitch(), window: ALWAYS_OPEN, ...over,
  } as TestDeps);
  const send = (input: unknown, officerId: string, over: Partial<TestDeps> = {}) => impl.test(input as TestInput, officerId, deps(over));
  const officer = async (opts: Parameters<typeof u37bOfficer>[0] = {}) => {
    const o = await u37bOfficer(opts);
    keys.push(o.key);
    return o;
  };

  /* ── U37c · a TYPED test's world (spec Appendix A §A.7): licence outreach OPEN through an injected reads record (the
   *    real record stays closed), `adult.test` saved (an injected wording), the typed budgets open, no wait for the
   *    floor (§18.27 drives it on a clock), and each claim's own fresh numbers — so a red run never meets the baseline's
   *    buckets or tokens. ── */
  const OPEN_OUTREACH = { state: "open" as const, recordedBy: "usr_u37c_owner", recordedAt: "2026-10-05T09:00:00.000Z" };
  const ADULT_TEST = { v: 3, text: "I confirm the person who uses this number is 18 or older." } as unknown as NonNullable<ReturnType<TestDeps["adultTestWording"]>>;
  const OPEN_READS = { ...DB_GATE_READS, outreach: () => OPEN_OUTREACH } as TestDeps["gateReads"];
  const NO_WAIT = async () => {};
  const typedOver = (over: Partial<TestDeps> = {}): Partial<TestDeps> => ({
    gateReads: OPEN_READS, adultTestWording: () => ADULT_TEST, rateTyped: ALLOW, rateTo: ALLOW, sleep: NO_WAIT, ...over,
  });
  type TypedOpts = { attested?: unknown; version?: unknown; reads?: boolean; over?: Partial<TestDeps> };
  /** A test to a TYPED number, confirmed 18+ unless `attested` says otherwise (`{ attested: undefined }` omits the field). */
  const sendTyped = (campaignId: string, number: string, officerId: string, opts: TypedOpts = {}) => {
    const recipient: Record<string, unknown> = { kind: "typed", number };
    if (!("attested" in opts)) recipient.adultAttested = true;
    else if (opts.attested !== undefined) recipient.adultAttested = opts.attested;
    // §18.32 · the version of the 18+ words the tick was given for — the saved one unless a claim says otherwise.
    if (!("version" in opts)) recipient.attestedVersion = ADULT_TEST.v;
    else if (opts.version !== undefined) recipient.attestedVersion = opts.version;
    return impl.test({ campaignId, variant: "SW", recipient } as unknown as TestInput, officerId, deps(typedOver(opts.over)), { viewerReads: opts.reads === true });
  };
  /** A key's two other spellings — national with spaces, and international with spaces. */
  const spellings = (key: string) => {
    const n = key.slice(3);
    return { local: `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`, intl: `+255 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` };
  };
  /** A saved DRAFT carrying a source line (§10's fixture phrase), as U37s stamps one. */
  const phrasedDraft = async (): Promise<string> => {
    const id = await u37bDraft();
    const set = await db.smsCampaign.update(id, { sourcePhrase: PHRASE }, { draftRevision: 0 }, new Date().toISOString());
    if (set === null) throw new Error(`fixture ${id}: the source line could not be stored`);
    return id;
  };
  /** Reads where ONE number's latest ledger row is a withdrawal, or its book row was erased — a case no writer in this
   *  suite can make — asked of the REAL gate, so the decision under test is still the gate's own. */
  const withdrawnReads = (key: string) => ({ ...OPEN_READS, latestConsent: (k: { identifier: string }) => (k.identifier === key
    ? { id: "mc_u37c_withdrawn", status: "WITHDRAWN", createdAt: "2026-10-01T09:00:00.000Z", channel: "SMS", identifier: key, category: "MARKETING" }
    : OPEN_READS.latestConsent(k as never)) }) as unknown as TestDeps["gateReads"];
  const erasedReads = (key: string) => ({ ...OPEN_READS, bookStanding: (m: string) => (m === key ? { row: "erased", cover: null } : OPEN_READS.bookStanding(m)) }) as unknown as TestDeps["gateReads"];

  let o: OfficerFixture;
  let cmp = "";
  let cmp2 = "";
  try {
    // ⛔ 2026-10-09 · the Owner (`ADMIN`): the typed claims below send as `o`, and a test to a typed number is for the Owner
    // and Compliance only (§18.37) — the own-number claims are the same for every role.
    o = await officer({ role: "ADMIN" });
    cmp = await u37bDraft();
    cmp2 = await u37bDraft();
  } catch (err) {
    ok("§18 fixtures · the officer and the drafts this section stands on were built", false, (err as Error)?.message ?? String(err));
    return failed;
  }

  await claim("§18.0 control · the fixture officer is marketable — the REAL gate clears their own number — and the fixture is a saved DRAFT with no English and no source line", async () => {
    const v = await mayReceiveMarketingSms(o.key);
    const row = await db.smsCampaign.find(cmp);
    return [v.ok && row !== null && row.status === "DRAFT" && row.bodyEn === null && row.sourcePhrase === null, JSON.stringify(v)];
  });

  await claim("§18.1 ⭐ HAPPY PATH (the console stub, the switch absent) — handed over via the stub, and EXACTLY ONE SmsMessage row: purpose MARKETING, target SmsCampaignTest / the campaign id, to the officer's own key — the text THE ONE renderer's for the stored draft, the officer's first name and their own new token, ending in the statutory footer, and the number masked", async () => {
    const before = await tokenCount(o.key);
    const r = await send({ campaignId: cmp, variant: "SW" }, o.id, { send: TEST.CAMPAIGN_TEST_DEPS.send });
    const rows = smsRowsFor(cmp);
    const tokens = await db.marketingOptOutToken.listFor(o.key);
    const token = tokens[0]?.token ?? "";
    const row = await db.smsCampaign.find(cmp);
    const expected = row === null ? null : renderForRecipient(u37bTemplate(row), { variant: "SW", name: firstNameFor({ userDisplayName: "Asha Officer" }), token, origin: "account" });
    return [r.ok && r.outcome === "handed_over" && r.via === "stub" && rows.length === 1 && rows[0].purpose === "MARKETING"
      && rows[0].targetType === TEST.CAMPAIGN_TEST_TARGET_TYPE && rows[0].targetId === cmp && rows[0].msisdn === o.key
      && before === 0 && tokens.length === 1 && token.length === 8 && expected !== null && expected.ok && r.text === expected.text
      && r.text.startsWith("50pick: Habari Asha,") && r.text.endsWith(marketingFooter(token, "SW")) && r.maskedTo === maskPhone(o.key)
      && r.maskedTo.includes(MASK_DOTS) && !r.maskedTo.includes(o.key.slice(5)),
      `${reasonOf(r)}${r.ok ? ` via ${r.via}` : `: ${r.error}`} · rows ${rows.length} [${rows.map((m) => `${m.purpose}/${m.targetType}`).join(",")}] · tokens ${before} → ${tokens.length}`];
  });

  await claim("§18.2 ⛔ ACCEPT · A NUMBER POSTED ANYWHERE BUT recipient.number IS NEVER READ — to, msisdn, phone and number beside (campaignId, variant) with no recipient, or beside recipient own, reach only the officer's own key", async () => {
    const injected = "255754000001";
    const before = smsRowsTo(injected).length;
    const { send: spy, spy: seen } = u37bSpy();
    const stray = { to: "+255754000001", msisdn: injected, phone: "0754000001", number: "754000001" };
    const a = await send({ campaignId: cmp2, variant: "SW", ...stray }, o.id, { send: spy });
    const b = await send({ campaignId: cmp2, variant: "SW", recipient: { kind: "own", ...stray }, ...stray }, o.id, { send: spy });
    return [a.ok && b.ok && seen.messages.length === 2 && seen.messages.every((m) => m.to === o.key && !m.to.includes("754000001"))
      && smsRowsTo(injected).length === before,
      `${reasonOf(a)} · ${reasonOf(b)} · sent to [${seen.messages.map((m) => maskPhone(m.to)).join(", ")}]`];
  });

  await claim("§18.3 ⛔ a posted body is never read — the STORED draft's text is the one handed over", async () => {
    const { send: spy, spy: seen } = u37bSpy();
    const r = await send({ campaignId: cmp2, variant: "SW", body: "50pick: SHINDA SASA bila masharti", text: "50pick: SHINDA" }, o.id, { send: spy });
    return [r.ok && seen.messages.length === 1 && seen.messages[0].body === r.text && r.text.startsWith("50pick: Habari Asha,") && !r.text.includes("SHINDA"),
      r.ok ? JSON.stringify(r.text.slice(0, 40)) : `${reasonOf(r)}: ${r.error}`];
  });

  await claim("§18.4 ⛔ THE ONE GATE RUNS — an officer with no SMS consent is refused no_consent, and one with no date of birth age_unknown with its remedy named, with ZERO transport calls and no row for either", async () => {
    const noConsent = await officer({ consent: false });
    const noDob = await officer({ dob: null });
    const { send: spy, spy: seen } = u37bSpy();
    const r1 = await send({ campaignId: cmp2, variant: "SW" }, noConsent.id, { send: spy });
    const r2 = await send({ campaignId: cmp2, variant: "SW" }, noDob.id, { send: spy });
    return [!r1.ok && r1.outcome === "refused" && r1.reason === "no_consent" && !r2.ok && r2.outcome === "refused" && r2.reason === "age_unknown"
      && r2.error.includes("date of birth") && seen.calls === 0 && smsRowsTo(noConsent.key).length === 0 && smsRowsTo(noDob.key).length === 0,
      `no consent → ${reasonOf(r1)} · no date of birth → ${reasonOf(r2)} · transport calls ${seen.calls}`];
  });

  /** Blackball with DUMMY keys and a dead address, and `fetch` swapped for a counter that refuses: the transport calls,
   *  rows and token mints of `run` are measured around it, and everything is put back after. ⛔ Never a real key. */
  const realCarrier = async (key: string, campaignId: string, run: () => Promise<TestResult>) => {
    const ENV = ["SMS_PROVIDER", "BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET", "SMS_SENDER_ID", "BLACKBALL_API_URL"];
    const saved = ENV.map((k) => [k, process.env[k]] as const);
    process.env.SMS_PROVIDER = "blackball";
    process.env.BLACKBALL_CLIENT_ID = "dummy-not-a-key";
    process.env.BLACKBALL_CLIENT_SECRET = "dummy-not-a-key";
    process.env.SMS_SENDER_ID = "50pick";
    process.env.BLACKBALL_API_URL = "http://127.0.0.1:9/";
    const realFetch = globalThis.fetch;
    let fetches = 0;
    globalThis.fetch = (async () => {
      fetches++;
      throw new Error("no network in test:campaign-compose");
    }) as typeof fetch;
    const rowsBefore = smsRowsFor(campaignId).length;
    const tokensBefore = await tokenCount(key);
    try {
      const result = await run();
      return { result, fetches, rows: smsRowsFor(campaignId).length - rowsBefore, tokens: (await tokenCount(key)) - tokensBefore };
    } finally {
      globalThis.fetch = realFetch;
      for (const [k, v] of saved) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };
  // ⭐ U49s · the gate checks the closing time itself, so a recorded-open state must close in the FUTURE to read open.
  const OPEN_ROW = { state: "open", enabledBy: "usr_u37b_owner", enabledAt: "2026-10-02T09:00:00.000Z", closesAt: "9999-12-31T00:00:00.000Z" } as const;
  let carrier: OfficerFixture | null = null;
  let cmp5 = "";
  try {
    carrier = await officer();
    cmp5 = await u37bDraft();
  } catch (err) {
    ok("§18.5 fixtures · the real-carrier officer and draft were built", false, (err as Error)?.message ?? String(err));
  }
  await claim("§18.5 ⭐ X14 · ACCEPT · WITH THE SWITCH ABSENT A REAL CARRIER SENDS NOTHING — Blackball selected (dummy keys) and no marketing.sms.live row, read by the SHIPPED wiring's own reader (CAMPAIGN_TEST_DEPS.liveSwitch): refused live_sends_closed with ZERO transport calls, ZERO SmsMessage rows and ZERO token mints", async () => {
    if (carrier === null) return [false, "no fixture"];
    const who = carrier;
    const m = await realCarrier(who.key, cmp5, () => send({ campaignId: cmp5, variant: "SW" }, who.id, { send: TEST.CAMPAIGN_TEST_DEPS.send, liveSwitch: impl.testDeps.liveSwitch }));
    return [!m.result.ok && m.result.outcome === "refused" && m.result.reason === "live_sends_closed" && m.fetches === 0 && m.rows === 0 && m.tokens === 0,
      `${reasonOf(m.result)} · transport calls ${m.fetches} · rows ${m.rows} · tokens ${m.tokens}`];
  });
  await claim("§18.5 control · …and the SAME send with the row recorded open DOES reach the transport, writes its row and mints its token — the refused reply leaves it unconfirmed, never handed over — so the zero above is the switch's, not a dead rail's", async () => {
    if (carrier === null) return [false, "no fixture"];
    const who = carrier;
    const m = await realCarrier(who.key, cmp5, () => send({ campaignId: cmp5, variant: "SW" }, who.id, { send: TEST.CAMPAIGN_TEST_DEPS.send, liveSwitch: async () => OPEN_ROW }));
    return [m.fetches >= 1 && m.rows === 1 && m.tokens === 1 && !m.result.ok && m.result.outcome === "unconfirmed",
      `${reasonOf(m.result)} · transport calls ${m.fetches} · rows ${m.rows} · tokens ${m.tokens}`];
  });

  await claim("§18.6 ⛔ X14 · E13 · THE READER FAILS CLOSED — no row, a failed read, a read that threw, a value that is not a row, a blank enabledBy, an instant that is not one, the old two-key row, a key beside the three and an EXPIRED row all read CLOSED; only a recorded { enabledBy, enabledAt, closesAt } before its closesAt, under marketing.sms.live, reads open — and a real carrier's test on an expired switch is refused live_sends_closed with nothing sent", async () => {
    const asked: string[] = [];
    const load = (answer: () => unknown) => async (key: string) => {
      asked.push(key);
      return answer();
    };
    const NOW = Date.now();
    const at = (ms: number) => new Date(ms).toISOString();
    const row = { enabledBy: "usr_owner", enabledAt: at(NOW - 3_600_000), closesAt: at(NOW + 3_600_000) };
    const expired = { enabledBy: "usr_owner", enabledAt: at(NOW - 3 * 3_600_000), closesAt: at(NOW - 3_600_000) };
    const cases: Array<[string, (key: string) => Promise<unknown>]> = [
      ["absent", load(() => ({ ok: true, value: null }))],
      ["failed", load(() => ({ ok: false, error: "connection refused" }))],
      ["threw", load(() => { throw new Error("boom"); })],
      ["not a row", load(() => ({ ok: true, value: "on" }))],
      ["blank enabledBy", load(() => ({ ok: true, value: { ...row, enabledBy: "  " } }))],
      ["enabledAt not an instant", load(() => ({ ok: true, value: { ...row, enabledAt: "yesterday" } }))],
      // E13: the old { enabledBy, enabledAt } row has no closing time — it is not a shape this version reads open.
      ["the old two-key row", load(() => ({ ok: true, value: { enabledBy: row.enabledBy, enabledAt: row.enabledAt } }))],
      // U37b review m3: a CLOSE recorded in the only shape there is still carries the three fields — it must read closed.
      ["a key beside the three", load(() => ({ ok: true, value: { ...row, enabled: false } }))],
      ["expired", load(() => ({ ok: true, value: expired }))],
    ];
    const states: string[] = [];
    for (const [name, l] of cases) states.push(`${name}=${(await impl.readSwitch(l as never)).state}`);
    const open = await impl.readSwitch(load(() => ({ ok: true, value: row })) as never);
    const expiredRead = await impl.readSwitch(load(() => ({ ok: true, value: expired })) as never);
    // ⭐ The test send reads THIS reader: on an expired switch a real carrier is refused before the wire.
    let refusedExpired = false;
    let detail = "no fixture";
    if (carrier !== null) {
      const who = carrier;
      const m = await realCarrier(who.key, cmp5, () => send({ campaignId: cmp5, variant: "SW" }, who.id, {
        send: TEST.CAMPAIGN_TEST_DEPS.send,
        liveSwitch: () => impl.readSwitch((async () => ({ ok: true, value: expired })) as never),
      }));
      refusedExpired = !m.result.ok && m.result.outcome === "refused" && m.result.reason === "live_sends_closed" && m.fetches === 0 && m.rows === 0;
      detail = `${reasonOf(m.result)} · transport calls ${m.fetches} · rows ${m.rows}`;
    }
    return [states.every((s) => s.endsWith("=closed")) && open.state === "open" && open.closesAt === row.closesAt && asked.length === cases.length + 2
      && expiredRead.state === "closed" && expiredRead.why === "expired" && refusedExpired
      && asked.every((k) => k === "marketing.sms.live") && LIVE.MARKETING_LIVE_SWITCH_KEY === "marketing.sms.live",
      `${states.join(" · ")} · recorded=${open.state} · expired test ${detail} · keys [${[...new Set(asked)].join(",")}]`];
  });
  await claim("§18.6 the gate — the console stub passes open or closed (no handset, no money), Blackball ONLY when the switch is recorded open, an unrecognised provider never", async () => {
    const CLOSED = { state: "closed", why: "absent" } as const;
    const g = (p: string, s: unknown) => impl.liveGate(p as never, s as never).ok;
    return [g("console", CLOSED) && g("console", OPEN_ROW) && !g("blackball", CLOSED) && g("blackball", OPEN_ROW) && !g("unrecognised", OPEN_ROW) && !g("unrecognised", CLOSED),
      `console ${g("console", CLOSED)}/${g("console", OPEN_ROW)} · blackball ${g("blackball", CLOSED)}/${g("blackball", OPEN_ROW)} · unrecognised ${g("unrecognised", OPEN_ROW)}`];
  });

  await claim("§18.7 refused with no row, no transport call and no token — an unknown campaign (not_found), a CONFIRMED one (not_draft), English on a draft with no English (no_english_body), an officer whose own number is outside the numbering plan (own_number_unusable), and a dead rail (rail_dead, the rail named)", async () => {
    const o7 = await officer();
    const dead = await officer({ phone: "+255640000001" });
    const plainDraft = await u37bDraft();
    const confirmed = await u37bDraft();
    await u37bConfirm(confirmed);
    const { send: spy, spy: seen } = u37bSpy();
    const results = [
      await send({ campaignId: "cmp_u37b_nothing_here", variant: "SW" }, o7.id, { send: spy }),
      await send({ campaignId: confirmed, variant: "SW" }, o7.id, { send: spy }),
      await send({ campaignId: plainDraft, variant: "EN" }, o7.id, { send: spy }),
      await send({ campaignId: plainDraft, variant: "SW" }, dead.id, { send: spy }),
      await send({ campaignId: plainDraft, variant: "SW" }, o7.id, { send: spy, rail: () => "sender-id" }),
    ];
    const reasons = results.map(reasonOf);
    const last = results[4];
    const railNamed = !last.ok && "rail" in last && last.rail === "sender-id";
    return [reasons.join(",") === "not_found,not_draft,no_english_body,own_number_unusable,rail_dead" && railNamed && seen.calls === 0
      && smsRowsFor(plainDraft).length === 0 && smsRowsFor(confirmed).length === 0 && (await tokenCount(o7.key)) === 0 && (await tokenCount("255640000001")) === 0,
      `${reasons.join(", ")} · transport calls ${seen.calls}`];
  });

  await claim("§18.8 the budget — marketing.testSend, 3 at once per officer: the 4th test inside the window is refused rate_limited with a retry time, sends nothing and writes no audit row (the three before it wrote one each)", async () => {
    const o8 = await officer();
    const { send: spy, spy: seen } = u37bSpy();
    const tries: TestResult[] = [];
    for (let i = 0; i < 4; i++) tries.push(await send({ campaignId: "cmp_u37b_rate_nothing", variant: "SW" }, o8.id, { send: spy, rate: TEST.CAMPAIGN_TEST_DEPS.rate }));
    const fourth = tries[3];
    const wait = !fourth.ok && "retryAfterSec" in fourth ? (fourth.retryAfterSec ?? 0) : 0;
    const rows = audits.filter((a) => a.actorId === o8.id);
    return [tries.slice(0, 3).every((r) => reasonOf(r) === "not_found") && reasonOf(fourth) === "rate_limited" && wait > 0 && seen.calls === 0 && rows.length === 3,
      `${tries.map(reasonOf).join(", ")} · retry after ${wait}s · audit rows ${rows.length}`];
  });

  await claim("§18.9 ONE NUMBER, ONE TOKEN, NO LINK — two tests leave exactly ONE opt-out token for the officer's key (kept for the stop page), and NEITHER message carries it — the message is the officer's text (2026-10-09)", async () => {
    const o9 = await officer();
    const cmp9 = await u37bDraft();
    const { send: spy } = u37bSpy();
    const a = await send({ campaignId: cmp9, variant: "SW" }, o9.id, { send: spy });
    const b = await send({ campaignId: cmp9, variant: "SW" }, o9.id, { send: spy });
    const tokens = await db.marketingOptOutToken.listFor(o9.key);
    const link = tokens.length === 1 ? `/s/${tokens[0].token}` : "(no single token)";
    return [a.ok && b.ok && tokens.length === 1 && !a.text.includes(link) && !b.text.includes(link) && !a.text.includes("/s/") && !b.text.includes("/s/"), `tokens ${tokens.length}`];
  });

  await claim("§18.10 every attempt past the budget writes ONE marketing.campaign_test row with its outcome and reason, against the campaign, the number MASKED — no fixture key and no nine national digits in any row", async () => {
    const rows = audits.filter((a) => a.action === TEST.CAMPAIGN_TEST_ACTION);
    const officerRows = rows.filter((a) => a.actorId === o.id);
    const leaks = rows.filter((a) => {
      const json = JSON.stringify(a);
      return keys.some((k) => json.includes(k) || json.includes(k.slice(3))) || /(?<![0-9])255[0-9]{9}(?![0-9])/.test(json);
    });
    const shaped = rows.every((a) => a.payload !== undefined && typeof a.payload.outcome === "string" && "reason" in a.payload);
    // ⭐ The officer's own rows so far: §18.1, §18.2's two sends (no recipient, and recipient own — U37c) and §18.3.
    return [rows.length >= 10 && officerRows.length === 4 && shaped && leaks.length === 0
      && officerRows.every((a) => a.payload?.outcome === "handed_over" && a.targetId !== null && String(a.payload?.to ?? "").includes(MASK_DOTS)),
      `${rows.length} rows · the officer's ${officerRows.length} · shaped ${shaped} · leaking ${leaks.length}`];
  });

  await claim("§18.10b ⛔ AN ALL-DIGIT 'ID' NEVER REACHES THE AUDIT ROW (U37b review m2) — a test posted with campaignId 255712345678 is refused not_found, and its row names NO target and carries no nine-digit run", async () => {
    const o10b = await officer();
    const start = audits.length;
    const r = await send({ campaignId: "255712345678", variant: "SW" }, o10b.id);
    const rows = audits.slice(start).filter((a) => a.action === TEST.CAMPAIGN_TEST_ACTION && a.actorId === o10b.id);
    const carried = JSON.stringify(rows.map((a) => [a.targetId, a.payload]));
    return [!r.ok && reasonOf(r) === "not_found" && rows.length === 1 && rows[0].targetId === null && !/[0-9]{9}/.test(carried),
      `${reasonOf(r)} · rows ${rows.length} · target ${rows[0]?.targetId ?? "null"}`];
  });

  await claim("§18.11 ⛔ NEVER 'HANDED OVER' UNLESS THE GATEWAY TOOK IT — held by the credit floor is refused 'held' with the floor's sentence; a send that threw and a reply that was lost (TRANSPORT) are 'unconfirmed', saying don't resend", async () => {
    const o11 = await officer();
    const cmp11 = await u37bDraft();
    const floor = await send({ campaignId: cmp11, variant: "SW" }, o11.id, { send: u37bSpy("floor").send });
    const threw = await send({ campaignId: cmp11, variant: "SW" }, o11.id, { send: u37bSpy("throw").send });
    const lost = await send({ campaignId: cmp11, variant: "SW" }, o11.id, { send: u37bSpy("transport").send });
    return [!floor.ok && floor.outcome === "refused" && floor.reason === "held" && floor.error.includes("below its floor")
      && !threw.ok && threw.outcome === "unconfirmed" && threw.error.includes("don't resend")
      && !lost.ok && lost.outcome === "unconfirmed",
      `floor ${reasonOf(floor)} · threw ${reasonOf(threw)} · lost ${reasonOf(lost)}`];
  });

  await claim(`§18.12 ⭐ ACCEPT · FOR ${NAMES.length} WRITTEN-OUT NAMES THE RENDERED SIZE NEVER EXCEEDS THE COUNTER'S — each name as the officer's own account name, through the SAVE (its stored coding and segments) and the TEST SEND (the text it hands to the wire), in both languages: within the counter's units, the stored encoding and the stored segments — and within the counter less the source line's room, the bound for an account recipient, which the longest names reach exactly`, async () => {
    const id = await u37bDraft({
      name: "Forty names", bodySw: fillTo(HEAD, operatorBudget("SW", RESERVE)), bodyEn: fillTo(HEAD_EN, operatorBudget("EN", RESERVE)),
      nameFallbackSw: worstCaseJina(), nameFallbackEn: worstCaseJina(),
    });
    const row = await db.smsCampaign.find(id);
    if (row === null) return [false, "the fixture draft was not stored"];
    const t = u37bTemplate(row);
    const counters = { SW: counterFor(t.bodySw, "SW", t.nameFallbackSw, t.sourcePhrase), EN: counterFor(t.bodyEn, "EN", t.nameFallbackEn, t.sourcePhrase) };
    const stored = { SW: { coding: row.codingSw, segments: row.segmentsSw }, EN: { coding: row.codingEn, segments: row.segmentsEn ?? 0 } };
    const over: string[] = [];
    let sends = 0;
    let reached = 0;
    for (const name of NAMES) {
      const off = await officer({ displayName: name ?? null });
      for (const v of ["SW", "EN"] as CampaignVariant[]) {
        const { send: spy, spy: seen } = u37bSpy();
        const r = await send({ campaignId: id, variant: v }, off.id, { send: spy });
        sends++;
        const wire = seen.messages[0]?.body ?? "";
        const s = sizeSms(wire);
        const c = counters[v];
        const accountBound = c.units - c.sourceUnits;
        const within = r.ok && wire !== "" && s.units <= c.units && s.units <= accountBound && s.encoding === stored[v].coding && s.segments <= stored[v].segments;
        if (!within) over.push(`${v}/${JSON.stringify(name)}: ${s.units} units ${s.encoding} ${s.segments} seg ${reasonOf(r)} vs counter ${c.units} (account ${accountBound})`);
        if (r.ok && s.units === accountBound) reached++;
      }
    }
    return [over.length === 0 && sends === NAMES.length * 2 && NAMES.length >= 40 && stored.SW.segments === 1 && stored.EN.segments === 1 && reached > 0,
      `${sends} sends · ${over.length} over: ${over.slice(0, 3).join(" | ")} · ${reached} at the account bound exactly`];
  });

  await claim("§18.13 ⭐ THE ORIGIN IS CHOSEN — the officer's own number renders as an ACCOUNT recipient (their first name; no source line, even once one is stored) — and a TYPED number renders as a CONTACT-BOOK recipient: the {jina} fallback, never the holder's own first name, and NO source line, though one is stored (2026-10-09)", async () => {
    const o13 = await officer({ displayName: "Juma Mkuu" });
    const blankId = await u37bDraft();
    const phraseId = await u37bDraft();
    const set = await db.smsCampaign.update(phraseId, { sourcePhrase: PHRASE }, { draftRevision: 0 }, new Date().toISOString());
    const { send: spy } = u37bSpy();
    const blank = await send({ campaignId: blankId, variant: "SW" }, o13.id, { send: spy });
    const phrased = await send({ campaignId: phraseId, variant: "SW" }, o13.id, { send: spy });
    // U37c · another officer types Juma's number, the record open and the line stored: a book recipient, never "Juma".
    const typed = await sendTyped(phraseId, `+${o13.key}`, o.id, { over: { send: spy } });
    return [set !== null && blank.ok && blank.text.startsWith("50pick: Habari Juma,") && phrased.ok && !phrased.text.includes(PHRASE)
      && typed.ok && typed.target === "typed" && typed.text.includes(`Habari ${FB},`) && !typed.text.includes("Juma") && !typed.text.includes(PHRASE),
      `blank ${blank.ok ? JSON.stringify(blank.text.slice(0, 30)) : `${reasonOf(blank)}: ${blank.error}`} · phrased ${phrased.ok ? (phrased.text.includes(PHRASE) ? "CARRIES THE PHRASE" : "no phrase") : reasonOf(phrased)} · typed ${typed.ok ? JSON.stringify(typed.text.slice(0, 30)) : `${reasonOf(typed)}: ${typed.error}`}`];
  });

  /* ── §18.14–§18.16 · THE SHIPPED WIRING (U37b review M1). Everything above runs the suite's stand-ins for the switch,
   *    the token rule and the audit — which is how each plant swaps one of them — so a regression inside
   *    CAMPAIGN_TEST_DEPS itself (a switch hard-coded open, a mint on every test, an audit that writes nothing) stayed
   *    green. These three read the wire as it ships. ── */
  await claim("§18.14 ⛔ THE SHIPPED WIRING IS THE REAL ONE — CAMPAIGN_TEST_DEPS reads the switch through readMarketingLiveSwitch, keeps a token through ensureOptOutToken, audits through audit, sends through dispatchSlice and passes no gate of its own (the one gate inside dispatchSlice); U37c · the typed budgets call their literal rules (marketing.testSendTyped on the officer, marketing.testSendTo on testToBucket's salted hash), the typed gate is the ONE gate asked with the gate's own reads (DB_GATE_READS), the 18+ wording is the saved adult.test, an RG refusal goes through dispatch's one helper, and sendCampaignTest names no gate but mayReceiveMarketingSms", async () => {
    const src = impl.testSendSource.split(String.fromCharCode(13)).join("");
    const at = src.indexOf("export const CAMPAIGN_TEST_DEPS: CampaignTestDeps = {");
    const block = at < 0 ? "" : src.slice(at, src.indexOf("};", at));
    const wires = ["liveSwitch: () => readMarketingLiveSwitch(),", "ensureToken: (raw) => ensureOptOutToken(raw),", "  audit,", "dispatch: dispatchSlice,", "gate: undefined,",
      'rateTyped: (officerId) => rateCheckAsync(officerId, "marketing.testSendTyped"),', 'rateTo: (key) => rateCheckAsync(testToBucket(key), "marketing.testSendTo"),',
      "gateReads: DB_GATE_READS,", 'adultTestWording: () => currentWording("adult.test"),'];
    const missing = wires.filter((w) => !block.includes(w));
    const fnAt = src.indexOf("export async function sendCampaignTest(");
    const fn = fnAt < 0 ? "" : src.slice(fnAt);
    const bucket = /export function testToBucket\(key: string\): string \{[\s\S]{0,120}?pepperedLetters\("marketing-test-to", key\)/.test(src);
    const oneGate = fn.includes("mayReceiveMarketingSms(m, deps.now(), deps.gateReads, { testAttestation })")
      && !/playerConsentRefusal|gateWithDefect|usableTestAttestation|\bgateReads\.(suppression|userByPhone|latestConsent|bookStanding)\b/.test(fn);
    // ⛔ OD61 · the typed path writes no RG line: dispatch is handed the no-op, and the file never names the helper.
    const noRgLine = fn.includes('...(target === "typed" ? { rgAudit: NO_RG_LINE } : {})') && !src.includes("auditRgRefusal");
    return [block !== "" && missing.length === 0 && bucket && oneGate && noRgLine,
      block === "" ? "no CAMPAIGN_TEST_DEPS block" : missing.length ? `not wired: ${missing.join(" | ")}` : `the wires are the real ones · bucket keyed ${bucket} · one gate ${oneGate} · no RG line ${noRgLine}`];
  });
  await claim("§18.15 the SHIPPED token rule reuses — CAMPAIGN_TEST_DEPS.ensureToken asked twice for one number returns the same token and leaves ONE row (§18.9 runs the suite's rule; this runs the wire)", async () => {
    const key = u37bKey();
    const a = await impl.testDeps.ensureToken(key);
    const b = await impl.testDeps.ensureToken(key);
    const n = await tokenCount(key);
    return [a !== null && a === b && n === 1, `${a === b ? "the same token" : "two different tokens"} · rows ${n}`];
  });
  await claim("§18.16 the SHIPPED audit writes the row — one test send through CAMPAIGN_TEST_DEPS.audit leaves ONE marketing.campaign_test entry for the officer in the audit ring, the number masked and the key nowhere (§18.10 reads the suite's capture; this reads the ring)", async () => {
    const o16 = await officer();
    const cmp16 = await u37bDraft();
    const { send: spy } = u37bSpy();
    const r = await send({ campaignId: cmp16, variant: "SW" }, o16.id, { send: spy, audit: impl.testDeps.audit });
    await auditFlush();
    const rows = getAuditPage({ actorId: o16.id, limit: 50 }).filter((e) => e.action === TEST.CAMPAIGN_TEST_ACTION);
    const json = JSON.stringify(rows);
    return [r.ok && rows.length === 1 && json.includes(MASK_DOTS) && !json.includes(o16.key) && !json.includes(o16.key.slice(3)),
      `${reasonOf(r)} · ring rows ${rows.length}`];
  });

  /* ══ §18.5′ · §18.17–§18.28 · U37c-1 · THE TEST SEND TO A TYPED NUMBER (spec Appendix A §A.6–§A.7) ══ */
  await claim("§18.5′ ⭐ U37c · X14 · …AND NOTHING TO A TYPED NUMBER EITHER — Blackball selected (dummy keys) and the switch absent: a typed test is refused live_sends_closed with ZERO transport calls, ZERO rows and ZERO token mints for that number", async () => {
    const id = await phrasedDraft();
    const k = u37bKey();
    const m = await realCarrier(k, id, () => sendTyped(id, `+${k}`, o.id, { over: { send: TEST.CAMPAIGN_TEST_DEPS.send, liveSwitch: impl.testDeps.liveSwitch } }));
    return [!m.result.ok && m.result.outcome === "refused" && m.result.reason === "live_sends_closed" && m.fetches === 0 && m.rows === 0 && m.tokens === 0,
      `${reasonOf(m.result)} · fetches ${m.fetches} · rows ${m.rows} · tokens ${m.tokens}`];
  });

  await claim("§18.17 ⭐ U37c · A TYPED NUMBER REACHES EXACTLY ITS KEY, WHATEVER THE SPELLING — its national and international spellings give ONE key; each test is ONE SmsMessage row (MARKETING, SmsCampaignTest) to that key, rendered as a CONTACT-BOOK recipient (the {jina} fallback; the stored source line is never printed); its audit row says target typed, the number masked, basis LICENCE_TEST with its test: ref, the 18+ wording's version and a ta_ attempt ref of letters only — and no digit run of the key", async () => {
    const id = await phrasedDraft();
    const k = u37bKey();
    const sp = spellings(k);
    const before = smsRowsTo(k).length;
    const real = { send: TEST.CAMPAIGN_TEST_DEPS.send };
    const a = await sendTyped(id, sp.local, o.id, { over: real });
    const b = await sendTyped(id, sp.intl, o.id, { over: real });
    const rows = smsRowsTo(k).slice(before);
    const mine = audits.filter((e) => e.targetId === id && e.payload?.target === "typed");
    const p = mine[mine.length - 1]?.payload ?? {};
    const att = p.attestation as { key?: string; version?: number } | undefined;
    const json = JSON.stringify(mine);
    return [a.ok && b.ok && a.target === "typed" && b.target === "typed" && a.maskedTo === maskPhone(k) && b.maskedTo === maskPhone(k)
      && rows.length === 2 && rows.every((m) => m.msisdn === k && m.purpose === "MARKETING" && m.targetType === TEST.CAMPAIGN_TEST_TARGET_TYPE && m.targetId === id)
      && a.text.includes(`Habari ${FB},`) && !a.text.includes(PHRASE)
      && mine.length === 2 && p.basis === "LICENCE_TEST" && /^test:ta_[a-z]{16}$/.test(String(p.basisRef)) && /^ta_[a-z]{16}$/.test(String(p.attemptRef))
      && att?.key === "adult.test" && att?.version === 3 && p.to === maskPhone(k) && !json.includes(k) && !json.includes(k.slice(3)),
      JSON.stringify({ a: reasonOf(a), b: reasonOf(b), rows: rows.length, audited: mine.length, payload: p })];
  });

  await claim("§18.18 ⛔ U37c · NO 18+ CONFIRMATION, NO TEST — adultAttested false, absent, the string 'true' or 1 is refused attestation_missing with its sentence; nothing reaches the rail or the gate, no token is made, no row is written, and each attempt's audit row carries the reason", async () => {
    const id = await phrasedDraft();
    const k = u37bKey();
    let rails = 0;
    let gates = 0;
    const over: Partial<TestDeps> = {
      rail: () => { rails++; return null; },
      gate: async () => { gates++; return { ok: true as const, basis: "LICENCE_TEST" as const, basisRef: "test:fixture" }; },
    };
    const results: TestResult[] = [];
    for (const attested of [false, undefined, "true", 1]) results.push(await sendTyped(id, `+${k}`, o.id, { attested, over }));
    const audited = audits.filter((e) => e.targetId === id && e.payload?.reason === "attestation_missing").length;
    return [results.every((r) => !r.ok && r.outcome === "refused" && r.reason === "attestation_missing" && r.error === TEST.TEST_ATTESTATION_MISSING)
      && rails === 0 && gates === 0 && (await tokenCount(k)) === 0 && smsRowsTo(k).length === 0 && audited === 4,
      `reasons ${results.map(reasonOf).join(",")} · rail ${rails} · gate ${gates} · audited ${audited}`];
  });

  await claim("§18.32 ⛔ U37c-2 · THE TICK COUNTS ONLY FOR THE WORDS IT WAS GIVEN FOR — a version older or newer than the saved adult.test, none posted, a string or a fraction is refused attestation_stale with its sentence, before the gate is asked or a token made; the saved version itself is handed over", async () => {
    const id = await phrasedDraft();
    const k = u37bKey();
    let gates = 0;
    const over: Partial<TestDeps> = {
      gate: async () => { gates++; return { ok: true as const, basis: "LICENCE_TEST" as const, basisRef: "test:fixture" }; },
    };
    const results: TestResult[] = [];
    for (const version of [ADULT_TEST.v - 1, ADULT_TEST.v + 1, undefined, String(ADULT_TEST.v), ADULT_TEST.v + 0.5]) {
      results.push(await sendTyped(id, `+${k}`, o.id, { version, over }));
    }
    const { send: spy, spy: seen } = u37bSpy();
    const current = await sendTyped(id, `+${u37bKey()}`, o.id, { over: { send: spy } });
    return [results.every((r) => !r.ok && r.outcome === "refused" && r.reason === "attestation_stale" && r.error === TEST.TEST_ATTESTATION_STALE && r.target === "typed")
      && gates === 0 && (await tokenCount(k)) === 0 && current.ok && seen.calls === 1,
      `stale ${results.map(reasonOf).join(",")} · gate ${gates} · current ${reasonOf(current)}`];
  });

  /** §18.19–§18.20's five numbers the confirmation must never reach — made by the platform's own writers where this suite
   *  has one (consent, self-exclusion, a stop link), and through injected reads of the REAL gate where it has none. */
  type Refusable = { name: string; number: string; key: string; over: Partial<TestDeps>; reader: string };
  let refusing: Refusable[] = [];
  try {
    const minor = await officer({ dob: "2012-06-01" });
    const excluded = await officer();
    await selfExclude(excluded.id, "24h");
    const stoppedKey = u37bKey();
    const stopToken = await mintOptOutToken(stoppedKey);
    if (stopToken === null) throw new Error("the stop fixture's token was not minted");
    await stopMarketing(stopToken, "SW");
    const withdrawnKey = u37bKey();
    const erasedKey = u37bKey();
    refusing = [
      { name: "a player under 18", number: `+${minor.key}`, key: minor.key, over: {}, reader: "protected" },
      { name: "a self-excluded player", number: `+${excluded.key}`, key: excluded.key, over: {}, reader: "protected" },
      { name: "a stopped number", number: `+${stoppedKey}`, key: stoppedKey, over: {}, reader: "suppressed" },
      { name: "a withdrawn number", number: `+${withdrawnKey}`, key: withdrawnKey, over: { gateReads: withdrawnReads(withdrawnKey) }, reader: "consent_withdrawn" },
      { name: "an erased book record", number: `+${erasedKey}`, key: erasedKey, over: { gateReads: erasedReads(erasedKey) }, reader: "no_basis" },
    ];
  } catch (err) {
    ok("§18.19 fixtures · the five protected numbers were built", false, (err as Error)?.message ?? String(err));
  }

  await claim("§18.19 ⛔ U37c · THE CONFIRMATION IS NOT A BYPASS — a player under 18, a self-excluded player, a stopped number, a withdrawn number and an erased book record are each refused through the ONE gate, with ZERO transport calls and ZERO new token rows", async () => {
    if (refusing.length !== 5) return [false, "no fixtures"];
    const id = await phrasedDraft();
    const { send: spy, spy: seen } = u37bSpy();
    const said: string[] = [];
    let minted = 0;
    let allRefused = true;
    for (const c of refusing) {
      const before = await tokenCount(c.key);
      const r = await sendTyped(id, c.number, o.id, { over: { ...c.over, send: spy } });
      minted += (await tokenCount(c.key)) - before;
      said.push(`${c.name} → ${reasonOf(r)}`);
      if (r.ok || r.outcome !== "refused") allRefused = false;
    }
    return [allRefused && seen.calls === 0 && minted === 0, `${said.join(" · ")} · transport ${seen.calls} · minted ${minted}`];
  });

  await claim("§18.20 ⛔ U37c · D19 — a viewer who may not read numbers gets ONE reason (typed_refused) and ONE sentence for all five; a reader gets the reason with the protected ones collapsed (under 18 and self-excluded → protected; stopped → suppressed; withdrawn → consent_withdrawn; erased → no_basis); and no typed result, refused or handed over, for either viewer, carries a basis key, a basisRef key, a LICENCE_* token or a ledger: ref", async () => {
    if (refusing.length !== 5) return [false, "no fixtures"];
    const id = await phrasedDraft();
    const { send: spy } = u37bSpy();
    const masked: TestResult[] = [];
    const reader: TestResult[] = [];
    for (const c of refusing) {
      masked.push(await sendTyped(id, c.number, o.id, { over: { ...c.over, send: spy } }));
      reader.push(await sendTyped(id, c.number, o.id, { reads: true, over: { ...c.over, send: spy } }));
    }
    const fresh = u37bKey();
    const handed = [await sendTyped(id, `+${fresh}`, o.id, { over: { send: spy } }), await sendTyped(id, `+${fresh}`, o.id, { reads: true, over: { send: spy } })];
    const all = [...masked, ...reader, ...handed];
    const leaks = all.filter((r) => "basis" in r || "basisRef" in r || /LICENCE_PLAYER|LICENCE_LIST|LICENCE_TEST|ledger:/.test(JSON.stringify(r)));
    const maskedOk = masked.every((r) => !r.ok && r.outcome === "refused" && r.reason === "typed_refused" && r.error === TEST.TEST_TYPED_REFUSED);
    const readerOk = reader.every((r, i) => !r.ok && r.outcome === "refused" && r.reason === refusing[i].reader);
    return [maskedOk && readerOk && handed.every((r) => r.ok) && leaks.length === 0,
      JSON.stringify({ masked: masked.map(reasonOf), reader: reader.map(reasonOf), handed: handed.map(reasonOf), leaks: leaks.length })];
  });

  await claim("§18.21 ⛔ U37c · NO STOP LINK ON THE WIRE — a typed test hands the officer exactly the text the wire carries, and neither carries a token; the number's token row is still made, for the stop page (2026-10-09)", async () => {
    const id = await phrasedDraft();
    const k = u37bKey();
    const { send: spy, spy: seen } = u37bSpy();
    const r = await sendTyped(id, `+${k}`, o.id, { over: { send: spy } });
    const token = (await db.marketingOptOutToken.listFor(k))[0]?.token ?? "";
    const row = await db.smsCampaign.find(id);
    const shown = row === null ? null : renderForRecipient(u37bTemplate(row), { variant: "SW", name: null, token: footerMeasurementToken(), origin: "book" });
    const wire = row === null || token === "" ? null : renderForRecipient(u37bTemplate(row), { variant: "SW", name: null, token, origin: "book" });
    return [r.ok && token.length === 8 && shown !== null && shown.ok && wire !== null && wire.ok && r.text === shown.text
      && seen.messages.length === 1 && seen.messages[0].body === wire.text && seen.messages[0].body === r.text && !r.text.includes(token) && !seen.messages[0].body.includes(token),
      `${reasonOf(r)} · token ${token.length ? "made" : "none"} · shown is the measurement render ${r.ok && shown !== null && shown.ok ? r.text === shown.text : false}`];
  });

  await claim("§18.22 ⭐ U37c · THE TYPED PREVIEW IS THE SAME FOR EVERY NUMBER — the loader's typed view renders the saved draft as a CONTACT-BOOK recipient with the measurement token, takes no number (draft and facts only), labels the tick with the saved adult.test version, and says why a typed test can't be offered in the test send's own order and words: licence outreach closed, then the 18+ wording unsaved, then no source line on the draft (its preview is shown — the line itself is never printed), and a saved text that cannot render for a book recipient is refused in the render's own words, never offered", async () => {
    const id = await phrasedDraft();
    const blankId = await u37bDraft();
    const row = await db.smsCampaign.find(id);
    const blank = await db.smsCampaign.find(blankId);
    if (row === null || blank === null) return [false, "no fixture rows"];
    const v = impl.typedView;
    const ready = v(row, { outreachOpen: true, adult: ADULT_TEST });
    const expected = renderForRecipient(u37bTemplate(row), { variant: "SW", name: null, token: footerMeasurementToken(), origin: "book" });
    const closed = v(row, { outreachOpen: false, adult: ADULT_TEST });
    const unsaved = v(row, { outreachOpen: true, adult: null });
    const noLine = v(blank, { outreachOpen: true, adult: ADULT_TEST });
    // U37c-2 · "allowed" implies a preview: {jina} with no fallback cannot render for a book recipient.
    const broken = { ...row, bodySw: "50pick: Habari {jina}, karibu.", nameFallbackSw: null } as typeof row;
    const brokenRender = renderForRecipient(u37bTemplate(broken), { variant: "SW", name: null, token: footerMeasurementToken(), origin: "book" });
    const unrenderable = v(broken, { outreachOpen: true, adult: ADULT_TEST });
    const refusedInItsWords = !brokenRender.ok && !unrenderable.allowed && unrenderable.why === (brokenRender.problems[0] ?? TEST.TEST_TEMPLATE_INVALID);
    // ⛔ The parameter NAMES, depth-aware: exactly `draft` and `facts` — a third parameter of any name (number, to, key) fails.
    const sigTyped = /export function composeTypedView\(([\s\S]*?)\): ComposeTypedView/.exec(impl.loaderSource)?.[1] ?? "";
    const paramNames: string[] = [];
    {
      let depth = 0;
      let part = "";
      for (const ch of `${sigTyped},`) {
        if (ch === "{" || ch === "(" || ch === "[" || ch === "<") depth++;
        else if (ch === "}" || ch === ")" || ch === "]" || ch === ">") depth--;
        if (ch === "," && depth === 0) {
          const name = /^\s*([A-Za-z_$][\w$]*)\s*\??\s*:/.exec(part)?.[1];
          if (part.trim() !== "") paramNames.push(name ?? "?");
          part = "";
        } else part += ch;
      }
    }
    const takesNoNumber = paramNames.join(",") === "draft,facts" && LOADER.composeTypedView.length === 2;
    return [ready.allowed && ready.why === null && expected.ok && ready.preview?.SW === expected.text && ready.attestation?.version === 3
      && !closed.allowed && closed.why === TEST.TEST_TYPED_OUTREACH_CLOSED && !unsaved.allowed && unsaved.why === TEST.TEST_TYPED_NO_ATTESTATION_WORDING
      && !noLine.allowed && noLine.why === TEST.TEST_TYPED_NEEDS_SOURCE_LINE && noLine.preview !== null && takesNoNumber && refusedInItsWords,
      JSON.stringify({ ready: { allowed: ready.allowed, why: ready.why, same: ready.preview?.SW === (expected.ok ? expected.text : null) }, closed: closed.why, unsaved: unsaved.why, noLine: noLine.why, takesNoNumber, unrenderable: unrenderable.why })];
  });

  await claim("§18.23 ⛔ U37c · S24 · THE TYPED BUDGETS — five typed tests to one number from three officers pass and the sixth is refused typed_rate_limited with the recipient's sentence, while another number is still allowed and the bucket key holds no digit run of the number; one officer's eleventh typed test to eleven numbers is refused typed_rate_limited with the officer's sentence while their own-number test still passes; and a refusal before the gate spends neither budget", async () => {
    const id = await phrasedDraft();
    const k = u37bKey();
    // 2026-10-09 · officers who may type a number: the Owner and two Compliance officers.
    const three = [await officer({ role: "ADMIN" }), await officer({ role: "COMPLIANCE" }), await officer({ role: "COMPLIANCE" })];
    const { send: spy } = u37bSpy();
    const real = { rateTyped: impl.testDeps.rateTyped, rateTo: impl.testDeps.rateTo, send: spy };
    const toOne: TestResult[] = [];
    for (let i = 0; i < 6; i++) toOne.push(await sendTyped(id, `+${k}`, three[i % 3].id, { over: real }));
    const other = await sendTyped(id, `+${u37bKey()}`, three[0].id, { over: real });
    const bucket = TEST.testToBucket(k);
    const busy = await officer({ role: "COMPLIANCE" });
    const many: TestResult[] = [];
    for (let i = 0; i < 11; i++) many.push(await sendTyped(id, `+${u37bKey()}`, busy.id, { over: real }));
    const own = await send({ campaignId: id, variant: "SW" }, busy.id, { send: spy });
    let spent = 0;
    const counted = { rateTyped: async () => { spent++; return ALLOW(); }, rateTo: async () => { spent++; return ALLOW(); } };
    const early = await sendTyped(id, `+${u37bKey()}`, busy.id, { over: { ...counted, gateReads: DB_GATE_READS, send: spy } });
    const sixth = toOne[5];
    const eleventh = many[10];
    return [toOne.slice(0, 5).every((r) => r.ok) && !sixth.ok && sixth.outcome === "refused" && sixth.reason === "typed_rate_limited" && sixth.error.startsWith("That number has had as many tests")
      && other.ok && /^testTo:[a-p]{16}$/.test(bucket) && !bucket.includes(k) && !bucket.includes(k.slice(3))
      && many.slice(0, 10).every((r) => r.ok) && !eleventh.ok && eleventh.outcome === "refused" && eleventh.reason === "typed_rate_limited"
      && eleventh.error.startsWith("That is your limit of tests to other numbers")
      && own.ok && !early.ok && early.outcome === "refused" && early.reason === "typed_outreach_closed" && spent === 0,
      JSON.stringify({ toOne: toOne.map(reasonOf), other: reasonOf(other), last: many.slice(9).map(reasonOf), own: reasonOf(own), early: reasonOf(early), spent })];
  });

  await claim("§18.24 ⭐ U37c · THE OFFICER'S OWN NUMBER, TYPED IN ANOTHER SPELLING, IS THEIR OWN — the own path: an ACCOUNT recipient greeted by their own first name, no source line, target own, and no 18+ confirmation asked", async () => {
    const id = await phrasedDraft();
    const { send: spy, spy: seen } = u37bSpy();
    const r = await sendTyped(id, spellings(o.key).local, o.id, { attested: false, over: { send: spy } });
    return [r.ok && r.target === "own" && r.text.startsWith("50pick: Habari Asha,") && !r.text.includes(PHRASE) && seen.messages.length === 1 && seen.messages[0].to === o.key,
      `${reasonOf(r)}${r.ok ? ` · ${r.target} · ${JSON.stringify(r.text.slice(0, 24))}` : `: ${r.error}`}`];
  });

  await claim("§18.25 ⛔ U37c · TYPED TESTS ARE REFUSED UP FRONT — the same answer for a player's number and a stranger's, with ZERO gate calls: licence outreach closed (typed_outreach_closed), the 18+ wording unsaved (typed_no_attestation_wording), and a draft with no source line (typed_needs_source_line)", async () => {
    const id = await phrasedDraft();
    const blankId = await u37bDraft();
    const player = await officer();
    const stranger = u37bKey();
    let gates = 0;
    const spyGate = async () => { gates++; return { ok: true as const, basis: "LICENCE_TEST" as const, basisRef: "test:fixture" }; };
    const cases: { want: string; campaign: string; over: Partial<TestDeps> }[] = [
      { want: "typed_outreach_closed", campaign: id, over: { gateReads: DB_GATE_READS } },
      { want: "typed_no_attestation_wording", campaign: id, over: { adultTestWording: () => null } },
      { want: "typed_needs_source_line", campaign: blankId, over: {} },
    ];
    const got: string[] = [];
    let same = true;
    for (const c of cases) {
      const a = await sendTyped(c.campaign, `+${player.key}`, o.id, { over: { ...c.over, gate: spyGate } });
      const b = await sendTyped(c.campaign, `+${stranger}`, o.id, { over: { ...c.over, gate: spyGate } });
      got.push(`${reasonOf(a)} | ${reasonOf(b)}`);
      if (reasonOf(a) !== c.want || reasonOf(b) !== c.want || a.ok || b.ok || a.error !== b.error) same = false;
    }
    return [same && gates === 0, `${got.join(" · ")} · gate calls ${gates}`];
  });

  await claim("§18.26 ⛔ U37c · A REFUSED TYPED NUMBER GETS NO TOKEN — the pre-check refuses before a stop link is minted: a withdrawn number has no token row after its refused test", async () => {
    const id = await phrasedDraft();
    const k = u37bKey();
    const r = await sendTyped(id, `+${k}`, o.id, { over: { gateReads: withdrawnReads(k) } });
    const n = await tokenCount(k);
    return [!r.ok && r.outcome === "refused" && n === 0, `${reasonOf(r)} · tokens ${n}`];
  });

  await claim("§18.27 ⛔ U37c · S25 · THE FLOOR — on an injected clock, EVERY typed outcome decided at the gate or after it waits until TYPED_TEST_MIN_MS has passed since the request began — a hand-over, a refusal at the gate, a gate that could not answer, a send held by the credit floor, a send the network refused, a lost reply (unconfirmed) and a throw after the gate — while a refusal before the gate (no 18+ confirmation) does not wait at all", async () => {
    const id = await phrasedDraft();
    const clock = () => {
      let at = Date.now();
      const waits: number[] = [];
      return { waits, over: { now: () => new Date(at), sleep: async (ms: number) => { waits.push(ms); at += ms; } } as Partial<TestDeps> };
    };
    const total = (x: number[]) => x.reduce((s, n) => s + n, 0);
    const refusedKey = u37bKey();
    /** A gateway that refuses outright — a failed send that is not a lost reply. */
    const refusing = (async (ms: Outbound[]) => ({
      results: ms.map((m) => ({ to: m.to, targetType: m.targetType ?? null, targetId: m.targetId ?? null, reference: "", ok: false, code: "INVALID_NUMBER", error: "refused (fixture)" })),
      balanceTzs: null,
    })) as unknown as TestDeps["send"];
    type Case = { name: string; want: string; over: Partial<TestDeps>; throws?: boolean };
    const cases: Case[] = [
      { name: "handed over", want: "HANDED OVER", over: { send: u37bSpy().send } },
      { name: "refused at the gate", want: "typed_refused", over: { gateReads: withdrawnReads(refusedKey), send: u37bSpy().send } },
      { name: "gate unanswered", want: "held", over: { gate: async () => { throw new Error("gate down (fixture)"); }, send: u37bSpy().send } },
      { name: "held by the floor", want: "held", over: { send: u37bSpy("floor").send } },
      { name: "network refused", want: "failed", over: { send: refusing } },
      { name: "lost reply", want: "unconfirmed", over: { send: u37bSpy("transport").send } },
      { name: "throw after the gate", want: "threw", over: { ensureToken: async () => { throw new Error("token store down (fixture)"); } }, throws: true },
    ];
    const got: string[] = [];
    let held = true;
    for (const c of cases) {
      const ck = clock();
      const n = c.name === "refused at the gate" ? refusedKey : u37bKey();
      let said = "";
      try { said = reasonOf(await sendTyped(id, `+${n}`, o.id, { over: { ...c.over, ...ck.over } })); } catch { said = "threw"; }
      got.push(`${c.name}: ${said} waited ${total(ck.waits)}`);
      if (said !== c.want || total(ck.waits) !== TEST.TYPED_TEST_MIN_MS) held = false;
    }
    const c0 = clock();
    const early = await sendTyped(id, `+${u37bKey()}`, o.id, { attested: false, over: { ...c0.over, send: u37bSpy().send } });
    return [held && !early.ok && early.outcome === "refused" && early.reason === "attestation_missing" && c0.waits.length === 0,
      `${got.join(" · ")} · before the gate: ${reasonOf(early)} waited ${total(c0.waits)}`];
  });

  await claim("§18.29 ⛔ U37c · A RECIPIENT IS RE-TYPED, NEVER TRUSTED — an array, a bare string, a number that is not a string, a number over 40 characters and an unknown kind are each refused bad_recipient (reported as a typed attempt); a string the numbering plan refuses is bad_number with THE PARSER'S OWN sentence; and none of them reaches the rail, the gate or the token store", async () => {
    const id = await phrasedDraft();
    let rails = 0;
    let gates = 0;
    let tokens = 0;
    const over: Partial<TestDeps> = {
      rail: () => { rails++; return null; },
      gate: async () => { gates++; return { ok: true as const, basis: "LICENCE_TEST" as const, basisRef: "test:fixture" }; },
      ensureToken: async () => { tokens++; return "abcdefgh"; },
    };
    const shapes: unknown[] = [
      [{ kind: "typed", number: "+255712000000", adultAttested: true }],
      "+255712000000",
      { kind: "typed", number: 255712000000, adultAttested: true },
      { kind: "typed", number: `+255 712 000 000${" ".repeat(30)}`, adultAttested: true },
      { kind: "someone", number: "+255712000000", adultAttested: true },
    ];
    const bad: TestResult[] = [];
    for (const recipient of shapes) {
      bad.push(await impl.test({ campaignId: id, variant: "SW", recipient } as unknown as TestInput, o.id, deps(typedOver(over)), { viewerReads: false }));
    }
    const numbers = ["12345", "0222 123 456"];
    const parsed: TestResult[] = [];
    for (const n of numbers) parsed.push(await sendTyped(id, n, o.id, { over }));
    return [bad.every((r) => !r.ok && r.outcome === "refused" && r.reason === "bad_recipient" && r.error === TEST.TEST_BAD_RECIPIENT && r.target === "typed")
      && parsed.every((r, i) => !r.ok && r.outcome === "refused" && r.reason === "bad_number" && r.error === parseTzNumber(numbers[i]).reason)
      && rails === 0 && gates === 0 && tokens === 0,
      JSON.stringify({ bad: bad.map(reasonOf), parsed: parsed.map((r) => (r.ok ? "SENT" : `${r.reason}: ${r.error}`)), rails, gates, tokens })];
  });

  await claim("§18.30 ⛔ U37c · OD61 · A TYPED TEST WRITES NO RG COMPLIANCE ROW — a typed test to a self-excluded player is refused and leaves NO marketing.suppressed.rg row for that account (a row that appeared the moment one typed number was refused would tell the console's activity feed the number is a protected player); the control: the campaign send loop refusing the same number DOES write one", async () => {
    const excluded = refusing.find((c) => c.name === "a self-excluded player");
    if (excluded === undefined) return [false, "no fixture"];
    const id = await phrasedDraft();
    const rgRows = async () => {
      await auditFlush();
      const user = await db.user.findByPhone(`+${excluded.key}`);
      return getAuditPage({ category: "COMPLIANCE", limit: 5000 }).filter((e) => e.action === "marketing.suppressed.rg" && e.targetId === user?.id).length;
    };
    const before = await rgRows();
    const r = await sendTyped(id, excluded.number, o.id, { reads: true, over: { send: u37bSpy().send } });
    const afterTyped = await rgRows();
    const { send: spy } = u37bSpy();
    await dispatchSlice([{ ref: `cmp_u37c_loop_${u37bSeq}`, msisdn: excluded.key, body: "50pick: fixture" }], { send: spy, window: ALWAYS_OPEN });
    const afterLoop = await rgRows();
    return [!r.ok && r.outcome === "refused" && r.reason === "protected" && afterTyped === before && afterLoop === before + 1,
      `typed ${reasonOf(r)} · RG rows ${before} → ${afterTyped} (typed) → ${afterLoop} (the loop)`];
  });

  await claim("§18.31 ⛔ U37c · THE GATE IS ASKED AGAIN AT THE SEND — a typed hand-over asks the ONE gate twice, the pre-check and dispatch's own ask immediately before the wire, while a refusal at the pre-check asks it once and never reaches the send", async () => {
    const id = await phrasedDraft();
    let asked = 0;
    const counting = async (m: string) => { asked++; return mayReceiveMarketingSms(m, new Date(), OPEN_READS, { testAttestation: { officerId: o.id, at: new Date().toISOString(), attemptRef: "ta_countingcounting", wordingVersion: 3 } }); };
    const { send: spy, spy: seen } = u37bSpy();
    const handed = await sendTyped(id, `+${u37bKey()}`, o.id, { over: { gate: counting, send: spy } });
    const handedAsks = asked;
    asked = 0;
    const k = u37bKey();
    const refusedGate = async (m: string) => { asked++; return mayReceiveMarketingSms(m, new Date(), withdrawnReads(k)); };
    const refused = await sendTyped(id, `+${k}`, o.id, { over: { gate: refusedGate, send: spy } });
    return [handed.ok && handedAsks === 2 && !refused.ok && asked === 1 && seen.calls === 1,
      `handed ${reasonOf(handed)} asked ${handedAsks} · refused ${reasonOf(refused)} asked ${asked} · sends ${seen.calls}`];
  });

  await claim("§18.28 ⭐ U37c · DEPLOY SKEW — a two-argument post from an old page (no recipient at all) still tests the officer's OWN number: target own, the message to their key", async () => {
    const id = await phrasedDraft();
    const { send: spy, spy: seen } = u37bSpy();
    const r = await send({ campaignId: id, variant: "SW" }, o.id, { send: spy });
    return [r.ok && r.target === "own" && seen.messages.length === 1 && seen.messages[0].to === o.key,
      `${reasonOf(r)}${r.ok ? ` · ${r.target}` : `: ${r.error}`}`];
  });

  await claim("§18.33 ⛔ U13 · M12 · THE TEST SEND OBEYS THE SEND WINDOW — outside it (03:00 EAT) the officer's own test and a typed one are each refused 'held' with the window's sentence, word for word, before a token, a row or the wire: no token minted, no SmsMessage row, the gate never asked, and the masked audit row says held: quiet_hours; a window that closes between that check and the send still holds the test, with no row", async () => {
    // 2026-10-09 · a Compliance officer: the typed half needs a role that may type a number.
    const o33 = await officer({ role: "COMPLIANCE" });
    const id = await phrasedDraft();
    const QUIET = "It's outside the send window (08:00–20:00 EAT), so no test can be sent now — try again at 08:00.";
    const start = audits.length;
    let gates = 0;
    const counting = async (m: string) => { gates++; return mayReceiveMarketingSms(m); };
    const realSend = TEST.CAMPAIGN_TEST_DEPS.send;
    const before = await tokenCount(o33.key);
    const own = await send({ campaignId: id, variant: "SW" }, o33.id, { send: realSend, gate: counting, window: ALWAYS_CLOSED });
    const typedKey = u37bKey();
    const typed = await sendTyped(id, `+${typedKey}`, o33.id, { over: { send: realSend, gate: counting, window: ALWAYS_CLOSED } });
    const tokensClosed = (await tokenCount(o33.key)) - before + (await tokenCount(typedKey));
    // The window that closes between the check (open) and the send (closed): dispatch's own read holds it.
    let reads = 0;
    const closing = () => (++reads === 1 ? ALWAYS_OPEN() : ALWAYS_CLOSED());
    const late = await send({ campaignId: id, variant: "SW" }, o33.id, { send: realSend, window: closing });
    const rows = audits.slice(start).filter((a) => a.action === TEST.CAMPAIGN_TEST_ACTION && a.actorId === o33.id);
    const heldRow = (a: AuditRow) => a.payload?.outcome === "refused" && a.payload?.reason === "held" && a.payload?.held === "quiet_hours";
    const said = (r: TestResult) => !r.ok && r.outcome === "refused" && r.reason === "held" && r.error === QUIET;
    return [said(own) && own.target === "own" && said(typed) && typed.target === "typed" && said(late)
      && QUIET === TEST.testQuietHours(ALWAYS_CLOSED()) && gates === 0 && tokensClosed === 0 && smsRowsFor(id).length === 0
      && rows.length === 3 && rows.every(heldRow) && reads === 2,
      `own ${reasonOf(own)}${own.ok ? "" : `: ${own.error}`} · typed ${reasonOf(typed)} · late ${reasonOf(late)} · gate asked ${gates} · tokens ${tokensClosed} · rows ${smsRowsFor(id).length} · audit ${JSON.stringify(rows.map((a) => a.payload ?? null))} · window reads ${reads}`];
  });

  await claim(S18_36, async () => {
    const id = await phrasedDraft();
    const refKey = u37bKey();
    // Keyed by the REAL writer, from the contact spelled the way an applicant types it.
    await recordRefereeKeys({ contacts: [`0${refKey.slice(3)}`], namedAt: "2026-09-08T10:00:00.000Z" });
    const { send: spy, spy: seen } = u37bSpy();
    const start = audits.length;
    const before = await tokenCount(refKey);
    const masked = await sendTyped(id, `+${refKey}`, o.id, { over: { send: spy } });
    const reader = await sendTyped(id, `+${refKey}`, o.id, { reads: true, over: { send: spy } });
    const minted = (await tokenCount(refKey)) - before;
    const rows = audits.slice(start).filter((a) => a.action === TEST.CAMPAIGN_TEST_ACTION && a.actorId === o.id);
    // The officer's OWN number, given by somebody as a referee: the own path is refused too, in its own words.
    const own = await officer();
    await recordRefereeKeys({ contacts: [`+${own.key}`], namedAt: "2026-09-08T10:00:00.000Z" });
    const ownR = await send({ campaignId: id, variant: "SW" }, own.id, { send: spy });
    const refusedAs = (r: TestResult, reason: string, error: string) => !r.ok && r.outcome === "refused" && r.reason === reason && r.error === error;
    // ⛔ MINOR-5 · no screen names the referee: the reader's sentence is the ONE protected one, the own-number words say
    // "protected", and only the audit rows keep the precise reason.
    const screens = [masked, reader, ownR].map((r) => (r.ok ? "" : r.error)).join(" ");
    return [refusedAs(masked, "typed_refused", TEST.TEST_TYPED_REFUSED)
      && refusedAs(reader, "protected", TEST.typedReaderSentence("protected"))
      && TEST.typedReaderReason("agent_referee") === "protected"
      && rows.length === 2 && rows.every((a) => a.payload?.reason === "agent_referee" && a.payload?.target === "typed")
      && refusedAs(ownR, "agent_referee", TEST.testGateSentence("agent_referee")) && /protected/.test(TEST.testGateSentence("agent_referee"))
      && !/referee/i.test(screens.split(TEST.typedReaderSentence("protected")).join(""))
      && seen.calls === 0 && minted === 0,
      `masked ${reasonOf(masked)} · reader ${reasonOf(reader)} · audit ${JSON.stringify(rows.map((a) => a.payload?.reason ?? null))} · own ${reasonOf(ownR)} · sends ${seen.calls} · tokens ${minted}`];
  });

  /* ── U43b-1 · E3 · F1 — the send step used to answer a lost reply (TRANSPORT) as `failed`, and the test send turned it
   *    back into `unconfirmed` by hand. The step now says so itself, for every caller; the test send's answer is unchanged. ── */
  await claim("§18.34 ⭐ U43b-1 · E3 · A LOST REPLY ARRIVES UNCONFIRMED BY CONSTRUCTION — the send step itself answers a TRANSPORT result 'unconfirmed', keeping the wire's reference and the gate's basis (never 'failed', which invites a second charge), and the test send through that step is unchanged: 'unconfirmed', don't resend, and its masked row still records TRANSPORT for a lost reply and no_answer for a send that threw", async () => {
    const o34 = await officer();
    const id = await u37bDraft();
    // The step alone, as the engine will call it: one cleared row, a wire that lost its reply.
    const step = await impl.dispatch([{ ref: `cmp_u43b1_step_${u37bSeq}`, msisdn: o34.key, body: "50pick: fixture" }], { send: u37bSpy("transport").send, window: ALWAYS_OPEN });
    // The test send through the same step, with the step's own answers observed.
    const seen: Array<Record<string, unknown>> = [];
    const observed: TestDeps["dispatch"] = async (rows, d) => {
      const out = await impl.dispatch(rows, d);
      seen.push(...(out as unknown as Array<Record<string, unknown>>));
      return out;
    };
    const start = audits.length;
    const lost = await send({ campaignId: id, variant: "SW" }, o34.id, { send: u37bSpy("transport").send, dispatch: observed });
    const threw = await send({ campaignId: id, variant: "SW" }, o34.id, { send: u37bSpy("throw").send, dispatch: observed });
    const rows = audits.slice(start).filter((a) => a.action === TEST.CAMPAIGN_TEST_ACTION && a.actorId === o34.id);
    const s = step[0] as unknown as Record<string, unknown> | undefined;
    return [s?.outcome === "unconfirmed" && s.reference === "sms_lost_1" && s.code === "TRANSPORT" && s.basis === "CONSENT"
      && seen.length === 2 && seen[0]?.outcome === "unconfirmed" && seen[0]?.reference === "sms_lost_1"
      && seen[1]?.outcome === "unconfirmed" && seen[1]?.reference === undefined
      && !lost.ok && lost.outcome === "unconfirmed" && lost.error === TEST.TEST_UNCONFIRMED && !threw.ok && threw.outcome === "unconfirmed"
      && rows.length === 2 && rows[0].payload?.outcome === "unconfirmed" && rows[0].payload?.reason === "TRANSPORT"
      && rows[1].payload?.outcome === "unconfirmed" && rows[1].payload?.reason === "no_answer",
      `the step ${String(s?.outcome ?? "none")}${s?.code ? ` ${String(s.code)}` : ""} ref ${String(s?.reference ?? "none")} · under the test ${seen.map((o) => `${String(o.outcome)}:${String(o.reference ?? "-")}`).join(" ")} · lost ${reasonOf(lost)} · threw ${reasonOf(threw)} · audit ${JSON.stringify(rows.map((a) => a.payload?.reason ?? null))}`];
  });

  /* ── U43b-2 review · only the network's own "no" (REJECTED) says the network refused; a failure sendBatch met BEFORE its
   *    request (UNKNOWN — its chunk catch) never claims the network was asked. Nothing reached the phone either way. ── */
  await claim("§18.35 U43b-2 review · ONLY THE NETWORK'S OWN NO SAYS IT REFUSED — a REJECTED answer is refused 'failed' saying the network refused the message; an UNKNOWN one (a failure before the request) is refused 'failed' saying it couldn't be handed to the SMS network, never that the network refused; and each says nothing reached the phone", async () => {
    const o35 = await officer();
    const id = await u37bDraft();
    const refused = await send({ campaignId: id, variant: "SW" }, o35.id, { send: u37bSpy("rejected").send });
    const prewire = await send({ campaignId: id, variant: "SW" }, o35.id, { send: u37bSpy("unknown").send });
    const words = (r: TestResult): string => (r.ok ? "" : r.error);
    return [!refused.ok && refused.outcome === "refused" && reasonOf(refused) === "failed" && words(refused).startsWith("The network refused the message (REJECTED)")
      && !prewire.ok && prewire.outcome === "refused" && reasonOf(prewire) === "failed" && words(prewire).includes("couldn't be handed to the SMS network")
      && !words(prewire).includes("refused") && words(refused).includes("nothing reached your phone") && words(prewire).includes("nothing reached your phone"),
      `REJECTED: ${reasonOf(refused)} "${words(refused)}" · UNKNOWN: ${reasonOf(prewire)} "${words(prewire)}"`];
  });

  /* ══ §18.37–§18.39 · THE OWNER'S RULING OF 2026-10-09 — A TEST TO A TYPED NUMBER IS FOR THE OWNER AND COMPLIANCE ONLY ══ */
  await claim(S18_37, async () => {
    const id = await phrasedDraft();
    const start = audits.length;
    // Everything a typed test could reach past the role, counted: the rail, the switch, the window, the record, the typed
    // budgets, the gate, the floor, the token store and the wire.
    const n = { rail: 0, live: 0, window: 0, outreach: 0, budgets: 0, gate: 0, floor: 0, tokens: 0 };
    const { send: spy, spy: wire } = u37bSpy();
    const counted: Partial<TestDeps> = {
      rail: () => { n.rail++; return null; },
      liveSwitch: async () => { n.live++; return impl.readSwitch(); },
      window: () => { n.window++; return ALWAYS_OPEN(); },
      gateReads: { ...OPEN_READS, outreach: () => { n.outreach++; return OPEN_OUTREACH; } } as TestDeps["gateReads"],
      rateTyped: async () => { n.budgets++; return ALLOW(); },
      rateTo: async () => { n.budgets++; return ALLOW(); },
      gate: async () => { n.gate++; return { ok: true as const, basis: "LICENCE_TEST" as const, basisRef: "test:fixture" }; },
      sleep: async () => { n.floor++; },
      ensureToken: async (raw: string) => { n.tokens++; return impl.ensureToken(raw); },
      send: spy,
    };
    const asRole = (r: TestResult): boolean => !r.ok && r.outcome === "refused" && r.reason === "typed_role"
      && r.error === TEST.TEST_TYPED_ROLE_REFUSED && r.target === "typed";
    const stranger = u37bKey();
    const numbers: string[] = [stranger];
    const roleOf = new Map<string, string | null>();
    const said: string[] = [];
    let refused = true;
    // ⛔ Every role but the two tries a typed number four ways: a valid one, ticked; a malformed one (never parsed — not
    // bad_number); its own in another spelling, unticked (never compared — not the own path); and with a reader's options.
    for (const role of ["GROWTH", "FINANCE", "SUPPORT", "AUDITOR", "MODERATOR", "PLAYER", "AGENT"] as FixtureRole[]) {
      const who = await officer({ role });
      roleOf.set(who.id, role);
      numbers.push(who.key);
      const tries = [
        await sendTyped(id, `+${stranger}`, who.id, { over: counted }),
        await sendTyped(id, "12345", who.id, { over: counted }),
        await sendTyped(id, spellings(who.key).local, who.id, { attested: false, over: counted }),
        await sendTyped(id, `+${stranger}`, who.id, { reads: true, over: counted }),
      ];
      if (!tries.every(asRole) || (await tokenCount(who.key)) !== 0) refused = false;
      said.push(`${role} ${tries.map(reasonOf).join("/")}`);
    }
    // ⛔ The browser's word: a role posted beside the recipient, and inside it, is never read.
    const growth = await officer({ role: "GROWTH" });
    roleOf.set(growth.id, "GROWTH");
    const posted = await impl.test({
      campaignId: id, variant: "SW", role: "ADMIN",
      recipient: { kind: "typed", number: `+${stranger}`, adultAttested: true, attestedVersion: ADULT_TEST.v, role: "ADMIN" },
    } as unknown as TestInput, growth.id, deps(typedOver(counted)), { viewerReads: true });
    // ⛔ An officer the store holds no row for has no role, so no typed test.
    const nobodyId = `usr_u37b_nobody_${u37bSeq}`;
    roleOf.set(nobodyId, null);
    const nobody = await sendTyped(id, `+${stranger}`, nobodyId, { over: counted });
    // ⭐ GROWTH's own test still goes — "My own number", the one way its card offers.
    const { send: ownSpy, spy: ownWire } = u37bSpy();
    const own = await send({ campaignId: id, variant: "SW" }, growth.id, { send: ownSpy });
    // ⭐ The Owner and Compliance, as before: through the ONE gate to the wire.
    const { send: okSpy, spy: okWire } = u37bSpy();
    const allowed = [
      await sendTyped(id, `+${u37bKey()}`, (await officer({ role: "ADMIN" })).id, { over: { send: okSpy } }),
      await sendTyped(id, `+${u37bKey()}`, (await officer({ role: "COMPLIANCE" })).id, { over: { send: okSpy } }),
    ];
    // ONE masked row per refused attempt — the door's own, against the campaign, with the stored role and no `to`.
    const rows = audits.slice(start).filter((a) => a.action === TEST.CAMPAIGN_TEST_ACTION && a.payload?.reason === "typed_role");
    const rowsOk = rows.length === 7 * 4 + 2 && rows.every((a) => a.targetId === id && a.payload?.outcome === "refused"
      && a.payload?.target === "typed" && !("to" in (a.payload ?? {})) && roleOf.has(a.actorId ?? "")
      && a.payload?.role === roleOf.get(a.actorId ?? ""));
    const json = JSON.stringify(rows);
    const quiet = numbers.every((k) => !json.includes(k) && !json.includes(k.slice(3))) && !/(?<![0-9])255[0-9]{9}(?![0-9])/.test(json)
      && !/[0-9]/.test(TEST.TEST_TYPED_ROLE_REFUSED);
    const untouched = Object.values(n).every((x) => x === 0) && wire.calls === 0 && (await tokenCount(stranger)) === 0;
    // ⭐ The ONE sentence, word for word — and in the console's own labels for the two roles (roles.ts ROLE_LABEL), so it
    // names them as Staff & roles does.
    const ROLE_SENTENCE = "Tests to another number are for the Owner and Compliance only — send yourself a test.";
    const sentence = TEST.TEST_TYPED_ROLE_REFUSED === ROLE_SENTENCE
      && ROLE_SENTENCE.includes(`for the ${ROLES.ROLE_LABEL.ADMIN} and ${ROLES.ROLE_LABEL.COMPLIANCE} only`);
    // The decider, of every role roles.ts names and of values that are none of them.
    const every: string[] = [...ROLES.STAFF_ROLES, "PLAYER", "AGENT"];
    const admitted = every.filter((r) => TEST.mayTestTypedNumber(r)).sort().join(",");
    const strays = [null, undefined, "", "admin", "Admin", "OWNER", " ADMIN", "__proto__", "constructor", "toString"]
      .filter((r) => TEST.mayTestTypedNumber(r as string | null | undefined));
    return [refused && asRole(posted) && asRole(nobody) && own.ok && own.target === "own" && ownWire.calls === 1
      && allowed.every((r) => r.ok && r.target === "typed") && okWire.calls === 2 && rowsOk && quiet && untouched && sentence
      && new Set(every).size === 9 && admitted === "ADMIN,COMPLIANCE" && strays.length === 0,
      JSON.stringify({ said, posted: reasonOf(posted), nobody: reasonOf(nobody), own: reasonOf(own), allowed: allowed.map(reasonOf), rows: rows.length, rowsOk, quiet, sentence, n, wire: wire.calls, admitted, strays })];
  });

  await claim("§18.38 ⛔ 2026-10-09 · THE ROLE IS ASKED FIRST, OF THE STORED ROW, BY THE ONE DECIDER — in sendCampaignTest the typed role check (mayTestTypedNumber(officer?.role), refused typed_role in TEST_TYPED_ROLE_REFUSED) sits right after the officer's stored read (deps.users.findById(officerId)) and before the typed number is parsed (parseTzNumber(recipient.number)), masked (maskPhone(key)) or set beside the officer's own (key === ownKey); the door asks it once and reads no role from the request; and the decider is a full record over every role, the Owner's ADMIN and Compliance's COMPLIANCE alone true", async () => {
    const src = impl.testSendSource.split(CR17).join("");
    const fnAt = src.indexOf("export async function sendCampaignTest(");
    const fn = fnAt < 0 ? "" : src.slice(fnAt);
    const at = (s: string): number => fn.indexOf(s);
    const iRead = at("const officer = await deps.users.findById(officerId);");
    const iCheck = at('if (recipient.kind === "typed" && !mayTestTypedNumber(officer?.role)) {');
    const iRefuse = at('return refuse("typed_role", TEST_TYPED_ROLE_REFUSED);');
    const iParse = at("parseTzNumber(recipient.number)");
    const iMask = at("maskPhone(key)");
    const iOwn = at("key === ownKey");
    const order = iRead > 0 && iCheck > iRead && iRefuse > iCheck && iParse > iRefuse && iMask > iParse && iOwn > iParse;
    const once = fn.split("mayTestTypedNumber(").length - 1 === 1 && !/\b(?:input|recipient|options|raw)[?]?[.]role\b/.test(fn);
    const recAt = src.indexOf("const MAY_TYPE_A_NUMBER: Readonly<Record<Role, boolean>> = {");
    const rec = recAt < 0 ? "" : src.slice(recAt, src.indexOf("};", recAt));
    const entries = [...rec.matchAll(/^ {2}([A-Z]+): (true|false),$/gm)].map((m) => `${m[1]}=${m[2]}`);
    const record = entries.length === 9 && new Set(entries.map((e) => e.split("=")[0])).size === 9
      && entries.filter((e) => e.endsWith("=true")).sort().join(",") === "ADMIN=true,COMPLIANCE=true"
      && src.includes('import type { Role } from "@/lib/server/roles";')
      && src.includes('return typeof role === "string" && Object.prototype.hasOwnProperty.call(MAY_TYPE_A_NUMBER, role) && MAY_TYPE_A_NUMBER[role as Role] === true;');
    return [order && once && record, JSON.stringify({ iRead, iCheck, iRefuse, iParse, iMask, iOwn, once, entries })];
  });

  await claim("§18.39 ⛔ 2026-10-09 · THE CARD IS OFFERED 'ANOTHER NUMBER' ONLY WHERE THE DOOR WOULD TAKE IT — loadComposer asks the door's own decider (mayTestTypedNumber, imported from campaign-test-send.ts) once, of the officer's STORED row (db.user.findById of the session's user — the row the door re-reads), never of the address; it hands typedOffered beside the typed view; a viewer who may not type gets the empty view (TYPED_NOT_OFFERED: not allowed, no reason, no preview, no 18+ words, frozen) and composeTypedView is never asked for them, while every other viewer gets composeTypedView's own", async () => {
    const loader = impl.loaderSource.split(CR17).join("");
    const fnAt = loader.indexOf("export async function loadComposer(");
    const fn = fnAt < 0 ? "" : loader.slice(fnAt);
    const READ = "const officer = session ? await db.user.findById(session.userId) : null;";
    const DECIDE = "const typedOffered = mayTestTypedNumber(officer?.role);";
    const wiring = {
      // the door's decider, in the loader's ONE import of the door's module
      imported: /import \{[^}]*\bmayTestTypedNumber\b[^}]*\} from "@\/lib\/server\/marketing\/campaign-test-send";/.test(loader)
        && loader.split('from "@/lib/server/marketing/campaign-test-send";').length - 1 === 1,
      decided: fn.indexOf(READ) > 0 && fn.indexOf(DECIDE) > fn.indexOf(READ) && fn.split("mayTestTypedNumber(").length - 1 === 1,
      handed: /typed: typedOffered\s*\?\s*composeTypedView\(draft, \{/.test(fn) && /:\s*TYPED_NOT_OFFERED,\s*typedOffered,/.test(fn)
        && fn.split("composeTypedView(").length - 1 === 1,
      typedField: /typed: ComposeTypedView;[\s\S]{0,900}?typedOffered: boolean;/.test(loader),
    };
    const empty = LOADER.TYPED_NOT_OFFERED;
    const emptyOk = Object.isFrozen(empty) && empty.allowed === false && empty.why === null && empty.preview === null
      && empty.attestation === null && Object.keys(empty).sort().join(",") === "allowed,attestation,preview,why";
    return [Object.values(wiring).every(Boolean) && emptyOk, JSON.stringify({ ...wiring, emptyOk })];
  });
  return failed;
}
/** 2026-10-09 · §18.37's claim — named once, so its red cases expect exactly what the run says. */
const S18_37 = "§18.37 ⛔ 2026-10-09 · A TEST TO A TYPED NUMBER IS FOR THE OWNER AND COMPLIANCE ONLY, BY THE STORED ROLE — GROWTH, FINANCE, SUPPORT, AUDITOR, MODERATOR, PLAYER, AGENT and an officer with no row are each refused typed_role in ONE sentence that names no number — 'Tests to another number are for the Owner and Compliance only — send yourself a test.', in the console's own labels for the two roles — before anything about the number is read: a malformed number is never parsed (not bad_number), their own number in another spelling is never compared (not the own path), a reader's options change nothing, and nothing reaches the rail, the switch, the window, the record, the typed budgets, the gate, the floor, the token store or the wire; each attempt writes ONE masked marketing.campaign_test row (typed_role, target typed, the campaign named, the stored role, no to, no digit run of a number); a role posted beside the recipient is never read; GROWTH's own test still goes; the Owner (ADMIN) and Compliance are handed over as before; and the decider admits exactly those two of every role roles.ts names, and nothing that is none of them";
/** U33r · §18.36's claim — named once, so its red case expects exactly what the run says. */
const S18_36 = "§18.36 ⛔ U33r · A PROMISED AGENT REFEREE IS NEVER SENT A TEST — a typed test to a number an applicant gave as a referee is refused through the ONE gate: a viewer who may not read numbers gets typed_refused and its ONE sentence, a reader gets the ONE protected reason and sentence (MINOR-5: collapsed for readers too, as the split collapses it), the audit row ALONE records agent_referee, for both; zero transport calls and zero tokens; and an officer whose OWN number is a referee's is told it is protected, in the own-number words";

/* ══ THE RUN ════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  const failed = [
    ...check(sizeSms, (l) => console.log(l)),
    ...checkEnvelope((body, token) => composeMarketing(body, token), (l) => console.log(l)),
    ...checkFold(foldToGsm7, (l) => console.log(l)),
    ...checkTemplate(REAL_TEMPLATE, (l) => console.log(l)),
    ...checkOneComposer(COMPOSER_SOURCES, (l) => console.log(l)),
    ...checkComposerScreen(SCREEN_SOURCES, (l) => console.log(l)),
    ...checkComposerWords(REAL_WORDS, (l) => console.log(l)),
    ...(await checkSave(REAL_COMPOSE, (l) => console.log(l))),
    ...(await checkTestSend(REAL_COMPOSE, (l) => console.log(l))),
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
    ...checkComposerScreen(SCREEN_SOURCES, quiet), ...checkComposerWords(REAL_WORDS, quiet),
    ...(await checkSave(REAL_COMPOSE, quiet)), ...(await checkTestSend(REAL_COMPOSE, quiet)),
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
      // ⭐ THE OWNER'S RULING (2026-10-09): nothing is appended. A footer back on the message is a message nobody wrote.
      name: "a footer appended again — the stop link, 18+ and the helpline back on every message",
      expect: /^§11 ⭐ the composed text IS the officer's text/,
      compose: (body, token) => { const c = REAL(body, token); return { ...c, text: `${c.text}\n50pick 18+ ${statutorySmsHelpline()} Acha: ${shortDomain()}/s/${token}` }; },
      landed: () => true,
      landedAs: "a composer that appends anything sends a message the officer did not write",
    },
    {
      name: "the stop link printed again — the token appended to the officer's text",
      expect: /^§9 ⭐ no stop link, no 18\+, no helpline and no token/,
      compose: (body, token) => { const c = REAL(body, token); return { ...c, text: `${c.text} ${shortDomain()}/s/${token}` }; },
      landed: () => true,
      landedAs: "the token in the text is the stop link the owner ruled out",
    },
    {
      name: "the size taken of the body's first ten characters, not of the message sent",
      expect: /^§11 ⭐ the size is taken of the WHOLE message, not the body/,
      compose: (body, token) => ({ ...REAL(body, token), size: sizeSms((body ?? "").slice(0, 10)) }),
      landed: () => REAL("50pick: soka leo. Weka dau sasa.", "a1b2c3d4").size.units !== sizeSms("50pick: so").units,
      landedAs: "a message longer than ten characters is priced as ten",
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
      name: "the token checked again — a message refused for the stop link it no longer carries",
      expect: /^§11 ⭐ the token is never printed/,
      compose: (body, token) => {
        const c = REAL(body, token);
        if (token.length === 8) return c;
        const problems = [...c.problems, "The opt-out link is missing or the wrong length."];
        return { ...c, problems, ok: false };
      },
      landed: () => REAL("50pick: habari", "").ok,
      landedAs: "the real composer composes with any token",
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
      name: "the budget quoted in GSM-7 whatever the encoding — 160 for a UCS-2 message",
      expect: /^§13 ⭐ a UCS-2 body over 70 is two messages/,
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
    const published = (support.match(/nationalHelpline:\s*"([^"]+)"/) || [])[1] ?? "";
    const BOARD = "0800110051";
    const planted = (token: string, locale: "SW" | "EN") => marketingFooter(token, locale).replace(statutorySmsHelpline(), BOARD);
    ok("PLANT LANDED · the Board's 0800110051 back in the footer in place of the published helpline",
      planted("a1b2c3d4", "SW").includes(BOARD) && planted("a1b2c3d4", "EN").includes(BOARD) && !planted("a1b2c3d4", "SW").includes(statutorySmsHelpline()),
      JSON.stringify(planted("a1b2c3d4", "SW")));
    const failures: string[] = [];
    checkHelpline(published, BOARD, planted, (label, cond) => { if (!cond) failures.push(label); });
    for (const expect of [/^§12 ⭐ the marketing footer's helpline IS the published one/, /^§12 …and the Gaming Board Code's 0800110051 appears nowhere/]) {
      ok(`  └─ fires: ${expect.source.slice(0, 56)}`, failures.some((f) => expect.test(f)),
        failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.join(" | ")}`);
    }
    const control: string[] = [];
    checkHelpline(published, statutorySmsHelpline(), marketingFooter, (label, cond) => { if (!cond) control.push(label); });
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
    /** At the room with NO source line yet — the counter keeps the longest phrase's there (M5). */
    const atB = fillTo(HEAD, operatorBudget("SW", RESERVE));
    /** At the room with §10's phrase. */
    const atP = fillTo(HEAD, operatorBudget("SW", PHRASE));
    /** At the room with NO phrase priced at all — what a counter that forgot M5 would offer. */
    const atNone = fillTo(HEAD, operatorBudget("SW"));
    /** §15.13's stored body: 3 over in the worst case, though a short name's own message fits. */
    const over13 = tpl({ bodySw: `${atP}aaa`, sourcePhrase: PHRASE });
    /** §15.13's half-broken campaign: a sound Swahili half, an English body 3 over in the worst case. */
    const enOver13 = tpl({ bodyEn: `${fillTo(HEAD_EN, operatorBudget("EN", PHRASE))}aaa`, sourcePhrase: PHRASE });
    const LONG_PHRASE = "x".repeat(SOURCE_PHRASE_MAX_CHARS + 1);
    const book = (name: string | null = null) => ({ variant: "SW" as CampaignVariant, name, token: TT, origin: "book" as RecipientOrigin });
    const acct = (name: string | null) => ({ variant: "SW" as CampaignVariant, name, token: TT, origin: "account" as RecipientOrigin });

    /** P1 · the body sized BEFORE the footer and the phrase are appended (the U4 defect, one layer up). */
    const bodyFirst: typeof counterFor = (body, variant, fallback, phrase) => {
      const s = sizeSms(renderBody(body, worstCaseJina()).trim());
      return { ...counterFor(body, variant, fallback, phrase), units: s.units, segments: s.segments };
    };
    /** P2 · the template sized AS TYPED — `{jina}` counted as its own 8 septets (the phrase, or its reserve, still priced). */
    const asTyped: typeof counterFor = (body, variant, fallback, phrase) => {
      const real = counterFor(body, variant, fallback, phrase);
      const c = composeMarketing(body, footerMeasurementToken(), variant, (phrase ?? "").trim() || RESERVE);
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
    /** M5 · the counter prices NO source phrase — neither the stored one nor, while it is blank, the reserve. */
    const counterNoPhrase: typeof counterFor = (body, variant, fallback, phrase) => {
      const real = counterFor(body, variant, fallback, phrase);
      const c = composeMarketing(renderBody(body, worstCaseJina()), footerMeasurementToken(), variant, "");
      return {
        ...real, units: c.size.units, segments: c.size.segments, budget: c.budget, left: c.budget - real.bodyUnits, sourceUnits: 0,
        problems: c.problems, ok: c.ok && real.fallbackProblems.length === 0,
      };
    };
    /** M5 · the stored phrase priced, but NOTHING reserved while it is blank — the draft that breaks when G5 lands. */
    const counterNoReserve: typeof counterFor = (body, variant, fallback, phrase) =>
      ((phrase ?? "").trim() ? counterFor(body, variant, fallback, phrase) : counterNoPhrase(body, variant, fallback, phrase));
    /** M5 · the renderer drops the stored phrase from a book contact's message — and still calls it sendable. */
    const renderNoPhrase: typeof renderForRecipient = (t, r) => {
      const real = renderForRecipient(t, r);
      const phrase = t.sourcePhrase.trim();
      const text = phrase ? real.text.replace(`${NL15}${phrase} `, NL15) : real.text;
      return { ...real, text, size: sizeSms(text) };
    };
    /** M5 · the phrase put FIRST — `composeMarketing`'s placement before U37a — so the message no longer begins with 50pick. */
    const phraseFirst: typeof renderForRecipient = (t, r) => {
      const real = renderForRecipient(t, r);
      const phrase = r.origin === "account" ? "" : t.sourcePhrase.trim();
      if (!phrase) return real;
      const text = `${phrase} ${real.text.replace(`${NL15}${phrase} `, NL15)}`;
      const problems = text.startsWith(SENDER_IDENTITY) ? real.problems : [...real.problems, "The message must begin with 50pick."];
      return { ...real, text, size: sizeSms(text), problems, ok: problems.length === 0 };
    };
    /** OQ3 · the phrase at the END of the officer's line, before the footer's newline (U37a's first placement) — same size, not in the footer. */
    const phraseOnBodyLine: typeof renderForRecipient = (t, r) => {
      const real = renderForRecipient(t, r);
      const phrase = r.origin === "account" ? "" : t.sourcePhrase.trim();
      if (!phrase) return real;
      const text = real.text.replace(`${NL15}${phrase} `, ` ${phrase}${NL15}`);
      return { ...real, text, size: sizeSms(text) };
    };
    /** M5 · the blank-phrase refusal removed — a book contact is sent no source line while G5 is open. */
    const noSourceRefusal: typeof renderForRecipient = (t, r) => {
      const real = renderForRecipient(t, r);
      const problems = real.problems.filter((p) => !p.includes("no source line"));
      return { ...real, problems, ok: problems.length === 0 };
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
    /** §15.11 · the source line JUDGED again — a braced line refuses the whole template (it is never printed, 2026-10-09). */
    const phraseJudged: typeof validateCampaignTemplate = (f, phrase) => {
      const real = validateCampaignTemplate(f, phrase);
      if (!/[{}]/.test(phrase ?? "")) return real;
      return { ...real, problems: { ...real.problems, sourcePhrase: ["The source line cannot carry a placeholder or a brace."] }, ok: false };
    };
    /** §15.6 · `left` against the room LESS the old 49-septet footer — the officer told they have 49 characters fewer. */
    const leftNoPhrase: typeof counterFor = (body, variant, fallback, phrase) => {
      const c = counterFor(body, variant, fallback, phrase);
      return { ...c, left: c.budget - 49 - c.bodyUnits };
    };
    /** §15.13 · the renderer WITHOUT the template re-check — each recipient's own message checked, nothing else. */
    const noRecheck: typeof renderForRecipient = (t, r) => {
      const english = r.variant === "EN" && t.bodyEn.trim().length > 0;
      const fallback = english ? t.nameFallbackEn : t.nameFallbackSw;
      const jina = r.origin === "account" ? jinaFor(r.name, fallback) : fallback;
      return composeMarketing(renderBody(english ? t.bodyEn : t.bodySw, jina), r.token, english ? "EN" : "SW");
    };
    /**
     * §15.13 · the re-check WITHOUT the worst case — a stored template refused for SIZE alone is let through to every
     * recipient whose own message fits (the stale-template refusal and the over-cap sentences dropped together).
     */
    const noWorstCase: typeof renderForRecipient = (t, r) => {
      const real = renderForRecipient(t, r);
      if (real.ok || real.size.segments > SMS_MAX_SEGMENTS) return real;
      const { sourcePhrase, ...typed } = t;
      const stale = Object.values(validateCampaignTemplate({ name: "Derby week", ...typed }, sourcePhrase).problems).flatMap((l) => l ?? []);
      if (stale.length === 0 || !stale.every((p) => p.includes("messages, and the limit is"))) return real;
      const problems = real.problems.filter((p) => !p.includes("messages, and the limit is") && !p.includes("no longer passes its own check"));
      return { ...real, problems, ok: problems.length === 0 };
    };
    /**
     * §15.13 · the PER-VARIANT verdict restored — only the language a recipient is sent, and the source line, re-checked:
     * the other half is neutralised in memory (an English body dropped for a Swahili recipient; a bare valid Swahili
     * body for an English one), so a broken English body still lets the Swahili messages out — half a campaign sent.
     */
    const perVariant: typeof renderForRecipient = (t, r) => {
      const english = r.variant === "EN" && t.bodyEn.trim().length > 0;
      return renderForRecipient(english ? { ...t, bodySw: SENDER_IDENTITY } : { ...t, bodyEn: "" }, r);
    };
    /** §15.13 · the source line PRINTED again — appended to a book contact's message (the owner ruled it out, 2026-10-09). */
    const phrasePrinted: typeof renderForRecipient = (t, r) => {
      const real = renderForRecipient(t, r);
      return r.origin === "account" || t.sourcePhrase.trim() === "" ? real : { ...real, text: `${real.text}\n${t.sourcePhrase.trim()}` };
    };
    /** §15.14 · the fallback judged UNTRIMMED, as the screen judged it before the audit — "Mteja " refused, Save disabled. */
    const untrimmedFallback: typeof validateCampaignTemplate = (f, phrase) => {
      const real = validateCampaignTemplate(f, phrase);
      const fb = f.nameFallbackSw ?? "";
      if (scanPlaceholders(f.bodySw ?? "").jina === 0 || fb === fb.trim() || fb.trim() === "") return real;
      const problems = { ...real.problems, nameFallbackSw: [`The word for ${JINA} must be letters, at most ${JINA_MAX_CHARS} characters.`] };
      return { ...real, problems, ok: false };
    };
    /** §15.15 · the Unicode sentence naming a footer again — "before the required footer", which nothing appends any more. */
    const rawEnvelope: typeof counterFor = (body, variant, fallback, phrase) => {
      const real = counterFor(body, variant, fallback, phrase);
      if (real.encoding !== "UCS2") return real;
      return { ...real, problems: real.problems.map((p) => p.replace(" characters — replace:", " characters before the required footer — replace:")) };
    };
    /** §15.16 · the name only trimmed — a name of zero-width spaces is a name, and the invisible characters count. */
    const nameTrimmedOnly: typeof validateCampaignTemplate = (f, phrase) => {
      const real = validateCampaignTemplate(f, phrase);
      const name = (f.name ?? "").trim();
      const n = [...name].length;
      const { name: _cleaned, ...rest } = real.problems;
      const problems = n === 0 ? { ...rest, name: ["Give the campaign a name."] }
        : n > CAMPAIGN_NAME_MAX_CHARS ? { ...rest, name: [`The name is ${n} characters.`] } : rest;
      return { ...real, problems, ok: Object.keys(problems).length === 0 };
    };
    type Verdict17 = ReturnType<typeof validateCampaignTemplate>;
    const PHONE_SAID17 = "A campaign name can't hold a phone number";
    /** The verdict with its phone-in-the-name sentence taken out — what two of the plants below do to it. */
    const phoneUnsaid = (real: Verdict17): Verdict17 => {
      const kept = (real.problems.name ?? []).filter((p) => !p.startsWith(PHONE_SAID17));
      const { name: _said, ...rest } = real.problems;
      const problems = kept.length > 0 ? { ...rest, name: kept } : rest;
      return { ...real, problems, ok: Object.keys(problems).length === 0 };
    };
    /** §15.17 · the test the first build used — any run of nine digits (`scrubPhoneRuns`) — so a date and a time read as a phone. */
    const scrubbedName: typeof validateCampaignTemplate = (f, phrase) => {
      const real = validateCampaignTemplate(f, phrase);
      const name = (f.name ?? "").trim();
      if (name === "" || AUDIENCE.scrubPhoneRuns(name) === name || (real.problems.name ?? []).some((p) => p.startsWith(PHONE_SAID17))) return real;
      const problems = { ...real.problems, name: [...(real.problems.name ?? []), `${PHONE_SAID17}.`] };
      return { ...real, problems, ok: false };
    };
    /** §15.17 · no phone test on the name at all — the label keeps a stranger's number for good. */
    const phoneUnchecked: typeof validateCampaignTemplate = (f, phrase) => phoneUnsaid(validateCampaignTemplate(f, phrase));
    /** §15.18 · only each WHOLE run asked — a number after another figure ("Week 40 0712 345 678") reads as one long figure. */
    const RUN_JOINERS18 = ` .()[]+_-${cc(0x2013)}`;
    const wholeRunHolds = (name: string): boolean => {
      const runs: string[] = [];
      let digits = "";
      for (const ch of name.normalize("NFKC")) {
        if (ch >= "0" && ch <= "9") digits += ch;
        else if (digits !== "" && RUN_JOINERS18.includes(ch)) continue;
        else {
          if (digits !== "") runs.push(digits);
          digits = "";
        }
      }
      if (digits !== "") runs.push(digits);
      return runs.some((r) => parseTzNumber(r).verdict === "ok");
    };
    const wholeRunOnly: typeof validateCampaignTemplate = (f, phrase) => {
      const real = validateCampaignTemplate(f, phrase);
      return wholeRunHolds(f.name ?? "") ? real : phoneUnsaid(real);
    };

    const R = REAL_TEMPLATE;
    type TemplatePlant = { name: string; expect: RegExp[]; impl: TemplateImpl; landed: () => boolean; landedAs: string };
    const templatePlants: TemplatePlant[] = [
      {
        name: "P1 · the counter sizes the body BEFORE the footer is appended",
        expect: [/^§15\.6 ⭐/],
        impl: { ...R, counterFor: bodyFirst },
        landed: () => counterFor(atP, "SW", FB, PHRASE).units - bodyFirst(atP, "SW", FB, PHRASE).units === 49 + unitsIn(`${PHRASE} `, "GSM7"),
        landedAs: "the at-budget body alone is short of the message as sent by the footer's 49 septets and the phrase's",
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
        name: "M5 · the counter prices no source phrase — neither the stored one nor the reserve",
        expect: [/^§15\.9 ⭐ M5 · the counter PRICES/, /^§15\.9 ⭐ M5 · PRICED IN/],
        impl: { ...R, counterFor: counterNoPhrase },
        landed: () => !counterFor(atNone, "SW", FB, PHRASE).ok && counterNoPhrase(atNone, "SW", FB, PHRASE).ok,
        landedAs: "a body at the no-phrase room is over the cap with the phrase and passes without it",
      },
      {
        name: "M5 · nothing reserved while the phrase is blank — the draft that breaks when G5 supplies the wording",
        expect: [/^§15\.9 ⭐ M5 · PRICED IN/],
        impl: { ...R, counterFor: counterNoReserve },
        landed: () => counterFor(atNone, "SW", FB, "").segments === 2 && counterNoReserve(atNone, "SW", FB, "").ok,
        landedAs: "a body at the no-phrase room passes on a blank phrase, and is two messages once any wording is priced",
      },
      {
        name: "M5 · the renderer drops the source phrase for a book contact",
        expect: [/^§15\.9 ⭐ a book/],
        impl: { ...R, renderForRecipient: renderNoPhrase },
        landed: () => {
          const r = renderNoPhrase(tpl({ sourcePhrase: PHRASE }), book());
          return r.ok && !r.text.includes(PHRASE);
        },
        landedAs: "a book contact's message goes out with no source, and is still called sendable",
      },
      {
        name: "M5 · the source phrase placed BEFORE the body (composeMarketing before U37a)",
        expect: [/^§15\.9 ⭐ a book/],
        impl: { ...R, renderForRecipient: phraseFirst },
        landed: () => phraseFirst(tpl({ sourcePhrase: PHRASE }), book()).text.startsWith(PHRASE),
        landedAs: "the message begins with the phrase, not with 50pick",
      },
      {
        name: "OQ3 · the source phrase on the officer's line, before the footer's newline (U37a's first placement)",
        expect: [/^§15\.9 ⭐ a book/],
        impl: { ...R, renderForRecipient: phraseOnBodyLine },
        landed: () => phraseOnBodyLine(tpl({ sourcePhrase: PHRASE }), book()).text.includes(` ${PHRASE}${NL15}`),
        landedAs: "the phrase ends the officer's line instead of beginning the footer's — the same size, not the safe default",
      },
      {
        name: "M5 · the blank-phrase refusal removed — a book contact sent no source line while G5 is open",
        expect: [/^§15\.9 ⛔ M5 · NO SOURCE LINE/],
        impl: { ...R, renderForRecipient: noSourceRefusal },
        landed: () => has(renderForRecipient(tpl(), book()).problems, "no source line") && noSourceRefusal(tpl(), book()).ok,
        landedAs: "the real renderer refuses a book contact on a blank phrase; the plant sends it",
      },
      {
        name: "the recycled number · a book contact greeted by a stored name",
        expect: [/^§15\.10 ⛔/],
        impl: { ...R, renderForRecipient: bookName },
        landed: () => bookName(tpl({ sourcePhrase: PHRASE }), book("Asha")).text.includes("Asha"),
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
        expect: [/^§15\.11 ⭐ the source line no longer judges/],
        impl: { ...R, validate: phraseJudged },
        landed: () => validateCampaignTemplate(draft(), "Source {jina}").ok && !phraseJudged(draft(), "Source {jina}").ok,
        landedAs: "a braced source line refuses the template again",
      },

      {
        name: "the campaign's name unchecked",
        expect: [/^§15\.12/],
        impl: { ...R, validate: nameUnchecked },
        landed: () => !validateCampaignTemplate(draft({ name: "" }), "").ok && nameUnchecked(draft({ name: "" }), "").ok,
        landedAs: "a nameless campaign is accepted",
      },
      {
        name: "§15.6 · left computed against the room LESS the old 49-septet footer",
        expect: [/^§15\.6 left/],
        impl: { ...R, counterFor: leftNoPhrase },
        landed: () => counterFor(atP, "SW", FB, PHRASE).left - leftNoPhrase(atP, "SW", FB, PHRASE).left === 49,
        landedAs: "the officer is told they have 49 characters fewer than they do",
      },
      {
        name: "§15.13 · the renderer drops the template re-check — each recipient's own message checked, nothing else",
        expect: [/^§15\.13 ⭐ THE RENDERER/, /^§15\.13 ⛔ a stored body/],
        impl: { ...R, renderForRecipient: noRecheck },
        landed: () => !renderForRecipient(over13, acct("Ali")).ok && noRecheck(over13, acct("Ali")).ok,
        landedAs: "a stored body 3 over in the worst case is sent to a short name",
      },
      {
        name: "§15.13 · the re-check without the worst case — a template refused for size alone let through wherever the recipient's own message fits",
        expect: [/^§15\.13 ⛔ a stored body/],
        impl: { ...R, renderForRecipient: noWorstCase },
        landed: () => !renderForRecipient(over13, acct("Ali")).ok && noWorstCase(over13, acct("Ali")).ok,
        landedAs: "the partial send: short names and book contacts on a short fallback get it, long names are refused",
      },
      {
        name: "§15.13 · the PER-VARIANT verdict restored — a bad English body still lets the Swahili messages out (half a campaign sent)",
        expect: [/^§15\.13 ⭐/, /^§15\.13 ⛔ ONE CAMPAIGN/],
        impl: { ...R, renderForRecipient: perVariant },
        landed: () => !renderForRecipient(enOver13, acct("Ali")).ok && perVariant(enOver13, acct("Ali")).ok,
        landedAs: "a Swahili recipient of a campaign whose English body is over the cap is sent the Swahili message",
      },
      {
        name: "§15.13 · the source line printed again for a book contact",
        expect: [/^§15\.13 ⭐ the source line no longer refuses/],
        impl: { ...R, renderForRecipient: phrasePrinted },
        landed: () => phrasePrinted(tpl({ sourcePhrase: PHRASE }), { ...acct(null), origin: "book" as RecipientOrigin }).text.includes(PHRASE)
          && !renderForRecipient(tpl({ sourcePhrase: PHRASE }), { ...acct(null), origin: "book" as RecipientOrigin }).text.includes(PHRASE),
        landedAs: "a book contact's message carries the stored source line",
      },
      {
        name: "control · a counter that says one message and ok for everything",
        expect: [/^§15\.1 ⛔/],
        impl: { ...R, counterFor: (b, v, f, p) => ({ ...counterFor(b, v, f, p), segments: 1, ok: true, problems: [] }) },
        landed: () => true,
        landedAs: "an always-ok counter needs no proof of landing",
      },
      {
        name: "§15.14 · the fallback judged untrimmed — a phone keyboard's trailing space disables Save",
        expect: [/^§15[.]14 ⭐/],
        impl: { ...R, validate: untrimmedFallback },
        landed: () => validateCampaignTemplate(draft({ nameFallbackSw: "Mteja " }), "").ok && !untrimmedFallback(draft({ nameFallbackSw: "Mteja " }), "").ok,
        landedAs: "'Mteja ' passes the real verdict and is refused by the plant",
      },
      {
        name: "§15.15 · the Unicode sentence names the required footer again",
        expect: [/^§15[.]15 ⭐/],
        impl: { ...R, counterFor: rawEnvelope },
        landed: () => rawEnvelope(UNI15, "SW", FB, "").problems.some((p) => p.includes("footer")) && !counterFor(UNI15, "SW", FB, "").problems.some((p) => p.includes("footer")),
        landedAs: "the plant's sentence names a footer; the real counter's names none",
      },
      {
        name: "§15.16 · the name only trimmed — zero-width spaces make a name",
        expect: [/^§15[.]16 ⭐/],
        impl: { ...R, validate: nameTrimmedOnly },
        landed: () => !validateCampaignTemplate(draft({ name: ZWSP15 }), "").ok && nameTrimmedOnly(draft({ name: ZWSP15 }), "").ok,
        landedAs: "a name of one zero-width space is blank for the real verdict and a name for the plant",
      },
      {
        name: "§15.17 · any run of nine digits refused as a phone — 'Derby 2026-10-03 18:00' cannot be saved",
        expect: [/^§15[.]17 ⭐/],
        impl: { ...R, validate: scrubbedName },
        landed: () => validateCampaignTemplate(draft({ name: "Derby 2026-10-03 18:00" }), "").ok && !scrubbedName(draft({ name: "Derby 2026-10-03 18:00" }), "").ok,
        landedAs: "the dated name passes the real verdict and is refused by the plant",
      },
      {
        name: "§15.17 · no phone test on the name — 'Juma 0712 345 678' kept for good",
        expect: [/^§15[.]17 ⭐/, /^§15[.]18 ⭐/],
        impl: { ...R, validate: phoneUnchecked },
        landed: () => !validateCampaignTemplate(draft({ name: "Juma 0712 345 678" }), "").ok && phoneUnchecked(draft({ name: "Juma 0712 345 678" }), "").ok,
        landedAs: "the name holding a number is refused by the real verdict and passed by the plant",
      },
      {
        name: "§15.18 · only each whole run asked — a number written after another figure slips through",
        expect: [/^§15[.]18 ⭐/],
        impl: { ...R, validate: wholeRunOnly },
        landed: () => !validateCampaignTemplate(draft({ name: "Week 40 0712 345 678" }), "").ok && wholeRunOnly(draft({ name: "Week 40 0712 345 678" }), "").ok,
        landedAs: "'Week 40 0712 345 678' is refused by the real verdict and passed by the plant",
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

  /* ── §16.2–§16.5 · §17.6's plants: the composer's own files, one source string swapped in memory (U37b) ──── */
  {
    const S = SCREEN_SOURCES;
    const CLIENT = `${SCREEN_DIR}composer-client.tsx`;
    const ACTIONS = `${SCREEN_DIR}actions.ts`;
    const COPY = `${SCREEN_DIR}composer-copy.ts`;
    const SIG = "sendCampaignTestAction(campaignId: string, variant: CampaignVariant, recipient?: unknown)";
    const withFile = (rel: string, edit: (text: string) => string): ScreenSources =>
      ({ ...S, files: new Map([...S.files].map(([k, v]) => [k, k === rel ? edit(v) : v])) });
    const sizingClient = withFile(CLIENT, (t) => `import { sizeSms } from "@/lib/sms-compose";${NL15}${t}${NL15}export const ownCount = (b: string) => sizeSms(b).segments;`);
    const senderClient = withFile(CLIENT, (t) => `${t}${NL15}export const SenderField = () => <Input name="senderId" aria-label="Sender ID" />;`);
    const telClient = withFile(CLIENT, (t) => `${t}${NL15}export const ToField = () => <Input type="tel" name="to" />;`);
    const typedActions = withFile(ACTIONS, (t) => t.replace(SIG, "sendCampaignTestAction(campaignId: string, variant: CampaignVariant, to: string)"));
    /** U37c · a typed recipient's union widened to a bare string — a number with no confirmation in the contract. */
    const looseRecipient = { ...S, testService: S.testService.replace('| { kind: "typed"; number: string; adultAttested: boolean; attestedVersion: number | null };', '| { kind: "typed"; number: string; adultAttested: boolean; attestedVersion: number | null } | string;') };
    const moneyCopy = withFile(COPY, (t) => `${t}${NL15}export const COMPOSE_TEST_COST = "Each test costs TZS 6.";`);
    const secondDoor: ScreenSources = { ...S, draftService: `${S.draftService}${NL15}export const later = (id: string, p: object, base: string) => db.smsCampaign.updateDraft(id, p, base);` };
    const COUNTER_REL = `${SCREEN_DIR}composer-counter.tsx`;
    /** ⛔ Every anchor below resolves EXACTLY ONCE in the real source — each plant's `landed` proves it before it is read. */
    const once = (rel: string, anchor: string) => occurrences(S.files.get(rel) ?? "", anchor) === 1;
    const swapOnce = (rel: string, anchor: string, planted: string) => withFile(rel, (t) => t.replace(anchor, planted));
    /** U37c-2 · A.2 · a second PhoneInput, outside the Test card. */
    const secondPhone = withFile(CLIENT, (t) => `${t}${NL15}export const AnotherNumber = () => <PhoneInput value="" data-test-recipient="typed" />;`);
    /** U37c-2 · A.2 · the typed number written to the address — router.replace carrying a `to` query, inside the card. */
    const TICK_STATE = "const [tickedFor, setTickedFor] = useState<string | null>(null);";
    const numberInAddress = swapOnce(CLIENT, TICK_STATE, `${TICK_STATE}${NL15}  const router = useRouter();${NL15}  const keep = () => router.replace(\`?to=\${digits}\`);`);
    /** U37c-2 · the officer's own consent link offered for a typed refusal too. */
    const OWN_ONLY = 'state.target === "own" && CONSENT_REASONS.includes(state.reason)';
    const linkAnyTarget = swapOnce(CLIENT, OWN_ONLY, "CONSENT_REASONS.includes(state.reason)");
    /** U37c-2 · the number's problem said twice — the line beside Send prints the plan's sentence again. */
    const BACK_LABEL = "{COMPOSE_TEST_FIX_NUMBER}";
    const saidTwice = swapOnce(CLIENT, BACK_LABEL, "{reason}");
    /** U37c-2 · the screen's copy of a refusal re-targeted — a typed refusal drawn as the officer's own. */
    const COPIED = "reason: r.reason, error: r.error, target: r.target";
    const targetForced = swapOnce(CLIENT, COPIED, 'reason: r.reason, error: r.error, target: "own" as TestTarget');
    /** U37c-2 · a second consent link, outside the target guard. */
    const ERROR_LINE = '<span className="block" data-test-outcome="error">{state.error}</span>';
    const unguardedLink = swapOnce(CLIENT, ERROR_LINE, `${ERROR_LINE}<a href="/profile/notifications" data-test-consent-link>{COMPOSE_TEST_CONSENT_LINK}</a>`);
    /** U37c-2 · the tick outlives its number — the key forgets the digits. */
    const TICK_KEY_SRC = 'const tickKey = `${saved?.id ?? ""}|${typedView.attestation?.version ?? ""}|${digits}`;';
    const tickForgetsNumber = swapOnce(CLIENT, TICK_KEY_SRC, 'const tickKey = `${saved?.id ?? ""}|${typedView.attestation?.version ?? ""}`;');
    /** U37c-2 · editing the number keeps the tick (it would come back with the old digits). */
    const EDIT_CLEARS = "onChange={(e) => { setDigits(e.target.value); setTickedFor(null); }}";
    const editKeepsTick = swapOnce(CLIENT, EDIT_CLEARS, "onChange={(e) => setDigits(e.target.value)}");
    /** U37c-2 · "updating" said for ever for a typed test the server refuses up front. */
    const TYPED_OFF = ": typedOff\n          ? typedWhy";
    const updatingForever = swapOnce(CLIENT, TYPED_OFF, ": false\n          ? typedWhy");
    /** U37c-2 · "Another number" disabled with no reason beside it. */
    const WHY_BESIDE = "why={typedView.allowed ? null : typedWhy}";
    const silentChoice = swapOnce(CLIENT, WHY_BESIDE, "why={typedView.allowed ? null : typedView.why}");
    /** U37c-2 · the choice switchable while a test is in flight. */
    const STILL = "disabled={!typedView.allowed || c.testing !== null}";
    const restless = swapOnce(CLIENT, STILL, "disabled={!typedView.allowed}");
    /** U37c-2 · a rewording refused, and the page left showing the old words. */
    const STALE_LIST = '["attestation_stale", "typed_outreach_closed", "typed_no_attestation_wording", "typed_needs_source_line", "typed_role"]';
    const noReread = swapOnce(CLIENT, STALE_LIST, '["typed_outreach_closed", "typed_no_attestation_wording", "typed_needs_source_line", "typed_role"]');
    /** U37c-2 · Send no longer spends the tick. */
    const SPEND = "    const r = recipient();\n    setTickedFor(null);\n    c.sendTest(v, r);";
    const tickNeverSpent = swapOnce(CLIENT, SPEND, "    const r = recipient();\n    c.sendTest(v, r);");
    /** U37c-2 · the post stops naming the words the tick was given for. */
    const POSTED = "adultAttested: ticked, attestedVersion: typedView.attestation?.version ?? null";
    const versionDropped = swapOnce(CLIENT, POSTED, "adultAttested: ticked, attestedVersion: null");
    /** U37c-2 · the typed number logged from the provider's send. */
    const SEND_OPEN = "    setTesting(variant);\n    setTest({ kind: \"idle\" });";
    const numberLogged = swapOnce(CLIENT, SEND_OPEN, `${SEND_OPEN}\n    console.info("test to", recipient);`);
    const SAVE_ROLE = `"marketing.campaign.save", COMPOSE_ROLE_REFUSAL);${NL15}  if (!g.ok) return { ok: false, reason: "role", error: g.error };`;
    const NAME_ONCHANGE = 'onChange={(e) => c.setField("name", e.target.value)}';
    const ASK_FIRST = "onClick={() => c.askDiscard(true)}";
    const CHANGED_OPENER = '(c.refusal.kind === "stale" || c.refusal.kind === "not_draft") && (';
    const KEEP_TEXT = "onClick={c.saveAsNew} disabled={!c.canSaveAsNew} title={c.saveAsNewBlocked ?? undefined} data-compose-save-new={c.refusal.kind}";
    const CARRY_POST = "audience: asNew ? view.audience.carry : view.audience.params";
    const SAVED_CALL = "composeSaved(c.saved.savedAt, canTest)";
    const FLAGGED_STOP = "tabIndex={flagged ? -1 : undefined}";
    const reasonAsText = withFile(CLIENT, (t) => t.split("onClick={c.goToBlocked}").join(""));
    const cutName = swapOnce(CLIENT, NAME_ONCHANGE, `${NAME_ONCHANGE} maxLength={80}`);
    const blindReload = swapOnce(CLIENT, ASK_FIRST, "onClick={c.reload}");
    const blindNotDraft = swapOnce(CLIENT, CHANGED_OPENER,
      `c.refusal.kind === "not_draft" && (<Button type="button" onClick={c.reload}>{COMPOSE_RELOAD}</Button>)}${NL15}{c.refusal.kind === "stale" && (`);
    const noKeepText = swapOnce(CLIENT, KEEP_TEXT, "onClick={c.save} disabled={!c.canSave} data-compose-save-new={c.refusal.kind}");
    const literalCap = swapOnce(COUNTER_REL, "counter.segments > SMS_MAX_SEGMENTS", "counter.segments > 1");
    const bareRole = swapOnce(ACTIONS, SAVE_ROLE, `"marketing.campaign.save", COMPOSE_ROLE_REFUSAL);${NL15}  if (!g.ok) return g;`);
    const carryDropped = swapOnce(CLIENT, CARRY_POST, "audience: view.audience.params");
    const alwaysInvite = swapOnce(CLIENT, SAVED_CALL, "composeSaved(c.saved.savedAt, true)");
    const alwaysFocusable = swapOnce(CLIENT, FLAGGED_STOP, "tabIndex={-1}");
    /** 2026-10-09 · the card's own idea of who may type a number, over the server's (`typedOffered`). */
    const OFFERED_FROM_SERVER = "const offered = t.typedOffered;";
    const offeredToAll = swapOnce(CLIENT, OFFERED_FROM_SERVER, "const offered = true;");
    /** 2026-10-09 · the radio cards rendered for every viewer — the offered guard dropped. */
    const OFFERED_GUARD = "{offered ? (";
    const unguardedChoice = swapOnce(CLIENT, OFFERED_GUARD, "{true ? (");
    /** 2026-10-09 · the typed target outlives the choice — a stale pick posts a typed test for a viewer not offered one. */
    const TARGET_FOLLOWS = 'const typed = offered && target === "typed";';
    const staleTypedTarget = swapOnce(CLIENT, TARGET_FOLLOWS, 'const typed = target === "typed";');
    /** 2026-10-09 · typed_role taken out of the page-stale reasons — the refusal leaves the page as it was read. */
    const ROLE_REREAD = ', "typed_role"]';
    const roleNoReread = swapOnce(CLIENT, ROLE_REREAD, "]");
    /** 2026-10-09 · one sentence in two tones — the own-only card says the unusable number in the refusal red. */
    const OWN_WHY_TONE = '<p className="text-body-sm text-text-secondary" data-test-choice-why="own">';
    const twoTones = swapOnce(CLIENT, OWN_WHY_TONE, '<p className="text-body-sm text-danger-fg" data-test-choice-why="own">');
    type ScreenPlant = { name: string; expect: RegExp; sources: ScreenSources; landed: () => boolean; landedAs: string };
    const screenPlants: ScreenPlant[] = [
      {
        name: "P9 · the composer sizes on its own — the client imports sizeSms and calls it on the body",
        expect: /^§16\.2 ⛔/, sources: sizingClient,
        landed: () => (sizingClient.files.get(CLIENT) ?? "").includes("sizeSms(b)"),
        landedAs: "sizeSms is imported into the client and called",
      },
      {
        name: "OD45 · a sender field on the composer",
        expect: /^§16\.3 ⛔/, sources: senderClient,
        landed: () => (senderClient.files.get(CLIENT) ?? "").includes('name="senderId"'),
        landedAs: "an Input named senderId is rendered",
      },
      {
        name: "a SECOND, raw number field on the composer (an Input type tel beside the kit PhoneInput)",
        expect: /^§16\.4 ⛔/, sources: telClient,
        landed: () => (telClient.files.get(CLIENT) ?? "").includes('type="tel"'),
        landedAs: "a tel Input named to is rendered",
      },
      {
        name: "U37c-2 · a second PhoneInput outside the Test card",
        expect: /^§16\.4 ⛔/, sources: secondPhone,
        landed: () => (secondPhone.files.get(CLIENT) ?? "").includes("export const AnotherNumber"),
        landedAs: "a second kit PhoneInput is rendered outside ComposerTest",
      },
      {
        name: "U37c-2 · the typed number written to the address",
        expect: /^§16\.4 ⛔/, sources: numberInAddress,
        landed: () => once(CLIENT, TICK_STATE) && (numberInAddress.files.get(CLIENT) ?? "").includes("router.replace(`?to="),
        landedAs: "the Test card replaces the address with ?to=<digits>",
      },
      {
        name: "U37c-2 · the officer's own consent link offered for a typed refusal",
        expect: /^§16\.17 ⛔/, sources: linkAnyTarget,
        landed: () => once(CLIENT, OWN_ONLY) && !(linkAnyTarget.files.get(CLIENT) ?? "").includes(OWN_ONLY),
        landedAs: "the consent link's target guard is gone",
      },
      {
        name: "U37c-2 · a typed refusal re-targeted as the officer's own on the screen",
        expect: /^§16\.17 ⛔/, sources: targetForced,
        landed: () => once(CLIENT, COPIED) && (targetForced.files.get(CLIENT) ?? "").includes('target: "own" as TestTarget'),
        landedAs: "testStateOf copies every refusal as target own",
      },
      {
        name: "U37c-2 · a second consent link, outside the target guard",
        expect: /^§16\.17 ⛔/, sources: unguardedLink,
        landed: () => once(CLIENT, ERROR_LINE) && occurrences(unguardedLink.files.get(CLIENT) ?? "", "data-test-consent-link") === 2,
        landedAs: "an unguarded consent link renders after the error outcome",
      },
      {
        name: "U37c-2 · the 18+ tick outlives the number it was given for",
        expect: /^§16\.19 ⛔/, sources: tickForgetsNumber,
        landed: () => once(CLIENT, TICK_KEY_SRC) && !(tickForgetsNumber.files.get(CLIENT) ?? "").includes(TICK_KEY_SRC),
        landedAs: "the tick's key drops the digits",
      },
      {
        name: "U37c-2 · editing the number keeps the 18+ tick",
        expect: /^§16\.19 ⛔/, sources: editKeepsTick,
        landed: () => once(CLIENT, EDIT_CLEARS) && !(editKeepsTick.files.get(CLIENT) ?? "").includes(EDIT_CLEARS),
        landedAs: "the number field no longer clears the tick",
      },
      {
        name: "U37c-2 · Send does not spend the 18+ tick",
        expect: /^§16\.19 ⛔/, sources: tickNeverSpent,
        landed: () => once(CLIENT, SPEND) && !(tickNeverSpent.files.get(CLIENT) ?? "").includes(SPEND),
        landedAs: "the send keeps the tick for the next test",
      },
      {
        name: "U37c-2 · the post stops naming the 18+ words' version",
        expect: /^§16\.19 ⛔/, sources: versionDropped,
        landed: () => once(CLIENT, POSTED) && (versionDropped.files.get(CLIENT) ?? "").includes("attestedVersion: null"),
        landedAs: "the typed recipient posts attestedVersion null",
      },
      {
        name: "U37c-2 · the typed number logged from the provider's send",
        expect: /^§16\.4 ⛔/, sources: numberLogged,
        landed: () => once(CLIENT, SEND_OPEN) && (numberLogged.files.get(CLIENT) ?? "").includes('console.info("test to", recipient)'),
        landedAs: "sendTest logs the recipient to the console",
      },
      {
        name: "U37c-2 · \"updating\" for ever for a typed test refused up front",
        expect: /^§16\.20 ⭐/, sources: updatingForever,
        landed: () => once(CLIENT, TYPED_OFF) && !(updatingForever.files.get(CLIENT) ?? "").includes(TYPED_OFF),
        landedAs: "the typed-off reason never comes before \"updating\"",
      },
      {
        name: "U37c-2 · \"Another number\" disabled with no reason beside it",
        expect: /^§16\.20 ⭐/, sources: silentChoice,
        landed: () => once(CLIENT, WHY_BESIDE) && !(silentChoice.files.get(CLIENT) ?? "").includes(WHY_BESIDE),
        landedAs: "the choice shows the loader's why alone — null for a new composer",
      },
      {
        name: "U37c-2 · the choice switchable while a test is in flight",
        expect: /^§16\.20 ⭐/, sources: restless,
        landed: () => once(CLIENT, STILL) && !(restless.files.get(CLIENT) ?? "").includes(STILL),
        landedAs: "\"Another number\" stays enabled during a send",
      },
      {
        name: "U37c-2 · a rewording refused, and the page not re-read",
        expect: /^§16\.20 ⭐/, sources: noReread,
        landed: () => once(CLIENT, STALE_LIST) && !(noReread.files.get(CLIENT) ?? "").includes(STALE_LIST),
        landedAs: "attestation_stale is no longer a page-stale reason",
      },
      {
        name: "U37c-2 · the number's problem said twice — under the field and again beside Send",
        expect: /^§16\.18 ⭐/, sources: saidTwice,
        landed: () => once(CLIENT, BACK_LABEL) && !(saidTwice.files.get(CLIENT) ?? "").includes(BACK_LABEL),
        landedAs: "the button beside Send prints {reason} — the plan's sentence — instead of the way back",
      },
      {
        name: "P10′ · the test action takes a bare number — sendCampaignTestAction(campaignId, variant, to: string)",
        expect: /^§16\.4 ⛔/, sources: typedActions,
        landed: () => (S.files.get(ACTIONS) ?? "").includes(SIG) && (typedActions.files.get(ACTIONS) ?? "").includes("variant: CampaignVariant, to: string)"),
        landedAs: "the action's third parameter becomes a bare number, outside the recipient contract",
      },
      {
        name: "U37c · the recipient union widened to a bare string",
        expect: /^§16\.4 ⛔/, sources: looseRecipient,
        landed: () => looseRecipient.testService !== S.testService,
        landedAs: "TestRecipient gains `| string` in memory",
      },
      {
        name: "OD24 · a price on the composer",
        expect: /^§16\.5 ⛔/, sources: moneyCopy,
        landed: () => (moneyCopy.files.get(COPY) ?? "").includes("TZS 6"),
        landedAs: "the copy names TZS",
      },
      {
        name: "X12 · a second update method beside the compare-and-set",
        expect: /^§17\.6/, sources: secondDoor,
        landed: () => secondDoor.draftService.includes("updateDraft("),
        landedAs: "the save gains an updateDraft call with a base stamp",
      },
      {
        name: "§16.7 · the Save reason as plain text again — nothing takes the officer to the field",
        expect: /^§16[.]7 ⭐/, sources: reasonAsText,
        landed: () => (S.files.get(CLIENT) ?? "").includes("onClick={c.goToBlocked}") && !(reasonAsText.files.get(CLIENT) ?? "").includes("onClick={c.goToBlocked}"),
        landedAs: "the reason button loses its handler",
      },
      {
        name: "§16.7 · the campaign name cut silently by maxLength again",
        expect: /^§16[.]7 ⭐/, sources: cutName,
        landed: () => once(CLIENT, NAME_ONCHANGE) && (cutName.files.get(CLIENT) ?? "").includes(`${NAME_ONCHANGE} maxLength={80}`),
        landedAs: "the name Input (its one onChange) gains maxLength",
      },
      {
        name: "§16.8 · a stale save and a confirmed draft reload straight over the officer's text — no confirmation",
        expect: /^§16[.]8 ⭐/, sources: blindReload,
        landed: () => once(CLIENT, ASK_FIRST) && (blindReload.files.get(CLIENT) ?? "").includes("onClick={c.reload}"),
        landedAs: "the Reload of both refusals calls reload directly",
      },
      {
        name: "§16.8 · a draft confirmed since reloads blind again — the first build's not_draft branch",
        expect: /^§16[.]8 ⭐/, sources: blindNotDraft,
        landed: () => once(CLIENT, CHANGED_OPENER)
          && (blindNotDraft.files.get(CLIENT) ?? "").includes('c.refusal.kind === "not_draft" && (<Button type="button" onClick={c.reload}>'),
        landedAs: "not_draft gets its own Reload that replaces the text with no confirmation",
      },
      {
        name: "§16.8 · a stale or confirmed draft can no longer keep the officer's text as a new draft",
        expect: /^§16[.]8 ⭐/, sources: noKeepText,
        landed: () => once(CLIENT, KEEP_TEXT) && !(noKeepText.files.get(CLIENT) ?? "").includes(KEEP_TEXT),
        landedAs: "the refusal's second button saves the same draft again (refused again) instead of a new one",
      },
      {
        name: "§16.9 · the counter row's literal cap of 1 back",
        expect: /^§16[.]9 /, sources: literalCap,
        landed: () => once(COUNTER_REL, "counter.segments > SMS_MAX_SEGMENTS") && (literalCap.files.get(COUNTER_REL) ?? "").includes("counter.segments > 1"),
        landedAs: "the counter compares segments with a literal 1",
      },
      {
        name: "§16.10 · the save's role refusal returned bare — the screen prefixes 'Try again' to a retry that cannot win",
        expect: /^§16[.]10 ⭐/, sources: bareRole,
        landed: () => once(ACTIONS, SAVE_ROLE) && (bareRole.files.get(ACTIONS) ?? "").includes("if (!g.ok) return g;"),
        landedAs: "the save action's role refusal loses its reason",
      },
      {
        name: "§16.14 · 'Save as a new draft' posts the address alone — a draft with a stored filter becomes the whole book",
        expect: /^§16[.]14 ⛔/, sources: carryDropped,
        landed: () => once(CLIENT, CARRY_POST) && !(carryDropped.files.get(CLIENT) ?? "").includes(CARRY_POST),
        landedAs: "the new draft posts view.audience.params, null without an address filter",
      },
      {
        name: "§16.15 · the saved line invites a test whatever the page can send",
        expect: /^§16[.]15 /, sources: alwaysInvite,
        landed: () => once(CLIENT, SAVED_CALL) && (alwaysInvite.files.get(CLIENT) ?? "").includes("composeSaved(c.saved.savedAt, true)"),
        landedAs: "the saved line is always told the test can go",
      },
      {
        name: "§16.16 · the Audience card a tab stop always — any click inside draws its ring",
        expect: /^§16[.]16 /, sources: alwaysFocusable,
        landed: () => once(CLIENT, FLAGGED_STOP) && (alwaysFocusable.files.get(CLIENT) ?? "").includes("tabIndex={-1}"),
        landedAs: "the card carries tabIndex -1 with nothing wrong",
      },
      /* ── 2026-10-09 · the owner's ruling on the card: "Another number" only where the door would take it ── */
      {
        name: "2026-10-09 · the card offers \"Another number\" to every viewer — the server's answer ignored",
        expect: /^§16[.]21 ⛔/, sources: offeredToAll,
        landed: () => once(CLIENT, OFFERED_FROM_SERVER) && (offeredToAll.files.get(CLIENT) ?? "").includes("const offered = true;"),
        landedAs: "the card decides it may offer the choice whatever typedOffered says",
      },
      {
        name: "2026-10-09 · the choice rendered whether or not it is offered — the guard around the radio cards dropped",
        expect: /^§16[.]21 ⛔/, sources: unguardedChoice,
        landed: () => once(CLIENT, OFFERED_GUARD) && !(unguardedChoice.files.get(CLIENT) ?? "").includes(OFFERED_GUARD),
        landedAs: "the fieldset with both radio cards renders for a viewer who may not type a number",
      },
      {
        name: "2026-10-09 · a typed target kept when the choice is not offered — the card would post a typed test for GROWTH",
        expect: /^§16[.]21 ⛔/, sources: staleTypedTarget,
        landed: () => once(CLIENT, TARGET_FOLLOWS) && (staleTypedTarget.files.get(CLIENT) ?? "").includes('const typed = target === "typed";'),
        landedAs: "the typed state outlives the choice it was picked from",
      },
      {
        name: "2026-10-09 · a typed test refused for the role, and the page not re-read",
        expect: /^§16[.]21 ⛔/, sources: roleNoReread,
        landed: () => once(CLIENT, ROLE_REREAD) && !(roleNoReread.files.get(CLIENT) ?? "").includes(ROLE_REREAD),
        landedAs: "typed_role is no longer a page-stale reason, so the card keeps offering a choice the server refuses",
      },
      {
        name: "2026-10-09 · one sentence in two tones — the unusable own number said in the refusal red in the own-only card, grey beside the radio",
        expect: /^§16[.]22 ⭐/, sources: twoTones,
        landed: () => once(CLIENT, OWN_WHY_TONE) && (twoTones.files.get(CLIENT) ?? "").includes('text-danger-fg" data-test-choice-why="own"'),
        landedAs: "the own-only card's reason wears the danger tone while the radio card's stays secondary",
      },
    ];
    for (const p of screenPlants) {
      ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
      const failures = checkComposerScreen(p.sources, quiet);
      ok(`  └─ fires: ${p.expect.source.slice(0, 56)}`, failures.some((f) => p.expect.test(f)),
        failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
    }
  }

  /* ── §16.11–§16.13's plants: the composer's words, one member swapped in memory (the validation audit) ── */
  {
    const W = REAL_WORDS;
    /** §16.11 · the fold offered only when EVERY offender folds — one emoji hides it for a curly quote. */
    const foldEvery: typeof COMPOSE_COPY.foldOffered = (c) => c.encoding === "UCS2" && c.offenders.length > 0 && c.offenders.every((o) => o.foldable);
    /** §16.12 · "Unicode leaves no room" though Unicode keeps its whole 70 — a cut asked for that no cut can fix. */
    const overLine: typeof COMPOSE_COPY.counterLine = (c) => (c.encoding === "UCS2"
      ? `Unicode leaves no room · ${c.segments} messages · the limit is ${SMS_MAX_SEGMENTS}`
      : COMPOSE_COPY.counterLine(c));
    /** §16.13 · the bare "Saved 14:02" — nothing says that nothing was sent, or what is next. */
    const bareSaved: typeof COMPOSE_COPY.composeSaved = (at) => `Saved ${at.slice(11, 16)}`;
    /** §16.13 · the test below named whatever the page can send — the live switch closed, the number unusable. */
    const inviteAlways: typeof COMPOSE_COPY.composeSaved = (at) => COMPOSE_COPY.composeSaved(at, true);
    /** §16.13 · the first build's remedy: a step the owner may not be able to take (no such account exists yet). */
    const PROMISED_ACCOUNT = "Your account's phone number is not a Tanzanian mobile number an SMS can reach, so no test can be sent. " +
      "An account's number can't be changed — the owner can give staff access to an account on your mobile number, in Staff & roles (/admin/staff).";
    type WordsPlant = { name: string; expect: RegExp; words: WordsImpl; landed: () => boolean; landedAs: string };
    const wordsPlants: WordsPlant[] = [
      {
        name: "§16.11 · the fold offered only when every offender folds — an emoji hides it for a curly quote",
        expect: /^§16[.]11 ⭐/, words: { ...W, foldOffered: foldEvery },
        landed: () => COMPOSE_COPY.foldOffered(counterFor(MIXED16, "SW", FB, "")) && !foldEvery(counterFor(MIXED16, "SW", FB, "")),
        landedAs: "an emoji beside a curly quote: offered by the real rule, hidden by the plant",
      },
      {
        name: "§16.12 · 'Unicode leaves no room' though Unicode keeps its whole 70",
        expect: /^§16[.]12 ⛔/, words: { ...W, counterLine: overLine },
        landed: () => /no room/.test(overLine(counterFor(UNI15, "SW", FB, ""))) && !/no room/.test(COMPOSE_COPY.counterLine(counterFor(UNI15, "SW", FB, ""))),
        landedAs: "one curly quote reads as no room in the plant, and as characters left in the real line",
      },
      {
        name: "§16.13 · the bare 'Saved HH:MM' — nothing was sent goes unsaid",
        expect: /^§16[.]13 /, words: { ...W, composeSaved: bareSaved },
        landed: () => !bareSaved("2026-10-03T11:02:00.000Z", true).includes("nothing was sent") && COMPOSE_COPY.composeSaved("2026-10-03T11:02:00.000Z", true).includes("nothing was sent"),
        landedAs: "the plant's saved line drops what the real one says",
      },
      {
        name: "§16.13 · the saved line invites a test the page would refuse",
        expect: /^§16[.]13 /, words: { ...W, composeSaved: inviteAlways },
        landed: () => inviteAlways("2026-10-03T11:02:00.000Z", false).includes("test below") && !COMPOSE_COPY.composeSaved("2026-10-03T11:02:00.000Z", false).includes("test below"),
        landedAs: "told the page cannot test, the plant still names the test below; the real line does not",
      },
      {
        name: "§16.13 · an unusable own number with no remedy — the sentence before the audit",
        expect: /^§16[.]13 /,
        words: { ...W, ownNumberUnusable: "Your account's phone number is not a Tanzanian mobile number an SMS can reach, so no test can be sent." },
        landed: () => REAL_WORDS.ownNumberUnusable.includes("/admin/staff"),
        landedAs: "the shipped sentence names the remedy; the plant's does not",
      },
      {
        name: "§16.13 · an unusable own number promised a step the owner may not take — staff access to an account that may not exist",
        expect: /^§16[.]13 /, words: { ...W, ownNumberUnusable: PROMISED_ACCOUNT },
        landed: () => !/an account on your/i.test(REAL_WORDS.ownNumberUnusable) && /an account on your/i.test(PROMISED_ACCOUNT),
        landedAs: "the plant promises an account on the officer's number; the shipped sentence promises nothing it cannot keep",
      },
      {
        name: "§16.13 · an unfinished save told to try again",
        expect: /^§16[.]13 /, words: { ...W, saveUnfinished: "Saving the draft failed. Try again." },
        landed: () => !/try again/i.test(REAL_WORDS.saveUnfinished),
        landedAs: "the shipped sentence never says try again; the plant's does",
      },
    ];
    for (const p of wordsPlants) {
      ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
      const failures = checkComposerWords(p.words, quiet);
      ok(`  └─ fires: ${p.expect.source.slice(0, 56)}`, failures.some((f) => p.expect.test(f)),
        failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
    }
  }

  /* ── §17's plants: the save (U37b) — each swaps the save for one that carries ONE defect ──────────────── */
  {
    const R = REAL_COMPOSE;
    const realSave = DRAFT.saveCampaignDraft;
    const LANDED = "usr_u37b_landed";
    const reads = { viewerReads: true };
    /** P16 · the save trusts the posted figures — the row it writes carries whatever segments and coding were posted. */
    const trusting: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) => {
      const p = input as unknown as Record<string, unknown>;
      const posted = (row: Record<string, unknown>) => ({
        ...row,
        ...(typeof p.segmentsSw === "number" ? { segmentsSw: p.segmentsSw } : {}),
        ...(typeof p.codingSw === "string" ? { codingSw: p.codingSw } : {}),
        ...(typeof p.segmentsEn === "number" && row.bodyEn !== null ? { segmentsEn: p.segmentsEn } : {}),
        ...(typeof p.codingEn === "string" && row.bodyEn !== null ? { codingEn: p.codingEn } : {}),
      });
      return realSave(input, officerId, opts, { ...deps, campaigns: { ...deps.campaigns, create: (row) => deps.campaigns.create(posted(row as never) as never) } });
    };
    /** The save takes the browser's verdict — no re-validation on the server. */
    const unvalidated: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, { ...deps, validate: (f, phrase) => ({ ...validateCampaignTemplate(f, phrase), ok: true, problems: {} }) });
    /** P17 · the edit without the draftRevision compare — the guard is read off the row, so any revision lands. */
    const blindEdit: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, {
        ...deps,
        campaigns: {
          ...deps.campaigns,
          update: async (id, patch, _guard, at) => {
            const now = await deps.campaigns.find(id);
            return deps.campaigns.update(id, patch, { draftRevision: now?.draftRevision ?? 0 }, at);
          },
        },
      });
    /** OD55 · the one-number rule dropped. */
    const anyAudience: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, { ...deps, audienceRule: () => null });
    /** U37b review m4, undone: only the canonical search key is asked — a number in a tag, a list id, an import id or a
     *  padded search slips through. */
    const canonicalOnly: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, {
        ...deps,
        audienceRule: (f) => (f.q !== null && /^255[0-9]{9}$/.test(f.q.trim()) ? DRAFT.CAMPAIGN_AUDIENCE_ONE_NUMBER : null),
      });
    /** §17.7 · X25 undone — a posted search held to the book's role rule alone, so a masked viewer's is saved. */
    const searchAllowed: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) => {
      const posted = input?.audience ?? null;
      const onlySearch = posted !== null && Object.keys(posted).every((k) => k === "q");
      return realSave(input, officerId, onlySearch ? { viewerReads: true } : opts, deps);
    };
    /** §17.8 · the card judging for a reader whoever is looking — a masked viewer's search described, never refused. */
    const readerCard: typeof LOADER.composeAudienceView = (sp, draft) => LOADER.composeAudienceView(sp, draft, true);
    /** §17.8 · the refused address filter with no way to take it out. */
    const noClear: typeof LOADER.composeAudienceView = (sp, draft, reads) => ({ ...LOADER.composeAudienceView(sp, draft, reads), clearHref: null });
    /** §17.12 · the card hands every NEW draft no filter at all — the stored audience dropped, the whole book saved instead. */
    const wideCarry: typeof LOADER.composeAudienceView = (sp, draft, reads) => ({ ...LOADER.composeAudienceView(sp, draft, reads), carry: {} });
    /** §17.9 · the posted fallbacks stored whatever the body — a hidden, unchecked word kept. */
    const keepsHidden: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, {
        ...deps,
        campaigns: {
          ...deps.campaigns,
          create: (row) => deps.campaigns.create({
            ...row,
            nameFallbackSw: (input?.nameFallbackSw ?? "").trim() || null,
            nameFallbackEn: (input?.nameFallbackEn ?? "").trim() || null,
          }),
        },
      });
    /** §17.10 · OD55 on the label undone — the check passed a scrubbed name, the row kept the typed one. */
    const phoneName: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) => {
      const typed = typeof input?.name === "string" ? input.name : "";
      return realSave({ ...input, name: AUDIENCE.scrubPhoneRuns(typed) }, officerId, opts, {
        ...deps, campaigns: { ...deps.campaigns, create: (row) => deps.campaigns.create({ ...row, name: typed }) },
      });
    };
    /** §17.10 · the name stored as typed (only trimmed) — the invisible characters kept. */
    const typedName: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, {
        ...deps, campaigns: { ...deps.campaigns, create: (row) => deps.campaigns.create({ ...row, name: (input?.name ?? "").trim() }) },
      });
    /** §17.11 · the INT4 cap undone — a revision the column cannot hold is handed to the door, which throws. */
    const uncapped: typeof realSave = async (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) => {
      const r = input?.draftRevision;
      if (typeof input?.id === "string" && typeof r === "number" && Number.isSafeInteger(r) && r > 2147483647) {
        await deps.campaigns.update(input.id, { name: input.name }, { draftRevision: r }, deps.now().toISOString());
      }
      return realSave(input, officerId, opts, deps);
    };

    /** U37s · the save never stamps the line — every draft born with no source line, whatever is saved. */
    const neverStamps: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, { ...deps, campaigns: { ...deps.campaigns, create: (row) => deps.campaigns.create({ ...row, sourcePhrase: null }) } });
    /** U37s · THE SPEC'S PLANT — the save keeps a stale line: an edit's patch leaves the line stamped on it earlier. */
    const staleLine: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, {
        ...deps,
        campaigns: {
          ...deps.campaigns,
          update: (id, patch, guard, at) => {
            const { sourcePhrase: _stamped, ...kept } = patch;
            return deps.campaigns.update(id, kept, guard, at);
          },
        },
      });
    /** U37s · a line read as spaces stored as it was read — blank kept as text, not as no line. */
    const rawLine: typeof realSave = async (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) => {
      const read = await deps.sourcePhrase();
      const raw = read.ok ? read.phrase : null;
      return realSave(input, officerId, opts, { ...deps, campaigns: { ...deps.campaigns, create: (row) => deps.campaigns.create({ ...row, sourcePhrase: raw }) } });
    };
    /** U37s · the counter prices the line stamped on the draft earlier, not the one its next save stamps. */
    const stampCounter: typeof LOADER.composerSourcePhrase = (draft) => draft?.sourcePhrase ?? "";
    /** U37s review · a read that could not answer taken as "no line" — a good stamp replaced by none. */
    const guessesBlank: typeof realSave = (input, officerId, opts, deps = DRAFT.CAMPAIGN_DRAFT_DEPS) =>
      realSave(input, officerId, opts, {
        ...deps,
        sourcePhrase: async () => {
          const r = await deps.sourcePhrase();
          return r.ok ? r : { ok: true, phrase: null };
        },
      });
    /** U37s review · the stale flag never raised — an old draft reads "no changes" and can't be re-stamped. */
    const neverStale: typeof LOADER.composerSourceLineStale = () => false;
    /** U37s review · one source string swapped in memory — each anchor resolves exactly once in the real source. */
    const swapIn = (src: string, anchor: string, planted: string) => (src.split(anchor).length === 2 ? src.replace(anchor, planted) : src);
    const UNREAD_37S = { ok: false as const };

    type SavePlant = { name: string; expect: RegExp[]; impl: ComposeImpl; landed: () => Promise<boolean>; landedAs: string };
    const savePlants: SavePlant[] = [
      {
        name: "P16 · the save trusts the posted segments and coding",
        expect: [/^§17\.2 ⭐/], impl: { ...R, save: trusting },
        landed: async () => {
          const lie = { ...draftInput({ name: "Landed lie" }), segmentsSw: 7, codingSw: "UCS2" } as unknown as DraftInput;
          const r = await trusting(lie, LANDED, reads, QUIET_DRAFT_DEPS);
          const row = r.ok ? await db.smsCampaign.find(r.id) : null;
          return row !== null && row.segmentsSw === 7 && row.codingSw === "UCS2";
        },
        landedAs: "a draft posted with segmentsSw:7 / codingSw:UCS2 stores exactly those",
      },
      {
        name: "the save takes the browser's verdict — no re-validation on the server",
        expect: [/^§17\.1 ⭐/], impl: { ...R, save: unvalidated },
        landed: async () => {
          const over = draftInput({ name: "Landed over", bodySw: `${fillTo(HEAD, operatorBudget("SW", RESERVE))}aaa` });
          const real = await realSave(over, LANDED, reads, QUIET_DRAFT_DEPS);
          const planted = await unvalidated(over, LANDED, reads, QUIET_DRAFT_DEPS);
          return !real.ok && planted.ok;
        },
        landedAs: "a body 3 over the cap is refused by the real save and stored by the plant",
      },
      {
        name: "P17 · the edit without the draftRevision compare",
        expect: [/^§17\.3 ⭐/], impl: { ...R, save: blindEdit },
        landed: async () => {
          const made = await realSave(draftInput({ name: "Landed CAS" }), LANDED, reads, QUIET_DRAFT_DEPS);
          if (!made.ok) return false;
          await realSave(draftInput({ id: made.id, draftRevision: 0, name: "Landed CAS", bodySw: "50pick: Mara ya kwanza." }), LANDED, reads, QUIET_DRAFT_DEPS);
          const stale = await blindEdit(draftInput({ id: made.id, draftRevision: 0, name: "Landed CAS", bodySw: "50pick: Mara ya pili." }), LANDED, reads, QUIET_DRAFT_DEPS);
          return stale.ok;
        },
        landedAs: "an edit on a revision one save old lands over a colleague's",
      },
      {
        name: "OD55 · the one-number rule dropped — a campaign aimed at one phone",
        expect: [/^§17\.5 ⛔/], impl: { ...R, save: anyAudience },
        landed: async () => {
          const one = draftInput({ name: "Landed one number", audience: { q: "0712345678" } });
          const real = await realSave(one, LANDED, reads, QUIET_DRAFT_DEPS);
          const planted = await anyAudience(one, LANDED, reads, QUIET_DRAFT_DEPS);
          return !real.ok && planted.ok;
        },
        landedAs: "a whole-number audience is refused by the real save and stored by the plant",
      },
      {
        name: "OD55 · only the canonical search key asked — a number smuggled in a tag",
        expect: [/^§17\.5b ⛔/], impl: { ...R, save: canonicalOnly },
        landed: async () => {
          const tagged = draftInput({ name: "Landed tag number", audience: { tag: "0712345678" } });
          const real = await realSave(tagged, LANDED, reads, QUIET_DRAFT_DEPS);
          const planted = await canonicalOnly(tagged, LANDED, reads, QUIET_DRAFT_DEPS);
          return !real.ok && planted.ok;
        },
        landedAs: "a whole number as a tag is refused by the real save and stored by the plant",
      },
      {
        name: "§17.7 · X25 undone — a masked viewer's posted search saved under the book's role rule",
        expect: [/^§17[.]7 ⛔/], impl: { ...R, save: searchAllowed },
        landed: async () => {
          const search = draftInput({ name: "Landed masked search", audience: { q: "asha" } });
          const real = await realSave(search, LANDED, { viewerReads: false }, QUIET_DRAFT_DEPS);
          const planted = await searchAllowed(search, LANDED, { viewerReads: false }, QUIET_DRAFT_DEPS);
          return !real.ok && planted.ok;
        },
        landedAs: "q=asha from a masked viewer is refused by the real save and stored by the plant",
      },
      {
        name: "§17.8 · the card judging for a reader whoever looks — a masked viewer's search described, never refused",
        expect: [/^§17[.]8 ⛔/], impl: { ...R, audienceView: readerCard },
        landed: async () => readerCard({ q: "asha" }, null, false).problem === null && LOADER.composeAudienceView({ q: "asha" }, null, false).problem !== null,
        landedAs: "the real card refuses q=asha for a masked viewer; the plant's describes it",
      },
      {
        name: "§17.8 · a refused address filter with no way to take it out",
        expect: [/^§17[.]8 ⛔/], impl: { ...R, audienceView: noClear },
        landed: async () => LOADER.composeAudienceView({ q: "asha" }, null, false).clearHref !== null && noClear({ q: "asha" }, null, false).clearHref === null,
        landedAs: "the real card offers the remove control; the plant's does not",
      },
      {
        name: "§17.9 · the posted fallbacks stored whatever the body — a hidden, unchecked word kept",
        expect: [/^§17[.]9 ⛔/], impl: { ...R, save: keepsHidden },
        landed: async () => {
          const r = await keepsHidden(draftInput({ name: "Landed hidden word", bodySw: "50pick: Mechi kubwa leo.", nameFallbackSw: "Rafiki1" }), LANDED, reads, QUIET_DRAFT_DEPS);
          const row = r.ok ? await db.smsCampaign.find(r.id) : null;
          return row !== null && row.nameFallbackSw === "Rafiki1";
        },
        landedAs: "a body with no {jina} keeps the hidden 'Rafiki1'",
      },
      {
        name: "§17.10 · OD55 on the label undone — a phone number stored in the campaign's name",
        expect: [/^§17[.]10 ⛔/], impl: { ...R, save: phoneName },
        landed: async () => {
          const r = await phoneName(draftInput({ name: "Landed 0712 345 678" }), LANDED, reads, QUIET_DRAFT_DEPS);
          const row = r.ok ? await db.smsCampaign.find(r.id) : null;
          return row !== null && row.name === "Landed 0712 345 678";
        },
        landedAs: "the name with a whole number is stored as typed",
      },
      {
        name: "§17.10 · the name stored as typed — the zero-width space and the direction override kept",
        expect: [/^§17[.]10 ⛔/], impl: { ...R, save: typedName },
        landed: async () => {
          const r = await typedName(draftInput({ name: `Landed${ZWSP15} name${RLO16}` }), LANDED, reads, QUIET_DRAFT_DEPS);
          const row = r.ok ? await db.smsCampaign.find(r.id) : null;
          return row !== null && row.name.includes(ZWSP15);
        },
        landedAs: "the stored name keeps an invisible character",
      },
      {
        name: "§17.11 · the INT4 cap undone — a revision the column cannot hold handed to the door",
        expect: [/^§17[.]11 ⛔/], impl: { ...R, save: uncapped },
        landed: async () => {
          const made = await realSave(draftInput({ name: "Landed revision cap" }), LANDED, reads, QUIET_DRAFT_DEPS);
          if (!made.ok) return false;
          const huge = draftInput({ id: made.id, draftRevision: 2147483648, name: "Landed revision cap" });
          const real = await realSave(huge, LANDED, reads, QUIET_DRAFT_DEPS);
          let threw = false;
          try { await uncapped(huge, LANDED, reads, QUIET_DRAFT_DEPS); } catch { threw = true; }
          return !real.ok && real.reason === "stale" && threw;
        },
        landedAs: "the real save answers stale; the plant throws in the door",
      },
      {
        name: "§17.12 · 'Save as a new draft' carries no filter — the new draft goes to the whole contact book",
        expect: [/^§17[.]12 ⛔/], impl: { ...R, audienceView: wideCarry },
        landed: async () => {
          const tagged = { id: "cmp_u37b_landed_carry", audienceFilter: '{"tags":["vip"]}' } as unknown as StoredRow;
          const real = LOADER.composeAudienceView({ draft: tagged.id }, tagged, true).carry;
          const planted = wideCarry({ draft: tagged.id }, tagged, true).carry;
          return real !== null && real.tag === "vip" && planted !== null && Object.keys(planted).length === 0;
        },
        landedAs: "a stored tag filter carries as tag=vip on the real card and as no filter on the plant's",
      },
      {
        name: "U37s · the save never stamps the saved source line",
        expect: [/^§17[.]13 ⭐/], impl: { ...R, save: neverStamps },
        landed: async () => {
          const under = { ...QUIET_DRAFT_DEPS, sourcePhrase: () => ({ ok: true as const, phrase: LINE37S_A }) };
          const real = await realSave(draftInput({ name: "Landed stamp" }), LANDED, reads, under);
          const planted = await neverStamps(draftInput({ name: "Landed no stamp" }), LANDED, reads, under);
          const a = real.ok ? await db.smsCampaign.find(real.id) : null;
          const b = planted.ok ? await db.smsCampaign.find(planted.id) : null;
          return a !== null && a.sourcePhrase === LINE37S_A && b !== null && b.sourcePhrase === null;
        },
        landedAs: "under a saved line the real save stamps it and the plant stores none",
      },
      {
        name: "U37s · the save keeps a stale source line on an edit",
        expect: [/^§17[.]15 ⛔/], impl: { ...R, save: staleLine },
        landed: async () => {
          const made = await realSave(draftInput({ name: "Landed stale line" }), LANDED, reads, { ...QUIET_DRAFT_DEPS, sourcePhrase: () => ({ ok: true as const, phrase: LINE37S_A }) });
          if (!made.ok) return false;
          const edit = await staleLine(draftInput({ id: made.id, draftRevision: 0, name: "Landed stale line" }), LANDED, reads, { ...QUIET_DRAFT_DEPS, sourcePhrase: () => ({ ok: true as const, phrase: LINE37S_B }) });
          const row = await db.smsCampaign.find(made.id);
          return edit.ok && row !== null && row.draftRevision === 1 && row.sourcePhrase === LINE37S_A;
        },
        landedAs: "an edit saved after the line became B still carries A",
      },
      {
        name: "U37s · a line of spaces stored as text",
        expect: [/^§17[.]14 ⛔/], impl: { ...R, save: rawLine },
        landed: async () => {
          const r = await rawLine(draftInput({ name: "Landed spaces" }), LANDED, reads, { ...QUIET_DRAFT_DEPS, sourcePhrase: () => ({ ok: true as const, phrase: "   " }) });
          const row = r.ok ? await db.smsCampaign.find(r.id) : null;
          return row !== null && row.sourcePhrase === "   ";
        },
        landedAs: "a line of three spaces is stored as three spaces",
      },
      {
        name: "U37s · the counter prices the draft's earlier stamp",
        expect: [/^§17[.]16 ⭐/], impl: { ...R, sourceLine: stampCounter },
        landed: async () => {
          const draftA = { status: "DRAFT", sourcePhrase: LINE37S_A } as unknown as StoredRow;
          return stampCounter(draftA, LINE37S_B) === LINE37S_A && LOADER.composerSourcePhrase(draftA, LINE37S_B) === LINE37S_B;
        },
        landedAs: "a DRAFT stamped A under a saved B: the real counter prices B, the plant A",
      },
      {
        name: "U37s review · a source line that could not be read stamped as none",
        expect: [/^§17[.]17 ⛔/], impl: { ...R, save: guessesBlank },
        landed: async () => {
          const made = await realSave(draftInput({ name: "Landed unread" }), LANDED, reads, { ...QUIET_DRAFT_DEPS, sourcePhrase: () => ({ ok: true as const, phrase: LINE37S_A }) });
          if (!made.ok) return false;
          const unread = { ...QUIET_DRAFT_DEPS, sourcePhrase: () => UNREAD_37S };
          const real = await realSave(draftInput({ id: made.id, draftRevision: 0, name: "Landed unread" }), LANDED, reads, unread);
          const planted = await guessesBlank(draftInput({ id: made.id, draftRevision: 0, name: "Landed unread" }), LANDED, reads, unread);
          const row = await db.smsCampaign.find(made.id);
          return !real.ok && real.reason === "source_unreadable" && planted.ok && row !== null && row.sourcePhrase === null;
        },
        landedAs: "the real save refuses an unread line; the plant saves and wipes the stamp",
      },
      {
        name: "U37s review · the stale flag never raised",
        expect: [/^§17[.]19 ⭐/], impl: { ...R, staleLine: neverStale },
        landed: async () => {
          const old = { status: "DRAFT", sourcePhrase: null } as unknown as StoredRow;
          return LOADER.composerSourceLineStale(old, LINE37S_A) && !neverStale(old, LINE37S_A);
        },
        landedAs: "a draft stamped before the line existed: the real flag is raised, the plant's is not",
      },
      {
        name: "U37s review · the shipped deps stamp no line",
        expect: [/^§17[.]20 ⛔/],
        impl: { ...R, draftSource: swapIn(R.draftSource, "sourcePhrase: readSavedSourcePhrase,", "sourcePhrase: () => ({ ok: true, phrase: null }),") },
        landed: async () => R.draftSource.split("sourcePhrase: readSavedSourcePhrase,").length === 2,
        landedAs: "the deps line resolves exactly once in the real save and is swapped in memory",
      },
      {
        name: "U37s review · the loader prices the draft's own stamp",
        expect: [/^§17[.]20 ⛔/],
        impl: { ...R, loaderSource: swapIn(R.loaderSource, "sourcePhrase: composerSourcePhrase(draft, savedLine),", 'sourcePhrase: draft?.sourcePhrase ?? "",') },
        landed: async () => R.loaderSource.split("sourcePhrase: composerSourcePhrase(draft, savedLine),").length === 2,
        landedAs: "the loader's pricing line resolves exactly once and is swapped in memory",
      },
      {
        name: "U37s review · the screen keeps 'no changes' for a stale draft",
        expect: [/^§17[.]20 ⛔/],
        impl: { ...R, clientSource: swapIn(R.clientSource, "!dirty && !view.sourceLineStale", "!dirty") },
        landed: async () => R.clientSource.split("!dirty && !view.sourceLineStale").length === 2,
        landedAs: "the screen's no-changes rule resolves exactly once and is swapped in memory",
      },
    ];
    for (const p of savePlants) {
      ok(`PLANT LANDED · ${p.name}`, await p.landed(), p.landedAs);
      const failures = await checkSave(p.impl, quiet);
      for (const expect of p.expect) {
        ok(`  └─ fires: ${expect.source.slice(0, 56)}`, failures.some((f) => expect.test(f)),
          failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
      }
    }
  }

  /* ── §18's plants: the test send (U37b) — each swaps ONE member, or wraps the send with ONE defect ─────── */
  {
    const R = REAL_COMPOSE;
    const realTest = TEST.sendCampaignTest;
    const landedDeps = (over: Partial<TestDeps> = {}): TestDeps => ({ ...TEST.CAMPAIGN_TEST_DEPS, rate: ALLOW, audit: async () => ({}), window: ALWAYS_OPEN, ...over } as TestDeps);
    const CLEARED = async () => ({ ok: true as const });
    /** The plan's own RED · a typed test number honoured — the recipient read from the input when one is posted. */
    const typedNumber: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => realTest(input, officerId, {
      ...deps,
      users: {
        findById: async (id) => {
          const u = await deps.users.findById(id);
          const to = (input as unknown as Record<string, unknown>).to;
          return u !== null && typeof to === "string" ? { ...u, phoneE164: to } : u;
        },
      },
    });
    /** P12 · a posted body honoured. */
    const postedBody: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => realTest(input, officerId, {
      ...deps,
      campaigns: {
        find: async (id) => {
          const c = await deps.campaigns.find(id);
          const body = (input as unknown as Record<string, unknown>).body;
          return c !== null && typeof body === "string" ? { ...c, bodySw: body } : c;
        },
      },
    });
    /** P13 · the gate skipped — every number cleared, the send called straight on. */
    const noGate: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) =>
      realTest(input, officerId, { ...deps, dispatch: (rows, d) => dispatchSlice(rows, { ...d, gate: CLEARED }) });
    /** P14 · X14 · the switch read as OPEN when no row exists. */
    const absentIsOpen: typeof LIVE.readMarketingLiveSwitch = async (load) => {
      const r = await LIVE.readMarketingLiveSwitch(load);
      return r.state === "closed" && r.why === "absent" ? { state: "open", enabledBy: "nobody", enabledAt: "1970-01-01T00:00:00.000Z", closesAt: "9999-12-31T00:00:00.000Z" } : r;
    };
    /** U37b review m3, undone: keys beside the three are stripped before the real reader asks, so a recorded CLOSE that
     *  still carries { enabledBy, enabledAt, closesAt } reads open. */
    const extraKeysOpen: typeof LIVE.readMarketingLiveSwitch = (load) => (load === undefined ? LIVE.readMarketingLiveSwitch() : LIVE.readMarketingLiveSwitch(async (key) => {
      const r = await load(key);
      if (r.ok && r.value !== null && typeof r.value === "object" && !Array.isArray(r.value)) {
        const v = r.value as Record<string, unknown>;
        return { ok: true as const, value: { enabledBy: v.enabledBy, enabledAt: v.enabledAt, closesAt: v.closesAt } };
      }
      return r;
    }));
    /** E13, undone: the old { enabledBy, enabledAt } row — no closing time — read open, as the pre-U49s reader did. */
    const twoKeyOpen: typeof LIVE.readMarketingLiveSwitch = async (load = async () => ({ ok: true as const, value: null }), now = Date.now()) => {
      const got = await load("marketing.sms.live").catch(() => ({ ok: false as const, error: "x" }));
      const v = got.ok ? (got.value as Record<string, unknown> | null) : null;
      if (v !== null && typeof v === "object" && Object.keys(v).sort().join(",") === "enabledAt,enabledBy") {
        return { state: "open", enabledBy: String(v.enabledBy), enabledAt: String(v.enabledAt), closesAt: "9999-12-31T00:00:00.000Z" };
      }
      return LIVE.readMarketingLiveSwitch(load, now);
    };
    /** E13, undone: the closing time ignored — an expired row read open. */
    const expiredOpen: typeof LIVE.readMarketingLiveSwitch = async (load = async () => ({ ok: true as const, value: null }), now = Date.now()) => {
      const r = await LIVE.readMarketingLiveSwitch(load, now);
      return r.state === "closed" && r.why === "expired" && r.closedAt ? LIVE.readMarketingLiveSwitch(load, Date.parse(r.closedAt) - 1) : r;
    };
    /** U37b review m2, undone: the audit row names the campaign id as POSTED — an all-digit "id" is a whole number. */
    const rawIdAudited: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => realTest(input, officerId, {
      ...deps,
      audit: (e) => deps.audit({ ...e, targetId: typeof (input as { campaignId?: unknown })?.campaignId === "string" ? (input as { campaignId: string }).campaignId : null }),
    });
    /** X14 · a real carrier let through while the switch is closed. */
    const gateAlwaysOpen: typeof LIVE.marketingLiveGate = () => ({ ok: true, via: "open" });
    /** P18 · a fresh token minted on every test — no reuse. */
    const mintEveryTime: typeof ensureOptOutToken = (raw) => mintOptOutToken(raw);
    /** P19 · the raw number in the audit row. */
    const rawAudit: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => realTest(input, officerId, {
      ...deps,
      audit: async (e) => {
        const u = await deps.users.findById(officerId);
        return deps.audit({ ...e, payload: { ...(e.payload ?? {}), number: u?.phoneE164 ?? null } });
      },
    });
    /** A lost reply reported as handed over. */
    const lostAsHanded: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => {
      const r = await realTest(input, officerId, deps);
      return r.outcome === "unconfirmed" ? { ok: true, outcome: "handed_over", via: "open", text: r.text, maskedTo: r.maskedTo, at: r.at, reference: "sms_assumed" } : r;
    };
    /** U43b-2 review · the sentence before the review: every failed code said as the network's refusal — a failure before the
     *  request (UNKNOWN) claims the network was asked. */
    const everyCodeRefused: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => {
      const r = await realTest(input, officerId, deps);
      if (r.ok || r.outcome !== "refused" || r.reason !== "failed") return r;
      const code = /[(]([A-Z_]+)/.exec(r.error)?.[1] ?? "UNKNOWN";
      return { ...r, error: `The network refused the message (${code}) — nothing reached your phone.` };
    };
    /** No budget — every test allowed. */
    const noBudget: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => realTest(input, officerId, { ...deps, rate: ALLOW });
    /** A confirmed campaign tested anyway — the draft check gone. */
    const anyStatus: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => realTest(input, officerId, {
      ...deps,
      campaigns: {
        find: async (id) => {
          const c = await deps.campaigns.find(id);
          return c === null ? null : { ...c, status: "DRAFT" };
        },
      },
    });
    /** The test rendered as a CONTACT-BOOK recipient — false for the officer's own number, and refused while there is no source line. */
    const asBook: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) =>
      realTest(input, officerId, { ...deps, render: (t, r) => renderForRecipient(t, { ...r, origin: "book" }) });
    /** The account name printed RAW on the wire — no fold, no first word, no letters rule — around the one renderer. */
    const rawName: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS) => {
      const u = await deps.users.findById(officerId);
      const c = await deps.campaigns.find((input as unknown as { campaignId: string }).campaignId);
      return realTest(input, officerId, {
        ...deps,
        dispatch: (rows, d) => {
          if (c === null) return dispatchSlice(rows, d);
          const english = input.variant === "EN" && (c.bodyEn ?? "").trim() !== "";
          const body = english ? (c.bodyEn ?? "") : c.bodySw;
          const fallback = (english ? c.nameFallbackEn : c.nameFallbackSw) ?? "";
          const raw = (u?.displayName ?? "").trim() || fallback;
          const token = (rows[0]?.body ?? "").slice(-8);
          const text = composeMarketing(renderBody(body, raw), token, english ? "EN" : "SW").text;
          return dispatchSlice(rows.map((row) => ({ ...row, body: text })), d);
        },
      });
    };

    /* ── U37c · the typed test's plants (spec Appendix A §A.3–§A.8): each lands on its own, then must fire its claim ── */
    const P_OPEN = { state: "open" as const, recordedBy: "usr_u37c_owner", recordedAt: "2026-10-05T09:00:00.000Z" };
    const P_READS = { ...DB_GATE_READS, outreach: () => P_OPEN } as TestDeps["gateReads"];
    const P_ADULT = { v: 3, text: "I confirm the person who uses this number is 18 or older." } as unknown as NonNullable<ReturnType<TestDeps["adultTestWording"]>>;
    const typedLanded = (over: Partial<TestDeps> = {}) =>
      landedDeps({ gateReads: P_READS, adultTestWording: () => P_ADULT, rateTyped: ALLOW, rateTo: ALLOW, sleep: async () => {}, ...over });
    const typedInput = (campaignId: string, number: string, adultAttested: unknown = true) =>
      ({ campaignId, variant: "SW", recipient: { kind: "typed", number, adultAttested, attestedVersion: P_ADULT.v } }) as unknown as TestInput;
    const phrased = async () => {
      const id = await u37bDraft();
      await db.smsCampaign.update(id, { sourcePhrase: PHRASE }, { draftRevision: 0 }, new Date().toISOString());
      return id;
    };
    const P_WITHDRAWN = (key: string) => ({ ...P_READS, latestConsent: (k: { identifier: string }) => (k.identifier === key
      ? { id: "mc_u37c_planted", status: "WITHDRAWN", createdAt: "2026-10-01T09:00:00.000Z", channel: "SMS", identifier: key, category: "MARKETING" }
      : P_READS.latestConsent(k as never)) }) as unknown as TestDeps["gateReads"];
    const recipientOf = (input: unknown) => TEST.testRecipientOf((input as { recipient?: unknown } | null)?.recipient);
    /** A.3 · a typed recipient honoured without the officer's 18+ confirmation. */
    const noAttestation: typeof realTest = (input, officerId, deps, options) => {
      const r = (input as unknown as { recipient?: Record<string, unknown> })?.recipient;
      const forced = r && r.kind === "typed" ? { ...input, recipient: { ...r, adultAttested: true } } : input;
      return realTest(forced as TestInput, officerId, deps, options);
    };
    /** §18.32 · a confirmation recorded against words the officer never saw — the version check skipped. */
    const staleHonoured: typeof realTest = (input, officerId, deps, options) => {
      const r = (input as unknown as { recipient?: Record<string, unknown> })?.recipient;
      const v = (deps ?? TEST.CAMPAIGN_TEST_DEPS).adultTestWording()?.v ?? null;
      const forced = r && r.kind === "typed" ? { ...input, recipient: { ...r, attestedVersion: v } } : input;
      return realTest(forced as TestInput, officerId, deps, options);
    };
    /** A.4 · a typed number rendered as an ACCOUNT recipient — no source line, and a holder's own name could print. */
    const typedAsAccount: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) =>
      realTest(input, officerId, { ...deps, render: (t, r) => renderForRecipient(t, { ...r, origin: "account" }) }, options);
    /** A.8 · the confirmation honoured for a player — the gate's player branch skipped on a typed test. */
    const playerSkipped: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) =>
      realTest(input, officerId, { ...deps, gateReads: { ...deps.gateReads, userByPhone: () => null } }, options);
    /** U33r · §18.36 · a typed test whose gate never asks the referee keys — the promise skipped on the test path. */
    const refereeSkipped: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) =>
      realTest(input, officerId, { ...deps, gateReads: { ...deps.gateReads, refereeHeld: () => false } }, options);
    /** A.8 · a typed refusal itemised for a masked viewer. */
    const itemised: typeof realTest = (input, officerId, deps) => realTest(input, officerId, deps, { viewerReads: true });
    /** A.8 · the real token returned to the screen. */
    const realTokenShown: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => {
      let wire = "";
      const r = await realTest(input, officerId, { ...deps, dispatch: (rows, d) => { wire = rows[0]?.body ?? ""; return deps.dispatch(rows, d); } }, options);
      return r.ok && r.target === "typed" && wire !== "" ? { ...r, text: wire } : r;
    };
    /** A.8 · no per-recipient budget. */
    const noRecipientBudget: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => realTest(input, officerId, { ...deps, rateTo: ALLOW }, options);
    /** A.8 · no officer typed budget — a back-door campaign through tests. */
    const noTypedBudget: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => realTest(input, officerId, { ...deps, rateTyped: ALLOW }, options);
    /** A.8 · the basis returned to the client (LICENCE_TEST on the result). */
    const basisReturned: typeof realTest = async (input, officerId, deps, options) => {
      const r = await realTest(input, officerId, deps, options);
      return r.ok && r.target === "typed" ? ({ ...r, basis: "LICENCE_TEST" } as typeof r) : r;
    };
    /** A.8 · a typed budget spent before the number-independent checks. */
    const spentEarly: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => {
      const rec = recipientOf(input);
      if (rec?.kind === "typed") {
        await deps.rateTyped(officerId);
        const p = parseTzNumber(rec.number);
        if (p.msisdn) await deps.rateTo(p.msisdn);
      }
      return realTest(input, officerId, deps, options);
    };
    /** A.8 · the floor skipped. */
    const noFloor: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => realTest(input, officerId, { ...deps, sleep: async () => {} }, options);
    /** A.8 · typed tests skip the live switch (read as open for a typed number only). */
    const typedSkipsSwitch: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) =>
      realTest(input, officerId, recipientOf(input)?.kind === "typed"
        ? { ...deps, liveSwitch: async () => ({ state: "open", enabledBy: "nobody", enabledAt: "1970-01-01T00:00:00.000Z", closesAt: "9999-12-31T00:00:00.000Z" }) as never }
        : deps, options);
    /** A.8 · a token minted before the pre-check. */
    const tokenFirst: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => {
      const rec = recipientOf(input);
      if (rec?.kind === "typed") {
        const p = parseTzNumber(rec.number);
        if (p.msisdn) await deps.ensureToken(p.msisdn);
      }
      return realTest(input, officerId, deps, options);
    };
    /** A.8 · typed allowed while the record is closed — the up-front check and the gate read a record that is always open. */
    const closedIgnored: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) =>
      realTest(input, officerId, { ...deps, gateReads: { ...deps.gateReads, outreach: () => P_OPEN } }, options);
    /** A.8 · the officer's own number, typed, required a confirmation. */
    const ownNeedsTick: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => {
      const rec = recipientOf(input);
      if (rec?.kind === "typed" && !rec.adultAttested) {
        return { ok: false, outcome: "refused", reason: "attestation_missing", error: TEST.TEST_ATTESTATION_MISSING, target: "typed" };
      }
      return realTest(input, officerId, deps, options);
    };
    /** A.8 · the typed preview built for a number — a holder's name printed and a real-looking token shown. */
    const previewFromNumber: typeof LOADER.composeTypedView = (draft, facts) => {
      const v = LOADER.composeTypedView(draft, facts);
      if (draft === null || v.preview === null) return v;
      const r = renderForRecipient(u37bTemplate(draft), { variant: "SW", name: "Juma", token: "ab12cd34", origin: "account" });
      return { ...v, preview: { ...v.preview, SW: r.ok ? r.text : v.preview.SW } };
    };
    /** U37c-2 · "allowed" without a preview — a text that cannot render for a book recipient offered anyway. */
    const renderIgnored: typeof LOADER.composeTypedView = (draft, facts) => {
      const v = LOADER.composeTypedView(draft, facts);
      const upFront: Array<string | null> = [TEST.TEST_TYPED_OUTREACH_CLOSED, TEST.TEST_TYPED_NO_ATTESTATION_WORDING, TEST.TEST_TYPED_NEEDS_SOURCE_LINE];
      return draft !== null && !v.allowed && v.why !== null && !upFront.includes(v.why) ? { ...v, allowed: true, why: null } : v;
    };
    /** Review · a 41-character number let through — the cap gone, the extra text trimmed off before the re-typing. */
    const uncappedNumber: typeof realTest = (input, officerId, deps, options) => {
      const r = (input as unknown as { recipient?: Record<string, unknown> })?.recipient;
      const trimmed = r && r.kind === "typed" && typeof r.number === "string" ? { ...input, recipient: { ...r, number: r.number.trim() } } : input;
      return realTest(trimmed as TestInput, officerId, deps, options);
    };
    /** Review · a number the plan refuses answered with a generic sentence, never the parser's own. */
    const genericNumber: typeof realTest = async (input, officerId, deps, options) => {
      const r = await realTest(input, officerId, deps, options);
      return !r.ok && r.outcome === "refused" && r.reason === "bad_number" ? { ...r, error: "That number is invalid." } : r;
    };
    /** Review · OD61 undone — the typed path writes the RG COMPLIANCE row after all. */
    const rgLineWritten: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => {
      const r = await realTest(input, officerId, deps, options);
      const rec = recipientOf(input);
      if (!r.ok && r.target === "typed" && rec?.kind === "typed") {
        const p = parseTzNumber(rec.number);
        if (p.msisdn) await auditRgRefusal(await mayReceiveMarketingSms(p.msisdn, new Date(), deps.gateReads));
      }
      return r;
    };
    /** Review · dispatch handed the pre-check's answer instead of asking the gate again. */
    const noReask: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) =>
      realTest(input, officerId, { ...deps, dispatch: (rows, d) => dispatchSlice(rows, { ...d, gate: async () => ({ ok: true as const, basis: "LICENCE_TEST" as const, basisRef: "test:remembered" }) }) }, options);

    /** U13 · M12 · the test send that ignores its send window — a test goes out at any hour. */
    const windowIgnored: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) =>
      realTest(input, officerId, { ...deps, window: ALWAYS_OPEN }, options);

    /** U43b-1 · R-S2 · the send step before E3: a lost reply (TRANSPORT) settled as a refusal, `failed`. */
    const transportFailed: typeof dispatchSlice = async (rows, d) => (await dispatchSlice(rows, d)).map((o) =>
      (o.outcome === "unconfirmed" && o.code === "TRANSPORT"
        ? { ref: o.ref, outcome: "failed" as const, code: "TRANSPORT", error: "reply lost", basis: o.basis, basisRef: o.basisRef }
        : o));

    /** A.5 · the typed gate built from a stand-in — the source no longer asks the ONE gate. */
    const GATE_CALL = "mayReceiveMarketingSms(m, deps.now(), deps.gateReads, { testAttestation })";
    const standInGate = R.testSendSource.split(GATE_CALL).join("allowTypedTest(m, testAttestation)");

    /* ── 2026-10-09 · the owner's ruling (a test to a typed number is for the Owner and Compliance only): each lands on its own,
     *    then must fire its claim ── */
    /** The role check removed — every officer's stored role passes it, as if the check were not there. */
    const everyoneTypes: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => realTest(input, officerId, {
      ...deps,
      users: { findById: async (id) => { const u = await deps.users.findById(id); return u === null ? null : { ...u, role: "ADMIN" as const }; } },
    }, options);
    /** The browser's word honoured — a role posted beside the recipient taken over the stored one. */
    const postedRole: typeof realTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => {
      const posted = (input as unknown as { role?: unknown } | null)?.role;
      return realTest(input, officerId, {
        ...deps,
        users: {
          findById: async (id) => {
            const u = await deps.users.findById(id);
            return u !== null && typeof posted === "string" ? { ...u, role: posted as typeof u.role } : u;
          },
        },
      }, options);
    };
    /** The role asked only AFTER the typed number is read: parsed first (a malformed one answered in the plan's words), then
     *  set beside the officer's own (their own in another spelling taken as their own). */
    const roleAfterNumber: typeof realTest = async (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) => {
      const rec = recipientOf(input);
      if (rec?.kind !== "typed") return realTest(input, officerId, deps, options);
      const p = parseTzNumber(rec.number);
      if (p.verdict !== "ok" || !p.msisdn) return { ok: false, outcome: "refused", reason: "bad_number", error: p.reason, target: "typed" };
      const me = await deps.users.findById(officerId);
      const mine = me === null ? null : parseTzNumber(me.phoneE164);
      return mine !== null && mine.verdict === "ok" && mine.msisdn === p.msisdn
        ? realTest({ ...input, recipient: { kind: "own" } } as TestInput, officerId, deps, options)
        : realTest(input, officerId, deps, options);
    };
    /** The door's source with the role check gone, and with it moved below the parse of the typed number. */
    const LF_TEST_SRC = R.testSendSource.split(CR17).join("");
    const ROLE_CHECK_SRC = [
      '  if (recipient.kind === "typed" && !mayTestTypedNumber(officer?.role)) {',
      "    trail.role = officer?.role ?? null;",
      '    return refuse("typed_role", TEST_TYPED_ROLE_REFUSED);',
      "  }",
      "",
    ].join(NL15);
    const PARSED_SRC = `    if (typed.verdict !== "ok" || !typed.msisdn) return refuse("bad_number", typed.reason);${NL15}`;
    const roleGoneSrc = LF_TEST_SRC.split(ROLE_CHECK_SRC).join("");
    const roleMovedSrc = roleGoneSrc.split(PARSED_SRC).join(`${PARSED_SRC}  ${ROLE_CHECK_SRC.split(NL15).join(`${NL15}  `)}`);
    /** The loader offering "Another number" to every viewer, and handing every viewer the whole typed view. */
    const LOADER_DECIDES = "const typedOffered = mayTestTypedNumber(officer?.role);";
    const loaderOffersAll = R.loaderSource.split(LOADER_DECIDES).join("const typedOffered = true;");
    const LOADER_EMPTY = ": TYPED_NOT_OFFERED,";
    const loaderHandsAll = R.loaderSource.split(LOADER_EMPTY)
      .join(': composeTypedView(draft, { outreachOpen: licenceOutreach().state === "open", adult: currentWording("adult.test") }),');

    type TestPlant = { name: string; expect: RegExp[]; impl: ComposeImpl; landed: () => Promise<boolean>; landedAs: string };
    const testPlants: TestPlant[] = [
      {
        name: "the plan's own RED, inverted on purpose · a number read from a stray key (to), outside the recipient contract — no 18+ confirmation, no per-recipient budget, no book origin",
        expect: [/^§18\.2 ⛔/], impl: { ...R, test: typedNumber },
        landed: async () => {
          const o = await u37bOfficer();
          const id = await u37bDraft();
          const { send, spy } = u37bSpy();
          await typedNumber({ campaignId: id, variant: "SW", to: "+255754000002" } as unknown as TestInput, o.id, landedDeps({ send, gate: CLEARED }));
          return spy.messages[0]?.to === "255754000002";
        },
        landedAs: "with the gate cleared, the message goes to the typed number",
      },
      {
        name: "P12 · a posted body honoured",
        expect: [/^§18\.3 ⛔/], impl: { ...R, test: postedBody },
        landed: async () => {
          const o = await u37bOfficer();
          const id = await u37bDraft();
          const { send, spy } = u37bSpy();
          await postedBody({ campaignId: id, variant: "SW", body: "50pick: SHINDA" } as unknown as TestInput, o.id, landedDeps({ send }));
          return (spy.messages[0]?.body ?? "").startsWith("50pick: SHINDA");
        },
        landedAs: "the posted body is what reaches the wire",
      },
      {
        name: "P13 · a test send that skips the gate",
        expect: [/^§18\.4 ⛔/], impl: { ...R, test: noGate },
        landed: async () => {
          const o = await u37bOfficer({ consent: false });
          const id = await u37bDraft();
          const { send, spy } = u37bSpy();
          const real = await realTest({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send }));
          const planted = await noGate({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send }));
          return !real.ok && planted.ok && spy.calls === 1;
        },
        landedAs: "an officer with no consent is refused by the real send and sent to by the plant",
      },
      {
        name: "P14 · X14 · the switch read as open with no row",
        expect: [/^§18\.6 ⛔/], impl: { ...R, readSwitch: absentIsOpen },
        landed: async () => {
          const absent = async () => ({ ok: true as const, value: null });
          return (await LIVE.readMarketingLiveSwitch(absent)).state === "closed" && (await absentIsOpen(absent)).state === "open";
        },
        landedAs: "no row reads closed for the real reader and open for the plant",
      },
      {
        // U37b review M1 — the mutation that used to survive: the SHIPPED wiring hard-codes the switch open.
        name: "P14b · X14 · the shipped wiring reads the switch as open — a real carrier sends with no row",
        expect: [/^§18\.5 ⭐/],
        impl: { ...R, testDeps: { ...TEST.CAMPAIGN_TEST_DEPS, liveSwitch: async () => ({ state: "open" as const, enabledBy: "code", enabledAt: "2026-10-02T00:00:00.000Z", closesAt: "9999-12-31T00:00:00.000Z" }) } },
        landed: async () => (await TEST.CAMPAIGN_TEST_DEPS.liveSwitch()).state === "closed",
        landedAs: "in this run the shipped reader reads closed (no row), and the plant's wiring reads open",
      },
      {
        name: "the switch reader reads a row with a key beside the three as open (U37b review m3)",
        expect: [/^§18\.6 ⛔/], impl: { ...R, readSwitch: extraKeysOpen },
        landed: async () => {
          const at = (ms: number) => new Date(ms).toISOString();
          const closeRecorded = async () => ({ ok: true as const, value: { enabledBy: "usr_owner", enabledAt: at(Date.now() - 60_000), closesAt: at(Date.now() + 3_600_000), enabled: false } });
          return (await LIVE.readMarketingLiveSwitch(closeRecorded)).state === "closed" && (await extraKeysOpen(closeRecorded)).state === "open";
        },
        landedAs: "a row recording a close reads closed for the real reader and open for the plant",
      },
      {
        name: "E13 · the old two-key row (no closing time) read open",
        expect: [/^§18\.6 ⛔/], impl: { ...R, readSwitch: twoKeyOpen },
        landed: async () => {
          const old = async () => ({ ok: true as const, value: { enabledBy: "usr_owner", enabledAt: new Date(Date.now() - 60_000).toISOString() } });
          return (await LIVE.readMarketingLiveSwitch(old)).state === "closed" && (await twoKeyOpen(old)).state === "open";
        },
        landedAs: "a { enabledBy, enabledAt } row reads closed for the real reader and open for the plant",
      },
      {
        name: "E13 · an expired switch read open",
        expect: [/^§18\.6 ⛔/], impl: { ...R, readSwitch: expiredOpen },
        landed: async () => {
          const at = (ms: number) => new Date(ms).toISOString();
          const past = async () => ({ ok: true as const, value: { enabledBy: "usr_owner", enabledAt: at(Date.now() - 3 * 3_600_000), closesAt: at(Date.now() - 3_600_000) } });
          return (await LIVE.readMarketingLiveSwitch(past)).state === "closed" && (await expiredOpen(past)).state === "open";
        },
        landedAs: "a row past its closesAt reads closed for the real reader and open for the plant",
      },
      {
        name: "an all-digit campaign id written into the audit row (U37b review m2)",
        expect: [/^§18\.10b/], impl: { ...R, test: rawIdAudited },
        landed: async () => {
          const o = await u37bOfficer();
          const seen: Array<string | null> = [];
          const grab = async (e: { targetId: string | null }) => { seen.push(e.targetId); return {}; };
          await realTest({ campaignId: "255712345678", variant: "SW" }, o.id, landedDeps({ audit: grab as never }));
          await rawIdAudited({ campaignId: "255712345678", variant: "SW" }, o.id, landedDeps({ audit: grab as never }));
          return seen.length === 2 && seen[0] === null && seen[1] === "255712345678";
        },
        landedAs: "the real row names no target and the plant's names the posted digits",
      },
      {
        name: "P14c · the shipped wiring's switch written as a constant in its source",
        expect: [/^§18\.14 ⛔/],
        impl: { ...R, testSendSource: R.testSendSource.replace("liveSwitch: () => readMarketingLiveSwitch(),", "liveSwitch: async () => ({ state: 'open', enabledBy: 'code', enabledAt: '2026-10-02T00:00:00.000Z' }),") },
        landed: async () => R.testSendSource.includes("liveSwitch: () => readMarketingLiveSwitch(),"),
        landedAs: "the source carries the real reader, so the replacement changes it",
      },
      {
        name: "P18b · the shipped wiring mints a fresh token on every test",
        expect: [/^§18\.15/],
        impl: { ...R, testDeps: { ...TEST.CAMPAIGN_TEST_DEPS, ensureToken: (raw: string) => mintOptOutToken(raw) } },
        landed: async () => {
          const key = u37bKey();
          const a = await mintOptOutToken(key);
          const b = await mintOptOutToken(key);
          return a !== null && b !== null && a !== b;
        },
        landedAs: "minting twice for one number leaves two different tokens",
      },
      {
        name: "the shipped wiring's audit writes nothing",
        expect: [/^§18\.16/],
        impl: { ...R, testDeps: { ...TEST.CAMPAIGN_TEST_DEPS, audit: async () => ({}) } },
        landed: async () => true,
        landedAs: "a no-op audit needs no proof of landing",
      },
      {
        name: "X14 · the gate lets a real carrier through while the switch is closed",
        expect: [/^§18\.6 the gate/], impl: { ...R, liveGate: gateAlwaysOpen },
        landed: async () => {
          const closed = { state: "closed" as const, why: "absent" as const };
          return !LIVE.marketingLiveGate("blackball", closed).ok && gateAlwaysOpen("blackball", closed).ok;
        },
        landedAs: "Blackball with the switch closed: refused by the real gate, let through by the plant",
      },
      {
        name: "a confirmed campaign tested anyway — the draft check gone",
        expect: [/^§18\.7/], impl: { ...R, test: anyStatus },
        landed: async () => {
          const o = await u37bOfficer();
          const id = await u37bDraft();
          await u37bConfirm(id);
          const { send, spy } = u37bSpy();
          const planted = await anyStatus({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send }));
          return planted.ok && spy.calls === 1;
        },
        landedAs: "a CONFIRMED campaign's text reaches the wire",
      },
      {
        name: "no budget — every test allowed",
        expect: [/^§18\.8/], impl: { ...R, test: noBudget },
        landed: async () => {
          const o = await u37bOfficer();
          const tries: TestResult[] = [];
          for (let i = 0; i < 4; i++) tries.push(await noBudget({ campaignId: "cmp_u37b_rate_landed", variant: "SW" }, o.id, { ...TEST.CAMPAIGN_TEST_DEPS, audit: async () => ({}) }));
          return tries.every((r) => reasonOf(r) === "not_found");
        },
        landedAs: "a fourth test inside the window is not refused",
      },
      {
        name: "P18 · a fresh token minted on every test — no reuse",
        expect: [/^§18\.9/], impl: { ...R, ensureToken: mintEveryTime },
        landed: async () => {
          const key = u37bKey();
          const a = await mintEveryTime(key);
          const b = await mintEveryTime(key);
          return a !== null && b !== null && a !== b && (await tokenCount(key)) === 2;
        },
        landedAs: "two calls for one number leave two different tokens",
      },
      {
        name: "P19 · the raw number in the audit row",
        expect: [/^§18\.10/], impl: { ...R, test: rawAudit },
        landed: async () => {
          const o = await u37bOfficer();
          const id = await u37bDraft();
          const rows: string[] = [];
          const { send } = u37bSpy();
          await rawAudit({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send, audit: async (e) => { rows.push(JSON.stringify(e)); return {}; } }));
          return rows.some((r) => r.includes(o.key));
        },
        landedAs: "the officer's whole number is in the audit payload",
      },
      {
        name: "a lost reply reported as handed over",
        expect: [/^§18\.11 ⛔/], impl: { ...R, test: lostAsHanded },
        landed: async () => {
          const o = await u37bOfficer();
          const id = await u37bDraft();
          const r = await lostAsHanded({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send: u37bSpy("transport").send }));
          return r.ok && r.outcome === "handed_over";
        },
        landedAs: "a TRANSPORT failure comes back as handed over",
      },
      {
        name: "the account name printed raw on the wire (no fold, no first word, no letters rule)",
        expect: [/^§18\.12 ⭐/], impl: { ...R, test: rawName },
        landed: async () => {
          const o = await u37bOfficer({ displayName: "BigWinner_1" });
          const id = await u37bDraft();
          const { send, spy } = u37bSpy();
          await rawName({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send }));
          return (spy.messages[0]?.body ?? "").includes("BigWinner_1");
        },
        landedAs: "a handle with an underscore is printed under the sender ID",
      },
      {
        name: "the test rendered as a contact-book recipient",
        expect: [/^§18\.13 ⭐/], impl: { ...R, test: asBook },
        landed: async () => {
          const o = await u37bOfficer();
          const id = await u37bDraft();
          const { send } = u37bSpy();
          const real = await realTest({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send }));
          const planted = await asBook({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send }));
          return real.ok && !planted.ok;
        },
        landedAs: "with no source line, the real test is sent and the book-origin one refused",
      },
      /* ── U37c ── */
      {
        name: "U37c · a typed recipient honoured without the officer's 18+ confirmation",
        expect: [/^§18\.18 ⛔/], impl: { ...R, test: noAttestation },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const real = await realTest(typedInput(id, `+${u37bKey()}`, false), o.id, typedLanded({ send: u37bSpy().send }));
          const planted = await noAttestation(typedInput(id, `+${u37bKey()}`, false), o.id, typedLanded({ send: u37bSpy().send }));
          return !real.ok && real.outcome === "refused" && real.reason === "attestation_missing" && planted.ok;
        },
        landedAs: "unticked, the real test is refused and the plant's is handed over",
      },
      {
        name: "U37c-2 · a tick recorded against words the officer never saw (the version check skipped)",
        expect: [/^§18\.32 ⛔/], impl: { ...R, test: staleHonoured },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const old = (cid: string) => ({ campaignId: cid, variant: "SW", recipient: { kind: "typed", number: `+${u37bKey()}`, adultAttested: true, attestedVersion: P_ADULT.v - 1 } }) as unknown as TestInput;
          const real = await realTest(old(id), o.id, typedLanded({ send: u37bSpy().send }));
          const planted = await staleHonoured(old(id), o.id, typedLanded({ send: u37bSpy().send }));
          return !real.ok && real.outcome === "refused" && real.reason === "attestation_stale" && planted.ok;
        },
        landedAs: "with an old version, the real test is refused and the plant's is handed over",
      },
      {
        name: "U37c · a typed number rendered as an ACCOUNT recipient",
        expect: [/^§18\.13 ⭐/, /^§18\.17 ⭐/], impl: { ...R, test: typedAsAccount },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const real = await realTest(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ send: u37bSpy().send }));
          const planted = await typedAsAccount(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ send: u37bSpy().send }));
          return real.ok && real.text.includes(PHRASE) && planted.ok && !planted.text.includes(PHRASE);
        },
        landedAs: "the real typed test carries the source line; the plant's carries none",
      },
      {
        name: "U37c · the confirmation honoured for a player — the gate's player branch skipped on a typed test",
        expect: [/^§18\.19 ⛔/], impl: { ...R, test: playerSkipped },
        landed: async () => {
          const o = await u37bTypist();
          const minor = await u37bOfficer({ dob: "2012-06-01" });
          const id = await phrased();
          const real = await realTest(typedInput(id, `+${minor.key}`), o.id, typedLanded({ send: u37bSpy().send }));
          const planted = await playerSkipped(typedInput(id, `+${minor.key}`), o.id, typedLanded({ send: u37bSpy().send }));
          return !real.ok && planted.ok;
        },
        landedAs: "a player under 18: refused by the real test, handed over by the plant",
      },
      {
        name: "U33r · a typed test whose gate never asks the referee keys — a promised agent referee tested on",
        expect: [/^§18[.]36 ⛔/], impl: { ...R, test: refereeSkipped },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const k = u37bKey();
          await recordRefereeKeys({ contacts: [`+${k}`], namedAt: "2026-09-08T10:00:00.000Z" });
          const real = await realTest(typedInput(id, `+${k}`), o.id, typedLanded({ send: u37bSpy().send }));
          const planted = await refereeSkipped(typedInput(id, `+${k}`), o.id, typedLanded({ send: u37bSpy().send }));
          return !real.ok && real.outcome === "refused" && planted.ok;
        },
        landedAs: "a promised referee: refused by the real test, handed over by the plant",
      },
      {
        name: "U37c · a typed refusal itemised for a masked viewer",
        expect: [/^§18\.20 ⛔/], impl: { ...R, test: itemised },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const k = u37bKey();
          const real = await realTest(typedInput(id, `+${k}`), o.id, typedLanded({ gateReads: P_WITHDRAWN(k) }));
          const planted = await itemised(typedInput(id, `+${k}`), o.id, typedLanded({ gateReads: P_WITHDRAWN(k) }));
          return !real.ok && real.outcome === "refused" && real.reason === "typed_refused" && !planted.ok && planted.outcome === "refused" && planted.reason === "consent_withdrawn";
        },
        landedAs: "for a masked viewer the real refusal is typed_refused; the plant names consent_withdrawn",
      },
      {
        name: "U37c · the real token returned to the screen",
        expect: [/^§18\.21 ⛔/], impl: { ...R, test: realTokenShown },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const k = u37bKey();
          const planted = await realTokenShown(typedInput(id, `+${k}`), o.id, typedLanded({ send: u37bSpy().send }));
          const token = (await db.marketingOptOutToken.listFor(k))[0]?.token ?? "";
          return planted.ok && token !== "" && planted.text.includes(token);
        },
        landedAs: "the plant hands the officer the text carrying the number's real stop link",
      },
      {
        name: "U37c-2 · a typed test offered for a text that cannot render for a book recipient",
        expect: [/^§18\.22 ⭐/], impl: { ...R, typedView: renderIgnored },
        landed: async () => {
          const id = await phrased();
          const row = await db.smsCampaign.find(id);
          if (row === null) return false;
          const broken = { ...row, bodySw: "50pick: Habari {jina}, karibu.", nameFallbackSw: null } as typeof row;
          const facts = { outreachOpen: true, adult: P_ADULT };
          return !LOADER.composeTypedView(broken, facts).allowed && renderIgnored(broken, facts).allowed;
        },
        landedAs: "the real view refuses the unrenderable text; the plant offers it",
      },
      {
        name: "U37c · the typed preview built for a number",
        expect: [/^§18\.22 ⭐/], impl: { ...R, typedView: previewFromNumber },
        landed: async () => {
          const id = await phrased();
          const row = await db.smsCampaign.find(id);
          if (row === null) return false;
          const facts = { outreachOpen: true, adult: P_ADULT };
          return previewFromNumber(row, facts).preview?.SW !== LOADER.composeTypedView(row, facts).preview?.SW;
        },
        landedAs: "the plant's preview greets Juma with a real-looking token; the real one is the book render",
      },
      {
        name: "U37c · no per-recipient budget",
        expect: [/^§18\.23 ⛔/], impl: { ...R, test: noRecipientBudget },
        landed: async () => {
          const id = await phrased();
          const k = u37bKey();
          const officers = [await u37bTypist(), await u37bTypist()];
          const over = { rateTo: TEST.CAMPAIGN_TEST_DEPS.rateTo, send: u37bSpy().send };
          const results = [];
          for (let i = 0; i < 6; i++) results.push(await noRecipientBudget(typedInput(id, `+${k}`), officers[i % 2].id, typedLanded(over)));
          return results.every((r) => r.ok);
        },
        landedAs: "six typed tests to one number all go through the plant",
      },
      {
        name: "U37c · no officer typed budget — a back-door campaign through tests",
        expect: [/^§18\.23 ⛔/], impl: { ...R, test: noTypedBudget },
        landed: async () => {
          const id = await phrased();
          const o = await u37bTypist();
          const over = { rateTyped: TEST.CAMPAIGN_TEST_DEPS.rateTyped, send: u37bSpy().send };
          const results = [];
          for (let i = 0; i < 11; i++) results.push(await noTypedBudget(typedInput(id, `+${u37bKey()}`), o.id, typedLanded(over)));
          return results.every((r) => r.ok);
        },
        landedAs: "one officer's eleven typed tests all go through the plant",
      },
      {
        name: "U37c · the basis returned to the client",
        expect: [/^§18\.20 ⛔/], impl: { ...R, test: basisReturned },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const planted = await basisReturned(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ send: u37bSpy().send }));
          return planted.ok && "basis" in planted;
        },
        landedAs: "the plant's handed-over result carries a basis",
      },
      {
        name: "U37c · a typed budget spent before the number-independent checks",
        expect: [/^§18\.23 ⛔/], impl: { ...R, test: spentEarly },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          let real = 0;
          let planted = 0;
          await realTest(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ gateReads: DB_GATE_READS, rateTyped: async () => { real++; return ALLOW(); }, rateTo: async () => { real++; return ALLOW(); } }));
          await spentEarly(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ gateReads: DB_GATE_READS, rateTyped: async () => { planted++; return ALLOW(); }, rateTo: async () => { planted++; return ALLOW(); } }));
          return real === 0 && planted === 2;
        },
        landedAs: "with the record closed the real test spends nothing; the plant spends both budgets",
      },
      {
        name: "U37c · the response floor skipped",
        expect: [/^§18\.27 ⛔/], impl: { ...R, test: noFloor },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const waits = (n: number[]) => ({ now: () => new Date(), sleep: async (ms: number) => { n.push(ms); } });
          const real: number[] = [];
          const planted: number[] = [];
          await realTest(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ ...waits(real), send: u37bSpy().send }));
          await noFloor(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ ...waits(planted), send: u37bSpy().send }));
          return real.length === 1 && planted.length === 0;
        },
        landedAs: "the real typed test waits for the floor once; the plant never waits",
      },
      {
        name: "U37c · typed tests skip the live switch",
        expect: [/^§18\.5′/], impl: { ...R, test: typedSkipsSwitch },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          let realAsked = 0;
          let plantAsked = 0;
          const closed = async () => ({ state: "closed", why: "absent" }) as never;
          await realTest(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ liveSwitch: async () => { realAsked++; return closed(); }, send: u37bSpy().send }));
          await typedSkipsSwitch(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ liveSwitch: async () => { plantAsked++; return closed(); }, send: u37bSpy().send }));
          return realAsked === 1 && plantAsked === 0;
        },
        landedAs: "the real typed test reads the switch; the plant never asks it",
      },
      {
        name: "U37c · a token minted before the pre-check",
        expect: [/^§18\.26 ⛔/], impl: { ...R, test: tokenFirst },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const k = u37bKey();
          await tokenFirst(typedInput(id, `+${k}`), o.id, typedLanded({ gateReads: P_WITHDRAWN(k) }));
          return (await tokenCount(k)) === 1;
        },
        landedAs: "a withdrawn number gets a stop link minted by the plant",
      },
      {
        name: "U37c · typed allowed while the record is closed",
        expect: [/^§18\.25 ⛔/], impl: { ...R, test: closedIgnored },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const real = await realTest(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ gateReads: DB_GATE_READS, send: u37bSpy().send }));
          const planted = await closedIgnored(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ gateReads: DB_GATE_READS, send: u37bSpy().send }));
          return !real.ok && real.outcome === "refused" && real.reason === "typed_outreach_closed" && planted.ok;
        },
        landedAs: "with the real record closed the real test is refused up front; the plant's is handed over",
      },
      {
        name: "U37c · the officer's own number, typed, required a confirmation",
        expect: [/^§18\.24 ⭐/], impl: { ...R, test: ownNeedsTick },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const real = await realTest(typedInput(id, `+${o.key}`, false), o.id, typedLanded({ send: u37bSpy().send }));
          const planted = await ownNeedsTick(typedInput(id, `+${o.key}`, false), o.id, typedLanded({ send: u37bSpy().send }));
          return real.ok && !planted.ok;
        },
        landedAs: "the own number typed unticked: sent by the real test, refused by the plant",
      },
      {
        name: "U37c · the typed gate built from a stand-in",
        expect: [/^§18\.14 ⛔/], impl: { ...R, testSendSource: standInGate },
        landed: async () => R.testSendSource.split(GATE_CALL).length === 2 && standInGate !== R.testSendSource,
        landedAs: "the ONE gate's call resolves exactly once in the real source and is swapped in memory",
      },
      {
        name: "U37c review · a number over 40 characters let through",
        expect: [/^§18\.29 ⛔/], impl: { ...R, test: uncappedNumber },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const long = `+${u37bKey()}${" ".repeat(30)}`;
          const real = await realTest(typedInput(id, long), o.id, typedLanded({ send: u37bSpy().send }));
          const planted = await uncappedNumber(typedInput(id, long), o.id, typedLanded({ send: u37bSpy().send }));
          return !real.ok && real.outcome === "refused" && real.reason === "bad_recipient" && planted.ok;
        },
        landedAs: "a 42-character number is refused by the real test and sent by the plant",
      },
      {
        name: "U37c review · a bad number answered with a generic sentence",
        expect: [/^§18\.29 ⛔/], impl: { ...R, test: genericNumber },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          const r = await genericNumber(typedInput(id, "12345"), o.id, typedLanded());
          return !r.ok && r.outcome === "refused" && r.reason === "bad_number" && r.error !== parseTzNumber("12345").reason;
        },
        landedAs: "the plant's bad_number sentence is not the parser's",
      },
      {
        name: "U37c review · OD61 undone — the typed path writes the RG COMPLIANCE row",
        expect: [/^§18\.30 ⛔/], impl: { ...R, test: rgLineWritten },
        landed: async () => {
          const o = await u37bTypist();
          const p = await u37bOfficer();
          await selfExclude(p.id, "24h");
          const id = await phrased();
          const count = async () => { await auditFlush(); return getAuditPage({ category: "COMPLIANCE", limit: 5000 }).filter((e) => e.action === "marketing.suppressed.rg" && e.targetId === p.id).length; };
          const before = await count();
          await rgLineWritten(typedInput(id, `+${p.key}`), o.id, typedLanded({ send: u37bSpy().send }));
          return (await count()) === before + 1;
        },
        landedAs: "a typed test to a self-excluded player leaves an RG row under the plant",
      },
      {
        name: "U37c review · dispatch handed the pre-check's answer instead of asking again",
        expect: [/^§18\.31 ⛔/], impl: { ...R, test: noReask },
        landed: async () => {
          const o = await u37bTypist();
          const id = await phrased();
          let asked = 0;
          const counting = async (m: string) => { asked++; return mayReceiveMarketingSms(m, new Date(), P_READS, { testAttestation: { officerId: o.id, at: new Date().toISOString(), attemptRef: "ta_landedlandedland", wordingVersion: 3 } }); };
          await noReask(typedInput(id, `+${u37bKey()}`), o.id, typedLanded({ gate: counting, send: u37bSpy().send }));
          return asked === 1;
        },
        landedAs: "the plant's hand-over asks the gate once — the send step never asks",
      },
      {
        name: "U13 · M12 · the test send ignores its send window — a test goes out at 03:00",
        expect: [/^§18[.]33 /], impl: { ...R, test: windowIgnored },
        landed: async () => {
          const o = await u37bOfficer();
          const id = await u37bDraft();
          const real = await realTest({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send: u37bSpy().send, window: ALWAYS_CLOSED }));
          const planted = await windowIgnored({ campaignId: id, variant: "SW" }, o.id, landedDeps({ send: u37bSpy().send, window: ALWAYS_CLOSED }));
          return !real.ok && real.outcome === "refused" && real.reason === "held" && planted.ok;
        },
        landedAs: "with the window closed the real test is refused held, and the plant's is handed over",
      },
      {
        name: "U43b-1 · R-S2 · the send step answers a lost reply (TRANSPORT) 'failed' again — the shape before E3, which only the test send's own mapping papered over",
        expect: [/^§18[.]34 /], impl: { ...R, dispatch: transportFailed },
        landed: async () => {
          const o = await u37bOfficer();
          const rows = [{ ref: `cmp_u43b1_landed_${u37bSeq}`, msisdn: o.key, body: "50pick: fixture" }];
          const real = await dispatchSlice(rows, { send: u37bSpy("transport").send, window: ALWAYS_OPEN });
          const planted = await transportFailed(rows, { send: u37bSpy("transport").send, window: ALWAYS_OPEN });
          return real[0]?.outcome === "unconfirmed" && planted[0]?.outcome === "failed";
        },
        landedAs: "the real step answers a lost reply unconfirmed, and the plant's answers it failed",
      },
      {
        name: "U43b-2 review · every failed code said as the network's refusal — a failure before the request claims the network was asked",
        expect: [/^§18[.]35 /], impl: { ...R, test: everyCodeRefused },
        landed: async () => {
          const o = await u37bOfficer();
          const id = await u37bDraft();
          const real = await realTest({ campaignId: id, variant: "SW" } as TestInput, o.id, landedDeps({ send: u37bSpy("unknown").send }));
          const planted = await everyCodeRefused({ campaignId: id, variant: "SW" } as TestInput, o.id, landedDeps({ send: u37bSpy("unknown").send }));
          return !real.ok && !real.error.includes("network refused") && !planted.ok && planted.error.includes("The network refused the message (UNKNOWN)");
        },
        landedAs: "the real test says an UNKNOWN failure couldn't be handed to the network, and the plant's says the network refused it",
      },
      /* ── 2026-10-09 · the owner's ruling: a test to a typed number is for the Owner and Compliance only ── */
      {
        name: "2026-10-09 · the role check removed — a GROWTH officer's typed test sent",
        expect: [/^§18[.]37 ⛔/], impl: { ...R, test: everyoneTypes },
        landed: async () => {
          const g = await u37bOfficer();
          const id = await phrased();
          const real = await realTest(typedInput(id, `+${u37bKey()}`), g.id, typedLanded({ send: u37bSpy().send }));
          const planted = await everyoneTypes(typedInput(id, `+${u37bKey()}`), g.id, typedLanded({ send: u37bSpy().send }));
          return !real.ok && real.outcome === "refused" && real.reason === "typed_role" && planted.ok && planted.target === "typed";
        },
        landedAs: "GROWTH's typed test: refused typed_role by the real door, handed over by the plant",
      },
      {
        name: "2026-10-09 · the browser's word honoured — a role posted beside the recipient taken over the stored one",
        expect: [/^§18[.]37 ⛔/], impl: { ...R, test: postedRole },
        landed: async () => {
          const g = await u37bOfficer();
          const id = await phrased();
          const forged = { ...(typedInput(id, `+${u37bKey()}`) as unknown as Record<string, unknown>), role: "ADMIN" } as unknown as TestInput;
          const real = await realTest(forged, g.id, typedLanded({ send: u37bSpy().send }));
          const planted = await postedRole(forged, g.id, typedLanded({ send: u37bSpy().send }));
          return !real.ok && real.outcome === "refused" && real.reason === "typed_role" && planted.ok;
        },
        landedAs: "a GROWTH post naming role ADMIN: refused by the real door, handed over by the plant",
      },
      {
        name: "2026-10-09 · the role asked only after the typed number is read — a malformed number answered in the plan's words",
        expect: [/^§18[.]37 ⛔/], impl: { ...R, test: roleAfterNumber },
        landed: async () => {
          const g = await u37bOfficer();
          const id = await phrased();
          const real = await realTest(typedInput(id, "12345"), g.id, typedLanded());
          const planted = await roleAfterNumber(typedInput(id, "12345"), g.id, typedLanded());
          return !real.ok && real.outcome === "refused" && real.reason === "typed_role" && !planted.ok && planted.outcome === "refused" && planted.reason === "bad_number";
        },
        landedAs: "GROWTH's malformed number: typed_role from the real door, bad_number (it was parsed) from the plant",
      },
      {
        name: "2026-10-09 · the door's role check removed from its source",
        expect: [/^§18[.]38 ⛔/], impl: { ...R, testSendSource: roleGoneSrc },
        landed: async () => LF_TEST_SRC.split(ROLE_CHECK_SRC).length === 2 && !roleGoneSrc.includes("mayTestTypedNumber(officer?.role)"),
        landedAs: "the role check resolves exactly once in the real source and is cut out in memory",
      },
      {
        name: "2026-10-09 · the door's role check moved below the parse of the typed number",
        expect: [/^§18[.]38 ⛔/], impl: { ...R, testSendSource: roleMovedSrc },
        landed: async () => LF_TEST_SRC.split(ROLE_CHECK_SRC).length === 2 && LF_TEST_SRC.split(PARSED_SRC).length === 2
          && roleMovedSrc.indexOf("mayTestTypedNumber(officer?.role)") > roleMovedSrc.indexOf("parseTzNumber(recipient.number)"),
        landedAs: "in memory the role is asked only after parseTzNumber has read the number",
      },
      {
        name: "2026-10-09 · the loader offers \"Another number\" to every viewer",
        expect: [/^§18[.]39 ⛔/], impl: { ...R, loaderSource: loaderOffersAll },
        landed: async () => R.loaderSource.split(LOADER_DECIDES).length === 2 && loaderOffersAll.includes("const typedOffered = true;"),
        landedAs: "the loader's decision resolves exactly once and is swapped for true in memory",
      },
      {
        name: "2026-10-09 · the loader hands a viewer who may not type the whole typed view (its 18+ words and preview)",
        expect: [/^§18[.]39 ⛔/], impl: { ...R, loaderSource: loaderHandsAll },
        landed: async () => R.loaderSource.split(LOADER_EMPTY).length === 2 && !loaderHandsAll.includes(LOADER_EMPTY),
        landedAs: "the empty view's branch resolves exactly once and is swapped for composeTypedView in memory",
      },
    ];
    for (const p of testPlants) {
      ok(`PLANT LANDED · ${p.name}`, await p.landed(), p.landedAs);
      const failures = await checkTestSend(p.impl, quiet);
      for (const expect of p.expect) {
        ok(`  └─ fires: ${expect.source.slice(0, 56)}`, failures.some((f) => expect.test(f)),
          failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
      }
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
