"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostText } from "@/components/ui/ghost-text";
import { useT } from "@/lib/i18n";

/**
 * /profile/invite opens on its back link and its title row (19px, set solid), on the page's 24px rung. The title is
 * the unpaid invitation's — "Invite friends" with no chip — the page every player who is not a paid agent is shown.
 * ⛔ SET AND NOT SHOWN (2026-10-09, after round 6's C1): the page names itself for its reader (`invite-name.ts` — an
 * agent's dashboard, "Invite & Earn" while invites pay, otherwise "Invite friends"), which this drawing cannot know; it
 * keeps the unpaid name's width and shows no name an agent or a paid player would not read.
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function Loading() {
  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={4}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-[19px] font-bold leading-none"><GhostText>{t.profile.inviteFriends}</GhostText></p>
            </div>
          </div>
        </>
      }
    />
  );
}
