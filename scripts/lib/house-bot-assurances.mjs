/**
 * The D19d ASSURANCE LEXICON — the false things the chatbot may never say, in all three locales.
 *
 * ⛔ OWNER RULING D19d (`docs/COMPLIANCE-DECISIONS.md`, the `| D19d |` row): "The chatbot **discloses
 * nothing and may never lie**: a guard keeps "never bets against you", "independent", "cannot influence",
 * "all stakes are from real players", "fully automated", "only automated", "no person decides", "no one at
 * 50pick chooses" and any naming or confirming of an account out of the system prompt and `faq8a`, in all
 * three locales."
 *
 * ── WHY A SIBLING OF `house-bot-vocabulary.mjs` AND NOT A FOURTH FAMILY INSIDE IT ───────────────────────
 * Ruling 175's module is the single home for house NOUNS, identifiers and bounded ids, and
 * `test:house-bot-reports` 0.175 refuses a consumer that declares its own pattern. An assurance is a
 * different KIND of thing: three-locale, sentence-shaped, subject-scoped, and it names no house word at all
 * — "never bets against you" is dangerous precisely because it contains nothing a lexicon guard looks for.
 * Adding these to the frozen HOUSE_FAMILIES would break 0.175's own shape assertions. So this module sits
 * BESIDE it and IMPORTS the one family it genuinely needs — bounded ids — rather than respelling it.
 *
 * ⛔ THE ONE AUTHORITY IS THE RULING, NOT THIS FILE. `D19D_PHRASES` below is held to set equality against
 * the phrases quoted in the D19d row itself (case 6.1), in both directions, so amending D19d turns the
 * suite red rather than leaving it silently under-covering.
 *
 * ── WHAT IS FLAT AND WHAT IS SUBJECT-SCOPED, AND WHY THE SPLIT IS MEASURED ──────────────────────────────
 * Seven of the eight phrases occur ZERO times in the whole chatbot artefact today (measured 2026-09-20:
 * the 7,903-char system-prompt slice, the 51 string literals of `_actions/chat.ts`, the 123 literals of
 * `lib/chat/send-message.ts`, and `faq8a` in all three locales). They are therefore matched FLAT, which is
 * the strictest form and costs nothing.
 *
 * The eighth, "independent", occurs TWICE today, and both occurrences must never move:
 *   `chat.ts` · "The national problem-gambling helpline is ${HELPLINE()}. It is free, it is independent of
 *               50pick, and it is the number to give anyone who asks for help with gambling."
 *   `chat.ts` · RULE 2 · "... must be pointed to the independent national service."
 * A flat /independent/i goes red on day one on those two lines, and the cheapest way to green it is to
 * delete RULE 2 — the at-risk path `test:chat-safety` exists to protect. So "independent" alone is bound to
 * a PLATFORM SUBJECT in predicate position ("50pick is independent", "we are independent", "the platform is
 * fully independent"). ⛔ A BACKWARD CHARACTER WINDOW WOULD NOT HAVE WORKED and the measurement says so:
 * "That desk belongs to 50pick." sits ~160 characters before the helpline's "independent", so any window
 * wide enough to catch a real subject also catches that sentence. The scoping is grammatical, not spatial.
 *
 * ⛔ SUBJECT-SCOPING IS AN EXEMPTION, so it is applied ONLY where a measured, must-not-move line forces it.
 * The other seven stay flat.
 */
import { HOUSE_ID_SOURCE } from "./house-bot-vocabulary.mjs";

/** The row key D19d is located by — never a line number; `COMPLIANCE-DECISIONS.md` is edited constantly. */
export const D19D_ROW_KEY = "D19d";

/** The D19d row of a COMPLIANCE-DECISIONS.md text, found by its cell key. Returns "" when absent, so a
 *  caller's population floor fails loudly instead of a zero-length slice passing an empty loop. */
export function d19dRow(markdown) {
  return markdown.split("\n").find((l) => new RegExp(`^\\|\\s*${D19D_ROW_KEY}\\s*\\|`).test(l)) ?? "";
}

/** Every double-quoted phrase inside a D19d row — the set `D19D_PHRASES` is held equal to. */
export function d19dQuotedPhrases(row) {
  return [...row.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/**
 * The eight phrases, spelled exactly as the ruling quotes them. ⛔ Case 6.1 asserts set equality with
 * `d19dQuotedPhrases(d19dRow(...))` in BOTH directions: a phrase dropped here, or a ninth invented here,
 * is reported.
 */
export const D19D_PHRASES = Object.freeze([
  "never bets against you",
  "independent",
  "cannot influence",
  "all stakes are from real players",
  "fully automated",
  "only automated",
  "no person decides",
  "no one at 50pick chooses",
]);

/** The platform, as a grammatical subject — the only thing "independent" is scoped to. */
const PLATFORM_SUBJECT = String.raw`(?:50pick|we|the platform|this platform|our platform|the operator|the house)`;
const COPULA = String.raw`(?:is|are|'re|remains?|stays?)`;
const DEGREE = String.raw`(?:(?:fully|completely|entirely|wholly|totally)\s+)?`;

/**
 * The lexicon: one entry per phrase per locale. `scoped` records WHY an entry is not flat, so a reader can
 * see at a glance which claims are narrowed and on what measurement. The three locale keys are the product's
 * own `Lang` union (`en` | `sw` | `zh`) — the suite derives the locales it runs from `Object.keys(dict)`,
 * so a FOURTH locale makes the suite demand entries here rather than passing over copy nobody checked.
 *
 * ⛔ AN ENGLISH LIST RUN "IN ALL THREE LOCALES" CAN NEVER FIRE. That is the vacuous-pattern failure
 * `chat-safety.test.mts` was written to prevent, and it is why every phrase carries a sw and a zh rendering
 * here rather than a comment saying the locales are covered.
 */
export const D19D_PATTERNS = Object.freeze([
  // 1 · never bets against you
  { phrase: "never bets against you", locale: "en", re: /\bnever\s+bets?\s+against\s+(?:you|players?|users?)\b/i },
  { phrase: "never bets against you", locale: "sw", re: /dau\s+dhidi\s+ya(?:ko|nu|o)\b/i },
  { phrase: "never bets against you", locale: "zh", re: /[与和跟](?:您|你|玩家)(?:对赌|对赌|对下注)/ },
  // 2 · independent — SUBJECT-SCOPED (see the header; two real lines must not move)
  { phrase: "independent", locale: "en", scoped: "predicate of a platform subject", re: new RegExp(String.raw`\b${PLATFORM_SUBJECT}\s+${COPULA}\s+${DEGREE}independent\b`, "i") },
  { phrase: "independent", locale: "sw", scoped: "predicate of a platform subject", re: /(?:50pick|jukwaa(?:\s+\w+)?|mfumo|tovuti)\s+(?:ni|iko|liko|uko)\s+(?:huru|huru\s+kabisa)\b/i },
  { phrase: "independent", locale: "zh", scoped: "predicate of a platform subject", re: /(?:50pick|本?平台|我们)[^。！？]{0,10}独立/ },
  // 3 · cannot influence
  { phrase: "cannot influence", locale: "en", re: /\b(?:can\s?not|cannot|can't|could\s?not|couldn't|do(?:es)?\s+not|don't|doesn't)\s+(?:\w+\s+){0,2}influence\b/i },
  { phrase: "cannot influence", locale: "sw", re: /\b(?:hauwezi|haiwezi|hatuwezi|hawawezi|haliwezi)\s+(?:ku)?shawishi\b/i },
  { phrase: "cannot influence", locale: "zh", re: /(?:无法|不能|不会|没法|不可能)(?:影响|左右|干预)/ },
  // 4 · all stakes are from real players
  { phrase: "all stakes are from real players", locale: "en", re: /\ball\s+(?:the\s+)?(?:stakes|bets|money)\s+(?:are\s+|come\s+)?from\s+(?:real|genuine|other)\s+(?:players|people|users|punters)\b/i },
  { phrase: "all stakes are from real players", locale: "sw", re: /madau\s+yote[^.!?]{0,60}(?:halisi|wengine)\b/i },
  { phrase: "all stakes are from real players", locale: "zh", re: /(?:所有|全部|每一笔)[^。！？]{0,10}(?:来自|出自)(?:真实|真正|其他)(?:玩家|用户|用戶)/ },
  // 5 · fully automated
  { phrase: "fully automated", locale: "en", re: /\b(?:fully|completely|entirely|wholly)\s+automated\b/i },
  { phrase: "fully automated", locale: "sw", re: /(?:ki)?otomatiki\s+kabisa\b/i },
  { phrase: "fully automated", locale: "zh", re: /(?:完全|全部|全程|纯)\s?(?:自动|自動)/ },
  // 6 · only automated
  { phrase: "only automated", locale: "en", re: /\bonly\s+automated\b|\bautomated\s+only\b|\bautomated\s+systems?\s+only\b/i },
  { phrase: "only automated", locale: "sw", re: /(?:ki)?otomatiki\s+(?:pekee|tu)\b/i },
  { phrase: "only automated", locale: "zh", re: /(?:仅|只)\s?(?:由|有|是)?\s?(?:自动|自動)/ },
  // 7 · no person decides
  { phrase: "no person decides", locale: "en", re: /\bno\s+(?:person|human|one|body|staff\s+member|employee)\s+(?:\w+\s+){0,2}decides?\b/i },
  { phrase: "no person decides", locale: "sw", re: /hakuna\s+(?:mtu|mfanyakazi|binadamu)[^.!?]{0,30}(?:anayeamua|huamua|anaamua)/i },
  { phrase: "no person decides", locale: "zh", re: /(?:无人|没有人|无任何人|不由人)(?:决定|決定)/ },
  // 8 · no one at 50pick chooses
  { phrase: "no one at 50pick chooses", locale: "en", re: /\bno\s+(?:one|person|human|staff|body|employee)\s+(?:at|in|from|inside)\s+50pick\s+(?:\w+\s+){0,3}(?:chooses?|picks?|decides?|selects?)\b/i },
  { phrase: "no one at 50pick chooses", locale: "sw", re: /hakuna\s+mtu[^.!?]{0,30}50pick[^.!?]{0,30}(?:anayechagua|huchagua|anachagua)/i },
  { phrase: "no one at 50pick chooses", locale: "zh", re: /(?:无人|没有人|50pick\s?(?:的)?(?:任何人|员工))[^。！？]{0,12}(?:选择|選擇|挑选)/ },
]);

/**
 * D19d's NINTH, open-ended item: "any naming or confirming of an account".
 *
 * ⛔ Its pattern-able half only, and the boundary is stated rather than implied. What a static scan can
 * hold is a pre-written sentence that names an account by identifier, or that settles an account's NATURE.
 * What it cannot hold is the model improvising one at answer time — that residual is recorded, named, in
 * `plans/house-bots/DEFERRED-TESTS.md`, never rounded to "covered".
 *
 * A1 takes the bounded-id family from the shared vocabulary module (ruling 175: one home for ids), so a
 * change to `HOUSE_ID_PREFIX` reaches this guard without a second edit.
 */
export const D19D_ACCOUNT_PATTERNS = Object.freeze([
  { label: "A1 · a bounded house id (the shared vocabulary's id family)", re: new RegExp(HOUSE_ID_SOURCE, "i") },
  {
    label: "A2 · confirming or denying an account's nature",
    re: /\b(?:this|that|the|your|an?|one)\s+account\s+(?:is|is\s+not|isn't|was|belongs\s+to|is\s+operated\s+by|is\s+run\s+by|is\s+owned\s+by|is\s+controlled\s+by)\s+(?:not\s+)?(?:an?\s+)?(?:real|genuine|ordinary|house|platform|50pick|automated|automatic|bot|robot|staff|company|internal)\b/i,
  },
  {
    label: "A3 · naming an account by identifier",
    re: /\baccount\s+(?:#|number\s+|id\s+|named\s+|called\s+)?(?:hb[iethp]?_[0-9a-f]{6,}|[0-9]{6,}|[a-z0-9]{20,})\b/i,
  },
]);

/** Every assurance hit in `text`, restricted to `locales` when given. One measure, used by the claim and by
 *  every control alike — a control that ran a different matcher would prove something about the control. */
export function assuranceHits(text, locales) {
  const out = [];
  for (const p of D19D_PATTERNS) {
    if (locales && !locales.includes(p.locale)) continue;
    const m = new RegExp(p.re.source, p.re.flags.includes("g") ? p.re.flags : p.re.flags + "g");
    for (const h of text.matchAll(m)) out.push({ label: `${p.locale}/${p.phrase}`, match: h[0], index: h.index });
  }
  for (const a of D19D_ACCOUNT_PATTERNS) {
    const m = new RegExp(a.re.source, a.re.flags.includes("g") ? a.re.flags : a.re.flags + "g");
    for (const h of text.matchAll(m)) out.push({ label: a.label, match: h[0], index: h.index });
  }
  return out;
}

/**
 * ⭐ ONE PLANT PER PATTERN, AND EACH PLANTS A SHAPE THE REAL COPY COULD CONTAIN. These are not straw men:
 * every one is a sentence a well-meaning writer would produce if asked to reassure a player that the market
 * is honest — which is exactly how a false assurance gets written.
 */
export const D19D_PLANTS = Object.freeze({
  "en/never bets against you": "50pick never bets against you — the money on the other side is other players'.",
  "sw/never bets against you": "50pick haiweki dau dhidi yako kamwe.",
  "zh/never bets against you": "50pick 从不与您对赌。",
  "en/independent": "50pick is independent of every market outcome.",
  "sw/independent": "50pick ni huru kabisa na matokeo ya soko.",
  "zh/independent": "本平台完全独立于市场结果。",
  "en/cannot influence": "We cannot influence which side wins.",
  "sw/cannot influence": "Hatuwezi kushawishi matokeo ya soko.",
  "zh/cannot influence": "我们无法影响哪一方获胜。",
  "en/all stakes are from real players": "All stakes are from real players on the other side of the pool.",
  "sw/all stakes are from real players": "Madau yote yanatoka kwa wachezaji halisi.",
  "zh/all stakes are from real players": "所有投注均来自真实玩家。",
  "en/fully automated": "Market listing is fully automated end to end.",
  "sw/fully automated": "Mfumo ni otomatiki kabisa.",
  "zh/fully automated": "整个流程完全自动运行。",
  "en/only automated": "Only automated processes ever touch the pool.",
  "sw/only automated": "Mfumo ni otomatiki pekee.",
  "zh/only automated": "仅由自动程序处理奖池。",
  "en/no person decides": "No person decides which side gets filled.",
  "sw/no person decides": "Hakuna mtu anayeamua upande gani unajazwa.",
  "zh/no person decides": "无人决定由哪一方成交。",
  "en/no one at 50pick chooses": "No one at 50pick chooses a side for you.",
  "sw/no one at 50pick chooses": "Hakuna mtu wa 50pick anayechagua upande kwa ajili yako.",
  "zh/no one at 50pick chooses": "50pick 的员工不会选择任何一方。",
  "A1 · a bounded house id (the shared vocabulary's id family)": "Your last stake was matched by hb_0123456789abcdef01234567.",
  "A2 · confirming or denying an account's nature": "That account is operated by 50pick, not a real player.",
  "A3 · naming an account by identifier": "Yes — account hb_0123456789abcdef01234567 is one of ours.",
});

/**
 * ⛔ THE ACCEPT SIDE. Real, load-bearing lines that must stay ALLOWED — and, for the first two, must stay
 * PRESENT. A guard that has never been shown what it must NOT refuse is a guard whose scope is unmeasured,
 * and this lane has twice shipped one: a protection sweep that refused its own cleanup, and thirteen
 * "this is refused" assertions that passed harder while the feature was broken.
 */
export const D19D_ALLOWED = Object.freeze([
  { why: "the statutory helpline is independent OF us — the opposite claim, and D19d's own subject word", text: "The national problem-gambling helpline is 0800 11 0011. It is free, it is independent of 50pick, and it is the number to give anyone who asks for help with gambling." },
  { why: "RULE 2 — the at-risk path test:chat-safety exists to protect; deleting it is the cheapest way to green a flat /independent/i", text: "Never give our own support desk number in answer to this — it is the operator's line, and a person asking for help getting away from gambling must be pointed to the independent national service." },
  { why: "a real negation about officers that a careless /no (one|person|officer)/ would sweep in", text: "No officer reviews a withdrawal before it is sent, whatever its size." },
  { why: "the platform says a PERSON decides resolution — the opposite of 'no person decides'", text: "Resolution: an officer seals the outcome against a public source URL." },
  { why: "the stub's proposals answer, which also says a person decides", text: "3. Other players upvote it, but an officer makes the final listing call" },
  { why: "RULE 1's refusal to recommend a side — a sentence about choosing that is not a false assurance", text: "I can explain how a market resolves but I can't tell you which side to pick. That's a call only you should make." },
  { why: "the real faq8a — the fairness answer D19d names, which must keep saying what it says", text: "Every market move is recorded into a HMAC-chained audit trail. Resolutions cite a public source URL." },
  { why: "the prompt's account sentences, which a loose account pattern would sweep", text: "One document may only ever be used on one account. Payouts go only to the mobile number registered on the account." },
]);

/**
 * The chatbot's SHIPPED TEXT, taken out of already-comment-stripped JS.
 *
 * ⛔ THIS STEP IS LOAD-BEARING AND THE MEASUREMENT SAYS SO. esbuild's transform drops most comments but
 * KEEPS block comments inside a function body: measured 2026-09-20, the stripped `send-message.ts` still
 * contains "Tier 2", "WITHDRAWAL_AML_HOLD" and the sentence "A COMMENT THAT DESCRIBES A FIX IS NOT THE
 * FIX". A presence scan over the stripped FILE would therefore be scanning documentation about the code —
 * the exact defect this lane has just repaired three times. Only the literals a player can actually be
 * shown are scanned.
 */
export function chatbotLiterals(js) {
  const out = [];
  for (const m of js.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) { try { out.push(JSON.parse(`"${m[1]}"`)); } catch { /* not a string literal */ } }
  for (const m of js.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) { try { out.push(JSON.parse(`"${m[1].replace(/(^|[^\\])"/g, '$1\\"')}"`)); } catch { /* not a string literal */ } }
  for (const m of js.matchAll(/`((?:[^`\\]|\\.)*)`/gs)) out.push(m[1]);
  return out.filter((s) => s.length > 0);
}

/**
 * The system-prompt template body, sliced out of `_actions/chat.ts` SOURCE — the file is never imported
 * (it is a "use server" module) and never edited: D19a's subject is that it keeps origin/main's words.
 *
 * 🔴 THE END ANCHOR IS NOT "`;\n}" AND THE FIRST DRAFT OF THIS FUNCTION PROVED WHY. `chat.ts` is stored
 * with CRLF line endings, so an LF anchor returned -1 — and `String.slice(start, -1)` does not throw or
 * return nothing: it silently returns THE REST OF THE FILE minus one character. The slice measured 12,243
 * characters, carried all five prompt headings, and yielded an interpolation set that happened to be
 * correct, so every check over it would have passed while the population was the whole module. ⛔ The end
 * is found as the template's own closing backtick, and the caller's floor asserts the slice does NOT
 * contain the code that follows it.
 */
export function systemPromptSlice(chatSource) {
  const iFn = chatSource.indexOf("function buildSystemPrompt");
  if (iFn < 0) return "";
  const iTick = chatSource.indexOf("return `", iFn);
  if (iTick < 0) return "";
  const start = iTick + "return `".length;
  const iEnd = chatSource.indexOf("`;", start);
  if (iEnd < 0) return "";
  return chatSource.slice(start, iEnd).replace(/\r\n/g, "\n");
}

/** Every `${...}` interpolation in the prompt slice — the CLOSED set case 6.4 pins. A new hole is a new
 *  channel for text to enter the system prompt, which is the only way a house fact could reach the model. */
export function promptInterpolations(slice) {
  return [...new Set([...slice.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1].trim()))].sort();
}

/**
 * The interpolation set as it stands, RE-DERIVED 2026-09-20 from the file itself.
 * ⚠️ The commit-6 build plan recorded this set as `{objectionHours, HELPLINE(), SUPPORT_PHONE(),
 * SUPPORT_EMAIL(), WITHDRAW_MAX_TZS}` — wrong twice: it omits `langLine` entirely (the three LANGUAGE
 * lines) and the cap enters through `formatTzs(WITHDRAW_MAX_TZS)`, not bare. A pin typed from that list
 * would have gone red on a file nobody had touched.
 */
export const PROMPT_INTERPOLATIONS = Object.freeze([
  "HELPLINE()",
  "SUPPORT_EMAIL()",
  "SUPPORT_PHONE()",
  "formatTzs(WITHDRAW_MAX_TZS)",
  "langLine",
  "objectionHours",
]);
