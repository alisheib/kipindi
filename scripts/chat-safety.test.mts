/**
 * CHAT SAFETY — the at-risk response a signed-in player could never reach.
 *
 *   npm run test:chat-safety     # the gate
 *   npm run red:chat-safety      # the proof it can fail
 *
 * THE DEFECT (SUPPORT & CARE Unit 6, measured against HEAD 140fcc6a).
 * `ChatRoot.handleSend` called `chatWithClaude` FIRST and only fell through to
 * `sendMessage` when it returned `null`:
 *
 *     const liveResult = await chatWithClaude(historyForClaude, text, locale);
 *     const reply = liveResult ? { …kind:"text", text: liveResult.text }
 *                              : await sendMessage([...messages, user], text);
 *
 * The deterministic at-risk pre-filter lives inside `sendMessage`. So for a
 * SIGNED-IN player, with the API key set and the chatbot switched on, the filter
 * NEVER RAN. A player who typed "I can't stop" got whatever the model said,
 * governed only by RULE 2 of a system prompt — an instruction, not a code path.
 * ⭐ Sign out and the same sentence renders the RG card. Opposite behaviour for
 * identical input, and the wrong half was the half with a session.
 *
 * ⛔ AND THE FALLTHROUGH IS NOT THE ONLY BYPASS — this is why the fix had to move
 * the decision rather than widen the branch. `chatWithClaude` also returns a
 * TRUTHY reply on two paths that are not answers at all: the daily-quota
 * capacity message and the API-error message. Both satisfy `liveResult ? …`, so
 * both skipped the filter too. Every backend outcome bypassed safety because the
 * safety check sat DOWNSTREAM of the backend choice. Moving it upstream of the
 * choice is the only shape that cannot grow a third bypass.
 *
 * ⭐ WHY §2 EXECUTES THE CLASSIFIER INSTEAD OF READING IT. A structural check
 * ("the file contains a zh pattern") is the proxy shape this repo keeps shipping
 * green: it is satisfiable by a pattern that matches nothing. §2 runs the real
 * exported function over a real corpus, and derives WHICH LOCALES MUST BE COVERED
 * from the product's own `Lang` union — so adding a fourth locale to the product
 * makes this gate demand safety patterns for it, without anyone remembering to
 * come back here. A hand-typed locale list is exactly the "four hand-typed module
 * names" failure that let `ai-controls` ship unhydrated.
 *
 * ⚠️ §2 IS THE ONE SECTION `red:chat-safety` CANNOT AIM. It imports the product
 * directly, so it always reads the real tree no matter what `CHAT_SAFETY_ROOT`
 * says. Its red proof is recorded instead: run against HEAD 140fcc6a, before the
 * fix, 2.1 failed on every Chinese phrase and 2.3 failed for `zh` — there were
 * seven at-risk patterns and not one of them was Chinese, while `detectLang`
 * has stamped zh since B-7. Every structural section (§1, §3, §4) IS aimable and
 * is mutated by the red harness.
 *
 * ⛔ §4's POPULATION IS DISCOVERED FROM THE COMPONENT, NOT TYPED HERE. The
 * handoff card promised an attached transcript, a pick-up notification and an
 * availability window; the action behind it is a bare `mailto:`. Pinning the key
 * `handoffBody` by name would have been the `6.7` mistake again — that guard
 * watched one key while the false claim moved to another. So §4 reads which
 * `t.*` keys the card actually RENDERS and scans those, in every locale. Move the
 * promise to the title and the gate follows it.
 *
 * ⛔ THE §4 RULE IS "DO NOT RAISE THE SUBJECT", NOT "DO NOT PROMISE IT", AND THAT
 * IS DELIBERATE. A tempered pattern that allows "your chat is NOT attached" has to
 * read a negation in three languages, and this repo has already shipped a guard
 * that flagged its own fix for want of that. The honest copy does not mention an
 * attachment in either direction, so the rule is a flat ban and 4.4 proves it does
 * not fire on the replacement copy. If a future editor really needs the word, they
 * will get a loud failure and this paragraph — the direction this repo errs in.
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import { atRiskReply, detectLang } from "../src/lib/chat/send-message.ts";

const ROOT = process.env.CHAT_SAFETY_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
console.log(`chat-safety: reading ${ROOT}\n`);

let failed = 0;
const say = (ok: boolean, msg: string, extra?: string) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}${!ok && extra ? ` — ${extra}` : ""}`);
  if (!ok) failed++;
};
const read = (rel: string) => decomment(readFileSync(`${ROOT}/${rel}`, "utf8"));

const CHAT_ROOT_FILE = "src/components/chat/ChatRoot.tsx";
const CHAT_ACTION_FILE = "src/app/_actions/chat.ts";
const CARD_FILE = "src/components/chat/messages/EscalateHandoff.tsx";
const TYPES_FILE = "src/components/chat/types.ts";
const DICT_FILE = "src/lib/i18n-dict.ts";

// ─────────────────────────────────────────────────────────────────────────────
console.log("§1 · the at-risk decision is taken BEFORE any backend is consulted\n");
// ─────────────────────────────────────────────────────────────────────────────
{
  const src = read(CHAT_ROOT_FILE);
  const iAtRisk = src.indexOf("atRiskReply(");
  const iLive = src.indexOf("chatWithClaude(");
  const iStub = src.indexOf("sendMessage(");

  say(iAtRisk !== -1 && iLive !== -1 && iAtRisk < iLive,
    "1.1 ★ the send handler calls atRiskReply() before it calls chatWithClaude()",
    iAtRisk === -1 ? "atRiskReply is never called — every backend outcome bypasses safety"
      : iLive === -1 ? "no chatWithClaude call found at all" : `atRiskReply at ${iAtRisk}, chatWithClaude at ${iLive}`);

  // ⭐ CONTROL — 1.1 is an ORDERING claim, and an ordering claim is vacuously true
  // when one of the two things is missing. Deleting the live backend entirely would
  // satisfy "the filter comes first" while proving nothing about the path this unit
  // exists for. Both ends must still be there.
  say(iLive !== -1, "1.2 ⚠️ CONTROL — the live backend call still exists, so 1.1 cannot pass by deletion");
  say(iStub !== -1, "1.3 ⚠️ CONTROL — the stub backend call still exists too");

  // ⛔ COMPUTING THE ANSWER AND IGNORING IT IS THE SAME BUG IN BETTER CLOTHES —
  // `chat-availability` learned this when reading a switch satisfied a gate that
  // never branched on it. The interception must SHORT-CIRCUIT: a return between the
  // filter and the backend call.
  // 🔴 A BARE `\breturn\b` HERE WAS NOT ENOUGH, and `red:chat-safety` proved it on
  // the first run: mutating the guard clause to `if (intercepted && false)` left the
  // word `return` sitting in the source, so this check went GREEN over a branch that
  // could never be taken. Textual presence is not reachability — the same class as
  // asserting a declaration when the property lives at the call site.
  // ⛔ So the SHAPE is pinned: the condition must be `intercepted` and nothing else.
  // A rewrite in a different shape fails loudly and sends the next author to this
  // paragraph, which is the direction this repo errs in on purpose.
  const between = src.slice(iAtRisk === -1 ? 0 : iAtRisk, iLive === -1 ? 0 : iLive);
  say(iAtRisk !== -1 && /if\s*\(\s*intercepted\s*\)\s*\{[\s\S]*?\breturn\b/.test(between),
    "1.4 ★ …and it returns on a hit, on an unqualified `if (intercepted)` — not a branch that cannot be taken",
    "no reachable early return between the filter and the backend call");

  // ⛔ ONE CALL SITE, OR THE OFFSET COMPARISON IN 1.1 IS MEANINGLESS. Two backend
  // calls and `indexOf` silently measures against the first one.
  const liveCalls = src.split("chatWithClaude(").length - 1;
  say(liveCalls === 1, "1.5 ⚠️ CONTROL — exactly one chatWithClaude call site, so the offset test is unambiguous", `found ${liveCalls}`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the classifier itself, EXECUTED — every locale the product speaks\n");
// ─────────────────────────────────────────────────────────────────────────────
{
  // ⭐ THE LOCALE LIST IS DISCOVERED FROM THE PRODUCT. `Lang` is the union every
  // chat message is stamped with; if a fourth locale is added there, this gate
  // starts demanding at-risk coverage for it on the next run.
  const typeSrc = read(TYPES_FILE);
  const langLine = typeSrc.match(/export type Lang\s*=\s*([^;]+);/);
  const LOCALES = langLine ? [...langLine[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]) : [];
  say(LOCALES.length >= 3, "2.0 ⚠️ CONTROL — the Lang union was parsed and is non-empty", `parsed ${JSON.stringify(LOCALES)}`);

  /** At-risk phrases a real player might type. ⛔ Every entry must be a sentence a
   *  human would write, not a pattern echoed back at the regex that matches it —
   *  a corpus built from the implementation is the "check built from the value it
   *  checks" shape and both sides would move together for ever. */
  const AT_RISK: Record<string, string[]> = {
    en: [
      "I think I'm addicted to this",
      "I can't stop betting",
      "I'm losing too much money here",
      "I keep chasing my losses",
      "I can't control my betting any more",
    ],
    sw: [
      "Nadhani nina uraibu wa kucheza",
      "Siwezi kuacha kucheza kamari",
      "Kucheza kunakuathiri maisha yangu",
      "Nimepoteza pesa nyingi sana",
    ],
    zh: [
      "我觉得我赌博上瘾了",
      "我停不下来",
      "我输太多钱了",
      "我一直在追回损失",
      "我控制不住自己",
    ],
  };

  /** ⭐ THE OTHER HALF OF THE CORPUS, AND IT IS NOT OPTIONAL. A classifier that
   *  returns true for everything passes 2.1 perfectly and routes every deposit
   *  question to the responsible-gambling card. */
  const ORDINARY: Record<string, string[]> = {
    en: ["How do I deposit?", "When does this market close?", "Can I stop my withdrawal?", "What is the minimum stake?"],
    sw: ["Naweza kuweka amana vipi?", "Soko hili linafungwa lini?", "Malipo yanachukua muda gani?"],
    zh: ["我怎么存款？", "这个市场什么时候关闭？", "最低投注是多少？"],
  };

  for (const loc of LOCALES) {
    const risky = AT_RISK[loc] ?? [];
    // ⛔ THE ANTI-VACUITY ASSERTION OF THIS WHOLE SECTION. Delete the Chinese
    // patterns and 2.1 has nothing to iterate for zh, so it passes an empty loop
    // beautifully. This is what makes absence loud.
    say(risky.length >= 3, `2.1.${loc} ⚠️ CONTROL — the ${loc} at-risk corpus is populated`, `${risky.length} phrase(s)`);
    for (const phrase of risky) {
      const r = atRiskReply(phrase);
      say(r !== null && r.kind === "rg_redirect",
        `2.2.${loc} ★ "${phrase}" routes to the RG card`,
        r === null ? "the classifier did not recognise it" : `got kind=${r.kind}`);
      // ⚠️ A zh phrase caught by an ENGLISH pattern would satisfy 2.2 while proving
      // nothing about Chinese coverage. The stamp has to agree with the file it is
      // filed under, or the corpus is testing the wrong thing.
      say(detectLang(phrase) === loc, `2.3.${loc} ⚠️ CONTROL — "${phrase}" is detected as ${loc}, not caught by another locale's pattern`, `detected ${detectLang(phrase)}`);
    }
    for (const phrase of ORDINARY[loc] ?? []) {
      say(atRiskReply(phrase) === null, `2.4.${loc} ⚠️ CONTROL — ordinary question "${phrase}" is NOT diverted`);
    }
  }

  /**
   * ⭐ THE STRONGEST CORPUS ENTRY IS NOT ONE I WROTE — it is the platform's OWN
   * wording of the at-risk case, read out of the dictionary at run time.
   *
   * 🔴 AND IT FAILED. `help.faq5q` is the FAQ headed *"I think I have a problem
   * with gambling. What can I do?"* — 50pick's own canonical phrasing, published
   * on `/help` in three languages — and `isAtRiskLanguage` matched NONE of the
   * three. A player who read the FAQ and typed its question into the chat box got
   * the model, not the card.
   *
   * ⛔ THIS IS WHY IT IS READ AND NOT PASTED. A corpus I type is a corpus I tune
   * until it passes; this one is owned by whoever edits the FAQ, so if the wording
   * changes the classifier must keep up or this goes red. That is the difference
   * between a fixture and a coupling.
   */
  const dictRaw = readFileSync(`${ROOT}/${DICT_FILE}`, "utf8");
  const faqQuestions = [...dictRaw.matchAll(/^\s*faq5q:\s*"((?:[^"\\]|\\.)*)"/gm)].map((m) => JSON.parse(`"${m[1]}"`));
  say(faqQuestions.length >= 3,
    "2.5 ⚠️ CONTROL — the platform's own at-risk FAQ question was found in every locale",
    `found ${faqQuestions.length}`);
  for (const q of faqQuestions) {
    const r = atRiskReply(q);
    say(r !== null && r.kind === "rg_redirect",
      `2.6 ★ the platform's OWN at-risk question routes to the RG card — "${q}"`,
      r === null ? "50pick's own phrasing of the at-risk case does not trigger 50pick's own safety filter" : `got kind=${r.kind}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · the live backend can say 'I did not answer', so the handoff can fire\n");
// ─────────────────────────────────────────────────────────────────────────────
{
  const action = read(CHAT_ACTION_FILE);
  const rootSrc = read(CHAT_ROOT_FILE);

  say(/Promise<\{[^}]*unresolved[^}]*\}\s*\|\s*null>/.test(action),
    "3.1 ★ chatWithClaude's return type can carry `unresolved`",
    "the live reply has no way to report that it did not answer");

  // ⛔ THE TWO OUTCOMES THAT ARE NOT ANSWERS BY CONSTRUCTION. The daily cap and the
  // API error both return TRUTHY text, which is precisely why they bypassed the
  // stub path. They are the only two the server can be certain about, so they are
  // the only two asserted — a guard that demanded more would be demanding the
  // server classify the model's own reply, which it cannot do.
  const NON_ANSWERS = [
    ["capacityMessage", /capacityMessage\(locale\)[^;]*unresolved:\s*true|unresolved:\s*true[^;]*capacityMessage\(locale\)/],
    ["TROUBLE_MESSAGES", /TROUBLE_MESSAGES\[locale\][\s\S]{0,120}?unresolved:\s*true|unresolved:\s*true[\s\S]{0,120}?TROUBLE_MESSAGES\[locale\]/],
  ] as const;
  for (const [name, re] of NON_ANSWERS) {
    say(re.test(action), `3.2 ★ the ${name} reply is marked unresolved — the bot admits it did not answer`);
  }

  say(/unresolved:\s*liveResult\.unresolved/.test(rootSrc),
    "3.3 ★ ChatRoot propagates `unresolved` from the live reply onto the message",
    "the live branch builds a message that can never be unresolved, so the run counter always resets");

  // ⭐ CONTROL — §3 is about making escalation REACHABLE. If someone deleted
  // escalation itself, every assertion above would still pass and the section would
  // be guarding a path to nowhere. Both ends of the coupling, again.
  say(/unresolved\s*===\s*true/.test(rootSrc) && />=\s*2/.test(rootSrc),
    "3.4 ⚠️ CONTROL — the auto-escalate threshold still exists and still reads unresolved === true");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · the handoff card promises nothing the product does not do\n");
// ─────────────────────────────────────────────────────────────────────────────
{
  const card = read(CARD_FILE);
  const dict = readFileSync(`${ROOT}/${DICT_FILE}`, "utf8");

  // ⭐ DISCOVERED POPULATION — which keys the card RENDERS, read off the card.
  const keys = [...new Set([...card.matchAll(/\bt\.[A-Za-z0-9_$]+\.([A-Za-z0-9_$]+)\b/g)].map((m) => m[1]))].sort();
  say(keys.length > 0 && keys.includes("handoffBody"),
    "4.1 ⚠️ CONTROL — the card's rendered dict keys were discovered and include handoffBody",
    `found ${JSON.stringify(keys)}`);

  /** The three mechanisms the card cannot deliver. It is a `mailto:` — nothing is
   *  attached to it, no ticket exists to be picked up, and no availability window
   *  is measured anywhere in this codebase. */
  const PROMISES: [string, RegExp][] = [
    ["an attached transcript", /attach(ed|ment|es|ing)?|ambatish|ambatanish|附上|附件/i],
    ["a pick-up notification", /notif(y|ied|ication)|let you know|\barifa\b|通知/i],
    ["an availability window", /weekday|evening|usually faster|business hours|within \d|jioni|siku za kazi|工作日|晚间|小时内/i],
  ];

  const lines = dict.split(/\r?\n/);
  const offenders: string[] = [];
  let scanned = 0;
  for (const key of keys) {
    const keyRe = new RegExp(`^\\s{4,10}${key}:`);
    for (const line of lines) {
      if (!keyRe.test(line)) continue;
      scanned++;
      for (const [what, re] of PROMISES) {
        if (re.test(line)) offenders.push(`${key} promises ${what} — ${line.trim().slice(0, 100)}`);
      }
    }
  }
  say(scanned >= keys.length, "4.2 ⚠️ CONTROL — every discovered key was found in the dictionary, in every locale", `${scanned} line(s) for ${keys.length} key(s)`);
  say(offenders.length === 0,
    "4.3 ★ no locale of any key the card renders promises an attachment, a notification, or an availability window",
    offenders.join(" | "));

  // ⭐ CONTROL — the pattern must still catch the sentence this unit retired, or
  // 4.3 proves only that it ran. Kept as a fixture precisely so nobody has to trust
  // that the regex still works after an edit.
  const RETIRED_EN = 'handoffBody: "Your chat history is attached so you won’t have to repeat anything. You’ll get a notification when the support team picks up — usually faster on weekday evenings.",';
  const RETIRED_ZH = 'handoffBody: "您的聊天记录已附上，无需重复说明。支持团队接手时您将收到通知 — 通常工作日晚间更快。",';
  say(PROMISES.some(([, re]) => re.test(RETIRED_EN)) && PROMISES.some(([, re]) => re.test(RETIRED_ZH)),
    "4.4 ⚠️ CONTROL — the patterns still fire on the retired English AND Chinese sentences");

  // ⛔ AND THE OTHER END OF THE COUPLING: the rule "promise nothing" is only correct
  // while the escalation really is a bare mailto. Build a ticket API behind this card
  // and 4.5 fails, which is the signal to revisit 4.3 rather than to delete it.
  say(/href=\{`mailto:/.test(card) && !/\bfetch\(|use server|createTicket/.test(card),
    "4.5 ⚠️ CONTROL — the escalation is still a bare mailto, which is WHY the promises had to go");
}

console.log("");
console.log(failed ? `chat-safety — ${failed} check(s) FAILED\n` : `chat-safety — all checks passed\n`);
process.exit(failed ? 1 : 0);
