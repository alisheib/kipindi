/**
 * AI Help Companion — message schema.
 *
 * Every reply the send-message action returns is one of these `kind`s.
 * Three of the kinds — RG_REDIRECT, ESCALATE, AI_WITH_CITATIONS — are
 * structured payloads the renderer turns into kit-faithful cards, not
 * plain text from the model.
 */

export type Lang = "en" | "sw";

export type Citation = { n: number; href: string; label: string };

export type Message =
  | { id: string; role: "user"; lang: Lang; text: string }
  | {
      id: string;
      role: "ai";
      kind: "text";
      lang: Lang;
      text: string;
      /** True when the AI couldn't help and the surface should consider
       *  surfacing the escalate-to-support card. Two consecutive `true`s
       *  trigger the auto-escalate per the design spec. */
      unresolved?: boolean;
    }
  | {
      id: string;
      role: "ai";
      kind: "text_with_citations";
      lang: Lang;
      /** Paragraphs already merged with inline `[n]` placeholders that
       *  the renderer will swap with <Cite /> nodes. Each `[n]` in the
       *  text corresponds to citations[n-1]. */
      paragraphs: string[];
      citations: Citation[];
    }
  | { id: string; role: "ai"; kind: "rg_redirect"; lang: Lang }
  | { id: string; role: "ai"; kind: "escalate"; lang: Lang; ticketId: string; etaMinutes: number };

export type ChatState = {
  open: boolean;
  lang: Lang;
  messages: Message[];
  pending: boolean;
};
