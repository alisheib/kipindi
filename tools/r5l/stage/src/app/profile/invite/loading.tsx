"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { BackLinkGhost } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n";

/**
 * /profile/invite opens on its back link and its title row (19px, set solid), on the page's 24px rung. The title is
 * the unpaid invitation's — "Invite friends" with no chip — the page every player who is not a paid agent is shown.
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
              <p className="font-display text-[19px] font-bold leading-none">{t.profile.inviteFriends}</p>
            </div>
          </div>
        </>
      }
    />
  );
}
