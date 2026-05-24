/**
 * Empty state — first time the bubble is opened in a session.
 *
 * Bilingual greeting + four starter chips (one in Swahili italic pearl
 * to signal bilingual support up-front). Each chip sends the same text
 * the player would have typed, which routes through the regular send
 * action so the experience is uniform.
 */

import { BotMark } from "../BotMark";

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const starters: Array<{ text: string; sw: boolean }> = [
    { text: "How do I deposit?", sw: false },
    { text: "What's the conviction dial?", sw: false },
    { text: "When do I get paid?", sw: false },
    { text: "Vipi ninaweza kuamua?", sw: true },
  ];
  return (
    <div className="cm-empty">
      <div className="cm-empty-mark">
        <BotMark size={28} stroke={1.4} />
      </div>
      <div className="cm-empty-greeting">
        Habari <span style={{ opacity: 0.5 }}>·</span> Hi.
        <span className="cm-sw">Niko hapa kukusaidia.</span>
      </div>
      <div className="cm-empty-sub">
        Ask me about deposits, the dial, payouts, or anything you can&apos;t find in Help.
      </div>
      <div className="cm-empty-starters">
        {starters.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`cm-empty-starter ${s.sw ? "cm-sw-tile" : ""}`}
            onClick={() => onPick(s.text)}
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
