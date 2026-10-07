/**
 * U33p · THE PUBLIC POLICY LINES — the keys, the defaults (today's page text, byte for byte), the rules, the page versions,
 * the record's shape and what a save may carry. Pure and client-safe: the "Public policy lines" card on /admin/system runs
 * these rules on every keystroke and builds its request with them, and the server runs the SAME functions before it writes
 * (`src/lib/server/legal/policy-lines.ts`), so the card and the save can never disagree about what may be published.
 *
 * ⭐ WHY THIS EXISTS (OD57 · OD58 · S15 · F3; the owner rule of 2026-10-03, "admins can change everything"). Two published
 * texts contradict licence outreach the moment it acts: the Privacy Notice's consent-only lines (§3 and §4) and the RG
 * page's age clause for non-members. They were JSX an engineer had to change (owner gate G10). Five lines are now
 * persisted, validated, audited config (`legal.policy_lines`), edited on one card:
 *   · `rg.marketing`           /legal/responsible-gambling §4, the first bullet (the marketing promise);
 *   · `privacy.lawfulConsent`  /legal/privacy §3, the Consent bullet;
 *   · `privacy.lawfulLicence`  /legal/privacy §3, a NEW bullet after Consent — blank by default, so it is not printed;
 *   · `privacy.smsGateway`     /legal/privacy §4, the Blackball bullet;
 *   · `profile.outreachNote`   the note under the profile's offers switch — ⚠️ STORED AND VALIDATED HERE, PRINTED BY NOTHING
 *                              YET: its printer is U33a-P, once the outreach record exists (the card says so).
 * Code keeps the KEYS, the RULES and the DEFAULTS; an admin's save is what changes a public page — and the save IS the
 * approval (G4 · G10), recorded by the factory's audit row `config.policy_lines_updated`.
 *
 * ⛔ NOTHING PRINTS DIFFERENTLY UNTIL AN ADMIN SAVES NEW WORDS. Each default is today's page text, byte for byte
 * (`test:policy-lines` L1 decodes the pages' own JSX and compares). And the pages do not print these strings while a line
 * has no saved words: the wrapper (`PolicyLine`) prints the page's OWN literal JSX until then, so the page's text and both
 * English hash pins (`test:rg-policy`, `test:privacy-notice`) are untouched by construction. These copies exist for the
 * card's prefill, the validator's hints, the default's fingerprint and the consent-only checks — and L1 holds them equal to
 * the pages.
 *
 * ⭐ EVERY LINE KEEPS ITS HISTORY (review F12 — the wordings' precedent). A save APPENDS a version, server-stamped
 * (`rev` 1, 2, 3 …, `savedAt`, `savedBy`); a saved version is never rewritten or removed (`policyHistoryProblem`, run
 * before every write). A version is either:
 *   · WORDS — the three languages the page now prints, with the fingerprint of the code default they replaced
 *     (`codeDefault`), so the card can say when the code's own words moved underneath a saved line; or
 *   · a REVIEW MARKER — "today's words, read and kept" (`reviewedDefault`: the fingerprint of the code default that was
 *     reviewed) — no text at all: the page keeps printing the code's literal (review F4). Opening check 2 accepts a marker
 *     only while its fingerprint is the CURRENT default's.
 *
 * ⛔ A SAVE IS CHECKED, NEVER LOCKED (spec §5.2). Every language: 20–600 characters (the note: 10–200), plain text, no
 * phone number (nor any run of seven or more digits), no unbroken run longer than 30 characters in English or Swahili. The
 * RG line is read against `KEPT_PROMISES` (`./kept-promises`) in EVERY language: a promise the code does not keep is
 * refused, naming it; a kept promise the published line makes and the new one drops gets a hint. The Blackball bullet must
 * keep the processor facts `test:privacy-notice` §2e requires, and the Consent bullet the words §4d and §4f require — one
 * table, exported HERE and imported by that suite.
 *
 * ⭐ THE VERSION MOVES WITH NEW WORDS, NEVER WITH A REVIEW (spec §5.2; review F1 · F5). A save that changes the words a page
 * prints stamps that page's version with today's EAT date — a second the same day `.2`, then `.3` — and records the code
 * version it was made against (its `base`). A save that only marks a line reviewed writes the marker and its audit row and
 * leaves the version alone: the page's words did not change. ONE function (`printedPolicyVersion`) decides the version a
 * page prints from (code version, stamp, base), and the next stamp is always later than it — so a code version bumped after
 * a stamp can never print the same label over two different texts.
 *
 * ⛔ THE RECORD IS FLAT — one top-level key per line and per page version — so the factory's audit `changes` names exactly
 * the lines and the version a save moved (the U33w precedent, the LEAD-B.1a lesson). The merge replaces only the keys the
 * server rebuilt (spec §5: each record passes its own merge). A saved version is read TOLERANTLY: a field this build does
 * not know is ignored and kept, so a deploy's overlap never drops a record a newer build wrote.
 *
 * ⭐ U13 · A TIME THE RG LINE NAMES IS HELD TO THE SEND WINDOW'S OWN HOURS. With the send window kept, the line may say so
 * — but every clock time or hour range it names, in any language, must be the window's opening or closing time as SAVED
 * now (the Marketing SMS settings' pair, 08:00 and 20:00 by default): "after 22:00" is a promise the window does not make.
 * The server reads the hours FRESH and hands them in (a save is refused while they cannot be read); the card hands in
 * the hours its page read. Evening words are refused as a promise of their own (`./kept-promises`): messages are sent
 * until the window closes.
 *
 * ⛔ No regex here is typed with a backslash: an editing tool decodes typed escapes (repo memory, 2026-10-02), so the
 * Unicode classes are built from their codes. Pinned client-safe by `test:client-graph-safe`: it imports only
 * `./kept-promises` (nothing), `../contacts/contact-fields`, `../eat-day` (nothing) and `../marketing/sms-settings`
 * (nothing).
 *
 * Guard: `npm run test:policy-lines` (L0–L10, in-process `--prove-red`), with `test:rg-policy` K1/K2 and
 * `test:privacy-notice`.
 */
import { KEPT_PROMISES, holdsPhrase, namesATime, promiseReading, promisesIn, timesNamedIn, type KeptPromise } from "./kept-promises";
import { charCount, holdsPhoneRun } from "../contacts/contact-fields";
import { eatDayKey } from "../eat-day";
import { MARKETING_SMS_SETTINGS_DEFAULTS, formatWindow } from "../marketing/sms-settings";

/* ══ THE LANGUAGES ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The three languages every page prints. ⛔ The English is the binding text (LEGAL_BINDING_LANGUAGE). */
export const POLICY_LOCALES = ["en", "sw", "zh"] as const;
export type PolicyLocale = (typeof POLICY_LOCALES)[number];

export function isPolicyLocale(x: unknown): x is PolicyLocale {
  return x === "en" || x === "sw" || x === "zh";
}

/** A language's name in the console's words (English console copy). */
export const POLICY_LOCALE_NAME: Readonly<Record<PolicyLocale, string>> = Object.freeze({ en: "English", sw: "Swahili", zh: "Chinese" });

/** One line in the three languages. */
export type PolicyTexts = { readonly en: string; readonly sw: string; readonly zh: string };

/* ══ THE KEYS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ ONE KEY PER LINE THE CARD EDITS, in the card's order. ⛔ Identifiers, never shown to staff (the card has labels). */
export const POLICY_LINE_KEYS = [
  "rg.marketing", "privacy.lawfulConsent", "privacy.lawfulLicence", "privacy.smsGateway", "profile.outreachNote",
] as const;
export type PolicyLineKey = (typeof POLICY_LINE_KEYS)[number];

const KEY_SET: ReadonlySet<string> = new Set<string>(POLICY_LINE_KEYS);

/** One of the card's keys, exactly as spelled? ⛔ No folding, no trimming, no prototype keys: refused, never guessed. */
export function isPolicyLineKey(key: unknown): key is PolicyLineKey {
  return typeof key === "string" && KEY_SET.has(key);
}

/** The four lines the two legal pages print (the profile note is no legal page's). */
export const POLICY_PAGE_LINE_KEYS: readonly PolicyLineKey[] = ["rg.marketing", "privacy.lawfulConsent", "privacy.lawfulLicence", "privacy.smsGateway"];

/* ══ THE PAGES AND THEIR VERSIONS ═══════════════════════════════════════════════════════════════════════════════════ */

export const POLICY_PAGE_KEYS = ["rg", "privacy"] as const;
export type PolicyPage = (typeof POLICY_PAGE_KEYS)[number];

/** The record's key for a page's saved version stamp. */
export type PolicyVersionKey = "version.rg" | "version.privacy";

export type PolicyPageSpec = {
  readonly path: string;
  /** The page's English title, for the console. */
  readonly title: string;
  /**
   * ⛔ THE VERSION THE PAGE'S OWN `META` PRINTS — a copy, because `META` must stay a literal in the page (test:rg-policy 1.1
   * and test:privacy-notice §1 read it there) and the save records the code version each stamp was made against. ⛔ L0
   * holds the two equal: move a page's META in a commit and this moves with it, or `test:policy-lines` goes red.
   */
  readonly codeVersion: string;
  readonly versionKey: PolicyVersionKey;
};

/* Typed before it is frozen, so each `versionKey` is checked as the literal key it is (a frozen inline literal would
   widen it to a string). */
const PAGES: Record<PolicyPage, PolicyPageSpec> = {
  rg: { path: "/legal/responsible-gambling", title: "Responsible Gambling Policy", codeVersion: "2026-10-06", versionKey: "version.rg" },
  privacy: { path: "/legal/privacy", title: "Privacy Policy", codeVersion: "2026-10-01", versionKey: "version.privacy" },
};

export const POLICY_PAGES: Readonly<Record<PolicyPage, PolicyPageSpec>> = Object.freeze(PAGES);

/* ══ THE WORDS A LINE MUST KEEP — one table, imported by test:privacy-notice ═════════════════════════════════════════ */

/**
 * ⭐ THE SMS GATEWAY'S FACTS — the processor words `test:privacy-notice` §2e requires of §4 in each language: who the gateway
 * is, its role, and what it receives. A saved Blackball line must keep every one. ⛔ The suite IMPORTS this table (its
 * `SMS_WORDS`), so the validator and the guard read one list — never retyped (spec §5.2). The consent clause §2e also
 * requires of today's page is NOT a fact about the gateway: it is the promise a save exists to move
 * (`CONSENT_ONLY_CLAUSE`, below).
 */
export const SMS_GATEWAY_WORDS: Readonly<Record<PolicyLocale, readonly string[]>> = Object.freeze({
  en: ["Blackball", "SMS gateway", "your phone number and the text of each message"],
  sw: ["Blackball", "lango letu la SMS", "namba yako ya simu na maandishi ya kila ujumbe"],
  zh: ["Blackball", "短信网关", "您的电话号码和每条短信的内容"],
});

/** ⭐ Where a person withdraws consent — `test:privacy-notice` §4d requires §3 to say it (its `CONSENT_PATH`, imported). */
export const CONSENT_WITHDRAW_PATH: Readonly<Record<PolicyLocale, string>> = Object.freeze({
  en: "Profile → Notifications",
  sw: "Wasifu → Arifa",
  zh: "个人资料 → 通知",
});

/** ⭐ That analytics runs only with consent, and where it is changed — `test:privacy-notice` §4f's §3 words (imported). */
export const ANALYTICS_CONSENT_WORDS: Readonly<Record<PolicyLocale, readonly string[]>> = Object.freeze({
  en: ["Google Analytics — only if you allow it", "§7"],
  sw: ["Google Analytics — ikiwa tu utairuhusu", "§7"],
  zh: ["Google Analytics——仅在首次询问时您同意", "第 7 条"],
});

/**
 * ⛔ THE CONSENT-ONLY CLAUSE of today's Blackball bullet, per language (spec §5.3, A37). `test:policy-lines` L1 holds each
 * one as a substring of its own language's default, so this cannot drift from the page; each is also one of the
 * `CONSENT_ONLY_PHRASES` opening check 1 scans for.
 */
export const CONSENT_ONLY_CLAUSE: Readonly<Record<PolicyLocale, string>> = Object.freeze({
  en: "only if you agree to receive them",
  sw: "ikiwa tu umekubali kuzipokea",
  zh: "仅在您同意接收时",
});

/**
 * ⛔ THE CONSENT-ONLY PHRASES (review F11) — opening check 1 refuses while ANY of the four page lines, in ANY language,
 * still says marketing goes only to people who agree (case aside). ⚠️ Analytics' own consent words ("only if you allow
 * it", "ikiwa tu utairuhusu", "仅在首次询问时您同意") are deliberately absent: analytics IS consent-only, and §4f requires
 * the Consent bullet to say so.
 */
export const CONSENT_ONLY_PHRASES: Readonly<Record<PolicyLocale, readonly string[]>> = Object.freeze({
  en: ["only if you agree", "only if you have agreed", "only with your consent", "only if you consent", "only to people who agree", "only to those who agree", "only if you opt in"],
  sw: ["ikiwa tu umekubali", "ikiwa tu utakubali", "kwa ridhaa yako tu", "ikiwa tu umeomba"],
  zh: ["仅在您同意接收", "只有在您同意", "仅在您同意后", "经您同意后才"],
});

const LAWFUL_CONSENT_WORDS: Readonly<Record<PolicyLocale, readonly string[]>> = Object.freeze({
  en: [CONSENT_WITHDRAW_PATH.en, ...ANALYTICS_CONSENT_WORDS.en],
  sw: [CONSENT_WITHDRAW_PATH.sw, ...ANALYTICS_CONSENT_WORDS.sw],
  zh: [CONSENT_WITHDRAW_PATH.zh, ...ANALYTICS_CONSENT_WORDS.zh],
});

/* ══ EACH LINE'S RULES ══════════════════════════════════════════════════════════════════════════════════════════════ */

export type PolicyLineSpec = {
  /** The legal page whose version new words of this line move — `null`: no versioned document (the profile note). */
  readonly page: PolicyPage | null;
  /** Characters of the saved form (code points), in EVERY language. */
  readonly min: number;
  readonly max: number;
  /** Blank in all three languages is allowed and means "not printed"; otherwise every language is required. */
  readonly clearable: boolean;
  /** The words before the first colon print in bold — today's look for a §3 bullet ("Consent: …"). */
  readonly labelled: boolean;
  /** Read against KEPT_PROMISES, in every language (the RG marketing promise). */
  readonly promises: boolean;
  /** Swahili and Chinese keep a number with its unit by a no-break space — the RG page's own rule (test:rg-policy §3.1). */
  readonly bindsNumbers: boolean;
  /** Words each language must keep, and why — said in the refusal. */
  readonly words: { readonly perLocale: Readonly<Record<PolicyLocale, readonly string[]>>; readonly why: string } | null;
};

const LINE_LENGTH = { min: 20, max: 600 } as const;

const SPEC: Record<PolicyLineKey, PolicyLineSpec> = {
  "rg.marketing": { page: "rg", ...LINE_LENGTH, clearable: false, labelled: false, promises: true, bindsNumbers: true, words: null },
  "privacy.lawfulConsent": {
    page: "privacy", ...LINE_LENGTH, clearable: false, labelled: true, promises: false, bindsNumbers: false,
    words: { perLocale: LAWFUL_CONSENT_WORDS, why: "the notice must keep saying where consent is withdrawn and that analytics runs only with it" },
  },
  "privacy.lawfulLicence": { page: "privacy", ...LINE_LENGTH, clearable: true, labelled: true, promises: false, bindsNumbers: false, words: null },
  "privacy.smsGateway": {
    page: "privacy", ...LINE_LENGTH, clearable: false, labelled: false, promises: false, bindsNumbers: false,
    words: { perLocale: SMS_GATEWAY_WORDS, why: "they are facts about the gateway" },
  },
  "profile.outreachNote": { page: null, min: 10, max: 200, clearable: true, labelled: false, promises: false, bindsNumbers: false, words: null },
};

/** ⭐ THE ONE RULE TABLE — the card's hints and the server's refusals both read it. */
export const POLICY_LINE_SPEC: Readonly<Record<PolicyLineKey, PolicyLineSpec>> = Object.freeze(SPEC);

/* ══ THE DEFAULTS — today's page text, byte for byte ════════════════════════════════════════════════════════════════ */

/** U+00A0 — where the page writes `&nbsp;`. Built from its code so it can be seen in review. */
const NBSP = String.fromCharCode(0xa0);

const DEFAULTS: Record<PolicyLineKey, PolicyTexts> = {
  // /legal/responsible-gambling §4, the first bullet (page.tsx, the en, sw and zh blocks).
  "rg.marketing": {
    en: "No marketing messages to a self-excluded player, to a player on a break until they opt in again after it ends, to a player showing a sign of harm (section 3), or to anyone under 18 or whose age we cannot confirm",
    sw: `Hakuna matangazo kwa mchezaji aliyejizuia, kwa mchezaji aliye kwenye mapumziko hadi atakapokubali tena baada ya mapumziko kuisha, kwa mchezaji anayeonyesha dalili ya madhara (sehemu ya${NBSP}3), wala kwa mtu yeyote aliye chini ya umri wa miaka${NBSP}18 au ambaye umri wake hatuwezi kuuthibitisha`,
    zh: `不向已自我排除的玩家、处于冷静期的玩家（直至其在冷静期结束后重新同意）、出现伤害迹象的玩家（见第${NBSP}3${NBSP}节），以及未满 18${NBSP}岁或无法确认年龄的人发送营销信息`,
  },
  // /legal/privacy §3, the Consent bullet — its bold label and the words after the colon, as one plain line.
  "privacy.lawfulConsent": {
    en: "Consent: marketing communications — you can withdraw it at any time under Profile → Notifications; and Google Analytics — only if you allow it when first asked, and you can change that at any time in §7 of this policy",
    sw: "Ridhaa: mawasiliano ya matangazo — unaweza kuiondoa wakati wowote kwenye Wasifu → Arifa; na Google Analytics — ikiwa tu utairuhusu unapoulizwa mara ya kwanza, na unaweza kubadilisha uamuzi huo wakati wowote katika §7 ya sera hii",
    zh: "同意：营销通讯——您可随时在“个人资料 → 通知”中撤回；以及 Google Analytics——仅在首次询问时您同意后才会开启，您可随时在本政策第 7 条中更改",
  },
  // ⭐ A NEW bullet — blank, so nothing is printed until an admin saves words in all three languages (Appendix B.4).
  "privacy.lawfulLicence": { en: "", sw: "", zh: "" },
  // /legal/privacy §4, the Blackball bullet.
  "privacy.smsGateway": {
    en: "Blackball, our SMS gateway in Tanzania, which sends our text messages, such as one-time codes and, only if you agree to receive them, offers and news: it receives your phone number and the text of each message, and tells us whether each message was delivered",
    sw: "Blackball, lango letu la SMS nchini Tanzania, linalotuma ujumbe wetu mfupi (SMS), kama misimbo ya matumizi ya mara moja na, ikiwa tu umekubali kuzipokea, ofa na habari: hupokea namba yako ya simu na maandishi ya kila ujumbe, na hutuambia kama kila ujumbe umefika",
    zh: "Blackball（坦桑尼亚），我们的短信网关：发送我们的短信，例如一次性验证码，以及仅在您同意接收时发送的优惠和资讯；接收您的电话号码和每条短信的内容，并告知我们每条短信是否已送达",
  },
  // ⚠️ Blank: no note until an admin writes one — and nothing prints it before U33a-P.
  "profile.outreachNote": { en: "", sw: "", zh: "" },
};

/**
 * ⭐ THE DEFAULTS — what the card PREFILLS a line with no saved words, and what `policyLine` answers while there are none.
 * ⛔ Byte-equal to the pages (L1). Each one passes its own rules with no problem and no hint (L1), so an admin can keep
 * today's words as they stand — the review tick, a marker with no text — and nothing on the page changes.
 */
export const POLICY_LINE_DEFAULTS: Readonly<Record<PolicyLineKey, PolicyTexts>> = Object.freeze(DEFAULTS);

const UNIT_SEPARATOR = String.fromCharCode(31);

/** A short, stable fingerprint of a line's three texts (FNV-1a over the three, joined by a unit separator, plus the length)
 *  — enough to tell that the code's own words moved; never a security device. */
export function policyTextsFingerprint(t: PolicyTexts): string {
  const s = [t.en, t.sw, t.zh].join(UNIT_SEPARATOR);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16).padStart(8, "0")}-${s.length}`;
}

/** ⭐ The fingerprint of today's code default for a line — stored with every saved version (review F4). */
export function policyDefaultFingerprint(key: PolicyLineKey): string {
  return policyTextsFingerprint(DEFAULTS[key]);
}

/* ══ THE TEXT AS IT IS SAVED ════════════════════════════════════════════════════════════════════════════════════════ */

const BACKSLASH = String.fromCharCode(92);
const FORMAT_CHARS = new RegExp(`${BACKSLASH}p{Cf}`, "gu");
const SPACE_RUN = new RegExp(`[${BACKSLASH}s${BACKSLASH}p{Cc}]+`, "gu");
const HAN = new RegExp(`^${BACKSLASH}p{Script=Han}$`, "u");
/** Full-width punctuation that carries its own space in Chinese (`test:privacy-notice` §4h's rule, widened). */
const ZH_PUNCTUATION = "，。、；：？！（）「」『』《》〈〉【】“”‘’—…·．";
const ZH_NUMBER_AFTER = /第 (?=[0-9])/g;
const ZH_UNIT_AFTER_NUMBER = /([0-9]) (?=小时|分钟|岁|节|周|个月|天|EAT)/g;
const SW_NUMBER_AFTER = /(^|[^a-z])(miaka|sehemu ya|saa|dakika|wiki|mwezi|miezi|siku) (?=[0-9])/gi;
const SW_UNIT_AFTER_NUMBER = /([0-9]) (?=EAT)/g;

/** ⭐ Chinese takes no space between two Han characters, nor beside full-width punctuation (review F10) — and KEEPS the space
 *  between Han and Latin or a digit ("50pick 短信", "第 7 条"), as every Chinese line on the site does. */
function tightenChinese(text: string): string {
  const chars = Array.from(text);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === " ") {
      const prev = chars[i - 1];
      const next = chars[i + 1];
      const betweenHan = prev !== undefined && next !== undefined && HAN.test(prev) && HAN.test(next);
      const besidePunctuation = (prev !== undefined && ZH_PUNCTUATION.includes(prev)) || (next !== undefined && ZH_PUNCTUATION.includes(next));
      if (betweenHan || besidePunctuation) continue;
    }
    out += c;
  }
  return out;
}

/** ⭐ The RG page's own typography law (`test:rg-policy` §3.1), applied to a saved Swahili or Chinese line: a number keeps
 *  its unit by a no-break space, so a line never ends on the bare number at 360px. ⛔ Never the English, never Privacy. */
function bindNumbers(text: string, locale: PolicyLocale): string {
  if (locale === "zh") return text.replace(ZH_NUMBER_AFTER, `第${NBSP}`).replace(ZH_UNIT_AFTER_NUMBER, `$1${NBSP}`);
  if (locale === "sw") return text.replace(SW_NUMBER_AFTER, `$1$2${NBSP}`).replace(SW_UNIT_AFTER_NUMBER, `$1${NBSP}`);
  return text;
}

/**
 * ⭐ THE TEXT AS IT IS SAVED, COUNTED AND CHECKED (review F9 · F10): composed (NFC), invisible format characters removed,
 * composed again; EVERY run of whitespace or control characters — a no-break space included — ONE plain space; trimmed;
 * Chinese tightened (`tightenChinese`); and for the RG line in Swahili and Chinese each number bound to its unit by a
 * no-break space AGAIN (`bindNumbers`). So the only no-break spaces a saved line holds are the ones the page's own rule
 * puts there. ⭐ IDEMPOTENT, and every default is a fixed point (L1): normalising today's text changes nothing.
 */
export function normalizePolicyLine(raw: unknown, key?: PolicyLineKey, locale?: PolicyLocale): string {
  if (typeof raw !== "string") return "";
  const composed = raw.normalize("NFC").replace(FORMAT_CHARS, "").normalize("NFC");
  let text = composed.replace(SPACE_RUN, " ").trim();
  if (locale === "zh") text = tightenChinese(text);
  if (key !== undefined && locale !== undefined && isPolicyLineKey(key) && isPolicyLocale(locale) && SPEC[key].bindsNumbers) {
    text = bindNumbers(text, locale);
  }
  return text;
}

/** A line's three languages, each as it would be saved. */
export function normalizedPolicyTexts(key: PolicyLineKey, raw: Partial<Record<PolicyLocale, unknown>>): PolicyTexts {
  return {
    en: normalizePolicyLine(raw.en, key, "en"),
    sw: normalizePolicyLine(raw.sw, key, "sw"),
    zh: normalizePolicyLine(raw.zh, key, "zh"),
  };
}

/** Two lines, language by language. */
export function samePolicyTexts(a: PolicyTexts, b: PolicyTexts): boolean {
  return a.en === b.en && a.sw === b.sw && a.zh === b.zh;
}

/* ══ HOW A LINE PRINTS ══════════════════════════════════════════════════════════════════════════════════════════════ */

const FULL_WIDTH_COLON = String.fromCharCode(0xff1a);
const LABEL_MAX = 60;

/** A labelled line split for printing: the bold label, and the rest STARTING with its colon (": …" or "：…") — one text
 *  node, exactly as today's JSX prints `<strong>Consent</strong>: marketing …`. */
export type PolicyLineParts = { readonly label: string | null; readonly rest: string };

/**
 * ⭐ WHERE THE BOLD ENDS (spec §5.2: "where a line starts with a label followed by ': ', the page prints the part before the
 * colon in bold, keeping today's look"). Only a LABELLED line has one — the Blackball bullet holds a colon too, and is never
 * bold. The label ends at the first ": " or full-width "：" (Chinese takes no space after it) within 60 characters; a line
 * with none prints plain.
 */
export function policyLineParts(key: PolicyLineKey, text: string): PolicyLineParts {
  if (!isPolicyLineKey(key) || !SPEC[key].labelled) return { label: null, rest: text };
  const ascii = text.indexOf(": ");
  const full = text.indexOf(FULL_WIDTH_COLON);
  const at = ascii < 0 ? full : full < 0 ? ascii : Math.min(ascii, full);
  if (at <= 0) return { label: null, rest: text };
  const label = text.slice(0, at);
  if (charCount(label) > LABEL_MAX || label.trim() !== label) return { label: null, rest: text };
  return { label, rest: text.slice(at) };
}

/* ══ THE RULES ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** What a refusal is about — one code per rule, so a test can ask for exactly the rule it planted. `stale` and `history`
 *  are the SERVER's (they need the saved record); every other code is `policyLineProblems`'. */
export type PolicyLineProblemCode =
  | "unknown_key" | "blank" | "too_short" | "too_long" | "markup" | "has_phone" | "long_word" | "words_missing"
  | "promise_unkept" | "hours_unkept" | "stale" | "history";

/** U13 · the send window a line's named hours are judged against — the Marketing SMS settings' pair, minutes after
 *  midnight EAT. */
export type PolicySendWindow = { readonly windowStartMinute: number; readonly windowEndMinute: number };

/** U13 · the window when none is handed in: the settings' default, 08:00–20:00 EAT (OQ5). ⛔ The server and the card always
 *  hand in the SAVED one; this default is for a reader with no record to ask (a suite's fixture). */
export const POLICY_DEFAULT_SEND_WINDOW: PolicySendWindow = Object.freeze({
  windowStartMinute: MARKETING_SMS_SETTINGS_DEFAULTS.windowStartMinute,
  windowEndMinute: MARKETING_SMS_SETTINGS_DEFAULTS.windowEndMinute,
});

export type PolicyLineProblem = { readonly code: PolicyLineProblemCode; readonly sentence: string };

/** Every problem of a line, by language, and the hints that do not block. */
export type PolicyLineVerdict = {
  readonly problems: Readonly<Record<PolicyLocale, readonly PolicyLineProblem[]>>;
  readonly hints: readonly string[];
};

const LONG_WORD = 30;

const listed = (names: readonly string[]): string =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** ⭐ THE CARD'S SENTENCES (spec §7.7) — shown under the box as it is typed, and the server answers with the same ones. */
export const POLICY_LINE_SENTENCE = {
  tooShort: (n: number): string => `Write at least ${n} characters.`,
  tooLong: (n: number): string => `Keep it to ${n} characters or fewer.`,
  hasPhone: "Remove the phone number — a run of seven or more digits reads as one, and these lines are published on the site.",
  markup: "Plain text only — remove < > { } and any code such as &nbsp; (type the character itself).",
  longWord: `Break up the long run of characters — a word longer than ${LONG_WORD} characters cannot wrap on a phone.`,
  blank: "Every language needs this line — the English is the binding text.",
  wordsMissing: (words: readonly string[], why: string): string => `This line must keep naming ${words.map((w) => `“${w}”`).join(", ")} — ${why}.`,
  promiseUnkept: (p: KeptPromise, language: string): string =>
    (p.why !== undefined
      ? `The ${language} line promises ${p.promise}, but ${p.why}. Remove it.`
      : `The ${language} line promises ${p.promise}, but the platform does not do this yet. Remove it, or have it built first.`),
  /** U13 · a time the line names that is neither the send window's opening nor its closing time. */
  hoursUnkept: (language: string, said: readonly string[], window: string): string =>
    `The ${language} line names a time the send window doesn't use${said.length > 0 ? ` (${listed(said)})` : ""} — the window is ${window}. Name only its opening or closing time, or no time at all.`,
  /** U13 · the line names a time, and the window's hours could not be read to check it (fail closed). */
  hoursUnread: (language: string): string =>
    `The ${language} line names a time, but the send window's hours couldn't be read to check it — reload the page.`,
  dropped: (p: KeptPromise): string => `The platform still refuses ${p.refuses}; the page will no longer say so.`,
  unlabelled: (language: string): string =>
    `The ${language} line has no label — the page prints the words before the first colon in bold, like the other bullets (for example “Consent: …”).`,
  mixedLanguages: (changed: readonly string[], unchanged: readonly string[]): string =>
    `Only the ${listed(changed)} changed — the ${listed(unchanged)} still ${unchanged.length === 1 ? "says" : "say"} what the page prints now. Make every language say the same thing.`,
  savedNowFails: (sentences: readonly string[]): string =>
    `This saved line no longer passes today's rules, and the page still prints it: ${sentences.join(" ")}`,
  defaultChanged: "Today's words for this line were updated since it was saved — the page prints the saved line, so check it still says what the platform does.",
  reviewStale: "Today's words were updated since this line was marked reviewed — tick it again to review the new words.",
  unknownKey: "That line isn't one this card holds — reload the page.",
  stale: "Someone saved this line since you opened the page — reload to see it.",
} as const;

/** `<` `>` `{` `}`, or an HTML entity the page would print as typed (`&nbsp;`, `&#160;`, `&#xa0;`). */
const MARKUP = /[<>{}]|&(?:[a-z]+|#[0-9]+|#x[0-9a-f]+);/i;
/** Seven or more digits with at most one space, dot, bracket, plus, solidus, comma or dash between each — any country's
 *  phone number ("+44 20 7946 0958"). ⚠️ A date written with digits ("2026-10-04") is one too: write it in words. */
const SEVEN_DIGITS = new RegExp("[0-9](?:[ .()+/,-]?[0-9]){6,}");

/** ⭐ The ONE phone-run rule (`holdsPhoneRun`), a solidus or comma joining digits (U33w m6), and any run of seven or more
 *  digits (review NIT): a public line has no number to protect. */
const holdsPhone = (text: string): boolean =>
  holdsPhoneRun(text) || holdsPhoneRun(text.split("/").join(" ").split(",").join(" ")) || SEVEN_DIGITS.test(text);

/** An unbroken run longer than 30 characters (a no-break space joins its run) — it cannot wrap at 360px. */
const holdsLongWord = (text: string): boolean => text.split(" ").some((run) => charCount(run) > LONG_WORD);

/**
 * ⭐ U13 · THE HOURS A LINE NAMES, HELD TO THE SEND WINDOW — null when it names none, or only the window's opening or
 * closing time (an hour that names no half of the day passes when either reading is one of them: "8 o'clock" is 08:00 or
 * 20:00). ⛔ FAILS CLOSED: hours that could not be read refuse any time named, and a time the clock patterns spot but
 * `timesNamedIn` cannot value is refused, never let through unread.
 */
function namedHoursProblem(text: string, language: string, w: PolicySendWindow | null): string | null {
  const named = timesNamedIn(text);
  if (named.length === 0 && !namesATime(text)) return null;
  if (w === null) return POLICY_LINE_SENTENCE.hoursUnread(language);
  const edges = [w.windowStartMinute, w.windowEndMinute];
  // ⛔ Every reading of an hour must be an edge ("8 o'clock" is 08:00 AND 20:00 — the U13 review's #2); a word time has no
  // reading at all, so it is always off.
  const off = named.filter((n) => n.minutes.length === 0 || !n.minutes.every((m) => edges.includes(m))).map((n) => n.said);
  if (off.length === 0 && named.length > 0) return null;
  return POLICY_LINE_SENTENCE.hoursUnkept(language, [...new Set(off)], formatWindow(w));
}

/**
 * ⭐ EVERY PROBLEM WITH ONE LINE, AT ONCE, in each language (spec §5.2, L3) — the card shows them under each box as it is
 * typed, and the server refuses a save with the same list. The texts are normalised first, exactly as they are saved.
 * `published` is the line as the page prints it NOW (its saved words, or today's text) — the hints compare against it.
 *   · a clearable line blank in all three languages has no problem (blank = not printed);
 *   · otherwise a blank language: "Every language needs this line — the English is the binding text.";
 *   · each language: its length, plain text, no phone number, no unbroken run over 30 characters (English and Swahili),
 *     and the words it must keep;
 *   · the RG line, in EVERY language: each promise it makes is read against KEPT_PROMISES — an unkept one is refused,
 *     naming it in that language's box — and a kept promise the published English makes that this English drops is a
 *     HINT, never a refusal;
 *   · U13 · the RG line, in EVERY language: every time it names must be the send window's opening or closing time
 *     (`sendWindow`, the hours SAVED now); ⛔ `null` — hours that could not be read — refuses any time it names;
 *   · hints that never block: a labelled line with no label (it prints plain), and one language changed while another
 *     still says what the page prints now.
 */
export function policyLineProblems(
  key: PolicyLineKey,
  raw: Partial<Record<PolicyLocale, unknown>>,
  published?: PolicyTexts,
  sendWindow: PolicySendWindow | null = POLICY_DEFAULT_SEND_WINDOW,
): PolicyLineVerdict {
  const problems: Record<PolicyLocale, PolicyLineProblem[]> = { en: [], sw: [], zh: [] };
  const hints: string[] = [];
  if (!isPolicyLineKey(key)) {
    problems.en.push({ code: "unknown_key", sentence: POLICY_LINE_SENTENCE.unknownKey });
    return { problems, hints };
  }
  const spec = SPEC[key];
  const texts = normalizedPolicyTexts(key, raw);
  if (spec.clearable && POLICY_LOCALES.every((l) => texts[l] === "")) return { problems, hints };
  for (const l of POLICY_LOCALES) {
    const t = texts[l];
    const add = (code: PolicyLineProblemCode, sentence: string): void => { problems[l].push({ code, sentence }); };
    if (t === "") { add("blank", POLICY_LINE_SENTENCE.blank); continue; }
    const n = charCount(t);
    if (n < spec.min) add("too_short", POLICY_LINE_SENTENCE.tooShort(spec.min));
    if (n > spec.max) add("too_long", POLICY_LINE_SENTENCE.tooLong(spec.max));
    if (MARKUP.test(t)) add("markup", POLICY_LINE_SENTENCE.markup);
    if (holdsPhone(t)) add("has_phone", POLICY_LINE_SENTENCE.hasPhone);
    if (l !== "zh" && holdsLongWord(t)) add("long_word", POLICY_LINE_SENTENCE.longWord);
    if (spec.words !== null) {
      const missing = spec.words.perLocale[l].filter((w) => !t.includes(w));
      if (missing.length > 0) add("words_missing", POLICY_LINE_SENTENCE.wordsMissing(missing, spec.words.why));
    }
    if (spec.promises) {
      for (const k of promisesIn(t, l)) {
        if (!KEPT_PROMISES[k].kept) add("promise_unkept", POLICY_LINE_SENTENCE.promiseUnkept(KEPT_PROMISES[k], POLICY_LOCALE_NAME[l]));
      }
      // ⭐ U13 · a time the line names must be one the send window uses — its opening or its closing time, as saved now.
      const hours = namedHoursProblem(t, POLICY_LOCALE_NAME[l], sendWindow);
      if (hours !== null) add("hours_unkept", hours);
    }
    if (spec.labelled && policyLineParts(key, t).label === null) hints.push(POLICY_LINE_SENTENCE.unlabelled(POLICY_LOCALE_NAME[l]));
  }
  if (spec.promises && texts.en !== "") {
    const made = promisesIn(texts.en, "en");
    for (const k of promisesIn((published ?? DEFAULTS[key]).en, "en")) {
      if (KEPT_PROMISES[k].kept && !made.includes(k)) hints.push(POLICY_LINE_SENTENCE.dropped(KEPT_PROMISES[k]));
    }
  }
  // A line that prints nothing yet (blank in all three) has no published words for a language to keep saying.
  if (published !== undefined && POLICY_LOCALES.some((l) => published[l] !== "")) {
    const changed = POLICY_LOCALES.filter((l) => texts[l] !== published[l]);
    if (changed.length > 0 && changed.length < POLICY_LOCALES.length) {
      const unchanged = POLICY_LOCALES.filter((l) => !changed.includes(l));
      hints.push(POLICY_LINE_SENTENCE.mixedLanguages(changed.map((l) => POLICY_LOCALE_NAME[l]), unchanged.map((l) => POLICY_LOCALE_NAME[l])));
    }
  }
  return { problems, hints };
}

/** Does a verdict hold any problem, in any language? */
export function policyVerdictBlocks(v: PolicyLineVerdict): boolean {
  return POLICY_LOCALES.some((l) => v.problems[l].length > 0);
}

/* ══ THE VERSIONS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

const VERSION_TOKEN = "[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[.][0-9]{1,4})?";
const VERSION_WHOLE = new RegExp(`^${VERSION_TOKEN}$`);
const VERSION_IN_TEXT = new RegExp(VERSION_TOKEN);

/** A page version: `YYYY-MM-DD`, or `YYYY-MM-DD.N` with N of 2 or more (the Privacy precedent: the first is the bare date). */
export function isPolicyVersion(v: unknown): v is string {
  if (typeof v !== "string" || !VERSION_WHOLE.test(v)) return false;
  const dot = v.indexOf(".");
  const day = dot < 0 ? v : v.slice(0, dot);
  if (!Number.isFinite(Date.parse(`${day}T00:00:00.000Z`))) return false;
  return dot < 0 || Number(v.slice(dot + 1)) >= 2;
}

function versionParts(v: string): { day: string; n: number } {
  const dot = v.indexOf(".");
  return dot < 0 ? { day: v, n: 1 } : { day: v.slice(0, dot), n: Number(v.slice(dot + 1)) };
}

/** Negative when `a` is the earlier version, positive when it is the later one, 0 when they are the same. */
export function comparePolicyVersions(a: string, b: string): number {
  const x = versionParts(a), y = versionParts(b);
  if (x.day !== y.day) return x.day < y.day ? -1 : 1;
  return x.n - y.n;
}

/** The version one save after `v` on the same day. */
function nextSuffix(v: string): string {
  const { day, n } = versionParts(v);
  return `${day}.${n + 1}`;
}

/** ⭐ A page's saved stamp, with the code version it was made against (review F5). */
export type PolicyPageStamp = { readonly stamp: string; readonly base: string };

/** A well-formed stamp — both versions readable; a field this build does not know is ignored. */
export function isPolicyPageStamp(x: unknown): x is PolicyPageStamp {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return isPolicyVersion(o.stamp) && isPolicyVersion(o.base);
}

/**
 * ⭐ THE VERSION A PAGE PRINTS — ONE function of (its code version, its saved stamp, the stamp's base), read by META, the
 * card and the next stamp (review F5):
 *   · no stamp → the code version;
 *   · the code version is still the one the stamp was made against → the later of the two (the stamp, by construction);
 *   · the code version MOVED since → the code version when it is later than the stamp, and otherwise the stamp's next
 *     suffix — so a same-day code bump can never print the stamp's label over different text.
 */
export function printedPolicyVersion(code: string, saved: PolicyPageStamp | null | undefined): string {
  if (!saved || !isPolicyVersion(saved.stamp)) return code;
  if (!isPolicyVersion(code)) return saved.stamp;
  if (saved.base === code) return comparePolicyVersions(saved.stamp, code) > 0 ? saved.stamp : code;
  return comparePolicyVersions(code, saved.stamp) > 0 ? code : nextSuffix(saved.stamp);
}

/**
 * ⭐ THE STAMP NEW WORDS GIVE THEIR PAGE: today's EAT date — or, when the version the page prints NOW is already of today
 * (or dated ahead of the clock), its next suffix (`.2`, `.3` …). ⛔ Always strictly LATER than what the page prints, so
 * META moves on every save that changes the page's words.
 */
export function nextPolicyVersion(printed: string, nowMs: number): string {
  const today = eatDayKey(Number.isFinite(nowMs) ? nowMs : Date.now());
  const { day } = versionParts(printed);
  return day >= today ? nextSuffix(printed) : today;
}

/** ⭐ A page's META line with its version made the one the page prints (`printedPolicyVersion`) — unchanged, byte for
 *  byte, while nothing is stamped. */
export function metaWithVersion(meta: string, saved: PolicyPageStamp | null | undefined): string {
  const m = VERSION_IN_TEXT.exec(meta);
  if (!m) return meta;
  const printed = printedPolicyVersion(m[0], saved);
  return printed === m[0] ? meta : `${meta.slice(0, m.index)}${printed}${meta.slice(m.index + m[0].length)}`;
}

/* ══ THE HISTORY OF A LINE ══════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ A saved version that CHANGED the words: the three texts the page prints, and the code default they replaced. */
export type PolicyWordsVersion = {
  /** 1, 2, 3 … in save order — the count a page edited from must match (a stale page is refused). */
  readonly rev: number;
  /** ⛔ VERBATIM, as normalised at the save (`normalizePolicyLine`). A clearable line may be saved blank. */
  readonly en: string;
  readonly sw: string;
  readonly zh: string;
  /** The fingerprint of the code default when these words were saved (`policyDefaultFingerprint`). */
  readonly codeDefault: string;
  /** The save's instant (ISO) and author (a staff id) — both the server's. */
  readonly savedAt: string;
  readonly savedBy: string;
};

/** ⭐ A REVIEW MARKER: today's words, read and kept. No text — the page keeps printing the code's literal (review F4). */
export type PolicyReviewVersion = {
  readonly rev: number;
  /** The fingerprint of the code default that was reviewed. Opening check 2 counts the review only while it matches. */
  readonly reviewedDefault: string;
  readonly savedAt: string;
  readonly savedBy: string;
};

export type PolicyLineVersion = PolicyWordsVersion | PolicyReviewVersion;
/** A line's saved versions, OLDEST FIRST (the newest is last); `[]` for a line never saved. */
export type PolicyLineHistory = readonly PolicyLineVersion[];

export function isReviewVersion(v: PolicyLineVersion): v is PolicyReviewVersion {
  return typeof (v as { reviewedDefault?: unknown }).reviewedDefault === "string";
}

const ISO_INSTANT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?Z$/;
const isIsoInstant = (s: unknown): boolean => typeof s === "string" && ISO_INSTANT.test(s) && Number.isFinite(Date.parse(s));

/** One well-formed version at its place — read TOLERANTLY: a field this build does not know is ignored (and kept). ⚠️ Its
 *  words are not re-judged by today's rules: a rule tightened later must never turn a published line into an unreadable
 *  one (the card flags it instead). */
function isVersionAt(x: unknown, rev: number): boolean {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (o.rev !== rev || !isIsoInstant(o.savedAt) || typeof o.savedBy !== "string" || o.savedBy.trim() === "") return false;
  if (typeof o.reviewedDefault === "string") {
    return o.reviewedDefault !== "" && o.en === undefined && o.sw === undefined && o.zh === undefined;
  }
  return typeof o.en === "string" && typeof o.sw === "string" && typeof o.zh === "string"
    && typeof o.codeDefault === "string" && o.codeDefault !== "";
}

/** A well-formed history: versions 1, 2, 3 … in order. ⭐ ONE predicate for hydration, validation and the read-back. */
export function isPolicyLineHistory(raw: unknown): raw is PolicyLineHistory {
  return Array.isArray(raw) && raw.every((x, i) => isVersionAt(x, i + 1));
}

/** A version copied whole — every field, a newer build's too. */
const copyVersion = (v: PolicyLineVersion): PolicyLineVersion => ({ ...v });
const copyHistory = (h: PolicyLineHistory | undefined): PolicyLineHistory => (Array.isArray(h) ? h.map(copyVersion) : []);

/** Two versions, field by field, whatever the order of their keys. */
function sameVersion(a: PolicyLineVersion | undefined, b: PolicyLineVersion | undefined): boolean {
  if (a === undefined || b === undefined) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length
    && ka.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}

/** What a line is NOW, read from its history. */
export type PolicyLineState = {
  /** The newest version, or `null` for a line never saved. */
  readonly latest: PolicyLineVersion | null;
  /** The saved words the page prints — `null` while it prints today's text (never saved, or the newest is a review). */
  readonly words: PolicyTexts | null;
  /** The words the page prints NOW: the saved words, or today's text. */
  readonly printed: PolicyTexts;
  /** The newest version is a review of TODAY's code default (its fingerprint still matches). */
  readonly reviewedCurrent: boolean;
  /** The code default changed since the newest version was saved or reviewed. */
  readonly defaultChanged: boolean;
};

/** ⭐ A line's state from its history — what the page prints, and what the card must say about it. */
export function policyLineState(key: PolicyLineKey, history: PolicyLineHistory): PolicyLineState {
  const latest = history.length > 0 ? history[history.length - 1] : null;
  const fingerprint = policyDefaultFingerprint(key);
  if (latest === null) return { latest, words: null, printed: DEFAULTS[key], reviewedCurrent: false, defaultChanged: false };
  if (isReviewVersion(latest)) {
    const current = latest.reviewedDefault === fingerprint;
    return { latest, words: null, printed: DEFAULTS[key], reviewedCurrent: current, defaultChanged: !current };
  }
  const words = { en: latest.en, sw: latest.sw, zh: latest.zh };
  return { latest, words, printed: words, reviewedCurrent: false, defaultChanged: latest.codeDefault !== fingerprint };
}

/* ══ THE RECORD ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The persisted record — one history per line and one stamp per page (`null`: never stamped). */
export type PolicyLinesRecord = {
  readonly "rg.marketing": PolicyLineHistory;
  readonly "privacy.lawfulConsent": PolicyLineHistory;
  readonly "privacy.lawfulLicence": PolicyLineHistory;
  readonly "privacy.smsGateway": PolicyLineHistory;
  readonly "profile.outreachNote": PolicyLineHistory;
  readonly "version.rg": PolicyPageStamp | null;
  readonly "version.privacy": PolicyPageStamp | null;
};
export type PolicyRecordKey = keyof PolicyLinesRecord;

/** What a save hands the factory: the FULL rebuilt history of each line it changed and each stamp it made — nothing else. */
export type PolicyLinesUpdate = { readonly [K in PolicyRecordKey]?: PolicyLinesRecord[K] };

const VERSION_KEYS: readonly PolicyVersionKey[] = ["version.rg", "version.privacy"];
const RECORD_KEY_SET: ReadonlySet<string> = new Set<string>([...POLICY_LINE_KEYS, ...VERSION_KEYS]);
const isPolicyRecordKey = (k: string): k is PolicyRecordKey => RECORD_KEY_SET.has(k);

const NO_HISTORY: PolicyLineHistory = Object.freeze([]);

/** ⭐ Nothing saved — the record's default, and what a process that could not load the record holds (its pages print
 *  their own words, and its readers answer "not saved"). */
export const EMPTY_POLICY_LINES: PolicyLinesRecord = Object.freeze({
  "rg.marketing": NO_HISTORY,
  "privacy.lawfulConsent": NO_HISTORY,
  "privacy.lawfulLicence": NO_HISTORY,
  "privacy.smsGateway": NO_HISTORY,
  "profile.outreachNote": NO_HISTORY,
  "version.rg": null,
  "version.privacy": null,
});

const copyStamp = (s: PolicyPageStamp | null | undefined): PolicyPageStamp | null => (s ? { ...s } : null);

/** What a read of the persisted row made of it: the record the readers may use, and every entry it had to DROP. */
export type PolicyRowReading = { readonly record: PolicyLinesRecord; readonly dropped: readonly string[] };

/**
 * The record as hydration reads it from SystemConfig. ⛔ A malformed history reads as NEVER SAVED (its page prints its own
 * words) and is never half-used; an unknown top-level key is left out. ⛔ M1 (the U33w rule) · EVERY SUCH ENTRY IS NAMED in
 * `dropped` — a row that is not an object at all as "(the whole row)" — because a save writes the WHOLE record and must
 * never rewrite what it could not read: while a read dropped anything, every save is refused and the row is left for a
 * developer. ⭐ A version holding a field this build does not know is NOT malformed: it is read, and kept whole.
 */
export function readPolicyLinesReport(raw: unknown): PolicyRowReading {
  const isRecord = !!raw && typeof raw === "object" && !Array.isArray(raw);
  const o: Record<string, unknown> = isRecord ? (raw as Record<string, unknown>) : {};
  const dropped: string[] = [];
  if (!isRecord && raw !== null && raw !== undefined) dropped.push("(the whole row)");
  for (const k of Object.keys(o)) if (!isPolicyRecordKey(k)) dropped.push(k);
  const valueOf = (k: string): unknown => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
  const line = (k: PolicyLineKey): PolicyLineHistory => {
    const v = valueOf(k);
    if (v === null || v === undefined) return NO_HISTORY;
    if (isPolicyLineHistory(v)) return copyHistory(v);
    dropped.push(k);
    return NO_HISTORY;
  };
  const stamp = (k: PolicyVersionKey): PolicyPageStamp | null => {
    const v = valueOf(k);
    if (v === null || v === undefined) return null;
    if (isPolicyPageStamp(v)) return copyStamp(v);
    dropped.push(k);
    return null;
  };
  const record: PolicyLinesRecord = {
    "rg.marketing": line("rg.marketing"),
    "privacy.lawfulConsent": line("privacy.lawfulConsent"),
    "privacy.lawfulLicence": line("privacy.lawfulLicence"),
    "privacy.smsGateway": line("privacy.smsGateway"),
    "profile.outreachNote": line("profile.outreachNote"),
    "version.rg": stamp("version.rg"),
    "version.privacy": stamp("version.privacy"),
  };
  return { record, dropped };
}

/** The record alone (`readPolicyLinesReport`). */
export function readPolicyLines(raw: unknown): PolicyLinesRecord {
  return readPolicyLinesReport(raw).record;
}

/** The factory's validation of a record about to be stored — its SHAPE only: the card's keys and nothing else, each history
 *  well formed, each stamp `null` or well formed. ⭐ ONE predicate for hydration, validation and the read-back. */
export function policyLinesShapeProblem(c: unknown): string | null {
  if (!c || typeof c !== "object" || Array.isArray(c)) return "The saved policy lines are unreadable, so nothing was saved.";
  const o = c as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!isPolicyRecordKey(k)) return "The saved policy lines hold a key this card does not, so nothing was saved.";
  for (const k of POLICY_LINE_KEYS) if (!isPolicyLineHistory(o[k])) return "A saved policy line's history is malformed, so nothing was saved.";
  for (const k of VERSION_KEYS) if (!(o[k] === null || isPolicyPageStamp(o[k]))) return "A saved page version is malformed, so nothing was saved.";
  return null;
}

/**
 * ⛔ THE RECORD'S OWN MERGE (spec §5: "each record passes its own merge"). Each key takes what the server REBUILT for it,
 * or keeps its current one; nothing outside the card's keys survives; every history is a fresh copy, so the factory's cache,
 * its `before` and its `after` never share an array.
 */
export function mergePolicyLines(current: PolicyLinesRecord, updates: PolicyLinesUpdate): PolicyLinesRecord {
  const has = (k: PolicyRecordKey): boolean => Object.prototype.hasOwnProperty.call(updates, k);
  const line = (k: PolicyLineKey): PolicyLineHistory => copyHistory(has(k) ? updates[k] : current[k]);
  const stamp = (k: PolicyVersionKey): PolicyPageStamp | null => copyStamp(has(k) ? updates[k] : current[k]);
  return {
    "rg.marketing": line("rg.marketing"),
    "privacy.lawfulConsent": line("privacy.lawfulConsent"),
    "privacy.lawfulLicence": line("privacy.lawfulLicence"),
    "privacy.smsGateway": line("privacy.smsGateway"),
    "profile.outreachNote": line("profile.outreachNote"),
    "version.rg": stamp("version.rg"),
    "version.privacy": stamp("version.privacy"),
  };
}

/** Why a proposed record is not an append to the current one. */
export type PolicyHistoryProblem = "unknown_key" | "dropped" | "rewritten" | "misnumbered" | "two_at_once";

/**
 * ⛔ THE APPEND-ONLY CHECK (review F12, the wordings' W3), run by the server over the WHOLE record before every write: every
 * saved version of every line is still there, field for field, in its place; at most ONE version is added to a line,
 * numbered next; and no key outside the card's appears. `null` when `after` is a clean append to `before`.
 */
export function policyHistoryProblem(before: PolicyLinesRecord, after: PolicyLinesRecord): PolicyHistoryProblem | null {
  if (!after || typeof after !== "object") return "dropped";
  for (const k of Object.keys(after)) if (!isPolicyRecordKey(k)) return "unknown_key";
  for (const k of POLICY_LINE_KEYS) {
    const was = before[k] ?? NO_HISTORY;
    const now = after[k];
    if (!Array.isArray(now) || now.length < was.length) return "dropped";
    for (let i = 0; i < was.length; i++) if (!sameVersion(was[i], now[i])) return "rewritten";
    if (now.length > was.length + 1) return "two_at_once";
    if (now.length === was.length + 1 && now[was.length]?.rev !== was.length + 1) return "misnumbered";
  }
  return null;
}

/* ══ WHAT A REQUEST DOES TO A LINE — one rule for the card and the server ═══════════════════════════════════════════ */

/**
 * ⭐ DO THESE WORDS CHANGE WHAT THE PAGE PRINTS? (review F1) — compared with the saved words, or, while the line has none
 * (never saved, or its newest version is a review), with today's text — for a clearable line that is blank. Only a save
 * that moves the words moves the page's version.
 */
export function policyLineMovesWords(key: PolicyLineKey, normalized: PolicyTexts, saved: PolicyTexts | null): boolean {
  return !samePolicyTexts(normalized, saved ?? normalizedPolicyTexts(key, DEFAULTS[key]));
}

/**
 * ⭐ DOES THIS REQUEST WRITE A VERSION? The card decides what to send with it, and the server what to write:
 *   · new words (`policyLineMovesWords`) — always, as a WORDS version;
 *   · today's words with the line's REVIEW tick — a REVIEW MARKER, for a line that is not clearable and prints today's
 *     text, unless its newest version already reviews today's code default. A POST of today's words without the tick
 *     writes nothing, so nothing is marked reviewed by accident.
 */
export function policyLineChanges(
  key: PolicyLineKey,
  normalized: PolicyTexts,
  saved: PolicyTexts | null,
  review: boolean,
  reviewedCurrent: boolean,
): boolean {
  if (policyLineMovesWords(key, normalized, saved)) return true;
  return review && saved === null && !SPEC[key].clearable && !reviewedCurrent;
}

/**
 * ⛔ m1 · THE SERVER'S OWN RULE FOR ONE LINE — it needs the saved record the card cannot vouch for: a page edited from a
 * revision that is not the revision saved NOW (behind, or ahead) is refused under its English box, never a quiet supersede
 * of a line somebody saved since the page opened.
 */
export function policyAdmissionProblems(base: number, history: PolicyLineHistory): PolicyLineProblem[] {
  return base !== history.length ? [{ code: "stale", sentence: POLICY_LINE_SENTENCE.stale }] : [];
}

/* ══ WHAT THE CARD SENDS ════════════════════════════════════════════════════════════════════════════════════════════ */

/** The request field of one language of one line. */
export function policyTextFieldName(key: PolicyLineKey, locale: PolicyLocale): string {
  return `text.${key}.${locale}`;
}

/** The request field naming the revision a line was edited from (0 for a line never saved). */
export function policyBaseFieldName(key: PolicyLineKey): string {
  return `base.${key}`;
}

/** The request field that marks today's words reviewed, on purpose — sent as `1`. */
export function policyReviewFieldName(key: PolicyLineKey): string {
  return `review.${key}`;
}

/** ⭐ The `data-field` a refusal names for one language box — ONE spelling, read by the action and the card alike. */
export function policyLineFieldName(key: PolicyLineKey, locale: PolicyLocale): string {
  return `policy-${key}-${locale}`;
}

/** One line as the card holds it: the revision saved now, the saved words the page prints (`null` while it prints
 *  today's text), and whether its newest version reviews today's code default. */
export type PolicyCardLine = { readonly rev: number; readonly words: PolicyTexts | null; readonly reviewedCurrent: boolean };

/** What the card knows when it saves: each box's text, each line's saved state, and the review ticks. */
export type PolicyCardState = {
  readonly texts: Readonly<Record<PolicyLineKey, PolicyTexts>>;
  readonly saved: Readonly<Record<PolicyLineKey, PolicyCardLine>>;
  readonly review: Readonly<Partial<Record<PolicyLineKey, boolean>>>;
};

/** One line a save will send: its three texts as typed, the revision it was edited from, and its review tick. */
export type PolicyLineToSave = { readonly key: PolicyLineKey; readonly texts: PolicyTexts; readonly base: number; readonly review: boolean };

/** ⭐ WHAT A SAVE SENDS — exactly the lines `policyLineChanges` says it changes, each with its revision; the review tick
 *  travels only with a line that prints today's text, is not clearable and is not already reviewed. */
export function policyLinesToSave(state: PolicyCardState): PolicyLineToSave[] {
  const out: PolicyLineToSave[] = [];
  for (const key of POLICY_LINE_KEYS) {
    const raw = state.texts[key] ?? { en: "", sw: "", zh: "" };
    const saved = state.saved[key] ?? { rev: 0, words: null, reviewedCurrent: false };
    const review = saved.words === null && !SPEC[key].clearable && !saved.reviewedCurrent && state.review[key] === true;
    if (policyLineChanges(key, normalizedPolicyTexts(key, raw), saved.words, review, saved.reviewedCurrent)) {
      out.push({ key, texts: { en: raw.en, sw: raw.sw, zh: raw.zh }, base: saved.rev, review });
    }
  }
  return out;
}

/** The request the card posts, field by field: the three texts, the `base.<key>`, and `review.<key>=1` where it applies. */
export function policyLinesPostEntries(list: readonly PolicyLineToSave[]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const line of list) {
    for (const l of POLICY_LOCALES) out.push([policyTextFieldName(line.key, l), line.texts[l]]);
    out.push([policyBaseFieldName(line.key), String(line.base)]);
    if (line.review) out.push([policyReviewFieldName(line.key), "1"]);
  }
  return out;
}

/* ══ THE REQUEST, AS THE SERVER READS IT ════════════════════════════════════════════════════════════════════════════ */

/** One line's request: plain TEXT in each language, the revision it was edited from, and its review tick — ⛔ never a
 *  saved version, a revision of its own, a stamp, an author or a version. */
export type PolicyLineRequest = { readonly texts: PolicyTexts; readonly base: number; readonly review: boolean };
export type PolicyLinesRequest = { readonly lines: { readonly [K in PolicyLineKey]?: PolicyLineRequest } };
export type PolicyRequestReading = { readonly ok: true; readonly request: PolicyLinesRequest } | { readonly ok: false };

const TEXT_PREFIX = "text.";
const BASE_PREFIX = "base.";
const REVIEW_PREFIX = "review.";
const BASE_COUNT = /^[0-9]{1,6}$/;

/**
 * ⛔ THE REQUEST, READ AS HOSTILE. A plain object whose every field is one of: `text.<key>.<locale>` with its words;
 * `base.<key>` (a whole number); `review.<key>` (exactly `1`). A line sent carries all three languages AND its base; no
 * base or review is sent for a line that is not. Anything else is not understood and nothing is written: a saved-version
 * object, a version, an unknown field, a non-string, a file, a prototype trick.
 */
export function readPolicyLinesPatch(raw: unknown): PolicyRequestReading {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) return { ok: false };
  const texts: Partial<Record<PolicyLineKey, Partial<Record<PolicyLocale, string>>>> = {};
  const base: Partial<Record<PolicyLineKey, number>> = {};
  const review: Partial<Record<PolicyLineKey, true>> = {};
  for (const name of Object.keys(raw)) {
    const value = (raw as Record<string, unknown>)[name];
    if (typeof value !== "string") return { ok: false };
    if (name.startsWith(TEXT_PREFIX)) {
      const rest = name.slice(TEXT_PREFIX.length);
      const dot = rest.lastIndexOf(".");
      if (dot <= 0) return { ok: false };
      const key = rest.slice(0, dot);
      const locale = rest.slice(dot + 1);
      if (!isPolicyLineKey(key) || !isPolicyLocale(locale)) return { ok: false };
      const forKey: Partial<Record<PolicyLocale, string>> = texts[key] ?? {};
      forKey[locale] = value;
      texts[key] = forKey;
    } else if (name.startsWith(BASE_PREFIX)) {
      const key = name.slice(BASE_PREFIX.length);
      if (!isPolicyLineKey(key) || !BASE_COUNT.test(value)) return { ok: false };
      base[key] = Number(value);
    } else if (name.startsWith(REVIEW_PREFIX)) {
      const key = name.slice(REVIEW_PREFIX.length);
      if (!isPolicyLineKey(key) || value !== "1") return { ok: false };
      review[key] = true;
    } else {
      return { ok: false };
    }
  }
  const lines: { [K in PolicyLineKey]?: PolicyLineRequest } = {};
  for (const k of POLICY_LINE_KEYS) {
    const t = texts[k];
    const b = base[k];
    if ((t === undefined) !== (b === undefined)) return { ok: false };
    if (t === undefined || b === undefined) {
      if (review[k] === true) return { ok: false };
      continue;
    }
    const en = t.en, sw = t.sw, zh = t.zh;
    if (en === undefined || sw === undefined || zh === undefined) return { ok: false };
    lines[k] = { texts: { en, sw, zh }, base: b, review: review[k] === true };
  }
  return { ok: true, request: { lines } };
}

/* ══ WHAT LICENCE OUTREACH NEEDS FROM THE SAVED LINES (spec §5.3, checks 1–3; U33a-R wires them) ════════════════════ */

export const POLICY_OPENING_CHECKS = ["privacy_gateway", "privacy_lawful", "rg_age"] as const;
export type PolicyOpeningCheck = (typeof POLICY_OPENING_CHECKS)[number];

/** Does a text still say marketing goes only to people who agree (any of its language's `CONSENT_ONLY_PHRASES`, case
 *  aside, a no-break space read as a space)? */
export function holdsConsentOnlyPhrase(text: string, locale: PolicyLocale): boolean {
  const fold = (s: string): string => s.toLowerCase().split(NBSP).join(" ");
  const reading = fold(text);
  return CONSENT_ONLY_PHRASES[locale].some((phrase) => reading.includes(fold(phrase)));
}

/**
 * ⭐ THE OPENING CHECKS THAT READ THE SAVED POLICY LINES — the three of spec §5.3 the public texts own (the fourth,
 * `PRE_LEDGER_OFFS`, is U33a-R's). Each failing check is named, in order; `[]` means the texts no longer contradict
 * licence outreach:
 *   1 · `privacy_gateway` — the Blackball line has been SAVED, and none of the four page lines, in ANY language, still says
 *                           marketing goes only to people who agree (review F11: `CONSENT_ONLY_PHRASES`, read over the
 *                           words each page prints NOW);
 *   2 · `privacy_lawful`  — the licence line has been saved with words, and the Consent line saved: new words, or a review
 *                           whose fingerprint is still today's code default (review F4);
 *   3 · `rg_age`          — the RG line has been saved and the English it prints says how a non-member's age is confirmed:
 *                           it names "staff" and "18".
 * ⚠️ U33a-R must also refuse while the record is not readable (`policyLinesReadable`, server side).
 */
export function policyOpeningProblems(record: PolicyLinesRecord): PolicyOpeningCheck[] {
  const out: PolicyOpeningCheck[] = [];
  const state = (k: PolicyLineKey): PolicyLineState => policyLineState(k, record[k] ?? NO_HISTORY);
  const gateway = state("privacy.smsGateway");
  const contradicts = POLICY_PAGE_LINE_KEYS.some((k) => POLICY_LOCALES.some((l) => holdsConsentOnlyPhrase(state(k).printed[l], l)));
  if (gateway.latest === null || contradicts) out.push("privacy_gateway");
  const consent = state("privacy.lawfulConsent");
  const licence = state("privacy.lawfulLicence");
  const consentSaved = consent.words !== null || consent.reviewedCurrent;
  const licenceWords = licence.words !== null && POLICY_LOCALES.every((l) => (licence.words?.[l] ?? "").trim() !== "");
  if (!consentSaved || !licenceWords) out.push("privacy_lawful");
  const rg = state("rg.marketing");
  const reading = promiseReading(rg.printed.en);
  if (rg.latest === null || !holdsPhrase(reading, "staff") || !holdsPhrase(reading, "18")) out.push("rg_age");
  return out;
}

/* ══ ONE BUNDLE FOR THE SERVER ══════════════════════════════════════════════════════════════════════════════════════ */

/** The pieces the server's setter and readers are built from — so `test:policy-lines` builds the REAL store with one piece
 *  planted, and never a re-implementation of it (the `support-config` "one shape, two instances" lesson). */
export type PolicyLineRules = {
  readonly readPatch: (raw: unknown) => PolicyRequestReading;
  readonly normalize: (raw: unknown, key?: PolicyLineKey, locale?: PolicyLocale) => string;
  readonly problems: (key: PolicyLineKey, raw: Partial<Record<PolicyLocale, unknown>>, published?: PolicyTexts, sendWindow?: PolicySendWindow | null) => PolicyLineVerdict;
  readonly changes: (key: PolicyLineKey, normalized: PolicyTexts, saved: PolicyTexts | null, review: boolean, reviewedCurrent: boolean) => boolean;
  readonly movesWords: (key: PolicyLineKey, normalized: PolicyTexts, saved: PolicyTexts | null) => boolean;
  readonly admit: (base: number, history: PolicyLineHistory) => readonly PolicyLineProblem[];
  readonly appendOnly: (before: PolicyLinesRecord, after: PolicyLinesRecord) => PolicyHistoryProblem | null;
  readonly nextVersion: (printed: string, nowMs: number) => string;
  readonly readRow: (raw: unknown) => PolicyRowReading;
};

export const POLICY_LINE_RULES: PolicyLineRules = Object.freeze({
  readPatch: readPolicyLinesPatch,
  normalize: normalizePolicyLine,
  problems: policyLineProblems,
  changes: policyLineChanges,
  movesWords: policyLineMovesWords,
  admit: policyAdmissionProblems,
  appendOnly: policyHistoryProblem,
  nextVersion: nextPolicyVersion,
  readRow: readPolicyLinesReport,
});
