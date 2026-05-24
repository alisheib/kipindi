/**
 * Escalate-to-support handoff card.
 *
 * Surfaces after a fail-to-help signal — either the AI's reply contained
 * "I'm not sure" / "I can't help with that", or the same intent repeated
 * for three turns. The claret pill is the only place besides the
 * player-bubble gilt edge where the chat surface uses a strong accent.
 *
 * Player-facing copy says "support team" / "msaada" everywhere — the
 * word "human" or "person" never appears in chat, so the AI doesn't
 * accidentally announce itself as not-human to the player.
 */

import { BotAvatar } from "../BotMark";
import { Num } from "./Primitives";

export function EscalateHandoff({
  ticketId,
  etaMinutes,
}: {
  ticketId: string;
  etaMinutes: number;
}) {
  return (
    <div className="cm-handoff" role="group" aria-label="Escalation to support">
      <div className="cm-handoff-rule">Handing to support · Tunakukabidhi timu ya msaada</div>
      <div className="cm-handoff-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BotAvatar size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cm-handoff-title">A specialist will take this from here</div>
            <div className="cm-handoff-meta">
              <span>Ticket</span>
              <Num>#{ticketId}</Num>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>ETA</span>
              <Num>~{etaMinutes} min</Num>
            </div>
          </div>
        </div>
        <div className="cm-handoff-body">
          Your chat history is attached so you won&apos;t have to repeat anything. You&apos;ll get a
          notification when the support team picks up — usually faster on weekday evenings.
        </div>
        <button
          type="button"
          className="cm-escalate"
          aria-label="Connect to the support team now"
        >
          Connect to the support team
        </button>
      </div>
    </div>
  );
}
