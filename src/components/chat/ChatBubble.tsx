"use client";

/**
 * ChatBubble — the floating action button that opens the chat panel.
 *
 * 56 px on desktop, 52 px on mobile. Clears the 64-px mobile bottom-nav
 * with a 16-px gap (positioning logic lives in ChatRoot so the bubble
 * stays a presentational component).
 *
 * The FAB wears the chat-companion <HelpMark /> — a pearl speech bubble
 * on the FAB's royal-indigo disc. Pearl (not gilt): the launcher is
 * support chrome, and gold-discipline reserves gold for earned-money /
 * -status only. Reads as "tap to chat" at 30–34 px.
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
