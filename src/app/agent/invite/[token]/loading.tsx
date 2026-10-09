"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonGhost, GhostText } from "@/components/ui/ghost-text";
import { formatEatDay } from "@/lib/eat-day";
import { fill } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/**
 * /agent/invite/[token] — no back link (the invitation opens on its header, R5-H · G-2b), then the page as it draws a
 * valid invitation (round 5's follow-up, R5-L): its own `PageHeader` with the invitation's sentence, the "sent to" panel
 * (the eyebrow, the masked address in the 18px mono figure, the expiry line), the identity note, and the action column.
 *
 * 🔴 IT WAS A 32px BAR AND ONE GENERIC PANEL (R5-H's audit): the page's header carries a subtitle (two to four lines by
 * language and width), its panel is three lines, and the note and the actions follow — none of which the ghost drew.
 * Every band here is the page's own box with the page's own words, set and not shown (`GhostText`).
 * ⚠️ THE READER DRAWN IS THE INVITEE SIGNED IN ON THE INVITED ACCOUNT — the person the link is emailed to, opening it on
 * the phone they play on: the "send me a code" button (48px) and the decline button (44px), 16px apart in the client's own
 * column, as inline buttons share a line where they fit. A signed-out reader's sign-in pair stacks on a phone instead.
 * The address is a masked email at a common domain (a phone reads `+255 ••• ••• 123`, about as wide).
 */

/** A masked address (`maskChannel`: the first character, three dots, the whole domain — `a•••@gmail.com`). */
const ADDRESS = "a•••@gmail.com";

export default function AgentInviteLoading() {
  const { t, locale } = useT();
  const date = formatEatDay("2026-09-28", t.common.monthsShort, locale);
  return (
    <PageContainer tier="reading" className="space-y-5" aria-busy="true">
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle} subtitle={t.agent.inviteBody} />

      {/* Sent to — the eyebrow, the masked address, the expiry. */}
      <section className="rounded-xl glass-panel p-4 space-y-1 text-transparent" aria-hidden>
        <p className="font-mono text-micro uppercase eyebrow font-bold"><GhostText>{t.agent.inviteSentTo}</GhostText></p>
        <p className="font-mono text-title-sm font-bold break-all"><GhostText>{ADDRESS}</GhostText></p>
        <p className="text-body-sm"><GhostText>{fill(t.agent.inviteExpires, { date })}</GhostText></p>
      </section>

      <p className="text-body-sm leading-relaxed text-transparent" aria-hidden><GhostText>{t.agent.inviteKycNote}</GhostText></p>

      {/* The action column (`invite-client.tsx`): send the code, then decline — inline buttons, 16px apart. */}
      <div className="space-y-3" aria-hidden>
        <ButtonGhost size="lg" leading={16}>{t.agent.inviteOtpSend}</ButtonGhost>
        <ButtonGhost size="md">{t.agent.inviteDecline}</ButtonGhost>
      </div>
    </PageContainer>
  );
}
