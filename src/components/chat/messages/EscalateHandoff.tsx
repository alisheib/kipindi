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

import { FiftyMark } from "@/components/brand";
import { Num } from "./Primitives";
import { SUPPORT_EMAIL } from "@/lib/support-config";
import { useT } from "@/lib/i18n";

export function EscalateHandoff({
  ticketId,
  etaMinutes,
}: {
  ticketId: string;
  etaMinutes: number;
}) {
  const { t } = useT();
  return (
    <div className="cm-handoff" role="group" aria-label={t.common.handingToSupport}>
      <div className="cm-handoff-rule">{t.common.handingToSupport}</div>
      <div className="cm-handoff-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FiftyMark size={36} />
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
        <a
          href={`mailto:${SUPPORT_EMAIL()}?subject=${encodeURIComponent(`Chat ticket ${ticketId} — support request`)}`}
          className="cm-escalate"
          aria-label="Connect to the support team now"
        >
          Connect to the support team
        </a>
      </div>
    </div>
  );
}
