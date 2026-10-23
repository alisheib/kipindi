/**
 * MASWALI MILLIONEA — WHAT A MARKETING MESSAGE MAY SAY ABOUT IT (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 3, MB-47,
 * MB-88, OD-25, OD-30, R-HEADLINE; the lane-N review's HIGH 1 and MEDIUM 6, as the coordinator decided them).
 *
 * 🔴 THE FINDING (MB-47). The SMS composer sent text as typed, so "Shinda TZS 1,000,000 kwa TZS 1,000!" could go out, and
 *    it is false three ways: a ticket is a set of answers, not a win; the jackpot changes every week and is shared by every
 *    10/10 ticket; and the price is not a stake against a prize. 🔴 AND THE FIRST LINT WAS GATED ON THE PRODUCT'S NAME: the
 *    same sentence passed by leaving "Millionea" out, and "Millionéa", "Millionea2026" or "Mamilionea" walked past it.
 * ⭐ A CAMPAIGN DECLARES ITS PRODUCT. A campaign whose staff-only name begins with the word "Millionea" is a Millionea
 *    campaign (`campaignProductOf`): the tag is the campaign's own name, kept with the rest of the draft and frozen with it
 *    at its confirmation, so no column and no migration were needed. Then, in the composer's one door (`footer.ts`,
 *    `millioneaCampaignProblems`), on a text NORMALISED first (case and accents gone, invisible characters dropped, letter
 *    and digit runs split, look-alike letters and digits folded):
 *    · a Millionea campaign carries the three R-HEADLINE facts — the Jackpot; "shared equally by every 10/10 ticket"; "N%
 *      fee at payout" — and claims nothing else: no amount, no win, no winner named or described, no sum, no income, no
 *      guarantee, no rank, no chance — and no Chinese characters (OD42: Swahili, and an optional English body);
 *    · WHERE THE SERVER READ THE WEEK (the save, the test send, the real send: `millioneaFactsProblems`), N is the week's
 *      own fee, and the campaign is refused while Millionea is not open to everyone, or while the facts cannot be read;
 *    · a campaign NOT tagged Millionea meets the UNTAGGED RULES (its Millionea signals refused in words — tag it Millionea,
 *      or reword it — and a body in Chinese characters) only where a server door hands them in
 *      (`MillioneaComposeContext.untagged`): they are the server's alone (`lib/server/marketing/millionea-untagged.ts`,
 *      S6-LINT 1), and without them nothing here reads an untagged campaign — its problems are exactly what they were.
 *      ⛔ A server door hands them in only while Millionea's ceiling is ACTIVE (the lead's ruling 6, S6-LINT 6): below it a
 *      campaign not tagged Millionea is judged, saved and sent exactly as before the lint, and nothing of the lint runs at
 *      boot.
 *      ⛔ AND IN THIS RELEASE NOT AT ALL (the lead's ruling of 2026-10-23, S6-SHIP 5): the untagged rules are off
 *      (`MILLIONEA_UNTAGGED_RULES_ON`, `millionea-untagged.ts`), so this lint judges only campaigns tagged Millionea; a
 *      campaign not tagged Millionea, in any language, goes exactly as before the lint, whatever the ceiling.
 * ⭐ `{pct}` IS NEVER TYPED. The approved wordings hold the placeholder; `maswali-marketing.ts` fills it from the week's own
 *    frozen fee for the officer to copy.
 * ⛔ NEVER A WINNER (OD-30, MB-88): the platform holds no written opt-in to publicity, so a winner is never named, described
 *    or congratulated.
 * ⛔ A SENTENCE HERE NEVER QUOTES A FIGURE: it can be stored (a refusal, a pause's detail), and a run of digits may be a
 *    phone number (§5.14) — a figure is named as "a figure", never repeated.
 * Pure and client-safe: the composer's live counter runs the tagged rules in the browser. ⛔ No server import, ever — and no
 *    reading of an untagged campaign (`test:maswali-claims` §9 holds every client module's import graph clear of it).
 */

/** The facts a stated fee is held to. */
export type MillioneaClaimFacts = { feeRate: number };

/** What a server door reads for a Millionea campaign: the week's fee at payout, and whether Millionea is open to everyone. */
export type MillioneaFacts = { feeRate: number; live: boolean };

/**
 * The facts a door hands the composer for a Millionea campaign: read (`MillioneaFacts`), unreadable (`null` — the campaign
 * is refused, never sent unchecked), or not asked (`undefined` — the composer's live counter in the browser; the save,
 * the test send and the send each ask).
 */
export type MillioneaComposeFacts = MillioneaFacts | null | undefined;

/** The two languages a campaign is written in (OD42). */
export type MillioneaWordingLocale = "SW" | "EN";

/** The products a campaign may declare. A campaign that declares none is every other campaign. */
export type CampaignProduct = "MILLIONEA";

/**
 * ⭐ S6-LINT 1 · THE UNTAGGED RULES, as a server door hands them in: a campaign not tagged Millionea, judged — every problem
 * it has under them, one sentence each (`untaggedCampaignProblems`, `lib/server/marketing/millionea-untagged.ts`). The
 * server's alone: no client module imports them.
 */
export type UntaggedCampaignRules = (text: string) => string[];

/**
 * A campaign's product, for a Millionea campaign the facts its door read, for any other the untagged rules its server door
 * handed in, and the text the rules judge when it is not the message itself: a recipient's render hands the TEMPLATE's
 * body with the counter's reserved name (`judged`), so a recipient is never refused for her own name (a Zawadi, a Bahati, a
 * Rich) and the send judges what the counter judged.
 */
export type MillioneaComposeContext = {
  product: CampaignProduct | null; facts?: MillioneaComposeFacts; judged?: string;
  /** ⛔ Round 4, rule 6 · the rules REPORT instead of refuse (`MILLIONEA_EXEMPT`). Absent: they refuse. */
  exempt?: true;
  /** ⭐ S6-LINT 1 · for a campaign not tagged Millionea, the untagged rules a server door handed in. Absent: no Millionea rule
   *  reads it — the composer's live counter, which runs the tagged rules alone. */
  untagged?: UntaggedCampaignRules;
};

/** Every other campaign's context, where no server door handed in the untagged rules: no Millionea rule reads it. */
export const UNTAGGED_CAMPAIGN: MillioneaComposeContext = Object.freeze({ product: null });

/**
 * ⛔ ROUND 4, RULE 6 · THE ONE EXEMPTION — a classic campaign SENDING since before these rules first ran is not refused by
 * them: `renderForRecipient` composes it with this context and carries what the rules would refuse as `flagged` instead,
 * from a template the engine alone marks (`millioneaLint: "flag"`, `millionea-lint-epoch.ts`). Nothing else may pass it —
 * never a campaign named as Millionea's (round 5, HIGH 3).
 */
export const MILLIONEA_EXEMPT: MillioneaComposeContext = Object.freeze({ product: null, exempt: true as const });

/** A Millionea campaign while its facts cannot be read. */
export const MILLIONEA_FACTS_UNREAD = "The week's fee at payout could not be read, so a Millionea campaign cannot be saved or sent now.";
/** A Millionea campaign while Millionea is not open to everyone. */
export const MILLIONEA_NOT_LIVE = "Millionea is not open to everyone yet, so no campaign may be about it.";
/** ⭐ Round 17 (L4) · a body in Chinese characters, refused for a Millionea campaign and wherever the untagged rules run
 *  (OD42: a campaign is written in Swahili, with an optional English body — and these rules read those two languages alone). */
export const CAMPAIGN_HAN_SCRIPT = "Campaign messages are written in Swahili or English: remove the Chinese characters from this body.";

/** A door's read of the week's facts, never throwing: a reader that is absent, fails or answers nothing is unread (null). */
export async function millioneaFactsFrom(read: (() => Promise<MillioneaFacts | null>) | undefined): Promise<MillioneaFacts | null> {
  if (!read) return null;
  try {
    const facts = await read();
    return facts && Number.isFinite(facts.feeRate) && typeof facts.live === "boolean" ? facts : null;
  } catch {
    return null;
  }
}

/* ══ THE NORMAL FORM ═════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Letters of other scripts that pass for Latin ones, keyed by code point (none is typed here): Cyrillic, Greek, and a few
 *  Latin letters NFKD does not take apart. */
const LOOK_ALIKE_LETTERS: ReadonlyMap<number, string> = new Map<number, string>([
  [0x0430, "a"], [0x0435, "e"], [0x0451, "e"], [0x0456, "i"], [0x0458, "j"], [0x043A, "k"], [0x043C, "m"], [0x043E, "o"],
  [0x0440, "p"], [0x0441, "c"], [0x0442, "t"], [0x0443, "y"], [0x0445, "x"], [0x0455, "s"], [0x0501, "d"], [0x04CF, "l"],
  [0x04BB, "h"], [0x03B1, "a"], [0x03B5, "e"], [0x03B9, "i"], [0x03BA, "k"], [0x03BD, "v"], [0x03BF, "o"], [0x03C1, "p"],
  [0x03C4, "t"], [0x03C5, "u"], [0x03C7, "x"], [0x0131, "i"], [0x0142, "l"], [0x0111, "d"], [0x00F8, "o"], [0x0127, "h"],
  // Round 3 (B6) · the Greek capitals an SMS can carry, lowered.
  [0x03BB, "a"], [0x03C3, "e"], [0x03C2, "e"],
]);

/** Digits and signs that pass for letters inside a word — folded for the product's words and the claims, never a figure. */
export const LOOK_ALIKE_DIGITS: Readonly<Record<string, string>> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

/** A mobile-money wallet's name, read as one word where it is the brand — never a figure's size, and never money (round 4,
 *  M4; round 5, HIGH 1 and LOW 15). */
const WALLETS = new RegExp([
  String.raw`(?<![a-z0-9])(?:m|t)\s*[-.]\s*pesa(?![a-z])`,
  String.raw`(?<![a-z0-9])(?:m|t)\s*pesa(?![a-z])`,
  String.raw`(?<![a-z])(?:tigo|halo|ezy)\s*[-.]?\s*pesa(?![a-z])`,
  String.raw`(?<![a-z])airtel\s*[-.]?\s*money(?![a-z])`,
].join("|"), "g");

/** A short number right before a wallet's letter (round 7). */
const SHORT_NUMBER_BEFORE = /(?:^|[^0-9.,])[0-9]{1,3}(?:[.,][0-9]{1,2})?\s{1,3}$/;
/** A figure's own look-alikes (rounds 7 and 17): an "o" for a zero inside a grouped figure, a leading "l", "I" or "|" for
 *  its one (round 17, L3) — grouped by commas or dots, or by spaces in two groups or more — and an apostrophe or an
 *  underscore between its thousands. Each is read as the digit it stands for. */
const FIGURE_O = /(?<![a-z0-9])[0-9li|][0-9o]*(?:(?:[,.][0-9o]{3})+|(?: [0-9o]{3}){2,})(?![a-z0-9])/g;
const THOUSANDS_MARK = new RegExp(`(?<=[0-9])['_${String.fromCharCode(0x2019)}](?=[0-9]{3}(?![0-9]))`, "g");
/** A size written onto a currency's or a wallet's word ("5mtzs", "5m-pesa"): the size, then the word (round 7). */
const GLUED_SIZE = /(?<![0-9.,])([0-9]+(?:[.,][0-9]+)?)(m|mn|mil|mill|mln|bn|b|bil|k)-?(pesa|tshs|tzs|tsh|shs|sh)\b/g;

/** A digit of the Arabic scripts, read as the ASCII digit it is (round 7). */
function asciiDigit(ch: string): string | null {
  const c = ch.codePointAt(0) ?? -1;
  if (c >= 0x0660 && c <= 0x0669) return String(c - 0x0660);
  if (c >= 0x06F0 && c <= 0x06F9) return String(c - 0x06F0);
  return null;
}

/** A wallet's name as one word, read with the number before it (round 7). */
function walletFold(m: string, offset: number, whole: string): string {
  if (/^[mt]\s*pesa$/.test(m)) {
    const before = whole.slice(0, offset);
    if (SHORT_NUMBER_BEFORE.test(before) && !PAY_BEFORE.test(before)) return m;
  }
  return m.replace(/[^a-z]+/g, "");
}

/** Compatibility forms apart and their marks gone, invisible format characters dropped, lower case, look-alike letters
 *  and digits folded, a figure's own look-alikes read, a wallet's name one word — the form every reading starts from. */
export function baseForm(text: string): string {
  const lowered = (text ?? "").normalize("NFKD").replace(/\p{M}+/gu, "").replace(/\p{Cf}+/gu, "").toLowerCase();
  let out = "";
  for (const ch of lowered) out += asciiDigit(ch) ?? LOOK_ALIKE_LETTERS.get(ch.codePointAt(0) ?? -1) ?? ch;
  out = out.replace(FIGURE_O, (m) => m.replace(/^[li|]/, "1").replace(/o/g, "0")).replace(THOUSANDS_MARK, ",").replace(GLUED_SIZE, "$1$2 $3");
  return out.replace(WALLETS, (m: string, offset: number, whole: string) => walletFold(m, offset, whole));
}

/** ⭐ THE NORMAL FORM: `baseForm`, with letter and digit runs apart ("Millionea2026" → "millionea 2026"). */
export function normalizeClaimText(text: string): string {
  return baseForm(text).replace(/(\p{L})(\p{Nd})/gu, "$1 $2").replace(/(\p{Nd})(\p{L})/gu, "$1 $2");
}

/** The base form with look-alike digits folded to letters ("M1llionea" → "millionea", "Sh1nda" → "shinda"). */
export function foldedForm(text: string): string {
  return baseForm(text).replace(/[013457@$]/g, (c) => LOOK_ALIKE_DIGITS[c] ?? c);
}

/* ══ TEN OF TEN, AND THE WORDS THE READINGS SHARE — a Millionea campaign's own score rule (`scoreOutsideTheFact`), which the
   untagged rules read too (`lib/server/marketing/millionea-untagged.ts`) ═══════════════════════════════════════════════ */

/** Ten of ten, the ticket the jackpot is shared by. */
const TEN = /(?<![0-9/])10\s*[/]\s*10(?![0-9])(?!\s*[/]\s*[0-9])|\b10\s+(?:kati ya|out of|of)\s+10\b/g;
/** The words a date is written with (round 4, M1 and L8; round 5, MEDIUM 6 and LOW 15). */
const DATE_BEFORE = /\b(?:jumatatu|jumanne|jumatano|alhamisi|ijumaa|jumamosi|jumapili|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|leo|kesho|today|tomorrow|tarehe|date|kuanzia|tangu|from|since|hadi|mpaka|until|till|by|before|kabla|on|januari|februari|machi|aprili|mei|juni|julai|agosti|septemba|oktoba|novemba|desemba|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b(?:\s+(?:hii|ijayo|this|next))?[,.:]?\s*(?:(?:ya|of|the)\s+)?$/;
/** A fixture's two sides (round 6, L3). */
const FIXTURE_BEFORE = /\b(?:vs|v|dhidi\s+ya|against)\s+[a-z]+[,.:]?\s*$/;
/** The words a deadline, a fixture or a rating is written with (round 7). */
const DEADLINE_BEFORE = /\b(?:mwisho|inaisha|itaisha|ends?|expires?|deadline|inaanza|itaanza|starts?|begins?|utasimama|itasimama|matengenezo|maintenance|ofa|offer|bonasi|bonus|mechi|match|derby|game|fixture|kickoff|rate|rated|rating|tupe|huduma|service|review)\b[^.!?;]{0,16}$/;
/** …and after. */
const DATE_AFTER = /^\s*[,.]?\s*(?:[a-z]+\s+)?(?:[0-9]{1,2}:[0-9]{2}(?![0-9])|[0-9]{1,2}\s*(?:am|pm)\b|saa\s+(?:[0-9]{1,2}(?![0-9])|moja|mbili|tatu|nne|tano|sita|saba|nane|tisa|kumi)\b)|^\s*(?:hadi|mpaka|to|until|till|-)\s*[0-9]{1,2}\s*[/]\s*[0-9]{1,2}(?![0-9])/;
/** Ten of ten that is someone's, or waits for someone, or equals a figure: a claim, whatever date stands with it (round 7). */
const SCORE_CLAIM_AFTER = /^\s*(?:(?:ni|is|are|iko)\s+)?(?:yako|zako|yenu|zenu|yours)\b|^\s*(?:i|zi)?(?:na|ta)ku(?:subiri|ngoj)|^\s*(?:is\s+)?(?:waiting\s+for\s+you|awaits\s+you)\b|^\s*=/;
/** The ticket's own description, ten of ten in words (round 6, M5). */
const TEN_WORDS = /\b10\s+sahihi\b|\b(?:all\s+(?:the\s+)?)?10\s+(?:right|correct)(?:\s+answers?)?\b|\bmaswali\s+yote\s+10\b/;
/** A ticket named right after ten of ten: the ticket's own description, never a date (round 6, M5). */
const TICKET_AFTER = /^\s*(?:tickets?|tiketi|tikiti)\b/;
/** A claim of getting (round 5, MEDIUM 6 and 7a; round 17, M3: "took home", "walk away with", "went home with", and
 *  someone who has taken it). */
export const GET_BEFORE = /(?:pat(?:a|ia|ie|e)|\b(?:get|gets|getting|got|earn|earns|score|scores|scored|collect|collects|claim|claims|chukua|jichukulie)|\b(?:take|takes|took|taking)\s+home|\b(?:walk(?:s|ed|ing)?\s+away|go(?:es|ing)?\s+home|went\s+home)\s+with|\b(?:a|wa)(?:me|li|na|ta)chukua)\s*$/;

/** True when the text says ten of ten as a score, or claims getting it (round 3, B5; round 4, M1; round 5, MEDIUM 6). */
export function tenOfTen(n: string): boolean {
  if (TEN_WORDS.test(n)) return true;
  for (const m of n.matchAll(TEN)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    const before = n.slice(Math.max(0, at - 48), at);
    if (GET_BEFORE.test(before) || GET_BEFORE.test(foldWords(before))) return true;
    if (TICKET_AFTER.test(n.slice(end, end + 24)) || SCORE_CLAIM_AFTER.test(n.slice(end, end + 24))) return true;
    const dated = DATE_BEFORE.exec(before);
    if (dated) {
      const head = before.slice(0, dated.index);
      if (GET_BEFORE.test(head) || GET_BEFORE.test(foldWords(head))) return true;
      continue;
    }
    if (FIXTURE_BEFORE.test(before) || DEADLINE_BEFORE.test(before) || DATE_AFTER.test(n.slice(end, end + 40))) continue;
    return true;
  }
  return false;
}

/** ⭐ THE ONE CURRENCY LIST (round 5, HIGH 2): the words and the signs every reading of an amount uses. */
export const CURRENCY = String.raw`(?:tshs|tzs|tsh|shs|shillingi|shilingi|shillings?|sh)`;
export const CURRENCY_SIGN = String.raw`(?:[/]=|[/]-)`;
/** A payment's own verb, then a short number (round 7). */
const PAY_BEFORE = new RegExp(String.raw`\b(?:weka|lipa|tuma|toa|deposit|pay|send|withdraw)\s+(?:${CURRENCY}[.:]?\s*)?[0-9]{1,3}(?:[.,][0-9]{1,2})?\s{1,3}$`);

/** The normal form's letter and digit runs joined back, look-alike digits folded: the words around a figure, as read. */
export function foldWords(s: string): string {
  return s.replace(/(?<=\p{L}) (?=\p{Nd})|(?<=\p{Nd}) (?=\p{L})/gu, "").replace(/[013457@$]/g, (c) => LOOK_ALIKE_DIGITS[c] ?? c);
}

/** A campaign's declared product: MILLIONEA when its staff-only name begins with the product's own name, as a word (a
 *  bracket or a quote before it is no part of the name). */
export function campaignProductOf(name: string | null | undefined): CampaignProduct | null {
  const n = normalizeClaimText(name ?? "").replace(/^[^a-z0-9]+/, "");
  return /^millionea(?![a-z0-9])/.test(n) ? "MILLIONEA" : null;
}

/* ══ THE CLAIMS A MILLIONEA CAMPAIGN MAY NOT MAKE ════════════════════════════════════════════════════════════════════ */

/** One family of claim a Millionea campaign may not make. */
export type MillioneaClaimFamily = "amount" | "win" | "winner" | "sum" | "income" | "guarantee" | "rank" | "chance";

/**
 * ⭐ THE REFUSED CLAIMS (MB-47's list — amount, shinda, milioni, uhakika, "first" — the English that says the same, the
 * income a campaign may not promise, and the winner it may not name or describe). Read on the NORMAL FORM, and again with
 * look-alike digits folded, so neither case, an accent, "1000000TZS" nor "Sh1nda" hides one.
 */
export const MILLIONEA_CLAIM_FAMILIES: ReadonlyArray<{ family: MillioneaClaimFamily; pattern: RegExp; why: string }> = [
  {
    family: "amount",
    // Round 5 (HIGH 2) · the one currency list, and its signs.
    pattern: new RegExp(String.raw`\b${CURRENCY}\b|${CURRENCY_SIGN}|\b[0-9]{1,3}(?:[,.\s][0-9]{3})+\b|\b(?!(?:19|20)[0-9]{2}\b)[0-9]{4,}\b`),
    why: "an amount — the jackpot changes every week and is shared, so a figure in an SMS is a promise it cannot keep",
  },
  {
    family: "win",
    // Round 3 (B4) · a verb in every person and tense, not only its bare form.
    pattern: /shind|pat(?:a|ia|ie)\b|\b(?:wins?|winning|won|winners?|prizes?|zawadi)\b/,
    why: "a win or a prize — a ticket is a set of answers, not a win",
  },
  {
    family: "winner",
    pattern: /\b[a-z]{2,}\s+[a-z][.](?=\s|$)|\b(?:alipata|amepata|walipata|wamepata|aliyepata|waliopata|got|scored|hit|hongera|iliyopita)\b|congrat|\blast (?:week|time|month)\b/,
    why: "a winner named or described — no written opt-in exists, so no message names, describes or congratulates one",
  },
  {
    family: "sum",
    // Round 3 (B4 · B3 · B6) · a jackpot's size in words and in short forms too — and never the first letter of a
    // hyphenated name.
    pattern: /\b(?:ma)?milioni\b|\bmillions?\b|\bbilioni\b|\bbillions?\b|\blaki\b|\belfu\b|\b[0-9]+(?:[.,][0-9]+)?\s*(?:m|mn|bn|b|bil|k|mil|mill|mln)\b(?!-)|\b(?:kubwa|nono|big|huge|massive|giant|mega)\b/,
    why: "a sum — the size of a jackpot is never a marketing claim",
  },
  {
    family: "income",
    // Round 3 (B4) · a stem in every form, not only at the start of a word.
    pattern: /tajir|\bpesa\b|\bfedha\b|\bhela\b|\bkipato\b|\bmapato\b|\bfaida\b|\brich(?:es)?\b|\bwealth\w*|\bmoney\b|\bcash\b|\bincome\b|\bearn\w*|\bprofit\w*|\bfortune\w*|\b(?:ma)?milionea\b|\bmamill?ionea\b|\bmill?ionai?res?\b/,
    why: "an income or riches — no message promises money, a fortune or a millionaire's life",
  },
  {
    family: "guarantee",
    pattern: /\b(?:uhakika|hakika|guarantee[sd]?|dhamana|sure|certain(?:ly)?|definitely)\b|\bbila shaka\b/,
    why: "a guarantee — nothing about a week's result is certain",
  },
  {
    family: "rank",
    pattern: /\b(?:first|kwanza|biggest|largest|best|number one)\b|\bbora zaidi\b|\bkubwa zaidi\b|#\s?1\b/,
    why: "a rank — no message calls Millionea or its jackpot first or biggest",
  },
  {
    family: "chance",
    pattern: /\b(?:odds|chances?|nafasi|uwezekano|probability|bahati|luck|lucky)\b/,
    why: "a chance or luck — no message states or suggests one",
  },
];

/** The headline's first fact: the word itself. */
const FACT_JACKPOT = /\bjackpot\b/;
/** The second, in either language, as the headline words it (`millionea.ruleShared`). */
const FACT_SHARED = [/\bshared equally by every 10\s*[/]\s*10 ticket\b/g, /\binagawanywa sawa kwa kila tiketi ya 10\s*[/]\s*10\b/g];
/** The third, in either language, with the fee it states captured. */
const FACT_FEE = [/\b([0-9]+(?:[.][0-9]+)?)% fee at payout\b/g, /\bada ([0-9]+(?:[.][0-9]+)?)% wakati wa malipo\b/g];

/** A rate as the headline prints it: 0.13 → "13", 0.125 → "12.5" (never a float's tail). */
export function feePctOf(rate: number): string {
  return String(Math.round(rate * 10_000) / 100);
}

/** Every fee the text states in the headline's words, as printed. */
export function statedFeesIn(text: string): string[] {
  const n = normalizeClaimText(text);
  const out: string[] = [];
  for (const re of FACT_FEE) for (const m of n.matchAll(re)) out.push(String(Number(m[1])));
  return out;
}

/** The headline facts the text does not carry. */
export function missingMillioneaFacts(text: string): Array<"jackpot" | "shared" | "fee"> {
  const n = normalizeClaimText(text);
  const out: Array<"jackpot" | "shared" | "fee"> = [];
  if (!FACT_JACKPOT.test(n)) out.push("jackpot");
  if (!FACT_SHARED.some((re) => n.match(re) !== null)) out.push("shared");
  if (statedFeesIn(text).length === 0) out.push("fee");
  return out;
}

/** "10/10" anywhere but inside the shared fact: a score, so a winner described. */
function scoreOutsideTheFact(n: string): boolean {
  let rest = n;
  for (const re of FACT_SHARED) rest = rest.replace(re, " ");
  return tenOfTen(rest);
}

/** What one family finds in the text — on the normal form, then with look-alike digits folded. */
function familyHit(f: (typeof MILLIONEA_CLAIM_FAMILIES)[number], n: string, folded: string): string | null {
  const hit = f.pattern.exec(n) ?? f.pattern.exec(folded);
  if (hit) return hit[0].trim();
  if (f.family === "winner" && scoreOutsideTheFact(n)) return "10/10";
  return null;
}

/** One family's sentence. ⛔ A figure is never repeated (§5.14). */
function familySentence(hit: string, why: string): string {
  if (hit === "10/10") return `A Millionea campaign may not say “10/10” except in “shared equally by every 10/10 ticket”: that is ${why}.`;
  return /[0-9]/.test(hit)
    ? `A Millionea campaign may not state a figure: that is ${why}.`
    : `A Millionea campaign may not say “${hit}”: that is ${why}.`;
}

/** A stated fee that is not the week's. */
function feeProblems(text: string, feeRate: number): string[] {
  const want = feePctOf(feeRate);
  return [...new Set(statedFeesIn(text))]
    .filter((said) => said !== want)
    .map((said) => `This message states a ${said}% fee, and the week's fee at payout is ${want}%.`);
}

/**
 * ⭐ THE LINT OF A MILLIONEA CAMPAIGN — every problem its text has as a Millionea claim, one sentence each. Always read (the
 * campaign is Millionea's). With `facts`, a stated fee must be the week's own.
 */
export function millioneaClaimProblems(text: string, facts: MillioneaClaimFacts | null = null): string[] {
  const n = normalizeClaimText(text);
  const folded = foldedForm(text);
  const out: string[] = [];
  for (const f of MILLIONEA_CLAIM_FAMILIES) {
    const hit = familyHit(f, n, folded);
    if (hit !== null) out.push(familySentence(hit, f.why));
  }
  if (missingMillioneaFacts(text).length > 0) {
    out.push(
      "A Millionea campaign carries its headline's three facts, as every approved wording does: the Jackpot, " +
        "“shared equally by every 10/10 ticket” (“inagawanywa sawa kwa kila tiketi ya 10/10”) and “N% fee at payout” " +
        "(“ada N% wakati wa malipo”), N being the week's fee.",
    );
  }
  if (facts && Number.isFinite(facts.feeRate)) out.push(...feeProblems(text, facts.feeRate));
  return out;
}

/**
 * ⭐ THE SERVER'S PART — what only a door that read the week can judge: the facts were read, Millionea is open to everyone,
 * and every fee the text states is the week's own. The save, the test send and the send each hold a Millionea campaign
 * to it; the composer's live counter cannot (it reads no week), and the save then says it.
 */
export function millioneaFactsProblems(text: string, facts: MillioneaFacts | null): string[] {
  if (facts === null || !Number.isFinite(facts.feeRate)) return [MILLIONEA_FACTS_UNREAD];
  return [...(facts.live ? [] : [MILLIONEA_NOT_LIVE]), ...feeProblems(text, facts.feeRate)];
}

/** ⭐ Round 17 (L4) · a body that holds a Chinese (Han) character. */
const HAN = /\p{Script=Han}/u;

/** ⭐ Round 17 (L4) · true when the text holds a Chinese (Han) character — refused for a Millionea campaign here, and for any
 *  other where the untagged rules run (`untaggedCampaignProblems`). */
export function holdsHanScript(text: string): boolean {
  return HAN.test(text ?? "");
}

/**
 * ⭐ FINDING 9 (the lint review after round 17) · the longest body the composer's one door reads. Nothing longer can be sent
 * — one SMS at most (`SMS_MAX_SEGMENTS`), and the composer's length rule refuses it in its own sentence — while the
 * untagged rules' patterns cost time that grows with the square of a long run (measured: 16,000 spaces after a tax word,
 * 500 ms; 8,000 digit groups, 735 ms), and a server door holds a classic campaign to them too (S6-LINT 1). One oversized
 * save or composer body (the save action has no cap of its own) could hold the server's one process for minutes. So a
 * body past this is read by no rule: its length is its refusal (`test:maswali-claims` §8; recorded in
 * docs/FAILURE-INVENTORY.md §9b). ⭐ S6-LINT 4 · it guards three places, each first: this door (every rule), and on the
 * server, where the untagged rules moved, their path (`untaggedCampaignProblems`) and their quadratic signal reader
 * itself (`millioneaSignals`), so neither depends on a caller to guard it.
 */
export const CLAIMS_MAX_CHARS = 640;

/** ⭐ Finding 9 · a body past one SMS (`CLAIMS_MAX_CHARS`): read by no claims rule. */
export function pastOneSms(text: string): boolean {
  return (text ?? "").length > CLAIMS_MAX_CHARS;
}

/**
 * ⭐ THE ONE POLICY, for the composer's one door: a Millionea campaign is held to the whole lint, a body in Chinese characters
 * included (round 17, L4 — OD42: Swahili, and an optional English body, the two languages these rules read), and, where
 * its door read the week, to the server's part; any other campaign to the untagged rules its server door handed in
 * (S6-LINT 1), and to nothing where none were (the composer's live counter: its problems stay what they were). The one
 * exemption reports instead of refusing; a body past one SMS is read by no rule (finding 9).
 */
export function millioneaCampaignProblems(text: string, ctx: MillioneaComposeContext = UNTAGGED_CAMPAIGN): string[] {
  if (ctx.exempt === true) return [];
  // ⭐ Finding 9 · past one SMS no rule reads the body: the length rule is its refusal (`CLAIMS_MAX_CHARS`).
  if ((text ?? "").length > CLAIMS_MAX_CHARS) return [];
  if (ctx.product !== "MILLIONEA") return ctx.untagged ? ctx.untagged(text) : [];
  const script = holdsHanScript(text) ? [CAMPAIGN_HAN_SCRIPT] : [];
  const server = ctx.facts === undefined ? [] : millioneaFactsProblems(text, ctx.facts);
  return [...new Set([...server, ...script, ...millioneaClaimProblems(text)])];
}

/* ══ THE APPROVED WORDINGS ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE APPROVED WORDINGS — each begins with the sender, stays in the GSM alphabet and inside one message, carries the
 * three facts with `{pct}` for the fee, and claims nothing else. No name placeholder: no wording greets or names anyone.
 * A campaign that uses one is a Millionea campaign: its name begins with "Millionea".
 */
export const MILLIONEA_WORDINGS: Readonly<Record<MillioneaWordingLocale, readonly string[]>> = {
  SW: [
    "50pick: Millionea. Jackpot inagawanywa sawa kwa kila tiketi ya 10/10; ada {pct}% wakati wa malipo. Jibu maswali ya wiki hii kwenye programu ya 50pick.",
    "50pick: Millionea ni mchezo wa maswali wa kila wiki. Jackpot inagawanywa sawa kwa kila tiketi ya 10/10; ada {pct}% wakati wa malipo. Cheza kwa kiasi.",
  ],
  EN: [
    "50pick: Millionea. The Jackpot is shared equally by every 10/10 ticket; {pct}% fee at payout. Answer this week's questions in the 50pick app.",
    "50pick: Millionea is a weekly question game. The Jackpot is shared equally by every 10/10 ticket; {pct}% fee at payout. Play responsibly.",
  ],
};

/** One approved wording with its fee filled in. */
export function fillMillioneaWording(template: string, feeRate: number): string {
  return template.split("{pct}").join(feePctOf(feeRate));
}
