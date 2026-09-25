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
 * ⛔ IN-PROCESS BY CONSTRUCTION — `--prove-red` plants each defect IN MEMORY and requires the
 * MATCHING assertion to fire. No file-writing call, so it stays outside `test:red-anchors` §4.
 *
 * Run: `npm run test:campaign-compose` · Red: `npm run red:campaign-compose`
 */
import {
  sizeSms, planSms, encodingFor, offendingChars,
  GSM7_BASIC, GSM7_EXTENDED, SMS_LIMITS, SMS_MAX_SEGMENTS,
  SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER,
  type SmsSize,
} from "../src/lib/sms-compose.ts";
import { smsCodingFor } from "../src/lib/server/sms-blackball.ts";

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

/* ══ THE RUN ════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  const failed = check(sizeSms, (l) => console.log(l));
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

  const baseline = check(sizeSms, quiet);
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
