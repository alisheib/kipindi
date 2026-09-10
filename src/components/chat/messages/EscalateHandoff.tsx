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
import { useT } from "@/lib/i18n";

/**
 * ⛔ `supportEmail` ARRIVES AS A PROP, read on the server in the root layout (E-226).
 *
 * This card lives inside ChatPanel, which is inside ChatRoot, which is `"use client"`.
 * A client module's `defineConfig` cache is the BROWSER bundle's and no server-side
 * hydration can ever reach it, so importing `SUPPORT_EMAIL()` here would have pinned this
 * mailto to the code default for ever — the officer saves an address, `/help` shows it, and
 * the one link a player reaches after the AI fails to help still points somewhere else.
 * Same trap `app-shell.tsx` documents for `agentDoorVisible`.
 */
export function EscalateHandoff({ supportEmail }: { supportEmail: string }) {
  const { t } = useT();
  // Never-fabricate: no invented ticket number or ETA — there is no ticket
  // record behind them. The real escalation is the support email below (which
  // opens a genuine message to the support inbox).
  return (
    <div className="cm-handoff" role="group" aria-label={t.common.handingToSupport}>
      <div className="cm-handoff-rule">{t.common.handingToSupport}</div>
      <div className="cm-handoff-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FiftyMark size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cm-handoff-title">{t.chat.specialistTakeOver}</div>
          </div>
        </div>
        <div className="cm-handoff-body">
          {t.chat.handoffBody}
        </div>
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent(t.chat.specialistTakeOver)}`}
          className="cm-escalate"
          aria-label={t.chat.connectSupportAria}
        >
          {t.chat.connectSupport}
        </a>
      </div>
    </div>
  );
}
