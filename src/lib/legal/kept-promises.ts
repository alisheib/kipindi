/**
 * U33p · KEPT_PROMISES — which marketing promises the code KEEPS, and the words that make a line promise one (spec
 * `docs/marketing-specs/U33a-U37c-OD58.md` §5.2 · §5.4 · S15; OD58; the owner rule of 2026-10-03, "admins can change
 * everything"; the U33p review, F2 · F3 · F13).
 *
 * ⭐ WHY THIS EXISTS. The first bullet of /legal/responsible-gambling §4 — the marketing promise — is an admin-edited line
 * now (`legal.policy_lines`, the "Public policy lines" card on /admin/system). A saved line reaches every visitor at once,
 * so a save must never publish a promise the code does not keep: that is D12, the defect `test:rg-policy` exists for ("a
 * promise with no control behind it"), arriving through a form instead of a commit. The save's validator
 * (`policyLineProblems`, `./policy-lines`) reads this map:
 *   · a line that promises an UNKEPT control is REFUSED, naming the promise and where its control would live — in ANY
 *     language: a promise made only in the Swahili or the Chinese is still published (F3);
 *   · a line that drops a KEPT promise the published line makes gets a HINT ("the code still refuses it; the page will no
 *     longer say so") and never a refusal — a page that says less than the code does is not saying anything false.
 *
 * ⛔ ENGINEERING TRUTH, HELD BY A TEST — NEVER EDITABLE CONFIG (spec §5.4). `kept` says what the CODE does, so it is code:
 * `test:rg-policy` K1 holds every value against the source — true if and only if its control exists — so this map can
 * never say "kept" for a control nobody built. U13 (2026-10-07) built the send window and flipped `lateNight` to true IN
 * THE SAME COMMIT, as K1 demands: a plant that says "kept" while `src/lib/marketing/window.ts` is absent, or while
 * `dispatch.ts` no longer reads it, fails K1. When U14 builds the frequency cap, its entry flips the same way.
 *
 * ⭐ HOW A LINE IS READ. The English (the binding text) is read for every promise's phrases and patterns; Swahili and
 * Chinese for each promise's own short word list (Swahili whole-word, Chinese as a substring — it has no spaces) and its
 * own patterns (a frequency written "mara 2 kwa wiki" or "每周最多两条"); and EVERY language for a clock time (a time
 * window is a late-night promise in any language, F3). A phrase is matched WHOLE (no
 * letter or digit right before or after it), case aside, with a no-break space read as a space, a dash variant as a
 * hyphen and a curly apostrophe as the plain one.
 * ⭐ U13 · THE TIMES A LINE NAMES ARE READ TOO (`timesNamedIn`, in every spelling the clock patterns spot), so the save can
 * hold each one to the send window's own hours: a promise kept in words is not kept at an hour the window does not use.
 *
 * Pure and client-safe — it imports nothing: the card runs it live through `policyLineProblems`. ⛔ No regex here is typed
 * with a backslash (an editing tool decodes typed escapes — repo memory, 2026-10-02), and none uses a lookbehind.
 */

/** ⭐ Every promise the RG marketing line can make, in the order a refusal or a hint names them. */
export const PROMISE_KEYS = [
  "selfExcluded", "onBreak", "harmSign", "under18", "ageUnconfirmed", "staffConfirmedAge", "under25", "lateNight", "evening",
  "frequencyCap",
] as const;
export type PromiseKey = (typeof PROMISE_KEYS)[number];

/** The languages a line is read in (the same three `./policy-lines` prints — declared here so this file imports nothing). */
export type PromiseLocale = "en" | "sw" | "zh";

export type KeptPromise = {
  /** ⛔ Does the code keep it? `test:rg-policy` K1: true if and only if the control exists in the source. */
  readonly kept: boolean;
  /** Lower-case English phrases that make a line promise it, each matched whole. */
  readonly phrases: readonly string[];
  /** English phrasings a phrase list cannot hold ("at most two messages a week"). */
  readonly patterns: readonly RegExp[];
  /** Patterns read in EVERY language — a clock time is a time window whatever the words around it. */
  readonly anyLanguage: readonly RegExp[];
  /** Swahili words that make a line promise it, matched whole. */
  readonly sw: readonly string[];
  /** Chinese words that make a line promise it, matched as substrings (Chinese has no spaces). */
  readonly zh: readonly string[];
  /** Swahili and Chinese phrasings a word list cannot hold ("mara 2 kwa wiki", "每周最多两条"). */
  readonly swPatterns: readonly RegExp[];
  readonly zhPatterns: readonly RegExp[];
  /** The promise, in a refusal: "The English line promises <promise>, but the platform does not do this yet." (`control` is
   *  for developers and K1 — never shown to an admin.) */
  readonly promise: string;
  /** U13 · why an unkept promise is not kept, when the answer is not "not yet" — said in its refusal in place of "the
   *  platform does not do this yet" (the evening: marketing SMS are sent until the send window closes). */
  readonly why?: string;
  /** Where its control lives — or, while it is unkept, where it would. */
  readonly control: string;
  /** What the platform refuses, in the hint for a kept promise a line drops: "The platform still refuses <refuses>; …". */
  readonly refuses: string;
};

/* ── U13 review #1 · TIMES WRITTEN IN WORDS — seen, never valued (so a line naming one is refused, not let through): an
   English hour word beside a time word ("seven at night", "nine pm") or after a time preposition at a sentence break
   ("after seven."), the Swahili clock after its own prepositions or before a part of the day ("baada ya saa moja", "saa 2
   usiku" — 20:00 on the Swahili clock), and Chinese numerals before 点/时 ("七点"). A duration is NOT a time ("ndani ya saa
   moja", "within one hour", "两小时"). Full-width digits are read as digits (`promiseReading` folds them, NFKC). */
const EN_HOUR_WORD = "(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
const EN_TIME_WORD = "( o'clock| ?am| ?pm| ?a[.]m[.]| ?p[.]m[.]| at night| in the morning| in the evening| tonight)";
const SW_HOUR = "([0-9]{1,2}|kumi na moja|kumi na mbili|moja|mbili|tatu|nne|tano|sita|saba|nane|tisa|kumi)";
const WORD_TIMES: readonly RegExp[] = [
  new RegExp(`(^|[^a-z])${EN_HOUR_WORD}${EN_TIME_WORD}([^a-z]|$)`, "g"),
  new RegExp(`(^|[^a-z])(after|before|until|till|from|past|by) ${EN_HOUR_WORD}([.,;:!)]|$)`, "g"),
  new RegExp(`(^|[^a-z])(baada ya|kabla ya|hadi|mpaka|kuanzia|tangu|kufikia) saa ${SW_HOUR}([^a-z]|$)`, "g"),
  new RegExp(`(^|[^a-z])saa ${SW_HOUR} (asubuhi|mchana|jioni|usiku|alfajiri|kamili)([^a-z]|$)`, "g"),
  /[一二三四五六七八九十零两]+ ?[点时]/g,
];

/* ── The time patterns (F2 · F3): "22:00", "9pm", "9 pm", "9 p.m.", "9 o'clock", "21h", "21h00", "21.00", and the Chinese
   "10点" / "22时". Each is read on the lower-cased reading, and each is anchored with a character class, never a lookbehind. */
const TIME_PATTERNS: readonly RegExp[] = [
  /(^|[^0-9])[0-9]{1,2}:[0-9]{2}([^0-9]|$)/,
  /(^|[^0-9a-z])[0-9]{1,2} ?(am|pm)([^a-z]|$)/,
  /(^|[^0-9a-z])[0-9]{1,2} ?(a[.]m[.]|p[.]m[.])/,
  /(^|[^0-9])[0-9]{1,2} o'clock/,
  /(^|[^0-9a-z])[0-9]{1,2}h([0-9]{2})?([^0-9a-z]|$)/,
  /(^|[^0-9.])[0-9]{1,2}[.][0-9]{2}([^0-9]|$)/,
  /[0-9]{1,2} ?[点时]/,
  // …and every time written in words (U13 review #1), as non-global copies (a /g RegExp's `test` keeps state).
  ...WORD_TIMES.map((re) => new RegExp(re.source)),
];

/* ── A frequency promise (F2): "at most … a week", "no more than … messages", "once a month", "4 messages a month". */
const FREQUENCY_PATTERNS: readonly RegExp[] = [
  /(^|[^a-z])at most [^.;:]{0,40}(a|per|each|every) (day|week|month|year)([^a-z]|$)/,
  /(^|[^a-z])no more than [^.;:]{0,40}(messages?|sms|texts?|offers?|times?)([^a-z]|$)/,
  /(^|[^a-z])(once|twice|thrice|[0-9]+ times?) (a|per|each|every) (day|week|month|year)([^a-z]|$)/,
  /(^|[^a-z])[0-9]+ (messages?|sms|texts?|offers?) (a|per|each|every) (day|week|month|year)([^a-z]|$)/,
];
/* …and in Swahili and Chinese (F3 — a promise made only there is still published): "mara 2 kwa wiki", "ujumbe 3 kila
   mwezi", "si zaidi ya … kwa wiki"; "每周最多两条", "最多每月", "每月 4 条". */
const SW_FREQUENCY_PATTERNS: readonly RegExp[] = [
  /(^|[^a-z])mara ([0-9]+|moja|mbili|tatu|nne|tano|sita|saba|nane|tisa|kumi) (kwa|kila) (siku|wiki|mwezi|mwaka)([^a-z]|$)/,
  /(^|[^a-z])(ujumbe|matangazo|ofa|sms) ([0-9]+|mmoja|miwili|mitatu|minne|mitano) (kwa|kila) (siku|wiki|mwezi|mwaka)([^a-z]|$)/,
  /(^|[^a-z])si zaidi ya [^.;:]{0,40}(kwa|kila) (siku|wiki|mwezi|mwaka)([^a-z]|$)/,
];
const ZH_FREQUENCY_PATTERNS: readonly RegExp[] = [
  /每(天|日|周|星期|月|年)(最多|至多|不超过|不多于|只|仅)/,
  /(最多|至多|不超过|不多于)每(天|日|周|星期|月|年)/,
  /每(天|日|周|星期|月|年) ?[0-9一二两三四五六七八九十]+ ?(条|次|则)/,
];

const NONE: readonly never[] = [];

const PROMISES: Record<PromiseKey, KeptPromise> = {
  selfExcluded: {
    kept: true,
    phrases: ["self-excluded", "self excluded", "self-exclusion", "self exclusion"],
    patterns: NONE, anyLanguage: NONE, sw: NONE, zh: NONE, swPatterns: NONE, zhPatterns: NONE,
    promise: "no marketing to a self-excluded player",
    control: "marketing/rg.ts refuses rg_self_excluded",
    refuses: "marketing to a self-excluded player",
  },
  onBreak: {
    kept: true,
    phrases: ["on a break", "taking a break", "cooling-off", "cooling off"],
    patterns: NONE, anyLanguage: NONE, sw: NONE, zh: NONE, swPatterns: NONE, zhPatterns: NONE,
    promise: "no marketing to a player on a break until they opt in again",
    control: "marketing/rg.ts refuses rg_cooling_off",
    refuses: "marketing to a player on a break until they opt in again after it ends",
  },
  harmSign: {
    kept: true,
    phrases: ["sign of harm", "signs of harm"],
    patterns: NONE, anyLanguage: NONE, sw: NONE, zh: NONE, swPatterns: NONE, zhPatterns: NONE,
    promise: "no marketing to a player showing a sign of harm",
    control: "marketing/rg.ts refuses rg_harm_marker",
    refuses: "marketing to a player showing a sign of harm",
  },
  under18: {
    kept: true,
    phrases: ["under 18", "under the age of 18", "younger than 18"],
    patterns: NONE, anyLanguage: NONE, sw: NONE, zh: NONE, swPatterns: NONE, zhPatterns: NONE,
    promise: "no marketing to anyone under 18",
    control: "marketing/consent.ts refuses age_minor",
    refuses: "marketing to anyone under 18",
  },
  // ⭐ F13 · TWO PROMISES, TWO CONTROLS. Today's line says "anyone … whose age we cannot confirm" — the gate refusing a
  // player whose date of birth or identity record cannot be read (age_unknown in the player branch).
  ageUnconfirmed: {
    kept: true,
    phrases: ["age we cannot confirm", "age cannot be confirmed", "age is not confirmed", "age is unknown", "no readable date of birth"],
    patterns: NONE, anyLanguage: NONE, sw: NONE, zh: NONE, swPatterns: NONE, zhPatterns: NONE,
    promise: "no marketing to anyone whose age cannot be confirmed",
    control: "marketing/consent.ts refuses age_unknown when a player's age cannot be read",
    refuses: "marketing to anyone whose age cannot be confirmed",
  },
  // …and Appendix B.2 says "for anyone who is not a 50pick player, we send only after a member of our staff has confirmed in
  // writing" — the gate's contact branch refusing age_unknown for a number no account holds unless its 18+ is on record.
  staffConfirmedAge: {
    kept: true,
    phrases: ["confirmed in writing", "not a 50pick player", "staff has confirmed", "staff have confirmed"],
    patterns: NONE, anyLanguage: NONE, sw: NONE, zh: NONE, swPatterns: NONE, zhPatterns: NONE,
    promise: "marketing to a non-player only after staff confirm their age in writing",
    control: "marketing/consent.ts refuses age_unknown for a number no account holds unless its 18+ is on record",
    refuses: "marketing to a non-player whose age no staff member has confirmed",
  },
  under25: {
    kept: true,
    phrases: ["under 25", "younger than 25"],
    patterns: NONE, anyLanguage: NONE, sw: NONE, zh: NONE, swPatterns: NONE, zhPatterns: NONE,
    promise: "no marketing to a player under 25 with a self-exclusion or a break on record",
    control: "marketing/consent.ts refuses rg_under25_history",
    refuses: "marketing to a player under 25 with a self-exclusion or a break on record",
  },
  // ⭐ KEPT SINCE U13 (2026-10-07): no marketing SMS outside the send window — 08:00–20:00 EAT unless the owner sets other
  // hours (bounded 07:00–21:00) — enforced where messages leave: `dispatchSlice` reads `src/lib/marketing/window.ts` once per
  // slice, before any gate, and holds every row outside it; the test send obeys it too. `test:rg-policy` K1 holds this flag
  // to exactly that read. ⛔ No RG line was re-worded with it (RG Policy v2026-09-26 cut the old bullet): whether the
  // public page states the window is the owner's word (Q3), saved on the policy lines card.
  // ⭐ ONLY WHAT THE WINDOW KEEPS IS ACCEPTED AS THIS PROMISE (U13's ruling on the review's gap): its words are NIGHT words,
  // and night falls after the window closes (it closes by 21:00 at the latest). EVENING words are a promise of their own,
  // refused below — messages are sent until the window closes. And a clock time the line names is held to the hours SAVED
  // now: `./policy-lines` accepts a time only when it is the window's opening or closing time (`timesNamedIn` below).
  lateNight: {
    kept: true,
    phrases: [
      "late-night", "late night", "late at night", "overnight", "night-time", "nighttime", "night", "nights", "midnight",
      "quiet hours", "bedtime",
    ],
    patterns: NONE,
    anyLanguage: TIME_PATTERNS,
    sw: ["usiku", "saa za usiku", "usiku wa manane", "alfajiri"],
    zh: ["深夜", "夜间", "凌晨", "夜晚", "午夜", "半夜", "睡前", "夜里"],
    swPatterns: NONE, zhPatterns: NONE,
    promise: "no marketing SMS outside the send window, 08:00–20:00 EAT by default",
    control: "src/lib/marketing/window.ts, read by dispatchSlice (src/lib/server/marketing/dispatch.ts) before any gate; and the invite campaign's SMS (invite-service.ts, which never asks the window) kept dormant by feature-state's bonus WITHDRAWN — with FEATURE_BONUS unset on Railway, which would override it — until U15 retires it",
    refuses: "marketing SMS outside the send window, 08:00–20:00 EAT by default",
  },
  // ⛔ NOT KEPT, BY DESIGN (U13's ruling): the evening is inside the send window — marketing SMS are sent until it closes,
  // 20:00 EAT unless the owner sets other hours — so a line promising no marketing in the evening is refused, with why.
  // "After dark" is the evening here: the sun sets near 18:30 in Dar es Salaam all year. No code can keep it, so
  // `test:rg-policy` K1 holds it unkept.
  evening: {
    kept: false,
    phrases: ["evening", "evenings", "after dark"],
    patterns: NONE, anyLanguage: NONE,
    sw: ["jioni"],
    zh: ["傍晚", "晚上"],
    swPatterns: NONE, zhPatterns: NONE,
    promise: "no marketing in the evening",
    why: "marketing SMS are sent until the send window closes — 20:00 EAT unless the owner sets other hours",
    control: "none — the send window closes at 20:00 EAT by default, so evening messages are sent",
    refuses: "marketing in the evening",
  },
  // ⛔ UNKEPT (F2): there is no per-person frequency cap yet (plan D14). U14 builds it.
  frequencyCap: {
    kept: false,
    phrases: ["frequency cap", "message limit"],
    patterns: FREQUENCY_PATTERNS,
    anyLanguage: NONE,
    sw: ["kikomo cha ujumbe", "kikomo cha matangazo", "kikomo cha ofa"],
    zh: ["频率上限", "次数上限", "条数上限", "发送上限"],
    swPatterns: SW_FREQUENCY_PATTERNS,
    zhPatterns: ZH_FREQUENCY_PATTERNS,
    promise: "a limit on how many marketing messages a person receives",
    control: "a per-person frequency cap, which U14 builds — src/lib/server/marketing/frequency-cap.ts or the gate's frequency_cap refusal",
    refuses: "more marketing messages than the frequency cap allows",
  },
};

/** ⭐ THE ONE MAP — the save's validator reads it, and `test:rg-policy` K1 holds every `kept` to the code. */
export const KEPT_PROMISES: Readonly<Record<PromiseKey, KeptPromise>> = Object.freeze(PROMISES);

const NBSP = String.fromCharCode(0xa0);
const DASHES: readonly string[] = [0x2010, 0x2011, 0x2012, 0x2013, 0x2014].map((c) => String.fromCharCode(c));
const CURLY_APOSTROPHES: readonly string[] = [0x2018, 0x2019].map((c) => String.fromCharCode(c));
const WORD_CHAR = /[a-z0-9]/;

/** A line as the promises are read: lower case; a no-break space a space; a dash variant a hyphen; a curly apostrophe the
 *  plain one. */
export function promiseReading(text: unknown): string {
  // NFKC first: a full-width "２０：００" is the time "20:00" (U13 review #1).
  let t = (typeof text === "string" ? text : "").normalize("NFKC").toLowerCase().split(NBSP).join(" ");
  for (const d of DASHES) t = t.split(d).join("-");
  for (const q of CURLY_APOSTROPHES) t = t.split(q).join("'");
  return t;
}

const isWordChar = (ch: string | undefined): boolean => ch !== undefined && WORD_CHAR.test(ch);

/** Does the reading hold the phrase WHOLE — no letter or digit right before it or right after it? */
export function holdsPhrase(reading: string, phrase: string): boolean {
  if (phrase === "") return false;
  let from = 0;
  for (;;) {
    const at = reading.indexOf(phrase, from);
    if (at < 0) return false;
    if (!isWordChar(reading[at - 1]) && !isWordChar(reading[at + phrase.length])) return true;
    from = at + 1;
  }
}

/**
 * ⭐ EVERY PROMISE A LINE MAKES IN ONE LANGUAGE, in `PROMISE_KEYS` order — the save's validator reads it, and so do
 * `test:rg-policy` K2 and `test:policy-lines` L3. `promises` defaults to the one map; a test passes a planted copy.
 */
export function promisesIn(
  text: unknown,
  locale: PromiseLocale = "en",
  promises: Readonly<Record<PromiseKey, KeptPromise>> = KEPT_PROMISES,
): PromiseKey[] {
  const reading = promiseReading(text);
  return PROMISE_KEYS.filter((k) => {
    const p = promises[k];
    if (p.anyLanguage.some((re) => re.test(reading))) return true;
    if (locale === "en") return p.phrases.some((phrase) => holdsPhrase(reading, phrase)) || p.patterns.some((re) => re.test(reading));
    if (locale === "sw") return p.sw.some((word) => holdsPhrase(reading, word)) || p.swPatterns.some((re) => re.test(reading));
    return p.zh.some((word) => reading.includes(word)) || p.zhPatterns.some((re) => re.test(reading));
  });
}

/* ══ U13 · THE TIMES A LINE NAMES — so the save can hold each one to the send window's own hours ══════════════════════
 * Every spelling the clock patterns above spot, read with its value: "22:00", "8:00 pm", "9pm", "9 p.m.", "9 o'clock",
 * "21h", "21h00", "21.00", and the Chinese "10点" / "22时". Read on the same lower-cased reading, each anchored with a
 * character class or a lookahead — never a lookbehind — so two times side by side ("08:00-20:00") are both read. */

/** One time a line names: the words that name it, and the minutes after midnight it can mean — two for an hour that names
 *  no half of the day ("8 o'clock", "8点"), none for a time no clock shows ("25:00"). */
export type NamedTime = { readonly said: string; readonly minutes: readonly number[] };

/** An optional am/pm after a time, never the start of a longer word. */
const MERIDIEM = "(?: ?(am|pm|a[.]m[.]|p[.]m[.])(?![a-z]))?";
const COLON_TIME = new RegExp(`(^|[^0-9])([0-9]{1,2}):([0-9]{2})${MERIDIEM}(?=[^0-9]|$)`, "g");
const DOTTED_TIME = new RegExp(`(^|[^0-9.])([0-9]{1,2})[.]([0-9]{2})${MERIDIEM}(?=[^0-9]|$)`, "g");
const HOUR_MERIDIEM = /(^|[^0-9a-z:.])([0-9]{1,2}) ?(am|pm|a[.]m[.]|p[.]m[.])(?![a-z])/g;
const OCLOCK = /(^|[^0-9])([0-9]{1,2}) o'clock/g;
const H_TIME = /(^|[^0-9a-z])([0-9]{1,2})h([0-9]{2})?(?=[^0-9a-z]|$)/g;
const ZH_HOUR = /([0-9]{1,2}) ?([点时])/g;

/** A 24-hour time ("21:00", "21h", "21.00"): one value, or none past 24:00 or a minute past 59. */
const dayClock = (h: number, m: number): number[] =>
  (h >= 0 && h < 24 && m >= 0 && m <= 59 ? [h * 60 + m] : h === 24 && m === 0 ? [0] : []);
/** A time with its half of the day ("9 pm", "8:30 a.m."): one value, or none for an hour no twelve-hour clock shows. */
const halfDayClock = (h: number, m: number, meridiem: string): number[] =>
  (h >= 1 && h <= 12 && m >= 0 && m <= 59 ? [((h % 12) + (meridiem.startsWith("p") ? 12 : 0)) * 60 + m] : []);
/** An hour that names no half of the day ("8 o'clock", "8点"): both readings while it could be either. */
const eitherHalf = (h: number): number[] =>
  (h >= 0 && h <= 12 ? [(h % 12) * 60, ((h % 12) + 12) * 60] : h <= 24 ? [(h % 24) * 60] : []);

/** ⭐ EVERY TIME A LINE NAMES, in the order of the patterns that read them — what the policy-line save holds to the send
 *  window's hours (`./policy-lines`). */
export function timesNamedIn(text: unknown): NamedTime[] {
  const reading = promiseReading(text);
  const out: NamedTime[] = [];
  const take = (re: RegExp, lead: boolean, value: (g: readonly string[]) => number[]): void => {
    for (const match of reading.matchAll(re)) {
      const g = [...match].map((x) => x ?? "");
      out.push({ said: (lead ? g[0].slice(g[1].length) : g[0]).trim(), minutes: value(g) });
    }
  };
  take(COLON_TIME, true, (g) => (g[4] !== "" ? halfDayClock(Number(g[2]), Number(g[3]), g[4]) : dayClock(Number(g[2]), Number(g[3]))));
  take(DOTTED_TIME, true, (g) => (g[4] !== "" ? halfDayClock(Number(g[2]), Number(g[3]), g[4]) : dayClock(Number(g[2]), Number(g[3]))));
  take(HOUR_MERIDIEM, true, (g) => halfDayClock(Number(g[2]), 0, g[3]));
  take(OCLOCK, true, (g) => eitherHalf(Number(g[2])));
  take(H_TIME, true, (g) => dayClock(Number(g[2]), g[3] !== "" ? Number(g[3]) : 0));
  take(ZH_HOUR, false, (g) => eitherHalf(Number(g[1])));
  // ⛔ A time written in words is NAMED WITH NO VALUE — so the save refuses it, beside any digit time the line also names.
  for (const re of WORD_TIMES) {
    for (const match of reading.matchAll(re)) out.push({ said: match[0].trim(), minutes: [] });
  }
  return out;
}

/** Does the line name a clock time at all — in any language, by the late-night promise's own clock patterns? The save
 *  refuses a time it spots but cannot read (`timesNamedIn` finds none), rather than let it through unchecked. */
export function namesATime(text: unknown): boolean {
  const reading = promiseReading(text);
  return TIME_PATTERNS.some((re) => re.test(reading));
}
