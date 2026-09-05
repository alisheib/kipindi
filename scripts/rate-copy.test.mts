/**
 * F5 · NO PLAYER-FACING STRING STATES A RATE IT CANNOT READ — the guard that keeps the
 * rest of this programme from rotting.
 *
 *   npx tsx scripts/rate-copy.test.mts     (npm run test:rate-copy)
 *
 * ⛔ THE METHOD, from the work order §F5: any label that states a rate must either READ it
 * from config or POINT AT `docs/RULES.md` — never restate a number inline. A number written
 * twice is a number that will disagree with itself, and this session found three that had:
 *
 *   · `estimateHowItWorks` hardcoded **"1.5×"** while Up & Down runs **1.4×**, so the hint
 *     explaining the figure quoted a different figure from the button beside it;
 *   · `/legal/terms` §4 stated the retired capped-commission rule in ALL THREE languages,
 *     and §5 stated the withdrawal fee as **1%** when production has charged **1.5%**;
 *   · the in-app assistant's system prompt taught customers the retired rule, a "base TZS
 *     500" stake and a "1x-200x multiplier", and would have stated all of it confidently.
 *
 *   §1  ★ no player-facing dictionary string hardcodes a rate figure
 *   §2  ★ POSITIVE CONTROL, same run — the scanner CATCHES the exact strings F2 fixed,
 *       so a green §1 means the copy is clean rather than that the scanner is blind
 *   §3  the legal terms page and the assistant prompt state the CURRENT rule
 *   §4  `docs/RULES.md` §7's known-duplicates table lists every inline rate that remains
 *
 * ⚠️ IT SCANS COPY, NOT CODE. A rate in a `.ts` constant is the source of truth and must
 * NOT be flagged; a rate inside a STRING a player reads is the defect. The dictionary is
 * the boundary between the two, which is why the scan is anchored there.
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import { dict } from "../src/lib/i18n-dict.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

/**
 * A rate figure stated inline. Deliberately narrow: it must not fire on ordinary numbers
 * (a phone number, "18+", "60 seconds", a TZS amount) or the guard becomes noise nobody
 * reads. What it catches is a PERCENTAGE or a MULTIPLE — the two shapes every rate in this
 * product takes.
 *
 * ⛔ `{pct}%` and `{mult}×` are INTERPOLATED and are exactly what the method asks for, so
 * a placeholder immediately before the unit is never a hit.
 */
const RATE_PATTERNS: Array<{ re: RegExp; what: string }> = [
  { re: /(?<!\{)\b\d{1,3}(?:\.\d+)?\s*%/g, what: "a percentage" },
  // ⚠️ NO TRAILING `\b`. "1.5× your stake" has a NON-word character on both sides of the
  // boundary after "×", so `\b` never matches and the pattern missed the single string this
  // guard was written to catch. Assert on what follows instead.
  { re: /(?<!\{)\b\d{1,3}(?:\.\d+)?\s*[×x](?![\w])/gi, what: "a multiple" },
  { re: /\bthird of the (?:smaller side|pool)\b/gi, what: "the retired ceiling, in words" },
  { re: /\btheluthi moja ya upande mdogo\b/gi, what: "the retired ceiling, in Swahili" },
  /**
   * ⭐ THE OBJECTION WINDOW, ADDED 2026-09-05 — and it is NUMBER-AGNOSTIC on purpose.
   *
   * Management moved it from 24 hours to 1, and the sweep found the figure written out in nine
   * dictionary strings across three locales plus the live chatbot's system prompt. A guard that
   * banned the literal "24" would go green the moment someone typed "1 hour" instead, which is
   * the same defect wearing the new number. So this matches ANY digit next to an hour word next
   * to an objection word, and the copy is expected to carry `{hours}` and let the render site
   * fill it from `objectionWindowHours`.
   *
   * ⛔ SCOPED BY THE OBJECTION WORD, NOT BY THE HOURS. The dictionary is full of legitimate
   * 24-hour statements that must NOT trip this: the AML review hold on large withdrawals, the
   * email-link expiry, the responsible-gambling cooling-off durations, the "Last 24 hours"
   * range picker. Only a number standing next to the word for an objection is a restatement of
   * this setting. The three languages are matched in one alternation so a translation cannot
   * quietly fall outside the rule.
   */
  /**
   * ⚠️ THE QUANTITY MATCHES IN BOTH ORDERS, and the Swahili control is why. English and Chinese
   * put the number first ("24 hours", "24小时"); Swahili puts the UNIT first — "masaa 24". The
   * first draft only knew `number-then-unit`, so it caught the English and Chinese strings and
   * silently passed the Swahili one, which is exactly the shape of a guard that protects two of
   * three locales and reports full coverage.
   */
  {
    re: /(?:(?:\d{1,3}\s*-?\s*(?:h\b|hours?|小时)|(?:saa|masaa)\s*\d{1,3})[^.!?]{0,40}?(?:objection|pingamizi|异议)|(?:objection|pingamizi|异议)[^.!?]{0,40}?(?:\d{1,3}\s*-?\s*(?:h\b|hours?|小时)|(?:saa|masaa)\s*\d{1,3}))/gi,
    what: "the objection window, stated as a number instead of {hours}",
  },
];

/**
 * Strings that legitimately carry a figure which is NOT a rate. Each needs a reason, and
 * the list may only shrink — that is what stops it becoming a place to hide a defect.
 */
const ALLOWED = new Set<string>([
  // Age gate — a legal statement, not a rate.
  "ageGate", "age18", "eighteenPlus",
]);

function scanStrings(node: unknown, path: string, hits: Array<{ key: string; text: string; what: string }>): void {
  if (typeof node === "string") {
    const key = path.split(".").pop() ?? path;
    if (ALLOWED.has(key)) return;
    for (const { re, what } of RATE_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(node)) { hits.push({ key: path, text: node.slice(0, 110), what }); return; }
    }
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) scanStrings(v, path ? `${path}.${k}` : k, hits);
  }
}

// ── §1 · the dictionary ──────────────────────────────────────────────────────
console.log("\n§1 · no player-facing string states a rate it cannot read");
{
  for (const loc of ["en", "sw", "zh"] as const) {
    const hits: Array<{ key: string; text: string; what: string }> = [];
    scanStrings(dict[loc], "", hits);
    ok(`1.${loc} · clean`, hits.length === 0,
       hits.map((h) => `${h.key} (${h.what}): "${h.text}"`).join("  ·  "));
  }
}

// ── §1b · the interpolated value already carries its unit ───────────────────
/**
 * 🔴 THIS SHIPPED, AND FOR ABOUT TEN MINUTES THE CHINESE HELP PAGE READ "1 小时小时内".
 *
 * `durationHours()` returns a COMPLETE phrase — "1 hour", "saa 1", "1小时" — so a copy string
 * that keeps its own unit beside `{hours}` prints the unit twice. The English and Swahili
 * strings had their units removed in the same edit; the Chinese one did not, because its unit
 * is two characters wedged between escaped code points and the eye slides straight over it.
 *
 * ⛔ NEITHER §1 NOR `test:i18n` COULD SEE IT. §1 hunts for a NUMBER stated inline and there is
 * no number here — the defect is a duplicated WORD. Placeholder parity was satisfied: all three
 * locales carried `{hours}`, exactly once. The strings were individually well-formed and the
 * composition was wrong, which is the shape a per-string scanner is blind to by construction.
 */
console.log("\n§1b · no string states an hour unit that {hours} already supplies");
{
  // Immediately before or after the placeholder, allowing one space (and the Swahili form,
  // where the unit legitimately PRECEDES the number in the phrase the helper builds).
  const DOUBLED = /(?:(?:hours?|小时|saa|masaa)\s*\{hours\}|\{hours\}\s*(?:hours?|小时|saa|masaa))/i;
  for (const loc of ["en", "sw", "zh"] as const) {
    const bad: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (typeof node === "string") {
        if (node.includes("{hours}") && DOUBLED.test(node)) bad.push(`${path}: "${node.slice(0, 90)}"`);
        return;
      }
      if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, path ? `${path}.${k}` : k);
      }
    };
    walk(dict[loc], "");
    ok(`1b.${loc} · no doubled unit beside {hours}`, bad.length === 0, bad.join("  ·  "));
  }
  // ⭐ POSITIVE CONTROL, same run — the exact string that shipped, in the locale it shipped in.
  const SHIPPED = "{hours}小时内的结算修正将被尊重";
  ok("1b.control · ★ the scanner catches the string that actually shipped", DOUBLED.test(SHIPPED),
     "if this fails the check above is green because it inspects nothing");
  ok("1b.control · ★ …and accepts the corrected form", !DOUBLED.test("{hours}内的结算修正将被尊重"), "");
}

// ── §2 · POSITIVE CONTROL — the scanner can say no ──────────────────────────
console.log("\n§2 · the scanner catches what F2 actually fixed");
{
  // Verbatim, as they stood before 2026-08-14.
  const BEFORE: Array<[string, string]> = [
    ["estimateHowItWorks", "A rough guide (1.5× your stake). Your real winnings come from the pool."],
    ["card3Body", "after our commission — which is capped at a third of the smaller side, so being right never costs you money."],
    ["howStep3B", "minus a commission capped at a third of the smaller side."],
    ["swCeiling", "kamisheni ambayo haizidi theluthi moja ya upande mdogo."],
    ["withdrawFee", "A withdrawal is charged a 1% fee, and nothing else."],
    // ⭐ The objection window, in all three languages, exactly as they read before 2026-09-05.
    ["fairnessIntro", "A 24-hour public objection window opens after resolution."],
    ["fairnessSw", "Dirisha la pingamizi la masaa 24 linafunguliwa baada ya utatuzi."],
    ["fairnessZh", "结算后开放24小时公开异议窗口。"],
    // ⛔ AND THE NEW NUMBER MUST TRIP IT TOO. A guard that only knew "24" would go green the
    // moment someone typed the replacement, which is the same defect wearing today's figure.
    ["fairnessOneHour", "A 1-hour public objection window opens after resolution."],
  ];
  for (const [key, text] of BEFORE) {
    const hits: Array<{ key: string; text: string; what: string }> = [];
    scanStrings({ [key]: text }, "", hits);
    ok(`2.${key} · ★ REJECTED`, hits.length > 0, hits[0]?.what ?? "NOT CAUGHT");
  }
  // ⭐ AND THE SCANNER MUST ACCEPT THE FIXES, or §1 is passing by rejecting nothing.
  const AFTER: Array<[string, string]> = [
    ["estimateHowItWorks", "A rough guide ({mult}× your stake). Your real winnings come from the pool."],
    ["card3Body", "Our commission comes only out of the losing side — the winners' stakes are returned in full."],
    ["feePct", "our {pct}% commission applies"],
    ["fairnessIntro", "A public objection window of {hours} hour(s) opens after resolution."],
    /**
     * ⛔ THE NEGATIVE CONTROLS THAT KEEP THIS PATTERN HONEST. The dictionary is full of
     * legitimate 24-hour statements, and a guard scoped to "hours" alone would condemn every
     * one of them — then be widened by the next session until it caught nothing. Each of these
     * is a REAL string from the product, and none is a restatement of the objection window.
     */
    ["amlHold", "Amounts ≥ TZS 1,000,000 may require AML review (up to 24 hours)."],
    ["emailExpiry", "Check your inbox and click the link. The link expires in 24 hours."],
    ["rgLimits", "Decreases take effect immediately. Increases deferred 24 hours."],
    ["rangePicker", "Last 24 hours"],
    ["coolOff", "Take a break (cooling-off): 1 hour, 24 hours, or 1 week."],
  ];
  for (const [key, text] of AFTER) {
    const hits: Array<{ key: string; text: string; what: string }> = [];
    scanStrings({ [key]: text }, "", hits);
    ok(`2.${key} · ACCEPTED — the interpolated form is the method, not a workaround`, hits.length === 0,
       hits.map((h) => h.what).join(", "));
  }
}

// ── §3 · the legal document and the assistant ───────────────────────────────
console.log("\n§3 · the two surfaces that state the rule in prose");
{
  const terms = readFileSync(new URL("../src/app/legal/terms/page.tsx", import.meta.url), "utf8");
  ok("3.1 · ★ /legal/terms no longer states the retired ceiling, in ANY language",
     !/third of the smaller side|theluthi moja ya upande mdogo|较小一方的三分之一/.test(terms), "");
  ok("3.2 · ★ …and it states 13% of the LOSING side, in all three",
     (terms.match(/13%/g) ?? []).length >= 3, `${(terms.match(/13%/g) ?? []).length} occurrences`);
  ok("3.3 · ★ …and the withdrawal fee is 1.5%, in all three — production has charged 1.5% all along",
     (terms.match(/1\.5%/g) ?? []).length >= 3 && !/\b1% (fee|手续费)|ada ya 1%/.test(terms),
     `${(terms.match(/1\.5%/g) ?? []).length} occurrences`);

  const chat = readFileSync(new URL("../src/app/_actions/chat.ts", import.meta.url), "utf8");
  ok("3.4 · ★ the assistant no longer teaches the retired fee rule",
     !/10% of the pool|third of the smaller side/.test(chat), "");
  ok("3.5 · ★ …nor the retired 'base TZS 500' stake or the '1x-200x multiplier'",
     !/base TZS 500|1x-200x/.test(chat), "");
  ok("3.6 · ★ …and it states 13% of the losing side and the 1.5% withdrawal fee",
     /13% OF THE LOSING SIDE/i.test(chat) && /1\.5% fee/.test(chat), "");
  // ⛔ AND IT STATES THE STAKE RULE THE PLATFORM ACTUALLY ENFORCES, including the part that
  // is easiest to get wrong: the maximum is PER BET and does not bound total exposure.
  ok("3.7 · ★ …and it says the maximum is PER BET, not a cap on total exposure",
     /PER BET/.test(chat) && /does NOT limit their total exposure/i.test(chat), "");

  /**
   * ⭐ §3b · THE OBJECTION WINDOW, ON THE TWO SURFACES THAT STATE IT IN PROSE — added 2026-09-05.
   *
   * 🔴 THE CHAT PROMPT WAS THE WORST MISS OF THE WHOLE SWEEP and is why this section exists.
   * §1 scans the DICTIONARY; the assistant's system prompt is not in the dictionary, and it
   * said "24h objection window" as a flat literal. So the platform's own assistant would have
   * gone on telling players the old number, on demand, about their own money, while every
   * dictionary check stayed green.
   *
   * ⛔ Both surfaces must INTERPOLATE. The terms page reads `objectionHours` from live config;
   * the prompt takes it as a parameter. Neither may carry the figure.
   */
  /**
   * ⚠️ IT COUNTS, IT DOES NOT MERELY LOOK — and `red:rate-copy` is what proved the difference.
   * The first version asked whether `{objectionHours}` appeared ANYWHERE in the file. It does,
   * three times, so putting the ENGLISH clause back to a flat 24 hours left the check green:
   * the two other locales carried it. A presence test over a three-locale document cannot tell
   * "all three interpolate" from "one still does".
   */
  const interpolations = (terms.match(/\{objectionHours\}/g) ?? []).length;
  ok("3b.1 · ★ /legal/terms interpolates the objection window in ALL THREE locales",
     interpolations >= 3, `${interpolations} occurrences — §6's void ground must track the live setting in every language`);
  ok("3b.2 · ★ …and reads it from the live config, not a literal",
     /getGlobalConfig\(\)/.test(terms) && /objectionWindowHours/.test(terms), "");
  ok("3b.3 · ★ the assistant's system prompt takes the window as a parameter",
     /objectionHours: number/.test(chat) && /\$\{objectionHours\}/.test(chat),
     "a literal here is a wrong answer delivered on demand");
  /**
   * ⛔ READS THE CODE, NOT THE COMMENTS — and it went red on its first run for exactly the
   * reason this project keeps re-learning. The phrase only survives in the note EXPLAINING
   * that it was removed, so a whole-file scan condemned the fix's own documentation. Same
   * shape as anchoring a handoff on the words "RESUME AT" in a paragraph about the words
   * "RESUME AT". A guard must never be locatable by text its own record will one day contain.
   */
  const chatCode = decomment(chat);
  ok("3b.4 · ★ …and no longer claims two-officer sign-off as the default",
     !/two-officer sign-off/.test(chatCode),
     "single-admin has been the recorded default since 2026-07-24");
  ok("3b.4b · ★ CONTROL · decomment kept the prompt itself, so 3b.4 is not green on an empty string",
     /objection window/i.test(chatCode) && chatCode.length > 1_500, `${chatCode.length}B after decomment`);
  // ⭐ POSITIVE CONTROL, same run: the checks above are refusals, and a refusal is green on a
  // deleted file. Prove both surfaces were actually read and still say what they should.
  ok("3b.5 · ★ CONTROL · both files were really read and still describe the window",
     /objection window/i.test(terms + chat) && terms.length > 2_000 && chat.length > 2_000,
     `terms ${terms.length}B, chat ${chat.length}B`);
}

// ── §4 · the known-duplicates table ─────────────────────────────────────────
console.log("\n§4 · docs/RULES.md §7");
{
  const rules = readFileSync(new URL("../docs/RULES.md", import.meta.url), "utf8");
  ok("4.1 · RULES.md §7 exists", /## §7 · KNOWN DUPLICATES/.test(rules), "");
  // ⚠️ The table is allowed to be EMPTY — that is the goal state, and it is where the sweep
  // landed. What it may not be is ABSENT, or stating that the guard does not exist when it
  // does: a table maintained by hand with no guard behind it is what §7's own note warned of.
  ok("4.2 · ★ …and it no longer says the guard is unwritten",
     !/is \*\*workstream F5 and is not yet written\*\*/.test(rules), "");
}

console.log(`\nrate-copy: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
