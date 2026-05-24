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
 */

import type { Citation, Lang, Message } from "@/components/chat/types";

let __id = 0;
const nextId = () => `m_${Date.now().toString(36)}_${__id++}`;

/** Detect the user's language from their last message. Heuristic, not
 *  exhaustive — production swaps to a real classifier. */
function detectLang(text: string): Lang {
  const sw = /\b(habari|niko|vipi|chochote|amana|malipo|soko|dau|jaribu|asante|hapana|ndio|kucheza|mfumo|niulize|kusaidia)\b/i;
  return sw.test(text) ? "sw" : "en";
}

/** At-risk language pre-filter — keyword match first; the live model
 *  will use a classifier pass. Both paths funnel into the RG card so
 *  the response is never free-text. */
function isAtRiskLanguage(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\blosing too much\b/.test(t) ||
    /\bchas(e|ing) (my )?loss(es)?\b/.test(t) ||
    /\baddict(ed|ion|ive)\b/.test(t) ||
    /\bcan'?t stop\b/.test(t) ||
    /\bcontrol my bet/.test(t) ||
    /\bkucheza kunakuathiri\b/.test(t) ||
    /\bsiwezi kuach/.test(t)
  );
}

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
        "Deposits land in your wallet within about {30 seconds} of M-Pesa confirmation. The minimum is TZS {1,000} and the daily cap before KYC tier 2 is TZS {200,000}[1].",
        "If the deposit doesn't arrive within {2 minutes}, it usually means M-Pesa returned a soft failure — your money is safe and the transaction will auto-reverse within {24 hours}[2].",
        "For amounts above the daily cap, complete tier 2 verification — it adds ID upload and takes about {5 minutes}[3].",
      ],
      citations: [
        { n: 1, href: "/help#deposits", label: "/help#deposits" },
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
        "The conviction dial picks both your side and your stake in one gesture. Drag toward YES on the left, NO on the right. The further from centre, the stronger your conviction — and the bigger your stake.",
        "Your stake scales from the base ({TZS 5,000}) up to {5×} that at the extremes. The TZS amount and the multiplier both update live as you drag[1].",
        "When you're happy, the confirm popup locks the quote. You can't accidentally move the dial while the popup is open — the locked quote is what gets placed.",
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
        "Winnings settle after the market resolves and the {24-hour} public objection window closes. Once settled, winners share the losing pool minus a {9%} operator margin[1].",
        "Withdrawals go to the M-Pesa number on your account and typically arrive within {60 seconds}. Daily cap is TZS {500,000} unless you've raised it in Profile → Account[2].",
      ],
      citations: [
        { n: 1, href: "/fairness", label: "/fairness" },
        { n: 2, href: "/help#withdrawals", label: "/help#withdrawals" },
      ],
    };
  }

  if (/\bkyc\b/.test(t) || /uthibitisho/.test(t)) {
    return {
      role: "ai",
      kind: "text_with_citations",
      lang,
      paragraphs: [
        "Tier 1 KYC unlocks deposits, betting, and withdrawals up to TZS {200,000} per day. You'll need your NIDA number and a phone selfie — takes about {3 minutes}[1].",
        "Tier 2 (for larger limits) adds an ID document upload. Reviewed within {24 hours} by a compliance officer[2].",
      ],
      citations: [
        { n: 1, href: "/profile/kyc", label: "/profile/kyc" },
        { n: 2, href: "/legal/aml", label: "/legal/aml" },
      ],
    };
  }

  if (/\bescalate|human|support|specialist|msaada/.test(t)) {
    return {
      role: "ai",
      kind: "escalate",
      lang,
      ticketId: "HC-" + Math.floor(1000 + Math.random() * 9000),
      etaMinutes: 4,
    };
  }

  // Default: gentle "I'm not sure" that opens the door to the human
  // handoff. Marked unresolved so the surface can auto-escalate after
  // two of these in a row.
  return {
    role: "ai",
    kind: "text",
    lang,
    unresolved: true,
    text:
      lang === "sw"
        ? "Sina uhakika kuhusu hilo bado. Unaweza kuelezea zaidi, au nikukabidhi mtaalamu wa msaada?"
        : "I'm not sure about that one yet. Can you tell me a bit more, or should I hand you over to a support specialist?",
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
  // Simulate model latency. Live mode drops this and awaits the SDK.
  await new Promise((r) => setTimeout(r, 600));
  const reply = stubReply(userText, lang);
  return { ...reply, id: nextId() } as Message;
  // ─── LIVE MODE (later) ────────────────────────────────────────────
  // if (process.env.ANTHROPIC_API_KEY) {
  //   const client = new Anthropic();
  //   const resp = await client.messages.create({ ... });
  //   return parseAndStructure(resp, lang);
  // }
}

/** Helper for the client — generates the user-side Message envelope. */
export function buildUserMessage(text: string): Message {
  return { id: nextId(), role: "user", lang: detectLang(text), text };
}
