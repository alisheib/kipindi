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
import { CountBadge } from "@/components/ui/count-badge";
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
      {/* ⭐ STAGE 9b — the kit <CountBadge>, replacing the `.cm-bubble-pip` rule in
          `src/styles/chat/chat-styles.css`. Same data as the bell's pip, so it must not
          wear a second chrome: `lg` is this one's box (min-width 20, height 20, 0 6px,
          11px), `pearl` its inverse fill, `ring`/`glow` its 2px cut-out and drop. The
          99+ cap it already had is now the primitive's, applied to both pips at once.
          ⚠️ ONE rendered change, deliberate and documented in `ui/count-badge.tsx`:
          the weight moves 600 → 700, joining the bell. One chrome, one weight.
          ⛔ The CSS rule is now dead and should be deleted with the other raw-class
          removals — that file is outside this pass's ownership. */}
      <CountBadge
        count={unread}
        max={99}
        tone="pearl"
        size="lg"
        ring="var(--chat-canvas)"
        lift
        aria-label={t.chat.unread.replace("{n}", String(unread))}
        style={{ position: "absolute", top: -2, right: -2 }}
      />
    </button>
  );
}
