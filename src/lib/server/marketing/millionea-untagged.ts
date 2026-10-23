/**
 * MASWALI MILLIONEA — WHAT A CAMPAIGN NOT TAGGED MILLIONEA MAY NOT SAY (MASWALI-BUILD S6; MASWALI-PLAN §8 MB-47; the lead's
 * ruling 6 and its accepted corrections, S6-LINT 1).
 *
 * ⛔ OFF IN THIS RELEASE (the build lead's ruling of 2026-10-23, S6-SHIP 5). `MILLIONEA_UNTAGGED_RULES_ON` is false, so
 *    `untaggedRulesFor` hands these rules to no door, whatever the ceiling: a campaign not tagged Millionea goes exactly as
 *    before the lint, and their stamp is never written (`test:maswali-claims` §11). They stay built and checked (§1, §2, §7,
 *    §8) for the release that fixes the lint review's open findings and turns them on (`docs/FAILURE-INVENTORY.md` §9b).
 * ⭐ THE RULE. A campaign whose name does not declare Millionea (`campaignProductOf`, `millionea-claims.ts`) is refused when
 *    its text speaks Millionea's words — the product's name in any spelling, millionaire, jackpot, milioni, 10/10, or a
 *    figure of a million or more in a claim — in words: tag it Millionea, or reword it (`MILLIONEA_UNTAGGED`). A body in
 *    Chinese characters is refused too (OD42: a campaign is written in Swahili, with an optional English body — the two
 *    languages these rules read). Every reading runs on the composer's normal form (`normalizeClaimText`).
 * ⭐ THE SERVER'S ALONE (ruling 6's correction). These rules never reach a browser: a server door — the save, the test send,
 *    the engine's slice, the composer's previews — asks `untaggedRulesFor` and hands what it answers to the composer's one
 *    door (`footer.ts`) in the campaign's context (`MillioneaComposeContext.untagged`, `CampaignTemplate.untaggedRules`).
 *    The composer's live counter runs the tagged rules alone, so a body these rules refuse is refused at the save, in their
 *    words. `test:maswali-claims` §9 holds every client module's import graph clear of this file.
 * ⛔ ONLY UNDER THE ACTIVE CEILING (the lead's ruling 6, S6-LINT 6). `untaggedRulesFor` answers these rules only while
 *    Millionea's ceiling (`millioneaCeiling`, the environment's) is ACTIVE; below it no door hands them in, so a campaign not
 *    tagged Millionea is judged, saved and sent exactly as before the lint, and nothing reads or writes the rules' stamp
 *    (`millionea-lint-epoch.ts`). `test:maswali-claims` §10 holds every door to it, under each ceiling.
 * ⭐ FINDING 9 (S6-LINT 4). The signal reader's cost grows with the square of a long run, so a body past one SMS
 *    (`CLAIMS_MAX_CHARS`) is read here by nothing: the untagged path and the reader each refuse it first, whoever calls
 *    them (`test:maswali-claims` §8).
 * Pure: no database, no I/O. ⛔ No client module imports it, ever.
 */
import {
  CAMPAIGN_HAN_SCRIPT, CLAIMS_MAX_CHARS, CURRENCY, CURRENCY_SIGN, GET_BEFORE, LOOK_ALIKE_DIGITS, baseForm, campaignProductOf,
  foldWords, foldedForm, holdsHanScript, normalizeClaimText, pastOneSms, tenOfTen, type UntaggedCampaignRules,
} from "@/lib/marketing/millionea-claims";
import { millioneaCeiling } from "@/lib/millionea-rollout";

/* ══ THE REFUSAL ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The refusal of a campaign that is not tagged Millionea but speaks its words — the coordinator's own wording. */
export const MILLIONEA_UNTAGGED = "These words belong to Millionea's claims rules: tag the campaign Millionea or reword it";
/** How a campaign is tagged, said beside that refusal. */
export const MILLIONEA_TAG_HOW = "a Millionea campaign's name begins with “Millionea”";

/* ══ THE SIGNALS — what makes a campaign not tagged Millionea its business ══════════════════════════════════════════════ */

/** The product's own words, in each spelling and form the lint reads (round 5, MEDIUM 6: a word written in two parts too). */
const SIGNAL_WORDS = /\b(?:ma)?mill?ionea\b|\bmill?ionai?res?\b|\bjac?k[^a-z0-9]{0,6}pot(?:s|i)?\b|\bj[ae]ki?poti?\b|\b(?:ma)?milioni\b/g;
/** The same words with their letters spaced, dotted or stood in for by look-alike signs (round 3, B6; round 4, L7). */
const SIGNAL_SQUEEZED = /mi{2,4}onea|mi{2,4}onai?re|jac?kpot/;
/** A count's own noun, read before "milioni" (round 6, L3). */
const COUNT_BEFORE = /\b(?:watazamaji|wafuasi|watu|mashabiki|wachezaji|wanachama|watumiaji|wateja|vipakuliwa|kura|maoni)\s+$/;
/** "Up to" before a figure (round 6, M5: the lead's decision — a getting verb with it is a claim). */
const UP_TO_BEFORE = /\b(?:hadi|mpaka|up\s+to)\s*$/;
/** The words a limit or a payment of one's own is written with, heading the figure's phrase (the lead's refined ruling,
 *  round 8, M4; round 17, M4: the Swahili verbs in every person and tense — "ukiweka", "umetoa", "utatuma" — the English
 *  past and the deposit's own noun, "amana"). */
const LIMIT_BEFORE = /\b(?:(?:u|ni|tu|m|wa|a|ku)?(?:ki|me|li|ta|na|nge)?(?:toa|weka|tuma)|withdraw(?:s|n|ing|als?)?|withdrew|deposit(?:s|ed|ing)?|transfer(?:s|red|ring)?|kikomo|limit|amana)\b[^.!?;,]{0,24}$/;
/** ⭐ Round 17 (M3) · "take … home" around the figure ("one player took TZS 8,000,000 home"): the same getting verb — its
 *  verb right before the figure, "home" right after it (`HOME_AFTER`). */
const TAKE_BEFORE = /\b(?:take|takes|took|taking)\s*$/;
/** ⭐ Round 17 (M3) · a shot or a chance AT the figure: the figure is the prize it promises. */
const SHOT_BEFORE = /(?:\b(?:shot|chance)\s+at|\bnafasi\s+ya)\s*$/;

/** A run shaped like a phone number of the region, in any of the forms one is written (round 3, B5; round 4, L7). */
function phoneShaped(digits: string): boolean {
  return (digits.length === 12 && digits.startsWith("2")) || (digits.length === 10 && digits.startsWith("0"))
    || (digits.length === 9 && (digits.startsWith("6") || digits.startsWith("7")));
}

/** A currency word or sign right after a number (round 6, L4) — ⭐ round 17 · never one that heads the next number ("Lipa
 *  Namba 5566778 Tsh 2000": the currency is 2000's). */
const CURRENCY_AFTER = new RegExp(String.raw`^\s*(?:${CURRENCY}\b(?![.:]?\s*[0-9])|${CURRENCY_SIGN})`);
/** A currency word before a number (round 5, MEDIUM 6). */
const CURRENCY_BEFORE = new RegExp(String.raw`\b${CURRENCY}[.:]?\s*$`);
/** ⭐ Round 17 (M3) · "home" right after the figure (its currency word between, if any): `TAKE_BEFORE`'s other half. */
const HOME_AFTER = new RegExp(String.raw`^\s*(?:${CURRENCY}\b[.:]?\s*)?home\b`);
/** A price: a price word heading the figure's phrase, with no reader word in it (rounds 9, 11 and 15, the lead's rulings). */
const PRICE_BEFORE = /\b(?:bei|price|costs?|kiingilio|entry|inauzwa|sells\s+for)\b[^.!?;,]{0,24}$/;
/** A word that names a till, an account or a code (round 4, L7). */
const TILL_BEFORE = /\b(?:namba|nambari|number|no|till|paybill|akaunti|account|ref|kumbukumbu|code|msimbo|piga|call|whatsapp|simu|sms)\b[)\]]?[.:#]?\s*$/;
/** A phone's own word, read right after a run of digits (round 12). ⭐ Enforced (round 17, L2): a run counts as a figure
 *  unless it is written in a phone number's own format AND one of these words follows it — and after a prize verb it
 *  counts as a figure whatever follows it (round 15). */
const PHONE_AFTER = /^\s*(?:(?:kwenye|kwa|on|via|kupitia)\s+)?(?:whatsapp|simu|sms|telegram)\b/;
/** The nouns a count is written with — people, plays, sales — read right after a figure (rounds 5, 6 and 11).
 *  ⭐ Enforced (round 17, L2): every figure is judged as a claim unless the noun it counts stands at once after it. */
const COUNT_AFTER = /^\s*[+]?\s*(?:tanzanians?|watanzania|kenyans?|wakenya|views?|likes?|followers?|fans?|subscribers?|downloads?|players?|members?|people|users?|shares?|comments?|streams?|plays?|votes?|wafuasi|watazamaji|wachezaji|watu|wanachama|watumiaji|mashabiki|wapiga\s+kura|kura|maoni|vipakuliwa|watazamaji|tickets?\s+sold|zimeuzwa)\b/;
/** A prize or a win, in either language, read by its stem (round 5, MEDIUM 7b; round 6, H1 and M3): a figure in a sentence
 *  that says one is a claim. ⭐ Round 17 (M4) · "mfuko" (a fund) is a prize word in a prize's sense — the week's fund, a
 *  prize fund, a fund of a figure — and a wait is one only where it waits for the reader. */
const PRIZE_WORDS = new RegExp([
  String.raw`shind|\bpots?\b|\breward|\b(?:wins?|winning\w*|won|winners?|prizes?)\b|\bjac?k[^a-z0-9]{0,6}pot(?:s|i)?\b|\bj[ae]ki?poti?\b`,
  String.raw`zawadi|tuz[ow]|(?:na|ta|me)ku(?:subiri|ngoj)|\bawait(?:s|ing)?\s+you\b|\bwaiting\s+for\s+you\b|\bup\s+for\s+grabs\b`,
  String.raw`(?:ta|me|na)?kuwa\s+(?:yako|zako|yenu|zenu)\b`,
  String.raw`\bmfuko\s+(?:(?:mkubwa|mnono|huu|wetu|wenu|wako|mpya)\s+)?(?:wa|ya)\s+(?:wiki|zawadi|milioni|bilioni|laki|${CURRENCY}\b|[0-9])`,
].join("|"));
/** "It is yours" right before the figure (round 7). */
const YOURS_BEFORE = /\b(?:it.?s|ni|is)\s+(?:yours|yako|zako|yenu|zenu)\s*[:-]?\s*$/;
/** A figure in hundreds of thousands, as Swahili writes it ("laki 50") (round 7). */
const LAKI = /\blaki\s+([0-9]+(?:[.,][0-9]+)?)\b/g;
/** The figure as the subject of "is yours" (round 6, H1 and M3). */
const YOURS_AFTER = new RegExp(String.raw`^\s*(?:\b${CURRENCY}\b[.:]?\s*)?(?:(?:ni|is|are)\s+|(?:[a-z]+\s+){0,3}?(?:could|can|will|may|might)\s+be\s+)?(?:yako|zako|yenu|zenu|yours)\b`);
/** A number with a word or a short suffix for its size (round 3, B3). */
const SIZED = /(?<![0-9])(?<![0-9][.,])([0-9]+(?:[.,][0-9]+)*)\s*(millions?|milioni|billions?|bilioni|mill|mil|mln|mn|bil|bn|b|m|k)\b(?!-)/g;
/** A figure written as a word (round 6, M4). */
const WORD_FIGURES = /\b(?:millions?|billions?|bilioni)\b/g;
/** Thousands grouped by a comma or a dot (round 4, M2). */
const GROUPED_MARKS = /(?<![0-9])(?<![0-9][.,])[0-9]{1,3}(?:[,.][0-9]{3})+(?![0-9])(?![.,][0-9])/g;
/** Thousands grouped by spaces. */
const GROUPED_SPACES = /(?<![0-9+])(?<![0-9][.,])[0-9]{1,3}(?: [0-9]{3})+(?![0-9])(?![.,][0-9])/g;
/** A run of digits with no separator. */
const BARE = /(?<![0-9+])(?<![0-9][.,])[0-9]+(?![0-9])(?![.,][0-9])/g;
/** Where a sentence ends — never at a line break (round 6, H1). */
const SENTENCE_END = /[.!?;](?=\s|$)/;
/** A sentence's words, the sender's own name left out. */
const wordsIn = (s: string): number => s.replace(/^\s*50\s*pick\s*:/, " ").trim().split(/\s+/).filter((w) => w !== "").length;

/** The figure's own sentence, with a sentence of at most two words (an exclamation) read with the one after it (round 6,
 *  H1). */
function sentenceOf(n: string, at: number, end: number): string {
  const before = n.slice(0, at).split(SENTENCE_END);
  const after = n.slice(end).split(SENTENCE_END);
  let sentence = `${before.pop() ?? ""} ${after[0] ?? ""}`;
  while (before.length > 0 && wordsIn(before[before.length - 1] ?? "") <= 2) sentence = `${before.pop() ?? ""} ${sentence}`;
  for (let k = 1; k < after.length && wordsIn(sentence) <= 2; k++) sentence = `${sentence} ${after[k] ?? ""}`;
  return sentence;
}

/** A sized number's value: "2.5 m" → 2,500,000; "1,500 m" → 1,500,000,000. */
function sizedValue(num: string, unit: string): number {
  const plain = /^[0-9]{1,3}(?:,[0-9]{3})+(?:[.][0-9]+)?$/.test(num) ? num.replace(/,/g, "") : num.replace(",", ".");
  const v = Number.parseFloat(plain);
  const scale = unit === "k" ? 1_000 : /^(?:billions?|bilioni|bil|bn|b)$/.test(unit) ? 1_000_000_000 : 1_000_000;
  return Number.isFinite(v) ? v * scale : 0;
}

/** The reader addressed: "you", and the Swahili second person (round 7). */
const READER = /\byou(?:r|rs)?\b|\bwewe\b|\b(?:yako|zako|lako|chako|kwako|wako|yenu|zenu|wenu|lenu|kwenu)\b|\bu(?:ta|na|me|li|ki|nge)[a-z]{3,}/;
/** A question that asks who (round 7). */
const WHO = /\b(?:who|nani)\b/;
/** A sentence that opens as a question (rounds 7 and 8, H1). */
const MARKET_ASKS = /^\s*(?:50\s*pick\s*:\s*)?(?:je|will|would|can|could|does|do|did|is|are|has|have|what|which|how|when|where)\b/;
/** A winning or getting verb (round 8, H1): before the figure, a question about it is a claim. */
const WIN_OR_GET = /shind|\b(?:wins?|winning|won|get|gets|got|take|takes|collect|collects|claim|claims)\b|pat(?:a|ia|ie|e)\b|chukua/;
/** A figure framed as the reader's, in their hands or their future, is a claim (rounds 9 and 11, the lead's rulings).
 *  ⭐ Round 17 (M4) · a wait frames it in the reader's own form or an impersonal one ("unasubiri", "inakusubiri",
 *  "zinasubiri"), or wherever it waits for the reader ("wanakusubiri", "waiting for you", "awaits you"); a third person's
 *  wait ("wanasubiri", "tunasubiri", "fans await the derby") is their own. */
const FRAME = new RegExp([
  String.raw`\byours\b|change\s+a\s+life|\bwaiting\s+for\s+you\b|\bawait(?:s|ing)?\s+you\b`,
  String.raw`\b(?:you|youre|wewe|who)\b[^.!?;]{0,12}\bnext\b|\bnext\b[^.!?;]{0,12}\b(?:you|wewe)\b`,
  String.raw`\b(?:u|i|zi|ki|vi|li|ya)(?:na|ta|me)(?:ku|wa)?(?:subiri|ngoj)|\b[a-z]{0,4}?(?:na|ta|me)ku(?:subiri|ngoj)`,
  String.raw`\b(?:nani|wewe)\b[^.!?;]{0,12}\b(?:ajaye|atafuata|anayefuata)\b|\b(?:ajaye|atafuata|anayefuata)\b[^.!?;]{0,12}\b(?:nani|wewe)\b`,
].join("|"));
/** ⭐ Round 17 (M4) · the figure itself waiting, right after it ("TZS 50,000,000 is waiting", "… awaits"). */
const WAIT_AFTER = new RegExp(String.raw`^\s*(?:${CURRENCY}\b[.:]?\s*)?(?:(?:is|are|now|still)\s+)*(?:waiting|awaits?|awaiting)\b`);
/* ⭐ Round 17 (H2, the lead's ruling) · A PAYMENT BY 50PICK, READ BY ITS PARTIES (it replaces round 15's word order): the
 * platform as the payer — 50pick, "we" or "our …" before a pay verb, "paid … by 50pick", the "tu-" forms of "-lipa" — or the
 * platform's players as the payee — "paid (out) to … players, winners or you", players or winners who "were paid", the
 * "wa-" passives of "-lipwa". The "i-" forms of "-lipa" and "-toa", and any "-lipwa", are the platform's where 50pick is
 * named in the sentence. The sender's own name before its colon is never a party. */
/** What may stand between a payer and its verb: an auxiliary, or an adverb of time or manner. */
const PAY_AUX = String.raw`(?:has|have|had|is|are|was|were|will|would|shall|been|be|being|just|already|now|also|again|still|ever|even|once|recently|finally|proudly|officially|successfully|so\s+far|to\s+date|today|yesterday|in\s+total|altogether|this\s+(?:week|month|year|season)|last\s+(?:week|month|year|season))`;
const PAYER_EN = String.raw`\b(?:50\s*pick|we|our(?:\s+[a-z]+){1,2})(?:['’](?:ve|ll|d|re))?(?:\s+${PAY_AUX})*\s+`;
const PLATFORM_PAYS = new RegExp([
  String.raw`${PAYER_EN}(?:paid|pays|pay|paying)\b`,
  String.raw`${PAYER_EN}(?:made|makes|make|making|sent|sends|send|sending|issued|issues)\s+(?:[a-z-]+\s+){0,2}payouts?\b`,
  String.raw`\b50\s*pick['’]s\s+(?:[a-z-]+\s+){0,2}payouts?\b`,
  String.raw`\b(?:paid|payments?|payouts?)\b[^.!?;]{0,40}\bby\s+50\s*pick\b`,
  String.raw`\bpaid\s+(?:out\s+)?to\s+(?:[a-z0-9]+\s+){0,2}(?:players?|winners?|users?|members?|customers?|punters?|people|tanzanians?|you)\b`,
  String.raw`\b(?:players?|winners?|users?|members?|customers?|punters?)\s+(?:were|are|was|is|have\s+been|has\s+been|had\s+been|will\s+be|got|get|gets|getting)\s+(?:[a-z]+\s+)?paid\b`,
  String.raw`\btu(?:me|li|na|ta|mesha|lisha|ki|nge)(?:wa|ku|m|mw)?lip[ae]\b`,
  String.raw`\bwa(?:me|li|na|ta|mesha|lisha|ki|nge)lipw[ae]\b`,
].join("|"));
/** …and the forms that are the platform's where 50pick is named in the sentence. */
const PLATFORM_PAYS_NAMED = /\bi(?:me|li|na|ta|mesha|lisha)(?:wa|ku|m|mw)?(?:lipa|toa)\b|\b[a-z]*lipw[ae]\b|\b[a-z]*(?:lipa|toa|tolewa)\b[^.!?;]{0,40}\b(?:na|kutoka\s+kwa)\s+50\s*pick\b/;
/** 50pick named in a sentence (its sender's name before the colon set aside first). */
const NAMES_50PICK = /\b50\s*pick\b/;
/** ⭐ Round 17 (H2) · a tax, a fee or a levy as THE FIGURE'S OWN OBJECT — heading it ("kodi ya", "a levy of", "income tax
 *  of") or right after it ("in taxes", "as tax", "kama kodi") — makes that figure a payment the platform owes, not a payout;
 *  never where the sentence says there was none ("zero fees", "bila ada", "tax-free"). Enforced: a payment by 50pick is its
 *  claim unless its own figure is such a payment. */
const TAX_NOUN = String.raw`(?:tax(?:es)?|fees?|lev(?:y|ies)|dut(?:y|ies)|kodi|ada|ushuru|tozo)`;
const TAX_HEADS = new RegExp(String.raw`\b${TAX_NOUN}(?:\s+(?:ya\s+|la\s+|za\s+|on\s+)?[a-z]+)?\s*(?:(?:of|ya|za|la|totall?ing|worth|amounting\s+to)\s*)?[:]?\s*(?:${CURRENCY}[.:]?\s*)?$`);
const TAX_FOLLOWS = new RegExp(String.raw`^\s*(?:${CURRENCY}\b[.:]?\s*)?(?:(?:in|as|for|kama|kwa)\s+(?:[a-z]+\s+)?)?${TAX_NOUN}\b`);
const TAX_NEGATED = new RegExp(String.raw`\b(?:no|zero|without|nil|free\s+of|bila|hakuna|pasipo)\s+(?:[a-z]+\s+)?(?:${TAX_NOUN}|makato|deductions?|charges?)\b|\b(?:tax|fee|levy|duty|commission|charge)[\s-]*free\b`);
/** ⭐ Round 17 (M3) · a question just before the figure's sentence, whatever its length: it joins that sentence (round 15
 *  joined only a short one). */
const QUESTION_BEFORE = /(?:^|[.!?;]\s+)([^.!?;]+\?)\s*$/;
/** ⭐ Round 17 (M3) · a payout or the winnings heading the figure's phrase ("This week's payout is …", "Malipo ya wiki hii
 *  ni …"): the figure is the prize. */
const WINNINGS_BEFORE = /\b(?:payouts?|winnings?|malipo)\b[^.!?;,]{0,24}$/;
/** ⭐ Round 17 (M3) · money, riches or an income asked about in the question joined to the figure's sentence ("Want to be
 *  rich? …", "Unataka pesa? …"). */
const INCOME_QUESTION = /\btajir|\b(?:rich|riches|wealth|wealthy|money|cash|income|fortune|pesa|fedha|hela|kipato|mapato|faida)\b/;
/** ⭐ Round 17 (M3) · the sentence after the figure's puts the reader next: "Next could be you!", "You could be next",
 *  "Wewe je?". */
const NEXT_YOU = /\bnext\b[^.!?;]{0,16}\b(?:could|might|may|will|can)\s+be\s+you\b|\b(?:you|it)\s+(?:could|might|may|will|can)\s+be\s+next\b|\byou(?:['’]re|\s+are)\s+next\b|\bcould\s+be\s+you\b|\bwewe\s+je\b|\b(?:wewe|ni\s+wewe)\b[^.!?;]{0,12}\b(?:ajaye|atafuata|anayefuata)\b/;
/** A ticket named in the figure's sentence (round 9, b). */
const TICKET_WORD = /\b(?:tiketi|tikiti|tickets?)\b/;
/** A prize verb right before a run of digits (round 9, the lead's ruling c). */
const PRIZE_VERB_BEFORE = /(?:shind[a-z]*|\bwins?|\bwon|\bget|\bpata|\bjipatie)\s*$/;
/** A third person's own verb (round 12). ⭐ Enforced (round 17, L2): a reader word before the figure makes it the reader's
 *  — a claim — unless a third person's verb or a new clause stands between them (`readerGoverns`). */
const THIRD_PERSON =/\b(?:a|wa)(?:na|ta|me|li|nge|ki)[a-z]{2,}\b|\b(?:he|she|they)\s+(?:is|was|were|are|will|has|had|gets?|got|earns?|earned|makes?|made)\b|\b[a-z]{3,}\s+(?:earns|gets|makes|is\s+paid|was\s+paid)\b/;
/** Every reader word, for the last one before a figure (round 12). */
const READER_ALL = new RegExp(READER.source, "g");

/** The reader's own pronoun in the rest of the figure's sentence (round 15). */
const READER_AFTER = /\b(?:you|your|yours|wewe|yako|zako|lako|chako|wako|kwako|yenu|zenu|wenu|lenu|kwenu)\b/;
/** A third party's own verb, or a new clause, after the reader's word and before the figure (rounds 12 and 15). */
const THIRD_PARTY = new RegExp(THIRD_PERSON.source + String.raw`|\b(?:kwamba|that)\b|\b(?:i|zi|li|ki|vi|ya)(?:na|ta|me|li|ki)[a-z]{3,}\b|\b(?:signed|signs|spent|spends|raised|raises|raise|cost|costs|paid|bought|built|sold)\b`);
/** ⭐ Round 17 (H3, the lead's ruling) · an ACCOUNT FACT stated of the figure — a balance ("balance", "salio"), what is held
 *  ("hold"), a limit in the wallet ("up to … in your wallet", "hadi … kwenye pochi", "amana hadi"), what a wallet has
 *  ("your wallet has", "pochi yako ina", "you have … in your wallet", "una … kwenye pochi yako"). Enforced: the reader's
 *  money figure is a claim unless the sentence states one of these — and never where a hypothetical frames it. */
const ACCOUNT_FACT = /\b(?:balance|salio|holds?|holding)\b|\b(?:up\s+to|hadi|mpaka)\b[^.!?;]{0,40}\b(?:wallet|pochi|account|akaunti)\b|\b(?:wallet|pochi|account|akaunti)\s+(?:yako\s+|your\s+)?(?:has|have|holds|ina|zina)\b|\byou\s+have\b[^.!?;]{0,40}\bin\s+your\s+(?:wallet|account|balance)\b|\buna\b[^.!?;]{0,40}\b(?:kwenye|katika|ndani\s+ya)\s+(?:pochi|akaunti)\s+yako\b|\bamana\s+(?:ya\s+)?(?:hadi|mpaka)\b/;
/** ⭐ Round 17 (H3) · a hypothetical or a promise to come: a figure imagined, or said to arrive, in the reader's account is
 *  a lure, never an account fact ("Imagine …", "Fikiria …", "could land in your wallet", "itaingia …"). */
const HYPOTHETICAL = /\b(?:imagine|imagining|picture|suppose|supposing|dream|dreaming|what\s+if|could|might|would|will|land|lands|landing|fikiria|wazia|tuseme|inaweza|zinaweza)\b|\b(?:i|zi)ta[a-z]{2,}|\b(?:u|i|zi|a|wa)nge[a-z]{2,}/;
/** ⭐ Round 17 (M3) · a third party spending or being paid, before the figure: its figures are its own sums, never a stake
 *  against a prize ("Simba spent …", "Mchezaji analipwa …", "Simba ilitumia …"). */
const THIRD_SPEND = /\b(?!(?:you|we|i)\b)[a-z]{2,}\s+(?:(?:has|have|had|just|already|will|would)\s+)?(?:spent|spends|spend|paid|pays|bought|buys|signed|signs|raised|raises|sold|sells|built|builds|invested|invests|earned|earns|owes|owed)\b|\b(?:a|wa|i|zi|ki|vi|li|ya)(?:li|me|na|ta|mesha)(?:sajili|tumia|lipa|lipwa|nunua|uza|jenga|wekeza|changia)\b/;
/** Where a Swahili you-verb starts its own clause: no noun before it as its subject (round 15). */
const CLAUSE_START = /(?:^|[.,:;!?\-]\s*|\b(?:je|sasa|leo|kesho|wewe|basi|kama|ili|hata|pia|tayari|pick)\s+)$/;
/** The sizes a money figure is written with ("5m", "2.5 bn", "1 million"). */
const MONEY_SIZE = String.raw`millions?|milioni|billions?|bilioni|mill|mil|mln|mn|bil|bn|b|m|k`;
/** ⭐ Round 17 (M3) · every money figure of a sentence — digits with their currency before or after them. */
const MONEY_IN = new RegExp(String.raw`\b${CURRENCY}[.:]?\s*([0-9]+(?:[,. ][0-9]{3})*(?:[.,][0-9]+)?)(?:\s*(${MONEY_SIZE})\b)?|\b([0-9]+(?:[,. ][0-9]{3})*(?:[.,][0-9]+)?)(?:\s*(${MONEY_SIZE}))?\s*(?:${CURRENCY}\b|${CURRENCY_SIGN})`, "g");

/** A figure written with its size ("5m", "2.5 bn"). */
const SIZED_FIGURE = new RegExp(String.raw`^([0-9]+(?:[.,][0-9]+)*)\s*(${MONEY_SIZE})$`);

/** A figure's value as written: digits grouped or bare, a size ("5m"), "laki 50", or a size word alone ("a million"). */
function figureValue(figure: string): number {
  const laki = /^laki\s+([0-9]+(?:[.,][0-9]+)?)$/.exec(figure);
  if (laki) return Number.parseFloat((laki[1] ?? "0").replace(",", ".")) * 100_000;
  if (/^(?:millions?)$/.test(figure)) return 1_000_000;
  if (/^(?:billions?|bilioni)$/.test(figure)) return 1_000_000_000;
  const sized = SIZED_FIGURE.exec(figure);
  if (sized) return sizedValue(sized[1] ?? "", sized[2] ?? "");
  const digits = figure.replace(/[^0-9]/g, "");
  return digits === "" ? 0 : Number(digits);
}

/** ⭐ Round 17 (M3, the lead's ruling) · a smaller money figure in the figure's own sentence is a stake against it as a
 *  prize ("TZS 1,000 for a shot at TZS 50,000,000", "TZS 1,000 leo, TZS 50,000,000 Ijumaa"). */
function stakedAgainst(sentence: string, figure: string): boolean {
  const value = figureValue(figure);
  if (!(value > 0)) return false;
  for (const m of sentence.matchAll(MONEY_IN)) {
    const num = m[1] ?? m[3] ?? "";
    const size = m[2] ?? m[4] ?? "";
    const other = size !== "" ? sizedValue(num, size) : Number(num.replace(/[^0-9]/g, ""));
    if (other > 0 && other < value) return true;
  }
  return false;
}

/** ⭐ Rounds 12 and 15 (the lead's rulings) · a reader word makes the figure a claim only when it governs it: the reader's
 *  pronoun after the figure, or the reader's own word before it with no third party's verb or new clause between — a
 *  subject anyone could be, or a "who", between them keeps it the reader's. */
function readerGoverns(own: string, after: string): boolean {
  if (READER_AFTER.test(after) || READER_AFTER.test(foldWords(after))) return true;
  let last = -1;
  for (const m of own.matchAll(READER_ALL)) {
    const at = m.index ?? 0;
    // ⭐ Enforced (round 17, L2): a Swahili you-verb that opens its own clause is the reader's word; one with a noun
    // before it as its subject is read as that noun's verb.
    if (m[0].startsWith("u") && !/^u(?:r|rs)?$/.test(m[0]) && !CLAUSE_START.test(own.slice(0, at))) continue;
    last = at + m[0].length;
  }
  if (last < 0) return !READER.test(own) && READER.test(foldWords(own));
  const between = own.slice(last);
  if (GENERIC_SUBJECT.test(between) || WHO.test(between)) return true;
  return !THIRD_PARTY.test(between);
}

/** A subject anyone could be (round 8, H1): a question about it is a claim. */
const GENERIC_SUBJECT = /\b(?:anyone|anybody|someone|somebody|mtu|mshindi|washindi|winners?|wachezaji|players?|tickets?|tiketi|mmoja)\b/;

/** True when the figure stands in a claim (round 5, MEDIUM 7; rounds 7 and 8). */
function inAClaim(n: string, at: number, end: number): boolean {
  const sentence = sentenceOf(n, at, end);
  const tail = n.slice(end);
  const stop = tail.search(SENTENCE_END);
  const asks = stop >= 0 && tail[stop] === "?";
  // ⭐ Rounds 7 and 8 (H1) · the question test: MARKET_ASKS, WIN_OR_GET, GENERIC_SUBJECT, WHO and READER.
  const own = n.slice(0, at).split(SENTENCE_END).pop() ?? "";
  const market = asks && MARKET_ASKS.test(own) && !WIN_OR_GET.test(own) && !WIN_OR_GET.test(foldWords(own))
    && !PRIZE_WORDS.test(sentence) && !PRIZE_WORDS.test(foldWords(sentence)) && !FRAME.test(sentence)
    && !GENERIC_SUBJECT.test(sentence) && !WHO.test(sentence) && !READER.test(sentence) && !READER.test(foldWords(sentence));
  if (market) return false;
  const reads = (re: RegExp, s: string) => re.test(s) || re.test(foldWords(s));
  // What the figure's own words make it: a limit, a price (rounds 8, 9 and 11), an account fact (round 17, H3).
  const limit = LIMIT_BEFORE.exec(own);
  const priced = PRICE_BEFORE.exec(own);
  const price = priced !== null && !READER.test(priced[0]) && !READER.test(foldWords(priced[0]));
  // ⭐ Rounds 15 and 17 (M3) · a question just before the figure's sentence joins it, whatever its length — but a market
  // question about someone else (it opens as one, and asks no reader, no "who" and no one anyone could be) asks about its
  // own event: it does not join a figure its own words read as a limit, a price or an account fact.
  const asked = QUESTION_BEFORE.exec(n.slice(0, at - own.length));
  const question = asked?.[1] ?? null;
  const othersQuestion = question !== null && MARKET_ASKS.test(question) && !reads(READER, question) && !WHO.test(question)
    && !GENERIC_SUBJECT.test(question);
  const classified = limit !== null || price || (ACCOUNT_FACT.test(sentence) && !HYPOTHETICAL.test(sentence));
  const joins = question !== null && !(othersQuestion && classified);
  const joined = joins ? `${question} ${sentence}` : sentence;
  const ownJoined = joins ? `${question} ${own}` : own;
  // ⭐ Round 11 (the lead's ruling) · a prize or win word anywhere in the figure's sentence makes it a claim, a limit's too.
  if (limit && !reads(PRIZE_WORDS, joined) && !YOURS_AFTER.test(tail.slice(0, 32))) return false;
  if (reads(PRIZE_WORDS, joined)) return true;
  // ⭐ Round 17 (H2, the lead's ruling) · a payment by 50pick — read by its parties — is its claim, unless a tax, a fee or a
  // levy is this figure's own object and the sentence denies none.
  const party = sentence.replace(/^\s*50\s*pick\s*:\s*/, "");
  const pays = PLATFORM_PAYS.test(party) || (NAMES_50PICK.test(party) && PLATFORM_PAYS_NAMED.test(party));
  const taxObject = (TAX_HEADS.test(own) || TAX_FOLLOWS.test(tail.slice(0, 40))) && !TAX_NEGATED.test(party);
  // ⭐ Round 17 (M3) · a payout or the winnings heading the figure's phrase — and, by H2's own lift, never a payment
  // ("malipo") whose own object is a tax, a fee or a levy ("Malipo ya kodi ya TZS …").
  if (reads(WINNINGS_BEFORE, own) && !taxObject) return true;
  if (pays && !taxObject) return true;
  if (YOURS_AFTER.test(n.slice(end, end + 32))) return true;
  if (YOURS_BEFORE.test(n.slice(Math.max(0, at - 40), at).replace(CURRENCY_BEFORE, ""))) return true;
  // ⭐ Round 9 (the lead's ruling b) · the figure put in the reader's hands or future: a question asked of the reader, the
  // frame around it, a ticket beside it — never a ticket's price.
  if (!price) {
    const near = `${n.slice(Math.max(0, at - 60), at)} ${sentence}`;
    // A reader word makes a money figure a claim, and a question's figure of any kind.
    const money = CURRENCY_BEFORE.test(own) || CURRENCY_AFTER.test(tail.slice(0, 12));
    const after = stop >= 0 ? tail.slice(0, stop) : tail;
    // ⭐ Round 17 (H3, the lead's ruling) · only an account fact stated of the figure, never one imagined, keeps the reader's
    // figure from being a claim — and the joined question counts as the figure's sentence.
    const accountFact = ACCOUNT_FACT.test(joined) && !HYPOTHETICAL.test(joined);
    if ((asks || money) && reads(READER, joined) && !accountFact && readerGoverns(ownJoined, after)) return true;
    if (reads(FRAME, near) || TICKET_WORD.test(sentence)) return true;
    // ⭐ Round 17 (M4) · the figure itself waiting; (M3) money asked about in the joined question; the next sentence
    // putting the reader next; a smaller money figure beside it as its stake — a third party's own sums aside.
    if (WAIT_AFTER.test(tail.slice(0, 40))) return true;
    if (joins && !accountFact && INCOME_QUESTION.test(question ?? "")) return true;
    const next = stop >= 0 ? (tail.slice(stop + 1).split(SENTENCE_END)[0] ?? "") : "";
    if (reads(NEXT_YOU, next)) return true;
    if (!accountFact && !THIRD_SPEND.test(own) && stakedAgainst(sentence, n.slice(at, end))) return true;
  }
  const before = n.slice(Math.max(0, at - 40), at).replace(CURRENCY_BEFORE, "").replace(UP_TO_BEFORE, "");
  // ⭐ Round 17 (M3) · a getting verb right before the figure (or around it: "took … home"), or a shot at it.
  return reads(GET_BEFORE, before) || reads(SHOT_BEFORE, before) || (TAKE_BEFORE.test(before) && HOME_AFTER.test(tail.slice(0, 24)));
}

/**
 * ⭐ True when an UNTAGGED campaign's text claims a money figure of a million or more (round 4, M3; round 5, MEDIUM 6 and
 * the lead's ruling MEDIUM 7b).
 */
function millionFigure(n: string): boolean {
  const taken: Array<[number, number]> = [];
  const free = (at: number, end: number) => !taken.some(([x, y]) => at < y && end > x);
  const figures: Array<{ at: number; end: number }> = [];
  for (const m of n.matchAll(SIZED)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    taken.push([at, end]);
    if (sizedValue(m[1] ?? "", m[2] ?? "") >= 1_000_000) figures.push({ at, end });
  }
  for (const m of n.matchAll(LAKI)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    if (!free(at, end)) continue;
    taken.push([at, end]);
    if (Number.parseFloat((m[1] ?? "0").replace(",", ".")) * 100_000 >= 1_000_000) figures.push({ at, end });
  }
  for (const m of n.matchAll(WORD_FIGURES)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    if (!free(at, end)) continue;
    taken.push([at, end]);
    figures.push({ at, end });
  }
  for (const [re, kind] of [[GROUPED_MARKS, "marks"], [GROUPED_SPACES, "spaces"], [BARE, "bare"]] as const) {
    for (const m of n.matchAll(re)) {
      const at = m.index ?? 0;
      const end = at + m[0].length;
      if (!free(at, end)) continue;
      taken.push([at, end]);
      const digits = m[0].replace(/[^0-9]/g, "");
      if (Number(digits) < 1_000_000) continue;
      const before = n.slice(Math.max(0, at - 24), at);
      const money = CURRENCY_BEFORE.test(before) || CURRENCY_AFTER.test(n.slice(end, end + 12));
      // ⭐ Round 7 · the phone-shape test reads a run's last six digits too.
      // ⭐ Round 9 (the lead's ruling c) · a prize verb right before the run makes it a figure whatever its shape.
      const prized = PRIZE_VERB_BEFORE.test(before) || PRIZE_VERB_BEFORE.test(foldWords(before));
      // ⭐ Rounds 12 and 15 · a run written in a phone number's own format, with a phone's own word right after it, is a
      // phone, a prize verb before it or not; a bare run after a prize verb stays a figure.
      const phone = phoneShaped(digits) && !/000000$/.test(digits);
      const formatted = (digits.length === 10 && digits.startsWith("0")) || (digits.length === 12 && digits.startsWith("255"));
      const phoneAfter = phone && formatted && PHONE_AFTER.test(n.slice(end, end + 24));
      if (kind !== "marks" && !money && ((!prized && phone) || phoneAfter || TILL_BEFORE.test(before))) continue;
      figures.push({ at, end });
    }
  }
  return figures.some((f) => !COUNT_AFTER.test(n.slice(f.end, f.end + 32)) && inAClaim(n, f.at, f.end));
}

/** The strokes `squeezedWords` reads as one letter, keyed by code point (none is typed here). */
const ONE_STROKE: ReadonlySet<number> = new Set<number>([0x69, 0x6C, 0x31, 0x7C, 0xA1]);

/** One word with the strokes that pass for one another read as ONE letter, the other look-alike digits folded, and every
 *  non-letter gone. */
function squeeze(word: string): string {
  let out = "";
  for (const ch of word) out += ONE_STROKE.has(ch.codePointAt(0) ?? -1) ? "i" : (LOOK_ALIKE_DIGITS[ch] ?? ch);
  return out.replace(/[^a-z]+/g, "");
}

/** The text's words for the squeezed pass, each squeezed: every word on its own, and a run of single letters as one. */
function squeezedWords(text: string): string[] {
  const words: string[] = [];
  let run = "";
  for (const token of baseForm(text).split(/\s+/)) {
    const marks = [...token].filter((ch) => /[\p{L}\p{Nd}]/u.test(ch) || ONE_STROKE.has(ch.codePointAt(0) ?? -1)).length;
    if (marks === 1) { run += token; continue; }
    if (run !== "") { words.push(run); run = ""; }
    if (marks > 1) words.push(token);
  }
  if (run !== "") words.push(run);
  return words.map(squeeze);
}

/**
 * The Millionea signals a text carries, as words a human can read — a figure is named "a figure of a million or more",
 * never repeated (§5.14). Empty: none — and for a body past one SMS, which it never reads (finding 9).
 */
export function millioneaSignals(text: string): string[] {
  // ⭐ Finding 9 (S6-LINT 4) · the reader's own guard: its cost grows with the square of a long run, so past one SMS
  // (`CLAIMS_MAX_CHARS`) no signal is read, whoever calls it.
  if ((text ?? "").length > CLAIMS_MAX_CHARS) return [];
  const n = normalizeClaimText(text);
  const folded = foldedForm(text);
  const out = new Set<string>();
  // ⭐ Round 6 (L3) · "milioni" after a count's own noun is the count.
  const counted = (s: string, m: RegExpMatchArray) => m[0].endsWith("milioni") && COUNT_BEFORE.test(s.slice(Math.max(0, (m.index ?? 0) - 24), m.index ?? 0));
  for (const m of n.matchAll(SIGNAL_WORDS)) if (!counted(n, m)) out.add(m[0]);
  for (const m of folded.matchAll(SIGNAL_WORDS)) if (!counted(folded, m)) out.add(m[0]);
  if (out.size === 0) {
    for (const word of squeezedWords(text)) {
      const squeezed = SIGNAL_SQUEEZED.exec(word);
      if (!squeezed) continue;
      out.add(squeezed[0].startsWith("j") ? "jackpot" : squeezed[0].endsWith("onea") ? "millionea" : "millionaire");
      break;
    }
  }
  if (tenOfTen(n)) out.add("10/10");
  if (millionFigure(n)) out.add("a figure of a million or more");
  return [...out];
}

/** The refusal an untagged campaign gets, naming what it said. */
export function millioneaUntaggedProblem(signals: readonly string[]): string {
  const said = signals.map((s) => (s.startsWith("a figure") ? s : `“${s}”`)).join(", ");
  return `${MILLIONEA_UNTAGGED} (it says ${said}; ${MILLIONEA_TAG_HOW}).`;
}


/* ══ THE RULES, AND WHO MEETS THEM ═══════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE UNTAGGED RULES — every problem a campaign not tagged Millionea has under them, one sentence each: its Millionea
 * signals, refused in words (`millioneaUntaggedProblem`), and a body in Chinese characters (`CAMPAIGN_HAN_SCRIPT`). A body
 * past one SMS is read by none of them (finding 9).
 */
export const untaggedCampaignProblems: UntaggedCampaignRules = (text: string): string[] => {
  // ⭐ Finding 9 (S6-LINT 4) · the server door's untagged path guards itself, first: past one SMS its length is its refusal.
  if (pastOneSms(text)) return [];
  const signals = millioneaSignals(text);
  return [...(signals.length > 0 ? [millioneaUntaggedProblem(signals)] : []), ...(holdsHanScript(text) ? [CAMPAIGN_HAN_SCRIPT] : [])];
};

/**
 * ⛔ THE UNTAGGED RULES ARE OFF IN THIS RELEASE — the build lead's ruling of 2026-10-23 (MASWALI-BUILD S6-SHIP 5;
 * COMPLIANCE-DECISIONS § "2026-10-23 · Marketing — a campaign not tagged Millionea is sent exactly as before the claims
 * lint …"). Production runs Millionea at the ACTIVE ceiling, and the lint review's open findings (`docs/FAILURE-INVENTORY.md`
 * §9b) would refuse ordinary marketing copy, so while this is `false` no door is handed these rules, whatever the ceiling:
 * a campaign not tagged Millionea — in any language, a body in Chinese characters included — is saved, test-sent,
 * previewed and sent exactly as before the lint, and their stamp (`millionea-lint-epoch.ts`) is never written. Only a
 * campaign tagged Millionea meets the lint. The release that fixes and verifies those findings turns this on.
 */
export const MILLIONEA_UNTAGGED_RULES_ON: boolean = false;

/**
 * ⭐ THE ONE DECISION every server door asks for a campaign's name: none while the untagged rules are off
 * (`MILLIONEA_UNTAGGED_RULES_ON`). When they are on: the untagged rules for a campaign not tagged Millionea while
 * Millionea's ceiling is ACTIVE (a tagged one meets the tagged rules instead, in the composer's one door), else none.
 * ⛔ S6-LINT 6 (the lead's ruling 6) · below the ACTIVE ceiling — WITHDRAWN or STAFF_PREVIEW — a campaign not tagged
 * Millionea meets no Millionea rule at any door: it is judged, saved and sent exactly as before the lint.
 */
export function untaggedRulesFor(name: string | null | undefined): UntaggedCampaignRules | undefined {
  if (!MILLIONEA_UNTAGGED_RULES_ON) return undefined;
  if (campaignProductOf(name) === "MILLIONEA") return undefined;
  return millioneaCeiling().ceiling === "ACTIVE" ? untaggedCampaignProblems : undefined;
}
