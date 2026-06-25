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
 *   payouts/withdrawals, KYC, affiliate (Invite & Earn → /profile/invite),
 *   proposals (→ /proposals), escalation. Treat this list as the chatbot's
 *   knowledge index; a page without an intent here falls through to the
 *   "I'm not sure" → support handoff. (Live mode replaces this with the
 *   system prompt + web_search over the live site.)
 */

import type { Citation, Lang, Message } from "@/components/chat/types";

let __id = 0;
const nextId = () => `m_${Date.now().toString(36)}_${__id++}`;

/** Detect the user's language from their last message. Heuristic, not
 *  exhaustive — production swaps to a real classifier. */
function detectLang(text: string): Lang {
  const sw = /\b(habari|niko|vipi|chochote|amana|malipo|soko|dau|jaribu|asante|hapana|ndio|kucheza|mfumo|niulize|kusaidia|alika|pendekez|tume|kiungo)\b/i;
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
        "To deposit money on 50pick:",
        "1. Open your **Wallet** and tap **Deposit**[1]",
        "2. Choose your payment method — M-Pesa, Airtel Money, or HaloPesa",
        "3. Enter the amount — min {TZS 1,000}, daily cap {TZS 200,000} before tier 2",
        "4. Confirm the payment on your phone — funds arrive in about {30 seconds}",
        "If the deposit doesn't arrive within {2 minutes}, it usually means a soft failure — your money is safe and auto-reverses within {24 hours}[2]. For higher limits, complete tier 2 verification ({5 minutes})[3].",
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
        "3. Your stake scales from the base ({TZS 500}) up to {5×} at the extremes[1]",
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
        "1. Winnings settle after the market resolves and the {24-hour} objection window closes[1]",
        "2. Once settled, winnings go directly to your **Wallet**",
        "3. To withdraw, go to **Wallet → Withdraw** and enter the amount",
        "4. Funds go to the M-Pesa number on your account — typically within {60 seconds}[2]",
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
      paragraphs: [
        "Here's how KYC verification works on 50pick:",
        "1. Go to **Profile → Verify identity** to start[1]",
        "2. **Tier 1**: Enter your NIDA number and take a phone selfie — takes about {3 minutes}",
        "3. Tier 1 unlocks deposits, betting, and withdrawals up to {TZS 200,000}/day",
        "4. **Tier 2**: Upload an ID document for higher limits — reviewed within {24 hours}[2]",
      ],
      citations: [
        { n: 1, href: "/profile/kyc", label: "/profile/kyc" },
        { n: 2, href: "/legal/aml", label: "/legal/aml" },
      ],
    };
  }

  // Affiliate / referral — "Invite & Earn" (/profile/invite).
  if (/\b(referr?al|refer a friend|affiliate|invite|alika|tume|kiungo)\b/.test(t)) {
    return {
      role: "ai",
      kind: "text_with_citations",
      lang,
      paragraphs:
        lang === "sw"
          ? [
              "Hivi ndivyo mpango wa Alika na Upate unavyofanya kazi:",
              "1. Nenda **Wasifu → Alika na Upate** kupata kiungo chako[1]",
              "2. Shiriki kiungo na marafiki kupitia WhatsApp, SMS, au njia yoyote",
              "3. Rafiki anaposajili na kucheza, unapata zawadi",
              "4. Zawadi inaweza kuwa tume, bonasi, au tuzo — kulingana na mpango ulioko hai[1]",
            ]
          : [
              "Here's how the Invite & Earn programme works:",
              "1. Go to **Profile → Invite & Earn** to get your personal referral link[1]",
              "2. Share it with friends via WhatsApp, SMS, or any channel",
              "3. When a friend signs up with your link and plays, you earn rewards",
              "4. Rewards can be commission, a bonus, or a milestone prize — depending on which modes are live[1]",
            ],
      citations: [{ n: 1, href: "/profile/invite", label: "/profile/invite" }],
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
