"use client";

/**
 * ChatPanel — the floating card (desktop) / bottom sheet (mobile).
 *
 * Renders the header, message list, and composer. Receives messages +
 * send handler from ChatRoot. Mobile sheet adds a scrim and
 * `aria-modal`; desktop card is non-modal.
 *
 * Header wears the chat-companion <HelpMark /> for brand presence
 * inside the popup. Per-message AI avatars also use <HelpMark /> at
 * a smaller 22 px size — consistent identity across the surface.
 */

import { useEffect, useRef } from "react";
import { HelpMark } from "./HelpMark";
import { AiMessage, UserMessage, TypingMessage } from "./messages/Bubbles";
import { EmptyState } from "./messages/EmptyState";
import { RgRedirectCard } from "./messages/RgRedirectCard";
import { EscalateHandoff } from "./messages/EscalateHandoff";
import { Sources, renderParagraph } from "./messages/Primitives";
import type { Lang, Message } from "./types";

type Props = {
  lang: Lang;
  messages: Message[];
  pending: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  variant: "desktop" | "sheet";
};

const HEADER_COPY: Record<Lang, { name: string; status: string }> = {
  en: { name: "50pick Help", status: "Online · AI concierge" },
  sw: { name: "Msaada wa 50pick", status: "Niko mtandaoni · concierge wa AI" },
};

export function ChatPanel({ lang, messages, pending, onClose, onSend, variant }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the bottom whenever a new message lands or the
  // typing indicator turns on.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  // Focus the composer on mount + after every reply, so the player
  // can immediately type a follow-up.
  useEffect(() => {
    if (!pending) composerRef.current?.focus();
  }, [pending]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const el = composerRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;
    onSend(text);
    el.value = "";
    el.style.height = "auto";
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Auto-grow handled by `input` event; no shortcut needed here.
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  };

  const t = HEADER_COPY[lang];

  return (
    <section
      className={`cm-panel ${variant === "sheet" ? "cm-panel-sheet cm-sheet-anim" : "cm-panel-desktop"}`}
      role="dialog"
      aria-modal={variant === "sheet" ? "true" : "false"}
      aria-label="50pick Help chat"
    >
      <div className="cm-header">
        <HelpMark size={36} aria-label="50pick Help" />
        <div className="cm-header-titles">
          <div className="cm-header-name">{t.name}</div>
          <div className="cm-header-sub">
            <span className="cm-status-dot" aria-hidden />
            <span>{t.status}</span>
          </div>
        </div>
        <button
          type="button"
          className="cm-close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
      </div>

      <div
        ref={listRef}
        className="cm-list"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <EmptyState onPick={onSend} />
        ) : (
          messages.map((m) => <RenderMessage key={m.id} m={m} />)
        )}
        {pending && <TypingMessage />}
      </div>

      <form className="cm-composer-wrap" onSubmit={handleSubmit}>
        <div className="cm-composer">
          <textarea
            ref={composerRef}
            rows={1}
            placeholder="Ask anything · Uliza chochote"
            aria-label="Message"
            onKeyDown={handleKey}
            onInput={handleInput}
          />
          <button type="submit" className="cm-send" aria-label="Send message" disabled={pending}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12 L19 12" />
              <path d="M13 6 L19 12 L13 18" />
            </svg>
          </button>
        </div>
      </form>

      {/* "Powered by Claude · Mfumo wa AI" disclosure intentionally
          removed per Ali. If a regulator pass later requires the
          AI-disclosure, restore it from chat-styles.css `.cm-disclosure`
          which is still defined. */}
    </section>
  );
}

function RenderMessage({ m }: { m: Message }) {
  if (m.role === "user") {
    return <UserMessage>{m.text}</UserMessage>;
  }
  if (m.kind === "rg_redirect") {
    return <RgRedirectCard lang={m.lang} />;
  }
  if (m.kind === "escalate") {
    return <EscalateHandoff ticketId={m.ticketId} etaMinutes={m.etaMinutes} />;
  }
  if (m.kind === "text_with_citations") {
    return (
      <AiMessage>
        {m.paragraphs.map((p, i) => (
          <p key={i}>{renderParagraph(p, m.citations)}</p>
        ))}
        <Sources items={m.citations} />
      </AiMessage>
    );
  }
  // plain text reply
  return (
    <AiMessage>
      <p>{m.text}</p>
    </AiMessage>
  );
}
