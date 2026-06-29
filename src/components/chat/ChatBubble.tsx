"use client";

/**
 * ChatBubble — the floating action button that opens the chat panel.
 *
 * 56 px on desktop, 52 px on mobile. Clears the 64-px mobile bottom-nav
 * with a 16-px gap (positioning logic lives in ChatRoot so the bubble
 * stays a presentational component).
 *
 * The FAB wears the chat-companion <HelpMark /> — full-color 50pick
 * coin under a gilt support headset + boom mic. Reads as "AI concierge"
 * at 30–34 px without losing the brand mark.
 *
 * Per product-owner direction this is an INTENTIONAL override of the
 * original "no YES/NO emerald + rose on the chat surface" rule for the
 * FAB only. The chat panel internals (header, message bubbles, chips,
 * etc.) still follow the no-YES/NO rule. Track that as a one-place
 * exception, not a precedent.
 */

import { HelpMark } from "./HelpMark";
import { useT } from "@/lib/i18n";

export function ChatBubble({
  isMobile = false,
  unread = 0,
  open = false,
  onClick,
}: {
  isMobile?: boolean;
  unread?: number;
  open?: boolean;
  onClick: () => void;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      className={`cm-bubble ${isMobile ? "cm-bubble-mobile" : ""}`}
      aria-label={open ? t.chat.closeHelp : t.chat.openHelp}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
    >
      <HelpMark size={isMobile ? 30 : 34} />
      {unread > 0 && (
        <span className="cm-bubble-pip" aria-label={t.chat.unread.replace("{n}", String(unread))}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
