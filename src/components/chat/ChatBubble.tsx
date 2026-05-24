"use client";

/**
 * ChatBubble — the floating action button that opens the chat panel.
 *
 * 56 px on desktop, 52 px on mobile. Clears the 64-px mobile bottom-nav
 * with a 16-px gap (positioning logic lives in ChatRoot so the bubble
 * stays a presentational component).
 */

import { BotMark } from "./BotMark";

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
  return (
    <button
      type="button"
      className={`cm-bubble ${isMobile ? "cm-bubble-mobile" : ""}`}
      aria-label={open ? "Close 50pick Help" : "Open 50pick Help"}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
    >
      <BotMark size={isMobile ? 20 : 22} />
      {unread > 0 && (
        <span className="cm-bubble-pip" aria-label={`${unread} unread`}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
