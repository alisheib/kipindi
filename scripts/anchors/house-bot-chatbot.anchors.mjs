/**
 * THE DEFECTS `red:house-bot-chatbot` PLANTS — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array. `test:red-anchors` §3 audits that every `from` below still resolves
 * EXACTLY ONCE against real source, without executing the harness. An inline anchor is one nobody can
 * audit, and this fleet has paid for that four times: a harness whose anchor rotted prints
 * "anchor missing — cannot inject" in the middle of a run that still reads as green.
 *
 * ── ⭐ WHAT IS DIFFERENT ABOUT THIS ONE, AND WHY IT MATTERS MORE HERE THAN ANYWHERE ────────────────────
 * Every other harness in the fleet writes these mutations INTO THE WORKING TREE and undoes them in a
 * `finally`. `house-bot-chatbot-red.mts` does not: it copies the files §6 reads into a scratch directory,
 * mutates THERE, and runs the section against that shadow root. Nothing it does touches this repository.
 *
 * 🔴 That is not fastidiousness. `docs/FAILURE-INVENTORY.md` §3.8 and this platform's own history record
 * the alternative: two concurrent runs of a tree-mutating harness left a live payout gate DISABLED while
 * the harness printed clean, and `git diff` showed nothing. The subject of THIS suite is a file that talks
 * to players (`src/app/_actions/chat.ts`) and a register a regulator's answers are drawn from
 * (`docs/COMPLIANCE-DECISIONS.md`). A harness that edited either of those in place, on a branch where a
 * second agent is committing today, is a worse risk than the one it is proving.
 *
 * ⛔ SO THE ANCHORS ARE STILL AUDITED HERE, and the audit means exactly what it always did: the shadow copy
 * is byte-identical to the real file, so a `from` that has stopped resolving against the tree is a mutation
 * that would plant nothing. §3 catches that; the harness itself would only report a case it could not run.
 *
 * ── `expect` ───────────────────────────────────────────────────────────────────────────────────────────
 * ⭐ EVERY CASE NAMES THE ASSERTION IT MUST BREAK, and the harness matches `FAIL <expect>` rather than a
 * non-zero exit. Exit-code matching cannot tell a defect caught for the right reason from a syntax error,
 * an unrelated regression, or a section that crashed before reaching the leg in question.
 * ⭐ `stillGreen` IS THE OTHER HALF, AND IT IS THE HALF THIS LANE LEARNED THE HARD WAY. Its last two runs
 * shipped a protection sweep that refused its own cleanup, and thirteen "this is refused" assertions that
 * passed HARDER while the feature was broken. So the cases that delete a protected sentence assert not only
 * that the positive control goes red, but that the refusal assertions stay GREEN — which is the measurement
 * that says "only the positive control catches this", instead of hoping it does.
 *
 * ── the plants are not straw men ───────────────────────────────────────────────────────────────────────
 * Each `to` is a shape the real code could contain, written the way the person who wrote it would write it:
 * a reassurance added to calm a worried player, a tool handed to the assistant to make it more useful, a
 * prompt template extracted "to make it testable", a validator loosened because a provider complained, a
 * register tidied by a later session. Not one is invented to make a regex twitch.
 */
import { D19D_PLANTS } from "../lib/house-bot-assurances.mjs";
import { HOUSE_WORD_SAMPLES } from "../lib/house-bot-vocabulary.mjs";

const CHAT = "src/app/_actions/chat.ts";
const STUB = "src/lib/chat/send-message.ts";
const DICT = "src/lib/i18n-dict.ts";
const REGISTER = "docs/COMPLIANCE-DECISIONS.md";
const SUPPORT = "src/lib/server/support-config.ts";
const LEXICON = "scripts/lib/house-bot-assurances.mjs";
const DEFERRED = "plans/house-bots/DEFERRED-TESTS.md";

/**
 * ⛔ THE PLANTED SENTENCES ARE NOT RESPELLED HERE. They are the same strings the suite's own §6c controls
 * plant, imported from the one module that holds them — so a plant reworded in the lexicon is reworded in
 * this register too, and the two can never drift into proving different things about different sentences.
 */
const P = /** @type {Record<string, string>} */ (D19D_PLANTS);

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, expect: string, why: string, stillGreen?: string[], alsoRed?: string[] }} RedMutation */

/** @type {RedMutation[]} */
export const MUTATIONS = [
  // ── the four channels a player can be shown ──────────────────────────────────────────────────────
  {
    name: "prompt-gains-a-reassurance",
    file: CHAT,
    expect: "no D19d assurance in the LIVE SYSTEM PROMPT",
    why: "the single likeliest way this feature leaks: someone answers 'is this fair?' by writing a comforting sentence into the model's own instructions, and every player who asks is then handed a lie",
    from: "RULES:\n1. NEVER recommend which side to pick (YES or NO).",
    to: "RULES:\n0. " + P["en/never bets against you"] + "\n1. NEVER recommend which side to pick (YES or NO).",
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "fallback-gains-a-reassurance",
    file: CHAT,
    expect: "nor in the live channel's other player-read text",
    why: "the trouble fallback is handed to a player VERBATIM when the model fails — it is player-read text that no prompt-only guard would ever look at",
    from: '  en: "I\'m having trouble right now. Please try again in a moment, or reach out to support.",',
    to: '  en: "I\'m having trouble right now. Please try again in a moment, or reach out to support. ' + P["en/all stakes are from real players"] + '",',
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "stub-gains-a-reassurance",
    file: STUB,
    expect: "nor in the STUB corpus",
    why: "ChatRoot falls through to this corpus whenever the live action returns null — no API key, the kill-switch off, no session, or the burst limiter tripping. In production a rate-limited player is answered from here, and no guard reached it before §6",
    from: '          : "I can explain how a market resolves — the source we watch, the cut-off time, the officer who signs it off — but I can\'t tell you which side to pick. That\'s a call only you should make.",',
    to: '          : "I can explain how a market resolves — the source we watch, the cut-off time, the officer who signs it off — but I can\'t tell you which side to pick. That\'s a call only you should make. ' + P["en/all stakes are from real players"] + '",',
  },
  {
    name: "faq8a-sw-gains-a-reassurance",
    file: DICT,
    expect: "nor in faq8a",
    why: "faq8a is the fairness answer D19d names BY NAME, and the plant is written in Kiswahili — an English phrase list run 'in all three locales' can never fire, which is the vacuous-pattern failure test:chat-safety exists to prevent",
    from: 'ambapo unaweza kuihakiki mwenyewe.",',
    to: 'ambapo unaweza kuihakiki mwenyewe. ' + P["sw/never bets against you"] + '",',
  },
  {
    name: "chrome-zh-gains-a-reassurance",
    file: DICT,
    expect: "nor in the chat chrome",
    why: "the chrome is the copy the widget renders AROUND the answers — the greeting line a player reads before they ask anything — and the plant is Chinese, so an English-only list would pass over it",
    from: '      helpline: "有关充值、刻度盘、赔付或帮助页面找不到的任何问题，都可以问我。",',
    to: '      helpline: "有关充值、刻度盘、赔付或帮助页面找不到的任何问题，都可以问我。' + P["zh/never bets against you"] + '",',
  },
  {
    name: "stub-names-an-account",
    file: STUB,
    expect: "names an account by identifier or settles an account's nature",
    why: "D19d's ninth, open-ended item — a pre-written answer that settles what an account IS. The id family comes from the shared vocabulary module, so this also proves the single-source import is live",
    from: '          : "I\'m tuned for 50pick — deposits, the dial, payouts, KYC, market rules. For that question you\'ll have better luck somewhere else. Anything I can help with on the platform itself?",',
    to: '          : "' + P["A2 · confirming or denying an account's nature"] + '",',
  },

  {
    name: "the-prompt-names-the-feature",
    file: CHAT,
    expect: "nor any HOUSE VOCABULARY",
    why: "⭐ THE PLANT THAT IS NOT A LIE — which is why no D19d assurance pattern would ever see it. Someone explains the market to the model in one helpful sentence, and the word they reach for is the one the shared lexicon exists to keep out of everything a player can read. D19d is about lying; D19 is about the feature being NAMEABLE, and this is the second one",
    from: "WHAT YOU KNOW",
    to: "WHAT YOU KNOW\n- Some markets are seeded with " + HOUSE_WORD_SAMPLES[0] + " so there is always a price on both sides.",
    stillGreen: ["no D19d assurance in the LIVE SYSTEM PROMPT"],
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "the-vocabulary-loses-a-word",
    file: "scripts/lib/house-bot-vocabulary.mjs",
    expect: "every sample of the shared word family, written into a COPY of the real system prompt, is reported",
    why: "ruling 175's shared lexicon is the single home for house words, so a member trimmed out of it silently narrows EVERY absence proof on the platform at once. The Kiswahili spelling is the one to plant against: it is the default language here, and the alternative least likely to be re-read",
    from: "|dau la nyumba|",
    to: "|",
  },

  // ── what the model is handed ─────────────────────────────────────────────────────────────────────
  {
    name: "prompt-gains-a-new-channel",
    file: CHAT,
    expect: "the prompt's ${...} set is exactly the pinned closed set",
    why: "a new interpolation is a new door for text to enter the system prompt — the only way a house fact could ever reach a model that is given no tools and no retrieval. Closing the SET is what refuses the next door; policing the existing six would not",
    from: "3. If you don't know a 50pick answer, say so briefly",
    to: "${extraContext}\n3. If you don't know a 50pick answer, say so briefly",
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "the-call-gains-a-tool",
    file: CHAT,
    expect: "the live call hands the model NO tools",
    why: "the way a disclosure leak actually becomes possible: give the assistant a lookup tool 'so it can answer account questions', and a tool result can now carry a house fact into the conversation. The nested input_schema is deliberate — a key-set regex that stopped at the first closing brace would miss it",
    from: "      max_tokens: 350,",
    to: '      max_tokens: 350,\n      tools: [{ name: "account_lookup", description: "look up the caller\'s account", input_schema: { type: "object", properties: {} } }],',
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "the-token-cap-is-retuned",
    file: CHAT,
    expect: "a tools array added to a COPY of the live call is reported",
    why: "⭐ THE CONTROL'S OWN ANCHOR CAN ROT, AND NOTHING ELSE WOULD SAY SO. 6.c6 plants its tool array by replacing `max_tokens: 350,`; retune the cap — the most ordinary edit this file will ever get — and the control silently plants nothing while still printing a key list. This is the inline-anchor failure the sidecar convention exists for, living inside a case instead of a harness",
    from: "      max_tokens: 350,",
    to: "      max_tokens: 400,",
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "the-system-gains-appended-context",
    file: CHAT,
    expect: "what the model is told is the player's own conversation",
    why: "the other half of the same door, and the cheaper one to write: leave the prompt alone and append retrieved context to it at the call site. 6.4 cannot see this — the template never changed — which is why 6.5b pins the call's own shape",
    from: "      system: buildSystemPrompt(locale, (await getGlobalConfig()).objectionWindowHours),",
    to: "      system: buildSystemPrompt(locale, (await getGlobalConfig()).objectionWindowHours) + (await buildAccountContext(session.userId)),",
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "a-comment-is-added-to-chat-ts",
    file: CHAT,
    expect: "byte-identical to origin/main",
    why: "⭐ THE CASE WITH THE NARROWEST BLAST RADIUS, AND THAT IS ITS POINT. A comment changes no player-read word, so every other assertion in §6 stays green — only the D19a byte-identity pin moves. If 6.6 could not see this, it could not see anything, and its claim that 'the chatbot keeps main's words' would rest on nothing",
    from: "      // The window the assistant quotes is the one in force, read at answer time.",
    to: "      // The window the assistant quotes is the one in force, read at answer time.\n      // (clarified while reading this file — no behaviour change)",
  },

  // ── the positive controls: what must stay PRESENT ────────────────────────────────────────────────
  {
    name: "rule-2-loses-the-independent-service",
    file: CHAT,
    expect: "both helpline lines are still PRESENT",
    why: "⭐ THE CHEAPEST WAY TO GREEN A FLAT /independent/i, AND THE REASON 'independent' IS SUBJECT-SCOPED. RULE 2 is the at-risk path test:chat-safety exists to protect; a guard that pressured anyone into rewording it would be trading a player in trouble for a clean run",
    from: "must be pointed to the independent national service.",
    to: "must be pointed to a free national service.",
    stillGreen: ["no D19d assurance in the LIVE SYSTEM PROMPT", "nor in the STUB corpus"],
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "rule-2-drops-its-tools-wording",
    file: CHAT,
    expect: "RULE 2's own words",
    why: "the twin of the case above, pointed at 6.5's name sweep: RULE 2 says 'our responsible gambling tools', so a sweep for `tools` over code that still carries its strings reports that line — and rewording RULE 2 is the cheapest way to green such a guard. 6.c6b asserts the wording is still there precisely so nobody is paid for deleting it",
    from: "our responsible gambling tools at Profile > Responsible Gambling",
    to: "our responsible-gambling settings at Profile",
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "stub-loses-its-side-refusal",
    file: STUB,
    expect: "the stub's own two protected answers are still PRESENT",
    why: "the same shape on the other backend: deleting RULE 1's refusal to recommend a side leaves every absence assertion in §6 green, because absence is exactly what deleting text produces. Only a presence assertion notices",
    from: '          : "I can explain how a market resolves — the source we watch, the cut-off time, the officer who signs it off — but I can\'t tell you which side to pick. That\'s a call only you should make.",',
    to: '          : "That one is up to you — have a look at the market page for how it resolves.",',
    stillGreen: ["nor in the STUB corpus", "no D19d assurance in the LIVE SYSTEM PROMPT"],
  },

  // ── the population floors ────────────────────────────────────────────────────────────────────────
  {
    name: "the-prompt-template-loses-its-close",
    file: CHAT,
    expect: "the chatbot artefact was assembled from the tree",
    why: "🔴 THE DEFECT THAT ALREADY HAPPENED ONCE IN THIS SECTION'S OWN FIRST DRAFT. The slice ends at the template's closing backtick; add a `.trimEnd()` and that anchor is gone. A slice that silently becomes empty — or runs past its template into the rest of the module — is a scanner gone blind, and a blind scanner is GREEN exactly like a clean codebase",
    from: "support team.`;",
    to: "support team.`.trimEnd();",
    alsoRed: ["byte-identical to origin/main"],
  },
  {
    name: "the-prompt-loses-a-heading",
    file: CHAT,
    expect: "the chatbot artefact was assembled from the tree",
    why: "the other way the population pin drifts: the prompt is reorganised and a heading the floor names disappears. The floor then says so, instead of scanning whatever the slice happens to hold now",
    from: "KEY PAGES: /markets",
    to: "PAGES: /markets",
    alsoRed: ["byte-identical to origin/main"],
  },

  // ── the ruling the lexicon is derived from ───────────────────────────────────────────────────────
  {
    name: "the-ruling-row-is-renumbered",
    file: REGISTER,
    expect: "the lexicon was assembled from the RULING",
    why: "COMPLIANCE-DECISIONS.md is edited constantly, and the row is located by its cell key rather than a line number for that reason. Renumber the key and the lookup returns an empty row — which must fail a floor, not pass an empty loop",
    from: "| D19d | The chatbot",
    to: "| D19-d | The chatbot",
    alsoRed: ["the guarded phrases are the ruling's own", "a phrase DELETED from a copy of the guarded list"],
  },
  {
    name: "the-ruling-drops-a-phrase",
    file: REGISTER,
    expect: "the guarded phrases are the ruling's own",
    why: "the owner amends D19d and the guard is not updated — or the guard is trimmed and the ruling is not. 6.1 is a set equality in BOTH directions so either drift is reported, rather than the guard quietly under-covering the ruling it claims to enforce",
    from: '"cannot influence", "all stakes are from real players"',
    to: '"all stakes are from real players"',
  },

  // ── the one live channel: operator-writable text that reaches the model ──────────────────────────
  {
    name: "the-email-validator-is-widened",
    file: SUPPORT,
    expect: "every D19d assurance offered to the SHIPPED validator",
    why: "SUPPORT_EMAIL() is interpolated into the system prompt per-request, so the shipped validator is the only thing standing between an officer's keystrokes and the model's instructions. Loosening it 'because a provider rejected a valid address' is the realistic edit, and it re-opens the channel",
    from: "  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {",
    to: "  if (!/.+/.test(email)) {",
  },
  {
    name: "the-email-validator-is-over-tightened",
    file: SUPPORT,
    expect: "the shipped support defaults are ACCEPTED",
    why: "⭐ THE POSITIVE CONTROL'S OWN RED. A validator that refuses EVERYTHING passes the refusal assertion above perfectly — this is the mutation that separates a shape check from a guard that has simply stopped letting anything through, and it is the failure mode this lane shipped twice",
    from: "  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {",
    to: "  if (!/^[^\\s@]+@[^\\s@]+\\.(?:com|org)$/.test(email)) {",
  },
  {
    name: "the-validator-is-unwired",
    file: SUPPORT,
    expect: "the validator was taken from the module that SHIPS it and is wired into the LIVE config",
    why: "🔴 THE DEFECT THIS MODULE'S OWN HEADER RECORDS: 'dropping validate from the LIVE config left test:support-contact fully green, because the suite was driving an instance that carried its own copy.' A validator that exists and is not wired in is prose. The shape object is where it gets wired, so that is where the floor looks",
    from: "const SUPPORT_CONFIG_SHAPE = { defaults: SUPPORT_DEFAULTS, migrate, validate } as const;",
    to: "const SUPPORT_CONFIG_SHAPE = { defaults: SUPPORT_DEFAULTS, migrate } as const;",
  },
  {
    name: "the-recorded-residual-is-tidied-away",
    file: DEFERRED,
    expect: "the half this CANNOT hold is recorded rather than rounded up",
    why: "a later session tidies the register and the one honest sentence about what this guard does NOT hold disappears — after which 6.9 reads as a closed channel. 'Not applicable' is the most dangerous silent verdict on this platform, so the row's survival is itself asserted",
    from: "the string `SUPPORT_PHONE()` interpolates into the system prompt",
    to: "a support display value",
  },

  // ── the controls themselves ──────────────────────────────────────────────────────────────────────
  {
    name: "the-independent-pattern-goes-flat",
    file: LEXICON,
    expect: "every real line that must stay ALLOWED is fed to the same matcher",
    why: "⭐ THE MOST VALUABLE MUTATION IN THIS REGISTER. A flat /independent/i looks stricter and is the obvious thing to write — and it goes red on day one on the helpline sentence and on RULE 2, whose cheapest fix is to delete the at-risk path. The positive control is the only thing that reports the difference between a guard that is strict and a guard that is wrong",
    from: '  { phrase: "independent", locale: "en", scoped: "predicate of a platform subject", re: new RegExp(String.raw`\\b${PLATFORM_SUBJECT}\\s+${COPULA}\\s+${DEGREE}independent\\b`, "i") },',
    to: '  { phrase: "independent", locale: "en", re: /\\bindependent\\b/i },',
    alsoRed: ["no D19d assurance in the LIVE SYSTEM PROMPT"],
  },
  {
    name: "the-lexicon-loses-a-locale-pattern",
    file: LEXICON,
    expect: "written in zh into a COPY",
    why: "the vacuous-locale failure in its purest form: the phrase is still guarded, the suite still says 'in all three locales', and one of the three has no pattern at all. 6.c1 is split per locale so the gap is NAMED rather than hidden inside an aggregate that still reports a count",
    from: '  { phrase: "never bets against you", locale: "zh", re: /[与和跟](?:您|你|玩家)(?:对赌|对赌|对下注)/ },',
    to: "",
    alsoRed: ["the pattern table covers every phrase in every locale"],
  },
  {
    name: "a-plant-is-quietly-softened",
    file: LEXICON,
    expect: "written in en into a COPY",
    why: "someone 'improves' a planted sentence and removes the very shape it was testing. The plant stops exercising the pattern, the control still prints a count, and the guard is never shown able to fire again",
    from: '  "en/no person decides": "No person decides which side gets filled.",',
    to: '  "en/no person decides": "Resolution is reviewed before a market is sealed.",',
  },
  {
    name: "a-sw-plant-is-quietly-softened",
    file: LEXICON,
    expect: "written in sw into a COPY",
    why: "the same rot in the locale nobody re-reads. Kiswahili is the DEFAULT language here — a visitor who has not chosen one sees the site in it — so a sw control that has stopped exercising its pattern is the most expensive of the three to lose, and the least likely to be noticed",
    from: '  "sw/cannot influence": "Hatuwezi kushawishi matokeo ya soko.",',
    to: '  "sw/cannot influence": "Matokeo ya soko hutegemea chanzo cha umma.",',
  },
  {
    name: "the-account-pattern-narrows",
    file: LEXICON,
    expect: "a sentence settling an account's nature and a sentence naming an account by identifier",
    why: "D19d's ninth item is the open-ended one, so its pattern is the easiest to narrow by accident — restrict it to the word 'house' and it stops seeing 'that account is operated by 50pick', which is the sentence a player would actually be told",
    from: "    re: /\\b(?:this|that|the|your|an?|one)\\s+account\\s+(?:is|is\\s+not|isn't|was|belongs\\s+to|is\\s+operated\\s+by|is\\s+run\\s+by|is\\s+owned\\s+by|is\\s+controlled\\s+by)\\s+(?:not\\s+)?(?:an?\\s+)?(?:real|genuine|ordinary|house|platform|50pick|automated|automatic|bot|robot|staff|company|internal)\\b/i,",
    to: "    re: /\\baccount\\s+is\\s+a\\s+house\\s+account\\b/i,",
  },
  {
    name: "the-lexicon-spells-its-own-house-word",
    file: LEXICON,
    expect: "the assurance module names no house word of its own",
    why: "ruling 175's single-source property: the bounded-id family is IMPORTED, never respelled. A second spelling drifts from the first the day HOUSE_ID_PREFIX changes, and test:house-bot-reports 0.175 refuses a consumer that declares its own pattern — so this module must be held to the same rule it benefits from",
    from: 'import { HOUSE_ID_SOURCE } from "./house-bot-vocabulary.mjs";',
    to: 'import { HOUSE_ID_SOURCE } from "./house-bot-vocabulary.mjs";\nconst HOUSE_BOT_ID_PATTERN = /hb_[0-9a-f]{24}/i;',
  },
];
