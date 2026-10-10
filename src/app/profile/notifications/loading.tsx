"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * /profile/notifications opens on its back link and its header (the bell, 22px, on the eyebrow's row), on the page's
 * 24px rung.
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function Loading() {
  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={3}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHeader icon={<I.bellRing s={22} />} eyebrow={t.push.eyebrow} title={t.push.pageTitle} />
        </>
      }
    />
  );
}
