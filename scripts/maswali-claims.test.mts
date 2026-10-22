/**
 * test:maswali-claims — WHAT 50PICK MAY SAY ABOUT MILLIONEA (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 3, MB-47, MB-88,
 * OD-25, OD-30, R-HEADLINE; the lane-N review's HIGH 1 and MEDIUM 6; the round-3 claims review, B1–B6).
 *
 *   npm run test:maswali-claims        (the memory twin, no database: §4 drives the save, the test send and an engine slice
 *                                       on it; MB-47 names it `test:millionea-claims`, the S6 suite list
 *                                       `test:maswali-claims` — one suite, this name)
 *
 * 🔴 MB-47: the SMS composer sent text as typed, so "Shinda TZS 1,000,000 kwa TZS 1,000!" could go out — false three ways.
 * 🔴 HIGH 1 (review round 2): the first lint read a text only when it NAMED Millionea, raw — so leaving the name out, or
 *    writing "Millionea2026", "Millionéa" or "Mamilionea", passed it; the composer never handed it the week's fee; and
 *    nothing refused a campaign while Millionea was not open. ⭐ A campaign now DECLARES its product: its name begins with
 *    "Millionea" (`campaignProductOf`).
 * 🔴 Round 3 (B1–B6): ordinary campaigns were refused as Millionea's (B3, B5), forms of a claim and of the product's words
 *    escaped (B4, B6), the officer's word for {jina} was never judged (B2), and the §6 census went red (B1). Each fix has
 *    cases below that fail on the round-2 code (§1's new controls, §2.8's new phrases, §2.13, §4's word-for-{jina} cases);
 *    §6.2 is re-pinned to the files that name Millionea, and 6.2c reads every line that does.
 * 🔴 Round 4 (the independent review of round 3's head, the lead's rulings 1–6): ordinary campaigns were refused as Millionea's,
 *    and claims escaped — §1's new controls, the re-pinned SEEN texts, §2.14 and §2.8's last phrase fail on the round-3
 *    code. ⭐ And THE ROLLOUT (§4.8): a classic campaign sending since before the rules first ran is flagged, never paused.
 * 🔴 Round 5 (the independent review of round 4's head; the lead's decisions HIGH 3 and MEDIUM 7b): claims the lint missed, and
 *    ordinary campaigns it refused — §1's round-5 controls and SEEN texts, §2.8c, §2.15 and §2.16 fail on the round-4
 *    code. §4.8 holds a campaign named as Millionea's to the rules whenever it started, reads a classic one by its start,
 *    stamps the process's start, waits on an unread stamp, and proves what binds a sending campaign on that campaign
 *    itself; §6.2c pins each door's lines.
 * 🔴 Round 6 (the independent review of round 5's head): §2.18–§2.21's claims (but §2.21's last two, which pin what stays
 *    refused) and §1's round-6 notices (but the controls marked otherwise) fail on the round-5 code.
 * 🔴 Round 17 (the independent review of rounds 13–16; the lead's rulings H2, H3, M3, M4, L2, L3, L4): §7 holds every
 *    sentence of that review's report and of its probes to the review's own verdict, and each ruling's forms beside their
 *    controls — every §7 check but its held sentences and its controls fails on the round-16 lint. Each rule's own defect
 *    is put back by `red:maswali-claims` (`scripts/anchors/maswali-claims.anchors.mjs`).
 * 🔴 S6-LINT (the lead's ruling 6 and its accepted corrections; the lint review after round 17, findings 1–8 and 10–13):
 *    the untagged rules shipped in the composer's browser bundle and ran for every campaign — §9 holds them the server's
 *    alone (S6-LINT 1); each later S6-LINT commit adds its own §9 cases, every one red on the code before it.
 *   §1 ⭐ CONTROL FIRST: an untagged campaign with no Millionea signal is not read — it composes exactly as before — and
 *      the reader does see every spelling it is for
 *   §2 ⭐ the review's texts, every one red: refused untagged ("tag it Millionea or reword it") AND tagged (each claim
 *      family, the facts, the week's fee); MEDIUM 6's three now say why; the normal form (case, accents, invisible
 *      characters, digit runs, look-alikes); the tag; each family alone; the server's part; a sentence never quotes a figure
 *   §3 the approved wordings: filled from a rate (never typed), one GSM-7 message, clean as a Millionea campaign while it is
 *      open, refused untagged; the facts in the R-HEADLINE's own words (the dictionary's `millionea.ruleShared`)
 *   §4 ⭐ the doors: the screen and the save's verdict; a send's render (the facts its door attached, none attached refused);
 *      a recipient's own name never judged; THE SAVE (the week read on the server); THE TEST SEND; THE REAL SEND (an engine
 *      slice) — each refuses in the rule's own words and passes an approved wording while Millionea is open; the wiring
 *   §5 MB-47's list: no gold but on the paid win, no count-up on a Millionea surface, no "first" in anything Millionea says
 *   §6 holders only (OD-25): every registered notice goes to a ticket's holder, the one SMS that names Millionea in code is
 *      the winner's service SMS — no link, its amount — and anything else about Millionea is a campaign, past the consent
 *      gate (the engine's)
 *   §7 ⭐ round 17: 7.0 what the review found right at round 16, held · 7.1 H2 a payment by 50pick, read by its parties ·
 *      7.2 H3 an account fact stated, never a lure · 7.3 M3 MB-47's stake against a prize, the winnings words, a question of
 *      any length · 7.4 M4 a deposit in any form, a third person's wait, "mfuko" as a fund · 7.5 L2 the comments · 7.6 L3 a
 *      look-alike leading one · 7.7 L4 a body in Chinese characters (OD42)
 *   §9 ⭐ S6-LINT: 9.1 the untagged rules are the server's alone — neither the composer's client graph nor any other client
 *      module's reaches them · 9.2 the live counter judges a campaign not tagged Millionea exactly as before, the save holds
 *      it to them · 9.3 the wiring (every server door hands them in)
 * Each refusal is shown beside a text that passes, so no check here can pass by being blind. ⛔ §1–§4 hold no backslash
 * (an editing tool decodes them): patterns are character classes and characters are built from their codes.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.SESSION_SECRET ??= "maswali-claims-session-secret-0123456789abcdef";
// ⛔ The memory twin, whatever the shell exports — and the console provider: no SMS can leave this suite.
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
process.env.SMS_PROVIDER = "console";

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const claims = await import("../src/lib/marketing/millionea-claims.ts");
// ⭐ S6-LINT 1 · the untagged rules: the server's alone, handed in by a server door.
const UNT = await import("../src/lib/server/marketing/millionea-untagged.ts");
const { composeMarketing, footerMeasurementToken } = await import("../src/lib/marketing/footer.ts");
const { validateCampaignTemplate, renderForRecipient } = await import("../src/lib/marketing/campaign-template.ts");
const { sizeSms } = await import("../src/lib/sms-compose.ts");
const { dict } = await import("../src/lib/i18n-dict.ts");
const { EMAIL_TEMPLATES, DUAL_CHROME_TEMPLATES, MILLIONEA_NOTICES } = await import("../src/lib/server/comms-registry.ts");
const email = await import("../src/lib/server/email.ts");
const { winnerSmsBody } = await import("../src/lib/server/maswali-winner-sms.ts");
const { formatTzs } = await import("../src/lib/utils.ts");
const { eatIsoWeek, eatWeekCode, eatWeekNumberOf } = await import("../src/lib/eat-day.ts");
const { db } = await import("../src/lib/server/store.ts");
const DRAFT = await import("../src/lib/server/marketing/campaign-draft.ts");
const TEST = await import("../src/lib/server/marketing/campaign-test-send.ts");
const ENGINE = await import("../src/lib/server/marketing/engine.ts");
const MKT = await import("../src/lib/server/maswali-marketing.ts");
const LINT = await import("../src/lib/server/marketing/millionea-lint-epoch.ts");
const LIVE = await import("../src/lib/server/marketing/campaign-live.ts");
const LOADER = await import("../src/app/admin/campaigns/new/composer-loader.ts");
const W = await import("./marketing-engine/engine-world.mts");
// U13 · a suite that drives a send path hands it a FIXED window (`test:marketing-window` W6).
const { ALWAYS_OPEN } = await import("./lib/send-window.mts");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const cc = (...codes: number[]) => String.fromCharCode(...codes);
const TOKEN = footerMeasurementToken();
const RATE = 0.13;
const PCT = claims.feePctOf(RATE);
/** The week as a server door reads it while Millionea is open: its fee, and open. */
const OPEN = { feeRate: RATE, live: true };
/** A Millionea campaign at a server door (the save, the test send, the send) — and at the composer's counter (no week). */
const TAGGED = { product: "MILLIONEA" as const, facts: OPEN };
const SCREEN = { product: "MILLIONEA" as const };
/** ⭐ S6-LINT 1 · a campaign NOT tagged Millionea at a server door: the untagged rules handed in (the screen hands in none). */
const SERVER_UNTAGGED = { product: null, untagged: UNT.untaggedCampaignProblems };
/** …as the save hands them to the one verdict, and as a send's or a preview's template carries them. */
const SAVE_RULES = { untagged: UNT.untaggedCampaignProblems };
const SEND_RULES = { untaggedRules: UNT.untaggedCampaignProblems };
const fill = (t: string, rate: number) => claims.fillMillioneaWording(t, rate);
const SW1 = fill(claims.MILLIONEA_WORDINGS.SW[0], RATE);
const EN1 = fill(claims.MILLIONEA_WORDINGS.EN[0], RATE);
/** The review's "{facts}": the headline's three facts and nothing else, at the week's fee. */
const FACTS = `50pick: Millionea. Jackpot inagawanywa sawa kwa kila tiketi ya 10/10; ada ${PCT}% wakati wa malipo.`;
const MISSING = "carries its headline's three facts";
const untagged = (p: string) => p.startsWith(UNT.MILLIONEA_UNTAGGED);
const isMillioneaSentence = (p: string) => untagged(p) || p.startsWith("A Millionea campaign") || p.startsWith("This message states a")
  || p === claims.MILLIONEA_NOT_LIVE || p === claims.MILLIONEA_FACTS_UNREAD;
const millioneaIn = (list: readonly string[] | undefined) => (list ?? []).filter(isMillioneaSentence);
/** Which families a text trips, read back from the sentences (each carries its family's own `why`). */
const familiesOf = (problems: readonly string[]) =>
  claims.MILLIONEA_CLAIM_FAMILIES.filter((f) => problems.some((p) => p.includes(f.why))).map((f) => f.family);
/** Through the composer's ONE door: as a campaign with no product at a server door (the untagged rules handed in —
 *  S6-LINT 1), and as one with the context given. */
const plain = (text: string, locale: "SW" | "EN" = "SW") => composeMarketing(text, TOKEN, locale, "", SERVER_UNTAGGED);
const as = (text: string, ctx: any, locale: "SW" | "EN" = "SW") => composeMarketing(text, TOKEN, locale, "", ctx);

// ── §1 · the control: an untagged campaign with no Millionea signal is not read ───────────────────────────────────
console.log(`${LF}§1 · CONTROL — an untagged campaign with no Millionea signal is not read`);
{
  const CONTROL = [
    "50pick: Habari {jina}, soka leo.",
    "50pick: Je, Simba watashinda derby leo? Weka utabiri wako.",
    "50pick: Who will win the derby tonight? Make your call.",
    "50pick: Bitcoin above 100,000 by Friday? Tell us in the app.",
    "50pick: Wiki hii, maswali ya soka na uchumi. Karibu.",
    "50pick: The million-dollar question: will it rain in Dar today?",
    "50pick: Wa kwanza kutabiri? Uhakika ni nafasi yako leo.",
    "50pick: Ofa ya TZS 50,000 kwa wateja wapya wa 2026.",
    "50pick: Mechi ya 10/10/2026 saa 1 usiku. Piga 0712 345 678.",
    "50pick: Support: +255 712 345 678 or 0712345678.",
    "50pick: Habari! Mambo makubwa yanakuja hivi karibuni, na kilichofichwa kitafichuka. Kaa nasi, hutataka kukosa!",
    "50pick: Hello! Big things are coming soon, and what's hidden will be revealed. Stay tuned, you won't want to miss it!",
    "50pick: Habari WWWWWWWWWWWW, mechi kubwa leo.",
    // ⭐ Round 3 (B3 · B5) · ordinary campaigns.
    "50pick: Weka TZS 5,000 M-Pesa leo.",
    "50pick: Lipa 1000 M-Pesa leo.",
    "50pick: Huduma 24/7 M-Pesa.",
    "50pick: Mbio za 100m Jumamosi.",
    "50pick: Lipa Namba 5123456 kwa malipo.",
    "50pick: Piga 712345678 sasa.",
    "50pick: Mechi ya 10/10 saa 1 usiku.",
    "50pick: Kenya? Piga +254 712 345 678.",
    // ⭐ Round 4 (rulings 1–5) · ordinary campaigns.
    "50pick: Video yetu ina 5,000 views!",
    "50pick: Video yetu ina 1,500,000 views!",
    "50pick: Weka TZS 5,000 M Pesa leo.",
    "50pick: Weka Tsh 2000 M.Pesa leo.",
    "50pick: Lipa TZS 500 MPesa.",
    "50pick: Lipa Namba 5566778 Tsh 2000 leo.",
    "50pick: Leo 10/10, Simba dhidi ya Yanga.",
    "50pick: Jumamosi 10/10 Derby ya Kariakoo.",
    "50pick: Sat 10/10 kickoff 19:00.",
    "50pick: Lipa Namba 5 123 456 kwa malipo.",
    "50pick: Piga 254 712 345 678 sasa.",
    "50pick: Over a million are playing this season.",
    // ⭐ Round 5 (HIGH 1, MEDIUM 6 and 7 — the lead's decision 7b — and LOW 15) · ordinary campaigns: every one but the first
    // two was refused by the round-4 code.
    "50pick: Weka TZS 5,000 M Pesa leo ushinde zawadi!",
    "50pick: Je, Simba watashinda Jumamosi 10/10?",
    "50pick: Video yetu imepata 1M views!",
    "50pick: Simba watamsajili kwa zaidi ya TZS 500,000,000?",
    "50pick: Sasa unaweza kutoa hadi TZS 5,000,000 kwa siku.",
    "50pick: Ofa ya 1m TZS kwa wateja.",
    "50pick: Simba imepata mdhamini wa TZS 1,000,000,000.",
    "50pick: Mshindi wa ligi atapata kombe. Bajeti ya TZS 5,000,000 imetengwa.",
    "50pick: Tarehe: 10/10, Simba dhidi ya Yanga.",
    "50pick: Jumamosi hii 10/10 Derby ya Kariakoo.",
    "50pick: Date 10/10, the derby.",
    "50pick: Ofa kuanzia 10/10 hadi 20/10.",
    // ⭐ Round 6 (M3) · ordinary notices: every one but the last two was refused by the round-5 code.
    "50pick: Toa hadi TZS 5,000,000 kwa siku bila kusubiri.",
    "50pick: Toa hadi TZS 5,000,000 kwa siku papo hapo, bila kungoja.",
    "50pick: Weka hadi TZS 5,000,000 kwa siku - chaguo ni lako.",
    "50pick: Deposit up to TZS 5,000,000 a day - the choice is yours.",
    "50pick: Pesa yako ni yako: toa hadi TZS 5,000,000 kwa siku.",
    "50pick: We got 1,000,000+ downloads!",
    "50pick: Usisubiri! Weka TZS 1,000,000 sasa, usisubiri.",
    "50pick: Withdraw up to TZS 5,000,000 a day, no waiting!",
    "50pick: Weka hadi TZS 5,000,000 kwa siku. Chaguo ni lako.",
    // ⭐ Round 6 (M5, the lead's decision) · ordinary campaigns.
    "50pick: Toa hadi TZS 5,000,000 kwa siku.",
    "50pick: Kutoa hadi TZS 5,000,000 kwa siku ni bure.",
    "50pick: Weka hadi TZS 5,000,000 kwa siku.",
    // ⭐ Round 6 (M4) · ordinary campaigns.
    "50pick: Millions of fans are watching the derby.",
    "50pick: Mbio za 5k Jumamosi.",
    // ⭐ Round 6 (L3) · ordinary campaigns, each refused by the round-5 code.
    "50pick: Ofa hii ni halali hadi 10/10.",
    "50pick: Offer valid until 10/10.",
    "50pick: Join us on 10/10 for the derby.",
    "50pick: Simba vs Yanga, 10/10.",
    "50pick: Weka kabla ya 10/10 upate bonasi.",
    "50pick: Video yetu imepata watazamaji milioni 1!",
    "50pick: Zaidi ya watu milioni 2 wanatumia 50pick.",
    // ⭐ Rounds 7 and 8 (the lead's rulings on limits) · ordinary campaigns — the second to fifth refused by the round-7 code.
    "50pick: Toa hadi TZS 5,000,000 kila siku.",
    "50pick: Kikomo kipya: TZS 5,000,000 kwa siku. Washindi wote wanalipwa papo hapo.",
    "50pick: You can withdraw up to TZS 5,000,000 a day.",
    "50pick: Bei ya tiketi ni TZS 1,000,000 kwa VIP.",
    "50pick: Next season Simba will spend TZS 2,000,000,000 on players.",
    "50pick: What's next for Simba after the TZS 1,000,000,000 sponsorship?",
    "50pick: Usisubiri foleni: amana ya TZS 1,000,000 inaingia papo hapo.",
    "50pick: Over 1,000,000 tickets sold this season!",
    "50pick: Tiketi 1,000,000 zimeuzwa msimu huu!",
    "50pick: Pata 0712345678 kwenye WhatsApp kwa msaada.",
    "50pick: Unajua Samatta analipwa TZS 50,000,000 kwa wiki?",
    "50pick: Did you know Samatta is paid TZS 50,000,000 a week?",
    "50pick: Asante! Michango yenu imefikia TZS 2,000,000 kwa ajili ya hospitali.",
    "50pick: Did you know Simba signed a striker for TZS 1,000,000,000?",
    "50pick: Je, unajua kwamba Simba ilisajili mchezaji kwa TZS 1,000,000,000?",
    "50pick: Mchango wa TZS 5,000,000 umetolewa kwa hospitali ya Amana.",
    "50pick: Mkataba wa udhamini wa TZS 2,000,000,000 umesainiwa leo.",
    "50pick: Sasa unaweza kuwa na hadi TZS 10,000,000 kwenye pochi yako.",
    "50pick: Simba imesajili mchezaji kwa TZS 1,000,000,000 - unadhani atafunga?",
    "50pick: Tunasubiri derby: uwanja wa TZS 10,000,000,000 umekamilika.",
    "50pick: Ulinzi wa akaunti yako: amana hadi TZS 5,000,000 zinalindwa.",
    "50pick: Usajili wa TZS 1,500,000,000 umekamilika.",
    "50pick: Usajili wa TZS 1,500,000,000: unadhani Simba wamepata mchezaji bora?",
    "50pick: Uwanja mpya wa TZS 10,000,000,000 umefunguliwa Dar.",
    "50pick: You can now hold up to TZS 10,000,000 in your wallet.",
    "50pick: Your favourite club just spent TZS 2,000,000,000 on a striker!",
    "50pick: Your predictions helped fans raise TZS 1,000,000 for the hospital!",
    "50pick: Uwanja umegharimu TZS 10,000,000,000.",
    "50pick: Kiingilio cha VIP ni TZS 1,000,000.",
    "50pick: Tiketi ya VIP inauzwa TZS 1,000,000.",
    "50pick: Pata +255712345678 kwenye WhatsApp kwa msaada.",
    "50pick: 50pick imelipa kodi ya TZS 1,000,000,000 kwa TRA.",
    // ⭐ Round 7 (the adversarial set) · ordinary campaigns, each refused before this round.
    "50pick: Ofa inaisha 10/10.",
    "50pick: Mwisho wa ofa: 10/10.",
    "50pick: Mechi ni 10/10 Uwanja wa Mkapa.",
    "50pick: Derby ya 10/10 inakuja!",
    "50pick: Rate us 10/10!",
    "50pick: Huduma yetu 10/10!",
    "50pick: Je, Simba watamsajili mchezaji kwa TZS 2,000,000,000?",
    "50pick: Will Simba sign a striker for over TZS 1,000,000,000 this window?",
    "50pick: Je, Yanga watashinda kwa magoli 3? Bei ya ligi ni TZS 1,000,000,000.",
    "50pick: Tumia msimbo (code) 1234567 upate zawadi.",
    "50pick: Over 1,000,000 Tanzanians have won a prediction this year? Tell us.",
    // ⭐ Round 7 · an ordinary campaign, refused before this round.
    "50pick: Weka 500 M Pesa upate zawadi.",
    // ⭐ Round 8 (L5, L6) · ordinary campaigns: the first three refused by the round-7 code.
    "50pick: Shinda leo! Piga 0700000000 kwa msaada.",
    "50pick: Shinda zawadi, piga 0700 000 000 kwa msaada.",
    "50pick: Win prizes - call 0712000000 for help.",
    "50pick: Ligi inaanza 10/10.",
    "50pick: The league starts 10/10.",
    "50pick: Mfumo utasimama 10/10.",
    "50pick: Ofa ya 10/10 kwa wateja wote!",
    "50pick: Weka TZS 10,000 upate bonasi ya 10/10.",
    // ⭐ Round 9 (the lead's ruling b) · a ticket's price lines, and a phone after its own word.
    "50pick: Tiketi moja kwa TZS 1,000 tu!",
    "50pick: Bei ya tiketi ni TZS 1,000 tu.",
    "50pick: Shinda leo! Piga 0712500000 kwa msaada.",
  ];
  // ⛔ Round 5 (LOW 14) · a control is named by its place in the list, never by its words.
  CONTROL.forEach((text, i) => {
    const c = plain(text);
    ok(`1.1 · control ${i + 1} of ${CONTROL.length} · an untagged campaign with no Millionea signal is not read: it composes exactly as before, no problem at all`,
      UNT.millioneaSignals(text).length === 0 && c.ok && c.problems.length === 0, J({ text, signals: UNT.millioneaSignals(text), problems: c.problems }));
  });
  const v = validateCampaignTemplate({ name: "Derby week", bodySw: "50pick: Habari {jina}, soka leo.", bodyEn: "", nameFallbackSw: "Rafiki", nameFallbackEn: "Friend" }, "");
  ok("1.2 · the default campaign still validates exactly as before: ok, with no problem at all", v.ok && Object.keys(v.problems).length === 0, J(v.problems));
  const noSender = plain("Habari, soka leo.");
  ok("1.3 · …and a plain text that fails the old rules gets exactly the old sentence — nothing is added",
    J(noSender.problems) === J(["The message must begin with “50pick” so the sender is identified."]), J(noSender.problems));
  const SEEN: Array<[string, string]> = [
    ["Millionea", "millionea"], ["MILLIONEA leo", "millionea"], ["Milionea", "milionea"], ["Mamilionea wapya", "mamilionea"],
    ["a millionaire", "millionaire"], ["the Jackpot", "jackpot"], ["jackpoti ya wiki", "jackpoti"], ["milioni tano", "milioni"],
    ["pata 10/10 leo", "10/10"], ["10 kati ya 10", "10/10"],
    // Rounds 3 to 5 (B3 · B5; ruling 1; the lead's decision MEDIUM 7b) · a figure of a million or more, in a claim.
    ["Shinda TZS 1,000,000", "a figure of a million or more"], ["Shinda TZS 2 000 000 leo", "a figure of a million or more"],
    ["Shinda TZS 5m", "a figure of a million or more"], ["Shinda TZS 1000000 leo", "a figure of a million or more"],
    ["Shinda 5m", "a figure of a million or more"], ["Win 2.5M", "a figure of a million or more"],
    ["1m TZS inakusubiri", "a figure of a million or more"], ["TZS 2,000,000 ni zako", "a figure of a million or more"],
    ["A prize of 5,000,000", "a figure of a million or more"],
    // ⭐ Round 5 (MEDIUM 6 and 7a) · the jackpot in two words, and a figure that is got — each missed by the round-4 code.
    ["Jack Pot", "jack pot"], ["Get 2,000,000 today", "a figure of a million or more"],
  ];
  for (const [text, want] of SEEN) {
    const got = UNT.millioneaSignals(text);
    ok(`1.4 · control · the reader sees “${text}” as ${want}`, got.includes(want), J(got));
  }
}

// ── §2 · HIGH 1 · the review's texts, MEDIUM 6, the normal form, the tag, each family, the fee ──────────────────────
console.log(`${LF}§2 · HIGH 1 — the review's texts, every one refused; MEDIUM 6 says why; the normal form; the tag; the families`);
{
  // ⭐ Each passed the first lint, which read a text only when /mill?ionea|mill?ionaires?|jackpots?/ matched it RAW as a
  // word, and to which the composer handed no week: so every check in this loop fails on the old code.
  const REVIEW: Array<{ text: string; families: string[]; missing: boolean; fee: boolean }> = [
    { text: "50pick: Shinda TZS 1,000,000 kwa TZS 1,000!", families: ["amount", "win"], missing: true, fee: false },
    { text: "Mamilionea wapya kila wiki! Shinda TZS 1,000,000.", families: ["amount", "win", "income"], missing: true, fee: false },
    { text: "50pick: Millionea2026! Shinda leo.", families: ["win"], missing: true, fee: false },
    { text: `50pick: Million${cc(0xE9)}a! Shinda leo.`, families: ["win"], missing: true, fee: false },
    { text: `50pick: J${cc(0xE0)}ckpot! Shinda leo.`, families: ["win"], missing: true, fee: false },
    { text: `${FACTS} Jipatie 1000000TZS kwa 1000TZS!`, families: ["amount", "win"], missing: false, fee: false },
    { text: `${FACTS} Tajirika! Jaribu bahati yako.`, families: ["income", "chance"], missing: false, fee: false },
    { text: `${FACTS} Pesa nyingi zinakusubiri!`, families: ["income"], missing: false, fee: false },
    { text: `${FACTS} Juma M. wa Arusha alipata 10/10 wiki iliyopita!`, families: ["win", "winner"], missing: false, fee: false },
    { text: "Jackpot inagawanywa sawa kwa kila tiketi ya 10/10; ada 1% wakati wa malipo.", families: [], missing: false, fee: true },
  ];
  for (const c of REVIEW) {
    const u = plain(c.text);
    ok(`2.1 · ⭐ untagged, “${c.text.slice(0, 44)}…” is refused in words — tag the campaign Millionea or reword it`,
      !u.ok && u.problems.some(untagged) && millioneaIn(u.problems).length === 1, J(u.problems));
    const t = as(c.text, TAGGED);
    const what = [...c.families, ...(c.missing ? ["the facts"] : []), ...(c.fee ? ["the week's fee"] : [])].join(", ");
    ok(`2.2 · ⭐ tagged and open, the same text is refused for ${what} — and for nothing else of Millionea's`,
      !t.ok && J(familiesOf(t.problems)) === J(c.families) && t.problems.some((p) => p.includes(MISSING)) === c.missing
        && t.problems.some((p) => p.startsWith("This message states a")) === c.fee && !t.problems.some(untagged), J(t.problems));
  }
  ok("2.3 · control · the review's “{facts}” alone, tagged and open, is a lawful Millionea campaign — so each refusal above is its claim's",
    as(FACTS, TAGGED).ok, J(as(FACTS, TAGGED).problems));
  ok("2.4 · control · …and the same words untagged are refused: the tag is what makes them lawful", plain(FACTS).problems.some(untagged), J(plain(FACTS).problems));

  // MEDIUM 6 · a derby campaign that says "millionaire" was told to carry Millionea's three facts: now it is told why.
  const MED6: Array<[string, string]> = [
    ["50pick: Who wants to be a millionaire? Predict the derby tonight.", "millionaire"],
    ["50pick: Derby jackpot of predictions tonight!", "jackpot"],
    ["50pick: Kuwa milionea wa utabiri leo!", "milionea"],
  ];
  for (const [text, word] of MED6) {
    const said = millioneaIn(plain(text).problems);
    ok(`2.5 · ⭐ MEDIUM 6 · “${text.slice(8, 44)}…” is told why — Millionea's words, tag or reword, naming “${word}” — and nothing about facts it never meant`,
      said.length === 1 && untagged(said[0]) && said[0].includes(`“${word}”`), J(said));
  }

  ok("2.6 · the normal form splits a letter run from a digit run: “Millionea2026” reads “millionea 2026”",
    claims.normalizeClaimText("Millionea2026") === "millionea 2026", claims.normalizeClaimText("Millionea2026"));
  ok("2.6 · …and drops case and accents: “MILLIONÉA” reads “millionea”",
    claims.normalizeClaimText(`MILLION${cc(0xC9)}A`) === "millionea", claims.normalizeClaimText(`MILLION${cc(0xC9)}A`));
  const FORMS: Array<[string, string, string]> = [
    ["Millionea2026", "millionea", "a year run into the name"],
    [`Mill${cc(0x200B)}ionea`, "millionea", "an invisible character inside it"],
    [`${cc(0x41C)}illionea`, "millionea", "a Cyrillic letter for a Latin one"],
    ["M1ll10nea", "millionea", "digits for letters"],
    ["J a c k p o t", "jackpot", "spaces between its letters"],
    [`${cc(0xFF11, 0xFF10)}/${cc(0xFF11, 0xFF10)}`, "10/10", "full-width digits"],
  ];
  for (const [text, want, how] of FORMS) {
    const got = UNT.millioneaSignals(text);
    ok(`2.6 · ⭐ the signal survives ${how}`, got.includes(want), J(got));
  }

  const POS = ["Millionea week 44", "MILLIONEA: launch", "[Millionea] Oct", `Million${cc(0xE9)}a promo`, "Millionea2026"];
  const NEG = ["Derby week", "Millioneaire", "Promo Millionea", "", "Jackpot 700,000,000"];
  ok("2.7 · ⭐ the tag · a campaign whose name begins with the word “Millionea” (any case or accent) declares Millionea",
    POS.every((n) => claims.campaignProductOf(n) === "MILLIONEA"), J(POS.map((n) => claims.campaignProductOf(n))));
  ok("2.7 · control · …and no other name does: a longer word, the word later in the name, none, a jackpot's name",
    NEG.every((n) => claims.campaignProductOf(n) === null) && claims.campaignProductOf(null) === null, J(NEG.map((n) => claims.campaignProductOf(n))));

  const ONE: Array<[string, string, string]> = [
    ["amount", SW1, " Jackpot TZS 5,000,000."], ["amount", EN1, " A Jackpot of 1,000,000."], ["amount", SW1, " Piga 0712345678 leo."],
    ["win", SW1, " Mshindi atapata."], ["win", EN1, " You could win."], ["win", SW1, " Pata zawadi."], ["win", EN1, " W1n today."],
    ["winner", SW1, " Hongera Juma!"], ["winner", EN1, " Asha K. got it last week."], ["winner", SW1, " Wiki iliyopita ilikuwa ya kihistoria."],
    ["sum", SW1, " Jackpot ya milioni."], ["sum", EN1, " Millions to share."], ["sum", EN1, " Up to 5m."],
    ["income", SW1, " Tajirika leo."], ["income", EN1, " Get rich."], ["income", EN1, " Earn money."], ["income", SW1, " Kuwa milionea."],
    ["guarantee", SW1, " Kwa uhakika."], ["guarantee", EN1, " Guaranteed."], ["guarantee", EN1, " A sure thing."],
    ["rank", SW1, " Jackpot ya kwanza Tanzania."], ["rank", EN1, " The biggest jackpot in town."],
    ["chance", SW1, " Nafasi ni yako."], ["chance", EN1, " Better odds every week."], ["chance", SW1, " Jaribu bahati yako."],
    // ⭐ Round 3 (B4) · the review's phrases: a verb in another person or tense, and a jackpot's size in words.
    ["income", SW1, " Utajirika!"], ["income", SW1, " Watajirika leo."], ["win", SW1, " Utapata sehemu ya Jackpot."],
    ["win", SW1, " Wanapata kila wiki."], ["win", SW1, " Unaweza kujipatia."], ["sum", SW1, " Jackpot kubwa!"],
    ["sum", EN1, " Big jackpot!"], ["sum", EN1, " Huge jackpot!"], ["sum", SW1, " Jackpot nono."],
    // ⭐ Round 4 (L8) · a score.
    ["winner", EN1, " Three tickets had 10/10 at 50pick."],
  ];
  for (const [family, base, extra] of ONE) {
    const got = familiesOf(claims.millioneaClaimProblems(base + extra));
    ok(`2.8 · ${family}: “${extra.trim()}” trips its family and nothing else`, got.length === 1 && got[0] === family, J(got));
  }
  const wallet = `${SW1} Lipa kwa M-Pesa, M Pesa au M.Pesa.`;
  ok("2.8b · ⭐ round 4 (M4) · M-Pesa is one word, however it is written: a Millionea campaign naming the wallet makes no claim of money",
    familiesOf(claims.millioneaClaimProblems(wallet)).length === 0 && claims.normalizeClaimText("M-Pesa M Pesa M.Pesa MPesa") === "mpesa mpesa mpesa mpesa",
    J({ families: familiesOf(claims.millioneaClaimProblems(wallet)), normal: claims.normalizeClaimText("M-Pesa M Pesa M.Pesa MPesa") }));
  // ⭐ Round 5 (LOW 15) · every wallet's name is its brand: each was an income claim to the round-4 code.
  const wallets = `${SW1} Lipa kwa Tigo Pesa, Airtel Money, HaloPesa au T-Pesa.`;
  ok("2.8c · ⭐ round 5 (LOW 15) · a Millionea campaign naming any mobile-money wallet makes no claim of money by it",
    familiesOf(claims.millioneaClaimProblems(wallets)).length === 0, J(familiesOf(claims.millioneaClaimProblems(wallets))));
  ok("2.8 · a look-alike digit hides no claim: “Sh1nda” is read as the win it is", familiesOf(claims.millioneaClaimProblems(`${SW1} Sh1nda leo.`)).includes("win"));

  const FACTS3: Array<[string, string, string]> = [
    ["jackpot", `50pick: Millionea inagawanywa sawa kwa kila tiketi ya 10/10; ada ${PCT}% wakati wa malipo.`, "the word"],
    ["shared", `50pick: Millionea. Jackpot; ada ${PCT}% wakati wa malipo.`, "the share"],
    ["fee", "50pick: Millionea. Jackpot inagawanywa sawa kwa kila tiketi ya 10/10.", "the fee"],
  ];
  for (const [fact, text, what] of FACTS3) {
    const missing = claims.missingMillioneaFacts(text);
    ok(`2.9 · a Millionea campaign without ${what} is refused for that fact alone`,
      missing.length === 1 && missing[0] === fact && claims.millioneaClaimProblems(text).some((x) => x.includes(MISSING)), J(missing));
  }

  const ten = fill(claims.MILLIONEA_WORDINGS.SW[0], 0.10);
  const mismatch = millioneaIn(as(ten, TAGGED).problems);
  ok("2.10 · ⭐ a stated fee is held to the week's own: 10% against a 13% week is refused, naming both",
    mismatch.length === 1 && mismatch[0].includes("10%") && mismatch[0].includes(`${PCT}%`), J(mismatch));
  ok("2.10 · control · …and the same text against a 10% week passes", as(ten, { product: "MILLIONEA", facts: { feeRate: 0.10, live: true } }).ok);

  const shut = as(SW1, { product: "MILLIONEA", facts: { feeRate: RATE, live: false } });
  ok("2.11 · ⭐ the server's part · while Millionea is not open to everyone, an approved wording is refused for that alone",
    J(millioneaIn(shut.problems)) === J([claims.MILLIONEA_NOT_LIVE]), J(shut.problems));
  const unread = as(SW1, { product: "MILLIONEA", facts: null });
  ok("2.11 · ⛔ …and while the week cannot be read, for that alone", J(millioneaIn(unread.problems)) === J([claims.MILLIONEA_FACTS_UNREAD]), J(unread.problems));
  const counter = as(SW1, SCREEN);
  ok("2.11 · control · the composer's live counter reads no week, so it judges the claims alone: the wording passes there",
    counter.ok && counter.problems.length === 0, J(counter.problems));

  const phone = as(`${FACTS} Piga 0712345678 leo.`, TAGGED);
  ok("2.12 · ⛔ a sentence never repeats a figure (it may be a phone number, and a refusal is stored): the amount is “a figure”",
    phone.problems.some((p) => p.includes("may not state a figure")) && !phone.problems.some((p) => /[0-9]{4,}/.test(p)), J(phone.problems));
  const million = plain("50pick: Shinda TZS 1,000,000!");
  ok("2.12 · ⛔ …and an untagged campaign's figure is named “a figure of a million or more”, never its digits",
    million.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && !million.problems.some((p) => p.includes("1,000,000")),
    J(million.problems));

  // ⭐ Round 3 (B6) · the review's missed refusals: a figure spaced or in a short word, a spelling, and look-alikes an SMS
  // can carry — each refused untagged, named by what it stands for.
  const MISSED: Array<[string, string]> = [
    ["50pick: Shinda 1 000 000 leo!", "a figure of a million or more"],
    ["50pick: Shinda 5 mil leo!", "a figure of a million or more"],
    ["50pick: Kuwa Milionare leo!", "“milionare”"],
    [`50pick: J${cc(0x39B)}CKPOT!`, "“jackpot”"],
    [`50pick: MILLIONE${cc(0x39B)}!`, "“millionea”"],
    [`50pick: MILLION${cc(0x3A3)}A!`, "“millionea”"],
    ["50pick: Mi11ionea!", "“millionea”"],
    ["50pick: MiIlionea!", "“millionea”"],
    ["50pick: Mi||ionea!", "“millionea”"],
    [`50pick: M${cc(0xA1)}llionea!`, "“millionea”"],
  ];
  for (const [text, want] of MISSED) {
    const u = plain(text);
    ok(`2.13 · ⭐ untagged, “${text.slice(8)}” is refused in words, read as ${want}`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes(want)) && millioneaIn(u.problems).length === 1, J(u.problems));
  }

  // ⭐ Round 4 (rulings 1, 3 and 4) · untagged claims, each refused in words.
  const RULED: Array<[string, string]> = [
    ["50pick: Shinda 5M leo!", "a figure of a million or more"],
    ["50pick: Win 2.5M this week!", "a figure of a million or more"],
    ["50pick: Shinda TZS 700,000,000 leo!", "a figure of a million or more"],
    ["50pick: Kila siku pata 10/10!", "“10/10”"],
    ["50pick: Pata 10/10 at 50pick.", "“10/10”"],
    ["50pick: 10/10 amepata.", "“10/10”"],
    ["50pick: Pata 10/10 asubuhi hii.", "“10/10”"],
  ];
  for (const [text, want] of RULED) {
    const u = plain(text);
    ok(`2.14 · ⭐ round 4 · untagged, “${text.slice(8)}” is refused in words, read as ${want}`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes(want)) && millioneaIn(u.problems).length === 1, J(u.problems));
  }

  // ⭐ Round 5 (HIGH 1 and 2) · tagged: a size written on a wallet's letter, and every currency word and sign — each missed
  // by the round-4 code.
  const TAGGED5: Array<[string, string[]]> = [
    [" Jackpot ya wiki hii ni 5M pesa!", ["sum", "income"]],
    [" Jackpot ya wiki hii ni 5 M pesa!", ["sum", "income"]],
    [" Lipa Tshs 500 tu.", ["amount"]],
    [" Lipa Shs 500 tu.", ["amount"]],
    [" Lipa shillingi 500 tu.", ["amount"]],
    [" Lipa shillings 500 tu.", ["amount"]],
    [" Lipa 500/- tu.", ["amount"]],
  ];
  for (const [extra, families] of TAGGED5) {
    const got = familiesOf(claims.millioneaClaimProblems(FACTS + extra));
    ok(`2.15 · ⭐ round 5 · tagged, “${extra.trim()}” is refused for ${families.join(" and ")}, and for nothing else`, J(got) === J(families), J(got));
  }
  // ⭐ Round 5 (HIGH 1 and 2, MEDIUM 6) · untagged claims the round-4 code missed — each refused in words.
  const MISSED5: Array<[string, string]> = [
    ["50pick: Shinda TZS 5M pesa taslimu!", "a figure of a million or more"],
    ["50pick: Shinda TZS 5 M pesa taslimu!", "a figure of a million or more"],
    ["50pick: Tshs 50,000,000 zinakusubiri!", "a figure of a million or more"],
    ["50pick: Shinda Tshs 700 000 000 leo!", "a figure of a million or more"],
    ["50pick: Shinda Shs 600000000 leo!", "a figure of a million or more"],
    ["50pick: Shinda 5000000 leo!", "a figure of a million or more"],
    ["50pick: Shinda TZS 700 000 000 leo!", "a figure of a million or more"],
    ["50pick: Shinda TZS 600000000 leo!", "a figure of a million or more"],
    ["50pick: Pata leo 10/10!", "“10/10”"],
    ["50pick: Get 10/10 at 7pm", "“10/10”"],
    ["50pick: Shinda Jack Pot ya wiki!", "“jack pot”"],
  ];
  for (const [text, want] of MISSED5) {
    const u = plain(text);
    ok(`2.16 · ⭐ round 5 · untagged, “${text.slice(8)}” is refused in words, read as ${want}`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes(want)) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Round 6 (H1) · a prize or a win read by its stem, a figure that is "yours", and a claim split by an exclamation or a
  // line break — each refused in words, each missed by the round-5 code.
  const MISSED6: string[] = [
    "50pick: TZS 50,000,000 is waiting for you!",
    "50pick: TZS 50,000,000 zinakungojea!",
    "50pick: TZS 50,000,000 zitakuwa zako!",
    "50pick: Tutakuzawadia TZS 5,000,000!",
    "50pick: You will be rewarded with TZS 5,000,000!",
    "50pick: Your winnings: TZS 5,000,000.",
    "50pick: Shinda! TZS 50,000,000 wiki hii.",
    "50pick: Shinda... TZS 50,000,000 leo!",
    `50pick: Shinda${LF}TZS 50,000,000`,
    "50pick: TZS 50,000,000 ni zenu!",
    "50pick: TZS 50,000,000 itakuwa yako leo!",
    "50pick: Utatuzwa TZS 5,000,000!",
    "50pick: SHINDA!!! TZS 50,000,000 wiki hii!",
    "50pick: Shinda; TZS 50,000,000 leo.",
    "50pick: Win! TZS 50,000,000 this week.",
    "50pick: Make TZS 50,000,000 yours!",
  ];
  MISSED6.forEach((text, i) => {
    const u = plain(text);
    ok(`2.18 · ⭐ round 6 (H1) · untagged claim ${i + 1} of ${MISSED6.length} (“${text.slice(8, 40).split(LF).join(" ")}…”) is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 6 (M5) · the ticket's own description in words, ten of ten naming its tickets, and — the lead's decision —
  // getting "up to" a figure: each refused in words, each missed by the round-5 code.
  const IMPLICIT6: Array<[string, string]> = [
    ["50pick: TZS 50,000,000 kwa majibu 10 sahihi!", "“10/10”"],
    ["50pick: Get all 10 right and take home TZS 50,000,000!", "“10/10”"],
    ["50pick: Today 10/10 tickets share TZS 50,000,000!", "“10/10”"],
    ["50pick: Jibu maswali yote 10 leo!", "“10/10”"],
    ["50pick: Pata hadi TZS 50,000,000 leo!", "a figure of a million or more"],
    ["50pick: Jipatie hadi TZS 50,000,000 leo!", "a figure of a million or more"],
    ["50pick: Unaweza kupata hadi TZS 50,000,000!", "a figure of a million or more"],
  ];
  for (const [text, want] of IMPLICIT6) {
    const u = plain(text);
    ok(`2.19 · ⭐ round 6 (M5) · untagged, “${text.slice(8)}” is refused in words, read as ${want}`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes(want)) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Round 6 (M4) · a figure written in words, and the sizes k, b and bil — each refused beside a prize word, each missed
  // by the round-5 code.
  const WORDS6 = [
    "50pick: Win a million this week!",
    "50pick: Win millions this week!",
    "50pick: Win one million shillings!",
    "50pick: Win a billion shillings!",
    "50pick: Shinda shilingi bilioni moja!",
    "50pick: Shinda TZS 1B leo!",
    "50pick: Shinda TZS 1bil leo!",
    "50pick: Shinda TZS 5000K leo!",
    "50pick: Shinda TZS 5 mill leo!",
    "50pick: Shinda 5 millions leo!",
  ];
  for (const text of WORDS6) {
    const u = plain(text);
    ok(`2.20 · ⭐ round 6 (M4) · untagged, “${text.slice(8)}” is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Round 6 (L3, L4) · a phone-shaped run with its currency after it is money; "milioni" with no count before it, and a
  // score claimed with "up to", stay refused.
  const L6: Array<[string, string]> = [
    ["50pick: Shinda 700000000 TZS leo!", "a figure of a million or more"],
    ["50pick: Shinda 700000000/= leo!", "a figure of a million or more"],
    ["50pick: Shinda milioni 5 leo!", "“milioni”"],
    ["50pick: Pata hadi 10/10 leo!", "“10/10”"],
  ];
  for (const [text, want] of L6) {
    const u = plain(text);
    ok(`2.21 · ⭐ round 6 (L3, L4) · untagged, “${text.slice(8)}” is refused in words, read as ${want}`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes(want)) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Rounds 7 and 8 (the lead's rulings on limits) · …a figure for a period alone is no limit, and a prize word beside it
  // is still a claim — the fourth to twelfth passed the round-7 code (the last four were its controls).
  for (const text of ["50pick: Shinda TZS 5,000,000 kwa siku!", "50pick: Win TZS 5,000,000 a day!", "50pick: Zawadi ya TZS 5,000,000 kila wiki!",
    "50pick: Get TZS 50,000,000 a week!", "50pick: Pata TZS 50,000,000 kwa wiki kwa tiketi moja!", "50pick: Chukua TZS 50,000,000 kila wiki!",
    "50pick: TZS 50,000,000 a week could be yours!", "50pick: Pata TZS 50,000,000 kwa siku 1 tu!",
    "50pick: Sasa unaweza kupata TZS 5,000,000 kwa siku kupitia M-Pesa.", "50pick: Pata hadi TZS 5,000,000 kwa siku kwenye akaunti yako.",
    "50pick: Get up to TZS 5,000,000 a day to your M-Pesa.", "50pick: Earn up to TZS 2,000,000 per week as an agent."]) {
    const u = plain(text);
    ok(`2.22 · ⭐ rounds 7 and 8 (limits) · untagged, “${text.slice(8)}” is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Round 7 (the adversarial set) · "it is yours" before a figure, a collecting verb, "laki", the jackpot in other
  // spellings, and a score that is someone's, waits for someone or equals a figure — each passed before this round.
  const ADVERSARIAL7 = [
    "50pick: It's yours: TZS 50,000,000!",
    "50pick: Collect TZS 50,000,000 this Saturday!",
    "50pick: Shinda TZS laki 50 leo!",
    "50pick: Shinda Jack + Pot ya wiki!",
    `50pick: Shinda JACK ${cc(0xD83D, 0xDCB0)} POT!`,
    `50pick: Shinda Jack ${cc(0x2022)} Pot!`,
    "50pick: Shinda Jakipoti ya wiki!",
    "50pick: Shinda Jekpoti ya wiki!",
    "50pick: Kesho 10/10 ni yako!",
    "50pick: Jumamosi hii, 10/10 inakusubiri!",
    "50pick: Leo 10/10 = TZS 50,000,000!",
  ];
  ADVERSARIAL7.forEach((text, i) => {
    const u = plain(text);
    ok(`2.24 · ⭐ round 7 · untagged claim ${i + 1} of ${ADVERSARIAL7.length} is refused in words, with one Millionea sentence`,
      !u.ok && u.problems.some(untagged) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 7 (the adversarial set) · a size written onto a currency's or a wallet's word, a round run, and a figure's own
  // look-alikes (a letter for a zero, another script's digits, an apostrophe or an underscore for its thousands) — each
  // passed before this round.
  const FIGURES7 = [
    "50pick: Shinda 5MTZS leo!",
    "50pick: Shinda 5Mpesa leo!",
    "50pick: Shinda TZS 5M-Pesa leo!",
    "50pick: Shinda 700 000 000 leo!",
    "50pick: Shinda 600000000 leo!",
    "50pick: Shinda TZS 5O,OOO,OOO!",
    `50pick: Shinda TZS 5${cc(0x6F0)},${cc(0x6F0, 0x6F0, 0x6F0)},${cc(0x6F0, 0x6F0, 0x6F0)}!`,
    "50pick: Shinda TZS 5'000'000!",
    "50pick: Shinda TZS 5_000_000!",
  ];
  FIGURES7.forEach((text, i) => {
    const u = plain(text);
    ok(`2.25 · ⭐ round 7 · untagged figure ${i + 1} of ${FIGURES7.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 8 (H1) · a question is a claim when it does not open as one, puts a winning or getting verb before the figure,
  // asks about anyone, or asks the reader — each passed by the round-7 code (the last three were its controls).
  const ASKS8 = [
    "50pick: Win TZS 50,000,000 this Saturday, will it happen?",
    "50pick: Win TZS 50,000,000 this Saturday - has anyone done it yet?",
    "50pick: Shinda TZS 50,000,000 wiki hii - atakuwa ni mmoja wenu?",
    "50pick: Can anyone win TZS 50,000,000 this week?",
    "50pick: Je, mshindi wa wiki hii atapata TZS 50,000,000?",
    "50pick: Will one ticket win TZS 50,000,000 on Saturday?",
    "50pick: Je, ungependa kushinda TZS 50,000,000?",
    "50pick: Je, atashinda TZS 50,000,000 Jumamosi?",
    "50pick: Je, Simba watashinda bonasi ya TZS 1,000,000,000 kutoka kwa mdhamini?",
    "50pick: Je, Yanga watapata zawadi ya CAF ya TZS 2,000,000,000?",
    "50pick: Will Simba win the TZS 1,000,000,000 sponsor bonus?",
  ];
  ASKS8.forEach((text, i) => {
    const u = plain(text);
    ok(`2.26 · ⭐ round 8 (H1) · untagged question ${i + 1} of ${ASKS8.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 11 (the lead's ruling) · a prize or win word anywhere in the figure's sentence makes it a claim, a limit's too —
  // each passed by the round-10 code (the first four were its controls).
  const LIMITS11 = [
    "50pick: Winners can withdraw up to TZS 5,000,000 a day.",
    "50pick: Washindi wanaweza kutoa hadi TZS 5,000,000 kwa siku.",
    "50pick: Toa hadi TZS 5,000,000 kwa siku - zawadi yako ya wiki inakusubiri kwenye akaunti.",
    "50pick: Withdraw up to TZS 5,000,000 a day and win more predictions.",
    "50pick: Winners withdraw up to TZS 5,000,000 every week!",
    "50pick: Shinda zawadi kubwa, kisha toa hadi TZS 5,000,000!",
  ];
  LIMITS11.forEach((text, i) => {
    const u = plain(text);
    ok(`2.29 · ⭐ round 11 · untagged claim ${i + 1} of ${LIMITS11.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 11 (the lead's ruling) · a price is a ticket, entry or bei word heading the figure's phrase; a figure
  // elsewhere is read as a claim — each passed by the round-10 code.
  const PRICE11 = [
    "50pick: Kwa TZS 50,000,000, tiketi moja inatosha!",
    "50pick: Only TZS 50,000,000 stands between you and your dream!",
  ];
  PRICE11.forEach((text, i) => {
    const u = plain(text);
    ok(`2.30 · ⭐ round 11 · untagged claim ${i + 1} of ${PRICE11.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 12 · the reader rule reads the subject of the figure's own clause: a subject anyone could be, a reader after the
  // figure, or the reader as the subject keeps it a claim — each refused by the round-11 code too.
  const SUBJECT12 = [
    "50pick: Unajua mtu analipwa TZS 50,000,000 kwa wiki?",
    "50pick: Unajua Samatta analipwa TZS 50,000,000 - wewe je?",
    "50pick: Unajua unaweza kulipwa TZS 50,000,000 kwa wiki?",
  ];
  SUBJECT12.forEach((text, i) => {
    const u = plain(text);
    ok(`2.31 · ⭐ round 12 · untagged claim ${i + 1} of ${SUBJECT12.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 15 (the lead's ruling) · a price needs a price word heading the figure's phrase and no reader word in it.
  const PRICE15 = [
    "50pick: Your ticket is TZS 50,000,000!",
    "50pick: Tiketi yako ni TZS 50,000,000!",
    "50pick: Tiketi moja kwa TZS 50,000,000!",
  ];
  PRICE15.forEach((text, i) => {
    const u = plain(text);
    ok(`2.32 · ⭐ round 15 · untagged claim ${i + 1} of ${PRICE15.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 15 (the lead's rulings) · the prize words and the reader's own pronouns read in full — each passed by the
  // round-14 code.
  const WORDS15 = [
    "50pick: The pot is TZS 50,000,000 this week.",
    "50pick: Mfuko wa TZS 50,000,000 wiki hii!",
    "50pick: TZS 50,000,000 ni wako wiki hii!",
    "50pick: TZS 50,000,000 kwenu wiki hii!",
  ];
  WORDS15.forEach((text, i) => {
    const u = plain(text);
    ok(`2.33 · ⭐ round 15 · untagged claim ${i + 1} of ${WORDS15.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 15 · a bare run after a prize verb stays a figure, a phone word after it or not — passed by the round-14 code.
  {
    const u = plain("50pick: Shinda 712500000 kupitia SMS!");
    ok("2.34 · ⭐ round 15 · a bare run after a prize verb is refused in words as a figure, a phone word after it or not",
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Round 15 · a short question just before the figure joins its sentence, and a payout by the platform itself is its
  // claim — each passed by the round-14 code.
  const JOINED15 = [
    "50pick: Want to win? TZS 50,000,000 this week!",
    "50pick: Nani atafuata? TZS 50,000,000 wiki hii!",
    "50pick: TZS 50,000,000 paid out by 50pick last week!",
    "50pick: 50pick imelipa TZS 50,000,000 wiki hii.",
    "50pick: Did you know 50pick paid TZS 50,000,000 last week?",
  ];
  JOINED15.forEach((text, i) => {
    const u = plain(text);
    ok(`2.35 · ⭐ round 15 · untagged claim ${i + 1} of ${JOINED15.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 15 · a payout by the platform to a player stays its claim; a tax, fee or levy it pays is not (the control above).
  {
    const u = plain("50pick: 50pick imelipa mchezaji TZS 50,000,000 jana.");
    ok("2.36 · ⭐ round 15 · a payout by the platform to a player is refused in words, read as a figure of a million or more",
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Round 9 (the lead's rulings a to c) · a prize word anywhere in a question's sentence, a figure put in the reader's
  // hands or future, a ticket beside a figure, and a prize verb before a run of any shape — each passed by the round-8
  // code (the eighth was its control).
  const RULED9 = [
    "50pick: Je, TZS 50,000,000 zitashindwa wiki hii?",
    "50pick: What would you do with TZS 50,000,000?",
    "50pick: Ungefanya nini na TZS 50,000,000?",
    "50pick: Who will be next? TZS 50,000,000 wiki hii!",
    "50pick: Je, uko tayari? TZS 50,000,000 zinasubiri!",
    "50pick: Will TZS 50,000,000 change a life this Saturday?",
    "50pick: Tiketi moja, TZS 50,000,000!",
    "50pick: Tsh 650.000.000 zinasubiri.",
    "50pick: Shinda 712500000 leo!",
  ];
  RULED9.forEach((text, i) => {
    const u = plain(text);
    ok(`2.28 · ⭐ round 9 · untagged claim ${i + 1} of ${RULED9.length} is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  });
  // ⭐ Round 8 (L5) · a figure "up for grabs", and ten correct answers named as such — each passed by the round-7 code.
  for (const [text, want] of [["50pick: Ready? TZS 50,000,000 is up for grabs!", "a figure of a million or more"],
    ["50pick: Are 10 correct answers worth TZS 50,000,000?", "“10/10”"]] as const) {
    const u = plain(text);
    ok(`2.27 · ⭐ round 8 (L5) · untagged, “${text.slice(8)}” is refused in words, read as ${want}`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes(want)) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Round 7 · …while a question that asks the reader, asks who, or names no outcome is still a claim.
  for (const text of ["50pick: Je, utashinda TZS 50,000,000 wiki hii?", "50pick: Who will win TZS 50,000,000 this week?",
    "50pick: Shinda TZS 50,000,000 leo?", "50pick: Win TZS 50,000,000 today?"]) {
    const u = plain(text);
    ok(`2.23 · ⭐ round 7 · untagged, “${text.slice(8)}” is refused in words, read as a figure of a million or more`,
      !u.ok && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")) && millioneaIn(u.problems).length === 1, J(u.problems));
  }
  // ⭐ Round 5 (the lead's decision, MEDIUM 7b) · …and a campaign named as Millionea's keeps its full rules.
  const SIDES = ["50pick: Simba watamsajili kwa zaidi ya TZS 500,000,000?", "50pick: Sasa unaweza kutoa hadi TZS 5,000,000 kwa siku."];
  ok("2.17 · control · round 5 (MEDIUM 7b) · tagged, two of §1's round-5 controls are each refused for their amount",
    SIDES.every((t) => familiesOf(claims.millioneaClaimProblems(t)).includes("amount")), J(SIDES.map((t) => familiesOf(claims.millioneaClaimProblems(t)))));
}

// ── §3 · the approved wordings ─────────────────────────────────────────────────────────────────────────
console.log(`${LF}§3 · the approved wordings — filled, one message, clean as a Millionea campaign while it is open, in the headline's own words`);
{
  const all = [...claims.MILLIONEA_WORDINGS.SW.map((t) => ["SW", t] as const), ...claims.MILLIONEA_WORDINGS.EN.map((t) => ["EN", t] as const)];
  ok("3.1 · there are wordings in both campaign languages, each holding {pct} and no other placeholder (no name: OD-30)",
    claims.MILLIONEA_WORDINGS.SW.length >= 1 && claims.MILLIONEA_WORDINGS.EN.length >= 1
      && all.every(([, t]) => t.includes("{pct}") && (t.match(/[{][^}]*[}]/g) ?? []).every((m) => m === "{pct}")));
  for (const rate of [0.13, 0.125, 0.1, 0]) {
    for (const [locale, t] of all) {
      const text = fill(t, rate);
      const c = as(text, { product: "MILLIONEA", facts: { feeRate: rate, live: true } }, locale);
      const size = sizeSms(text);
      ok(`3.2 · ${locale} at ${claims.feePctOf(rate)}%: clean as a Millionea campaign while open, one GSM-7 message, the fee as filled — “${text.slice(0, 40)}…”`,
        c.ok && size.encoding === "GSM7" && size.segments === 1 && !text.includes("{")
          && J(claims.statedFeesIn(text)) === J([claims.feePctOf(rate)]) && claims.millioneaClaimProblems(text, { feeRate: rate }).length === 0,
        J({ problems: c.problems, size: { e: size.encoding, s: size.segments } }));
    }
  }
  ok("3.2b · control · every filled wording in an UNTAGGED campaign is refused in words — the untagged rule reads them",
    all.every(([locale, t]) => plain(fill(t, RATE), locale).problems.some(untagged)));
  ok("3.3 · the rate prints as the headline prints it: 0.13 → 13, 0.125 → 12.5, 0 → 0 (never a float's tail)",
    claims.feePctOf(0.13) === "13" && claims.feePctOf(0.125) === "12.5" && claims.feePctOf(0) === "0" && claims.feePctOf(0.07) === "7");
  // ⭐ THE FACTS ARE THE R-HEADLINE'S OWN WORDS: the dictionary's `millionea.ruleShared`, filled, carries both phrases the
  // lint requires, in each language — so the headline and the lint cannot drift apart without this failing.
  const rule = (l: "en" | "sw") => String((dict[l].millionea as any).ruleShared ?? "").split("{pct}").join("13");
  for (const l of ["en", "sw"] as const) {
    const text = `Jackpot · ${rule(l)}`;
    ok(`3.4 · ${l}: the R-HEADLINE (“${rule(l).slice(0, 44)}…”) carries the lint's facts in its own words`,
      rule(l).length > 0 && claims.missingMillioneaFacts(text).length === 0 && J(claims.statedFeesIn(text)) === J(["13"]), rule(l));
  }
}

// ── §4 · the doors ─────────────────────────────────────────────────────────────────────────────────────
console.log(`${LF}§4 · the doors — the screen and the save's verdict, a send's render, THE SAVE, THE TEST SEND, THE REAL SEND, the wiring`);
{
  const fields = (name: string, bodySw: string, bodyEn = "") => ({ name, bodySw, bodyEn, nameFallbackSw: "Rafiki", nameFallbackEn: "Friend" });
  const MLN = "Millionea week 44";
  const STALE = "50pick: Jackpot ya wiki hii inakusubiri!";
  // ⭐ Round 4, rule 6 · THE RULES' FIRST RUN, stamped HERE, before any door can stamp it (the first call stamps the instant it
  // is given): six hours ago. Every campaign below that starts now is held to the rules; §4.8's began before it.
  const HOUR_MS = 3_600_000;
  const EPOCH_AT = new Date(Date.now() - 6 * HOUR_MS).toISOString();
  const EPOCH = await LINT.millioneaLintEpoch({ stampAt: new Date(EPOCH_AT) });

  // ── the screen and the save's ONE verdict (`validateCampaignTemplate`): the product read from the name ──
  const u = validateCampaignTemplate(fields("Derby week", SW1), "", SAVE_RULES);
  ok("4.1 · ⭐ the save refuses an approved wording in an UNTAGGED campaign, on its body, in the rule's words",
    !u.ok && (u.problems.bodySw ?? []).some(untagged), J(u.problems));
  const b = validateCampaignTemplate(fields(MLN, "50pick: Shinda Millionea kwa uhakika leo!"), "");
  ok("4.1 · ⭐ …and a tagged campaign's claims, for each family it makes and the facts it lacks",
    !b.ok && J(familiesOf(b.problems.bodySw ?? [])) === J(["win", "guarantee"]) && (b.problems.bodySw ?? []).some((p) => p.includes(MISSING)), J(b.problems));
  const good = validateCampaignTemplate(fields(MLN, SW1, EN1), "");
  ok("4.1 · control · the approved wordings pass the screen's verdict in a tagged campaign (it reads no week; THE SAVE does, below)", good.ok, J(good.problems));
  const en = validateCampaignTemplate(fields(MLN, SW1, "50pick: Win big with Millionea!"), "");
  ok("4.1 · the English body is read on its own: a clean Swahili body does not cover a bad English one",
    !en.ok && millioneaIn(en.problems.bodySw).length === 0 && millioneaIn(en.problems.bodyEn).length > 0, J(en.problems));

  // ── a send's render (`renderForRecipient`): the product and the facts the door attached ──
  const tpl = (over: Record<string, unknown> = {}): any => ({
    bodySw: SW1, bodyEn: EN1, nameFallbackSw: "Rafiki", nameFallbackEn: "Friend", sourcePhrase: "", product: "MILLIONEA", millioneaFacts: OPEN, ...over,
  });
  const to = (t: any, variant: "SW" | "EN", name: string | null, origin: "account" | "book") => renderForRecipient(t, { variant, name, token: TOKEN, origin });
  const sent = to(tpl(), "EN", "Asha", "account");
  ok("4.2 · control · a send of a tagged campaign with the week's facts, open: the approved wording goes exactly as written", sent.ok && sent.text === EN1, J(sent.problems));
  const bare = to(tpl({ millioneaFacts: undefined }), "EN", "Asha", "account");
  ok("4.2 · ⛔ a tagged template rendered WITHOUT the facts its door must attach is refused as unread — no door sends one unchecked",
    !bare.ok && bare.problems[0] === claims.MILLIONEA_FACTS_UNREAD, J(bare.problems));
  const closedT = to(tpl({ millioneaFacts: { feeRate: RATE, live: false } }), "SW", null, "book");
  ok("4.2 · ⭐ …and while Millionea is not open, refused FIRST in the rule's words", !closedT.ok && closedT.problems[0] === claims.MILLIONEA_NOT_LIVE, J(closedT.problems));
  const staleT = to({ bodySw: STALE, bodyEn: "", nameFallbackSw: "Rafiki", nameFallbackEn: "Friend", sourcePhrase: "", product: null, ...SEND_RULES }, "SW", null, "book");
  ok("4.2 · ⭐ an untagged campaign stored before the lint fails at its send with that reason, first", !staleT.ok && untagged(staleT.problems[0] ?? ""), J(staleT.problems));
  const enFee = to(tpl({ bodyEn: EN1.replace(`${PCT}% fee`, "1% fee") }), "SW", null, "book");
  ok("4.2 · one campaign, one verdict: a Swahili recipient is refused when the ENGLISH body states another fee",
    !enFee.ok && enFee.problems.some((p) => p.startsWith("This message states a 1% fee")), J(enFee.problems));

  // ── a recipient's own name is never judged ──
  const JBODY = `50pick: Habari {jina}. Millionea. Jackpot inagawanywa sawa kwa kila tiketi ya 10/10; ada ${PCT}% wakati wa malipo.`;
  const NAMES = ["Zawadi", "Bahati", "Rich", "Lucky", "Pesa"];
  const greeted = NAMES.map((n) => to(tpl({ bodySw: JBODY, bodyEn: "" }), "SW", n, "account"));
  ok("4.3 · ⭐ a recipient is never refused for her own name: Zawadi, Bahati, Rich, Lucky and Pesa are each sent the message with it",
    greeted.every((m, i) => m.ok && m.text === JBODY.split("{jina}").join(NAMES[i])), J(greeted.map((m) => m.problems)));
  const typed = to(tpl({ bodySw: JBODY.split("{jina}").join("Zawadi"), bodyEn: "" }), "SW", null, "book");
  ok("4.3 · control · …while “Zawadi” typed into a Millionea campaign's own words is refused (a prize)",
    !typed.ok && familiesOf(typed.problems).includes("win"), J(typed.problems));
  const jack = to({ bodySw: "50pick: Habari {jina}, soka leo.", bodyEn: "", nameFallbackSw: "Rafiki", nameFallbackEn: "Friend", sourcePhrase: "", ...SEND_RULES }, "SW", "Jackpot", "account");
  ok("4.3 · control · an untagged campaign greets a player whose name is “Jackpot” — a name is never a signal",
    jack.ok && jack.text === "50pick: Habari Jackpot, soka leo.", J(jack.problems));

  // ⭐ Round 3 (B2) · THE OFFICER'S WORD FOR {jina} IS A MESSAGE TOO: a book contact (and a player with no usable name) is
  // sent the body with it, so it meets the body's rules — on its own field at the screen and the save, and at every send.
  const PLAIN_JINA = "50pick: Habari {jina}, soka leo.";
  const untaggedFb = validateCampaignTemplate({ name: "Derby week", bodySw: PLAIN_JINA, bodyEn: "", nameFallbackSw: "Milionea", nameFallbackEn: "Friend" }, "", SAVE_RULES);
  ok("4.3 · ⭐ B2 · an untagged campaign whose word for {jina} is one of Millionea's is refused on that word's field, in the rule's words — its body is not",
    !untaggedFb.ok && (untaggedFb.problems.nameFallbackSw ?? []).some((p) => untagged(p) && p.includes("“milionea”"))
      && untaggedFb.problems.bodySw === undefined, J(untaggedFb.problems));
  const taggedFb = validateCampaignTemplate({ ...fields(MLN, JBODY), nameFallbackSw: "Mshindi" }, "");
  ok("4.3 · ⭐ B2 · a Millionea campaign whose word for {jina} makes a claim is refused on that field, for that claim alone — its body is not",
    !taggedFb.ok && J(familiesOf(taggedFb.problems.nameFallbackSw ?? [])) === J(["win"]) && taggedFb.problems.bodySw === undefined, J(taggedFb.problems));
  const fbBook = to(tpl({ bodySw: JBODY, bodyEn: "", nameFallbackSw: "Mshindi" }), "SW", null, "book");
  const fbOwn = to(tpl({ bodySw: JBODY, bodyEn: "", nameFallbackSw: "Mshindi" }), "SW", "Asha", "account");
  ok("4.3 · ⭐ B2 · …and a send refuses it for every recipient: the book contact who would be sent the word, and a player greeted by her own name",
    !fbBook.ok && familiesOf(fbBook.problems).includes("win") && !fbOwn.ok && familiesOf(fbOwn.problems).includes("win"),
    J({ book: fbBook.problems, own: fbOwn.problems }));
  const untaggedSend = to({ bodySw: PLAIN_JINA, bodyEn: "", nameFallbackSw: "Milionea", nameFallbackEn: "Friend", sourcePhrase: "", ...SEND_RULES }, "SW", null, "book");
  ok("4.3 · ⭐ B2 · an untagged campaign's send is refused for its word for {jina}, first, in the rule's words",
    !untaggedSend.ok && untagged(untaggedSend.problems[0] ?? ""), J(untaggedSend.problems));
  const fbGood = validateCampaignTemplate(fields(MLN, JBODY), "");
  const fbGoodSend = to(tpl({ bodySw: JBODY, bodyEn: "" }), "SW", null, "book");
  ok("4.3 · control · a Millionea campaign whose word for {jina} is “Rafiki” passes the screen, and its book contact is sent the message with it",
    fbGood.ok && fbGoodSend.ok && fbGoodSend.text === JBODY.split("{jina}").join("Rafiki"), J({ v: fbGood.problems, s: fbGoodSend.problems }));

  // ── THE SAVE (`saveCampaignDraft`): the one verdict, then the week read on the server ──
  const OFFICER_ID = "usr_mln_claims_officer";
  let asked = 0;
  const created: any[] = [];
  const saveWith = (reader: (() => Promise<any>) | "none"): any => {
    const d: any = {
      ...DRAFT.CAMPAIGN_DRAFT_DEPS,
      campaigns: { find: async () => null, create: async (row: any) => { created.push(row); return row; }, update: async () => null },
      audit: async () => ({}),
    };
    if (reader === "none") delete d.millioneaFacts;
    else d.millioneaFacts = async () => { asked++; return reader(); };
    return d;
  };
  const save = (name: string, bodySw: string, reader: (() => Promise<any>) | "none", bodyEn = ""): Promise<any> =>
    DRAFT.saveCampaignDraft({ id: null, draftRevision: null, name, bodySw, bodyEn, nameFallbackSw: "", nameFallbackEn: "", audience: null },
      OFFICER_ID, { viewerReads: true }, saveWith(reader));
  const closedS = await save(MLN, SW1, async () => ({ feeRate: RATE, live: false }));
  ok("4.4 · ⭐ THE SAVE · a Millionea campaign is refused while Millionea is not open — the week read on the server, said on the body",
    !closedS.ok && closedS.reason === "invalid" && (closedS.problems?.bodySw ?? []).includes(claims.MILLIONEA_NOT_LIVE) && closedS.error === claims.MILLIONEA_NOT_LIVE, J(closedS));
  const threw = await save(MLN, SW1, async () => { throw new Error("the week could not be read (fixture)"); });
  ok("4.4 · ⛔ THE SAVE · a week that cannot be read refuses it — never saved unchecked", !threw.ok && threw.error === claims.MILLIONEA_FACTS_UNREAD, J(threw));
  const tenWeek = await save(MLN, SW1, async () => ({ feeRate: 0.1, live: true }));
  ok("4.4 · ⭐ THE SAVE · a fee that is not the week's is refused, naming both",
    !tenWeek.ok && (tenWeek.problems?.bodySw ?? []).some((p: string) => p.includes(`${PCT}% fee`) && p.includes("10%")), J(tenWeek));
  const noReader = await save(MLN, SW1, "none");
  ok("4.4 · ⛔ THE SAVE · a dependency set with no reader refuses it as unread", !noReader.ok && noReader.error === claims.MILLIONEA_FACTS_UNREAD, J(noReader));
  const enBad = await save(MLN, SW1, async () => OPEN, EN1.replace(`${PCT}% fee`, "1% fee"));
  ok("4.4 · THE SAVE · each body meets the week on its own: the English body's other fee is refused there, the Swahili body is not",
    !enBad.ok && (enBad.problems?.bodyEn ?? []).some((p: string) => p.startsWith("This message states a 1% fee")) && enBad.problems?.bodySw === undefined, J(enBad));
  const fbSave: any = await DRAFT.saveCampaignDraft({
    id: null, draftRevision: null, name: MLN, bodySw: JBODY, bodyEn: "", nameFallbackSw: "Mshindi", nameFallbackEn: "", audience: null,
  }, OFFICER_ID, { viewerReads: true }, saveWith(async () => OPEN));
  ok("4.4 · ⭐ B2 · THE SAVE · a Millionea campaign whose word for {jina} makes a claim is refused, said on that word's field",
    !fbSave.ok && fbSave.reason === "invalid" && familiesOf(fbSave.problems?.nameFallbackSw ?? []).includes("win"), J(fbSave));
  const before = created.length;
  const saved = await save(MLN, SW1, async () => OPEN);
  const row = created[created.length - 1];
  ok("4.4 · control · THE SAVE · open, at the week's fee: saved, the row exactly as written",
    saved.ok && created.length === before + 1 && row?.name === MLN && row?.bodySw === SW1, J(saved));
  const askedBefore = asked;
  const untaggedS = await save("Derby week", STALE, async () => OPEN);
  ok("4.4 · ⭐ THE SAVE · an untagged campaign in Millionea's words is refused in words — and no week is read for it",
    !untaggedS.ok && untagged(String(untaggedS.error)) && asked === askedBefore, J(untaggedS));
  const plainS = await save("Derby week", "50pick: Habari, mechi kubwa leo.", async () => OPEN);
  ok("4.4 · control · THE SAVE · a plain campaign saves exactly as before, and no week is read for it", plainS.ok && asked === askedBefore, J(plainS));

  // ── THE TEST SEND (`sendCampaignTest`): every read but the renderer's stubbed, to the officer's own number ──
  const OFFICER = { id: OFFICER_ID, phoneE164: "+255712000111", role: "ADMIN", status: "ACTIVE", displayName: "Asha", locale: "SW" };
  const stored = new Map<string, any>();
  const draftRow = (id: string, name: string, bodySw: string) => ({
    id, name, status: "DRAFT", bodySw, bodyEn: null, nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: null, draftRevision: 0,
  });
  stored.set("cmp_mln_claims_t1", draftRow("cmp_mln_claims_t1", MLN, SW1));
  stored.set("cmp_mln_claims_t2", draftRow("cmp_mln_claims_t2", "Derby week", STALE));
  stored.set("cmp_mln_claims_t3", { ...draftRow("cmp_mln_claims_t3", MLN, JBODY), nameFallbackSw: "Mshindi" });
  const testWith = (reader: () => Promise<any>): any => ({
    ...TEST.CAMPAIGN_TEST_DEPS,
    campaigns: { find: async (id: string) => stored.get(id) ?? null },
    users: { findById: async () => OFFICER },
    rate: async () => ({ allowed: true, remaining: 9, retryAfterSec: 0 }),
    provider: () => "console",
    rail: () => null,
    liveSwitch: async () => ({ state: "closed", why: "absent" }),
    window: ALWAYS_OPEN,
    audit: () => undefined,
    // ⛔ No token is ever made here: a test that passes the template's verdict stops at the next step, `token_unavailable`.
    ensureToken: async () => null,
    millioneaFacts: reader,
  });
  const tryTest = (id: string, reader: () => Promise<any>): Promise<any> =>
    TEST.sendCampaignTest({ campaignId: id, variant: "SW" }, OFFICER_ID, testWith(reader));
  const t1 = await tryTest("cmp_mln_claims_t1", async () => ({ feeRate: RATE, live: false }));
  ok("4.5 · ⭐ THE TEST SEND · a Millionea campaign is refused while Millionea is not open, in the rule's words",
    !t1.ok && t1.reason === "template_invalid" && t1.error === claims.MILLIONEA_NOT_LIVE, J(t1));
  const t2 = await tryTest("cmp_mln_claims_t1", async () => { throw new Error("the week could not be read (fixture)"); });
  ok("4.5 · ⛔ THE TEST SEND · a week that cannot be read refuses it", !t2.ok && t2.reason === "template_invalid" && t2.error === claims.MILLIONEA_FACTS_UNREAD, J(t2));
  const t3 = await tryTest("cmp_mln_claims_t2", async () => OPEN);
  ok("4.5 · ⭐ THE TEST SEND · an untagged draft saved before the lint is refused with that reason",
    !t3.ok && t3.reason === "template_invalid" && untagged(String(t3.error)), J(t3));
  const t4 = await tryTest("cmp_mln_claims_t1", async () => OPEN);
  ok("4.5 · control · THE TEST SEND · open, at the week's fee: the template's verdict passes (the stub's missing token is the next refusal)",
    !t4.ok && t4.reason === "token_unavailable", J(t4));
  const t5 = await tryTest("cmp_mln_claims_t3", async () => OPEN);
  ok("4.5 · ⭐ B2 · THE TEST SEND · a draft whose word for {jina} makes a claim is refused, though the officer is greeted by her own name",
    !t5.ok && t5.reason === "template_invalid" && familiesOf([String(t5.error)]).includes("win"), J(t5));

  // ── THE REAL SEND (`runCampaignSlice`): an engine slice on the memory twin, every shop-wide read fixed ──
  const moveTo = async (id: string, from: string, to: string, patch: Record<string, unknown>, draftRevision: number | null, at = new Date().toISOString()) => {
    const moved = await db.smsCampaign.transition(id, { from: [from], to, patch, draftRevision, at } as any);
    if (moved === null) throw new Error(`fixture: ${id} did not move ${from} to ${to}`);
  };
  const running = async (name: string, bodySw: string, nameFallbackSw: string | null = null, at = new Date().toISOString(), enqueueAt = at): Promise<string> => {
    const id = `cmp_mln_claims_e${W.nextRun()}`;
    await db.smsCampaign.create({
      id, name, status: "DRAFT", bodySw, bodyEn: null, codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null,
      nameFallbackSw, nameFallbackEn: null, sourcePhrase: null, draftRevision: 0, confirmTier: null,
      audienceFilter: '{"consent":["GIVEN"]}', audienceCount: null, audienceWatermark: null, estimateSegments: null,
      estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: OFFICER_ID,
      confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt: at, updatedAt: at,
    } as any);
    await moveTo(id, "DRAFT", "CONFIRMED", {
      audienceCount: 1, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: 1, estimateTzs: 6, budgetTzs: 10_000,
      confirmedBy: OFFICER_ID, confirmedAt: at,
    }, 0, at);
    await moveTo(id, "CONFIRMED", "PREPARING", { startedAt: at }, null, at);
    await moveTo(id, "PREPARING", "RUNNING", { enqueuedAt: enqueueAt, enqueueCursor: "done" }, null, enqueueAt);
    return id;
  };
  const slice = async (id: string, over: Record<string, unknown>) => {
    const wire = W.stubWire();
    const audits: any[] = [];
    const r: any = await ENGINE.runCampaignSlice(id, W.engineDeps(W.freshState(), wire, {
      gate: W.CLEARS_ALL, audit: (e: any) => { audits.push(e); }, ...over,
    } as any));
    const paused = audits.find((e) => e.action === ENGINE.ENGINE_PAUSED_ACTION && e.targetId === id);
    const flag = audits.find((e) => e.action === LINT.CAMPAIGN_FLAGGED_ACTION && e.targetId === id);
    return { r, wire, detail: String(paused?.payload?.detail ?? ""), flagged: String(flag?.payload?.detail ?? "") };
  };
  const e1 = await slice(await running(MLN, SW1), { millioneaFacts: async () => ({ feeRate: RATE, live: false }) });
  ok("4.6 · ⭐ THE REAL SEND · a slice pauses a Millionea campaign template_invalid while Millionea is not open — its words the detail, nothing on the wire",
    e1.r.kind === "paused" && e1.r.reason === "template_invalid" && e1.detail === claims.MILLIONEA_NOT_LIVE && e1.wire.calls === 0,
    J({ r: e1.r, detail: e1.detail, calls: e1.wire.calls }));
  const e2 = await slice(await running("Derby week", STALE), { millioneaFacts: async () => OPEN });
  ok("4.6 · ⭐ THE REAL SEND · an untagged campaign saved before the lint and STARTED after its first run pauses at its first slice with that reason — nothing goes out unchecked",
    e2.r.kind === "paused" && e2.r.reason === "template_invalid" && e2.detail.startsWith(UNT.MILLIONEA_UNTAGGED) && e2.wire.calls === 0,
    J({ r: e2.r, detail: e2.detail, calls: e2.wire.calls }));
  const e3 = await slice(await running(MLN, SW1), { millioneaFacts: undefined });
  ok("4.6 · ⛔ THE REAL SEND · a dependency set with no reader pauses it as unread",
    e3.r.kind === "paused" && e3.r.reason === "template_invalid" && e3.detail === claims.MILLIONEA_FACTS_UNREAD && e3.wire.calls === 0,
    J({ r: e3.r, detail: e3.detail }));
  const e5 = await slice(await running(MLN, JBODY, "Mshindi"), { millioneaFacts: async () => OPEN });
  ok("4.6 · ⭐ B2 · THE REAL SEND · a slice pauses a Millionea campaign whose word for {jina} makes a claim — nothing on the wire",
    e5.r.kind === "paused" && e5.r.reason === "template_invalid" && familiesOf([e5.detail]).includes("win") && e5.wire.calls === 0,
    J({ r: e5.r, detail: e5.detail, calls: e5.wire.calls }));
  const cid = await running(MLN, SW1);
  const run = W.nextRun();
  const key = W.keyIn("71", 4_400_000 + run);
  const pid = `usr_mln_claims_p${run}`;
  await W.player(pid, key);
  await W.seat(cid, [{ id: `rcp_mln_claims_${run}_1`, key, userId: pid }]);
  const e4 = await slice(cid, { millioneaFacts: async () => OPEN });
  ok("4.6 · control · THE REAL SEND · open, at the week's fee: the slice sends the approved wording to the consenting player, exactly as written",
    e4.r.kind === "sent" && e4.wire.sent.length === 1 && e4.wire.sent[0]?.body === SW1 && e4.detail === "",
    J({ r: e4.r, sent: e4.wire.sent.map((m: any) => m.body) }));

  // ── ⭐ ROUND 4, RULE 6 · THE ROLLOUT: a classic campaign SENDING since before the rules first ran is flagged, never paused ──
  const again = await LINT.millioneaLintEpoch({ stampAt: new Date() });
  ok("4.8 · ⭐ rule 6 · the rules' first run is a STAMP, never a clock: the first call stamped the instant it was given, and every later call answers that instant",
    EPOCH === EPOCH_AT && again === EPOCH_AT, J({ EPOCH, again, EPOCH_AT }));
  // ⭐ Round 5 (MEDIUM 4a) · a door that stamps LATE (the boot's own write failed) stamps this process's start, captured once —
  // never the instant of its own call. The stamp is set aside for the case and put back after it.
  while (process.uptime() < 2) await new Promise((r) => setTimeout(r, 100));
  const g: any = globalThis;
  const setAside = g.__50PICK_MILLIONEA_LINT_EPOCH;
  g.__50PICK_MILLIONEA_LINT_EPOCH = undefined;
  const late = await LINT.millioneaLintEpoch({ clock: new Date() });
  const later = await LINT.millioneaLintEpoch({ clock: new Date(Date.now() + HOUR_MS) });
  const startMs = Date.now() - process.uptime() * 1000;
  g.__50PICK_MILLIONEA_LINT_EPOCH = setAside;
  ok("4.8b · ⭐ round 5 (MEDIUM 4a) · a door that stamps late stamps this process's start, captured once — never the instant of its own call; a later call answers it",
    late !== null && Math.abs(Date.parse(late) - startMs) < 1_000 && later === late && Date.now() - Date.parse(late) > 1_000 && g.__50PICK_MILLIONEA_LINT_EPOCH === EPOCH_AT,
    J({ late, later, start: new Date(startMs).toISOString() }));
  const preAt = new Date(Date.parse(EPOCH_AT) - HOUR_MS).toISOString();
  const postAt = new Date(Date.parse(EPOCH_AT) + HOUR_MS).toISOString();
  const overlapAt = new Date(Date.parse(EPOCH_AT) + 30_000).toISOString();
  const shifted = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString();
  const runningSince = (startedAt: string, enqueuedAt: string, over: Record<string, unknown> = {}): any =>
    ({ status: "RUNNING", name: "Derby promo", startedAt, enqueuedAt, updatedAt: enqueuedAt, pausedAt: null, ...over });
  ok("4.8 · rule 6 · a classic campaign RUNNING since a start before the stamp is sending since before it; a later start, a campaign not running, an unread stamp are not",
    LINT.sendingSincePreLint(runningSince(preAt, preAt), EPOCH_AT) && !LINT.sendingSincePreLint(runningSince(postAt, postAt), EPOCH_AT)
      && !LINT.sendingSincePreLint(runningSince(preAt, preAt, { status: "PAUSED" }), EPOCH_AT) && !LINT.sendingSincePreLint(runningSince(preAt, preAt), null));
  ok("4.8c · ⭐ round 5 (LOW 10) · read by its START, never its state at the stamp: a campaign still preparing its list at the stamp, and one started by the outgoing build, are each sending since before it",
    LINT.sendingSincePreLint(runningSince(preAt, postAt), EPOCH_AT) && LINT.sendingSincePreLint(runningSince(overlapAt, overlapAt), EPOCH_AT));
  ok("4.8c · control · …a restart after the stamp binds it (paused after it, then resumed), while a pause and a resume both before it do not",
    !LINT.sendingSincePreLint(runningSince(preAt, preAt, { pausedAt: postAt, updatedAt: shifted(postAt, 60_000) }), EPOCH_AT)
      && LINT.sendingSincePreLint(runningSince(shifted(preAt, -HOUR_MS), shifted(preAt, -HOUR_MS), { pausedAt: shifted(preAt, -30 * 60_000), updatedAt: preAt }), EPOCH_AT));
  ok("4.8d · ⭐ round 5 (HIGH 3) · a campaign named as Millionea's is never sending since before the rules, whenever it started",
    !LINT.sendingSincePreLint(runningSince(preAt, preAt, { name: "Millionea promo" }), EPOCH_AT)
      && !LINT.sendingSincePreLint(runningSince(preAt, preAt, { name: "[Millionea] Oct" }), EPOCH_AT));
  const ROLLOUT = "50pick: Shinda hadi TZS 2,000,000 kwenye Up & Down leo!";
  /** A consenting player seated on the campaign, so "nothing on the wire" is measured with somebody there to send to. */
  const seated = async (id: string): Promise<string> => {
    const n = W.nextRun();
    const k = W.keyIn("71", 4_400_000 + n);
    const p = `usr_mln_claims_p${n}`;
    await W.player(p, k);
    await W.seat(id, [{ id: `rcp_mln_claims_${n}_1`, key: k, userId: p }]);
    return id;
  };
  const pre = await seated(await running("Derby promo", ROLLOUT, null, preAt));
  const f1 = await slice(pre, { millioneaFacts: async () => OPEN });
  ok("4.8 · ⭐ rule 6 · a classic campaign SENDING since before the rules first ran is not paused by them: the slice sends its message, exactly as written",
    f1.r.kind === "sent" && f1.wire.sent.length === 1 && f1.wire.sent[0]?.body === ROLLOUT && f1.detail === "", J({ r: f1.r, sent: f1.wire.sent.map((m: any) => m.body) }));
  const preRow: any = await db.smsCampaign.find(pre);
  const card = LIVE.preRulesFlagOf([{ action: LINT.CAMPAIGN_FLAGGED_ACTION, createdAt: new Date().toISOString(), payload: { detail: f1.flagged } } as any], preRow);
  ok("4.8 · ⭐ rule 6 · …and it is FLAGGED: one SYSTEM row with what the rules would refuse, which its status card says while it sends, with what binds it",
    f1.flagged.startsWith(UNT.MILLIONEA_UNTAGGED) && typeof card === "string" && card.includes(f1.flagged)
      && card.includes("They apply if it is paused and resumed, and to any copy made of it."), J({ flagged: f1.flagged, card }));
  // ⭐ Round 5 (LOW 9) · what binds it is only what the code allows, proven on the RUNNING campaign itself: it can be neither
  // saved nor test-sent, a copy of it is judged in full at its save, and a restart binds it.
  const liveSave: any = await DRAFT.saveCampaignDraft({
    id: pre, draftRevision: preRow?.draftRevision ?? null, name: "Derby promo", bodySw: ROLLOUT, bodyEn: "", nameFallbackSw: "", nameFallbackEn: "", audience: null,
  }, OFFICER_ID, { viewerReads: true }, {
    ...saveWith(async () => OPEN),
    campaigns: { find: async (id: string) => db.smsCampaign.find(id), create: async () => null, update: async () => null },
  });
  stored.set(pre, preRow);
  const liveTest = await tryTest(pre, async () => OPEN);
  ok("4.8e · ⭐ round 5 (LOW 9) · the running campaign itself can be neither saved nor test-sent: each is refused as no longer a draft",
    !liveSave.ok && liveSave.reason === "not_draft" && !liveTest.ok && liveTest.reason === "not_draft", J({ liveSave, liveTest }));
  const copied = await save("Derby promo", ROLLOUT, async () => OPEN);
  ok("4.8 · ⭐ rule 6 · …a copy of it (a new draft, through the one save) is refused in the rule's words — judged in full",
    !copied.ok && untagged(String(copied.error)), J(copied));
  await moveTo(pre, "RUNNING", "PAUSED", { pausedAt: new Date().toISOString(), stopReason: "officer_paused" }, null);
  await moveTo(pre, "PAUSED", "RUNNING", { stopReason: null }, null);
  const f2 = await slice(pre, { millioneaFacts: async () => OPEN });
  ok("4.8 · ⭐ rule 6 · …and a restart binds it: its next slice pauses template_invalid in the rule's words, nothing on the wire",
    f2.r.kind === "paused" && f2.r.reason === "template_invalid" && f2.detail.startsWith(UNT.MILLIONEA_UNTAGGED) && f2.wire.calls === 0,
    J({ r: f2.r, detail: f2.detail }));
  const restarted = await db.smsCampaign.find(pre);
  const stale = LIVE.preRulesFlagOf([{ action: LINT.CAMPAIGN_FLAGGED_ACTION, createdAt: preAt, payload: { detail: f1.flagged } } as any], restarted as any);
  ok("4.8 · control · a status card says no flag for a campaign that has none, nor one written before this run began",
    LIVE.preRulesFlagOf([], restarted as any) === null && stale === null, J({ stale }));
  // ⭐ Round 5 (HIGH 3, the lead's ruling) · a campaign named as Millionea's, RUNNING since before the stamp, is judged in full:
  // while Millionea is not open to everyone, its first slice pauses it — nothing sent.
  const mlnPre = await seated(await running("Millionea promo", SW1, null, preAt));
  const h3 = await slice(mlnPre, { millioneaFacts: async () => ({ feeRate: RATE, live: false }) });
  ok("4.8f · ⭐ round 5 (HIGH 3) · a campaign named as Millionea's, sending since before the rules, is never grandfathered: it pauses template_invalid while Millionea is not open — nothing on the wire, no flag",
    h3.r.kind === "paused" && h3.r.reason === "template_invalid" && h3.detail === claims.MILLIONEA_NOT_LIVE && h3.wire.calls === 0 && h3.flagged === "",
    J({ r: h3.r, detail: h3.detail, calls: h3.wire.calls }));
  const backstop = to(tpl({ millioneaLint: "flag", millioneaFacts: { feeRate: RATE, live: false } }), "SW", null, "book");
  const classic: any = to({ bodySw: ROLLOUT, bodyEn: "", nameFallbackSw: "Rafiki", nameFallbackEn: "Friend", sourcePhrase: "", product: null, millioneaLint: "flag", ...SEND_RULES }, "SW", null, "book");
  ok("4.8f · ⭐ round 5 (HIGH 3) · the backstop at the send's render: a Millionea template marked to be flagged is judged in full — a classic one keeps its flag",
    !backstop.ok && backstop.problems[0] === claims.MILLIONEA_NOT_LIVE && classic.ok && (classic.flagged ?? []).some(untagged),
    J({ backstop: backstop.problems, classic: classic.flagged }));
  // ⭐ Round 5 (LOW 10) · read by its start: a classic campaign still preparing its list at the stamp, and one started by the
  // outgoing build, each send as confirmed — flagged, never paused.
  const prep = await seated(await running("Derby prep", ROLLOUT, null, preAt, postAt));
  const outgoing = await seated(await running("Derby outgoing", ROLLOUT, null, overlapAt));
  const g1 = await slice(prep, { millioneaFacts: async () => OPEN });
  const g2 = await slice(outgoing, { millioneaFacts: async () => OPEN });
  ok("4.8g · ⭐ round 5 (LOW 10) · a classic campaign preparing its list at the stamp, and one started by the outgoing build, each send their message — flagged, never paused",
    [g1, g2].every((x) => x.r.kind === "sent" && x.wire.sent.length === 1 && x.wire.sent[0]?.body === ROLLOUT && x.detail === "" && x.flagged.startsWith(UNT.MILLIONEA_UNTAGGED)),
    J([g1, g2].map((x) => ({ r: x.r, detail: x.detail }))));
  // ⭐ Round 5 (MEDIUM 4b) · THE STAMP UNREAD: a classic campaign that only Millionea's rules would stop WAITS for it (a signal
  // that cannot be read costs only time) and sends once it reads; a message that fails another rule, or a campaign named as
  // Millionea's, still pauses.
  const unreadPre = await seated(await running("Derby unread", ROLLOUT, null, preAt));
  const k1 = await slice(unreadPre, { millioneaFacts: async () => OPEN, millioneaLintEpoch: async () => null });
  const unreadRow: any = await db.smsCampaign.find(unreadPre);
  ok("4.8h · ⭐ round 5 (MEDIUM 4b) · with the stamp unread, a classic campaign only Millionea's rules would stop WAITS — never a pause, nothing on the wire",
    k1.r.kind === "waiting" && k1.r.reason === "rules_unreadable" && k1.wire.calls === 0 && k1.detail === "" && unreadRow?.status === "RUNNING",
    J({ r: k1.r, status: unreadRow?.status }));
  const k2 = await slice(unreadPre, { millioneaFacts: async () => OPEN });
  ok("4.8h · …and once the stamp reads, it sends as a campaign sending since before the rules: flagged",
    k2.r.kind === "sent" && k2.wire.sent.length === 1 && k2.flagged.startsWith(UNT.MILLIONEA_UNTAGGED), J({ r: k2.r }));
  const broken = await seated(await running("Derby broken", "Habari, soka leo.", null, preAt));
  const mlnUnread = await seated(await running("Millionea unread", SW1, null, preAt));
  const k3 = await slice(broken, { millioneaFacts: async () => OPEN, millioneaLintEpoch: async () => null });
  const k4 = await slice(mlnUnread, { millioneaFacts: async () => ({ feeRate: RATE, live: false }), millioneaLintEpoch: async () => null });
  ok("4.8h · control · with the stamp unread, a message that fails another rule pauses template_invalid, and so does a campaign named as Millionea's",
    k3.r.kind === "paused" && k3.r.reason === "template_invalid" && k3.wire.calls === 0
      && k4.r.kind === "paused" && k4.r.reason === "template_invalid" && k4.detail === claims.MILLIONEA_NOT_LIVE && k4.wire.calls === 0,
    J({ k3: [k3.r, k3.detail], k4: [k4.r, k4.detail] }));
  const instrSrc = readFileSync(join(ROOT, "src/instrumentation.ts"), "utf8").split(CR).join("");
  const draftWire = readFileSync(join(ROOT, "src/lib/server/marketing/campaign-draft.ts"), "utf8").split(CR).join("");
  const engineWire = readFileSync(join(ROOT, "src/lib/server/marketing/engine.ts"), "utf8").split(CR).join("");
  const templateWire = readFileSync(join(ROOT, "src/lib/marketing/campaign-template.ts"), "utf8").split(CR).join("");
  const liveWire = readFileSync(join(ROOT, "src/lib/server/marketing/campaign-live.ts"), "utf8").split(CR).join("");
  const clientWire = readFileSync(join(ROOT, "src/app/admin/campaigns/[id]/live-client.tsx"), "utf8").split(CR).join("");
  ok("4.8 · the wiring · the stamp is taken at boot, and by the save and the slice on their own clocks; the slice reads it for the campaign and waits on an unread one; the render's backstop; the view reads the flag; the card prints it",
    instrSrc.includes("await millioneaLintEpoch();") && draftWire.includes("await deps.millioneaLintEpoch?.(deps.now()).catch(() => null);")
      && engineWire.includes("await deps.millioneaLintEpoch(deps.now())") && engineWire.includes("sendingSincePreLint(c, epoch ?? null)")
      && engineWire.includes('if (onlyTheRules) return { kind: "waiting", reason: "rules_unreadable", until: null };')
      && engineWire.includes("if (flagged !== null) await flagOnce(c, flagged, state, deps);")
      && templateWire.includes('const flag = t.millioneaLint === "flag" && millionea.product !== "MILLIONEA";')
      && liveWire.includes("lintFlag = preRulesFlagOf(await deps.actsOn(c.id).catch(() => []), c);") && clientWire.includes("data-live-flag")
      && typeof (ENGINE.ENGINE_DEPS as any).millioneaLintEpoch === "function" && typeof (DRAFT.CAMPAIGN_DRAFT_DEPS as any).millioneaLintEpoch === "function");

  // ── the wiring, read ──
  const code = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split(CR).join("");
  const DRAFT_REL = "src/lib/server/marketing/campaign-draft.ts";
  const TEST_REL = "src/lib/server/marketing/campaign-test-send.ts";
  const ENGINE_REL = "src/lib/server/marketing/engine.ts";
  const LOADER_REL = "src/app/admin/campaigns/new/composer-loader.ts";
  const READER = 'millioneaFacts: () => import("@/lib/server/maswali-marketing").then((m) => m.millioneaMarketingFacts()),';
  const once = (text: string, needle: string) => text.split(needle).length === 2;
  ok("4.7 · the wiring · each door's shipped dependency set reads the week through the ONE reader, lazily (no Millionea module loads for any other campaign)",
    [DRAFT_REL, TEST_REL, ENGINE_REL].every((f) => once(code(f), READER))
      && [DRAFT.CAMPAIGN_DRAFT_DEPS, TEST.CAMPAIGN_TEST_DEPS, ENGINE.ENGINE_DEPS].every((d: any) => typeof d.millioneaFacts === "function"));
  ok("4.7 · the wiring · every template a send renders is built with the product its stored name declares (the test send, the engine, the composer's previews)",
    [TEST_REL, ENGINE_REL, LOADER_REL].every((f) => once(code(f), "product: campaignProductOf(c.name),")));
  const testSrc = code(TEST_REL);
  const engineSrc = code(ENGINE_REL);
  const ATTACH = "await withMillioneaFacts(templateOf(";
  ok("4.7 · the wiring · the test send and the engine attach the week's facts to the one template they render, before they render it",
    once(testSrc, ATTACH) && testSrc.indexOf("deps.render(") > testSrc.indexOf(ATTACH)
      && once(engineSrc, ATTACH) && engineSrc.indexOf("const dry = deps.render(template,", engineSrc.indexOf(ATTACH)) > engineSrc.indexOf(ATTACH)
      && once(engineSrc, "prepare: (key: string) => prepareFor(template, key, deps)"));
  const draftSrc = code(DRAFT_REL);
  const VERDICT_CALL = 'deps.validate(fields, "", { untagged: untaggedRulesFor(fields.name) })';
  ok("4.7 · the wiring · the save judges the week AFTER the one verdict, on the facts it reads itself",
    draftSrc.indexOf(VERDICT_CALL) > 0 && draftSrc.indexOf("await millioneaFactsFrom(deps.millioneaFacts)") > draftSrc.indexOf(VERDICT_CALL));
  const srcAll: string[] = [];
  const walkSrc = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walkSrc(p);
      else if (/[.]tsx?$/.test(n)) srcAll.push(p);
    }
  };
  walkSrc(join(ROOT, "src"));
  const oldCallers = srcAll.filter((f) => !f.endsWith("millionea-claims.ts") && readFileSync(f, "utf8").includes("millioneaClaimProblems(")).map((f) => relative(ROOT, f));
  ok("4.7 · the wiring · the composer's one door asks the product policy, and no other src file calls the claims lint on its own",
    code("src/lib/marketing/footer.ts").includes("millioneaCampaignProblems((millionea.judged ?? trimmed).trim(), millionea)")
      && oldCallers.length === 0 && srcAll.length > 500, oldCallers.join(", "));
  const loaderSrc = code(LOADER_REL);
  ok("4.7 · the wiring · the composer's previews render a Millionea draft as its test send will: the facts read through the test send's own reader",
    once(loaderSrc, "await millioneaFactsFrom(CAMPAIGN_TEST_DEPS.millioneaFacts)") && once(loaderSrc, "millioneaFacts: millionea }")
      && once(loaderSrc, "millioneaFacts: facts.millionea }") && once(loaderSrc, 'adult: currentWording("adult.test"), millionea })'));
  const direct = await MKT.millioneaMarketingFacts().catch((e: unknown) => ({ threw: String(e) }));
  const lazy = await Promise.all([DRAFT.CAMPAIGN_DRAFT_DEPS, TEST.CAMPAIGN_TEST_DEPS, ENGINE.ENGINE_DEPS].map((d: any) =>
    Promise.resolve().then(() => d.millioneaFacts()).catch((e: unknown) => ({ threw: String(e) }))));
  ok("4.7 · the wiring · each door's lazy reader answers exactly what the week's own reader answers (its import resolves)",
    lazy.every((x) => J(x) === J(direct)) && !J(lazy).includes("threw"), J({ direct, lazy }));
}

// ── §5 · no gold, no count-up, no "first" ──────────────────────────────────────────────────────────────
console.log(`${LF}§5 · MB-47's list — no gold but on the paid win, no count-up, no "first"`);
{
  const mln = EMAIL_TEMPLATES.filter((t: any) => t.trigger === "src/lib/server/maswali-notify.ts");
  ok("5.1 · the registry's Millionea letters are three, and only the win is gold — and it is declared dual (royal when held)",
    mln.length === 3 && mln.filter((t: any) => t.chrome === "gold").map((t: any) => t.template).join() === "millioneaWinHtml"
      && (DUAL_CHROME_TEMPLATES as readonly string[]).includes("millioneaWinHtml"), J(mln));
  const GOLD_BAR = "linear-gradient(90deg,#c49a2e,#e8c05a,#c49a2e)";
  const ROYAL_BAR = "linear-gradient(90deg,#5344a8,#7060d0,#5344a8)";
  const win = (paid: number, held: number) => email.millioneaWinHtml({
    weekNumber: 44, serials: ["MLN-44-0001", "MLN-44-0002"].slice(0, paid + held), paidTickets: paid, heldTickets: held, shareTzs: 870_000,
    paidTzs: paid * 870_000, score: 10, maxPerWithdrawalTzs: 5_000_000, withdrawalFeeRate: 0.015, cannotSignIn: false, ticketHref: "/millionea/tickets/MLN-44-0001#won",
  });
  const lost = email.millioneaNotWonHtml({ weekNumber: 44, tickets: 2, spentTzs: 2_000, winningTickets: 0, winningScore: null, carried: { amountTzs: 1_740_000, intoWeekNumber: 45 } });
  const refund = email.millioneaWeekRefundedHtml({ weekNumber: 44, serials: ["MLN-44-0003"], refundedTzs: 1_000 });
  ok("5.2 · ⭐ rendered: the paid win wears gold; the held win, the loss and the refund wear royal",
    win(1, 0).includes(GOLD_BAR) && !win(0, 1).includes(GOLD_BAR) && win(0, 1).includes(ROYAL_BAR)
      && !lost.includes(GOLD_BAR) && lost.includes(ROYAL_BAR) && !refund.includes(GOLD_BAR) && refund.includes(ROYAL_BAR));
  const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  const FIRST = /\b(?:first|kwanza)\b/i;
  const smsLines = (["EN", "SW", "ZH"] as const).flatMap((locale) => [
    { held: false, cannotSignIn: false }, { held: true, cannotSignIn: false }, { held: false, cannotSignIn: true },
  ].map((o) => winnerSmsBody({ userId: "u", weekId: "w", weekCode: "MLN-2026-W44", tickets: 1, paidTzs: 870_000, phone: "+255700000000", locale, ...o })));
  const said = [
    ...claims.MILLIONEA_WORDINGS.SW, ...claims.MILLIONEA_WORDINGS.EN,
    text(win(1, 0)), text(win(0, 1)), text(win(1, 1)), text(lost), text(refund), ...smsLines,
  ];
  const firsts = said.filter((s) => FIRST.test(s)).map((s) => s.slice(0, 60));
  ok(`5.3 · no "first" in anything Millionea says — ${said.length} texts: the wordings, every letter branch, every winner SMS`,
    said.length >= 17 && firsts.length === 0, J(firsts));
  ok("5.3b · control · the reader sees a planted one", FIRST.test(`${SW1} Wa kwanza!`));
  // ⛔ No count-up on a Millionea surface (§M8a item 7): a figure changes by its tick, never by counting. The S5 design
  // suite holds its own files to it; this reads every Millionea file there is, so a new one joins by existing.
  const COUNT_UP = /\b(?:CountUp|countUp|useCountUp|AnimatedNumber|NumberTicker|animateValue)\b/;
  const files: string[] = [];
  const walk = (dir: string) => {
    let names: string[] = [];
    try { names = readdirSync(dir); } catch { return; }
    for (const n of names) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|mts)$/.test(n)) files.push(p);
    }
  };
  walk(join(ROOT, "src/components/maswali"));
  walk(join(ROOT, "src/app/millionea"));
  const counting = files.filter((f) => COUNT_UP.test(readFileSync(f, "utf8"))).map((f) => relative(ROOT, f));
  ok(`5.4 · no count-up on any Millionea surface (${files.length} files read)`, files.length >= 5 && counting.length === 0, counting.join(", "));
  ok("5.4b · control · the reader sees a planted count-up", COUNT_UP.test("<CountUp end={jackpot} />"));
}

// ── §6 · holders only; the one SMS; the consent gate ───────────────────────────────────────────────────
console.log(`${LF}§6 · holders only (OD-25) — the one service SMS, and anything else past the consent gate`);
{
  const TO = new Set(["buyer", "holders", "winners", "losers"]);
  ok("6.1 · every registered Millionea notice goes to a ticket's holder — buyer, holders, winners or losers — and only a win (paid or held) has an SMS",
    MILLIONEA_NOTICES.length === 10 && MILLIONEA_NOTICES.every((n: any) => TO.has(n.to))
      && MILLIONEA_NOTICES.filter((n: any) => n.sms).map((n: any) => n.notice).join() === "won,wonHeld", J(MILLIONEA_NOTICES.map((n: any) => [n.notice, n.to, n.sms])));
  // ⭐ THE CENSUS IS STRUCTURAL: every src/ file that sends an SMS, read as CODE (comments out). The only one whose code
  // says anything about Millionea is the winner's service SMS; the two campaign doors name it only to apply its claims gate
  // (round 3, B1 — 6.2c reads every mention); a campaign's words are the officer's, never code, and reach a non-holder only
  // through the engine's consent gate.
  const decomment = (src: string) => {
    let out = "", i = 0, q: string | null = null;
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (q) { out += c; if (c === "\\") { out += n ?? ""; i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === "/" && n === "*") { const end = src.indexOf("*/", i + 2); i = end < 0 ? src.length : end + 2; continue; }
      if (c === "/" && n === "/") { const end = src.indexOf(LF, i); i = end < 0 ? src.length : end; continue; }
      if (c === "\"" || c === "'" || c === "`") q = c;
      out += c; i++;
    }
    return out;
  };
  const SENDS = /\bsendBatch\s*\(|\bsms\.send\s*\(/;
  const senders: string[] = [];
  const all: string[] = [];
  const walk = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|mts)$/.test(n)) all.push(p);
    }
  };
  walk(join(ROOT, "src"));
  for (const f of all) {
    const raw = readFileSync(f, "utf8");
    if (!SENDS.test(raw)) continue;
    const code = decomment(raw);
    if (SENDS.test(code)) senders.push(relative(ROOT, f).replace(/\\/g, "/"));
  }
  const naming = senders.filter((f) => /millionea/i.test(decomment(readFileSync(join(ROOT, f), "utf8")))).sort();
  const DOORS = ["src/lib/server/marketing/campaign-test-send.ts", "src/lib/server/marketing/engine.ts"];
  const NAMING = [...DOORS, "src/lib/server/maswali-winner-sms.ts"].sort();
  ok("6.2 · ⭐ of every src/ file that sends an SMS, the only ones whose code names Millionea are the winner's service SMS and the two campaign doors (they name it only to apply its claims gate)",
    all.length > 500 && senders.includes("src/lib/server/sms.ts") && senders.includes("src/lib/server/maswali-winner-sms.ts")
      && J(naming) === J(NAMING), `${senders.length} senders of ${all.length} files · naming: ${naming.join(", ")}`);
  ok("6.2b · control · the decommenter keeps code and drops comments", /millionea/i.test(decomment("const a = 'Millionea'; // x")) && !/millionea/i.test(decomment("const a = 1; // Millionea")));
  // ⭐ Round 3 (B1) · THE CENSUS KEEPS ITS TEETH: in each campaign door every line of code that names Millionea is one of the
  // claims gate's own — its imports, the week's reader and its type, the facts attached before the render.
  const GATE_LINES = [
    'import { renderForRecipient, firstNameFor, withMillioneaFacts } from "@/lib/marketing/campaign-template";',
    'import { firstNameFor, renderForRecipient, variantFor, withMillioneaFacts } from "@/lib/marketing/campaign-template";',
    'import { campaignProductOf, type MillioneaFacts } from "@/lib/marketing/millionea-claims";',
    "millioneaFacts?: () => Promise<MillioneaFacts | null>;",
    'millioneaFacts: () => import("@/lib/server/maswali-marketing").then((m) => m.millioneaMarketingFacts()),',
    "const template = await withMillioneaFacts(templateOf(campaign), deps.millioneaFacts);",
    // Rounds 4 and 5, rule 6 · the rollout's lines in the engine: the stamp's import, its reader on the slice's clock, the
    // template it marks, and the wait on an unread stamp.
    'import { CAMPAIGN_FLAGGED_ACTION, millioneaLintEpoch, sendingSincePreLint } from "@/lib/server/marketing/millionea-lint-epoch";',
    "millioneaLintEpoch?: (clock: Date) => Promise<string | null>;",
    "millioneaLintEpoch: (clock: Date) => millioneaLintEpoch({ clock }),",
    "const epoch = deps.millioneaLintEpoch ? await deps.millioneaLintEpoch(deps.now()).catch(() => null) : undefined;",
    "const facts = await withMillioneaFacts(templateOf(c), deps.millioneaFacts);",
    'const template: CampaignTemplate = sendingSincePreLint(c, epoch ?? null) ? { ...facts, millioneaLint: "flag" } : facts;',
    'const onlyTheRules = epoch === null && campaignProductOf(c.name) !== "MILLIONEA"',
    '&& deps.render({ ...facts, millioneaLint: "flag" }, { variant, name: null, token: footerMeasurementToken(), origin: "account" }).ok;',
    // S6-LINT 1 · the untagged rules' import (the server's alone), in each door.
    'import { untaggedRulesFor } from "@/lib/server/marketing/millionea-untagged";',
  ];
  const mentions = (code: string) => code.split(LF).map((l) => l.trim()).filter((l) => /millionea/i.test(l));
  const outsideGate = (code: string) => mentions(code).filter((l) => !GATE_LINES.includes(l));
  const doorCode = DOORS.map((f) => decomment(readFileSync(join(ROOT, f), "utf8").split(CR).join("")));
  // ⭐ Round 5 (LOW 13) · pinned per door, never a floor: the test send names Millionea on six lines, the engine on thirteen
  // (S6-LINT 1: the untagged rules' import, one in each).
  ok("6.2c · ⭐ …and in each campaign door every line of code that names Millionea is the claims gate's own — six in the test send, thirteen in the engine",
    J(doorCode.map((c) => mentions(c).length)) === J([6, 13]) && doorCode.every((c) => outsideGate(c).length === 0),
    J(doorCode.map((c) => ({ mentions: mentions(c).length, outside: outsideGate(c) }))));
  ok("6.2d · control · a line planted outside the gate is caught", J(outsideGate(`${doorCode[1]}${LF}const note = "Millionea wiki hii";`)) === J(['const note = "Millionea wiki hii";']));
  const line = { userId: "u", weekId: "w", weekCode: "MLN-2026-W44", tickets: 1, paidTzs: 870_000, phone: "+255700000000", held: false, cannotSignIn: false } as const;
  const LINK = /https?:|www\.|\.tz\b|\.com\b|\/\w/i;
  const bodies = (["EN", "SW", "ZH"] as const).map((locale) => ({ locale, paid: winnerSmsBody({ ...line, locale }), held: winnerSmsBody({ ...line, locale, held: true }) }));
  ok("6.3 · ⭐ OD-25 · the winner SMS carries no link, states the amount when paid and no figure when held, in all three languages",
    bodies.every((b) => !LINK.test(b.paid) && !LINK.test(b.held) && b.paid.includes(formatTzs(870_000)) && !b.held.includes("TZS")),
    J(bodies));
  ok("6.4 · …and it is one message each: English and Swahili in the GSM alphabet, Chinese inside its 70",
    bodies.every((b) => sizeSms(b.paid).segments === 1 && sizeSms(b.held).segments === 1)
      && bodies.filter((b) => b.locale !== "ZH").every((b) => sizeSms(b.paid).encoding === "GSM7" && sizeSms(b.held).encoding === "GSM7"),
    J(bodies.map((b) => [b.locale, sizeSms(b.paid).segments, sizeSms(b.paid).encoding])));
  const instants = ["2027-01-04T09:00:00Z", "2026-10-26T09:00:00Z", "2026-12-31T09:00:00Z"].map((x) => Date.parse(x));
  ok("6.5 · the week every notice and SMS names is the stamp's own: eatWeekNumberOf inverts eatWeekCode (W01, W44, W53), and a string that is no code reads 0",
    instants.every((t) => eatWeekNumberOf(eatWeekCode("MLN", t)) === eatIsoWeek(t).week && eatWeekNumberOf(eatWeekCode("MLD", t)) === eatIsoWeek(t).week)
      && eatWeekNumberOf("Week 44") === 0 && eatWeekNumberOf("MLN-2026-W4") === 0,
    J(instants.map((t) => [eatWeekCode("MLN", t), eatWeekNumberOf(eatWeekCode("MLN", t))])));
}

// ── §7 · ROUND 17 — the review of rounds 13–16: every sentence of its report and its probes, by the lead's rulings ─────
console.log(`${LF}§7 · ⭐ ROUND 17 — every sentence of the review of rounds 13–16, read by the lead's rulings`);
/** Refused untagged, in words, as a figure of a million or more — one Millionea sentence (a text that does not begin with
 *  "50pick" also meets the sender's own rule, which is not Millionea's). */
const refusedAsFigure = (text: string) => {
  const u = plain(text);
  return { pass: !u.ok && millioneaIn(u.problems).length === 1 && u.problems.some((p) => untagged(p) && p.includes("a figure of a million or more")), problems: u.problems };
};
/** No Millionea signal and no Millionea sentence: a text that begins with "50pick" composes with no problem at all. */
const passesUntagged = (text: string) => {
  const c = plain(text);
  const clean = /^50pick/i.test(text) ? c.ok && c.problems.length === 0 : millioneaIn(c.problems).length === 0;
  return { pass: UNT.millioneaSignals(text).length === 0 && clean, signals: UNT.millioneaSignals(text), problems: c.problems };
};
const refuseAll = (tag: string, list: readonly string[]) => list.forEach((text, i) => {
  const r = refusedAsFigure(text);
  ok(`${tag} ${i + 1} of ${list.length} (“${text.replace(/^50pick: /, "").slice(0, 44)}…”) is refused in words, read as a figure of a million or more`, r.pass, J({ text, problems: r.problems }));
});
const passAll = (tag: string, list: readonly string[]) => list.forEach((text, i) => {
  const r = passesUntagged(text);
  ok(`${tag} ${i + 1} of ${list.length} (“${text.replace(/^50pick: /, "").slice(0, 44)}…”) has no Millionea signal — it passes as ordinary copy`, r.pass, J({ text, signals: r.signals, problems: r.problems }));
});
{
  // ⭐ 7.0 · what the review's probes found right at round 16 — the claims and the ordinary sentences its report says now
  // hold, and its probes' own controls: held, so no later rule undoes them.
  refuseAll("7.0 · round 17 · the review's held claim", [
    "50pick has paid TZS 500,000,000 to players this year!",
    "50pick: Want to win? TZS 50,000,000 this week!",
    "50pick: The pot is TZS 50,000,000 this week.",
    "50pick: TZS 50,000,000 ni wako wiki hii!",
    "Shinda TZS 1,000,000 kwa TZS 1,000!",
    "Win TZS 5,000,000 this week!",
    "TZS 10,000,000 inakusubiri!",
    "50pick has paid out TZS 900,000,000 in prizes, no taxes deducted.",
    "Your next TZS 2,000,000 starts here.",
    "Utapata TZS 3,000,000 ukicheza leo.",
    "Je, wewe ndiye ajaye kupata TZS 4,000,000?",
    "The entry price is TZS 1,000 and the prize is TZS 20,000,000.",
    "Bei ni TZS 1,000 tu, zawadi TZS 20,000,000.",
    "Price: TZS 2,000,000 pot this week",
    "Win five million shillings this week!",
  ]);
  passAll("7.0 · control · round 17 · the review's ordinary sentence", [
    "50pick: Je, unajua kwamba Simba ilisajili mchezaji kwa TZS 1,000,000,000?",
    "50pick: You can now hold up to TZS 10,000,000 in your wallet.",
    "Salio lako ni TZS 1,200,000.",
    "Weka hadi TZS 5,000,000 kwa siku.",
    "Your daily deposit limit is TZS 2,000,000.",
    "You can withdraw up to TZS 3,000,000 per day.",
    "Unaweza kutoa hadi TZS 5,000,000 kwa siku.",
    "Simu mpya inauzwa TZS 1,200,000 dukani kwetu.",
    "The new phone costs TZS 1,200,000 at our shop.",
    "Simba SC signed a striker for TZS 300,000,000.",
    "Did you know Simba paid TZS 500,000,000 for a striker?",
    "Je, unajua kwamba Simba ilisajili mchezaji kwa TZS 500,000,000?",
    "Your balance is TZS 1,250,000.",
    "You hold TZS 2,000,000 in your wallet.",
    "Call us on 0712345678 for help.",
    "Tupigie 0754123456 kwa msaada.",
    "Ofa inaisha tarehe 31/12/2026.",
    "1,000,000 Tanzanians already play on 50pick.",
    "The Derby kicks off Saturday 18:00. Make your pick on 50pick.",
    "Will Tanzania's inflation be above 3% in December? Make your pick.",
    "Will the BoT hold its rate at 6%? Trade on 50pick.",
    "Will Simba sign a striker for over TZS 300,000,000 this window?",
    "Deposit via M-Pesa till 5551234 and play.",
    "Is your weekly loss limit TZS 1,000,000? Review it in Settings.",
    "50pick: Utaweza kutoa hadi TZS 5,000,000 kwa siku kuanzia leo.",
    "50pick: Usajili wa TZS 1,500,000,000 umekamilika.",
    "50pick: We hold TZS 3,000,000,000 in player funds, kept apart from our own.",
    "50pick: The pothole on Bagamoyo Road cost TZS 2,000,000 to fix.",
  ]);
}
{
  // ⭐ 7.1 · H2 (the lead's ruling) · a payment by 50pick, read by its parties: the report's nine sentences — each passed the
  // round-16 rule, which read one word order and lifted a payout for any tax word, a denied one included.
  refuseAll("7.1 · ⭐ round 17 (H2) · the review's payout", [
    "50pick has already paid TZS 500,000,000 to players this year!",
    "50pick tayari imelipa TZS 500,000,000 kwa wachezaji.",
    "Over TZS 1 billion paid to 50pick players so far!",
    "Wachezaji wa 50pick wamelipwa TZS 500,000,000 mwaka huu.",
    "50pick: We paid TZS 80,000,000 to players last week!",
    "50pick: Tumelipa TZS 80,000,000 kwa wachezaji wiki iliyopita!",
    "50pick paid out TZS 500,000,000 last month with zero fees!",
    "50pick imelipa TZS 500,000,000 bila ada yoyote!",
    "50pick paid TZS 300,000,000 tax-free to players.",
  ]);
  // …each party the ruling names, in either language, and a tax that is another figure's object in the same sentence.
  refuseAll("7.1b · ⭐ round 17 (H2) · a payer or a payee", [
    "50pick: 50pick has now paid out over TZS 2 billion to its players!",
    "50pick: We've paid TZS 900,000,000 to players so far.",
    "50pick: Over TZS 2 billion paid out to our players!",
    "50pick: Players were paid TZS 500,000,000 last month.",
    "50pick: Tumeshalipa TZS 500,000,000 kwa wachezaji!",
    "50pick: TZS 500,000,000 zimelipwa na 50pick mwaka huu.",
    "50pick: 50pick made tax-free payouts of TZS 500,000,000 to players!",
    "50pick: 50pick paid TZS 500,000,000 to players and TZS 1,000 in fees.",
  ]);
  // …while a tax, a fee or a levy that is the figure's own object stays a payment the platform owes, in either language.
  passAll("7.1c · control · round 17 (H2) · a tax the platform pays", [
    "50pick paid TZS 12,000,000 in taxes to TRA this year.",
    "50pick imelipa kodi ya TZS 50,000,000 kwa TRA mwaka huu.",
    "50pick pays a levy of TZS 3,000,000 to the Gaming Board each quarter.",
    "50pick: 50pick imelipa kodi ya TZS 1,000,000,000 kwa TRA.",
    "50pick: 50pick paid TZS 50,000,000 in taxes and levies this year.",
    "50pick: 50pick imelipa kodi ya mapato ya TZS 50,000,000 mwaka huu.",
    "50pick: Tumelipa kodi ya TZS 50,000,000 kwa TRA.",
    "50pick: We pay TZS 3,000,000 in levies each quarter.",
  ]);
}
{
  // ⭐ 7.2 · H3 (the lead's ruling) · an account fact keeps the reader's figure ordinary only where the sentence STATES it —
  // never an account word as a lure, never a hypothetical — and the joined question counts for the reader: the report's four
  // sentences (each refused at round 12, passed at round 16), then the forms the ruling names.
  refuseAll("7.2 · ⭐ round 17 (H3) · the review's lure", [
    "Imagine TZS 10,000,000 in your wallet!",
    "Fikiria TZS 10,000,000 kwenye pochi yako!",
    "TZS 5,000,000 could land in your wallet this Friday.",
    "Unataka pesa? TZS 5,000,000 kila wiki.",
  ]);
  refuseAll("7.2b · ⭐ round 17 (H3) · a hypothetical account, or the reader's joined question", [
    "50pick: Imagine your balance at TZS 10,000,000!",
    "50pick: Your wallet could hold TZS 10,000,000 by Friday!",
    "50pick: TZS 5,000,000 will land in your wallet on Friday.",
    "50pick: TZS 5,000,000 itaingia kwenye pochi yako Ijumaa.",
    "50pick: Are you ready? TZS 5,000,000 every week.",
  ]);
  passAll("7.2c · control · round 17 (H3) · an account fact stated", [
    "50pick: Your balance is TZS 1,250,000. Top up today!",
    "50pick: Salio lako ni TZS 1,250,000. Weka zaidi leo!",
    "50pick: Sasa unaweza kuwa na hadi TZS 10,000,000 kwenye pochi yako.",
  ]);
}
{
  // ⭐ 7.3 · M3 (the lead's ruling) · MB-47's own shape and the plain winnings words: the report's twelve sentences — each
  // passed at rounds 12 and 16.
  refuseAll("7.3 · ⭐ round 17 (M3) · the review's claim", [
    "50pick: Entry costs TZS 1,000 for a shot at TZS 50,000,000.",
    "50pick: A shot at TZS 50,000,000 for just TZS 1,000.",
    "50pick: Kwa TZS 1,000 tu, nafasi ya TZS 50,000,000.",
    "50pick: TZS 1,000 today could become TZS 50,000,000 on Friday.",
    "50pick: TZS 1,000 leo, TZS 50,000,000 Ijumaa.",
    "This week's payout is TZS 50,000,000. Play on 50pick!",
    "Malipo ya wiki hii ni TZS 50,000,000. Cheza 50pick!",
    "Someone just took home TZS 8,000,000. Next could be you!",
    "Mtu mmoja amechukua TZS 8,000,000 wiki hii. Wewe je?",
    "Want to be rich? TZS 10,000,000 every Friday.",
    "50pick: Do you want to win something really big this week? TZS 50,000,000.",
    "50pick: Unataka kushinda kitu kikubwa sana wiki hii pamoja nasi? TZS 50,000,000.",
  ]);
  // …each rule on its own: a getting verb, a shot at the figure, the next sentence, a stake beside it, money asked about, a
  // payout heading it — and a market question about someone else that still joins a figure its own words leave unread.
  refuseAll("7.3b · ⭐ round 17 (M3) · one rule alone", [
    "50pick: Someone just took home TZS 8,000,000.",
    "50pick: Mtu mmoja amechukua TZS 8,000,000 wiki hii.",
    "50pick: A chance at TZS 50,000,000 this Friday.",
    "50pick: Nafasi ya TZS 50,000,000 wiki hii!",
    "50pick: Mtu mmoja ana TZS 8,000,000 sasa. Wewe je?",
    "50pick: Someone has TZS 8,000,000 now. You could be next!",
    "50pick: TZS 1,000,000 inaweza kuwa TZS 50,000,000 Ijumaa.",
    "50pick: TZS 1,000 for TZS 50,000,000? Yes!",
    "50pick: Need cash? TZS 10,000,000 every Friday.",
    "50pick: Unataka utajiri? TZS 10,000,000 kila Ijumaa.",
    "50pick: Malipo: TZS 50,000,000 wiki hii.",
    "50pick: Will Simba win? TZS 50,000,000 this week.",
    "50pick: Want to win? Withdraw up to TZS 5,000,000 a day.",
  ]);
  // …while a third party's own sums, a figure its own words read as a price or a limit after a market question about
  // someone else, and a currency that heads the next number (§1's "Lipa Namba 5566778 Tsh 2000 leo.") stay ordinary.
  passAll("7.3c · control · round 17 (M3) · ordinary copy beside the new rules", [
    "50pick: Simba spent TZS 1,000 on posters and TZS 10,000,000 on a striker.",
    "50pick: Mchezaji analipwa TZS 50,000 kwa wiki, yaani TZS 2,600,000 kwa mwaka.",
    "50pick: Will Simba win the derby? VIP tickets cost TZS 1,000,000.",
    "50pick: Simba's new stadium cost TZS 10,000,000,000. Will you be there on Saturday?",
    "50pick: Tickets for the VIP box cost TZS 1,000,000; the stadium cost TZS 10,000,000,000.",
    "50pick: You can now withdraw up to TZS 5,000,000 a day, with a fee of TZS 1,000.",
  ]);
  // …and a payment ("malipo") whose own object is a tax, a fee or a levy is one the platform owes, by H2's own lift — while
  // one that says there was none stays the prize it heads.
  passAll("7.3d · control · round 17 (M3) · a tax heading 'malipo'", [
    "50pick: Malipo ya kodi ya TZS 50,000,000 kwa TRA yamekamilika.",
    "50pick: Malipo ya ada ya TZS 1,000,000 yamefanyika.",
  ]);
  refuseAll("7.3e · ⭐ round 17 (M3) · a denied tax heading 'malipo'", [
    "50pick: Malipo bila kodi: TZS 50,000,000 wiki hii!",
  ]);
  // …and the same getting verb in its other shapes — "walk away with", "went home with", and "took … home" around the
  // figure — while a "take … home" that is not about the figure stays ordinary.
  refuseAll("7.3f · ⭐ round 17 (M3) · a getting verb in another shape", [
    "50pick: Last week one player took TZS 8,000,000 home.",
    "50pick: Walk away with TZS 50,000,000 this Friday!",
    "50pick: Someone went home with TZS 8,000,000 last week.",
  ]);
  passAll("7.3g · control · round 17 (M3) · a take or a home that is not the figure's", [
    "50pick: Take the bus home after the TZS 10,000,000,000 stadium opens.",
    "50pick: The team took TZS 2,000,000,000 in sponsorship this season.",
  ]);
}
{
  // ⭐ 7.4 · M4 (the lead's ruling) · ordinary copy refused before: the report's nine sentences and its probe's tenth — a
  // deposit or a withdrawal in the Swahili verb's every form and the English past, a third person's wait, "mfuko" as a fund.
  passAll("7.4 · ⭐ round 17 (M4) · the review's ordinary sentence", [
    "50pick: Ukiweka TZS 1,000,000 utapata bonasi ya TZS 10,000.",
    "50pick: Ukitoa TZS 2,000,000 leo, pesa inafika ndani ya saa moja.",
    "50pick: Umeweka TZS 1,500,000 mwezi huu.",
    "50pick: You deposited TZS 1,000,000 this month.",
    "50pick: You withdrew TZS 2,000,000 last week.",
    "50pick: Mashabiki wanasubiri derby: uwanja wa TZS 10,000,000,000 umekamilika.",
    "50pick: Simba wanasubiri mchezaji wa TZS 1,000,000,000 kutoka Ulaya.",
    "50pick: 50pick imechangia TZS 5,000,000 kwa Mfuko wa Elimu wa Taifa.",
    "50pick: Tumechangia TZS 10,000,000 kwenye mfuko wa hospitali ya Amana.",
    "Ukiweka TZS 1,000,000 utapata bonasi ya TZS 10,000.",
  ]);
  passAll("7.4b · control · round 17 (M4) · a deposit, a third party's wait, a fund", [
    "50pick: Bonasi ya TZS 10,000 kwa amana ya TZS 1,000,000.",
    "50pick: Get a TZS 10,000 bonus when you deposit TZS 1,000,000.",
    "50pick: Ukiweka hadi TZS 5,000,000 kwa siku, pesa inaingia mara moja.",
    "50pick: You deposited TZS 1,000,000 and withdrew TZS 500,000 this month.",
    "50pick: Amana yako ya TZS 1,000,000 imepokelewa.",
    "50pick: Fans await the derby: the TZS 10,000,000,000 stadium is complete.",
    "50pick: Usajili wa Simba wa TZS 1,500,000,000 umekamilika; mashabiki wanasubiri.",
    "50pick: Mfuko wa Pensheni wa TZS 1,000,000,000 umezinduliwa.",
  ]);
  // …while the reader's or an impersonal wait, a wait for the reader, the figure itself waiting, and "mfuko" in a prize's
  // sense stay claims (2.33's "Mfuko wa TZS 50,000,000 wiki hii!" among them, above).
  refuseAll("7.4c · ⭐ round 17 (M4) · a wait for the reader, or a prize fund", [
    "50pick: TZS 50,000,000 awaits!",
    "50pick: TZS 50,000,000 is waiting.",
    "50pick: TZS 50,000,000 zinakungoja!",
    "50pick: Wanakusubiri TZS 50,000,000!",
    "50pick: Mfuko wa wiki hii ni TZS 50,000,000!",
    "50pick: Mfuko mkubwa wa TZS 50,000,000 wiki hii!",
  ]);
}
{
  // ⭐ 7.5 · L2 (the lead's ruling) · the lint's comments say what is enforced — none of the six the review read as a way out
  // (a phone, a count, a tax word, a third person, an account word, a noun before a you-verb) is left in its round-15 words;
  // the two whose rules H2 and H3 replaced say what is enforced now, and the other four are marked as rewritten.
  // S6-LINT 1 · the lint is two files now: the tagged rules (client-safe) and the untagged rules (the server's alone).
  const lintSrc = ["src/lib/marketing/millionea-claims.ts", "src/lib/server/marketing/millionea-untagged.ts"]
    .map((rel) => readFileSync(join(ROOT, rel), "utf8").split(CR).join("")).join(LF);
  const WAYS_OUT = [
    "is a phone, never a figure (round 12)",
    "is a count, never a claim (rounds 5, 6 and 11)",
    "a payment the platform owes, not a payout (round 15)",
    "the figure is theirs, not the reader's (round 12)",
    "is an account's, not a prize, when no prize word stands there (round 15)",
    "is that noun's verb, not the reader's.",
  ];
  const left = WAYS_OUT.filter((w) => lintSrc.includes(w));
  ok("7.5 · ⭐ round 17 (L2) · the lint's comments say what is enforced: none of the six round-15 sentences that read as a way out is left",
    lintSrc.length > 20_000 && left.length === 0 && lintSrc.split("⭐ Enforced (round 17, L2)").length - 1 === 4
      && lintSrc.includes("Enforced: a payment by 50pick is its") && lintSrc.includes("Enforced: the reader's"), J(left));
}
{
  // ⭐ 7.6 · L3 · a look-alike for a figure's leading one — "l", "I", "|" — is read as the one it stands for, beside the round-7
  // "O" for a zero: the report's two sentences, the same in other groupings, and the normal form itself.
  refuseAll("7.6 · ⭐ round 17 (L3) · a look-alike leading one", [
    "Win TZS l,000,000 this week!",
    "Win TZS I,OOO,OOO this week!",
    "50pick: Win TZS l 000 000 this week!",
    "50pick: Shinda TZS l,OOO,OOO!",
    "50pick: |,000,000 could be yours!",
  ]);
  ok("7.6b · ⭐ round 17 (L3) · the normal form reads each look-alike as its digit: “l,000,000”, “I,OOO,OOO”, “| 000 000”",
    claims.normalizeClaimText("l,000,000") === "1,000,000" && claims.normalizeClaimText("I,OOO,OOO") === "1,000,000"
      && claims.normalizeClaimText("| 000 000") === "1 000 000",
    J(["l,000,000", "I,OOO,OOO", "| 000 000"].map((t) => claims.normalizeClaimText(t))));
}
{
  // ⭐ 7.7 · L4 (OD42) · a campaign is written in Swahili, with an optional English body — the two languages these rules read:
  // a body in Chinese characters is refused, in words, for any campaign but the one exemption. (The review's two
  // sentences, built from their code points: §1–§4's no-escape rule is kept for §7 too.)
  const HAN_SENTENCES = [
    `50pick${cc(0xFF1A)}${cc(0x672C, 0x5468, 0x5956, 0x91D1)} TZS 50,000,000${cc(0xFF01)}`,
    `50pick${cc(0xFF1A)}${cc(0x8D62, 0x53D6)} TZS 50,000,000${cc(0xFF01)}`,
  ];
  HAN_SENTENCES.forEach((text, i) => {
    const u = plain(text);
    ok(`7.7 · ⭐ round 17 (L4) · the review's Chinese body ${i + 1} of ${HAN_SENTENCES.length} is refused in words`,
      !u.ok && u.problems.includes(claims.CAMPAIGN_HAN_SCRIPT), J(u.problems));
  });
  const tagged = claims.millioneaCampaignProblems(`${FACTS} ${cc(0x6B22, 0x8FCE)}`, TAGGED);
  const exempt = claims.millioneaCampaignProblems(HAN_SENTENCES[0] ?? "", claims.MILLIONEA_EXEMPT);
  ok("7.7b · ⭐ round 17 (L4) · a Millionea campaign's Chinese body is refused for it too — and only the one exemption (a classic campaign sending since before the rules) is not",
    tagged.includes(claims.CAMPAIGN_HAN_SCRIPT) && exempt.length === 0, J({ tagged, exempt }));
  const draft = validateCampaignTemplate({ name: "Derby week", bodySw: "50pick: Habari, soka leo.", bodyEn: `50pick: ${cc(0x4F60, 0x597D)}, derby tonight.`, nameFallbackSw: "Rafiki", nameFallbackEn: "Friend" }, "", SAVE_RULES);
  ok("7.7c · ⭐ round 17 (L4) · the save says it on the body that holds it: a Chinese line in the English body is refused there, the Swahili body is not",
    !draft.ok && (draft.problems.bodyEn ?? []).includes(claims.CAMPAIGN_HAN_SCRIPT) && draft.problems.bodySw === undefined, J(draft.problems));
}

// ── §9 · S6-LINT — the claims lint while Millionea is dark (the lead's ruling 6) and the lint round's findings ───────────
console.log(`${LF}§9 · ⭐ S6-LINT — the untagged rules are the server's alone (ruling 6), and the lint round's findings`);
/** A module's first line of code (comments and blank lines skipped): where a "use client" or "use server" directive stands. */
const firstCodeLine = (src: string): string => {
  let inBlock = false;
  for (const raw of src.split(LF)) {
    const l = raw.split(CR).join("").trim();
    if (inBlock) { if (l.includes("*/")) inBlock = false; continue; }
    if (l === "" || l.startsWith("//")) continue;
    if (l.startsWith("/*")) { inBlock = !l.includes("*/"); continue; }
    return l;
  }
  return "";
};
const directive = (src: string, word: "client" | "server") => {
  const l = firstCodeLine(src);
  return l.startsWith(`"use ${word}"`) || l.startsWith(`'use ${word}'`);
};
/** Whitespace, as a class built from its codes (this file holds no backslash): space, tab, line feed, carriage return. */
const WS = `[ ${cc(9)}${cc(10)}${cc(13)}]`;
/** The value imports a module makes: `import … from`, `export … from` (a type-only one is erased at build and not followed),
 *  a bare `import "…"`, and a dynamic `import("…")` (the bundler ships its chunk too). */
const STATIC_FROM = new RegExp(`^[ ${cc(9)}]*(?:import|export)${WS}+([^;]*?)${WS}from${WS}*["']([^"']+)["']`, "gm");
const BARE_IMPORT = new RegExp(`^[ ${cc(9)}]*import${WS}*["']([^"']+)["']`, "gm");
const DYNAMIC_IMPORT = new RegExp(`import${WS}*[(]${WS}*["']([^"']+)["']${WS}*[)]`, "g");
const TYPE_ONLY = new RegExp(`^type${WS}`);
const resolveSpec = (from: string, spec: string): string | null => {
  const base = spec.startsWith("@/") ? join(ROOT, "src", spec.slice(2)) : spec.startsWith(".") ? join(dirname(from), spec) : null;
  if (base === null) return null;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
};
/** Every module a set of client modules' value-import graph reaches — stopping at a "use server" module, of which the
 *  bundler sends the browser only a reference. `extra` stands in for a file's source (a planted control). */
const clientGraph = (roots: readonly string[], extra: ReadonlyMap<string, string> = new Map()): Set<string> => {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const f = stack.pop() as string;
    if (seen.has(f)) continue;
    seen.add(f);
    const src = extra.get(f) ?? readFileSync(f, "utf8");
    if (directive(src, "server")) continue;
    const specs: string[] = [];
    for (const m of src.matchAll(STATIC_FROM)) if (!TYPE_ONLY.test((m[1] ?? "").trim())) specs.push(m[2] ?? "");
    for (const m of src.matchAll(BARE_IMPORT)) specs.push(m[1] ?? "");
    for (const m of src.matchAll(DYNAMIC_IMPORT)) specs.push(m[1] ?? "");
    for (const s of specs) {
      const r = resolveSpec(f, s);
      if (r !== null) stack.push(r);
    }
  }
  return seen;
};
const ABS = (rel: string) => join(ROOT, rel);
const UNTAGGED_REL = "src/lib/server/marketing/millionea-untagged.ts";
const COMPOSER_ROOT = ABS("src/app/admin/campaigns/new/composer-client.tsx");
{
  // ⭐ 9.1 · S6-LINT 1 (ruling 6's correction: "the untagged rules run server-side only") · no client module's value-import
  // graph reaches the untagged rules — the composer's (the live counter's) first, then every "use client" module in src —
  // and no module the counter's graph reaches declares any part of them. Controls first: the walker reaches the tagged
  // rules from the composer, and the untagged rules from the save, where they ARE imported.
  const composer = clientGraph([COMPOSER_ROOT]);
  const reachesFromSave = clientGraph([ABS("src/lib/server/marketing/campaign-draft.ts")]);
  ok("9.0 · control · the walker works: the composer's client graph reaches the composer's one door and the tagged rules, and a save's graph reaches the untagged rules",
    composer.has(ABS("src/lib/marketing/footer.ts")) && composer.has(ABS("src/lib/marketing/millionea-claims.ts"))
      && composer.has(ABS("src/lib/marketing/campaign-template.ts")) && reachesFromSave.has(ABS(UNTAGGED_REL)) && composer.size > 20,
    `composer graph ${composer.size} modules · save graph ${reachesFromSave.size}`);
  const DECLARES = ["export const MILLIONEA_UNTAGGED", "const SIGNAL_WORDS", "function millionFigure(", "export function millioneaSignals(", "export const untaggedCampaignProblems"];
  const untaggedSrc = readFileSync(ABS(UNTAGGED_REL), "utf8");
  ok("9.0 · control · the untagged rules' own declarations are what the census looks for: each stands in their module",
    DECLARES.every((d) => untaggedSrc.includes(d)), J(DECLARES.filter((d) => !untaggedSrc.includes(d))));
  const declaring = [...composer].filter((f) => DECLARES.some((d) => readFileSync(f, "utf8").includes(d))).map((f) => relative(ROOT, f));
  ok("9.1 · ⭐ S6-LINT 1 · the composer's live counter carries no untagged rule: its client graph never reaches them, and no module in it declares any part of them",
    !composer.has(ABS(UNTAGGED_REL)) && declaring.length === 0, J(declaring));
  const clientRoots: string[] = [];
  const walkClient = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walkClient(p);
      else if (/[.]tsx?$/.test(n) && directive(readFileSync(p, "utf8"), "client")) clientRoots.push(p);
    }
  };
  walkClient(join(ROOT, "src"));
  const everyClient = clientGraph(clientRoots);
  ok("9.1b · ⭐ S6-LINT 1 · …nor does any other client module: the graph of every \"use client\" module in src never reaches them",
    clientRoots.length > 100 && clientRoots.includes(COMPOSER_ROOT) && !everyClient.has(ABS(UNTAGGED_REL)),
    `${clientRoots.length} client modules · ${everyClient.size} reached`);
  const FOOTER = ABS("src/lib/marketing/footer.ts");
  const planted = new Map([[FOOTER, `${readFileSync(FOOTER, "utf8")}${LF}import { untaggedCampaignProblems } from "@/lib/server/marketing/millionea-untagged";${LF}`]]);
  ok("9.1c · control · an import of the untagged rules planted in the composer's one door is caught",
    clientGraph([COMPOSER_ROOT], planted).has(ABS(UNTAGGED_REL)));

  // ⭐ 9.2 · S6-LINT 1 · so the composer's live counter judges a campaign not tagged Millionea exactly as before — a Millionea
  // signal and a Chinese line are refused only where a server door hands the untagged rules in: the save.
  const SIGNAL_BODY = "50pick: Shinda hadi TZS 2,000,000 kwenye Up & Down leo!";
  const HAN_BODY = `50pick: ${cc(0x4F60, 0x597D)}, derby tonight.`;
  const draftOf = (bodySw: string, bodyEn = "") => ({ name: "Derby promo", bodySw, bodyEn, nameFallbackSw: "Rafiki", nameFallbackEn: "Friend" });
  const screen = validateCampaignTemplate(draftOf(SIGNAL_BODY), "");
  const atSave = validateCampaignTemplate(draftOf(SIGNAL_BODY), "", { untagged: UNT.untaggedRulesFor("Derby promo") });
  ok("9.2 · ⭐ S6-LINT 1 · the live counter (no rules handed in) refuses nothing in an untagged body that speaks Millionea's words, while the save's verdict refuses it in the rule's words",
    screen.ok && Object.keys(screen.problems).length === 0 && !atSave.ok && (atSave.problems.bodySw ?? []).some(untagged),
    J({ screen: screen.problems, save: atSave.problems }));
  const hanScreen = validateCampaignTemplate(draftOf("50pick: Habari, soka leo.", HAN_BODY), "");
  const hanSave = validateCampaignTemplate(draftOf("50pick: Habari, soka leo.", HAN_BODY), "", { untagged: UNT.untaggedRulesFor("Derby promo") });
  ok("9.2 · S6-LINT 1 · …and a Chinese line: the counter says only what it said before (the GSM alphabet's sentence), the save adds the Chinese-characters rule",
    (hanScreen.problems.bodyEn ?? []).length > 0 && !(hanScreen.problems.bodyEn ?? []).includes(claims.CAMPAIGN_HAN_SCRIPT)
      && J(hanSave.problems.bodyEn) === J([...(hanScreen.problems.bodyEn ?? []), claims.CAMPAIGN_HAN_SCRIPT]),
    J({ screen: hanScreen.problems.bodyEn, save: hanSave.problems.bodyEn }));

  // ⭐ 9.3 · S6-LINT 1 · the wiring: the one decision (`untaggedRulesFor`) answers the rules for a campaign not tagged
  // Millionea and none for a tagged one; the save hands its answer to the one verdict, and every server door's template
  // carries it — the test send, the engine, the composer's previews.
  const code9 = (rel: string) => readFileSync(ABS(rel), "utf8").split(CR).join("");
  const ATTACHES = "untaggedRules: untaggedRulesFor(c.name),";
  const doors = ["src/lib/server/marketing/campaign-test-send.ts", "src/lib/server/marketing/engine.ts", "src/app/admin/campaigns/new/composer-loader.ts"];
  ok("9.3 · S6-LINT 1 · the wiring · the one decision answers the untagged rules for an untagged name and none for a tagged one; the save hands them to its verdict; each send and preview door's template carries them",
    UNT.untaggedRulesFor("Derby promo") === UNT.untaggedCampaignProblems && UNT.untaggedRulesFor("Millionea promo") === undefined
      && code9("src/lib/server/marketing/campaign-draft.ts").split('deps.validate(fields, "", { untagged: untaggedRulesFor(fields.name) })').length === 2
      && doors.every((rel) => code9(rel).split(ATTACHES).length === 2),
    J(doors.map((rel) => code9(rel).split(ATTACHES).length - 1)));
  // ⭐ 9.3b · …and the composer's typed-test preview, which the server renders, judges a saved untagged draft as its test send
  // will: one that speaks Millionea's words is not offered, in the rule's words — a plain one is, with its preview.
  const previewRow = (bodySw: string): any => ({
    id: "cmp_s6lint_preview", name: "Derby promo", status: "DRAFT", bodySw, bodyEn: null, nameFallbackSw: null, nameFallbackEn: null,
    sourcePhrase: null, draftRevision: 3,
  });
  const ADULT = { outreachOpen: true, adult: { text: "Nina miaka 18 au zaidi.", v: 1 } };
  const refusedView = LOADER.composeTypedView(previewRow(SIGNAL_BODY), ADULT);
  const plainView = LOADER.composeTypedView(previewRow("50pick: Habari, soka leo."), ADULT);
  ok("9.3b · S6-LINT 1 · the composer's typed-test preview judges a saved untagged draft as its test send will: Millionea's words refused in the rule's words, a plain draft offered with its preview",
    !refusedView.allowed && untagged(String(refusedView.why)) && refusedView.preview === null
      && plainView.allowed && plainView.preview?.SW === "50pick: Habari, soka leo.",
    J({ refused: [refusedView.allowed, refusedView.why], plain: [plainView.allowed, plainView.preview] }));
}

/**
 * The floor: the checks this file makes when every one runs, counted from the source (§1 121+1+1+21 = 144 ·
 * §2 20+2+3+8+2+36+1+1+3+2+3+2+10+7+7+11+16+7+10+4+12+11+9+11+9+6+2+2+3+3+4+1+5+1+4+1 = 239 · §3 1+16+1+1+2 = 21 · §4
 * 4+5+8+9+5+5+19+7 = 62 · §5 6 · §6 8 = 480), never from a run. ⏳ Re-pin from the first green run's printed count; it only
 * rises. ⭐ Round 17 · re-pinned to each green run's printed count (the floor line's "— N ran"): with §7.0–7.1 (H2), 548;
 * with §7.2 (H3), 560; with §7.3 (M3), 591; with §7.4 (M4), 615; with §7.5 (L2), 616; with §7.6 (L3), 622; with §7.7
 * (L4), 626; with §7.3d–e (M3, a tax heading "malipo"), 629; with §7.3f–g (M3, a getting verb's other shapes), 634.
 * ⭐ S6-LINT · re-pinned the same way: with §9.0–9.3b (S6-LINT 1, the untagged rules the server's alone), 643.
 */
const FLOOR = 643;
ok(`floor · at least ${FLOOR} checks ran before this one (a suite that goes blind prints fewer)`, pass + fail >= FLOOR, `${pass + fail} ran`);
console.log(`${LF}test:maswali-claims: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
