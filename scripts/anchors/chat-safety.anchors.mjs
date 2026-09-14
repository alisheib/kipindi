/**
 * THE ANCHORS `red:chat-safety` MUTATES — declared, as DATA, importable without running (2026-09-14).
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer *"does every anchor still
 * resolve, exactly once?"* WITHOUT executing a harness. Until this file existed the nine mutations lived inline in
 * `scripts/chat-safety-red.mjs`, so the audit could not see them and the harness counted against §4's ratchet. Moved
 * verbatim; the harness imports them.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths. `check` is the gate check each mutation must turn red.
 */

const CHAT_ROOT = "src/components/chat/ChatRoot.tsx";
const ACTION = "src/app/_actions/chat.ts";
const DICT = "src/lib/i18n-dict.ts";
const CARD = "src/components/chat/messages/EscalateHandoff.tsx";

export const MUTATIONS = [
  {
    // 🔴 UNIT 6.1 ITSELF, PUT BACK: delete the interception and every backend
    // outcome bypasses the safety card again.
    name: "6.1 restored — the at-risk filter is gone from the send handler",
    check: "1.1",
    file: CHAT_ROOT,
    from: `      const intercepted = atRiskReply(text);`,
    to: `      const intercepted = null;`,
  },
  {
    // ⭐ THIS SLOT HELD AN ORDERING MUTATION AND IT WAS RE-AIMED, WHICH IS WORTH
    // RECORDING RATHER THAN HIDING. The first attempt added a SECOND
    // `chatWithClaude` call in order to make one happen earlier — so it broke the
    // subject two ways at once and the run failed on 1.5 (two call sites) instead
    // of on 1.1. A mutation that breaks two things proves nothing about either:
    // the gate went red for the wrong reason and scored as a MISS, correctly.
    // ⛔ A pure textual reorder is not expressible as a one-line substitution here,
    // because the two statements live in different scopes. So the slot now tests
    // what the failed attempt actually revealed — that a second backend call site
    // makes the offset comparison in 1.1 meaningless, and that 1.5 says so.
    name: "a second backend call site — the offset comparison in 1.1 becomes meaningless",
    check: "1.5",
    file: CHAT_ROOT,
    from: `        const liveResult = await chatWithClaude(historyForClaude, text, locale);`,
    to: `        const warm = await chatWithClaude([], "", locale);\n        const liveResult = warm ?? await chatWithClaude(historyForClaude, text, locale);`,
  },
  {
    // ⭐ COMPUTE THE ANSWER AND IGNORE IT — the `chat-availability` lesson, which
    // is that reading a switch and not branching on it is the same bug in better
    // clothes. 1.1 still passes here; only 1.4 can catch it.
    name: "the filter is called and its answer discarded — no early return",
    check: "1.4",
    file: CHAT_ROOT,
    from: `      if (intercepted) {\n        setMessages((prev) => [...prev, intercepted]);`,
    to: `      if (intercepted && false) {\n        setMessages((prev) => [...prev, intercepted]);`,
  },
  {
    // ⭐ THE ZERO-POPULATION CASE for §1: delete the live backend entirely and the
    // ORDERING claim in 1.1 becomes vacuously true. Only the control catches it.
    name: "delete the live backend — an ordering claim over one thing must FAIL",
    check: "1.2",
    file: CHAT_ROOT,
    from: `        const liveResult = await chatWithClaude(historyForClaude, text, locale);`,
    to: `        const liveResult = null;`,
  },
  {
    // 🔴 UNIT 6.2 PUT BACK on the server side.
    name: "6.2 restored — the daily-cap reply stops admitting it is not an answer",
    check: "3.2",
    file: ACTION,
    from: `    return { text: capacityMessage(locale), unresolved: true };`,
    to: `    return { text: capacityMessage(locale) };`,
  },
  {
    // 🔴 UNIT 6.2 PUT BACK on the client side — the half that made the whole
    // mechanism dead, and the half a server-only guard would have missed.
    name: "6.2 restored — ChatRoot drops `unresolved` when it wraps the live reply",
    check: "3.3",
    file: CHAT_ROOT,
    from: `unresolved: liveResult.unresolved, ts: Date.now() }`,
    to: `ts: Date.now() }`,
  },
  {
    // 🔴 UNIT 6.3 PUT BACK, in ENGLISH ONLY — the shape that matters, because a
    // guard that scanned one locale would go green over two false translations.
    name: "6.3 restored in EN only — the card promises an attachment again",
    check: "4.3",
    file: DICT,
    from: `      handoffBody: "This opens an email to our support desk. Please describe what you need, and include anything from this conversation that matters.",`,
    to: `      handoffBody: "Your chat history is attached so you won't have to repeat anything.",`,
  },
  {
    // ⭐ THE `6.7` SHAPE — the claim MOVES to a different key the card renders.
    // This is the mutation that a population of one pinned key cannot survive, and
    // it is the reason §4 discovers its keys from the component.
    name: "the promise moves to another key the card renders — a pinned-key guard would miss it",
    check: "4.3",
    file: DICT,
    from: `      specialistTakeOver: "A specialist will take this from here",`,
    to: `      specialistTakeOver: "A specialist will take this from here — you'll get a notification",`,
  },
  {
    // ⭐ THE ZERO-POPULATION CASE for §4: stop rendering the key at all and the
    // scan has nothing left to look at. Only the control catches it.
    name: "the card stops rendering handoffBody — a scan over zero keys must FAIL",
    check: "4.1",
    file: CARD,
    from: `          {t.chat.handoffBody}`,
    to: `          {""}`,
  },
];
