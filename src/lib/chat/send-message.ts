/**
 * AI Help Companion — send-message handler.
 *
 * STUB MODE (no ANTHROPIC_API_KEY set):
 *   Keyword-matches the user's last message against a small intent table
 *   and returns a hand-curated reply that mirrors what the live Claude
 *   model is expected to produce. Lets the chat UI demo end-to-end at
 *   zero cost.
 *
 * LIVE MODE (key present):
 *   Routes the conversation to the Anthropic SDK with `claude-haiku-4-5`,
 *   the system prompt from the handoff README §7, and web_search tool
 *   for "current state" questions. Wired later in one diff:
 *     `npm install @anthropic-ai/sdk`
 *     + the import + the runtime branch below.
 *
 * The wire format is identical between modes so the only swap is the
 * inner branch — call sites don't change.
 *
 * KEEPING KNOWLEDGE IN SYNC (until live Claude + retrieval is wired):
 *   When a player-facing page or feature is ADDED, RENAMED, or REMOVED, add or
 *   update an intent branch in `stubReply()` below (keyword → reply + a
 *   citation to the route). Current intents: deposits, conviction dial,
 *   payouts/withdrawals, KYC, referral (agents only — NO citation, deliberately: see the
 *   branch itself), proposals (→ /proposals), escalation. Treat this list as the chatbot's
 *   knowledge index; a page without an intent here falls through to the
 *   "I'm not sure" → support handoff. (Live mode replaces this with the
 *   system prompt + web_search over the live site.)
 */

import type { Citation, Lang, Message } from "@/components/chat/types";
// 🔴 EVERY MONEY FIGURE IN THIS OFFLINE FALLBACK WAS INVENTED (fixed 2026-09-07).
// It told players: a deposit minimum of "TZS 1,000" when `DEPOSIT_MIN_TZS` is **500**, so it
// turned away people who could in fact deposit; a "daily cap TZS 200,000 before tier 2" —
// **"tier 2" and that cap exist nowhere in this codebase except those sentences**; "funds arrive
// in about 30 seconds", "within 2 minutes", "auto-reverses within 24 hours", "tier 2
// verification (5 minutes)" — SLAs nothing measures or promises; and a dial that "scales from
// the base (TZS 500) up to 5×" when the base is 1,000 and `MAX_MULTIPLIER` is **200**.
// ⛔ A-5: never render a number nobody produced. The bounds now come from the same constants the
// deposit form validates against, and every claim that could not be sourced is DELETED rather
// than softened — a vaguer invented number is still invented.
import { DEPOSIT_MIN_TZS, DEPOSIT_MAX_TZS } from "@/lib/server/validators";
import { PLATFORM_MIN_STAKE } from "@/lib/payout";
import { formatTzs } from "@/lib/utils";

let __id = 0;
const nextId = () => `m_${Date.now().toString(36)}_${__id++}`;

/** Detect the user's language from their last message. Heuristic, not
 *  exhaustive — production swaps to a real classifier. */
function detectLang(text: string): Lang {
  // B-7 — CJK first: a Chinese question used to be stamped "en" and keyword-missed
  // into an English "I'm not sure", which read as being ignored.
  if (/[一-鿿㐀-䶿]/.test(text)) return "zh";
  // 🔴 THE SECOND HALF OF THIS LIST WAS ADDED 2026-09-11, AND A CONTROL FOUND IT,
  // NOT A READER. `test:chat-safety` §2.3 asserts that a phrase filed under a
  // locale is DETECTED as that locale — so a Chinese sentence cannot be scored as
  // covered because an English pattern happened to match it. It failed on
  // "Nimepoteza pesa nyingi sana": unambiguous Kiswahili, stamped `en`, because
  // not one of its words was on this list. The at-risk filter would then have
  // answered a Swahili player in English chrome.
  // ⚠️ Every token added is Kiswahili-distinctive. A short, ambiguous word here
  // costs more than a missing one: a false `sw` stamp puts the panel into the
  // wrong language for a player who wrote English.
  const sw = /\b(habari|niko|vipi|chochote|amana|malipo|soko|dau|jaribu|asante|hapana|ndio|kucheza|mfumo|niulize|kusaidia|alika|pendekez|tume|kiungo|nadhani|nina|uraibu|siwezi|kuacha|kamari|nimepoteza|pesa|nyingi|maisha|tafadhali|kujizuia)\b/i;
  return sw.test(text) ? "sw" : "en";
}

/** At-risk language pre-filter — keyword match first; the live model
 *  will use a classifier pass. Both paths funnel into the RG card so
 *  the response is never free-text.
 *
 *  ⛔ CHINESE HAS NO WORD BOUNDARIES, so the zh patterns carry no `\b`. Writing
 *  them like the English ones would have produced seven more patterns that match
 *  nothing — the shape of a guard that is satisfiable without the property.
 *  `detectLang` has stamped zh since B-7; until 2026-09-11 this filter had not a
 *  single Chinese pattern, so a Chinese-speaking player asking for help with a
 *  gambling problem had no deterministic safety response BY CONSTRUCTION.
 *
 *  ⚠️ The Swahili additions are deliberately narrow. `kamari` alone means
 *  "gambling" and would divert every ordinary question that used the word to the
 *  responsible-gambling card — a classifier that fires on everything is as useless
 *  as one that fires on nothing, and `test:chat-safety` §2.4 holds that line with
 *  an ordinary-question corpus.
 */
function isAtRiskLanguage(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\blosing too much\b/.test(t) ||
    /\bchas(e|ing) (my )?loss(es)?\b/.test(t) ||
    /\baddict(ed|ion|ive)\b/.test(t) ||
    /\bcan'?t stop\b/.test(t) ||
    /\bcontrol my bet/.test(t) ||
    /\bkucheza kunakuathiri\b/.test(t) ||
    /\bsiwezi kuach/.test(t) ||
    // 🔴 THE PLATFORM'S OWN WORDS, AND THEY WERE THE ONES IT COULD NOT HEAR.
    // `help.faq5q` — "I think I have a problem with gambling. What can I do?" — is
    // 50pick's published phrasing of this exact case, in three languages, and not
    // one of the seven original patterns matched any of them. `test:chat-safety`
    // §2.6 reads those three strings out of the dictionary rather than restating
    // them here, so the FAQ and the filter can no longer drift apart in silence.
    /\bproblem (with |wa )?(gambling|betting)\b/.test(t) ||
    /\bshida ya kucheza\b/.test(t) ||
    /博彩问题|赌博问题|赌钱问题/.test(t) ||
    /\buraibu\b/.test(t) ||
    /\bnimepoteza (pesa )?nyingi\b/.test(t) ||
    /\bsiwezi kujizuia\b/.test(t) ||
    /上瘾|成瘾|赌瘾/.test(t) ||
    /停不下来|戒不掉|控制不住|无法自拔/.test(t) ||
    /输太多|输了太多|输光/.test(t) ||
    /追回损失|追损|翻本/.test(t)
  );
}

/**
 * ⭐ THE ONE PLACE THE AT-RISK DECISION IS TAKEN — for every backend, before any
 * of them is consulted.
 *
 * ⛔ IT EXISTS BECAUSE THE DECISION USED TO LIVE DOWNSTREAM OF THE BACKEND CHOICE.
 * `sendMessage` ran the filter, and `ChatRoot` only reached `sendMessage` when the
 * live model returned `null`. A signed-in player with the chatbot on therefore
 * never met it: the raw sentence went to the model, governed by an instruction in
 * a prompt rather than by a code path. Sign out and the same words rendered the
 * card. The daily-quota and API-error replies bypassed it too, because both are
 * TRUTHY non-answers — three bypasses from one mistake, which is what says the
 * defect was the POSITION of the check and not its contents.
 *
 * Returning the card itself rather than a boolean is deliberate: a boolean leaves
 * each caller to build the reply, and the second caller to do that is how a rule
 * acquires two spellings.
 */
export function atRiskReply(userText: string): Message | null {
  return isAtRiskLanguage(userText)
    ? { id: nextId(), role: "ai", kind: "rg_redirect", lang: detectLang(userText) }
    : null;
}

/** Exported for `test:chat-safety` §2.3, which must prove a Chinese phrase is
 *  caught by a CHINESE pattern rather than by an English one that happens to
 *  match. A corpus that cannot tell those apart is testing the wrong property. */
export { detectLang };

function isBettingPickQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(which|should i pick|will win|gonna win|side to pick|tell me yes or no)\b/.test(t);
}

function isOutsideScope(text: string): boolean {
  const t = text.toLowerCase();
  // Politics, stocks outside 50pick markets, weather forecast outside our markets, etc.
  return (
    /\b(election|vote for|politician|president|prime minister)\b/.test(t) ||
    /\b(stock|aapl|tesla|nasdaq|s&p)\b/.test(t) ||
    /\b(joke|tell me a story|poem|sing)\b/.test(t)
  );
}

/** Inline-mirrored AI variants from `Message`, without `id`. Defined as
 *  a plain discriminated union — `Omit` over the union flattens the
 *  discriminator and trips TS's excess-property checks. The caller
 *  (`sendMessage`) spreads `id` onto whichever variant is returned. */
type Reply =
  | { role: "ai"; kind: "text"; lang: Lang; text: string; unresolved?: boolean }
  | {
      role: "ai";
      kind: "text_with_citations";
      lang: Lang;
      paragraphs: string[];
      citations: Citation[];
    }
  | { role: "ai"; kind: "rg_redirect"; lang: Lang }
  | { role: "ai"; kind: "escalate"; lang: Lang; ticketId: string; etaMinutes: number };

/** The stub's intent table — keyword to reply. Every reply is "what we
 *  expect the live model to produce" so we can demo the surface today. */
function stubReply(userText: string, lang: Lang): Reply {
  const t = userText.toLowerCase();

  if (isAtRiskLanguage(userText)) {
    return { role: "ai", kind: "rg_redirect", lang };
  }

  // B-7 — the stub corpus is EN/SW; a Chinese question gets an honest Chinese
  // hand-off instead of an English keyword miss. (Live mode replies in Chinese
  // natively — this line is stub-mode only.)
  if (lang === "zh") {
    return {
      role: "ai",
      kind: "text",
      lang,
      unresolved: true,
      text: "您好！您可以在帮助页面（/help）找到中文版的平台指南 — 涵盖充值、投注、提现和身份验证。如需人工协助，我可以为您转接支持团队。",
    };
  }

  if (isBettingPickQuestion(userText)) {
    return {
      role: "ai",
      kind: "text",
      lang,
      text:
        lang === "sw"
          ? "Naweza kueleza jinsi soko linavyotatuliwa — chanzo, muda wa mwisho, saini za maafisa wawili — lakini siwezi kukuambia upande gani uchague. Hiyo ni uamuzi wako tu."
          : "I can explain how a market resolves — the source we watch, the cut-off time, the two-officer sign-off — but I can't tell you which side to pick. That's a call only you should make.",
    };
  }

  if (isOutsideScope(userText)) {
    return {
      role: "ai",
      kind: "text",
      lang,
      text:
        lang === "sw"
          ? "Nimewekwa kwa 50pick — amana, dial, malipo, KYC, kanuni za soko. Kwa swali hilo utapata jibu bora mahali pengine. Kuna kitu kingine ninachoweza kukusaidia kuhusu jukwaa?"
          : "I'm tuned for 50pick — deposits, the dial, payouts, KYC, market rules. For that question you'll have better luck somewhere else. Anything I can help with on the platform itself?",
    };
  }

  if (/\bdeposit/.test(t) || /\bamana/.test(t)) {
    return {
      role: "ai",
      kind: "text_with_citations",
      lang,
      paragraphs: [
        "To deposit money on 50pick:",
        "1. Open your **Wallet** and tap **Deposit**[1]",
        "2. Choose your payment method — M-Pesa, Airtel Money, or HaloPesa",
        `3. Enter the amount — from {${formatTzs(DEPOSIT_MIN_TZS)}} to {${formatTzs(DEPOSIT_MAX_TZS)}}`,
        "4. Confirm the payment on your phone",
        "If a deposit does not arrive, your money is safe — the receipt in your wallet shows its exact state, and support can trace it[2]. Deposits need a confirmed email; withdrawals need verified identity[3].",
      ],
      citations: [
        { n: 1, href: "/wallet/deposit", label: "/wallet/deposit" },
        { n: 2, href: "/help#deposit-failed", label: "/help#deposit-failed" },
        { n: 3, href: "/profile/kyc", label: "/profile/kyc" },
      ],
    };
  }

  if (/\bdial\b/.test(t) || /\bconviction\b/.test(t) || /\bkuamua\b/.test(t)) {
    return {
      role: "ai",
      kind: "text_with_citations",
      lang,
      paragraphs: [
        "Here's how the conviction dial works:",
        "1. Drag the dial toward **YES** (left) or **NO** (right)",
        "2. The further from centre, the stronger your conviction — and the bigger your stake",
        `3. Your stake scales up from the platform minimum ({${formatTzs(PLATFORM_MIN_STAKE)}}) as you move toward an edge[1]`,
        "4. Tap confirm — the popup locks the quote so you can't accidentally move the dial",
        "The locked quote is exactly what gets placed. No surprises.",
      ],
      citations: [{ n: 1, href: "/help#conviction-dial", label: "/help#conviction-dial" }],
    };
  }

  if (/\bpayout|paid|withdraw|malipo\b/.test(t)) {
    return {
      role: "ai",
      kind: "text_with_citations",
      lang,
      paragraphs: [
        "Here's how payouts and withdrawals work:",
        // ⛔ NO NUMBER HERE, DELIBERATELY. This is the OFFLINE keyword stub — a pure module with
        // no server import, so it cannot read `objectionWindowHours`, and a literal would be a
        // second definition of it that goes stale the first time the window moves. The live
        // assistant (`_actions/chat.ts`) states the real figure; this fallback states the rule.
        "1. Winnings settle after the market resolves and the objection window closes[1]",
        "2. Once settled, winnings go directly to your **Wallet**",
        "3. To withdraw, go to **Wallet → Withdraw** and enter the amount",
        // ⚠️ THE QUALIFIER IS THE CLAIM. `/legal/terms` and `chat.ts` both say a
        // withdrawal UNDER TZS 1,000,000 settles in about 60 seconds, and that at or
        // above that line it is held for compliance review for up to 24h. Dropping
        // "under TZS 1,000,000" turned a sourced statement into a promise the
        // platform breaks on exactly the withdrawals that matter most.
        "4. Funds go to the M-Pesa number on your account — under TZS 1,000,000 that is typically within {60 seconds}; TZS 1,000,000 and above is held for compliance review, up to {24 hours}[2]",
        "Daily withdrawal cap is {TZS 500,000} unless you've raised it in **Profile → Account**.",
      ],
      citations: [
        { n: 1, href: "/fairness", label: "/fairness" },
        { n: 2, href: "/wallet/withdraw", label: "/wallet/withdraw" },
      ],
    };
  }

  if (/\bkyc\b/.test(t) || /uthibitisho/.test(t)) {
    return {
      role: "ai",
      kind: "text_with_citations",
      lang,
      /**
       * 🔴 THIS BRANCH STILL SHIPPED THE INVENTED TIERS ITS OWN DOCBLOCK SAID WERE
       * GONE — found 2026-09-11, and that is the part worth recording.
       *
       * The 2026-09-07 A-5 sweep (see the header of this file) deleted the invented
       * deposit minimum and the invented dial multiplier, and then REWROTE THE
       * COMMENT to say *"'tier 2' and that cap exist nowhere in this codebase except
       * those sentences"* — past tense, as though all four had been fixed. Two of
       * them had not been touched: this branch went on telling players about a
       * "Tier 1", a "Tier 2" and a "TZS 200,000/day" cap for four more days.
       *
       * ⭐ A COMMENT THAT DESCRIBES A FIX IS NOT THE FIX, and it is worse than no
       * comment, because the next reader greps the prose and stops. `grep -rn
       * "Tier 1|Tier 2|TIER_"` over the KYC server code returns NOTHING: there is no
       * tier model, no per-tier limit, and no per-day cap anywhere in this platform.
       *
       * What is actually true is one rule, and it is the rule the live system prompt
       * already states: nothing is unlocked incrementally — a player may look around
       * freely and may do none of deposit, bet or withdraw until an officer approves
       * one document plus a selfie.
       */
      paragraphs: [
        "Here's how identity verification works on 50pick:",
        "1. Go to **Profile → Verify identity** to start[1]",
        "2. Upload any ONE of four documents — NIDA, passport, driving licence or voter's card — plus a selfie",
        "3. Until our team approves it you can register, sign in and look around, but you cannot deposit, bet or withdraw",
        "4. Review is usually done within a day; while it is pending there is nothing else for you to do[2]",
      ],
      citations: [
        { n: 1, href: "/profile/kyc", label: "/profile/kyc" },
        { n: 2, href: "/legal/aml", label: "/legal/aml" },
      ],
    };
  }

  /**
   * Referral — WITHDRAWN from the player product (2026-09-06).
   *
   * ⛔ THIS BRANCH USED TO TEACH THE PROGRAMME AND CITE `/profile/invite`. That page now
   * returns the not-found view for an ordinary player, so the fallback was walking people
   * to a dead door and promising rewards nobody could earn.
   *
   * ⚠️ IT CANNOT ASK WHO IS TYPING. This is a keyword matcher over the message text, called
   * from a client component with no session or role in scope — so the answer has to be true
   * for EVERY asker, agent or player. It says the one thing that is: earning by referral is
   * limited to approved agents. No citation, because the only page it could cite is one most
   * askers cannot open. An approved agent asking this gets the full answer from the live
   * model, whose system prompt carries the real rule; this is only the offline fallback.
   */
  if (/\b(referr?al|refer a friend|affiliate|invite|alika|tume|kiungo)\b/.test(t)) {
    return {
      role: "ai",
      kind: "text",
      lang,
      text:
        lang === "sw"
          ? "Kwa sasa kupata zawadi kwa kualika wengine ni kwa Mawakala walioidhinishwa wa 50pick pekee — si sehemu ya akaunti ya kawaida ya mchezaji. Kama unataka kuwa Wakala, wasiliana na huduma kwa wateja."
          : "Earning by referral is currently limited to approved 50pick Agents — it is not part of an ordinary player account. If you would like to become an Agent, contact support.",
    };
  }

  // Player market proposals — "Propose & get paid" (/proposals).
  if (/\b(propos(e|al|als)|suggest a market|pendekez|get paid to)\b/.test(t)) {
    return {
      role: "ai",
      kind: "text_with_citations",
      lang,
      paragraphs:
        lang === "sw"
          ? [
              "Hivi ndivyo mapendekezo ya masoko yanavyofanya kazi:",
              "1. Nenda kwenye bodi ya **Mapendekezo** na ubonyeze **Pendekeza soko**[1]",
              "2. Andika swali la NDIO/HAPANA na chanzo cha utatuzi",
              "3. Wachezaji wengine wanapiga kura, lakini afisa anafanya uamuzi wa mwisho",
              "4. Pendekezo lako likiorodheshwa NA kutatuliwa, unapata tuzo kwenye pochi yako[1]",
            ]
          : [
              "Here's how player market proposals work:",
              "1. Go to the **Proposals** board and tap **Propose a market**[1]",
              "2. Write a clear YES/NO question with a resolution source",
              "3. Other players upvote it, but an officer makes the final listing call",
              "4. If your proposal gets listed AND resolved, you're paid a fixed prize to your wallet[1]",
            ],
      citations: [{ n: 1, href: "/proposals", label: "/proposals" }],
    };
  }

  // Keyword path → escalate to the support team. We still accept
  // "human" / "specialist" as user-typed triggers (some players use
  // those words) but never produce them as bot output.
  if (/\bescalate|human|support|specialist|agent|team|msaada/.test(t)) {
    return {
      role: "ai",
      kind: "escalate",
      lang,
      ticketId: "HC-" + Math.floor(1000 + Math.random() * 9000),
      etaMinutes: 4,
    };
  }

  // Default: gentle "I'm not sure" that opens the door to a support-team
  // handoff. Marked unresolved so the surface can auto-escalate after
  // two of these in a row. The reply never uses "human" / "person" —
  // always "support team" / "timu ya msaada".
  return {
    role: "ai",
    kind: "text",
    lang,
    unresolved: true,
    text:
      lang === "sw"
        ? "Sina uhakika kuhusu hilo bado. Unaweza kuelezea zaidi, au nikukuelekeze kwa timu ya msaada?"
        : "I'm not sure about that one yet. Can you tell me a bit more, or should I connect you with our support team?",
  };
}

/**
 * Public entry point — call from a server action or the client.
 *
 * In stub mode the latency is simulated (~600ms) so the typing indicator
 * has a moment to render before the reply lands.
 */
export async function sendMessage(history: Message[], userText: string): Promise<Message> {
  const lang = detectLang(userText);

  // Pre-filter at-risk language — always route to RG card, never free-text
  if (isAtRiskLanguage(userText)) {
    return { id: nextId(), role: "ai", kind: "rg_redirect", lang };
  }

  // ─── LIVE MODE — via server action (chatWithClaude) ──────────────
  // ChatRoot calls chatWithClaude first; if it returns text, we wrap
  // it here. If it returns null (no API key or error), we fall through
  // to stub mode. This separation keeps the Anthropic SDK server-only.
  // The caller (ChatRoot) handles this — see handleSend in ChatRoot.tsx.

  // ─── STUB MODE — keyword matching fallback ───────────────────────
  await new Promise((r) => setTimeout(r, 600));
  const reply = stubReply(userText, lang);
  return { ...reply, id: nextId() } as Message;
}

/** Helper for the client — generates the user-side Message envelope. */
export function buildUserMessage(text: string): Message {
  return { id: nextId(), role: "user", lang: detectLang(text), text, ts: Date.now() };
}
