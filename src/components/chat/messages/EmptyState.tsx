"use client";

/**
 * Empty state — first time the bubble is opened in a session.
 *
 * Locale-aware greeting + four starter chips, all in the active locale.
 * Each chip sends the same text the player would have typed, which routes
 * through the regular send action so the experience is uniform.
 *
 * Hero displays the chat-companion <HelpMark /> at hero scale (no
 * plate wrapper) so the player sees the brand-mark concierge identity
 * as the first thing inside the panel.
 */

import { FiftyMark } from "@/components/brand";
import { useT } from "@/lib/i18n";

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const { t } = useT();

  /* Four starter chips, all in the active locale. */
  const starters: string[] = [
    t.chat.starterDeposit,
    t.chat.starterDial,
    t.chat.starterPayout,
    t.chat.starterWithdraw,
  ];

  return (
    <div className="cm-empty">
      <div className="cm-empty-mark cm-empty-mark-bare">
        <FiftyMark size={56} />
      </div>
      <div className="cm-empty-greeting">
        {t.chat.greeting}
        <span className="cm-sw">{t.chat.greetingHint}</span>
      </div>
      <div className="cm-empty-sub">{t.chat.helpline}</div>
      <div className="cm-empty-starters">
        {starters.map((s, i) => (
          <button
            key={i}
            type="button"
            className="cm-empty-starter"
            onClick={() => onPick(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
